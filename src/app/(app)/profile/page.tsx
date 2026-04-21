"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { ParkingSpot } from "@/lib/types/domain";
import { useRouter } from "next/navigation";
import { formatDateISO } from "@/lib/utils/time";
import { updateProfile } from "@/lib/actions/auth";

export default function ProfilePage() {
  const [email, setEmail] = useState<string>("");
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [lockedSpotIds, setLockedSpotIds] = useState<Set<string>>(new Set());
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newSpot, setNewSpot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSpotId, setSavingSpotId] = useState<string | null>(null);
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

      setEmail(user.email ?? "");

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
        setFullName(profileData.full_name || "");
        setPhone(profileData.phone || "");
      }

      const spotList = spotsData ?? [];
      setSpots(spotList);

      // Which spots have active/future confirmed reservations? Those are
      // locked — the spot_number can't be changed.
      if (spotList.length > 0) {
        const today = formatDateISO(new Date());
        const { data: locked } = await supabase
          .from("reservations")
          .select("parking_spot_id")
          .in(
            "parking_spot_id",
            spotList.map((s) => s.id)
          )
          .eq("status", "confirmed")
          .gte("date", today);
        setLockedSpotIds(
          new Set((locked ?? []).map((r) => r.parking_spot_id as string))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);

    const result = await updateProfile({ fullName, phone });

    if (result.error) {
      setError(result.error);
    } else {
      if (result.phone) {
        setPhone(result.phone);
      }
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
    if (lockedSpotIds.has(spotId)) {
      setError("לא ניתן למחוק חניה עם הזמנות עתידיות");
      return;
    }

    const supabase = createClient();

    // Also block if the spot still has future offered availability slots
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

  function startEditSpot(spot: ParkingSpot) {
    if (lockedSpotIds.has(spot.id)) return;
    setError("");
    setEditingSpotId(spot.id);
    setEditingValue(spot.spot_number);
  }

  function cancelEditSpot() {
    setEditingSpotId(null);
    setEditingValue("");
  }

  async function saveEditSpot(spotId: string) {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    setError("");
    setSavingSpotId(spotId);

    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("parking_spots")
      .update({ spot_number: trimmed })
      .eq("id", spotId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        setError(`חניה מספר ${trimmed} כבר רשומה על דייר אחר`);
      } else {
        setError("שגיאה בעדכון החניה");
      }
      setSavingSpotId(null);
      return;
    }

    if (data) {
      setSpots(spots.map((s) => (s.id === spotId ? data : s)));
      setEditingSpotId(null);
      setEditingValue("");
    }
    setSavingSpotId(null);
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
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              אימייל
            </span>
            <span className="text-sm font-numbers" dir="ltr">
              {email || "—"}
            </span>
          </div>

          <Input
            label="שם מלא"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="מספר טלפון"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="050-1234567"
            dir="ltr"
            className="text-left"
            autoComplete="tel"
          />

          {error && (
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          )}
          {success && (
            <p className="text-sm text-[var(--color-success)]">{success}</p>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !fullName.trim() || !phone.trim()}
            fullWidth
          >
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">החניות שלי</h3>

          {spots.map((spot) => {
            const locked = lockedSpotIds.has(spot.id);
            const isEditing = editingSpotId === spot.id;
            const isSaving = savingSpotId === spot.id;

            return (
              <div
                key={spot.id}
                className="flex flex-col gap-1 py-2 border-b border-[var(--color-primary-pale)] last:border-0"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="flex-1"
                      disabled={isSaving}
                    />
                    <Button
                      size="sm"
                      onClick={() => saveEditSpot(spot.id)}
                      disabled={isSaving || !editingValue.trim()}
                    >
                      {isSaving ? "שומר..." : "שמור"}
                    </Button>
                    <button
                      type="button"
                      onClick={cancelEditSpot}
                      disabled={isSaving}
                      className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-numbers">חניה {spot.spot_number}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEditSpot(spot)}
                        disabled={locked}
                        className="text-sm text-[var(--color-primary-dark)] hover:underline disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:no-underline"
                      >
                        ערוך
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpot(spot.id)}
                        disabled={locked}
                        className="text-sm text-[var(--color-error)] hover:underline disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:no-underline"
                      >
                        הסר
                      </button>
                    </div>
                  </div>
                )}
                {locked && !isEditing && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    לא ניתן לערוך — קיימות הזמנות עתידיות על החניה.
                  </p>
                )}
              </div>
            );
          })}

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
