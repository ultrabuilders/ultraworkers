# KẾ HOẠCH THỰC THIỆN — MILESTONE 9: ORCHESTRATION (TỪ 29 FILE SẴN CÓ ĐẾN MỘT CHIẾN LƯỢC)

> **Đính chính framing (2026-09-29) — bản đầu của file này đọc sai đã đọc 29 file này.**
>
> `src/task/*` **không phải mồ côi.** Đó là **hệ thống multi-agent đã ship và đang được bảo trì**: 29 file, **13.695 dòng** (`executor.ts` 4.463 · `index.ts` 1.594 · `name-generator.ts` 1.577 · `worktree.ts` 1.069 · `structured-subagent.ts` 835 · `isolation-runner.ts` 801 · `workpool.ts` 666), có test thật theo issue (`test/rpc-subagents.test.ts`, `test/sdk-subagent-auth-inheritance.test.ts`, `test/issue-2750-subagent-runtime-fallback.test.ts`, `test/issue-985-subagent-auth-fallback.test.ts`, `test/collab/guest-subagent-badge.test.ts`), và `omp-command.ts` resolve binary `omp` để **spawn subprocess thật**.
>
> Câu "không có work item nào phát triển chúng" của bản đầu **đúng về mặt kỹ thuật nhưng ngụ ý sai**: nó gợi ý đây là việc bỏ dở cần người làm tiếp. Sự thật là ngược lại — **không có kế hoạch nào sửa hoặc mở rộng nó, vì nó không phải thứ chương trình upgrade đang đụng tới.**
>
> **M9 không đề xuất xây hệ thống này.** Nó đề xuất thêm **một lớp quyết định phía trên**: registry (agent nào tồn tại) · chính sách ủy quyền (ai được gọi, với ngân sách nào, dừng khi nào) · gom kết quả con · handoff giữa các lần chạy. Đó là **năng lực mới**, không phải sửa cái hỏng.
>
> **Hệ quả cho quyết định có giữ M9 hay không:** bỏ M9 **không bỏ code nào chết** — hệ thống vẫn chạy, vẫn có test, vẫn được sửa bug khi issue về. Nó chỉ có nghĩa là không có kế hoạch nào *mở rộng* nó. Đây là câu hỏi phạm vi của chủ sở hữu, không phải vấn đề kỹ thuật.
>
> `GAP-M6-09` là cổng **chặn** (95 dòng predicate), không phải orchestration. `spawn-policy.ts` được ghi trong M6 là **đúng** và **không được sửa** (`MILESTONE_6_EXECUTION_PLAN.md:1412`). M9 bám vào, không viết lại.

**Ngày lập:** 2026-09-29 · **Đo trên:** `d5b979ad79`

---

## Trạng thái hiện tại

| Số liệu | Giá trị |
| --- | --- |
| Work item | **7** |
| Wave | **4** |
| Câu hỏi mở | **6** |
| Kích thước | **XL** — nhưng **wave 1 làm được trước và độc lập** |
| Nền có sẵn | **29 file** `src/task/*` · `crates/pi-vcs/` ≈ **12.500 dòng Rust** |

Đo cái đã có:

```
git ls-files 'packages/coding-agent/src/task/*' | wc -l   →  29
grep -ci subagent trên 8 tài liệu kế hoạch                 →  22 dòng
grep -nE '^## ' MILESTONE_* | grep -i subagent            →  rỗng
crates/pi-vcs/  :  git/ ~9.625 dòng · jj/ ~1.345 · vcs.rs 1.538   ≈  12.500 dòng Rust
```

22 dòng nhắc "subagent" trong kế hoạch, và **không dòng nào là một heading work item**.

---

## Mục tiêu

> **"Workflow tốt" là nhãn của milestone này.** Không phải thêm một tính năng gọi agent — điều đó đã có. Mà là biến 29 file đang tồn tại thành một câu trả lời cho bốn câu hỏi mà hiện tại người dùng không có cách nào hỏi:

1. **Agent nào tồn tại, và ai được gọi?**
2. **Gọi với ngân sách nào, và dừng khi nào?**
3. **Kết quả của các lần chạy con gộp lại thành cái gì?**
4. **Chuyển việc từ lần chạy này sang lần chạy sau thế nào?**

Câu 4 là cái quyết định "workflow" có thật hay không. Không có nó, multi-agent chỉ là một cách gọi song song.

---

## Phạm vi

### Vào

| ID | Hạng mục | Cỡ | Wave |
|---|---|---|---|
| **W1** | **Registry agent** — cái gì được coi là "một agent", phát hiện từ đâu, đặt tên thế nào | **M** | 1 |
| **W2** | **Chính sách ủy quyền** — ai được gọi, bởi ai, dưới điều kiện nào | **L** | 1 |
| **W3** | **Kế thừa ngân sách** — `task.softRequestBudget` truyền xuống thế nào, khi nào bị chặn | **M** | 1 |
| **W4** | **Gom kết quả con** — nhiều lần chạy thành một kết quả có cấu trúc | **M** | 2 |
| **W5** | **Handoff giữa các lần chạy** — truyền việc và trạng thái sang run sau | **L** | 3 |
| **W6** | **Scheduling** — `job-manager.ts` đã có job nền/detach, thiếu mốc lịch | **S** | 2 |
| **W7** | **Git/VCS như bề mặt sản phẩm** — 12.500 dòng Rust đã có backend `git/` và `jj/`, **không work item nào chạm** | **M** | 3 |

### Không làm gì — đã quyết

| Không đổi | Vì sao |
| --- | --- |
| **Không sửa `spawn-policy.ts`** | `MILESTONE_6_EXECUTION_PLAN.md:1412`: nó đúng. M9 là bộc lớp quyết định quanh nó. |
| Không viết lại `parallel.ts` / `workpool.ts` | 29 file là nền có sẵn, không phải nợ. |
| Không mở `GAP-M6-09` thành orchestration | Nó là cổng chặn 95 dòng predicate. Việc khác. |
| Không để lại chế độ "gọi bất kỳ agent nào" | Đó là W2, và W2 phải có câu trả lời trước W4. |

---

## Thứ tự thực hiện

| Wave | Nội dung | Ghi chú |
|---|---|---|
| **1** | W1 + W2 + W3 | **Độc lập và làm được trước.** Đây là phần giá trị cao nhất / cỡ thấp nhất. Không cần W4 hay W5. |
| **2** | W4 + W6 | W4 cần W1 (phải biết mình đang gom kết quả của cái gì). W6 độc lập. |
| **3** | W5 + W7 | W5 là phần quyết định "workflow có thật không". W7 cần một sheet khảo sát trước. |

**Không barrier giữa wave 1 và wave 2–3.** Nếu deadline siết, **cắt wave 3 trước, đừng cắt wave 1.**

---

## Quyết định cần chốt trước khi code

| # | Quyết định | Vì sao chặn | Ai chốt |
|---|---|---|---|
| 1 | **"Một agent" là gì?** — một entry trong registry, một process, hay một prompt + công cụ? | W1 xây cái mà W2–W5 đứng trên. Định nghĩa sai thì cả bốn hạng mục phải làm lại. | Maintainer + kỹ sư agent |
| 2 | **Ai được cấp quyền gọi agent con?** — chỉ model, hay cả extension, hay cả người dùng? | Liên quan trực tiếp tới WI-0 của M2. Nếu extension gọi được agent thì nó đi qua trust gate không? | Maintainer |
| 3 | **Ngân sách tính trên cái gì** — token, wall-clock, hay số lần gọi? | W3 phải kế thừa `task.softRequestBudget`; đơn vị tính sai thì tổng sai. | Kỹ sư |
| 4 | **Khi nào dừng** — hết ngân sách, hết thời gian, hay đủ tin cậy? | Đây là phần "policy" của W2 và là chỗ dễ viết thành cây quyết định không kết thúc. | Maintainer |
| 5 | **Handoff mang cái gì?** — chỉ trạng thái, hay cả lịch sử lời gọi tool? | W5 chạm định dạng session entry. Có liên quan tới `GAP-M4-13` (audit bền vững) và tới `GAP-D2` đang treo ở `MILESTONE_4_EXECUTION_PLAN.md:391`. | Kỹ sư M4 + kỹ sư M9 |
| 6 | **VCS có phải bề mặt sản phẩm không?** — 12.500 dòng Rust đã có, nhưng `grep worktree\|jujutsu` trong 10 plan chỉ ra mẫu lệnh và fixture, không ra tính năng. | W7 là XL nếu phải làm thật. Cần biết nó là *đã đủ dùng* hay *chỉ mới có backend*. | Maintainer |

---

## Định nghĩa hoàn thành

| # | Điều kiện |
|---|---|
| 1 | Registry liệt kê **mọi** agent mà `spawn-policy.ts` cho phép gọi, và danh sách đó **sinh ra từ một nguồn** — không phải so khớp tay. Test hợp đồng: thêm một agent vào registry mà không sửa chỗ nào khác thì nó xuất hiện. |
| 2 | Một agent không có trong policy thì **không gọi được**, và việc từ chối **có lý do đọc được** — không phải im lặng. Đây là hợp đồng âm quan trọng nhất. |
| 3 | Ngân sách của lần chạy cha **truyền xuống** lần chạy con, và tổng tiêu của cả cây không vượt trần. Test: chạy hai tầng, tổng phải bằng tổng của cả hai, không phải tổng của tầng ngoài. |
| 4 | Nhiều lần chạy con gộp thành **một** kết quả có cấu trúc, và lần chạy con **thất bại** không làm mất kết quả của các lần chạy con khác. |
| 5 | Handoff làm việc còn tồn tại sau khi process cha chết. Đây là hợp đồng phân biệt "workflow thật" với "song song trong một tiến trình". |
| 6 | Job có mốc lịch chạy lại sau khi khởi động lại, và **không** chạy hai lần khi khởi động. |

---

## Những điều chưa được kiểm chứng

1. **Chưa đọc nội dung 29 file.** Đợt sweep ban đầu chỉ **liệt kê tên**; sau đó đã đếm dòng (`13.695` tổng) và **liệt kê test** để xác nhận đây là hệ thống đang chạy, không phải mồ côi. Nhưng **không file nào được mở để đọc logic**. Nên "cái đã có" trong mục tiêu vẫn là suy từ **tên + test + dòng**, chưa phải từ hành vi. Đây vẫn là bằng chứng yếu nhất trong file, và là thứ đầu tiên cần làm trước khi chốt bất kỳ work item nào ở §Phạm vi.
2. **Chưa chạy gì.** `bun test` không chạy được trên máy này.
3. **`task.softRequestBudget` chưa được mở xem.** Tên nó xuất hiện trong kế hoạch M6 nhưng chưa ai trích dòng nguồn trong cây.
4. **VCS chưa được đọc.** Cỡ W7 là XL nếu phải làm thật; con số 12.500 dòng là tổng kích thước backend, **không** phải số việc còn lại.
5. **`GAP-D2` ở `MILESTONE_4_EXECUTION_PLAN.md:391` đang treo** và W5 có thể chạm đúng nó. Nếu vậy, quyết định 5 ở §Quyết định **là** `GAP-D2`, đừng mở thêm một câu hỏi.
