"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LeagueItem = {
  id: string;
  name: string;
  join_code: string;
};

type LeagueManagerProps = {
  leagues: LeagueItem[];
};

export function LeagueManager({ leagues }: LeagueManagerProps) {
  const [leagueName, setLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const router = useRouter();

  async function handleCreateLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsCreating(true);

    const response = await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: leagueName }),
    });
    const payload = await response.json();
    setIsCreating(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo crear la liga.");
      return;
    }

    setLeagueName("");
    setInfo(`Liga creada. Codigo de ingreso: ${payload.league.join_code}`);
    router.refresh();
  }

  async function handleJoinLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsJoining(true);

    const response = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode }),
    });
    const payload = await response.json();
    setIsJoining(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo unir a la liga.");
      return;
    }

    setJoinCode("");
    setInfo("Te uniste a la liga correctamente.");
    router.refresh();
  }

  return (
    <section className="panel p-5">
      <h2 className="text-4xl leading-none">Ligas privadas</h2>
      <p className="section-subtitle mt-2 text-sm">Crea una liga para competir entre amigos o unite con codigo.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <form className="panel-soft space-y-2 p-3" onSubmit={handleCreateLeague}>
          <h3 className="text-sm font-semibold text-[#1f2937]">Crear liga</h3>
          <input
            value={leagueName}
            onChange={(event) => setLeagueName(event.target.value)}
            required
            minLength={3}
            maxLength={40}
            placeholder="Ej: Oficina 2026"
            className="input-tech"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Creando..." : "Crear"}
          </button>
        </form>

        <form className="panel-soft space-y-2 p-3" onSubmit={handleJoinLeague}>
          <h3 className="text-sm font-semibold text-[#1f2937]">Unirme por codigo</h3>
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            required
            minLength={6}
            maxLength={6}
            placeholder="ABC123"
            className="input-tech uppercase"
          />
          <button
            type="submit"
            disabled={isJoining}
            className="btn-ghost w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isJoining ? "Uniendo..." : "Unirme"}
          </button>
        </form>
      </div>

      {error ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{info}</p> : null}

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-[#1f2937]">Tus ligas</h3>
        {leagues.length === 0 ? (
          <p className="panel-soft p-3 text-sm text-[#6b7280]">Todavia no estas en ninguna liga.</p>
        ) : (
          <ul className="space-y-2">
            {leagues.map((league) => (
              <li key={league.id} className="panel-soft p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#1f2937]">{league.name}</span>
                  <span className="rounded bg-[#9a6b00] px-2 py-1 font-mono text-xs text-white">{league.join_code}</span>
                </div>
                <div className="mt-2">
                  <Link href={`/dashboard/leagues/${league.id}`} className="link-inline inline-flex text-xs">
                    Ver tabla de liga
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

