import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Dashboard } from "../pages/Dashboard";
import { Login } from "../pages/Login";
import { Departments } from "../pages/organization/Departments";
import { Designations } from "../pages/organization/Designations";
import { StaffUsers } from "../pages/organization/StaffUsers";
import { Permissions } from "../pages/organization/Permissions";
import { VendorTypes } from "../pages/vendors/VendorTypes";
import { Vendors } from "../pages/vendors/Vendors";
import { VendorForm } from "../pages/vendors/VendorForm";
import { VendorView } from "../pages/vendors/VendorView";
import { PendingVendorDocuments } from "../pages/vendors/PendingVendorDocuments";
import { Drivers } from "../pages/drivers/Drivers";
import { DriverForm } from "../pages/drivers/DriverForm";
import { DriverView } from "../pages/drivers/DriverView";
import { DriverTrips } from "../pages/drivers/DriverTrips";
import { CarTypes } from "../pages/cars/CarTypes";
import { Vehicles } from "../pages/vehicles/Vehicles";
import { VehicleForm } from "../pages/vehicles/VehicleForm";
import { VehicleView } from "../pages/vehicles/VehicleView";
import { TripTypes } from "../pages/trips/TripTypes";
import { CompletedTrips } from "../pages/trips/CompletedTrips";
import { Leads } from "../pages/leads/Leads";
import { LeadForm } from "../pages/leads/LeadForm";
import { LeadView } from "../pages/leads/LeadView";
import { RepeatCustomers } from "../pages/leads/RepeatCustomers";
import { CancelledBookings } from "../pages/leads/CancelledBookings";
import { FollowUpForm } from "../pages/leads/FollowUpForm";
import { QuotationForm } from "../pages/leads/QuotationForm";
import { CompanyProfile } from "../pages/settings/CompanyProfile";
import { MyProfile } from "../pages/settings/MyProfile";
import { BecomeVendor } from "../pages/drivers/BecomeVendor";
import { VendorOffers } from "../pages/vendors/VendorOffers";
import { VendorBids } from "../pages/vendors/VendorBids";
import { AdminLiveBids } from "../pages/leads/AdminLiveBids";
import { Accounts } from "../pages/accounts/Accounts";
import { AccountsTrips } from "../pages/accounts/AccountsTrips";
import { AccountsPayments } from "../pages/accounts/AccountsPayments";
import { AccountsQuotations } from "../pages/accounts/AccountsQuotations";
import { AccountsPayouts } from "../pages/accounts/AccountsPayouts";
import { Blogs } from "../pages/website/Blogs";
import { BlogForm } from "../pages/website/BlogForm";
import { BlogView } from "../pages/website/BlogView";
import { WebsiteServices } from "../pages/website/Services";
import { ServiceForm } from "../pages/website/ServiceForm";
import { ServiceView } from "../pages/website/ServiceView";
import { WebsitePackages } from "../pages/website/Packages";
import { PackageForm } from "../pages/website/PackageForm";
import { PackageView } from "../pages/website/PackageView";
import { useAuth } from "../context/AuthContext";

const VendorOnlyRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (user?.userType !== "VENDOR") return <Navigate to="/dashboard" replace />;
  return children;
};

const PrivateRoute = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  const isAuthenticated = token && token !== "undefined" && token !== "null" && token !== "";
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

const AuthRoute = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  const isAuthenticated = token && token !== "undefined" && token !== "null" && token !== "";
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const AdminRoute = ({ children, permission }) => {
  const { user, isLoading, can, canAny } = useAuth();

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (user?.userType !== "ADMIN") return <Navigate to="/dashboard" replace />;
  if (permission) {
    const ok = Array.isArray(permission) ? canAny(permission) : can(permission);
    if (!ok) return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AdminOrVendorRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (user?.userType !== "ADMIN" && user?.userType !== "VENDOR") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const DriverRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (user?.userType !== "DRIVER") return <Navigate to="/dashboard" replace />;
  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AuthRoute><Login /></AuthRoute>} />

      <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="departments" element={<AdminRoute permission="departments.view"><Departments /></AdminRoute>} />
        <Route path="designations" element={<AdminRoute permission="designations.view"><Designations /></AdminRoute>} />
        <Route path="staff" element={<AdminRoute permission="staff.view"><StaffUsers /></AdminRoute>} />
        <Route path="permissions" element={<AdminRoute permission="permissions.manage"><Permissions /></AdminRoute>} />
        <Route path="vendor-types" element={<AdminRoute><VendorTypes /></AdminRoute>} />
        <Route path="vendors" element={<AdminRoute><Vendors /></AdminRoute>} />
        <Route path="vendors/status/:status" element={<AdminRoute><Vendors /></AdminRoute>} />
        <Route path="vendors/verify/:verify" element={<AdminRoute><Vendors /></AdminRoute>} />
        <Route path="vendors/pending-documents" element={<AdminRoute><PendingVendorDocuments /></AdminRoute>} />
        <Route path="vendors/register" element={<AdminRoute><VendorForm /></AdminRoute>} />
        <Route path="vendors/:id/edit" element={<AdminRoute><VendorForm /></AdminRoute>} />
        <Route path="vendors/:id" element={<AdminRoute><VendorView /></AdminRoute>} />
        <Route path="vendor-offers" element={<VendorOnlyRoute><VendorOffers /></VendorOnlyRoute>} />
        <Route path="vendor-bids" element={<VendorOnlyRoute><VendorBids /></VendorOnlyRoute>} />
        <Route path="car-types" element={<AdminRoute><CarTypes /></AdminRoute>} />
        <Route path="trip-types" element={<AdminRoute><TripTypes /></AdminRoute>} />
        <Route path="company-profile" element={<AdminRoute><CompanyProfile /></AdminRoute>} />
        <Route path="website/blogs" element={<AdminRoute permission={["blogs.view", "blogs.manage"]}><Blogs /></AdminRoute>} />
        <Route path="website/blogs/create" element={<AdminRoute permission={["blogs.create", "blogs.manage"]}><BlogForm /></AdminRoute>} />
        <Route path="website/blogs/:id/edit" element={<AdminRoute permission={["blogs.edit", "blogs.manage"]}><BlogForm /></AdminRoute>} />
        <Route path="website/blogs/:id" element={<AdminRoute permission={["blogs.view", "blogs.manage"]}><BlogView /></AdminRoute>} />
        <Route path="website/services" element={<AdminRoute permission={["services.view", "services.manage"]}><WebsiteServices /></AdminRoute>} />
        <Route path="website/services/create" element={<AdminRoute permission={["services.create", "services.manage"]}><ServiceForm /></AdminRoute>} />
        <Route path="website/services/:id/edit" element={<AdminRoute permission={["services.edit", "services.manage"]}><ServiceForm /></AdminRoute>} />
        <Route path="website/services/:id" element={<AdminRoute permission={["services.view", "services.manage"]}><ServiceView /></AdminRoute>} />
        <Route path="website/packages" element={<AdminRoute permission={["packages.view", "packages.manage"]}><WebsitePackages /></AdminRoute>} />
        <Route path="website/packages/create" element={<AdminRoute permission={["packages.create", "packages.manage"]}><PackageForm /></AdminRoute>} />
        <Route path="website/packages/:id/edit" element={<AdminRoute permission={["packages.edit", "packages.manage"]}><PackageForm /></AdminRoute>} />
        <Route path="website/packages/:id" element={<AdminRoute permission={["packages.view", "packages.manage"]}><PackageView /></AdminRoute>} />
        <Route path="accounts" element={<AdminRoute><Accounts /></AdminRoute>} />
        <Route path="accounts/trips" element={<AdminRoute><AccountsTrips /></AdminRoute>} />
        <Route path="accounts/payments" element={<AdminRoute><AccountsPayments /></AdminRoute>} />
        <Route path="accounts/quotations" element={<AdminRoute><AccountsQuotations /></AdminRoute>} />
        <Route path="accounts/vendor-payouts" element={<AdminRoute><AccountsPayouts /></AdminRoute>} />
        <Route path="live-bids" element={<AdminRoute permission="bids.view"><AdminLiveBids /></AdminRoute>} />
        <Route path="live-bids/status/:status" element={<AdminRoute permission="bids.view"><AdminLiveBids /></AdminRoute>} />
        <Route path="leads" element={<AdminRoute permission="leads.view"><Leads /></AdminRoute>} />
        <Route path="leads/status/:status" element={<AdminRoute permission="leads.view"><Leads /></AdminRoute>} />
        <Route path="leads/repeat-customers" element={<AdminRoute permission="leads.view"><RepeatCustomers /></AdminRoute>} />
        <Route path="leads/cancelled" element={<AdminRoute permission="leads.view"><CancelledBookings /></AdminRoute>} />
        <Route path="leads/create" element={<AdminRoute permission="leads.create"><LeadForm /></AdminRoute>} />
        <Route path="leads/:id/follow-ups/create" element={<AdminRoute><FollowUpForm /></AdminRoute>} />
        <Route path="leads/:id/follow-ups/:followUpId/edit" element={<AdminRoute><FollowUpForm /></AdminRoute>} />
        <Route path="leads/:id/quotations/create" element={<AdminRoute><QuotationForm /></AdminRoute>} />
        <Route path="leads/:id/quotations/:quotationId" element={<AdminRoute><QuotationForm /></AdminRoute>} />
        <Route path="leads/:id/edit" element={<AdminRoute><LeadForm /></AdminRoute>} />
        <Route path="leads/:id" element={<AdminRoute><LeadView /></AdminRoute>} />
        <Route path="vehicles" element={<AdminOrVendorRoute><Vehicles /></AdminOrVendorRoute>} />
        <Route path="vehicles/register" element={<AdminOrVendorRoute><VehicleForm /></AdminOrVendorRoute>} />
        <Route path="vehicles/:id/edit" element={<AdminOrVendorRoute><VehicleForm /></AdminOrVendorRoute>} />
        <Route path="vehicles/:id" element={<AdminOrVendorRoute><VehicleView /></AdminOrVendorRoute>} />
        <Route path="drivers" element={<AdminOrVendorRoute><Drivers /></AdminOrVendorRoute>} />
        <Route path="drivers/register" element={<AdminOrVendorRoute><DriverForm /></AdminOrVendorRoute>} />
        <Route path="drivers/:id/become-vendor" element={<AdminRoute><BecomeVendor /></AdminRoute>} />
        <Route path="drivers/:id/edit" element={<AdminOrVendorRoute><DriverForm /></AdminOrVendorRoute>} />
        <Route path="drivers/:id" element={<AdminOrVendorRoute><DriverView /></AdminOrVendorRoute>} />
        <Route path="driver-trips" element={<AdminOrVendorRoute><CompletedTrips /></AdminOrVendorRoute>} />
        <Route path="become-vendor" element={<DriverRoute><BecomeVendor /></DriverRoute>} />
        <Route path="my-trips" element={<DriverRoute><DriverTrips /></DriverRoute>} />
        <Route path="*" element={<div className="p-4">404 Not Found</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
