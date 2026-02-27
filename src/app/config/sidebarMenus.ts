// src/config/sidebarMenus.ts

export const sidebarMenus = {
  admin: [
    { label: "Profile", path: "/dashboard" },
    { label: "Analytics", path: "/admin" },
    { label: "Home", path: "/" },
    { label: "Discover", path: "/map" },
    { label: "Shop", path: "/products" },
    { label: "News Feed", path: "/feed" },
    { label: "Contact Us", path: "/contactUs" },
  ],
  vet: [
    { label: "Profile", path: "/dashboard" },
    { label: "Home", path: "/" },
    { label: "Discover", path: "/map" },
    { label: "Shop", path: "/products" },
    { label: "News Feed", path: "/feed" },
    { label: "Contact Us", path: "/contactUs" },
  ],
  user: [
    { label: "Profile", path: "/dashboard" },
    { label: "Discover", path: "/map" },
    { label: "Shop", path: "/products" },
    { label: "News Feed", path: "/feed" },
    { label: "Book Appointment", path: "/appointments/new" },
    { label: "My Appointments", path: "/dashboard?view=appointments" },
    { label: "Contact Us", path: "/contactUs" },
    { label: "Delete Account", path: "/delete" },
  ],
};
