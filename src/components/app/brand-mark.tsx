import { useId } from "react";

/**
 * Marca da Growth Ambiental: folha em degradê verde-água → azul, com a
 * nervura desenhando um "G", sobre um quadrado branco arredondado.
 *
 * É uma recriação vetorial do logo enviado pelo cliente. Se chegar o arquivo
 * oficial (SVG/PNG), troque o desenho aqui e em `src/app/icon.svg` — o resto
 * do app só usa este componente.
 */
export function BrandMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const grad = `bm-leaf-${uid}`;
  return (
    <span
      className={`grid flex-none place-items-center rounded-[26%] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={grad} x1="12" y1="58" x2="56" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1d5fc4" />
            <stop offset="0.55" stopColor="#1f86c9" />
            <stop offset="1" stopColor="#2fcf9e" />
          </linearGradient>
        </defs>
        {/* folha */}
        <path
          d="M10 56C6 34 16 14 40 9c6-1.3 12-1.3 17-.5-1 7-4 12-9 15 2 3 2.5 7 2 11-2.5 14-17 23-40 21.5Z"
          fill={`url(#${grad})`}
        />
        {/* nervura em "G" */}
        <path
          d="M10 56C18 40 28 28 46 17M24 42c6-3 13-4 22-3.5 0 0 .5 4-1 7"
          stroke="#ffffff"
          strokeOpacity="0.92"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
