## Audit `gajae-code` — MIT
**Repo:** `/Users/tranquangdang21/Projects/gajae-ref` · remote `https://github.com/Yeachan-Heo/gajae-code.git`
**HEAD:** `5c5231418930673e42cc5d08ebe4376e03187533` (2026-09-26 01:26:07 +0900) — `chore: bump version to 0.17.7`
**Local clone is a SQUASH:** `git log --oneline | wc -l` → **1**. Không dùng được lịch sử để truy nguồn.

---

## 0. KẾT LUẬN QUAN TRỌNG NHẤT — đọc trước mọi thứ khác

**gajae-code KHÔNG phải người ngang hàng của omp. Nó là chính omp, đã đổi tên, ở một bản pin cũ hơn.**

```
$ git grep -n 'oh-my-pi' -- docs/rust-porting-inventory.md
docs/rust-porting-inventory.md:7:Upstream pin: `can1357/oh-my-pi@a85bd5228d9f0f619deade1db78fa49420a721e1`
```

```
$ git grep -n 'oh-my-pi' -- NOTICE.md
NOTICE.md:5:- [`oh-my-pi`](https://github.com/can1357/oh-my-pi) — the upstream red-claw lineage and implementation DNA.
```

Hệ quả trực tiếp, áp dụng cho cả M6:

- **Câu hỏi "học gì từ gajae" phải được đổi thành "học gì từ chính bản cũ của mình, đã đi qua một người khác".** Đây là timeline đảo ngược, không phải so sánh ngang hàng.
- `packages/*` của gajae giữ **nguyên bộ tên thư mục** của omp: `agent/ ai/ coding-agent/ natives/ stats/ tui/ utils/`. Chỉ khác scope: `@oh-my-pi/*` → `@gajae-code/*`.
- `packages/coding-agent/src/extensibility/` ở gajae **giữ nguyên đường dẫn, tên file, cả tên thư mục con** mà omp vẫn còn hôm nay (`custom-tools/loader.ts`, `custom-commands/bundled/ci-green/index.ts`, `extensibility/extensions/{loader,runner,wrapper}.ts`). Đây không phải "gợi ý kiến trúc" — đây **là code của chính omp đã đổi tên**.
- Vì vậy phần lớn "sự khác biệt" quan sát được giữa hai bên là **omp đã tiến**, không phải gajae sáng tạo ra. Chỉ vài mục dưới đây là nơi gajae thực sự đi trước.

---

## 1. Nó là gì? (câu hỏi riêng #1)

**Trả lời thẳng: đó là một coding-agent CLI — bản fork-đổi-tên của chính omp.**

`README.md:44` (nguyên văn):
> Gajae-Code (`gjc`) is an external coding-agent harness: drop it into any repository or worktree. No separate API billing. No per-token anxiety. No terminal babysitting.

Cấu trúc `packages/` (15 thư mục + 1 file tsconfig), tất cả khai `MIT`:

| Thư mục | npm name | So với omp |
| --- | --- | --- |
| `packages/agent` | `@gajae-code/agent-core` | có (omp: `agent/`) |
| `packages/ai` | `@gajae-code/ai` | có |
| `packages/coding-agent` | `@gajae-code/coding-agent` | có |
| `packages/tui` | `@gajae-code/tui` | có |
| `packages/utils` | `@gajae-code/utils` | có |
| `packages/natives` (+5 bản platform) | `@gajae-code/natives-*` | có |
| `packages/stats` | `@gajae-code/stats` | có |
| `packages/gajae-code` | `gajae-code` (CLI) | `packages/coding-agent` của omp |
| `packages/bridge-client` | — | không có ở omp |
| `packages/orchestration-token-benchmark` | `@gajae-code/orchestration-token-benchmark` | omp có `typescript-edit-benchmark` cùng vai |
| `packages/typescript-edit-benchmark` | `@gajae-code/typescript-edit-benchmark` | có |
| **không có** | **`catalog/`, `omptype/`, `metaharness/`, `wire/`, `mnemopi/`, `collab-web/`, `snapcompact/`, `browser-relay/`** | omp có 8 package này |

`git ls-files | grep -iE '\.kdl$'` → **0 file**. `ls packages | grep -i catalog` → **rỗng**.
→ gajae đã **xoá sạch** `packages/catalog/` và cây rule KDL của omp, gộp model catalog về một file phẳng `packages/ai/src/models.json`. Chi tiết ở § "do not copy".

Rust: `git ls-files '*.rs' | wc -l` → **266**, `wc -l` → **113.447 dòng**. Đây là port Rust của natives (có `docs/rust-porting-inventory.md` ghim đúng commit upstream). omp có `crates/` với 559 file `.rs`.

---

## 2. 4.459 file `.ts` làm gì? (câu hỏi riêng #2)

`git ls-files '*.ts' | wc -l` → **4459**. Nhưng con số đó gồm cả test, và test là phần lớn:

```
$ git ls-files '*.ts' | awk -F/ '{c="OTHER"; for(i=1;i<=NF;i++){if($i=="test"){c="TEST";break}; if($i=="src"){c="SRC";break}} print c}' | sort | uniq -c
   310 OTHER
  1810 SRC
  2339 TEST
```

Dòng code (`wc -l` trên tập file tương ứng):

| Nhóm | LOC |
| --- | --- |
| `.ts` trong `test/` | **860.631** |
| `.ts` trong `src/` | **833.264** |
| tổng `.ts` | 1.778.880 |
| `.rs` | 113.447 |

**53% file / 48% dòng là test.** Đây là câu trả lời: repo không "làm gì" với 4459 — nó **kiểm thử** bằng 4459. Đây là mật độ test cao hơn omp (omp: 5407 `.ts` tổng).

Phân bố theo package (`git ls-files '*.ts' | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn`):

```
3339 packages/coding-agent
 561 packages/ai
 141 packages/tui
 130 scripts
 112 packages/agent
  87 packages/utils
  33 packages/natives
  24 packages/stats
  15 packages/orchestration-token-benchmark
  13 packages/typescript-edit-benchmark
   2 docs / 1 types / 1 sdk-skills
```

Phân bộ sâu trong `packages/coding-agent` — thư mục lớn nhất toàn repo:

```
1745 test     ← thư mục .ts đơn lẻ lớn nhất của cả repo
1459 src
  48 vendor   (markit-ai 0.5.3, xem § pháp lý)
  34 scripts
  32 examples
  21 bench
```

Vào `src/`:

```
175 src/modes        174 src/sdk       140 src/tools      109 src/web
 92 src/prompts       78 src/cli        73 src/extensibility
 62 src/gjc-runtime   56 src/commit     45 src/session     43 src/commands
 39 src/config        36 src/utils      34 src/runtime-mcp
 28 src/eval          28 src/defaults   25 src/task        21 src/setup
 20 src/discovery     19 src/harness-control-plane
```

So sánh cùng phép đo trên omp: `packages/coding-agent` 2971 `.ts`, `packages/ai` 787, `packages/tui` **622** (gajae chỉ 141), `packages/catalog` 221, `packages/utils` 218, `packages/mnemopi` 145, `packages/omptype` 107.

→ **gajae nhỏ hơn omp ở TUI (141 vs 622) và thiếu hẳn `catalog`/`omptype`/`mnemopi`.** 4459 nhìn có vẻ to nhưng là *nhỏ hơn* omp ở những nơi quan trọng, và *to hơn* chỉ vì test.

---

## 3. Có phần nào là UI không? Bố cục dùng gì? (câu hỏi riêng #3 — liên quan M3)

**Có, nhưng chỉ TUI + một dashboard thống kê. Không có web UI chính thức.**

**TUI** — `packages/tui`: 141 `.ts` (34 file trong `src/`).

```
$ wc -l packages/tui/src/tui.ts packages/tui/src/components/box.ts
 6135 packages/tui/src/tui.ts
  173 packages/tui/src/components/box.ts
```

**Về bố cục (layout): gajae KHÔNG có hệ thống layout.** `ls packages/tui/src/components/` cho ra đúng 18 file, và **không có thư mục `layout/`**:

```
box.ts cancellable-loader.ts editor.ts gajae-pet.ts image.ts input.ts
loader.ts markdown.ts ouroboros-pet-frames.json ouroboros-pet.ts
secret-input.ts select-list.ts settings-list.ts spacer.ts tab-bar.ts
text.ts truncated-text.ts
```

Primitively duy nhất là `box.ts` (173 dòng). Còn omp:

```
$ ls packages/tui/src/components/layout/
geometry.ts  row.ts  split-pane.ts  stack.ts
$ wc -l packages/tui/src/tui.ts packages/tui/src/components/box.ts
 3633 packages/tui/src/tui.ts
  246 packages/tui/src/components/box.ts
```

omp có `layout/{geometry,row,split-pane,stack}` + `scroll-view/`, `scroll-viewport/`, `split-pane`, `form.ts`, `table.ts`, `tree-view.ts`, `wizard-step.ts`, `disclosure.ts`, `key-value-list.ts`, `metric.ts`, `progress-bar.ts`, `menu-selection.ts`, `section.ts`, và `components/composer/` (10 file, có `registry.ts` + các biến thể `claude.ts`/`pi.ts`/`band.ts`/`rail.ts`/`rule.ts`).

→ **Kết luận M3: về bố cục, gajae là bản cũ. Không có gì để học. omp đi trước rõ ràng.**

Thứ duy nhất trong TUI gajae mà omp không có là **thẩm mỹ**: `gajae-pet.ts` (36 KB), `ouroboros-pet.ts` + `ouroboros-pet-frames.json`, và bộ theme `red-claw` / `blue-crab`. Ràng buộc trọng lực rõ.

**Dashboard thống kê** — toàn bộ 15 file `.tsx` của repo nằm ở `packages/stats/src/client/` (App, BehaviorChart, CostChart, ModelsTable, RequestList, …). omp có đúng cùng package, và giàu hơn (`app/AppLayout.tsx`, `app/NavRail.tsx`, `app/TopBar.tsx`, `data/useHashRoute.ts`).

**Cái tên dễ gây hiểu nhầm:** `packages/coding-agent/src/web/` (109 file) **KHÔNG phải UI**. Nó là engine **tìm kiếm/fetch web**: 79 scraper (`scrapers/{github,arxiv,crates-io,huggingface,devto,hackernews,…}.ts`) + 18 search provider (`search/providers/{brave,exa,tavily,kagi,searxng,perplexity,xai,zai,…}.ts`) + `insane/bridge.ts` (port của insane-search).

**Web GUI là của bên thứ ba.** `README.md:22` (nguyên văn):
> **Experimental, community-built third-party project — not an official first-party Gajae-Code app.**

(trỏ tới `github.com/devswha/gajae-code-app`).

**Nhưng có một thứ UI đáng chú ý:** corpus ảnh chụp TUI được commit vào repo tại `.gjc/qa/` — 83 file, 1.622 dòng `.txt`+`.html`, theo lưới **viewport × render-mode**:

```
.gjc/qa/sticky-viewport-5219/capacity-{zero,one,many}/{48x10,80x24,120x36}/{ascii-no-color,unicode-color}/
  → metadata.json · terminal.txt · terminal-ansi.txt · terminal.html
```

`metadata.json` có `schema_version: 2`, `fixture_revision`, `command_or_replay_source` trỏ tới `packages/coding-agent/scripts/capture-sticky-viewport-showcase.ts`, và cả **mảng `resize_probes`** ghi lại cách layout tách phân khi đổi kích thước. Trong `metadata.json` còn viết thẳng chính sách: độ cao bị siết thì bỏ notice → rồi pet trang trí → rồi hook ưu tiên thấp, **không cắt status đã ghim hay composer đang focus**.

omp **không có** thứ này. `git ls-files | grep -icE 'golden|snapshot'` trên omp → 23, nhưng đều là unit snapshot đơn lẻ (`shell-snapshot.test.ts`, `mcp-runtime-snapshot.test.ts`, `crates/pi-edit/tests/fixtures/notebooks/*.golden.json`), **không có lưới multi-viewport × multi-render-mode** trong repo.

---

## 4. Cơ chế plugin/extension? (câu hỏi riêng #4)

Có, và **sau omp, không trước**.

| Phép đo | gajae | omp |
| --- | --- | --- |
| `coding-agent/src/extensibility/**` | **73** file | **71** file |
| `coding-agent/src/capability/**` | không có | **18** file |
| `coding-agent/src/discovery/**` | 20 file | **56** file |

gajae có thêm `src/extensibility/gjc-plugins/` (**25** file) với các mô-đun mà tên rất đáng chú ý về mặt an toàn: `runtime-quarantine.ts`, `subskill-authority.ts`, `mcp-policy.ts`, `constrained-hooks.ts`, `lifecycle-reconciliation.ts`, `validation.ts`. Tương đương phía omp nằm ở `capability/extension.ts`, `capability/extension-module.ts`, `discovery/agent-plugins.ts`, `discovery/claude-plugins.ts`, `discovery/omp-extension-roots.ts`.

`plugins/` ở gajae (12 file) chỉ là **manifest marketplace theo định dạng Claude Code / Codex** để bot bên ngoài cài delegate commands + MCP. omp có `docs/skills/authoring-marketplaces.md` + `docs/skills/examples/mini-marketplace/`.

Skills: gajae bundle 4 skill workflow (`src/defaults/gjc/skills/{deep-interview,ralplan,ultragoal,autoresearch}/SKILL.md`); omp bundle 3 (`.omp/skills/{semantic-compression,system-prompts,tool-prompt-optimization}/`) — và `.omp/commands/` có 5 lệnh.

→ **Không copy gì từ đây. omp đã có, và có rộng hơn.**

---

## 5. Repo Việt Nam / vận hành cộng đồng? (câu hỏi riêng #5)

**Đo được: KHÔNG phải repo Việt Nam.** Nói thẳng vì giả định trong đề bài không đúng.

```
$ git ls-files | grep -iE 'vi[.-]|vietnam|\.vn'          → 0
$ grep -ril 'tiếng việt\|vietnam' --include='*.md' .      → 0
```

Bằng chứng ngược lại:

- Bảo trì: `Yeachan-Heo` (chủ sở hữu, tài khoản cá nhân), `probepark`, `snowykr`, `HaD0Yun`, `IYENTeam` (`MAINTAINERS.md`).
- Bốn bản README khu vực: `README.ja.md` **37 KB**, `README.ko.md` **33 KB**, `README.md` 29 KB, `README.zh-CN.md` 15 KB. Bản Hàn **lớn hơn bản tiếng Anh**; không có bản Việt.

**Phần vận hành thì có thật và đáng học:**

`MAINTAINERS.md` là một văn bản hiếm — nó ghi rõ **tại sao** không dùng được role chuẩn của GitHub org:
> Because `gajae-code` is owned by a personal account, GitHub does not expose the org-only `maintain`/`triage` roles; the closest equivalent is the **write** (push) role…

và chốt chính sách nhánh: **PR hết về `dev`; `main` chỉ dành cho release do maintainer dẫn.**

Hạ tầng còn lại: `.github/CODEOWNERS`, 3 issue template (`bug_report/feature_request/question.yml`), `PULL_REQUEST_TEMPLATE.md`, `SECURITY.md`, `dependabot.yml`, và **6 workflow**: `ci.yml`, `dev-ci.yml`, `pr-validation.yml`, `public-site-sync.yml`, `spoofed-version-sync.yml` + action dựng riêng. Có Discord invite, có `.mailmap` (2.4 KB), có `scripts/install.sh` phân kênh `nightly`.

Quy trình có hệ thống: `.plans/` (4 plan đặt tên theo ngày), `issues/` với `README.md` + kho `archive/` 21 issue đã đóng có đánh số — mô hình "issue archive số hoá thay vì đóng GitHub issue".

---

## PHÁP LÝ (trích nguyên văn)

**Giấy phép: MIT.** `LICENSE` (1.1 KB):

> MIT License
>
> Copyright (c) 2025-2026 Yeachan-Heo and Gajae Code Contributors

Và **cả 15** `packages/*/package.json` đều khai `"license": "MIT"`.

**Nhưng phải đọc `NOTICE.md` — có ba tầng pháp lý khác nhau:**

1. **Dòng dõi từ chính omp.** `NOTICE.md:5`:
   > [`oh-my-pi`](https://github.com/can1357/oh-my-pi) — the upstream red-claw lineage and implementation DNA.

   Nghĩa vụ khi chép: MIT → **giữ nguyên dòng copyright + toàn văn permission notice**. Với nội dung kế thừa trực tiếp từ omp, copyright thuộc về **cả hai phía**; đặt tên riêng không xoá được nghĩa vụ của dòng gốc. `docs/rust-porting/upstream-workspace-deps@a85bd522.toml:3` nguyên văn:
   > `# Copyright (c) the oh-my-pi authors. Licensed under the MIT License.`

2. **MuPDF = AGPL-3.0.** `NOTICE.md` (nguyên văn):
   > PDF extraction uses MuPDF.js, copyright (C) 2004–2026 Artifex Software, Inc., distributed under **GNU Affero General Public License version 3 or later**. MuPDF is provided without warranty; **the repository's MIT license does not replace MuPDF's license.**

   → **Đây là giấy phép hạn chế mạnh. Không được chép dòng nào** trong đường PDF/MuPDF vào omp (omp là MIT, không tương thích AGDL/AGPL). Và chính NOTICE cũng thừa nhận giới hạn:
   > this notice or a successful build check alone is not license clearance.

3. **Vendor còn lại (đều MIT, nhưng có điều kiện):**
   - `insane-search` (MIT) — vendor làm provider search/fetch fallback. `scripts/verify-insane-vendor.ts` (4 KB) chạy kiểm tra vendor.
   - `markit-ai` 0.5.3 (MIT) — 48 file `.ts` trong `packages/coding-agent/vendor/markit-ai`; NOTICE: *"Its license, upstream package metadata, integrity/hash inventory and reproducible patch are retained alongside the vendored code."* Tức là khi chép phải chép **cả** bản vá tái lập được, không chép mỗi file nguồn.

**Kết luận pháp lý:** repo này **là** mã nguồn mở (MIT), nhưng **không đồng nhất** — có một phần AGPL nằm trong đường PDF. Chép bất kỳ thứ gì từ đây về phía omp phải: (a) loại trừ toàn bộ đường MuPDF/PDF; (b) giữ copyright + permission notice MIT; (c) nếu chạm vendor, giữ luôn bản vá + hash inventory.

---

## BẢNG: THỨ omp CHƯA CÓ

| # | Thứ | Vì sao đáng | Cỡ (đo được) | omp đã có tương đương? | Đáng không |
| --- | --- | --- | --- | --- | --- |
| 1 | **Corpus ảnh chụp TUI đa-viewport đa-render-mode commit vào repo** (`.gjc/qa/`) | ôm đúng thứ khó nhất của M3: chứng minh layout không vỡ ở 48×10 lẫn 120×36, ascii lẫn unicode, màu lẫn không màu. `metadata.json` còn máy hóa **thứ tự ưu tiên cắt bỏ** khi thiếu chỗ | **83 file, 1.622 dòng**; 2 script sinh/verify (`capture-sticky-viewport-showcase.ts`, `verify-sticky-viewport-showcase.ts`) | omp: chỉ 23 file golden/snapshot, đều đơn lẻ theo test — **không có lưới** | **Đáng.** Rẻ, tự kiểm chứng, không đụng kiến trúc |
| 2 | **`MAINTAINERS.md` — bảng roster + lý do + chính sách nhánh** | omp sở hữu repo cá nhân y hệt, cũng không dùng được role `maintain`/`triage`. Đây là bài học vận hành đã gặp chứng | **1.3 KB** | omp không có (chỉ có `CONTRIBUTING.md` 101 dòng) | **Đáng.** Gần như miễn phí |
| 3 | **Bus chat ngoài terminal: Telegram/Discord/Slack với giao thức `action_needed`/`reply`** | câu trả lời "agent hỏi lúc 2h sáng" — đúng khoảng trống M3. Đã có `ask` tool nhưng chưa có đường vận chuyển ra ngoài | `src/sdk/bus/**` = **60 file**; `src/daemon/**` = 4; `telegram-daemon.ts`, `discord-daemon.ts`, `slack-daemon.ts`, `notification-orchestration.ts` | `git grep -ril telegram -- packages` trên omp → **0 file**. omp có `blob-broker/daemon.ts` nhưng là blob, không phải chat | **Đáng về khái niệm, KHÔNG đáng về cỡ.** 60 file là cả một hệ thống; chép nguyên khối là tự tạo nợ kỹ thuật không ai bảo trì |
| 4 | **Cổng điều khiển ngoài tiến trình có receipt + lease** (`harness-control-plane/`) | ý tưởng đáng: mọi lệnh điều khiển từ bot/SDK đều để lại **receipt spool** trên đĩa, `session-lease` chống hai owner tranh nhau. Là nền cho #3 mà không cần Telegram | **19 file** (`receipt-spool.ts`, `session-lease.ts`, `state-machine.ts`, `seams.ts`, `classifier.ts`…) | `git grep -ril 'sessionLease\|receiptSpool' -- packages` trên omp → **0** | **Cân nhắc.** Chỉ lấy `receipt-spool` + `session-lease`; cả 19 file là một state machine đầy đủ, quá nặng cho nhu cầu hiện tại |
| 5 | **Skill quy trình 4 bước có gate**: `deep-interview → ralplan → ultragoal` (+`autoresearch`) | khớp trực tiếp "plan trước khi mutate" — mà omp chưa có tên gọi này | **10 file `.md`** trong `src/defaults/gjc/skills/` | `git grep -ril ultragoal\|deep-interview\|ralplan` trên omp → **0 file** (0/154/187 hit) | **Đáng, nhưng nhẹ.** Chỉ là prompt/skill markdown, không kéo theo runtime. `ultragoal` gắn với `gjc-runtime/goal-mode-request.ts` — phần runtime đó thì thôi |
| 6 | **Kho issue đánh số `issues/` + `issues/archive/`** | thay vì đóng GitHub issue, giữ backlog số hoá trong repo | 23 file, 21 issue đã archive có số | omp không có thư mục tương đương | **Tùy.** Chỉ hợp nếu omp muốn backlog sống trong cây; nếu không thì GitHub issue đã đủ |
| 7 | Manifest sinh tự động: `generate-telegram-baseline-manifest.ts`, `generate-sdk-operation-inventory.ts`, `generate-sdk-adapter-parity-manifest.ts`, `run-test-manifest.ts` | ý tưởng tốt: một script sinh ra **bằng chứng bao phủ** thay vì giữ thủ công | 4 script trong tổng 34 script của `coding-agent/scripts/` | omp có script sinh riêng lẻ (`gen-nix-bun.ts`, `gen-bazel-lock.ts`…) nhưng không có nhóm "manifest bao phủ" | **Đáng**, nếu gắn với một bề mặt cụ thể; không chép cả bộ |

---

## DO NOT COPY

1. **Cấu trúc `models.json` phẳng của `packages/ai/`.** Đây là **hồi quy so với chính omp**, không phải bài học. gajae không có `packages/catalog/` và không có file `.kdl` nào (`git ls-files | grep -iE '\.kdl$'` → 0), trong khi omp có **221 file KDL** dưới `packages/catalog/src/compat/rules/{taxonomy,classes,providers,runtime}/`. `AGENTS.md` của omp ghi rõ: *"NEVER hard-code model- or provider-conditional policy in TypeScript… All of it belongs in the KDL rule tree."* Chép cách gajae là **xoá ngược** lớp trừng phạt mà omp đã xây.

2. **Cái monolith `packages/tui/src/tui.ts` — 6.135 dòng.** omp đã tách: cùng file đó chỉ còn 3.633 dòng, và phần còn lại đã đi vào `apps/{git,debug}/` + `components/layout/`. Chép ngược là bước lùi.

3. **Cái SDK 127.978 dòng.** `git ls-files 'packages/coding-agent/src/sdk/*' | wc -l` → 174 file, `wc -l` → 127.978. Một "SDK" 128k dòng là diện tích API công khai khổng lồ và là nghĩa vụ tương thích vĩnh viễn. omp hiện không có `src/sdk/` nào (`git ls-files … | grep -cE '/sdk/'` → 0) và vẫn ổn. Lấy ý tưởng, không lấy khối lượng.

4. **Bất kỳ dòng nào nào trong đường MuPDF/PDF.** AGPL-3.0, và chính `NOTICE.md` nói thẳng MIT của repo **không** thay thế giấy phép đó. omp là MIT. Ranh giới đỏ.

5. **`insane-search` vendored.** MIT nên chép được, nhưng phải chép **kèm** `scripts/verify-insane-vendor.ts` và cả hash inventory. Chép mỗi file provider là tự tạo nợ.

6. **Đừng học theo tinh thần "cái này gajae làm tốt hơn omp".** Vì §0: phần lớn khác biệt là **omp đã đi trước rồi lùi lại không**. Cụ thể đã đo: tui 141 vs 622; extensibility 73 vs 71 nhưng omp thêm `capability/` 18 + `discovery/` 56; thiếu hẳn `catalog`, `omptype`, `mnemopi`, `collab-web`, `metaharness`, `wire`, `snapcompact`, `browser-relay`.

7. **Cách viết README.** Câu *"The default dark TUI identity is the GJC red-claw theme; light-appearance terminals default to the bundled blue-crab theme."* xuất hiện **4 lần** trong `README.md` (dòng 209, 224, 380, 448), và có một heading `## Theme defaults` đứng cạnh một đoạn trùng lặp ngay dưới `## Spend fewer tokens`. Bản `.ja`/`.ko` cũng nhân bản. Đây là bằng chứng biên tập lỏng — nếu omp học "văn phong README" từ đây thì học cả cái lỗi.

---

## UNKNOWNS

1. **Không lấy được lịch sử.** Local clone là **1 commit** đã squash. Không biết gajae bắt đầu từ đâu, ai dùng gì, thay đổi nào là của Yeachan-Heo và thay đổi nào là trôi theo upstream. Đây là giới hạn lớn nhất của audit này — mọi phán đoán "ai nghĩ ra cái gì" đều không kiểm chứng được.
2. **Sai lệch so với pin thật.** `a85bd5228d9f0f619deade1db78fa49420a721e1` là commit của omp tại thời điểm port, **không** phải HEAD hiện tại. Để biết chính xác gajae đã *thêm* gì so với *bỏ* gì thì phải clone `can1357/oh-my-pi` tại đúng pin đó rồi diff — việc này chưa làm.
3. **Chưa đo chất lượng thực tế.** Tỷ lệ 53% test cho biết mật độ, không cho biết test có bắt được lỗi thật hay không. Không có CI run nào được kiểm chứng.
4. **Chưa đọc nội dung `NOTICE.md` về `markit-ai` đủ sâu** để khẳng định bản vá có tái lập được thật hay không.
5. **`.gjc/qa/` chỉ có một fixture** (`sticky-viewport-5219`). Chưa biết đây là chính sách đang được áp dụng rộng hay một trường hợp cá nhân bị commit nhầm. `schema_version: 2` gợi ý có hệ thống, nhưng chỉ thấy một entry.
6. **Chưa xác minh bao nhiêu phần của 60 file `sdk/bus/` thực sự là Telegram/Discord/Slack** so với phần là hạ tầng chung. Con số "60 file" có thể phồng lên vì cả bus trung gian.
7. **Chưa đọc `AGENTS.md` của gajae ở mức từng dòng** (201 dòng, ngắn hơn omp 345) — có thể có điều khoản đáng học, chưa đánh giá.

---

## TÓM LƯỢC CHO M6

gajae-code là **omp đã đổi tên và pin cũ**, không phải một nguồn học độc lập. Vì vậy:

- **Học được (3 thứ, đều nhỏ, đều rẻ):** lưới ảnh chụp TUI đa-viewport ở `.gjc/qa/`; `MAINTAINERS.md`; bốn skill quy trình có gate.
- **Cân nhắc (2 thứ, phải cắt nhỏ trước khi lấy):** `receipt-spool` + `session-lease`; nhóm script sinh manifest bao phủ.
- **Không học (đã có rồi hoặc là hồi quy):** extension system, auth-broker/gateway, session import, TUI layout, mọi thứ liên quan model catalog.
- **Cấm:** toàn bộ đường MuPDF/PDF (AGPL), `insane-search` vendor, `models.json` phẳng, `tui.ts` 6k dòng, SDK 128k dòng.
