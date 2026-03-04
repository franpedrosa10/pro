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
          <p className="chip w-fit">Acceso</p>
          <h1 className="mt-3 text-6xl leading-none sm:text-7xl">Entra y arranca la fecha</h1>
          <p className="section-subtitle mt-3 max-w-md text-sm sm:text-base">
            Carga equipo, prode y ligas en el mismo lugar. Entrar toma 20 segundos, competir dura todo el Mundial.
          </p>

          <div className="mt-6 grid gap-2 text-sm text-[#4c5564]">
            <p>- Google OAuth y email/password</p>
            <p>- Ranking global + ligas privadas</p>
            <p>- Mi equipo y prode en paralelo</p>
          </div>

          <div className="panel-soft mt-6 p-4 text-xs text-[#4c5564] sm:text-sm">
            Si aparece error de Google provider, el frontend te muestra checklist exacto para corregir Supabase/Google Cloud.
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

