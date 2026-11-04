import { test as base, expect } from "@playwright/test";

/** Toutes les pages générées par le build. */
export const PAGES = [
  "/",
  "/services/",
  "/realisations/",
  "/realisations/axel-mahe/",
  "/realisations/chewcast/",
  "/realisations/portfolio-personnel/",
  "/contact/",
  "/mentions-legales/",
  "/404.html",
];

/**
 * `page` sans appel externe (la balise Cloudflare Web Analytics est
 * neutralisée) et `jsErrors`, qui collecte les erreurs JS et console.
 */
export const test = base.extend<{ jsErrors: string[] }>({
  page: async ({ page }, use) => {
    await page.route(/cloudflareinsights\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
    );
    await use(page);
  },
  jsErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await use(errors);
  },
});

export { expect };
