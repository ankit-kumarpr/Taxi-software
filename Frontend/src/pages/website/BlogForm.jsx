import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, ImagePlus, Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { FormField, FormSection } from "../../components/ui/FormField";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { blogService, BLOG_STATUSES } from "../../services/blogService";
import toast from "react-hot-toast";

const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "");

const emptyFaq = () => ({ question: "", answer: "" });

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

function mediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiOrigin}${url}`;
}

export function BlogForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const [shortHeading, setShortHeading] = useState("");
  const [mainHeading, setMainHeading] = useState("");
  const [shortContent, setShortContent] = useState("");
  const [mainContent, setMainContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [faqs, setFaqs] = useState([emptyFaq()]);

  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState("");
  const [existingMainImage, setExistingMainImage] = useState(null);
  const [removeMainImage, setRemoveMainImage] = useState(false);

  const [otherImageFiles, setOtherImageFiles] = useState([]);
  const [existingOtherImages, setExistingOtherImages] = useState([]);

  const otherPreviews = useMemo(
    () => otherImageFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [otherImageFiles]
  );

  useEffect(() => {
    return () => {
      otherPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [otherPreviews]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await blogService.get(id);
        if (cancelled) return;
        const b = res.data.data;
        setShortHeading(b.shortHeading || "");
        setMainHeading(b.mainHeading || "");
        setShortContent(b.shortContent || "");
        setMainContent(b.mainContent || "");
        setMetaTitle(b.metaTitle || "");
        setSlug(b.slug || "");
        setSlugTouched(true);
        setMetaKeywords(b.metaKeywords || "");
        setMetaDescription(b.metaDescription || "");
        setStatus(b.status || "DRAFT");
        setFaqs(b.faqs?.length ? b.faqs.map((f) => ({ question: f.question || "", answer: f.answer || "" })) : [emptyFaq()]);
        setExistingMainImage(b.mainImage || null);
        setExistingOtherImages(b.otherImages || []);
        if (b.mainImage?.url) setMainImagePreview(mediaUrl(b.mainImage.url));
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
  }, [id, isEdit, navigate]);

  const onMainHeadingChange = (value) => {
    setMainHeading(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const updateFaq = (index, key, value) => {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  };

  const addFaq = () => setFaqs((prev) => [...prev, emptyFaq()]);
  const removeFaq = (index) =>
    setFaqs((prev) => (prev.length <= 1 ? [emptyFaq()] : prev.filter((_, i) => i !== index)));

  const onMainImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainImageFile(file);
    setRemoveMainImage(false);
    setMainImagePreview(URL.createObjectURL(file));
  };

  const clearMainImage = () => {
    setMainImageFile(null);
    setMainImagePreview("");
    if (existingMainImage) setRemoveMainImage(true);
    setExistingMainImage(null);
  };

  const onOtherImagesPick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setOtherImageFiles((prev) => [...prev, ...files].slice(0, 12));
    e.target.value = "";
  };

  const removeNewOther = (index) => {
    setOtherImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingOther = (url) => {
    setExistingOtherImages((prev) => prev.filter((img) => img.url !== url));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mainHeading.trim()) {
      toast.error("Main heading is required");
      return;
    }
    if (!slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("shortHeading", shortHeading);
      fd.append("mainHeading", mainHeading.trim());
      fd.append("shortContent", shortContent);
      fd.append("mainContent", mainContent || "");
      fd.append("metaTitle", metaTitle);
      fd.append("slug", slugify(slug) || slugify(mainHeading));
      fd.append("metaKeywords", metaKeywords);
      fd.append("metaDescription", metaDescription);
      fd.append("status", status);
      fd.append(
        "faqs",
        JSON.stringify(
          faqs
            .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
            .filter((f) => f.question || f.answer)
        )
      );

      if (mainImageFile) fd.append("mainImage", mainImageFile);
      if (isEdit && removeMainImage) fd.append("removeMainImage", "true");
      if (isEdit) {
        fd.append(
          "keepOtherImageUrls",
          JSON.stringify(existingOtherImages.map((img) => img.url))
        );
      }
      otherImageFiles.forEach((file) => fd.append("otherImages", file));

      if (isEdit) {
        await blogService.update(id, fd);
        toast.success("Blog updated");
      } else {
        const res = await blogService.create(fd);
        toast.success("Blog created");
        navigate(`/dashboard/website/blogs/${res.data.data._id}/edit`, { replace: true });
        return;
      }
      navigate("/dashboard/website/blogs");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-[13px] text-muted">Loading blog…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Link
            to="/dashboard/website/blogs"
            className="mt-0.5 rounded-lg p-1.5 text-muted hover:bg-slate-50 hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="ui-page-title">{isEdit ? "Edit Blog" : "Add Blog"}</h1>
            <p className="ui-page-subtitle">Content, SEO, FAQ & images. Schema auto-builds from this data.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="ui-select w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            {BLOG_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save Blog"}
          </Button>
        </div>
      </div>

      <FormSection title="Headings & summary" description="Card + list preview text">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Short heading">
            <Input value={shortHeading} onChange={(e) => setShortHeading(e.target.value)} placeholder="Eyebrow / short title" />
          </FormField>
          <FormField label="Main heading" required>
            <Input
              value={mainHeading}
              onChange={(e) => onMainHeadingChange(e.target.value)}
              placeholder="Full blog title"
              required
            />
          </FormField>
          <FormField label="Short content" className="sm:col-span-2">
            <textarea
              className="ui-textarea"
              rows={3}
              value={shortContent}
              onChange={(e) => setShortContent(e.target.value)}
              placeholder="Short excerpt for cards / meta preview"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Main content" description="Full rich text — headings, lists, media, colors, align…">
        <RichTextEditor value={mainContent} onChange={setMainContent} placeholder="Write the full blog article…" />
      </FormSection>

      <FormSection title="Images" description="Main cover + gallery images (jpg/png/webp/avif)">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="ui-label mb-2">Main image</p>
            {mainImagePreview ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img src={mainImagePreview} alt="Main" className="aspect-[16/9] w-full object-cover" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2 bg-white/90"
                  onClick={clearMainImage}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center hover:border-primary/40">
                <ImagePlus className="h-6 w-6 text-slate-300" />
                <span className="text-[12px] text-muted">Click to upload main image</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={onMainImagePick} />
              </label>
            )}
            {mainImagePreview ? (
              <label className="mt-2 inline-flex cursor-pointer text-[12px] font-medium text-primary hover:underline">
                Replace image
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={onMainImagePick} />
              </label>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="ui-label mb-0">Other images</p>
              <label className="cursor-pointer text-[12px] font-medium text-primary hover:underline">
                + Add images
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  className="hidden"
                  onChange={onOtherImagesPick}
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {existingOtherImages.map((img) => (
                <div key={img.url} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={mediaUrl(img.url)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-white/90 p-1 text-danger opacity-0 transition group-hover:opacity-100"
                    onClick={() => removeExistingOther(img.url)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {otherPreviews.map((p, i) => (
                <div key={`${p.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-white/90 p-1 text-danger opacity-0 transition group-hover:opacity-100"
                    onClick={() => removeNewOther(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {!existingOtherImages.length && !otherPreviews.length ? (
              <p className="mt-2 text-[12px] text-muted">No gallery images yet.</p>
            ) : null}
          </div>
        </div>
      </FormSection>

      <FormSection
        title="FAQ"
        description="Add as many Q&A rows as you need"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={addFaq}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add FAQ
          </Button>
        }
      >
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-navy">FAQ #{index + 1}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFaq(index)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5 text-danger" />
                  Remove
                </Button>
              </div>
              <div className="grid gap-2">
                <Input
                  placeholder="Question"
                  value={faq.question}
                  onChange={(e) => updateFaq(index, "question", e.target.value)}
                />
                <textarea
                  className="ui-textarea"
                  rows={2}
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={(e) => updateFaq(index, "answer", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="SEO" description="Meta tags for search engines">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Meta title">
            <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title" />
          </FormField>
          <FormField label="Slug" required hint="URL path, auto from main heading">
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="my-blog-post"
              required
            />
          </FormField>
          <FormField label="Meta keywords" className="sm:col-span-2" hint="Comma separated">
            <Input
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              placeholder="taxi, booking, travel"
            />
          </FormField>
          <FormField label="Meta description" className="sm:col-span-2">
            <textarea
              className="ui-textarea"
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="SEO description (≈150–160 chars)"
            />
          </FormField>
        </div>
      </FormSection>

      <div className="flex justify-end gap-2 pb-4">
        <Link to="/dashboard/website/blogs">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={saving}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save Blog"}
        </Button>
      </div>
    </form>
  );
}
