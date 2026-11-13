import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { blogService } from "../../services/blogService";
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

export function BlogView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await blogService.get(id);
        if (!cancelled) setBlog(res.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load blog");
        navigate("/dashboard/website/blogs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading) {
    return <div className="py-16 text-center text-[13px] text-muted">Loading…</div>;
  }
  if (!blog) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/dashboard/website/blogs"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blogs
        </Link>
        <Link to={`/dashboard/website/blogs/${blog._id}/edit`}>
          <Button size="sm">
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>
      </div>

      <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {blog.mainImage?.url ? (
          <img
            src={mediaUrl(blog.mainImage.url)}
            alt={blog.mainHeading}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : null}
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("ui-badge font-semibold", statusTone[blog.status])}>{blog.status}</span>
            <span className="font-mono text-[11px] text-muted">/{blog.slug}</span>
          </div>
          {blog.shortHeading ? (
            <p className="text-[12px] font-medium uppercase tracking-wide text-primary">{blog.shortHeading}</p>
          ) : null}
          <h1 className="text-xl font-semibold text-navy">{blog.mainHeading}</h1>
          {blog.shortContent ? <p className="text-[13px] text-muted">{blog.shortContent}</p> : null}
          <div
            className="prose prose-sm max-w-none border-t border-border pt-4 text-navy"
            dangerouslySetInnerHTML={{ __html: blog.mainContent || "" }}
          />
        </div>
      </article>

      {blog.faqs?.length ? (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-[14px] font-semibold text-navy">FAQ</h2>
          <div className="space-y-3">
            {blog.faqs.map((faq, i) => (
              <div key={i} className="rounded-lg border border-border bg-background p-3">
                <p className="text-[13px] font-semibold text-navy">{faq.question}</p>
                <p className="mt-1 text-[12px] text-muted whitespace-pre-wrap">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {blog.otherImages?.length ? (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-[14px] font-semibold text-navy">Gallery</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {blog.otherImages.map((img) => (
              <img
                key={img.url}
                src={mediaUrl(img.url)}
                alt=""
                className="aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      {(blog.metaTitle || blog.metaDescription || blog.metaKeywords) && (
        <section className="space-y-2 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-[14px] font-semibold text-navy">SEO</h2>
          {blog.metaTitle ? (
            <p className="text-[12px]">
              <span className="text-muted">Title:</span> {blog.metaTitle}
            </p>
          ) : null}
          {blog.metaKeywords ? (
            <p className="text-[12px]">
              <span className="text-muted">Keywords:</span> {blog.metaKeywords}
            </p>
          ) : null}
          {blog.metaDescription ? (
            <p className="text-[12px]">
              <span className="text-muted">Description:</span> {blog.metaDescription}
            </p>
          ) : null}
        </section>
      )}

      {blog.schemaJson || blog.schema ? (
        <section className="space-y-2 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-navy">Auto schema (JSON-LD)</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    blog.schemaJson || JSON.stringify(blog.schema, null, 2)
                  );
                  toast.success("Schema copied");
                } catch {
                  toast.error("Copy failed");
                }
              }}
            >
              Copy
            </Button>
          </div>
          <p className="text-[11px] text-muted">
            Website pe{" "}
            <code className="rounded bg-background px-1">&lt;script type=&quot;application/ld+json&quot;&gt;</code>{" "}
            mein ye use karo — har blog pe fields se auto generate hota hai.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-background p-3 text-[11px] text-muted">
            {blog.schemaJson || JSON.stringify(blog.schema, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
