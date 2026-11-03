import avatar96 from '../../assets/poksy/poksy-avatar-96.webp';
import avatar192 from '../../assets/poksy/poksy-avatar-192.webp';
import portrait360 from '../../assets/poksy/poksy-portrait-360.webp';
import portrait640 from '../../assets/poksy/poksy-portrait-640.webp';

/**
 * Avatar de Poksy : photo du vrai Poksy (chat blanc aux marques grises et noires, yeux vert clair, nez rose),
 * recadrée sur le visage. Décoratif : le nom « Poksy » est toujours écrit à côté (texte alternatif vide).
 */
export function PoksyAvatar({ taille = 40, className = '' }: { taille?: number; className?: string }) {
  return (
    <span className={`poksy-avatar ${className}`} style={{ width: taille, height: taille }} aria-hidden="true">
      <img
        src={taille > 48 ? avatar192 : avatar96}
        srcSet={`${avatar96} 96w, ${avatar192} 192w`}
        sizes={`${taille}px`}
        width={taille}
        height={taille}
        alt=""
        decoding="async"
        draggable={false}
      />
    </span>
  );
}

/**
 * Portrait de Poksy (autocollant : fond vert pâle, calculatrice, pièce, empreinte de patte), pour la page d'accueil.
 * Chargé seulement quand il approche de l'écran.
 */
export function PoksyPortrait({
  className = '',
  alt = 'Poksy, le chat guide de SoldeClair, accoudé, avec une calculatrice et une pièce',
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      className={`poksy-portrait ${className}`}
      src={portrait360}
      srcSet={`${portrait360} 360w, ${portrait640} 640w`}
      sizes="(min-width: 900px) 320px, 60vw"
      width={360}
      height={434}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
