import * as React from "react";

/**
 * The wordmark "Spexgram", in the text colour with the "gram" in the application's colour.
 */
export function LogoText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 168 40" role="img" aria-label="Spexgram" {...props}>
      <text x="0" y="29" fontFamily="var(--font-geist-sans), system-ui, sans-serif" fontSize="30" fontWeight="700"
            letterSpacing="-0.5">
        <tspan fill="currentColor">Spex</tspan>
        <tspan className="fill-primary">gram</tspan>
      </text>
    </svg>
  );
}
