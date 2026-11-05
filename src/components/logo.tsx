import * as React from "react";

/**
 * Spexgram's mark: an aperture of six blades in a rounded square, in the application's rose-to-amber gradient, with a
 * spotlight in the corner for the stage. Decorative; the name beside it is the text.
 */
export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`block h-full w-full ${props.className ?? ""}`}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id="spexgram-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e11d74" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#spexgram-mark)" />
      <circle cx="32" cy="34" r="18" fill="none" stroke="#fff" strokeWidth="4.5" />
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <path d="M32 16 L38 28" />
        <path d="M47.6 25 L38 34" />
        <path d="M47.6 43 L32 40" />
        <path d="M32 52 L26 40" />
        <path d="M16.4 43 L26 34" />
        <path d="M16.4 25 L32 28" />
      </g>
      <circle cx="50" cy="13" r="4" fill="#fff" />
    </svg>
  );
}
