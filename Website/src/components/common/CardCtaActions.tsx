"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { EnquiryModal } from "@/components/common/EnquiryModal";
import { cn } from "@/lib/utils";

type CardCtaActionsProps = {
  learnMoreHref: string;
  learnMoreLabel?: string;
  bookLabel?: string;
  contextLabel?: string;
  className?: string;
  compact?: boolean;
  fullWidth?: boolean;
};

export function CardCtaActions({
  learnMoreHref,
  learnMoreLabel = "Learn more",
  bookLabel = "Book Now",
  contextLabel,
  className,
  compact = false,
  fullWidth = false,
}: CardCtaActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "mt-5 flex flex-nowrap items-center gap-2",
          fullWidth && "w-full",
          className
        )}
      >
        <Link
          href={learnMoreHref}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border border-white/15 bg-white/5 font-semibold text-white transition hover:border-orange/50 hover:bg-orange/10 hover:text-orange",
            compact ? "rounded-lg px-3 py-2 text-xs" : "rounded-xl px-3.5 py-2.5 text-sm",
            fullWidth && "flex-1"
          )}
        >
          <span>{learnMoreLabel}</span>
          <ArrowRight className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center whitespace-nowrap bg-orange font-bold text-white transition hover:bg-orange-secondary",
            compact ? "rounded-lg px-3 py-2 text-xs" : "rounded-xl px-3.5 py-2.5 text-sm",
            fullWidth && "flex-1"
          )}
        >
          {bookLabel}
        </button>
      </div>

      <EnquiryModal
        open={open}
        onClose={() => setOpen(false)}
        contextLabel={contextLabel}
      />
    </>
  );
}
