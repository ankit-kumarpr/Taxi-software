import { useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  FileText,
  ImagePlus,
  MapPin,
  Receipt,
  Save,
  QrCode,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { FormField, FormSection, PageHeader } from "../../components/ui/FormField";
import { companyProfileService } from "../../services/companyProfileService";

const apiOrigin = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/$/, "");

const fileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiOrigin}${path.startsWith("/") ? path : `/${path}`}`;
};

export function CompanyProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [headerFile, setHeaderFile] = useState(null);
  const [headerPreview, setHeaderPreview] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [form, setForm] = useState({
    companyName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    landmark: "",
    gstin: "",
    gstPercent: "5",
    quotationPhone: "",
    quotationEmail: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    accountHolderName: "",
    upiIds: "",
    paymentWarningText: "",
    termsAndConditions: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await companyProfileService.get();
        const p = res.data.data;
        setForm({
          companyName: p.companyName || "",
          addressLine1: p.addressLine1 || "",
          addressLine2: p.addressLine2 || "",
          city: p.city || "",
          state: p.state || "",
          pinCode: p.pinCode || "",
          landmark: p.landmark || "",
          gstin: p.gstin || "",
          gstPercent: String(p.gstPercent ?? 5),
          quotationPhone: p.quotationPhone || "",
          quotationEmail: p.quotationEmail || "",
          bankName: p.bankName || "",
          accountNumber: p.accountNumber || "",
          ifsc: p.ifsc || "",
          accountHolderName: p.accountHolderName || "",
          upiIds: p.upiIds || "",
          paymentWarningText: p.paymentWarningText || "",
          termsAndConditions: p.termsAndConditions || "",
        });
        setLogoPreview(fileUrl(p.logo?.url));
        setHeaderPreview(fileUrl(p.quotationHeaderImage?.url));
        setQrPreview(fileUrl(p.paymentQrImage?.url));
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load company profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value ?? ""));
      if (logoFile) fd.append("logo", logoFile);
      if (headerFile) fd.append("quotationHeaderImage", headerFile);
      if (qrFile) fd.append("paymentQrImage", qrFile);
      const res = await companyProfileService.update(fd);
      toast.success(res.data.message || "Company profile saved");
      const p = res.data.data;
      if (p?.logo?.url) setLogoPreview(fileUrl(p.logo.url));
      if (p?.quotationHeaderImage?.url) setHeaderPreview(fileUrl(p.quotationHeaderImage.url));
      if (p?.paymentQrImage?.url) setQrPreview(fileUrl(p.paymentQrImage.url));
      setLogoFile(null);
      setHeaderFile(null);
      setQrFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading company profile…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        icon={Building2}
        title="Company Profile"
        description="Letterhead, payment details and terms used on every quotation PDF."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection
          icon={Building2}
          title="Brand"
          description="Company name and logo."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <ImagePlus className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <FormField label="Company logo" hint="JPG / PNG / WEBP · max 5MB">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLogoFile(file);
                    if (file) setLogoPreview(URL.createObjectURL(file));
                  }}
                />
              </FormField>
            </div>
          </div>
          <div className="mt-4">
            <FormField label="Company name" required>
              <Input
                value={form.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                required
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={ImagePlus}
          title="Quotation header"
          description="Upload the boarding-pass style banner used at the top of quotation PDFs."
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {headerPreview ? (
              <img
                src={headerPreview}
                alt="Quotation header"
                className="max-h-40 w-full object-contain"
              />
            ) : (
              <div className="flex h-28 items-center justify-center text-slate-400">
                <ImagePlus className="mr-2 h-5 w-5" /> No header uploaded
              </div>
            )}
          </div>
          <div className="mt-3">
            <FormField label="Header image" hint="Wide banner · JPG / PNG / WEBP · max 5MB">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setHeaderFile(file);
                  if (file) setHeaderPreview(URL.createObjectURL(file));
                }}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection icon={MapPin} title="Registered address">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Address line 1" className="sm:col-span-2">
              <Input
                value={form.addressLine1}
                onChange={(e) => setField("addressLine1", e.target.value)}
              />
            </FormField>
            <FormField label="Address line 2" className="sm:col-span-2">
              <Input
                value={form.addressLine2}
                onChange={(e) => setField("addressLine2", e.target.value)}
              />
            </FormField>
            <FormField label="City">
              <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
            </FormField>
            <FormField label="State">
              <Input value={form.state} onChange={(e) => setField("state", e.target.value)} />
            </FormField>
            <FormField label="PIN code">
              <Input value={form.pinCode} onChange={(e) => setField("pinCode", e.target.value)} />
            </FormField>
            <FormField label="Landmark">
              <Input value={form.landmark} onChange={(e) => setField("landmark", e.target.value)} />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={Receipt}
          title="Tax & quotation contact"
          description="Shown on quotation letterhead and totals."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="GSTIN">
              <Input value={form.gstin} onChange={(e) => setField("gstin", e.target.value)} />
            </FormField>
            <FormField label="GST %" required>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.gstPercent}
                onChange={(e) => setField("gstPercent", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Quotation phone">
              <Input
                value={form.quotationPhone}
                onChange={(e) => setField("quotationPhone", e.target.value)}
              />
            </FormField>
            <FormField label="Quotation email">
              <Input
                type="email"
                value={form.quotationEmail}
                onChange={(e) => setField("quotationEmail", e.target.value)}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={CreditCard}
          title="Bank & UPI (quotation)"
          description="Shown under Company Payment Details on the quotation PDF."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Bank name">
              <Input value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} />
            </FormField>
            <FormField label="Account holder name">
              <Input
                value={form.accountHolderName}
                onChange={(e) => setField("accountHolderName", e.target.value)}
              />
            </FormField>
            <FormField label="Account number">
              <Input
                value={form.accountNumber}
                onChange={(e) => setField("accountNumber", e.target.value)}
              />
            </FormField>
            <FormField label="IFSC">
              <Input value={form.ifsc} onChange={(e) => setField("ifsc", e.target.value)} />
            </FormField>
            <FormField
              label="UPI IDs"
              hint="Comma or new-line separated"
              className="sm:col-span-2"
            >
              <textarea
                className="ui-textarea min-h-[72px]"
                value={form.upiIds}
                onChange={(e) => setField("upiIds", e.target.value)}
                placeholder="truewaytaxis@okhdfcbank"
              />
            </FormField>
            <FormField
              label="Payment warning text"
              className="sm:col-span-2"
              hint="Red notice under bank details"
            >
              <textarea
                className="ui-textarea min-h-[72px]"
                value={form.paymentWarningText}
                onChange={(e) => setField("paymentWarningText", e.target.value)}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={QrCode}
          title="Payment QR"
          description="QR image shown next to bank details on quotations."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {qrPreview ? (
                <img src={qrPreview} alt="Payment QR" className="h-full w-full object-contain" />
              ) : (
                <QrCode className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <FormField label="QR image" hint="JPG / PNG / WEBP · max 5MB">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setQrFile(file);
                    if (file) setQrPreview(URL.createObjectURL(file));
                  }}
                />
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={FileText}
          title="Terms & Conditions"
          description="Printed at the bottom of every quotation PDF."
        >
          <FormField label="Customer terms" hint="One point per line works best">
            <textarea
              className="ui-textarea min-h-[180px]"
              value={form.termsAndConditions}
              onChange={(e) => setField("termsAndConditions", e.target.value)}
              placeholder={"1. Waiting charges...\n2. Cancellation..."}
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save company profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
