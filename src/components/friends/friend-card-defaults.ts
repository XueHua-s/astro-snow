/** Default color for friend cards without a configured color */
export const DEFAULT_COLOR = '#ffc0cb';

/**
 * Cute SVG avatar (pink theme) used when a friend has no avatar image.
 * Encoded as a data URI to avoid an extra network request.
 */
export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="100%" height="100%" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#ffc0cb"/>
  <circle cx="30" cy="45" r="6" fill="#fff"/>
  <circle cx="70" cy="45" r="6" fill="#fff"/>
  <path d="M 35 65 Q 50 75 65 65" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="20" cy="55" r="6" fill="#ff9eb5" opacity="0.5"/>
  <circle cx="80" cy="55" r="6" fill="#ff9eb5" opacity="0.5"/>
</svg>
`)}`;
