import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

const COPY = {
  chip: "Mundial 2026",
  title: "Prode del Mundial",
  subtitle: "Pronosticá partidos, competí en ligas privadas y subí en el ranking global.",
  tagProde: "Prode",
  tagLeagues: "Ligas privadas",
  tagRanking: "Ranking global",
  authErrorNoCode: "Google no devolvió código de autorización.",
  authErrorProviderDisabled: "Google no está habilitado en Supabase.",
  authErrorRedirectMismatch: "La URL de redirección de Google OAuth no coincide con la configuración.",
  authErrorInvalidCredentials: "Google OAuth está activo pero Client ID/Secret son inválidos.",
  authErrorFailed: "No se pudo iniciar sesión con Google.",
};

function mapAuthError(errorValue: string | null) {
  if (errorValue === "oauth_no_code") {
    return COPY.authErrorNoCode;
  }

  if (errorValue === "oauth_provider_disabled") {
    return COPY.authErrorProviderDisabled;
  }

  if (errorValue === "oauth_redirect_mismatch") {
    return COPY.authErrorRedirectMismatch;
  }

  if (errorValue === "oauth_invalid_credentials") {
    return COPY.authErrorInvalidCredentials;
  }

  if (errorValue === "oauth_failed") {
    return COPY.authErrorFailed;
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextValue = params.next;
  const nextPath = typeof nextValue === "string" ? nextValue : "/dashboard";
  const errorValue = typeof params.error === "string" ? params.error : null;
  const initialError = mapAuthError(errorValue);

  return (
    <main className="page-shell">
      <div className="app-container grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,0.78fr)]">
        <section className="panel-strong max-w-[640px] p-6 sm:p-7">
          <p className="chip w-fit">{COPY.chip}</p>
          <h1 className="mt-3 max-w-[12ch] text-4xl leading-[0.95] sm:text-5xl">{COPY.title}</h1>
          <p className="section-subtitle mt-3 max-w-xl text-sm sm:text-base">{COPY.subtitle}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border-2 border-[#1d2430] bg-[#fff7d9] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#6a4a00]">
              {COPY.tagProde}
            </span>
            <span className="rounded-full border-2 border-[#1d2430] bg-[#fff7d9] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#6a4a00]">
              {COPY.tagLeagues}
            </span>
            <span className="rounded-full border-2 border-[#1d2430] bg-[#fff7d9] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#6a4a00]">
              {COPY.tagRanking}
            </span>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <AuthForm nextPath={nextPath} initialError={initialError} />
          </div>
        </div>
      </div>
    </main>
  );
}
