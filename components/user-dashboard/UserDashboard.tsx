'use client';

import { UserEmailMappingList } from "./UserEmailMappingList";
import { UserTeamList } from "./UserTeamList";
import { UserCostCenterSection } from "./UserCostCenterSection";
import { Separator } from "@/components/ui/separator";

export default function UserDashboard() {
  return (
    <div className="container mx-auto max-w-5xl space-y-10 py-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground">
            View your verified email addresses and GitHub mapping.
          </p>
        </div>
        <UserEmailMappingList />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Teams</h2>
          <p className="text-muted-foreground">
            Teams you belong to in this organization.
          </p>
        </div>
        <UserTeamList />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing & Budgets</h2>
          <p className="text-muted-foreground">
            Cost center assignment and associated budget limits.
          </p>
        </div>
        <UserCostCenterSection />
      </section>
    </div>
  );
}
