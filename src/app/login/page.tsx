import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

function mapAuthError(errorValue: string | null) {
  if (errorValue === "oauth_no_code") {
    return "Google no devolvio codigo de autorizacion.";
  }

  if (errorValue === "oauth_provider_disabled") {
    return "Google no esta habilitado en Supabase.";
  }

  if (errorValue === "oauth_redirect_mismatch") {
    return "La URL de redireccion de Google OAuth no coincide con la configuracion.";
  }

  if (errorValue === "oauth_invalid_credentials") {
    return "Google OAuth esta activo pero Client ID/Secret son invalidos.";
  }

  if (errorValue === "oauth_failed") {
    return "No se pudo iniciar sesion con Google.";
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
      <div className="app-container grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
        <section className="panel-strong p-6 sm:p-8">
          <p className="chip w-fit">Bienvenido</p>
          <h1 className="mt-3 text-6xl leading-none sm:text-7xl">Entrá y empezá a jugar</h1>
          <p className="section-subtitle mt-3 max-w-md text-sm sm:text-base">
            Un solo hub para fantasy estilo Gran DT y prode por resultados, con ligas privadas y tabla global.
          </p>

          <div className="mt-6 grid gap-2 text-sm text-[#6b7280]">
            <p>- Google OAuth y email/password</p>
            <p>- Mi equipo + prode en paralelo</p>
            <p>- Ligas por codigo y ranking global</p>
          </div>

          <div className="panel-soft mt-6 p-4 text-xs text-[#6b7280] sm:text-sm">
            Si ves error de provider en Google, es configuracion de Supabase/Google Cloud, no del frontend.
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

