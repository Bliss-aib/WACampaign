import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageShell } from "@/components/layout/page-shell";
import { getUserId, getOrCreateBusinessId, getCurrentBusiness } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/sign-in");

  // Ensure the business row exists before checking onboarding state.
  await getOrCreateBusinessId(userId);
  const business = await getCurrentBusiness(userId);

  if (business && !business.onboarding_completed) {
    redirect("/onboarding");
  }

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
