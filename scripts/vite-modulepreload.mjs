/**
 * vite-modulepreload.mjs : élimine le waterfall JS entre chunks compilés.
 *
 * Constat (audit perf) : certains chunks générés par le build (ex.
 * HeroBlueprint.<hash>.js, Navbar.<hash>.js) importent statiquement un autre
 * chunk plus gros (motion.<hash>.js : gsap + ScrollTrigger, ~45 Ko, via
 * smooth-scroll.<hash>.js ou blueprint.ts) sans qu'un <link
 * rel="modulepreload"> ne soit émis dans le HTML. Le navigateur ne découvre
 * donc ce second chunk qu'après avoir téléchargé ET PARSÉ le premier : un
 * aller-retour réseau séquentiel de trop avant que gsap/ScrollTrigger soient
 * disponibles.
 *
 * Astro ne génère pas ces balises lui-même pour les scripts hoistés (limite
 * connue, cf. withastro/roadmap#561) : cette intégration comble le manque
 * avec le mécanisme standard Vite/Rollup, sans dépendance externe.
 *
 * Méthode :
 *  1. Un plugin Vite (appliqué à l'environnement "client", celui qui produit
 *     les chunks JS livrés au navigateur) capture le graphe d'imports STATIQUES
 *     réel entre chunks compilés, via le hook Rollup `generateBundle` (les
 *     imports dynamiques `dynamicImports` sont volontairement ignorés : ils
 *     sont censés rester chargés à la demande, les preload casseraient ce
 *     lazy-loading).
 *  2. Le hook Astro `astro:build:done` (même process Node, la Map survit
 *     entre les deux étapes) relit chaque page HTML générée, repère les
 *     <script type="module" src="..."> qu'elle charge, calcule la fermeture
 *     transitive de leurs imports statiques via ce graphe, et insère une
 *     balise <link rel="modulepreload" href="..."> par chunk manquant, juste
 *     avant </head> : le navigateur démarre alors le téléchargement du chunk
 *     lourd EN PARALLÈLE du chunk qui le référence, au lieu de l'enchaîner.
 *
 * Idempotent : relit le graphe à chaque build, n'ajoute que les balises
 * absentes, ne modifie aucun fichier source.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** @returns {import("vite").Plugin} */
function chunkGraphPlugin(chunkGraph) {
  return {
    name: "chewbackk:modulepreload-graph",
    apply: "build",
    applyToEnvironment(environment) {
      return environment.name === "client";
    },
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        chunkGraph.set(output.fileName, output.imports);
      }
    },
  };
}

/** Fermeture transitive des imports statiques d'un chunk (hors lui-même). */
function transitiveImports(fileName, chunkGraph, seen = new Set()) {
  const imports = chunkGraph.get(fileName) ?? [];
  for (const imp of imports) {
    if (!seen.has(imp)) {
      seen.add(imp);
      transitiveImports(imp, chunkGraph, seen);
    }
  }
  return seen;
}

async function listHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listHtmlFiles(full);
      return entry.name.endsWith(".html") ? [full] : [];
    }),
  );
  return files.flat();
}

/** Repère les <script type="module" src="..."> d'une page HTML. */
function findModuleScriptSrcs(html) {
  const srcs = [];
  const scriptRe = /<script\b([^>]*)><\/script>/g;
  let match;
  while ((match = scriptRe.exec(html))) {
    const attrs = match[1];
    if (!/\btype="module"/.test(attrs)) continue;
    const srcMatch = attrs.match(/\bsrc="([^"]+)"/);
    if (srcMatch) srcs.push(srcMatch[1]);
  }
  return srcs;
}

export default function injectModulePreload() {
  /** @type {Map<string, string[]>} chunk (chemin relatif à l'outDir) -> imports statiques */
  const chunkGraph = new Map();

  return {
    name: "chewbackk:inject-modulepreload",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({ vite: { plugins: [chunkGraphPlugin(chunkGraph)] } });
      },
      "astro:build:done": async ({ dir, logger }) => {
        if (chunkGraph.size === 0) {
          logger.warn(
            "aucun chunk capturé : le graphe d'imports est vide, aucun modulepreload ajouté.",
          );
          return;
        }
        const outDir = fileURLToPath(dir);
        const htmlFiles = await listHtmlFiles(outDir);
        let pagesTouched = 0;
        let linksAdded = 0;

        for (const file of htmlFiles) {
          const html = await readFile(file, "utf-8");
          const entrySrcs = findModuleScriptSrcs(html);

          const needed = new Set();
          for (const src of entrySrcs) {
            // src est un chemin absolu depuis la racine du site (ex.
            // "/_astro/HeroBlueprint.xxx.js") ; le graphe est indexé par
            // chemin relatif à l'outDir (ex. "_astro/HeroBlueprint.xxx.js").
            const relFileName = src.replace(/^\//, "");
            for (const dep of transitiveImports(relFileName, chunkGraph)) {
              needed.add(dep);
            }
          }
          if (needed.size === 0) continue;

          // N'ajoute pas de balise pour un chunk déjà préchargé (idempotent
          // si ce hook tournait deux fois sur le même dossier).
          const already = new Set(
            [...html.matchAll(/<link[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g)].map(
              (m) => m[1].replace(/^\//, ""),
            ),
          );

          const links = [...needed]
            .filter((dep) => !already.has(dep))
            .map((dep) => `<link rel="modulepreload" href="/${dep}">`)
            .join("");
          if (!links) continue;

          const updated = html.replace("</head>", `${links}</head>`);
          await writeFile(file, updated, "utf-8");
          pagesTouched += 1;
          linksAdded += [...needed].filter((dep) => !already.has(dep)).length;
        }

        logger.info(
          `modulepreload : ${linksAdded} balise(s) ajoutée(s) sur ${pagesTouched} page(s).`,
        );
      },
    },
  };
}
