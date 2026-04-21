"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { signIn, signUp } from "@/lib/actions/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const action = mode === "login" ? signIn : signUp;
    const result = await action(email, password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, the action redirects
  }

  return (
    <>
      <Card className="mt-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-center">
            {mode === "login" ? "כניסה לחניה בגינדי4" : "הרשמה לחניה בגינדי4"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            {mode === "login"
              ? "הזן אימייל וסיסמה כדי להתחבר"
              : "צור חשבון חדש כדי להתחיל"}
          </p>

          <Input
            label="אימייל"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className="text-left"
            error={mode === "login" ? error : undefined}
          />

          <Input
            label="סיסמה"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            className="text-left"
            error={mode === "register" ? error : undefined}
          />

          {error && mode === "login" && (
            <p className="text-sm text-[var(--color-error)] text-center">
              {error}
            </p>
          )}
          {error && mode === "register" && (
            <p className="text-sm text-[var(--color-error)] text-center">
              {error}
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            disabled={loading || !email || !password}
          >
            {loading
              ? "טוען..."
              : mode === "login"
                ? "התחבר"
                : "הרשם"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] text-center"
          >
            {mode === "login"
              ? "אין לך חשבון? הרשם"
              : "יש לך חשבון? התחבר"}
          </button>
        </form>
      </Card>
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 flex gap-2">
          {[1, 2].map((n) => (
            <button
              key={n}
              type="button"
              onClick={async () => {
                setLoading(true);
                setError("");
                try {
                  const res = await fetch("/api/dev-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user: n }),
                  });
                  const data = await res.json();
                  if (data.error) {
                    setError(data.error);
                    setLoading(false);
                  } else {
                    window.location.href = "/home";
                  }
                } catch {
                  setError("Dev login failed");
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex-1 py-2 text-sm text-[var(--color-text-secondary)] border border-dashed border-[var(--color-text-muted)] rounded-lg hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {loading ? "..." : `Dev User ${n}`}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
