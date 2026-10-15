/**
 * Detachment rules and enhancements for the "Recon" list: Banishers (2 Detachment
 * Points) + Immaterial Interdiction (1 Detachment Point) = 3 Detachment Points.
 *
 * Source: Wahapedia's 11th-edition Grey Knights page (fetched 2026-10-15), with the
 * Banishers rule/enhancements cross-checked against Tabletop Battles' "Detachment
 * Focus: Banishers" article. Where the two differ the Wahapedia wording is used.
 * Immaterial Interdiction was only available from the one source.
 */

export type DetachmentName = "Banishers" | "Immaterial Interdiction";

export interface DetachmentAbility {
  name: string;
  detachment: DetachmentName;
  description: string;
  /** Whether this ability directly changes damage-math (vs. purely positional/utility). */
  damageRelevant: boolean;
}

export const DETACHMENT_ABILITIES: DetachmentAbility[] = [
  {
    name: "Channelled Force",
    detachment: "Banishers",
    description:
      "Each time a GREY KNIGHTS unit from your army is selected to fight, it can take a Leadership test. If passed, choose one: until the end of the phase, PSYCHIC melee weapons on its models gain [SUSTAINED HITS 1] or [LETHAL HITS].",
    damageRelevant: true,
  },
  {
    name: "Echojump",
    detachment: "Immaterial Interdiction",
    description:
      "In your Shooting phase, after a friendly INTERCEPTOR SQUAD unit has shot, that unit can't use its Personal Teleporters ability but can make a surge move of up to D6+1\".",
    damageRelevant: false, // movement only
  },
];

export interface Enhancement {
  name: string;
  detachment: DetachmentName;
  points: number;
  description: string;
  /** How (if at all) this enhancement changes the bearer's unit's damage math.
   * Applied automatically to whichever roster unit carries it. */
  damageEffect?:
    | { kind: "strength-bonus"; value: number }
    | { kind: "ap-bonus-shooting"; value: number }
    | { kind: "reroll-hit-ones-shooting" };
}

export const ENHANCEMENTS: Enhancement[] = [
  // --- Banishers ---
  {
    name: "Sigil of the Hunt",
    detachment: "Banishers",
    points: 10,
    description: "GREY KNIGHTS model only. In your Shooting phase, the bearer's unit can re-roll Hit rolls of 1.",
    damageEffect: { kind: "reroll-hit-ones-shooting" },
  },
  {
    name: "The Ephemeral Tome",
    detachment: "Banishers",
    points: 15,
    description:
      "GREY KNIGHTS INFANTRY model only. At the start of your Shooting phase, if the bearer's unit isn't in Engagement Range, it can make a Normal move of up to D6\", but it can't declare a charge this turn.",
  },
  {
    name: "The Sixty-sixth Seal",
    detachment: "Banishers",
    points: 25,
    description: "GREY KNIGHTS model only. In your Shooting phase, the bearer's unit improves its attacks' Armour Penetration by 1.",
    damageEffect: { kind: "ap-bonus-shooting", value: 1 },
  },
  {
    name: "Pyresoul",
    detachment: "Banishers",
    points: 20,
    description:
      "GREY KNIGHTS model only (Psychic). At the start of your Shooting phase, the bearer can deal D3 mortal wounds to one visible enemy unit within 24\".",
  },
  // --- Immaterial Interdiction (INTERCEPTOR SQUAD upgrades) ---
  {
    name: "Predestined Coordinates",
    detachment: "Immaterial Interdiction",
    points: 10,
    description: "INTERCEPTOR SQUAD unit only. In your first Movement phase, the unit can make an ingress move.",
  },
  {
    name: "Astral Overlap",
    detachment: "Immaterial Interdiction",
    points: 10,
    description: "INTERCEPTOR SQUAD unit only. The unit has Stealth.",
  },
];
