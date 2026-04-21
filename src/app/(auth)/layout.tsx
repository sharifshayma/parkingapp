export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="gradient-header h-48 wave-divider flex flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-white text-3xl font-bold">שיתוף חניה בגינדי 4</h1>
        <p className="text-white/90 text-sm">מציעים ומקבלים חניה בקליק</p>
      </div>
      <main className="flex-1 flex items-start justify-center px-4 -mt-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
