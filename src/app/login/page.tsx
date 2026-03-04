import { AuthForm } from "@/components/auth-form";
import type { AppLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

const COPY: Record<
  AppLocale,
  {
    chip: string;
    title: string;
    subtitle: string;
    feature1: string;
    feature2: string;
    feature3: string;
    checklist: string;
    authErrorNoCode: string;
    authErrorProviderDisabled: string;
    authErrorRedirectMismatch: string;
    authErrorInvalidCredentials: string;
    authErrorFailed: string;
  }
> = {
  es: {
    chip: "Acceso",
    title: "Entra y arranca la fecha",
    subtitle: "Carga tu prode y competi en ligas privadas. Entrar toma 20 segundos, competir dura todo el Mundial.",
    feature1: "- Google OAuth y email/password",
    feature2: "- Ranking global + ligas privadas",
    feature3: "- Liga por pais + ranking por fecha",
    checklist: "Si aparece error de Google provider, el frontend te muestra checklist exacto para corregir Supabase/Google Cloud.",
    authErrorNoCode: "Google no devolvio codigo de autorizacion.",
    authErrorProviderDisabled: "Google no esta habilitado en Supabase.",
    authErrorRedirectMismatch: "La URL de redireccion de Google OAuth no coincide con la configuracion.",
    authErrorInvalidCredentials: "Google OAuth esta activo pero Client ID/Secret son invalidos.",
    authErrorFailed: "No se pudo iniciar sesion con Google.",
  },
  en: {
    chip: "Access",
    title: "Sign in and start this matchday",
    subtitle: "Load your picks and compete in private leagues all tournament long.",
    feature1: "- Google OAuth and email/password",
    feature2: "- Global ranking + private leagues",
    feature3: "- Country league + matchday ranking",
    checklist: "If Google fails, frontend shows an exact checklist for Supabase/Google Cloud setup.",
    authErrorNoCode: "Google did not return an authorization code.",
    authErrorProviderDisabled: "Google provider is not enabled in Supabase.",
    authErrorRedirectMismatch: "Google OAuth redirect URL does not match your configuration.",
    authErrorInvalidCredentials: "Google OAuth is enabled but Client ID/Secret are invalid.",
    authErrorFailed: "Could not sign in with Google.",
  },
  pt: {
    chip: "Acesso",
    title: "Entre e comece a rodada",
    subtitle: "Carregue seus palpites e compita em ligas privadas durante toda a Copa.",
    feature1: "- Google OAuth e email/password",
    feature2: "- Ranking global + ligas privadas",
    feature3: "- Liga por pais + ranking por rodada",
    checklist: "Se Google falhar, o frontend mostra checklist exato para corrigir Supabase/Google Cloud.",
    authErrorNoCode: "Google nao retornou codigo de autorizacao.",
    authErrorProviderDisabled: "Google nao esta habilitado no Supabase.",
    authErrorRedirectMismatch: "URL de redirecionamento do Google OAuth nao confere.",
    authErrorInvalidCredentials: "Google OAuth ativo, mas Client ID/Secret invalidos.",
    authErrorFailed: "Nao foi possivel entrar com Google.",
  },
};

function mapAuthError(errorValue: string | null, locale: AppLocale) {
  const copy = COPY[locale];
  if (errorValue === "oauth_no_code") {
    return copy.authErrorNoCode;
  }

  if (errorValue === "oauth_provider_disabled") {
    return copy.authErrorProviderDisabled;
  }

  if (errorValue === "oauth_redirect_mismatch") {
    return copy.authErrorRedirectMismatch;
  }

  if (errorValue === "oauth_invalid_credentials") {
    return copy.authErrorInvalidCredentials;
  }

  if (errorValue === "oauth_failed") {
    return copy.authErrorFailed;
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const params = await searchParams;
  const nextValue = params.next;
  const nextPath = typeof nextValue === "string" ? nextValue : "/dashboard";
  const errorValue = typeof params.error === "string" ? params.error : null;
  const initialError = mapAuthError(errorValue, locale);

  return (
    <main className="page-shell">
      <div className="app-container grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
        <section className="panel-strong p-6 sm:p-8">
          <p className="chip w-fit">{copy.chip}</p>
          <h1 className="mt-3 text-6xl leading-none sm:text-7xl">{copy.title}</h1>
          <p className="section-subtitle mt-3 max-w-md text-sm sm:text-base">
            {copy.subtitle}
          </p>

          <div className="mt-6 grid gap-2 text-sm text-[#4c5564]">
            <p>{copy.feature1}</p>
            <p>{copy.feature2}</p>
            <p>{copy.feature3}</p>
          </div>

          <div className="panel-soft mt-6 p-4 text-xs text-[#4c5564] sm:text-sm">
            {copy.checklist}
          </div>
        </section>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <AuthForm locale={locale} nextPath={nextPath} initialError={initialError} />
          </div>
        </div>
      </div>
    </main>
  );
}

