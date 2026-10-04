/**
 * Brand identity — the values a user SEES, in a module nothing else may pull in.
 *
 * This module exists because display identity and path identity were welded into
 * one file. `APP_NAME` lived in `dirs.ts`, which imports `node:fs`, `node:os`,
 * `node:path` and `@oh-my-pi/pi-natives/path`. That is fine for a CLI and fatal
 * for anything bundled for a browser: a page that wants to print the product name
 * has to import the module that resolves where state lives, dragging every Node
 * builtin into the client with it.
 *
 * So the value moved here, and `dirs.ts` re-exports it. There is still exactly ONE
 * definition — this file — and every existing `@oh-my-pi/pi-utils` consumer keeps
 * resolving `APP_NAME` unchanged. What is new is that a browser can reach the value
 * without reaching the filesystem: import `@oh-my-pi/pi-utils/brand`, never the
 * barrel.
 *
 * Keep this module free of imports. A single `node:fs` here would defeat the entire
 * reason it exists, and nothing would fail loudly — the bundler would just quietly
 * resolve it in Node and the browser build would break much later, far from here.
 */

/**
 * Display name of the app: what the user sees in help text, `process.title`,
 * notification titles and log filenames.
 *
 * Deliberately NOT where state lives. The config root is resolved through
 * `CONFIG_DIR_CANDIDATES` and `XDG_CONFIG_DIR_CANDIDATES` in `dirs.ts`, both frozen
 * lists that already carry the old spelling for migration — so flipping this value
 * moves the app's identity without moving a single byte of user data. Keep it that
 * way: nothing that decides *where to store* may read this.
 */
export const APP_NAME: string = "ultraworkers";
