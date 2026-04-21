"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { parseAndValidatePhone } from "@/lib/utils/phone";

type ErrorContext = Parameters<typeof Sentry.captureException>[1];

async function reportError(error: unknown, context: ErrorContext) {
  console.error("[auth]", context?.tags, context?.extra, error);
  Sentry.captureException(error, context);
  // Vercel serverless: flush the transport before the lambda freezes.
  await Sentry.flush(2000);
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await reportError(error, {
      tags: { action: "signIn", step: "signInWithPassword" },
      extra: { email, status: error.status, code: error.code },
    });
    return { error: "אימייל או סיסמה שגויים" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_profile_complete")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    await reportError(profileError, {
      tags: { action: "signIn", step: "fetch_profile" },
      extra: {
        userId: data.user.id,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        message: profileError.message,
      },
    });
  }

  if (!profile || !profile.is_profile_complete) {
    redirect("/complete-profile");
  }

  redirect("/home");
}

export async function signUp(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    await reportError(error, {
      tags: { action: "signUp", step: "signUp" },
      extra: { email, status: error.status, code: error.code },
    });
    if (error.message.includes("already registered")) {
      return { error: "אימייל זה כבר רשום, נסה להתחבר" };
    }
    return { error: "שגיאה בהרשמה, נסה שוב" };
  }

  if (!data.user) {
    console.error("[auth] signUp returned no user", { email });
    Sentry.captureMessage("signUp succeeded but returned no user", {
      level: "error",
      tags: { action: "signUp", step: "no_user_returned" },
      extra: { email },
    });
    await Sentry.flush(2000);
    return { error: "שגיאה בהרשמה" };
  }

  redirect("/complete-profile");
}

export async function completeProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = (formData.get("full_name") as string | null)?.trim() ?? "";
  const rawPhone = (formData.get("phone") as string | null)?.trim() ?? "";
  const spotNumbers = formData.getAll("spot_number") as string[];

  if (!fullName) {
    return { error: "יש למלא שם מלא" };
  }

  if (!rawPhone) {
    return { error: "יש למלא מספר טלפון" };
  }

  const { valid, e164 } = parseAndValidatePhone(rawPhone);
  if (!valid || !e164) {
    return { error: "מספר טלפון לא תקין" };
  }

  // Upsert so a missing profile row self-heals instead of causing
  // downstream FK violations on parking_spots.
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      phone: e164,
      full_name: fullName,
      is_profile_complete: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    await reportError(profileError, {
      tags: { action: "completeProfile", step: "upsert_profile" },
      extra: {
        userId: user.id,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        message: profileError.message,
      },
    });
    if (profileError.code === "23505") {
      return { error: "מספר הטלפון הזה כבר רשום על משתמש אחר" };
    }
    return { error: "שגיאה בעדכון הפרופיל" };
  }

  for (const spotNumber of spotNumbers) {
    if (spotNumber.trim()) {
      const { error: spotError } = await supabase
        .from("parking_spots")
        .insert({
          owner_id: user.id,
          spot_number: spotNumber.trim(),
        });

      if (spotError) {
        await reportError(spotError, {
          tags: { action: "completeProfile", step: "insert_parking_spot" },
          extra: {
            userId: user.id,
            spotNumber: spotNumber.trim(),
            code: spotError.code,
            details: spotError.details,
            hint: spotError.hint,
            message: spotError.message,
          },
        });
        if (spotError.code === "23505") {
          return { error: `חניה מספר ${spotNumber} כבר רשומה על דייר אחר` };
        }
        return { error: "שגיאה בהוספת חניה" };
      }
    }
  }

  redirect("/home");
}
