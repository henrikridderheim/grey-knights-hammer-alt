import type { TargetUnit } from "../engine/types";
import { runUnitPhaseSimulation } from "../engine/simulate";
import { ROSTER, type UnitDefinition } from "./roster";
import {
  unitScenarios,
  buildEngagementsForScenario,
  DEFAULT_DAMAGE_SETTINGS,
  type DamageSettings,
} from "./engagementBuilder";

/** Lower iteration count than the main ranked-options pass — this runs many
 * more unit/scenario combinations (every ROSTER unit × every opponent unit,
 * per phase) and only needs a stable mean, not percentiles. */
const COUNTER_ITERATIONS = 300;

/** This unit's best-scoring scenario in one phase (Shooting or Melee),
 * firing ALL of its weapons for that scenario together in a shared target
 * pool — matching how a unit actually attacks (every gun in the squad, not
 * just its single hardest-hitting weapon), and avoiding double-counting
 * overkill across weapons the same way the main ranked-options list does.
 * Shooting has up to 2 scenarios (half range / full range, for
 * Melta/Rapid Fire) — each is evaluated as its own complete alpha strike and
 * the better-scoring one wins; melee has one. Reuses the same scenario
 * builder as the main ranked-options pass, filtered to the requested mode,
 * so this unit's own currently-toggled stratagems/rules apply exactly as
 * they would anywhere else (a shooting-only rule like Chaos Bane only
 * ever affects the Shooting pick; a melee-only rule like Channelled Force
 * Channelling only ever affects the Melee pick). */
function bestScenarioForMode(
  unit: UnitDefinition,
  target: TargetUnit,
  settings: DamageSettings,
  mode: "shooting" | "melee",
  halfRange?: boolean
): { damage: number; scenarioLabel: string; modelsKilled: number } {
  const scenarios = unitScenarios(unit, settings, halfRange).filter((s) => s.mode === mode);
  let best = { damage: 0, scenarioLabel: "—", modelsKilled: 0 };
  for (const { mode: m, scenario, label } of scenarios) {
    const engagements = buildEngagementsForScenario(unit, target, m, scenario);
    if (engagements.length === 0) continue;
    const summary = runUnitPhaseSimulation(
      engagements.map((e) => ({ ctx: e.ctx, rerolls: e.rerolls })),
      { label: `${unit.name} — ${label}`, iterations: COUNTER_ITERATIONS }
    );
    if (summary.meanDamage > best.damage) {
      best = { damage: summary.meanDamage, scenarioLabel: label, modelsKilled: summary.meanModelsKilled };
    }
  }
  return best;
}

export interface CounterRankedUnit {
  unitId: string;
  unitName: string;
  unitPoints: number;
  damage: number;
  dmgPerPoint: number;
  /** Which range band / stratagem combo this unit's damage reflects — e.g.
   * "half range" or "melee, Channelled Force: Lethal Hits" — since the damage
   * figure is now this unit's ALL-weapons combined total for that scenario,
   * not a single weapon's name. */
  scenarioLabel: string;
  /** Expected number of the OPPONENT unit's models destroyed — a separate
   * result from raw damage, since damage alone doesn't say how many actual
   * models die (overkill on a single model wastes damage that would have
   * killed a second model if spread out, and vice versa a unit's wounds
   * being larger than one weapon's typical hit means damage can pile up
   * without killing anything at all). Computed from the same combined-fire
   * scenario as the damage figure, not independently optimized. */
  modelsKilled: number;
}

/** Display name for a roster unit in the counter lists: identical copies get
 * a "(×N in list)" suffix. Derived from the roster itself (not from whichever
 * rows happen to be on screen) so an in-place toggle recompute of one row
 * produces exactly the same label as the original ranking pass. */
function counterDisplayName(unit: UnitDefinition): string {
  if (!unit.copyGroup) return unit.name;
  const copies = (ROSTER as UnitDefinition[]).filter((u) => u.copyGroup === unit.copyGroup).length;
  return copies > 1 ? `${unit.name} (×${copies} in list)` : unit.name;
}

/** One specific (my unit, opponent target, phase) calculation — exported so
 * a single row's stratagem toggle can be recomputed and re-sorted in place
 * without touching any other unit's row, any other opponent's card, or the
 * other phase's section. Returns null only if the unit id doesn't exist. */
export function computeUnitCounterEntry(
  unitId: string,
  target: TargetUnit,
  settings: DamageSettings,
  mode: "shooting" | "melee",
  halfRange?: boolean
): CounterRankedUnit | null {
  const unit = (ROSTER as UnitDefinition[]).find((u) => u.id === unitId);
  if (!unit) return null;
  const { damage, scenarioLabel, modelsKilled } = bestScenarioForMode(unit, target, settings, mode, halfRange);
  return {
    unitId: unit.id,
    unitName: counterDisplayName(unit),
    unitPoints: unit.points,
    damage,
    dmgPerPoint: damage / Math.max(unit.points, 1),
    scenarioLabel,
    modelsKilled,
  };
}

/** Primary sort: raw expected damage into this specific opponent unit.
 * Tiebreak: when two of my units are within ~8% of each other on raw
 * damage, points efficiency decides — so points act as a sanity-check
 * tiebreaker rather than a replacement for the damage math (an unambiguously
 * bigger hitter still wins outright, and the same expensive generalist
 * doesn't automatically dominate every matchup). Exported on its own (not
 * bundled with the top-3 slice) so a set of already-displayed rows can be
 * re-sorted after one of them changes, without dropping/adding rows. */
const NEAR_TIE_BAND = 0.08;

export function sortCounterEntries(entries: CounterRankedUnit[]): CounterRankedUnit[] {
  return [...entries].sort((a, b) => {
    const scale = Math.max(a.damage, b.damage, 0.01);
    if (Math.abs(a.damage - b.damage) > scale * NEAR_TIE_BAND) {
      return b.damage - a.damage;
    }
    return b.dmgPerPoint - a.dmgPerPoint;
  });
}

function rankTop3(entries: CounterRankedUnit[]): CounterRankedUnit[] {
  return sortCounterEntries(entries).slice(0, 3);
}

/** Identical copies of a unit (same `copyGroup`, e.g. three Interceptor
 * Squads) would otherwise be able to fill every slot of the top 3 with what
 * is effectively one entry. Keep only the best-scoring copy of each group;
 * combo calculations elsewhere still treat every copy as its own unit. */
function collapseCopies(entries: CounterRankedUnit[]): CounterRankedUnit[] {
  const roster = ROSTER as UnitDefinition[];
  // Copies in a group have identical stats and only differ in points, so the
  // representative is chosen deterministically as the cheapest one — never by
  // whichever copy happened to score a hair higher from simulation noise.
  const representative = new Map<string, string>(); // copyGroup -> unitId
  for (const u of roster) {
    const group = u.copyGroup;
    if (!group) continue;
    const current = roster.find((x) => x.id === representative.get(group));
    if (!current || u.points < current.points) representative.set(group, u.id);
  }
  const groupOf = new Map(roster.map((u) => [u.id, u.copyGroup]));
  return entries.filter((e) => {
    const g = groupOf.get(e.unitId);
    return !g || representative.get(g) === e.unitId;
  });
}

function rankForMode(
  target: TargetUnit,
  mode: "shooting" | "melee",
  resolveSettings: (unitId: string) => DamageSettings,
  halfRange?: boolean
): CounterRankedUnit[] {
  const scores: CounterRankedUnit[] = (ROSTER as UnitDefinition[]).map((u) => {
    const { damage, scenarioLabel, modelsKilled } = bestScenarioForMode(u, target, resolveSettings(u.id), mode, halfRange);
    return {
      unitId: u.id,
      unitName: counterDisplayName(u),
      unitPoints: u.points,
      damage,
      dmgPerPoint: damage / Math.max(u.points, 1),
      scenarioLabel,
      modelsKilled,
    };
  });
  // Units with no attacks in this phase (e.g. a Razorback in melee still has
  // tracks, but a unit with no ranged weapons has nothing to rank when
  // shooting) score 0 — never let them take a slot.
  return rankTop3(collapseCopies(scores.filter((s) => s.damage > 0)));
}

export interface PhaseCounterMatchups {
  shooting: CounterRankedUnit[];
  melee: CounterRankedUnit[];
}

/** For one opponent unit, my ROSTER's top 3 counters — computed
 * independently for Shooting and Melee (a unit's ranged profiles never
 * factor into its Melee score and vice versa), each scored by that phase's
 * best all-weapons-combined scenario fired at this specific target's actual
 * stat line. `getUnitSettings` is mode-aware so the Shooting and Melee
 * calculation for the same unit can carry entirely independent toggles. */
export function computeTopCounters(
  target: TargetUnit,
  getUnitSettings?: (unitId: string, mode: "shooting" | "melee") => DamageSettings,
  halfRange?: boolean
): PhaseCounterMatchups {
  const resolve = getUnitSettings ?? (() => DEFAULT_DAMAGE_SETTINGS);
  return {
    // Half range only ever affects shooting (Rapid Fire / Melta); melee is
    // range-agnostic, so the override is deliberately not passed there.
    shooting: rankForMode(target, "shooting", (id) => resolve(id, "shooting"), halfRange),
    melee: rankForMode(target, "melee", (id) => resolve(id, "melee")),
  };
}
