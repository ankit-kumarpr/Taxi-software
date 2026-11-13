import type { FaqItem } from "@/types";

export const faqs: FaqItem[] = [
  {
    id: "f1",
    question: "How do I request a taxi quote?",
    answer:
      "Share your trip details through the quote form, then call or email our team to confirm the vehicle, fare and pickup arrangements.",
    category: "Booking",
  },
  {
    id: "f2",
    question: "Are the prices on this website final?",
    answer:
      "Displayed prices are starting fares. Your final quote depends on the route, pickup point, travel date, vehicle category, tolls and requested stops.",
    category: "Pricing",
  },
  {
    id: "f3",
    question: "Which vehicle should I choose for an outstation trip?",
    answer:
      "Choose based on passenger count, luggage and road conditions. Sedans suit smaller groups, while SUVs and Innova-class vehicles offer more space. Availability varies — request a quote with your travel date.",
    category: "Fleet",
  },
  {
    id: "f4",
    question: "Do you provide one-way outstation trips?",
    answer:
      "Yes. One-way outstation cabs are available on many routes. Contact us with your travel details to confirm availability and inclusions.",
    category: "Booking",
  },
  {
    id: "f5",
    question: "Is night travel available?",
    answer:
      "Night and early-morning travel can be arranged on many routes. Any night allowance or timing-related charge will be included in your quote.",
    category: "Support",
  },
  {
    id: "f6",
    question: "Can I book for airport pickup?",
    answer:
      "Yes. Choose Airport Transfer and share the airport, terminal, flight details, pickup time, passenger count and luggage requirements.",
    category: "Airport",
  },
  {
    id: "f7",
    question: "How do cancellations work?",
    answer:
      "Cancellation charges depend on how close to pickup time the booking is cancelled and whether a vehicle has already been assigned. Ask for the applicable terms when confirming.",
    category: "Policy",
  },
  {
    id: "f8",
    question: "Do you provide cabs across India?",
    answer:
      "Yes. TrueWay Taxi serves major cities and intercity routes across India, subject to vehicle availability and route permits.",
    category: "Coverage",
  },
];
