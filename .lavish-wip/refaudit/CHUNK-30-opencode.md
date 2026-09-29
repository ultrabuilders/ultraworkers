# opencode — chunk 6/6 (8 năng lực)

## opencode.111 Debounced, semaphore-serialized, deep-equality-short-circuited config reload

- **where:** packages/core/src/config.ts:265-289
- **what:** Config reloads on filesystem change with a 100ms debounce, a 1-permit semaphore so reloads never interleave, and an `isDeepStrictEqual` check that skips the update event entirely when nothing changed.
- **how:** `reloadLock.withPermit`, `PubSub.sliding(1)` + `Stream.debounce("100 millis")`, and a compatibility-array comparison that forces a rebuild even when the parsed configs match.
- **solves:** Hot config editing during a session stays responsive and does not thrash every downstream consumer with no-op updates.
- **port effort:** Low. | **idea only:** True
## opencode.112 Symlink-resolved config discovery with global-root exclusion

- **where:** packages/core/src/config/discovery.ts:22-56
- **what:** The upward walk resolves every candidate through realpath and filters out anything under the global config roots, so the global directory cannot be loaded twice — once as global, once as a "project" ancestor.
- **how:** Resolves the parent too, with the comment 'missing children must honor symlinked global roots', then compares resolved paths against `globalRoots`/`globalFiles`.
- **solves:** A user whose project lives under their home directory does not get their global config applied twice with doubled precedence.
- **port effort:** Low. | **idea only:** True
## opencode.113 Enterprise policy layer that sits above plugin hooks

- **where:** packages/core/src/config/plugin/policy.ts
- **what:** `experimental.policies` in config, plus organization statements from a connected Console. User-global outranks repository policy; org statements come last and win; the permission hook this installs only ever sets `deny`.
- **how:** Authored documents are reversed so precedence inverts, org statements appended, then a `findLast` over wildcard-matched `${action}:${resource}` keys. The same policy removes denied providers from the provider registry.
- **solves:** Allows a deny policy that plugins cannot talk their way around — which matters precisely because plugin hooks are otherwise bidirectional (finding 17).
- **port effort:** Medium — needs an org control plane omp does not have. The "policy hook only ever denies" discipline is the reusable part. | **idea only:** True
## opencode.114 Shell command decomposition into per-command permission resources

- **where:** packages/core/src/shell/parse.ts (ARITY table :22-160, scanLegacy :173-205, scanPortable :207-265)
- **what:** A tree-sitter parse turns a command line into individual `command` nodes, each becoming its own permission resource; "always" saves an arity-aware prefix so approving `git status --porcelain` grants `git status *`, not all of git.
- **how:** `descendantsOfType("command")` walks nested substitutions; `prefix()` walks back through the ARITY table to find the deepest known prefix, defaulting to the command name. A second hand-written scanner exists behind `experimental.portable_shell_scanner`.
- **solves:** Turns "run this shell string" into N reviewable decisions, so the approval granularity matches what the human is actually authorizing.
- **port effort:** High — the ARITY table and grammar work are the bulk. omp should copy the *idea* (decompose, then grant by arity-aware prefix) and re-derive the table. | **idea only:** True
## opencode.115 Dual-scanner parity test suite

- **where:** packages/core/test/permission.test.ts:380-580, packages/core/test/tool-shell.test.ts:293+, packages/core/test/shell-parse-parity.test.ts
- **what:** ~15 bash fixtures asserted against BOTH the tree-sitter and the hand-written scanner for identical resources, save prefixes, and allow/ask/deny outcomes, plus a dedicated `tool-shell.test.ts` block that captures real `permission.assert` calls end-to-end.
- **how:** Fixtures carry `[legacy, native]` outcome pairs; the test asserts `parsed.commands.length > 0` before trusting the parse, then asserts resources, save values, effect, pending count, and post-`always` persistence.
- **solves:** A permission scanner is only as good as its adversarial fixtures; this is the test shape omp should copy for any shell-permission work.
- **port effort:** Medium. | **idea only:** True
## opencode.116 Strictly opt-in telemetry, verified

- **where:** packages/util/src/observability/otlp.ts:64,75; packages/desktop/src/renderer/startup/sentry.ts:6
- **what:** OTLP returns an empty logger set / empty layer when no endpoint is configured; Sentry returns immediately when no build-time DSN is present. No PostHog/Amplitude/Segment anywhere.
- **how:** `if (!options?.endpoint) return []` / `return Layer.empty`; `if (!import.meta.env.VITE_SENTRY_DSN) return`.
- **solves:** There is no hidden default-on egress path for a locally-run coding agent.
- **port effort:** Trivial. | **idea only:** False
## opencode.117 Server process fails closed without a credential

- **where:** packages/server/src/process.ts:52-54
- **what:** `start()` returns a failed Effect if no password is present, and defaults the bind address to 127.0.0.1.
- **how:** `if (!password) return yield* Effect.fail(new Error("Missing server password"))`.
- **solves:** The always-on HTTP surface cannot come up unauthenticated by accident.
- **port effort:** Trivial. | **idea only:** False
## opencode.118 Bounded, stack-free, cycle-safe error summarization

- **where:** packages/core/src/util/error-summary.ts
- **what:** A single helper flattens an error cause chain to at most 8 entries with no stacks, guarded against cycles, for storage and log surfaces.
- **how:** Walks `error.cause`, decodes only five known fields, stops at 8 entries or on a repeat.
- **solves:** Persisted errors stay useful for debugging without bloating the DB or leaking stack paths.
- **port effort:** Low. | **idea only:** True

