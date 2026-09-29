# PHIẾU TRIỂN KHAI — W13 (Quét tài liệu — changelog chỉ khi được yêu cầu)

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md` — mục `## W13.` ở dòng **3869–4123**.
**Cây:** `/Users/tranquangdang21/Projects/ultraworkers` (chính là `omp`). Không work item nào của W13 trỏ sang `pi-ref` / `codex-ref` / `claude-code-ref` — toàn bộ bề mặt là markdown + một script Bun trong chính repo này.
**Đo đạc:** HEAD `47720fd`, mốc `84cbac9` (cả hai đều tồn tại: `git cat-file -t 84cbac9` → `commit`), macOS, 2026-09-29.

---

## 1. Cái gì thay đổi, quan sát được

Sau W13, không còn tên cũ nào đứng riêng trong văn xuôi `.md` ngoài một danh sách allow-list có lý do đi kèm; bảng biến môi trường có cột `New name` trên **cả 29 bảng** nói rõ `PI_*`/`OMP_*` vẫn chạy vĩnh viễn và chỉ `PI_CONFIG_DIR` có tên mới thắng; và `bun scripts/rename/check-docs-rename.ts` **thoát 1** ngay từ trạng thái chưa làm gì — cổng này phải đỏ trước, xanh sau, chứ không phải xanh sẵn.

---

## 2. Bảng điểm sửa

Cột TRƯỚC trích nguyên văn từ file thật, đọc bằng `sed -n` ở phần VIỆC 1 bên dưới.

| đường/dẫn | symbol / hàm | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `scripts/rename/docs-legacy-allowlist.txt` | — (tạo mới) | *không tồn tại* (`ls scripts/rename/` → `No such file or directory`) | text, 1 đường dẫn/dòng, `<path>  # <lý do>`, `LC_ALL=C sort`, **≤ 25 dòng** |
| `scripts/rename/check-docs-rename.ts` | — (tạo mới) | *không tồn tại* | Bun script, đọc allow-list (cắt `#`), 3 quy tắc A/B/C, `process.exit(1)` khi có vi phạm |
| `docs/environment-variables.md:25` | đoạn mô tả cơ chế mirror | `Additional rule inside each .env file: every `OMP_*` key is mirrored to its `PI_*` alias, and that mirrored value replaces a same-file `PI_*` value. This mirroring applies to parsed dotenv files, not arbitrary variables inherited from the parent process.` | giữ nguyên câu này, **nối thêm**: mirror `OMP_*`→`PI_*` vẫn chạy (không phải branding), và `ULTRAWORKERS_CONFIG_DIR` thắng `PI_CONFIG_DIR` |
| `docs/environment-variables.md` × 29 bảng | header cột `Variable` | `\| Variable                        \| Used for  ... \| Required when  ... \| Notes / precedence  ... \|` (4 cột, dòng 37)<br>`\| Variable                    \| Value type    ... \| Behavior  ... \|` (2 cột, dòng 191)<br>`\| Variable                           \| Setting overridden  ... \| Accepted value / built-in default  ... \|` (3 cột, dòng 490) | thêm cột thứ hai tên `New name` vào **mọi** header, kể cả `Variable group` ở dòng 618 |
| `docs/environment-variables.md` 100 dòng `PI_*`/`OMP_*` | giá trị cột `New name` | hàng hiện tại, ví dụ dòng 431: `` \| `PI_SMOL_MODEL` \| Ephemeral model-role override for `smol` (CLI `--smol` takes precedence) \| `` | `` \| `PI_SMOL_MODEL` \| `PI_SMOL_MODEL` \| Ephemeral model-role override... \| `` — 99 dòng ghi lại chính tên cũ; **chỉ** `PI_CONFIG_DIR` (dòng 523) ghi `ULTRAWORKERS_CONFIG_DIR` |
| `README.md` (42 lượt / 36 dòng) | văn xuôi thương hiệu | dòng 2 `alt="omp"`, dòng 98 `` `omp` generates its own completion scripts ``, dòng 102 `eval "$(omp completions zsh)"`, dòng 108 `omp completions fish > ~/.config/fish/completions/omp.fish` | sửa tay từng lượt; ảnh hero và câu chào giữ nguyên cấu trúc, chỉ đổi token hiển thị |
| `AGENTS.md` (3 lượt / 9 dòng `@oh-my-pi/`) | văn xuôi + quy tắc | dòng 19 `` (`omp stats`) ``, dòng 227 `` `~/.omp/logs/omp.YYYY-MM-DD.log` ``, dòng 62 `omp --smoke-test`; dòng 337-338 `https://github.com/can1357/oh-my-pi/issues/123` | sửa **có hỏi trước** — file này đổi hành vi làm việc, không chỉ tài liệu |
| `CONTRIBUTING.md:1` | tiêu đề | `# Contributing to omp` | `# Contributing to <tên mới>` — 1 dòng duy nhất |
| `CONTRIBUTING.md:84` | attribution pháp lý | `A contribution intentionally submitted for inclusion in OMP is licensed under` | **giữ nguyên** (viết hoa, không khớp biểu thức; là tên pháp lý) |
| `LICENSE:3-5` | copyright | `Copyright (c) 2025 Mario Zechner` / `Copyright (c) 2025-2026 Can Bölük` / `Copyright (c) 2026 Stencil Labs, Inc.` | **không đổi** |
| `packages/*/CHANGELOG.md` (14 file) | — | 13 chứa `@oh-my-pi/`, 11 chứa token `omp` | **không đổi dòng nào** |
| `docs/extension-loading.md:231` | — | xem bước 5 | **không chạm** — thuộc W8a |
| `docs/porting-from-pi-mono.md:46-51` | — | xem bước 5 | **không chạm** — thuộc W8a |
| 13 file `.md` chứa URL `github.com/can1357/oh-my-pi` | — | `https://github.com/can1357/oh-my-pi/blob/main/assets/hero.png?raw=true` (README:2) | **chưa quyết** — hỏi người dùng (mục 9) |

### Danh sách đầy đủ 29 header bảng (đã đọc, không đoán)

Dòng trong `docs/environment-variables.md`: 37, 117, 128, 191, 203, 220, 232, 244, 260, 270, 281, 291, 313, 335, 342, 352, 389, 395, 403, 413, 428, 490, 519, 539, 560, 576, 593, 605, **618 (`Variable group`)**.

Bảy kiểu cột hai: `Default / behavior` (11 bảng), `Behavior` (10), `Used for` (4), `Value type` (1), `Used by` (1), `Setting overridden` (1), `Required?` (1). Số cột: 23 bảng 2 cột, 4 bảng 3 cột, 2 bảng 4 cột.

---

## 3. Các bước — mỗi bước có neo đã kiểm

### Bước 0 — An toàn (không có neo, nhưng bắt buộc)

Làm trên nhánh riêng. Commit allow-list **trước** khi sửa file tài liệu nào. Mỗi ~10 file thì commit một lần. Quay lại bằng `git checkout HEAD -- <path>` cho từng file.

### Bước 1 — Điều kiện mở: đo lại, đừng tin số của tài liệu

Ba điều kiện, kèm lệnh và **kết quả đo được hôm nay**:

```bash
# (a) W4 đã land chưa?
git grep -c 'ULTRAWORKERS_CONFIG_DIR' -- '*.ts'; echo "exit=$?"
# → không in gì, exit=1  ⇒ W4 CHƯA land. Cột `New name` sẽ có đúng 1 giá trị khác tên cũ.

# (b) Gate 0 của W7/W8b đã có chưa?
ls scripts/rename/keep-list.txt scripts/rename/disposition.tsv
# → `ls: scripts/rename/: No such file or directory`  ⇒ CHƯA có.

# (c) W8a đã viết lại hai tài liệu hợp đồng chưa?
git log --oneline -1 -- docs/extension-loading.md
# → ecd516f feat: initial publish — oh-my-pi 18.3.3 under ultrabuilders/ultraworkers
#   (một commit duy nhất, không phải W8a)  ⇒ W8a CHƯA chạy. W13 không được chạm hai dòng đó.
```

**Nếu chưa đạt cả ba: dừng, nói rõ điều kiện nào chưa đạt.** Điều kiện (a) chưa đạt thì phần nặng nhất của W13 (cột tương thích) không có nội dung.

### Bước 2 — Chốt allow-list TRƯỚC, commit nó

Đo lại bề mặt tại thời điểm chạy. **Con số trong tài liệu đã lỗi thời** — xem mục 6 mục 3.

```bash
P='(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)'
EXC=":(exclude)packages/*/CHANGELOG.md"
EXC="$EXC :(exclude)MILESTONE_*_EXECUTION_PLAN.md"
EXC="$EXC :(exclude)COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md"
EXC="$EXC :(exclude)CROSS_REPO_COMPARISON.md"
EXC="$EXC :(exclude)PACKAGE_REORGANIZATION_PLAN.md"
EXC="$EXC :(exclude)RESEARCH_*.md"
EXC="$EXC :(exclude)SENPI_FINDINGS.md"
git grep -lE "$P" "$BASE" -- '*.md' $EXC | LC_ALL=C sort > /tmp/w13-base.txt
wc -l < /tmp/w13-base.txt     # 93 tại 84cbac9
```

Sau khi thêm 5 exclusion mới, tập base là **93 file / 549 lượt** — tái lập được chính xác, tôi đã chạy lại.

**13 dòng allow-list bắt buộc** (tài liệu chỉ nêu 2; xem mục 6 mục 1). Mỗi dòng phải có `# lý do`:

```
.omp/skills/semantic-compression/SKILL.md                  # runtime asset — prompt corpus dưới thư mục dot
packages/coding-agent/src/cleanse/prompts/discovery.md     # import theo đường dẫn — cleanse/agent.ts:16
packages/coding-agent/src/commit/agentic/prompts/system.md # import theo đường dẫn — commit/agentic/agent.ts:16
packages/coding-agent/src/live/prompts/live-instructions.md# import theo đường dẫn — live/controller.ts:10
packages/coding-agent/src/prompts/internal-urls/cfg.md     # import theo đường dẫn — cfg-protocol.ts:26
packages/coding-agent/src/prompts/internal-urls/omp.md     # import theo đường dẫn — omp-protocol.ts:10
packages/coding-agent/src/prompts/system/system-prompt.md  # import theo đường dẫn — system-prompt.ts:30
packages/coding-agent/src/prompts/tools/browser.md         # import theo đường dẫn — tools/browser/prelude-definition.ts:2
packages/coding-agent/src/prompts/tools/find.md            # import theo đường dẫn — tools/jfind/index.ts:16
packages/coding-agent/src/prompts/tools/glob.md            # import theo đường dẫn — tools/glob.ts:9
packages/coding-agent/src/prompts/tools/ida.md             # import theo đường dẫn — tools/ida.ts:24
packages/coding-agent/src/prompts/tools/isolation-error.md # import theo đường dẫn — task/isolation-runner.ts:26
scripts/session-stats/audit-prompt.md                      # import theo đường dẫn — scripts/session-stats/audit.ts:45
```

Tổng 13 dòng, dưới ngưỡng 25. **Không** thêm file nào khác mà chưa phân loại.

### Bước 3 — `docs/environment-variables.md`: cột `New name` + sửa dòng 25

Đã kiểm, tất cả đúng:

- `docs/environment-variables.md:25` là câu `mirrored` (dòng 29 là `---`, **không** phải dòng cần sửa)
- `docs/environment-variables.md:523` = `` | `PI_CONFIG_DIR` | Config root dirname under home (default `.omp`) | `` — dòng duy nhất mang tên mới
- `docs/environment-variables.md:18-21` mô tả thứ tự đọc dotenv, gồm `` `~/.omp/agent/.env` `` và `` `~/.omp/.env` ``
- 648 dòng · 29 bảng · 100 dòng `PI_*`/`OMP_*`
- 95/100 dòng biến nằm ở bảng có header từ dòng 270 trở đi; bảng header 428 có 36 dòng biến, header 313 có 17

**Cơ chế mirror đã có sẵn trong code** — `packages/utils/src/env.ts:277-282`, đọc nguyên văn:

```typescript
	// OMP_ overrides PI_
	for (const k in result) {
		if (k.startsWith("OMP_")) {
			result[`PI_${k.slice(4)}`] = result[k];
		}
	}
```

Nghĩa là W13 **tài liệu hoá cơ chế có sẵn**, không phát minh 100 bí danh mới. Chỉ một dòng mang tên mới.

### Bước 4 — Sửa văn xuôi, file từng file, KHÔNG sed

Thứ tự làm theo **số dòng** khớp (đo bằng `git grep -c`):

| # | file | số dòng | số lượt |
| --- | --- | --- | --- |
| 1 | `docs/settings.md` | 43 | — |
| 2 | `README.md` | 36 | **42** |
| 3 | `docs/cli-reference.md` | 24 | — |
| 4 | `docs/auth-broker-gateway.md` | 23 | — |
| 5 | `docs/marketplace.md` | 15 | — |
| 6 | `docs/collab.md` | 15 | — |
| 7 | `docs/local-models.md` | 14 | — |
| 8 | `docs/stream.md` | 13 | — |
| 9 | `docs/skills/authoring-extensions.md` | 13 | — |
| 10 | `docs/toolconv/hermes.md` | 12 | — |
| 10=| `docs/providers.md` | 12 | — |

⚠️ Bảng này có **11 file chứ không phải 10** — `hermes.md` và `providers.md` cùng 12 dòng. Tài liệu liệt kê 10 và bỏ sót `providers.md`.

Với mỗi lượt, phân loại: tên lệnh trong code block (đổi) · tên hiển thị trong văn xuôi (đổi) · đường dẫn `~/.omp/...` (xem bước 5) · legacy keep (giữ + ghi lý do vào allow-list).

### Bước 5 — GIỮ `.omp` trong đường dẫn

404 lượt `.omp` trên 78 file `.md` tại `84cbac9` (đã tái lập). **Không** đổi thành `.ultraworkers` — tài liệu sẽ mô tả thư mục mà bản cài cũ không có. Sau W4 (dual-root vĩnh viễn) câu đúng là: `~/.ultraworkers` được đọc trước, `~/.omp` vẫn được đọc để tương thích.

### Bước 6 — Hai tài liệu hợp đồng: KHÔNG CHẠM

`docs/extension-loading.md:231` — đã đọc, đúng như tài liệu mô tả:

> `- a scoped Bun `onLoad` hook rewrites legacy pi-package specifiers (`@mariozechner/*`, `@earendil-works/*`) and bare `@sinclair/typebox` onto the host-bundled copies before evaluation. Legacy Pi package-root imports resolve through compat shims: catalog symbols that moved to `@oh-my-pi/pi-catalog/models` ... re-exported by the legacy pi-ai shim (`src/extensibility/legacy-pi-ai-shim.ts`), and legacy `@oh-my-pi/pi-coding-agent` imports — including `DefaultResourceLoader` — resolve to the compat loader in `src/extensibility/legacy-pi-coding-agent-shim.ts``

`docs/porting-from-pi-mono.md:46-51` — đã đọc: dòng 46-50 là 5 dòng map `@mariozechner/pi-*` → `@oh-my-pi/pi-*`; dòng 51 nói về scope `@earendil-works/*`.

Cả hai thuộc W8a. **Xem mục 6 mục 5 — con trỏ tới dòng 13841 trong tài liệu đã hỏng.**

### Bước 7 — Chạy gate (xem mục 5)

---

## 4. Hợp đồng test

**Không viết `bun test`.** Đúng như tài liệu kết luận, và `AGENTS.md` cấm: assert trên chữ của file là kiểm tra *hình thức*, đỏ khi người ta reflow bảng mà không đổi ý nghĩa. `test_files` của spec rỗng.

Hợp đồng được bảo vệ bằng **checker có exit code** — và đây là điều người dùng thấy nếu hồi quy:

| Quy tắc | Hồi quy = hành vi quan sát được |
| --- | --- |
| **A** | Người đọc tài liệu lại thấy tên cũ ở một file **chưa được duyệt** — hoặc allow-list phình lên vì có người đẩy việc chưa làm xong vào danh sách duyệt thay vì sửa file. |
| **B** | Người đặt biến trong shell profile thấy một biến **có trong tài liệu nhưng không có tác dụng**, hoặc một biến **chạy thật mà không có ở tài liệu**. Phải kiểm **cả hai chiều**: `comm -23` bắt W4 land `ULTRAWORKERS_CONFIG_DIR` mà W13 quên ghi doc; `comm -13` một mình không bắt được. |
| **C** | Phần changelog **đã phát hành** bị viết lại vì một lần đổi tên. Đỏ ngay khi có ai thêm mục changelog "vì lần đổi tên này hướng tới người dùng" — đúng cái sai lầm `AGENTS.md` cấm. |

Checker là thuần Bun, chạy được **không cần addon native** — nên là hàng phòng thủ thật sự kể cả khi `bun test` đang bị chặn.

---

## 5. Cổng — và câu trả lời: cổng này có ĐỎ ĐƯỢC không

### Kết luận trước: **cổng như tài liệu viết KHÔNG đỏ được ở trạng thái đầu.**

Đây là điều quan trọng nhất của phiếu này. Tôi đã chạy từng quy tắc ở trạng thái hiện tại (W13 chưa làm gì):

| Cổng | Đỏ được khi nào | Xanh ở trạng thái CHƯA LÀM GÌ? |
| --- | --- | --- |
| Quy tắc A (allow-list) | Chỉ khi ai thêm file `.md` mới mang thương hiệu, hoặc quên gỡ file đã sửa xong | **XANH** — seed allow-list bằng toàn bộ 93 dòng thì xanh ngay lập tức |
| Quy tắc A lệnh thứ ba | **ĐỎ NGƯỢC** — xem bên dưới | **ĐỎ** (nhưng vì lý do sai) |
| Quy tắc B (biến môi trường) | Chỉ khi W4 land `ULTRAWORKERS_CONFIG_DIR` mà W13 quên ghi doc | **XANH** — baseline đo được: code 0, doc 0, cả hai `comm` rỗng |
| Quy tắc C (changelog) | Chỉ khi có ai sửa phần đã phát hành | **XANH** — baseline 0 dòng |
| `bun run check:ts` | Khi ai đó đổi tên `internal-urls/omp.md` (typecheck đỏ) | **XANH** |
| `bun run check` (lệnh tài liệu chỉ định) | Không bao giờ — nó là `bun run --parallel check:ts check:rs` (typecheck + cargo), không đọc nội dung markdown | **XANH** |

**Ba quy tắc nội dung đều xanh trước khi W13 bắt đầu.** Cổng vì thế không phân biệt được "đã làm" với "chưa làm" — đúng lỗi mà chính tài liệu cảnh báo ở `Cách sai dễ nhất` mục 6, nhưng rồi tự viết một cổng mắc đúng lỗi đó.

### Viết lại cho đỏ được

**Sửa 1 — lệnh thứ ba của quy tắc A đang đảo chiều.** Tài liệu viết:

```bash
comm -23 /tmp/w13-base.txt /tmp/w13-actual.txt | wc -l  # ĐỎ nếu khác 0
```

Nhưng `comm -23 base actual` đếm **những file đã được đổi tên thành công**. Khác 0 nghĩa là W13 **làm được việc** — đỏ đúng lúc thành công. Điều kiện đỏ đúng là: *mọi file từng mang thương hiệu ở mốc phải hoặc đã sạch, hoặc nằm trong allow-list có lý do*.

```bash
# ĐỎ khi còn file chưa xử lý — đây là cổng đỏ NGAY từ trạng thái đầu
comm -23 /tmp/w13-base.txt /tmp/w13-allowed.txt
```

Với allow-list 13 dòng ở bước 2, lệnh này in ra **80 dòng** ngay lúc bắt đầu ⇒ **ĐỎ**. Khi W13 làm xong 80 file đó, nó rỗng ⇒ **XANH**. Đây là hình dạng đúng.

**Sửa 2 — ép ngưỡng 25 dòng bằng máy, không bằng lời.** Tài liệu nói "allow-list không được dài hơn 25 dòng" nhưng không có lệnh nào ép nó. Thêm:

```bash
n=$(sed 's/[[:space:]]*#.*$//' scripts/rename/docs-legacy-allowlist.txt | sed '/^$/d' | wc -l)
[ "$n" -le 25 ] || { echo "FAIL allowlist: $n dòng > 25 — sửa file thay vì thêm vào allow-list"; exit 1; }
```

Không có lệnh này, quy tắc A xanh với allow-list 93 dòng và W13 trở thành một lượt `echo`.

**Sửa 3 — đóng lỗ `|| true` của chính mình.** Trong lệnh một dòng, `git grep` exit 1 khi sạch. Nếu nối bằng `&&` thì `comm` không chạy và cổng luôn xanh — tức là **cổng không phân biệt "đã làm" với "lệnh không chạy"**. Bắt buộc:

```bash
{ git grep -lE "$P" -- '*.md' $EXC || true; } | LC_ALL=C sort > /tmp/w13-actual.txt
```

**Sửa 4 — Rule C bỏ sót một changelog.** Pathspec `'packages/*/CHANGELOG.md'` không phủ `crates/vendor/napi/CHANGELOG.md` (repo có **15** file `*CHANGELOG.md`, không phải 14). File đó hiện sạch token, nhưng cổng bảo vệ nó thì không. Dùng `'*CHANGELOG.md'`.

**Sửa 5 — luôn so với `$BASE`.** `git grep` trên HEAD và `git diff` trần không thấy thay đổi đã commit.

```bash
BASE=<commit cha của nhánh W13>
```

### Cổng kết — chạy CẢ BA, cả ba phải xanh, và `check:ts` là điều kiện phụ

```bash
bun scripts/rename/check-docs-rename.ts   # A + B + C + ngưỡng 25 dòng
bun run check:ts                           # điều kiện phụ, exit 0
```

`bun run check:ts` đã chạy được ở đây qua `check:tools`: `oxlint . && oxfmt --check … 'scripts/**/*.ts'` — glob `scripts/**/*.ts` ở `package.json:91` nghĩa là script mới trong `scripts/` **tự động** được lint, không cần cấu hình thêm. Kết quả vừa chạy: `Finished in 333ms on 5445 files`, chỉ một warning không liên quan.

### Cổng âm (đỏ khi tài liệu hỏng) — chạy định kỳ

```bash
# 13 dòng import theo đường dẫn phải còn nguyên
git grep -nF 'prompts/internal-urls/omp.md" with' -- '*.ts'   # omp-protocol.ts:10
git grep -nF 'prompts/internal-urls/cfg.md" with' -- '*.ts'   # cfg-protocol.ts:26
git grep -nF 'prompts/tools/isolation-error.md" with' -- '*.ts' # isolation-runner.ts:26
# 3 vị trí đuôi file tạm phải còn nguyên
sed -n '2515p' packages/coding-agent/src/modes/controllers/input-controller.ts  # { extension: ".omp.md" }
sed -n '91p;99p' packages/coding-agent/test/external-editor.test.ts          # omp-editor-123.omp.md
```

---

## 6. Cạm bẫy riêng của W13

### 1. "2 runtime asset" — thực tế là **13**, và đây là bẫy chết người

Tài liệu nói trong tập 93 file chỉ có 2 file là asset nạp lúc chạy: `internal-urls/omp.md` và `.omp/skills/semantic-compression/SKILL.md`. **Sai.** Tôi đã import-từng-dòng từng file trong tập 93: có **13** file mà *đường dẫn file* là một đầu vào build.

12 trong số đó được `import ... with { type: "text" }` theo đúng đường dẫn — đổi tên là `check:ts` đỏ ngay, giống `omp.md`:

| file | import tại |
| --- | --- |
| `packages/coding-agent/src/prompts/internal-urls/omp.md` | `omp-protocol.ts:10` |
| `packages/coding-agent/src/prompts/internal-urls/cfg.md` | `cfg-protocol.ts:26` |
| `packages/coding-agent/src/prompts/system/system-prompt.md` | `system-prompt.ts:30` |
| `packages/coding-agent/src/prompts/tools/browser.md` | `tools/browser/prelude-definition.ts:2` |
| `packages/coding-agent/src/prompts/tools/find.md` | `tools/jfind/index.ts:16` |
| `packages/coding-agent/src/prompts/tools/glob.md` | `tools/glob.ts:9` |
| `packages/coding-agent/src/prompts/tools/ida.md` | `tools/ida.ts:24` |
| `packages/coding-agent/src/prompts/tools/isolation-error.md` | `task/isolation-runner.ts:26` |
| `packages/coding-agent/src/cleanse/prompts/discovery.md` | `cleanse/agent.ts:16` |
| `packages/coding-agent/src/commit/agentic/prompts/system.md` | `commit/agentic/agent.ts:16` |
| `packages/coding-agent/src/live/prompts/live-instructions.md` | `live/controller.ts:10` |
| `scripts/session-stats/audit-prompt.md` | `scripts/session-stats/audit.ts:45` |

Và `.omp/skills/semantic-compression/SKILL.md` (prompt corpus dưới thư mục dot, `compress/index.ts:58` ghi rõ). Toàn repo có ~200 specifier `prompts/*.md` kiểu này — một lệnh `sed` trên "mọi file `.md`" là thảm họa, và allow-list 13 dòng ở bước 2 là hàng rào duy nhất đứng giữa.

⚠️ **Cạm bẫn phụ:** `docs/tools/find.md` và `prompts/tools/find.md` trùng tên. Khi grep bằng basename, `docs/tools/find.md` sẽ **báo động giả** là asset. Lọc bằng đường dẫn đầy đủ, không dùng basename.

### 2. Con số bề mặt trong tài liệu đã lỗi thời — nhưng đúng ở mốc cũ

Tôi đã chạy lại **toàn bộ** số ở mục `Xác minh` trên mốc `84cbac9`: **93 file / 549 lượt / 66 file `@oh-my-pi/` / 404 lượt `.omp` trên 78 file / 24 URL trên 13 file / 612 file `.md` / 82 + 134 docs / 58 + 40 / 13 + 11 changelog / 648 dòng · 100 biến · 29 bảng.** Tất cả khớp tuyệt đối. Ở HEAD `47720fd` thì **không**:

| đại lượng | tài liệu / `84cbac9` | HEAD `47720fd` | lệch vì |
| --- | --- | --- | --- |
| file `.md` trong bề mặt | 93 | **98** | 5 file nghiên cứu/kế hoạch ở gốc repo |
| lượt `omp` | 549 | **3284** | 5 file đó một mình đóng góp 2734 lượt |
| URL GitHub | 24 trên 13 file | **26 trên 14** | `RESEARCH_DSH_OMO_2026-09-28.md` |
| file `.ts` chứa URL | 54 | **52** | — |
| lượt `.omp` | 404 trên 78 file | **432 trên 82** | — |
| tổng file `.md` track | 612 | **626** | — |

5 file mới không bị exclusion của tài liệu bắt: `CROSS_REPO_COMPARISON.md`, `PACKAGE_REORGANIZATION_PLAN.md`, `RESEARCH_DSH_OMO_2026-09-28.md`, `RESEARCH_FINDINGS_2026-09-28.md`, `SENPI_FINDINGS.md`. Tập 93 ở mốc là **tập con thật** của tập 98 ở HEAD (0 file nào biến mất) — nghĩa là bề mặt ổn định về thành phần, chỉ là con số thì không.

→ **Đo lại tại thời điểm chạy, đừng ép về 93/549.** Bước 2 đã ghi sẵn exclusion cho 5 file đó.

### 3. `.omp/**/*.md` là **10**, không phải 9

`Xác minh` mục E viết `git ls-files '.omp/**/*.md' | wc -l` bằng **9**. Lệnh đó hôm nay ra **10** — `.omp/skills/sync-squashed-fork/SKILL.md` được thêm sau mốc. File mới có 0 lượt khớp nên các con số "8 file còn lại có 0 lượt" vẫn đúng, **nhưng bảng `File cần chạm tới` liệt kê 9 tên file và thiếu file thứ 10**, và cổng âm E sẽ bị đọc nhầm là hồi quy.

### 4. "10 file nhiều nhất" thực tế là 11

`docs/toolconv/hermes.md` và `docs/providers.md` cùng **12 dòng**. Bảng ở bước 4 bỏ sót `providers.md`.

### 5. Mọi con trỏ "plan dòng NNNNN" trong W13 đã hỏng

Plan hiện dài **4808 dòng**. W13 trích: `13266-13282` (bảng `do_not_rename` N1–N17), `13272` (N10), `13828`, `13841` (W8a sở hữu hai tài liệu), `13975`–`13983` (đặc tả gốc của W13). `sed -n '13266p' MILESTONE_5_EXECUTION_PLAN.md` → **rỗng**. Tất cả đều quá cuối file.

Hệ quả cụ thể:
- Vì trỏ "W8a sở hữu" không kiểm được, **xung đột sở hữu vẫn có thật** nhưng vị trí thật là `MILESTONE_5_EXECUTION_PLAN.md:2342`: *"Hai file `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` phải được viết lại"* — nằm trong `## W8a.` (dòng 2264). **Đề xuất của tài liệu là đúng: W8a chịu trách nhiệm.**
- Bảng `do_not_rename` N1–N17 **không còn tồn tại ở dạng bảng**. Mục `## do_not_rename` (dòng 109) giờ là văn xuôi + bảng hai-tên-file. Nội dung cốt lõi vẫn còn (mục `## Không làm ghi` giữ họ `PI_*`/`OMP_*`, thư mục `.omp` cấp project, 16 basename) nhưng **mã hàng N1–N17 không tra được nữa** ⇒ mệnh đề "bảng không có hàng nào phủ URL GitHub" trong phần đính chính **không kiểm chứng được**.

### 6. Sở hữu kép với W8a — vẫn nghiêm trọng nhất

`docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` được W13 nêu **và** W8a nhận. Chọn W8a (nó có điều kiện "chỉ sau khi M2 chốt exports map"; W13 không có). Ghi tên bên kia vào `keep_refs` trong `disposition.tsv`, bên kia bỏ qua. **Đừng sửa hai dòng này ở W13.**

### 7. Đọc thẳng §2.2 sẽ phát minh 100 bí danh mới

Cột `New name` là cột ghi **tên**, không phải 100 chỗ đọc env mới. Cơ chế mirror `OMP_*` → `PI_*` **đã có** (`env.ts:277-282`) và doc đã mô tả ở dòng 25. W13 chỉ thêm đúng **một** tên mới.

### 8. Thêm mục changelog là sai lầm lớn nhất

`AGENTS.md` cấm; quy tắc C chặn bằng exit code, và `## [Unreleased]` là ngoại lệ duy nhất **khi người dùng yêu cầu rõ ràng**.

### 9. Ba câu hỏi chưa có câu trả lời — hỏi trước khi gõ

1. **URL `github.com/can1357/oh-my-pi` có đổi không?** 26 lượt / 14 file `.md` + 52 file `.ts`. Không work item nào sở hữu, không hàng nào trong `do_not_rename` phủ. GitHub giữ redirect nên URL không gãy — vì vậy dễ bị bỏ sót vĩnh viễn.
2. **`omp://` có phải tên hiển thị cần đổi không?** Nếu có thì đổi **scheme**, thuộc W9, và phải giữ alias. File `omp.md` không đổi tên ở W13.
3. **`check-docs-rename.ts` nối vào job CI nào?** `check:tools` là lint, không phải gate nội dung. Nếu không nối, gate chỉ chạy khi ai nhớ — hữu ích nhưng không ép ai.

---

## Phụ lục — bảng đính chính: neo hỏng đã đo

| claim trong W13 | thực tế |
| --- | --- |
| `git ls-files '.omp/**/*.md' \| wc -l` = 9 | **10** (thêm `.omp/skills/sync-squashed-fork/SKILL.md`) |
| "2 runtime asset trong tập 93" | **13** |
| "93 file / 549 lượt tái lập được ở HEAD hiện tại" | đúng ở `84cbac9`; HEAD = **98 / 3284** |
| 24 URL / 13 file `.md`, 54 file `.ts` | HEAD: **26 / 14**, **52** |
| 404 lượt `.omp` / 78 file | HEAD: **432 / 82** |
| 612 file `.md` track | HEAD: **626** |
| "10 file nhiều nhất" | **11** (tie 12 dòng) |
| `comm -23 base actual \| wc -l` = ĐỎ nếu khác 0 | **đảo chiều** — đếm thành công, đỏ lúc làm đúng |
| ngưỡng allow-list 25 dòng | không có lệnh nào ép |
| Rule C pathspec `packages/*/CHANGELOG.md` | bỏ sót `crates/vendor/napi/CHANGELOG.md` (15 changelog toàn repo) |
| plan dòng 13266-13282, 13272, 13828, 13841, 13975-13983 | **toàn bộ quá cuối file** (plan dài 4808 dòng) |
| bảng `do_not_rename` N1–N17 dạng bảng | không còn; mục ở dòng 109 là văn xuôi |
| `bun run check` là cổng nghiệm thu | không đỏ được; `check:ts` + `check:rs`, không đọc markdown |

### Neo ĐÚNG (không cần sửa tài liệu)

`docs/environment-variables.md:25` · `:29` · `:18-21` · `:523` · `:37` · `:191` · `:270` · `:313` · `:428` · `:490` · `:618` · `packages/utils/src/env.ts:277-282` · `omp-protocol.ts:10` · `internal-urls/omp.md` · `input-controller.ts:2515` · `external-editor.test.ts:91,99` · `compress/index.ts:58` · `docs/extension-loading.md:231` · `docs/porting-from-pi-mono.md:46-51` · `AGENTS.md:19,60,62,227,337-338` · `README.md` (701 dòng, 42 lượt / 36 dòng / 23 `@oh-my-pi/`) · `CONTRIBUTING.md:1,84` · `LICENSE:3-5` · `package.json:89,90,91`.
