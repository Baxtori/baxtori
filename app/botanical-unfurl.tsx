type BotanicalUnfurlProps = {
  className?: string;
  growthStrokeClassName?: string;
  pinnaGrowthClassName?: string;
  stemGhostClassName?: string;
};

const RACHIS_PATH = "M 82 1492 C 218 1270 300 1084 390 860 C 468 665 486 525 590 382 C 708 220 842 170 912 106";
const VERTICAL_FROND_TRANSFORM = "rotate(-30.5 512 768)";

const PINNA_BRANCHLETS = [
  { id: "lower-bud", anchor: [144, 1360], path: "M 150 1360 C 208 1370 274 1398 346 1434", width: 132 },
  { id: "lower-left", anchor: [218, 1174], path: "M 230 1170 C 164 1138 94 1070 28 1004", width: 194 },
  { id: "lower-right", anchor: [226, 1178], path: "M 236 1180 C 360 1200 520 1255 704 1334", width: 202 },
  { id: "low-mid-left", anchor: [296, 986], path: "M 305 984 C 236 966 132 928 44 884", width: 182 },
  { id: "low-mid-right", anchor: [304, 990], path: "M 316 990 C 438 1004 586 1050 734 1120", width: 184 },
  { id: "middle-left", anchor: [366, 824], path: "M 376 820 C 292 792 190 742 94 680", width: 172 },
  { id: "middle-right", anchor: [374, 826], path: "M 386 824 C 500 830 624 854 748 892", width: 172 },
  { id: "middle-high-left", anchor: [428, 678], path: "M 438 674 C 350 648 252 600 146 536", width: 162 },
  { id: "middle-high-right", anchor: [436, 680], path: "M 448 678 C 548 682 654 706 756 742", width: 158 },
  { id: "upper-low-left", anchor: [486, 548], path: "M 496 544 C 414 516 324 466 216 396", width: 150 },
  { id: "upper-low-right", anchor: [494, 550], path: "M 506 548 C 598 556 688 578 770 614", width: 146 },
  { id: "upper-left", anchor: [548, 426], path: "M 558 422 C 486 390 408 338 316 266", width: 140 },
  { id: "upper-right", anchor: [556, 428], path: "M 568 426 C 650 434 730 454 806 486", width: 136 },
  { id: "crown-left", anchor: [622, 322], path: "M 632 316 C 574 280 518 218 468 132", width: 130 },
  { id: "crown-right", anchor: [632, 324], path: "M 644 320 C 726 326 810 346 892 386", width: 128 },
  { id: "crozier", anchor: [700, 250], path: "M 688 278 C 746 176 840 96 920 104 C 958 108 964 188 916 278", width: 138 },
] as const;

export function BotanicalUnfurl({
  className,
  growthStrokeClassName,
  pinnaGrowthClassName,
  stemGhostClassName,
}: BotanicalUnfurlProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-botanical-plate
      preserveAspectRatio="xMidYMid meet"
      viewBox="-340 -170 1704 1876"
    >
      <defs>
        <filter id="fern-alpha-clean" colorInterpolationFilters="sRGB" x="-8%" y="-8%" width="116%" height="116%">
          <feColorMatrix
            in="SourceGraphic"
            result="fern-luminance"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.24 0.68 0.08 0 0"
          />
          <feComponentTransfer in="fern-luminance" result="fern-alpha">
            <feFuncA type="linear" slope="3.8" intercept="-0.72" />
          </feComponentTransfer>
          <feFlood floodColor="#315f46" result="fern-ink" />
          <feComposite in="fern-ink" in2="fern-alpha" operator="in" />
        </filter>
        <filter id="fern-mask-feather" colorInterpolationFilters="sRGB" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        {PINNA_BRANCHLETS.map(({ id, path, width }) => (
          <mask
            id={`fern-branchlet-mask-${id}`}
            key={id}
            maskUnits="userSpaceOnUse"
            x="-120"
            y="-120"
            width="1264"
            height="1776"
          >
            <path
              d={path}
              fill="none"
              filter="url(#fern-mask-feather)"
              opacity="0.72"
              stroke="white"
              strokeLinecap="round"
              strokeWidth={width + 38}
            />
            <path
              d={path}
              fill="none"
              stroke="white"
              strokeLinecap="round"
              strokeWidth={width}
            />
          </mask>
        ))}
      </defs>
      <g transform="translate(1024 0) scale(-1 1)">
        <g transform={VERTICAL_FROND_TRANSFORM}>
          <path
            className={stemGhostClassName}
            d={RACHIS_PATH}
            fill="none"
            stroke="#315f46"
            strokeLinecap="round"
            strokeWidth="7"
          />
          <path
            className={growthStrokeClassName}
            d={RACHIS_PATH}
            fill="none"
            pathLength="1"
            stroke="#315f46"
            strokeDasharray="1"
            strokeLinecap="round"
            strokeWidth="9"
          />
          {PINNA_BRANCHLETS.map(({ anchor, id }, index) => {
            const [anchorX, anchorY] = anchor;
            return (
              <g key={id} transform={`translate(${anchorX} ${anchorY})`}>
                <g
                  className={pinnaGrowthClassName}
                  data-fern-branchlet={id}
                  data-fern-pinna={index}
                  style={{
                    opacity: `var(--fern-stage-opacity-${index})`,
                    transform: `scale(var(--fern-stage-${index}))`,
                  }}
                >
                  <g
                    mask={`url(#fern-branchlet-mask-${id})`}
                    transform={`translate(${-anchorX} ${-anchorY})`}
                  >
                    <image
                      filter="url(#fern-alpha-clean)"
                      height="1536"
                      href="/botanical/fern-frond.webp"
                      preserveAspectRatio="xMidYMid meet"
                      width="1024"
                    />
                  </g>
                </g>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
