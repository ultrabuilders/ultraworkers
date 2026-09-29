# PHIẾU TRIỂN KHAI — `## 3. server` (pi-server)

Kế hoạch: `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1B_EXECUTION_PLAN.md`, mục `## 3. server` (dòng 1265–1526).
Nguồn: `/Users/tranquangdang21/Projects/pi-ref/packages/server` (HEAD = `d6af72e18`, MIT, © 2025 Mario Zechner) → `packages/server` của omp.
Ngày kiểm: 2026-09-29. Mọi trích dẫn dưới đây đã mở file thật và đọc; con số nào không tái lập được thì nằm ở mục 7.

---

## 1. Cái gì thay đổi, quan sát được

omp có thêm package `@oh-my-pi/pi-server`: một RPC server CBOR length-framed chạy trên Unix-domain socket, bắt tay `hello`/`hello_error` ở `PROTOCOL_VERSION = 8`, định tuyến lời gọi service theo từng presentation attachment, và **serialize mọi thao tác theo từng client** để một session không bao giờ bị đóng khi service call còn đang bay — người dùng quan sát thấy điều đó qua `bun test packages/server` báo **41 pass** (20 conformance + 6 server + 2 listener + 6 protocol + 6 unix + 1 unix-connection), mà hôm nay lệnh đó không tồn tại vì `packages/server` chưa có.

---

## 2. Bảng điểm sửa

Trước hết, **không có file nào của `pi-server` tồn tại ở omp hôm nay** — `ls -d packages/server` → `No such file or directory`. Vì vậy "TRƯỚC" của mọi dòng dưới đây là **trạng thái trong cây `pi-ref`**, và "SAU" là trạng thái ở `packages/server` sau khi chép. Đây là một lần **chép**, không phải một lần sửa; phần "sửa" là tầng viết lại cơ học bắt buộc.

| đường/dẫn | symbol / hàm cụ thể | TRƯỚC (trích từ file thật) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `src/errors.ts` | `RemoteServiceErrorCode` import | `import type { RemoteServiceErrorCode } from "@earendil-works/chord";` (`:1`) | `import type { RemoteServiceErrorCode } from "@oh-my-pi/chord";` — thân 56 dòng còn lại **nguyên văn** |
| `src/listener.ts` | `ByteConnectionAcceptor` import | `import type { ByteConnectionAcceptor } from "./connection.ts";` (`:1`) | `from "./connection"`; 8 dòng còn lại nguyên văn |
| `src/connection.ts` | 3 import + `ConnectionState.handshakeTimeout` | `:1` chord, `:2` pi-protocol, `:4` `from "./types.ts"`; `:30` `handshakeTimeout: NodeJS.Timeout;` | 3 scope/hậu tố đổi; `:30` → `handshakeTimeout: Timer;` |
| `src/types.ts` | `MaybePromise` | `:15` `export type MaybePromise<T> = T \| Promise<T>;` | `export type { MaybePromise } from "@oh-my-pi/pi-utils/acp/protocol";` — bỏ hẳn dòng 15 |
| `src/types.ts` | import dòng 2 (agent-core) + `SessionMetadata` | `:1` `import type { JsonValue, ServiceCall, ServiceProviderUpdate } from "@earendil-works/chord";`<br>`:2` `import type { Context, SessionMetadata } from "@earendil-works/pi-agent-core";` | **giữ nguyên dòng 1** (chỉ đổi scope) + thêm dòng `import type { Context } from "@oh-my-pi/chord/context";`; **xoá dòng 2**; **thêm interface 6 trường** `SessionMetadata` nguyên văn từ `pi-ref/packages/agent/src/harness/session/types.ts:473-480` |
| `src/server.ts` | import block | `:1-10` `} from "@earendil-works/chord";`<br>`:11` `import { BACKGROUND_CONTEXT, type SessionMetadata, TODO_CONTEXT, withAbortSignal } from "@earendil-works/pi-agent-core";`<br>`:12-30` `} from "@earendil-works/pi-protocol";`<br>`:36-40` `} from "./connection.ts";` … `from "./types.ts";` | 3 scope đổi; **5** mệnh đề `from "./x.ts"` ở dòng **36, 37, 38, 39, 40** bỏ hậu tố. 576 dòng, **thân logic không đổi một dòng** |
| `src/server.ts` | 33 khai báo `private` | `:51-65` 15 field + 18 method (`:103,183,208,223,262,298,306,406,417,438,452,474,489,504,512,523,531,539`) | `#host`, `#listeners`, … và `#startInternal()`, `#closeInternal()`, … |
| `src/server.ts` | `Server.closed` deferred | `:88` `this.closed = new Promise((resolve, reject) => {` | `const { promise, resolve, reject } = Promise.withResolvers<void>(); this.closed = promise;` |
| `src/session-router.ts` | 18 khai báo `private` | `:35-41` 7 field + 11 method (`:108,146,160,199,216,224,234,254,262,276,302`) | `#` |
| `src/session-router.ts` | `randomUUID` | `:1` `import { randomUUID } from "node:crypto";` | `import * as crypto from "node:crypto";` + call site thành `crypto.randomUUID()` |
| `src/transports/unix/listener.ts` | import node | `:1` `node:crypto`, `:2` `import type { Stats } from "node:fs"`, `:3` `import { chmod, link, lstat, mkdir, rename, unlink } from "node:fs/promises"`, `:4` `node:net`, `:5` `node:path` | mọi import **value** thành namespace (`import * as fs from "node:fs/promises"` …) + qualify ~25 call site; `import type { Stats }` giữ nguyên (type-only) |
| `src/transports/unix/listener.ts` | `UnixListener` + `UnixByteConnection` | 19 field ở `:30-39` + `:192-200`, 6 method ở `:95,126,136,147,181,270` | `#` |
| `src/transports/unix/listener.ts` | `get closed()` (getter **công khai**) | `:208` `get closed(): boolean { return this.closedValue; }` | **KHÔNG đổi.** `UnixByteConnection implements ByteConnection`, mà `connection.ts:8` khai `readonly closed: boolean`; đổi thành `#get` phá TS2420 và làm `server.ts` + `session-router.ts` hỏng theo |
| `src/transports/unix/listener.ts` | `NodeJS.Timeout` | `:342` `let timer: NodeJS.Timeout \| undefined;` | `let timer: Timer \| undefined;` (quy ước omp, xem `metaharness/src/server.ts:193` `#syncTimer: Timer \| undefined`) |
| `src/transports/unix/listener.ts` | `NodeJS.ErrnoException` | `:353` `socket.once("error", (error: NodeJS.ErrnoException) => {` | **giữ nguyên** — type khác, chỉ dùng trong callback, typecheck vẫn xanh |
| `src/transports/unix/index.ts` | barrel | 4 dòng named re-export: `export { getUnixSocketPath } from "./address.ts";` … | bỏ `.ts`; **giữ named re-export**, KHÔNG chuyển `export *` (xem mục 6) |
| `src/transports/unix/preset.ts` | `SessionMetadata` | `:1` `import type { SessionMetadata } from "@earendil-works/pi-agent-core";` | import từ `../../types` |
| `src/testing/host.ts` | `MemorySessionRepo` | `:2` `import type { Context, Session, SessionMetadata } from "@earendil-works/pi-agent-core";`<br>`:3` `import { BACKGROUND_CONTEXT, MemorySessionRepo } from "@earendil-works/pi-agent-core";`<br>`:153` `readonly repo = new MemorySessionRepo({ now: () => 1 });` | `Context` từ `../../chord/context`, `SessionMetadata` từ `../../types`; **xoá `MemorySessionRepo`**, thay bằng shim `TestSessionRepo` nội file (xem bước 8) |
| `src/testing/host.ts` | `Deferred<T>` | `:7-20` class 14 dòng với `private resolvePromise!: (value: T) => void;` ở `:9` | giữ hình dạng `new Deferred<T>()` + `.promise` + `.resolve()` (3 chỗ dùng ở `conformance.test.ts:403-405`), thân dựng lại trên `Promise.withResolvers<T>()` |
| `test/conformance.test.ts` | `expect.poll` | `:179` `await expect.poll(() => releaseCount).toBe(1);` (**7 chỗ**: `:179, :198, :217, :218, :318, :376, :393`) | `await pollUntil(() => releaseCount === 1, Date.now() + 5_000);` — `expect.poll` **không có trong `bun:test`**, xem mục 6 |
| `test/unix-connection.test.ts` | `vi.waitFor` | `:48` `await vi.waitFor(() => expect(socket.writableLength).toBe(1));`<br>`:60` `await vi.waitFor(() => expect(socket.ended).toBe(true));` | `await pollUntil(() => socket.writableLength === 1, Date.now() + 5_000);` — copy y hệt helper tại `packages/coding-agent/test/bash-executor.test.ts:62` |
| `test/unix-connection.test.ts` | `ControlledSocket.writeCallback` | `:13` `private writeCallback?: (error?: Error \| null) => void;` | `#writeCallback` — **nằm ngoài đợt quét 87 khai báo của bước 6** (xem mục 6) |
| `test/*.test.ts` (6 file) | import `vitest` | `test/protocol.test.ts:2` `import { afterEach, expect, test } from "vitest";` | `from "bun:test"` |
| `package.json` | manifest | 1314 B, `main: "./dist/index.js"`, `build: tsc -p tsconfig.build.json`, `clean: shx rm -rf dist`, `test: vitest --run`, `engines.node: ">=22.19.0"` | **KHÔNG CHÉP — viết mới** (xem bước 4) |
| `THIRD-PARTY-NOTICES.txt` | mục `packages/server/NOTICE` | file hiện có 1.0 MB; mục `crates/pi-shell/NOTICE` ở `:250` là mẫu format | thêm mục mới, cùng commit với file source đầu tiên |

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

### Bước 1 — CỔNG TIỀN ĐIỀU KIỆN (dừng nếu chưa đủ)

Cả ba mắt xích phải có trước khi file nào chạm đất: `packages/chord`, `packages/protocol`, và một quyết định về `SessionMetadata`.

Đo hôm nay: `ls -d packages/chord packages/protocol packages/server` → cả ba đều `No such file or directory`. Cây omp có **16** package.

Kiểm: `ls packages/chord/src/index.ts packages/protocol/src/index.ts` — phải in ra cả hai đường dẫn.
Neo: `packages/chord`, `packages/protocol`.

### Bước 2 — Ghi nguồn gốc TRƯỚC file đầu tiên

Tạo `packages/server/NOTICE`, dòng đầu:

```
Derived from earendil-works/pi packages/server @ d6af72e (MIT, Copyright (c) 2025 Mario Zechner).
```

rồi kèm **toàn văn** MIT text. Đã xác minh hai mảnh ghép:
- `git -C /Users/tranquangdang21/Projects/pi-ref log --oneline -1` → `d6af72e18 docs(durable): clarify scratch examples` — mã `d6af72e` trong NOTICE là **thật và hiện hành**.
- `head -3 /Users/tranquangdang21/Projects/pi-ref/LICENSE` → `MIT License` / `Copyright (c) 2025 Mario Zechner`.

Đồng thời thêm mục `packages/server/NOTICE` vào `THIRD-PARTY-NOTICES.txt`, theo format mục `crates/pi-shell/NOTICE` — file đó tồn tại, và mục của nó nằm ở `THIRD-PARTY-NOTICES.txt:250`. Đây là nghĩa vụ MIT § "The above copyright notice … shall be included" và là **cổng cứng**: NOTICE phải nằm trong **cùng commit** với file source đầu tiên.
Neo: `packages/server/NOTICE`, `THIRD-PARTY-NOTICES.txt:250`.

### Bước 3 — Khung package

```
mkdir -p packages/server/src/transports/unix packages/server/src/testing packages/server/test/fixtures
```

`packages/server/tsconfig.json` — đã đối chiếu `packages/agent/tsconfig.json` từng dòng, nội dung khớp:

```json
{
	"extends": "../tsconfig.workspace.json",
	"include": [
		"src",
		"test"
	]
}
```

Đo: `grep -l 'tsconfig.workspace.json' packages/*/tsconfig.json | wc -l` → **16**. `grep -l 'tsconfig.base.json' packages/*/tsconfig.json` → **0**. Vậy "đừng extends thẳng `tsconfig.base.json`" là đúng: không package nào làm vậy, và làm vậy sẽ mất `exclude: ["*/node_modules", "*/dist"]`.

KHÔNG port `tsconfig.build.json` (209 B, `outDir: ./dist`) lẫn `tsconfig.test.json` (560 B, 5 alias `paths` + type vitest).
Neo: `packages/server/tsconfig.json`.

### Bước 4 — `package.json` mới + catalog

Không chép `pi-ref/packages/server/package.json` (1314 B). Soạn mới theo mẫu `packages/agent/package.json` (đã mở và đọc):

- `name`: `@oh-my-pi/pi-server`
- `author`: `{ "name": "Stencil Labs, Inc.", "url": "https://stencil.so" }` — khớp `packages/agent/package.json` dòng 7
- `contributors`: `["Mario Zechner"]` — khớp dòng 8
- `license`: `MIT`; `repository.directory`: `packages/server` (upstream cũng đã là `packages/server`)
- `engines`: `{ "bun": ">=1.3.14" }` — đo được **16/16** package omp đều dùng đúng giá trị này
- `main`/`types` → `./src/index.ts`; `exports`: `.` → `./src/index.ts`, `./testing` → `./src/testing/index.ts`, `./unix` → `./src/transports/unix/index.ts`
- 6 script chép nguyên văn từ `packages/agent/package.json` (đã đọc): `check`, `check:types` (`tsgo -p tsconfig.json --noEmit`), `lint`, `test` (`bun test --parallel`), `fix`, `fmt`
- `devDependencies`: chỉ `@types/bun`. **BỎ `shx@0.4.0` và `vitest@4.1.9`** — đo được: `grep -rn '"shx"\|"vitest"' --include='package.json' . | grep -v node_modules` → **0 hit**; `grep -c vitest package.json` (root) → **0**.
- `dependencies`: toàn bộ ghim `catalog:`
- `files`: `["src", "README.md", "CHANGELOG.md"]` — lấy theo `packages/agent/package.json`; kế hoạch không nhắc tới khoá này, nhưng bỏ nó thì `npm pack` sẽ không đóng gói `src`.

Rồi thêm 3 package anh em vào `workspaces.catalog` của `package.json` GỌC và `bun install`. Đo hiện tại: catalog có 56 khoá, và **không** có `@oh-my-pi/chord`, `@oh-my-pi/pi-protocol`, `@oh-my-pi/pi-server` (đúng — chúng phải được thêm ở đây).

**Cảnh báo phiên bản:** kế hoạch ghi catalog là `18.3.3` / `18.3.4`. Con số đó **đã cũ** — catalog hôm nay là `18.4.0` cho mọi khoá `@oh-my-pi/pi-*`. Ghi `18.4.0`.
Neo: `package.json (workspaces.catalog)`.

### Bước 5 — Chép 16 file `src/`, đợt cơ học

Giữ nguyên layout. Chỉ áp 2 loại rewrite. **Đây là hai con số đã kiểm lại từ cây thật:**

| phép đo lệnh | kết quả thật | con số kế hoạch |
| --- | --- | --- |
| `grep -rhoE 'from "\.[^"]*\.ts"' src test --include='*.ts' \| wc -l` | **57** | 57 ✓ |
| `grep -rho '@earendil-works/…' src test --include='*.ts' \| wc -l` | **23** | 23 ✓ |

Chia nhỏ 23 scope occurrence trong tập được chép: **pi-protocol 8, pi-agent-core 7, chord 8, pi-server 0, pi-ai 0, pi-telemetry 0** — khớp từng số trong bảng `scope_rewrites` của kế hoạch.

Đối chiếu con số **toàn package 38** cũng tái lập được: pi-protocol 11, pi-agent-core 10, chord 9, pi-server 4, pi-ai 3, pi-telemetry 1. Và 15 occurrence nằm trong 4 file bị bỏ — `package.json` 4 (`:2, :50, :51, :52`), `README.md` 5 (`:1, :19, :26, :27, :77`), `tsconfig.test.json` 5 (`:9-:13`), `vitest.config.ts` 1 (`:8`). 15 + 23 = 38 ✓.

Neo: `packages/server/src/**`.

### Bước 6 — Đợt quét ES `#private`: 87 khai báo trên 5 file

Đo lại: `grep -c 'private '` cho `server.ts` 33, `session-router.ts` 18, `unix/listener.ts` 25, `testing/client.ts` 7, `testing/host.ts` 4 → **87** ✓. Ngoài 5 file đó, `private` trong `src/` = **0**.

Mọi dòng trong danh sách của kế hoạch đều đúng — tôi đã mở từng dòng:
- `src/server.ts`: 15 field ở `:51-65`, 18 method ở `:103, :183, :208, :223, :262, :298, :306, :406, :417, :438, :452, :474, :489, :504, :512, :523, :531, :539`
- `src/session-router.ts`: 7 field ở `:35-41`, 11 method ở `:108, :146, :160, :199, :216, :224, :234, :254, :262, :276, :302`
- `src/transports/unix/listener.ts`: 19 field ở `:30-39` + `:192-200`, 6 method ở `:95, :126, :136, :147, :181, :270`
- `src/testing/client.ts`: 7 field ở `:29-35`
- `src/testing/host.ts`: 4 field ở `:9, :40, :41, :158`

Quy tắc: `private readonly x` → `#x`, `private async x(...)` → `#x(...)`. Không cái nào ở đây là constructor parameter property, nên **cả 87** đều chuyển, không chỉ 52 field.

**KHÔNG đụng `get closed()` ở `unix/listener.ts:208`** — đã mở và đọc:
```ts
	get closed(): boolean {
		return this.closedValue;
	}
```
Đó là getter **công khai**, không có keyword `private`, và `UnixByteConnection` (`:191`) khai `implements ByteConnection` mà `connection.ts:8` khai `readonly closed: boolean`. Đổi thành `#get` → TS2420, và vì `server.ts` + `session-router.ts` đọc `connection.closed` qua interface nên hai file đó hỏng theo.

Hình dạng đích ở omp: `metaharness/src/server.ts:189` `#store`, `:190` `#children`, `:194` `#server`.
Neo: `packages/server/src/server.ts:51`, `src/session-router.ts:35`, `src/transports/unix/listener.ts:30`.

### Bước 7 — Đợt quét `Promise`: 9 chỗ trong `src/`, 8 chuyển

`grep -rn 'new Promise' src test` trả **10** kết quả: 9 trong `src/`, 1 trong `test/server.test.ts:47`.

Chuyển **8** sang `Promise.withResolvers()`:
`src/server.ts:88` · `unix/listener.ts:61`, `:238`, `:274`, `:339`, `:376` · `src/testing/client.ts:177` · `src/testing/host.ts:12`.

**GIỮ** `src/testing/client.ts:104` — đã mở và đọc:
```ts
		return new Promise((resolve, reject) => this.waiters.add({ predicate, resolve, reject }));
```
Nó resolve một giá trị tính từ predicate; `withResolvers` không biểu đạt được. Để lại một dòng comment nói lý do, không thì người review sau sẽ "sửa" nó.

Đổi `NodeJS.Timeout` → `Timer` ở **hai** chỗ: `connection.ts:30` và `unix/listener.ts:342`. Kế hoạch đã tự sửa đúng chỗ này (nói rõ 242/345/361 là sai). Đã kiểm: `:342` là `let timer: NodeJS.Timeout | undefined;`; `:353` là `NodeJS.ErrnoException` — **type khác, có thể để nguyên**. Lý do đổi là quy ước omp, không phải typecheck.
Neo: `packages/server/src/server.ts:88`, `src/transports/unix/listener.ts:61`, `src/connection.ts:30`.

### Bước 8 — Chuẩn hoá import node-module → namespace

`unix/listener.ts:1-5` dùng import named cho `node:crypto`, `node:fs/promises`, `node:net`, `node:path` → `import * as …` + qualify call site (~25 chỗ).
`session-router.ts:1` `import { randomUUID } from "node:crypto";` → `crypto.randomUUID()`.
`unix/address.ts:1` `import { join } from "node:path";` → `path.join`.
`testing/client.ts:1-2` (`node:events`, `node:net`) → namespace.
`import type { Stats } from "node:fs"` (`:2`) giữ nguyên — type-only, AGENTS.md chỉ bắt import value.

Cơ học nhưng chạm nhiều call site: chạy `bun run fmt` sau, đừng format tay.
Neo: `packages/server/src/transports/unix/listener.ts:1-5`, `src/session-router.ts:1`, `src/transports/unix/address.ts:1`, `src/testing/client.ts:1-2`.

### Bước 9 — Va chạm số 1: `MaybePromise`

Xoá `src/types.ts:15`:
```ts
export type MaybePromise<T> = T | Promise<T>;
```
thay bằng:
```ts
export type { MaybePromise } from "@oh-my-pi/pi-utils/acp/protocol";
```

Đã mở `packages/utils/src/acp/protocol.ts:9` — **khớp từng byte**:
```ts
/** A value which may be produced asynchronously. */
export type MaybePromise<T> = T | Promise<T>;
```

Đường dẫn `@oh-my-pi/pi-utils/acp/protocol` resolve được: `packages/utils/package.json` có khoá `"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }`. Public API của `pi-server` giữ nguyên — `src/index.ts:4` vẫn `export * from "./types"` — nên client không thấy khác biệt. Đây là sửa đổi cố ý **duy nhất không nguyên văn** trên một public symbol, và nó thuần type nên không thể đổi hành vi runtime.

Thêm `@oh-my-pi/pi-utils` vào dependencies.
Neo: `packages/server/src/types.ts:15`.

### Bước 10 — Va chạm số 2 và 3: `SessionMetadata` + `TestSessionRepo`

**(a)** Xoá `src/types.ts:2`. **Giữ `src/types.ts:1`** (`JsonValue`, `ServiceCall`, `ServiceProviderUpdate` từ chord — cả ba đều dùng). Thêm vào đó interface 6 trường nguyên văn, đã mở và đọc từ `pi-ref/packages/agent/src/harness/session/types.ts:473-480`:

```ts
export interface SessionMetadata {
	id: string;
	createdAt: number;
	storageVersion: number;
	cwd?: string;
	parentSessionId?: string;
	legacyParentSessionPath?: string;
}
```

Đo lý do: `grep -rn 'SessionMetadata' packages/agent/src` → **0 hit**. `packages/agent/src/index.ts` có **17** dòng `export *` (agent, agent-loop, append-only-context, compaction, output-budget, pause, proxy, replay-policy, run-collector, sent-tool-definitions, speculative-execution, telemetry, thinking, tool-context, tokenizer, types, utils/yield) và **không** có `harness/`. `grep -rn 'MemorySessionRepo' packages/` → **0 hit**.

**(b)** Trong 4 file src import `Context` / `BACKGROUND_CONTEXT` / `TODO_CONTEXT` / `withAbortSignal` từ agent-core (`server.ts:11`, `session-router.ts:3`, `transports/unix/preset.ts:1`, `testing/host.ts:2`, `testing/host.ts:3`, `types.ts:2`) → trỏ sang `@oh-my-pi/chord/context`.

Đây là re-export thuần, đã mở `pi-ref/packages/agent/src/harness/context.ts:14-25` để kiểm:
```ts
export {
	awaitWithContext,
	BACKGROUND_CONTEXT,
	type Context,
	...
	TODO_CONTEXT,
	withAbortSignal,
	...
};
```
Nó re-export từ `@earendil-works/chord/context` (`:12`). Symbol giống hệt, chỉ đổi module specifier. Sau (a)+(b), `pi-server` **không còn phụ thuộc `pi-agent-core`** — 5 symbol agent-core mà nó import chỉ còn `SessionMetadata`, nay đã khai cục bộ.

**(c)** `src/testing/host.ts:2` và `:3` — bỏ `MemorySessionRepo` và `Session`. `:153`:
```ts
	readonly repo = new MemorySessionRepo({ now: () => 1 });
```
thay bằng shim `TestSessionRepo` nội file ~30 dòng: `Map<string, SessionMetadata>` + shim `Session` in-memory, ba phương thức list/open/create, giữ **nguyên** hành vi 0-match / >1-match / 1-match.

Hợp đồng này đã ghim bằng test — mở `test/conformance.test.ts`:
- `:334` `test("reports an unknown session without creating a Harness", …)` → `resolves.toMatchObject({ ok: false, error: { code: "session_not_found" } })` + `expect(host.harnesses.size).toBe(0)`
- `:346` `test("rejects an ambiguous session ID without creating a Harness", …)`
- `:321` `test("rejects requests addressed to another server before repository access", …)` — ghim đúng thứ tự "sai serverId bị từ chối **trước** mọi tra cứu repository", khớp `server.ts:346` `if (envelope.target.serverId !== this.serverId) throw new WrongServerError();`

**(d)** `Deferred` (`:7-20`) → `Promise.withResolvers()`. Đã mở, đúng 2 thành viên public (`readonly promise` ở `:8`, `resolve()` ở `:17`) + 1 private (`resolvePromise` ở `:9`); `withResolvers` sinh thêm `reject` và ta **bỏ** nó, vì `Deferred` cố ý chỉ resolve một chiều.

**LƯU Ý phạm vi:** `Deferred` là public API (`src/testing/index.ts:3` re-export nó) và `test/conformance.test.ts:403-405` dùng trực tiếp 3 lần:
```ts
		const acquiring = new Deferred<void>();
		const continueAcquiring = new Deferred<void>();
		const terminated = new Deferred<Error | undefined>();
```
→ **giữ nguyên hình dạng `new Deferred<T>()`**, đừng sửa 3 chỗ dùng; nếu sửa thì phải cập nhật cam kết "cùng 41 khẳng định".
Neo: `packages/server/src/types.ts:2`, `src/server.ts:11`, `src/session-router.ts:3`, `src/transports/unix/preset.ts:1`, `src/testing/host.ts:3`.

### Bước 11 — Chép 7 file `test/`, chuyển sang `bun:test`

| file (pi-ref) | dòng | `test()` | import `vitest` | scope | `.ts` tương đối |
| --- | --- | --- | --- | --- | --- |
| `test/conformance.test.ts` | 502 | **20** | `:3` | `:1` chord, `:2` agent-core | **5** |
| `test/protocol.test.ts` | 168 | **6** | `:2` | `:1` pi-protocol | **3** |
| `test/server.test.ts` | 127 | **6** | `:5` | `:4` pi-protocol | **5** |
| `test/listener.test.ts` | 52 | **2** | `:1` | không có | **3** |
| `test/unix.test.ts` | 143 | **6** | `:5` | không có | **3** |
| `test/unix-connection.test.ts` | 65 | **1** | `:4` | `:3` pi-protocol | **1** |
| `test/fixtures/stale-socket-server.mjs` | 9 | — | không có (fixture) | không có | — |

**Tổng 41** — đã đếm lại từ khai báo `test()`: 20+6+6+2+6+1 = 41 ✓.

Viết lại thì phải rà trước khi chạy bất cứ thứ gì:
- `grep -rn 'mock.module' packages/server/test` → 0
- `grep -rn 'from "vitest"' packages/server/test` → 0
- `grep -rn 'vi\.' packages/server/test` → 0
- `grep -rn 'expect\.poll' packages/server/test` → 0 ← **bổ sung, kế hoạch thiếu mục này** (mục 6)
- `grep -rn 'readFileSync\|Bun.file' packages/server/test` → 0

Neo: `packages/server/test/**`.

### Bước 12 — GATE 1: `bun run check:ts`

Script thật, đã đọc từ `package.json` gốc:
```
check:ts: bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types
check:tools: oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' 'packages/*/*.ts' 'scripts/**/*.ts'
```
Ghi chú đã kiểm: không glob nào trong `check:tools` khớp `.mjs`, nên `test/fixtures/stale-socket-server.mjs` không bị `oxfmt --check` chạm; và `.oxlintrc.json:55` là `"**/*.mjs"` trong `ignorePatterns` — đã mở và đọc, khớp chính xác.
Neo: `bun run check:ts`.

### Bước 13 — GATE 2: `bun test packages/server`, kỳ vọng đúng 41

Chuỗi phụ thuộc không chạm `@oh-my-pi/pi-natives` — `chord` chỉ dep `esbuild`, `protocol` chỉ dep `chord` + `typebox`, `utils/acp/protocol` là file type-thuần không có import nào. Nên **không** cần build native addon.
Neo: `bun test packages/server`.

### Bước 14 — CHANGELOG + README + commit

`packages/server/CHANGELOG.md` mới: chỉ `# Changelog` + `## [Unreleased]` + `### Added`, một dòng hướng người dùng. **KHÔNG chép** `pi-ref` CHANGELOG (1567 B, 65 dòng, 0.80.3 → 0.87.1) — tooling release của omp hoàn tất `[Unreleased]` và sẽ cố hoà giải heading version nước ngoài.

`README.md`: 5 scope (`:1` title, `:19` agent-core, `:26`+`:27` pi-server, `:77` pi-protocol trong văn xuôi). Title → `# @oh-my-pi/pi-server`. Ví dụ chạy được ~40 dòng gọi `MemorySessionRepo` — thứ omp không có — nên viết lại theo `TestSessionRepo` mới. Thêm mục "không phải collab-web, không phải metaharness": `pi-server` là CBOR length-framed trên Unix socket có handshake có phiên bản; `collab-web` là WebSocket relay room với AES-GCM; `metaharness` là `Bun.serve` REST+SSE.

Commit source + NOTICE + CHANGELOG + `package.json` gốc + `bun.lock` **CÙNG NHAU**.
Neo: `packages/server/CHANGELOG.md`, `packages/server/README.md`, `packages/server/NOTICE`.

---

## 4. Hợp đồng test

Bảy file, **41 case**, tất cả ở mức hợp đồng. Không cái nào static echo, không cái nào success passthrough, không cái nào source-grep, không cái nào `mock.module()`.

**`test/conformance.test.ts` (502 dòng, 20 case, 2 describe)** — hợp đồng định tuyến attachment. Attach → định tuyến service call → mất kết nối.
*Nếu hồi quy:* một client remote-presentation mất session của nó, hoặc nói chuyện với một session đã chết. Cụ thể — attachment bị release **trước** khi service call bay settle (đóng nhầm session đang bận); request thiếu `{sessionId, attachmentId}` không bị chặn bằng `session_not_attached`; `attachmentId` cũ sau khi đổi Session vẫn được chấp nhận; request sai `serverId` đi thẳng vào repository; session lạ dựng `Harness` thừa thay vì trả `session_not_found`; `sessionId` mơ hồ trả `session_ambiguous`; một `Harness` đã terminated vẫn nhận attach; shutdown không đóng mọi routed handle.

**`test/protocol.test.ts` (168 dòng, 6 case)** — framing/bắt tay trên `ByteConnection` in-memory thuần: không socket, không port, không timer, tất định hoàn toàn. `hello` phải là message đầu tiên; `PROTOCOL_VERSION` không hỗ trợ bị từ chối; frame chia đôi qua hai lần `onData` cho kết quả giống hệt; `hello` thứ hai bị từ chối; `hello` + `request` gộp trong MỘT chunk xử lý đúng thứ tự; frame cuối bị cắt cụt báo lỗi khi peer đóng.
*Nếu hồi quy:* một client trên đường truyền chậm/mất gói thấy một session nửa vời parse.

**`test/server.test.ts` (127 dòng, 6 case)** — option và vòng đời: `serverId` không phải UUIDv4 và `listeners` thiếu bị từ chối bằng `TypeError`; `maxFrameLength`/`handshakeTimeoutMs` ngoài dải bị từ chối (kể cả vượt trần timer `2_147_483_647`); `start()` chạy đồng thời lần hai bị từ chối mà không rò listener đã start; handshake không bao giờ tới bị đóng kèm frame `hello_error` **cuối cùng**; `close()` truyền lỗi khi shutdown listener thất bại.
*Nếu hồi quy:* một launcher cấu hình sai phục vụ một server nửa vời thay vì hỏng ngay lúc boot.

**`test/listener.test.ts` (52 dòng, 2 case)** — ghép: mọi listener đều start; listener thứ N hỏng thì 1..N-1 bị đóng.
*Nếu hồi quy:* server nhiều transport chạy với nửa vòng transport.

**`test/unix.test.ts` (143 dòng, 6 case)** — an toàn filesystem trên socket thật trong thư mục tạm: listener **còn sống** ở đường dẫn đích bị TỪ CHỐI và **không** bị unlink; file thường ở đường dẫn đó không bao giờ bị unlink; thư mục cha lồng nhau tạo với mode `0o700`, socket để lại `0o600` rồi bị xoá khi close; inode thay thế xuất hiện lúc shutdown KHÔNG bị xoá; socket stale thật sự ĐƯỢC xoá trước khi bind.
*Nếu hồi quy:* **server xoá file của người dùng**. Đây là bộ test sắc nhất trong package. Dùng socket `node:net` thật + tiến trình con `fixtures/stale-socket-server.mjs`.

**`test/unix-connection.test.ts` (65 dòng, 1 case)** — backpressure/thứ tự đóng: frame lỗi protocol cuối cùng được xếp **SAU** output đang chờ, không đua với nó.
*Nếu hồi quy:* client đọc EOF trước khi đọc được lỗi.

**Sau khi viết lại, hợp đồng KHÔNG ĐỔI:** cùng 41 khẳng định, cùng tên, cùng bảo đảm quan sát được. Hai việc mổ bắt buộc: `vi.waitFor` ×2 và `expect.poll` ×7 (mục 6).

---

## 5. Cổng

### GATE 1 — chặn
```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```
**Có ĐỎ ĐƯỢC KHÔNG? CÓ.**
Cơ chế: `check:types` chạy `tsgo -p tsconfig.json --noEmit` cho từng package. Nếu `@oh-my-pi/pi-protocol` hoặc `@oh-my-pi/chord` chưa tồn tại → **TS2307** trên chính tên đó. Nếu còn sót import `@earendil-works/*` → TS2307/TS2792. Nếu bước 10 chưa áp → `SessionMetadata` unresolved, và `ServerHost<TMetadata extends SessionMetadata>` không resolve. Đỏ trong cả ba trường hợp, và **tự chỉ đúng nguyên nhân** vì tên module nằm ngay trong thông báo lỗi. Đo nền: 16 package, exit 0.

### GATE 2 — chạy được **sau** bước 1, không cần addon native
```bash
bun test packages/server          # kỳ vọng đúng 41
```
**Có ĐỎ ĐƯỢC KHÔNG? CÓ, nhưng KHÔNG phải "ngay hôm nay".**

Kế hoạch viết: *"**cả hai nhánh đều đỏ được ngay hôm nay**: nhánh test không cần addon native"*. **Câu này sai và phải sửa.** Hôm nay `packages/server` không tồn tại, `packages/chord` và `packages/protocol` cũng không — đã đo. `bun test packages/server` sẽ báo "0 files" hoặc không resolve `@oh-my-pi/chord`, tức **đỏ vì hạ tầng, không phải vì migrate**. Chạy nó hôm nay cho cảm giác an toàn giả — đúng thứ tài liệu này cảnh báo.

Viết lại cho đúng:
> GATE 2 đỏ được **ngay khi tiền điều kiện bước 1 đáp** (`packages/chord` và `packages/protocol` đã có). Nó không cần `brew install ninja` — đo được `bun test packages/omptype` xanh 1139 pass / 0 fail dù addon chưa build. Đỏ được theo ba đường độc lập: (1) số case ≠ 41 ⇒ một lần viết lại đã bỏ hoặc nhân đôi case; (2) `expect.poll` còn sót  ⇒ `TypeError: expect(...).poll is not a function`, 7/20 case conformance đỏ; (3) `vi.waitFor` còn sót ⇒ `TypeError: vi.waitFor is not a function`, đỏ GATE 2. Trước khi đáp điều kiện thì **không được chạy và không được tính là xanh**.

Nếu muốn một cổng đỏ được *ngay hôm nay* thì phải thêm cổng pháp lý, xem dưới.

### GATE 3 — cơ học, rẻ
```bash
grep -rn '@earendil-works/' packages/server | wc -l                     # phải in 0
grep -rnoE 'from "\.[^"]*\.ts"' packages/server/src packages/server/test | wc -l   # phải in 0
```
**Có ĐỎ ĐƯỢC KHÔNG? CÓ.** Đếm chính xác. Hai con số nền đã đo trên cây nguồn: **38** occurrence scope toàn package (15 trong 4 file bị bỏ → **23** trong tập chép) và **57** hậu tố `.ts` trong tập chép. Sau khi sửa, cả hai phải in 0. Đây là kiểm chứng build, **không** mã hoá thành file test (AGENTS.md cấm test source-grep).

### GATE 4 — pháp lý
```bash
ls packages/server/NOTICE
grep -n 'd6af72e' packages/server/NOTICE | head -1
grep -n 'packages/server/NOTICE' THIRD-PARTY-NOTICES.txt
```
**Có ĐỎ ĐƯỢC KHÔNG? CÓ.** Ba lệnh, ba điều kiện, tất cả đều là so sánh chuỗi/file tồn tại — không có cách nào "xanh giả". Đây là **cổng đỏ được duy nhất chạy được ngay hôm nay**, vì nó không cần `chord`/`protocol`. Nên bắt đầu work item bằng nó.

**Kết luận cổng:** GATE 1 và GATE 3 đỏ được, GATE 4 đỏ được ngay hôm nay, GATE 2 đỏ được *sau* bước 1. Không cổng nào luôn xanh. Tổng bốn cổng, mỗi cổng có cơ chế đỏ nêu tên.

---

## 6. Cạm bẫy riêng của work item này

**6.1 — `expect.poll` là cạm bẫy số một, và kế hoạch đã BỎ SÓT nó.**
`grep -rn 'expect.poll' test/` trả **7 kết quả**, tất cả trong `conformance.test.ts`: `:179, :198, :217, :218, :318, :376, :393`. Ví dụ `:179`:
```ts
		await expect.poll(() => releaseCount).toBe(1);
```
`expect.poll` là API **chỉ có ở vitest** (2.0+), **không có trong `bun:test`**. Kế hoạch đã cảnh báo đúng cho `vi.waitFor` ("chỉ đổi dòng import sẽ ném `TypeError` và làm đỏ chính GATE 2") nhưng danh sách gate của bước 11 chỉ grep `vi.`, và mục "Hợp đồng test" khẳng định *"Mọi matcher `expect` upstream dùng (`toBe`, `toMatchObject`, `rejects.toThrow`, `resolves`, `toEqual`) đều tồn tại trong `bun:test`, nên không cần mổ xẻ test hành vi"* — **khẳng định đó sai**, vì nó không hề kiểm `expect.poll`. Đây là 7/20 case conformance. Sửa: viết một `pollUntil(predicate, deadlineMs)` cục bộ trong `conformance.test.ts` (copy y hệt `packages/coding-agent/test/bash-executor.test.ts:62`) và thay cả 7 chỗ. **Thêm `grep -rn 'expect\.poll' packages/server/test` phải 0 vào danh sách gate của bước 11.**

**6.2 — `get closed()` là cái bẫy ngược lại: sửa thì vỡ.**
Trong 87 khai báo `#private` có đúng một cái **không được** đụng tới: `unix/listener.ts:208`. Nó trông y hệt getter thường, nằm giữa các dòng đều là `private`, và ai quét bằng mắt cũng dễ gộp. Nhưng `UnixByteConnection implements ByteConnection` và `connection.ts:8` bắt buộc `readonly closed: boolean`. Đổi thành `#get closed()` → TS2420, rồi `server.ts` và `session-router.ts` hỏng theo vì chúng đọc `connection.closed` qua interface. Đây là lý do bước 6 liệt kê từng dòng: đừng quét bằng regex, hãy làm theo danh sách.

**6.3 — Đợt cơ học đủ chưa thì GATE 3 bắt được, nhưng GATE 1 mới bắt được phần còn lại.**
23 scope rewrite + 57 hậu tố `.ts` là con số đúng, nhưng nó **không** phủ 6 đợt quét tay. 87 `#private`, 8 `Promise.withResolvers`, ~25 call site namespace, 1 `SessionMetadata` interface, 1 `TestSessionRepo` shim, 8 `expect.poll`, 2 `vi.waitFor`, 1 `Timer`. Hai lớp này không cùng độ nguy hiểm: lớp cơ học thì GATE 3 grep là bắt; lớt tay thì chỉ GATE 1/2 mới bắt. Đừng chạy GATE 3 xanh rồi tưởng xong.

**6.4 — `Deferred` là public API đang bị giữ bằng tay.**
`withResolvers` trông như một lệnh cơ học, nhưng `Deferred` được `src/testing/index.ts:3` re-export ra ngoài và `conformance.test.ts:403-405` dùng `new Deferred<T>()` ba lần. Nếu bạn "cho đúng chuẩn" bằng cách xoá class và đổi 3 chỗ dùng sang `withResolvers`, bạn vừa phá public API vừa phải sửa cam kết "cùng 41 khẳng định". Giữ class, chỉ đổi thân nó. Và đừng thêm `reject` — `Deferred` cố ý chỉ resolve một chiều.

**6.5 — Trong 5 symbol agent-core, 4 chỉ là re-export của chord.**
Nếu bạn đọc `import { BACKGROUND_CONTEXT, type SessionMetadata, ... } from "pi-agent-core"` và kết luận "cần `pi-agent-core`", bạn sẽ kéo cả package này vào một cuộc hoà giải lớn hơn nhiều, nằm ngoài phạm vi. Kiểm `pi-ref/packages/agent/src/harness/context.ts:14-25`: nó re-export nguyên văn từ `chord/context`. Chỉ `SessionMetadata` là khái niệm agent-core thật, và nó là một interface 6 trường. Đó mới là toàn bộ khe hở, và nó nhỏ đủ đóng ngay trong package này.

**6.6 — `pi-server` KHÔNG phải là `collab-web` và KHÔNG phải là `metaharness`.**
Đo, không phải giả định. `createUnixListener` là nơi **duy nhất** trong package tiêu thụ `node:net`; không HTTP, không WebSocket, không MCP ở bất cứ đâu. Nghệ thuật lân cận thật ở omp là `packages/coding-agent/src/collab/registry.ts` (**762 dòng** — đã đếm) và `src/tiny/jsonl-socket.ts` (**49 dòng** — đã đếm): cả hai host `node:net` + Unix socket nhưng là JSON phân tách dòng. **Không refactor chúng sang `pi-server`.** Ghi khác biệt vào README để câu hỏi này đóng luôn thay vì tranh luận lại sau này.

**6.7 — Cản trở thật sự nằm ngoài package này.**
`pi-protocol` cần `typebox@1.3.27`. `grep -n 'typebox' package.json` (root omp) → **0 hit**; `bun.lock:216` chỉ có `"@sinclair/typebox": "^0.34.0"` và nó là transitive của package khác (bản resolve `0.34.52` ở `bun.lock:898`), không tái dùng được. Đây là một **chuỗi**, không phải một chi tiết: `server` bị chặn sau một quyết định thuộc spec của `pi-protocol`. Đừng mất cả ngày vì nó.

**6.8 — Hai barrel giữ named re-export là CỐ Ý, không phải sơ suất.**
`AGENTS.md` ưu tiên `export * from` trong barrel thuần. Đổi `transports/unix/index.ts` sang star sẽ **vô tình export `UnixByteConnection`** — class đang đánh dấu `@internal Exported only for transport-level verification` và cố ý không re-export, với `test/unix-connection.test.ts` deep-import nó. Giữ named re-export, ghi lệch quy tắc vào PR. Cùng lý do cho `src/testing/index.ts`.

**6.9 — Hai mắt xích của chuỗi phụ thuộc phải tồn tại trước khi bước 1 chạy.**
Hôm nay đo được: `packages/chord` ❌, `packages/protocol` ❌, `packages/server` ❌. Bước 1 nói đúng — nhưng "Cổng hoàn thành" lại nói cả hai nhánh đỏ được *ngay hôm nay*. Một trong hai câu đó phải sai, và cây thật nghiêng về phía bước 1.

---

## 7. Danh sách neo hỏng / sai lệch phát hiện khi kiểm lại

Ghi ra, không sửa trong tài liệu kế hoạch.

| # | Kế hoạch nói | Cây thật nói | Mức |
| --- | --- | --- | --- |
| 1 | `server.ts`: "5 specifier `.ts` tương đối (dòng 32, 34, 35, 37, 38, 39, 40)" — 7 số cho 5 specifier | Mệnh đề `from "./x.ts"` nằm ở dòng **36, 37, 38, 39, 40**. 32/34/35 nằm trong khối import nhiều dòng | Sai neo |
| 2 | `session-router.ts`: "Dòng 8 dùng field `private readonly` xuyên suốt" | `:8` là `class SessionCleanupError extends AggregateError {}` — **không** có `private` nào. Field `private readonly` ở **35–41** (bước 6 nói đúng) | Câu tàn dư |
| 3 | `test/protocol.test.ts`: trích `import { afterEach, describe, expect, test } from "vitest"` | `:2` thật là `import { afterEach, expect, test } from "vitest"` — **không có `describe`** (file có 0 `describe()`) | Trích sai |
| 4 | Bảng dependency: catalog `chord 18.3.3`, `pi-protocol 18.3.4`, `pi-agent-core 18.3.3` | Catalog omp hôm nay là **18.4.0** cho mọi khoá `@oh-my-pi/pi-*` | Số cũ |
| 5 | Va chạm 2: "`packages/agent/src/index.ts` chỉ export **18** module phẳng" | File có **17** dòng `export *` — và chính danh sách kế hoạch liệt kê ra cũng đúng 17 tên | Lệch 1 |
| 6 | Bước 11 + "Hợp đồng test": gate chỉ grep `vi.`; mọi matcher `expect` đều có trong `bun:test` | **`expect.poll` ×7** trong `conformance.test.ts:179,198,217,218,318,376,393` không có trong `bun:test` | **BỎ SÓT chặn GATE 2** |
| 7 | `types.ts` copy note (a): "bỏ **cả hai** dòng import upstream" | Dòng 1 (`JsonValue`, `ServiceCall`, `ServiceProviderUpdate`) là load-bearing, phải **giữ**. Chỉ dòng 2 bị xoá. Bước 10(a) nói đúng — hai mục mâu thuẫn nhau | Mâu thuẫn nội bộ |
| 8 | "`Deferred` — omp không có class nào như vậy (**đo được 0 match**)" | `grep -rn 'class Deferred' packages/` → **7** (`DeferredCommandPreview`, `DeferredDiagnostics`, `DeferredMCPTool`, `DeferredRenderScheduler` ×3, `DeferredOpenWebSocket`). Chỉ `class Deferred *[{<]` mới = 0. Kết luận thì đúng, lệnh đo thì không tái lập được | Đo bẩn |
| 9 | Bước 6: 87 khai báo `private` trên 5 file `src/` | `test/unix-connection.test.ts:13` còn `private writeCallback?:` — class field trong **file test**, ngoài tầm quét | Bỏ sót |
| 10 | Bước 7: "9 chỗ `new Promise` trong 5 file" | Đúng cho `src/`, nhưng `test/server.test.ts:47` là chỗ thứ 10 trong tập chép | Bỏ sót |
| 11 | "`bun.lock:216`" + `@sinclair/typebox@0.34.52` | `:216` là dòng range `"^0.34.0"`; bản resolve `0.34.52` nằm ở `bun.lock:898` | Nhỏ |
| 12 | "cả **7** file test chuyển sang `bun:test`" | Chỉ **6** file `.ts` import `vitest`; file thứ 7 trong `test/` là `fixtures/stale-socket-server.mjs` | Nhỏ |

### Những gì đã kiểm và **KHÔNG** sai

Để người đọc tin phần còn lại, đây là những con số tôi đã đo lại và chúng **tái lập được chính xác**:

- **40/40 neo** trong bảng "Bề mặt công khai" — mỗi cái đều rơi đúng symbol.
- **Toàn bộ** cột `bytes` và số dòng trong bảng "File cần chép" (29 file). Tổng: 16 file `src` = **67.005 B** ✓; toàn 29 file = **115.351 B** ✓.
- **57** hậu tố `.ts` trong tập 23 file chép; **23** scope rewrite (pi-protocol 8 / pi-agent-core 7 / chord 8 / còn lại 0); **38** toàn package; **15** trong 4 file bị bỏ.
- **41** test case (20 + 6 + 6 + 2 + 6 + 1). Con số dùng làm chuẩn cho GATE 2 là **đúng**.
- **87** khai báo `private` (33 + 18 + 25 + 7 + 4) và **mọi** dòng trong danh sách bước 6.
- **9** `new Promise` trong `src/` và phân loại 8-chuyển / 1-giữ ở bước 7.
- **8** literal `pi.session-management` / `pi.session-directory` tại đúng những dòng đã nêu.
- `pi-ref` `session/types.ts:473-480` (interface 6 trường) và `harness/context.ts:14-25` (khối re-export).
- omp: `packages/utils/src/acp/protocol.ts:9`; `metaharness/src/server.ts:26,189,190,193,194,211`; `bash-executor.test.ts:62` (`pollUntil`); `.oxlintrc.json:55` (`"**/*.mjs"`); `THIRD-PARTY-NOTICES.txt:250`; `collab/registry.ts` = 762 dòng; `tiny/jsonl-socket.ts` = 49 dòng.
- omp: `SessionMetadata` 0, `MemorySessionRepo` 0, `export interface ServerListener` 0, `getUnixSocketPath` 0, `createUnixListener` 0, `class Deferred *[{<]` 0, `typebox` trong root `package.json` 0, `shx`/`vitest` trong mọi `package.json` 0.
- omp: 16/16 package `extends tsconfig.workspace.json`, 0 package extends `tsconfig.base.json`, 16/16 dùng `engines.bun >=1.3.14`.
- `pi-ref` HEAD = `d6af72e18` — mã provenance trong NOTICE là thật.
- Script `check:ts` / `check:tools` trong `package.json` gốc khớp nguyên văn mô tả của GATE 1.
