const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise = null;

export const loadRazorpayScript = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("Window unavailable"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      if (window.Razorpay) resolve(window.Razorpay);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay checkout"));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
};

/**
 * Opens Razorpay checkout and resolves with payment response on success.
 * Rejects if user closes or payment fails.
 */
export const openRazorpayCheckout = async ({
  keyId,
  orderId,
  amount,
  currency = "INR",
  name = "True Way Taxi",
  description = "Trip payment",
  prefill = {},
  notes = {},
}) => {
  const Razorpay = await loadRazorpayScript();
  if (!Razorpay) throw new Error("Razorpay SDK unavailable");

  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount,
      currency,
      name,
      description,
      order_id: orderId,
      notes,
      prefill: {
        name: prefill.name || "",
        email: prefill.email || "",
        contact: prefill.contact || "",
      },
      theme: { color: "#0f766e" },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });
    rzp.on("payment.failed", (res) => {
      reject(new Error(res?.error?.description || "Payment failed"));
    });
    rzp.open();
  });
};
