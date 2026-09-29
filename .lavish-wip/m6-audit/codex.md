# M6 audit — `openai/codex`

Repo: `/Users/tranquangdang21/Projects/codex-ref` · HEAD `e72da2b` · origin `https://github.com/openai/codex.git`

**Kết luận một dòng:** đây **đúng là Codex của OpenAI** (first-party, không phải fork trùng tên), Apache-2.0 nên chép được — nhưng nó **không phải nguồn để học layout** (Rust thuần, 135 crate, khác hệt omp). Chỉ **một** thứ trong repo này là bài học thật sự dùng được cho omp: **snapshot test khung hình render TUI** (1.329 file `.snap` cho 1.054 file nguồn TUI). Phần còn lại — đặc biệt sandbox OS và blob `models.json` — là **điểm chép là sập**.

---

## 0. Số đo đã kiểm (mọi khẳng định kèm lệnh)

| Đại lượng | Số | Lệnh |
| --- | --- | --- |
| HEAD | `e72da2b53805…` (2026-09-26, #48353) | `git log -1 --format='%H %ad %s'` |
| File theo dõi | **8.693** | `git ls-files \| wc -l` |
| Dung lượng | **123 MB** (`.git` 19 MB) | `du -sh . .git` |
| `.rs` | **4.925** | `git ls-files \| sed 's/.*\.//' \| sort \| uniq -c` |
| Tổng LOC `.rs` | **1.943.003** | `git ls-files '*.rs' \| xargs wc -l \| tail -1` |
| LOC `.rs` trừ test | **1.072.974** | `git ls-files '*.rs' \| grep -vE "tests?/\|_tests\.rs\|/tests/" \| xargs wc -l \| tail -1` |
| `.snap` | **1.429** (1.298.261 byte ≈ 1,24 MB) | `git ls-files '*.snap' \| wc -l` / `\| xargs wc -c \| tail -1` |
| `.ts`+`.tsx` | **758** — nhưng 734 là **sinh tự động**, chỉ **24** là tay viết | xem §1 |
| Crate Rust | **135** thư mục có `Cargo.toml` | `git ls-files 'codex-rs/**/Cargo.toml' \| wc -l` |
| Tổng LOC TypeScript tay viết | **24 file** (chỉ `sdk/typescript`) | `git ls-files '*.ts' '*.tsx' \| grep -v schema/ \| wc -l` |

### Crate Rust lớn nhất (`git ls-files 'codex-rs/<c>/**/*.rs' | xargs wc -l`)

| Crate | File | Dòng |
| --- | --- | --- |
| `core` | 787 | 425.831 |
| `tui` | 1.054 | 425.296 |
| `app-server` | 330 | 185.929 |
| `exec-server` | 168 | 62.141 |
| `core-plugins` | 90 | 47.665 |
| `cli` | 100 | 40.159 |

Ba crate đầu đã chiếm 1.037.056 dòng — hơn một nửa toàn repo.

---

## 1. Câu hỏi 1 — phần Rust (4.925 file) làm gì: core, binding, hay công cụ?

**Trả lời: đây là core. Toàn bộ sản phẩm là Rust. TypeScript chỉ là cái vỏ sinh tự động.**

Bằng chứng ba tầng, không suy đoán:

**Tầng 1 — `codex-cli` không có logic ứng dụng.** Nó là một shim Node 8,6 KB:
```
$ ls codex-cli/bin          → codex.js
$ wc -c codex-cli/bin/codex.js  → 8639
$ head -3 codex-cli/bin/codex.js
#!/usr/bin/env node
// Unified entry point for the Codex CLI.
import { spawn } from "node:child_process";
```
Nó spawn một binary Rust dựng sẵn theo platform (`@openai/codex-darwin-arm64`, `@openai/codex-linux-x64`, …). Không có TypeScript nào trong sản phẩm.

**Tầng 2 — 758 `.ts/.tsx` không phải code ứng dụng.** Tất cả 734 file trong `codex-rs/` nằm ở **một** thư mục:
```
$ git ls-files 'codex-rs/**/*.ts' | awk -F/ '{print $4}' | sort | uniq -c
    734 typescript
$ head -3 codex-rs/app-server-protocol/schema/typescript/AbsolutePathBuf.ts
// GENERATED CODE! DO NOT MODIFY BY HAND!
```
Chúng do `ts-rs` sinh từ các `#[derive(TS)]` bên Rust, tái sinh bằng `codex-rs/app-server-protocol/src/schema_fixtures.rs` (`/// Regenerates schema/typescript/, schema/json/, …`). **24 file TypeScript tay viết duy nhất** nằm trong `sdk/typescript/` — SDK cho client, không phải agent.

**Tầng 3 — phân tầng rõ ràng.** Agent loop = `core` (787 file). Giao diện = `tui` (1.054 file, ratatui). Mọi thứ khác là protocol/plumbing quanh hai đáy đó.

### Tương đương ở omp?

**Có, nhưng tỉ lệ ngược.** omp cũng coi Rust là native layer, không phải binding:
```
$ git ls-files 'crates/*/Cargo.toml' | sed 's|/Cargo.toml||'
crates/pi-ast  pi-builtins  pi-diff  pi-edit  pi-iso  pi-natives  pi-predict
crates/pi-shell  pi-vcs  pi-vfs  pi-voice  pi-walker  (+ 3 vendor)
$ git ls-files 'crates/**/*.rs' | xargs wc -l | tail -1   →  308105 total
$ git ls-files 'crates/pi-natives/**' | wc -l            →  210
```
Điểm khác biệt quyết định: **omp đặt ranh giới ở _loại việc_, codex đặt ở _ngôn ngữ_.** `crates/pi-natives` (210 file) là "phần nóng" — text/grep/image — còn agent loop, TUI, tool dispatch vẫn là TypeScript ở `packages/`. codex đẩy ranh giới xa hơn hẳn: agent loop **và** TUI đều là Rust (851K dòng).

**Học gì:** ranh giới của omp là hợp lý và **không nên di chuyển**. Việc chuyển TUI/agent-loop sang Rust để giống codex là chi phí 800K dòng mà không đổi contract. Điều đáng chú ý hơn là codex cho thấy `core` + `tui` chiếm đúng hai vùng "khó sửa nhất" — và cả hai đều **có** bộ test riêng đậm đặc. Phần còn lại thì không.

---

## 2. Câu hỏi 2 — 1.429 file `.snap` dạy được gì về cách kiểm thử output của agent?

**Trả lời: chúng dạy một điều rất cụ thể và rất đáng học — _đơn vị khẳng định của một TUI là khung hình đã render_, không phải giá trị trả về.**

### Chúng nằm ở đâu

```
$ git ls-files '*.snap' | awk -F/ '{print $2}' | sort | uniq -c | sort -rn
   1329 tui
     72 core
     19 cli
      7 mermaid
      1 ext
      1 codex-mcp
```
**1.329 / 1.429 = 93%** nằm trong đúng một crate. Bên trong `tui`:
```
$ git ls-files '*.snap' | awk -F/ '{print $3"/"$4}' | sort | uniq -c | sort -rn | head -6
   404 tui/src/chatwidget
   344 tui/src/bottom_pane
   189 tui/src/snapshots
   138 tui/src/app
    91 tui/src/history_cell
    33 tui/src/transcript_view
```

### Chúng trông như thế nào

Đây là `insta`, và body là **văn bản terminal thật, đã bỏ màu**:
```
$ head -25 codex-rs/tui/src/chatwidget/realtime/snapshots/…voice_footer_renders….snap
---
source: tui/src/chatwidget/realtime/recording_controls_tests.rs
expression: "states.join(\"\n\n\")"
---
connecting:
 voice ◌ connecting                                                 /voice stop

› Ask Codex to do anything

  status line stays visible

listening:
 voice ● listening                                  ctrl+x mute     /voice stop
   mic ▁▁▁▁▁▁  codex ▁▁▁▁▁▁
…
```

Ba bài học cụ thể từ đúng file này:

1. **Một `.snap` giữ nhiều trạng thái, không phải một.** File trên gộp `connecting` / `listening` / `speaking` vào **một** assertion (`states.join("\n\n")`). Vì vậy 1.329 file đỡ được hàng nghìn test case. Đây là bài học tiết kiệm nhất.
2. **Cả khung hội thoại nằm trong khung hình.** Không chỉ dòng đang render — cả composer, cả status line, cả phần trượt bên dưới. Một regression làm hỏng bố cục chỉ lộ ra ở đây, không lộ ra ở test hàm.
3. **Bố cục được assert bằng byte, không bằng ý nghĩa.** Khoảng cách cột, ký tự `▌` hay `◌`, vị trí `/voice stop` — tất cả là ký tự thật. Đây là thứ mà test dựa trên `toContain` **không bắt được**.

### Vế còn lại — cái giá, phải nói thẳng

**1.329 file `.snap` cho 1.054 file nguồn `.rs` trong crate `tui`.** Corpus snapshot lớn hơn chính code nó bảo vệ. Mỗi thay đổi UI có chủ đích là một đợt viết lại hàng loạt file, và mọi snapshot đều có thể được `cargo insta accept` mà không ai đọc. Đây là chi phí bảo trì thật, không phải chiến lợi phí miễn phí.

### omp đã có tương đương chưa?

**Chưa có. Đo ra là 0 tuyệt đối:**
```
$ git ls-files '*.snap' | wc -l              → 0
$ git ls-files '**/__snapshots__/**' | wc -l  → 0
```
omp kiểm thử render bằng **assertion tay trong test**. Ví dụ `packages/tui/test/apply-patch-preview-render.test.ts`:
```ts
const rendered = Bun.stripANSI(
  editToolRenderer.renderCall({}, {expanded:false, isPartial:true, spinnerFrame:0, renderContext}, uiTheme)
    .render(160).join("\n"));
expect(rendered).toContain("src/a.ts");
expect(rendered).toContain("new a");
```
Quy mô: `git ls-files 'packages/tui/test/**' | wc -l` → **233 file test**. Nghĩa là omp có *nhiều hơn nhiều* bài kiểm tra hơn codex, nhưng **không bài nào** chụp lại toàn bộ khung hình.

omp **có** golden file ở đúng một nơi: `crates/pi-edit/tests/fixtures/apply_patch/scenarios/` — **25** kịch bản đánh số, mỗi cái có `input/`, `expected/`, `patch.txt`. Đây là cùng ý tưởng, nhưng bó trong một tool.

**Kết luận:** khoảng trống có thật, và là khoảng trống *có hình dạng rõ* — không phải "thêm test", mà là "thêm một tầng khẳng định ở trên tầng `toContain` sẵn có".

---

## 3. Câu hỏi 3 — cơ chế sandbox/approval nào omp chưa có?

### Sandbox: omp không có. Đo ra rất rõ.

```
$ git ls-files | grep -i sandbox
python/robomp/src/sandbox.py
python/robomp/tests/test_sandbox.py

$ git grep -ril "seatbelt\|landlock\|bubblewrap\|bwrap\|sandbox-exec" -- packages/ crates/
packages/coding-agent/src/tools/file-write-fallback.ts

$ git grep -rn "sandboxMode\|sandbox_mode" -- packages/
packages/ai/src/providers/cursor/proto/agent.proto:3931  ← tên một kiểu trong protobuf của Cursor
```
Hai kết quả đầu **không phải sandbox của omp**:
- `python/robomp/src/sandbox.py` tự mở đầu là "Per-issue workspace lifecycle: clone pool + git worktrees" — nó là quản lý vòng đời worktree và phân vùng quyền sở hữu file (`u=rwX,g=rwX,o=`), không gọi kernel.
- `file-write-fallback.ts` là một nhánh dự phòng khi không thể ghi file.
- Kết quả thứ ba là **một cái tên trong protobuf vendored của bên thứ ba**, không phải tính năng.

**Kết luận: omp không có nhốt sandbox ở tầng OS. Không phải "thiếu một option", mà là thiếu cả tầng.**

### codex có gì

**9 crate liên quan sandbox** (`git ls-files 'codex-rs/**/Cargo.toml' | grep -iE 'sandbox|execpolicy|bwrap|approval'`):

| Crate | File `.rs` | Dòng | Vai trò |
| --- | --- | --- | --- |
| `sandboxing` | 24 | 10.469 | **Điều phối đa-OS**: `seatbelt.rs` (macOS), `landlock.rs`+`bwrap.rs`+`linux_pid_namespace.rs` (Linux), `windows.rs`+`windows_mxc.rs` (Windows), `manager.rs`, `spawn.rs`, `violation.rs`, `denial.rs` |
| `linux-sandbox` | 31 | 12.747 | Bubblewrap; có `[[bin]] name="codex-linux-sandbox"` — binary riêng, dep `landlock`, `globset`, `libc` |
| `windows-sandbox-rs` | 114 | 28.762 | Windows |
| `windows-sandbox-service` | 29 | 5.375 | Service đi kèm |
| `mxc-sandbox` | 7 | 1.781 | sandbox thứ cấp |
| `bwrap` | 2 | 151 | Bọc/bundled bubblewrap (`config.h` + `build.rs`) |
| `execpolicy` | 13 | 2.975 | Ngôn ngữ chính sách lệnh (xem dưới) |
| `utils/approval-presets` | 1 | 77 | preset duyệt |
| `network-proxy` | 62 | 29.919 | Chặn egress, khớp với sandbox |

**Và 4 hồ sơ Seatbelt, 343 dòng** — toàn bộ chính sách macOS nằm ở dạng đọc được:
```
$ git ls-files '*.sbpl'
codex-rs/sandboxing/src/seatbelt_base_policy.sbpl
codex-rs/sandboxing/src/seatbelt_network_policy.sbpl
codex-rs/sandboxing/src/seatbelt_preferences_policy.sbpl
codex-rs/sandboxing/src/seatbelt_read_only_platform_defaults.sbpl
```
`seatbelt.rs` ghép chúng với `FileSystemSandboxPolicy`, `NetworkSandboxPolicy`, `WritableRoot` — tức là *filesystem sandbox và network sandbox là hai trục độc lập*, không gộp làm một.

### Approval: omp **đã có** và không cần học

```
$ wc -l packages/coding-agent/src/tools/approval.ts        → 387
$ wc -l packages/coding-agent/test/tools/approval*.test.ts  → 959 + 318
$ wc -l packages/coding-agent/test/tools/*ssh-url-approval*.test.ts → 129 + 76
$ head -3 docs/approval-mode.md
# Tool approval mode
Tool approval has three inputs:
```
omp có: **3 tầng tool** (`read`/`write`/`exec`), **3 chế độ** (`always-ask`/`write`/`yolo`), **3 quyết định** (`allow`/`deny`/`prompt`), cộng user-override. Đây là một hệ thống **đã hoàn chỉnh và đã kiểm thử 1.482 dòng**.

codex có enum khác hẳn (`codex-rs/protocol/src/protocol.rs:986`):
```rust
pub enum AskForApproval {
    UnlessTrusted,          // "untrusted"
    OnRequest,              // default, serde alias "on-failure"
    Granular(GranularApprovalConfig),
    Never,
}
```

**Hai mô hình này không cạnh tranh — chúng trục giao nhau.** codex hỏi *"khi nào hỏi con người"*; omp hỏi *"lớp rủi ro nào"* rồi suy ra lúc hỏi. codex ghép approval với sandbox (`SandboxPolicy`); omp ghép approval với tool tier. **Đừng port enum của codex sang omp** — sẽ phá `docs/approval-mode.md` và 1.482 dòng test đang đúng.

### execpolicy — thứ omp *thật sự* thiếu, và là thứ đáng học

`codex-rs/execpolicy/README.md`, trích nguyên văn:
> Policy engine and CLI built around `prefix_rule(pattern=[...], decision?, justification?, match?, not_match?)` plus `host_executable(name=..., paths=[...])`.

Ba ý thiết kế đáng chú ý:

1. **Quyết định là `allow` / `prompt` / `forbidden`**, gộp "có hỏi không" và "có cấm không" vào một trục duy nhất. omp tách thành `allow`/`deny`/`prompt` — cùng ba giá trị, khác vị trí trên trục.
2. **`match` / `not_match` là ví dụ kiểm thử nhúng trong luật.** README: *"`match` / `not_match` supply example invocations that are validated at load time (think of them as unit tests)"*. Luật mang theo bằng chứng rằng nó khớp và không khớp — tự bảo vệ khỏi việc trở thành bảo vệ mù.
3. **`justification` là trường bắt buộc về mặt ngữ nghĩa**: *`"Use jj instead of git."`* — cấm lệnh phải kèm đường thoát.

**Nhưng omp không hoàn toàn trắng.** `packages/coding-agent/src/tools/bash-interceptor.ts` đã có `BashInterceptorRule` biên dịch sang `RegExp` (`new RegExp(rule.pattern, flags)`, bỏ qua regex hỏng). Khác biệt là **mục đích**: interceptor *chặn để chỉ sang tool tốt hơn* (gõ `grep` → bảo dùng ripgrep), còn execpolicy *ra quyết định an toàn* với ba mức. Không thay thế nhau.

---

## 4. Câu hỏi 4 — đây là Codex của OpenAI hay một fork cùng tên?

**Đây là Codex của OpenAI. Không phải fork trùng tên.** Vì vậy cái học được **có giá trị** — nhưng vẫn phải lọc.

```
$ git remote -v
origin  https://github.com/openai/codex.git (fetch)
origin  https://github.com/openai/codex.git (push)
$ head -1 README.md
<p align="center"><strong>Codex CLI</strong> is a coding agent from OpenAI that runs locally on your computer.
$ grep Copyright LICENSE | tail -1
Copyright 2025 OpenAI
$ cat NOTICE
OpenAI Codex
Copyright 2025 OpenAI
This project includes code derived from [Ratatui](…/ratatui), licensed under the MIT license.
Copyright (c) 2016-2022 Florian Dehau
Copyright (c) 2023-2025 The Ratatui Developers
```
Ba dấu hiệu độc lập cùng chỉ một hướng: origin trùng tên chính thức, README tự nhận, `Copyright 2025 OpenAI` trong cả LICENSE lẫn NOTICE.

---

## 5. Pháp lý — nghĩa vụ khi chép

**Apache License, Version 2.0.** `LICENSE` dài 201 dòng, dòng 1-4 nguyên văn:
```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
```
Phụ lục cuối file, nguyên văn:
```
Copyright 2025 OpenAI

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
```
Khai báo `"license"` trong mọi `package.json` có trường đó:
```
$ git ls-files '*package.json' | ...
codex-cli/package.json                          :: "license": "Apache-2.0"
codex-rs/responses-api-proxy/npm/package.json   :: "license": "Apache-2.0"
sdk/typescript/package.json                     :: "license": "Apache-2.0"
package.json (gốc, private)                    :: <no license field>
```

### Nghĩa vụ cụ thể khi lấy code từ đây

Apache-2.0 **cho phép** chép, sửa, phân phối thương mại, và **không** có ràng buộc kiểu viral. Nhưng nghĩa vụ gồm **ba** mục, đều bắt buộc:

1. **Giữ nguyên văn `LICENSE`** (cả 201 dòng) trong bản phân phối.
2. **Giữ `NOTICE`, và giữ nguyên nó kể cả khi sửa.** `NOTICE` ở đây không rỗng — nó ghi công Ratatui:
   > This project includes code derived from Ratatui, licensed under the MIT license. Copyright (c) 2016-2022 Florian Dehau / Copyright (c) 2023-2025 The Ratatui Developers

   Đây là nghĩa vụ riêng của Điều 4(d). Xoá dòng này là **vi phạm**, không phải làm rõ.
3. **Tuyên bố đã sửa đổi** ở nơi phân phối (Điều 4(b)). Không được im lặng.

Apache-2.0 **không** yêu cầu ghi nguồn gốc dòng nào cũng phải mở. omp vẫn là MIT của chính mình; chỉ là phần *mượn* phải giữ nghĩa vụ Apache.

> ⚠️ **Cảnh báo đan xen.** `NOTICE` chứng minh codex đã vay code MIT của Ratatui. Nếu bao giờ lấy đúng phần code `tui` của codex, luồng nghĩa vụ là **Apache-2.0 + giữ phần Ratatui MIT** (giữ copyright Florian Dehau + The Ratatui Developers và permission notice của MIT). Đây là lý do `docs/sandbox.md` và `docs/execpolicy.md` ở codex chỉ là 150 byte — chúng là link ra ngoài, và phần cảnh báo thật sự nằm ở `NOTICE`, không nằm trong tài liệu.

---

## 6. Danh sách thứ omp chưa có — xếp theo đáng/không đáng

### Đáng

**1. Snapshot test khung hình cho TUI.**
- **Cỡ:** codex 1.329 `.snap` / 1,24 MB cho crate `tui`. omp: **0**.
- **Vì sao đáng:** là khoảng trống thật, hình dạng rõ, và bổ sung chứ không thay thế tầng `toContain` sẵn có của omp (`packages/tui/test/`, 233 file). Kỹ thuật đáng chép: gộp nhiều trạng thái vào một `.snap` bằng `states.join("\n\n")`, assert **toàn khung** (composer + status + lịch sử), byte thật sau khi bỏ màu.
- **omp đã có tương đương chưa:** không. Nhưng omp **đã** có mô hình golden ở `crates/pi-edit/tests/fixtures/apply_patch/scenarios/` (25 kịch bản `input/expected/patch.txt`) — nghĩa là đường ray sẵn có, chỉ chưa mở rộng ra TUI.
- **Cảnh báo:** **không** bê nguyên 1.329 file. Đó là chi phí bảo trì của họ, không phải mẫu. Chọn lọc — `bottom_pane` (344) và `chatwidget` (404) là hai vùng dày nhất và cũng là hai vùng khó sửa nhất, nên bắt đầu từ đó.

**2. Tách filesystem-sandbox khỏi network-sandbox thành hai trục.**
- **Cỡ:** `SandboxPolicy` + `NetworkSandboxPolicy` + `WritableRoot`; 343 dòng `.sbpl`; `network-proxy` 62 file / 29.919 dòng.
- **Vì sao đáng:** ngay cả khi omp chưa làm sandbox, **tách hai trục ngay từ đầu** rẻ hơn nhiều so với gộp rồi tách sau. Hiện tại omp không có khái niệm nào cả hai; khi thêm, một enum đơn lẻ sẽ thành nợ kỹ thuật.
- **omp đã có tương đương chưa:** không (`git grep sandboxMode` trên `packages/` → 0 hit ngoài protobuf vendored).

**3. `match` / `not_match` — luật mang theo bằng chứng.**
- **Cỡ:** `codex-rs/execpolicy/src/rule.rs` + `parser.rs`, tổng crate 13 file / 2.975 dòng.
- **Vì sao đáng:** ý *"example invocations validated at load time (think of them as unit tests)"* giải đúng một bài toán mà mọi hệ thống allowlist đều mắc: luật regex viết sai thì fail-closed một cách âm thầm. Đây là bài học **thiết kế luật**, không phụ thuộc ngôn ngữ, không phụ thuộc Rust.
- **omp đã có tương đương chưa:** một nửa. `bash-interceptor.ts` đã biên dịch `BashInterceptorRule` → `RegExp` và bỏ qua regex hỏng — nhưng là để *chuyển hướng tool*, không phải để *ra quyết định an toàn*. Không có tầng ví dụ kiểm thử nhúng trong luật.

**4. `justification` bắt buộc kèm lệnh cấm.**
- **Cỡ:** một trường trong `prefix_rule` (`codex-rs/execpolicy/README.md`).
- **Vì sao đáng:** nguyên văn README khuyến nghị `"Use jj instead of git."` — cấm một lệnh mà không chỉ đường thoát là cấm mà người dùng không biết cách vây. Rẻ, và nâng chất một hệ thống policy rất nhiều.
- **omp đã có tương đương chưa:** không. `packages/coding-agent/src/tools/ssh-url-approval.ts` là hẹn giờ duy nhất liên quan.

### Không đáng

**5. `models.json` dạng blob sinh sẵn 405 KB.**
```
$ wc -c codex-rs/models-manager/models.json   → 405645
$ head -c 200 codex-rs/models-manager/models.json
{"models":[{"slug":"gpt-6.astra","prefer_websockets":true,…}]}
```
Cấu trúc này gắn chặt với một hệ OpenAI: `use_responses_lite`, `multi_agent_version`, `tool_mode: "code_mode_only"`, `prefer_websockets`. `codex-rs/model-provider-info` là **registry Rust** với provider mặc định nằm trong binary cộng override ở `~/.codex/config.toml`.

omp đã ở hướng ngược lại và **đi xa hơn**: `git ls-files 'packages/catalog/src/compat/rules/**' | wc -l` → **222 file KDL**, biên dịch bằng `bun run gen:compat` thành `rules.json`, với các trục `taxonomy` / `classes` / `providers` / `runtime`, và quy tắc của omp (`AGENTS.md`) cấm rõ ràng mọi điều kiện theo danh tính model trong TypeScript. Cách đó **kiểm toán được trong nguồn**; blob JSON thì không. **Không chép.**

**6. Biến `core` + `tui` thành Rust.**
- 851K dòng (`core` 425.831 + `tui` 425.296) để đổi một ngôn ngữ, không đổi một contract. Ranh giới hiện tại của omp — Rust cho phần nóng (`crates/pi-natives`, 210 file), TypeScript cho agent loop và TUI — là quyết định đúng. **Giữ nguyên.**

**7. `network-proxy` 29.919 dòng.**
Đây là công cụ kiểm soát egress của một hãng, phục vụ chính sách doanh nghiệp. Không thuộc phạm vi sản phẩm cá nhân. **Bỏ qua.**

**8. `app-server` (330 file / 185.929 dòng) + `codex-mcp` + `rmcp-client`.**
omp đã có `modes/rpc/` (11 file) và `mcp/json-rpc.ts`. Chênh lệch là **cấp độ protocol**, chứ không phải thiếu hẳn. Xem lại ở milestone khác, không phải M6.

---

## 7. Danh sách "đừng chép" — gói gọn

| # | Thứ | Vì sao |
| --- | --- | --- |
| 1 | Layout Rust thuần (135 crate) | omp đã chọn ranh giới theo *loại việc*; đổi sang theo *ngôn ngữ* là 851K dòng không đổi contract |
| 2 | `models.json` blob 405 KB | Gắn chặt OpenAI; omp đã có 222 file KDL kiểm toán được, đi xa hơn |
| 3 | Enum `AskForApproval` (unless-trusted/on-request/granular/never) | Phá `docs/approval-mode.md` + 1.482 dòng test đang đúng; hai mô hình trục giao nhau, không thay thế |
| 4 | Toàn bộ 1.329 file `.snap` | Corpus lớn hơn code; chọn lọc `bottom_pane` + `chatwidget` |
| 5 | `analytics` crate (27 file / 16.543 dòng) | Telemetry sản phẩm OpenAI; chỉ tắt được qua `config.analytics = false` (`codex-rs/config/src/types.rs:226`) |
| 6 | `network-proxy` (62 file / 29.919 dòng) | Kiểm soát egress doanh nghiệp, ngoài phạm vi sản phẩm cá nhân |
| 7 | `app-server` + `rmcp-client` (429 file) | omp đã có RPC ở cấp khác; chênh lệch cấp độ protocol, không phải M6 |
| 8 | `codex-cli/bin/codex.js` | Shim 8,6 KB spawn binary dựng sẵn — không có gì để học |

---

## 8. Không biết / cần kiểm thêm

- **Chưa đọc** 4 file `.sbpl` (343 dòng) và `landlock.rs`. Đủ để kết luận "có sandbox ba lớp", chưa đủ để đề xuất port — cần đọc trước khi có bất kỳ kế hoạch sandbox nào cho omp.
- **Chưa đọc** `codex-rs/core/tests/suite/approvals.rs` (176 KB — file test lớn nhất tìm thấy). Đáng đọc nếu M-scope nào đụng approval.
- **Chưa xác minh** `ext/` (17 crate con, 275 file) có phải hệ plugin mở rộng được bên ngoài hay chỉ là nội bộ. `codex-rs/ext/extension-api/` gợi ý là API thật, nhưng chưa đo API surface.
- **Chưa so** `guardian-v2` (auto-review: 37 file / 12.225 dòng) với `packages/coding-agent/src/prompts/agents/reviewer.md` của omp. omp có prompt reviewer; codex có cả scorer async lẫn reviewer sync. Chưa rõ tương đương tới đâu.
- **Chưa xác minh** `code-mode` (`code-mode`, `code-mode-host`, `code-mode-runtime`, `code-mode-protocol` — 104 file, ~30K dòng) là gì. Tên gợi ý thay thế tool-call bằng code thay vì gọi tool. Nếu đúng, đây là ứng viên M-scope lớn và **chưa được đánh giá**.
- **Chưa đo** tỉ lệ test của `core` so với code chạy thật (1.072.974 dòng không test trên 4.925 file), nên chưa nói được `core` được kiểm thử tốt hay kém.
- **Môi trường đo chỉ là checkout Darwin.** Không kiểm hành vi Windows sandbox (`windows-sandbox-rs` 114 file) hay WSL — những phần đó chỉ được đọc qua tên file.

---

## 9. Một câu để M6 mang đi

Mọi repo đã audit sẵn đều dạy omp *cách dựng*. `codex` là repo đầu tiên trong loạt này dạy **cách kiểm thử** — và nó dạy bằng cách phủ nhận: 1.054 file nguồn TUI, 1.329 file snapshot, **một** mẫu học. Nếu M6 chỉ lấy đúng một thứ từ đây, hãy lấy `states.join("\n\n")` — gộp nhiều trạng thái vào một assertion, chụp **toàn khung** chứ không chụp từng dòng — rồi bắt đầu từ `bottom_pane`. Đừng lấy phần còn lại.
