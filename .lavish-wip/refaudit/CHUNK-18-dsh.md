# dsh — chunk 5/5 (21 năng lực)

## dsh.89 Owner-only secret storage with cross-process writer locks and no fsync claim

- **where:** packages/util/atomic-write/src/index.ts:24-268; used at mode 0o600/dirMode 0o700 at packages/credentials/credentials-local/src/index.ts:691,712,764,834
- **what:** `writeFileAtomic` writes a random-suffix sibling with `flag:'wx'` (refuses to follow a symlink planted at the temp path) and the caller's `mode`, then renames; replacing a wider-permission file NARROWS it with no chmod race. `withFileLock` serializes writers via a `<file>.lock` sibling holding `<pid>\n`; takeover requires ESRCH on that PID plus a sha256-named claim file; PID reuse is deliberately NOT treated as death.
- **how:** `writeFile(temp, content, {mode, flag:'wx'})` -> `renameAtomicTemp` (8 retries, 20->200ms backoff on Windows EACCES/EBUSY/EPERM) -> on failure `rm(temp)` + rethrow. `holderExited()` rejects pid 0, non-int32, self, and any record not matching `/^\d+\n$/`.
- **solves:** Read-modify-write on a shared credentials file can resurrect another writer's state; symlink planting at a predictable temp path is a classic local privilege attack; Windows rename transients otherwise throw as unhandled rejections.
- **port effort:** Low — ~200 lines, zero dependencies, directly liftable. Note the explicit `TODO(settings-atomic-durability)`: fsync is out of scope, so a crash can lose the last write. | **idea only:** False
## dsh.90 Schema-declared secret redaction with a write-only-slot sidecar

- **where:** packages/settings/settings/src/redact.ts:47-116; enforcement at packages/settings/settings/src/index.ts:323-330 and packages/api/settings-controller/src/index.ts:103,206
- **what:** Any schemastery field marked `role('secret')` is structurally removed before a value crosses a wire boundary, and a sidecar records EVERY reachable secret position plus whether it currently holds a value — including unset object properties, so a settings form can render a write-only input without ever receiving the secret.
- **how:** `walk()` recurses through object/dict/array/union/intersect/transform nodes; every union branch is visited and ANY branch declaring a field secret removes it (conservative). The position list is deduped by JSON-stringified path with `set` OR-ed across branches.
- **solves:** Secret leakage through settings/describe responses — the most common accidental API leak in agent harnesses.
- **port effort:** Low, provided the settings schema uses one validation library and exposes live nodes (schemastery does). | **idea only:** True
## dsh.91 Layered credential precedence where the environment is explicitly read-only

- **where:** packages/credentials/credentials-local/src/index.ts:1-80 (precedence contract), :676-840 (write paths)
- **what:** `inherited process env (read-only, wins) > $DSH_HOME/.credentials.yaml (managed, writable) > <cwd>/.env > $DSH_HOME/.env`. Every write re-reads the document under a cross-process writer lock and patches only its own key, so comments and untouched entries survive; a chokidar watcher hot-publishes external edits and each reload replaces the snapshot wholesale so a deleted entry never lingers. The managed document is never materialized into the process environment.
- **how:** `withFileLock(filename, async () => { re-parse; patch own key; writeFileAtomic(..., {mode:0o600, dirMode:0o700}) })`. The YAML `Document` AST is edited in place, not re-serialized.
- **solves:** An env layer that can be silently shadowed by a managed store makes non-secret entries unreachable; a managed store that also served as the env layer could not be trusted not to leak.
- **port effort:** Medium — the precedence reasoning is the reusable part; the YAML-AST-preserving write needs a structured parser. | **idea only:** False
## dsh.92 Signed authority-bound browser session cookie + Host/Origin rebinding fence

- **where:** packages/client/connection/src/browser-auth.ts:100-311; packages/client/connection/src/api-request-trust.ts:49-118
- **what:** Two independent fences on every `/api` request. (1) HMAC-SHA256 signed cookie (`v1.<b64url(json)>.<b64url(sig)>`), both comparisons via `timingSafeEqual` with a byteLength pre-check, bound to the request authority and capped at the configured max age. (2) `isTrustedApiRequest` applies the Host fence to EVERY request with no browser-marker shortcut, refuses `sec-fetch-site: cross-site` unconditionally, requires Origin == Host exactly, refuses literal `"null"`, and restricts non-loopback hosts to a declared `trustedHosts` list whose entries must survive WHATWG canonicalization.
- **how:** The launch token (32 random bytes, per process) is exchanged for the cookie on a GET of `/` and redirected 303 to `./` with `cache-control: no-store; referrer-policy: no-referrer`. `assertTrustedAuthority` load-fails on `0x7f.0.0.1`, percent-encoding, unbracketed IPv6, `user@host`, and zero-padded ports.
- **solves:** DNS rebinding (a rebound page carries the attacker's domain in Host) and cross-site request forgery against a loopback API. `trustedHosts` canonicalization prevents a typo'd entry from silently broadening or narrowing a grant.
- **port effort:** Medium — ~250 lines total, no deps. Note the cookie has NO `Secure` flag (the carrier is plain-HTTP loopback); binding to a non-loopback interface would need it. | **idea only:** False
## dsh.93 Kernel-level session write lease (flock / named semaphore), never an expiring lock

- **where:** packages/session/session-persistence-jsonl/src/lease.ts:1-135; mkdir mode 0o700 at :74
- **what:** Cross-process write ownership for one session's artifact directory is arbitrated by the KERNEL: non-blocking `flock(2)` on POSIX, a named kernel semaphore on Windows — never a file lock or handle, so readers, searches, and directory removal proceed freely. Deliberately no expiry: "there is deliberately no expiry that could expropriate a stalled writer whose resumed appends would tear the log."
- **how:** `tryLockExclusive()` from `@deepseek-ai/node-addon-system/flock` (native addon, verified present in this repo as `native/system/packages/entry/src/flock.c`); contention (EAGAIN/EWOULDBLOCK) maps to `SessionAlreadyOwnedError`. Because a POSIX lock names an inode, not a path, the holder re-verifies after locking that the locked inode is still the file at the lock path, and retries otherwise.
- **solves:** Torn session logs from two writers, and the classic "my lock timed out and corrupted the file" class of bug.
- **port effort:** High — depends on a native flock binding per platform. The reasoning (kernel arbiter, no expiry, inode re-verification) ports; the addon does not. | **idea only:** True
## dsh.94 Semantic durability checkpoints (fail-closed) at model and tool boundaries

- **where:** packages/session/session-checkpoint-policy/src/index.ts:1-90
- **what:** Downstream model streaming is delayed until the complete logged request prefix is durable; top-level tool dispatch checkpoints its recorded call before the body; the next request boundary checkpoints the response/result batch. A checkpoint failure prevents adapter dispatch and prevents the tool body.
- **how:** `afterCheckpoint()` is an async generator that `await ctx.sessions.flush(session)` before `yield* next()`; nested tool dispatches reuse the durable outer call.
- **solves:** A crash between "we told the model this" and "we wrote this" loses or reorders history.
- **port effort:** Medium — requires a session log with an explicit flush boundary and idempotent replay. | **idea only:** False
## dsh.95 Bounded background jobs with per-owner admission and archive-time kill

- **where:** packages/jobs/jobs-local/src/index.ts:30-60 (defaults), :199-232 (admission), :186-189 (teardown effect); packages/jobs/jobs-local/src/ring.ts:1-113; packages/jobs/jobs/src/archive-admission.ts:1-48
- **what:** Defaults: 10 concurrent jobs per exact owner, 256 KiB live ring retention per job, 16 KiB retained after settlement, 150ms pull pump. Offsets stay absolute across head eviction so a reader can always tell it lost data (`lossy`). `workspace/session-stop` kills every running/stopping job the archived Session owns.
- **how:** `activeJobCount(owner) >= maxConcurrentJobsPerOwner` throws a model-facing `use job_kill to stop an unneeded job, wait for it to finish, then retry`. `OutputRing` trims the head to `cap` while `earliest` only advances; `utf8Tail` advances past UTF-8 continuation bytes so a surviving tail never starts inside a code point.
- **solves:** Unbounded background process/memory growth, and orphaned jobs outliving the session that started them.
- **port effort:** Medium — the ring + admission are easy; the ownership/archive integration is the part worth copying. | **idea only:** False
## dsh.96 Foreground-timeout promotion instead of kill

- **where:** packages/shell/tool-bash/src/index.ts:34-56 (Config), :206-212 (promote derivation), :508-527 (execute)
- **what:** With a job registry composed, a foreground command that hits its timeout is promoted to a background job (returning the job id) instead of being killed; a job the registry refuses at admission falls back to the executor deadline kill, and the refusal is logged. Without a registry the tool is foreground-only.
- **how:** `promoteOnTimeout` default true ANDed with `enableRunInBackground`; `ctx.shell.resolve({...request, onExpiry:'none'})` then `startJob(...)` inside try/catch, falling through to `ctx.shell.execute(...)` on throw.
- **solves:** Losing a long-running build/test to a tool timeout.
- **port effort:** Low — a policy flag plus a try/catch fallback. | **idea only:** True
## dsh.97 Cooperative, scoped timeout with signal swap-and-restore

- **where:** packages/guard/timeout-policy/src/index.ts:1-81
- **what:** Reads `timeoutMs` off the dispatched tool definition (so a mistyped name is impossible and undeclared tools delegate untouched), arms a deadline, swaps the derived signal onto `exec` for dispatch, restores the caller's signal in `finally`, and replaces the result ONLY when its own timer fired — scoped by code so a nested outer deadline is not misread as its own.
- **how:** `deadline(exec.signal, timeoutMs, TOOL_TIMEOUT)`; `timeoutOf(d.signal, TOOL_TIMEOUT) !== undefined` decides replacement; the result carries `error.info = {name:'ToolTimeoutError', code:'TOOL_TIMEOUT'}` so a retry/sandbox plugin can route on it.
- **solves:** Nested timeout wrappers misattributing each other's deadline, and post-execute listeners seeing an already-aborted signal they did not own.
- **port effort:** Low — the code-scoping trick and the signal restore are the reusable ideas. It CANNOT hard-stop a tool that ignores cancellation; that limit is documented. | **idea only:** True
## dsh.98 Subprocess runner-failure vs denial classification (outranks correctly)

- **where:** packages/sandbox/sandbox/src/diagnostics.ts:65-100; rules at packages/sandbox/sandbox-local/src/index.ts:233-242; consumption at packages/shell/bash-sandbox/src/index.ts:115-176
- **what:** Runner failure OUTRANKS denial ("the command did not run"): a rule must match a fatal stderr signature after informational lines are excluded AND satisfy its exit-code gate. bwrap and seatbelt are signature-only; landlock is gated on exit 125; windows-acl is gated on exit 127 precisely so a confined command that merely PRINTS `windows-acl-run: ` is not misclassified.
- **how:** `isRunnerSpawnFailure()` additionally requires `error.path === runnerProgram` (or absent path with `syscall === 'spawn <runner>'`) AND an independently-usable workdir — the workdir is checked at classification time, not atomically with spawn, and the code says so.
- **solves:** Without this, a broken sandbox is indistinguishable from a policy denial, and the model retries a command that never ran.
- **port effort:** Medium — the classification module is small; the per-backend signature tables are the maintenance cost. The README honestly documents that a child mimicking its runner can still cause false attribution (it cannot bypass confinement). | **idea only:** False
## dsh.99 Fresh-canonicalize-then-delegate fs fence (TOCTOU-narrowed, honest about its limits)

- **where:** packages/fs/fs-sandbox/src/index.ts:122-144; packages/fs/fs-sandbox/src/containment.ts:19-76
- **what:** `read-only` throws `FS_SANDBOX_DENIED` on the very first branch; `workspace-write` RE-RESOLVES the path immediately before the mutation and returns the FRESH target, so the identity that was checked is the identity that is written. Alias-equivalent roots (Windows 8.3, casing) are handled by walking existing ancestors and comparing `dev`+`ino`, not by string prefix.
- **how:** `resolve()` realpaths the deepest existing ancestor (so a swapped symlink ancestor is reflected); `isPathUnder(fresh.targetKey, root)` per writable root from the SHARED `writableRoots(policy)` helper the Seatbelt profile also uses, so the two cannot drift.
- **solves:** Check-here-write-there TOCTOU, and Windows alias escapes that a lexical prefix check misses.
- **port effort:** Medium. The header is explicit that this is "containment, not a security boundary" with an accepted residual TOCTOU — kernel-grade isolation of untrusted CODE stays the shell executor's job. | **idea only:** False
## dsh.100 Hook protocol: hooks never fail a turn, but PreToolUse can still deny

- **where:** packages/hooks/hook-protocol/src/runner.ts:1-106; packages/hooks/hooks-claude-code/src/index.ts:244-285; packages/hooks/hook-protocol/src/types.ts:112-119
- **what:** Hooks run through `ctx.shell` with the credential scrub, process-group cancellation and timeout machinery; a hook that cannot run becomes a non-blocking error (no exit code, message on stderr, turn proceeds). PreToolUse `permissionDecision: 'deny'` maps to a real `tools/pre-execute` `{kind:'deny'}`.
- **how:** `DEFAULT_HOOK_TIMEOUT_MS = 600_000` (both Claude Code and Codex default). A `hookSpecificOutput` block whose `hookEventName` names a DIFFERENT event is treated as malformed and its event-scoped fields are discarded.
- **solves:** Adopting Claude Code / Codex hook configs without letting a misbehaving third-party hook wedge the agent — while preserving the one decision that actually matters (deny).
- **port effort:** Medium — the codec is the bulk; the non-blocking-failure rule and the cross-event-name guard are the reusable ideas. | **idea only:** True
## dsh.101 Delegated-child permission pinning

- **where:** packages/subagent/subagent/src/child-agent.ts:225-278 (capture at :247, append at :259), :147 (cwd inheritance)
- **what:** A delegated subagent is pinned to `approvalPolicy: 'never'` whenever the approval capability exists, and captures ONLY the parent's explicit `sandbox/mode` override — never deployment defaults, never one-shot grants. Overrides are appended as `source:'delegation'` events inside the unpublished creation window so the child's effective policy is reconstructable from its log alone, and fresh policy lands after any fork seed.
- **how:** `captureDelegatedPolicyOverrides(parent)` is called synchronously before the child start's first await, "a later parent switch belongs to the parent's future, not to this child".
- **solves:** A subagent escalating past its parent's grant, or inheriting a parent's one-shot approval and reusing it.
- **port effort:** Low, given a session log that can carry `source`-tagged policy events. | **idea only:** True
## dsh.102 Telemetry that is off by default and ships its own redaction waterfall

- **where:** packages/session/session-telemetry/src/index.ts:14-45; packages/session/session-telemetry/src/coordinator.ts:179-230; packages/session/session-telemetry-otel/src/index.ts
- **what:** `session-telemetry/record` is an extension point that ships NO rules of its own — with no listener mounted, records reach the backend exactly as captured, so exported data is as clean as the rules a deployment mounts. A throwing listener withholds that ONE record (fail-closed) and never reaches the agent loop. Redaction applies to the exported COPY only; the canonical session log is never rewritten.
- **how:** The shipped mode is `FEEDBACK_ONLY` ("OTel releases a Session-log prefix only after explicit user feedback"); `DSH_TELEMETRY_DISABLED` non-empty opts out even with value '0'; the anonymous id is a random UUID in `$DSH_HOME/.anonymous-user-id`, never derived from hostname/network/git remote, deletable to reset.
- **solves:** Sessions contain prompts, tool output and file contents — accidental full-log upload is the default failure of session telemetry.
- **port effort:** Low. Weak spot: shipping zero rules means a deployment that forgets to mount one exports raw records. | **idea only:** False
## dsh.103 pnpm install-script build approval with a stale-check

- **where:** packages/boot/plugin-manager/src/build-approval.ts:1-50; apps/cli/src/plugin.ts:82
- **what:** Pending install/build scripts are read from `allowBuilds` where the value is literally the string `set this to true or false`; `approveBuilds` throws `stale-approval` if any name is no longer pending, refuses YAML anchors/aliases inside `allowBuilds`, and persists with `writeFileAtomic(..., {mode:0o600})` without running anything.
- **how:** `pnpm-workspace.yaml` is edited via the YAML `Document` AST; the profile manifest lock is held by the caller. The CLI surfaces pnpm's exact key in an error telling the user where to add it.
- **solves:** A TOCTOU where a stale UI approval silently authorizes a package that is no longer the one pending.
- **port effort:** Low. | **idea only:** True
## dsh.104 Process-tree quiescence before touching a locked profile

- **where:** packages/boot/plugin-manager/src/run-tree.ts:1-77
- **what:** After terminating a pnpm run, the caller polls the whole process GROUP every 15ms up to 5s before it restores and unlocks the profile — "so the caller restores and unlocks the profile only after the scripts it started stopped writing".
- **how:** `leadsOwnGroup()` — a run that captures output is spawned as its own POSIX group leader (tree terminated as a unit); one that inherits the caller's descriptors keeps the caller's group so an interrupt still reaches it.
- **solves:** A killed install whose orphaned grandchildren still write into a profile you just unlocked.
- **port effort:** Low. | **idea only:** True
## dsh.105 Startup diagnostics written owner-only, with a self-warning header

- **where:** apps/cli/src/startup-diagnostics.ts:1-70
- **what:** A failed boot writes a full `inspect(...)` dump to `$DSH_HOME/logs/startup-<ts>-<uuid>.log` with `mkdir(mode 0o700)` + `writeFile(flag:'wx', mode:0o600)`. The report itself begins "WARNING: Raw diagnostics may contain configuration or credential values from plugin errors." If the save fails, the FULL report is printed to stderr rather than a claimed path.
- **how:** `inspect` with `depth:null, maxArrayLength:null, maxStringLength:null, showHidden:true, customInspect:false, getters:false, colors:false`.
- **solves:** Unbounded default `inspect` truncation destroying exactly the deep config error you need — and a silently swallowed write making a boot failure undiagnosable.
- **port effort:** Low. | **idea only:** True
## dsh.106 Total error-normalization fallback

- **where:** packages/core/tools/src/index.ts:625-640
- **what:** `errorMessage()` wraps `instanceof`, property access, AND string coercion in try/catch and returns `'<unprintable thrown value>'`. A hostile thrown value can trap a getter; normalization is the outermost safety boundary, so its own fallback must be total.
- **how:** Also `errorInfo()` is try/caught, and `materializePresentation()` deep-freezes a detached snapshot or rejects lossy data.
- **solves:** A malformed thrown object crashing the process from inside a catch block.
- **port effort:** Trivial — a few lines. | **idea only:** True
## dsh.107 TLS-PSK authentication for forwarded SSH streams

- **where:** packages/ssh/ssh/src/stream-security.ts:1-47
- **what:** Forwarded sockets are authenticated with certificate-free TLS-PSK (`PSK-AES256-GCM-SHA384`, TLSv1.2 pinned as both min and max, `rejectUnauthorized:true`), using a per-stream 256-bit capability key; `disableRenegotiation()` on connect, with an explicit auth timeout. The key is never transmitted as data.
- **how:** `pskCallback: () => ({psk: Buffer.from(capability,'hex'), identity:'dsh-stream'})`; `checkServerIdentity: () => undefined` because PSK proves peer identity without X.509.
- **solves:** A remote pathname replaced by an attacker on the SSH host would otherwise receive the forwarded stream unauthenticated.
- **port effort:** Medium — the PSK handshake is small; key derivation/distribution across the SSH boundary is the real work. | **idea only:** False
## dsh.108 Bounded, offset-honest output retention with spill

- **where:** packages/util/output-retention/src/index.ts:1-260; packages/jobs/jobs-local/src/ring.ts; packages/spill/spill-policy/src/{index,retention}.ts
- **what:** A shared retention library bounds model-facing tool output by BYTES (not chars/lines), supports head/tail/both strategies, and reports `omittedBytes` so the model knows how much was dropped. Jobs back this with a bounded ring (256 KiB live / 16 KiB settled) plus a host spill file for the complete stream.
- **how:** `utf8Tail()` advances past continuation bytes so a truncated tail never starts mid-codepoint; `JobSourceRead.lossy` tells the model its cursor slid out of the retained window.
- **solves:** Silent output truncation (the model reasons about output it cannot see) and unbounded memory/disk from a chatty command.
- **port effort:** Medium — the byte-counting correctness is the reusable part. | **idea only:** False
## dsh.109 Config resolution with lazy `!!js` expressions and volatile-value tracking

- **where:** vendor/README.md entries 15, 18, 22 (the local-patch ledger); packages/boot/config-editor/src/index.ts; packages/settings/settings/src/index.ts:323-330
- **what:** Config is layered: empty profile root + each bundle's `cordis.patch.yml` + the profile's + home-level patch lists + `--patch` overlays, all as SIBLING patch lists at one include level (patches never cross an include boundary). `!!js` expressions evaluate against the loader context at every mount decision, and `disabled` is interpolated. Volatile fields (references, e.g. `{}` service instances) are tracked separately so a volatile-only change does not remount the plugin.
- **how:** `Entry.update` compares raw options strictly; for a config-only change on an active fiber it calls `equalExceptVolatile`, which narrows the Standard Schema to schemastery's `Schema` and recursively skips volatile paths using schema metadata without executing config hooks.
- **solves:** Makes "which config actually won" a first-class, inspectable artifact rather than emergent behaviour — which is also what makes the `.env` denylist enforceable.
- **port effort:** High — this is vendored-framework surgery, not application code. Port the DISCIPLINE (single declarative composition, patches as a separate layer, `--dump-config`), not the mechanism. | **idea only:** True

