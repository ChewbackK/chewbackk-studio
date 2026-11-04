import { expect, test } from "./fixtures";

// Reprend les critères de l'ancien scripts/audit-mobile.mjs : le hero
// Blueprint et le menu se comportent différemment au tactile et à la souris.

test("hero : titre composé, plan adapté au pointeur, rien de tronqué", async ({ page, isMobile }) => {
  await page.goto("/");
  const hero = page.locator("[data-hero]");
  await expect(hero).toHaveClass(/is-done/, { timeout: 6000 });
  await expect(page.locator(".hero__char")).toHaveCount(9);

  if (isMobile) {
    // Plan allégé : sans cartouche (il chevauchait les CTA) ni cote vivante
    // (elle chevauchait le titre).
    await expect(page.locator("[data-plan-base] text")).toHaveCount(0);
    await expect(page.locator("[data-datum-read]")).toBeHidden();
    // Pas d'épinglage au tactile : un swipe ne doit jamais être retenu.
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
  } else {
    await expect(page.locator("[data-plan-base] text")).toHaveCount(3);
    // Desktop : hero épinglé, et navbar + hero = exactement un écran.
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    const box = await hero.boundingBox();
    expect(Math.abs(box!.y + box!.height - page.viewportSize()!.height)).toBeLessThanOrEqual(2);
  }

  // Les libellés du bloc (« Délai »...) ne débordent pas de leur boîte.
  const truncated = await page
    .locator(".hero__block dt")
    .evaluateAll((dts) => dts.filter((dt) => dt.scrollWidth > Math.ceil(dt.getBoundingClientRect().width)).length);
  expect(truncated).toBe(0);
});

test("menu mobile : ouverture, page figée, fermeture à Échap", async ({ page, isMobile }) => {
  test.skip(!isMobile, "le menu burger n'existe que sous 640 px");
  await page.goto("/");
  const burger = page.locator("[data-nav-burger]");
  await burger.click();
  await expect(burger).toHaveAttribute("aria-expanded", "true");
  await expect(burger).toHaveAttribute("aria-label", "Fermer le menu");
  await expect(page.locator("html")).toHaveClass(/is-menu-open/);
  await expect(page.locator("[data-nav-scrim]")).toBeVisible();
  expect(await page.locator("#contenu").evaluate((el) => (el as HTMLElement).inert)).toBe(true);

  await page.keyboard.press("Escape");
  await expect(burger).toHaveAttribute("aria-expanded", "false");
  await expect(burger).toBeFocused();
  await expect(page.locator("html")).not.toHaveClass(/is-menu-open/);
});

test("navigation : le lien actif suit la page", async ({ page, isMobile }) => {
  test.skip(isMobile, "liens visibles dans la barre en desktop uniquement");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await nav.getByRole("link", { name: "Services" }).click();
  await expect(page).toHaveURL(/\/services/);
  await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute("href", "/services");
});
