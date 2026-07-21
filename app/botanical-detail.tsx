import styles from "./trail-reader.module.css";

const PLATE_NUMBERS = ["I", "II", "III", "IV"];

export function BotanicalDetail({ stage }: { stage: number }) {
  const specimen = stage % 4;

  return (
    <figure aria-hidden="true" className={styles.botanicalDetail} data-botanical-detail data-specimen={specimen}>
      <svg role="presentation" viewBox="0 0 220 320">
        {specimen === 0 && (
          <g>
            <path d="M102 306 C101 230 119 162 167 81" />
            <path d="M115 225 C83 185 55 158 26 147" />
            <path d="M127 183 C155 142 174 117 202 106" />
            <path d="M145 126 C126 95 105 78 83 70" />
            <path className={styles.specimenLeaf} d="M26 147 C35 118 69 117 79 145 C62 164 41 163 26 147 Z" />
            <path className={styles.specimenLeaf} d="M202 106 C187 78 155 82 150 111 C169 126 188 121 202 106 Z" />
            <path className={styles.specimenLeaf} d="M83 70 C94 40 126 40 138 67 C124 88 101 88 83 70 Z" />
            <circle cx="166" cy="81" r="16" />
          </g>
        )}
        {specimen === 1 && (
          <g>
            <path d="M110 310 C102 230 111 151 105 40" />
            {[75, 111, 149, 188, 228].map((y, index) => (
              <g key={y}>
                <path d={`M${101 + index} ${y} L${118 - index} ${y}`} />
                <path d={`M109 ${y} L${38 + index * 3} ${y - 28}`} />
                <path d={`M110 ${y} L${184 - index * 3} ${y - 24}`} />
                <path d={`M108 ${y} L${57 + index * 2} ${y + 17}`} />
                <path d={`M111 ${y} L${163 - index * 2} ${y + 19}`} />
              </g>
            ))}
            <path className={styles.specimenLeaf} d="M105 40 C91 29 95 12 109 6 C125 17 122 34 105 40 Z" />
          </g>
        )}
        {specimen === 2 && (
          <g>
            <path d="M91 309 C83 245 93 175 129 67" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
              const y = 250 - index * 23;
              const x = 91 + index * 5;
              const reach = 54 - index * 3;
              return (
                <g key={index}>
                  <path d={`M${x} ${y} C${x - 16} ${y - 7} ${x - reach} ${y - 10} ${x - reach - 8} ${y - 2}`} />
                  <path className={styles.specimenLeaf} d={`M${x - 13} ${y - 5} C${x - 28} ${y - 31} ${x - reach - 12} ${y - 25} ${x - reach - 8} ${y - 2} C${x - 36} ${y + 6} ${x - 22} ${y + 4} ${x - 13} ${y - 5} Z`} />
                  <path d={`M${x + 1} ${y - 8} C${x + 18} ${y - 19} ${x + reach} ${y - 24} ${x + reach + 8} ${y - 16}`} />
                  <path className={styles.specimenLeaf} d={`M${x + 16} ${y - 16} C${x + 24} ${y - 42} ${x + reach + 16} ${y - 39} ${x + reach + 8} ${y - 16} C${x + 36} ${y - 7} ${x + 23} ${y - 7} ${x + 16} ${y - 16} Z`} />
                </g>
              );
            })}
          </g>
        )}
        {specimen === 3 && (
          <g>
            <path d="M105 310 C105 239 112 182 117 119" />
            <path d="M116 147 C75 122 49 91 32 57" />
            <path d="M116 154 C151 125 177 95 187 60" />
            <path d="M115 126 C109 94 107 62 113 27" />
            <path className={styles.specimenLeaf} d="M32 57 C20 26 51 11 74 35 C73 64 51 73 32 57 Z" />
            <path className={styles.specimenLeaf} d="M187 60 C202 31 174 11 149 33 C146 60 166 75 187 60 Z" />
            <path className={styles.specimenLeaf} d="M113 27 C92 4 116 -15 140 4 C142 28 128 39 113 27 Z" />
            <circle cx="32" cy="57" r="4" />
            <circle cx="187" cy="60" r="4" />
            <circle cx="113" cy="27" r="4" />
          </g>
        )}
      </svg>
      <figcaption>{PLATE_NUMBERS[specimen]}</figcaption>
    </figure>
  );
}
