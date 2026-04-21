export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="gradient-header h-48 wave-divider flex items-center justify-center">
        <h1 className="text-white text-3xl font-bold">חניה בגינדי4</h1>
      </div>
      <main className="flex-1 flex items-start justify-center px-4 -mt-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
