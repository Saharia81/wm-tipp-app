// German labels for tournament stages, shared by the admin UI, the tip list and
// the sync. GROUP matches carry a group letter; KO matches don't, so we show the
// round name instead.
//
// The `Stage` values mirror the Prisma enum, but are declared here as plain
// string literals on purpose: this module is imported by client components, and
// importing the generated Prisma enum (a runtime value) would pull the whole
// Prisma client into the browser bundle (it references node:module → build fails).
// Prisma's own `Stage` type is the same string union, so values stay assignable.

export const STAGES = [
  "GROUP",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
] as const;

export type Stage = (typeof STAGES)[number];

// All KO stages in bracket order — used to build admin dropdowns.
export const KO_STAGES: Stage[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

export const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Gruppe",
  ROUND_OF_32: "Sechzehntelfinale",
  ROUND_OF_16: "Achtelfinale",
  QUARTER_FINAL: "Viertelfinale",
  SEMI_FINAL: "Halbfinale",
  THIRD_PLACE: "Spiel um Platz 3",
  FINAL: "Finale",
};

// "Gruppe A" for group matches, the round name otherwise. Used wherever a match
// header previously printed only `Gruppe ${group}`.
export function stageLabel(stage: Stage, group: string | null): string {
  if (stage === "GROUP") {
    return group ? `Gruppe ${group}` : "Gruppe";
  }
  return STAGE_LABELS[stage];
}
