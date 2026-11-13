import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, ImagePlus, Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { FormField, FormSection } from "../../components/ui/FormField";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { websitePackageService, PACKAGE_STATUSES } from "../../services/websitePackageService";
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

export function PackageForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const [shortHeading, setShortHeading] = useState("");
  const [mainHeading, setMainHeading] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [mainContent, setMainContent] = useState("");
  const [duration, setDuration] = useState("");
  const [destinations, setDestinations] = useState([""]);
  const [priceFrom, setPriceFrom] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [canonical, setCanonical] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [faqs, setFaqs] = useState([emptyFaq()]);
  const [includes, setIncludes] = useState([""]);
  const [excludes, setExcludes] = useState([""]);

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
        const res = await websitePackageService.get(id);
        if (cancelled) return;
        const p = res.data.data;
        setShortHeading(p.shortHeading || "");
        setMainHeading(p.mainHeading || "");
        setShortDescription(p.shortDescription || "");
        setMainContent(p.mainContent || "");
        setDuration(p.duration || "");
        setDestinations(p.destinations?.length ? p.destinations : [""]);
        setPriceFrom(p.priceFrom != null ? String(p.priceFrom) : "");
        setMetaTitle(p.metaTitle || "");
        setSlug(p.slug || "");
        setSlugTouched(true);
        setCanonical(p.canonical || "");
        setMetaKeywords(p.metaKeywords || "");
        setMetaDescription(p.metaDescription || "");
        setStatus(p.status || "DRAFT");
        setFaqs(
          p.faqs?.length
            ? p.faqs.map((f) => ({ question: f.question || "", answer: f.answer || "" }))
            : [emptyFaq()]
        );
        setIncludes(p.includes?.length ? p.includes : [""]);
        setExcludes(p.excludes?.length ? p.excludes : [""]);
        setExistingMainImage(p.mainImage || null);
        setExistingOtherImages(p.otherImages || []);
        if (p.mainImage?.url) setMainImagePreview(mediaUrl(p.mainImage.url));
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

  const updateListItem = (setter, index, value) => {
    setter((prev) => prev.map((item, i) => (i === index ? value : item)));
  };
  const addListItem = (setter) => setter((prev) => [...prev, ""]);
  const removeListItem = (setter, index) =>
    setter((prev) => (prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index)));

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
      fd.append("shortDescription", shortDescription);
      fd.append("mainContent", mainContent || "");
      fd.append("duration", duration.trim());
      fd.append(
        "destinations",
        JSON.stringify(destinations.map((x) => x.trim()).filter(Boolean))
      );
      fd.append("priceFrom", priceFrom.trim());
      fd.append("metaTitle", metaTitle);
      fd.append("slug", slugify(slug) || slugify(mainHeading));
      fd.append("canonical", canonical.trim());
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
      fd.append(
        "includes",
        JSON.stringify(includes.map((x) => x.trim()).filter(Boolean))
      );
      fd.append(
        "excludes",
        JSON.stringify(excludes.map((x) => x.trim()).filter(Boolean))
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
        await websitePackageService.update(id, fd);
        toast.success("Package updated");
      } else {
        const res = await websitePackageService.create(fd);
        toast.success("Package created");
        navigate(`/dashboard/website/packages/${res.data.data._id}/edit`, { replace: true });
        return;
      }
      navigate("/dashboard/website/packages");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-[13px] text-muted">Loading package…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Link
            to="/dashboard/website/packages"
            className="mt-0.5 rounded-lg p-1.5 text-muted hover:bg-slate-50 hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="ui-page-title">{isEdit ? "Edit Package" : "Add Package"}</h1>
            <p className="ui-page-subtitle">SEO, content, duration, price, FAQ & images.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="ui-select w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            {PACKAGE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save Package"}
          </Button>
        </div>
      </div>

      <FormSection title="Headings & summary">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Short heading">
            <Input
              value={shortHeading}
              onChange={(e) => setShortHeading(e.target.value)}
              placeholder="Eyebrow / short title"
            />
          </FormField>
          <FormField label="Main heading" required>
            <Input
              value={mainHeading}
              onChange={(e) => onMainHeadingChange(e.target.value)}
              placeholder="Full package title"
              required
            />
          </FormField>
          <FormField label="Short description" className="sm:col-span-2">
            <textarea
              className="ui-textarea"
              rows={3}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Short description for cards / listing"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Package details">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Duration">
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 2N/3D, 1 Day, Transfers"
            />
          </FormField>
          <FormField label="Price from (INR)">
            <Input
              type="number"
              min="0"
              step="1"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              placeholder="4500"
            />
          </FormField>
        </div>
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="ui-label mb-0">Destinations</p>
            <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setDestinations)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {destinations.map((item, index) => (
              <div key={`dest-${index}`} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateListItem(setDestinations, index, e.target.value)}
                  placeholder={`Destination #${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeListItem(setDestinations, index)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="Main content" description="Full rich text content">
        <RichTextEditor
          value={mainContent}
          onChange={setMainContent}
          placeholder="Write the full package page content…"
        />
      </FormSection>

      <FormSection title="Images" description="Main cover + gallery (optional)">
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
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={onMainImagePick}
                />
              </label>
            )}
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
                    onClick={() =>
                      setExistingOtherImages((prev) => prev.filter((x) => x.url !== img.url))
                    }
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
                    onClick={() => setOtherImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormSection>

      <div className="grid gap-3 lg:grid-cols-2">
        <FormSection
          title="Include"
          description="Optional — add as many as you need"
          actions={
            <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setIncludes)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          }
        >
          <div className="space-y-2">
            {includes.map((item, index) => (
              <div key={`inc-${index}`} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateListItem(setIncludes, index, e.target.value)}
                  placeholder={`Include item #${index + 1}`}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeListItem(setIncludes, index)}>
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="Exclude"
          description="Optional — add as many as you need"
          actions={
            <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setExcludes)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          }
        >
          <div className="space-y-2">
            {excludes.map((item, index) => (
              <div key={`exc-${index}`} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateListItem(setExcludes, index, e.target.value)}
                  placeholder={`Exclude item #${index + 1}`}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeListItem(setExcludes, index)}>
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        </FormSection>
      </div>

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

      <FormSection title="SEO" description="Meta tags & URL">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Meta title">
            <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title" />
          </FormField>
          <FormField label="Slug" required>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="delhi-agra-day-trip"
              required
            />
          </FormField>
          <FormField label="Canonical URL" className="sm:col-span-2" hint="Optional full URL">
            <Input
              value={canonical}
              onChange={(e) => setCanonical(e.target.value)}
              placeholder="https://example.com/tour-packages/delhi-agra-day-trip"
            />
          </FormField>
          <FormField label="Meta keywords" className="sm:col-span-2" hint="Comma separated">
            <Input
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              placeholder="tour package, agra, delhi"
            />
          </FormField>
          <FormField label="Meta description" className="sm:col-span-2">
            <textarea
              className="ui-textarea"
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="SEO description"
            />
          </FormField>
        </div>
      </FormSection>

      <div className="flex justify-end gap-2 pb-4">
        <Link to="/dashboard/website/packages">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={saving}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save Package"}
        </Button>
      </div>
    </form>
  );
}
