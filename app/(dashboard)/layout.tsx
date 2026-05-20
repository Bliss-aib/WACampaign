import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageShell } from "@/components/layout/page-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-60">
        <Header title="WACampaign" />
        <PageShell>{children}</PageShell>
      </div>
    </div>
  );
}
