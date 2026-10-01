import type { Context } from "@oh-my-pi/chord";
import { NodeExecutionEnv } from "../../env/node";
import { JsonlStorage, type JsonlStorageOptions } from "./storage";

/** Open or create a JSONL storage directory using the local Node filesystem. */
export async function openNodeJsonlStorage(
	directory: string,
	context: Context,
	options: JsonlStorageOptions = {},
): Promise<JsonlStorage> {
	return JsonlStorage.open(directory, new NodeExecutionEnv({ cwd: process.cwd() }), context, options);
}

export { JsonlStorage, type JsonlStorageOptions } from "./storage";
