import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export default function Card({
  children,
  padded = true,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] ${padded ? "p-5" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
