"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ParkingSpot } from "@/lib/types/domain";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [fullName, setFullName] = useState("");
  const [newSpot, setNewSpot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: spotsData } = await supabase
        .from("parking_spots")
        .select("*")
        .eq("owner_id", user.id);

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
      }
      if (spotsData) setSpots(spotsData);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError("שגיאה בעדכון הפרופיל");
    } else {
      setSuccess("הפרופיל עודכן בהצלחה");
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  async function handleAddSpot() {
    if (!newSpot.trim()) return;
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: spotError } = await supabase
      .from("parking_spots")
      .insert({ owner_id: user.id, spot_number: newSpot.trim() })
      .select()
      .single();

    if (spotError) {
      if (spotError.code === "23505") {
        setError(`חניה מספר ${newSpot} כבר רשומה על דייר אחר`);
      } else {
        setError("שגיאה בהוספת חניה");
      }
      return;
    }

    if (data) {
      setSpots([...spots, data]);
      setNewSpot("");
    }
  }

  async function handleRemoveSpot(spotId: string) {
    const supabase = createClient();

    // Check for future availability
    const { data: futureSlots } = await supabase
      .from("availability_slots")
      .select("id")
      .eq("parking_spot_id", spotId)
      .gte("date", new Date().toISOString().split("T")[0])
      .limit(1);

    if (futureSlots && futureSlots.length > 0) {
      setError("לא ניתן למחוק חניה עם הצעות פעילות");
      return;
    }

    const { error: deleteError } = await supabase
      .from("parking_spots")
      .delete()
      .eq("id", spotId);

    if (!deleteError) {
      setSpots(spots.filter((s) => s.id !== spotId));
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <h2 className="text-lg font-bold">פרופיל</h2>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="text-sm text-[var(--color-text-secondary)]">
            טלפון: <span className="font-numbers" dir="ltr">{profile?.phone}</span>
          </div>

          <Input
            label="שם מלא"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {error && (
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          )}
          {success && (
            <p className="text-sm text-[var(--color-success)]">{success}</p>
          )}

          <Button onClick={handleSave} disabled={saving} fullWidth>
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">החניות שלי</h3>


          {spots.map((spot) => (
            <div
              key={spot.id}
              className="flex items-center justify-between py-2 border-b border-[var(--color-primary-pale)] last:border-0"
            >
              <span className="font-numbers">חניה {spot.spot_number}</span>
              <button
                onClick={() => handleRemoveSpot(spot.id)}
                className="text-sm text-[var(--color-error)] hover:underline"
              >
                הסר
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              placeholder="מספר חניה חדש"
              value={newSpot}
              onChange={(e) => setNewSpot(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleAddSpot}
              disabled={!newSpot.trim()}
            >
              הוסף
            </Button>
          </div>
        </div>
      </Card>

      <Button
        variant="ghost"
        fullWidth
        disabled={loggingOut}
        onClick={async () => {
          setLoggingOut(true);
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/login");
        }}
      >
        {loggingOut ? "מתנתק..." : "התנתק"}
      </Button>
    </div>
  );
}
