# KẾ HOẠCH THỰC THIỆN — MILESTONE 10: HỢP ĐỒNG BỀN (CỔNG Ở TẦNG THẤP, TRẠNG THÁI QUAN SÁT ĐƯỢC)

> **Vì sao đặt tên M10 chứ không phải M8.** Nghiên cứu này ban đầu đề xuất tên "M8". Chủ sở hữu đã dành M8 cho *Containment* và M9 cho *Orchestration* (2026-09-29). Tên M8/M9 cũng từng bị hai đề xuất khác nhau tranh cùng một tên — đó là lý do phải ghi rõ.
>
> **Vì sao file này tồn tại.** M4 đứng ở tầng **cổng CI**. M6 đứng ở tầng **kỷ luật quy trình**. **Giữa hai tầng đó omp trống.** Mười bốn hạng mục dưới đây đều sống trong khoảng trống đó, và cùng một lý do: chúng biến *"không xác định được"* và *"cắt nửa vời"* từ lỗi im lặng thành trạng thái có nhãn.

**Ngày lập:** 2026-09-29 · **Đo trên:** `d5b979ad79` · `deepseek-harness @ 21638c56` · `oh-my-openagent @ bc67110e`

> **Ranh giới giấy phép.** `oh-my-openagent` là **SUL-1.0, non-sublicensable** — mượn **hình dạng cổng**, không mượn dòng code. `deepseek-harness` là MIT nhưng cây `vendor/` của nó là **fork đã sửa 22 lần** — đọc `vendor/README.md` trước khi coi bất kỳ cơ chế nào là thuộc tính framework.

---

## Trạng thái hiện tại

| Số liệu | Giá trị |
| --- | --- |
| Work item | **13** (W1–W13) |
| Wave | **5** |
| Kích thước | **L** |
| Câu hỏi mở | **5** |
| Nguồn | `deepseek-harness` (B), `oh-my-openagent` (C, D, E) |

---

## Mục tiêu

> **"Workflow tốt" = mỗi lỗi bị bắt ở lúc rẻ nhất, và mọi thứ trạng thái phải quan sát được.**

Hai nhóm:

- **A–B** làm lỗi đỏ **lúc người viết đang tạo thay đổi** — trước khi ai nhớ chạy. Ví dụ đã có: sổ `patches/LEDGER.md` hiện chỉ đỏ khi ai đó nhớ chạy `gen:patch-ledger`.
- **C–D** biến "không đo được" và "cắt nửa vời" thành trạng thái có nhãn.

Cả ba nhóm là **tiền đề** để mọi `bun test` trong M1–M7 có giá trị: máy này không load được native addon, và đó đúng là trường hợp mà W7 bắt buộc phải phân biệt với "test fail".

---

## Phạm vi

| Wave | ID | Hạng mục | Cỡ | Nguồn |
|---|---|---|---|---|
| **A** | **W1** | Cổng `## Known Limitations and Deferred Work` bắt buộc mọi package README, whitelist hai chiều có lý do | S | dsh |
| | **W2** | Chính YAML workflow là artifact có test: thứ tự bước, cấm `continue-on-error` ở bước chuẩn bị, `concurrency` phải khớp từng workflow | S | dsh |
| | **W3** | Lane CI soak trên `windows-latest` — chọn target từ allowlist, lặp N lần giống hệt | S | omo |
| **B** | **W4** | Tầng git hook + cặp-ràng-buộc "sửa mã nguồn vendored mà không sửa manifest → commit đỏ lúc viết"; cài qua `core.hooksPath` để clone không cần postinstall | M | dsh |
| **C** | **W5** | Ngân sách ký tự ba tầng cho rule/skill injection (tĩnh / động / sau-compaction), cắt **có nhãn** + lối thoát cho rule tuyệt đối không cắt | S–M | omo |
| | **W6** | Quy tắc oversized-element: một phần tử đơn lẻ vượt trần → gắn nhãn `oversized` và **để nguyên**; trần áp cho cả lô, không phải từng phần tử | XS | omo |
| **D** | **W7** | Cổng kiểm phải phân biệt **ba** trạng thái: pass / fail / **không-xác-định-được** | XS | omo |
| | **W8** | Lối thoát cho prose không có machine consumer: **không** viết test nào, và nói lý do trong PR | S | omo |
| | **W9** | Giao việc cho agent con: chỉ định **HÀNH VI** cái kiểm phải phân biệt, không bao giờ chỉ định sẵn **CƠ CHẾ** | XS | omo |
| | **W10** | Trọng số review tính trên **mức sở hữu dòng code CŨ**; phân loại "production" theo path + content cũ; fail-closed khi không đo được; uy tín tác giả không thay người duyệt | S | dsh |
| | **W11** | `[~]` trong file plan: tính vào tổng, không tính là xong, và **không** giữ một vòng lặp tiếp tục sống | XS | omo |
| **E** | **W12** | Vòng lặp tự sửa lời gọi delegation sai cú pháp: mẫu lỗi → chỉ dẫn sửa + danh sách hợp lệ **trích từ chính message lỗi** | S | omo |
| | **W13** | Sửa caveat đã lỗi thời ở `MILESTONE_6_EXECUTION_PLAN.md` §0 | XS | — |

### Không làm gì — đã quyết

| Không đổi | Vì sao |
| --- | --- |
| **Không lấy code của `omo`** | SUL-1.0. Chỉ mượn hình dạng cổng. |
| Không sao chép cây `vendor/` của dsh | Nó là fork 22 lần của Cordis, không phải Cordis. Đọc `vendor/README.md` trước. |
| **Vết bền của một lần chạy fan-out** (run-start / member / run-end trong transcript) | Nó đổi định dạng session entry và là thay đổi người dùng nhìn thấy. Phải nằm cạnh `GAP-M4-13` trong một sóng sản phẩm của M4, **không** phải trong sóng kỷ luật. Đây là quyết định có chủ, không phải sót. |

---

## Bằng chứng — đã đo

| Hạng mục | omp hôm nay | Lệnh |
|---|---|---|
| W1 | 15 package README, **1** có heading liên quan (`packages/browser-relay/README.md:23`) → **14/15 thiếu**; `grep -ic "Known Limitations"` trên 9 plan → **0** | `ls packages/*/README.md \| wc -l` |
| W2 | 13 file `scripts/*.test.ts`, **không file nào** parse workflow YAML | `git ls-files 'scripts/*.test.ts' \| wc -l` |
| W3 | `grep -n "runs-on:.*windows" .github/workflows/*.yml` → đúng **1** lane: `ci.yml:1013 windows-11-arm`; thân job (`:1017-1032`) **chỉ chạy** `--version` và `--smoke-test`, **không chạy test suite** | — |
| W4 | `ls -a \| grep -E 'lefthook\|husky'` → rỗng · `ls .husky` → không có · `git config core.hooksPath` → rỗng. **0 hook** | — |
| W5 | `grep -rE 'budget\|truncat\|maxChars\|charLimit' packages/coding-agent/src/capability/` → **0 dòng** | — |
| W6 | `git grep -c MAX_FACTS_PAYLOAD` → **0** | — |
| W7 | `grep -i "unverifiable-here\|cannot-determine"` trên 9 plan → **0** | — |
| W8 | `AGENTS.md:298` cấm assert prompt/UI boilerplate nhưng **không có lối thoát**; `:312` có luật nhưng chỉ cấm | — |
| W9 | `grep -i prescribe` trên 9 plan → **0** | — |
| W10 | `GAP-M4-13` ghi *ai đã duyệt*, không ghi *duyệt có đủ tư cách* | — |
| W12 | `git grep -c detectDelegateTaskError\|DELEGATE_TASK_ERROR_PATTERNS\|buildRetryGuidance` → **0**; chỉ có `task/error-attribution.ts` (gán thuộc tính, không sinh chỉ dẫn) | — |

**Câu trả lời của `omo` cho W5, đo được:** `packages/rules-engine/src/engine/constants.ts:86,88,94,96` — `DEFAULT_POST_COMPACT_MAX_RULE_CHARS=3500`, `…RESULT=4000`, `DEFAULT_DYNAMIC_MAX_RULE_CHARS=4000`, `…RESULT=10000`; `truncator.ts:13-18` có `NEVER_TRUNCATED_RULE_PATHS` (lối thoát cho rule tuyệt đối không cắt), `:42-60` `truncateRule` nối notice và trả `truncated`/`originalLength`.

---

## Quyết định cần chốt trước khi code

| # | Quyết định | Vì sao chặn | Ai chốt |
|---|---|---|---|
| 1 | **`windows-11-arm` có sẵn cho fork không?** | W3 là tiền đề kỹ thuật duy nhất. Nếu không, đổi `runs-on` sang runner có sẵn và ghi rõ trong kế hoạch. | Owner M5 |
| 2 | **"Không-xác-định-được" có được coi là đỏ không?** | Nếu có, mọi cổng của M1–M7 phải được viết lại để phân biệt. Nếu không, W7 là cosmetic. Đây là câu hỏi chặn **giá trị** của cả wave D. | Maintainer |
| 3 | **`omp doctor` là nơi duy nhất in ra, và nó chưa tồn tại** (`grep -c 'name: "doctor"'` → 0) | W7 cần một chỗ để in trạng thái ba ngày. Nó là `W18` của M1. W13 của M8 cũng dùng. | Kỹ sư M1 |
| 4 | W4 cài qua `core.hooksPath` hay qua `postinstall`? | `core.hooksPath` không cần postinstall nhưng đổi hành vi của repo đã clone. | Kỹ sư M5 |
| 5 | Vết bền của lần chạy fan-out để ở đâu — mở rộng union `SessionEntry` hay tái dùng `CustomEntry`? | Đây là **`GAP-D2` đang treo** tại `MILESTONE_4_EXECUTION_PLAN.md:391`. **Sửa `GAP-D2`, đừng mở câu hỏi mới.** | Owner M4 |

---

## Định nghĩa hoàn thành

| # | Điều kiện |
|---|---|
| 1 | 15/15 package README có mục `## Known Limitations` **hoặc** một dòng giải thích vì sao không cần. Test đọc cả hai chiều của whitelist và báo **cả** khi mục không có lý do lẫn khi mục chỉ tới package không tồn tại. |
| 2 | Một workflow thêm `continue-on-error: true` vào bước chuẩn bị → test đỏ. Và `concurrency` của từng workflow phải được đọc bằng cách **chạy expression trong `node:vm`**, không phải bằng so chuỗi. |
| 3 | Một lần soak trên Windows chạy test suite thật, lặp N lần, và báo từng lần. Hiện lane đó chỉ chạy `--version` — **đó là phần phải đổi**. |
| 4 | Sửa file dưới `patches/` mà không sửa manifest → **commit đỏ ngay lúc viết**, không phải lúc ai đó nhớ chạy. |
| 5 | Rule vượt ngân sách bị cắt **kèm nhãn** trả về cùng kết quả; rule nằm trong danh sách "tuyệt đối không cắt" thì **không** bị cắt và không cần nhãn. |
| 6 | Một cổng chạy trên môi trường thiếu phụ thuộc trả về nhãn `không-xác-định-được`, **không** phải `pass`, và **không** phải `fail`. Đây là hợp đồng quan trọng nhất của milestone: chính máy đang chạy M10 này là ví dụ. |
| 7 | Một subagent được giao việc bằng **hành vi** cần phân biệt, không kèm cơ chế. Nếu ai đó đọc hồ sơ nhiệm vụ thấy một cơ chế cụ thể, đó là lỗi. |
| 8 | `[~]` trong plan tính vào tổng, không tính là xong, và không giữ một vòng lặp tiếp tục sống. |
| 9 | Lệnh delegation sai cú pháp lần sau nhận được danh sách hợp lệ **trích từ chính message lỗi**, không phải từ bảng viết tay. |

---

## Những điều chưa được kiểm chứng

1. **Chưa chạy gì.** `bun test` không chạy được trên máy này (`pi_natives.win32-x64.node` thiếu). Mọi verdict "CÓ / THIẾU" là về **sự tồn tại của mã**, không phải hành vi lúc chạy. Điều này đặc biệt nặng với W7: cổng ba ngày mà không có cổng nào chạy được thì **chưa kiểm chứng được chính nó**.
2. **Các con số so sánh "omo có X" là trích từ cây `omo`**, đọc trực tiếp tại `~/Projects/oh-my-openagent @ bc67110e`. Phía omp thì tôi tự đo. `deepseek-harness` đọc tại `~/Projects/deepseek-harness @ 21638c56`.
3. **Năm checkout tham chiếu vắng mặt** — `pi-ref`, `gajae-ref`, `codex-ref`, `opencode-ref`, `claude-code-ref`. Mọi dòng "chưa được phủ" trong file này dựa trên **lệnh âm tính chạy trên chính cây omp**, không dựa vào trích dẫn `file:line` vào checkout vắng. Đó là lý do chúng đáng tin hơn, không kém hơn.
4. **Số đếm note của dsh:** 40 proposed / 518 implemented / 14 rejected / 642 archived = 1.214 — khớp con số M4 ghi. Bộ đếm theo walker của chính repo bỏ `*/AGENTS.md` ra 1.212; chênh 2 file index.
5. **W13 là sửa tài liệu, không phải work item.** `MILESTONE_6_EXECUTION_PLAN.md` §0 nói không kiểm lại được `oh-my-openagent` vì không có checkout, nhưng M6:16-24 lại ghi đúng SHA của nó (`bc67110e`) — và repo đó **có** trên máy này, đúng SHA đó. Hai câu trong cùng một tài liệu mâu thuẫn nhau.
