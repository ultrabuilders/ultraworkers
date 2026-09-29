# PHIẾU TRIỂN KHAI — W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md` §`## W2.` (dòng 468)
**Cây:** `/Users/tranquangdang21/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `65cc6c1`
**Ngày kiểm tra neo:** 2026-09-29. Mọi dòng trong phiếu này đã được `sed -n "<n>p"` mở ra đọc, không đoán.

> **Cảnh báo đầu phiếu, đọc trước khi gõ bất cứ dòng nào:**
> **7 neo trong work item sai số dòng trên cây này**, lệch từ +4 đến +128 dòng. Số dòng trong plan là của một checkout cũ hơn. Dùng đường dẫn + tên symbol để tìm, đừng dùng số dòng của plan. Bảng neo đúng ở mục 7.
> **Cổng `bun run check:ts` trong plan không bao giờ xanh** trên cây này (5 lỗi type có sẵn trong `@oh-my-pi/collab-web`, không liên quan W2). Đừng dùng nó. Cổng thay thế đã được chứng minh đi-được-đỏ ở mục 5.

---

## 1. Cái gì thay đổi, quan sát được

Một teardown callback đăng ký bởi extension (hoặc một settings-listener unsubscribe) ném lỗi giờ không còn làm hỏng phần còn lại của chuỗi tắt session — `Ctrl-C` / `/exit` vẫn ghi được draft, vẫn giải phóng job bash nền, vẫn bắn event `session_shutdown` của extension; và teardown callback chạy theo thứ tự đăng-sau-chạy-trước thay vì thứ tự thuận.

Người dùng không thấy gì ngoài `~/.omp/logs/omp.YYYY-MM-DD.log` có thêm một dòng warn `Disposer threw during drain; continuing`. Đây là hardening nội bộ, không phải tính năng.

---

## 2. Bảng điểm sửa

Cột TRƯỚC trích nguyên văn từ file thật (dấu thụt là **tab**, đã kiểm bằng `cat -A`; cả bốn dòng đều thụt 3 tab).

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/utils/disposers.ts` | `drainDisposers` (mới) | *(file không tồn tại)* | `export function drainDisposers(list: Array<() => void>): void` — vòng `while (list.length > 0)` + `pop()` + try/catch từng cái + `logger.warn`, không bao giờ ném lại |
| `packages/coding-agent/src/session/agent-session.ts:5104` | `beginDispose()` (mở tại `:5102`) | `for (const dispose of this.#disposers.splice(0)) dispose();` | `drainDisposers(this.#disposers);` |
| `packages/coding-agent/src/session/agent-session.ts:5346` | `#doDispose()` (mở tại `:5268`) | `for (const dispose of this.#disposers.splice(0)) dispose();` | `drainDisposers(this.#disposers);` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1376` | `disposeFileFallbacks()` | `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();` | `drainDisposers(this.#fileFallbackDisposers);` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112` | `disposeComposerShapes()` | `for (const dispose of this.#composerShapeDisposers.splice(0)) dispose();` | `drainDisposers(this.#composerShapeDisposers);` |
| `packages/coding-agent/src/session/agent-session.ts:251` | import | *(đứng trước `import { parseCommandArgs } from "../utils/command-args";`)* | `import { drainDisposers } from "../utils/disposers";` |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:30` | import | *(đứng trước `import { addFileDeleteFallback, addFileWriteFallback } from "../../tools/file-write-fallback";`)* | `import { drainDisposers } from "../../utils/disposers";` |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:37` | import | *(đứng trước `import { getEditorCommand, openInEditor } from "../../utils/external-editor";`)* | `import { drainDisposers } from "../../utils/disposers";` |
| `packages/coding-agent/test/disposer-drain.test.ts` | 3 test (mới) | *(file không tồn tại)* | xem nguyên văn ở mục 4 |
| `packages/coding-agent/CHANGELOG.md:7` | `### Fixed` (mới) | *(chưa có)* | `- Fixed session teardown aborting early when a registered extension teardown callback throws.` |

**Lưu ý về bảng điểm sửa — thứ tự quan trọng.** Ba dòng import phải được thêm **SAU CÙNG**, không phải giữa lúc sửa call-site. Tôi đã thử: chèn import trước làm `agent-session.ts:5104 → 5105`, `:5346 → 5347`, `runner.ts:1376 → 1377`, `extension-ui-controller.ts:112 → 113`. Nếu bạn sửa call-site theo số dòng rồi thêm import, bạn vẫn ổn; nếu thêm import trước rồi sửa theo số dòng cũ, bạn sửa nhầm dòng. Sửa call-site trước, import sau.

### Nội dung file mới `src/utils/disposers.ts` (đã chạy thật, 3/3 test xanh)

```typescript
import { logger } from "@oh-my-pi/pi-utils";

export function drainDisposers(list: Array<() => void>): void {
	while (list.length > 0) {
		const dispose = list.pop();
		if (!dispose) continue;
		try {
			dispose();
		} catch (error) {
			logger.warn("Disposer threw during drain; continuing", { error: String(error) });
		}
	}
}
```

Ghi chú về doc comment: plan đề xuất một doc comment dài giải thích ba tính chất. Đó **không phải** prompt (nên `.md` + Handlebars không áp dụng) và không bị `no-unused-vars` chặn. Nhưng lưu ý: thêm doc comment dài sẽ **không** làm hỏng `oxfmt`. Nếu bạn muốn giữ doc comment của plan, dán nguyên văn khối trong plan (mục "Hình dạng code") vào trên hàm — nội dung đó đúng, kể cả lập luận về `session-teardown.ts:70`.

---

## 3. Các bước

Mỗi bước dưới đây gắn với một neo **đã mở và đọc** ở mục 7. Nếu bạn đọc một dòng ở đây và thấy nó không nói đúng thứ mà bước nói, hãy dừng lại — đó là dấu hiệu cây đã đổi.

**Bước 1 — tạo `packages/coding-agent/src/utils/disposers.ts`.**
Dùng nguyên văn khối ở mục 2. Tiền lệ đặt file: `packages/coding-agent/src/utils/late-cleanup.ts` (13 dòng) — cùng thư mục, cùng cách import `logger` từ `@oh-my-pi/pi-utils`, cùng cách stringify lỗi. `packages/coding-agent/src/utils/` **không có** barrel `index.ts` (đã kiểm: `ls src/utils/index.ts` → No such file), nên import bằng đường dẫn tương đối đầy đủ, không qua barrel.
Tiền lệ về hình thức lỗi: `session-teardown.ts:74` dùng `logger.warn("...", { error: String(err) })`; `agent-session.ts:5314` dùng `logger.warn("Session dispose: Sharpshooter release failed", { error: String(error) })`. Dùng đúng dạng đó.

**Bước 2 — `packages/coding-agent/src/session/agent-session.ts:5104`.**
Đây là câu lệnh thứ hai của `beginDispose()`, ngay sau `this.#isDisposed = true;` và ngay trước `this.#modelDiscoveryAbortController.abort();`. Thay bằng `drainDisposers(this.#disposers);`. **Không** đảo thứ tự bất kỳ câu nào khác trong hàm — `beginDispose()` là một thứ tự cố ý của các guard teardown (xem doc comment ngay trên nó, `agent-session.ts:5095-5101`).

**Bước 3 — `packages/coding-agent/src/session/agent-session.ts:5346`.**
Thay bằng `drainDisposers(this.#disposers);`. Nó nằm ngay dưới comment ở dòng 5345:
```
		// beginDispose() drained the rest; this catches registrations made during teardown.
```
**Giữ nguyên comment đó** — nó là lý do duy nhất mà pass này tồn tại, và nó là lý do test thứ ba ở mục 4 không phải chuyện bịa.
Sửa đúng vị trí này: nó nằm trong `#doDispose()` (mở tại `agent-session.ts:5268`), **không** phải trong `dispose()` (`agent-session.ts:5138`, chỉ là hàm ủy quyền gọi `#doDispose`). Plan gọi nó là "pass thứ hai trong `dispose()`" — sai tên hàm, đúng vị trí. Nhớ giữ nguyên cả 3 câu ngay sau nó: `this.#eventListeners = [];`, `this.#runStateListeners.clear();`, `this.#sessionChangeCallbacks.clear();`.

**Bước 4 — `packages/coding-agent/src/extensibility/extensions/runner.ts:1376`.**
Thay bằng `drainDisposers(this.#fileFallbackDisposers);`. Đây là **toàn bộ thân** của `disposeFileFallbacks()`. Giữ nguyên JSDoc ngay trên nó (5 dòng, giải thích vì sao dùng registry phạm vi toàn tiến trình).

**Bước 5 — `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112`.**
Thay bằng `drainDisposers(this.#composerShapeDisposers);`. Đây là **toàn bộ thân** của `disposeComposerShapes()`. Giữ nguyên JSDoc một dòng ngay trên nó: `/** Remove extension-owned composer styles from the process registries. */`.
**KHÔNG** đụng tới `#dialogQueue` (`extension-ui-controller.ts:93`) — nó được drain FIFO bằng `.shift()` tại dòng 1340 và là hàng đợi trình diễn dialog, không phải teardown. Cũng KHÔNG đụng `#extensionTerminalInputUnsubscribers` (`extension-ui-controller.ts:85`) — xem mục 6.

**Bước 6 — ba dòng import (làm SAU CÙNG, sau bước 2-5).**
- `agent-session.ts`: chèn ngay TRƯỚC dòng `import { parseCommandArgs } from "../utils/command-args";` (hiện là dòng 251). Lưu ý: `../utils/*` **không phải** một khối liền mạch trong file này — chúng xen kẽ với import `@oh-my-pi/pi-tui` ở các dòng 251, 253, 254, 255, 256, 258, 259, 260. Plan gọi đó là "khối import `../utils/*` (dòng 250-255)" — sai hình dạng. Chèn cạnh bất kỳ dòng `../utils/*` nào cũng được; file không có quy tắc sort import nào (`biome.json` không có `organizeImports`, `.oxlintrc.json` không có rule import-order), nên chỗ đặt không bị gate đòi.
- `runner.ts`: chèn ngay TRƯỚC dòng `import { addFileDeleteFallback, addFileWriteFallback } from "../../tools/file-write-fallback";` (dòng 30, là dòng cuối của khối `../../` 21-30).
- `extension-ui-controller.ts`: chèn ngay TRƯỚC dòng `import { getEditorCommand, openInEditor } from "../../utils/external-editor";` (dòng 37, dòng cuối của khối `../../utils/*` 36-37).
Cả ba là import tĩnh top-level. TUYỆT ĐỐI không `await import()` / `import("...")` — AGENTS.md cấm.

**Bước 7 — tạo `packages/coding-agent/test/disposer-drain.test.ts`.**
Nguyên văn file đã format sẵn (oxfmt sạch) ở mục 4. Ba test, ba mệnh đề.

**Bước 8 — `packages/coding-agent/CHANGELOG.md`.**
`## [Unreleased]` ở dòng 3 **KHÔNG rỗng** như plan nói — nó đã có `### Security` ở dòng 5 (từ commit `5acb674`). Thêm `### Fixed` ngay **sau khối Security đó**, tức sau dòng 7 (dòng trống trước `## [18.4.0]`), không phải ngay dưới dòng 3 — nếu chèn ngay dưới dòng 3 bạn sẽ đặt `Fixed` trước `Security`, sai thứ tự AGENTS.md. (AGENTS.md cũng nói đừng lo thứ tự vì `bun run release` chạy `fix-changelogs` tự chuẩn hoá, nhưng làm đúng ngay thì không tốn công.)
Một dòng, góc nhìn người dùng, không kể nguyên nhân gốc, không kể chi tiết triển khai.

**Bước 9 — xác minh.** Chạy đúng ba lệnh ở mục 5, theo thứ tự đó. Không chạy `tsc` / `npx tsc` (AGENTS.md cấm tuyệt đối; repo này dùng `tsgo` qua `check:types`).

---

## 4. Hợp đồng test

File: `packages/coding-agent/test/disposer-drain.test.ts`. Nguyên văn (đã chạy thật, `3 pass / 0 fail`, oxfmt sạch):

```typescript
import { afterEach, describe, expect, it, vi } from "bun:test";
import { drainDisposers } from "@oh-my-pi/pi-coding-agent/utils/disposers";
import { logger } from "@oh-my-pi/pi-utils";

describe("drainDisposers", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("runs disposers in reverse registration order", () => {
		const calls: string[] = [];
		const disposers: Array<() => void> = [() => calls.push("A"), () => calls.push("B"), () => calls.push("C")];

		drainDisposers(disposers);

		expect(calls).toEqual(["C", "B", "A"]);
		expect(disposers).toEqual([]);
	});

	it("a throwing disposer does not stop later disposers and is logged", () => {
		const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
		const calls: string[] = [];
		const disposers: Array<() => void> = [
			() => calls.push("survivor"),
			() => {
				throw new Error("teardown boom");
			},
		];

		expect(() => drainDisposers(disposers)).not.toThrow();
		expect(calls).toEqual(["survivor"]);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it("drains disposers registered during the drain", () => {
		const calls: string[] = [];
		const disposers: Array<() => void> = [];
		disposers.push(() => {
			calls.push("early");
			disposers.push(() => calls.push("late"));
		});

		drainDisposers(disposers);

		expect(calls).toEqual(["early", "late"]);
		expect(disposers).toEqual([]);
	});
});
```

**Điều người dùng thấy nếu hồi quy, từng test:**

1. **`runs disposers in reverse registration order`** — nếu hồi quy, người dùng thấy tài nguyên do A nắm giữ **còn sống** khi teardown của B đã chạy xong: một listener đã deregister, một watcher đã dừng, nhưng thứ mua sau nó vẫn còn treo. Đây là đúng cái rò rỉ mà milestone sinh ra để đóng. Test này là **khẳng định dễ hỏng nhất ở lần thử đầu**, vì code hiện tại ở cả bốn call-site đều là thứ tự thuận.
2. **`a throwing disposer does not stop later disposers and is logged`** — nếu hồi quy: không có try/catch thì một disposer ném lỗi **huỷ cả vòng lặp**, các teardown listener đăng ký trước nó không bao giờ chạy, và một settings watcher còn sống trên một session đã dispose. Không có lời gọi `logger.warn` thì lỗi **im lặng**: người dùng báo "omp treo khi thoát" và log trống. `expect(warn).toHaveBeenCalledTimes(1)` chặn đúng trường hợp "cứ nuốt lỗi mà không nói gì".
3. **`drains disposers registered during the drain`** — nếu hồi quy: một helper chỉ `splice(0)` **một lần** để mảng còn phần tử và disposer đến muộn không bao giờ chạy. Đây đúng là thứ mà pass thứ hai tại `agent-session.ts:5345-5346` sinh ra để bắt. **Chỉ assert vòng đầu đã chạy sẽ lọt bug đó** — phải assert cả `expect(disposers).toEqual([])`.

**Cố ý KHÔNG phủ:** văn bản đúng của lời gọi `logger.warn`, số vòng drain, và mọi khẳng định về bản thân `beginDispose()` / `disposeFileFallbacks()` / `disposeComposerShapes()` — đó là call-site, hợp đồng nằm ở helper. Không source-grep file triển khai (AGENTS.md cấm tuyệt đối). Không dùng `mock.module()` (rò rỉ toàn cục, bun#12823) — chỉ `vi.spyOn`.

**Import subpath đã kiểm hoạt động:** `packages/coding-agent/package.json:53` khai báo `"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }`, nên `@oh-my-pi/pi-coding-agent/utils/disposers` resolve được. Tiền lệ: `test/agent-session-aside-delivery.test.ts:19` (`import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";`). Quy ước thư mục: 791 file `*.test.ts` nằm trực tiếp trong `packages/coding-agent/test/`.

---

## 5. Cổng

Chạy từ `/Users/tranquangdang21/Projects/ultraworkers` trừ khi ghi khác.

```bash
# Cổng 1 — ba test hợp đồng (kỳ vọng: 3 pass, 0 fail)
bun test packages/coding-agent/test/disposer-drain.test.ts

# Cổng 2 — grep tính đầy đủ của việc di dời (kỳ vọng: KHÔNG hit nào, exit 1)
git grep -n "for (const dispose of" -- packages/coding-agent/src

# Cổng 3 — lint + format + type, giới hạn trong package bị sửa (kỳ vọng: exit 0)
cd packages/coding-agent && bun run check && cd ../..
```

`git grep` không tìm thấy gì thì **exit code là 1**, không phải 0. Đừng đọc nhầm là fail.

### Cổng này có ĐỎ ĐƯỢC không, và bằng cách nào

**Cổng 1 (test) — CÓ, tôi đã thử bằng thực nghiệm chứ không phải suy luận.** Tôi đã dựng bản triển khai đúng, xanh `3 pass / 0 fail`, rồi thay bằng từng bản sai và chạy lại:

| bản triển khai sai | kết quả | test đỏ |
| --- | --- | --- |
| thứ tự thuận (`list.shift()`) | `2 pass, 1 fail` | `runs disposers in reverse registration order` |
| chỉ `splice(0)` một lần, không drain-tới-rỗng | `2 pass, 1 fail` | `drains disposers registered during the drain` |
| không try/catch | `2 pass, 1 fail` | `a throwing disposer does not stop later disposers and is logged` |
| ném lại kiểu chord (`throw errors[0]`) | `2 pass, 1 fail` | `a throwing disposer does not stop later disposers and is logged` |
| no-op rỗng | `0 pass, 3 fail` | cả ba |

Không bản sai nào lọt. Cổng này không pass được với một bản no-op, vì mọi khẳng định đều đọc một mảng thứ tự chạy cụ thể hoặc một số lần gọi logger.

**Cổng 2 (grep) — CÓ.** Nó đỏ ngay lập tức nếu còn sót bất kỳ drain thứ tự thuận nào trong `packages/coding-agent/src`. Tôi đã xác nhận trên cây sạch nó trả về **đúng 4 hit** (`agent-session.ts:5104`, `agent-session.ts:5346`, `runner.ts:1376`, `extension-ui-controller.ts:112`) và không có hit thứ năm. Sau khi áp cả bốn thay đổi, tôi chạy lại: **0 hit**. Đây là kiểm tra tính đầy đủ của việc di dời, **không** phải một khẳng định test, và không được viết vào file test.

**Cổng 3 (check) — CÓ, tôi đã thử.** `bun run check` trong `packages/coding-agent` là `oxlint . && oxfmt --check … && bun run check:types` (`tsgo -p tsconfig.json --noEmit`). Tôi đã chứng minh nó đỏ: tạo một file tạm sai định dạng trong `src/utils/`, `bun run check` → `Format issues found in above 1 files` / `error: script "check" exited with code 1`. File đó đã bị xoá. Sau khi format lại bốn file của W2, cổng này xanh trên chính các file của W2.

### ⚠️ Cổng trong plan phải bỏ: `bun run check:ts`

Plan đòi `bun run check:ts` sạch. **Cổng đó không bao giờ xanh trên cây này**, và không liên quan gì đến W2. Tôi đã chạy nó trên cây **chưa đụng gì**:

```
$ bun run check:ts
$ oxlint . && oxfmt --check …
packages/coding-agent/test/mcp-project-config-not-trusted-by-default.test.ts:19:10: warning eslint(no-unused-vars): Identifier 'getConfigRootDir' is imported but never used.
Checking formatting...
All matched files use the correct format.
…
@oh-my-pi/collab-web:check:types | scripts/mock-host.ts(345,14): error TS2322: Type '"bye"' is not assignable to type '"agents" | "bus" | "bye-vanished" | …'
@oh-my-pi/collab-web:check:types | src/lib/client.ts(423,9): error TS2678: Type '"bye"' is not comparable to type '"agents" | "bus" | …'
@oh-my-pi/collab-web:check:types | src/lib/client.ts(424,21): error TS2339: Property 'reason' does not exist on type 'never'.
@oh-my-pi/collab-web:check:types | test/client.test.ts(314,30): error TS2322: …
@oh-my-pi/collab-web:check:types | test/transcript-polling.test.ts(62,30): error TS2322: …
error: script "check:ts" exited with code 1
```

**5 lỗi type có sẵn trong `@oh-my-pi/collab-web`**, không nằm trong `packages/coding-agent`. Nếu bạn để cổng này trong checklist, nó sẽ luôn đỏ và bạn sẽ không bao giờ biết W2 có làm hỏng gì hay không — đúng cái "cảm giác an toàn giả" mà phải tránh. Cổng 3 thay thế nó, chạy cùng bộ `oxlint` + `oxfmt` + `tsgo` nhưng **giới hạn trong package W2 sửa**, và tôi đã chứng minh nó xanh trên sạch và đỏ khi có file sai.

### Ghi chú môi trường (đính chính plan)

Plan nói `node_modules` vắng mặt và cả `bun test` lẫn `check:ts` đều không chạy được. **Sai trên cây này.** `node_modules` có tồn tại, `bun test packages/coding-agent/test/agent-session-dispose-concurrent.test.ts` chạy được (`5 pass, 0 fail`), và `oxlint`/`oxfmt` đều có trong `node_modules/.bin/`. Không cần `bun install` trước. Nhưng dù sao, cổng 1 **không** cần native addon — nó chỉ import `drainDisposers` và `logger`. Tôi đã xác nhận nó chạy được. Nếu bạn thấy nó đòi addon, đó là hồi quy so với kỳ vọng, hãy báo cáo chứ đừng lách.

---

## 6. Cạm bẫy riêng của work item này

Xếp theo mức nguy hiểm thật sự:

1. **Số dòng trong plan sai ở 7 chỗ, lệch tới +128.** Đây là cái dễ làm hỏng nhất vì nó *trông* đúng. `agent-session.ts:4983` mở ra là `}`; `:5218` mở ra là `3_000,`. Nếu bạn tin số và sửa, bạn sửa nhầm hoặc báo "không tìm thấy" rồi tự bịa. Bảng neo đúng ở mục 7 — dùng nó, hoặc dùng `git grep -n "for (const dispose of" -- packages/coding-agent/src` (trả về đúng 4 hit, tự nó là bản đồ).

2. **Thêm import trước khi sửa call-site làm lệch số dòng của chính call-site bạn đang sửa.** Đã thử: +1 ở cả bốn file. Sửa call-site trước, import sau (bước 6 nằm sau bước 2-5 là cố ý).

3. **Port hình dạng `throw errors[0]` của chord.** Đây là bẫy nguy hiểm nhất về *hành vi*, và nó nguy hiểm hơn nhiều so với plan nói. Lý do không ném lại không nằm ở "cho đẹp" — nó nằm ở thứ tự gọi trong `session-teardown.ts`:
   ```
   70:		deps.beginDispose();
   71:		try {
   72:			await deps.saveDraft(draftText);
   ```
   `deps.beginDispose()` **ở ngoài** cái `try` bọc `saveDraft`. Một `beginDispose()` ném lỗi sẽ từ chối promise teardown **trước khi draft được ghi** — biến một rò rỉ có điều kiện (chỉ xảy ra khi một teardown callback ném lỗi) thành rò rỉ không điều kiện (mất draft, mất việc giải phóng job bash nền, mất event `session_shutdown` của extension, **mọi lần thoát**). Doc comment ngay trên (`session-teardown.ts:62-64`) nói thẳng điều đó. Bản port của chord **thuộc về `Facet.dispose()`** — một hợp đồng khác, nơi caller *muốn* biết teardown hỏng ở đâu. `drainDisposers` không có caller nào như vậy.

4. **Bản `splice`-một-lần âm thầm vứt bở disposer đăng ký trong lúc teardown đang chạy.** `agent-session.ts:5345` ghi nguyên văn: `// beginDispose() drained the rest; this catches registrations made during teardown.` Dùng `pop()` trong `while` như plan nói — `pop` cho thứ tự ngược tự nhiên, mutate thẳng mảng của caller (nên call-site không cần gán lại), và không cần vòng retry bên ngoài. Nếu bạn viết `for (const d of list.splice(0).reverse())` thì test 3 đỏ — đó là cơ chế bảo vệ, đừng "sửa" test cho xanh.

5. **`#extensionTerminalInputUnsubscribers` là call-site thứ năm có cùng khuyết điểm, và có thật.** `extension-ui-controller.ts:1222-1227`:
   ```typescript
   	clearExtensionTerminalInputListeners(): void {
   		for (const unsubscribe of this.#extensionTerminalInputUnsubscribers) {
   			unsubscribe();
   		}
   		this.#extensionTerminalInputUnsubscribers.clear();
   	}
   ```
   Một `unsubscribe` ném lỗi chặn phần còn lại, y hệt. **Nhưng nó là `Set`, không phải `Array`** (khai báo dòng 85, thêm ở 1203), nên `drainDisposers(list: Array<() => void>)` không vừa. **Khuyến nghị của tôi: trì hoãn, và ghi vào changelog/ghi chú sau, đừng sửa trong W2.** Ba lý do: (a) nó là listener input của TUI, không phải chuỗi teardown session, nên lập luận "không bao giờ ném" không áp dụng nguyên vẹn — bỏ qua một input listener sống có hậu quả khác hẳn bỏ qua một settings unsubscribe; (b) đưa vào W2 buộc bạn hoặc mở rộng helper nhận `Set`, hoặc đổi kiểu field — cả hai đều là thay đổi ngoài phạm vi một work item "S"; (c) nó sẽ biến W2 thành việc sửa một controller TUI, phá đúng lời hứa blast-radius thấp mà changelog dựa vào. Nếu người quyết vẫn muốn gộp, thì **thêm một mục riêng ở mục Cần người quyết của plan**, đừng lặng lẽ làm.

6. **Vòng `while` có thể quay vô tận nếu một disposer tự push lại chính nó.** Tôi đã kiểm: mọi lần push đều ở `agent-session.ts:2214` (`addDisposer`), `runner.ts:781` và `:800`, `extension-ui-controller.ts:105` — không cái nào tự tham chiếu. **Khuyến nghị: KHÔNG thêm trần lặp phòng thủ.** Một vòng lặp không chặn trung thực bộc lộ một disposer bệnh lý ngay lập tức; một trần lặp giấu nó thành treo im lặng. Đây là phán đoán của tôi, không phải lỗi plan.

7. **`#dialogQueue` trông giống nhưng KHÔNG phải drain.** Nó là `Array<() => void>` (`extension-ui-controller.ts:93`) và được drain bằng `.shift()` tại dòng 1340 — nhưng đó là **hàng đợi trình diễn dialog FIFO**, không phải teardown. Đừng "cho nhất quán" mà đụng vào nó.

8. **`oxfmt` là một phần của cổng.** Tôi đã bị nó bắt một lần: test file viết tay bằng mảng closure nhiều dòng bị co lại một dòng. Nếu bạn thấy `Format issues found`, chạy `node_modules/.bin/oxfmt <file>` từ repo root rồi chạy lại cổng — **đừng** viết lại test cho khớp format, hãy để formatter sửa.

---

## 7. Bảng kiểm tra neo

Cột "cited" là số trong work item. Cột "actual" là `sed -n "<n>p"` trên cây này. **Đây là bảng bạn dùng khi gõ — không dùng số trong plan.**

| # | Cited | Actual | Verdict | Nội dung thật ở dòng actual |
| --- | --- | --- | --- | --- |
| 1 | `src/utils/disposers.ts` không tồn tại | — | ✅ | `ls` → No such file. `git grep -n "drainDisposers" -- packages/` → exit 1, 0 hit. `src/utils/index.ts` cũng không tồn tại (không có barrel). |
| 2 | `agent-session.ts:4983` | **`agent-session.ts:5104`** | ❌ **+121** | `for (const dispose of this.#disposers.splice(0)) dispose();` |
| 3 | `agent-session.ts:4981` (mở `beginDispose()`) | **`agent-session.ts:5102`** | ❌ **+121** | `beginDispose(): void {` |
| 4 | `agent-session.ts:5218` | **`agent-session.ts:5346`** | ❌ **+128** | `for (const dispose of this.#disposers.splice(0)) dispose();` |
| 5 | `agent-session.ts:5217` (comment) | **`agent-session.ts:5345`** | ❌ **+128** | `// beginDispose() drained the rest; this catches registrations made during teardown.` |
| 6 | `agent-session.ts:719` (field) | **`agent-session.ts:737`** | ❌ **+18** | `#disposers: Array<() => void> = [];` |
| 7 | `agent-session.ts:2179` (push) | **`agent-session.ts:2214`** | ❌ **+35** | `this.#disposers.push(dispose);` (trong `addDisposer`, mở tại 2213) |
| 8 | `agent-session.ts:250-255` "khối import `../utils/*`" | **251, 253, 254, 255, 256, 258, 259, 260** | ❌ hình dạng sai | Không phải khối liền mạch — xen kẽ import `@oh-my-pi/pi-tui`. Dòng 251 = `import { parseCommandArgs } from "../utils/command-args";` |
| 9 | `agent-session.ts:5183-5186` (tiền lệ try/catch) | **`agent-session.ts:5311-5315`** | ❌ **+128** | `try { releaseSharpshooterSession(this); } catch (error) { logger.warn("Session dispose: Sharpshooter release failed", { error: String(error) }); }` |
| 10 | `runner.ts:1347` | **`runner.ts:1376`** | ❌ **+29** | `for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();` |
| 11 | `runner.ts:537` (field) | **`runner.ts:541`** | ❌ **+4** | `#fileFallbackDisposers: Array<() => void> = [];` |
| 12 | `runner.ts:777` / `:796` (push) | **`runner.ts:781`** / **`:800`** | ❌ **+4 / +4** | `this.#fileFallbackDisposers.push(` |
| 13 | `runner.ts:21-30`, `file-write-fallback` ở dòng 30 | `runner.ts:21-30`, dòng 30 | ✅ | `import { addFileDeleteFallback, addFileWriteFallback } from "../../tools/file-write-fallback";` |
| 14 | `extension-ui-controller.ts:112` | `extension-ui-controller.ts:112` | ✅ | `for (const dispose of this.#composerShapeDisposers.splice(0)) dispose();` |
| 15 | `extension-ui-controller.ts:86` (field) | `extension-ui-controller.ts:86` | ✅ | `#composerShapeDisposers: Array<() => void> = [];` |
| 16 | `extension-ui-controller.ts:105` (push) | `extension-ui-controller.ts:105` | ✅ | `this.#composerShapeDisposers.push(installExtensionComposerShape(definition));` |
| 17 | `extension-ui-controller.ts:36-37` (imports) | `extension-ui-controller.ts:36-37` | ✅ | 36 = `…/utils/title-generator`; 37 = `import { getEditorCommand, openInEditor } from "../../utils/external-editor";` |
| 18 | `extension-ui-controller.ts:85` (Set) | `extension-ui-controller.ts:85` | ✅ | `#extensionTerminalInputUnsubscribers = new Set<() => void>();` |
| 19 | `extension-ui-controller.ts:93` (`#dialogQueue`) | `extension-ui-controller.ts:93` | ✅ | `#dialogQueue: Array<() => void> = [];` |
| 20 | `extension-ui-controller.ts:1203` (add) | `extension-ui-controller.ts:1203` | ✅ | `this.#extensionTerminalInputUnsubscribers.add(unsubscribe);` |
| 21 | `extension-ui-controller.ts:1222-1227` | `extension-ui-controller.ts:1222-1227` | ✅ | `clearExtensionTerminalInputListeners()` mở tại 1222; `for (const unsubscribe of …)` ở 1223; `.clear()` ở 1226 |
| 22 | `extension-ui-controller.ts:1340` (`.shift()`) | `extension-ui-controller.ts:1340` | ✅ | `this.#dialogQueue.shift()?.();` |
| 23 | `session-teardown.ts:70` | `session-teardown.ts:70` | ✅ | `deps.beginDispose();` |
| 24 | `session-teardown.ts:71` | `session-teardown.ts:71` | ✅ | `try {` |
| 25 | `session-teardown.ts:62-64` (doc comment) | `session-teardown.ts:62-64` | ✅ | `… \`saveDraft\` failures are logged but never abort the disposal chain — a` |
| 26 | `session-teardown.ts:72-75` | `session-teardown.ts:72-75` | ✅ | 72 = `await deps.saveDraft(draftText);`; 74 = `logger.warn("Failed to save session draft during teardown", { error: String(err) });` |
| 27 | `main.ts:1051` (`addDisposer(stop)`) | **`main.ts:1059`** | ❌ **+8** | `session.addDisposer(stop);` (cuối `watchScopedModelSettings`, mở tại 1035) |
| 28 | `config/registry.ts:323` | `config/registry.ts:323` | ✅ | `if ("settings" in scope) scope.addDisposer?.(unsubscribe);` |
| 29 | `config/registry.ts:319-322` (closure `unsubscribe`) | `config/registry.ts:319-322` | ✅ | `const unsubscribe = () => { active = false; stop(); };` |
| 30 | `CHANGELOG.md:3` = `## [Unreleased]` | `CHANGELOG.md:3` | ✅ dòng | **NHƯNG plan nói nó "rỗng" là SAI** — `### Security` đã nằm ở dòng 5. Thêm `### Fixed` **sau dòng 7**. |
| 31 | `package.json:53` (wildcard export) | `package.json:53` | ✅ | `"./*": {` → `"types": "./src/*.ts"`, `"import": "./src/*.ts"` |
| 32 | `test/agent-session-aside-delivery.test.ts:19` (kiểu import) | `…:19` | ✅ | `import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";` |
| 33 | 791 file `*.test.ts` trong `test/` | 791 | ✅ | `ls packages/coding-agent/test/*.test.ts \| wc -l` → 791 |
| 34 | `git grep "for (const dispose of"` → đúng 4 hit | đúng 4 hit | ✅ | `agent-session.ts:5104`, `agent-session.ts:5346`, `runner.ts:1376`, `extension-ui-controller.ts:112` |
| 35 | `pi-ref/…/chord/src/facets/host.ts:125-142` — "**không kiểm chứng được, tham chiếu không tồn tại**" | **FILE CÓ TỒN TẠI** | ❌ **đính chính của plan sai** | `dispose()` mở tại 125; `for (const effect of this.#effects.splice(0).reverse()) {` ở **129**; `if (errors.length === 1) throw errors[0];` ở **140**; `throw new AggregateError(…)` ở **141**. Đọc được, chỉ là **không nên port** (xem cạm bẫy 3). |
| 36 | Đính chính plan: "node_modules vắng mặt, cả hai cổng bị chặn" | node_modules **có** | ❌ **đính chính plan lỗi thời** | `bun test …/agent-session-dispose-concurrent.test.ts` → `5 pass, 0 fail`. `oxlint`/`oxfmt` có trong `node_modules/.bin/`. `bun run check:ts` **chạy được** nhưng **đã đỏ sẵn** (5 lỗi trong `collab-web`) — xem mục 5. |

### Ghi chú về các neo cũ hơn trong bảng "Đính chính" của plan

Plan liệt kê các neo *trước đó* của chính nó là sai: `agent-session.ts:4953` và `:5188`; `runner.ts:1333`; `extension-ui-controller.ts:103`. Trên cây này chúng cũng đã cũ — neo thật là 5104 / 5346 / 1376 / 112 (lệch lần lượt **+151, +158, +43, +9** so với 4953/5188/1333/103). Hai bảng neo cũ và mới của plan đều không khớp cây này. Chỉ dùng bảng ở mục 7.

---

## 8. Phụ thuộc và phạm vi

- `depends_on`: không.
- `blocks`: W12.
- Diff dự kiến: 1 file mới (`src/utils/disposers.ts`, ~12 dòng), 3 file sửa (mỗi file +1 import, −1/+1 dòng call-site), 1 file test mới (~48 dòng sau format), 3 dòng changelog. Không đụng `package.json`, không đụng `tsconfig`, không thêm dependency.

## 9. Ghi chú về trạng thái cây lúc kiểm tra

- Nhánh `milestone-1`, HEAD `65cc6c1`.
- Cây **bẩn** bởi công việc của agent khác, **không** phải của W2: `packages/coding-agent/src/tools/bash.ts` (modified), `packages/coding-agent/test/collab/__w5probe.ts` và `packages/coding-agent/test/collab/web-wire.types.ts` (untracked). File `__w5probe.ts` **sai định dạng**, nên nó làm cổng 3 đỏ nếu bạn chạy cổng 3 trong khi nó còn nằm đó. Đó **không phải** lỗi W2 — xác nhận bằng cách kiểm `oxfmt --check` chỉ trên các file của bạn, hoặc chờ nó được dọn. Đừng sửa/xoá file của agent khác.
- `packages/coding-agent/src/collab/crypto.ts` **sạch** (không còn modified như cảnh báo thời điểm W1 trong plan nói) — các thay đổi W3 đã được commit.
- Mọi số dòng trong phiếu này đọc trên cây này. Trước khi sửa, chạy lại `git grep -n "for (const dispose of" -- packages/coding-agent/src` để xác nhận bốn hit vẫn còn đúng chỗ.
