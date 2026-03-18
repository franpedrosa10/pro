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
    officialByCountry: string;
    yourLeagues: string;
    noLeagues: string;
    create: string;
    creating: string;
    joinMyCountry: string;
    joiningCountry: string;
    copied: string;
    copyLink: string;
    whatsapp: string;
    viewTable: string;
    officialBadge: string;
    createError: string;
    countryJoinError: string;
    createdOk: string;
    alreadyInCountry: string;
    joinedCountry: string;
    completeCountry: string;
    alreadyInCountryPrefix: string;
    joinCountryPrefix: string;
    copyFallback: string;
    copiedLinkOk: string;
    placeholderLeague: string;
  }
> = {
  es: {
    title: "Ligas privadas",
    subtitle: "Las ligas privadas se manejan solo por invitacion.",
    createLeague: "Crear liga privada",
    officialByCountry: "Liga oficial por pais",
    yourLeagues: "Tus ligas",
    noLeagues: "Todavia no estas en ninguna liga.",
    create: "Crear",
    creating: "Creando...",
    joinMyCountry: "Unirme a mi pais",
    joiningCountry: "Uniendo...",
    copied: "Copiado",
    copyLink: "Copiar link",
    whatsapp: "WhatsApp",
    viewTable: "Ver tabla de liga",
    officialBadge: "Oficial",
    createError: "No se pudo crear la liga.",
    countryJoinError: "No se pudo unir a la liga oficial de tu pais.",
    createdOk: "Liga creada. Comparti la invitacion desde Tus ligas.",
    alreadyInCountry: "Ya estabas en la liga oficial de tu pais.",
    joinedCountry: "Te uniste a la liga oficial de tu pais.",
    completeCountry: "Completa tu pais en Mi cuenta para activar la liga oficial.",
    alreadyInCountryPrefix: "Ya estas en la liga oficial de",
    joinCountryPrefix: "Unite a la liga oficial de",
    copyFallback: "No se pudo copiar automaticamente. Copialo manualmente.",
    copiedLinkOk: "Link de invitacion copiado.",
    placeholderLeague: "Ej: La Banda del Mundial",
  },
};

export function LeagueManager({ leagues, profileCountry, locale }: LeagueManagerProps) {
  const copy = COPY[locale];
  const [leagueName, setLeagueName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
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
    setInfo(copy.createdOk);
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

      <div className="mt-4">
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
      </div>

      {error ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{info}</p> : null}

      <div className="panel-soft mt-4 p-3">
        <h3 className="text-sm font-semibold text-[#1f2937]">{copy.officialByCountry}</h3>
        {!profileCountry.countryCode ? (
          <p className="mt-2 text-xs text-[#6b7280]">{copy.completeCountry}</p>
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
              const inviteLink = toAbsoluteInviteLink(getInviteLink(league.join_code));
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
                `Unite a mi liga "${league.name}" en Prode Mundial: ${inviteLink}`,
              )}`;
              const showPrivateInviteActions = !league.is_country_league;

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
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {showPrivateInviteActions ? (
                      <>
                        <button
                          type="button"
                          onClick={() => copyValue(inviteLink, `${league.id}:link`, copy.copiedLinkOk)}
                          className="btn-ghost px-2 py-1 text-xs"
                        >
                          {copyState === `${league.id}:link` ? copy.copied : copy.copyLink}
                        </button>

                        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs">
                          {copy.whatsapp}
                        </a>
                      </>
                    ) : null}

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

