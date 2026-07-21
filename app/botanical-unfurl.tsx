type BotanicalUnfurlProps = {
  className?: string;
  growthStrokeClassName?: string;
};

const RACHIS_PATH = "M 82 1492 C 218 1270 300 1084 390 860 C 468 665 486 525 590 382 C 708 220 842 170 912 106";
const VERTICAL_FROND_TRANSFORM = "rotate(-30.5 512 768)";

export function BotanicalUnfurl({ className, growthStrokeClassName }: BotanicalUnfurlProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-botanical-plate
      preserveAspectRatio="xMidYMid meet"
      viewBox="-340 -170 1704 1876"
    >
      <defs>
        <mask id="fern-growth-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536">
          <rect fill="black" width="1024" height="1536" />
          <path
            className={growthStrokeClassName}
            d={RACHIS_PATH}
            fill="none"
            pathLength="1"
            stroke="white"
            strokeDasharray="1"
            strokeLinecap="butt"
            strokeWidth="1700"
          />
        </mask>
      </defs>
      <g transform="translate(1024 0) scale(-1 1)">
        <g transform={VERTICAL_FROND_TRANSFORM}>
          <image
            height="1536"
            href="/botanical/fern-frond.webp"
            mask="url(#fern-growth-mask)"
            preserveAspectRatio="xMidYMid meet"
            width="1024"
          />
        </g>
      </g>
    </svg>
  );
}
