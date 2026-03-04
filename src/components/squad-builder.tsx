"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  FANTASY_RULES,
  FORMATIONS,
  getFormationByCode,
  type FormationCode,
  type PlayerPosition,
  type SquadSelection,
  type SquadSlot,
  validateSquadSelection,
} from "@/lib/domain/rules";

type PlayerRow = {
  id: string;
  full_name: string;
  position: PlayerPosition;
  price: number;
  national_team_id: string;
  national_team_name: string;
  total_points: number;
};

type InitialSelection = {
  player_id: string;
  slot: SquadSlot;
  is_captain: boolean;
};

type SquadBuilderProps = {
  teamBudget: number;
  players: PlayerRow[];
  initialSelection: InitialSelection[];
  initialFormationCode: FormationCode;
};

type SelectedState = Record<
  string,
  {
    slot: SquadSlot;
    isCaptain: boolean;
  }
>;

type PositionFilter = "ALL" | PlayerPosition;

const POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: "Arqueros",
  DEF: "Defensores",
  MID: "Mediocampistas",
  FWD: "Delanteros",
};

const POSITION_ORDER: PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

function toCurrency(value: number) {
  return value.toFixed(1);
}

function makePositionCounter(): Record<PlayerPosition, number> {
  return {
    GK: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };
}

function getStarterLimits(formationCode: FormationCode): Record<PlayerPosition, number> {
  const formation = getFormationByCode(formationCode);
  return {
    GK: 1,
    DEF: formation.def,
    MID: formation.mid,
    FWD: formation.fwd,
  };
}

function getCountsBySlotAndPosition(
  selected: SelectedState,
  playersById: Map<string, PlayerRow>,
): {
  startersByPosition: Record<PlayerPosition, number>;
  benchByPosition: Record<PlayerPosition, number>;
  bench: number;
} {
  const startersByPosition = makePositionCounter();
  const benchByPosition = makePositionCounter();
  let bench = 0;

  Object.entries(selected).forEach(([playerId, value]) => {
    const player = playersById.get(playerId);
    if (!player) {
      return;
    }

    if (value.slot === "starter") {
      startersByPosition[player.position] += 1;
    } else {
      bench += 1;
      benchByPosition[player.position] += 1;
    }
  });

  return { startersByPosition, benchByPosition, bench };
}

function normalizeSelectionForFormation(
  selected: SelectedState,
  formationCode: FormationCode,
  playersById: Map<string, PlayerRow>,
): { next: SelectedState; dropped: number } {
  const limits = getStarterLimits(formationCode);
  const next: SelectedState = {};
  let dropped = 0;

  const playersByPosition: Record<PlayerPosition, string[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };

  Object.keys(selected).forEach((playerId) => {
    const player = playersById.get(playerId);
    if (!player) {
      return;
    }

    playersByPosition[player.position].push(playerId);
  });

  POSITION_ORDER.forEach((position) => {
    playersByPosition[position].sort((a, b) => {
      const aState = selected[a];
      const bState = selected[b];
      if (aState.slot !== bState.slot) {
        return aState.slot === "starter" ? -1 : 1;
      }

      const aPoints = playersById.get(a)?.total_points ?? 0;
      const bPoints = playersById.get(b)?.total_points ?? 0;
      return bPoints - aPoints;
    });

    let benchTaken = false;
    playersByPosition[position].forEach((playerId, index) => {
      const previous = selected[playerId];

      if (index < limits[position]) {
        next[playerId] = {
          slot: "starter",
          isCaptain: previous.isCaptain,
        };
        return;
      }

      if (!benchTaken) {
        next[playerId] = {
          slot: "bench",
          isCaptain: false,
        };
        benchTaken = true;
        return;
      }

      dropped += 1;
    });
  });

  const captains = Object.entries(next)
    .filter(([, value]) => value.isCaptain)
    .sort((a, b) => {
      const aPoints = playersById.get(a[0])?.total_points ?? 0;
      const bPoints = playersById.get(b[0])?.total_points ?? 0;
      return bPoints - aPoints;
    })
    .map(([playerId]) => playerId);

  if (captains.length > 1) {
    const keeper = captains[0];
    Object.keys(next).forEach((playerId) => {
      next[playerId].isCaptain = playerId === keeper ? next[playerId].isCaptain : false;
    });
  }

  return { next, dropped };
}

type PitchPlayer = PlayerRow & {
  isCaptain: boolean;
};

function PlayerCard({
  player,
  compact = false,
}: {
  player: PitchPlayer | null;
  compact?: boolean;
}) {
  if (!player) {
    return (
      <div
        className={`rounded-xl border border-dashed border-white/35 bg-black/20 text-center text-[11px] text-white/70 ${
          compact ? "min-h-14 px-2 py-2" : "min-h-20 px-2 py-2"
        }`}
      >
        Vacante
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-white/35 bg-gradient-to-b from-slate-900/85 to-slate-800/75 text-white shadow-lg shadow-black/20 ${
        compact ? "min-h-14 px-2 py-2" : "min-h-20 px-2 py-2"
      }`}
    >
      <p className="truncate text-[10px] uppercase tracking-[0.14em] text-cyan-100/90">
        {player.national_team_name}
      </p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-tight">{player.full_name}</p>
      <div className="mt-1 flex items-center justify-between text-[10px] text-cyan-100/90">
        <span>{player.position}</span>
        {player.isCaptain ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">CAP</span>
        ) : null}
      </div>
    </div>
  );
}

export function SquadBuilder({
  teamBudget,
  players,
  initialSelection,
  initialFormationCode,
}: SquadBuilderProps) {
  const [selected, setSelected] = useState<SelectedState>(() => {
    const base: SelectedState = {};
    for (const row of initialSelection) {
      base[row.player_id] = {
        slot: row.slot,
        isCaptain: row.is_captain,
      };
    }
    return base;
  });
  const [formationCode, setFormationCode] = useState<FormationCode>(initialFormationCode);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [minPointsFilter, setMinPointsFilter] = useState("0");

  const router = useRouter();

  const playersById = useMemo(
    () =>
      new Map(
        players.map((player) => [
          player.id,
          {
            ...player,
          },
        ]),
      ),
    [players],
  );

  const playersForValidation = useMemo(
    () =>
      new Map(
        players.map((player) => [
          player.id,
          {
            id: player.id,
            nationalTeamId: player.national_team_id,
            position: player.position,
            price: player.price,
          },
        ]),
      ),
    [players],
  );

  const selections = useMemo<SquadSelection[]>(
    () =>
      Object.entries(selected).map(([playerId, value]) => ({
        playerId,
        slot: value.slot,
        isCaptain: value.isCaptain,
      })),
    [selected],
  );

  const validation = useMemo(
    () =>
      validateSquadSelection(selections, playersForValidation, teamBudget, {
        formationCode,
        requireFullLineup: false,
      }),
    [playersForValidation, selections, teamBudget, formationCode],
  );

  const teamsForFilter = useMemo(() => {
    return Array.from(new Set(players.map((player) => player.national_team_name))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const minPoints = Number(minPointsFilter || 0);

    return players
      .filter((player) => {
        if (normalizedQuery) {
          const matchesQuery =
            player.full_name.toLowerCase().includes(normalizedQuery) ||
            player.national_team_name.toLowerCase().includes(normalizedQuery) ||
            player.position.toLowerCase().includes(normalizedQuery);
          if (!matchesQuery) {
            return false;
          }
        }

        if (positionFilter !== "ALL" && player.position !== positionFilter) {
          return false;
        }

        if (teamFilter !== "ALL" && player.national_team_name !== teamFilter) {
          return false;
        }

        if (player.total_points < minPoints) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        return b.price - a.price;
      });
  }, [players, query, positionFilter, teamFilter, minPointsFilter]);

  const selectedPlayers = useMemo(() => {
    return Object.entries(selected)
      .map(([playerId, value]) => {
        const player = playersById.get(playerId);
        if (!player) {
          return null;
        }

        return {
          ...player,
          slot: value.slot,
          isCaptain: value.isCaptain,
        };
      })
      .filter(Boolean) as Array<
      PlayerRow & {
        slot: SquadSlot;
        isCaptain: boolean;
      }
    >;
  }, [selected, playersById]);

  const startersByPosition = useMemo(() => {
    const byPosition: Record<PlayerPosition, PitchPlayer[]> = {
      GK: [],
      DEF: [],
      MID: [],
      FWD: [],
    };

    selectedPlayers
      .filter((player) => player.slot === "starter")
      .forEach((player) => {
        byPosition[player.position].push({
          ...player,
          isCaptain: player.isCaptain,
        });
      });

    POSITION_ORDER.forEach((position) => {
      byPosition[position].sort((a, b) => b.total_points - a.total_points);
    });

    return byPosition;
  }, [selectedPlayers]);

  const benchByPosition = useMemo(() => {
    const byPosition: Record<PlayerPosition, PitchPlayer | null> = {
      GK: null,
      DEF: null,
      MID: null,
      FWD: null,
    };

    selectedPlayers
      .filter((player) => player.slot === "bench")
      .forEach((player) => {
        if (!byPosition[player.position]) {
          byPosition[player.position] = {
            ...player,
            isCaptain: false,
          };
        }
      });

    return byPosition;
  }, [selectedPlayers]);

  const starterLimits = useMemo(() => getStarterLimits(formationCode), [formationCode]);

  function togglePlayer(playerId: string, checked: boolean) {
    setSaveError(null);
    setSaveInfo(null);

    setSelected((current) => {
      const next = { ...current };
      if (!checked) {
        delete next[playerId];
        return next;
      }

      if (Object.keys(current).length >= FANTASY_RULES.maxSquadSize) {
        setSaveError("No podes superar los 15 jugadores.");
        return current;
      }

      const player = playersById.get(playerId);
      if (!player) {
        return current;
      }

      const {
        startersByPosition: currentStartersByPosition,
        benchByPosition: currentBenchByPosition,
        bench: currentBench,
      } = getCountsBySlotAndPosition(current, playersById);

      const canBeStarter = currentStartersByPosition[player.position] < starterLimits[player.position];

      if (canBeStarter) {
        next[playerId] = {
          slot: "starter",
          isCaptain: false,
        };
        return next;
      }

      if (currentBench >= FANTASY_RULES.maxBench) {
        setSaveError("El banco ya tiene 4 jugadores.");
        return current;
      }

      if (currentBenchByPosition[player.position] >= 1) {
        setSaveError(`Ya tenes suplente en ${POSITION_LABELS[player.position].toLowerCase()}.`);
        return current;
      }

      next[playerId] = {
        slot: "bench",
        isCaptain: false,
      };
      return next;
    });
  }

  function updateSlot(playerId: string, slot: SquadSlot) {
    setSaveError(null);
    setSaveInfo(null);

    setSelected((current) => {
      const row = current[playerId];
      if (!row || row.slot === slot) {
        return current;
      }

      const player = playersById.get(playerId);
      if (!player) {
        return current;
      }

      const {
        startersByPosition: currentStartersByPosition,
        benchByPosition: currentBenchByPosition,
        bench: currentBench,
      } = getCountsBySlotAndPosition(current, playersById);

      if (slot === "starter") {
        const occupiedStartersForPosition =
          currentStartersByPosition[player.position] - (row.slot === "starter" ? 1 : 0);
        if (occupiedStartersForPosition >= starterLimits[player.position]) {
          setSaveError(
            `Con la formacion ${formationCode} ya ocupaste el cupo de ${POSITION_LABELS[player.position].toLowerCase()}.`,
          );
          return current;
        }
      }

      if (slot === "bench") {
        const occupiedBench = currentBench - (row.slot === "bench" ? 1 : 0);
        if (occupiedBench >= FANTASY_RULES.maxBench) {
          setSaveError("El banco ya tiene 4 jugadores.");
          return current;
        }

        const occupiedBenchForPosition =
          currentBenchByPosition[player.position] - (row.slot === "bench" ? 1 : 0);
        if (occupiedBenchForPosition >= 1) {
          setSaveError(`Ya tenes suplente en ${POSITION_LABELS[player.position].toLowerCase()}.`);
          return current;
        }
      }

      return {
        ...current,
        [playerId]: {
          ...row,
          slot,
          isCaptain: slot === "bench" ? false : row.isCaptain,
        },
      };
    });
  }

  function setCaptain(playerId: string) {
    setSaveError(null);
    setSaveInfo(null);

    setSelected((current) => {
      const currentPlayer = current[playerId];
      if (!currentPlayer || currentPlayer.slot !== "starter") {
        return current;
      }

      const next: SelectedState = {};
      for (const [id, value] of Object.entries(current)) {
        next[id] = {
          ...value,
          isCaptain: id === playerId && value.slot === "starter",
        };
      }
      return next;
    });
  }

  function handleFormationChange(newFormationCode: FormationCode) {
    setFormationCode(newFormationCode);
    setSaveError(null);
    setSaveInfo(null);

    setSelected((current) => {
      const normalized = normalizeSelectionForFormation(current, newFormationCode, playersById);
      if (normalized.dropped > 0) {
        setSaveInfo(
          `Se removieron ${normalized.dropped} jugador(es) para respetar formacion y 1 suplente por posicion.`,
        );
      }
      return normalized.next;
    });
  }

  async function saveSelection() {
    setSaveError(null);
    setSaveInfo(null);

    if (!validation.valid) {
      setSaveError("Corregi los errores antes de guardar.");
      return;
    }

    setIsSaving(true);

    const response = await fetch("/api/squad", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formationCode,
        players: selections.map((selection) => ({
          playerId: selection.playerId,
          slot: selection.slot,
          isCaptain: selection.isCaptain,
        })),
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setSaveError(payload.error ?? "No se pudo guardar el plantel.");
      return;
    }

    setSaveInfo("Plantel guardado.");
    router.refresh();
  }

  if (players.length === 0) {
    return (
      <div className="alert-warning rounded-2xl p-5 text-sm">
        No hay jugadores cargados. Ejecuta `supabase/seed.sql` o importa tu dataset real.
      </div>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1.28fr)]">
      <div className="space-y-4">
        <div className="panel p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#1f2937]">Tu Equipo</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Armado estilo Gran DT. Banco con 4 cupos: 1 por posicion.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <span className="font-medium text-[#374151]">Formacion</span>
              <select
                value={formationCode}
                onChange={(event) => handleFormationChange(event.target.value as FormationCode)}
                className="select-tech w-auto px-3 py-2"
              >
                {FORMATIONS.map((formation) => (
                  <option key={formation.code} value={formation.code}>
                    {formation.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[#e7d8a8] bg-[#fff9ed] p-2">
              <span className="block text-[#6b7280]">Seleccionados</span>
              <span className="text-lg font-semibold text-[#1f2937]">{validation.squadSize}/15</span>
            </div>
            <div className="rounded-lg border border-[#e7d8a8] bg-[#fff9ed] p-2">
              <span className="block text-[#6b7280]">Titulares</span>
              <span className="text-lg font-semibold text-[#1f2937]">
                {selections.filter((selection) => selection.slot === "starter").length}/11
              </span>
            </div>
            <div className="rounded-lg border border-[#e7d8a8] bg-[#fff9ed] p-2">
              <span className="block text-[#6b7280]">Suplentes</span>
              <span className="text-lg font-semibold text-[#1f2937]">
                {selections.filter((selection) => selection.slot === "bench").length}/4
              </span>
            </div>
            <div className="rounded-lg border border-[#e7d8a8] bg-[#fff9ed] p-2">
              <span className="block text-[#6b7280]">Presupuesto</span>
              <span className="text-lg font-semibold text-[#1f2937]">{toCurrency(validation.budgetUsed)}</span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-[#6b7280] sm:grid-cols-4">
            {POSITION_ORDER.map((position) => (
              <div key={position} className="rounded-lg border border-[#e7d8a8] bg-[#fff8ea] px-3 py-2">
                <p>
                  {POSITION_LABELS[position]}: {validation.startersByPosition[position]}/{starterLimits[position]}
                </p>
                <p className="text-[#6b7280]">Suplentes: {validation.benchByPosition[position]}/1</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <h3 className="text-base font-semibold text-[#1f2937]">Cancha</h3>

          <div className="mt-3 rounded-3xl border border-emerald-900/70 bg-gradient-to-b from-[#0d5c35] via-[#11824a] to-[#0f6f3f] p-3 shadow-[inset_0_0_90px_rgba(0,0,0,0.2)]">
            <div className="relative overflow-hidden rounded-2xl border border-white/50 px-3 py-5">
              <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/35" />
              <div className="pointer-events-none absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-white/35" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
              <div className="pointer-events-none absolute left-1/2 top-3 h-12 w-[56%] -translate-x-1/2 rounded-b-lg border border-t-0 border-white/35" />
              <div className="pointer-events-none absolute bottom-3 left-1/2 h-12 w-[56%] -translate-x-1/2 rounded-t-lg border border-b-0 border-white/35" />

              <div className="relative z-10 space-y-4">
                {POSITION_ORDER.map((position) => (
                  <div key={position} className="space-y-1">
                    <p className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-white/85">
                      {POSITION_LABELS[position]}
                    </p>
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${starterLimits[position]}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: starterLimits[position] }).map((_, index) => (
                        <PlayerCard
                          key={`${position}-${index}`}
                          player={startersByPosition[position][index] ?? null}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#e7d8a8] bg-[#fff8ea] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
              Banco (1 por posicion)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POSITION_ORDER.map((position) => (
                <div key={`bench-${position}`} className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
                    {position}
                  </p>
                  <PlayerCard player={benchByPosition[position]} compact />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel p-4">
        <h3 className="text-base font-semibold text-[#1f2937]">Lista de jugadores</h3>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar jugador o seleccion"
            className="input-tech text-sm"
          />

          <select
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value as PositionFilter)}
            className="select-tech text-sm"
          >
            <option value="ALL">Todas las posiciones</option>
            {POSITION_ORDER.map((position) => (
              <option key={position} value={position}>
                {POSITION_LABELS[position]}
              </option>
            ))}
          </select>

          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className="select-tech text-sm"
          >
            <option value="ALL">Todas las selecciones</option>
            {teamsForFilter.map((teamName) => (
              <option key={teamName} value={teamName}>
                {teamName}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            value={minPointsFilter}
            onChange={(event) => setMinPointsFilter(event.target.value)}
            placeholder="Puntaje minimo"
            className="input-tech text-sm"
          />
        </div>

        <div className="table-shell mt-3 max-h-[42rem] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[#fff4d1]">
              <tr className="text-left text-[#6b7280]">
                <th className="px-3 py-2">Sel</th>
                <th className="px-3 py-2">Jugador</th>
                <th className="px-3 py-2">Equipo</th>
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2">Precio</th>
                <th className="px-3 py-2">Pts</th>
                <th className="px-3 py-2">Slot</th>
                <th className="px-3 py-2">Cap</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                const isSelected = Boolean(selected[player.id]);
                const slot = selected[player.id]?.slot ?? "starter";

                return (
                  <tr
                    key={player.id}
                    className={`border-t border-[#b9a068] ${
                      isSelected ? "bg-[#fff6d9]/60" : "bg-transparent"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => togglePlayer(player.id, event.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-[#1f2937]">{player.full_name}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{player.national_team_name}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{player.position}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{toCurrency(player.price)}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{player.total_points}</td>
                    <td className="px-3 py-2">
                      {isSelected ? (
                        <select
                          value={slot}
                          onChange={(event) => updateSlot(player.id, event.target.value as SquadSlot)}
                          className="select-tech max-w-[110px] px-2 py-1 text-xs"
                        >
                          <option value="starter">Titular</option>
                          <option value="bench">Suplente</option>
                        </select>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isSelected && slot === "starter" ? (
                        <input
                          type="radio"
                          name="captain"
                          checked={Boolean(selected[player.id]?.isCaptain)}
                          onChange={() => setCaptain(player.id)}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {validation.errors.length > 0 ? (
          <ul className="alert-error mt-3 space-y-1 rounded-lg p-3 text-sm">
            {validation.errors.map((error) => (
              <li key={error}>- {error}</li>
            ))}
          </ul>
        ) : null}

        {saveError ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{saveError}</p> : null}
        {saveInfo ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{saveInfo}</p> : null}

        <button
          type="button"
          onClick={saveSelection}
          disabled={isSaving || !validation.valid}
          className="btn-primary mt-3 w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar plantel"}
        </button>
      </div>
    </section>
  );
}



