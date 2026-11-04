import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/** Intercepte Web3Forms : aucun vrai envoi, on garde le contenu transmis. */
async function interceptSubmit(page: Page): Promise<Record<string, unknown>[]> {
  const sent: Record<string, unknown>[] = [];
  await page.route("https://api.web3forms.com/submit", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { success: true } });
  });
  return sent;
}

async function fillRequired(page: Page, { consent = true } = {}): Promise<void> {
  await page.fill('input[name="name"]', "Test Robot");
  await page.fill('input[name="email"]', "robot@example.com");
  await page.fill('textarea[name="message"]', "Un site vitrine pour un artisan.");
  await page.selectOption('select[name="timeline"]', "1-mois");
  if (consent) await page.check('input[name="consent"]');
}

test.beforeEach(async ({ page }) => {
  await page.goto("/contact/");
});

test("budget « Non précisé » tant que le curseur n'a pas bougé", async ({ page }) => {
  const sent = await interceptSubmit(page);
  const slider = page.locator("[data-budget-input]");
  await expect(slider).toBeDisabled();

  await page.selectOption("[data-project-type]", "sites-web");
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveAttribute("aria-valuetext", "Non précisé");
  await fillRequired(page);
  await page.click("[data-form-submit]");

  await expect(page.locator("[data-form-status]")).toContainText("bien été envoyée");
  expect(sent).toHaveLength(1);
  expect(sent[0].budget).toBe("Non précisé");
  // Après l'envoi, le formulaire revient à son état initial.
  await expect(slider).toBeDisabled();
  await expect(page.locator("[data-budget-value]")).toHaveText("Choisissez d'abord un type de projet.");
});

test("le budget choisi au curseur est transmis", async ({ page }) => {
  const sent = await interceptSubmit(page);
  await page.selectOption("[data-project-type]", "discord");
  const slider = page.locator("[data-budget-input]");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", "Jusqu'à 650 €");
  await fillRequired(page);
  await page.click("[data-form-submit]");
  await expect(page.locator("[data-form-status]")).toContainText("bien été envoyée");
  expect(sent[0].budget).toBe("Jusqu'à 650 €");
});

test("rien n'est envoyé sans le consentement", async ({ page }) => {
  const sent = await interceptSubmit(page);
  await page.selectOption("[data-project-type]", "autre");
  await fillRequired(page, { consent: false });
  await page.click("[data-form-submit]");
  await page.waitForTimeout(300);
  expect(sent).toHaveLength(0);
});

test("honeypot rempli : faux succès, aucun envoi", async ({ page }) => {
  const sent = await interceptSubmit(page);
  await page.locator('input[name="company"]').evaluate((el) => {
    (el as HTMLInputElement).value = "robot-spam";
  });
  await page.click("[data-form-submit]");
  await expect(page.locator("[data-form-status]")).toContainText("bien été envoyée");
  expect(sent).toHaveLength(0);
});
