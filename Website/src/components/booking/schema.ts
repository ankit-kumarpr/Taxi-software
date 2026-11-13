import { z } from "zod";

export const quoteFormSchema = z
  .object({
    customerName: z.string().min(2, "Please enter your full name"),
    mobileNumber: z
      .string()
      .min(10, "Please enter a valid 10-digit mobile number")
      .regex(/^[0-9+\-\s()]{10,15}$/, "Please enter a valid mobile number"),
    email: z
      .string()
      .email("Please enter a valid email")
      .optional()
      .or(z.literal("")),
    pickupLocation: z.string().min(2, "Please enter pickup location"),
    dropLocation: z.string().min(2, "Please enter drop location"),
    travelDate: z.string().min(1, "Please select travel date"),
    endDate: z.string().optional().or(z.literal("")),
    pickupTime: z.string().min(1, "Please select pickup time"),
    tripType: z.string().min(1, "Please select trip type"),
    cabType: z.string().min(1, "Please select cab type"),
  })
  .superRefine((values, ctx) => {
    // endDate required only when the selected trip type is MULTI_DAY — validated in the form UI/submit
    if (values.endDate && values.travelDate && values.endDate < values.travelDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date cannot be before travel date",
      });
    }
  });

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

/** Convert HTML time (24h) → lead-style "h:mm AM/PM" */
export function toLeadPickupTime(time24: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time24 || "").trim());
  if (!match) return String(time24 || "").trim();
  let hour = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return String(time24).trim();
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
}
