# Grey Knights 11e "Best Way to Kill It" Engine

A math-hammer web app built around one specific Grey Knights army ("Recon", 2000pts, Banishers + Immaterial Interdiction). Paste an opponent's list, and for every enemy unit
it ranks the best ways your army can kill it — Monte Carlo simulated, not expected-value shortcuts.

## Status

- ✅ Monte Carlo attack-sequence engine (hit/wound/save/damage, all listed 11e keywords), unit-tested
  against hand-calculated probabilities.
- ✅ Your army roster, weapons, stratagems, detachment rules and enhancements, cross-checked
  against live 11e data — see `scripts/verification-report.md`.
- ✅ "Best way to kill it" ranked finder, working end-to-end against a manually-entered target.
- 🚧 Opponent army list paste-in parser + multi-faction datasheet database (in progress).
- ⏳ Full matchup matrix view, manual multi-unit combination calculator.
- ⏳ Deployed URL (see below for how to deploy your own copy).

## Data sources & provenance

- **Not Wahapedia.** Wahapedia's public CSV export (`wahapedia.ru/wh40k11ed/...`) is still
  mirroring 10th-edition data as of this build — confirmed by direct comparison, so it wasn't
  usable here.
- **BSData/wh40k-11e** (`github.com/BSData/wh40k-11e`) is the live data source used instead —
  a community-maintained but currently-accurate 11th-edition dataset. Several claims from the
  original army spec were independently cross-checked against it and matched verbatim
  (detachment rules, enhancements, full weapon/unit statlines).
- **Stratagem card text** (Truesilver Channelling, Purgation Pattern, Focused Immolation,
  Spiritsear, Soul-Locked) is **not** in BattleScribe/BSData data — that data format only
  covers list-building, not in-game stratagems. Truesilver Channelling and Purgation Pattern
  were separately confirmed against a Wahapedia 10e mirror of the same (unchanged) Brotherhood
  Strike detachment. Focused Immolation, Spiritsear, and Soul-Locked (Fires of Purgation) could
  not be verified against any live source and are taken as given from the original spec —
  worth double-checking against the physical/app rules if exact wording ever matters.
- **Open item:** the three Grand Master in Nemesis Dreadknight point costs (255/245/245) don't
  cleanly reproduce from the catalogue's base+wargear costs without knowing exact roster order
  and enhancement assignment. Doesn't affect the damage math, only the points display.

Full reconciliation: [`scripts/verification-report.md`](scripts/verification-report.md).

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to http://localhost:5173).

## Testing

```bash
npx vitest run
```

## Deploying

This is a static site (no backend). `npm run build` outputs to `dist/`.

**GitHub Pages** (workflow already included at `.github/workflows/deploy.yml`):
1. Push this repo to GitHub.
2. In the repo's Settings → Pages, set Source to "GitHub Actions".
3. Push to `main` — the workflow builds and deploys automatically.

**Netlify / Vercel / Cloudflare Pages**: connect the repo, build command `npm run build`,
publish directory `dist` — all three auto-detect Vite and need no extra config.

## Re-syncing data

`npm run sync-data` (see `scripts/PIPELINE_NOTES.md` once the data pipeline lands) re-fetches
and re-parses the BSData catalogues. Your own army list lives in `src/army/roster.ts` — hand-edit
it directly when your list changes.

---

Not affiliated with Games Workshop. Rules/points data credit: [BSData](https://github.com/BSData).


## This is the "Recon" alt version

A separate copy of the original tool, rebuilt for a different list and detachments:
**Banishers + Immaterial Interdiction** (2 + 1 = 3 Detachment Points), 2000pts, Reconnaissance.

- Detachment rules, enhancements and stratagems: Wahapedia's 11th-edition Grey Knights page
  (fetched 2026-10-15); Banishers cross-checked against Tabletop Battles. See `src/army/detachments.ts`
  and `src/army/stratagems.ts`. Stratagem text there is condensed, not verbatim.
- Per-unit toggles that change the maths: Channelled Force (Sustained Hits 1 **or** Lethal Hits, assumes the
  Leadership test passes), Chaos Bane, Blades from the Beyond, Sanctity of Purpose. The Sigil of the Hunt and
  Sixty-sixth Seal enhancements are applied automatically to the Dreadknights that carry them.
- Not modelled (movement/utility/defensive, or no per-attack effect): Pyresoul (D3 mortal wounds), Ephemeral Tome,
  Echojump, the Astral Overlap / Predestined Coordinates upgrades, Hexwrought Reprisal, Warding Chant and the
  other utility stratagems.
- Assumptions: Castellan Crowe is attached to the Purifier Squad; the Dreadknights carry a Fragstorm grenade
  launcher (confirmed by the list owner, though the export omits it); the 145pt Interceptor Squad's extra 10pts is a non-damage upgrade.

`scripts/verification-report.md`, `scripts/PIPELINE_NOTES.md` and `src/army/gk-verified-datasheets.json` document the
**original** "Pure Purge" list and are kept only for reference — they do not describe this roster.
