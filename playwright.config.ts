import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de non-régression du site buildé : lancer `npm run build` avant
 * `npm test`. Le site est servi par `astro preview` ; deux profils, un
 * desktop (souris) et un mobile tactile (Pixel 7), car le hero et le menu
 * se comportent différemment selon le pointeur.
 */
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4321",
  },
  webServer: {
    // --ignore-lock : serveur ponctuel au premier plan. Sans lui, Astro 7
    // passe la preview en arrière-plan quand il détecte un agent IA (Claude
    // Code, Cursor...) et Playwright croit que le serveur s'est arrêté.
    command: "npm run preview -- --port 4321 --ignore-lock",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
