# PHIẾU TRIỂN KHAI — M5 / W7: Đổi npm scope `@oh-my-pi/` → `@ultraworkers/`

**Nguồn:** `MILESTONE_5_EXECUTION_PLAN.md` §`## W7.` (dòng 1827–2258)
**Cây đo:** `HEAD = 47720fd42c075bdd076fa1ec176dc2417325f035`, nhánh `milestone-1`
**Ngày đo:** 2026-09-29 · **Kế hoạch viết cho:** `HEAD 1454dc0` → **cây đã dời, xem Mục 7**

> Phiếu này KHÔNG sửa file kế hoạch. Mọi chỗ tài liệu sai so với cây thật được ghi ở **Mục 7 — Sai lệch đã đo**.

---

## 1. Cái gì thay đổi, quan sát được

Sau W7, mọi import nội bộ, mọi mục phụ thuộc, mọi dòng `name` trong manifest, mọi mục ghim catalog, mọi lệnh cài đặt trong script release và mọi tên package trong `bun.lock` mang tiền tố `@ultraworkers/` thay cho `@oh-my-pi/`, **basename sau dấu `/` giữ nguyên** — và `bun install` trên một cây sạch phải link được cả 16 package về `packages/`, không tải bản nào từ registry.

**Không có gì khác thay đổi.** Dạng trần `"oh-my-pi"` không nằm trong phạm vi W7 (W8a sở hữu nó). `CHANGELOG.md` phần đã phát hành không bị chạm.

---

## 2. Bảng điểm sửa

`TRƯỚC` trích nguyên văn từ file thật tại `HEAD 47720fd` (đã mở và đọc từng dòng).

| đường/dẫn | symbol / vùng | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/ai/package.json:2` | trường `name` | `"name": "@oh-my-pi/pi-ai",` | `"name": "@ultraworkers/pi-ai",` |
| `packages/stats/package.json:3` | trường `name` | `"name": "@oh-my-pi/omp-stats",` | `"name": "@ultraworkers/omp-stats",` |
| `packages/browser-relay/package.json:3` | trường `name` | `"name": "@oh-my-pi/browser-relay",` | `"name": "@ultraworkers/browser-relay",` |
| `packages/ai/package.json:152-154` | mục phụ thuộc | `"@oh-my-pi/omptype": "catalog:",` | `"@ultraworkers/omptype": "catalog:",` |
| `package.json:19-30` | `workspaces.catalog`, 12 mục | `"@oh-my-pi/omp-stats": "18.4.0",` | `"@ultraworkers/omp-stats": "18.4.0",` |
| `package.json:19-30` | 4 basename **không** có mục ghim | *(vắng mặt)* | *(vẫn vắng mặt — KHÔNG thêm)* |
| `packages/coding-agent/src/index.ts:5-10` | import | `export * as zod from "@oh-my-pi/omptype/zod";` | `export * as zod from "@ultraworkers/omptype/zod";` |
| `bun.lock` | lockfile (122 lượt) | `"@oh-my-pi/pi-ai@workspace:packages/ai"` | `"@ultraworkers/pi-ai@workspace:packages/ai"` — **tái sinh bằng `bun install`, không sửa tay** |
| **`packages/natives/native/loader-state.js:70`** | `resolveLeafPackageDir` | `return path.dirname(require_.resolve(\`@oh-my-pi/pi-natives-${platformTag}/package.json\`));` | ⚠️ **XEM MỤC 7.1 (Q1) — CỔNG BỊ CHẶN, KHÔNG ĐỔI Ở W7** |
| `packages/natives/native/loader-state.js` | 10 dòng còn lại: `:12`, `:119`, `:715`, `:722`, `:753`, `:795`, `:797`, `:800`, `:803`, `:844` | 12 lượt, xem bảng neo ở Mục 3 | `@oh-my-pi/` → `@ultraworkers/` (văn bản người dùng đọc + comment) |
| **`packages/natives/scripts/gen-npm-packages.ts:93`** | `buildLeafManifest` — **KHÔNG CÓ TRONG TÀI LIỆU** | `name: \`@oh-my-pi/pi-natives-${tag}\`,` | `name: \`@ultraworkers/pi-natives-${tag}\`,` |
| `packages/natives/scripts/gen-npm-packages.ts:103,113` | `repository.url`, README | `git+https://github.com/can1357/oh-my-pi.git` | ⚠️ **KHÔNG khớp mẫu `@oh-my-pi/` (không có dấu `/` ở cuối) — pass KHÔNG đụng tới.** Cần quyết riêng. |
| `.github/workflows/ci.yml:326` | fetch addon native | `tarball="$(npm view @oh-my-pi/pi-natives-linux-x64@latest dist.tarball)"` | `tarball="$(npm view @ultraworkers/pi-natives-linux-x64@latest dist.tarball)"` |
| `.github/workflows/ci.yml:1035` | comment publish | `# Publishes the six @oh-my-pi/pi-natives-<tag> leaf packages once` | `# Publishes the six @ultraworkers/pi-natives-<tag> leaf packages once` |
| `scripts/install.sh:14` | `PACKAGE=` | `PACKAGE="@oh-my-pi/pi-coding-agent"` | `PACKAGE="@ultraworkers/pi-coding-agent"` |
| `scripts/install.ps1:28` | `$Package =` | `$Package = "@oh-my-pi/pi-coding-agent"` | `$Package = "@ultraworkers/pi-coding-agent"` |
| `scripts/install-tests/run-ci.sh` | 21 lượt | (đã đếm) | đổi scope |
| `scripts/install-tests/tarball.dockerfile:43,131` | registry mirror + `bun add` | `'@oh-my-pi/*':` · `bun add @oh-my-pi/pi-coding-agent --registry http://localhost:4873` | `'@ultraworkers/*':` · `bun add @ultraworkers/pi-coding-agent --registry …` |
| `nix/bun.nix:660+` | 16 dòng định nghĩa nix | `"@oh-my-pi/browser-relay" = copyPathToStore ../packages/browser-relay;` | `"@ultraworkers/browser-relay" = …` |
| `.omp/skills/tool-prompt-optimization/scripts/probe.ts:28-31` | **code thật** | `import { completeSimple } from "@oh-my-pi/pi-ai";` | `import { completeSimple } from "@ultraworkers/pi-ai";` |
| `.omp/skills/tool-prompt-optimization/scripts/probe-builtin.ts:21-23` | **code thật** | `import { toolWireSchema } from "@oh-my-pi/pi-ai";` | `import { toolWireSchema } from "@ultraworkers/pi-ai";` |
| `.omp/skills/tool-prompt-optimization/SKILL.md:12,42` | doc skill | `` `@oh-my-pi/pi-ai` `completeSimple` `` | đổi scope |
| `packages/coding-agent/test/fixtures/before-compaction.jsonl` | 649 lượt | kể cả `https://registry.npmjs.org/@oh-my-pi/pi-coding-agent/…` | ⚠️ **CHỜ Q2 — xem Mục 7.1** |
| `packages/coding-agent/test/fixtures/large-session.jsonl` | 161 lượt | transcript | ⚠️ **CHỜ Q2 — xem Mục 7.1** |
| `packages/coding-agent/test/npm-scope-resolution.test.ts` | **TẠO MỚI** | *(chưa tồn tại — đã kiểm)* | file test 3 invariant, Mục 5 |
| `scripts/rename/keep-list.txt` | **ĐIỀU KIỆN MỞ** | *(chưa tồn tại — `ls scripts/rename/` exit 2)* | phải có trên `main` + được duyệt trước khi gõ |

**Tổng đã kiểm đếm tại `HEAD 47720fd`:**

| nhóm | số file | số lượt |
| --- | --- | --- |
| 16 manifest `packages/*/package.json` | 16 | 78 |
| `package.json` gốc (12 mục ghim) | 1 | 12 |
| `bun.lock` | 1 | 122 |
| **nhóm manifest + lock** | **18** | **212** |
| **tập còn lại (mã + tài liệu)** | **4096** | **17040** |
| **TỔNG tập in-scope** | **4114** | **17252** |

---

## 3. Các bước

Mỗi neo dưới đây **đã mở và đọc**; nội dung trích nguyên văn từ `sed -n "<n>p"`.

### Bước 1 — DỪNG. Kiểm tra ba điều kiện mở (chặn cứng)

Ba điều phải **đồng thời** đúng. Sai một là DỪNG, không sửa dòng nào.

| # | điều kiện | neo đã kiểm | trạng thái tại `47720fd` |
| --- | --- | --- | --- |
| (a) | `scripts/rename/keep-list.txt` tồn tại trên `main`, đã được người khác duyệt | `ls scripts/rename/` | ❌ **CHƯA CÓ** — `No such file or directory`, exit 2 |
| (b) | W2 đã merge: `CANONICAL_PI_SCOPE` trỏ scope mới | `legacy-pi-compat.ts:796` | ❌ **CHƯA** — dòng 796 đọc nguyên văn: `const CANONICAL_PI_SCOPE = "@oh-my-pi";` |
| (c) | `PI_SCOPE_ALIASES` giữ scope cũ vĩnh viễn | `legacy-pi-compat.ts:802` | ✅ dòng 802 đọc nguyên văn: `const PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"] as const;` |

→ **W7 bị CHẶN ở HEAD hiện tại.** Cả (a) và (b) đều chưa thoả.

### Bước 2 — Xác nhận bằng mắt hai chuỗi scope của W2

Đọc `legacy-pi-compat.ts:796` và `:802`. Cả hai phải là **dạng trần, KHÔNG có dấu `/` ở cuối**.

**Đã xác nhận tại `47720fd`:**
- `:796` → `const CANONICAL_PI_SCOPE = "@oh-my-pi";` — dạng trần, không `/` ✅
- `:802` → `const PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"] as const;` — dạng trần ✅

Đây là lý do pass `s{\@oh-my-pi/}{@ultraworkers/}g` **không chạm** chúng: mẫu cần dấu `/` ngay sau `pi`. Nếu W2 thêm dấu `/`, pass sẽ phá cơ chế tương thích — DỪNG.

### Bước 3 — Chụp baseline TRƯỚC mọi thay đổi, ra `/tmp`

```bash
extract_released() { awk '/^## \[Unreleased\]/{u=1} /^## \[/{if(u&&$0!~/Unreleased/){u=0}} !u{print}' "$1"; }
for f in $(git ls-files 'packages/*/CHANGELOG.md'); do
  printf '%s:%s\n' "$f" "$(extract_released "$f" | grep -c -o -F '@oh-my-pi/' || true)"
done > /tmp/w7-changelog-baseline.txt
git grep -lE '"oh-my-pi"' -- . > /tmp/w7-bare-baseline.txt
git grep -o -F '@oh-my-pi/' -- . | wc -l > /tmp/w7-all-hits-baseline.txt
git rev-parse HEAD > /tmp/w7-head-baseline.txt
```

**Số đo tại `47720fd` (đã chạy thật, ghi vào commit message):**

| baseline | kỳ vọng tài liệu | **đo tại `47720fd`** |
| --- | --- | --- |
| changelog đã phát hành | 13 file / 85 lượt | **14 file / 85 lượt** (con số 85 đúng; số file đã dời) |
| dạng trần | 16 file | **16 file** (đúng số lượng, sai thành phần — Mục 7) |
| tổng lượt toàn repo | 17698 | **18545** |
| `HEAD` | `1454dc0` | **`47720fd`** |

Baseline thứ tư là **MỐC HOÀN TÁC** dùng ở Bước 7b. Baseline thứ ba dùng ở GATE A2. Cả hai phải dùng, không chụp rồi bỏ.

### Bước 4 — Sinh danh sách in-scope từ `git ls-files`

**KHÔNG** dùng `git grep -- .` để sinh danh sách — nó kéo chính các file loại trừ vào tập.

```bash
git ls-files -z \
  ':(exclude)packages/*/CHANGELOG.md' \
  ':(exclude).lavish-wip/**' \
  ':(exclude)COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \
  ':(exclude)MILESTONE_*_EXECUTION_PLAN.md' \
  | xargs -0 grep -l -F '@oh-my-pi/' > /tmp/w7-inscope-files.txt
```

**Đo tại `47720fd`: `4114` dòng** (tài liệu ghi 4118 — sai 4, Mục 7).

⚠️ **Cổng ngoài repo G3 (`@ultraworkers` scope) chưa thoả — đã đo, xem Mục 7.1 (Q4).**

### Bước 5 — Đếm trước khi sửa

⚠️ **LỆNH TRONG TÀI LIỆU Ở BƯỚC NÀY HỎNG TRÊN macOS — đã đo:**

```
$ xargs -a /tmp/w7-inscope-files.txt grep -o -F '@oh-my-pi/' | wc -l
xargs: invalid option -- a
→ 0
```

`/usr/bin/xargs` trên macOS là BSD, từ chối cờ `-a`. **Dùng bản này thay cho bản tài liệu:**

```bash
tr '\n' '\0' < /tmp/w7-inscope-files.txt | xargs -0 grep -o -F '@oh-my-pi/' | wc -l
```

**Đo tại `47720fd`: `17252`** (tài liệu ghi 17212 — sai 40, Mục 7). Tài liệu cũng hardcode `17212` trong GATE dry-run ở Bước 6; ở cây hiện tại con số đó làm dry-run **ĐỎ GIẢ**. Dùng số đo thật của bạn.

### Bước 6 — Chạy thử KHÔNG GHI trên bản sao

```bash
rm -rf /tmp/w7-dry && mkdir -p /tmp/w7-dry
tar -cf - -T /tmp/w7-inscope-files.txt | (cd /tmp/w7-dry && tar -xf -)
( cd /tmp/w7-dry && tr '\n' '\0' < /tmp/w7-inscope-files.txt \
    | xargs -0 perl -pi -e 's{\@oh-my-pi/}{@ultraworkers/}g' ) \
  || { echo 'DRY RUN FAIL: perl không xử lý hết tập file — DỪNG'; exit 1; }
git diff --quiet || { echo 'DRY RUN FAIL: cây thật bị đụng — DỪNG'; exit 1; }
```

**Đã kiểm chứng cơ chế này chạy thật** (trên lát 50 file đầu): `tar OK` → `perl OK` → scope cũ trong bản sao về `0`.

Ba điều phải **ĐỎ ĐƯỢC** ở đây, và cả ba đều đỏ được:
1. `perl` báo lỗi trên một file → `|| { …; exit 1; }` đỏ.
2. Bản sao còn sót scope cũ → đỏ.
3. Cây thật bị đụng → `git diff --quiet` đỏ.

**KHÔNG** dùng `xargs -a` (không có trên macOS), **KHÔNG** dùng cờ `--dry-run` (không tồn tại ở BSD sed lẫn perl), **KHÔNG** để `|| true` ở cuối. Bản cũ luôn trả 0 vì cả hai vế chết trước khi gọi `perl` — người đọc thấy exit 0 và kết luận "công cụ đã kiểm chứng" trong khi không lệnh nào chạy. Đây đúng là mẫu **cổng báo xanh vì không chạy**.

Chốt **một** công cụ. Nếu `sed -i ''` (kiểu BSD) không khả dụng thì dùng `perl -pi -e`. Không trộn.

### Bước 7 — PASS DUY NHẤT

```bash
tr '\n' '\0' < /tmp/w7-inscope-files.txt \
  | xargs -0 perl -pi -e 's{\@oh-my-pi/}{@ultraworkers/}g'
echo "pass exit=$?"
```

Nếu lệnh báo lệnh sai (`xargs: invalid option`), **DỪNG NGAY**, đừng tự sửa rồi chạy lại.

Sau đó **ĐỌC LẠI 3 file bằng mắt**:
- `packages/ai/package.json:2` → phải là `"name": "@ultraworkers/pi-ai",`
- `package.json:19` → phải là `"@ultraworkers/omp-stats": "18.4.0",`
- `packages/coding-agent/src/index.ts:5` → phải là `export * as zod from "@ultraworkers/omptype/zod";`

**KHÔNG chạy pass thứ hai.** Pass thứ hai là thứ phá N17.

### Bước 7b — Đường hoàn tác (đọc TRƯỚC khi chạy pass ở Bước 7)

```bash
test -s /tmp/w7-head-baseline.txt || { echo 'BLOCKED: chưa chụp baseline ở bước 3'; exit 1; }
git diff --quiet && git diff --cached --quiet \
  || { echo 'BLOCKED: cây đang bẩn — commit hoặc stash trước khi chạy pass'; exit 1; }
# LỆNH HOÀN TÁC DUY NHẤT — dán nguyên văn vào commit message:
#   git restore --worktree --staged -- . && git clean -fd
```

Sau pass, kiểm chứng pass **ĐÚNG**, không chỉ "không còn sót":

```bash
# mọi dòng diff phải thuần túy là thay scope
git diff -U0 | grep '^[+-]' | grep -v '^[+-][+-]' \
  | grep -vE '@(oh-my-pi|ultraworkers)/' \
  && { echo 'PASS FAIL: có dòng diff không liên quan scope — hoàn tác'; exit 1; }
test "$(tr '\n' '\0' < /tmp/w7-inscope-files.txt | xargs -0 grep -o -F '@oh-my-pi/' | wc -l | tr -d ' ')" -eq 0 \
  || { echo 'PASS FAILED — cây chưa đổi hết. HOÀN TÁC: git restore --worktree --staged -- . ; rồi báo lại'; exit 1; }
test "$(git diff --name-only | wc -l | tr -d ' ')" -eq "$(wc -l < /tmp/w7-inscope-files.txt | tr -d ' ')" \
  || { echo 'PASS FAIL: số file đổi lệch với tập in-scope — hoàn tác'; exit 1; }
git diff -U0 | grep '^+' | grep -F '@ultraworkers/' | grep -F '@oh-my-pi/' \
  && { echo 'PASS FAIL: dòng lẫn cả hai scope — hoàn tác'; exit 1; }
```

⚠️ Lọc `grep -vE '@(oh-my-pi|ultraworkers)/'` ở dòng đầu **sẽ bắt dòng `:103` của `gen-npm-packages.ts`** (`git+https://github.com/can1357/oh-my-pi.git` — không có dấu `/` sau `pi`) **nếu** pass có đụng tới nó. Mẫu không khớp nên pass không đụng — nhưng dòng đó **vẫn còn scope cũ** sau W7. Cần quyết riêng (Mục 7.1).

**Người review.** Diff của W7 do đúng **một người khác** người chạy pass đọc, theo bộ lọc trên. Người review ký tên vào commit message. Không ai tự duyệt diff của pass mình chạy.

### Bước 8 — XÁC MINH 16 manifest, KHÔNG SỬA

```bash
git grep -l '"name": "@oh-my-pi/' -- '**/package.json'    # phải RỖNG
git grep -n '"name": "@ultraworkers/' -- '**/package.json' | wc -l   # = 16
git grep -n '"@ultraworkers/' -- package.json | wc -l              # = 12
git grep -n '"@oh-my-pi/' -- package.json                          # phải RỖNG
```

**16 basename sau dấu `/` phải Y NGUYÊN (đã đọc từ 16 manifest thật):**
`browser-relay · collab-web · omp-stats · omptype · pi-agent-core · pi-ai · pi-catalog · pi-coding-agent · pi-metaharness · pi-mnemopi · pi-natives · pi-tui · pi-utils · pi-wire · snapcompact · typescript-edit-benchmark`

**Bốn tên KHÔNG có mục ghim catalog — đã kiểm bằng `package.json` thật:**
`browser-relay · collab-web · pi-metaharness · typescript-edit-benchmark`
→ Đừng "sửa cho đủ 16" ở bước này. GATE ở bước 8 kiểm `= 12`, không phải `= 16`.

### Bước 9 — Tái sinh lockfile, KHÔNG sửa tay

```bash
bun install
```

Sau đó `git grep -c '@oh-my-pi/' -- bun.lock` phải trả 0 và `git diff --stat bun.lock` phải cho thấy thay đổi (đo hiện tại: 122 lượt / 106 dòng). Nếu `bun install` sửa thêm file ngoài `bun.lock`, kiểm kỹ từng file — dấu hiệu một `name` manifest lệch mục ghim catalog.

### Bước 10 — Chứng minh phân giải tới WORKSPACE, không phải registry

```bash
node -e '
const fs = require("fs");
let d;
try { d = fs.readdirSync("node_modules/@ultraworkers"); }
catch (e) { console.log("ERROR: node_modules/@ultraworkers missing —", e.code); process.exit(1); }
let bad = 0;
for (const n of d) {
  const p = fs.realpathSync("node_modules/@ultraworkers/" + n);
  if (!p.includes("/packages/")) { console.log("NOT WORKSPACE:", n, p); bad++; }
}
if (d.length === 0) { console.log("GATE F FAIL: scope dir empty"); bad++; }
process.exit(bad ? 1 : 0);
'
```

Phải **THOÁT 0 và in ra rỗng**. Dòng `NOT WORKSPACE` = package bị tải từ registry thay vì link workspace.

Hình dạng tham chiếu đã kiểm: `node_modules/@oh-my-pi/pi-agent-core ⇒ ../../packages/agent`, `omp-stats ⇒ ../../packages/stats`, `omptype ⇒ ../../packages/omptype`, … (symlink, không phải thư mục thật).

### Bước 11 — Viết test mới

`packages/coding-agent/test/npm-scope-resolution.test.ts` — **đã kiểm: file này CHƯA TỒN TẠI.** Xem Mục 5.

### Bước 12 — Chạy cổng theo đúng thứ tự ở Mục 6

Ghi kết quả **TỪNG cổng** vào commit message. Cổng bị chặn môi trường ghi `NOT RUN — environment blocked`. **TUYỆT ĐỐI không ghi `pass` cho cổng chưa chạy.**

### Bước 13 — Changelog: phần đã phát hành là BẤT BIẾN

- ❌ KHÔNG sửa / sắp xếp lại bất kỳ mục nào dưới header đã phát hành, trong bất kỳ package nào (14 file / 85 lượt đã đo).
- ✅ Khối `## [Unreleased]` ĐƯỢC thêm mục. AGENTS.md **bắt buộc** thêm cho thay đổi user-facing: đổi scope npm trên registry là user-facing rõ ràng.
- Mục bắt buộc, đặt vào `## [Unreleased]` của từng package liên quan, mỗi dòng một câu: *các package đã đăng ký trong `catalog` đổi tên phát hành từ `@oh-my-pi/X` sang `@ultraworkers/X`, basename sau dấu `/` giữ nguyên (N17).*
- Đừng đặt mục đó trong phần đã phát hành.

---

## 4. Vì sao pass phải là MỘT lệnh, không phải nhiều

Mẫu `s{\@oh-my-pi/}{@ultraworkers/}g` **không** chạm:
- dạng trần `"oh-my-pi"` (W8a sở hữu — `legacy-pi-compat.ts:802`, `zai.ts:25`, `exa.ts:26`, `oauth-flow.ts:629`, `telemetry-export-otlp.ts:51`, `gallery-fixtures/segments.ts:33,164`, `docs/provider-quirks.md`) — cần dấu `/` ở cuối mẫu mà các chuỗi này không có;
- `@mariozechner/*`, `@earendil-works/*`, `@sinclair/typebox` — không khớp về mặt cấu trúc;
- `node_modules/` — `git ls-files` không theo dõi;
- `git+https://github.com/can1357/oh-my-pi.git` — không có dấu `/` ngay sau `pi` ⚠️ (xem Mục 7.1).

Mẫu **có** chạm: mọi `name`, mọi mục dependencies/peerDependencies/devDependencies/optionalDependencies, mọi mục ghim catalog, mọi import, mọi chuỗi trong thông báo lỗi, mọi dòng `.nix`/`.sh`/`.ps1`/`.dockerfile`.

---

## 5. Hợp đồng test

Một file duy nhất: **`packages/coding-agent/test/npm-scope-resolution.test.ts`** (đã kiểm: **chưa tồn tại**). Ba invariant, mỗi cái một test.

**Nếu hồi quy, người dùng thấy gì?** Người dùng cài sạch từ tarball hoặc registry, `bun install` kéo package từ registry thay vì link workspace, mọi import nội bộ hỏng — **typecheck xanh trên máy kỹ sư, bản cài của người dùng vỡ**. Ba test chặn đúng ba đường thoát đó.

| # | invariant | cách khẳng định | lỗi bị chặn | vì sao typecheck KHÔNG bắt |
| --- | --- | --- | --- | --- |
| 1 | Phân giải tới workspace | `import.meta.resolve("@ultraworkers/pi-utils")` → assert đường dẫn nằm dưới `<repo>/packages/` | manifest `name` đã đổi nhưng `exports` map hoặc mục ghim catalog lệch → bản cài sạch kéo từ registry | `node_modules` hiện tại là symlink hoist nên typecheck xanh ngay cả khi `name` sai |
| 2 | Manifest khớp mục ghim catalog | duyệt `packages/*/package.json` + `package.json` gốc lúc chạy; so **tập** tên trong `workspaces.catalog` với **tập** `name` | một manifest đổi scope còn mục ghim không đổi (hoặc ngược lại) → lockfile ghi sai, bản cài sạch hỏng | quan hệ giữa hai file, không phải so một hằng số với chính nó |
| 3 | Basename còn host bundle phân giải được | mọi basename trong `PI_PACKAGE_NAMES` (`legacy-pi-compat.ts:805`) còn tồn tại là phần sau `/` của một `name` workspace; `PI_PACKAGE_ALTERNATION` (`:808`) khớp `name` đó dưới scope mới | một basename bị đổi theo trong lúc đổi scope — rủi ro riêng của W7 là nhóm 4 tên không mang `pi` lẫn `omp` (`browser-relay`, `collab-web`, `snapcompact`, `typescript-edit-benchmark`); đổi chúng phá `PI_PACKAGE_NAMES`, khiến `LEGACY_PI_SPECIFIER_FILTER` (`:837`) không khớp specifier extension, và extension cũ âm thầm nạp bản native trùng lặp từ npm thay vì bản bundle trong host | quan hệ giữa bảng phân giải và manifest |

**Nếu W2 đã có test phủ `PI_PACKAGE_NAMES` → bỏ invariant 3 khỏi W7 và ghi "thuộc W2".** Không lặp test của W2.

**KHÔNG viết:**
- test source-grep (đọc file rồi `toContain` vào text) — bị AGENTS.md cấm;
- test khẳng định chuỗi scope là hằng số;
- `expect(true).toBe(true)`, `not.toThrow()` trần, kiểm "non-empty";
- `mock.module()` (rò module registry toàn cục — AGENTS.md cấm).

**Ranh giới quan trọng:** đọc một manifest rồi `JSON.parse` nó là đọc **DỮ LIỆU**, không phải source-grep. Cái bị cấm là `expect(rawText).toContain("…")` trên text thô của một file implementation.

---

## 6. Cổng

Chạy theo đúng thứ tự. **Dừng ngay khi cổng đầu tiên đỏ.**

### GATE 0 — điều kiện mở

```bash
test -f scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list.txt missing — W7 is BLOCKED'; exit 1; }
grep -qE '^const CANONICAL_PI_SCOPE = "@ultraworkers";' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts \
  || { echo 'GATE 0 FAIL: W2 not landed (CANONICAL_PI_SCOPE vẫn trỏ scope cũ)'; exit 1; }
grep -qE 'PI_SCOPE_ALIASES = \[.*"oh-my-pi"' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts \
  || { echo 'GATE 0 FAIL: PI_SCOPE_ALIASES đã mất scope cũ — phá extension tương thích'; exit 1; }
```

**Cổng này ĐỎ ĐƯỢC không? CÓ — và đã chạy thật, cả ba nhánh đều phân biệt được:**

| nhánh | trạng thái tại `47720fd` | kết quả |
| --- | --- | --- |
| keep-list | `ls scripts/rename/` → `No such file or directory`, exit 2 | **ĐỎ** (đúng — W7 bị BLOCKED) |
| `CANONICAL_PI_SCOPE` | `:796` = `"@oh-my-pi"` | **ĐỎ** (đúng — W2 chưa merge) |
| `PI_SCOPE_ALIASES` | `:802` giữ `"oh-my-pi"` | **XANH** (đúng — cơ chế tương thích còn nguyên) |

**Phân biệt được:** không có keep-list là **BLOCKED**, không phải "chưa xong".

Bản cũ dùng `git grep -q 'CANONICAL_PI_SCOPE' <path>` — kiểm **SỰ TỒN TẠI của tên hằng**, không kiểm **GIÁ TRỊ**. Đã chạy: bản cũ trả **exit 0 (XANH)** ở `HEAD` hiện tại, tức đúng trạng thái GATE 0 sinh ra để chặn. Cổng cũ **xanh khi W2 chưa merge VÀ xanh khi W2 đã merge** → không chặn được Sai lầm 1.

Dùng `grep` trên file thay vì `git grep <path>` để không phụ thuộc cách `git grep` hiểu tham số thiếu `--`.

### GATE A — residue trong tập in-scope

```bash
tr '\n' '\0' < /tmp/w7-inscope-files.txt | xargs -0 grep -l -F '@oh-my-pi/' \
  | grep . && { echo 'GATE A FAIL: leftover scope in in-scope set'; exit 1; }
```

**ĐỎ ĐƯỢC? CÓ — đã kiểm chứng bằng bộ dữ liệu thật, cả hai chiều:**

| tập | kết quả |
| --- | --- |
| 2 file, 1 file còn scope cũ | `grep -l` in `a.txt` → gate **ĐỎ** ✅ |
| cùng 2 file, đã sạch | `grep -l` in rỗng → gate **XANH** ✅ |

**Hai lỗi của bản cũ đã đo và đã sửa:**
1. `xargs -a` là cờ GNU — BSD xargs từ chối (`xargs: invalid option -- a`, exit 1), KHÔNG chạy grep, in 0 dòng; `wc -l` = 0 ⇒ `test 0 -eq 0` ĐÚNG ⇒ **cổng xanh trên cây bẩn**.
2. Ngay cả khi bỏ `xargs -a`, `grep -c` in **MỘT DÒNG CHO MỖI FILE** kể cả file sạch (`clean1.txt:0`). **Đã đo trên cây sạch: `wc -l` = 2** ⇒ `test … -eq 0` luôn FALSE ⇒ **cổng đỏ trên cây hoàn toàn sạch**. Bản cũ đỏ khi sạch và xanh khi bẩn.

**Phân biệt được:** đỏ ⇒ pass chưa phủ hết tập, HOẶC danh sách in-scope đã cũ. Cả hai là lỗi thật.

### GATE A2 — tổng lượt scope cũ toàn repo không đổi hướng

```bash
test "$(git grep -o -F '@oh-my-pi/' -- . | wc -l | tr -d ' ')" -eq "$(tr -d ' ' < /tmp/w7-all-hits-baseline.txt)" \
  || { echo 'GATE A2 FAIL: tổng lượt scope đổi hướng — hoàn tác'; exit 1; }
```

**ĐỎ ĐƯỢC? CÓ** — so số với baseline, lệch là đỏ. Cổng này soi thứ GATE A không thấy: **file NGOÀI tập in-scope bị thêm scope cũ**.
⚠️ Bắt buộc phải dùng `/tmp/w7-all-hits-baseline.txt` từ Bước 3; tài liệu viết `cat … | tr -d ' '` — chạy được, chỉ là thừa một `cat`.

### GATE B — N11 changelog không bị đụng

```bash
extract_released() { awk '/^## \[Unreleased\]/{u=1} /^## \[/{if(u&&$0!~/Unreleased/){u=0}} !u{print}' "$1"; }
for f in $(git ls-files 'packages/*/CHANGELOG.md'); do
  printf '%s:%s\n' "$f" "$(extract_released "$f" | grep -c -o -F '@oh-my-pi/' || true)"
done > /tmp/w7-changelog-after.txt
diff /tmp/w7-changelog-baseline.txt /tmp/w7-changelog-after.txt \
  || { echo 'GATE B FAIL: phần CHANGELOG đã phát hành bị viết lại — released sections are immutable'; exit 1; }
```

**ĐỎ ĐƯỢC? CÓ** — `diff` trên hai file baseline. Đã chạy phần sinh baseline: **14 file / 85 lượt**.

Đây là cổng quan trọng nhất của W7: **GATE A KHÔNG bắt được** chuyện pass đã quét changelog (changelog vốn nằm ngoài tập in-scope nên Gate A vẫn xanh), nhưng nếu ai đó lỡ xoá exclusion thì Gate B đỏ. Hai cổng soi hai lỗi khác nhau.

Cổng cố tình chỉ soi **phần đã phát hành**, vì AGENTS.md nói "Never modify already-released sections" — nếu nó so toàn bộ file thì chính mục `[Unreleased]` mà AGENTS.md bắt buộc thêm cho W7 sẽ làm cổng đỏ.

### GATE C — cross-check dạng trần

```bash
git grep -lE '"oh-my-pi"' -- . > /tmp/w7-bare-after.txt
diff /tmp/w7-bare-baseline.txt /tmp/w7-bare-after.txt \
  || { echo 'GATE C FAIL: bare form drifted — W7 must not touch it (W8 owns it)'; exit 1; }
```

**ĐỎ ĐƯỢC? CÓ** — `diff` danh sách file. Baseline đã đo: **16 file**.
Grep sạch trên dạng có `/` KHÔNG chứng minh gì về dạng trần — đây là cổng bù cho đúng cái lỗ đó. Bàn giao danh sách này cho W8a.

### GATE D — typecheck + banner

```bash
out="$(bun run check:ts 2>&1)"; rc=$?
printf '%s\n' "$out" | tail -20
test $rc -eq 0                                             || { echo "GATE D FAIL: check:ts exit $rc"; exit 1; }
printf '%s\n' "$out" | grep -q '@ultraworkers/.*check:types' || { echo 'GATE D FAIL: banner chưa đổi scope'; exit 1; }
! printf '%s\n' "$out" | grep -q '@oh-my-pi/.*check:types'   || { echo 'GATE D FAIL: banner còn scope cũ'; exit 1; }
echo 'GATE D PASS'
```

**ĐỎ ĐƯỢC? CÓ** — ba điều kiện, mỗi cái một `exit 1`, trên **cùng một** lần chạy output.

Đã kiểm: `check:ts` = `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`; có **đúng 16** workspace có `check:types` (đếm bằng vòng `for p in packages/*/package.json`): `agent ai browser-relay catalog coding-agent collab-web metaharness mnemopi natives omptype snapcompact stats tui typescript-edit-benchmark utils wire`. Banner in ra `<scope>/<name>:check:types`.

**Phân biệt được:** "scope đã đổi thật" (banner đổi) vs "check pass vì `node_modules` cũ vẫn còn" (banner không đổi).

Bản cũ chạy `check:ts` **ba lần** và dòng đầu không có `|| { …; exit 1; }` nên hai lệnh grep vẫn chạy tiếp sau khi `check:ts` in lỗi — trái với "dừng ngay khi cổng đầu tiên đỏ". Và ba lần là ba lần lint+typecheck toàn repo.

### GATE E — bộ test TS

```bash
bun run test:ts
```

⚠️ **TÀI LIỆU NÓI CỔNG NÀY BỊ CHẶN MÔI TRƯỜNG — ĐIỀU ĐÓ KHÔNG CÒN ĐÚNG. ĐÃ ĐO:**

| lệnh | kết quả đo tại `47720fd` |
| --- | --- |
| `ls -la packages/natives/native/*.node` | `packages/natives/native/pi_natives.darwin-arm64.node` — **185 MB, đã build** |
| `which ninja cmake` | `/opt/homebrew/bin/ninja`, `/opt/homebrew/bin/cmake` — **cả hai đã cài** |
| `bun test packages/omptype/test/` | **`1056 pass / 0 fail`** trong 647 ms |

Addon **đã build** (commit `47720fd` — *"docs(plans): the native addon is built, so 'bun test is blocked' is false"* — đã sửa đúng điều này ở M1/M1B/M2/M3/M4, nhưng **chưa sửa ở M5**).

**ĐỎ ĐƯỢC? CÓ** — `test:ts` = `bun scripts/ci-test-ts.ts local-ts`, đỏ khi có test hỏng.
**Không được ghi `NOT RUN — environment blocked` cho cổng này ở máy này.** Chạy nó.

Ghi chú: script build của `packages/natives` là `bun ../../scripts/bazel-natives.ts host --dest native` (Bazel), không phải CMake — khác với mô tả trong tài liệu. Nhưng ở `47720fd` cả hai đều đã có sẵn nên không còn là tiền đề.

### GATE F — mọi package dưới scope mới phải là symlink workspace

Script `node -e` ở **Bước 10** (dùng chung, có thêm nhánh `d.length === 0`).

**ĐỎ ĐƯỢC? CÓ — đã chạy thật, phân biệt được cả ba trạng thái:**

| trạng thái | kết quả đo |
| --- | --- |
| `node_modules/@ultraworkers` chưa tồn tại | in `GATE F FAIL: node_modules/@ultraworkers missing — ENOENT`, **exit 1** ✅ |
| scope dir đầy symlink workspace (chạy cùng script trên `@oh-my-pi`) | in **rỗng**, **exit 0** ✅ |
| package bị tải từ registry | in `NOT WORKSPACE: <n> <path>`, **exit 1** ✅ |

Bản cũ viết `node -e '…' | grep . && { …; exit 1; }` và **không bao giờ xanh**: `grep .` trả 1 khi producer không in dòng nào, `&&` trả chính 1 đó — nên cả trường hợp ĐÚNG cũng đỏ, còn ENOENT cũng đỏ nhưng không in thông điệp. Bản mới để chính script node quyết định exit code.

### Kết luận về khả năng đỏ của cổng

| cổng | đỏ được? | bằng cách nào | đã chạy thật? |
| --- | --- | --- | --- |
| GATE 0 | ✅ | 3 nhánh `exit 1`, phân biệt BLOCKED / W2-chưa-merge / alias-mất | ✅ cả 3 |
| GATE A | ✅ | `grep -l \| grep .` trên tập thật | ✅ cả 2 chiều |
| GATE A2 | ✅ | so tổng lượt với baseline | ⬜ chưa chạy (cần sau pass) |
| GATE B | ✅ | `diff` hai file baseline | ✅ phần sinh baseline |
| GATE C | ✅ | `diff` danh sách 16 file | ✅ phần sinh baseline |
| GATE D | ✅ | 3 `exit 1` trên một lần chạy output | ⬜ chưa chạy (cần sau pass) |
| GATE E | ✅ | `bun run test:ts` đỏ khi test hỏng | ✅ **không còn bị chặn** |
| GATE F | ✅ | chính script node quyết exit code | ✅ cả 3 trạng thái |

**Không cổng nào là cổng luôn xanh.** Cổng luôn xanh tệ hơn không có cổng, vì nó tạo cảm giác an toàn giả.

---

## 7. Sai lệch đã đo so với tài liệu (GHI RA, KHÔNG sửa tài liệu)

| # | tài liệu nói | cây thật tại `47720fd` | mức độ |
| --- | --- | --- | --- |
| 1 | `HEAD 1454dc0` | `HEAD 47720fd`. `84cbac9`, `106eb3e` còn tồn tại; `5873776` vẫn **không tồn tại** (`fatal: Not a valid object name`) | ảnh hưởng mọi con số dưới đây |
| 2 | tập in-scope **4118** file | **4114** | −4 |
| 3 | tập in-scope **17212** lượt | **17252** | +40 |
| 4 | nhóm còn lại **4100** file / **17000** lượt | **4096** file / **17040** lượt | −4 / +40 |
| 5 | phân bố 4005 `.ts`, 66 `.md`, 12 `.tsx`, 1 `.js` | `3999 .ts · 70 .md · 9 .tsx · 4 .py · 2 .sh · 2 .rs · 2 .jsonl · 2 .json · 2 .js · 1 .yml · 1 .ps1 · 1 .nix · 1 .dockerfile` = 4096 | phân bố đã dời |
| 6 | 12 mục ghim đều pin **`18.3.3`** | tất cả pin **`18.4.0`** | con số trong bảng điểm sửa |
| 7 | changelog baseline **13** file / 85 lượt | **14** file / 85 lượt (`browser-relay/CHANGELOG.md` có 0 lượt) | số file; con số 85 vẫn đúng |
| 8 | dạng trần nằm ở 16 file, "file thứ 16 là `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`" | vẫn 16 file nhưng thành phần đã đổi: nay gồm `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, **`MILESTONE_5_EXECUTION_PLAN.md`**, **`RESEARCH_DSH_OMO_2026-09-28.md`**, **`RESEARCH_FINDINGS_2026-09-28.md`** + 12 file nguồn/test | Gate C là `diff` nên vẫn chạy đúng; nhưng W8a đọc "15 file" của tài liệu sẽ đếm sai |
| 9 | GATE E bị chặn môi trường vì addon chưa build | addon **đã build** (185 MB), `ninja` + `cmake` đã cài, `bun test packages/omptype/test/` → **1056 pass / 0 fail** | **GATE E phải chạy thật** |
| 10 | build cần `ninja` qua CMake | script build của `packages/natives` là `bun ../../scripts/bazel-natives.ts host --dest native` (Bazel) | mô tả sai; vô hại vì cả hai tool đã có |
| 11 | **Q1** — "sáu leaf package đã publish dưới scope mới chưa?" | **ĐÃ ĐO, CÂU TRẢ LỜI LÀ CHƯA:**<br>`npm view @ultraworkers/pi-natives-linux-x64` → `404 Not Found`<br>`npm view @oh-my-pi/pi-natives-linux-x64` → **`18.4.2`** | **chặn merge** |
| 12 | **Q4** — scope `@ultraworkers` đã được sở hữu chưa? | **CHƯA:** `npm view @ultraworkers/pi-ai` → `404`; `@ultraworkers/omp-stats` → `404` | **chặn toàn bộ W7** |
| 13 | không nhắc `packages/natives/scripts/gen-npm-packages.ts` | file này **có trong tập in-scope** (dòng 3546 của `/tmp/w7-inscope-files.txt`) và `:93` ghi cứng `name: \`@oh-my-pi/pi-natives-${tag}\`` (2 lượt). Pass **SẼ** đổi nó. | đây là **cần trình bày duy nhất** cho Q1: cơ chế publish leaf package |
| 14 | `:103`/`:113` của `gen-npm-packages.ts` | `url: "git+https://github.com/can1357/oh-my-pi.git"` — **không khớp mẫu** (thiếu dấu `/` sau `pi`) ⇒ pass không đụng, scope cũ **còn sót** | cần quyết: để lại hay sửa tay ngoài pass (sửa tay sẽ vi phạm lọc ở Bước 7b) |
| 15 | Bước 5 đưa lệnh `xargs -a …` | **lệnh hỏng trên macOS** — đã đo: `xargs: invalid option -- a` → 0. Bước 6 hardcode `17212` cũng làm dry-run **ĐỎ GIẢ** ở cây hiện tại | dùng bản `tr \| xargs -0` ở Mục 3 |
| 16 | Bước 4 kỳ vọng 4118, Bước 5 kỳ vọng 17212, GATE dry-run 17212 | con số cũ ⇒ dừng sai | dùng số đo của bạn |

### 7.1 Ba câu hỏi còn treo, và trạng thái đã đo

**Q1 — leaf package `@oh-my-pi/pi-natives-<tag>` đã publish dưới scope mới chưa?**
→ **CHƯA. Đã đo: `@ultraworkers/pi-natives-linux-x64` → 404; `@oh-my-pi/pi-natives-linux-x64` → 18.4.2.**

Hệ quả trực tiếp: nếu chạy pass hôm nay, `loader-state.js:70` sẽ trở thành
`require_.resolve('@ultraworkers/pi-natives-${platformTag}/package.json')` — **nguồn scope đó chưa có trên registry**. `require_.resolve` ném → `catch { return null }` (đã đọc, `loader-state.js:67-73`) → loader rơi im lặng sang nhánh dự phòng. **Không lỗi nào được ném, không test nào đỏ.**

Ba lựa chọn, chọn một trước khi merge:
- **(i)** Để `loader-state.js:70` **KHÔNG** đổi ở W7 (thêm vào `do_not_rename`), đổi scope ở một work item sau, sau khi đã release một bản publish sáu leaf package dưới scope mới.
- **(ii)** W7 đi kèm một bước **publish sáu leaf package dưới scope mới** (`gen:npm` tại `packages/natives/package.json:42` + `release_native_leaves` tại `ci.yml:1039`). Nhưng kể cả khi đó, **giữa thời điểm merge W7 và lần release đầu tiên** vẫn có cửa sổ hỏng.
- **(iii)** Sửa `resolveLeafPackageDir` để **thử scope mới, rồi fallback scope cũ** — thay đổi hành vi, cần test riêng, không thuộc hình dạng "một pass cơ học" của W7.

Lưu ý: `gen-npm-packages.ts:93` **đã nằm trong tập in-scope**, nên nếu chọn (i) thì **phải loại nó ra khỏi tập** — nếu không, pass vẫn đổi tên package publish trong khi loader không đổi, và lần release tới sẽ phát hành dưới scope mới trong khi loader vẫn tìm scope cũ. **Đây là mâu thuẫn nội tại của lựa chọn (i) nếu không loại file.**

**Q2 — hai transcript `.jsonl` là lịch sử hay fixture?**
Đã xác nhận tồn tại và số lượt: `before-compaction.jsonl` **649** (132 dòng), `large-session.jsonl` **161** (49 dòng), tổng **810**. Vẫn cần một người quyết. Nếu "giữ": thêm `':(exclude)packages/coding-agent/test/fixtures/*.jsonl'` vào Bước 4 và đếm lại (**4112 file / 16442 lượt**). Nếu "sửa": không thêm exclude, pass phủ cả hai, GATE A/B/C không ảnh hưởng.

**Q3/Q4** — Q4 đã đo ở trên: scope `@ultraworkers` **chưa tồn tại trên npm**. Đây là cổng G3 của plan §8, nằm NGOÀI repo. Chưa thoả ⇒ toàn bộ W7 là việc viết 17252 lượt mà chưa có chỗ để phát hành.

---

## 8. Cạm bẫy riêng của W7

1. **Chạy trước W2.** Phá canonicaliser extension một cách im lặng. Chặn cứng ở GATE 0 — và GATE 0 **đang đỏ** tại `47720fd`.
2. **`loader-state.js:70` là thất bại im lặng đắt nhất.** Đã đo: scope đích **404 trên registry**. `catch { return null }` nuốt lỗi, không test nào đỏ, typecheck vẫn xanh. Xem Q1.
3. **Bỏ sót mục phụ thuộc trong manifest.** 78 lượt trong 16 manifest + 12 ở ghim, không chỉ 16 dòng `name`. Lỗi này typecheck **ĐƯỢC** với `node_modules` hiện tại (symlink hoist) và chỉ hỏng trên bản cài sạch.
4. **Tự sửa `bun.lock`.** Phải chạy `bun install`.
5. **Để W7 tự quyết basename.** 16 basename tách ba nhóm; bốn tên nhóm 3 (`browser-relay`, `collab-web`, `snapcompact`, `typescript-edit-benchmark`) dễ rơi khỏi danh sách vì không mang chữ `pi` lẫn `omp`. Đổi chúng phá `PI_PACKAGE_NAMES` (`:805`) → `LEGACY_PI_SPECIFIER_FILTER` (`:837`) không khớp → extension cũ âm thầm nạp bản native trùng lặp từ npm thay vì bản bundle trong host.
6. **Cho mẫu toàn-repo quét CHANGELOG.** 14 file / 85 lượt phần đã phát hành — AGENTS.md nói bất biến. Gate B chống đúng cái này.
7. **Nhóm không ai liệt kê.** `.lavish-wip/specs/*.spec.json`, các tài liệu kế hoạch, `RESEARCH_*.md`, và 2 transcript `.jsonl`. Bước 4 đã loại trừ 4 mẫu đầu; **2 transcript phải quyết trước (Q2)**.
8. **Loại nhầm `.omp/skills/**`.** N14 khoá **TÊN THƯ MỤC** `.omp`, không khoá nội dung. Ba file đó là code thật với import statement — đã đọc `probe.ts:28-31`, `probe-builtin.ts:21-23`. Loại chúng làm skill vỡ.
9. **Để cổng "test pass" xanh trong khi `bun test` không chạy.** Ở máy này addon **đã build** nên cổng chạy thật. Nhưng nếu gặp máy chưa build: chặn là **chọn lọc theo bề mặt import, không phải toàn cục** — chỉ file import `pi_natives` mới đỏ. Ghi `NOT RUN — environment blocked` **chỉ khi** build thực sự chưa exit 0. Tuyệt đối không ghi `pass` cho cổng chưa chạy.
10. **Chạy pass thứ hai để "sửa ngược".** Pass `perl -pi` trên 4114 file không hoàn tác được bằng trực giác. Mốc hoàn tác là `git restore --worktree --staged -- . && git clean -fd` dán nguyên văn vào commit message.
11. **Tin số của tài liệu.** 4118/17212/17000/13 đều đã cũ. Chạy lại và ghi số thật vào commit message. Đặc biệt **đừng dùng `xargs -a`** — nó không tồn tại trên `/usr/bin/xargs` của macOS và sẽ âm thầm làm cổng xanh.

---

## 9. Trạng thái tại lúc viết phiếu

| việc | trạng thái |
| --- | --- |
| GATE 0 — điều kiện mở | 🔴 **ĐỎ** — `scripts/rename/` không tồn tại; `CANONICAL_PI_SCOPE` ở `:796` vẫn `"@oh-my-pi"` |
| Cổng ngoài repo G3 (Q4) | 🔴 **ĐỎ** — scope `@ultraworkers` 404 trên npm |
| Q1 — leaf package dưới scope mới | 🔴 **CHƯA** — `@ultraworkers/pi-natives-linux-x64` 404; bản cũ `18.4.2` |
| Q2 — 2 transcript `.jsonl` | 🟡 **CẦN MỘT NGƯỜI QUYẾT** — 810 lượt đã đếm |
| GATE E — môi trường | 🟢 **ĐÃ SẴN SÀN** — addon 185 MB đã build; `bun test packages/omptype/test/` → 1056 pass / 0 fail |
| Số đo tập in-scope | ✅ **4114 file / 17252 lượt** |
| File test `npm-scope-resolution.test.ts` | ⬜ **CHƯA TỒN TẠI** — phải tạo ở Bước 11 |

**Kết luận: W7 KHÔNG nên chạy ở `47720fd`.** Ba chặn đỏ độc lập: keep-list chưa có, W2 chưa merge, scope `@ultraworkers` chưa tồn tại trên registry — và Q1 đã được trả lời bằng đo thật là "chưa", nên `loader-state.js:70` sẽ hỏng im lặng nếu đổi.
