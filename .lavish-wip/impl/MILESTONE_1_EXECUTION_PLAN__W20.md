# PHIẾU TRIỂN KHAI — W20 · GAP-M1-20

> **Khoá cache `allow_always` theo hành động canonicalize, không theo tên tool**
> Nguồn: `MILESTONE_1_EXECUTION_PLAN.md:3969-4088` (`## W20.`)
> Cây tham chiếu: `/Users/tranquangdang21/Projects/ultraworkers` (omp). Đã quét cả `pi-ref`, `deepseek-harness`, `codex-ref`, `opencode-ref`, `gajae-ref`, `claude-code-ref`, `senpi-ref` — **không cây nào có `acp-permission-gate.ts`**; đây là mã chỉ có ở omp. Không có mã `pi` nào tham chiếu được ở item này.

---

## 0. KẾT QUẢ KIỂM LẠI TỪNG NEO

Mọi dòng dưới đây tôi đã mở và đọc bằng `sed -n` / `awk` / `rg -n`.

| Neo trong work item | Dòng thật | Nội dung thật | Verdict |
| --- | --- | --- | --- |
| `acp-permission-gate.ts:55` (`bash`) | 55 | `return { toolName, title: command \|\| toolName, cacheKey: toolName };` | **OK** |
| `acp-permission-gate.ts:63` (`delete`) | 63 | `cacheKey: toolName,` | **OK** |
| `acp-permission-gate.ts:70` (`move`) | 70 | `if (from && to) return { toolName, title: \`Move ${from} to ${to}\`, paths: [from, to], cacheKey: toolName };` | **OK** |
| `acp-permission-gate.ts:75` (`move`) | 75 | `cacheKey: toolName,` | **OK** |
| `getPermissionIntent` tính title từ lệnh, `.slice(0, 80)` | 54 | `const command = stringProperty(input, "command")?.slice(0, 80);` | **OK** |
| `session-tools.ts:991` = `#acpPermissionDecisions.set("bash", "allow_always")` | 991 | `this.#acpPermissionDecisions.set(permissionIntent.cacheKey, "allow_always");` | **HỎNG — trích sai văn bản.** Không có literal `"bash"` ở dòng này. `rg 'set\("bash"' session-tools.ts` → **0 hit**. `"bash"` đến từ `cacheKey: toolName` ở gate:55. |
| "**cả bốn** nhánh … bốn chỗ" | 55/63/70/75 | 4 **chỗ**, nhưng chỉ **3 nhánh** (`bash`, `delete`, `move`×2). Nhánh `edit` (gate:86, :95) **đã** trả `cacheKey: "edit:delete"` / `"edit:move"` | **KHÔNG CHÍNH XÁC** — nhỏ, nhưng plan bước 1 liệt kê `edit` như việc còn phải làm |
| `bash-interceptor.ts` — "dùng lại parser sẵn có" | 119 | `export function checkBashInterception(...)`: trả `InterceptionResult { block, message?, suggestedTool? }` | **HỎNG — trỏ sai file.** `bash-interceptor.ts` chỉ export **một** symbol, và nó là *quyết định chặn*, **không phải mảng lệnh đã parse** |
| `docs/approval-mode.md` không đề cập khoá cache | — | `rg -c 'cache' docs/approval-mode.md` → **exit 1, 0 hit** | **OK — CONFIRMED** |
| `test/session/permission-cache-key.test.ts` chưa tồn tại | — | `ls` → `No such file or directory` | **OK** (plan đã ghi "không") |
| `test/tools/approval.test.ts` — "**1.471 dòng**" | — | `wc -l` = **959**. Cũng 959 ở `HEAD~1`, `HEAD~2`, `HEAD~3` (kể từ commit đầu `ecd516f`) | **SAI SỐ** — không tồn tại file approval 1471 dòng nào trong `packages/coding-agent/test/` |
| *(không được nhắc)* `test/agent-session-acp-permission.test.ts` | 832 | `it("allow_always: caches decision and calls bridge only once for subsequent executes")` — chạy `{command:"echo a"}` rồi `{command:"echo b"}`, assert `permissionSpy` gọi **đúng 1 lần** | **THIẾU HẲN TRONG PLAN — và đây là hậu quả nặng nhất, xem §6** |

### 0.1. Chỗ nên dùng thay `bash-interceptor.ts`

`bash-interceptor.ts:8` import từ `packages/coding-agent/src/tools/shell-tokenize.ts`. Đó mới là parser. Export thật:

| symbol | dòng |
| --- | --- |
| `tokenizeShellSegments(command): string[][]` | `shell-tokenize.ts:14` |
| `extractLiteralAndChainSegments(command): LiteralShellCommandSegment[] \| null` | `:217` |
| `extractFlatShellCommandSegments(command): FlatShellCommandSegment[]` | `:369` |
| `extractLeadingCdTarget(command)` | `:501` |
| `readShellWord(text)` | `:584` |

`FlatShellCommandSegment` (`:345`) = `{ text, …, pipedStdin }` — `text` là từng lệnh đã tách. Đây là hàm dùng được cho khoá `bash`.

---

## 1. CÁI GÌ THAY ĐỔI, QUAN SÁT ĐƯỢC

Sau W20, bấm "Always allow" trên `git status` chỉ miễn `git status` trong phiên đó — `rm -rf ./build` cùng tool `bash` **hỏi lại** — và nút "Always allow" trên màn hình xin phép **ghi rõ phạm vi đang được cấp** ngay trên nút, thay vì một chữ "Always allow" trần.

---

## 2. BẢNG ĐIỂM SỬA

| path | symbol | TRƯỚC (trích từ file thật) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/acp-permission-gate.ts:55` | `getPermissionIntent`, nhánh `bash` | `return { toolName, title: command \|\| toolName, cacheKey: toolName };` | `cacheKey: canonicalizeApprovalKey("bash", input)` |
| `…acp-permission-gate.ts:63` | `getPermissionIntent`, nhánh `delete` | `cacheKey: toolName,` | `cacheKey: canonicalizeApprovalKey("delete", input),` |
| `…acp-permission-gate.ts:70` | `getPermissionIntent`, nhánh `move` (có from+to) | `paths: [from, to], cacheKey: toolName };` | `paths: [from, to], cacheKey: canonicalizeApprovalKey("move", input) };` |
| `…acp-permission-gate.ts:75` | `getPermissionIntent`, nhánh `move` (chỉ có from) | `cacheKey: toolName,` | `cacheKey: canonicalizeApprovalKey("move", input),` |
| `…acp-permission-gate.ts:86` | `getPermissionIntent`, nhánh `edit` | `cacheKey: "edit:delete",` | `cacheKey: \`edit:delete:${canonicalizedPath}\`,` (đã có tiền tố theo lớp; chỉ thêm phần đường dẫn) |
| `…acp-permission-gate.ts:95` | `getPermissionIntent`, nhánh `edit` | `cacheKey: "edit:move",` | `cacheKey: \`edit:move:${from}→${to}\`,` |
| `…acp-permission-gate.ts:15-20` | `PERMISSION_OPTIONS` | `export const PERMISSION_OPTIONS: ClientBridgePermissionOption[] = [` … `{ optionId: "allow_always", name: "Always allow", kind: "allow_always" },` … `];` | hằng module **tĩnh** không đổi được nhãn theo lệnh ⇒ phải thành hàm: `export function buildPermissionOptions(scope: string): ClientBridgePermissionOption[]`, `name` của `allow_always` = `` `Always allow \`${scope}\` for the rest of this session` `` |
| `packages/coding-agent/src/session/session-tools.ts:972` | `bridge.requestPermission!(…, PERMISSION_OPTIONS, signal)` | `PERMISSION_OPTIONS,` | `buildPermissionOptions(permissionScope),` |
| `packages/coding-agent/src/session/session-tools.ts:986` | tra option theo id | `PERMISSION_OPTIONS_BY_ID.get(outcome.optionId)` | giữ nguyên — `optionId` không đổi, nên map vẫn tra được |

### 2.1. Hàng KHÔNG sửa (plan nói sai)

| path | Vì sao không sửa |
| --- | --- |
| `session/session-tools.ts:991` | Dòng này **đã** đúng. Nó ghi `permissionIntent.cacheKey` — một biến. Chữ `"bash"` là giá trị của `cacheKey`, sinh ra ở gate:55. Sửa dòng 991 là sửa chỗ không sai. |
| `session/session-tools.ts:993` | `reject_always` đã dùng **cùng biến** `permissionIntent.cacheKey`. Yêu cầu "giữ nguyên `reject_always` theo cùng khoá" của plan **đã được thoả mãn sẵn** — không có việc gì để làm. |
| `session/session-tools.ts:939` | `this.#acpPermissionDecisions.get(permissionIntent.cacheKey)` — cùng lập luận. |
| `test/tools/approval.test.ts` | Nó kiểm `resolveApproval` (ma trận 3 mode × 3 tier, dòng 53-63), **không** chạm cache ACP. Sẽ tự xanh. |

---

## 3. CÁC BƯỚC (mỗi bước có neo đã kiểm)

**Bước 1 — Dựng `canonicalizeApprovalKey` ngay cạnh `getPermissionIntent`.**
Neo: `acp-permission-gate.ts:48` (`export function getPermissionIntent(`). Đặt hàm **trên** dòng 48.
Nó **gọi lại** `getPermissionIntent` để lấy tool + paths, thay vì lặp lại logic phân loại:

```
canonicalizeApprovalKey(toolName, args):
  intent = getPermissionIntent(toolName, args)        // dùng lại, không viết parser thứ hai
  nếu không có intent → trả toolName                // fail-open về hành vi cũ, không phá gì
  bash   → `bash:${JSON.stringify(extractFlatShellCommandSegments(command).map(s => s.text))}`
            ↑ import từ ./shell-tokenize — KHÔNG phải từ ./bash-interceptor
  delete → `delete:${resolveToCwd(path, cwd)}`        ← resolveToCwd đã import sẵn ở gate:3
  move   → `move:${resolveToCwd(from)}→${resolveToCwd(to)}`
  edit   → giữ tiền tố edit:delete / edit:move, nối thêm đường dẫn đã resolve
```

**Bước 2 — Thay 4 chỗ `cacheKey: toolName`.**
Neo: `acp-permission-gate.ts:55`, `:63`, `:70`, `:75`. Kiểm bằng `rg -c 'cacheKey: toolName'` — hiện bằng **4**, sau khi sửa phải bằng **0**.

**Bước 3 — Biến `PERMISSION_OPTIONS` thành hàm có phạm vi.**
Neo: `acp-permission-gate.ts:15` (`export const PERMISSION_OPTIONS: ClientBridgePermissionOption[] = [`) và `:23` (`PERMISSION_OPTIONS_BY_ID`).
Nhãn `option.name` đi thẳng ra wire: `acp-client-bridge.ts:130-134` map `options.map(option => ({ optionId, name, kind }))`. Nên đổi `name` ở đây **là** thay đổi người dùng đọc được. `optionId` giữ nguyên để `:986` vẫn tra được.
Neo gọi: `session-tools.ts:972` — truyền `buildPermissionOptions(permissionScope)`.

**Bước 4 — Viết bản âm phủ định.** File mới: `packages/coding-agent/test/session/permission-cache-key.test.ts`. Xem §4.

**Bước 5 — Sửa test đang khoá hành vi lỗi.**
Neo: `test/agent-session-acp-permission.test.ts:842` và `:844`. Đổi `"echo b"` → `"echo a"` và giữ `expect(permissionSpy).toHaveBeenCalledTimes(1)` tại `:846`.
Test này **đang khẳng định đúng cái lỗi W20 xoá**; giữ nguyên nó là giữ lại lỗ hổng. Plan không nhắc tới file này — xem §6.1.

**Bước 6 — Ghi vào `docs/approval-mode.md`.**
Neo: `docs/approval-mode.md:134` (`## ACP sessions`). Thêm một đoạn nói phạm vi của "Always allow" là **theo lệnh/đường dẫn cụ thể, trong một phiên**, và rằng quyết định bị xoá khi đổi phiên (`session-tools.ts:546-548` `clearAcpPermissionDecisions`). Ba mode (`:18-22`) và ba tier (`:6-8`) **không đụng**.

**Bước 7 — Chốt `GAP-D5` trước khi merge.** Nguồn: `.lavish-wip/GAP-REGISTER-2.md:629`. Sổ khuyến nghị **không giữ** đường hồi tương thích. Cần người chứ ký, không phải implementer.

**Bước 8 — Chạy cổng ở §5.**

---

## 4. HỢP ĐỒNG TEST

File: `packages/coding-agent/test/session/permission-cache-key.test.ts` (**tạo mới** — chưa tồn tại).

Sai khi hồi quy (mỗi case một hậu quả nhìn thấy được):

| # | Case | Nếu hồi quy, người dùng thấy |
| --- | --- | --- |
| **1** | Cho `git status` "Always allow", rồi chạy `rm -rf ./build` cùng tool `bash` | `rm -rf` **không hỏi** và chạy thẳng. Đây là hậu quả của lỗi. |
| **2** | Cho `git status` "Always allow", rồi chạy `git status` lần nữa | Lại hỏi ⇒ "Always allow" vô dụng, người dùng bấm hàng trăm lần. **Không có case này thì case 1 có thể xanh bằng cách "hỏi lại mọi thứ".** |
| **3** | `requestPermission` nhận `options` mà `name` của `allow_always` có chứa phạm vi | Nút vẫn ghi "Always allow" trần; người dùng không biết mình vừa cấp gì. **Khoá tốt hơn cũng không cứu được — đây là nửa bắt buộc của item.** |
| **4** | `reject_always` trên một hành động ⇒ hành động đó không hỏi lại; **cùng lúc** một hành động khác cùng tool **vẫn hỏi** | Tách khoá ⇒ lệnh bị từ chối vĩnh viễn lại hỏi, người dùng nghĩ omp không nhớ. |
| **5** | `delete` trên `/tmp/a.ts` rồi `delete` trên `/tmp/b.ts` | Xoá nhầm file không hỏi. (Case riêng cho nhánh `delete` — case 1-2 chỉ phủ `bash`.) |
| **6** | `move` có from+to, rồi `move` chỉ có from (nhánh `:75`) | Nhánh thứ hai bị bỏ sót nếu chỉ sửa `:70`. Đây là bẫy "sửa 3 trong 4". |

Case 1 và 2 là **bắt buộc cả hai** — một chiều không đủ.

### 4.1. Bẫn khi viết case 3

Helper hiện có của suite ACP là `makeBridge` (`agent-session-acp-permission.test.ts:75-82`) và nó **ném mất tham số thứ hai**:

```ts
async requestPermission(_toolCall, _options, _signal) {
	return outcome;
}
```

Muốn assert phạm vi hiển thị thì phải tự bắt `options` — dùng lại `makeBridge` sẽ **luôn xanh** dù bạn chưa làm bước 3.

---

## 5. CỔNG

| # | Lệnh | Cổng có ĐỎ ĐƯỢC không? |
| --- | --- | --- |
| G1 | `bun test packages/coding-agent/test/agent-session-acp-permission.test.ts` | **Có — nhưng phải sửa `:846` theo bước 5, không phải chỉ "giữ xanh".** Tôi đã đo: biến dòng 846 từ `toHaveBeenCalledTimes(1)` → `(2)` thì **ĐỎ** với `Expected 2 / Received 1`. Bằng chứng `allow_always` cho `echo a` hiện đang tự động duyệt `echo b`. Đây là phép đo thật, không phải suy luận. |
| G2 | `bun test packages/coding-agent/test/session/permission-cache-key.test.ts` | **Có.** Tôi đã đo bằng chính thí nghiệm G1: đổi kỳ vọng 1→2 là đỏ. Nhưng chỉ khi case 1 **dùng hai lệnh khác nhau** (`git status` rồi `rm -rf`), không phải hai lần `git status`. |
| G3 | `bun test packages/coding-agent/test/tools/approval.test.ts` | **Có, nhưng ĐÚNG RÕNG.** Nó không chạm cache ACP; xanh là mặc định, không phải bằng chứng. |
| G4 | `bun run check:ts` | **Có**, nhưng yếu — chỉ bắt lỗi kiểu, không bắt hẹp phạm vi. **Không dùng `tsc` / `npx tsc`.** |
| G5 | `rg -c 'cacheKey: toolName' packages/coding-agent/src/session/acp-permission-gate.ts` | **Có** (hiện `4`, sau khi sửa phải `0`). **Nhưng yếu:** chỉ kiểm *chữ*, không kiểm *giá trị*. `cacheKey: toolName + ""` vẫn qua. Không được để cổng này một mình. |

### 5.1. Cổng của plan cần SỬA — hai chỗ

- **Cổng 5 của plan ("`approval.test.ts` vẫn xanh, không đổi assertion nào") trỏ nhầm file.** Suite quyết định là `agent-session-acp-permission.test.ts` (929 dòng, 30 test, hiện **30 pass / 0 fail** — tôi đã chạy). Chính plan nói "1.471 dòng test hiện có" để biện minh cho việc không đụng test, nhưng con số đó sai (959, và file 959 dòng kia không liên quan). Nếu implementer tin plan, họ chạy `approval.test.ts`, thấy xanh, và **ship kèm test `:832` đang đỏ**. Đây là đường đi của regression.
- **Cổng 2 của plan là source-grep.** `AGENTS.md` cấm source-grep trong test; ở đây nó là lệnh tay nên không vi phạm, nhưng nó không chứng minh khoá đã hẹp theo hành động.

### 5.2. Bộ cổng thay thế (5 lệnh, mỗi lệnh đỏ được theo một cơ chế khác nhau)

```bash
# G1 — hành vi, đỏ khi canonicalizeApprovalKey trả lại toolName
bun test packages/coding-agent/test/session/permission-cache-key.test.ts

# G2 — hành vi, đỏ khi một trong bốn nhánh bị bỏ sót
bun test packages/coding-agent/test/agent-session-acp-permission.test.ts

# G3 — bất biến hình dạng, đỏ khi refactor lỡ chạm ma trận mode×tier
bun test packages/coding-agent/test/tools/approval.test.ts

# G4 — kiểu, đỏ khi trả sai kiểu khóa/nhãn
bun run check:ts

# G5 — bất biến văn bản, đỏ khi còn sót chỗ (4 → 0)
rg -c 'cacheKey: toolName' packages/coding-agent/src/session/acp-permission-gate.ts
```

**Vì sao 5 cổng này lành:** G1 đỏ khi khoá quá rộng; G2 đỏ khi khoá quá hẹp **hoặc** khi bỏ sót nhánh; G3 đỏ khi đổi hình dạng cũ; G4 đỏ khi lệch kiểu; G5 đỏ khi còn sót. Không cổng nào đỏ vì lý do của cổng khác. G1 và G2 là hai chiều **đối nghịch** của cùng một hợp đồng — đó là chỗ duy nhất thực sự bảo vệ.

---

## 6. CẠM BẪY RIÊNG CỦA WORK ITEM NÀY

### 6.1. Bẫy lớn nhất — không nằm trong danh sách "cách sai dễ nhất" của plan

**`test/agent-session-acp-permission.test.ts:832` đang khoá chính cái lỗi W20 xoá, và plan không nhắc tới file này.**

```ts
// 832
it("allow_always: caches decision and calls bridge only once for subsequent executes", async () => {
    …
    // 842
    await wrappedBash!.execute("call-1", { command: "echo a" }, …);
    // 844
    await wrappedBash!.execute("call-2", { command: "echo b" }, …);
    // 846
    expect(permissionSpy).toHaveBeenCalledTimes(1);
});
```

Hai lệnh **khác nhau**, kỳ vọng bridge chỉ gọi **một** lần. Sau W20, `echo a` và `echo b` canonicalize ra hai khoá khác nhau ⇒ bridge gọi **hai** lần ⇒ **ĐỎ**. Test này không chỉ "cần cập nhật" — nó là **bản chất lỗi, viết thành khẳng định**.

Đã đo thực tế (sửa tạm dòng 846, chạy, khôi phục, xác nhận `git status` sạch):

```
Expected number of calls: 2
Received number of calls: 1
 29 pass / 1 fail
```

Cách sửa: đổi `"echo b"` → `"echo a"`, giữ nguyên `toHaveBeenCalledTimes(1)`. Khi đó test vẫn chứng minh *cùng một hành động* được cache — đúng hợp đồng mới.

**Cùng file, các test còn lại thì sống sót** và không cần đụng: `:850` boundaryCases (dùng cùng lệnh `"echo boundary"` cả hai lần), `:593`, `:669`, `:720` (đã dùng khoá `edit:move` / `edit:delete` khác nhau sẵn). Chỉ `:832` là xung đột.

### 6.2. Đừng sửa `session-tools.ts:991`

Plan bảo sửa dòng này. Dòng này **đã đúng** — nó ghi `permissionIntent.cacheKey`. Sửa nó thành `canonicalizeApprovalKey(target.name, args)` sẽ **nhân đôi** việc canonicalize và tạo ra hai nơi sinh khoá, tức là `reject_always` và `allow_always` có thể trôi về hai khoá khác nhau — đúng cái lỗi mà bước 3 của plan cấm. Việc cần sửa là **4 chỗ ở `acp-permission-gate.ts`**, không phải chỗ ghi.

### 6.3. `PERMISSION_OPTIONS` là hằng tĩnh — "đổi nó" nghĩa là phải đổi nó thành hàm

Nó là `export const` ở `acp-permission-gate.ts:15`, và `PERMISSION_OPTIONS_BY_ID` ở `:23` dựng từ nó lúc **module load**. Không thể gắn nhãn theo lệnh vào một hằng. Phải tách:

- giữ `PERMISSION_OPTIONS_BY_ID` (tra theo `optionId`, `optionId` không đổi) — `:986` cần nó;
- biến phần hiển thị thành hàm nhận phạm vi.

Sửa thiếu bước này ⇒ bước 3 không làm được, mà test case 3 sẽ xanh giả nếu bạn viết nó sai (xem §4.1).

### 6.4. `edit` đã có khoá theo lớp rồi — đừng đếm nó là việc mới

`acp-permission-gate.ts:86` và `:95` đã trả `cacheKey: "edit:delete"` / `"edit:move"`. Lớp `edit` **không** nằm trong bốn chỗ `cacheKey: toolName`. Plan bước 1 liệt kê nó như việc phải làm — làm lại sẽ phí và dễ phá `:593` / `:720`. Việc thật chỉ là **nối thêm đường dẫn** vào tiền tố sẵn có.

### 6.5. `bash-interceptor.ts` không phải parser

Đọc `:119`: `checkBashInterception` trả `{ block: boolean, message?, suggestedTool? }` — nó **quyết định có chặn không**, không trả mảng lệnh. Parser là `shell-tokenize.ts` (`extractFlatShellCommandSegments`, `:369`), mà `bash-interceptor.ts:8` chỉ *mượn*. Import nhầm file là compile error hoặc — tệ hơn — im lặng rơi về khoá theo lệnh thô.

### 6.6. Đừng dùng `realpath` cho khoá

Plan viết "đường dẫn đã `realpath`". `realpath` **resolve symlink**, nên hai lần gọi cùng một file qua hai đường symlink khác nhau sẽ trùng khoá (đúng ý), **nhưng** nó cũng phụ thuộc filesystem — cùng một khoá sinh ra trên máy có file và máy không có file. Trong repo này đã có sẵn `resolveToCwd` (`path-utils.ts:307`), và nó **đã được import** ở `acp-permission-gate.ts:3` cho đúng việc này. Dùng nó: thuần quyết định, không chạm disk, và khớp với cách `extractPermissionLocations` (`:102`) đã gửi `locations` cho client.

### 6.7. `reject_always` đã dùng chung khoá — đừng "sửa" thành tách

`session-tools.ts:991` và `:993` đọc **cùng** `permissionIntent.cacheKey`. Chỉ cần khoá canonicalize đúng ở nguồn thì cả hai tự động đúng. Tách khoá `reject_always` ra là lỗi (lệnh bị từ chối vĩnh viễn lại hỏi), nhưng cách **duy nhất** gây ra nó là sửa `:993` — đừng đụng.

### 6.8. Nếu bạn chỉ sửa `bash`, hãy tự hỏi vì sao test vẫn xanh

Cả ba lớp hành động dùng **cùng một cơ chế**. Sửa riêng `bash` ⇒ các test `delete`/`move` vẫn xanh vì chúng không tồn tại. Đó là lý do case 5 và case 6 trong §4 là bắt buộc chứ không phải "nice to have".

---

## 7. PHỤ THUỘC

- `depends_on: W6` — kế hoạch ghi rõ: W20 làm được ngay cả khi W6 chưa chốt, chỉ cần ghi rõ là chưa có nền.
- `blocks: không`.
- **Quyết định chặn ship: `GAP-D5`** (`.lavish-wip/GAP-REGISTER-2.md:629`) — có giữ đường hồi tương thích cho cache `allow_always` theo tên tool cũ không. Sổ khuyến nghị **không giữ**. Cần người chứ ký, không phải implementer. Là thay đổi người dùng thấy được ⇒ phải có mục `### Changed` trong `packages/coding-agent/CHANGELOG.md` dưới `## [Unreleased]`.

---

## 8. NHỮNG CHỖ PLAN SAI, ĐỂ NGUYÊN TÀI LIỆU (không sửa plan)

1. `session-tools.ts:991` **không** chứa `#acpPermissionDecisions.set("bash", "allow_always")`; nó chứa `…set(permissionIntent.cacheKey, "allow_always")`. Hàng "sửa" của plan cho file này là **việc không cần làm**.
2. "**1.471 dòng test**" của `approval.test.ts` — thật là **959**, và file đó không đụng cache ACP.
3. "**cả bốn nhánh**" — 4 chỗ, **3 nhánh**; `edit` đã có khoá theo lớp.
4. "parser sẵn có của `bash-interceptor.ts`" — parser nằm ở `shell-tokenize.ts`.
5. Plan **không liệt kê** `packages/coding-agent/test/agent-session-acp-permission.test.ts`, trong khi test `:832` ở đó **bắt buộc phải sửa** và là nơi regression sẽ lọt qua nếu không ai biết.
6. Cổng 5 của plan nhắm `approval.test.ts`; cổng thật là `agent-session-acp-permission.test.ts`.
