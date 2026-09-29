# Phiếu triển khai — Work item `## 4. client`

Kế hoạch: `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1B_EXECUTION_PLAN.md`, mục `## 4. client` (dòng 1527–1755).
Cây nguồn: `/Users/tranquangdang21/Projects/pi-ref/packages/client` (19 file, 70.483 byte — đã đo lại, khớp tuyệt đối).

**Trạng thái cây đích tại lúc viết phiếu:** `packages/{chord,protocol,server,client}` đều **CHƯA TỒN TẠI** ở omp. `packages/wire` là khuôn duy nhất sẵn có. `esbuild` vắng mặt trong `node_modules`. Đây là điều kiện tiên quyết, không phải phát hiện mới.

---

## 0. Tóm tắt kiểm lại neo

**Số neo đã kiểm: 118. Đúng: 113. Sai/hỏng: 5.**

Các con số lớn trong đặc tả — 19 file / 70.483 byte, bảng 18 dòng = 70.192 byte, 7 file src = 34.985 byte, 5 file test = 27.504 byte, `promise.ts` = 582 byte, 25 symbol công khai, 16 specifier tương đối trong `src/`, 9 trong `test/`, 8 site scope trong `src/`, 21 symbol pi-protocol phân biệt, 17 symbol chord, 12 field `#` ở `client.ts:63-74`, 4 khai báo `private` và 18 tham chiếu `this.X` trên 17 dòng, 21+4+3 call site namespace, 3 `Promise.withResolvers` site idiom ở omp, 15/16 package khai `@types/bun` — **đều đúng khi đo lại**. Bảng "Bề mặt công khai" 25 dòng khớp 25/25 vị trí thật.

**Hai lỗi chặn (sẽ làm cổng ĐỎ khi bắt đầu gõ), chi tiết ở mục 1 và 2.**

---

## 1. CÁI GÌ THAY ĐỔI, QUAN SÁT ĐƯỢC

`omp` bắt đầu có gói `@oh-my-pi/pi-client` — một client gọi remote session qua **byte thô đóng khung CBOR**, trung lập với vận tải — với 27 test chạy thật trên Unix socket thật, và một importer duy nhất có thể `import { Client } from "@oh-my-pi/pi-client"`.

---

## 2. HAI LỖI CHẶN PHẢI SỬA TRONG ĐẶC TẢ TRƯỚC KHI GÕ

Không sửa file kế hoạch. Ghi ra ở đây và làm theo bản đúng.

### LỖI A — `toError` sẽ biến thành symbol không tồn tại, làm vỡ 2 file khác

Đặc tả (bước 8(d), dòng 1648) nói: *"xoá định nghĩa `toError` khỏi errors.ts và import nó từ `@oh-my-pi/pi-utils`"*. Bảng file cần chép cũng nói vậy. **Nhưng `toError` KHÔNG chỉ được dùng bên trong `errors.ts`** — nó là import ở hai file khác:

```
src/client.ts:32      import { ClientDisposedError, DisconnectedError, ServerError, toError } from "./errors.ts";
src/connection.ts:10  import { DisconnectedError, ServerError, toDisconnectedError, toError } from "./errors.ts";
```

và được gọi ở `client.ts:259, 295, 440` + `connection.ts:154, 197, 222`. Nếu làm đúng như đặc tả — xoá `export function toError` khỏi `errors.ts` và thay bằng `import { toError } from "@oh-my-pi/pi-utils"` (import **không** re-export) — thì `client.ts` và `connection.ts` vẫn `import { toError } from "./errors"` tới một tên không còn được export. `tsgo` đỏ ở 2 file, và `bun test` đỏ vì `errors.ts` không còn `toError` cho `toDisconnectedError` dùng.

Đặc tả còn tự mâu thuẫn: bảng va chạm (dòng 1628) viết *"giữ `toDisconnectedError` (hàm gọi nó) export từ cùng module — `connection.ts:10` và `unix.ts:11` đều import nó từ `"./errors"`"*. `connection.ts:10` cũng import `toError` ở **cùng dòng đó** — cột "cách giải quyết" không đề cập.

**Sửa đúng (thêm vào bước 8(d)):**

| file | dòng | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `src/connection.ts` | 10 | `import { DisconnectedError, ServerError, toDisconnectedError, toError } from "./errors.ts";` | `import { DisconnectedError, ServerError, toDisconnectedError } from "./errors";` **+ thêm dòng mới** `import { toError } from "@oh-my-pi/pi-utils";` |
| `src/client.ts` | 32 | `import { ClientDisposedError, DisconnectedError, ServerError, toError } from "./errors.ts";` | `import { ClientDisposedError, DisconnectedError, ServerError } from "./errors";` **+ thêm dòng mới** `import { toError } from "@oh-my-pi/pi-utils";` |

Tổng cộng thêm **2 dòng import**, không phải 1. Đây là lý do cột "bytes" của bảng không đổi — nó đếm file nguồn của pi, không đếm file sau sửa.

### LỖI B — `PromiseResolvers` là TYPE, không chỉ là hàm

Đặc tả (va chạm dòng 1629, bước 8(c)) nói: *"Rồi xoá specifier `type PromiseResolvers` khỏi import ở `connection.ts:11` (**dòng import đó trở thành rỗng** vì `promise.ts` không còn tồn tại)"*. **Sai.** `PromiseResolvers<ServerHello>` được dùng như một **kiểu** ở hai chỗ khác trong `connection.ts`:

```
connection.ts:25  | ({ state: "connecting"; handshake: PromiseResolvers<ServerHello> } & ActiveConnection)
connection.ts:29        handshake: PromiseResolvers<ServerHello> | undefined;
```

Đó là `ConnectionLifecycle` (L23–30), kiểu trạng thái của cả connection. Xoá import mà không thay 2 chỗ dùng đó ⇒ `tsgo` đỏ ở `connection.ts`.

Đặc tả cũng tự mâu thuẫn ở chỗ khác: bảng file cần chép (dòng 1542) nói `connection.ts` chép nguyên văn *"kể cả `ConnectionLifecycle` (L23-30)"* — tức là giữ nguyên hai chỗ dùng `PromiseResolvers` ấy. Không thể vừa giữ nguyên vừa xoá import.

**Sửa đúng:** thay `PromiseResolvers<ServerHello>` → `PromiseWithResolvers<ServerHello>` ở **L25 và L29**, rồi mới xoá cả dòng import L11. `PromiseWithResolvers<T>` là interface global của lib ES2024 — đã xác nhận có trong `node_modules/@typescript/native-preview-darwin-arm64/lib/lib.es2024.promise.d.ts:17`, và `tsconfig.base.json` của omp đặt `"lib": ["ES2024", ...]`. Hơn nữa omp **đã dùng tên này trần** ở `packages/agent/src/pause.ts:27` và `packages/ai/src/auth-broker/remote-store.ts:281`, nên đây là idiom sẵn có chứ không phải phát minh mới.

Tổng cộng thêm **2 sửa type** ngoài danh sách của đặc tả.

---

## 3. Bảng điểm sửa

Mọi "TRƯỚC" dưới đây trích từ file tôi vừa mở. Mọi "SAU" là hình dạng sau khi sửa.

### 3.1 `src/client.ts` — 14332 byte, 479 dòng

| dòng | symbol | TRƯỚC (nguyên văn từ file) | SAU |
| --- | --- | --- | --- |
| 18 | import chord | `} from "@earendil-works/chord";` | `} from "@oh-my-pi/chord";` |
| 19 | `BACKGROUND_CONTEXT` | `import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";` | `import { BACKGROUND_CONTEXT } from "@oh-my-pi/chord/context";` |
| 30 | import protocol | `} from "@earendil-works/pi-protocol";` | `} from "@oh-my-pi/pi-protocol";` |
| 31 | `Connection` | `import { Connection } from "./connection.ts";` | `import { Connection } from "./connection";` |
| 32 | `toError` — **LỖI A** | `import { ClientDisposedError, DisconnectedError, ServerError, toError } from "./errors.ts";` | `import { ClientDisposedError, DisconnectedError, ServerError } from "./errors";`<br>**+ dòng mới:** `import { toError } from "@oh-my-pi/pi-utils";` |
| 33 | `createPromiseResolvers` | `import { createPromiseResolvers } from "./promise.ts";` | **xoá hẳn dòng** |
| 41 | import types | `} from "./types.ts";` | `} from "./types";` |
| 248 | `#request` | `const { promise, resolve, reject } = createPromiseResolvers<T>();` | `const { promise, resolve, reject } = Promise.withResolvers<T>();` |

Giữ nguyên văn: 12 field `#` ở L63–74, `[Symbol.asyncDispose]` ở L394, `reconnect()` ở L134, `createClientServiceTransport` ở L448, `class Client` ở L62 (L62–L445, **418 dòng** — đặc tả ghi "448 dòng", xem mục 5).

### 3.2 `src/connection.ts` — 7691 byte, 245 dòng

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 9 | import protocol | `} from "@earendil-works/pi-protocol";` | `} from "@oh-my-pi/pi-protocol";` |
| 10 | `toError` — **LỖI A** | `import { DisconnectedError, ServerError, toDisconnectedError, toError } from "./errors.ts";` | `import { DisconnectedError, ServerError, toDisconnectedError } from "./errors";`<br>**+ dòng mới:** `import { toError } from "@oh-my-pi/pi-utils";` |
| 11 | promise | `import { createPromiseResolvers, type PromiseResolvers } from "./promise.ts";` | **xoá hẳn dòng** (nhưng xem LỖI B) |
| **25** | `ConnectionLifecycle` — **LỖI B** | `\| ({ state: "connecting"; handshake: PromiseResolvers<ServerHello> } & ActiveConnection)` | `... handshake: PromiseWithResolvers<ServerHello> } & ActiveConnection)` |
| **29** | `ConnectionLifecycle` — **LỖI B** | `handshake: PromiseResolvers<ServerHello> \| undefined;` | `handshake: PromiseWithResolvers<ServerHello> \| undefined;` |
| 12 | import transport | `import type { ByteTransport, ByteTransportFactory, ByteTransportHandlers } from "./transport.ts";` | `... from "./transport";` |
| 13 | import types | `import type { ConnectionState, ConnectionStateChange } from "./types.ts";` | `... from "./types";` |
| 72 | handshake resolver | `const handshake = createPromiseResolvers<ServerHello>();` | `const handshake = Promise.withResolvers<ServerHello>();` |

Giữ nguyên văn: `ConnectionLifecycle` L23–30 (ngoài 2 sửa type ở trên), chốt `MAX_UINT32` L50–56, hai chốt thứ tự handshake L146–148 và L182–185, `onStateChange({ state: "disconnected", error })` ở L239.

### 3.3 `src/errors.ts` — 965 byte, 34 dòng

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 1 | scope | `import type { ProtocolError, ProtocolErrorCode } from "@earendil-works/pi-protocol";` | `import type { ProtocolError, ProtocolErrorCode } from "@oh-my-pi/pi-protocol";` |
| — | `toError` | (không có) | **+ dòng mới ngay dưới L1:** `import { toError } from "@oh-my-pi/pi-utils";` |
| 27–29 | `toError` | `export function toError(error: unknown): Error {`<br>`    return error instanceof Error ? error : new Error(String(error));`<br>`}` | **xoá 3 dòng** |
| 31–34 | `toDisconnectedError` | `export function toDisconnectedError(error: unknown): DisconnectedError {`<br>`    const cause = toError(error);`<br>`    return cause instanceof DisconnectedError ? cause : new DisconnectedError(cause.message, cause);`<br>`}` | giữ nguyên văn, `.ts` đã bỏ từ chép |

Kết quả: **32 dòng** (34 − 3 + 1), xuất **4 symbol** thay vì 5. `ServerError` L3–11, `DisconnectedError` L13–18, `ClientDisposedError` L20–25 giữ nguyên — cả ba đều tự đặt `this.name`.

### 3.4 `src/unix.ts` — 9703 byte, 299 dòng

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 1 | namespace | `import { lstat, readdir } from "node:fs/promises";` | `import * as fs from "node:fs/promises";` |
| 3 | namespace | `import { join } from "node:path";` | `import * as path from "node:path";` |
| 9 | scope | `} from "@earendil-works/pi-protocol";` | `} from "@oh-my-pi/pi-protocol";` |
| 10 | `Client` | `import { Client } from "./client.ts";` | `import { Client } from "./client";` |
| 11 | errors | `import { DisconnectedError, ServerError } from "./errors.ts";` | `import { DisconnectedError, ServerError } from "./errors";` |
| 12 | transport | `import type { ByteTransport, ByteTransportFactory, ByteTransportHandlers } from "./transport.ts";` | `... from "./transport";` |
| 47 | call site | `names = await readdir(directory);` | `names = await fs.readdir(directory);` |
| 56 | call site | `return isServerId(serverId) ? [{ serverId, path: join(directory, name) }] : [];` | `... path: path.join(directory, name) }] : [];` |
| 69 | call site | `if (!(await lstat(candidate.path)).isSocket()) continue;` | `if (!(await fs.lstat(candidate.path)).isSocket()) continue;` |
| 247 | `timeout` | `let timeout: ReturnType<typeof setTimeout> \| undefined;` | `let timeout: NodeJS.Timeout \| undefined;` |

`node:net` (L2) **KHÔNG đổi** — không nằm trong danh sách của quy tắc Node module imports.

Giữ nguyên văn: `process.platform === "win32"` guard L99, `new Promise<ByteTransport>` L109, bể dò 16 probe L61–82, bỏ qua ENOENT qua `lstat` L69–74, `UnixByteTransport` L147–235 (field `#` ở L148–153, L162–165), `#writeTail` L153, ngưỡng byte tồn đọng L166–169, bộ phân giải ghi chờ callback-AND-drain L186–234, `new Client({...})` trong probe L240, `new Promise<never>` timeout L251, `.unref()` L256, bộ lọc lỗi 9 nhánh L262–273 (bao gồm `error instanceof DisconnectedError && error.cause === undefined` ở L266).

### 3.5 `src/types.ts` — 1139 byte, 32 dòng

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 1 | scope | `import type { ServiceSubscriptionSnapshot } from "@earendil-works/chord";` | `import type { ServiceSubscriptionSnapshot } from "@oh-my-pi/chord";` |
| 2 | scope | `import type { RpcTarget, SessionTarget } from "@earendil-works/pi-protocol";` | `import type { RpcTarget, SessionTarget } from "@oh-my-pi/pi-protocol";` |
| 3 | transport | `import type { ByteTransportFactory } from "./transport.ts";` | `import type { ByteTransportFactory } from "./transport";` |

32 dòng kiểu chép nguyên văn. Doc comment mang tính ràng buộc: L20 `/** Begin ordered update delivery after the caller has installed the snapshot. */`, L27 `/** Logical server identity expected at the physical endpoint. */`, L30 `/** Reports subscriber failures without allowing them to corrupt client state. */`.

### 3.6 `src/transport.ts` — 727 byte, 18 dòng — **CHÉP NGUYÊN VĂN, KHÔNG SỬA GÌ**

18 dòng, không import, không chuỗi scope, không specifier `.ts`. `ByteTransport` L1, `ByteTransportHandlers` L8, `ByteTransportFactory` L18 — cả ba khớp bảng bề mặt công khai.

### 3.7 `src/index.ts` — 428 byte, 12 dòng — **VIẾT LẠI TOÀN BỘ**

TRƯỚC (12 dòng, nguyên văn):
```ts
export { Client, createClientServiceTransport } from "./client.ts";
export { ClientDisposedError, DisconnectedError, ServerError } from "./errors.ts";
export type { ByteTransport, ByteTransportFactory, ByteTransportHandlers } from "./transport.ts";
export type {
    AttachmentChangeListener,
    ClientOptions,
    ConnectionState,
    ConnectionStateChange,
    ListenerErrorHandler,
    ServiceSubscription,
    Unsubscribe,
} from "./types.ts";
```

SAU (4 dòng):
```ts
export * from "./client";
export * from "./errors";
export * from "./transport";
export * from "./types";
```

Hệ quả có chủ ý: package root **mới** phơi bày `toDisconnectedError` (pi không export nó ở barrel tường minh). `toError` **không** xuất hiện — sau LỖI A nó chỉ là import trong `errors.ts`, `client.ts`, `connection.ts`, mà `export *` không bao giờ re-export tên được import. **Suy ra API đúng bằng MỘT tên; nói với reviewer.**

### 3.8 `src/promise.ts` — 582 byte, 16 dòng — **KHÔNG CHÉP**

Doc comment L7 nói: `/** Remove in favor of \`Promise.withResolvers()\` when the repository's TypeScript lib baseline moves to ES2024. */`. Baseline của omp **đã ở đó** (`"lib": ["ES2024", "DOM.AsyncIterable"]` trong `tsconfig.base.json`). Đừng giữ shim.

### 3.9 `test/support.ts` — 2303 byte, 84 dòng

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 7 | scope | `} from "@earendil-works/pi-protocol";` | `} from "@oh-my-pi/pi-protocol";` |
| 8 | specifier | `import type { ByteTransport, ByteTransportHandlers } from "../src/index.ts";` | `... from "../src/index";` |
| 14 | `#handlers` | `    private handlers?: ByteTransportHandlers;` | `    #handlers?: ByteTransportHandlers;` |
| 15 | `#decoder` | `    private decoder = new ClientMessageDecoder();` | `    #decoder = new ClientMessageDecoder();` |
| 16 | `#messageWaiters` | `    private readonly messageWaiters: Array<{ count: number; resolve: () => void }> = [];` | `    #messageWaiters: Array<{ count: number; resolve: () => void }> = [];` |
| 76 | `#resolveMessageWaiters` | `    private resolveMessageWaiters(): void {` | `    #resolveMessageWaiters(): void {` |

18 tham chiếu `this.X` trên **17 dòng** (L23, 24, 28, 30, 44, 51, 55, 56, 60, 61, 65, 66, 71, 72, 77, 78, 80) → `this.#X`. L44 chứa **hai** tham chiếu.

**ĐỂ TRẦN** các thành viên công khai — test đọc tất cả: `messages` (L11), `serverId` (L12), `clientCloseCount` (L13), và các method `connect` (L22), `waitForMessages` (L49), `send` (L54), `sendRaw` (L59), `disconnect` (L64), `error` (L70). L51 `return new Promise((resolve) => this.messageWaiters.push({ count, resolve }));` giữ nguyên dạng — một giá trị, không reject.

### 3.10 `test/client.test.ts` — 13677 byte, 384 dòng

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 1 | chord subpath | `import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";` | `import { BACKGROUND_CONTEXT } from "@oh-my-pi/chord/context";` |
| 8 | protocol | `} from "@earendil-works/pi-protocol";` | `} from "@oh-my-pi/pi-protocol";` |
| 9 | runner | `import { describe, expect, test, vi } from "vitest";` | `import { describe, expect, test } from "bun:test";` |
| 16 | specifier | `} from "../src/index.ts";` | `} from "../src/index";` |
| 17 | specifier | `import { MemoryByteServer } from "./support.ts";` | `import { MemoryByteServer } from "./support";` |
| 136 | `vi.waitFor` | `await vi.waitFor(() => expect(updates.map(({ type }) => type)).toEqual(["state"]));` | `await waitFor(() => expect(updates.map(({ type }) => type)).toEqual(["state"]));` |
| 155 | `vi.waitFor` | `await vi.waitFor(() => expect(updates).toHaveLength(3));` | `await waitFor(() => expect(updates).toHaveLength(3));` |

Thêm helper **CỤC BỘ** (đặc tả cấm tạo utility dùng chung cho 2 call site):
```ts
async function waitFor(assertion: () => void, timeoutMs = 1000): Promise<void> {
    const deadline = Bun.nanoseconds() + timeoutMs * 1e6;
    let lastError: unknown;
    for (;;) {
        try {
            assertion();
            return;
        } catch (error) {
            lastError = error;
        }
        if (Bun.nanoseconds() > deadline) throw lastError;
        await Bun.sleep(5);
    }
}
```

Giữ nguyên văn: **17 khối** `test(...)`/`describe(...)` (15 test + 2 describe), không phải 20 như đặc tả ghi — xem mục 5.

### 3.11 `test/unix-transport.test.ts` — 4765 byte, 147 dòng

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 1 | namespace | `import { mkdtemp, rm } from "node:fs/promises";` | `import * as fs from "node:fs/promises";` |
| 3 | namespace | `import { join } from "node:path";` | `import * as path from "node:path";` |
| 4 | chord | `import { parseServiceCall } from "@earendil-works/chord";` | `import { parseServiceCall } from "@oh-my-pi/chord";` |
| 5 | protocol | `import { ClientMessageDecoder, encodeServerMessage, PROTOCOL_VERSION } from "@earendil-works/pi-protocol";` | `... from "@oh-my-pi/pi-protocol";` |
| 6 | runner | `import { afterEach, describe, expect, test } from "vitest";` | `import { afterEach, expect, test } from "bun:test";` (**bỏ `describe`** — file này KHÔNG có `describe` nào) |
| 7 | specifier | `import { Client } from "../src/index.ts";` | `import { Client } from "../src/index";` |
| 8 | specifier | `import { createUnixTransportFactory } from "../src/unix.ts";` | `import { createUnixTransportFactory } from "../src/unix";` |
| 16 | call site | `const directory = await mkdtemp(join("/tmp", "pi-client-transport-"));` | `const directory = await fs.mkdtemp(path.join("/tmp", "pi-client-transport-"));` |
| 18 | call site | `return join(directory, "pi.sock");` | `return path.join(directory, "pi.sock");` |
| 45 | call site | `await Promise.all([...tempDirectories].map((directory) => rm(directory, { recursive: true, force: true })));` | `... fs.rm(directory, { ... }) ...` |

Giữ nguyên văn: 4 test, `afterEach` L33–47 (dọn socket → server → thư mục tạm), `new Promise<void>` ở L27 (`server.listen`) và L39 (`server.close`) — cả hai do sự kiện điều khiển, `Promise.withResolvers` không áp dụng. `node:net` L2 không đổi.

### 3.12 `test/unix.test.ts` — 6513 byte, 184 dòng

| dòng | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| 3 | namespace | `import { lstat, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";` | `import * as fs from "node:fs/promises";` |
| 5 | namespace | `import { join } from "node:path";` | `import * as path from "node:path";` |
| 6 | runner | `import { afterEach, describe, expect, test } from "vitest";` | `import { afterEach, describe, expect, test } from "bun:test";` |
| 7 | server | `import { Server as RuntimeServer } from "../../server/src/server.ts";` | `import { Server as RuntimeServer } from "@oh-my-pi/pi-server";` |
| 8 | server | `import { createTestServerServices } from "../../server/src/testing/host.ts";` | `import { createTestServerServices } from "@oh-my-pi/pi-server/testing/host";` |
| 9 | server | `import { createUnixListener } from "../../server/src/transports/unix/listener.ts";` | `import { createUnixListener } from "@oh-my-pi/pi-server/transports/unix/listener";` |
| 10 | specifier | `import { discoverUnixServers } from "../src/unix.ts";` | `import { discoverUnixServers } from "../src/unix";` |
| 19, 33, 89, 95, 107, 108, 114, 115, 116, 125, 136, 142, 146, 153, 166, 179, 180 | 21 call site | `join(`, `mkdtemp(`, `rm(`, `writeFile(`, `mkdir(`, `lstat(` | `path.join(`, `fs.mkdtemp(`, `fs.rm(`, `fs.writeFile(`, `fs.mkdir(`, `fs.lstat(` |

`node:child_process` L1 và `node:net` L4 **KHÔNG đổi**.

Giữ nguyên văn: 8 test, 5 `Set` cấp module (L12–16: `tempDirectories`, `servers`, `rawServers`, `rawSockets`, `children`), `afterEach` L70–…, `fork(new URL("fixtures/stale-socket-server.mjs", import.meta.url), [path], {` ở **L126**.

### 3.13 `test/fixtures/stale-socket-server.mjs` — 246 byte, 9 dòng — **CHÉP NGUYÊN VĂN**

9 dòng JS thuần, chỉ `node:net` + `process.argv`. Không thay đổi đường dẫn tương đối — `unix.test.ts:126` resolve nó bằng `new URL(..., import.meta.url)`.

### 3.14 `package.json` (mới, dựng từ `packages/wire/package.json`)

| mục | SAU |
| --- | --- |
| `name` | `"@oh-my-pi/pi-client"` |
| `main` / `types` | `"./src/index.ts"` (xoá `./dist/index.js` + `./dist/index.d.ts`) |
| `exports` | `"."` → `./src/index.ts`; `"./unix"` → `./src/unix.ts`; `"./package.json"` → `./package.json` |
| `scripts` | 5 script, chép nguyên văn từ wire: `check`, `check:types` (`tsgo -p tsconfig.json --noEmit`), `lint`, `fix`, `fmt` |
| `dependencies` | `@oh-my-pi/chord`, `@oh-my-pi/pi-protocol`, `@oh-my-pi/pi-utils` — cả ba `"catalog:"` |
| `devDependencies` | chỉ `"@types/bun": "catalog:"` (xoá `shx`, `vitest`) |
| `engines` | `{"bun": ">=1.3.14"}` |
| `sideEffects` | `false` (giữ) |

**XOÁ hẳn** khối `scripts` của pi — nó chứa `build: tsc -p tsconfig.build.json` và `typecheck: tsc -p tsconfig.test.json`, mà AGENTS.md cấm `tsc` tuyệt đối.

### 3.15 `tsconfig.json` (mới, 4 dòng — chép từ `packages/wire/tsconfig.json`)

```json
{
	"extends": "../tsconfig.workspace.json",
	"include": ["src", "test"]
}
```

### 3.16 `LICENSE` (mới, 1144 byte) — **LÀM TRƯỚC MỌI BYTE NGUỒN**

Chép `/Users/tranquangdang21/Projects/pi-ref/LICENSE` rồi chèn hai dòng sau dòng của Mario Zechner. Dạng cuối, khớp byte-identical với `LICENSE` gốc của omp và 4 file pi-derived (`packages/{agent,ai,coding-agent,tui}/LICENSE`, đều 1144 byte — đã đo):

```
MIT License

Copyright (c) 2025 Mario Zechner
Copyright (c) 2025-2026 Can Bölük
Copyright (c) 2026 Stencil Labs, Inc.

Permission is hereby granted, free of charge, ...
```

Tám package first-party (`catalog`, `mnemopi`, `natives`, `omptype`, `snapcompact`, `stats`, `utils`, `wire`) đều 1111 byte và **không** mang dòng Mario Zechner — đừng lấy wire làm khuôn cho file này. Thông báo MIT permission phải nguyên văn.

Đồng thời thêm một dòng `@earendil-works/pi-client` vào phần pi-derived của `THIRD-PARTY-NOTICES.txt`, theo mẫu mục ở **dòng 227** (`Copyright (c) 2025 Mario Zechner`).

### 3.17 `README.md` (mới, 4178 byte) — 5 sửa scope

| dòng | TRƯỚC | SAU |
| --- | --- | --- |
| 1 | `# @earendil-works/pi-client` | `# @oh-my-pi/pi-client` |
| 6 | `import { Client, type ByteTransportFactory } from "@earendil-works/pi-client";` | `... from "@oh-my-pi/pi-client";` |
| 51 | `import { Client } from "@earendil-works/pi-client";` | `... from "@oh-my-pi/pi-client";` |
| 52 | `import { createUnixTransportFactory } from "@earendil-works/pi-client/unix";` | `... from "@oh-my-pi/pi-client/unix";` |
| 64 | `import { discoverUnixServers } from "@earendil-works/pi-client/unix";` | `... from "@oh-my-pi/pi-client/unix";` |

Ngoài phép đổi scope: định hướng lại khung "experimental" (L3, L36) cho omp, và **thêm một dòng** nói `@oh-my-pi/pi-client` hiện KHÔNG có consumer nào trong omp. Giữ nguyên danh sách hợp đồng transport handler (L38–42), đoạn ngữ nghĩa discovery Unix, và đoạn kết về `maxFrameLength`/`maxPendingBytes` — đó là hợp đồng hành vi, không phải tiếp thị.

### 3.18 `CHANGELOG.md` (mới) — **KHÔNG CHÉP stub của pi**

Stub của pi là 33 dòng, phần lớn là tiêu đề phiên bản rỗng, cộng hai mục 0.84.0 tham chiếu PR upstream #7708. Theo AGENTS.md, changelog soạn mới dưới `## [Unreleased]`.

---

## 4. Các bước, mỗi bước có neo đã kiểm

Xanh = neo tôi vừa mở và đọc. Đỏ = phải sửa so với đặc tả (mục 2).

1. **Pháp lý trước.** Chép `pi-ref/LICENSE` → `packages/client/LICENSE` + 2 dòng bản quyền omp. Thêm dòng vào `THIRD-PARTY-NOTICES.txt` quanh **L227**. Neo: `THIRD-PARTY-NOTICES.txt:227` (đã đọc: `Copyright (c) 2025 Mario Zechner`).
2. **Ghi lại baseline cổng.** `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers` phải exit 0 trước khi bắt đầu. Neo: `package.json:90` — `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`.
3. **Xác nhận tiền đề.** Dừng nếu chưa có. Đã đo: `packages/{chord,protocol,server}` MISSING, `esbuild` MISSING trong `node_modules`.
4. **Khung package.** `mkdir -p packages/client/src packages/client/test/fixtures`. Viết `tsconfig.json` 4 dòng khớp `packages/wire/tsconfig.json` (đã đọc, khớp tuyệt đối).
5. **Viết `package.json`** từ `packages/wire/package.json` (đã đọc). Thêm 3 dòng catalog vào `package.json:12` (`"catalog": {`) — version catalog thật là **`18.4.0`**, không phải 18.3.3 như đặc tả ghi.
6. **Chép nguyên văn 7 file src.** `transport, types, errors, connection, unix, client, index` = 34.985 byte (đã đo). Không `promise.ts`.
7. **Không tạo `promise.ts`.**
8. **Sửa src**, theo thứ tự:
   - (a) SCOPE — 8 site: `client.ts:18,19,30`; `connection.ts:9`; `errors.ts:1`; `types.ts:1,2`; `unix.ts:9`. Neo đã đọc từng dòng.
   - (b) EXTENSIONS — bỏ `.ts` khỏi **16** specifier tương đối trong `src/` (đã đếm bằng `grep -rho 'from "\.[^"]*\.ts"' src/ | wc -l` → 16).
   - (c) PROMISE — `client.ts:248` → `Promise.withResolvers<T>()`; `connection.ts:72` → `Promise.withResolvers<ServerHello>()`; **và sửa LỖI B**: `connection.ts:25,29` → `PromiseWithResolvers<ServerHello>` trước khi xoá import L11.
   - (d) UTILS — **và sửa LỖI A**: thêm `import { toError } from "@oh-my-pi/pi-utils";` vào **`errors.ts`, `client.ts:32`, `connection.ts:10`** (3 file, không phải 1); xoá định nghĩa ở `errors.ts:27-29`.
   - (e) BARREL — `index.ts` thành 4 star re-export.
   - (f) TYPES — `unix.ts:247` → `NodeJS.Timeout`.
   - (g) NAMESPACE — `unix.ts:1,3` + 3 call site.
   - **Đọc diff từng dòng trước khi đi tiếp.**
9. **Chép + chuyển 5 file test.** Specifier: 3 protocol (`support.ts:7`, `client.test.ts:8`, `unix-transport.test.ts:5`), 2 chord (`client.test.ts:1`, `unix-transport.test.ts:4`) — đã đọc cả 5. Bỏ `.ts` khỏi **9** specifier tương đối (đã đếm). Namespace: `unix.test.ts:3,5` (**21** call site) + `unix-transport.test.ts:1,3` (**4** call site) — đã đếm bằng `grep -o`. Runner → `bun:test`. Thêm `waitFor` cục bộ vào `client.test.ts`. Chuyển 4 `private` + 18 `this.X` của `support.ts`.
10. **Grep tiền kiểm** — xem mục 5.
11. **`bun run check:ts`** — phải thấy dòng `@oh-my-pi/pi-client:check:types` trong output.
12. **`cd packages/client && bun test`** — 27/27.
13. **Formatter + linter.** `bun run fix:tools`. Đọc lại mọi file formatter đổi — nó có thể bọc lại khối import dài ở bước 8.
14. **Viết `README.md` + `CHANGELOG.md`**, rà `git status`: đúng 7 file src + 5 file test + `package.json` + `tsconfig.json` + `LICENSE` + `README.md` + `CHANGELOG.md` + dòng catalog ở package.json gốc. `tsconfig.build.json`, `tsconfig.test.json`, `vitest.config.ts`, `src/promise.ts` vắng mặt.

---

## 5. Hợp đồng test

| file | số khối `test()` | `describe()` | tổng |
| --- | --- | --- | --- |
| `test/client.test.ts` | 15 | 2 | 17 |
| `test/unix-transport.test.ts` | 4 | 0 | 4 |
| `test/unix.test.ts` | 8 | 1 | 9 |
| | | | **27** |

**Đặc tả ghi "25/25 test case pass (14 + 3 + 8)" — SAI. Số thật là 27 (15 + 4 + 8).** Tôi đã đếm bằng `grep -n 'test('` trên từng file và liệt kê từng dòng. Tương tự, đặc tả ghi `client.test.ts` có "20 khối `test(...)` / `describe(...)`" — thật là **17**; và ghi `unix-transport.test.ts` "cả 3 test" — thật là **4**.

**Các case và điều người dùng thấy nếu hồi quy** (tên test lấy nguyên văn từ file):

- `requires a canonical UUIDv4 server identity` — `new Client({serverId: "không-phải-uuid"})` phải ném `TypeError`. Hồi quy: một endpoint vật lý sai vẫn kết nối được và client tự tin nói chuyện với server khác.
- `connects only to the expected logical server` — hello mang `serverId` lệch ⇒ handshake bị từ chối. Hồi quy: nhầm server là route được mọi tin nhắn tới sai máy.
- `buffers service updates until the subscription snapshot arrives` — cập nhật về trước snapshot phải bị xếp hàng, không rò. Hồi quy: decoder nhận update trước state nền và sinh state hỏng.
- `cancels one untyped RPC request without disconnecting` — huỷ một request giữ kết nối. Hồi quy: abort đóng luôn transport, mất mọi request đang chờ.
- `rejects pending requests and reconnects through a fresh transport` — `Client.reconnect()` (`client.ts:134`) phải lấy socket MỚI qua factory. Hồi quy: dùng lại socket đã chết, reconnect âm thầm không làm gì.
- `rejects server data delivered before the client hello is sent` — thứ tự handshake. Hồi quy: chấp nhận frame trước hello, đọc state chưa khởi tạo.
- `disconnects on invalid or truncated server framing` — frame hỏng ⇒ ngắt. Hồi quy: decoder nuốt frame cắt, treo im lặng thay vì báo.
- `rejects pending requests after disconnect or disposal` — promise pending reject khi disconnect/dispose. Hồi quy: promise treo vĩnh viễn, không có `await` nào bao giờ quay lại.
- `rejects truncated final frames through Client` (unix-transport) — cắt frame giữa chừng qua client thật. Hồi quy: chỉ kiểm tra frame hoàn chỉnh.
- `rejects connection attempts to missing sockets` — socket không tồn tại phải reject, không treo.
- `limits concurrent probes to 16` (`unix.test.ts:149`) — bể dò 16 probe song song. Hồi quy: một thư mục 500 socket làm 500 kết nối cùng lúc.
- `ignores stale sockets without deleting them` — probe sạn bị bỏ qua qua `lstat` ENOENT và **không** xoá file socket.
- `ignores an endpoint that closes before its handshake` — filter 9 nhánh ở `unix.ts:262-273`. Hồi quy: một mã lỗi bị sót khiến **toàn bộ** discovery reject, chặt mọi socket trong thư mục.
- `propagates unexpected filesystem errors` — `ENOTDIR` phải nổi lên, không bị nuốt. Đây là case âm tính giữ filter im lặng với lỗi thật.

**Grep tiền kiếm** (mỗi cái phải rỗng sau khi migrate — tôi đã chạy trên cây `pi` để xác nhận chúng **không rỗng ngay từ đầu**, tức là có thật sự canh):

```bash
grep -rn '@earendil-works' packages/client/            # 0  (đo trên pi: 13)
grep -rn 'from "[.][^"]*\.ts"' packages/client/src packages/client/test   # 0  (pi: 25)
grep -rn 'ReturnType<' packages/client/src             # 0  (pi: 1 — unix.ts:247)
grep -rn 'vitest' packages/client/                    # 0  (pi: 3)
grep -n 'tsc ' packages/client/package.json           # 0  (pi: 2)
ls packages/client/src/promise.ts packages/client/vitest.config.ts \
   packages/client/tsconfig.build.json packages/client/tsconfig.test.json   # "No such file" ×4
```

Đối chứng dương: `grep -rn 'Promise.withResolvers' packages/client/src` → **2**.

> **SỬA MỘT CON SỐ TRONG ĐẶC TẢ:** đặc tả viết `grep -rc '#handlers' packages/client/test/support.ts` → `1`. **`grep -c` đếm DÒNG, không đếm lần xuất hiện.** Sau khi chuyển `#`, `this.#handlers` nằm trên **10 dòng** (L23, 44, 55, 56, 60, 61, 65, 66, 71, 72 — L44 có hai lần, tổng 11 lần xuất hiện). Tôi đã dựng lại file thật và chạy `grep -c` để xác nhận: trả **10**, không phải 1. Muốn đếm lần xuất hiện thì dùng `grep -o '#handlers' packages/client/test/support.ts | wc -l` → **11**.

---

## 6. Cổng

### 6.1 Cổng như đặc tả viết

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
bun run check:ts
cd packages/client && bun test
```

**Cổng (1) CÓ ĐỎ ĐƯỢC — nhưng chỉ một phần, và phần hỏng là phần quan trọng nhất.**

`check:ts` = `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`.

Phần **ĐỎ ĐƯỢC**: `check:tools` chạy `oxlint .` và `oxfmt --check` trên `packages/*/src/**` và `packages/*/{test,bench,examples,scripts}/**` — lint sai, sai format, `private` sót, `ReturnType<` sót, `@earendil-works` sót, `.ts` sót đều bị bắt. `oxfmt --check` cũng bắt sai thụt độ.

Phần **KHÔNG ĐỎ ĐƯỢC**: `--if-present` nghĩa là package không khai `check:types` (hoặc sai chính tả) bị **bỏ qua lặng lẽ**, cổng vẫn xanh. Một package hỏng đi xanh. Đây đúng là loại cổng "luôn xanh tệ hơn không có cổng" mà đặc tả tự cảnh báo — và với `client` nó còn tệ hơn nữa vì **`check:ts` không kiểm tra hành vi nào cả**: toàn bộ logic rủi ro (chốt thứ tự handshake, cuộc đua abort/cancel, bộ phân giải backpressure, filter 9 nhánh) là code chép nguyên văn, nên typecheck không bao giờ đỏ vì nó.

Cổng (2) `bun test` **ĐỎ ĐƯỢC thật** — 27 test chạy socket thật, fork tiến trình thật, timeout thật.

### 6.2 Cổng viết lại, để ĐỎ THẬT

Cổng (1) giữ nguyên như một lớp lint, **thêm hai lớp bắt được thứ nó bỏ qua**:

```bash
cd /Users/tranquangdang21/Projects/ultraworkers

# Lớp A — cổng gốc, phải exit 0
bun run check:ts

# Lớp B — chứng minh package KHÔNG bị --if-present bỏ qua.
# Đây là lớp làm cổng đỏ được ở phần typecheck.
bun run --filter '@oh-my-pi/pi-client' check:types
test -f packages/client/package.json
node -e 'const s=require("./packages/client/package.json").scripts;
         if(!s?.["check:types"]) { console.error("check:types MISSING — --if-present sẽ bỏ qua im lặng"); process.exit(1); }
         if(JSON.stringify(s).includes("tsc ")) { console.error("tsc bị cấm"); process.exit(1); }
         console.log("check:types present:", s["check:types"]);'

# Lớp C — cổng hành vi: 27 test trên socket thật
cd packages/client && bun test
```

**Lớp B là câu trả lời cụ thể cho "cổng này có đỏ được không":** không phải bằng việc *nhìn* output có dòng `@oh-my-pi/pi-client:check:types` (đặc tả yêu cầu, và việc nhìn bằng mắt là thứ dễ trượt), mà bằng cách **gọi thẳng `check:types` không có cờ `--if-present`**. Gọi thẳng thì `tsgo` chạy trên `packages/client/tsconfig.json`; sai khuôn, thiếu script, hoặc bất kỳ lỗi type nào trong 8 file src ⇒ **exit ≠ 0, cổng đỏ**. Đây là phép kiểm không thể bị lách: nó không dựa vào `--if-present` của root.

**Bằng chứng Lớp B thật sự đỏ được — đã chạy, không phải suy luận:**

| phép kiểm | kết quả | exit |
| --- | --- | --- |
| `bun run --filter '@oh-my-pi/pi-wire' check:types` (package có thật) | `@oh-my-pi/pi-wire check:types: Exited with code 0` | **0** |
| `bun run --filter '@oh-my-pi/pi-nonexistent-zzz' check:types` | `error: No packages matched the filter` | **1** |
| `tsgo -p <tsconfig lỗi> --noEmit` với `export const x: number = "not a number"` | `error TS2322: Type 'string' is not assignable to type 'number'.` | **1** |

Cả ba chiều đã kiểm. Điểm mấu chốt là hàng thứ hai: **package không tồn tại trả exit 1**, nên Lớp B không thể xanh trong im lặng khi `packages/client` chưa được tạo hoặc bị đặt sai tên. (Đây đúng là cái làm một cổng "luôn xanh" hỏng — đã kiểm thay vì tin.)

Khi thực thi, để tự chứng minh Lớp B đỏ được: sửa `packages/client/tsconfig.json` thành sai (đổi `extends` sang đường dẫn không tồn tại), chạy Lớp B, quan sát exit ≠ 0, rồi trả lại.

**Còn `bun test` ở cấp root?** Đặc tả ghi môi trường đã được gỡ 2026-09-29 sau `brew install ninja` + build natives: `bun test packages/utils` → 743 pass / 10 skip / 0 fail. **Tôi chưa chạy lại** trong phiếu này. Nếu lúc thực thi suite root vẫn đỏ vì native addon, hãy ghi kết quả theo lời gọi cục bộ gói và nói thẳng trong PR rằng không chạy được suite root trên máy này. **Đừng nói suite root xanh khi bạn không quan sát được điều đó.**

---

## 7. Cạm bẫy riêng của work item này

1. **`toError` không chỉ là hàm của `errors.ts` — nó là import ở 2 file khác (LỖI A).** Đây là cái bẫy số 1. Hai file `client.ts:32` và `connection.ts:10` import nó từ `"./errors"`. Xoá `export` khỏi `errors.ts` mà không sửa hai dòng đó là `tsgo` đỏ ngay. Đặc tả tự mâu thuẫn: vừa bảo xoá, vừa nói `connection.ts:10` import nó từ `"./errors"` mà không nói sửa. Import không re-export — đó là mấu chốt.

2. **`PromiseResolvers` là TYPE ở `ConnectionLifecycle`, không chỉ là hàm (LỖI B).** Xoá import `connection.ts:11` mà không sửa L25/L29 là `tsgo` đỏ. Nhớ `Promise.withResolvers()` giải quyết **call site**; nó không tự động đổi **type annotation**. Tên thay thế là `PromiseWithResolvers` (khác `Promise.withResolvers` một chữ `P` và không có dấu chấm) — và omp đã dùng nó trần ở `packages/agent/src/pause.ts:27`.

3. **Cổng gốc không đỏ trên phần quan trọng nhất.** `--if-present` nuốt package không có `check:types`. Thêm nữa, `client` là package **copy nguyên văn** — không có typecheck nào bắt được hồi quy hành vi trong code chép. Đó là lý do Lớp B ở mục 6.2 tồn tại.

4. **Số test trong đặc tả sai (25 → 27), và số khối trong `client.test.ts` sai (20 → 17).** Ai đó chạy `bun test` thấy 27/27 rồi tưởng plan sai sẽ đi tìm test bị mất — hoặc tệ hơn, chấp nhận 25/25 vì "25 là con số plan nói". Cả hai đều tệ.

5. **`grep -c` đếm DÒNG, không đếm lần xuất hiện.** Cổng `grep -rc '#handlers' → 1` sẽ cho 10. Đã dựng lại file thật và chạy để chứng minh.

6. **Đếm đúng 8 site scope, không phải "8 import statement".** `client.ts:20-30` là MỘT câu lệnh `import {` mở ở L20 và đóng ở L30, và `connection.ts:2-9` tương tự. Sửa ở dòng đóng, xoá cả khối 11 dòng sẽ mất 9 symbol.

7. **`unix.ts` là file duy nhất chạm `NodeJS.Timeout` và `node:net`.** `unix.ts:247` là `ReturnType<` DUY NHẤT của cả gói (đã đo: `grep -rn 'ReturnType<' src/ test/` → 1 hit). Kiểu đúng là `NodeJS.Timeout` — xem mẫu thật ở `packages/coding-agent/src/collab/relay-client.ts:100` (`#backpressureDrainTimer: NodeJS.Timeout | undefined;`). `.unref()` ở L256 cần kiểu này.

8. **`test/unix.test.ts` là file biến client thành gói thứ 3 trong chuỗi.** Nó import ba subpath của `@oh-my-pi/pi-server`. Nếu server chưa có hoặc đã gộp subpath, file này không viết được. Kiểm tra exports map của server **trước khi** xếp lịch.

9. **`fork()` + `process.send` trong `bun test`.** `bun test` không chạy mô hình tiến trình của vitest. `stale-socket-server.mjs` fork tại `unix.test.ts:126` và dùng `process.send` là test **nhiều khả năng nhất phải làm lại**. Fixture phải giữ nguyên đường dẫn tương đối để `new URL(..., import.meta.url)` resolve được.

10. **`DisconnectedError` mang `cause` tuỳ chọn, và `unix.ts:266` phụ thuộc vào điều đó.** `error instanceof DisconnectedError && error.cause === undefined` là cách duy nhất phân biệt socket chết với lỗi thật. Bỏ dây `cause` ⇒ socket chết ném lỗi giữa lúc discovery thay vì bị lọc đi, và `ignores an endpoint that closes before its handshake` đỏ.

11. **Suy ra sự vắng mặt bằng `grep` hẹp rồi đem ra khẳng định về cả hệ thống.** Bài học đã được ghi trong chính file kế hoạch (mục "ĐÍNH CHÍNH 2026-09-28", lượt 2) sau khi M4 dính lỗi này ở dsh. Với câu hỏi "omp có làm được không", hãy **chạy nó** đừng grep. Cụ thể ở đây: đừng kết luận "`bun test` ở cấp package sẽ chạy được" chỉ vì không thấy import native — hãy chạy.

12. **Đừng "cải thiện" code đã chép.** Chế độ hỏng nguy hiểm nhất không phải lỗi compile mà là hồi quy hành vi **lặng lẽ**: đơn giản hoá đường abort thành reject thuần cục bộ (rò một request mồ côi phía server), hoặc phân giải `#write` chỉ trên callback ghi socket (hỏng framed message dưới backpressure). Chép trước, chỉ sửa đúng các dòng đã liệt kê, đọc diff từng dòng.

---

## 8. Bảng neo hỏng (tổng hợp)

| neo trong đặc tả | đặc tả nói | thực tế | mức |
| --- | --- | --- | --- |
| `packages/client/src/connection.ts:11` | "dòng import đó trở thành rỗng" sau khi xoá `type PromiseResolvers` | `PromiseResolvers<ServerHello>` còn được dùng như TYPE ở **L25 và L29** (`ConnectionLifecycle`) | **CHẶN** — LỖI B |
| bước 8(d) | thêm `import { toError }` vào errors.ts | `toError` còn được import từ `"./errors"` ở `client.ts:32` và `connection.ts:10`, dùng ở 6 call site | **CHẶN** — LỖI A |
| cổng hoàn thành #2 | "25/25 test case pass (14 + 3 + 8)" | **27** test (15 + 4 + 8) | sai số |
| bảng file `client.test.ts` | "20 khối `test(...)` / `describe(...)`" | **17** (15 test + 2 describe) | sai số |
| bảng file `unix-transport.test.ts` | "Cả 3 test port nguyên vẹn" | **4** test | sai số |
| mục Xác minh | `grep -rc '#handlers' ... → 1` | `grep -c` đếm dòng ⇒ **10** (11 lần xuất hiện) | cổng đo sai |
| bước 2, 11, Xác minh | `root package.json:94` (`check:ts`) | dòng **90** | neo lệch 4 |
| mục Bề mặt công khai | "`Client` là class 448 dòng" | class `Client` = L62–**L445** = **418 dòng**; 448 là dòng của `createClientServiceTransport` | nhầm số dòng với số dòng neo |
| mục Dependency mới | chord/protocol/pi-utils ở `18.3.3` | catalog thật của omp là **`18.4.0`** (đo tại `package.json:19-29`) | phiên bản lệch |
| va chạm (dòng 1635) | `AuthBrokerClient` ở `packages/ai/src/auth-broker/client.ts:129` | dòng **130** | neo lệch 1 |
| va chạm (dòng 1635) | `AnthropicUserProfilesClient` (`:115`) — đọc là cùng file `anthropic-client.ts` | nó ở file **khác**: `packages/ai/src/providers/anthropic-user-profiles.ts:115` | neo trỏ nhầm file |
| mục Bề mặt công khai | `packages/utils/src/index.ts:41` re-export `toError` | dòng 41 là `export * from "./type-guards";` — **đúng** | ✅ không lỗi |

Ngoài ra, ba neo trong bảng file trỏ vào vùng đúng-nhưng-lệch-biên (không sai nội dung, chỉ không khớp chính xác): `unix-transport.test.ts` "afterEach (L27-48)" — `afterEach` thật ở **L33-47** (L27 là `await new Promise<void>` trong helper `listen`); `unix.test.ts` "afterEach tại L183+" — `afterEach` thật ở **L70**; `client.ts` "rào hai hàng đợi tại L191-236" — vùng 191-236 đúng là phần `subscribe` với `queued`/`queuedWireUpdates`, nhưng rào thật nằm ở L200-205.
