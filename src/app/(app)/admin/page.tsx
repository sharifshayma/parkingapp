import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminUserRow from "@/components/admin/AdminUserRow";

interface AdminProfile {
  id: string;
  full_name: string | null;
  phone: string;
  apartment_number: string | null;
  status: "pending" | "approved" | "banned";
  is_admin: boolean;
  created_at: string;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) redirect("/home");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, apartment_number, status, is_admin, created_at")
    .order("created_at", { ascending: false });

  const list = (profiles ?? []) as AdminProfile[];
  const pending = list.filter((p) => p.status === "pending");
  const approved = list.filter((p) => p.status === "approved");
  const banned = list.filter((p) => p.status === "banned");

  return (
    <div className="flex flex-col gap-5 py-4">
      <h2 className="text-lg font-bold">ניהול משתמשים</h2>

      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
          ממתינים לאישור ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-3">
            אין בקשות ממתינות.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((p) => (
              <AdminUserRow key={p.id} profile={p} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
          פעילים ({approved.length})
        </h3>
        {approved.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-3">
            אין משתמשים פעילים.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {approved.map((p) => (
              <AdminUserRow key={p.id} profile={p} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
          חסומים ({banned.length})
        </h3>
        {banned.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-3">
            אין משתמשים חסומים.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {banned.map((p) => (
              <AdminUserRow key={p.id} profile={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
