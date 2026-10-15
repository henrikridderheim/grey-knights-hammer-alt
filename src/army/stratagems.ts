/**
 * Stratagem reference text for Banishers + Immaterial Interdiction.
 *
 * Source: Wahapedia's 11th-edition Grey Knights page (fetched 2026-10-15). The six
 * Banishers stratagems were cross-checked against Tabletop Battles' "Detachment
 * Focus: Banishers" article; Immaterial Interdiction came from Wahapedia only.
 * Descriptions here are condensed paraphrases, not verbatim card text — check the
 * Codex/app for exact wording before relying on an edge case.
 *
 * Only the entries with a `damageEffect` change the calculator's numbers (they
 * are the per-unit toggles in the UI). The rest are movement/utility/defensive
 * and are listed for completeness.
 */

export interface Stratagem {
  name: string;
  cpCost: number;
  scope: "core" | "Banishers" | "Immaterial Interdiction";
  phase: string;
  description: string;
  damageEffect?: StratagemDamageEffect;
}

export type StratagemDamageEffect =
  | { kind: "grant-anti"; keyword: string; threshold: number; appliesTo: "psyker-ranged" }
  | { kind: "grant-lance"; appliesTo: "interceptor-squad-melee" };

export const STRATAGEMS: Stratagem[] = [
  // --- Banishers ---
  {
    name: "Chaos Bane",
    cpCost: 1,
    scope: "Banishers",
    phase: "Your Shooting phase",
    description:
      "A PSYKER unit that hasn't shot gains [ANTI-CHAOS 4+] on its ranged weapons until the end of the phase.",
    damageEffect: { kind: "grant-anti", keyword: "CHAOS", threshold: 4, appliesTo: "psyker-ranged" },
  },
  {
    name: "Hexwrought Reprisal",
    cpCost: 1,
    scope: "Banishers",
    phase: "End of any phase",
    description:
      "If a PSYKER unit suffered mortal wounds this phase, roll a die per mortal wound suffered; each 2+ inflicts 1 mortal wound on a unit that caused some of them (max 6).",
  },
  {
    name: "Warding Chant",
    cpCost: 1,
    scope: "Banishers",
    phase: "Opponent's Shooting or Fight phase",
    description: "A PSYKER unit gains Feel No Pain 5+ against attacks with an unmodified Damage of 1.",
  },
  {
    name: "Celerity",
    cpCost: 1,
    scope: "Banishers",
    phase: "Your Charge phase",
    description: "A PSYKER INFANTRY unit can declare a charge this turn even though it Advanced.",
  },
  {
    name: "Circle of Sanctuary",
    cpCost: 1,
    scope: "Banishers",
    phase: "Start of opponent's Movement phase",
    description: "A CHARACTER prevents enemy Reinforcements being set up within 12\" of it until the end of the phase.",
  },
  {
    name: "Shadow of Anarch",
    cpCost: 1,
    scope: "Banishers",
    phase: "Opponent's Movement phase",
    description:
      "After an enemy ends a move near it, a PSYKER unit not in Engagement Range can make a Normal move of up to 6\", or go into Strategic Reserves if it has Deep Strike.",
  },
  // --- Immaterial Interdiction ---
  {
    name: "Blades from the Beyond",
    cpCost: 1,
    scope: "Immaterial Interdiction",
    phase: "Fight phase",
    description:
      "An INTERCEPTOR SQUAD unit that made a charge move this turn, when selected to fight: its melee attacks gain [LANCE] (+1 to the Wound roll).",
    damageEffect: { kind: "grant-lance", appliesTo: "interceptor-squad-melee" },
  },
  {
    name: "By Thought Alone",
    cpCost: 1,
    scope: "Immaterial Interdiction",
    phase: "Your Shooting phase",
    description: "When an INTERCEPTOR SQUAD unit starts an action, that action doesn't stop it being eligible to shoot.",
  },
  {
    name: "Responsive Displacement",
    cpCost: 1,
    scope: "Immaterial Interdiction",
    phase: "Opponent's Movement phase",
    description:
      "After an enemy unit engaged with an unengaged INTERCEPTOR SQUAD unit ends a Fall Back move, the Interceptors can make a Normal move of up to D3+3\".",
  },
  // --- Core ---
  {
    name: "Command Re-roll",
    cpCost: 1,
    scope: "core",
    phase: "Any phase",
    description: "Re-roll a Hit, Wound, Damage, Advance, Charge, Hazard, or Save roll.",
  },
];

export function findStratagem(name: string): Stratagem | undefined {
  return STRATAGEMS.find((s) => s.name === name);
}
