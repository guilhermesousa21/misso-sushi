export const BREAKPOINTS = {
  mobile: 767,
  tablet: 1023,
} as const;

export const MQ = {
  mobile: `(max-width: ${BREAKPOINTS.mobile}px)`,
  tablet: `(max-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `(min-width: ${BREAKPOINTS.tablet + 1}px)`,
} as const;
