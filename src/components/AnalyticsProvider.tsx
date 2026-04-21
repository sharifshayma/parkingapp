"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { initAnalytics, identifyUser } from "@/lib/analytics";

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) identifyUser(data.user.id, data.user.phone ?? "");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) identifyUser(session.user.id, session.user.phone ?? "");
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
