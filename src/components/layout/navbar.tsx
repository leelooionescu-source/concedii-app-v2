"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, CalendarDays, Calendar, Star, Menu, X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Panou", icon: LayoutDashboard },
  { href: "/angajati", label: "Angajati", icon: Users },
  { href: "/concedii", label: "Concedii", icon: CalendarDays },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/sarbatori", label: "Sarbatori", icon: Star },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-4 gap-1 shadow-md" style={{ backgroundColor: "#7B1FA2" }}>
        <Link href="/" className="flex items-center gap-2 mr-4 font-bold text-white text-sm shrink-0">
          <CalendarDays className="h-5 w-5" />
          Concedii
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "white" : "rgba(255,255,255,0.85)",
                  backgroundColor: isActive ? "rgba(0,0,0,0.2)" : "transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.15)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div
          className="fixed top-12 left-0 right-0 z-40 shadow-lg md:hidden"
          style={{ backgroundColor: "#7B1FA2" }}
        >
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium border-b border-white/10"
                style={{
                  color: "white",
                  backgroundColor: isActive ? "rgba(0,0,0,0.2)" : "transparent",
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
