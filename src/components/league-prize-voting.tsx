"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LeaguePrizeProposal = {
  id: string;
  proposerUserId: string;
  proposerName: string;
  proposalKind: "money" | "material";
  amountPerPerson: number | null;
  currencyCode: "ARS" | "USD" | null;
  materialDescription: string | null;
  note: string | null;
  votesCount: number;
  votedByMe: boolean;
  createdAtLabel: string;
};

type LeaguePrizeVotingProps = {
  leagueId: string;
  currentUserId: string;
  isCountryLeague: boolean;
  firstRoundEndsAtIso: string | null;
  isWindowOpen: boolean;
  proposals: LeaguePrizeProposal[];
};

const CURRENCY_OPTIONS: Array<{ code: "ARS" | "USD"; label: string }> = [
  { code: "ARS", label: "ARS" },
  { code: "USD", label: "USD" },
];

function formatAmount(amount: number, currencyCode: "ARS" | "USD") {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: currencyCode === "ARS" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount}`;
  }
}

function formatProposalValue(proposal: LeaguePrizeProposal) {
  if (
    proposal.proposalKind === "money"
    && proposal.amountPerPerson !== null
    && proposal.currencyCode !== null
  ) {
    return formatAmount(proposal.amountPerPerson, proposal.currencyCode);
  }

  if (proposal.materialDescription) {
    return `Premio material: ${proposal.materialDescription}`;
  }

  return "Premio material";
}

function formatDeadline(isoValue: string | null) {
  if (!isoValue) {
    return "Sin cierre configurado";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(isoValue));
}

export function LeaguePrizeVoting({
  leagueId,
  currentUserId,
  isCountryLeague,
  firstRoundEndsAtIso,
  isWindowOpen,
  proposals,
}: LeaguePrizeVotingProps) {
  const router = useRouter();
  const myProposal = useMemo(
    () => proposals.find((proposal) => proposal.proposerUserId === currentUserId) ?? null,
    [currentUserId, proposals],
  );

  const [amountPerPerson, setAmountPerPerson] = useState(() =>
    myProposal?.proposalKind === "money" && myProposal.amountPerPerson !== null
      ? String(Math.max(1, Math.round(myProposal.amountPerPerson)))
      : "",
  );
  const [proposalKind, setProposalKind] = useState<"money" | "material">(myProposal?.proposalKind ?? "money");
  const [currencyCode, setCurrencyCode] = useState<"ARS" | "USD">(myProposal?.currencyCode ?? "ARS");
  const [materialDescription, setMaterialDescription] = useState(myProposal?.materialDescription ?? "");
  const [note, setNote] = useState(myProposal?.note ?? "");
  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [isVotingProposalId, setIsVotingProposalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSaveProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (isCountryLeague) {
      setError("Las ligas oficiales por pais no habilitan esta dinamica.");
      return;
    }

    if (!isWindowOpen) {
      setError("El periodo para proponer premio ya cerro.");
      return;
    }

    const parsedAmount = Number(amountPerPerson);
    const normalizedMaterialDescription = materialDescription.trim();
    if (proposalKind === "money" && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      setError("Ingresa un monto valido por persona.");
      return;
    }
    if (proposalKind === "material" && normalizedMaterialDescription.length < 3) {
      setError("Describe el premio material en al menos 3 caracteres.");
      return;
    }

    setIsSavingProposal(true);
    const response = await fetch("/api/leagues/prize/proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leagueId,
        proposalKind,
        amountPerPerson: proposalKind === "money" ? parsedAmount : null,
        currencyCode: proposalKind === "money" ? currencyCode : null,
        materialDescription: proposalKind === "material" ? normalizedMaterialDescription : null,
        note: note.trim() ? note.trim() : null,
      }),
    });
    const payload = await response.json();
    setIsSavingProposal(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo guardar la propuesta.");
      return;
    }

    setInfo("Propuesta guardada.");
    router.refresh();
  }

  async function handleVote(proposalId: string, shouldVote: boolean) {
    setError(null);
    setInfo(null);

    setIsVotingProposalId(proposalId);
    const response = await fetch("/api/leagues/prize/vote", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leagueId,
        proposalId,
        vote: shouldVote,
      }),
    });
    const payload = await response.json();
    setIsVotingProposalId(null);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo actualizar el voto.");
      return;
    }

    setInfo(shouldVote ? "Voto registrado." : "Voto removido.");
    router.refresh();
  }

  const sortedProposals = [...proposals].sort((a, b) => {
    if (b.votesCount !== a.votesCount) {
      return b.votesCount - a.votesCount;
    }

    if (a.proposalKind !== b.proposalKind) {
      return a.proposalKind === "money" ? -1 : 1;
    }

    if (a.proposalKind === "money") {
      return (a.amountPerPerson ?? 0) - (b.amountPerPerson ?? 0);
    }

    return (a.materialDescription ?? "").localeCompare(b.materialDescription ?? "", "es");
  });

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-3xl leading-none sm:text-4xl">Premio por persona</h2>
          <p className="section-subtitle mt-2 text-sm">
            Cada miembro puede proponer monto o premio material, y votar todas las opciones que quiera.
          </p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Importante: los premios no los gestiona la plataforma; corren por cuenta de los jugadores de la liga.
          </p>
        </div>
        <span className="chip">Cierra: {formatDeadline(firstRoundEndsAtIso)}</span>
      </div>

      {isCountryLeague ? (
        <p className="alert-warning mt-4 rounded-lg p-3 text-sm">
          Esta liga es oficial por pais. Las propuestas y votos de premio no estan habilitados.
        </p>
      ) : (
        <form className="panel-soft mt-4 grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-end" onSubmit={handleSaveProposal}>
          <div className="sm:col-span-2">
            <div className="inline-flex rounded-lg border-2 border-[#1d2430] bg-[#fffef8] p-1">
              <button
                type="button"
                onClick={() => setProposalKind("money")}
                disabled={!isWindowOpen || isSavingProposal}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  proposalKind === "money" ? "bg-[#1d2430] text-[#ffe289]" : "text-[#3f3320]"
                }`}
              >
                Monto
              </button>
              <button
                type="button"
                onClick={() => setProposalKind("material")}
                disabled={!isWindowOpen || isSavingProposal}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  proposalKind === "material" ? "bg-[#1d2430] text-[#ffe289]" : "text-[#3f3320]"
                }`}
              >
                Material
              </button>
            </div>
          </div>

          {proposalKind === "money" ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="label-tech block">Monto por persona</span>
                <input
                  type="number"
                  min={1}
                  max={100000000}
                  step={1}
                  value={amountPerPerson}
                  onChange={(event) => setAmountPerPerson(event.target.value)}
                  className="input-tech"
                  placeholder="Ej: 10000"
                  disabled={!isWindowOpen || isSavingProposal}
                  required
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="label-tech block">Moneda</span>
                <select
                  value={currencyCode}
                  onChange={(event) => setCurrencyCode(event.target.value as "ARS" | "USD")}
                  className="select-tech"
                  disabled={!isWindowOpen || isSavingProposal}
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="label-tech block">Premio material</span>
              <input
                value={materialDescription}
                onChange={(event) => setMaterialDescription(event.target.value)}
                maxLength={160}
                className="input-tech"
                placeholder="Ej: Camiseta oficial + pelota"
                disabled={!isWindowOpen || isSavingProposal}
                required
              />
            </label>
          )}

          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="label-tech block">Nota opcional</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={160}
              className="input-tech"
              placeholder="Ej: pago en la previa de la final"
              disabled={!isWindowOpen || isSavingProposal}
            />
          </label>

          <button
            type="submit"
            disabled={!isWindowOpen || isSavingProposal}
            className="btn-primary sm:col-span-2 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingProposal ? "Guardando..." : myProposal ? "Actualizar propuesta" : "Proponer premio"}
          </button>
        </form>
      )}

      {!isWindowOpen && !isCountryLeague ? (
        <p className="alert-warning mt-3 rounded-lg p-3 text-sm">
          El cierre de propuestas y votos ya paso para esta liga.
        </p>
      ) : null}

      {error ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{info}</p> : null}

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-[#1f2937]">Opciones propuestas</h3>
        {sortedProposals.length === 0 ? (
          <p className="panel-soft p-3 text-sm text-[#6b7280]">Todavia no hay propuestas cargadas.</p>
        ) : (
          <ul className="space-y-2">
            {sortedProposals.map((proposal) => {
              const isMyProposal = proposal.proposerUserId === currentUserId;
              const isVoting = isVotingProposalId === proposal.id;

              return (
                <li key={proposal.id} className={`panel-soft p-3 ${proposal.votedByMe ? "fixture-x2-active" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-[#1f2937]">
                        {formatProposalValue(proposal)}
                      </p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#6b7280]">
                        {proposal.proposalKind === "money" ? "Monto" : "Material"}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        Propuso {proposal.proposerName}
                        {isMyProposal ? " (vos)" : ""} | {proposal.createdAtLabel}
                      </p>
                      {proposal.note ? <p className="mt-1 text-sm text-[#4c5564]">{proposal.note}</p> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[#1d2430] px-2 py-1 text-xs font-semibold text-[#ffe289]">
                        {proposal.votesCount} votos
                      </span>
                      <button
                        type="button"
                        onClick={() => handleVote(proposal.id, !proposal.votedByMe)}
                        disabled={isCountryLeague || !isWindowOpen || isVoting}
                        className={`btn-ghost min-w-[112px] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60 ${
                          proposal.votedByMe ? "bg-[#ffe289]" : ""
                        }`}
                      >
                        {isVoting ? "Guardando..." : proposal.votedByMe ? "Quitar voto" : "Votar"}
                      </button>
                    </div>
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
