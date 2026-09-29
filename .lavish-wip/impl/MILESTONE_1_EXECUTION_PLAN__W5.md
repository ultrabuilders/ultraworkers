# PHIẾU TRIỂN KHAI — W5: Làm cho trích dẫn type-conformance treo lơ lửng có thật

**Kế hoạch:** `MILESTONE_1_EXECUTION_PLAN.md` §W5 (dòng 1060–1141)
**Ngày kiểm chứng:** 2026-09-29 · commit `65cc6c1` · branch `milestone-1`
**Trạng thái:** đã chạy thật cả hai cổng. Mã xanh = 0, mã đỏ = 1. Chi tiết ở §Cổng.

---

## 1. Cái gì thay đổi, quan sát được

Một file type-only mới tồn tại ở `packages/coding-agent/test/collab/web-wire.types.ts`, khiến câu bình luận đã treo lơ lửng ở `packages/wire/src/index.ts:7` trở thành sự thật: từ giờ, thêm hoặc đổi tên một discriminant `t` trong `@oh-my-pi/pi-wire` mà phía host `CollabFrame` không theo kịp sẽ làm `bun run check:ts` **đỏ** ngay trong CI, thay vì lọt xuống dưới dạng frame bị nuốt im lặng lúc chạy.

Không có code runtime. Không đổi `packages/wire/` (`git diff packages/wire/` rỗng trước và sau). Người dùng cuối không thấy gì.

---

## 2. Bảng điểm sửa

| đường/dẫn | symbol / hàm | TRƯỚC (nguyên văn từ file thật) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/test/collab/web-wire.types.ts` | *(toàn bộ file)* | **KHÔNG TỒN TẠI** — `ls` trả `No such file or directory` | File 46 dòng, type-only. Dòng 11–12 là hai `import type`; dòng 14–16 ba helper; dòng 18–19 hai union discriminant; dòng 46 là `export type WireCoveredByHost = Expect<Assignable<WireT, CollabT>>;` |
| `packages/wire/src/index.ts` | `WireFrame` / `HostFrame` | `* asserted type-only in \`packages/coding-agent/test/collab/web-wire.types.ts\`.` (dòng 7) | **KHÔNG ĐỔI.** Dòng 7 vốn đã ghi đúng đường dẫn tương lai; tạo file làm nó thành sự thật |
| `packages/wire/src/index.ts` | arm `bye` trong `HostFrame` (thứ hai từ cuối — xem S4) | `	\| { t: "bye"; reason: string }` (dòng 379) | **KHÔNG ĐỔI.** Chỉ bị mutate tạm ở bước cổng đỏ rồi `git checkout --` hoàn tác |
| `packages/wire/CHANGELOG.md` | `## [Unreleased]` | `## [Unreleased]` rỗng, ngay dòng 3 | **KHÔNG ĐỔI** — xem Bước 7 |

Trạng thái cây sau khi làm xong (đã kiểm bằng `git status --porcelain packages/`):

```
?? packages/coding-agent/test/collab/web-wire.types.ts
```

---

## 3. VIỆC 1 — Kết quả kiểm lại từng neo

Cột "đúng?" dựa trên việc **mở đúng dòng và đọc**, không đoán.

| # | Neo trong W5 | Nội dung thật tại dòng đó | Đúng? |
| --- | --- | --- | --- |
| 1 | `packages/wire/src/index.ts:7` | `* asserted type-only in \`packages/coding-agent/test/collab/web-wire.types.ts\`.` | ✅ **ĐÚNG** |
| 2 | `packages/wire/src/index.ts:379` | `\| { t: "bye"; reason: string }` | ✅ Đúng dòng, xem S4 về mô tả "arm cuối" |
| 3 | `packages/coding-agent/package.json:547` | `"@oh-my-pi/pi-wire": "catalog:",` | ✅ **ĐÚNG** |
| 4 | `package.json:94` (ghi là `check:ts`) | `"lint:ts": "bun run --parallel lint:tools && ..."` | ❌ **SAI** |
| 5 | `packages/coding-agent/tsconfig.json` | `{"extends": "../tsconfig.workspace.json", "include": ["src","test","scripts"]}` | ✅ **ĐÚNG** |
| 6 | `tsconfig.base.json` (gốc repo) | chứa `"verbatimModuleSyntax": true` | ✅ **ĐÚNG** |
| 7 | `packages/tsconfig.base.json` | không tồn tại (`ls` → `No such file or directory`) | ✅ **ĐÚNG** (tài liệu nói đúng là file này *không* có) |
| 8 | `packages/wire/CHANGELOG.md` | `## [Unreleased]` ở dòng 3, rỗng | ✅ **ĐÚNG** |
| 9 | `scripts/ci-test-ts.ts` (runner chỉ gom `*.test.ts`) | dòng 234: `if (!entry.isFile() \|\| !entry.name.endsWith(".test.ts")) { continue; }` | ✅ **ĐÚNG** |
| 10 | lỗi đỏ kỳ vọng `(44,40)` | thực tế là **`(46,40)`** | ❌ **SAI** (cột đúng, dòng sai) |
| 11 | package.json:523 `check:types` | `"check:types": "tsgo -p tsconfig.json --noEmit"` | ✅ **ĐÚNG** (anchor bổ sung, không có trong W5) |

### Sai sót phải ghi ra (KHÔNG sửa trong tài liệu)

**S1 — `package.json:94` không phải `check:ts`.**
`check:ts` nằm ở **dòng 90**:
```
90:		"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",
91:		"check:tools": "oxlint . && oxfmt --check 'packages/*/src/**/*.{ts,tsx}' 'packages/*/{test,bench,examples,scripts}/**/*.ts' ...",
94:		"lint:ts": "bun run --parallel lint:tools && bun run --workspaces --if-present lint",
```
Lệnh `bun run check:ts` vẫn chạy đúng — chỉ là số dòng trong neo sai. Kỹ sư gõ neo vào PR description sẽ bị bắt.

**S2 — Vị trí lỗi đỏ là `(46,40)`, không phải `(44,40)`.**
Đã chạy thật, output thật:
```
test/collab/web-wire.types.ts(46,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.
```
Cột 40 đúng (trỏ vào `Assignable<...>` trên dòng `export type ... = Expect<Assignable<...>>`). Dòng 46 vì khối bình luận JSDoc 25 dòng chiếm dòng 21–45. Kỹ sư nên tự chạy lại và dán **output thật**, đừng copy số 44.

**S3 — Đây là sai nghiêm trọng nhất: khẳng định "chín discriminant" trong bình luận SAI.**

Tài liệu khẳng định, và sẽ được **chép nguyên văn vào file mãi mãi**:
> Wire's `AgentEvent` declares nine turn/message/tool-execution discriminants the host never emits — `agent_start`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end` (verified to be exactly `Exclude<AgentEvent's type, AgentSessionEvent's type>`)

**Đã kiểm bằng compiler, không phải bằng mắt.** Probe:
```typescript
type D<U> = U extends { type: infer T } ? T : never;
type OnlyWire = Exclude<D<WireAgentEvent>, D<AgentSessionEvent>>;
type IsNever<X> = [X] extends [never] ? "NEVER" : "NON-NEVER";
```
Kết quả tsgo: `Type '"NEVER"' is not assignable to type '1'` → **`OnlyWire` là `never`**.

Nghĩa là: **không có discriminant nào thuộc wire mà host thiếu.** Cả chín cái tên kia đều *có* trong host. Lý do là host `AgentSessionEvent` (`packages/coding-agent/src/session/agent-session-events.ts:13`) được xây trên `Exclude<AgentEvent, { type: "agent_end" }>` của **agent-core**, không phải của wire — và agent-core định nghĩa đủ cả chín.

Chiều lệch **thật** là ngược lại. `Exclude<AgentSessionEvent's type, WireAgentEvent's type>` cho ra 12 tên:
```
advisor_cost_changed, advisor_yielded, config_warnings_changed, goal_updated,
irc_message, model_changed, retry_fallback_applied, retry_fallback_succeeded,
todo_auto_clear, todo_reminder, tool_stream_update, ttsr_triggered
```
Tài liệu liệt kê 6 tên trong số này (`model_changed`, `advisor_cost_changed`, `advisor_yielded`, `goal_updated`, `irc_message`, `todo_auto_clear`) — phần "và những cái khác" là đúng, và **đây mới** là bất đối xứng thật sự.

Vì sao điều này quan trọng: đây là bình luận giải thích *tại sao không assert payload assignability*. Nếu để nguyên, file vĩnh viễn ghi một lý do sai — và lý do sai thì người đọc sau sẽ tin rằng payload của wire vượt host, trong khi thực tế ngược lại. Chỉ cần sửa **một chiều** của câu: "nine discriminants the host never emits" → mô tả 12 tên host có mà wire không. Phần `Exclude<...>` phải đổi thành `Exclude<AgentSessionEvent's type, WireAgentEvent's type>`.

**S4 — Ghi chú nhỏ về neo `379`:** dòng 379 là arm **thứ hai từ cuối**, không phải arm cuối. Arm cuối là dòng 380 `| { t: "error"; message: string };`. Dùng 379 vẫn đúng mục đích (đổi tên `bye`), nhưng mô tả "arm cuối của `HostFrame`" thì không chính xác.

**S5 — Chi tiết môi trường:** bước 1 của W5 nói "trong checkout này `node_modules` vắng mặt". **Sai** — `node_modules/` có 243 mục, `tsgo`/`oxlint`/`oxfmt` đều có trong `node_modules/.bin/`. Mọi cổng dưới đây đã chạy được ngay, không cần `bun install --frozen-lockfile`.

---

## 4. Các bước, đánh số, mỗi bước có neo đã kiểm

### Bước 1 — Baseline xanh (đã chạy, exit 0)

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
bun run check:tools
```
**Kết quả thật: exit 0.** Trong đó:
```
Checking formatting...
All matched files use the correct format.
Finished in 280ms on 5445 files using 10 threads.
```
*(Một warning `eslint(no-unused-vars)` tại `packages/coding-agent/test/mcp-project-config-not-trusted-by-default.test.ts:19` là **có sẵn từ trước**, không liên quan, không làm đỏ.)*

Không dùng `tsc`/`npx tsc` (AGENTS.md cấm). Không cần `bun install` — xem S5.

### Bước 2 — Tạo file (đã tạo)

`packages/coding-agent/test/collab/web-wire.types.ts`, 46 dòng, đúng như khối `code_shape` — **trừ phần bình luận phải sửa theo S3**.

Hai điểm tải trọng, đã kiểm chứng cả hai:

**(a) Alias phải là `export type`.** Đã thử: file chứa `type NotExported = "hello";` không export →
```
warning eslint(no-unused-vars): Type alias 'NotExported' is declared but never used.
```
Lưu ý chính xác: đây là **warning**, và `oxlint` **vẫn exit 0**. Nên nó không làm đỏ cổng — nhưng đúng là gây nhiễu. `export type` là cách đúng về cả style lẫn ý nghĩa (export = đây là bảo đảm được tuyên bố, không phải rác).

**(b) Import phải là `import type`.** `tsconfig.base.json` gốc repo có `"verbatimModuleSyntax": true` (đã đọc, dòng 15). `packages/tsconfig.base.json` **không tồn tại** — câu này trong W5 là đúng. Import giá trị sẽ thành lỗi runtime dưới `verbatimModuleSyntax`.

### Bước 3 — Cổng 1 XANH: `bun run check:ts` (đã chạy, exit 0)

```bash
bun run --cwd packages/coding-agent check:types
# $ tsgo -p tsconfig.json --noEmit
# EXIT=0, output rỗng
```
```bash
bun run check:tools
# EXIT=0
```

File được với tới vì `packages/coding-agent/tsconfig.json` có `"include": ["src","test","scripts"]` (đã đọc). Cả glob lint lẫn glob format đều khớp — **đã chứng minh bằng phản thí**: thêm `\n\nconst   x=1\n` vào cuối file, `oxfmt --check 'packages/*/{test,bench,examples,scripts}/**/*.ts'` → **exit 1** và log có tên `web-wire.types.ts`. Xoá lại → exit 0. Glob khớp thật, không phải suy đoán.

### Bước 4 — Cổng 2 ĐỎ: chứng minh khẳng định có răng (đã chạy, exit 1)

```bash
sed -i '' '379s/.*/\t| { t: "bye-vanished"; reason: string }/' packages/wire/src/index.ts
bun run --cwd packages/coding-agent check:types
```

**Output thật, nguyên văn:**
```
test/collab/web-wire.types.ts(46,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.
```
```
EXIT=1
--- total error lines: 1
```

**Đúng một lỗi, nằm trong file conformance, không một lỗi dây chuyền nào.** Đó là kết quả đáng ghi: đỏ rõ ràng, chỉ trỏ về đúng chỗ cần sửa, không phun ra trăm chỗ gọi hệ quả. (Các `switch` phía guest giữ nhánh `default:` khoan dung nên đổi tên một `t` không lan.)

### Bước 5 — Hoàn tác và xanh trở lại (đã chạy, exit 0)

```bash
git checkout -- packages/wire/src/index.ts
bun run --cwd packages/coding-agent check:types
# EXIT=0, output rỗng
```
```bash
git diff --stat packages/wire/     # rỗng — wire sạch trước và sau
```

**Cả hai chiều đều là bằng chứng.** Dán cả hai mã exit vào PR description:
> `check:types` exit 0 ở baseline → exit 1 (đúng 1 lỗi TS2344 tại `web-wire.types.ts`) sau khi mutate discriminant → exit 0 sau `git checkout`.

### Bước 6 — Dọn dẹp tùy chọn

Dù sao cũng **để nguyên** `packages/wire/src/index.ts:7`. Thứ duy nhất được phép thêm vào file mới là bình luận đầu file giải thích rằng nó cố ý **không** được `bun test` thu thập — điều đó chặn người kỹ sư tiếp theo "sửa" nó thành `.test.ts` và xoá mất bảo đảm.

Cơ sở đã kiểm: `scripts/ci-test-ts.ts:234` lọc `!entry.name.endsWith(".test.ts")` → `continue`. File tên `web-wire.types.ts` không khớp, nên runner không bao giờ nạp nó.

### Bước 7 — Changelog: KHÔNG thêm mục

`packages/wire/CHANGELOG.md` có `## [Unreleased]` rỗng ở dòng 3. **Không thêm gì.** Đây là thay đổi nội bộ chỉ đụng test, không có bề mặt người dùng. Nếu reviewer đòi mục, mục trung thực là một dòng `### Fixed` về trích dẫn cũ — không phải về một tính năng.

---

## 5. Hợp đồng test

Đây là hợp đồng **lúc compile**, không phải lúc chạy. Không có gì để người dùng quan sát lúc thực thi — và đó chính là ý nghĩa.

**Tên file:** `packages/coding-agent/test/collab/web-wire.types.ts` (cố ý **không** phải `*.test.ts`).

**Hợp đồng được bảo vệ:** *"tập discriminant frame mà package wire khai báo là tập con của tập mà host collab thực sự tạo ra được."*

**Case duy nhất:** khẳng định `Assignable<WireT, CollabT>` phải là `true`.

**Người dùng thấy gì nếu hồi quy:**

| Hồi quy | Biểu hiện |
| --- | --- |
| Package wire thêm frame `t` mới mà host không phát | `check:ts` **đỏ**: `web-wire.types.ts(46,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.` Trước đây: frame đó lọt xuống production và bị guest nuốt im lặng qua `default:`. |
| Host đổi tên một `t` (vd `bye` → `bye-vanished`) mà wire không theo | Cùng lỗi TS2344, cùng một dòng. Đây là hệ quả gián tiếp giá trị nhất của item. |
| Ai đó đổi tên file thành `web-wire.types.test.ts` | `bun test` nạp file, không tìm thấy test nào, **bảo đảm biến mất trong im lặng**. Đây là lý do bình luận đầu file phải nằm ở đó. |

**Điều KHÔNG assert, và vì sao (đã kiểm bằng compiler):**

- **Payload assignability chiều nào cũng không assert.** Probe `Assignable<CollabFrame, WireFrame>` → **`false`**. Host thêm `entryCount`, `readOnly`, `isTerminal`, `yielded`… mà wire không có. (Lưu ý: W5 nói payload "hai chiều" là bất đối xứng — đúng ở chiều host→wire; nhưng ở chiều wire→host thì bất đối xứng nằm ở chỗ **khác**, xem S3.)
- **Chiều ngược discriminant (`CollabT ⊆ WireT`) hiện CŨNG đúng** — probe cho ra không lỗi. Không assert là một **quyết định thiết kế có chủ ý** (host được phép phát biến thể mà trình duyệt chưa học), không phải vì nó đang sai. Kỹ sư phải giữ nguyên lập luận này, đừng viết "nó sai".
- Wire có `t: "thinking_level_change"` chỉ trong `SessionEntry` (dòng 157), **không** phải arm `AgentEvent` — đừng đếm nhầm khi đọc `rg` thô.

---

## 6. Cổng

| # | Lệnh | ĐỎ được? | Bằng cách nào — đã chạy thật |
| --- | --- | --- | --- |
| 1 | `bun run check:tools` | ✅ **CÓ** | `oxlint .` exit 0; `oxfmt --check` trên glob có file này → exit 0. Chứng minh glob khớp bằng phản thí (thêm code xấu format → exit 1). |
| 2 | `bun run --cwd packages/coding-agent check:types` | ✅ **CÓ** | `tsgo -p tsconfig.json --noEmit`. Đỏ bằng mutate discriminant: `sed -i '' '379s/.*/\t\| { t: "bye-vanished"; reason: string }/'`. Xanh trở lại bằng `git checkout --`. **Đã chạy cả hai chiều: 0 → 1 → 0.** |
| 3 | `bun run check:ts` (gốc) | ✅ **CÓ** (cùng cơ chế với #2) | `check:ts` = `check:tools` + `--filter './packages/*' check:types`. Chạy #1 và #2 là đủ bằng chứng. |

**Tất cả ba cổng đều đỏ được, và điều đó đã được chứng minh bằng mã exit thật ở cả hai chiều.** Không có cổng nào ở đây là "luôn xanh".

Điểm cần nhấn: cổng #2 là **cổng đỏ duy nhất phát hiện được hồi quy thật**. Cổng #1 bảo vệ style/format, không bảo vệ conformance. Nếu ai đó xoá file `web-wire.types.ts`, cổng #1 vẫn xanh — chỉ #2 mới đỏ khi wire đổi. Vì vậy **đừng bao giờ chạy #1 một mình rồi kết luận "xanh"**.

---

## 7. Cạm bẫy riêng của work item này

**C1 — Bình luận nói dối thì file thành tài liệu độc hại vĩnh viễn.** Đây là cạm bẫy lớn nhất. 25 dòng JSDoc giải thích *tại sao không assert payload* — và câu "chín discriminant host không bao giờ phát" là **sai** (S3). Khối `code_shape` ghi sẵn để copy nguyên văn, nên kỹ sư sẽ dán thẳng vào repo một tuyên bố sai về kiến trúc mà không hề hay biết. Đã kiểm bằng compiler: `Exclude<WireEventDiscriminants, HostEventDiscriminants>` = `never`. Phải sửa chiều trước khi tạo file. Đừng tin `code_shape` chỉ vì nó dài dòng và trông chắc.

**C2 — Số dòng trong neo không tự bảo vệ nó.** Bốn neo sai: `package.json:94` (thật là 90), lỗi `(44,40)` (thật là `(46,40)`), "arm cuối" (379 là arm thứ hai từ cuối), và "node_modules vắng mặt" (thật là có 243 mục). Không neo nào trong số này làm hỏng lệnh bạn gõ — chúng chỉ làm hỏng **PR description**. Đó là loại sai âm thầm tệ nhất: code chạy, reviewer tin neo, reviewer bị dắt sai. Kỹ sư nên dán **output thật** của terminal, không gõ lại số từ tài liệu.

**C3 — Cổng đỏ "phải đỏ rồi xanh lại" là bắt buộc, không phải nghi thức.** Một file conformance chưa từng đỏ lần nào thì không chứng minh được gì — nó có thể vô dùng mà vẫn xanh. Đã chạy đủ vòng 0 → 1 → 0. Nhớ `git checkout -- packages/wire/src/index.ts`; nếu quên, bạn để lại một discriminant giả trong repo (và bước sau sẽ mutate nhầm cái giả đó). Lưu `cp` ra `/tmp` trước khi mutate là dự phòng rẻ.

**C4 — `export type` vs `type` trần: warning không làm đỏ cổng.** `eslint(no-unused-vars)` trả **warning**, `oxlint` vẫn exit 0. Nên "cổng xanh" không bảo chứng style. Đây là lý do dùng `export type` không chỉ vì sạch: nó là cách duy nhất để tuyên bố "đây là bảo đảm" thay vì để lại rác cho người sau.

**C5 — Đừng "sửa" file thành `.test.ts`.** Đây là bẫy đã được cài sẵn trong bình luận đầu file. Đặt tên `*.test.ts` ⇒ `bun test` nạp file, không thấy test nào, và **bảo đảm biến mất trong im lặng** — tệ hơn nhiều so với việc không có file, vì ai đó vẫn nghĩ có người canh. Cơ sở: `scripts/ci-test-ts.ts:234` lọc `endsWith(".test.ts")`.

**C6 — Cùng tên `AgentEvent`, hai nguồn khác nhau.** Wire có `AgentEvent` riêng; host dùng `AgentEvent` của **agent-core** rồi mở rộng thành `AgentSessionEvent` (`agent-session-events.ts:13`). Đọc `rg "AgentEvent"` rồi đoán chúng là một là sai — và đó chính xác là cái bẫn đã sinh ra S3. Khi đọc diff event, luôn kiểm tra import ở dòng 1 của file.

---

## Phụ lục — log thô

```
$ bun run check:tools
check:tools EXIT=0
Checking formatting...
All matched files use the correct format.
Finished in 280ms on 5445 files using 10 threads.

$ bun run --cwd packages/coding-agent check:types          # baseline
EXIT=0   (output rỗng)

$ sed -i '' '379s/.*/\t| { t: "bye-vanished"; reason: string }/' packages/wire/src/index.ts
$ bun run --cwd packages/coding-agent check:types          # mutate
test/collab/web-wire.types.ts(46,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.
EXIT=1   (đúng 1 dòng lỗi)

$ git checkout -- packages/wire/src/index.ts
$ bun run --cwd packages/coding-agent check:types          # hoàn tác
EXIT=0   (output rỗng)

$ git diff --stat packages/wire/
(rỗng)
```

**Lưu ý môi trường:** trong cây làm việc này có một thay đổi chưa commit ở `packages/coding-agent/src/tools/bash.ts` (thêm `policy: "deny"` vào return của critical-pattern, mtime 07:08) **không phải do công việc này tạo ra** và **không liên quan** tới W5. Đã để nguyên. Đừng gộp nó vào commit của W5.
