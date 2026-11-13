"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { mainNav } from "@/data/navigation";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

type NavLink = { label: string; href: string; description?: string };

export function Header({
  serviceLinks = [],
  packageLinks = [],
}: {
  serviceLinks?: NavLink[];
  packageLinks?: NavLink[];
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navItems = useMemo<NavItem[]>(
    () =>
      mainNav.map((item) => {
        if (item.href === "/services") {
          return {
            ...item,
            children: serviceLinks.length
              ? serviceLinks
              : item.children || [{ label: "All Services", href: "/services" }],
          };
        }
        if (item.href === "/tour-packages") {
          return {
            ...item,
            children: packageLinks.length
              ? packageLinks
              : item.children || [{ label: "All Packages", href: "/tour-packages" }],
          };
        }
        return item;
      }),
    [serviceLinks, packageLinks],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenus = () => {
    setOpen(false);
    setOpenDropdown(null);
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-[#e5e7eb] bg-white transition-shadow duration-300",
        scrolled || open ? "shadow-md" : "shadow-sm",
      )}
    >
      <div className="container-site flex h-16 items-center justify-between gap-3 md:h-[72px]">
        <BrandLogo priority className="min-w-0" onClick={closeMenus} />

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
          {navItems.map((item) => {
            const active = isActive(item.href);
            if (item.children?.length) {
              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active ? "text-orange" : "text-[#123056] hover:text-blue",
                    )}
                    aria-expanded={openDropdown === item.label}
                  >
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {active ? <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded bg-orange" /> : null}
                  {openDropdown === item.label ? (
                    <div className="absolute left-0 top-full z-50 min-w-[240px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-xl">
                      <div className="max-h-64 overflow-y-auto overscroll-contain p-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={closeMenus}
                            className="block rounded-lg px-3 py-2 text-sm text-[#5a6f8a] transition hover:bg-[#eef4fb] hover:text-[#123056]"
                          >
                            <span className="font-medium text-[#123056]">{child.label}</span>
                            {child.description ? (
                              <span className="mt-0.5 block text-xs text-[#5a6f8a]">{child.description}</span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-[#eef2f7] p-2">
                        <Link
                          href={item.href}
                          onClick={closeMenus}
                          className="block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue hover:bg-blue/10"
                        >
                          View all {item.label}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenus}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "text-orange" : "text-[#123056] hover:text-blue",
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded bg-orange" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${siteConfig.phoneTel}`}
            className="group hidden items-center gap-2 rounded-full border-2 border-[#2563eb] px-3 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-[#2563eb] hover:text-white sm:inline-flex lg:px-4"
          >
            <Phone className="h-4 w-4 shrink-0 text-[#e11d2e] transition group-hover:text-white" />
            <span>{siteConfig.phoneDisplay}</span>
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d5e0ef] text-[#123056] xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[#e5e7eb] bg-white xl:hidden">
          <div className="container-site space-y-1 py-4">
            {navItems.map((item) => (
              <div key={item.href} className="border-b border-[#eef2f7] py-1">
                {item.children?.length ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between py-2 text-left text-sm font-semibold text-[#123056]"
                      onClick={() =>
                        setOpenDropdown((curr) => (curr === item.label ? null : item.label))
                      }
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition",
                          openDropdown === item.label && "rotate-180",
                        )}
                      />
                    </button>
                    {openDropdown === item.label ? (
                      <div className="mb-2 space-y-1 pl-3">
                        <Link href={item.href} onClick={closeMenus} className="block py-1.5 text-sm text-blue">
                          All {item.label}
                        </Link>
                        <div className="max-h-56 overflow-y-auto overscroll-contain pr-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={closeMenus}
                              className="block py-1.5 text-sm text-[#5a6f8a]"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={closeMenus}
                    className={cn(
                      "block py-2 text-sm font-semibold",
                      isActive(item.href) ? "text-orange" : "text-[#123056]",
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <a
              href={`tel:${siteConfig.phoneTel}`}
              className="group mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#2563eb] px-4 py-3 text-sm font-semibold text-[#2563eb] transition hover:bg-[#2563eb] hover:text-white"
            >
              <Phone className="h-4 w-4 shrink-0 text-[#e11d2e] transition group-hover:text-white" />
              {siteConfig.phoneDisplay}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
