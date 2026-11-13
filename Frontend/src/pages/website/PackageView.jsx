import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { websitePackageService } from "../../services/websitePackageService";
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

function formatPrice(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PackageView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await websitePackageService.get(id);
        if (!cancelled) setPkg(res.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load package");
        navigate("/dashboard/website/packages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading) return <div className="py-16 text-center text-[13px] text-muted">Loading…</div>;
  if (!pkg) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/dashboard/website/packages"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to packages
        </Link>
        <Link to={`/dashboard/website/packages/${pkg._id}/edit`}>
          <Button size="sm">
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>
      </div>

      <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {pkg.mainImage?.url ? (
          <img
            src={mediaUrl(pkg.mainImage.url)}
            alt={pkg.mainHeading}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : null}
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("ui-badge font-semibold", statusTone[pkg.status])}>
              {pkg.status}
            </span>
            <span className="font-mono text-[11px] text-muted">/{pkg.slug}</span>
          </div>
          {pkg.duration ? (
            <p className="text-[12px] font-medium uppercase tracking-wide text-primary">
              {pkg.duration}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold text-navy">{pkg.mainHeading}</h1>
          {pkg.shortDescription ? (
            <p className="text-[13px] text-muted">{pkg.shortDescription}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 text-[12px] text-muted">
            {pkg.destinations?.length ? (
              <span>Destinations: {pkg.destinations.join(", ")}</span>
            ) : null}
            {formatPrice(pkg.priceFrom) ? (
              <span className="font-semibold text-primary">From {formatPrice(pkg.priceFrom)}</span>
            ) : null}
          </div>
          <div
            className="prose prose-sm max-w-none border-t border-border pt-4 text-navy"
            dangerouslySetInnerHTML={{ __html: pkg.mainContent || "" }}
          />
        </div>
      </article>

      {(pkg.includes?.length || pkg.excludes?.length) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {pkg.includes?.length ? (
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-[14px] font-semibold text-navy">Include</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted">
                {pkg.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {pkg.excludes?.length ? (
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-[14px] font-semibold text-navy">Exclude</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted">
                {pkg.excludes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {pkg.faqs?.length ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-[14px] font-semibold text-navy">FAQ</h2>
          <div className="space-y-3">
            {pkg.faqs.map((faq, i) => (
              <div key={i} className="rounded-lg border border-border bg-background p-3">
                <p className="text-[13px] font-semibold text-navy">{faq.question}</p>
                <p className="mt-1 whitespace-pre-wrap text-[12px] text-muted">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
