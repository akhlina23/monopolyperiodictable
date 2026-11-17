# Repair & V1 Consolidation Audit Note — Periodic Table Monopoly (V1)

## Resolved Issues in `V1-School-Edition/`
1. **Customs-to-Jail Mechanics (`src/engine/gameActions.ts`)**:
   - Landing on or crossing `Bea Cukai` (`corner-customs`, `pathIndex: 98`) truncates movement and sends the active player directly to `Penjara` (`corner-jail`, `pathIndex: 33`) with `CUSTOMS_SENT_TO_JAIL`, zero intermediate/START payouts, synchronized 3D token relocation, and deduplication guards (`lastJailEventId`).
2. **Jail Release Bail (`20,000 KK`)**:
   - Updated `jailBailKK` to `20000` across economy config, engine defaults, UI copy, Admin overrides, and `migrateGameStateEconomy()` (`schemaVersion: 2`) for saved games and online rooms.
3. **Root Launcher Integration**:
   - Root launcher on port `3000` exclusively supervises `V1-School-Edition` (`127.0.0.1:3101`) at `/v1/`.
