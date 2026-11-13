import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { useVisibleNav } from "./useVisibleNav";

const linkClass = ({ isActive }) =>
  cn(
    "inline-flex shrink-0 items-center rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-primary-light text-primary" : "text-muted hover:bg-slate-50 hover:text-navy"
  );

function GroupMenu({ group, open, onToggle, onClose }) {
  const location = useLocation();
  const direct = group.items.length === 1 && group.items[0].href && !group.items[0].children?.length
    ? group.items[0]
    : null;
  const active = group.items.some((item) =>
    item.href
      ? location.pathname === item.href
      : item.children?.some((child) => location.pathname === child.href)
  );

  if (direct) {
    return (
      <NavLink to={direct.href} end={direct.href === "/dashboard"} className={linkClass} onClick={onClose}>
        <direct.icon className="mr-2 h-4 w-4 shrink-0" />
        {direct.name}
      </NavLink>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          "inline-flex items-center rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
          open || active ? "bg-primary-light text-primary" : "text-muted hover:bg-slate-50 hover:text-navy"
        )}
      >
        {group.group}
        <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-[70vh] w-56 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg">
          {group.items.map((item) => (
            item.children?.length ? (
              <div key={item.name} className="py-1">
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.name}</p>
                {item.children.map((child) => (
                  <NavLink
                    key={child.href}
                    to={child.href}
                    end={Boolean(child.exact)}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between gap-2 px-3 py-2 text-sm",
                        isActive ? "bg-primary-light font-medium text-primary" : "text-navy hover:bg-slate-50"
                      )
                    }
                  >
                    <span className="truncate">{child.name}</span>
                    {child.count != null ? (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted">
                        {child.count > 999 ? "999+" : child.count}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            ) : (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/dashboard"}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2 text-sm",
                    isActive ? "bg-primary-light font-medium text-primary" : "text-navy hover:bg-slate-50"
                  )
                }
              >
                <item.icon className="mr-2 h-4 w-4 shrink-0 text-muted" />
                {item.name}
              </NavLink>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const groups = useVisibleNav();
  const location = useLocation();
  const navRef = useRef(null);
  const [openGroup, setOpenGroup] = useState(null);

  useEffect(() => {
    setOpenGroup(null);
  }, [location.pathname]);

  useEffect(() => {
    const onPointer = (event) => {
      if (!navRef.current?.contains(event.target)) setOpenGroup(null);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <nav ref={navRef} aria-label="Main" className={cn("flex min-w-0 flex-1 items-center gap-1", openGroup ? "overflow-visible" : "overflow-x-auto")}>
      {groups.map((group) => (
        <GroupMenu
          key={group.group}
          group={group}
          open={openGroup === group.group}
          onToggle={() => setOpenGroup((current) => (current === group.group ? null : group.group))}
          onClose={() => setOpenGroup(null)}
        />
      ))}
    </nav>
  );
}
