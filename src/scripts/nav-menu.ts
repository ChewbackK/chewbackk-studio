/**
 * nav-menu.ts - menu burger mobile (sous 640px, cf. Navbar.astro).
 *
 * La nav porte `transition:persist` : le même noeud DOM survit aux
 * navigations ClientRouter (pas de re-création). Donc teardown-avant-init
 * est indispensable ici aussi, sinon chaque `astro:page-load` empilerait un
 * nouvel écouteur sur le même bouton. `closeMenu()` en début d'init remet
 * aussi le menu fermé à chaque navigation (état propre, pas hérité de la
 * page précédente).
 */

let burger: HTMLButtonElement | null = null;
let list: HTMLElement | null = null;
let onToggle: (() => void) | null = null;
let onDocClick: ((e: MouseEvent) => void) | null = null;
let onKeydown: ((e: KeyboardEvent) => void) | null = null;
let onLinkClick: (() => void) | null = null;

function closeMenu(): void {
  if (!burger || !list) return;
  burger.setAttribute("aria-expanded", "false");
  burger.classList.remove("is-open");
  list.classList.remove("is-open");
}

function openMenu(): void {
  if (!burger || !list) return;
  burger.setAttribute("aria-expanded", "true");
  burger.classList.add("is-open");
  list.classList.add("is-open");
}

function teardown(): void {
  if (burger && onToggle) burger.removeEventListener("click", onToggle);
  if (onDocClick) document.removeEventListener("click", onDocClick);
  if (onKeydown) document.removeEventListener("keydown", onKeydown);
  if (list && onLinkClick) {
    list.querySelectorAll("a").forEach((a) => a.removeEventListener("click", onLinkClick as EventListener));
  }
  burger = null;
  list = null;
  onToggle = null;
  onDocClick = null;
  onKeydown = null;
  onLinkClick = null;
}

function init(): void {
  teardown();

  burger = document.querySelector<HTMLButtonElement>("[data-nav-burger]");
  list = document.querySelector<HTMLElement>("[data-nav-list]");
  if (!burger || !list) return;

  closeMenu();

  onToggle = () => {
    if (burger?.getAttribute("aria-expanded") === "true") closeMenu();
    else openMenu();
  };
  burger.addEventListener("click", onToggle);

  onDocClick = (e: MouseEvent) => {
    if (!burger || !list) return;
    const target = e.target as Node;
    if (burger.contains(target) || list.contains(target)) return;
    closeMenu();
  };
  document.addEventListener("click", onDocClick);

  onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeMenu();
  };
  document.addEventListener("keydown", onKeydown);

  onLinkClick = () => closeMenu();
  list.querySelectorAll("a").forEach((a) => a.addEventListener("click", onLinkClick as EventListener));
}

export function bootstrapNavMenu(): void {
  document.addEventListener("astro:page-load", init);
}
