/**
 * Original miniature line-art. Ink strokes, grey fills, and one accent detail each.
 * All drawings are decorative and hidden from assistive technology.
 */
import { cn } from "@/lib/utils";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ACCENT = "var(--color-accent)";

type ArtProps = { className?: string; size?: number };

export function BulbArt({ className, size = 72 }: ArtProps) {
  return (
    <svg aria-hidden viewBox="0 0 72 72" width={size} height={size} className={cn("text-ink", className)}>
      <path {...S} d="M36 12c-9 0-16 7-16 15.5 0 6 3.2 9.6 6 12.5 1.8 1.9 3 3.8 3 6.5V50h14v-3.5c0-2.7 1.2-4.6 3-6.5 2.8-2.9 6-6.5 6-12.5C52 19 45 12 36 12Z" />
      <path {...S} d="M30 55h12M31.5 59.5h9" />
      <path {...S} d="M32 46c0-6 4-8 4-13m0 0c0 5 4 7 4 13" strokeWidth={1.1} />
      <path {...S} d="M12 26h-5M65 26h-5M16 10l3.5 3.5M56 10l-3.5 3.5M36 3v4" strokeWidth={1.1} />
      <circle cx="36" cy="31" r="2.2" fill={ACCENT} />
    </svg>
  );
}

export function LensArt({ className, size = 72 }: ArtProps) {
  return (
    <svg aria-hidden viewBox="0 0 72 72" width={size} height={size} className={cn("text-ink", className)}>
      <rect x="8" y="14" width="34" height="42" rx="2" fill="var(--color-surface)" stroke="currentColor" strokeWidth={1.2} />
      <path {...S} d="M14 24h22M14 30h18M14 36h20M14 42h12" strokeWidth={1} stroke="var(--color-mute)" />
      <circle {...S} cx="44" cy="40" r="11" fill="var(--color-paper)" />
      <path {...S} d="M52 48l10 10" strokeWidth={2.4} />
      <path {...S} d="M38 43l4-5 3 3 5-6" strokeWidth={1.2} />
      <circle cx="50" cy="35" r="1.8" fill={ACCENT} />
    </svg>
  );
}

export function NetworkArt({ className, size = 72 }: ArtProps) {
  const nodes = [
    [14, 20], [36, 12], [58, 22], [22, 46], [48, 44], [36, 60],
  ];
  return (
    <svg aria-hidden viewBox="0 0 72 72" width={size} height={size} className={cn("text-ink", className)}>
      <path {...S} strokeWidth={1} stroke="var(--color-line-strong)" d="M14 20 36 12 58 22 48 44 36 60 22 46 14 20M36 12 22 46M36 12 48 44M22 46 48 44" />
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 4 ? 4 : 3.2} fill={i === 4 ? ACCENT : "var(--color-paper)"} stroke={i === 4 ? "none" : "currentColor"} strokeWidth={1.4} />
      ))}
    </svg>
  );
}

export function BlueprintArt({ className, size = 72 }: ArtProps) {
  return (
    <svg aria-hidden viewBox="0 0 72 72" width={size} height={size} className={cn("text-ink", className)}>
      <rect x="8" y="10" width="56" height="52" rx="2" className="hatch" fill="var(--color-surface)" stroke="currentColor" strokeWidth={1.2} />
      <path {...S} d="M18 48V28l12-8 12 8v20H18Z" fill="var(--color-paper)" />
      <path {...S} d="M26 48v-9h8v9" />
      <path {...S} strokeWidth={1} stroke="var(--color-mute)" d="M48 20v28M46 20h4M46 48h4M18 54h24M18 52v4M42 52v4" />
      <circle cx="30" cy="31" r="2" fill={ACCENT} />
    </svg>
  );
}

export function CompassArt({ className, size = 72 }: ArtProps) {
  return (
    <svg aria-hidden viewBox="0 0 72 72" width={size} height={size} className={cn("text-ink", className)}>
      <circle {...S} cx="36" cy="36" r="24" />
      <circle {...S} cx="36" cy="36" r="18" strokeWidth={0.9} stroke="var(--color-line-strong)" />
      <path {...S} d="M36 8v6M36 58v6M8 36h6M58 36h6" strokeWidth={1.1} />
      <path d="M36 36 46 22l-4 16Z" fill={ACCENT} />
      <path d="M36 36 26 50l4-16Z" fill="currentColor" />
    </svg>
  );
}

export function FlaskArt({ className, size = 72 }: ArtProps) {
  return (
    <svg aria-hidden viewBox="0 0 72 72" width={size} height={size} className={cn("text-ink", className)}>
      <path {...S} d="M29 10h14M31 10v16L16 54a5 5 0 0 0 4.4 7.4h31.2A5 5 0 0 0 56 54L41 26V10" />
      <path d="M22.5 46h27l4.3 8.5a2.4 2.4 0 0 1-2.2 3.4H20.4a2.4 2.4 0 0 1-2.2-3.4Z" fill="var(--color-sunken)" />
      <circle cx="31" cy="51" r="2" fill="var(--color-paper)" stroke="currentColor" strokeWidth={1} />
      <circle cx="40" cy="53" r="1.6" fill={ACCENT} />
      <path {...S} strokeWidth={1} d="M35 40c1.5-2 4-2 5.5 0" stroke="var(--color-mute)" />
    </svg>
  );
}

export function PathArt({ className, size = 72 }: ArtProps) {
  return (
    <svg aria-hidden viewBox="0 0 72 72" width={size} height={size} className={cn("text-ink", className)}>
      <path {...S} strokeDasharray="2 4" d="M10 58c10 0 12-12 22-12s10-18 20-18 6-14 12-14" />
      <rect x="6" y="54" width="8" height="8" rx="1" fill="currentColor" />
      <circle cx="32" cy="46" r="3" fill="var(--color-paper)" stroke="currentColor" strokeWidth={1.4} />
      <circle cx="52" cy="28" r="3" fill="var(--color-paper)" stroke="currentColor" strokeWidth={1.4} />
      <path d="M62 8v12" stroke="currentColor" strokeWidth={1.4} />
      <path d="M62 8h8l-2.5 3 2.5 3h-8Z" fill={ACCENT} />
    </svg>
  );
}

/** Wide hero drawing for the welcome screen: a field of problem markers converging into a single build. */
export function ConstellationArt({ className }: { className?: string }) {
  const pts = [
    [40, 60], [90, 30], [130, 90], [70, 130], [180, 50], [210, 120], [150, 160], [100, 200], [240, 190], [270, 70], [300, 150],
  ];
  return (
    <svg aria-hidden viewBox="0 0 340 240" className={cn("text-ink", className)}>
      <g stroke="var(--color-line-strong)" strokeWidth="0.8">
        {pts.map(([x, y], i) => (
          <line key={i} x1={x} y1={y} x2={300} y2={150} />
        ))}
      </g>
      {pts.map(([x, y], i) =>
        i === pts.length - 1 ? null : <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3.4 : 2.4} fill="var(--color-paper)" stroke="currentColor" strokeWidth="1.2" />,
      )}
      <circle cx="300" cy="150" r="14" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="300" cy="150" r="5" fill="var(--color-accent)" />
    </svg>
  );
}
