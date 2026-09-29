# Phiếu triển khai — W1. Hằng số `WIRE_NAME`

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_5_EXECUTION_PLAN.md` (mục `## W1. Hằng số WIRE_NAME (sóng 1)`, dòng 309–486)
**HEAD khi kiểm chứng:** `47720fd42c075bdd076fa1ec176dc2417325f035`, branch `milestone-1`
**Trạng thái:** phần lớn neo đúng, nhưng **7 nhóm neo sai/đã lỗi thời** (xem mục 7) và **1 cổng không thể đỏ được** (mục 5.1, cổng 5). Hai lỗi nghiêm trọng nhất: `acp-agent.ts:656` không phải `"oh-my-pi"` như kế hoạch nói, và toàn bộ môi trường "chưa build addon" đã lỗi thời.

---

## 1. Cái gì thay đổi, quan sát được

Năm tích hợp với bên thứ ba — yêu cầu `initialize` của DAP, sự kiện OSC-777 của Warp, `agentInfo.title` của ACP, trường multipart `z` của puush, và bank id mặc định của Hindsight — ngừng mang chuỗi `"omp"` viết tay và bắt đầu đọc từ **một** hằng số tên là `WIRE_NAME`; giá trị byte của cả năm **không đổi**, nên không quan sát được gì khác biệt ngoài một lần đổi tên trong tương lai giờ chỉ phải sửa ở một chỗ.

---

## 2. Bảng điểm sửa

Tất cả văn bản "TRƯỚC" dưới đây được trích từ file thật, đã mở và đọc.

| `đường/dẫn` | symbol | TRƯỚC (nguyên văn từ file) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts` (chèn **sau dòng 22**) | `WIRE_NAME` (mới) | *(không có)* — dòng 22 hiện là `export const APP_NAME: string = "omp";`, dòng 23 là trống | thêm 1 khối JSDoc 1 dòng + `export const WIRE_NAME: string = "omp";` |
| `packages/coding-agent/src/dap/session.ts:3` | import `@oh-my-pi/pi-utils` | `import { logger, ptree, untilAborted } from "@oh-my-pi/pi-utils";` | `import { logger, ptree, untilAborted, WIRE_NAME } from "@oh-my-pi/pi-utils";` |
| `packages/coding-agent/src/dap/session.ts:1465` | `#buildInitializeArguments` | `			clientID: "omp",` | `			clientID: WIRE_NAME,` |
| `packages/coding-agent/src/dap/session.ts:1466` | `#buildInitializeArguments` | `			clientName: "omp",` | `			clientName: WIRE_NAME,` |
| `packages/coding-agent/src/blob-broker/uploaders-legacy.ts` (sau dòng 1) | import mới | *(không có — file không hề có import `@oh-my-pi/pi-utils`)* | `import { WIRE_NAME } from "@oh-my-pi/pi-utils";` |
| `packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236` | `createPuushUploader` → `upload` | `				const body = multipartFile(request, "f", { k: apiKey, z: "omp" });` | `				const body = multipartFile(request, "f", { k: apiKey, z: WIRE_NAME });` |
| `packages/coding-agent/src/modes/warp-events.ts:4` | import `@oh-my-pi/pi-utils/dirs` | `import { VERSION } from "@oh-my-pi/pi-utils/dirs";` | `import { VERSION, WIRE_NAME } from "@oh-my-pi/pi-utils/dirs";` |
| `packages/coding-agent/src/modes/warp-events.ts:59` | chú thích giải thích | `				// Warp resolves this via CLIAgent.command_prefix(); OhMyPi is "omp".` | `				// Warp resolves this via CLIAgent.command_prefix(); the value is the wire contract, see WIRE_NAME.` |
| `packages/coding-agent/src/modes/warp-events.ts:60` | `emit()` → `body` | `				agent: "omp",` | `				agent: WIRE_NAME,` |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:5` | import `@oh-my-pi/pi-utils` | `import { getBlobsDir, isEnoent, logger, type postmortem, VERSION } from "@oh-my-pi/pi-utils";` | `import { getBlobsDir, isEnoent, logger, type postmortem, VERSION, WIRE_NAME } from "@oh-my-pi/pi-utils";` |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:657` | `initialize()` → `agentInfo` | `				title: "omp",` | `				title: WIRE_NAME,` |
| `packages/coding-agent/src/modes/acp/acp-agent.ts:656` | `initialize()` → `agentInfo` | `				name: "omp",` | **KHÔNG ĐỔI** — xem mục 6, cạm bẫy #1 |
| `packages/coding-agent/src/hindsight/bank.ts:25` | import `@oh-my-pi/pi-utils` | `import { logger } from "@oh-my-pi/pi-utils";` | `import { logger, WIRE_NAME } from "@oh-my-pi/pi-utils";` |
| `packages/coding-agent/src/hindsight/bank.ts:29` | `DEFAULT_BANK_NAME` | `const DEFAULT_BANK_NAME = "omp";` | `const DEFAULT_BANK_NAME = WIRE_NAME;` |
| `packages/utils/test/wire-name.test.ts` | file mới | *(chưa tồn tại — đúng như thiết kế)* | 1 import + 1 `it()` + 1 `expect()` |

**Không được đụng** (đã kiểm, cần giữ nguyên byte): `dirs.ts:22` `APP_NAME`, `dirs.ts:25` `APP_URL`, `dirs.ts:28` `CONFIG_DIR_NAME`, `dirs.ts:37` `USER_AGENT`, `hindsight/bank.ts:30-32` `PROJECT_TAG_PREFIX`/`UNKNOWN_PROJECT`/`MISSION_SET_CAP`, `hindsight/settings.ts:172`, `catalog/src/wire/codex.ts:52`, và toàn bộ `packages/coding-agent/test/`.

---

## 3. Các bước (mọi neo đã mở và đọc)

### Bước 1 — `packages/utils/src/dirs.ts`, chèn sau **dòng 22**

⚠️ **Kế hoạch ghi dòng 21. Sai lệch 1 dòng.** Đã đọc `dirs.ts` 1–40:

```
21| /** App name (e.g. "omp") */
22| export const APP_NAME: string = "omp";
23|
24| /** Public homepage that inference gateways (OpenRouter, Vercel AI Gateway) credit omp traffic to. */
25| export const APP_URL: string = "https://omp.sh/";
```

Dòng 21 là **JSDoc**, không phải hằng số. Hằng số ở **22**. Chèn vào khoảng trống giữa **22 và 23**.

Văn bản chèn (đúng 2 dòng, JSDoc 1 dòng + khai báo):

```typescript
/** Wire identity — the third-party contract value; do not change without a compatibility decision. */
export const WIRE_NAME: string = "omp";
```

Giá trị **PHẢI** là chuỗi `"omp"`. Không viết `"ultraworkers"`, không dẫn xuất từ `APP_NAME`, không làm bí danh của `APP_NAME` — cần một chuỗi riêng để W3 đổi `APP_NAME` mà không kéo theo giá trị wire. Kiểu `: string` tường minh để khớp `APP_NAME`/`APP_URL` ngay bên cạnh.

Không cần sửa barrel: `packages/utils/src/index.ts:5` (đã đọc) là `export * from "./dirs";`, nên `WIRE_NAME` tự được re-export.

**Không thêm gì khác vào file này** — nhưng đọc mục 6, cạm bẫy #3: `dirs.ts:1105` còn chứa một giá trị wire `"omp"` nữa mà kế hoạch bỏ sót.

### Bước 2 — `packages/coding-agent/src/modes/warp-events.ts`, dòng 4, 59, 60

Đã đọc `warp-events.ts` 1–10 và 50–70; cả ba neo đúng.

```typescript
// dòng 4, TRƯỚC:
import { VERSION } from "@oh-my-pi/pi-utils/dirs";
// SAU:
import { VERSION, WIRE_NAME } from "@oh-my-pi/pi-utils/dirs";

// dòng 59, TRƯỚC:
// Warp resolves this via CLIAgent.command_prefix(); OhMyPi is "omp".
// SAU:
// Warp resolves this via CLIAgent.command_prefix(); the value is the wire contract, see WIRE_NAME.

// dòng 60, TRƯỚC:
			agent: "omp",
// SAU:
			agent: WIRE_NAME,
```

Kiểm: `git grep -n '"omp"' -- packages/coding-agent/src/modes/warp-events.ts` → mong đợi **không có hit** (cả dòng 59 lẫn 60 đều phải sạch).

### Bước 3 — `packages/coding-agent/src/modes/acp/acp-agent.ts`, dòng 5, 657

Đã đọc `acp-agent.ts` 1–10 và 644–665. Dòng 5 và 657 đúng.

```typescript
// dòng 5, TRƯỚC:
import { getBlobsDir, isEnoent, logger, type postmortem, VERSION } from "@oh-my-pi/pi-utils";
// SAU:
import { getBlobsDir, isEnoent, logger, type postmortem, VERSION, WIRE_NAME } from "@oh-my-pi/pi-utils";

// dòng 657, TRƯỚC:
				title: "omp",
// SAU:
				title: WIRE_NAME,
```

**Dòng 656 KHÔNG đụng.** Đã đọc `acp-agent.ts` 653–659:

```
653| 		return {
654| 			protocolVersion: PROTOCOL_VERSION,
655| 			agentInfo: {
656| 				name: "omp",
657| 				title: "omp",
658| 				version: VERSION,
659| 			},
```

⚠️ **Kế hoạch nói dòng 656 là `name: "oh-my-pi"`. Sai — nó là `name: "omp"`.** Cả hai dòng 656 và 657 đều là token trần `"omp"`. Lý do kế hoạch đưa ra để không đụng 656 ("đó là tên package npm có scope, không cùng danh tính với token trần") **không có cơ sở trong cây hiện tại**. Xem mục 6, cạm bẫy #1 — đây là lý do phải viết lại cổng (3) ở dưới.

Dòng 648 là `name: "Set up omp in terminal"` — văn xuôi hướng tới người dùng, thuộc W3/W8b, **đừng đụng**.

### Bước 4 — `packages/coding-agent/src/blob-broker/uploaders-legacy.ts`, dòng 236 + import mới

Đã đọc `uploaders-legacy.ts` 1–15 và 230–242. Dòng 236 đúng. `grep -n "pi-utils"` trên file trả về **rỗng** — xác nhận chưa có import nào, nên đây là dòng import mới thật sự.

Thứ tự import (đặt sau `node:buffer`, trước các import cục bộ):

```typescript
import { Buffer } from "node:buffer";          // dòng 1, giữ nguyên
import { WIRE_NAME } from "@oh-my-pi/pi-utils";   // ← DÒNG MỚI
import type { BlobDestinationId } from "./destinations";   // dòng 2, giữ nguyên
...
```

```typescript
// dòng 236, TRƯỚC:
				const body = multipartFile(request, "f", { k: apiKey, z: "omp" });
// SAU:
				const body = multipartFile(request, "f", { k: apiKey, z: WIRE_NAME });
```

Giá trị chảy vào trường form multipart `z` qua `multipartFile` — đã đọc `packages/coding-agent/src/blob-broker/uploader-runtime.ts:105-115`, dòng 111 là `for (const key in fields) form.append(key, fields[key]);`.

Kiểm: `git grep -n '"omp"' -- packages/coding-agent/src/blob-broker/uploaders-legacy.ts` → mong đợi **không có hit**.

### Bước 5 — `packages/coding-agent/src/hindsight/bank.ts`, dòng 25, 29

Đã đọc `bank.ts` 1–60. Cả hai neo đúng.

```typescript
// dòng 25, TRƯỚC:
import { logger } from "@oh-my-pi/pi-utils";
// SAU:
import { logger, WIRE_NAME } from "@oh-my-pi/pi-utils";

// dòng 29, TRƯỚC:
const DEFAULT_BANK_NAME = "omp";
// SAU:
const DEFAULT_BANK_NAME = WIRE_NAME;
```

Dòng 30–32 (`PROJECT_TAG_PREFIX`, `UNKNOWN_PROJECT`, `MISSION_SET_CAP`) giữ nguyên.

Kiểm: `git grep -n '"omp"' -- packages/coding-agent/src/hindsight/bank.ts` → mong đợi **không có hit**.

**KHÔNG** đổi `packages/coding-agent/src/hindsight/settings.ts:172` — đã đọc, là `export const cfgHindsightRetainContext = register({ id: "hindsight.retainContext", type: "string", default: "omp" });`. Xem mục 6, cạm bẫy #4.

### Bước 6 — `packages/coding-agent/src/dap/session.ts`, dòng 3, 1465, 1466

Đã đọc `session.ts` 1–6 và 1458–1475. Cả ba neo đúng.

```typescript
// dòng 3, TRƯỚC:
import { logger, ptree, untilAborted } from "@oh-my-pi/pi-utils";
// SAU:
import { logger, ptree, untilAborted, WIRE_NAME } from "@oh-my-pi/pi-utils";

// dòng 1465-1466, TRƯỚC:
	#buildInitializeArguments(adapter: DapResolvedAdapter): DapInitializeArguments {
		return {
			clientID: "omp",
			clientName: "omp",
```
→
```typescript
	#buildInitializeArguments(adapter: DapResolvedAdapter): DapInitializeArguments {
		return {
			clientID: WIRE_NAME,
			clientName: WIRE_NAME,
```

`@oh-my-pi/pi-utils` khai báo ở `packages/coding-agent/package.json:546` (đã đọc: `"@oh-my-pi/pi-utils": "catalog:",`), và barrel `packages/utils/src/index.ts:5` re-export qua `dirs` — nên không cần dòng import mới.

Vị trí DAP là vị trí **duy nhất** trong năm không có test vàng.

### Bước 7 — `packages/utils/test/wire-name.test.ts` (TẠO MỚI)

⚠️ **Kế hoạch tự mâu thuẫn ở bước này.** Nó bảo import từ `../src/dirs` ("đường dẫn tương đối") rồi lại nói "khớp với kiểu của file anh em `packages/utils/test/dirs.test.ts` — hãy xem dòng import của file đó và sao chép". Đã đọc `dirs.test.ts:6-14`: file đó import từ `"@oh-my-pi/pi-utils/dirs"`, **không phải** đường dẫn tương đối.

Cả hai quy ước đều tồn tại trong `packages/utils/test/`. `../src/<mod>` là đa số (`acp.test.ts:11`, `chalk.test.ts:2`, `dates.test.ts:2`, `dom.test.ts:4`, `math-delimiters.test.ts:2`, `fs-open.test.ts:6-7`…). **Dùng `../src/dirs`.**

Nội dung:

```typescript
import { describe, expect, it } from "bun:test";
import { WIRE_NAME } from "../src/dirs";

describe("WIRE_NAME", () => {
	it("pins the shared wire identity to the value the DAP, Warp, ACP and puush integrations are golden-pinned to", () => {
		expect(WIRE_NAME).toBe("omp");
	});
});
```

Ràng buộc (theo AGENTS.md và theo tinh thần đặc tả):
- **Đúng một** khẳng định. Đừng thêm test cho từng vị trí ở đây.
- Không đọc file nguồn (source-grep bị cấm), không `mock.module()`, không khẳng định "hằng số tồn tại" hay "độ dài chuỗi".
- Không import bất cứ thứ gì từ `packages/coding-agent`.
- Vì sao hợp đồng là "hằng số còn giữ đúng byte", không phải "một hằng số chứa một chuỗi": nếu test này cũng so với `WIRE_NAME` thì việc phát hiện đổi tên tan biến — bốn test vàng sẵn có (giữ nguyên) mới là thứ bảo vệ byte.

### Bước 8 — repo-wide

```bash
git add -A && git diff --cached --stat
```

Danh sách file đổi phải đúng là **7 đường dẫn, không hơn**:

```
packages/utils/src/dirs.ts
packages/coding-agent/src/dap/session.ts
packages/coding-agent/src/blob-broker/uploaders-legacy.ts
packages/coding-agent/src/modes/warp-events.ts
packages/coding-agent/src/modes/acp/acp-agent.ts
packages/coding-agent/src/hindsight/bank.ts
packages/utils/test/wire-name.test.ts     (mới)
```

`packages/catalog/src/wire/codex.ts:52` (`ORIGINATOR_CODEX: "omp"`, đã đọc) phải **KHÔNG** nằm trong danh sách.

⚠️ **Dùng `--cached`, không dùng `--stat` trần.** `git diff --stat` không thấy file mới chưa `git add`, cũng không thấy file đã `git add` — dùng nhầm cho cổng XANH vì không thấy gì, tệ hơn là đỏ. (Cảnh báo này của kế hoạch là đúng và nên giữ.)

Rồi chạy `bun run check:ts`.

### Bước 9 — CHANGELOG

**KHÔNG** thêm mục nào vào `packages/utils/CHANGELOG.md`. Thay đổi vô hình với người dùng (giá trị không đổi), và AGENTS.md yêu cầu mục phải hướng tới người dùng.

---

## 4. Hợp đồng test

**Tên file:** `packages/utils/test/wire-name.test.ts` (MỚI — test duy nhất mục này thêm vào)

| Test file | Trạng thái | Khóa cái gì | Đã chạy? |
| --- | --- | --- | --- |
| `packages/utils/test/wire-name.test.ts` | **MỚI** | `WIRE_NAME === "omp"` — hằng số dùng chung còn giữ đúng byte | chưa (chưa tồn tại) |
| `packages/coding-agent/test/modes/warp-events.test.ts:111` | CÓ SẴN, **KHÔNG ĐỔI** | `agent: "omp"` trong `JSON.stringify` chính xác của thân OSC 777 | ✅ **24 pass / 0 fail** |
| `packages/coding-agent/test/modes/warp-events.test.ts:770` | CÓ SẴN, **KHÔNG ĐỔI** | `agent: "omp"` lần thứ hai, trong `toEqual` của OSC `permission_request` | ✅ (cùng lần chạy trên) |
| `packages/coding-agent/test/acp-initialize-conformance.test.ts:235` | CÓ SẴN, **KHÔNG ĐỔI** | `title: "omp"` qua `objectContaining` | ✅ (cùng lần chạy) |
| `packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts:342` | CÓ SẴN, **KHÔNG ĐỔI** | `form.get("z") === "omp"` | ✅ (cùng lần chạy) |
| `packages/coding-agent/test/hindsight-bank.test.ts:82,95,101,107,123,191,201` | CÓ SẴN, **KHÔNG ĐỔI** | 7 bank id dẫn xuất: `"omp"`, `"omp-proj"`, `"omp-unknown"`, `"omp-general"`, `"omp"`, `"omp-myrepo"`, `"omp-bare-repo.git"` | ✅ (cùng lần chạy) |

Đã chạy thật ở HEAD hiện tại:
```
bun test packages/coding-agent/test/modes/warp-events.test.ts
  → 24 pass 0 fail (106 expect() calls)

bun test packages/coding-agent/test/acp-initialize-conformance.test.ts \
          packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts \
          packages/coding-agent/test/hindsight-bank.test.ts
  → 42 pass 0 fail (210 expect() calls)
```

**Bốn test vàng phải được giữ nguyên từng byte — dùng chuỗi trần, KHÔNG chuyển sang so sánh với `WIRE_NAME`.** Nếu một test khẳng định `emitted === WIRE_NAME`, thì đặt `WIRE_NAME = "ultraworkers"` khiến nó đỏ-xanh trong khi cả năm tích hợp đều hỏng. Hằng số là thứ **đang được đổi tên**; chuỗi trần mới là **hợp đồng**.

**Khoảng trống đã biết, nói thẳng:** vị trí DAP (`dap/session.ts:1465-1466`) không có test trực tiếp — `#buildInitializeArguments` là method ES `#private` chỉ đi tới qua toàn bộ đường khởi chạy `DapSessionManager`, và repo không có file test DAP nào (chỉ có `packages/coding-agent/test/dap-write-sink-flush.typecheck.ts`, 258 byte, đã xác nhận tồn tại). Được đóng gián tiếp: cả năm vị trí đọc cùng một hằng số. **Không** dựng harness DAP cho mục này.

**Người dùng thấy gì nếu hồi quy:** nếu `WIRE_NAME` bị đặt thành `"ultraworkers"`, không có lỗi nào được ném ra. Một terminal Warp ngừng gán sự kiện cho omp; một client ACP hiện sai agent title; một DAP debug adapter không còn nhận ra yêu cầu initialize của chúng ta; một lượt tải lên puush bị từ chối hoặc bị ghi dưới một tác giả lạ; và mọi ký ức Hindsight sẵn có rơi vào một bank mà người dùng không còn truy cập được.

---

## 5. Cổng

### 5.1 Cổng nào thật sự đỏ được — câu trả lời: **3 trên 5**

#### Cổng (1) — ĐỎ ĐƯỢC ✅

```bash
bun test packages/utils/test/wire-name.test.ts
```

Đỏ ngay khi `WIRE_NAME` khác `"omp"`. **Kiểm chứng được:** tạm đặt `export const WIRE_NAME: string = "ultraworkers";`, chạy, xác nhận có một lần đỏ, hoàn nguyên. Đây là cổng mang tải — thứ DUY NHẤT khoá chính hằng số, và là toàn bộ hàng phòng thủ trước lỗi mà kế hoạch nêu đầu tiên.

#### Cổng (2) — ĐỎ ĐƯỢC ✅

```bash
bun run check:ts
```

Script có thật: `package.json:90` → `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`. Đỏ nếu một symbol không được export/re-export đúng, hoặc một tên import sai.

**Baseline đã đo tại HEAD `47720fd`:** `bun run check:ts` → **exit code 0**, cả 13 package `check:types` đều Done. Nghĩa là cổng này có baseline sạch — đỏ sau khi sửa là lỗi của W1, không phải nhiợp tồn đọng.

#### Cổng (3) — ĐỎ ĐƯỢC, **nhưng phải viết lại** ⚠️

Bản gốc: `git diff packages/coding-agent/test/ packages/catalog/` phải RỖNG. Đỏ được nếu ai đó sửa test vàng. **Nhưng** lệnh này *không* bắt được việc thêm một file test mới ở `packages/coding-agent/test/` khi file đó đã `git add`. Bản viết lại (bắt được cả hai):

```bash
git diff HEAD --stat -- packages/coding-agent/test/ packages/catalog/
# RỖNG. Bắt được cả file đã add lẫn file đã sửa.
```

#### Cổng (4) — ĐỎ ĐƯỢC ✅ (sau khi sửa câu lệnh)

```bash
git add -A && git diff --cached --stat
```

Đỏ nếu danh sách file đổi khác 7 đường dẫn đã liệt kê — nổi bật là nếu `packages/catalog/src/wire/codex.ts` lọt vào, hoặc nếu một "vị trí thứ sáu" bị gộp vào.

#### Cổng (5) — **KHÔNG THỂ ĐỎ ĐƯỢC.** Phải viết lại. 🚨

Bản gốc của kế hoạch:
> `git grep -n '"omp"'` trên bốn file nguồn coding-agent từng có chuỗi trần trả về không hit nào, trong khi `acp-agent.ts` vẫn giữ `name: "oh-my-pi"` ở dòng 656.

**Cổng này không bao giờ có thể xanh.** Baseline đã đo được:

```
$ git grep -n '"omp"' -- packages/coding-agent/src/modes/acp/acp-agent.ts
packages/coding-agent/src/modes/acp/acp-agent.ts:656:				name: "omp",
packages/coding-agent/src/modes/acp/acp-agent.ts:657:				title: "omp",
```

Hai hit. Chỉ 657 được sửa. 656 được lệnh **giữ nguyên**. Vậy cổng luôn đỏ → hoặc kỹ sư sửa 656 (đúng thứ cấm), hoặc bỏ qua cổng. Cả hai đều tệ. Đây đúng là loại "cổng luôn xanh tệ hơn không có cổng" mà đặc tả cảnh báo.

**Viết lại cho đỏ được:**

```bash
# (5a) Bốn file có thể sạch hoàn toàn — đỏ nếu còn sót:
git grep -n '"omp"' -- \
  packages/coding-agent/src/dap/session.ts \
  packages/coding-agent/src/blob-broker/uploaders-legacy.ts \
  packages/coding-agent/src/modes/warp-events.ts \
  packages/coding-agent/src/hindsight/bank.ts
# mong đợi: KHÔNG có hit

# (5b) acp-agent.ts: đúng MỘT hit còn lại, và nó phải là `name:`, không phải `title:`
git grep -n '"omp"' -- packages/coding-agent/src/modes/acp/acp-agent.ts
# mong đợi: ĐÚNG 1 dòng, dòng 656, nội dung `name: "omp",`
```

Cổng này đỏ thật: nếu kỹ sư gộp 656 vào, hoặc bỏ sót một hit nào đó, hoặc sửa 656 thành `WIRE_NAME` khiến còn 0 hit — cả ba đều đỏ.

### 5.2 Bộ lệnh xác minh đầy đủ (chạy được NGAY HÔM NAY)

⚠️ **Kế hoạch nói máy chưa build addon. Điều đó KHÔNG CÒN ĐÚNG ở HEAD hiện tại.** `packages/natives/native/pi_natives.darwin-arm64.node` đã tồn tại (185 MB, build 07:32), `ninja` đã cài ở `/opt/homebrew/bin/ninja`, và cả bốn test vàng đều xanh (24 + 42 = 66 test, 0 fail). Toàn bộ khối "PHẢI ĐỎ XANH, cần addon native / `brew install ninja` / `bun --cwd=packages/natives run build`" trong kế hoạch là **thừa**. Bỏ qua nó, chạy thẳng:

```bash
# Nhóm 1 — bốn test vàng (đã xanh ở HEAD, KHÔNG cần build gì thêm)
bun test packages/coding-agent/test/modes/warp-events.test.ts \
          packages/coding-agent/test/acp-initialize-conformance.test.ts \
          packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts \
          packages/coding-agent/test/hindsight-bank.test.ts

# Nhóm 2 — test mới
bun test packages/utils/test/wire-name.test.ts

# Nhóm 3 — kiểu
bun run check:ts

# Nhóm 4 — phạm vi: đúng 7 đường dẫn
git add -A && git diff --cached --stat

# Nhóm 5 — chốt khoá vàng còn nguyên (CẢ file đã add lẫn file đã sửa)
git diff HEAD --stat -- packages/coding-agent/test/ packages/catalog/    # RỖNG

# Nhóm 6 — giá trị wire đã dịch chuyển hết (xem 5.1)
git grep -n '"omp"' -- \
  packages/coding-agent/src/dap/session.ts \
  packages/coding-agent/src/blob-broker/uploaders-legacy.ts \
  packages/coding-agent/src/modes/warp-events.ts \
  packages/coding-agent/src/hindsight/bank.ts                          # KHÔNG có hit
git grep -n '"omp"' -- packages/coding-agent/src/modes/acp/acp-agent.ts  # ĐÚNG 1 hit: :656 name:
git grep -n '"omp"' -- packages/catalog/src/wire/codex.ts               # :52 KHÔNG ĐỔI
```

### 5.3 Cổng hoàn thành

Mục này XONG khi **cả năm** điều sau đúng:

1. `bun test packages/utils/test/wire-name.test.ts` **ĐỎ** nếu `WIRE_NAME !== "omp"` — kiểm chứng bằng cách tạm đặt `"ultraworkers"`, xác nhận đỏ, hoàn nguyên. **(ĐỎ ĐƯỢC)**
2. `bun run check:ts` **XANH**. **(ĐỎ ĐƯỢC)**
3. `git diff HEAD --stat -- packages/coding-agent/test/ packages/catalog/` **RỖNG**. Bất kỳ file test nào bị đổi là kỹ sư đã biến một chốt khoá vàng thành mệnh đều. **(ĐỎ ĐƯỢC)**
4. `git add -A && git diff --cached --stat` liệt kê **đúng 7** đường dẫn ở bước 8, và `packages/catalog/src/wire/codex.ts` không nằm trong đó. **(ĐỎ ĐƯỢC)**
5. Cổng (5a)+(5b) ở mục 5.1: bốn file sạch, `acp-agent.ts` còn **đúng một** hit ở dòng 656 với nội dung `name:`. **(ĐỎ ĐƯỢC sau khi viết lại)**

Không điều nào trong năm điều trên là mệnh đều hay `not.toThrow()` trần; mỗi điều nêu một giá trị mà bên thứ ba đọc.

---

## 6. Cạm bẫy riêng của work item này

### Cạm bẫy #1 — `acp-agent.ts:656` KHÔNG phải `"oh-my-pi"`, và quyết định N5 của kế hoạch dựa trên điều đó

Đây là cạm bẫy lớn nhất, và nó **làm hỏng cả một quyết định đã được đóng** trong đặc tả.

Kế hoạch khẳng định: `acp-agent.ts:656` là `name: "oh-my-pi"`, và `acp-initialize-conformance.test.ts:233-238` đã khoá **cả** `name` lẫn `title`, nên yêu cầu "đừng để nó rơi vào khoảng trống" của plan đã được thoả mà không tốn dòng code nào.

Đã mở và đọc cả hai. Cả hai khẳng định đều sai:

```
$ sed -n '655,658p' packages/coding-agent/src/modes/acp/acp-agent.ts
655| 			agentInfo: {
656| 				name: "omp",
657| 				title: "omp",
658| 				version: VERSION,
```

```
$ sed -n '233,238p' packages/coding-agent/test/acp-initialize-conformance.test.ts
233| 		expect(response.agentInfo).toEqual(
234| 			expect.objectContaining({
235| 				title: "omp",
236| 				version: VERSION,
237| 			}),
238| 		);
```

Không có khoá `name` nào. (`title: "omp"` ở dòng **235**, không phải 237.)

Hệ quả thực tế, ba điều:

- **Lý do kỹ sư không được đụng 656 là sai.** "Đó là tên package npm có scope, không cùng danh tính với token trần" — không có cơ sở; 656 là **chính** token trần. Đừng dùng lý do đó để biện minh.
- **`agentInfo.name` không có test nào khoá.** Nó là giá trị mà một client ACP đọc để quyết định nó đang nói chuyện với agent nào. Khi đổi tên ở W7/W9, nó sẽ đổi im lặng.
- **Cổng (5) của kế hoạch không bao giờ xanh** (mục 5.1).

Cách gõ đúng: sửa **chỉ dòng 657**. Để 656 nguyên. Cổng (5b) khoá hành vi đó. Nếu chủ milestone muốn `name` cũng được bảo vệ, đó là một work item riêng — **đừng** lấn sang W1.

### Cạm bẫy #2 — Gõ nhầm tên thương hiệu mới vào `WIRE_NAME`

Đúng như kế hoạch nêu, và vẫn là lỗi nhiều khả năng nhất: hằng số này sinh ra là để được đổi tên, còn tên mới nằm ngay đó trong mô tả milestone. Nếu xảy ra, cả năm tích hợp đổi danh tính cùng lúc và **không gì ném lỗi**.

Biến thể thứ hai tệ không kém: thấy bốn test vàng đỏ rồi "giúp" viết lại chúng để so với `WIRE_NAME`. Làm thế thì việc đổi tên trở nên vô hình với bộ test mãi mãi, phá hủy đúng mục đích của cả mục. Cổng (3) sinh ra chính vì thế.

### Cạm bẫy #3 — `dirs.ts` còn một giá trị wire `"omp"` thứ hai mà kế hoạch bỏ sót

Kế hoạch nói "KHÔNG thêm thay đổi nào khác vào `dirs.ts`". Đã đọc `dirs.ts:1097-1106`:

```typescript
export function getAppName(): string {
	const value = process.env.OMP_APP_NAME?.trim();
	return value ? value : "omp";        // ← dòng 1105
}
```

Giá trị này đi ra **bên ngoài**:
- `packages/ai/src/providers/pi-native-client.ts:127` → header `"x-omp-app": getAppName(),` tới nhà cung cấp suy luận
- `packages/ai/src/auth-broker/remote-store.ts:1415` → `app: getAppName()` trong danh tính gửi lên auth-broker

Đây là một giá trị wire, trong `packages/utils/src` — đúng phạm vi grep mà kế hoạch tự nêu. Không đụng vào ở W1 (nó phụ thuộc `OMP_APP_NAME` và thuộc W3/W6), nhưng **phải báo cáo**, vì lệnh quét `sed` của W7 và đợt quét display-token của W8b sẽ vấp vào nó.

### Cạm bẫy #4 — Bản đồ wire thiếu: thêm hai giá trị nữa ngoài sáu giá trị kế hoạch đã liệt kê

Kế hoạch liệt kê sáu "giá trị wire bổ sung" và đúng hết (đã xác minh tất cả: `stencil.kdl:13`, `openai-codex.kdl:12`, `avatar.ts:50`, `report-tool-issue.ts:441`, `omp-protocol.ts:28`, `settings.ts:172`). Nhưng còn **hai** nữa, cả hai đều trong phạm vi grep mà kế hoạch tự nêu (`packages/{coding-agent,catalog,utils,tui}/src`):

| Vị trí | Nội dung | Vì sao là wire |
| --- | --- | --- |
| `packages/tui/src/terminal-capabilities.ts:1436` | `const OSC99_APP_NAME = "omp";` | Đi ra tại dòng 1535: ``const meta: string[] = [`i=${id}`, `f=${base64Utf8(OSC99_APP_NAME)}`];`` — trường `f=` trong dòng meta OSC 99 gửi tới multiplexer cmux/Herdr. **Cùng họ với trường `agent` của OSC 777 Warp mà W1 CÓ đưa vào.** |
| `packages/utils/src/dirs.ts:1105` | `return value ? value : "omp";` | Xem cạm bẫy #3. |

Đừng lặng lẽ thêm chúng vào W1 (kế hoạch cấm vị trí thứ sáu), và đừng lặng lẽ bỏ qua — nếu không thì lệnh `sed` của W7 và quét của W8b sẽ thành thứ tự quyết định. Đề xuất: một work item riêng.

### Cạm bẫy #5 — Mọi lý do "máy chưa build addon" trong đặc tả đã lỗi thời

Addon **đã** build (`packages/natives/native/pi_natives.darwin-arm64.node`, 185 MB). `ninja` đã cài. Bốn test vàng chạy xanh ngay. Nếu kỹ sư đọc đặc tả và tin rằng bốn test đó "không chạy được trên máy này", họ sẽ bỏ qua chúng — tức bỏ qua đúng bốn chốt khoá vàng mà toàn bộ mục này dựa vào.

Ngoài ra, cơ chế được nêu trong đặc tả cũng sai: `dirs.ts` **có** import `@oh-my-pi/pi-natives` (dòng 17: `import { expandWindowsLongPath } from "@oh-my-pi/pi-natives/path";`). Test vẫn chạy được không phải vì đồ thị import sạch, mà vì `packages/natives/native/path.js:13` trì hoãn: `return process.platform === "win32" ? nativePathFn(...) : path` — native chỉ được nạp trên Windows. Kết luận giống nhau, lý do khác.

### Cạm bẫy #6 — Đừng để thay đổi `APP_NAME` của W3 lọt vào đây

`WIRE_NAME` phải là chuỗi trần của riêng nó, không phải bí danh của `APP_NAME`. Nếu không, việc đổi tên hiển thị ở W3 sẽ lặng lẽ kéo theo giá trị wire — đúng thứ mà `dirs.ts:1103-1105` (`getAppName()` đọc `OMP_APP_NAME` rồi fallback `"omp"`) đang minh hoạ là có thật.

---

## 7. Đính chính với kế hoạch (KHÔNG sửa file kế hoạch — ghi ra ở đây)

| Nội dung trong kế hoạch | Trạng thái | Hiện thực đã kiểm |
| --- | --- | --- |
| `dirs.ts:21` là `export const APP_NAME`; `APP_URL` ở 24; `CONFIG_DIR_NAME` ở 27; `USER_AGENT` ở 36 | **SAI, lệch 1 dòng** | 21 = JSDoc, **22** = `APP_NAME`; `APP_URL` **25**; `CONFIG_DIR_NAME` **28**; `USER_AGENT` **37** |
| `acp-agent.ts:656` là `name: "oh-my-pi"` | **SAI** | `656\| name: "omp",` — cùng token trần |
| `acp-initialize-conformance.test.ts:233-238` khoá `{ name: "oh-my-pi", title: "omp", version }` | **SAI** | khoá `{ title: "omp", version: VERSION }` — **không có** khoá `name` |
| `title: "omp"` ở `acp-initialize-conformance.test.ts:237` | **SAI** | ở dòng **235** |
| Quyết định N5 ("test sẵn có đã khoá cả hai, nên không cần dòng code nào") | **SAI LẬT ĐẦU** | Chỉ khoá `title`. `agentInfo.name` không có test |
| Cổng: `git grep '"omp"'` trên `acp-agent.ts` phải không có hit | **KHÔNG THỂ XANH** | baseline 2 hit (656, 657); chỉ 657 được sửa → phải viết lại thành "đúng 1 hit ở 656" |
| `hindsight-bank.test.ts` khoá ở 82, 102, 108, 114, 136, 210, 220, 277, 278 (9 chốt) | **SAI** (chỉ 82 đúng) | 7 chốt thật: **82, 95, 101, 107, 123, 191, 201** |
| `warp-events.test.ts:111` là chốt vàng duy nhất | **THIẾU MỘT** | có chốt thứ hai ở **:770** (`agent: "omp"` trong `toEqual` của OSC `permission_request`) |
| `acp-agent.ts` object được trả về "khoảng dòng 654" | gần đúng | `return {` ở **653**, `agentInfo: {` ở **655** |
| Bước 7: import `../src/dirs` "khớp kiểu của `dirs.test.ts`" | **TỰ MÂU THUẪN** | `dirs.test.ts:6-14` dùng `"@oh-my-pi/pi-utils/dirs"`, không phải đường dẫn tương đối. `../src/<mod>` là đa số trong `packages/utils/test/` → dùng `../src/dirs` |
| "Đồ thị import của `dirs.ts` không chạm `@oh-my-pi/pi-natives`" | **SAI cơ chế** | `dirs.ts:17` import `@oh-my-pi/pi-natives/path`. Test vẫn chạy vì `native/path.js:13` chỉ nạp native trên Windows |
| Bốn test vàng "chạy được sau khi `brew install ninja` + build addon"; máy chưa build | **LỖI THỜI** | addon **đã** build (185 MB), `ninja` **đã** có, cả bốn test **xanh** (24 + 42 = 66, 0 fail) |
| HEAD là `808b409fa367...` | **LỖI THỜI** | `git rev-parse HEAD` → `47720fd42c075bdd076fa1ec176dc2417325f035` |
| Sáu giá trị wire bổ sung ngoài bộ của plan | **ĐÚNG** | đã xác minh cả sáu: `stencil.kdl:13`, `openai-codex.kdl:12`, `avatar.ts:50`, `report-tool-issue.ts:441`, `omp-protocol.ts:28`, `settings.ts:172` |
| "Wire set đúng là 5 vị trí" | **THIẾU 2** | thêm `packages/tui/src/terminal-capabilities.ts:1436` (OSC 99 `f=`) và `packages/utils/src/dirs.ts:1105` (`getAppName()` → `x-omp-app`) |
| `codex.ts:52` chỉ đọc | **ĐÚNG, nhưng bỏ sót rủi ro** | `catalog/src/wire/codex.ts:52` = `ORIGINATOR_CODEX: "omp",` ✓; nguồn thật là `openai-codex.kdl:12` — một `bun run gen:compat` sau chỉnh sửa KDL không liên quan có thể làm nó dịch chuyển mà không có diff TS nào |
| `packages/coding-agent/test/dap-write-sink-flush.typecheck.ts` là test DAP duy nhất | **ĐÚNG** | file tồn tại, 258 byte; không có file test DAP nào khác |
| 5 fixture `retainContext: "omp"` | **ĐÚNG, từng dòng** | `hindsight-bank.test.ts:55`, `hindsight-conversation-timestamps.test.ts:35`, `hindsight-mm-cache-stability.test.ts:34`, `hindsight-retention-cache.test.ts:27`, `memory-tools.test.ts:63` |
| `scripts/ci-test-ts.ts:86-87`, `:254`; `package.json:546`; `utils/src/index.ts:5` | **ĐÚNG** | đã đọc cả năm |
| `uploaders-legacy.ts` không có import `@oh-my-pi/pi-utils` nào; `uploader-runtime.ts:105-115` | **ĐÚNG** | `grep -n "pi-utils"` rỗng; `form.append(key, fields[key])` ở dòng 111 |
| `acp-agent.test.ts` không khoá `agentInfo` nào | **ĐÚNG** | file tồn tại (126 KB); `grep -n "agentInfo"` không ra hit |
| Cảnh báo "dùng `--cached` không dùng `--stat` trần" | **ĐÚNG** | giữ nguyên |
