import { useMemo } from "react";
import { cn } from "../../utils/cn";

/**
 * Micro permission checkbox grid.
 * mode: "template" → single selected set
 * mode: "overrides" → grant + deny columns (Option C)
 */
export function PermissionMatrix({
  groups = [],
  mode = "template",
  selected = [],
  grant = [],
  deny = [],
  onChangeSelected,
  onChangeGrantDeny,
  disabled = false,
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const grantSet = useMemo(() => new Set(grant), [grant]);
  const denySet = useMemo(() => new Set(deny), [deny]);

  const toggleSelected = (key) => {
    if (disabled || !onChangeSelected) return;
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChangeSelected([...next]);
  };

  const setGrant = (key, on) => {
    if (disabled || !onChangeGrantDeny) return;
    const g = new Set(grantSet);
    const d = new Set(denySet);
    if (on) {
      g.add(key);
      d.delete(key);
    } else {
      g.delete(key);
    }
    onChangeGrantDeny({ grant: [...g], deny: [...d] });
  };

  const setDeny = (key, on) => {
    if (disabled || !onChangeGrantDeny) return;
    const g = new Set(grantSet);
    const d = new Set(denySet);
    if (on) {
      d.add(key);
      g.delete(key);
    } else {
      d.delete(key);
    }
    onChangeGrantDeny({ grant: [...g], deny: [...d] });
  };

  if (!groups.length) {
    return <p className="text-sm text-slate-500">No permission catalog loaded.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.key} className="overflow-hidden rounded-xl border border-slate-200">
          <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">
            {group.label}
          </div>
          <ul className="divide-y divide-slate-100">
            {(group.permissions || []).map((perm) => (
              <li
                key={perm.key}
                className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{perm.label}</p>
                  <p className="font-mono text-[10px] text-slate-400">{perm.key}</p>
                </div>

                {mode === "template" ? (
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={selectedSet.has(perm.key)}
                      disabled={disabled}
                      onChange={() => toggleSelected(perm.key)}
                    />
                    Allow
                  </label>
                ) : (
                  <div className="flex items-center gap-4">
                    <label
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium",
                        grantSet.has(perm.key) ? "text-emerald-700" : "text-slate-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={grantSet.has(perm.key)}
                        disabled={disabled}
                        onChange={(e) => setGrant(perm.key, e.target.checked)}
                      />
                      Grant
                    </label>
                    <label
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium",
                        denySet.has(perm.key) ? "text-red-700" : "text-slate-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={denySet.has(perm.key)}
                        disabled={disabled}
                        onChange={(e) => setDeny(perm.key, e.target.checked)}
                      />
                      Deny
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
