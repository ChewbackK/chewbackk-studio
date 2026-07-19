/**
 * nav-menu.ts - menu burger mobile (sous 640px, cf. Navbar.astro).
 *
 * La nav porte `transition:persist` : le même noeud DOM survit aux
 * navigations ClientRouter (pas de re-création). Donc teardown-avant-init
 * est indispensable ici aussi, sinon chaque `astro:page-load` empilerait un
 * nouvel écouteur sur le même bouton. `closeMenu()` en début d'init remet
 * aussi le menu fermé à chaque navigation (état propre, pas hérité de la
 * page précédente).
 *
 * Menu ouvert : voile (scrim) sur la page + scroll gelé (overflow hidden
 * côté CSS pour le natif/tactile, scrollFreeze pour Lenis côté molette).
 * Le reste de la page (contenu principal + pied de page) est en plus rendu
 * `inert` : ni focusable au clavier, ni exposé aux lecteurs d'écran, tant que
 * le menu est ouvert (sinon Tab en avant depuis le burger pouvait retomber
 * sur le contenu de la page sous le voile, focus et utilisateur perdus l'un
 * pour l'autre). `inert` est une propriété DOM native, pas juste un attribut :
 * on la pose/retire sur les bons éléments (jamais sur le header lui-même).
 * Fermetures : bouton, Échap (focus rendu au bouton), clic hors menu (le
 * scrim compte), clic sur un lien, retour au-dessus de 640px.
 */
import { scrollFreeze } from "./smooth-scroll";

let burger: HTMLButtonElement | null = null;
let list: HTMLElement | null = null;
let scrim: HTMLElement | null = null;
let mainContent: HTMLElement | null = null;
let pageFooter: HTMLElement | null = null;
let mqDesktop: MediaQueryList | null = null;
let onToggle: (() => void) | null = null;
let onDocClick: ((e: MouseEvent) => void) | null = null;
let onKeydown: ((e: KeyboardEvent) => void) | null = null;
let onLinkClick: (() => void) | null = null;
let onMqChange: ((e: MediaQueryListEvent) => void) | null = null;

function isOpen(): boolean {
  return burger?.getAttribute("aria-expanded") === "true";
}

function closeMenu(returnFocus = false): void {
  if (!burger || !list) return;
  burger.setAttribute("aria-expanded", "false");
  burger.setAttribute("aria-label", "Ouvrir le menu");
  burger.classList.remove("is-open");
  list.classList.remove("is-open");
  scrim?.classList.remove("is-open");
  document.documentElement.classList.remove("is-menu-open");
  if (mainContent) mainContent.inert = false;
  if (pageFooter) pageFooter.inert = false;
  scrollFreeze(false);
  if (returnFocus) burger.focus();
}

function openMenu(): void {
  if (!burger || !list) return;
  burger.setAttribute("aria-expanded", "true");
  burger.setAttribute("aria-label", "Fermer le menu");
  burger.classList.add("is-open");
  list.classList.add("is-open");
  scrim?.classList.add("is-open");
  document.documentElement.classList.add("is-menu-open");
  // Le reste de la page devient inerte : ni focusable, ni exposé à
  // l'arbre d'accessibilité, tant que le menu mobile est ouvert.
  if (mainContent) mainContent.inert = true;
  if (pageFooter) pageFooter.inert = true;
  scrollFreeze(true);
}

function teardown(): void {
  // État propre même si on démonte menu ouvert (navigation en cours) :
  // pas de scrim, de scroll gelé ou d'inert orphelins.
  closeMenu();
  if (burger && onToggle) burger.removeEventListener("click", onToggle);
  if (onDocClick) document.removeEventListener("click", onDocClick);
  if (onKeydown) document.removeEventListener("keydown", onKeydown);
  if (list && onLinkClick) {
    list.querySelectorAll("a").forEach((a) => a.removeEventListener("click", onLinkClick as EventListener));
  }
  if (mqDesktop && onMqChange) mqDesktop.removeEventListener("change", onMqChange);
  burger = null;
  list = null;
  scrim = null;
  mainContent = null;
  pageFooter = null;
  mqDesktop = null;
  onToggle = null;
  onDocClick = null;
  onKeydown = null;
  onLinkClick = null;
  onMqChange = null;
}

function init(): void {
  teardown();

  burger = document.querySelector<HTMLButtonElement>("[data-nav-burger]");
  list = document.querySelector<HTMLElement>("[data-nav-list]");
  scrim = document.querySelector<HTMLElement>("[data-nav-scrim]");
  mainContent = document.querySelector<HTMLElement>("#contenu");
  pageFooter = document.querySelector<HTMLElement>("footer.footer");
  if (!burger || !list) return;

  // Le header persiste entre navigations (transition:persist sur Navbar.astro),
  // donc aria-current — calculé côté serveur une seule fois — doit être
  // recalculé ici à chaque astro:page-load, sinon il reste figé sur l'URL
  // d'origine. Même logique d'isActive() que dans Navbar.astro.
  const path = window.location.pathname;
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  list.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    if (isActive(href)) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  closeMenu();

  onToggle = () => {
    if (isOpen()) closeMenu();
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
    // Focus rendu au bouton : on ne vole le focus que si le menu était ouvert.
    if (e.key === "Escape" && isOpen()) closeMenu(true);
  };
  document.addEventListener("keydown", onKeydown);

  onLinkClick = () => closeMenu();
  list.querySelectorAll("a").forEach((a) => a.addEventListener("click", onLinkClick as EventListener));

  // Fenêtre élargie au-dessus du seuil burger : sans ça le menu resterait
  // « ouvert » (classes + scroll gelé) en repassant desktop.
  mqDesktop = window.matchMedia("(min-width: 641px)");
  onMqChange = (e: MediaQueryListEvent) => {
    if (e.matches) closeMenu();
  };
  mqDesktop.addEventListener("change", onMqChange);
}

export function bootstrapNavMenu(): void {
  document.addEventListener("astro:page-load", init);
}
