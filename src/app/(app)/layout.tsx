import { TopNav } from "@/components/nav/TopNav";
import { MobileTabBar } from "@/components/nav/MobileTabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-12">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
