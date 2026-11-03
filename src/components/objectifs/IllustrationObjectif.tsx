import type { GoalTheme } from '../../types';

/**
 * Illustrations originales des objectifs d'épargne (une par thème), dessinées pour SoldeClair
 * avec la palette du site. Décoratives : masquées aux lecteurs d'écran (le nom de l'objectif est écrit à côté).
 */
const FONDS: Record<GoalTheme, string> = {
  urgence: '#DDEDEA',
  voyage: '#E7F3F8',
  vehicule: '#FAEBDD',
  etudes: '#E7F3F8',
  logement: '#DDEDEA',
  tech: '#EFEFED',
  fete: '#FBE4E4',
  sante: '#FBE4E4',
  projet: '#E7F3F8',
};

const BLEU = '#2383E2';
const NOIR = '#191919';
const VERT = '#0F7B6C';
const ORANGE = '#D9730D';
const ROUGE = '#E03E3E';
const BLANC = '#FFFFFF';

function Dessin({ theme }: { theme: GoalTheme }) {
  switch (theme) {
    case 'urgence':
      return (
        <>
          <path d="M60 14 84 22v18c0 16-10 27-24 33-14-6-24-17-24-33V22Z" fill={VERT} />
          <path d="m49 43 8 8 15-16" fill="none" stroke={BLANC} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="24" r="4" fill={ORANGE} />
          <circle cx="98" cy="66" r="5" fill={BLEU} opacity="0.5" />
        </>
      );
    case 'voyage':
      return (
        <>
          <circle cx="94" cy="22" r="9" fill={ORANGE} />
          <path d="M14 30c8-6 18-6 26 0" fill="none" stroke={BLEU} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <path d="m22 20 30 8 14-8c3-1.6 6 .4 5 3l-1 3-14 9-2 15-5 2-2-13-11 6-2 6-4 1 .5-10-8-6Z" fill={BLEU} />
          <rect x="62" y="44" width="38" height="32" rx="6" fill={ORANGE} />
          <path d="M73 44v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6" fill="none" stroke={NOIR} strokeWidth="3" />
          <path d="M73 50v20M89 50v20" stroke={BLANC} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'vehicule':
      return (
        <>
          <path d="M18 60v-9c0-3 2-5 5-6l12-3 10-12c2-2 4-3 7-3h22c3 0 5 1 7 3l10 12 8 2c3 1 5 3 5 6v10Z" fill={BLEU} />
          <path d="M48 41 55 31h11v10Zm22 0V31h7l8 10Z" fill={BLANC} />
          <circle cx="38" cy="62" r="9" fill={NOIR} />
          <circle cx="38" cy="62" r="3.5" fill={BLANC} />
          <circle cx="84" cy="62" r="9" fill={NOIR} />
          <circle cx="84" cy="62" r="3.5" fill={BLANC} />
          <path d="M14 76h92" stroke={NOIR} strokeWidth="2" strokeLinecap="round" opacity="0.25" />
        </>
      );
    case 'etudes':
      return (
        <>
          <path d="M60 18 98 34 60 50 22 34Z" fill={NOIR} />
          <path d="M38 41v14c0 6 10 11 22 11s22-5 22-11V41L60 50Z" fill="#3B3B3B" />
          <path d="M92 37v20" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />
          <circle cx="92" cy="60" r="4" fill={ORANGE} />
          <rect x="16" y="58" width="26" height="16" rx="3" fill={BLANC} stroke={BLEU} strokeWidth="2.5" />
          <path d="M22 64h14M22 69h9" stroke={BLEU} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'logement':
      return (
        <>
          <path d="M30 44 60 18l30 26" fill="none" stroke={BLEU} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M36 42v32h48V42L60 21Z" fill={BLANC} stroke={NOIR} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="54" y="54" width="12" height="20" rx="2" fill={ORANGE} />
          <rect x="42" y="47" width="9" height="9" rx="1.5" fill={BLEU} opacity="0.6" />
          <rect x="69" y="47" width="9" height="9" rx="1.5" fill={BLEU} opacity="0.6" />
          <circle cx="100" cy="66" r="8" fill={VERT} />
          <path d="M100 66v10" stroke={NOIR} strokeWidth="2" />
        </>
      );
    case 'tech':
      return (
        <>
          <rect x="30" y="20" width="60" height="40" rx="5" fill={NOIR} />
          <rect x="35" y="25" width="50" height="30" rx="2" fill={BLEU} />
          <path d="M42 34h22M42 41h30M42 48h14" stroke={BLANC} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <path d="M22 62h76l-6 8H28Z" fill="#3B3B3B" />
          <rect x="94" y="30" width="14" height="24" rx="3" fill={ORANGE} />
          <circle cx="101" cy="49" r="1.6" fill={BLANC} />
        </>
      );
    case 'fete':
      return (
        <>
          <rect x="34" y="38" width="52" height="36" rx="4" fill={ROUGE} />
          <rect x="30" y="30" width="60" height="12" rx="3" fill="#C22F2F" />
          <path d="M60 30v44" stroke={ORANGE} strokeWidth="6" />
          <path d="M60 30c-6-10-18-10-16-2 1 4 9 4 16 2Zm0 0c6-10 18-10 16-2-1 4-9 4-16 2Z" fill={ORANGE} />
          <circle cx="20" cy="22" r="3" fill={BLEU} />
          <circle cx="100" cy="20" r="3" fill={VERT} />
          <path d="m96 52 6-3m-84 6 7 2" stroke={BLEU} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'sante':
      return (
        <>
          <path d="M60 74S28 56 28 36c0-10 8-17 17-17 6 0 11 3 15 8 4-5 9-8 15-8 9 0 17 7 17 17 0 20-32 38-32 38Z" fill={ROUGE} />
          <path d="M34 44h14l5-10 8 20 5-10h20" fill="none" stroke={BLANC} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    default:
      // Projet : tirelire, pièce et petite pousse
      return (
        <>
          <ellipse cx="56" cy="50" rx="28" ry="21" fill={BLEU} />
          <path d="M36 36 32 24l12 6" fill={BLEU} />
          <path d="M82 46h6c2 0 3 1.5 3 3v6c0 1.6-1.4 3-3 3h-6" fill={BLEU} />
          <circle cx="72" cy="44" r="2.6" fill={NOIR} />
          <path d="M48 31h14" stroke={BLANC} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M40 68v8m28-8v8" stroke={BLEU} strokeWidth="7" strokeLinecap="round" />
          <circle cx="55" cy="16" r="8" fill={ORANGE} />
          <path d="M55 12v8" stroke={BLANC} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M100 76V58" stroke={VERT} strokeWidth="3" strokeLinecap="round" />
          <path d="M100 64c-8 0-12-5-12-11 7 0 12 4 12 11Zm0-4c0-7 5-11 12-11 0 7-5 11-12 11Z" fill={VERT} />
        </>
      );
  }
}

export function IllustrationObjectif({ theme, className = '' }: { theme: GoalTheme; className?: string }) {
  return (
    <svg className={`illustration-objectif ${className}`} viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <rect width="120" height="90" rx="16" fill={FONDS[theme]} />
      <Dessin theme={theme} />
    </svg>
  );
}
