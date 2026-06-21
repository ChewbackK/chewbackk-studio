# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Commercial marketing site (site vitrine) for **Chewbackk Studio** — the freelance web-dev brand of Evan Bouvier, a sole trader (micro-entreprise), **not an agency**. The site must both sell his services and *be* a demo of his skill, so visual quality is a functional requirement, not polish.

**`BRIEF.md` is the source of truth for all product/content/design requirements.** Read it before building or changing any page. This file documents *how the codebase works*; `BRIEF.md` documents *what to build*. When they conflict, BRIEF.md wins on product decisions.

All user-facing copy is in **French**. Write code comments and content in French to match the existing style; no jargon in user-facing text (the audience is artisans, students, small businesses — not developers).

## Current state

Fresh Astro scaffold. As of now `src/` contains only `src/pages/index.astro` (a placeholder). The directories referenced in `BRIEF.md` (`src/components/`, `src/layouts/`, `src/styles/`, `src/scripts/`, `src/content/`) **do not exist yet** — you create them as you build. Everything under `src/` is yours to (re)write; everything outside it is locked (see below).

## Commands

```sh
npm run dev       # dev server at localhost:4321
npm run build     # static build to ./dist/
npm run preview   # serve the built ./dist/ locally
npm run astro check   # type-check .astro files — run before considering work done
```

There is **no test suite and no linter configured**. Verification = `npm run build` succeeds + `astro check` is clean + manual review in the browser. Don't claim a change works without at least building it.

## Hard constraints (non-negotiable, from BRIEF.md)

These are stack/architecture rules, not preferences. Violating them means redoing the work.

- **Stack:** Astro 6.4+ in **static output** (no SSR adapter), Node 22. TypeScript is in `strict` mode (`astro/tsconfigs/strict`).
- **No client framework.** Forbidden: React, Vue, Three.js, Barba.js, jQuery. Interactivity is vanilla JS in `<script>` tags or `src/scripts/`. Don't reach for a framework integration to solve a UI problem.
- **Animations:** GSAP 3 + ScrollTrigger + Lenis only. Load them as client islands (`<script>` runs client-side by default in Astro; gate expensive scroll work to visibility). **Every animation must respect `prefers-reduced-motion`** — this is a WCAG requirement, not optional. No animation may be the only way to access content.
- **Page transitions:** use Astro's `ClientRouter` (`astro:transitions`). Note Lenis + ClientRouter need re-initialization on `astro:page-load` — a naive Lenis setup in a layout will break after the first client-side navigation.
- **Accessibility:** WCAG AA contrast on every text/background pair. Mobile-first, responsive down to **320px**.
- **Contact form:** Web3Forms only (hidden `access_key`, honeypot field, `fetch` POST as JSON). No tracking, no third-party cookies. A non-pre-checked RGPD consent checkbox is **required** and must block submission when unchecked. All form states (sending / success / error) are in French.

## Do NOT modify

These are intentionally locked. Changing them breaks deploy or domain config:

- `.github/workflows/deploy.yml` — the GitHub Actions → GitHub Pages pipeline.
- `public/CNAME` — custom domain (`chewbackk-studio.evanbouvier.fr`). Removing it breaks the domain.
- `astro.config.mjs`'s `site` value and `package.json` core deps are effectively fixed by the brief. You may *add* Astro integrations via `astro.config.mjs` if a requirement needs one, but don't change the framework choices above.

> Note: the deploy workflow's `build` and `deploy` jobs are split, but the build job doesn't explicitly pass a Pages artifact to the deploy job. If deploys ever fail to pick up fresh output, that's the likely cause — but **flag it to the user before touching the workflow**, since it's in the locked set.

## Architecture & conventions

- **Routing:** file-based. Each `.astro` / `.mdx` in `src/pages/` is a route. Planned routes: `/` (index), `/services`, `/realisations`, `/contact`, `/mentions-legales` (the last doesn't exist yet — create it). `@astrojs/mdx` is installed for content-heavy pages.
- **Shared chrome lives in a layout** (`src/layouts/BaseLayout.astro` per the brief) wrapping every page: `<head>`/SEO, Navbar, Footer, and the `ClientRouter`. The footer must carry the légales link and the "TVA non applicable, art. 293 B du CGI" mention on every page.
- **SEO/canonical URLs** derive from `astro.config.mjs`'s `site`. `@astrojs/sitemap` auto-generates `/sitemap-index.xml` (already referenced by `public/robots.txt`) — no manual sitemap.
- **Styling:** plain CSS via `src/styles/` (the brief anticipates `tokens.css` / `globals.css` / `effects.css`). Astro scopes component `<style>` blocks by default; use that for component-local styles and the global sheets for tokens/resets. No CSS framework is installed.
- **Secrets/config:** Web3Forms key goes in `.env` as `PUBLIC_WEB3FORMS_KEY` (the `PUBLIC_` prefix is required for Astro to expose it client-side) and is read via `import.meta.env.PUBLIC_WEB3FORMS_KEY`. `.env` is gitignored — never commit the real key.

## Legal content that must stay correct

Several legal facts are fixed and appear in `/mentions-legales` and where prices/services are shown. Pull exact values from `BRIEF.md` rather than retyping from memory: SIRET, SIREN, APE 6201Z, the TVA-293-B mention, the GitHub Inc. host address, and the `[ADRESSE]` placeholder (intentionally left to fill before go-live — don't invent an address). The RGPD privacy notice (data collected, purpose, Web3Forms transmission, retention, access/deletion rights) is mandatory.
