import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="font-semibold">Relist</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/plan">Plan</Link>
          <Link href="/inventory">Inventory</Link>
          <Link href="/profit">Profit</Link>
          <Link href="/bestsellers">Bestsellers</Link>
          <Link href="/health">Health</Link>
          <Link href="/market">Market</Link>
          <Link href="/watch">Watch</Link>
          <Link href="/describe">Describe</Link>
          <Link href="/expenses">Expenses</Link>
          <Link href="/settings/api-keys">API keys</Link>
        </nav>
        <UserButton />
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
