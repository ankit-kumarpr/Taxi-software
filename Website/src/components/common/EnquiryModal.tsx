"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { BookingForm } from "@/components/booking/BookingForm";

type EnquiryModalProps = {
  open: boolean;
  onClose: () => void;
  contextLabel?: string;
};

export function EnquiryModal({ open, onClose, contextLabel }: EnquiryModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close enquiry modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-modal-title"
        className="relative z-[101] max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="enquiry-modal-title" className="sr-only">
          {contextLabel ? `Enquiry — ${contextLabel}` : "Enquiry Form"}
        </h2>

        <BookingForm compact contextLabel={contextLabel} />
      </div>
    </div>
  );
}
