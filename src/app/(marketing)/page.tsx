import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default async function MarketingPage() {
  const { userId } = await auth();

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Relist</h1>
      <p className="mt-4 text-lg text-gray-600">
        Track your resale inventory, prices, and profits — across Vinted and beyond.
      </p>

      <div className="mt-10 flex items-center gap-3">
        {userId ? (
          <>
            <Link href="/dashboard" className="rounded-md bg-black px-4 py-2 text-white">
              Open dashboard
            </Link>
            <UserButton />
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3 [&_button]:rounded-md [&_button]:px-4 [&_button]:py-2 [&_button]:cursor-pointer [&_button]:border [&_button]:border-gray-300 [&_button]:bg-white [&_button]:text-gray-900 [&_button:hover]:bg-gray-50">
              <SignInButton mode="modal" />
            </div>
            <p className="text-sm text-gray-500">
              Access is invite-only. Ask Calvin for an invite link.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
