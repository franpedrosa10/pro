import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{
    joinCode: string;
  }>;
};

type JoinLeagueRpcRow = {
  league_id: string;
  league_name: string;
  join_code: string;
  already_member: boolean;
};

function normalizeJoinCode(code: string) {
  return code.trim().toUpperCase();
}

function isValidJoinCode(code: string) {
  return /^[A-Z0-9]{6}$/.test(code);
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { joinCode } = await params;
  const normalizedCode = normalizeJoinCode(joinCode);

  if (!isValidJoinCode(normalizedCode)) {
    return (
      <main className="page-shell">
        <div className="app-container fade-in">
          <section className="panel p-5">
            <h1 className="text-5xl leading-none sm:text-6xl">Invitación inválida</h1>
            <p className="section-subtitle mt-2 text-sm">El código de liga no cumple formato válido.</p>
            <Link href="/dashboard/leagues" className="btn-primary mt-4 inline-flex px-4 py-2 text-sm">
              Ir a Ligas
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = encodeURIComponent(`/invite/${normalizedCode}`);
    redirect(`/login?next=${nextPath}`);
  }

  const joinResult = await supabase.rpc("join_league_with_code", {
    p_join_code: normalizedCode,
  });

  if (joinResult.error) {
    return (
      <main className="page-shell">
        <div className="app-container fade-in">
          <section className="panel p-5">
            <h1 className="text-5xl leading-none sm:text-6xl">No pudimos unirte</h1>
            <p className="alert-warning mt-3 rounded-lg p-3 text-sm">{joinResult.error.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard/leagues" className="btn-primary inline-flex px-4 py-2 text-sm">
                Ir a Ligas
              </Link>
              <Link href="/dashboard" className="btn-ghost inline-flex px-4 py-2 text-sm">
                Dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const row = (joinResult.data?.[0] as JoinLeagueRpcRow | undefined) ?? null;
  if (!row) {
    return (
      <main className="page-shell">
        <div className="app-container fade-in">
          <section className="panel p-5">
            <h1 className="text-5xl leading-none sm:text-6xl">Liga no encontrada</h1>
            <p className="section-subtitle mt-2 text-sm">No pudimos resolver esa invitación.</p>
            <Link href="/dashboard/leagues" className="btn-primary mt-4 inline-flex px-4 py-2 text-sm">
              Ir a Ligas
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="app-container fade-in">
        <section className="panel-strong p-5 sm:p-7">
          <p className="chip w-fit">Invitación</p>
          <h1 className="mt-2 text-5xl leading-none sm:text-7xl">{row.league_name}</h1>
          <p className="mt-2 text-sm text-[#4c5564]">
            Código: <span className="rounded bg-[#1d2430] px-2 py-1 font-mono text-xs text-[#ffe289]">{row.join_code}</span>
          </p>

          <p className="mt-4 text-sm text-[#2f3a49]">
            {row.already_member
              ? "Ya estabas en esta liga. Te llevamos directo a la tabla privada."
              : "Listo, ya te unimos a la liga privada. Ahora podés competir en Prode."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/dashboard/leagues/${row.league_id}`} className="btn-primary inline-flex px-4 py-2 text-sm">
              Ver tabla de liga
            </Link>
            <Link href="/dashboard/leagues" className="btn-ghost inline-flex px-4 py-2 text-sm">
              Volver a Ligas
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

