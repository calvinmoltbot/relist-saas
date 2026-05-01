import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

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
          <>
            <SignInButton mode="modal">
              <button className="rounded-md bg-black px-4 py-2 text-white">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-md border px-4 py-2">Create account</button>
            </SignUpButton>
          </>
        )}
      </div>
    </main>
  );
}
