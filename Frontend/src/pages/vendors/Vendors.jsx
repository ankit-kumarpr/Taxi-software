import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Shield,
  ShieldOff,
  Trash2,
  Eye,
  BadgeCheck,
  BadgeX,
  Filter,
  Percent,
  Save,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import {
  vendorService,
  vendorTypeService,
  VENDOR_ACCOUNT_STATUSES,
  VENDOR_VERIFY_STATUSES,
  VENDOR_LIST_PAGES,
  vendorAccountLabel,
  vendorVerifyLabel,
} from "../../services/vendorService";
import { useVendorCounts } from "../../context/VendorCountsContext";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest created" },
  { value: "createdAt:asc", label: "Oldest created" },
  { value: "companyName:asc", label: "Company A–Z" },
  { value: "vendorId:asc", label: "Vendor ID A–Z" },
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "vendorRating:desc", label: "Rating high → low" },
  { value: "walletBalance:desc", label: "Wallet high → low" },
  { value: "status:asc", label: "Status A–Z" },
  { value: "documentVerificationStatus:asc", label: "Verify A–Z" },
];

const emptyFilters = () => ({
  search: "",
  status: "",
  documentVerificationStatus: "",
  vendorType: "",
  businessModel: "",
  city: "",
  state: "",
  country: "",
  createdFrom: "",
  createdTo: "",
  ratingMin: "",
  ratingMax: "",
  walletMin: "",
  walletMax: "",
  sort: "createdAt:desc",
});

export function Vendors() {
  const { status: statusParam, verify: verifyParam } = useParams();
  const navigate = useNavigate();
  const { refresh: refreshCounts } = useVendorCounts();

  const lockedStatus = useMemo(() => {
    if (!statusParam) return "";
    return VENDOR_ACCOUNT_STATUSES.some((s) => s.value === statusParam) ? statusParam : "";
  }, [statusParam]);

  const lockedVerify = useMemo(() => {
    if (!verifyParam) return "";
    return VENDOR_VERIFY_STATUSES.some((s) => s.value === verifyParam) ? verifyParam : "";
  }, [verifyParam]);

  const pageMeta = useMemo(() => {
    if (lockedStatus) {
      return {
        title: vendorAccountLabel(lockedStatus),
        subtitle: `Vendors with account status “${vendorAccountLabel(lockedStatus)}”.`,
      };
    }
    if (lockedVerify) {
      return {
        title: vendorVerifyLabel(lockedVerify),
        subtitle: `Vendors with verification “${lockedVerify}”.`,
      };
    }
    return {
      title: "All Vendors",
      subtitle: "Search and filter every vendor with pagination.",
    };
  }, [lockedStatus, lockedVerify]);

  const switcherValue = lockedStatus
    ? `status-${lockedStatus}`
    : lockedVerify
      ? `verify-${lockedVerify}`
      : "all";

  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [defaultShare, setDefaultShare] = useState("20");
  const [fixedCount, setFixedCount] = useState(0);
  const [savingDefault, setSavingDefault] = useState(false);
  const [rowShareDrafts, setRowShareDrafts] = useState({});
  const [savingRowId, setSavingRowId] = useState("");

  const loadFixedShareSettings = async () => {
    try {
      const res = await vendorService.getFixedShareSettings();
      const data = res.data.data || {};
      setDefaultShare(String(data.defaultFixedCompanySharePercent ?? 20));
      setFixedCount(data.fixedVendorCount || 0);
    } catch {
      /* non-blocking */
    }
  };

  useEffect(() => {
    loadFixedShareSettings();
  }, []);

  useEffect(() => {
    if (statusParam && !VENDOR_ACCOUNT_STATUSES.some((s) => s.value === statusParam)) {
      toast.error("Invalid vendor status");
      navigate("/dashboard/vendors", { replace: true });
    }
    if (verifyParam && !VENDOR_VERIFY_STATUSES.some((s) => s.value === verifyParam)) {
      toast.error("Invalid verification status");
      navigate("/dashboard/vendors", { replace: true });
    }
  }, [statusParam, verifyParam, navigate]);

  useEffect(() => {
    setFilters(emptyFilters());
    setPage(1);
  }, [lockedStatus, lockedVerify]);

  useEffect(() => {
    vendorTypeService
      .dropdown()
      .then((res) => setTypes(res.data.data || []))
      .catch(() => {});
  }, []);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      const [sortBy, sortOrder] = String(filters.sort || "createdAt:desc").split(":");
      const res = await vendorService.list({
        search: filters.search || undefined,
        status: lockedStatus || filters.status || undefined,
        documentVerificationStatus: lockedVerify || filters.documentVerificationStatus || undefined,
        vendorType: filters.vendorType || undefined,
        businessModel: filters.businessModel || undefined,
        city: filters.city || undefined,
        state: filters.state || undefined,
        country: filters.country || undefined,
        createdFrom: filters.createdFrom || undefined,
        createdTo: filters.createdTo || undefined,
        ratingMin: filters.ratingMin || undefined,
        ratingMax: filters.ratingMax || undefined,
        walletMin: filters.walletMin || undefined,
        walletMax: filters.walletMax || undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedStatus, lockedVerify, filters, page, limit]);

  const handleToggleStatus = async (row) => {
    try {
      const status = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await vendorService.changeStatus(row._id, status);
      toast.success(`Vendor marked ${status}`);
      fetchList();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete vendor "${row.companyName}" (${row.vendorId})?`)) return;
    try {
      await vendorService.remove(row._id);
      toast.success("Vendor deleted");
      fetchList();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete vendor");
    }
  };

  const handleVerify = async (row, documentVerificationStatus) => {
    const label =
      documentVerificationStatus === "VERIFIED"
        ? "verify"
        : documentVerificationStatus === "REJECTED"
          ? "reject"
          : "mark pending";
    if (!window.confirm(`Are you sure you want to ${label} "${row.companyName}"?`)) return;
    try {
      const res = await vendorService.verify(row._id, documentVerificationStatus);
      toast.success(res.data.message || "Updated");
      fetchList();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update verification");
    }
  };

  const saveDefaultShare = async (applyToAllFixed = false) => {
    const num = Number(defaultShare);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      toast.error("Default company share must be between 0 and 100");
      return;
    }
    if (applyToAllFixed) {
      const ok = window.confirm(
        `Apply ${num}% company share to ALL ${fixedCount} FIXED vendor(s)? Individual overrides will be replaced.`
      );
      if (!ok) return;
    }
    try {
      setSavingDefault(true);
      const res = await vendorService.updateFixedShareSettings({
        defaultFixedCompanySharePercent: num,
        applyToAllFixed,
      });
      toast.success(res.data.message || "Saved");
      setDefaultShare(String(res.data.data?.defaultFixedCompanySharePercent ?? num));
      setFixedCount(res.data.data?.fixedVendorCount ?? fixedCount);
      if (applyToAllFixed) fetchList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save default %");
    } finally {
      setSavingDefault(false);
    }
  };

  const rowShareValue = (row) => {
    if (rowShareDrafts[row._id] !== undefined) return rowShareDrafts[row._id];
    return row.companySharePercent != null ? String(row.companySharePercent) : "";
  };

  const saveRowShare = async (row) => {
    const raw = rowShareValue(row);
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      toast.error("Company share must be between 0 and 100");
      return;
    }
    try {
      setSavingRowId(row._id);
      const res = await vendorService.setBusinessModel(row._id, {
        businessModel: "FIXED",
        companySharePercent: num,
      });
      toast.success(res.data.message || "Updated");
      setRowShareDrafts((prev) => {
        const next = { ...prev };
        delete next[row._id];
        return next;
      });
      fetchList();
      loadFixedShareSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update %");
    } finally {
      setSavingRowId("");
    }
  };

  const onSwitcherChange = (key) => {
    const pageDef = VENDOR_LIST_PAGES.find((p) => p.key === key) || VENDOR_LIST_PAGES[0];
    navigate(pageDef.href);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-page-title">{pageMeta.title}</h1>
          <p className="ui-page-subtitle">{pageMeta.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ui-select w-auto min-w-[150px]"
            value={switcherValue}
            onChange={(e) => onSwitcherChange(e.target.value)}
          >
            {VENDOR_LIST_PAGES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <Link to="/dashboard/vendors/register">
            <Button>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Register
            </Button>
          </Link>
        </div>
      </div>

      <div className="ui-filter-bar space-y-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search vendor, email, mobile, GST…"
              className="pl-8"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!lockedStatus ? (
              <select
                className="ui-select w-auto min-w-[130px]"
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value)}
              >
                <option value="">Account</option>
                {VENDOR_ACCOUNT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="ui-badge bg-slate-100 text-muted">{vendorAccountLabel(lockedStatus)}</span>
            )}

            {!lockedVerify ? (
              <select
                className="ui-select w-auto min-w-[120px]"
                value={filters.documentVerificationStatus}
                onChange={(e) => setFilter("documentVerificationStatus", e.target.value)}
              >
                <option value="">Verify</option>
                {VENDOR_VERIFY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="ui-badge bg-amber-50 text-warning">{lockedVerify}</span>
            )}

            <select
              className="ui-select w-auto min-w-[110px]"
              value={filters.vendorType}
              onChange={(e) => setFilter("vendorType", e.target.value)}
            >
              <option value="">Type</option>
              {types.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              className="ui-select w-auto min-w-[100px]"
              value={filters.businessModel}
              onChange={(e) => setFilter("businessModel", e.target.value)}
            >
              <option value="">Deal</option>
              <option value="FIXED">Fixed</option>
              <option value="BID">Bid</option>
              <option value="UNSET">Not set</option>
            </select>

            <select
              className="ui-select w-auto min-w-[130px]"
              value={filters.sort}
              onChange={(e) => setFilter("sort", e.target.value)}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <Button type="button" variant="outline" size="sm" onClick={() => setShowMoreFilters((v) => !v)}>
              <Filter className="mr-1 h-3.5 w-3.5" />
              {showMoreFilters ? "Less" : "More"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(emptyFilters());
                setPage(1);
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        {showMoreFilters ? (
          <div className="grid gap-2 border-t border-border pt-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="City" value={filters.city} onChange={(e) => setFilter("city", e.target.value)} />
            <Input placeholder="State" value={filters.state} onChange={(e) => setFilter("state", e.target.value)} />
            <Input placeholder="Country" value={filters.country} onChange={(e) => setFilter("country", e.target.value)} />
            <Input type="date" value={filters.createdFrom} onChange={(e) => setFilter("createdFrom", e.target.value)} title="Created from" />
            <Input type="date" value={filters.createdTo} onChange={(e) => setFilter("createdTo", e.target.value)} title="Created to" />
            <Input type="number" min="0" max="5" step="0.1" placeholder="Rating min" value={filters.ratingMin} onChange={(e) => setFilter("ratingMin", e.target.value)} />
            <Input type="number" min="0" max="5" step="0.1" placeholder="Rating max" value={filters.ratingMax} onChange={(e) => setFilter("ratingMax", e.target.value)} />
            <Input type="number" min="0" placeholder="Wallet min" value={filters.walletMin} onChange={(e) => setFilter("walletMin", e.target.value)} />
            <Input type="number" min="0" placeholder="Wallet max" value={filters.walletMax} onChange={(e) => setFilter("walletMax", e.target.value)} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Percent className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-navy">Default FIXED company share</p>
            <p className="text-[11px] text-muted">
              New FIXED deals · {fixedCount} FIXED vendor{fixedCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="h-8 w-20 px-2 text-[12px]"
              value={defaultShare}
              onChange={(e) => setDefaultShare(e.target.value)}
              aria-label="Default company share percent"
            />
            <span className="text-[11px] text-muted">%</span>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={savingDefault} onClick={() => saveDefaultShare(false)}>
            <Save className="mr-1 h-3.5 w-3.5" />
            Save
          </Button>
          <Button type="button" size="sm" disabled={savingDefault} onClick={() => saveDefaultShare(true)}>
            Apply all FIXED
          </Button>
        </div>
      </div>

      <div className="ui-table-wrap">
        <div className="overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Type</th>
                <th>Deal %</th>
                <th>Contact</th>
                <th>City</th>
                <th>Verify</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[13px] text-muted">
                    Loading vendors…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[13px] text-muted">
                    No vendors found.{" "}
                    <Link to="/dashboard/vendors/register" className="font-medium text-primary hover:underline">
                      Register one
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <div className="font-mono text-[11px] font-semibold text-primary">{row.vendorId}</div>
                      <Link
                        to={`/dashboard/vendors/${row._id}`}
                        className="text-[13px] font-medium text-navy hover:text-primary"
                      >
                        {row.companyName}
                      </Link>
                      <div className="truncate text-[11px] text-muted">{row.email}</div>
                    </td>
                    <td className="text-muted">{row.vendorType?.name || "—"}</td>
                    <td>
                      {row.businessModel === "FIXED" ? (
                        <div className="flex items-center gap-1">
                          <span className="ui-badge bg-primary-light text-primary">Fixed</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            className="h-7 w-14 px-1.5 text-[11px]"
                            value={rowShareValue(row)}
                            onChange={(e) =>
                              setRowShareDrafts((prev) => ({
                                ...prev,
                                [row._id]: e.target.value,
                              }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-1.5 text-[11px]"
                            disabled={savingRowId === row._id}
                            onClick={() => saveRowShare(row)}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "ui-badge",
                            row.businessModel === "BID" && "bg-violet-50 text-violet-700",
                            !row.businessModel && "bg-amber-50 text-warning"
                          )}
                        >
                          {row.businessModel === "BID" ? "Bid" : "Not set"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="text-[13px] text-navy">{row.contactPersonName || "—"}</div>
                      <div className="text-[11px] text-muted">{row.mobileNumber}</div>
                    </td>
                    <td className="text-muted">{row.city || "—"}</td>
                    <td>
                      <span
                        className={cn(
                          "ui-badge font-medium",
                          row.documentVerificationStatus === "VERIFIED" && "bg-emerald-50 text-success",
                          row.documentVerificationStatus === "REJECTED" && "bg-red-50 text-danger",
                          (!row.documentVerificationStatus || row.documentVerificationStatus === "PENDING") &&
                            "bg-amber-50 text-warning"
                        )}
                      >
                        {row.documentVerificationStatus || "PENDING"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "ui-badge font-medium",
                          row.status === "ACTIVE" ? "bg-emerald-50 text-success" : "bg-red-50 text-danger"
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-0.5">
                        <Link to={`/dashboard/vendors/${row._id}`}>
                          <Button variant="ghost" size="icon" title="View" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5 text-muted" />
                          </Button>
                        </Link>
                        <Link to={`/dashboard/vendors/${row._id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit" className="h-7 w-7">
                            <Edit2 className="h-3.5 w-3.5 text-muted" />
                          </Button>
                        </Link>
                        {row.documentVerificationStatus !== "VERIFIED" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Verify vendor"
                            onClick={() => handleVerify(row, "VERIFIED")}
                          >
                            <BadgeCheck className="h-3.5 w-3.5 text-success" />
                          </Button>
                        ) : null}
                        {row.documentVerificationStatus !== "REJECTED" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Reject verification"
                            onClick={() => handleVerify(row, "REJECTED")}
                          >
                            <BadgeX className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Toggle status"
                          onClick={() => handleToggleStatus(row)}
                        >
                          {row.status === "ACTIVE" ? (
                            <ShieldOff className="h-3.5 w-3.5 text-warning" />
                          ) : (
                            <Shield className="h-3.5 w-3.5 text-success" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Delete"
                          onClick={() => handleDelete(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
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
          pages={totalPages}
          limit={limit}
          total={total}
          onPage={setPage}
          onLimit={(size) => {
            setLimit(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
