/**
 * Project trust: has the user agreed that code in *this* directory may run?
 *
 * ## What this replaces
 *
 * `isProjectTrusted()` used to be the literal `() => true` at both call sites
 * (`extensions/runner.ts`, `session/agent-session.ts`), and `CHANGELOG.md`
 * documented that as deliberate. It was not a gate; it was a shim that told
 * upstream Pi extensions they were running in a trusted project when ultraworkers had no
 * opinion. The failure mode is the one the shipped docs already named: clone a
 * repository containing `.omp/plugins/installed_plugins.json` and its
 * project-scoped extension modules load and run with no prompt, while a reader
 * of the API cannot tell that from a real decision.
 *
 * ## Why one mechanism and not four
 *
 * Upstream Pi spreads this across four surfaces with four read paths for one
 * question. Here it is three primitives in one module: resolve the decision,
 * say what the decision blocks, and assert. A second read path is how the two
 * call sites drifted apart in the first place — one returning `true` while the
 * other returned something real would be a silent failure — so there is exactly
 * one function to call.
 *
 * ## Why the decision is three-valued
 *
 * A boolean cannot say "nobody has decided". Defaulting an undecided directory
 * to trusted is the status quo this replaces; defaulting it to untrusted
 * switches off project extensions on every existing install with no way to turn
 * them back on, which is the upgrade hazard the hook-trust module refused to
 * take (`extensibility/hooks/trust.ts`). So `undecided` is a real state the gate
 * resolves, rather than a value coerced at the boundary.
 *
 * ## What is not gated here
 *
 * User-scope extensions and the user's own agent directory are the user's own
 * code, not project input, and are out of scope by construction. What is in
 * scope is whatever arrives *with a directory*: `.omp/extensions`, and
 * project-scoped plugin entries whose `installPath` points into the tree. The
 * list is a decision recorded in `docs/extension-trust-model.md`; it is
 * deliberately a closed list, because a gate over an open-ended "things a
 * directory can contain" is a gate whose coverage nobody can state, and
 * `assertTrusted` needs a resource it can name in the error.
 */
import * as path from "node:path";
import { getProjectAgentDir } from "@oh-my-pi/pi-utils";
import { register } from "./registry";
import { settings, type Settings } from "./settings";

/**
 * The decision for a directory.
 *
 * - `yes` — the user trusted this project; project-scoped code may load.
 * - `no` — the user refused it.
 * - `undecided` — nobody has answered for this project yet.
 */
export type ProjectTrust = "yes" | "no" | "undecided";

/**
 * A project-scoped resource, named by the surface it arrived through.
 *
 * The enumeration the trust decision applies to.
 */
export const PROJECT_TRUSTED_RESOURCES = ["extensions", "plugins", "settings", "skills"] as const;

export type ProjectTrustResource = (typeof PROJECT_TRUSTED_RESOURCES)[number];

/** Raised when a consumer uses a resource the project's decision refuses. */
export class ProjectTrustError extends Error {
	readonly resource: ProjectTrustResource;
	readonly trust: ProjectTrust;

	constructor(resource: ProjectTrustResource, trust: ProjectTrust) {
		super(
			trust === "undecided"
				? `Refusing to load project ${resource}: this project has no trust decision. Set one to load it.`
				: `Refusing to load project ${resource}: this project is not trusted.`,
		);
		this.name = "ProjectTrustError";
		this.resource = resource;
		this.trust = trust;
	}
}

const UNDECIDED: ProjectTrust = "undecided";

/**
 * The recorded decision, `undecided` when absent.
 *
 * A record setting beside the config rather than a side file, for the reason
 * `config/hook-settings.ts` gives: it inherits the layering, normalisation and
 * `flush()` every other setting already has, and a user who wants to know why
 * their project extension did not load finds the answer in the `config.yml`
 * they already read.
 */
export const cfgProjectTrust = register({
	id: "projectTrust",
	type: "enum",
	values: ["yes", "no", "undecided"] as const,
	default: UNDECIDED,
	ui: {
		tab: "tools",
		group: "Trust",
		label: "Project Trust",
		description: "Your standing decision about code shipped inside this directory",
		// These strings state what actually happens, which is deliberately less than
		// what they used to promise. They said "is refused" for `no` and "Ask" for
		// `undecided` — and neither was true: no load path consults
		// `isProjectTrustedForScope`, so nothing refuses and nothing asks. A user who
		// read "Not trusted" and closed the panel believed project extensions were
		// blocked; they loaded, silently. That is the worst outcome a control panel
		// can produce, and it is worse than an inert setting, because it is an inert
		// setting that says it is not.
		//
		// `docs/extension-trust-model.md` records the decision this follows: the
		// decision is stored and surfaced, and nothing enforces it yet. When a load
		// path starts calling `assertTrusted`, these strings become the place that
		// has to change back — and the ADR is the thing to check first, because a
		// gate landing is a reversal of it, not a completion of it.
		options: [
			{ value: "yes", label: "Trusted", description: "Project-scoped extensions and plugins may load" },
			{
				value: "no",
				label: "Not trusted",
				description:
					"Records that you do not trust this project. Nothing enforces it yet — project-scoped code still loads.",
			},
			{
				value: "undecided",
				label: "Undecided",
				description: "No decision recorded. Project-scoped code loads the same as for any other answer today.",
			},
		],
	},
});

/**
 * The decision for the project this scope is bound to.
 *
 * No `cwd` parameter: a `Settings` instance is already constructed for one
 * directory, and the project layer it reads is resolved from that. Taking a
 * `cwd` here and ignoring it would let a caller believe it had asked about a
 * different directory than the one it did — the exact drift this module exists
 * to prevent.
 *
 * Two loads with a re-check at the consumer, because a directory can change its
 * mind between load and use: resolving once at startup and caching for the
 * session would let a project trusted at launch be edited before something reads
 * it. So this reads the record on every call rather than memoising, and consumers
 * call it at the point of use.
 */
export function resolveProjectTrust(scope: Settings = settings): ProjectTrust {
	const value = cfgProjectTrust.get(scope);
	// Narrow rather than cast: the record is read from a file a user can edit, so
	// a value outside the declared set is reachable at runtime even though the
	// setting's type says it cannot be. An unrecognised answer is `undecided`,
	// which refuses — the same direction as a missing one.
	return value === "yes" || value === "no" ? value : UNDECIDED;
}

/**
 * Whether the decision permits loading at all.
 *
 * Deliberately takes no `resource`: every listed resource is governed by the
 * same decision, so a per-resource parameter would imply a granularity that does
 * not exist — and the next reader would build on it. A resource becomes an input
 * here when a decision actually differentiates it, and the type change that
 * requires is the honest way to introduce one.
 */
export function isResourceTrusted(trust: ProjectTrust): boolean {
	return trust === "yes";
}

/**
 * Whether `scope`'s project is trusted, for the `isProjectTrusted()` callback.
 *
 * Takes `Settings | undefined` because that is what both call sites hold, and
 * answers `false` when there is none. The module-level `settings` proxy throws
 * when no instance has been initialised, so reading it unguarded would turn a
 * missing settings layer into a crash inside an extension's event handler —
 * which is the same `ctx.isProjectTrusted is not a function` class of failure
 * issue #7955 was raised about, reached by a different route.
 */
export function isProjectTrustedForScope(scope: Settings | undefined): boolean {
	if (!scope) return false;
	try {
		return resolveProjectTrust(scope) === "yes";
	} catch {
		// A settings layer that cannot answer is not a trusted project. Reporting
		// the failure as "undecided" is the conservative direction; swallowing a
		// genuine read error and calling it trusted would not be.
		return false;
	}
}

/**
 * Throw unless `resource` may load in this project.
 *
 * The consumer-side re-check: it reads the decision again rather than trusting a
 * value captured earlier, so a decision made after load applies to something
 * that has not run yet.
 */
export function assertTrusted(resource: ProjectTrustResource, scope: Settings = settings): void {
	const trust = resolveProjectTrust(scope);
	if (!isResourceTrusted(trust)) throw new ProjectTrustError(resource, trust);
}

/**
 * Record a decision, returning whether anything changed.
 *
 * `Settings.set` schedules a debounced write, the same contract
 * `recordHookHash` documents; a caller that must survive process exit flushes
 * through the ordinary settings flush.
 */
export function setProjectTrust(trust: ProjectTrust, scope: Settings = settings): boolean {
	if (resolveProjectTrust(scope) === trust) return false;
	cfgProjectTrust.set(scope, trust);
	return true;
}

/** The file a user edits by hand, named so an error can point at it. */
export function projectTrustFilePath(cwd: string): string {
	return path.join(getProjectAgentDir(cwd), "config.yml");
}
