import type { Mood, Species } from "../pet";

/**
 * O bichinho desenhado: formas simples da paleta do app (nada de imagem de terceiros).
 * A espécie muda o corpo; o humor muda só a carinha, então o bichinho é sempre o mesmo e nunca fica "feio".
 */

const FACE: Record<Mood, { eye: "aberto" | "feliz" | "dorme"; mouth: string; blush: boolean; tear: boolean }> = {
  radiante: { eye: "feliz", mouth: "M 42 62 q 8 10 16 0", blush: true, tear: false },
  feliz: { eye: "aberto", mouth: "M 43 61 q 7 8 14 0", blush: true, tear: false },
  "de boa": { eye: "aberto", mouth: "M 44 62 h 12", blush: false, tear: false },
  "com saudade": { eye: "aberto", mouth: "M 43 64 q 7 -6 14 0", blush: false, tear: false },
  "com muita saudade": { eye: "dorme", mouth: "M 43 65 q 7 -7 14 0", blush: false, tear: true },
};

const BODY: Record<Species, { fill: string; ears: React.ReactNode; extra?: React.ReactNode }> = {
  gato: {
    fill: "var(--tangerine)",
    ears: <path d="M 26 26 l 4 -18 14 10 z M 74 26 l -4 -18 -14 10 z" />,
    extra: <path d="M 78 72 q 16 2 10 -14" fill="none" stroke="var(--tangerine)" strokeWidth="6" strokeLinecap="round" />,
  },
  cachorro: {
    fill: "var(--sunflower)",
    ears: <path d="M 22 24 q -12 10 -4 28 q 10 2 12 -16 z M 78 24 q 12 10 4 28 q -10 2 -12 -16 z" />,
  },
  coelho: {
    fill: "var(--lavender)",
    ears: <path d="M 38 22 q -6 -24 2 -24 q 8 0 6 24 z M 62 22 q 6 -24 -2 -24 q -8 0 -6 24 z" />,
  },
  passarinho: {
    fill: "var(--coral)",
    ears: <path d="M 50 8 q 3 -8 8 -6 q -2 6 -4 8 z" />,
    extra: (
      <>
        <path d="M 72 54 q 14 6 4 16 q -8 2 -10 -8 z" fill="rgba(0,0,0,0.12)" />
        <path d="M 50 50 l 10 5 -10 5 z" fill="var(--tangerine)" />
      </>
    ),
  },
  monstrinho: {
    fill: "var(--frog)",
    ears: (
      <>
        <path d="M 34 18 l 2 -14 10 12 z M 66 18 l -2 -14 -10 12 z" />
        <circle cx="30" cy="6" r="4" />
        <circle cx="70" cy="6" r="4" />
      </>
    ),
    extra: <path d="M 30 12 v 8 M 70 12 v 8" stroke="var(--frog)" strokeWidth="3" strokeLinecap="round" />,
  },
  dragao: {
    fill: "var(--cobalt)",
    ears: <path d="M 30 20 l 6 -14 8 12 z M 70 20 l -6 -14 -8 12 z M 50 6 l 5 -8 5 10 z" />,
    extra: <path d="M 76 66 q 18 6 6 18" fill="none" stroke="var(--cobalt)" strokeWidth="7" strokeLinecap="round" />,
  },
};

export function PetArt({ species, mood, size = 120, className = "" }: { species: Species; mood: Mood; size?: number; className?: string }) {
  const body = BODY[species];
  const f = FACE[mood];
  const eye = (cx: number) =>
    f.eye === "feliz" ? (
      <path d={`M ${cx - 5} 48 q 5 -7 10 0`} fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
    ) : f.eye === "dorme" ? (
      <path d={`M ${cx - 5} 48 q 5 6 10 0`} fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
    ) : (
      <>
        <circle cx={cx} cy={47} r="5" fill="var(--ink)" />
        <circle cx={cx + 1.8} cy={45.2} r="1.8" fill="#fff" />
      </>
    );
  return (
    <svg viewBox="-4 -10 108 104" width={size} height={size} className={className} role="img" aria-label={`Bichinho ${mood}`}>
      <ellipse cx="50" cy="88" rx="26" ry="5" fill="rgba(0,0,0,0.08)" />
      <g fill={body.fill}>{body.ears}</g>
      {body.extra}
      <circle cx="50" cy="52" r="32" fill={body.fill} />
      <ellipse cx="50" cy="62" rx="20" ry="17" fill="rgba(255,255,255,0.45)" />
      {eye(36)}
      {eye(64)}
      {f.blush && (
        <g fill="rgba(255,106,92,0.45)">
          <ellipse cx="28" cy="58" rx="6" ry="4" />
          <ellipse cx="72" cy="58" rx="6" ry="4" />
        </g>
      )}
      {f.tear && <path d="M 36 54 q 3 7 0 10 q -3 -3 0 -10" fill="var(--cobalt)" />}
      <path d={f.mouth} fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
