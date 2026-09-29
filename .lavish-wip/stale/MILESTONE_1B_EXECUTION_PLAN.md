# Neo sai trong MILESTONE_1B_EXECUTION_PLAN — 84 mục

Mỗi mục: `cited` (những gì tài liệu đang ghi) và `actual` (chỗ thật, đã đo).
Sửa CHỈ phần `đường/dẫn:số-dòng`. Giữ nguyên mọi văn xuôi quanh nó.

## S1
- **work item:** ## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)
- **cited:** packages/chord/test/delta-tracker/retention.test.ts:81
- **actual:** packages/chord/test/delta-tracker/retention.test.ts:1 (import node:child_process), :24 (spawnSync call), :26 (worker specifier with .ts), :29-30 (child.error / child.status assertions)

## S2
- **work item:** ## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)
- **cited:** packages/coding-agent/src/session/agent-session.ts:4983
- **actual:** packages/coding-agent/src/session/agent-session.ts:5104

## S3
- **work item:** ## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)
- **cited:** packages/coding-agent/src/session/agent-session.ts:5218
- **actual:** packages/coding-agent/src/session/agent-session.ts:5346

## S4
- **work item:** ## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1347
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:1376

## S5
- **work item:** ## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)
- **cited:** packages/ai/src/types.ts:1476
- **actual:** packages/ai/src/types.ts:1465

## S6
- **work item:** ## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)
- **cited:** packages/coding-agent/src/eval/judgment-bridge.ts:47
- **actual:** packages/coding-agent/src/eval/judgment-bridge.ts:53

## S7
- **work item:** ## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)
- **cited:** packages/ai/src/providers/cursor.ts:4643
- **actual:** packages/ai/src/providers/cursor.ts:4681

## S8
- **work item:** ## 1. `chord` — tầng runtime composition (ĐÍNH CHÍNH LẦM: nó KHÔNG phải cơ chế vòng đời extension)
- **cited:** bun.lock:1455
- **actual:** bun.lock:1440

## S9
- **work item:** ## 2. protocol
- **cited:** packages/protocol/src/protocol.ts:16 — "dòng 16 return Check(ServerIdSchema, value);" (row for src/protocol.ts item (d), and step 4 "packages/protocol/src/protocol.ts:1-3, :16")
- **actual:** line 16 is blank; the Check call is at line 18

## S10
- **work item:** ## 2. protocol
- **cited:** packages/protocol/src/protocol.ts:20 — "(export type ProtocolError — một hình dữ liệu)" in the ProtocolError/ProtocolValidationError collision row
- **actual:** line 20 is blank; ProtocolError is defined at line 26

## S11
- **work item:** ## 2. protocol
- **cited:** packages/protocol/src/codec.ts:11 — "(export class ProtocolValidationError)" in the ProtocolError/ProtocolValidationError collision row
- **actual:** line 11 is `} from "./protocol.ts";`

## S12
- **work item:** ## 2. protocol
- **cited:** packages/protocol/src/codec.ts:25 — "export function parseServerMessage(value: unknown): ServerMessage" in the parseServerMessage collision row
- **actual:** line 25 is `}`; the function is at line 27

## S13
- **work item:** ## 2. protocol
- **cited:** packages/protocol/src/framing.ts:29 — "encodeFrame(payload: Uint8Array): Uint8Array, prefix dài 4 byte BE" in the encodeFrame collision row
- **actual:** line 29 is the guard `if (!(payload instanceof Uint8Array)) throw new TypeError(...)`

## S14
- **work item:** ## 2. protocol
- **cited:** packages/protocol/src/cbor/options.ts:24 — "CborError (cbor/options.ts:24)" in the ProtocolError/ProtocolValidationError collision row
- **actual:** line 24 is blank

## S15
- **work item:** ## 2. protocol
- **cited:** packages/protocol/src/cbor/options.ts:29 — "Codec chung và attestation decode bằng text decoder KHÁC NHAU — fatal: true, ignoreBOM: true (cbor/options.ts:29)"
- **actual:** line 29 is `}` closing the CborError class

## S16
- **work item:** ## 2. protocol
- **cited:** packages/ai/src/providers/cursor.ts:889 — "log("error", "parseServerMessage", { error: String(e) }), một nhãn log" in the parseServerMessage collision row
- **actual:** line 889 is `sawTurnEnded = true;`

## S17
- **work item:** ## 2. protocol
- **cited:** packages/omptype/src/typebox.ts:121-141 — "Type.Integer với minimum (:121-141)" in the Dependency new table and the Cần người quyết section
- **actual:** line 121 is `export type TObject<...>` and line 141 is `type CompatRuntime<T> = ...`

## S18
- **work item:** ## 2. protocol
- **cited:** Step 4 / row for src/protocol.ts: "(b) dòng 2 import Type, { type Static } from "typebox"; → from "@oh-my-pi/omptype/typebox""
- **actual:** packages/omptype/src/typebox.ts:545 is `export default { Type };` — the default export is an object, not the builder, so a default import yields Type = { Type: {...} }

## S19
- **work item:** ## 2. protocol
- **cited:** Step 4 and Cần người quyết: "generic StrictObject ở protocol.ts:10 là construct DUY NHẤT chưa xác minh tương thích với omptype"
- **actual:** StrictObject at protocol.ts:9-10 typechecks clean under omptype; the plan has identified the wrong line as the risk

## S20
- **work item:** ## 2. protocol
- **cited:** LICENSE row and step 2: "File ra 22 dòng (dòng cuối không có newline), 1.143 byte"
- **actual:** constructed the LICENSE and measured 1143 bytes / 23 lines. wire and omptype LICENSE are 22 lines because they carry only 2 copyright lines; adding Mario Zechner's makes 3 → 23

## S21
- **work item:** ## 2. protocol
- **cited:** package.json row and step 8: "version → catalog 18.3.3" (stated twice)
- **actual:** root package.json workspaces.catalog pins every @oh-my-pi/* at 18.4.0

## S22
- **work item:** ## 2. protocol
- **cited:** Step 9: "Thêm ... cạnh 11 mục @oh-my-pi/* hiện có"
- **actual:** 12 @oh-my-pi/* entries in workspaces.catalog

## S23
- **work item:** ## 2. protocol
- **cited:** vitest collision row: "2697 file dưới packages/ import từ bun:test"
- **actual:** 2682 files

## S24
- **work item:** ## 2. protocol
- **cited:** ProtocolError/ProtocolValidationError collision row: "grep toàn packages: 0 lần ProtocolError / ProtocolValidationError / FrameError / CborError"
- **actual:** 1 hit, in packages/coding-agent/src/eval/py/runner.py:2246 and :2256 (a Python docstring and an ename string)

## S25
- **work item:** ## 2. protocol
- **cited:** Cần người quyết #2: "pi upstream ... export cái trước [isJsonValue] từ root index nhưng không export cái sau [JsonValue]. Sự bất đối xứng đó đáng giải quyết một lần"
- **actual:** chord/src/index.ts:14 exports isJsonValue AND line 60 exports JsonValue (in an export type block)

## S26
- **work item:** ## 2. protocol
- **cited:** Test contract: "rejects non-JSON opaque payloads (số không finite, byte array, undefined, prototype, cycle)"
- **actual:** 4 cases; the __proto__ coverage lives in cbor.test.ts:74, a different file and layer

## S27
- **work item:** ## 2. protocol
- **cited:** attestation.ts collision row: "packages/coding-agent/src/live/attestation.ts:11-37"
- **actual:** the CBOR helper region; cborHeader at :12, cborUnsigned :31, cborText :35, cborMap :40

## S28
- **work item:** ## 2. protocol
- **cited:** src/index.ts row and step 6: "Danh sách named export từ ./protocol.ts (dòng 3-22)"
- **actual:** line 3 is `export * from "./framing.ts";`; the `export {` block opens at line 4

## S29
- **work item:** ## 2. protocol
- **cited:** cbor.test.ts row: knownVectors "gồm ... text surrogate đơn so với ghép cặp"
- **actual:** knownVectors (:23-58) contains the paired surrogate ["𐅑", "64f0908591"]; the lone-surrogate rejection is at cbor.test.ts:109

## S30
- **work item:** ## 2. protocol
- **cited:** Public surface note: "đừng DRY chúng thành một export, vì sẽ mới publish MAX_UINT32 qua export * from "./framing.ts""
- **actual:** the star export is already present at src/index.ts:3

## S31
- **work item:** ## 2. protocol
- **cited:** Dependency new table: facade "dùng trong production bởi packages/coding-agent/src/extensibility/legacy-typebox.ts và 4 file test"
- **actual:** 5 src files import @oh-my-pi/omptype/typebox (legacy-typebox.ts, custom-tools/types.ts, hooks/types.ts, extensions/types.ts, custom-commands/types.ts) plus 4 test files

## S32
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, files_to_copy row `src/server.ts`: "5 specifier `.ts` tương đối (dòng 32, 34, 35, 37, 38, 39, 40)"
- **actual:** pi-ref/packages/server/src/server.ts lines 36, 37, 38, 39, 40

## S33
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, files_to_copy row `src/session-router.ts`: "Dòng 8 dùng field `private readonly` xuyên suốt — xem bước 6"
- **actual:** pi-ref/packages/server/src/session-router.ts lines 35-41

## S34
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, files_to_copy row `test/protocol.test.ts`: quotes `import { afterEach, describe, expect, test } from "vitest"`
- **actual:** pi-ref/packages/server/test/protocol.test.ts:2 → `import { afterEach, expect, test } from "vitest";`

## S35
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, "Dependency mới" table: `@oh-my-pi/chord` 18.3.3, `@oh-my-pi/pi-protocol` 18.3.4, `@oh-my-pi/pi-agent-core` 18.3.3 "(workspace catalog)"
- **actual:** ultraworkers/package.json → workspaces.catalog: every @oh-my-pi/pi-* pin is 18.4.0 (pi-agent-core 18.4.0, pi-utils 18.4.0, pi-natives 18.4.0). chord / pi-protocol / pi-server absent (expected pre-migration).

## S36
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, collision 2 row: "packages/agent/src/index.ts chỉ export 18 module phẳng"
- **actual:** ultraworkers/packages/agent/src/index.ts — 17 `export *` lines

## S37
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3: step 11 gate list greps only `vi.`; and "Hợp đồng test" asserts "Mọi matcher `expect` upstream dùng (`toBe`, `toMatchObject`, `rejects.toThrow`, `resolves`, `toEqual`) đều tồn tại trong `bun:test`, nên không cần mổ xẻ test hành vi"
- **actual:** pi-ref/packages/server/test/conformance.test.ts lines 179, 198, 217, 218, 318, 376, 393 — 7 × `await expect.poll(() => …).toBe(…)`

## S38
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, files_to_copy row `src/types.ts` (a): "dòng 1-2: bỏ **cả hai** dòng import upstream"
- **actual:** pi-ref/packages/server/src/types.ts:2 only. Line 1 (`import type { JsonValue, ServiceCall, ServiceProviderUpdate } from "@earendil-works/chord";`) is load-bearing and must stay (scope change only).

## S39
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, public-surface note: "`Deferred` — omp không có class nào như vậy (0 match)"
- **actual:** ultraworkers/packages/: `grep -rn 'class Deferred' packages/` → 7 hits (DeferredCommandPreview, DeferredDiagnostics, DeferredMCPTool, DeferredRenderScheduler ×3, DeferredOpenWebSocket). Only the exact-name grep `class Deferred *[{<]` returns 0.

## S40
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, step 6: "87 khai báo trên 5 file" (all in src/)
- **actual:** pi-ref/packages/server/test/unix-connection.test.ts:13 → `private writeCallback?: (error?: Error | null) => void;` in class ControlledSocket

## S41
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, step 7: "9 chỗ `new Promise` trong 5 file"
- **actual:** pi-ref/packages/server/test/server.test.ts:47 → `const closed = new Promise<void>((resolve) => {`

## S42
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3, "Dependency mới" row for pi-protocol: "omp chỉ có @sinclair/typebox@0.34.52 (khai ở bun.lock:216)"
- **actual:** ultraworkers/bun.lock:216 is the range `"@sinclair/typebox": "^0.34.0"`; the resolved 0.34.52 is at bun.lock:898

## S43
- **work item:** ## 3. server
- **cited:** MILESTONE_1B_EXECUTION_PLAN.md, section 3: "cả 7 file test chuyển sang `bun:test`" and "hậu tố `.ts` bị bỏ khỏi 24 specifier tương đối trên 6 file test `.ts`"
- **actual:** Only 6 of the 7 files in pi-ref/packages/server/test/ import vitest; the 7th is fixtures/stale-socket-server.mjs, a .mjs fixture with no test case

## S44
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** packages/client/src/connection.ts:11 — va chạm dòng 1629 & bước 8(c) dòng 1648: "Rồi xoá specifier `type PromiseResolvers` khỏi import ở connection.ts:11 (dòng import đó trở thành rỗng vì promise.ts không còn tồn tại)"
- **actual:** packages/client/src/connection.ts:25 và :29 — `PromiseResolvers<ServerHello>` dùng như TYPE trong `ConnectionLifecycle` (L23-30)

## S45
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Bước 8(d) dòng 1648 & va chạm dòng 1628: "Xoá định nghĩa toError khỏi errors.ts và import nó từ @oh-my-pi/pi-utils" (chỉ nhắc errors.ts)
- **actual:** packages/client/src/client.ts:32 và packages/client/src/connection.ts:10 — cả hai import `toError` từ "./errors"; dùng tại client.ts:259,295,440 và connection.ts:154,197,222

## S46
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Cổng hoàn thành #2 dòng 1731: "cd packages/client && bun test — 25/25 test case pass (14 + 3 + 8)"
- **actual:** packages/client/test/client.test.ts = 15 test() + 2 describe(); test/unix-transport.test.ts = 4 test(); test/unix.test.ts = 8 test() + 1 describe()

## S47
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Mục Xác minh dòng 1723: "grep -rc '#handlers' packages/client/test/support.ts → 1"
- **actual:** packages/client/test/support.ts — sau khi chuyển `#`, `this.#handlers` nằm trên 10 dòng (L23,44,55,56,60,61,65,66,71,72), tổng 11 lần xuất hiện

## S48
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Bước 2 dòng 1642, bước 11 dòng 1654, Xác minh dòng 1707: "Neo: root package.json:94 (check:ts)"
- **actual:** package.json:90 — `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",`

## S49
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Mục Bề mặt công khai, dòng 1595: "`Client` là class 448 dòng với 12 member"
- **actual:** packages/client/src/client.ts — class Client spans L62 đến L445 (đếm bằng cân bằng ngoặc)

## S50
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Mục Dependency mới dòng 1614: "@oh-my-pi/chord 18.3.3 (workspace catalog, khớp mọi package khác của omp)" — và tương tự cho pi-protocol, pi-utils
- **actual:** package.json:19-29 — mọi entry trong khối `workspaces.catalog` đều là "18.4.0"

## S51
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Va chạm dòng 1635: "AuthBrokerClient (packages/ai/src/auth-broker/client.ts:129)"
- **actual:** packages/ai/src/auth-broker/client.ts:130 — `export class AuthBrokerClient {` (L129 là dòng trống)

## S52
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Va chạm dòng 1635: "AnthropicUserProfilesClient (:115)" — viết ngay sau `AnthropicMessagesClient (:191)` trong anthropic-client.ts, đọc được là cùng file
- **actual:** packages/ai/src/providers/anthropic-user-profiles.ts:115 — `export class AnthropicUserProfilesClient {`

## S53
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Bảng file dòng 1553: "Khối afterEach (L27-48) dọn socket, server và thư mục tạm" (unix-transport.test.ts)
- **actual:** packages/client/test/unix-transport.test.ts:33-47 — `afterEach(async () => {` ở L33, đóng `});` ở L47

## S54
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Bảng file dòng 1554: "afterEach tại L183+ (unix.test.ts)"
- **actual:** packages/client/test/unix.test.ts:70 — `afterEach(async () => {`

## S55
- **work item:** ## 4. client (MILESTONE_1B_EXECUTION_PLAN.md, dòng 1527–1755)
- **cited:** Bảng file dòng 1540: "rào hai hàng đợi tại L191-236" (client.ts)
- **actual:** packages/client/src/client.ts:200-205 — vòng splice phát ra queuedWireUpdates sau khi đặt hydrated = true

## S56
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/evals/src/report.ts:4 — "L4 `node:util` `styleText` → `Bun.styleText`" (repeated in the `formatEvalComparisonReport` row: "Dùng `node:util` `styleText` → `Bun.styleText`")
- **actual:** packages/evals/src/report.ts:4 — `import { styleText } from "node:util";` (the anchor is CORRECT; the prescribed change is wrong)

## S57
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/evals/src/report.ts and src/docker.ts, src/cli.ts, src/harness.ts — "`createHash` từ `node:crypto` → `Bun.hash`"
- **actual:** Call sites: packages/evals/src/report.ts:130, src/docker.ts:39, src/docker.ts:158, src/cli.ts:163, src/harness.ts:398 (plus 4 import lines) — all anchors correct

## S58
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/evals/src/report.ts — "0 chỗ `createHash` trong file này sau khi đổi import — hãy kiểm chứng"
- **actual:** packages/evals/src/report.ts:130 — `createHash("sha256").update(identity).digest("hex"),` inside persistSession

## S59
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/evals/src/cli.ts:6 — "L6 `await requireEvalAuthFile(...)` → thêm `await`"
- **actual:** packages/evals/src/cli.ts:6 is `import { buildImages, createDockerContext, discoverCases, requireEvalAuthFile, runTask } from "./docker.ts";` — the import, not a call. The real call is packages/evals/src/cli.ts:129 — `const authPath = requireEvalAuthFile(selectedModel.provider);`

## S60
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/evals/package.json:3 — "L3 name `@earendil-works/pi-evals` → `@oh-my-pi/pi-evals`"
- **actual:** packages/evals/package.json:2 — `"name": "@earendil-works/pi-evals",`. Line 3 is `"version": "0.87.1",`

## S61
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/evals/src/harness.ts:484 — `DOCUMENTATION_EVAL_TOOLS`
- **actual:** packages/evals/src/harness.ts:484 is the JSDoc `/** Documentation evals intentionally exclude shell and unrestricted network tools. */`. The const is at :485.

## S62
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/sdk.ts:495-809 (CreateAgentSessionOptions range)
- **actual:** packages/coding-agent/src/sdk.ts:498 (`export interface CreateAgentSessionOptions {`) through :821 (closing `}`)

## S63
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/sdk.ts:591 — `customTools`
- **actual:** packages/coding-agent/src/sdk.ts:603 — `customTools?: (CustomTool | ToolDefinition)[];`

## S64
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/sdk.ts:593 — `extensions`
- **actual:** packages/coding-agent/src/sdk.ts:605 — `extensions?: ExtensionFactory[];`

## S65
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/sdk.ts:501 — `agentDir?: string`
- **actual:** packages/coding-agent/src/sdk.ts:504 — `agentDir?: string;` (line 501 is a JSDoc line about `additionalDirectories`)

## S66
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/sdk.ts:692 and :694 — `toolNames` / `restrictToolNames` (cited twice, in the harness.ts table and the collision table)
- **actual:** packages/coding-agent/src/sdk.ts:704 — `toolNames?: string[];` and :706 — `restrictToolNames?: boolean;`

## S67
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/sdk.ts:1485 — `createAgentSession`
- **actual:** packages/coding-agent/src/sdk.ts:1497 — `export async function createAgentSession(options: CreateAgentSessionOptions = {}): Promise<CreateAgentSessionResult> {`. Line 1485 is a blank line inside a JSDoc usage example.

## S68
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1469 — `readStoredCredential` (omp side of the credential-leak collision)
- **actual:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1478 — `export function readStoredCredential(provider: string): AuthCredential | undefined {` followed by `const storage = AuthStorage.create(); return storage.get(provider);`

## S69
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:457 — `defineTool`
- **actual:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:458

## S70
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/session/agent-session.ts:12155 — "một getter tại ... phơi ra `session.extensionRunner`"
- **actual:** packages/coding-agent/src/session/agent-session.ts:12155 is `toggleAdvisorEnabled(): boolean {`. The actual getter is at :12342 — `get extensionRunner(): ExtensionRunner | undefined {` (private field `#extensionRunner` at :857).

## S71
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:783-790 — `BeforeAgentStartEvent.systemPrompt: string[]`
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:803-810 — `export interface BeforeAgentStartEvent {` … `systemPrompt: string[];` at :809

## S72
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1194-1198 — `BeforeAgentStartEventResult.systemPrompt?: string[]`
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1215-1219 — `export interface BeforeAgentStartEventResult {` … `systemPrompt?: string[];` at :1218

## S73
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1660 — `extensions?: ExtensionFactory[]` context / `ExtensionFactory`
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1660 is `export interface ProviderModelConfig {` — unrelated. `ExtensionFactory` is at :1685 — `export type ExtensionFactory = (pi: ExtensionAPI) => void | Promise<void>;`

## S74
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1874-1913 — `emitBeforeAgentStart`
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:1903 — `async emitBeforeAgentStart(`

## S75
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1879 — "chỉ chạy khi `hasHandlers("before_agent_start")`"
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:1908 — `if (!this.hasHandlers("before_agent_start")) return undefined;`

## S76
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/utils/src/dirs.ts:446 — `PI_CODING_AGENT_DIR` is the env var omp reads (cited twice, incl. the rename table row claiming the destination does not exist)
- **actual:** packages/utils/src/dirs.ts:446 is a JSDoc line ` *` opening the comment block. Actual env reads at :456 (`resolvePreProfileAgentDir(undefined, process.env.PI_CODING_AGENT_DIR, ...)`) and :476.

## S77
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** Rename table: "`vitest-evals` | BỎ (không có tương đương bun test) | 7"
- **actual:** 13 occurrences outside README.md, 18 including it. Breakdown: package.json ×2, src/report.ts ×2, src/harness.ts:33 (`vitest-evals/harness`), docker/entrypoint.ts:140 (`vitest-evals/reporter`), 7 files under evals/ ×1. `grep -c 'from "vitest-evals'` → 9.

## S78
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** Collision table: "13 chỗ `from 'vitest'`" (and "13 chỗ import" in the collision row)
- **actual:** 10 literal `from "vitest";` imports (4 in test/, 4 in evals/, plus vitest.test.config/harness.test accounting). The 13 figure is `from "vitest` (21) minus `from "vitest-evals` (8), so it double-counts 2× `from "vitest/config"` and 1× `from "vitest-evals/harness"`.

## S79
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** Collision table: "`packages/coding-agent/src/eval/` là 59 file (56 `.ts` + `js/shared/prelude.txt`, `py/prelude.py`, `py/runner.py`)"
- **actual:** 60 files total: 57 `.ts`, 2 `.py`, 1 `.txt`

## S80
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** Plan line 381 (global "Nguồn chép" section): "Riêng `evals` là ngoại lệ lớn (senpi **bỏ 25 file** của pi)"
- **actual:** senpi-ref/packages/evals has 25 files but is a completely DIFFERENT vitest-based package (src/docs.eval.ts, src/vitest-evals/{artifacts,setup,summary,reporter,harness-table}.ts, test/vitest-evals/*.test.ts, scripts/run-evals.mjs). It has no docker/, no report.ts, no plan.ts.

## S81
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** docker/entrypoint.ts:31 — "khẳng định `npm-shrinkwrap.json`"
- **actual:** packages/evals/docker/entrypoint.ts:32 — `for (const name of ["package.json", "npm-shrinkwrap.json", "dist/index.js"]) {`. Line 31 is the `const codingAgentDir = ...` declaration.

## S82
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/evals/docker/entrypoint.ts:55-62 — "nhánh `with_docs` … ném `Missing documentation`" (also cited at plan line 224)
- **actual:** The `for` loop is at :55-60; the throw is at :61 — `throw new Error(`Missing documentation: ${path}`);`

## S83
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** packages/evals/tsconfig.json — "không phải `../../tsconfig.base.json`"
- **actual:** packages/evals/tsconfig.json:2 — `"extends": "../../tsconfig.json",`. The plan names the wrong file being discarded (`tsconfig.base.json` vs `tsconfig.json`).

## S84
- **work item:** ## 6. evals (plan heading is actually `## 7. evals` — section 6 is `telemetry`)
- **cited:** Task-assigned heading `## 6. evals`
- **actual:** No such heading exists. Section 6 is `telemetry` (line 2197); evals is section 7 (line 2389, running to 2648).

