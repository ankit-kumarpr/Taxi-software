import { useEffect, useState } from "react";
import { Search, Edit2, Trash2, Shield, RefreshCw, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { Can } from "../../components/auth/Can";
import { useAuth } from "../../context/AuthContext";
import { permissionService } from "../../services/permissionService";
import { cn } from "../../utils/cn";

export function Permissions() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [groupKey, setGroupKey] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    label: "",
    groupKey: "",
    groupLabel: "",
    description: "",
    status: "ACTIVE",
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await permissionService.list({
        search: search || undefined,
        status: status || undefined,
        groupKey: groupKey || undefined,
        page,
        limit,
      });
      setRows(res.data.data || []);
      setGroupOptions(res.data.groups || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, status, groupKey, page, limit]);

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      label: row.label || "",
      groupKey: row.groupKey || "",
      groupLabel: row.groupLabel || "",
      description: row.description || "",
      status: row.status || "ACTIVE",
      sortOrder: row.sortOrder || 0,
    });
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      await permissionService.update(editing._id, {
        label: form.label,
        groupKey: form.groupKey,
        groupLabel: form.groupLabel,
        description: form.description,
        status: form.status,
        sortOrder: Number(form.sortOrder) || 0,
      });
      toast.success("Permission updated");
      setFormOpen(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete permission "${row.key}"? Employees using it will keep the old key until reassigned.`)) {
      return;
    }
    try {
      await permissionService.remove(row._id);
      toast.success("Deleted");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await permissionService.seed();
      toast.success(res.data.message || "Catalog synced");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="ui-page-title">Permissions</h1>
            <p className="text-sm text-slate-500">
              Default catalog for employees & designations. Use Sync defaults if list is empty.
            </p>
          </div>
        </div>
        <Can permission="permissions.manage">
          <Button variant="outline" onClick={handleSeed} disabled={seeding}>
            <RefreshCw className={cn("mr-2 h-4 w-4", seeding && "animate-spin")} />
            Sync defaults
          </Button>
        </Can>
      </div>

      <div className="flex flex-col gap-3 ui-filter-bar sm:flex-row sm:flex-wrap">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search key, label, group…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={groupKey}
          onChange={(e) => {
            setGroupKey(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All groups</option>
          {groupOptions.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label} ({g.count})
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
          <Filter className="h-3.5 w-3.5" />
          {total} permissions
        </span>
      </div>

      <div className="ui-table-wrap">
        <div className="overflow-x-auto">
          <table className="ui-table text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    <p>No permissions in database yet.</p>
                    {can("permissions.manage") ? (
                      <Button className="mt-3" onClick={handleSeed} disabled={seeding}>
                        Sync default catalog
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-violet-700">{row.key}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{row.label}</p>
                      {row.description ? (
                        <p className="text-[11px] text-muted">{row.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.groupLabel}
                      <p className="font-mono text-[10px] text-slate-400">{row.groupKey}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          row.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {can("permissions.manage") ? (
                          <>
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row)}>
                              <Edit2 className="h-4 w-4 text-slate-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => handleDelete(row)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager
          page={page}
          pages={pages}
          limit={limit}
          total={total}
          onPage={setPage}
          onLimit={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </div>

      {formOpen && editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-navy/35 backdrop-blur-[1px]" onClick={() => setFormOpen(false)} aria-label="Close" />
          <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-border bg-surface p-4 shadow-xl sm:rounded-xl sm:p-5">
            <h2 className="text-[15px] font-semibold text-navy">Edit permission</h2>
            <p className="mt-0.5 font-mono text-[11px] text-primary">{editing.key}</p>
            <form onSubmit={submit} className="mt-3 space-y-3">
              <Input
                placeholder="Label *"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="groupKey"
                  value={form.groupKey}
                  onChange={(e) => setForm((f) => ({ ...f, groupKey: e.target.value }))}
                  required
                />
                <Input
                  placeholder="Group label"
                  value={form.groupLabel}
                  onChange={(e) => setForm((f) => ({ ...f, groupLabel: e.target.value }))}
                  required
                />
              </div>
              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <Input
                  type="number"
                  placeholder="Sort order"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
