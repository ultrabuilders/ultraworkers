/**
 * Keep the TUI's keybindings in step with an applied config reload.
 *
 * `Settings.#configWatchTargets` watches `<agentDir>/keybindings.yml` and
 * `.yaml`, so a rebind arrives as an ordinary config-reload pass. But `Settings`
 * is a config layer: it owns the watch and knows nothing about keybindings, which
 * live in `packages/tui`. Without a bridge the pass runs, the apply succeeds, and
 * the key the user just changed still does the old thing — a watcher that fires
 * and changes nothing observable, which is the failure `reload-observer.ts`
 * documents as what a seam with no caller looks like from the inside.
 *
 * The bridge is its own module for the same reason `reload-observer.ts` is not on
 * `Settings`: the dependency runs config → TUI, and putting it on the config class
 * would invert it. It takes the manager rather than building one, so the owner
 * decides the lifetime and this only decides when to re-read.
 *
 * **Scoped to keybinding sources on purpose.** A `config.yml` reload has no
 * keybindings to re-read, and `reload()` re-merges from disk — so reacting to every
 * pass would mean re-reading files, and re-deriving conflicts already reported at
 * startup, on every unrelated edit.
 */
import * as path from "node:path";
import { KEYBINDINGS_YAML, KEYBINDINGS_YML, type KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
import { onAfterConfigReload } from "../config/reload-observer";

/**
 * Built from the loader's exported names, never spelled out here. A second copy
 * of a filename is a file that can drift: rename the loader to `.yaml` and a
 * hand-written list keeps firing on a path nothing opens.
 */
const KEYBINDING_FILENAMES: ReadonlySet<string> = new Set([KEYBINDINGS_YML, KEYBINDINGS_YAML]);

/**
 * Re-read `manager` when an applied config reload was caused by a keybindings file.
 *
 * Returns the unregister function. Callers own it rather than letting it live to
 * process exit: `InteractiveMode.stop()` clears its initialized flag, so a later
 * `init()` re-registers, and two live handlers would reload every rebind twice.
 */
export function bindKeybindingsToConfigReload(manager: KeybindingsManager): () => void {
	return onAfterConfigReload(info => {
		if (info.sources.some(source => KEYBINDING_FILENAMES.has(path.basename(source)))) {
			manager.reload();
		}
	});
}
