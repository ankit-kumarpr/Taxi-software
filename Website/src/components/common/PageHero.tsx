import { Breadcrumbs, type Crumb } from "@/components/common/Breadcrumbs";
import { cn } from "@/lib/utils";

export function PageHero({
  title,
  description,
  crumbs,
  compact = false,
}: {
  title: string;
  description?: string;
  crumbs: Crumb[];
  /** Smaller title — better for long blog headings */
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "border-b border-border bg-gradient-to-b from-[#111827] to-[#0a0a0b]",
        compact ? "pt-24 pb-8 md:pt-28 md:pb-10" : "pt-28 pb-12 md:pt-32"
      )}
    >
      <div className="container-site w-full">
        <div className="w-full">
          <Breadcrumbs items={crumbs} />
        </div>
        <h1
          className={cn(
            "w-full font-bold tracking-tight text-white",
            compact
              ? "text-xl leading-snug md:text-2xl lg:text-[1.75rem]"
              : "max-w-3xl text-3xl md:text-4xl lg:text-5xl"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "mt-3 text-text-secondary",
              compact ? "max-w-4xl text-sm leading-6 md:text-[15px]" : "mt-4 max-w-2xl text-base md:text-lg"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
