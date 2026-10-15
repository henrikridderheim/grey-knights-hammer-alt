import { describe, it, expect } from "vitest";
import { ROSTER } from "./roster";
import {
  applyStratagemToggle,
  buildMeleeEngagements,
  buildShootingEngagements,
  eligibleStratagemKeys,
  unitScenarios,
  DEFAULT_DAMAGE_SETTINGS,
  type ScenarioFlags,
} from "./engagementBuilder";
import type { TargetUnit } from "../engine/types";

const target: TargetUnit = {
  name: "dummy",
  isAttached: false,
  hasCover: false,
  modelCountForBlast: 1,
  keywords: ["INFANTRY"],
  groups: [{ label: "x", count: 1, toughness: 4, save: 3, wounds: 2 }],
};

const baseScenario: ScenarioFlags = {
  halfRange: false,
  channelledForceSustained: false,
  channelledForceLethal: false,
  chaosBane: false,
  bladesFromTheBeyond: false,
  nearObjective: false,
};

describe("Sanctity of Purpose (Purifier Squad)", () => {
  const purifierSquad = ROSTER.find((u) => u.id === "purifier-squad")!;
  const terminatorSquad = ROSTER.find((u) => u.id === "terminator-squad-1")!;

  it("applies the baseline re-roll-wound-1s to Purifier Squad's melee attacks, not just shooting", () => {
    const meleeEngagements = buildMeleeEngagements(purifierSquad, target, baseScenario);
    expect(meleeEngagements.length).toBeGreaterThan(0);
    for (const e of meleeEngagements) {
      expect(e.rerolls?.woundRerollOnes).toBe(true);
    }
  });

  it("upgrades to re-roll all failed wounds in melee when near an objective", () => {
    const nearObjective = buildMeleeEngagements(purifierSquad, target, { ...baseScenario, nearObjective: true });
    for (const e of nearObjective) {
      expect(e.rerolls?.woundRerollAllFailed).toBe(true);
    }
  });

  it("does not grant Sanctity of Purpose rerolls to a unit that doesn't have the ability", () => {
    const meleeEngagements = buildMeleeEngagements(terminatorSquad, target, baseScenario);
    for (const e of meleeEngagements) {
      expect(e.rerolls?.woundRerollOnes).not.toBe(true);
    }
  });

  it("still applies in shooting too (regression guard against re-breaking the other phase)", () => {
    const shootingEngagements = buildShootingEngagements(purifierSquad, target, baseScenario);
    for (const e of shootingEngagements) {
      expect(e.rerolls?.woundRerollOnes).toBe(true);
    }
  });
});

describe("cover (-1 to Hit, ranged only) — was previously unwired: hitMod was hardcoded to 0 everywhere", () => {
  const gmnd = ROSTER.find((u) => u.id === "gmnd-2")!;
  const targetInCover: TargetUnit = { ...target, hasCover: true };

  it("applies -1 hitMod to a ranged weapon without [IGNORES COVER] when the target has cover", () => {
    const engagements = buildShootingEngagements(gmnd, targetInCover, baseScenario);
    const sublimator = engagements.find((e) => e.weaponLabel.includes("Sublimator"))!;
    expect(sublimator.ctx.hitMod).toBe(-1);
  });

  it("does not apply the penalty to a weapon with [IGNORES COVER] (Heavy psycannon)", () => {
    const engagements = buildShootingEngagements(gmnd, targetInCover, baseScenario);
    const heavyPsycannon = engagements.find((e) => e.weaponLabel.includes("Heavy psycannon"))!;
    expect(heavyPsycannon.ctx.hitMod).toBe(0);
  });

  it("applies no penalty at all when the target has no cover", () => {
    const engagements = buildShootingEngagements(gmnd, target, baseScenario);
    for (const e of engagements) {
      expect(e.ctx.hitMod).toBe(0);
    }
  });

  it("never applies to melee — cover only affects ranged attacks in 11e", () => {
    const engagements = buildMeleeEngagements(gmnd, targetInCover, baseScenario);
    expect(engagements.length).toBeGreaterThan(0);
    for (const e of engagements) {
      expect(e.ctx.hitMod).toBe(0);
    }
  });
});

describe("unitScenarios half-range override", () => {
  // A range-sensitive unit (Rapid Fire / Melta) auto-enumerates two shooting
  // scenarios (half + full band); the manual override collapses that to one.
  const rangeSensitiveUnit = ROSTER.find(
    (u) => unitScenarios(u, DEFAULT_DAMAGE_SETTINGS).filter((s) => s.mode === "shooting").length === 2
  )!;

  it("auto-enumerates both half and full range when no override is given", () => {
    expect(rangeSensitiveUnit).toBeDefined();
    const shooting = unitScenarios(rangeSensitiveUnit, DEFAULT_DAMAGE_SETTINGS).filter((s) => s.mode === "shooting");
    expect(shooting.map((s) => s.scenario.halfRange).sort()).toEqual([false, true]);
  });

  it("collapses to a single half-range scenario when override = true", () => {
    const shooting = unitScenarios(rangeSensitiveUnit, DEFAULT_DAMAGE_SETTINGS, true).filter((s) => s.mode === "shooting");
    expect(shooting).toHaveLength(1);
    expect(shooting[0].scenario.halfRange).toBe(true);
  });

  it("collapses to a single full-range scenario when override = false", () => {
    const shooting = unitScenarios(rangeSensitiveUnit, DEFAULT_DAMAGE_SETTINGS, false).filter((s) => s.mode === "shooting");
    expect(shooting).toHaveLength(1);
    expect(shooting[0].scenario.halfRange).toBe(false);
  });

  it("never forces half range on a unit with no Rapid Fire / Melta weapon", () => {
    const plainRangedUnit = ROSTER.find(
      (u) =>
        u.loadouts.some((l) => l.rangedWeapons.length > 0) &&
        unitScenarios(u, DEFAULT_DAMAGE_SETTINGS).filter((s) => s.mode === "shooting").length === 1
    );
    if (!plainRangedUnit) return; // roster has none; nothing to assert
    const shooting = unitScenarios(plainRangedUnit, DEFAULT_DAMAGE_SETTINGS, true).filter((s) => s.mode === "shooting");
    expect(shooting).toHaveLength(1);
    expect(shooting[0].scenario.halfRange).toBe(false);
  });
});

describe("auto-detected incoming modifiers (target.incoming)", () => {
  const gmnd = ROSTER.find((u) => u.id === "gmnd-2")!;

  it("threads a -1-to-Hit ability into shooting ctx.hitMod, but not melee", () => {
    const stealthed: TargetUnit = { ...target, incoming: { hitPenalty: 1 } };
    for (const e of buildShootingEngagements(gmnd, stealthed, baseScenario)) {
      expect(e.ctx.hitMod).toBe(-1);
    }
    for (const e of buildMeleeEngagements(gmnd, stealthed, baseScenario)) {
      expect(e.ctx.hitMod).toBe(0); // -1 to Hit (Stealth) is ranged-only
    }
  });

  it("threads -1 to Wound and -1 Damage into both shooting and melee", () => {
    const warded: TargetUnit = { ...target, incoming: { woundPenalty: 1, damageReduction: 1 } };
    for (const e of [...buildShootingEngagements(gmnd, warded, baseScenario), ...buildMeleeEngagements(gmnd, warded, baseScenario)]) {
      expect(e.ctx.woundMod).toBe(-1);
      expect(e.ctx.damageReduction).toBe(1);
    }
  });

  it("stacks a -1-to-Hit ability with cover (engine clamps the total)", () => {
    const stealthedInCover: TargetUnit = { ...target, hasCover: true, incoming: { hitPenalty: 1 } };
    const sublimator = buildShootingEngagements(gmnd, stealthedInCover, baseScenario).find((e) => e.weaponLabel.includes("Sublimator"))!;
    expect(sublimator.ctx.hitMod).toBe(-2); // combined; the engine clamps to -1 at roll time
  });
});

describe("target defensive toggles (-1 Wound / -1 Damage / -1 AP)", () => {
  const gmnd = ROSTER.find((u) => u.id === "gmnd-2")!;

  it("does nothing when the target has no defensiveSettings", () => {
    for (const e of buildShootingEngagements(gmnd, target, baseScenario)) {
      expect(e.ctx.woundMod).toBe(0);
      expect(e.ctx.apReduction ?? 0).toBe(0);
      expect(e.ctx.damageReduction ?? 0).toBe(0);
    }
  });

  it("threads -1 to Wound into ctx.woundMod for both shooting and melee", () => {
    const debuffed: TargetUnit = { ...target, defensiveSettings: { minusOneToWound: true, minusOneToDamage: false, minusOneToAP: false } };
    for (const e of buildShootingEngagements(gmnd, debuffed, baseScenario)) {
      expect(e.ctx.woundMod).toBe(-1);
    }
    for (const e of buildMeleeEngagements(gmnd, debuffed, baseScenario)) {
      expect(e.ctx.woundMod).toBe(-1);
    }
  });

  it("threads -1 to Damage into ctx.damageReduction for both shooting and melee", () => {
    const debuffed: TargetUnit = { ...target, defensiveSettings: { minusOneToWound: false, minusOneToDamage: true, minusOneToAP: false } };
    for (const e of buildShootingEngagements(gmnd, debuffed, baseScenario)) {
      expect(e.ctx.damageReduction).toBe(1);
    }
    for (const e of buildMeleeEngagements(gmnd, debuffed, baseScenario)) {
      expect(e.ctx.damageReduction).toBe(1);
    }
  });

  it("threads -1 to AP into ctx.apReduction for both shooting and melee", () => {
    const debuffed: TargetUnit = { ...target, defensiveSettings: { minusOneToWound: false, minusOneToDamage: false, minusOneToAP: true } };
    for (const e of buildShootingEngagements(gmnd, debuffed, baseScenario)) {
      expect(e.ctx.apReduction).toBe(1);
    }
    for (const e of buildMeleeEngagements(gmnd, debuffed, baseScenario)) {
      expect(e.ctx.apReduction).toBe(1);
    }
  });

  it("stacks all three at once", () => {
    const debuffed: TargetUnit = { ...target, defensiveSettings: { minusOneToWound: true, minusOneToDamage: true, minusOneToAP: true } };
    for (const e of buildShootingEngagements(gmnd, debuffed, baseScenario)) {
      expect(e.ctx.woundMod).toBe(-1);
      expect(e.ctx.damageReduction).toBe(1);
      expect(e.ctx.apReduction).toBe(1);
    }
  });
});

describe("Channelled Force (Banishers) — Psychic melee weapons only", () => {
  const purifiers = ROSTER.find((u) => u.id === "purifier-squad")!;
  const callidus = ROSTER.find((u) => u.id === "callidus-assassin")!;

  it("grants Sustained Hits 1 to Psychic melee weapons only (not Crowe's Black Blade or a Close combat weapon)", () => {
    const engagements = buildMeleeEngagements(purifiers, target, { ...baseScenario, channelledForceSustained: true });
    const psychic = engagements.filter((e) => e.ctx.weapon.isPsychic);
    const nonPsychic = engagements.filter((e) => !e.ctx.weapon.isPsychic);
    expect(psychic.length).toBeGreaterThan(0);
    expect(nonPsychic.length).toBeGreaterThan(0); // Black Blade + Close combat weapon
    for (const e of psychic) expect(e.ctx.bonusSustainedHits).toBe(1);
    for (const e of nonPsychic) expect(e.ctx.bonusSustainedHits).toBeUndefined();
  });

  it("grants Lethal Hits (not Sustained) when that choice is picked", () => {
    const engagements = buildMeleeEngagements(purifiers, target, { ...baseScenario, channelledForceLethal: true });
    for (const e of engagements.filter((e) => e.ctx.weapon.isPsychic)) {
      expect(e.ctx.grantLethalHits).toBe(true);
      expect(e.ctx.bonusSustainedHits).toBeUndefined();
    }
  });

  it("does nothing when neither choice is on", () => {
    for (const e of buildMeleeEngagements(purifiers, target, baseScenario)) {
      expect(e.ctx.bonusSustainedHits).toBeUndefined();
      expect(e.ctx.grantLethalHits).toBeUndefined();
    }
  });

  it("never affects shooting", () => {
    const shooting = buildShootingEngagements(purifiers, target, {
      ...baseScenario,
      channelledForceSustained: true,
      channelledForceLethal: true,
    });
    for (const e of shooting) {
      expect(e.ctx.bonusSustainedHits).toBeUndefined();
      expect(e.ctx.grantLethalHits).toBeUndefined();
    }
  });

  it("is only offered to units that actually have a Psychic melee weapon", () => {
    expect(eligibleStratagemKeys(purifiers)).toContain("channelledForceSustained");
    expect(eligibleStratagemKeys(purifiers)).toContain("channelledForceLethal");
    expect(eligibleStratagemKeys(callidus)).not.toContain("channelledForceSustained");
  });

  it("is a 'choose one' rule: turning one choice on turns the other off", () => {
    const sustained = applyStratagemToggle(DEFAULT_DAMAGE_SETTINGS, "channelledForceSustained", true);
    expect(sustained.channelledForceSustained).toBe(true);
    const lethal = applyStratagemToggle(sustained, "channelledForceLethal", true);
    expect(lethal.channelledForceLethal).toBe(true);
    expect(lethal.channelledForceSustained).toBe(false);
    // turning one OFF must not switch the other on
    const off = applyStratagemToggle(lethal, "channelledForceLethal", false);
    expect(off.channelledForceLethal).toBe(false);
    expect(off.channelledForceSustained).toBe(false);
  });
});

describe("Chaos Bane (Banishers, 1CP) — Anti-Chaos 4+ on PSYKER ranged weapons", () => {
  const strike = ROSTER.find((u) => u.id === "strike-squad")!;
  const callidus = ROSTER.find((u) => u.id === "callidus-assassin")!;

  it("grants Anti-Chaos 4+ to every ranged weapon of a PSYKER unit when on", () => {
    const engagements = buildShootingEngagements(strike, target, { ...baseScenario, chaosBane: true });
    expect(engagements.length).toBeGreaterThan(0);
    for (const e of engagements) expect(e.ctx.grantAnti).toEqual({ keyword: "CHAOS", threshold: 4 });
  });

  it("grants nothing when off", () => {
    for (const e of buildShootingEngagements(strike, target, baseScenario)) {
      expect(e.ctx.grantAnti).toBeUndefined();
    }
  });

  it("does not apply to a non-PSYKER unit (Callidus) and isn't offered to it", () => {
    for (const e of buildShootingEngagements(callidus, target, { ...baseScenario, chaosBane: true })) {
      expect(e.ctx.grantAnti).toBeUndefined();
    }
    expect(eligibleStratagemKeys(callidus)).not.toContain("chaosBane");
    expect(eligibleStratagemKeys(strike)).toContain("chaosBane");
  });
});

describe("Blades from the Beyond (Immaterial Interdiction, 1CP) — [LANCE] for Interceptor Squad", () => {
  const interceptors = ROSTER.find((u) => u.id === "interceptor-squad-1")!;
  const strike = ROSTER.find((u) => u.id === "strike-squad")!;

  it("adds +1 to the Wound roll for Interceptor Squad melee", () => {
    const on = buildMeleeEngagements(interceptors, target, { ...baseScenario, bladesFromTheBeyond: true });
    expect(on.length).toBeGreaterThan(0);
    for (const e of on) expect(e.ctx.woundMod).toBe(1);
    for (const e of buildMeleeEngagements(interceptors, target, baseScenario)) expect(e.ctx.woundMod).toBe(0);
  });

  it("is combined with a defensive -1 to Wound before the engine clamp (they cancel out)", () => {
    const debuffed: TargetUnit = {
      ...target,
      defensiveSettings: { minusOneToWound: true, minusOneToDamage: false, minusOneToAP: false },
    };
    for (const e of buildMeleeEngagements(interceptors, debuffed, { ...baseScenario, bladesFromTheBeyond: true })) {
      expect(e.ctx.woundMod).toBe(0);
    }
  });

  it("does not apply to other units, to shooting, and is only offered to Interceptor Squad", () => {
    for (const e of buildMeleeEngagements(strike, target, { ...baseScenario, bladesFromTheBeyond: true })) {
      expect(e.ctx.woundMod).toBe(0);
    }
    for (const e of buildShootingEngagements(interceptors, target, { ...baseScenario, bladesFromTheBeyond: true })) {
      expect(e.ctx.woundMod).toBe(0);
    }
    expect(eligibleStratagemKeys(interceptors)).toContain("bladesFromTheBeyond");
    expect(eligibleStratagemKeys(strike)).not.toContain("bladesFromTheBeyond");
  });
});

describe("Banishers enhancements on the Dreadknights", () => {
  const sigil = ROSTER.find((u) => u.id === "gmnd-1")!; // Sigil of the Hunt
  const seal = ROSTER.find((u) => u.id === "gmnd-2")!; // The Sixty-sixth Seal

  it("The Sixty-sixth Seal gives +1 AP to shooting only, and only on its bearer", () => {
    for (const e of buildShootingEngagements(seal, target, baseScenario)) expect(e.ctx.apBonus).toBe(1);
    for (const e of buildMeleeEngagements(seal, target, baseScenario)) expect(e.ctx.apBonus).toBeUndefined();
    for (const e of buildShootingEngagements(sigil, target, baseScenario)) expect(e.ctx.apBonus).toBeUndefined();
  });

  it("Sigil of the Hunt re-rolls Hit rolls of 1 in shooting only, and only on its bearer", () => {
    for (const e of buildShootingEngagements(sigil, target, baseScenario)) expect(e.rerolls?.hitRerollOnes).toBe(true);
    for (const e of buildMeleeEngagements(sigil, target, baseScenario)) expect(e.rerolls?.hitRerollOnes).not.toBe(true);
    for (const e of buildShootingEngagements(seal, target, baseScenario)) expect(e.rerolls?.hitRerollOnes).not.toBe(true);
  });
});

describe("roster sanity", () => {
  it("the list adds up to exactly 2000 points", () => {
    expect(ROSTER.reduce((sum, u) => sum + u.points, 0)).toBe(2000);
  });

  it("the Dreadknights carry Fragstorm grenade launcher + Heavy psycannon + Sublimator (Fragstorm confirmed by the list owner)", () => {
    for (const id of ["gmnd-1", "gmnd-2"]) {
      const unit = ROSTER.find((u) => u.id === id)!;
      const ranged = unit.loadouts.flatMap((l) => l.rangedWeapons);
      expect(ranged).toEqual(["Fragstorm grenade launcher", "Heavy psycannon", "Sublimator"]);
    }
  });
});
