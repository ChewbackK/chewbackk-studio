/**
 * audit-mobile.mjs : vérification objective du responsive mobile.
 *
 * Mesure en headless Chrome (CDP, WebSocket natif Node >= 21, zéro dépendance) :
 *  - débordement horizontal de chaque page à 385x817 et 320x640 (émulation mobile) ;
 *  - home : collisions du plan (cartouche/CTA, cote/titre), dt tronqués,
 *    présence du pin en tactile (attendu : AUCUN), état du menu burger ;
 *  - desktop 1440x900 : le pin doit exister (non-régression).
 *
 * Usage :
 *   npm run dev -- --port 4400   (dans un autre terminal)
 *   BASE=http://localhost:4400 node scripts/audit-mobile.mjs
 * Sortie : JSON sur stdout + captures dans scripts/audit-mobile-out/.
 * Critères de sortie : cf. PLAN-RESPONSIVE-MOBILE.md (section vérification).
 */
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE ?? "http://localhost:4321";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "audit-mobile-out");
await mkdir(OUT, { recursive: true });
const PAGES = ["/", "/services", "/realisations", "/contact", "/mentions-legales"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(tmpdir(), "cdp-audit-"));
const chrome = spawn("google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--window-size=1440,900", "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });
process.on("exit", () => chrome.kill("SIGKILL"));

let port = 0;
for (let i = 0; i < 50 && !port; i++) {
  try { port = parseInt((await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0], 10); }
  catch { await sleep(200); }
}
let targets = [];
for (let i = 0; i < 50 && !targets.length; i++) {
  try { targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === "page"); }
  catch {}
  if (!targets.length) await sleep(200);
}
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++msgId;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaljs = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
  return r.result.value;
};
const shot = async (file) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(OUT, file), Buffer.from(r.data, "base64"));
};
const wheel = (dy) => send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 190, y: 400, deltaX: 0, deltaY: dy, pointerType: "mouse" });

await send("Page.enable");
await send("Runtime.enable");

// Débordement horizontal + éléments fautifs (hors SVG du plan : peinture
// en overflow visible sans barre de scroll, toléré).
const OVERFLOW_JS = `(() => {
  const vw = document.documentElement.clientWidth;
  const sw = document.scrollingElement.scrollWidth;
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      const cls = el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '';
      bad.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls);
    }
    if (bad.length >= 10) break;
  }
  return { scrollW: sw, viewportW: vw, overflowX: sw > vw + 1, bad: [...new Set(bad)] };
})()`;

const report = { at385: {}, at320: {}, home385: {}, desktop: {} };

const goto = async (p, waitMs) => {
  await send("Page.navigate", { url: BASE + p });
  await sleep(waitMs);
};

// ---- Passe 385x817 (émulation mobile : pointeur grossier) ----
await send("Emulation.setDeviceMetricsOverride", { width: 385, height: 817, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
for (const p of PAGES) {
  await goto(p, p === "/" ? 4000 : 1800);
  report.at385[p] = await evaljs(OVERFLOW_JS);
}

// ---- Analyses home (toujours à 385, tactile) ----
await goto("/", 4000);
report.home385.geometrie = await evaljs(`(() => {
  const inter = (a, b) => a && b && !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
  const word = document.querySelector('[data-title-word]')?.getBoundingClientRect();
  const actions = document.querySelector('.hero__actions')?.getBoundingClientRect();
  const read = document.querySelector('[data-datum-read]');
  const readVisible = !!read && read.offsetParent !== null;
  const svgTexts = [...document.querySelectorAll('[data-plan-base] text')];
  return {
    pointeurGrossier: matchMedia('(pointer: coarse)').matches,
    cartoucheTextes: svgTexts.length,
    cartoucheSurCTA: svgTexts.some((t) => inter(t.getBoundingClientRect(), actions)),
    datumVisible: readVisible,
    datumSurTitre: readVisible ? inter(read.getBoundingClientRect(), word) : false,
    dtsOK: [...document.querySelectorAll('.hero__block dt')]
      .every((dt) => dt.scrollWidth <= Math.ceil(dt.getBoundingClientRect().width)),
    pinSpacer: !!document.querySelector('.pin-spacer'),
  };
})()`);
await shot("385-home.png");

// scroll : au tactile (sans pin) la page doit bouger dès le premier cran
await wheel(140); await sleep(600);
report.home385.apresUnCran = await evaljs(`(() => {
  const hero = document.querySelector('[data-hero]');
  return {
    scrollY: Math.round(scrollY),
    heroTop: Math.round(hero.getBoundingClientRect().top),
    focus: hero.style.getPropertyValue('--bp-focus') || '0',
    pageBouge: hero.getBoundingClientRect().top < 60,
  };
})()`);
await shot("385-home-scroll1.png");

// menu burger : scrim, aria, verrouillage
await wheel(-2000); await sleep(800);
await evaljs(`document.querySelector('[data-nav-burger]')?.click()`);
await sleep(400);
report.home385.menu = await evaljs(`(() => {
  const burger = document.querySelector('[data-nav-burger]');
  const scrim = document.querySelector('[data-nav-scrim]');
  const scrimVisible = !!scrim && getComputedStyle(scrim).display !== 'none'
    && parseFloat(getComputedStyle(scrim).opacity) > 0.1;
  return {
    ouvert: burger?.getAttribute('aria-expanded') === 'true',
    ariaLabel: burger?.getAttribute('aria-label'),
    scrimPresent: !!scrim,
    scrimVisible,
    scrollVerrouille: document.documentElement.classList.contains('is-menu-open'),
  };
})()`);
await shot("385-home-menu.png");
await evaljs(`document.querySelector('[data-nav-burger]')?.click()`);

// ---- Passe 320x640 ----
await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 640, deviceScaleFactor: 2, mobile: true });
for (const p of PAGES) {
  await goto(p, p === "/" ? 3500 : 1500);
  report.at320[p] = await evaljs(OVERFLOW_JS);
}
await goto("/", 3500);
await shot("320-home.png");

// ---- Desktop 1440x900 : non-régression du pin ----
await send("Emulation.clearDeviceMetricsOverride");
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await goto("/", 4000);
report.desktop = await evaljs(`(() => {
  const hero = document.querySelector('[data-hero]');
  const r = hero.getBoundingClientRect();
  return {
    pointeurGrossier: matchMedia('(pointer: coarse)').matches,
    pinSpacer: !!document.querySelector('.pin-spacer'),
    unePage: Math.abs(r.bottom - innerHeight) <= 2,
    cartoucheTextes: document.querySelectorAll('[data-plan-base] text').length,
  };
})()`);

await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));

// Résumé binaire des critères de sortie.
const okOverflow = [...Object.values(report.at385), ...Object.values(report.at320)].every((d) => !d.overflowX);
const h = report.home385;
const verdicts = {
  "aucun débordement horizontal (385 et 320, toutes pages)": okOverflow,
  "plan allégé mobile (0 texte de cartouche, datum masqué)": h.geometrie.cartoucheTextes === 0 && !h.geometrie.datumVisible,
  "aucune collision cartouche/CTA ni cote/titre": !h.geometrie.cartoucheSurCTA && !h.geometrie.datumSurTitre,
  "dt du bloc hero non tronqués": h.geometrie.dtsOK,
  "pas de pin au tactile et la page bouge au 1er cran": !h.geometrie.pinSpacer && h.apresUnCran.pageBouge,
  "menu : scrim visible + aria-label bascule + scroll verrouillé":
    h.menu.scrimVisible && h.menu.ariaLabel === "Fermer le menu" && h.menu.scrollVerrouille,
  "desktop : pin présent + hero une page (non-régression)": report.desktop.pinSpacer && report.desktop.unePage,
};
console.log("\n=== CRITÈRES DE SORTIE ===");
let allOk = true;
for (const [k, v] of Object.entries(verdicts)) {
  console.log(`${v ? "OK " : "KO "} ${k}`);
  if (!v) allOk = false;
}
process.exitCode = allOk ? 0 : 1;
ws.close();
chrome.kill();
