/**
 * contact-form.ts - formulaire de devis (/contact), envoi via Web3Forms.
 *
 * - Honeypot ("company") : si rempli, on affiche un faux succès sans rien
 *   envoyer (ne pas renseigner le bot que son remplissage a été détecté).
 * - Consentement RGPD obligatoire : bloqué côté client avant tout fetch.
 * - États en français : idle / envoi en cours / succès / erreur, dans une
 *   zone aria-live pour les lecteurs d'écran.
 * - Idempotent sur `astro:page-load`, teardown d'abord (cohérent avec le
 *   reste du projet).
 */

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
// Clé publique par conception (Web3Forms), pas un secret : pas besoin de .env.
const WEB3FORMS_ACCESS_KEY = "522e9f97-769a-44a8-93f8-46a485f38b9d";

let form: HTMLFormElement | null = null;
let onSubmit: ((e: SubmitEvent) => void) | null = null;
let projectType: HTMLSelectElement | null = null;
let budgetInput: HTMLInputElement | null = null;
let onProjectTypeChange: (() => void) | null = null;
let onBudgetInput: (() => void) | null = null;

function setStatus(statusEl: HTMLElement, message: string, kind: "sending" | "success" | "error" | ""): void {
  statusEl.textContent = message;
  statusEl.dataset.kind = kind;
}

function formatEuro(n: number): string {
  return `${n.toLocaleString("fr-FR")} €`;
}

/** Étiquette lisible du budget courant, utilisée à l'affichage ET dans l'envoi. */
function budgetLabel(input: HTMLInputElement): string {
  const value = Number(input.value);
  const max = Number(input.max);
  return value >= max ? `${formatEuro(value)} et plus` : `Jusqu'à ${formatEuro(value)}`;
}

async function handleSubmit(form: HTMLFormElement, statusEl: HTMLElement, submitBtn: HTMLButtonElement): Promise<void> {
  const data = new FormData(form);

  // Honeypot : un humain ne remplit jamais ce champ (caché visuellement).
  if (String(data.get("company") ?? "").trim() !== "") {
    setStatus(statusEl, "Merci, votre demande a bien été envoyée.", "success");
    form.reset();
    return;
  }

  if (!(data.get("consent") === "on")) {
    setStatus(statusEl, "Merci de cocher la case de consentement avant l'envoi.", "error");
    return;
  }

  const payload = {
    access_key: WEB3FORMS_ACCESS_KEY,
    subject: "Nouvelle demande de devis - Chewbackk Studio",
    from_name: "Chewbackk Studio (formulaire devis)",
    name: data.get("name"),
    email: data.get("email"),
    project_type: data.get("project_type"),
    budget: data.get("budget"),
    timeline: data.get("timeline"),
    message: data.get("message"),
  };

  submitBtn.disabled = true;
  setStatus(statusEl, "Envoi en cours...", "sending");

  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      setStatus(statusEl, "Merci, votre demande a bien été envoyée. Réponse sous 48 h.", "success");
      form.reset();
    } else {
      setStatus(statusEl, "L'envoi a échoué. Réessayez, ou écrivez directement à bouvierevan-contact@proton.me.", "error");
    }
  } catch {
    setStatus(statusEl, "L'envoi a échoué (connexion). Réessayez, ou écrivez directement à bouvierevan-contact@proton.me.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

function teardown(): void {
  if (form && onSubmit) form.removeEventListener("submit", onSubmit as EventListener);
  if (projectType && onProjectTypeChange) projectType.removeEventListener("change", onProjectTypeChange);
  if (budgetInput && onBudgetInput) budgetInput.removeEventListener("input", onBudgetInput);
  form = null;
  onSubmit = null;
  projectType = null;
  budgetInput = null;
  onProjectTypeChange = null;
  onBudgetInput = null;
}

function init(): void {
  teardown();

  form = document.querySelector<HTMLFormElement>("[data-quote-form]");
  if (!form) return;
  const statusEl = form.querySelector<HTMLElement>("[data-form-status]");
  const submitBtn = form.querySelector<HTMLButtonElement>("[data-form-submit]");
  if (!statusEl || !submitBtn) return;

  onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!form) return;
    handleSubmit(form, statusEl, submitBtn);
  };
  form.addEventListener("submit", onSubmit);

  // Slider de budget : bornes dépendantes de la catégorie choisie (brief :
  // "formulaire intelligent"). Un seul curseur (budget max) : un minimum de
  // budget n'a pas vraiment de sens du point de vue du client.
  projectType = form.querySelector<HTMLSelectElement>("[data-project-type]");
  budgetInput = form.querySelector<HTMLInputElement>("[data-budget-input]");
  const budgetHidden = form.querySelector<HTMLInputElement>("[data-budget-hidden]");
  const budgetValueEl = form.querySelector<HTMLElement>("[data-budget-value]");
  const budgetMinEl = form.querySelector<HTMLElement>("[data-budget-min]");
  const budgetMaxEl = form.querySelector<HTMLElement>("[data-budget-max]");

  if (projectType && budgetInput && budgetHidden && budgetValueEl && budgetMinEl && budgetMaxEl) {
    const refreshValue = (): void => {
      if (!budgetInput || budgetInput.disabled) return;
      const label = budgetLabel(budgetInput);
      budgetValueEl.textContent = label;
      budgetHidden.value = label;
    };

    onProjectTypeChange = () => {
      const opt = projectType?.selectedOptions[0];
      const min = Number(opt?.dataset.optBudgetMin);
      const max = Number(opt?.dataset.optBudgetMax);
      const step = Number(opt?.dataset.optBudgetStep);
      if (!opt?.value || Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(step)) {
        budgetInput!.disabled = true;
        budgetMinEl.textContent = "-";
        budgetMaxEl.textContent = "-";
        budgetValueEl.textContent = "Choisissez d'abord un type de projet.";
        budgetHidden.value = "";
        return;
      }
      budgetInput!.disabled = false;
      budgetInput!.min = String(min);
      budgetInput!.max = String(max);
      budgetInput!.step = String(step);
      budgetInput!.value = String(min);
      budgetMinEl.textContent = formatEuro(min);
      budgetMaxEl.textContent = `${formatEuro(max)} et plus`;
      refreshValue();
    };
    projectType.addEventListener("change", onProjectTypeChange);

    onBudgetInput = refreshValue;
    budgetInput.addEventListener("input", onBudgetInput);
  }
}

export function bootstrapContactForm(): void {
  document.addEventListener("astro:page-load", init);
}
