import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer = null,
  size = "lg",
  className = "",
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth =
    size === "sm"
      ? "max-w-md"
      : size === "md"
        ? "max-w-lg"
        : size === "xl"
          ? "max-w-3xl"
          : size === "2xl"
            ? "max-w-4xl"
            : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-navy/35 backdrop-blur-[1px]"
        onClick={onClose || undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-xl",
          maxWidth,
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-navy">{title}</h2>
            {description ? <p className="mt-0.5 text-[12px] text-muted">{description}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3.5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-4 py-2.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
