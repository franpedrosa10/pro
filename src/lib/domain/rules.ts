export const FANTASY_RULES = {
  maxBudget: 100,
  maxSquadSize: 15,
  maxStarters: 11,
  maxBench: 4,
  maxFromSameNationalTeam: 3,
  maxCaptain: 1,
} as const;

export type SquadSlot = "starter" | "bench";
export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD";
export type FormationCode = "3-4-3" | "3-5-2" | "4-3-3" | "4-4-2";

export type FormationDefinition = {
  code: FormationCode;
  label: string;
  def: number;
  mid: number;
  fwd: number;
};

export const FORMATIONS: readonly FormationDefinition[] = [
  { code: "3-4-3", label: "3-4-3", def: 3, mid: 4, fwd: 3 },
  { code: "3-5-2", label: "3-5-2", def: 3, mid: 5, fwd: 2 },
  { code: "4-3-3", label: "4-3-3", def: 4, mid: 3, fwd: 3 },
  { code: "4-4-2", label: "4-4-2", def: 4, mid: 4, fwd: 2 },
] as const;

const DEFAULT_FORMATION_CODE: FormationCode = "4-4-2";

export type SquadSelection = {
  playerId: string;
  slot: SquadSlot;
  isCaptain: boolean;
};

export type PlayerForValidation = {
  id: string;
  nationalTeamId: string;
  position: PlayerPosition;
  price: number;
};

export type SquadValidationOptions = {
  formationCode?: FormationCode;
  requireFullLineup?: boolean;
};

export type SquadValidationResult = {
  valid: boolean;
  errors: string[];
  budgetUsed: number;
  squadSize: number;
  startersByPosition: Record<PlayerPosition, number>;
  benchByPosition: Record<PlayerPosition, number>;
};

function makePositionCounter(): Record<PlayerPosition, number> {
  return {
    GK: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };
}

export function getFormationByCode(formationCode?: FormationCode): FormationDefinition {
  if (!formationCode) {
    return FORMATIONS.find((formation) => formation.code === DEFAULT_FORMATION_CODE) as FormationDefinition;
  }

  return (
    FORMATIONS.find((formation) => formation.code === formationCode) ??
    (FORMATIONS.find((formation) => formation.code === DEFAULT_FORMATION_CODE) as FormationDefinition)
  );
}

export function inferFormationCodeFromStarterCounts(
  startersByPosition: Record<PlayerPosition, number>,
): FormationCode | null {
  const matching = FORMATIONS.find((formation) => {
    return (
      startersByPosition.GK === 1 &&
      startersByPosition.DEF === formation.def &&
      startersByPosition.MID === formation.mid &&
      startersByPosition.FWD === formation.fwd
    );
  });

  return matching?.code ?? null;
}

export function validateSquadSelection(
  selections: SquadSelection[],
  playersById: Map<string, PlayerForValidation>,
  budgetLimit: number = FANTASY_RULES.maxBudget,
  options?: SquadValidationOptions,
): SquadValidationResult {
  const errors: string[] = [];
  const uniqueIds = new Set<string>();
  const teamCounters = new Map<string, number>();
  const startersByPosition = makePositionCounter();
  const benchByPosition = makePositionCounter();

  const formation = getFormationByCode(options?.formationCode);
  const startersTargetByPosition: Record<PlayerPosition, number> = {
    GK: 1,
    DEF: formation.def,
    MID: formation.mid,
    FWD: formation.fwd,
  };

  let starters = 0;
  let bench = 0;
  let captainCount = 0;
  let budgetUsed = 0;

  for (const selection of selections) {
    if (uniqueIds.has(selection.playerId)) {
      errors.push("Hay jugadores repetidos en la seleccion.");
      continue;
    }

    uniqueIds.add(selection.playerId);

    const player = playersById.get(selection.playerId);
    if (!player) {
      errors.push("Se intento guardar un jugador inexistente.");
      continue;
    }

    budgetUsed += player.price;

    if (selection.slot === "starter") {
      starters += 1;
      startersByPosition[player.position] += 1;
    } else {
      bench += 1;
      benchByPosition[player.position] += 1;
    }

    if (selection.isCaptain) {
      captainCount += 1;
      if (selection.slot !== "starter") {
        errors.push("El capitan debe ser titular.");
      }
    }

    const usedByTeam = (teamCounters.get(player.nationalTeamId) ?? 0) + 1;
    teamCounters.set(player.nationalTeamId, usedByTeam);
    if (usedByTeam > FANTASY_RULES.maxFromSameNationalTeam) {
      errors.push("No podes tener mas de 3 jugadores de una misma seleccion.");
    }
  }

  if (selections.length > FANTASY_RULES.maxSquadSize) {
    errors.push("El plantel no puede superar los 15 jugadores.");
  }

  if (starters > FANTASY_RULES.maxStarters) {
    errors.push("El equipo no puede tener mas de 11 titulares.");
  }

  if (bench > FANTASY_RULES.maxBench) {
    errors.push("El equipo no puede tener mas de 4 suplentes.");
  }

  const positionLabels: Record<PlayerPosition, string> = {
    GK: "arquero",
    DEF: "defensores",
    MID: "mediocampistas",
    FWD: "delanteros",
  };
  const benchPositionLabels: Record<PlayerPosition, string> = {
    GK: "arquero",
    DEF: "defensor",
    MID: "mediocampista",
    FWD: "delantero",
  };

  (Object.keys(benchByPosition) as PlayerPosition[]).forEach((position) => {
    if (benchByPosition[position] > 1) {
      errors.push(`Solo podes tener 1 suplente ${benchPositionLabels[position]}.`);
    }
  });

  if (captainCount > FANTASY_RULES.maxCaptain) {
    errors.push("Solo podes definir un capitan.");
  }

  if (budgetUsed > budgetLimit) {
    errors.push("Superaste el presupuesto disponible.");
  }

  (Object.keys(startersTargetByPosition) as PlayerPosition[]).forEach((position) => {
    if (startersByPosition[position] > startersTargetByPosition[position]) {
      errors.push(
        `Con la formacion ${formation.label}, el maximo de ${positionLabels[position]} titulares es ${startersTargetByPosition[position]}.`,
      );
    }
  });

  const requireFullLineup = options?.requireFullLineup ?? false;
  if (requireFullLineup) {
    if (starters !== FANTASY_RULES.maxStarters) {
      errors.push("Para confirmar el equipo necesitas 11 titulares.");
    }

    (Object.keys(startersTargetByPosition) as PlayerPosition[]).forEach((position) => {
      if (startersByPosition[position] !== startersTargetByPosition[position]) {
        errors.push(
          `La formacion ${formation.label} requiere ${startersTargetByPosition[position]} ${positionLabels[position]} titulares.`,
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    budgetUsed: Number(budgetUsed.toFixed(1)),
    squadSize: selections.length,
    startersByPosition,
    benchByPosition,
  };
}

export function calculateProdePoints(params: {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
}): number {
  const { predictedHome, predictedAway, actualHome, actualAway } = params;

  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 5;
  }

  if (predictedHome - predictedAway === actualHome - actualAway) {
    return 3;
  }

  const predictedOutcome = Math.sign(predictedHome - predictedAway);
  const actualOutcome = Math.sign(actualHome - actualAway);
  if (predictedOutcome === actualOutcome) {
    return 2;
  }

  if (predictedHome === actualHome || predictedAway === actualAway) {
    return 1;
  }

  return 0;
}
