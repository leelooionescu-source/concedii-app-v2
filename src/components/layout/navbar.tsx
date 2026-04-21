"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, CalendarDays, Calendar, Star, Menu, X, Bell, BellOff, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { isPushSupported, getCurrentSubscription, enablePush, disablePush } from "@/lib/push-client";

const navItems = [
  { href: "/", label: "Panou", icon: LayoutDashboard },
  { href: "/angajati", label: "Echipa PA", icon: Users },
  { href: "/concedii", label: "Concedii", icon: CalendarDays },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/sarbatori", label: "Sarbatori", icon: Star },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-4 gap-1 shadow-md" style={{ backgroundColor: "#1E3A8A" }}>
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

        {/* Push notification toggle */}
        <PushToggle />

        {/* Notifications bell */}
        <NotificationBell />

        {/* Logout */}
        <LogoutButton />

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
          style={{ backgroundColor: "#1E3A8A" }}
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

function PushToggle() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) { setSupported(false); return; }
    getCurrentSubscription().then((s) => setEnabled(!!s));
  }, []);

  if (!supported) return null;

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        toast.success("Notificarile au fost dezactivate");
      } else {
        const r = await enablePush();
        if (r.ok) {
          setEnabled(true);
          toast.success("Notificari activate. Vei primi un sumar zilnic la 09:00.");
        } else {
          toast.error(r.error || "Nu s-au putut activa notificarile");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      title={enabled ? "Notificari activate (apasa pentru a dezactiva)" : "Activeaza notificari zilnice"}
      className="text-white/90 hover:text-white p-1 mr-1"
      disabled={busy}
    >
      {enabled ? <Bell className="h-5 w-5" style={{ fill: "#fde68a" }} /> : <BellOff className="h-5 w-5" />}
    </button>
  );
}

function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={handleLogout}
      title="Deconectare"
      className="text-white/90 hover:text-white p-1 mr-1"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}

function NotificationBell() {
  const [notifs, setNotifs] = useState<{ title: string; body: string; type: string }[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifs(data || []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const typeIcon: Record<string, string> = {
    birthday: "🎂",
    concediu: "🏖️",
    sold: "⚠️",
  };

  return (
    <div ref={ref} className="relative mr-2">
      <button onClick={() => setOpen(!open)} className="relative text-white/90 hover:text-white p-1">
        <Bell className="h-5 w-5" />
        {notifs.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {notifs.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b font-bold text-sm text-gray-700">
            Notificari ({notifs.length})
          </div>
          {notifs.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">Nicio notificare</div>
          ) : (
            notifs.map((n, i) => (
              <div key={i} className="px-3 py-2 border-b last:border-0 hover:bg-gray-50">
                <div className="text-xs font-semibold text-gray-700">
                  {typeIcon[n.type] || "📋"} {n.title}
                </div>
                <div className="text-xs text-gray-500">{n.body}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
