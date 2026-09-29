## Cổng chấp nhận và pháp lý (§7–§8) — phần đuôi milestone

Biến mười ba cổng chấp nhận viết bằng văn xuôi ở §7.1 thành **một script duy nhất** người review chạy từ repo root, và biến bảng phân loại bốn dòng ở §8 thành **một tài liệu** mà bảo trì viên thực sự ký được. Không gì được ship cho tới khi script nói `XANH`.

**Hiệu ứng người dùng thấy:** không có. Đây là việc nội bộ — không đường dẫn runtime, không UI, không prompt. Thứ duy nhất người dùng từng có thể nhận ra là khi các cổng bị sai, vì một cổng đỏ chặn một bản phát hành lẽ ra đã được ship, hoặc một thay đổi wheel-ramp hỏng lẽ ra đã bị bắt.

**Sóng / phạm vi:** §7–8 — **đuôi milestone**, chạy sau Sóng 6, **không phải một sóng thứ bảy**. Nó không nằm trong sáu sóng của M3 (xem mục *Cần người quyết*, câu SCOPE).

**Effort:** **S** — khoảng nửa ngày. Một script shell (~120 dòng kể cả tám stub test-gate), một tài liệu markdown (~150 dòng), một phụ lục CONTRIBUTING tùy chọn tám dòng. Không code runtime, không dependency mới, không prompt, không thay đổi model/provider. Cái giá nằm ở việc **đọc** chứ không phải viết: các neo của §7.1/§8 trong plan phần lớn đã cũ, và từng cái đều phải ghim lại vào cây trước khi mã hoá được.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `scripts/m3-acceptance-gates.sh` | tạo | Toàn bộ nửa máy-kiểm-tra-được của §7.1, dạng chạy được. Một script shell, `set -uo pipefail` (**không** `set -e` — xem bước 2), chạy từ repo root. Mã hoá **mười ba** cổng (G1–G11, G4b, G12) đúng như plan dòng 8988–9029 định nghĩa. In một dòng `XANH`/`DO` cho mỗi cổng, một lý do khi đỏ, và exit khác 0 nếu bất kỳ cổng nào đỏ. Cố ý là `.sh`, không phải `.ts` và không phải `*.test.ts` — xem ghi chú source-grep của AGENTS.md trong mục *Rủi ro*. | **Có.** `ls scripts/ \| grep -iE 'gate\|accept\|m3\|check-'` hôm nay chỉ trả `check-spoofed-versions.ts` — chưa có script cổng nào. Cổng thực thi duy nhất trong cả plan là khối `bash` nội tuyến ở `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9011-9026` (G5), xác nhận bằng `sed -n '9011,9026p'`. Shell cũng là chính định dạng của plan: các cổng được viết dạng bash ở đó, và plan mô tả chúng là được dán từ repo root, tức thời điểm review, không phải CI. |
| `docs/clean-room-policy.md` | tạo | Nửa §8 hiện chỉ là văn xuôi. Mang: (a) bảng phân loại bốn dòng A3/A7/A8/D2 từ bảng §8.2 của plan, dòng 9076-9081 (bốn hàng A7/D2/A8/A3; ở bản `808b365` là 7569-7574 — con số 7620-7625 trỏ vào §9 RỦI RO, không phải bảng này) dưới dạng **SIGN-OFF GRID** có cột ký; (b) các nghĩa vụ của §8.4 phát lại thành luật mà người triển khai có thể bị buộc tuân thủ; (c) luật về provenance của §8.5 cho bất cứ thứ gì thực sự đi vào oh-my-pi từ một upstream cho phép. Nói rõ tài liệu này không phải ý kiến pháp lý, và các mục 1, 3, 4 của §8.6 vẫn là những chữ ký của con người chưa trả lời. | **Có.** `ls docs/ \| grep -iE 'licen\|clean\|attribut\|third\|notice\|contribut\|legal\|provenance'` trả 0 kết quả — hôm nay trong `docs/` không có tài liệu licensing, provenance hay clean-room nào. Lỗ hổng 8.6 #5 là có thật và hiện chưa đóng. |
| `CONTRIBUTING.md` | sửa | **CÓ ĐIỀU KIỆN** — chỉ khi con người trả lời §8.6 #5 là "yes, add the addendum". Thêm một mục con `## Clean-room provenance` vào khối `## Contribution licensing` sẵn có, nêu đích danh rủi ro cụ thể (cây mã nguồn độc quyền bị dịch ngược) mà văn bản hiện tại không nêu. KHÔNG sửa tại chỗ dòng 82-91; câu sẵn có là đúng và phải sống nguyên văn. | **Có.** `sed -n '82,91p' CONTRIBUTING.md` xác nhận trích dẫn của plan là chính xác: "You must have the right to submit your contribution and must preserve applicable copyright, license, attribution, and notice material." Nó đòi quyền được đóng góp nhưng không nêu rủi ro cụ thể nào — đó chính xác là khoảng trống mà 8.6 #5 chỉ ra. Nếu câu trả lời là "no", để nguyên file này và ghi quyết định vào lưới ký của tài liệu. |

### Các bước

1. **DỪNG lại, lấy hai câu trả lời của con người trước khi viết bất kỳ cổng nào** — vì cả hai đều thay đổi cách cổng **NÓI**, chứ không chỉ việc chúng có pass hay không. **Q-A (§8.6 #5):** có viết chính sách clean-room ra thành file `docs/`, thành phụ lục CONTRIBUTING, hay cả hai? **Q-B (§8.6 #1):** đã có người đọc Commercial Terms hiện hành của Anthropic về reverse engineering, derivative works và UI simulation chưa? Nếu Q-B chưa trả lời, tài liệu vẫn được đưa vào, nhưng lưới ký của nó **phải** hiện §8.6 #1 là `OPEN` và tài liệu **không được** khẳng định clean-room status. Viết cổng trước rồi đọc lại chúng thì rẻ; viết lại một thế đứng pháp lý thì không. — neo `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9112-9119`

2. **Tạo `scripts/m3-acceptance-gates.sh`** với một helper duy nhất `gate <id> <description> <command...>` chạy lệnh, in `  XANH <id>` hoặc `  DO   <id>  <why-it-is-red>`, và cộng dồn một bộ đếm thất bại. Exit 1 ở cuối nếu bộ đếm khác 0. **Không** để một cổng đơn lẻ abort cả lượt chạy — người review cần cả mười ba kết quả trong một lượt, và `set -e` trên một lệnh trần sẽ giấu mười hai cái còn lại. Dùng `set -uo pipefail` và xử lý thất bại tường minh bên trong helper. Giữ nguyên vốn từ XANH/DO mà plan đã dùng để đầu ra **diff được** với plan dòng 8988-9029. — neo `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:8988-8989`

3. **Mã hoá bốn cổng COUNT trước**, vì chúng là những cái duy nhất đang đỏ hôm nay và do đó là những cái duy nhất chứng minh được script có thể fail. **G4:** assert `{ grep -rn 'event\.wheel \* [0-9]' packages/tui/src --include='*.ts'; grep -rn 'delta \* [0-9]' packages/tui/src --include='*.ts'; } | grep -v '^packages/tui/src/mouse-wheel\.ts:' | wc -l` == 0. Hôm nay kỳ vọng **9**. **G4b:** với từng file trong **CHÍN** file ở bước 4, assert `grep -q 'mouse-wheel' <file>`. Hôm nay kỳ vọng **0/9**. **G5:** dán nguyên văn khối của plan từ dòng 9011 (nó vốn đã trả left=7, kept=3, và in từng dòng theo site để một cổng đỏ chỉ tên thủ phạm). **G10:** dùng dạng **ĐÃ SỬA** từ bước 5, không dùng dạng nguyên văn của plan. Chạy thử toàn script và xác nhận nó báo đúng `G4 DO`, `G4b DO`, `G5 DO`, `G10 XANH` **trước khi** thêm bất cứ thứ gì khác. — neo `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9011-9026`

4. **Mã hoá CHÍN file G4b lấy từ cây, không lấy từ plan** — danh sách của plan có số dòng cũ và phần văn xuôi đếm số của nó tự mâu thuẫn với bảng của chính nó. Chín file, đã kiểm chứng: `packages/tui/src/overlays/agent-transcript-viewer.ts:470`, `packages/tui/src/overlays/plan-review-overlay.ts:580`, `packages/tui/src/overlays/rewind-selector.ts:245`, `packages/tui/src/apps/debug/log-viewer.ts:639`, `packages/tui/src/overlays/usage-dashboard.ts:759`, `packages/tui/src/overlays/copy-selector.ts:214`, `packages/tui/src/apps/git/sidebar.ts:897`, `packages/tui/src/apps/debug/raw-sse.ts:168`, `packages/tui/src/apps/git/git-tui.ts:697`. Tám file dùng `event.wheel * 3`, `usage-dashboard` dùng `event.wheel * 2`, và `sidebar.ts` là trường hợp lạ dùng `delta * 3` — **chính vì vậy cổng phải quét CẢ HAI mẫu**. Assert cả chín file đều import `mouse-wheel`; hôm nay không file nào, nên cổng này đỏ **vì lý do đúng**. — neo `packages/tui/src/apps/git/sidebar.ts:897`

5. **Mã hoá G10 ở dạng ĐÃ SỬA.** Lệnh nguyên văn của plan `grep -rn 'mock.module' packages/coding-agent/test packages/tui/test` hôm nay trả về **2**, và cả hai hit đều là comment nói rõ bộ test KHÔNG dùng nó. Một cổng đỏ trên một cây đúng sẽ huấn luyện người review bỏ qua nó — đúng thất bại mà plan chẩn đoán cho G4. Dùng `grep -rnE 'mock\.module\(' packages/coding-agent/test packages/tui/test | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*)'` và assert 0. Đã kiểm chứng: lệnh này trả 0 hôm nay. Thêm **G12**, cổng contamination từ §8.5, giới hạn phạm vi `packages/ scripts/ docs/` và **loại trừ tường minh** `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` cùng `.lavish-wip/` — một grep toàn repo hôm nay trả 5 hit, **TẤT CẢ** nằm trong tài liệu plan đã commit, đó là mệnh đề đúng về plan và báo động giả về sản phẩm. Giá trị kỳ vọng 0. — neo `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:8998`

6. **Mã hoá tám cổng TEST (G1, G2, G3, G6, G7, G8, G9, G11)** dưới dạng kiểm tra *tồn tại + pass* trên đúng các file test mà sóng tương ứng đã nêu — **không** tự dựng lại thân của chúng, các spec anh em sở hữu phần đó. Mỗi cổng là `test -f <path>` **VÀ** `bun test <path>` exit 0, với thông báo đỏ nói rõ sóng nào phải đến trước. **G6** assert thêm rằng `packages/coding-agent/test/mcp/elicitation-capability.test.ts` tồn tại; hôm nay nó **không** (đã kiểm chứng), nên G6 đỏ cho tới khi A2/D1 đến — điều đó là đúng. **G8** phải assert fixture của loader render ra hàng **NHIỀU DÒNG** — `packages/tui/src/components/loader.ts:107` chỉ render trailer khi `lines.length > 1`, nên một fixture một dòng làm cho phép assert trở nên vô nghĩa. **G9** đọc `docs/tui-core-renderer.md:107` và `:174`, cả hai hôm nay đều có và đúng. — neo `packages/tui/src/components/loader.ts:107`

7. **Viết `docs/clean-room-policy.md`.** Mục 1 = lưới ký bốn dòng (A3 omp-native shape + hằng số đo lại; A7 omp-native; A8 black-box + omp-native; D2 omp-native) với cột chữ ký/ngày còn trống, chép từ bảng của plan nhưng với cột neo **ĐÃ KIỂM CHỨNG LẠI** trên cây — ba neo của plan sai (`ui-helpers.ts:141`→`143`, `settings.ts:108`→`110`, `usage-dashboard.ts:753`→`759`). Mục 2 = các nghĩa vụ của §8.4 dưới dạng danh sách làm/không-làm. Mục 3 = những gì thực sự đi vào oh-my-pi từ một upstream cho phép đòi hỏi (văn bản license được ghi lại, dòng copyright, một mục thêm vào file notices). Mục 4 = các chữ ký còn mở của con người (8.6 #1, #3, #4, #5) đánh dấu `OPEN`. **Không** nêu `claude-code-ref` ở bất cứ đâu trong tài liệu như một đầu vào build; §8.4 cấm pin commit của nó, và một tài liệu có pin nó trở thành chính cái thứ được pin, theo tham chiếu. — neo `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9116-9134`

8. **Đưa phụ lục `CONTRIBUTING.md` vào** *chỉ khi* Q-A của bước 1 yêu cầu. Chạy script một lần cuối và **dán toàn bộ đầu ra không sửa một chữ** vào mô tả PR. Một gate script mà đầu ra của nó bị diễn giải lại trong review là một gate bị tranh luận thay vì được đọc. — neo `CONTRIBUTING.md:82`

### Hình dạng code

Bản phác thảo dưới đây chỉ mã hoá **năm** cổng COUNT (G4, G4b, G5, G10, G12). Tám cổng TEST (G1, G2, G3, G6, G7, G8, G9, G11) được thêm ở bước 6 bằng tám lời gọi `gate_test <id> <path> <wave>`; bản phác thảo chỉ để người đọc thấy **hình dạng** helper, và `grep -c gate_test` trên bản phác thảo này trả đúng **1** — chính dòng định nghĩa, không có call site nào. Mỗi cổng, kể cả G4b, in **đúng một** dòng.

```bash
#!/usr/bin/env bash
# M3 acceptance gates — run from the repo root: ./scripts/m3-acceptance-gates.sh
# Each gate states what it asserts and what a red result MEANS. Gates that are
# red today are red for three DIFFERENT reasons, and the reason must be printed:
#   (a) the work is not done yet      — G4, G4b, G5
#   (b) the native addon is not built — G1/G2/G3 and the tmux gate
#   (c) a not-yet-written test file   — G6, G7, G8, G9, G11
# Collapsing (b) or (c) into (a) is a lie the reviewer cannot detect.
# Do not 'fix' a red gate by editing it.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

FAILED=0
fail() { printf '  DO   %-4s %s\n' "$1" "$2"; FAILED=$((FAILED + 1)); }
ok()   { printf '  XANH %-4s %s\n' "$1" "$2"; }

gate_eq() { # gate_eq <id> <expected> <actual> <what-it-means-when-red>
  if [ "$3" -eq "$2" ]; then ok "$1" "$3/$2"; else fail "$1" "$3 (muc $2) — $4"; fi
}

# --- G4: no raw wheel multiplier survives outside the shared module -----------
WHEEL=$( { grep -rn 'event\.wheel \* [0-9]' packages/tui/src --include='*.ts'
           grep -rn 'delta \* [0-9]'     packages/tui/src --include='*.ts'; } \
         | grep -v '^packages/tui/src/mouse-wheel\.ts:' | wc -l | tr -d ' ')
gate_eq G4 0 "$WHEEL" "mot literal con lai; overlay ramp canh khong ramp"

# --- G4b: all nine sites import the shared module -----------------------------
WHEEL_FILES=( packages/tui/src/overlays/agent-transcript-viewer.ts
              packages/tui/src/overlays/plan-review-overlay.ts
              packages/tui/src/overlays/rewind-selector.ts
              packages/tui/src/apps/debug/log-viewer.ts
              packages/tui/src/overlays/usage-dashboard.ts
              packages/tui/src/overlays/copy-selector.ts
              packages/tui/src/apps/git/sidebar.ts
              packages/tui/src/apps/debug/raw-sse.ts
              packages/tui/src/apps/git/git-tui.ts )
miss=()
for f in "${WHEEL_FILES[@]}"; do grep -q 'mouse-wheel' "$f" || miss+=("$f"); done
if [ ${#miss[@]} -eq 0 ]; then ok G4b "9/9"
else fail G4b "thieu import: ${miss[*]}"; fi

# --- G5: read-group membership (plan lines 9011-9026, verbatim) ---------------
hits=$(grep -nE '[!=]== "read"' \
  packages/tui/src/chat/read-tool-group.ts \
  packages/tui/src/chat/chat-transcript-builder.ts \
  packages/coding-agent/src/modes/utils/ui-helpers.ts \
  packages/coding-agent/src/modes/controllers/event-controller.ts)
left=$(printf '%s\n' "$hits" | grep -v 'event-controller\.ts:[0-9]*:.*event\.toolName === "read"' | wc -l | tr -d ' ')
kept=$(printf '%s\n' "$hits" | grep -c 'event\.toolName === "read"')
printf '%s\n' "$hits"   # in the remaining sites so a red gate names the culprit
if [ "$left" -eq 0 ] && [ "$kept" -eq 3 ]; then ok G5 "left=0 kept=3"
else fail G5 "membership con lai=$left (muc 0) | inline giu nguyen=$kept (muc 3)"; fi

# --- G10: no mock.module() calls (CALL form; the corpus documents the ban) ---
MM=$(grep -rnE 'mock\.module\(' packages/coding-agent/test packages/tui/test \
      | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*)' | wc -l | tr -d ' ')
gate_eq G10 0 "$MM" "mock.module() global registry leak sang file khac"

# --- G12: no reference-tree contamination in shipped source -------------------
CONTAM=$(grep -rn 'claude-code-best' packages/ scripts/ docs/ 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
gate_eq G12 0 "$CONTAM" "van con tham chieu cay dich nguoc trong ma ship"

# --- G1,G2,G3,G6,G7,G8,G9,G11: file exists AND passes ------------------------
gate_test() { # gate_test <id> <test-path> <which-wave>
  if [ ! -f "$2" ]; then fail "$1" "thieu $2 — can $3"
  elif bun test "$2" >/dev/null 2>&1; then ok "$1" "$2"
  else fail "$1" "FAIL $2 — xem contract cua $3"; fi
}

exit $(( FAILED > 0 ))
```

### Hợp đồng test

**Mục này không ship `*.test.ts` mới, và đó là kết quả ĐÚNG** — lập luận bên dưới là một phát hiện, không phải một lối tắt.

**(1)** Các cổng ở §7.1 là source grep. AGENTS.md cấm source-grep trong test một cách dứt khoát: *"A test that reads an implementation file (.ts/.rs/build script) and asserts on its text — `expect(src).toContain("someCall()")` … is banned. It tests how code _looks_, not what it _does_."* G4, G4b, G5 và G10 chính là các phép đếm `grep -rn`. Đặt chúng vào một `*.test.ts` sẽ đúng cái hình dạng bị cấm. Plan đã nhìn thấy một nửa vấn đề — ghi chú G5 của nó nói phép grep "bổ sung cho" test hành vi chứ không thay thế nó. Nên nửa grep thuộc về một script shell người review chạy, còn nửa hành vi thuộc về các file test mà spec anh em đã chỉ định. Không bên nào thuộc về một file mới được viết ở đây.

**(2)** Một hợp đồng pháp lý duy nhất tail1 có thể sở hữu thực sự đã có người sở hữu. `scripts/ci-release-publish.ts:97` export `legalPayloadFiles(license)`, `:100` trả payload, `:102` **ném** `Unsupported package license` khi license thiếu hoặc không phải MIT. `scripts/ci-release-publish.test.ts:144-145` assert cả hai nhánh ném. Vậy nên "mọi package phát hành đều khai một license" **đã** được cưỡng chế tại thời điểm publish và **đã** có test. AGENTS.md: *"Don't duplicate coverage across abstraction levels. If an integration test already proves the behavior, drop the narrower unit test that restates it."* Thêm một test license ở đây sẽ là phần trùng lặp chỉ có thể thối.

**(3)** Nếu hồi quy, người tiêu dùng thấy gì: lượt chạy cổng của người review **mất đi độ tin cậy**. Dạng hỏng không phải crash — nó là một cổng xanh mà không có nghĩa gì, hoặc một cổng đỏ trên một cây đúng khiến cả đội tự đánh dấu qua cổng. Cả hai đều im lặng. G10 ở dạng nguyên văn của plan đã ở trạng thái thứ hai ngay hôm nay (2 hit, cả hai là comment) — đó là lý do bước 5 sửa nó trước khi viết bất cứ dòng nào.

Phần cứng vững do đó là **SCRIPT cộng exit code của nó**, và cổng dưới đây được **đo**, không được *khẳng định bằng văn xuôi*.

### Xác minh

```bash
# All from repo root. T1 is the load-bearing one: it is red today and must go green when A3 lands.

# T1 — G4 + G4b: nine wheel multipliers exist today; all nine must import the shared module.
{ grep -rn 'event\.wheel \* [0-9]' packages/tui/src --include='*.ts'
  grep -rn 'delta \* [0-9]'     packages/tui/src --include='*.ts'; } \
  | grep -v '^packages/tui/src/mouse-wheel\.ts:' | wc -l
# TODAY: 9. MUST BE: 0 after M3-A3.

# T2 — CHẠY SAU KHI tạo xong `scripts/m3-acceptance-gates.sh` ở bước 2.
# Hôm nay file này chưa tồn tại, nên lệnh dưới đây trả `No such file or directory`
# — đó là đúng, không phải cổng đỏ.
./scripts/m3-acceptance-gates.sh; echo "exit=$?"
# SAU KHI TẠO, kỳ vọng: G4 DO, G4b DO, G5 DO, G10 XANH, exit=1.
# SAU KHI A6: G5 XANH. SAU KHI A3: G4 + G4b XANH.

# T3 — G5's two-sided arithmetic still holds (7 membership, 3 inline today).
hits=$(grep -nE '[!=]== "read"' packages/tui/src/chat/read-tool-group.ts \
  packages/tui/src/chat/chat-transcript-builder.ts \
  packages/coding-agent/src/modes/utils/ui-helpers.ts \
  packages/coding-agent/src/modes/controllers/event-controller.ts)
printf '%s\n' "$hits" | grep -vc 'event\.toolName === "read"'   # TODAY: 7, MUST BE: 0
printf '%s\n' "$hits" | grep -c  'event\.toolName === "read"'    # TODAY: 3, MUST STAY: 3

# T4 — G10 corrected form is clean (the plan's literal form is NOT; it returns 2).
grep -rnE 'mock\.module\(' packages/coding-agent/test packages/tui/test \
  | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*)' | wc -l   # MUST BE: 0

# T5 — G12 contamination is clean once scoped off the plan document.
grep -rn 'claude-code-best' packages/ scripts/ docs/ | grep -v node_modules | wc -l  # MUST BE: 0

# T6 — the whole milestone typechecks (does not need the native addon; verified exit 0 at HEAD e040a60).
bun run check:ts

# T7 — only AFTER the addon is built. Until then these report 0 pass with
#     'Failed to load pi_natives native addon for darwin-arm64'. Note the failure is
#     FILE-SCOPED, not global: packages/tui/test/mouse.test.ts passes 13/13 today.
bun test packages/tui/test/mouse.test.ts packages/tui/test/loop-watchdog.test.ts \
          packages/coding-agent/test/status-line-overflow.test.ts \
          packages/coding-agent/test/status-line-settings-cache.test.ts \
          packages/coding-agent/test/mcp/elicitation-capability.test.ts \
          packages/tui/test/read-group-membership.test.ts \
          packages/tui/test/daltonized-theme.test.ts

# T8 — the published-package licence contract still holds (already enforced upstream; asserted here as a smoke check only).
for f in packages/*/package.json; do python3 -c "import json;d=json.load(open('$f'));assert d.get('license')=='MIT','$f'"; done
```

Dự án cấm `tsc`/`npx tsc`; T6 dùng `bun run check:ts`.

### Cổng hoàn thành

`DONE` nghĩa là cả năm điều sau, và mỗi điều có thể fail độc lập:

1. **`./scripts/m3-acceptance-gates.sh`** tồn tại, chạy được từ repo root, in một dòng `XANH`/`DO` cho mỗi cổng, và exit 1. **NGAY KHI TẠO XONG, nó sẽ EXIT 1 — các con số bên dưới đã đo từng lệnh trên cây này, chưa đo ở cấp script vì script chưa tồn tại.** Đỏ vì **việc chưa làm**: G4 = 9 (cần 0), G4b = 0/9 (cần 9/9), G5 `left`=7 (cần 0), G6 thiếu `elicitation-capability.test.ts`. Đỏ vì **addon chưa build** (KHÔNG phải vì việc): G1/G2/G3 và cổng tmux chạy `bun test` trên `status-line-overflow.test.ts`, `status-line-settings-cache.test.ts`, `loop-watchdog.test.ts`, cả ba đều chết với `Failed to load pi_natives native addon for darwin-arm64` (0 pass / 1 fail). Hai file test status-line **đã tồn tại**, nên G1-G3 sẽ vẫn đỏ sau khi s1 đến cho tới khi addon được build. Đỏ vì **chưa tới**: `elicitation-capability.test.ts`, `read-group-membership.test.ts`, `daltonized-theme.test.ts` chưa tồn tại. Trong bảy file của T7, hôm nay đúng **một** file xanh (`mouse.test.ts`, 13/13). Script phải in lý do theo loại này, không gộp chung một thông điệp "chưa làm".
2. **G4 và G4b nêu đủ CHÍN site** với số dòng đúng, đã kiểm chứng bằng `git grep` trên cây — **KHÔNG** phải danh sách của plan, trong đó cả bảy neo `* 3` đều cũ (`agent-transcript-viewer` 469→470, `copy-selector` 212→214, `plan-review-overlay` 581→580, `rewind-selector` 232→245, `git-tui` 693→697, `raw-sse` 167→168, `log-viewer` 638→639) và `usage-dashboard.ts:753` thực ra là 759.
3. **G10 dùng dạng lời gọi** và trả 0, còn dạng nguyên văn của plan bị gọi tên trong một comment là sai (2 hôm nay, cả hai là comment).
4. **`bun run check:ts`** exit 0. Đo tại HEAD `e040a60`: exit 0, cả **16** package type-check đều `Done`. (Con số 12 là số package **published**, xem hàng cuối bảng *Đính chính* — không phải số package `check:ts` type-check.)
5. **`docs/clean-room-policy.md`** tồn tại, mang đủ bốn dòng phân loại với neo đã sửa, và lưới ký của nó hiện các mục §8.6 1/3/4/5 đúng trạng thái thật của chúng — `OPEN`, chứ không bị tick âm thầm. Nếu con người đã trả lời Q-A, `CONTRIBUTING.md` mang phụ lục và câu licensing gốc của nó sống nguyên văn.

**Cổng này có thực sự đỏ được không? Có — theo ba cách độc lập, tất cả đều đo trên cây này chứ không suy luận.**

- **THỨ NHẤT:** các cổng đỏ trước khi có việc. G4 = 9 (cần 0), G4b = 0/9 (cần 9/9), G5 `left` = 7 (cần 0), file G6 vắng. **Nếu ai đó đưa script vào mà sáng thứ Hai các cổng ra xanh, các cổng đó hỏng** — đó chính là thất bại mà cổng này được thiết kế để bắt, và nó là cùng một bệnh lý mà plan chẩn đoán trong chính ghi chú viết lại của G4: *"the old gate self-adjusted and could not distinguish A3 done from A3 not done"*.
- **THỨ HAI:** G10 bắt được chính lỗi lịch sử của nó. Dạng nguyên văn của plan trả 2 trên một cây hoàn toàn đúng, vì hai file test chứa comment giải thích chúng **không** dùng mock.module. Người review hoặc vá cổng, hoặc đánh dấu qua. Dạng đã sửa trả 0.
- **THỨ BA:** một neo cũ bị bắt. Bảy số dòng `* 3` của plan đều sai (lệch từ +1 đến +13). Một script chép từ văn xuôi của plan thay vì từ cây sẽ grep chín file ở chín dòng sai; nếu một chỉnh sửa sau này làm chúng dịch chuyển, nửa kiểm tra tồn tại vẫn pass trong khi ý định thì lặng lẽ mất. Bước 4 cấm chép từ văn xuôi đúng vì lý do đó.

**Cái cổng này KHÔNG làm:** nó không chứng minh độ trung thành giao diện. §7.2 nói thẳng bằng chính chữ của plan — *"phần này không thể chứng minh bằng máy"* — và nửa đó vẫn thuộc về con người. Người review đọc `XANH` trên cả mười ba cổng **chưa học được điều gì** về việc wheel ramp có cảm giác đúng trên Ghostty hay không, và tài liệu phải nói điều đó ngay tại nơi bốn phán đoán của con người trong §7.2 nằm.

### Phụ thuộc

**`depends_on`:**

- **s1 (Sóng 1)** — sở hữu các file test status-line mà G1/G2/G3 assert trên đó. Cả hai file **đã tồn tại** hôm nay, nên chúng không đỏ vì thiếu s1 — chúng đỏ vì `pi_natives` chưa build. Không có s1 thì chúng vẫn đỏ, nhưng **không** vì lý do đó.
- **s4 (Sóng 4)** — sở hữu test MCP elicitation mà G6 assert trên đó, và dải key-hint mà hợp đồng tmux của G11 bắt nguồn từ đó.
- **s5 (Sóng 5)** — sở hữu nửa D2: G7 là cổng **PHỦ ĐỊNH** trên phần việc s5 đưa vào, nên nó chỉ có nghĩa **một khi** s5 đã đưa vào đoạn segment TTL đã đăng ký mà nó **không được** đọc.
- **s6 (Sóng 6)** — sở hữu harness tương phản 99-palette. Cổng G cho A9 trong §7.1 là hành vi, không phải phép đếm, nên harness của s6 **là** hiện vật; tail1 không dựng lại nó.

**`blocks`:**

- **Sign-off milestone.** §11 "ĐỊNH NGHĨA HOÀN THÀNH" của plan không thể được đánh giá cho tới khi tồn tại **một lượt chạy cổng duy nhất** — hiện nay mười ba cổng chỉ là văn xuôi mà người review phải tự lắp lại bằng tay, và lắp tay bằng tay chính là nơi các cổng bị bỏ sót.
- **§8.6 #5** (có viết chính sách clean-room ra không) bị chặn bởi câu trả lời con người ở bước 1, và chừng nào chưa có câu trả lời thì không gì ngăn một người đóng góp tương lai chép từ một cây bị dịch ngược — `CONTRIBUTING.md:82-91` đòi "the right to submit" nhưng không nêu rủi ro cụ thể nào, đó chính là khoảng trống mà §8.6 #5 chỉ ra.
- **Không chặn gì ở phía trên.** tail1 tiêu thụ các sóng; không sóng nào chờ nó.

### Rủi ro

**Rủi ro chi phối** là một cổng source-grep lặng lẽ biến thành một **test** source-grep. AGENTS.md cấm source-grep trong test bằng ngôn ngữ tuyệt đối, và bốn trong số mười ba cổng là phép đếm `grep -rn`. Nước đi trông tự nhiên — "làm cho cổng được CI cưỡng chế" — sẽ đưa chúng vào một `*.test.ts` và vi phạm quy tắc **trong khi trông như** làm milestone mạnh lên. Các cổng ở lại là script người review chạy; cưỡng chế CI sẽ cần một cơ chế khác (một lint rule hoặc oxlint rule — AGENTS.md nêu tường minh đó là chỗ ở của các bất biến cấu trúc).

**Rủi ro thứ hai, và cái tốn kém nhất:** mã hoá một neo cũ. **Mười** tham chiếu dòng mà bảng *Đính chính* liệt kê đều sai: tám neo `* 3`/`* 2` ở §7.1 (lệch −1 đến +13) và hai neo `ui-helpers.ts:141` / `settings.ts:108` ở §8.2 (lệch +2), nên người review lướt qua sẽ không bắt được. Ba trường hợp còn lại nêu ở đây — `loader.ts:107`, `segments.ts`, `keybinding-hints.ts` — không phải số dòng sai mà là **tên trần nhập nhằng**, xem hàng cuối của bảng: `loader.ts:107` nói `packages/tui/src/components/loader.ts` trong khi một `loader.ts` **KHÁC** nằm ở `packages/tui/src/theme/loader.ts`, và phần thảo luận §7.1/§8.2 xen kẽ hai file đó; một grep chạy nhầm loader.ts sẽ **khớp âm thầm không cái gì cả**.

**Rủi ro thứ ba, mang tính thủ tục:** bốn phán đoán của con người trong §7.2 và năm chữ ký của con người trong §8.6 là những phần script không làm được, và chúng lại là những phần dễ bị tick mờ đi nhất một khi đã có script in ra xanh. Tài liệu phải giữ chúng **hiện ra mắt** ở trạng thái `OPEN`. Một lượt chạy cổng xanh là bằng chứng rằng mười ba tính chất cơ học đang đứng vững; nó **không** phải bằng chứng rằng việc làm ấy hợp pháp hay rằng giao diện cảm thấy đúng, và lưới ký không được làm mờ ranh giới đó.

### Cần người quyết

- **§8.6 #5 (CON NGƯỜI, chặn bước 1):** chính sách clean-room được viết thành file `docs/`, thành phụ lục `CONTRIBUTING.md`, hay cả hai? Plan cân nhắc cả hai và không chọn cái nào. Đây là câu trả lời năm phút từ bảo trì viên, và nó đổi **một** file trong `files_touched` của mục này.
- **§8.6 #1 (CON NGƯỜI, không giải quyết được trong repo):** đã có ai đọc Commercial Terms hiện hành của Anthropic về reverse engineering, derivative works và UI simulation chưa? Plan nói rõ người nghiên cứu **KHÔNG** đã đọc. Câu *"All rights to Claude Code belong to Anthropic"* là tự đại diện của CCB, không phải một lần đọc đã kiểm chứng về điều khoản upstream. Chừng nào chưa trả lời, lưới ký của tài liệu hiện mục này là `OPEN` và tài liệu **không** khẳng định clean-room status.
- **§8.6 #4 (CON NGƯỜI):** có nên buộc code nằm ngoài lock tự khai báo để nó tới được file notices không? Hóa ra đây là một câu hỏi **khác** với cách plan đóng khung — xem mục *Đính chính so với plan*. Cần một quyết định về việc có thêm một manifest do người duy trì, hay luật clean-room đơn thuần đã đủ.
- **GATE OWNERSHIP:** có nên nối gate script vào CI hay không, hay để nó là script người review chạy? Mục này giữ nó ở dạng reviewer-run vì cưỡng chế CI cho một source grep chính là hình dạng AGENTS.md cấm. Nếu cần cưỡng chế CI, chỗ ở đúng là một oxlint rule cho các bất biến cấu trúc và một test thật cho các thuộc tính hành vi — đó là một hạng mục việc khác.
- **SCOPE:** tail1 là một phần của định nghĩa "xong" của milestone 3, hay một đợt đóng hàng riêng? Nó không thuộc sáu sóng. Nếu là đóng hàng, nó chạy một lần ở cuối và vài cổng sẽ **đỏ vĩnh viễn** (G6 nếu A2/D1 bị cắt khỏi phạm vi); nếu là một cổng áp cho mọi sóng, tính chất "đỏ trước" phải được giữ **cho từng sóng** chứ không phải một lần.

### Đính chính so với plan

Số dòng plan trong mục này lấy theo `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` tại HEAD `e040a60`; commit `e040a60` đã chèn kế hoạch M2 và dịch mọi neo M3 **+1507 dòng** so với `808b365`.

| claim | verdict | correction |
| --- | --- | --- |
| Task brief: *"Milestone 2 occupies lines 7042 to 7692"* và *"the eight waves are described at the wave descriptions inside that range."* | **WRONG on both counts.** | Dòng 8549 là `# MILESTONE 3 — BỀ MẶT UI/UX KIỂU CLAUDE CODE`, không phải milestone 2. Phạm vi đó chứa **SÁU** sóng, không phải tám: Sóng 1 (8749), Sóng 2 (8801), Sóng 3 (8854), Sóng 4 (8868), Sóng 5 (8917), Sóng 6 (8956). Thư mục đầu ra `.lavish-wip/m3-specs/` và trường `wave` của mọi spec anh em đều ủng hộ plan, không ủng hộ brief. Mục này được coi là M3 xuyên suốt. (Số dòng brief nêu là của bản `808b365`; ở HEAD hiện tại phạm vi tương ứng là **8549–9199**. `sed -n '8549p'` in ra header MILESTONE 3; `grep -n '^### Sóng'` trả đúng sáu hit trong phạm vi.) |
| §7.1 G10: *"`grep -rn 'mock.module' packages/coding-agent/test packages/tui/test` trong diff phải trả 0"* | **WRONG as literally written — nó ĐỎ trên một cây hoàn toàn đúng hôm nay.** | Lệnh grep mẫu trần trả về **2**. Cả hai hit đều là comment trong các suite tường thuật rõ là **không** dùng nó: `packages/coding-agent/test/tools/lsp-regressions.test.ts:111` và `packages/tui/test/loop-watchdog-wiring.test.ts:13`. Cổng viết như vậy fail trên một cây đã tuân thủ quy tắc hoàn hảo. Đây đúng là hình dạng cổng tự phá hủy mà bản thân plan chẩn đoán cho G4 (*"the old gate self-adjusted"*). Dạng lời gọi — `grep -rnE 'mock\.module\('` lọc bỏ dòng comment — trả **0**, và đó là dạng bước 5 mã hoá. |
| §7.1 văn xuôi (dòng 9007; ở bản `808b365` là 7500): *"G4 trả `8` (7 `* 3` + 1 `* 2`)"*, trong khi bảng §7.1 ở hai đoạn trước nói đếm là **"9" hôm nay**. | **Văn xuôi SAI và tự mâu thuẫn với bảng của chính nó.** | Con số là **9**, và bảng là đúng. Phân rã: 7 × `event.wheel * 3`, 1 × `event.wheel * 2` (`usage-dashboard`), và 1 × `delta * 3` (`apps/git/sidebar.ts`) — văn xuôi quên mất sidebar, đúng cái site mà đoạn ngay trên nó chỉ ra là lý do cổng phải quét hai mẫu. Con số 8 là *"8 hằng số trong 8 file M3-A3 liệt kê"*, là con số khác với 9 mà grep trả về. Chạy đúng pipeline hai mẫu của plan trả về 9. |
| §7.1 dòng 9001 (ở bản `808b365` là 7494) liệt kê bảy site `* 3` là `agent-transcript-viewer.ts:469`, `copy-selector.ts:212`, `plan-review-overlay.ts:581`, `rewind-selector.ts:232`, `git-tui.ts:693`, `raw-sse.ts:167`, `log-viewer.ts:638`; và nêu `usage-dashboard.ts:753` cho `* 2`. | **Cả TÁM** số dòng đều cũ. | Thực tế: `agent-transcript-viewer.ts:470`, `plan-review-overlay.ts:580`, `rewind-selector.ts:245`, `log-viewer.ts:639`, `usage-dashboard.ts:759`, `copy-selector.ts:214`, `raw-sse.ts:168`, `git-tui.ts:697` — cộng `packages/tui/src/apps/git/sidebar.ts:897` cho `delta * 3`. Lệch từ −1 đến +13. **Tập** là đúng (bảy `* 3` cộng một `* 2` cộng `delta * 3` của sidebar) — đó là lý do phần thực chất sống sót qua năm vòng review trong khi neo thì không. Bước 4 dựng lại danh sách từ cây. |
| §8.5: *"bước sinh chỉ đi qua `bun.lock`"* — lỗ hổng là bước sinh chỉ đi qua lockfile, nên code vendored ngoài lock không bao giờ tới được `THIRD-PARTY-NOTICES.txt`. | **MATERIALLY WRONG về cơ chế; kết luận (có thứ chưa được phủ) thì vẫn sống.** | Repo này **không có bước sinh nào**. `THIRD-PARTY-NOTICES.txt` là file 22.901 dòng được git-track và tự gọi mình là "generated" trong header của chính nó, nhưng không gì sinh ra nó — `scripts/ci-release-publish.ts:94` chỉ nêu đường dẫn và `:100` **STAGE** file đã commit vào tarball của từng package qua `legalPayloadFiles(license)`. `.github/workflows/ci.yml` chỉ nhắc đường dẫn trong các danh sách ignore/artifact. Vậy lỗ hổng §8.5 **không thể** đóng bằng cách nới rộng một generator, vì không có generator; nó chỉ có thể đóng bằng một manifest do người duy trì, đúng là thứ mà §8.6 #4 phải quyết. Riêng ví dụ minh hoạ của plan thì sai cho repo này: `packages/@ant/*` là một cây claude-code-ref (không có thư mục nào như vậy ở đây), và §8.3 đã đóng nó bằng *"Không package nào trong sối này là tài liệu tham khảo cho một port UI/UX"*. (`git ls-files --error-unmatch THIRD-PARTY-NOTICES.txt` thành công, `wc -l` = 22901; `ls packages/@ant` → không có thư mục nào.) |
| §8.5: *"`claude-code-best` grep trên toàn bộ `.ts`/`.md`/`.json` của đích không có hit thật (chỉ hai false positive — `glyph-bundle.json:140` và `light-canyon.json:7`)"*. | **Kết luận đúng; cả hai chi tiết được nêu đều cũ.** | Hai false positive được nêu **không còn tồn tại** — `grep -c 'claude-code-best'` trả 0 ở **cả hai** file. Và một grep toàn repo hôm nay trả **5** hit, **TẤT CẢ** nằm trong chính `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (dòng 8553, 9048, 9110, 11522, 11523) — một mệnh đề đúng về tài liệu plan, một báo động giả về sản phẩm. Giới hạn đúng phạm vi `packages/ scripts/ docs/` thì con số là 0. Bước 5 mã hoá G12 với phạm vi đó, loại trừ tường minh plan và `.lavish-wip/`; một cổng toàn repo sẽ đỏ vĩnh viễn vì một lý do không liên quan gì đến code. |
| §8.2 phân loại A7 với `ui-helpers.ts:141` (showStatus), D2 với `segments.ts:718-737`, A8 với `keybinding-hints.ts:10-55` và `tmux.ts:5`/`:48-49`; §6 A9 với `loader.ts:142`/`:153-157`, `settings.ts:108`, `session-color.ts:2`, `schema.ts:77-78`/`:140-141`. | **MIXED — ba cái sai, phần còn lại đã kiểm chứng chính xác.** | **SAI:** `ui-helpers.ts:141` → `showStatus` thực ra ở `:143`. `settings.ts:108` → `colorBlindMode` thực ra ở `packages/coding-agent/src/modes/settings.ts:110`. `segments.ts` phải phân giải thành `packages/tui/src/status-line/segments.ts` (có một `segments.ts` thứ hai ở `packages/coding-agent/src/cli/gallery-fixtures/`); bên trong nó `cacheHitSegment` **có** bắt đầu ở `:718`, nên khoảng đó ổn. `schema.ts` cũng là tên trần: nó phải là `packages/tui/src/theme/schema.ts` — `packages/tui/src/status-line/schema.ts` là file thứ hai và chỉ có 57 dòng, nên `:77-78`/`:140-141` không tồn tại ở đó. **ĐÃ KIỂM CHỨNG CHÍNH XÁC:** `loader.ts:142` (cờ colorBlindMode), `loader.ts:153-157` (nhánh điều chỉnh), `session-color.ts:2` (import OKLCH), `packages/tui/src/theme/schema.ts:77-78` (statusLineGitClean/Dirty), `packages/tui/src/theme/schema.ts:140-141` (fallback của chúng), `tmux.ts:48-49` (resolveTmuxClientTerminalName + chốt chặn isBunTestRuntime), `event-controller.ts:1244-1251` (chứa `#handleNotice` ở `:1250`), `manager.ts:1039` (lỗ ném −32601 mà G6 phụ thuộc), `docs/tui-core-renderer.md:107` và `:174` (cả hai bất biến của G9), `LICENSE:1` và `package.json:5`, và cả năm neo THIRD-PARTY-NOTICES.txt (8, 827, 835, 1053, 10804). **Quy tắc rút ra từ chính hàng này:** `segments.ts`, `schema.ts`, `settings.ts`, `loader.ts` đều là **tên trần** — mọi script và mọi tài liệu sinh ra từ mục này phải mang **đường dẫn đầy đủ** cho cả bốn. |
| §7.1 G8: *"`loader.ts:107` chỉ render trailer khi `lines.length > 1`"*. | **ĐÚNG, nhưng đường dẫn mơ hồ một cách nguy hiểm.** | Site là `packages/tui/src/components/loader.ts:107` — `if (this.#trailer && lines.length > 1) {`. Một file **KHÁC** cũng tên `loader.ts` nằm ở `packages/tui/src/theme/loader.ts`, và chính file đó là cái mà hàng A9 của §8.2 thảo luận, nên hai mục dùng cùng một tên file trần cho code không liên quan. Bất kỳ lệnh grep nào chạy nhầm loader.ts sẽ không khớp gì và cổng sẽ pass một cách rỗng. Cả script lẫn tài liệu phải mang **đường dẫn đầy đủ**. |
| Environment brief: *"native addon chưa được build, nên `bun test` hiện báo 0 pass … coi `bun test` là bị chặn cho tới khi addon được build."* | **ĐÚNG VỀ LỖI, SAI VỀ PHẠM VI CỦA NÓ.** | Lỗi là có thật và chuỗi lỗi chính xác — bất kỳ test nào import dây chuyền `@oh-my-pi/pi-natives` đều chết với *"Failed to load pi_natives native addon for darwin-arm64"* (ví dụ `packages/coding-agent/test/mcp/request-id.test.ts` → 0 pass, 1 fail). Nhưng nó **giới hạn theo FILE**, không phải toàn cục: `packages/tui/test/mouse.test.ts` pass **13/13** ngay lúc này mà không cần addon. Vậy các test TUI tránh được module natives là chạy được hôm nay, và người triển khai **không nên** giả định cả suite tắt. `bun run check:ts` được xác nhận là dùng được — đo exit 0 tại HEAD `e040a60` với cả **16** package type-check `Done` (con số 12 là số package **published**, xem hàng cuối bảng này). |
| §6.8: *"`find packages/tui -name '*.test.ts' … \| wc -l` → **221**; `find packages/coding-agent …` → **1511**"*. | **Trôi dạng hình thức; claim về QUY ƯỚC bên dưới hoàn toàn đã kiểm chứng.** | Số đếm nay là **222** và **1520**. Điều đáng giữ lại là quy ước vẫn đúng như đã nêu: test nằm ở `packages/<pkg>/test/`, với `packages/coding-agent/test/mcp/` cho việc MCP, và **KHÔNG** file test nào nằm cạnh mã nguồn của nó — `ls packages/tui/src/overlays/*.test.ts` không khớp gì. Đường dẫn file ở bước 6 tuân theo quy ước đó. |
| §8.5: *"cả 12 package xuất bản đều khai MIT"* và §7.2's *"the reference tree is not the judging standard"*. | **ĐÃ KIỂM CHỨNG, kèm một bổ sung hữu ích.** | Cả **16** workspace package đều khai `license: "MIT"`; **12** là published (không private) và **4** là private — con số 12 package xuất bản của plan là chính xác. Bổ sung: đây không chỉ là quy ước, nó **được cưỡng chế tại thời điểm publish**. `scripts/ci-release-publish.ts:97` `legalPayloadFiles()` ném ở `:102` khi license thiếu hoặc không phải MIT, và `scripts/ci-release-publish.test.ts:144-145` assert cả hai nhánh ném. Đó là lý do tail1 không thêm test license nào của riêng mình. |
