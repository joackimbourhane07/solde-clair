/**
 * Illustrations originales de la page d'accueil (dessinées pour SoldeClair).
 * Style : aplats doux tirés de la palette, trait fin, sans personnage.
 * Les couleurs passent par des classes CSS (accueil.css) : elles suivent le thème clair ou sombre.
 * Toutes sont décoratives : le texte voisin porte le sens.
 */
import type { ReactNode } from 'react';

function Svg({ viewBox, className, children }: { viewBox: string; className?: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} className={`illu ${className ?? ''}`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** Pièce de monnaie (ellipse + tranche). */
function Piece({ x, y, r = 14 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 4} rx={r} ry={r * 0.42} className="il-orange-clair il-trait" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.42} className="il-orange-clair il-trait" />
    </g>
  );
}

/** Illustration principale : un téléphone ouvert sur le reste du mois, entouré d'objets du quotidien. */
export function IllustrationPrincipale() {
  return (
    <Svg viewBox="130 24 700 428" className="illu-principale">
      {/* Fonds doux */}
      <circle cx="480" cy="250" r="190" className="il-bleu-clair" />
      <circle cx="770" cy="110" r="46" className="il-orange-clair" />
      <circle cx="192" cy="360" r="56" className="il-vert-clair" />
      <circle cx="300" cy="70" r="8" className="il-bleu" />
      <circle cx="660" cy="420" r="6" className="il-bleu" />
      <path d="M812 236v20M802 246h20" className="il-trait-bleu" />
      <path d="M150 262v18M141 271h18" className="il-trait-bleu" />

      {/* Calendrier : la fin du mois entourée */}
      <g transform="rotate(-8 235 165)">
        <rect x="170" y="95" width="132" height="142" rx="16" className="il-papier il-trait" />
        <path d="M170 135h132" className="il-trait" />
        <path d="M170 111a16 16 0 0 1 16-16h100a16 16 0 0 1 16 16v24H170z" className="il-bleu-clair il-trait" />
        <path d="M205 86v20M267 86v20" className="il-trait il-epais" />
        <text x="236" y="203" textAnchor="middle" className="il-texte il-texte-grand">
          30
        </text>
        <ellipse cx="236" cy="190" rx="34" ry="27" className="il-trait-bleu" />
      </g>

      {/* Bocal de pièces */}
      <g>
        <path d="M228 300h76v10c14 8 20 22 20 40v44a22 22 0 0 1-22 22h-72a22 22 0 0 1-22-22v-44c0-18 6-32 20-40z" className="il-papier il-trait" />
        <rect x="222" y="286" width="88" height="18" rx="6" className="il-bleu il-trait" />
        <path d="M212 370h108v14a22 22 0 0 1-22 22h-64a22 22 0 0 1-22-22z" className="il-orange-clair" />
        <Piece x={246} y={362} r={13} />
        <Piece x={282} y={352} r={13} />
        <Piece x={262} y={336} r={11} />
        <Piece x={350} y={404} r={14} />
        <Piece x={350} y={394} r={14} />
      </g>

      {/* Téléphone */}
      <g>
        <rect x="372" y="40" width="216" height="392" rx="34" className="il-papier il-trait il-epais" />
        <rect x="452" y="54" width="56" height="10" rx="5" className="il-encre" />
        <rect x="394" y="84" width="24" height="24" rx="6" className="il-bleu" />
        <path d="M400 102c1.5 2 4 3 7 3 4 0 6.5-2 6.5-5 0-6-12.5-3.5-12.5-8.5 0-2 2-3.5 5.5-3.5 2.5 0 4.5 1 5.5 2.5" className="il-trait-blanc" />
        <rect x="424" y="90" width="58" height="10" rx="5" className="il-gris" />
        <text x="398" y="146" className="il-texte il-texte-petit">
          Il te reste
        </text>
        <text x="396" y="192" className="il-texte il-texte-montant">
          425 €
        </text>
        <text x="398" y="216" className="il-texte il-texte-petit">
          pour terminer le mois
        </text>
        <rect x="398" y="232" width="164" height="10" rx="5" className="il-piste" />
        <rect x="398" y="232" width="104" height="10" rx="5" className="il-vert" />
        <rect x="398" y="256" width="96" height="26" rx="8" className="il-bleu-clair" />
        <text x="408" y="274" className="il-texte il-texte-bleu">
          ≈ 14 € / jour
        </text>
        {[300, 334, 368].map((y, i) => (
          <g key={y}>
            <circle cx="408" cy={y + 8} r="9" className={i === 1 ? 'il-orange-clair' : i === 2 ? 'il-vert-clair' : 'il-bleu-clair'} />
            <rect x="424" y={y + 2} width={70 - i * 10} height="8" rx="4" className="il-gris" />
            <rect x="530" y={y + 2} width="32" height="8" rx="4" className="il-gris-fonce" />
          </g>
        ))}
        <circle cx="480" cy="404" r="16" className="il-bleu" />
        <path d="M480 396v16M472 404h16" className="il-trait-blanc" />
      </g>

      {/* Ticket de caisse */}
      <g transform="rotate(7 712 180)">
        <path d="M652 96h120v150l-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8z" className="il-papier il-trait" />
        <rect x="670" y="118" width="60" height="8" rx="4" className="il-gris-fonce" />
        <rect x="670" y="142" width="84" height="7" rx="3.5" className="il-gris" />
        <rect x="670" y="160" width="70" height="7" rx="3.5" className="il-gris" />
        <rect x="670" y="178" width="78" height="7" rx="3.5" className="il-gris" />
        <path d="M670 200h84" className="il-trait il-pointille" />
        <rect x="670" y="212" width="40" height="9" rx="4.5" className="il-gris-fonce" />
        <rect x="722" y="212" width="32" height="9" rx="4.5" className="il-bleu" />
      </g>

      {/* Cadenas : les données restent ici */}
      <g>
        <path d="M712 318v-22a30 30 0 0 1 60 0v22" className="il-trait il-epais" />
        <rect x="692" y="316" width="100" height="80" rx="18" className="il-vert-clair il-trait" />
        <circle cx="742" cy="350" r="9" className="il-encre" />
        <path d="M742 356v16" className="il-trait il-epais" />
      </g>
    </Svg>
  );
}

/** Pictogrammes des avantages (cercle coloré + objet). */
export function PictoApercu() {
  return (
    <Svg viewBox="0 0 96 96" className="illu-picto">
      <circle cx="48" cy="48" r="44" className="il-bleu-clair" />
      <path d="M18 48s11-20 30-20 30 20 30 20-11 20-30 20-30-20-30-20z" className="il-papier il-trait" />
      <circle cx="48" cy="48" r="11" className="il-bleu" />
      <text x="48" y="53" textAnchor="middle" className="il-texte il-texte-blanc">
        €
      </text>
    </Svg>
  );
}

export function PictoSansBanque() {
  return (
    <Svg viewBox="0 0 96 96" className="illu-picto">
      <circle cx="48" cy="48" r="44" className="il-vert-clair" />
      <rect x="30" y="20" width="36" height="58" rx="8" className="il-papier il-trait" />
      <path d="M40 48v-6a8 8 0 0 1 16 0v6" className="il-trait" />
      <rect x="37" y="47" width="22" height="17" rx="4" className="il-vert il-trait" />
      <rect x="42" y="26" width="12" height="3" rx="1.5" className="il-encre" />
    </Svg>
  );
}

export function PictoDebuter() {
  return (
    <Svg viewBox="0 0 96 96" className="illu-picto">
      <circle cx="48" cy="48" r="44" className="il-orange-clair" />
      <path d="M30 70h36l-4 10H34z" className="il-papier il-trait" />
      <path d="M48 70V46" className="il-trait il-epais" />
      <path d="M48 52c-12 0-18-8-18-18 10 0 18 6 18 18z" className="il-vert il-trait" />
      <path d="M48 46c0-12 8-20 20-20 0 12-8 20-20 20z" className="il-vert-clair il-trait" />
    </Svg>
  );
}

/** Bocal qui se remplit, avec un repère à 60 %. */
export function IllustrationBocal() {
  return (
    <Svg viewBox="0 0 250 220" className="illu-section">
      <circle cx="110" cy="114" r="96" className="il-vert-clair" />
      <path d="M72 46h76v12c18 10 26 26 26 48v58a28 28 0 0 1-28 28H74a28 28 0 0 1-28-28v-58c0-22 8-38 26-48z" className="il-papier il-trait" />
      <path d="M46 132h128v32a28 28 0 0 1-28 28H74a28 28 0 0 1-28-28z" className="il-bleu-clair" />
      <path d="M46 132h128" className="il-trait-bleu" />
      <rect x="64" y="30" width="92" height="20" rx="7" className="il-bleu il-trait" />
      <Piece x={84} y={170} r={14} />
      <Piece x={122} y={162} r={14} />
      <Piece x={104} y={146} r={12} />
      <path d="M180 132h14" className="il-trait" />
      <text x="200" y="137" className="il-texte il-texte-petit">
        60 %
      </text>
    </Svg>
  );
}

/** Balance : un achat d'un côté, des pièces de l'autre. */
export function IllustrationBalance() {
  return (
    <Svg viewBox="0 0 240 220" className="illu-section">
      <circle cx="120" cy="116" r="96" className="il-orange-clair" />
      <path d="M120 40v136M84 190h72" className="il-trait il-epais" />
      <path d="M100 176h40l8 14H92z" className="il-papier il-trait" />
      <path d="M44 70h152" className="il-trait il-epais" transform="rotate(-6 120 70)" />
      <circle cx="120" cy="64" r="8" className="il-bleu il-trait" />
      {/* plateau gauche : sac d'achats */}
      <path d="M46 78l-22 46h56z" className="il-trait" />
      <path d="M22 124h60a30 12 0 0 1-60 0z" className="il-papier il-trait" />
      <rect x="36" y="94" width="32" height="30" rx="5" className="il-bleu-clair il-trait" />
      <path d="M44 94v-6a8 8 0 0 1 16 0v6" className="il-trait" />
      {/* plateau droit : pièces */}
      <path d="M194 66l-22 46h56z" className="il-trait" />
      <path d="M170 112h60a30 12 0 0 1-60 0z" className="il-papier il-trait" />
      <Piece x={190} y={102} r={12} />
      <Piece x={212} y={100} r={12} />
      <Piece x={200} y={88} r={11} />
    </Svg>
  );
}

/** Objets symboliques des profils. */
export function ProfilEtudiant() {
  return (
    <Svg viewBox="0 0 160 110" className="illu-profil">
      <circle cx="80" cy="58" r="50" className="il-bleu-clair" />
      {/* sac à dos */}
      <path d="M58 30h36a14 14 0 0 1 14 14v46a8 8 0 0 1-8 8H52a8 8 0 0 1-8-8V44a14 14 0 0 1 14-14z" className="il-bleu il-trait" />
      <path d="M66 30v-6a10 10 0 0 1 20 0v6" className="il-trait" />
      <rect x="54" y="62" width="44" height="24" rx="6" className="il-papier il-trait" />
      <path d="M54 72h44" className="il-trait" />
      {/* livre */}
      <path d="M104 70l34-8v34l-34 8z" className="il-orange-clair il-trait" />
      <path d="M110 76l20-5" className="il-trait" />
    </Svg>
  );
}

export function ProfilAlternant() {
  return (
    <Svg viewBox="0 0 160 110" className="illu-profil">
      <circle cx="80" cy="58" r="50" className="il-orange-clair" />
      {/* casque de chantier */}
      <path d="M40 72a34 34 0 0 1 68 0z" className="il-orange il-trait" />
      <path d="M32 72h84a4 4 0 0 1 0 8H32a4 4 0 0 1 0-8z" className="il-orange il-trait" />
      <path d="M74 40v-6h12v6" className="il-trait" />
      {/* carnet */}
      <rect x="106" y="54" width="34" height="44" rx="5" className="il-papier il-trait" />
      <path d="M114 66h18M114 76h18M114 86h12" className="il-trait" />
      <path d="M106 60h-4M106 72h-4M106 84h-4" className="il-trait" />
    </Svg>
  );
}

export function ProfilSalarie() {
  return (
    <Svg viewBox="0 0 160 110" className="illu-profil">
      <circle cx="80" cy="58" r="50" className="il-vert-clair" />
      {/* sacoche */}
      <rect x="36" y="44" width="78" height="54" rx="10" className="il-vert il-trait" />
      <path d="M60 44v-8a6 6 0 0 1 6-6h18a6 6 0 0 1 6 6v8" className="il-trait" />
      <path d="M36 64h78" className="il-trait" />
      <rect x="68" y="58" width="14" height="12" rx="3" className="il-papier il-trait" />
      {/* badge */}
      <path d="M126 28v18" className="il-trait-bleu" />
      <rect x="110" y="46" width="34" height="44" rx="6" className="il-papier il-trait" />
      <circle cx="127" cy="62" r="7" className="il-bleu-clair il-trait" />
      <path d="M118 80h18" className="il-trait" />
    </Svg>
  );
}

/** Confidentialité : un téléphone qui garde les données à l'intérieur. */
export function IllustrationConfidentialite() {
  return (
    <Svg viewBox="0 0 260 240" className="illu-section">
      <circle cx="130" cy="124" r="104" className="il-bleu-clair" />
      <rect x="82" y="30" width="96" height="184" rx="20" className="il-papier il-trait il-epais" />
      <rect x="114" y="40" width="32" height="7" rx="3.5" className="il-encre" />
      <rect x="98" y="66" width="64" height="8" rx="4" className="il-gris" />
      <rect x="98" y="82" width="48" height="8" rx="4" className="il-gris" />
      <path d="M114 138v-14a16 16 0 0 1 32 0v14" className="il-trait il-epais" />
      <rect x="104" y="136" width="52" height="42" rx="10" className="il-vert il-trait" />
      <circle cx="130" cy="153" r="5" className="il-encre" />
      <path d="M130 157v9" className="il-trait il-epais" />
      {/* données qui restent à l'intérieur (petites flèches qui tournent) */}
      <path d="M50 120a80 80 0 0 1 30-56" className="il-trait-bleu il-pointille" />
      <path d="M210 128a80 80 0 0 1-30 56" className="il-trait-bleu il-pointille" />
      <circle cx="44" cy="150" r="6" className="il-bleu" />
      <circle cx="216" cy="98" r="6" className="il-bleu" />
    </Svg>
  );
}

/* -------------------------- Petits objets décoratifs -------------------------- */

/** Page de calendrier avec la fin du mois entourée. */
export function PetitCalendrier() {
  return (
    <Svg viewBox="0 0 150 160" className="illu-objet">
      <g transform="rotate(-8 75 85)">
        <rect x="10" y="20" width="132" height="132" rx="16" className="il-papier il-trait" />
        <path d="M10 36a16 16 0 0 1 16-16h100a16 16 0 0 1 16 16v24H10z" className="il-bleu-clair il-trait" />
        <path d="M45 10v20M107 10v20" className="il-trait il-epais" />
        <text x="76" y="122" textAnchor="middle" className="il-texte il-texte-grand">
          30
        </text>
        <ellipse cx="76" cy="109" rx="34" ry="27" className="il-trait-bleu" />
      </g>
    </Svg>
  );
}

/** Ticket de caisse plié. */
export function PetitTicket() {
  return (
    <Svg viewBox="0 0 140 180" className="illu-objet">
      <g transform="rotate(7 70 90)">
        <path d="M10 10h120v150l-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8z" className="il-papier il-trait" />
        <rect x="28" y="32" width="60" height="8" rx="4" className="il-gris-fonce" />
        <rect x="28" y="56" width="84" height="7" rx="3.5" className="il-gris" />
        <rect x="28" y="74" width="70" height="7" rx="3.5" className="il-gris" />
        <rect x="28" y="92" width="78" height="7" rx="3.5" className="il-gris" />
        <path d="M28 114h84" className="il-trait il-pointille" />
        <rect x="28" y="126" width="40" height="9" rx="4.5" className="il-gris-fonce" />
        <rect x="80" y="126" width="32" height="9" rx="4.5" className="il-bleu" />
      </g>
    </Svg>
  );
}

/** Cadenas : les données restent sur l'appareil. */
export function PetitCadenas() {
  return (
    <Svg viewBox="0 0 120 120" className="illu-objet">
      <circle cx="60" cy="64" r="54" className="il-vert-clair" />
      <path d="M40 58V40a20 20 0 0 1 40 0v18" className="il-trait il-epais" />
      <rect x="26" y="56" width="68" height="52" rx="14" className="il-papier il-trait" />
      <circle cx="60" cy="78" r="7" className="il-encre" />
      <path d="M60 82v12" className="il-trait il-epais" />
    </Svg>
  );
}

/** Pièces empilées. */
export function PetitesPieces() {
  return (
    <Svg viewBox="0 0 120 90" className="illu-objet">
      <Piece x={40} y={60} r={22} />
      <Piece x={40} y={46} r={22} />
      <Piece x={40} y={32} r={22} />
      <Piece x={86} y={66} r={20} />
      <Piece x={86} y={52} r={20} />
    </Svg>
  );
}
