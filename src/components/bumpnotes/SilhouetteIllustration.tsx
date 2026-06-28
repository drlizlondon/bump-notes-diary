type Props = { className?: string };

/**
 * Soft, abstract pregnant silhouette. Deliberately non-specific:
 * no facial features, no skin tone, no hair texture, no ethnicity markers.
 */
export function SilhouetteIllustration({ className = "" }: Props) {
  return (
    <svg
      role="img"
      aria-label="Abstract silhouette illustration"
      viewBox="0 0 400 480"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bn-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9E4" />
          <stop offset="100%" stopColor="#FFF6F4" />
        </linearGradient>
        <linearGradient id="bn-fig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2A6A0" />
          <stop offset="100%" stopColor="#E07B74" />
        </linearGradient>
      </defs>

      {/* Soft circular backdrop */}
      <circle cx="200" cy="230" r="195" fill="url(#bn-bg)" />

      {/* Figure — single continuous abstract silhouette */}
      <g fill="url(#bn-fig)">
        {/* Head */}
        <circle cx="205" cy="92" r="34" />
        {/* Neck + body + bump as one flowing path */}
        <path d="
          M188,124
          C186,140 184,152 182,162
          C160,170 144,188 140,214
          C136,240 148,268 172,288
          C188,302 204,322 208,348
          C212,376 206,408 198,440
          L260,440
          C262,408 264,376 268,348
          C272,320 286,300 296,278
          C310,248 308,210 286,186
          C272,170 254,162 236,158
          C230,148 226,138 224,124
          Z
        " />
        {/* Subtle arm hint resting on bump */}
        <path
          d="M158,210 C168,224 188,236 214,238 C200,248 178,246 160,236 C150,230 150,218 158,210 Z"
          fill="#D86E66"
          opacity="0.55"
        />
      </g>
    </svg>
  );
}
