import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function ChatLayout() {
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-text-muted font-sans antialiased overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
