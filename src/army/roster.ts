/**
 * "Recon" — hardcoded Grey Knights roster, 2000pts, Strike Force, Reconnaissance.
 * Detachments: Banishers + Immaterial Interdiction (3 Detachment Points).
 * Source: user-supplied army export (App Version v2.8.0, Data Version v981);
 * weapon and statline values come from this repo's normalized 11th-edition
 * datasheet data (public/data), not from memory.
 *
 * Judgement calls worth knowing about:
 * - Castellan Crowe is modelled as attached to the Purifier Squad (a combined
 *   "Purifier Squad + Castellan Crowe" unit). The export lists them separately
 *   with no attachment info, but Crowe's datasheet can only lead Purifier
 *   Squad, and this is how the previous roster treated them. If they are
 *   actually fielded separately, split this entry.
 * - The Dreadknights DO carry a Fragstorm grenade launcher, even though the
 *   export doesn't list it (confirmed by the list owner) — it's part of the
 *   loadout alongside Heavy psycannon, Sublimator and the greathammer.
 * - One Interceptor Squad costs 145 rather than 135. The export doesn't show
 *   why; the only 10pt options are Immaterial Interdiction's Predestined
 *   Coordinates / Astral Overlap upgrades, neither of which changes damage, so
 *   it's modelled identically to the other two.
 */

export interface Statline {
  move: string;
  toughness: number;
  save: number;
  invulnSave?: number;
  wounds: number;
  leadership: string;
  oc: number;
}

export interface ModelLoadout {
  label: string;
  count: number;
  meleeWeapon?: string; // key into WEAPONS
  rangedWeapons: string[]; // keys into WEAPONS
}

export interface UnitDefinition {
  id: string;
  name: string;
  points: number;
  composition: string;
  statline: Statline;
  loadouts: ModelLoadout[];
  abilities: string[];
  keywords: string[];
  leaderCanAttachTo?: string; // unit id
  enhancement?: string; // Enhancement name from detachments.ts
  /** Interceptor Squad: eligible for Blades from the Beyond (Immaterial Interdiction). */
  isInterceptorSquad?: boolean;
  /** Units that are interchangeable copies of each other share a copyGroup.
   * The counter-matchup top-3 shows only the best-scoring copy of a group (so
   * three identical squads can't fill every slot), while combo calculations
   * still treat every copy as a separate unit that can fire. */
  copyGroup?: string;
  /** Sanctity of Purpose: re-roll a Wound roll of 1 (always); re-roll any
   * failed Wound roll instead if the target is within range of an objective
   * marker (toggle). Purifier Squad only. */
  hasSanctityOfPurpose?: boolean;
  /** Champion of the Order of Purifiers (Castellan Crowe, while leading):
   * +1 Attacks to every Purifying Flame weapon in the unit he's attached to. */
  hasChampionOfPurifiers?: boolean;
}

const GMNDK_STATLINE: Statline = {
  move: "8\"",
  toughness: 8,
  save: 2,
  invulnSave: 4,
  wounds: 13,
  leadership: "6+",
  oc: 4,
};

const GMNDK_LOADOUT: ModelLoadout[] = [
  {
    label: "GMND",
    count: 1,
    meleeWeapon: "Nemesis daemon greathammer",
    rangedWeapons: ["Fragstorm grenade launcher", "Heavy psycannon", "Sublimator"],
  },
];

const GMNDK_ABILITIES = [
  "Surge of Wrath [PSYCHIC]: vs. MONSTER/VEHICLE melee attacks, re-roll Hit, Wound, and Damage rolls.",
  "Warrior Strategist: once/battle-round, reduce a Stratagem CP cost targeting this unit by 1.",
  "Damaged (≤4 wounds remaining): -1 to Hit rolls.",
];

const TERMINATOR_STATLINE: Statline = {
  move: "5\"",
  toughness: 5,
  save: 2,
  invulnSave: 4,
  wounds: 3,
  leadership: "6+",
  oc: 2,
};

const TERMINATOR_LOADOUTS: ModelLoadout[] = [
  {
    label: "Justicar",
    count: 1,
    meleeWeapon: "Nemesis force weapon (Terminator)",
    rangedWeapons: ["Storm bolter"],
  },
  {
    label: "Terminator (storm bolter)",
    count: 1,
    meleeWeapon: "Nemesis force weapon (Terminator)",
    rangedWeapons: ["Storm bolter"],
  },
  {
    // Only 1 of the 2 Terminators carries a Storm bolter — the other's ranged
    // slot is the Apothecary's Narthecium (a support item, not a weapon), so
    // this model has no ranged attack.
    label: "Terminator (Apothecary's Narthecium)",
    count: 1,
    meleeWeapon: "Nemesis force weapon (Terminator)",
    rangedWeapons: [],
  },
  {
    label: "Ancient",
    count: 1,
    meleeWeapon: "Nemesis force weapon (Terminator)",
    rangedWeapons: ["Incinerator"],
  },
];

const TERMINATOR_ABILITIES = [
  "Ancient's Banner: +1 OC to models in the unit.",
  "Apothecary's Narthecium: in your Command phase, if the bearer lives, return one destroyed non-CHARACTER model to the unit (model-return/revive, not Feel No Pain).",
  "Force Edge [PSYCHIC]: melee attacks vs. non-MONSTER/VEHICLE targets get +1 AP.",
];

const INTERCEPTOR_STATLINE: Statline = {
  move: "6\"",
  toughness: 4,
  save: 2,
  wounds: 2,
  leadership: "6+",
  oc: 1,
};

const INTERCEPTOR_LOADOUT: ModelLoadout[] = [
  { label: "Interceptor Justicar + 4 Interceptors", count: 5, meleeWeapon: "Nemesis force weapon", rangedWeapons: ["Storm bolter"] },
];

const INTERCEPTOR_ABILITIES = [
  "Echojump (Immaterial Interdiction): after this unit shoots it can make a surge move of up to D6+1\" (movement only, not damage-relevant).",
];

export const ROSTER: UnitDefinition[] = [
  {
    // Castellan Crowe can only ever attach to the Purifier Squad (see the note
    // at the top of this file), so they're modelled as one combined attacking
    // unit rather than two separate roster entries — modelling them separately
    // silently drops Crowe's own Storm bolter/Purifying Flame/Black Blade
    // attacks AND his "+1 Attacks to Purifying Flame" buff on the squad's own
    // Purifying Flames.
    id: "purifier-squad",
    name: "Purifier Squad + Castellan Crowe",
    points: 395, // Purifier Squad 290 + Castellan Crowe 105
    composition: "10 models: 1 Knight of the Flame + 9 Purifiers, plus attached Castellan Crowe",
    statline: { move: "6\"", toughness: 4, save: 2, wounds: 2, leadership: "6+", oc: 1 },
    loadouts: [
      {
        label: "Castellan Crowe",
        count: 1,
        meleeWeapon: "Black Blade of Antwyr",
        rangedWeapons: ["Purifying Flame (Crowe)", "Storm bolter (Crowe)"],
      },
      {
        label: "Knight of the Flame + 5 Purifiers (force weapon)",
        count: 6,
        meleeWeapon: "Nemesis force weapon",
        rangedWeapons: ["Purifying Flame", "Storm bolter"],
      },
      {
        label: "4 Purifiers (psycannon)",
        count: 4,
        meleeWeapon: "Close combat weapon",
        rangedWeapons: ["Purifying Flame", "Psycannon"],
      },
    ],
    abilities: [
      "Champion of the Order of Purifiers [PSYCHIC] (Crowe): while leading this unit, +1 Attacks to every Purifying Flame weapon in the unit (including his own).",
      "Foesight [PSYCHIC] (Crowe): re-roll Hit rolls when targeting a CHARACTER.",
      "Sanctity of Purpose: re-roll a Wound roll of 1 (any target); re-roll any failed Wound roll instead if target is within range of an objective marker.",
    ],
    keywords: ["INFANTRY", "PSYKER"],
    hasSanctityOfPurpose: true,
    hasChampionOfPurifiers: true,
  },
  {
    id: "gmnd-1",
    name: "Grand Master in Nemesis Dreadknight (Sigil of the Hunt)",
    points: 250,
    composition: "1 model",
    statline: GMNDK_STATLINE,
    loadouts: GMNDK_LOADOUT,
    abilities: GMNDK_ABILITIES,
    keywords: ["VEHICLE", "WALKER", "CHARACTER", "PSYKER"],
    enhancement: "Sigil of the Hunt",
  },
  {
    id: "gmnd-2",
    name: "Grand Master in Nemesis Dreadknight (Sixty-sixth Seal)",
    points: 265,
    composition: "1 model",
    statline: GMNDK_STATLINE,
    loadouts: GMNDK_LOADOUT,
    abilities: GMNDK_ABILITIES,
    keywords: ["VEHICLE", "WALKER", "CHARACTER", "PSYKER"],
    enhancement: "The Sixty-sixth Seal",
  },
  {
    id: "terminator-squad-1",
    name: "Brotherhood Terminator Squad",
    points: 150,
    composition: "4 models: Justicar, 2x Terminator, Ancient",
    statline: TERMINATOR_STATLINE,
    loadouts: TERMINATOR_LOADOUTS,
    abilities: TERMINATOR_ABILITIES,
    keywords: ["INFANTRY", "TERMINATOR", "BATTLELINE", "PSYKER"],
    copyGroup: "terminator-squad",
  },
  {
    id: "terminator-squad-2",
    name: "Brotherhood Terminator Squad",
    points: 150,
    composition: "4 models: Justicar, 2x Terminator, Ancient",
    statline: TERMINATOR_STATLINE,
    loadouts: TERMINATOR_LOADOUTS,
    abilities: TERMINATOR_ABILITIES,
    keywords: ["INFANTRY", "TERMINATOR", "BATTLELINE", "PSYKER"],
    copyGroup: "terminator-squad",
  },
  {
    id: "strike-squad",
    name: "Strike Squad",
    points: 125,
    composition: "5 models: Justicar + 4 Grey Knights",
    statline: { move: "6\"", toughness: 4, save: 2, wounds: 2, leadership: "6+", oc: 2 },
    loadouts: [
      {
        label: "Justicar + 3 Grey Knights (force weapon, storm bolter)",
        count: 4,
        meleeWeapon: "Nemesis force weapon",
        rangedWeapons: ["Storm bolter"],
      },
      {
        label: "Grey Knight (psycannon)",
        count: 1,
        meleeWeapon: "Close combat weapon",
        rangedWeapons: ["Psycannon"],
      },
    ],
    abilities: ["Sanctifying Ritual (objective control, not damage-relevant). Deep Strike, Scouts 6\"."],
    keywords: ["INFANTRY", "BATTLELINE", "PSYKER"],
  },
  {
    id: "interceptor-squad-1",
    name: "Interceptor Squad",
    points: 135,
    composition: "5 models: Interceptor Justicar + 4 Interceptors",
    statline: INTERCEPTOR_STATLINE,
    loadouts: INTERCEPTOR_LOADOUT,
    abilities: INTERCEPTOR_ABILITIES,
    keywords: ["INFANTRY", "FLY", "PSYKER"],
    isInterceptorSquad: true,
    copyGroup: "interceptor-squad",
  },
  {
    id: "interceptor-squad-2",
    name: "Interceptor Squad",
    points: 135,
    composition: "5 models: Interceptor Justicar + 4 Interceptors",
    statline: INTERCEPTOR_STATLINE,
    loadouts: INTERCEPTOR_LOADOUT,
    abilities: INTERCEPTOR_ABILITIES,
    keywords: ["INFANTRY", "FLY", "PSYKER"],
    isInterceptorSquad: true,
    copyGroup: "interceptor-squad",
  },
  {
    id: "interceptor-squad-3",
    name: "Interceptor Squad (145pts)",
    points: 145,
    composition: "5 models: Interceptor Justicar + 4 Interceptors",
    statline: INTERCEPTOR_STATLINE,
    loadouts: INTERCEPTOR_LOADOUT,
    abilities: INTERCEPTOR_ABILITIES,
    keywords: ["INFANTRY", "FLY", "PSYKER"],
    isInterceptorSquad: true,
    copyGroup: "interceptor-squad",
  },
  {
    id: "razorback-1",
    name: "Razorback",
    points: 75,
    composition: "1 model",
    statline: { move: "10\"", toughness: 9, save: 3, wounds: 10, leadership: "6+", oc: 2 },
    loadouts: [
      { label: "Razorback", count: 1, meleeWeapon: "Armoured tracks", rangedWeapons: ["Twin heavy bolter"] },
    ],
    abilities: ["Dedicated Transport (not damage-relevant)."],
    keywords: ["VEHICLE"],
    copyGroup: "razorback",
  },
  {
    id: "razorback-2",
    name: "Razorback",
    points: 75,
    composition: "1 model",
    statline: { move: "10\"", toughness: 9, save: 3, wounds: 10, leadership: "6+", oc: 2 },
    loadouts: [
      { label: "Razorback", count: 1, meleeWeapon: "Armoured tracks", rangedWeapons: ["Twin heavy bolter"] },
    ],
    abilities: ["Dedicated Transport (not damage-relevant)."],
    keywords: ["VEHICLE"],
    copyGroup: "razorback",
  },
  {
    id: "callidus-assassin",
    name: "Callidus Assassin",
    points: 100,
    composition: "1 model",
    statline: { move: "7\"", toughness: 4, save: 6, invulnSave: 4, wounds: 4, leadership: "6+", oc: 1 },
    loadouts: [
      {
        label: "Callidus Assassin",
        count: 1,
        meleeWeapon: "Phase sword and poison blades",
        rangedWeapons: ["Neural shredder"],
      },
    ],
    abilities: [
      "Reign of Confusion: once per turn, when your opponent targets a unit within 12\" of this model with a stratagem, this model can use this ability (CP effect, not damage-relevant).",
    ],
    keywords: ["INFANTRY", "CHARACTER"],
  },
];

export const ARMY_TOTAL_POINTS = ROSTER.reduce((sum, u) => sum + u.points, 0);
