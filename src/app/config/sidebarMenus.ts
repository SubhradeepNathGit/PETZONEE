// src/config/sidebarMenus.ts

export const sidebarMenus = {
  admin: [
    { label: "Overview", path: "/admin", icon: "LayoutDashboard" },
    { label: "Manage Vets", path: "/admin/vets", icon: "Stethoscope" },
    { label: "Manage Users", path: "/admin/users", icon: "Users" },
    { label: "Subscriptions", path: "/admin/subscriptions", icon: "CreditCard" },
    { label: "Vet Approvals", path: "/admin/kyc", icon: "ShieldCheck" },
    { label: "Inventory", path: "/admin/inventory", icon: "Package" },
    { label: "Orders", path: "/admin/orders", icon: "ShoppingBag" },
    { label: "Vet Payments", path: "/admin/payments", icon: "DollarSign" },
    { label: "Messages", path: "/admin/messages", icon: "MessageSquare" },
    { label: "My Profile", path: "/dashboard", icon: "User" },
  ],
  vet: [
    { label: "Overview", path: "/dashboard", icon: "LayoutDashboard" },
    { label: "Appointments", path: "/dashboard?view=appointments", icon: "Calendar" },
    { label: "Messages", path: "/dashboard?view=messages", icon: "MessageSquare" },
    { label: "My Profile", path: "/dashboard?view=profile", icon: "User" },
  ],
  user: [
    { label: "Profile", path: "/dashboard", icon: "User" },
    { label: "Discover", path: "/map", icon: "Compass" },
    { label: "Shop", path: "/products", icon: "ShoppingCart" },
    { label: "News Feed", path: "/feed", icon: "Rss" },
    { label: "Book Appointment", path: "/appointments/new", icon: "PlusCircle" },
    { label: "My Appointments", path: "/dashboard?view=appointments", icon: "Calendar" },
    { label: "My Orders", path: "/dashboard?view=orders", icon: "ShoppingBag" },
    { label: "Support Messages", path: "/dashboard?view=messages", icon: "Headphones" },
    { label: "Vet Messages", path: "/dashboard?view=vet-messages", icon: "Stethoscope" },
    { label: "Contact Us", path: "/contactUs", icon: "Mail" },
    { label: "Delete Account", path: "/delete", icon: "Trash2" },
  ],
};
