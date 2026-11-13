import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Shield,
  KeyRound,
  Edit2,
  Trash2,
  FileText,
  Filter,
  Eye,
  Users,
  MapPin,
  Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Pager } from "../../components/ui/Pager";
import { Modal } from "../../components/ui/Modal";
import {
  FormField,
  FormSection,
  PageHeader,
  StatusBadge,
  InfoRow,
  EmptyState,
} from "../../components/ui/FormField";
import { PermissionMatrix } from "../../components/organization/PermissionMatrix";
import { Can } from "../../components/auth/Can";
import { useAuth } from "../../context/AuthContext";
import { staffService } from "../../services/staffService";
import api from "../../services/api";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "");

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  password: "",
  department: "",
  designation: "",
  status: "ACTIVE",
  address: {
    street: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
  },
});

const emptyFilters = () => ({
  search: "",
  status: "",
  department: "",
  designation: "",
  city: "",
});

const ADDRESS_FIELDS = [
  { key: "street", label: "Street / house" },
  { key: "locality", label: "Locality" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
];

function fileUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_ORIGIN}${url}`;
}

function formatAddress(address) {
  return [address?.street, address?.locality, address?.city, address?.state, address?.pincode]
    .filter(Boolean)
    .join(", ");
}

function Avatar({ name }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#1e40af] text-sm font-bold text-white">
      {(name || "E").charAt(0).toUpperCase()}
    </div>
  );
}

export function StaffUsers() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [catalog, setCatalog] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [docRows, setDocRows] = useState([{ name: "", file: null }]);
  const [removeDocumentIds, setRemoveDocumentIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const [viewUser, setViewUser] = useState(null);

  const [permUser, setPermUser] = useState(null);
  const [grant, setGrant] = useState([]);
  const [deny, setDeny] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const designationOptions = useMemo(() => {
    if (!form.department) return designations;
    return designations.filter(
      (d) => String(d.department?._id || d.department) === String(form.department)
    );
  }, [designations, form.department]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await staffService.list({
        search: applied.search || undefined,
        status: applied.status || undefined,
        department: applied.department || undefined,
        designation: applied.designation || undefined,
        city: applied.city || undefined,
        page,
        limit,
      });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [applied, page, limit]);

  useEffect(() => {
    staffService
      .catalog()
      .then((res) => setCatalog(res.data.data?.groups || []))
      .catch(() => setCatalog([]));
    api
      .get("/admin/departments/list", { params: { status: "ACTIVE", limit: 100 } })
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setDepartments([]));
    api
      .get("/admin/designations/list", { params: { status: "ACTIVE", limit: 100 } })
      .then((res) => setDesignations(res.data.data || []))
      .catch(() => setDesignations([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDocRows([{ name: "", file: null }]);
    setRemoveDocumentIds([]);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setViewUser(null);
    setEditing(row);
    setForm({
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      password: "",
      department: row.department?._id || row.department || "",
      designation: row.designation?._id || row.designation || "",
      status: row.status || "ACTIVE",
      address: {
        street: row.address?.street || "",
        locality: row.address?.locality || "",
        city: row.address?.city || "",
        state: row.address?.state || "",
        pincode: row.address?.pincode || "",
      },
    });
    setDocRows([{ name: "", file: null }]);
    setRemoveDocumentIds([]);
    setFormOpen(true);
  };

  const openPermissions = (row) => {
    setViewUser(null);
    setPermUser(row);
    setGrant(row.permissionOverrides?.grant || row.effective?.grant || []);
    setDeny(row.permissionOverrides?.deny || row.effective?.deny || []);
  };

  const savePermissions = async () => {
    if (!permUser) return;
    try {
      setSavingPerms(true);
      await staffService.setPermissions(permUser._id, { grant, deny });
      toast.success("Permissions assigned");
      setPermUser(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const files = docRows.filter((d) => d.file);
    for (const d of files) {
      if (!d.name?.trim()) {
        toast.error("Har document ka name likho");
        return;
      }
    }

    const payload = {
      name: form.name,
      phone: form.phone,
      department: form.department || null,
      designation: form.designation || null,
      status: form.status,
      address: form.address,
    };

    try {
      setSaving(true);
      if (editing) {
        if (form.password) payload.password = form.password;
        if (removeDocumentIds.length) payload.removeDocumentIds = removeDocumentIds;
        await staffService.update(editing._id, payload, files);
        toast.success("Employee updated");
      } else {
        payload.email = form.email;
        payload.password = form.password;
        await staffService.create(payload, files);
        toast.success("Employee created");
      }
      setFormOpen(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete employee "${row.name}"? Documents will also be removed.`)) return;
    try {
      await staffService.remove(row._id);
      toast.success("Employee deleted");
      setViewUser(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title="Employees"
        description="Staff accounts, documents, and micro permissions."
        actions={
          <Can permission="staff.create">
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add employee
            </Button>
          </Can>
        }
      />

      <form
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ ...filters });
          setPage(1);
        }}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search name, email, phone, city…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <Select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </Select>
          <Select
            value={filters.department}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>

        {showMoreFilters ? (
          <div className="grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-3">
            <Select
              value={filters.designation}
              onChange={(e) => setFilters((f) => ({ ...f, designation: e.target.value }))}
            >
              <option value="">All designations</option>
              {designations.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Filter by city"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">Apply</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFilters(emptyFilters());
              setApplied(emptyFilters());
              setPage(1);
            }}
          >
            Clear
          </Button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => setShowMoreFilters((v) => !v)}
          >
            <Filter className="h-4 w-4" />
            {showMoreFilters ? "Less filters" : "More filters"}
          </button>
          <span className="ml-auto text-[11px] text-muted">{total} employees</span>
        </div>
      </form>

      <div className="ui-table-wrap">
        <div className="overflow-x-auto">
          <table className="ui-table text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Loading employees…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No employees found"
                      description="Add a staff member or clear filters."
                      action={
                        can("staff.create") ? (
                          <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add employee
                          </Button>
                        ) : null
                      }
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => setViewUser(row)}
                      >
                        <Avatar name={row.name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 hover:text-primary">
                            {row.name}
                          </p>
                          <p className="truncate text-[11px] text-muted">
                            {row.email}
                          </p>
                          <p className="text-xs text-slate-400">{row.phone}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800">{row.designation?.name || "—"}</p>
                      <p className="text-[11px] text-muted">{row.department?.name || "No department"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.address?.city || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        <FileText className="h-3 w-3" />
                        {(row.documents || []).length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p>{(row.permissions || []).length} permissions</p>
                      <p className="text-slate-400">
                        +{(row.permissionOverrides?.grant || []).length} / −
                        {(row.permissionOverrides?.deny || []).length}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View"
                          onClick={() => setViewUser(row)}
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Can permission="staff.permissions">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Permissions"
                            onClick={() => openPermissions(row)}
                          >
                            <KeyRound className="h-4 w-4 text-amber-600" />
                          </Button>
                        </Can>
                        <Can permission="staff.edit">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => openEdit(row)}
                          >
                            <Edit2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        </Can>
                        <Can permission="staff.delete">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </Can>
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

      <Modal
        open={Boolean(viewUser)}
        onClose={() => setViewUser(null)}
        title={viewUser?.name || "Employee"}
        description="Employee profile details"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setViewUser(null)}>
              Close
            </Button>
            {viewUser && can("staff.permissions") ? (
              <Button
                variant="outline"
                onClick={() => openPermissions(viewUser)}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Permissions
              </Button>
            ) : null}
            {viewUser && can("staff.edit") ? (
              <Button onClick={() => openEdit(viewUser)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : null}
          </>
        }
      >
        {viewUser ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Avatar name={viewUser.name} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{viewUser.name}</p>
                <p className="text-sm text-slate-500">
                  {viewUser.email} · {viewUser.phone}
                </p>
              </div>
              <StatusBadge status={viewUser.status} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Department" value={viewUser.department?.name} />
              <InfoRow label="Designation" value={viewUser.designation?.name} />
              <InfoRow
                label="Permissions"
                value={`${(viewUser.permissions || []).length} active · +${
                  (viewUser.permissionOverrides?.grant || []).length
                } grant · −${(viewUser.permissionOverrides?.deny || []).length} deny`}
              />
              <InfoRow
                className="sm:col-span-2"
                label="Address"
                value={formatAddress(viewUser.address) || "—"}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Documents
              </p>
              {(viewUser.documents || []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  No documents uploaded
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {viewUser.documents.map((doc) => (
                    <a
                      key={doc._id}
                      href={fileUrl(doc.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-navy">
                          {doc.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {doc.originalName || "Open file"}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit employee" : "Add employee"}
        description={
          editing
            ? "Update profile, address, status, or documents."
            : "Create login, address, and optional documents."
        }
        size="xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="employee-form" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update employee" : "Create employee"}
            </Button>
          </>
        }
      >
        <form id="employee-form" onSubmit={submitForm} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Phone" required>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Email" required hint={editing ? "Email cannot be changed" : null}>
              <Input
                type="email"
                value={form.email}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required={!editing}
              />
            </FormField>
            <FormField
              label={editing ? "New password" : "Password"}
              required={!editing}
              hint={editing ? "Leave blank to keep current password" : "Min 6 characters"}
            >
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required={!editing}
              />
            </FormField>
            <FormField label="Department">
              <Select
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value, designation: "" }))
                }
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Designation">
              <Select
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              >
                <option value="">Select designation</option>
                {designationOptions.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            {editing ? (
              <FormField label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BLOCKED">Blocked</option>
                </Select>
              </FormField>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MapPin className="h-4 w-4 text-primary" />
              Address
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ADDRESS_FIELDS.map((field) => (
                <FormField key={field.key} label={field.label} required>
                  <Input
                    value={form.address[field.key]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        address: { ...f.address, [field.key]: e.target.value },
                      }))
                    }
                    required
                  />
                </FormField>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Briefcase className="h-4 w-4 text-primary" />
                Documents
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDocRows((rows) => [...rows, { name: "", file: null }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            {editing?.documents?.length ? (
              <ul className="mb-3 space-y-2">
                {editing.documents
                  .filter((d) => !removeDocumentIds.includes(String(d._id)))
                  .map((d) => (
                    <li
                      key={d._id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <a
                        href={fileUrl(d.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-2 text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{d.name}</span>
                      </a>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                        onClick={() =>
                          setRemoveDocumentIds((ids) => [...ids, String(d._id)])
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
              </ul>
            ) : null}

            <div className="space-y-2">
              {docRows.map((row, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-xl border border-dashed border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <FormField label="Document name">
                    <Input
                      placeholder="e.g. Aadhaar"
                      value={row.name}
                      onChange={(e) =>
                        setDocRows((rows) =>
                          rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r))
                        )
                      }
                    />
                  </FormField>
                  <FormField label="File">
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        setDocRows((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, file: e.target.files?.[0] || null } : r
                          )
                        )
                      }
                    />
                  </FormField>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={docRows.length === 1}
                      onClick={() => setDocRows((rows) => rows.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">Image or PDF · max 8MB each</p>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(permUser)}
        onClose={() => setPermUser(null)}
        title={`Permissions — ${permUser?.name || ""}`}
        description="Grant = allow · Deny = block even if designation template has it"
        size="2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPermUser(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={savingPerms} onClick={savePermissions}>
              <Shield className="mr-2 h-4 w-4" />
              {savingPerms ? "Saving…" : "Save permissions"}
            </Button>
          </>
        }
      >
        <PermissionMatrix
          groups={catalog}
          mode="overrides"
          grant={grant}
          deny={deny}
          onChangeGrantDeny={({ grant: g, deny: d }) => {
            setGrant(g);
            setDeny(d);
          }}
          disabled={savingPerms || !can("staff.permissions")}
        />
      </Modal>
    </div>
  );
}
