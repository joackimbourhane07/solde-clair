import { useEffect, useRef, useState, type ReactNode } from 'react';
import { mouvementReduit } from '../lib/mouvement';
import { Valeur } from './ui';

/**
 * Apparition au défilement : le bloc apparaît en fondu quand il entre à l'écran, une seule fois.
 * Les blocs déjà visibles au chargement ne sont pas animés (rien ne « clignote » au démarrage).
 * Sans IntersectionObserver ou avec moins d'animations : tout est visible tout de suite.
 */
export function useApparition<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || mouvementReduit()) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) return; // déjà à l'écran
    el.classList.add('apparition');
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) {
            el.classList.add('visible');
            obs.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export function Apparition({
  children,
  className = '',
  as: Balise = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  const ref = useApparition<HTMLDivElement>();
  return (
    <Balise ref={ref as never} className={className}>
      {children}
    </Balise>
  );
}

const DUREE_MONTANT = 420;

/**
 * Montant qui glisse vers sa nouvelle valeur quand il change (après une saisie), avec un court surlignage
 * vert (hausse) ou rouge (baisse). Le premier affichage est immédiat : aucun compteur à attendre.
 * La variation est aussi annoncée par le texte final, jamais par la seule couleur.
 */
export function MontantAnime({
  cents,
  format,
  className = '',
  brut = false,
}: {
  cents: number;
  format: (c: number) => string;
  className?: string;
  brut?: boolean;
}) {
  const [affiche, setAffiche] = useState(cents);
  const [variation, setVariation] = useState<'hausse' | 'baisse' | null>(null);
  const precedent = useRef(cents);
  useEffect(() => {
    const depart = precedent.current;
    precedent.current = cents;
    if (depart === cents) return;
    setVariation(cents > depart ? 'hausse' : 'baisse');
    const fin = setTimeout(() => setVariation(null), 800);
    if (mouvementReduit() || typeof requestAnimationFrame === 'undefined') {
      setAffiche(cents);
      return () => clearTimeout(fin);
    }
    let image = 0;
    const t0 = performance.now();
    const pas = (t: number) => {
      const p = Math.min(1, (t - t0) / DUREE_MONTANT);
      const doux = 1 - Math.pow(1 - p, 3);
      setAffiche(Math.round(depart + (cents - depart) * doux));
      if (p < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => {
      cancelAnimationFrame(image);
      clearTimeout(fin);
      setAffiche(cents);
    };
  }, [cents]);
  return (
    <span className={`montant-anime ${className}`} data-variation={variation ?? undefined} data-anime={affiche !== cents ? '' : undefined}>
      {brut ? format(affiche) : <Valeur texte={format(affiche)} />}
    </span>
  );
}

/** Applique l'apparition au défilement à tous les éléments d'un sélecteur (page d'accueil). */
export function useApparitions(selecteur: string) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || mouvementReduit()) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(selecteur)).filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    for (const el of els) {
      el.classList.add('apparition');
      obs.observe(el);
    }
    return () => obs.disconnect();
  }, [selecteur]);
}

/**
 * Profondeur légère : les éléments [data-parallaxe="0.1"] se décalent un peu avec le défilement
 * (au plus 24 px). Désactivé avec moins d'animations ; aucun effet sur la lecture ni sur le défilement.
 */
export function useParallaxe() {
  useEffect(() => {
    if (mouvementReduit() || typeof requestAnimationFrame === 'undefined') return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallaxe]'));
    if (els.length === 0) return;
    let image = 0;
    const maj = () => {
      image = 0;
      const h = window.innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > h + 100) continue;
        const f = Number(el.dataset.parallaxe) || 0;
        const d = Math.max(-24, Math.min(24, (r.top + r.height / 2 - h / 2) * f));
        el.style.translate = `0 ${d.toFixed(1)}px`;
      }
    };
    const surDefilement = () => {
      if (!image) image = requestAnimationFrame(maj);
    };
    maj();
    window.addEventListener('scroll', surDefilement, { passive: true });
    window.addEventListener('resize', surDefilement);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener('scroll', surDefilement);
      window.removeEventListener('resize', surDefilement);
      for (const el of els) el.style.translate = '';
    };
  }, []);
}
