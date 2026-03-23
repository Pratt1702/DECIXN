import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { SubNavbar } from "./SubNavbar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-text-muted font-sans antialiased overflow-x-hidden">
      <Navbar />
      <SubNavbar />
      {/* max-w-7xl for better alignment with navbar containers */}
      <main className="mx-auto max-w-7xl px-6 py-10 min-h-[calc(100vh-120px)]">
        <Outlet />
      </main>
    </div>
  );
}
