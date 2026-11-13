import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileWarning, Mail, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { vendorService } from "../../services/vendorService";
import { cn } from "../../utils/cn";

const formatDate = (value) => {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function PendingVendorDocuments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const res = await vendorService.pendingDocuments({
        page,
        limit,
        search: search || undefined,
      });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load pending documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const sendReminders = async () => {
    if (
      !window.confirm(
        "Send reminder emails now to vendors whose last reminder was 3+ days ago (or never)?"
      )
    ) {
      return;
    }
    try {
      setSending(true);
      const res = await vendorService.sendDocumentReminders();
      toast.success(res.data.message || "Reminders sent");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reminders");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ui-page-title">Pending documents</h1>
          <p className="ui-page-subtitle">
            Jo vendors ke docs incomplete hain (VERIFIED ho ya na ho). Har 3 din register mail pe reminder.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button type="button" onClick={sendReminders} disabled={sending}>
            <Mail className="mr-2 h-4 w-4" />
            {sending ? "Sending…" : "Send due reminders"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
        <FileWarning className="h-5 w-5 shrink-0 text-amber-700" />
        <p className="text-sm text-amber-950">
          System checks hourly. Each vendor gets at most one reminder every{" "}
          <strong>3 days</strong> listing exactly which documents are still pending.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search vendor, email, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="ui-table-wrap">
        <div className="overflow-x-auto">
          <table className="ui-table text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Pending documents</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Last reminder</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No vendors with pending documents.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="align-top hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{row.companyName}</p>
                      <p className="text-xs text-primary">{row.vendorId}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {row.vendorType?.name || "—"} · {row.documentVerificationStatus}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{row.email}</p>
                      <p className="text-[11px] text-muted">{row.mobileNumber}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="mb-1.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                        {row.pendingCount} pending
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {(row.pendingDocuments || []).map((d) => (
                          <li key={d.key} className="text-xs text-red-700">
                            • {d.label}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-2.5">
                      {(row.uploadedDocuments || []).length === 0 ? (
                        <span className="text-xs text-slate-400">None yet</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {row.uploadedDocuments.map((d) => (
                            <li key={d.key} className="text-xs text-emerald-700">
                              • {d.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p>{formatDate(row.documentReminderSentAt)}</p>
                      <p className="mt-0.5 text-slate-400">
                        Sent {row.documentReminderCount || 0} time(s)
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        to={`/dashboard/vendors/${row._id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
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
    </div>
  );
}
