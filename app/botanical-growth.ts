export const BRANCHLET_GROWTH = [
  { minimum: 0.38, openingOpacity: 0.66, start: 0 },
  { minimum: 0.32, openingOpacity: 0.22, start: 0.045 },
  { minimum: 0.3, openingOpacity: 0.16, start: 0.075 },
  { minimum: 0.27, openingOpacity: 0, start: 0.12 },
  { minimum: 0.26, openingOpacity: 0, start: 0.155 },
  { minimum: 0.23, openingOpacity: 0, start: 0.205 },
  { minimum: 0.22, openingOpacity: 0, start: 0.245 },
  { minimum: 0.2, openingOpacity: 0, start: 0.3 },
  { minimum: 0.19, openingOpacity: 0, start: 0.34 },
  { minimum: 0.17, openingOpacity: 0, start: 0.4 },
  { minimum: 0.16, openingOpacity: 0, start: 0.445 },
  { minimum: 0.14, openingOpacity: 0, start: 0.515 },
  { minimum: 0.13, openingOpacity: 0, start: 0.56 },
  { minimum: 0.11, openingOpacity: 0, start: 0.64 },
  { minimum: 0.1, openingOpacity: 0, start: 0.69 },
  { minimum: 0.08, openingOpacity: 0, start: 0.74 },
] as const;

export const BRANCHLET_REVEAL_DURATION = 0.22;

// Finish before the literal final scroll pixel. Mobile browsers can reserve
// scroll range for collapsing chrome, otherwise leaving the crown half-furled.
export const FERN_COMPLETION_PROGRESS = 0.82;
