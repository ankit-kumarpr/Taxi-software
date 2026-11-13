import { useEffect, useState } from "react";
import {
  UserRound,
  Lock,
  Save,
  MapPin,
  Building2,
  Landmark,
  Phone,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  FormField,
  FormSection,
  PageHeader,
  StatusBadge,
  MetaBadge,
} from "../../components/ui/FormField";
import { useAuth } from "../../context/AuthContext";
import { profileService } from "../../services/profileService";

export function MyProfile() {
  const { user, refreshUser } = useAuth();
  const role = user?.userType || "ADMIN";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      locality: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
    },
  });

  const [vendorForm, setVendorForm] = useState({
    companyName: "",
    contactPersonName: "",
    ownerName: "",
    email: "",
    mobileNumber: "",
    alternateContactNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: "",
    bankAccountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
    ifscCode: "",
  });

  const [driverForm, setDriverForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    address: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await profileService.getMe();
      const data = res.data.data;
      setProfile(data);

      if (data.userType === "VENDOR") {
        setVendorForm({
          companyName: data.companyName || "",
          contactPersonName: data.contactPersonName || "",
          ownerName: data.ownerName || "",
          email: data.email || "",
          mobileNumber: data.mobileNumber || data.phone || "",
          alternateContactNumber: data.alternateContactNumber || "",
          addressLine1: data.addressLine1 || "",
          addressLine2: data.addressLine2 || "",
          city: data.city || "",
          state: data.state || "",
          pinCode: data.pinCode || "",
          country: data.country || "India",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactRelationship: data.emergencyContactRelationship || "",
          emergencyContactNumber: data.emergencyContactNumber || "",
          bankAccountHolderName: data.bankAccountHolderName || "",
          bankName: data.bankName || "",
          bankAccountNumber: data.bankAccountNumber || "",
          ifscCode: data.ifscCode || "",
        });
      } else if (data.userType === "DRIVER") {
        setDriverForm({
          name: data.name || "",
          email: data.email || "",
          mobileNumber: data.mobileNumber || data.phone || "",
          address: data.address || "",
        });
      } else {
        setAdminForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: {
            street: data.address?.street || "",
            locality: data.address?.locality || "",
            city: data.address?.city || "",
            state: data.address?.state || "",
            pincode: data.address?.pincode || "",
            landmark: data.address?.landmark || "",
          },
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {};

      if (passwordForm.newPassword || passwordForm.confirmPassword || passwordForm.currentPassword) {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          toast.error("New password and confirm password do not match");
          setSaving(false);
          return;
        }
        payload.currentPassword = passwordForm.currentPassword;
        payload.newPassword = passwordForm.newPassword;
      }

      if (role === "VENDOR") Object.assign(payload, vendorForm);
      else if (role === "DRIVER") Object.assign(payload, driverForm);
      else {
        Object.assign(payload, {
          name: adminForm.name,
          email: adminForm.email,
          phone: adminForm.phone,
          address: adminForm.address,
        });
      }

      const res = await profileService.update(payload);
      toast.success(res.data.message || "Profile updated");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setProfile(res.data.data);
      if (typeof refreshUser === "function") await refreshUser(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading profile…</div>;
  }

  const displayName = profile?.name || profile?.companyName || "User";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        icon={UserRound}
        title="My Profile"
        description="Your account details — visible only to you."
        badges={
          <>
            <MetaBadge>{role}</MetaBadge>
            {profile?.status ? <StatusBadge status={profile.status} /> : null}
            {profile?.vendorId ? <MetaBadge>{profile.vendorId}</MetaBadge> : null}
            {profile?.driverId ? <MetaBadge>{profile.driverId}</MetaBadge> : null}
            {profile?.isSuperAdmin ? <MetaBadge className="bg-violet-100 text-violet-700">Super admin</MetaBadge> : null}
          </>
        }
      />

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#1e40af] text-xl font-bold text-white shadow-sm">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">{displayName}</p>
          <p className="truncate text-sm text-slate-500">{profile?.email || "—"}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {role === "ADMIN" ? (
          <>
            <FormSection
              icon={UserRound}
              title="Account details"
              description="Name and contact used across the CRM."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full name" required>
                  <Input
                    value={adminForm.name}
                    onChange={(e) => setAdminForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Phone" required>
                  <Input
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm((f) => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Email" required className="sm:col-span-2">
                  <Input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Department">
                  <Input disabled value={profile?.department?.name || "—"} />
                </FormField>
                <FormField label="Designation">
                  <Input disabled value={profile?.designation?.name || "—"} />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={MapPin} title="Address" description="Your registered address.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Street / house" required>
                  <Input
                    value={adminForm.address.street}
                    onChange={(e) =>
                      setAdminForm((f) => ({ ...f, address: { ...f.address, street: e.target.value } }))
                    }
                    required
                  />
                </FormField>
                <FormField label="Locality" required>
                  <Input
                    value={adminForm.address.locality}
                    onChange={(e) =>
                      setAdminForm((f) => ({
                        ...f,
                        address: { ...f.address, locality: e.target.value },
                      }))
                    }
                    required
                  />
                </FormField>
                <FormField label="City" required>
                  <Input
                    value={adminForm.address.city}
                    onChange={(e) =>
                      setAdminForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))
                    }
                    required
                  />
                </FormField>
                <FormField label="State" required>
                  <Input
                    value={adminForm.address.state}
                    onChange={(e) =>
                      setAdminForm((f) => ({ ...f, address: { ...f.address, state: e.target.value } }))
                    }
                    required
                  />
                </FormField>
                <FormField label="Pincode" required>
                  <Input
                    value={adminForm.address.pincode}
                    onChange={(e) =>
                      setAdminForm((f) => ({
                        ...f,
                        address: { ...f.address, pincode: e.target.value },
                      }))
                    }
                    required
                  />
                </FormField>
                <FormField label="Landmark">
                  <Input
                    value={adminForm.address.landmark}
                    onChange={(e) =>
                      setAdminForm((f) => ({
                        ...f,
                        address: { ...f.address, landmark: e.target.value },
                      }))
                    }
                  />
                </FormField>
              </div>
            </FormSection>
          </>
        ) : null}

        {role === "VENDOR" ? (
          <>
            <FormSection
              icon={Building2}
              title="Company & contact"
              description="Vendor account details shown on trips and offers."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Company name" required className="sm:col-span-2">
                  <Input
                    value={vendorForm.companyName}
                    onChange={(e) => setVendorForm((f) => ({ ...f, companyName: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Contact person">
                  <Input
                    value={vendorForm.contactPersonName}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, contactPersonName: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Owner name">
                  <Input
                    value={vendorForm.ownerName}
                    onChange={(e) => setVendorForm((f) => ({ ...f, ownerName: e.target.value }))}
                  />
                </FormField>
                <FormField label="Email" required>
                  <Input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Mobile" required>
                  <Input
                    value={vendorForm.mobileNumber}
                    onChange={(e) => setVendorForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Alternate contact">
                  <Input
                    value={vendorForm.alternateContactNumber}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, alternateContactNumber: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Vendor type">
                  <Input disabled value={profile?.vendorType?.name || "—"} />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={MapPin} title="Address">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Address line 1" required className="sm:col-span-2">
                  <Input
                    value={vendorForm.addressLine1}
                    onChange={(e) => setVendorForm((f) => ({ ...f, addressLine1: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Address line 2" className="sm:col-span-2">
                  <Input
                    value={vendorForm.addressLine2}
                    onChange={(e) => setVendorForm((f) => ({ ...f, addressLine2: e.target.value }))}
                  />
                </FormField>
                <FormField label="City" required>
                  <Input
                    value={vendorForm.city}
                    onChange={(e) => setVendorForm((f) => ({ ...f, city: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="State" required>
                  <Input
                    value={vendorForm.state}
                    onChange={(e) => setVendorForm((f) => ({ ...f, state: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Pin code" required>
                  <Input
                    value={vendorForm.pinCode}
                    onChange={(e) => setVendorForm((f) => ({ ...f, pinCode: e.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Country">
                  <Input
                    value={vendorForm.country}
                    onChange={(e) => setVendorForm((f) => ({ ...f, country: e.target.value }))}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={ShieldAlert} title="Emergency contact">
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Name">
                  <Input
                    value={vendorForm.emergencyContactName}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, emergencyContactName: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Relationship">
                  <Input
                    value={vendorForm.emergencyContactRelationship}
                    onChange={(e) =>
                      setVendorForm((f) => ({
                        ...f,
                        emergencyContactRelationship: e.target.value,
                      }))
                    }
                  />
                </FormField>
                <FormField label="Number">
                  <Input
                    value={vendorForm.emergencyContactNumber}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, emergencyContactNumber: e.target.value }))
                    }
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection icon={Landmark} title="Bank details" description="Used for payouts.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Account holder">
                  <Input
                    value={vendorForm.bankAccountHolderName}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, bankAccountHolderName: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Bank name">
                  <Input
                    value={vendorForm.bankName}
                    onChange={(e) => setVendorForm((f) => ({ ...f, bankName: e.target.value }))}
                  />
                </FormField>
                <FormField label="Account number">
                  <Input
                    value={vendorForm.bankAccountNumber}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, bankAccountNumber: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="IFSC">
                  <Input
                    value={vendorForm.ifscCode}
                    onChange={(e) => setVendorForm((f) => ({ ...f, ifscCode: e.target.value }))}
                  />
                </FormField>
              </div>
            </FormSection>
          </>
        ) : null}

        {role === "DRIVER" ? (
          <FormSection icon={Phone} title="Driver details">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" required>
                <Input
                  value={driverForm.name}
                  onChange={(e) => setDriverForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Mobile" required>
                <Input
                  value={driverForm.mobileNumber}
                  onChange={(e) => setDriverForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Email" className="sm:col-span-2">
                <Input
                  type="email"
                  value={driverForm.email}
                  onChange={(e) => setDriverForm((f) => ({ ...f, email: e.target.value }))}
                />
              </FormField>
              <FormField label="Address" required className="sm:col-span-2">
                <Input
                  value={driverForm.address}
                  onChange={(e) => setDriverForm((f) => ({ ...f, address: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Assigned vendor" className="sm:col-span-2">
                <Input
                  disabled
                  value={
                    profile?.assignedVendor
                      ? `${profile.assignedVendor.companyName || ""} ${
                          profile.assignedVendor.vendorId
                            ? `(${profile.assignedVendor.vendorId})`
                            : ""
                        }`.trim() || "—"
                      : "—"
                  }
                />
              </FormField>
            </div>
          </FormSection>
        ) : null}

        <FormSection
          icon={Lock}
          title="Change password"
          description="Leave blank if you do not want to change password."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Current password">
              <Input
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
              />
            </FormField>
            <FormField label="New password">
              <Input
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
            </FormField>
            <FormField label="Confirm new password">
              <Input
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
              />
            </FormField>
          </div>
        </FormSection>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button type="submit" disabled={saving} className="shadow-lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
