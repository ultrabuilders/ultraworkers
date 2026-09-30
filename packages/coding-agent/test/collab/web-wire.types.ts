// TYPE-ONLY conformance between the shared wire package and the collab host.
//
// No `expect`, no runtime assertion, no source-grep: this is a compile-time
// guarantee, so it is enforced by `tsgo` (via `bun run check:ts`), not by
// `bun test`. This file is deliberately NOT named `*.test.ts` — the runner only
// collects `*.test.ts`, and `packages/coding-agent/tsconfig.json` includes
// `test`, so tsgo type-checks this file while `bun test` never loads it.
import type { CollabFrame } from "../../src/collab/protocol";
import type { WireFrame } from "@oh-my-pi/pi-wire";

type Assignable<From, To> = [From] extends [To] ? true : false;
type Expect<T extends true> = T;
type Discriminant<F> = F extends { t: infer T } ? T : never;

type WireT = Discriminant<WireFrame>;
type CollabT = Discriminant<CollabFrame>;

/**
 * CONTRACT: every frame discriminant declared by the wire package has a
 * matching host-side variant. This is the direction that has teeth — it goes
 * red when a frame is added to `packages/wire` that the host never emits, and
 * red when the host renames a `t` out from under it.
 *
 * Deliberately NOT asserted: payload-level assignability in either direction.
 * The two sides carry deliberately different `event` unions, and
 * `packages/wire/src/index.ts` states the design in its own header: the unions
 * "cover only the variants this client renders; consumers cast at the JSON
 * boundary and every `switch` keeps a tolerant `default:` branch". Asserting
 * payload assignability would fight that design.
 *
 * The reverse direction (`CollabT ⊆ WireT`) is not asserted either: the host is
 * allowed to emit a variant a browser client has not learned to render yet.
 */
export type WireCoveredByHost = Expect<Assignable<WireT, CollabT>>;
