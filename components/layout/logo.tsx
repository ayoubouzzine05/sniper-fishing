/**
 * Original Sniper Fishing logo mark: a fish inside a surveyor's sight,
 * deep navy + ocean teal + silver. (No third-party artwork or trademarks.)
 */
export default function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sf-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b1b2d" />
          <stop offset="100%" stopColor="#123a53" />
        </linearGradient>
        <linearGradient id="sf-fish" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#40c6bd" />
          <stop offset="100%" stopColor="#1b8b88" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="496" height="496" rx="104" fill="url(#sf-bg)" />
      {/* sight ring */}
      <circle cx="256" cy="256" r="168" fill="none" stroke="#c2ccd4" strokeWidth="14" opacity="0.85" />
      {/* cardinal ticks */}
      <g stroke="#c2ccd4" strokeWidth="14" strokeLinecap="round" opacity="0.85">
        <line x1="256" y1="56" x2="256" y2="96" />
        <line x1="256" y1="416" x2="256" y2="456" />
        <line x1="56" y1="256" x2="96" y2="256" />
        <line x1="416" y1="256" x2="456" y2="256" />
      </g>
      {/* fish */}
      <g>
        <path
          d="M 148 262 C 186 208, 268 186, 330 220 C 356 234, 376 250, 392 262 C 376 274, 356 290, 330 304 C 268 338, 186 316, 148 262 Z"
          fill="url(#sf-fish)"
        />
        <path d="M 152 262 L 100 222 L 122 262 L 100 302 Z" fill="url(#sf-fish)" />
        <circle cx="340" cy="248" r="11" fill="#f2f6fb" />
        <circle cx="343" cy="248" r="5" fill="#0b1b2d" />
        <path
          d="M 232 212 C 252 186, 284 180, 306 190 C 288 198, 268 206, 250 218 Z"
          fill="#79dfd4"
          opacity="0.9"
        />
      </g>
      {/* waves */}
      <g fill="none" stroke="#79dfd4" strokeWidth="10" strokeLinecap="round" opacity="0.7">
        <path d="M 156 348 q 24 -16 48 0 t 48 0 t 48 0 t 48 0" />
        <path d="M 176 380 q 24 -14 48 0 t 48 0 t 48 0" />
      </g>
    </svg>
  );
}
