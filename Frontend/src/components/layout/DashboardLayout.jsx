import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NotificationToasts } from "../notifications/NotificationToasts";
import { useAuth } from "../../context/AuthContext";
import { LeadCountsProvider } from "../../context/LeadCountsContext";
import { VendorCountsProvider } from "../../context/VendorCountsContext";
import { AccountsCountsProvider } from "../../context/AccountsCountsContext";
import { BidCountsProvider } from "../../context/BidCountsContext";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";

const readNavLayout = () => {
  try {
    return window.localStorage.getItem("dashboard-nav-layout") === "navbar" ? "navbar" : "sidebar";
  } catch {
    return "sidebar";
  }
};

export function DashboardLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [navLayout, setNavLayout] = useState(readNavLayout);

  const toggleLayout = () => {
    setNavLayout((current) => {
      const next = current === "navbar" ? "sidebar" : "navbar";
      try {
        window.localStorage.setItem("dashboard-nav-layout", next);
      } catch {
        // The layout still switches for this visit if storage is blocked.
      }
      return next;
    });
  };

  const showSidebar = !isMobile && navLayout !== "navbar";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <LeadCountsProvider>
    <VendorCountsProvider>
    <AccountsCountsProvider>
    <BidCountsProvider>
      <div className="min-h-screen bg-background font-sans">
        {isMobile && mobileMenuOpen && (
          <div className="relative z-50 lg:hidden">
            <div className="fixed inset-0 bg-navy/40 transition-opacity backdrop-blur-[2px]" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-0 flex">
              <div className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" className="-m-2.5 rounded-lg p-2.5 hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
                <div className="h-full w-full overflow-hidden rounded-r-2xl bg-surface shadow-xl">
                  <Sidebar collapsed={false} setCollapsed={() => {}} onNavigate={() => setMobileMenuOpen(false)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {showSidebar && <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />}

        <div className={cn("flex min-h-screen flex-col transition-all duration-300 ease-in-out", showSidebar && (collapsed ? "pl-[68px]" : "pl-[232px]"))}>
          <Header setMobileMenuOpen={setMobileMenuOpen} isMobile={isMobile} navLayout={navLayout} onToggleLayout={toggleLayout} />
          {user?.userType === "ADMIN" || user?.userType === "VENDOR" ? <NotificationToasts /> : null}
          <main className="flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
            <div className="mx-auto w-full max-w-[1280px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </BidCountsProvider>
    </AccountsCountsProvider>
    </VendorCountsProvider>
    </LeadCountsProvider>
  );
}
