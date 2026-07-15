# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Commercial marketing site (site vitrine) for **Chewbackk Studio**, the freelance web-dev brand of Evan Bouvier, a sole trader (micro-entreprise), **not an agency**. The site must both sell his services and *be* a demo of his skill, so visual quality is a functional requirement, not polish.

**`BRIEF.md` is the source of truth for all product/content/design requirements.** Read it before building or changing any page. This file documents *how the codebase works*; `BRIEF.md` documents *what to build*. When they conflict, BRIEF.md wins on product decisions.

All user-facing copy is in **French**. Write code comments and content in French to match the existing style; no jargon in user-facing text (the audience is artisans, students, small businesses, not developers).

## Content & style rules (apply everywhere: code, comments, UI copy)

These are project-wide writing/design rules. They are not optional.

- **No em dash (`—`) anywhere.** Not in UI copy, not in comments, not in commit messages. Use a colon, a comma, parentheses, or a spaced hyphen (` - `) instead, whichever reads best. When you reformulate, prefer rewriting the sentence over a mechanical swap.
- **No small low-contrast grey text.** Avoid the "tiny pale grey on dark" pattern: it fails accessibility and reads as a generic template. Every text/background pair must clear **WCAG AA** (≥ 4.5:1 for body, ≥ 3:1 for large text). Secondary text uses `--c-ink-muted` (verified ≥ 8.7:1 on the page background) at readable sizes; do not push smaller/paler than that for the sake of "subtlety". If a label needs to recede, recede it with size/weight/spacing, not by killing contrast.

## Current state

The foundations and the home hero are built (branch `feat/hero-tranche-1` holds the first commit). `src/` now contains `layouts/`, `components/`, `scripts/`, `styles/` and the home page. Still to come (deferred slices): the `/services`, `/realisations`, `/contact`, `/mentions-legales` pages, the Web3Forms contact form, and `src/content/` collections. The footer already links to `/mentions-legales`, which 404s until that page exists (a known, accepted state).

## Commands

```sh
npm run dev       # dev server at localhost:4321
npm run build     # static build to ./dist/
npm run preview   # serve the built ./dist/ locally
npm run astro check   # type-check .astro files; run before considering work done
```

There is **no test suite and no linter configured**. Verification = `npm run build` succeeds + `astro check` is clean + manual review in the browser (drive it; the load animations and cursor effects only show in a real browser). Don't claim a change works without at least building it.

## Hard constraints (non-negotiable, from BRIEF.md)

These are stack/architecture rules, not preferences. Violating them means redoing the work.

- **Stack:** Astro 6.4+ in **static output** (no SSR adapter), Node 22. TypeScript is in `strict` mode (`astro/tsconfigs/strict`).
- **No client framework.** Forbidden: React, Vue, Three.js, jQuery. Interactivity is vanilla JS/TS in `<script>` tags or `src/scripts/`. Don't reach for a framework integration to solve a UI problem. (Barba.js was in the brief's original ban list but the page-transition need is already covered by Astro's `ClientRouter`; don't add a second router.)
- **Animations:** GSAP 3 + ScrollTrigger + Lenis only. Load them as client islands. **Every animation must respect `prefers-reduced-motion`**; this is a WCAG requirement, not optional. No animation may be the only way to access content. Note: GSAP keeps its own rAF ticker alive once used; in the reduced-motion path call `gsap.ticker.sleep()` so no loop runs (and `wake()` in the animated path).
- **Page transitions:** use Astro's `ClientRouter` (`astro:transitions`). A hoisted `<script>` runs once and does **not** re-run after client navigation, so per-page init must be attached to `astro:page-load` and be idempotent (tear down before re-init). Don't rely on the deprecated `astro:before-swap`/`after-swap` events (removed in Astro 7).
- **Accessibility:** WCAG AA contrast on every text/background pair. Mobile-first, responsive down to **320px** (test it: a missing breakpoint override caused real horizontal-scroll overflow here).
- **Contact form:** Web3Forms only (hidden `access_key`, honeypot field, `fetch` POST as JSON). No tracking, no third-party cookies. A non-pre-checked RGPD consent checkbox is **required** and must block submission when unchecked. All form states (sending / success / error) are in French.

## Do NOT modify

These are intentionally locked. Changing them breaks deploy or domain config:

- `.github/workflows/deploy.yml`, the GitHub Actions to GitHub Pages pipeline.
- `public/CNAME`, the custom domain (`chewbackk-studio.evanbouvier.fr`). Removing it breaks the domain.
- `astro.config.mjs`'s `site` value and `package.json` core deps are effectively fixed by the brief. You may *add* Astro integrations via `astro.config.mjs` if a requirement needs one, but don't change the framework choices above.
- `BRIEF.md` is the client brief; treat it as read-only unless the user explicitly asks to change it.

> Note: the deploy workflow's `build` and `deploy` jobs are split, but the build job doesn't explicitly pass a Pages artifact to the deploy job. If deploys ever fail to pick up fresh output, that's the likely cause, but **flag it to the user before touching the workflow**, since it's in the locked set.

## Architecture & conventions

- **Routing:** file-based. Each `.astro` / `.mdx` in `src/pages/` is a route. `@astrojs/mdx` is installed for content-heavy pages.
- **Shared chrome lives in `src/layouts/BaseLayout.astro`** wrapping every page: `<head>`/SEO, Navbar, Footer, the `ClientRouter`, and the single hoisted bootstrap `<script>` that wires the global motion engine. An inline head script adds `html.js` synchronously (before paint) so CSS can hide the initial state of animated elements only when JS is active (no flash, and content stays visible with JS off). The footer must carry the légales link and the "TVA non applicable, art. 293 B du CGI" mention on every page.
- **Design tokens** live in `src/styles/tokens.css`. The palette is black & white plus a single accent (vert acide `#c6f24e`); the accent is one source of truth (`--c-accent` / `--c-accent-rgb`), so retheming the whole site is a two-line change. Spacing tokens are `--sp-{1,2,3,4,6,8,12,16,24}` only: **the intermediate steps (5, 7, 9, …) do not exist**, and `var(--sp-5)` silently resolves to nothing (a real bug here, it collapsed a button's padding to 0). Use the defined steps.
- **Styling:** plain CSS via `src/styles/` (`tokens.css` / `globals.css` / `effects.css`). Astro scopes component `<style>` blocks by default; use that for component-local styles and the global sheets for tokens/resets. To reach a global element from a scoped block, use `:global(...)`. No CSS framework is installed.
- **Animation scripts** in `src/scripts/` follow a shared pattern: a `bootstrap*()` exported function attaches an `astro:page-load` listener; the per-page `init()` tears down first (idempotent), bails out or renders a static end-state under `prefersReducedMotion()`, and pauses its rAF loop off-screen (IntersectionObserver) and on `visibilitychange`. `motion.ts` is the single source of truth for the reduced-motion check.
- **SEO/canonical URLs** derive from `astro.config.mjs`'s `site`. `@astrojs/sitemap` auto-generates `/sitemap-index.xml` (already referenced by `public/robots.txt`); no manual sitemap.
- **Fonts** are self-hosted in `public/fonts/` as subset woff2 (Latin + French glyphs) and preloaded in `Seo.astro`; declared via `@font-face` in `globals.css`. Keep new display fonts OFL-licensed (commercial use), subset, and single-weight for performance.
- **Secrets/config:** Web3Forms key is hardcoded as a constant in `src/scripts/contact-form.ts` (owner's explicit decision, not `.env`: the key is public-by-design for Web3Forms, not a secret). Confirmed working end-to-end by the owner.

## Legal content that must stay correct

Several legal facts are fixed and appear in `/mentions-legales` and where prices/services are shown. Pull exact values from `BRIEF.md` rather than retyping from memory: SIRET, SIREN, APE 6201Z, the TVA-293-B mention, the GitHub Inc. host address. The real address (4 Bis rue des Dames, 56700 Hennebont) was filled in on 15/07/2026 (owner accepted publishing the home address, no domiciliation) - it's no longer a `[ADRESSE]` placeholder, don't revert it. The RGPD privacy notice (data collected, purpose, Web3Forms transmission, retention, access/deletion rights) is mandatory.
