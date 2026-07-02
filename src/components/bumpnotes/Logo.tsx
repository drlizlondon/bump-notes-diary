const ICON_URL = "/bumpnotes-icon.png";
const WORDMARK_URL = "/bumpnotes-wordmark.png";

type Props = { className?: string; alt?: string };

export function LogoIcon({ className = "size-8", alt = "BumpNotes" }: Props) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full overflow-hidden ${className}`}>
      <img
        src={ICON_URL}
        alt={alt}
        className="size-full object-cover scale-110"
        draggable={false}
      />
    </span>
  );
}


export function LogoWordmark({ className = "h-16", alt = "BumpNotes" }: Props) {
  return <img src={WORDMARK_URL} alt={alt} className={className} draggable={false} />;
}

/** Circular badge presentation of the icon — used on landing hero. */
export function LogoBadge({ className = "size-24", alt = "BumpNotes" }: Props) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full bg-white overflow-hidden ring-1 ring-border shadow-[0_8px_30px_-12px_rgba(190,90,90,0.35)] ${className}`}
    >
      <img
        src={ICON_URL}
        alt={alt}
        className="size-full object-cover scale-110"
        draggable={false}
      />
    </span>
  );
}
