/**
 * Avatar de Poksy : tête de chat minimaliste, vue de face, dans un cercle bleu clair.
 * Dessin original (palette SoldeClair : #E7F3F8, #2383E2, #191919, #FFFFFF), sans texte ni symbole monétaire.
 * Décoratif : masqué aux lecteurs d'écran, car le nom « Poksy » est toujours écrit à côté.
 */
export function PoksyAvatar({ taille = 40, className = '' }: { taille?: number; className?: string }) {
  return (
    <svg
      className={`poksy-avatar ${className}`}
      width={taille}
      height={taille}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="32" fill="#E7F3F8" />
      {/* Tête et oreilles */}
      <path
        d="M15 37c0-7.6 2-12.2 5-15L18.2 11.8 27.2 17.6c3.2-.8 6.4-.8 9.6 0l9-5.8L44 22c3 2.8 5 7.4 5 15 0 8.6-7.6 14.6-17 14.6S15 45.6 15 37Z"
        fill="#FFFFFF"
        stroke="#191919"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Intérieur des oreilles */}
      <path d="M20.6 19.2 19.9 14.6 24.4 17.5Z" fill="#2383E2" stroke="#2383E2" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M43.4 19.2 44.1 14.6 39.6 17.5Z" fill="#2383E2" stroke="#2383E2" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Yeux doux */}
      <ellipse cx="25.6" cy="34.2" rx="2.5" ry="3.1" fill="#191919" />
      <ellipse cx="38.4" cy="34.2" rx="2.5" ry="3.1" fill="#191919" />
      <circle cx="26.4" cy="33" r="0.9" fill="#FFFFFF" />
      <circle cx="39.2" cy="33" r="0.9" fill="#FFFFFF" />
      {/* Nez et bouche */}
      <path d="M30.3 40h3.4L32 42.1Z" fill="#2383E2" stroke="#2383E2" strokeWidth="1" strokeLinejoin="round" />
      <path
        d="M32 42.1c-.3 1.6-1.6 2.3-3 1.7M32 42.1c.3 1.6 1.6 2.3 3 1.7"
        fill="none"
        stroke="#191919"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* Moustaches fines */}
      <path
        d="M22.4 40.4 13.6 39M22.6 42.8l-8.4 1.6M41.6 40.4l8.8-1.4M41.4 42.8l8.4 1.6"
        fill="none"
        stroke="#191919"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Petite étincelle près de l'oreille droite */}
      <path d="M53 8.6c.4 2.6 1 3.2 3.6 3.6-2.6.4-3.2 1-3.6 3.6-.4-2.6-1-3.2-3.6-3.6 2.6-.4 3.2-1 3.6-3.6Z" fill="#2383E2" />
    </svg>
  );
}
