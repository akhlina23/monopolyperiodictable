# Architectural & Rule Decisions (`DECISIONS.md`)

## 1. Source-Conflict Resolution Log (Master Prompt v3.0 Precedence)
1. **START Income Schedule (120%–200% vs. legacy 5%–25%)**:
   - *Conflict*: Earlier Master Prompt v2.1 drafts contained 5%–25% of base property price.
   - *Resolution*: Strictly applied Master Prompt Final v3.0 §11.3: **120% / 140% / 160% / 180% / 200% of ONE small-company construction cost** (`1.2× .. 2.0× smallCompanyCost`), with `0 KK` fixed base START salary.
2. **Board Perimeter Sequence**:
   - *Resolution*: Preserved the exact 130-tile clockwise layout matching `Monopoly_Periodic_Table_Print.pdf` (`START` at 0, `PENJARA` at 33, `PARKIR` at 65, `BEA CUKAI` at 98; Top=32, Right=31, Bottom=32, Left=31 non-corner tiles; 118 elements strictly ordered 1..118).
3. **Quiz Failure Income Skip Penalty**:
   - *Conflict*: Original flowchart mentioned skipping next START salary, while fixed salary was removed.
   - *Resolution*: Kept configurable via `economyConfig.educationalRewards.skipNextIncomeOnQuizFail` defaulting to `false` (`DRAFT_CONFIGURABLE`) so it does not silently deduct business income without host/admin opt-in.

## 2. Unapproved / Configurable Rules (Kept as `DRAFT`)
- `startingCapitalKK`: Defaults to `100,000 KK` (`DRAFT_CONFIGURABLE` in Host Setup & Admin Console).
- `rent.propertySetBonusEnabled`: Defaults to `false` (`DRAFT_DISABLED_BY_DEFAULT`) — avoids treating chemical categories as Monopoly color sets unless explicitly enabled.
- `maintenance.radiusRuleEnabled`: Defaults to `false` (`DRAFT_DISABLED_PENDING_GROUP_CONSENSUS`).
- `mainPropertyRules`: Purchase price (`20,000 KK`), bank charge (`500 KK`), and Utilities-style owner-fee multipliers (`[1, 2, 4, 8] × 500 KK`) are `DRAFT_CONFIGURABLE`.
- `educationalRewards`: Quiz reward (`2,500 KK`), Study Case reward (`10,000 KK`), Jail bail (`5,000 KK`), and Jail turns (`3`) are `DRAFT_CONFIGURABLE`.
