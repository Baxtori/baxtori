type BotanicalIllustrationProps = {
  className?: string;
  progressMarker?: boolean;
  variant: "fiddlehead" | "fragment" | "frond";
};

type Pinna = {
  angle: number;
  length: number;
  lobes: number;
  side: -1 | 1;
  width: number;
  x: number;
  y: number;
};

const PINNAE: Pinna[] = [
  { angle: 14, length: 164, lobes: 9, side: -1, width: 42, x: 321, y: 930 },
  { angle: -18, length: 206, lobes: 11, side: 1, width: 50, x: 321, y: 920 },
  { angle: 11, length: 224, lobes: 12, side: -1, width: 54, x: 314, y: 846 },
  { angle: -15, length: 244, lobes: 13, side: 1, width: 57, x: 314, y: 831 },
  { angle: 8, length: 252, lobes: 14, side: -1, width: 60, x: 307, y: 758 },
  { angle: -13, length: 263, lobes: 14, side: 1, width: 61, x: 307, y: 742 },
  { angle: 6, length: 268, lobes: 15, side: -1, width: 62, x: 301, y: 671 },
  { angle: -10, length: 257, lobes: 14, side: 1, width: 60, x: 301, y: 654 },
  { angle: 4, length: 249, lobes: 14, side: -1, width: 59, x: 297, y: 585 },
  { angle: -8, length: 238, lobes: 13, side: 1, width: 56, x: 297, y: 568 },
  { angle: 2, length: 222, lobes: 12, side: -1, width: 53, x: 294, y: 503 },
  { angle: -7, length: 211, lobes: 12, side: 1, width: 50, x: 294, y: 486 },
  { angle: 0, length: 190, lobes: 11, side: -1, width: 47, x: 292, y: 426 },
  { angle: -6, length: 180, lobes: 10, side: 1, width: 43, x: 292, y: 410 },
  { angle: -2, length: 155, lobes: 9, side: -1, width: 39, x: 291, y: 352 },
  { angle: -5, length: 145, lobes: 9, side: 1, width: 36, x: 291, y: 336 },
  { angle: -4, length: 118, lobes: 8, side: -1, width: 31, x: 292, y: 281 },
  { angle: -4, length: 108, lobes: 7, side: 1, width: 28, x: 292, y: 267 },
  { angle: -8, length: 82, lobes: 6, side: -1, width: 24, x: 295, y: 217 },
  { angle: -2, length: 72, lobes: 5, side: 1, width: 21, x: 295, y: 205 },
  { angle: -11, length: 50, lobes: 4, side: -1, width: 17, x: 298, y: 162 },
  { angle: 0, length: 43, lobes: 4, side: 1, width: 15, x: 298, y: 152 },
];

function PinnaShape({ angle, length, lobes, side, width, x, y }: Pinna) {
  const pinnules = Array.from({ length: Math.max(3, lobes - 1) }, (_, index) => {
    const progress = (index + 0.45) / lobes;
    const height = width * (0.52 + Math.sin(Math.PI * progress) * 0.52);
    const breadth = Math.max(5, (length / lobes) * (0.64 + ((index + lobes) % 3) * 0.055));
    const lean = index % 2 === 0 ? 0.48 : 0.34;
    const leaf = `M -${(breadth * 0.16).toFixed(1)} 1.5 C ${(breadth * 0.02).toFixed(1)} ${(-height * 0.2).toFixed(1)} ${(breadth * lean).toFixed(1)} ${(-height * 0.78).toFixed(1)} ${(breadth * 0.64).toFixed(1)} ${(-height).toFixed(1)} C ${(breadth * 1.06).toFixed(1)} ${(-height * 0.68).toFixed(1)} ${(breadth * 0.88).toFixed(1)} ${(-height * 0.12).toFixed(1)} -${(breadth * 0.16).toFixed(1)} 1.5 Z`;
    const position = progress * length * 0.92;
    return { leaf, position, rotation: ((index * 11 + lobes) % 7) - 3 };
  });

  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${side} 1)`}>
      <path d={`M 0 0 Q ${length * 0.56} ${lobes % 2 === 0 ? -2 : 2} ${length} 0`} fill="none" opacity="0.58" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      {pinnules.map((pinnule, index) => (
        <g key={pinnule.position} transform={`translate(${pinnule.position} 0) rotate(${pinnule.rotation})`}>
          <path d={pinnule.leaf} opacity={0.62 + (index % 4) * 0.07} />
          <path d={pinnule.leaf} opacity={0.54 + ((index + 2) % 4) * 0.065} transform="scale(1 -1) rotate(3)" />
        </g>
      ))}
      <path d={`M ${length * 0.86} 1 C ${length * 0.91} ${-width * 0.28} ${length * 0.97} ${-width * 0.18} ${length} 0 C ${length * 0.97} ${width * 0.16} ${length * 0.91} ${width * 0.25} ${length * 0.86} 1 Z`} opacity="0.72" />
    </g>
  );
}

function FernFrond({ className }: Omit<BotanicalIllustrationProps, "variant">) {
  return (
    <svg aria-hidden="true" className={className} data-botanical-plate viewBox="0 0 620 1080">
      <g className="fern-pinnae">
        {PINNAE.map((pinna, index) => (
          <PinnaShape {...pinna} key={`${pinna.side}-${pinna.y}-${index}`} />
        ))}
      </g>
      <path d="M 349 1072 C 333 928 305 842 301 694 C 296 521 288 347 302 108" fill="none" opacity="0.72" stroke="currentColor" strokeLinecap="round" strokeWidth="8" />
      <path d="M 302 108 C 302 86 306 65 315 44 C 300 51 290 63 284 78 C 278 93 282 109 292 117" fill="none" opacity="0.72" stroke="currentColor" strokeLinecap="round" strokeWidth="5" />
    </svg>
  );
}

function Fiddlehead({ className, progressMarker = false }: Omit<BotanicalIllustrationProps, "variant">) {
  return (
    <svg aria-hidden="true" className={className} data-botanical-bloom={progressMarker || undefined} viewBox="0 0 480 700">
      <path d="M 126 706 C 120 590 138 486 199 407 C 241 352 304 323 350 280 C 399 234 410 163 376 114 C 344 67 279 54 233 85 C 194 111 181 163 201 202 C 218 235 260 252 293 237 C 320 225 333 191 320 165 C 309 144 283 136 263 147 C 249 155 243 173 249 188" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="15" />
      <path d="M 159 557 C 205 537 244 505 274 463" fill="none" opacity="0.66" stroke="currentColor" strokeLinecap="round" strokeWidth="7" />
      <path d="M 175 516 C 139 496 112 469 94 436 C 135 437 170 448 201 473" opacity="0.72" />
      <path d="M 216 463 C 189 430 174 396 171 357 C 208 371 238 390 259 420" opacity="0.62" />
      <path d="M 280 398 C 267 363 267 330 278 300 C 305 324 322 349 329 377" opacity="0.54" />
    </svg>
  );
}

function FernFragment({ className }: Omit<BotanicalIllustrationProps, "variant">) {
  const fragmentPinnae: Pinna[] = [
    { angle: 7, length: 142, lobes: 8, side: -1, width: 38, x: 248, y: 370 },
    { angle: -8, length: 162, lobes: 9, side: 1, width: 41, x: 248, y: 356 },
    { angle: 5, length: 174, lobes: 10, side: -1, width: 44, x: 267, y: 294 },
    { angle: -7, length: 186, lobes: 10, side: 1, width: 46, x: 267, y: 279 },
    { angle: 2, length: 160, lobes: 9, side: -1, width: 41, x: 289, y: 220 },
    { angle: -5, length: 154, lobes: 9, side: 1, width: 39, x: 289, y: 205 },
    { angle: -2, length: 118, lobes: 7, side: -1, width: 32, x: 316, y: 151 },
    { angle: -4, length: 104, lobes: 7, side: 1, width: 29, x: 316, y: 138 },
  ];

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 520 420">
      <g opacity="0.72">
        {fragmentPinnae.map((pinna) => (
          <PinnaShape {...pinna} key={`${pinna.side}-${pinna.y}`} />
        ))}
      </g>
      <path d="M 218 438 C 244 355 265 289 289 220 C 308 167 331 112 367 52" fill="none" opacity="0.72" stroke="currentColor" strokeLinecap="round" strokeWidth="7" />
      <path d="M 367 52 C 377 36 389 24 403 17 C 397 33 386 47 370 59" fill="none" opacity="0.72" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

export function BotanicalIllustration({ className, progressMarker, variant }: BotanicalIllustrationProps) {
  if (variant === "frond") return <FernFrond className={className} />;
  if (variant === "fragment") return <FernFragment className={className} />;
  return <Fiddlehead className={className} progressMarker={progressMarker} />;
}
