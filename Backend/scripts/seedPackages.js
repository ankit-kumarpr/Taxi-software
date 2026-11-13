/**
 * Seed a few published tour packages (idempotent by slug).
 * Usage: node scripts/seedPackages.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Package = require("../models/Package");

const rows = [
  {
    slug: "delhi-agra-day-trip",
    shortHeading: "1 Day",
    mainHeading: "Delhi–Agra Day Trip",
    shortDescription:
      "Taj-focused day plan with flexible photo stops and hotel/airport friendly timing.",
    mainContent:
      "<p>Travel from Delhi to Agra with flexible pickup timing, monument stops and a comfortable return journey.</p>",
    duration: "1 Day",
    destinations: ["Agra"],
    priceFrom: 4500,
    includes: ["Taxi for the day", "Driver charges", "Flexible monument stops"],
    excludes: ["Monument tickets", "Meals"],
    metaTitle: "Delhi to Agra Day Trip Taxi Package",
    metaDescription:
      "Book a Delhi–Agra day trip taxi with flexible pickup, monument stops and return transfer.",
    status: "PUBLISHED",
  },
  {
    slug: "mumbai-pune-getaway",
    shortHeading: "1–2 Days",
    mainHeading: "Mumbai–Pune Getaway",
    shortDescription:
      "Expressway travel for business or weekend stays with flexible drop points.",
    mainContent:
      "<p>Choose a one-way or round trip between Mumbai and Pune with flexible pickup and drop locations.</p>",
    duration: "1–2 Days",
    destinations: ["Pune"],
    priceFrom: 3500,
    includes: ["One-way or round trip", "AC vehicle", "Flexible timing"],
    excludes: ["Hotel stay", "Toll extras if applicable"],
    metaTitle: "Mumbai to Pune Taxi Package",
    metaDescription: "Book Mumbai–Pune taxi packages for business or weekend travel.",
    status: "PUBLISHED",
  },
  {
    slug: "jaipur-weekend",
    shortHeading: "2N/3D",
    mainHeading: "Jaipur Weekend",
    shortDescription:
      "Pink City weekend with hotel drop support and local sightseeing taxi hours.",
    mainContent:
      "<p>Enjoy a relaxed Jaipur weekend with outstation travel, hotel transfers and time for local sightseeing.</p>",
    duration: "2N/3D",
    destinations: ["Jaipur"],
    priceFrom: 9000,
    includes: ["Outstation taxi", "Local sightseeing hours", "Return transfer option"],
    excludes: ["Hotel booking", "Guide fees"],
    metaTitle: "Jaipur Weekend Taxi Package",
    metaDescription: "Book a Jaipur weekend taxi package with hotel drops and sightseeing hours.",
    status: "PUBLISHED",
  },
  {
    slug: "goa-airport-resort",
    shortHeading: "Transfers",
    mainHeading: "Goa Airport & Resort",
    shortDescription: "Airport-to-resort focused transfers for North and South Goa stays.",
    mainContent:
      "<p>Book a comfortable airport-to-resort transfer across North or South Goa with space for your luggage.</p>",
    duration: "Transfers",
    destinations: ["Goa"],
    priceFrom: 2500,
    includes: ["Airport pickup/drop", "Resort transfer", "Luggage-friendly vehicles"],
    excludes: ["Waiting beyond free time", "Extra stops"],
    metaTitle: "Goa Airport Resort Transfer Package",
    metaDescription: "Book Goa airport to resort taxi transfers for North and South Goa.",
    status: "PUBLISHED",
  },
];

async function main() {
  const uri = process.env.MONGOURL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGOURL missing");
  await mongoose.connect(uri);

  for (const row of rows) {
    const existing = await Package.findOne({ slug: row.slug });
    if (existing) {
      console.log(`skip ${row.slug}`);
      continue;
    }
    await Package.create(row);
    console.log(`created ${row.slug}`);
  }

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
