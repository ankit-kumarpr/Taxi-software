"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { siteConfig } from "@/lib/site";

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const minDelay = window.setTimeout(() => setFadeOut(true), 1200);
    const hideDelay = window.setTimeout(() => setVisible(false), 1700);

    const onLoad = () => {
      window.setTimeout(() => setFadeOut(true), 400);
      window.setTimeout(() => setVisible(false), 900);
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
    }

    return () => {
      window.clearTimeout(minDelay);
      window.clearTimeout(hideDelay);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative flex flex-col items-center gap-6">
        <div className="animate-pulse">
          <Image
            src="/logo.png"
            alt={`${siteConfig.name} loading`}
            width={280}
            height={100}
            priority
            className="h-20 w-auto object-contain sm:h-24"
          />
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-[#e5e7eb]">
          <div className="preloader-bar h-full rounded-full bg-gradient-to-r from-[#2563eb] via-[#e11d2e] to-[#2563eb]" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5a6f8a]">
          Loading...
        </p>
      </div>
    </div>
  );
}
