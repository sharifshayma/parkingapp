"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "אימייל או סיסמה שגויים" };
  }

  // Check if profile is complete
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_profile_complete")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      phone: "",
    });
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
    if (error.message.includes("already registered")) {
      return { error: "אימייל זה כבר רשום, נסה להתחבר" };
    }
    return { error: "שגיאה בהרשמה, נסה שוב" };
  }

  if (!data.user) {
    return { error: "שגיאה בהרשמה" };
  }

  // Create profile
  await supabase.from("profiles").insert({
    id: data.user.id,
    phone: "",
  });

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
        if (spotError.code === "23505") {
          return { error: `חניה מספר ${spotNumber} כבר רשומה על דייר אחר` };
        }
        return { error: "שגיאה בהוספת חניה" };
      }
    }
  }

  redirect("/home");
}
