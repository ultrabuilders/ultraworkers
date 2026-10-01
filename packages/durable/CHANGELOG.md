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

   Measured against both sides rather than inferred: every symbol below **exists in `pi-ref` and
   exists nowhere in omp**. This package was ported against pi's model-service API, and omp has
   never carried that subsystem.

   - **`SystemMessage` (5)** — `src/harness/prompt.ts:2`, with follow-ons at `:11,11,12,14`.
     The role itself is only a rename: pi has `SystemMessage` in its `Message` union
     (`pi-ref/packages/ai/src/types.ts:610`) and omp calls the same slot `DeveloperMessage`. What
     is missing is the payload. pi's `SystemMessage` carries `sections`, `toolsAdded` and
     `toolsRemoved`; omp's `DeveloperMessage` carries none of the three, under any name.

      Retargeting the role alone would compile and then do nothing useful: `replaySections`
      (`prompt.ts:9-18`) tests `message.sections`, which is `undefined` on every omp message, so it
      would return an empty map and durable would stop replaying prompt sections — silently, at
      runtime, with the types satisfied. That is why the role rename was not applied as a fix.

   - **`Models` (3)** — `src/harness/scheduler.ts:3`, `src/harness/types.ts:3`, `src/types.ts:3`.
     pi declares it as an experimental service (`pi-ref/.../experimental/services/models.ts:26`).
     Four methods are called on it here (`getModel`, `streamSimple`, `fetchDeferred`,
     `cancelDeferred`); omp's `ModelManager` exposes `refresh` and none of those. The two
     `*Deferred` methods have no occurrence anywhere in the workspace. Note `Models` in omp is an
     unrelated CLI command class — a colliding basename, not this symbol.

   - **`deferred` (4)** — `src/harness/context.ts:8`, `src/harness/generation.ts:237,238`.
     `StopReason` in `@oh-my-pi/pi-wire` has no `"deferred"` member and `AssistantMessage` has no
     `deferred` property. This is the same missing subsystem as the group above: deferred
     generation is a pi feature, not a rename.
