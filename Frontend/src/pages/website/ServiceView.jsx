import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { websiteServiceService } from "../../services/websiteServiceService";
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

export function ServiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await websiteServiceService.get(id);
        if (!cancelled) setService(res.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load service");
        navigate("/dashboard/website/services");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading) return <div className="py-16 text-center text-[13px] text-muted">Loading…</div>;
  if (!service) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/dashboard/website/services"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to services
        </Link>
        <Link to={`/dashboard/website/services/${service._id}/edit`}>
          <Button size="sm">
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>
      </div>

      <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {service.mainImage?.url ? (
          <img
            src={mediaUrl(service.mainImage.url)}
            alt={service.mainHeading}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : null}
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("ui-badge font-semibold", statusTone[service.status])}>
              {service.status}
            </span>
            <span className="font-mono text-[11px] text-muted">/{service.slug}</span>
          </div>
          {service.shortHeading ? (
            <p className="text-[12px] font-medium uppercase tracking-wide text-primary">
              {service.shortHeading}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold text-navy">{service.mainHeading}</h1>
          {service.shortDescription ? (
            <p className="text-[13px] text-muted">{service.shortDescription}</p>
          ) : null}
          <div
            className="prose prose-sm max-w-none border-t border-border pt-4 text-navy"
            dangerouslySetInnerHTML={{ __html: service.mainContent || "" }}
          />
        </div>
      </article>

      {(service.includes?.length || service.excludes?.length) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {service.includes?.length ? (
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-[14px] font-semibold text-navy">Include</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted">
                {service.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {service.excludes?.length ? (
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-[14px] font-semibold text-navy">Exclude</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted">
                {service.excludes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {service.faqs?.length ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-[14px] font-semibold text-navy">FAQ</h2>
          <div className="space-y-3">
            {service.faqs.map((faq, i) => (
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
