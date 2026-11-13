import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../../utils/cn";
import { useVisibleNav } from "./useVisibleNav";
import logo from "../../assets/logo.png";

function CountBadge({ count, active }) {
  if (count == null) return null;
  return (
    <span
      className={cn(
        "ml-auto inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        active ? "bg-white/25 text-white" : "bg-slate-100 text-muted"
      )}
    >
      {count > 999 ? "999+" : count}
    </span>
  );
}

function isChildActive(child, pathname) {
  if (
    child.exact ||
    child.href === "/dashboard/leads" ||
    child.href === "/dashboard/vendors" ||
    child.href === "/dashboard/accounts" ||
    child.href === "/dashboard/live-bids"
  ) {
    return pathname === child.href;
  }
  return pathname === child.href || pathname.startsWith(`${child.href}/`);
}

function NavEntry({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const underSection =
    Boolean(item.children?.length) &&
    Boolean(item.href) &&
    (location.pathname === item.href || location.pathname.startsWith(`${item.href}/`));
  const childActive = item.children?.some((child) => isChildActive(child, location.pathname));
  const sectionOpen = Boolean(childActive || underSection);
  const [open, setOpen] = useState(sectionOpen);

  useEffect(() => {
    if (sectionOpen) setOpen(true);
  }, [sectionOpen]);

  if (!item.children?.length) {
    return (
      <li>
        <NavLink
          to={item.href}
          end={item.href === "/dashboard"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
              isActive
                ? "bg-primary text-white shadow-sm shadow-primary/25"
                : "text-muted hover:bg-slate-50 hover:text-navy",
              collapsed && "justify-center px-2"
            )
          }
          title={collapsed ? item.name : undefined}
          onClick={onNavigate}
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </>
          )}
        </NavLink>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        title={collapsed ? item.name : undefined}
        onClick={() => {
          if (collapsed) {
            navigate(item.children[0].href);
            onNavigate?.();
            return;
          }
          setOpen((current) => !current);
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
          sectionOpen
            ? "bg-primary text-white shadow-sm shadow-primary/25"
            : "text-muted hover:bg-slate-50 hover:text-navy",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon
          className={cn("h-4 w-4 shrink-0", sectionOpen ? "text-white" : "text-slate-400")}
        />
        {!collapsed && <span className="flex-1 truncate text-left">{item.name}</span>}
        {!collapsed && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 opacity-80 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        )}
      </button>
      {!collapsed && open && (
        <ul className="mt-1 space-y-0.5 border-l border-border py-0.5 pl-3 ml-4">
          {item.children.map((child) => {
            const active = isChildActive(child, location.pathname);
            return (
              <li key={child.href}>
                <NavLink
                  to={child.href}
                  end={Boolean(child.exact)}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors",
                    active
                      ? "bg-primary-light font-semibold text-primary"
                      : "text-muted hover:bg-slate-50 hover:text-navy"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{child.name}</span>
                  <CountBadge count={child.count} active={false} />
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({ collapsed, setCollapsed, onNavigate }) {
  const visibleGroups = useVisibleNav();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 flex h-full flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[232px]"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border",
          collapsed ? "justify-center px-2 py-3" : "px-3 py-3"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center justify-center",
            collapsed ? "h-8 w-8" : "h-9 flex-1"
          )}
        >
          <img
            src={logo}
            alt="Logo"
            className={cn("object-contain", collapsed ? "h-7 w-7" : "h-8 w-auto max-w-full")}
          />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-50 hover:text-navy"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        <nav className={cn("space-y-4", collapsed ? "px-2" : "px-2.5")}>
          {visibleGroups.map((group, index) => (
            <div key={group.group}>
              {!collapsed ? (
                <h4 className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {group.group}
                </h4>
              ) : (
                index > 0 && <div className="mx-auto mb-2 h-px w-6 bg-border" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavEntry key={item.name} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
