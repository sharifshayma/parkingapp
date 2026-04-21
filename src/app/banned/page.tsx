import Card from "@/components/ui/Card";
import SignOutButton from "@/components/auth/SignOutButton";

export default function BannedPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-10 gap-4">
      <h1 className="text-center text-lg font-bold text-[var(--color-text-primary)]">
        שיתוף חניה בגינדי 4
      </h1>
      <Card className="max-w-md w-full flex flex-col gap-4 text-center">
        <h2 className="text-xl font-bold">החשבון נחסם</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          החשבון שלך נחסם מהאפליקציה. אם לדעתך זו טעות, פנה לדיירי הבניין
          האחראים על שיתוף החניה.
        </p>
        <SignOutButton />
      </Card>
    </div>
  );
}
