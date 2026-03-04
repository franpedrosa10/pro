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

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function LeagueManager({ leagues }: LeagueManagerProps) {
  const [leagueName, setLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copyState, setCopyState] = useState<string | null>(null);

  const router = useRouter();
  const configuredBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "");

  function getInviteLink(code: string) {
    if (!configuredBaseUrl) {
      return `/invite/${code}`;
    }
    return `${configuredBaseUrl}/invite/${code}`;
  }

  function toAbsoluteInviteLink(inviteLink: string) {
    if (inviteLink.startsWith("http://") || inviteLink.startsWith("https://")) {
      return inviteLink;
    }

    if (typeof window !== "undefined") {
      return `${normalizeBaseUrl(window.location.origin)}${inviteLink}`;
    }

    return inviteLink;
  }

  async function copyValue(value: string, stateKey: string, okMessage: string) {
    setError(null);
    setInfo(null);

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API no disponible.");
      }

      await navigator.clipboard.writeText(value);
      setCopyState(stateKey);
      setInfo(okMessage);
      setTimeout(() => {
        setCopyState((current) => (current === stateKey ? null : current));
      }, 1300);
    } catch {
      setError("No se pudo copiar automaticamente. Copialo manualmente.");
    }
  }

  async function shareLeague(league: LeagueItem) {
    const inviteLink = toAbsoluteInviteLink(getInviteLink(league.join_code));
    const text = `Unite a mi liga privada "${league.name}" en Fantasy + Prode: ${inviteLink}`;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Invitacion a ${league.name}`,
          text,
          url: inviteLink,
        });
        setInfo("Invitacion compartida.");
        return;
      } catch {
        // User cancelled or API error: fallback to copy.
      }
    }

    await copyValue(inviteLink, `${league.id}:link`, "Link de invitacion copiado.");
  }

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

    const newCode = payload.league?.join_code as string | undefined;
    if (newCode) {
      setInfo(`Liga creada. Codigo: ${newCode}. Link: ${getInviteLink(newCode)}`);
    } else {
      setInfo("Liga creada correctamente.");
    }

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
    if (payload.alreadyJoined) {
      setInfo("Ya estabas en esa liga. Te dejamos el acceso directo disponible.");
    } else {
      setInfo("Te uniste a la liga correctamente.");
    }
    router.refresh();
  }

  return (
    <section className="panel p-5">
      <h2 className="text-4xl leading-none">Ligas privadas</h2>
      <p className="section-subtitle mt-2 text-sm">Crea una liga, unite por codigo y comparti invitacion directa por link.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <form className="panel-soft space-y-2 p-3" onSubmit={handleCreateLeague}>
          <h3 className="text-sm font-semibold text-[#1f2937]">Crear liga</h3>
          <input
            value={leagueName}
            onChange={(event) => setLeagueName(event.target.value)}
            required
            minLength={3}
            maxLength={40}
            placeholder="Ej: La Banda del Mundial"
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
            {leagues.map((league) => {
              const inviteLink = getInviteLink(league.join_code);
              const shareableInviteLink = toAbsoluteInviteLink(inviteLink);
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
                `Unite a mi liga "${league.name}" en Fantasy + Prode: ${shareableInviteLink}`,
              )}`;

              return (
                <li key={league.id} className="panel-soft p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-[#1f2937]">{league.name}</span>
                    <span className="rounded bg-[#9a6b00] px-2 py-1 font-mono text-xs text-white">{league.join_code}</span>
                  </div>

                  <p className="mt-2 break-all text-xs text-[#6b7280]">{inviteLink}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyValue(league.join_code, `${league.id}:code`, "Codigo copiado.")}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      {copyState === `${league.id}:code` ? "Copiado" : "Copiar codigo"}
                    </button>

                    <button
                      type="button"
                      onClick={() => copyValue(inviteLink, `${league.id}:link`, "Link de invitacion copiado.")}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      {copyState === `${league.id}:link` ? "Copiado" : "Copiar link"}
                    </button>

                    <button
                      type="button"
                      onClick={() => shareLeague(league)}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      Compartir
                    </button>

                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs">
                      WhatsApp
                    </a>

                    <Link href={`/invite/${league.join_code}`} className="btn-soft px-2 py-1 text-xs">
                      Ver invitacion
                    </Link>

                    <Link href={`/dashboard/leagues/${league.id}`} className="link-inline inline-flex items-center px-1 text-xs">
                      Ver tabla de liga
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

