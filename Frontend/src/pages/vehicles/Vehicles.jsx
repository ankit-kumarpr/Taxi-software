import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Shield, ShieldOff, Trash2, Eye } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { vehicleService } from "../../services/vehicleService";
import { vendorService } from "../../services/vendorService";
import { carTypeService } from "../../services/carTypeService";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

export function Vehicles() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "ADMIN";

  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [carTypes, setCarTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    carTypeService
      .dropdown()
      .then((res) => setCarTypes(res.data.data || []))
      .catch(() => {});
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
        vehicleType: typeFilter,
        fuelType: fuelFilter,
        page,
        limit,
      };
      if (isAdmin && vendorFilter) params.vendor = vendorFilter;
      const res = await vehicleService.list(params);
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [search, statusFilter, vendorFilter, typeFilter, fuelFilter, page, limit, isAdmin]);

  const handleToggleStatus = async (row) => {
    try {
      const status = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await vehicleService.changeStatus(row._id, status);
      toast.success(`Vehicle marked ${status}`);
      fetchList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete vehicle "${row.vehicleName}" (${row.vehicleNumber})?`)) return;
    try {
      await vehicleService.remove(row._id);
      toast.success("Vehicle deleted");
      fetchList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete vehicle");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-page-title">Vehicles</h1>
          <p className="ui-page-subtitle">
            {isAdmin
              ? "Register and manage vehicles under any vendor."
              : "Register and manage vehicles under your vendor account."}
          </p>
        </div>
        <Link to="/dashboard/vehicles/register">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Register Vehicle
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 ui-filter-bar md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search number, name, vehicle ID..."
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
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Types</option>
          {carTypes.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="ui-select"
          value={fuelFilter}
          onChange={(e) => {
            setFuelFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Fuel</option>
          <option value="PETROL">Petrol</option>
          <option value="DIESEL">Diesel</option>
          <option value="CNG">CNG</option>
          <option value="ELECTRIC">Electric</option>
        </select>
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
          <select
            className="ui-select md:col-span-2 xl:col-span-1"
            value={vendorFilter}
            onChange={(e) => {
              setVendorFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>
                {v.companyName}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="ui-table-wrap">
        <div className="overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">ID</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Vehicle</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Type</th>
                {isAdmin ? (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Vendor</th>
                ) : null}
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Driver</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Fuel</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Status</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-[13px] text-muted">
                    Loading vehicles...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-[13px] text-muted">
                    No vehicles found.{" "}
                    <Link to="/dashboard/vehicles/register" className="text-primary hover:underline">
                      Register one
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-[13px] font-semibold text-primary">{row.vehicleId}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/dashboard/vehicles/${row._id}`}
                        className="text-[13px] font-medium text-navy hover:text-primary"
                      >
                        {row.vehicleName}
                      </Link>
                      <div className="text-xs font-medium text-slate-500">{row.vehicleNumber}</div>
                      {row.rcDetails?.make || row.rcDetails?.owner ? (
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {[row.rcDetails?.make, row.rcDetails?.model].filter(Boolean).join(" ")}
                          {row.rcDetails?.owner ? ` · ${row.rcDetails.owner}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-600">{row.vehicleType?.name || "—"}</td>
                    {isAdmin ? (
                      <td className="px-3 py-2.5 text-[13px] text-slate-600">
                        <div>{row.vendor?.companyName || "—"}</div>
                        <div className="text-[11px] text-muted">{row.vendor?.vendorId}</div>
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5 text-[13px] text-slate-600">
                      {row.assignedDriver ? (
                        <>
                          <div>{row.assignedDriver.name}</div>
                          <div className="text-[11px] text-muted">{row.assignedDriver.driverId}</div>
                        </>
                      ) : (
                        <span className="text-amber-600">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-600">{row.fuelType}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          row.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/dashboard/vehicles/${row._id}`}>
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Button>
                        </Link>
                        <Link to={`/dashboard/vehicles/${row._id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        </Link>
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
