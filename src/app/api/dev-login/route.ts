import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const TEST_USERS = [
  { phone: "+972505704305", name: "User A", apartment: "1", spot: "42" },
  { phone: "+972545999637", name: "User B", apartment: "2", spot: "7" },
];

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userIndex = body.user === 2 ? 1 : 0;
  const testUser = TEST_USERS[userIndex];
  const testPassword = "dev-test-12345";
  const testEmail = `devuser${userIndex + 1}@test.local`;

  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers();

  // Find by phone first (preserve existing data), then by email
  // Normalize phone comparison (Supabase may store with or without '+')
  const phoneDigits = testUser.phone.replace("+", "");
  let user = users?.users?.find(
    (u) => u.phone === testUser.phone || u.phone === phoneDigits
  ) || users?.users?.find((u) => u.email === testEmail);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      phone: testUser.phone,
      phone_confirm: true,
      password: testPassword,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    user = data.user;
  }

  // Ensure email and password are set for sign-in (preserves existing user data)
  await admin.auth.admin.updateUserById(user.id, {
    email: testEmail,
    email_confirm: true,
    password: testPassword,
  });

  // Ensure profile exists and is complete
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await admin.from("profiles").insert({
      id: user.id,
      phone: testUser.phone,
      full_name: testUser.name,
      apartment_number: testUser.apartment,
      is_profile_complete: true,
    });
  } else {
    await admin
      .from("profiles")
      .update({ is_profile_complete: true })
      .eq("id", user.id);
  }

  // Ensure parking spot exists
  const { data: spots } = await admin
    .from("parking_spots")
    .select("id")
    .eq("owner_id", user.id);

  if (!spots || spots.length === 0) {
    await admin.from("parking_spots").insert({
      owner_id: user.id,
      spot_number: testUser.spot,
    });
  }

  // Sign in via email+password
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: testUser.name });
}
