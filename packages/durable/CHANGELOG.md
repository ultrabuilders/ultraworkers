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
  decision rather than a port. `SystemMessage` (5) — omp's `Message` union has no system role and
  `DeveloperMessage` carries no `sections`, so the named prompt sections this package writes into
  context have no representation on the receiving side. `Models` (3) and `deferred` (4) — omp has
  no deferred or resumable stream, so `fetchDeferred` / `cancelDeferred` do not exist.