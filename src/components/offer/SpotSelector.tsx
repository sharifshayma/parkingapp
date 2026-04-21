import type { ParkingSpot } from "@/lib/types/domain";

interface SpotSelectorProps {
  spots: ParkingSpot[];
  selectedSpotId: string;
  onChange: (id: string) => void;
}

export default function SpotSelector({ spots, selectedSpotId, onChange }: SpotSelectorProps) {
  if (spots.length <= 1) return null;

  return (
    <div className="flex flex-col gap-1.5 mb-3">
      <label className="text-sm font-medium">בחר חניה</label>
      <select
        value={selectedSpotId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-[var(--radius-input)] border border-[var(--color-primary-pale)] bg-[var(--color-surface)]"
      >
        {spots.map((spot) => (
          <option key={spot.id} value={spot.id}>
            חניה {spot.spot_number}
            {spot.label ? ` - ${spot.label}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
