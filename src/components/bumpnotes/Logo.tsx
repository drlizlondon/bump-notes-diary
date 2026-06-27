import iconAsset from "@/assets/bumpnotes-icon.png.asset.json";
import wordmarkAsset from "@/assets/bumpnotes-wordmark.png.asset.json";

type Props = { className?: string; alt?: string };

export function LogoIcon({ className = "size-8", alt = "BumpNotes" }: Props) {
  return <img src={iconAsset.url} alt={alt} className={className} draggable={false} />;
}

export function LogoWordmark({ className = "h-16", alt = "BumpNotes" }: Props) {
  return <img src={wordmarkAsset.url} alt={alt} className={className} draggable={false} />;
}
