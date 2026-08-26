import Image from "next/image";
import Link from "next/link";

/**
 * The "artist / character" browse tile — a name, a blurred art-preview
 * background, and a count. Shared by /discover's curated top-5 modules and
 * the full /artists and /characters index pages so the two don't drift.
 */
export function EntityTile({
  href,
  name,
  meta,
  imageUrl,
}: {
  href: string;
  name: string;
  meta: string;
  imageUrl?: string | null;
}) {
  return (
    <Link
      href={href}
      className="group relative block p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all overflow-hidden h-64 flex flex-col justify-between"
    >
      {imageUrl && (
        <div className="absolute inset-0 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700 pointer-events-none">
          <Image src={imageUrl} alt="" fill className="object-cover blur-md" />
        </div>
      )}

      <div className="relative z-10">
        <h4 className="text-2xl font-display font-bold group-hover:text-primary transition-colors">{name}</h4>
        <p className="text-sm font-mono text-foreground/50 mt-2">{meta}</p>
      </div>

      <div className="relative z-10 w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
        <span className="text-foreground/50 group-hover:text-foreground transition-colors">→</span>
      </div>
    </Link>
  );
}
