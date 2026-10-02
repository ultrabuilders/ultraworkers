# Changelog

## [Unreleased]

### Fixed

- `HarnessOptions.models` no longer names a type that does not exist. durable called `getModel` and
  `streamSimple` through pi's experimental `Models` service, which `@oh-my-pi/pi-ai` never exported.
  The import resolved to an *error type*, and member accesses on an error type are not reported —
  so **nothing on that seam was ever typechecked**. It is now declared as `ModelLookup`, a
  two-method interface carrying the real shapes: a `getModel` that returns `Model | undefined`, and
  `streamSimple` returning pi's own `AssistantMessageEventStream`. Declaring the seam is also what
  brought the three defects recorded under **Known** into view.

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

   - **`Models` — the import is resolved; three of its four methods are not.**
     `src/harness/scheduler.ts:3`, `src/harness/types.ts:3` and `src/types.ts:3` imported pi's
     experimental `Models` service (`pi-ref/.../experimental/services/models.ts:26`), which omp
     never carried. That import error masked everything behind it: as an error type it made every
     access unchecked, so the three defects below were invisible rather than absent. `ModelLookup`
     now declares the two methods that have a real counterpart in omp and leaves the `deferred`
     pair out on purpose — declaring them would publish half of a feature that is still an open
     decision, and a later "no" would force the seam to give back part of its surface.

     Three errors surfaced once the seam was declared:

     - `getModel` — resolved. `ModelLookup.getModel` returns `Model | undefined`, which is what
       `generation.ts:119` branches on via `failNoModel`. omp's `ModelManager` cannot supply this:
       it exposes `refresh` and no per-id lookup.
     - `fetchDeferred` / `cancelDeferred` (2) — `src/harness/generation.ts:122` and `:132`. Both
       have **no occurrence anywhere in the workspace**; deferred generation is a pi feature, not a
       rename. Left out of the seam pending that decision.
     - `streamSimple` (1) — `src/harness/generation.ts:208`. The method now resolves to pi's own
       `AssistantMessageEventStream`, but the call passes `{ messages: [...] }` as its second
       argument where omp's `streamSimple` takes a chord `Context` — which is
       `{ abortSignal, value, toString }` and has no `messages`. The call is wired to a signature
       that does not exist on this side; the port, not the seam, needs to change.

   - **`deferred` (4)** — `src/harness/context.ts:8`, `src/harness/generation.ts:237,238`.
     `StopReason` in `@oh-my-pi/pi-wire` has no `"deferred"` member and `AssistantMessage` has no
     `deferred` property. This is the same missing subsystem as the group above: deferred
     generation is a pi feature, not a rename.
