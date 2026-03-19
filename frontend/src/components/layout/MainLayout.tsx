import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-bg-main text-text-muted font-sans antialiased overflow-x-hidden">
      <Navbar />
      {/* max-w-4xl keeps everything in the middle with rich whitespace */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
