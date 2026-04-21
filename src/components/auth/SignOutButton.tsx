"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <Button
      variant="ghost"
      fullWidth
      disabled={loading}
      onClick={onClick}
      className={className}
    >
      {loading ? "מתנתק..." : "התנתק"}
    </Button>
  );
}
