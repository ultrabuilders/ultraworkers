# Feature → mechanism

For a behaviour a user can see: **which mechanism actually makes it true.** Not
which package it lives in — `capability` is where code sits, not what makes the
behaviour real, and a row naming a package is a worthless row.

Scope: the four items M4 declares for itself. A table is only worth reading if it
is maintained by something that can fail, so the invariants below are enforced by
`scripts/check-feature-mechanism.ts` rather than by discipline.

## The table

| feature | mechanism | proof |
| --- | --- | --- |
| Toggling a plugin in `/settings` reports whether it truly reached disk | `PluginManager.#mutateConfig` (`extensibility/plugins/manager.ts:242`) takes `withFileLock` on the lockfile (`:246`) and only then `atomicWriteJson` (`:256`) | `plugin-runtime-config-lock.test.ts` |
| The `/settings` panel names which layer is shadowing a row | `createSettingsHost` (`config/settings-ui.ts:63`) routes every row through `shadowingSource` (`config/settings-ui.ts:54`), the same helper the environment copy imports (`config/shadowing.ts`) | `config/settings-provenance-guard.test.ts` |
| An extension renderer receives `rawArgs` / `argsComplete` / `executionStarted` | `RegisteredToolAdapter.renderResult` (`extensibility/extensions/wrapper.ts:63`) forwards the whole `options` object rather than re-picking fields | `extensions/raw-args-render-channel.test.ts` |
| `omp extensions-triage` lists every extension the loader found | a pure projection over `loadAllExtensions` (`modes/components/extensions/state-manager.ts:69`); it reports what the loader returned and infers nothing | `extensions-triage-cli.test.ts` |

## Invariants, and what each one is for

1. **Every `proof` names a file that exists.** A row pointing at a deleted file
   turns this table red. This is the whole gate: it is what makes the table worth
   more than a list of intentions. A row whose mechanism was renamed away does
   not become true by continuing to exist here.
2. **A `proof` of `none` must carry a reason.** "No test yet" is a legitimate
   answer. "No test yet" with nothing else is a row nobody has to look at.
3. **`none` rows are capped.** The cap is `NONE_CEILING` in
   `scripts/check-feature-mechanism.ts`. It is set to the measured count today —
   all four rows carry a real gate, so the count is **0** — and it is a
   registered number rather than a moving target. A ledger whose `none` count
   climbs one row at a time is a dead ledger: every addition reads as reasonable,
   nothing goes red, and the table stays technically correct while proving
   nothing. **The owner owns this number.** Raising it is a one-line change and
   belongs in the same commit that adds the row.

## When the table and the code disagree

**Fix the code reference, not the row to match.** Nothing generates this table,
so there is no artefact that is authoritative over it — a stale row is a stale
row. The exception is a *mechanism that was deliberately replaced*: that is a
decision, and the row should record the new one with the date, not be quietly
rewritten to whatever the code now says.

Anchors in this file are `file:line` and they rot. Re-measure before trusting
one: the M4 planning notes cited `settings-ui.ts:77` for `createSettingsHost`,
which is at `:63` today.
