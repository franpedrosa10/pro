"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { AppLocale } from "@/lib/i18n";

type LeagueItem = {
  id: string;
  name: string;
  join_code: string;
  is_country_league: boolean;
  country_code: string | null;
};

type LeagueManagerProps = {
  leagues: LeagueItem[];
  profileCountry: {
    countryCode: string | null;
    countryName: string | null;
  };
  locale: AppLocale;
};

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const COPY: Record<
  AppLocale,
  {
    title: string;
    subtitle: string;
    createLeague: string;
    joinByCode: string;
    officialByCountry: string;
    yourLeagues: string;
    noLeagues: string;
    create: string;
    creating: string;
    join: string;
    joining: string;
    joinMyCountry: string;
    joiningCountry: string;
    copied: string;
    copyCode: string;
    copyLink: string;
    share: string;
    whatsapp: string;
    viewInvite: string;
    viewTable: string;
    officialBadge: string;
    createError: string;
    joinError: string;
    countryJoinError: string;
    createdOk: string;
    createdPrefix: string;
    alreadyInLeague: string;
    joinedLeague: string;
    alreadyInCountry: string;
    joinedCountry: string;
    completeCountry: string;
    alreadyInCountryPrefix: string;
    joinCountryPrefix: string;
    copyFallback: string;
    sharedOk: string;
    copiedCodeOk: string;
    copiedLinkOk: string;
    placeholderLeague: string;
  }
> = {
  es: {
    title: "Ligas privadas",
    subtitle: "Creá una liga, unite por código y compartí invitación directa por link.",
    createLeague: "Crear liga",
    joinByCode: "Unirme por código",
    officialByCountry: "Liga oficial por país",
    yourLeagues: "Tus ligas",
    noLeagues: "Todavía no estás en ninguna liga.",
    create: "Crear",
    creating: "Creando...",
    join: "Unirme",
    joining: "Uniendo...",
    joinMyCountry: "Unirme a mi país",
    joiningCountry: "Uniendo...",
    copied: "Copiado",
    copyCode: "Copiar código",
    copyLink: "Copiar link",
    share: "Compartir",
    whatsapp: "WhatsApp",
    viewInvite: "Ver invitación",
    viewTable: "Ver tabla de liga",
    officialBadge: "Oficial",
    createError: "No se pudo crear la liga.",
    joinError: "No se pudo unir a la liga.",
    countryJoinError: "No se pudo unir a la liga oficial de tu país.",
    createdOk: "Liga creada correctamente.",
    createdPrefix: "Liga creada. Código",
    alreadyInLeague: "Ya estabas en esa liga. Te dejamos el acceso directo disponible.",
    joinedLeague: "Te uniste a la liga correctamente.",
    alreadyInCountry: "Ya estabas en la liga oficial de tu país.",
    joinedCountry: "Te uniste a la liga oficial de tu país.",
    completeCountry: "Completá tu país en Mi cuenta para activar la liga oficial.",
    alreadyInCountryPrefix: "Ya estás en la liga oficial de",
    joinCountryPrefix: "Unite a la liga oficial de",
    copyFallback: "No se pudo copiar automáticamente. Copialo manualmente.",
    sharedOk: "Invitación compartida.",
    copiedCodeOk: "Código copiado.",
    copiedLinkOk: "Link de invitación copiado.",
    placeholderLeague: "Ej: La Banda del Mundial",
  },
  en: {
    title: "Private leagues",
    subtitle: "Create leagues, join by code and share invite links.",
    createLeague: "Create league",
    joinByCode: "Join by code",
    officialByCountry: "Official country league",
    yourLeagues: "Your leagues",
    noLeagues: "You are not in any league yet.",
    create: "Create",
    creating: "Creating...",
    join: "Join",
    joining: "Joining...",
    joinMyCountry: "Join my country",
    joiningCountry: "Joining...",
    copied: "Copied",
    copyCode: "Copy code",
    copyLink: "Copy link",
    share: "Share",
    whatsapp: "WhatsApp",
    viewInvite: "Invite page",
    viewTable: "League table",
    officialBadge: "Official",
    createError: "Could not create the league.",
    joinError: "Could not join the league.",
    countryJoinError: "Could not join your official country league.",
    createdOk: "League created.",
    createdPrefix: "League created. Code",
    alreadyInLeague: "You were already in that league.",
    joinedLeague: "You joined the league.",
    alreadyInCountry: "You were already in your official country league.",
    joinedCountry: "You joined your official country league.",
    completeCountry: "Complete your country in My account to enable the official league.",
    alreadyInCountryPrefix: "You are already in the official league for",
    joinCountryPrefix: "Join the official league for",
    copyFallback: "Could not auto-copy. Please copy manually.",
    sharedOk: "Invite shared.",
    copiedCodeOk: "Code copied.",
    copiedLinkOk: "Invite link copied.",
    placeholderLeague: "Example: World Cup Crew",
  },
  pt: {
    title: "Ligas privadas",
    subtitle: "Crie ligas, entre por codigo e compartilhe links de convite.",
    createLeague: "Criar liga",
    joinByCode: "Entrar por codigo",
    officialByCountry: "Liga oficial por pais",
    yourLeagues: "Suas ligas",
    noLeagues: "Voce ainda nao esta em nenhuma liga.",
    create: "Criar",
    creating: "Criando...",
    join: "Entrar",
    joining: "Entrando...",
    joinMyCountry: "Entrar no meu pais",
    joiningCountry: "Entrando...",
    copied: "Copiado",
    copyCode: "Copiar codigo",
    copyLink: "Copiar link",
    share: "Compartilhar",
    whatsapp: "WhatsApp",
    viewInvite: "Ver convite",
    viewTable: "Tabela da liga",
    officialBadge: "Oficial",
    createError: "Nao foi possivel criar a liga.",
    joinError: "Nao foi possivel entrar na liga.",
    countryJoinError: "Nao foi possivel entrar na liga oficial do seu pais.",
    createdOk: "Liga criada.",
    createdPrefix: "Liga criada. Codigo",
    alreadyInLeague: "Voce ja estava nessa liga.",
    joinedLeague: "Voce entrou na liga.",
    alreadyInCountry: "Voce ja estava na liga oficial do seu pais.",
    joinedCountry: "Voce entrou na liga oficial do seu pais.",
    completeCountry: "Complete seu pais em Minha conta para ativar a liga oficial.",
    alreadyInCountryPrefix: "Voce ja esta na liga oficial de",
    joinCountryPrefix: "Entre na liga oficial de",
    copyFallback: "Nao foi possivel copiar automaticamente. Copie manualmente.",
    sharedOk: "Convite compartilhado.",
    copiedCodeOk: "Codigo copiado.",
    copiedLinkOk: "Link de convite copiado.",
    placeholderLeague: "Ex: Galera da Copa",
  },
};

export function LeagueManager({ leagues, profileCountry, locale }: LeagueManagerProps) {
  const copy = COPY[locale];
  const [leagueName, setLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isJoiningCountry, setIsJoiningCountry] = useState(false);
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
      setError(copy.copyFallback);
    }
  }

  async function shareLeague(league: LeagueItem) {
    const inviteLink = toAbsoluteInviteLink(getInviteLink(league.join_code));
    const text = `${copy.joinByCode}: "${league.name}" - ${inviteLink}`;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `${copy.viewInvite}: ${league.name}`,
          text,
          url: inviteLink,
        });
        setInfo(copy.sharedOk);
        return;
      } catch {
        // User cancelled or API error: fallback to copy.
      }
    }

    await copyValue(inviteLink, `${league.id}:link`, copy.copiedLinkOk);
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
      setError(payload.error ?? copy.createError);
      return;
    }

    setLeagueName("");

    const newCode = payload.league?.join_code as string | undefined;
    if (newCode) {
      setInfo(`${copy.createdPrefix}: ${newCode}. Link: ${getInviteLink(newCode)}`);
    } else {
      setInfo(copy.createdOk);
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
      setError(payload.error ?? copy.joinError);
      return;
    }

    setJoinCode("");
    if (payload.alreadyJoined) {
      setInfo(copy.alreadyInLeague);
    } else {
      setInfo(copy.joinedLeague);
    }
    router.refresh();
  }

  async function handleJoinCountryLeague() {
    setError(null);
    setInfo(null);
    setIsJoiningCountry(true);

    const response = await fetch("/api/leagues/country", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json();
    setIsJoiningCountry(false);

    if (!response.ok) {
      setError(payload.error ?? copy.countryJoinError);
      return;
    }

    if (payload.alreadyJoined) {
      setInfo(copy.alreadyInCountry);
    } else {
      setInfo(copy.joinedCountry);
    }

    router.refresh();
  }

  const myCountryLeague = profileCountry.countryCode
    ? leagues.find((league) => league.is_country_league && league.country_code === profileCountry.countryCode)
    : null;

  return (
    <section className="panel p-5">
      <h2 className="text-4xl leading-none">{copy.title}</h2>
      <p className="section-subtitle mt-2 text-sm">{copy.subtitle}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <form className="panel-soft space-y-2 p-3" onSubmit={handleCreateLeague}>
          <h3 className="text-sm font-semibold text-[#1f2937]">{copy.createLeague}</h3>
          <input
            value={leagueName}
            onChange={(event) => setLeagueName(event.target.value)}
            required
            minLength={3}
            maxLength={40}
            placeholder={copy.placeholderLeague}
            className="input-tech"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? copy.creating : copy.create}
          </button>
        </form>

        <form className="panel-soft space-y-2 p-3" onSubmit={handleJoinLeague}>
          <h3 className="text-sm font-semibold text-[#1f2937]">{copy.joinByCode}</h3>
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
            {isJoining ? copy.joining : copy.join}
          </button>
        </form>
      </div>

      {error ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{info}</p> : null}

      <div className="panel-soft mt-4 p-3">
        <h3 className="text-sm font-semibold text-[#1f2937]">{copy.officialByCountry}</h3>
        {!profileCountry.countryCode ? (
          <p className="mt-2 text-xs text-[#6b7280]">
            {copy.completeCountry}
          </p>
        ) : myCountryLeague ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#1f2937]">
              {copy.alreadyInCountryPrefix} {profileCountry.countryName ?? profileCountry.countryCode}.
            </span>
            <Link href={`/dashboard/leagues/${myCountryLeague.id}`} className="btn-soft px-2 py-1 text-xs">
              {copy.viewTable}
            </Link>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-[#6b7280]">
              {copy.joinCountryPrefix} {profileCountry.countryName ?? profileCountry.countryCode}.
            </p>
            <button
              type="button"
              onClick={handleJoinCountryLeague}
              disabled={isJoiningCountry}
              className="btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isJoiningCountry ? copy.joiningCountry : copy.joinMyCountry}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-[#1f2937]">{copy.yourLeagues}</h3>
        {leagues.length === 0 ? (
          <p className="panel-soft p-3 text-sm text-[#6b7280]">{copy.noLeagues}</p>
        ) : (
          <ul className="space-y-2">
            {leagues.map((league) => {
              const inviteLink = getInviteLink(league.join_code);
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
                `Unite a mi liga "${league.name}" en Prode Mundial: ${inviteLink}`,
              )}`;

              return (
                <li key={league.id} className="panel-soft p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1f2937]">{league.name}</span>
                      {league.is_country_league ? (
                        <span className="rounded bg-[#1d2430] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ffe289]">
                          {copy.officialBadge}
                        </span>
                      ) : null}
                    </div>
                    <span className="rounded bg-[#9a6b00] px-2 py-1 font-mono text-xs text-white">{league.join_code}</span>
                  </div>

                  <p className="mt-2 break-all text-xs text-[#6b7280]">{inviteLink}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyValue(league.join_code, `${league.id}:code`, copy.copiedCodeOk)}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      {copyState === `${league.id}:code` ? copy.copied : copy.copyCode}
                    </button>

                    <button
                      type="button"
                      onClick={() => copyValue(inviteLink, `${league.id}:link`, copy.copiedLinkOk)}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      {copyState === `${league.id}:link` ? copy.copied : copy.copyLink}
                    </button>

                    <button
                      type="button"
                      onClick={() => shareLeague(league)}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      {copy.share}
                    </button>

                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs">
                      {copy.whatsapp}
                    </a>

                    <Link href={`/invite/${league.join_code}`} className="btn-soft px-2 py-1 text-xs">
                      {copy.viewInvite}
                    </Link>

                    <Link href={`/dashboard/leagues/${league.id}`} className="link-inline inline-flex items-center px-1 text-xs">
                      {copy.viewTable}
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

