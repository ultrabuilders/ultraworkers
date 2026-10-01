# Changelog

## [Unreleased]

### Fixed

- `ConversationStreamOptions.transport` now resolves. `@oh-my-pi/pi-ai` exports no `Transport`, so
  the option's type did not exist for anyone compiling against this package; it now uses pi's
  exact transport union (`sse` / `websocket` / `websocket-cached` / `auto`).

- `ConversationConfigState.thinkingLevel` now resolves against omp's own thinking ladder. The type
  was imported from a module that does not export it, and omp's ladder is `Effort` (`minimal`
  through `max`) rather than pi's `ThinkingLevel`, so the two spellings did not meet.

- Retry decisions during generation now use `@oh-my-pi/pi-ai`'s own
  `isRetryableAssistantMessage` instead of pi's `isRetryableAssistantError`, which omp renamed.
  The two carry the same contract — a turn that ended `stop`, `length`, `toolUse` or `aborted` is
  not a failure and is never replayed — so retries are classified by omp's implementation rather
  than a second copy of the rules.

- `isRetryableAssistantMessage` is now reachable from the `@oh-my-pi/pi-ai` package root. The
  barrel re-exported `./error/rate-limit` but not `./error/retryable`, so the message-level retry
  helpers were unreachable to consumers even though the module exported them.

### Known

- This package does not typecheck yet: 12 errors remain, in three groups whose resolution is a
  decision rather than a port. Reproduce with `bun run check:types` in this package.

  - **`SystemMessage` (5)** — `src/harness/prompt.ts:2` imports it from `@oh-my-pi/pi-ai`, which
    does not export it, and the four follow-on errors at `prompt.ts:11,11,12,14` come from that.
    omp's `Message` union is `User | Developer | Assistant | ToolResult`; there is no system role,
    and `DeveloperMessage` carries no `sections`. The section messages this package writes reach
    the provider unfiltered — `src/harness/context.ts:91` pushes every `entry.model` message into
    the `Message[]` handed to `streamSimple` — so retargeting them at `DeveloperMessage` would
    compile and then silently stop replaying sections.

  - **`Models` (3)** — `src/harness/scheduler.ts:3`, `src/harness/types.ts:3`, `src/types.ts:3`.
    The type is used as a field type, but four methods are called on it in
    `src/harness/generation.ts` (`getModel`, `streamSimple`, `fetchDeferred`, `cancelDeferred`);
    omp's `ModelManager` exposes only `refresh`, and the two `*Deferred` methods exist nowhere in
    the workspace.

  - **`deferred` (4)** — `src/harness/context.ts:8` and `src/harness/generation.ts:237,238`.
    `StopReason` in `@oh-my-pi/pi-wire` has no `"deferred"` member and `AssistantMessage` has no
    `deferred` property.