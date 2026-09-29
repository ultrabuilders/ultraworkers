# KẾ HOẠCH THỰC THIỆN — MILESTONE 5: REBRAND THÀNH `ultraworkers`

M5 là milestone phân phối, không phải milestone tính năng: nó đổi tên thương hiệu `oh-my-pi` thành `ultraworkers` mà không thêm một khả năng mới nào cho người dùng. Nó đứng sau M1 (bao trọn `pi` làm tiền đề) và là điều kiện tiên quyết thực tế cho M3 và M4, vì cả hai đều giả định tên thương hiệu đã ổn định. M5 không sao chép mã của bên thứ ba — nó đổi tên, không vay — nên về pháp lý nó nhẹ hơn hẳn M3 và M4. Cái nó không nhẹ là **16 work item trên sáu sóng**, và phần lớn công việc không phải gõ chữ mà là phân loại từng dòng xem nó thuộc lớp danh tính nào.

**Trả lời ngắn cho câu hỏi "có nên bắt đầu không": có, nhưng chỉ sóng 1.** W1 và W2a là hai mục nhỏ, độc lập file, không cần gì ngoài ba mức điều kiện tiên quyết, và chúng mở đường cho mọi thứ sau đó. Nhưng **đừng chạm vào sóng 3**. Cổng GATE 0 của cả W7, W8a và W8b đều là cùng một kiểm tra — `test -f scripts/rename/keep-list.txt` — và thư mục `scripts/rename/` **không tồn tại trên cây hiện tại** (`1454dc0`, kiểm chứng lại). Danh sách chuỗi cấm đổi phải có, phải nằm trên `main`, và phải được **một người duyệt khác người viết**, trước khi bất kỳ lệnh thay chuỗi nào chạy. Đó là điều kiện có lead time dài nhất của milestone và nó cần hai người — nên mở nó ngay, song song với sóng 1.

## Trạng thái hiện tại

| Số liệu | Giá trị |
| --- | --- |
| Work item | 16 |
| Mục file đã kiểm chứng | 181 |
| Câu hỏi mở | 73 |
| Đính chính so với bản kế hoạch gốc | 146 |
| Sóng | 6 |
| Cổng đang đỏ ngay bây giờ | 5 |

Con số 181 là tổng `n_files` của 16 work item, và nó **understated** bề mặt chạm thật: hai mục là tập tổng hợp, không phải file lẻ — `(4100 file còn lại trong tập in-scope)` của W7 và `<599 file .ts trong tập display-token>` của W8b. M5 không bắt đầu từ xanh. Năm cổng sau đây đỏ ngay tại cây sạch, trước khi bất kỳ dòng nào của M5 được viết:

1. **W7 GATE 0** — `test -f scripts/rename/keep-list.txt` thất bại. `scripts/rename/` không tồn tại trên cây.
2. **W8a GATE 0** — cùng điều kiện thiếu `keep-list.txt`, cộng thêm hai điều kiện khác chưa thoả (W2 chưa merge, W7 chưa merge).
3. **W8b GATE 0** — `test -d scripts/rename` thất bại. Đây là trạng thái **đúng** của cây, không phải sự cố.
4. **W13p GATE 1** — tripwire, đỏ có chủ đích hôm nay: `set_i_files_still_matching=3`.
5. **W13p GATE 2** — tripwire, đỏ có chủ đích hôm nay: `shipped_overrides=[omp,omp]`.

Ngoài năm cổng đó, có thêm một lớp đỏ nền của môi trường đã tồn tại sẵn: các test import transitively `pi_natives` fail với `Failed to load pi_natives native addon for darwin-arm64` vì addon chưa build. Đây là **baseline có sẵn trên cây sạch, không phải hậu quả của công việc M5** — trong lần chạy đầy đủ `packages/utils/test/` (81 file, `658 pass / 2 skip / 17 fail / 16 errors`), 17 **file** đỏ, chứ không phải 17 lỗi dồn vào đúng hai file: tất cả cùng một nguyên nhân `Failed to load pi_natives native addon for darwin-arm64`, và 16 file trong số đó **chạy 0 test** vì addon ném ngay lúc nạp module. Chỉ `logger-contract.test.ts` còn chạy được (12 pass / 1 fail trong 13 test). Mô tả chính xác ở [Điều kiện tiên quyết](#điều-kiện-tiên-quyết) — đọc mục đó trước khi tin bất kỳ cổng test nào.

Các phép đo trong tài liệu này lấy trên HEAD `84cbac9` với cây sạch. Cây hiện tại là `1454dc0`, chỉ thêm một commit tài liệu, nên mọi neo `file:line` và mọi số đếm trong đây vẫn đúng — riêng `scripts/rename/`, `dirs.ts:21`, `dirs.ts:27`, `dirs.ts:360`, 12 dòng `runs-on: … omp-kata`, `ci.yml:34` và 14 file được git track dưới `.omp/` đều được kiểm chứng lại trực tiếp.

## Vì sao đổi tên là việc nguy hiểm

Đây là phần phải đọc trước tiên, và là điểm khác M1–M4. Ở bốn milestone trước, thao tác chủ đạo là **thêm** — thêm module, thêm seam, thêm quy ước. Thêm thì hoàn tác được, và một thay đổi sai thường để lại một thứ thừa chứ không xóa mất một thứ có giá trị. M5 là ngược lại: thao tác chủ đạo là **xoá hàng loạt**, và mọi giá trị mà nó chạm tới đều là giá trị mà bên thứ ba đang đọc.

**Ba lý do khiến nó không hoàn tác được.**

Một là phạm vi. Hai mục lớn nhất của milestone là W7 — 4118 file, 17212 lượt, 16 manifest, `bun.lock` tái sinh — và W8b — 599 file `.ts`, 1853 lượt token `omp`. Cả hai đều là **một lệnh**. W7 ghi rõ phần thao tác gõ là "S theo thao tác gõ (một lệnh `perl -pi` trên 4118 file)" và phần kiểm chứng mới là "M". Nghĩa là công việc thật không nằm ở lệnh, mà nằm ở việc chứng minh lệnh đó không quét nhầm — và nếu bỏ qua phần đếm và chạy thử, đây là việc không thể hoàn tác khi sai. Còn về khả năng review: một diff trên hàng trăm file, phần lớn là dòng comment, **không ai đọc nổi**. W8b nói thẳng sai lầm số một của nó là "CHẠY `sed` ĐẠI TRÀ trên 599 file", và điều kiện của nó là không có bảng quyết định thì **không được sửa một dòng nào** — kể cả dòng mang `disposition=rename`.

Hai là phần không thể sinh lại. Cột DoD của M5 là "zero hit", và điều đó đẩy áp lực lên việc quét cho sạch. Nhưng một số thứ **không được viết lại được** khi đã mất: 13 file changelog chứa 85 lượt `@oh-my-pi/` trong các mục đã phát hành, mà `AGENTS.md` coi là bất biến. W7 dựng một cổng riêng cho việc này — GATE B so một baseline **phải** là 13 file / 85 lượt — vì Gate A không bắt được nó: changelog vốn đã nằm ngoài tập in-scope, nên kể cả khi ai đó lỡ xoá exclusion, Gate A vẫn xanh trong khi Gate B đỏ. Hai cổng soi hai lỗi khác nhau, và việc tách riêng chúng là chính xác thứ bắt một người review phải nghĩ trước khi chạy.

Ba là những danh tính mà mắt không thấy. Danh sách "không được đổi" của M5 không phải danh sách thẩm mỹ — nó là danh sách những thứ **hỏng âm thầm**. Chi tiết ở mục kế tiếp.

**Vì sao thứ tự sóng là bắt buộc, không phải sở thích.** Sóng không phải là cách chia công việc cho đủ đều; sóng là hệ quả của việc mày có ba lớp phụ thuộc mà không một cách chia nào khác sống sót. Trong dữ liệu, bốn mối phụ thuộc được ghi là **cứng** (`CỨNG` / `HARD GATE`) — không phải vì lịch trình chen nhau, mà vì chạy sai thứ tự sẽ hỏng một thứ đang hoạt động:

- **W2 → W7.** Hai chuỗi scope mà pass của W7 không chạm tới chính là cơ chế tương thích. Chạy W7 trước W2 phá canonicaliser extension **một cách im lặng** — không test đỏ, chỉ có plugin ngừng nạp được đúng bản trong tiến trình. W2 gọi đây là "sai lầm 1" của W7, và là cách sai tệ nhất vì nó là cách sai **duy nhất** trong mục đó mà không để lại dấu vết.
- **W4 → W5 → W6.** W6 lật `CONFIG_DIR_NAME` tại `dirs.ts:27`. Nếu W4 chưa tách vế đọc khỏi vế ghi, thì `~/.omp` ngừng resolve **đúng khoảnh khắc** W6 lật — và W5 `config migrate` là con đường về duy nhất. Kế hoạch còn yêu cầu W5 phải **đã phát hành và đã đi qua một bản release thật** trước khi W6 được land.
- **W7 → W8b.** Bảng `disposition.tsv` phải phản ánh tập file **sau** khi scope đã đổi. Lập bảng trước W7 là lập trên một cây sẽ bị thay đổi ngay sau đó, và 599 hàng quyết định bị thối trước khi ai kịp duyệt.
- **W9 → W13p.** Đây là cặp đẹp nhất để chứng minh thứ tự là bắt buộc. Giữa lúc TS đã đổi tên và lúc Python đổi tên, **binary mới không có lệnh `omp` trong khi client Python vẫn còn gọi `omp`**. Hai bên cùng thay đổi trong một release là lý do W13p phải ship cùng W9.

Cộng thêm W6a là **sub-task bắt buộc của W6**, không phải người bạn đi kèm: W6 không được merge nếu thiếu nó. Và W4 chặn W13 bằng một kiểm tra đơn giản đến kỳ lạ — `git grep -c 'ULTRAWORKERS_CONFIG_DIR' -- '*.ts'` hiện bằng 0, nghĩa là tài liệu không được ghi một biến mà trong mã chưa tồn tại.

**Cách hoàn tác rẻ nhất, và bắt buộc.** Ba pass thay chuỗi (W7, W8a, W8b) chỉ được chạy trên một nhánh tạm đã push, với cây sạch — `git status --porcelain` phải rỗng trước khi bắt đầu. Khi sai, `git checkout . && git clean -fd` trả cây về nguyên trạng trong một lệnh, và đó là lý do không bao giờ chạy `perl -pi`/`sed` trực tiếp trên `main` hay trên cây bẩn. Bản sao tệ nhất không phải là pass sai, mà là pass chạy trên cây đã có thay đổi chưa commit — lúc đó undo không còn là một lệnh.

## Mục tiêu

Người dùng cuối cùng sẽ thấy những điều này:

- **Ứng dụng tự giới thiệu bằng tên mới, thống nhất ở mọi điểm chạm.** Tiêu đề thông báo desktop (`notify-send`/gdbus), tên app trong OSC99 và id thông báo (`omp-1` → `<tên-mới>-1`), tiêu đề khung setup composer, tên file log xoay vòng và file audit log — tất cả suy ra từ một hằng số `APP_NAME` duy nhất, thay vì từ chín literal `omp` trùng lặp (W3).
- **Cấu hình, session và thiết lập mới được ghi vào `~/.ultraworkers`** thay vì `~/.omp` (W6), nhưng **không mất gì cả** khi nâng cấp giữa chừng: một bản cài chỉ có root cũ vẫn đọc root cũ; một bản cài có cả hai thì ưu tiên root mới; một bản cài không có root nào thì rơi về mặc định (W4).
- **Có đường về bằng tay.** `omp config migrate` in ra đúng danh sách thư mục nó sẽ di chuyển rồi thoát mà không chạm vào gì; chỉ khi có `--apply` mới thực sự chạy; chạy lần hai báo 0 lượt di chuyển và exit 0 (W5).
- **Lệnh cài vào PATH đổi tên.** Người dùng bản mới gõ `ultraworkers ...` thay vì `omp ...`; lệnh cũ biến mất khỏi PATH sau khi gói npm được cài lại (W9).
- **Artifact phát hành mang tên mới** cho cả tám target nền tảng: `omp-darwin-arm64` thành `ultraworkers-darwin-arm64`; công thức Homebrew cài một binary tên `ultraworkers`; `curl … | sh` tải `ultraworkers-<platform>-<arch>` (W10).
- **Người dùng cũ không bị bỏ rơi.** Chạy `omp update` trên tên cũ sẽ được chuyển sang gói mới và vẫn còn một lệnh `omp` chạy được (W12).
- **Người đọc tài liệu không còn thấy tên cũ trong văn xuôi** — README và 82 file trong `docs/` gọi lệnh bằng tên mới (W13).
- **Client RPC gõ tay và bot robomp spawn đúng binary mới** thay vì chết với `FileNotFoundError` trên `omp` (W13p).
- **Mọi import nội bộ trong repo trỏ tới `@ultraworkers/*`** (W7), và `omp gallery` in ra tên dự án `ultraworkers` trong dòng trạng thái và trong ảnh chụp màn hình mà lệnh đó tạo (W8a).

Ba thay đổi dưới đây **cố ý không nhìn thấy**, và sự vô hình ấy là một phần của thiết kế chứ không phải dấu hiệu làm ẩu:

- W1 thuần nội bộ — `user_visible_effect` của nó ghi thẳng là `none`. Nó chỉ đặt năm vị trí hợp đồng bên thứ ba vào một hằng số tên `WIRE_NAME` mà giá trị vẫn là `"omp"`. Đổi nó sớm là cách biến một đổi tên hình thức thành đổi tên wire, và bốn file test vàng hiện có là lưới an toàn duy nhất cho sai lầm đó.
- W6a không đổi gì trên màn hình — và đó chính là mục tiêu. Mọi project có thư mục `.omp` (kể cả chính repo này, đang giữ 14 file được git track dưới `.omp/commands`, `.omp/skills` và `.omp/tools`) vẫn phải resolve đúng thư mục đó sau khi root cấp nhà đổi tên.
- W11 không có gì thấy được. Nó đổi 70 file test từ literal sang đọc hằng số, giữ lại đúng một pin giá trị thật cho mỗi bề mặt.

Có một điều cần nói thẳng về thứ tự: trong suốt milestone, thứ người dùng gõ thay đổi **ba lần ở ba thời điểm khác nhau**. Ở sóng 1, tên hiển thị đổi nhưng lệnh vẫn là `omp` và `~/.omp` vẫn là nơi lưu mọi thứ — nên `omp config migrate` ở sóng 2 được tài liệu hóa bằng đúng tên lệnh cũ. Ở sóng 4, lệnh mới xuất hiện trên PATH. Người đọc tài liệu phải biết khi nào cái gì đúng, vì nếu không họ sẽ sửa doc bằng tên lệnh chưa tồn tại.

## Danh tính hai lớp

Đây là cả luận điểm của M5, và nó phải được nói ở đầu tài liệu vì mọi sai lầm đắt nhất trong milestone đều là hệ quả của việc nhầm hai lớp này là một.

**Lớp 1 — tên hiển thị.** `APP_NAME` tại `packages/utils/src/dirs.ts:21`. Đây là cái ứng dụng gọi chính nó: tiêu đề thông báo, tên app OSC99, tiêu đề setup composer, tiền tố tên file log. Đổi ở **sóng 1** (W3), và W3 phải xoá luôn chín literal `omp` trùng lặp để tất cả những thứ kia tự suy ra từ hằng số, thay vì ai đó sau này lại ghim một bản sao.

**Lớp 2 — tên thư mục trên đĩa.** `CONFIG_DIR_NAME` tại `dirs.ts:27`, cộng với tên app root XDG mà `dirs.ts:360` dựng ra. Đây là nơi chứa session, `secret-placeholder.key`, `autoqa.db`, `run/daemons`, `install-id`. Đổi ở **sóng 2** (W6) — và chỉ sau khi W4 đã tách vế đọc khỏi vế ghi, và W5 đã phát hành `config migrate`.

Hai lớp này **không tách rời ngay hôm nay**, và chính vế đó là lý do M5 phải làm việc này thay vì chỉ đổi một hằng số. `dirs.ts:360` dựng XDG app root bằng chính `APP_NAME` (`const appRoot = path.join(value, APP_NAME)`). Nghĩa là hôm nay, đổi tên hiển thị **đồng thời** dời `$XDG_{DATA,STATE,CACHE}_HOME/omp` — sessions, file `secret-placeholder.key`, database `autoqa.db`, và thư mục `run/daemons`. Đây là câu risk sắc nhất của cả milestone, và nó thuộc về W3 chứ không phải W6. Việc phải làm là **tách** hai lướp: cho XDG một hằng số riêng, để tên hiển thị đổi ở sóng 1 mà thư mục trên đĩa vẫn giữ nguyên tới sóng 2. Đây chính là câu hỏi mở của W3, và nó chưa có mặc định — cần bạn quyết.

**Giữa hai lời phát hành có gì xảy ra.** Sau khi sóng 1 ship, sản phẩm mang tên mới nhưng **vẫn đọc và vẫn ghi dữ liệu ở thư mục tên cũ**. Đây là trạng thái có chủ đích, không phải lỗi, nhưng nó phải được nói thẳng chứ không giấu. Cổng thứ 4 của W3 là bằng chứng thủ công cho đúng khoảnh khắc đó:

```
PI_CONFIG_DIR=.omp bun packages/coding-agent/src/cli.ts
```

và xác nhận ba điều: (a) cấu hình cũ **vẫn được đọc** từ `~/.omp`; (b) `ls ~/.omp/logs` cho thấy tên file đã mang tiền tố mới; (c) các file log cũ tên cũ vẫn còn nguyên và tự biến mất qua `prune-stale`. Cổng này thủ công bắt buộc vì không test tự động nào bắt được. Nếu câu hỏi mở của W3 được giải quyết theo hướng tách XDG dir name thì còn phải chạy thêm: đặt `XDG_DATA_HOME` / `XDG_STATE_HOME` / `XDG_CACHE_HOME` trỏ vào thư mục tạm có sẵn thư mục con tên cũ, chạy lại, và xác nhận nó **vẫn** dùng thư mục cũ.

**Hệ quả cho người đang dùng bản cũ — nói thẳng.** Sau sóng 2, bản cài của họ sẽ có **hai thư mục**. W4 đảm bảo không mất gì: đọc chấp nhận cả hai root, ưu tiên root mới khi có cả hai, rơi về mặc định khi không có root nào, và mọi thứ mới ghi vào root mới. Nhưng "không mất gì" và "chỉ có một thư mục" là hai câu khác nhau, và người dùng sẽ phải tự gọi `omp config migrate --apply` để gộp lại. Cổng đỏ đúng lúc này là W5 case 3 và case 5: chạy hai lần phải báo 0 lượt di chuyển, và `install-id` phải **giữ nguyên giá trị** qua lúc di chuyển — vì `install-id` là danh tính duy nhất mà mất đi là mất tiền. Nếu nó bị sinh lại thành UUID mới, **không call site nào phân biệt được**, và triệu chứng duy nhất là bảng chi phí bị reset.

Ngoài hai lớp trên còn hai trục danh tính nữa, và M5 xử lý chúng khác nhau:

- **Tên trên wire** (`WIRE_NAME`) — W1 dựng hằng số nhưng giữ nguyên giá trị `"omp"`. M5 đổi nơi hằng số sống, không đổi giá trị. Cổng 1 của W1 tồn tại để làm đúng việc đó: nó đỏ ngay khi ai đó gõ `export const WIRE_NAME: string = "ultraworkers"`, đó là sai lầm dễ nhất ở đây vì cả mục đích của hằng số là để được đổi tên và tên thương hiệu mới là thứ hấp dẫn nhất trong repo để gõ vào. Đây là nơi hợp đồng với Warp terminal và ACP client.
- **npm scope** `@oh-my-pi/` → `@ultraworkers/` — đổi ở sóng 3 (W7), trên 4118 file và 17212 lượt. Đây là lớp mà W8a và W8b buộc phải khớp: bảng quyết định của W8b phải được lập **trên cây sau W7**, không phải trước, vì phần lớn 599 file đã đổi scope.

## `do_not_rename`

Đây là thứ phải có **một** trước khi chạy bất kỳ lệnh thay chuỗi nào. Không có nó thì W7 và W8b không được phép đụng vào dòng nào — và với W8b, điều đó áp dụng ngay cả với dòng mang `disposition=rename`.

Dữ liệu của milestone dùng **hai tên file** cho việc này, và sự khác biệt đó phải được nói thay vì gộp làm một:

| Tên | Xuất hiện ở | Trạng thái trong dữ liệu | Vai trò |
| --- | --- | --- | --- |
| `scripts/rename/do_not_rename.tsv` | W6, danh sách file | `[create,UNVERIFIED]` | hàng cho thư mục `.omp` cấp project, tạo ra ở bước 8 của W6 |
| `scripts/rename/keep-list.txt` | W7, W8a, W10 | `[create,verified]` ở W7, `[create,UNVERIFIED]` ở W10 | danh sách loại trừ mà pass `sed` của W7 nạp, và nơi W8a thêm 3 hàng `N18`–`N20` |

`light.json` **không** nói rõ hai tên này là cùng một vật thể hay hai file khác nhau — và sự chênh lệch trạng thái `[create,verified]` / `[create,UNVERIFIED]` giữa chúng là lý do phải hỏi chứ không nên đoán. Cả hai đều chưa tồn tại trên cây. Hãy xác nhận tên chính xác và chỗ sinh ra nó trước khi viết mục W6; nếu là hai file thì phải nói rõ cái nào là nguồn sự thật, vì cổng của ba mục đang kiểm `keep-list.txt` cụ thể. Kế hoạch tổng có danh sách này ở §2.3.

**Ba cổng GATE 0 đều là cùng một kiểm tra**, và cả ba đều phân biệt được "BLOCKED" với "chưa xong":

- W7: `test -f scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list.txt missing — W7 is BLOCKED'; exit 1; }`
- W8a: cùng lệnh, cộng thêm `grep -q 'N7' scripts/rename/keep-list.txt` để chứng minh keep-list đã qua duyệt W7, và ba điều kiện còn lại về W2, W7 và alias `N8`.
- W8b: `test -d scripts/rename` và `test -f scripts/rename/disposition.tsv`, rồi `bun scripts/rename/check-disposition.ts --gate0`.

**Điều kiện duyệt, không phải điều kiện tồn tại.** Keep-list phải nằm trên `main` và được **một người duyệt khác người viết**. Với W8b, bảng `disposition.tsv` còn khắt hơn: mỗi hàng phải có `approved-by` khác `authored-by`, cả hai không rỗng, `reason` không rỗng ở bất kỳ hàng nào, và `keep_refs` khác rỗng **khi và chỉ khi** `disposition` bắt đầu bằng `keep-`. Không có bảng thì W8b không được sửa một dòng nào. Với W8a, ba hàng `N18`/`N19`/`N20` mới phải có phần `#` lý do không rỗng — vì Gate B giữ giá trị trong **code**, còn Gate E giữ **quyết định** trong keep-list, để một `sed` tương lai không xoá chúng.

**Nhóm user/group Unix nằm ngoài danh sách này.** Đó không phải sơ suất mà là điểm yếu thật, và nó thuộc nhóm thứ tư ở mục kế tiếp.

## Bốn nhóm vỡ âm thầm

Bốn nhóm dưới đây hỏng mà **không** báo lỗi, không đỏ cổng nào, và — với ba trong bốn — không có gì bên trong repo này quan sát được hậu quả.

**1. Tên release asset tách tên.** `scripts/ci-release-build-binaries.ts` sinh tên artifact, `scripts/install.sh` tiêu thụ nó qua `BINARY="omp-`, và `scripts/ci-update-brew-formula.ts` cài nó. Ba chỗ đó hiện đều in ra `omp`, nên tripwire chạy xanh hôm nay và là thật, không phải mệnh đề ngang nhiên. Đổi một trong ba mà quên hai cái còn lại không làm hỏng một test nào — **vì không có gì trong repo này thực thi `install.sh`**. Hậu quả là một 404 trên mọi lượt cài một dòng lệnh, và người dùng chỉ biết khi cài. Vì vậy cổng 1 của W10 bắt buộc so khớp ba chiều producer / consumer / brew, và nó là cổng duy nhất có thể bắt được lỗi này mà không phải chạy một bản release. Tệ hơn: nếu ai đó cập nhật fixture của test cho khớp mà quên cập nhật producer, test vẫn xanh. Vì vậy PR phải chứa **ảnh chụp cổng đỏ** lấy giữa bước 3 và bước 4 — một PR chỉ lúc nào cũng xanh là một PR chưa chứng minh lưới an toàn hoạt động.

**2. Nhãn runner tự đăng ký ngoài repo.** Nhãn `omp-kata` trên 12 dòng `runs-on:` và nhánh pull-request `omp2` tại `ci.yml:34` được đăng ký ở nơi khác, ngoài kho này. Đổi tên một trong hai là CI trỏ tới một target không tồn tại trên host nào, và hình dạng hỏng của nó là **một job không bao giờ được lên lịch và không bao giờ báo lỗi**. Không cổng nào trong tài liệu này thấy được điều đó — kể cả người đã gây ra nó cũng không thấy. Vì vậy W10 giữ cả hai nguyên vẹn và thêm cổng 3 chỉ để chứng minh chúng còn nguyên: `grep -rn 'runs-on:.*omp-kata' .github/workflows/ | wc -l` phải in ra `12`. Đây là sai lầm hậu quả nặng nhất và khó thấy nhất trong toàn bộ mục phân phối.

**3. Gói Python mang tên cũ trong metadata.** Trong `python/omp-rpc` và `python/robomp`, chỉ hai dòng nguồn sinh ra tên binary: `client.py:455` và `config.py:95`. Nhưng còn hai override cấu hình được **ship** mà grep `"omp"` của kế hoạch không nhìn thấy, vì ở đó giá trị không nằm ở đầu dòng và đứng sau tên biến: `python/robomp/docker-compose.yml:81` và `.env.example:185`, dưới `ROBOMP_OMP_COMMAND`. Sửa hai dòng Python rồi coi như xong là một cửa sổ hởng âm thầm: container khởi động, robomp lên, và lần spawn RPC đầu tiên là bằng chứng duy nhất. W13p GATE 2 tồn tại chính để chặn đúng lỗi mà kế hoạch không có — hôm nay nó in `shipped_overrides=[omp,omp]` và đỏ có chủ đích. GATE 3 của W13p là gương cấu trúc của nhóm 1 ở trên: nó so khớp **bốn** nguồn — `client`, `config`, `compose`, `env` — và đỏ khi bất kỳ nguồn nào bị bỏ sót, kể cả trường hợp đáng lẽ GATE 1 sẽ báo thành công. Hôm nay nó in `client=omp config=omp compose=omp env=omp`, tức xanh; nó phải xanh lại chỉ khi cả bốn cùng đọc tên mới.

**4. User/group Unix cấp máy không nằm trên danh sách cấm nào.** Phần còn lại của `python/**` là một nhóm Unix được materialize trên host thật, layout đĩa của container sandbox, và thư mục config `~/.omp` thuộc về W4/W6 — tất cả đều giữ nguyên. Nhưng nhóm Unix nằm **ngoài tầm bảo vệ**: bảng quyết định `disposition.tsv` của W8b được lập cho tập file `.ts`, nên không hàng `keep-*` nào bảo vệ nó, và keep-list thì chỉ phủ phạm vi repo. Thứ duy nhất đứng giữa là cách W13p ghim số đếm **theo từng file** — `test_user_group.py` 5, `worker.py` 2, `sandbox.py` 2, `test_sandbox.py` 8, `test_worker.py` 3, tổng 20 — thay vì một tổng chung. Một tổng chung không phân biệt được "tôi để yên nhóm Unix" với "tôi đã đổi nhóm Unix và xào một chỗ khác cho khớp con số": hạ `test_user_group.py` từ 5 xuống 0 **và** hạ `test_sandbox.py` từ 8 xuống 3 đều cho đúng tổng 20. Pin theo file thì phân biệt được. Hậu quả khi hỏng cũng âm thầm theo nghĩa đen: nó hỏng **máy**, không hỏng repo, và không cổng nào ở đây nhìn thấy một host.

## Không làm gì

Bốn nhóm dưới đây M5 **cố ý** không đổi. Không phải vì bỏ sót, mà vì đổi chúng sẽ phá hỏng những thứ đang hoạt động và vì M5 không được giao việc đó.

**Họ tiền tố biến môi trường `PI_*` và `OMP_*`.** Chúng không biến mất; W4 chỉ **thêm** `ULTRAWORKERS_CONFIG_DIR` làm bí danh có độ ưu tiên cao hơn `PI_CONFIG_DIR`, và toàn bộ danh sách cũ vẫn được tôn trọng. W13 chỉ thêm cột tương thích cho **đúng một** bí danh `ULTRAWORKERS_*` mới vào `docs/environment-variables.md` — 100 dòng trên 11 bảng, mỗi bảng một kiểu header khác nhau, sửa tay. Quy tắc B của W13 là hợp đồng hai chiều: không được phép có `ULTRAWORKERS_*` nào trong mã mà không có dòng trong doc, và cũng không được có dòng nào trong doc mà không chỗ nào đọc. Hôm nay cả hai phía đều 0 và `comm` rỗng; nó đỏ đúng lúc W4 thêm biến mà W13 quên ghi, hoặc khi doc nói một tên không tồn tại.

**16 basename sau dấu `/` trong trường `name` của manifest.** W7 đổi tiền tố scope và **giữ nguyên cả 16 basename**. W8a giữ tiếp 7 giá trị wire còn lại, ba cái phải thêm mới vào keep-list. W8b giữ `ORIGINATOR_CODEX`, `service.name` của OTLP, tên bank hindsight, URL scheme `omp://`, tên group Unix và nhãn runner. `WIRE_NAME` vẫn là `"omp"`, và cổng 1 của W1 ghim đúng điều đó. Lý do chung: đây là những giá trị mà bên thứ ba đọc — Warp, ACP client, OTLP collector, npm registry — và đổi chúng là một đổi giao thức, không phải một đổi tên.

**Thư mục `.omp` cấp project.** W6a tách nó ra khỏi `CONFIG_DIR_NAME` thành hằng số `PROJECT_DIR_NAME` và **không bao giờ** đổi tên nó. Phương án đọc kép ở cấp project (option (a) của kế hoạch) vẫn là M và **không được chọn nếu chưa có quyết định**: nó sẽ buộc `config migrate` chạm vào một thư mục đã nằm trong git history của người dùng, đúng cái duy nhất milestone này được giao để không làm. Sự tồn tại bất biến của hằng số này được bảo vệ bằng một khẳng định **phủ định** — nó đỏ nếu ai đó đặt `PROJECT_DIR_NAME = CONFIG_DIR_NAME`, và đó là chế độ hỏng mà không suite test nào sẵn có trong repo bắt được, vì mọi suite sẵn có đều vẫn xanh khi hai hằng số bị gộp lại.

**User/group Unix cấp máy.** Như mục 4 ở trên: nó được materialize trên host thật và nó giữ nguyên.

Ngoài ra: **W1 và W11 không có tác dụng nhìn thấy** — W1 thuần nội bộ, W11 ghi rõ `Không có gì thấy được`. **W13 là hạng mục thuần tài liệu**, và nó chạy sóng 6, **sau W6**, với lý do rất cụ thể: kế hoạch yêu cầu tài liệu được viết khi cả `~/.omp` và `~/.ultraworkers` đã tồn tại, nếu không mọi câu về thư mục cấu hình trong doc sẽ mô tả một thế giới chưa tồn tại. W13 cũng **không chạm vào bất kỳ file changelog nào** — quy tắc C của nó đỏ ngay khi có ai thêm một mục changelog "vì lần đổi tên này hướng tới người dùng", đúng cái sai lầm mà `AGENTS.md` cấm. Và **W8a, W4, W5, W13 đều phụ thuộc M2**: bảng `legacy-pi-compat` phải đã đóng băng và exports map phải chốt trên `main`, vì cả M2 và M5 đều chạm vào nó.

## Điều kiện tiên quyết

Ba mức độ, đã đo bằng lệnh thật trên cây sạch.

**1. `bun test` KHÔNG bị chặn toàn cục.** Đây là điều chỉnh quan trọng nhất, và nó ngược với giả định phổ biến. `packages/utils/test/` **chạy được**: `bun test packages/utils/test/dirs.test.ts` cho 6 pass / 0 fail, `install-id.test.ts` cho 5 pass / 0 fail, `dirs-python-gateway.test.ts` cho 2 pass / 0 fail, `worker-host.test.ts` cho 4 pass. Lý do là `packages/utils/src/dirs.ts` chỉ import `node:fs`, `node:os`, `node:path` và `../package.json` — không có đường nào tới addon native. Ngược lại, phần lớn test trong `packages/coding-agent/test/` đỏ với `Cannot find module .../packages/natives/native/pi_natives.darwin-arm64.node` — lần chạy đầy đủ cho `913 pass / 1445 fail / 1410 errors` trên 1519 file, và 39 trong 40 file test ở cấp đỉnh đầu tiên đỏ hoàn toàn, nhưng **không phải tất cả**, nên đừng viết "mọi". Còn trong lần chạy đầy đủ `packages/utils/test/` (81 file, `658 pass / 2 skip / 17 fail / 16 errors`) thì 17 **file** đỏ, không phải 17 lỗi dồn vào hai file: cùng một nguyên nhân addon, 16 file trong số đó chạy 0 test, và chỉ `logger-contract.test.ts` còn chạy được (12 pass / 1 fail trong 13 test). Hệ quả thực tế: một cổng viết kiểu "các test này xanh" sẽ đỏ vì một lý do không liên quan, và kỹ sư phải biết điều đó trước khi tin cổng. Hệ quả thứ hai, nguy hiểm hơn: một bộ test ở `packages/utils/test/` có thể báo xanh vì nó **không chạy** chứ không phải vì nó đúng. W5 xử lý đúng cái này bằng một đối chứng đo được — `bun test packages/utils/test/install-id.test.ts` trong cùng package đó exit 0, vì nó import subpath `@oh-my-pi/pi-utils/dirs` không kéo `@oh-my-pi/pi-natives` vào đồ thị. Không có đối chứng đó, "xanh" ở `packages/utils` không mang thông tin.

**Một lần chạy test đỏ TRƯỚC khi build addon nghĩa là gì.** Nghĩa là con số đỏ trước và sau build không so sánh được với nhau — build xong, 17 lỗi đó biến mất, và một báo cáo ghi "17 fail trước, 0 fail sau" đang khoe một thứ mà build đã làm chứ không phải việc của bạn. Ngược lại, một báo cáo ghi "đỏ 17" sau khi đã build là dấu hiệu bạn đang đọc nhầm một con số baseline cũ. Chụp lại baseline **ngay bây giờ, trước khi build**, và dán vào PR làm dòng đối chiếu.

**2. Lệnh gỡ chặn thất bại trên máy này.** `bun --cwd=packages/natives run build` dừng với `CMake Error: CMake was unable to find a build program corresponding to "Ninja". CMAKE_MAKE_PROGRAM is not set.` Cần có `ninja` — cmake build của `opusic-sys` cần nó. Dạy kèm `brew install ninja` **trước**:

```
brew install ninja
bun --cwd=packages/natives run build
```

Đây là điểm mà bốn kế hoạch trước đã phải sửa. Trong khi chưa build được, mọi cổng nằm trong `packages/coding-agent/test/` đỏ với lỗi addon, trông y hệt một thay đổi hỏng. W9 xử lý việc này bằng cách tách tiền đề khỏi kết quả: nếu `which ninja` thất bại thì **dừng ngay** và báo `PRECONDITION FAILED — addon native chưa build`, kèm lỗi cmake nguyên văn, và tuyệt đối không báo "test failed". W5 đã tự tránh bẫy này. Cổng chính của nó là `bun test packages/utils/test/config-migrate.test.ts` — file test nằm trong `packages/utils/test/` **cố ý**, vì đó là bề mặt duy nhất trên máy này nơi bốn tính chất dưới đây thực sự bị bác bỏ được; đối chứng đo được là `bun test packages/utils/test/install-id.test.ts` trong cùng package đó exit 0, 5 pass / 0 fail. Hôm nay cổng đỏ vì file chưa tồn tại (`EXIT=1`), và sẽ xanh **khi và chỉ khi** việc làm đúng — đỏ hôm nay ở đây là thông tin, không phải nhiễu. Cổng thứ hai, `packages/coding-agent/test/config-migrate-cli.test.ts`, nằm trong bề mặt bị addon chặn: nó luôn đỏ trên máy chưa build, nên phải ghi `NOT RUN — environment blocked`, không bao giờ ghi "pass".

**3. `bun run check:ts` chạy được.** Exit 0 đã đo nhiều lần. Thời gian dao động rất nhiều tuỳ tải máy: khoảng 29 giây trên máy rảnh, ~40 giây khi bận, tới 4m14s ở một lần đo khác — hãy ghi con số bạn thực sự đo, đừng chép của người khác. Đây là tín hiệu chính của M5, và nó là tín hiệu duy nhất chạy được ở gần như mọi sóng. Nhưng nó **mù cấu trúc**: nó bắt được import hỏng, import sai subpath, chu trình import, hằng số chưa tồn tại, và đổi tên định danh TypeScript — nó **không** bắt được đổi giá trị trên wire, đổi đường dẫn, hay đổi tên hiển thị sai. Ba loại đó chính là việc của các cổng grep và bảng quyết định, không phải của typecheck. Với W13p, `check:ts` thậm chí **mù hoàn toàn**: nó lọc `./packages/*` và oxlint chỉ hiểu JS/TS, nên không sửa file nào trong mục đó có thể làm nó đỏ. Không được báo nó là bằng chứng cho công việc đó. Còn với W5, `check:ts` là một tín hiệu **yếu**: một site quên sửa không sinh lỗi type nào, vì mở rộng `ConfigAction` để lại `VALID_ACTIONS` và `ACTIONS` typecheck được như tập con, và `switch` trên một union không có kiểm tra exhaustiveness ở đây. Số site phải đếm là **nghĩa vụ review**, không phải nghĩa vụ của công cụ — hãy nói thế trong PR thay vì ám chỉ typecheck đã bắt.

**Điều kiện tiên quyết riêng của M5**, không nằm trong ba mức trên:

- **`scripts/rename/keep-list.txt` phải tồn tại trên `main` và được một người duyệt khác người viết.** CHƯA CÓ — thư mục `scripts/rename/` không tồn tại (đã kiểm chứng lại ở `1454dc0`). Đây là Gate 0 của **cả ba** W7, W8a và W8b. Đây là điều kiện có lead time dài nhất vì nó cần hai người, và nó chặn nguyên sóng 3. Chi tiết ở [`do_not_rename`](#do_not_rename).
- **Scope npm `@ultraworkers` phải tồn tại và được sở hữu** — cổng ngoài repo G3 của kế hoạch §8. Cũng là lead time dài, và nó nằm ngoài tầm kiểm soát của repo.
- **M2 phải đã merge**: bảng `legacy-pi-compat` đóng băng, exports map chốt trên `main`. W4, W5, W8a, W13 đều phụ thuộc.
- **Baseline phải chụp trước khi chạy pass nào.** W7 chụp hai baseline: 13 file changelog / 85 lượt (GATE B) và 16 file dạng trần (GATE C). W8a chụp một baseline 15 dòng. Chụp sau khi đã sửa thì cổng so sánh trở nên vô nghĩa — và nó so sánh chính nó với bản đã hỏng.
- **`python3 -m pytest --version`** trả về `No module named pytest` trên máy này. W13p có công thức dựng venv riêng, và cổng hành vi của nó **phải** báo `NOT-RUNNABLE` và exit 2 nếu tiền tố không in `READY` — không bao giờ lọt qua trong im lặng. Khi dựng venv, hai lần gọi pytest phải giữ **riêng biệt**: gộp lại sẽ hỏng ngay lúc collect vì `ModuleNotFoundError: No module named 'tests.test_user_group'` — cả hai thư mục đều tên `tests` và không có `__init__.py`.

## Thứ tự thực hiện

### Sóng 1 — cô lập hợp đồng, rồi mới đổi lớp hiển thị

**Bàn giao:** tên hiển thị mới tồn tại trong mã và suy ra mọi nơi; `~/.omp` vẫn là thư mục duy nhất trên đĩa; tên wire vẫn là `"omp"`.

**Gồm:** W1, W2, W3. W2 được khuyến nghị tách thành W2a (sóng 1, ship được một mình) và W2b (đi kèm hoặc ngay sau pass 1 của W7). W2a cố ý **không** có test case mới — các grep chính là cổng của nó, vì chúng là thứ duy nhất phân biệt được một W2a đúng với một W2a lỡ lật cả canonical scope. W2b thì **không bao giờ được đi trước W7**: `Bun.resolveSync("@ultraworkers/pi-utils")` ném lỗi ngay ở phạm vi module của test, và bản chất sự cố đó là một cổng đỏ chứ không phải một cổng xanh.

**Song song được: W1 và W2a** nằm ở file khác nhau. W3 **phải** sau W1 — literal ở các vị trí wire cần rời đi trước, nếu không chúng bị cuốn vào diff của W3. W2a là vệ sinh thứ tự hơn là phụ thuộc thật.

**Phải có trước:** chỉ ba mức ở [Điều kiện tiên quyết](#điều-kiện-tiên-quyết). Sóng 1 là sóng duy nhất không cần keep-list.

**Đúng sau khi kết thúc:** bốn file test vàng byte-identical với HEAD — `git diff packages/coding-agent/test/ packages/catalog/` **rỗng**. Đây là điều kiện bắt buộc của W1, không phải khuyến nghị: nếu chúng thay đổi, kỹ sư đã biến một cái ghim vàng thành mệnh đề ngang nhiên và W1 coi như chưa xong bất kể test có xanh hay không. Ngoài ra `git diff --stat` phải liệt kê **đúng** sáu file nguồn sửa đổi cộng một file test mới, và `packages/catalog/src/wire/codex.ts` không được có trong đó — đó là lỗi phạm vi phổ biến nhất. Và cổng 4 thủ công của W3 phải đã chạy.

### Sóng 2 — tách vế đọc khỏi vế ghi, rồi mới lật tên thư mục

**Bàn giao:** ghi mới đi vào `~/.ultraworkers`, đọc chấp nhận cả hai root, `config migrate` đã có, thư mục `.omp` cấp project được ghim vào hằng số riêng.

**Gồm:** W4, W5, W6 (với W6a bắt buộc).

**Song song được: không có gì.** W4 → W5 → W6a → W6 là một chuỗi cứng. W4 phải có trước vì nó tạo ra danh sách ứng viên đọc và `getConfigWriteRoot` mà W6 lật — kiểm chứng được bằng `git grep -n 'getConfigWriteRoot\|getConfigDirCandidates' -- packages/utils/src/dirs.ts` trả về rỗng trên HEAD. W5 phải có trước vì nó là đường về bằng tay. W6a là sub-task bắt buộc của W6 và phải land trước hoặc trong cùng commit.

**Phải có trước:** W3 đã land (nếu không, W4 không có tên mới để ghi và W5 không có tên mới để di chuyển tới). M2 đã merge. Và `ninja` đã cài để build addon.

**Đúng sau khi kết thúc — có một cổng lịch, không chỉ là cổng git:** kế hoạch yêu cầu W5 phải **đã phát hành và đã được dùng trong một bản release thật** trước khi W6 được land. W6 phải không land trước điều đó. Đây là khoảng thời gian chờ thật, không phải hàng đợi review. Riêng W4 còn có một cổng bắt buộc là **red-before-green**: trước khi đổi `getInstallId()`, cắm một UUID ở đường dẫn install-id cũ và resolve với root mới rỗng phải trả về một UUID **khác**, và khẳng định giá trị đã cắm phải quay lại phải đỏ. Đó là bằng chứng duy nhất rằng thay đổi đang làm đúng việc gì. Với hai file Rust mà W4 chạm, không có harness test trong milestone này — `bun run check:rs` chỉ type-check, và `darwin.rs` chỉ chạy được trên macOS — nên một người phải **đọc tay** hai hunk đó, và nói thẳng điều đó trong PR thay vì ám chỉ một lần chạy xanh đã phủ chúng.

### Sóng 3 — đổi npm scope, rồi phân loại token hiển thị

**Bàn giao:** mọi import nội bộ trỏ tới `@ultraworkers/*`; `bun.lock` tái sinh; bảng quyết định `disposition.tsv` tồn tại với một hàng quyết định cho từng file.

**Gồm:** W7, W8a, W8b. Thứ tự là W7 → W8a → W8b, **tuần tự**, không có gì chạy song song được sau W7.

**W8b là mục L duy nhất, và vì sao nó tách riêng.** Theo thang của kế hoạch — S = 1 ngày, M = 2,5 ngày, L = *chưa quy ra được ngày* — W8b là mục duy nhất ở mức L mà **không có con số ngày nào cả**, và con số đó không nhỏ đi khi bảng quyết định tồn tại. Lý do không phải số lượng file: 599 file không phải 599 lần gõ, mà là 599 lần **quyết định**. Phân bố thực tế giúp thấy tại sao khó: 281 file có đúng 1 lượt (phần lớn rẻ, nhưng 226 file test trong tập vẫn cần W11 đọc lại), 31 file có từ 10 lượt trở lên, và 851/1768 dòng có hit là dòng **comment** — dễ đọc nhưng rất dễ bị `sed` quét. File đậm nhất là `update-cli.test.ts` với 59 lượt trên 58 dòng. Nó tách riêng vì nó là mục mà **một `sed` sai là vĩnh viễn**: diff trên hàng trăm file không ai review nổi, và nếu ai đó "giúp" viết lại các file test vàng để so với hằng số thay vì literal, mọi suite sẽ xanh trong khi hành vi đã hỏng. Đó là lý do nó cần một script `check-disposition.ts` chạy độc lập với test runner, và một cổng Gate 1 đối chiếu tập hit còn lại với `disposition` **trong file**, chứ không với một danh sách viết tay thứ hai. Nói thẳng để tránh hiểu nhầm: W10 cũng được xếp L, nhưng là L **vì lịch** — nó vẫn mang ước lượng 1,5–2 ngày, còn W8b thì không. W12 là "S in code, L in calendar", vì công việc trong repo nhỏ và phần chi phối lịch nằm ngoài repo.

**Phải có trước:** W2 đã land — đây là phụ thuộc cứng và là lỗi đắt nhất của sóng này. Thêm W1, keep-list trên `main` đã được duyệt, và cổng ngoài repo: scope `@ultraworkers` tồn tại và được sở hữu. Cả ba baseline phải chụp **trước** khi pass nào chạy.

**Đúng sau khi kết thúc:** 13 file changelog và 5 tài liệu kế hoạch **không bị đụng**; dạng trần `"oh-my-pi"` vẫn đúng 16 file (W7 không được chạm vào nó — W8 sở hữu nó); bảng có `approved-by` khác `authored-by` ở mọi hàng, `reason` không rỗng ở hàng nào, và `keep_refs` khác rỗng khi và chỉ khi `disposition` bắt đầu bằng `keep-`. Riêng W8a phải giữ nguyên 7 giá trị wire mà nó đã quyết định giữ — Gate B của nó kiểm từng dòng, và đó là con đỏ duy nhất bắt được một `sed` đại trà trên 15 file, vì trong trường hợp đó Gate A **vẫn xanh** vì tập file không đổi.

### Sóng 4 — đổi tên binary và toàn bộ bề mặt phân phối

**Bàn giao:** `ultraworkers` nằm trên PATH; 16 loại selector worker dẫn xuất từ một hằng số tiền tố duy nhất; artifact phát hành mang tên mới; client Python spawn đúng tên mới.

**Gồm:** W9, W13p, W10. Thứ tự là W9 → W13p → W10.

**W13p và W10 không tách rời như vẻ ngoài.** W9 là điều kiện của cả hai. W13p **phải trước W10**: công việc Docker của W10 build cái image mà shim `/usr/local/bin/omp` tại `Dockerfile:180` và `ENTRYPOINT` tại `:216` chính là thứ `ROBOMP_OMP_COMMAND` trỏ tới — nếu W10 đổi tên shim mà W13p chưa cập nhật `docker-compose.yml:81`, image robomp được build trỏ tới một lệnh mà nó không còn chứa. Nói cách khác, đây là cùng bệnh "producer và consumer tách tên" như nhóm 1, chỉ khác ngôn ngữ.

**Phải có trước:** W1, để vị trí wire đã chạy bằng hằng số và các lượt khớp trong W9 không bị trộn wire với hiển thị với selector trong cùng một lần khớp. W3, vì `APP_NAME` đã mang tên mới. W7, vì các khai báo `bin` mà W9 đổi đã nằm trong manifest đã đổi scope.

**Đúng sau khi kết thúc:** `omp-kata` trên đúng 12 dòng `runs-on:` và `omp2` tại `ci.yml:34` **còn nguyên y hệt**; bốn chỗ mang tag Docker in ra cùng một tag; ba chiều producer / consumer / brew khớp nhau. Và báo cáo độ phủ phải trung thực: trên darwin, `bun run ci:test:smoke` phủ **13/16** selector, thiếu `stats_sync`, `tab` và `js_eval_process`; trên Linux là 14/16. Không được viết "smoke xanh nghĩa là đổi tên selector đã đúng". Ngoài ra, ở W9 **"grep sạch" là bằng chứng sai**: 44 lượt sentinel trong test cộng 5 lượt trong `fixtures.json` phải **cố ý** còn lại; cổng đúng là "con số khớp danh sách từng dòng", không phải "zero hit".

### Sóng 5 — chỉ bộ test khẳng định tên về hằng số

**Bàn giao:** 70 file test đọc hằng số thay vì literal, với một pin giá trị thật cho mỗi bề mặt; một detector CI đọc `disposition.tsv` để cổng đỏ được ngay cả khi bộ test không chạy được.

**Gồm:** W11, một mình. Đây là sóng tuần tự tuyệt đối.

**Phải có trước:** W1, W3, W4, W7, W8b, W9 — cả sáu. Không phải vì lịch, mà vì từng cái cung cấp thứ W11 cần: `WIRE_NAME` để `warp-events.test.ts` chuyển sang, `APP_NAME`, danh sách ứng viên hai root để phân loại 217 lượt `.omp`, scope đã đổi để không sửa tên import hai lần, `disposition.tsv` để detector có cái gì đọc, và tiền tố selector đã chốt.

**Đúng sau khi kết thúc:** `bun scripts/ci-rename-test-literals.ts` exit 0 khi sạch và exit 1 khi còn hit chưa có disposition, chạy được **không cần** addon native. Sóng 5 không có cổng nào chạy được trên máy chưa build, và điều đó phải được nói thẳng trong PR thay vì báo "pass". Ngưỡng nghiệm thu thật là CI, kèm một canary bắt buộc: một script khẳng định run cho ra số pass > 0 **và** không chứa chữ ký `Failed to load pi_natives native addon` / `No module named pytest`, để một môi trường bị chặn không bao giờ được báo là xanh.

### Sóng 6 — phát hành stub rename và quét tài liệu

**Bàn giao:** gói cuối cùng dưới scope cũ phát hành dưới dạng stub rename vẫn cho một lệnh `omp` chạy được; binary macOS được ký lại và notarize lại; tài liệu không còn mô tả tên cũ như thể đó là tên hiện hành.

**Gồm:** W12, W13.

**Song song được: có.** W12 phụ thuộc W9 và W10; W13 phụ thuộc W4, W6, W7, W8a, W9, W10 và M2. Không cái nào phụ thuộc cái nào, kể cả khi cả hai đều cần W10.

**Phải có trước:** riêng cho W12 — bên ngoài repo và chi phối lịch: quyền sở hữu scope npm, quyền publish registry, danh tính ký Apple, và một kiểm tra rename end-to-end với manifest thật. Công việc trong repo của W12 nhỏ; cái làm nó nặng là ngoài repo. Ký là **tiền đề, không phải việc làm sau** — PR phải nói commit nào ký lại artifact dưới tên file mới, chứ không mô tả ký là việc tẻ tiếp theo.

**Đúng sau khi kết thúc:** không một file changelog nào bị sửa; quy tắc B của W13 rỗng theo cả hai chiều; `bun run check:ts` exit 0. Và cổng ký notarize phải báo `BLOCKED`, không phải `PASS`, nếu nó không chạy được tại máy. Lưu ý khi viết cổng tài liệu: `|| true` là **bắt buộc** trước `git grep`, vì `git grep` exit 1 khi không khớp; nối bằng `&&` sẽ khiến `comm` bị bỏ qua và cổng luôn xanh — tức là cổng không phân biệt được "đã làm" với "lệnh không chạy".

## Quyết định cần chốt trước khi code

| Quyết định | Work item | Chặn cái gì | Cần có trước sóng |
| --- | --- | --- | --- |
| Scope npm `@ultraworkers` tồn tại và được sở hữu | W7 | toàn bộ sóng 3 và mọi thứ sau nó | 3 |
| `scripts/rename/keep-list.txt` trên `main`, người duyệt khác người viết | W7, W8a, W8b | Gate 0 của cả ba | 3 |
| `do_not_rename.tsv` hay `keep-list.txt`: một hay hai file, cái nào là nguồn sự thật | W6, W7, W10 | ba cổng đang kiểm `keep-list.txt` cụ thể | 2 |
| M2 đã merge: bảng `legacy-pi-compat` đóng băng, exports map chốt | W4, W5, W8a, W13 | sóng 2 | 2 |
| Chụp baseline trước khi chạy pass nào: 13 file / 85 lượt; 16 file dạng trần; 15 dòng | W7, W8a | GATE B, GATE C, GATE A | 3 |
| `brew install ninja` trên máy build | tất cả | nửa `packages/coding-agent` của mọi cổng test | 2 |
| W2 tách W2a / W2b, hay gộp làm một | W2 | sóng 1 bàn giao gì | 1 |

Ba dòng đầu là điều kiện có **lead time dài nhất** và phần lớn nằm ngoài tầm kiểm soát của repo: một cần người bên ngoài sở hữu một namespace, một cần hai người thay vì một, một cần một câu trả lời về tên file. Chúng nên được mở ngay khi milestone bắt đầu, vì cả ba đều chặn sóng 3 chứ không chỉ một work item. Dòng "chụp baseline" nghe nhỏ nhưng là dòng **không thể bù lại**: một baseline chụp sau khi đã sửa thì cổng so sánh đó vĩnh viễn xanh.

## Quyết định cần bạn chốt

| Quyết định | Work item | Vì sao nó chặn | Cần có trước sóng |
| --- | --- | --- | --- |
| URL scheme `omp://`: giữ hay đổi | W8b | câu hỏi mở số 1, và enum 5 giá trị của kế hoạch không có chỗ cho nó. Trả lời "đổi" nghĩa là 24 file tham chiếu phải đổi trong một commit, và `omp-protocol.ts`, `omp-scope.ts`, `prompts/internal-urls/omp.md` phải được đổi **tên file** cùng lúc. Chưa có mặc định — cần bạn quyết | 3 |
| `APP_NAME` có tách khỏi tên XDG dir không | W3 | hướng (a) hay (b). Hướng (b) là thứ giữ cho hai lớp danh tính tách được; hướng (a) để tên hiển thị điều khiển cả thư mục trên đĩa, đúng cái rủi ro mà W3 ghi ra ở `dirs.ts:360`. Chưa có mặc định | 2 |
| W6a: đọc kép cấp project, hay ghim `PROJECT_DIR_NAME` | W6a | phương án (a) còn là M và không được chọn nếu chưa có quyết định; nó kéo `config migrate` vào thư mục đã nằm trong git history của người dùng | 2 |
| Marker profile-alias và tên file `omp-profiles.fish`: đóng băng hay đổi | W9 | quyết định này quyết định `upsertBlock` append hay thay, và có thể làm thay đổi hành vi hiện có | 4 |
| 24 URL `github.com/can1357/oh-my-pi` trên 13 file: có đổi không | W13 | quyết định ở câu hỏi mở số 1; nó thay đổi khối lượng công việc của cả lượt quét tài liệu | 6 |
| Danh tính ký Apple và quyền publish registry cho stub | W10, W12 | nằm ngoài repo và lead time dài hơn cả sóng 4 lẫn sóng 6; nó là tiền đề của ký và notarize chứ không phải việc làm sau | 4 |
| Ngân sách duyệt 599 hàng `disposition.tsv` bằng hai người | W8b | bảng cần `approved-by` khác `authored-by`; đây là phần tốn kém thật của mục L duy nhất | 3 |

Bảng này **không** liệt kê 73 câu hỏi mở và 146 đính chính: dữ liệu chỉ ghi **số lượng**, nội dung nằm ở bản đặc tả của từng mục. Bất định không dồn đều — W9 gánh nhiều nhất (21 đính chính, 6 câu hỏi), rồi W13 (15 / 6), W10 (13 / 6), W8b (11 / 6), W5 và W7 (10 mỗi mục). Nếu phải cắt phạm vi, hãy cắt ở W13 trước, **không** cắt ở W8b.

## Quy ước khi đọc

**Ngôn ngữ.** Văn xuôi tiếng Việt, giữ nguyên code. Đường dẫn, neo `file:line`, tên định danh, câu lệnh và tên file test giữ nguyên — chúng là thứ một bên khác kiểm chứng lại được, và dịch chúng chỉ làm mất điều kiểm chứng được.

**Lệnh kiểm.** `bun check` và `bun test`. **TUYỆT ĐỐI không `tsc`, không `npx tsc`** — dự án cấm. Với Rust, dùng `bun run test:rs` chứ không chạy `cargo test` trực tiếp. W4 chạm hai file Rust (`crash_handler.rs`, `oauth_callback/darwin.rs`) và `darwin.rs` chỉ chạy được trên macOS, nên hai hunk đó phải được một người đọc đọc tay thay vì dựa vào một lần chạy xanh — và phải nói rõ điều đó trong PR thay vì ám chỉ một lần chạy đã phủ chúng.

**Không source-grep file implementation trong test.** `expect(src).toContain("someCall()")`, `.toMatch(/import …/)`, `.not.toContain("oldName")`, hay "comment phải nói X" đều bị cấm: chúng kiểm tra code **trông** thế nào chứ không phải nó **làm** gì, nên vỡ trên một refactor vô hại và xanh trong lúc hành vi đã hỏng. Rất nhiều mệnh đề trong tài liệu này là lệnh grep. Chúng là **mục kiểm tra thủ công của người review**, và phải được ghi là thế trong PR — giả vờ chúng là test tự động chính là cái bẫy "trông xanh, thực ra hỏng" mà toàn bộ milestone này sinh ra để chống. Khi một cái grep có thể bị viết thành một test hợp lệ (W6a clause 3, W13p Gate 3), hãy viết thành test.

**Không `mock.module()`.** Nó mutate module registry toàn cục và rò sang các file khác. Dùng `vi.spyOn(...)` trên object đã import, `vi.restoreAllMocks()` trong `afterEach`. Test phải an toàn với cả suite đầy đủ, không chỉ an toàn khi chạy một mình.

**Changelog chỉ cập nhật khi được yêu cầu.** M5 không thêm mục changelog nào trừ khi có yêu cầu rõ ràng. Các mục đã phát hành là bất biến, và W13 có một quy tắc riêng đỏ ngay khi có ai thêm mục "vì lần đổi tên này hướng tới người dùng".

**TUI sanitize.** Mọi thứ hiển thị trong tool renderer đều phải qua `replaceTabs()` (tab thành lỗ hổng thị giác), `truncateToWidth()` / `ui.truncate()` với hằng số từ `TRUNCATE_LENGTHS`, `shortenPath()` (không rò home directory), và giới hạn từ `PREVIEW_LIMITS`. Không có con số nào tự đặt. Và áp cho **mọi** đường render, không chỉ happy path — đặc biệt là thông báo lỗi, vì chúng thường nhúng sẵn nội dung file.

**Catalog policy sống trong KDL.** Không bao giờ viết điều kiện theo tên model trong TypeScript. Sửa policy trong cây `packages/catalog/src/compat/rules/*.kdl`, chạy `bun run gen:compat`, và commit `rules.json` cùng bản sửa `.kdl`. Điều này ít liên quan tới M5, nhưng M5 chạm `packages/catalog/` và W1 cấm `packages/catalog/src/wire/codex.ts` nằm trong diff — nếu một chỗ sửa policy lọt vào diff đổi tên, nó phải đi qua `gen:compat`, không phải qua tay.

**Cổng phải phân biệt được "chưa làm" với "chạy không được".** Đây là nguyên tắc xuyên suốt. Một cổng xanh vì bộ test không nạp được module là cổng không có thông tin. Mỗi cổng ở tài liệu này hoặc chạy được ngay, hoặc tách rõ tiền đề khỏi kết quả, hoặc báo `NOT RUN — environment blocked` bằng đúng ba chữ. Cổng nào không làm được điều đó thì viết lại trước khi chạy.
