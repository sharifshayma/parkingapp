"use client";

import { useState, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { approveUser, banUser, unbanUser } from "@/lib/actions/admin";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string;
  apartment_number: string | null;
  status: "pending" | "approved" | "banned";
  is_admin: boolean;
  created_at: string;
}

export default function AdminUserRow({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function run(fn: () => Promise<{ error?: string }>) {
    setError("");
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="font-medium">
            {profile.full_name || "—"}
            {profile.is_admin && (
              <span className="ms-2 text-[10px] bg-[var(--color-navy)] text-white rounded-[var(--radius-badge)] px-2 py-0.5 align-middle">
                אדמין
              </span>
            )}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)] font-numbers" dir="ltr">
            {profile.phone}
          </span>
          {profile.apartment_number && (
            <span className="text-xs text-[var(--color-text-muted)]">
              דירה {profile.apartment_number}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 items-stretch shrink-0">
          {profile.status === "pending" && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => run(() => approveUser(profile.id))}
                disabled={pending}
              >
                {pending ? "..." : "אשר"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => run(() => banUser(profile.id))}
                disabled={pending}
              >
                חסום
              </Button>
            </>
          )}
          {profile.status === "approved" && !profile.is_admin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => run(() => banUser(profile.id))}
              disabled={pending}
            >
              {pending ? "..." : "חסום"}
            </Button>
          )}
          {profile.status === "banned" && (
            <Button
              variant="success"
              size="sm"
              onClick={() => run(() => unbanUser(profile.id))}
              disabled={pending}
            >
              {pending ? "..." : "בטל חסימה"}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-[var(--color-error)]">{error}</p>
      )}
    </Card>
  );
}
