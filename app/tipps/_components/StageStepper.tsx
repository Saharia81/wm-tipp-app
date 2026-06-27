import { STAGES, STAGE_LABELS, STAGE_SHORT_LABELS, type Stage } from "@/lib/stages";

export type StageStatus = "done" | "current" | "upcoming";

export type StageStepperProps = {
  statuses: Record<Stage, StageStatus>;
};

// Compact horizontal progress indicator showing where the tournament stands
// across all stages (Gruppe → ... → Finale). Sits below the page header so
// users always know whether group stage or knockout rounds are active.
export function StageStepper({ statuses }: StageStepperProps) {
  return (
    <ol className="flex items-center w-full">
      {STAGES.map((stage, i) => {
        const status = statuses[stage];
        return (
          <li key={stage} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1" title={STAGE_LABELS[stage]}>
              <span
                className={
                  "h-2.5 w-2.5 rounded-full " +
                  (status === "done"
                    ? "bg-emerald-400"
                    : status === "current"
                      ? "bg-emerald-400 ring-2 ring-emerald-400/40"
                      : "bg-white/20")
                }
                aria-hidden
              />
              <span
                className={
                  "text-[11px] " +
                  (status === "current"
                    ? "text-white font-semibold"
                    : status === "done"
                      ? "text-emerald-300"
                      : "text-white/40")
                }
              >
                {STAGE_SHORT_LABELS[stage]}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={
                  "h-px flex-1 mx-1 " +
                  (status === "done" ? "bg-emerald-400/40" : "bg-white/10")
                }
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
