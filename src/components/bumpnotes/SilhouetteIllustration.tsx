type Props = { className?: string };

/**
 * Elegant continuous line-art silhouette of a pregnant figure.
 * Deliberately inclusive: no facial features beyond a suggested profile,
 * abstract hair shape, no jewellery, makeup, clothing detail or fingers.
 * Designed to sit BEHIND the Pregnancy Summary card as a calm backdrop.
 */
export function SilhouetteIllustration({ className = "" }: Props) {
  return (
    <svg
      role="img"
      aria-label="Soft silhouette of a pregnant figure"
      viewBox="0 0 600 760"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bn-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7D7D1" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F0B7AE" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="bn-halo" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#FCE6E1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FCE6E1" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft halo */}
      <ellipse cx="310" cy="360" rx="270" ry="320" fill="url(#bn-halo)" />

      {/* Body silhouette — single flowing form, soft blush fill */}
      <path
        d="
          M298,70
          C246,70 210,108 210,156
          C210,184 222,206 240,220
          C232,232 226,246 222,262
          C214,290 200,308 178,330
          C150,358 134,398 140,446
          C146,498 184,536 232,556
          C262,568 286,586 298,614
          C308,640 308,676 300,712
          L420,712
          C420,672 424,636 432,604
          C440,572 456,548 470,520
          C492,476 494,422 472,378
          C452,338 416,310 378,300
          C374,282 372,264 374,246
          C384,232 390,212 390,190
          C390,152 376,118 350,96
          C336,82 318,72 298,70
          Z
        "
        fill="url(#bn-fill)"
      />

      {/* Suggested profile line — outline only, no features */}
      <path
        d="
          M362,118
          C376,134 384,156 384,180
          C384,200 378,218 368,232
          C376,248 380,266 378,284
        "
        fill="none"
        stroke="#C97A72"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Abstract hair shape — soft loose form, intentionally non-specific */}
      <path
        d="
          M298,68
          C254,68 218,98 210,142
          C206,160 212,176 222,188
          C214,168 218,144 234,128
          C252,110 280,102 308,104
          C336,106 358,118 372,138
          C366,114 346,90 318,76
          C312,72 304,70 298,68
          Z
        "
        fill="#E9A89F"
        fillOpacity="0.55"
      />

      {/* Bump highlight — soft inner curve, no fingers */}
      <path
        d="
          M180,400
          C200,452 256,478 308,476
          C260,488 200,470 176,432
          C170,422 170,410 180,400
          Z
        "
        fill="#D88A82"
        fillOpacity="0.25"
      />

      {/* Shoulder line — single elegant stroke */}
      <path
        d="M256,228 C292,236 332,238 374,236"
        fill="none"
        stroke="#C97A72"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
