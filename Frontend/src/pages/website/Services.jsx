import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, Eye, Layers } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { websiteServiceService, SERVICE_STATUSES } from "../../services/websiteServiceService";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "");

const statusTone = {
  DRAFT: "bg-amber-50 text-warning",
  PUBLISHED: "bg-emerald-50 text-success",
  INACTIVE: "bg-slate-100 text-muted",
};

function mediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiOrigin}${url}`;
}

export function WebsiteServices() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await websiteServiceService.list({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit,
      });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page, limit]);

  const handleStatus = async (row, status) => {
    try {
      await websiteServiceService.changeStatus(row._id, status);
      toast.success(`Marked ${status}`);
      fetchList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete service "${row.mainHeading}"?`)) return;
    try {
      await websiteServiceService.remove(row._id);
      toast.success("Service deleted");
      fetchList();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-page-title">Services</h1>
          <p className="ui-page-subtitle">Website services — SEO, content, FAQ, include/exclude & images.</p>
        </div>
        <Link to="/dashboard/website/services/create">
          <Button>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Service
          </Button>
        </Link>
      </div>

      <div className="ui-filter-bar flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search heading, slug, keywords…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="ui-select w-auto min-w-[140px]"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All status</option>
          {SERVICE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-16 text-center text-[13px] text-muted">
          Loading services…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <Layers className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-[13px] text-muted">No services yet.</p>
          <Link
            to="/dashboard/website/services/create"
            className="mt-2 text-[13px] font-medium text-primary hover:underline"
          >
            Create your first service
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <article
              key={row._id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition hover:border-primary/25"
            >
              <div className="relative aspect-[16/9] bg-slate-100">
                {row.mainImage?.url ? (
                  <img
                    src={mediaUrl(row.mainImage.url)}
                    alt={row.mainHeading}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <Layers className="h-10 w-10" />
                  </div>
                )}
                <span
                  className={cn(
                    "absolute left-2 top-2 ui-badge font-semibold",
                    statusTone[row.status] || statusTone.DRAFT
                  )}
                >
                  {row.status}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                {row.shortHeading ? (
                  <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                    {row.shortHeading}
                  </p>
                ) : null}
                <h2 className="line-clamp-2 text-[14px] font-semibold text-navy">{row.mainHeading}</h2>
                <p className="line-clamp-2 text-[12px] text-muted">
                  {row.shortDescription || "No short description"}
                </p>
                <p className="truncate font-mono text-[11px] text-slate-400">/{row.slug}</p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <select
                    className="ui-select h-8 w-auto min-w-0 px-2 text-[11px]"
                    value={row.status}
                    onChange={(e) => handleStatus(row, e.target.value)}
                  >
                    {SERVICE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-0.5">
                    <Link to={`/dashboard/website/services/${row._id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
                        <Eye className="h-3.5 w-3.5 text-muted" />
                      </Button>
                    </Link>
                    <Link to={`/dashboard/website/services/${row._id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
                        <Edit2 className="h-3.5 w-3.5 text-muted" />
                      </Button>
                    </Link>
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
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
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
