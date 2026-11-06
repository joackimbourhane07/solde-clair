import { useEffect, useState } from 'react';

/**
 * Préférence d'animation, propre à l'appareil : « auto » suit le réglage du système (réduire les animations),
 * « reduit » coupe les animations même si le système ne le demande pas.
 */
export type ChoixMouvement = 'auto' | 'reduit';

export const CLE_MOUVEMENT = 'monsite:mouvement:v1';

export function lireMouvement(): ChoixMouvement {
  try {
    return localStorage.getItem(CLE_MOUVEMENT) === 'reduit' ? 'reduit' : 'auto';
  } catch {
    return 'auto';
  }
}

export function appliquerMouvement(choix: ChoixMouvement = lireMouvement()) {
  if (typeof document === 'undefined') return;
  if (choix === 'reduit') document.documentElement.dataset.mouvement = 'reduit';
  else delete document.documentElement.dataset.mouvement;
}

export function enregistrerMouvement(choix: ChoixMouvement) {
  try {
    if (choix === 'reduit') localStorage.setItem(CLE_MOUVEMENT, 'reduit');
    else localStorage.removeItem(CLE_MOUVEMENT);
  } catch {
    /* stockage indisponible : le choix vaut pour cette visite */
  }
  appliquerMouvement(choix);
  window.dispatchEvent(new Event('monsite:mouvement'));
}

/** Vrai si les animations doivent être évitées (système ou choix dans le site). */
export function mouvementReduit(): boolean {
  if (typeof window === 'undefined') return true;
  // Tests automatiques (jsdom) : pas d'animation, les valeurs finales s'affichent tout de suite
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) return true;
  if (document.documentElement.dataset.mouvement === 'reduit') return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Suit la préférence en direct (changement du réglage système ou du choix dans les paramètres). */
export function useMouvementReduit(): boolean {
  const [reduit, setReduit] = useState(mouvementReduit);
  useEffect(() => {
    const maj = () => setReduit(mouvementReduit());
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    mq?.addEventListener?.('change', maj);
    window.addEventListener('monsite:mouvement', maj);
    return () => {
      mq?.removeEventListener?.('change', maj);
      window.removeEventListener('monsite:mouvement', maj);
    };
  }, []);
  return reduit;
}
