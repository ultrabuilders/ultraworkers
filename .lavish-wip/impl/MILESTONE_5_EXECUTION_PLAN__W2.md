# Phiếu triển khai — W2 `CANONICAL_PI_SCOPE` và `PI_SCOPE_ALIASES`

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md` dòng 487–705
**Cây đã đo:** `ultraworkers` @ `47720fd`, nhánh `milestone-1`
**Ngày đo:** 2026-09-29

---

## 1. Cái gì thay đổi, quan sát được

Một plugin khai báo `@ultraworkers/pi-utils` sẽ nhận về **cùng một instance module** với bản
`pi-utils` mà host đang chạy (tool registry, module registry, `pi-natives` chỉ được link một
lần) — thay vì Bun kéo một bản `@ultraworkers/pi-utils` thứ hai từ npm, hoặc plugin chết
ngay với module-not-found.

---

## 2. Bảng điểm sửa

Không sửa dòng nào khác ngoài hai dòng dưới. Cột "TRƯỚC" trích nguyên văn từ file thật.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802` | `PI_SCOPE_ALIASES` | `const PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"] as const;` | `const PI_SCOPE_ALIASES = ["ultraworkers", "oh-my-pi", "mariozechner", "earendil-works"] as const;` — **W2a** |
| `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:796` | `CANONICAL_PI_SCOPE` | `const CANONICAL_PI_SCOPE = "@oh-my-pi";` | `const CANONICAL_PI_SCOPE = "@ultraworkers";` — **W2b, chỉ sau W7** |
| `packages/coding-agent/test/pi-scope-aliases.test.ts:43` | `CASES` | `const CASES: readonly AliasCase[] = [` … 7 phần tử … `];` | thêm một phần tử `{ id: "ultraworkers-utils", aliasSpecifier: "@ultraworkers/pi-utils", canonicalPath: canonicalUtils, symbol: "logger" }` — **W2b** |
| `packages/coding-agent/test/pi-scope-aliases.test.ts:96-100` | `package.json` của probe plugin | `JSON.stringify({ name: "alias-probe-plugin", version: "1.0.0", pi: { extensions: ["./dist/extension.ts"] } })` | thêm `peerDependencies: { "@oh-my-pi/pi-utils": "*", "@ultraworkers/pi-utils": "*", "@mariozechner/pi-utils": "*" }` — **W2b** |

**Dòng cố ý KHÔNG đụng tới** (đã đọc và xác nhận nội dung):

- `:805` `const PI_PACKAGE_NAMES = ["pi-agent-core", "pi-ai", "pi-coding-agent", "pi-natives", "pi-tui", "pi-utils"] as const;` — 6 **basename**, tách rời khỏi danh sách scope. Repo publish 16 package có scope, nên 10 basename (`pi-catalog`, `pi-metaharness`, `pi-mnemopi`, `pi-wire`, `omp-stats`, `omptype`, `snapcompact`, `browser-relay`, `collab-web`, `typescript-edit-benchmark`) **không** khớp filter cả trước lẫn sau W2. Đây là quyết định sản phẩm N17, ngoài phạm vi W2.
- `:807` `const PI_SCOPE_ALTERNATION = PI_SCOPE_ALIASES.join("|");` và `:808` `const PI_PACKAGE_ALTERNATION = PI_PACKAGE_NAMES.join("|");` — giá trị dẫn xuất, tự tính lại.
- `:837` `const LEGACY_PI_SPECIFIER_FILTER = new RegExp(...)` — nội suy cả hai, không cần sửa.

---

## 3. Các bước (mọi neo đã mở và đọc)

### W2a — sóng 1, tự đóng gói được một mình

1. **`legacy-pi-compat.ts:802`** — thêm `"ultraworkers"` làm phần tử **đầu tiên** của
   `PI_SCOPE_ALIASES`. Đọc dòng 802 trước khi sửa; nó chứa đúng chuỗi 3 phần tử ở cột "TRƯỚC".
   Giữ nguyên `CANONICAL_PI_SCOPE` ở `:796`.
   Không đụng `:805`, không đụng `:808`.

2. **Không thêm ca test nào ở W2a.** Đây là quyết định lịch. Lý do mà spec nêu («cột
   canonical-path dựng từ `Bun.resolveSync` ở phạm vi module, dòng 24-34, không có gì để
   resolve tới») **không đúng** — một ca `@ultraworkers` tái dùng `canonicalUtils` sẵn có ở
   `:29` và không cần resolve scope mới. Đã chạy thật: ca đó **xanh ngay ở W2a** (xem §4).

3. **Trước khi commit** — chạy hai grep ở §5 và xác nhận `git diff` chỉ chạm đúng một dòng
   source, không chạm `:805`.

### W2b — chỉ sau khi W7 pass 1 đã merge và `bun install` đã chạy lại

4. **`legacy-pi-compat.ts:796`** — đổi `CANONICAL_PI_SCOPE` sang `"@ultraworkers"`. Đây là
   toàn bộ nội dung của W2b; `:802` đã xong ở W2a.

5. **`pi-scope-aliases.test.ts:43`** — nối thêm một ca vào `CASES`:
   `{ id: "ultraworkers-utils", aliasSpecifier: "@ultraworkers/pi-utils", canonicalPath: canonicalUtils, symbol: "logger" }`.
   `canonicalUtils` đã có sẵn ở `:29`. Bộ khung ở `:109-117` tự sinh phép khẳng định identity.

6. **`pi-scope-aliases.test.ts:96-100`** — thêm trường `peerDependencies` vào `package.json`
   của probe plugin, liệt kê mọi alias scope đang thử. Không loader nào đọc trường này để
   quyết định resolve — nó **chứng minh bằng phủ định** rằng việc resolve đến từ canonicalizer
   của host, không phải từ một peer được cài cục bộ.

7. **Trước khi coi W2b là xong** — kiểm tra bằng mắt đường đi của binary đã compile, vì không
   test in-process nào chạm tới được. `loadBundledModule` ném
   `omp:legacy-pi-shim: no bundled module registered for <key>` tại `:752-754`; registry khoá
   theo `manifest.name` (`scripts/legacy-pi-virtual-module.ts:126` — đã đọc:
   `addEntry(manifest.name, ...)`). Xác nhận rename manifest của W7 nằm trong cùng nhánh:
   `git grep -m1 '"name"' -- packages/utils/package.json` phải in `@ultraworkers/pi-utils`.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/pi-scope-aliases.test.ts` (đã tồn tại, 135 dòng — **không
tạo file mới**; `test/extension-scope-canonicalization.test.ts` mà plan đặt tên không tồn tại và
không nên thêm).

**Cơ chế:** `CASES` ở `:43` sinh ra một probe plugin. Với mỗi ca, `:109-117` phát ra:

```
import { <symbol> as alias<idx> }     from "<aliasSpecifier>";
import { <symbol> as canonical<idx> } from "<đường dẫn tuyệt đối từ Bun.resolveSync>";
if (alias<idx> !== canonical<idx>) throw new Error("...did not remap to the bundled copy...");
```

Đây là **identity của object**, không phải so sánh chuỗi với hằng số — nên nó không thể xanh
một cách hụt lực.

**Các ca:**

| ca | aliasSpecifier | canonicalPath | symbol | thuộc |
| --- | --- | --- | --- | --- |
| `ultraworkers-utils` (mới) | `@ultraworkers/pi-utils` | `canonicalUtils` (`:29`) | `logger` | **W2b** |
| `ohmypi-utils` (đã có, `:53`) | `@oh-my-pi/pi-utils` | `canonicalUtils` | `logger` | regression guard |
| `ohmypi-coding-agent` (đã có, `:54-59`) | `@oh-my-pi/pi-coding-agent` | `canonicalCodingAgent` (`:24`) | `isToolCallEventType` | regression guard |

**Đã chạy thật trên cây này (4 trạng thái), không suy đoán:**

| trạng thái | kết quả |
| --- | --- |
| HEAD (chưa làm gì) | `1 pass / 0 fail` |
| W2b ca test + W2a, chưa W2b | `1 pass / 0 fail` — ca `@ultraworkers` xanh ở W2a như spec nói |
| W2b ca test, chưa W2a | `0 pass / 1 fail` — `Cannot find module '@ultraworkers/pi-utils'` |
| W2b (canonical flip) mà chưa W7 | `0 pass / 1 fail` — `Cannot find module '@ultraworkers/pi-utils'` |
| W2a làm rơi `"oh-my-pi"` khỏi alias | `0 pass / 1 fail` |

**Điều người dùng thấy gì nếu hồi quy:**

1. **Host trả cho plugin một bản sao thứ hai.** Tool do host đăng ký trở nên vô hình với phía
   plugin; `pi-natives` bị link hai lần → đôi addon native trong cây của người dùng.
2. **Chiều ngược — alias mất `@oh-my-pi`.** Mọi extension hiện hữu viết theo scope c�ng chết lúc
   plugin-load với module-not-found. Đây là **lỗi runtime, không phải lỗi build**, nên không có
   gì trong CI bắt được cho tới khi một người dùng thật thử nạp một plugin thật.
3. **W2b đi trước W7.** Ở chế độ dev: `getResolvedSpecifier` (`:1077`) ném, `try/catch` ở
   `:1144-1149` nuốt lỗi, shim bị bypass âm thầm — plugin scope cũ vẫn chạy được nhưng **chỉ
   tình cờ**, qua việc Bun tự resolve `@oh-my-pi/*` từ workspace root. Hệ quả: canonicalizer
   chết lặng lẽ. **Đã tái hiện:** khi flip canonical mà chưa W7, 6 ca `@oh-my-pi` cũ **vẫn xanh**,
   chỉ ca `@ultraworkers` mới đỏ — đúng cơ chế nuốt lỗi mà spec mô tả.

---

## 5. Cổng

### Cổng W2a (chạy được ngay)

```bash
bun run check:ts
# Kỳ vọng: exit 0. ĐÃ CHẠY THẬT: exit 0, 16/16 workspace package typecheck sạch.
# Thời gian đo được: 97.58s (spec ghi "~25 giây" — lạc quan; con số thực tế ở đây gần 100s).

git grep -n 'PI_SCOPE_ALIASES = \["ultraworkers", "oh-my-pi"' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts
# Kỳ vọng: đúng một hit ở dòng 802. Ở HEAD: exit 1, không hit (ĐỎ, đúng — W2a chưa làm).

git grep -nF 'const CANONICAL_PI_SCOPE = "@oh-my-pi";' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts
# Kỳ vọng: đúng một hit ở dòng 796. Ở HEAD: đã xác nhận hit 796.
```

**Cổng này có ĐỎ ĐƯỢC không?** Có, nhưng **chỉ nhờ grep** — và đây là điểm phải nói thẳng.

W2a cố ý không thêm ca test nào, nên **không có cổng runtime nào bắt được W2a**. `check:ts`
bỏ qua hoàn toàn: hai hằng số là `as const` dùng trong `new RegExp` và template string, nên đổi
giá trị không tạo ra bất kỳ lỗi type nào. Đã xác nhận: `bun run check:ts` xanh ở cả ba trạng
thái, kể cả trạng thái W2a làm rơi `"oh-my-pi"` khỏi danh sách alias. Vì vậy grep là toàn bộ cổng.

Cả hai grep đã được chạy thật ở cả ba trạng thái:

| trạng thái | grep (1) alias | grep (2) canonical |
| --- | --- | --- |
| HEAD (chưa W2a) | không hit → ĐỎ | hit 796 → XANH |
| W2a đúng | hit 802 → XANH | hit 796 → XANH |
| W2a mất `"oh-my-pi"` | **không hit → ĐỎ** | hit 796 → XANH |

**Sửa cho cổng W2a mạnh hơn (khuyến nghị).** Grep (1) là một `git grep` exit-code, không phải
một assertion — ai đó đổi pattern là cổng xanh trong khi bắt được gì cả. Thay bằng một assertion
thật, thêm vào file test sẵn có, chạy được **ngay hôm nay** vì ca dùng `canonicalUtils` đã có sẵn:

```typescript
// packages/coding-agent/test/pi-scope-aliases.test.ts
import { PI_SCOPE_ALIASES } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/legacy-pi-compat";
// ...
it("keeps every historical scope in the alias table", () => {
    expect(PI_SCOPE_ALIASES).toEqual(["ultraworkers", "oh-my-pi", "mariozechner", "earendil-works"]);
});
```

Cổng này **ĐỎ ĐƯỢC thật** ở cả ba trạng thái, và nó đỏ bằng *hành vi quan sát được* thay vì bằng
mẫu grep. Nó cũng đóng lại đúng lỗ hổng mà spec tự nêu: «nếu dùng mẫu `"@oh-my-pi"` thay vì khớp
trực tiếp dòng `PI_SCOPE_ALIASES`, cổng sẽ luôn xanh và bắt được gì cả».

### Cổng W2b (sau W7)

```bash
cd packages/coding-agent && bun test test/pi-scope-aliases.test.ts
# Kỳ vọng: 1 pass / 0 fail. ĐÃ CHẠY THẬT ở HEAD: 1 pass / 0 fail, 2 expect() calls, 548ms.

git grep -m1 '"name"' -- packages/utils/package.json
# Sau W7, PHẢI in @ultraworkers/pi-utils.
# Ở HEAD: in @oh-my-pi/pi-utils (đúng — W7 chưa merge).
```

**Cổng này có ĐỎ ĐƯỢC không?** Có, theo **hai đường độc lập**, và cả hai đã được tái hiện:

1. **Flip canonical mà mất `@oh-my-pi` khỏi alias** → các ca sẵn có ở `:53` và `:54-59` nạp
   plugin import `@oh-my-pi/pi-utils` / `@oh-my-pi/pi-coding-agent`; resolve dừng, `result.errors`
   khác rỗng, `expect(result.errors).toEqual([])` ở `:131` thất bại. **Đã tái hiện: đỏ.**
2. **W2b đi trước W7** → `Bun.resolveSync` ném bên trong probe sinh ra chứ không ở phạm vi module
   test, nên file vẫn đánh giá được, `result.errors` khác rỗng, `expect(result.errors).toEqual([])`
   thất bại. **Đã tái hiện: đỏ**, với đúng thông điệp `Cannot find module '@ultraworkers/pi-utils'`.

Lệnh thứ hai (`git grep -m1 '"name"'`) là con dấu ngón tay thứ ba: nó không đỏ được bằng hành vi
runtime, nhưng nó bắt được trường hợp mà cả hai cổng runtime đều xanh — canonical đã flip, alias
đủ, nhưng manifest chưa được đổi tên. Trong `bun test` (chế độ source) trường hợp đó **vẫn đỏ**,
nên đây là lưới an toàn thừa cho binary đã compile, nơi registry khoá theo `manifest.name`.

---

## 6. Cạm bẫy riêng của work item này

**Cạm bẫy 1 — đưa W2b lên trước W7. Nặng nhất, và spec đã đánh giá đúng là nặng hơn cả rủi ro plan tự nêu.**

Cơ chế dev: `remapLegacyPiSpecifier` (`:1057-1069`) viết lại mọi scope được chấp nhận thành
`${CANONICAL_PI_SCOPE}/...`, nên `@oh-my-pi/pi-utils` → `@ultraworkers/pi-utils`.
`getResolvedSpecifier` (`:1077`) gọi `Bun.resolveSync` và ném. `try/catch` ở `:1144-1149` nuốt
lỗi. **Đã đo:** `bun -e 'Bun.resolveSync("@ultraworkers/pi-utils", process.cwd())'` →
`Cannot find module '@ultraworkers/pi-utils'`, trong khi cùng lệnh với `@oh-my-pi/pi-utils` →
`/Users/tranquangdang21/Projects/ultraworkers/packages/utils/src/index.ts`.

Cơ chế binary đã compile: `LEGACY_PI_AI_SHIM_PATH` (`:951-953`) trở thành
`omp-legacy-pi-bundled:@ultraworkers/pi-ai`, còn registry vẫn khoá `@oh-my-pi/pi-ai`
(`scripts/legacy-pi-virtual-module.ts:126`). `loadBundledModule` (`:752-754`) ném. Crash cứng
trên **mọi** lần load extension bị bundle — không test in-process nào chạm tới được. Vì vậy
bước 7 là một phép kiểm tra bằng mắt, không phải một test.

**Cạm bẫy 2 — đọc nhầm hành vi của `try/catch` là "mọi thứ vẫn chạy".** Khi tái hiện W2b-trước-W7,
6 ca `@oh-my-pi` cũ **vẫn xanh**. Trông có vẻ "chạy được rồi". Không phải — chúng xanh vì Bun tự
resolve `@oh-my-pi/*` từ workspace root sau khi canonicalizer đã chết. Đây đúng là cái hại trùng
module mà plan mô tả, chỉ đến theo đường ngược. Test đỏ **không** có nghĩa là mọi thứ hỏng; nó
báo rằng scope mới không resolve được.

**Cạm bẫy 3 — tạo file test mới mà plan đặt tên.** `test/pi-scope-aliases.test.ts` đã tồn tại và
đã khẳng định đúng hợp đồng bằng identity của object. Một file thứ hai là mẫu trùng coverage mà
AGENTS.md cấm, và nó sẽ trôi lệch.

**Cạm bẫy 4 — "giúp thêm" 10 basename còn thiếu** vào `PI_PACKAGE_NAMES` khi đang mở file ra.
Trông như làm nốt công việc, nhưng đó là quyết định sản phẩm khác (N17). Sự lệch 6-vs-16 là thứ
dễ bị một người review thiện chí «sửa cho đàng hoàng». Nêu rõ trong mô tả PR để không ai làm.

**Cạm bẫy 5 — tin rằng `check:ts` bảo vệ W2a.** Nó không bảo vệ gì cả: xanh ở cả ba trạng thái,
kể cả khi W2a làm rơi scope cũ. Đây là lý do cổng grep của spec cần được thay bằng assertion thật
(§5).

---

## 7. Những chỗ trong work item sai so với cây thật (ghi ra, không sửa tài liệu)

| claim của spec | hiện trạng đo được |
| --- | --- |
| «Trên máy **chưa build**, `bun test` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon`»; «Phần lớn công sức nằm ở phần xác minh: `bun test` bị chặn trong môi trường này cho tới khi addon native được build»; cả khối `brew install ninja` + `bun --cwd=packages/natives run build` | **CŨ — đã hết hiệu lực.** Addon đã build: `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại (185 MB, 2026-09-29 07:32). `ninja` cũng đã có ở `/opt/homebrew/bin/ninja`. `cd packages/coding-agent && bun test test/pi-scope-aliases.test.ts` → **1 pass / 0 fail / 2 expect() calls, 548ms**. Cổng runtime của W2 chạy được ngay. Xóa toàn bộ phần tiền đề này khỏi kế hoạch khi triển khai. |
| «Kỳ vọng: `1 pass, 0 fail`» (khối verification) | **Mâu thuẫn nội bộ với chính nó:** cùng mục đó lại ghi `→ 8 pass / 0 fail`. Số thật là **1 pass / 0 fail**. `CASES` có 7 phần tử nhưng chỉ có **một** khối `it()` duy nhất (`:129`) chứa toàn bộ; thêm ca thứ 8 cũng vẫn là 1 pass. Con số 8 là đếm ca, không phải đếm test. |
| HEAD là `1454dc0` | **CŨ.** HEAD thật là `47720fd` trên `milestone-1`. Tuy nhiên **mọi neo vẫn đúng** — đã mở và đọc từng dòng ở `47720fd`, không dòng nào trôi. Danh sách neo đã kiểm: `:748`, `:751-754`, `:789-795`, `:796`, `:798-801`, `:802`, `:805`, `:807`, `:808`, `:837`, `:951-953`, `:963`, `:970`, `:1022-1024`, `:1057-1069`, `:1068`, `:1077`, `:1144-1149`, `:1158-1161`, `:1453-1466`; test `:24-34`, `:29`, `:43`, `:53`, `:54-59`, `:61-66`, `:96-100`, `:109-117`, `:129`, `:131`, `:134`; script `:126`. |
| «Cần một số dòng chuẩn» cho `result.errors` (mục «Cần người xác nhận» #1 — spec tự ghi là mâu thuẫn 129/130/131) | **Đã giải được.** Trong file thật: `:129` là dòng mở `it(...)`, `:130` là `const result = await loadExtensions(...)`, `:131` là `expect(result.errors).toEqual([])`, `:134` là dòng đóng `it`. Nên: dòng **chứng minh** assertion là **131**; dòng **gọi** là 130; dòng **khai báo test** là 129. Spec tự mâu thuẫn vì đếm cả ba. Dùng **131** cho mọi câu lệnh grep theo dòng. |
| «`Mọi nơi dùng CANONICAL_PI_SCOPE nằm ở `:952`, `:963`, `:970`, `:1022-1024` và `:1068`» | **ĐÚNG.** `grep -n CANONICAL_PI_SCOPE` trả về đúng 8 hit: 796 (định nghĩa), 952, 963, 970, 1022, 1023, 1024, 1068. Không có site thứ hai ngoài file. `PI_SCOPE_ALIASES` chỉ có 2 hit: 802 và 807. |
| «`bun run check:ts` … Mất ~25 giây» | **Lạc quan.** Đo thật: **97.58s**. Chênh ~4×, nhưng vẫn exit 0 và 16/16 package sạch. Đừng đặt ngưỡng thời gian vào cổng. |
| «Comment ở 789-795 … vẫn đúng ở thời điểm này [W2a]» | **Đúng ở W2a, SAI ở W2b — và spec không đề cập.** Dòng 791 nói «or the canonical @oh-my-pi scope itself». Sau khi W2b flip `CANONICAL_PI_SCOPE` sang `@ultraworkers`, `@oh-my-pi` **không còn là canonical**, nên câu này thành sai. Tương tự, comment 798-801 giải thích «`@oh-my-pi` is intentionally included» — vẫn đúng. Bước W2b (bước 4 ở §3) **chưa** đề cập sửa comment ở `:789-795`. Đây là một bước bị bỏ sót; thêm nó vào W2b. |
| «`files_touched` mô tả thẳng «Append two cases», còn `steps`/`gate` nói W2a không thêm ca nào» (mục «Cần người xác nhận» #2) | **Đúng là mâu thuẫn, và đã có lời giải bằng thực nghiệm.** Đã chạy thật: ca `@ultraworkers` **xanh ở W2a** (chỉ cần `canonicalUtils` ở `:29`). Nên cả hai ca đều **về mặt kỹ thuật** có thể thuộc W2a. Việc chờ tới W2b là lịch, không phải kỹ thuật. Nếu milestone muốn W2a có cổng runtime, thêm ca ở W2a là hợp lý — nó xanh. Nhưng lưu ý: ca đó **không** bắt được lỗi W2b-trước-W7, vì ở trạng thái đó nó đỏ **vì lý do sai** (scope mới chưa tồn tại), tức trước W7 nó đỏ luôn. Khuyến nghị: giữ ở W2b như spec nói. |

---

## 8. Cần người quyết (chưa tự quyết)

1. **Chấp nhận tách W2a / W2b hay giữ W2 là một commit bắt buộc merge cùng PR với W7 pass 1?**
   Tách an toàn hơn tuyệt đối (không tạo ra khoảng thời gian nào canonical trỏ tới scope không
   tồn tại), nhưng kéo một dòng của W2 ra khỏi sóng 1 — thay đổi nhìn thấy được so với cấu trúc
   sóng của plan. Cần người xác nhận vì nó đổi trình tự milestone, không chỉ code.
2. **Nếu W2b và W7 pass 1 buộc đi cùng nhau, ai giữ cổng phát hành chặn W2b khỏi bị cherry-pick
   một mình?** Đề xuất: một check CI khẳng định `git grep -m1 '"name"' -- packages/utils/package.json`
   trả về `@ultraworkers/pi-utils` mỗi khi `CANONICAL_PI_SCOPE` là `@ultraworkers`. Điều này biến
   lỗi thứ tự từ «được ghi nhận» thành «không thể xảy ra».
3. **N17** được ghi là đã chốt ('keep all 16 basenames') nhưng bảng open-questions của chính plan vẫn
   trình bày nó là quyết định còn mở. W2 không được giải quyết theo bất kỳ hướng nào. Chốt lập
   trường cuối cùng trước khi ai đụng tới `PI_PACKAGE_NAMES`.
4. **Mới (chưa có trong spec):** có chấp nhận assertion `PI_SCOPE_ALIASES` thật ở §5 thay cho
   grep không? Đây là điểm yếu duy nhất còn lại trong cổng W2a.
