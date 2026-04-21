"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "gradient-button text-white shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-strong)]",
      outline:
        "border-2 border-[var(--color-primary)] text-[var(--color-primary-dark)] bg-transparent hover:bg-[var(--color-primary-pale)]",
      ghost:
        "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-primary-pale)]",
      success:
        "bg-[var(--color-success)] text-white shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-strong)] hover:brightness-110",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm rounded-[var(--radius-button)]",
      md: "px-6 py-3 text-base rounded-[var(--radius-button)]",
      lg: "px-8 py-4 text-lg rounded-[var(--radius-button)]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
