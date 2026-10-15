import type { AttackContext, TargetUnit, WeaponProfile } from "../engine/types";
import type { RerollFlags } from "../engine/attackSequence";
import { WEAPONS } from "./weapons";
import type { UnitDefinition } from "./roster";
import { ENHANCEMENTS } from "./detachments";

/**
 * User-controlled toggles for every damage-affecting rule/stratagem this army
 * has, applied per unit wherever they're eligible (rather than the engine
 * silently guessing whether they're "on"). All default off — the base
 * scenario reflects no CP spent and no optional rule triggered.
 *
 * Detachments: Banishers + Immaterial Interdiction (3 Detachment Points).
 */
export interface DamageSettings {
  /** Banishers detachment rule, Channelled Force (free): a GREY KNIGHTS unit
   * selected to fight takes a Leadership test; if passed, choose ONE of
   * [SUSTAINED HITS 1] or [LETHAL HITS] for its Psychic melee weapons. This
   * toggle assumes the Leadership test was passed. */
  channelledForceSustained: boolean;
  /** Channelled Force, the [LETHAL HITS] choice. Mutually exclusive with
   * `channelledForceSustained` (see `applyStratagemToggle`). */
  channelledForceLethal: boolean;
  /** Chaos Bane (1CP, Banishers): a PSYKER unit that hasn't shot — its ranged
   * weapons gain [ANTI-CHAOS 4+]. Only has an effect against CHAOS targets. */
  chaosBane: boolean;
  /** Blades from the Beyond (1CP, Immaterial Interdiction): an INTERCEPTOR
   * SQUAD unit that made a charge move this turn — its melee attacks gain
   * [LANCE] (+1 to the Wound roll). */
  bladesFromTheBeyond: boolean;
  /** Purifier Squad's Sanctity of Purpose ability upgrade: re-roll ANY failed
   * Wound roll (not just a 1) when the target is within range of an
   * objective marker. The plain re-roll-a-1 part of that ability is always
   * on regardless of this toggle. */
  nearObjective: boolean;
}

export const DEFAULT_DAMAGE_SETTINGS: DamageSettings = {
  channelledForceSustained: false,
  channelledForceLethal: false,
  chaosBane: false,
  bladesFromTheBeyond: false,
  nearObjective: false,
};

/** Apply one toggle change, enforcing the "choose one" rule on Channelled
 * Force: turning either choice on turns the other off. */
export function applyStratagemToggle(
  settings: DamageSettings,
  key: keyof DamageSettings,
  value: boolean
): DamageSettings {
  const next: DamageSettings = { ...settings, [key]: value };
  if (value && key === "channelledForceSustained") next.channelledForceLethal = false;
  if (value && key === "channelledForceLethal") next.channelledForceSustained = false;
  return next;
}

export interface ScenarioFlags {
  halfRange: boolean;
  channelledForceSustained: boolean; // melee: psychic weapons gain [SUSTAINED HITS 1]
  channelledForceLethal: boolean; // melee: psychic weapons gain [LETHAL HITS]
  chaosBane: boolean; // shooting: PSYKER ranged weapons gain [ANTI-CHAOS 4+]
  bladesFromTheBeyond: boolean; // melee: Interceptor Squad gains [LANCE]
  nearObjective: boolean; // Sanctity of Purpose upgrade (Purifier Squad)
}

export interface WeaponEngagement {
  weaponLabel: string;
  ctx: AttackContext;
  rerolls?: RerollFlags;
}

function enhancementEffect(unit: UnitDefinition) {
  return ENHANCEMENTS.find((e) => e.name === unit.enhancement)?.damageEffect;
}

function enhancementStrengthBonus(unit: UnitDefinition): number {
  const eff = enhancementEffect(unit);
  return eff?.kind === "strength-bonus" ? eff.value : 0;
}

/** The Sixty-sixth Seal: +1 AP on the bearer's unit's shooting attacks. */
function enhancementShootingApBonus(unit: UnitDefinition): number {
  const eff = enhancementEffect(unit);
  return eff?.kind === "ap-bonus-shooting" ? eff.value : 0;
}

/** Sigil of the Hunt: bearer's unit re-rolls Hit rolls of 1 in the Shooting phase. */
function enhancementRerollsShootingOnes(unit: UnitDefinition): boolean {
  return enhancementEffect(unit)?.kind === "reroll-hit-ones-shooting";
}

function unitHasRangeSensitiveWeapon(unit: UnitDefinition): boolean {
  return unit.loadouts.some((l) =>
    l.rangedWeapons.some((key) => {
      const w = WEAPONS[key];
      return !!(w?.keywords.rapidFire || w?.keywords.melta);
    })
  );
}

export function unitHasPsychicMelee(unit: UnitDefinition): boolean {
  return unit.loadouts.some((l) => {
    const w = l.meleeWeapon ? WEAPONS[l.meleeWeapon] : undefined;
    return !!w?.isPsychic;
  });
}

/** Which of the toggles actually apply to this unit — not every one is universal:
 * - Channelled Force (either choice): any unit with a Psychic melee weapon
 *   (it only boosts Psychic melee weapons, so it does nothing for e.g. the
 *   Callidus or a Razorback).
 * - Chaos Bane: PSYKER units that have a ranged weapon.
 * - Blades from the Beyond: Interceptor Squad only.
 * - "near objective" (Sanctity of Purpose upgrade): Purifier Squad only.
 * Used to only show/offer toggles that are actually valid for a given unit,
 * instead of showing every toggle for every unit regardless of eligibility. */
export function eligibleStratagemKeys(unit: UnitDefinition): (keyof DamageSettings)[] {
  const keys: (keyof DamageSettings)[] = [];
  if (unitHasPsychicMelee(unit)) keys.push("channelledForceSustained", "channelledForceLethal");
  if (unit.keywords.includes("PSYKER") && unit.loadouts.some((l) => l.rangedWeapons.length > 0)) keys.push("chaosBane");
  if (unit.isInterceptorSquad) keys.push("bladesFromTheBeyond");
  if (unit.hasSanctityOfPurpose) keys.push("nearObjective");
  return keys;
}

/** Translate a target's own toggled defensive rules into the AttackContext
 * fields that apply them — same for every weapon/engagement built against
 * that target, in either phase, regardless of which of my units is
 * attacking. */
function defensiveMods(target: TargetUnit): { woundMod: number; apReduction: number; damageReduction: number } {
  const d = target.defensiveSettings;
  const inc = target.incoming;
  return {
    // Manual -1-to-Wound toggle and any auto-detected -1-to-Wound ability stack
    // here (the engine clamps the net wound modifier to the ±1 core-rules cap).
    woundMod: (d?.minusOneToWound ? -1 : 0) - (inc?.woundPenalty ?? 0),
    apReduction: d?.minusOneToAP ? 1 : 0,
    damageReduction: (d?.minusOneToDamage ? 1 : 0) + (inc?.damageReduction ?? 0),
  };
}

/** Target-imposed penalty to incoming Hit rolls (e.g. an auto-detected -1 to
 * Hit / Stealth ability). Cover is handled separately, per-weapon, since it's
 * negated by [IGNORES COVER]. */
function incomingHitMod(target: TargetUnit): number {
  return -(target.incoming?.hitPenalty ?? 0);
}

/** Sanctity of Purpose (Purifier Squad only): re-roll a Wound roll of 1 is
 * always on, upgrading to re-roll any failed Wound roll near an objective.
 * It's a unit-wide ability, not a shooting-only one, so it applies to this
 * unit's melee attacks exactly as much as its shooting. Shared by both
 * `buildShootingEngagements` and `buildMeleeEngagements` so the two phases
 * can never drift out of sync on this. */
function unitRerolls(unit: UnitDefinition, scenario: ScenarioFlags): RerollFlags | undefined {
  return unit.hasSanctityOfPurpose
    ? {
        woundRerollOnes: true,
        woundRerollAllFailed: scenario.nearObjective || undefined,
      }
    : undefined;
}

/** Build one AttackContext per distinct ranged weapon across a unit's loadouts, for a shooting-phase scenario. */
export function buildShootingEngagements(
  unit: UnitDefinition,
  target: TargetUnit,
  scenario: ScenarioFlags
): WeaponEngagement[] {
  const engagements: WeaponEngagement[] = [];
  const strengthBonus = enhancementStrengthBonus(unit);
  const apBonus = enhancementShootingApBonus(unit);
  const baseRerolls = unitRerolls(unit, scenario);
  // Sigil of the Hunt: re-roll Hit rolls of 1 in the Shooting phase (merged
  // with any Sanctity of Purpose Wound re-rolls the unit already has).
  const rerolls: RerollFlags | undefined = enhancementRerollsShootingOnes(unit)
    ? { ...baseRerolls, hitRerollOnes: true }
    : baseRerolls;
  const { woundMod, apReduction, damageReduction } = defensiveMods(target);
  // Chaos Bane: ranged weapons of a PSYKER unit gain [ANTI-CHAOS 4+].
  const grantAnti =
    scenario.chaosBane && unit.keywords.includes("PSYKER") ? { keyword: "CHAOS", threshold: 4 } : undefined;

  for (const loadout of unit.loadouts) {
    for (const weaponKey of loadout.rangedWeapons) {
      const weapon = WEAPONS[weaponKey];
      if (!weapon) continue;
      // Champion of the Order of Purifiers: +1 Attacks to every Purifying
      // Flame weapon in the unit Crowe is leading — including his own.
      const attacksBonus = unit.hasChampionOfPurifiers && weapon.name === "Purifying Flame" ? 1 : undefined;
      // Cover: -1 to the Hit roll of ranged attacks against a target with the
      // benefit of cover, unless the weapon has [IGNORES COVER] — 11e rule
      // (10e instead gave the defender a save bonus; this app targets 11e,
      // so it must be a hit-roll penalty, not a save change). Ranged only —
      // cover doesn't affect melee, so this never applies in
      // `buildMeleeEngagements` below.
      // Cover (-1, negated by [IGNORES COVER]) plus any auto-detected -1-to-Hit
      // ability (e.g. Stealth, which is a ranged-only penalty — hence applied
      // here in the shooting builder, not in melee). Engine clamps the total.
      const hitMod =
        (target.hasCover && !weapon.keywords.ignoresCover ? -1 : 0) + incomingHitMod(target);
      const ctx: AttackContext = {
        numAttackingModels: loadout.count,
        weapon,
        target,
        halfRange: scenario.halfRange,
        hitMod,
        woundMod,
        strengthBonus,
        attacksBonus,
        apBonus: apBonus > 0 ? apBonus : undefined,
        grantAnti,
        apReduction,
        damageReduction,
      };
      engagements.push({ weaponLabel: `${weapon.name} (${loadout.label})`, ctx, rerolls });
    }
  }
  return engagements;
}

/** Build one AttackContext for a unit's melee weapon(s), for a fight-phase scenario. */
export function buildMeleeEngagements(
  unit: UnitDefinition,
  target: TargetUnit,
  scenario: ScenarioFlags
): WeaponEngagement[] {
  const engagements: WeaponEngagement[] = [];
  const rerolls = unitRerolls(unit, scenario);
  const { woundMod, apReduction, damageReduction } = defensiveMods(target);
  // [LANCE] (Blades from the Beyond, Interceptor Squad that charged): +1 to
  // the Wound roll. Combined with any defensive -1 to Wound before the
  // engine's net ±1 clamp, so the two can cancel but never stack past the cap.
  const lanceMod = scenario.bladesFromTheBeyond && unit.isInterceptorSquad ? 1 : 0;

  for (const loadout of unit.loadouts) {
    if (!loadout.meleeWeapon) continue;
    const weapon = WEAPONS[loadout.meleeWeapon];
    if (!weapon) continue;
    // Channelled Force only boosts PSYCHIC melee weapons (e.g. the Nemesis
    // force weapon; not a Close combat weapon, Crowe's Black Blade or a
    // Razorback's Armoured tracks).
    const channelled = !!weapon.isPsychic;
    const ctx: AttackContext = {
      numAttackingModels: loadout.count,
      weapon,
      target,
      halfRange: false,
      hitMod: 0,
      woundMod: woundMod + lanceMod,
      strengthBonus: 0,
      bonusSustainedHits: channelled && scenario.channelledForceSustained ? 1 : undefined,
      grantLethalHits: channelled && scenario.channelledForceLethal ? true : undefined,
      apReduction,
      damageReduction,
    };
    engagements.push({ weaponLabel: `${weapon.name} (${loadout.label})`, ctx, rerolls });
  }
  return engagements;
}

function scenarioLabel(base: string, unit: UnitDefinition, scenario: ScenarioFlags, mode: "shooting" | "melee"): string {
  const parts = [base];
  if (mode === "shooting") {
    if (scenario.chaosBane && unit.keywords.includes("PSYKER")) parts.push("Chaos Bane (1CP)");
  } else {
    if (unitHasPsychicMelee(unit)) {
      if (scenario.channelledForceSustained) parts.push("Channelled Force: Sustained Hits 1");
      if (scenario.channelledForceLethal) parts.push("Channelled Force: Lethal Hits");
    }
    if (scenario.bladesFromTheBeyond && unit.isInterceptorSquad) parts.push("Blades from the Beyond (1CP)");
  }
  if (unit.hasSanctityOfPurpose && scenario.nearObjective) parts.push("near objective");
  return parts.join(", ");
}

/** One scenario per range-band (shooting) / one for melee, reflecting the
 * current global `settings` toggles — not an auto-generated matrix of every
 * combination. Toggle the settings and re-run to compare "with" vs "without"
 * any given rule directly.
 *
 * `halfRangeOverride` controls the shooting range band for range-sensitive
 * (Rapid Fire / Melta) units:
 *   - undefined → auto: enumerate BOTH half-range and full-range scenarios
 *     (the original behaviour — lets a caller compare or auto-pick the best).
 *   - true  → half range only (the bonus is active).
 *   - false → full range only (no bonus).
 * A manual per-calculation half-range toggle in the UI passes true/false here
 * to force a single band instead of the auto pair. Non-range-sensitive units
 * always resolve to a single "shooting" scenario regardless. */
export function unitScenarios(
  unit: UnitDefinition,
  settings: DamageSettings,
  halfRangeOverride?: boolean
): { mode: "shooting" | "melee"; scenario: ScenarioFlags; label: string }[] {
  const scenarios: { mode: "shooting" | "melee"; scenario: ScenarioFlags; label: string }[] = [];
  const rangeSensitive = unitHasRangeSensitiveWeapon(unit);
  const hasRanged = unit.loadouts.some((l) => l.rangedWeapons.length > 0);
  const hasMelee = unit.loadouts.some((l) => l.meleeWeapon);

  if (hasRanged) {
    const ranges =
      halfRangeOverride === undefined
        ? rangeSensitive
          ? [true, false]
          : [false]
        : [rangeSensitive ? halfRangeOverride : false];
    for (const halfRange of ranges) {
      const rangeLabel = rangeSensitive ? (halfRange ? "half range" : "full range") : "shooting";
      const scenario: ScenarioFlags = {
        halfRange,
        channelledForceSustained: false,
        channelledForceLethal: false,
        chaosBane: settings.chaosBane,
        bladesFromTheBeyond: false,
        nearObjective: settings.nearObjective,
      };
      scenarios.push({ mode: "shooting", scenario, label: scenarioLabel(rangeLabel, unit, scenario, "shooting") });
    }
  }
  if (hasMelee) {
    const scenario: ScenarioFlags = {
      halfRange: false,
      channelledForceSustained: settings.channelledForceSustained,
      channelledForceLethal: settings.channelledForceLethal,
      chaosBane: false,
      bladesFromTheBeyond: settings.bladesFromTheBeyond,
      nearObjective: settings.nearObjective,
    };
    scenarios.push({ mode: "melee", scenario, label: scenarioLabel("melee", unit, scenario, "melee") });
  }
  return scenarios;
}

export function buildEngagementsForScenario(
  unit: UnitDefinition,
  target: TargetUnit,
  mode: "shooting" | "melee",
  scenario: ScenarioFlags
): WeaponEngagement[] {
  return mode === "shooting"
    ? buildShootingEngagements(unit, target, scenario)
    : buildMeleeEngagements(unit, target, scenario);
}

export function weaponAverage(weapon: WeaponProfile): number {
  return typeof weapon.damage === "number" ? weapon.damage : (weapon.damage.dice === "D3" ? 2 : 3.5) + (weapon.damage.flat ?? 0);
}
