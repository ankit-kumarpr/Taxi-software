const Razorpay = require("razorpay");
const crypto = require("crypto");

let client = null;

const getRazorpay = () => {
    if (client) return client;
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        const error = new Error("Razorpay is not configured");
        error.status = 500;
        throw error;
    }
    client = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    return client;
};

const createOrder = async ({ amountInr, receipt, notes = {} }) => {
    const amountPaise = Math.round(Number(amountInr) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
        const error = new Error("Minimum payment amount is ₹1");
        error.status = 400;
        throw error;
    }
    const order = await getRazorpay().orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: String(receipt || `rcpt_${Date.now()}`).slice(0, 40),
        notes,
    });
    return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        amountInr: amountPaise / 100,
    };
};

const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");
    return expected === signature;
};

module.exports = { getRazorpay, createOrder, verifyPaymentSignature };
