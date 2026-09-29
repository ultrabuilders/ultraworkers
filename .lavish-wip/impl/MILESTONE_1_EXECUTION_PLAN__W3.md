# Phiếu triển khai — W3. Runtime type guard tại biên giải mã của collab frame

> Nguồn: `MILESTONE_1_EXECUTION_PLAN.md`, mục `## W3.` (dòng 611–824).
> Cây tham chiếu dùng để đối chiếu: `/Users/tranquangdang21/Projects/ultraworkers` (omp, tên package `@oh-my-pi/pi-*`).
> Mọi neo dưới đây đã được mở và đọc bằng `sed -n "<n>p" <file>` hoặc `grep -n` trên cây đó.
> **Trạng thái cây lúc kiểm chứng:** `2026-09-29 07:11`, branch `milestone-1`, HEAD `65cc6c1`.

---

## 0. Kết quả kiểm lại neo (đọc trước khi gõ bất cứ thứ gì)

| Neo trong work item | Trạng thái | Bằng chứng |
| --- | --- | --- |
| `packages/coding-agent/src/collab/crypto.ts:57` | ✅ **ĐÚNG** | `sed -n '57p'` → `	return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;` |
| `crypto.ts:49` (doc comment của `open()`) | ✅ **ĐÚNG** | `sed -n '49p'` → `/** Inverse of {@link seal}. Throws on auth failure or malformed input. */` |
| `crypto.ts` dài 67 dòng | ✅ **ĐÚNG** | `wc -l` → `67` |
| `crypto.ts:57` là `as CollabFrame` production duy nhất | ✅ **ĐÚNG** | `git grep -n 'as CollabFrame' -- packages/` → đúng 9 hit: 1 ở `src/collab/crypto.ts:57`, 8 ở test (2 trong `guest-bus-mirror.test.ts`, 6 trong `relay-client-backpressure.test.ts`). Khớp với "8 hit trong test" của plan |
| `packages/coding-agent/test/collab/crypto.test.ts` dài 270 dòng, 29 test | ✅ **ĐÚNG** | `wc -l` → `270`; `grep -c 'it(' ` → `29`; `bun test …/crypto.test.ts` → `29 pass 0 fail 68 expect() calls` |
| `crypto.test.ts:41` là dấu đóng của `describe("collab crypto")` | ✅ **ĐÚNG** | `sed -n '41p'` → `});`; dòng 43 là `describe("collab link format", () => {` |
| `crypto.test.ts:2` (khối import) | ✅ **ĐÚNG** | import crypto ở dòng 2–8, import protocol ở dòng 9–19; cả hai dùng alias `@oh-my-pi/pi-coding-agent/…` |
| `crypto.test.ts:33` và `:39` không `await` | ✅ **ĐÚNG** | `sed -n '33p;39p'` → hai dòng `expect(open(…)).rejects.toThrow();`, không có `await` |
| `packages/coding-agent/src/collab/protocol.ts:54` | ✅ **ĐÚNG** | `sed -n '54p'` → `export type CollabFrame =` |
| `packages/coding-agent/src/collab/relay-client.ts:578` | ✅ **ĐÚNG** | `frame = await open(this.#opts.key, envelope.payload);` — và đây là caller production **duy nhất** của `open()` |
| `relay-client.ts:582` | ✅ **ĐÚNG** | `logger.debug("collab: ignoring undecryptable guest frame", { peer: envelope.peerId });` |
| `relay-client.ts:584` | ✅ **ĐÚNG** | `this.#failFatal("bad key or corrupted frame");` |
| `relay-client.ts:675` + `674-691` | ✅ **ĐÚNG** (phạm vi hơi rộng hơn plan) | dòng 675 là `#failFatal(reason: string): void {`; hàm kết thúc ở 691. Doc comment ngay trên ở dòng 674 nói thẳng: `/** Decryption failure: wrong key or corrupted frame. Never reconnect. */` — đây là bằng chứng sẵn có cho claim "không reconnect", không phải suy luận |
| `relay-client.ts:594` và `.catch` ở `595-597` | ✅ **ĐÚNG** | `this.onFrame?.(frame, envelope.peerId);` rồi `.catch((err: unknown) => { logger.debug("collab: frame handler failed", …) });` |
| `packages/wire/src/index.ts:9-12` | ✅ **ĐÚNG** | khối comment 4 dòng, kết thúc bằng ` */` ở dòng 12 |
| Cơ chế exhaustive `Record<CollabFrame["t"], …>` → TS2741 | ✅ **ĐÚNG, đã tự tái kiểm chứng cả hai chiều** | xem mục 5 |
| `packages/coding-agent/src/collab/protocol.ts:26` là import `session/session-entries` | ❌ **HỎNG** | xem bên dưới |
| `executor.ts:1497, 1597, 2641, 2947, 3321, 4065` (6 call site `emitSubagentFrame`) | ❌ **HỎNG CẢ SÁU** | xem bên dưới |
| HEAD là `ecd516f` (bảng "Đính chính" của plan) | ❌ **CŨ** | `git rev-parse --short HEAD` → `65cc6c1` |

### 1.1. Neo hỏng — `protocol.ts:26`

Plan (bước 4) viết: *"Xác nhận đường dẫn `session/session-entries` resolve được — nó được import y hệt ở `packages/coding-agent/src/collab/protocol.ts:26`."*

Sai ở **cả số dòng lẫn hình thức import**:

```
$ sed -n '26p' packages/coding-agent/src/collab/protocol.ts
import type { CollabSessionState } from "@oh-my-pi/pi-tui/status-line/types";

$ grep -n 'session-entries' packages/coding-agent/src/collab/protocol.ts
28:import type { SessionEntry, SessionHeader } from "../session/session-entries";
```

- Dòng đúng là **28**, không phải 26.
- Import đó là **đường dẫn tương đối** `"../session/session-entries"`, **không** phải alias `@oh-my-pi/pi-coding-agent/session/session-entries`. "y hệt" là sai.

**Hệ quả thực tế: import bạn viết trong file test vẫn đúng** — nhưng lý do nên nêu là khác. Alias resolve được vì `packages/coding-agent/package.json` có `"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }`, và `test/` đã có tiền lệ dùng alias cho cả hai dạng:

```
$ grep -rln 'from "@oh-my-pi/pi-wire"' packages/coding-agent/test/ | head -3
packages/coding-agent/test/task-executor-mcp-parity.test.ts
packages/coding-agent/test/mcp-tool-args.test.ts
packages/coding-agent/test/session-messages.test.ts

$ grep -rn 'from "@oh-my-pi/pi-coding-agent/session/' packages/coding-agent/test/ | head -3
packages/coding-agent/test/agent-session-auto-compaction-queue.test.ts:12:…/session/agent-session
packages/coding-agent/test/agent-session-auto-compaction-queue.test.ts:13:…/session/auth-storage
packages/coding-agent/test/agent-session-auto-compaction-queue.test.ts:14:…/session/session-manager
```

Đừng viết comment kiểu "giống hệt protocol.ts:26" — sai. Nếu cần biện minh, viết "khớp với alias mà phần còn lại của `test/` đang dùng".

### 1.2. Neo hỏng — 6 call site `emitSubagentFrame` trong `executor.ts`

Plan liệt kê `executor.ts:1497, 1597, 2641, 2947, 3321, 4065`. Cả sáu đều lệch. Số thật:

| Plan ghi | Thực tế | Nội dung dòng thật |
| --- | --- | --- |
| 1497 | **1505** | `emitSubagentFrame(args.eventBus, args.subagentEventBus, TASK_SUBAGENT_PROGRESS_CHANNEL, progressPayload);` |
| 1597 | **1605** | `emitSubagentFrame(args.eventBus, args.subagentEventBus, TASK_SUBAGENT_EVENT_CHANNEL, payload);` |
| 2641 | **2694** | `emitSubagentFrame(args.eventBus, args.subagentEventBus, TASK_SUBAGENT_LIFECYCLE_CHANNEL, settledPayload);` |
| 2947 | **3000** | `emitSubagentFrame(options.eventBus, options.subagentEventBus, TASK_SUBAGENT_LIFECYCLE_CHANNEL, startedPayload);` |
| 3321 | **3374** | `emitSubagentFrame(options.eventBus, options.subagentEventBus, TASK_SUBAGENT_LIFECYCLE_CHANNEL, startedPayload);` |
| 4065 | **4121** | `emitSubagentFrame(options.eventBus, options.subagentEventBus, TASK_SUBAGENT_LIFECYCLE_CHANNEL, startedPayload);` |

Cách tìm lại: `grep -n 'emitSubagentFrame' packages/coding-agent/src/task/executor.ts` → hit ở 1505, 1605, 2694, 3000, 3374, 4121 (dòng 85 là import, bỏ qua).

Kết luận của plan về chúng ("đều truyền object literal cụ thể, nên hôm nay đường đó chưa với tới") **vẫn đúng** — tôi đã mở cả ba callsite đầu và thấy `progressPayload` / `payload = { id, event }` / `settledPayload` đều là object literal. Nhưng danh sách neo thì đừng dùng.

---

## 2. Cái gì thay đổi, quan sát được

Một khung collab giải mã ra không phải object, hoặc là object không có `t` chuỗi, hoặc thiếu một field mà variant của nó khai báo bắt buộc, giờ bị `open()` ném ra ngay tại biên giải mã với message nêu rõ tên variant và tên field thiếu — thay vì được trả về như một `CollabFrame` đã đóng dấu kiểu rồi nổ thành `TypeError` ở chỗ tiêu thụ vài lời gọi sau.

Không có UI mới, không có flag, không có thay đổi hành vi với khung lành mạnh. Khung mang tag lạ vẫn đi qua như cũ.

---

## 3. Bảng điểm sửa

Trước hết, trạng thái TRƯỚC chính xác của ba vùng sẽ bị chạm (trích nguyên văn từ file thật):

```
$ sed -n '45,58p' packages/coding-agent/src/collab/crypto.ts
	return out;
}

/** Inverse of {@link seal}. Throws on auth failure or malformed input. */
export async function open(key: CryptoKey, data: Uint8Array): Promise<CollabFrame> {
	if (data.byteLength <= IV_LENGTH) {
		throw new Error("Sealed frame too short");
	}
	const iv = asStrict(data.subarray(0, IV_LENGTH));
	const ciphertext = asStrict(data.subarray(IV_LENGTH));
	const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: AES_ALGORITHM, iv }, key, ciphertext));
	return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;
}
```

```
$ sed -n '1,20p' packages/coding-agent/test/collab/crypto.test.ts
import { describe, expect, it } from "bun:test";
import {
	generateRoomKey,
	generateWriteToken,
	importRoomKey,
	open,
	seal,
} from "@oh-my-pi/pi-coding-agent/collab/crypto";
import {
	type CollabFrame,
	DEFAULT_RELAY_URL,
	formatCollabLink,
	formatCollabWebLink,
	generateRoomId,
	packEnvelope,
	parseCollabLink,
	rewriteEnvelopePeer,
	unpackEnvelope,
} from "@oh-my-pi/pi-coding-agent/collab/protocol";
```

```
$ sed -n '3,9p' packages/coding-agent/CHANGELOG.md
## [Unreleased]

### Security

- Project-scope MCP config (`mcp.json`, `.mcp.json`, `.omp/mcp.json`) is no longer loaded by default. …
```

| Đường/dẫn | Symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/collab/crypto.ts` (chèn **trên** dòng 49) | `FRAME_REQUIRED_FIELDS` | *không tồn tại* | `const FRAME_REQUIRED_FIELDS: Record<CollabFrame["t"], readonly string[]> = { …18 hàng… };` + JSDoc giải thích required-field-vs-exact-shape |
| `packages/coding-agent/src/collab/crypto.ts` (ngay sau map) | `FRAME_REQUIRED_LOOKUP` | *không tồn tại* | `const FRAME_REQUIRED_LOOKUP: Readonly<Record<string, readonly string[] \| undefined>> = FRAME_REQUIRED_FIELDS;` — alias nới rộng, để tag lạ tra cứu không cần cast tại call site |
| `packages/coding-agent/src/collab/crypto.ts` (ngay sau alias) | `assertCollabFrame` | *không tồn tại* | `function assertCollabFrame(value: unknown): CollabFrame` — **không export**; 3 nhánh: không phải object → throw; `t` không phải chuỗi → throw; `!required` → `return value as CollabFrame` (nhánh tolerant); còn lại lặt `required` và throw khi `!(field in value)` |
| `packages/coding-agent/src/collab/crypto.ts:57` | `open()` | `	return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;` | `	return assertCollabFrame(JSON.parse(TEXT_DECODER.decode(plaintext)));` — **đây là toàn bộ thay đổi production bên trong `open()`**, không đụng gì khác |
| `packages/coding-agent/src/collab/crypto.ts:49` | JSDoc của `open()` | `/** Inverse of {@link seal}. Throws on auth failure or malformed input. */` | **giữ nguyên** — câu `Throws on auth failure or malformed input` vẫn đúng sau thay đổi |
| `packages/coding-agent/test/collab/crypto.test.ts:2-8` | import crypto | `…open,\n\tseal,\n} from "@oh-my-pi/pi-coding-agent/collab/crypto";` | thêm `sealSerialized` ngay **sau** `seal,` (thứ tự sort của oxfmt) |
| `packages/coding-agent/test/collab/crypto.test.ts:9-19` | import protocol | `type CollabFrame,\n\tDEFAULT_RELAY_URL,` | thêm `COLLAB_PROTO,` **giữa** `type CollabFrame,` và `DEFAULT_RELAY_URL,` (thứ tự sort ASCII: `C` < `D`) |
| `packages/coding-agent/test/collab/crypto.test.ts` (sau dòng 19) | import type-only | *không có* | `import type { SessionEntry, SessionHeader } from "@oh-my-pi/pi-coding-agent/session/session-entries";` và `import type { AgentSnapshot } from "@oh-my-pi/pi-wire";` |
| `packages/coding-agent/test/collab/crypto.test.ts` (chèn sau dòng 41) | fixture + `VARIANTS` | *không có* | `header`, `entry`, `agent`, `state` (hằng cấp module) + `const VARIANTS: CollabFrame[]` đủ 18 phần tử |
| `packages/coding-agent/test/collab/crypto.test.ts:42` (sau dòng 41) | `describe("collab frame decode guard")` | *không có* | 4 test: round-trip 18 variant / thiếu field bắt buộc / `t` không phải chuỗi / tag lạ vẫn qua |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` | chỉ có `### Security` | **phải TẠO MỚI** mục `### Fixed` (xem cảnh báo ở bước 8) + một dòng mô tả |

### 3.1. Nội dung map `FRAME_REQUIRED_FIELDS` — đã đối chiếu từng hàng với kiểu thật

Tôi đã đọc `CollabFrame` tại `protocol.ts:54-96` và `GuestFrame`/`HostFrame` tại `packages/wire/src/index.ts:324-380`, rồi so từng hàng:

Cột "Nguồn" là dòng của discriminant trong `packages/wire/src/index.ts` — đã mở và đọc từng dòng.

| Hàng | Field bắt buộc | Field **optional** (KHÔNG được đưa vào) | Nguồn |
| --- | --- | --- | --- |
| `hello` | `proto`, `name` | `writeToken?` | wire:326 |
| `prompt` | `text` | `images?` | wire:336 |
| `ui-response` | `reqId` | `value?` | wire:337 |
| `abort` | *(rỗng)* | — | wire:338 |
| `agent-cmd` | `cmd`, `agentId` | `text?` | wire:339 |
| `fetch-transcript` | `reqId`, `agentId`, `fromByte` | — | wire:340 |
| `welcome` | `proto`, `header`, `state`, `agents`, `entryCount` | `readOnly?` | wire:347 |
| `snapshot-chunk` | `entries`, `final` | — | wire:368 |
| `entry` | `entry` | — | wire:369 |
| `event` | `event` | — | wire:370 |
| `state` | `state` | — | wire:371 |
| `bus` | `channel`, `data` | — (`data: unknown` là bắt buộc về mặt kiểu) | wire:373 |
| `agents` | `agents` | — | wire:374 |
| `ui-request` | `request` | — | wire:375 |
| `ui-request-end` | `reqId` | — | wire:376 |
| `transcript` | `reqId`, `text`, `newSize` | `error?` | wire:378 |
| `bye` | `reason` | — | wire:379 |
| `error` | `message` | — | wire:380 |

Tổng cộng **18 hàng**, khớp đúng 18 discriminant mà `Record<CollabFrame["t"], …>` liệt kê trong thông báo TS2741 (mục 5).

---

## 4. Các bước

Mỗi bước dưới đây đã được tôi mở và đọc; số dòng là số thật trên cây hiện tại.

**Bước 1 — Chèn khối guard vào `crypto.ts`, ngay trên dòng 49.**
Dòng 47 là `	return out;` (đóng `sealSerialized`), 48 trống, 49 là `/** Inverse of {@link seal}. Throws on auth failure or malformed input. */`. Chèn map + alias + hàm vào khoảng trắng giữa 48 và 49. Dùng **tab** để thụt (đã kiểm: `sed -n '16p' …crypto.ts | cat -A` → `^I^Iconst key = …`; oxfmt cũng ép tab).
Sau khi chèn, doc comment của `open()` dời xuống khoảng dòng 118 — **đừng dùng số dòng cũ 49/57 sau khi đã chèn**.

**Bước 2 — Để `Record<CollabFrame["t"], readonly string[]>` làm cơ chế exhaustive.**
Chú thích này là thứ biến một variant bị quên thành lỗi compile. **Đừng sửa tay** nếu tsgo phàn nàn — hãy sửa đúng hàng thiếu. Nếu bạn vừa thêm variant mới vào `CollabFrame` (`protocol.ts:54`) thì phải thêm hàng tương ứng, và build đỏ với TS2741 là **đúng ý**.

**Bước 3 — Thay dòng 57 (trước khi chèn khối ở bước 1).**
`	return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;` → `	return assertCollabFrame(JSON.parse(TEXT_DECODER.decode(plaintext)));`
Đây là **toàn bộ** phần sửa trong `open()`. Không đụng vào kiểm tra `data.byteLength <= IV_LENGTH` (dòng 51-53), hai lời gọi `asStrict` (54-55), hay `crypto.subtle.decrypt` (56).

**Bước 4 — Bổ sung import cho file test.**
- `sealSerialized` vào khối import crypto (hiện 2-8), ngay sau `seal,`.
- `COLLAB_PROTO` vào khối import protocol (hiện 9-19), giữa `type CollabFrame,` và `DEFAULT_RELAY_URL,`.
- Hai import type-only mới, đặt sau khối import protocol:
  `import type { SessionEntry, SessionHeader } from "@oh-my-pi/pi-coding-agent/session/session-entries";`
  `import type { AgentSnapshot } from "@oh-my-pi/pi-wire";`
Cả hai alias đều resolve (đã tự kiểm bằng cách biên dịch một file thử dùng đúng hai import này — sạch, 0 lỗi). **Không** chuyển sang đường dẫn tương đối `../../src/collab/crypto` như một số file test anh em dùng; file này đã theo alias.

**Bước 5 — Chèn fixture + `VARIANTS` + khối `describe("collab frame decode guard")` sau dòng 41.**
Dòng 41 là `});` đóng `describe("collab crypto")`, dòng 42 trống, dòng 43 bắt đầu `describe("collab link format", () => {`. Chèn vào khoảng trắng giữa 41 và 43 để 29 test cũ vẫn nằm trên đầu file.
Tôi đã biên dịch thử **đúng bộ fixture và bảng 18 phần tử như plan viết**: sạch, 0 lỗi. Các shape quan trọng đã đối chiếu:
- `header` — `SessionHeader` (`session-entries.ts:35`): `type`/`id`/`timestamp`/`cwd` bắt buộc, phần còn lại optional. Fixture khớp.
- `entry` — `SessionEntry` (`session-entries.ts:300`) → `SessionMessageEntry` (`session-entries.ts:75`): `type`/`id`/`parentId`/`timestamp` + `message: AgentMessage`. `UserMessage` (`packages/ai/src/types.ts:1017`) cần `role`/`content`/`timestamp`. Fixture khớp.
- `agent` — `AgentSnapshot` (`packages/wire/src/index.ts:238`): `kind: "main" | "sub"`, `status: "running" | "idle" | "parked" | "aborted"`. Fixture khớp, `parentId` optional nên bỏ được.
- `state` — `CollabSessionState` = `SessionState & {…}` (`packages/tui/src/status-line/types.ts:19`); `SessionState` (`wire/src/index.ts:225`) cần `isStreaming`/`cwd`/`participants`, `sessionName`/`queuedMessageCount` có trong bắt buộc-cho-hợp-lệ. `Participant` (`wire/src/index.ts:217`) cần `name` + `role: "host" | "guest"` — đó là lý do `role: "host" as const` là bắt buộc, bỏ `as const` là hỏng.
- `{ t: "ui-request", request: { kind: "editor", title: "Edit", reqId: 3 } }` — `CollabUiRequest = CollabUiRequestDraft & { reqId: number }` (`wire/src/index.ts:322`); nhánh `kind: "editor"` chỉ cần `title`. Khớp.
- `{ t: "event", event: { type: "model_changed" } }` — `model_changed` có thật (`agent-session.ts:9675`: `this.#emit({ type: "model_changed" });`). Khớp.

**Bước 6 — Chạy test.**
```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun test packages/coding-agent/test/collab/crypto.test.ts
```
Kỳ vọng **33 pass / 0 fail** (29 sẵn có + 4 mới). Nếu test round-trip đỏ, guard đang quá chặt — đối chiếu lại danh sách optional ở mục 3.1 (`writeToken`, `images`, `readOnly`, `value`, `text` trên `agent-cmd`, `error` trên `transcript`).

**Bước 7 — Chạy type check + lint/format.**
```bash
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types   # tsgo -p tsconfig.json --noEmit — KHÔNG phải tsc
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:tools                                  # oxlint . && oxfmt --check …
```
`check:tools` sẽ báo một cảnh báo oxlint **có sẵn từ trước, không phải của bạn**:
`packages/coding-agent/test/mcp-project-config-not-trusted-by-default.test.ts:19:10: warning eslint(no-unused-vars): Identifier 'getConfigRootDir' is imported but never used.`
Đó là warning, không làm fail. Nếu oxfmt báo file mới cần format: `bun run fmt`.

**Bước 8 — CHANGELOG.**
`## [Unreleased]` ở `packages/coding-agent/CHANGELOG.md:3` hiện **chỉ có `### Security`** (dòng 5) — **chưa có `### Fixed`**. Bạn phải TẠO mục `### Fixed`, không phải thêm vào mục có sẵn. Đặt sau `### Security` (thứ tự chuẩn trong AGENTS.md: Breaking → Added → Changed → Fixed → Removed).
Gợi ý dòng: `Fixed malformed collab frames being accepted at the decode boundary instead of being rejected before the frame handler.`
Chưa có link issue/PR — thêm attribution theo AGENTS.md khi đã có số PR.

**Bước 9 — Không commit.** Quy tắc repo: "NEVER commit unless asked". Để cây bẩn cho người review.

---

## 5. Hợp đồng test

**File:** `packages/coding-agent/test/collab/crypto.test.ts`, khối mới `describe("collab frame decode guard")`, 4 test, đặt sau dòng 41.

**Các case:**

1. `round-trips a well-formed frame of every CollabFrame variant` — seal rồi open từng phần tử của `VARIANTS` (18 phần tử), assert `toEqual(frame)`.
2. `rejects a decoded frame missing a required field at the guard` — `sealSerialized(key, JSON.stringify({ t: "hello", proto: COLLAB_PROTO }))`, assert reject `/missing required field "name"/`.
3. `rejects a payload whose discriminator is not a string` — lặp `["{}", "[]", "null", "7", '"str"', JSON.stringify({ t: 42 })]`, assert reject.
4. `accepts a variant this build does not know` — payload `{ t: "future-thing", payload: { anything: true } }`, assert mở ra đúng nguyên vẹn.

**Người dùng thấy gì nếu hồi quy:**

| Hồi quy | Test bắt | Triệu chứng vận hành |
| --- | --- | --- |
| Guard siết thành exact-shape (chặn field lạ) | test 1 | Peer cũ/mới bị từ chối ngay lúc `hello`, guest không bao giờ nhận được `welcome` |
| Mất nhánh tolerant `if (!required) return` | test 4 | Mọi khung mang tag lạ — tức mọi bản build mới hơn — ném lỗi `collab frame "…" is missing required field` |
| Xoá hẳn guard | test 2 + 3 | Khung hỏng lọt qua, nổ muộn thành `TypeError` trong `CollabHost`/`CollabGuestLink` |
| Đưa nhầm field optional vào danh sách bắt buộc | test 1 | **Nguy hiểm nhất — xem dưới** |

Triệu chứng cụ thể của hồi quy nguy hiểm nhất, đã truy vết tới tận chỗ hiện ra:

- `open()` chỉ có **một** caller production: `relay-client.ts:578`. Catch của nó rẽ theo vai trò (`relay-client.ts:579-587`).
- Phía **host** (`relay-client.ts:582`): chỉ `logger.debug("collab: ignoring undecryptable guest frame")` rồi drop khung. Người dùng **không thấy gì**.
- Phía **guest** (`relay-client.ts:584`): `this.#failFatal("bad key or corrupted frame")` → `relay-client.ts:675-691` đặt `#closed = true`, `ws.close(1000)`, gọi `onClose(reason, false)` — **không reconnect**, và doc comment ở dòng 674 tự nó đã viết: `/** Decryption failure: wrong key or corrupted frame. Never reconnect. */`
- `onClose` của guest xử lý ở `guest.ts:349-364`: nếu đã join xong và `willReconnect === false` → `this.#ctx.showStatus(\`Collab session ended (${reason})\`)` ở dòng 362, tức trên màn hình hiện đúng dòng
  `Collab session ended (bad key or corrupted frame)`
  rồi `#restoreAfterDisconnect()`. Nếu chưa join xong → `firstWelcome.reject(new Error(reason))`.
- Nghĩa là: **một khung hợp lệ bị guard chặt nhầm giết vĩnh viễn phiên collab phía guest**, người dùng phải vào lại bằng link, và thông báo ("bad key or corrupted frame") hoàn toàn sai — frame đúng key, chỉ hỏng cấu trúc. Không có dòng log nào ở phía guest để chẩn đoán.

**Không** test cái này: chỉ số variant, thứ tự key trong object, hay bất kỳ chi tiết nội bộ nào khác.

---

## 6. Cổng

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
bun test packages/coding-agent/test/collab/crypto.test.ts          # 33 pass / 0 fail
cd packages/coding-agent && bun run check:types && cd ../..       # exit 0
bun run check:tools                                                 # oxlint + oxfmt --check, sạch
```

### 6.1. Cổng này có đỏ được không? **Có — nhưng chỉ một chiều, và câu trả lời thẳng là: KHÔNG bảo vệ bạn khỏi lỗi nguy hiểm nhất.**

Tôi đã tự kiểm chứng khả năng đỏ của từng cổng:

**`check:types` — hai chiều, đây là cổng đáng tin nhất.** Tôi đã tạo một file thử trong `packages/coding-agent/src/collab/` với đúng 18 hàng của plan:
- đủ 18 hàng → **không** có TS2741 nào cho file đó.
- bỏ hàng `error: ["message"]` → `error TS2741: Property 'error' is missing in type '{…}' but required in type 'Record<"abort" | "agent-cmd" | "agents" | "bus" | "bye" | "entry" | "error" | "event" | "fetch-transcript" | "hello" | "prompt" | "snapshot-chunk" | "state" | "transcript" | "ui-request" | "ui-request-end" | "ui-response" | "welcome", readonly string[]>'`
Cơ chế exhaustive của plan là thật, và nó bắt được đúng lớp lỗi mà nó nói là bắt.

**`bun test` — một chiều.** Nó bắt được: xoá guard (test 2, 3 đỏ), mất nhánh tolerant (test 4 đỏ), siết exact-shape (test 1 đỏ). Đây là ba mutation plan nêu, tôi đồng ý về mặt phân tích.
Nhưng nó **không** bắt được: guard quá chặt đối với một hình dạng khung thật mà bộ fixture không nghĩ tới. Test 1 chỉ round-trip 18 khung mà chính người viết test dựng ra — nó chứng minh "guard không chặn 18 hình dạng này", **không** chứng minh "guard không chặn bất kỳ hình dạng thật nào".

**Lỗ hổng cụ thể nhất: `data` trên variant `bus`.** `data` có kiểu `unknown` và tất cả 6 call site `emitSubagentFrame` đều truyền object literal, nên hôm nay chưa với tới. Nhưng nếu một call site tương lai truyền `undefined`, `JSON.stringify` **bỏ hẳn key**, guard throw, và **mọi** guest đang nối tới host đó chết cùng lúc với thông báo sai. Test nào cũng xanh. Đây là lý do "an toàn" của cổng ở đây là cảm giác, không phải bằng chứng.

**`check:tools` — một chiều, và chỉ về style.** Bắt được import thừa, sai thụt, sai format. Không bắt được gì về hành vi.

### 6.2. Vấn đề nghiêm trọng hơn nhiều: cây này đang dùng chung, và cổng KHÔNG ĐỎ ĐƯỢC ở thời điểm bạn chạy

Trong lúc kiểm chứng, `check:types` **đã đỏ trước khi W3 viết một dòng nào**, vì những file probe tạm của phiên khác nằm trong cây:

```
test/collab/__w5probe.ts(10,7): error TS2322: Type 'OnlyHost' is not assignable to type '1'.
test/collab/__w5probe.ts(13,7): error TS2322: Type '"NEVER"' is not assignable to type '1'.
```

Đó là các file **cố tình sai** (`const bad1: 1 = ow;` — gán vào `1` để chứng minh một type resolve ra `never`). Chúng là untracked:

```
$ git status --porcelain | grep -E 'packages/'
 M packages/coding-agent/src/tools/bash.ts
?? packages/coding-agent/test/collab/web-wire.types.ts
?? packages/coding-agent/test/zz-w9-probe.test.ts
```

Chúng **thay đổi trong lúc tôi đang kiểm chứng** (07:09 xuất hiện `__w5probe.ts`; vài phút sau biến mất, thay bằng `zz-w9-probe.test.ts`). Có phiên khác đang chạy W5 và W9 trên cùng cây. Hệ quả trực tiếp:

- `check:tools` cũng quét được chúng (`packages/*/{test,…}/**/*.ts` nằm trong glob của cổng này).
- Nếu bạn xoá chúng để "làm cổng xanh", bạn vừa phá việc của người khác, vừa có thể xoá mất một phát hiện thật của W5.
- Nếu bạn chạy cổng giữa lúc file đang bị sửa, danh sách lỗi của tsgo sẽ nhảy loạn và khó quy kết.

**Cổng viết lại cho đỏ được (làm theo đúng thứ tự này):**

1. **Trước khi sửa gì, chụp lại baseline.** Chạy cả ba lệnh, lưu output:
   ```bash
   cd /Users/tranquangdang21/Projects/ultraworkers
   bun test packages/coding-agent/test/collab/crypto.test.ts 2>&1 | tee /tmp/w3-base-test.log
   (cd packages/coding-agent && bun run check:types) 2>&1 | tee /tmp/w3-base-types.log
   bun run check:tools 2>&1 | tee /tmp/w3-base-tools.log
   git status --porcelain > /tmp/w3-base-status.log
   ```
2. **Sửa.**
3. **Chạy lại ba lệnh.**
4. **Chỉ quy kết đỏ cho thay đổi của bạn khi**: danh sách lỗi mới là **tập chứa thứ hơn hơn** của danh sách baseline (`comm -13 <(sort /tmp/w3-base-types.log) <(sort /tmp/w3-new-types.log)`) **và** có nhắc `collab/crypto.ts` hoặc `test/collab/crypto.test.ts`. Lỗi ở file lạ = của người khác, không phải của bạn.
5. **Đừng xoá file untracked của người khác.** Nếu chúng làm bạn không đọc được kết quả, hãy báo lại thay vì dọn.

**Định nghĩa "xong" chính xác** (đừng chỉ nhìn con số):
- `bun test packages/coding-agent/test/collab/crypto.test.ts` in ra `33 pass` / `0 fail`, **và** trong đó có đủ 4 tên test mới.
- `cd packages/coding-agent && bun run check:types` exit 0 — và riêng exit 0 này đã chứng minh map đủ 18 hàng, vì thiếu một hàng là TS2741.
- `bun run check:tools` exit 0. Bỏ qua warning `no-unused-vars` có sẵn ở `test/mcp-project-config-not-trusted-by-default.test.ts:19`.

### 6.3. Một claim của plan đã cũ

Plan (bảng "Đính chính") nói `bun test packages/coding-agent/test/collab/` báo `29 pass / 21 fail` vì thiếu native addon, nên phải giới hạn theo file. Tôi chạy lại: **`232 pass / 0 fail` trên 22 file**. Addon đã được build. Giới hạn theo file vẫn nên làm (tín hiệu sạch hơn, nhanh hơn), nhưng lý do đã không còn là "bị chặn".

---

## 7. Cạm bẫy riêng của work item này

Xếp theo mức độ tốn thời gian nếu làm sai.

**1. Đây là work item duy nhất trong W-wave mà một sửa sai giết chết phiên của người dùng — không chỉ mất một khung.** Đã truy ở mục 5. `open()` có đúng một caller production (`relay-client.ts:578`, đã xác minh bằng `git grep`), và catch rẽ theo vai trò: host thì log rồi drop, **guest thì `#failFatal` → `#closed = true` → không reconnect**. Trong khi chỉnh, hãy tự hỏi "khung này có thể hỏng vì một field optional mà tôi quên không?" trước mỗi hàng. Sái nhất có thể: đưa `data` của `bus` thành bắt buộc trong khi đang cố "siết cho chặt".

**2. Ba test sẵn có ở dòng 33 và 39 không `await` `expect(...).rejects`** — đã xác minh bằng `sed -n '33p;39p'`. Assertion của chúng trôi lơ lửng, Promise rejection không được kiểm. **Đừng sao chép mẫu này vào test mới.** Trong 4 test mới, cả ba test dùng `rejects` đều phải `await`.

**3. Test cuối không có local `const opened: unknown` thì không compile.** Bun định kiểu `toEqual(expected: T)` với `T` suy ra từ actual, nên object variant-lạ không gán được cho kiểu trả về `CollabFrame`. Ép `as CollabFrame` trực tiếp bị từ chối (TS2352, không overlap); `as unknown as CollabFrame` compile được nhưng là double assertion. Local kiểu `: unknown` là cách sạch duy nhất.

**4. `role: "host" as const` trong fixture `state` là bắt buộc, không phải thừa.** `Participant.role` là `"host" | "guest"` (`wire/src/index.ts:219`); bỏ `as const` thì object literal suy ra `role: string` và không gán được cho `CollabSessionState`.

**5. Số dòng trong plan đã cũ ở ba chỗ, và chúng sẽ càng cũ hơn sau bước 1.** `protocol.ts:26` → thật là `:28`; sáu neo `executor.ts` → lệch từ 8 đến 56 dòng; HEAD `ecd516f` → thật là `65cc6c1`. Đặc biệt, **ngay khi bạn chèn khối guard ở bước 1, dòng 49 và 57 của `crypto.ts` dời xuống khoảng 118 và 126** — mọi neo dòng trong plan nói về `crypto.ts` chỉ đúng trước bước 1.

**6. Cây dùng chung với các phiên W5/W9 đang chạy.** Đã nêu ở 6.2. Đây không phải cảnh báo lý thuyết: trong lúc tôi kiểm chứng, `check:types` đã đỏ vì probe của người khác rồi lại xanh, không phải vì W3.

**7. `### Fixed` chưa tồn tại trong CHANGELOG.** `## [Unreleased]` chỉ có `### Security`. Bạn đang **tạo mới** mục, không phải thêm dòng vào mục sẵn có. Đặt sau `### Security`.

**8. Nội dung mã phải dùng tab.** Đã kiểm bằng `cat -A`. `oxfmt --check` là một phần của `check:tools` nên sai thụt sẽ đỏ, nhưng chạy `bun run fmt` sớm hơn đỡ vòng lặp.

---

## 8. Danh sách file bị chạm

| File | Hành động | Quy mô |
| --- | --- | --- |
| `packages/coding-agent/src/collab/crypto.ts` | sửa | +33 dòng (map 20 + JSDoc/alias 14 + hàm ~20, tính cả dòng trống), và 1 dòng thay ở `open()`; 67 → ~100 dòng |
| `packages/coding-agent/test/collab/crypto.test.ts` | sửa | +4 dòng import, +5 fixture, +20 dòng `VARIANTS`, +26 dòng 4 test; 270 → ~325 dòng |
| `packages/coding-agent/CHANGELOG.md` | sửa | +3 dòng (tiêu đề `### Fixed`, dòng trống, một dòng mô tả) |

Không file nào khác. Cụ thể: **không** export `assertCollabFrame` (test chỉ đi tới được nó qua `open()` — đó là hợp đồng W3 nói tới), **không** thêm file mới, **không** đụng `relay-client.ts`, `protocol.ts`, hay bất kỳ call site `emitSubagentFrame` nào.
