/**
 * Écran réellement visible sur téléphone (barres du navigateur, clavier virtuel) et verrouillage du défilement.
 *
 * - `--vv-hauteur` : hauteur visible (clavier déduit) ; sert à limiter la hauteur des fenêtres.
 * - `--clavier` : hauteur du clavier virtuel (0 s'il est fermé) ; les fenêtres du bas remontent d'autant.
 * - classe `clavier-ouvert` sur <html> : la barre du bas et le bouton de Poksy s'effacent pendant la saisie
 *   (sur iOS, une barre fixe remonte sinon au-dessus du clavier et masque le champ).
 */
export function suivreEcranVisible() {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const vv = window.visualViewport;
  const maj = () => {
    const hauteur = vv ? vv.height : window.innerHeight;
    const clavier = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    root.style.setProperty('--vv-hauteur', `${Math.round(hauteur)}px`);
    root.style.setProperty('--clavier', `${Math.round(clavier)}px`);
    // Seuil : au-delà de 120 px manquants, c'est un clavier (pas la barre d'adresse qui se replie)
    root.classList.toggle('clavier-ouvert', clavier > 120 || (champActif() && window.innerHeight < ecranInitial - 120));
  };
  const ecranInitial = window.innerHeight;
  const champActif = () => {
    const el = document.activeElement;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') && (el as HTMLInputElement).type !== 'checkbox';
  };
  maj();
  vv?.addEventListener('resize', maj);
  vv?.addEventListener('scroll', maj);
  window.addEventListener('resize', maj);
  window.addEventListener('orientationchange', maj);
  document.addEventListener('focusin', () => setTimeout(maj, 300));
  document.addEventListener('focusout', () => setTimeout(maj, 300));
}

/* -------------------------------------------------------------------------- */
/* Verrouillage du défilement (fenêtres ouvertes)                              */
/* -------------------------------------------------------------------------- */

let verrous = 0;
let positionGardee = 0;

/**
 * Bloque le défilement de la page derrière une fenêtre, y compris sur iOS (où `overflow: hidden` ne suffit pas),
 * et rend la position exacte à la fermeture.
 */
export function verrouillerDefilement() {
  verrous += 1;
  if (verrous > 1) return;
  positionGardee = window.scrollY;
  const b = document.body.style;
  b.position = 'fixed';
  b.top = `-${positionGardee}px`;
  b.left = '0';
  b.right = '0';
  b.width = '100%';
  document.body.classList.add('modal-ouverte');
}

export function deverrouillerDefilement() {
  if (verrous === 0) return;
  verrous -= 1;
  if (verrous > 0) return;
  const b = document.body.style;
  b.position = '';
  b.top = '';
  b.left = '';
  b.right = '';
  b.width = '';
  document.body.classList.remove('modal-ouverte');
  const html = document.documentElement;
  const avant = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, positionGardee);
  html.style.scrollBehavior = avant;
}
