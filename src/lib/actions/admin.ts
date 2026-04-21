"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApprovalEmail } from "@/lib/email/approval";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "unauthenticated" };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) return { ok: false as const, reason: "not_admin" };
  return { ok: true as const, supabase, userId: user.id };
}

export async function approveUser(userId: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "אין הרשאה" };

  // Capture prior status so we only notify on the pending→approved transition.
  const { data: priorProfile } = await gate.supabase
    .from("profiles")
    .select("status, full_name")
    .eq("id", userId)
    .single();

  const { error } = await gate.supabase
    .from("profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      banned_at: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[admin] approveUser failed", { userId, error });
    Sentry.captureException(error, {
      tags: { action: "approveUser" },
      extra: { userId, code: error.code, message: error.message },
    });
    await Sentry.flush(2000);
    return { error: "שגיאה באישור המשתמש" };
  }

  if (priorProfile?.status === "pending") {
    try {
      const admin = createAdminClient();
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const result = await sendApprovalEmail(
        authUser?.user?.email,
        priorProfile.full_name ?? null
      );
      if (!result.sent) {
        console.warn("[admin] approval email not sent", { userId, reason: result.reason });
        if (result.reason === "send_failed") {
          Sentry.captureException(result.error, {
            tags: { action: "approveUser.sendEmail" },
            extra: { userId },
          });
        }
      }
    } catch (emailError) {
      // Email failures must not break approval.
      console.error("[admin] approval email threw", { userId, emailError });
      Sentry.captureException(emailError, {
        tags: { action: "approveUser.sendEmail" },
        extra: { userId },
      });
    }
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function banUser(userId: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "אין הרשאה" };

  if (userId === gate.userId) {
    return { error: "לא ניתן לחסום את עצמך" };
  }

  const { error } = await gate.supabase
    .from("profiles")
    .update({
      status: "banned",
      banned_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[admin] banUser failed", { userId, error });
    Sentry.captureException(error, {
      tags: { action: "banUser" },
      extra: { userId, code: error.code, message: error.message },
    });
    await Sentry.flush(2000);
    return { error: "שגיאה בחסימת המשתמש" };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function unbanUser(userId: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: "אין הרשאה" };

  const { error } = await gate.supabase
    .from("profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      banned_at: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[admin] unbanUser failed", { userId, error });
    Sentry.captureException(error, {
      tags: { action: "unbanUser" },
      extra: { userId, code: error.code, message: error.message },
    });
    await Sentry.flush(2000);
    return { error: "שגיאה בביטול החסימה" };
  }

  revalidatePath("/admin");
  return { success: true };
}
