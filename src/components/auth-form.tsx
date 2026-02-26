"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  nextPath?: string;
  initialError?: string | null;
};

type GoogleIssue = "provider_disabled" | "redirect_mismatch" | "invalid_credentials" | null;

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

function detectGoogleIssue(message: string): GoogleIssue {
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

function getSupabaseGoogleCallbackUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return "https://<project-ref>.supabase.co/auth/v1/callback";
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    return `https://${hostname}/auth/v1/callback`;
  } catch {
    return "https://<project-ref>.supabase.co/auth/v1/callback";
  }
}

export function AuthForm({ nextPath = "/dashboard", initialError = null }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [googleIssue, setGoogleIssue] = useState<GoogleIssue>(null);

  const router = useRouter();
  const redirectPath = nextPath;
  const supabaseGoogleCallbackUrl = useMemo(() => getSupabaseGoogleCallbackUrl(), []);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setGoogleIssue(null);
    setIsPending(true);

    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
        setIsPending(false);
        setError("Nombre, apellido y telefono son obligatorios.");
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
            display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          },
        },
      });
      setIsPending(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setFirstName("");
      setLastName("");
      setPhone("");

      if (!data.session) {
        setInfo("Cuenta creada. Si tenes confirmacion por mail activa, revisa tu inbox.");
        return;
      }

      router.push(redirectPath);
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsPending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectPath);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setInfo(null);
    setGoogleIssue(null);
    setIsGooglePending(true);

    const supabase = createSupabaseBrowserClient();
    const baseUrl = window.location.origin;
    const safeNextPath = redirectPath.startsWith("/") ? redirectPath : "/dashboard";
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
      setGoogleIssue(issue);

      if (issue === "provider_disabled") {
        setError("Google no esta habilitado en Supabase.");
        return;
      }

      if (issue === "redirect_mismatch") {
        setError("La URL de redireccion de OAuth no esta permitida.");
        return;
      }

      if (issue === "invalid_credentials") {
        setError("Google esta habilitado pero hay un problema de credenciales (Client ID / Secret).");
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

      <h2 className="mt-2 text-4xl leading-none text-[#1f2937]">Login y registro</h2>
      <p className="section-subtitle mt-2">Entra con email/password o Google OAuth.</p>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#e5d7aa] bg-[#fff9e8] p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "login" ? "bg-[#9a6b00] text-white" : "text-[#6b7280] hover:bg-[#fff4cf]"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "signup" ? "bg-[#9a6b00] text-white" : "text-[#6b7280] hover:bg-[#fff4cf]"
          }`}
        >
          Crear cuenta
        </button>
      </div>

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
                placeholder="Perez"
              />
            </label>
          </div>
        ) : null}

        {mode === "signup" ? (
          <label className="block space-y-1 text-sm">
            <span className="label-tech">Telefono</span>
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
          <span className="label-tech">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-tech"
            placeholder="******"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

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
      <p className="hint-text mt-2">Si falla Google, revisa providers y redirect URLs en Supabase.</p>

      {error ? <p className="alert-error mt-4 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-4 rounded-lg p-3 text-sm">{info}</p> : null}

      {googleIssue ? (
        <div className="alert-warning mt-4 rounded-lg p-3 text-sm">
          <p className="font-semibold">Checklist Google OAuth</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs sm:text-sm">
            <li>En Supabase: Authentication &gt; Providers &gt; Google y activa el provider.</li>
            <li>Copia Client ID y Client Secret desde Google Cloud OAuth app.</li>
            <li>
              En Google Cloud agrega esta redirect URI:
              <code className="ml-1 rounded bg-[#fff2c9] px-1 py-0.5">{supabaseGoogleCallbackUrl}</code>
            </li>
            <li>
              En Supabase URLs agrega:
              <code className="ml-1 rounded bg-[#fff2c9] px-1 py-0.5">{siteUrl}</code>
              <span> y </span>
              <code className="rounded bg-[#fff2c9] px-1 py-0.5">{siteUrl}/auth/callback</code>
            </li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}

