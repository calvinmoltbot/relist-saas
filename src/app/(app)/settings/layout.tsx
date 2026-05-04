import { SubNav } from "@/components/nav/SubNav";

const ITEMS = [
  { href: "/settings/api-keys", label: "API keys" },
  { href: "/settings/backup", label: "Backup" },
  { href: "/settings/targets", label: "Targets" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <SubNav items={ITEMS} />
      {children}
    </div>
  );
}
