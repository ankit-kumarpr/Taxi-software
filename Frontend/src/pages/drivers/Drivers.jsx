import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Shield, ShieldOff, Trash2, Eye, Store } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { driverService } from "../../services/driverService";
import { vendorService } from "../../services/vendorService";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

export function Drivers() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "ADMIN";

  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [unassigned, setUnassigned] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAdmin) return;
    vendorService
      .list({ status: "ACTIVE", documentVerificationStatus: "VERIFIED", limit: 200, page: 1 })
      .then((res) => setVendors(res.data.data || []))
      .catch(() => {});
  }, [isAdmin]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        status: statusFilter,
        page,
        limit,
      };
      if (isAdmin) {
        if (unassigned) params.unassigned = "1";
        else if (vendorFilter) params.assignedVendor = vendorFilter;
      }
      const res = await driverService.list(params);
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [search, statusFilter, vendorFilter, unassigned, page, limit, isAdmin]);

  const handleToggleStatus = async (row) => {
    try {
      const status = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await driverService.changeStatus(row._id, status);
      toast.success(`Driver marked ${status}`);
      fetchList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete driver "${row.name}" (${row.driverId})?`)) return;
    try {
      await driverService.remove(row._id);
      toast.success("Driver deleted");
      fetchList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete driver");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-page-title">Drivers</h1>
          <p className="ui-page-subtitle">
            {isAdmin
              ? "Register and manage drivers. Assign to a vendor or leave unassigned."
              : "Register and manage drivers under your vendor account."}
          </p>
        </div>
        <Link to="/dashboard/drivers/register">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Register Driver
          </Button>
        </Link>
      </div>

      <div
        className={cn(
          "grid gap-3 ui-filter-bar",
          isAdmin ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-3"
        )}
      >
        <div className={cn("relative", isAdmin ? "xl:col-span-2" : "xl:col-span-2")}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search name, mobile, email, driver ID, DL..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="ui-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        {isAdmin ? (
          <>
            <select
              className="ui-select"
              value={vendorFilter}
              disabled={unassigned}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.companyName} ({v.vendorId})
                </option>
              ))}
            </select>
            <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={unassigned}
                onChange={(e) => {
                  setUnassigned(e.target.checked);
                  if (e.target.checked) setVendorFilter("");
                  setPage(1);
                }}
              />
              Unassigned only
            </label>
          </>
        ) : null}
      </div>

      <div className="ui-table-wrap">
        <div className="overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Driver ID
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Name
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Mobile
                </th>
                {isAdmin ? (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Vendor
                  </th>
                ) : null}
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Completed trips
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                  DL Expiry
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Status / KYC
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-[13px] text-muted">
                    Loading drivers...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-[13px] text-muted">
                    No drivers found.{" "}
                    <Link to="/dashboard/drivers/register" className="text-primary hover:underline">
                      Register one
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-[13px] font-semibold text-primary">{row.driverId}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/dashboard/drivers/${row._id}`}
                        className="text-[13px] font-medium text-navy hover:text-primary"
                      >
                        {row.name}
                      </Link>
                      <div className="text-[11px] text-muted">{row.email || "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-600">{row.mobileNumber}</td>
                    {isAdmin ? (
                      <td className="px-3 py-2.5 text-[13px] text-slate-600">
                        {row.assignedVendor ? (
                          <>
                            <div className="font-medium">{row.assignedVendor.companyName}</div>
                            <div className="text-[11px] text-muted">{row.assignedVendor.vendorId}</div>
                          </>
                        ) : (
                          <span className="text-amber-600">Unassigned</span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        {row.completedTrips ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-600">
                      {row.dlExpiryDate
                        ? new Date(row.dlExpiryDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                            row.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          )}
                        >
                          {row.status}
                        </span>
                        <span
                          className={cn(
                            "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            row.documentVerificationStatus === "VERIFIED" &&
                              "bg-emerald-100 text-emerald-800",
                            row.documentVerificationStatus === "REJECTED" &&
                              "bg-red-100 text-red-800",
                            (!row.documentVerificationStatus ||
                              row.documentVerificationStatus === "PENDING") &&
                              "bg-amber-100 text-amber-800"
                          )}
                          title={
                            row.documentVerificationStatus === "REJECTED" &&
                            row.documentRejectionReason
                              ? row.documentRejectionReason
                              : undefined
                          }
                        >
                          KYC:{" "}
                          {row.documentVerificationStatus === "VERIFIED"
                            ? "Verified"
                            : row.documentVerificationStatus === "REJECTED"
                              ? "Rejected"
                              : "Pending"}
                        </span>
                        {row.convertedToVendor ? (
                          <span className="text-[10px] font-semibold text-primary">Became vendor</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/dashboard/drivers/${row._id}`}>
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Button>
                        </Link>
                        <Link to={`/dashboard/drivers/${row._id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        </Link>
                        {isAdmin && row.status === "ACTIVE" && !row.convertedToVendor ? (
                          <Link to={`/dashboard/drivers/${row._id}/become-vendor`}>
                            <Button variant="ghost" size="icon" title="Become Vendor">
                              <Store className="h-4 w-4 text-accent" />
                            </Button>
                          </Link>
                        ) : null}
                        <Button variant="ghost" size="icon" title="Toggle status" onClick={() => handleToggleStatus(row)}>
                          {row.status === "ACTIVE" ? (
                            <ShieldOff className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Shield className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(row)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
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
