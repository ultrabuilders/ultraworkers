// The selector is passed to the worker as argv, so it is a wire value: the
// product owns its spelling and this fixture only chooses which one to request.
import { COMPUTER_WORKER_ARG } from "../../src/cli/worker-selectors";

const worker = new Worker(new URL("../../src/cli.ts", import.meta.url).href, {
	type: "module",
	argv: [COMPUTER_WORKER_ARG],
});
const response = Promise.withResolvers<unknown>();
worker.addEventListener("message", event => {
	if (event.data?.type === "pong" && event.data.id === "computer-cli-selector") response.resolve(event.data);
});
worker.addEventListener("error", event => response.reject(event.error ?? new Error(event.message)));
worker.postMessage({ type: "ping", id: "computer-cli-selector" });
try {
	process.stdout.write(`${JSON.stringify(await response.promise)}\n`);
} finally {
	worker.terminate();
}
