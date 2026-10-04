# Feature → mechanism

`docs/` is organised by subsystem. This table answers the inverse question: for a
behaviour a user can see, **which code path actually makes it happen**, and **which
gate proves it**.

Both halves of that answer are load-bearing:

- `mechanism` names a **path**, not a package. A row that says `capability` or
  `coding-agent` is a useless row — that is where code _lives_, not the mechanism
  that makes the behaviour real. It still looks like a table, which is what makes it
  quietly worthless.
- `proof` names a **gate that has gone red**, or the literal `none` plus the work
  item that will produce one.

The two contracts are kept honest by
`packages/coding-agent/test/feature-mechanism-table.test.ts`:

1. A row pointing at a deleted file turns the table red.
2. Every `proof: none` names the work item that will produce its gate, **and that
   work item must still be open** — and the number of `none` rows does not exceed the
   cap registered below.

   Naming the work item makes the row **self-clearing**: when `m4-m4-6-052` or
   `m4-m4-7-053` closes, the test goes red and the row has to become a real gate. A
   `none` that cannot name a work item is rejected, so a vague "no test yet" can never
   enter the table.

   That rule clears rows but cannot stop someone _adding_ a `none` for something
   nobody has scheduled, so the count is capped as well:

   **`Registered proof:none cap: 0`** — measured 2026-10-02: 4 rows, 4 real gates, 0
   `none`.

   The two are not redundant. The cap is a floor that moves only on purpose, so the
   table cannot rot into a list of wishes; the work-item rule is what actually empties
   it. A bare cap without a machine check is a wish, and a bare work-item rule without
   a cap is a hole — so the cap here is **asserted by the test, not remembered**, which
   is the whole difference between the two designs the plan weighed.

When this table and the documentation disagree, **the documentation is what is
wrong**. Nothing generates this table, so the table is not the source of truth the
way a diff-generated ledger is.

## The four M4 claims

| feature                                                                                                                                       | mechanism                                                                                                                                                                                                                                                                                                                                                                                                      | proof                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Enabling or disabling a plugin in `/settings` reports the change that actually reached disk, and two processes cannot lose each other's write | `PluginManager.#mutateConfig` (`packages/coding-agent/src/extensibility/plugins/manager.ts:243`) re-reads the config _inside_ `withFileLock` (`packages/utils/src/file-lock.ts:70`) and persists only when the serialised config actually changed, via `atomicWriteJson` (`packages/utils/src/atomic-write.ts:37`)                                                                                             | `packages/coding-agent/test/plugin-runtime-config-lock.test.ts`         |
| The `/settings` panel names which layer is shadowing a row                                                                                    | `shadowingSource` (`packages/coding-agent/src/config/shadowing.ts:45`) produces the source, json and message; `createSettingsHost` reuses it at `packages/coding-agent/src/config/settings-ui.ts:54` so the panel and any other consumer cannot drift apart                                                                                                                                                    | `packages/coding-agent/test/config/settings-provenance-guard.test.ts`   |
| An extension renderer receives `rawArgs` / `argsComplete` / `executionStarted`                                                                | `RegisteredToolAdapter.renderResult` (`packages/coding-agent/src/extensibility/extensions/wrapper.ts:100`) forwards the whole options object through `renderOptionsWithTheme`, rather than re-listing the fields it knew about; re-listing meant a field added to the contract afterwards reached `renderCall` and stopped silently at this boundary, and the theme was augmented on one path and not the other | `packages/coding-agent/test/extensions/raw-args-render-channel.test.ts` |
| `ultraworkers extensions-triage` prints every extension the loader found, inferring nothing                                                   | `runExtensionsTriage` (`packages/coding-agent/src/cli/extensions-triage-cli.ts:73`) is a pure projection of the loader's own result through `toTriageRow`; it does not re-scan, re-order or guess                                                                                                                                                                                                              | `packages/coding-agent/test/extensions-triage-cli.test.ts`              |

## Adding a row

`proof` accepts **only** a repo-relative path to a test under `packages/*/test/`.
It deliberately does not accept a command in `scripts/`: a second kind of address
means a second table to keep in step with the first, which is how one document ends
up telling two stories. If a row genuinely needs a `scripts/` check, say so in prose
next to the row rather than giving it an address.

If the behaviour has no gate yet, write `none` **and** the id of the work item that
will add one. If you cannot name that work item, you do not have a row — you have a
wish.
