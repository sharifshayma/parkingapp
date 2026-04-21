"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { completeProfile } from "@/lib/actions/auth";

export default function CompleteProfilePage() {
  const [spotNumbers, setSpotNumbers] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function addSpotField() {
    setSpotNumbers([...spotNumbers, ""]);
  }

  function updateSpot(index: number, value: string) {
    const updated = [...spotNumbers];
    updated[index] = value;
    setSpotNumbers(updated);
  }

  function removeSpot(index: number) {
    if (spotNumbers.length <= 1) {
      setSpotNumbers([""]);
      return;
    }
    setSpotNumbers(spotNumbers.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    // Add spot numbers to formData
    spotNumbers.forEach((spot) => {
      if (spot.trim()) {
        formData.append("spot_number", spot.trim());
      }
    });

    const result = await completeProfile(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, completeProfile redirects
  }

  return (
    <Card className="mt-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-center">השלמת פרופיל</h2>
        <p className="text-sm text-[var(--color-text-secondary)] text-center">
          מלא את הפרטים שלך כדי להתחיל להשתמש באפליקציה
        </p>

        <Input label="שם מלא" name="full_name" required placeholder="ישראל ישראלי" />

        <Input
          label="מספר טלפון"
          name="phone"
          type="tel"
          required
          placeholder="050-1234567"
          dir="ltr"
          className="text-left"
          autoComplete="tel"
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">
            מספר חניה (אופציונלי)
          </label>
          {spotNumbers.map((spot, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                placeholder="לדוגמה: 5"
                value={spot}
                onChange={(e) => updateSpot(index, e.target.value)}
                className="flex-1"
              />
              {spotNumbers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSpot(index)}
                  className="mt-3 text-[var(--color-text-muted)] hover:text-[var(--color-error)] text-lg"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addSpotField}
            className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] self-start"
          >
            + הוסף חניה נוספת
          </button>
        </div>

        {error && (
          <p className="text-sm text-[var(--color-error)] text-center">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "שומר..." : "להתחיל"}
        </Button>
      </form>
    </Card>
  );
}
