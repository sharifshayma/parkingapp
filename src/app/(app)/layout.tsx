import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col pb-20">
      <AppHeader />
      <main className="flex-1 px-4 -mt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
