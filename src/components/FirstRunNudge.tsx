import Link from "next/link";

type Variant = "banner" | "panel";

export function FirstRunNudge({
  variant = "banner",
  heading = "Welcome to Relist",
  body = "You don't have any items yet. Add one manually or set up the Chrome extension to send listings straight from Vinted.",
}: {
  variant?: Variant;
  heading?: string;
  body?: string;
}) {
  const wrap =
    variant === "banner"
      ? "rounded-md border border-blue-200 bg-blue-50 p-5"
      : "rounded-md border border-dashed bg-gray-50 p-10 text-center";

  return (
    <section className={wrap}>
      <p className="text-base font-medium">{heading}</p>
      <p className="mt-1 text-sm text-gray-700">{body}</p>
      <div
        className={`mt-3 flex flex-wrap gap-2 text-sm ${
          variant === "panel" ? "justify-center" : ""
        }`}
      >
        <Link
          href="/inventory/new"
          className="rounded-md bg-black px-3 py-1.5 text-white"
        >
          Add your first item
        </Link>
        <Link
          href="/settings/api-keys"
          className="rounded-md border px-3 py-1.5"
        >
          Set up the extension
        </Link>
      </div>
    </section>
  );
}
