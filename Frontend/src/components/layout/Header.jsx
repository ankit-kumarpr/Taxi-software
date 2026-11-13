import { Menu, LogOut, ChevronDown, PanelLeft, PanelTop, UserRound, Search } from "lucide-react";
import { cn } from "../../utils/cn";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { TopNav } from "./TopNav";
import { NotificationBell } from "../notifications/NotificationBell";
import logo from "../../assets/logo.png";

export function Header({ setMobileMenuOpen, isMobile, navLayout = "sidebar", onToggleLayout }) {
  const { user, logout, token } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      if (token) {
        await axios.post(
          `${import.meta.env.VITE_API_URL}auth/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logout();
      navigate("/");
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/dashboard/leads?q=${encodeURIComponent(q)}` : "/dashboard/leads");
  };

  const navbar = navLayout === "navbar" && !isMobile;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-x-3 border-b border-border bg-surface px-3 sm:gap-x-4 sm:px-5 lg:px-6">
      {isMobile && (
        <button
          type="button"
          className="rounded-lg p-2 text-navy transition hover:bg-slate-50 lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      {navbar && (
        <img
          src={logo}
          alt="Logo"
          className="h-8 w-auto max-w-[8rem] shrink-0 object-contain sm:h-9 sm:max-w-[9.5rem]"
        />
      )}
      {navbar && <TopNav />}

      {!navbar && !isMobile && (
        <form onSubmit={submitSearch} className="relative hidden min-w-0 max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads…"
            className="h-9 w-full rounded-xl border-0 bg-background pl-9 pr-3 text-[13px] text-navy outline-none ring-1 ring-border placeholder:text-slate-400 focus:ring-primary/30"
          />
        </form>
      )}

      <div
        className={cn(
          "flex items-center gap-x-2 self-stretch sm:gap-x-3",
          navbar || isMobile ? "ml-auto" : "ml-auto"
        )}
      >
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleLayout}
            title={navbar ? "Switch to sidebar" : "Switch to top menu"}
            aria-label={navbar ? "Switch to sidebar" : "Switch to top menu"}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-50 hover:text-navy"
          >
            {navbar ? <PanelLeft className="h-4 w-4" /> : <PanelTop className="h-4 w-4" />}
          </button>
        )}

        {user?.userType === "ADMIN" || user?.userType === "VENDOR" ? <NotificationBell /> : null}

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-slate-50"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {(user?.name || user?.companyName || "U").charAt(0).toUpperCase()}
            </div>
            <span className="hidden min-w-0 flex-col items-start lg:flex">
              <span className="max-w-[9rem] truncate text-[13px] font-semibold leading-4 text-navy">
                {user?.name || user?.companyName || "User"}
              </span>
              <span className="max-w-[9rem] truncate text-[11px] leading-4 text-muted">
                {user?.email || user?.userType || "ADMIN"}
              </span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 lg:block" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 z-10 mt-2 w-52 origin-top-right rounded-xl border border-border bg-surface py-1.5 shadow-lg">
              <div className="border-b border-border px-3 py-2.5">
                <p className="truncate text-[13px] font-medium text-navy">
                  {user?.name || user?.companyName}
                </p>
                <p className="truncate text-[11px] text-muted">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate("/dashboard/profile");
                }}
                className="flex w-full items-center px-3 py-2 text-[13px] text-navy transition-colors hover:bg-slate-50"
              >
                <UserRound className="mr-2 h-3.5 w-3.5" />
                My Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-3 py-2 text-[13px] text-danger transition-colors hover:bg-red-50"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
