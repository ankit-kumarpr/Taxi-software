"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Phone, Send, ShieldCheck, Zap } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { siteConfig } from "@/lib/site";
import { quoteFormSchema, toLeadPickupTime, type QuoteFormValues } from "./schema";

type OptionRow = { _id: string; name: string; durationType?: string };

type InquiryOptionsResponse = {
  success?: boolean;
  data?: { tripTypes?: OptionRow[]; cabTypes?: OptionRow[] };
};

type InquiryCreateResponse = {
  success?: boolean;
  message?: string;
  data?: { leadId?: string };
};

export function BookingForm({
  compact: _compact = false,
  contextLabel,
}: {
  compact?: boolean;
  contextLabel?: string;
}) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tripTypes, setTripTypes] = useState<OptionRow[]>([]);
  const [cabTypes, setCabTypes] = useState<OptionRow[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      customerName: "",
      mobileNumber: "",
      email: "",
      pickupLocation: "",
      dropLocation: "",
      travelDate: "",
      endDate: "",
      pickupTime: "",
      tripType: "",
      cabType: "",
    },
  });

  const selectedTripTypeId = watch("tripType");
  const travelDate = watch("travelDate");
  const isMultiDay = useMemo(() => {
    const selected = tripTypes.find((t) => t._id === selectedTripTypeId);
    return selected?.durationType === "MULTI_DAY";
  }, [tripTypes, selectedTripTypeId]);

  useEffect(() => {
    if (!isMultiDay) setValue("endDate", "");
  }, [isMultiDay, setValue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiGet<InquiryOptionsResponse>("/website/inquiries/options", {
        cache: "no-store",
      });
      if (cancelled || !res?.data) return;
      setTripTypes(res.data.tripTypes || []);
      setCabTypes(res.data.cabTypes || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: QuoteFormValues) => {
    setSubmitError(null);
    setSuccessMessage(null);

    if (isMultiDay && !values.endDate) {
      setSubmitError("Please select an end date for multi-day trips.");
      return;
    }

    const payload = {
      customerName: values.customerName.trim(),
      mobileNumber: values.mobileNumber.trim(),
      email: values.email?.trim() || undefined,
      pickupLocation: values.pickupLocation.trim(),
      dropLocation: values.dropLocation.trim(),
      travelDate: values.travelDate,
      endDate: isMultiDay ? values.endDate || undefined : undefined,
      pickupTime: toLeadPickupTime(values.pickupTime),
      tripType: values.tripType,
      cabType: values.cabType,
      remarks: contextLabel
        ? `Inquiry submitted from website · ${contextLabel}`
        : "Inquiry submitted from website",
    };

    const res = await apiPost<InquiryCreateResponse>("/website/inquiries/create", payload);
    if (!res.ok) {
      setSubmitError(res.message || "Could not submit inquiry. Please try again.");
      return;
    }

    const leadId = res.data?.data?.leadId;
    setSuccessMessage(
      `Thank you, ${values.customerName.trim()}!${
        leadId ? ` Inquiry ${leadId} received.` : ""
      } Our team will contact you shortly on ${values.mobileNumber.trim()}.`
    );
    reset();
  };

  return (
    <div className="booking-card relative overflow-hidden rounded-2xl bg-white shadow-[0_0_50px_rgba(37,99,235,0.25)] ring-1 ring-blue/30">
      <div className="brand-gradient flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">
            TrueWay Booking
          </p>
          <h2 className="text-sm font-bold text-white sm:text-base">REQUEST A QUOTE</h2>
          {contextLabel ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-white/80">
              {contextLabel}
            </p>
          ) : null}
        </div>
        <a href={`tel:${siteConfig.phoneTel}`} className="hidden text-right sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/85">Call Now</p>
          <p className="text-xs font-bold text-white">{siteConfig.phoneDisplay}</p>
        </a>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-3 bg-white p-4 text-[#0a0a0b] sm:p-5"
        noValidate
      >
        <input type="hidden" name="leadSource" value="WEBSITE" readOnly />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer Name" required error={errors.customerName?.message}>
            <input
              type="text"
              className="input-field"
              placeholder="Full name"
              autoComplete="name"
              {...register("customerName")}
            />
          </Field>
          <Field label="Mobile Number" required error={errors.mobileNumber?.message}>
            <input
              type="tel"
              className="input-field"
              placeholder="10-digit mobile"
              autoComplete="tel"
              {...register("mobileNumber")}
            />
          </Field>

          <Field label="Email (optional)" error={errors.email?.message} className="sm:col-span-2">
            <input
              type="email"
              className="input-field"
              placeholder="optional@email.com"
              autoComplete="email"
              {...register("email")}
            />
          </Field>

          <Field label="Pickup Location" required error={errors.pickupLocation?.message} className="sm:col-span-2">
            <input
              type="text"
              className="input-field"
              placeholder="Pickup address / area"
              {...register("pickupLocation")}
            />
          </Field>

          <Field label="Drop Location" required error={errors.dropLocation?.message} className="sm:col-span-2">
            <input
              type="text"
              className="input-field"
              placeholder="Drop address / area"
              {...register("dropLocation")}
            />
          </Field>

          <Field label="Trip Type" required error={errors.tripType?.message}>
            <select className="input-field" {...register("tripType")}>
              <option value="">Select trip type</option>
              {tripTypes.map((opt) => (
                <option key={opt._id} value={opt._id}>
                  {opt.name}
                  {opt.durationType === "MULTI_DAY" ? " (Multi day)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cab Type Required" required error={errors.cabType?.message}>
            <select className="input-field" {...register("cabType")}>
              <option value="">Select cab type</option>
              {cabTypes.map((opt) => (
                <option key={opt._id} value={opt._id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Travel Date" required error={errors.travelDate?.message}>
            <input type="date" className="input-field" {...register("travelDate")} />
          </Field>
          {isMultiDay ? (
            <Field label="End Date" required error={errors.endDate?.message}>
              <input
                type="date"
                className="input-field"
                min={travelDate || undefined}
                {...register("endDate")}
              />
            </Field>
          ) : null}
          <Field label="Pickup Time" required error={errors.pickupTime?.message}>
            <input type="time" className="input-field" {...register("pickupTime")} />
          </Field>
        </div>

        <button type="submit" className="btn-orange w-full" disabled={isSubmitting}>
          <Send className="h-4 w-4" />
          {isSubmitting ? "Sending..." : "GET A QUOTE"}
        </button>

        {submitError ? (
          <p className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c]">
            {submitError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-lg border border-[#16a34a]/30 bg-[#f0fdf4] px-3 py-2 text-xs text-[#166534]">
            {successMessage}
          </p>
        ) : (
          <p className="booking-hint text-center text-[11px]">
            Source: Website · Our team usually responds within a few minutes.
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-[#e5e7eb] pt-3">
          {[
            { icon: ShieldCheck, label: "No Hidden Charges" },
            { icon: BadgeCheck, label: "Best Price Guarantee" },
            { icon: Zap, label: "Instant Confirmation" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 text-center">
              <item.icon className="h-4 w-4 text-[#e11d2e]" />
              <span className="booking-muted text-[10px] font-semibold leading-tight sm:text-[11px]">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <a
          href={`tel:${siteConfig.phoneTel}`}
          className="flex items-center justify-center gap-2 text-xs font-semibold text-blue sm:hidden"
        >
          <Phone className="h-3.5 w-3.5 text-orange" />
          {siteConfig.phoneDisplay}
        </a>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="booking-label mb-1.5 block text-xs font-semibold">
        {label}
        {required ? <span className="text-[#e11d2e]"> *</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-[#e11d2e]">{error}</span> : null}
    </label>
  );
}
