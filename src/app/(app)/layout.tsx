import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = data?.is_admin ?? false;
  }

  return (
    <div className="min-h-dvh flex flex-col pb-20">
      <AppHeader />
      <main className="flex-1 px-4">{children}</main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
