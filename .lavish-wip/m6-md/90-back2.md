## Định nghĩa hoàn thành và những điều chưa được kiểm chứng

Phần KẾT của kế hoạch M6. Đọc sau ba audit (`sections/opencode.md`, `sections/codex.md`, `sections/gajae.md`).

---

## Định nghĩa hoàn thành

M6 là milestone **nghiên cứu**. Nó không thêm dòng code nào, nên "xong" không thể có nghĩa là test xanh hay build qua. "Xong" có nghĩa là: **một maintainer lạ, không hỏi tác giả, chạy lại được mọi thứ tài liệu nói và ra cùng kết luận.** Dưới đây là bốn điều kiện, mỗi điều kiện đều kiểm được bằng thao tác cụ thể.

### A. Mọi claim phải có lệnh tái lập được

Một *claim* là bất kỳ câu nào trong ba audit có con số hoặc khẳng định có/không. Mỗi claim phải đi kèm **một lệnh shell dán được, chạy trong đúng repo đó, cho ra đúng con số đó**. Không lệnh ⇒ claim chưa tồn tại, bất kể nó đúng hay sai.

Quy tắc kiểm: đọc tài liệu, lấy từng con số, tìm lệnh của nó. Claim nào phải đoán mới lệnh thì chưa đạt.

**Chuyện này hiện đang hỏng, và tệ hơn tưởng — không phải vì thiếu lệnh, mà vì thiếu lệnh đã sinh ra mâu thuẫn nội tại.** Trong `opencode.md`, §4 và §5 là hai bảng cùng nội dung nhưng lệch số ở bốn chỗ, và **không bảng nào có cột lệnh**:

| Package | §4 (dòng 273-279) | §5 (dòng 291-306) | Chênh |
| --- | --- | --- | --- |
| `session-ui` | 174 file | 147 file | 27 |
| `desktop` | 397 file | 217 file | 180 |
| `plugin` | 71 file *(§3, **có lệnh**)* | 63 file | 8 |
| `tui` | 454 file *(§0, **có lệnh**)* | 455 file | 1 |

Hai trong bốn giá trị trên có lệnh, và lệnh nằm ở §0/§3 chứ không ở §4/§5. Nghĩa là: người đọc §5 không có cách nào biết 63 hay 71 là đúng, và không cách nào biết vì sao §4 với §5 không khớp. Một tài liệu nghiên cứu tự mâu thuẫn ở cột số thì mọi kết luận dựa trên cột số đó cũng mất phần đáng tin.

Đóng điều kiện A nghĩa là: **mọi dòng số trong mọi bảng phải mang theo lệnh của nó**, không phải chỉ bảng §0.

### B. Mọi kết luận "đáng mang về" phải có số đo kích thước

"Đáng mang về" là một claim của cùng loại, nhưng nặng hơn: nó đề xuất cắt vài chục nghìn dòng của repo khác vào omp. Không có số đo thì đó là ý kiến, không phải kết luận nghiên cứu.

Một dòng quyết định chỉ đạt khi nó có **ba** số:

1. **Cỡ bên nguồn** — bao nhiêu file / bao nhiêu dòng, đo bằng lệnh.
2. **Cỡ tương đương bên omp** — omp đã có tương đương chưa, và lệnh chứng minh là không.
3. **Số phải cắt bỏ** — nếu phải "đọc để học, đừng chép" thì cắt ở đâu; nếu chép nguyên khối thì bao nhiêu dòng nợ kỹ thuật sẽ phát sinh.

Cột "Cỡ" thiếu ở đúng một dòng ngay bây giờ: `codex.md` §6 mục 4 (`justification` bắt buộc kèm lệnh cấm) ghi *"một trường trong `prefix_rule`"* — đó là mô tả, không phải số đo, và mục đó cũng là mục duy nhất trong tám mục không kèm lệnh `git grep` chứng minh omp chưa có.

Ba con số trên chỉ có ý nghĩa nếu chúng cùng một đơn vị. `opencode.md` §3 nói `packages/plugin` + `packages/tui/src/{plugin,feature-plugins}` = 4.236 + 6.510 dòng rồi cộng thành 10.746 — đúng, nhưng cột "File" của cùng bảng đó lại không cộng (71 + 34 = 105, không được ghi ra). Quy ước: **mọi tổng phải cho cả số dòng và số file, hoặc ghi rõ là chỉ cộng dòng.**

### C. Mỗi quyết định ở bảng quyết định phải có câu trả lời

Ba bảng quyết định, tổng cộng **22 dòng**:

| Bảng | Vị trí | Số dòng |
| --- | --- | --- |
| `things_omp_lacks` | `opencode.md` §8 | 7 |
| Đáng / Không đáng | `codex.md` §6 | 8 |
| Thứ omp chưa có | `gajae.md` (bảng sau mục pháp lý) | 7 |

Mỗi dòng phải kết thúc bằng **một trong ba phán quyết đóng**: `lấy` / `không lấy` / `chờ — chờ sự kiện X, người phụ trách Y`. "Chờ" là phán quyết hợp lệ, nhưng phải **có tên sự kiện và tên người**; không có tên thì "chờ" chỉ là cách viết mềm của "chưa biết".

Hiện trạng: **2 trên 22 dòng chưa có câu trả lời** — `opencode.md` §8 dòng 4 (`flexGrow` + `minWidth`) ghi "Tùy" và `gajae.md` dòng 4 (`receipt-spool` + `session-lease`) ghi "Cân nhắc". Cả hai đều đang đợi cùng một quyết định chưa có: **M3 chọn hay không thêm flexbox**. Đó là một sự kiện có tên (quyết định layout của M3), nên điều kiện C có thể đóng bằng cách viết lại hai ô đó thành `chờ — M3 chốt layout` thay vì để là "Tùy".

Thêm một ràng buộc nhỏ nhưng đáng: cột phán quyết hiện dùng **sáu cách viết khác nhau cho bảy dòng** ("Có", "Có, rẻ", "Tùy", "Đọc để học, không chép", "Đọc `README`, đừng chép code", "Không"). Không đọc được bằng mắt thì không lọc được bằng máy, và người đọc phải tự dịch mỗi ô về ba giá trị gốc. Chốt một enum và bỏ phần chú thích vào cột kế bên.

### D. Điều kiện để biết tài liệu này còn đúng

> **Quy tắc 90 ngày.** Tài liệu này còn đúng **khi và chỉ khi** một maintainer chạy *danh sách kiểm* — một khối lệnh cố định, kèm sẵn output kỳ vọng — và **không dòng nào lệch**. Lệch một dòng là tài liệu đã cũ, kể cả khi phần còn lại vẫn đúng.

Danh sách kiểm phải phủ đúng bốn nhóm, ước khoảng 15 lệnh:

1. **Ba HEAD** (mục "Những điều chưa được kiểm chứng" bên dưới). Lệch ⇒ mọi số đo cũ, phải đo lại.
2. **Năm số đo lớn nhất mỗi repo** — tổng LOC, tổng file, tỉ lệ test, số crate/package, tỉ lệ LOC nằm ngoài phạm vi agent. Đây là các số mà kết luận "repo to vì là cả công ty" đứng trên.
3. **Ba lệnh âm tính trên omp** — `git ls-files | grep -i attention` (rỗng), `git ls-files '*.snap' | wc -l` (0), `git ls-files | grep -icE 'golden|snapshot'` (23). Ba cái này là **tiền đề của ba khoảng trống** mà M6 kết luận là omp đang thiếu. Chúng từng đúng; chúng sẽ hỏng vào đúng ngày omp thêm thứ đó — và khi đó tài liệu phải hỏng theo, im lặng là sai.
4. **Hai lệnh pháp lý** — `LICENSE`/`NOTICE` của cả ba repo, và kiểm tra `AGPL`/`MuPDF` trong `gajae` (xem dưới).

Hình dạng nó phải có — toàn bộ lệnh dưới đây đã được chạy ít nhất một lần trong lúc audit, chỉ là chưa gom lại:

```bash
# 1. ba HEAD — chạy trong từng repo tham chiếu
git -C <repo> rev-parse --short HEAD

# 2. năm số đo lớn mỗi repo
git -C <repo> ls-files '*.ts' '*.tsx' | wc -l
git -C <repo> ls-files '*.ts' '*.tsx' | xargs wc -l | tail -1
git -C <repo> ls-files '*.snap' | wc -l

# 3. ba lệnh âm tính trên omp — tiền đề của ba khoảng trống
git ls-files | grep -ci attention                     # 0
git ls-files '*.snap' | wc -l                          # 0
git ls-files | grep -icE 'golden|snapshot'             # 23

# 4. hai lệnh pháp lý
git -C <repo> ls-files | grep -iE '^(LICENSE|COPYING|NOTICE)'
git -C <gajae> grep -ri 'agpl\|mupdf' -- NOTICE.md
```

Điều kiện này **chưa được đạt**: các lệnh hiện nằm rải rác trong ba file, không có khối tập trung nào, và **cột output kỳ vọng còn trống** ở mọi dòng. Việc cần làm là gom chúng thành một khối ~15 dòng và **đính kèm output** — không phải chỉ ghi lệnh.

Có một loại thứ **không bao giờ cũ** và không cần nằm trong danh sách kiểm: **ranh giới pháp lý**. MuPDF là AGPL-3.0 nên đường PDF của `gajae` là vùng cấm tuyệt đối với omp (MIT) — đúng cho tới khi `NOTICE.md` của họ đổi. `NOTICE` của `codex` ghi công Ratatui theo MIT, nên phần mượn từ đó là `Apache-2.0 + giữ phần Ratatui` — đúng cho tới khi `NOTICE` đổi. Dòng `Copyright (c) the oh-my-pi authors` trong `docs/rust-porting/` của `gajae` là bằng chứng rằng tên riêng không xoá được nghĩa vụ dòng gốc. Ba điều này là **kết luận**, không phải số đo: chúng đúng hoặc sai theo văn bản giấy phép, không trôi theo commit.

---

## Những điều chưa được kiểm chứng

Mục này ngắn vì nó nên ngắn. Nhưng nó là mục quan trọng nhất của cả milestone.

**Không hành vi nào được chạy.** Cả ba audit là **phân tích tĩnh trên cây nguồn tại một commit**: đếm file, `wc -l`, `grep`, đọc file, `head`. Không build, không chạy test, không chạy binary, không dựng lại một `.snap` nào của `codex`, không render một khung hình TUI nào. Các khối code trích trong ba audit đều là **kết quả `head`/`cat`**, không phải output của chương trình. Và cả ba claim dạng "omp đang thiếu X" đều dựa trên `grep` — nên chúng chứng minh *không tìm thấy*, không chứng minh *không tồn tại*; một tính năng đặt tên khác vẫn thoát.

**HEAD đã dùng để đo** — số liệu sẽ trôi khi các repo đó phát triển:

| Repo | HEAD | Ngày |
| --- | --- | --- |
| `opencode` (`anomalyco/opencode`) | `39021df` | — |
| `codex` (`openai/codex`) | `e72da2b53805…` (#48353) | 2026-09-26 |
| `gajae-code` (`Yeachan-Heo/gajae-code`) | `5c5231418930673e42cc5d08ebe4376e03187533` | 2026-09-26 01:26:07 +0900 |

Phía omp thì **yếu hơn nữa**: ba file audit không ghim commit nào của chính repo này, mọi số đo bên omp lấy từ cây nguồn cục bộ ở nhánh `milestone-1`. Đó là khoảng trống của chính tài liệu, không phải của người đo.

**`@opentui/core`.** Giấy phép đã được xác nhận **MIT qua metadata npm và README** — nhưng đó là tầng bằng chứng yếu hơn việc đọc `LICENSE` trong một bản cài. Và **chưa ai thử cài nó**. Chưa biết nó chạy được trong omp hay không: có thay thế được `packages/tui` không, bundle bao nhiêu, đụng native addon nào. Đây là **cổng đầu tiên phải đóng trước khi chốt bất kỳ layout nào** — vì `opencode.md` §0 đã sửa tiền đề của M3: opencode không phải "không có flexbox", nó **mua** flexbox từ `@opentui/core@0.5.12`. Lưu ý mâu thuẫn chưa giải quyết: `opencode.md` §9 mục 1-2 vẫn ghi giấy phép này là *chưa biết*; nếu tầng metadata là đủ thì phải sửa §9, nếu không thì mục "Những điều chưa được kiểm chứng" ở trên đang nói quá.

**Cổng kiểm của M3 (`bun test packages/tui`) còn bị chặn một phần bởi native addon.** Hệ quả trực tiếp: con số "omp: 0 file snapshot, 233 file test" mới chỉ mô tả **cây nguồn**, chưa chứng minh 233 file test đó chạy xanh. Nên chiến lược snapshot mà `codex.md` §6 khuyến nghị **chưa thể kiểm chứng là chạy được** cho tới khi cổng này mở.

**Có tìm ra điều gì trong `unknowns` không — có, 21 mục (7 mỗi audit).** Rút gọn còn những cái có khả năng đổi kết luận:

- *opencode*: chưa đọc `packages/tui/src/plugin/api.tsx` (381 dòng) — tức **chỉ đọc hợp đồng slot, chưa đọc cơ chế phân giải**; phạm vi `merman` so với bản Rust của omp chưa đối chiếu; 17 `AGENTS.md` của opencode chưa xem như một mẫu kỷ luật agent.
- *codex*: `code-mode` (4 crate, 104 file, ~30k dòng) **chưa xác minh là gì** — tên gợi ý thay tool-call bằng code; nếu đúng thì đây là ứng viên milestone lớn chưa được đánh giá. Môi trường đo **chỉ là checkout Darwin**, nên Windows sandbox (114 file) và WSL chỉ được biết qua tên file. Chưa đo tỉ lệ test của `core`.
- *gajae*: clone cục bộ là **squash 1 commit** — không suy ra được ai nghĩ ra cái gì, và chưa diff với pin thật `a85bd522…`, nên không phân biệt được gajae *thêm* gì với *xoá* gì. Chưa kiểm chứng CI run nào; tỷ lệ 53% test nói ra **mật độ**, không nói ra test có bắt được lỗi thật không. `.gjc/qa/` chỉ có **một fixture** — chưa biết là chính sách hay một ca commit nhầm.

Không có claim nào trong ba audit khẳng định hành vi runtime, hiệu năng, hay chất lượng test mà không kèm cảnh báo ở trên.
