import { Navbar } from "@/components/layout/navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main style={{ paddingTop: "48px" }}>
        <div className="px-6 py-5">{children}</div>
      </main>
    </div>
  );
}
