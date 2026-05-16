import { UserProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/ui";

export default function UserAccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        subtitle="Manage your name, email, password, and security from Clerk."
      />
      <div className="flex justify-center">
        <UserProfile path="/user" routing="path" />
      </div>
    </div>
  );
}
