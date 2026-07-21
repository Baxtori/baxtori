type BotanicalUnfurlProps = {
  className?: string;
  growthStrokeClassName?: string;
  pinnaGrowthClassName?: string;
  stemGhostClassName?: string;
};

const RACHIS_PATH = "M 82 1492 C 218 1270 300 1084 390 860 C 468 665 486 525 590 382 C 708 220 842 170 912 106";
const VERTICAL_FROND_TRANSFORM = "rotate(-30.5 512 768)";

const PINNA_STAGES = [
  { anchor: [132, 1364], ellipse: [192, 1334, 210, 178, 24] },
  { anchor: [222, 1180], ellipse: [282, 1160, 326, 202, 17] },
  { anchor: [312, 990], ellipse: [352, 974, 388, 194, 8] },
  { anchor: [390, 810], ellipse: [408, 792, 370, 174, -2] },
  { anchor: [456, 642], ellipse: [470, 626, 336, 160, -7] },
  { anchor: [526, 486], ellipse: [544, 470, 306, 148, -12] },
  { anchor: [622, 326], ellipse: [646, 314, 300, 142, -17] },
  { anchor: [786, 190], ellipse: [770, 194, 274, 158, -24] },
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
        {PINNA_STAGES.map(({ ellipse }, index) => {
          const [cx, cy, rx, ry, rotation] = ellipse;
          return (
            <clipPath id={`fern-pinna-clip-${index}`} key={index} clipPathUnits="userSpaceOnUse">
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rotation} ${cx} ${cy})`} />
            </clipPath>
          );
        })}
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
          {PINNA_STAGES.map(({ anchor }, index) => {
            const [anchorX, anchorY] = anchor;
            return (
              <g key={index} transform={`translate(${anchorX} ${anchorY})`}>
                <g
                  className={pinnaGrowthClassName}
                  data-fern-pinna={index}
                  style={{
                    opacity: `var(--fern-stage-opacity-${index})`,
                    transform: `scale(var(--fern-stage-${index}))`,
                  }}
                >
                  <g
                    clipPath={`url(#fern-pinna-clip-${index})`}
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
