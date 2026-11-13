"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Car, Clock, IndianRupee, ShieldCheck, Star, Users, Award } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { BookingForm } from "@/components/booking/BookingForm";
import { siteConfig } from "@/lib/site";

const features = [
  { icon: ShieldCheck, title: "Verified Drivers", subtitle: "100% Safety" },
  { icon: IndianRupee, title: "Fixed Fare", subtitle: "No Hidden Charges" },
  { icon: Clock, title: "24/7 Support", subtitle: "Always Available" },
  { icon: Car, title: "Clean & Comfy", subtitle: "Well Maintained" },
];

export function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[100svh] overflow-hidden pt-16 md:pt-[72px]">
      <Image
        src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=2000&q=80"
        alt="TrueWay Taxi cab service across India"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />

      <div className="container-site relative grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <Badge>
            <Star className="h-3.5 w-3.5 fill-orange text-orange" />
            TrueWay Taxi — Trusted Cab Service Across India
          </Badge>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            BOOK YOUR TAXI
            <span className="mt-1 block text-blue">ANYWHERE IN</span>
            <span className="mt-1 block text-orange">INDIA</span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-text-secondary md:text-lg">
            Safe, reliable & comfortable journeys for local, outstation and airport travel — all over India.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {features.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-black/45 p-3 backdrop-blur-sm transition hover:border-blue/50"
              >
                <item.icon className="h-5 w-5 text-orange" />
                <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                <p className="text-[11px] text-text-secondary">{item.subtitle}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-sm text-text-secondary">
            <div className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-blue" />
              <span>
                <span className="font-semibold text-white">{siteConfig.travellers}</span> Happy Travellers
              </span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#4285F4]">
                G
              </span>
              <span>
                Google Rating <span className="font-semibold text-white">{siteConfig.rating}</span>
              </span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Award className="h-4 w-4 text-orange" />
              <span>
                <span className="font-semibold text-white">{siteConfig.years}</span> Years of Trust
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
          className="w-full max-w-xl lg:ml-auto"
        >
          <BookingForm compact />
        </motion.div>
      </div>
    </section>
  );
}
