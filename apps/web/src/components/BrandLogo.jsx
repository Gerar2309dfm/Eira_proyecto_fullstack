import logoHorizontal from '../assets/eira-logo-horizontal.webp';

/**
 * Logotipo oficial de EIRA, recortado de la imagen compartida para el hackatón.
 * Mantiene intactos el símbolo, las letras blancas y su degradado original.
 */
export default function BrandLogo({ className = '' }) {
  return (
    <img
      className={`eira-brand-logo ${className}`.trim()}
      src={logoHorizontal}
      alt="EIRA"
      draggable={false}
    />
  );
}
