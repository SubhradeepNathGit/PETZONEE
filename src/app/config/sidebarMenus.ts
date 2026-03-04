// src/config/sidebarMenus.ts

export const sidebarMenus = {
  admin: [
    { label: "Overview", path: "/admin" },
    { label: "Manage Vets", path: "/admin/vets" },
    { label: "Manage Users", path: "/admin/users" },
    { label: "Subscriptions", path: "/admin/subscriptions" },
    { label: "Vet Approvals", path: "/admin/kyc" },
    { label: "Inventory", path: "/admin/inventory" },
    { label: "Orders", path: "/admin/orders" },
    { label: "Vet Payments", path: "/admin/payments" },
    { label: "Messages", path: "/admin/messages" },
    { label: "My Profile", path: "/dashboard" },
  ],
  vet: [
    { label: "Overview", path: "/dashboard" },
    { label: "Appointments", path: "/dashboard?view=appointments" },
    { label: "Messages", path: "/dashboard?view=messages" },
    { label: "My Profile", path: "/dashboard?view=profile" },
  ],
  user: [
    { label: "Profile", path: "/dashboard" },
    { label: "Discover", path: "/map" },
    { label: "Shop", path: "/products" },
    { label: "News Feed", path: "/feed" },
    { label: "Book Appointment", path: "/appointments/new" },
    { label: "My Appointments", path: "/dashboard?view=appointments" },
    { label: "My Orders", path: "/dashboard?view=orders" },
    { label: "Support Messages", path: "/dashboard?view=messages" },
    { label: "Vet Messages", path: "/dashboard?view=vet-messages" },
    { label: "Contact Us", path: "/contactUs" },
    { label: "Delete Account", path: "/delete" },
  ],
};
