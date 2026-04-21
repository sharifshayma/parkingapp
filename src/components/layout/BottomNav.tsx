"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [
  {
    label: "בית",
    href: "/home",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "הצע חניה",
    href: "/offer",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    label: "ההזמנות שלי",
    href: "/my-bookings",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "החניה שלי",
    href: "/my-parking",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 17V7h4a3 3 0 010 6H9" />
      </svg>
    ),
  },
];

function NavTabContent({
  icon,
  label,
  isActive,
}: {
  icon: ReactNode;
  label: string;
  isActive: boolean;
}) {
  const { pending } = useLinkStatus();
  const showActive = isActive || pending;

  return (
    <div
      className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[64px] ${
        showActive
          ? "bg-[var(--color-primary-pale)] text-[var(--color-primary-dark)]"
          : "text-[var(--color-text-muted)]"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium leading-tight">{label}</span>
      {/* Pending dot — always rendered, opacity toggled to avoid layout shift */}
      <span
        aria-hidden
        className={`absolute top-0.5 end-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] transition-opacity ${
          pending ? "opacity-100 animate-pulse" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-primary-pale)] shadow-[var(--shadow-medium)] z-50">
      <div className="flex items-center justify-around py-2 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}>
              <NavTabContent
                icon={tab.icon}
                label={tab.label}
                isActive={isActive}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
