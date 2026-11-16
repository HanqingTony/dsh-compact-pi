# Migrating the v0.1 native session codec

Version 0.2 is a normal pi extension. It keeps pi's session format and uses append-only custom transactions, context edits and native compaction entries. The extension never patches pi, owns pi's session file, or rewrites a session snapshot.

The v0.1 patch replaced pi's session-manager read/write functions and dropped non-message entries and branch relationships. Its installer has been retired; `scripts/patch-pi.mjs` now only restores existing `.dsh-pi.bak` backups.

## Migration

1. Keep the original DSH session files as backups.
2. Convert each session you want to resume into a new pi file:

   ```bash
   node dist/dcp-session.mjs dsh2pi old.dsh.jsonl imported.pi.jsonl
   ```

3. Restore the patched pi installation:

   ```bash
   node scripts/patch-pi.mjs --restore --pi-dir /path/to/patched/pi-package
   ```

4. Install dcp normally and open the imported session:

   ```bash
   pi install /absolute/path/to/dsh-compact-pi
   pi --session imported.pi.jsonl
   ```

The current export codec can retain complete pi headers/entries in ignorable DSH archive records for lossless round trips. A foreign DSH log without those records imports its active message surface. Metadata already removed by the old v0.1 codec cannot be reconstructed.

If pi has been upgraded since patching, restore the exact old installation only; do not copy an old backup over a newer pi version. Installing the current pi package afresh also removes a legacy patch from that installation.
