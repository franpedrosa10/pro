"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsPending(false);

    if (updateError) {
      setError("No se pudo actualizar la contraseña. Pedí un nuevo email de recuperación e intentá otra vez.");
      return;
    }

    setInfo("Contraseña actualizada. Redirigiendo al dashboard...");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1000);
  }

  return (
    <main className="page-shell">
      <div className="app-container fade-in">
        <section className="panel mx-auto max-w-lg p-6 sm:p-7">
          <p className="chip w-fit">Recuperación</p>
          <h1 className="mt-3 text-4xl leading-none sm:text-5xl">Nueva contraseña</h1>
          <p className="section-subtitle mt-2 text-sm">Elegí una nueva contraseña para tu cuenta.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="label-tech">Nueva contraseña</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-tech pr-12"
                  placeholder="******"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="input-eye-toggle absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={2.1} /> : <Eye size={16} strokeWidth={2.1} />}
                </button>
              </div>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="label-tech">Repetí la contraseña</span>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="input-tech pr-12"
                  placeholder="******"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  title={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="input-eye-toggle absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? <EyeOff size={16} strokeWidth={2.1} /> : <Eye size={16} strokeWidth={2.1} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Guardar nueva contraseña"}
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
