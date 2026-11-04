import AxeBuilder from "@axe-core/playwright";
import { PAGES, expect, test } from "./fixtures";

/** Poids maximal de JavaScript par page (non compressé, ~160 Ko aujourd'hui). */
const JS_BUDGET_KB = 200;

for (const path of PAGES) {
  test.describe(path, () => {
    test("se charge sans erreur, avec un h1 et des métadonnées correctes", async ({ page, jsErrors }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/Chewbackk Studio/);
      // Google tronque les descriptions au-delà d'environ 155 caractères.
      const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
      expect(description.length).toBeGreaterThan(50);
      expect(description.length).toBeLessThanOrEqual(160);
      await page.waitForTimeout(800);
      expect(jsErrors).toEqual([]);
    });

    test("ne déborde pas horizontalement", async ({ page, isMobile }) => {
      const widths = isMobile ? [page.viewportSize()!.width, 320] : [page.viewportSize()!.width];
      for (const width of widths) {
        await page.setViewportSize({ width, height: page.viewportSize()!.height });
        await page.goto(path);
        await page.waitForTimeout(600);
        const overflow = await page.evaluate(
          () => document.scrollingElement!.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `débordement à ${width} px`).toBeLessThanOrEqual(1);
      }
    });

    test("respecte les règles WCAG A et AA (axe)", async ({ page }) => {
      // reduced-motion : contenu dans son état final, sans animation en cours.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help}`)).toEqual([]);
    });

    test(`reste sous ${JS_BUDGET_KB} Ko de JavaScript`, async ({ page, isMobile }) => {
      test.skip(isMobile, "mesuré une seule fois, en desktop");
      const sizes: Promise<number>[] = [];
      page.on("response", (res) => {
        if (res.request().resourceType() === "script" && res.url().startsWith("http://localhost")) {
          sizes.push(res.body().then((b) => b.length));
        }
      });
      await page.goto(path, { waitUntil: "networkidle" });
      const kb = (await Promise.all(sizes)).reduce((a, b) => a + b, 0) / 1024;
      expect(kb).toBeLessThan(JS_BUDGET_KB);
    });
  });
}

// Astro 7 compresse le HTML façon JSX par défaut, ce qui supprimait l'espace
// entre un mot et un lien placé en début de ligne (cf. astro.config.mjs).
test.describe("espaces entre les mots", () => {
  const PHRASES: [string, string][] = [
    ["/", "mieux qu'un template. Et quelqu'un qui répond."],
    ["/contact/", "Détails dans les mentions légales."],
    ["/mentions-legales/", "Elles sont transmises via Web3Forms, un service tiers"],
    ["/mentions-legales/", "écrivez à bouvierevan-contact@proton.me."],
  ];
  for (const [path, phrase] of PHRASES) {
    test(`${path} : « ${phrase} »`, async ({ page }) => {
      await page.goto(path);
      const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
      expect(text).toContain(phrase);
    });
  }
});
