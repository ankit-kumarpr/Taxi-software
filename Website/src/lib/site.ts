export const siteConfig = {
  name: "TrueWay Taxi",
  shortName: "TrueWay",
  tagline: "Safe, reliable & comfortable cab service across India.",
  description:
    "Book TrueWay Taxi for local rides, outstation trips, airport transfers and tour packages across India.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://truewaytaxi.com",
  locale: "en_IN",
  phoneDisplay: "+91 92589 12169",
  phoneTel: "+919258912169",
  whatsapp: "919258912169",
  email: "bookings@truewaytaxi.com",
  address: "Serving major cities across India",
  serviceArea: "All over India",
  travellers: "20,000+",
  rating: "4.8/5",
  years: "5+",
  social: {
    facebook: "https://www.facebook.com/truewaytaxi",
    instagram: "https://www.instagram.com/truewaytaxi",
    youtube: "https://www.youtube.com/@truewaytaxi",
  },
} as const;
