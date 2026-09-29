# cc — chunk 6/6 (1 năng lực)

## cc.111 Hook config resolved across all editable settings sources with an explicit priority table

- **where:** src/utils/hooks/hooksSettings.ts:102-260, src/utils/hooks/hooksConfigManager.ts:1-400
- **what:** Hook discovery walks every editable settings source, reads `hooks` per file, and tags each hook with its `source`. A separate `sourcePriority` map is built by reducing over the canonical `SOURCES` order so hooks from different files can be sorted deterministically, and there are three display-string helpers (inline / header / description) that special-case plugin hooks by their full repo path.
- **how:** `groupHooksByEventAndMatcher` then `getSortedMatchersForEvent` then `getHooksForMatcher` — a three-level narrowing so a PreToolUse matcher only pays for the hooks that can match. `AsyncHookRegistry` (309 LOC) tracks in-flight async hooks separately from synchronous ones.
- **solves:** Hooks are the extension point a cloned repository can most easily abuse, so their provenance has to be visible to the user at decision time. Carrying `source` on every hook and exposing it in three display contexts is what makes 'this allow came from a repo I just cloned' answerable.
- **port effort:** medium — the source-tagging is trivial; the matcher narrowing and async tracking are the substance. | **idea only:** True

