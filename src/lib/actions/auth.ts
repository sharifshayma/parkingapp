"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    Sentry.captureException(error, {
      tags: { action: "signIn", step: "signInWithPassword" },
      extra: { email, status: error.status, code: error.code },
    });
    return { error: "אימייל או סיסמה שגויים" };
  }

  // Check if profile is complete
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_profile_complete")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    Sentry.captureException(profileError, {
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

  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: data.user.id,
      phone: "",
    });
    if (insertError) {
      Sentry.captureException(insertError, {
        tags: { action: "signIn", step: "create_profile" },
        extra: {
          userId: data.user.id,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          message: insertError.message,
        },
      });
    }
    redirect("/complete-profile");
  }

  if (!profile.is_profile_complete) {
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
    Sentry.captureException(error, {
      tags: { action: "signUp", step: "signUp" },
      extra: { email, status: error.status, code: error.code },
    });
    if (error.message.includes("already registered")) {
      return { error: "אימייל זה כבר רשום, נסה להתחבר" };
    }
    return { error: "שגיאה בהרשמה, נסה שוב" };
  }

  if (!data.user) {
    Sentry.captureMessage("signUp succeeded but returned no user", {
      level: "error",
      tags: { action: "signUp", step: "no_user_returned" },
      extra: { email },
    });
    return { error: "שגיאה בהרשמה" };
  }

  // Create profile
  const { error: insertError } = await supabase.from("profiles").insert({
    id: data.user.id,
    phone: "",
  });
  if (insertError) {
    Sentry.captureException(insertError, {
      tags: { action: "signUp", step: "create_profile" },
      extra: {
        userId: data.user.id,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        message: insertError.message,
      },
    });
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

  const fullName = formData.get("full_name") as string;
  const spotNumbers = formData.getAll("spot_number") as string[];

  if (!fullName) {
    return { error: "יש למלא שם מלא" };
  }

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      is_profile_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    Sentry.captureException(profileError, {
      tags: { action: "completeProfile", step: "update_profile" },
      extra: {
        userId: user.id,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        message: profileError.message,
      },
    });
    return { error: "שגיאה בעדכון הפרופיל" };
  }

  // Add parking spots if provided
  for (const spotNumber of spotNumbers) {
    if (spotNumber.trim()) {
      const { error: spotError } = await supabase
        .from("parking_spots")
        .insert({
          owner_id: user.id,
          spot_number: spotNumber.trim(),
        });

      if (spotError) {
        Sentry.captureException(spotError, {
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
