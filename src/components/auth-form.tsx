"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { COUNTRIES, getCountryNameByCode } from "@/lib/domain/countries";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  nextPath?: string;
  initialError?: string | null;
};

function normalizeSupabaseAuthErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return message;
  }

  try {
    const parsed = JSON.parse(trimmed) as { msg?: string; message?: string };
    if (typeof parsed.msg === "string" && parsed.msg.length > 0) {
      return parsed.msg;
    }
    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return parsed.message;
    }
    return message;
  } catch {
    return message;
  }
}

function detectGoogleIssue(message: string): "provider_disabled" | "redirect_mismatch" | "invalid_credentials" | null {
  const normalized = message.toLowerCase();

  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "provider_disabled";
  }

  if (normalized.includes("redirect") && normalized.includes("not allowed")) {
    return "redirect_mismatch";
  }

  if (normalized.includes("invalid_client") || normalized.includes("invalid client")) {
    return "invalid_credentials";
  }

  return null;
}

export function AuthForm({ nextPath = "/dashboard", initialError = null }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("AR");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const router = useRouter();

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsPending(true);

    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim() || !phone.trim() || !countryCode.trim()) {
        setIsPending(false);
        setError("Nombre, apellido, teléfono y país son obligatorios.");
        return;
      }

      const normalizedCountryCode = countryCode.trim().toUpperCase();
      const countryName = getCountryNameByCode(normalizedCountryCode);
      if (!countryName) {
        setIsPending(false);
        setError("Seleccioná un país válido.");
        return;
      }

      const normalizedPhone = phone.trim().replace(/\s+/g, "");
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: normalizedPhone,
            country_code: normalizedCountryCode,
            country_name: countryName,
            display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          },
        },
      });
      setIsPending(false);

      if (signUpError) {
        setError(normalizeSupabaseAuthErrorMessage(signUpError.message));
        return;
      }

      setFirstName("");
      setLastName("");
      setPhone("");
      setCountryCode("AR");

      if (!data.session) {
        setInfo("Cuenta creada. Si tenés confirmación por mail activa, revisá inbox y spam.");
        return;
      }

      router.push(nextPath);
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsPending(false);

    if (signInError) {
      setError(normalizeSupabaseAuthErrorMessage(signInError.message));
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setInfo(null);
    setIsGooglePending(true);

    const supabase = createSupabaseBrowserClient();
    const baseUrl = window.location.origin;
    const safeNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard";
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    setIsGooglePending(false);

    if (oauthError) {
      const normalizedMessage = normalizeSupabaseAuthErrorMessage(oauthError.message);
      const issue = detectGoogleIssue(normalizedMessage);

      if (issue === "provider_disabled") {
        setError("Google no está habilitado en Supabase.");
        return;
      }

      if (issue === "redirect_mismatch") {
        setError("La URL de redirección de OAuth no está permitida.");
        return;
      }

      if (issue === "invalid_credentials") {
        setError("Google está habilitado pero hay un problema de credenciales (Client ID / Secret).");
        return;
      }

      setError(normalizedMessage);
    }
  }

  return (
    <div className="panel w-full p-6 sm:p-7">
      <div className="mb-1 flex items-center gap-2">
        <span className="chip">Acceso</span>
      </div>

      <h2 className="mt-2 text-3xl leading-none text-[#1f2937] sm:text-4xl">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h2>
      <p className="section-subtitle mt-2">
        {mode === "login" ? "Entrá con tu email o Google." : "Completá tus datos para registrarte."}
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="label-tech">Nombre</span>
              <input
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="input-tech"
                placeholder="Juan"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="label-tech">Apellido</span>
              <input
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="input-tech"
                placeholder="Pérez"
              />
            </label>
          </div>
        ) : null}

        {mode === "signup" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="label-tech">Teléfono</span>
              <input
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="input-tech"
                placeholder="+54911..."
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="label-tech">País</span>
              <select
                required
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="select-tech"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

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

        <label className="block space-y-1 text-sm">
          <span className="label-tech">Contraseña</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
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

        {mode === "login" ? (
          <Link
            href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
            className="link-inline inline-flex text-sm"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Procesando..." : mode === "login" ? "Iniciar sesión" : "Registrarme"}
        </button>
      </form>

      <p className="mt-4 text-sm text-[#5c6675]">
        {mode === "login" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
        <button
          type="button"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
          className="link-inline"
        >
          {mode === "login" ? "Registrate" : "Iniciá sesión"}
        </button>
      </p>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e5d7aa]" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">o</span>
        <div className="h-px flex-1 bg-[#e5d7aa]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGooglePending}
        className="btn-ghost flex w-full items-center justify-center gap-2 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d5c28a] text-[11px]"
        >
          G
        </span>
        {isGooglePending ? "Redirigiendo a Google..." : "Continuar con Google"}
      </button>

      {error ? <p className="alert-error mt-4 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-4 rounded-lg p-3 text-sm">{info}</p> : null}
    </div>
  );
}
