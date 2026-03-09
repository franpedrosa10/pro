"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError("Escribí tu email para continuar.");
      return;
    }

    setIsPending(true);
    const supabase = createSupabaseBrowserClient();
    const baseUrl = window.location.origin;
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setIsPending(false);

    if (recoveryError) {
      setError(recoveryError.message);
      return;
    }

    setInfo("Te enviamos un email con el link para recuperar tu contraseña.");
  }

  return (
    <main className="page-shell">
      <div className="app-container fade-in">
        <section className="panel mx-auto max-w-lg p-6 sm:p-7">
          <p className="chip w-fit">Acceso</p>
          <h1 className="mt-3 text-4xl leading-none sm:text-5xl">Recuperar contraseña</h1>
          <p className="section-subtitle mt-2 text-sm">
            Ingresá tu email y te mandamos un link para crear una nueva contraseña.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="label-tech">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-tech"
                placeholder="tu@email.com"
              />
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Enviando..." : "Enviar link de recuperación"}
            </button>
          </form>

          <p className="mt-4 text-sm text-[#5c6675]">
            ¿Recordaste tu clave?{" "}
            <Link href="/login" className="link-inline">
              Volver al login
            </Link>
          </p>

          {error ? <p className="alert-error mt-4 rounded-lg p-3 text-sm">{error}</p> : null}
          {info ? <p className="alert-success mt-4 rounded-lg p-3 text-sm">{info}</p> : null}
        </section>
      </div>
    </main>
  );
}
