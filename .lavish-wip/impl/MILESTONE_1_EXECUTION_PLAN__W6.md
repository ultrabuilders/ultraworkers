# Phiếu triển khai — W6: Deny lệnh bash critical-pattern dưới chế độ yolo

> Nguồn: `MILESTONE_1_EXECUTION_PLAN.md:1222–1384`.
> Cây tham chiếu đã kiểm: HEAD `65cc6c181311b045a163680badee8d3a55c760cd` (branch `milestone-1`).
> **Không cây tham chiếu nào** (`pi-ref`, `deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref`, `senpi-ref`) chứa `CRITICAL_BASH_PATTERNS` hay chuỗi `Critical pattern detected` — đã `rg -l` cả 7 cây, 0 kết quả. Đây là cơ chế **gốc của omp**, không có tiền lệ để đối chiếu. Mọi neo dưới đây chỉ có thể kiểm trong `ultraworkers`.
>
> Trạng thái cây khi viết phiếu: `packages/coding-agent/src/tools/bash.ts` và
> `packages/coding-agent/test/tools/approval.test.ts` sạch (đã thử nghiệm rồi `git checkout --` hoàn nguyên).
> Baseline đo được: `bun test packages/coding-agent/test/tools/` → **2033 pass / 0 fail** (2296 test, 263 skip).

---

## 1. Cái gì thay đổi, quan sát được

Một lệnh bash khớp `CRITICAL_BASH_PATTERNS` hôm nay được `yolo` (chế độ mặc định của schema) tự phê duyệt và **thực thi thật**; sau thay đổi nó bị chặn cứng ở **mọi** chế độ với `Tool "bash" is blocked by tool policy.\nReason: Critical pattern detected`, kể cả khi `tools.approval.bash: "allow"` hay `bash.patterns` `allow` nói `allow` — deny của tool đứng trước, không có lối thoát ở tầng settings.

Đo được trên `BashTool` thật, **trước** thay đổi (`yolo`, userConfig `{ bash: "allow" }`):

```
pwd && cmp before after && rm -rf /  =>  {"policy":"allow","tier":"exec","override":false,"source":"user","policyKey":"bash"}
rm -rf /                            =>  {"policy":"allow","tier":"exec","override":false,"source":"user","policyKey":"bash"}
requiresApproval(...)               =>  (no throw)
ls -la  (yolo, {})                  =>  {"policy":"allow","tier":"exec","override":false,"source":"mode"}
```

Đo **sau** thay đổi, cùng script, cùng đối số:

```
pwd && cmp before after && rm -rf /  =>  {"policy":"deny","tier":"exec","override":true,"source":"tool","reason":"Critical pattern detected"}
rm -rf /                            =>  {"policy":"deny","tier":"exec","override":true,"source":"tool","reason":"Critical pattern detected"}
requiresApproval(...)               =>  Tool "bash" is blocked by tool policy.
ls -la  (yolo, {})                  =>  {"policy":"allow","tier":"exec","override":false,"source":"mode"}   <- không đổi
```

---

## 2. Bảng điểm sửa

TRƯỚC trích nguyên văn từ file thật (tab hiển thị thành `\t` khi cần).

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/tools/bash.ts:516` | `BashTool.approval` — nhánh critical top-level | `\t\t\treturn { tier: "exec", override: true, reason: "Critical pattern detected" };` | object literal 5 dòng: `return {` / `tier: "exec",` / `override: true,` / **`policy: "deny",`** / `reason: "Critical pattern detected",` / `};` |
| `packages/coding-agent/src/tools/bash.ts:545` | `BashTool.approval` — vòng lặp compound per-segment | `\t\t\t\t\treturn { tier: "exec", override: true, reason: "Critical pattern detected" };` | y hệt dòng trên, cùng thứ tự field |
| `packages/coding-agent/src/tools/bash.ts:516` (tham chiếu thứ tự field) | nhánh deny do người dùng cấu hình | `bash.ts:507–512` — `return {` / `tier: "exec",` / `override: true,` / `policy: "deny",` / `reason: \`Blocked by bash pattern: ${patternRule.match}\`,` / `};` | **giữ nguyên**, chỉ dùng làm khuôn cho thứ tự field `tier, override, policy, reason` |
| `packages/coding-agent/test/tools/approval.test.ts:371` | `it("classifies critical bash patterns through BashTool.approval")` | `expect(bashApproval(command)).toEqual({ tier: "exec", override: true, reason: "Critical pattern detected" });` | `expect(bashApproval(command)).toEqual({ tier: "exec", override: true, policy: "deny", reason: "Critical pattern detected" });` |
| `packages/coding-agent/test/tools/approval.test.ts:426` | `it("keeps critical bash patterns prompt-gated unless explicitly denied")` | `it("keeps critical bash patterns prompt-gated unless explicitly denied", () => {` | `it("denies critical bash patterns even when a configured pattern allows", () => {` |
| `packages/coding-agent/test/tools/approval.test.ts:431–435` | assertion đầu của test trên | `expect(bashApproval("rm -rf /", settingsOverrides)).toEqual({` / `tier: "exec",` / `override: true,` / `reason: "Critical pattern detected",` / `});` | thêm `policy: "deny",` giữa `override: true,` và `reason:` |
| `packages/coding-agent/test/tools/approval.test.ts:817` *(plan ghi 818)* | `it("does not let an unmatched segment conceal a critical later segment")` | `expect(resolveApproval(bash, args, "write", { bash: "allow" })).toMatchObject({` @816 → `policy: "prompt",` @817 | `policy: "deny",` @817 |
| `packages/coding-agent/test/tools/approval.test.ts:834` | `it("retains critical checks after removing literal shell quotes and escapes with an unmatched segment")` | `expect(resolveApproval(bash, { command }, "write", { bash: "allow" })).toMatchObject({` @833 → `policy: "prompt",` @834 | `policy: "deny",` @834 |
| **`packages/coding-agent/test/tools/approval-mode.test.ts:157`** | `it("critical bash patterns do not prompt in yolo mode with bash allowed")` | `expect(textOf(result)).toContain("(no output)");` — lệnh `rm -f /tmp/bun-fake-timer-probe.test.ts` **thực thi thật** | đảo thành `await expect(...).rejects.toThrow('Tool "bash" is blocked by tool policy.\nReason: Critical pattern detected')`, đổi tên test |
| **`packages/coding-agent/test/tools/approval-mode.test.ts:195`** | `it("CLI --auto-approve also bypasses safety-override patterns")` | `expect(textOf(result)).toContain("(no output)");` @207 | đảo thành `rejects.toThrow(...)`; cân nhắc đổi tên vì "bypasses" không còn đúng |
| **`packages/coding-agent/test/tools/approval-mode.test.ts:245`** | `it("ACP-approved arguments satisfy explicit user and tool-override prompts")` | nửa sau (dòng 262–273) chạy `rm -f /tmp/bun-fake-timer-probe.test.ts` với `acpApprovedArgs` và expect `"(no output)"` | nửa sau đảo thành `rejects.toThrow(...)`; **nửa trước (250–260, `echo acp-explicit`) giữ nguyên** |
| `docs/approval-mode.md:64` | — | câu cuối của đoạn: ``In `yolo`, a bare critical override is ignored, but an explicit tool/user `prompt` or `deny` policy is still enforced.`` | xoá câu đó, thay bằng: critical bị từ chối dứt khoát ở mọi chế độ kể cả `yolo`; `bash.patterns` `allow` không override được |
| `docs/approval-mode.md:58–61` | — | ``A tool can force a prompt with object-form approval:`` … `approval: { tier: "exec", override: true, reason: "Critical pattern detected" }` | **plan không nhắc** — cùng hình dạng cũ, sẽ dạy tác giả extension một thứ dưới `yolo` mặc định bị bỏ qua. Sửa cùng lúc với 124 |
| `docs/approval-mode.md:125` *(plan ghi 124)* | ví dụ `isCritical(args.command)` | `? { tier: "exec", override: true, reason: "Critical pattern detected" }` | `? { tier: "exec", override: true, policy: "deny", reason: "Critical pattern detected" }` |
| `packages/coding-agent/CHANGELOG.md:3` | `## [Unreleased]` | sau dòng 3 chỉ có `### Security` @5, **không có `### Changed`** | thêm mục con `### Changed` với một bullet hướng người-dùng |

**Không đụng tới:** `bash.ts:515` (`if (!compoundSegments && criticalCommand) {`), `approval.test.ts:82` (`const dangerous = tool("bash", {...})`), và hai assertion anh em ở `approval.test.ts:436` (`echo hello` → `{tier:"write",policy:"allow"}`) + `:440` (`echo hello && rm file.txt` → `"exec"`). Đã đo: cả hai vẫn xanh sau thay đổi.

---

## 3. Các bước (mỗi bước gắn neo đã mở và đọc)

**Bước 0 — CỔNG QUY TRÌNH, chạy trước mọi dòng code.**
Cần product owner xác nhận bằng văn bản cả hai điểm: (a) lệnh bash critical bị hard-deny trong `yolo`; (b) `bash.patterns` `allow` không còn override được kết quả khớp critical. Bị từ chối hoặc trì hoãn → đóng W6 là `deferred`, ship Wave 2 không có nó. W4/W12/W13 không được chờ.
*Neo: không có file — cổng quy trình.*

**Bước 1 — `bash.ts`, nhánh critical top-level.** Thêm `policy: "deny",` vào object trả về ở dòng 516, đặt giữa `override: true,` và `reason:`, khớp thứ tự field của nhánh deny cấu hình ngay trên.
*Neo đã kiểm: `packages/coding-agent/src/tools/bash.ts:516` → `return { tier: "exec", override: true, reason: "Critical pattern detected" };` — đúng như tài liệu nói.*
*Khuôn thứ tự field: `bash.ts:508–511` → `tier: "exec",` / `override: true,` / `policy: "deny",` / `reason: ...` (nguyên văn dòng 511: ``reason: `Blocked by bash pattern: ${patternRule.match}`,``).*

**Bước 2 — `bash.ts`, vòng lặp compound per-segment.** Sửa y hệt ở dòng 545.
*Neo đã kiểm: `packages/coding-agent/src/tools/bash.ts:545` → `return { tier: "exec", override: true, reason: "Critical pattern detected" };` — đúng như tài liệu nói.*
*Lý do không được bỏ sót: `bash.ts:515` → `if (!compoundSegments && criticalCommand) {`. Đã đọc; điều kiện `!compoundSegments` khiến nhánh top-level không bao giờ chạm tới lệnh compound.*

**Bước 3 — `approval.test.ts:371`, corpus top-level.** Đổi `toEqual` thêm `policy: "deny"`. **Không sửa danh sách lệnh ngay trên.**
*Neo đã kiểm: `packages/coding-agent/test/tools/approval.test.ts:371` → `expect(bashApproval(command)).toEqual({ tier: "exec", override: true, reason: "Critical pattern detected" });` — đúng như tài liệu nói. Danh sách lệnh nằm ở 353–370, thực tế là 16 lệnh ở 354–369.*

**Bước 4 — `approval.test.ts:426` + `431–435`, test allow-rule.** Đổi tên `it()` (tên cũ thành sai sự thật) và thêm `policy: "deny"` vào object kỳ vọng. Giữ nguyên hai assertion ở 436 và 440.
*Neo đã kiểm: dòng 426 → `it("keeps critical bash patterns prompt-gated unless explicitly denied", () => {`; dòng 431–435 → `expect(bashApproval("rm -rf /", settingsOverrides)).toEqual({` / `tier: "exec",` / `override: true,` / `reason: "Critical pattern detected",` / `});` — cả hai đúng như tài liệu nói.*
*Đã đo: sau thay đổi chỉ assertion 431 đỏ; 436 và 440 vẫn xanh.*

**Bước 5 — `approval.test.ts:817`, test compound + unmatched segment.** Đổi `policy: "prompt"` → `policy: "deny"`.
*Neo đã kiểm: `policy: "prompt",` nằm ở dòng **817** (không phải 818 như plan ghi); lệnh gọi `toMatchObject({` mở ở dòng 816, đóng ở 821. Plan ghi "818–822" — lệch 2 dòng.*

**Bước 6 — `approval.test.ts:834`, test quote/escape stripping.** Đổi `policy: "prompt"` → `policy: "deny"`.
*Neo đã kiểm: `policy: "prompt",` nằm đúng ở dòng **834** (lệnh gọi mở ở 833, đóng 837) — plan ghi "834–838", hợp lệ.*

**Bước 7 — `approval-mode.test.ts:157`, test yolo end-to-end.** Đây là test quan trọng nhất trong toàn bộ item và **plan không nhắc tới file này**. Đảo `expect(textOf(result)).toContain("(no output)")` thành `rejects.toThrow('Tool "bash" is blocked by tool policy.\nReason: Critical pattern detected')` và đổi tên `it()`.
*Neo đã kiểm: `packages/coding-agent/test/tools/approval-mode.test.ts:157` → `it("critical bash patterns do not prompt in yolo mode with bash allowed", async () => {`; dòng 171 → `expect(textOf(result)).toContain("(no output)");` với lệnh ở dòng 164: `{ command: "rm -f /tmp/bun-fake-timer-probe.test.ts" }`.*

**Bước 8 — `approval-mode.test.ts:195`, test `--auto-approve`.** Đảo tương tự.
*Neo đã kiểm: dòng 195 → `it("CLI --auto-approve also bypasses safety-override patterns", async () => {`; dòng 207 → `expect(textOf(result)).toContain("(no output)");` với cùng lệnh ở dòng 199.*

**Bước 9 — `approval-mode.test.ts:245`, test ACP.** Chỉ đảo **nửa sau** (dòng 262–273). Nửa trước (250–260) không liên quan.
*Neo đã kiểm: dòng 245 → `it("ACP-approved arguments satisfy explicit user and tool-override prompts", async () => {`; dòng 273 → `expect(textOf(overrideResult)).toContain("(no output)");` với lệnh ở 265/270. Đã đo lỗi thật khi chạy: `error: Tool "bash" is blocked by tool policy.\nReason: Critical pattern detected at execute (src/extensibility/extensions/wrapper.ts:235:10)`.*

**Bước 10 — test mới (hợp đồng trung tâm), trong `describe("tool-owned dynamic approval declarations")`.** Chèn sau test `it()` ở dòng 375 (test kết thúc ở 389). Chạy `BashTool` thật qua `createBashTool()` (định nghĩa ở dòng 28 của test file):

```ts
it("denies critical bash patterns in yolo mode through both approval paths", () => {
    const bash = createBashTool({ "bash.allowCompoundCommands": true });
    const args = { command: "pwd && cmp before after && rm -rf /" };
    // compound per-segment path (bash.ts:545)
    expect(resolveApproval(bash, args, "yolo", { bash: "allow" })).toMatchObject({
        policy: "deny", source: "tool", override: true,
    });
    // top-level path (bash.ts:516)
    expect(resolveApproval(bash, { command: "rm -rf /" }, "yolo", { bash: "allow" })).toMatchObject({
        policy: "deny", source: "tool", override: true,
    });
    expect(() => requiresApproval(bash, args, "yolo", { bash: "allow" })).toThrow(
        'Tool "bash" is blocked by tool policy',
    );
    // negative guard
    expect(resolveApproval(createBashTool(), { command: "ls -la" }, "yolo", {})).toMatchObject({
        policy: "allow",
    });
});
```

*Neo đã kiểm: `approval.test.ts:351` là `describe("tool-owned dynamic approval declarations", () => {`; dòng 375 là `it("does not flag benign bash commands", () => {` và đóng ở 389. Lưu ý: plan ghi neo là `352` nhưng 352 thực ra là `it("classifies critical bash patterns through BashTool.approval", ...)` — dòng `describe` là 351.*
*Đã chạy thử đúng script này trên mã đã sửa: khớp `{policy:"deny", source:"tool", override:true}` cho cả hai lệnh, `requiresApproval` throw, `ls -la` vẫn `allow`. Hình dẫn trong plan là đúng.*

**Bước 11 — `docs/approval-mode.md:64`.** Xoá câu cuối đoạn 64 và thay bằng luật mới.
*Neo đã kiểm: dòng 64 kết thúc bằng đúng câu ``In `yolo`, a bare critical override is ignored, but an explicit tool/user `prompt` or `deny` policy is still enforced.`` — đúng như plan trích.*

**Bước 12 — `docs/approval-mode.md:61` và `:125`.** Sửa **cả hai** ví dụ mang hình dạng cũ (plan chỉ nhắc 124/125).
*Neo đã kiểm: dòng 61 → `approval: { tier: "exec", override: true, reason: "Critical pattern detected" }` dưới mở đầu dòng 58 `A tool can force a prompt with object-form approval:`. Dòng 124 → `  isCritical(args.command)`, literal cần sửa ở **dòng 125** → `    ? { tier: "exec", override: true, reason: "Critical pattern detected" }` (plan ghi neo 124 nhưng chỉ là dòng nhánh; dòng cần gõ là 125).*

**Bước 13 — `packages/coding-agent/CHANGELOG.md:3`.** Thêm mục con `### Changed` (hiện chưa có) với một bullet hướng người-dùng.
*Neo đã kiểm: dòng 3 → `## [Unreleased]`; dòng 5 → `### Security`. Đúng như plan nói.*

---

## 4. Hợp đồng test

**Hợp đồng được bảo vệ:** một lệnh khớp `CRITICAL_BASH_PATTERNS` không bao giờ được `yolo` tự phê duyệt — nó resolve `policy: "deny"` với `source: "tool"`, và `requiresApproval` throw, ở mọi chế độ, qua **cả** nhánh top-level (`bash.ts:516`) **lẫn** nhánh compound per-segment (`bash.ts:545`).

**Hai file test liên quan, 7 test cần sửa lại, 1 test mới cần thêm:**

| file | test | hành động |
| --- | --- | --- |
| `approval.test.ts:352` | `classifies critical bash patterns through BashTool.approval` | sửa assertion |
| `approval.test.ts:426` | `keeps critical bash patterns prompt-gated unless explicitly denied` | đổi tên + sửa assertion |
| `approval.test.ts:806` | `does not let an unmatched segment conceal a critical later segment` | sửa assertion |
| `approval.test.ts:824` | `retains critical checks after removing literal shell quotes and escapes with an unmatched segment` | sửa assertion |
| `approval-mode.test.ts:157` | `critical bash patterns do not prompt in yolo mode with bash allowed` | đảo thành `rejects.toThrow` + đổi tên |
| `approval-mode.test.ts:195` | `CLI --auto-approve also bypasses safety-override patterns` | đảo thành `rejects.toThrow` |
| `approval-mode.test.ts:245` | `ACP-approved arguments satisfy explicit user and tool-override prompts` | đảo **nửa sau** thành `rejects.toThrow` |
| `approval.test.ts` (mới, sau 375) | `denies critical bash patterns in yolo mode through both approval paths` | thêm mới |

**Chốt chặn âm (phải giữ xanh, đã đo cả hai lần):**
- `approval.test.ts:375` `does not flag benign bash commands` — 9 lệnh vô hại vẫn `"exec"`.
- `approval.test.ts:436` `echo hello` → `{tier:"write", policy:"allow"}` dưới rule `*`/allow.
- `approval.test.ts:440` `echo hello && rm file.txt` → `"exec"`.
- `approval-mode.test.ts` các test allow/prompt bình thường (ví dụ `:186` `--auto-approve` với `echo override`).
- `ls -la` dưới `yolo` → `policy: "allow"` (đo trước và sau: **không đổi**).

**Người dùng thấy gì nếu hồi quy:**
- Nếu `bash.ts:516` bị revert: `rm -rf /` chạy không cần hỏi dưới `yolo`. Người dùng không thấy prompt, không thấy dòng log, transcript trống — mất dữ liệu im lặng.
- Nếu `bash.ts:545` bị revert: `pwd && cmp before after && rm -rf /` chạy không cần hỏi dưới `yolo`. Cùng triệu chứng, nhưng **chỉ với lệnh nối bằng `&&`** — người dùng chỉ thấy nó nếu workflow của họ có lệnh ghép.
- Nếu deny rò sang lệnh thường: `ls -la` dừng chạy trong `yolo`, automation vỡ rõ ràng, có log.

---

## 5. Cổng

### 5.1 Lệnh

```bash
bun test packages/coding-agent/test/tools/approval.test.ts packages/coding-agent/test/tools/approval-mode.test.ts
./node_modules/.bin/oxlint packages/coding-agent/src/tools/bash.ts packages/coding-agent/test/tools/approval.test.ts packages/coding-agent/test/tools/approval-mode.test.ts
./node_modules/.bin/oxfmt --check packages/coding-agent/src/tools/bash.ts
```

### 5.2 Cổng của plan **ĐÃ LỖI THỜI — phải sửa**

Plan viết ở mục *Xác minh* và *Cổng hoàn thành*:

> `node_modules/` rỗng, nên `bun test` hiện fail với `Cannot find module '@oh-my-pi/pi-tui/tools/bash'` (0 pass, 1 fail) và `bun run check:ts` fail với `oxlint: command not found` (exit 127). Phải chạy `bun install` trước.

**Đo lại hôm nay: sai hoàn toàn.** `ls node_modules | wc -l` → **243**. `node_modules/.bin/oxlint` tồn tại. Baseline chạy thật:

```
bun test packages/coding-agent/test/tools/approval.test.ts
 70 pass  0 fail  256 expect() calls

bun test packages/coding-agent/test/tools/approval-mode.test.ts
 16 pass  0 fail   18 expect() calls

bun test packages/coding-agent/test/tools/          (toàn thư mục)
 2033 pass  0 fail  2296 tests, 263 skip
```

`oxfmt --check packages/coding-agent/src/tools/bash.ts` → `All matched files use the correct format.`
**Không cần `bun install`. Đừng để ai chạy `bun install` theo plan — nó sẽ tốn thời gian và có thể làm lệch lockfile so với trạng thái đã được CI chấp nhận.**

### 5.3 Cổng plan đưa ra có đỎ ĐƯỢC không? — **CÓ, và tôi đã đo thật**

Cổng của plan là `bun test packages/coding-agent/test/tools/approval.test.ts` exit 0 / 0 fail. Ba phép thử:

| tình huống | kết quả đo |
| --- | --- |
| baseline (chưa sửa gì) | 70 pass / **0 fail** |
| sửa **cả hai** site `bash.ts`, chưa sửa test | 70 test → **4 fail** (đúng 4 test đã liệt kê ở bước 3–6) |
| sửa **chỉ** site `bash.ts:516`, đã sửa test bước 3–6, **chưa** thêm test mới | **4 fail** — gồm cả hai test compound ở 806 và 824 |

Kết luận: cổng **đi xuống đỏ thật**, theo cả ba hướng. Nhưng nó **chưa đủ rộng** — xem 5.4.

### 5.4 Sửa cổng thành bản có thật

Cổng của plan **bỏ sót file thứ hai**. Đo: `bun test packages/coding-agent/test/tools/` với cả hai site đã sửa → **7 test đỏ**, trong đó 3 test nằm ở `approval-mode.test.ts` mà plan không hề nhắc tới. Lệnh cổng của plan chỉ chạy `approval.test.ts` nên **3 test đó sẽ bị bỏ ngang và repo sẽ ship với test đỏ**.

Cổng viết lại, dùng đúng bản này:

```bash
# 1) hợp đồng — cả hai nhánh, cả hai chế độ
bun test packages/coding-agent/test/tools/approval.test.ts \
           packages/coding-agent/test/tools/approval-mode.test.ts
# yêu cầu: 0 fail

# 2) không vỡ hàng xóm — bắt buộc, vì đổi bash.ts là đổi hành vi tool dùng chung
bun test packages/coding-agent/test/tools/
# yêu cầu: 0 fail (baseline đo được: 2033 pass / 0 fail)

# 3) lint + format
./node_modules/.bin/oxlint packages/coding-agent/src/tools/bash.ts \
  packages/coding-agent/test/tools/approval.test.ts \
  packages/coding-agent/test/tools/approval-mode.test.ts
./node_modules/.bin/oxfmt --check packages/coding-agent/src/tools/bash.ts
```

**Cổng này có đỏ được không?** Có, theo cả ba tầng:
1. Revert `bash.ts:516` → tầng 1 đỏ (đã đo: 4 fail).
2. Revert `bash.ts:545` → tầng 1 đỏ (đã đo: test 806 + 824 đỏ).
3. Bỏ sót `approval-mode.test.ts` → tầng 2 đỏ (đã đo: 3 fail).
4. Để lọt "deny mọi thứ cho an toàn" → tầng 1 đỏ vì `echo hello` / `echo hello && rm file.txt` / `ls -la` không còn khớp.

**Chốt chặn chống cổng xanh nhầm — đã kiểm, đủ mạnh:** các assertion âm ở `approval.test.ts:436`, `:440`, `:375` và `ls -la` → `allow` không thể đỏ được nếu deny rò. Nếu ai đó sửa quá tay biến mọi thứ thành `deny`, tầng 1 đỏ ngay. Cổng này **không** tạo cảm giác an toàn giả.

### 5.5 Cổng quy trình (không phải cổng kỹ thuật)

Bước 0 (sign-off của product owner) **không thể đỏ được bằng lệnh**. Nếu bị từ chối hoặc trì hoãn: đóng W6 là `deferred`, ship Wave 2 không có nó. W4/W12/W13 không được chờ. Đây là điểm rủi ro cao nhất của item — triển khai mà không có sign-off đã ghi lại thì chính là hỏng, vì nó đổi hành vi mặc định của **mọi** người dùng `yolo` và xoá luôn lối thoát qua `bash.patterns` `allow`.

---

## 6. Cạm bẫy riêng của work item này

**6.1 — Sửa một nửa cặp điểm.** Điều kiện `!compoundSegments` ở `bash.ts:515` khiến nhánh top-level không bao giờ chạm lệnh compound; `bash.ts:545` mới là nhánh một payload thật đi tới.

> **Sửa lại một claim của plan.** Plan viết: *"Sửa riêng dòng 516 sẽ tạo ra một suite **hoàn toàn xanh** (corpus top-level ở dòng 350–370 rất lớn, khoảng 15 lệnh)"*. **Đo thật: không.** Sửa riêng `516` cho **2 test đỏ** (`classifies critical bash patterns…` và `keeps critical bash patterns prompt-gated…`), không phải xanh.
>
> Và claim *"test ở bước 8 bắt buộc phải dùng lệnh compound"* là chỉ đúng một nửa: test mới ở bước 8 **không phải** thứ duy nhất bắt được nửa-fix. Đã thử: sửa `516` + áp dụng bước 3–6 (đổi 817 và 834 sang `deny`) mà **không** thêm test mới → hai test compound `806` và `824` **vẫn đỏ**. Tức là bản thân bước 5 và 6 của plan đã là chốt chặn.
>
> Test mới ở bước 8 vẫn cần — nhưng vì lý do khác: nó là thứ duy nhất chứng minh **chế độ `yolo` không bao giờ được hỏi tới**, và là thứ duy nhất phủ `requiresApproval` throw. Hai test 806/824 chạy ở chế độ `write`, chỉ phủ short-circuit của `resolveApproval`.

**6.2 — Ba test trong `approval-mode.test.ts` mà plan bỏ sót, và chúng chạy lệnh phá hủy thật.** `approval-mode.test.ts:157`, `:195`, `:245` đều **thực thi** `rm -f /tmp/bun-fake-timer-probe.test.ts` trên filesystem thật và expect `"(no output)"`. Tên test ở `:157` — *"critical bash patterns do not prompt in yolo mode with bash allowed"* — chính là hợp đồng cũ được **đặt tên**. Đổi hành vi mà không sửa chúng là để lại một test đang khẳng định điều ngược lại. Đây là cửa thoát dễ chọn nhất: kỹ sư chạy đúng lệnh cổng của plan, thấy xanh, ship.

**6.3 — `rm -f /tmp/...` cũng là critical, không chỉ `rm -rf /`.** Regex `/\brm\s+(?:-\S+\s+)*(?:-[a-z]*[rRfF][a-z]*|--recursive|--force)\s+(?:-\S+\s+)*\//i` (`bash.ts:194`) chỉ neo mục tiêu vào **tiền tố** `/`, không đòi mục tiêu là đúng `/`. Đo: `rm -rf /tmp/build` → `true`, `rm -f /tmp/bun-fake-timer-probe.test.ts` → `true`, còn `rm -v /tmp/scratch` → `false` và `rm -rf -- ./build` → `false`. **Đây xác nhận claim của plan ở mục *Cần người quyết*** (workflow dựa vào `rm -rf /tmp/...` sẽ mất auto-allow) và cũng là lý do ba test ở 6.2 vỡ.

**6.4 — Fixture tổng hợp ở `approval.test.ts:82` phải để nguyên.** Nội dung nguyên văn: `const dangerous = tool("bash", { tier: "exec", override: true, reason: "Critical pattern detected" });`. Nó không bao giờ gọi `BashTool` nên vẫn xanh, và nó vẫn bảo vệ một hình dạng **thật sự tới được** (bất kỳ tool nào trả `override: true` mà không kèm `policy`). Nếu kỹ sư thêm `policy: "deny"` vào nó cho "khớp với tên mới", test liền kề ở `:90` (`user policy still controls execution in yolo mode`) sẽ đỏ, vì `allow` và `prompt` ở đó đều giả định tool không có policy. Plan đã đánh dấu đúng chỗ này — giữ nguyên nguyên văn.

**6.5 — Hai ví dụ trong `docs/approval-mode.md` mang cùng hình dạng cũ, plan chỉ sửa một.** `:61` (`approval: { tier: "exec", override: true, reason: "Critical pattern detected" }` dưới mở đầu *"A tool can force a prompt with object-form approval"*) và `:125`. Sửa `:125` mà bỏ `:61` thì tài liệu vẫn dạy tác giả extension một hình dạng bị `yolo` bỏ qua — đúng cái lý do plan nêu để sửa 124.

**6.6 — `settings.ts:294` nằm trong `src/tools/`, không phải `src/`.** Đường dẫn thật: `packages/coding-agent/src/tools/settings.ts:294` → `default: "yolo",`. Không có file `packages/coding-agent/src/settings.ts`.

**6.7 — Không có cây tham chiếu nào để đối chiếu.** Đã `rg -l` cả 7 cây tham chiếu: 0 kết quả cho `CRITICAL_BASH_PATTERNS` và `Critical pattern detected`. Đừng mất thời gian tìm precedent; đây là cơ chế gốc của omp.

---

## 7. Danh sách neo đã kiểm

**Xác nhận đúng (18):**

| neo | dòng thật | nội dung thật |
| --- | --- | --- |
| `bash.ts:516` | 516 | `return { tier: "exec", override: true, reason: "Critical pattern detected" };` |
| `bash.ts:545` | 545 | `return { tier: "exec", override: true, reason: "Critical pattern detected" };` |
| `bash.ts:515` | 515 | `if (!compoundSegments && criticalCommand) {` |
| `bash.ts:506–512` (`policy` @510) | 506–512 | `if (patternRule?.approval === "deny") {` … `policy: "deny",` @510 |
| `bash.ts:507–511` (thứ tự field) | 508–511 | `tier` / `override` / `policy` / `reason` |
| `approval.test.ts:82` | 82 | `const dangerous = tool("bash", { tier: "exec", override: true, reason: "Critical pattern detected" });` |
| `approval.test.ts:84` | 84 | `it("ignores override-based prompts in yolo mode", () => {` |
| `approval.test.ts:90` | 90 | `it("user policy still controls execution in yolo mode", () => {` |
| `approval.test.ts:371` | 371 | `expect(bashApproval(command)).toEqual({ tier: "exec", override: true, reason: "Critical pattern detected" });` |
| `approval.test.ts:375` | 375 | `it("does not flag benign bash commands", () => {` |
| `approval.test.ts:426` | 426 | `it("keeps critical bash patterns prompt-gated unless explicitly denied", () => {` |
| `approval.test.ts:431–435` | 431–435 | `expect(bashApproval("rm -rf /", settingsOverrides)).toEqual({ tier: "exec", override: true, reason: "Critical pattern detected" });` |
| `approval.test.ts:834–838` | 834 | `policy: "prompt",` (lệnh gọi mở 833, đóng 837) |
| `docs/approval-mode.md:64` | 64 | đoạn kết bằng ``In `yolo`, a bare critical override is ignored, but an explicit tool/user `prompt` or `deny` policy is still enforced.`` |
| `docs/approval-mode.md:162` | 162 | ``...`prompt` cannot be satisfied in a headless subagent and rejects the call.`` |
| `CHANGELOG.md:3` | 3 | `## [Unreleased]` (chỉ có `### Security` @5) |
| `tools/settings.ts:294` | 294 | `default: "yolo",` |
| `approval.ts` deny short-circuit | 235 | `if (decision.policy === "deny") {` → `source: "tool"` |

**Sai / lệch (7) — xem mục 8.**

---

## 8. Neo sai hoặc lệch

| neo trong plan | plan nói | thực tế | ảnh hưởng |
| --- | --- | --- | --- |
| `bash.ts` compound twin `526–530`, `policy` @`528` | object ở 526–530, `policy: "deny"` ở 528 | object ở **524–530**; `policy: "deny"` ở **527** (526 là `override: true,`) | lệch 1 dòng trong bảng "Đính chính" của chính plan; không ảnh hưởng code cần sửa |
| `bash.ts:542–546` (code-shape "Site 2") | vòng lặp ở 542–546 | vòng lặp `for` ở **542–547**; snippet của plan thiếu dấu `}` đóng `for` ở 547 | snippet trong plan không biên dịch nguyên vẹn nếu gõ nguyên si |
| `approval.test.ts:352` (bước 8, gọi là "describe block") | 352 là `describe("tool-owned dynamic approval declarations")` | **351** là `describe(...)`; **352** là `it("classifies critical bash patterns through BashTool.approval")` | chèn nhầm chỗ; parent ngoài cùng là 351 |
| `approval.test.ts:818–822` (bước 6) | `toMatchObject` ở 818–822, `policy: "prompt"` ở 818 | `toMatchObject({` mở ở **816**, `policy: "prompt",` ở **817**, đóng 821 | lệch 2 dòng; gõ theo plan sẽ sửa nhầm `source: "tool",` |
| `approval.ts:~252` (code-shape) | short-circuit yolo ở ~252 | `if (mode === "yolo") {` ở **255**, `if (decision.policy) {` ở **256** | "~" nên chấp nhận được; con trỏ thật là 255 |
| `approval.test.ts:350–370`, "khoảng 15 lệnh" | corpus top-level ở 350–370, ~15 lệnh | vòng lặp mở ở **353**, danh sách ở **354–369** = **16 lệnh** | mô tả, không ảnh hưởng sửa |
| `docs/approval-mode.md:124` (bước 11) | neo 124, đổi nhánh `isCritical(args.command)` | 124 **đúng** là dòng `isCritical(args.command)`; literal cần gõ nằm ở **125** | chấp nhận được — plan mô tả đúng nội dung; chỉ ghi rõ dòng để gõ |

**Bỏ sót, không phải neo sai (1 mục, nghiêm trọng hơn hẳn):** `packages/coding-agent/test/tools/approval-mode.test.ts` — 3 test (`:157`, `:195`, `:245`) đỏ sau thay đổi, plan không hề nhắc file này, và lệnh cổng của plan không chạy file này.
