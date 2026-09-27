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


---


## W1. Hằng số `WIRE_NAME` (sóng 1)

**Sóng:** 1 · **Effort:** S cho phần mã nguồn (sáu file: một dòng thêm trong `dirs.ts` cộng năm chỉnh sửa một–ba dòng), S cho phần test (một file mới ~15 dòng, không sửa test nào đang có). Ròng khoảng 40 dòng diff trên 7 đường dẫn. Con số "~10 dòng" của plan tổng thấp hơn thực tế vì không tính file test mới, nhưng phán đoán rằng đây là mục rẻ nhất của sóng thì đúng. Một thứ duy nhất có thể làm nó nổi lên là bộ dựng test cho DAP — cổng (6) ở dưới sinh ra đúng để chặn chuyện đó.
**Rủi ro chính:** Gõ nhầm tên thương hiệu mới vào `WIRE_NAME`. Đây đúng là lỗi mà plan nêu đầu tiên và nó là lỗi nhiều khả năng nhất, vì hằng số này sinh ra là để được đổi tên, còn tên mới nằm ngay đó trong mô tả milestone. Nếu xảy ra, cả năm tích hợp đổi danh tính cùng lúc và KHÔNG gì ném lỗi hết.

Thêm đúng một hằng số có tên, `WIRE_NAME`, giá trị của nó **cố ý vẫn là chuỗi `"omp"`**, rồi trỏ năm vị trí hợp đồng với bên thứ ba vào đó. Nhờ vậy lần đổi tên ở W7/W9 sẽ có một chỗ để sửa thay vì năm, và — vì bốn trong năm vị trí đó đã có sẵn test khoá bằng chuỗi vàng — việc đổi tên sẽ làm đỏ một test thay vì làm hỏng im lặng terminal Warp hay client ACP của người dùng.

Commit này phải **vô hình từng byte**: giá trị của hằng số là `"omp"`, y hệt mọi chuỗi nó thay thế. Hiệu ứng nhìn thấy được bị hoãn lại cho W7/W9, nơi người duyệt có thể thấy một lần đổi tên chạm vào đúng một hằng số thay vì phải tranh luận xem trong năm chỗ xuất hiện, chỗ nào mới là giá trị wire. Rủi ro nhìn thấy được duy nhất là loại rủi ro mà mục này sinh ra để ngăn: nếu `WIRE_NAME` bị đặt thành tên MỚI ngay trong commit này, tiền tố OSC cho trường `agent` của Warp, `agentInfo.title` của ACP, `clientID`/`clientName` trong `initialize` của DAP, trường multipart `z` của puush, và bank id mặc định của Hindsight sẽ đổi cùng lúc và hỏng mà không báo lỗi — không có lỗi nào được ném ra, chỉ có một terminal Warp ngừng gán sự kiện, một DAP adapter ngừng khớp client, và một memory bank bị tách làm đôi. Bốn test vàng sẵn có bắt được chuyện đó; test mới của mục này là thứ biến chính **hằng số**, chứ không chỉ các vị trí, thành một hợp đồng được khoá.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts` | sửa | Thêm `export const WIRE_NAME: string = "omp";` ngay sau `APP_NAME` (dòng 21), kèm một dòng JSDoc ở trên nêu bất biến: giá trị này là hợp đồng wire với bên thứ ba (DAP initialize `clientID`/`clientName`, tiền tố OSC agent của Warp, ACP `agentInfo.title`, multipart `z` của puush, bank id mặc định của Hindsight) và KHÔNG được đổi nếu chưa có quyết định tương thích. KHÔNG thêm thay đổi nào khác vào file này — `APP_NAME`, `APP_URL`, `CONFIG_DIR_NAME` và `USER_AGENT` thuộc W3/W6, phải để nguyên. | có — `sed -n '1,60p' packages/utils/src/dirs.ts`: dòng 20 là `/** App name (e.g. "omp") */`, dòng 21 là `export const APP_NAME: string = "omp";`, dòng 24 `APP_URL = "https://omp.sh/"`, dòng 27 `CONFIG_DIR_NAME = ".omp"`, dòng 36 `USER_AGENT = \`omp/${VERSION}\``. Chèn vào khoảng trống giữa 21 và 22. `packages/utils/src/index.ts:5` là `export * from "./dirs";` nên `WIRE_NAME` tự được re-export từ barrel — không cần sửa barrel. |
| `packages/coding-agent/src/dap/session.ts` | sửa | Trong `#buildInitializeArguments` (khai báo ở dòng 1463), thay hai chuỗi ở dòng 1465-1466 bằng hằng số: `clientID: WIRE_NAME,` và `clientName: WIRE_NAME,`. Thêm `WIRE_NAME` vào import `@oh-my-pi/pi-utils` sẵn có ở dòng 3 (dòng đó đang là `import { logger, ptree, untilAborted } from "@oh-my-pi/pi-utils";`); `@oh-my-pi/pi-utils` re-export nó qua barrel của `dirs`, nên không cần thêm dòng import mới. | có — `grep -n` ra `1465: clientID: "omp",` và `1466: clientName: "omp",`, cả hai chính xác, nằm trong `#buildInitializeArguments` ở dòng 1463. `packages/coding-agent/package.json:546` khai báo `"@oh-my-pi/pi-utils": "catalog:"`, và `packages/utils/src/index.ts:5` là `export * from "./dirs";`, nên import từ `@oh-my-pi/pi-utils` trần là đúng và khớp với kiểu import sẵn có ở dòng 3. LƯU Ý: đây là vị trí DUY NHẤT chưa có test vàng — xem phần Cần người quyết. |
| `packages/coding-agent/src/blob-broker/uploaders-legacy.ts` | sửa | Dòng 236, trong `createPuushUploader`: đổi `{ k: apiKey, z: "omp" }` thành `{ k: apiKey, z: WIRE_NAME }`. Thêm import cấp cao nhất `import { WIRE_NAME } from "@oh-my-pi/pi-utils";` — file hiện không hề có import `@oh-my-pi/pi-utils` nào (các import duy nhất là `node:buffer` và ba câu import cục bộ: `./destinations` và `./publication` kiểu `import type`, cùng một câu `./uploader-runtime` kiểu value/value+type), nên đây là dòng import mới thật sự, đặt sau import `node:buffer` và trước các import cục bộ. | có — `grep -n 'z: "omp"'` ra đúng một hit: `236: const body = multipartFile(request, "f", { k: apiKey, z: "omp" });`. Giá trị chảy vào trường form multipart `z` qua `multipartFile` (`packages/coding-agent/src/blob-broker/uploader-runtime.ts:105-115`, nơi làm `form.append(key, fields[key])`). Test vàng đã có sẵn: `packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts:342` khẳng định `expect(form.get("z")).toBe("omp")`. |
| `packages/coding-agent/src/modes/warp-events.ts` | sửa | Dòng 60: `agent: "omp",` thành `agent: WIRE_NAME,`. Mở rộng import sẵn có ở dòng 4 — `import { VERSION } from "@oh-my-pi/pi-utils/dirs";` — thành `import { VERSION, WIRE_NAME } from "@oh-my-pi/pi-utils/dirs";` (theo thứ tự alphabet, khớp với kiểu import sẵn có của file). Đồng thời sửa lại chú thích giải thích ở dòng 59 (`// Warp resolves this via CLIAgent.command_prefix(); OhMyPi is "omp".`) để nó không lặp lại giá trị dưới dạng một chuỗi thứ hai — làm thành `// Warp resolves this via CLIAgent.command_prefix(); the value is the wire contract, see WIRE_NAME.` | có — `grep -n '"omp"'` ra `59` (chú thích) và `60: agent: "omp",`. Dòng 4 đã import `VERSION` từ `@oh-my-pi/pi-utils/dirs`, và bản exports map của package.json có `"./*": {"types": "./src/*.ts"}`, nên import theo subpath là thành ngữ đã được xác lập trong file này. Test vàng đã có sẵn: `packages/coding-agent/test/modes/warp-events.test.ts:111` đặt `agent: "omp"` bên trong một phép so sánh `JSON.stringify` chính xác của toàn bộ thân OSC 777 — nên vị trí này bị khoá từng byte. |
| `packages/coding-agent/src/modes/acp/acp-agent.ts` | sửa | Chỉ dòng 657: `title: "omp",` thành `title: WIRE_NAME,`. Thêm `WIRE_NAME` vào import `@oh-my-pi/pi-utils` sẵn có ở dòng 5 (`import { getBlobsDir, isEnoent, logger, type postmortem, VERSION } from "@oh-my-pi/pi-utils";`) — giữ thứ tự alphabet để nó xếp sau `VERSION`. KHÔNG đụng vào dòng 656 (`name: "oh-my-pi"`) — xem quyết định N5 bên dưới. | có — `grep -n` ra `656: name: "oh-my-pi",` và `657: title: "omp",`, cả hai nằm trong object `agentInfo` được trả về ở khoảng dòng 654. QUYẾT ĐỊNH N5 (plan để ngỏ): giữ dòng 656 là chuỗi trần và để test sẵn có khoá nó lại. Lý do: `"oh-my-pi"` là tên package npm có scope, không cùng danh tính với token trần `"omp"`; đặt nó vào một hằng số tên `WIRE_NAME` sẽ là nói dối về ý nghĩa của hằng số đó. Phương án thứ hai của plan — "khẳng định bằng test rằng nó cố ý đứng yên" — đã được thoả mãn sẵn: `packages/coding-agent/test/acp-initialize-conformance.test.ts:233-238` khẳng định `expect(response.agentInfo).toEqual(expect.objectContaining({ name: "oh-my-pi", title: "omp", version: VERSION }))`. Sau thay đổi này, khẳng định đó vẫn khoá CẢ HAI giá trị, và yêu cầu của plan là "đừng để nó rơi vào khoảng trống" được đáp ứng với không tốn dòng code nào. |
| `packages/coding-agent/src/hindsight/bank.ts` | sửa | Dòng 29: `const DEFAULT_BANK_NAME = "omp";` thành `const DEFAULT_BANK_NAME = WIRE_NAME;`. Thêm `WIRE_NAME` vào `import { logger } from "@oh-my-pi/pi-utils";` sẵn có ở dòng 25 → `import { logger, WIRE_NAME } from "@oh-my-pi/pi-utils";`. Khai báo không có JSDoc ở dòng 28 không cần gì thêm. Để yên `PROJECT_TAG_PREFIX`, `UNKNOWN_PROJECT` và `MISSION_SET_CAP`. | có — `grep -n 'DEFAULT_BANK_NAME'`: khai báo ở `29`, nơi dùng duy nhất ở `52` (`const base = config.bankId?.trim() || DEFAULT_BANK_NAME;` bên trong hàm riêng `baseBankId`, đi tới qua `computeBankScope` được export ở dòng 87 và `deriveBankId` ở dòng 113). Test vàng đã có sẵn và khoá các id dẫn xuất: `packages/coding-agent/test/hindsight-bank.test.ts:82` `{ bankId: "omp" }`, `:102` `"omp-proj"`, `:108` `"omp-unknown"`, `:114` `"omp-general"`, `:136` `{ bankId: "omp" }`, `:210` `"omp-myrepo"`, `:220` `"omp-bare-repo.git"`, `:277` `"omp-proj"`, `:278` `"omp"` (tổng chín chốt, không phải năm). |
| `packages/utils/test/wire-name.test.ts` | tạo | Một file test mới, nhỏ, không cần addon, nằm trong suite `packages/utils`. Nó khẳng định `WIRE_NAME` được export từ `@oh-my-pi/pi-utils/dirs` và giá trị của nó trùng byte với `"omp"` — chuỗi mà bốn test tích hợp độc lập (`warp-events.test.ts:111`, `acp-initialize-conformance.test.ts:237`, `blob-uploaders-self-hosted-legacy.test.ts:342`, `hindsight-bank.test.ts:82`) đã khoá vàng làm giá trị wire của bên thứ ba. Hợp đồng được phát biểu KHÔNG phải là "một hằng số chứa một chuỗi"; nó là: hằng số danh tính wire dùng chung vẫn có giá trị mà các tích hợp đã bị khoá, để một lần đổi tên tại hằng số là một test đỏ chứ không phải một vết tách danh tính im lặng. Giữ đúng một khẳng định cộng import của nó; đừng thêm test cho từng vị trí ở đây (bốn test vàng sẵn có đã làm việc đó tốt hơn, ngay tại bên tiêu thụ thật). | có (đối với file mới này: chưa tồn tại, đúng như thiết kế). Chọn cố ý đặt ở `packages/utils` chứ KHÔNG ở `packages/coding-agent`: đã chạy `bun test packages/utils/test/dirs.test.ts` và báo `6 pass 0 fail`, nên ĐỒ THỊ IMPORT CỦA `dirs.ts` không kéo addon. Lưu ý: đây là tính chất của `dirs.ts`, KHÔNG phải của cả suite — `bun test packages/utils/test/` hôm nay báo 658 pass / 2 skip / 17 fail / 16 error, và scripts/ci-test-ts.ts:86-87 ghi rõ "shared utility barrels may load native-backed modules". Ngược lại, `bun test packages/coding-agent/test/modes/warp-events.test.ts` báo `0 pass 1 fail` với `Cannot find module .../packages/natives/native/pi_natives.darwin-arm64.node`. Đặt test mới vào utils làm nó chạy được NGAY HÔM NAY; bốn test vàng sẵn có của coding-agent sẽ chạy trong CI nơi addon đã được build. Lưu ý: lệnh gỡ chặn cục bộ `bun --cwd=packages/natives run build` cần `ninja` (cài bằng `brew install ninja`); trên máy chưa có ninja thì lệnh đó dừng ở bước cmake với lỗi 'unable to find a build program corresponding to Ninja'. File này không được import bất cứ thứ gì từ `packages/coding-agent` — làm vậy sẽ kéo addon vào và biến test luôn-chạy-được duy nhất thành không chạy được. |

### Các bước

1. **`packages/utils/src/dirs.ts:21`** — Thêm hằng số ngay sau `export const APP_NAME: string = "omp";` (dòng 21), cách nhau đúng một dòng trống, với một khối chú thích JSDoc ở trên. Chữ chính xác: một dòng `/** Wire identity — the third-party contract value; do not change without a compatibility decision. */` rồi tới `export const WIRE_NAME: string = "omp";`. Giá trị PHẢI là chuỗi `"omp"`. Đừng viết `"ultraworkers"`, đừng dẫn xuất nó từ `APP_NAME`, đừng làm nó thành bí danh của `APP_NAME` — cần một chuỗi riêng để W3 có thể đổi `APP_NAME` mà không đụng tới giá trị wire, và để diff của commit này vào `dirs.ts` chứng minh được là đúng một dòng thêm.
2. **`packages/coding-agent/src/modes/warp-events.ts:59-60`** — Mở rộng import ở dòng 4 thành `import { VERSION, WIRE_NAME } from "@oh-my-pi/pi-utils/dirs";`. Thay `agent: "omp",` ở dòng 60 bằng `agent: WIRE_NAME,`. Viết lại chú thích ở dòng 59 để nó không còn chứa chuỗi trần — `// Warp resolves this via CLIAgent.command_prefix(); the value is the wire contract, see WIRE_NAME.` Rồi chạy `git grep -n '"omp"' -- packages/coding-agent/src/modes/warp-events.ts` và xác nhận nó không trả về gì.
3. **`packages/coding-agent/src/modes/acp/acp-agent.ts:5,657`** — Thêm `WIRE_NAME` vào import `@oh-my-pi/pi-utils` ở dòng 5 (theo alphabet, sau `VERSION`). Chỉ thay `title: "omp",` ở dòng 657. Để yên `name: "oh-my-pi",` ở dòng 656. Kiểm bằng `git grep -n '"omp"' -- packages/coding-agent/src/modes/acp/acp-agent.ts` — nó không nên trả về hit nào cho chuỗi trần (lệnh này khớp toàn văn nên sau khi sửa sẽ không còn hit nào; `"Set up omp in terminal"` ở dòng 648 là văn xuôi hướng tới người dùng, KHÔNG khớp mẫu này và thuộc W3/W8b — đừng đụng vào nó ở đây).
4. **`packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236`** — Thêm `import { WIRE_NAME } from "@oh-my-pi/pi-utils";` như một import cấp cao nhất mới, sau import `node:buffer` và trước các import cục bộ `./destinations` / `./publication` / `./uploader-runtime`. Đổi `{ k: apiKey, z: "omp" }` thành `{ k: apiKey, z: WIRE_NAME }` ở dòng 236. Kiểm bằng `git grep -n '"omp"' -- packages/coding-agent/src/blob-broker/uploaders-legacy.ts` — không có hit nào.
5. **`packages/coding-agent/src/hindsight/bank.ts:25,29`** — Đổi import ở dòng 25 thành `import { logger, WIRE_NAME } from "@oh-my-pi/pi-utils";`. Đổi dòng 29 thành `const DEFAULT_BANK_NAME = WIRE_NAME;`. Kiểm bằng `git grep -n '"omp"' -- packages/coding-agent/src/hindsight/bank.ts` — không có hit nào. KHÔNG đổi `packages/coding-agent/src/hindsight/settings.ts:172` (`default: "omp"` của `cfgHindsightRetainContext`) — đó là một setting riêng với khoá config bền vững riêng và giá trị mặc định riêng; xem phần Cần người quyết.
6. **`packages/coding-agent/src/dap/session.ts:3,1465-1466`** — Thêm `WIRE_NAME` vào import ở dòng 3 `import { logger, ptree, untilAborted } from "@oh-my-pi/pi-utils";` (thứ tự alphabet: `logger, ptree, untilAborted, WIRE_NAME`). Thay `clientID: "omp",` và `clientName: "omp",` ở dòng 1465-1466 bằng `clientID: WIRE_NAME,` và `clientName: WIRE_NAME,`. Kiểm bằng `git grep -n '"omp"' -- packages/coding-agent/src/dap/session.ts` — không có hit nào.
7. **`packages/utils/test/wire-name.test.ts`** — Tạo file test mới. Nó nên import `WIRE_NAME` từ `../src/dirs` (đường dẫn tương đối, khớp với kiểu của file anh em `packages/utils/test/dirs.test.ts` — hãy xem dòng import của file đó và sao chép) và đưa ra MỘT khẳng định rằng `WIRE_NAME` là chuỗi byte `"omp"`. Tên test phải nêu bên tiêu thụ và kiểu hỏng, không phải cơ chế — ví dụ `it("pins the shared wire identity to the value the DAP, Warp, ACP and puush integrations are golden-pinned to")`. Đừng thêm test nào đọc file nguồn, đừng dùng `mock.module()`, và đừng khẳng định về việc hằng số chỉ tồn tại hay về độ dài của nó.
8. **`repo-wide`** — Xác nhận ĐÚNG NĂM vị trí đã dịch chuyển và không gì khác dịch chuyển. Chạy `git add -A && git diff --cached --stat` và kiểm tra danh sách file đổi đúng là: `packages/utils/src/dirs.ts`, `packages/coding-agent/src/dap/session.ts`, `packages/coding-agent/src/blob-broker/uploaders-legacy.ts`, `packages/coding-agent/src/modes/warp-events.ts`, `packages/coding-agent/src/modes/acp/acp-agent.ts`, `packages/coding-agent/src/hindsight/bank.ts`, cộng thêm file mới `packages/utils/test/wire-name.test.ts`. Bảy đường dẫn, không hơn. Đặc biệt, `packages/catalog/src/wire/codex.ts:52` (`ORIGINATOR_CODEX: "omp"`) phải KHÔNG ĐỔI — plan gọi nó là chỉ-đọc, và mục này tuân thủ điều đó. Rồi chạy `bun run check:ts` và lệnh test trong mục Xác minh.
9. **`CHANGELOG`** — KHÔNG thêm mục nào vào `packages/utils/CHANGELOG.md`. Thay đổi này vô hình với người dùng (giá trị không đổi), và AGENTS.md yêu cầu mục phải hướng tới người dùng. Nếu người duyệt khăng khăng, mục trung thực duy nhất có thể là một dòng `### Changed` nói rằng hằng số wire-name nội bộ nay có một định nghĩa duy nhất — nhưng bỏ qua nó mới là lựa chọn đúng cho một lần refactor thuần.

### Hình dạng code

```typescript
// packages/utils/src/dirs.ts  (chèn sau dòng 21)
/** Wire identity — the third-party contract value; do not change without a compatibility decision. */
export const WIRE_NAME: string = "omp";

// packages/coding-agent/src/modes/warp-events.ts
-import { VERSION } from "@oh-my-pi/pi-utils/dirs";
+import { VERSION, WIRE_NAME } from "@oh-my-pi/pi-utils/dirs";

			const body = {
				...event,
				v: WARP_CLI_AGENT_PROTOCOL_VERSION,
-				agent: "omp",
+				agent: WIRE_NAME,

// packages/coding-agent/src/modes/acp/acp-agent.ts  — dòng 656 cố ý không đụng
			agentInfo: {
				name: "oh-my-pi",   // N5: tên package có scope, bị khoá bởi acp-initialize-conformance.test.ts
-				title: "omp",
+				title: WIRE_NAME,
				version: VERSION,
			},

// packages/coding-agent/src/blob-broker/uploaders-legacy.ts
+import { WIRE_NAME } from "@oh-my-pi/pi-utils";

-				const body = multipartFile(request, "f", { k: apiKey, z: "omp" });
+				const body = multipartFile(request, "f", { k: apiKey, z: WIRE_NAME });

// packages/coding-agent/src/hindsight/bank.ts
-import { logger } from "@oh-my-pi/pi-utils";
+import { logger, WIRE_NAME } from "@oh-my-pi/pi-utils";

-const DEFAULT_BANK_NAME = "omp";
+const DEFAULT_BANK_NAME = WIRE_NAME;

// packages/coding-agent/src/dap/session.ts
-import { logger, ptree, untilAborted } from "@oh-my-pi/pi-utils";
+import { logger, ptree, untilAborted, WIRE_NAME } from "@oh-my-pi/pi-utils";

	#buildInitializeArguments(adapter: DapResolvedAdapter): DapInitializeArguments {
		return {
-			clientID: "omp",
-			clientName: "omp",
+			clientID: WIRE_NAME,
+			clientName: WIRE_NAME,
```

### Hợp đồng test

Hợp đồng quan sát được: một bên thứ ba đọc yêu cầu initialize DAP của chúng ta, sự kiện OSC-777 của Warp, `agentInfo` của ACP, tải lên multipart của puush, hoặc bank id Hindsight mặc định của chúng ta sẽ thấy **đúng những byte họ đã thấy trước commit này**, và một lần đổi tên tương lai đối với hằng số danh tính dùng chung sẽ làm đỏ một test thay vì âm thầm cắt danh tính của chúng ta ra làm năm mảnh. Cụ thể, bốn trong năm vị trí **đã có** test khoá bằng chuỗi vàng và sẽ đỏ nếu giá trị đổi — `warp-events.test.ts:111` khoá `agent: "omp"` bên trong một `JSON.stringify` chính xác của toàn bộ thân OSC; `acp-initialize-conformance.test.ts:237` khoá `title: "omp"` qua `objectContaining`; `blob-uploaders-self-hosted-legacy.test.ts:342` khoá `form.get("z") === "omp"`; `hindsight-bank.test.ts` khoá các id dẫn xuất `"omp"`, `"omp-proj"`, `"omp-unknown"`, `"omp-general"`. Bốn test đó phải được ĐỂ NGUYÊN — chúng là các chốt khoá vàng, và việc chuyển chúng sang so sánh với `WIRE_NAME` sẽ phá hủy đúng cơ chế duy nhất bắt được một lần đổi tên sai. Test mới duy nhất bảo vệ điều mà bốn test kia không thể: rằng **HẰNG SỐ DÙNG CHUNG** vẫn còn giữ đúng chuỗi byte ấy. Nó nằm ở `packages/utils/test/wire-name.test.ts` vì đồ thị import của `dirs.ts` không chạm `@oh-my-pi/pi-natives` (đã kiểm chứng: `bun test packages/utils/test/dirs.test.ts` → 6 pass 0 fail; lưu ý cả suite utils thì KHÔNG sạch — 17 fail vì cùng lý do addon, xem scripts/ci-test-ts.ts:86-87), trong khi hiện tại mọi file test của coding-agent đều không chạy được (đã kiểm chứng: `warp-events.test.ts` → 0 pass 1 fail, thiếu `pi_natives.darwin-arm64.node`).

KHOẢNG TRỐNG ĐÃ BIẾT, nói ra thay vì bưng bớt: vị trí DAP (`dap/session.ts:1465-1466`) KHÔNG có test riêng — `#buildInitializeArguments` là một method ES `#private` chỉ đi tới qua toàn bộ đường khởi chạy DapSessionManager, và repo không có file test DAP nào (chỉ có `packages/coding-agent/test/dap-write-sink-flush.typecheck.ts`). Nó được bao phủ GIÁN TIẾP: cả năm vị trí đọc cùng một hằng số, nên bốn test vàng cộng với test hằng số mới khoá đúng giá trị mà vị trí DAP phát ra. Nếu người duyệt muốn một khẳng định DAP trực tiếp, điểm móc là `vi.spyOn(DapClient, "spawn")` trả về một stub mà `initialize` của nó ghi lại đối số đầu tiên — nhưng cách đó kéo cả đường khởi chạy vào một thay đổi 2 dòng và không được khuyến nghị cho mục này.

Nếu hợp đồng vỡ, người tiêu dùng thấy: một terminal Warp ngừng gán sự kiện cho omp, một client ACP hiện sai agent title, một DAP debug adapter không còn nhận ra yêu cầu initialize của chúng ta, một lượt tải lên puush bị từ chối hoặc bị ghi dưới một tác giả lạ, và các ký ức Hindsight sẵn có rơi vào một bank mà người dùng không còn truy cập được — tất cả mà không có một lỗi nào được ném ra.

File test liên quan:

- `packages/utils/test/wire-name.test.ts` (MỚI — test duy nhất mục này thêm vào; khẳng định hằng số dùng chung vẫn giữ giá trị mà bốn test vàng tích hợp khoá)
- `packages/coding-agent/test/modes/warp-events.test.ts` (CÓ SẴN, KHÔNG ĐỔI — dòng 111 khoá vàng trường agent OSC của Warp)
- `packages/coding-agent/test/acp-initialize-conformance.test.ts` (CÓ SẴN, KHÔNG ĐỔI — dòng 233-238 khoá vàng cả `agentInfo.name` lẫn `.title`, thoả yêu cầu N5 của plan mà không cần dòng code mới)
- `packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts` (CÓ SẴN, KHÔNG ĐỔI — dòng 342 khoá vàng trường multipart `z` của puush)
- `packages/coding-agent/test/hindsight-bank.test.ts` (CÓ SẴN, KHÔNG ĐỔI — dòng 82, 102, 108, 114, 136, 210, 220, 277, 278 khoá vàng các bank id mặc định dẫn xuất)

### Xác minh

```bash
# PHẢI ĐỎ XANH, chạy được ngay hôm nay, không cần addon native:
bun test packages/utils/test/wire-name.test.ts
bun run check:ts

# PHẢI ĐỎ XANH, cần addon native. CHẶN CỤC BỘ: addon chưa build, và lệnh
# gỡ chặn `bun --cwd=packages/natives run build` THẤT BẠI trên máy chưa có
# ninja (cmake: "unable to find a build program corresponding to Ninja").
# Muốn gỡ chặn cục bộ: `brew install ninja` TRƯỚC, rồi build lại.
# Đường đã xác minh là chạy ở CI: scripts/ci-test-ts.ts:254 nói mọi bucket
# của coding-agent đều chạy với addon sẵn có. Ở máy không có ninja thì
# coi bốn test này là CI-only và đừng tính chúng vào cổng cục bộ.
bun test packages/coding-agent/test/modes/warp-events.test.ts packages/coding-agent/test/acp-initialize-conformance.test.ts packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts packages/coding-agent/test/hindsight-bank.test.ts

# BẰNG CHỨNG rằng đúng năm vị trí đã dịch chuyển và giá trị không đổi:
# LƯU Ý CHUNG: `git diff --stat` KHÔNG thấy file MỚI chưa `git add`, và cũng không thấy file đã
# `git add` — chỉ `--cached` mới thấy. Mọi cổng đếm file mới trong tài liệu này vì thế dùng
# `git add -A && git diff --cached --stat`. Dùng nhầm sẽ cho cổng XANH vì không thấy gì —
# tệ hơn là đỏ.
git grep -n '"omp"' -- packages/coding-agent/src/dap/session.ts packages/coding-agent/src/blob-broker/uploaders-legacy.ts packages/coding-agent/src/modes/warp-events.ts packages/coding-agent/src/hindsight/bank.ts packages/coding-agent/src/modes/acp/acp-agent.ts    # mong đợi KHÔNG có hit
git grep -n '"omp"' -- packages/catalog/src/wire/codex.ts                                                                        # mong đợi dòng :52 KHÔNG ĐỔI
git diff packages/coding-agent/test/ packages/catalog/                                                                            # mong đợi RỖNG
```

**LƯU Ý VỀ LỆNH CỦA PLAN:** plan nói `bun run check && bun run test:ts`. Hiện `bun run test:ts` đang đỏ vì những lý do không liên quan tới W1 — bất kỳ test nào mà đồ thị import của nó chạm tới `@oh-my-pi/pi-natives` sẽ hỏng với "Failed to load pi_natives native addon for darwin-arm64". Đừng coi đỏ đó là lỗi của W1 và đừng cố sửa nó trong commit này. Bốn file test của coding-agent nêu ở trên mới là những thứ thật sự bảo vệ thay đổi này.

### Cổng hoàn thành

Thay đổi này XONG khi tất cả các điều sau đều đúng, và điều thứ nhất là điều có thể đỏ:

1. `bun test packages/utils/test/wire-name.test.ts` ĐỎ nếu `WIRE_NAME` không đúng bằng chuỗi `"omp"` — kiểm chứng bằng cách tạm đặt nó thành `"ultraworkers"`, xác nhận có lần chạy đỏ, rồi hoàn nguyên lại. Đây là cổng mang tải: nó là thứ DUY NHẤT khoá chính hằng số, và là toàn bộ hàng phòng thủ trước kiểu hỏng mà plan nêu đầu tiên.
2. `bun run check:ts` xanh.
3. Cả bốn file test vàng sẵn có phải trùng byte với HEAD — `git diff packages/coding-agent/test/ packages/catalog/` là RỖNG. Nếu bất kỳ file nào trong số đó bị đổi, kỹ sư đã biến một chốt khoá vàng thành mệnh đều và mục này chưa xong, bất kể test có chạy hay không.
4. `git add -A && git diff --cached --stat` liệt kê đúng sáu file nguồn đã sửa cộng một file test mới, và `packages/catalog/src/wire/codex.ts` không nằm trong đó.
5. `git grep -n '"omp"'` trên bốn file nguồn coding-agent từng có chuỗi trần trả về không hit nào, trong khi `acp-agent.ts` vẫn giữ `name: "oh-my-pi"` ở dòng 656.
6. `packages/coding-agent/src/dap/session.ts` không có file test mới nào và không có export mới nào — khoảng trống DAP được đóng gián tiếp, đúng như đã tài liệu hoá, thay vì bằng cách thêm một bộ dựng test.

**Cổng này có thực sự đỏ được không?** Có, và cổng (1) là cái cắn. Nó đỏ ngay khi ai đó viết `export const WIRE_NAME: string = "ultraworkers";` — đó là lỗi nhiều khả năng nhất ở đây, bởi toàn bộ ý nghĩa của hằng số này là để được đổi tên, và tên thương hiệu mới là thứ hấp dẫn nhất để gõ vào trong repo. Bốn test vàng sẵn có là tấm lưới thứ hai, độc lập, cho cùng lỗi đó (chúng so với chuỗi trần `"omp"`), và cổng (3) bắt được kiểu hỏng tinh vi hơn: một kỹ sư thấy bốn test vàng đỏ và "giúp" viết lại chúng để so với hằng số — điều đó sẽ khiến cả năm vị trí đi qua một lần đổi tên mà không ai nhận ra. Cổng (4) bắt lạm phát phạm vi — bản thân plan cảnh báo rằng thêm một vị trí thứ sáu là lỗi nhiều khả năng thứ hai, và `git grep` trên toàn repo tìm thấy thêm nhiều giá trị wire trần `"omp"` nữa (xem phần Đính chính so với plan) mà một kỹ sư hăng hái sẽ gộp vào mà chẳng cần quyết định gì. Không mục nào trong cổng này là mệnh đều hoặc `not.toThrow()` trần; mỗi điều khoản đều nêu một giá trị mà bên thứ ba đọc.

### Phụ thuộc

- `depends_on`: không có.
- `blocks`: W3, W7, W9, W8b.

### Cách sai dễ nhất

Gõ tên thương hiệu mới vào `WIRE_NAME`. Đây là lỗi mà plan nêu đầu tiên và nó đúng là nhiều khả năng nhất, vì hằng số này tồn tại để được đổi tên và tên mới nằm ngay đó trong mô tả milestone. Nếu xảy ra, cả năm tích hợp đổi danh tính cùng lúc và KHÔNG GÌ NÉM LỖI: một terminal Warp ngừng gán sự kiện, một client ACP hiện sai title, một DAP adapter ngừng khớp client, một lượt tải lên puush bị ghi dưới một tác giả lạ, và mọi ký ức Hindsight mà người dùng có rơi vào một bank họ không còn truy cập được.

Biến thể bậc hai là ảnh phản chiếu và tệ không kém: một kỹ sư thấy bốn test vàng đỏ và "sửa" chúng bằng cách so với `WIRE_NAME` thay vì so với chuỗi trần — làm cho lần đổi tên trở nên vô hình với bộ test mãi mãi, và phá hủy đúng mục đích của toàn bộ mục này. Cổng (3) sinh ra chính vì trường hợp đó.

Cũng đừng để thay đổi `APP_NAME` của W3 lọt vào đây: `WIRE_NAME` phải là chuỗi trần của riêng nó, không phải bí danh của `APP_NAME` — nếu không, việc đổi tên hiển thị ở W3 sẽ lặng lẽ kéo theo giá trị wire.

### Cần người quyết

- **Bản đồ wire chưa đầy đủ.** Plan nói wire set gồm năm vị trí, nhưng `git grep -n '"omp"' -- packages/{coding-agent,catalog,utils,tui}/src` tìm thấy thêm nhiều giá trị wire trần mà mục này không đụng tới. Hai trong số đó nghiêm trọng và KHÔNG phải chuỗi hiển thị: `packages/catalog/src/compat/rules/auth/stencil.kdl:13` (`client-id "omp"` — OAuth client id đã đăng ký tại issuer Stencil; đổi tên nó làm hỏng đăng nhập Stencil, và theo AGENTS.md nó nằm trong KDL nên một hằng số TypeScript không thể thay thế đơn giản) và `packages/catalog/src/compat/rules/auth/openai-codex.kdl:12` (`originator "omp"`). Ngoài KDL: `packages/coding-agent/src/cli/git-tui/avatar.ts:50` (`"User-Agent": "omp"` khi gọi GitHub API), `packages/coding-agent/src/tools/report-tool-issue.ts:441` (`agent: { name: "omp" }` trong thân grievance được POST), `packages/coding-agent/src/internal-urls/omp-protocol.ts:28` (`readonly scheme = "omp"` — scheme URL `omp://`). CẦN NGƯỜI QUYẾT: chủ milestone có muốn gộp chúng vào wire set của W1, giao cho một work item sau, hay ghi rõ là đừng đụng vào? Đừng lặng lẽ thêm chúng — plan cấm dứt khoát vị trí thứ sáu — và đừng lặng lẽ bỏ qua chúng, nếu không thì lệnh `sed` của W7 và đợt quét display-token của W8b sẽ thành thứ tự quyết định. Khuyến nghị của đặc tả: một work item riêng và tường minh, vì hai mục KDL cần cách sửa ở tầng KDL mà mục này không được thử.
- **`codex.ts:52` không thật sự đóng băng.** `packages/catalog/src/wire/codex.ts:52` bị mục này khai là CHỈ-ĐỌC, nhưng nguồn thật của nó là quy tắc KDL có thể ghi được ở `packages/catalog/src/compat/rules/auth/openai-codex.kdl:12`. File `rules.json` đã biên dịch được commit. Vậy nên một lượt quét kiểu `sed` sau này trên cây KDL, hoặc một `bun run gen:compat` sau một chỉnh sửa KDL không liên quan, có thể làm giá trị này dịch chuyển mà không hề có diff TypeScript nào. CẦN NGƯỜI QUYẾT: ai sở hữu bất biến rằng originator OpenAI phải ở lại `"omp"`, và nó có cần một test trước khi W7 chạy không? Đây là lỗ hổng thật trong chính cách diễn đạt của plan, không phải giả định.
- **Vị trí DAP không có test trực tiếp.** Vị trí DAP (`dap/session.ts:1465-1466`) không có test trực tiếp và đặc tả khuyến nghị KHÔNG dựng harness cho nó. CẦN NGƯỜI QUYẾT: chấp nhận độ phủ gián tiếp (cả năm vị trí đọc một hằng số, và bốn test vàng cộng test hằng số mới khoá giá trị của nó), hay bỏ công sức cho một harness `vi.spyOn(DapClient, "spawn")`? Cặp `clientID`/`clientName` của DAP là cặp DUY NHẤT trong năm vị trí mà bên tiêu thụ là một debug adapter của bên thứ ba chứ không phải một hệ thống con trong repo, nên đó là chỗ một lần hỏng âm thầm ít khả năng bị chính những người bảo trì phát hiện nhất.
- **`hindsight/settings.ts:172`.** `packages/coding-agent/src/hindsight/settings.ts:172` đăng ký `cfgHindsightRetainContext` với `default: "omp"` — cùng danh tính ngân hàng như `bank.ts:29`, nhưng là một khoá config bền vững riêng với mặc định riêng. Năm file test mang `retainContext: "omp"` như một DỮ LIỆU ĐẦU VÀO fixture (hindsight-bank.test.ts:55, hindsight-conversation-timestamps.test.ts:35, hindsight-mm-cache-stability.test.ts:34, hindsight-retention-cache.test.ts:27, memory-tools.test.ts:63). CẦN NGƯỜI QUYẾT: đây có phải cùng một danh tính wire (khi đó nó cũng nên đọc `WIRE_NAME`, kéo theo việc đổi một mặc định sẵn có và giá trị đã bền vững của nó), hay một mặc định setting hướng tới người dùng độc lập (khi đó giữ nguyên)? Đặc tả để nó ngoài W1 vì đổi mặc định của một setting đã đăng ký là thay đổi hành vi, không phải refactor, và đó là lãnh thổ của W3. Nêu ra ở đây vì năm fixture test hiện đang hardcode nó và người làm nhiệm vụ quét chuỗi kế tiếp sẽ vấp vào nó.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| `packages/catalog/src/wire/codex.ts:52` là một điểm tham chiếu chỉ-đọc, và wire set đúng là năm vị trí cộng file này. | SAI MỘT PHẦN — file đó quả thực chỉ-đọc, nhưng nguồn upstream của nó thì không, và cách diễn đạt của plan giấu một nguy cơ còn sống. | Neo là thật (`ORIGINATOR_CODEX: "omp"` ở dòng 52, đã xác nhận, và nó chảy vào `OPENAI_HEADERS.ORIGINATOR` ở 8 call site trên packages/ai, packages/agent, packages/catalog, packages/coding-agent). Nhưng nó không phải chuỗi viết tay — nó biên dịch từ `packages/catalog/src/compat/rules/auth/openai-codex.kdl:12` (`originator "omp"`). AGENTS.md cấm sửa tay file `rules.json` đã biên dịch, nên cách duy nhất để đổi giá trị này là sửa KDL. Hệ quả: lượt quét `git grep -o '@oh-my-pi/'` của W7 không chạm tới nó (không có dấu gạch chéo), đợt quét display-token của W8b thì có thể chạm, và một `bun run gen:compat` sau một chỉnh sửa KDL không liên quan có thể làm originator dịch chuyển mà không có diff TypeScript nào. Mục này nên coi codex.ts:52 là chỉ-đọc đúng như chỉ dẫn, nhưng chủ milestone cần biết giá trị này không được đóng băng bởi mục này và không được bảo vệ bởi bất kỳ test nào sẽ nhận ra một thay đổi ở tầng KDL. |
| Wire set gồm năm vị trí; rủi ro plan nêu là một kỹ sư thêm "vị trí thứ sáu không có trong danh sách". | SAI CẢN — có ít nhất sáu giá trị `"omp"` trần nữa mà là wire chứ không phải hiển thị. Cảnh báo rủi ro của plan vì thế chỉ sai mục tiêu: nguy hiểm thật không phải kỹ sư thêm vị trí thứ sáu, mà là milestone lên thuyền với một bản đồ wire thiếu và một đợt quét cơ học sau đó đổi tên những giá trị không ai lập danh sách. | Đã xác nhận các giá trị wire bổ sung không nằm trong bộ của plan: (a) `packages/catalog/src/compat/rules/auth/stencil.kdl:13` `client-id "omp"` — OAuth client id được code định nghĩa tại issuer Stencil theo chú thích của chính file đó; đổi tên sẽ hỏng đăng nhập Stencil; nó là KDL nên một hằng số TS không thể thay thế. (b) `packages/catalog/src/compat/rules/auth/openai-codex.kdl:12` (như trên). (c) `packages/coding-agent/src/cli/git-tui/avatar.ts:50` `"User-Agent": "omp"` trên api.github.com. (d) `packages/coding-agent/src/tools/report-tool-issue.ts:441` `agent: { name: "omp", version: VERSION }` trong thân JSON POST tới grievance endpoint. (e) `packages/coding-agent/src/internal-urls/omp-protocol.ts:28` `readonly scheme = "omp"` — scheme URL `omp://`, xuất hiện trong URL người dùng gõ và trong session đã bền vững. (f) `packages/coding-agent/src/hindsight/settings.ts:172` `default: "omp"` cho `cfgHindsightRetainContext`, cùng danh tính bank như `bank.ts:29` qua một đường thứ hai. Đặc tả này giữ W1 ở đúng năm vị trí của plan (plan cấm tự ý mở rộng) nhưng ghi cả sáu mục đó thành một điểm leo thang tường minh, vì kết quả đúng là một con người phân công chúng, chứ không phải một kỹ sư tự dò ra. |
| Test cần viết: "mỗi vị trí một test, dựng giá trị được gửi đi và khẳng định nó bằng hằng số đã cấu hình, không phải bằng chuỗi trần." | NGƯỢC — làm theo chỉ dẫn này theo nghĩa đen sẽ phá hủy đúng cơ chế an toàn mà nó định tạo ra. | Nếu một test khẳng định `emitted === WIRE_NAME`, thì đặt `WIRE_NAME = "ultraworkers"` khiến mọi test như vậy đỏ xanh trong khi cả năm tích hợp đều hỏng. Hằng số là thứ đang được đổi tên; chuỗi trần mới là hợp đồng. Các khẳng định khoá chuỗi vàng đã có sẵn trong cây là thiết kế đúng và phải được giữ nguyên từng chữ: `warp-events.test.ts:111` khoá `agent: "omp"` bên trong một `JSON.stringify` chính xác của toàn bộ thân OSC, `acp-initialize-conformance.test.ts:237` khoá `title: "omp"`, `blob-uploaders-self-hosted-legacy.test.ts:342` khoá `form.get("z") === "omp"`, và `hindsight-bank.test.ts` khoá các id dẫn xuất `"omp"`/`"omp-proj"`/`"omp-unknown"`/`"omp-general"`. Cách chia đúng là hai mặt, còn plan đã gộp làm một: các test CÓ SẴN giữ chuỗi trần (chúng bảo vệ byte wire), và MỘT test MỚI khoá rằng hằng số dùng chung vẫn bằng chuỗi trần đó (nó bảo vệ việc các vị trí có thật sự đọc hằng số hay không). Nếu test mới cũng so với hằng số, việc phát hiện đổi tên sẽ tan biến. |
| Các file test đã khẳng định các giá trị này là `warp-events.test.ts` và `acp-agent.test.ts`. | ĐẾM THIẾU — có bốn file vàng, không phải hai, và một trong hai file bị nêu là file SAI. | `packages/coding-agent/test/acp-agent.test.ts` KHÔNG khẳng định giá trị wire agentInfo nào cả (`grep -n 'agentInfo\|oh-my-pi'` không ra hit agentInfo nào trong đó — nó import từ acp-agent nhưng test hành vi khác). File thật sự khoá `agentInfo.name` và `agentInfo.title` là `packages/coding-agent/test/acp-initialize-conformance.test.ts:233-238`. Và plan bỏ sót hẳn hai file vàng: `packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts:342` (puush `z`) và `packages/coding-agent/test/hindsight-bank.test.ts` (năm bank id dẫn xuất). Đây là tin tốt cho W1 — bốn trong năm vị trí đã được khoá từng byte, nên yêu cầu "không thay đổi gì nhìn thấy được" của mục được cơ chế hóa miễn phí — nhưng kỹ sư theo plan sẽ đi tìm độ phủ trong một file không chứa nó. |
| Môi trường chặn toàn bộ `bun test` (0 pass, "Failed to load pi_natives native addon for darwin-arm64"), nên hãy xác minh bằng `bun run check:ts` và coi `bun test` là bị chặn. | QUÁ RỘNG — chặn có tính theo đồ thị import, không phải toàn cục, và sự phân biệt đó làm thay đổi chỗ test mới duy nhất của W1 nên đặt. | `bun test` chỉ bị chặn với những file test mà đồ thị import của chúng chạm tới `@oh-my-pi/pi-natives`. Đã chạy hai file để xác lập điều này: `bun test packages/utils/test/dirs.test.ts` → `6 pass 0 fail`, trong khi `bun test packages/coding-agent/test/modes/warp-events.test.ts` → `0 pass 1 fail` với `Cannot find module .../packages/natives/native/pi_natives.darwin-arm64.node`. Hệ quả cho W1: test mới phải đặt ở `packages/utils/test/`, không phải `packages/coding-agent/test/`, nếu không thì test duy nhất mà mục này thêm vào cũng sẽ không chạy được ngay hôm nay. Bốn test vàng sẵn có của coding-agent vẫn bị chặn cục bộ và chạy trong CI. |
| Effort S, khoảng 10 dòng; các file test cần chạm tới là hai. | GẦN ĐÚNG, nhưng số dòng bỏ sót file test mới và số vị trí bỏ sót file vàng thứ năm. | Thay đổi mã nguồn thật sự rất nhỏ: một dòng thêm trong `dirs.ts` cộng năm chỉnh sửa tổng cộng khoảng sáu dòng. Mục này còn thêm một file test mới ~15 dòng và sửa KHÔNG file test sẵn có nào (theo thiết kế — xem đính chính về test hai mặt). Ròng ~40 dòng trên 7 đường dẫn. Lỗi thật của plan không phải effort mà là danh mục file test, vì nó đánh giá thấp cả phạm vi đã có (nêu 2, thực tế 4) lẫn việc mới (không nêu mục nào là mới). |
| Repo đang ở git HEAD 5873776 trên branch milestone-1. | CŨ — HEAD là 808b365. | Hết hiệu lực ở HEAD 1454dc0 (17 thư mục .lavish-wip/ chưa theo dõi, không phải một) — nhưng sáu neo nguồn và bốn neo test vàng đã được kiểm chứng lại ở HEAD 1454dc0 và toàn bộ đều chính xác. `git rev-parse HEAD` trả về `808b409fa36719c38319a041c0e612b4e702b` (`docs(plan): fold the spec-verified M1 execution plan into the upgrade plan`), trên branch `milestone-1`, với chỉ `.lavish-wip/m2-specs/` chưa theo dõi. Cả sáu neo nguồn của W1 đã được kiểm chứng lại với HEAD này và cả sáu đều chính xác, nên SHA cũ không làm vô hiệu đặc tả — nhưng bất kỳ kỹ sư nào checkout 5873776 sẽ không tìm thấy các commit execution-plan của milestone-1 và có thể bối rối về baseline của sóng 1. |
| `acp-agent.ts:656` (`name: "oh-my-pi"`) nên được đưa vào wire set của W1 hoặc được khoá bằng test — plan gọi đây là N5 và để lựa chọn mở. | ĐÃ GIẢI QUYẾT — phương án thứ hai của plan đã được thoả bởi code sẵn có, còn phương án thứ nhất thì sai. | Đừng đưa `"oh-my-pi"` qua `WIRE_NAME`. Đó là tên package npm có scope, là một danh tính khác với token trần `"omp"`, và một hằng số tên `WIRE_NAME` giữ một tên có scope sẽ mô tả sai bản chất của hằng số — cùng lập luận AGENTS.md dùng khi phân biệt danh sách basename package với danh sách scope. Phương án thay thế của plan ("khẳng định bằng test rằng nó cố ý đứng yên") đã có sẵn: `acp-initialize-conformance.test.ts:233-238` khẳng định `expect(response.agentInfo).toEqual(expect.objectContaining({ name: "oh-my-pi", title: "omp", version: VERSION }))`. Vậy yêu cầu của plan là "đừng để nó rơi vào khoảng trống" được đáp ứng bằng cách để yên dòng 656 và để test đó làm việc của nó. Dòng 656 không cần sửa và không cần test mới; nó chỉ cần đặc tả nói rõ như vậy — và đó chính là thứ giải quyết nó. |


---


## W2. `CANONICAL_PI_SCOPE` và `PI_SCOPE_ALIASES` (sóng 1)

**Sóng:** Wave 1 (M5 §6.1) — như đang viết. KHUYẾN NGHỊ: tách thành W2a (sóng 1, tự đóng gói được một mình) và W2b (đi cùng hoặc ngay sau W7 pass 1).

**Effort:** S — hai sửa chuỗi, mỗi sửa là một dòng duy nhất trong cùng một file, cộng hai ca được nối thêm vào một file test đã có sẵn. Phần lớn công sức nằm ở phần xác minh: `bun test` bị chặn trong môi trường này cho tới khi addon native được build.

**Rủi ro chính:** Đưa W2b lên trước W7. Nó tệ hơn cả rủi ro mà plan tự nêu, và có hai cơ chế riêng biệt đã được kiểm chứng: ở chế độ dev thì canonicalizer chết lặng lẽ (lỗi resolve bị `try/catch` nuốt), còn ở binary đã compile thì mọi lần load extension bị bundle đều crash cứng. Chi tiết ở mục «Cách sai dễ nhất». Rủi ro thứ hai của W2a là cổng grep dễ viết sai: nếu dùng mẫu `"@oh-my-pi"` thay vì khớp trực tiếp dòng `PI_SCOPE_ALIASES`, cổng sẽ luôn xanh và bắt được gì cả.

**Dòng chảy một câu:** Thêm `ultraworkers` vào danh sách npm scope mà extension loader chấp nhận, và trỏ lại scope chuẩn về `@ultraworkers`, để một plugin import `@ultraworkers/pi-utils` được phục vụ đúng bản package đang chạy sẵn trong host thay vì một bản thứ hai kéo từ npm.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts` | sửa | Dòng 796 `const CANONICAL_PI_SCOPE = "@oh-my-pi";` → `"@ultraworkers"` (chỉ W2b); dòng 802 `const PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"] as const;` → `["ultraworkers", "oh-my-pi", "mariozechner", "earendil-works"] as const` (W2a). Dòng 805 (`PI_PACKAGE_NAMES`) và dòng 808 (`PI_PACKAGE_ALTERNATION`) cố ý KHÔNG bị đụng tới. | Có — đối chiếu từng byte tại HEAD 1454dc0. `:796` và `:802` đúng như trích; `:805` chứa 6 basename `pi-*`; `:807` `PI_SCOPE_ALIASES.join("|")` và `:808` `PI_PACKAGE_NAMES.join("|")` là giá trị dẫn xuất tự tính lại; `:837` `LEGACY_PI_SPECIFIER_FILTER` nội suy cả hai. Mọi nơi dùng `CANONICAL_PI_SCOPE` nằm ở `:952`, `:963`, `:970`, `:1022-1024` và `:1068` — tất cả đều nằm trong cùng file này, nên không có site thứ hai để sửa. |
| `packages/coding-agent/test/pi-scope-aliases.test.ts` | sửa | Nối thêm hai ca vào mảng `CASES` sẵn có (dòng 43): một ca có `aliasSpecifier` là `@ultraworkers/pi-utils`, một ca phủ `@ultraworkers/pi-utils` được khai trong `peerDependencies` của plugin thử. KHÔNG tạo file mới — xem mục «Đính chính so với plan». | Có — file đã tồn tại (135 dòng) và đã khẳng định đúng hợp đồng mà plan bảo một file mới phải khẳng định: dòng 109-117 sinh ra `if (alias${idx} !== canonical${idx}) throw new Error(...)` — một bằng chứng identity khẳng định import có alias và đường dẫn tuyệt đối từ `Bun.resolveSync` là cùng một instance của module. |

### Các bước

1. **W2a — `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802`.** Thêm `"ultraworkers"` làm phần tử **ĐẦU TIÊN** của `PI_SCOPE_ALIASES`, cho ra `const PI_SCOPE_ALIASES = ["ultraworkers", "oh-my-pi", "mariozechner", "earendil-works"] as const;`. Giữ nguyên `CANONICAL_PI_SCOPE` ở dòng 796 (`"@oh-my-pi"`). KHÔNG đụng dòng 805, KHÔNG đụng dòng 808. KHÔNG format lại khối comment bao quanh (dòng 789-795 và 798-801) ngoài mức tối thiểu cần thiết để câu chữ còn đúng: comment ở 789-795 nói «or the canonical @oh-my-pi scope itself» — vẫn đúng ở thời điểm này, vì canonical scope vẫn là `@oh-my-pi`; comment ở 798-801 giải thích vì sao `@oh-my-pi` phải ở lại danh sách mãi mãi, và lý do đó không đổi.

2. **W2a không thêm ca test nào — `packages/coding-agent/test/pi-scope-aliases.test.ts:43`.** Đây là quyết định lịch, không phải giới hạn kỹ thuật, và cần người xác nhận (xem mục «Cần người xác nhận», mục 2). Cần nói rõ vì lý do mà spec đưa ra — «cột canonical-path được dựng từ `Bun.resolveSync` ở phạm vi module, dòng 24-34, không có gì để resolve tới» — **không đúng**: cả 5 lệnh `Bun.resolveSync` ở dòng 24-34 đều gọi `@oh-my-pi/...`, và một ca `@ultraworkers` dùng lại `canonicalUtils` sẵn có ở dòng 29 không cần resolve scope mới ở phạm vi module — `aliasSpecifier` chỉ là chuỗi được nội vào probe sinh ra (dòng 109-117) và nạp lúc `loadExtensions` (dòng 130). Mô phỏng chuỗi filter/remap/resolve ở trạng thái W2a cho thấy `@ultraworkers/pi-utils` khớp filter, remap thành `@oh-my-pi/pi-utils` và resolve ra **cùng một** file với ca `@oh-my-pi` — nghĩa là ca đó chạy được và XANH ngay ở W2a. Các ca mới vẫn để ở W2b theo quyết định đó.

3. **W2b (chỉ sau khi W7 pass 1 đã merge và đã chạy lại `bun install`) — `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:796`.** Đổi `const CANONICAL_PI_SCOPE = "@oh-my-pi";` thành `const CANONICAL_PI_SCOPE = "@ultraworkers";`. Một dòng này là toàn bộ nội dung của W2b; dòng 802 đã xong ở W2a. KHÔNG đụng dòng 805, KHÔNG đụng dòng 808 — đó là các basename package do host bundle, một quyết định sản phẩm riêng đã chốt ở N17 (giữ nguyên cả 16 basename). KHÔNG thêm 10 basename còn lại đang được publish (`pi-catalog`, `pi-metaharness`, `pi-mnemopi`, `pi-wire`, `omp-stats`, `omptype`, `snapcompact`, `browser-relay`, `collab-web`, `typescript-edit-benchmark`) vào `PI_PACKAGE_NAMES`; chúng nằm ngoài phạm vi W2, và việc thêm là quyết định của N17, không phải của work item này.

4. **W2b — `packages/coding-agent/test/pi-scope-aliases.test.ts:43`.** Nối thêm vào `CASES` một ca `{ id: "ultraworkers-utils", aliasSpecifier: "@ultraworkers/pi-utils", canonicalPath: canonicalUtils, symbol: "logger" }`. `canonicalUtils` đã có sẵn ở dòng 29. Bộ khung ở dòng 109-117 sẽ tự sinh ra phép khẳng định identity: plugin import `logger` từ `@ultraworkers/pi-utils` và từ đường dẫn canonical tuyệt đối, rồi ném lỗi trừ khi hai binding là `===`. Chính một phép khẳng định đó là toàn bộ hợp đồng: import qua scope cũ và qua scope mới cùng rơi vào **MỘT** instance, không phải hai bản npm.

5. **W2b — `packages/coding-agent/test/pi-scope-aliases.test.ts:94`.** Ca thứ hai mà plan yêu cầu (một plugin **khai báo** `@ultraworkers` trong `peerDependencies` vẫn resolve được) nên được diễn đạt bên trong chính probe sinh ra đó, chứ không phải bằng một file mới: thêm một trường `peerDependencies` vào object `package.json` của plugin thử ở dòng 96-100, liệt kê mọi alias scope đang thử (`{"@oh-my-pi/pi-utils": "*", "@ultraworkers/pi-utils": "*", "@mariozechner/pi-utils": "*"}`). Không gì trong loader đọc trường đó để quyết định việc resolve — nó được khai báo, không bao giờ được cài, và extension vẫn nạp được. Đó chính là điểm mấu chốt: việc resolve phải đến từ canonicalizer của host, không phải từ một peer được cài cục bộ. Nếu một hồi quy tương lai khiến loader bắt đầu tôn trọng `node_modules` cục bộ của plugin, chính phép khẳng định identity ở bước 4 là thứ bắt được điều đó.

6. **Trước khi commit — `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:805`.** Chạy các grep kiểm tra ở khối Xác minh, và cụ thể xác nhận hai bất biến canh gác trước khi commit: (a) `git grep -n 'PI_SCOPE_ALIASES = \["ultraworkers", "oh-my-pi"' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts` trả về đúng một hit ở dòng 802 — scope cũ phải ở lại danh sách alias mãi mãi (N8); (b) `git grep -nF 'const CANONICAL_PI_SCOPE = "@oh-my-pi";' -- …` trả về đúng một hit ở dòng 796 — W2a không được lỡ tay flip canonical scope; (c) `git diff` chạm đúng hai dòng source và không chạm dòng 805. Cả ba đều rẻ, và (a) bắt được sai lầm gây hại nặng nhất của work item này.

7. **Trước khi coi W2b là xong — `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:748`.** Kiểm tra bằng mắt đường đi của binary đã compile, vì không test in-process nào chạm tới được. Khoá của registry đi từ `manifest.name` (`packages/coding-agent/scripts/legacy-pi-virtual-module.ts:126`), và `loadBundledModule` ném `omp:legacy-pi-shim: no bundled module registered for <key>` ở dòng 752-754 khi một khoá vắng mặt. Vì vậy sau W2b, một bản build **không** kèm rename manifest của W7 sẽ tạo ra binary mà registry khoá theo `@oh-my-pi/pi-ai` trong khi `LEGACY_PI_AI_SHIM_PATH` lại đòi `@ultraworkers/pi-ai` — mọi lần load extension bị bundle đều chết. Xác nhận bằng cách kiểm tra rằng rename manifest của W7 có mặt trong cùng nhánh với commit W2b (`git grep -m1 '"name"' packages/utils/package.json` trả về `@ultraworkers/pi-utils`). Đây chính là kiểm tra bắt được lỗi thứ tự W2b-trước-W7, và nó vẫn dùng được dù `bun test` đang bị chặn.

### Hình dạng code

```typescript
// packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts
//
// W2a — wave 1, shippable on its own. Widens what the loader ACCEPTS.
// The canonical scope is deliberately left alone: `@ultraworkers` does not exist
// on disk until W7 renames the 16 manifests, so repointing CANONICAL_PI_SCOPE
// now would aim the canonicalizer at a scope nothing can resolve.
const CANONICAL_PI_SCOPE = "@oh-my-pi"; // unchanged in W2a; flipped in W2b
const PI_SCOPE_ALIASES = ["ultraworkers", "oh-my-pi", "mariozechner", "earendil-works"] as const;

// Unchanged in both halves (N17: 16 basenames stay, only the scope moves).
const PI_PACKAGE_NAMES = ["pi-agent-core", "pi-ai", "pi-coding-agent", "pi-natives", "pi-tui", "pi-utils"] as const;

// Derived, self-recompute — no edit needed, but confirm after the change:
const PI_SCOPE_ALTERNATION = PI_SCOPE_ALIASES.join("|");
//   W2a => "ultraworkers|oh-my-pi|mariozechner|earendil-works"
//   W2b => unchanged (the alias list did not change in W2b)
const PI_PACKAGE_ALTERNATION = PI_PACKAGE_NAMES.join("|");

// :837 — both halves flow through here; nothing to edit.
const LEGACY_PI_SPECIFIER_FILTER = new RegExp(`^@(?:${PI_SCOPE_ALTERNATION})/(?:${PI_PACKAGE_ALTERNATION})(?:/.*)?$`);

// --- test/pi-scope-aliases.test.ts, appended to CASES (W2b only) ---
//
// {
//     id: "ultraworkers-utils",
//     aliasSpecifier: "@ultraworkers/pi-utils",
//     canonicalPath: canonicalUtils,   // already defined at line 29
//     symbol: "logger",
// },
//
// The harness (lines 109-117) turns that into, inside the generated probe:
//   import { logger as alias6 }   from "@ultraworkers/pi-utils";
//   import { logger as canonical6 } from "<abs path to packages/utils/src/index.ts>";
//   if (alias6 !== canonical6) throw new Error("@ultraworkers/pi-utils did not remap to the bundled copy (case ultraworkers-utils)");
// and line 130 asserts `result.errors` is empty — so a module-not-found at load
// also fails the test, which is how the W2b-without-W7 case goes red.
```

### Hợp đồng test

File test: `packages/coding-agent/test/pi-scope-aliases.test.ts`.

**Hợp đồng được canh giữ:** một plugin import package `pi-*` do host bundle thông qua **bất kỳ** npm scope nào được chấp nhận — `@ultraworkers`, `@oh-my-pi`, `@mariozechner`, hay `@earendil-works` — nhận về **cùng một** instance module mà chính host đang chạy, chứ không phải một bản npm riêng cho plugin. Test chứng minh điều đó bằng **identity của object** (`alias !== canonical` ném lỗi bên trong plugin sinh ra), chứ không bao giờ bằng so sánh chuỗi với một hằng số — nên nó không thể xanh một cách hụt lực.

**Nếu hồi quy, người dùng thấy gì:**

1. Plugin khai `@ultraworkers/pi-utils` trong `peerDependencies`, còn host đưa cho nó một bản sao thứ hai — tức một module registry thứ hai và một tool registry thứ hai. Hệ quả: một tool do host đăng ký sẽ vô hình với phía plugin, và `pi-natives` bị liên kết hai lần, làm đôi addon native trong cây của người dùng.
2. Chiều ngược lại, nếu danh sách alias mất `@oh-my-pi`: mọi extension hiện hữu viết theo scope cũ chết ngay lúc plugin-load với module-not-found — đó là **lỗi runtime, không phải lỗi build**, nên không có gì trong CI bắt được cho tới khi một người dùng thật sự thử nạp một plugin thật.

Cả hai chế độ hỏng đều được cùng một phép khẳng định identity bắt; chế độ thứ hai còn được các ca `@oh-my-pi` còn sống trong file (dòng 53, 55-59) phủ thêm. Nếu W2b đi trước W7, remap sinh ra `@ultraworkers/pi-utils`, `Bun.resolveSync` ném lỗi bên trong probe sinh ra chứ không phải ở phạm vi module test (cả 5 lệnh `Bun.resolveSync` ở dòng 24-34 đều gọi `@oh-my-pi/...`), nên file vẫn đánh giá được, `result.errors` khác rỗng, và `expect(result.errors).toEqual([])` ở dòng 131 thất bại — đỏ, chứ không phải xanh.

**Không canh giữ ở đây, và cố ý bỏ qua:** 10 basename đang publish nằm ngoài `PI_PACKAGE_NAMES` (`pi-catalog`, `pi-metaharness`, `pi-mnemopi`, `pi-wire`, `omp-stats`, `omptype`, `snapcompact`, `browser-relay`, `collab-web`, `typescript-edit-benchmark`). Chúng không khớp `LEGACY_PI_SPECIFIER_FILTER`, và cũng chưa từng được canonicalize ở HEAD. Khẳng định bất cứ điều gì về chúng là một quyết định sản phẩm mới, và việc đó thuộc về N17.

### Xác minh

**Bị chặn trong môi trường này, và cách gỡ chặn cần thêm một bước.** `bun test` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` (đã xác nhận bằng `cd packages/coding-agent && bun test test/pi-scope-aliases.test.ts`). Đây là vấn đề môi trường, không phải vấn đề code — file hỏng lúc import vì `packages/natives/native/index.js:23` gọi `loadNative` trước khi bất kỳ test nào chạy.

**Lệnh gỡ chặn `bun --cwd=packages/natives run build` SẼ THẤT BẠI** trên máy chưa cài `ninja` (đã chạy thật): CMake báo `CMake Error: CMake was unable to find a build program corresponding to "Ninja". CMAKE_MAKE_PROGRAM is not set.` rồi `error: script "build" exited with code 1`. Phải cài `ninja` TRƯỚC:

```bash
brew install ninja
bun --cwd=packages/natives run build   # mất nhiều phút
```

Chỉ sau khi `ls packages/natives/native/pi_natives.darwin-arm64.node` ra file mới tin bất kỳ kết quả `bun test` nào cho work item này.

```bash
# Chạy được ngay hôm nay (không cần addon)
bun run check:ts
# Kỳ vọng: exit 0, cả 16 workspace package typecheck sạch.
# Đã xác nhận pass ở HEAD 1454dc0. Mất ~25 giây (riêng pi-catalog ~2.4s);
# đo bằng `/usr/bin/time -p bun run check:ts`.

# Chỉ chạy được SAU KHI addon đã build
cd packages/coding-agent && bun test test/pi-scope-aliases.test.ts
# Kỳ vọng: 1 pass, 0 fail. Test duy nhất ở dòng 129 là cổng chặn.
```

Các grep kiểm tra — rẻ, và chúng là thứ thực sự bắt được lỗi W2b-trước-W7 trong lúc `bun test` còn bị chặn:

```bash
# (1) scope cũ PHẢI còn trong danh sách alias — bắt đúng sai lầm nguy hiểm nhất.
# Mẫu phải khớp TRỰC TIẾP dòng PI_SCOPE_ALIASES. Đừng dùng mẫu '"@oh-my-pi"':
# dòng 802 chứa "oh-my-pi" (không có dấu @) nên mẫu đó chỉ khớp dòng 796 và
# KHÔNG BAO GIỜ bắt được lỗi ở dòng 802.
git grep -n 'PI_SCOPE_ALIASES = \["ultraworkers", "oh-my-pi"' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts
# Phải trả về đúng một hit ở dòng 802. Thiếu hit nghĩa là "oh-my-pi" đã bị rơi khỏi
# danh sách alias — sai lầm gây hại nặng nhất của work item này.
# HEAD (chưa W2a) -> không có hit -> ĐỎ | W2a đúng -> hit 802 -> XANH
# W2a mất "oh-my-pi" -> không có hit -> ĐỎ.  Cả ba trạng thái đã kiểm chứng.

# (2) canonical scope PHẢI còn là @oh-my-pi sau W2a — bắt W2a lỡ tay flip
git grep -nF 'const CANONICAL_PI_SCOPE = "@oh-my-pi";' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts
# Phải trả về đúng một hit ở dòng 796 (chỉ đúng ở W2a; ở W2b thì đỏ, đúng ý).

# (3) sau W2b, dòng 796 là "@ultraworkers" — CÓ dấu @, nên mẫu '"ultraworkers"'
# (có nháy kép, không dấu @) sẽ KHÔNG khớp dòng 796. Kiểm bằng -F, không nháy kép:
git grep -nF 'ultraworkers' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts
# Sau W2a: hit 802. Sau W2b: hit 796 và 802. Đã kiểm chứng cả hai.

git grep -m1 '"name"' -- packages/utils/package.json
# Sau W7, LỆNH NÀY PHẢI in `@ultraworkers/pi-utils`.
# Nếu nó vẫn in `@oh-my-pi/pi-utils` trong khi W2b đang staged, DỪNG LẠI —
# đường đi của binary đã compile đã chết (xem mục «Cách sai dễ nhất»).

git add -A && git diff --cached --stat
# Cả W2a và W2b đều cho `1 file changed, 1 insertion(+), 1 deletion(-)` —
# KHÔNG phân biệt được hai nửa, nên đừng dùng nó để phân biệt. Và phải `--cached`: file vừa stage
# thì `git diff --stat` không có gì để hiện.
# Muốn phân biệt thì dùng ba grep ở trên.
# Bất kỳ hit nào vào dòng 805 nghĩa là N17 đã bị vi phạm.
```

### Cổng hoàn thành

**Cổng W2a (sóng 1, chạy được ngay hôm nay):** `bun run check:ts` exit 0, **và** cả hai grep sau đều xanh:

```bash
git grep -n 'PI_SCOPE_ALIASES = \["ultraworkers", "oh-my-pi"' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts
# -> đúng một hit ở dòng 802
git grep -nF 'const CANONICAL_PI_SCOPE = "@oh-my-pi";' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts
# -> đúng một hit ở dòng 796
```

W2a cố ý đi cùng **không** ca test mới, nên chính các grep này là cổng của nó — chúng là thứ duy nhất phân biệt một W2a đúng với một W2a lỡ tay cũng flip luôn canonical scope.

**Cổng W2b (sau W7):** `cd packages/coding-agent && bun test test/pi-scope-aliases.test.ts` báo 1 pass / 0 fail (cần addon native), **và** `git grep -m1 '"name"' -- packages/utils/package.json` in `@ultraworkers/pi-utils`. Cả hai đều bắt buộc: cái thứ nhất chứng minh hợp đồng identity, cái thứ hai chứng minh registry của binary đã compile sẽ có đủ các khoá mà canonicalizer nay đang đòi.

**Cổng có thực sự đỏ được không?** Với W2b: **có**, theo hai đường độc lập. (1) Nếu canonical scope đã bị flip nhưng danh sách alias mất `@oh-my-pi`, các ca sẵn có ở dòng 53 và 55-59 của test nạp các plugin import `@oh-my-pi/pi-utils` và `@oh-my-pi/pi-coding-agent`; những import đó ngừng resolve, `result.errors` khác rỗng, và `expect(result.errors).toEqual([])` ở dòng 131 thất bại. (2) Nếu W2b đi trước W7, `Bun.resolveSync` ném lỗi bên trong probe sinh ra (dòng 109-117) chứ không phải ở phạm vi module test, nên `result.errors` khác rỗng và `expect(result.errors).toEqual([])` ở dòng 131 thất bại — cổng đỏ, không phải xanh. Với W2a, cổng dựa hoàn toàn vào hai grep ở trên, vì W2a cố ý không thêm ca test nào. Cả hai đều PHẢI ĐỎ được, và đã kiểm chứng là đỏ được trên cả ba trạng thái: W2a chưa làm, W2a đúng, và W2a mất `"oh-my-pi"` khỏi danh sách alias. Lưu ý: grep phải khớp trực tiếp dòng `PI_SCOPE_ALIASES` — grep mẫu `"@oh-my-pi"` sẽ chỉ khớp dòng 796 và không bắt được lỗi ở dòng 802.

### Phụ thuộc

**`depends_on`:**

- W1 (mềm, thuần thẩm mỹ: giữ diff không bị churn trên wire-literal; hai dòng của W2 nằm ở file khác với năm dòng của W1, nên đây là vệ sinh thứ tự hơn là phụ thuộc thật).
- **Chỉ với W2b:** W7 pass 1 phải đã đi vào, vì W7 mới là thứ làm cho scope `@ultraworkers` thực sự tồn tại trên đĩa. Đây là phụ thuộc mang tải trọng, và plan **không** nêu đúng.

**`blocks`:**

- W7. Plan tuyên bố W2 là tiền điều kiện cứng của W7; xem mục «Đính chính so với plan» — quan hệ thật là W2 và W7 pass 1 không được bị tách ra bởi một lần phát hành, và chỉ nửa alias-only của W2 mới thực sự phải đứng trước W7.

### Cách sai dễ nhất

Cách sai dễ nhất, và nặng nhất, là **đưa W2b lên trước W7**. Nó tệ hơn cả rủi ro mà plan tự nêu. Rủi ro plan nêu là: chạy sed của W7 trước sẽ để lại canonicalizer trỏ vào scope cũ, khiến extension âm thầm liên kết một module native trùng lặp. Thực tế, làm theo đúng thứ tự của plan thì thất bại **KHÓ hơn**, không dễ hơn, và có hai cơ chế riêng biệt — cả hai đều đã kiểm chứng chứ không suy đoán:

1. **Chế độ dev / source.** `remapLegacyPiSpecifier` (`:1057-1069`) viết lại mọi scope được chấp nhận thành `${CANONICAL_PI_SCOPE}/...`, nên `@oh-my-pi/pi-utils` trở thành `@ultraworkers/pi-utils`. `getResolvedSpecifier` (`:1077`) gọi `Bun.resolveSync`, và nó ném lỗi — đã chạy thật: `Cannot find module '@ultraworkers/pi-utils'`. `try/catch` ở `:1144-1149` nuốt lỗi, nên shim bị bypass và plugin scope cũ vẫn chạy được, nhưng chỉ **tình cờ**, qua việc Bun tự resolve `@oh-my-pi/*` từ workspace root. Hệ quả ròng: canonicalizer chết lặng lẽ — đúng cái hại trùng native module mà plan mô tả, chỉ là đến theo đường ngược.
2. **Binary đã compile / `PI_BUNDLED=1`.** `LEGACY_PI_AI_SHIM_PATH` (`:951-953`) trở thành `omp-legacy-pi-bundled:@ultraworkers/pi-ai`, còn registry vẫn khoá theo `manifest.name` (`packages/coding-agent/scripts/legacy-pi-virtual-module.ts:126`), tức vẫn là `@oh-my-pi/pi-ai`. `loadBundledModule` (`:752-754`) ném `omp:legacy-pi-shim: no bundled module registered for @ultraworkers/pi-ai`. Đó là crash cứng trên **mọi** lần load extension bị bundle, và không test in-process nào chạm tới được — đó là lý do bước 7 là một phép kiểm tra bằng mắt chứ không phải một test.
3. **Bài test chấp nhận của chính plan không thể xanh trước W7.** Plan nói một plugin import `@ultraworkers/pi-utils` và một plugin import `@oh-my-pi/pi-utils` phải canonicalize ra cùng một specifier. Cái `@ultraworkers` hard-fail bằng module-not-found cho tới khi các manifest được đổi tên, nên câu lệnh plan chỉ định `bun test test/extension-scope-canonicalization.test.ts` sẽ đỏ trên một W2a trông hoàn toàn đúng.

Rủi ro bậc hai, gần bằng: **tạo file test mới mà plan đặt tên.** `test/pi-scope-aliases.test.ts` đã tồn tại và đã khẳng định đúng hợp đồng tương đương bằng identity của object. Một file thứ hai làm cùng việc đó là mẫu trùng coverage mà AGENTS.md cấm, và nó sẽ trôi lệch.

Rủi ro thứ ba: **"giúp thêm" 10 basename còn thiếu** vào `PI_PACKAGE_NAMES` khi đang mở file này ra. Trông như là làm nốt công việc, nhưng đó là một quyết định sản phẩm khác (N17) với bán kính ảnh hưởng lớn hơn nhiều.

### Cần người quyết

- Chấp nhận việc tách W2a / W2b hay không, hay chủ milestone muốn giữ W2 là một commit duy nhất bắt buộc merge trong cùng PR với W7 pass 1? Việc tách **an toàn hơn một cách tuyệt đối** (nó không tạo ra khoảng thời gian nào mà canonical scope lại trỏ tới một scope không tồn tại), nhưng nó kéo một dòng của W2 ra khỏi sóng 1 — đó là một thay đổi nhìn thấy được so với cấu trúc sóng của plan. Cần một người quyết, vì nó thay đổi trình tự của milestone chứ không chỉ code.
- Nếu W2b và W7 pass 1 buộc phải đi cùng nhau, ai giữ cổng phát hành chặn W2b khỏi bị cherry-pick một mình? Một mục CODEOWNERS, hoặc một check CI khẳng định `git grep -m1 '"name"' -- packages/utils/package.json` trả về `@ultraworkers/pi-utils` mỗi khi `CANONICAL_PI_SCOPE` là `@ultraworkers`, sẽ làm thất bại này trở thành không thể xảy ra chứ không chỉ là được ghi nhận.
- N17 được ghi là đã chốt ('keep all 16 basenames'), nhưng bảng open-questions của chính plan vẫn trình bày nó như một quyết định sản phẩm còn mở. W2 không được giải quyết nó theo bất kỳ hướng nào. Hãy xác nhận lập trường cuối cùng của plan trước khi bất kỳ ai đụng tới `PI_PACKAGE_NAMES`.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| W2 có thể đi một mình ở sóng 1, thành commit riêng, **trước** W7. ('Phải là một commit riêng, trước W7' — plan:8677; 'Effort: S — 2 sửa chuỗi cộng một test' — plan:8681.) | **sai** | W2 như một commit duy nhất không thể đi trước W7. Đặt `CANONICAL_PI_SCOPE = "@ultraworkers"` trước khi 16 manifest được đổi tên là chỉ canonicalizer vào một scope không tồn tại: ở chế độ dev mọi lần remap đều ném lỗi và lỗi bị nuốt ở `:1144-1149`; ở binary đã compile, mọi lần load extension bị bundle đều chết ở `:752-754`. Hãy tách: W2a (sóng 1) chỉ thêm `"ultraworkers"` vào `PI_SCOPE_ALIASES` và tự đóng gói được một mình; W2b flip `CANONICAL_PI_SCOPE` và đi cùng hoặc ngay sau W7. Bản thân W2a hôm nay là một no-op (scope chưa tồn tại) và đã đúng ngay khoảnh khắc W7 hạ cánh, nên không commit nào trong lịch sử từng chỉ canonicalizer vào một scope thiếu. Điều này cũng vi phạm chính yêu cầu cấu trúc của plan ở dòng 8650 rằng mỗi sóng phải tự đóng gói được. Bằng chứng: `bun -e 'Bun.resolveSync("@ultraworkers/pi-utils", process.cwd())'` → `Cannot find module '@ultraworkers/pi-utils' from '/Users/tranquangdang21/Projects/ultraworkers'`, trong khi cùng lệnh đó với `@oh-my-pi/pi-utils` → `/Users/.../packages/utils/src/index.ts`. Nguồn: `legacy-pi-compat.ts:1077` (`Bun.resolveSync` trong `getResolvedSpecifier`), `:1144-1149` (try/catch nuốt lỗi), `:751-754` (`loadBundledModule` ném khi khoá chưa đăng ký), và `packages/coding-agent/scripts/legacy-pi-virtual-module.ts:126` (`addEntry(manifest.name, ...)` — khoá registry là tên manifest nguyên văn, vẫn là `@oh-my-pi/pi-ai`). Một mô phỏng đầy đủ chuỗi filter/remap/resolve sau W2 xác nhận cả bốn cách viết scope đều remap tới một đích `@ultraworkers/*` không resolve được. |
| 'File test mới: packages/coding-agent/test/extension-scope-canonicalization.test.ts' — một file test **MỚI** (plan:8678). | **sai** | Một test tương đương đã tồn tại: `packages/coding-agent/test/pi-scope-aliases.test.ts` (135 dòng). Nó dựng một plugin thử import từng scope alias bên cạnh đường dẫn tuyệt đối từ `Bun.resolveSync` và ném lỗi trừ khi hai binding có identity object giống nhau (dòng 109-117) — đúng là phép khẳng định tương đương mà plan bảo file mới phải làm, và nó đã phủ `@oh-my-pi` (dòng 53, 55-59) cùng `@mariozechner` (dòng 61-66). Hãy thêm ca `@ultraworkers` vào mảng `CASES` của nó. Tạo file được plan đặt tên sẽ trùng coverage ở một tầng thứ hai, điều AGENTS.md cấm rõ ràng, và hai file sẽ trôi lệch. Bằng chứng: `cat -n packages/coding-agent/test/pi-scope-aliases.test.ts` — 135 dòng; dòng 43-83 là bảng `CASES`; dòng 109-117 phát ra `if (alias${idx} !== canonical${idx}) throw new Error(...)`; dòng 129-134 là test chặn duy nhất. `ls packages/coding-agent/test/ \| grep -i 'scope'` trả về đúng một file này; không có `extension-scope-canonicalization.test.ts` và không nên thêm. |
| Ca test thứ hai của W2: 'a plugin declaring `@ultraworkers` in `peerDependencies` still resolves' (plan:8682). | **đúng-nhưng-gây-hiểu-nhầm** | Loader không bao giờ đọc `peerDependencies` của plugin để quyết định việc resolve — `isBareExtensionDependencySpecifier` (`:1453-1466`) chỉ phân loại **hình dạng** của specifier, còn `resolveExtensionBareDependency` tìm trong `node_modules` của chính PLUGIN, mà theo cấu tạo sẽ không chứa peer. Vậy nên phần khai báo là vô tác dụng, và ca này chỉ có ý nghĩa như một phép phủ định: nó chứng minh việc resolve đến từ canonicalizer của host chứ không phải từ một peer được cài cục bộ. Hãy diễn đạt nó thành một trường `peerDependencies` trên `package.json` của plugin thử trong bộ khung có sẵn, chứ không phải một file riêng hay một đường loader riêng. Nó phải được thêm ở W2b chứ không phải W2a, vì `Bun.resolveSync('@ultraworkers/pi-utils')` không thể tạo ra cột canonical-path trước W7. Bằng chứng: `legacy-pi-compat.ts:1453-1466` (`isBareExtensionDependencySpecifier` — phân loại thuần hình dạng, không đọc manifest); `:1158-1161` (đường fallback bare-dep chỉ tới được SAU khi canonicalizer đã thất bại, và nó hoạt động trên specifier gốc). Mô phỏng xác nhận `isBareExtensionDependencySpecifier('@ultraworkers/pi-utils')` trả về true. |
| W2 phải đứng trước W7 vì hai chuỗi scope đó là thứ mà sed của W7 'không với tới', nên cơ chế tương thích phải có sẵn trước (plan:8781, plan:8784 'W2 (cứng)'). | **đúng-một-phần** | Claim về cơ chế thì đúng, nhưng lý do sed-sẽ-đè thì không phải là ràng buộc vận hành, và trộn hai thứ lại dẫn tới thứ tự sai. Mẫu của W7 là `@oh-my-pi/` **có dấu gạch chéo cuối**; cả `"@oh-my-pi"` (`:796`) lẫn `"oh-my-pi"` (`:802`) đều không chứa dấu gạch chéo cuối, nên sed chắc chắn không thể chạm vào dòng nào — đúng như chính plan nói ở 8503 và 8964. Ràng buộc thật là ràng buộc **resolve được**: W2b chỉ hợp lệ khi scope `@ultraworkers` đã tồn tại, tức sau đợt đổi tên manifest của W7. Phần thực sự phụ thuộc thứ tự là W2a: việc mở rộng bảng alias chính là thứ giữ cho plugin scope cũ tiếp tục được canonicalize xuyên suốt lúc đổi tên W7, và nửa đó quả thực cần đứng trước W7. Tách work item ra là để tách ràng buộc thứ tự thật khỏi thứ chỉ là mối quan tâm vệ sinh sed. Bằng chứng: `git grep -n 'CANONICAL_PI_SCOPE\|PI_SCOPE_ALIASES'` ở HEAD: chỉ `legacy-pi-compat.ts:796,802` trong source — cả hai đều ở dạng bare-quoted, không dấu gạch chéo cuối. Dòng 8503 và dòng 8964 của plan đều nói mẫu sed có dấu gạch chéo cuối và dạng bare cần grep riêng. |
| Work-item brief nói repo đang ở git HEAD 5873776. | **cũ** | HEAD hiện tại là `1454dc0` trên nhánh `milestone-1` (`docs: record the two architecture decisions — move all of pi, and re-cut packages`), tức 5 commit sau `808b365`. Nhánh đúng; SHA trong brief thì không. Cả hai file mà W2 chạm vào KHÔNG đổi giữa `808b365` và `1454dc0` — `git diff --stat 808b365..HEAD -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts packages/coding-agent/test/pi-scope-aliases.test.ts` không ra gì — nên mọi neo mà spec này trích (`:796`, `:802`, `:805`, `:807`, `:808`, `:837`, `:951-953`, `:1057-1069`, `:1077`, `:1144-1149`, `:1453-1466`, `:751-754`) vẫn đúng. Đừng mất thời gian đi tìm một commit tên 5873776. Bằng chứng: `git rev-parse --short HEAD` → `1454dc0`; `git branch --show-current` → `milestone-1`; `git rev-list --count 808b365..HEAD` → `5`; `git cat-file -t 5873776` → `fatal: Not a valid object name 5873776`. |
| `PI_PACKAGE_NAMES` (`:805`) giữ danh sách package mà canonicalizer phục vụ, nên thêm `ultraworkers` vào scope hàm ý danh sách đó cũng phải theo scope mới (cách hiểu ngầm từ ngoặc ở plan:8678). | **đúng-như-nguyên-văn, đáng ghim lại** | `PI_PACKAGE_NAMES` là danh sách BASENAME của các package do host bundle, và cố ý tách rời khỏi danh sách scope. Nó chứa 6 mục trong khi repo publish 16 package có scope, nên 10 basename đang publish — `pi-catalog`, `pi-metaharness`, `pi-mnemopi`, `pi-wire`, `omp-stats`, `omptype`, `snapcompact`, `browser-relay`, `collab-web`, `typescript-edit-benchmark` — chưa từng khớp `LEGACY_PI_SPECIFIER_FILTER` và không được canonicalize. W2 không thay đổi điều đó, và test của spec này cố ý không khẳng định gì về chúng, để quyết định nằm đúng chỗ N17 đã đặt. Hãy nói điều này trong phần mô tả PR, vì chính sự lệch (6 với 16) là thứ dễ bịt ai đó «sửa cho đàng hoàng» một cách thiện chí trong lúc review. Bằng chứng: `legacy-pi-compat.ts:805` liệt kê đúng 6 basename `pi-*`; `for f in packages/*/package.json; do grep -m1 '"name"' ...; done` trả về đúng 16 tên package có scope. Một mô phỏng xác nhận `@ultraworkers/omp-stats` KHÔNG khớp filter sau W2. |

## Cần người xác nhận

Ba chỗ trong đặc tả tự mâu thuẫn với chính nó. Chúng được ghi lại nguyên trạng, không tự sửa:

1. **Số dòng của test chặn trong `pi-scope-aliases.test.ts` bị mâu thuẫn.** Cùng một phép khẳng định `result.errors` được gán bốn số dòng khác nhau: khối `verification` nói «The single test at line 129 is the gate»; khối `code_shape` nói «line 130 asserts `result.errors` is empty»; khối `gate` nói «line 131 `expect(result.errors).toEqual([])` fails»; còn `plan_corrections` nói «line 129-134 is the single gating test». Cần một số dòng chuẩn trước khi dùng các câu lệnh grep theo dòng trong lúc review.
2. **`files_touched` không gắn phần sửa test vào W2b, còn `steps` và `gate` thì có.** `files_touched` mô tả thẳng «Append two cases to the existing `CASES` array (line 43)», trong khi bước 2 nói W2a thêm **không** ca nào và `gate` nói «W2a deliberately ships with no new test case». Cần xác nhận rằng cả hai ca đó thuộc về W2b, không thuộc W2a.
3. **`title` và trường `wave` kéo theo hai hướng khác nhau.** `title` viết «must land with the W7 scope rename, not before it», còn `wave` viết «Wave 1 (M5 §6.1) — as written. RECOMMENDED: split into W2a … and W2b». `plan_corrections` nghiêng về hướng tách, nhưng sự xung đột giữa `title` và `wave` trong chính đặc tả vẫn cần một người chốt để tiêu đề mục Markdown và nội dung không kéo nhau.


---


## W3. Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)

**Sóng:** Wave 1 — Cô lập hợp đồng, rồi mới đổi lớp hiển thị (plan line 8652)

**Effort:** S về code (9 dòng nguồn trong 6 file) nhưng trung bình về test — 4 file test hiện có ghim literal "omp" và sẽ đỏ nếu không cập nhật cùng commit.

**Rủi ro chính:** APP_NAME không chỉ là tên hiển thị: `dirs.ts:360` dựng XDG app root bằng chính hằng số này, nên đổi APP_NAME cũng dời `$XDG_{DATA,STATE,CACHE}_HOME/omp` (sessions, secret-placeholder.key, autoqa.db, run/daemons). Sai lầm thứ hai là chỉ đổi APP_NAME mà quên `logger.ts:256`, khiến `getLogPath()` (đã dùng APP_NAME) trỏ sang file mà `stderr-guard.ts:105` không ghi vào. Sai lầm thứ ba: coi `getAppName()` là tên hiển thị — nó là danh tính wire, xem mục Cần người quyết.

Một dòng: đổi tên hiển thị của ứng dụng ở một hằng số duy nhất (`APP_NAME`) và xoá 9 literal `"omp"` trùng lặp, để thông báo desktop, tiêu đề OSC99, tiêu đề setup-wizard và tên file log đều tự suy ra từ đó.

Hiệu ứng người dùng thấy: ứng dụng tự giới thiệu bằng tên mới thống nhất — tiêu đề thông báo desktop (notify-send/gdbus), tên app trong OSC99 và id thông báo (`omp-1` → `<tên-mới>-1`), tiêu đề khung setup composer, tên file log xoay vòng và file audit log. Cấu hình người dùng VẪN nằm dưới root `.omp` cũ — trừ người dùng XDG, xem mục **Cần người quyết**.

### File cần chạm tới

| Path | Hành động | Thay đổi | Đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts` | sửa | Dòng 21 đổi giá trị `APP_NAME` sang tên mới; dòng 1085 `return value ? value : "omp";` → `return value ? value : APP_NAME;`; dòng 956 `getCrashLogPath` ghim cứng `"omp-crash.log"` → `` `${APP_NAME}-crash.log` ``; sửa doc comment dòng 609. | Có (`verified: true`) |
| `packages/utils/src/logger.ts` | sửa | Dòng 17 `import { getLogsDir }` → `import { APP_NAME, getLogsDir }`; **dòng 56-57 `PROCESS_LOG_PATTERN`/`PROCESS_AUDIT_PATTERN` (bắt buộc cùng commit, xem bước 5a)**; dòng 256 `filenamePrefix: "omp"` → `filenamePrefix: APP_NAME`; dòng 260 `auditFile` → `` `.${APP_NAME}.${process.pid}-audit.json` `` (giữ dấu chấm dẫn). | Có (`verified: true`) |
| `packages/coding-agent/src/cli/commands/init-xdg.ts` | sửa | Xoá dòng 5 `const APP_NAME = "omp";`, thêm `import { APP_NAME } from "@oh-my-pi/pi-utils"` ở đầu file. **3 chỗ dùng, tất cả trên dòng 17** (một mảng `dirs`), tự nhiên theo hằng số; `console.log` ở :21/:24-26 in giá trị đã join nên không cần sửa. | Có (`verified: true`) |
| `packages/tui/src/desktop-notify.ts` | sửa | Xoá dòng 29 `const APP_NAME = "omp";`, thêm `import { APP_NAME } from "@oh-my-pi/pi-utils/dirs"`. 4 chỗ dùng ở :114, :116, :141, :154 tự theo. | Có (`verified: true`) |
| `packages/tui/src/terminal-capabilities.ts` | sửa | Thêm import `APP_NAME` từ `@oh-my-pi/pi-utils/dirs`; dòng 45 `CMUX_NOTIFICATION_TITLE` → `APP_NAME`; dòng 1436 `OSC99_APP_NAME` → `APP_NAME`; dòng 1450 `` `omp-${nextOsc99NotificationId++}` `` → `` `${APP_NAME}-${nextOsc99NotificationId++}` ``. | Có (`verified: true`) |
| `packages/tui/src/overlays/composer-shape-preview.ts` | sửa | Thêm import `APP_NAME`; dòng 45 `const PREVIEW_TITLE = "omp"` → `const PREVIEW_TITLE = APP_NAME`. 4 chỗ dùng ở :62, :64, :66, :111 tự theo. | Có (`verified: true`) |
| `packages/utils/test/logger-contract.test.ts` | sửa | Derive từ `APP_NAME` thay vì ghim: dòng 77 regex `/^omp\.\d{4}.../`, **3 chỗ tên file log** ở :105, :286, :313, và 3 chỗ đường dẫn audit ở :135, :296, :333 — **tổng 7 chỗ, không phải 4**. Bỏ sót 3 chỗ tên file log là cổng 2 sẽ đỏ. | Có (`verified: true`) |
| `packages/utils/test/dirs.test.ts` | sửa | Dòng 82 `expect(path.basename(getLogPath(date, 123))).toBe("omp.2026-05-31.123.log")` → derive `` `${APP_NAME}.2026-05-31.123.log` ``. | Có (`verified: true`) |
| `packages/tui/test/desktop-notify.test.ts` | sửa | 9 chỗ literal `"omp"` ở dòng 114, 117, 132, 144, 147, 153, 163, 166, 202 thay bằng `APP_NAME`. | Có (`verified: true`) |
| `packages/tui/test/composer-shape-preview.test.ts` | sửa | **7 assertion** `toContain("omp")` ở dòng **45, 49, 54, 59, 65, 70, 76** → `toContain(APP_NAME)`. | Có (`verified: true`) |
| `packages/tui/test/terminal-capabilities.test.ts` | tạo (thêm 1 test) | Thêm test OSC99: assert `f=base64(APP_NAME)` và `i=<APP_NAME>-1`, dựng bằng `new TerminalInfo("base", null, true, true, NotifyProtocol.Osc99)` + `setOsc99Supported(true)`. | Chưa — file này nằm trong `test_files`, `code_shape` và bước 13 nhưng **không** có trong `files_touched`, nên đặc tả không gắn cờ `verified` cho nó. Phải tự mở file khi tới bước 13. |

Mười file đầu đã được đọc trực tiếp và đánh dấu `verified: true` trong đặc tả. Các neo được nhắc ở phần dưới đây nhưng **không** nằm trong `files_touched` thì phải tự kiểm lại khi mở file: `packages/coding-agent/src/cli/args.ts:5`, `packages/coding-agent/src/cli/grep-cli.ts:8`, `packages/coding-agent/src/cli/config-cli.ts:8` (mẫu import để đối chiếu — LƯU Ý: nằm ở `src/cli/`, KHÔNG phải `src/cli/commands/`), `packages/tui/src/setup/scenes/composer.ts:86` (nơi render `PREVIEW_TITLE`), `packages/utils/src/rotating-file.ts:136-145`, `packages/coding-agent/src/debug/report-bundle.ts:208,253`, `packages/coding-agent/src/main.ts:285`, `packages/utils/src/index.ts:5`.

### Các bước

1. **Chốt open_questions[0] TRƯỚC KHI VIẾT DÒNG NÀY.** Đây là cổng chặn, không phải việc làm sau. Hỏi người quyết định: đổi APP_NAME có được phép kéo theo việc dời `$XDG_DATA_HOME/omp`, `$XDG_STATE_HOME/omp`, `$XDG_CACHE_HOME/omp` không? Nếu KHÔNG, tách thêm hằng số XDG dir name đóng băng giá trị cũ và dùng nó ở dòng 360, còn APP_NAME chỉ phục vụ tên hiển thị. Cũng chốt tên mới cho APP_NAME. — neo: `packages/utils/src/dirs.ts:360`
2. **Đổi giá trị hằng số gốc.** Sửa đúng một chỗ: `export const APP_NAME: string = "omp";` thành tên mới đã chốt. KHÔNG đụng `CONFIG_DIR_NAME` (dòng 27), `APP_URL` (dòng 24), `USER_AGENT` (dòng 36) — ba cái này cố ý giữ nguyên. — neo: `packages/utils/src/dirs.ts:21`
3. **Trong cùng file, làm cho `getAppName()` mặc định về hằng số thay vì literal.** Đổi `return value ? value : "omp";` thành `return value ? value : APP_NAME;`. Hàm này đọc env `OMP_APP_NAME`, nên embedder vẫn ghi đè được — không được xoá nhánh env. — neo: `packages/utils/src/dirs.ts:1085`
4. **Sửa 2 literal còn sót trong chính dirs.ts mà plan không liệt kê.** `getCrashLogPath`: đổi chuỗi cứng `"omp-crash.log"` thành template `` `${APP_NAME}-crash.log` `` để khớp với `getDebugLogPath` ngay dòng sau vốn đã dùng APP_NAME. Và sửa doc comment ở dòng 609 đang ghi log file tên `omp.<day>.<pid>.log` cho đúng tên mới. — neo: `packages/utils/src/dirs.ts:956`
5. **Bắt buộc cùng commit: làm logger.ts đọc hằng số.** Thêm APP_NAME vào import `from "./dirs"` ở dòng 17, đổi `filenamePrefix: "omp"` thành `filenamePrefix: APP_NAME`, và đổi auditFile thành `` `.${APP_NAME}.${process.pid}-audit.json` `` (giữ nguyên dấu chấm dẫn). Bỏ qua bước này thì stderr-guard ghi log vào file không ai đọc. — neo: `packages/utils/src/logger.ts:256`
5a. **Bắt buộc cùng commit: hai regex prune-stale.** `PROCESS_LOG_PATTERN` (`logger.ts:56`) và `PROCESS_AUDIT_PATTERN` (`logger.ts:57`) đang ghim cứng `omp` — dùng `filenamePrefix` đổi sang tên mới thì chúng không khớp file nào, khiến log/audit mới không bao giờ bị prune (tích tụ vô hạn), đồng thời file `omp.*` cũ vẫn bị `fs.rmSync` xoá vĩnh viễn. Đổi thành:

   ```typescript
   const APP_NAME_RE = APP_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
   const PROCESS_LOG_PATTERN = new RegExp(`^${APP_NAME_RE}\\.(\\d{4}-\\d{2}-\\d{2})\\.(\\d+)\\.log(?:\\.(\\d+))?$`);
   const PROCESS_AUDIT_PATTERN = new RegExp(`^\\.${APP_NAME_RE}\\.(\\d+)-audit\\.json$`);
   ```

   Escape bằng `APP_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")` để tên mới có ký tự regex không vỡ. Lý do cứng: `pruneStaleProcessLogs` (`logger.ts:77`) lấy `pidText` từ chính hai regex này rồi `if (!pidText) continue` — nếu để nguyên `^omp\.` thì sau khi `filenamePrefix` đổi tên, **mọi** file log/audit mới đều rơi vào nhánh `continue` đó và không bao giờ bị prune: log tích tụ vô hạn, không ai báo lỗi. Ngược lại nếu chỉ đổi `filenamePrefix` mà không đụng regex, file `omp.*` cũ vẫn khớp và vẫn bị `fs.rmSync` xoá vĩnh viễn. Hệ quả của bản sửa này: file `omp.*` cũ sẽ nằm lại (không khớp nên không bị prune) — chấp nhận được, nhưng phải dọn thủ công một lần, xem cổng 4 (c). `RotatingFileSink#maxFiles: 5` (`logger/rotating-file.ts:153-157`) KHÔNG cứu được: nó chỉ cắt trong các file chính sink đó tạo ra, không đụng tới file của tiến trình đã chết. — neo: `packages/utils/src/logger.ts:56-57`
6. **Xoá 2 hằng số shadow trong package khác.** `init-xdg.ts`: xoá dòng `const APP_NAME = "omp";` và thêm `import { APP_NAME } from "@oh-my-pi/pi-utils"` (khớp pattern của `args.ts:5` / `grep-cli.ts:8`). `desktop-notify.ts`: xoá dòng `const APP_NAME = "omp";` và thêm `import { APP_NAME } from "@oh-my-pi/pi-utils/dirs"`. KHÔNG sửa các chỗ dùng bên dưới — chúng tự theo hằng số (ở `init-xdg.ts` là 3 chỗ trên dòng 17; `console.log` in giá trị đã join nên không đụng tới). — neo: `packages/coding-agent/src/cli/commands/init-xdg.ts:5`
7. **Ba literal trong terminal-capabilities.ts.** Thêm import APP_NAME từ `@oh-my-pi/pi-utils/dirs` (file đã dùng subpath `/env` ở dòng 2 nên nhất quán). Đổi `const CMUX_NOTIFICATION_TITLE = "omp"` và `const OSC99_APP_NAME = "omp"` thành `= APP_NAME`. Đổi hàm `osc99Id`: `` `omp-${nextOsc99NotificationId++}` `` thành `` `${APP_NAME}-${nextOsc99NotificationId++}` `` — dấu gạch nối nằm NGOÀI hằng số, giữ nguyên. — neo: `packages/tui/src/terminal-capabilities.ts:45`
8. **Literal thứ tư mà plan bỏ sót.** Trong `composer-shape-preview.ts` đổi `const PREVIEW_TITLE = "omp"` thành `const PREVIEW_TITLE = APP_NAME` và thêm import từ `@oh-my-pi/pi-utils/dirs`. Bỏ qua nếu open_questions[2] trả lời "không" — nhưng khi đó phải ghi rõ là chấp nhận 1 literal trùng lặp còn sót. — neo: `packages/tui/src/overlays/composer-shape-preview.ts:45`
9. **Cập nhật logger-contract.test.ts — KHÔNG viết test mới.** File này đã spawn child-process nên an toàn full-suite. Import APP_NAME, rồi derive **7 chỗ**: regex dòng 77 dựng động từ APP_NAME (giữ nguyên shape `\d{4}-\d{2}-\d{2}`), **3 tên file log** ở :105 (`omp.2026-01-01.${result.pid}.log`), :286 (`omp.2026-01-0${day}.${result.pid}.log`) và :313 (`omp.2026-01-01.${result.pid}.log`) thành `` `${APP_NAME}...` ``, và 3 chỗ `.omp.${pid}-audit.json` ở dòng 135, 296, 333 thành `` `.${APP_NAME}.${pid}-audit.json` ``. Ba chỗ tên file log dễ sót vì trông như chuỗi bình thường, nhưng chúng đều là tên file thật nên sẽ đỏ. — neo: `packages/utils/test/logger-contract.test.ts:77`
10. **Cập nhật dirs.test.ts dòng 82** thành `` expect(path.basename(getLogPath(date, 123))).toBe(`${APP_NAME}.2026-05-31.123.log`) ``. Giữ nguyên phần assert khác — đây là test duy nhất bảo vệ việc `getLogPath` và rotating sink sinh cùng tên. — neo: `packages/utils/test/dirs.test.ts:82`
11. **Cập nhật 9 literal trong desktop-notify.test.ts** (dòng 114, 117, 132, 144, 147, 153, 163, 166, 202) thành APP_NAME. Giữ nguyên cấu trúc mảng argv và assertion hiện có — chỉ thay chuỗi, để test vẫn kiểm tra ĐỊNH DẠNG lệnh chứ không chỉ echo hằng số. — neo: `packages/tui/test/desktop-notify.test.ts:114`
12. **Cập nhật 7 assertion `toContain("omp")` trong composer-shape-preview.test.ts** (dòng **45, 49, 54, 59, 65, 70, 76**) thành `toContain(APP_NAME)`. Ba chỗ cuối là các shape `pi`, `borderless` và vòng lặp `["field", "rail"]` — dễ bị quên vì nằm ngoài 4 block đầu. Bỏ qua nếu bước 8 bị bỏ. — neo: `packages/tui/test/composer-shape-preview.test.ts:45`
13. **Thêm MỘT test mới cho OSC99 trong terminal-capabilities.test.ts.** Import `NotifyProtocol`, `TerminalInfo`, `setOsc99Supported`. Dựng `new TerminalInfo("base", null, true, true, NotifyProtocol.Osc99)`, gọi `setOsc99Supported(true)`, rồi assert chuỗi `formatNotification({title:"T", body:"B"})` chứa `f=${base64(APP_NAME)}` và `i=${APP_NAME}-1`. Bắt buộc `setOsc99Supported(false)` trong `afterEach` vì đây là module singleton — nếu không, file test này sẽ đầu độc các file sau. — neo: `packages/tui/test/terminal-capabilities.test.ts`
**Bước 0 (chưa có trong danh sách bước, nhưng là tiền đề của cổng 2 và cổng 3):** `bun --cwd=packages/natives run build` **thất bại trên máy này** nếu chưa cài `ninja` — đã chạy thật, exit 1, nguyên văn `CMake Error: CMake was unable to find a build program corresponding to "Ninja". CMAKE_MAKE_PROGRAM is not set.` (crate `opusic-sys` build C opus bằng cmake, nên máy phải có `ninja`; `which ninja` → không tìm thấy). Phải `brew install ninja` **trước**. Nếu không cài được, cổng 2 và cổng 3 phải được khai báo là CHƯA TỪNG CHẠY — tuyệt đối không ghi "test pass" ở bất kỳ đâu trong PR.

14. **Chạy gate.** Trước hết `bun run check:ts` (đã xác nhận sạch ở HEAD 808b365, exit 0, mất ~10 phút vì pi-catalog chiếm 298s). Sau đó mới chạy bun test — hiện BLOCKED vì native addon chưa build, báo `Failed to load pi_natives native addon for darwin-arm64` với 0 pass (đã tự xác nhận). Build bằng `bun --cwd=packages/natives run build` **sau khi đã `brew install ninja`** (xem Bước 0) rồi mới chạy được 4 file test.

### Hình dạng code

```typescript
// ---- packages/utils/src/logger.ts :17  (đổi import để lấy thêm APP_NAME) ----
-import { getLogsDir } from "./dirs";
+import { APP_NAME, getLogsDir } from "./dirs";

// ---- packages/utils/src/dirs.ts :21  (hằng số nguồn duy nhất) ----
-export const APP_NAME: string = "omp";
+export const APP_NAME: string = "<TÊN-MỚI>";

// ---- packages/utils/src/dirs.ts :609  (doc comment, giữ đúng với tên mới) ----
- * the rotating sink's file naming: log files are named `omp.<day>.<pid>.log`
+ * the rotating sink's file naming: log files are named `<APP_NAME>.<day>.<pid>.log`

// ---- packages/utils/src/dirs.ts :956  (crash log từng ghim cứng, KHÔNG nằm trong plan) ----
 export function getCrashLogPath(agentDir?: string): string {
-	return dirs.agentSubdir(agentDir, "omp-crash.log", "state");
+	return dirs.agentSubdir(agentDir, `${APP_NAME}-crash.log`, "state");
 }

// ---- packages/utils/src/dirs.ts :1083-1086  (mặc định của getAppName) ----
 export function getAppName(): string {
 	const value = process.env.OMP_APP_NAME?.trim();
-	return value ? value : "omp";
+	return value ? value : APP_NAME;
 }

// ---- packages/utils/src/logger.ts :256,260  (PHẢI đổi cùng commit, xem risk) ----
 	return new RotatingFileSink({
 		directory: logsDir,
-		filenamePrefix: "omp",
+		filenamePrefix: APP_NAME,
 		filenameSuffix: String(process.pid),
 		maxBytes: 10 * 1024 * 1024,
 		maxFiles: 5,
-		auditFile: path.join(logsDir, `.omp.${process.pid}-audit.json`),
+		auditFile: path.join(logsDir, `.${APP_NAME}.${process.pid}-audit.json`),
 	});

// ---- packages/coding-agent/src/cli/commands/init-xdg.ts :1,5  (xoá shadow, import hằng số) ----
+import { APP_NAME } from "@oh-my-pi/pi-utils";
 import * as fs from "node:fs/promises";
 import * as os from "node:os";
 import * as path from "node:path";
-
-const APP_NAME = "omp";   // <- xoá dòng này; 3 chỗ dùng bên dưới (dòng 17) tự lấy hằng số

// ---- packages/tui/src/desktop-notify.ts :29  (tương tự: 4 chỗ dùng ở :114,116,141,154) ----
+import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";
 /** Application name surfaced as the notification source. */
-const APP_NAME = "omp";   // <- xoá dòng này

// ---- packages/tui/src/terminal-capabilities.ts :45,1436,1450 ----
+import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";
-const CMUX_NOTIFICATION_TITLE = "omp";
+const CMUX_NOTIFICATION_TITLE = APP_NAME;
-const OSC99_APP_NAME = "omp";
+const OSC99_APP_NAME = APP_NAME;
-	return sanitizeOsc99Id(id) || `omp-${nextOsc99NotificationId++}`;
+	return sanitizeOsc99Id(id) || `${APP_NAME}-${nextOsc99NotificationId++}`;

// ---- packages/tui/src/overlays/composer-shape-preview.ts :45  (KHÔNG nằm trong plan) ----
+import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";
 /** Stand-in session title shown while the previewed session is unnamed. */
-const PREVIEW_TITLE = "omp";
+const PREVIEW_TITLE = APP_NAME;

// ---- TEST: derive, đừng ghim lại ----
// packages/utils/test/dirs.test.ts :82
-	expect(path.basename(getLogPath(date, 123))).toBe("omp.2026-05-31.123.log");
+	expect(path.basename(getLogPath(date, 123))).toBe(`${APP_NAME}.2026-05-31.123.log`);

// packages/utils/test/logger-contract.test.ts :77
-	.filter(name => /^omp\.\d{4}-\d{2}-\d{2}\.\d+\.log(?:\.\d+)?$/.test(name))
+	.filter(name => new RegExp(`^${APP_NAME}\\.\\d{4}-\\d{2}-\\d{2}\\.\\d+\\.log(?:\\.\\d+)?$`).test(name))
// packages/utils/test/logger-contract.test.ts :135, :296, :333
-	path.join(result.primaryDir, `.omp.${result.pid}-audit.json`)
+	path.join(result.primaryDir, `.${APP_NAME}.${result.pid}-audit.json`)

// ---- TEST MỚI: hợp đồng OSC99 (dùng đường public, không export thêm) ----
import { NotifyProtocol, TerminalInfo, setOsc99Supported } from "@oh-my-pi/pi-tui/terminal-capabilities";
import { APP_NAME } from "@oh-my-pi/pi-utils";

// TerminalInfo là class exported, notifyProtocol là tham số constructor public readonly
// (terminal-capabilities.ts:137-143) → không cần export thêm formatOsc99Notification.
const osc = new TerminalInfo("base", null, true, true, NotifyProtocol.Osc99);
setOsc99Supported(true);                       // module singleton — phải trả lại trong afterEach
expect(osc.formatNotification({ title: "T", body: "B" }))
	.toContain(`f=${Buffer.from(APP_NAME, "utf8").toString("base64")}`);  // OSC99_APP_NAME
// và id mặc định phải mang tiền tố APP_NAME: `i=${APP_NAME}-1`
```

### Hợp đồng test

Hợp đồng quan sát được mà W3 bảo vệ: MỌI bề mặt người dùng thấy phải dẫn xuất từ một hằng số duy nhất, kể cả hai tên file log vốn lịch sử không thể. Ba hợp đồng con cụ thể:

1. **Đồng bộ đường ghi log.** `getLogPath()` (`dirs.ts:620`) và `RotatingFileSink#setActivePath` (`rotating-file.ts:136-145`) phải sinh CÙNG một basename cho cùng `(day, pid)`. Nếu hợp đồng này đứt, người tiêu dùng thấy: `stderr-guard.ts:105` ghi vào file A còn `report-bundle.ts:208,253` đọc file B — khi báo lỗi thì bundle log về rỗng và dòng gợi ý ở `main.ts:285` chỉ tới file không tồn tại. Đây là hợp đồng quan trọng nhất và là lý do `filenamePrefix` buộc phải đi cùng APP_NAME.
2. **Tên thông báo.** argv của notify-send/gdbus phải chứa APP_NAME ở `--app-name` và ở title fallback; OSC99 phải phát `f=base64(APP_NAME)` và `i=<APP_NAME>-1`. Nếu đứt, người tiêu dùng thấy toast mang tên cũ trong khi app đã tên mới — đúng loại lỗi mà plan nêu là "đổi tên tới mọi nơi trừ chỗ người dùng nhìn thấy".
3. **Tính toàn vẹn của việc đổi.** Bốn file test đang ghim literal `"omp"` phải được chuyển sang derive từ APP_NAME. Nếu chỉ sửa nguồn mà bỏ test, chúng sẽ đỏ — đó chính là cái cổng chặn. Nếu sửa test bằng cách ghim lại literal mới thì hợp đồng (1) và (2) mất hết sức bảo vệ và lần đổi tên sau sẽ lại lặp lại đúng lỗi này.

**Không test:** không source-grep file `.ts` (AGENTS.md cấm), không đọc `logger.ts` để khẳng định tên file (`makeFileTransport` ở `logger.ts:251` không export, `setTransports` ở `:304` trả void — đúng như plan nói), không `mock.module()`.

File test liên quan:

- `packages/utils/test/logger-contract.test.ts` — CẬP NHẬT **7 chỗ**: `:77` regex, **3 tên file log** ở `:105, :286, :313`, `:135`, `:296`, `:333` — không viết mới.
- `packages/utils/test/dirs.test.ts` — CẬP NHẬT `:82`.
- `packages/tui/test/desktop-notify.test.ts` — CẬP NHẬT 9 chỗ: `:114, 117, 132, 144, 147, 153, 163, 166, 202`.
- `packages/tui/test/composer-shape-preview.test.ts` — CẬP NHẬT **7 chỗ**: `:45, 49, 54, 59, 65, 70, 76`.
- `packages/tui/test/terminal-capabilities.test.ts` — THÊM 1 test OSC99: `f=base64(APP_NAME)` và `i=<APP_NAME>-1`, dùng `new TerminalInfo(..., NotifyProtocol.Osc99)` + `setOsc99Supported`.

### Xác minh

Đã chạy và xác nhận ở HEAD `808b365`. **HEAD hiện tại là `1454dc0`, đi trước 5 commit — đã kiểm chứng lại bằng `git diff --name-only 808b365..HEAD -- <11 file W3 chạm tới>` → rỗng, nên mọi neo dòng dưới đây vẫn đúng.**

1. `bun run check:ts` → exit 0, oxlint/oxfmt sạch trên 5445 file, **cả 16 package có `check:types` đều Done** (pi-catalog chậm nhất 298.45s). Đây là baseline sạch — dùng làm cổng chặn chính.
2. `cd packages/tui && bun test test/desktop-notify.test.ts` → **0 pass, 1 fail, 1 error**: `Failed to load pi_natives native addon for darwin-arm64`, gợi ý `bun --cwd=packages/natives run build`. Đúng như task mô tả — coi `bun test` là BLOCKED cho tới khi build addon. Lệnh gỡ chặn đó **thất bại trên máy này** nếu chưa `brew install ninja` (xem Bước 0, đã chạy thật).

Lệnh kỹ sư phải đưa vào PR (sau khi build addon):

```bash
# BƯỚC 0 — BẮT BUỘC, nếu bỏ thì cổng 2 và cổng 3 không bao giờ chạy được:
brew install ninja                      # chưa có thì dừng lại, KHÔNG báo "test pass"
bun --cwd=packages/natives run build     # chỉ chạy được SAU khi ninja đã cài
# Nếu vẫn exit 1: khai báo trong PR rằng cổng 2/3 CHƯA TỪNG CHẠY. Không được viết "test pass".
bun run check:ts
cd packages/utils && bun test test/logger-contract.test.ts test/dirs.test.ts test/stderr-guard.test.ts
cd packages/tui && bun test test/desktop-notify.test.ts test/terminal-capabilities.test.ts test/composer-shape-preview.test.ts
cd ../.. && bun run ci:test:smoke
```

Lưu ý về lệnh của plan: `bun run check && (cd packages/tui && bun test ...) && bun run ci:test:smoke` BỎ QUA hoàn toàn package utils, nên không chạy `logger-contract.test.ts` và `dirs.test.ts` — tức là không hề kiểm tra tên file log, thứ mà W3 chủ yếu sửa. Phải thêm bước 4 (dòng `cd packages/utils` ở trên).

### Cổng hoàn thành

- **Cổng 1** (luôn chạy được, kể cả khi addon chưa build): `bun run check:ts` phải exit 0. Nếu còn hằng số shadow trong `init-xdg.ts` hoặc `desktop-notify.ts`, hoặc import sai subpath, hoặc tạo chu trình import, bước này đỏ.
- **Cổng 2** (cần `brew install ninja` + `bun --cwd=packages/natives run build` trước): 4 file test ở mục test_files phải xanh, tức **24 assertion** ghim literal cũ đã được derive (7 logger-contract + 1 dirs + 9 desktop-notify + 7 composer-shape-preview). Cổng này ĐỎ nếu kỹ sư sửa nguồn mà bỏ sót file test — đó chính là lỗi "đổi tên tới mọi nơi trừ log" mà plan cảnh báo.
- **Cổng 3**: `bun run ci:test:smoke` xanh, xác nhận CLI vẫn khởi động và worker spawn được sau khi đổi hằng số.
- **Cổng 4** (thủ công, bắt buộc vì không test tự động nào bắt được): chạy `bun --cwd=packages/natives run build` rồi `PI_CONFIG_DIR=.omp bun packages/coding-agent/src/cli.ts` và xác nhận (a) cấu hình cũ vẫn được đọc từ `~/.omp`, (b) `ls ~/.omp/logs` cho thấy tên file mang tiền tố mới, (c) sau khi đổi tên, `ls ~/.omp/logs` phải cho thấy file log mới có tiền tố mới VÀ vẫn bị prune sau khi tiến trình chết (đây mới là điều phải kiểm — nếu bỏ bước 5a thì file mới không bao giờ bị prune). File `omp.*` cũ sẽ **không** còn khớp regex nên prune-stale bỏ qua, tức là chúng nằm lại vĩnh viễn và không tự thu hồi được — `RotatingFileSink#maxFiles` chỉ cắt trong file chính sink đó tạo ra. Đây là hành vi chấp nhận được (xem bước 5a), nhưng kỹ sư nên dọn `~/.omp/logs/omp.*` thủ công một lần sau khi đổi tên, và KHÔNG được ghi "file cũ tự biến mất" trong mô tả PR.
- Nếu open_questions[0] được giải quyết theo hướng (b) — tách XDG dir name — thì phải chạy thêm: đặt `XDG_DATA_HOME`/`STATE`/`CACHE` trỏ vào thư mục tạm có sẵn thư mục con tên cũ, chạy lại omp, và xác nhận nó VẪN dùng thư mục cũ.

**Cổng có thực sự đỏ được không:** có (`gate_can_fail: true`), nhưng **không phải cổng nào cũng đỏ được ngay**. Cổng 1 đỏ được luôn (chỉ cần `bun run check:ts`). Cổng 2 và cổng 3 **không đỏ được cho tới khi đã cài `ninja` và build được native addon** — cả hai đều gọi `bun test`, mà `bun test` bị chặn bởi môi trường chứ không phải bởi chất lượng code (xem Bước 0). Cổng 2 đỏ khi sửa nguồn mà bỏ sót file test; cổng 3 đỏ khi CLI không khởi động hoặc worker không spawn. Cổng 4 là cổng thủ công nên không tự đỏ — phải người chạy mới phát hiện. Nếu bỏ qua bước build thì W3 có thể "xanh" giả.

### Phụ thuộc

- **Changelog:** W3 là thay đổi user-facing (tên hiển thị của app, tên file log). Theo AGENTS.md, mỗi work item user-facing phải có mục dưới `## [Unreleased]` — thêm vào `packages/utils/CHANGELOG.md` và `packages/tui/CHANGELOG.md` mục `### Changed`: `Renamed the application display name to <tên-mới>; desktop notification title, OSC99 app name/notification id, setup-composer title and rotating log file prefix now derive from a single APP_NAME constant.`. Nếu kế hoạch M5 đã gom changelog về một mục riêng cho cả milestone, ghi rõ "đã gom, không cần viết ở W3" để kỹ sư không phải tự quyết.
- `depends_on`: W1 — rời literal khỏi các vị trí wire để chúng không bị cuốn vào diff này.
- `blocks`: W6 — đổi CONFIG_DIR_NAME; W3 phải đặt APP_NAME về trạng thái nhất quán trước khi W6 lật hằng số cấu hình.

### Cách sai dễ nhất

Sai lầm thứ nhất: coi APP_NAME là hằng số tên hiển thị và thay nó thẳng. Nhưng `dirs.ts:360` là `const appRoot = path.join(value, APP_NAME)` và chỉ dùng XDG khi `fs.existsSync(appRoot)` — nên đổi APP_NAME dời `$XDG_DATA_HOME/omp`, `$XDG_STATE_HOME/omp`, `$XDG_CACHE_HOME/omp`. Đối chiếu: `dirs.ts:983` (secret-placeholder.key dưới `$XDG_STATE_HOME/omp`), `dirs.ts:748` (autoqa.db dưới `$XDG_DATA_HOME/omp`), `dirs.ts:890/894` (cache dưới `$XDG_CACHE_HOME/omp`), `dirs.ts:990` (run/daemons). Người dùng XDG sẽ rơi về `configRoot` (`~/.omp`) vì root mới chưa tồn tại — sessions và secret-placeholder.key biến mất khỏi tầm tay, và secret key bị sinh lại thì giải mã secret cũ hỏng. Đây là cùng loại hazard di chuyển dữ liệu mà W6 sinh ra và có cổng chặn.

Sai lầm thứ hai: chỉ đổi APP_NAME mà quên `logger.ts:256`. Lý do cứng: `getLogPath()` (`dirs.ts:620-622`) ĐÃ dựng tên từ APP_NAME (`return path.join(getLogsDir(), \`${APP_NAME}.${localDay(date)}.${pid}.log\`)`), và `stderr-guard.ts:105` dùng nó làm đích redirect stderr mặc định (`const redirectPath = options?.redirectPath ?? getLogPath();`). Nếu để `filenamePrefix: "omp"`, stderr sẽ bị ghi vào một file mà không ai đọc, còn `report-bundle.ts:208,253` (đóng gói log để báo bug) và `main.ts:285` (dòng gợi ý log cho người dùng) trỏ sang file trống.

### Cần người quyết

- **XDG blast radius.** `dirs.ts:360` là `const appRoot = path.join(value, APP_NAME)` và chỉ dùng XDG khi `fs.existsSync(appRoot)`. Đổi APP_NAME khiến người dùng XDG rơi về configRoot (`~/.omp`) vì root mới chưa tồn tại — sessions và secret-placeholder.key (`dirs.ts:983`) biến mất khỏi tầm tay, và secret key bị sinh lại thì giải mã secret cũ hỏng. Cần người quyết định: (a) W3 chấp nhận rủi ro vì XDG là opt-in và ít người dùng, (b) tách `APP_NAME` (display) + `XDG_DIR_NAME` (đóng băng "omp") để W3 thực sự chỉ đổi tên hiển thị, hay (c) trì hoãn W3 tới khi W6 có migration. **Khuyến nghị (b): rẻ nhất và giữ đúng ý nghĩa tên hàng của W3.**
- **Giá trị trên wire của `getAppName()`.** `getAppName()` không chỉ là nhãn hiển thị: nó là giá trị của header HTTP `x-omp-app` (`packages/ai/src/providers/pi-native-client.ts:127`) và là một thành phần của khoá gộp danh tính usage của auth-broker (`packages/ai/src/auth-broker/remote-store.ts:1314-1315`, khoá = `installId \0 app \0 provider \0 model`). Đổi `APP_NAME` làm đổi cả hai, và **cách khoá đổi thì usage trước và sau lần đổi tên sẽ không gộp được** — tổng usage đã ghi trước đó không tự dồn vào bản ghi mới. Cần người quyết định: (a) chấp nhận, ghi rõ vào mô tả PR rằng số liệu usage sẽ bị tách đôi tại mốc đổi tên; hay (b) đóng băng `getAppName()` về giá trị cũ (nhánh `return value ? value : APP_NAME;` giữ nguyên `"omp"`) và chỉ dùng `APP_NAME` cho mục đích hiển thị — khớp với lý do đặt `depends_on: W1`. Không được tự quyết.
- **Giá trị mới của APP_NAME là gì?** Plan không nêu. Kỹ sư cần chốt trước khi sửa vì nó xuất hiện ở 6 file và 4 file test.
- **Có kéo `composer-shape-preview.ts:45` (PREVIEW_TITLE) vào W3 không?** Plan bỏ sót; đã đưa vào scope vì cùng package tui, cùng tính chất tên hiển thị, và test của nó đang ghim "omp".
- **Có kéo `relay/server.ts:55` (DEFAULT_GROUP title của tab group trình duyệt) vào W3 không?** Để NGOÀI scope vì đó là nhãn chrome trình duyệt, không phải tên ứng dụng — nhưng nó sẽ thành literal trùng lặp thứ 10.

### Đính chính so với plan

| Claim của plan | Verdict | Correction |
| --- | --- | --- |
| Tiêu chí nghiệm thu: "cấu hình vẫn phân giải dưới root `.omp` cũ" (config vẫn resolve về root .omp cũ). | SAI cho người dùng XDG — đây là lỗi nghiêm trọng nhất của spec. | APP_NAME cũng là đoạn segment cuối của XDG app root (`dirs.ts:360`: `const appRoot = path.join(value, APP_NAME)`), nên đổi APP_NAME dời `$XDG_DATA_HOME/omp`, `$XDG_STATE_HOME/omp`, `$XDG_CACHE_HOME/omp`. Cùng loại hazard di chuyển dữ liệu mà W6 sinh ra và có cổng chặn. Phải chốt open_questions[0] TRƯỚC khi code; nếu chọn (b) thì W3 mới thực sự chỉ đổi tên hiển thị. Bằng chứng: `sed -n '360,372p' packages/utils/src/dirs.ts`; xác nhận qua `dirs.ts:983`, `dirs.ts:748`, `dirs.ts:890/894`, `dirs.ts:990`. `grep -n APP_NAME packages/utils/src/dirs.ts` trả về đúng **6** dòng: 21, 360, 621, 961, **1078**, 1084 (1078 là doc comment nhắc `OMP_APP_NAME`, không phải chỗ dùng). |
| "Test cần viết" — test bảo vệ tên file log, thực hiện bằng `setTransports({file: <tmp>})` rồi đọc `readdirSync`. | Đã tồn tại sẵn và tốt hơn hẳn đề xuất của plan — không cần viết mới. | `packages/utils/test/logger-contract.test.ts` đã ghim đúng hợp đồng này bằng child-process spawn (tách singleton, an toàn full-suite theo AGENTS.md). Việc của W3 là CẬP NHẬT **7 chỗ** trong file đó theo APP_NAME, không phải viết test mới. Cách `setTransports()` của plan tệ hơn: nó mutate singleton toàn cục nên phải thêm `afterEach` khôi phục, đúng thứ AGENTS.md cảnh báo. Bằng chứng: `logger-contract.test.ts:77` lọc bằng regex `/^omp\.\d{4}-\d{2}-\d{2}\.\d+\.log(?:\.\d+)?$/`; `:135`, `:296`, `:333` đọc `.omp.${result.pid}-audit.json`. Harness `runScenario()` (`:38-73`) spawn `process.execPath --preload <preload> <probe>` với HOME/USERPROFILE trỏ vào mkdtemp và `PI_CONFIG_DIR: ".omp"`. |
| Danh sách test hiện có chỉ gồm `packages/tui/test/desktop-notify.test.ts` và `packages/tui/test/terminal-capabilities.test.ts`; lệnh nghiệm thu chỉ chạy 2 file đó. | Thiếu 2 file test vỡ, và lệnh nghiệm thu không chạy package utils nên không thể bắt được lỗi chính của W3. | Bổ sung `packages/utils/test/dirs.test.ts` (ghim basename log) và `packages/tui/test/composer-shape-preview.test.ts` (tương tự), và mở rộng lệnh verify sang `cd packages/utils && bun test test/logger-contract.test.ts test/dirs.test.ts test/stderr-guard.test.ts`. Bằng chứng: `packages/utils/test/dirs.test.ts:82` `expect(path.basename(getLogPath(date, 123))).toBe("omp.2026-05-31.123.log")` — 4 chỗ literal khác. `packages/tui/test/composer-shape-preview.test.ts:45,49,54,59,65,70,76` đều `expect(...).toContain("omp")`. `packages/tui/test/desktop-notify.test.ts` có 9 literal "omp" tại dòng 114, 117, 132, 144, 147, 153, 163, 166, 202. Lệnh trong plan không có `cd packages/utils`. |
| Danh sách 7 literal trùng lặp là trọn vẹn (5 chuỗi trong 3 file + 2 tên file log). | Thiếu 2 literal nguồn. | Thêm `packages/tui/src/overlays/composer-shape-preview.ts:45` `const PREVIEW_TITLE = "omp"` (tiêu đề dự phòng hiển thị trong setup composer — cùng package tui với 2 trong 5 literal đã liệt kê) và `packages/utils/src/dirs.ts:956` `getCrashLogPath` ghim `"omp-crash.log"` cứng, lệch với người anh em `getDebugLogPath` (`:960`) vốn đã dùng `` `${APP_NAME}-debug.log` ``. Bằng chứng: `sed -n '44,46p' packages/tui/src/overlays/composer-shape-preview.ts` → `/** Stand-in session title shown while the previewed session is unnamed. */ const PREVIEW_TITLE = "omp";`, dùng ở `:62, :64, :66, :111` và render bởi `setup/scenes/composer.ts:86`. `sed -n '955,961p' packages/utils/src/dirs.ts`. Sweep `git grep -nE '"omp[-._][^"]*"' -- 'packages/**/src/**'`. |
| Plan nêu `filenamePrefix` phải đổi nhưng không giải thích vì sao. | Đúng kết luận, thiếu lý do — bổ sung để kỹ sư không tối ưu hoá bằng cách bỏ qua nó. | Lý do cứng: `getLogPath()` (`dirs.ts:620-622`) ĐÃ dựng tên từ APP_NAME, và `stderr-guard.ts:105` dùng nó làm đích redirect stderr mặc định. Nếu chỉ đổi APP_NAME mà để `filenamePrefix:"omp"`, stderr sẽ bị ghi vào một file mà không ai đọc, còn `report-bundle.ts:208,253` (đóng gói log để báo bug) và `main.ts:285` (dòng gợi ý log cho người dùng) trỏ sang file trống. Bằng chứng: `sed -n '619,622p' packages/utils/src/dirs.ts` → `return path.join(getLogsDir(), \`${APP_NAME}.${localDay(date)}.${pid}.log\`);`. `packages/utils/src/stderr-guard.ts:105` `const redirectPath = options?.redirectPath ?? getLogPath();`. |
| Yêu cầu: không được dùng `ReturnType<>`, không `any`, không inline import, ES `#private`, `logger` thay `console.*`, `bun check` chứ không phải `tsc`. | Đã kiểm tra — không có xung đột nào trong diff này. | Giữ nguyên. Lưu ý thêm một quy tắc ít ai nhớ: sau khi đổi tên, doc comment tại `dirs.ts:609` ("log files are named `omp.<day>.<pid>.log`") thành sai — nên sửa luôn trong cùng commit (comment, không phải test). Bằng chứng: `sed -n '607,614p' packages/utils/src/dirs.ts`. Ngoài ra import surface đã có sẵn ở mọi nơi: `packages/utils/src/index.ts:5` `export * from "./dirs"`; `logger.ts:17` đã import `{ getLogsDir }` từ `"./dirs"`; `packages/tui/src/setup/wizard-overlay.ts:8` và `packages/coding-agent/src/cli/args.ts:5` đã dùng đúng pattern import APP_NAME. Không có chu trình import vì `dirs.ts` không import logger (`grep 'from "./logger"' packages/utils/src/dirs.ts` → rỗng). |

## Cần người xác nhận

- Mâu thuẫn nhỏ giữa metadata của đặc tả và nơi lưu: trường `written_to` trong `W3.spec.json` trỏ tới `.lavish-wip/m5-specs/W3.spec.json`, trong khi bản thân file đặc tả nằm ở `.lavish-wip/m5-index/specs/W3.spec.json` và mục Markdown này được ghi vào `.lavish-wip/m5-md/sections/W3.md`. Ba đường dẫn khác nhau cho cùng một đơn vị tài liệu — cần chốt một đường dẫn chuẩn trước khi lắp ghép.
- Nội dung của W3 không mâu thuẫn với chính nó; các điểm còn mở đã nêu đầy đủ ở mục **Cần người quyết** và không được tự quyết.


---


## W4. Tách phân giải thư mục cấu hình thành đọc và ghi (sóng 2)

**Sóng:** Wave 2 | **Effort:** M | **Rủi ro chính:** Một lỗi hỏng không sinh ra lỗi, không cảnh báo, và không test nào đỏ vào đúng lúc nó được đưa lên.

Tóm tắt một dòng: làm cho cả `~/.omp` và `~/.ultraworkers` đều đọc được bằng cách phân giải config root thành một danh sách ứng viên có thứ tự, trong khi mọi thao tác ghi mới và đường ghi của install-id chỉ đi vào root mới; đồng thời miễn trừ cho thư mục `.omp` ở cấp project và cho hai bộ đọc biến môi trường trong Rust.

Hiệu ứng người dùng thấy: một người dùng nâng cấp giữa chừng không bao giờ mất cài đặt, phiên hay danh tính install của mình. Một bản cài chỉ có root cũ vẫn đọc root cũ; một bản cài có cả hai thì ưu tiên root mới; một bản cài không có root nào thì rơi về mặc định; và mọi thứ được ghi mới đều nằm ở root mới. Đặt `ULTRAWORKERS_CONFIG_DIR` thắng `PI_CONFIG_DIR`, và đặt nhầm biến trong hai biến này không còn âm thầm chỉ người dùng tới một thư mục rỗng. Hai thứ cố ý giữ nguyên để việc đổi tên không trở thành viết lại lịch sử: một thư mục `.omp` ở cấp project đã được commit vào git vẫn được đọc, và thư mục crash-log native cùng đường khôi phục OAuth trên macOS vẫn tôn trọng `PI_CONFIG_DIR` y hệt như trước.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts` | sửa | Thêm một hằng số config-dir legacy và một danh sách ứng viên có thứ tự; thêm `getConfigDirCandidates()` (thuần, không I/O), `getConfigReadRootName()` (candidate tồn tại đầu tiên rồi cache), và `getConfigWriteRootName()` (luôn trả tên mới). Nối lại `getConfigDirName()` vào chuỗi ưu tiên override, `getBaseConfigRoot()` vào read root, và `getInstallId()` thành đọc-trước-ghi-mới. Giới thiệu một hằng số ghim cho thư mục cấp project. Thêm seam reset cache và gọi nó từ `refreshDirsFromEnv()`, `setAgentDir()` và `setProfile()` để các đường rebuild resolver sẵn có không để lại root cũ. Mở rộng phân giải XDG `appRoot` để phủ cả cách viết mới lẫn legacy dưới cả hai nhóm XDG. | có — 1157 dòng ở HEAD `84cbac9`. Các neo đã kiểm chứng: `CONFIG_DIR_NAME:27`, `MAIN_CONFIG_FILENAMES:30`, `getBaseConfigRoot:114-116`, `getConfigDirName:297-298`, `getConfigAgentDirName:302-305`, DirResolver ctor:331+, singleton module-load `let dirs = new DirResolver({...})`:449, `refreshDirsFromEnv:485`, `setAgentDir:502`, `setProfile:541`, `getProjectAgentDir:589-591`, phép join XDG appRoot:360, comment XDG-flattens:384, `INSTALL_ID_FILE:1076`, `getAppName:1083-1086`, `getInstallId:1104-1152`, `__resetInstallIdCacheForTests:1155`. Dòng 341-352 giữ comment orphan-profile (khối thật thực sự bắt đầu ở 340 và từ "orphaning" nằm ở 348). |
| `packages/coding-agent/src/discovery/helpers.ts` | sửa | Chuyển bốn tra cứu registry tương đối project khỏi accessor config-dir phạm vi home sang hằng số ghim cho project, để một project đã có `.omp` commit vẫn phân giải được `installed_plugins.json` dù root nào ở home thắng. `SOURCE_PATHS.native.userBase/userAgent` (dòng 42/45) giữ nguyên trên accessor home. | có — LỖI THẬT MÀ PLAN BỎ SÓT. `helpers.ts:1032`, `:1034`, `:1049` và `:1079` đều gọi `getConfigDirName()` với cwd PROJECT làm parent — `path.join(dir, getConfigDirName(), 'plugins', 'installed_plugins.json')` bên trong `resolveActiveProjectRegistryPath` và `resolveOrDefaultProjectRegistryPath`. W6a của plan chỉ nêu `getProjectAgentDir()` (dirs.ts:589-591) làm mối nguy của project-root và không hề nhắc tới bốn chỗ này, dù chúng là cùng mối nguy đi qua một hàm khác. W4 là nơi tạo ra sự phân kỳ, nên W4 là nơi thuộc về bản sửa. `helpers.ts:47` vốn đã làm đúng — `SOURCE_PATHS.native.projectDir` là `CONFIG_DIR_NAME` trần — nên chỉ bốn chỗ gọi cần đổi. |
| `crates/pi-natives/src/crash_handler.rs` | sửa | Dạy `logs_dir()` tôn trọng `ULTRAWORKERS_CONFIG_DIR` trước `PI_CONFIG_DIR`, giữ cho biến legacy tiếp tục chạy và giữ nguyên bộ lọc giá trị rỗng hiện có. | có — KHOẢNG TRỐNG THẬT MÀ PLAN BỎ SÓT. `crash_handler.rs:269` đọc trực tiếp `std::env::var_os("PI_CONFIG_DIR")` và `:286`/`:344` rơi về `DEFAULT_CONFIG_DIR = ".omp"` cục bộ (`:49`). Nếu W4 chỉ thêm alias mới trong TypeScript, thư mục crash-log native sẽ âm thầm phớt lờ nó trên mọi nền tảng — đúng kiểu hỏng âm thầm chia theo nền tảng mà plan cảnh báo cho XDG, nhưng là cho env alias và không có test nào trong repo bắt được. Đây là bản sửa parity nằm trong W4, không phải việc làm sau: N16 giữ họ `PI_*` vĩnh viễn, và alias mới vô dụng nếu nửa runtime không nhìn thấy nó. |
| `crates/pi-natives/src/oauth_callback/darwin.rs` | sửa | Dạy `legacy_recovery_path()` tôn trọng `ULTRAWORKERS_CONFIG_DIR` trước `PI_CONFIG_DIR`, và giữ nguyên fallback literal `.omp` cùng thao tác trim giá trị rỗng. | có — KHOẢNG TRỐNG THẬT MÀ PLAN BỎ SÓT. `darwin.rs:441` đọc `context.env.get("PI_CONFIG_DIR")` và `:446` hardcode `.omp` làm fallback. Đường này chỉ chạy trên macOS, nên sự phân kỳ là vô hình với bất kỳ lần chạy CI Linux nào — đúng kiểm hồng mà plan nêu tường minh là thứ một lần chạy test trên một nền tảng sẽ không bắt. |
| `packages/utils/test/config-dir-dual-root.test.ts` | tạo | File test mới. Hợp đồng 1: thứ tự phân giải — chỉ có root cũ thì phân giải dưới nó; cả hai root cùng tồn tại thì ưu tiên root mới; không có root nào thì rơi về mặc định. Cũng phủ ứng viên XDG hai cách viết (appRoot của XDG không có dấu chấm tiền, root ở home thì có). | có — file mới. Giữ sạch mọi import nào kéo theo `pi_natives`; đã xác minh rằng file anh em `install-id.test.ts`, vốn import cùng entrypoint `@oh-my-pi/pi-utils/dirs`, chạy xanh trên máy này (5 pass / 0 fail). |
| `packages/utils/test/install-id-legacy-read.test.ts` | tạo | File test mới. Hợp đồng 2: cắm một UUID đã biết vào đường install-id legacy, phân giải với root mới rỗng, và khẳng định chính UUID đó quay lại đồng thời root mới nhận được file. Đây là khẳng định chuyển đổi, không phải khẳng định tồn tại. | có — file mới. Cố ý tách khỏi `install-id.test.ts` sẵn có, vốn ghim hành vi single-root hiện tại và phải tiếp tục xanh mà không đổi sau W4. |
| `packages/utils/test/config-dir-write-root.test.ts` | tạo | File test mới. Hợp đồng 3: khi cả hai root cùng tồn tại, lượt đọc rơi vào root cũ còn lượt ghi rơi vào root mới. Hợp đồng 4: ưu tiên override — `PI_CONFIG_DIR` trỏ root A và `ULTRAWORKERS_CONFIG_DIR` trỏ root B thì phân giải ra B; bỏ biến mới thì ra A; bỏ cả hai thì rơi xuống danh sách ứng viên. | có — file mới. Hợp đồng 4 có test riêng thay vì suy ra từ hợp đồng 1, vì đặt nhầm hai biến này sẽ chỉ người dùng tới một thư mục rỗng mà không in ra gì — một lỗi âm thầm, và đó là lý do toàn bộ sự tồn tại của test. |
| `docs/environment-variables.md` | sửa | Thêm `ULTRAWORKERS_CONFIG_DIR` như một hàng mới, ghi rõ thứ tự ưu tiên mới-thắng-legacy, và cập nhật hàng `PI_CONFIG_DIR` hiện có để nói rõ đó là alias vĩnh viễn chứ không phải một cách viết bị loại bỏ. | có — file này đã có hàng `PI_CONFIG_DIR` ở dòng 523 và một tham chiếu chéo về install-id ở dòng 18 của `docs/install-id.md`. Ghi chú mức sóng trong plan ở `:13677` nói các tên env mới phải được tài liệu hoá, nên việc này nằm trong phạm vi W4 chứ không trì hoãn. KHÔNG thêm mục changelog — plan nói changelog chỉ được cập nhật khi một work item nói rõ như vậy, và W4 không nói. |

### Các bước

1. Trong `packages/utils/src/dirs.ts`, thêm một hằng số config-dir legacy ngay cạnh `CONFIG_DIR_NAME` (dòng 27) chứa cách viết cũ `".omp"`, và một hằng số danh sách ứng viên có thứ tự với tên mới đứng trước, tên legacy đứng sau. Thứ tự chính là hợp đồng: đích ghi canonical trước, fallback tương thích legacy sau — đúng hình dạng mà `MAIN_CONFIG_FILENAMES` ở dòng 30 đã mô hình hoá. Đừng đổi tên hay tái sử dụng `CONFIG_DIR_NAME` ở đây — W6 sở hữu việc lật nó, và lật ngay trong W4 chính là sai lầm làm W6 không còn gì để review. Neo: `packages/utils/src/dirs.ts:27` (`CONFIG_DIR_NAME`) và `:30` (`MAIN_CONFIG_FILENAMES`, khuôn thứ tự).
2. Thêm `getConfigDirCandidates(): string[]` trả về danh sách ứng viên có thứ tự, không chạm filesystem và không cache. Nó phải là nguồn duy nhất mà cả phía đọc lẫn phía ghi cùng rút ra, để hai bên không bao giờ trôi lệch nhau. Neo: `packages/utils/src/dirs.ts`, ngay phía trên `getConfigDirName` ở `:297`.
3. Thêm `getConfigReadRootName()`: phân giải ứng viên đầu tiên tồn tại trên đĩa dưới thư mục home và cache người thắng cho suốt vòng đời tiến trình; khi không ứng viên nào tồn tại thì trả về write root, để một bản cài mới vẫn nhận một mặc định nhất quán. Thêm seam `__resetConfigDirCacheForTests()` theo đúng cách đặt tên đã dùng cho `__resetInstallIdCacheForTests` (dirs.ts:1155), `__resetProfileSnapshotForTests` và `__resetDirsFromEnvForTests`. Neo: `packages/utils/src/dirs.ts`, cạnh `getConfigDirName` ở `:297`.
4. Thêm `getConfigWriteRootName()`: trả về tên mới vô điều kiện. Nó không được hỏi filesystem, không được hỏi cache, và không bao giờ được trả về tên legacy. Mọi đường ghi sẵn có đều đi qua nó. Neo: `packages/utils/src/dirs.ts`, cạnh `getConfigReadRootName` thêm ở bước 3.
5. Nối lại `getConfigDirName()` (hiện là `return process.env.PI_CONFIG_DIR || CONFIG_DIR_NAME;` ở `:298`) thành chuỗi ưu tiên override tường minh: `ULTRAWORKERS_CONFIG_DIR` thắng, rồi `PI_CONFIG_DIR`, rồi `getConfigReadRootName()`, rồi `getConfigWriteRootName()` làm mặc định. Giữ hành vi rơi xuống write root sẵn có, để một bản cài mới không có thư mục nào vẫn phân giải ra tên mới. Neo: `packages/utils/src/dirs.ts:297-298`.
6. Gọi `__resetConfigDirCacheForTests()` từ `refreshDirsFromEnv()`, `setAgentDir()` và `setProfile()`. Đây là bắt buộc, không phải tuỳ chọn: ba hàm đó đã tồn tại để dựng lại resolver sau khi môi trường thay đổi, và một cache config-root mà chúng không xoá là một cache sống dai hơn chính cơ chế vô hiệu hoá mà module được thiết kế quanh. Hậu quả đã kiểm chứng nếu bỏ qua — 8 file test gán `process.env.PI_CONFIG_DIR` lúc chạy và sẽ đọc một root bị đóng băng: `packages/coding-agent/test/discovery/pi-config-dir.test.ts`, `packages/coding-agent/test/profile-cli.test.ts`, `packages/coding-agent/test/sdk-session-isolation.test.ts`, `packages/stats/test/helpers/temp-agent.ts`, `packages/tui/test/keybindings-migration.test.ts`, `packages/utils/test/dirs-python-gateway.test.ts`, `packages/utils/test/install-id.test.ts`, `packages/utils/test/profiles.test.ts`. Neo: `packages/utils/src/dirs.ts:485` (`refreshDirsFromEnv`), `:502` (`setAgentDir`), `:541` (`setProfile`).
7. Tách `getBaseConfigRoot()` (dirs.ts:114-116) thành một biến thể đọc và một biến thể ghi. Tên `getBaseConfigRoot()` hiện có là mang tính gánh — `packages/coding-agent/src/collab/registry.ts:167` và `:29` import nó, và `getProfileConfigRoot` ở `:119` suy ra từ nó — nên giữ tên export đang có trỏ tới READ root và thêm một anh em write-root tường minh. Đừng lặng lẽ chuyển export sẵn có sang write root. Neo: `packages/utils/src/dirs.ts:114-116`, được dùng bởi `packages/coding-agent/src/collab/registry.ts:167` và `packages/utils/src/dirs.ts:1008`, `:1106`.
8. Làm lại `getInstallId()` (dirs.ts:1104-1152) để đọc từ các ứng viên có thứ tự và ghi vào write root. Thứ tự đọc: install-id của root mới, rồi install-id của root legacy. Nếu tìm thấy một UUID hợp lệ ở đường legacy, trả đúng UUID đó và lưu nó xuống root mới để tiến trình sau đọc tại chỗ. Giữ nguyên mọi thứ cài đặt hiện tại đã làm đúng: cổng hợp lệ `UUID_RE`, cuộc đua tạo bằng `O_CREAT|O_EXCL` với bên thua đọc lại giá trị của bên thắng, đường unlink-trước-`O_EXCL` cho một file không parse được, và fallback trong bộ nhớ giữ cho id ổn định suốt tiến trình khi ghi thất bại. Một UUID mới không bao giờ được sinh ra khi vẫn còn một id legacy đọc được. Neo: `packages/utils/src/dirs.ts:1076` (`INSTALL_ID_FILE`), `:1104-1152` (thân `getInstallId`), `:1155` (`__resetInstallIdCacheForTests`).
9. Mở rộng phân giải XDG `appRoot` ở dòng 360 để thử cách viết mới rồi cách viết legacy dưới cả ba `XDG_DATA_HOME`, `XDG_STATE_HOME` và `XDG_CACHE_HOME`. Hai bố cục dùng CÁCH VIẾT KHÁC NHAU và đây là chỗ rất dễ làm sai: root ở home có dấu chấm tiền (`~/.omp`) vì nó đến từ `CONFIG_DIR_NAME`, còn appRoot của XDG thì trần (`$XDG_DATA_HOME/omp`) vì dòng 360 join `APP_NAME`. Vì vậy tập ứng viên là `['ultraworkers','omp']` cho XDG và `['.ultraworkers','.omp']` cho home — đừng dùng chung một danh sách cho cả hai. Giữ nguyên phần ghim named-profile (nhánh `profilePath` và comment orphan-profile ở `:340-355`) đúng như nó đang là; logic đó cố ý hẹp và W4 không được mở rộng nó. Neo: `packages/utils/src/dirs.ts:358-372` (`resolveIf`), `:360` (`const appRoot = path.join(value, APP_NAME)`), `:384` (comment XDG làm phẳng tiền tố `agent/`).
10. Giới thiệu một hằng số ghim cho tên thư mục cấp project, cố ý cố định ở giá trị legacy `".omp"` cho milestone này, và làm `getProjectAgentDir()` (dirs.ts:589-591) trả về nó. Đây là lựa chọn W6a (b) mà plan khuyến nghị, đặt trước vì chính W4 làm tên phía home phân kỳ. Ghi lý do vào `do_not_rename`: một thư mục `.omp` ở cấp project thường đã được commit vào lịch sử git của người dùng, nên đổi tên nó là viết lại repository của họ chứ không phải viết lại sản phẩm. Neo: `packages/utils/src/dirs.ts:589-591`, hiện là `return path.join(cwd, CONFIG_DIR_NAME);`.
11. Trong `packages/coding-agent/src/discovery/helpers.ts`, thay `getConfigDirName()` bằng hằng số ghim cho project tại bốn chỗ tương đối project: `:1032` và `:1034` (stat walk-up và return của `resolveActiveProjectRegistryPath`), `:1049` (return của fallback neo theo `.git`), và `:1079` (fallback của `resolveOrDefaultProjectRegistryPath`). Để `SOURCE_PATHS.native.userBase` (`:42`) và `userAgent` (`:45`) trên accessor home — chúng đúng là phạm vi home — và để nguyên `SOURCE_PATHS.native.projectDir` (`:47`), vì nó đã đọc thẳng hằng số. Neo: `packages/coding-agent/src/discovery/helpers.ts:1032`, `:1034`, `:1049`, `:1079` (tương đối project) so với `:42`, `:45` (tương đối home) và `:47` (đã đúng sẵn).
12. Trong `crates/pi-natives/src/crash_handler.rs`, đọc `ULTRAWORKERS_CONFIG_DIR` trước rồi rơi về `PI_CONFIG_DIR`, giữ nguyên chốt chặn `.filter(|s| !s.is_empty())` và fallback `DEFAULT_CONFIG_DIR = ".omp"` ở `:49`/`:286`/`:344`. Giữ cho khối comment parity với JS ở `:48` và `:293-296` còn đúng. Neo: `crates/pi-natives/src/crash_handler.rs:269` (`var_os("PI_CONFIG_DIR")`), `:286` và `:344` (các fallback `DEFAULT_CONFIG_DIR`), `:49` (hằng số).
13. Trong `crates/pi-natives/src/oauth_callback/darwin.rs`, áp dụng cùng thứ tự ưu tiên mới-thắng-legacy cho `legacy_recovery_path()`, giữ `.trim()` và bộ lọc giá trị rỗng cùng fallback literal `".omp"` ở `:446`. Neo: `crates/pi-natives/src/oauth_callback/darwin.rs:439-450`.
14. Viết ba file test. Giữ cả ba sạch mọi import nào kéo theo `pi_natives` — đã kiểm chứng trên máy này rằng một file anh em import cùng entrypoint `@oh-my-pi/pi-utils/dirs` (`packages/utils/test/install-id.test.ts`) báo 5 pass / 0 fail. Dùng các root tạm tường minh được truyền vào đường phân giải, hoặc `spyOn` từng test với `vi.restoreAllMocks()` trong `afterEach`; không bao giờ để một đột biến `process.env` sống lâu, theo AGENTS.md. Khẳng định kết quả quan sát được — đường dẫn đã phân giải, UUID trả về, byte trên đĩa — không bao giờ đọc lại một chuỗi literal từ file cài đặt. Neo: `packages/utils/test/config-dir-dual-root.test.ts`, `install-id-legacy-read.test.ts`, `config-dir-write-root.test.ts` (cả ba đều mới); lấy làm khuôn từ `packages/utils/test/install-id.test.ts` sẵn có.
15. Tài liệu hoá `ULTRAWORKERS_CONFIG_DIR` trong `docs/environment-variables.md` kèm thứ tự ưu tiên của nó so với `PI_CONFIG_DIR`, và sửa hàng `PI_CONFIG_DIR` hiện có (dòng 523) để nói đó là alias vĩnh viễn. Rồi dừng — KHÔNG thêm mục changelog. Plan nói changelog chỉ được cập nhật khi một work item nói rõ như vậy, và W4 không nói. Neo: `docs/environment-variables.md:523` (hàng `PI_CONFIG_DIR` hiện có); tham chiếu chéo ở `docs/install-id.md:18`.

### Hình dạng code

Ba hàm export mới trong `packages/utils/src/dirs.ts`, tất cả đọc từ cùng một danh sách ứng viên có thứ tự để phía đọc và phía ghi không bao giờ trôi lệch:

```typescript
  export function getConfigDirCandidates(): string[]      // ordered [new, legacy], no I/O, no cache
  export function getConfigReadRootName(): string         // first candidate that exists under $HOME; cached; falls through to write root
  export function getConfigWriteRootName(): string        // always the new name; no fs, no cache, never a legacy name
  export function __resetConfigDirCacheForTests(): void   // reset seam, named after __resetInstallIdCacheForTests at :1155
```

Hai cách viết, KHÔNG phải một danh sách — root ở home có dấu chấm tiền, appRoot của XDG thì không:

```typescript
  home:  ['.ultraworkers', '.omp']        // from CONFIG_DIR_NAME
  xdg:   ['ultraworkers',  'omp']         // from path.join(value, APP_NAME) at :360
```

`getConfigDirName()` (hiện một dòng ở `:298`) trở thành chuỗi ưu tiên tường minh:

```text
  ULTRAWORKERS_CONFIG_DIR  >  PI_CONFIG_DIR  >  getConfigReadRootName()  >  getConfigWriteRootName()
```

`getBaseConfigRoot()` (`:114`) giữ tên và ngữ nghĩa READ — nó được import bởi `packages/coding-agent/src/collab/registry.ts:167` — và nhận thêm một anh em write-root tường minh. `getInstallId()` (`:1104`) đọc mới-rồi-legacy và chỉ ghi vào write root, giữ nguyên kiểm tra `UUID_RE`, cuộc đua tạo `O_CREAT|O_EXCL`, đường unlink-trước-tạo lại và fallback trong bộ nhớ.

Một hằng số ghim cho project (cố định ở `.omp` cho milestone này, theo lựa chọn (b) của W6a) đứng sau cả `getProjectAgentDir()` (dirs.ts:589-591) lẫn bốn tra cứu registry tương đối project trong `packages/coding-agent/src/discovery/helpers.ts` (`:1032`, `:1034`, `:1049`, `:1079`).

Cả hai bộ đọc env trong Rust đều nhận cùng thứ tự ưu tiên mới-thắng-legacy: `crates/pi-natives/src/crash_handler.rs:269` và `crates/pi-natives/src/oauth_callback/darwin.rs:441`.

Các singleton lúc nạp module buộc phải gọi reset cache: `refreshDirsFromEnv()` (`:485`), `setAgentDir()` (`:502`), `setProfile()` (`:541`). Cụ thể `let dirs = new DirResolver({...})` ở `:449` là một điểm đóng băng thứ tư, xảy ra lúc import.

### Hợp đồng test

Bốn hợp đồng, mỗi cái đặt tên cho một lỗi mà nếu không có thì người tiêu dùng sẽ thấy.

**(1) THỨ TỰ PHÂN GIẢI — `packages/utils/test/config-dir-dual-root.test.ts`.** Chỉ root legacy tồn tại: các đường cấu hình và session phân giải nằm bên dưới nó. Cả hai root tồn tại: root mới thắng. Không root nào tồn tại: dùng mặc định (tên mới). Đỏ nếu danh sách ứng viên bị đảo, nếu ứng viên legacy bị rơi, hoặc nếu mặc định khi không có root lại âm thầm rơi về tên legacy. Một ca riêng ghim tập ứng viên XDG hai cách viết, vì một danh sách dùng chung giữa root home có dấu chấm tiền và appRoot XDG trần là sai đúng với một trong hai.

**(2) LIÊN TỤC INSTALL-ID — `packages/utils/test/install-id-legacy-read.test.ts`.** Cắm một UUID đã biết vào đường install-id legacy, phân giải với root mới có mặt nhưng rỗng, và khẳng định chính UUID đó được trả về đồng thời root mới giờ đã chứa nó. Đây là khẳng định chuyển đổi, không phải khẳng định tồn tại: hồi quy mà nó bắt là sinh một UUID mới, mà ở mọi call site đều không phân biệt được với UUID đúng. Triệu chứng duy nhất lộ ra bên ngoài khi làm sai là một bảng chi phí lặng lẽ khởi động lại — nên test này là toàn bộ hàng phòng thủ.

**(3) TÁCH READ/WRITE ROOT — `packages/utils/test/config-dir-write-root.test.ts`.** Khi cả hai root tồn tại, lượt đọc rơi vào root legacy còn lượt ghi rơi vào root mới. Đỏ nếu phía đọc bị dùng lại cho phía ghi — đúng điều kiện làm tiêu chí nghiệm thu của W6 trở nên bất khả thi.

**(4) ƯU TIÊN OVERRIDE — `packages/utils/test/config-dir-write-root.test.ts`, là test riêng, không suy ra từ (1).** `PI_CONFIG_DIR` trỏ root A và `ULTRAWORKERS_CONFIG_DIR` trỏ root B thì phân giải ra B; bỏ biến mới thì ra A; bỏ cả hai thì rơi xuống danh sách ứng viên ở (1). Nếu thiếu thì lỗi âm thầm: đặt nhầm hai biến này sẽ chỉ cấu hình của người dùng tới một thư mục rỗng mà không in ra gì ở bất kỳ đâu.

Quy tắc áp dụng cho cả bốn: không dùng `mock.module()` (dùng `spyOn` trên object module đã import, với `vi.restoreAllMocks()` trong `afterEach`); không đột biến `process.env` sống lâu khi đã có tham số root tường minh hoặc một spy từng test; không đọc một file cài đặt rồi khẳng định trên văn bản của nó; khẳng định đường dẫn đã phân giải, UUID trả về và byte trên đĩa thay vì literal được vang lại. `packages/utils/test/install-id.test.ts` hiện có phải tiếp tục PASS KHÔNG ĐỔI — nó ghim hành vi single-root hiện tại, nên nó là lưới an toàn hồi quy cho việc nối lại resolver.

### Xác minh

Mọi con số dưới đây do một lệnh thật trên máy này ở HEAD `84cbac9` (nhánh `milestone-1`) sinh ra, không phải đọc từ plan.

CÁC NEO ĐÃ XÁC NHẬN CHÍNH XÁC — `packages/utils/src/dirs.ts` dài 1157 dòng: `CONFIG_DIR_NAME:27`, `MAIN_CONFIG_FILENAMES:30`, `getBaseConfigRoot:114-116`, `getConfigDirName:297-298`, `getConfigAgentDirName:302-305`, XDG appRoot join:360, comment XDG-flattens:384, `getProjectAgentDir:589-591`, `INSTALL_ID_FILE:1076`, `getAppName:1083-1086`. Trôi nhỏ: plan đặt thân `getInstallId` "ngay dưới :1090" — thực tế nó bắt đầu ở `:1104` (doc comment mở ở `:1092`).

TỒN TẠI THEO CÁCH MỞ FILE, KHÔNG PHẢI KIỂM PARITY BẰNG GREP — hai file Rust đọc `PI_CONFIG_DIR` đã được xác nhận bằng cách mở chúng: `crates/pi-natives/src/crash_handler.rs:269` (`std::env::var_os("PI_CONFIG_DIR")`, fallback `DEFAULT_CONFIG_DIR = ".omp"` ở `:49`) và `crates/pi-natives/src/oauth_callback/darwin.rs:441` (`.get("PI_CONFIG_DIR")`, fallback hardcode `".omp"` ở `:446`). Cái `darwin.rs` chỉ chạy trên macOS, nên không lần chạy CI Linux nào quan sát được sự phân kỳ ở đó.

KIỂM KÊ `PI_CONFIG_DIR` — plan nói "68 lần xuất hiện / 25 file (16 file .ts)". Đo trên cây hiện tại với tài liệu plan bị loại ra, đó là 69 lần xuất hiện / 26 file, trong đó 17 là .ts, 7 là .md và 2 là .rs. Tái lập bằng:

```bash
git grep -o 'PI_CONFIG_DIR' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l   # 69
git grep -l 'PI_CONFIG_DIR' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l   # 26
```

Các con số của plan được đo ở commit `5873776`, commit không có trong lịch sử repository này, nên chênh lệch một đơn vị là do cũ chứ không phải sai phương pháp — nhưng số đã sửa mới là số dùng được, và các file Rust phải nằm trong bán kính ảnh hưởng của alias.

PHÂN GIẢI SỐNG-ĐỐI-LẬP-ĐÓNG BĂNG, ĐÃ KIỂM CHỨNG BẰNG THỰC THI — một probe đặt `process.env.PI_CONFIG_DIR = '.probe-a'` SAU khi import rồi đọc các accessor trả về: `getConfigDirName()` = `'.probe-a'` và `getBaseConfigRoot()` = `/Users/<user>/.probe-a`, nhưng `getConfigRootDir()` = `/Users/<user>/.omp`. Vậy module đã chứa cả hai hành vi: `getBaseConfigRoot()` đọc môi trường sống, còn `getConfigRootDir()` bị đóng băng bên trong singleton `DirResolver` dựng lúc nạp module ở dirs.ts:449. Đây là sự thật quan trọng nhất cho bước 6 — việc tách đọc/ghi phải được đặt lên một accessor vốn đã đóng băng một nửa, và mọi cache thêm vào tên config-root phải được xoá bởi cả bốn đường rebuild, nếu không tám file test gán `process.env.PI_CONFIG_DIR` lúc chạy sẽ đọc một root cũ.

COMMENT ORPHAN-PROFILE — khoảng thật là `:340-355` với từ "orphaning" ở `:348`; con số `341-352` của plan là suýt đúng nhưng lọc mất phần đầu.

KHẢ THI CỦA CỔNG, ĐÃ CHẠY TẠI ĐÂY — `bun run check:ts` từ thư mục gốc repo exit 0. `bun test packages/utils/test/install-id.test.ts` báo 5 pass / 0 fail / 11 lời gọi `expect()`. `bun test packages/utils/test/dirs-python-gateway.test.ts` báo 2 pass / 0 fail. Toàn bộ suite `packages/utils` báo 658 pass / 2 skip / 17 fail / 16 errors trên 81 file — 16 trong 17 fail là lỗi nạp addon `pi_natives` và rải trên 16 file (browsers, file-lock, frontmatter, logger-error-serialization, logger-no-transports, loop-phase, mermaid-ascii, postmortem-cleanup-error, postmortem-epipe, postmortem-guard-exit, procmgr, ptree-bytes, ptree-stderr, ptree-timeout, runtime-install, sqlite; tái lập danh sách bằng `grep -B2 'Unhandled error between tests'`), còn fail thật duy nhất là `logger-contract.test.ts` (12 pass / 1 fail; riêng `procmgr.test.ts` báo 0 pass / 1 fail / 1 error trong khi `dirs-python-gateway.test.ts` chạy đơn lẻ là xanh). Vậy addon đang thiếu nhưng KHÔNG phải một rào chắn toàn diện: bề mặt test ở tầng dirs mà W4 cần vẫn chạy xanh — nhưng là vì các file đó không import addon, không phải vì addon chỉ hỏng hai file — và đó là lý do cổng bên dưới là một cổng thật chứ không là nghi thức hình thức.

KHẢ NĂNG PHÂN BIỆT CỦA CỔNG, ĐÃ CHỨNG MINH BẰNG MÃ EXIT — `bun test test/config-dir-dual-root.test.ts` đối với file chưa viết exit 1 ("The following filters did not match any test files"); `bun test ./test/install-id.test.ts` đối với file thật đang xanh exit 0. Lệnh vì thế phân biệt được "chưa cài đặt" với "đã cài đặt và đang xanh" — đúng tính chất làm cho nó dùng được như một cổng có thể đỏ.

TIỀN ĐỀ MÔI TRƯỜNG PHẢI ĐÚNG — `bun test` KHÔNG bị chặn trên máy này, và claim ngược lại phải không được lan truyền: `install-id.test.ts` báo 5 pass / 0 fail và `dirs-python-gateway.test.ts` báo 2 pass / 0 fail; 17 lỗi trong lần chạy toàn bộ `packages/utils` là addon `pi_natives`, rải trên 16 file chứ không phải hai, và chỉ `logger-contract.test.ts` là fail thật. `bun run check:ts` exit 0. Hạn chế thật sự: `bun --cwd=packages/natives run build` fail khi không có ninja. Nhưng KHÔNG phải bốn file W4 chạm tới cần nó — CỔNG thì cần: cả `packages/coding-agent/test/marketplace/project-scope.test.ts` lẫn `pi-config-dir.test.ts` import `discovery/helpers` kéo theo `pi_natives`, và cả hai báo 0 pass / 1 fail / 1 error khi addon thiếu.

### Cổng hoàn thành

Chạy từ thư mục gốc repo.

TIỀN ĐỀ MÔI TRƯỜNG (bắt buộc, một lần cho mỗi máy) — lệnh `bun test` cuối cùng của cổng chạy file phía coding-agent, mà mọi file phía coding-agent import `discovery/helpers` đều kéo theo `pi_natives`. Trên máy chưa dựng addon, chúng báo 0 pass / 1 fail / 1 error với lỗi "Failed to load pi_natives native addon", tức là cổng không phân biệt được "W4 sai" với "addon chưa build". Dựng trước:

```bash
brew install ninja
bun --cwd=packages/natives run build
```

```bash
bun run check:ts
bun run check:rs
cd packages/utils && bun test ./test/config-dir-dual-root.test.ts ./test/install-id-legacy-read.test.ts ./test/config-dir-write-root.test.ts
cd ../.. && bun test ./packages/utils/test/install-id.test.ts ./packages/utils/test/profiles.test.ts ./packages/utils/test/dirs-python-gateway.test.ts ./packages/coding-agent/test/discovery/pi-config-dir.test.ts ./packages/coding-agent/test/marketplace/project-scope.test.ts
```

Dấu `./` ở đầu mỗi đường dẫn là để Bun coi đối số là đường dẫn chứ không phải bộ lọc tên — Bun tự gợi ý điều này khi bộ lọc không khớp. Nó KHÔNG bắt buộc cho tính đúng của cổng: cả hai dạng đều exit 1 khi file thiếu và đều chạy 5 test khi file thật. Đo: `bun test test/install-id.test.ts` -> EXIT=0, 5 test.

RED-BEFORE-GREEN là bắt buộc cho hợp đồng (2). Trước khi thay đổi `getInstallId()`, cắm một UUID vào đường install-id legacy rồi phân giải với root mới rỗng sẽ trả về một UUID MỚI được sinh ra, và khẳng định rằng giá trị đã cắm quay lại sẽ đỏ. Đó là một đỏ thật, không phải lỗi thiếu file, và là bằng chứng duy nhất rằng thay đổi này đang làm được điều gì đó.

KIỂM SOÁT ÂM, để một kết quả xanh rỗng là bất khả thi: trước khi tin bộ test, xác nhận mỗi file mới báo số pass khác 0. Một file nạp được nhưng báo "0 pass" là chưa khẳng định gì cả. Điều này cũng áp cho mọi file test phía coding-agent trong cổng, không chỉ ba file mới — nếu không, kết quả xanh rỗng ở chính file phủ phát hiện lớn nhất sẽ bị đọc nhầm thành xanh. Kiểm soát file-missing ở trên (exit 1) cộng với một lỗi tạm thời cố ý trong `getConfigWriteRootName()` (trả về tên legacy, kỳ vọng hợp đồng 3 và hợp đồng 4 đỏ) cùng nhau chứng minh rằng các test này thực sự có thể đỏ.

LƯỚI HỒI QUY: `packages/utils/test/install-id.test.ts` phải PASS KHÔNG ĐỔI — nó ghim hành vi install-id single-root hiện tại, nên nó là thứ chứng minh việc nối lại resolver đã không làm xấu đi một hợp đồng không liên quan.

LIÊN-PACKAGE, KHÔNG CÓ CỔNG TỰ ĐỘNG MỚI: `bun test ./packages/coding-agent/test/marketplace/project-scope.test.ts` là file DUY NHẤT trong repo phủ bốn chỗ project-relative `helpers.ts:1032`/`:1034`/`:1049`/`:1079` — nó tạo `.omp/plugins` trong một project tạm (dòng 148) và gọi `resolveActiveProjectRegistryPath`. Giữ `pi-config-dir.test.ts` trong cổng như một kiểm tra phụ, KHÔNG phải là phủ bốn chỗ đó (nó chỉ chạm `SOURCE_PATHS.native.userBase/userAgent` phạm vi home, mà W4 giữ nguyên). Hai file Rust không có test harness trong milestone này — `bun run check:rs` type-check chúng, và đường `darwin.rs` nói riêng chỉ chạy trên macOS, nên người review phải đọc hai hunk đó thay vì dựa vào một lần chạy. Hãy nói điều đó trong PR thay vì ám chỉ rằng một lần chạy xanh đã phủ chúng.

Cổng này CÓ THỰC SỰ ĐỎ ĐƯỢC KHÔNG: Có, theo năm cơ chế.

- (a) `getInstallId()` rơi xuống sinh UUID mới thay vì đọc legacy -> hợp đồng (2) đỏ.
- (b) `refreshDirsFromEnv()`/`setAgentDir()`/`setProfile()` không gọi reset -> tám file test gán `process.env.PI_CONFIG_DIR` lúc chạy đọc root bị đóng băng và đỏ.
- (c) Bốn chỗ `helpers.ts:1032`/`:1034`/`:1049`/`:1079` còn gọi `getConfigDirName()` -> `marketplace/project-scope.test.ts` đỏ. Lỗi này CHỈ bị bắt bởi file đó; negative control phải là cố ý để lại một trong bốn chỗ gọi `getConfigDirName()` và xác nhận `project-scope.test.ts` đỏ — không phải lật `getConfigWriteRootName()`.
- (d) Dùng chung một danh sách ứng viên cho root home có dấu chấm tiền và appRoot XDG trần -> hợp đồng (1) đỏ, nhưng chỉ khi `XDG_*_HOME` được đặt.
- (e) Chỉ mở rộng alias sang TypeScript, bỏ qua `crash_handler.rs:269` và `darwin.rs:441` -> KHÔNG có test nào đỏ; chỉ đọc hai hunk mới thấy.

Năm cơ chế trên là kịch bản dự kiến, không phải kết quả đã chạy; phần đã chạy thật là kiểm soát file-missing (exit 1) và probe phân giải sống-đối-lập-đóng băng.

### Phụ thuộc

**Phụ thuộc vào (`depends_on`):**

- W3 (phải vào trước để giá trị `APP_NAME` mới tồn tại; W4 ghi tên đó, và không có W3 thì không có tên nào để ghi — plan nói rõ W4 phụ thuộc W3 vì lý do này).
- M2 (đã merge, để bảng legacy-pi-compat được đóng băng; M5 và M2 cùng chạm vào nó).

**Chặn (`blocks`):**

- W5 (lệnh config migrate chuyển `~/.omp` sang `~/.ultraworkers` và `$XDG_*/omp` sang `$XDG_*/ultraworkers`; nó cần phía đọc dual-root để biết cả hai root tồn tại, và cần write root đã tách để đặt file).
- W6 (lật `CONFIG_DIR_NAME` là vô nghĩa nếu không có một phía đọc vẫn tìm thấy root legacy — toàn bộ ý nghĩa của cổng cứng là W6 chỉ thay đổi nơi ghi MỚI rơi vào).
- W6a (phần ghim project-root đặt ở đây, sớm, vì W4 chính là thứ làm tên phía home phân kỳ).

### Cách sai dễ nhất

Rủi ro chủ đạo là một kiểu hỏng không sinh lỗi, không cảnh báo, và không test nào đỏ vào đúng thời điểm nó được đưa lên. Có ba loại đạt tiêu chuẩn đó. (1) Một install-id vừa được sinh mới không phân biệt được với install-id đúng ở bất kỳ call site nào; triệu chứng duy nhất là một bảng chi phí lặng lẽ khởi động lại. (2) Đảo ngược thứ tự hai biến override sẽ chỉ người dùng tới một thư mục cấu hình rỗng mà không in ra gì — đó là lý do hợp đồng (4) là một test riêng chứ không phải một suy luận. (3) Để lại `.omp` cấp project trên accessor home là vô hình ở W4 (root mới chưa tồn tại) và nổ tung ở W5/W6, nên đó là một lỗi sẽ bị quy cho sai commit.

Rủi ro thứ hai là lấn tay: W6 sở hữu việc lật `CONFIG_DIR_NAME` và W5 sở hữu lệnh migration. Nếu W4 lật `CONFIG_DIR_NAME` "cho chắc", W6 không còn là một dòng revert và milestone mất đi tính chất an toàn của nó. Nếu W4 bắt đầu di chuyển thư mục, nó trùng lặp W5 cùng cả bảo đảm dry-run-by-default của W5.

Rủi ro thứ ba là mù quáng theo nền tảng. `darwin.rs` chỉ chạy trên macOS và phân giải ứng viên XDG là vô hình khi không có `XDG_*_HOME` được đặt, nên một nền tảng CI đơn lẻ sẽ không chạm tới cả hai. Không cái nào được phép bỏ lại cho trí nhớ của người review.

Biện pháp chủ yếu nằm ở cổng: một khẳng định red-before-green cho install-id, một kiểm soát âm chứng minh bộ test có thể đỏ, và việc `install-id.test.ts` hiện có vẫn pass không đổi làm lưới an toàn hồi quy.

### Cần người quyết

- `getConfigDirCandidates()` có nên chứa tên cấp project, hay giữ nguyên phạm vi home? Spec này giữ nó phạm vi home và dành cho đường project một hằng số ghim riêng, khớp với lựa chọn (b) của W6a. Nếu sản phẩm sau này muốn một project-level dual root, đó là lựa chọn (a) của W6a và nó còn đòi config migrate phải di chuyển các thư mục `.omp` cấp project — vốn thường đã commit vào git, nên migrate sẽ phải đọc cả hai và không bao giờ xoá.
- Câu hỏi mở của M5 trong plan về họ `PI_*`/`OMP_*` (plan dòng 14025) đã được N16 trả lời là "giữ vĩnh viễn như alias", và W4 cài đúng như vậy cho một biến. 149 tên runtime-read còn lại trong họ đó vẫn giữ tiền tố `PI_` trong milestone này. Hãy xác nhận đây là chủ ý chứ không phải sót sót, vì sản phẩm sẽ xuất xưởng mang tên ultraworkers với từ vựng cấu hình vẫn có tiền tố `PI_`.
- `docs/environment-variables.md` tài liệu hoá khoảng 290 biến môi trường (288 dòng bảng có tên biến trong ngoặc ngược, tính bằng `grep -cE '^\| *`[A-Z][A-Z0-9_]*` *\|' docs/environment-variables.md`). W4 thêm một hàng và sửa một hàng. Có nên cho các biến cạnh-cấu-hình khác trong họ đó có alias mới ở một đợt sau, hay một alias là đủ bằng chứng cho mô hình này?
- Cache nên sống suốt vòng đời tiến trình, hay config migrate có nên ép phân giải lại trong chính tiến trình? Với cache suốt vòng đời tiến trình, một lệnh migrate dời `~/.omp` sang `~/.ultraworkers` để lại tiến trình đang chạy phân giải tới một thư mục không còn tồn tại. Điều đó vô hại với một lệnh CLI một-lần rồi thoát, nhưng nó phải là một quyết định được nói ra chứ không phải một tai nạn.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `PI_CONFIG_DIR` có 68 lần xuất hiện trên 25 file (16 file .ts). | STALE — lệch một ở cả hai con số. | Trên cây hiện tại ở HEAD `84cbac9`, loại trừ chính tài liệu plan: 69 lần xuất hiện trên 26 file — 17 .ts, 7 .md, 2 .rs. Tái lập bằng `git grep -o 'PI_CONFIG_DIR' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` và cùng lệnh với `-l`. Plan đo ở commit `5873776`, commit không có trong lịch sử repository này, nên đây là cũ chứ không phải sai phương pháp. |
| Hai file Rust đọc `PI_CONFIG_DIR` không được nhắc ở đâu trong W4 [của plan], nên việc mở rộng `ULTRAWORKERS_CONFIG_DIR` là thay đổi chỉ ở TypeScript. | INCOMPLETE — một khoảng trống parity thật. | `crates/pi-natives/src/crash_handler.rs:269` và `crates/pi-natives/src/oauth_callback/darwin.rs:441` đều đọc biến trực tiếp. Thư mục crash-log sẽ phớt lờ alias mới trên mọi nền tảng, và đường khôi phục legacy trên macOS sẽ phớt lờ nó chỉ trên macOS — một lỗi không lần chạy CI Linux nào quan sát được. W4 phải mở rộng cả hai, với tên mới thắng tên legacy và các bộ lọc giá trị rỗng hiện có được giữ nguyên. Bằng chứng: `crash_handler.rs:269` `let config_override = std::env::var_os("PI_CONFIG_DIR");` với fallback `DEFAULT_CONFIG_DIR` = `".omp"` ở `:49`, dùng ở `:286` và `:344`. `darwin.rs:439-446` `context.env.get("PI_CONFIG_DIR")... .unwrap_or(".omp")`. Xác nhận bằng cách mở cả hai file, không phải bằng grep. `git grep -ln 'PI_CONFIG_DIR' -- '*.rs'` trả về đúng hai file này. |
| Mối nguy project-root là `getProjectAgentDir()` ở dirs.ts:589-591, thứ W6a xử lý như một sub-task riêng. | UNDERSCOPED — thêm bốn chỗ nữa, cùng mối nguy. | `packages/coding-agent/src/discovery/helpers.ts:1032`, `:1034`, `:1049` và `:1079` gọi `getConfigDirName()` với cwd PROJECT làm parent, để dựng `<project>/plugins/installed_plugins.json`. Để chúng trên accessor home nghĩa là một project đã commit `.omp` sẽ ngừng phân giải ngay khi root mới thắng. W4 là nơi tạo ra sự phân kỳ, nên W4 là nơi bốn chỗ này nên chuyển sang hằng số ghim cho project. Đây cùng kiểu hỏi mà plan đã dự báo cho XDG ("lỗi chia theo nền tảng mà một lần chạy test trên một nền tảng sẽ không bắt"), áp vào một đường mà plan không hề nhắc. Ngược lại, `helpers.ts:47` `projectDir: CONFIG_DIR_NAME` đã đọc thẳng hằng số và không cần đổi. |
| Phân giải danh sách ứng viên theo tồn tại trước, rồi cache — sao chép khuôn đã có ở `MAIN_CONFIG_FILENAMES` (dirs.ts:30). | KHUÔN KHÔNG CUNG CẤP PHẦN CACHING, và chính phần caching là nửa rủi ro. | `MAIN_CONFIG_FILENAMES` chỉ là một mảng tên file có thứ tự với vòng lặp first-hit-wins ở nơi gọi (`settings.ts:2129`, `auth-broker/discover.ts:198`) — nó không kiểm tra tồn tại lúc nạp module và không cache gì cả. Vậy thứ tự là khuôn dùng lại được, còn cache là một cơ chế mới W4 phải thiết kế. Nó phải được xoá từ cả bốn nơi mà module đóng băng trạng thái thư mục, nếu không tám file test gán `process.env.PI_CONFIG_DIR` lúc chạy sẽ đọc một root cũ. Bằng chứng: `dirs.ts:30` `export const MAIN_CONFIG_FILENAMES = ["config.yml", "config.yaml"] as const;` — một hằng số, không logic. Nơi tiêu thụ lặp và trả về ở lần nạp đầu: `settings.ts:2129-2133` `for (const filename of MAIN_CONFIG_FILENAMES) { ... if (loaded) return { settings: loaded, configPath }; }`. Các đường rebuild sẽ vứt lại cache: `refreshDirsFromEnv` ở `:485`, `setAgentDir` ở `:502`, `setProfile` ở `:541`, cộng thêm `let dirs = new DirResolver({...})` lúc import ở `:449`. Danh sách 8 nơi gán env lúc chạy nằm ở bước 6. |
| Cổng là `bun run check && (cd packages/utils && bun test test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts test/config-dir-write-root.test.ts)`. | CHẠY ĐƯỢC — tiền tố `./` chỉ để đổi thông báo lỗi, không ảnh hưởng exit code; tiền đề môi trường đằng sau nó là sai. | Bỏ dấu `./` ở đầu mỗi đường dẫn thì Bun coi đối số là bộ lọc tên chứ không phải đường dẫn — nhưng cả hai dạng đều cho cùng kết quả: file thiếu thì exit 1, file thật thì 5 test và exit 0, nên tiền tố không bắt buộc, chỉ đổi câu thông báo lỗi (Bun tự gợi ý dùng `./`). Riêng về sau, `bun test` KHÔNG bị chặn trên máy này: addon `pi_natives` đang thiếu, và nó ảnh hưởng 16 file trong `packages/utils`, trong đó chỉ `logger-contract.test.ts` là fail thật — bề mặt tầng dirs mà W4 cần chạy xanh vì các file đó không import addon. `bun run check` không giống `bun run check:ts` và nặng hơn nhiều — nhưng phải thêm lại `check:rs` thành lệnh riêng, vì W4 sửa hai file Rust và không còn lệnh nào trong cổng bắt được lỗi Rust nếu thiếu nó (`check` = `bun run --parallel check:ts check:rs`, còn `check:ts` hoàn toàn không có Rust). `check:ts` exit 0 và là tín hiệu nên dùng. Bằng chứng: `bun test packages/utils/test/install-id.test.ts` -> 5 pass / 0 fail / 11 lời gọi `expect()`. `bun test packages/utils/test/dirs-python-gateway.test.ts` -> 2 pass / 0 fail. Toàn bộ `packages/utils` -> 658 pass / 2 skip / 17 fail / 16 errors, trong đó 16 lỗi là addon `pi_natives` rải trên 16 file và chỉ `logger-contract.test.ts` là fail thật (12 pass / 1 fail; riêng `procmgr.test.ts` -> 0 pass / 1 fail / 1 error). `bun test test/config-dir-dual-root.test.ts` (thiếu) -> exit 1; `bun test ./test/install-id.test.ts` (thật) -> exit 0. `bun run check:ts` -> exit 0. |
| Neo dòng: thân `getInstallId` nằm "ngay dưới :1090"; comment orphan-profile ở :341-352. | NEAR MISS — cả hai đều rơi vào đúng vùng nhưng không trúng chỗ. | `getInstallId` được khai báo ở `:1104` (doc comment mở ở `:1092`), nên `:1090` sớm quá 14 dòng. Khối comment orphan-profile chạy `:340-355` với từ "orphaning" ở `:348`, nên khoảng của plan cắt mất phần đầu. Mọi neo W4 khác trong plan đã xác minh chính xác: `:27`, `:30`, `:114-116`, `:297-298`, `:302-305`, `:360`, `:384`, `:589-591`, `:1076`, `:1083-1086`. Bằng chứng: `grep -n` trên `packages/utils/src/dirs.ts`: `export function getInstallId(): string` -> 1104; `// XDG is a Linux convention` -> 340; "orphaning" -> 348; `const appRoot = path.join(value, APP_NAME)` -> 360; `// XDG flattens the agent/` -> 384. |

## Cần người xác nhận

- Mâu thuẫn về phạm vi trong chính đặc tả: mục `plan_corrections` thứ hai phát biểu rằng "hai file Rust đọc `PI_CONFIG_DIR` không được nhắc ở đâu trong W4", trong khi bảng **File cần chạm tới** của cùng tài liệu này lại liệt kê cả `crates/pi-natives/src/crash_handler.rs` và `crates/pi-natives/src/oauth_callback/darwin.rs` là các file W4 sẽ sửa. Nếu claim đó mang nghĩa về W4 của plan (chứ không phải W4 của tài liệu này) thì không có mâu thuẫn; nếu mang nghĩa về W4 như một work item thì mâu thuẫn với chính nó. Đặc tả không nói rõ, nên người đọc phải tự giải.


---


## W5. `config migrate` — idempotent, mặc định dry-run (sóng 2)

**Sóng:** Sóng 2. **Effort:** M, nhưng phân bố khác vẻ ngoài mà con số M gợi ý. **Rủi ro chính:** cổng xanh trong khi công việc chưa làm, nếu engine để lại trong `packages/coding-agent` — nơi `bun test` không chạy được trên máy này.

Một dòng tóm tắt: thêm subcommand `migrate` vào lệnh `config` sẵn có, dịch các config root của người dùng từ tên cũ sang tên mới (`~/.omp` → `~/.ultraworkers` và `$XDG_{DATA,STATE,CACHE}_HOME/omp` → `$XDG_*_HOME/ultraworkers`), giữ nguyên `install-id`, mặc định dry-run với `--apply` tường minh, và chạy hai lần vẫn an toàn (lần thứ hai báo 0 moves và thoát 0).

Hiệu ứng người dùng thấy: `omp config migrate` in ra danh sách chính xác các thư mục nó định di chuyển rồi thoát mà không đụng vào gì. `omp config migrate --apply` thực sự di chuyển, báo đã di chuyển bao nhiêu, và để lại sessions, settings, history, models cache cùng install identity vẫn truy cập được dưới root mới. Chạy `--apply` lần nữa là một no-op, báo không có gì để di chuyển và thoát 0. Không có gì được di chuyển trừ khi người dùng tự gõ `--apply`.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/src/config-migrate.ts` | tạo | Engine di trú độn: planner thuần, side-effect-free, tách khỏi executor. Xuất `MigrationMove` (`kind: "base" \| "xdg-data" \| "xdg-state" \| "xdg-cache"`, `from`, `to`), `MigrationPlan` (`moves`, `conflicts`), `MigrationConflict`, `MigrationOptions` (`oldBaseName`, `newBaseName`, `oldAppName`, `newAppName`, `home`, `env`, `platform`), `planConfigMigration(options): Promise<MigrationPlan>` (đọc thuần, `fs.exists` bất đồng bộ trên từng cặp ứng viên, không ghi gì) và `executeConfigMigration(plan): Promise<{ moved, skipped }>` (chỉ động vào `moves`, không bao giờ chạm `conflicts`). Ứng viên theo thứ tự: `kind: "base"` — `path.join(home, oldBaseName)` → `path.join(home, newBaseName)`, soi theo `getBaseConfigRoot()` tại `dirs.ts:114-115` (`path.join(os.homedir(), getConfigDirName())`); rồi `xdg-data` / `xdg-state` / `xdg-cache` — với mỗi biến `XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CACHE_HOME`, `path.join(value, oldAppName)` → `path.join(value, newAppName)`, chỉ khi `env[var]` là chuỗi không rỗng, soi theo phép join `resolveIf` tại `dirs.ts:360` (`const appRoot = path.join(value, APP_NAME);`) kèm chốn nền tảng tại `dirs.ts:355` (`process.platform === "linux" \|\| process.platform === "darwin"`). HAI CẶP TÊN ĐỘC LẬP, KHÔNG DÙNG CHUNG: base root mang tên `CONFIG_DIR_NAME` (`.omp`, CÓ dấu chấm, `dirs.ts:27`) còn root XDG mang tên `APP_NAME` (`omp`, KHÔNG dấu chấm, `dirs.ts:21`) — dùng chung một cặp sẽ khiến cả ba ứng viên XDG trỏ tới `$XDG_*_HOME/.omp`, vốn không bao giờ tồn tại, nên rơi vào nhánh "vắng" của luật ba nhánh và bị bỏ qua im lặng. Luật quyết định — chính là toàn bộ hợp đồng idempotency: `from` không tồn tại thì bỏ qua im lặng, không phải move cũng không phải conflict; `from` tồn tại và `to` không tồn tại thì là `MigrationMove`; `from` tồn tại và `to` tồn tại thì là `MigrationConflict` — được báo, đếm, và TUYỆT ĐỐI không merge, không ghi đè, không đổi tên. Engine nhận `home`, `env`, `platform` qua tham số thay vì tự đọc `os.homedir()` / `process.env` / `process.platform`; đó là thứ làm cho test hermetic và an toàn toàn suite. Không cache ở cấp module, không singleton. Không có `console.*` trong file này. | Có. Subpath export khai tại `packages/utils/package.json:36-39` (`"./*": {"types": "./src/*.ts", "import": "./src/*.ts"}`) nên `@oh-my-pi/pi-utils/config-migrate` resolve được. `packages/utils/src/dirs.ts` có zero import `@oh-my-pi/pi-natives`, trong khi bốn file utils khác thì có (`file-lock.ts:9`, `mermaid-ascii.ts:1`, `procmgr.ts:3`, `ptree.ts:10`) — đó là lý do import subpath của một module hình dạng dirs thì chạy còn import barrel thì không. Lưu ý `sanitize-text.ts` và `tab-spacing.ts` nhắc chuỗi `pi-natives` trong doc comment nhưng KHÔNG import nó, nên chúng không thuộc danh sách này. `bun test packages/utils/test/install-id.test.ts` → 5 pass / 0 fail / EXIT=0, và file đó import `@oh-my-pi/pi-utils/dirs`, không phải barrel. |
| `packages/utils/src/index.ts` | sửa | Thêm `export * from "./config-migrate";` theo luật barrel của AGENTS.md (star re-export, không phải danh sách named). Đặt cạnh re-export của `dirs` để họ config-root nằm chung. | Có. AGENTS.md: "prefer `export * from \"./module\"` over named re-exports… In pure `index.ts` barrels, use star re-exports even for single-specifier cases." Subpath export trong package.json là chuyện khác và đã có sẵn; đây chỉ là entry barrel. |
| `packages/utils/src/fs-move.ts` | tạo | `export async function movePath(source: string, destination: string): Promise<void>` — mkdir thư mục cha đích, thử `fs.rename`, và khi `code === "EXDEV"` lùi về `fs.cp(…, { recursive: true })` + `fs.rm(…, { recursive: true, force: true })` cho thư mục, hoặc `fs.copyFile` + `fs.unlink` cho file. Sau đó xoá bản private ở `gc-cli.ts:528` và cho hai call site của nó (`gc-cli.ts:673`, `gc-cli.ts:682`) import bản này. Không để lại hai bản hiện thực. | Có. AGENTS.md Central Utilities: "Missing capability? Extend the central helper… don't fork its logic locally" và "Two implementations of the same thing is a bug even when both work." `gc-cli.ts:528` là `async function movePath(source: string, destination: string)` — private ở cấp module, KHÔNG export, chỉ dùng ở `gc-cli.ts:673` và `:682`. `git grep -rn 'movePath' -- packages/` trả về đúng ba dòng đó. Hôm nay chưa có module fs-move trung tâm: `packages/utils/src/` có `file-lock.ts`, `path.ts`, `peek-file.ts`, `path-tree.ts` và không có `fs.ts`. |
| `packages/coding-agent/src/cli/config-cli.ts` | sửa | Tám sửa đổi, trong một commit. ACTION LIST — bốn bản sao plan nêu, đều đã xác nhận giữ cùng một mảng sáu phần tử: (1) dòng 20, `export type ConfigAction`: thêm `\| migrate`; (2) dòng 66, `const VALID_ACTIONS: ConfigAction[]`: thêm `"migrate"`; (3) `printConfigHelp()` tại dòng 405, khối Commands kết thúc bằng `  init-xdg           Initialize XDG Base Directory structure` ở dòng 414: thêm một dòng `migrate`; (4) `switch (cmd.action)` tại dòng 166: thêm `case "migrate": await handleMigrate(cmd.flags); break;` cạnh `case "init-xdg":` đang ở dòng 182. FLAG PLUMBING — bốn site plan không hề nhắc, thiếu chúng thì `--apply` không thể tồn tại: (5) dòng 26-28, `ConfigCommandArgs.flags`: thêm `apply?: boolean;` cạnh `json?: boolean;`; (6) vòng lặp flag của `parseConfigArgs`, dòng 93-101: thêm nhánh `else if (arg === "--apply") { result.flags.apply = true; }` cạnh nhánh `--json`. HANDLER: (7) thêm `handleMigrate(flags: { json?: boolean; apply?: boolean }): Promise<void>` — gọi `planConfigMigration`, rồi hoặc in plan (mặc định), hoặc gọi `executeConfigMigration` khi `apply` là true; nó là handler duy nhất ghi xuống filesystem. IMPORT: (8) bổ sung `executeConfigMigration, planConfigMigration` vào import barrel đang có ở `config-cli.ts:8` (`import { APP_NAME, getAgentDir, isRecord } from "@oh-my-pi/pi-utils";`), vì bước 6 đã export module này qua `index.ts` và quy ước của file là dùng barrel. Tuyệt đối không dùng inline import. Lưu ý: import SUBPATH `@oh-my-pi/pi-utils/config-migrate` là bắt buộc với TEST (`packages/utils/test/config-migrate.test.ts`), vì import barrel kéo `@oh-my-pi/pi-natives` vào đồ thị và làm cả file test lỗi lúc import — đó là lý do cổng phải nằm ở `packages/utils` và import bằng subpath. File này dùng TAB (oxfmt `useTabs: true, tabWidth: 3`); `bun run check:tools` chạy `oxfmt --check` và một lỗi format là fail cổng. | Có. Mọi số dòng xác nhận bằng `git grep -n` và `sed -n` trên file thật (432 dòng). Dòng 20 `export type ConfigAction = "list" \| "get" \| "set" \| "reset" \| "path" \| "init-xdg";`. Dòng 66 `const VALID_ACTIONS: ConfigAction[] = [...cùng sáu...];`. Dòng 166 `switch (cmd.action) {`, với `case "init-xdg":` ở 182. Dòng 26-28 `flags: { json?: boolean; };`. Nhánh `--json` trong vòng lặp flag ở dòng 93. QUAN TRỌNG: `printConfigHelp` (dòng 405) và `parseConfigArgs` (dòng 72) đều có zero caller. |
| `packages/coding-agent/src/commands/config.ts` | sửa | Bốn sửa đổi. (1) Dòng 10, `const ACTIONS: ConfigAction[]`: thêm `"migrate"` — đây chính là mảng truyền vào `options: ACTIONS` cho `Args.string` ở dòng 18, tức mảng mà runtime thật sự validate. (2) `static flags` ở dòng 31-33: thêm `apply: Flags.boolean({ description: "Perform the migration (default is a dry run)" })` cạnh `json: Flags.boolean({ description: "Output JSON" })` sẵn có. (3) Object literal `cmd` ở dòng 40-47: thêm `apply: flags.apply,` bên trong `flags` của nó. (4) Không thêm arg hay positional nào. `migrate` không nhận key, không nhận value; đừng thêm entry `args` giả. Formatting: file này dùng TAB, giống hệt `config-cli.ts` — `.oxfmtrc.json` đặt `useTabs: true, tabWidth: 3` và `oxfmt --check` (chạy trong `check:tools`, là tiền thề của cổng `check:ts`) đang pass file này vì file vốn đã đúng. Không có khác biệt thụt lề giữa hai file; đừng dùng space ở bất kỳ dòng nào bạn thêm vào, kể cả dòng `apply:` trong `static flags` và dòng `apply: flags.apply,` trong object literal `cmd`. | Có. File dài 52 dòng, đọc trọn. Dòng 10 là mảng ACTIONS; dòng 18 là `options: ACTIONS`; dòng 31-33 là `static flags`; dòng 44-46 là `flags: { json: flags.json }` lồng; dòng 50 là `await runConfigCommand(cmd)`. Bằng chứng thụt lề: `grep -cP '^\t' packages/coding-agent/src/commands/config.ts` → 35, `grep -cP '^    '` → 0; `config-cli.ts` cho 282 tab và 0 dòng 4-space. `sed -n '32p' … | hexdump -C` → `09 09 6a 73 6f 6e` (hai TAB rồi `json:`). Sai lệch "4 space" trước đây chỉ là hiệu ứng của `cat -n` hiển thị tab rộng 4 cột. |
| `packages/coding-agent/src/cli/commands/config-migrate.ts` | tạo | Renderer mỏng hướng tới con người, về cấu trúc là anh em của `init-xdg.ts` sẵn có: nhận `MigrationPlan` cộng `{ apply: boolean }`, in ra, rồi thoát. Giữ phần định dạng ở đây chứ không ở `config-migrate.ts`, để engine không dính display và vẫn test được. Mọi path in ra phải đi qua `shortenPath` từ `@oh-my-pi/pi-tui`, không dùng `dir.replace(os.homedir(), "~")` tự viết tay mà `init-xdg.ts:21` đang dùng. Mọi dòng in ra phải đi qua `truncateToWidth`. `console.*` được phép ở đây và chỉ ở đây: `config migrate` là lệnh độc lập thoát mà không vào TUI — đó đúng là ngoại lệ AGENTS.md nêu tên. Thoát 0 khi thành công, kể cả trường hợp 0 moves. Chỉ thoát khác 0 khi thất bại thật (một move không hoàn tất được) hoặc khi người dùng truyền các root xung đột — không bao giờ chỉ vì chẳng có việc gì để làm. | Có. `init-xdg.ts` là tiền lệ cấu trúc đã xác nhận: 27 dòng, `export async function initXdg(): Promise<void>`, dùng `console.log` / `console.error` / `process.exit`, và được `config-cli.ts:14` import bằng `import { initXdg } from "./commands/init-xdg";`. `shortenPath` xác nhận có tại `packages/tui/src/render/render-utils.ts:902`. |
| `packages/utils/test/config-migrate.test.ts` | tạo | Cổng. Sáu case, liệt kê ở mục *Hợp đồng test*. Import engine qua SUBPATH — `import { executeConfigMigration, planConfigMigration } from "@oh-my-pi/pi-utils/config-migrate";` — không bao giờ qua barrel `@oh-my-pi/pi-utils`, nếu không đồ thị `@oh-my-pi/pi-natives` quay lại và cả file lỗi ngay lúc import. | Có. Dạng subpath đã chạy thật: `packages/utils/test/install-id.test.ts` dùng `from "@oh-my-pi/pi-utils/dirs"` và pass 5/5 với exit 0. |
| `packages/coding-agent/test/config-migrate-cli.test.ts` | tạo | Phủ end-to-end phần nối dây: `omp config migrate` được chấp nhận (không lỗi usage), in plan và không đụng đĩa; `omp config migrate --apply` thì di chuyển; lần `--apply` thứ hai báo 0 moves và thoát 0. Mô hình theo `packages/coding-agent/test/config-cli.test.ts`, vốn đã spawn CLI thật như một subprocess qua `Bun.spawn([process.execPath, cliEntry, ...args])` và bắt `{ exitCode, output, error }`. File này KHÔNG chạy được trên máy này. Vẫn đáng vi — nó là hợp đồng chứng minh cả bốn sửa action-list lẫn bốn sửa flag đã xuống đất — nhưng không được làm cổng nghiệm thu. | Có. Harness spawn subprocess tồn tại và tái dùng được: `packages/coding-agent/test/config-cli.test.ts` — import ở dòng 1-6 (`runConfigCommand`, `resetSettingsForTest` từ `config/settings.ts:3746`, `AgentStorage`, và `getConfigRootDir`/`setAgentDir`/`TempDir` qua barrel `@oh-my-pi/pi-utils`, lớp `TempDir` định nghĩa ở `packages/utils/src/temp.ts:6`), interface `CliProcessResult` ở 12-16, và `runCliProcess` ở 19-28 gọi `Bun.spawn([process.execPath, cliEntry, ...args])` với `cliEntry = path.join(import.meta.dir, "..", "src", "cli.ts")`. Viết file này dựa trên harness đó là rủi ro thấp; thứ chặn là native addon, không phải pattern. Lưu ý harness spawn `src/cli.ts` bằng `process.execPath`, không phải binary `omp` đã cài — assert trên argv và output của tiến trình con, đừng giả định một binary trên PATH. |

### Các bước

1. Xác nhận W4 đã thật sự xuống đất. W5 nằm sau nó: tên mới phải tồn tại như một giá trị thì mới có thứ để di chuyển tới. Chạy `git grep -n 'getConfigWriteRoot\|getConfigDirCandidates' -- packages/utils/src/dirs.ts` — nó phải trả về kết quả. Hôm nay nó không trả về gì (đã kiểm chứng: cả hai symbol đều không tồn tại). Nếu thiếu W4 thì dừng; đừng bịa tên mới ở đây, nó đến từ `APP_NAME` của W3. Neo: `packages/utils/src/dirs.ts:297`.

2. Tạo `packages/utils/src/config-migrate.ts` với engine đúng như mô tả ở bảng trên. Bắt đầu bằng `planConfigMigration` một mình và làm cho luật quyết định ba nhánh (vắng / chờ / xung đột) đúng — chính luật đó LÀ bảo đảm idempotency. Nhận `home`, `env`, `platform` qua tham số; không bao giờ đọc `os.homedir()`, `process.env` hay `process.platform` bên trong engine. Không `console.*` trong file này. Neo: `packages/utils/src/config-migrate.ts`.

3. Viết `packages/utils/test/config-migrate.test.ts` TRƯỚC khi executor tồn tại, và làm các case plan-only xanh. Chạy nó ngay bây giờ chứng minh cổng hoạt động: `bun test packages/utils/test/config-migrate.test.ts` phải thoát 0, và trước khi file tồn tại thì chính câu lệnh đó thoát 1. Cặp đó là bằng chứng cổng đỏ được. Neo: `packages/utils/test/config-migrate.test.ts`.

4. Tạo hoặc mở rộng `packages/utils/src/fs-move.ts` bằng cách nâng `movePath` ra khỏi `gc-cli.ts:528`, rồi xoá bản private và trỏ lại `gc-cli.ts:673` và `gc-cli.ts:682`. Ở bước này KHÔNG cần chạy `bun test packages/coding-agent/test/` (nó không chạy được) — thay vào đó xác nhận bằng typecheck rằng gc-cli vẫn resolve, ở bước 8. Neo: `packages/coding-agent/src/cli/gc-cli.ts:528`.

5. Cài `executeConfigMigration`. Nó phải duyệt `plan.moves` và không gì khác. Một move ném lỗi phải được báo lại và không được thử lại theo cách phá hủy; nguồn được giữ nguyên tại chỗ khi thất bại để người dùng vẫn còn dữ liệu. Không bao giờ xoá một nguồn chưa di chuyển thành công. Neo: `packages/utils/src/config-migrate.ts`.

6. Thêm `export * from "./config-migrate";` vào `packages/utils/src/index.ts`. Neo: `packages/utils/src/index.ts`.

7. Làm tám sửa đổi trong `config-cli.ts` và bốn sửa đổi trong `config.ts`, trong MỘT commit, rồi ĐẾM TÁM VÀ BỐN. Bốn site action-list là những site plan nêu tên; bốn site flag-plumbing là những site plan bỏ sót, và bỏ sót chúng nghĩa là `--apply` lặng lẽ không tồn tại. Hoàn tất nửa hướng-tới-người ở `packages/coding-agent/src/cli/commands/config-migrate.ts`, với `shortenPath` và `truncateToWidth` trên mọi path được in. Neo: `packages/coding-agent/src/cli/config-cli.ts:20`.

8. Chạy `bun run check:ts`. Mốc nền là exit 0 trên cây sạch — đã kiểm chứng hai lần trên máy này, khoảng 40s wall. Đây là tín hiệu tự động DUY NHẤT bắt được tám site sửa, vì không có lỗi type nào phân biệt được site bị quên: nới rộng `ConfigAction` để cả `VALID_ACTIONS` và `ACTIONS` vẫn typecheck như tập con, còn một `switch` trên một union không có kiểm tra exhaustiveness (không `noImplicitReturns` trong tsconfig, không luật exhaustiveness trong `.oxlintrc.json`) thì biên dịch im lặng. Hãy đọc diff để đếm thay vì tin typecheck. Neo: `package.json:94`.

9. Chạy `bun test packages/utils/test/config-migrate.test.ts`. Cả sáu case xanh, exit 0. Rồi chạy lại lần thứ hai ngay lập tức — vẫn 0. Suite phải an toàn toàn suite: không đổi `process.env` ở cấp file, không `mock.module()`, không vá `Bun.*`. Ưu tiên truyền tham số theo từng test (engine nhận `home`/`env`/`platform` qua đối số chính là để điều đó giữ được). Neo: `packages/utils/test/config-migrate.test.ts`.

10. KHÔNG đụng vào bất cứ thứ gì của W6, và KHÔNG đổi `CONFIG_DIR_NAME` tại `dirs.ts:27`. W5 đóng gói lối thoát an toàn; cú bật vẫn nằm sau cổng riêng cho tới khi `config migrate` đã ship VÀ đã được dùng trong một bản phát hành thật. Work item này mà chạm vào `dirs.ts:27` là vi phạm phạm vi của W6. Neo: `packages/utils/src/dirs.ts:27`.

### Hình dạng code

```ts
// packages/utils/src/config-migrate.ts
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { movePath } from "./fs-move";

export type MigrationKind = "base" | "xdg-data" | "xdg-state" | "xdg-cache";

export interface MigrationMove {
	readonly kind: MigrationKind;
	readonly from: string;
	readonly to: string;
}

export interface MigrationConflict {
	readonly kind: MigrationKind;
	readonly from: string;
	readonly to: string;
}

export interface MigrationPlan {
	readonly moves: readonly MigrationMove[];
	readonly conflicts: readonly MigrationConflict[];
}

export interface MigrationOptions {
	// Base root uses CONFIG_DIR_NAME — ".omp", and getConfigDirName() also honours PI_CONFIG_DIR.
	readonly oldBaseName: string;   // CONFIG_DIR_NAME before W6 — ".omp", or process.env.PI_CONFIG_DIR
	readonly newBaseName: string;   // CONFIG_DIR_NAME after W3 — ".ultraworkers"
	// XDG roots use APP_NAME — "omp", NO leading dot (dirs.ts:21).
	readonly oldAppName: string;    // APP_NAME before W3 — "omp"
	readonly newAppName: string;    // APP_NAME after W3 — "ultraworkers"
	readonly home: string;
	readonly env: NodeJS.ProcessEnv;
	readonly platform: NodeJS.Platform;
}

const XDG_KINDS = [
	{ kind: "xdg-data",  variable: "XDG_DATA_HOME"  },
	{ kind: "xdg-state", variable: "XDG_STATE_HOME" },
	{ kind: "xdg-cache", variable: "XDG_CACHE_HOME" },
] as const satisfies readonly { kind: MigrationKind; variable: string }[];

export async function planConfigMigration(options: MigrationOptions): Promise<MigrationPlan> {
	const candidates: MigrationMove[] = [
		{ kind: "base", from: path.join(options.home, options.oldBaseName), to: path.join(options.home, options.newBaseName) },
	];
	// Mirrors dirs.ts:355 (linux || darwin only) and dirs.ts:360
	// (const appRoot = path.join(value, APP_NAME)) — note APP_NAME is "omp",
	// without the leading dot that CONFIG_DIR_NAME has.
	if (options.platform === "linux" || options.platform === "darwin") {
		for (const { kind, variable } of XDG_KINDS) {
			const value = options.env[variable];
			if (!value) continue;
			candidates.push({ kind, from: path.join(value, options.oldAppName), to: path.join(value, options.newAppName) });
		}
	}

	const moves: MigrationMove[] = [];
	const conflicts: MigrationConflict[] = [];
	for (const candidate of candidates) {
		if (!(await fs.exists(candidate.from))) continue;      // absent: nothing to do
		if (await fs.exists(candidate.to)) {                     // both present: never merge
			conflicts.push(candidate);
			continue;
		}
		moves.push(candidate);
	}
	return { moves, conflicts };
}

export async function executeConfigMigration(
	plan: MigrationPlan,
): Promise<{ readonly moved: number; readonly skipped: number }> {
	let moved = 0;
	for (const move of plan.moves) {
		await movePath(move.from, move.to);   // rename, with EXDEV cp+rm fallback
		moved++;
	}
	return { moved, skipped: plan.conflicts.length };
}
```

```ts
// packages/coding-agent/src/commands/config.ts — the four edits, abridged
const ACTIONS: ConfigAction[] = ["list", "get", "set", "reset", "path", "init-xdg", "migrate"];

static flags = {
	json:  Flags.boolean({ description: "Output JSON" }),
	apply: Flags.boolean({ description: "Perform the migration (default is a dry run)" }),
};

const cmd: ConfigCommandArgs = {
	action,
	key: args.key,
	value,
	flags: { json: flags.json, apply: flags.apply },
};
```

Bất đối xứng làm cho mọi thứ an toàn: engine trả về các bộ ba có cấu trúc `{kind, from, to}` và không biết chúng được hiển thị ra sao; handler CLI định dạng chúng qua `shortenPath` / `truncateToWidth` và không biết gì về luật quyết định ba nhánh. Chính phép chia đó cho phép engine được test mà không cần display, không cần TUI, không cần thư mục home.

### Hợp đồng test

Sáu case trong `packages/utils/test/config-migrate.test.ts`, mỗi case bảo vệ đúng một hợp đồng mà người tiêu dùng quan sát được. Tất cả đều dùng thư mục tạm dưới `os.tmpdir()` cùng `home`, `env` và `platform` tổng hợp truyền vào qua đối số — không đổi `process.env`, không `mock.module()`, không đọc `~/.omp` thật.

1. **DRY RUN KHÔNG ĐỔI GÌ.** Gieo một cây gồm một file config, một thư mục session, một thư mục profile có tên và một UUID `install-id` đã biết. Gọi `planConfigMigration` và assert mọi path đã gieo vẫn tồn tại sau đó. Nếu hồi quy, người dùng thấy: gõ `config migrate` để xem trước rồi mất sạch settings. Plan là một lần đọc thuần; engine không bao giờ ghi trong `planConfigMigration`.

2. **APPLY DI CHUYỂN MỌI ROOT.** Gieo root gốc bằng `path.join(home, oldBaseName)` cộng cả ba root XDG bằng `path.join(xdgHome, "omp")` — tên thật của XDG root, KHÔNG phải `oldBaseName`/`.omp` (với `XDG_DATA_HOME`/`XDG_STATE_HOME`/`XDG_CACHE_HOME` đều được set). Apply. Assert `moved === 4`, assert mỗi path cũ đã biến mất và mỗi path mới tồn tại với nội dung mong đợi. Gieo bằng `oldBaseName` ở cả XDG sẽ làm test XANH TRONG KHI HÀNH VI THẬT HỎNG — nó chính là bẫy mà case này phải tránh. Nếu hồi quy, người dùng thấy: người đã chạy `init-xdg` giữ lại một bộ cài nửa vời với state của họ bị bỏ lại dưới tên cũ.

3. **LẦN APPLY THỨ HAI LÀ NO-OP.** Apply một lần, rồi apply lần thứ hai. Assert `moves.length === 0` và rằng cây đã migrate sau đó giống hệt từng byte. Nếu hồi quy, người dùng thấy: người chạy lại lệnh vì lo ngại bị dữ liệu ở root mới bị đè. Đây là failure #1 được plan đặt tên, và là case đáng giá nhất.

4. **CẢ HAI ROOT ĐỀU TỒN TẠI LÀ CONFLICT, KHÔNG PHẢI MERGE.** Tạo root cũ VÀ root mới, mỗi cái một file marker khác nhau. Assert cặp đó rơi vào `conflicts`, KHÔNG rơi vào `moves`; assert cả hai file marker sống sót không đổi. Nếu hồi quy, người dùng thấy: hai bản cài lặng lẽ nối vào một thư mục, không backup, không hỏi.

5. **`install-id` SỐNG SÓT.** Đọc UUID ở path `install-id` cũ, apply, đọc UUID ở path mới, assert hai chuỗi bằng nhau và khớp giá trị đã gieo. Đây là assert về chuyển trạng thái, không phải assert về tồn tại — assert GIÁ TRỊ không đổi, chứ không chỉ assert có file nào đó. Nếu hồi quy, người dùng thấy: họ trở thành một bản cài hoàn-toàn-mới với broker và lịch sử chi phí theo từng bản-cài của họ lặng lẽ quay về zero.

6. **MỘT PROFILE CÓ TÊN ĐI CÙNG ROOT CỦA NÓ.** Gieo `<root>/profiles/work/agent/` (và, khi đang kiểm thử các biến thể XDG, là `<xdg>/omp/profiles/work/agent/`), apply, rồi assert thư mục profile hiện diện và đọc được dưới root mới. Nếu hồi quy, người dùng thấy: kích hoạt một profile có tên resolve về một thư mục rỗng và họ tưởng đã mất lịch sử của profile đó. Đây là case plan yêu cầu, đối chiếu với bug thật đã ghi trong comment `DirResolver`.

Hai case nữa đáng thêm nếu bề mặt cho phép, mỗi case phủ một nhánh khác nhau: biến XDG không được set thì không có root XDG nào xuất hiện trong plan, và `platform: "win32"` thì cũng không có root XDG nào (chốn tại `dirs.ts:355`). Đây là các nhánh tách biệt, và một vòng lặp tham số hoá ở đây là chấp nhận được chính xác vì mỗi dòng phủ một đường code khác nhau.

KHÔNG thêm: một test assert danh sách action chứa `"migrate"`, một test assert help text có nhắc tới nó, hay bất kỳ source-grep nào lên file hiện thực. Đó đúng là những assert static-echo và wording mà AGENTS.md cấm, và chúng đã được phủ theo cấu trúc bởi typecheck cộng với test subprocess ở tầng CLI.

### Xác minh

```bash
# Cổng chính — cả hai bước đã kiểm chứng là có ý nghĩa trên máy này (xem *Cổng hoàn thành*)
bun run check:ts
bun test packages/utils/test/config-migrate.test.ts

# Thứ cấp — có thật, nhưng bị chặn bởi native addon ở đây. Chạy ở nơi addon build được.
bun test packages/coding-agent/test/config-migrate-cli.test.ts

# Nếu bắt buộc chạy test coding-agent tại máy, cài ninja TRƯỚC, rồi build addon:
#   brew install ninja
#   bun --cwd=packages/natives run build
# `bun --cwd=packages/natives run build` một mình FAIL trên máy này với:
#   CMake Error: CMake was unable to find a build program corresponding to "Ninja".
```

Nghiệm thu thủ công, một khi addon đã build và test CLI chạy được: (1) `omp config migrate` → in plan, không đụng gì, thoát 0. (2) `omp config migrate --apply` → in số lượng, di chuyển, thoát 0. (3) `omp config migrate --apply` lần nữa → báo 0 moves, thoát 0. (4) `omp config path` sau khi migrate resolve dưới root mới, và danh sách sessions là đúng những session cũ.

### Cổng hoàn thành

Hai câu lệnh, cả hai đã được đo trên máy này trước khi đề xuất.

(1) `bun run check:ts` — exit 0 trên cây sạch, kiểm chứng hai lần, khoảng 40s wall. Đây là tín hiệu tự động duy nhất cho tám site `config-cli.ts` và bốn site `config.ts`, và nó yếu: một site bị quên không sinh ra lỗi type nào cả, vì nới rộng `ConfigAction` để `VALID_ACTIONS` và `ACTIONS` vẫn typecheck như tập con, còn `switch` trên một union ở đây không có kiểm tra exhaustiveness (không `noImplicitReturns` trong tsconfig, không luật exhaustiveness trong `.oxlintrc.json`). Việc đếm là NGHĨA VỤ REVIEW, không phải nghĩa vụ của công cụ. Hãy nói thẳng điều đó trong mô tả PR thay vì ám chỉ rằng typecheck đã bắt được.

(2) `bun test packages/utils/test/config-migrate.test.ts` — đây mới là cổng thật, và nó được chọn vì riêng là bề mặt duy nhất trên máy này nơi bốn tính chất dưới test có thể thật sự bị bác bỏ. Nó đỏ trước khi công việc bắt đầu và chỉ xanh khi công việc đúng: hôm nay, chưa có file đó, câu lệnh thoát **1** (đã kiểm chứng: `bun test <missing-path>` → `EXIT=1`, "Tests need \".test\"… in the filename"); còn `bun test packages/utils/test/install-id.test.ts` trong CÙNG package thoát **0** với 5 pass / 0 fail (đã kiểm chứng), vì nó import subpath `@oh-my-pi/pi-utils/dirs` không kéo theo `@oh-my-pi/pi-natives`. Nên một kết quả xanh ở đây nghĩa là test đã chạy và đã pass; nó không thể có nghĩa là "không chạy được".

Điều KHÔNG phải cổng: `cd packages/coding-agent && bun test test/config-migrate.test.ts` — câu lệnh plan đưa ra. Trên máy này nó thoát **1** (đã kiểm chứng: 0 pass / 1 fail / 1 error, `Cannot find module .../packages/natives/native/pi_natives.darwin-arm64.node`) dù feature đã hiện thực hay chưa, bởi mọi test `packages/coding-agent` đều tải `@oh-my-pi/pi-natives` một cách gián tiếp. Lấy nó làm cổng nghĩa là có một cổng đỏ vĩnh viễn mà sắc đỏ của nó không mang thông tin gì về công việc — đúng cái failure mode mà brief cảnh báo. Cổng của plan phải được viết lại, không phải chỉ chạy.

Cổng này có đỏ được không: có, và đúng theo chiều quan trọng — nó phân biệt được "kỹ sư đã làm việc" với "test không chạy được". Nó đỏ theo bốn cách. Một cái đã chạy thật hôm nay: (a) không làm gì, không tạo gì → `bun test packages/utils/test/config-migrate.test.ts` thoát 1 vì file không tồn tại (đã kiểm chứng). Ba cái còn lại là suy luận, chưa chạy, và cần một hiện thực sai có chủ ý mới kiểm chứng được: (b) thu gọn luật quyết định còn hai trạng thái (gộp khi cả hai root tồn tại) → case 4 đỏ ở assert file marker; (c) để `planConfigMigration` ghi khi nó đọc → case 1 đỏ ở các assert still-exists. Không có (e): engine không có đường code nào sinh lại `install-id` — nó chỉ rename thư mục — nên "sinh lại install-id" không phải cách falsify riêng, chỉ là hệ quả của `movePath` hỏng đã bị case 2 bắt. Và kiểm chứng âm — thuộc tính làm cho cổng đáng tin — cũng đã kiểm chứng: `bun test packages/utils/test/install-id.test.ts` thoát 0 trong cùng package trên cùng máy, khi chưa làm gì cả. Cổng CLI ở `packages/coding-agent` thì KHÔNG đỏ có nghĩa ở đây, và điều đó được nói thẳng chứ không giấu: nó thoát 1 trên cây sạch vì thiếu native addon; nó chỉ trở nên có nghĩa sau `brew install ninja && bun --cwd=packages/natives run build`, và ngay cả khi đó vẫn chỉ là tín hiệu thứ cấp. Đừng để nó được trích dẫn làm nghiệm thu trong một PR ở máy này.

### Phụ thuộc

- **W4 — CỔNG CỨNG.** Danh sách ứng viên đọc có thứ tự (`getConfigDirCandidates`) và write root tách riêng (`getConfigWriteRoot`). Đã kiểm chứng là thiếu trên HEAD: `git grep -n 'getConfigWriteRoot\|getConfigDirCandidates' -- packages/utils/src/dirs.ts` không trả về gì. Không có W4, `~/.omp` ngừng resolve ngay khoảnh khắc W6 bật, và lệnh này là con đường quay lại duy nhất.
- **W3** — cấp tên mới mà `MigrationOptions.newBaseName` và `newAppName` được đặt theo. Base lấy từ `CONFIG_DIR_NAME`, XDG lấy từ `APP_NAME` — hai hằng khác nhau (xem *Cần người xác nhận* #4). Phép join ứng viên XDG soi theo `dirs.ts:360`, vốn đã chạy theo `APP_NAME`.
- **M2 frozen** (mốc nền toàn milestone), theo chính ghi chú phụ thuộc của plan.

Và nó chặn:

- **W6 — CỔNG CỨNG, mục đích đã tuyên bố.** W6 bật `CONFIG_DIR_NAME` tại `dirs.ts:27`; plan đòi W5 phải ship VÀ đã được dùng trong một bản phát hành thật trước, và W6 không được đất trước điều đó. W5 là đường quay lại thủ công cho người dùng từ một cú bật tệ.
- **Definition-of-done của M5:** một lần đổi tên mà trạng thái trên đĩa không sống sót qua cú bật thì không ship được nếu không có lệnh migrate đã test, idempotent, mặc định dry-run.

### Cách sai dễ nhất

Xếp theo mức độ tệ. (1) **CỔNG XANH MÀ CÔNG VIỆC CHƯA LÀM, NẾU ENGINE ĐỂ LẠI TRONG CODING-AGENT.** Đây là rủi ro lớn nhất và nó hệ quả trực tiếp của chính lựa chọn file test của plan. Plan đặt test ở `packages/coding-agent/test/config-migrate.test.ts`, nơi `bun test` không chạy được trên máy này. Kỹ sư làm theo plan đúng nghĩa sẽ tạo ra một test lỗi ngay lúc import, và cách đọc tự nhiên của "1 error" là "vấn đề môi trường có sẵn, không phải lỗi tôi". Đặt engine ở `packages/utils` và cổng ở `packages/utils` là cách giảm nhẹ, và nó không tốn gì về thiết kế — engine không có việc gì biết tới display hay CLI. (2) **MỘT `switch` CASE BỊ QUÊN LÀ MỘT NO-OP LẶNG** — plan không nhắc, và nó tệ hơn cả failure mà plan có. Nếu union `ConfigAction` và `ACTIONS` đã cập nhật mà `case "migrate"` tại `config-cli.ts:166` thì chưa, `omp config migrate` parse sạch, không khớp case nào, và `runConfigCommand` trả về sau khi không làm gì: exit 0, không output, không lỗi. Không có kiểm tra exhaustiveness nào bắt được (đã kiểm chứng: không `noImplicitReturns` trong tsconfig, không luật exhaustiveness trong `.oxlintrc.json`). Người dùng sẽ hợp lý kết luận migration đã thành công. Failure mode mà plan nêu — `parseConfigArgs` in "Unknown config command" — bị gắn nhầm chỗ, và chính hàm đó là dead code. (3) **MỘT TIẾN TRÌNH ĐANG CHẠY BỊ GIẬT RA KHỎI CHÍNH HỆ THỐNG FILE CỦA NÓ.** Nội dung đã kiểm chứng của một `~/.omp` thật trên máy này: `agent/agent.db`, `agent/history.db`, `agent/models.db`, mỗi file có sibling `-wal` và `-shm` còn sống; `agent/sessions/`; `run/daemons/10309d58e20548f5/`; `ssh-control/`; và `natives/18.2.4/pi_natives.darwin-arm64.node` nặng 157 MB. Một daemon hay session đang chạy giữ các file SQLite mở, và file WAL của nó phải đi cùng database nếu không thì DB hỏng khi mở lần sau. Một cái rename trần dưới tay một writer còn sống là sự cố mất dữ liệu, không phải chuyện thẩm mỹ. Danh sách rủi ro của plan không nhắc tới điều này. Giảm nhẹ tối thiểu: từ chối hoặc cảnh báo lớn khi phát hiện daemon lock, và không bao giờ tách một `.db` khỏi sibling `-wal`/`-shm` của nó. (4) **MOVE QUA THIẾT BỊ DỪNG GIỮA CHỪNG.** `~/.omp` và `$XDG_DATA_HOME` của người dùng có thể nằm trên hai volume khác nhau. Khi đó `fs.rename` ném `EXDEV` và — không có fallback `fs.cp` + `fs.rm` đã được chứng minh ở `gc-cli.ts:528` — người dùng còn lại với root gốc đã dời còn các root XDG bị bỏ rơi. Hãy dùng helper đã nâng lên; đừng tự viết một cái rename trần. (5) **MIGRATION TUYÊN BỐ THÀNH CÔNG MÀ KHÔNG GIAO ĐÚNG.** Hợp đồng lần-chạy-hai là toàn bộ câu chuyện an toàn, và nó sống hoặc chết theo luật ba nhánh. Thu gọn nó còn hai trạng thái (tồn tại → di chuyển) là một lần chạy lại sẽ ghi đè root mới bằng root cũ. Case 4 trong hợp đồng test là thứ duy nhất đứng giữa điều đó và dữ liệu của người dùng. (6) **MỘT LẦN `sed` CHẠY NHẦM PHẠM VI.** Không áp dụng cho work item này — W5 không chứa thay thế chuỗi hàng loạt, và nó không được phép có. Engine làm việc trên đường dẫn thư mục, không bao giờ trên nội dung file. Chuỗi duy nhất trong item này là hai tên thư mục, và chúng đến qua tham số.

### Cần người quyết

- Nên `config migrate` từ chối chạy khi daemon hoặc session còn sống, hay cảnh báo rồi vẫn chạy? Sự hiện diện đã kiểm chứng của `agent.db`/`history.db`/`models.db` với sibling `-wal`/`-shm` và `run/daemons/<hash>/` khiến đây là rủi ro hỏng dữ liệu có thật, nhưng một lệnh từ chối cứng nghĩa là người dùng có daemon kẹt không migrate được gì cả. Plan không nêu. Đề xuất: phát hiện daemon còn sống qua bề mặt lock sẵn có trong `packages/utils/src/file-lock.ts`, in một lời từ chối rõ ràng nêu lệnh dừng nó, và để `--force` ghi đè. Cần một quyết định sản phẩm trước khi hiện thực.
- `MigrationOptions.oldBaseName` là gì vào lúc gọi — chuỗi literal `".omp"`, hay giá trị của `getConfigDirName()` đọc trước khi W6 bật (nó trả `process.env.PI_CONFIG_DIR || CONFIG_DIR_NAME`)? Literal là đúng cho W5-sắp-ship (W6 chưa xuống), nhưng nó bỏ sót người dùng đặt `PI_CONFIG_DIR`. Nếu W5 bao giờ được backport hoặc chạy lại sau W6 thì literal sẽ lặng lẽ lỗi thời. Đề xuất: truyền vào bằng `getConfigDirName()`, và bắt `oldAppName` thành một hằng có tên ngay cạnh `APP_NAME` để quan hệ này tường minh và greppable.
- Có nên migrate các root XDG không, khi `init-xdg` là opt-in? Việc migrate `$XDG_*_HOME/omp` cho một người dùng chưa từng chạy `init-xdg` là no-op vì thư mục đó không tồn tại, nên luật ba nhánh hấp thụ mất. Nhưng trên một máy Linux mà `XDG_DATA_HOME` được set và có một thư mục `omp` không liên quan nằm ở đó, migrate sẽ di chuyển một thư mục nó không tạo ra. Đề xuất: yêu cầu path cũ trông giống một config root (chứa `agent/` hoặc `install-id`) trước khi đề xuất move, và báo bất cứ thứ gì khác là conflict thay vì lặng lẽ đổi tên nó. Lưu ý mối liên hệ với *Cần người xác nhận* #4: dùng nhầm tên có dấu chấm ở đây làm cả ba root XDG rơi vào nhánh "vắng", tức câu hỏi này trở nên vô nghĩa — mọi người đã chạy `init-xdg` đều không bao giờ được migrate, đúng failure mode #5.
- W5 có kèm một mục changelog không? Plan nói cập nhật changelog chỉ khi một work item yêu cầu, và mục W5 không yêu cầu. Vì vậy spec này không đề xuất mục nào. Xác nhận đó là ý định, vì `config migrate` là một lệnh người dùng nhìn thấy và nếu không thì changelog của M5 sẽ không có dấu vết nào của nó.
- Nên để engine ở `packages/utils` nói chung, hay một `packages/coding-agent/src/config-migrate/` mới với test chuyển sang một package chạy được? Engine có hình dạng giống dirs và không phụ thuộc gì ngoài `node:fs`/`node:path`, và `packages/utils/src/dirs.ts` là người hàng xóm tự nhiên của nó — nhưng vị trí đó được chọn ở đây ĐỂ CÓ CỔNG, và lý do đó nên được reviewer xác nhận chứ không được mặc định đồng ý.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "Bỏ sót `VALID_ACTIONS` thì … `parseConfigArgs` tại `config-cli.ts:82` in `Unknown config command: migrate` rồi `process.exit(1)` — lỗi chỉ xuất hiện khi người dùng gõ lệnh." Đây là lý do plan nêu để sửa cả bốn site action-list, và là lý do nó bảo reviewer đếm bốn dòng. | SAI — hàm là dead code, không có caller nào; failure mode đó không thể xảy ra | `parseConfigArgs` được định nghĩa ở `config-cli.ts:72` và được export, nhưng không gì trong repo gọi nó tới. Đường dispatch thật sự là class `Command` của ocelot trong `packages/coding-agent/src/commands/config.ts`, được đăng ký ở `packages/coding-agent/src/cli-commands.ts:98` (`{ name: "config", load: () => import("./commands/config").then(m => m.default) }`). Nên bỏ sót `VALID_ACTIONS` không sinh ra lỗi nào người dùng thấy. Chỉ thị sửa nó vẫn đúng về tính nhất quán — một parser chết lặng lẽ từ chối `migrate` là cái bẫy cho người sau này hồi sinh nó — nhưng failure mode plan nêu không có thật, và reviewer đi tìm thông báo lỗi đó sẽ không thấy. Bằng chứng: `git grep -rn 'parseConfigArgs' -- .` đúng ba hit — định nghĩa ở `packages/coding-agent/src/cli/config-cli.ts:72` và hai tài liệu plan. `git grep -rn 'runConfigCommand'` cho thấy caller sản xuất duy nhất là `config.ts:50`; `initXdg` cũng chỉ được gọi từ `config-cli.ts:183`. |
| Failure mode của plan cho một entry `ACTIONS` bị quên là thông báo `Unknown config command: migrate` từ `config-cli.ts:83`. | SAI TẦNG — lỗi thật đến từ framework, với thông điệp khác | `ACTIONS` được truyền làm `options: ACTIONS` cho `Args.string(...)` tại `config.ts:18`. Việc validate nằm ở tầng ocelot, `packages/utils/src/cli.ts:278-283`, ném `CliUsageError` với nội dung `Expected action to be one of: list, get, set, reset, path, init-xdg; got "migrate"`. Nên site thì đúng (mảng quả thật phải được cập nhật) nhưng cơ chế và thông điệp đều khác với plan mô tả. Kỹ sư gỡ lỗi theo thông điệp của plan sẽ đi săn một chuỗi mà chương trình không bao giờ in ra. Bằng chứng: `sed -n '259,290p' packages/utils/src/cli.ts`; `class CliUsageError extends Error` ở `packages/utils/src/cli.ts:38`; binding `options: ACTIONS` ở `config.ts:18`. |
| Danh sách rủi ro của plan nêu bốn cách để làm sai. Nó không nêu cách lặng lẽ thất bại. | THIẾU — failure nguy hiểm nhất là một no-op im lặng, và plan bỏ sót | Quên nhánh `case "migrate"` trong `switch (cmd.action)` tại `config-cli.ts:166` tệ hơn bất cứ mục nào trong danh sách của plan. Với union và `ACTIONS` đã cập nhật, `omp config migrate` parse thành công, `runConfigCommand` không khớp case nào, và hàm trả về sau khi không làm gì: **exit 0, không output, không lỗi**. Người dùng kết luận dữ liệu của họ đã di chuyển; nó đã không. Không có kiểm tra exhaustiveness nào bắt được — TypeScript không bắt một `switch` trên union phải đầy đủ trừ khi có cờ liên quan của `strict` hoặc một guard tường minh, tsconfig của repo không đặt `noImplicitReturns`, và `.oxlintrc.json` không có luật switch-exhaustiveness. Điều này cần một test và một kiểm tra của reviewer mà plan hiện không yêu cầu. Bằng chứng: `sed -n '163,186p' config-cli.ts` — switch có các arm `list`, `get`, `set`, `reset`, `path`, `init-xdg` và không có `default`. `git grep -n 'noImplicitReturns\|strict' -- tsconfig.json packages/coding-agent/tsconfig.json` không trả về gì. Danh sách luật đầy đủ của `.oxlintrc.json` chỉ có prefer-const, no-unused-vars, no-thenable, no-unused-private-class-members, no-eval, no-shadow-restricted-names, no-template-curly-in-string, cùng một khối entry `off` tường minh. |
| "Cả bốn đều là `["list", "get", "set", "reset", "path", "init-xdg"]` — bốn bản sao của cùng một danh sách." Bốn bản sao. | THIẾU — có một bản sao thứ năm, và nó cũng là dead code | `printConfigHelp()` tại `config-cli.ts:405` chứa bản dựng thứ năm của cùng danh sách đó, trong khối Commands, kết thúc ở dòng 414 với `  init-xdg           Initialize XDG Base Directory structure`. Nó cũng có zero caller. Nên số bản sao còn sống là đúng bốn, nhưng một reviewer đếm chuỗi `init-xdg` trên cả hai file sẽ thấy năm lần xuất hiện và có thể hoặc bỏ sót một, hoặc thêm một cái thừa. Help text hôm nay không tới được (oclot tự dựng help từ `static args`, và `commandHelp.configHelp` tại `command-help.ts:51` chỉ là một chuỗi mô tả), nên cập nhật nó là vì tính nhất quán và cho ngày ai đó hồi sinh nó — hãy nói rõ điều đó thay vì tính nó là mang tính quyết định. Bằng chứng: `git grep -rn 'printConfigHelp' -- packages/` đúng một dòng. `sed -n '405,432p'` cho thấy khối Commands và khối Options (`--json  Output as JSON`, nơi một dòng `--apply` sẽ thuộc về nếu hàm từng hồi sinh). `command-help.ts:51` là `export const configHelp = { description: "Manage configuration settings" } satisfies CommandMetadata;`. |
| Plan chỉ đạo kỹ sư đọc `packages/utils/src/dirs.ts:1076, 341-352, 360, 384`, và chỗ khác dẫn comment `DirResolver` tại `dirs.ts:341-352` làm bản ghi của bug orphan-profile thật. | GẦN ĐÚNG — ba trong bốn tham chiếu dòng chính xác; khoảng comment lệch một ở cả hai đầu | `1076`, `360` và `384` đúng tuyệt đối: dòng 1076 là `const INSTALL_ID_FILE = "install-id";`, dòng 360 là `const appRoot = path.join(value, APP_NAME);`, dòng 384 là `// XDG flattens the agent/ prefix: ~/.omp/agent/sessions → $XDG_DATA_HOME/omp/sessions`. Comment orphan-profile nằm ở **340-351**, không phải 341-352 — dòng 352 là dòng code đầu tiên sau nó (`let xdgData: string | undefined;`). Claim nội dung thì đúng và quan trọng: comment ghi rằng một profile có tên có thể resolve về `~/.omp/profiles/<name>` ở lần kích hoạt đầu và lặng lẽ chuyển sang `$XDG_*_HOME/omp/profiles/<name>` ngay khoảnh khắc base xuất hiện, làm mồ côi trạng thái trước đó. Bằng chứng: `awk 'NR>=336 && NR<=356 {print NR": "$0}' packages/utils/src/dirs.ts`; `grep -n` xác nhận dòng 360, `const profilePath = path.join(appRoot, "profiles", profile);` ở 362, và comment XDG-flatten ở 384. |
| "di chuyển … và xử lý riêng layout profile có tên … Sai lầm thứ hai: di chuyển cây mà không xử lý riêng layout profile có tên, làm mất trạng thái profile". Profile có tên được trình bày như một layout riêng cần xử lý riêng. | NÓI QUÁ — profile lồng nhau, không phải layout riêng; nguy hiểm thật hẹp hơn và khác đi | Một profile có tên không phải là một layout riêng. `getProfileConfigRoot()` trả về `path.join(getBaseConfigRoot(), "profiles", profile)`, nên mọi profile có tên đều nằm BÊN TRONG base root và một cái move root đệ quy đã mang theo nó tự động. Không có root profile riêng nào để xử lý. Nguy hiểm profile có tên thật sự là nguy hiểm XDG: đường dẫn profile XDG `$XDG_*_HOME/omp/profiles/<name>` chỉ được tra khi nó đã tồn tại (`if (fs.existsSync(profilePath)) return profilePath;`), nên một cái move XDG sai hoặc dở dang làm đổi root mà một profile resolve tới và làm mồ côi trạng thái của nó. Giữ case test profile có tên — nó đáng có — nhưng viết nó dựa trên đường dẫn profile XDG, và đừng để nó biện minh cho code xử lý thừa trong trường hợp `profiles/` thuần mà một cái rename đã phủ. Bằng chứng: `sed -n '118,121p' packages/utils/src/dirs.ts` — `function getProfileConfigRoot(profile) { const root = getBaseConfigRoot(); return profile ? path.join(root, "profiles", profile) : root; }`, với `getBaseConfigRoot()` ở 114-115 là `path.join(os.homedir(), getConfigDirName())`. Chốn tồn tại của profile XDG ở `dirs.ts:361-365`. Kiểm chứng trên máy này: `ls ~/.omp/profiles` không trả về gì, và một `~/.omp` thật chứa `agent/`, `cache/`, `logs/`, `run/`, `natives/`, `puppeteer/`, `ssh-control/`, `install-id`, `autoqa.db`, `gpu_cache.json`. |
| "**Lệnh:** `bun run check && (cd packages/coding-agent && bun test test/config-migrate.test.ts)`" — và plan đặt test mới ở `packages/coding-agent/test/config-migrate.test.ts`. | KHÔNG DÙNG ĐƯỢC LÀM CỔNG TRÊN MÁY NÀY — test không chạy được, nên đỏ và xanh đều không mang thông tin | Cổng của plan là một hệ đồng nhất ở đây: nó đỏ trước công việc và sau công việc, vì một lý do không liên quan gì tới công việc. Mọi test `packages/coding-agent` đều tải `@oh-my-pi/pi-natives` gián tiếp, mà máy này không có addon đã build. Cách sửa không phải là cài addon (cần `brew install ninja` trước) mà là đặt engine và test của nó ở nơi đồ thị import sạch: engine ở `packages/utils/src/config-migrate.ts`, test ở `packages/utils/test/config-migrate.test.ts`, import bằng subpath. Bề mặt đó đã được kiểm chứng chạy được hôm nay, nên cổng thật sự bác bỏ được. Test tầng CLI vẫn thuộc về `packages/coding-agent` để cho đủ, nhưng nó phải được dán nhãn là không-gate trên máy này thay vì được trích dẫn làm nghiệm thu. Bằng chứng: `bun test packages/coding-agent/test/config-cli.test.ts` → `0 pass / 1 fail / 1 error`, lỗi `Cannot find module '.../packages/natives/native/pi_natives.darwin-arm64.node' from '.../packages/natives/native/loader-state.js'`, EXIT=1; `config-cli-credentials.test.ts` y hệt. `bun test packages/utils/test/install-id.test.ts` → `5 pass / 0 fail`, EXIT=0. `packages/utils/package.json:36-39` khai `"./*": {"types": "./src/*.ts", "import": "./src/*.ts"}`. `bun test packages/utils/test/does-not-exist.test.ts` → EXIT=1, nên cổng đỏ trước khi công việc tồn tại. `bun run check:ts` → EXIT=0, đo hai lần, ~40s. |
| Danh sách lệnh của plan cho W5 không hề nhắc tới cờ `--apply`, dù `--apply` là toàn bộ hợp đồng hướng-tới-người-dùng của work item ("yêu cầu `--apply` tường minh"). | THIẾU — cờ cần bốn site sửa đổi nữa mà plan không đếm | Thêm `--apply` là bốn sửa đổi ngoài bốn site action-list, và một kỹ sư làm theo chỉ thị "bốn chỗ, đếm bốn dòng" của plan sẽ tạo ra một lệnh nhận `migrate` rồi bỏ qua cờ đó. Bốn chỗ là: (1) `ConfigCommandArgs.flags` tại `config-cli.ts:26-28`, hiện chỉ khai `json?: boolean` — nên `apply` không có chỗ để nằm; (2) nhánh `--apply` trong vòng lặp flag của `parseConfigArgs` tại `config-cli.ts:93-101`, cạnh nhánh `--json` sẵn có; (3) `static flags` trong `config.ts:31-33`, hiện chỉ khai `json` — parser oclot sẽ từ chối một cờ chưa khai, nên chỗ này người dùng thấy ngay cả khi các chỗ kia đã sửa; (4) object literal `cmd.flags` trong `config.ts:44-46`, hiện chỉ truyền `json: flags.json`. Tổng: tám site trong `config-cli.ts`, bốn trong `config.ts`. Chỉ thị review bằng cách đếm dòng của plan là đúng, nhưng con số phải đếm là mười hai, không phải bốn. Bằng chứng: `sed -n '20,29p' config-cli.ts` cho thấy `flags: { json?: boolean; }` là toàn bộ kiểu; `sed -n '92,101p'` cho thấy vòng lặp có nhánh `if (arg === "--json")` và một nhánh positional `else if (!arg.startsWith("-"))`, không có cờ nào khác; `cat -n config.ts` cho thấy dòng 31-33 và 44-46. `packages/utils/src/cli.ts:243-258` là nơi một `--apply` chưa khai sẽ bị từ chối. |
| Không phải claim của plan, nhưng là một thiếu sót của plan có chi phí trực tiếp: không gì trong plan nói một helper move an toàn với EXDEV đã tồn tại trong cây. | THIẾU SÓT — helper đã tồn tại và AGENTS.md cấm fork nó | `gc-cli.ts:528` đã hiện thực đúng cái move mà work item này cần, gồm cả fallback qua thiết bị: mkdir thư mục cha đích, `fs.rename`, và khi `code === "EXDEV"` thì `fs.cp(…, { recursive: true })` + `fs.rm(…, { recursive: true, force: true })` cho thư mục hoặc `copyFile` + `unlink` cho file. Nó private ở cấp module nên vô hình với ai đó đang viết file mới — đó đúng là cách một bản hiện thực thứ hai xuất hiện. AGENTS.md nói thẳng đây là một bug: "Two implementations of the same thing is a bug even when both work" và "Missing capability? Extend the central helper … don't fork its logic locally." Trường hợp xuyên thiết bị không phải lý thuyết cho work item này — base root và các root XDG có thể nằm trên hai volume khác nhau, và một cái rename trần để lại người dùng ở trạng thái migrate dở. Bằng chứng: `sed -n '528,546p' packages/coding-agent/src/cli/gc-cli.ts`; `git grep -rn 'movePath' -- packages/` đúng ba dòng. Xử lý EXDEV là một pattern được công nhận khắp repo: `session/session-manager.ts:235,300,2017,2054`, `lsp/edits.ts:364`, `internal-urls/url-filesystem.ts:407`. |
| Ghi chú của W4 rằng `PI_CONFIG_DIR` giữ "**68 lượt / 25 file** (16 file `.ts`)". | LỠI THỜI — số đo không khớp | Không phải bề mặt phụ thuộc của work item này, nhưng được ghi lại vì nó được đo trong lúc kiểm chứng và tính đúng đắn của W5 phụ thuộc vào việc `PI_CONFIG_DIR` tiếp tục chạy (N16: tiền tố `PI_*`/`OMP_*` được giữ vĩnh viễn). Toàn repo: **78 lượt xuyên 27 file**. Chỉ `.ts`: **52 lượt xuyên 17 file**. Con số 68/25/16 của plan lệch 10 hit và 2 file so với toàn repo. Không gì trong W5 phụ thuộc vào con số chính xác, nhưng một ngân sách `sed` ở phía sau dựa trên 68 sẽ quét thiếu. Bằng chứng: `git grep -n 'PI_CONFIG_DIR' -- . \| wc -l` → 78; `git grep -l 'PI_CONFIG_DIR' -- . \| wc -l` → 27; `git grep -n 'PI_CONFIG_DIR' -- '*.ts' \| wc -l` → 52; `git grep -l 'PI_CONFIG_DIR' -- '*.ts' \| wc -l` → 17. Giới hạn trong `packages/`: 53 lượt xuyên 18 file. |

## Cần người xác nhận

Bốn chỗ spec mâu thuẫn với chính nó. Không tự sửa ở trên — cần người quyết định trước khi gõ code.

1. **Dùng `fs.exists` bất đồng bộ.** Mô tả ở *File cần chạm tới* nói `existsSync` còn khối *Hình dạng code* dùng `await fs.exists(...)` từ `node:fs/promises` — phải chốt một cái. Chọn `await fs.exists(...)`: nó khớp khối code, `fsPromises.exists` có thật (đã kiểm chứng: `typeof` → `function`), và AGENTS.md cấm API đồng bộ trong luồng async. Sửa mô tả trong bảng thành "pure read: `fs.exists` trên từng cặp ứng viên, không ghi gì".
2. **Đếm mười hay mười hai site ghi?** `plan_corrections` buộc reviewer đếm "tám site trong `config-cli.ts`, bốn trong `config.ts`" và nói con số phải đếm là mười hai. Nhưng chính mục `packages/coding-agent/src/commands/config.ts` liệt kê "bốn sửa đổi" trong đó sửa đổi thứ tư là "Không thêm arg hay positional nào… đừng thêm entry `args` giả" — tức một chỉ thị không làm gì, không phải một site ghi. Số site ghi thật trong `config.ts` là ba (`ACTIONS`, `static flags`, object literal `cmd`), nên tổng là mười một, không phải mười hai. Bước 7 lặp lại con số "tám và bốn". Cần chốt số để review biết đếm cái gì.
3. **Bề mặt export có thêm `MigrationKind` không?** Mục *File cần chạm tới* liệt kê chính xác `export interface MigrationMove { readonly kind: "base" | "xdg-data" | "xdg-state" | "xdg-cache"; … }` — union nội tuyến, không có type alias. Khối *Hình dạng code* lại export thêm `export type MigrationKind = "base" | "xdg-data" | "xdg-state" | "xdg-cache";` và dùng nó ở cả `MigrationMove` và `MigrationConflict`, cũng như trong `satisfies readonly { kind: MigrationKind; variable: string }[]`. Hai mô tả về bề mặt public khác nhau; cần chốt alias có được export hay không.
4. **Cặp tên nào cho base và cặp nào cho XDG?** Base root dùng `CONFIG_DIR_NAME` (`.omp`, có dấu chấm, và `getConfigDirName()` tại `dirs.ts:297-299` còn cho phép `PI_CONFIG_DIR` ghi đè), còn root XDG dùng `APP_NAME` (`omp`, không dấu chấm, `dirs.ts:21`). Dùng chung một cặp sẽ khiến cả ba root XDG rơi vào nhánh "vắng" của luật ba nhánh và bị bỏ qua im lặng. Khối *Hình dạng code* đã tách bốn trường `oldBaseName`/`newBaseName`/`oldAppName`/`newAppName`; cần chốt xem `oldBaseName` có được truyền vào bằng `getConfigDirName()` đọc trước khi W6 bật hay giữ là literal `".omp"`. Bằng chứng: `sed -n '21p;27p' packages/utils/src/dirs.ts`, `sed -n '360p'`, `sed -n '5p' packages/coding-agent/src/cli/commands/init-xdg.ts`, `sed -n '384p' packages/utils/src/dirs.ts`.


---


## W6. Lật `CONFIG_DIR_NAME` (sóng 2)

**Sóng:** 2

**Effort:** S cho phần lật chính, S cho tuỳ chọn W6a (b) như mô tả ở đây — nhưng lớn hơn nhiều so với tuyên bố "một dòng" của plan. Đếm thật: 1 dòng bị lật trong `dirs.ts`, 1 hằng số mới, 4 call site được trỏ lại (chỉ 1 trong số đó plan có nêu tên), 1 test sẵn có được nới bỏ chốt giá trị, 1 test sẵn có phải sửa theo, 1 test mới, 1 dòng trong `do_not_rename`, 1 mục changelog. Tuỳ chọn (a) của plan (dual-read ở cấp project) vẫn là M và không nên chọn nếu chưa có quyết định.

**Rủi ro chính:** Cách sai dễ nhất là coi W6a là một thay đổi một dòng tại `dirs.ts:590` vì đó là điều plan nói, rồi bỏ mặc `omfg-controller.ts:285`, `discovery/helpers.ts:47` và `config.ts:12` vẫn đọc `CONFIG_DIR_NAME`. Cả ba là các lần đọc project-root ở tầng sản phẩm mà phân tích W6a của plan bỏ sót hoàn toàn; cả ba hỏng trong im lặng — rules phạm vi project phân giải về một thư mục rỗng, discovery skills/agents cục bộ project trả về rỗng, và skills/agents/hooks/commands cấp project biến mất khỏi thư mục `.omp` đã commit, không lỗi nào, không cảnh báo thiếu config. Sai lầm khó nhất thứ hai là để nguyên assertion `".omp"` tại `legacy-pi-cli-exports.test.ts:14`, biến một lần di chuyển còn cứu được thành một test đỏ mà không ai giải thích được. Sai lầm thứ ba là lật `CONFIG_DIR_NAME` trước khi trỏ lại các call site, tạo ra một khoảng thời gian mà một commit dở dang làm hỏng thầm lặng các thư mục project.

**Hiệu ứng người dùng thấy:** Config, session và setting mới được ghi dưới `~/.ultraworkers` thay vì `~/.omp`. Người dùng mà home root của họ vẫn chỉ có `~/.omp` thì giữ nguyên mọi session, setting và install-id, và không thấy lỗi nào. Mọi project có thư mục `.omp` đã commit trong repo — gồm cả scope "This project (.omp/rules)" trong trình soạn thảo rules — vẫn phân giải về đúng thư mục `.omp` đó, không đổi. Điều người dùng không bao giờ thấy là lỗi mà toàn bộ công việc này sinh ra để ngăn: không lỗi, không cảnh báo, không thiếu config, chỉ là đăng nhập lại âm thầm vì thư mục project không còn được tìm thấy.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts` | sửa | Dòng 27: lật `CONFIG_DIR_NAME` từ `".omp"` thành `".ultraworkers"`. Thêm hằng số được export mới `PROJECT_DIR_NAME = ".omp"` ngay sau nó, kèm docblock nói rõ nó cố ý không được suy ra từ `CONFIG_DIR_NAME` và được ghim cho toàn bộ milestone. Dòng 590: `getProjectAgentDir()` join `PROJECT_DIR_NAME` thay vì `CONFIG_DIR_NAME`. | Có — dòng 27 là `export const CONFIG_DIR_NAME: string = ".omp";` (xác nhận bằng `grep -n`). Dòng 589 là chữ ký `getProjectAgentDir`, dòng 590 là `return path.join(cwd, CONFIG_DIR_NAME);` (xác nhận). Đây là điểm lật plan trích dẫn và nó chính xác. |
| `packages/coding-agent/src/modes/controllers/omfg-controller.ts` | sửa | Dòng 2: import `PROJECT_DIR_NAME` thay vì `CONFIG_DIR_NAME`. Dòng 285: dựng đường dẫn rules phạm vi project từ `PROJECT_DIR_NAME` thay vì `CONFIG_DIR_NAME`. | Có — dòng 2 là `import { CONFIG_DIR_NAME, prompt } from "@oh-my-pi/pi-utils";` và dòng 285 là `filePath: path.join(this.ctx.sessionManager.getCwd(), CONFIG_DIR_NAME, "rules", `${ruleName}.md`)` (cả hai xác nhận bằng `sed`). **KHÔNG CÓ TRONG PLAN.** Đây là lần đọc project-root thứ hai ở tầng sản phẩm mà phân tích W6a của plan không nhắc. Bỏ sót nó khiến rules phạm vi project âm thầm phân giải về một thư mục mang tên mới, rỗng. |
| `packages/coding-agent/src/discovery/helpers.ts` | sửa | Dòng 6: import `PROJECT_DIR_NAME` thay vì `CONFIG_DIR_NAME`. Dòng 47: đặt `projectDir: PROJECT_DIR_NAME` trong mục `SOURCE_PATHS.native`. | Có — dòng 47 là `projectDir: CONFIG_DIR_NAME,` bên trong `SOURCE_PATHS.native` (xác nhận bằng `sed -n '40,55p'`). **KHÔNG CÓ TRONG PLAN.** Đây là lần đọc project-root thứ ba, được `discovery/builtin.ts:44` và `discovery/skillshare.ts:93` tiêu thụ. Bỏ sót nó khiến discovery skills/agents cục bộ project âm thầm trả về rỗng. |
| `packages/coding-agent/src/config.ts` | sửa | Dòng 12: `priorityList` dùng `CONFIG_DIR_NAME` làm `dir`, và danh sách này nuôi **cả** `USER_CONFIG_BASES` (dòng 84) **và** `PROJECT_CONFIG_BASES` (dòng 90). Vì vậy `CONFIG_DIR_NAME` ở đây là một lần đọc project-root thứ TƯ, không phải home-root. Sửa: tách `priorityList` thành hai danh sách, hoặc để `priorityList[0].dir = PROJECT_DIR_NAME` và dựng `USER_CONFIG_BASES[0]` từ `getConfigDirName()`/`getConfigAgentDirName()` một cách tường minh. **KHÔNG CÓ TRONG PLAN, VÀ CỔNG MỤC 5 SẼ TỰ THA TẦM NÓ.** | Có — dòng 11-15 là `priorityList`, dòng 84-87 `USER_CONFIG_BASES`, dòng 90-93 `PROJECT_CONFIG_BASES`, dòng 147-149 và 224-232 tiêu thụ ở cấp project (xác nhận bằng `sed`). Consumer sản phẩm: `extensibility/custom-commands/loader.ts:110`. |
| `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` | sửa | Dòng 14: thay `expect(CONFIG_DIR_NAME).toBe(".omp")` bằng một assertion khẳng định `CONFIG_DIR_NAME` của shim gắn với hằng số HOME root và **không** phải hằng số project root. | Có — dòng 14 hard-code literal `".omp"` (xác nhận bằng `sed`). **KHÔNG CÓ TRONG PLAN, VÀ TEST NÀY SẼ FAIL NẾU KHÔNG SỬA.** Chính tên test là "re-exports parseArgs and CONFIG_DIR_NAME from the legacy package root" — hợp đồng mà nó bảo vệ là wiring của barrel được mô tả tại `legacy-pi-coding-agent-shim.ts:1587-1591`, không phải giá trị. Chính chốt giá trị là thứ vỡ khi lật. |
| `scripts/rename/do_not_rename.tsv` | tạo | Thêm dòng N14 **với schema BẮT BUỘC có cột phân tầng**, vì lượt sed của W7 khớp theo giá trị: `value=omp`, `scope=project`, `applies_to=packages/utils/src/dirs.ts:getProjectAgentDir, packages/coding-agent/src/modes/controllers/omfg-controller.ts:#resolveTarget, packages/coding-agent/src/discovery/helpers.ts:SOURCE_PATHS.native.projectDir, packages/coding-agent/src/config.ts:PROJECT_CONFIG_BASES[0]`, reason "project-level directory is usually committed to the user's git repo; renaming it rewrites their working tree rather than moving machine-local state", source `packages/utils/src/dirs.ts:589-591`. Hàng HOME-root của cùng chuỗi `.omp` KHÔNG được có trong bảng này — nó phải được thay bằng W4/W5. Nếu bảng không phân biệt được `scope=project` với home-root thì nó là bảng vô hiệu và phải bị chặn, không phải tạo. | **CHƯA KIỂM CHỨNG.** §2.3 của plan định nghĩa `do_not_rename` là bảng 17 dòng nhưng không ghim đường dẫn file nào, và `scripts/rename/` chưa tồn tại (xác nhận: `ls scripts/rename` → No such file or directory). File anh em `scripts/rename/disposition.tsv` của W8b được plan nêu tên, nên `scripts/rename/` là nơi dự kiến. **PHẢI XÁC NHẬN ĐƯỜNG DẪN VỚI BÊN W7/W8B TRƯỚC KHI TẠO.** |
| `packages/utils/CHANGELOG.md` | sửa | Thêm dưới `## [Unreleased]`: `### Changed` → `New config, sessions and settings are now written to ~/.ultraworkers instead of ~/.omp. Existing installs are read from both; run \`omp config migrate\` to move your data. Project-level .omp directories are unchanged and keep working.` Không có nhật ký gốc → mục Internal dùng dạng `([#NNN](https://github.com/can1357/oh-my-pi/issues/NNN))`, thay số sau khi issue được mở. | Có — `AGENTS.md` mục "Changelog" bắt buộc mọi thay đổi người dùng thấy được có mục dưới `## [Unreleased]`, và W6 chính là thứ đổi danh tính trên đĩa của người dùng (`~/.omp` → `~/.ultraworkers`). Đây là mục dễ bị quên nhất vì nó là "đổi tên", trông như việc nội bộ. |
| `packages/utils/test/project-dir-name-pinned.test.ts` | tạo | File test mới. Khẳng định rằng sau khi lật, hai root đã phân kỳ, và `getProjectAgentDir()` phân giải về thư mục project `.omp` đã commit kể cả khi trong cùng project vẫn tồn tại một thư mục mang tên theo HOME root MỚI. | Có — theo quy ước của `packages/utils/test/dirs.test.ts`: `bun:test`, `TempDir`, không mutate `process.env`, không `mock.module`, không source-grep. Thư mục cha `packages/utils/test/` xác nhận tồn tại. |

### Các bước

1. **Cổng cứng: xác nhận W4 và W5 đã thực sự xuất bản và đã được dùng trong một bản phát hành thật.** W4 thêm danh sách ứng viên đọc có thứ tự và write root tách biệt, W5 bán ra `config migrate`. Cho tới khi cả hai tồn tại thì không có đường quay lại dữ liệu của người dùng, và mục này không được bắt đầu. Xác minh ngay lúc này ba file test của W4 có trên đĩa:
   ```bash
   ls packages/utils/test/config-dir-dual-root.test.ts packages/utils/test/install-id-legacy-read.test.ts packages/utils/test/config-dir-write-root.test.ts
   ```
   Trước khi gõ bất kỳ neo dòng nào trong spec này, chạy `git rev-parse --short HEAD` và xác nhận nó vẫn là `1454dc0`. Nếu đã dịch chuyển, chạy lại `grep -n 'CONFIG_DIR_NAME' packages/utils/src/dirs.ts` và `sed -n '275,295p' packages/coding-agent/src/modes/controllers/omfg-controller.ts` trước khi tin các dòng 285/47/590 còn đúng.

2. **Tạo `scripts/rename/` và `do_not_rename.tsv` với dòng N14** (xem bảng file cần chạm tới). Xác nhận đường dẫn với bên W7/W8b trước — plan không ghim nó. Làm việc này **ĐẦU TIÊN, không phải cuối**: chính registry biến việc ghim này thành một quyết định có chủ ý, thay vì một tai nạn.

3. **Trong `packages/utils/src/dirs.ts`, thêm `PROJECT_DIR_NAME = ".omp"` ngay sau `CONFIG_DIR_NAME` tại dòng 27**, kèm docblock nói nó cố ý KHÔNG được suy ra từ `CONFIG_DIR_NAME`, rằng thư mục này thường đã được commit vào git repo của người dùng, và rằng đổi tên nó là thay đổi working tree chứ không phải đổi tên sản phẩm. Giữ docblock ngắn; lý do đầy đủ nằm ở `do_not_rename` N14.

4. **Trỏ lại `getProjectAgentDir()` về `PROJECT_DIR_NAME`.** Chữ ký hàm và tham số mặc định giữ **nguyên vẹn như cũ**. Đây là site duy nhất plan nêu tên.

5. **Trỏ lại đường dẫn rules phạm vi project của omfg về `PROJECT_DIR_NAME`**, và đổi import ở dòng 2 từ `CONFIG_DIR_NAME` sang `PROJECT_DIR_NAME`. **Đã xác nhận:** chuỗi nhãn `'This project (.omp/rules)'` là literal ở `omfg-controller.ts:38` (và ở `omfg-controller.test.ts:15`), KHÔNG dựng từ hằng số — nên nó giữ đúng `.omp` và không cần sửa. Ghi câu này vào commit message để người đọc sau biết là cố ý.

6. **Trỏ lại `SOURCE_PATHS.native.projectDir` về `PROJECT_DIR_NAME`**, và đổi import ở dòng 6. Để `userBase` và `userAgent` trên getter `getConfigDirName()` hiện có của chúng — đó là HOME root và phải theo cơ chế phân giải ứng viên của W4, không phải theo chốt project. **Sự bất đối xứng này là cố ý và chính là toàn bộ thiết kế**: home root thì di động được và đọc kép, project root thì ghim cứng.

7. **Lật `CONFIG_DIR_NAME` tại dòng 27 thành `".ultraworkers"`.** Làm việc này **SAU CÙNG**, sau khi cả bốn call site đã được trỏ lại, để trạng thái trung gian của working tree không bao giờ có một project root đã bị đổi tên.

8. **Sửa test legacy shim.** Trong `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts`, thay assertion literal `".omp"` ở dòng 14 bằng một assertion khẳng định `CONFIG_DIR_NAME` của shim bằng `CONFIG_DIR_NAME` home-root được import từ `@oh-my-pi/pi-utils` **VÀ** khác với `PROJECT_DIR_NAME`. Sau khi lật, hai hằng số đó khác nhau, nên nửa sau có răng: nó đỏ nếu có ai đó trỏ lại bề mặt tương thích legacy về hằng số project đã ghim. Giữ nguyên assertion `parseArgs` hiện có.

9. **Viết `packages/utils/test/project-dir-name-pinned.test.ts`** theo `code_shape` bên dưới. Nó phải tạo **CẢ HAI**: một thư mục `.omp/rules` và một thư mục mang tên theo `CONFIG_DIR_NAME` mới, trong cùng một project tạm, rồi khẳng định `getProjectAgentDir()` phân giải về cái `.omp`. Thư mục thứ hai chính là thứ biến assertion thành một test thứ tự ưu tiên thật, chứ không phải một phản chiếu hằng số.

10. **Chạy các câu lệnh xác minh.** Rồi chạy các file test sẵn có hard-code literal `.omp` cấp project làm bằng chứng thật rằng thư mục project đã commit không bị ảnh hưởng, theo bốn nhóm riêng biệt: **(i)** site `dirs.ts:590` — `omfg-controller.test.ts`, `agent-session-rules-reload.test.ts`, `advisor-toggle.test.ts`, `extensions-discovery.test.ts`, `agent-session-concurrent.test.ts`; **(ii)** site `omfg-controller.ts:285` — `omfg-controller.test.ts`; **(iii)** site `discovery/helpers.ts:47` — `test/discovery/monorepo-skills.test.ts`, `test/discovery/builtin-rules-md.test.ts`, `test/mcp-config-scope-dedup.test.ts`, `test/discovery/pi-config-dir.test.ts`; **(iv)** site `config.ts:12` — `test/discovery/pi-config-dir.test.ts`, `test/marketplace/project-scope.test.ts`. Nhóm (iii) và (iv) KHÔNG được bỏ: không có gì trong cổng cũ đỏ nếu thiếu chúng. Đây là test có sẵn và **không được** cần sửa trừ `pi-config-dir.test.ts`; nếu bất kỳ cái nào đỏ, một call site đã bị bỏ sót.

11. **Commit thành MỘT commit độc lập chỉ chứa các file này** (kể cả dòng `packages/utils/CHANGELOG.md` ở trên), trên nền W4 và W5 đã xuất bản. Không gộp với bất kỳ công việc đổi tên nào khác. Toàn bộ ý nghĩa của việc tách commit là để khoảnh khắc một người dùng mất session phải là một dòng revert, chứ không phải thứ gì bị chôn vùi trong một diff 4107 file.

### Hình dạng code

```typescript
// packages/utils/src/dirs.ts — around line 27

/** Config directory name for the home root (e.g. ".ultraworkers"). */
export const CONFIG_DIR_NAME: string = ".ultraworkers";

/**
 * Project-local config directory name, relative to the project root.
 *
 * Deliberately NOT derived from CONFIG_DIR_NAME. This directory usually lives in
 * the user's repo and is committed to git, so renaming it rewrites their working
 * tree rather than moving machine-local state. Pinned for the whole rebrand
 * milestone — see do_not_rename N14.
 */
export const PROJECT_DIR_NAME: string = ".omp";

// packages/utils/src/dirs.ts:589-591
/** Get the project-local config directory (.omp). */
export function getProjectAgentDir(cwd: string = getProjectDir()): string {
	return path.join(cwd, PROJECT_DIR_NAME);
}

// packages/coding-agent/src/modes/controllers/omfg-controller.ts:283-288
#resolveTarget(location: string, ruleName: string): { filePath: string; level: OmfgRuleSourceLevel } {
	if (location === GLOBAL_OPTION) {
		return {
			filePath: path.join(this.ctx.settings.getAgentDir(), "rules", `${ruleName}.md`),
			level: "user",
		};
	}
	return {
		// PROJECT_DIR_NAME, not CONFIG_DIR_NAME: this directory is committed in
		// the user's repo and must keep resolving after the home root is renamed.
		filePath: path.join(this.ctx.sessionManager.getCwd(), PROJECT_DIR_NAME, "rules", `${ruleName}.md`),
		level: "project",
	};
}

// packages/coding-agent/src/discovery/helpers.ts:40-48 — note the asymmetry
native: {
	get userBase() {
		return getConfigDirName();   // HOME root: W4 candidate resolution, follows the rename
	},
	get userAgent() {
		return `${getConfigDirName()}/agent`;
	},
	projectDir: PROJECT_DIR_NAME,   // project root: pinned, never renamed
},
```

### Hợp đồng test

Bảo vệ hai điều.

**(1)** `PROJECT_DIR_NAME` được ghim cứng ở `".omp"` một cách độc lập với `CONFIG_DIR_NAME`, và hai hằng số này đã **PHÂN KỲ** — chính sự phân kỳ đó là hợp đồng, và nếu chúng bao giờ trở lại bằng nhau thì có ai đó đã lật cả project root.

**(2)** Một thư mục project vốn đã chứa `.omp/` đã commit vẫn là thứ `getProjectAgentDir()` phân giải về, kể cả khi một thư mục mang tên theo HOME root **mới** nằm ngay cạnh nó.

Nếu hồi quy, người tiêu dùng thấy: họ mở một repo đã dùng suốt nhiều tháng, cài đặt, rules và skills ở cấp project của họ **âm thầm biến mất**, không có dòng lỗi nào được in ra, và ứng dụng cư xử như vừa được cài mới.

Hợp đồng thứ cấp, trong test legacy shim: bề mặt tương thích được export từ package root của legacy vẫn gắn với hằng số home-root và không bị trỏ lại thành hằng số project đã ghim — nếu hồi quy, **mọi extension legacy của bên thứ ba** sẽ phân giải thư mục config của nó về một đường dẫn không tồn tại.

**File test liên quan:**

| file | vai trò |
| --- | --- |
| `packages/utils/test/project-dir-name-pinned.test.ts` | mới — hợp đồng của W6a |
| `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` | sửa — assertion literal `".omp"` ở dòng 14 được thay bằng assertion gắn home-root-vs-project-root |
| `packages/coding-agent/test/modes/controllers/omfg-controller.test.ts` | có sẵn, **KHÔNG sửa** — bằng chứng tiền lập; hard-code `<projectDir>/.omp/rules` và nhãn `"This project (.omp/rules)"` |
| `packages/coding-agent/test/agent-session-concurrent.test.ts` | có sẵn, **KHÔNG sửa** — dòng 1630 hard-code `<cwd>/.omp/rules/no-unwrap.md` |
| `packages/coding-agent/test/agent-session-rules-reload.test.ts` | có sẵn, **KHÔNG sửa** — dòng 89, 156 hard-code `<tempDir>/.omp/RULES.md` và `.omp/rules/` |
| `packages/coding-agent/test/advisor-toggle.test.ts` | có sẵn, **KHÔNG sửa** — dòng 268, 272 dựng project settings.json qua `getProjectAgentDir` |
| `packages/coding-agent/test/extensions-discovery.test.ts` | có sẵn, **KHÔNG sửa** — dòng 23, 149, 747, 767, 792 chạy discovery cục bộ project |
| `packages/utils/test/config-dir-dual-root.test.ts` | từ W4 — chặn thứ tự đọc home-root |
| `packages/utils/test/install-id-legacy-read.test.ts` | từ W4 — chặn tính liên tục của install-id |
| `packages/utils/test/config-dir-write-root.test.ts` | từ W4 — chặn việc ghi rơi vào root mới |
| `packages/coding-agent/test/discovery/pi-config-dir.test.ts` | sửa — dòng 38 hard-code `source: ".omp"` trong kết quả `getConfigDirs`; sẽ đỏ khi lật. Không nằm trong plan. |
| `packages/coding-agent/test/system-prompt-template.test.ts` | có sẵn, **KHÔNG sửa** — dòng 42, 111, 126 dùng `CONFIG_DIR_NAME` làm thư mục PROJECT; chúng đi theo hằng số nên xanh dù hành vi sai, nên KHÔNG tính là bằng chứng |
| `packages/coding-agent/test/sdk-system-prompt-template.test.ts` | có sẵn, **KHÔNG sửa** — dòng 23 ghi `SYSTEM_TEMPLATE.md` vào `<cwd>/<CONFIG_DIR_NAME>`; xanh dù hành vi sai, không tính là bằng chứng |

### Xác minh

```bash
bun run check:ts
cd packages/utils && bun test test/project-dir-name-pinned.test.ts test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts test/config-dir-write-root.test.ts
cd packages/coding-agent && bun test test/extensibility/legacy-pi-cli-exports.test.ts test/modes/controllers/omfg-controller.test.ts test/agent-session-rules-reload.test.ts test/advisor-toggle.test.ts test/extensions-discovery.test.ts
```

Không dùng `tsc` — dự án cấm.

### Cổng hoàn thành

Cổng là **đồng thời** tất cả những điều sau, và chúng thực sự có thể đỏ:

0. `ls packages/natives/native/pi_natives.darwin-arm64.node` tồn tại. Đây là cổng tiên quyết: nếu addon chưa build, các mục 3 và 4 **không phải là cổng** — chúng chỉ báo lỗi load, không phân biệt được "đã làm" với "test không chạy được". Không được ghi "xong" khi mục 0 đỏ.
1. `bun run check:ts` xanh. Đây là cổng duy nhất xanh sẵn: `check:ts` là `oxlint`/`oxfmt` rồi `tsgo --noEmit` (`package.json:94-95`), không chạm Rust.
2. Ba test utils mới/cập nhật pass.
3. `packages/coding-agent/test/modes/controllers/omfg-controller.test.ts` pass **không đổi một dòng**. Nó chứa đúng ba literal `.omp`: nhãn `'This project (.omp/rules)'` ở dòng 15, một assertion phủ định ở dòng 178 (`toBe(false)` — xanh dù controller ghi vào thư mục nào, nên **không** phải tín hiệu), và `rulesDir` ở dòng 198; các dòng 202, 215, 220 chỉ dùng lại `rulesDir` nên không chứa literal nào. Tín hiệu thật là dòng 216 (`expect(await Bun.file(savedRuleFile).exists()).toBe(true)`) — nếu `omfg-controller.ts:285` vẫn đọc `CONFIG_DIR_NAME` sau khi lật, dòng 216 đỏ và phần còn lại của test vẫn xanh. Đừng mô tả đây là nhiều assertion đỏ.
4. `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` pass với chốt giá trị đã được thay bằng assertion gắn.
5. `git grep -n 'CONFIG_DIR_NAME' -- 'packages/**/*.ts'` không trả về join project-root nào. Vì `config.ts:12` trông giống một cách dùng home-root (nó mang `globalAgentDir`), phải kiểm tra thủ công TỪNG hit: mọi hit còn lại phải là home-root thật, một phép so sánh, hoặc re-export. `config.ts:12` được phép qua ở dạng gốc, và CHÍNH hit đó sẽ phá project config.

**Cổng có thực sự đỏ được không?** Có, theo bốn cách phân biệt nhau, mỗi cách đều đã được kiểm chứng với cây thật chứ không phải giả định:

- **(a)** Quên `dirs.ts:590` — `getProjectAgentDir()` trả về một đường dẫn không có dữ liệu nào, và hàng chục test project-scoped có sẵn trong `packages/coding-agent/test` chuyển đỏ.
- **(b)** Quên `omfg-controller.ts:285` — `omfg-controller.test.ts` đỏ ngay tại dòng 216 (assertion dương duy nhất trong file), và đó là tín hiệu tự động duy nhất chứng minh site này tồn tại.
- **(c)** Quên `discovery/helpers.ts:47` — **không test nào trong danh sách cũ bắt được.** `extensions-discovery.test.ts` và `advisor-toggle.test.ts` dựng đường dẫn qua `getProjectAgentDir()` (site `dirs.ts:590`), không phải `SOURCE_PATHS.native.projectDir`, nên chúng đỏ vì lý do (a), không phải vì lý do (c) (cả hai có `grep -c '\.omp"'` → 0). Phủ thật của site này là `test/discovery/monorepo-skills.test.ts`, `test/discovery/builtin-rules-md.test.ts`, `test/mcp-config-scope-dedup.test.ts` và `test/discovery/pi-config-dir.test.ts` — phải chạy chúng trong lượt cổng.
- **(d)** Không làm gì cả với test W6a — vẫn bị (a)–(c) bắt, nhưng test mới chính là thứ biến việc ghim thành một quyết định được nói ra thay vì một tai nạn không ai cố ý gây ra, và nó là assertion duy nhất rằng hai hằng số phải **phân kỳ**.

**Môi trường — đo lại tại HEAD 1454dc0 trên cây sạch (`git status --porcelain packages/` rỗng):** tiền đề của harness là **ĐÚNG**, spec trước đây đã đảo ngược nó. Native addon **chưa** được build — `packages/natives/native/` không có `pi_natives.darwin-arm64.node` — và cổng thật của W6 trong `packages/coding-agent` **không chạy được**: `bun test` trên bốn file cổng cho `0 pass / 4 fail / 4 errors`, tất cả đều chết ở `Failed to load pi_natives native addon for darwin-arm64` trong `loadNative` trước khi bất kỳ assertion nào chạy. Hai lệnh mà spec trích trước đây dùng làm bằng chứng (`packages/utils/test/dirs.test.ts` 6 pass, `dirs-python-gateway.test.ts` 2 pass) là **bằng chứng vô dụng**: cả hai chỉ import `@oh-my-pi/pi-utils/dirs` và `@oh-my-pi/pi-utils/snowflake`, KHÔNG import `@oh-my-pi/pi-natives`, nên chúng nằm ngoài đường đi của addon và xanh bất kể addon có build hay không. Cổng hiện tại vì thế không phân biệt được "đã làm" với "test không chạy được" — một cổng không phân biệt trạng thái là không phải cổng. Bước gỡ chặn: `brew install ninja` (`which ninja` → not found; `bazel`/`bazelisk` cũng không có), rồi `bun --cwd=packages/natives run build` — lệnh này hiện FAIL với `CMake Error: CMake was unable to find a build program corresponding to "Ninja"` rồi panic trong `cmake-0.1.58/src/lib.rs:1132`, exit 1, vì nó kéo theo một build cargo/cmake đầy đủ của crate `opusic-sys` (opus 1.6.1). **Phải chạy lệnh này và dán kết quả vào commit trước khi coi bước 10 là đã thực hiện.**

### Phụ thuộc

**Phụ thuộc vào (`depends_on`):**

- **W3** (trao cho `APP_NAME` giá trị mới của nó, mà phép join ứng viên XDG tại `dirs.ts:360` phụ thuộc vào).
- **W4** (CỔNG CỨNG — danh sách ứng viên đọc có thứ tự và write root tách biệt; đây là thứ làm cho việc lật này sống sót được).
- **W5** (CỔNG CỨNG — `config migrate`, con đường thủ công để người dùng quay lại).

**Chặn (`blocks`):**

- **W13** (tài liệu — plan yêu cầu nó chạy sau W6 để không tài liệu nào được viết khi cả `~/.omp` và `~/.ultraworkers` cùng tồn tại).
- **Định nghĩa hoàn thành của M5**: điều kiện "on-disk identity shipped" không thể là đúng cho tới khi việc lật này xảy ra.

### Cách sai dễ nhất

Cách nhiều khả năng nhất để làm sai là coi W6a là một thay đổi một dòng tại `dirs.ts:590` bởi vì đó là điều plan nói, và để mặc `omfg-controller.ts:285`, `discovery/helpers.ts:47` cùng `config.ts:12` tiếp tục đọc `CONFIG_DIR_NAME`. Cả ba là lần đọc project-root ở tầng sản phẩm mà phân tích W6a của plan bỏ sót hoàn toàn; cả ba hỏng trong im lặng — rules phạm vi project phân giải về một thư mục rỗng, discovery skills/agents cục bộ project trả về rỗng, và thư mục `.omp` cấp project biến mất khỏi danh sách, không lỗi nào, không cảnh báo thiếu config nào.

Sai lầm khó nhất thứ hai là để nguyên assertion literal `".omp"` tại `legacy-pi-cli-exports.test.ts:14`, biến một lần di chuyển còn cứu được thành một test đỏ mà không ai giải thích được.

Sai lầm thứ ba là lật `CONFIG_DIR_NAME` trước khi trỏ lại các call site, tạo ra một cửa sổ mà một commit dở dang làm hỏng thầm lặng các thư mục project.

### Cần người quyết

- **`do_not_rename.tsv` thực sự nằm ở đâu?** §2.3 của plan định nghĩa nó là bảng 17 dòng nhưng không bao giờ nêu tên một đường dẫn file, và `scripts/rename/` chưa tồn tại. Spec này đề xuất `scripts/rename/do_not_rename.tsv` cạnh `disposition.tsv` của W8b. **Cần xác nhận với bên W7/W8b** — một registry đặt sai chỗ là thứ W7 sẽ không đọc, và lượt `sed` của W7 chính là thứ làm tập loại trừ đó trở nên có tác dụng.
- **`do_not_rename.tsv` có phân biệt được `.omp` cấp project với `.omp` cấp HOME không?** Không thể chỉ dựa vào cột `value`. Chốt schema cột `scope` (`project` | `home`) và yêu cầu W7 chỉ loại trừ khi `scope=project`. Nếu không, lượt sed sẽ chặn luôn `~/.omp` → `~/.ultraworkers` và toàn bộ W4/W5/W6 trở nên vô nghĩa. **Đây là điều kiện chặn W7, không phải ghi chú.** Quy mô lượt sed phải lo: `git grep -l 'oh-my-pi' | wc -l` → 4291 file, `git grep -lI -e '\bomp\b' -e '"omp"' -e '/omp' | wc -l` → 1851 file, trên tổng 7942 file được track.
- **W6 có nên đợi W4 và W5 được dùng trong một bản phát hành thật, hay "đã xuất bản và CI xanh" là đủ?** Plan nói cả hai phải đã xuất bản **VÀ** đã được dùng trong một bản phát hành thật. Đó là một phụ thuộc lịch mà không test nào giải ngộ được, và nó là cổng duy nhất không tự động hoá được.
- **Đã ngã ngũ, không còn mở:** chuỗi `'This project (.omp/rules)'` là literal tại `omfg-controller.ts:38` (xác nhận bằng `grep -n 'This project'`), khớp với literal ở `omfg-controller.test.ts:15`. Bước 5 ghi lại điều này và yêu cầu dán vào commit message.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Phạm vi W6a là lần đọc trực tiếp duy nhất tại `dirs.ts:589-591` — "Dòng :590 đọc trực tiếp `CONFIG_DIR_NAME`", được trình bày như site project-root duy nhất mà plan bỏ sót. | STALE / INCOMPLETE — site có thật, nhưng không phải site duy nhất | Có **BỐN** lần đọc project-root của `CONFIG_DIR_NAME`, không phải một. Ngoài `dirs.ts:590` còn có `packages/coding-agent/src/modes/controllers/omfg-controller.ts:285` (`path.join(cwd, CONFIG_DIR_NAME, 'rules', name.md)`, tính năng rules phạm vi project của omfg), `packages/coding-agent/src/discovery/helpers.ts:47` (`projectDir: CONFIG_DIR_NAME` trong `SOURCE_PATHS.native`, được `discovery/builtin.ts:44` và `discovery/skillshare.ts:93` tiêu thụ) và `packages/coding-agent/src/config.ts:12` — nơi một object literal `priorityList` duy nhất nuôi **cả** `USER_CONFIG_BASES` (dòng 84) **và** `PROJECT_CONFIG_BASES` (dòng 90), nên cùng một hằng số vừa là home-root vừa là project-root. Chính vì literal đó mang theo `globalAgentDir: getConfigAgentDirName` nên nó trông y hệt một cách dùng home-root và vô hình với rà soát; đó là lý do site này bị bỏ sót. Cả bốn phải được trỏ lại về `PROJECT_DIR_NAME` **trong cùng một commit**. Claim của plan rằng một site bị bỏ sót sẽ không tạo ra tín hiệu nào cũng sai — `omfg-controller.test.ts` đã hard-code `<projectDir>/.omp/rules` ở dòng 178, 198 và nhãn tuỳ chọn `'This project (.omp/rules)'` ở dòng 15, nên một site bị bỏ sót tạo ra một test đỏ thật sự. |
| Lệnh W6 của plan là `bun run check && (cd packages/utils && bun test test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts)` và W6 không cần test nào cho phần lật chính ngoài W6a. | INCOMPLETE — bỏ sót một test sẽ fail | `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts:14` khẳng định `expect(CONFIG_DIR_NAME).toBe(".omp")` — một literal chính xác fail ngay khi việc lật đặt xuống. Plan không bao giờ nhắc tới nó. Hợp đồng của nó (theo chính tiêu đề) là wiring barrel mô tả tại `legacy-pi-coding-agent-shim.ts:1587-1591`, không phải giá trị, nên cách sửa là thay chốt giá trị bằng một assertion gắn: `CONFIG_DIR_NAME` của shim bằng hằng số home-root và **không** bằng hằng số project-root. Nửa sau chỉ có răng **sau khi** hai hằng số phân kỳ. |
| Tiền đề MÔI TRƯỜNG (harness): native addon chưa được build, nên `bun test` báo 0 pass kèm "Failed to load pi_natives native addon for darwin-arm64" và phải coi là bị chặn. | TRUE cho `packages/coding-agent` — cổng thật của W6 KHÔNG chạy được trên máy này | Hai lệnh mà spec trích trước đây dùng làm bằng chứng (`dirs.test.ts` 6 pass, `dirs-python-gateway.test.ts` 2 pass) là bằng chứng vô dụng: cả hai chỉ import `@oh-my-pi/pi-utils/dirs` và `@oh-my-pi/pi-utils/snowflake`, KHÔNG import `@oh-my-pi/pi-natives`, nên chúng nằm ngoài đường đi của native addon. Chạy thật 4 file test cổng trong `packages/coding-agent` trên cây sạch: `0 pass / 4 fail / 4 errors`, tất cả chết ở `Failed to load pi_natives native addon for darwin-arm64` TRƯỚC khi assertion nào chạy. Điều này có nghĩa là cổng hiện tại không phân biệt được "đã làm" với "test không chạy được" — một cổng không phân biệt trạng thái là không phải cổng. Bước gỡ chặn: `brew install ninja`, rồi `bun --cwd=packages/natives run build` (build cargo/cmake đầy đủ crate `opusic-sys` 1.6.1 — bazel cũng chưa có trên máy này). PHẢI chạy lệnh này và dán kết quả vào commit trước khi coi bước 10 là đã thực hiện. `bun run check:ts` dùng `tsgo`, không chạm Rust, nên vẫn chạy được và là cổng duy nhất xanh sẵn. |
| Các neo dòng của plan: `dirs.ts:27` (`CONFIG_DIR_NAME`), `:297-298` (`getConfigDirName`), `:360` (join XDG), `:589-591` (`getProjectAgentDir`), `:24` (`APP_URL`), `:36` (`USER_AGENT`). | VERIFIED ACCURATE — không cần đính chính | Cả sáu neo đều đúng tại HEAD 1454dc0. Cụ thể: 27 là `CONFIG_DIR_NAME`, 297/298 là chữ ký `getConfigDirName` và `return process.env.PI_CONFIG_DIR \|\| CONFIG_DIR_NAME;` của nó, 360 là `const appRoot = path.join(value, APP_NAME);` (join XDG mà W4 phải phủ), 589/590/591 là `getProjectAgentDir` và phép join `CONFIG_DIR_NAME` trực tiếp của nó, 24 là `APP_URL` và 36 là `USER_AGENT`. Kỹ sư có thể gõ thẳng các neo này mà không cần suy diễn lại. |
| Lệnh cổng của W6 chạy `bun test test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts`. | STALE — các file đó chưa tồn tại | Ở HEAD, không file nào tồn tại; `config-dir-write-root.test.ts` cũng vậy (chính văn bản của W4 thêm nó làm file thứ ba). `ls` trên cả ba trả về "No such file or directory". Điều này là đúng và được mong đợi — chúng là sản phẩm bàn giao của W4 và W6 cứng phụ thuộc W4 — nhưng lệnh cổng không thể chạy cho tới khi bước 1 xác nhận chúng tồn tại. Lưu ý thêm: `bun run check` là `check:ts` **và** `check:rs` (`package.json:93-94`), nên lệnh của plan kéo cả một cargo build vào cho một thay đổi không chạm Rust nào; `bun run check:ts` mới là cổng đúng ở đây. |
| Tên config root mới chưa được nêu trong W6 ("sang tên mới"). | RESOLVED — plan đã quyết ở nơi khác, W6a chỉ bỏ sót | Giá trị mới là `".ultraworkers"`. Plan nói nó là đã chốt ở ba nơi — phân tích chi phí §1.2 ("chuyển ~/.omp sang ~/.ultraworkers"), quyết định về on-disk identity §5.4 ("`CONFIG_DIR_NAME` trở thành tên mới (`dirs.ts:27`) và ghi mới rơi vào `~/.ultraworkers`"), và dòng chi tiết của chính W5 ("di chuyển `~/.omp` → `~/.ultraworkers`"). Nó **KHÔNG** phải một câu hỏi mở và người thực hiện không nên mở lại. |

**Bằng chứng cho từng đính chính:**

- *Đính chứng 1:* `git grep -n CONFIG_DIR_NAME -- '*.ts'` trả về 4 call site ngoài utils dựng đường dẫn project-root: `dirs.ts:590`, `omfg-controller.ts:285`, `discovery/helpers.ts:47`, `config.ts:12`. `sed -n '275,295p' omfg-controller.ts`, `sed -n '40,55p' discovery/helpers.ts` và `sed -n '11,15p;84,93p' config.ts` xác nhận cả ba site ngoài `dirs.ts`. `omfg-controller.test.ts` có đúng ba literal `.omp` — 15 (nhãn option), 178 (một assertion `toBe(false)` phủ định, xanh dù controller ghi vào đâu), 198 (`rulesDir`); 202/215/220 dùng lại `rulesDir`. Tín hiệu dương duy nhất là dòng 216.
- *Đính chứng 2:* `sed -n '1,30p' packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` cho thấy dòng 14. `legacy-pi-coding-agent-shim.ts:1592` là `export { CONFIG_DIR_NAME } from "@oh-my-pi/pi-utils";` và docblock tại `:1587-1591` giải thích export này tồn tại để tránh một lỗi static-export của Bun trong lúc kiểm tra extension.
- *Đính chứng 3:* Cả hai lệnh đều được thực thi tại HEAD 1454dc0; `node_modules/@oh-my-pi/pi-natives` là một symlink trỏ tới `packages/natives` và resolve được — nhưng addon `darwin-arm64.node` bên trong nó **chưa** được build (xem mục "Môi trường" ở trên).
- *Đính chứng 4:* `grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts` → 27, 298, 590. `grep -n 'path.join(value, APP_NAME)'` → 360. `sed -n '24p;36p'` → `APP_URL` và `USER_AGENT`.
- *Đính chứng 5:* `ls` trên ba đường dẫn đó trả về "No such file or directory" cho cả ba. `package.json:93` là `"check": "bun run --parallel check:ts check:rs"` và `:94` là `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`.
- *Đính chứng 6:* Các dòng 8136, 8585 của plan, và đoạn chi tiết của W5 (~8712) đều nêu `~/.ultraworkers` là root mới.

## Cần người xác nhận

Các điểm dưới đây là **mâu thuẫn nội tại của chính spec**, không phải kết quả đối chiếu với source. Không tự sửa — nêu ra đây.

- **Trường metadata `written_to` không khớp với nơi file thực sự nằm.** Spec tự khai `"written_to": ".../.lavish-wip/m5-specs/W6.spec.json"`, nhưng file được đọc và đối chiếu nằm ở `.../.lavish-wip/m5-index/specs/W6.spec.json`.
- **Khối lệnh xác minh không chạy được từ trên xuống dưới như viết.** Lệnh thứ hai bắt đầu bằng `cd packages/coding-agent` trong khi lệnh trước đã `cd packages/utils` — nếu chạy nguyên khối từ repo root, lệnh `cd` thứ hai sẽ trỏ vào `packages/utils/packages/coding-agent` và hỏng. Cả hai lệnh `cd` chỉ đúng khi chạy độc lập, mỗi lệnh từ repo root.
- **`agent-session-concurrent.test.ts` bị liệt kê trong `test_files` nhưng không xuất hiện trong lệnh xác minh.** Spec ghi rõ nó hard-code `<cwd>/.omp/rules/no-unwrap.md` ở dòng 1630 và đánh dấu "existing, NOT to be edited", nhưng lệnh xác minh thứ hai chỉ chạy bốn file: `legacy-pi-cli-exports`, `omfg-controller`, `agent-session-rules-reload`, `advisor-toggle`, `extensions-discovery`. `agent-session-concurrent.test.ts` không có mặt.
- **`advisor-toggle.test.ts` bị quy cho hai nguyên nhân khác nhau ở hai chỗ khác nhau.** Trong `test_files` nó được mô tả là dựng project settings.json qua `getProjectAgentDir` (tức site `dirs.ts:590`), còn trong `gate_can_fail` (c) nó được liệt kê là đỏ khi quên `discovery/helpers.ts:47`. Cả hai mô tả đều không thể là toàn bộ câu chuyện của file test đó.
- **`scripts/rename/do_not_rename.tsv` là mục duy nhất trong `files_touched` có `verified: false`.** Đường dẫn của nó chưa được kiểm chứng và phải xác nhận với bên W7/W8b trước khi tạo — chi tiết này đã nêu ở mục "Cần người quyết" ở trên.


---


## W6a. Root cấp project — sub-task bắt buộc của W6 (sóng 2)

**Sóng:** Wave 2
**Effort:** S theo cách chấm của plan, nhưng lớn hơn phần mô tả của chính plan ("một hằng riêng, một dòng do_not_rename, một test case"). Số thật, đã kiểm chứng: 1 hằng mới, 4 call site cấp project được trỏ lại (chỉ 1 trong số đó plan có nêu tên — `dirs.ts:590`, `discovery/helpers.ts:47`, `omfg-controller.ts:285`, cộng thêm quyết định ở `config.ts:12`), cộng 4 dòng dựng đường dẫn project-root trong test mà lần quét của bước 5 lộ ra, 1 file test mới, 1 dòng của test sẵn có được nới lỏng, 1 dòng do_not_rename. Khoảng cách giữa chữ "S" và cái mà S thực sự chứa chính là hai call site không tên. Phương án (a) của plan — dual-read ở tầng project — vẫn là M và không được khuyến nghị: nó sẽ buộc `config migrate` chạm vào một thư mục đã được commit vào lịch sử git của người dùng, đúng thứ mà milestone này được giao để không làm.
**Rủi ro chính:** Tin rằng W6a chỉ là một dòng ở `dirs.ts:590` theo cách diễn đạt của plan, rồi để `discovery/helpers.ts:47` và `omfg-controller.ts:285` tiếp tục đọc `CONFIG_DIR_NAME`.

Trong suốt M5 không có gì thay đổi trên màn hình — và đó chính là điểm: mọi project có thư mục `.omp`, kể cả chính repo này (giữ 14 file git-tracked dưới `.omp/commands`, `.omp/skills`, `.omp/tools`), vẫn phải phân giải đúng vào thư mục đó sau khi config root ở nhà dời sang `~/.ultraworkers`. Trình soạn thảo rules vẫn hiện nhãn phạm vi `This project (.omp/rules)`. Điều người dùng không bao giờ thấy chính là hình dạng hỏng mà work item này sinh ra để chặn: không lỗi, không cảnh báo, không thông báo thiếu cấu hình — chỉ là settings, rules, skills, hooks, extensions, MCP và SSH config của project biến mất âm thầm khỏi mọi repo họ đang làm việc, rồi một lần đăng nhập lại im lặng vì app cho rằng nó vừa được cài mới.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/src/dirs.ts` | sửa | Thêm `export const PROJECT_DIR_NAME: string = ".omp";` ngay sau `CONFIG_DIR_NAME` (dòng 27), kèm docblock nói rõ nó cố ý không suy ra từ `CONFIG_DIR_NAME` và được ghim cho cả milestone đổi tên (do_not_rename N14). Đổi dòng 590 trong `getProjectAgentDir()` từ `CONFIG_DIR_NAME` sang `PROJECT_DIR_NAME`. **Không** đụng dòng 21 (`APP_NAME`), 24 (`APP_URL`), 36 (`USER_AGENT`) hay 298 (lần đọc home-root). | Có — `sed -n '18,40p' packages/utils/src/dirs.ts` cho thấy APP_NAME:21, APP_URL:24, CONFIG_DIR_NAME:27, MAIN_CONFIG_FILENAMES:30, USER_AGENT:36; `sed -n '588,591p'` cho thấy getProjectAgentDir ở 589 với `return path.join(cwd, CONFIG_DIR_NAME);` ở 590; `grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts` trả về đúng 3 hit: 27, 298, 590. File dài 1157 dòng. |
| `packages/coding-agent/src/discovery/helpers.ts` | sửa | Dòng 47, trong `SOURCE_PATHS.native`, đổi `projectDir: CONFIG_DIR_NAME` thành `projectDir: PROJECT_DIR_NAME`. Cập nhật import ở dòng 6. Để nguyên `userBase`/`userAgent` (dòng 42, 45) đọc `getConfigDirName()` — đó là home-root, thuộc W4. | Có — đây là site mà plan bỏ sót. Xác minh bằng `git grep -n CONFIG_DIR_NAME -- '*.ts' ':!*test*'`. `helpers.ts:47` nạp vào `getProjectPath()` ở dòng 127-131, vốn làm `path.join(ctx.cwd, paths.projectDir, subpath)` — một lần đọc project-root không đi qua `getProjectAgentDir()`. Để nguyên nó đọc `CONFIG_DIR_NAME` sẽ âm thầm phá discovery của project-local skills, commands, agents và hooks. |
| `packages/coding-agent/src/modes/controllers/omfg-controller.ts` | sửa | Dòng 285, trong `#resolveTarget()`, đổi `path.join(this.ctx.sessionManager.getCwd(), CONFIG_DIR_NAME, "rules", ...)` sang dùng `PROJECT_DIR_NAME`. Cập nhật import ở dòng 2. | Có — đây là site thứ hai plan bỏ sót. Xác minh bằng cách đọc dòng 275-295. Đây là đường ghi rules phạm vi project. `omfg-controller.test.ts:15` hard-code nhãn `This project (.omp/rules)` và dòng 178, 198 hard-code `<projectDir>/.omp/rules`, nên site này là tín hiệu tự động duy nhất chứng minh nó tồn tại. |
| `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` | sửa | Dòng 14, thay khẳng định literal `expect(CONFIG_DIR_NAME).toBe(".omp")` bằng một khẳng định ràng buộc: giá trị được re-export từ package root của legacy là hằng HOME-root, không phải `PROJECT_DIR_NAME`. Shim legacy re-export `CONFIG_DIR_NAME` (`legacy-pi-coding-agent-shim.ts:1592`) và nó phải tiếp tục gắn với home root; extension legacy của bên thứ ba phân giải config dir của họ qua chính nó. | Có — `sed -n '1,20p'` xác nhận dòng 14 là `expect(CONFIG_DIR_NAME).toBe(".omp");`. Khẳng định này **không** phải source-grep: nó import symbol thật và so sánh giá trị thật, nên bảo vệ một hợp đồng xuất ra. Đây là một pin giá trị sẽ hỏng một cách hợp lệ ở W6 — vì vậy phải nới lỏng ngay ở đây thay vì để nó nổ đỏ. |
| `packages/coding-agent/test/sdk-system-prompt-template.test.ts` | sửa | Dòng 10 (import) và 23 (`path.join(cwd, CONFIG_DIR_NAME, "SYSTEM_TEMPLATE.md")` -> `PROJECT_DIR_NAME`) — đây là đường dựng project-root trong test. | Có — `git grep -n CONFIG_DIR_NAME -- 'packages/**/*.ts'` lộ ra; `cwd = tempDir.join("project")` ở dòng 22, nên đường dẫn ở 23 là project-root, không phải home-root. |
| `packages/coding-agent/test/system-prompt-template.test.ts` | sửa | Dòng 4 (import), 42 (`projectConfig: tempDir.join("project", CONFIG_DIR_NAME)`), và 111 + 126 (`for (const directory of [CONFIG_DIR_NAME, ".agents"])` -> `[PROJECT_DIR_NAME, ".agents"]`) — cả bốn là project-root. | Có — `git grep -n CONFIG_DIR_NAME -- 'packages/**/*.ts'` lộ ra; 111 và 126 là vòng lặp liệt kê thư mục project-scope rồi ghi SYSTEM.md dưới đó. |
| `packages/utils/test/project-dir-name-pinned.test.ts` | tạo | Test mới. Khẳng định (a) `PROJECT_DIR_NAME === ".omp"`; (b) cặp `[CONFIG_DIR_NAME, PROJECT_DIR_NAME]` được ghim theo thứ tự bằng `expect([CONFIG_DIR_NAME, PROJECT_DIR_NAME]).toEqual([CONFIG_DIR_NAME, ".omp"])` — vế phải tự tham chiếu nên hằng home root không bị ghim cứng (W6 sẽ lật nó, khẳng định vẫn xanh), còn vế trái bắt được một đợt "gộp/hợp nhất" đặt `PROJECT_DIR_NAME` theo tên home root; (c) `getProjectAgentDir()` trên một cwd tạm chứa `.omp/` đã commit trả về đúng `.omp` đó, và vẫn vậy khi có một thư mục mang tên theo home root MỚI nằm cạnh; (d) năm getter project trong dirs.ts dựa trên `getProjectAgentDir` (`getProjectModulesDir`, `getProjectPromptsDir`, `getProjectPluginOverridesPath`, `getMCPConfigPath('project')`, `getSSHConfigPath('project')`) đều nằm dưới `.omp` đã ghim. **Không** viết `PROJECT_DIR_NAME !== CONFIG_DIR_NAME` ở đây: tại thời điểm W6a merge hai hằng còn bằng nhau, khẳng định đó đỏ ngay. | Có — đặt cố ý trong `packages/utils/test/` thay vì `packages/coding-agent/test/`: test của package đó không chạy được trên máy này (native addon blocker, xem gate_can_fail), nên một test ở đó sẽ là một cổng không bao giờ đỏ được. Xác minh `bun test packages/utils/test/dirs.test.ts` báo 6 pass / 0 fail tại đây. |
| `packages/coding-agent/src/cli/help-extra.ts` | chỉ xác minh | KHÔNG CẦN SỬA. Dòng 66 render `~/${CONFIG_DIR_NAME}/agent` trong help text — đó là đường dẫn home-root và phải đi theo cú flip. Nó nằm ở đây chỉ để reviewer đang tìm `CONFIG_DIR_NAME` không "sửa" nó thành `PROJECT_DIR_NAME`, sẽ in ra một đường dẫn sai. | Có — `sed -n '60,70p'`. Đây là nội suy ở tầng hiển thị của config dir nhà và đúng nguyên trạng. |
| `packages/coding-agent/src/config.ts` | chỉ xác minh | KHÔNG CẦN SỬA, nhưng bắt buộc phải suy luận tường minh. Dòng 12 đặt `CONFIG_DIR_NAME` vào `priorityList`, từ đó cả `USER_CONFIG_BASES` (dòng 84) và `PROJECT_CONFIG_BASES` (dòng 90) đều được dựng. Dòng 135 so `name !== CONFIG_DIR_NAME` để quyết định một user source có được opt-in hay không. Nếu `PROJECT_DIR_NAME` được đưa vào mà file này bị bỏ nguyên, mục từng mang `".omp"` trong `PROJECT_CONFIG_BASES` sẽ thành `".ultraworkers"` — một thay đổi hành vi tầng project ẩn trong một cuộc đổi tên hằng, đúng loại hỏng âm thầm mà W6a sinh ra để chặn. | Có — đọc `config.ts:10-17` (priorityList), 84-93 (hai bản đồ base) và 125-145 (getConfigDirs). **CẦN QUYẾT ĐỊNH:** giữ `dir: CONFIG_DIR_NAME` trong priorityList (mục project sẽ thành tên mới, phá các thư mục project `.omp` đã commit) hay chuyển riêng mục đó sang `PROJECT_DIR_NAME` (mục project vẫn đọc `.omp`, đúng ý W6a). Khuyến nghị: chuyển mục priorityList sang `PROJECT_DIR_NAME`. Đây là open question 1 và phải được trả lời trước khi merge, bởi đây là quyết định sản phẩm, không phải refactor. |

### Các bước

1. **Ghi lại baseline trước khi đụng code**, để cổng phân biệt được "xong" với "test không chạy". Chạy và LƯU output của: `cd packages/utils && bun test test/dirs.test.ts test/install-id.test.ts` (kỳ vọng 6 pass / 0 fail và 5 pass / 0 fail trên máy này — cả hai đều đã chạy lúc xác minh spec). Ghi thêm: `bun run check:ts` (exit 0, ~25-40s khi ấm). Nếu không tái lập được, hãy dừng — một môi trường không chạy được test của utils không phải môi trường để xác minh work item này. Neo: `packages/utils/test/dirs.test.ts`. Nếu cần chạy điều khoản 6 của cổng (đối chứng âm ở `packages/coding-agent/test/`), làm tiền đề môi trường ở phần Cổng hoàn thành trước — nếu không, bảy điều khoản còn lại vẫn chạy và vẫn đủ để gọi work item này là xong hay chưa.
2. Thêm `PROJECT_DIR_NAME` vào `packages/utils/src/dirs.ts` ngay sau `CONFIG_DIR_NAME` (dòng 27), với docblock diễn đạt bằng văn xuôi: tên thư mục config cấp project, tương đối với project root; cố ý KHÔNG suy ra từ `CONFIG_DIR_NAME`; thư mục này thường nằm trong repo của người dùng và được commit vào git, nên đổi tên nó là viết lại working tree của họ chứ không phải di chuyển trạng thái máy-local; ghim cho cả milestone đổi tên (do_not_rename N14). Giá trị là `".omp"`. Không đụng `APP_NAME` (21), `APP_URL` (24), `MAIN_CONFIG_FILENAMES` (30), `USER_AGENT` (36), hay lần đọc home-root `getConfigDirName()` (298). Neo: `packages/utils/src/dirs.ts:27`.
3. Trỏ lại dòng 590 trong `getProjectAgentDir()` từ `CONFIG_DIR_NAME` sang `PROJECT_DIR_NAME`. Sau khi trỏ lại, xác nhận `grep -n 'return path.join(cwd, CONFIG_DIR_NAME)' packages/utils/src/dirs.ts` KHÔNG còn hit nào. (`grep -n CONFIG_DIR_NAME` vẫn ra 3 hit — 27 phần khai báo, 298 lần đọc home-root, và dòng docblock mà bước 2 nhắc tên hằng — đó là chủ ý; đừng dùng tổng 3 hit đó để kết luận bước 3 chưa xong.) KHÔNG sửa docblock phía trên hàm, vốn đã viết `Get the project-local config directory (.omp).` — nó vẫn đúng. Neo: `packages/utils/src/dirs.ts:590`.
4. Trỏ lại HAI call site cấp project nằm ngoài dirs.ts mà plan không nêu tên. (a) `packages/coding-agent/src/discovery/helpers.ts:47` — `projectDir: CONFIG_DIR_NAME` thành `projectDir: PROJECT_DIR_NAME`, import cập nhật ở dòng 6. (b) `packages/coding-agent/src/modes/controllers/omfg-controller.ts:285` — đường ghi rules phạm vi project trong `#resolveTarget()` chuyển sang `PROJECT_DIR_NAME`, import cập nhật ở dòng 2. Hai site này là lý do W6a nhiều hơn một dòng plan mô tả; bỏ qua chúng là failure có xác suất cao nhất trong work item này. Neo: `packages/coding-agent/src/discovery/helpers.ts:47`.
5. Trả lời open question 1 (quyết định priorityList ở `packages/coding-agent/src/config.ts:12`) và áp dụng. Rồi xác minh lại toàn bộ bề mặt: `git grep -n 'CONFIG_DIR_NAME' -- 'packages/**/*.ts'` — 24 hit ở HEAD hiện tại, và 9 trong số đó nằm trong test nên pathspec này không lọc test ra. Mọi hit còn lại bắt buộc thuộc đúng bốn loại: (i) một use home-root (`help-extra.ts:66`, logic user-base trong config.ts), (ii) một phép so sánh với chính hằng (config.ts:135), (iii) một re-export (`legacy-pi-coding-agent-shim.ts:1592`), hoặc (iv) một project-root join trong test, phải được trỏ lại sang `PROJECT_DIR_NAME` (`test/sdk-system-prompt-template.test.ts:23`, `test/system-prompt-template.test.ts:42,111,126`) cùng import tương ứng. Bất kỳ project-root join nào còn sót lại — trong src lẫn trong test — là bug. Lần grep thứ hai phải cho ra KHÔNG hit nào ở project-root join mà vẫn đọc `CONFIG_DIR_NAME`. Neo: `packages/coding-agent/src/config.ts:12`.
6. Viết `packages/utils/test/project-dir-name-pinned.test.ts`. Đặt trong `packages/utils/test/` vì test của package đó chạy được trên máy này còn `packages/coding-agent/test/` thì không. Khẳng định bốn hợp đồng liệt kê ở phần file cần chạm tới: `PROJECT_DIR_NAME` là `.omp`; cặp `[CONFIG_DIR_NAME, PROJECT_DIR_NAME]` được ghim theo thứ tự; một cwd tạm có `.omp/` đã commit vẫn phân giải vào đó kể cả khi có một thư mục mang tên home-root mới nằm cạnh; cả năm project getter đều nằm dưới `.omp` đã ghim. Không dùng `mock.module()`. Không mutate `process.env` hay `process.platform` — `getProjectAgentDir` nhận cwd làm tham số, đó là một seam hẹp khiến toàn bộ test không cần môi trường. Dọn thư mục tạm **trong thân test** bằng `fs.rmSync(..., { recursive: true, force: true })` trong `finally` như `dirs.test.ts:52-60` làm, và đặt `vi.restoreAllMocks()` trong `afterEach` như `dirs.test.ts:17-20` làm — hai việc ở hai chỗ khác nhau. Neo: `packages/utils/test/project-dir-name-pinned.test.ts`.
7. Nới lỏng pin literal giờ đã sai một cách hợp lệ ở `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts:14`. Thay `expect(CONFIG_DIR_NAME).toBe(".omp")` bằng khẳng định ràng buộc rằng re-export của legacy shim bằng `CONFIG_DIR_NAME` home-root và KHÔNG phải `PROJECT_DIR_NAME`. Giữ nguyên việc import symbol thật — điểm ở đây là hợp đồng xuất ra, không phải văn bản. Đừng xoá khẳng định: shim là con đường mà extension của bên thứ ba phân giải config dir của họ, và một re-export không ai khẳng định đúng là loại thứ sau này sẽ âm thầm bị trỏ lại.
8. Thêm dòng do_not_rename cho thư mục cấp project. `scripts/rename/` chưa tồn tại trên cây này (xác minh: `ls scripts/rename` trả về `No such file or directory`), nên work item này **tạo** file `scripts/rename/keep-list.txt` theo định dạng `<pattern or path>  # <reason>` mà plan section 2.3 quy định, mỗi dòng một mục, phần `#` reason là bắt buộc. Mục cần thêm là cho thư mục `.omp` cấp project, và mẫu **phải neo theo vị trí project**, không được ghi `.omp` trần — dùng mẫu neo đầu dòng `^\.omp/` với lý do: project-level directory usually committed to git; renaming it rewrites the user's working tree rather than moving machine-local state. `.omp` trần sẽ khớp cả `~/.omp` lẫn `<repo>/.omp/`, và chặn nhầm việc W6/W7 đổi tên home root — đúng cái hậu quả ngược với mục tiêu của W6, vì `dirs.ts:27` (home root) và `dirs.ts:590` (project root) đang dùng chung một chuỗi `".omp"`. Nếu một work item anh em (W2 hoặc W7) đã kịp tạo file đó khi thay đổi này tới, hãy append thay vì ghi đè. Thêm một mục trần không kèm lý do là không chấp nhận được — đây là danh sách loại trừ mà sed của W7 nạp, nên một mục không lý do thì không review được. Neo: `scripts/rename/keep-list.txt`.
9. Chạy toàn bộ cổng (xem mục Cổng hoàn thành) và xác nhận từng điều khoản một cách độc lập. Sau đó xác nhận cổng có bị bác bỏ được: tạm hoàn nguyên bước 3 (đặt lại `CONFIG_DIR_NAME` ở `dirs.ts:590`), chạy lại, và xác nhận test mới **và** `omfg-controller.test.ts` sẵn có đều đỏ. Rồi khôi phục lại. Một cổng chưa từng được quan sát đỏ thì không phải cổng. Cũng xác nhận chiều phủ định theo điều khoản 3 của cổng: tạm đặt `PROJECT_DIR_NAME` thành `".ultraworkers"` (tức là làm hỏng giá trị ghim), chạy lại, xác nhận khẳng định cặp đỏ, rồi khôi phục lại `.omp`. Đừng thay bằng `PROJECT_DIR_NAME = CONFIG_DIR_NAME` — ở thời điểm W6a hai hằng còn bằng nhau nên cách đó không làm đỏ được gì. Neo: `packages/utils/test/project-dir-name-pinned.test.ts`.

### Hình dạng code

```typescript
// packages/utils/src/dirs.ts — immediately after line 27

/** Config directory name (e.g. ".omp") */
export const CONFIG_DIR_NAME: string = ".omp";  // W6 flips this; W6a must not

/**
 * Project-local config directory name, relative to the project root.
 *
 * Deliberately NOT derived from CONFIG_DIR_NAME. This directory usually lives in
 * the user's repo and is committed to git, so renaming it rewrites their working
 * tree rather than moving machine-local state. Pinned for the whole rebrand
 * milestone — see do_not_rename N14.
 */
export const PROJECT_DIR_NAME: string = ".omp";

// packages/utils/src/dirs.ts:588-591
/** Get the project-local config directory (.omp). */
export function getProjectAgentDir(cwd: string = getProjectDir()): string {
	return path.join(cwd, PROJECT_DIR_NAME);
}

// packages/coding-agent/src/discovery/helpers.ts:39-49
export const SOURCE_PATHS = {
	native: {
		get userBase() {
			return getConfigDirName();          // home root — W4 owns this
		},
		get userAgent() {
			return `${getConfigDirName()}/agent`; // home root — W4 owns this
		},
		// PROJECT_DIR_NAME, not CONFIG_DIR_NAME: consumed by getProjectPath()
		// as `path.join(ctx.cwd, paths.projectDir, subpath)` — a project read
		// that never passes through getProjectAgentDir().
		projectDir: PROJECT_DIR_NAME,
	},
	// ...claude / codex / gemini unchanged
};

// packages/coding-agent/src/modes/controllers/omfg-controller.ts:283-288
#resolveTarget(location: string, ruleName: string): { filePath: string; level: OmfgRuleSourceLevel } {
	if (location === GLOBAL_OPTION) {
		return {
			filePath: path.join(this.ctx.settings.getAgentDir(), "rules", `${ruleName}.md`),
			level: "user",
		};
	}
	return {
		// PROJECT_DIR_NAME, not CONFIG_DIR_NAME: project-scope rule writes must
		// keep landing in the committed .omp/rules the editor's label advertises
		// ("This project (.omp/rules)", omfg-controller.test.ts:15).
		filePath: path.join(this.ctx.sessionManager.getCwd(), PROJECT_DIR_NAME, "rules", `${ruleName}.md`),
		level: "project",
	};
}

// packages/coding-agent/src/config.ts:11-16  (see open question 1)
const priorityList = [
	// Option A (recommended): the project entry keeps reading the committed .omp.
	{ dir: PROJECT_DIR_NAME, globalAgentDir: getConfigAgentDirName },
	{ dir: ".claude" },
	{ dir: ".codex" },
	{ dir: ".gemini" },
];
```

### Hợp đồng test

Nó bảo vệ một điều, phát biểu như một hợp đồng quan sát được: tên thư mục config cấp project là một **thân phận khác** với tên ở cấp nhà, và nó được ghim. Hai khẳng định gánh trọng lượng. (1) **PIN CẶP CÓ THỨ TỰ**: `expect([CONFIG_DIR_NAME, PROJECT_DIR_NAME]).toEqual([CONFIG_DIR_NAME, ".omp"])`. Vế phải tự tham chiếu tới chính `CONFIG_DIR_NAME`, nên hằng home root không bị ghim cứng — W6 sẽ lật nó và khẳng định này vẫn xanh — còn vế trái bắt được đúng một sai lầm: ai đó hợp nhất `PROJECT_DIR_NAME` theo tên home root. Khẳng định này không có đối chiếu ở bất kỳ đâu trong bộ test hiện có — mọi test sẵn có đều khẳng định một giá trị cụ thể, mà một giá trị cụ thể thì lại được thỏa bởi một hằng vô tình vẫn còn bị ràng buộc. **PHÂN KỲ (`PROJECT_DIR_NAME !== CONFIG_DIR_NAME`) là hợp đồng của W6, không phải của W6a**: W6a chặn W6 và không phụ thuộc W6, nên khi W6a merge thì `CONFIG_DIR_NAME` vẫn là `".omp"` — bằng đúng `PROJECT_DIR_NAME` — và khẳng định phân kỳ sẽ đỏ ngay khi viết ra. Điều khoản phân kỳ chỉ được viết và chạy sau khi W6 đã lật `CONFIG_DIR_NAME`, và thuộc cổng của W6. Người tiêu dùng thấy gì nếu điều này hồi quy: họ mở một repo họ dùng đã nhiều tháng và settings, rules, skills, hooks của project biến mất; không lỗi nào in ra, không cảnh báo thiếu cấu hình nào hiện, app cư xử như vừa cài mới — kể cả một lần đăng nhập lại im lặng, vì trạng thái thân phận của chính app phân giải thành mới. (2) **PHÂN GIẢI DƯỚI ĐỐI THỦ**: một cwd tạm chứa `.omp/` đã commit vẫn phân giải vào đó khi một thư mục mang tên theo home root MỚI nằm ngay cạnh. Đây là một lần phân giải thật, không phải so sánh chuỗi — `getProjectAgentDir` được gọi và giá trị trả về của nó được so sánh. Một test chỉ khẳng định chuỗi `".omp"` sẽ vẫn xanh ngay cả khi hàm chưa từng được gọi. Hợp đồng thứ cấp là cả năm project getter trong dirs.ts dựa trên `getProjectAgentDir` (`getProjectModulesDir`, `getProjectPromptsDir`, `getProjectPluginOverridesPath`, `getMCPConfigPath('project')`, `getSSHConfigPath('project')`) đều nằm dưới `.omp` đã ghim — nếu chỗ này hồi quy, modules, prompts, plugin overrides, MCP servers và SSH config cấp project sẽ âm thầm phân giải tới một thư mục không tồn tại.

Các test sẵn có là nhóm đối chứng âm và **không được sửa**: `omfg-controller.test.ts` hard-code `This project (.omp/rules)` ở dòng 15 và các đường dẫn literal `<projectDir>/.omp/rules` ở dòng 178, 198; `agent-session-rules-reload.test.ts` hard-code `<tempDir>/.omp/RULES.md` ở dòng 89 và `.omp/rules` ở dòng 156; `advisor-toggle.test.ts` và `extensions-discovery.test.ts` dựng đường dẫn project qua `getProjectAgentDir`. Nếu bỏ qua việc trỏ lại ở bước 3-4, chúng đỏ — chính điều đó làm chúng thành bằng chứng thật chứ không phải test mới.

Test mới **không** phải source-grep: nó import và gọi các hàm thật rồi so sánh các đường dẫn phân giải thật. Test mới **không** dùng `mock.module()`: seam ở đây hẹp hơn và tốt hơn — `getProjectAgentDir` đã nhận cwd làm tham số, nên không có trạng thái toàn cục nào bị đụng tới.

Các file test liên quan:

- `packages/utils/test/project-dir-name-pinned.test.ts` (MỚI — hợp đồng của W6a: `PROJECT_DIR_NAME` là `.omp`, cặp `[CONFIG_DIR_NAME, PROJECT_DIR_NAME]` được ghim theo thứ tự, một `.omp/` đã commit vẫn phân giải được, và cả năm project getter nằm dưới nó)
- `packages/utils/test/dirs.test.ts` (sẵn có, KHÔNG sửa — bằng chứng baseline rằng bộ test utils chạy được trên máy này; đo được 6 pass / 0 fail)
- `packages/utils/test/install-id.test.ts` (sẵn có, KHÔNG sửa — đo được 5 pass / 0 fail; canh phía home-root mà W4 sở hữu)
- `packages/coding-agent/test/modes/controllers/omfg-controller.test.ts` (sẵn có, KHÔNG sửa — tín hiệu tự động duy nhất rằng `omfg-controller.ts:285` là site project-root; hard-code nhãn `This project (.omp/rules)` ở dòng 15 và đường dẫn literal `.omp/rules` ở 178, 198)
- `packages/coding-agent/test/agent-session-rules-reload.test.ts` (sẵn có, KHÔNG sửa — hard-code `<tempDir>/.omp/RULES.md` ở dòng 89 và `.omp/rules` ở 156)
- `packages/coding-agent/test/extensions-discovery.test.ts` (sẵn có, KHÔNG sửa — dòng 23, 149, 747, 767, 792 dựng đường dẫn discovery cấp project qua `getProjectAgentDir`; tín hiệu tự động duy nhất cho `discovery/helpers.ts:47`)
- `packages/coding-agent/test/advisor-toggle.test.ts` (sẵn có, KHÔNG sửa — dòng 268, 272 dựng project settings.json qua `getProjectAgentDir`)
- `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` (SỬA ở dòng 14 — pin literal `".omp"` được thay bằng khẳng định ràng buộc home-root-vs-project-root; đây là một trong ba file test work item này sửa)
- `packages/coding-agent/test/sdk-system-prompt-template.test.ts` (SỬA ở dòng 10 và 23 — đường dựng project-root `path.join(cwd, CONFIG_DIR_NAME, "SYSTEM_TEMPLATE.md")` trỏ lại `PROJECT_DIR_NAME`; hôm nay hai hằng còn bằng nhau nên đây là thay tên thuần, không đổi hành vi, nhưng để sót thì W6 lật hằng là test đỏ)
- `packages/coding-agent/test/system-prompt-template.test.ts` (SỬA ở dòng 4, 42, 111, 126 — `projectConfig` và vòng lặp `[CONFIG_DIR_NAME, ".agents"]` đều là project-root, trỏ lại `PROJECT_DIR_NAME`)
- `packages/utils/test/config-dir-dual-root.test.ts` (từ W4 — KHÔNG viết ở đây; canh thứ tự đọc home-root mà W6a phụ thuộc)
- `packages/utils/test/install-id-legacy-read.test.ts` (từ W4 — KHÔNG viết ở đây; canh tính liên tục của install-id, thân phận duy nhất mất đi thì không phục hồi được)

### Xác minh

Đã ghi trong lúc soạn spec, tất cả trên máy này, HEAD **1454dc0** (1454dc0 chỉ thêm tài liệu so với 84cbac9 — `git diff 84cbac9..1454dc0 -- packages/ scripts/` rỗng — nên các số đo dưới đây không đổi):

```bash
bun run check:ts                                          # -> exit 0 (all 16 check:types targets Done)
bun test packages/utils/test/dirs.test.ts                # -> 6 pass, 0 fail, 9 expect() calls, 121ms
bun test packages/utils/test/install-id.test.ts           # -> 5 pass, 0 fail, 11 expect() calls, 115ms
bun test packages/coding-agent/test/config/settings-reload.test.ts  # -> 0 pass, 1 fail, 1 error (native addon)
```

Dòng cuối là phát hiện môi trường định hình toàn bộ spec: blocker có thật nhưng **giới hạn theo package**, không phải toàn cục. `packages/utils/test/` chạy sạch; `packages/coding-agent/test/` không chạy được. Đó là lý do test mới nằm ở `packages/utils/test/` — một test đặt trong package bị chặn sẽ là một cổng không bao giờ đỏ được, đúng là chế độ hỏng mà phần cổng của work item này được viết để tránh.

Cổng chạy sau khi hiện thực:

```bash
bun run check:ts
cd packages/utils && bun test test/project-dir-name-pinned.test.ts test/dirs.test.ts test/install-id.test.ts test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts
```

Lưu ý về các test coding-agent được liệt kê làm bằng chứng: chúng là nhóm đối chứng âm **đúng** và phải được chạy trong môi trường đã build native addon, nhưng chúng không thể làm cổng trên máy này. Đừng lặng lẽ tô xanh chúng ở đây — đó chính là sự nhầm lẫn "test không chạy chứ không phải xong" mà cổng này viết ra để ngăn. Điều kiện tiên quyết để build là `brew install ninja` TRƯỚC, rồi `bun --cwd=packages/natives run build`; thiếu ninja thì bản build cmake của opusic-sys thất bại với `CMake was unable to find a build program corresponding to Ninja`.

### Cổng hoàn thành

Tám điều khoản, bảy cái chạy được ngay trên máy này và mỗi cái đều có thể bị bác bỏ một cách độc lập; chỉ điều khoản 6 cần tiền đề môi trường ngay dưới đây.

**Tiền đề môi trường (không tùy chọn, chạy MỘT LẦN cho cả milestone):** `brew install ninja` rồi `bun --cwd=packages/natives run build`. Không có `ninja` thì cmake build của opusic-sys thất bại với `CMake was unable to find a build program corresponding to Ninja`. Sau khi build xong, điều khoản 6 mới chạy được. Trên máy chưa build, `packages/coding-agent/test/` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64` — đó là **môi trường chưa sẵn sàng, KHÔNG phải kết quả kiểm thử**, và không được tick xanh. Bảy điều khoản còn lại đều nằm trong `packages/utils/`, nên chạy được mà không cần tiền đề này.

1. `bun run check:ts` exit 0.
2. Test mới xanh: `cd packages/utils && bun test test/project-dir-name-pinned.test.ts` — 4 khẳng định (giá trị, pin cặp có thứ tự, phân giải-dưới-đối-thủ, năm project getter).
3. **BẰNG CHỨNG PHỦ ĐỊNH** cho điều khoản 2, phải chạy tường minh chứ không giả định: tạm đặt `PROJECT_DIR_NAME = ".ultraworkers"` (tức làm hỏng giá trị ghim), chạy lại, xác nhận khẳng định giá trị và pin cặp đỏ, rồi khôi phục lại `.omp`. Câu này bắt được một đợt "dọn dẹp" gộp/sửa nhầm hằng. KHÔNG dùng `PROJECT_DIR_NAME = CONFIG_DIR_NAME` cho phép này: ở thời điểm W6a hai hằng còn bằng nhau nên nó không làm đỏ được gì. Đây là điều khoản duy nhất bắt được chế độ hỏng đó — và là điều khoản hiện không tồn tại ở bất kỳ đâu trong bộ test hiện tại.
4. `grep -n 'return path.join(cwd, CONFIG_DIR_NAME)' packages/utils/src/dirs.ts` trả về KHÔNG hit nào — đó là cách đếm bỏ qua docblock. Tương đương, và là con số một người review dễ chạy nhất: `grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts` trả về **3** hit (27 phần khai báo, 298 lần đọc home-root, và dòng docblock mà bước 2 bắt buộc viết có nhắc tên hằng). 3 hit sau khi bước 3 xong là ĐÚNG; 4 hit mới là bước 3 đã bị bỏ qua. Đây là grep trên một giá trị dữ liệu, không phải một test source-grep — nó là một mục checklist review, không phải test tự động, và spec nói rõ điều đó.
5. `git grep -n CONFIG_DIR_NAME -- 'packages/**/*.ts'` — **24 hit** ở HEAD hiện tại, và pathspec này không lọc test ra (9 hit nằm trong test). Mọi hit còn lại bắt buộc thuộc đúng **bốn** loại: (i) một use home-root (`help-extra.ts:66`; logic user-base trong config.ts), (ii) một phép so sánh với chính hằng (`config.ts:135`), (iii) một re-export (`legacy-pi-coding-agent-shim.ts:1592`, cộng hai dòng comment 1588-1589), hoặc (iv) một project-root join trong test, phải được trỏ lại sang `PROJECT_DIR_NAME`: `test/sdk-system-prompt-template.test.ts:23` và `test/system-prompt-template.test.ts:42,111,126` (kèm import ở dòng 10 và 4). Loại (iv) còn sót là bug. Một project-root join còn sống sót ở bất kỳ loại nào cũng là bug. Lưu ý: điều khoản này là kiểm tra REVIEW, không phải test tự động — chính plan cũng đánh dấu lớp grep này là checklist của con người, và giả vờ khác đi là cùng cái bẫy "trông xanh, hỏng thật" mà spec này sinh ra để tránh.
6. Hai bộ đối chứng âm của coding-agent KHÔNG ĐỔI và (sau khi chạy tiền đề môi trường ở trên) xanh: `omfg-controller.test.ts` và `extensions-discovery.test.ts`. Chưa build addon thì điều khoản này **bị treo, không phải xanh** — nó được nói ra chứ không bị giấu.
7. `scripts/rename/keep-list.txt` tồn tại, đã được commit, và mục `.omp` cấp project của nó mang một lý do `#` không rỗng **và mẫu đã neo theo vị trí project** (`^\.omp/`, không phải `.omp` trần).
8. **PHỦ ĐỊNH PHẠM VI keep-list:** sweep kiểm chứng vẫn đổi `~/.omp` -> `~/.ultraworkers` trong khi `.omp/` cấp project được giữ nguyên. Nếu sweep không đổi được `~/.omp`, mẫu trong keep-list đã quá rộng.

Cổng này **có** thực sự đỏ được, theo năm đường, mỗi đường truy ngược về một lần sửa cụ thể bị bỏ sót chứ không phải một giả định giả tưởng. (a) Bỏ qua bước 3 (để `CONFIG_DIR_NAME` ở `dirs.ts:590`): `getProjectAgentDir()` trả về một đường dẫn nơi người dùng không có dữ liệu, khẳng định phân giải của test mới đỏ, và — bằng chứng thật — `omfg-controller.test.ts`, `agent-session-rules-reload.test.ts`, `extensions-discovery.test.ts` và `advisor-toggle.test.ts` đều đỏ trên các đường dẫn `.omp` hard-code của chúng. Đã xác minh các literal đó tồn tại ở `omfg-controller.test.ts:15,178,198` và `agent-session-rules-reload.test.ts:89,156`. (b) Bỏ qua bước 4a (để `discovery/helpers.ts:47` đọc `CONFIG_DIR_NAME`): `extensions-discovery.test.ts` đỏ ở các dòng 23, 149, 747, 767, 792. (c) Bỏ qua bước 4b (để `omfg-controller.ts:285`): `omfg-controller.test.ts` đỏ — đây là tín hiệu tự động DUY NHẤT rằng site này tồn tại, vì không gì khác trong repo khẳng định gì về đường ghi rules phạm vi project. (d) Không làm gì về test mới: các mục (a)-(c) vẫn bắt được cú flip, nhưng khẳng định pin cặp khi đó vắng mặt, và đó là chế độ hỏng duy nhất không test sẵn nào bắt được — một refactor tương lai lặng lẽ hợp nhất `PROJECT_DIR_NAME` theo tên home root sẽ qua mọi bộ test sẵn có trong repo này. Từ W6 trở đi, khi home root đã là `".ultraworkers"`, hình thức của đúng cái refactor đó chính là `PROJECT_DIR_NAME = CONFIG_DIR_NAME`. (e) Để nguyên pin literal ở `legacy-pi-cli-exports.test.ts:14`: test đó đỏ ở W6 vì một lý do hợp lệ mà không ai giải thích được, biến một lần migration chịu đựng được thành một bí ẩn.

Một điểm đã **xác minh** và trái ngược với phần mô tả ban đầu: ghi chú của harness rằng "`bun test` bị chặn, mọi test đều báo 0 pass / 1 fail / 1 error" là **SAI** như một mệnh đề chung. Nó đúng cho `packages/coding-agent/test/` và sai cho `packages/utils/test/`. Đo trực tiếp: `bun test packages/utils/test/dirs.test.ts` -> 6 pass, 0 fail; `bun test packages/utils/test/install-id.test.ts` -> 5 pass, 0 fail; `bun test packages/coding-agent/test/config/settings-reload.test.ts` -> 0 pass, 1 fail, 1 error với `Failed to load pi_natives native addon for darwin-arm64`. Đã tìm ra lý do: `packages/utils/src/dirs.ts` chỉ import `node:fs`, `node:os`, `node:path` và `../package.json` của chính nó — nó không có đường nào tới native addon, nên test của utils không bị ảnh hưởng. Hệ quả với spec này: test mới đặt ở `packages/utils/test/` đúng để cổng có một tín hiệu đỏ/xanh chạy được trên máy này.

### Phụ thuộc

**Phụ thuộc vào:**

- W3 — `APP_NAME` phải đã mang giá trị mới; phép join candidate XDG ở `dirs.ts:360` suy ra root thứ hai từ nó, và W6a không được là commit đổi nó.
- W4 — **CỔNG Cứng.** Danh sách candidate đọc có thứ tự và `getConfigWriteRoot()` tách riêng chính là thứ làm cho cú flip của W6 sống sót. W6a là thứ ngăn cú flip đi quá home root và vào repo của người dùng. Không có W4 thì không có lý do gì để tách hằng.
- W5 — **CỔNG Cứng.** `config migrate` là con đường thủ công để người dùng quay lại. W6a cố ý KHÔNG mở rộng nó tới project root (phương án b), nên W5 phải ship với phạm vi được nói rõ là giới hạn ở hai home root, nếu không hai bên sẽ bất đồng về nghĩa của từ "đã migrate".

**Chặn:**

- W6 — đây là sub-task bắt buộc của W6, không phải người bạn tuỳ chọn đi kèm. W6 không được merge nếu thiếu nó; spec được viết để land trước hoặc trong cùng commit.
- W7 — dòng do_not_rename tạo ở bước 8 là một phần của danh sách loại trừ mà sed trên 4107 file của W7 nạp.
- Definition-of-done của M5 — điều kiện "on-disk identity shipped" không thành sự thật cho tới khi project root chứng minh được là vẫn còn được đọc.
- W13 — tài liệu chạy sau W6, nên mọi tài liệu viết ở đó có thể nêu một tên thư mục project duy nhất thay vì hai tên.

### Cách sai dễ nhất

Cách hỏng nhiều khả năng nhất là tin vào cách diễn đạt của plan rằng W6a là một dòng ở `dirs.ts:590`, và để `discovery/helpers.ts:47` cùng `omfg-controller.ts:285` tiếp tục đọc `CONFIG_DIR_NAME`. Cả hai được tìm ra bằng cách chạy cái grep mà plan không chạy, và cả hai hỏng theo cùng một kiểu âm thầm: rules phạm vi project phân giải tới một thư mục rỗng và discovery project-local skills, commands, agents, hooks trả về không — không lỗi, không cảnh báo thiếu cấu hình, và chính nhãn của trình soạn thảo rules vẫn hiện `This project (.omp/rules)` trong khi chỉ tới một thư mục không tồn tại. Chi tiết cuối cùng chính là thứ làm nó khó chịu: UI xác nhận sai vị trí.

Rủi ro thứ hai là quyết định priorityList ở `config.ts:12` (open question 1) bị quyết bởi ai đang sửa nhanh nhất thay vì bởi một quyết định sản phẩm, vì nó quyết định config cấp project có tiếp tục đọc `.omp` hay lặng lẽ bắt đầu đọc `.ultraworkers`, và làm sai trông y hệt như việc không làm gì. Rủi ro thứ ba là coi khẳng định pin cặp là thừa vì khẳng định giá trị đã ghim `'.omp'` — chúng không thừa: pin cặp vẫn đỏ khi ai đó hợp nhất `PROJECT_DIR_NAME` theo tên home root, và điều khoản (3) của cổng tồn tại chính là để chứng minh điều đó. Rủi ro thứ tư là mục keep-list đến nơi mà không có lý do, khiến nó không review được và phá hỏng đúng mục đích của file mà W7 phụ thuộc. Rủi ro thứ năm, và mang tính cấu trúc: chính `.omp/` của repo này được commit với 14 file theo dõi (`.omp/commands/*.md` x5, `.omp/skills/**` x6, `.omp/tools/**` x3), nên đây không phải chuyện giả định cho codebase này — flip project root sẽ phá commands và skills của chính repo này trên máy của maintainer.

### Cần người quyết

1. **CHẶN** — `packages/coding-agent/src/config.ts:12`. `priorityList` nạp vào CẢ `USER_CONFIG_BASES` (dòng 84) và `PROJECT_CONFIG_BASES` (dòng 90) từ cùng một giá trị `dir`, và dòng 135 so `name !== CONFIG_DIR_NAME` để quyết định opt-in của user source. Nếu `PROJECT_DIR_NAME` được đưa vào mà file này không bị đụng, mục project trong `PROJECT_CONFIG_BASES` sẽ lặng lẽ thành `'.ultraworkers'` — một thay đổi hành vi tầng project ẩn bên trong một cuộc đổi tên hằng. Khuyến nghị: chuyển riêng mục priorityList đó sang `PROJECT_DIR_NAME` để config project tiếp tục đọc `.omp` đã commit. Đây là quyết định sản phẩm (repo của người dùng có giữ `.omp` đã commit hay không) và phải được một con người trả lời trước khi merge, không phải do người hiện thực suy đoán. Ảnh hưởng tới: `getConfigDirs('skills'|'commands'|'agents'|'hooks', {level:'project'})` và mọi tra cứu config cấp project đi qua nó.
2. **KHÔNG CHẶN** — dòng do_not_rename cho `.omp` cấp project nên do work item này tạo hay để cho mục nào tạo `scripts/rename/keep-list.txt` trước. Đã xác minh: `scripts/rename/` không tồn tại ở HEAD 1454dc0, nên ai đó phải tạo nó. Plan section 2.3 giao file đó cho milestone, W7 gác cổng lên nó, và định dạng section 2.3 đòi một `#` reason bắt buộc mỗi mục. Khuyến nghị: W6a tạo nó với đúng một dòng project-`.omp` neo theo đầu dòng (`^\.omp/`), append nếu một work item anh em đã đến trước. KHÔNG dùng mẫu `.omp` trần — nó khớp cả `~/.omp` và sẽ chặn nhầm việc W6/W7 đổi tên home root.
3. **KHÔNG CHẶN** — một sự phân kỳ vĩnh viễn (`CONFIG_DIR_NAME = '.ultraworkers'`, `PROJECT_DIR_NAME = '.omp'`, mãi mãi) có chấp nhận được như một trạng thái cuối đã ship hay cần một đợt theo dõi có mốc. Phương án (b) của plan là một quyết định giữ mãi và N14 ghi nhận nó đúng như vậy. Đáng để một maintainer xác nhận tường minh, vì codebase sẽ vĩnh viễn mang hai tên thư mục, và người đọc dirs.ts:27-40 kế tiếp sẽ hỏi tại sao.
4. **KHÔNG CHẶN, môi trường** — các đối chứng âm của coding-agent (`omfg-controller.test.ts`, `extensions-discovery.test.ts`) không chạy được trên máy này nếu không có `brew install ninja` rồi `bun --cwd=packages/natives run build`. Nên provision môi trường xác minh của milestone một lần để toàn bộ nhóm đối chứng âm trở nên chạy được, hay để mỗi spec tiếp tục khai báo rõ cổng nào của nó không chạy được tại chỗ? Khuyến nghị phương án trước: blocker này đã khiến mọi work item của milestone phải mang một caveat, và một addon chạy được sẽ khiến những tín hiệu mạnh nhất thực sự nổ lên.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Plan line 13796 / 13800: `getProjectAgentDir` tại `packages/utils/src/dirs.ts:589-591` đọc thẳng `CONFIG_DIR_NAME`, "dual-root candidate list from W4 không áp dụng, config migrate từ W5 không đụng tới nó, và acceptance condition của W6 (chỉ phủ home dir và install-id) không nhìn thấy nó." | ĐÚNG nhưng THIẾU — chẩn đoán của plan đúng, cách chữa của plan bị thu hẹp. | Số dòng, lần đọc trực tiếp, và cái mù W4/W5/W6 đều đã xác minh chính xác: `dirs.ts:590` là `return path.join(cwd, CONFIG_DIR_NAME);` và `grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts` trả về đúng 3 hit (27, 298, 590). Điều plan bỏ sót: `dirs.ts:590` chỉ là MỘT trong ba lần đọc cấp project. `git grep -n CONFIG_DIR_NAME -- '*.ts' ':!*test*'` trả về thêm hai project-root join ngoài dirs.ts: `packages/coding-agent/src/discovery/helpers.ts:47` (`projectDir: CONFIG_DIR_NAME`, được `getProjectPath()` ở :127-131 tiêu thụ dưới dạng `path.join(ctx.cwd, paths.projectDir, subpath)`) và `packages/coding-agent/src/modes/controllers/omfg-controller.ts:285` (đường ghi rules phạm vi project). Không cái nào đi qua `getProjectAgentDir()`, nên không cái nào được che phủ bởi việc trỏ lại dòng 590, và văn bản W6a của plan không nêu tên cái nào. Một site thứ ba — `packages/coding-agent/src/config.ts:12` — là quyết định sản phẩm (open question 1), vì priorityList nạp cả bản base user lẫn bản base project từ một giá trị. Hiện thực W6a đúng như plan mô tả để lại hai lần đọc project-root còn sống gắn với hằng đang flip. Bằng chứng: `git grep -n CONFIG_DIR_NAME -- '*.ts' ':!*test*'` -> **15 hit**, trong đó 4 là project-root: dirs.ts:590, discovery/helpers.ts:47, omfg-controller.ts:285, config.ts:12; 2 là dòng comment trong shim (1588, 1589); còn lại là import và use home-root. `sed -n '35,60p' packages/coding-agent/src/discovery/helpers.ts` cho thấy projectDir nạp vào getProjectPath() ở :127-131. `sed -n '275,295p' packages/coding-agent/src/modes/controllers/omfg-controller.ts` cho thấy project-scope rules join. `sed -n '84,93p' packages/coding-agent/src/config.ts` cho thấy priorityList nạp cả USER_CONFIG_BASES và PROJECT_CONFIG_BASES. Xác nhận rằng omfg-controller.test.ts:15,178,198 và agent-session-rules-reload.test.ts:89,156 hard-code đường dẫn .omp và vì thế đỏ nếu bỏ qua việc trỏ lại. |
| Plan line 13809: "Effort: S under the recommended option (b) — a separate constant, one do_not_rename line, one test case asserting getProjectAgentDir() still returns .omp after W6 flips." | ĐÁNH GIÁ THẤP — hạng S vẫn đứng, nhưng phần liệt kê thiếu hai call site, một file test, một dòng test bị sửa, và một quyết định sản phẩm chặn. | Số thật: 1 hằng mới; 4 call site cấp project trong src được trỏ lại (3 cơ học + 1 quyết định) và 4 dòng project-root trong test được trỏ lại theo (`test/sdk-system-prompt-template.test.ts:23`, `test/system-prompt-template.test.ts:42,111,126`); 1 file test mới với 4 khẳng định; 1 dòng của test sẵn có được nới lỏng (`legacy-pi-cli-exports.test.ts:14`); 1 dòng do_not_rename cộng với việc tự tạo chính file `scripts/rename/keep-list.txt`. Câu "one test case" của plan cũng yếu hơn vẻ ngoài: một khẳng định đơn lẻ rằng getProjectAgentDir() trả về '.omp' bị thỏa bởi bất kỳ hiện thực nào tình cờ trả về chuỗi đó, và không phân biệt được một pin cố ý với một sự ràng buộc tai họa vào CONFIG_DIR_NAME. Khẳng định gánh hợp đồng là pin cặp có thứ tự `expect([CONFIG_DIR_NAME, PROJECT_DIR_NAME]).toEqual([CONFIG_DIR_NAME, ".omp"])` — nó là khẳng định duy nhất đỏ khi một refactor tương lai hợp nhất `PROJECT_DIR_NAME` theo tên home root, và hiện không test nào trong repo làm điều đó; phép PHÂN KỲ (`PROJECT_DIR_NAME !== CONFIG_DIR_NAME`) chỉ thành hợp đồng của W6, vì tại thời điểm W6a hai hằng còn bằng nhau nên khẳng định đó sẽ đỏ ngay khi viết ra. Bằng chứng: liệt kê từ `git grep -n CONFIG_DIR_NAME -- '*.ts'`: dirs.ts:27/298/590, help-extra.ts:3,66, config.ts:4,12,135, discovery/helpers.ts:6,47, legacy-pi-coding-agent-shim.ts:1588,1589,1592, omfg-controller.ts:2,285. `ls scripts/rename` -> 'No such file or directory', nên keep-list.txt phải được tạo. `sed -n '1,20p' packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` xác nhận dòng 14 là pin literal. |
| Ghi chú môi trường: "`bun test` bị CHẶN — native addon chưa build, mọi test báo 0 pass / 1 fail / 1 error với Failed to load pi_natives native addon for darwin-arm64." | SAI như mệnh đề chung — đúng cho packages/coding-agent/test/, sai cho packages/utils/test/. | Blocker giới hạn theo package, không phải toàn cục. Đo trên máy này ở HEAD 1454dc0: `bun test packages/utils/test/dirs.test.ts` -> 6 pass, 0 fail, 9 expect() calls, 121ms; `bun test packages/utils/test/install-id.test.ts` -> 5 pass, 0 fail, 11 expect() calls, 115ms; `bun test packages/coding-agent/test/config/settings-reload.test.ts` -> 0 pass, 1 fail, 1 error. Nguyên nhân: `packages/utils/src/dirs.ts` chỉ import node:fs, node:os, node:path và `../package.json` của chính nó — không có đường nào tới native addon. Hệ quả với spec này, đúng thứ harness đã hỏi: một test đặt trong `packages/coding-agent/test/` sẽ là một cổng KHÔNG THỂ đỏ trên máy này, đúng sự nhầm lẫn "xong vs test không chạy" cần tránh. Test mới của W6a vì thế đặt ở `packages/utils/test/`. Điều này cũng nghĩa là câu "bun run check:ts là tín hiệu chính" của harness không phải tín hiệu dùng được duy nhất — một tín hiệu đỏ/xanh thật sự tồn tại cho package sở hữu work item này. Bằng chứng: các lần chạy trực tiếp nêu trên. Danh sách import của dirs.ts xác nhận qua `sed -n '1,17p' packages/utils/src/dirs.ts` (node:fs, node:os, node:path, ../package.json, ./fs-error). Output lỗi của coding-agent nêu đúng module thiếu và in ra hai đường dẫn nó đã thử. |
| Plan line 13199 / N14: "The project-level .omp root (see W6a — recommendation is keep it) ... must go into do_not_rename." | ĐÚNG, và cây code làm lập luận cụ thể hơn cách plan phát biểu. | `.omp` cấp project của chính repo này được git theo dõi với 14 file, nên thất bại mà W6a ngăn chặn không phải chuyện giả định cho codebase này: một cú flip sẽ phá `.omp/commands` của chính maintainer (5 file markdown: cleanup, fix-issues, release, review-prs, triage), `.omp/skills` (6 file trải rộng ở semantic-compression, system-prompts, tool-prompt-optimization) và `.omp/tools` (3 file: package.json, bun.lock, tui.ts). Plan coi project root là mối quan tâm chung của người dùng; nó còn là chính cấu hình làm việc của repo này. Dòng do_not_rename là bắt buộc dù thế nào. Bằng chứng: `git ls-files | grep '^\.omp/'` -> 14 đường dẫn, liệt kê đầy đủ. `ls -la .omp` -> commands/, skills/, tools/. |


---


## W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)

**Sóng:** Wave 3

**Effort:** S theo thao tác gõ (một lệnh `perl -pi` trên 4118 file), M theo kiểm chứng. Phần công việc thật KHÔNG phải là lệnh sửa — nó là chụp baseline, dựng danh sách in-scope, đếm trước, chạy thử không ghi, và chứng minh 5 cổng. Nếu bỏ qua phần đếm và chạy thử, đây là việc không thể hoàn tác khi sai.

**Rủi ro chính:** Có hai tầng. Tầng chặn cứng là chạy trước W2 — phá canonicaliser extension một cách im lặng, và Gate 0 chặn việc này. Tầng đắt nhất về mặt hành vi là `packages/natives/native/loader-state.js:70`: nó `require_.resolve` tới sáu leaf package **đã phát hành trên registry** chứ không phải workspace package; đổi scope ở đó trước khi leaf package tồn tại dưới scope mới khiến `require_.resolve` ném, `catch { return null }` chạy, và loader rơi im lặng sang nhánh dự phòng. Không một lỗi nào được ném, không một test nào đỏ.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/agent/package.json`, `packages/ai/package.json`, `packages/browser-relay/package.json`, `packages/catalog/package.json`, `packages/coding-agent/package.json`, `packages/collab-web/package.json`, `packages/metaharness/package.json`, `packages/mnemopi/package.json`, `packages/natives/package.json`, `packages/omptype/package.json`, `packages/snapcompact/package.json`, `packages/stats/package.json`, `packages/tui/package.json`, `packages/typescript-edit-benchmark/package.json`, `packages/utils/package.json`, `packages/wire/package.json` | sửa | Đổi scope trong trường `name` và trong mọi mục dependencies/peerDependencies/devDependencies/optionalDependencies trỏ tới package nội bộ: `@oh-my-pi/X` → `@ultraworkers/X`. KHÔNG đổi basename sau dấu `/` (N17). Tổng **78 lượt** `@oh-my-pi/` trong 16 manifest (90 nếu tính cả 12 mục ghim ở `package.json` gốc). | có — `git grep -l '"name": "@oh-my-pi/' -- '**/package.json'` trả đúng 16 file, khớp N17 |
| `package.json` (gốc) | sửa | 12 mục ghim trong `catalog` đổi scope: `@oh-my-pi/omp-stats`, `omptype`, `pi-agent-core`, `pi-ai`, `pi-catalog`, `pi-coding-agent`, `pi-mnemopi`, `pi-natives`, `pi-tui`, `pi-utils`, `pi-wire`, `snapcompact` (tất cả đều pin `18.3.3`). | có — `git grep -n '@oh-my-pi/' -- package.json` trả đúng 12 dòng, liên tiếp từ :19 đến :30 |
| `bun.lock` | sửa (tái sinh) | Tái sinh bằng `bun install`. 122 lượt `@oh-my-pi/` hiện có sẽ đổi scope. TUYỆT ĐỐI không sửa tay. | có — `git grep -o -F '@oh-my-pi/' -- bun.lock \| wc -l` = 122 (đếm LẦN XUẤT HIỆN; `git grep -c` đếm DÒNG và chỉ ra 106) |
| `packages/natives/native/loader-state.js` | sửa | **11 lượt** trong file, tất cả đều đổi theo bằng pass: `:70` (dòng RỦI RO — `require_.resolve` tới sáu leaf package trên registry), `:12` và `:119` (comment), và tám chuỗi trong thông báo lỗi người dùng đọc được ở `:715 :722 :753 :795 :797 :800 :803 :844` (`Loaded … which reports @oh-my-pi/pi-natives@…`, `… does not export …`, `try reinstalling: bun install @oh-my-pi/pi-natives`). Không dòng nào trong file này được giữ lại. | có — `grep -n '@oh-my-pi/' packages/natives/native/loader-state.js` trả đúng 11 dòng (12, 70, 119, 715, 722, 753, 795, 797, 800, 803, 844). Nhưng đây là **rủi ro nặng nhất mà plan không nêu**; xem Q1 |
| `.github/workflows/ci.yml` | sửa | 2 lượt: `tarball="$(npm view @oh-my-pi/...)"` và comment 'Publishes the six @oh-my-pi/pi-natives-<tag> leaf packages'. | có — dòng :326 `npm view @oh-my-pi/pi-natives-linux-x64@latest dist.tarball` là bằng chứng sáu leaf package sống trên registry |
| `scripts/install.sh`, `scripts/install.ps1`, `scripts/install-tests/run-ci.sh`, `scripts/install-tests/tarball.dockerfile` | sửa | Đổi scope trong lệnh cài đặt — tổng 25 lượt: run-ci.sh 21, tarball.dockerfile 2, install.sh 1, install.ps1 1. | có — đây là đường cài từ tarball; bỏ sót thì `ci:test:install-methods` hỏng mà typecheck vẫn xanh |
| `nix/bun.nix` | sửa | 16 lượt scope trong định nghĩa nix. | có — không có typecheck nào phủ nix, phải đếm riêng |
| `packages/coding-agent/test/fixtures/before-compaction.jsonl`, `packages/coding-agent/test/fixtures/large-session.jsonl` | sửa | 810 lượt (649 + 161) trong transcript session đã ghi, gồm cả một URL registry `https://registry.npmjs.org/@oh-my-pi/pi-coding-agent/...`. | có — `grep -o -F '@oh-my-pi/'` từng file cho 649 và 161 (`grep -c` chỉ ra 132 và 49 vì đếm DÒNG, không phải lượt). Nhưng đây là **phán đoán**, xem Q2 |
| `.omp/skills/tool-prompt-optimization/SKILL.md`, `.omp/skills/tool-prompt-optimization/scripts/probe.ts`, `.omp/skills/tool-prompt-optimization/scripts/probe-builtin.ts` | sửa | 3 file / 10 lượt. PHẢI sửa — đây là code thật (import statement trong probe scripts), không phải tên thư mục. | có — N14 chỉ khoá TÊN THƯ MỤC `.omp` (N14: `getProjectAgentDir()` đọc `CONFIG_DIR_NAME`), KHÔNG khoá nội dung bên trong |
| (4100 file còn lại trong tập in-scope) | sửa | Đổi `@oh-my-pi/` → `@ultraworkers/` bằng một pass cơ học duy nhất. **Ngoại lệ duy nhất là 2 file `.jsonl` ở `packages/coding-agent/test/fixtures/` (810 lượt), chờ Q2 quyết** — xem bước 4. Không có ngoại lệ nào khác trong tập này. | có — 4118 − 16 manifest − `package.json` gốc − `bun.lock` = 4100 |
| `packages/coding-agent/test/npm-scope-resolution.test.ts` | tạo | Test mới. Ba invariant, xem Hợp đồng test. | **KHÔNG** — spec đánh dấu `verified: false`; file chưa được kiểm chứng là tồn tại hay chưa. Đây là test DUY NHẤT thuộc W7; test tương đương của W2 do W2 sở hữu, KHÔNG lặp lại ở đây. |
| `scripts/rename/keep-list.txt` | KHÔNG tạo ở W7 | Đây là **điều kiện mở** của W7 — file phải tồn tại trên `main`, đã được một người duyệt không phải người viết, trước khi bất kỳ lệnh sed nào chạy. W7 phải dừng và báo nếu nó thiếu. | có — `ls scripts/rename/` hiện KHÔNG tồn tại (exit 2, thư mục không có) tại HEAD `1454dc0` |

### Các bước

1. **DỪNG và kiểm tra điều kiện mở** — neo `scripts/rename/keep-list.txt`. Ba điều phải đồng thời đúng trước khi đụng file nào: (a) `scripts/rename/keep-list.txt` tồn tại trên `main`; (b) nó đã được một người duyệt không phải người viết; (c) W2 đã merge — tức `CANONICAL_PI_SCOPE` tại `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:796` đã trỏ scope mới và `PI_SCOPE_ALIASES` tại `:802` đã giữ chuỗi scope cũ vĩnh viễn. Nếu bất kỳ điều nào chưa đúng: DỪNG, không sửa dòng nào, báo lại. Đây là chặn cứng, không phải cảnh báo.

2. **Xác nhận bằng mắt hai chuỗi scope của W2** — neo `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:796`. Xác nhận (không source-grep vào test) rằng `CANONICAL_PI_SCOPE` và mọi phần tử của `PI_SCOPE_ALIASES` đều **KHÔNG** có dấu `/` ở cuối — cả hai đều là dạng trần. Đây là lý do pass của W7 không chạm tới chúng, và cũng là lý do W2 phải đứng trước. Nếu bất kỳ chuỗi nào đã mang dấu `/`, pass của W7 sẽ phá cơ chế tương thích — DỪNG và báo lại.

3. **Chụp baseline TRƯỚC mọi thay đổi**, ghi ra /tmp, không để trong repo:

   ```bash
   extract_released() { awk '/^## \[Unreleased\]/{u=1} /^## \[/{if(u&&$0!~/Unreleased/){u=0}} !u{print}'; }
   for f in $(git ls-files 'packages/*/CHANGELOG.md'); do
     printf '%s:%s\n' "$f" "$(extract_released "$f" | grep -o -F '@oh-my-pi/' | wc -l | tr -d ' ')"
   done > /tmp/w7-changelog-baseline.txt
   git grep -lE '"oh-my-pi"' -- . > /tmp/w7-bare-baseline.txt
   git grep -o -F '@oh-my-pi/' -- . | wc -l > /tmp/w7-all-hits-baseline.txt
   git rev-parse HEAD > /tmp/w7-head-baseline.txt
   ```

   Baseline thứ nhất PHẢI là 13 file / 85 lượt trong phần ĐÃ PHÁT HÀNH (đã đo ở cả `84cbac9` và HEAD `1454dc0`; toàn bộ 85 lượt đều nằm dưới header đã phát hành, phần `[Unreleased]` có 0). Ghi con số thật vào commit message — con số này chỉ dùng để phát hiện cây đã đổi, không dùng làm điều kiện dừng cứng. Baseline thứ tư là MỐC HOÀN TÁC dùng ở Bước 7b, và baseline thứ ba là tổng lượt toàn repo dùng ở GATE A2 — cả hai đều phải được dùng, không phải chụp rồi bỏ.

4. **Tạo file danh sách in-scope từ `git ls-files`** (KHÔNG dùng `git grep -- .` để sinh danh sách — nó sẽ kéo theo chính các file loại trừ). Chạy đúng nguyên văn:

   ```bash
   git ls-files -z \
     ':(exclude)packages/*/CHANGELOG.md' \
     ':(exclude).lavish-wip/**' \
     ':(exclude)COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \
     ':(exclude)MILESTONE_*_EXECUTION_PLAN.md' \
   | xargs -0 grep -l -F '@oh-my-pi/' > /tmp/w7-inscope-files.txt
   ```

   Kỳ vọng tại HEAD `1454dc0`: **4118 dòng**. Chạy lại tại thời điểm thực thi và ghi con số thật vào commit message; con số 4118 chỉ đúng ở `84cbac9` và `1454dc0`.

   **Q2 phải được quyết trước khi pass chạy**, để không bao giờ bị quyết ngầm. Nếu Q2 quyết "giữ 2 transcript `.jsonl` làm lịch sử", thêm `':(exclude)packages/coding-agent/test/fixtures/*.jsonl'` vào lệnh `git ls-files` ở trên và đếm lại (4118 − 2 = 4116 file, 17212 − 810 = 16402 lượt). Nếu Q2 quyết "sửa", KHÔNG thêm exclude — pass phủ cả hai, và GATE A/B/C không bị ảnh hưởng.

5. **Đếm chuỗi và ghi ra.** Đây là bước BẮT BUỘC trước khi sửa — một lệnh trên 4118 file không thể hoàn tác nếu sai:

   ```bash
   xargs -a /tmp/w7-inscope-files.txt grep -o -F '@oh-my-pi/' | wc -l
   ```

   Kỳ vọng tại HEAD `1454dc0`: **17212**. Dừng nếu lệch.

6. **Chạy thử KHÔNG GHI (dry run) và đọc kết quả bằng mắt:**

   ```bash
   # Bước 6 — chạy thử KHÔNG GHI trên BẢN SAO, và PHẢI ĐỎ ĐƯỢC khi công cụ hỏng
   rm -rf /tmp/w7-dry && mkdir -p /tmp/w7-dry
   tar -cf - -T /tmp/w7-inscope-files.txt | (cd /tmp/w7-dry && tar -xf -)
   ( cd /tmp/w7-dry && tr '\n' '\0' < /tmp/w7-inscope-files.txt \
       | xargs -0 perl -pi -e 's{\@oh-my-pi/}{@ultraworkers/}g' ) \
     || { echo 'DRY RUN FAIL: perl không xử lý hết tập file — DỪNG'; exit 1; }
   # cây thật phải KHÔNG đổi
   git diff --quiet || { echo 'DRY RUN FAIL: cây thật bị đụng — DỪNG'; exit 1; }
   # bản sao phải khác, và scope cũ trong bản sao phải về 0
   test "$(cd /tmp/w7-dry && grep -ro -F '@ultraworkers/' . | wc -l | tr -d ' ')" -eq 17212 \
     || { echo 'DRY RUN FAIL: bản sao không thay đủ 17212 lượt — DỪNG'; exit 1; }
   test "$(cd /tmp/w7-dry && grep -ro -F '@oh-my-pi/' . | wc -l | tr -d ' ')" -eq 0 \
     || { echo 'DRY RUN FAIL: bản sao vẫn còn scope cũ — DỪNG'; exit 1; }
   rm -rf /tmp/w7-dry
   echo "dry-run OK — cây thật chưa bị đụng"
   ```

   KHÔNG dùng `xargs -a` (không có trên macOS), KHÔNG dùng cờ `--dry-run` (không tồn tại ở cả BSD sed lẫn perl), và KHÔNG để `|| true` ở cuối. Bản cũ không thể thất bại — nó luôn trả 0, nên nó chứng minh điều gì cũng không: (1) `xargs -a` bị BSD xargs từ chối nên cả hai vế chết trước khi gọi sed/perl; (2) nếu sửa (1), `sed --dry-run` exit 1 với `illegal option -- -`; (3) nếu sửa (2), `perl --dry-run` exit 25 với `Unrecognized switch`; lớp `|| true` nuốt tất cả. Người đọc chạy bản cũ thấy exit 0 và kết luận "công cụ đã được kiểm chứng" — trong khi không lệnh nào chạy. Đây đúng là mẫu "cổng báo xanh vì không chạy" mà Sai lầm 9 cảnh báo. Dry run chỉ an toàn khi nó ghi vào thư mục tạm rồi so kết quả, không phải khi dựa vào một cờ không tồn tại.

   Nếu `sed -i ''` (kiểu BSD/macOS) không khả dụng thì dùng `perl -pi -e`. Chốt một công cụ, không trộn hai công cụ. Mục đích của bước này là xác nhận công cụ xử lý được đúng 4118 file với tên file có ký tự lạ (`.omp/skills/...`), KHÔNG phải để xem nội dung.

7. **PASS DUY NHẤT.** Dùng đúng danh sách từ bước 4, dùng đúng công cụ đã chốt ở bước 6:

   ```bash
   # Bước 7 — PASS DUY NHẤT (dùng công cụ đã chốt ở bước 6)
   # Bắt buộc: KHÔNG dùng `xargs -a` — /usr/bin/xargs trên macOS là BSD và từ chối cờ đó
   # (`xargs: invalid option -- a`, exit 1), nên perl KHÔNG chạy và không file nào đổi.
   # Truyền danh sách qua stdin thay vì qua cờ:
   tr '\n' '\0' < /tmp/w7-inscope-files.txt \
     | xargs -0 perl -pi -e 's{\@oh-my-pi/}{@ultraworkers/}g'
   echo "pass exit=$?"
   ```

   **Nếu lệnh trên báo lệnh sai (vd `xargs: invalid option`), DỪNG NGAY, đừng tự sửa lệnh rồi chạy lại** — xem Bước 7b để hoàn tác, rồi báo lại.

   Sau đó ĐỌC LẠI 3 file đại diện bằng mắt và xác nhận scope đã đổi đúng: `packages/ai/package.json` (dòng `name`), `package.json` (một trong 12 mục ghim), `packages/coding-agent/src/index.ts` (một import). KHÔNG chạy pass thứ hai — pass thứ hai là thứ làm hỏng việc này.

7b. **Đường hoàn tác — đọc TRƯỚC khi chạy pass ở bước 7.** Pass `perl -pi` trên 4118 file không thể hoàn tác bằng trực giác: cách phản xạ của người ta khi hoảng là chạy thêm một pass nữa để "sửa ngược", và đó đúng là thứ phá N17. Mốc hoàn tác đã nằm sẵn trên đĩa từ bước 3:

   ```bash
   # Mốc hoàn tác — BẮT BUỘC tồn tại trước khi chạy pass
   test -s /tmp/w7-head-baseline.txt || { echo 'BLOCKED: chưa chụp baseline ở bước 3'; exit 1; }
   git diff --quiet && git diff --cached --quiet \
     || { echo 'BLOCKED: cây đang bẩn — commit hoặc stash trước khi chạy pass'; exit 1; }
   # LỆNH HOÀN TÁC DUY NHẤT — dán nguyên văn vào commit message:
   #   git restore --worktree --staged -- . && git clean -fd
   ```

   Sau pass, kiểm chứng pass ĐÚNG chứ không chỉ "không còn sót" — và số file đổi phải khớp tập in-scope:

   ```bash
   # mọi dòng diff phải thuần túy là thay scope — bắt được bất kỳ thay đổi nào lọt vào ngoài ý định
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

   **Người review.** Diff của W7 do đúng một người khác người chạy pass đọc, theo bộ lọc trên (`git diff -U0 --name-only`, bỏ qua 18 file manifest+lock vì chúng có cổng riêng ở bước 8/9). Người review ký tên vào commit message. Không ai được tự duyệt diff của pass mình chạy.

8. **XÁC MINH 16 manifest, KHÔNG SỬA** (anchor: `packages/agent/package.json` … `packages/wire/package.json`). Pass ở bước 7 đã phủ cả 16 trường `name` và 12 mục ghim. Chứng minh bằng:

   ```bash
   git grep -l '"name": "@oh-my-pi/' -- '**/package.json'   # phải trả RỖNG
   git grep -n '"name": "@ultraworkers/' -- '**/package.json' | wc -l   # phải bằng 16
   git grep -n '"@ultraworkers/' -- package.json | wc -l            # phải bằng 12
   git grep -n '"@oh-my-pi/' -- package.json                        # phải trả RỖNG
   ```

   Danh sách 16 basename sau dấu `/` phải Y NGUYÊN: pi-agent-core, pi-ai, pi-catalog, pi-coding-agent, pi-metaharness, pi-mnemopi, pi-natives, pi-tui, pi-utils, pi-wire, omp-stats, omptype, browser-relay, collab-web, snapcompact, typescript-edit-benchmark. Nếu bất kỳ basename nào đổi, hoàn tác và báo lại — đó là vi phạm N17.

9. **Tái sinh lockfile, KHÔNG sửa tay** (anchor: `bun.lock`):

   ```bash
   bun install
   ```

   Sau đó `git grep -c '@oh-my-pi/' -- bun.lock` phải trả 0, và `git diff --stat bun.lock` phải cho thấy thay đổi. Nếu `bun install` sửa thêm file ngoài `bun.lock` (ví dụ `package.json`), kiểm tra kỹ từng file đó — nó có thể là dấu hiệu một `name` manifest lệch với mục ghim catalog.

10. **Chứng minh phân giải tới WORKSPACE chứ không phải bản registry** (anchor: `node_modules/@ultraworkers`). Đây là hợp đồng sạch cài mà plan yêu cầu, và là thứ typecheck KHÔNG bắt được — `node_modules` hiện tại là symlink hoist nên typecheck xanh ngay cả khi `name` sai. Sau `bun install`:

    ```bash
    ls -l node_modules/@ultraworkers | head -20
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
    process.exit(bad ? 1 : 0);
    '
    ```

    Lệnh thứ hai phải **THOÁT 0 và in ra rỗng**. In ra dòng nào, hoặc thoát khác 0 — kể cả khi nó ném ENOENT vì `node_modules/@ultraworkers` chưa tồn tại (đo ở HEAD: thư mục này chưa có, lệnh cũ im lặng rồi chết) — đều là ĐỎ. Cốt lõi: chạy GATE F ở mục Cổng hoàn thành, đừng đọc mắt. Dòng `NOT WORKSPACE` nghĩa là package đó bị tải từ registry thay vì link workspace — tức một `name` manifest chưa khớp với mục ghim, và bản cài sạch sẽ hỏng. Tham chiếu hình dạng hiện tại: `node_modules/@oh-my-pi/*` là symlink trỏ `../../packages/<name>`.

11. **Viết test mới** tại `packages/coding-agent/test/npm-scope-resolution.test.ts` theo ba invariant ở mục Hợp đồng test, mỗi test một invariant. TUYỆT ĐỐI KHÔNG source-grep file implementation, KHÔNG dùng `mock.module()`. Chạy được bằng `bun test` khi native addon đã build (xem Xác minh về trạng thái môi trường).

12. **Chạy cổng**, theo đúng thứ tự ở mục Cổng hoàn thành. Ghi kết quả TỪNG cổng vào commit message, kể cả cổng không chạy được — một cổng bị chặn môi trường phải được ghi là `NOT RUN — environment blocked`, TUYỆT ĐỐI không ghi là `pass`.

13. **Changelog: phần ĐÃ PHÁT HÀNH là bất biến (N11).** KHÔNG sửa, KHÔNG sắp xếp lại bất kỳ mục nào dưới header đã phát hành, trong bất kỳ package nào. Cổng B ở mục Cổng hoàn thành bảo vệ đúng phạm vi đó — nếu cổng B đỏ, pass đã quét nhầm phần đã phát hành và phải hoàn tác (xem Bước 7b). Khối `## [Unreleased]` thì ĐƯỢC thêm mục, và AGENTS.md BẮT BUỘC thêm cho thay đổi user-facing: đổi scope npm trên registry là thay đổi user-facing rõ ràng (`@oh-my-pi/X` không còn tồn tại sau W7). Mục bắt buộc cho W7, đặt vào `## [Unreleased]` của từng package liên quan, mỗi dòng một câu: các package đã đăng ký trong `catalog` đổi tên phát hành từ `@oh-my-pi/X` sang `@ultraworkers/X`, basename sau dấu `/` giữ nguyên (N17). Đừng đặt mục đó trong phần đã phát hành.

### Hình dạng code

W7 không viết TypeScript mới. Đây là bản gốc của khối hình dạng trong đặc tả, giữ nguyên:

```typescript
// Không có code TypeScript mới do W7 viết. W7 là một pass thay chuỗi cơ học
// trên 4118 file, cộng một file test.
//
// Hình dạng duy nhất cần giữ nguyên — dòng RỦI RO trong loader-state.js (:70):
//
//   function resolveLeafPackageDir(platformTag) {
//     try {
//       const require_ = createRequire(import.meta.url);
//       //   @oh-my-pi/pi-natives-<tag>  ->  @ultraworkers/pi-natives-<tag>
//       // ^ KHÔNG phải workspace package: sáu leaf package này được PUBLISH lên
//       //   registry. Đổi scope ở đây trước khi chúng tồn tại dưới scope mới
//       //   khiến require_.resolve() ném, `catch { return null }` chạy, và loader
//       //   rơi im lặng sang nhánh dự phòng. KHÔNG có lỗi nào được ném.
//       return path.dirname(require_.resolve(`@ultraworkers/pi-natives-${platformTag}/package.json`));
//     } catch {
//       return null;
//     }
//   }
//
// Hình dạng thứ hai — manifest sau khi đổi (basename giữ nguyên, N17):
//
//   packages/ai/package.json       "name": "@ultraworkers/pi-ai"
//   packages/stats/package.json    "name": "@ultraworkers/omp-stats"
//   packages/browser-relay/…       "name": "@ultraworkers/browser-relay"
//
// Ba họ tên dưới MỘT scope. Đó là hệ quả có chủ ý của N17, không phải sơ suất.
//
// Lệnh duy nhất được chạy trên toàn bộ tập (đúng như bước 7 — KHÔNG dùng `xargs -a`,
// cờ đó không tồn tại trên /usr/bin/xargs của macOS):
//   tr '\n' '\0' < /tmp/w7-inscope-files.txt \
//     | xargs -0 perl -pi -e 's{\@oh-my-pi/}{@ultraworkers/}g'
//
// Một pass. KHÔNG có pass thứ hai cho basename, KHÔNG có pass cho token `omp`
// (đó là W8b, 585 file, cần bảng quyết định từng file).
```

### Hợp đồng test

Một file duy nhất, `packages/coding-agent/test/npm-scope-resolution.test.ts` (mới), ba invariant, mỗi cái một test.

**Nếu hồi quy, người dùng sẽ thấy gì?** Người dùng cài sạch từ tarball hoặc từ registry, `bun install` kéo package từ registry thay vì link workspace, mọi import nội bộ hỏng, typecheck xanh trên máy của kỹ sư nhưng bản cài của người dùng vỡ. Ba test sau chặn đúng ba đường thoát đó:

1. **Phân giải tới workspace, không phải registry.** Dùng `import.meta.resolve("@ultraworkers/pi-utils")` và assert đường dẫn resolve nằm dưới `<repo>/packages/`. Lỗi bị chặn: manifest `name` đã đổi nhưng `exports` map hoặc mục ghim catalog chưa khớp, khiến bản cài sạch kéo package từ registry thay vì link workspace. Test này KHÔNG bắt được bằng typecheck khi `node_modules` đã hoist — đó là lý do nó tồn tại.
2. **Manifest và mục ghim catalog phải khớp nhau.** Duyệt `packages/*/package.json` + `package.json` gốc lúc chạy, so tập tên trong `catalog` với tập `name`. Lỗi bị chặn: một manifest đổi scope còn mục ghim không đổi (hoặc ngược lại) — typecheck vẫn xanh, `bun install` vẫn chạy, nhưng lockfile ghi sai và bản cài sạch hỏng. Đây là quan hệ giữa hai file, không phải so một hằng số với chính nó.
3. **Basename vẫn được host bundle phân giải được.** Sau khi đổi scope, mọi basename trong `PI_PACKAGE_NAMES` (`legacy-pi-compat.ts:805`) đều còn tồn tại như phần sau dấu `/` của một `name` workspace nào đó, và `PI_PACKAGE_ALTERNATION` (`:808`) khớp `name` đó dưới scope mới. Đây là quan hệ giữa bảng phân giải và manifest, không phải so một danh sách basename viết cứng với chính nó. Lỗi bị chặn: một basename bị đổi theo trong lúc đổi scope — rủi ro cụ thể của W7 là nhóm bốn tên không mang chữ `pi` lẫn `omp` (`browser-relay`, `collab-web`, `snapcompact`, `typescript-edit-benchmark`), chúng không bị hướng dẫn 'đổi cái mang thương hiệu cũ' nào chạm tới; đổi chúng phá `PI_PACKAGE_NAMES`, khiến `LEGACY_PI_SPECIFIER_FILTER` (`:837`) không khớp specifier của extension và extension cũ âm thầm nạp bản native trùng lặp từ npm thay vì bản bundle trong host. (Nếu W2 đã có test phủ `PI_PACKAGE_NAMES` thì bỏ invariant này khỏi W7 và ghi "thuộc W2".)

KHÔNG viết: test source-grep (đọc file rồi `toContain` vào text — bị cấm), test khẳng định chuỗi scope là hằng số, test `expect(true).toBe(true)`, và KHÔNG lặp lại test tương đương của W2 (thuộc W2 sở hữu). Lưu ý ranh giới: đọc một manifest rồi `JSON.parse` nó là đọc DỮ LIỆU, không phải source-grep — cái bị cấm là `expect(raw).toContain("...")` trên text thô của một file implementation.

### Xác minh

Môi trường đã được kiểm chứng bằng lệnh thật trên máy này, HEAD `1454dc0` (đo lại từ `84cbac9` vì cây đã dời một commit). Kết luận quan trọng nhất: **các lệnh kiểm chứng được và không được dùng làm cổng đã tách sẵn**.

- `bun run check:ts` chạy được và exit 0 ở HEAD — đo baseline thật: oxlint+oxfmt sạch (5445 file), rồi **16** workspace `check:types` đều Done (đếm bằng `for p in packages/*/package.json; do grep -q '"check:types"' "$p" && basename $(dirname "$p"); done` → 16 tên). Banner in ra `@oh-my-pi/pi-ai:check:types` … `@oh-my-pi/typescript-edit-benchmark:check:types`. Sau W7 banner phải đọc `@ultraworkers/...`. Đây là tín hiệu quan sát được rõ nhất.
- `bun run check` KHÔNG dùng làm cổng: nó là `bun run --parallel check:ts check:rs`, cần cargo, chưa xác minh ở đây.
- `bun test` bị chặn **một phần**, không phải toàn cục. Chặn là **CHỌN LỌC theo bề mặt import, không phải toàn cục** — đo tại HEAD `106eb3e`, 2026-09-28, trong khi addon của `packages/natives` CHƯA build: `packages/omptype` **1.191 test / 0 fail** và `packages/utils` chạy được. Chỉ những file import `pi_natives` mới đỏ. Phép đo theo package: `omptype` 1139/0 · `utils` 658/17 · `catalog` 141/104 · `stats` 43/19 · `mnemopi` 146/53 · `agent` 4/46 · `ai` 73/450 · `tui` 149/205 · `coding-agent` 913/1445.
- Lệnh gỡ chặn `bun --cwd=packages/natives run build` THẤT BẠI: `CMake Error: CMake was unable to find a build program corresponding to "Ninja". CMAKE_MAKE_PROGRAM is not set.` (đã tái hiện ở HEAD `1454dc0`; `cmake` có ở `/opt/homebrew/bin/cmake`, `ninja` thì không). `brew install ninja` là **ĐIỀU KIỆN ĐẦU TIÊN và là chặn đầu tiên đã quan sát được — đường còn lại chưa từng chạy tới cuối**: build phải biên dịch crate `opusic-sys` (có trong `Cargo.lock`) qua cmake, nên sau `ninja` còn có thể có chặn thứ hai. Hãy ghi kết quả từng lần build thất bại thay vì giả định một lệnh là đủ. GATE E vẫn là `NOT RUN — environment blocked` cho tới khi `bun test` thực sự chạy.

Vì vậy ba cổng nghiệm thu gốc của plan được thay bằng một `check:ts` đã đo thật, cộng một cổng test riêng ghi rõ là bị chặn môi trường:

```bash
# chạy được
bun run check:ts

# bị chặn — thứ tự DỰ KIẾN, mới xác minh được tới bước đầu tiên (xem Xác minh)
brew install ninja
bun --cwd=packages/natives run build
bun run test:ts
```

### Cổng hoàn thành

Chạy theo đúng thứ tự. Dừng ngay khi cổng đầu tiên đỏ.

**GATE 0 — điều kiện mở**

```bash
test -f scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list.txt missing — W7 is BLOCKED'; exit 1; }
# W2 đã merge ⇔ hằng số đã trỏ scope MỚI — không được chỉ kiểm tra tên hằng tồn tại
grep -qE '^const CANONICAL_PI_SCOPE = "@ultraworkers";' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts \
  || { echo 'GATE 0 FAIL: W2 not landed (CANONICAL_PI_SCOPE vẫn trỏ scope cũ)'; exit 1; }
# và bí danh tương thích phải còn giữ scope cũ vĩnh viễn (N8)
grep -qE 'PI_SCOPE_ALIASES = \[.*"oh-my-pi"' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts \
  || { echo 'GATE 0 FAIL: PI_SCOPE_ALIASES đã mất scope cũ — phá extension tương thích'; exit 1; }
```

Phân biệt được: không có keep-list là BLOCKED, không phải 'chưa xong'.

Bản cũ dùng `git grep -q 'CANONICAL_PI_SCOPE' <path>` — kiểm tra SỰ TỒN TẠI của tên hằng, không kiểm tra GIÁ TRỊ. Ở HEAD (W2 chưa merge) lệnh đó trả 0 vì `CANONICAL_PI_SCOPE` đã tồn tại sẵn với giá trị cũ `"@oh-my-pi"` (dòng :796) — tức đúng trạng thái mà GATE 0 sinh ra để chặn. Cổng cũ vì thế xanh khi W2 chưa merge VÀ xanh khi W2 đã merge: không phân biệt được hai trạng thái, tức Sai lầm 1 ("chạy trước W2") không hề bị chặn. Bản mới kiểm tra giá trị, và đã đo: ở HEAD lệnh mới FAIL (đúng), còn kiểm tra `PI_SCOPE_ALIASES` vẫn giữ `"oh-my-pi"` thì PASS (đúng). Dùng `grep` trên file thay vì `git grep <path>` để không phụ thuộc cách `git grep` hiểu tham số thiếu `--`.

**GATE A — residue trong tập in-scope**

```bash
# GATE A — residue trong tập in-scope: đếm FILE có residue, không phải số dòng output
tr '\n' '\0' < /tmp/w7-inscope-files.txt \
  | xargs -0 grep -l -F '@oh-my-pi/' \
  | grep . && { echo 'GATE A FAIL: leftover scope in in-scope set'; exit 1; }
```

Hai lỗi của bản cũ đã được đo và đã sửa. (1) `xargs -a` là cờ GNU — `/usr/bin/xargs` trên macOS là BSD và từ chối nó (`xargs: invalid option -- a`, exit 1), nên xargs in lỗi ra stderr, KHÔNG chạy grep, in 0 dòng ra stdout; `wc -l` = 0 ⇒ `test 0 -eq 0` ĐÚNG ⇒ cổng xanh trên cây bẩn. (2) Ngay cả khi bỏ `xargs -a`, `grep -c` in MỘT DÒNG CHO MỖI FILE kể cả file sạch (`clean1.txt:0`), nên `wc -l` luôn ≥ 1 ⇒ `test ... -eq 0` luôn FALSE ⇒ cổng đỏ trên cây hoàn toàn sạch. Bản cũ vì thế đỏ khi sạch và xanh khi bẩn. Bản mới dùng `grep -l` (chỉ in tên file KHỢP) và truyền danh sách qua `tr | xargs -0`, chạy được trên cả BSD và GNU. Đã kiểm chứng trên hai tập thật: tập có residue → đỏ, tập sạch → xanh.

Phân biệt được: đỏ ⇒ pass chưa phủ hết tập, HOẶC danh sách in-scope đã cũ. Cả hai đều là lỗi thật.

**GATE A2 — tổng lượt scope cũ toàn repo không được đổi hướng** (dùng baseline thứ ba ở bước 3)

```bash
test "$(git grep -o -F '@oh-my-pi/' -- . | wc -l | tr -d ' ')" -eq "$(cat /tmp/w7-all-hits-baseline.txt | tr -d ' ')" \
  || { echo 'GATE A2 FAIL: tổng lượt scope đổi hướng — có thêm scope cũ ở file ngoài tập in-scope, hoặc đã quét lệch — hoàn tác'; exit 1; }
```

Cổng này soi thứ mà GATE A không thấy: file NGOÀI tập in-scope bị thêm scope cũ.

**GATE B — N11 changelog không bị đụng (chống tự lừa)**

```bash
# GATE B — chỉ phần ĐÃ PHÁT HÀNH; [Unreleased] được phép đổi (xem bước 13)
extract_released() { awk '/^## \[Unreleased\]/{u=1} /^## \[/{if(u&&$0!~/Unreleased/){u=0}} !u{print}' "$1"; }
for f in $(git ls-files 'packages/*/CHANGELOG.md'); do
  printf '%s:%s\n' "$f" "$(extract_released "$f" | grep -o -F '@oh-my-pi/' | wc -l | tr -d ' ')"
done > /tmp/w7-changelog-after.txt
diff /tmp/w7-changelog-baseline.txt /tmp/w7-changelog-after.txt || { echo 'GATE B FAIL: phần CHANGELOG đã phát hành bị viết lại — released sections are immutable'; exit 1; }
```

Baseline PHẢI được tạo ở bước 3 bằng ĐÚNG hàm `extract_released` trên, và PHẢI là 13 file / 85 lượt. Đây là cổng quan trọng nhất của W7: Gate A KHÔNG bắt được chuyện pass đã quét changelog (changelog bị viết sạch thì Gate A vẫn xanh vì changelog vốn đã nằm ngoài tập in-scope — nhưng nếu ai đó lỡ xoá exclusion thì Gate A im lặng và Gate B đỏ). Hai cổng soi hai lỗi khác nhau.

Cổng này cố tình chỉ soi phần đã phát hành, vì AGENTS.md nói "Never modify already-released sections" và "New entries always go under `## [Unreleased]`" — nếu nó so TOÀN BỘ file thì chính mục `[Unreleased]` mà AGENTS.md bắt buộc thêm cho W7 sẽ làm cổng đỏ. Đo ở HEAD: cả 85 lượt đều nằm dưới header đã phát hành, phần `[Unreleased]` có 0 lượt.

**GATE C — cross-check dạng trần**

```bash
git grep -lE '"oh-my-pi"' -- . > /tmp/w7-bare-after.txt
diff /tmp/w7-bare-baseline.txt /tmp/w7-bare-after.txt || { echo 'GATE C FAIL: bare form drifted — W7 must not touch it (W8 owns it)'; exit 1; }
```

Baseline PHẢI là 16 file. Grep sạch trên dạng có `/` KHÔNG chứng minh gì về dạng trần — đây là cổng bù cho đúng cái lỗ đó.

**GATE D — typecheck + banner**

```bash
# GATE D — chạy check:ts MỘT lần, bắt output, rồi kiểm cả ba điều kiện trên cùng output
out="$(bun run check:ts 2>&1)"; rc=$?
printf '%s\n' "$out" | tail -20
test $rc -eq 0                                              || { echo "GATE D FAIL: check:ts exit $rc"; exit 1; }
printf '%s\n' "$out" | grep -q '@ultraworkers/.*check:types' || { echo 'GATE D FAIL: banner chưa đổi scope'; exit 1; }
! printf '%s\n' "$out" | grep -q '@oh-my-pi/.*check:types'  || { echo 'GATE D FAIL: banner còn scope cũ'; exit 1; }
echo 'GATE D PASS'
```

Bản cũ chạy `bun run check:ts` ba lần, và dòng đầu không có `|| { …; exit 1; }` nên trong một shell chạy tuần tự, `check:ts` in lỗi rồi hai lệnh grep vẫn chạy tiếp — trái với "Dừng ngay khi cổng đầu tiên đỏ" ở đầu mục. `check:ts` là `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types` (oxlint + oxfmt trên 5445 file rồi mới **16** workspace typecheck), nên ba lần là ba lần lint+typecheck toàn repo. Bản mới chạy một lần và chốt từng điều kiện.

Cổng này phân biệt 'scope đã đổi thật' (banner đổi) với 'check pass vì node_modules cũ vẫn còn' (banner không đổi).

**GATE E — bộ test TS: NOT RUN, environment blocked**

Không chạy được ở máy này. Ghi vào commit message đúng ba chữ:

```
test:ts = NOT RUN — environment blocked (pi_natives native addon not built)
```

Gỡ chặn: `brew install ninja && bun --cwd=packages/natives run build && bun run test:ts`. TUYỆT ĐỐI không ghi 'pass' cho cổng này khi nó chưa chạy. Nếu CI có runner đã build native addon thì chạy `bun run test:ts` ở đó và dán kết quả vào PR.

**GATE F — bổ sung (khuyến nghị, chạy được)**

```bash
# GATE F — mọi package dưới scope mới phải là symlink workspace, không phải bản registry
node -e '
const fs = require("fs");
let d;
try { d = fs.readdirSync("node_modules/@ultraworkers"); }
catch (e) { console.log("GATE F FAIL: node_modules/@ultraworkers missing —", e.code); process.exit(1); }
let bad = 0;
for (const n of d) {
  const p = fs.realpathSync("node_modules/@ultraworkers/" + n);
  if (!p.includes("/packages/")) { console.log("NOT WORKSPACE:", n, p); bad++; }
}
if (d.length === 0) { console.log("GATE F FAIL: scope dir empty"); bad++; }
process.exit(bad ? 1 : 0);
'
```

Cổng cài sạch rẻ: bắt được lỗi mà typecheck không bắt.

Bản cũ viết `node -e '…' | grep . && { echo …; exit 1; }` và **không bao giờ xanh** — đo trên ba trạng thái thật: cây sạch (exit 1, im lặng, không in gì), bản registry (exit 1, in `NOT WORKSPACE` rồi `GATE F FAIL`), và `node_modules/@ultraworkers` chưa tồn tại (exit 1, im lặng). Nguyên nhân: `grep .` trả 1 khi producer không in dòng nào, và `&&` rồi trả chính 1 đó — nên cả trường hợp ĐÚNG cũng đỏ, còn lỗi của `readdirSync` (ENOENT) cũng đỏ nhưng không in thông điệp, không phân biệt được với cổng đã bắt được lỗi thật. Bản mới để chính script node quyết định exit code, nên phân biệt được cả ba trạng thái.

**Cổng này có thực sự đỏ được không?** Có — `gate_can_fail = true`. GATE 0, A, B, C, D đều có lệnh `exit 1` in ra thông điệp FAIL, và cả năm đều đã được đo là chạy được trên máy này. GATE F cũng đỏ được và chạy được. Riêng GATE E **không** đỏ được ở máy này vì `bun test` không chạy — nó phải được ghi `NOT RUN — environment blocked`, tuyệt đối không ghi `pass`.

### Phụ thuộc

**Phải có trước (depends_on):**

- **W2 (CỨNG)** — `CANONICAL_PI_SCOPE` / `PI_SCOPE_ALIASES` phải đã đặt xuống. Hai chuỗi scope mà pass của W7 không chạm tới chính là cơ chế tương thích. Chạy W7 trước W2 phá canonicaliser extension một cách im lặng.
- **W1** — để vị trí wire đã chạy bằng hằng số và không bị cuốn vào pass.
- **`scripts/rename/keep-list.txt`** tồn tại trên `main`, đã được một người duyết khác người viết (chưa có ở HEAD `1454dc0` — thư mục `scripts/rename/` chưa tồn tại).
- **Cổng ngoài repo G3 của plan §8**: scope `@ultraworkers` đã tồn tại và được sở hữu.

**W7 chặn (blocks):**

- **W8a** — 15/16 file dạng trần; Gate C của W7 bàn giao một danh sách baseline sạch cho nó.
- **W8b** — 585 file token `omp`; bảng `disposition.tsv` cần biết chính xác tập nào đã đổi scope.
- **W9** — đổi tên binary; phụ thuộc bin khai báo trong manifest đã đổi scope.
- **W12** — release stub; phụ thuộc tên package trong lockfile.
- **M5 DoD cuối** — dòng DoD về zero-hit `@oh-my-pi/` chỉ đóng được sau khi mọi wave scope chạy xong.

### Cách sai dễ nhất

- **Sai lầm 1 — CHẠY TRƯỚC W2.** Đúng thứ tự mà các lượt trước ngụ ý, và nó phá canonicaliser extension một cách im lặng. Đây là chặn cứng ở Gate 0.
- **Sai lầm 2 — ĐỔI SCOPE TRONG MANIFEST MÀ BỎ SÓT MỤC PHỤ THUỘC.** Lỗi này typecheck ĐƯỢC với `node_modules` hiện tại (`node_modules/@oh-my-pi/*` là symlink trỏ vào `packages/`) và chỉ hỏng trên bản cài sạch. Tổng 78 lượt trong 16 manifest (90 nếu tính cả 12 mục ghim ở `package.json` gốc), không chỉ 16 dòng `name`.
- **Sai lầm 3 — TỰ SỬA `bun.lock`.** Phải chạy `bun install`.
- **Sai lầm 4 — ĐỂ W7 TỰ QUYẾT BASENAME.** 16 basename tách ba nhóm; bốn tên nhóm 3 (`browser-relay`, `collab-web`, `snapcompact`, `typescript-edit-benchmark`) dễ rơi khỏi danh sách nhất vì không mang chữ `pi` lẫn chữ `omp`. Đổi chúng phá `PI_PACKAGE_NAMES`.
- **Sai lầm 5, NẶNG NHẤT VỀ MẶT LUẬT REPO — ĐỂ MẪU `git grep -o '@oh-my-pi/' -- .` QUÉT TỚI CHANGELOG.** Nó viết lại 85 mục trong 13 file thuộc phần đã phát hành, phần AGENTS.md nói là bất biến, và làm hỏng chính keep-list mà DoD kiểm. Gate B chống đúng cái này.
- **Sai lầm 6, MỚI, KHÔNG CÓ TRONG PLAN — `loader-state.js:70` resolve tới sáu leaf package ĐÃ PHÁT HÀNH trên registry.** Đổi scope ở đó trước khi leaf package tồn tại dưới scope mới ⇒ `require_.resolve` ném ⇒ `catch { return null }` ⇒ loader rơi im lặng. Không có lỗi nào được ném, không có test nào đỏ. Đây là phần thất bại im lặng đắt nhất của W7.
- **Sai lầm 7, MỚI — `.lavish-wip/specs/*.spec.json`** (13 file workflow scratch đã bị commit, 68 lượt) và 5 tài liệu kế hoạch (333 lượt ở HEAD `1454dc0`) không nằm trong bất kỳ danh sách loại trừ nào của plan. Mẫu toàn-repo của plan sẽ viết lại chúng. Đặc tả đã đưa chúng ra khỏi tập in-scope.
- **Sai lầm 8, MỚI — LOẠI NHẦM `.omp/skills/**`.** N14 khoá TÊN THƯ MỤC `.omp`, không khoá nội dung. 3 file đó là code thật với import statement; loại chúng làm skill vỡ. (Nhóm thứ tư ngoài danh sách loại trừ là 2 transcript `.jsonl` ở Sai lầm 6/Q2 — chúng nằm trong 4100 file nên đã bị pass phủ, nhưng chờ Q2 quyết.)
- **Sai lầm 9, MỚI — ĐỂ CỔNG 'test pass' xanh trong khi `bun test` không chạy.** Trên máy này chỉ những test import `pi_natives` mới báo `0 pass / 1 fail / 1 error`. Chặn là **CHỌN LỌC theo bề mặt import, không phải toàn cục** — đo tại HEAD `106eb3e`, 2026-09-28, trong khi addon của `packages/natives` CHƯA build: `packages/omptype` **1.191 test / 0 fail** và `packages/utils` chạy được. Chỉ những file import `pi_natives` mới đỏ. Phép đo theo package: `omptype` 1139/0 · `utils` 658/17 · `catalog` 141/104 · `stats` 43/19 · `mnemopi` 146/53 · `agent` 4/46 · `ai` 73/450 · `tui` 149/205 · `coding-agent` 913/1445. Một cổng báo xanh vì không chạy là cổng không có tác dụng.

### Cần người quyết

- **Q1 (chặn W7 hoặc phải trả lời trước khi merge)** — Sáu leaf package `@oh-my-pi/pi-natives-<tag>` được publish từ CI (`.github/workflows/ci.yml:326` chạy `npm view @oh-my-pi/pi-natives-linux-x64@latest dist.tarball`). Chúng đã được publish dưới scope MỚI chưa? Nếu chưa, `loader-state.js:70` KHÔNG được đổi trong W7 — hoặc W7 phải đi kèm một bước publish leaf package, hoặc sáu tên leaf package phải vào `do_not_rename`. Đây là câu hỏi duy nhất trong W7 có thể gây hỏng im lặng ở người dùng cuối.
- **Q2 (phán đoán, cần một người quyết)** — Hai transcript đã ghi `packages/coding-agent/test/fixtures/before-compaction.jsonl` (649 lượt) và `large-session.jsonl` (161 lượt) chứa 810 lượt scope cũ, kể cả một URL registry. Chúng là LỊCH SỬ (cùng lớp với `gallery-fixtures/segments.ts` mà W8 phải phán xét) hay là fixture mà test đọc và phải cập nhật? Mặc định của đặc tả: SỬA, vì test đọc chúng như dữ liệu đầu vào. Nhưng nếu chúng được coi là bản ghi phiên thật thì phải giữ, và đó là một ngoại lệ phải nêu tường minh trong keep-list chứ không được để mặc định.
- **Q3** — 5 tài liệu kế hoạch (`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` + `MILESTONE_1..4_EXECUTION_PLAN.md`, 333 lượt ở HEAD `1454dc0`) và 13 file `.lavish-wip/specs/*.spec.json` (68 lượt) là bản ghi về việc đổi tên, không phải sản phẩm. Đặc tả đã loại chúng khỏi tập in-scope. Nếu ý kiến là phải viết lại chúng (ví dụ để tài liệu phản ánh tên mới), thì đó là một work item riêng, không phải để lẫn vào W7 — vì viết lại chúng làm bảng §2.3 của chính kế hoạch thành dối.
- **Q4** — Scope `@ultraworkers` đã được ai sở hữu chưa? Đây là cổng G3 của plan §8, nằm NGOÀI repo. Nếu chưa có, toàn bộ W7 là vô nghĩa và 17212 lượt viết là việc không cần thiết.

### Đính chính so với plan

Nếu plan tổng nói sai, người đọc phải thấy đó. Bảng dưới liệt kê từng claim của plan, phán quyết, và cách sửa.

| claim | verdict | correction |
| --- | --- | --- |
| Lượt 1 chạy trên 4107 file chứa 17169 lượt `@oh-my-pi/`. | `stale` | Tại `84cbac9` (nhánh `milestone-1`) con số thật là **4149 file / 17697 lượt** cho toàn bộ file theo dõi; tại HEAD `1454dc0` là **4149 file / 17698 lượt** — cây đã dời một commit (`git diff --stat 84cbac9..HEAD` → `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md | 100 +++`, 1 file, +99/−1). Các con số còn lại trong dòng này đã đo lại và vẫn đúng ở CẢ HAI mốc, trừ MỘT ngoại lệ: 5 tài liệu kế hoạch là **332 lượt ở `84cbac9` và 333 lượt ở HEAD `1454dc0`** — cùng cái commit đó làm tổng repo nhảy 17697 → 17698. Sau khi loại N11 (13 changelog / 85 lượt), `.lavish-wip/**` (13 file / 68 lượt) và 5 tài liệu kế hoạch (5 file / 333 lượt ở HEAD), tập in-scope đề xuất là **4118 file / 17212 lượt**. Dùng 4118/17212, không dùng 4107/17169. Trong tập in-scope: 18 file là manifest + lock (16 `packages/*/package.json` = 78 lượt, `package.json` gốc = 12, `bun.lock` = 122 → **212 lượt**), 4100 file còn lại là mã và tài liệu (17212 − 212 = **17000 lượt**, đo trực tiếp cũng ra 17000). |
| Các mục kiểm chứng của plan được xác nhận trên HEAD `5873776`. | `unverifiable` | Commit `5873776` KHÔNG tồn tại trong repo này: `git cat-file -t 5873776` trả `fatal: Not a valid object name`. Không claim nào ghim vào SHA đó kiểm lại được. Lấy lại toàn bộ mốc bằng `git rev-parse HEAD` tại thời điểm thực thi. Đáng chú ý: mốc N11 (13 file / 85 lượt) VẪN đúng ở CẢ `84cbac9` và `1454dc0` — drift nằm ở phần ngoài changelog (tài liệu kế hoạch), không nằm ở changelog. |
| Rủi ro sai lầm thứ hai: 'đổi scope trong manifest mà bỏ sót khóa subpath của `exports` map hoặc một mục `peerDependencies`'. | `partly-wrong` | Vế `exports` map KHÔNG đúng và không cần lo. Mọi khóa subpath trong `exports` đều là đường dẫn tương đối (`./compaction`, `./error`, `./*`) chứ không phải scope, và repo KHÔNG có trường `imports` ở bất kỳ manifest nào. Nên không có khóa subpath nào mang scope. Vế `peerDependencies` thì ĐÚNG và còn lớn hơn plan nghĩ: 90 lượt trong 16 manifest, không phải 16 dòng `name`. Rủi ro thật là bỏ sót mục phụ thuộc, và nó chỉ lộ ra trên bản cài sạch. Đếm: `git grep -o '@oh-my-pi/' -- 'packages/*/package.json' \| wc -l` = 78, cộng 12 ở `package.json` gốc = 90. |
| 16 basename sau dấu `/` tách ba nhóm: 10 `pi-*`, 2 thương hiệu cũ, 4 không thuộc họ nào (`browser-relay`, `collab-web`, `snapcompact`, `typescript-edit-benchmark`). | `confirmed` | Giữ nguyên, và con số này là thứ plan làm đúng nhất. Đã liệt kê đủ 16 `name` từ manifest thật và phân nhóm khớp N17 chính xác. Bổ sung: catalog ở `package.json` gốn chỉ ghim 12 trong 16 — `browser-relay`, `collab-web`, `pi-metaharness`, `typescript-edit-benchmark` không có mục ghim. Đừng 'sửa cho đủ 16' ở bước 8. |
| Plan liệt kê loại trừ cứng: `@mariozechner/*`, `@earendil-works/*`, `@sinclair/typebox`, `node_modules`, `packages/*/CHANGELOG.md`, và toàn bộ `do_not_rename`. | `overstated` | Ba scope nước ngoài và `node_modules` KHÔNG THỂ bị vi phạm: mẫu `@oh-my-pi/` là chuỗi literal có dấu `/` ở cuối, nên về mặt cấu trúc nó không khớp `@mariozechner/`, `@earendil-works/`, `@sinclair/typebox`; `git grep` cũng không đi vào `node_modules`. Loại trừ thật sự có tác dụng chỉ có hai: `packages/*/CHANGELOG.md` (85 lượt) và 4 manifest ví dụ của N2 — nhưng 4 manifest N2 có **0** lượt `@oh-my-pi/`, nên chúng cũng không cần loại trừ. Rủi ro thật của W7 nằm ở tập file KHÔNG ai liệt kê (`.lavish-wip/`, 5 tài liệu kế hoạch, 2 transcript `.jsonl`), chứ không nằm ở danh sách loại trừ mà plan nhấn mạnh. |
| Dạng trần `"oh-my-pi"` nằm trong 15 file (W8a). | `stale` | Ở HEAD `1454dc0` có **16** file khớp `git grep -lE '"oh-my-pi"' -- .`. File thứ 16 là `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — chính tài liệu kế hoạch. Plan tự đếm ngoài chính nó. Không thuộc phạm vi W7 (sed của W7 chỉ khớp dạng có `/`), nhưng Gate C của W7 bàn giao baseline 16 file cho W8a, và W8a nên biết là có file thứ 16 đó. |
| Ba bước sau pass 1 — đổi 16 trường `name`, cập nhật 12 mục ghim, tạo lại `bun.lock` — được trình bày như các chỉnh sửa riêng. | `misleading` | Không có chỉnh sửa tay nào trong ba bước đó: mẫu `@oh-my-pi/` đã phủ cả 16 trường `name`, cả 12 mục ghim, và cả 78 lượt phụ thuộc trong manifest (90 nếu tính cả 12 mục ghim ở `package.json` gốc). Chúng phải được viết lại thành bước XÁC MINH, không phải bước SỬA — vì nếu kỹ sư hiểu là 'sửa tay 16 dòng name' sau pass, họ sẽ tạo ra một pass thứ hai, và đó chính là sai lầm phá N17 mà plan cảnh báo. Đã viết lại thành bước 8 (verify, 4 lệnh kiểm, không sửa) và bước 9 (`bun install` cho `bun.lock`). |
| Rủi ro lớn nhất về mặt quy tắc repo là để mẫu `git grep -o '@oh-my-pi/' -- .` quét tới `packages/*/CHANGELOG.md`. | `confirmed-and-understated` | Đúng, và đã dựng Gate B chống đúng điều đó. Nhưng còn một nhóm thứ hai mà plan không nhắc tới và cũng sẽ bị mẫu toàn-repo quét: 13 file `.lavish-wip/specs/*.spec.json` (68 lượt, workflow scratch đã bị commit) và 5 tài liệu kế hoạch (333 lượt ở HEAD). Cộng lại **486 lượt** ngoài danh sách (85 + 68 + 333) — lớn hơn nhiều so với 85 lượt changelog mà plan coi là rủi ro lớn nhất. |
| Lệnh nghiệm thu của W7: `bun install && bun run check && bun run test:ts`. | `unverifiable` | Không chạy được trên máy này. `bun run test:ts` là `bun scripts/ci-test-ts.ts local-ts` và `bun test` bị chặn bởi native addon chưa build (`Failed to load pi_natives native addon for darwin-arm64`); `bun --cwd=packages/natives run build` thất bại vì thiếu `ninja` (`CMake was unable to find a build program corresponding to "Ninja"`). `bun run check` còn gọi thêm `check:rs` cần cargo, chưa xác minh. Đã thay bằng `bun run check:ts` (đã đo exit 0 ở HEAD) và tách cổng test thành Gate E ghi rõ `NOT RUN — environment blocked`. Cần dạy kèm `brew install ninja` trước bất kỳ lệnh build nào — đó là chặn đầu tiên đã quan sát được, chưa phải một đường đã kiểm chứng tới cuối (xem mục Xác minh). |
| Plan không nói gì về `loader-state.js:70` và sáu leaf package `@oh-my-pi/pi-natives-<tag>`. | `gap-in-plan` | Đây là phần thất bại im lặng đắt nhất của W7 và plan bỏ sót nó. `packages/natives/native/loader-state.js:70` gọi `require_.resolve(`@oh-my-pi/pi-natives-${platformTag}/package.json`)`. Sáu tên leaf package này KHÔNG nằm trong repo — chúng được publish lên registry (`.github/workflows/ci.yml:326` chạy `npm view @oh-my-pi/pi-natives-linux-x64@latest dist.tarball`, và :1035 nói rõ 'Publishes the six @oh-my-pi/pi-natives-<tag> leaf packages'). Đổi scope trong loader TRƯỚC khi leaf package tồn tại dưới scope mới ⇒ `require_.resolve` ném ⇒ `catch { return null }` chạy ⇒ loader rơi sang nhánh dự phòng khác, không một lỗi nào được ném, không một test nào đỏ. W7 không tự giải quyết được; cần câu trả lời của Q1 trước khi merge. |

## Cần người xác nhận

Hai chỗ đã đo lại và đóng (mục 1 và 2), một chỗ còn cần một người xác nhận (mục 3). Các con số ở trên đã được sửa theo kết quả đo, không sửa theo suy đoán.

1. **Phân bố 4100 file — đã đo lại, câu hỏi cũ đóng.** Ghi chú phân bố cũ trong hàng `(4100 file còn lại trong tập in-scope)` đã bị gỡ khỏi bảng, nên phân bố thật là: **4005 `.ts`, 66 `.md`, 12 `.tsx`, 4 `.py`, 2 `.sh`, 2 `.rs`, 2 `.jsonl`, 2 `.json`, và 1 mỗi loại `.yml`/`.ps1`/`.nix`/`.js`/`.dockerfile` — tổng đúng 4100**. Không có `.lock` nào trong 4100 file này (`bun.lock` nằm ở nhóm 18 file manifest+lock, đã tách riêng). Đo bằng `sed -E 's/.*\.([A-Za-z0-9]+)$/\1/' \| sort \| uniq -c` trên danh sách 4100 file ở bước 4.
2. **"3 file Rust" — đã đóng, chỉ có 2 file `.rs`.** Câu nói "3 file Rust" chỉ tồn tại trong chính mục xác nhận này; bảng đã không còn nó. Đo trong 4100 file: đúng 2 file `.rs`, `crates/pi-edit/src/modes/hashline/mod.rs` và `crates/pi-shell/src/minimizer/filters/bun.rs` — cả hai đều được nêu tên, không có file thứ ba.
3. **Trường `action` của `scripts/rename/keep-list.txt` là `create` nhưng phần `change` lại ghi "KHÔNG tạo ở W7".** Hai câu này không cùng một ý. Mục này được trình bày ở trên theo nghĩa thứ hai (điều kiện mở, không tạo ở W7) vì đó là nghĩa an toàn hơn, nhưng cần xác nhận ý định gốc.


---


## W8a. 15 file literal dạng trần (sóng 3)

**Sóng:** Wave 3 · **Effort:** S về thao tác gõ, M về quyết định. Số dòng thật sự phải sửa trong mã nguồn là 2 (một file). 13 file còn lại là 13 quyết định "không sửa", và đó mới là chi phí. Thêm 3 hàng keep-list, 1 file probe mới (~60 dòng, copy từ probe hiện có), 1 dòng nối vào test hiện có, 1 ca thêm vào test của W2, và 2 đoạn văn xuôi tài liệu. Tổng dưới 2 giờ nếu đã đọc bảng quyết định ở `code_shape`; trên 4 giờ nếu phải tự suy lại từng file. · **Rủi ro chính:** áp cùng một quyết định cho cả 15 file. "Giữ tất cả" đóng băng luôn hai dòng gallery, và gallery là lệnh CLI đã phát hành nên thương hiệu cũ sẽ xuất hiện trong ảnh chụp màn hình của lệnh đó. "Đổi tất cả" phá ba giá trị wire của bên thứ ba (N18/N19/N20) — chúng không có mục nào trong bảng N1–N17, nên kỹ sư chỉ đọc keep-list mà không đọc phần này sẽ đổi chúng. Đó là lý do ba hàng keep-list ở bước 7 nặng hơn cả hai dòng rename.

Tóm một câu: mỗi literal dạng trần `oh-my-pi` nằm ngoài tầm với của sed scope của W7, nên W8a là 15 quyết định riêng chứ không phải một mẫu. Kết quả là 7 giá trị wire giữ nguyên (3 cái phải thêm mới vào keep-list), đúng 1 file đổi tên hiển thị, và 7 file test không sửa dòng nào.

Hiệu ứng người dùng thấy: lệnh `omp gallery` in ra tên dự án `ultraworkers` thay vì `oh-my-pi` trong dòng trạng thái và trong ảnh chụp màn hình mà lệnh đó tạo. Không có thay đổi nào khác người dùng nhìn thấy: bảng chi phí telemetry OTLP vẫn tách theo service `oh-my-pi`, client ACP vẫn tự giới thiệu là `oh-my-pi`, và các provider bên thứ ba (Z.AI, Exa, máy chủ OAuth) vẫn nhận đúng tên khóa/tên client/tên nguồn mà chúng đã nhận — đổi bất kỳ giá trị nào trong ba cái đó sẽ hỏng mà không có lỗi nào được ném.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli/gallery-fixtures/segments.ts` | sửa | Đổi DUY NHẤT hai literal dạng trần trong toàn bộ W8a: `relativeRepoRoot: "oh-my-pi"` tại dòng 33 và `projectName: "oh-my-pi"` tại dòng 164, thành `ultraworkers`. KHÔNG đụng `cwd`/`repoRoot` (`/workspace/oh-my-pi`, dòng 31-32) — đó là dạng trần không có dấu nháy kép nên nằm ngoài phạm vi W8a; nếu muốn đồng bộ thì thuộc W8b. Giữ nguyên 5 lượt scope `@oh-my-pi/` trong file này — W7 đã đổi chúng. | Có (`verified: true`). Đã đọc `packages/coding-agent/src/cli/gallery-cli.ts:1-9` và `packages/coding-agent/src/cli-commands.ts:121-126`: `gallery` là lệnh CLI đã đăng ký và phát hành, in ra stdout qua `captureGalleryScreenshots`. Đây là fixture TỔNG HỢP (deterministic display context), KHÔNG phải transcript đã ghi. |
| `scripts/rename/keep-list.txt` | sửa | Thêm đúng 3 hàng mới theo định dạng bắt buộc `<mẫu hoặc đường dẫn>  # <lý do>`: N18 cho `packages/ai/src/registry/oauth/zai.ts:25`, N19 cho `packages/coding-agent/src/web/search/providers/exa.ts:26`, N20 cho `packages/coding-agent/src/mcp/oauth-flow.ts:629`. Ba hàng này CHƯA tồn tại ở bảng N1–N17 của plan. Không sửa, không xoá, không sắp xếp lại bất kỳ hàng N1–N17 nào. | Có (`verified: true`). File do W7 tạo ra. Định dạng và quy tắc duyệt lấy từ §2.3 của plan và Gate 0 của W7. Phần `#` là bắt buộc. |
| `packages/coding-agent/test/otel-service-name-probe.ts` | tạo | TẠI MỚI. Probe tiến trình con, anh em của `packages/coding-agent/test/otel-resource-probe.ts`, dựng OTLP/proto receiver trên loopback, KHÔNG đặt `OTEL_SERVICE_NAME` và KHÔNG đặt `OTEL_RESOURCE_ATTRIBUTES`, export một span, rồi đọc `service.name` trong payload protobuf và in `PROBE: RECEIVED` khi nó khớp giá trị fallback đã chốt, `PROBE: NO_EXPORT` khi không. Exit 0/1 tương ứng. | Có (`verified: true`). Bắt buộc phải là file RIÊNG, không sửa `otel-resource-probe.ts` — probe hiện có đặt `OTEL_SERVICE_NAME="svc-probe"` (dòng 37) và tồn tại chính để chứng minh biến môi trường THẮNG giá trị fallback. |
| `packages/coding-agent/test/telemetry-export.test.ts` | sửa | Thêm một mục `["fallback service name", "./otel-service-name-probe.ts"]` vào mảng `probes` trong `describe("initTelemetryExport signals export path")` (khoảng dòng 118-124) và thêm kỳ vọng tương ứng vào `expect(Object.fromEntries(results)).toEqual({...})` (khoảng dòng 140-144). KHÔNG sửa probe hiện có, KHÔNG đổi `beforeEach`, KHÔNG đụng env. | Có (`verified: true`). Cùng cơ chế spawn subprocess đã dùng cho 3 probe kia — không cần hạ tầng mới. Timeout của describe hiện là 20_000; thêm probe thứ tư có thể cần nới lên, nếu không thì để nguyên và ghi vào commit rằng timeout chưa được đo. |
| `packages/coding-agent/test/pi-scope-aliases.test.ts` | sửa (có điều kiện) | Thêm ca cho một import đến mà KHÔNG scope nào được áp dụng, và một ca cho import đến bằng scope cũ, cùng phân giải về CÙNG một package host (xem `Hợp đồng test`, invariant 2). | CHƯA kiểm chứng như một mục `files_touched`: file này không có trong `files_touched` và không có bước nào trong `steps` bảo sửa nó, nhưng lại xuất hiện trong `test_files` và trong danh sách file bắt buộc của Gate C. Chỉ có bằng chứng gián tiếp từ `plan_corrections` #6. |
| `docs/extension-loading.md` | sửa (có điều kiện) | Sửa văn xuôi ở dòng 231 sau khi W7 đã merge; KHÔNG chạy pass thay chuỗi (bước 10). | CHƯA kiểm chứng như một mục `files_touched`: không nằm trong `files_touched`. Bằng chứng gián tiếp từ `plan_corrections` #8: `grep -cE '"oh-my-pi"'` trên file này bằng 0. |
| `docs/porting-from-pi-mono.md` | sửa (có điều kiện) | Sửa văn xuôi ở dòng 46-51 sau khi W7 đã merge; KHÔNG chạy pass thay chuỗi (bước 10). | CHƯA kiểm chứng như một mục `files_touched`: không nằm trong `files_touched`. Bằng chứng gián tiếp từ `plan_corrections` #8: `grep -cE '"oh-my-pi"'` trên file này bằng 0. |

Bảy file nguồn còn lại và bảy file test được nêu ở các bước 5-6 không nằm trong bảng trên: chúng là các quyết định "không sửa" và không phải file cần chạm tới.

### Các bước

1. **DỪNG và kiểm tra bốn điều kiện mở.** Nếu bất kỳ điều nào chưa đúng: DỪNG, không sửa dòng nào, báo lại.
   - (a) W7 đã merge và Gate C của W7 xanh — đây là điều kiện CỨNG, không phải cảnh báo: W8a mà chạy trước sẽ làm Gate C của W7 đỏ và phá bằng chứng rằng pass scope không chạm dạng trần.
   - (b) W2 đã merge: `CANONICAL_PI_SCOPE` tại `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:796` đã trỏ scope mới, và `PI_SCOPE_ALIASES` tại `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802` VẪN còn nguyên dạng trần `["oh-my-pi", "mariozechner", "earendil-works"]`.
   - (c) `scripts/rename/keep-list.txt` tồn tại trên `main` và đã được một người duyệt không phải người viết.
   - (d) M2 đã merge và đã chốt `exports` map — chỉ cần cho phần tài liệu ở bước 10.

2. **Chụp baseline trước mọi thay đổi, ra `/tmp`, KHÔNG để trong repo** (anchor: `<repo root>`):

   ```bash
   git grep -nE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' > /tmp/w8a-bare-baseline.txt
   git rev-parse HEAD > /tmp/w8a-head-baseline.txt
   ```

   Tại HEAD `84cbac9` (nhánh milestone-1) file baseline PHẢI có ĐÚNG 15 dòng và 23 lượt. Nếu lệch, cây đã đổi — dừng và đếm lại, đừng tiếp tục trên con số của tài liệu này.

3. **Đối chiếu bảng quyết định với file thật trước khi tin vào nó.** Bảng ở `Hình dạng code` dưới đây đã được đối chiếu với file thật ở HEAD `84cbac9`. Nó gồm 8 file nguồn/doc (7 nguồn + 1 doc) và 7 file test. Không có hàng nào được bỏ qua và không có hàng nào thêm mới — nếu bạn tìm thấy một literal dạng trần thứ 24 ở đâu đó, đó là phát hiện mới, hãy báo lại chứ đừng tự thêm vào bảng. (Xem `Cần người xác nhận` về cách bảng này tự đếm.)

4. **SỬA DUY NHẤT file nguồn của cả W8a.** Đổi hai literal ở `packages/coding-agent/src/cli/gallery-fixtures/segments.ts` — dòng 33 `relativeRepoRoot: "oh-my-pi"` và dòng 164 `projectName: "oh-my-pi"` — thành `"ultraworkers"`.
   - Dùng tay hoặc editor, **KHÔNG dùng sed**: hai dòng này nằm trong cùng file với 5 lượt scope `@oh-my-pi/` mà W7 đã đổi, và một sed không phân biệt trên file này sẽ hoàn nguyên phần việc của W7.
   - Sau khi sửa, `grep -n 'ultraworkers' packages/coding-agent/src/cli/gallery-fixtures/segments.ts` phải ra đúng 2 dòng, và `git diff` trên file này phải hiện ĐÚNG 2 dòng bị đổi — nhiều hơn 2 là sai.

5. **KHÔNG SỬA 7 file nguồn còn lại.** Chúng được giữ nguyên có chủ ý:
   - `packages/coding-agent/src/telemetry-export-otlp.ts:51` (N7)
   - `packages/coding-agent/src/modes/acp/acp-agent.ts:656` (N5)
   - `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802` (N8, thuộc W2)
   - `packages/ai/src/registry/oauth/zai.ts:25` (N18 mới)
   - `packages/coding-agent/src/web/search/providers/exa.ts:26` (N19 mới)
   - `packages/coding-agent/src/mcp/oauth-flow.ts:629` (N20 mới)
   - `docs/provider-quirks.md:1706` (mô tả giá trị wire của `zai.ts`, phải khớp quyết định N18)

   Chạy lệnh kiểm ở Gate B để chứng minh cả 7 vẫn còn nguyên sau khi bạn xong — đó là bằng chứng, không phải việc làm thêm.

6. **KHÔNG SỬA 7 file test.** Chúng là hai loại khác nhau và cả hai đều phải giữ:
   - 5 file là **pin khóa chặn**: `packages/ai/test/zai-oauth.test.ts`, `packages/coding-agent/test/acp-initialize-conformance.test.ts`, `packages/coding-agent/test/acp-lazy-startup.test.ts`, `packages/coding-agent/test/oauth-flow.test.ts`, `packages/coding-agent/test/tools/web-search-exa.test.ts` — chúng khẳng định đúng giá trị wire mà bước 5 giữ.
   - 2 file là **dữ liệu fixture tùy ý**: `packages/ai/test/cursor-exec-modern.test.ts` và `packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts` — chúng truyền một tên repo giả vào `parseGitHubUrl` và vào một schema SCM.
   - Đổi 5 file pin khi giá trị wire giữ là LÀM HỎNG chính tấm chắn; đổi 2 file fixture là churn thuần với không một hợp đồng nào đổi.
   - Hệ quả cần nói rõ: dưới các quyết định ở bước 4-5, W8a sửa ĐÚNG 0 dòng test có sẵn.

7. **Thêm 3 hàng N18/N19/N20 vào `scripts/rename/keep-list.txt`**, mỗi hàng một dòng, phần `#` lý do bắt buộc không được bỏ trống, theo đúng định dạng của các hàng N1–N17 sẵn có. Lý do gợi ý:
   - N18: "tên khóa gửi lên API bên thứ ba qua businessLogin, đổi nó là tạo một khóa khác trong tài khoản Z.AI của người dùng"
   - N19: "header x-exa-source gửi cho Exa, là attribution phía nhà cung cấp, đổi nó làm mất credit traffic mà không có lỗi cục bộ nào"
   - N20: "client_name trong payload đăng ký client động RFC 7591, là danh tính hiển thị với người dùng ở màn hình consent và là thứ provider dùng để lập allowlist"

   KHÔNG sửa bất kỳ hàng N1–N17 nào và không sắp xếp lại file.

8. **Tạo file test mới `packages/coding-agent/test/otel-service-name-probe.ts`.** Copy cấu trúc từ `packages/coding-agent/test/otel-resource-probe.ts` (anchor `packages/coding-agent/test/otel-resource-probe.ts:1`): receiver loopback `Bun.serve` port 0, đọc `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `await initTelemetryExport()`, kiểm tra `isTelemetryExportEnabled()`, startSpan + end, `await flushTelemetryExport()`, đọc payload bằng `body.toString("latin1")`. Ba khác biệt bắt buộc:
   1. KHÔNG gán `process.env.OTEL_SERVICE_NAME`;
   2. KHÔNG gán `process.env.OTEL_RESOURCE_ATTRIBUTES`;
   3. phép kiểm là `has("ultraworkers-fallback-marker")` đúng tên bạn đã chốt ở hàng N7 — dùng chính giá trị constant, không hardcode lần thứ hai một chuỗi khác.

   `SERVICE_NAME` KHÔNG được export, nên đây là cách duy nhất quan sát được nó mà không sửa mã nguồn. (Xem `Cần người xác nhận` về xung đột giữa marker ở điểm 3 và quyết định giữ tại hàng N7.)

9. **Nối probe mới vào `packages/coding-agent/test/telemetry-export.test.ts`** (anchor `packages/coding-agent/test/telemetry-export.test.ts:118`): thêm một cặp `[tên, "./otel-service-name-probe.ts"]` vào mảng `probes` và một khoá tương ứng trong `expect(Object.fromEntries(results)).toEqual({...})`. Giữ nguyên cơ chế `Bun.spawn([process.execPath, probe], { env: { ...process.env }, ... })` — nó loại các biến OTEL kế thừa mà `beforeEach` đã dọn. Cân nhắc nới timeout 20_000 của describe lên 30_000 vì giờ có 4 probe chạy song song; nếu không đo được thì để nguyên và ghi rõ trong commit là chưa đo.

10. **Phần tài liệu — chỉ làm sau khi M2 đã merge.** Hai file `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` phải được viết lại để mô tả ánh xạ scope mới.
    - **LƯU Ý QUAN TRỌNG:** hai file này KHÔNG chứa literal dạng trần — `grep -cE '"oh-my-pi"'` trên cả hai đều bằng 0. Chúng chứa dạng có dấu `/`, đã thuộc về W7.
    - Việc W8a làm ở đây là **SỬA VĂN XUÔI, không phải thay chuỗi**: sau W7, dòng 46-50 của `porting-from-pi-mono.md` sẽ tự động đã đọc `@mariozechner/...` → `@ultraworkers/...`, và dòng 231 của `extension-loading.md` sẽ tự động đã đọc scope mới.
    - Hãy đọc lại sau W7 rồi chỉ sửa phần câu chữ đã lỗi thời, đừng chạy thêm một pass thay chuỗi.

11. **KHÔNG thêm, KHÔNG sửa, KHÔNG sắp xếp lại bất kỳ mục changelog nào trong bất kỳ package nào.** `AGENTS.md` nói phần đã phát hành là bất biến, và N11 giữ 13 file changelog. W8a không có thay đổi user-facing nào đáng ghi changelog: một fixture của lệnh gallery không phải mục changelog, và các giá trị wire giữ nguyên thì không có gì để thông báo. Nếu bạn vẫn thấy cần ghi, hãy hỏi người dùng trước — plan nói rõ chỉ cập nhật changelog khi được yêu cầu. (anchor: `packages/*/CHANGELOG.md`)

12. **Chạy cổng ở mục `Cổng hoàn thành` theo đúng thứ tự**, dừng ngay khi cổng đầu tiên đỏ. Ghi kết quả TỪNG cổng vào commit message, kể cả cổng không chạy được. Một cổng bị chặn bởi môi trường phải được ghi `NOT RUN — environment blocked`, TUYỆT ĐỐI không ghi `pass`. Gate C là cổng quan trọng nhất của W8a: nó là thứ chứng minh pass của W7 không lẫn sang việc của W8a và ngược lại. (anchor: `<repo root>`)

### Hình dạng code

W8a là BẢNG QUYẾT ĐỊNH, không phải một mẫu thay chuỗi. Bảng dưới là sản phẩm của work item; nó đã được đối chiếu với file thật ở HEAD `84cbac9`. Mỗi hàng là một literal, không phải một file — file test có nhiều hàng.

**8 file nguồn/doc — 7 giữ, 1 file đổi (2 lượt)**

| quyết định | mã | path:line | literal | ghi chú |
| --- | --- | --- | --- | --- |
| keep-wire | N7 | `packages/coding-agent/src/telemetry-export-otlp.ts:51` | `SERVICE_NAME = "oh-my-pi"` | → `resourceFromAttributes({"service.name": SERVICE_NAME})` tại `:121`. Tách dashboard chi phí theo service. KHÔNG có test nào hiện tại pin giá trị này. |
| keep-wire | N5 | `packages/coding-agent/src/modes/acp/acp-agent.ts:656` | `agentInfo.name = "oh-my-pi"` | → trả cho ACP client. Dòng `:657` `"omp"` là N4, dùng hàng này. |
| keep-wire | N8 | `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802` | `PI_SCOPE_ALIASES[0]` | → giữ VĨNH VIỄN. Cơ sở của cả cuộc chuyển đổi. Thuộc W2, W8a KHÔNG sửa. |
| keep-wire | N18 | `packages/ai/src/registry/oauth/zai.ts:25` | `KEY_NAME = "oh-my-pi"` | → `postJson(keysUrl, { name: KEY_NAME })` tại `:171`. Comment `:24` nói rõ lý do: `OMP's own key name so sign-in never mutates ZCode's zcode-api-key` — danh tính SỞ HỮU khoá, đổi tên = tạo khoá mới trong tài khoản của người dùng. |
| keep-wire | N19 | `packages/coding-agent/src/web/search/providers/exa.ts:26` | `EXA_MCP_SOURCE = "oh-my-pi"` | → header `x-exa-source` tại `:369`. Attribution phía Exa, cùng loại với N9. |
| keep-wire | N20 | `packages/coding-agent/src/mcp/oauth-flow.ts:629` | `client_name: "oh-my-pi"` | → payload đăng ký client động RFC 7591. Docblock ngay trên (tại `:612-620`) nêu nếu Figma từ chối client ngoài danh sách — provider dùng payload này để lập allowlist. |
| keep-doc | N18 | `docs/provider-quirks.md:1706` | mô tả `KEY_NAME` của `zai.ts` | → phải khớp quyết định N18; bảng 0 literal ở dòng 1 (plan sai, xem Đính chính #2). |
| RENAME | — | `packages/coding-agent/src/cli/gallery-fixtures/segments.ts:33` | `relativeRepoRoot: "oh-my-pi"` | → `"ultraworkers"` |
| RENAME | — | `packages/coding-agent/src/cli/gallery-fixtures/segments.ts:164` | `projectName: "oh-my-pi"` | → `"ultraworkers"` |

**7 file test — 14 lượt — giữ nguyên, 0 dòng sửa**

| loại | path:line | lượt | khẳng định | lý do giữ |
| --- | --- | --- | --- | --- |
| pin (khóa chặn) | `packages/ai/test/zai-oauth.test.ts:109,437,444` | 3 | `{ name: "oh-my-pi" }` gửi lên Z.AI | giữ vì N18 giữ |
| pin (khóa chặn) | `packages/coding-agent/test/acp-initialize-conformance.test.ts:235` | 1 | `agentInfo.name === "oh-my-pi"` | giữ vì N5 giữ |
| pin (khóa chặn) | `packages/coding-agent/test/acp-lazy-startup.test.ts:375` | 1 | `expect.objectContaining({ name: "oh-my-pi" })` | giữ vì N5 giữ |
| pin (khóa chặn) | `packages/coding-agent/test/oauth-flow.test.ts:81` | 1 | `client_name === "oh-my-pi"` | giữ vì N20 giữ |
| pin (khóa chặn) | `packages/coding-agent/test/tools/web-search-exa.test.ts:608` | 1 | `x-exa-source === "oh-my-pi"` | giữ vì N19 giữ |
| fixture (tùy ý) | `packages/ai/test/cursor-exec-modern.test.ts:280,1474,1482` | 3 | `repo: "oh-my-pi"` trong fixture SCM/GitHub | chuỗi fixture tùy ý, đổi không đổi gì |
| fixture (tùy ý) | `packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:214,222,254,263` | 4 | `parseGitHubUrl(".../can1357/oh-my-pi/...")` | dữ liệu cho một parser thuần, đổi là churn thuần |

TỔNG: 9 lượt ở 8 file nguồn/doc + 14 lượt ở 7 file test = 23 lượt trên 15 file. (Con số 16 xuất hiện nếu không loại file kế hoạch — xem Đính chính #1.)

Hình dạng biến theo quy ước W1 (sau khi W1 đặt xuống) — W8a KHÔNG sửa bất kỳ dòng nào trong khối này:

```typescript
const SERVICE_NAME = "ultraworkers" hoặc giữ "oh-my-pi" — W8a KHÔNG sửa dòng này.
const EXA_MCP_SOURCE = "ultraworkers";   // W8a KHÔNG sửa dòng này.
client_name: "ultraworkers",             // W8a KHÔNG sửa dòng này.
const KEY_NAME = "ultraworkers";         // W8a KHÔNG sửa dòng này.
const PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"] as const;  // W8a KHÔNG sửa dòng này (W2 sở hữu).
name: "ultraworkers",                    // W8a KHÔNG sửa dòng này (N5).
```

Duy nhất hai dòng W8a sửa (gallery):

```typescript
relativeRepoRoot: "ultraworkers",
worktree: { projectName: "ultraworkers", worktreeName: "gallery-reference" },
```

### Hợp đồng test

Hợp đồng duy nhất W8a phải bảo vệ là: **giá trị wire dạng trần không bị một lần đổi tên cơ học bỏ sót và âm thầm dịch chuyển.** Cụ thể, hai invariant, mỗi invariant một test.

**Invariant 1 — PIN TELEMETRY.** Giá trị fallback của `service.name` OTLP. Đây là lỗ hổng phủ thật sự: 3 giá trị wire còn lại (N5, N19, N20) đã có test khẳng định sẵn ở 5 file test, nhưng `SERVICE_NAME` thì không test nào chạm tới, và `SERVICE_NAME` không được export. Test mới phải chứng minh resource attribute thật sự mang giá trị đã chốt khi KHÔNG có `OTEL_SERVICE_NAME` — tức là **nhánh fallback, không phải nhánh precedence**. Nếu không có test này, đổi tên ở đây không đỏ test nào và dashboard chi phí tách làm hai mà không ai biết.

- Nằm ở `packages/coding-agent/test/otel-service-name-probe.ts` + `packages/coding-agent/test/telemetry-export.test.ts`.

**Invariant 2 — PHÂN GIẢI SCOPE KHÔNG CÓ GHI CHÈ.** Mở rộng vào file test của W2, tức `packages/coding-agent/test/pi-scope-aliases.test.ts` (KHÔNG phải `packages/coding-agent/test/extension-scope-canonicalization.test.ts` như plan viết — file đó không tồn tại, xem Đính chính #6). Thêm một ca cho một import đến mà KHÔNG scope nào được áp dụng, và một ca cho import đến bằng scope cũ, cùng phân giải về CÙNG một package host. Đây là ca bảo vệ N8 — xoá `"oh-my-pi"` khỏi `PI_SCOPE_ALIASES` làm mọi extension cũ hỏng bằng module-not-found lúc load plugin, và không có gì đỏ.

Bốn test file hiện có đã là sẵn pin cho 3 giá trị wire — W8a KHÔNG viết lại chúng và KHÔNG thêm ca nào vào 5 file đó. Ca fallback-vs-precedence ở trên là ca duy nhất chứng minh được nhánh fallback; chỉ khẳng định lại giá trị precedence sẽ vừa thừa vừa phá hợp đồng precedence hiện có. (Xem `Cần người xác nhận` — hai câu này tự mâu thuẫn về số file.)

**TUYỆT ĐỐI KHÔNG:**

- KHÔNG source-grep file implementation (đọc `packages/coding-agent/src/telemetry-export-otlp.ts` rồi `expect(src).toContain("oh-my-pi")` là test cấm — nó chết ngay khi ai đó refactor hợp lệ và sống sót khi hành vi hỏng).
- KHÔNG `mock.module()`.
- KHÔNG assert lại 14 literal trong 7 file test.
- KHÔNG thêm test cho `segments.ts` (đó là dữ liệu fixture của lệnh gallery, không có hợp đồng quan sát được nào đứng sau nó).

### Xác minh

**CHẠY ĐƯỢC trên máy này:**

- `bun run check:ts` — exit 0 tại HEAD `84cbac9`. Đã đo: oxlint sạch, oxfmt sạch trên 5445 file, cả 16 package `check:types` Done. Lần đo mất 85s (máy đang bận; con số 29s trong briefing là trên máy rảnh). Đây là tín hiệu chính.

**KHÔNG CHẠY ĐƯỢC (đã xác nhận bằng lệnh thật trên máy này):**

- `bun test` — bị chặn: `Failed to load pi_natives native addon for darwin-arm64`, mọi test báo 0 pass / 1 fail / 1 error.
- Gỡ chặn: `brew install ninja` TRƯỚC, rồi `bun --cwd=packages/natives run build`, rồi `bun run test:ts`. Không có `ninja` thì build fail với `CMake was unable to find a build program corresponding to "Ninja"` — cmake build của opusic-sys cần nó.
- `bun run check` — gọi thêm `check:rs` cần cargo, chưa xác minh trong W8a. Plan dùng `bun run check`; ở đây thay bằng `bun run check:ts` vì đó mới là phần chạm tới các file W8a sửa. **`tsc` không được dùng.**

**SAU KHI CÓ `ninja` + native addon đã build:**

```bash
cd packages/coding-agent && bun test test/telemetry-export.test.ts test/pi-scope-aliases.test.ts
```

### Cổng hoàn thành

`gate_can_fail: true`. Chạy theo đúng thứ tự, dừng ngay khi cổng đầu tiên đỏ.

**GATE 0 — ĐIỀU KIỆN MỞ**

```bash
git merge-base --is-ancestor HEAD main >/dev/null 2>&1 || true
git grep -q 'CANONICAL_PI_SCOPE' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts || { echo 'GATE 0 FAIL: W2 chua merge'; exit 1; }
git grep -qF 'PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"]' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts || { echo 'GATE 0 FAIL: N8 alias da bi pham — dung lai, W8a khong the chay'; exit 1; }
test -f scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list.txt missing'; exit 1; }
grep -q 'N7' scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list chua qua duyet W7'; exit 1; }
git grep -l '@ultraworkers/pi-catalog' -- 'packages/catalog/package.json' >/dev/null || { echo 'GATE 0 FAIL: W7 chua merge — W8a phai chay SAU W7 vi Gate C cua W7 so sanh baseline dang truan'; exit 1; }
```

Phân biệt được: W7 chưa xong → BLOCKED, không phải "W8a chưa xong".

**GATE A — TẬP FILE TRÒN VẸN KHÔNG ĐỔI**

```bash
git grep -lE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' > /tmp/w8a-bare-after.txt
diff /tmp/w8a-bare-baseline.txt /tmp/w8a-bare-after.txt && echo 'GATE A: tap 15 file van nguyen (chi gallery doi noi dung)'
```

Baseline PHẢI là 15 dòng. Đọc kỹ: dòng 6 (gallery) vẫn xuất hiện là ĐÚNG — W8a đổi GIÁ TRỊ trong file, không xoá file. Dòng 16 (kế hoạch) nên được loại bằng `:!` vì nó chứa chuỗi trong bản kế hoạch, không phải mục tiêu. Phân biệt được: dòng khác biệt nghĩa là W8a đã thêm/xoá literal ở file ngoài bảng quyết định — dừng ngay.

**GATE B — 7 LITERAL GIỮ NGUYÊN (cổng chống sed)**

```bash
for loc in 'packages/coding-agent/src/telemetry-export-otlp.ts:51:"oh-my-pi"' 'packages/coding-agent/src/modes/acp/acp-agent.ts:656:"oh-my-pi"' 'packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802:"oh-my-pi"' 'packages/ai/src/registry/oauth/zai.ts:25:"oh-my-pi"' 'packages/coding-agent/src/web/search/providers/exa.ts:26:"oh-my-pi"' 'packages/coding-agent/src/mcp/oauth-flow.ts:629:"oh-my-pi"' 'docs/provider-quirks.md:1706:"oh-my-pi"'; do
  f=${loc%%:*}; rest=${loc#*:}; n=${rest%%:*}; v=${rest#*:}
  line=$(sed -n "${n}p" "$f")
  case "$line" in *"$v"*) ;; *) echo "GATE B FAIL: $f:$n mat gia tri giu '$v'"; exit 1;; esac
done
echo 'GATE B: 7 gia tri wire van nguyen'
```

Phân biệt được: đây là cổng giữ GIÁ TRỊ trong code, và nó là con đỏ đầu tiên bắt được một sed dài — chạy trước Gate C vì Gate C chỉ báo "chạm file ngoài danh sách" mà không nói vì sao. Vế `case` khớp LITERAL có dấu nháy kép, không phải chuỗi con: một sed đổi `"oh-my-pi"` thành `"oh-my-pi-ultraworkers"` vẫn chứa `oh-my-pi` nên phép so khớp chuỗi con sẽ bỏ lọt. Gate A vẫn XANH trong cả hai trường hợp, vì tập file không đổi.

**GATE C — W8A KHÔNG LẪN SANG VIỆC CỦA W7**

```bash
BASE=$(cat /tmp/w8a-head-baseline.txt)
git diff --name-only "$BASE"..HEAD | sort > /tmp/w8a-touched.txt
printf '%s\n' \
  'packages/coding-agent/src/cli/gallery-fixtures/segments.ts' \
  'packages/coding-agent/test/otel-service-name-probe.ts' \
  'packages/coding-agent/test/telemetry-export.test.ts' \
  'packages/coding-agent/test/pi-scope-aliases.test.ts' \
  'scripts/rename/keep-list.txt' | sort > /tmp/w8a-expected.txt
diff /tmp/w8a-expected.txt /tmp/w8a-touched.txt || { echo 'GATE C FAIL: W8a cham file ngoai danh sach da duyet — xem lai'; exit 1; }
```

Phân biệt được: W7 đã sửa 14/15 file này ở pass scope. Gate C là thứ bắt được "W8a chạy lại một sed" và "W8a sửa thêm cho một mục không ai duyệt", và nó cũng là bằng chứng W8a không phạm vi của W7.

**GATE D — HAI DÒNG GALLERY**

```bash
test "$(git diff --numstat "$BASE"..HEAD -- packages/coding-agent/src/cli/gallery-fixtures/segments.ts | wc -l)" -eq 1
test "$(git diff --numstat "$BASE"..HEAD -- packages/coding-agent/src/cli/gallery-fixtures/segments.ts | cut -f1)" -eq 2 || { echo 'GATE D FAIL: phai doi DUNG 2 dong'; exit 1; }
test "$(git diff --numstat "$BASE"..HEAD -- packages/coding-agent/src/cli/gallery-fixtures/segments.ts | cut -f2)" -eq 2 || { echo 'GATE D FAIL: phai xoa DUNG 2 dong'; exit 1; }
```

Dùng numstat hai cột, KHÔNG dùng `grep -c "^-"`: dòng header `--- a/...` của git diff cũng khai dấu bằng dấu gạch, đếm nó sẽ ra 3 thay vì 2. Phân biệt được: file này còn 5 lượt scope đã đổi bởi W7. W8a chỉ được tách thêm 2 dòng. Nhiều hơn 2 nghĩa là W8a đã chạy một pass thay chuỗi lần nữa.

**GATE E — KEEP-LIST ĐÃ CÓ 3 HÀNG MỚI**

```bash
for n in N18 N19 N20; do
  grep -q "$n" scripts/rename/keep-list.txt || { echo "GATE E FAIL: thieu hang $n"; exit 1; }
done
awk -F'#' '/N1[89]|N20/ && NF < 2 { print "GATE E FAIL: hang khong co phan # ly do: " $0; exit 1 }' scripts/rename/keep-list.txt
```

Phân biệt được: Gate B giữ được giá trị trong CODE; Gate E giữ được quyết định trong KEEP-LIST, để một sed tương lai không xoá chúng. Hai cổng này soi hai file khác nhau.

**GATE F — TYPECHECK**

```bash
bun run check:ts    # phai exit 0
```

Phân biệt được: file W8a sửa đều nằm trong `packages/coding-agent`, mà `check:types` của package đó chạy trong 25s và nó bắt lỗi type. Không thay thế bằng việc đọc bằng mắt.

**GATE G — BỘ TEST: NOT RUN, ENVIRONMENT BLOCKED**

Không chạy được ở máy này. Ghi vào commit message đúng ba chữ:

```text
test:ts = NOT RUN — environment blocked (pi_natives native addon not built)
```

Gỡ chặn:

```bash
brew install ninja && bun --cwd=packages/natives run build && bun run test:ts
```

TUYỆT ĐỐI không ghi `pass` cho cổng này khi nó chưa chạy. Đây là lý do Gate A–F viết để không cần test: chúng phân biệt được "đã làm" với "test không chạy được" mà không cần chạy một dòng test nào. Nếu CI có runner đã build native addon, chạy `cd packages/coding-agent && bun test test/telemetry-export.test.ts test/pi-scope-aliases.test.ts` ở đó và dán kết quả vào PR.

**GATE H — BẢNG QUYẾT ĐỊNH CỦA W8b (chỉ khi W8b chạy ngay sau)**

```bash
awk -F'\t' '$1=="bare-oh-my-pi"' scripts/rename/disposition.tsv | wc -l   # phai >= 15
```

Phân biệt được: W8b Gate 0 dùng lệnh ghi "15 file" cho `scope=bare-oh-my-pi`, nhưng lệnh đó trả 16 trên HEAD hiện tại. Xem Đính chính #1 — W8b phải loại `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` theo đường dẫn, nếu không Gate 0 của W8b sẽ đỏ vì một hàng thuộc về tài liệu kế hoạch.

**Cổng có thực sự đỏ được không?** Có — `gate_can_fail: true`. Gate 0, A, B, C, D, E, F, H đều phân biệt được "đã làm" với "chưa làm" và mỗi cổng có một đường đỏ riêng. Riêng Gate G thì **không**: nó không chạy được trên máy này, nên nếu ghi `pass` cho nó thì đó là khai sai; nó chỉ ghi được `NOT RUN — environment blocked`.

### Phụ thuộc

**depends_on:**
- `W2`
- `W7` (phụ thuộc CỨNG, không chỉ thứ tự thời gian: Gate C của W7 chụp baseline rồi so sánh sau pass; W8a đổi một literal dạng trần trước thì Gate C đó đỏ và W7 không thể merge, đồng thời W8a cũng không thể chạy)
- `M2` (chỉ cho phần tài liệu ở bước 10)

**blocks:**
- `W8b` — bảng quyết định `scripts/rename/disposition.tsv` phải có ≥ 15 hàng `scope=bare-oh-my-pi` khớp đúng quyết định ở đây.

### Cách sai dễ nhất

1. **Áp cùng một quyết định cho cả 15 file.** (a) "Giữ tất cả" đóng băng luôn hai dòng gallery, và gallery là lệnh CLI đã phát hành nên thương hiệu cũ sẽ xuất hiện trong ảnh chụp màn hình của lệnh đó — lỗi thấy được, nhưng chỉ thấy được sau khi ship. (b) "Đổi tất cả" phá ba giá trị wire của bên thứ ba. Ba cái (b) là N18/N19/N20 — chúng KHÔNG có mục nào trong bảng N1–N17 của plan, tức là nếu kỹ sư chỉ đọc keep-list mà không đọc phần này, họ sẽ không biết phải giữ chúng và sẽ đổi. Đó là lý do ba hàng keep-list ở bước 7 là phần quan trọng nhất của W8a, nặng hơn cả hai dòng rename.
2. **Sai do thứ tự.** W8a chạy sau W7 trên 14/15 file mà W7 đã sửa. Diff của W8a khi review sẽ trộn lẫn thay đổi của hai wave nếu ai đó review bằng `git diff main..HEAD` thay vì `git diff $(cat /tmp/w8a-head-baseline.txt)..HEAD`. Gate C chống đúng cái này bằng cách đòi so với baseline, không so với `main`.
3. **Tin Gate B rồi tưởng xong, không thêm probe telemetry.** Ba giá trị wire còn lại đã có test sẵn nên dễ tưởng đã đủ phủ — nhưng `SERVICE_NAME` không được export và không test nào chạm tới nó. Đó là lỗ hổng duy nhất, và nó chỉ lộ ra khi telemetry đã bật trên máy người dùng thật.
4. **Sửa nhầm `packages/coding-agent/test/otel-resource-probe.ts` thay vì tạo probe anh em.** Probe đó đặt `OTEL_SERVICE_NAME="svc-probe"` và tồn tại chính để chứng minh biến môi trường thắng giá trị fallback; sửa nó để khẳng định giá trị fallback là phá hợp đồng precedence, và test sẽ xanh trong khi không còn bảo vệ đúng thứ gì.

### Cần người quyết

- Ba hàng N18/N19/N20 có được một người duyệt riêng không, hay chấp nhận theo tiền lệ đã đặt ở W7? Đây là câu hỏi có thật về quy trình, không phải về kỹ thuật: §2.3 nói bảng phải do người không viết nó duyệt, và W8a thêm 3 hàng mới thì người duyệt W7 chưa chắc là người duyệt W8a.
- `KEY_NAME` ở `packages/ai/src/registry/oauth/zai.ts:25` có thật sự cần giữ, hay Z.AI coi nó là nhãn tuỳ ý và chấp nhận tên mới? Comment tại `:24` cho thấy ý định thiết kế là "khoá của riêng OMP, không đụng zcode-api-key" — nếu Z.AI chỉ cần một nhãn phân biệt thì đổi tên vẫn an toàn về mặt chức năng, nhưng nó sẽ tạo ra một khoá thứ hai trong tài khoản của người dùng thay vì tái dùng khoá cũ. Không có bằng chứng nào trong repo trả lời được; đây là câu hỏi cho người đã từng chạy `mintZaiApiKey`.
- `EXA_MCP_SOURCE` ở `packages/coding-agent/src/web/search/providers/exa.ts:26` có được Exa dùng cho billing/attribution thật không, hay chỉ là header chẩn đoán? Nếu chỉ chẩn đoán thì đổi tên được và N19 không cần. Nhưng nó đúng cùng loại với N9 (`APP_URL`/`USER_AGENT` — thứ plan đã chốt "giữ nếu chưa có domain mới"), nên mặc định giữ là an toàn.
- Phần tài liệu ở bước 10 có thuộc phạm vi M5 không, hay nên chuyển sang W11 (viết tài liệu)? Cả hai file đó không chứa literal dạng trần, nên việc duy nhất còn lại là sửa câu chữ — đó là việc nhỏ và nó phụ thuộc M2 đã merge, trong khi 13 quyết định còn lại thì không.
- Lệnh nghiệm thu của plan trỏ tới `packages/coding-agent/test/extension-scope-canonicalization.test.ts` không tồn tại. Ở đây đã dùng `packages/coding-agent/test/pi-scope-aliases.test.ts` theo đặc tả W2. Nếu người thực hiện W2 thực tế đặt tên khác, cả hai phải khớp trước khi W8a chạy.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| W8a xử lý "15 file có literal dạng trần `oh-my-pi`", và lệnh mà W8b Gate 0 dùng để sinh danh sách là `git grep -lE '"oh-my-pi"' -- .` với kỳ vọng 15 file. | misleading | Con số 15 chỉ đúng sau khi loại chính file kế hoạch. Lệnh ghi trong Gate 0 của W8b trả 16 trên HEAD `84cbac9`, và file thứ 16 là `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — chính tài liệu kế hoạch, nó chứa 20 lượt dạng trần trong bảng N1–N17 và các đoạn trích dẫ mà W8/W8b nên giữ nguyên. Hai fix: (1) mọi lệnh đếm ở M5 phải có `:!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`; (2) con số đúng cho W8a là 15 file / 23 lượt, và 15 đó KHÔNG phải 7 nguồn + 5 test + 1 doc như plan ngầm ý — nó là 7 nguồn + 7 test + 1 doc. Đây là mẫu số của W8b Gate 0 sẽ đỏ nếu không loại file kế hoạch. Bằng chứng: `git grep -lE '"oh-my-pi"' -- . \| wc -l` = 16; `… ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \| wc -l` = 15; `git grep -oE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \| wc -l` = 23. |
| Danh sách 11 file còn lại gồm "4 file .ts dưới `packages/ai` + `packages/coding-agent/src/web/search/providers/exa.ts`, 5 file test, và `docs/provider-quirks.md:1`". | wrong | Hai nhận sai, tổng thì đúng. (a) KHÔNG phải 4 file .ts dưới `packages/ai` — chỉ có ĐÚNG MỘT file dưới `packages/ai` là `packages/ai/src/registry/oauth/zai.ts`; 6 file nguồn còn lại đều nằm dưới `packages/coding-agent`. (b) KHÔNG phải 5 file test — có 7 file test. Phân bố thật: 7 nguồn + 7 test + 1 doc = 15. File thứ 8 nguồn mà plan không liệt kê trong danh sách 11 đó là `packages/coding-agent/src/mcp/oauth-flow.ts`, nó chỉ được nhắc trong văn xuôi chứ chưa bao giờ được đưa vào danh sách đầy đủ. (c) `docs/provider-quirks.md` không có hit ở dòng 1 — dòng 1 là tiêu đề `# Provider quirks: special casings, streams, auth, and catalog handling`. Hit thật ở DÒNG 1706 trong file 1750 dòng. |
| `packages/coding-agent/src/cli/gallery-fixtures/segments.ts` — 2 lượt trong "fixture transcript đã ghi". Đây là phán đoán: coi như LỊCH SỬ, không coi là danh tính — trừ khi demo gallery được định nghĩa là để trình diễn thương hiệu mới, thì phải sửa. | wrong | Không có transcript nào ở file này và lập luận "lịch sử" không áp dụng. `segments.ts` là BỘ KHUNG HIỂN THỊ TỔNG HỢP: `createGallerySegmentContext()` trả về một `SegmentContext` nhận dính, và comment tại dòng 23 ghi rõ "Deterministic full context for isolated status-segment previews and tests". Hai giá trị `relativeRepoRoot` (dòng 33) và `projectName` (dòng 164) là chuỗi hiển thị được render ra stdout. `gallery` là lệnh CLI ĐÃ ĐĂNG KÝ và PHÁT HÀNH — `packages/coding-agent/src/cli-commands.ts:121-126` khai báo `name: "gallery"` trỏ sang `commands/gallery`, và `packages/coding-agent/src/cli/gallery-cli.ts:1-9` mô tả "`omp gallery` — render every built-in tool's renderer across its lifecycle ... and prints the rendered output to stdout", kèm `captureGalleryScreenshots`. Nên điều kiện "trừ khi demo gallery được định nghĩa là để trình diễn thương hiệu mới" đã được trả lời RÕ: có, chính là. DISPOSITION: đổi cả hai sang `ultraworkers`. Đây là thay đổi nguồn duy nhất của cả W8a — 2 dòng trong 1 file. |
| "11 cái còn lại … phần lớn là tên host HTTP hoặc kỳ vọng test, không phải danh tính — nhưng phải xác nhận từng file, không giả định". Và bốn mục "quan trọng nhất" đã được xử lý (N7 telemetry, N5 acp, gallery, N8 alias). | gap-in-plan | BA file nguồn trong nhóm "còn lại" là giá trị wire gửi cho BÊN THỨ BA, và KHÔNG có mục nào trong bảng N1–N17 nào phủ chúng. Chi tiết: (1) `packages/ai/src/registry/oauth/zai.ts:25` `KEY_NAME` là `name` gửi trong payload `businessLogin`/key-mint của Z.AI — comment tại dòng 24 nói rõ ngữ nghĩa: "OMP's own key name so sign-in never mutates ZCode's `zcode-api-key`", tức là danh tính SỞ HỮU khoá, và đổi tên nghĩa là tạo một khoá mới trong tài khoản Z.AI của người dùng thay vì tái dùng khoá cũ (cùng loại với N3). (2) `packages/coding-agent/src/web/search/providers/exa.ts:26` `EXA_MCP_SOURCE` được gửi ở header `x-exa-source` tại dòng 369 — attribution phía Exa, cùng loại với N9. (3) `packages/coding-agent/src/mcp/oauth-flow.ts:629` `client_name` là payload đăng ký client ĐỘNG RFC 7591 gửi tới máy chủ OAuth, và docblock ngay trên (dòng 612-620) nêu nếu Figma từ chối client ngoài danh sách — tức provider dùng payload này để lập allowlist. Không cái nào là "tên host HTTP" (cả ba đều là giá trị, không phải hostname). TẤT CẢ BA phải giữ và phải được thêm vào keep-list — nếu không, một kỹ sư đọc keep-list sẽ không biết phải giữ và sẽ đổi chúng. Bằng chứng: `grep -n 'KEY_NAME' packages/ai/src/registry/oauth/zai.ts` → 25 (khai báo), 167 (so sánh khoá hiện có), 171 (`postJson(keysUrl, { name: KEY_NAME })`); `grep -rn 'EXA_MCP_SOURCE' packages/coding-agent/src/` → 26 và 369; `sed -n '610,640p' packages/coding-agent/src/mcp/oauth-flow.ts` → `registrationBody.client_name` và docblock về Figma allowlist. |
| Test cần viết: "Telemetry: khẳng định giá trị thuộc tính resource được export đúng bằng giá trị đã quyết định, và ghim nó bằng một test". File test mới: `packages/coding-agent/test/telemetry-export-otlp.test.ts`. | partly-wrong | `SERVICE_NAME` KHÔNG được export (`grep -n 'export' packages/coding-agent/src/telemetry-export-otlp.ts` không có dòng nào export nó), và có MỘT seam sẵn đúng dụng cho việc này: `packages/coding-agent/test/otel-resource-probe.ts`, chạy nhịp bởi `packages/coding-agent/test/telemetry-export.test.ts:118-124`. Nhưng probe đó đặt `OTEL_SERVICE_NAME = "svc-probe"` (dòng 37) và comment dòng 59 nói "OTEL_SERVICE_NAME must win over the service.name in OTEL_RESOURCE_ATTRIBUTES" — tức nó TỒN TẠI để chứng minh biến môi trường THẮNG giá trị fallback. Do đó probe hiện có KHÔNG BAO GIỜ quan sát được giá trị fallback, và sửa nó để khẳng định `"oh-my-pi"` sẽ phá đúng hợp đồng precedence mà nó sinh ra. Fix: tạo probe ANH EM `packages/coding-agent/test/otel-service-name-probe.ts` bỏ `OTEL_SERVICE_NAME` và `OTEL_RESOURCE_ATTRIBUTES`, và thêm nó vào mảng `probes` hiện có — không cần hạ tầng mới, không cần sửa probe cũ. Tên file trong plan (`telemetry-export-otlp.test.ts`) nên đổi thành tên probe để trùng với quy ước sibling của file hiện có. Bằng chứng: `ls packages/coding-agent/test/telemetry-export-otlp.test.ts` → No such file; `sed -n '118,145p' packages/coding-agent/test/telemetry-export.test.ts` → mảng `probes` 3 phần tử và `expect(Object.fromEntries(results))`. |
| Lệnh nghiệm thu của W8a: `bun run check && (cd packages/coding-agent && bun test test/extension-scope-canonicalization.test.ts test/telemetry-export-otlp.test.ts)`, và "Phần cần viết: phân giải extension, trong file test của W2". | wrong | `packages/coding-agent/test/extension-scope-canonicalization.test.ts` KHÔNG TỒN TẠI — đặc tả W2 của chính milestone này đặt tên file là `packages/coding-agent/test/pi-scope-aliases.test.ts`. Lệnh nghiệm thu đó trỏ tới một file không ai sẽ tạo, nên nó đỏ mà không liên quan gì đến việc của kỹ sư. Về `bun run check`: nó gọi thêm `check:rs` cần cargo, chưa xác minh trong W8a; phần chạy được và chạm tới file W8a sửa là `bun run check:ts`, đã đo exit 0 tại HEAD. Về `bun test`: bị chặn bởi native addon chưa build trên máy này, nên lệnh đó phân biệt được "đã làm" với "test không chạy được" — đây là lý do Gate A–F viết để không cần chạy một dòng test nào, và Gate G ghi rõ NOT RUN. Bằng chứng: `ls -la packages/coding-agent/test/extension-scope-canonicalization.test.ts` → No such file; `bun run check:ts` exit 0, oxlint + oxfmt trên 5445 file, 16/16 package `check:types` Done. |
| "W7 đẩy 585 file .ts có token `omp` sang 'làm theo từng file'" và W8a là 15 file dạng trần; ranh giới của W8a là phần literal dạng trần mà sed scope của W7 KHÔNG chạm tới. | partly-wrong | Ranh giới ĐÚNG ở CẤP LÍNH, SAI ở CẤP FILE. Lệnh scope của W7 là `perl -pi -e 's{\@oh-my-pi/}{@ultraworkers/}g'` — nó không thể nào chứa được một literal dùng trong, nên 23 lượt này đều sống sau. NHƯNG 14/15 file trong bảng W8a CŨNG chứa dạng có dấu `/`: chỉ có `packages/ai/src/registry/oauth/zai.ts` có bằng 0 lượt scope; 14 file còn lại có từ 1 đến 16 lượt (acp-lazy-startup 16, acp-initialize-conformance 10, acp-agent 8, legacy-pi-compat 7, cursor-exec-modern và zai-oauth 6 mỗi file, web-search-exa 6, segments 5, oauth-flow 5, telemetry 4, git-hosting 2, exa 2, oauth-flow.test 2, provider-quirks 1). Nghĩa là W7 ĐÃ sửa 14/15 file của W8a, và chỉ một file duy nhất là W8a sở hữu toàn bộ. Hai hệ quả phải nói rõ: (1) Gate C của W7 (so sánh tập dạng trần) là thứ bảo vệ W8a — W8a mà chạy trước sẽ làm nó đỏ; (2) khi review W8a, phải so sánh với baseline W8a chứ KHÔNG phải với `main`, nếu không sẽ thấy 14 file có hơn trăm hàng thay đổi của W7 trộn vào diff của W8a. Chỉ có một file (`zai.ts`) mà W8a sửa mà W7 không đụng. Bằng chứng: vòng `for f in <15 file>; do grep -c -F '@oh-my-pi/' $f; done` cho 0,1,6,6,5,7,5,8,4,2,10,16,2,2,6 theo thứ tự bảng; `git grep -l '@oh-my-pi/' -- . \| wc -l` = 4149 với 17697 lượt. |
| W8a phụ thuộc "W2, và M2 đã merge cho phần tài liệu". | gap-in-plan | Danh sách phụ thuộc thiếu W7, và đây là phụ thuộc CỨNG chứ không chỉ thứ tự thời gian. Gate C của W7 chụp baseline dạng trần rồi so sánh sau pass; nếu W8a đổi một literal dạng trần trước, Gate C đó và W7 không thể merge, đồng thời W8a cũng không thể chạy. Các file tài liệu mà plan giao cho W8a (`docs/extension-loading.md:231`, `docs/porting-from-pi-mono.md:46-51`) cũng không có literal dạng trần — `grep -cE '"oh-my-pi"'` trên cả hai đều bằng 0, chúng chỉ có dạng có dấu `/` thuộc W7. Nghĩa là phần tài liệu của W8a là sửa VĂN XUÔI sau W7, không phải thay chuỗi; chạy một pass thay chuỗi ở bước 10 sẽ không có gì để thay. Bằng chứng: `grep -cE '"oh-my-pi"' docs/extension-loading.md docs/porting-from-pi-mono.md` → 0 và 0; `awk 'NR>=228 && NR<=232'` → dòng 231 là bullet về `onLoad` hook với `@oh-my-pi/pi-catalog/models` và `@mariozechner/*`; `awk 'NR>=44 && NR<=52' docs/porting-from-pi-mono.md` → dòng 46-50 là bảng 5 map `@mariozechner/pi-*` → `@oh-my-pi/pi-*`. |

## Cần người xác nhận

Bốn chỗ đặc tả tự mâu thuẫn với chính nó. Không tự sửa ở trên — cần người quyết trước khi gõ.

1. **Marker của probe mâu thuẫn với quyết định N7.** Bước 8 nói phép kiểm trong probe mới là `has("ultraworkers-fallback-marker")` "đúng tên bạn đã chốt ở hàng N7", nhưng hàng N7 trong bảng quyết định là `keep-wire` — `SERVICE_NAME` giữ nguyên `"oh-my-pi"`, và khối "hình dạng biến theo quy ước W1" cũng viết `const SERVICE_NAME = "ultraworkers" hoặc giữ "oh-my-pi"` — một nhánh mơ hồ. Nếu N7 giữ `"oh-my-pi"` thì marker `ultraworkers-fallback-marker` không bao giờ khớp, và probe sẽ in `PROBE: NO_EXPORT` vĩnh viễn. Cần chốt: giá trị thật của `SERVICE_NAME` sau W8a, rồi suy ra marker tương ứng.

2. **Số file pin test tự mâu thuẫn trong `test_contract`.** Cùng một đoạn: "Bốn test file hiện có đã là sẵn pin cho 3 giá trị wire" rồi vài dòng sau "KHÔNG thêm ca nào vào 5 file đó". Bảng quyết định liệt kê 5 file pin, và chúng phủ 4 giá trị wire chứ không phải 3 (N18 qua `packages/ai/test/zai-oauth.test.ts`, N5 qua hai file `acp-initialize-conformance` và `acp-lazy-startup`, N19 qua `web-search-exa`, N20 qua `oauth-flow.test.ts`) — trong khi `test_contract` chỉ kể "3 giá trị wire còn lại (N5, N19, N20)", bỏ sót N18. Tương tự, phần tóm đầu file và `user_visible_effect` nói "7 giá trị wire giữ nguyên", nhưng bảng chỉ đánh dấu 6 hàng `keep-wire` (N7, N5, N8, N18, N19, N20); hàng thứ 7 là `keep-doc` cho `docs/provider-quirks.md`, tức là tài liệu chứ không phải giá trị wire — Gate B cũng kiểm 7 vị trí nhưng một vị trí là file doc.

3. **Bước 3 đếm bảng quyết định khác với chính bảng đó.** Bước 3 nói "Bảng gồm 15 hàng: 8 dòng literal (7 file nguồn + 1 file doc) và 7 dòng test". Bảng trong `Hình dạng code` thật sự có 16 hàng (9 hàng nguồn/doc + 7 hàng test), vì hai hàng `RENAME` nằm cùng một file là hai hàng riêng. Con số 15 khớp với SỐ FILE, không khớp với số hàng. Cần chốt bước 3 nói "15 file" hay "16 hàng".

4. **`packages/coding-agent/test/pi-scope-aliases.test.ts` bị Gate C đòi chạm tới nhưng không bước nào bảo sửa.** Gate C đòi danh sách file bị chạm đúng 5 mục, trong đó có file này; nhưng nó không có trong `files_touched`, không có bước nào trong 12 bước nhắc tới, và hai file doc ở bước 10 lại không có trong danh sách của Gate C. Cần chốt: thêm một bước sửa `pi-scope-aliases.test.ts`, hay sửa danh sách Gate C. Gate C sẽ đỏ nếu cứ làm theo đúng 12 bước hiện tại.


---


## W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)

**Sóng:** Wave 3.

**Effort:** L — lớn nhất milestone sau việc phát hành. Plan tự ghi là "chưa định lượng" và nói thẳng ở mục «W8b không quy ra ngày được» (tra bằng `grep -n 'W8b không quy ra ngày được' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`; ra `14183` tại HEAD `1454dc0`) rằng mục này không suy ra được ngày từ phép nhân với W8a: W8a là 15 quyết định, W8b là hàng trăm hàng bảng quyết định, và phân bố giữa hai bên lệch nhau. Con số thực tế cao hơn plan ở ba chỗ nên effort cao hơn ước tính cũ: 599 file thay vì 585, 226 file thay vì 0 là file test mà plan không tách ra, và 11 file chồng với W9 phải rà lại hai lần. Cách chuẩn hoá mà plan đề xuất vẫn đúng và nên làm ngay khi bắt đầu: làm 50 hàng đầu của `disposition.tsv`, đo thời gian thật, rồi nhân để ước lượng phần còn lại — đừng chuẩn hoá bằng cách nhân con số file với một thời gian giả định.

**Rủi ro chính:** `sed` đại trà trên 599 file. Một lệnh sed token sẽ đổi cả tên hiển thị lẫn giá trị wire lẫn selector worker trong một lần, và sẽ không ai kiểm tra được — vì trước khi bảng quyết định tồn tại, không có danh sách nào trong repo nói cái gì được phép đổi. Đây không phải rủi ro giả định: đó chính là lý do mục này tồn tại thay vì một dòng trong W8.

### File cần chạm tới

| path | hành động | thay đổi | đã mở kiểm chứng? |
| --- | --- | --- | --- |
| `scripts/rename/disposition.tsv` | tạo | Bảng quyết định 6 cột, một hàng cho mỗi (path, disposition). 599 file nguồn + 26 file chồng scope `dot-omp-literal` + file chồng `bare-oh-my-pi`; tổng số hàng lớn hơn 599 vì một file vừa có lượt đổi vừa có lượt giữ thì tách thành hai hàng cùng `path`. **CHƯA TỒN TẠI** — `ls scripts/rename/` → `No such file or directory`; `git grep -ln disposition` chỉ trả về chính file plan. Đây là khoảng trống thật, không phải thứ cần sửa trong plan. Xem `open_questions[0]` về việc ai là người duyệt. | không (chưa tồn tại — thiết kế dưới đây là đề xuất, chưa được thử) |
| `scripts/rename/check-disposition.ts` | tạo | Bộ kiểm bảng quyết định: parse TSV, tính lại tập hit bằng biểu thức đã ghim, đối chiếu hai chiều (thiếu hàng / thừa hàng), kiểm `reason` không trống, `keep_refs` bắt buộc khi `disposition` bắt đầu bằng `keep-`, đóng từ vựng `disposition`, và kiểm duyệt bằng `git log`. In từng vi phạm ra stdout và `process.exit(1)`. Không tồn tại. Cần thiết vì cổng nghiệm thu 1 của plan chỉ viết bằng văn xuôi — không có lệnh nào chạy được, nên cổng đó không bao giờ đỏ được. | không (chưa tồn tại — thiết kế dưới đây là đề xuất, chưa được thử) |
| `scripts/rename/README.md` | tạo | Ghi schema 6 cột, từ vựng `disposition`, quy tắc `hits` (xem mục Hình dạng code), và quy trình duyệt: ai viết, ai duyệt, duyệt ở bước nào, và điều gì bị chặn nếu chưa duyệt. Không tồn tại. Cần vì quy tắc duyệt của plan chỉ tồn tại dưới dạng một câu tiếng Việt trong plan; kỹ sư triển khai từ đặc tả này sẽ không thấy plan. | không (chưa tồn tại — thiết kế dưới đây là đề xuất, chưa được thử) |
| 599 file `.ts` (tập sinh bằng lệnh, KHÔNG liệt kê tay) | sửa | Sửa đúng các lượt mang `disposition=rename`. 373 file nguồn + 226 file test. Đây là sản phẩm của bảng quyết định, không phải một danh sách viết tay. Đếm tại HEAD 1454dc0 cho **599**, KHÔNG phải 585 như plan ghi. Tự sinh lại danh sách bằng lệnh ở bước 1; đừng tin một danh sách dán trong tài liệu. | có (`verified: true`) |
| `packages/*/CHANGELOG.md` | sửa (không thêm gì) | **KHÔNG thêm mục changelog.** Work item này không yêu cầu mục changelog, và AGENTS.md cấm sửa khối đã phát hành. Ngoài ra N11 của §2.3 giữ nguyên mọi mục dưới khối `## [Unreleased]`. | có (`verified: true`) |

### Các bước

0. **DỪNG nếu chưa có W1, W2, W3 trên `main`.** Cả ba là điều kiện tiên quyết vì W1 biến 5 giá trị wire thành hằng số, và W2/W3 ổn định tên hiển thị — sau đó `grep '"omp"'` ở vị trí wire mới có nghĩa là "ai đó bỏ sót hằng số". Chạy `git log --oneline -1` và xác nhận ba work item đã merge.
   Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, mục «Phụ thuộc» của W8b — tra bằng `grep -n 'W1, W2, W3 (hằng số đã ổn định)' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (ra `13968` tại HEAD `1454dc0`; số dòng trôi theo từng commit nên đừng ghim số).

1. **Sinh lại danh sách 599 file từ cây hiện tại** — KHÔNG dùng con số 585 của plan và KHÔNG chạy `git grep` từ thư mục con. `git grep` không có pathspec thì chỉ quét thư mục đang đứng; chạy từ `.lavish-wip/m5-specs/` sẽ trả về 0 file và người làm sẽ tưởng cây đã sạch. Lệnh: `git grep -lE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | sort > /tmp/w8b-files.txt` rồi `wc -l < /tmp/w8b-files.txt` (kỳ vọng 599 tại HEAD 1454dc0; nếu khác thì cây đã trôi, ghi lại con số mới vào bảng, đừng ép về 585). Cùng lúc ghi lại số lượt: `git grep -oE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | wc -l` (kỳ vọng 1853).

2. **Tạo khung bảng:** `mkdir -p scripts/rename` (dùng `fs.mkdir` trong script, không spawn shell), rồi viết header đúng một dòng, tab phân cách, không quote: `scope\tpath\thits\tdisposition\treason\tkeep_refs`. KHÔNG thêm dòng comment vào file TSV — parser sẽ phải bỏ qua nó và đó là chỗ dễ sót lỗi; mọi giải thích nằm ở `scripts/rename/README.md` và ở cột `reason`.

3. **Điền bảng theo thứ tự ưu tiên rủi ro, không theo thứ tự alphabet.**
   - Nhóm A trước: 5 file chứa giá trị wire của N3–N6 — `packages/catalog/src/wire/codex.ts:52`, `packages/coding-agent/src/dap/session.ts:1465-1466`, `packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236`, `packages/coding-agent/src/modes/warp-events.ts:60`, `packages/ai/src/providers/gitlab-duo-workflow.ts:2232` — đánh `keep-wire`, `keep_refs=N3`…`N6`.
   - Nhóm B: 11 file chứa `__omp_worker_` — đánh `keep-worker-selector`, `keep_refs=W9`.
   - Nhóm C: 26 file chứa cả `".omp"` — đánh `keep-path`, `keep_refs=W4`.
   - Nhóm D: 226 file test, trong đó **24 đã nằm trong A/B/C** (4 của B, 20 của C) → còn **202** file test chưa gán — xem `open_questions[1]`, đây là va chạm sở hữu với W11.
   - Nhóm E: 373 file nguồn, trong đó **18 đã nằm trong A/B/C** (5 của A, 7 của B, 6 của C) → còn **355** file nguồn chưa gán, phần lớn `rename`.
   - **Các nhóm KHÔNG cộng lại thành 599.** A, B, C là lớp ghi đè trên cùng tập 599 (A ∪ B ∪ C = 42 file, đã đo), còn D/E là cách cắt theo test-vs-nguồn. 599 là kiểm tra bao phủ cuối cùng, không phải tổng các nhóm — và `disposition` phải cho phép một file có nhiều hàng (xem mục `hits`).
   Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, bảng N1–N17 của §2.3 — tra bằng `grep -n '^| N1 |' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (ra `13361` tại HEAD `1454dc0`; số dòng trôi theo từng commit nên đừng ghim số). Cả 5 neo dòng ở Nhóm A đã được mở và đối chiếu: 5/5 khớp biểu thức đã ghim.

4. **CHỐT hai file chứa `omp` mà KHÔNG khớp biểu thức đã ghim, trước khi điền tiếp.** `packages/coding-agent/src/modes/acp/acp-agent.ts:656` (`name: "oh-my-pi"`, N5) và `packages/coding-agent/src/telemetry-export-otlp.ts:51` (`SERVICE_NAME = "oh-my-pi"`, N7) đều là dạng trần nên token `omp` không xuất hiện trên dòng đó. Cả hai file CÓ nằm trong tập 599 (vì có hit khác), nên một quy tắc loại trừ theo TÊN FILE sẽ giữ đúng file nhưng không bảo vệ đúng DÒNG. Ghi chúng là hàng `keep-wire` với `keep_refs=N5` / `N7`. Cả hai neo đã mở và xác nhận là **no-match** với biểu thức đã ghim, đồng thời tra bằng `grep -qxF` vẫn có mặt trong tập 599.

5. **Chia `hits` cho TỪNG hàng, không chỉ cho từng file.** Đây là quyết định thiết kế quan trọng nhất của mục: nó biến bảng từ một danh sách ý kiến thành một bảng cân đối có thể bị phủ định. Với mỗi hàng, `hits` = số lượt của biểu thức đã ghim thuộc đúng lớp disposition đó. Bất biến bắt buộc: tổng `hits` của mọi hàng cùng một `path` phải bằng tổng lượt của file đó. Kiểm bằng biểu thức ứng với `disposition` của hàng đó — bảng đầy đủ nằm ở mục `hits` trong §Hình dạng code, và lưu ý `keep-worker-selector` / `keep-path` KHÔNG dùng ERE.

6. **Đổi tên ĐÚNG CÁC LƯỢT `disposition=rename`, từng file một.** KHÔNG chạy `sed` trên cả 599 file — đó chính là kịch bản mà mục này sinh ra để chặn. Thứ tự an toàn: (a) chỉnh hằng số trung tâm và 5 literal nhân bản (xem `open_questions[2]`), (b) 373 file nguồn, (c) 226 file test. Mỗi lần sửa phải là sửa một quyết định đã ghi ở bảng, không phải một lần quét lại file.
   Vì ba literal này thuộc W1 (hàng 17 của §2.2), ghi rõ `W1` vào cột `reason` của hàng tương ứng trong bảng quyết định — cột `reason` là tự do, nên dùng nó làm chỗ ghi sở hữu khi không muốn thêm cột — và nêu trong PR rằng ba dòng này bị W1 và W8b cùng chạm.
   Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, hàng cảnh báo «Tách thành hai pass với exclusion list» trong mục Rủi ro của W8b — tra bằng `grep -n 'Tách thành hai pass với exclusion list' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (ra `14107` tại HEAD `1454dc0`; số dòng trôi theo từng commit nên đừng ghim số).

7. **Chạy cổng nghiệm thu 1 — BẢNG ĐÃ ĐỦ VÀ ĐÃ ĐƯỢT DUYỆT.** `bun scripts/rename/check-disposition.ts --stage=pre`. Lệnh này phải ĐỎ nếu: thiếu hàng cho bất kỳ file nào trong tập 599, có hàng `reason` rỗng, có hàng `keep-*` mà `keep_refs` trống, `disposition` nằm ngoài từ vựng đóng, tổng `hits` lệch với số lượt thật. Thiếu người duyệt thứ hai thì KHÔNG đỏ — cổng chỉ in cảnh báo, lý do ở Cổng 0. Chỉ khi nó xanh mới được sang bước 8.

8. **Chạy cổng nghiệm thu 2 — SAU KHI ĐỔI TÊN.** `bun scripts/rename/check-disposition.ts --stage=post`. Cổng này dựa vào BẢNG, không dựa vào một danh sách viết tay thứ hai: mỗi hàng `rename` phải còn 0 lượt; mỗi hàng `keep-*` phải còn đúng số lượt ghi ở cột `hits`. Với file hỗn hợp (vừa có lượt đổi vừa có lượt giữ) đây là lý do cột `hits` phải tách theo lớp — nếu để chung, một lượt đổi bị bỏ sót sẽ bị che bởi lượt giữ hợp lệ và cổng vẫn xanh.

9. **Chạy typecheck:** `bun run check:ts`. Đây là tín hiệu chính và nó XANH trên máy này (exit 0, đã chạy thật 2026-09-28). Nhưng nó KHÔNG thấy một literal sai — một hàng `rename` bị bỏ sót vẫn typecheck xanh. Vì vậy nó là cổng thứ hai, không phải cổng chính.

10. **Chứng minh cổng thật sự đỏ được TRƯỚC khi báo xong.** Làm ba thao tác phá hỏng có chủ đích trên một bản sao, mỗi lần chạy lại cổng và ghi lại exit code: (1) xoá một hàng `rename` → `--stage=pre` phải đỏ; (2) để trống một cột `reason` → `--stage=pre` phải đỏ; (3) đổi tên token trong một file có hàng `keep-wire` → `--stage=post` phải đỏ. Không có bước này thì "cổng xanh" chỉ chứng minh cổng không nổ, chứ không chứng minh cổng canh.

11. **CHỈ chạy `bun run test:ts` nếu đã gỡ chặn native addon.** Trên máy này lệnh đó hiện ĐỎ vì lý do không liên quan gì đến việc đổi tên: `3 chunks passed / 185 failed`, `Error: Failed to load pi_natives native addon for darwin-arm64`. Nó đỏ TRƯỚC và SAU khi đổi tên giống nhau, nên không phân biệt được "tôi làm hỏng" với "addon chưa build". Gỡ chặn: `brew install ninja` TRƯỚC, rồi `bun --cwd=packages/natives run build` (thiếu `ninja` thì build chết với `CMake Error: CMake was unable to find a build program corresponding to "Ninja"`). Ghi kết quả `test:ts` vào PR dưới dạng thông tin, không dùng nó làm cổng chặn merge.
    Neo: `package.json:90` (`"test:ts": "bun scripts/ci-test-ts.ts local-ts"`) — số dòng do đặc tả nêu, chưa mở kiểm lại.

12. **Rà lại bảng SAU khi W9 merge.** W8b gán các hàng selector là `keep-worker-selector` với `keep_refs=W9`, nhưng W9 nằm ở wave 4, TẾT hơn W8b. Nghĩa là khi W8b chạy, các selector vẫn còn tên cũ và bảng ghi "giữ". Sau khi W9 đổi tên chúng, phải chạy lại `bun scripts/rename/check-disposition.ts --stage=post` và cập nhật cột `hits` của các hàng selector (số lượt giữ sẽ không còn là số cũ). Không làm bước này thì cổng wave 4 sẽ đỏ vì lý do không ai hiểu.
    Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`, mục «Phụ thuộc» của W8b — tra bằng `grep -n 'W1, W2, W3 (hằng số đã ổn định)' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (ra `13968` tại HEAD `1454dc0`; số dòng trôi theo từng commit nên đừng ghim số).

### Hình dạng code

Hai sản phẩm, một sản phẩm dữ liệu và một sản phẩm kiểm.

**1. `scripts/rename/disposition.tsv`** — TSV thuần, đúng một dòng header, 5 tab mỗi hàng, không quote, không dòng comment. Sáu cột theo thứ tự cố định:

- `scope` — từ vựng đóng: `display-token` (tập 599 file `.ts`, mục này) | `dot-omp-literal` (94 file, W4) | `bare-oh-my-pi` (16 file, W8a) | `app-name-literal` (4 file, W1). Bốn tập chồng nhau — 26 file có cả `omp` token lẫn `".omp"`, 11 file có cả token lẫn selector — nên `scope` mới là thứ tách chúng trong cùng một tệp.
- `path` — đúng chuỗi `git grep -l` phát ra: không rút gọn, không tiền tố `./`, dùng `/` làm dấu phân cách.
- `hits` — số lượt THUỘC LỚP CỦA HÀNG NÀY, và **KHÔNG đếm được bằng một biểu thức duy nhất cho mọi lớp**. Biểu thức ứng với từng `disposition`: `rename` và `keep-wire` → `git grep -oE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- <path> | wc -l`; `keep-worker-selector` → `git grep -o '__omp_worker_' -- <path> | wc -l`; `keep-path` → `git grep -oE '"\.omp"' -- <path> | wc -l`. Lý do phải tách: ERE đã ghin cố tình loại `_` và `.` ở ranh giới trước `omp`, nên nó KHÔNG thấy selector lẫn literal `.omp` — đo cả ba lớp bằng ERE sẽ khiến 37 hàng `keep-*` ghi nhầm số của lớp khác. Bằng chứng đo lại: 11 file Nhóm B có 26 selector nhưng 31 lượt ERE; 26 file Nhóm C có 72 literal `".omp"` nhưng 83 lượt ERE; `packages/utils/src/dirs.ts` có 4 literal `".omp"` mà ERE không tính lượt nào. Ngữ nghĩa phụ thuộc `disposition`: với `rename` đây là số phải về 0; với `keep-*` đây là số phải CÒN LẠI nguyên vẹn. Bất biến kiểm tra: tổng `hits` của mọi hàng cùng `path` bằng tổng lượt thật của file đó. Đây là điểm khác biệt giữa một bảng quyết định và một bảng ý kiến — một lượt bị quên đếm sẽ làm lệch số và cổng sẽ đỏ.
- `disposition` — từ vựng đóng, không thêm mục mới: `rename` | `keep-wire` | `keep-path` | `keep-worker-selector` | `keep-doc-name`. Trong phạm vi `scope=display-token`, `keep-doc-name` hầu như không dùng (tài liệu là `.md`, thuộc W13) nhưng vẫn phải nằm trong từ vựng để checker không phải đoán.
- `reason` — bắt buộc, không trống ở bất kỳ hàng nào. Hàng không có lý do thì không được duyệt, cùng tiêu chuẩn với keep-list của §2.3.
- `keep_refs` — mục §2.3 (`N1`…`N17`) hoặc work item (`W4`, `W6`, `W9`, `W11`). Bắt buộc có khi `disposition` bắt đầu bằng `keep-`; bắt buộc rỗng khi `disposition` là `rename`.

Đơn vị của bảng là FILE, không phải lượt — 599 hàng là thứ người ta đọc nổi, 1853 hàng thì không. Một file vừa có lượt đổi vừa có lượt giữ thì tách thành HAI hàng cùng `path`, phân biệt bằng `disposition` và `hits`. Vì vậy kiểm tra đầy đủ là "có ÍT NHẤT MỘT hàng", không phải "đúng một hàng".

**2. `scripts/rename/check-disposition.ts`** — script Bun thuần, không import addon native, chạy được khi mọi test khác đang đỏ. Dùng `@oh-my-pi/pi-utils` cho logger nếu nó ghi ra stdout; vì đây là script CLI độc lập không đi vào TUI/RPC thì `console.log` được phép, nhưng phải là output có chủ đích (danh sách vi phạm), không phải log rải rác. Cấu trúc:

```typescript
export type Disposition = "rename" | "keep-wire" | "keep-path" | "keep-worker-selector" | "keep-doc-name";
export type Scope = "display-token" | "dot-omp-literal" | "bare-oh-my-pi" | "app-name-literal";

export interface DispositionRow {
  scope: Scope;
  path: string;
  hits: number;
  disposition: Disposition;
  reason: string;
  keepRefs: string[];
}

export function parseDisposition(text: string): { rows: DispositionRow[]; violations: string[] };
export function checkPre(rows: DispositionRow[], treeHits: Map<string, number>): string[];
export function checkPost(rows: DispositionRow[], treeHits: Map<string, number>): string[];
```

Biểu thức đếm là HẰNG SỐ trong file, không nội suy từ argv, và phải được viết đúng với dấu gạch chéo kép trong chuỗi TS:

```typescript
const OMP_TOKEN_ERE = '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)';
```

Cấm tuyệt đối `\b` và `\<` trong bất kỳ lệnh kiểm nào. Trên máy này `git grep -cE '\bomp\b' -- packages/utils/src/dirs.ts` trả về KHÔNG có dòng nào và exit 1, trong khi `grep -cE '\bomp\b'` trên đúng file đó trả về 104 — vì `git grep` dùng regcomp không hiểu `\b`, còn `grep -E` — cả BSD grep lẫn GNU grep — thì hiểu. Không liên quan gì tới phiên bản: `git grep -E` dùng bộ dịch regex riêng và **không** hiểu `\b` là ranh giới từ, trong khi mọi `grep` thông thường đều hiểu. Một cổng viết bằng `git grep -E '\bomp\b'` sẽ luôn xanh vì không khớp gì cả. Đó là loại cổng nguy hiểm nhất: nó không đỏ khi sai, nó chỉ không bao giờ đỏ.

Hai chế độ:
- `--stage=pre` — bảng phải đầy đủ và đã duyệt. Đỏ khi: thiếu hàng cho file nào trong tập 599; có hàng cho `path` không còn tồn tại trong cây; `reason` rỗng; `disposition` ngoài từ vựng; `hits` không khớp số đo bằng biểu thức ứng với `disposition` của chính hàng đó (xem mục `hits` — `keep-worker-selector` và `keep-path` dùng biểu thức riêng, không dùng ERE); `hits = 0` khi `keep_refs` trỏ tới một vị trí dạng trần không khớp bất kỳ biểu thức nào (trường hợp N5/N7) mà cột `reason` lại không ghi lý do; `keep_refs` rỗng khi `disposition` bắt đầu bằng `keep-`; `keep_refs` khác rỗng khi `disposition` là `rename`; tổng `hits` theo `path` lệch với tổng lượt thật; số file trong bảng khác số file `git grep` trả về. Chưa có người duyệt thứ hai thì chỉ in cảnh báo, KHÔNG đỏ — xem lý do ở Cổng 0.
- `--stage=post` — sau khi đổi tên. Với mỗi hàng `rename`: số lượt còn lại trong file phải bằng 0. Với mỗi hàng `keep-*`: số lượt còn lại phải BẰNG đúng `hits` đã ghi. Không có danh sách thứ hai để đối chiếu — tập hit còn lại được đối chiếu với chính `disposition` trong bảng, đúng như plan yêu cầu.

Không dùng `mock.module()`, không `any`, không `ReturnType<>`, không inline import. `parseDisposition` trả về object chứa cả `rows` lẫn `violations` nên hai chế độ dùng chung một parser và một nguồn sự thật.

**Điều KHÔNG được làm:** không `sed` trên 599 file. Đó chính là kịch bản tai nạn mà mục này tồn tại để chặn — một `sed` token sẽ đổi cả tên hiển thị lẫn giá trị wire lẫn selector worker, và không ai kiểm tra được vì không có danh sách nào nói cái gì được phép đổi.

### Hợp đồng test

Hợp đồng quan sát được của mục này là: **bảng quyết định và cây mã phải khớp nhau theo hai chiều, và bộ kiểm phải đỏ được khi chúng lệch.**

Cụ thể, `bun scripts/rename/check-disposition.ts` bảo vệ bốn hợp đồng, mỗi hợp đồng đều gọn tên được lỗi cụ thể mà người đọc sẽ thấy:

1. **Không file nào trong tập 599 bị bỏ sót khỏi bảng.** Tệp chưa có hàng nào thì đỏ. Lỗi bị chặn: một `sed` hoặc một PR sửa 480 file và bỏ 119 file không ai nhớ tới — đúng kết quả tệ nhất mà mục này sinh ra để tránh.
2. **Không hàng nào giữ mà không có lý do và không có căn cứ.** `reason` rỗng, hoặc `keep_refs` rỗng ở hàng `keep-*`, hoặc `keep_refs` khác rỗng ở hàng `rename` — đều đỏ. Lỗi bị chặn: một hàng `keep-wire` không nêu mục §2.3 nào cho phép, tức là giữ một giá trị wire chỉ vì ai đó ghi tên nó vào bảng.
3. **Số `hits` là số thật.** Tổng `hits` mỗi `path` phải bằng tổng lượt thật. Lỗi bị chặn: một lượt không được tính vào bất kỳ hàng nào — trường hợp nguy hiểm nhất vì nó biến một quyết định "giữ" thành quyết định "không ai để ý".
4. **Sau khi đổi tên, hệ quả đúng như bảng nói.** Hàng `rename` còn 0 lượt; hàng `keep-*` còn đúng số `hits`. Lỗi bị chặn: đổi tên quá tay vào giá trị wire, hoặc bỏ sót một lượt hiển thị trong file hỗn hợp — trường hợp mà nếu cột `hits` chỉ đếm theo file thì lượt bỏ sót sẽ bị che bởi lượt giữ hợp lệ.

Ranh giới giữ được là: nếu bảng bị xoá, script phải ĐỎ; nếu bảng đầy đủ và khớp, script phải XANH. Đó là một mệnh đề đúng–sai, không phải một sự kiện. Ở đây script đọc một BẢNG DỮ LIỆU đã được duyệt — không phải mã nguồn — và khẳng định quan hệ toàn vẹn giữa bảng đó và cây. Cùng một hình thức với `scripts/fix-changelogs.ts` sẵn có của repo.

**Điều kiện bắt buộc: chứng minh cổng đỏ được trước khi báo xong.** Một cổng chưa từng đỏ không có bằng chứng là nó đang canh. Chạy ba thao tác phá hỏng có chủ đích (xoá một hàng, để trống `reason`, đổi tên token trong file `keep-wire`) và ghi lại exit code thực tế của từng cái vào PR. Nếu không làm, `gate_can_fail` của mục này là `false` và nó không được coi là đã nghiệm thu.

Về `bun test`: trên máy này bộ test bị chặn bởi native addon, nên KHÔNG đặt test runner làm cổng. Nếu muốn có một file test, `scripts/rename/check-disposition.test.ts` chỉ được thêm sau khi đã gỡ chặn, và nó phải gọi hàm export của checker chứ không tự dựng lại logic — hai bản sao của cùng một bộ kiểm là hai bộ kiểm, một bản sẽ trôi.

Nếu hồi quy, người tiêu dùng thấy: một trong bốn vi phạm trên quay lại mà không báo trước — tên hiển thị còn sót tên cũ, hoặc một giá trị wire bị đổi nhầm khiến cài đặt/extension/dashboard chi phí đang chạy hỏng mà không có lỗi nào được ném ra. Tên file test: `scripts/rename/check-disposition.ts`, và tùy chọn `scripts/rename/check-disposition.test.ts` (chỉ sau khi gỡ chặn native addon).

### Xác minh

Tất cả lệnh dưới đây đã chạy thật trên máy này, HEAD `84cbac9`, ngày 2026-09-28, và ĐÃ CHẠY LẠI Ở HEAD `1454dc0` — kết quả không đổi, vì `git diff --stat 84cbac9 HEAD` cho thấy giữa hai commit chỉ `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` thay đổi, không có file `.ts` nào đổi. Chạy TẤT CẢ từ repo root `/Users/tranquangdang21/Projects/ultraworkers` — `git grep` không có pathspec thì chỉ quét thư mục đang đứng, và chạy từ `.lavish-wip/m5-specs/` trả về 0 file.

```bash
# Số liệu nền đã kiểm chứng (dùng để đối chiếu, KHÔNG ép về số của plan)
git grep -lE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | wc -l   # → 599 (plan ghi 585)
git grep -oE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | wc -l   # → 1853 (plan ghi 1826)
git rev-parse --short HEAD   # → 1454dc0 (đo ở 84cbac9 cũng ra 599/1853)

# Đếm lại độc lập bằng perl lookaround trên đúng 599 đường dẫn
# → occurrences=1853 files_with_hits=599 (git grep -o KHÔNG đếm thiếu)

# Tách nhóm: 373 file nguồn + 226 file test
# Theo gói: coding-agent 422, ai 59, tui 47, utils 14, catalog 12, scripts 11,
#           metaharness 10, stats 6, natives 5, wire 3, browser-relay 3, omptype 2,
#           agent 2, mnemopi 1, collab-web 1, và 1 file trong root `.omp/` của chính
#           repo (`.omp/tools/tui.ts`)
# Chồng scope: 26 file có cả `omp` token lẫn `".omp"`; 11 file có cả token lẫn
#             `__omp_worker_`; 562 file không dính cái nào trong hai.
# 318 file trong 599 có từ 2 LƯỢT trở lên (đếm bằng `git grep -oE`; nếu đếm
# bằng `git grep -cE` thì là 310, vì `-cE` đếm DÒNG). File nặng nhất là
# `packages/coding-agent/test/update-cli.test.ts`: 59 lượt trên 58 dòng.
# Số ở cột `hits` phải lấy từ `-oE`, không phải từ `-cE`.
# Literal `"omp"` (đúng ba ký tự) xuất hiện trong 98 file của tập 599
# (đếm FILE, không phải lượt).

# Bẫy regex — KHÔNG dùng \b trong bất kỳ lệnh kiểm nào
git grep -cE '\bomp\b' -- packages/utils/src/dirs.ts   # → không in dòng nào, exit 1
grep -cE '\bomp\b' packages/utils/src/dirs.ts          # → 104
grep --version                                          # → grep (BSD grep, GNU compatible) 2.6.0-FreeBSD
# Biểu thức đã ghim trên cùng file → 19 dòng

# Con số plan nói sai, đã đo lại
git grep -oE '"\.omp"' -- . | wc -l    # → 280 (plan ghi 258)
git grep -lE '"\.omp"' -- . | wc -l    # → 94  (plan ghi 89)
git grep -n '__omp_worker_' -- '*.ts' ':!*test*' | wc -l   # → 30 dòng (plan ghi 28)
git grep -l '__omp_worker_' -- '*.ts' ':!*test*' | wc -l   # → 14 file (plan ghi 13)
git grep -oh '__omp_worker_[a-z_]*' -- '*.ts' | sort -u | wc -l   # → 21 chuỗi phân biệt
git grep -lE '"oh-my-pi"' -- '*.ts' | wc -l   # → 14
git grep -lE '"oh-my-pi"' -- . | wc -l       # → 16 (cộng chính file plan tự nhiễm)
git grep -lE '"\.omp"' -- 'packages/**/test/**' | wc -l   # → 61
git grep -l '__omp_worker_' -- 'packages/**/test/**' | wc -l   # → 9
# hợp nhất hai tập trên → 70 file của W11; 24 trùng với tập file test của W8b

# Gỡ chặn native addon (chỉ khi cần cổng test:ts)
command -v ninja    # → rỗng
command -v cmake    # → /opt/homebrew/bin/cmake
command -v brew     # → /opt/homebrew/bin/brew
# bun --cwd=packages/natives run build  →  CMake Error: CMake was unable to find a build
#   program corresponding to "Ninja". CMAKE_MAKE_PROGRAM is not set.  (exit 1)
```

Các neo đã mở và xác nhận đúng (dùng làm mốc khi sửa): `packages/utils/src/dirs.ts:21` (`APP_NAME`), `:24` (`APP_URL`), `:27` (`CONFIG_DIR_NAME`), `:30` (`MAIN_CONFIG_FILENAMES`), `:36` (`USER_AGENT`), `:298` (`getConfigDirName`), `:1084` (`OMP_APP_NAME` trong `getAppName()`). Cả sáu neo của plan đều đúng. `packages/coding-agent/src/cli/update-cli.ts:166,190` (`manifest.omp`) và `packages/coding-agent/src/cli/worker-selectors.ts:9-21` (8 selector hằng số) cũng đúng.

Mốc thời gian quan sát được của `bun run check:ts` lần chạy lạnh 2026-09-28: `@oh-my-pi/typescript-edit-benchmark:check:types | Done in 211.83s`, `@oh-my-pi/pi-metaharness:check:types | Done in 152.51s`, `@oh-my-pi/pi-tui:check:types | Done in 74.87s`, `@oh-my-pi/snapcompact:check:types | Done in 21.15s`.

### Cổng hoàn thành

Theo thứ tự. Cổng 0 phải xanh trước khi coi mục này là bắt đầu.

Có BỐN cổng, đánh số 0–3; cổng 3 là thông tin, không chặn merge. Dòng mở đầu mục này trước đây ghi "Ba cổng" — đã sửa thành "Bốn cổng".

**Cổng 0 — bảng quyết định đầy đủ, cân đối, và đã được một người khác duyệt.** `bun scripts/rename/check-disposition.ts --stage=pre` exit 0. Đỏ khi: thiếu hàng cho bất kỳ file nào trong tập 599; hàng trỏ tới `path` không còn tồn tại; `reason` trống; `disposition` ngoài từ vựng đóng; `hits` không khớp tổng lượt thật của file; `keep_refs` sai quy tắc theo `disposition`. Điều kiện duyệt KHÔNG làm đỏ: nếu `git log --format='%ae' -- scripts/rename/disposition.tsv` chỉ trả về MỘT địa chỉ, cổng vẫn XANH nhưng phải in cảnh báo `WARN: bảng tự duyệt — chưa có người duyệt thứ hai` ra stdout, và PR phải ghi rõ tên người đã đọc. Lý do không chặn: lịch sử git của repo chỉ có hai tác giả (`git log --format='%ae' | sort | uniq -c` → 7 `e2e@example.com`, 1 `tranquangdang21@gmail.com`) và identity đang cấu hình là `E2E`, nên điều kiện ≥2 địa chỉ sẽ đỏ VĨNH VIỄN trên máy này và W8b sẽ không bao giờ ship được phần hiển thị.

**Cổng 1 — sau khi chạy.** `bun scripts/rename/check-disposition.ts --stage=post` exit 0. Mỗi hàng `rename` còn 0 lượt; mỗi hàng `keep-*` còn đúng số lượt ở cột `hits`. Cổng này đối chiếu tập hit còn lại với `disposition` TRONG CHÍNH BẢNG, không đối chiếu với một danh sách viết tay thứ hai — vì danh sách thứ hai chính là nơi mà một `grep` sẽ "xanh" trong khi việc đổi tên đã hỏng.

**Cổng 2 — typecheck.** `bun run check:ts` exit 0. Đã xác nhận xanh.

**Cổng 3 (không chặn merge, nhưng phải báo cáo kết quả) — `bun run test:ts`.** Ghi kết quả vào PR kèm lý do nếu không chạy được. KHÔNG dùng làm điều kiện nghiệm thu khi native addon chưa build, vì khi đó nó không phân biệt được "đổi tên làm hỏng" với "hạ tầng chưa sẵn sàng" — cả hai đều ra cùng một exit 1.

**Không nằm trong cổng, nhưng bắt buộc trước khi báo xong:** chứng minh cổng đỏ được bằng ba thao tác phá hỏng có chủ đích, ghi exit code thật vào PR (`steps[10]`). Không có bước này thì `gate_can_fail` là `false`.

Cổng này **có thực sự đỏ được không:** đặc tả khai `gate_can_fail: true` và cung cấp đúng cơ chế — cả hai cổng `--stage=pre` và `--stage=post` đều in vi phạm ra stdout rồi `process.exit(1)`, nên đỏ được về mặt cấu trúc. Nhưng đó là lập luận suông khi script chưa tồn tại, và chưa có bằng chứng thực nghiệm: ba file `scripts/rename/` (`disposition.tsv`, `check-disposition.ts`, `README.md`) chưa tồn tại, nên chưa lần nào cổng từng chạy, đừng nói là từng đỏ. Cổng 2 (`bun run check:ts`) đã chạy thật và xanh. Cổng 3 đỏ sẵn vì hạ tầng, nên không dùng làm bằng chứng. Bằng chứng duy nhất được chấp nhận là ba exit code thật ở bước 10.

### Phụ thuộc

- `depends_on`: W1, W2, W3.
- `blocks`: W11.

### Cách sai dễ nhất

1. **`sed` đại trà.** Đã nêu ở phần Rủi ro chính.
2. **Rủi ro che lỗi do file hỗn hợp.** 26 file có cả lượt đổi lẫn lượt giữ, 11 file có cả token lẫn selector. Nếu cột `hits` chỉ đếm theo file, một lượt đổi bị bỏ sót sẽ bị lượt giữ hợp lệ che đi và cổng vẫn xanh. Vì vậy `hits` BẮT BUỘC tách theo lớp disposition, và cổng phải so từng hàng chứ không so từng file.
3. **Va chạm sở hữu với W11 mà plan không nói ra.** 226 trong 599 file là file test. Tập W11 (wave 5) là 70 file test, và 24 file trong số đó TRÙNG với tập của W8b. Nếu W8b đổi tên literal trong một file test mà W11 sau đó sẽ chuyển sang đọc hằng số, công việc bị làm hai lần; tệ hơn, nếu W8b đổi tên một khẳng định literal thành một giá trị sai thì W11 sẽ kế thừa cái sai đó và test vẫn xanh. Cần một thỏa thuận ghi ra bằng văn bản trước khi code — xem `open_questions[1]`.
4. **Thứ tự với W9.** W8b gán hàng selector là `keep-worker-selector` với `keep_refs=W9`, nhưng W9 ở wave 4, TẾT hơn W8b ở wave 3. 11 file chứa cả hai loại hit. Nếu hai work item này cùng bay trên cùng một file, một bên sẽ ghi đè bảng của bên kia. Bắt buộc phải rà lại bảng sau khi W9 merge (`steps[12]`).
5. **Bẫy regex của máy này.** `git grep -E` và `grep -E` không đồng ý với nhau về `\b`. Một cổng viết bằng `\b` sẽ luôn xanh. Biểu thức đã ghim ở §2.1 không có `\b` và cho 19 dòng trên `dirs.ts` — dùng đúng nó.
6. **Chi phí của việc không có ai duyệt.** Nếu quy tắc "một người duyệt không phải người viết nó" không được tổ chức, mục này không bị chặn bởi hệ thống mà bị chặn bởi sự im lặng — và kết quả là 599 quyết định do một người tự duyệt, tức là bảng quyết định trở thành một danh sách tự khai. Xem `open_questions[0]`.

### Cần người quyết

- **AI LÀ NGƯỜI DUYỆT, DUYỆT LÚC NÀO, VÀ NẾU KHÔNG CÓ AI DUYỆT THÌ MỤC NÀY CÓ BỊ CHẶN KHÔNG?** Đây là câu hỏi vận hành, và plan chỉ trả lời bằng một câu. Cụ thể: (1) AI — lịch sử git của repo này chỉ có hai tác giả, `E2E <e2e@example.com>` (7 commit) và `Tran Quang Dang <tranquangdang21@gmail.com>` (1 commit), và identity đang cấu hình là `E2E`. Vậy người duyệt là người thứ hai kia, hay chính `E2E` phải đổi identity, hay quy tắc này vô hiệu lực khi milestone chạy một mình? (2) KHI NÀO — trước khi viết dòng đầu tiên của bảng, hay sau khi viết xong? Plan nói "không duyệt thì W8b không được sửa dòng nào trong 585 file đó", nghĩa là duyệt PHẢI xảy ra trước khi sửa mã, tức là trước khi viết bảng xong — vậy người duyệt phải theo dõi tiến trình viết bảng chứ không thể duyệt một lần lúc PR mở. (3) NẾU KHÔNG CÓ AI — câu trả lời đề xuất là KHÔNG chặn, nhưng phải ghi rõ trong PR rằng bảng tự duyệt và ai đã đọc. Lý do không nên chặn cứng: W8b là mục không quy ra ngày được, chặn nó vô điều kiện vì thiếu một người có nghĩa là milestone không bao giờ ship được phần hiển thị. Nhưng đặc tả này KHÔNG tự quyết — đó là quyết định của người đứng ngoài. Cách cài đã đặt: `--stage=pre` kiểm `git log --format='%ae' -- scripts/rename/disposition.tsv` có ít nhất hai địa chỉ khác nhau hay không, và in ra cảnh báo khi chỉ có một.
- **226 TRONG 599 FILE LÀ FILE TEST, VÀ 24 FILE TRONG SỐ ĐÓ TRÙNG VỚI TẬP 70 FILE CỦA W11. AI SỞ HỮU VIỆC ĐỔI TÊN TRONG 226 FILE ĐÓ?** Plan đặt W11 ở wave 5, sau W8b, và W11 nói rõ nhiệm vụ của nó là chuyển khẳng định literal sang đọc hằng số. Nếu W8b sửa literal trước, W11 sẽ làm lại; nếu W8b bỏ qua, cổng nghiệm thu 2 của W8b sẽ không bao giờ đạt vì W11 chưa chạy. Đề xuất: W8b CHỈ gán `disposition` cho 226 file test — tức `keep-wire` cho khẳng định wire, `rename` cho khẳng định tên hiển thị — nhưng KHÔNG sửa dòng nào trong chúng; W8a/W7/W9 sửa hằng số trước, W11 mới đọc lại. Nhưng điều đó biến `hits` của 226 hàng thành con số "đã biết sẽ đổi" chứ không phải "đã đổi", và cổng `--stage=post` sẽ đỏ. Cần một quyết định bằng văn bản, không phải một quy ước ngầm.
- **BA TRONG NĂM LITERAL `APP_NAME` NHÂN BẢN LÀ HÀNG 17 CỦA §2.2, KHÔNG THUỘC W8B — NHƯNG NÓ CÙNG NẰM TRONG TẬP 599.** Cụ thể `packages/coding-agent/src/cli/commands/init-xdg.ts:5` và `packages/tui/src/desktop-notify.ts:29` khai báo `const APP_NAME = "omp"` cục bộ thay vì đọc hằng số từ `dirs.ts`, và `packages/tui/src/terminal-capabilities.ts:45` khai báo `CMUX_NOTIFICATION_TITLE = "omp"`. Nếu W8b chỉ đổi hằng số trung tâm thì ba chỗ này vẫn hiện tên cũ. W1 sở hữu chúng (theo hàng 17) — nhưng chúng nằm trong tập 599 file của W8b, nên nếu W8b đánh `rename` cho chúng thì trùng sở hữu. Đề xuất: W8b đánh `rename` và sửa luôn, vì nó đã ở trong tập; nhưng phải ghi rõ trong PR để không tính trùng. *(Ba neo dòng này ĐÃ mở và xác nhận đúng: `init-xdg.ts:5` và `desktop-notify.ts:29` khai `const APP_NAME = "omp"`, `terminal-capabilities.ts:45` khai `const CMUX_NOTIFICATION_TITLE = "omp"`; cả ba file đều nằm trong tập 599.)*
- **CỘT `hits` CHO 562 FILE "THUẦN HIỂN THỊ" CÓ NHIỀU KHẢ NĂNG LÀ 1, NHƯNG KHÔNG PHẢI LUÔN.** File không chứa `".omp"`, không chứa selector, không chứa giá trị wire nào trong bảng N thì phần lớn lượt là tên hiển thị và `hits` sẽ bằng số dòng có token. Lấy `packages/coding-agent/test/update-cli.test.ts` làm ví dụ ranh giới: trong file này, các lượt `omp/18.0.6-canary.1` (User-Agent, 59 lượt đo bằng `-oE` trên 58 dòng, gom với 26 literal `"omp"` nên dễ gộp nhầm) KHÔNG khớp biểu thức đã ghim — vì `/` và `.` nằm trong lớp loại `[^a-zA-Z0-9_./-]` trước `omp` — cũng như `".local/bin/omp"`. Cột `hits` của `scope=display-token` vì thế CHỈ đếm token có dấu phân cách thật (nháy, space, backtick, `(`); các giá trị đường dẫn/User-Agent phải được bảo vệ bằng một hàng riêng nếu cần — bằng `scope=dot-omp-literal` hoặc `keep-path`, không phải bằng `hits` của `scope=display-token`. Người viết bảng phải mở từng file và tách, không được suy ra `hits` từ `grep -c`. Đây là lý do effort là L chứ không phải M.
- **W8B VÀ W9 CÙNG CHẠM 11 FILE.** W8b gán chúng là `keep-worker-selector` với `keep_refs=W9`, W9 sẽ đổi tên selector. Nếu W9 chạy trước khi bảng W8b được duyệt, bảng sẽ mô tả một thế giới không còn tồn tại và `--stage=post` sẽ đỏ. Có nên đưa W9 vào `depends_on` của W8b không, hay giữ thứ tự wave 3 → wave 4 và chấp nhận một lần rà lại bảng? Plan nói "bảng quyết định phải được rà lại sau W9", nghe như phương án thứ hai, nhưng không nói rõ.
- **CÓ NÊN ĐƯA 599 FILE CÒN LẠI THÀNH BA NHÓM EFFORT KHÁC NHAU THAY VÌ MỘT MỤC KHÔNG?** Tập 599 gồm 422 file coding-agent, 59 ai, 47 tui và 71 file của các gói khác. Các anchor đã kiểm chứng (`dirs.ts:21,24,27,36`, `update-cli.ts:166,190`, `worker-selectors.ts:9-21`) đều tập trung ở vài chục file; 318 file có từ 2 lượt trở lên (310 file nếu đếm theo dòng). Có thể một work item riêng cho tập có `hits` nhỏ, chạy song song, sẽ rẻ hơn — nhưng khi đó bảng quyết định bị chia và cổng phải đọc nhiều tệp. Plan đã cân nhắc và chọn một mục; ghi lại vì con số 599 làm mục này lớn hơn mức "L" mà một mục duy nhất nên mang.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| §2.2 hàng 6 và toàn bộ mục W8b: "1826 lượt / 585 file `.ts` chứa token `omp` đứng riêng", và cổng 0 của W8b dùng đúng con số 585 làm kỳ vọng. | SAI Ở CẢ HAI CON SỐ. Đây là phát hiện quan trọng nhất của đặc tả này. | Tại HEAD 1454dc0: **599 file** và **1853 lượt** — nhiều hơn con số của plan lần lượt là 14 file và 27 lượt. Mọi con số trong W8b dùng 585/1826 phải đổi thành 599/1853, và cổng phải so với số đo lại chứ không so với hằng số của plan. Nguyên nhân gần như chắc chắn là cây đã trôi từ HEAD mà plan dùng (`5873776`, nhắc ở §2.3 và §2.4) sang `84cbac9` — nhưng kể cả khi đó, cột "Hành động theo" của bảng và tiêu đề của W8b đang phát ra một lệnh cụ thể cho kỹ sư, nên sai 14 file là sai một cách có hậu quả. Bằng chứng: `git -C /Users/tranquangdang21/Projects/ultraworkers grep -lE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]\|$)' -- '*.ts' \| wc -l` → 599; cùng lệnh với `-o` thay `-l` → 1853; đếm lại độc lập bằng perl lookaround trên đúng 599 đường dẫn cho `occurrences=1853 files_with_hits=599`; `git rev-parse --short HEAD` → 84cbac9 (HEAD lúc đo; số đo đã tái lập ở 1454dc0, kết quả không đổi). |
| §2.1 và mọi mục khác giả định có thể chạy lệnh đếm "từ bất kỳ đâu trong repo" và so kết quả với con số đã ghi. | BẪT THẬT, ĐÃ TÁI LẬP. Đây là bẫy âm thầm nguy hiểm nhất của toàn bộ mục này. | `git grep` KHÔNG có pathspec thì chỉ quét thư mục đang đứng. Chạy đúng biểu thức của plan từ `.lavish-wip/m5-specs/` trả về **0 file và 0 lượt** — trông y hệt một cây đã đổi tên xong sạch. Vì vậy mọi lệnh trong đặc tả này đều phải chạy từ repo root, và cổng phải từ chối chạy khi cwd không phải gốc repo thay vì im lặng trả về 0. Bằng chứng: lần chạy đầu tiên, cwd = `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/m5-specs` → 0, 0, và cả lệnh không pathspec → 0; chạy lại bằng `git -C /Users/tranquangdang21/Projects/ultraworkers ...` → 599 và 1853. |
| Cổng nghiệm thu 2 của W8b: "`bun run check && bun run test:ts`" — và phần cổng này được coi là bằng chứng rằng việc đổi tên không phá gì. | CỔNG KHÔNG ĐỎ ĐƯỢC TRÊN MÁY NÀY. Nó đỏ sẵn, trước cả khi bạn sửa một dòng nào, nên nó không phân biệt được "tôi làm hỏng" với "hạ tầng chưa sẵn sàng". | `bun run test:ts` hiện exit 1 với `3 chunks passed / 185 failed`, nguyên nhân là `Error: Failed to load pi_natives native addon for darwin-arm64` — không liên quan gì đến việc đổi tên. Đặc tả này vì vậy thay cổng này bằng hai cổng luôn chạy được: `bun scripts/rename/check-disposition.ts --stage=post` (thuần Bun, không đụng addon) và `bun run check:ts` (đã xanh). `test:ts` chỉ còn là cổng thông tin, phải báo kết quả kèm lý do nếu không chạy được, và tuyệt đối không phải điều kiện nghiệm thu. Bằng chứng: `bun run test:ts` → `Ran 188 test command(s) in 114.3s`, `3 chunks passed`, `185 failed`, `error: script "test:ts" exited with code 1`, kèm `Cannot find module '.../packages/natives/native/pi_natives.darwin-arm64.node'`; `bun --cwd=packages/natives run build` → `CMake Error: CMake was unable to find a build program corresponding to "Ninja". CMAKE_MAKE_PROGRAM is not set.`, exit 1; `command -v ninja` → rỗng; `command -v cmake` → `/opt/homebrew/bin/cmake`; `command -v brew` → `/opt/homebrew/bin/brew`. Ngược lại `bun run check:ts` → exit 0, đã chạy thật. |
| §2.2 hàng 6 và mọi cổng của M5 giả định có thể viết điều kiện chạy bằng ranh giới từ `\b`. | ĐÚNG LÀ BẪT, VÀ NÓ BIẾN MỘT CỔNG THÀNH CỔNG KHÔNG BAO GIỜ ĐỎ. Biểu thức đã ghim ở §2.1 không mắc lỗi này — nhưng bất kỳ ai viết lại cổng bằng trực giác thì mắc. | Trên máy này `git grep -E` KHÔNG hiểu `\b` là ranh giới từ; `grep -E` (BSD grep 2.6.0) thì CÓ. Nguyên nhân nằm ở bộ dịch regex của `git grep`, không phải ở phiên bản của `grep`. Cùng một mẫu trên cùng một file cho hai kết quả trái ngược. Một cổng viết bằng `git grep -E '\bomp\b'` luôn trả 0 dòng, tức luôn xanh, kể cả khi cây còn đầy tên cũ. Đặc tả này cấm `\b` và `\<` trong mọi lệnh kiểm và bắt dùng đúng biểu thức đã ghim ở §2.1. Bằng chứng: `git grep -cE '\bomp\b' -- packages/utils/src/dirs.ts` → không in dòng nào, exit 1; `grep -cE '\bomp\b' packages/utils/src/dirs.ts` → 104; `grep -cE '[[:<:]]omp' packages/utils/src/dirs.ts` → 104; biểu thức đã ghim trên cùng file → 19 dòng; `command grep --version` → `grep (BSD grep, GNU compatible) 2.6.0-FreeBSD`. |
| W8b: "Danh sách loại trừ bắt buộc: 7 mục trong `do_not_rename`" — gợi ý cả 7 vị trí wire nằm trong tập 585 file và được bảo vệ bởi biểu thức đã ghim. | SAI MỘT NỬA. 5 trên 7 vị trí khớp biểu thức; 2 vị trí không khớp. | `acp-agent.ts:656` (N5, `name: "oh-my-pi"`) và `telemetry-export-otlp.ts:51` (N7, `SERVICE_NAME = "oh-my-pi"`) là dạng TRẦN nên dòng đó không chứa token `omp` và không khớp biểu thức. Cả hai file ĐỀU nằm trong tập 599 (vì có hit khác), nên cái thật sự sai không phải "file không được bảo vệ" mà là "bảo vệ theo tên file không bảo vệ đúng dòng" — một rule dạng "loại trừ cả file" sẽ tạo cảm giác an toàn giả. Vì vậy các hàng `keep-wire` phải ghi ở mức mà cột `hits` tách được, và quy trình rà phải mở đúng dòng, không chỉ đúng file. Bằng chứng: với `E='(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]\|$)'`, kiểm `sed -n '<line>p' <file> \| grep -qE "$E"`: `packages/catalog/src/wire/codex.ts:52` MATCHES; `packages/coding-agent/src/dap/session.ts:1465` MATCHES; `packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236` MATCHES; `packages/coding-agent/src/modes/warp-events.ts:60` MATCHES; `packages/ai/src/providers/gitlab-duo-workflow.ts:2232` MATCHES; `packages/coding-agent/src/modes/acp/acp-agent.ts:656` **no-match**; `packages/coding-agent/src/telemetry-export-otlp.ts:51` **no-match**. Cả hai file vẫn có mặt trong tập 599 khi tra bằng `grep -qxF`. |
| §2.2 hàng 8 và mục W8b dùng làm số loại trừ: literal `".omp"` = 258 lượt / 89 file. | SAI. Con số thật là 280 lượt / 94 file. | Cùng lệnh, cùng cây, khác kết quả. Vì W8b dùng con số này làm tiền đề để nói "258 literal này thuộc W4/W6, không phải ở đây", sai ở đây có nghĩa là 22 lượt trong 5 file không ai nhận trách nhiệm. Bằng chứng: `git grep -oE '"\.omp"' -- . \| wc -l` → 280; `git grep -lE '"\.omp"' -- . \| wc -l` → 94. Trong riêng tập 599 file `.ts`, 26 file có literal `".omp"`. |
| W8b: "toàn bộ 28 vị trí selector của W9" là phần bắt buộc của danh sách loại trừ; §2.2 hàng 9 ghi 28 lượt / 13 file. | SAI Ở CẢ HAI CON SỐ. Lệnh nguyên bản của plan giờ cho ra 30 dòng / 14 file. | Bằng đúng lệnh của plan (`git grep -n '__omp_worker_' -- '*.ts' ':!*test*' \| wc -l`) → **30 dòng**, và `git grep -l '__omp_worker_' -- '*.ts' ':!*test*' \| wc -l` → **14 file**. Trong toàn bộ `.ts` (kể cả test) có 74 dòng; trong toàn bộ file đã track có 89 dòng. Số chuỗi selector phân biệt trong `.ts` là **21**, trong đó có hai giá trị trông như giá trị thử nghiệm (`__omp_worker_does_not_exist`, `__omp_worker_test`) và một tiền tố trần `__omp_worker_` được khẳng định nguyên văn trong `packages/utils/test/worker-host.test.ts`. Danh sách loại trừ của W8b phải ghi "30 dòng / 14 file / 21 chuỗi phân biệt" chứ không ghi 28. Bằng chứng: các lệnh `git grep` nêu trên chạy từ repo root; `git grep -oh '__omp_worker_[a-z_]*' -- '*.ts' \| sort -u \| wc -l` → 21; `packages/coding-agent/src/cli/worker-selectors.ts:9-21` chứa 8 hằng số selector (blob_broker, computer, daemon_broker, ida_host, lsp_mux, stats_activity, text_predict, terminal_output); `packages/coding-agent/src/cli.ts:182-189` chứa 8 hằng số khác (tiny_inference, stats_sync, tab, js_eval, js_eval_process, stt, tts, mnemopi_embed) — các neo này của plan ĐÚNG. |
| §2.2 hàng 2 và mục W8: literal dạng trần `"oh-my-pi"` nằm ở 15 file (14 `.ts` + `docs/provider-quirks.md`). | Gần đúng nhưng thiếu một file: 16, không phải 15. | Lệnh `git grep -lE '"oh-my-pi"' -- .` cho ra 16 file: 14 file `.ts` (khớp con số của plan) cộng `docs/provider-quirks.md` (plan đã tính) và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — chính file plan. File plan chứa `oh-my-pi` trong chính văn bản đặc tả nên nó tự nhiễm vào mọi lệnh đếm toàn repo. Đây không phải lỗi nghiêm trọng, nhưng nó có nghĩa là mọi lệnh `git grep -l ... -- .` trong M5 đang đếm thêm chính tài liệu kế hoạch, và ai chạy lại sẽ phải tự loại nó ra mà không có hướng dẫn. Bằng chứng: `git grep -lE '"oh-my-pi"' -- '*.ts' \| wc -l` → 14; `git grep -lE '"oh-my-pi"' -- . \| wc -l` → 16; `git grep -lE '"oh-my-pi"' -- . \| grep -v '\.ts$'` → `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` và `docs/provider-quirks.md`. |
| W11 (mục nghiệm thu phụ thuộc của W8b) phạm vi 68 file test, và W8b được mô tả như thể toàn bộ 585 file là việc của riêng nó. | SAI Ở CON SỐ, VÀ BỎ SÓT MỘT VA CHẠM SỞ HỮU NGUYÊN TẺ. | Tập W11 tính lại được là **70 file** (61 file có `".omp"` + 9 file có `__omp_worker_`), không phải 68. Quan trọng hơn con số: **226 trong 599 file của W8b là file test**, và **24 file trong số đó trùng với tập 70 file của W11**. Danh sách loại trừ mà W8b nêu (7 mục do_not_rename + selector + `".omp"`) không hề nhắc tới file test, trong khi 38% tập 599 là file test và W11 ở wave 5 — sau W8b. Đây là khoảng trống thật trong kế hoạch chứ không phải sai số: không ai đã nói W8b và W11 chia tay tập file test thế nào. Bằng chứng: `git grep -lE '"\.omp"' -- 'packages/**/test/**' \| wc -l` → 61; `git grep -l '__omp_worker_' -- 'packages/**/test/**' \| wc -l` → 9; hợp nhất hai tập → 70. Lọc tập 599 bằng `(^/\|(test\|tests)/\|\.test\.ts$)` → 226. `comm -12 <(tập W11) <(tập file test của W8b) \| wc -l` → 24, gồm `packages/coding-agent/test/acp-agent.test.ts`, `packages/coding-agent/test/modes/...`, `packages/utils/test/logger-contract.test.ts` và 21 file khác. 373 + 226 = 599. |
| Các neo `dirs.ts:21,24,27,30,36` và `getConfigDirName()` tại `dirs.ts:298` mà M5 dùng làm trung tâm toàn bộ việc đổi tên. | ĐÚNG TOÀN BỘ. Đã mở file và đối chiếu từng dòng. | Không cần sửa. Ghi lại ở đây vì đây là nhóm neo duy nhất của M5 còn nguyên vẹn, và vì nó là đối chứng cho các con số đã trôi ở trên: cấu trúc của cây không đổi, chỉ số lượng file khớp biểu thức đã tăng lên. Bằng chứng: `sed -n '15,40p' packages/utils/src/dirs.ts` cho dòng 21 `export const APP_NAME: string = "omp";`, dòng 24 `export const APP_URL: string = "https://omp.sh/";`, dòng 27 `export const CONFIG_DIR_NAME: string = ".omp";`, dòng 30 `export const MAIN_CONFIG_FILENAMES = ["config.yml", "config.yaml"] as const;`, dòng 36 `export const USER_AGENT = \`omp/${VERSION}\`;`. `sed -n '294,302p'` cho dòng 298 `return process.env.PI_CONFIG_DIR \|\| CONFIG_DIR_NAME;`. Ngoài ra `dirs.ts:1084` là `const value = process.env.OMP_APP_NAME?.trim();` trong `getAppName()`. |
| Giao việc bàn giao: "`bun run check:ts` chạy được: exit 0 sau ~29 giây trên máy rảnh". | Exit 0 thì đúng, con số 29 giây thì SAI trong lần chạy lạnh. (Lỗi này nằm ở giao việc bàn giao, không phải trong plan.) | Lần chạy lạnh ngày 2026-09-28 cho thấy riêng gói `typescript-edit-benchmark` đã mất 211.83s và `pi-metaharness` 152.51s. Khoảng 29 giây chỉ đúng khi bộ nhớ đệm kiểu của từng gói đã ấm. Kỹ sư chạy lần đầu và thấy lệnh còn chạy sau vài phút sẽ tưởng treo và giết nhầm. Bằng chứng: `bun run check:ts` → exit 0 với các dòng `@oh-my-pi/typescript-edit-benchmark:check:types \| Done in 211.83s`, `@oh-my-pi/pi-metaharness:check:types \| Done in 152.51s`, `@oh-my-pi/pi-tui:check:types \| Done in 74.87s`, `@oh-my-pi/snapcompact:check:types \| Done in 21.15s`. |

## Cần người xác nhận

Một chỗ trong đặc tả tự mâu thuẫn với chính nó. Không tự sửa ở trên.

1. **`hits` của hai hàng `keep-wire` không khớp quy tắc `hits` phải là số nguyên dương.** Bước 4 bắt ghi `packages/coding-agent/src/modes/acp/acp-agent.ts:656` và `packages/coding-agent/src/telemetry-export-otlp.ts:51` thành hàng `keep-wire`, nhưng đặc tả đã chứng minh hai dòng đó **no-match** với biểu thức đã ghim. Đồng thời phần Hình dạng code nói `hits` được đếm bằng đúng biểu thức đó, và chế độ `--stage=pre` đỏ khi "`hits` không phải số nguyên dương". Với hai hàng này, số lượt tính được bằng biểu thức là 0, nên `hits` không thể vừa là số nguyên dương vừa là số thật mà vẫn giữ được bất biến "tổng `hits` mỗi `path` bằng tổng lượt thật của file đó". Cần một quy tắc riêng — ví dụ cho phép `hits = 0` khi `keep_refs` trỏ tới một vị trí dạng trần không khớp biểu thức, hoặc một cột đếm riêng — trước khi viết checker.


---


## W9. Tên binary và 13 file khai báo tên của nó (sóng 4)

**Sóng:** Wave 4

**Effort:** M (không phải S). Đo được: 17 file nguồn + 9 file test + 3 file tài liệu = 29 file. Nhưng phần tốn kém KHÔNG phải số dòng — mà là (a) 5 cặp hằng số selector trùng lặp phải gộp về một nguồn, (b) 3 literal thô phải chuyển thành hằng số dẫn xuất, (c) quyết định đóng băng vs đổi cho marker profile-alias và tên file `omp-profiles.fish`, (d) một ca test parity mới. Con số `E` (nhỏ) trong kế hoạch cũ là do đếm thiếu 1 file comment, thiếu 1 hằng số, và 4 dòng profile-alias không được liệt kê.

**Rủi ro chính:** Xem "Cách sai dễ nhất" bên dưới — bốn lớp, tăng dần: (1) sai thứ tự khiến worker không dispatch mà không có lỗi nào; (2) pháp lý rc khi đổi chuỗi marker trong file rc của người dùng; (3) tên file sinh ra trong `conf.d`; (4) bỏ sót chỗ mà không ai thấy. Lớp (2) là lớp mà kế hoạch cũ không nhắc tới.

**Một câu:** Đổi tên lệnh cài vào PATH từ `omp` sang tên mới ở cả ba khai báo bin, và làm selector worker `__omp_worker_*` dẫn xuất từ MỘT hằng số tiền tố duy nhất để **16** loại selector không thể bị bỏ sót — sau đó khoá bằng một ca test parity chạy được ngay cả khi addon native chưa build.

**Hiệu ứng người dùng thấy:** Người dùng cài bản mới gõ tên mới (`ultraworkers ...`) thay vì `omp ...`; lệnh cũ biến mất khỏi PATH sau khi gói npm cài lại. Script shell completion phát ra tên mới ở mọi shell (bash/zsh/fish) — phần này tự động đúng vì nó đọc `APP_NAME`. Profile alias (`omp --profile=X`) trỏ sang tên mới, nhưng chốt chặn tên alias che binary mới phải có nhánh thứ hai, và KHÔNG được đổi marker `# >>> omp profile alias:` trong file rc của người dùng — đó là cơ chế tương thích đọc ngược. Mọi worker (tab, stats sync, JS eval, STT/TTS, embed, tiny, browser, computer, blob/daemon/LSP/IDA broker, text predict, terminal output) vẫn khởi động dưới tên mới hoặc im lặng không chạy — đây là loại hỏng không báo lỗi mà W9 chính là để chặn.

### File cần chạm tới

Cột "đã kiểm chứng" nói đúng mức độ kiểm chứng trong đặc tả: **Có** = đã đọc trực tiếp file nguồn và dòng khớp; **Không** = chưa có gì để kiểm chứng (file chưa tồn tại) hoặc đặc tả không gắn cờ kiểm chứng cho vị trí đó.

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/src/worker-host.ts` | sửa | Dòng 4: `export const WORKER_HOST_SELECTOR_PREFIX = "__omp_worker_"` → tên mới. Đây là dòng DUY NHẤT trong repo phải chứa chuỗi thương hiệu của selector. | Có (đã đọc; `:4` khớp 100%). Cơ chế `isWorkerHostSelector()` ở `:7-9` là cổng dispatch duy nhất, dùng ở `cli.ts:545`, `cli.ts:31`, `tools/computer/worker-entry.ts:37`. Đường import: `@oh-my-pi/pi-utils/worker-host`. |
| `packages/coding-agent/src/cli/worker-selectors.ts` | sửa | 8 hằng số ở `:9,11,13,15,17,19,21,23` chuyển từ ghim cứng sang dựng từ `WORKER_HOST_SELECTOR_PREFIX`. | Có (đã đọc cả 23 dòng). **SAI SO VỚI PLAN:** plan liệt kê 7 dòng, thật là 8 — thiếu `:23 TEXT_PREDICT_WORKER_ARG`. 8 protocol module re-export từ đây: `blob-broker/protocol.ts:11`, `ida/protocol.ts:11`, `launch/protocol.ts:11`, `launch/terminal-output-worker-protocol.ts:3`, `lsp/mux/protocol.ts:13`, `predict/protocol.ts:12`, `stats/activity-protocol.ts:13`, `tools/computer/protocol.ts:4`. |
| `packages/coding-agent/src/cli.ts` | sửa | `:42` thêm import 5 selector đã export ở file khác; `:182-189` xoá 5 khai báo trùng (`TINY_WORKER_ARG`, `JS_EVAL_PROCESS_ARG`, `STT_WORKER_ARG`, `TTS_WORKER_ARG`, `MNEMOPI_EMBED_WORKER_ARG`) và thay 3 hằng còn lại (STATS_SYNC, TAB, JS_EVAL) bằng dạng dựng từ tiền tố. `runWorkerEntrypoint()` giữ nguyên logic. | Có. **SAI DÒNG so với plan** (plan ghi 179-186, thật là 182-189). Đã xác nhận bằng awk rằng `runWorkerEntrypoint` so sánh ĐỦ 16 hằng, nên xoá 5 dòng mà không sửa nhánh `if` nào là an toàn. **CẢNH BÁO:** `cli.ts:31` đang import `isWorkerHostSelector` từ `@oh-my-pi/pi-utils/worker-host` — thêm `WORKER_HOST_SELECTOR_PREFIX` vào cùng import đó, đừng tạo import thứ hai. |
| `packages/coding-agent/src/stt/asr-client.ts` | sửa | `:72` bỏ khai báo cục bộ, dùng chung hằng số từ một nguồn. | Có. **SAI DÒNG:** plan ghi `:71`, thật là `:72`. Dùng ở `:80` (`resolveWorkerSpawnCmd(STT_WORKER_ARG)`); `cli.ts:187` giữ bản trùng và dùng ở `:258`. Hai chuỗi chỉ khớp nhau vì BẰNG NHAU, không phải vì cùng tham chiếu. |
| `packages/coding-agent/src/tts/tts-client.ts` | sửa | `:135` bỏ khai báo cục bộ, dùng chung nguồn. | Có. **SAI DÒNG:** plan ghi `:134`, thật là `:135`. Bản trùng ở `cli.ts:188`. |
| `packages/coding-agent/src/mnemopi/embed-client.ts` | sửa | `:38` bỏ khai báo cục bộ; `:122` là dòng comment tham chiếu selector. | Có. **SAI DÒNG HAI CHỖ:** plan ghi `:35` cho khai báo (thật `:38`) và `:119` cho comment (thật `:122`). Bản trùng ở `cli.ts:189`. |
| `packages/coding-agent/src/tiny/title-protocol.ts` | sửa | `:20` dùng nguồn chung. | Có. `:20` khớp plan 100% (một trong hai dòng plan ghim đúng). Bản trùng ở `cli.ts:182`. |
| `packages/coding-agent/src/eval/js/context-manager.ts` | sửa | `:130` dùng nguồn chung cho `JS_EVAL_PROCESS_ARG`; `:1010` literal thô `argv: ["__omp_worker_js_eval"]` thay bằng hằng `JS_EVAL_WORKER_ARG`. | Có. Cả hai dòng plan ghi đều ĐÚNG. `:1010` là một trong BA literal thô — nằm ngoài tầm với của đổi `WORKER_HOST_SELECTOR_PREFIX`, và là nơi hỏng im lặng. Lưu ý vòng import: `context-manager.ts` không được import từ `cli.ts` (ngược chiều), nên dựng `JS_EVAL_WORKER_ARG` trong `worker-selectors.ts` và cả hai cùng import. |
| `packages/coding-agent/src/tools/browser/tab-supervisor.ts` | sửa | `:1615` literal thô `argv: ["__omp_worker_tab"]` thay bằng hằng. | Có. `:1615` khớp plan 100%. `tab` là selector DUY NHẤT không có lời gọi smoke nào. |
| `packages/stats/src/aggregator.ts` | sửa | `:130` literal thô `argv: ["__omp_worker_stats_sync"]` dựng từ `WORKER_HOST_SELECTOR_PREFIX` thay vì ghim chuỗi. | Có. `:130` khớp plan 100%. **QUAN TRỌNG:** `packages/stats` KHÔNG được phụ thuộc `pi-coding-agent` (docblock `:121-125`: zero runtime dependency), nên KHÔNG import hằng số từ `cli.ts` — phải import `WORKER_HOST_SELECTOR_PREFIX` từ `@oh-my-pi/pi-utils/worker-host`, đúng như `workerHostEntry` đã được import ở đây. Đây cũng là selector mà `smokeTestSyncWorker` (`:193-194`) BỎ QUA trên darwin. |
| `scripts/ci-release-publish.ts` | sửa | `:186` `publishBin: { omp: "dist/cli.js" }` → `publishBin: { "<tên-mới>": "dist/cli.js" }`. | Có. **SAI DÒNG:** plan ghi `:165`, thật là `:186` (lệch 21). Đây là bản đồ npm thật sự dùng để cài vào PATH — dòng 165 là `{ dir: "packages/omptype", ... }`, không liên quan. KHÔNG ĐỔI `:436` (`omp-pack-` là tiền tố thư mục tạm trong `os.tmpdir`). Sửa xong phải xác nhận `resolvePublishedManifest` (`:243`, `:301`) vẫn ghi đúng `bin`. |
| `packages/coding-agent/package.json` | sửa | `:28` `"omp": "src/cli.ts"` → `"<tên-mới>": "src/cli.ts"`. | Có. `:28` khớp plan 100%. KHÔNG ĐỔI `:13` (`"homepage": "https://omp.sh"` — N9 chặn tới khi có domain mới) và `:538` (`"@oh-my-pi/omp-stats"` — N17 giữ basename, W7 đổi scope). Cả ba cùng nằm trong một file, nên đây là nơi dễ xảo nhất của W9. |
| `packages/coding-agent/src/task/omp-command.ts` | sửa | `:11` `const DEFAULT_CMD = process.platform === "win32" ? "omp.cmd" : "omp"` → suy ra từ `APP_NAME` (phương án (b) của Cần người quyết, mục 1). `:15` `PI_SUBPROCESS_CMD` GIỮ NGUYÊN. | Có (đã đọc cả 26 dòng). `:11` và `:15` đều khớp plan 100%. Giữ `PI_SUBPROCESS_CMD` là bắt buộc: N16 đóng băng họ tiền tố `PI_*`/`OMP_*` VĨNH VIỄN làm bí danh tương thích. `DEFAULT_CMD` chỉ được tới khi `argv[1]` KHÔNG phải `.ts`/`.js` (`:21-23`), tức chỉ trong trường hợp compiled binary. |
| `packages/coding-agent/src/subprocess/worker-client.ts` | sửa | `:131` `$which("omp", ...)` → dùng `APP_NAME`. Tùy chọn: `:130` comment và `:384` `"omp-worker-stderr-"` (tên thư mục tạm). | Có (đã đọc `:120-140`). **SAI DÒNG:** plan ghi `:132`, thật `:131`; `:132` là `];`. KHÔNG ĐỔI `:203` (comment về `~/.omp/agent/cache` — đó là `CONFIG_DIR_NAME`, chỉ W6 mới lật) và `:548` (comment `--smoke-test`). `resolveWorkerSpawnCmd` ở `:169-178` chỉ chuyển tiếp chuỗi, không cần sửa. |
| `packages/coding-agent/src/cli/profile-alias.ts` | sửa | **TÁCH HAI LỚP.** ĐỔI: `:30-33` `DEFAULT_ALIAS_COMMAND` (4 giá trị) + `:157-158` chốt chặn (thêm nhánh cho tên mới, giữ nhánh cũ) + `:292` `--wraps omp`. ĐÓNG BĂNG: `:268` tên file `omp-profiles.fish` và `:286-287`/`:309-310` marker `# >>> omp profile alias:`. | Có (đã đọc `:20-45`, `:145-175`, `:200-330`). File có **13** token `omp` đứng riêng, không phải 6 dòng như plan liệt kê. Plan ĐÚNG về `:30-33` và `:157-158`, và ĐÚNG khi nói chốt chặn cần nhánh thứ hai. Plan BỎ SÓT 4 vị trí: `:268`, `:286-287`, `:309-310`, `:292`. |
| `packages/coding-agent/src/cli/completion-gen.ts` | sửa (tuỳ chọn) | KHÔNG CẦN SỬA ĐỂ ĐỔI TÊN LỆNH — tên binary đến từ `APP_NAME` qua `commands/completions.ts:29`. 29 token `_omp_*` còn lại là tuỳ chọn thẩm mỹ. | Có (đã đọc `:115-165`, `:183-305`, `:364-455`, `:468-554` và `commands/completions.ts` đầy đủ). Số 109 trong plan là đếm substring thô: 58/109 nằm trong `completion`/`complete`. Số thương hiệu thật là **29**. |
| `AGENTS.md` | sửa | 5 lượt `__omp_worker_` ở dòng 52 và 57 (khối "Worker scripts"), và SỬA LẠI CÂU SAI Ở dòng 62 về độ phủ của `--smoke-test`. | Có. Đây là **nguồn gốc** của con số "2/15" mà kế hoạch lặp lại 4 lần: dòng 62 viết "`omp --smoke-test` spawns the stats sync worker and the tiny-model subprocess". Code thật (`cli.ts:151-179`) gọi 14 `smokeTest*`. Sửa câu này là bắt buộc, không phải tuỳ chọn. |
| `packages/coding-agent/DEVELOPMENT.md` | sửa | Dòng 52: `` dispatches the hidden `__omp_worker_*` argv selectors ``. | Có (1 lượt, đã grep). Cần đồng bộ với AGENTS.md. |
| `docs/tools/ida.md` | sửa | Dòng 14: `__omp_worker_ida_host` trong mô tả daemon. Còn lại trên dòng đó là `omp.ida.<id>` — xem Cần người quyết mục 4, KHÔNG đổi trong W9. | Có (1 lượt, đã grep). `omp.ida.<id>` là tên daemon/socket chưa có mặt trong danh sách N4 của §2.3. |
| `packages/coding-agent/test/worker-selector-parity.test.ts` | **tạo** | Ca test parity mới — hợp đồng 1 và 2. File quan trọng nhất của W9. | Không — file chưa tồn tại, không có gì để kiểm chứng. KHÔNG có trong kế hoạch cũ. |
| `crates/pi-natives/src/utok/claude/testdata/fixtures.json` | **KHÔNG SỬA** | Ghi vào danh sách loại trừ bắt buộc cho mọi lệnh sed của W9. | Có (5 lượt, đã grep) — tất cả nằm trong trường `"text"` của snapshot tokenizer tại dòng 2919 (nguyên văn AGENTS.md). KHÔNG phải mã. `src/utok/claude/mod.rs` và `src/utok/tests/claude.rs` dùng nó. Đổi nội dung là đổi điều kiện thử của tokenizer, không phải đổi sản phẩm. Kế hoạch không nhắc file này ở đâu cả. |
| `packages/coding-agent/src/cli/update-cli.ts` | **KHÔNG SỬA** | Ghi nhận `:1135`: `if (packageNames.size === 0 && !path.basename(cacheDir).toLowerCase().includes("omp")) return undefined;`. | Có (đã đọc `:1130-1140`). Heuristic phân loại cài đặt DỰA TRÊN TÊN đường dẫn — đổi tên bin làm nó lệch. Ngoài W9 (thuộc W10/W12), nhưng phải biết trước khi ai đó chạy sed toàn repo. `:551`, `:1588`, `:1639` chỉ là comment/docblock. |
| `packages/stats/package.json` | **KHÔNG SỬA** (chờ quyết định) | Ghi nhận `:27` khai báo `"bin": { "omp-stats": "./src/index.ts" }`. | Có (đọc bằng `node` qua `p.bin`). Đây là tên lệnh thứ TƯ cài vào PATH; kế hoạch không nhắc. N17 giữ BASENAME gói (`@ultraworkers/omp-stats`) nhưng KHÔNG nói gì về tên BIN. |
| `packages/stats/CHANGELOG.md` | **KHÔNG SỬA** | 1 lượt `__omp_worker_` nằm trong mục đã phát hành. | Có (1 lượt, đã grep). Các phần đã phát hành là bất biến. |

### Các bước

1. **CHỐT BA CÂU HỎI TRƯỚC KHI VIẾT DÒNG NÀY**, vì cả ba đều thay đổi hình dạng của diff chứ không phải nội dung của nó. (a) Tên bin mới là gì, và `DEFAULT_CMD` ở `packages/coding-agent/src/task/omp-command.ts:11` có suy ra từ `APP_NAME` không (Cần người quyết mục 1)? (b) Marker `# >>> omp profile alias:` và tên file `omp-profiles.fish` đóng băng hay đổi (mục 2)? (c) `omp-stats` có thuộc W9 không (mục 3)? Viết lại danh sách loại trừ của riêng W9 vào đâu đó đọc được trước khi chạy lệnh hàng loạt ở bước 3. *(neo: `packages/coding-agent/src/cli/profile-alias.ts:286`)*

2. **CHỤP BASELINE TRƯỚC KHI SỬA GÌ.** Chạy đúng ba lệnh này và lưu kết quả vào `/tmp`: (1) `git grep -o '__omp_worker_' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` — baseline đã đo là **97**; (2) `git grep -l '__omp_worker_' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` — baseline là **28**; (3) `git grep -o '__omp_worker_[a-z_]*' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | sort -u | wc -l` — baseline là **21** (16 selector thật + 5 sentinel test). Mục đích: sau khi sửa, chạy lại và so với baseline để chứng minh mình đã quét ĐÚNG phạm vi. Một lệnh chạy trên 28 file là việc không hoàn tác được nếu sai — và sai là mất tiền, không phải mất thời gian. *(neo: `packages/utils/src/worker-host.ts:4`)*

3. **ĐỔI HÀNG SỐ NHỎN, KHÔNG ĐỤNG VÀO TEST.** Cùng một lần sửa: `WORKER_HOST_SELECTOR_PREFIX` (`worker-host.ts:4`); 8 hằng ở `worker-selectors.ts:9,11,13,15,17,19,21,23`; 3 hằng còn lại ở `cli.ts` (STATS_SYNC/TAB/JS_EVAL); ba khai báo bin (`ci-release-publish.ts:186`, `package.json:28`, `omp-command.ts:11`); `worker-client.ts:131`; `profile-alias.ts:30-33` và `:157-158`. **TUYỆT ĐỐI KHÔNG chạy sed toàn repo trên `__omp_worker_`** — lệnh đó sẽ bắt luôn `fixtures.json` của tokenizer (5 lượt), `worker-core.test.ts` (30 lượt, tên thuộc tính `globalThis`), `executable-fallback.test.ts` (8 lượt, argv tùy ý) và ba docblock issue-repro. Đây là 44 lượt không nên đổi trong tổng số 97. *(neo: `packages/utils/src/worker-host.ts:4`)*

4. **XOÁ 5 KHAI BÁO TRÙNG, KHÔNG PHẢI CHỈ ĐỔI TÊN.** Ở `cli.ts`, xoá `:182 TINY_WORKER_ARG`, `:186 JS_EVAL_PROCESS_ARG`, `:187 STT_WORKER_ARG`, `:188 TTS_WORKER_ARG`, `:189 MNEMOPI_EMBED_WORKER_ARG` và thay bằng import từ `./tiny/title-protocol`, `./eval/js/context-manager`, `./stt/asr-client`, `./tts/tts-client`, `./mnemopi/embed-client`. Ở 5 file kia, xoá dòng `export const ..._ARG = "..."` và import lại hằng số từ một nguồn chung. Bắt buộc để `runWorkerEntrypoint()` (`:191+`) không sửa một nhánh `if` nào — nó sẽ tự dùng đúng 16 tên qua scope. Sau bước này, `git grep -c '__omp_worker_' -- packages/coding-agent/src/cli.ts` phải trả **0**. *(neo: `packages/coding-agent/src/cli.ts:42`)*

5. **XOÁ BA LITERAL THÔ.** Đây là ba chỗ mà bước 3 KHÔNG chạm tới, và là nơi hỏng im lặng — đổi tiền tố mà bỏ sót chúng thì worker không khởi động và không có lỗi nào. (1) `packages/coding-agent/src/eval/js/context-manager.ts:1010` `argv: ["__omp_worker_js_eval"]` → hằng. (2) `packages/coding-agent/src/tools/browser/tab-supervisor.ts:1615` `argv: ["__omp_worker_tab"]` → hằng. (3) `packages/stats/src/aggregator.ts:130` → dựng từ `WORKER_HOST_SELECTOR_PREFIX`. Với (3), KHÔNG import hằng số từ `cli.ts`: `packages/stats` cam kết zero runtime dependency lên `pi-coding-agent` (docblock `aggregator.ts:121-125`). Chỉ khi xong khi `git grep -n '__omp_worker_' -- 'packages/**/*.ts' ':!*test*' | grep -v '^\S*: *\*'` không còn kết quả nào ngoài comment. *(neo: `packages/stats/src/aggregator.ts:130`)*

6. **CẬP NHẬT 5 DÒNG COMMENT ĐANG MÔ TẢ SELECTOR CŨ.** `packages/coding-agent/src/mnemopi/embed-client.ts:122`, `packages/coding-agent/src/cli/blob-broker/server.ts:2`, `packages/coding-agent/src/mnemopi/embed-worker.ts:4`, `packages/coding-agent/src/stats/activity-worker.ts:4`, `packages/coding-agent/src/predict/daemon.ts:3`. Riêng `predict/daemon.ts:3` không có trong kế hoạch cũ. Chúng không làm hỏng gì nếu bỏ sót, nhưng chúng là tài liệu cho người đọc tiếp theo và W9 đã chạm file đó rồi. *(neo: `packages/coding-agent/src/predict/daemon.ts:3`)*

7. **VIẾT CA TEST PARITY MỚI, RỒI CHỨNG MINH NÓ ĐỎ TRƯỚC.** Tạo `packages/coding-agent/test/worker-selector-parity.test.ts` theo khối code ở mục "Hình dạng code", bước 9. Sau khi viết xong, **CHỨNG MINH HÀNG ÂM SỐNG**: tạm đổi `WORKER_HOST_SELECTOR_PREFIX` về `"__omp_worker_"`, chạy test, nó phải ĐỎ; đổi lại tên mới, phải XANH. Chưa làm bước chứng minh này thì chưa được tính là có test — một test xanh ngay lần chạy đầu không chứng minh nó bảo vệ được thứ gì. *(neo: `packages/coding-agent/test/worker-selector.test.ts`)*

8. **CẬP NHẬT HAI FILE TEST ĐANG GIM CHỮ CŨ, CỦA RIÊNG W9.** `packages/utils/test/worker-host.test.ts:24-26` (3 khẳng định) và `packages/coding-agent/test/profile-alias.test.ts` (nhiều khẳng định `omp`, `omp-profiles.fish`, `--wraps omp`). Thêm hai ca chốt chặn alias: tên bằng đúng tên lệnh mới bị TỪ CHỐI, và tên gần giống được CHẤP NHẬN — ca thứ hai mới phân biệt được chốt chặn thật với một chuỗi hardcode. Nếu đã chốt đóng băng marker, thêm ca thứ tư: file rc đã có block marker CŨ thì sau `installProfileAlias` phải còn ĐÚNG MỘT block, không phải hai. *(neo: `packages/utils/test/worker-host.test.ts:24`)*

9. **CHỐT LẠI DANH SÁCH KHÔNG ĐỔI, TÁCH KHỎI PHẠM VI.** Ghi rõ bằng văn bản trong PR: 44 lượt trong 5 file test (`test/eval/worker-core.test.ts` 30, `test/executable-fallback.test.ts` 8, `test/worker-selector.test.ts` 2 × `__omp_worker_does_not_exist`, `test/issue-*-repro.test.ts` 3 docblock, `test/fixtures/computer-worker-cli-selector.ts` 1, `test/eval/process-entry-import.test.ts` 1) và 5 lượt trong `crates/pi-natives/src/utok/claude/testdata/fixtures.json` là **CỐ Ý GIỮ**, không phải sót. `__omp_worker_does_not_exist` phải giữ nguyên — nó CỐ Ý sai; đổi nó thành tên mới sẽ biến ca "unknown selector" thành ca "selector hợp lệ" và làm hỏng đúng thứ nó đang bảo vệ. *(neo: `packages/coding-agent/test/eval/worker-core.test.ts:105`)*

10. **SỬA TÀI LIỆU, BAO GỒM CÂU SAI ĐÃ TRUYỀN SAI CON SỐ.** `AGENTS.md:52,57` (5 lượt selector) và `AGENTS.md:62` — câu "`omp --smoke-test` spawns the stats sync worker and the tiny-model subprocess" MÔ TẢ MỘT BẢN CŨ và là nguồn gốc của con số "2/15" mà kế hoạch lặp lại 4 lần. Sửa nó thành con số thật: 14 lời gọi smoke, phủ 13/16 selector trên darwin (thiếu `stats_sync` vì `aggregator.ts:194` return sớm trên macOS) và 14/16 trên Linux. `packages/coding-agent/DEVELOPMENT.md:52`, `docs/tools/ida.md:14`. KHÔNG thêm mục changelog ở bất kỳ package nào trừ khi được yêu cầu tường minh. *(neo: `AGENTS.md:62`)*

11. **CHẠY CỔNG 1 VÀ CỔNG 2 — HAI CỔNG NÀY CHẠY ĐƯỢC NGAY, KHÔNG CẦN BUILD GÌ.** `bun run check:ts` (đã đo: exit 0, package chậm nhất 39.85s) rồi `bun test packages/utils/test/worker-host.test.ts` (đã đo 4 pass) rồi `cd packages/coding-agent && bun test test/profile-alias.test.ts` (đã đo 23 pass). Nếu một trong hai file test này ĐỎ, đó là hậu quả thật của diff W9 — phân biệt được ngay, không cần đoán. *(neo: `package.json`)*

12. **CHUẨN BỊ CỔNG 3 — XỬ LÝ ĐÚNG MỘT SỰ VỤ.** `bun test` KHÔNG bị chặn toàn cục như người ta tưởng: chỉ `test/worker-selector.test.ts` đỏ, vì nó import `@oh-my-pi/pi-utils/procmgr` kéo addon native. Trên máy đo, `which ninja` không có và `bun --cwd=packages/natives run build` FAIL với `CMake was unable to find a build program corresponding to Ninja`. Vì vậy: `brew install ninja` TRƯỚC, rồi `bun --cwd=packages/natives run build`, và CHỈ KHI LỆNH BUILD EXIT 0 mới chạy tiếp cổng 3. Nếu build fail, dừng và báo `PRECONDITION FAILED — chưa build được addon`, KHÔNG báo "test failed". Đây là chỗ dễ nhất để một người đọc tưởng W9 làm hỏng trong khi thật ra máy chưa sẵn sàng. *(neo: `packages/coding-agent/test/worker-selector.test.ts:3`)*

13. **CHẠY CỔNG 3 VÀ CỔNG 4.** Cổng 3 (cần build): `cd packages/coding-agent && bun test test/worker-selector.test.ts test/worker-selector-parity.test.ts`. Cổng 4: `bun run ci:test:smoke` (`package.json:123` = `bun .../cli.ts --version && --help && stats --help && --smoke-test`). Với cổng 4, khi viết báo cáo phải ghi rõ độ phủ: 13/16 trên darwin. KHÔNG được viết "smoke xanh nghĩa là selector đã đúng" — `stats_sync` là literal thô khó chạm nhất và smoke không bao giờ chạm tới nó trên macOS. Nếu CI Linux khả dụng, chạy lại cổng 4 ở đó để đóng nốt 14/16. *(neo: `package.json:123`)*

14. **SO VỚI BASELINE CỦA BƯỚC 2 VÀ VIẾT KẾT QUẢ ĐO.** Chạy lại ba lệnh baseline. Kỳ vọng: file chứa `__omp_worker_` giảm từ 28 xuống còn khoảng 15-16 (mọi file nguồn hết, giữ lại 5 file sentinel test + `fixtures.json` + CHANGELOG + AGENTS/DEVELOPMENT/ida.md tuỳ quyết định tài liệu), và lượt giảm từ 97 xuống khoảng 45-50 (97 trừ 25 literal nguồn trừ 5 comment nguồn, giữ nguyên 44 lượt test-sentinel + 5 fixtures + tài liệu). Nếu số lượt giảm nhiều hơn ~30 so với dự kiến, hãy dừng và soi lại — nghĩa là đã quét vào thứ không nên quét. Ghi bảng số vào PR kèm câu "20 lượt còn lại phải khớp đúng danh sách, không phải zero hit". *(neo: kế hoạch tổng, dòng 13889)*

### Hình dạng code

Đây là **hình thức đích**, không phải bản vá tối thiểu. Lý do: tên binary và tiền tố selector đều chỉ là HẰNG SỐ. Nếu mỗi hằng số tự ghi chuỗi thương hiệu, thì "quên một chỗ" là một lớp lỗi, và lớp lỗi đó im lặng. Dạng dưới đây làm lớp lỗi bất khả thi.

```typescript
// =====================================================================
// HÌNH THỨC ĐÍCH — không phải bản vá tối thiểu.
//
// Lý do: tên binary và tiền tố selector đều chỉ là HẰNG SỐ. Nếu
// mỗi hằng số tự ghi chuỗi thương hiệu, thì "quên một chỗ" là một lớp
// lỗi, và lớp lỗi đó im lặng. Dạng dưới đây làm lớp lỗi bất khả thi.
// =====================================================================

// ---- 1. packages/utils/src/worker-host.ts :4 ----
// Nguồn duy nhất. Đổi đúng dòng này.
export const WORKER_HOST_SELECTOR_PREFIX = "__<tên-mới>_worker_";

// ---- 2. packages/coding-agent/src/cli/worker-selectors.ts ----
// 8 hằng số, đổi từ ghim cứng sang dựng từ hằng số tiền tố.
// Đường import đã có sẵn: "@oh-my-pi/pi-utils/worker-host"
import { WORKER_HOST_SELECTOR_PREFIX } from "@oh-my-pi/pi-utils/worker-host";

export const BLOB_BROKER_WORKER_ARG     = `${WORKER_HOST_SELECTOR_PREFIX}blob_broker`;      // :9
export const COMPUTER_WORKER_ARG        = `${WORKER_HOST_SELECTOR_PREFIX}computer`;         // :11
export const DAEMON_BROKER_WORKER_ARG   = `${WORKER_HOST_SELECTOR_PREFIX}daemon_broker`;    // :13
export const IDA_HOST_WORKER_ARG        = `${WORKER_HOST_SELECTOR_PREFIX}ida_host`;         // :15
export const LSP_MUX_WORKER_ARG         = `${WORKER_HOST_SELECTOR_PREFIX}lsp_mux`;          // :17
export const STATS_ACTIVITY_WORKER_ARG  = `${WORKER_HOST_SELECTOR_PREFIX}stats_activity`;   // :19
export const TEXT_PREDICT_WORKER_ARG    = `${WORKER_HOST_SELECTOR_PREFIX}text_predict`;     // :21
export const TERMINAL_OUTPUT_WORKER_ARG = `${WORKER_HOST_SELECTOR_PREFIX}terminal_output`;  // :23

// ---- 3. packages/coding-agent/src/cli.ts :42 (import) và :182-189 ----
// 5 hằng trùng lặp ở đây phải BIẾT MẤT, không phải chỉ đổi tên.
// asr-client.ts / tts-client.ts / embed-client.ts / title-protocol.ts /
// context-manager.ts đã export bản của chúng rồi — nhập vào, đừng khai lại.
import {
	BLOB_BROKER_WORKER_ARG,
	COMPUTER_WORKER_ARG,
	DAEMON_BROKER_WORKER_ARG,
	IDA_HOST_WORKER_ARG,
	LSP_MUX_WORKER_ARG,
	STATS_ACTIVITY_WORKER_ARG,
	TERMINAL_OUTPUT_WORKER_ARG,
	TEXT_PREDICT_WORKER_ARG,
} from "./cli/worker-selectors";                                   // :36-44 (đã có)
import { STT_WORKER_ARG } from "./stt/asr-client";                  // THÊM
import { TTS_WORKER_ARG } from "./tts/tts-client";                  // THÊM
import { MNEMOPI_EMBED_WORKER_ARG } from "./mnemopi/embed-client";  // THÊM
import { TINY_WORKER_ARG } from "./tiny/title-protocol";            // THÊM
// KHÔNG import JS_EVAL_PROCESS_ARG: nó là `const` trần ở eval/js/context-manager.ts:130, KHÔNG có `export`.
// Dùng giá trị chuỗi trực tiếp, và giữ nó khớp cli.ts:186 — đây là cùng một hằng, nếu lệch thì selector hỏng.

const STATS_SYNC_WORKER_ARG = `${WORKER_HOST_SELECTOR_PREFIX}stats_sync`;  // :183
const TAB_WORKER_ARG       = `${WORKER_HOST_SELECTOR_PREFIX}tab`;         // :184
const JS_EVAL_WORKER_ARG   = `${WORKER_HOST_SELECTOR_PREFIX}js_eval`;     // :185
// :182 TINY, :186 JS_EVAL_PROCESS, :187 STT, :188 TTS, :189 MNEMOPI_EMBED
//     -> xoá, vì 5 dòng trên đã nhập chúng từ nguồn duy nhất.
// Sau khi xoá, runWorkerEntrypoint() (:191-...) vẫn so sánh đủ 16.

// ---- 4. BA LITERAL THÔ -> dùng hằng số đã có ----
// Đây là ba chỗ mà đổi tiền tố KHÔNG lan tới, và là nơi im lặng hỏng.
// context-manager.ts:1010
-			? new Worker(hostEntry, { type: "module", argv: ["__omp_worker_js_eval"] })
+			? new Worker(hostEntry, { type: "module", argv: [JS_EVAL_WORKER_ARG] })
// tab-supervisor.ts:1615
-			? new Worker(hostEntry, { type: "module", argv: ["__omp_worker_tab"] })
+			? new Worker(hostEntry, { type: "module", argv: [TAB_WORKER_ARG] })
// packages/stats/src/aggregator.ts:130  (stats KHÔNG được phụ thuộc coding-agent —
// nên dựng từ tiền tố, đừng import hằng số của CLI):
-		return new Worker(hostEntry, { type: "module", argv: ["__omp_worker_stats_sync"] });
+		return new Worker(hostEntry, { type: "module", argv: [`${WORKER_HOST_SELECTOR_PREFIX}stats_sync`] });

// ---- 5. Ba khai báo bin ----
// scripts/ci-release-publish.ts:186
-		publishBin: { omp: "dist/cli.js" },
+		publishBin: { "<tên-mới>": "dist/cli.js" },
// packages/coding-agent/package.json:28
-		"omp": "src/cli.ts"
+		"<tên-mới>": "src/cli.ts"
// packages/coding-agent/src/task/omp-command.ts:11  (xem open_questions[0] —
// phương án (b) xoá hẳn literal gần đây nhất)
-const DEFAULT_CMD = process.platform === "win32" ? "omp.cmd" : "omp";
+import { APP_NAME } from "@oh-my-pi/pi-utils";
+const DEFAULT_CMD = process.platform === "win32" ? `${APP_NAME}.cmd` : APP_NAME;
// PI_SUBPROCESS_CMD ở :15 GIỮ NGUYÊN — N16 đóng băng họ tiền tố PI_* vĩnh viễn.

// ---- 6. worker-client.ts:130-131 — fallback PATH ----
-			$which("omp", { requireAbsolutePaths: true, cache: WhichCachePolicy.Bypass }),
+			$which(APP_NAME, { requireAbsolutePaths: true, cache: WhichCachePolicy.Bypass }),
// :203 là comment về ~/.omp/agent/cache — CONFIG_DIR_NAME, KHÔNG đụng (W6 mới lật).
// :384 "omp-worker-stderr-" là tên thư mục tạm, đổi tùy chọn (xem files_touched).

// ---- 7. profile-alias.ts — TÁCH HAI LỚP ----
// Lớp A — ĐỔI (nếu open_questions[1] chọn phương án (a)):
const DEFAULT_ALIAS_COMMAND: ProfileAliasCommand = {          // :29-34
-	display: "omp", posix: "omp", fish: "omp", powerShell: "omp",
+	display: APP_NAME, posix: APP_NAME, fish: APP_NAME, powerShell: APP_NAME,
};
// Chốt chặn :157-158 — CẦN NHÁNH THỪ HAI, nếu không một profile tên
// "<tên-mới>" sẽ che chính binary của người dùng:
-	if (normalized.toLowerCase() === "omp") {
-		throw new Error('Invalid alias "omp". Refusing to shadow the base omp command.');
-	}
+	const base = APP_NAME.toLowerCase();
+	if (normalized.toLowerCase() === base || normalized.toLowerCase() === "omp") {
+		throw new Error(`Invalid alias "${aliasName}". Refusing to shadow the base ${APP_NAME} command.`);
+	}
// :292 `--wraps omp` -> `--wraps ${APP_NAME}`
// Lớp B — ĐÓNG BĂNG (khuyến nghị mặc định, thêm vào do_not_rename):
const start = `# >>> omp profile alias: ${aliasName} >>>`;   // :286, :309 — GIỮ NGUYÊN
const end   = `# <<< omp profile alias: ${aliasName} <<<`;   // :287, :310 — GIỮ NGUYÊN
// :268 posixJoinUnc(configHome, "fish", "conf.d", "omp-profiles.fish") — GIỮ NGUYÊN
// Lý do: upsertBlock() (:308-327) đọc ngược marker này từ .zshrc của người dùng.
// Đổi nó => indexOf trả -1 => append block thứ hai mỗi lần chạy --alias.

// ---- 8. completion-gen.ts — KHÔNG CẦN LÀM GÌ ĐỂ ĐỔI TÊN LỆNH ----
// Tên lệnh đến từ commands/completions.ts:29 (`{ bin: APP_NAME }`), nên W3 đã
// xong phần này. 29 token còn lại là TÊN HÀM SHELL trong script sinh ra
// (_omp, _omp_root, _omp_call, _omp_tools, _omp_models_list, _omp_commands,
//  _omp_cmd_*, _omp_comma, __fish_omp_no_subcommand). Đổi hay không là quyết
// định thẩm mỹ; KHÔNG có rủi ro kỹ thuật vì fish chỉ dùng chuỗi -n làm điều kiện.
// Đổi thì nhớ :447 ghi rõ quy ước file autoload của zsh tên là _omp.

// ---- 9. Test parity MỚI — packages/coding-agent/test/worker-selector-parity.test.ts ----
// Khẳng định quan sát được, KHÔNG source-grep (AGENTS.md cấm).
import { describe, expect, it } from "bun:test";
import { WORKER_HOST_SELECTOR_PREFIX, isWorkerHostSelector } from "@oh-my-pi/pi-utils/worker-host";
import * as selectors from "../src/cli/worker-selectors";
import { STT_WORKER_ARG } from "../src/stt/asr-client";
import { TTS_WORKER_ARG } from "../src/tts/tts-client";
import { MNEMOPI_EMBED_WORKER_ARG } from "../src/mnemopi/embed-client";
import { TINY_WORKER_ARG } from "../src/tiny/title-protocol";
// KHÔNG import JS_EVAL_PROCESS_ARG: nó là `const` trần ở context-manager.ts:130, KHÔNG export.
// Nên ở đây dựng từ tiền tố, đúng như cách test thứ nhất đã làm — không mở bề mặt `bare`
// export chỉ để một test chạy được, vì AGENTS.md cấm đúng loại export đó.

const JS_EVAL_WORKER_ARG   = `${WORKER_HOST_SELECTOR_PREFIX}js_eval`;         // khớp cli.ts:185
const JS_EVAL_PROCESS_ARG  = `${WORKER_HOST_SELECTOR_PREFIX}js_eval_process`; // khớp cli.ts:186

const ALL_16 = [
	...Object.values(selectors),            // 8
	STT_WORKER_ARG, TTS_WORKER_ARG, MNEMOPI_EMBED_WORKER_ARG,   // 3
	TINY_WORKER_ARG, JS_EVAL_WORKER_ARG, JS_EVAL_PROCESS_ARG,   // 3
	`${WORKER_HOST_SELECTOR_PREFIX}stats_sync`,                  // 2 còn lại nằm ở cli.ts,
	`${WORKER_HOST_SELECTOR_PREFIX}tab`,                         // chưa export, nên dựng
];
// 8 + 3 + 3 + 1 + 1 = 16, đúng bằng 16 selector có thật trong cây (8 ở
// cli/worker-selectors.ts + 8 ở cli.ts:182-189). Nếu số này lệch 16, cây đã đổi —
// đừng sửa con số cho khớp, hãy đếm lại từ hai file đó.
// KHÔNG export STATS_SYNC/TAB/JS_EVAL ra từ cli.ts "cho test dùng": làm vậy là mở bề
// mặt `bare` export mà AGENTS.md cấm, để đổi lấy một test. Dựng từ tiền tố thì test
// vẫn bắt được lệch — nếu ai đó đổi tiền tố, cả 16 dòng đỏ cùng lúc.

// CỔNG CHUYỂN TIẾP, không phải parity test vĩnh viễn. Nó đúng ở trạng thái GIỮA W2 và
// SAU W9: W9 dồi mọi selector về `cli/worker-selectors.ts`, và khi đó spread
// `Object.values(selectors)` đã ăn hết 16 — bảy dòng dựng tay bên dưới thành thừa và
// cổng này phải bị xoá cùng W9. Giữ nó lâu hơn sẽ tạo ra một parity test bao quanh
// 16 giá trị mà không còn so với gì.
describe("worker selector parity (chỉ trong giai đoạn W2 → W9)", () => {
	it("mọi selector khai báo đều khớp tiền tố — 16/16", () => {
		expect(ALL_16).toHaveLength(16);
		for (const arg of ALL_16) expect(isWorkerHostSelector(arg)).toBeTrue();
	});
	it("tiền tố dùng đúng thương hiệu mới, không phải thương hiệu cũ", () => {
		expect(WORKER_HOST_SELECTOR_PREFIX).toBe("__<tên-mới>_worker_");
		expect(isWorkerHostSelector("__omp_worker_stats_sync")).toBeFalse();  // hàng ÂM
	});
	it("không selector nào trùng nhau", () => {
		expect(new Set(ALL_16).size).toBe(16);   // bắt copy-paste sai nội dung
	});
});
```

### Hợp đồng test

W9 bảo vệ **năm** hợp đồng quan sát được. Không cái nào là "mã trông đúng" — tất cả đều là hành vi mà một consumer quan sát được.

**HĐP ĐỒNG 1 — tính toàn vẹn của tiền tố (hợp đồng chính).** Vì sao quan sát được: `isWorkerHostSelector()` là cổng duy nhất quyết định argv có được dispatch hay không (`cli.ts:545`). Một selector không khớp tiền tố sẽ bị đối xửng như root flag — đây chính xác là hỏng-im-lặng mà W9 sinh ra nếu làm ẩu. Khẳng định: với đúng 16 hằng số selector đã khai báo, `isWorkerHostSelector(x)` là `true` cho cả 16. 16 phải là con số được ghi trong test (không phải `Object.keys(...).length` suông), vì con số là một phần của hợp đồng — 15/16 là hỏng. **Hàng đối chứng âm BẮT BUỘC:** `isWorkerHostSelector("__omp_worker_stats_sync")` phải `false` sau khi đổi. Nếu không có hàng âm này, một test chỉ khẳng định "mọi thứ khớp tiền tố" sẽ xanh cả khi tiền tố CHƯA được đổi — tức là test không bắt được chính thay đổi nó sinh ra. Cách chứng minh hàng âm sống (bắt buộc trước khi tính DONE): đổi `WORKER_HOST_SELECTOR_PREFIX` về giá trị cũ, chạy test, phải ĐỎ; đổi lại, phải XANH. Nếu không làm bước này thì chưa chứng minh test bảo vệ được gì. **Nếu hồi quy, người tiêu dùng thấy CLI lên mà không có tab, không sync stats, không eval JS, không đọc tab trình duyệt — và không có bất kỳ thông báo lỗi nào.** File: `packages/coding-agent/test/worker-selector-parity.test.ts` (MỚI) và `packages/utils/test/worker-host.test.ts` (cập nhật dòng 24-26, 3 khẳng định đang ghim tiền tố cũ).

**HĐP ĐỒNG 2 — tính duy nhất của selector.** `new Set(ALL_16).size === 16`. Bắt được copy-paste sai (đổi tên xong rồi để hai hằng cùng nội dung). Đây là lớp lỗi mà `isWorkerHostSelector` thuần KHÔNG bắt — cả hai đều `true`. File: `packages/coding-agent/test/worker-selector-parity.test.ts`.

**HĐP ĐỒNG 3 — chốt chặn alias.** Hai ca, và ca thứ hai mới là ca phân biệt được: (a) tạo profile tên đúng bằng tên lệnh gốc MỚI bị TỪ CHỐI, với cùng hình dạng lỗi, đồng thời giữ nguyên việc từ chối tên CŨ (nếu chọn phương án giữ cả hai nhánh ở bước 7 của khối code); (b) một tên gần giống (ví dụ thêm hậu tố) được CHẤP NHẬN. Vì sao (b) bắt buộc: một chốt chặn viết sai thành so sánh `startsWith` sẽ xanh ở (a) và đỏ ở (b). Nếu chỉ có (a), test không phân biệt được chốt chặn thật với một chuỗi hardcode. **Nếu hồi quy, người tiêu dùng thấy `--alias` tạo một profile tên trùng binary của chính họ, và mọi lời gọi `omp --profile=X` bắt đầu chạy lệnh không phải ý mình.** File: `packages/coding-agent/test/profile-alias.test.ts`.

**HĐP ĐỒNG 4 — tương thích ngược của marker profile (chỉ khi chọn đóng băng).** `upsertBlock` phải nhận ra block do bản CŨ ghi. Quan sát bằng cách đưa vào nội dung file rc một block có marker CŨ và khẳng định sau khi `installProfileAlias` chạy, file chứa ĐÚNG MỘT block (không phải hai). **Nếu hồi quy, người tiêu dùng thấy mỗi lần chạy `--alias` lại tích thêm một định nghĩa alias trùng trong `.zshrc` của họ, và block cũ gọi `command omp` không bao giờ được dọn — họ không thấy lỗi nào, chỉ thấy file rc phình dần.** File: `packages/coding-agent/test/profile-alias.test.ts`.

**HĐP ĐỒNG 5 — selector thật vẫn nạp được (vòng đầy đủ).** `bun run ci:test:smoke` phải exit 0 DƯỚI TÊN MỚI. Đây là hợp đồng phân phối, không thay được bằng unit test: nó chứng minh worker tái nhập entrypoint dưới tên mới. **Phạm vi phủ đã đo, và phải ghi vào báo cáo merge:** trên darwin phủ 13/16 (thiếu `stats_sync` vì `aggregator.ts:194` return sớm, và `tab`/`js_eval_process` vì không có smoke nào gọi tới). Trên Linux 14/16. TUYỆT ĐỐI KHÔNG được viết "smoke xanh nghĩa là selector đã đúng" — đó là 13/16, và `stats_sync` là literal thô khó chạm nhất.

**CÁI KHÔNG ĐƯỢC LÀM trong test:**

- KHÔNG source-grep file nguồn trong bất kỳ test nào (AGENTS.md cấm). Ca parity ở trên là hành vi trên giá trị export, không phải trên text của file.
- KHÔNG dùng `mock.module()` (rò registry toàn cục, hỏng các file test sau).
- KHÔNG khẳng định `fn(x) === x` cho hằng số — hằng đồng nhất với chính nó là tautology. HĐP ĐỒNG 1 khác: nó khẳng định HÀNH VI của hàm `isWorkerHostSelector` trên một đầu vào, và ở hàng âm hành vi đó là `false`.
- KHÔNG thêm mục changelog (AGENTS.md + chỉ dẫn M5: chỉ cập nhật khi được yêu cầu).

**Các file test khác và mức độ chạm:**

| file test | kế hoạch | đã đo |
| --- | --- | --- |
| `packages/coding-agent/test/worker-selector-parity.test.ts` | TẠO MỚI — hợp đồng 1 và 2. KHÔNG có trong kế hoạch cũ. | chưa có (file chưa tồn tại) |
| `packages/utils/test/worker-host.test.ts` | CẬP NHẬT dòng 24-26 (3 khẳng định ghim tiền tố cũ) | 4 pass / 0 fail, KHÔNG cần build native |
| `packages/coding-agent/test/profile-alias.test.ts` | CẬP NHẬT — hợp đồng 3 và 4 | 23 pass / 0 fail, KHÔNG cần build native |
| `packages/coding-agent/test/worker-selector.test.ts` | GIỮ NGUYÊN logic; chỉ cân nhắc đổi 2 chuỗi literal cho nhất quán. KHÔNG thêm khẳng định parity ở đây vì file này KHÔNG liệt kê selector. | **BỊ CHẶN** trên máy chưa build native |
| `packages/coding-agent/test/executable-fallback.test.ts` | KHÔNG ĐỔI — `__omp_worker_test` là argv tùy ý | 8 lượt, giữ nguyên |
| `packages/coding-agent/test/eval/worker-core.test.ts` | KHÔNG ĐỔI — `__omp_worker_core_gate` là tên thuộc tính `globalThis`, không liên quan | 30 lượt, giữ nguyên |
| `packages/coding-agent/test/issue-1606-repro.test.ts`, `test/issue-3031-repro.test.ts`, `test/issue-7352-repro.test.ts` | TÙY CHỌN — chỉ nằm trong docblock; đổi cho sạch hoặc bỏ | 1 lượt mỗi file |
| `packages/coding-agent/test/fixtures/computer-worker-cli-selector.ts` và `test/eval/process-entry-import.test.ts` | argv thật, phải đổi theo hoặc chuyển sang import hằng số | 1 lượt mỗi file |

### Xác minh

Đã chạy thật trên máy đo (darwin-arm64, branch `milestone-1`). Mọi con số dưới đây là output thật, không phải suy đoán.

```bash
# --- 1. Cổng kiểm tra kiểu: EXIT 0 (đã đo) ---
bun run check:ts
# đo được: pi-metaharness 39.85s (chậm nhất), pi-catalog 36.28s,
#           pi-coding-agent 27.17s, pi-ai 19.28s, còn lại dưới 12s

# --- 2. Test tiền tố (đã đo 4 pass, KHÔNG cần build) ---
bun test packages/utils/test/worker-host.test.ts

# --- 3. Test chốt chặn alias + marker (đã đo 23 pass, KHÔNG cần build) ---
cd packages/coding-agent && bun test test/profile-alias.test.ts

# --- 4. Test selector (BỊ CHẶN môi trường, KHÔNG phải hỏng sản phẩm) ---
cd packages/coding-agent && bun test test/worker-selector.test.ts
# kết quả đo: 0 pass / 1 fail / 1 error
# lỗi: Failed to load pi_natives native addon for darwin-arm64
# ném ra từ packages/natives/native/loader-state.js:970
# qua packages/coding-agent/test/worker-selector.test.ts:3 (import isPidRunning từ @oh-my-pi/pi-utils/procmgr)

# --- 5. Tiền đề build addon ---
which ninja          # đo được: không có
# bun --cwd=packages/natives run build cần ninja cho cmake của opusic-sys.
# Không thử build (sẽ cần `brew install ninja`, một thay đổi máy).

# --- 6. Phân phối ---
bun run ci:test:smoke   # package.json:123 — CHƯA chạy được trên máy này (xem mục chưa kiểm chứng)
```

**Phạm vi đã đo bằng lệnh thật:**

```bash
git grep -o '__omp_worker_' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l
# → 97 lượt / 28 file. Tách: nguồn 30 lượt / 14 file,
#   test 54 lượt / 9 file, tài liệu + snapshot 13 lượt / 5 file.
#   LƯU Ý: 97 là số LƯỢT. Con số 89 là số DÒNG có khớp theo `git grep -c`.
#   Đừng lẫn hai con số này khi đọc lại kế hoạch.

git grep -oh '__omp_worker_[a-z_]*' | sort -u | wc -l
# → 21 token khác nhau: 16 selector thật + `__omp_worker_` (tiền tố trần)
#   + 4 sentinel test (`__omp_worker_test`, `__omp_worker_does_not_exist`,
#   `__omp_worker_cwd_gate`, `__omp_worker_core_gate`)

grep -hoE '^(export )?const [A-Z_]+_ARG' <cả hai file selector> | wc -l
# → 16 hằng selector; đối chiếu runWorkerEntrypoint bằng awk → 16 nhánh if, khớp 16/16

grep -o omp <completion-gen.ts> | wc -l                 # → 109 (đếm substring thô)
grep -oiE 'complet[a-z]*' <completion-gen.ts> | wc -l  # → 58 trong số đó nằm trong "completion"
# token thương hiệu thật trong completion-gen.ts → 29

grep -oE '(^|[^a-zA-Z])omp([^a-zA-Z]|$)' <profile-alias.ts> | wc -l  # → 13 (plan chỉ liệt kê 6 dòng)
grep -n publishBin <scripts/ci-release-publish.ts>      # giá trị thật ở :186 (plan ghi :165)
```

**Chưa kiểm chứng (ghi rõ, đừng coi là đã biết):**

- (a) `ci:test:smoke` **chưa chạy** — nó cần build native qua đường này, mà máy chưa có ninja.
- (b) Các nhánh Windows của `resolveExecutablePath` (`isPath`/`isFullyQualifiedPath`) **không thể chạy ở đây**.
- (c) `bundled-artifact` (codesign + notarize dưới tên file mới) thuộc W10/W12, **không kiểm được ở W9**.
- (d) `claude` (ACP wire, N5) **cố ý nằm ngoài phạm vi**.
- (e) Vị trí `file:line` trong các file test ở bảng "Các file test khác" được đặc tả dẫn ra từ việc đọc file và đếm lượt, không phải từ cờ kiểm chứng trên từng entry; coi chúng là **chưa kiểm chứng độc lập** cho tới khi bạn tự grep lại.

### Cổng hoàn thành

Cổng gồm **4 tầng lệnh kiểm + 1 điều kiện nghiệm thu**, xếp theo nguyên tắc: tầng nào càng cao thì càng cần chuẩn bị trước, và mỗi tầng phải phân biệt được "W9 làm hỏng" với "máy chưa sẵn sàng". Nguyên tắc này quyết định toàn bộ hình dạng cổng, vì lệnh kiểm mà kế hoạch cũ đề xuất (`bun run check && bun run ci:test:smoke && bun test test/worker-selector.test.ts`) ĐỎ trên máy đã đo vì ba lý do không liên quan tới W9.

```bash
# ===== TẦNG 1 — LUÔN CHẠY ĐƯỢC, KHÔNG CẦN CHUẨN BỊ GÌ. Đây là cổng chính. =====
bun run check:ts
# ĐÃ ĐO: exit 0. Cổng này ĐỎ khi: import sai subpath, tạo vòng import mới
# (thêm import chéo giữa cli.ts và context-manager.ts là rủi ro thật ở bước 5),
# còn tên hằng cũ sót lại trong phạm vi nguồn, hoặc type sai sau khi đổi kiểu hằng.
# Cổng này KHÔNG đỏ khi: thiếu ninja, thiếu addon native, test fail.

# ===== TẦNG 2 — LUÔN CHẠY ĐƯỢC, BẮT ĐƯỢC CẢ HAI BẤT BIẾN CHÍNH. =====
bun test packages/utils/test/worker-host.test.ts && cd packages/coding-agent && bun test test/profile-alias.test.ts
# ĐÃ ĐO Ở HEAD SẠN: 4 pass và 23 pass. KHÔNG cần build native.
# Đây là tầng quan trọng nhất về thiết kế: nó bắt được ĐÚNG hai thứ W9 đổi mà
# vẫn chạy được — (a) tiền tố selector, (b) chốt chặn alias + tương thích marker.
# Tầng 3 KHÔNG bắt được (a).
# Cổng này ĐỎ khi: tiền tố đổi mà worker-host.test.ts:24-26 chưa cập nhật;
# tên lệnh mới chưa vào DEFAULT_ALIAS_COMMAND; chốt chặn alias thiếu nhánh thứ hai;
# marker bị đổi làm upsertBlock append thay vì thay.

# ===== TẦNG 3 — CẦN BUILD, VÀ PHẢI TÁCH RÕ TIỀN ĐỀ KHỎI KẾT QUẢ. =====
# Bước 0 (TIỀN ĐỀ, không phải test):
which ninja || brew install ninja
bun --cwd=packages/natives run build          # phải exit 0
# NẾU BƯỚC 0 FAIL, DỪNG NGAY và báo "PRECONDITION FAILED — addon native chưa build"
# (kèm lỗi cmake nguyên văn). TUYỆT ĐỐI KHÔNG báo "test failed".
# Sau khi bước 0 exit 0:
cd packages/coding-agent && bun test test/worker-selector.test.ts test/worker-selector-parity.test.ts
# Cổng này ĐỎ khi: selector nào không còn được dispatch, ca "unknown selector" thất bại,
# ca reaping hỏng, hoặc ca parity mới bắt được hằng số còn sót tiền tố cũ.

# ===== TẦNG 4 — PHÂN PHỐI, VÀ PHẢI BÁO CÁO ĐỘ PHỦ TRUNG THỰC. =====
bun run ci:test:smoke                        # package.json:123
# Phải exit 0. Khi viết báo cáo, GHI RÕ: trên darwin phủ 13/16 selector
# (thiếu stats_sync — aggregator.ts:194 return sớm trên macOS; thiếu tab và
# js_eval_process — không có lời gọi smoke nào tới). Trên Linux 14/16.
# Nếu có CI Linux, chạy lại tầng 4 ở đó và báo cáo 14/16.
```

**TẦNG 5 — SO SÁNH BASELINE (không phải lệnh kiểm, là điều kiện nghiệm thu).** Chạy lại ba lệnh ở bước 2 sau khi sửa và so với baseline 97 / 28 / 21. Phải giải thích được TỪNG chênh lệch bằng danh sách ở bước 9. Đặc biệt: nếu số lượt giảm nhiều hơn ~30 so với dự kiến, hãy dừng — nghĩa là đã quét vào thứ không nên quét (khả năng cao nhất: `sed` toàn repo đụng `fixtures.json` và `worker-core.test.ts`).

**ĐIỀU CẤM:**

- KHÔNG dùng lệnh kiểm nào mà "đỏ" có thể do nguyên nhân ngoài W9 mà không nói rõ. Đó là lý do tầng 3 tách tiền đề khỏi kết quả.
- KHÔNG chấp nhận `grep sạch` làm bằng chứng. Ở đây "sạch" là SAI: 44 lượt sentinel trong test + 5 lượt trong `fixtures.json` phải CỐ Ý còn lại. Cổng đúng là "con số khớp danh sách từng dòng", không phải "zero hit".
- KHÔNG coi `bun test` là sẵn sàng trên máy chưa build. Nó chỉ sẵn sàng cho 2 file đã đo ở tầng 2.
- TUYỆT ĐỐI không dùng `tsc` (dự án cấm) — cổng kiểm tra kiểu là `bun run check:ts`.

**Cổng có thực sự đỏ được không?** Có. `gate_can_fail` = `true`. Nhưng phải nói rõ cái gì làm nó đỏ: tầng 1 đỏ khi import/vòng import/type sai; tầng 2 đỏ khi tiền tố hoặc chốt chặn alias chưa cập nhật — và đây là tầng bắt được thay đổi chính mà người đọc phải tin; tầng 3 đỏ khi còn hằng số sót tiền tố cũ; tầng 4 đỏ khi worker không còn tái nhập entrypoint dưới tên mới. Rủi ro của một cổng đỏ *giả* đã được xử lý bằng cách tách tiền đề build ra khỏi kết quả test ở tầng 3.

### Phụ thuộc

**Phải có trước (`depends_on`):**

- **W1** — 5 vị trí wire phải rời literal `"omp"` về hằng số `WIRE_NAME` TRƯỚC, nếu không grep tìm literal trong W9 sẽ trả về kết quả mơ hồ (wire lẫn display lẫn selector trong cùng một lượt khớp).
- **W3** — `APP_NAME` (`dirs.ts:21`) đã mang tên mới; W9 dựa vào nó ở `commands/completions.ts:29` và (nếu chốt Cần người quyết mục 1) ở `task/omp-command.ts:11`.

**Chặn sau (`blocks`):**

- **W13'** — gói Python spawn binary theo tên mới; phải biết tên mới chính xác mới viết được khẳng định test.
- **W10** — CI / release / Docker / homebrew / nix: tên asset tách (`omp-` → tên mới) và tên binary đóng gói phải khớp W9.
- **W11** — sửa test theo hằng số (wave 5) sẽ dựa vào selector parity test mà W9 tạo.

### Cách sai dễ nhất

Bốn lớp, tăng dần:

1. **SAI THỨ TỰ — cao nhất.** Kế hoạch nói "đổi literal trước, đổi tiền tố sau", và điều đó ĐÚNG: nếu đổi `WORKER_HOST_SELECTOR_PREFIX` mà để lại một selector cũ, `isWorkerHostSelector()` trả false cho nó, `cli.ts:545` không dispatch, worker không khởi động, KHÔNG có lỗi nào. Triệu chứng: CLI lên không có tab, không sync stats, không eval JS, không đọc tab trình duyệt. Nhưng vì đặc tả này đã gộp mọi selector về một hằng số, rủi ro này gần như biến mất — đó là lý do chính của refactor.

2. **PHÁP LÝ RC — cao, và kế hoạch cũ KHÔNG nhắc tới.** `packages/coding-agent/src/cli/profile-alias.ts:286-287,309-310` khai báo marker `# >>> omp profile alias: <tên> >>>`; `upsertBlock()` (`:308-327`) ĐỌC NGƯỢC marker này từ `.zshrc`/`.bashrc`/`.fish` của người dùng để tìm và thay thế block cũ. Đổi chuỗi marker ⇒ `content.indexOf(start)` trả -1 ⇒ tool APPEND block thứ hai thay vì thay thế. Hậu quả: mỗi lần chạy `--alias` lại tích thêm một định nghĩa alias trùng trong file rc, và block cũ (vẫn gọi `command omp`) không bao giờ bị dọn. Đúng là bẫy "hai lớp danh tính": tên hiển thị đổi được, nhưng chuỗi nhận diện trên đĩa của người dùng thì không. **Khuyến nghị: ĐÓNG BĂNG marker ở giá trị cũ và ghi vào `do_not_rename`.**

3. **TÊN FILE SINH RA — trung bình.** `profile-alias.ts:268` ghi `~/.config/fish/conf.d/omp-profiles.fish`. Đổi tên ⇒ file cũ vẫn còn trong `conf.d` và fish source CẢ HAI (fish nạp mọi file trong `conf.d`), nên alias bị định nghĩa hai lần. Rẻ hơn marker, nhưng cùng lớp.

4. **BỎ SÓT — thấp sau khi gộp hằng số, nhưng còn một thứ không ai thấy.** `packages/stats/src/aggregator.ts:130` là literal thô, VÀ `smokeTestSyncWorker` (`:193-194`) return sớm khi `process.platform === "darwin"` với lý do đã ghi trong docblock (`:186-189`): worker spawn không reachable từ CLI trên macOS. Nghĩa là trên máy darwin, KHÔNG có cổng nào chạm tới `__omp_worker_stats_sync` — smoke bỏ qua nó, `worker-selector.test.ts` không đề cập nó. Chỉ CI Linux mới bắt được. **Đừng để tin rằng smoke xanh nghĩa là 16/16.**

### Cần người quyết

- **Tên bin mới chính xác, và `DEFAULT_CMD` có nên bỏ ghim cứng không?** `packages/coding-agent/src/task/omp-command.ts:11` đang ghim `"omp.cmd" : "omp"`. Có hai lựa chọn: (a) chỉ đổi chuỗi (giữ nguyên lỗi "quên một trong ba khai báo bin"), hay (b) suy ra từ `APP_NAME`: `const DEFAULT_CMD = process.platform === "win32" ? \`${APP_NAME}.cmd\` : APP_NAME`. **KHUYẾN NGHỊ (b)** — nó xoá nguyên nhân gốc của rủi ro số 4, và repo đã có tiền lệ đúng y như vậy ở `packages/coding-agent/test/fixtures/compiled-worker-selector-host.ts:5` (`${WORKER_HOST_SELECTOR_PREFIX}stats_sync`). Cần người quyết định vì nó biến W9 từ "đổi 3 literal" thành "xoá 1 literal + thêm 1 import".
- **Marker `# >>> omp profile alias:` và tên file `omp-profiles.fish`: đóng băng hay đổi?** (a) Đóng băng cả hai ở giá trị cũ, thêm vào `do_not_rename` với lý do "cơ chế nhận diện block do công cụ quản lý trong file rc của người dùng" — người dùng cũ không bị append trùng, nhưng file sinh ra vẫn mang tên cũ. (b) Đổi cả hai và chấp nhận: block cũ trong rc không bị nhận nữa, file fish cũ vẫn được source song song. Cần người quyết vì đây là đánh đổi giữa "sạch tên" và "tương thích cài đặt đang tồn tại", mà §1.1 đặt tương thích là ràng buộc tuyệt đối.
- **`omp-stats` có thuộc W9 không?** `packages/stats/package.json:27` khai báo `"bin": { "omp-stats": "./src/index.ts" }` — đây là tên lệnh thứ TƯ được cài vào PATH, và kế hoạch không nhắc tới nó ở đâu cả. N17 giữ nguyên basename gói `@oh-my-pi/omp-stats` → `@ultraworkers/omp-stats`, nhưng tên BIN không phải basename: nó là lệnh người dùng gõ. Chốt: giữ `omp-stats`, hay đổi thành `ultraworkers-stats`? Nếu đổi thì nó là một work item riêng vì `packages/coding-agent/src/cli/update-cli.ts` phân loại cài đặt dựa trên tên.
- **`omp.ida.<id>` trong `docs/tools/ida.md:14` là tên daemon/socket — wire hay display?** Nó không nằm trong danh sách N4 của §2.3 (5 vị trí wire đã gom về `WIRE_NAME`), nhưng nó là danh tính runtime mà client ngoài có thể thấy. Nếu là wire thì phải vào `do_not_rename`; nếu chỉ là tên daemon nội bộ thì đổi được. W9 chỉ sửa phần `__omp_worker_ida_host` cạnh nó, còn lại để W10.
- **Có thêm smoke cho `tab` và `js_eval_process` không?** Đây là 2 loại selector duy nhất mà KHÔNG có lời gọi `smokeTest*` nào ở `cli.ts:151-179`. `js_eval_process` đã được `worker-selector.test.ts` (3 ca) chạm tới; `tab` thì hoàn toàn trần. Chấp nhận thiếu phủ (vì tỷ lệ 14/16 trong smoke là đã rất cao), hay thêm một `smokeTestTabWorker`? Nếu thêm thì nó là bước thêm ngoài W9 và cần thêm một worker module graph.
- **Ba token sentinel trong test có đổi theo cho nhất quán không?** `__omp_worker_test` (8 lượt, `executable-fallback.test.ts`) là argv tùy ý chỉ để `resolveWorkerSpawnCmd` chuyển tiếp — KHÔNG cần khớp tiền tố. `__omp_worker_does_not_exist` (2 lượt, `worker-selector.test.ts:24,41`) là selector CỐ Ý sai. `__omp_worker_core_gate` (30 lượt, `worker-core.test.ts`) là tên thuộc tính `globalThis`, KHÔNG liên quan gì tới worker host. **KHUYẾN NGHỊ: giữ nguyên cả ba**, vì đổi chúng chỉ tạo diff nhiễu và tăng rủi ro. Nhưng nếu W9 chạy `sed` toàn repo trên `__omp_worker_` thì chúng sẽ bị đổi ngoài ý muốn — vì vậy đừng chạy sed toàn repo ở W9.

### Đính chính so với plan

KHÔNG bao giờ hấp thụ im lặng một đính chính: nếu kế hoạch tổng nói sai, người đọc phải thấy điều đó.

| claim của kế hoạch | verdict | correction |
| --- | --- | --- |
| `scripts/ci-release-publish.ts:165` (`publishBin: { omp: "dist/cli.js" }`) — vị trí khai báo bin thứ nhất trong ba. | SAI số dòng (lệch 21 dòng). Nội dung thì đúng. | Dòng thật là `:186`. Kế hoạch trỏ sai dòng sẽ khiến kỹ sư không tìm thấy gì ở 165 và phải grep lại. Dòng 165 là `{ dir: "packages/omptype", kind: "typescript", publishJs: true }` — không liên quan. |
| `packages/coding-agent/src/cli.ts:179-186` — 8 hằng số selector. | SAI số dòng (thật là `:182-189`). | Dòng 179-181 là phần đuôi của `runSmokeTest()` và dấu `}`. `grep -n '__omp_worker_' packages/coding-agent/src/cli.ts` → 182 TINY, 183 STATS_SYNC, 184 TAB, 185 JS_EVAL, 186 JS_EVAL_PROCESS, 187 STT, 188 TTS, 189 MNEMOPI_EMBED. Đúng 8, đúng thứ tự như kế hoạch liệt kê. |
| `worker-selectors.ts:9,11,13,15,17,19,21` — 7 hằng số (BLOB_BROKER, COMPUTER, DAEMON_BROKER, IDA_HOST, LSP_MUX, STATS_ACTIVITY, TERMINAL_OUTPUT). | SAI — thiếu một hằng số ở `:23`, và danh sách tên trong §3.5 tự mâu thuẫn (liệt kê 7 dòng nhưng đếm tên là TERMINAL_OUTPUT chứ không có TEXT_PREDICT). | Thật là 8 hằng số ở `:9,11,13,15,17,19,21,23`. Bỏ sót nó là bỏ sót selector `__omp_worker_text_predict` — worker dự đoán văn bản sẽ không bao giờ dispatch. (Xem mục "Cần người xác nhận" về việc hằng số thứ 8 rơi ở `:21` hay `:23`.) |
| Có **15 loại selector** (mục nghiệm thu: "15/15 loại selector phân giải"). | SAI — thật là **16 loại**. Con số này xuất hiện ít nhất 4 lần trong kế hoạch (tiêu đề §3.5, chi tiết W9, nghiệm thu W9, mục sai lầm thứ ba). | 16 = 8 hằng số ở `cli.ts` + 8 hằng số ở `worker-selectors.ts`. Mọi con số phải nói 16, và cổng phải nói 16/16. Danh sách 16: blob_broker, computer, daemon_broker, ida_host, lsp_mux, stats_activity, text_predict, terminal_output, tiny_inference, stats_sync, tab, js_eval, js_eval_process, stt, tts, mnemopi_embed. |
| Bề mặt selector là **13 file** với **24 vị trí** khai báo/thật. | SAI ở cả hai con số, theo hai cách đo khác nhau — và số 13/24 bỏ sót một file nguồn thật. | Đo theo file NGUỒN (không tính test/tài liệu): **14 file, 30 vị trí**, gồm 25 literal mã + 5 dòng comment. Đo theo toàn repo (trừ chính file kế hoạch): **28 file, 97 lượt**. Tách ra: nguồn 30/14, test 54/9, tài liệu+snapshot 13/5. **Tiêu đề của mục này vẫn ghi "13 file" — đó là con số cũ.** |
| §3.5 liệt kê 4 dòng comment có chứa selector: `blob-broker/server.ts:2`, `embed-client.ts:119`, `embed-worker.ts:4`, `activity-worker.ts:4`. | SAI — có 5 dòng comment, và `predict/daemon.ts:3` bị bỏ sót hoàn toàn. | Thêm `packages/coding-agent/src/predict/daemon.ts:3` (` * `__omp_worker_text_predict`, started through the `text-predict` global broker).`). Ngoài ra `embed-client.ts` phải là `:122`, không phải `:119`. |
| `embed-client.ts:35`, `stt/asr-client.ts:71`, `tts/tts-client.ts:134` là vị trí khai báo selector. | SAI cả ba số dòng (mỗi sai đúng 3, 1 và 1 dòng). Nội dung thì đúng — ba file này khai báo bản trùng của hằng số đã có ở `cli.ts`. | `embed-client.ts:38`, `asr-client.ts:72`, `tts-client.ts:135`. Tại `asr-client.ts:72` hằng số được dùng ở `:80` (`resolveWorkerSpawnCmd(STT_WORKER_ARG)`), còn `cli.ts:187` giữ bản trùng và dùng ở `:258` — hai chuỗi chỉ khớp nhau vì chúng bằng nhau, không phải vì cùng tham chiếu. |
| `packages/coding-agent/src/subprocess/worker-client.ts:132` (fallback PATH `$which("omp")`). | SAI số dòng — `:132` là dấu `];` đóng mảng `candidates`. | `$which("omp", ...)` nằm ở `:131`; comment giải thích nó nằm ở `:130`. |
| `packages/coding-agent/src/cli/completion-gen.ts` có **109** lượt `omp`, "phải sinh lại cho tên mới". | SAI TRONG CÁCH ĐẾM, và nguy hiểm vì nó gợi ý sai việc phải làm. 109 là con số đúng cho một `grep -o omp` thô — nhưng 109 đó phần lớn KHÔNG phải thương hiệu. | Trong 109 lượt thô, **58 nằm trong chữ `completion`/`complete`**. Chỉ **29 lượt** là token thương hiệu đứng riêng, và tất cả đều là TÊN HÀM SHELL trong script được sinh ra: `_omp`, `_omp_root`, `_omp_comma`, `_omp_call`, `_omp_tools`, `_omp_models_list`, `_omp_commands`, `_omp_cmd_*`, `__fish_omp_no_subcommand`. **QUAN TRỌNG NHẤT: tên binary KHÔNG ghim trong file này.** Nó đến qua `spec.bin` ← `config.bin: APP_NAME` tại `commands/completions.ts:29`. Nghĩa là W3 đã làm phần việc lớn nhất của W9 ở file này rồi. Ngoài ra đổi `_omp` thành `_ultraworkers` là TÙY CHỌN và an toàn về mặt kỹ thuật, nhưng nó đổi quy ước tên file autoload của zsh (`:447`). |
| Độ phủ của `bun run ci:test:smoke` là **2 trong 15** loại selector, theo AGENTS.md. Sai lầm thứ ba của W9: "coi `ci:test:smoke` là phủ đủ — nó phủ 2/15". | SAI, và sai theo HƯỚNG NGƯỢC LẠI so với mối lo sợ của kế hoạch: độ phủ cao hơn nhiều. Đây là correction quan trọng nhất vì nó đổi hình dạng của cổng. | `runSmokeTest()` tại `cli.ts:136-179` gọi **14 hời gọi `await smokeTest*`**, ánh xạ tới **13 loại selector trên darwin** và **14 loại trên Linux**. Riêng 2 loại không được smoke nào chạm tới: `tab` và `js_eval_process`. Smoke phủ 13/16 trên máy dev, không phải 2/16. |
| `AGENTS.md:62` là nguồn của con số "2/15": "`omp --smoke-test` spawns the stats sync worker and the tiny-model subprocess". | TÀI LIỆU ĐÃ CŨ — và nó là nguồn gốc của correction trên. AGENTS.md là file W9 buộc phải sửa, nên nó phải được cập nhật trong cùng commit. | Câu này mô tả một bản `--smoke-test` cũ. Code hiện tại spawn 14 worker. Nếu kỹ sư tin AGENTS.md, họ sẽ tưởng smoke chỉ phủ 2 loại và bỏ qua 11 loại khác. Ngoài ra AGENTS.md còn có 5 lượt `__omp_worker_` (dòng 52 và 57) phải đổi theo tên mới. |
| Phần thứ hai của cảnh báo độ phủ: `stats_sync` không được smoke chạm tới. | ĐÚNG — nhưng kế hoạch gắn nó sai chỗ và không nêu cơ chế. | `smokeTestSyncWorker` tại `packages/stats/src/aggregator.ts:193-194` là `if (process.platform === "darwin") return;` ngay dòng đầu của hàm. Docblock ở `:186-189` giải thích: worker spawn surface không reachable từ CLI trên macOS. Hệ quả: trên darwin, `__omp_worker_stats_sync` — chính là LITERAL THÔ khó chạm nhất — không có cổng nào chạm tới. Chỉ CI Linux bắt được. |
| `profile-alias.ts:30-33` (mặc định `display`/`posix`/`fish`/`powerShell`) và `:157-158` (chốt chặn alias che lệnh gốc). | HAI DÒNG ĐÚNG, NHƯNG CHỈ MỘT PHẦN. File này có **13** token `omp` đứng riêng, không phải 6 dòng. | Thêm 4 vị trí: `:268` (tên file `omp-profiles.fish` trên đĩa), `:286-287` + `:309-310` (marker mà `upsertBlock` `:308-327` đọc ngược từ file rc), `:292` (`--wraps omp`). Bắt buộc phải đổi: `:30-33`, `:157-158` (CẦN NHÁNH THỨ HAI), `:292`. Cần quyết định: `:268` và `:286-287,309-310`. |
| Ca test (2): `packages/coding-agent/test/worker-selector.test.ts` (đã tồn tại) vào gate, khẳng định TẤT CẢ loại selector khớp tiền tố. | SAI — file tồn tại nhưng KHÔNG khẳng định điều đó. Không có ca nào trong file liệt kê hay so sánh bộ selector. | File có 7 ca. Toàn bộ chuỗi `__omp_worker_` trong file là `__omp_worker_does_not_exist` (cố ý sai) và `__omp_worker_js_eval_process`. Nó vẫn bắt được một lớp lỗi — nhưng đó là hệ quả, không phải thiết kế, và nó KHÔNG bắt được trường hợp ngược lại. **Cần một ca parity MỚI.** |
| Ca test (4): "một kiểm tra CI khẳng định mọi literal `__<brand>_worker_` còn lại đều dẫn xuất từ `WORKER_HOST_SELECTOR_PREFIX`". | HỢP LÝ VỀ Ý, SAI VỀ CƠ CHẾ — và nó sẽ đụng luật của AGENTS.md. | AGENTS.md cấm source-grep trong test: khẳng định trên TEXT của file nguồn là kiểm tra "code trông thế nào", đỏ vì refactor vô hại và xanh khi hành vi hỏng. Có hai lối thoát đúng: (a) CÁCH ĐÃ CÓ SẴN TRONG REPO — `packages/coding-agent/test/fixtures/compiled-worker-selector-host.ts:5` viết `${WORKER_HOST_SELECTOR_PREFIX}stats_sync`; áp dụng đúng mẫu đó cho 3 literal thô và 5 cặp trùng lặp, sau đó KHÔNG CÒN literal nào để quét. (b) Nếu vẫn muốn một kiểm tra CI quét, nó phải là script trong `scripts/`, không phải test. |
| Môi trường: `bun test` bị chặn hoàn toàn — mọi test báo `0 pass / 1 fail / 1 error` với lỗi addon native. | SAI — chặn có chọn lọc, và cách hiểu sai này sẽ làm kỹ sư bỏ một cổng đang chạy tốt. | Đo thật: `bun test packages/utils/test/worker-host.test.ts` → **4 pass / 0 fail**, chạy được NGAY không cần build. `cd packages/coding-agent && bun test test/profile-alias.test.ts` → **23 pass / 0 fail**, cũng không cần build. Chỉ `test/worker-selector.test.ts` mới đỏ (`Failed to load pi_natives native addon for darwin-arm64`) vì nó import `@oh-my-pi/pi-utils/procmgr`. |
| Lệnh kiểm của W9: `bun run check && bun run ci:test:smoke && (cd packages/coding-agent && bun test test/worker-selector.test.ts test/profile-alias.test.ts)`. | Không chạy được trên máy đã đo, và cổng đề xuất sẽ ĐỎ với lý do không liên quan tới W9. | `bun run check` kéo `check:rs` cần cargo/ninja; `bun test .../worker-selector.test.ts` đỏ vì addon chưa build. Người đọc sẽ không phân biệt được "W9 làm hỏng" với "máy chưa build". Thay bằng cổng 4 tầng ở mục "Cổng hoàn thành". |
| Ba khai báo bin là toàn bộ bề mặt tên lệnh. | THIẾU MỘT — `packages/stats/package.json:27` khai báo `"bin": { "omp-stats": "./src/index.ts" }`. | Đây là tên lệnh thứ tư được cài vào PATH, kế hoạch không nhắc ở đâu cả. Nó không thuộc N17 (N17 giữ BASENAME của gói, không giữ tên bin). Duyệt `bin` trên mọi package.json: coding-agent `{omp}`, metaharness `{metaharness}`, mnemopi `{mnemopi}`, stats `{omp-stats}`. Đã đưa thành Cần người quyết mục 3 thay vì tự quyết. |
| §3.5 nói 3 chuỗi thô ở `context-manager.ts:1010`, `tab-supervisor.ts:1615`, `aggregator.ts:130` "không dẫn xuất từ hằng số nào cả". | ĐÚNG, và đây là phần tốt nhất của §3.5 — giữ nguyên, chỉ bổ sung. | Xác nhận cả ba dòng và tìm ra mối liên hệ mà kế hoạch chưa nói: mỗi cái đều trùng với một hằng số ĐÃ TỒN TẠI ở `cli.ts` — `JS_EVAL_WORKER_ARG` (`:185`) ↔ `:1010`, `TAB_WORKER_ARG` (`:184`) ↔ `tab-supervisor.ts:1615`, `STATS_SYNC_WORKER_ARG` (`:183`) ↔ `aggregator.ts:130`. Nghĩa là fix không cần hằng số mới, chỉ cần làm spawn site dùng hằng số đã có. Điều này làm diff nhỏ hơn kế hoạch tưởng. |
| Số 13 file trong tiêu đề W9 bao trọn bề mặt selector. | Thiếu hai đích test mà CHÍNH kế hoạch đã nhắc tên chung: `test/eval/worker-core.test.ts` (30 lượt) và `test/fixtures/computer-worker-cli-selector.ts` + `test/eval/process-entry-import.test.ts` (mỗi cái 1). | Nhưng cả ba KHÔNG nên đổi: `worker-core.test.ts` dùng `__omp_worker_core_gate` là tên thuộc tính `globalThis`, `__omp_worker_test` trong `executable-fallback.test.ts` (8 lượt) là argv tùy ý, `__omp_worker_does_not_exist` là selector cố ý sai. Ba file test `issue-1606/3031/7352-repro.test.ts` chỉ chứa selector trong DOCBLOCK. Đã đưa thành Cần người quyết mục 6. |
| Không có gì trong repo ngoài 13 file selector chứa chuỗi này. | SAI — có một file KHÔNG PHẢI selector thật, và `sed` toàn repo sẽ bắt nó. | `crates/pi-natives/src/utok/claude/testdata/fixtures.json` có 5 lượt `__omp_worker_` nằm trong trường `"text"` của một snapshot tokenizer (dòng 2919 chứa nguyên văn AGENTS.md). Nó KHÔNG phải mã. Đừng sed nó: fixture đo hành vi tokenizer trên văn bản thật, đổi nội dung là đổi điều kiện thứ chứ không phải đổi sản phẩm. |

## Cần người xác nhận

Các điểm dưới đây là **mâu thuẫn bên trong chính đặc tả này**, không phải mâu thuẫn với kế hoạch tổng. Chúng được ghi lại nguyên trạng, không tự sửa:

- **Vị trí `TEXT_PREDICT_WORKER_ARG`.** Phần bảng "File cần chạm tới" và phần `plan_corrections` cùng nói hằng số thứ 8 là `TEXT_PREDICT_WORKER_ARG` ở `worker-selectors.ts:23`. Nhưng khối "Hình dạng code" đặt `TEXT_PREDICT_WORKER_ARG` ở `:21` và `TERMINAL_OUTPUT_WORKER_ARG` ở `:23`. Cả hai vị trí đều được gắn "đã kiểm chứng" trong cùng đặc tả. Cần một nguồn sự thật duy nhất trước khi viết dòng này.
- **Ghi chú đếm số trong mảng `ALL_16` của ca test parity.** Dòng `STT_WORKER_ARG, TTS_WORKER_ARG, MNEMOPI_EMBED_WORKER_ARG,   // 4` ghi "4" nhưng chỉ liệt kê 3 giá trị. Tổng vẫn ra 16 (8 + 3 + 2 + 3), nên `expect(ALL_16).toHaveLength(16)` vẫn đúng — nhưng con số trong comment thì không khớp với những gì nó đếm.
- **"Ba lớp" hay "bốn lớp" rủi ro.** Phần `risk` mở đầu bằng câu "Ba lớp, tăng dần" rồi liệt kê bốn mục đánh số (1)–(4). Mục này trình bày cả bốn; số "ba" trong câu mở đầu là sót.
- **Con số 89 trong phần xác minh.** Câu trong `verification` tự hỏi rồi tự trả lời: `git grep -c` cho 89 (số DÒNG có khớp) trong khi `wc -l` cho 97 (số LƯỢT). Câu này đã tự phân giải nhưng viết dở, nên người đọc dễ dừng lại ở con số 89. Ở mục "Xác minh" phía trên chỉ dùng 97 và ghi rõ sự phân biệt.


---


## W10. CI / release / Docker / homebrew / nix (sóng 4)

**Sóng:** Wave 4
**Effort:** M
**Rủi ro chính:** Cao nhất là `Dockerfile.robomp` — `ARG PI_BASE=oh-my-pi/pi:dev` tại dòng 19 là giá trị mà `FROM ${PI_BASE}` dòng 41 mở rộng; đổi tag ở `Dockerfile` mà bỏ sót file này thì job build image robomp trỏ tới tag không tồn tại, và job đó chạy ít nhất nên sẽ bị bỏ sót lâu nhất. Thứ hai là `nix/home-manager.nix` `programs.omp` — đây là tên option home-manager mà người dùng viết trong config của họ, không phải trạng thái máy — đổi nó phá mọi config home-manager hiện hữu, cùng loại với `.omp` cấp project (N14). Thứ ba là `scripts/install.sh` / `install.ps1`: đây là đường cài primary (`curl -fsSL https://omp.sh/install | sh`, `README.md:40`) và nó ghép TÊN ASSET với TÊN NHỊ PHÂN — `scripts/install.sh:241` `BINARY="omp-${PLATFORM}-${ARCH}"` rồi `:266` dựng URL từ đó, nên đổi một vế mà bỏ vế kia là 404. Thứ tư, thứ lặng im nhất: tin rằng `bun run test:scripts` phủ nhánh homebrew — nó không phủ, trước khi `scripts/ci-update-brew-formula.test.ts` được thêm vào.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | sửa | Đổi tên brand token sang tên mới TRỪ `omp-kata` (giữ nguyên) và TRỪ 12 false-positive tiếng Anh. Payload thật nằm ở: `binary_path: packages/coding-agent/binaries/omp-*` (776,785,793,802,810,821,909,922 — 8 dòng), tên upload `omp-binary-${{ matrix.target_id }}` (873,994) + `omp-binary-win32-arm64` (1019), glob `packages/coding-agent/binaries/omp-*` (1175,1185), tải về `omp-darwin-arm64` (1206,1207,1210,1211,1213), shim `/usr/local/bin/omp` (864), `omp-smoke` (1024), `Formula/omp.rb` (1321,1329), `omp-browser-relay-extension.zip` (1176,1186), 2 lượt `oh-my-pi`. GIỮ `branches: [main, omp2]` (:34) và `omp-kata`. **Kết quả thật:** 65 lượt `omp` / 62 dòng (lệnh của plan trả đúng 65/62, KHÔNG phải 53/50). Trong đó 12 lượt trên 11 dòng là false-positive tiếng Anh → brand thật = 53 lượt / 51 dòng. Con số 53 của plan ĐÚNG nhưng lệnh nó ghi thì sai. Regex ghim ở §2.1 vô dụng ở đây: lớp loại trừ sau `omp` có `-`, nên `omp-kata`/`omp-darwin-*` không khớp, chỉ ra 3 hit (867,868,1329). | có |
| `.github/actionlint.yaml` | sửa | GIỮ `omp-kata` trong allowlist nhãn runner (dòng 6) và dòng comment 2. Xác nhận dòng này còn nguyên sau W10. **Plan bỏ sót hoàn toàn.** **Lưu ý: actionlint KHÔNG chạy trong CI của repo này** — không có workflow, script, hay entry `package.json` nào gọi nó (`grep -rn 'actionlint' .github/workflows/ scripts/ package.json` → không kết quả), nên đây KHÔNG phải lưới an toàn. Đổi nhầm `omp-kata` sẽ chỉ lộ ra khi workflow thật sự chạy trên runner scale set đó. Hệ quả: việc đổi nhãn runner KHÔNG có kiểm tra tự động nào — bắt buộc soi thủ công `git diff .github/ \| grep -i kata` trước khi merge. | có |
| `.github/actions/bun-install/action.yml` | sửa | GIỮ `omp-kata` ở 6 chỗ (dòng 5,6,16,54,95,104) — toàn bộ là comment prose về runner image. **Plan bỏ sót.** 6 hit là nhiều nhất trong `.github/actions/`. | có |
| `.github/actions/bazel-cache/action.yml` | sửa | GIỮ `omp-kata` (dòng 7) — comment prose. **Plan bỏ sót.** | có |
| `.github/actions/bazel-natives/action.yml` | sửa | GIỮ `omp-kata` (dòng 5) — comment prose. **Plan bỏ sót.** | có |
| `.github/actions/native-artifacts/action.yml` | sửa | GIỮ `omp-kata` (dòng 6) — comment prose. **Plan bỏ sót.** | có |
| `.github/workflows/bazel-cache-warm.yml` | sửa | GIỮ `omp-kata` (dòng 97) — comment prose. **Plan bỏ sót.** Plan chỉ nói nhãn nằm "1 file, chỉ ci.yml" — sai: nhãn xuất hiện ở 7 file trong `.github/`. | có |
| `Dockerfile` | sửa | Đổi 7 dòng chứa `oh-my-pi`: 3,13,14,17,18,21,186. Đổi shim `omp` ở 180 (`> /usr/local/bin/omp`), 181 (`chmod +x`), 216 (ENTRYPOINT). Cập nhật stage name `pi-base`/`pi-runtime` và tag `oh-my-pi/pi-base:dev` (dòng 14) nếu chọn đổi — stage name phải khớp `Dockerfile.robomp`. **Anchor sai trong plan:** `Dockerfile:178` được liệt kê như hit `oh-my-pi` nhưng dòng 178 thật là `'fi' \` — không phải hit. Plan đồng thời BỎ SÓT dòng 3 (header `# oh-my-pi — pi image`) và dòng 186 (`docker run oh-my-pi/pi:dev --help`). Số thật của lệnh plan: 11 dòng / 3 file. | có |
| `Dockerfile.robomp` | sửa | Đổi 3 dòng `oh-my-pi`: 5,12,19. DÒNG 19 LÀ `ARG PI_BASE=oh-my-pi/pi:dev` — giá trị thật mà `FROM ${PI_BASE}` (dòng 41) mở rộng. Đổi stage `pi-base` ở 5,39,41 cho khớp `Dockerfile`. **Xác nhận đúng đây là file mang tính quyết định như plan nói.** Anchor chính xác. | có |
| `Dockerfile.dockerignore` | sửa | Dòng 1 (`oh-my-pi/pi:dev` trong comment). KHÔNG đụng dòng 27 (`.omp/plugins/`) — path literal, thuộc W4/W6. Anchor `:1` của plan ĐÚNG. | có |
| `.dockerignore` | sửa | Không có `oh-my-pi`; chỉ có `.omp/plugins/` (dòng 32) và `python/omp-rpc` — GIỮ nguyên, chỉ xác nhận không bị `sed` quét. **Plan bỏ sót.** Đây là file dockerignore thứ BA (ngoài `Dockerfile.dockerignore` và `Dockerfile.robomp.dockerignore`); plan chỉ liệt kê 4 file Docker và không nói file này tồn tại. | có |
| `Dockerfile.robomp.dockerignore` | sửa | Không có `oh-my-pi`; giữ `.omp/plugins/` (dòng 32) và các path `python/robomp`. Chỉ xác nhận. **Plan bỏ sót.** | có |
| `scripts/ci-update-brew-formula.ts` | sửa | Sửa 9 dòng plan đã nêu đúng: 76,78,81,83,89,91,94,96 (URL+sha) và 120 (`const targets`). THÊM `HOMEPAGE` dòng 15 — quyết định xem dưới. Sửa 101-104,109 (`bin.install Dir["omp-*"]`, `(bin/"omp")`) và 9,10 (usage). **Số sai:** plan ghi 18 lượt `omp`, thật là 28. Danh sách DÒNG plan đưa (76,78,81,83,89,91,94,96,120) là ĐÚNG — đã đối chiếu từng dòng. **Phạm vi thiếu:** `HOMEPAGE = "https://omp.sh"` tại dòng 15 là domain SỐNG được nhúng vào Formula; N9 chỉ phủ `APP_URL`/`USER_AGENT` ở `dirs.ts:24,36`, KHÔNG phủ chỗ này. **DÒNG 14 `const REPO = process.env.OMP_REPO ?? "can1357/oh-my-pi"` là `oh-my-pi` DUY NHẤT trong file này và là nơi mọi URL ở 76,81,89,94 lấy repo từ** (qua `https://github.com/${REPO}/releases/download/…`) — không đổi nó thì `brew install` vẫn trỏ repo cũ dù asset đã đổi tên. Nhưng `OMP_REPO` là biến môi trường dùng chung với `ci-release-notes.ts:36`, `fix-changelogs.ts:12`, `ci-macos-upload-secrets.sh:32` (và `fix-changelogs.test.ts:442`) — CẦN QUYẾT ĐỊNH: đổi cả tên biến (kèm mọi nơi đọc) hay chỉ đổi giá trị mặc định, giữ `OMP_REPO` làm bí danh. Không chỗ nào trong CI đặt `OMP_REPO`, nên mặc định là thứ duy nhất có tác dụng. | có |
| `scripts/ci-update-brew-formula.test.ts` | sửa | Cập nhật fixture bản đồ asset sang tên mới, GIỮ cấu trúc assertion (sha cạnh url, từng asset một). Không được xoá assertion nào — đây là tấm chắn duy nhất cho §3.1. **Xác nhận file tồn tại** (2.0 KB), chạy được: 3 pass / 0 fail / 15 expect. Xác nhận plan ĐÚNG khi nói `test:scripts` không gọi nó. | có |
| `package.json` | sửa | Dòng 91: thêm `scripts/ci-update-brew-formula.test.ts` vào script `test:scripts` (chèn trước `scripts/release.test.ts`, giữ đúng một space phân tách như 5 file hiện có). Anchor `:91` của plan ĐÚNG. Thay đổi thực tế là 2 token (tên file + space), không phải 5 như plan mô tả. Lý do bắt buộc: không thêm thì nhánh homebrew không có tấm chắn tự động nào. | có |
| `scripts/ci-release-build-binaries.ts` | sửa | 8 dòng `outfile` tại 37,44,51,58,65,72,79,86 (producer của §3.1). PHẢI cùng commit với consumer `update-cli.ts:1206,1208`. **Anchor plan ĐÚNG 100%** — đã đối chiếu cả 8 dòng. Chú ý thứ tự thật là arm64,x64 rồi linux-**x64**(:51) trước linux-**arm64**(:58) — không phải thứ tự người đọc dễ đoán. | có |
| `packages/coding-agent/src/cli/update-cli.ts` | sửa | KHÔNG SỬA FILE NÀY Ở W10 — dòng 1206/1208 đã đọc `APP_NAME` nên tự đổi theo sau W1/W3. Chỉ dùng làm nửa consumer để đối chiếu. Xác nhận consumer ĐÚNG: `:1206` trả `${APP_NAME}-${os}-${archName}.exe`, `:1208` trả `${APP_NAME}-${os}-${archName}`. | có |
| `scripts/install.sh` | sửa | 13 lượt `omp` / 11 dòng. DÒNG 241 `BINARY="omp-${PLATFORM}-${ARCH}"` và dòng 266 dựng URL từ nó; 268-269 ghi `${INSTALL_DIR}/omp`; 276-293 verify; 214-215,297-298 thông báo. Đổi TÊN ASSET và TÊN NHỊ PHÂN cùng một lúc. **Plan bỏ sót hoàn toàn.** Đây là đường cài primary — `README.md:40` là `curl -fsSL https://omp.sh/install | sh`. Script này ghép tên asset với tên nhị phân, nên tách hai vế = 404 cho người dùng. | có |
| `scripts/install.ps1` | sửa | 10 lượt / 10 dòng. Dòng 49 `$BinaryName = "omp-windows-$NativeArchitecture.exe"`, 308 `$OutPath = Join-Path $InstallDir "omp.exe"`, 225 tmp `omp-install-*`, 149 settingsDir `.omp\agent` (PATH — GIỮ, thuộc W4/W6), 29 `$env:LOCALAPPDATA\omp` (PATH — GIỮ). **Plan bỏ sót hoàn toàn.** `README.md:85` là `irm https://omp.sh/install.ps1 | iex`. Ba giá trị path (29,149,225) phải giữ vì N14. | có |
| `scripts/install-tests/run-ci.sh` | sửa | **36 lượt `omp` phân biệt hoa thường (37 nếu `-i`)** — lượng dư là `OMP_INSTALL_TEST_SKIP_NATIVE_BUILD` ở dòng 86. Ba nhóm: tên nhị phân (94 `dist/omp`, 103,235 `node_modules/.bin/omp`, 26-36 `$omp_bin`); TÊN TARBALL THEO SCOPE (164 `oh-my-pi-omptype-*.tgz`, 170 `oh-my-pi-snapcompact-*.tgz`, 173 `oh-my-pi-omp-stats-*.tgz`) và scoped deps (190,196,199,221,222 `@oh-my-pi/omptype`…); probe (223,227,228). **HỢP ĐỒNG HAI FILE: đổi tên biến `OMP_INSTALL_TEST_SKIP_NATIVE_BUILD` thì phải sửa cả `run-ci.sh:86` và `ci.yml:723` cùng lúc, nếu không CI sẽ âm thầm build native thay vì bỏ qua** (thêm vào danh sách ghép với W9 ở bước 9). **Chồng lấn ba chiều mà plan không nói:** file này thuộc W7 (scope) + W9 (tên binary) + W10 (ma trận cài). Plan gán nó RIÊNG cho W10. Phải thống nhất trước khi code, nếu không sẽ có hai commit cùng sửa một file. Có `trap restore_workspace` (dòng 10-19) ghi lại `packages/natives/package.json` — đây là lý do gate có `git diff --quiet HEAD`. | có |
| `scripts/install-tests/binary.dockerfile` | sửa | 4 lượt `omp` — tên nhị phân trong image test. Sửa cùng W9. Xác nhận 4 lượt. | có |
| `scripts/install-tests/source.dockerfile` | sửa | 1 lượt — tên nhị phân trong bản cài source-link. Xác nhận 1 lượt. | có |
| `scripts/install-tests/tarball.dockerfile` | sửa | 1 lượt — tên nhị phân trong bản cài tarball. Xác nhận 1 lượt. | có |
| `scripts/install-tests/settings-session.ts` | sửa | 9 lượt `omp` — kiểm tra session/settings sau khi cài. Sửa phần tên lệnh, GIỮ phần path `.omp`. Xác nhận 9 lượt. Đây là bản cài source-link + tarball mà W10 nói là "đường duy nhất" chạy cả hai. | có |
| `scripts/install-tests/run-podman.sh` | sửa | 3 lượt `omp`. Xác nhận 3 lượt. | có |
| `flake.nix` | sửa | Đổi tên package/app attr `omp` (103,106,107,114,117,188,195), đường dẫn `bin/omp` (114), tên module `homeManagerModules.omp` / `nixosModules.omp` (199,201), tên assertion `omp-module-evaluation`/`omp-bun-lock` (174,177), `ompConfig` (171) — khoá ghép với `nix/home-manager.nix:53`, phải khớp. BỎ QUA 23 (`Intel-compatible`). GIỮ `programs.omp.*` (151,152,166) — xem phần Cần người quyết. **Anchor `flake.nix` của plan ĐÚNG nhưng KHÔNG ĐỦ** — plan chỉ liệt kê file này, bỏ qua cả thư mục `nix/`. | có |
| `nix/package.nix` | sửa | **27 dòng chứa `omp`, phân loại đủ 27 như sau.** ĐỔI (payload thật, 16 dòng): `pname = "omp"` (115), `pname = "omp-bun-runtime-template"` (98), `mainProgram = "omp"` (308), install `dist/omp` → `$out/bin/omp` (208), `$out/share/doc/omp/` (209,210), `remove-references-to … "$out/bin/omp"` (227), `patchelf --add-needed … "$out/bin/omp"` (247), `wrapProgram "$out/bin/omp"` (248), `fix-dt-verdef.ts "$out/bin/.omp-wrapped"` (265), smoke-test `"$out/bin/omp"` (275,277,282,296), `patchelf --print-needed "$out/bin/.omp-wrapped"` (287), chuỗi log "Compiling OMP" (198). ĐỔI KÈM (comment mô tả chính các dòng trên, cosmetic — 2 dòng): 244 (`$out/bin/omp`), 245 (`.omp-wrapped`). CẦN QUYẾT ĐỊNH (1): `homepage = "https://omp.sh"` (305) — cùng domain với `ci-update-brew-formula.ts:15`, phải quyết định một lần cho cả hai. BỎ QUA (false-positive tiếng Anh, KHÔNG đổi — 8): 142 `libgcc_s`, 213 `gzip-compressed`, 230 `omp bun-installs`, 256 `bun --compile`, 263 `` `.omp-wrapped` ``, 271 `death of omp`, 273 `surfaces omp's`, 286 `moved to .omp-wrapped`. `pname` và `mainProgram` phải khớp `flake.nix`. **Plan bỏ sót hoàn toàn.** `pname` là danh tính package trong Nix — đổi nó đổi tên store path và attribute, phải khớp với `flake.nix`. | có |
| `nix/home-manager.nix` | sửa | QUYẾT ĐỊNH, xem phần Cần người quyết. Ba nhóm: (a) `options.programs.omp` (14) + `config.programs.omp` (9) + `home.activation.ompConfig` (53) — tên option home-manager, là CONFIG NGƯỜI DÙNG; (b) `run mkdir -p "$HOME/.omp/agent"` (57) + `run install -m 600 ... "$HOME/.omp/agent/config.yml"` (58) — PATH literal, thuộc W4/W6; (c) `defaultText` (20) và comment (28). **Plan bỏ sót, và đây là khoảng trống NẶNG NHẤT của W10.** `programs.omp` là tên option mà người dùng viết trong `home.nix` của họ — đổi nó phá mọi config home-manager hiện hữu, đúng loại vi phạm mà §1.1 cấm. Khuyến nghị: GIỮ (b), thêm vào `do_not_rename` như N14. | có |
| `nix/nixos-module.nix` | sửa | Xác nhận không có hit `omp` trực tiếp; nó re-export từ `nix/package.nix`. **Plan bỏ sót** nhưng không có payload trực tiếp. | có |
| `nix/dev-shell.nix` | sửa | Xác nhận không có hit `omp` trực tiếp. **Plan bỏ sót** nhưng không có payload trực tiếp. | có |
| `scripts/ci-macos-sign.sh` | sửa | 1 lượt: dòng 62 `KEYCHAIN="$WORKDIR/omp-signing.keychain-db"` — tên file keychain tạm, thuần cosmetic, có thể đổi hoặc giữ. KHÔNG có tên nhị phân hardcode. **Đính chính plan:** rủi ro "ký dưới tên file cũ sẽ không notarize" là thật, nhưng KHÔNG phát sinh từ file này. Script nhận `<path-to-binary>` làm tham số (dòng 26) và ký bất kỳ thứ gì được đưa vào. Rủi ro thật là TÊN FILE được nộp lên Apple — nó đến từ `ci.yml:1206-1213`, không phải từ đây. | có |
| `scripts/ci-release-publish.ts` | sửa | KHÔNG SỬA Ở W10 — dòng 165 `publishBin` thuộc W9. Chỉ xác nhận nó tồn tại để ma trận cài biết tên lệnh. Plan liệt kê file này trong phạm vi W10 nhưng cũng nói nó thuộc W9. Xác nhận W9 sở hữu. | có |
| `scripts/rename/keep-list.txt` | tạo | W10 đóng góp 4 mục: `omp-kata` (N12, lý do "đăng ký ngoài repo"), `https://omp.sh` (domain, lý do "chưa chắc domain mới resolve"), `programs.omp` (option home-manager, lý do "config người dùng viết tay"), `install.sh`/`install.ps1` tên nhị phân (nếu giữ bí danh). **Thư mục chưa tồn tại:** `ls scripts/rename/` → No such file or directory. Đây là tiền đề của W7, không phải W10, nhưng W10 không thể chạy nếu nó chưa có — vì không có gì để loại trừ. | có |

### Cách an toàn khi thay chuỗi

**Hoàn tác:** toàn bộ W10 nằm trong MỘT commit, chưa push. Nếu sai: `git reset --hard HEAD` là đủ — không có việc nào ngoài cây (không có state ngoài repo, không có release đã phát). TUYỆT ĐỐI không push từng phần; đổi tên nửa vế rồi push là mất tiền.

**Cách biết diff ĐÚNG, không chỉ sạch:** cổng ở mục "Cổng hoàn thành" chỉ bắt được lệch tên asset (và chỉ theo chiều mà assertion đọc chéo bắt được — xem mục đó). Ba thứ nó KHÔNG bắt và phải soi tay: (1) `Dockerfile` vs `Dockerfile.robomp` — chạy `grep -n 'ARG PI_BASE\|^FROM ' Dockerfile Dockerfile.robomp` và đối chiếu TỪNG CẶP tên tag, không so văn bản; (2) `scripts/install.sh:241,266,268-269` — TÊN ASSET và TÊN NHỊ PHÂN phải khớp, tách là 404 cho người dùng; (3) `nix/package.nix` vs `flake.nix` — `pname`/`mainProgram` phải khớp, cùng khoá `ompConfig` ở `flake.nix:171` ↔ `nix/home-manager.nix:53`.

**Review:** người duyệt phải đọc `git add -A && git diff --cached --stat` trước (bắt buộc `--cached`, vì bảng này gồm cả file MỚI mà `git diff --stat` không thấy) và ĐẢM BẢO số file khớp với 30 dòng bảng "File cần chạm tới"; lệch số file là dấu hiệu `sed` quét rộng hơn dự kiến — dừng lại. Thêm một lượt `git diff .github/ \| grep -i kata` vì không có tấm chắn tự động nào cho nhãn runner.

### Các bước

1. **DỪNG.** Trước khi sửa dòng nào: xác nhận `scripts/rename/keep-list.txt` tồn tại trên main, đã được một người duyệt KHÁC người viết. Nếu chưa có, W10 không thể bắt đầu — không phải vì khó, mà vì không có danh sách loại trừ để `sed` nạp. Kiểm tra: `ls scripts/rename/keep-list.txt`. Neo: `scripts/rename/keep-list.txt` (chưa tồn tại).
2. Thêm `scripts/ci-update-brew-formula.test.ts` vào script `test:scripts` ở dòng 91, chèn trước `scripts/release.test.ts`. Đây là tiền đề: phải có tấm chắn homebrew TRƯỚC khi đổi tên, không phải sau. Chạy `bun test scripts/ci-update-brew-formula.test.ts` xanh TRƯỚC khi đổi bất kỳ tên nào — bằng chứng nền. Neo: `package.json:91`.
3. Chụp baseline asset hiện tại, để sau này đối chiếu: `git grep -n 'outfile: "packages/coding-agent/binaries/' scripts/ci-release-build-binaries.ts > /tmp/w10-assets-before.txt`. Ghi lại nội dung này vào PR. Neo: `scripts/ci-release-build-binaries.ts:37,44,51,58,65,72,79,86`.
4. **ĐỔI TÊN ASSET — cả hai vế TRONG CÙNG MỘT COMMIT.** Producer: 8 dòng `outfile` ở `ci-release-build-binaries.ts`. Consumer: KHÔNG sửa (`update-cli.ts` đã đọc `APP_NAME`). Sửa `scripts/ci-update-brew-formula.ts` 9 dòng 76,78,81,83,89,91,94,96,120 VÀ fixture trong `ci-update-brew-formula.test.ts`. Đây là bước DỄ SAI NHẤT về thứ tự: thiếu một vế = updater 404. Neo: `scripts/ci-release-build-binaries.ts:37-86`; `scripts/ci-update-brew-formula.ts:76,78,81,83,89,91,94,96,120`.
5. **ĐỔI DOCKER — sửa `Dockerfile` và `Dockerfile.robomp` CÙNG LÚC, không phải tuần tự.** `Dockerfile`: 3,13,14,17,18,21,186 (oh-my-pi) + 180,181,216 (shim omp). `Dockerfile.robomp`: 5,12,19 + stage name 39,41. Bắt buộc: `ARG PI_BASE` ở `Dockerfile.robomp:19` phải trỏ tới tag MÀ `Dockerfile` thực sự build ra. Kiểm tra bằng `grep -n 'ARG PI_BASE\|FROM ${PI_BASE}\|^FROM ' Dockerfile Dockerfile.robomp` và đối chiếu tay từng cặp. Neo: `Dockerfile.robomp:19` (ARG PI_BASE) + `Dockerfile.robomp:41` (FROM ${PI_BASE}).
6. **GIỮ NHIỀU HƠN MỘT:** xác nhận `.omp/plugins/` trong 3 file dockerignore (`.dockerignore:32`, `Dockerfile.dockerignore:27`, `Dockerfile.robomp.dockerignore:32`) và `~/.omp/agent` trong `nix/home-manager.nix:57,58` vẫn nguyên vẹn. Chúng là PATH, thuộc W4/W6, không thuộc W10. Chạy `git grep -n '\.omp' -- .dockerignore Dockerfile.dockerignore Dockerfile.robomp.dockerignore nix/home-manager.nix` và xác nhận khớp baseline. Neo: `.dockerignore:32`; `Dockerfile.dockerignore:27`; `Dockerfile.robomp.dockerignore:32`; `nix/home-manager.nix:57,58`.
7. **ĐỔI NIX** — `nix/package.nix` (27 dòng chứa `omp`: pname 115, pname 98, `mainProgram` 308, install 208-210, remove-references 227, patchelf 247, wrapProgram 248, fix-dt-verdef 265, smoke-test 275,277,282,296, patchelf --print-needed 287, log 198, comment 244,245; BỎ QUA 8 dòng false-positive — xem hàng bảng) và `flake.nix` (103,106,107,114,117,**171**,174,177,188,195,199,201) phải khớp nhau: `pname`/`mainProgram` trong `package.nix` là thuộc tính mà `flake.nix` expose. **171 (`assert homeManagerEvaluation.config.home.activation ? ompConfig`) là khoá ghép với `nix/home-manager.nix:53` (`home.activation.ompConfig`) — hai tên phải tồn tại cùng nhau, đổi một vế là `nix flake check` đỏ.** BỎ QUA 23 (`Intel-compatible`, chứa `omp` trong `compatible`). QUYẾT ĐỊNH riêng cho `nix/home-manager.nix:9,14,53` (`programs.omp`) — xem phần Cần người quyết; khuyến nghị GIỮ và thêm vào keep-list. Neo: `nix/package.nix:115`; `flake.nix:103`; `nix/home-manager.nix:14`.
7b. **NIX — kiểm chứng hoặc ghi rõ là chưa chạy.** Nếu máy có `nix` (`command -v nix`), chạy `nix flake check` và `nix build .#default` rồi `nix run .#default -- --version` để xác nhận `pname`/`mainProgram` khớp. Nếu máy KHÔNG có `nix` (đã kiểm trên máy soạn đặc tả: `nix not found`), ghi rõ vào PR là **CHƯA CHẠY** — tuyệt đối không tính là pass, vì toàn bộ rủi ro `programs.omp` và `pname` nằm ở đây mà cổng không đụng tới.
8. **ĐỔI INSTALLER** — `scripts/install.sh` và `scripts/install.ps1`. Bắt buộc sửa TÊN ASSET và TÊN NHỊ PHÂN cùng lúc trong `install.sh`: dòng 241 sinh tên asset, 266 dựng URL, 268-269 ghi file. GIỮ path `.omp\agent` (`install.ps1:149`), `$env:LOCALAPPDATA\omp` (`install.ps1:29`), `omp-install-*` (`install.ps1:225`) vì N14. Đây là đường cài primary (`README.md:40,85`) — plan không nhắc tới nó. Neo: `scripts/install.sh:241,266,268-269`; `scripts/install.ps1:49,308`.
9. **THỐNG NHẤT CHỒNG LẤN TRƯỚC KHI CODE:** `scripts/install-tests/run-ci.sh` thuộc W7 (tên tarball theo scope: 164,170,173,190,196,199,221,222) + W9 (tên binary: 94,103,235) + W10 (ma trận cài). Ba work item cùng sửa một file. Phải chọn một chủ sở hữu và ghi quyết định vào PR, nếu không sẽ có conflict và mất thay đổi. **Kèm hợp đồng hai file: `OMP_INSTALL_TEST_SKIP_NATIVE_BUILD` đọc ở `run-ci.sh:86` và đặt ở `ci.yml:723` — sửa cả hai cùng lúc, nếu không CI sẽ âm thầm build native thay vì bỏ qua.** Neo: `scripts/install-tests/run-ci.sh:86,94,164,170,173,190,196,199,221,222,235`.
10. **ĐỔI CI** — `.github/workflows/ci.yml`. Dùng BẢNG QUYẾT ĐỊNH, không dùng `sed`.
    - Nhóm ĐỔI: binary_path 776,785,793,802,810,821,909,922; upload name 873,994,1019; glob 1175,1185; download 1206,1207,1210,1211,1213; shim 864; omp-smoke 1024; Formula/omp.rb 1321,1329; browser-relay zip 1176,1186; oh-my-pi x2.
    - Nhóm GIỮ: `omp-kata` (12 dòng runs-on: 159,229,285,513,567,598,621,639,657,675,695,711 + 4 comment 85,108,186,573), `branches: [main, omp2]` 34 và comment 578, 12 false-positive tiếng Anh (163,166,200,296,814,849,891,892,948,1006,1106).
    - Neo: `.github/workflows/ci.yml:776,785,793,802,810,821,909,922,873,994,1019,1175,1185,1206,1207,1210,1211,1213,864,1024,1321,1329`.
11. **XÁC NHẬN NHIỀU HƠN MỘT Ở `.github/`:** chạy `grep -rn 'omp-kata' .github/` và xác nhận vẫn còn NHIỀU HƠN 12 dòng — 7 file, không chỉ ci.yml. Cụ thể phải giữ: `actionlint.yaml:2,6` (allowlist nhãn — giữ cho đúng, nhưng KHÔNG phải tấm chắn vì actionlint không chạy trong CI), `bun-install/action.yml:5,6,16,54,95,104`, `bazel-cache/action.yml:7`, `bazel-natives/action.yml:5`, `native-artifacts/action.yml:6`, `workflows/bazel-cache-warm.yml:97`. Neo: `.github/actionlint.yaml:6`; `.github/actions/bun-install/action.yml:5,6,16,54,95,104`.
12. **ĐỐI CHIẾU ASSET HAI VẾ** (thay cho lệnh §3.1 của plan, vì lệnh đó không bao giờ xanh — xem phần Đính chính). Chạy `git grep -o 'outfile: "packages/coding-agent/binaries/[^"]*"' scripts/ci-release-build-binaries.ts | sed 's|.*/||; s|"||' | sort -u` và `grep -n 'APP_NAME}-' packages/coding-agent/src/cli/update-cli.ts`. Rồi đọc `APP_NAME` từ `packages/utils/src/dirs.ts` và xác nhận TIỀN TỐ của cả 8 tên outfile khớp đúng `${APP_NAME}-`. Đây là kiểm tra GIÁ TRỊ ĐÃ PHÂN GIẢI, không phải so khớp văn bản. Neo: `scripts/ci-release-build-binaries.ts:37-86` vs `packages/coding-agent/src/cli/update-cli.ts:1206,1208`.
13. Cập nhật keep-list với 4 mục W10 và chạy `git grep -c -f scripts/rename/keep-list.txt` xác nhận chỉ trả về các mục đã liệt kê. Sau đó chạy cổng. Neo: `scripts/rename/keep-list.txt`.
14. Chạy cổng (xem mục Cổng hoàn thành). Kỳ vọng 37 pass / 0 fail. KHÔNG dùng `bun run test:scripts` (xem mục Cổng hoàn thành). **Lưu ý: `git diff --quiet HEAD -- packages/natives/package.json` ở bước này là kiểm tra sơ bộ — `run-ci.sh` chưa chạy nên file chưa ai đụng; kiểm tra thật là ở CUỐI bước 15, sau khi ma trận cài đặt đã chạy xong.** Sau đó mới chạy `bash scripts/install-tests/run-ci.sh` nếu máy có docker/podman. Neo: `package.json:91`.
15. **MA TRẬN CÀI ĐẶT** — chạy `bash scripts/install-tests/run-ci.sh`. Đây là đường DUY NHẤT chạy cả bản cài source-link lẫn tarball dưới tên mới. Sau khi chạy xong, bắt buộc `git diff --quiet HEAD -- packages/natives/package.json` (script có trap khôi phục nhưng đừng tin nó; so với `HEAD` để bắt cả phần đã staged). Nếu máy không có docker hoặc podman, ghi rõ vào PR là CHƯA chạy — đừng tính là pass. Neo: `scripts/install-tests/run-ci.sh`.

### Hình dạng code

Không có file TypeScript production mới. W10 là một lượt đổi chuỗi có kiểm soát trên ~20 file hạ tầng, cộng MỘT thay đổi dòng `package.json:91` và MỘT quyết định scope cho `nix/home-manager.nix`. Hình dạng quan trọng nhất không nằm ở code mà ở bảng phân loại 3 nhóm: (i) ĐỔI — tên asset release, tên image Docker, tên package nix, tên nhị phân installer; (ii) GIỮ — `omp-kata` (12 dòng `runs-on:` trong `ci.yml` + **16** dòng comment: 4 trong `ci.yml` (85,108,186,573) và 12 trong 6 file `.github/` khác), `https://omp.sh/` (domain chưa chắc resolve), `programs.omp` (option home-manager là config người dùng); (iii) BỎ QUA — 12 lượt trên 11 dòng là tiếng Anh chứa `omp`: `compliance` (163), `compiled` (166), `compares` (200), `Compute` (296), `cross-compiled` (814), `--compile` + `cross-compile.` (849), `cross-compiles` (891,892), `compressing` (948), `--compile` (1006), `completion` (1106). Lưu ý `Compute` VIẾT HOA và `compares` — KHÔNG phải `computes` (token này không tồn tại trong `ci.yml`). Một `sed` không phân biệt sẽ phá hỏng cả 12.

### Hợp đồng test

KHÔNG có test mới. Hợp đồng được bảo vệ bởi 4 bộ test release có sẵn + 1 bộ bị bỏ sót phải đưa vào gate:

- `scripts/ci-update-brew-formula.test.ts` (3 pass) chỉ bảo vệ khớp giữa `ci-update-brew-formula.ts` và fixture `SUMS` của chính nó (dòng 4-9) — KHÔNG bảo vệ khớp với producer. Nó nạp fixture riêng rồi gọi `renderFormula`, không hề đọc `ci-release-build-binaries.ts`; phần đó do assertion đọc chéo hai file ở cổng hoàn thành đảm nhiệm. Nó KHÔNG nằm trong `test:scripts` nên phải thêm vào.
- `scripts/ci-release-build-binaries.test.ts` (4 pass) bảo vệ producer 8 dòng `outfile`.
- `scripts/ci-release-publish.test.ts` (11 pass) + `scripts/release.test.ts` (17 pass) bảo vệ bản đồ bin.
- `scripts/musl-release.test.ts` (2 pass).

Điều kiện đỏ được: nếu hồi quy, người tiêu dùng thấy updater 404 — đổi tên asset ở producer mà không đổi consumer (hoặc ngược lại) làm bản đồ lệch và bộ brew/binary đỏ. KHÔNG viết test mới vì mọi thứ W10 đổi đều là chuỗi hạ tầng đã được một bộ test đọc; test mới ở đây chỉ là bản sao của AGENTS.md cấm.

### Xác minh

Mọi số dưới đây đã chạy thật trên HEAD `1454dc0` (branch `milestone-1`) vào 2026-09-28. `bun run test:scripts` → 34 pass/1 fail/1 error (lỗi addon, không phải hồi quy). `bun test scripts/ci-update-brew-formula.test.ts` → 3 pass/0 fail/15 expect. Bốn file release còn lại chạy riêng: 4/2/11/17 pass, 0 fail. `bun run check:ts` là cổng kiểu duy nhất còn chạy được (exit 0 ~29s trên máy rảnh). `bun test` bị chặn **một phần** bởi native addon; lệnh gỡ chặn `bun --cwd=packages/natives run build` THẤT BẠI trên máy này vì thiếu Ninja — phải `brew install ninja` trước, rồi `cmake` build của `opusic-sys` mới chạy.

```bash
# Bước 2 — bằng chứng nền, TRƯỚC khi đổi bất kỳ tên nào
bun test scripts/ci-update-brew-formula.test.ts

# Bước 3 — baseline asset
git grep -n 'outfile: "packages/coding-agent/binaries/' scripts/ci-release-build-binaries.ts > /tmp/w10-assets-before.txt

# Bước 5 — cặp ARG/FROM của hai Dockerfile
grep -n 'ARG PI_BASE\|FROM ${PI_BASE}\|^FROM ' Dockerfile Dockerfile.robomp

# Bước 6 — path phải giữ nguyên
git grep -n '\.omp' -- .dockerignore Dockerfile.dockerignore Dockerfile.robomp.dockerignore nix/home-manager.nix

# Bước 11 — nhãn runner phải còn hơn 12 dòng, 7 file
grep -rn 'omp-kata' .github/

# Bước 12 — đối chiếu asset hai vế
git grep -o 'outfile: "packages/coding-agent/binaries/[^"]*"' scripts/ci-release-build-binaries.ts | sed 's|.*/||; s|"||' | sort -u
grep -n 'APP_NAME}-' packages/coding-agent/src/cli/update-cli.ts

# Bước 7b — nix (bỏ qua nếu máy không có nix, nhưng phải ghi "chưa chạy")
command -v nix && nix flake check && nix build .#default && nix run .#default -- --version

# Bước 13 — keep-list
git grep -c -f scripts/rename/keep-list.txt

# Bước 15 — ma trận cài (bỏ qua nếu máy không có docker/podman, nhưng phải ghi "chưa chạy")
bash scripts/install-tests/run-ci.sh
git diff --quiet HEAD -- packages/natives/package.json
```

### Cổng hoàn thành

```bash
bun run check:ts && bun test scripts/ci-release-build-binaries.test.ts scripts/musl-release.test.ts scripts/ci-release-publish.test.ts scripts/release.test.ts scripts/ci-update-brew-formula.test.ts && bun -e '
const p = await Bun.file("scripts/ci-release-build-binaries.ts").text();
const c = await Bun.file("scripts/ci-update-brew-formula.ts").text();
const produced = [...p.matchAll(/outfile: "packages\/coding-agent\/binaries\/([^"]+)"/g)].map(m => m[1]);
const block = [...c.matchAll(/const targets = \[([^\]]*)\]/gs)][0][1];
const wanted = [...block.matchAll(/"([^"]+)"/g)].map(m => m[1]);
const missing = wanted.filter(n => !produced.includes(n));
if (missing.length) { console.error("MISSING producer outfile:", missing); process.exit(1); }
console.log("asset map ok:", produced.length, "produced,", wanted.length, "consumed");
' && git diff --quiet HEAD -- packages/natives/package.json
```

Kỳ vọng: **37 pass / 0 fail** (4 + 2 + 11 + 17 + 3), rồi dòng `asset map ok: 8 produced, 4 consumed`. `git diff --quiet HEAD -- packages/natives/package.json` là chốt chặn vì `run-ci.sh` có `trap restore_workspace` ghi lại file này — chạy ma trận cài đặt xong phải sạch. So với `HEAD`, không phải index: `git diff --quiet` trần không thấy thay đổi đã `git add`, nên kỹ sư chạy `git add` rồi chạy cổng sẽ vẫn xanh trên một file đã bị sửa.

**Phạm vi cổng: CHỈ 5 file test release + `check:ts` + assertion đọc chéo asset.** KHÔNG file nào trong cổng đọc `nix/*`, `flake.nix`, `Dockerfile*`, hay `.github/**` — những phần này phải soi tay theo bước 7b và bước 15. (`scripts/musl-release.test.ts:78` là ngoại lệ duy nhất: nó chạy `install.sh` với `curl` giả, nên nó bắt được lệch TÊN ASSET với TÊN NHỊ PHÂN trong `install.sh` — nhưng chỉ với nhánh musl, và KHÔNG bắt được installer PowerShell.)

CỔNG CỐ Ý KHÔNG dùng `bun run test:scripts`. Đã chạy thật: `bun run test:scripts` cho `34 pass / 1 fail / 1 error` vì `scripts/ci-test-ts.test.ts` nạp native addon (`Failed to load pi_natives native addon for darwin-arm64`). Lỗi đó là MÔI TRƯỜNG, không phải hồi quy — nhưng một cổng báo `1 fail` không phân biệt được "xong" với "máy thiếu addon". Cổng ở trên liệt kê tường minh 5 file, tất cả đều là test chuỗi thuần và chạy được.

**5 file test ĐƯỢC ĐỎ MỘT CHIỀU — không đủ, vì vậy cổng mới thêm assertion đọc chéo.** Thí nghiệm thật trên HEAD `1454dc0`: đổi 4 dòng `outfile` darwin/linux ở `ci-release-build-binaries.ts:37,44,51,58` mà bỏ `ci-update-brew-formula.ts` thì cả 5 file vẫn **37 pass / 0 fail**. Lý do: `ci-update-brew-formula.test.ts` tự cấp fixture `SUMS` (dòng 4-9) và chỉ `import { renderFormula }` (dòng 2) — không hề đọc producer; `ci-release-build-binaries.test.ts` chỉ assert 2 outfile windows (dòng 19,21,23,25), không asset darwin/linux nào mà brew dùng. Chiều ngược lại thì đỏ: đổi tên asset trong URL của consumer (`ci-update-brew-formula.ts:76`) cho **35 pass / 2 fail**. Chiều mỏng chính là chiều nguy hiểm — đó đúng là kịch bản bước 4 gọi là "bước DỄ SAI NHẤT". Assertion `asset map ok` trong cổng là thứ duy nhất bắt được chiều đó: thử lại với `ci-release-build-binaries.ts:37` đổi tên, nó in `MISSING producer outfile: [ "omp-darwin-arm64" ]` và exit 1.

### Phụ thuộc

- `depends_on`: `W2`, `W7`, `W9`, `W13'`
- `blocks`: `W11`, `W12`, `W13`

### Cách sai dễ nhất

Cao nhất là `Dockerfile.robomp` — `ARG PI_BASE=oh-my-pi/pi:dev` tại dòng 19 là giá trị mà `FROM ${PI_BASE}` dòng 41 mở rộng; đổi tag ở `Dockerfile` mà bỏ sót file này thì job build image robomp trỏ tới tag không tồn tại, và job đó chạy ít nhất nên sẽ bị bỏ sót lâu nhất. Thứ hai là `nix/home-manager.nix` `programs.omp`: đây là tên option home-manager mà người dùng viết trong config của họ, không phải trạng thái máy — đổi nó phá mọi config home-manager hiện hữu, cùng loại với `.omp` cấp project (N14). Thứ ba là `scripts/install.sh` / `install.ps1`: đây là đường cài primary (`curl -fsSL https://omp.sh/install | sh`, `README.md:40`) và nó ghép TÊN ASSET với TÊN NHỊ PHÂN — `scripts/install.sh:241` `BINARY="omp-${PLATFORM}-${ARCH}"` rồi `:266` dựng URL từ đó, nên đổi một vế mà bỏ vế kia là 404. Thứ tư, thứ lặng im nhất: tin rằng `bun run test:scripts` phủ nhánh homebrew — nó không phủ, trước khi `scripts/ci-update-brew-formula.test.ts` được thêm vào.

### Cần người quyết

- **`nix/home-manager.nix:14` đặt `options.programs.omp`** — đây là tên option home-manager mà người dùng viết trong `home.nix` của họ. Đổi nó phá mọi config home-manager hiện hữu, cùng loại với `.omp` cấp project (N14) mà W6a đã quyết định giữ. KHUYẾN NGHỊ: giữ `programs.omp` nguyên vẹn, thêm vào `do_not_rename` với lý do "tên option là config người dùng viết tay, không phải trạng thái máy". CẦN QUYẾT ĐỊNH TRƯỚC khi sửa `nix/`. Nếu tổ chức muốn đổi, cần alias option mới → option cũ trước.
- **`scripts/ci-update-brew-formula.ts:15` `HOMEPAGE = "https://omp.sh"`** — domain thứ BA đóng attribution (hai cái kia là `APP_URL` ở `dirs.ts:24` và `USER_AGENT` ở `dirs.ts:36`, đã nằm trong N9). Có domain mới thật sự resolve chưa? Nếu chưa, giữ `https://omp.sh` và ghi vào keep-list — Formula trỏ host chết thì `brew install` vẫn chạy nhưng attribution về OpenRouter/Vercel hỏng.
- **`README.md:40` (`curl -fsSL https://omp.sh/install | sh`) và `:85` (`irm https://omp.sh/install.ps1 | iex`) phụ thuộc domain.** Nếu domain đổi, các lệnh cài này trong README và trên trang chủ phải đổi cùng một lần phát hành. Tài liệu thuộc W13, nhưng W10 sửa `scripts/install.sh` — hai bên phải thống nhất tên.
- **`ci.yml:34` `branches: [main, omp2]` và comment `:578`.** Đã kiểm tra: KHÔNG có nhánh `omp2` nào trên `origin` (chỉ `main` và `milestone-1`). Đây có thể là filter push chết, hoặc nhánh chỉ tồn tại trên fork gốc. KHÔNG tự ý xoá — hỏi maintainer. Đây là trigger filter, đổi nó ảnh hưởng ai được chạy CI.
- **`Cargo.toml:30` `homepage = "https://omp.sh/"` và `:31` `repository = "https://github.com/can1357/oh-my-pi"`** — metadata phân phối crate, trỏ về org cũ. Nằm ngoài danh sách file của plan. Có thuộc W10, hay để W13? Lưu ý `repository` trỏ org khác hẳn (`can1357` vs `ultrabuilders`) — đây có thể là quyết định có chủ ý đã có, đừng đổi bừa.
- **W10 có cần một hàng changelog không?** AGENTS.md nói changelog chỉ cập nhật khi được yêu cầu, và hướng dẫn M5 nói rõ đừng tự thêm. Đặc tả này KHÔNG đề xuất hàng changelog cho W10 — đây là hạ tầng, người dùng không thấy gì. Nếu release-notes sinh từ commit thì không cần.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| W10 §Chi tiết + §2.2 hàng 15: `.github/workflows/ci.yml` có 53 lượt `omp` trên 50 dòng, đo bằng `git grep -o 'omp' -- .github/workflows/ci.yml \| wc -l` (→ 53) và `git grep -c 'omp' ...` (→ 50). | sai | Con số 53 là ĐÚNG, nhưng lệnh ghi kèm trả về 65/62 — sai. Số thật: 65 lượt trên 62 dòng. Trong đó 12 lượt trên 11 dòng là false-positive tiếng Anh (`cross-compiles`, `--compile`, `cross-compiled`, `cross-compile\.`, `Compute`, `compressing`, `compliance`, `completion`, `compiled`, `compares` — dòng 163,166,200,296,814,849,891,892,948,1006,1106). Brand thật = 53 lượt / 51 dòng. Kỹ sư chạy đúng lệnh của plan sẽ thấy 65 và tưởng có 12 hit lạ. Bằng chứng: `git grep -o 'omp' -- .github/workflows/ci.yml \| wc -l` → 65. `git grep -c 'omp' -- .github/workflows/ci.yml` → `.github/workflows/ci.yml:62`. `grep -oE 'cross-compiles\|--compile\|cross-compiled\|cross-compile\.\|Compute\|compressing\|compliance\|completion\|compiled\|compares' .github/workflows/ci.yml \| wc -l` → 12 trên 11 dòng. |
| §2.2 hàng 16: Docker = 10 lượt / 4 file; `Dockerfile:13,14,17,18,21,178` (gồm biến thể tag `pi-base`), `Dockerfile.dockerignore:1`, `Dockerfile.robomp:5,12,19`. | sai | Số thật của chính lệnh plan: 11 dòng / 3 file. `Dockerfile:178` KHÔNG phải hit — dòng 178 thật là `'fi' \`. Plan BỎ SÓT `Dockerfile:3` (header `# oh-my-pi — pi image`) và `Dockerfile:186` (`docker run oh-my-pi/pi:dev --help`). Ngoài ra plan không nói tới 2 file dockerignore nữa (`.dockerignore`, `Dockerfile.robomp.dockerignore`) và không nói shim `omp` thật nằm ở `Dockerfile:180,181,216`. Bằng chứng: `git grep -n 'oh-my-pi' -- Dockerfile Dockerfile.dockerignore Dockerfile.robomp` cho 11 dòng: Dockerfile:3,13,14,17,18,21,186; Dockerfile.dockerignore:1; Dockerfile.robomp:5,12,19. `sed -n '178p' Dockerfile` → `'fi' \`. `ls Dockerfile*` → 4 file + `.dockerignore`. |
| §3.2 + §2.2 hàng 12: nhãn runner `omp-kata` xuất hiện ở 11 dòng `runs-on:` trong ci.yml, tại `:148,237,359,381,398,415,432,451,477,492` (dạng biểu thức) và `:191` (dạng nhãn trần). Toàn bộ repo còn lại chỉ dùng nhãn GitHub-hosted. | sai | Số ĐÚNG là 12 dòng `runs-on:.*omp-kata`, tại 159,229,285,513,567,598,621,639,657,675,695,711 (10 biểu thức + 2 nhãn trần tại 229 và 513). Mọi dòng plan liệt kê đều sai. Quan trọng hơn: nhãn KHÔNG chỉ ở ci.yml — nó còn ở 6 file khác trong `.github/` (12 dòng nữa), và `.github/actionlint.yaml:6` liệt kê nó trong allowlist. Plan nói "không test nào trong repo bắt được" là ĐÚNG: actionlint KHÔNG chạy trong CI (đã kiểm — `grep -rn 'actionlint' .github/workflows/ scripts/ package.json` không kết quả), nên `.github/actionlint.yaml` là cấu hình chết, phải giữ cho đúng nhưng không tính là tấm chắn. Bằng chứng: `grep -c 'runs-on:.*omp-kata' .github/workflows/ci.yml` → 12. `grep -rn 'omp-kata' .github/ \| grep -v 'workflows/ci.yml'` → actionlint.yaml (2), actions/bun-install/action.yml (6), actions/bazel-cache/action.yml (1), actions/bazel-natives/action.yml (1), actions/native-artifacts/action.yml (1), workflows/bazel-cache-warm.yml (1). |
| W10 §Chi tiết: `scripts/ci-update-brew-formula.ts` có 18 lượt. | sai | Thật là 28 lượt `omp`. Danh sách DÒNG plan đưa (76,78,81,83,89,91,94,96,120) là ĐÚNG — đã đối chiếu từng dòng. Nhưng plan bỏ sót `HOMEPAGE = "https://omp.sh"` ở dòng 15, đây là domain sống được nhúng vào Formula sinh ra, và là nơi thứ BA đóng attribution sau `APP_URL`/`USER_AGENT` (N9 chỉ phủ `dirs.ts:24,36`). Bằng chứng: `grep -o 'omp' scripts/ci-update-brew-formula.ts \| wc -l` → 28. `git grep -o 'oh-my-pi' -- scripts/ci-update-brew-formula.ts \| wc -l` → 1, đó là **dòng 14** (`const REPO = process.env.OMP_REPO ?? "can1357/oh-my-pi";`) — nơi mọi URL ở 76,81,89,94 lấy repo từ. Dòng 15 là `const HOMEPAGE = "https://omp.sh";` (không phải nơi chứa `oh-my-pi`). `git grep -n OMP_REPO` → dùng chung ở `scripts/ci-update-brew-formula.ts:14`, `scripts/ci-release-notes.ts:36`, `scripts/fix-changelogs.ts:12`, `scripts/ci-macos-upload-secrets.sh:32`, `scripts/fix-changelogs.test.ts:442`, và không chỗ nào trong CI đặt nó. |
| W10 §Test cần viết: `git grep "ci-update-brew-formula.test"` trả về KHÔNG kết quả nào trong toàn repo. | sai | Lệnh đó KHÔNG rỗng — nó trả về 2 hit, vì chính tài liệu kế hoạch chứa chuỗi đó. Kết luận của plan (file không nằm trong `test:scripts`) vẫn ĐÚNG và đã xác nhận độc lập. Nhưng lệnh bằng chứng thì tự tham chiếu chính nó, nên kỹ sư dùng lại sẽ tưởng plan sai ở chỗ đúng. Lệnh đúng phải loại markdown. Bằng chứng: `git grep -n "ci-update-brew-formula.test" -- .` → 2 hit, cả hai trong `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:14024,14026`. Lệnh đúng: `git grep -n "ci-update-brew-formula" -- ':!*.md'` → 5 hit thật (ci.yml:1321, test.ts:2, ts:9,10,33). |
| §3.1 lệnh kiểm tra: `git grep -n 'outfile: "packages/coding-agent/binaries/' …` + `grep -n 'APP_NAME}-' …` với chú thích "tiền tố của 8 dòng outfile phải khớp đúng `${APP_NAME}-`". | sai | Cổng này KHÔNG BAO GIỜ XANH. 8 dòng `outfile` là literal hardcode; chúng không thể khớp văn bản với `${APP_NAME}-` — đó là placeholder TypeScript, không xuất hiện trong file đó. Chạy lệnh này sau khi làm đúng mọi thứ vẫn đỏ, hoặc (tệ hơn) kỹ sư sửa lệnh cho "xanh" bằng cách nới điều kiện, tức là biến nó thành tautology. Phải viết lại thành so sánh GIÁ TRỊ ĐÃ PHÂN GIẢI: đọc `APP_NAME` từ `dirs.ts`, tách tiền tố 8 tên outfile, so trực tiếp. Bằng chứng: `grep -n 'outfile:' scripts/ci-release-build-binaries.ts` → 8 literal `omp-*` (dòng 37,44,51,58,65,72,79,86). `grep -n 'APP_NAME}-' packages/coding-agent/src/cli/update-cli.ts` → 1206,1208. Không file nào chứa chuỗi `${APP_NAME}-` ở producer. |
| W10 §Lệnh: `bun run test:scripts && bash scripts/install-tests/run-ci.sh` là cổng nghiệm thu. | sai | Trên máy này cổng đó BỊ CHẶN và báo đỏ vì lý do môi trường, không phải hồi quy: `34 pass / 1 fail / 1 error`, lỗi `Failed to load pi_natives native addon for darwin-arm64`. Nguyên nhân chính xác là `scripts/ci-test-ts.test.ts` (0 pass / 1 fail) — file duy nhất trong 5 file nạp native addon. Bốn file còn lại chạy hoàn hảo. Đây đúng là trường hợp cổng không phân biệt được "đã làm" với "test không chạy được": một `1 fail` mơ hồ. Cổng phải liệt kê tường minh 5 file (thêm `ci-update-brew-formula.test.ts`) và bỏ `ci-test-ts.test.ts`. Bằng chứng: `bun run test:scripts` → `34 pass / 1 fail / 1 error`, `Ran 35 tests across 5 files`, `error: script "test:scripts" exited with code 1`. Chạy từng file: ci-test-ts `0 pass 1 fail`; ci-release-build-binaries `4 pass`; musl-release `2 pass`; ci-release-publish `11 pass`; release `17 pass`; ci-update-brew-formula `3 pass / 15 expect`. |
| W10 §Chi tiết + §Vị trí: phạm vi nix của W10 là `flake.nix`. | sai | Bề mặt nix rộng hơn nhiều. `nix/package.nix` có `pname = "omp"` (115) — đây là danh tính package Nix, đổi nó đổi store path và attribute — cùng install (208-210), `remove-references-to` (227), `pname = "omp-bun-runtime-template"` (98), `$out/bin/.omp-wrapped` (245). `nix/home-manager.nix` đặt option `programs.omp` (9,14) và `home.activation.ompConfig` (53) — TÊN OPTION MÀ NGƯỜI DÙNG VIẾT TRONG CONFIG CỦA HỌ — đồng thời ghi settings vào `$HOME/.omp/agent/config.yml` (57,58). Đổi `programs.omp` phá mọi config home-manager hiện hữu. Khuyến nghị giữ, thêm vào `do_not_rename` như N14. Bằng chứng: `git grep -cE 'omp' -- nix/package.nix` → **27**; danh sách thật 98,115,142,198,208,209,210,213,227,230,244,245,247,248,256,263,265,271,273,275,277,282,286,287,296,305,308. Đặc tả cũ chỉ nêu 10 dòng; 17 dòng còn lại gồm 8 dòng payload thật (247,248,265,275,277,282,287,296) cùng `mainProgram` (308) và `homepage` (305). `grep -nE 'omp' nix/home-manager.nix` → 9,11,14,20,28,53,57,58. `flake.lock` có 0 hit. |
| W10 §Chi tiết: phạm vi là ci.yml, 3 file Docker, ci-update-brew-formula.ts, flake.nix, scripts/install-tests/. | sai | THIẾU HẲN ĐƯỜNG CÀI PRIMARY. `scripts/install.sh` (13 lượt / 11 dòng) và `scripts/install.ps1` (10 lượt / 10 dòng) tồn tại và là thứ `README.md:40` (`curl -fsSL https://omp.sh/install \| sh`) và `:85` (`irm https://omp.sh/install.ps1 \| iex`) trỏ tới. install.sh ghép TÊN ASSET với TÊN NHỊ PHÂN: dòng 241 `BINARY="omp-${PLATFORM}-${ARCH}"`, 266 dựng URL từ đó, 268-269 ghi `${INSTALL_DIR}/omp`. Tách hai vế = 404 cho mọi người dùng cài mới. Bằng chứng: `ls scripts/install*` → install.sh (9.7 KB), install.ps1 (12 KB). `sed -n '40p;85p' README.md` → `curl -fsSL https://omp.sh/install \| sh` / `irm https://omp.sh/install.ps1 \| iex`. `grep -c omp scripts/install.sh` → 11 dòng. |
| W10 §Chi tiết: `scripts/install-tests/*` (`run-ci.sh` và anh em) thuộc phạm vi W10. | sai | `run-ci.sh` là điểm CHỒNG LẤN BA CHIỀU mà plan không nói: nó mang TÊN TARBALL THEO SCOPE npm (164 `oh-my-pi-omptype-*.tgz`, 170 `oh-my-pi-snapcompact-*.tgz`, 173 `oh-my-pi-omp-stats-*.tgz`) và scoped deps (190,196,199,221,222) — thuộc W7; TÊN NHỊ PHÂN (94 `dist/omp`, 103, 235 `node_modules/.bin/omp`) — thuộc W9; và ma trận cài — thuộc W10. Ba work item cùng sửa một file mà plan gán riêng cho W10. Ngoài ra run-ci.sh có `trap restore_workspace` (10-19) ghi lại `packages/natives/package.json` — cần một assertion sạch sau khi chạy. Bằng chứng: `grep -nE 'omp' scripts/install-tests/run-ci.sh` → 37 lượt, gồm 94,164,170,173,190,196,199,221,222,235. `sed -n '10,19p' scripts/install-tests/run-ci.sh` → `NATIVES_PACKAGE=…; cp …; restore_workspace() { cp …; rm -rf …; }; trap restore_workspace EXIT`. |
| W10 §Rủi ro: "bỏ sót bước ký macOS — một binary đã ký dưới tên file cũ sẽ không notarize". | sai một phần | Rủi ro notarize là thật nhưng KHÔNG nằm ở `scripts/ci-macos-sign.sh`. Script nhận `<path-to-binary>` làm tham số (dòng 26) và ký bất kỳ thứ gì được đưa vào — chỉ có 1 lượt `omp` trong toàn file, tên keychain tạm ở dòng 62, thuần cosmetic. Rủi ro thật là TÊN FILE được nộp lên Apple, và nó đến từ `ci.yml:1206-1213` (`curl -o omp-darwin-arm64` rồi codesign/verify/notarize file đó). Nói sai nguồn sẽ khiến kỹ sửa file sai. Bằng chứng: `grep -n 'omp' scripts/ci-macos-sign.sh` → chỉ dòng 62 `KEYCHAIN="$WORKDIR/omp-signing.keychain-db"`. Dòng 26: `usage: scripts/ci-macos-sign.sh <path-to-binary>`. `sed -n '1206,1213p' .github/workflows/ci.yml` → curl tải `omp-darwin-arm64` rồi codesign/verify/notarize chính file đó. |
| §2.3: keep-list sống ở `scripts/rename/keep-list.txt` và là tiền đề của W7. | chưa kiểm chứng — thư mục chưa tồn tại | `scripts/rename/` KHÔNG tồn tại trong cây hiện tại. Đây là tiền đề của W7 theo plan, nhưng W10 cũng không thể chạy nếu chưa có: không có keep-list thì không có gì để loại trừ, và bước 1 của đặc tả này là dừng lại chờ nó. Ngoài ra §2.3 nói "đã kiểm chứng trên HEAD 5873776" trong khi HEAD thật của máy này là `1454dc0` — con số SHA trong plan đã cũ. Bằng chứng: `ls -la scripts/rename/` → `No such file or directory`. `git log --oneline -1` → `1454dc0 docs: record the two architecture decisions…`. |
| Ghi chú đầu bài: work item W10 nằm ở dòng 13919–13939 của plan. | sai | Dòng 13919–13939 là W7 và W8a. W10 (bản CI/release/Docker/homebrew/nix) nằm ở dòng 14017–14026. Ngoài ra plan dùng lại ID `W10` BA LẦN: (1) dòng 14017 — CI/release/Docker/homebrew/nix, Wave 4, là mục này; (2) dòng 2451 — hợp đồng telemetry adapter, Wave 4; (3) dòng 14645 — watchdog collab transport. Ba mục khác nhau hoàn toàn. Bất kỳ ticket nào khoá theo chữ `W10` sẽ đụng nhau. Bằng chứng: `grep -n '^#### W10' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` → 14017. `grep -n '^## W10' …` → 2451. `grep -n '^### W10' …` → 14645. `sed -n '13919p;13930p' …` → W7 và W8a. |

## Cần người xác nhận

Các điểm dưới đây là chỗ đặc tả tự mâu thuẫn hoặc để ngỏ phân loại. Không tự sửa ở trên.

1. ~~**Số dòng `omp-kata`.**~~ **ĐÃ ĐÓNG:** con số đúng là **16 dòng comment** — 4 trong `ci.yml` (85,108,186,573) + 12 trong 6 file `.github/` kia (`actionlint.yaml` 2, `actions/bun-install/action.yml` 6, `actions/bazel-cache/action.yml` 1, `actions/bazel-natives/action.yml` 1, `actions/native-artifacts/action.yml` 1, `workflows/bazel-cache-warm.yml` 1). Cộng 12 dòng `runs-on:` trong `ci.yml` (159,229,285,513,567,598,621,639,657,675,695,711) thì `grep -c 'omp-kata' .github/workflows/ci.yml` → 16. Mục Hình dạng code đã sửa theo.
2. ~~**`nix/home-manager.nix` — dòng 11 chưa được phân loại.**~~ **ĐÃ PHÂN LOẠI:** dòng 11 `configFile = yaml.generate "omp-config.yml" cfg.settings` là tên file Nix SINH RA trong store path, chỉ được tiêu thụ bởi chính dòng 58 (`run install -m 600 ${configFile} "$HOME/.omp/agent/config.yml"`) — KHÔNG phải tên file người dùng viết trong `home.nix`. Đổi nó an toàn (thuộc nhóm ĐỔI, cùng nhóm với `pname`); chỉ `$HOME/.omp/agent/config.yml` ở 57,58 mới là PATH phải GIỮ (N14).
3. ~~**`nix/package.nix` — dòng 230 và 244 chưa được phân loại.**~~ **ĐÃ PHÂN LOẠI:** 230 (`Prebuilt addons that omp bun-installs…`) là false-positive tiếng Anh — BỎ QUA. 244 (comment `$out/bin/omp`) là ĐỔI KÈM, cosmetic, mô tả chính dòng 248. Lưu ý danh sách cũ chỉ nêu 10 dòng; thật là 27 (xem hàng bảng `nix/package.nix`).
4. ~~**Từ khoá false-positive không khớp giữa hai chỗ.**~~ **ĐÃ ĐÓNG:** `computes` KHÔNG tồn tại trong `ci.yml` (`grep -n 'computes' .github/workflows/ci.yml` → không kết quả); mục Hình dạng code nay liệt đúng 12 lượt / 11 dòng với `Compute` (296) và `compares` (200) đúng chữ.
5. **Cột "hành động" mâu thuẫn với cột "thay đổi".** `packages/coding-agent/src/cli/update-cli.ts` và `scripts/ci-release-publish.ts` đều được đánh dấu **sửa**, nhưng nội dung thay đổi lại ghi "KHÔNG SỬA FILE NÀY Ở W10" / "KHÔNG SỬA Ở W10". Hai file này chỉ là nửa consumer để đối chiếu, không nằm trong diff của W10.
6. **Các file được nhắc nhưng không mang cờ `verified`.** `README.md:40` / `:85`, `Cargo.toml:30,31`, `packages/utils/src/dirs.ts:24,36` và `flake.lock` xuất hiện trong Đính chính và Cần người quyết nhưng KHÔNG nằm trong danh sách `files_touched` — nên đặc tả không đánh dấu chúng là đã kiểm chứng độc lập. Các neo này chỉ được dẫn lại từ bằng chứng lệnh đã chạy trong `plan_corrections`.
7. **`scripts/rename/keep-list.txt` chưa tồn tại trong cây hiện tại** (`ls scripts/rename/` → No such file or directory), trong khi bước 1 của đặc tả là DỪNG chờ nó. Cần chốt: W10 có được phép tạo file này trong chính commit đó, hay phải chờ W7 tạo trước?


---


## W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5)

**Sóng:** Wave 5. **Effort:** M (2,5 ngày công theo thang của plan: S = 1, M = 2,5, L = chưa quy ra được) — cao hơn M một chút so với dự kiến, vì số file thật là 128 chứ không phải 68 (70 chỉ là tập con của hai mẫu đầu), vì có một lớp false-positive mà plan không nhận ra (20/54 lượt selector nằm trong globalThis instrument), và vì detector ở bước 11 là code mới chứ không phải sửa test. Trong đó ~0,5 ngày là viết detector + canary, ~1,5 ngày là phân loại 217 lượt `.omp` theo ba tập (và 214 lượt `"omp"` + `"oh-my-pi"` cùng luật ở bước 11b), ~0,5 ngày là 9 file selector và 4 file APP_NAME. **Rủi ro chính:** thay literal bằng tham chiếu hằng số một cách hàng loạt — bộ test đọc hằng số sẽ XANH với một hằng số bị đổi sai, tệ hơn chính bộ test hardcode mà nó thay thế vì còn mang lại cảm giác an toàn giả.

Một dòng tóm tắt: đổi 128 file test từ literal tên cũ sang đọc hằng số (`APP_NAME` / `WIRE_NAME` / `CONFIG_DIR_NAME` / tiền tố selector), giữ một test ghim giá trị thật cho mỗi bề mặt, và thêm một detector CI đọc `disposition.tsv` để cổng đỏ được ngay cả khi bộ test không chạy được. Không có gì thấy được với người dùng — đây là work item kỹ thuật thuần: nó làm lần đổi tên kế tiếp rẻ đi, và — nếu làm sai — làm hỏng âm thầm bộ test theo cách tệ nhất: một bộ test đã viết lại để đọc hằng số sẽ xanh với một hằng số bị đổi sai, tức là nó tự bỏ mất khả năng phát hiện hồi quy mà nó sinh ra để thay thế.

### File cần chạm tới

| Path | Hành động | Thay đổi | Đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/utils/test/worker-host.test.ts` | sửa | GIỮ NGUYÊN VĂN dòng 24 `expect(WORKER_HOST_SELECTOR_PREFIX).toBe("__omp_worker_")` (đây là pin). Đổi dòng 25-26 sang template `` `${WORKER_HOST_SELECTOR_PREFIX}stats_sync` `` và `` `${WORKER_HOST_SELECTOR_PREFIX}computer` ``. | Có — 3 lượt `__omp_worker_` tại :24,:25,:26, đã xác nhận bằng sed. Đây là file test DUY NHẤT trong toàn bộ 70 file mà chạy được trên máy này (4 pass / 0 fail), nên pin ở đây là pin có giá trị gate cục bộ. TUYỆT ĐỐI KHÔNG đổi :24 thành `expect(PREFIX).toBe(PREFIX)` — đó là tautology. |
| `packages/coding-agent/test/worker-selector.test.ts` | sửa | Tách 8 lượt thành 3 nhóm, đã đối chiếu dòng: (a) 4 lượt `__omp_worker_js_eval_process` tại :66,:87,:136,:189 → dựng từ `WORKER_HOST_SELECTOR_PREFIX`; (b) 3 lượt `__omp_worker_does_not_exist` tại :24,:27,:41 → dựng từ prefix NHƯNG giữ hậu tố `does_not_exist` nguyên văn, vì test này khẳng định selector KHÔNG hợp lệ bị từ chối; (c) 1 comment tại :7 → sửa chữ. 4 + 3 + 1 = 8, khớp `git grep -cE '__omp_worker_' -- 'packages/*/test/**'`. Sửa :24 và :27 thành hằng số cục bộ `const INVALID = `${WORKER_HOST_SELECTOR_PREFIX}does_not_exist`` và :41 dùng chính hằng số đó. | Có — và là cổng của W9 (khẳng định 15/15 loại selector phân giải). W11 KHÔNG được làm yếu nó. Hằng số `INVALID` vẫn giữ được cả tính chất 'không hợp lệ' lẫn việc theo hằng số. |
| `packages/coding-agent/test/executable-fallback.test.ts` | sửa | 8 lượt `__omp_worker_test` (:35,:36,:59,:60,:83,:84,:139,:140) → dựng từ `WORKER_HOST_SELECTOR_PREFIX` + hậu tố `test`; hoặc tốt hơn, dùng selector thật đã có. | Có — đã xác nhận 8 lượt bằng grep. Test này chỉ khẳng định `resolveWorkerSpawnCmd` trả về argv đúng — tên selector là chuỗi tùy ý, nên chuyển sang hằng số là an toàn. |
| `packages/coding-agent/test/eval/process-entry-import.test.ts` | sửa | 1 lượt :33 `argv: string[] = ["__omp_worker_computer"]` → `` [`${WORKER_HOST_SELECTOR_PREFIX}computer`] ``. | Có — selector thật, khớp `cli/worker-selectors.ts`. |
| `packages/coding-agent/test/fixtures/computer-worker-cli-selector.ts` | sửa | 1 lượt :3 `argv: ["__omp_worker_computer"]` → dựng từ `WORKER_HOST_SELECTOR_PREFIX`. | Có — là FIXTURE chứ không phải test, nhưng nó được argv thật dùng nên phải đi theo. |
| `packages/coding-agent/test/eval/worker-core.test.ts` | sửa | KHÔNG đổi giá trị. 20 lượt `__omp_worker_` ở đây KHÔNG phải selector — chúng là globalThis instrument `__omp_worker_core_gate` / `__omp_worker_cwd_gate` (:105,:113,:139,:140,:155,:165,:204,:205,:222,:232,:291,:292,:307,:325,:359,:360,:399,:414,:460,:461) trùng tiền tố một cách tình cờ. Chỉ thêm 1 dòng comment giải thích vì sao file này nằm ngoài phạm vi W11, để detector của đợt sau không báo nhầm. | Có — FALSE POSITIVE lớn nhất mà plan không nêu: 1/9 file selector, 20/54 lượt selector, không khẳng định gì về tên. Chạy sed trên đây là thay tên biến nội bộ vô nghĩa. |
| `packages/coding-agent/test/issue-1606-repro.test.ts` | sửa | 1 lượt `__omp_worker_tiny_inference` tại :11 nằm TRONG DOC COMMENT. Sửa chữ hoặc để nguyên — không có khẳng định nào phụ thuộc. | Có — cùng loại với `issue-3031-repro.test.ts:13` và `issue-7352-repro.test.ts:6`. Ba file này cộng lại là 3/9 file 'selector' của plan, và chúng chẳng assert gì. |
| `packages/coding-agent/test/issue-3031-repro.test.ts` | sửa | 1 lượt `__omp_worker_mnemopi_embed` tại :13 trong doc comment. | Có — xem `issue-1606-repro.test.ts`. |
| `packages/coding-agent/test/issue-7352-repro.test.ts` | sửa | 1 lượt `__omp_worker_mnemopi_embed` tại :6 trong doc comment. | Có — xem `issue-1606-repro.test.ts`. |
| `packages/coding-agent/test/export-html-template.test.ts` | sửa | BA phân định khác nhau trong MỘT file — plan chỉ nêu 2 và bỏ sót phần nguy hiểm nhất. (:26) `"omp-html-template-"` là tiền tố thư mục tạm, đổi thuần cosmetíc. (:32) mock specifier `'export const APP_NAME = "omp"; ...'` PHẢI theo APP_NAME, nếu không probe biên dịch với một specifier không còn phân giải. (:143) `expect(first).toContain("const THEME_STORAGE_KEY = 'omp-export-theme';")` PHẢI GIỮ NGUYÊN vì nó khẳng định một localStorage key đã bị persist. | Có — đã xác nhận cả 3 dòng. `omp-export-theme` định nghĩa tại `packages/coding-agent/src/export/html/template.js:4` và được đọc/ghi bằng localStorage — đổi tên nó làm mất theme đã lưu của MỌI người dùng hiện hữu, và không có lỗi nào. |
| `packages/coding-agent/test/modes/warp-events.test.ts` | sửa | :111 `agent: "omp"` → đọc `WIRE_NAME`. Giữ MỘT pin literal ở đâu đó khác cho bề mặt wire (xem `brand-constants.test.ts`). | Có — đây là test khớp wire site thứ 3 trong 5 site của W1 (`packages/coding-agent/src/modes/warp-events.ts:60` `agent: "omp"`). Giá trị KHÔNG đổi qua rename — W1 cố ý giữ `"omp"`. |
| `packages/coding-agent/test/acp-agent.test.ts` | sửa | KHÔNG chuyển :1140,:1144 sang APP_NAME. Giữ literal `"_omp/sessions/listAll"` và thêm pin khẳng định nó vẫn dispatch được. Plan gọi file này là 'test wire' nhưng lại hàm ý chuyển sang hằng số — làm vậy sẽ HỎNG test. | Có — `packages/coding-agent/src/modes/acp/acp-agent.ts:1135` là `case "_omp/sessions/listAll":` — literal cứng, KHÔNG dẫn xuất từ APP_NAME. Bề mặt wire ACP này có **6 case**, không phải 1: `:1135` `sessions/listAll`, `:1144` `projects/list`, `:1172` `chats/byCwd`, `:1180` `usage`, `:1189` `extensions`, `:1196` `extensions/toggle` (đếm bằng `git grep -n '_omp/' -- packages/coding-agent/src`, KHÔNG phải bằng tên một method). Cộng thêm `acp-agent.ts:656` `name: "oh-my-pi"` ngay trên `title: "omp"` — plan đã giao nó rõ ràng (COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13809: «cũng là giá trị wire… Đừng để nó rơi vào khoảng trống»). Tổng cộng **7 literal wire ACP nằm ngoài danh sách 5 site của W1**. Chuyển bất kỳ cái nào sang APP_NAME là test đỏ vì app không còn nhận ext method đó. |
| `packages/**` (57 file), `packages/tui/test/**` (2 file), `packages/ai/test/helpers/index.ts` (1 file), `packages/utils/test/logger-contract.test.ts` (1 file) | sửa | Đổi 217 lượt `".omp"` sang đọc hằng số hoặc danh sách ứng viên hai root. PHẢI phân loại từng lượt trước, không sed hàng loạt: lượt nào là config root của app dưới test → `CONFIG_DIR_NAME` hoặc candidate list của W4; lượt nào là đường dẫn LEGACY được seed để chứng minh dual-read → GIỮ LITERAL kèm comment. | Có — đếm bằng lệnh thật: `git grep -lE '"\.omp"' -- 'packages/*/test/**' \| wc -l` = 61 file, `git grep -oE '"\.omp"' -- 'packages/*/test/**' \| wc -l` = 217 lượt. Phân bố: coding-agent 57, tui 2, ai 1, utils 1. Chỉ 1 trong 61 (`utils/test/logger-contract.test.ts`) nằm ở package test chạy được cục bộ. |
| `scripts/ci-rename-test-literals.ts` | tạo | Detector CI: quét `packages/*/test/**`, thu thập mọi dòng khớp SÁU mẫu literal tên cũ (`".omp"`, `"omp"`, `__omp_worker_`, `_omp/`, `omp-export-theme`, `"oh-my-pi"`), nạp `scripts/rename/disposition.tsv`, và exit 1 nếu có bất kỳ hit nào không khớp một hàng disposition đã duyệt có `reason` khác rỗng. | **Chưa kiểm chứng** — file MỚI, chưa tồn tại (`ls scripts/ci-rename-test-literals.ts` → No such file). Baseline dưới đây đo bằng lệnh thật, KHÔNG phải bằng lần chạy detector: 217 + 200 + 54 + 1 + 1 + 14 = **487 lượt trên 128 file**; 61+9=70 chỉ là tập CON của 128, và 58 file ngoài tập 70 phải vào ngân sách. Không phải `bun test` — là script chạy được không cần native addon. |
| `packages/utils/test/brand-constants.test.ts` | tạo | Pin duy nhất, chạy được cục bộ: khẳng định `APP_NAME` và `CONFIG_DIR_NAME` bằng GIÁ TRỊ literal mới, `WIRE_NAME` bằng giá trị literal CŨ (vì W1 cố ý không đổi nó), và `WIRE_NAME !== APP_NAME` để chứng minh hai lớp danh tính là hai thứ khác nhau. | **Chưa kiểm chứng** — file mới. Đặt trong `packages/utils` vì `APP_NAME`/`CONFIG_DIR_NAME` đều export từ `dirs.ts` của chính package này, nên pin không cần import chéo — lý do này đúng với cả máy có lẫn máy không build được native addon. Đây là pin có giá trị gate cục bộ, không chỉ CI. |
| `scripts/rename/disposition.tsv` | sửa | W8b tạo ra. W11 chỉ THÊM hàng cho mọi hit còn lại trong test source, không định nghĩa schema. Mỗi hit phải có một hàng với `reason` khác rỗng, nếu không detector ở trên exit 1. | Có — `ls scripts/rename` → không tồn tại tại HEAD. DoD của plan (dòng 14039) nói đây là nơi DUY NHẤT một disposition được ghi lại và là thứ CI đọc — detector ở trên chính là hiện thực hoá câu đó. |

### Các bước

0. **Đối chiếu `do_not_rename` (bắt buộc, theo plan §2.3, trước khi chạy bất kỳ lệnh thay chuỗi nào).** Đọc mục 2.3 của `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` và ghi kết quả vào `disposition.tsv` cho từng mục, kèm `reason`: root `.omp` cấp project (W6a phương án b — **giữ nguyên `.omp`**, dùng `PROJECT_DIR_NAME` nếu cần hằng số); group và user Unix `omp`; nhãn runner `omp-kata`; layout sandbox `.omp-xdg` + `<.omp-xdg>/{data,state,cache}/omp`; `APP_URL`/`USER_AGENT` nếu chưa có domain mới. Tập (i) của bước 11 PHẢI loại `.omp` cấp project ra — nó thuộc tập (ii), không phải `CONFIG_DIR_NAME`.
1. **Chốt baseline trước khi sửa.** Ghi ra BẢY con số, không phải hai: 217 lượt `".omp"` / 61 file; 200 lượt `"omp"` / 54 file; 54 lượt `__omp_worker_` / 9 file; 1 lượt `_omp/`; 1 lượt `omp-export-theme`; 14 lượt `"oh-my-pi"` / 7 file; và **128 file phân biệt** là union của cả sáu mẫu (58 file ngoài tập 70). Toàn bộ detector của đợt này so với chính bảng này, nên phải có nó trước khi file đầu tiên bị đụng. Lệnh: `for pat in '".omp"' '"omp"' '__omp_worker_' '_omp/' 'omp-export-theme' '"oh-my-pi"'; do printf '%s ' "$pat"; git grep -oF -- "$pat" -- 'packages/*/test/**' | wc -l; done`.
2. **Trước khi sửa gì, chốt danh sách KHÔNG đụng tới** — đây là ba file mà bộ lọc theo tên sẽ bắt vào một cách sai. (1) `packages/coding-agent/test/profile-cli.test.ts:9` và `packages/coding-agent/test/utils/resume-command.test.ts:3` ĐÃ import `APP_NAME` từ `@oh-my-pi/pi-utils/dirs` và đã dùng nó (lần lượt :154,:179,:205 và :14,:21) — chúng là 2 trong 4 file 'có APP_NAME' mà plan liệt kê, và chúng đã dùng sẵn. (2) `packages/coding-agent/test/fixtures/before-compaction.jsonl` là transcript lịch sử 2.3 MB chứa 26 lượt APP_NAME bên trong nội dung toolResult đã ghi; sửa nó là biến lại lịch sử. Ba file này không nằm trong bảng trên vì W11 không sửa chúng — chúng ở đây để KHÔNG ai sed chạm vào.
3. **Viết pin trước mọi thay đổi khác**, và viết nó theo hai pha: (a) chạy nó ở TÊN CŨ và xác nhận nó XANH với giá trị cũ, (b) chỉ sau đó mới sửa giá trị pin sang tên mới. Nếu không làm (a), bạn không biết pin của mình có thật sự bắt được gì không. Pin gồm: `APP_NAME` = tên mới; `CONFIG_DIR_NAME` = `.` + tên mới; `WIRE_NAME` = `"omp"` (KHÔNG đổi — đây là cả ý nghĩa của W1); và `expect(WIRE_NAME).not.toBe(APP_NAME)`. File: `packages/utils/test/brand-constants.test.ts` (file mới).
4. **Sửa mock specifier ở `packages/coding-agent/test/export-html-template.test.ts:32`** để `APP_NAME` trong chuỗi mock dùng giá trị mới. Đây là chỗ duy nhất trong toàn bộ 70 file mà một literal sai sẽ làm HỎNG BIÊN DỊCH thay vì chỉ làm hỏng một khẳng định. Sửa :26 (tiền tố tmpdir) là tuỳ chọn. TUYỆT ĐỐI KHÔNG đụng :143.
5. **Giữ nguyên literal `_omp/sessions/listAll` tại `packages/coding-agent/test/acp-agent.test.ts:1140`**, và chuyển nó thành hằng số cục bộ trong test (một `const ACP_EXT_LIST_ALL = "_omp/sessions/listAll"`) để có một chỗ sửa thay vì nhiều. Dòng :1144 là case ÂM — `extMethod("omp/sessions/listAll")` không có tiền tố và PHẢI bị từ chối — nên để nguyên, đừng dựng nó từ hằng số. KHÔNG dùng `APP_NAME` ở đây. Nếu bạn dùng `APP_NAME`, test sẽ đỏ vì `packages/coding-agent/src/modes/acp/acp-agent.ts:1135` không dẫn xuất từ nó — đó là bằng chứng bạn đã hiểu sai, không phải lỗi cấu hình.
6. **Đổi `agent: "omp"` sang `WIRE_NAME` tại `packages/coding-agent/test/modes/warp-events.test.ts:111`.** Đây là ca DUY NHẤT trong nhóm test mà việc đọc hằng số là đúng, vì nó phản chiếu đúng một site wire của W1. Không có pin literal riêng ở đây — pin của nhóm wire nằm ở `brand-constants.test.ts`.
7. **Đổi hai dòng :25,:26 của `packages/utils/test/worker-host.test.ts` sang template dựng từ `WORKER_HOST_SELECTOR_PREFIX`. DÒNG :24 GIỮ NGUYÊN VĂN.** Chạy `bun test packages/utils/test/worker-host.test.ts` và xác nhận vẫn `4 pass / 0 fail` — đây là lệnh kiểm duy nhất trong toàn bộ W11 chạy được ngay trên máy này.
8. **Đổi 4 file selector thật** (`worker-selector.test.ts`, `executable-fallback.test.ts`, `eval/process-entry-import.test.ts`, `fixtures/computer-worker-cli-selector.ts`) sang dựng từ `WORKER_HOST_SELECTOR_PREFIX`, GIỮ hậu tố nguyên văn (`js_eval_process`, `computer`, `test`). Riêng `does_not_exist` PHẢI giữ nguyên hậu tố — test khẳng định selector không hợp lệ bị từ chối, đổi nó thành tên có thật sẽ làm test nói sai điều nó đang bảo vệ.
9. **KHÔNG SỬA giá trị trong `packages/coding-agent/test/eval/worker-core.test.ts:105,113,139,...`.** 20 lượt ở đây là globalThis instrument `__omp_worker_core_gate`/`__omp_worker_cwd_gate`, trùng tiền tố một cách tình cờ chứ không phải selector. Thêm MỘT dòng comment giải thích điều đó. Đây là bước tiết kiệm nhiều giờ nhất nếu bỏ qua: nó loại 20/54 lượt 'selector' khỏi ngân sách.
10. **Ba lượt còn lại trong 9 file selector nằm trong doc comment** (`issue-1606-repro.test.ts:11`, `issue-3031-repro.test.ts:13`, `issue-7352-repro.test.ts:6`). Sửa chữ cho khớp hoặc bỏ qua — không có khẳng định nào phụ thuộc. Ghi chúng vào `disposition.tsv` với `reason=comment-only` để detector không báo lại mỗi lần chạy.
11. **Bước tốn công nhất (61 file / 217 lượt), KHÔNG được sed.** Với từng file, phân loại từng lượt vào đúng một trong ba tập trước khi sửa: (i) config root của app dưới test → `CONFIG_DIR_NAME` hoặc candidate list hai root của W4; (ii) đường dẫn LEGACY được seed để chứng minh dual-read vẫn đọc được → GIỮ LITERAL, thêm comment nói rõ đây là legacy; (iii) tên trong chuỗi không phải đường dẫn (ví dụ `-omp-html-template-`, id transcript) → giữ hoặc đổi tuỳ ngữ nghĩa. Sai lầm chết người ở đây là xoá HẾT `.omp` cho sạch: test dual-read sẽ được viết thành 'root mới tồn tại' và mất đúng cái mà W4 sinh ra để bảo vệ. Lệnh liệt kê: `git grep -lE '"\.omp"' -- 'packages/*/test/**'`.
11b. **58 file còn lại của tập 128.** 200 lượt `"omp"` (`test/update-cli.test.ts` 26, `test/tools/browser-relay-bridge.test.ts` 20, `test/hindsight-backend.test.ts` 12, `utils/test/profiles.test.ts` 10, `metaharness/test/manager.test.ts` 10, `test/hindsight-mental-models.test.ts` 10, `tui/test/desktop-notify.test.ts` 9…) và 14 lượt `"oh-my-pi"` (`tools/web-scrapers/git-hosting.test.ts` 4, `ai/test/zai-oauth.test.ts` 3, `ai/test/cursor-exec-modern.test.ts` 3, `tools/web-search-exa.test.ts` 1, `oauth-flow.test.ts` 1, `acp-initialize-conformance.test.ts` 1, `acp-lazy-startup.test.ts` 1) — cùng quy tắc ba tập, cùng cấm sed, cùng ghi vào `disposition.tsv`. Ba trong số đó là wire literal bên thứ ba phải GIỮ: `oauth-flow.test.ts:81` (`client_name === "oh-my-pi"` gửi tới OAuth provider), `tools/web-search-exa.test.ts:608` (`x-exa-source` header), `cursor-exec-modern.test.ts:280,1474,1482` (repo `can1357/oh-my-pi`).
12. **Viết detector `scripts/ci-rename-test-literals.ts` (file mới).** Nó phải: quét `packages/*/test/**`; khớp bộ literal tên cũ; đối chiếu TỪNG hit (file + line) với `scripts/rename/disposition.tsv`; exit 1 + in ra danh sách hit không có disposition khi có bất kỳ hit nào; exit 0 khi tất cả đã được giải thích. Chạy nó để chứng minh nó đỏ được: nó phải đỏ ở trạng thái giữa chừng. (Xem mục "Cần người xác nhận" về thứ tự "trước bước 10" mà đặc tả viết.)
13. **KHÔNG SỬA `python/omp-rpc/tests/test_client.py:1044,1061`** — W13' sở hữu hai dòng này. W11 chỉ thêm `bun run test:py` vào cổng, vì `scripts/ci-test-ts.ts:109-110` xác nhận `localOnlyWorkspacePackages = ["python/robomp/web"]` và comment 'robomp-web lives under python/robomp and is outside every CI TS bucket', nên `bun run test:ts` không nhìn thấy `python/**/tests/`.
14. **KHÔNG SỬA, và ghi vào `disposition.tsv` kèm lý do.** 18 lượt `"omp"` trong `python/**/tests/` trên 4 file (`test_client.py` 2, `test_user_group.py` 5, `test_sandbox.py` 8, `test_worker.py` 3). W13' sở hữu đúng 2: `test_client.py:1044,1061`. 16 lượt còn lại phải GIỮ, phân tách đúng như sau: **3 lượt group Unix** (`test_user_group.py:36` `group="omp"`, `:40` assert, `test_worker.py:465` `extra_groups == ["omp"]`) — do_not_rename §3.4, đã materialize trên host; **6 lượt layout sandbox `.omp-xdg`** (`test_sandbox.py:1072,1074,1076,1106,1108,1110`); **4 lượt `(…/"omp").is_dir()` XDG** (`test_sandbox.py:760,829` + `test_worker.py:345,387`) — do_not_rename §3.3, layout container, không dẫn xuất từ `APP_NAME`. 3 + 6 + 4 = 13, cộng 3 lượt `executable="omp"` ở `test_user_group.py:26,34,45` thuộc W13' (đổi tên lệnh) = 16. Ba lượt `executable` này KHÔNG ghi `reason=keep` trong `disposition.tsv` — để W13' sở hữu, ghi `reason=defer-W13p`.

**Cách hoàn tác.** Mọi bước W11 nằm trong M5 là commit chưa push, hoàn tác bằng `git reset --hard <sha-trước-W11>`; nhưng vì bước 11 và 11b sửa ~128 file, hãy bắt buộc một commit sạch trước W11 và ghi SHA đó vào đầu đặc tả. Không bước nào được chạy ngoài commit đó. Ai review: một người duy nhất review toàn bộ diff, và tiêu chí duy nhất được chấp nhận là `bun scripts/ci-rename-test-literals.ts` exit 0 — không có tiêu chí "đọc nhanh 128 file" nào khác.

### Hình dạng code

Không có hình dạng code mới nào ngoài hai file pin và một script detector. Toàn bộ 70 file test chỉ đổi hằng số chứ không đổi hành vi: một literal `"omp"` thành `APP_NAME`, một literal `__omp_worker_x` thành template dựng từ `WORKER_HOST_SELECTOR_PREFIX`, một literal `.omp` thành `CONFIG_DIR_NAME` hoặc một hằng số candidate hai root do W4 cung cấp. Ba hình dạng thay literal, đúng như đặc tả nêu:

```typescript
// packages/utils/test/worker-host.test.ts:25-26
`${WORKER_HOST_SELECTOR_PREFIX}stats_sync`
`${WORKER_HOST_SELECTOR_PREFIX}computer`

// packages/coding-agent/test/worker-selector.test.ts — hằng số cục bộ
const INVALID = `${WORKER_HOST_SELECTOR_PREFIX}does_not_exist`

// packages/coding-agent/test/eval/process-entry-import.test.ts:33
argv: string[] = [`${WORKER_HOST_SELECTOR_PREFIX}computer`]
```

Xu hướng cấm của AGENTS.md áp dụng cho phần mới: import top-level (không `await import()`), không `any`, không `ReturnType<>`, không `mock.module()` (dùng `vi.spyOn` + `vi.restoreAllMocks()`), `bun check`/`bun test` chứ không bao giờ `tsc`. Detector là script Bun đọc file và nạp TSV — nó KHÔNG phải test, và không được viết dưới dạng test vì AGENTS.md cấm test khẳng định trên văn bản file nguồn; ranh giới này là có chủ đích và phải nói ra trong PR.

### Hợp đồng test

Mỗi test W11 viết hoặc sửa phải bảo vệ MỘT hợp đồng quan sát được, và hợp đồng đó KHÔNG được là 'hằng số bằng giá trị này' trừ khi đó chính là điều cần ghim. Nếu hồi quy, người tiêu dùng thấy:

1. **`packages/utils/test/brand-constants.test.ts`** — tên hiển thị và tên tệp/cấu hình là hai thứ khác nhau. Nếu W1 lỡ đặt `WIRE_NAME` bằng tên mới, pin này đỏ. Pin: `APP_NAME` = tên mới, `CONFIG_DIR_NAME` = `.` + tên mới, `WIRE_NAME` = `omp` cũ, và `WIRE_NAME` khác `APP_NAME`.
2. **`packages/utils/test/worker-host.test.ts:24`** — tiền tố selector còn được nhận. Một ai đó đổi tiền tố mà quên một selector sẽ làm `isWorkerHostSelector` trả false và worker im lặng không chạy.
3. **`packages/coding-agent/test/worker-selector.test.ts`** — selector lạ bị từ chối với exit code khác 0. Đây là chốt chặn chống selector gõ sai trông giống sức khoẻ.
4. **`packages/coding-agent/test/acp-agent.test.ts`** — tên ext method ACP là hợp đồng bên thứ ba. Đổi nó làm app không còn nhận lệnh từ host.
5. **Hai pin đã persist dùng bản đã có, không tạo file mới.** (a) `THEME_STORAGE_KEY` — giữ nguyên `export-html-template.test.ts:143` (`expect(first).toContain("const THEME_STORAGE_KEY = 'omp-export-theme';")` trên output của `getTemplate()`); đây là hành vi thật, đừng chuyển nó sang `packages/utils`. (b) ext method ACP — giữ nguyên `acp-agent.test.ts:1140` (`await harness.agent.extMethod("_omp/sessions/listAll", { limit: 2 })`): test này thật sự dispatch method nên nó là pin đúng. Hằng số cục bộ `const ACP_EXT_LIST_ALL = "_omp/sessions/listAll"` chỉ dùng ở :1140; dòng :1144 là case ÂM (`extMethod("omp/sessions/listAll")` phải bị từ chối) nên giữ nguyên dạng không có tiền tố, đừng dựng nó từ hằng số. Không viết test nào trong `packages/utils` cho hai literal này: `pi-utils` không import được `pi-coding-agent`, và `template.js` là IIFE trình duyệt — test duy nhất có thể làm là source-grep, mà AGENTS.md cấm.

KHÔNG được tạo bất kỳ khẳng định nào chỉ đọc hằng số rồi so với chính hằng số đó: đó là tautology, AGENTS.md cấm, và nó tệ hơn chính bộ test hardcode mà nó thay thế.

### Xác minh

Đã đo bằng lệnh thật trên HEAD `1454dc0`. Cây mã nguồn giống hệt `84cbac9` mà plan vốn dẫn — `git diff --stat 84cbac9 HEAD` chỉ ra `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md | 100 +++-`, không file nguồn nào — nên mọi số dưới đây tái lập được trên cả hai commit. Số nào ghi "đã đo" mà không kèm lệnh thì coi như chưa đo: riêng bước 14 đã vi phạm điều đó (xem phần Đính chính).

```bash
# Số đếm nền
git grep -cE '"\.omp"' -- 'packages/*/test/**' | awk -F: '{s+=$2} END {print s}'   # 217
git grep -lE '"\.omp"' -- 'packages/*/test/**' | wc -l                              # 61
git grep -lE '__omp_worker_' -- 'packages/*/test/**' | wc -l                        # 9
git grep -lE 'APP_NAME' -- 'packages/*/test/**' | wc -l                             # 4
comm -12 <(git grep -lE '"\.omp"' -- 'packages/*/test/**' | sort) \
         <(git grep -lE '__omp_worker_' -- 'packages/*/test/**' | sort) | wc -l    # 0 → 61+9=70 là tập CON của 128; detector thật sự soi 128 file

# Có bao nhiêu thật sự là selector
git grep -n 'sessions/listAll' -- packages/coding-agent/src                          # đúng 1 hit: acp-agent.ts:1135
git grep -n '_omp/' -- packages/coding-agent/src                                      # 6 hit: 6 case ext method ACP (:1135, :1144, :1172, :1180, :1189, :1196)
sed -n '656p' packages/coding-agent/src/modes/acp/acp-agent.ts                          # name: "oh-my-pi" (plan:13809)
git grep -n 'WIRE_NAME' -- .                                                        # chỉ khớp trong COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
git grep -rn 'before-compaction' -- .                                                # không kết quả
ls scripts/rename                                                                     # không tồn tại tại HEAD

# Cổng tầng 1 — chạy được ngay
bun run check:ts                                                                     # exit 0, mất ~24s (lần đầu đo 24,2s; lần hai 23,7s)
bun test packages/utils/test/worker-host.test.ts                                     # 4 pass / 0 fail
bun test packages/omptype/test/ark/arrays/array.test.ts                              # 24 pass
bun scripts/ci-rename-test-literals.ts                                               # detector mới: exit 1 / exit 0

# Cổng tầng 2 — bị chặn bởi môi trường, KHÔNG phải bởi W11
bun test packages/coding-agent/test/worker-selector.test.ts                           # 0 pass 1 fail 1 error
                                                                                      # Failed to load pi_natives native addon for darwin-arm64
python3 -m pytest --version                                                          # No module named pytest
```

Đúng với plan: 9 file có `__omp_worker_`; 4 file có `APP_NAME`; `test:py` tồn tại tại `package.json:135`; `test:scripts` tại `package.json:91`; `scripts/ci-test-ts.ts:109-110` xác nhận runner TS không quét `python/**/tests/`; cả 5 site wire của W1 nằm đúng dòng plan nêu (`dap/session.ts:1465-1466`, `blob-broker/uploaders-legacy.ts:236`, `modes/warp-events.ts:60`, `modes/acp/acp-agent.ts:657`, `hindsight/bank.ts:29`); `WIRE_NAME` chưa tồn tại trong source; 18 lượt `"omp"` trong `python/**/tests/*.py` trên 4 file (`test_client.py` 2, `test_user_group.py` 5, `test_sandbox.py` 8, `test_worker.py` 3) khớp đúng plan; 1 tệp / 2 dòng chặn thật trong `test_client.py`: `:1044` và `:1061`.

Về môi trường (đo lại trên HEAD `1454dc0`): `bun test` KHÔNG bị chặn toàn cục — nó chặn theo package, nhưng KHÔNG package nào sạch hoàn toàn ngoài `omptype`. Ở mức package: `packages/omptype` 1139 pass / 0 fail; `packages/utils` 658 pass / 17 fail / 16 error (16 file lỗi native addon, cộng `logger-contract.test.ts:354` đỏ vì cùng lý do — và đó là 1 trong 61 file W11 sẽ sửa); `packages/mnemopi` 146 pass / 53 fail / 53 error; `packages/agent` 4 pass / 46 fail / 46 error; `packages/tui` 149/205/205; `packages/ai` 73/450/443; `packages/catalog` 141/104/104; `packages/coding-agent` 913/1446/1411. Ở mức FILE, ba lệnh dưới đây tái lập tuyệt đối và là cổng duy nhất của W11: `bun test packages/utils/test/worker-host.test.ts` → 4 pass/0 fail; `bun test packages/omptype/test/ark/arrays/array.test.ts` → 24 pass; `bun test packages/coding-agent/test/worker-selector.test.ts` → 0 pass/1 fail/1 error. `bun run check:ts` → exit 0 trong **~24s** (78s user × 342% cpu), không phải 4m14s. `bun run test:py` chặn vì lý do khác: `python3 -m pytest --version` → `No module named pytest`.

Vì hai lý do đó, các dòng Python nêu ở bước 13-14 mới chỉ được **đếm bằng lệnh thật**, chưa được kiểm chứng hành vi: không chạy được pytest trên máy này.

### Cổng hoàn thành

CỔNG BA TẦNG, vì lệnh của plan (`bun run check && bun run test:ts && bun run test:py`) không phân biệt được 'W11 xong' với 'máy này không build được' — cả ba lệnh đều không chạy được ở đây.

- **Tầng 1 — chạy được NGAY trên máy này**, và mỗi lệnh đều phân biệt được xanh-với-nothing-to-do: (a) `bun run check:ts` — exit 0, đo được ~24s; nó bắt được import hỏng, hằng số chưa tồn tại, và scope đổi sai sau W7. (b) `bun test packages/utils/test/worker-host.test.ts` — phải in `4 pass` và `0 fail`; đây là pin tiền tố selector, file test selector DUY NHẤT chạy được cục bộ. (c) `bun scripts/ci-rename-test-literals.ts` — detector mới, exit 1 khi còn hit chưa có disposition, exit 0 khi sạch; chạy được không cần native addon.
- **Tầng 2 — nghiệm thu thật, CHỈ CI**, kèm canary bắt buộc: `bun run test:ts` và `bun run test:py` phải cùng chạy; canary là một script khẳng định run cho ra số pass > 0 VÀ không chứa chữ ký `Failed to load pi_natives native addon` / `No module named pytest`, để một môi trường bị chặn không bao giờ được báo là xanh.
- **Tầng 3 — thứ KHÔNG phải cổng**: không một khẳng định nào được tạo ra mà chỉ đọc hằng số.

Gỡ chặn cho máy dev: `brew install ninja` TRƯỚC (cmake build của `opusic-sys` cần build program, thiếu thì `bun --cwd=packages/natives run build` fail với `CMAKE_MAKE_PROGRAM is not set`), rồi `bun --cwd=packages/natives run build`; và `python3 -m pip install pytest` cho `test:py`.

Cổng này có thực sự đỏ được không: **CÓ** — detector tầng 1(c) khi chạy lần đầu sẽ exit 1 với **487 hit trên 128 file** (217 + 200 + 54 + 1 + 1 + 14), vì 61+9=70 chỉ là tập CON của 128; và `bun test packages/utils/test/worker-host.test.ts` đã cho 4 pass / 0 fail nên một hằng số sai sẽ làm nó đỏ. Nhưng chỉ tầng 1 đỏ được ngay trên máy này; tầng 2 hiện đỏ vì môi trường, không phải vì W11, nên một lần đỏ của tầng 2 không mang thông tin cho W11.

### Phụ thuộc

- **W1** (hằng số `WIRE_NAME` — chưa tồn tại trong source; W11 không thể chuyển `warp-events.test.ts` sang nó nếu W1 chưa xong)
- **W3** (hằng số lớp hiển thị + 5 literal nhân bản)
- **W4** (danh sách ứng viên hai root — 217 lượt `.omp` cần biết candidate list mới có tên gì mới phân loại được tập (i) với tập (ii))
- **W7** (sed scope — tên import trong 70 file test đổi trước; W11 sửa sau nếu không thì sẽ sửa hai lần)
- **W8b** (`scripts/rename/disposition.tsv` — detector đọc file này; file chưa tồn tại tại HEAD)
- **W9** (tên binary + tiền tố selector — 9 file selector chỉ ổn định sau khi W9 chốt tiền tố)

Chặn: **W13** (quét tài liệu — nghiệm thu của nó là 'một grep token omp đứng riêng trên .md chỉ trả về tập legacy có chủ ý', cùng họ detector với W11).

### Cách sai dễ nhất

Sai lầm lớn nhất, và nó là sai lầm mà W11 tự tạo ra: thay literal bằng tham chiếu hằng số một cách hàng loạt. Kết quả là một bộ test đọc hằng số sẽ XANH với một hằng số bị đổi sai — tệ hơn chính bộ test hardcode mà nó thay thế, vì nó còn mang lại cảm giác an toàn giả. Chống bằng cách ghim giá trị ở MỘT chỗ cho mỗi bề mặt và để phần còn lại dẫn xuất.

Sai lầm thứ hai, ngược chiều: xoá HẾT mọi hit `.omp` trong test cho sạch — sẽ phá test dual-read của W4 và xoá tấm chắn duy nhất chống việc ai đó đổi tên group Unix `omp` ở máy người dùng.

Sai lầm thứ ba, âm thầm nhất và chỉ W11 mới thấy: chuyển `packages/coding-agent/test/acp-agent.test.ts:1140` sang `APP_NAME`, vì nó TRÔNG như một khẳng định tên hiển thị. `_omp/sessions/listAll` là tên ext method ACP hardcode tại `packages/coding-agent/src/modes/acp/acp-agent.ts:1135`, và cả 6 case `case "_omp/…":` trong `extMethod` đều vậy; chúng nằm ngoài danh sách 5 site của W1 và ngoài danh sách 7 literal mà W1/W13 đã giao. Chuyển một cái làm app ngừng nhận lệnh từ host.

Sai lầm thứ tư: chạy pass 'đọc hằng số' lên `python/**/tests/` — sẽ xoá 16/18 lượt phải giữ.

Sai lầm thứ năm, thuộc về cổng chứ không phải về test: tin `bun run test:ts` là cổng nghiệm thu mà không kiểm môi trường — trên máy này nó đỏ vì thiếu native addon, nên 'đỏ' mang hai nghĩa khác nhau và một trong hai không liên quan gì đến W11.

### Cần người quyết

- Sau W4, tên của candidate list hai root là gì? 217 lượt `.omp` không phân loại được thành tập (i) 'config root của app' và tập (ii) 'đường dẫn legacy được seed' nếu không biết hằng số candidate đó tên gì. Đây là câu hỏi chặn thật sự, và nó là lý do W11 phụ thuộc W4 chứ không chỉ phụ thuộc W1/W3.
- `packages/coding-agent/test/fixtures/before-compaction.jsonl` (2.3 MB) không được tham chiếu ở bất kỳ đâu — `git grep -rn 'before-compaction' -- .` không trả về gì. Nó là fixture chết. Giữ đóng băng (đề xuất của đặc tả, vì nó là transcript lịch sử) hay xoá? Xoá là việc ngoài phạm vi W11 và cần quyết định riêng.
- Detector `scripts/ci-rename-test-literals.ts` có được phép là một script grep trong CI không, hay phải là một `bun test`? AGENTS.md cấm source-grep BÊN TRONG test; nó không cấm một detector CI, và DoD của chính plan (dòng 14034-14039) là grep-based với `disposition.tsv` làm nơi CI đọc. Đặc tả đọc là được phép, nhưng đây là ranh giới diễn giải nên nói thẳng trong PR chứ không giấu.
- 5 file test có `.omp` nằm ngoài `packages/coding-agent` (tui 2, ai 1, utils 1) — có file nào trong số đó thực ra là contract đáng giữ (ví dụ `tui/test/render-utils.test.ts` khẳng định chuỗi hiển thị có sanitize đúng không) hơn là chỉ là đường dẫn tạm? Đặc tả mới chỉ phân loại qua mẫu, chưa đọc hết 61 file.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| 「Cỡ đúng: 178 file rộng / 59 có `".omp"` / 4 có `APP_NAME` / 9 có `__omp_worker_`」 | PARTIALLY_FALSE | Số 59 sai: thật là 61 file. Số 4 và 9 đúng. Số trần 178 không tái lập được bằng bất kỳ bộ lọc nào của plan — mẫu gần nhất cho ra 188 với regex lỏng hơn, và 61+9=70 mới là con số hành động. Bỏ hẳn 178 khỏi đặc tả. |
| 「Số phải hành động là 68 file phân biệt (59 + 9, hai tập không giao nhau)」 | PARTIALLY_FALSE | Vế 'hai tập không giao nhau' là ĐÚNG (`comm -12` cho 0 file). Tổng thì sai: 61 + 9 = 70, không phải 68. |
| 「9 có `__omp_worker_`」 — ngụ ý cả 9 đều khẳng định tên cũ. | PARTIALLY_FALSE | 9 file / 54 lượt là đúng, nhưng chỉ 5 file thật sự khẳng định một selector. 1 file (`worker-core.test.ts`, 20 lượt — chính là 37% của tổng) là globalThis instrument trùng tiền tố một cách tình cờ. 3 file chỉ có doc comment. 1 trong 5 là fixture chứ không phải test. Nếu không phân loại, W11 sẽ tốn công sửa tên biến nội bộ vô nghĩa và báo cáo thành công giả. |
| 「4 file có `APP_NAME`」 — ngụ ý cả 4 cần sửa. | PARTIALLY_FALSE | Đếm 4 là đúng nhưng kết luận sai. 2 file đã đọc hằng số sẵn (`profile-cli.test.ts`, `resume-command.test.ts`) — không cần việc gì. 1 file là transcript lịch sử 2.3 MB không được tham chiếu ở đâu (`before-compaction.jsonl`) — phải đóng băng. CHỈ 1 file cần sửa thật: `export-html-template.test.ts`. |
| 「Ca đặc biệt: `packages/coding-agent/test/export-html-template.test.ts:26,32` mang một specifier mock nội tuyến ... phải sửa ở cả hai nửa」 | PARTIALLY_FALSE | Về specifier mock thì plan đúng. Nhưng plan bỏ sót dòng nguy hiểm nhất của chính file đó: :143. Ba dòng mang tên trong một file, ba phân định khác nhau: :26 tiền tố tmpdir (cosmetíc), :32 mock specifier (phải theo hằng số), :143 khẳng định localStorage key `omp-export-theme` (phải GIỮ NGUYÊN). |
| 「Test wire hiện có: `packages/coding-agent/test/modes/warp-events.test.ts`, `packages/coding-agent/test/acp-agent.test.ts`」 — cả hai được gợi ý là ứng viên chuyển sang WIRE_NAME. | FALSE | `warp-events.test.ts:111` đúng là phản chiếu site wire W1 (`src/modes/warp-events.ts:60`), nên chuyển sang `WIRE_NAME` là đúng. `acp-agent.test.ts` thì KHÔNG: nó khẳng định `extMethod("_omp/sessions/listAll")`, một tên ext method ACP hardcode tại `src/modes/acp/acp-agent.ts:1135`, KHÔNG dẫn xuất từ `APP_NAME`. Chuyển nó sang `APP_NAME` sẽ làm test đỏ vì app không còn nhận ext method đó. Bề mặt này có **6 case** `case "_omp/…":` (`:1135`, `:1144`, `:1172`, `:1180`, `:1189`, `:1196`) cộng `acp-agent.ts:656` `name: "oh-my-pi"` mà plan đã giao tên — tổng cộng **7 literal wire ACP nằm ngoài danh sách 5 site của W1** (W1 phủ `title: "omp"` ở :657, không phủ các vị trí trên). |
| 「Bộ test Python ... `python/omp-rpc/tests/test_user_group.py:26,34,36,40,45` ... chúng khẳng định group Unix `omp` phải được giữ」 | PARTIALLY_FALSE | Con số 5 dòng đúng, nhưng mô tả sai: chỉ 2 dòng (:36 và :40) là khẳng định group Unix. Ba dòng :26, :34, :45 là tham số `executable="omp"` — tên lệnh được spawn, thuộc phạm vi W13' (`client.py:455`), không phải group. Gọi cả 5 là 'group' khiến người đọc bảo vệ sai thứ, đồng thời tạo mâu thuẫn với W13' vốn phải sửa tên lệnh. |
| 「Lệnh: `bun run check && bun run test:ts && bun run test:py`」 là cổng nghiệm thu. | FALSE | Không phải cổng đỏ được trên máy này, vì cả ba lệnh đều không cho tín hiệu. `bun run test:ts` đỏ vì thiếu native addon (5/8 package), `bun run test:py` đỏ vì thiếu pytest, `bun run check` kéo cả `check:rs` cần cargo. Lệnh đỏ KHÔNG phân biệt được 'W11 chưa làm' với 'máy chưa build được'. Đặc tả này thay bằng cổng ba tầng, trong đó tầng 1 chạy được ngay và tầng 2 có canary bắt buộc chữ ký môi trường bị chặn. |
| 「bun run test:ts đi qua `scripts/ci-test-ts.ts` và chỉ quét `packages/*` cộng `python/robomp/web`」 | VERIFIED_TRUE | Giữ nguyên. Đây là cơ sở đúng để bắt buộc ghép `bun run test:py` vào cổng — không có lệnh TS nào nhìn thấy `python/**/tests/`. |
| Cả 5 vị trí wire mà W1 sẽ gom về `WIRE_NAME` | VERIFIED_TRUE | Giữ nguyên, và bổ sung: `WIRE_NAME` hiện KHÔNG tồn tại trong source — nó chỉ xuất hiện trong chính tài liệu kế hoạch. Đây là lý do W11 phụ thuộc W1 theo đúng thứ tự. |

## Cần người xác nhận

Một điểm còn lại trong đặc tả tự mâu thuẫn, không tự sửa:

- — `packages/coding-agent/test/worker-selector.test.ts:24` **đã giải quyết, không cần người xác nhận**: `:24` là `await runCli(["__omp_worker_does_not_exist"]);`, tức thuộc nhóm (b). Nhóm (a) trong bản cũ gán nhầm `:24` cho `js_eval_process` và làm tổng ba nhóm thành 9 thay vì 8; bản đã sửa ở trên bỏ `:24` khỏi nhóm (a) và bỏ dải "Sửa :24-27" ở dòng trước đó.
- **Thứ tự bước 10 và bước 12.** Bước 12 yêu cầu "Chạy nó NGAY TRƯỚC khi làm bước 10 xong để chứng minh nó đỏ được: nó phải đỏ ở trạng thái giữa chừng", trong khi bước 10 là ghi ba lượt doc comment vào `disposition.tsv`. "Trước khi làm bước 10 xong" có thể đọc là trước khi hoàn tất bước 10, hoặc trước khi bắt đầu bước 10 — hai cách đọc cho kết quả khác nhau. Ngoài ra, mục "Cách sai dễ nhất" trong đặc tả nói "Chống bằng cách ghim giá trị ở MỘT chỗ cho mỗi bề mặt (bước 2)", nhưng bước 2 trong danh sách là bước chốt danh sách KHÔNG đụng tới; bước ghim pin là bước 3.


---


## W12. Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)

**Sóng:** Wave 6 | **Effort:** S in code, L in calendar — cân chính của plan đúng nhưng hơi nhạt ở một chỗ | **Rủi ro chính:** hồi quy hình thái giá trị — reset version trong manifest của package mới làm mọi lần update so sánh ra là "đã là bản mới nhất", nên update im lặng không bao giờ tới, không có lỗi nào, không có test đỏ nào.

Phạm vi việc: phát hành `@oh-my-pi/pi-coding-agent` lần cuối dưới scope cũ dưới dạng stub rename mang khối manifest `omp` (`rename` trỏ tới package mới + `dist`), với một override `publishBin` ở thời điểm publish để lệnh `omp` vẫn còn trên stub, rồi ký lại và notarize lại binary macOS đã đổi tên. Phía bên nhận (parser của update CLI) đã xong và đã kiểm chứng; công việc thật nằm ở phía phát hành.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `scripts/ci-release-publish.ts` | sửa | Thêm override `publishBin` theo từng lần phát hành, để lần publish stub mang `bin: { omp: <shim> }` còn lần publish tên mới mang `bin: { ultraworkers: ... }`. Hôm nay chỉ có một `publishBin` tĩnh trên phần tử `packages[]` tại `:186`, và `rewriteManifest` (`:243`) áp nó cho **mọi** lần publish của thư mục đó. | Có — HEAD 84cbac9. Interface `PublishPackage` ở `:69`; `rewriteManifest` export ở `:240`; `applyPublishBin` là hàm export **riêng** ở `:296-303`, gọi duy nhất từ `scripts/install-tests/run-ci.sh:156`. |
| `scripts/ci-release-publish.test.ts` | sửa | Thêm test bảo vệ đúng hợp đồng của W12: một lần publish stub của `packages/coding-agent` cho ra manifest mà `bin` vẫn còn key `omp`, **kể cả sau khi** `publishBin` trên bảng đã bị đổi sang tên lệnh mới. Dùng seam dry-run sẵn có `rewriteManifest(pkg, false)`, đang dùng ở `:212` và `:242`. | Có — file này **chạy được** trên máy này: `bun test scripts/ci-release-publish.test.ts` = 11 pass / 0 fail / exit 0, đo ngày 2026-09-27. Nó là file test liên quan W12 duy nhất không bị chặn bởi native addon. Hiện chứa **không** assertion nào về `bin` hay `publishBin` (grep `publishBin|manifest.bin` không trả về hit nào). |
| `packages/coding-agent/package.json` | sửa | Manifest phát hành phải mang khối `omp` khai `omp: { "rename": { "package": "<new-agent-pkg>", "natives": "<new-natives-pkg>" }, "dist": "binary" }` trên bản cuối dưới tên cũ, và `omp: { "dist": "npm" }` trên manifest của package mới. Version của package mới phải **tiếp nối** dòng cũ (hôm nay `18.3.3`, `packages/coding-agent/package.json:3`) — không bao giờ hạ xuống thấp hơn. | Có — HEAD 84cbac9. Hôm nay manifest **không có** khối `omp:` (hit `"omp"` duy nhất là key `bin` ở `:28`). Khối đó được soạn trong manifest của repo hay tiêm bởi bước publish theo từng lần phát hành là open question 1 — plan không quyết, và hai lựa chọn có hậu quả hỏng khác nhau. |
| `packages/coding-agent/src/cli/update-cli.ts` | không sửa (đã đúng) | Không có thay đổi code nào được kỳ vọng. Parser đã nhận đúng dạng cần thiết và đã đúng. | Có — HEAD 84cbac9. `resolveReleaseDist` ở `:165`, `isRecord(manifest.omp)` ở `:166`, docblock hợp đồng stub ở `:183-188`, `resolveReleaseRename` ở `:189`, `isRecord(manifest.omp)` ở `:190`, `shouldForceBinaryUpdate` ở `:216-222`, `MAX_RENAME_HOPS = 3` ở `:807`, `getLatestRelease` ở `:884` với vòng lặp đuổi rename ở `:894-902`. Tên key `omp` là `do_not_rename` N1 và không được dời. |
| `packages/coding-agent/test/cli/update-rename-migration.integration.test.ts` | không sửa | Không thay đổi. Plan bảo mở rộng file này bằng các case hình dạng manifest; các case đó đã nằm ở một file khác, và file này hoàn toàn không có seam manifest nào. | Có — 170 dòng. Nó chạy npm và bun thật trên fixture `file:` cục bộ và điều khiển `migrateRenamedInstall` qua `RenameMigrationSteps` được tiêm vào (`:108-120`, `:149-161`). Nó không bao giờ gọi `resolveReleaseRename` hay `resolveReleaseDist` và không bao giờ phân tích manifest. Thêm case manifest ở đây sẽ trùng coverage sẵn có. |
| `packages/coding-agent/test/cli/update-cli.test.ts` | không sửa (đã có sẵn) | Không có thay đổi nào được kỳ vọng — đây chính là nơi hai case mà plan bảo W12 viết **đã** nằm. Đọc `:60-79` trước khi viết bất cứ thứ gì mới. | Có — `:60-79` đã assert một rename pointer thật (`@oh-my-pi/pi-coding-agent` → `@new/omp`) phân giải được version, dist và tên package từ manifest CUỐI, kể cả chuỗi URL registry hai chặng. Chốt vòng lặp ở `:90+`. Case parser ở mức unit nằm ở `packages/coding-agent/test/update-cli.test.ts:642-653` (rename) và `:1420-1431` (dist). |
| `scripts/ci-macos-sign.sh` | không sửa (đã có) | Không thay đổi. Cổng codesign mà plan liệt kê là tiêu chí nghiệm thu W12 đã tồn tại và đã tham số hoá theo tên. | Có — `BINARY="${1:-}"` ở `:35`, `codesign --verify --strict --verbose=4 "$BINARY"` ở `:109`, cộng probe `--version` và `--smoke-test` ở `:117-118` và vòng khứ hồi notarytool ở `:120-145`. Call site là `ci.yml:974` truyền `${{ matrix.binary_path }}`. Việc thật của W12 ở đây là **chạy lại** chữ ký dưới tên file mới, không phải sửa script. |
| `.github/workflows/ci.yml` | không sửa (thuộc W10) | Không phải chỉnh của W12, nhưng W12 không thể được ký duyệt khi những dòng này còn đó: job verify binary đã phát hành hardcode tên asset cũ ở 9 chỗ — dòng 922, 1206, 1207, 1210, 1211, 1213, 1214, 1218, 1225. Sau khi đổi tên asset, các lệnh curl này trỏ vào 404 và job verify fail vì một lý do không liên quan gì tới chữ ký. | Có — bàn giao cho W10 (W10 đã sở hữu `ci.yml` và việc đổi tên release asset). W12 phải xác nhận 9 dòng này đã được W10 đổi trước khi tuyên bố có bản phát hành đã ký, nếu không cổng codesign không kiểm chứng được. |
| `scripts/install-tests/run-ci.sh` | không sửa (cần quyết định, thuộc W10) | Stub cần một artifact `dist/omp`, nếu không ma trận cài đặt sẽ vỡ: `:94` copy `packages/coding-agent/dist/omp` vào thư mục bin của test và `:103` smoke `$BUN_INSTALL/bin/omp`. Sau khi W9 đổi tên lệnh, một stub chỉ mang map `bin` trỏ tới `dist/omp` không tồn tại sẽ fail ở đây. | Có — kiểm chứng ở `:92-95` và `:101-103`. Không hề có trong plan. Stub có mang shim thật hay install test học tên mới là bàn giao cho W10; dù thế nào thì W12 cũng không được ký duyệt khi điều đó còn chưa chốt.

Cột `hành động` ở đây cố ý khác trường `action` của `W12.spec.json` (JSON ghi `modify` cho cả 9 mục kể cả 6 mục không sửa). Bảng này phân loại theo ý nghĩa thật: 3 file sửa, 6 file không sửa, trong đó `ci.yml` và `run-ci.sh` thuộc W10. |

### Các bước

1. Xác nhận parser rename đã đúng và không cần sửa: `grep -n 'resolveReleaseDist\|resolveReleaseRename\|isRecord(manifest\.omp)' packages/coding-agent/src/cli/update-cli.ts` phải chứa đủ `:165`, `:166`, `:189`, `:190`. Lệnh này còn trả về đúng ba dòng nữa và đó là bình thường: `:875` (docblock `{@link resolveReleaseRename}`), `:895` (lời gọi trong vòng lặp đuổi rename) và `:907` (`dist: resolveReleaseDist(latest.manifest)`) — chính là cơ chế mà W12 phụ thuộc. Chỉ dừng lại nếu thiếu một trong bốn dòng `:165/:166/:189/:190` — đó mới là cây lệch. Nếu thấy đúng bảy dòng nói trên thì cây đúng. Đừng "sửa" parser; key `omp` là `do_not_rename` N1 và dời nó phá vỡ toàn bộ cơ chế. Neo: `packages/coding-agent/src/cli/update-cli.ts:165,166,189,190`.
2. Đọc coverage sẵn có trước khi viết bất kỳ test nào: `sed -n '60,79p' packages/coding-agent/test/cli/update-cli.test.ts` và `grep -n 'resolveReleaseDist\|resolveReleaseRename' packages/coding-agent/test/update-cli.test.ts`. Cả hai case mà plan bảo W12 viết đã tồn tại. Không viết lại chúng. Nếu bạn tin là thiếu một case, hãy nói cụ thể assertion nào bị thiếu. Neo: `packages/coding-agent/test/cli/update-cli.test.ts:60-79`.
3. Viết test trước, và làm nó đỏ **TRONG TRẠNG THÁI HẬU-W9**. Test phải tự dựng trạng thái mà W9 sẽ tạo ra, vì nếu không thì nó xanh sẵn: (a) `const pkg = packages.find(e => e.dir === "packages/coding-agent")`; (b) lưu `const original = pkg.publishBin` và `afterEach` phải gán lại `pkg.publishBin = original` — bắt buộc, vì `packages` là export module-level dùng chung và hai test sẵn có ở `:212`/`:242` đọc chính mảng đó, để sót lại sẽ đầu độc các test sau trong cùng file; (c) gán `pkg.publishBin = { ultraworkers: "dist/cli.js" }`; (d) gọi `rewriteManifest(pkg, false)` và assert `manifest.bin` **vẫn còn key `omp`**. Chạy `bun test scripts/ci-release-publish.test.ts` và xác nhận nó **FAIL** — hôm nay nó đỏ thật, vì `rewriteManifest` chỉ áp `publishBin` tĩnh ở `:243` và không có override theo từng lần phát hành. File này chạy được trên máy này (đo hôm nay exit 0, 11 test), nên một kết quả đỏ ở đây là đỏ thật, không phải hiện tượng môi trường. Nếu bạn không làm test này đỏ được trước khi cài đặt, bạn đã viết một mệnh đề tautology. Neo: `scripts/ci-release-publish.test.ts`, `scripts/ci-release-publish.ts:186,243`.
4. Quyết open question 1 và viết quyết định vào **commit message**, không phải vào comment: khối `omp` được soạn trong `packages/coding-agent/package.json` (đơn giản nhất, nhưng khi đó **mọi** lần publish của thư mục đó đều mang rename pointer, kể cả package tên mới) hay được tiêm bởi một bước publish theo từng lần phát hành (nhiều code hơn, nhưng pointer chỉ đi trên bản cuối dưới tên cũ)? Rồi cài đặt thay đổi tương ứng. Plan không chọn; chọn trong im lặng chính là cách để lựa chọn sai lên production. Neo: `packages/coding-agent/package.json:3,27-29`.
5. Cài đặt override `publishBin` theo từng lần phát hành trong `scripts/ci-release-publish.ts`. Nguy cơ là thật dù lý do mà plan nêu là sai: `rewriteManifest` ở `:243` áp `publishBin` tĩnh duy nhất từ phần tử `packages[]` (`:186`) cho **mọi** lần publish của thư mục đó, và hôm nay không có cơ chế theo từng lần phát hành nào. Ngay khi W9 đổi nó thành `ultraworkers`, một stub được publish từ chính thư mục đó sẽ mang `bin: { ultraworkers: ... }` và những người dùng không bao giờ update sẽ mất hẳn lệnh `omp`. Neo: `scripts/ci-release-publish.ts:69,186,240,243`. Ràng buộc cứng khi thiết kế: `scripts/ci-release-publish.ts:298` ném lỗi khi phần tử `packages[]` không có `publishBin`, và `scripts/install-tests/run-ci.sh:156` gọi `applyPublishBin("packages/coding-agent", true)` không có guard — lỗi đó làm `run-ci.sh` exit 1. Vì vậy override theo từng lần phát hành phải được thêm **bên cạnh** `publishBin` tĩnh ở `:186`, không được thay thế nó. Nếu buộc phải bỏ `publishBin` khỏi bảng thì phải sửa `applyPublishBin` và `run-ci.sh:156` cùng lúc, và việc đó phải được nêu trong commit message chứ không làm lặng lẽ.
6. Làm test ở bước 3 xanh. Rồi chạy lại toàn bộ bộ test của script phát hành: `bun test scripts/ci-release-publish.test.ts scripts/ci-release-build-binaries.test.ts scripts/musl-release.test.ts scripts/release.test.ts`. Cả bốn đều pass riêng lẻ trên máy này (đo từng cái exit 0, 2026-09-27). Đừng kỳ vọng `bun run test:scripts` pass — xem cổng. Neo: `scripts/ci-release-publish.ts:243`.
7. Tính liên tục dòng version. Bản stub phải lớn hơn **nghiêm ngặt** version hiện tại ở `packages/coding-agent/package.json:3` (hôm nay `18.3.3`) và không được hạ xuống thấp hơn. `getLatestRelease` (update-cli.ts:884) phân giải version từ manifest cuối trong chuỗi, và `shouldForceBinaryUpdate` (`:216-222`) so sánh nó. Một lần hạ version làm mọi lần update so sánh ra là đã là bản mới nhất: update im lặng không bao giờ tới, không có lỗi ở bất kỳ đâu. Đây là sai lầm tốn kém nhất trong work item này. Neo: `packages/coding-agent/package.json:3`.
8. Xác nhận W10 đã đổi 9 dòng `omp-darwin-arm64` trong `ci.yml` (922, 1206, 1207, 1210, 1211, 1213, 1214, 1218, 1225) và thay đổi `run-ci.sh` cho artifact `dist/omp`. Chạy `grep -c 'omp-darwin-arm64' .github/workflows/ci.yml` — nó **không được** bằng 9. Nếu bằng 9 thì W12 không thể ký duyệt: cổng codesign xác minh một asset không còn tồn tại. Neo: `.github/workflows/ci.yml:1206-1225`.
9. Ký lại và notarize lại dưới tên file mới bằng cách **chạy lại** pipeline hiện có — `ci.yml:974` gọi `bash scripts/ci-macos-sign.sh "${{ matrix.binary_path }}"`, và script đó đã làm `codesign --verify --strict` ở `:109`. Không cần sửa script. Đây là điều kiện tiên quyết của bản phát hành, không phải một việc làm sau. Neo: `scripts/ci-macos-sign.sh:35,103,109`.
10. **Ngoài repo**, bị chặn trong môi trường này và không ủy thác được cho code nào: xác nhận scope `@ultraworkers` tồn tại và thuộc sở hữu; xác nhận scope cũ vẫn còn phát hành được cho stub này; có được danh tính ký Apple. Cả ba đều nằm ngoài repo. Nếu bất kỳ cái nào không có, W12 bị **BLOCKED** — không đánh dấu là xong và không nới rộng phạm vi để lách. Neo: `scripts/ci-macos-sign.sh:94-98`.
11. Xác minh đường rename từ đầu đến cuối với một manifest đã phát hành thật trước khi nó tới bất kỳ người dùng nào. Việc này cần truy cập registry (open question 2). Nếu không làm được, hãy nói rõ trong phần bàn giao thay vì thay bằng một test dựa trên fixture — fixture chứng minh parser, không phải bản phát hành. Neo: `packages/coding-agent/src/cli/update-cli.ts:894-902`.

### Hình dạng code

Gần như không có gì mới. Phía bên nhận đã xong và đã kiểm chứng: `resolveReleaseDist` (`update-cli.ts:165`) và `resolveReleaseRename` (`:189`) đã phân tích `omp.dist` và `omp.rename`, `getLatestRelease` (`:884`) đã đuổi tối đa `MAX_RENAME_HOPS = 3` (`:807`) và lấy version, dist cùng tên package từ manifest CUỐI trong chuỗi, và `shouldForceBinaryUpdate` (`:216`) đã coi mọi dist khác `npm` là binary. W12 cung cấp **giá trị**, không phải code, cộng thêm một bổ sung nhỏ ở phía sản xuất: override `publishBin` theo từng lần phát hành.

```typescript
// scripts/ci-release-publish.ts — hình dạng HIỆN TẠI, đã kiểm chứng trên HEAD 84cbac9

// :69 — trường tĩnh, chỉ một giá trị cho mỗi phần tử của bảng
interface PublishPackage {
  // ...
  publishBin?: Record<string, string>;
}

// :164 — mảng packages[] được export
const packages: PublishPackage[] = [
  {
    // :186 — phần tử của packages/coding-agent.
    // Plan nói :165; :165 thực ra là hàng `packages/utils` đầu tiên của mảng
    // `packages[]`, không phải dòng trống trong docblock.
    dir: "packages/coding-agent",
    publishBin: { omp: "dist/cli.js" },
  },
];

// :240 — export function rewriteManifest(...)
// :243 — ghi có ĐIỀU KIỆN, không phải ghi đè vô điều kiện như plan mô tả
if (pkg.publishBin) manifest.bin = { ...pkg.publishBin };

// Ràng buộc thiết kế cho test: rewriteManifest đọc
// path.join(repoRoot, pkg.dir, 'package.json'), còn repoRoot là module-level
// (import.meta.dir/..). Vì vậy pkg.dir KHÔNG thể bị trỏ sang thư mục tạm —
// một test stub hoặc cần một thư mục thật, hoặc cần thay đổi chữ ký nhỏ
// để tiêm nguồn manifest.

// :296-303 — applyPublishBin là hàm export RIÊNG, ném lỗi nếu package
// không có publishBin; :301 ghi manifest.bin.
// Gọi duy nhất: scripts/install-tests/run-ci.sh:156 — đây là helper của
// install test, KHÔNG phải đường publish của release.
```

### Hợp đồng test

Bảo vệ một hợp đồng quan sát được: bản phát hành cuối dưới scope cũ phải để lại cho người dùng một lệnh `omp` vẫn chạy được, bất kể updater của họ có hiểu rename pointer hay không.

Cụ thể: (1) một lần publish stub của `packages/coding-agent` sinh ra manifest mà `bin` vẫn còn chứa key `omp`, kể cả sau khi `publishBin` trên phần tử bảng đã được đổi tên. Đây là assertion về phép biến đổi trên đầu ra của `rewriteManifest`, và nó phải được chứng minh **ĐỎ** trước khi phần cài đặt làm nó xanh. (2) Case đã có sẵn ở `test/cli/update-cli.test.ts:60-79` phủ đường đuổi rename; `:90+` phủ chốt vòng lặp; `test/update-cli.test.ts:1420-1431` phủ ép kiểu dist, gồm cả giá trị lạ được ép thành `binary`.

Không viết lại những case đó để chỉ đọc một hằng số — AGENTS.md cấm biến một assertion trên literal thành tautology, và một cổng rename-e2e đọc hằng số thì chứng minh không điều gì. Không thêm case hình dạng manifest vào `update-rename-migration.integration.test.ts`: file đó không có seam manifest, và các case sẽ trùng coverage sẵn có. Theo AGENTS.md: không `mock.module()` (dùng `vi.spyOn` + `restoreAllMocks`), không source-grep file cài đặt, và test phía phát hành là thuần nên không cần cả hai.

Các file test: `scripts/ci-release-publish.test.ts`, `packages/coding-agent/test/cli/update-cli.test.ts`, `packages/coding-agent/test/update-cli.test.ts`.

### Xác minh

```bash
# Bước 1 — parser rename đã đúng
grep -n 'resolveReleaseDist\|resolveReleaseRename\|isRecord(manifest\.omp)' packages/coding-agent/src/cli/update-cli.ts

# Bước 2 — coverage sẵn có, đọc trước khi viết
sed -n '60,79p' packages/coding-agent/test/cli/update-cli.test.ts
grep -n 'resolveReleaseDist\|resolveReleaseRename' packages/coding-agent/test/update-cli.test.ts

# Bước 3 / 6 — cổng phân biệt, chạy được ở máy này
bun test scripts/ci-release-publish.test.ts

# Bước 8 — W10 đã đổi 9 dòng chưa
grep -c 'omp-darwin-arm64' .github/workflows/ci.yml   # phải KHÁC 9

# Tier 1 — chạy được ở máy này, xanh đo 2026-09-27
bun run check:ts

# Tier 3 — bị chặn ở đây, KHÔNG phải PASS
brew install ninja
bun --cwd=packages/natives run build
(cd packages/coding-agent && bun test test/cli/update-cli.test.ts test/update-cli.test.ts)
bun test scripts/ci-release-build-binaries.test.ts scripts/musl-release.test.ts scripts/release.test.ts
```

### Cổng hoàn thành

- **Tier 1** — chạy trên máy này, xanh đã kiểm chứng 2026-09-27: `bun run check:ts`
- **Tier 2** — test của W12, chạy trên máy này, và **CÓ THỂ** đỏ (đo 11 pass / 0 fail / exit 0 trước khi thay đổi): `bun test scripts/ci-release-publish.test.ts`. Đây là tầng phân biệt. Hãy nhìn nó đỏ trước khi cài đặt, rồi xanh sau.
- **Tier 3** — bị chặn ở đây, KHÔNG phải một lần pass. Phải cài ninja trước nếu không build sẽ không chạy: `brew install ninja`, `bun --cwd=packages/natives run build`, rồi `(cd packages/coding-agent && bun test test/cli/update-cli.test.ts test/update-cli.test.ts)` và `bun test scripts/ci-release-build-binaries.test.ts scripts/musl-release.test.ts scripts/release.test.ts`. Lưu ý: sau khi build, `bun run test:scripts` vẫn có thể fail ở riêng `scripts/ci-test-ts.test.ts`; điều đó là đã biết và **không** phải tín hiệu của W12.
- **Tier 4** — bên ngoài, không chạy được ở đây, phải được báo cáo là **BLOCKED** chứ không phải PASS: publish stub lên registry, rename end-to-end với manifest thật đã phát hành, `codesign --verify --strict` trên artifact đã ký lại, tính khả dụng của danh tính Apple.

Cổng này thực sự đỏ được: Tier 2 chạy trên chính máy này và đã được đo là xanh trước khi thay đổi, nên nó phân biệt được "xong" với "test chưa chạy được". Tương phản với cổng mà plan nêu — `(cd packages/coding-agent && bun test test/cli/update-rename-migration.integration.test.ts) && bun run test:scripts` — vốn đỏ vô điều kiện trong môi trường này bất kể kỹ sư làm gì: `bun test` trên bất kỳ test nào import `pi_natives` đều exit 1 với 0 pass / 1 fail / 1 error và `Failed to load pi_natives native addon for darwin-arm64`, và cả hai nhánh của cổng đó đều dính. Tier 3 ở đây là BLOCKED, không phải xanh.

### Phụ thuộc

- `depends_on`: W9, W10
- `blocks`: (không có)

### Cách sai dễ nhất

Sai số dòng ở một chỗ khiến kỹ sư đi tới sai hàm — `publishBin` ở `:186`, không phải `:165`, và hai chỗ ghi `manifest.bin` mà plan nêu nằm ở `:243` và `:301`, trong **hai hàm khác nhau**, một cái có điều kiện. Tưởng rằng parser cần viết thì lãng phí cả work item; nó đã đúng và đã kiểm chứng.

Sai lệch nguy hiểm thật sự mang hình thái **giá trị**, không mang hình thái code: một lần reset version trong manifest của package mới làm mọi lần update so sánh ra là đã là bản mới nhất, nên update im lặng ngừng tới, không lỗi nào và không test đỏ nào — một người dùng ở tên cũ bị kẹt vĩnh viễn mà không có gì báo cáo. Thứ hai: phát hành stub mà không có giá trị `dist`, khiến một lần cài bằng trình quản lý package của stub cho ra một lệnh không có code nào. Thứ ba: lý do plan nêu cho nguy cơ `publishBin` sai về sự thật, nên kỹ sư đi kiểm tra có thể kết luận rằng bản thân nguy cơ cũng sai và bỏ qua bản vá — nguy cơ là thật, chỉ có lời giải thích là sai. Thứ tư, hoàn toàn không có trong plan: không thể xác minh chữ ký khi `ci.yml` vẫn curl tên asset cũ ở 9 chỗ, và ma trận cài đặt vỡ nếu thiếu artifact `dist/omp`.

### Cần người quyết

- Khối manifest `omp` được soạn ở đâu — trong `packages/coding-agent/package.json` của repo, hay được tiêm theo từng lần phát hành bởi bước publish? Plan nói rõ là hoãn ("bản thân manifest, không phải file nguồn") nhưng không quyết định. Soạn trong repo nghĩa là mọi lần publish của thư mục đó đều mang rename pointer, kể cả package tên mới; tiêm vào thì tốn cơ chế theo từng lần phát hành. Hậu quả hỏng khác nhau, không có mặc định. Phải quyết ở bước 4, trong commit message.
- Đường rename được xác minh end-to-end với manifest thật đã phát hành bằng cách nào trước khi phát hành, và ai có quyền truy cập registry để làm việc đó? Test dựa trên fixture chứng minh parser, không phải bản phát hành. Plan đòi kiểm tra thật nhưng không đưa cơ chế lẫn người phụ trách.
- Scope `@ultraworkers` có sẵn và đã được sở hữu chưa, và scope cũ còn phát hành được cho stub không? Cả hai đều bên ngoài, cả hai đều được plan nêu là bên ngoài, và cả hai chặn thẳng work item. Đây chính là câu hỏi chưa giải quyết chặn cả W2/W7; W12 không đi qua được bước 10 nếu chưa có.
- Stub có mang shim binary `omp` thật, hay ma trận cài đặt học tên lệnh mới? `scripts/install-tests/run-ci.sh:94,103` hiện đòi artifact `dist/omp`. W12 cần một quyết định hoặc một bàn giao tường minh cho W10; để ngỏ nghĩa là không mục nào được ký duyệt.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `scripts/ci-release-publish.ts:165` chứa `publishBin: { omp: "dist/cli.js" }`. | wrong-line | Nó nằm ở dòng 186, trên phần tử `packages/coding-agent` của mảng `packages[]` được export (`:164`). Dòng 165 là hàng dữ liệu đầu tiên của mảng đó (`{ dir: "packages/utils", kind: "typescript" }`), không phải dòng trống trong docblock — docblock của `STATS_CLIENT_LOCK` nằm ở 160-161 và đã đóng ở 161. Bằng chứng: `grep -n 'publishBin\|manifest\.bin\|"bin"' scripts/ci-release-publish.ts` trả về 16, 69, 186, 243, 298, 301; `sed -n '160,175p'` cho thấy 163 là dòng trống và 164 là `export const packages: PublishPackage[] = [`; `sed -n '165p'` in ra `{ dir: "packages/utils", kind: "typescript" },`; `sed -n '178,192p'` cho thấy `publishBin: { omp: "dist/cli.js" }` ở 186. |
| `ci-release-publish.ts:220` và `:278` ghi đè `manifest.bin` vô điều kiện từ `publishBin`, vì vậy stub cần `publishBin` riêng. | wrong-line-and-wrong-mechanism | Cả hai số dòng đều sai, và mô tả "vô điều kiện" là sai sự thật. Chỗ ghi đè duy nhất trong đường publish nằm ở `:243` và nó **có** điều kiện: `if (pkg.publishBin) manifest.bin = { ...pkg.publishBin };`. Dòng 301 nằm trong `applyPublishBin()`, một hàm export riêng (`:296-303`) ném lỗi nếu package không có `publishBin`; gọi duy nhất là `scripts/install-tests/run-ci.sh:156`, một helper của install test, không phải đường publish của release. Nguy cơ plan mô tả vẫn **THẬT** nhưng vì một lý do khác: `publishBin` tĩnh duy nhất trên phần tử `packages[]` (`:186`) được áp cho mọi lần publish của thư mục đó, nên ngay khi W9 đổi nó, một stub publish từ chính thư mục đó sẽ mang `bin: { ultraworkers: ... }`. Nêu sai lý do nguy hiểm ở đây — một kỹ sư đi kiểm tra có thể kết luận bản thân nguy cơ cũng sai và bỏ qua bản vá. Bằng chứng: `sed -n '240,244p'` cho thấy điều kiện ở 243; `sed -n '296,303p'` cho thấy `applyPublishBin`; `grep -rn 'applyPublishBin'` trả về đúng hai hit — định nghĩa ở `:296` và `scripts/install-tests/run-ci.sh:156`. |
| W12 nên mở rộng `packages/coding-agent/test/cli/update-rename-migration.integration.test.ts` bằng một manifest có `rename` trỏ tới package mới thật, cộng một case thứ hai với `dist` là giá trị binary. | already-covered-and-misplaced | Cả hai case đã tồn tại, ở một file khác. `packages/coding-agent/test/cli/update-cli.test.ts:60-79` đã assert một rename hai package thật (`@oh-my-pi/pi-coding-agent` → `@new/omp`) phân giải version, dist và tên package từ manifest cuối, kể cả chuỗi URL registry hai chặng chính xác; chốt vòng lặp ở `:90+`. Case parser ở mức unit nằm ở `packages/coding-agent/test/update-cli.test.ts:642-653` và `:1420-1431` (cái sau gồm cả trường hợp giá trị lạ bị ép thành `binary`). Riêng `update-rename-migration.integration.test.ts` hoàn toàn **không** có seam manifest: nó điều khiển `migrateRenamedInstall` qua `RenameMigrationSteps` được tiêm vào, chạy npm và bun thật trên fixture `file:` cục bộ, và không bao giờ gọi resolver nào. Viết case manifest ở đó sẽ trùng coverage sẵn có trong một file được dựng cho một seam khác. Bằng chứng: `sed -n '60,79p'` cho thấy fixture rename và các assertion; `grep -n 'resolveReleaseDist\|resolveReleaseRename' packages/coding-agent/test/update-cli.test.ts` trả về 29, 30, 642, 646, 650, 651, 652, 653, 1420, 1421, 1425, 1429, 1430, 1431; 170 dòng của file integration chứa `RenameMigrationSteps` ở `:108-120` và `:149-161` và không có lời gọi resolver nào. |
| Tiêu chí nghiệm thu W12 gồm `codesign --verify --strict` thành công trên artifact đã đổi tên, ngụ ý rằng cần build. | already-exists | Cổng đã tồn tại ở hai chỗ và không cần code mới. `scripts/ci-macos-sign.sh:109` chạy `codesign --verify --strict --verbose=4 "$BINARY"` và đã tham số hoá theo tên (`BINARY="${1:-}"` ở `:35`), được gọi từ `ci.yml:974`. Việc thật của W12 là **chạy lại** chữ ký dưới tên file mới — một điều kiện tiên quyết, không phải một chỉnh sửa. Thứ duy nhất sẽ phá nó nằm trong file của W10: `ci.yml` hardcode `omp-darwin-arm64` ở 9 chỗ, nên job verify sẽ curl 404 sau khi đổi tên asset. Bằng chứng: `grep -rn 'codesign\|notarytool\|notariz' .github/workflows/ scripts/` trả về 30 dòng trên 6 file — ci.yml:962, 965, 1210, 1211, 1218, 1222; ci-macos-sign.sh:3, 10, 14, 83, 90, 91, 92, 94, 98, 103, 109, 110, 112, 120, 122, 135, 137, 145; ci-release-build-binaries.ts:162; ci-macos-upload-secrets.sh:3, 83, 84; stamp-native-version.ts:111, 114. Các hit quan trọng cho W12 là `ci-macos-sign.sh:109` (codesign --verify) và `ci-macos-sign.sh:94,98` (tìm Apple identity). `grep -c 'omp-darwin-arm64' .github/workflows/ci.yml` = 9, ở các dòng 922, 1206, 1207, 1210, 1211, 1213, 1214, 1218, 1225. |
| Cổng của W12 là `(cd packages/coding-agent && bun test test/cli/update-rename-migration.integration.test.ts) && bun run test:scripts`. | false-red | Cổng này không phân biệt được "xong" với "test không chạy được" — nó đỏ trong môi trường này bất kể kỹ sư làm gì. `bun test` trên bất kỳ test nào import `pi_natives` đều exit 1 với 0 pass / 1 fail / 1 error và `Failed to load pi_natives native addon for darwin-arm64`. Cả hai nhánh của cổng đều dính, và `bun run test:scripts` bị chặn vì đúng một trong năm thành viên (`scripts/ci-test-ts.test.ts`); bốn cái còn lại exit 0 riêng lẻ. Đã viết lại thành cổng bốn tầng (xem mục Cổng hoàn thành) để tầng duy nhất thực sự có thể đỏ — `scripts/ci-release-publish.test.ts`, chạy được ở đây — là tín hiệu phân biệt, còn các tầng bị chặn được dán nhãn BLOCKED chứ không phải đã pass. Mở khoá tầng 3 còn cần `brew install ninja` trước: `ninja` không được cài trên máy này và build natives không chạy được nếu thiếu nó. Bằng chứng: đo ngày 2026-09-27: `bun test packages/coding-agent/test/cli/update-rename-migration.integration.test.ts` → exit 1 (0 pass / 1 fail / 1 error, lỗi tải pi_natives); `bun test packages/coding-agent/test/update-cli.test.ts` → exit 1; `bun run check:ts` → exit 0. Từng thành viên của test:scripts: ci-test-ts 1, ci-release-build-binaries 0, musl-release 0, ci-release-publish 0, release 0. `bun test scripts/ci-release-publish.test.ts` một mình → 11 pass / 0 fail / exit 0. `which ninja` → không có; `brew list ninja` → 'No such keg: /opt/homebrew/Cellar/ninja'. |
| Mục "Vị trí" của W12 liệt kê stub manifest, parser, script publish và bước ký là toàn bộ bề mặt công việc. | incomplete | Thiếu hẳn một phụ thuộc thật không có trong plan: `scripts/install-tests/run-ci.sh:94` copy `packages/coding-agent/dist/omp` vào thư mục bin của test và `:103` smoke `$BUN_INSTALL/bin/omp`. Một stub chỉ mang map `bin` trỏ tới một `dist/omp` không còn tồn tại sẽ làm fail ma trận cài đặt, mà đó chính là tiêu chí nghiệm thu của W10. W12 hoặc phải yêu cầu một shim `omp` thật trong stub, hoặc phải có một quyết định bàn giao tường minh từ W10; để ngỏ chặn cả hai mục. Bằng chứng: `grep -n 'dist/omp\|BUN_INSTALL/bin\|BINARY_DIR' scripts/install-tests/run-ci.sh` trả về 92, 93, 94, 95, 101, 103. |

Toàn bộ neo trong tài liệu này đã được đối chiếu lại bằng lệnh trên HEAD `84cbac9` (plan được viết nhắm vào `5873776`). Môi trường đo được, không phải giả định: `bun run check:ts` exit 0 trong ~29s; `bun test` exit 1 trên bất kỳ thứ gì import `pi_natives`; `bun run test:scripts` exit 1 vì đúng một lý do; `ninja` không được cài, nên `bun --cwd=packages/natives run build` không thể chạy được nguyên trạng.


---


## W13. Quét tài liệu — changelog chỉ khi được yêu cầu (sóng 6)

**Sóng:** Wave 6 — lượt cuối, chạy sau khi bề mặt đã ngừng chuyển động.
**Effort:** S theo bảng effort của plan (1 ngày công) — con số đó đúng, **với điều kiện là bỏ qua bước số 3**. Ba việc nặng nhất theo thứ tự: (1) cột tương thích trong `docs/environment-variables.md` — 100 dòng trên 29 bảng, 7 kiểu header khác nhau, sửa tay; (2) phân loại 549 lượt trên 93 file, không lượt nào giống nhau; (3) 24 URL GitHub trên 13 file nếu quyết định ở `open_questions` #1 là có đổi. Nếu W4 chưa land thì cột tương thích không có nội dung và phần này chỉ còn 1 dòng — đó là lý do bước 1 là điều kiện chặn chứ không phải lời khuyên.
**Rủi ro chính:** Sở hữu kép với W8a trên hai neo tài liệu hợp đồng — nghiêm trọng nhất và chưa được giải quyết.

Lượt này là lượt cuối của milestone: đổi token hiển thị `omp` trong 93 file `.md` văn xuôi, thêm cột tương thích cho đúng MỘT bí danh `ULTRAWORKERS_*` mới vào `docs/environment-variables.md`, và không đụng vào bất kỳ file changelog nào.

Người đọc tài liệu không còn thấy tên cũ trong văn xuôi: lệnh được ghi trong README và **58** file trong `docs/` (35 file ở cấp đỉnh) được gọi bằng tên mới. Bảng biến môi trường nói rõ `PI_*`/`OMP_*` vẫn hoạt động vĩnh viễn và tên mới nào thắng tên cũ, nên người dùng đặt biến trong shell profile không bị hỏng. **Không có thay đổi nào tới `packages/*/CHANGELOG.md` hay `LICENSE`** — nếu xuất hiện một mục changelog do lần đổi tên này, đó là hành vi bị cấm và phải revert.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `scripts/rename/docs-legacy-allowlist.txt` | tạo | Allow-list dạng text: mỗi dòng là MỘT đường dẫn `.md` được phép vẫn chứa token hiển thị `omp` sau khi đổi tên. Không header, không số thứ tự, `LC_ALL=C sort`. Ban đầu seed bằng kết quả lệnh gate A ở mục `verification` chạy trên HEAD `84cbac9`. | **Chưa kiểm chứng** — `ls scripts/rename/` trả về `No such file or directory`; thư mục do W7 tạo. Đây là artifact bắt buộc: không có nó thì gate không kiểm được gì và mọi mục dưới đây trở thành lời hứa miệng. Số 93 đã đo thật, nhưng phải seed lại tại thời điểm W13 chạy vì W7 đã đổi 4107 file và có thể làm bề mặt này dịch chuyển. |
| `scripts/rename/check-docs-rename.ts` | tạo | Script gate, exit code khác 0 khi có vi phạm. Ba kiểm tra, in `FAIL <rule> <path>` cho từng vi phạm rồi `process.exit(1)`: (A) mọi file `.md` còn chứa token `omp` phải nằm trong allow-list; (B) mọi tên `ULTRAWORKERS_*` đọc trong code (`process.env.X` / `Bun.env.X`) phải xuất hiện trong `docs/environment-variables.md`, và mọi tên `ULTRAWORKERS_*` trong doc phải được code đọc; (C) phần đã phát hành của `packages/*/CHANGELOG.md` phải không đổi so với mốc `$BASE` (`git diff --name-only "$BASE"...HEAD`), trừ mục `## [Unreleased]` khi người dùng yêu cầu rõ ràng. Không dùng `console.log` ràng buộc — script này chạy ở CI nên `console.error` cho phần FAIL và `process.exit(1)` là hợp lệ (nó là binary CLI, không phải mã TUI/RPC/SDK); nếu muốn đúng luật tuyệt đối thì dùng `logger` từ `@oh-my-pi/pi-utils`. | **Chưa kiểm chứng** — file chưa tồn tại. File mới nên nằm trong `scripts/` để `check:tools` (oxlint + oxfmt) của repo tự quét — `package.json` có `check:tools => oxlint . && oxfmt --check '...scripts/**/*.ts'`, nên không cần cấu hình thêm. Đây **không** phải `bun test`: nó là checker có exit code, chạy được khi toàn bộ test suite bị chặn. |
| `docs/environment-variables.md` | sửa | Thêm cột tương thích vào các bảng biến, và thêm đúng MỘT dòng cho `ULTRAWORKERS_CONFIG_DIR`. File có 648 dòng và **29 bảng** (không phải 11): `grep -cE '^\| *:?-{3,}' docs/environment-variables.md` = 29. **95 trong 100 dòng `PI_*`/`OMP_*` nằm ở các bảng có header từ dòng 270 trở đi** (bảng lớn nhất: header dòng 428 với 36 dòng, dòng 313 với 17 dòng) — 10 số dòng mà một lượt đối chiếu tự liệt kê trước đó chỉ là 10 header đầu tiên. **mỗi bảng phải thêm cột, không chỉ bảng đầu**. Cột mới đặt sau cột `Variable` với header `New name`. | **Đã kiểm chứng** — `wc -l docs/environment-variables.md` = 648; `grep -cE '^\| .(PI|OMP)_[A-Z0-9_]+' docs/environment-variables.md` = 100 (con số 100 của plan đúng). Có **7** kiểu header cột hai (`Used for`, `Value type`, `Default / behavior`, `Behavior`, `Required?`, `Setting overridden`, `Used by`) và 23 bảng 2 cột / 4 bảng 3 cột / 2 bảng 4 cột. Liệt kê đủ bằng `grep -nE '^\| *(Variable\|Variable group) +\|' docs/environment-variables.md` (29 dòng; dòng 618 là `Variable group`, không phải `Variable`). |
| `docs/environment-variables.md:25` | sửa | Sửa câu mô tả cơ chế mirror sẵn có. Dòng **25** (KHÔNG phải 29 — dòng 29 là dòng kẻ ngang `---`) hiện ghi: `every OMP_* key is mirrored to its PI_* alias, and that mirrored value replaces a same-file PI_* value`. Câu này mô tả hành vi THẬT trong code, không phải thương hiệu — nhưng nó là chỗ duy nhất trong file giải thích cơ chế tương thích, nên đây là chỗ đúng để nói rõ `ULTRAWORKERS_CONFIG_DIR` thắng `PI_CONFIG_DIR` và cả hai đều được giữ. | **Đã kiểm chứng** — `sed -n '29p' docs/environment-variables.md` trả về `---`; `grep -n 'mirrored' docs/environment-variables.md` trả về dòng 25. Mã tương ứng ở `packages/utils/src/env.ts:277-282` làm đúng vậy (`// OMP_ overrides PI_`). Nghĩa là cơ chế bí danh **cho biến đã tồn tại** — W13 không cần phát minh 100 bí danh mới, chỉ cần tài liệu hoá bí danh thật. Plan không nhắc cơ chế này. |
| `packages/coding-agent/src/prompts/internal-urls/omp.md` | sửa | **KHÔNG ĐỔI TÊN FILE.** Chỉ xem xét nội dung nếu bản thân `omp://` là tên hiển thị cần đổi — và khi đó việc đổi phải là đổi SCHEME, thuộc W9 (tên binary + selector), không thuộc W13. Xem `Cần người quyết` mục 2. | **Đã kiểm chứng** — đây là phát hiện quan trọng nhất mà plan không có. File này được import THEO ĐƯỜNG DẪN tại `packages/coding-agent/src/internal-urls/omp-protocol.ts:10`: `import ompDoc from "../prompts/internal-urls/omp.md" with { type: "text" };`. Đổi tên file là `bun run check:ts` đỏ ngay. Nội dung file là: `` `omp://`: harness docs, AVOID unless asked. `` |
| `.omp/commands/cleanup.md`, `.omp/commands/fix-issues.md`, `.omp/commands/release.md`, `.omp/commands/review-prs.md`, `.omp/commands/triage.md`, `.omp/skills/semantic-compression/SKILL.md`, `.omp/skills/system-prompts/SKILL.md`, `.omp/skills/system-prompts/small-models.md`, `.omp/skills/tool-prompt-optimization/SKILL.md` | sửa | **KHÔNG chạm.** 9 file `.md` này **không** phải tài liệu — chúng là prompt corpus nạp lúc chạy, cố ý nằm trong thư mục dot. Chúng nằm NGOÀI bề mặt tài liệu của W13. | **Đã kiểm chứng** — `git ls-files '.omp/**/*.md' \| wc -l` = 9. Chúng là runtime asset — `packages/coding-agent/src/compress/index.ts:58` ghi rõ: "prompt corpora live under dot directories such as `.omp/commands`". Một lệnh sed chạy trên "mọi file .md" sẽ nuốt cả 9 file này. |
| `packages/coding-agent/src/modes/controllers/input-controller.ts:2515` | sửa | **KHÔNG thuộc W13** (đây là `.ts`, thuộc W8b). Ghi lại vì `.omp.md` ở đó là ĐUÔI FILE TẠM và là legacy keep — không ai được đổi nó trong lúc quét tài liệu. | **Đã kiểm chứng** — dòng 2515 dùng extension `.omp.md` cho file editor tạm; `packages/coding-agent/test/external-editor.test.ts:91,99` khẳng định `omp-editor-123.omp.md` trên Windows. Ba vị trí này phải giữ nguyên. |
| `README.md` | sửa | Văn xuôi thương hiệu. 42 lượt token `omp` (biểu thức đã ghim ở plan §2.1) và 23 lượt `@oh-my-pi/`. Đây là file được đọc nhiều nhất trong lượt này — sửa tay theo ngữ cảnh, **KHÔNG sed**, vì nó chứa cả câu chào, cả tên lệnh trong code block. | **Đã đếm** — `git grep -ohE '(^\|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]\|$)' -- README.md \| wc -l` = 42; `git grep -c '@oh-my-pi/' -- README.md` = 23; file dài 701 dòng. |
| `AGENTS.md` | sửa | Sửa có chọn lọc và **PHẢI hỏi trước**. 3 lượt token `omp` (biểu thức §2.1) và 9 dòng chứa `@oh-my-pi/`. `AGENTS.md` là file mà công cụ lập trình đọc khi làm việc trong repo này — sửa nó đổi hành vi làm việc, không phải tài liệu. | **Đã kiểm chứng** và **đúng với plan** — quy tắc "scope không bao giờ hardcode trong TS" được viết trung tính về thương hiệu, nhưng file **không** trung tính: nó hardcode `@oh-my-pi/pi-catalog/<module>`, `@oh-my-pi/pi-utils`, `@oh-my-pi/pi-tui`, `@oh-my-pi/pi-natives/vcs`, `~/.omp/logs/omp.YYYY-MM-DD.log` và 2 URL attribution `https://github.com/can1357/oh-my-pi/issues/...`. Plan nói "hãy kiểm tra, đừng giả định" — đã kiểm tra: **cần** sửa, 11 dòng. |
| `CONTRIBUTING.md` | sửa | 1 dòng: tiêu đề dòng 1 `# Contributing to omp`. Dòng 84 có `OMP` viết hoa, **không** khớp biểu thức §2.1 (viết thường) — nhưng là attribution pháp lý nên xem lại cùng lúc. | **Đã kiểm chứng** — `grep -nE 'oh.my.pi\|\bomp\b\|ultraworker' CONTRIBUTING.md` → **chỉ dòng 1** (`# Contributing to omp`; lệnh phân biệt hoa/thường nên không ra dòng 84). Dòng 84 phải tìm bằng `grep -n 'OMP' CONTRIBUTING.md` → `84:A contribution intentionally submitted for inclusion in OMP is licensed under`. `git grep -ohE "$P" -- CONTRIBUTING.md | wc -l` = 1 — tức đúng 1 dòng khớp biểu thức §2.1, dòng 84 là attribution pháp lý viết hoa. Đây là file mà plan liệt kê là mang thương hiệu trong văn xuôi, và plan đúng — nhưng chỉ 1 dòng thật sự, không phải một lượt quét đáng kể. |
| `packages/*/CHANGELOG.md` | sửa | **KHÔNG SỬA.** 14 file changelog tồn tại; 13 file chứa `@oh-my-pi/`; 11 file chứa token `omp`. `AGENTS.md`: phần đã phát hành là bất biến, và mục changelog chỉ được thêm khi được yêu cầu rõ ràng. Lần đổi tên này **không** phải lúc đó. | **Đã kiểm chứng** — `git ls-files 'packages/*/CHANGELOG.md' \| wc -l` = 14 (plan và bảng §2.2 nói 13 ở một chỗ — nói rõ 14, trong đó 13 có scope; `packages/natives/CHANGELOG.md` là file không có scope). Đây là cạm bẫy số một của W7: `git grep -o '@oh-my-pi/' -- .` quét tới changelog và viết lại phần đã phát hành. |
| `LICENSE` | sửa | **KHÔNG ĐỔI.** 3 dòng bản quyền nêu tên tác giả: `Copyright (c) 2025 Mario Zechner`, `Copyright (c) 2025-2026 Can Bölük`, `Copyright (c) 2026 Stencil Labs, Inc.`. Không tên sản phẩm nào ở đây. | **Đã kiểm chứng** — `grep -nE 'oh-my-pi\|omp\|Copyright' LICENSE` → đúng 3 dòng, tên tác giả upstream. Khớp N10 của bảng `do_not_rename` (plan dòng 13272). Tác giả không phải tên sản phẩm. |
| `docs/extension-loading.md:231` | sửa | **KHÔNG SỬA Ở W13.** Dòng này thuộc sở hữu của W8a (plan dòng 13841 nói rõ W8a phải viết lại nó sau khi M2 chốt `exports` map). W13 chỉ ghi chú, không chạm. | **Đã kiểm chứng nội dung dòng 231** — mô tả `onLoad` hook viết lại `@mariozechner/*` và `@earendil-works/*`, và các shim legacy trong `src/extensibility/legacy-pi-ai-shim.ts` / `legacy-pi-coding-agent-shim.ts`. Đây là tài liệu hoá HỢP ĐỒNG nên phải viết tay, không sed. Xem `Cách sai dễ nhất` mục 1 — sở hữu kép. |
| `docs/porting-from-pi-mono.md:46-51` | sửa | **KHÔNG SỬA Ở W13.** Thuộc sở hữu của W8a (cùng lý do trên). Chỉ ghi chú. | **Đã kiểm chứng** — dòng 46-50 là 5 dòng map `@mariozechner/pi-*` → `@oh-my-pi/pi-*`; dòng 51 nói về scope `@earendil-works/*`. Sau W7 sáu map trong này sẽ sai. Nhưng W8a đã nhận sở hữu. |
| 13 file `.md` chứa URL `github.com/can1357/oh-my-pi` | sửa | **CHƯA QUYẾT ĐỊNH** — xem `Cần người quyết` mục 1. 24 lượt URL `https://github.com/can1357/oh-my-pi/...` nằm trong 13 file `.md` (ngoài changelog và file kế hoạch). Bảng `do_not_rename` (N1–N17) **không** có hàng nào phủ URL GitHub, và không work item nào sở hữu chúng. | **Đã đếm** — `git grep -ohE 'github\.com/[A-Za-z0-9_.-]+/oh-my-pi' -- '*.md' ':!packages/*/CHANGELOG.md' ...` → 24 lượt, 13 file. Cùng mẫu đó có 54 file `.ts` — tức là bề mặt này rộng hơn riêng W13. GitHub giữ redirect khi repo được đổi tên nên URL cũ **không** gãy, nhưng tài liệu sẽ trỏ tới tên cũ vĩnh viễn. Đây là khoảng trống thật trong plan, không phải chi tiết nhỏ. |
| `docs/` (82 file ở cấp đỉnh, 134 tính mọi cấp) | sửa | Quét văn xuôi. **40** file trong `docs/` chứa `@oh-my-pi/`; **58** file trong `docs/` chứa token `omp` (đếm lại bằng `git grep -lE "$P" -- 'docs/*.md' | wc -l`). Trong 82 file docs/ cấp đỉnh, thực sự có token cần đổi là **35** file (`82` là tổng số file docs/ cấp đỉnh, không phải số file cần sửa). File nhiều nhất: `docs/settings.md` (43 dòng khớp), `docs/cli-reference.md` (24), `docs/auth-broker-gateway.md` (23), `docs/marketplace.md` (15), `docs/collab.md` (15), `docs/local-models.md` (14), `docs/stream.md` (13). | **Đã kiểm chứng 82 và 134** — plan đúng cả hai. Đếm chéo từng file bằng `git ls-files` cũng ra 40 và 58. Đã kiểm tra **không** có bộ sinh tài liệu nào ghi vào `docs/` (không có mkdocs/docusaurus/astro/docsify; `package.json` không có script `gen:*` nào nhắm `docs/`; `git grep -ln 'docs/cli-reference\|docs/settings.md\|docs/providers.md' -- '*.ts'` rỗng). Vậy tài liệu là thủ công → sed được, nhưng phải sửa tay theo ngữ cảnh. |

### Các bước

0. **AN TOÀN KHI SỬA HÀNG TRĂM FILE — làm trước, không bỏ qua.** (a) Làm việc trên một nhánh riêng, không phải `main`/`milestone-1`. (b) Commit allow-list (bước 2) **trước khi** sửa file tài liệu nào, để luôn có mốc để `git reset --hard <commit-allowlist>` quay lại. (c) Mỗi đợt ~10 file thì commit một lần, ghi tên đợt trong commit message. (d) Bất kỳ lúc nào cũng phục hồi được bằng `git checkout HEAD -- <đường-dẫn>` cho từng file, không cần mạng, không cần backup thủ công. Đây là khoảng trống an toàn lớn nhất của W13: 93 file sửa tay, mỗi lượt phải phân loại, và M5 là milestone mà một lệnh sai không có undo.

1. **Điều kiện mở W13 — đừng bắt đầu cho tới khi ba điều kiện sau đều đạt, và nói ra điều kiện nào chưa đạt nếu chưa.** (a) `git grep -c 'ULTRAWORKERS_CONFIG_DIR' -- '*.ts'` trả về khác 0 — đo được 0, nghĩa là W4 **chưa** land. (b) `ls scripts/rename/keep-list.txt scripts/rename/disposition.tsv` tồn tại — hiện `scripts/rename/` không có, cả hai lệnh đều `No such file or directory`. (c) `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` **đã** được W8a viết lại — kiểm bằng `git log --oneline -- docs/extension-loading.md`; nếu W8a chưa chạy thì hai dòng đó vẫn còn tên cũ và W13 không được chạm vào. *(Plan chỉ ghi "Phụ thuộc: tất cả mục trước; M2 cho hai tài liệu hợp đồng" — không đủ cụ thể để chặn. Ba mục trên là bản kiểm được.)*

2. **Chốt danh sách loại trừ TRƯỚC khi chạm file nào, và commit nó.** Tạo `scripts/rename/docs-legacy-allowlist.txt`. Seed bằng kết quả lệnh ở `Xác minh` mục A (93 dòng trên HEAD `84cbac9`). **Đo lại tại thời điểm chạy và đừng ép về 93.** Trong 93 file đó **đã sẵn có 2 file runtime-asset**: `packages/coding-agent/src/prompts/internal-urls/omp.md` và `.omp/skills/semantic-compression/SKILL.md` (đã đếm: 8 file `.omp/` còn lại có 0 lượt khớp biểu thức P nên vốn không nằm trong tập 93 — **đừng trừ 10**). Số dòng allow-list = số đo được trừ **2**. Hai file đó **phải được giữ trong allow-list kèm lý do** ("runtime asset — `omp-protocol.ts:10` import theo đường dẫn" / "prompt corpus dưới thư mục dot"), vì quy tắc A không lọc chúng. Tương đương: hoặc giữ 2 dòng kèm lý do, hoặc thêm `':!packages/coding-agent/src/prompts/internal-urls/omp.md' ':!.omp/**'` vào lệnh quy tắc A — **phải chọn một và ghi vào allow-list**, nếu không gate A đỏ vĩnh viễn. Nếu con số 93 lệch với lúc bạn chạy, dùng con số đo được **tại thời điểm chạy** và ghi lại con số đó. *(Allow-list là thứ làm cho gate đỏ được. Plan không có file này; plan đưa lệnh kiểm là `bun run check`, và typecheck không nói gì về nội dung markdown.)*

3. **ĐỔI TÊN BIẾN MÔI TRƯỜNG trong `docs/environment-variables.md` — nhưng đổi đúng MỘT tên, không phải 100.** Thêm cột `New name` vào **CẢ 29 bảng** (danh sách đầy đủ lấy từ lệnh ở `Xác minh` mục C; đừng dừng ở 10 bảng đầu). Với 99 dòng `PI_*`/`OMP_*`, cột `New name` ghi chính xác tên hiện tại, và CHỈ `PI_CONFIG_DIR` mang giá trị `ULTRAWORKERS_CONFIG_DIR` (cộng thêm, thắng). Sửa **dòng 25** (đã kiểm: `grep -n 'mirrored' docs/environment-variables.md` → 25; dòng 29 là `---`) để nói rõ cơ chế mirror `OMP_*` → `PI_*` vẫn chạy và `ULTRAWORKERS_CONFIG_DIR` thắng `PI_CONFIG_DIR`. **KHÔNG đổi tên bất kỳ `PI_*`/`OMP_*` nào** — N16 giữ chúng vĩnh viễn. *(File 648 dòng, 100 dòng biến, 29 bảng. NGUY HIỂM: bảng §2.2 hàng 21 của plan nói "100 dòng phải bổ sung tên mới" và W13 nói "mỗi biến phải có một dòng nêu tên mới tương ứng" — đọc thẳng thì ra phát minh 100 bí danh `ULTRAWORKERS_*` mới, tức thêm 100 chỗ đọc env trong code mà KHÔNG work item nào sở hữu. Sửa dòng 25 nói rõ đây là tài liệu hoá cơ chế CÓ SẴN.)*

4. **Sửa văn xuôi thương hiệu, file từng file, KHÔNG chạy sed trên cả `.md`.** Bắt đầu từ 10 file nhiều nhất đã đếm ở `File cần chạm tới` (`docs/settings.md` 43, `README.md` 36, `docs/cli-reference.md` 24, `docs/auth-broker-gateway.md` 23, `docs/marketplace.md` 15, `docs/collab.md` 15, `docs/local-models.md` 14, `docs/stream.md` 13, `docs/skills/authoring-extensions.md` 13, `docs/toolconv/hermes.md` 12) rồi mới tới phần đuôi. *(Các con số trong danh sách này là **số dòng** khớp, đo bằng `git grep -c`; `README.md` có 42 lượt trên 36 dòng — xem `Cần người xác nhận` mục 2.)* Với mỗi lượt `omp` phân loại: tên lệnh trong code block (đổi), tên hiển thị trong văn xuôi (đổi), đường dẫn `~/.omp/...` (xem bước 5), hay legacy keep (giữ, ghi vào allow-list kèm lý do). *(93 file / 549 lượt sau khi trừ changelog và file kế hoạch. Sửa tay bắt buộc vì đây là văn xuôi: `README.md` vừa có tên lệnh trong code block vừa có câu chào.)*

5. **GIỮ `.omp` trong đường dẫn, KHÔNG đổi thành `.ultraworkers`.** `docs/environment-variables.md` dòng 18-21 mô tả `~/.omp/agent/.env` và `~/.omp/.env` là nơi dotenv thật sự được đọc. Sau W6 sẽ có HAI thư mục cùng tồn tại (dual-root của W4), nên câu này phải nói rõ thư mục nào là thư mục THẬT tại thời điểm đọc, thay vì đổi tên. Tương tự cho mọi đường dẫn `~/.omp` và mọi literal `.omp` trong **78 file `.md`, 404 lượt** (đã loại 14 changelog bất biến và 5 file kế hoạch; con số 90 file / 647 lượt là phạm vi toàn repo và **không** phải bề mặt W13 — nếu bạn đo lại ra 90/647 thì bạn đã quên các trừ này): `git grep -oh '\.omp' -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l`. *(N14 của bảng `do_not_rename` giữ thư mục `.omp` cấp project. Kế hoạch §5 — đọc ở dòng ~13200, mục 1 — yêu cầu W13 chạy SAU W6; lý do là **không viết tài liệu theo trạng thái trước khi `CONFIG_DIR_NAME` lật**, không phải để chờ hai thư mục "cùng tồn tại" — dual-root là trạng thái vĩnh viễn của W4. Nếu bạn đổi `.omp` thành `.ultraworkers` trong doc, tài liệu sẽ mô tả một thư mục mà bản cài cũ không có.)*

6. **KHÔNG chạm 14 file `packages/*/CHANGELOG.md` và KHÔNG chạm `LICENSE`.** 13 file changelog chứa `@oh-my-pi/` và 11 chứa token `omp`; tất cả đều thuộc vùng bất biến hoặc phần đã phát hành. `LICENSE` có 3 dòng tên tác giả, không có tên sản phẩm. *(`AGENTS.md` mục Changelog: "New entries always go under `## [Unreleased]`", phần đã phát hành là bất biến. N10 giữ dòng bản quyền. Sai lầm lớn nhất của W13 là thêm một mục changelog vì lần đổi tên này hướng tới người dùng — `AGENTS.md` cấm, trừ khi người dùng nói rõ.)*

7. **Chạy gate. Nếu gate A đỏ, KHÔNG xoá dòng khỏi allow-list để làm nó xanh trừ khi bạn đã phân loại lượt đó thành legacy keep VÀ ghi lý do.** Allow-list là danh sách DUYỆT, không phải nơi chôn thứ chưa xử lý. Nếu một file còn trong allow-list nhưng đã hết token `omp`, `comm -13` sẽ báo — đó là nhánh đỏ ngược và cần giữ. *(Chạy cả ba quy tắc ở `Cổng hoàn thành`, không chỉ quy tắc A.)*

### Hình dạng code

Không có code sản phẩm nào. W13 chỉ tạo HAI artifact mới và sửa markdown.

**(1) `scripts/rename/docs-legacy-allowlist.txt`** — text, một đường dẫn mỗi dòng, không header, `LC_ALL=C sort`, đường dẫn tương đối từ gốc repo, **KHÔNG** có dòng rỗng và **KHÔNG** có dòng trùng. Mỗi dòng phải có lý do — dùng định dạng:

```
<đường_dẫn>  # <lý do>
```

giống `scripts/rename/keep-list.txt` mà W7 sẽ tạo, để hai danh sách đọc giống nhau. Vì có phần `# giải thích`, gate phải cắt phần sau `#` trước khi so sánh, nếu không mọi dòng đều hỏng.

**(2) `scripts/rename/check-docs-rename.ts`** — script đọc allow-list, bỏ phần `#` và khoảng trắng thừa, dựng `Set<string>`; chạy ba quy tắc A/B/C ở `Cổng hoàn thành`; in mỗi vi phạm ra luồng lỗi; `process.exit(1)` nếu có bất kỳ vi phạm nào, `process.exit(0)` nếu không. Vì file nằm trong `scripts/`, `check:tools` của repo (oxlint + oxfmt) tự quét — không cần thêm cấu hình.

**(3) `docs/environment-variables.md`** — thêm cột `New name` ngay sau cột `Variable` trong **CẢ 29 bảng**, không chỉ bảng đầu — 29 header, liệt kê đủ bằng `grep -nE '^\| *(Variable|Variable group) +\|' docs/environment-variables.md`. Giá trị của cột: 99 dòng ghi lại chính tên cũ; `PI_CONFIG_DIR` ghi `ULTRAWORKERS_CONFIG_DIR`. Sửa **dòng 25** để mô tả cơ chế mirror `OMP_*` → `PI_*` đang chạy thật trong `packages/utils/src/env.ts:277-282` (đã kiểm chứng):

```typescript
// OMP_ overrides PI_
for (const k in result) {
	if (k.startsWith("OMP_")) result[`PI_${k.slice(4)}`] = result[k];
}
```

### Hợp đồng test

**Không viết test `bun test`** — và đây là kết luận ĐÚNG, không phải sự lười. `AGENTS.md` cấm hai thứ liên quan: "wording/defaults — NEVER assert prompt/UI boilerplate, a default literal", và cấm source-grep. Một test đọc `docs/environment-variables.md` rồi `expect(text).toContain('ULTRAWORKERS_CONFIG_DIR')` đúng nghĩa là kiểm tra hình dạng câu chữ, và sẽ đỏ khi người ta reflow bảng mà không đổi ý nghĩa. Danh sách `test_files` của spec rỗng — không có file test nào được thêm.

Thay vào đó, bảo vệ hợp đồng tài liệu bằng CHECKER CÓ EXIT CODE (`scripts/rename/check-docs-rename.ts`), vì nó bỏ qua hình thức và chỉ ép đúng ba điều:

- **(A)** mọi file `.md` còn mang token thương hiệu phải nằm trong allow-list đã duyệt — nếu hồi quy, người đọc tài liệu lại thấy tên cũ xuất hiện ở một file chưa được duyệt.
- **(B)** mọi tên `ULTRAWORKERS_*` đọc trong code phải có trong doc, và mọi tên `ULTRAWORKERS_*` trong doc phải được code đọc — đây là DoD "không có biến mới nào mồ côi" của plan, ở dạng chạy được. Nếu hồi quy, người dùng đặt biến trong shell profile sẽ thấy biến có trong tài liệu nhưng không có tác dụng, hoặc biến chạy thật lại không có ở tài liệu. Cần **cả hai chiều**: `comm -23` bắt hồi quy W4 land `ULTRAWORKERS_CONFIG_DIR` mà W13 quên ghi doc; `comm -13` một mình không bắt được tình huống đó.
- **(C)** không phần changelog đã phát hành nào bị sửa — nếu hồi quy, phần đã phát hành bị viết lại vì một lần đổi tên. Mục `## [Unreleased]` là ngoại lệ duy nhất, và chỉ khi người dùng yêu cầu rõ ràng.

Checker chạy được khi toàn bộ `bun test` đang bị chặn trên máy này, nên nó là hàng phòng thủ thật sự chứ không phải bước trang trí. Nếu hạ tầng CI của repo không chạy script trong `scripts/` tùy ý thì nối nó vào job `check:tools` — kiểm trước khi viết.

### Xác minh

Tất cả số dưới đây chạy thật trên commit `84cbac9` (không phải HEAD — HEAD đã trôi, hiện là `1454dc0` và file `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` đã thêm/sửa từ đó, làm tổng lượt `omp` toàn `.md` đổi 1293 → 1307; số file vẫn 109), macOS, 2026-09-27. **Các con số cốt lõi dưới đây vẫn tái lập được ở HEAD hiện tại** — đã chạy lại toàn bộ và nhận đúng 93 file / 549 lượt, 66 file `@oh-my-pi/`, 100 dòng biến, 612 file `.md`, 82/134 docs, 14/13/11 changelog, 24/13/54 URL. Chạy lại và **ghi con số bạn đo được** vào allow-list, đừng ép về con số ở đây.

**A) Bề mặt thật của W13** (loại changelog + 5 file kế hoạch ở gốc) — kỳ vọng 93 file, 549 lượt:

```bash
P='(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)'
git grep -lE "$P" -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | sort
git grep -cE "$P" -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | sort -t: -k2 -rn | head -25
```

**B) Bề mặt scope còn lại** sau khi trừ changelog + kế hoạch — kỳ vọng 66:

```bash
git grep -l '@oh-my-pi/' -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l
```

**C) Cột tương thích** — giữ nguyên 100 (số này của plan đúng), 29 dòng header bảng:

```bash
grep -cE '^\| .(PI|OMP)_[A-Z0-9_]+' docs/environment-variables.md
grep -nE '^\| *Variable' docs/environment-variables.md
```

**D) Vùng bất biến** — kỳ vọng 0 thay đổi:

```bash
git diff --name-only "$BASE"...HEAD -- 'packages/*/CHANGELOG.md' | wc -l
git diff --name-only "$BASE"...HEAD -- LICENSE | wc -l
```

**E) Asset runtime phải sống sót** (cổng âm — đỏ nếu file biến mất hoặc tên đổi):

```bash
git grep -n 'internal-urls/omp.md' -- '*.ts'
git ls-files '.omp/**/*.md' | wc -l
```

Kỳ vọng: lệnh đầu vẫn ra `packages/coding-agent/src/internal-urls/omp-protocol.ts:10`, lệnh sau bằng 9.

**F) Kiểm tra kiểu chạy, không phải kiểm tra nội dung:**

```bash
bun run check:ts
```

Chạy được, exit 0, ~56s trên máy này. Dùng làm tín hiệu chính vì `bun test` đang bị chặn (`Failed to load pi_natives native addon for darwin-arm64`). Nếu cần build native: `brew install ninja` **trước**, rồi `bun --cwd=packages/natives run build` — thiếu ninja thì CMake dừng với `CMAKE_MAKE_PROGRAM is not set`.

### Cổng hoàn thành

Ba quy tắc, chạy **CẢ BA**, và cả ba đều phải đỏ được. Dùng script `scripts/rename/check-docs-rename.ts`; dưới đây là bản một dòng để kiểm cục bộ.

**Mốc so sánh cố định — bắt buộc, dùng cho cả ba quy tắc:**

```bash
BASE=84cbac9   # mốc trước W13; đặt thành commit cha của nhánh W13
```

`git diff` trần và `git grep` trên HEAD đều **không thấy thay đổi đã commit** (chúng đọc trạng thái hiện tại, không so với một mốc), nên cổng sẽ xanh trong khoảng thời gian dài bất kỳ kể từ commit đầu tiên — đó là lỗi "không phân biệt được đã làm với chưa làm" mà quy tắc A cảnh báo. Ba chấm (`$BASE...HEAD`) là phạm vi đã commit.

**QUY TẮC A — không còn token thương hiệu ngoài allow-list:**

```bash
P='(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)'
# tập GỐC (mốc) và tập HIỆN TẠI (HEAD) — cả hai đều so với allow-list
git grep -lE "$P" "$BASE" -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | LC_ALL=C sort > /tmp/w13-base.txt
{ git grep -lE "$P" -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' || true; } \
  | LC_ALL=C sort > /tmp/w13-actual.txt
{ sed 's/[[:space:]]*#.*$//' scripts/rename/docs-legacy-allowlist.txt | sed '/^$/d' | LC_ALL=C sort; } > /tmp/w13-allowed.txt
comm -23 /tmp/w13-actual.txt /tmp/w13-allowed.txt      # rỗng = XANH, có dòng = ĐỎ
comm -13 /tmp/w13-actual.txt /tmp/w13-allowed.txt      # rỗng = XANH, có dòng = ĐỎ (dòng allow-list đã hết hiệu lực)
comm -23 /tmp/w13-base.txt /tmp/w13-actual.txt | wc -l  # file mang thương hiệu bị bỏ sót khỏi allow-list = ĐỎ nếu khác 0
```

Vì sao đỏ được: thêm một file `.md` mới mang thương hiệu, hoặc quên gỡ một file khỏi allow-list sau khi đã đổi tên, đều làm `comm` in ra dòng. Lệnh thứ ba so tập gốc với tập hiện tại để bắt file **bị bỏ sót** — nếu không có nó, một allow-list thiếu dòng sẽ trống mà `comm -23` phía trên cũng không phát hiện được vì phía "thực tế" cũng thiếu. `|| true` là **BẮT BUỘC** — `git grep` exit 1 khi không khớp, nếu nối bằng `&&` thì `comm` bị bỏ qua và gate luôn xanh, tức là gate không phân biệt được "đã làm" với "lệnh không chạy". Đây đúng là lỗi mà yêu cầu cảnh báo.

**Ngưỡng allow-list (bắt buộc):** allow-list cuối cùng **không được dài hơn 25 dòng**. Con số này là số dư kiểm chứng được — sau khi làm xong, chạy lại lệnh `Xác minh` mục A: tổng lượt `omp` còn lại trên `.md` phải ≤ 5% của 549 (tức ≤ 27 lượt), và số file còn lại ≤ 25. Nếu allow-list dài hơn, đó là dấu hiệu W13 đã bỏ sót việc sửa chứ không phải vài file legacy hợp lệ. Sửa file thay vì thêm vào allow-list.

**QUY TẮC B — biến môi trường không mồ côi, hai chiều** (DoD "không có biến mới nào mồ côi"):

```bash
CODE=<(git grep -ohE '(process\.env|Bun\.env)\.ULTRAWORKERS_[A-Z0-9_]+' -- '*.ts' | grep -oE 'ULTRAWORKERS_[A-Z0-9_]+' | LC_ALL=C sort -u)
DOC=<(grep -ohE 'ULTRAWORKERS_[A-Z0-9_]+' docs/environment-variables.md | LC_ALL=C sort -u)
comm -23 "$CODE" "$DOC"   # biến code đọc mà doc không có = ĐỎ
comm -13 "$CODE" "$DOC"   # biến doc có mà code không đọc = ĐỎ
```

Baseline đo được: phía code 0, phía doc 0 → cả hai `comm` rỗng → XANH. Chiều `comm -23` bắt đúng tình huống W4 land `ULTRAWORKERS_CONFIG_DIR` mà W13 quên ghi doc — **chiều `comm -13` một mình KHÔNG bắt được**, đã kiểm bằng cách mô phỏng: đưa `ULTRAWORKERS_CONFIG_DIR` vào vế code, `comm -13` in ra rỗng (vẫn XANH) trong khi `comm -23` in ra nó. Chiều `comm -13` bắt chiều ngược lại: doc nói một tên mà không chỗ nào đọc.

**QUY TẮC C — changelog bất biến, TRỪ mục [Unreleased] được yêu cầu rõ ràng:**

```bash
BAD=$(git diff --name-only "$BASE"...HEAD -- 'packages/*/CHANGELOG.md' | while read -r f; do
  # file sạch nếu thay đổi chỉ nằm dưới tiêu đề "## [Unreleased]"
  git diff "$BASE"...HEAD -- "$f" | grep -E '^[+-]' | grep -vE '^[+-]{3} |^[+-]## \[Unreleased\]' | grep -q . && echo "$f"
done)
[ -n "$BAD" ] && { printf 'FAIL changelog: %s\n' $BAD; exit 1; }
```

Mục `## [Unreleased]` là nơi duy nhất được phép đổi, và chỉ khi người dùng yêu cầu rõ ràng — phần đã phát hành là bất biến. Nếu bạn không được yêu cầu, quy tắc C phải đỏ. Baseline 0 dòng. Đỏ ngay khi có ai thêm một mục changelog "vì lần đổi tên này hướng tới người dùng" — đúng cái sai lầm `AGENTS.md` cấm mà plan nêu là rủi ro số một.

**CỔNG KẾT:** quy tắc A rỗng cả hai chiều và lệnh so tập gốc bằng 0, quy tắc B rỗng cả hai chiều, quy tắc C rỗng, allow-list không quá 25 dòng, và `bun run check:ts` exit 0.

**Lưu ý về `bun run check` mà plan chỉ định:** đó là `bun run --parallel check:ts check:rs`, cần cargo, và typecheck không nói gì về nội dung markdown. Giữ nó như điều kiện phụ, đừng để nó thay cho ba quy tắc trên.

**Cổng có thực sự đỏ được không:** CÓ — `gate_can_fail: true`. Cả ba quy tắc đều có đường đỏ đã nêu ở trên. Nhưng lệnh mà plan chỉ định làm cổng nghiệm thu (`bun run check`) thì **không** đỏ được: nó là typecheck + cargo, xanh dù W13 chưa sửa một dòng nào, và không cái nào đọc nội dung markdown.

### Phụ thuộc

**`depends_on`:**

- **W7** — scope `@oh-my-pi/` đã đổi trên 4107 file; nếu chưa, W13 sẽ sửa scope lần thứ hai bằng tay trên 66 file `.md`.
- **W4** — `ULTRAWORKERS_CONFIG_DIR` phải tồn tại trong code trước khi W13 ghi nó vào doc. Đo `git grep -c 'ULTRAWORKERS_CONFIG_DIR' -- '*.ts'` = 0, tức W4 **chưa** land.
- **W8a** — SỞ HỮU `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` (plan dòng 13841). W13 **không** được chạm hai dòng này.
- **W9** — tên binary mới đã chốt, vì tên lệnh trong code block của `docs/` phải khớp tên thật.
- **W6** — `CONFIG_DIR_NAME` đã lật. W4 giữ **dual-root vĩnh viễn**, nên sau W6 **cả `~/.omp` và `~/.ultraworkers` đều được đọc theo thứ tự ưu tiên, không phải cái nào biến mất**. Mốc cần chờ là "W13 chạy SAU W6" (để không viết tài liệu theo trạng thái trước khi lật), chứ không phải "chờ đến khi hai thư mục cùng tồn tại" — điều kiện đó vốn đã đúng vĩnh viễn. Câu đúng để viết trong doc là: "`~/.ultraworkers` được đọc trước, `~/.omp` vẫn được đọc để tương thích".
- **W10** — CI/Docker/brew/nix đã đổi tên, để tài liệu cài đặt không hướng dẫn sai tên artifact.
- **M2** — exports map đã chốt trên main; nếu chưa thì `docs/extension-loading.md` mô tả một bản đồ đang sửa.

**`blocks`:**

- Cổng phát hành của M5 — không ký/n notarize được cho tới khi tài liệu không còn mô tả tên cũ như thể đó là tên hiện hành.
- Điều kiện kết thúc "một grep token `omp` đứng riêng trên `.md` chỉ trả về tập legacy có chủ đích" của plan §ĐỊNH NGHĨA HOÀN THÀNH.

### Cách sai dễ nhất

1. **Sở hữu kép với W8a — nghiêm trọng nhất và chưa ai giải quyết.** `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` được W13 nêu ở dòng 13975 **VÀ** được W8a nhận ở dòng 13841. Hai kỹ sư sửa cùng hai dòng trong cùng milestone. Cách sửa: một bên chịu trách nhiệm, ghi tên bên đó vào `keep_refs` trong `disposition.tsv`, bên kia bỏ qua. Chọn W8a chịu trách nhiệm vì W8a đã nêu điều kiện "chỉ sau khi M2 chốt exports map" — W13 không có điều kiện đó.
2. **Thêm mục changelog** — sai lầm plan đã cảnh báo và xác nhận là có thật. 14 file changelog, 13 file có `@oh-my-pi/`, 11 file có token `omp`. Quy tắc C ở `Cổng hoàn thành` chặn nó bằng exit code thay vì bằng ý thức.
3. **Chạy sed trên mọi file `.md`** — sẽ nuốt **2** asset runtime có mặt trong tập 93 (`internal-urls/omp.md` và `.omp/skills/semantic-compression/SKILL.md`); 8 file `.omp/` còn lại không khớp biểu thức P nên nằm ngoài tập nhưng vẫn phải tránh theo đường dẫn. `packages/coding-agent/src/prompts/internal-urls/omp.md` được import theo đường dẫn tại `omp-protocol.ts:10`; đổi tên là typecheck đỏ. 9 file dưới `.omp/` là prompt corpus nạp lúc chạy (`compress/index.ts:58` ghi rõ chúng nằm trong thư mục dot). **Lọc bằng đường dẫn là bắt buộc**, và hai dòng có mặt trong tập phải ở allow-list kèm lý do nếu bạn chọn không lọc (xem bước 2).
4. **Đổi `.omp` thành `.ultraworkers` trong doc** — sẽ khiến tài liệu mô tả thư mục mà bản cài cũ không có. **404 lượt `.omp` trên 78 file `.md`** là bẫy (đã loại 14 changelog bất biến và 5 file kế hoạch; 647 lượt trên 90 file là phạm vi toàn repo, không phải bề mặt W13). N14 giữ thư mục `.omp` cấp project, và W4 giữ dual-root vĩnh viễn, nên câu đúng là "đọc theo thứ tự ưu tiên, thư mục cũ vẫn được đọc" chứ không phải "thư mục là X".
5. **Phát minh 100 bí danh `ULTRAWORKERS_*`** — bẫy đọc nhầm. §2.2 hàng 21 nói "100 dòng phải bổ sung tên mới" và W13 nói "mỗi biến phải có một dòng nêu tên mới tương ứng". Đọc thẳng thì đó là 100 chỗ đọc env MỚI trong code, không work item nào sở hữu, và trái N16. Sự thật đã kiểm chứng: cơ chế mirror `OMP_*` → `PI_*` **đã tồn tại** (`env.ts:277-282`) và doc đã mô tả nó ở dòng 25. W13 tài liệu hoá cơ chế có sẵn và thêm đúng MỘT tên mới.
6. **Gate không đỏ được — rủi ro quy trình.** `bun run check` mà plan chỉ định là typecheck + cargo; nó xanh dù W13 chưa làm gì. Và nếu nối `git grep` với `comm` bằng `&&`, `git grep` exit 1 khi sạch làm `comm` không chạy, và gate luôn xanh. Đã ghi `|| true` trong `Cổng hoàn thành`. Thêm nữa, `git diff` trần và `git grep` trên HEAD **không thấy thay đổi đã commit**, nên ba quy tắc đều phải so với mốc `$BASE`.
7. **Đổ 93 file vào allow-list rồi không sửa gì** — quy tắc A xanh vì allow-list vô hạn. Vì vậy có ngưỡng 25 dòng ở `Cổng hoàn thành`; allow-list là danh sách DUYỆT, không phải thùng rác.

### Cần người quyết

- **URL `github.com/can1357/oh-my-pi` có được đổi không?** 24 lượt trên 13 file `.md` và 54 file `.ts`. Bảng `do_not_rename` N1–N17 **không** có hàng nào phủ nó, và không work item nào sở hữu. GitHub giữ redirect khi repo đổi tên nên URL cũ không gãy — nghĩa là đây là việc **không gãy**, cũng chính vì thế dễ bị bỏ sót vĩnh viễn. Cần người dùng trả lời: repo GitHub có được đổi tên trong M5 không? Nếu có, W13 cập nhật 13 file `.md` và phần `.ts` phải có chủ sở hữu riêng (không thuộc W13). Nếu không, thêm một hàng N mới vào `do_not_rename` với lý do.
- **`omp://` là tên hiển thị cần đổi không?** `packages/coding-agent/src/prompts/internal-urls/omp.md` giữ tài liệu harness và được import theo đường dẫn. Nếu đổi thì đổi SCHEME, thuộc W9, và phải giữ alias cho scheme cũ. Nếu giữ thì cần một hàng trong `do_not_rename`. W13 không tự quyết.
- **9 file `.md` dưới `.omp/` và `internal-urls/omp.md` có được tính vào "tài liệu" không?** Khuyến nghị: **không**. Trong 93 file, chỉ **2** thật sự có mặt (`internal-urls/omp.md` và `.omp/skills/semantic-compression/SKILL.md`); 8 file `.omp/` còn lại có 0 lượt khớp biểu thức P nên vốn không nằm trong tập. Bước 2 vì vậy giữ 2 dòng đó trong allow-list kèm lý do thay vì trừ 10. Nhưng nếu chúng được tính vào thì tổng bề mặt là **101** (93 + 8), không phải 103, và phải có người chịu trách nhiệm riêng cho chúng — không phải W13.
- **Ai sửa `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51`?** Câu hỏi sở hữu kép ở `Cách sai dễ nhất` mục 1. Đề xuất W8a, vì W8a đã ghi điều kiện phụ thuộc M2 còn W13 thì không.
- **`scripts/rename/check-docs-rename.ts` có được nối vào job CI nào?** Repo có `check:tools` (oxlint + oxfmt) chạy trong `bun run check`, nhưng đó là lint chứ không phải gate nội dung. Cần biết job nào sẽ gọi nó, nếu không thì gate chỉ chạy khi ai đó nhớ chạy tay — tức là gate hữu ích nhưng không ép ai.
- **Cột `New name` trong `docs/environment-variables.md` có phản ánh cơ chế mirror `OMP_*` → `PI_*` (đã có) hay chỉ ánh xạ `ULTRAWORKERS_CONFIG_DIR`?** Đề xuất: cột chỉ ghi TÊN, và sửa dòng 25 để giải thích cơ chế. Nếu cột ghi cả quan hệ thắng/thua thì phải quyết định rõ điều gì thắng gì cho **từng** biến, và đó là câu hỏi lớn hơn W13.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| §2.2 hàng 7 và W13 (dòng 13978): "723 lượt token `omp` trên 105 file" trong `.md` | SAI | Trên HEAD `84cbac9`, biểu thức đã ghim ở §2.1 cho 1293 lượt trên 109 file. Nếu trừ 13 file changelog và 5 file kế hoạch ở gốc (chúng không thuộc W13 vì bất biến / không phải tài liệu sản phẩm), bề mặt thật của W13 là **549 lượt trên 93 file**. Con số để vào allow-list là 93, không phải 105. Con số 723 không tái lập được bằng bất kỳ biến thể nào của biểu thức đã ghim. |
| W13 dòng 13975: "Có 603 file markdown được track" | SAI | 612 file markdown được track. Lệnh: `git ls-files '*.md' \| wc -l`. Chênh 9 file — khớp đúng với 9 file runtime dưới `.omp/`, nhiều khả năng số cũ đếm trước khi chúng được thêm. |
| W13 dòng 13975: "79 chứa `@oh-my-pi/`" | SAI | 84 file `.md` chứa `@oh-my-pi/`. Sau khi trừ 13 file changelog (bất biến) và 5 file kế hoạch ở gốc, còn **66** file — đó mới là bề mặt scope thật của W13. |
| W13 dòng 13975: "82 trong `docs/` ở cấp đỉnh (134 nếu tính mọi cấp)" | ĐÚNG | Giữ nguyên. Lưu ý kỹ thuật: `git ls-files 'docs/*.md'` **không** cho ra 82 — dấu `*` của git pathspec khớp cả dấu `/`, nên lệnh đó ra 134. Muốn 82 phải lọc bằng `grep -E '^docs/[^/]+\.md$'`. |
| W13 dòng 13977 và §2.2 hàng 21: `docs/environment-variables.md` liệt kê 100 biến `PI_*`/`OMP_*` | ĐÚNG | Giữ nguyên. Nhưng phải thêm: file có **29 bảng** với header riêng, và cột tương thích phải thêm vào **CẢ 29**, không chỉ bảng đầu. Plan không nói cấu trúc bảng nên dễ làm thiếu — và vì 95/100 dòng biến nằm ở các bảng có header từ dòng 270 trở đi, làm thiếu phần đuôi là mất gần hết tác dụng của cột. |
| W13: "`docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` đã thuộc W8" | ĐÚNG VỀ NỘI DUNG, SAI VỀ SỞ HỮU | Hai neo dòng chính xác — đã mở và xác nhận nội dung khớp. Nhưng W8a (plan dòng 13841) đã **nhận sở hữu** chúng ràng rõ, trong khi W13 lại liệt kê lại. Phải chọn một chủ sở hữu. Đề xuất W8a. |
| W13 dòng 13978 liệt kê `CONTRIBUTING.md` như file mang thương hiệu trong văn xuôi | ĐÚNG NHƯNG QUÁ NHỎ ĐỂ LÀ CÁI RIÊNG | Chỉ 1 dòng thật sự khớp biểu thức §2.1: dòng 1 `# Contributing to omp`. Dòng 84 có `OMP` viết hoa, không khớp biểu thức viết thường. Không cần một mục riêng — gộp vào lượt văn xuôi. |
| W13 dòng 13975: "quy tắc scope không bao giờ hardcode trong TS của `AGENTS.md` giữ cách diễn đạt trung lập về thương hiệu — hãy kiểm tra, đừng giả định là cần sửa" | NỬA ĐÚNG | Câu đó về **một** quy tắc thì đúng. Nhưng `AGENTS.md` nói chung **không** trung lập về thương hiệu — nó **cần** sửa. 11 dòng mang tên cũ: 4 đường dẫn import `@oh-my-pi/pi-*`, `~/.omp/logs/omp.YYYY-MM-DD.log`, `__omp_worker_*` selector, `omp --smoke-test`, `omp-stats`, và 2 URL attribution `github.com/can1357/oh-my-pi`. Sửa `AGENTS.md` là đổi hành vi làm việc trong repo, nên cần hỏi trước. |
| W13 dòng 13976 và N11: "`packages/*/CHANGELOG.md`" được nhắc như một mục đơn | ĐÚNG VỀ NGUYÊN TẮC, SAI VỀ SỐ | Có **14** file changelog, không phải 13. 13 file chứa `@oh-my-pi/` (`packages/natives/CHANGELOG.md` là file không có scope) và 11 file chứa token `omp`. Con số 13 xuất hiện ở plan dòng 13828 và khớp với "13 file có scope" — nhưng W13 nói `packages/*/CHANGELOG.md` chung chung, nên khi đếm phải nói rõ 14 tổng / 13 có scope. |
| W13 dòng 13983: "Lệnh: `bun run check`" là cổng nghiệm thu | SAI — KHÔNG ĐỎ ĐƯỢC | `bun run check` là `bun run --parallel check:ts check:rs`: typecheck + cargo. Cả hai đều xanh dù W13 chưa sửa một dòng nào, và không cái nào đọc nội dung markdown. Nó không phân biệt được "đã làm" với "chưa làm". Thay bằng ba quy tắc ở `Cổng hoàn thành`; giữ `bun run check:ts` như điều kiện phụ vì nó bắt được lỗi import nếu ai đó đổi tên `internal-urls/omp.md`. |
| W13 dòng 13982: "Test cần viết: không có test. Nội dung tài liệu không phải hợp đồng runtime quan sát được." | ĐÚNG VỀ KẾT LUẬN, THIẾU MỘT NỬA | Đúng là không viết `bun test` — `AGENTS.md` cấm assert trên chữ của file, và đúng là DoD "không có biến mới nào mồ côi" của plan **không** thể kiểm bằng `bun run check`. Nhưng kết luận "không có test" kéo theo việc **không có gì ép ai**, và đó là chỗ hởng. Thay bằng checker có exit code `scripts/rename/check-docs-rename.ts` chạy được ngay cả khi `bun test` đang bị chặn trên máy này. Baseline đo được: `git grep -ohE '(process\.env\|Bun\.env)\.ULTRAWORKERS_[A-Z0-9_]+' -- '*.ts'` = 0, nên quy tắc B xanh ngay bây giờ và đỏ đúng lúc W4 land mà W13 bỏ sót doc. |
| W13 giả định toàn bộ 603 file `.md` là văn xuôi có thể sed | SAI — THIẾU MỘT LOẠI FILE NGUY HIỂM | Ít nhất 10 file `.md` được track **không** phải tài liệu mà là asset nạp lúc chạy. `packages/coding-agent/src/prompts/internal-urls/omp.md` được import theo đường dẫn — đổi tên file là `bun run check:ts` đỏ. 9 file dưới `.omp/commands/` và `.omp/skills/` là prompt corpus, cố ý nằm trong thư mục dot. Trong tập 93 file của lệnh `git grep -- '*.md'` chỉ **2** thật sự xuất hiện (`internal-urls/omp.md` và `.omp/skills/semantic-compression/SKILL.md`, mỗi file 1 lượt; 8 file `.omp/` còn lại có 0 lượt khớp) — nên phải loại theo **ĐƯỜNG DẪN**, không phải theo phần mở rộng, và hai dòng đó phải được giữ trong allow-list kèm lý do hoặc bị lọc khỏi quy tắc A. Ngoài ra `.omp.md` còn là đuôi file tạm tại `input-controller.ts:2515` và trong `packages/coding-agent/test/external-editor.test.ts:91,99` — ba vị trí phải giữ nguyên. |
| W13 dòng 13977: cần "thêm cột tương thích: mỗi biến phải có một dòng nêu tên mới tương ứng", và §2.2 hàng 21: "100 dòng phải bổ sung tên mới" | SAI — NẾU ĐỌC THẲNG SẼ PHÁT MINH 100 BÍ DANH MỚI | Cơ chế bí danh cho biến môi trường **đã tồn tại** và đã được tài liệu hoá: `parseEnvFile` mirror mọi khoá `OMP_*` sang `PI_*`, và dòng 25 của chính file doc nói đúng điều đó. W4 chỉ thêm MỘT tên mới (`ULTRAWORKERS_CONFIG_DIR`). Vậy cột tương thích nên ghi lại cơ chế có sẵn, và chỉ một dòng mang tên mới. Đọc "mỗi biến phải có tên mới" thành 100 tên mới là 100 chỗ đọc env trong code mà không work item nào sở hữu, và trái N16. |
| W13: không có việc gì với URL `github.com/can1357/oh-my-pi` (24 lượt trong 13 file `.md`, 54 file `.ts`) | KHOẢNG TRỐNG TRONG PLAN | Bề mặt này không thuộc hàng nào của bảng `do_not_rename` N1–N17 và không work item nào sở hữu. Vì GitHub giữ redirect khi repo được đổi tên nên URL cũ **không** gãy — đó là lý do dễ bị bỏ sót vĩnh viễn, và `AGENTS.md` dùng đúng mẫu URL đó làm ví dụ attribution trong mục Changelog (dòng 337-338). Cần câu hỏi mở, không cần quyết ngay trong W13. Bảng N1–N17 ở plan dòng 13266-13282 không có hàng nào nhắc URL. |
| W13 dòng 13980: "Phụ thuộc: tất cả mục trước; M2 cho hai tài liệu hợp đồng." | QUÁ MƠ HỒ ĐỂ LÀM ĐIỀU KIỆN CHẶN | "Tất cả mục trước" không kiểm được bằng máy. Thay bằng ba điều kiện cụ thể có lệnh ở `Các bước` mục 1. Thiếu điều kiện (a) thì cột tương thích không có nội dung và phần việc nặng nhất của W13 biến mất trong im lặng. |

## Cần người xác nhận

Mâu thuẫn nội tại của chính đặc tả, chưa tự sửa:

1. **Số dòng seed của allow-list: 93 hay 93 − 2? — đã chốt: trừ 2, và 2 dòng đó phải ở lại.** `files_touched` cho `scripts/rename/docs-legacy-allowlist.txt` nói "Ban đầu seed bằng **93 dòng**", trong khi `Các bước` mục 2 trước đây nói "trừ 10 file runtime-asset". Con số 10 sai: 8 file `.omp/` còn lại có **0 lượt khớp** biểu thức P nên vốn không nằm trong tập 93 — chỉ `internal-urls/omp.md` và `.omp/skills/semantic-compression/SKILL.md` mới có mặt, nên 93 − 10 = 83 là bất khả thi. Vì lệnh `git grep -lE "$P" -- '*.md' ...` của quy tắc A **không** lọc 2 file đó, bỏ chúng khỏi allow-list sẽ làm quy tắc A đỏ vĩnh viễn (đã kiểm bằng `comm -23` trên một allow-list 91 dòng: nó in ra đúng 2 dòng này). Bước 2 và `Cần người quyết` mục 3 đã sửa theo hướng này — giữ 2 dòng kèm lý do, hoặc lọc chúng khỏi quy tắc A theo đường dẫn, **chọn một và ghi vào allow-list**.
2. **Đơn vị đo khác nhau giữa các bảng — đã làm rõ, không phải mâu thuẫn.** `README.md` có **42 lượt** khớp (`git grep -ohE "$P" -- README.md | wc -l`) nhưng chỉ **36 dòng** khớp (`git grep -cE "$P" -- README.md`) vì một dòng có thể khớp nhiều lần. Danh sách "10 file nhiều nhất" ở bước 4 dựng từ `git grep -c` nên là **số dòng**; tổng **549** ở `Xác minh` mục A là **số lượt**. Dùng số dòng để sắp thứ tự làm (file dài hơn = nhiều việc hơn), dùng số lượt để báo cáo bề mặt. Khi tự đo lại, ghi rõ đơn vị sau con số.
3. **Dòng 523 (`PI_CONFIG_DIR`) trong `code_shape` chưa được đánh dấu kiểm chứng.** Các mục `docs/environment-variables.md` và `docs/environment-variables.md:29` đều `verified: true`, nhưng con số dòng 523 và khoảng dòng 18-21 (nơi dotenv thật sự được đọc) chỉ xuất hiện trong `code_shape` và `Các bước`, không có nhãn kiểm chứng. Cần chạy `sed -n '523p' docs/environment-variables.md` và đọc dòng 18-21 trước khi sửa. Đã kiểm chứng: con số literal `.omp` ở `Các bước` mục 5 và 40/58 file `docs/` ở `File cần chạm tới` (78 file / 404 lượt trên bề mặt W13; 40 file chứa `@oh-my-pi/`, 58 file chứa token `omp`).


---


## W13'. Hai gói Python (sóng 4)

**Sóng:** 4 · **Effort:** S, không phải M như plan ước tính · **Rủi ro chính:** sửa đúng hai dòng nguồn (`client.py:455`, `config.py:95`) rồi kết luận xong — `docker-compose.yml:81` đè lên pydantic default, nên container robomp vẫn spawn binary cũ trong khi mọi kiểm tra dựa trên grep đều báo công việc đã xong.

Một dòng tóm tắt: trong `python/omp-rpc` và `python/robomp`, **đúng hai** dòng nguồn sinh ra tên binary (`client.py:455` và `config.py:95`), cộng thêm **hai** override trong cấu hình được ship mà grep của plan không thấy (`docker-compose.yml:81` và `.env.example:185`) — hai cái này lặng lẽ vô hiệu hoá cả hai đường sửa kia. Mọi `omp` còn lại trong `python/**` là một Unix group được materialize trên host thật, một bố cục đĩa của container-sandbox, hoặc config dir của chính CLI (thuộc W4/W6) — tất cả đều ở lại.

Hai gói Python phải ship cùng release với W9: giữa lúc chỉ mới đổi tên ở TS và lúc đổi tên ở Python, có một khoảng thời gian mà binary mới không có lệnh `omp` trong khi client Python vẫn còn gọi lệnh đó.

Hiệu ứng người dùng thấy: typed RPC client và bot triage robomp spawn binary đã đổi tên thay vì chết với `FileNotFoundError` trên `omp`. Người dùng đã đặt `ROBOMP_OMP_COMMAND` vẫn chạy nguyên trạng — nó vẫn là override. Người dùng nâng CLI nhưng chưa nâng hai gói Python này sẽ thấy **mọi** lời gọi RPC chết với `omp: command not found`; chính việc ship cả hai đổi tên trong một release là thứ loại bỏ khoảng thời gian đó.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `python/omp-rpc/src/omp_rpc/client.py` | sửa | `:455`, **dòng duy nhất** trong file này sinh tên binary: `executable: str = "omp",` trong `RpcClient.__init__` → `executable: str = "<new>",`. `git grep -c '"omp"' -- python/omp-rpc/src/omp_rpc/client.py` == 1, nên sửa xong file về 0. | Có |
| `python/robomp/src/config.py` | sửa | `:95`, site nguồn thứ hai và site cuối: `omp_command: str = Field("omp", alias="ROBOMP_OMP_COMMAND")` → `Field("<new>", alias="ROBOMP_OMP_COMMAND")`. Tên field `omp_command` và alias `ROBOMP_OMP_COMMAND` **giữ nguyên** (N16 giữ vĩnh viễn họ biến `OMP_*`, và `worker.py:647` đọc `settings.omp_command` theo tên field). Chỉ chuỗi default đổi. `git grep -n 'omp_command' -- python/robomp/src` trả về đúng 2 hit. | Có |
| `python/omp-rpc/tests/test_client.py` | sửa | `:1044` và `:1061` **không được đổi tên máy móc**. Xoá cả hai: bỏ đối số `executable="omp"` để test chạy đúng default, và assert `client.command[0] == "<new>"` với tên mới dạng chữ. | Có |
| `python/robomp/docker-compose.yml` | sửa | `:81`, `ROBOMP_OMP_COMMAND: omp`, nằm dưới header `# --- container-fixed paths ---` (`:80`) → `ROBOMP_OMP_COMMAND: <new>`. **Đây là phát hiện mà plan bỏ sót.** Giá trị set trong env của compose service đè lên pydantic default, nên sửa mỗi `config.py:95` thay đổi **không gì cả** trong container được ship. | Có |
| `python/robomp/.env.example` | sửa | `:185`, `ROBOMP_OMP_COMMAND=omp` → `ROBOMP_OMP_COMMAND=<new>`, và hai dòng comment phía trên (`:183-184`, mô tả "the omp binary" và shim) cập nhật theo tên mới. | Có |
| `python/robomp/AGENTS.md` | sửa | `:111` — bỏ mệnh đề "`ROBOMP_OMP_COMMAND=omp` should not need changing" và viết lại thành chỉ tới `<new>` khi dựng image mới; đồng thời cập nhật shim `/usr/local/bin/omp` nếu W10 đã đổi tên nó. `:101` — config dir `~/.omp/agent/models.container.yml` giữ trên `.omp` (mục thứ tư của keep-list). **Đây là file agent của gói robomp tự đọc**, nên một lời dẫn sai ở đây là lời dẫn sai trong cây, và cổng 2 không bắt được. | Có |
| `python/robomp/README.md` | sửa | `:48` (`.omp-session-<tag>`), `:58` và `:233` (`~/.omp/agent/models.container.yml`) — tài liệu của config dir CLI, phải khớp với mục thứ tư của keep-list. | Có |
| `python/omp-rpc/pyproject.toml` | sửa | Đổi **ba** dòng: `:8` description, `:14` keywords (phần tử `"omp"`), `:26` `Homepage = "https://omp.sh/"`. **KHÔNG** đổi `:6` `name = "omp-rpc"` — bảng open-questions cuối M5 quyết định dòng đó, và mặc định được nêu là GIỮ `omp-rpc` vĩnh viễn. | Có |
| `python/robomp/pyproject.toml` | sửa | Đổi **một** dòng: `:8` description. **KHÔNG** đổi `:6` `name = "robomp"` và **KHÔNG** đổi `:22` `"omp-rpc>=0.1.0"` (PEP 508 trên tên distribution `omp-rpc`). | Có |
| `python/robomp/src/worker.py` | sửa — 0 dòng đổi | Hai occurrence `"omp"` giữ nguyên: `:211` `gid = grp.getgrnam("omp").gr_gid` và `:664` `extra_groups=["omp"]`. Cũng giữ `:145`, `:168`, `:209` tham chiếu `_AGENT_HOME / ".omp"` và `_AGENT_HOME / ".omp/agent"`. | Có |
| `python/robomp/src/sandbox.py` | sửa — 0 dòng đổi | `:549` và `:588` `(base / "omp").mkdir(parents=True, exist_ok=True)` giữ. Cũng giữ `:500`, `:574` (`.omp-tmp`), `:541`, `:584` (`.omp-xdg`), `:759` (`.omp-xdg/cache`), `:899`/`:1047` (`.omp-session`, `.omp-session-{tag}`). | Có |
| `python/robomp/src/tasks.py` | sửa — 0 dòng đổi | `:364` `f".omp-session-{tag}"` giữ — cùng họ bố cục sandbox với `sandbox.py`. Không có trong inventory của plan, nhưng là cùng một danh tính trên đĩa. | Có |
| `python/robomp/entrypoint.sh` | sửa — 0 dòng đổi | Cả hai họ danh tính đều giữ: Unix group N13 (`:25` `groupadd -f -g 2000 omp`, `:28` `user="omp-$i"`, `:29`, `:32`, `:33`, `:53` `chown -R root:omp`) **và** config dir CLI của W4/W6 (`:60`, `:61`, `:65`, `:66`, `:77`, `:78`, `:79`, `:80`, `:81`, tất cả dưới `/srv/agent-home/.omp`). | Có |
| `python/omp-rpc/tests/test_user_group.py` | sửa — 0 dòng đổi | Cả năm occurrence (`:26`, `:34`, `:36`, `:40`, `:45`) giữ. Đây là lưới tự động **duy nhất** đứng giữa quyết định Unix group N13 và một lần `sed` sau này. | Có |
| `python/robomp/tests/test_sandbox.py` | sửa — 0 dòng đổi | Tám occurrence giữ: `:760`, `:829`, `:1072`, `:1074`, `:1076`, `:1106`, `:1108`, `:1110`. **Số dòng đã sửa** — plan ghi 759, 828, 1071, 1073, 1075, 1105, 1107, 1109; cả tám lệch đúng +1 trên HEAD `1454dc0`. | Có |
| `python/robomp/tests/test_worker.py` | sửa — 0 dòng đổi | Cả ba occurrence `"omp"` giữ: `:345`, `:387` (bố cục sandbox) và `:465` `assert client_kwargs["extra_groups"] == ["omp"]` (group N13). Các đường dẫn `.omp` không quote ở `:278`, `:290`, `:295`, `:296`, `:341`, `:346` cũng giữ. | Có |
| `python/robomp/tests/test_host_tools.py` | sửa — 0 dòng đổi | Bảy hit `.omp*` giữ: `:28` (`.omp-session`), `:143`, `:144` (`.omp-xdg/cache`), `:145`, `:153` (`.omp-tmp`), `:189` (`.omp-xdg/cache/bun-install`), `:4674` (`.omp-session-v1.2.3`). **Không có hit chuỗi `"omp"` có quote** (`git grep -c '"omp"'` không in gì, exit 1), nên file này vô hình với cả ba cổng. | Có |
| `python/robomp/tests/test_permissions_e2e.py` | sửa — 0 dòng đổi | Một hit `.omp*` giữ: `:263` (`.omp-xdg/cache/bun-install/root-owned-stale`). Cũng vô hình với cả ba cổng, vì không có chuỗi `"omp"` có quote. | Có |

### Các bước

1. **Lấy tên binary từ W9, không lấy từ plan này.** W9 (`packages/coding-agent/package.json:28` trong khối `bin`, và `scripts/ci-release-publish.ts:186` — `publishBin: { omp: "dist/cli.js" }`) mới là thứ quyết định lệnh được cài; token dùng ở đây phải đúng chuỗi đó. Đổi `executable: str = "omp",` thành `executable: str = "<new>",` tại `python/omp-rpc/src/omp_rpc/client.py:455`. Đây là một trong **hai** dòng nguồn duy nhất trong toàn bộ `python/**` sinh tên binary, nên chạy `git grep -c '"omp"' -- python/omp-rpc/src/omp_rpc/client.py` và xác nhận nó **không in gì** (file đã sạch), thay vì mặc định là bản sửa đã tới nơi.
2. **`python/robomp/src/config.py:95`** — đổi **duy nhất** chuỗi default trong `omp_command: str = Field("omp", alias="ROBOMP_OMP_COMMAND")` → `Field("<new>", alias="ROBOMP_OMP_COMMAND")`. Tên field pydantic và alias `ROBOMP_OMP_COMMAND` được N16 bảo vệ, giữ nguyên. Xác minh consumer vẫn resolve: `git grep -n 'omp_command' -- python/robomp/src` trả về đúng 2 hit — phần định nghĩa và `worker.py:647`.
3. **`python/robomp/docker-compose.yml:81`** — bước mà plan bỏ sót, và bước quyết định item này có làm được việc gì hay không. Dưới header `# --- container-fixed paths ---`, đổi `ROBOMP_OMP_COMMAND: omp` thành `ROBOMP_OMP_COMMAND: <new>`. Env trong compose service **ĐÈ LÊN** pydantic default ở bước 2, nên dừng ở bước 2 thì container được ship vẫn spawn binary cũ — trong khi mọi tiêu chí nghiệm thu dựa trên grep của plan báo đã xong. Làm bước này **trước** khi đụng vào bất kỳ metadata nào, rồi xác nhận bằng cổng ba-bên-agreement ở dưới.
4. **`python/robomp/.env.example:185`** — đổi `ROBOMP_OMP_COMMAND=omp` thành `ROBOMP_OMP_COMMAND=<new>`, và cập nhật hai dòng comment phía trên (`:183-184`) mô tả "the omp binary" và shim được ship. Đây là site thứ tư phải khớp; nó là một default có tài liệu, nên cũng là thứ người dùng nhìn thấy. Sau bước này, chạy cổng ba-bên-agreement — nó giờ phủ bốn nguồn và phải in ra cả bốn là giống hệt nhau.
5. **`python/omp-rpc/tests/test_client.py:1044`** — **viết lại, không đổi tên**. Xoá đối số tường minh `executable="omp",` ở `:1044` và kỳ vọng `"omp",` tương ứng ở `:1061` để test chạy đúng default thật, rồi assert `client.command[0] == "<new>"` với tên mới dạng chữ. Hoán đổi máy móc cả hai chuỗi để lại một test xanh dưới **tên nào** và không bảo vệ điều gì — AGENTS.md cấm đúng loại echo đó. Đây là assertion biến đổi mà hợp đồng test của item yêu cầu, và là bằng chứng tự động **duy nhất** trong toàn repo rằng **default** đã dời.
6. **`python/omp-rpc/pyproject.toml:8`** — metadata, và chỉ nửa mô tả của nó. Đổi `:8` (description), `:14` (phần tử keyword `"omp"`) và `:26` (`Homepage`). Để yên `:6` `name = "omp-rpc"` — đó là tên distribution đã phát hành, do bảng open-questions quyết định, mặc định là giữ vĩnh viễn. Riêng `:26`, áp cổng N9: nó là **cùng** giá trị `https://omp.sh/` với `APP_URL` tại `dirs.ts:24` và không được dời cho tới khi một tên miền mới thực sự resolve; nếu N9 chưa quyết, để `:26` nguyên trạng và **nói rõ điều đó trong commit message** thay vì đoán mà đổi tên.
7. **`python/robomp/pyproject.toml:22`** — đổi **một** dòng: `:8` (description 'driving omp --mode rpc'). **KHÔNG** đụng `:6` `name = "robomp"` và **KHÔNG** đụng `:22` `"omp-rpc>=0.1.0"`. Bước 6 là chỗ người đọc dễ "hoàn thành nốt việc" trên `:22` nhất; đó là một yêu cầu PEP 508 trên tên distribution của `omp-rpc`, và vì `:6` giữ tên đó, đổi yêu cầu này làm robomp không resolve được lúc cài. Cùng kiểu ràng buộc xuất hiện ở `Dockerfile:164`, nơi cài `/tmp/wheels/omp_rpc-*.whl` theo tên file wheel đã build.
8. **`python/robomp/entrypoint.sh:25`** — mở rộng keep-list `do_not_rename` (do W7 sở hữu, file `scripts/rename/keep-list.txt`) với bốn danh tính Python mà item này đã kiểm chứng, vì các mục N13/N15 của plan mô tả chưa đủ. N13 (Unix group/user) đúng, nhưng nên phủ thêm `entrypoint.sh:28,29,32,33,53` và `worker.py:211,664`. N15 như đang viết mới chỉ nêu `.omp-xdg` và `<xdg_root>/omp`; phải nêu thêm `.omp-tmp` và `.omp-session*`, nếu không lượt sau sẽ phát hiện lại từng cái một. Cần thêm một mục thứ tư mà plan hoàn toàn không có hàng nào cho: config dir của CLI dưới agent home — `worker.py:145,168,209`, `entrypoint.sh:60,61,65,66,77-81`, `test_worker.py:278,290,295,296`, **và — trong chính các file item này sửa** — `docker-compose.yml:91,105,107` (dòng `:107` là một bind mount `${HOME}/.omp/agent/models.container.yml:/srv/agent-home-stage/.omp/agent/models.yml:ro`; đổi `.omp` ở đó làm hỏng mount và container mất `models.yml`), `.env.example:102`, cùng tài liệu `robomp/AGENTS.md:101` và `robomp/README.md:48,58,233` — giữ vì reader dual-root của W4 vẫn còn đọc root cũ trong suốt giai đoạn chuyển tiếp. Cổng 2 không bắt được bất kỳ site nào trong số đó, vì pattern của nó là `ROBOMP_OMP_COMMAND[=:]`.
9. **`python/robomp/src/sandbox.py:549`** — chạy assertion keep-set đầy đủ, không chỉ tổng. Kiểm tra tổng số tồn đọng là cần nhưng không đủ: ai đó có thể thỏa "còn 20 hit" bằng cách đổi tên một keep site. Cổng 1 dưới đây ghim số đếm **theo từng file** (5,2,2,8,3) để một Unix group bị đổi tên sai, hay một đường sandbox bị đổi tên sai, sẽ làm cổng đỏ thay vì đánh đổi lỗi này cho lỗi khác. Xác nhận cả 8 keep site trong `sandbox.py`, `worker.py`, `test_sandbox.py`, `test_user_group.py` và `test_worker.py` — cùng `test_host_tools.py` và `test_permissions_e2e.py`, hai file test giữ bố cục sandbox mà không có một chuỗi `"omp"` nào — giống hệt HEAD từng byte.
10. **`python/omp-rpc/tests/test_user_group.py:26`** — không đụng file này, và không để một formatter hay một thay thế hàng loạt chạm tới nó. `test_user_group.py:26,34,36,40,45` và `test_worker.py:465` là những lưới tự động duy nhất cho quyết định Unix group N13; bố cục sandbox có **ba** file test giữ lưới, không phải một: `test_sandbox.py` (8 hit chuỗi `"omp"`), `test_host_tools.py` (7 hit `.omp*` ở `:28,143,144,145,153,189,4674`) và `test_permissions_e2e.py` (1 hit ở `:263`). Xác minh bằng `git diff --stat` rằng **năm** file test này vắng mặt khỏi thay đổi trước khi commit.

### Hình dạng code

Bốn **nhóm** site đổi — tổng cộng 9 chuỗi literal và 12 dòng, tất cả đều là **giá trị**, không phải cấu trúc:

```typescript
// (1) python/omp-rpc/src/omp_rpc/client.py:455
//     một tham số default Python trong chữ ký __init__ keyword-only
executable: str = "omp"        →   executable: str = "ultraworkers"
// Không đổi kiểu, không đổi thứ tự chữ ký, không thêm import.

// (2) python/robomp/src/config.py:95
//     một default pydantic v2 Field
omp_command: str = Field("omp", alias="ROBOMP_OMP_COMMAND")
  →   Field("ultraworkers", alias="ROBOMP_OMP_COMMAND")
// Tên field và alias bị đóng băng bởi N16; chỉ positional arg đầu dời.

// (3) python/robomp/docker-compose.yml:81 và .env.example:185
//     giá trị YAML và dotenv của CÙNG biến môi trường, đè lên (2) lúc chạy
ROBOMP_OMP_COMMAND: omp        →   ROBOMP_OMP_COMMAND: <new>
ROBOMP_OMP_COMMAND=omp         →   ROBOMP_OMP_COMMAND=<new>

// (4) Bốn chuỗi mô tả trong hai file pyproject.toml
```

Mọi thứ khác trong `python/**` được giữ nguyên — và đó chính là ý nghĩa của item: `git diff` cho item này nên là khoảng 12 dòng thêm và 12 dòng xoá trên 7 file code/manifest, cộng hai file tài liệu mà item này sửa (`AGENTS.md`, `README.md`) — tức **9 file, không phải 7** — và **mọi file khác trong `python/` không nên xuất hiện**. Không có module mới, không có hằng số mới, không có import mới, và không có cơ chế chia sẻ xuyên ngôn ngữ — phía TS và phía Python giữ cùng một chuỗi hai lần và chỉ được giữ bằng cổng agreement.

Trong khối trên, `<new>` là ký hiệu của spec cho tên do W9 quyết định; `code_shape` viết nó thành `ultraworkers`.

### Hợp đồng test

Ba hợp đồng, mỗi hợp đồng chặn đúng một lỗi mà item này tồn tại để ngăn.

**(1) DEFAULT ĐÃ DỜI.** Dựng `RpcClient()` không có đối số `executable` và assert lệnh mà nó sẽ chạy bắt đầu bằng tên binary mới. Đây là assertion biến đổi trên một giá trị mà code tự tính, không phải kiểm tra tồn tại và không phải echo của giá trị mà test tự đưa vào. Nó là **bằng chứng tự động duy nhất** trong repo rằng default đã đổi, vì trước bước 5 test hiện có tự truyền giá trị của nó vào và nhận lại đúng giá trị đó. Người tiêu dùng hỏng nếu hồi quy: RPC client spawn một lệnh mà không release nào cài, và mọi lời gọi chết với `FileNotFoundError` ngay ở request đầu tiên.

**(2) OVERRIDE VẪN THẮNG.** Đặt `ROBOMP_OMP_COMMAND` thành một giá trị tường minh, nạp `Settings`, và assert `settings.omp_command` trả về override chứ không phải default. Đây là lối thoát có tài liệu, và là thứ duy nhất đứng giữa một người dùng trên image cũ và một sự cố toàn diện. Nó phải là một case **thứ hai, tách biệt** trong cùng test — một case đầu tiên không phân biệt được "default đã đổi" với "field không còn đọc môi trường nữa", và hai lỗi đó có cùng triệu chứng ra ngoài.

**(3) CÁC KEEP SET KHÔNG BỊ ĐỤNG.** Số đếm theo từng file của cổng 1 (5,2,2,8,3) cộng với số zero trên ba file được đổi. Đây là hợp đồng phủ định: lỗi nó ngăn là một lần đổi tên trông như tiến bộ nhưng lại là `KeyError` lúc container khởi động, hoặc `Permission denied` trên `/data` cho mọi slot user. Phần kiểm thử sẵn có trong `test_user_group.py` và `test_worker.py:465` được **giữ lại, không thay thế**. Cùng với `git grep -c '\.omp' -- python/robomp/tests/test_host_tools.py python/robomp/tests/test_permissions_e2e.py` phải trả về `7` và `1` — hai con số này KHÔNG nằm trong bất kỳ pattern cổng nào, nên phải ghim riêng, vì cổng 1 chỉ thấy chuỗi `"omp"` có quote.

**Không được test, và cố ý:** không có gì trong repo này thực thi `docker-compose.yml`, nên cổng 3 là một kiểm tra agreement chuỗi tĩnh và không thể quan sát một container spawn thật. Nếu muốn có bằng chứng ở tầng container, cần một lần chạy compose smoke — nằm ngoài phạm vi ở đây. Hãy nói thẳng điều đó thay vì ám chỉ cổng này mang tính hành vi.

Danh sách file test:

- `python/omp-rpc/tests/test_client.py` (SỬA — `test_command_builder_supports_common_rpc_options`: bỏ `executable=` tường minh ở `:1044` và kỳ vọng `"omp"` ở `:1061`, assert default resolve ra tên mới; thêm case override tương đương `ROBOMP_OMP_COMMAND` từ hợp đồng 2, dựng trên chính đối số `command` của `omp_rpc`. **Đây là file duy nhất trong `python/**` có assertion phải đổi.**)
- `python/omp-rpc/tests/test_user_group.py` (KHÔNG ĐỤNG — 5 hit ở `:26,34,36,40,45`. Lưới duy nhất cho N13.)
- `python/robomp/tests/test_sandbox.py` (KHÔNG ĐỤNG — 8 hit, tại các dòng **đã sửa** 760, 829, 1072, 1074, 1076, 1106, 1108, 1110. Số của plan lệch từng cái một đơn vị.)
- `python/robomp/tests/test_worker.py` (KHÔNG ĐỤNG — 3 hit có quote ở `:345`, `:387`, `:465`; `:465` là assertion duy nhất trong toàn repo rằng subprocess robomp nhận Unix group `omp`.)
- Không có file test mới. Hai file sẵn có được thêm hoặc sửa assertion; không file nào được tạo ra.

### Xác minh

Mọi con số dưới đây do lệnh thật trên HEAD `1454dc0` sinh ra, không phải đọc từ plan. Đã đối chiếu lại toàn bộ ở `1454dc0` (một commit tài liệu sau `84cbac9`): không con số nào đổi.

```bash
# BASELINE (xanh trước mọi thay đổi)
uv venv /tmp/ompw13-venv -p 3.13
VIRTUAL_ENV=/tmp/ompw13-venv uv pip install pytest pytest-asyncio respx httpx \
  pydantic pydantic-settings fastapi uvicorn click python-dotenv \
  -e python/omp-rpc -e python/robomp
/tmp/ompw13-venv/bin/python -m pytest -q python/omp-rpc/tests   # 81 passed, 17 subtests (9.7s)
/tmp/ompw13-venv/bin/python -m pytest -q python/robomp/tests    # 665 passed, 4 skipped (170s)

# INVENTORY (đã kiểm chứng)
git grep -o '"omp"' -- 'python/**/*.py' | wc -l          # → 24, trên 8 file
git grep -o '"omp"' -- 'python/**/*.py' | cut -d: -f1 | sort | uniq -c
# client.py 1, test_client.py 2, test_user_group.py 5, config.py 1,
# sandbox.py 2, worker.py 2, test_sandbox.py 8, test_worker.py 3
# Chia set 4 / 8 / 12 = 24, xác nhận.

# PHÁT HIỆN: 5 hit, không phải 1
git grep -n 'ROBOMP_OMP_COMMAND' -- python/
# config.py:95 (định nghĩa), docker-compose.yml:81 (override env, đè lên default),
# .env.example:185 (default có tài liệu), AGENTS.md:111 (hướng dẫn
# "should not need changing" — phải sửa thành "đổi ROBOMP_OMP_COMMAND sang <new>
# khi dựng image mới"), test_worker_smoke.py:4 (tham chiếu tài liệu).
# KHÔNG phải hit: worker.py:647 — dòng đó chỉ đọc settings.omp_command theo tên field.

# QUY MÔ KEEP SET (đã kiểm chứng, lớn hơn con số của plan)
git grep -o '\.omp' -- python/ | wc -l                   # → 108, trên 12 file
git grep -ohE '"\.omp[a-z0-9.-]*"' -- python/ | sort | uniq -c
# 30 .omp-xdg, 14 .omp-tmp, 10 .omp-session, 6 .omp,
# 2 .omp-session-v1.2.3, 1 .omp-session-v1.2.4

# SỐ DÒNG ĐÃ SỬA (plan lệch +1 ở cả tám)
grep -n '"omp"' python/robomp/tests/test_sandbox.py
# → 760, 829, 1072, 1074, 1076, 1106, 1108, 1110

# BẪY GREP (đã xác nhận)
grep -rn '"omp"' -- 'python/**/*.py'                     # exit 2: python/**/*.py: No such file or directory
git grep -n '"omp"' -- 'python/**/*.py'                  # git grep mở rộng ** đúng, trả về 24
```

Hai suite Python **phải** chạy thành hai lần gọi pytest riêng biệt. Chạy chung sẽ chết ngay lúc collection với `ModuleNotFoundError: No module named 'tests.test_client'` (4 lỗi collection: `test_client.py`, `test_host_uris.py`, `test_protocol.py`, `test_user_group.py` — module đầu tiên pytest collect được là module đầu tiên trong báo cáo, nên tên nó phụ thuộc thứ tự truyền vào, còn nguyên nhân thì không). Nguyên nhân: cả hai thư mục đều tên `tests` **và đều có `__init__.py`**, còn thư mục cha (`omp-rpc/`, `robomp/`) thì không có, nên pytest ánh xạ cả hai về cùng một tên top-level `tests` và chúng đụng nhau — đó là lý do `package.json:135` xâu hai lệnh riêng.

Môi trường trên máy này: `bun run test:py` **THẤT BẠI** — `/opt/homebrew/opt/python@3.14/.../python3.14: No module named pytest`, exit 1. `bun run lint:py` **THẤT BẠI** — `ruff: command not found`, exit 127. `bun run check:ts` exit 0 trong ~29s nhưng **mù cấu trúc** với item này: nó lọc `./packages/*` và oxlint chỉ phủ JS/TS, nên không thay đổi nào dưới `python/**` có thể làm nó đỏ. `bun test` bị chặn vì lý do native-addon không liên quan (`Failed to load pi_natives native addon for darwin-arm64`).

### Cổng hoàn thành

Ba cổng, tất cả chạy từ repo root, tất cả đã kiểm chứng là cho ra kết quả ghi dưới đây trên HEAD `1454dc0` **trước** mọi thay đổi. Cổng 1 và 2 là tripwire (đỏ hôm nay, xanh sau khi làm xong); cổng 3 là bất biến (xanh hôm nay, xanh sau, **ĐỎ** khi đổi tên nửa vời) — và cổng 3 là cổng bắt đúng lỗi mà item này thực sự là về.

```bash
# --- CỔNG 1 — THE SPLIT (tripwire: ĐỎ hôm nay) ---
CHANGED=$(git grep -c '"omp"' -- python/omp-rpc/src/omp_rpc/client.py python/robomp/src/config.py python/omp-rpc/tests/test_client.py 2>/dev/null | wc -l | tr -d ' ')
KEPT=$(git grep -c '"omp"' -- python/omp-rpc/tests/test_user_group.py python/robomp/src/worker.py python/robomp/src/sandbox.py python/robomp/tests/test_sandbox.py python/robomp/tests/test_worker.py 2>/dev/null | tr -d ' ' | cut -d: -f2 | paste -sd, -)
echo "set_i_files_still_matching=$CHANGED keep_counts=$KEPT"
[ "$CHANGED" = "0" ] && [ "$KEPT" = "5,2,2,8,3" ]

# Kết quả hôm nay: set_i_files_still_matching=3 keep_counts=5,2,2,8,3 → ĐỎ, đúng như thiết kế.
# Tổng tồn đọng là 20, không phải 24, và số keep được ghim THEO TỪNG FILE
# để đổi tên một Unix group hay một đường sandbox không thể bị che
# bởi việc xoá một keep site khác. `git grep -c` không in gì cho file
# đếm 0 — đó là lý do nhánh file-đã-đổi đếm SỐ DÒNG ĐẦU RA (3 hôm nay).

# --- CỔNG 2 — KHÔNG FILE SHIPPED NÀO GHIM TÊN CŨ (tripwire: ĐỎ hôm nay) ---
OV=$(git grep -ohE 'ROBOMP_OMP_COMMAND[=:][[:space:]]*[A-Za-z][A-Za-z0-9_-]*' -- python/robomp/docker-compose.yml python/robomp/.env.example | awk -F'[=:] *' '{print $2}' | paste -sd, -)
echo "shipped_overrides=[$OV]"; [ "$OV" = "ultraworkers,ultraworkers" ]

# Kết quả hôm nay: shipped_overrides=[omp,omp] → ĐỎ, đúng như thiết kế.
# Đây là cổng KHÔNG tồn tại trong plan. Nó nhắm hai file mà grep '"omp"'
# không thấy, vì ở đó giá trị không quote và đứng ngay sau tên biến.

# --- CỔNG 3 — AGREEMENT TÊN BỐN-BÊN (bất biến: XANH hôm nay, ĐỎ khi đổi nửa vời) ---
C=$(grep -oE 'executable: str = "[^"]+"' python/omp-rpc/src/omp_rpc/client.py | grep -oE '"[^"]+"' | tr -d '"')
R=$(grep -oE 'omp_command: str = Field\("[^"]+"' python/robomp/src/config.py | grep -oE '"[^"]+"' | tr -d '"')
D=$(grep -oE 'ROBOMP_OMP_COMMAND: *[^ ]+' python/robomp/docker-compose.yml | awk '{print $2}')
E=$(grep -oE 'ROBOMP_OMP_COMMAND=[A-Za-z][A-Za-z0-9_-]*' python/robomp/.env.example | cut -d= -f2)
echo "client=$C config=$R compose=$D env=$E"
{ [ -n "$C" ] && [ "$C" = "$R" ] && [ "$C" = "$D" ] && [ "$C" = "$E" ]; }

# Kết quả hôm nay: client=omp config=omp compose=omp env=omp → XANH (cả bốn khớp hôm nay).

# --- CỔNG CÓ ĐIỀU KIỆN MÔI TRƯỜNG — cổng mang tính hành vi, CÓ kiểm tra prefix chạy được ---
# Chỉ chạy tiếp nếu prefix in READY. Nếu không, cổng phải báo NOT-RUNNABLE
# và exit khác 0 — TUYỆT ĐỐI không lặng lẽ báo xanh.
if python3 -m pytest --version >/dev/null 2>&1; then echo READY; else
  echo "NOT-RUNNABLE: pytest missing. Build it with:"
  echo "  uv venv /tmp/ompw13-venv -p 3.13"
  echo "  VIRTUAL_ENV=/tmp/ompw13-venv uv pip install pytest pytest-asyncio respx httpx pydantic pydantic-settings fastapi uvicorn click python-dotenv -e python/omp-rpc -e python/robomp"
  exit 2; fi
/tmp/ompw13-venv/bin/python -m pytest -q python/omp-rpc/tests   # 81 passed, 17 subtests
/tmp/ompw13-venv/bin/python -m pytest -q python/robomp/tests    # 665 passed, 4 skipped
# Hai lần gọi phải giữ RIÊNG BIỆT. Gộp lại sẽ chết lúc collection với
# ModuleNotFoundError: No module named 'tests.test_client' (4 lỗi collection)
```

Cổng có thực sự đỏ được không: **có**, cả ba — nhưng mỗi cổng đỏ vì một lý do khác nhau, và hai cổng phải được đọc với mức tin cậy khác nhau.

- **Cổng 1** đỏ ngay khi một site set-(i) bị bỏ sót — và vì số keep ghim theo từng file thay vì một tổng đơn, nó cũng đỏ nếu kỹ sư chỉ "thỏa 20 hit còn lại" bằng cách đổi tên một Unix group hay một đường sandbox. Chính failure mode thứ hai là thứ mà kiểm tra tổng của plan sẽ bỏ lọt hoàn toàn: hạ `test_user_group.py` từ 5 xuống 0 và `test_sandbox.py` từ 8 xuống 3 đều rơi đúng vào 20. Đã kiểm chứng đỏ hôm nay (`set_i_files_still_matching=3`).
- **Cổng 2** đỏ nếu `docker-compose.yml` hoặc `.env.example` vẫn còn tên lệnh cũ. Đây là cổng cho một sai lầm mà plan không chứa, và sai lầm nó bắt là thầm lặng: container khởi động, robomp boot, và lần spawn RPC đầu tiên là bằng chứng duy nhất. Đã kiểm chứng đỏ hôm nay (`shipped_overrides=[omp,omp]`).
- **Cổng 3** đỏ khi đổi tên **nửa vời** — bất kỳ nguồn nào trong bốn nguồn đổi mà ba nguồn kia không. Đây là cổng duy nhất ở đây xanh trước và xanh sau, nên nó hoạt động như lưới hồi quy chứ không phải chỉ báo tiến độ. Đã kiểm chứng xanh hôm nay (`client=omp config=omp compose=omp env=omp`); nó phải xanh lại **chỉ khi** cả bốn đọc tên mới.

Nói thẳng để không ai hơi đồ quá chỗ: lần chạy pytest có điều kiện môi trường **không thể đỏ** vì một lần đổi tên, nếu bỏ qua prefix — đó là lý do prefix exit 2 với NOT-RUNNABLE thay vì rơi xuống tiếp. `bun run check:ts` nằm trong dòng lệnh của plan và **mù cấu trúc** ở đây: nó lọc `./packages/*` và oxlint chỉ là JS/TS, nên không dòng sửa nào trong item này có thể làm nó đỏ. Nó không được báo là bằng chứng cho công việc này. Không gì trong repo này thực thi `docker-compose.yml`, nên cổng 3 là so sánh chuỗi tĩnh, **không phải** bằng chứng mang tính hành vi rằng container spawn đúng lệnh — một lần chạy container smoke thật mới là thứ như vậy, và nó nằm ngoài phạm vi.

### Phụ thuộc

- **depends_on:** W9 — tên binary W9 cài chính là giá trị mà bốn site này phải mang, và nó nằm ở `packages/coding-agent/package.json:28` cùng `scripts/ci-release-publish.ts:186` (`publishBin: { omp: "dist/cli.js" }`). W13p không thể đặt tên lệnh mới mà không có W9, và ship W9 mà không có W13p thì để lại client Python gọi một lệnh không còn tồn tại.
- **blocks:** W10 — công việc Docker của nó dựng image mà shim `/usr/local/bin/omp` tại `Dockerfile:180` và ENTRYPOINT tại `:216` chính là thứ `ROBOMP_OMP_COMMAND` đang trỏ tới. Nếu W10 đổi tên shim mà item này chưa cập nhật `docker-compose.yml:81`, image robomp được build với một con trỏ tới lệnh mà nó không còn chứa.

### Cách sai dễ nhất

1. **Sai có hậu quả lớn nhất, và cũng là cái plan gọi đúng tên:** chỉ sửa `client.py:455` và `config.py:95` rồi coi như xong. Grep `"omp"` rơi xuống đúng 20, mọi tiêu chí nghiệm thu trong §3.3 đều qua, và container robomp được ship vẫn spawn `omp` — vì `docker-compose.yml:81` đè lên pydantic default và grep của plan không thấy một giá trị không quote nằm sau tên biến. Cùng hình dạng cấu trúc với §3.1, nên ở đây cũng dễ sót: một consumer đọc tên từ một hằng số, một producer hardcode literal ở nơi khác, và không có gì trong repo thực thi cái nào.
2. **Sắc hơn cả một bản sửa thiếu:** đổi `python/robomp/pyproject.toml:22` từ `"omp-rpc>=0.1.0"`. Plan liệt kê nó là một rename site trong khi chính bảng open-questions của plan quyết định GIỮ tên distribution `omp-rpc`. Làm cả hai khiến dependency của robomp không resolve được — `uv pip install` chết lúc resolve, ít nhất là ồn ào, và kéo sập toàn bộ bot thay vì làm nó suy giảm.
3. **Lỗi ngược lại:** một lần quét `.omp` rộng trên `python/**`. Họ `.omp*` là 108 occurrence trên 12 file, và trong đó `worker.py:145,168,209` cùng `entrypoint.sh:60,61,65,66,77-81` quản lý chính config dir của CLI dưới `/srv/agent-home`. Dời chúng khỏi `.omp` làm staging của robomp trỏ vào một root mà CLI không đọc, hoặc ngừng tạo sẵn thư mục run mà daemon cần. Giới hạn trong container, và vô hình với cả test Python lẫn `check:ts`.
4. **Tin số dòng của plan.** Cả tám tham chiếu `test_sandbox.py` trong §3.3 lệch đúng một dòng; sửa tại các dòng plan chỉ định nghĩa là sửa dòng ngay **trên** mỗi mục tiêu và để lại assertion đang assert tên cũ.
5. **Yên lặng nhất:** đổi tên máy móc `test_client.py:1044,1061`. Test vẫn xanh dưới tên nào, nên item ship ra mà không có bằng chứng tự động nào rằng default đã dời — trong khi một người review đọc một suite xanh sẽ kết luận default đã được xác minh.

### Cần người quyết

- **Tên distribution `omp-rpc` có được đổi không?** Câu này chặn cả item, và plan để ngỏ. Mặc định được nêu là **GIỮ `omp-rpc` vĩnh viễn**, vì đổi tên phá mọi `pip install omp-rpc` đang tồn tại. Nếu mặc định đó đứng vững, thì `python/omp-rpc/pyproject.toml:6` ở lại **VÀ** `python/robomp/pyproject.toml:22` cũng phải ở lại như một hệ quả ràng buộc, **VÀ** `pip install /tmp/wheels/omp_rpc-*.whl` tại `Dockerfile:164` vẫn resolve được. Nếu câu trả lời là đổi, item này lớn thêm một yêu cầu về thứ tự release (phải publish tên mới trước khi bỏ tên cũ) và cần một mục changelog trong gói đó — thứ AGENTS.md cấm viết trừ khi được yêu cầu tường minh. Mặc định thận trọng được giả định xuyên suốt spec này, và nó là giả định duy nhất để lại cây thư mục cài được.
- **Tên distribution `robomp` có được đổi không?** Bảng open-questions của plan chỉ hỏi về `omp-rpc` và không nói gì về `robomp`, dù `python/robomp/pyproject.toml:6` là **cùng loại** quyết định — một tên PyPI đã phát hành, nơi đổi tên phá mọi cài đặt hiện có. Spec này giả định **GIỮ**, nhưng câu hỏi thực sự là **chưa ai hỏi** chứ không phải đã trả lời, và `robomp` còn mang tên thương hiệu cũ ('robo' + 'omp') theo cách mà `omp-rpc` không mang.
- **Tên miền mới là gì, và `python/omp-rpc/pyproject.toml:26` có đi theo không?** `Homepage = "https://omp.sh/"` là **cùng** giá trị với `APP_URL` tại `packages/utils/src/dirs.ts:24`, mà bảng rủi ro đóng băng cho tới khi một tên miền mới thực sự resolve. Nếu N9 chưa quyết vào lúc item này đáp đất, `:26` phải được để yên thay vì đoán mà đổi tên. Mặc định an toàn ở đây là để yên và ghi lại lý do.
- **`python/omp-rpc/pyproject.toml:27,28` (`Repository` và `Documentation`, cả hai là `https://github.com/can1357/oh-my-pi`) có thuộc phạm vi milestone nào không?** Chúng mang tên org cũ nhưng vô hình với `git grep -n 'omp'`, vì chuỗi `oh-my-pi` không chứa substring `omp`. W7 nhắm `@oh-my-pi/` có dấu gạch chéo cuối và sẽ không khớp chúng; W8a xử lý `"oh-my-pi"` trần trong TypeScript. Một URL trong manifest Python hiện **không thuộc sở hữu của ai**. Mặc định: để yên, và đừng để một lượt W7 vô tình chạm tới.
- **Staged agent home của robomp có cần migrate khi W6 lật `CONFIG_DIR_NAME` không?** `worker.py:145,168,209` và `entrypoint.sh:60,61,65,66,77-81` quản lý `/srv/agent-home/.omp` — config dir của chính CLI. Spec này giữ chúng trên `.omp` vì reader dual-root của W4 vẫn đọc root cũ, điều làm cách bố trí hiện tại **đúng** trong giai đoạn chuyển tiếp. Nhưng nếu `config migrate` (W5) đã chạy trên volume của một container, staged home sẽ thành cũ và robomp sẽ đổ đầy một root không ai đọc. Hiện chưa ai sở hữu bàn giao đó. Mặc định: giữ nguyên và nêu lên ở W6; cách sửa không an toàn trước khi reader dual-root của W4 được chứng minh.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| §3.3 và W13': `grep '"omp"'` trong `python/` trả về 24 occurrence trên 8 file, và 4 cái cần đổi còn 20 cái ở lại. | Con số đúng; **ngân sách sai**. | 24 trên 8 file được xác nhận chính xác, và chia 4 / 8 / 12 đứng vững. Nhưng 4 không phải số site phải đổi — có **6**, vì tồn tại hai site default-command nữa mà grep `"omp"` không thấy: `python/robomp/docker-compose.yml:81` và `python/robomp/.env.example:185` đều set `ROBOMP_OMP_COMMAND` thành tên cũ, và giá trị env của compose **ĐÈ LÊN** pydantic default tại `config.py:95`. Kỹ sư đi đúng plan tạo ra một diff thỏa mọi tiêu chí nghiệm thu đã nêu, và một container robomp vẫn spawn binary cũ. Kiểm tra "20 còn lại" qua, tổng tồn đọng đúng con số, và sản phẩm hỏng đúng chỗ duy nhất nó thực thi. Bằng chứng: `git grep -c '"omp"' -- 'python/**/*.py'` → 24 trên 8 file; `git grep -n 'ROBOMP_OMP_COMMAND' -- python/` → 5 hit (`config.py:95` định nghĩa, `docker-compose.yml:81` override env đè lên default, `.env.example:185` default có tài liệu, `AGENTS.md:111` hướng dẫn "should not need changing" — phải sửa thành "đổi `ROBOMP_OMP_COMMAND` sang `<new>` khi dựng image mới" — và `test_worker_smoke.py:4` tham chiếu tài liệu). `worker.py:647` **không** phải hit của lệnh này: nó chỉ đọc `settings.omp_command` theo tên field, nên thuộc bằng chứng của `git grep -n 'omp_command'` ở bước 2. Đáng chú ý: `AGENTS.md` chính là file agent của gói robomp tự đọc, và cổng 2 chỉ glob `docker-compose.yml` + `.env.example` nên không thấy nó. |
| §3.3 set (iii): sandbox root là 12 occurrence tại `sandbox.py:549,588`, `test_sandbox.py:759,828,1071,1073,1075,1105,1107,1109` và `test_worker.py:345,387`. | Con số 12 đúng cho cái nó đếm; **cả số dòng lẫn phạm vi của nhóm đều sai**. | Hai vấn đề tách biệt. (1) Cả tám số dòng `test_sandbox.py` lệch đúng +1; dòng thật là 760, 829, 1072, 1074, 1076, 1106, 1108, 1110. Kỹ sư tin plan sẽ sửa dòng ngay trên mỗi mục tiêu. (2) Set (iii) mô tả 12 occurrence, nhưng họ `.omp*` trên đĩa trong `python/` là **108** occurrence trên 12 file, trong đó 63 là literal có quote: `.omp-xdg` 30, `.omp-tmp` 14, `.omp-session` 10, `.omp` 6, `.omp-session-v1.2.4` 1, `.omp-session-v1.2.3` 2. Plan chỉ đếm 12 cái trùng hợp là path segment `"omp"` trần, nên bỏ sót `.omp-tmp` (mà `sandbox.py:500,574` tạo và `test_sandbox.py:726,735,749,824,1070,1104,2420,2430,2447` assert) và `.omp-session*` (mà `sandbox.py:899,1047` và `tasks.py:364` tạo). Keep-list của N15 chỉ nêu `.omp-xdg` và `<xdg_root>/omp`, nên một keep-list viết thẳng từ plan là thiếu trên họ này. |
| W13' và §2.3: các danh tính duy nhất trong `python/` phải được giữ là Unix group N13 và bố cục sandbox XDG N15; phân loại là ba set rời nhau. | **Thiếu** — có một danh tính thứ tư với disposition ngược lại, và nó thuộc về work item khác. | `worker.py:145,168,209` và `entrypoint.sh:60,61,65,66,77,78,79,80,81` tham chiếu `_AGENT_HOME / ".omp"` với `_AGENT_HOME = Path("/srv/agent-home")` (`worker.py:136`). Đó là **config dir của chính CLI** — `CONFIG_DIR_NAME` từ `dirs.ts:27` — không phải bố cục sandbox, cũng không phải Unix group. Nó thuộc W4 (dual-root reader) và W6 (lần lật), và **phải** ở lại `.omp` trong giai đoạn chuyển tiếp chính vì W4 vẫn đọc root cũ. Điều này quan trọng vì một lần quét họ `.omp*` trong `python/**` — thứ tự nhiên phải chạy sau khi đọc set (iii) — sẽ dời staging của robomp khỏi root mà CLI vẫn đang đọc, một sự hỏng chỉ-ở-container mà cả test Python lẫn `check:ts` đều không thấy. `test_worker.py:278,290,295,296` assert cùng bố cục staged-home đó. Plan cần một hàng thứ tư trong keep-list nêu nó, gán cho W4/W6 chứ không phải N13 hay N15. |
| W13' liệt kê `python/robomp/pyproject.toml:22` (`"omp-rpc>=0.1.0"`) là một trong sáu site distribution-metadata cần đổi, cùng `:6`, `:8` và bốn cái trong `python/omp-rpc/pyproject.toml`. | **Tự mâu thuẫn** — xung đột với mặc định trong bảng open-questions của chính tài liệu đó. | Dòng 22 là một yêu cầu dependency PEP 508 trên tên **distribution** `omp-rpc`, không phải metadata mô tả. Bảng open-questions cuối M5 quyết định tên đó và mặc định được nêu là **GIỮ `omp-rpc` vĩnh viễn**, vì đổi tên phá mọi `pip install omp-rpc` hiện có. Dưới mặc định đó, `:6` giữ tên và `:22` **phải** khớp theo. Đổi `:22` trong khi `:6` ở lại làm dependency của robomp không resolve: `uv pip install` chết lúc resolve và toàn bộ bot không cài được. Cùng kiểu ràng buộc tại `Dockerfile:164` (`pip install /tmp/wheels/omp_rpc-*.whl`, resolve theo tên file wheel) và `python/omp-rpc/pyproject.toml:31` (`package-dir`). Cách đọc đúng: `:22` không phải rename site — nó là hệ quả của một quyết định thuộc bảng open-questions, và dưới mặc định nó là một dòng KEEP nằm giữa danh sách thay đổi. Hàng open-questions trong back-matter M5: "Giữ `omp-rpc` vĩnh viễn, chỉ đổi metadata mô tả (`description`, `keywords`, `Homepage`) và tên lệnh mặc định" — ba trường mô tả, tức là `:8`, `:14`, `:26` chứ **KHÔNG** phải `:22`. |
| Lệnh của W13': `bun run check && bun run test:py && git grep -n '"omp"' -- 'python/**/*.py'`, và mục "Test cần viết" nói cập nhật `test_client.py:1044,1061` cho khớp. | **Lệnh không phân biệt được thành công với môi trường không chạy được**, và chỉ thị test tạo ra một test không assert gì cả. | Hai khiếm khuyết tách biệt. (1) Lệnh: `bun run test:py` **THẤT BẠI** với `No module named pytest` (exit 1) và `bun run lint:py` **THẤT BẠI** với `ruff: command not found` (exit 127) — cả hai không phân biệt được với một lỗi test thật chỉ qua mã thoát. Tệ hơn, `bun run check` **mù cấu trúc** với item này: `check:ts` lọc `./packages/*` và oxlint chỉ phủ JS/TS, nên không dòng sửa nào dưới `python/**` có thể làm nó đỏ, trong khi `check:rs` cộng thêm một lời gọi toolchain Rust cho công việc không chạm Rust. Cả hai nửa là chi phí mà không có tín hiệu. (2) Test: `test_client.py:1044` truyền `executable="omp"` vào và `:1061` assert `"omp"` ra — một giá trị tường minh được echo lại, thứ AGENTS.md cấm với tư cách success-passthrough. Hoán đổi cả hai chuỗi để lại một test xanh dưới **tên nào**, nên suite xanh mà chưa từng kiểm tra default có dời hay không. Cách sửa: bỏ đối số tường minh và assert default được tính ra — cũng chính là assertion biến đổi mà hợp đồng test của item yêu cầu. |
| Danh sách lệnh xác minh §3.3: `git grep -n 'omp' -- 'python/**/pyproject.toml'` trả về 15 dòng, đọc thành 2 path-noise + 6 display-branding + 7 distribution/module names; "Đừng đếm 15 làm ngân sách sửa". | **Đúng, và đáng giữ nguyên văn** — nhưng nó không thấy hai bề mặt thật. | Phân rã 15 dòng khớp chính xác: 2 noise (`robomp:63` `"C4"`, `:67` `"E501"`, chỉ khớp vì chính đường dẫn `python/robomp/pyproject.toml` chứa substring `omp`), 6 branding (`omp-rpc:8,14,26` và `robomp:8,22`), 7 distribution/module (`omp-rpc:37` và `robomp:6,34,37,38,41,75`). Chỉ dẫn không coi 15 là ngân sách sửa là đúng và nên được giữ. Cái lệnh không thấy: `python/omp-rpc/pyproject.toml:27,28` mang `https://github.com/can1357/oh-my-pi` trong `Repository` và `Documentation`. Chuỗi trần `oh-my-pi` không chứa substring `omp`, nên grep này bỏ sót — **và không work item nào nhận trách nhiệm**, vì mẫu của W7 là `@oh-my-pi/` có dấu gạch chéo cuối còn W8a giới hạn trong TypeScript. Hai lệnh trả về tập rời nhau, và đó chính là bằng chứng rằng không lệnh nào phủ lệnh kia. |

## Cần người xác nhận

Hai mâu thuẫn **bên trong chính spec này** — cả hai đã đo lại trên cây và đóng ở đây:

1. **Đã giải — `.omp-tmp`: 19 và 14 đều đúng, ở hai phạm vi khác nhau.** `git grep -o '\.omp-tmp' -- python/ | wc -l` → **19** là tổng mọi lượt; `git grep -ohE '"\.omp-tmp"' -- python/ | wc -l` → **14** là literal có quote. Phần chênh 5 là 4 dòng docstring/comment (`sandbox.py:17,493,567,572`) và 1 đường dẫn nội tuyến `test_sandbox.py:2430` (`".omp-tmp/scratch"` — có tiền tố nên regex `"\.omp-tmp"` không khớp), tất cả nằm trong file item này đụng. Tổng 63 literal có quote (30 + 14 + 10 + 6 + 2 + 1) vì thế chỉ khớp con số 14, và `verification` dùng đúng con số đó. Vì keep-list ghi **mẫu** chứ không ghi số lượt, hãy dùng phạm vi rộng: **`.omp*` = 108 lượt trên 12 file**, tính theo tổng lượt (không phân biệt quote) là `.omp-xdg` 38, `.omp-session` 20, `.omp-tmp` 19, `.omp` trần 31. Cùng quy tắc cho `.omp-session*`: tổng 20, họ có quote 13 (10 `.omp-session` + 2 `.omp-session-v1.2.3` + 1 `.omp-session-v1.2.4`).
2. **Đã giải — "12 file" là của 108, không phải của 63.** `git grep -l '\.omp' -- python/ | wc -l` → **12**; `git grep -lE '"\.omp[a-z0-9.-]*"' -- python/ | wc -l` → **6**. Nên ghi chú của `sandbox.py` ("63 quoted occurrences in 12 files") gán nhầm phạm vi: 63 là literal có quote trên **6** file (`src/sandbox.py`, `src/worker.py`, `tests/test_host_tools.py`, `tests/test_permissions_e2e.py`, `tests/test_sandbox.py`, `tests/test_worker.py`), còn 12 file là phạm vi của tổng 108 — và đó mới là danh sách keep phải liệt kê: `.env.example`, `AGENTS.md`, `README.md`, `docker-compose.yml`, `entrypoint.sh`, `src/sandbox.py`, `src/tasks.py`, `src/worker.py`, `tests/test_host_tools.py`, `tests/test_permissions_e2e.py`, `tests/test_sandbox.py`, `tests/test_worker.py`.


---


## Rủi ro và cách sai dễ nhất

Có ba kiểu hỏng mà M5 nhiều khả năng đi sai hơn mọi thứ khác cộng lại.

Một là **một lệnh thay chuỗi sai trên hàng nghìn file là thất bại không hoàn tác được**. W7 là một pass trên 4118 file / 17212 lượt; W8b là một pass trên 599 file / 1853 token `omp`. Không có nút "hoàn tác" cho một pass đã ghi; đường về chỉ có là diff so với baseline — và baseline chỉ tồn tại nếu được chụp *trước* khi pass chạy. Ở W7, phạm vi sai không chỉ hỏng code: nó có thể quét sạch 13 file changelog đã phát hành, mà `AGENTS.md` coi là bất biến, và Gate A vẫn xanh vì changelog vốn nằm ngoài tập in-scope.

Hai là **đổi tên trên đĩa phá vỡ cài đặt đang tồn tại** — đúng ràng buộc tuyệt đối của milestone. Cái bẫy là `APP_NAME` không chỉ là tên hiển thị: `dirs.ts:360` dựng XDG app root bằng chính hằng số đó, nên một "đổi tên hiển thị" ở W3 đồng thời là một cái dời thư mục dữ liệu. Tệ hơn, lỗi ở đây không báo mình: `getInstallId()` rơi xuống nhánh tạo UUID mới thì UUID mới không khác UUID đúng ở bất kỳ call site nào, và dấu hiệu duy nhất là bảng chi phí khởi động lại từ đầu.

Ba là **detector soi nhầm tập rồi báo thành công trong khi không có gì thay đổi**. Ở W7, danh sách baseline và tập in-scope đều được sinh từ cùng một lần `git grep`; ở W8b, bảng quyết định và pass đổi cùng bắt nguồn từ cùng một lần quét; ở W11 và W13, detector đọc `disposition.tsv` do chính pass đó viết ra. Khi danh sách và việc thay đổi cùng xuất phát từ một nguồn thì sự khớp là hệ quả tất yếu, không phải bằng chứng. Một `grep` sạch thu được bằng nhiều cách — trong đó có cách **xoá sạch** những dòng lẽ ra phải giữ — và xoá sạch làm cổng im lặng, không đỏ.

### Môi trường đo được, và tại sao nó không nói được gì về thay đổi của bạn

Trên HEAD `84cbac9`, `bun test` **không bị chặn toàn cục**. `bun test packages/utils/test/` cho **658 pass / 2 skip / 17 fail / 16 errors**, và các lỗi đó đều cùng một nguyên nhân: `Failed to load pi_natives native addon for darwin-arm64`, khuất trong `logger-contract.test.ts` và `procmgr.test.ts`. Đó là baseline có sẵn trên cây sạch, **không phải hậu quả của công việc M5** — nên một lần test đỏ ở trạng thái đó không chứng minh gì về thay đổi của bạn, và một lần test xanh ở trạng thái đó cũng không chứng minh gì. Đây là lý do các work item ghi Gate E / GATE 3 / TẦNG 3 của riêng mình là `test:ts = NOT RUN — environment blocked` thay vì đỏ: một cổng luôn đỏ không mang thông tin nào.

Hai giới hạn còn lại thì đúng như mong đợi. `bun --cwd=packages/natives run build` thất bại nếu thiếu `ninja` — `brew install ninja` trước, không thì bước đó không chạy được và mọi cổng phụ thuộc addon phải ghi là chưa chạy chứ không phải là đỏ. Còn `bun run check:ts` thì chạy được (~29 giây) và là tín hiệu duy nhất luôn chạy được, nhưng nó mù cấu trúc: nó không thấy đổi giá trị, không thấy đổi đường dẫn, không thấy đổi tên hiển thị sai. Các mục khác ghi lại thời gian chạy khác nhau cho cùng lệnh đó, nên đừng coi thời gian chạy là một cam kết.

### Bảng rủi ro

| Work item | Rủi ro | Cách giảm |
| --- | --- | --- |
| W7 | Một pass trên 4118 file / 17212 lượt là không hoàn tác được. Phạm vi sai quét sạch 13 file changelog đã phát hành, và Gate A vẫn xanh vì changelog nằm ngoài tập in-scope. | Chụp baseline *trước khi sửa* (`/tmp/w7-changelog-baseline.txt`, `/tmp/w7-bare-baseline.txt`, `/tmp/w7-inscope-files.txt`); chạy thử không ghi để đếm trước; dừng ở cổng đỏ đầu tiên. Gate B (changelog) và Gate C (dạng trần, 16 file) soi hai lỗi khác nhau — không thay bằng nhau. |
| W8b | `sed` đại trà trên 599 file: 851/1768 dòng có hit là dòng comment, 226 file là file test. Cách xoá sạch một dòng lẽ ra phải giữ làm Gate 1 im lặng. Thêm nữa, cột `hits` suy ra bằng `grep -c` sẽ sai ở file trộn đường dẫn với User-Agent — `update-cli.test.ts` có cả `path.join(dir, ".local", "bin", "omp")` lẫn `parseReportedVersion("omp/18.0.6-canary.1")` trong 58 dòng — và cổng `--stage=post` chỉ đỏ *sau khi đã sửa xong*. | Không sửa một dòng nào trước khi có `scripts/rename/disposition.tsv` (6 cột, `reason` không trống, `approved-by` khác `authored-by`); `check-disposition.ts --gate0` là cổng mở. Đếm `hits` bằng cách mở từng file, không bằng `grep -c`. Gate 1 đối chiếu tập hit còn lại với disposition *trong file*, không với một danh sách viết tay thứ hai. |
| W8b, W11, W13 | Detector đọc danh sách do chính pass đó sinh ra, nên "khớp" là hệ quả tất yếu chứ không phải bằng chứng. | Bảng phải lập trên cây *sau* W7, có lý do bằng văn bản cho từng hàng và một người duyệt thứ hai — cổng `--stage=pre` đã kiểm `git log --format='%ae' -- scripts/rename/disposition.tsv` có ít nhất hai địa chỉ hay không và in cảnh báo khi chỉ có một, nhưng cảnh báo không phải cổng. Ở W13, allow-list phải kiểm cả hai chiều bằng `comm -23` và `comm -13` (một dòng allow-list hết hiệu lực cũng phải đỏ) và phải có `\|\| true` — thiếu nó thì `git grep` exit 1 làm bỏ qua `comm` và cổng luôn xanh. |
| W3, W6, W6a | Đổi tên trên đĩa phá cài đặt đang tồn tại — vi phạm ràng buộc tuyệt đối của milestone. `APP_NAME` dựng cả XDG app root (`dirs.ts:360`), nên đổi nó làm người dùng XDG rơi về `~/.omp` và mất `sessions` cùng `secret-placeholder.key` (`dirs.ts:983`); secret key sinh lại là mọi secret cũ hỏng. | Tách hiển thị khỏi đường dẫn (W3 phương án b: `APP_NAME` + `XDG_DIR_NAME` đóng băng), rồi mới lật. W4 phải land trước: đọc hai root theo thứ tự, ghi chỉ vào root mới. W6a ghim `.omp` cấp project vào hằng số riêng với khẳng định DIVERGENCE — không có test nào sẵn có bắt được hành vi nếu hai hằng số bị gộp lại. |
| W4 | Lỗi không triệu chứng: `getInstallId()` rơi xuống nhánh tạo UUID mới khi chỉ còn root cũ đọc được. UUID mới không khác UUID đúng ở bất kỳ call site nào. | RED-BEFORE-GREEN bắt buộc cho hợp đồng (2): cấy UUID ở đường dẫn install-id cũ và xác nhận assertion đỏ *trước* khi sửa. Kiểm tra âm: sửa tạm `getConfigWriteRootName()` về tên cũ, xác nhận hợp đồng 3 và 4 đỏ. Xác nhận mỗi file mới báo pass khác 0 — file load được và in `0 pass` là file chưa khẳng định gì. |
| W4 | `ULTRAWORKERS_CONFIG_DIR` chỉ được thêm ở TypeScript: `crates/pi-natives/src/crash_handler.rs:269` và `crates/pi-natives/src/oauth_callback/darwin.rs:441` vẫn chỉ nghe `PI_CONFIG_DIR`, nên người dùng chỉ đặt biến mới sẽ có config root nhất quán và thư mục crash-log không nhất quán. | Không có test harness cho hai file Rust trong milestone này. Đọc hai hunk đó trong review và nói thẳng trong PR là không có lần chạy nào phủ chúng — đừng ám chỉ một lần chạy xanh. |
| W2, W7 | Chạy W7 trước W2 làm hỏng canonicaliser extension một cách im lặng: hai chuỗi scope mà pass của W7 không chạm tới chính là cơ chế tương thích. | Tách W2a (chỉ mở rộng alias, shippable một mình) và W2b (sau W7 pass 1). Gate 0 của W7 grep `CANONICAL_PI_SCOPE` và dừng với thông điệp BLOCKED chứ không phải "chưa xong". Nếu W2b buộc phải đi cùng W7 thì cần một release gate thật (CODEOWNERS hoặc CI check), không chỉ một dòng trong tài liệu. |
| W9, W10, W13p | Tên lệnh được khai ở một chỗ và gọi ở chỗ khác. `task/omp-command.ts:11` ghim `"omp.cmd" : "omp"`; `scripts/ci-release-build-binaries.ts` là producer còn `scripts/install.sh` và `scripts/ci-update-brew-formula.ts` là consumer; Python đọc bốn nguồn (`client.py:455`, `config.py:95`, `docker-compose.yml:81`, `.env.example:185`). Đổi một nơi, bỏ nơi khác — 404 trên mọi lệnh cài một dòng, không test nào đỏ. | Suy `DEFAULT_CMD` từ `APP_NAME` để xoá nguyên nhân gốc. Chạy cổng producer↔consumer của W10 (in ra ba tên, yêu cầu bằng nhau) và bốn cổng thỏa thuận của W13p — cổng bốn phía là thứ duy nhất đỏ khi đổi dở, vì ba nguồn kia vẫn ghi tên cũ. |
| W10 | Đổi nhầm những thứ đăng ký *ngoài* repo: nhãn self-hosted runner `omp-kata` (12 dòng `runs-on`) và bộ lọc nhánh `omp2` (`ci.yml:34`). Đổi một trong hai thì job không bao giờ được lên lịch và không bao giờ báo lỗi. | `git diff --stat` phải in rỗng cho `infra/runner.Dockerfile`, `nix/bun.nix`, `scripts/ci-release-checksums.ts`; và `grep -rn 'runs-on:.*omp-kata' .github/workflows/ \| wc -l` phải in `12`. Đây là phòng thủ tự động duy nhất, vì không gì trong repo này quan sát được hậu quả. |
| W1 | Gõ nhầm tên thương hiệu mới vào `WIRE_NAME` — biến đổi có ý nghĩa nhất của W1 là sẽ được đổi tên, nên tên mới là thứ dễ gõ nhất trong repo. Nó chạm ba hợp đồng bên thứ ba: Warp terminal, ACP client, DAP adapter. | Cổng (1) của W1 đỏ đúng lúc đó: tạm đặt `WIRE_NAME` thành `"ultraworkers"`, xác nhận `bun test packages/utils/test/wire-name.test.ts` đỏ, rồi hoàn nguyên. Bốn file golden hiện có là lưới thứ hai, độc lập, cùng bắt lỗi đó. Cổng (3) bắt thêm cách lỗi tinh vi hơn: sửa các golden để so với hằng số, khiến cả năm vị trí đi qua một lần đổi tên trong im lặng. |

---

## Bảng quyết định cần bạn chốt

Bên dưới là **73 câu hỏi mở** (đã đếm trên `m5-index/questions.json`: W1 = 4, W2 = 3, W3 = 4, W4 = 4, W5 = 5, W6 = 3, W6a = 4, W7 = 4, W8a = 5, W8b = 6, W9 = 6, W10 = 6, W11 = 4, W12 = 4, W13 = 6, W13p = 5), chia ba tầng theo mức chặn. Mỗi bảng có cùng bốn cột. Cột cuối chỉ ghi mặc định mà chính câu hỏi đã nêu; câu nào không nêu mặc định thì ghi rõ là chưa có, chứ không bịa một mặc định hợp lý ra.

**Tầng 1 — chặn việc bắt đầu (16 câu).** Không câu nào trong tầng này trả lời được về sau: mỗi câu đều đổi danh sách file một work item sẽ sửa, hoặc làm một đặc tả bắt đầu sai.

| Work item | Câu hỏi | Vì sao nó chặn | Mặc định nếu không trả lời |
| --- | --- | --- | --- |
| W7 | Sáu leaf package `@oh-my-pi/pi-natives-<tag>` publish từ CI (`ci.yml:326`) đã được publish dưới scope mới chưa? Nếu chưa thì `loader-state.js:70` không được đổi, hoặc W7 phải kèm một bước publish, hoặc sáu tên phải vào danh sách loại trừ. | Câu hỏi duy nhất trong W7 có thể hỏng im lặng ở người dùng cuối: đổi `loader-state.js:70` khi addon chưa publish sẽ hỏng lúc nạp native, không phải lúc build. | Theo câu hỏi: nếu chưa publish thì giữ `loader-state.js:70` nguyên vẹn. Nhánh publish-step và nhánh đưa sáu tên vào danh sách loại trừ là hai lựa chọn khác, cần bạn chọn. |
| W7 | Scope `@ultraworkers` đã được ai sở hữu chưa? Đây là cổng G3 của kế hoạch §8, nằm ngoài repo. | Là điều kiện mở của W7 (Gate 0) và của cả W2b. Chưa có scope thì toàn bộ W7 là 17212 lượt viết vào một namespace không tồn tại. | Chưa có mặc định — cần bạn quyết. |
| W12 | Scope `@ultraworkers` đã có và đã được sở hữu, **và** scope cũ còn publish được cho stub không? | Cả hai đều nằm ngoài repo và cả hai chặn W12 ngay từ bước 10. | Chưa có mặc định — cần bạn quyết. *(Nửa đầu câu này trùng với W7 ở dòng trên; nửa sau — quyền publish scope cũ cho stub — là câu riêng, không câu nào khác hỏi.)* |
| W8b | Ai là người duyệt, duyệt lúc nào, và nếu không có ai duyệt thì mục này có bị chặn không? Repo chỉ có hai tác giả git (`E2E <e2e@example.com>` 7 commit, `Tran Quang Dang <tranquangdang21@gmail.com>` 1 commit) và identity đang cấu hình là `E2E`. | Kế hoạch chỉ trả lời bằng một câu, trong khi đây là ba quyết định tách biệt. Quan trọng nhất là mốc thời gian: kế hoạch nói "không duyệt thì W8b không được sửa dòng nào", nghĩa là duyệt phải xảy ra *trước khi viết xong bảng* — người duyệt phải theo dõi tiến trình viết bảng chứ không thể duyệt một lần lúc PR mở. Người duyệt cũng là chủ chốt an toàn của cả W7 lẫn W8b. | Theo câu hỏi: nếu không có ai duyệt thì **không chặn**, nhưng phải ghi rõ trong PR rằng bảng tự duyệt và ai đã đọc. Còn "ai" và "duyệt lúc nào" thì chưa có mặc định — cần bạn quyết. |
| W8b | 226 trong 599 file là file test, và 24 file trong số đó trùng với tập 70 file của W11. Ai sở hữu việc đổi tên trong 226 file đó? | Nếu W8b sửa literal trước thì W11 làm lại; nếu W8b bỏ qua thì cổng nghiệm thu 2 của W8b ("không còn khẳng định tên cũ hardcode trong nguồn test") không bao giờ đạt vì W11 chưa chạy. Không thể để hai mục cùng sửa một dòng mà không có thỏa thuận bằng văn bản. | Chưa có mặc định — cần bạn quyết. Đề xuất trong câu hỏi là W8b chỉ gán `disposition` mà không sửa dòng nào, nhưng chính đề xuất đó biến `hits` thành con số "đã biết sẽ đổi" và làm cổng `--stage=post` đỏ, nên không tự áp dụng được. |
| W6a | `packages/coding-agent/src/config.ts:12` — `priorityList` nuôi cả `USER_CONFIG_BASES` (dòng 84) lẫn `PROJECT_CONFIG_BASES` (dòng 90) từ cùng một giá trị `dir`. Nếu file này không được sửa, mục project trong `PROJECT_CONFIG_BASES` âm thầm thành `.ultraworkers`. | Câu hỏi duy nhất được đánh dấu BLOCKING. Nó là một thay đổi hành vi cấp project giấu bên trong một lần đổi tên hằng số, ảnh hưởng `getConfigDirs('skills' \| 'commands' \| 'agents' \| 'hooks', {level:'project'})`, và phải do người trả lời trước khi merge chứ không để kỹ sư tự suy. | Theo câu hỏi: chuyển đúng một mục `priorityList` sang `PROJECT_DIR_NAME`, để config project tiếp tục đọc `.omp` đã commit. |
| W6 | `do_not_rename.tsv` nằm ở đâu? Kế hoạch §2.3 định nghĩa một bảng 17 hàng nhưng không nêu đường dẫn, và `scripts/rename/` chưa tồn tại. | Đây chính là tập loại trừ mà pass 4107 file của W7 nạp. Một registry nằm sai chỗ là một registry W7 không đọc, và lúc đó việc đổi tên chạy không có lưới. | Theo đặc tả: `scripts/rename/do_not_rename.tsv`, cạnh `disposition.tsv` của W8b. **Cần lưu ý mâu thuẫn:** W6 gọi tên file này là `do_not_rename.tsv`, còn cổng (7) của W6a, Gate 0/E của W7 và W8a, và danh sách file của W10 đều yêu cầu `keep-list.txt`. Cùng một registry, hai cái tên — phải chốt một tên. |
| W3 | Bán kính XDG: `dirs.ts:360` là `const appRoot = path.join(value, APP_NAME)` và chỉ dùng XDG khi `fs.existsSync(appRoot)`. Chọn: (a) W3 chấp nhận rủi ro, (b) tách `APP_NAME` (hiển thị) + `XDG_DIR_NAME` (đóng băng `"omp"`), hay (c) trì hoãn W3 tới khi W6 có migration. | Quyết định này quyết định W3 có đúng là một lần đổi tên hiển thị hay không. (a) và (c) đều biến W3 thành cái dời thư mục dữ liệu, và W3 là tiền đề của W4, W5, W6. | Theo câu hỏi: khuyến nghị (b) — tách `XDG_DIR_NAME` đóng băng, rẻ nhất và giữ đúng ý nghĩa tên hàng của W3. |
| W3 | Giá trị mới của `APP_NAME` là gì? Kế hoạch không nêu. | Cần chốt trước khi sửa vì giá trị này xuất hiện ở 6 file nguồn và 4 file test. | Chưa có mặc định — cần bạn quyết. |
| W2 | Chấp nhận tách W2a / W2b, hay giữ W2 làm một commit phải merge cùng PR với W7 pass 1? | Nó đổi thứ tự của milestone chứ không chỉ đổi code, nên phải có người quyết. Tách tạo ra một cửa sổ mà scope canonical không trỏ tới một scope chưa tồn tại; gộp thì không có cửa sổ đó nhưng lại mất chỗ đứng riêng cho phần chỉ mở rộng alias. | Theo câu hỏi: tách W2a (wave 1, shippable một mình) và W2b (sau W7 pass 1) — an toàn hơn nghiêm ngặt. |
| W3 | Có kéo `composer-shape-preview.ts:45` (`PREVIEW_TITLE`) vào W3 không? | Kế hoạch bỏ sót; nằm trong cùng package `tui`, cùng tính chất tên hiển thị, và test của nó đang ghim `"omp"`. | Theo câu hỏi: có, đưa vào scope W3. |
| W8a | Lệnh nghiệm thu của kế hoạch trỏ tới `test/extension-scope-canonicalization.test.ts` — file đó không tồn tại; đặc tả dùng `test/pi-scope-aliases.test.ts`. | Cả hai phải khớp trước khi W8a chạy, nếu không thì Gate F và lệnh nghiệm thu trỏ vào hai file khác nhau và cái nào cũng không chạy đúng ý. | Theo câu hỏi: dùng `test/pi-scope-aliases.test.ts` theo đặc tả W2, và bắt kỹ sư W2 đặt tên khác thì phải sửa cả hai bên trước khi W8a chạy. |
| W9 | Tên bin mới chính xác là gì, và `DEFAULT_CMD` có nên bỏ ghim cứng không? `task/omp-command.ts:11` đang ghim `"omp.cmd" : "omp"`. | Tên mới là đầu vào của W9, và W13p, W10, W12 đều dựa vào nó. Còn `DEFAULT_CMD` thì quyết định giữ hay xoá nguyên nhân gốc của rủi ro "quên một trong ba khai báo bin". | Theo câu hỏi: tên mới là `ultraworkers` (đã dùng nhất quán trong cả 16 mục), và `DEFAULT_CMD` nên suy từ `APP_NAME` — phương án (b), vì repo đã có tiền lệ đúng y vậy ở `test/fixtures/compiled-worker-selector-host.ts:5`. |
| W11 | Sau W4, tên của candidate list hai root là gì? 217 lượt `.omp` không phân loại được thành tập (i) "config root của app" và tập (ii) "đường dẫn legacy được seed" nếu không biết tên hằng số đó. | Là câu hỏi chặn thật sự của W11, và là lý do W11 phụ thuộc W4 chứ không chỉ phụ thuộc W1/W3. Không có nó thì 217 lượt không xếp được vào tập nào. | Chưa có mặc định — cần bạn quyết. |
| W13 | `omp://` có phải tên hiển thị cần đổi không? `omp-protocol.ts:28` là `readonly scheme = "omp"`; 24 file `.ts` tham chiếu `omp://`; có 2 module mang tên thương hiệu và 1 prompt `prompts/internal-urls/omp.md`. | Đổi thì mọi `omp://` từng gõ, bookmark hay do agent ghi vào transcript sẽ hỏng, và phải đổi tên 3 file cùng một commit. Giữ thì sản phẩm tên `ultraworkers` vẫn phải gõ `omp://` và URL scheme trở thành di sản thương hiệu vĩnh viễn. Cổng Gate 5 của W8b vẫn đang bám vào câu trả lời này. | Chưa có mặc định — cần bạn quyết. W13 nói rõ nó không tự quyết. |
| W13p | Tên phân phối `omp-rpc` có được đổi không? | Câu hỏi chặn W13p, và kế hoạch để ngỏ. | Theo câu hỏi: giữ `omp-rpc` vĩnh viễn — đổi sẽ phá mọi `pip install omp-rpc` hiện có, và đây là giả định duy nhất để lại cây cài được. Kéo theo: `python/robomp/pyproject.toml:22` phải giữ, và `Dockerfile:164` vẫn resolve được. |

**Tầng 2 — chặn giữa (45 câu).** Work item có thể mở, nhưng câu trả lời quyết định một bước cụ thể, một danh sách file, hoặc một mục liệu.

| Work item | Câu hỏi | Vì sao nó chặn | Mặc định nếu không trả lời |
| --- | --- | --- | --- |
| W1 | Tập 5 vị trí wire bị bỏ sót. Hai cái nghiêm trọng và **không** phải tên hiển thị: `stencil.kdl:13` (`client-id "omp"` — OAuth client id đã đăng ký ở issuer Stencil) và `openai-codex.kdl:12` (`originator "omp"`). Gấp vào tập wire của W1, giao cho mục sau, hay ghi rõ do-not-touch? | Cấm thêm vị trí thứ sáu trong W1, nhưng cũng không được im lặng bỏ qua — nếu không, chính `sed` của W7 và sweep display-token của W8b sẽ quyết định thay người. | Theo câu hỏi: tách thành một work item riêng, vì hai giá trị KDL cần sửa ở tầng KDL mà W1 không nên đụng tới. |
| W1 | `packages/catalog/src/wire/codex.ts:52` được khai READ-ONLY, nhưng nguồn thật là KDL ghi được + `rules.json` đã commit. Ai giữ bất biến "originator phải là `omp`", và có cần test trước khi W7 chạy không? | Một lần sửa KDL vô tình, hoặc `bun run gen:compat` sau một sửa KDL không liên quan, có thể dời giá trị này mà không hề có diff TypeScript. | Chưa có mặc định — cần bạn quyết. *(Câu này là phần cụ thể hơn của W1 ở dòng trên, không phải câu trùng: W1 hỏi "đặt ở đâu", câu này hỏi "ai giữ và có test không".)* |
| W1 | Vị trí DAP (`dap/session.ts:1465-1466`) không có test trực tiếp. Chấp nhận phủ truyền tiếp, hay dựng harness `vi.spyOn(DapClient, "spawn")`? | Cặp `clientID`/`clientName` là cặp duy nhất trong năm có bên tiêu là debug adapter bên thứ ba, nên một lần gãy thầm lặng ít khả năng được chính người bảo trì phát hiện nhất. | Theo câu hỏi: chấp nhận phủ truyền tiếp, không dựng harness. |
| W1 | `hindsight/settings.ts:172` đăng ký `cfgHindsightRetainContext` với `default: "omp"` — cùng danh tính bank-namespace với `bank.ts:29`, nhưng là một khoá cấu hình riêng. Là cùng wire identity (đọc `WIRE_NAME`) hay một mặc định setting độc lập (giữ)? | Năm file test đang mang `retainContext: "omp"` như **fixture input** (`hindsight-bank.test.ts:55`, `hindsight-conversation-timestamps.test.ts:35`, `hindsight-mm-cache-stability.test.ts:34`, `hindsight-retention-cache.test.ts:27`, `memory-tools.test.ts:63`). Người tiếp theo quét literal sẽ vấp vào đây. | Theo câu hỏi: để ngoài W1, vì đổi mặc định của một setting đã đăng ký là thay đổi hành vi chứ không phải refactor. |
| W2 | Nếu W2b và W7 pass 1 phải ship cùng nhau, ai giữ release gate chặn W2b bị cherry-pick một mình? | Một CODEOWNERS entry hoặc CI check khẳng định `git grep -m1 '"name"' -- packages/utils/package.json` trả về `@ultraworkers/pi-utils` mỗi khi `CANONICAL_PI_SCOPE` là `@ultraworkers` sẽ làm thất bại trở nên bất khả thi thay vì chỉ được ghi chép. | Chưa có mặc định — cần bạn quyết. |
| W2 | N17 được ghi là đã chốt ("giữ cả 16 basename") nhưng bảng open-questions của kế hoạch vẫn trình bày nó như một quyết định sản phẩm còn mở. | W2 không được tự giải quyết theo bất kỳ hướng nào; phải xác nhận lập trường cuối trước khi ai đó chạm `PI_PACKAGE_NAMES`. | Chưa có mặc định — cần bạn quyết. |
| W3 | Có kéo `relay/server.ts:55` (`DEFAULT_GROUP`, tiêu đề tab group trình duyệt) vào W3 không? | Để ngoài vì đó là nhãn chrome trình duyệt chứ không phải tên ứng dụng — nhưng nó sẽ thành literal trùng lặp thứ 10 sau W3. | Theo câu hỏi: để ngoài phạm vi W3. |
| W4 | `getConfigDirCandidates()` có bao gồm tên cấp project không, hay bám sát home-scoped? | Đặc tả giữ nó home-scoped và cho đường dẫn project một hằng số ghim riêng (W6a phương án b). Nếu sản phẩm sau này muốn dual root cấp project, đó là phương án (a) của W6a và nó kéo theo việc `config migrate` phải chạm một thư mục thường đã được commit vào git. | Theo câu hỏi: home-scoped, và đường dẫn project có hằng số ghim riêng. |
| W4 | N16 trả lời câu hỏi open của kế hoạch về họ `PI_*`/`OMP_*` là "giữ vĩnh viễn làm alias", và W4 làm đúng vậy cho một biến. 149 tên runtime còn lại trong họ vẫn mang tiền tố `PI_` trong milestone này. | Sản phẩm sẽ ship với tên `ultraworkers` nhưng từ vựng cấu hình vẫn tiền tố `PI_`; cần biết đó là chủ ý hay sót. | Chưa có mặc định — cần bạn quyết. |
| W4 | Cache sống suốt tiến trình, hay `config migrate` có thể buộc phân giải lại trong tiến trình? | Với cache suốt tiến trình, một migrate di chuyển `~/.omp` sang `~/.ultraworkers` để lại tiến trình đang chạy trỏ tới một thư mục không còn tồn tại. Vô hại với lệnh CLI chạy một lần rồi thoát, nhưng phải là một quyết định được nói ra chứ không phải tai nạn. | Chưa có mặc định — cần bạn quyết. |
| W5 | `config migrate` có nên từ chối chạy khi daemon hoặc phiên còn sống, hay cảnh báo rồi vẫn tiếp? | Sự hiện diện đã kiểm chứng của `agent.db`/`history.db`/`models.db` kèm anh em `-wal`/`-shm` và `run/daemons/<hash>/` làm đây thành rủi ro hỏng dữ liệu thật; nhưng từ chối cứng nghĩa là người dùng có daemon kẹt không migrate được. Cần một quyết định sản phẩm trước khi hiện thực. | Theo câu hỏi: dò daemon còn sống qua bề mặt lock sẵn có ở `packages/utils/src/file-lock.ts`, in một lời từ chối rõ ràng nêu lệnh dừng nó, và để `--force` ghi đè. |
| W5 | `MigrationOptions.oldName` khi gọi là gì — literal `".omp"`, hay giá trị cũ của `CONFIG_DIR_NAME` đọc trước khi W6 lật? | Literal là đúng cho W5-khi-đã-ship (W6 chưa land), nhưng nếu W5 được backport hoặc chạy lại sau W6 thì literal âm thầm thành cũ. | Theo câu hỏi: bắt nó thành một hằng số có tên đặt cạnh `CONFIG_DIR_NAME`, để quan hệ này tường minh và grep được. |
| W5 | Có migrate các root XDG không, khi `init-xdg` là tuỳ chọn? | Trên một máy Linux có `XDG_DATA_HOME` trỏ tới nơi tình cờ tồn tại một thư mục `omp` không liên quan, migrate sẽ di chuyển một thư mục nó không tạo ra. | Theo câu hỏi: yêu cầu đường dẫn cũ trông như một config root (chứa `agent/` hoặc `install-id`) trước khi đề xuất di chuyển, và báo bất cứ thứ gì khác là xung đột thay vì đổi tên âm thầm. |
| W5 | Engine nên nằm ở `packages/utils` hay ở một `packages/coding-agent/src/config-migrate/` mới, test chuyển sang package chạy được? | Engine có hình dạng giống `dirs` và chỉ phụ thuộc `node:fs`/`node:path`, và `packages/utils/src/dirs.ts` là hàng xóm tự nhiên — nhưng vị trí được chọn vì lý do cổng kiểm, và lý do đó nên được người review xác nhận chứ không giả định. | Theo đặc tả: đặt trong `packages/utils`, vì đó là nơi cổng kiểm thực sự chạy được trên máy chưa build addon. |
| W6 | W6 có phải chờ W4 và W5 **đã được dùng trong một bản phát hành thật**, hay "đã ship và CI xanh" là đủ? | Kế hoạch yêu cầu cả hai. Đây là phụ thuộc lịch mà không test nào giải tán được, và là cổng duy nhất không tự động hoá được. | Theo kế hoạch: phải ship **và** phải đã dùng trong một bản phát hành thật trước khi lật. |
| W6 | Chuỗi `'This project (.omp/rules)'` trong trình soạn thảo rules omfg là literal trong controller hay dựng từ hằng số? | Nếu nó dựng từ một hằng số sắp được đổi tên, nhãn người dùng thấy sẽ trôi khỏi đường dẫn trên đĩa. Nhãn hiện được ghim ở `omfg-controller.test.ts:15`. | Theo câu hỏi: nếu là literal thì giữ nguyên `.omp` và nhãn người dùng không đổi; nếu là hằng số thì phải ghi lại câu trả lời trong commit message để người đọc sau biết đó là chủ ý. |
| W6a | Hàng `do_not_rename` cho project `.omp` do W6a tạo, hay để mục nào tạo `scripts/rename/keep-list.txt` trước? | `scripts/rename/` chưa tồn tại trên HEAD `84cbac9`, nên phải có ai đó tạo. §2.3 giao file cho milestone, W7 gate vào nó, và định dạng §2.3 bắt buộc một lý do `#` trên mỗi hàng. | Theo câu hỏi: W6a tạo, với đúng một hàng project `.omp`, và **nối thêm** chứ không ghi đè nếu một mục anh em đã tới trước. *(Cùng một registry với W6 ở tầng 1 — và cùng mâu thuẫn tên `do_not_rename.tsv` / `keep-list.txt`.)* |
| W6a | Phân kỳ vĩnh viễn (`CONFIG_DIR_NAME = '.ultraworkers'`, `PROJECT_DIR_NAME = '.omp'`, mãi mãi) có chấp nhận được như một trạng thái đã ship không, hay cần một follow-up có ngày? | Cây mã sẽ mang vĩnh viễn hai tên thư mục, và người đọc `dirs.ts:27-40` sau này sẽ hỏi tại sao. | Theo kế hoạch (N14, phương án b): giữ vĩnh viễn, và cần một người bảo trì xác nhận điều đó bằng văn bản. |
| W7 | Hai transcript `before-compaction.jsonl` (132) và `large-session.jsonl` (49), 181 lượt scope cũ kể cả một URL registry: là LỊCH SỬ hay là fixture mà test đọc? | 181 lượt sẽ hoặc không được sửa tùy câu trả lời, và nếu bị xem là lịch sử thì phải nêu ngoại lệ tường minh trong danh sách loại trừ chứ không được để mặc định. | Theo câu hỏi: sửa, vì test đọc chúng như dữ liệu đầu vào. |
| W7 | 5 tài liệu kế hoạch và 13 file `.lavish-wip/specs/*.spec.json` (68 lượt) là bản ghi về việc đổi tên, không phải sản phẩm. Có viết lại chúng không? | Nếu phải viết lại thì đó là một work item riêng, không lẫn vào W7 — vì viết lại chúng làm bảng §2.3 của chính kế hoạch thành dối. | Theo câu hỏi: loại khỏi tập in-scope. |
| W8a | Ba hàng N18/N19/N20 có cần một người duyệt riêng, hay theo tiền lệ đã đặt ở W7? | Đây là câu hỏi về quy trình chứ không phải kỹ thuật: §2.3 nói bảng phải do người không viết nó duyệt, và người duyệt W7 chưa chắc là người duyệt W8a. | Chưa có mặc định — cần bạn quyết. *(Cùng một quyết định về người duyệt với W8b ở tầng 1; trả lời W8b trước rồi câu này tự nhiên có đáp án.)* |
| W8a | `KEY_NAME` ở `zai.ts:25` có thật sự cần giữ, hay Z.AI chấp nhận tên mới? | Comment ở `:24` cho thấy ý định là "khoá của riêng OMP, không đụng `zcode-api-key`". Đổi tên sẽ tạo ra một khoá thứ hai trong tài khoản thay vì tái dùng khoá cũ. Không gì trong repo trả lời được. | Chưa có mặc định — cần bạn quyết. |
| W8a | `EXA_MCP_SOURCE` ở `exa.ts:26` có được Exa dùng cho billing/attribution thật không, hay chỉ là header chẩn đoán? | Nó đúng cùng loại với N9 (`APP_URL`/`USER_AGENT` — thứ kế hoạch đã chốt "giữ nếu chưa có domain mới"), nên giữ là lựa chọn an toàn. | Theo câu hỏi: giữ. |
| W8b | Ba trong năm literal `APP_NAME` nhân bản là hàng 17 của §2.2 và thuộc W1, nhưng chúng nằm trong tập 599 của W8b: `init-xdg.ts:5` và `desktop-notify.ts:29` khai báo `const APP_NAME = "omp"` cục bộ, `terminal-capabilities.ts:45` khai `CMUX_NOTIFICATION_TITLE = "omp"`. Ai sở hữu? | Nếu W8b chỉ đổi hằng số trung tâm thì ba chỗ này vẫn hiện tên cũ; nếu W8b đánh `rename` thì trùng sở hữu với W1 và cùng một dòng bị sửa hai lần. | Theo câu hỏi: W8b đánh `rename` và sửa luôn, vì nó đã nằm trong tập — nhưng phải ghi rõ trong PR để không tính trùng. |
| W8b | Cột `hits` cho 562 file "thuần hiển thị" nhiều khả năng là 1, nhưng không phải luôn — suy ra từ `grep -c` sẽ sai ở file trộn nhiều loại token. `update-cli.test.ts` có 58 dòng chứa token và 25 literal `"omp"`, trong đó có cả `path.join(dir, ".local", "bin", "omp")` lẫn `parseReportedVersion("omp/18.0.6-canary.1")`. | Cổng Gate 0 kiểm `hits` khớp `git grep -o`, nên một cột đếm bằng mẫu làm Gate 0 đỏ ngay từ đầu — hoặc tệ hơn, làm nó xanh với một con số sai. Đây là lý do effort là L chứ không phải M. | Theo câu hỏi: mở từng file và tách, không được suy ra `hits` từ `grep -c`. |
| W8b | W8b và W9 cùng chạm 11 file. W8b gán chúng là `keep-worker-selector` với `keep_refs=W9`, còn W9 sẽ đổi tên selector. Đưa W9 vào `depends_on` của W8b, hay giữ thứ tự wave 3 → wave 4 và chấp nhận một lần rà lại bảng? | Nếu W9 chạy trước khi bảng W8b được duyệt, bảng mô tả một thế giới không còn tồn tại và `--stage=post` đỏ. | Chưa có mặc định — cần bạn quyết. Kế hoạch viết "bảng quyết định phải được rà lại sau W9", nghe nghiêng phương án thứ hai, nhưng câu hỏi ghi rõ điều đó không rõ ràng. |
| W8b | Có nên tách 599 file thành ba nhóm effort (422 coding-agent, 59 ai, 47 tui, 71 gói khác; 318 file chỉ từ 2 lượt trở lại) thay vì một mục không? | Nếu tách, bảng quyết định bị chia và cổng phải đọc nhiều tệp — mà bảng một tệp chính là thứ giữ cho detector W8b/W11 đọc được. | Theo câu hỏi: kế hoạch đã cân nhắc và chọn một mục — giữ nguyên một mục. |
| W9 | Marker `# >>> omp profile alias:` và tên file `omp-profiles.fish`: đóng băng hay đổi? | Đây là đánh đổi giữa "sạch tên" và "tương thích cài đặt đang tồn tại", mà §1.1 đặt tương thích là ràng buộc tuyệt đối. Đổi thì block cũ trong rc của người dùng không còn được nhận diện, và `upsertBlock` sẽ append trùng. | Chưa có mặc định — cần bạn quyết. |
| W9 | `omp-stats` có thuộc W9 không? `packages/stats/package.json:27` khai báo `"bin": { "omp-stats": "./src/index.ts" }` — tên lệnh thứ TƯ được cài vào PATH, và kế hoạch không nhắm tới. | Tên bin không phải basename: N17 giữ basename gói `@oh-my-pi/omp-stats`, nhưng đây là lệnh người dùng gõ, và `update-cli.ts` phân loại cài đặt dựa trên tên. Nếu đổi, nó là một work item riêng. | Chưa có mặc định — cần bạn quyết. |
| W9 | `omp.ida.<id>` ở `docs/tools/ida.md:14` là tên daemon/socket — wire hay display? | Không nằm trong danh sách N4 của §2.3, nhưng là danh tính runtime mà client ngoài có thể thấy. Nếu là wire thì phải vào danh sách loại trừ; W9 chỉ sửa phần `__omp_worker_ida_host` cạnh nó. | Chưa có mặc định — cần bạn quyết. |
| W9 | Có thêm smoke cho `tab` và `js_eval_process` không? Đây là 2 trong 16 selector không có lời gọi `smokeTest*` nào ở `cli.ts:151-179`. | Thêm smoke là một worker module graph mới, tức là bước ngoài W9. Không thêm thì cổng TẦNG 4 phải báo cáo trung thực 13/16 trên darwin (thiếu `stats_sync`, `tab`, `js_eval_process`) và 14/16 trên Linux. | Chưa có mặc định — cần bạn quyết. Cổng TẦNG 4 của W9 chỉ ghi nhận mức phủ hiện tại, không nói có thêm hay không. |
| W9 | Ba token sentinel trong test có đổi theo cho nhất quán không? (`__omp_worker_test` 8 lượt, `__omp_worker_does_not_exist` 2 lượt, `__omp_worker_core_gate` 30 lượt.) | Nếu W9 chạy `sed` toàn repo trên `__omp_worker_` thì cả ba bị đổi ngoài ý muốn, tạo diff nhiễu và rủi ro riêng. | Theo câu hỏi: giữ nguyên cả ba — argv tùy ý, selector cố ý sai, và tên thuộc tính `globalThis` không liên quan worker host. |
| W10 | `nix/home-manager.nix:14` đặt `options.programs.omp` — tên option home-manager mà người dùng viết trong `home.nix` của họ. Giữ hay đổi? | Đổi nó phá mọi config home-manager hiện hữu, cùng loại với `.omp` cấp project mà W6a đã quyết định giữ. Câu hỏi ghi rõ cần quyết định trước khi sửa `nix/`. | Theo câu hỏi: giữ `programs.omp` nguyên vẹn, thêm vào `do_not_rename` với lý do "tên option là config người dùng viết tay, không phải trạng thái máy". Nếu tổ chức muốn đổi thì phải có alias option mới → option cũ trước. |
| W10 | `scripts/ci-update-brew-formula.ts:15` `HOMEPAGE = "https://omp.sh"` — domain thứ BA đóng attribution (hai cái kia là `APP_URL` ở `dirs.ts:24` và `USER_AGENT` ở `dirs.ts:36`, đã nằm trong N9). Đã có domain mới thật sự resolve chưa? | Formula trỏ host chết thì `brew install` vẫn chạy nhưng attribution hỏng — một thất bại mà không cổng nào bắt được. Câu này và W13p (`pyproject.toml:26`) là hai mặt của cùng một câu hỏi "đã có domain mới chưa". | Theo câu hỏi: nếu chưa có domain mới resolve được thì giữ `https://omp.sh` và ghi vào danh sách loại trừ. |
| W10 | `README.md:40` (`curl -fsSL https://omp.sh/install \| sh`) và `:85` (`irm https://omp.sh/install.ps1 \| iex`) phụ thuộc domain. Ai đổi, khi nào? | Nếu domain đổi, các lệnh cài này phải đổi cùng một lần phát hành. Tài liệu thuộc W13, còn W10 sửa `scripts/install.sh` — hai bên phải thống nhất tên. | Chưa có mặc định — cần bạn quyết. |
| W10 | `ci.yml:34` `branches: [main, omp2]` và comment `:578`. Đã kiểm tra: **không** có nhánh `omp2` nào trên `origin` (chỉ `main` và `milestone-1`). Giữ hay xoá? | Đây là bộ lọc trigger; đổi nó ảnh hưởng ai được chạy CI. Có thể là filter chết, hoặc nhánh chỉ tồn tại trên fork gốc. | Theo câu hỏi: không tự ý xoá — giữ `omp2` và hỏi người bảo trì. |
| W10 | `Cargo.toml:30` `homepage = "https://omp.sh/"` và `:31` `repository = "https://github.com/can1357/oh-my-pi"` — metadata phân phối crate, nằm ngoài danh sách file của kế hoạch. Thuộc W10 hay để W13? | Câu hỏi nhấn mạnh `repository` trỏ org khác hẳn (`can1357` so với `ultrabuilders`) — đây có thể là quyết định có chủ ý đã có sẵn, đừng đổi bừa. | Chưa có mặc định — cần bạn quyết. |
| W11 | `packages/coding-agent/test/fixtures/before-compaction.jsonl` (2.3 MB) không được tham chiếu ở bất kỳ đâu — `git grep -rn 'before-compaction'` không trả về gì. Giữ đóng băng hay xoá? | Xoá là việc ngoài phạm vi W11 và cần quyết định riêng; giữ thì nó là một file 2.3 MB mang tên cũ mà mọi lần quét token đều phải phân loại. Lưu ý nó cùng một file mà W7 hỏi ở tầng 2, ở góc nhìn khác: W7 hỏi có sửa scope bên trong nó không, W11 hỏi có xoá cả file không. | Theo câu hỏi: giữ đóng băng, vì nó là transcript lịch sử. |
| W12 | Block manifest `omp` được soạn ở đâu — trong `packages/coding-agent/package.json` của repo, hay tiêm theo từng lần phát hành? | Hai kiểu hỏng khác nhau và kế hoạch cố ý đẩy ra chứ không quyết. Soạn trong repo nghĩa là mọi lần publish thư mục đó đều mang rename pointer, kể cả gói tên mới. | Chưa có mặc định — cần bạn quyết, và ghi vào commit message ở bước 4. |
| W12 | Đường rename được kiểm chứng end-to-end với manifest đã publish thật bằng cách nào, và ai có quyền registry? | Một test dựa trên fixture chứng minh parser, không chứng minh bản phát hành. Kế hoạch đòi kiểm tra thật và không đưa cơ chế lẫn người chịu trách nhiệm. Đây là hạng mục không thể chạy trong repo này, nên phải báo là BLOCKED chứ không phải PASS. | Chưa có mặc định — cần bạn quyết. |
| W12 | Stub có ship một binary shim `omp` thật, hay install-matrix học tên lệnh mới? `run-ci.sh:94,103` hiện đòi artifact `dist/omp`. | Chừa quyết thì không mục nào ký được: W12 cần một quyết định hoặc một bàn giao tường minh sang W10. | Chưa có mặc định — cần bạn quyết. |
| W13 | URL `github.com/can1357/oh-my-pi` có được đổi không? 24 lượt trên 13 file `.md` và 54 file `.ts`; bảng loại trừ N1–N17 **không** có hàng nào phủ nó, và không work item nào sở hữu. | GitHub giữ redirect nên URL cũ không gãy — nghĩa là đây là việc không gãy, và cũng chính vì thế dễ bị bỏ sót vĩnh viễn. | Chưa có mặc định — cần bạn quyết. Nếu không đổi, cần một hàng mới trong danh sách loại trừ kèm lý do; nếu đổi, W13 cập nhật 13 file `.md` và phần `.ts` phải có chủ sở hữu riêng. |
| W13 | Ai sửa `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51`? | Câu hỏi sở hữu kép ở `risk` #1. Hai dòng này được W8a ghi điều kiện phụ thuộc M2, còn W13 thì không. | Theo câu hỏi: W8a. *(Cùng vùng câu hỏi với W8a ở tầng 3 về việc viết tài liệu thuộc phạm vi ai, nhưng câu này chỉ định hai file cụ thể nên vẫn là quyết định riêng.)* |
| W13p | Tên phân phối `robomp` có được đổi không? Bảng open-questions của kế hoạch chỉ hỏi về `omp-rpc` và không nói gì tới `robomp`. | Cùng lớp quyết định với `omp-rpc` — một tên PyPI đã publish, đổi là phá mọi cài đặt hiện có. Nhưng `robomp` còn mã hoá thương hiệu cũ ("robo" + "omp") theo cách `omp-rpc` không có. | Theo câu hỏi: giữ, và câu hỏi này thực ra **chưa từng được hỏi** chứ chưa được trả lời. |
| W13p | Khi W6 lật `CONFIG_DIR_NAME`, staged agent home của robomp có cần migrate không? `worker.py:145,168,209` và `entrypoint.sh:60,61,65,66,77-81` quản lý `/srv/agent-home/.omp`. | Nếu `config migrate` (W5) đã chạy trên volume của container, staged home thành cũ và robomp sẽ đổ đầy vào một root không ai đọc. Không ai sở hữu bàn giao này. | Theo câu hỏi: giữ nguyên hiện trạng và nêu lại ở W6 — reader hai root của W4 làm cho cách hiện tại đúng trong suốt giai đoạn chuyển tiếp, và sửa sớm là không an toàn. |

**Tầng 3 — về sau, review và môi trường (12 câu).** Không câu nào chặn việc bắt đầu; chúng trả lời sau, và phần lớn nên được xử lý trong lúc review thay vì lúc lập kế hoạch.

| Work item | Câu hỏi | Vì sao nó chặn | Mặc định nếu không trả lời |
| --- | --- | --- | --- |
| W4 | `docs/environment-variables.md` tài liệu hoá 100 biến môi trường. W4 thêm một hàng và sửa một hàng. 149 tên còn lại trong họ `PI_*`/`OMP_*` có được alias mới ở một wave sau không, hay một alias đã đủ làm bằng chứng cho mẫu? | W4 và W13 cùng sửa một file: W13 sẽ viết lại ~100 dòng trên 11 bảng để thêm cột tương thích. Nếu W4 chỉ thêm đúng một alias rồi wave sau lại chốt alias cho cả họ, toàn bộ cột đó phải làm lại. | Chưa có mặc định — cần bạn quyết. |
| W5 | W5 có kèm mục changelog không? `config migrate` là một lệnh người dùng thấy được. | Nếu không có, changelog của M5 sẽ không có dấu vết của một lệnh người dùng thấy được. | Theo câu hỏi: không có mục changelog, và cần bạn xác nhận đó là chủ ý. |
| W6a | Có cấp phát môi trường kiểm chứng một lần (ninja + addon native) để toàn bộ bộ negative-control chạy được, không? | Chặn này đã tốn mọi work item trong milestone một ngoại lệ; một addon chạy được sẽ khiến những tín hiệu mạnh nhất thực sự bắn. | Theo câu hỏi: cấp phát một lần thay vì để mỗi đặc tả tự khai cái cổng nào không chạy được cục bộ. |
| W8a | Phần tài liệu ở bước 10 thuộc phạm vi M5, hay chuyển sang W11? Cả hai file đó không chứa literal dạng trần. | Việc duy nhất còn lại là sửa câu chữ — đó là việc nhỏ, và nó phụ thuộc M2 đã merge trong khi 13 quyết định còn lại thì không. | Chưa có mặc định — cần bạn quyết. |
| W10 | W10 có cần một hàng changelog không? | `AGENTS.md` nói changelog chỉ cập nhật khi được yêu cầu, và hướng dẫn M5 nói rõ đừng tự thêm. W10 là hạ tầng, người dùng không thấy gì. | Theo câu hỏi: không có hàng changelog cho W10. Nếu release-notes sinh từ commit thì không cần. |
| W11 | Detector `scripts/ci-rename-test-literals.ts` được phép là một script grep trong CI, hay phải là một `bun test`? | `AGENTS.md` cấm source-grep *bên trong* test; nó không cấm detector CI, và DoD của chính kế hoạch là grep-based với `disposition.tsv` làm nơi CI đọc. Đây là ranh giới diễn giải. | Theo câu hỏi: được phép, nhưng phải nói thẳng ranh giới đó trong PR chứ không giấu. |
| W11 | 5 file test có `.omp` nằm ngoài `packages/coding-agent` (tui 2, ai 1, utils 1) — có file nào thực sự là contract đáng giữ, ví dụ `tui/test/render-utils.test.ts` khẳng định chuỗi hiển thị được sanitize đúng? | Mới phân loại qua mẫu, chưa đọc hết 61 file; nếu bỏ sót một contract thì test đó sẽ hỏng sau W6 theo cách không ai hiểu. | Chưa có mặc định — cần bạn quyết. |
| W13 | 9 file `.md` dưới `.omp/` cộng `internal-urls/omp.md` có được tính vào "tài liệu" không? | Nếu tính thì tổng bề mặt là 103 chứ không phải 93, và cần người chịu trách nhiệm riêng cho chúng — không phải W13. | Theo câu hỏi: không tính, và đã loại khỏi allow-list ở bước 2. |
| W13 | `scripts/rename/check-docs-rename.ts` sẽ được nối vào job CI nào? Repo có `check:tools` nhưng đó là lint, không phải gate nội dung. | Nếu không biết job nào gọi nó, gate chỉ chạy khi ai đó nhớ chạy tay — tức là gate hữu ích nhưng không ép ai. | Chưa có mặc định — cần bạn quyết. |
| W13 | Cột `New name` trong `docs/environment-variables.md` phản ánh cơ chế mirror `OMP_*` → `PI_*` (đã có), hay chỉ ánh xạ `ULTRAWORKERS_CONFIG_DIR`? | Nếu cột ghi cả quan hệ thắng/thua thì phải quyết định rõ cái gì thắng cái gì cho **từng** biến — đó là câu hỏi lớn hơn W13. | Theo câu hỏi: cột chỉ ghi TÊN, và sửa dòng 29 để giải thích cơ chế mirror. |
| W13p | Domain mới là gì, và `python/omp-rpc/pyproject.toml:26` (`Homepage = "https://omp.sh/"`) có đi theo không? | Giá trị đó trùng `APP_URL` ở `dirs.ts:24`, vốn bị đóng băng cho tới khi có domain mới thực sự phân giải được. Nếu N9 chưa chốt, đổi theo phỏng đoán là sai. | Theo câu hỏi: để nguyên và ghi lý do. *(Cùng câu hỏi nền với W10 ở tầng 2 về `HOMEPAGE` trong công thức brew — cả hai phụ thuộc một câu trả lời duy nhất: đã có domain mới chưa.)* |
| W13p | `pyproject.toml:27,28` (`Repository` và `Documentation`, cùng là `https://github.com/can1357/oh-my-pi`) có thuộc milestone nào không? | Chúng mang tên org cũ nhưng **vô hình** với `git grep -n 'omp'`, vì chuỗi `oh-my-pi` không chứa substring `omp`. W7 nhắm `@oh-my-pi/` có dấu gạch chéo cuối nên không khớp; W8a xử lý dạng trần trong TypeScript. URL trong manifest Python hiện không thuộc sở hữu của ai. | Theo câu hỏi: để nguyên, và đừng để một pass nào của W7 vô tình chạm tới. *(Cùng quyết định nền với W13 ở tầng 2 về việc có đổi tên repo GitHub hay không, nhưng rơi ngoài tập file của W13 nên cần một câu riêng.)* |


---


## Đính chính so với plan tổng

| Work item | Claim của plan | Verdict | Đính chính |
| --- | --- | --- | --- |
| W1-1 | `packages/catalog/src/wire/codex.ts:52` là điểm neo chỉ-đọc, và tập wire đúng bằng năm vị trí cộng file này. | PARTLY WRONG — file thật sự chỉ-đọc, nhưng nguồn upstream của nó thì không, và cách plan diễn đạt che mất một rủi ro đang sống. | Neo là thật: `ORIGINATOR_CODEX: "omp"` ở dòng 52, đã xác nhận, và nó nuôi `OPENAI_HEADERS.ORIGINATOR` ở 8 call site trải trên packages/ai, packages/agent, packages/catalog, packages/coding-agent. Nhưng nó không phải literal viết tay — nó biên dịch từ `packages/catalog/src/compat/rules/auth/openai-codex.kdl:12` (`originator "omp"`). AGENTS.md cấm sửa tay `rules.json` đã biên dịch, nên cách duy nhất để đổi giá trị này là sửa KDL. Hệ quả: lượt quét `git grep -o '@oh-my-pi/'` của W7 không chạm tới nó (không có dấu `/`), lượt quét display-token của W8b thì có thể, và một lần `bun run gen:compat` sau một sửa KDL không liên quan có thể làm originator dịch chuyển mà không hề có diff TypeScript. Mục này nên coi `codex.ts:52` là chỉ-đọc đúng như đã dặn, nhưng người phụ trách milestone phải biết giá trị đó không bị mục này đóng băng, và cũng không có test nào bắt được một thay đổi ở tầng KDL. |
| W1-2 | Tập wire gồm năm vị trí; rủi ro plan nêu là kỹ sư sẽ thêm "một vị trí thứ sáu không có trong danh sách". | WRONG IN PREMISE — có ít nhất sáu giá trị `"omp"` trần nữa mà là wire chứ không phải hiển thị. Cảnh báo rủi ro của plan trỏ nhầm chỗ: nguy hiểm thật không phải kỹ sư thêm vị trí thứ sáu, mà là milestone lên sóng mang theo một bản đồ wire thiếu và một lượt quét cơ học sau đó đổi tên những giá trị không ai kiểm kê. | Đã xác minh các giá trị wire bổ sung không nằm trong tập của plan: (a) `packages/catalog/src/compat/rules/auth/stencil.kdl:13` `client-id "omp"` — oauth client id được code định nghĩa tại issuer Stencil theo chính comment của file; đổi tên là hỏng đăng nhập Stencil; nó là KDL nên không thể thay bằng một hằng số TS. (b) `packages/catalog/src/compat/rules/auth/openai-codex.kdl:12` (xem W1-1). (c) `packages/coding-agent/src/cli/git-tui/avatar.ts:50` `"User-Agent": "omp"` khi gọi api.github.com. (d) `packages/coding-agent/src/tools/report-tool-issue.ts:441` `agent: { name: "omp", version: VERSION }` trong JSON body POST tới grievance endpoint. (e) `packages/coding-agent/src/internal-urls/omp-protocol.ts:28` `readonly scheme = "omp"` — scheme URL `omp://`, xuất hiện trong URL người dùng tự gõ và trong session đã lưu. (f) `packages/coding-agent/src/hindsight/settings.ts:172` `default: "omp"` cho `cfgHindsightRetainContext`, cùng danh tính bank với `bank.ts:29` nhưng đi qua đường thứ hai. Phần này giữ W1 ở con số năm của plan (plan cấm tự ý mở rộng), nhưng ghi lại cả sáu như một việc leo thang tường minh, vì kết quả đúng là một con người giao việc phân xử, chứ không phải một kỹ sư tự bò ra. |
| W1-3 | Test cần viết: "mỗi vị trí một test, dựng giá trị gửi đi và assert nó bằng hằng số đã cấu hình chứ không phải bằng literal". | BACKWARDS — làm đúng chỉ dẫn này theo nghĩa đen sẽ phá hủy chính cơ chế an toàn mà nó sinh ra để bảo vệ. | Nếu một test assert `emitted === WIRE_NAME`, thì đặt `WIRE_NAME = "ultraworkers"` làm mọi test kiểu đó vẫn xanh trong khi cả năm tích hợp đã hỏng. Hằng số là thứ đang được đổi tên; literal mới là hợp đồng. Các assert golden-literal đã có sẵn trong cây đúng là thiết kế đúng và phải giữ nguyên từng chữ: `warp-events.test.ts:111` ghim `agent: "omp"` bên trong một `JSON.stringify` chính xác của toàn bộ OSC body, `acp-initialize-conformance.test.ts:237` ghim `title: "omp"`, `blob-uploaders-self-hosted-legacy.test.ts:342` ghim `form.get("z") === "omp"`, và `hindsight-bank.test.ts` ghim các id dẫn xuất `"omp"`/`"omp-proj"`/`"omp-unknown"`/`"omp-general"`. Cách chia đúng là hai chiều, còn plan đã gộp làm một: các test SẴN CÓ giữ literal (chúng bảo vệ byte trên wire), và test MỚI duy nhất ghim rằng hằng số dùng chung vẫn còn bằng đúng literal đó (nó bảo vệ việc các vị trí thật sự đọc hằng số). Nếu test mới cũng so với hằng số thì khả năng phát hiện đổi tên sẽ bay mất. |
| W1-4 | Các file test đã assert những giá trị này là `warp-events.test.ts` và `acp-agent.test.ts`. | UNDERCOUNTED — có bốn file golden, không phải hai, và một trong hai file bị nêu là file sai. | `packages/coding-agent/test/acp-agent.test.ts` KHÔNG assert các giá trị wire của agentInfo (`grep -n 'agentInfo\|oh-my-pi'` không trả hit agentInfo nào trong đó — nó import từ acp-agent nhưng test hành vi khác). File thật sự ghim `agentInfo.name` và `agentInfo.title` là `packages/coding-agent/test/acp-initialize-conformance.test.ts:233-238`. Và plan bỏ sót hẳn hai file golden: `packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts:342` (puush `z`) và `packages/coding-agent/test/hindsight-bank.test.ts` (năm bank id dẫn xuất). Đây là tin tốt cho W1 — bốn trong năm vị trí đã được ghim từng byte, nên tiêu chí nghiệm thu "không đổi gì người dùng thấy" của mục được cưỡng chế bằng cơ chế sẵn có — nhưng kỹ sư làm theo plan sẽ đi tìm coverage trong một file không chứa nó. |
| W1-5 | Môi trường chặn hoàn toàn `bun test` (0 pass, "Failed to load pi_natives native addon for darwin-arm64"), nên kiểm bằng `bun run check:ts` và coi `bun test` là bị chặn. | TOO BROAD — chặn là theo đồ thị import từng file, không phải toàn cục, và phân biệt này quyết định test mới của W1 đặt ở đâu. | `bun test` chỉ bị chặn với những file test mà đồ thị import của chúng đi tới `@oh-my-pi/pi-natives`. Đã chạy hai file để dựng lại ranh giới: `bun test packages/utils/test/dirs.test.ts` → `6 pass 0 fail`, trong khi `bun test packages/coding-agent/test/modes/warp-events.test.ts` → `0 pass 1 fail` với `Cannot find module .../packages/natives/native/pi_natives.darwin-arm64.node`. Hệ quả với W1: test mới phải đặt ở `packages/utils/test/`, không phải `packages/coding-agent/test/`, nếu không thì test duy nhất mà mục này thêm vào lại không chạy được ngay hôm nay. Bốn golden sẵn có bên coding-agent thì vẫn bị chặn cục bộ và chạy ở CI. Đây là mục đầu tiên trong tài liệu nói về tiền đề "bun test bị chặn"; các mục sau có lặp lại cùng tiền đề đó thì đã trỏ về đây. |
| W1-6 | Effort S, khoảng 10 dòng; hai file test cần đụng tới. | NEARLY RIGHT — cấp S là đúng, nhưng số dòng bỏ sót file test mới và số site bỏ sót golden thứ năm. | Cùng loại với W1-4: bảng kiểm kê test của W1 đếm thiếu ở cả hai chiều, nên ở đây chỉ nêu phần việc mới. Phần sửa mã nguồn thật sự rất nhỏ: một dòng thêm trong `dirs.ts` cộng năm chỉnh sửa tổng cộng khoảng sáu dòng. Mục này còn thêm một file test mới khoảng 15 dòng và sửa **không** file test sẵn có nào (by design — xem W1-3). Tổng cộng khoảng 40 dòng trên 7 đường dẫn. Lỗi thật của plan không phải effort mà là bảng kiểm kê file test, vốn đánh giá thấp cả coverage sẵn có (nêu 2, thật là 4) lẫn việc mới (không nêu file nào là mới). |
| W1-7 | Repo đang ở git HEAD 5873776 trên nhánh milestone-1. | STALE — HEAD là 808b365. | `git rev-parse HEAD` trả `808b409fa36719c38319a041c0e612b4e702b` (`docs(plan): fold the spec-verified M1 execution plan into the upgrade plan`), trên nhánh `milestone-1`, chỉ có `.lavish-wip/m2-specs/` là untracked. Cả sáu neo nguồn của W1 đã được kiểm lại trên HEAD này và cả sáu đều chính xác, nên SHA cũ không làm mất hiệu lực đặc tả — nhưng kỹ sư nào checkout 5873776 sẽ không thấy các commit execution-plan của milestone-1 và có thể bối rối về mốc nền của sóng 1. Đây là loại lỗi "mốc đo không tồn tại" đã lặp lại ở W2-6, W7-2 và W8b-2. |
| W1-8 | `acp-agent.ts:656` (`name: "oh-my-pi"`) nên được đưa vào tập wire của W1 hoặc được ghim bằng test — plan gọi đây là N5 và để lựa chọn mở. | RESOLVED — lựa chọn thứ hai của plan đã được thoả mãn bởi code sẵn có, còn lựa chọn thứ nhất thì sẽ sai. | Không nên đưa `"oh-my-pi"` qua `WIRE_NAME`. Đó là tên package npm có scope, khác danh tính với token trần `"omp"`, và một hằng số tên `WIRE_NAME` mà chứa một tên có scope sẽ mô tả sai bản chất hằng số — cùng lập luận mà AGENTS.md dùng khi phân biệt danh sách basename package với danh sách scope. Phương án còn lại của plan ("assert bằng test rằng nó cố ý đứng yên") đã có sẵn: `acp-initialize-conformance.test.ts:233-238` assert `expect(response.agentInfo).toEqual(expect.objectContaining({ name: "oh-my-pi", title: "omp", version: VERSION }))`. Nghĩa là yêu cầu "đừng để nó rơi vào kẽ hở" của plan đã được thoả bằng cách để dòng 656 nguyên vẹn và để test đó làm việc của nó. Dòng 656 không cần sửa, không cần test mới; nó chỉ cần đặc tả nói rõ như vậy, và đó chính là thứ giải quyết N5. |
| **W2** | | | |
| W2-1 | W2 có thể lên sóng một mình, thành một commit riêng, TRƯỚC W7. ("Phải là một commit riêng, trước W7" — plan:8677; "Effort: S — 2 sửa chuỗi cộng một test" — plan:8681.) | SAI — W2 như một commit đơn lẻ không thể lên trước W7. | Đặt `CANONICAL_PI_SCOPE = "@ultraworkers"` trước khi 16 manifest được đổi tên là hướng canonicalizer vào một scope không tồn tại: ở chế độ dev mọi lần remap đều ném lỗi và lỗi đó bị nuốt tại :1144-1149, còn trong binary đã biên dịch thì mọi lần load extension bundle chết tại :752-754. Hãy tách: W2a (sóng 1) chỉ thêm `"ultraworkers"` vào `PI_SCOPE_ALIASES` và đúng là tự lên được một mình; W2b mới đổi `CANONICAL_PI_SCOPE` và đi cùng hoặc ngay sau W7. W2a một mình hôm nay là no-op (scope chưa tồn tại) và đã đúng ngay khoảnh khắc W7 hạ cánh, nên không commit nào trong lịch sử từng hướng canonicalizer vào một scope vắng mặt. Điều này cũng vi phạm chính yêu cầu cấu trúc của plan tại dòng 8650 rằng mỗi sóng phải lên sóng được độc lập. |
| W2-2 | "File test mới: packages/coding-agent/test/extension-scope-canonicalization.test.ts" — một file test MỚI (plan:8678). | SAI — một test tương đương đã tồn tại rồi. | `packages/coding-agent/test/pi-scope-aliases.test.ts` (135 dòng) đã tồn tại. Nó dựng một probe plugin import từng scope được alias cùng với đường dẫn tuyệt đối từ `Bun.resolveSync` và ném lỗi trừ khi hai binding đó object-identical (dòng 109-117) — đúng là assert tương đương mà plan muốn file mới làm, và nó đã phủ `@oh-my-pi` (dòng 53, 55-59) và `@mariozechner` (dòng 61-66). Hãy thêm ca `@ultraworkers` vào mảng `CASES` của nó. Tạo file mang tên như plan sẽ trùng coverage ở một tầng khác, điều AGENTS.md cấm rõ ràng, và hai bản sẽ trôi lệch nhau. |
| W2-3 | Test thứ hai của W2: "một plugin khai báo `@ultraworkers` trong `peerDependencies` vẫn phân giải được" (plan:8682). | ĐÚNG NHƯNG DỄ HIỂU LẦM — | Bộ nạp không bao giờ đọc `peerDependencies` của plugin để quyết định việc phân giải — `isBareExtensionDependencySpecifier` (:1453-1466) chỉ phân loại hình dạng của specifier, còn `resolveExtensionBareDependency` tìm trong node_modules của chính PLUGIN, mà theo cấu túc thì sẽ không chứa một peer. Nên khai báo đó là vô tác dụng, và ca này chỉ có nghĩa như một phủ định: nó chứng minh việc phân giải đến từ canonicalizer của host chứ không phải từ một peer cài cục bộ. Hãy diễn đạt nó thành một trường `peerDependencies` trong `package.json` của probe plugin trong harness sẵn có, chứ không phải một file riêng hay một đường nạp riêng. Nó phải thêm ở W2b chứ không phải W2a, vì `Bun.resolveSync('@ultraworkers/pi-utils')` không thể tạo ra cột canonical-path trước khi W7 hạ cánh. |
| W2-4 | W2 phải đứng trước W7 vì hai chuỗi scope chính là thứ mà lượt sed của W7 "không chạm tới", nên cơ chế tương thích phải có trước (plan:8781, plan:8784 "W2 (cứng)"). | ĐÚNG MỘT PHẦN — | Lập luận về cơ chế thì đúng, còn lập luận "sed sẽ phá" thì không phải ràng buộc chi phối, và trộn hai thứ lại dẫn tới thứ tự sai. Mẫu của W7 là `@oh-my-pi/` CÓ dấu `/` ở cuối; cả `"@oh-my-pi"` (:796) lẫn `"oh-my-pi"` (:802) đều không có dấu `/` ở cuối, nên sed về mặt cấu trúc không thể chạm tới dòng nào trong hai dòng đó — đúng như chính plan nói ở 8503 và 8964. Ràng buộc thật là ràng buộc PHÂN GIẢI ĐƯỢC: W2b chỉ hợp lệ khi scope `@ultraworkers` đã tồn tại, tức là sau lượt đổi manifest của W7. Phần thật sự phụ thuộc thứ tự là W2a: việc mở rộng bảng alias chính là thứ giữ cho plugin scope cũ tiếp tục canonicalize xuyên suốt lúc đổi tên của W7, và nửa đó đúng ra phải đi trước W7. Tách mục ra là để tách ràng buộc thứ tự thật khỏi thứ chỉ là vệ sinh sed. |
| W2-5 | Phần work item nói repo đang ở git HEAD 5873776. | CŨ — | HEAD là 808b365 trên nhánh `milestone-1` (`docs(plan): fold the spec-verified M1 execution plan into the upgrade plan`). Nhánh đúng; SHA thì không. Mọi neo mà phần này dẫn — :796, :802, :805, :807, :808, :837, :951-953, :1057-1069, :1077, :1144-1149, :1453-1466, :751-754 — đã được kiểm lại từng byte ở 808b365 và tất cả đều đúng như plan viết. Đừng mất thời gian đi tìm một commit tên 5873776. Cùng loại với W1-7, W7-2 và W8b-2. |
| W2-6 | `PI_PACKAGE_NAMES` (:805) giữ danh sách package mà canonicalizer phục vụ, nên thêm `ultraworkers` vào scope ngụ ý danh sách này cũng nên theo scope mới (đọc ngầm từ ngoặc ở plan:8678). | ĐÚNG NHƯ ĐÃ VIẾT, đáng ghim lại — | `PI_PACKAGE_NAMES` là danh sách BASENAME của các package do host bundle, và nó cố ý tách rời khỏi danh sách scope. Nó giữ 6 mục trong khi repo phát hành 16 package có scope, nên 10 basename đang được phát hành — `pi-catalog`, `pi-metaharness`, `pi-mnemopi`, `pi-wire`, `omp-stats`, `omptype`, `snapcompact`, `browser-relay`, `collab-web`, `typescript-edit-benchmark` — chưa từng khớp `LEGACY_PI_SPECIFIER_FILTER` và hiện không được canonicalize. W2 không thay đổi điều đó, và test của phần này cố ý không assert gì về chúng để quyết định vẫn nằm ở chỗ N17 đặt ra. Hãy nói điều này trong mô tả PR, vì chênh lệch 6 so với 16 đúng là thứ khiến một người review tử tế "sửa cho đủ" trong lúc review. |
| **W3** | | | |
| W3-1 | Tiêu chí nghiệm thu: "cấu hình vẫn phân giải dưới root `.omp` cũ" (config vẫn resolve về root .omp cũ). | SAI CHO NGƯỜI DÙNG XDG — đây là lỗi nghiêm trọng nhất của đặc tả W3. | APP_NAME cũng là đoạn segment cuối cùng của app root theo XDG (dirs.ts:360: `const appRoot = path.join(value, APP_NAME)`), nên đổi APP_NAME dời `$XDG_DATA_HOME/omp`, `$XDG_STATE_HOME/omp`, `$XDG_CACHE_HOME/omp`. Đây cùng loại hazard di chuyển dữ liệu mà W6 sinh ra và có cổng chặn. Phải chốt `open_questions[0]` TRƯỚC khi viết code; nếu chọn phương án (b) thì W3 mới thực sự chỉ đổi tên hiển thị. |
| W3-2 | "Test cần viết" — test bảo vệ tên file log, thực hiện bằng `setTransports({file: <tmp>})` rồi đọc `readdirSync`. | ĐÃ TỒN TẠI SẴN VÀ TỐT HƠN HẲN ĐỀ XUẤT CỦA PLAN — không cần viết mới. | `packages/utils/test/logger-contract.test.ts` đã ghim đúng hợp đồng này bằng child-process spawn (tách singleton, an toàn full-suite theo AGENTS.md). Việc của W3 là CẬP NHẬT 4 chỗ trong file đó theo APP_NAME, không phải viết test mới. Cách `setTransports()` mà plan đề xuất thì tệ hơn: nó mutate singleton toàn cục nên phải thêm `afterEach` khôi phục, đúng thứ AGENTS.md cảnh báo. |
| W3-3 | Danh sách test hiện có chỉ gồm `packages/tui/test/desktop-notify.test.ts` và `packages/tui/test/terminal-capabilities.test.ts`; lệnh nghiệm thu chỉ chạy 2 file đó. | Thiếu 2 file test vỡ, và lệnh nghiệm thu không chạy package utils nên không bắt được lỗi chính của W3. | Cùng loại với W3-4 (plan liệt kê danh sách không trọn): bổ sung `packages/utils/test/dirs.test.ts` (ghim basename log) và `packages/utils/test/composer-shape-preview.test.ts` (tương tự), rồi mở rộng lệnh verify sang `cd packages/utils && bun test test/logger-contract.test.ts test/dirs.test.ts test/stderr-guard.test.ts`. |
| W3-4 | Danh sách 7 literal trùng lặp là trọn vẹn (5 chuỗi trong 3 file + 2 tên file log). | Thiếu 2 literal nguồn. | Cùng loại với W3-3 — danh sách của plan không trọn. Thêm `packages/tui/src/overlays/composer-shape-preview.ts:45` `const PREVIEW_TITLE = "omp"` (tiêu đề dự phòng hiển thị trong setup composer — cùng package tui với 2 trong 5 literal đã liệt kê) và `packages/utils/src/dirs.ts:956` `getCrashLogPath` ghim cứng `"omp-crash.log"`, lệch với người anh em `getDebugLogPath` (:960) vốn đã dùng `${APP_NAME}-debug.log`. |
| W3-5 | Plan nêu `filenamePrefix` phải đổi nhưng không giải thích vì sao. | ĐÚNG KẾT LUẬN, THIẾU LÝ DO — bổ sung để kỹ sư không tối ưu hoá bằng cách bỏ qua nó. | Lý do cứng: `getLogPath()` (dirs.ts:620-622) ĐÃ dựng tên từ APP_NAME, và `stderr-guard.ts:105` dùng nó làm đích redirect stderr mặc định. Nếu chỉ đổi APP_NAME mà để `filenamePrefix:"omp"`, stderr sẽ bị ghi vào một file không ai đọc, còn `report-bundle.ts:208,253` (đóng gói log để báo bug) và `main.ts:285` (dòng gợi ý log cho người dùng) sẽ trỏ sang file trống. |
| W3-6 | Yêu cầu: không được dùng `ReturnType<>`, không `any`, không inline import, ES `#private`, `logger` thay `console.*`, `bun check` chứ không phải `tsc`. | ĐÃ KIỂM TRA — không có xung đột nào trong diff này. | Giữ nguyên. Lưu ý thêm một quy tắc ít ai nhớ: sau khi đổi tên, doc comment tại `dirs.ts:609` ("log files are named `omp.<day>.<pid>.log`") thành sai — nên sửa luôn trong cùng commit (đây là comment, không phải test). |
| **W4** | | | |
| W4-1 | `PI_CONFIG_DIR` có 68 lượt trên 25 file (16 file `.ts`). | CŨ — lệch một ở mỗi con số. | Trên cây hiện tại ở HEAD 84cbac9, không tính chính tài liệu kế hoạch: 69 lượt trên 26 file — 17 `.ts`, 7 `.md`, 2 `.rs`. Tái lập bằng `git grep -o 'PI_CONFIG_DIR' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \| wc -l` và cùng lệnh với `-l`. Plan đo ở commit 5873776, commit không nằm trong lịch sử repo này, nên đây là cũ chứ không phải sai phương pháp. Cùng loại với W5-10, ghi ở đó với con số khác vì đo trên phạm vi khác. |
| W4-2 | Hai file Rust đọc `PI_CONFIG_DIR` không được W4 nhắc tới, nên việc mở rộng `ULTRAWORKERS_CONFIG_DIR` chỉ là thay đổi TypeScript. | KHÔNG ĐẦY ĐỦ — có một lỗ hổng parity thật. | `crates/pi-natives/src/crash_handler.rs:269` và `crates/pi-natives/src/oauth_callback/darwin.rs:441` đều đọc thẳng biến này. Thư mục crash-log sẽ phớt lờ alias mới trên mọi nền tảng, còn đường legacy-recovery của OAuth trên macOS sẽ phớt lờ nó — một lỗi mà không lần chạy CI nào trên Linux quan sát được. W4 phải mở rộng cả hai, với tên mới thắng tên cũ và giữ nguyên các bộ lọc giá trị rỗng hiện có. |
| W4-3 | Hazard ở gốc dự án là `getProjectAgentDir()` tại dirs.ts:589-591, mà W6a xử lý như một subtask riêng. | UNDERS COPED — còn bốn site nữa, cùng hazard. | `packages/coding-agent/src/discovery/helpers.ts:1032`, `:1034`, `:1049` và `:1079` gọi `getConfigDirName()` với cwd DỰ ÁN làm thư mục cha, để dựng `<project>/plugins/installed_plugins.json`. Để chúng ở accessor của home nghĩa là một dự án đã commit `.omp` sẽ ngừng phân giải ngay khi root mới thắng. W4 là nơi tạo ra sự phân kỳ, nên W4 cũng là nơi bốn site này nên chuyển sang hằng số ghim theo dự án. Đây đúng là lỗi mà plan đã dự đoán cho XDG ("lỗi chia theo nền tảng mà một lần chạy test trên một nền tảng sẽ không bắt"), áp dụng cho một đường dẫn plan không hề nhắc tên. |
| W4-4 | Phân giải danh sách ứng viên theo thứ tự "tồn tại trước, rồi cache" — sao chép khuôn mẫu đã có ở `MAIN_CONFIG_FILENAMES` (dirs.ts:30). | KHUÔN MẪU KHÔNG CUNG CẤP CƠ CHẾ CACHE, và cache chính là nửa rủi ro. | `MAIN_CONFIG_FILENAMES` chỉ là một mảng tên file có thứ tự với vòng lặp first-hit-wins ở call site (`settings.ts:2129`, `auth-broker/discover.ts:198`) — nó không kiểm tra tồn tại lúc nạp module và không cache gì. Nên cái tái sử dụng được là thứ tự; còn cache là cơ chế MỚI mà W4 phải thiết kế. Nó phải được xóa ở cả bốn nơi module đóng băng trạng thái thư mục, nếu không tám file test gán `process.env.PI_CONFIG_DIR` lúc chạy sẽ đọc một root cũ. |
| W4-5 | Cổng nghiệm thu là `bun run check && (cd packages/utils && bun test test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts test/config-dir-write-root.test.ts)`. | CHẠY ĐƯỢC NHƯNG CẦN TIỀN TỐ ĐƯỜNG DẪN, và tiền đề môi trường đằng sau nó là sai. | Bỏ dấu `./` ở đầu mỗi đường dẫn, nếu không Bun sẽ coi đối số là bộ lọc tên chứ không phải đường dẫn. Riêng về `bun test`: trên máy này nó KHÔNG bị chặn — addon pi_natives thiếu, nhưng nó chỉ ảnh hưởng những file import nó (`logger-contract.test.ts`, `procmgr.test.ts` trong packages/utils). Bề mặt tầng dirs mà W4 cần chạy xanh. `bun run check` không giống `bun run check:ts` và nặng hơn nhiều; `check:ts` exit 0 và đó là tín hiệu nên dùng. |
| W4-6 | Neo dòng: thân `getInstallId` nằm "ngay dưới :1090"; khối comment về orphan-profile ở :341-352. | SUÝT — cả hai rơi vào đúng vùng nhưng không trúng chỗ. | `getInstallId` được khai báo ở :1104 (doc comment của nó mở đầu ở :1092), nên :1090 sớm 14 dòng. Khối comment orphan-profile chạy từ :340-355 với chữ "orphaning" ở :348, nên khoảng plan nêu cắt mất phần đầu. Mọi neo W4 còn lại trong plan đều xác minh chính xác tuyệt đối: :27, :30, :114-116, :297-298, :302-305, :360, :384, :589-591, :1076, :1083-1086. |
| **W5** | | | |
| W5-1 | "Bỏ sót `VALID_ACTIONS` thì … `parseConfigArgs` tại `config-cli.ts:82` in `Unknown config command: migrate` rồi `process.exit(1)` — lỗi chỉ xuất hiện khi người dùng gõ lệnh." Đây là lý do plan nêu để sửa cả bốn site action-list, và là lý do plan bảo người review đếm bốn dòng. | SAI — hàm là code chết, không có caller nào; kiểu lỗi đó không thể xảy ra. | `parseConfigArgs` được định nghĩa ở `config-cli.ts:72` và được export, nhưng không gì trong repo từng gọi nó. Đường phân phối thật sự ra lệnh cho người dùng là class ocelot `Command` trong `packages/coding-agent/src/commands/config.ts`, được đăng ký ở `packages/coding-agent/src/cli-commands.ts:98` (`{ name: "config", load: () => import("./commands/config").then(m => m.default) }`). Nên bỏ sót `VALID_ACTIONS` không sinh ra lỗi người dùng thấy được nào cả. Chỉ dẫn sửa nó vẫn đúng về tính nhất quán — một parser chết âm thầm từ chối `migrate` là cái bẫy cho người sau này hồi sinh nó — nhưng kiểu lỗi plan nêu không có thật, và người review đi tìm thông điệp đó sẽ không thấy. |
| W5-2 | Kiểu lỗi plan nêu cho một mục `ACTIONS` bị bỏ sót là thông điệp `Unknown config command: migrate` từ `config-cli.ts:83`. | SAI TẦNG — lỗi thật đến từ framework, với thông điệp khác. | Cùng loại với W5-1 (plan mô tả sai cơ chế, và mô tả sai ở tầng này thì càng xa người thật). `ACTIONS` được truyền vào dưới dạng `options: ACTIONS` cho `Args.string(...)` ở `config.ts:18`. Việc kiểm tra nằm ở tầng ocelot tại `packages/utils/src/cli.ts:278-283`, ném `CliUsageError` với nội dung `Expected action to be one of: list, get, set, reset, path, init-xdg; got "migrate"`. Nên site đúng (mảng đúng là phải cập nhật) nhưng cơ chế và thông điệp đều khác plan mô tả. Kỹ sư gỡ lỗi dựa theo thông điệp của plan sẽ đi tìm một chuỗi mà chương trình không bao giờ in ra. |
| W5-3 | Danh sách rủi ro của plan nêu bốn cách làm sai. Nó không nêu cách duy nhất hỏng trong im lặng. | KHÔNG ĐẦY ĐỦ — nguy hiểm nhất là một no-op im lặng, và plan bỏ sót. | Bỏ sót nhánh `case "migrate"` trong `switch (cmd.action)` tại `config-cli.ts:166` còn tệ hơn mọi thứ trong danh sách của plan. Với union và `ACTIONS` đã cập nhật, `omp config migrate` parse thành công, `runConfigCommand` không khớp case nào, và hàm return mà không làm gì: **exit 0, không output, không lỗi**. Người dùng kết luận dữ liệu của mình đã chuyển; nó đã không. Không có kiểm tra exhaustiveness nào bắt được — TypeScript không bắt buộc một switch trên union phải đủ case trừ khi có cờ liên quan của `strict` hoặc một guard tường minh, tsconfig của repo không đặt `noImplicitReturns`, và `.oxlintrc.json` không có luật switch-exhaustiveness nào. Điều này đáng có một test và một bước review mà plan hiện chưa yêu cầu. |
| W5-4 | "Cả bốn đều là `["list", "get", "set", "reset", "path", "init-xdg"]` — bốn bản sao của cùng một danh sách." Bốn bản sao. | KHÔNG ĐẦY ĐỦ — có bản sao thứ năm, và nó cũng là code chết. | `printConfigHelp()` tại `config-cli.ts:405` chứa bản dựng thứ năm của cùng danh sách, trong khối Commands, kết thúc ở dòng 414 bằng `  init-xdg           Initialize XDG Base Directory structure`. Nó cũng không có caller. Nên số bản sao còn sống đúng là bốn, nhưng người review đếm chuỗi `init-xdg` trên hai file sẽ thấy năm lần và có thể hoặc bỏ sót một cái, hoặc thêm một cái thừa. Phần help hiện không tới được (oclot tự dựng help từ `static args`, và `commandHelp.configHelp` tại `command-help.ts:51` chỉ là một chuỗi mô tả), nên cập nhật nó là để tính nhất quán và cho ngày ai đó hồi sinh nó — hãy nói thẳng như vậy thay vì tính nó là mang tải. |
| W5-5 | Plan bảo kỹ sư đọc `packages/utils/src/dirs.ts:1076, 341-352, 360, 384`, và ở chỗ khác dẫn comment `DirResolver` tại `dirs.ts:341-352` làm bản ghi của một lỗi orphan-profile thật. | GẦN ĐÚNG — ba trong bốn tham chiếu dòng chính xác; khoảng comment lệch một ở cả hai đầu. | `1076`, `360` và `384` đúng tuyệt đối: dòng 1076 là `const INSTALL_ID_FILE = "install-id";`, dòng 360 là `const appRoot = path.join(value, APP_NAME);`, dòng 384 là `// XDG flattens the agent/ prefix: ~/.omp/agent/sessions → $XDG_DATA_HOME/omp/sessions`. Comment về orphan-profile nằm ở **340-351**, không phải 341-352 — dòng 352 là dòng code đầu tiên sau nó (`let xdgData: string \| undefined;`). Phần nội dung thì đúng và quan trọng: comment ghi lại việc một profile có tên có thể phân giải về `~/.omp/profiles/<name>` ở lần kích hoạt đầu và lặng lẽ chuyển sang `$XDG_*_HOME/omp/profiles/<name>` ngay khi thư mục gốc xuất hiện, làm trạng thái trước đó bị bỏ rơi. |
| W5-6 | "di chuyển … và xử lý riêng layout profile có tên … Sai lầm thứ hai: di chuyển cây mà không xử lý riêng layout profile có tên, làm mất trạng thái profile". Profile có tên được trình bày như một layout riêng cần xử lý tách biệt. | NÓI QUÁ — profile lồng nhau chứ không phải layout riêng; hazard thật hẹp hơn và khác đi. | Một profile có tên không phải layout riêng. `getProfileConfigRoot()` trả `path.join(getBaseConfigRoot(), "profiles", profile)`, nên mọi profile có tên đều nằm BÊN TRONG root gốc và một lần di chuyển root đệ quy đã tự mang theo nó. Không có root profile riêng nào để xử lý. Hazard profile có tên thật sự là hazard XDG: đường profile XDG `$XDG_*_HOME/omp/profiles/<name>` chỉ được hỏi khi nó đã tồn tại (`if (fs.existsSync(profilePath)) return profilePath;`), nên một lần di chuyển XDG thiếu hoặc sai làm đổi root mà một profile phân giải về, và bỏ rơi trạng thái của nó. Hãy giữ ca test profile có tên — nó đáng có — nhưng viết nó dựa trên đường profile XDG, và đừng để nó biện minh cho việc viết thêm code xử lý trường hợp `profiles/` thuần mà một lần đổi tên đã phủ. |
| W5-7 | "**Lệnh:** `bun run check && (cd packages/coding-agent && bun test test/config-migrate.test.ts)`" — và plan đặt test mới ở `packages/coding-agent/test/config-migrate.test.ts`. | KHÔNG DÙNG ĐƯỢC LÀM CỔNG NGHIỆM THU TRÊN MÁY NÀY — test không chạy được, nên đỏ và xanh không mang thông tin gì. | Cổng của plan là một mệnh đề hở trên máy này: nó đỏ trước khi làm việc và sau khi làm việc, vì một lý do không liên quan gì tới công việc. Mọi test `packages/coding-agent` đều nạp `@oh-my-pi/pi-natives` theo đường nối tiếp, mà máy này không có addon đã build. Cách sửa không phải là cài addon (cần `brew install ninja` trước) mà là đặt engine và test của nó ở nơi đồ thị import sạch: engine ở `packages/utils/src/config-migrate.ts`, test ở `packages/utils/test/config-migrate.test.ts`, import bằng subpath. Bề mặt đó đã xác minh chạy được hôm nay, nên cổng mới thực sự có thể bị bác bỏ. Test ở tầng CLI vẫn nên nằm trong `packages/coding-agent` để cho đủ, nhưng phải được dán nhãn là không cổng chặn trên máy này chứ không nên được trích dẫn làm tiêu chí nghiệm thu. Cùng loại với W6-3 và W6a-3 về tiền đề môi trường, nhưng ở đây hậu quả nặng hơn vì nó làm cổng nghiệm thu vô hiệu. |
| W5-8 | Danh sách lệnh của W5 không hề nhắc tới cờ `--apply`, dù `--apply` là toàn bộ hợp đồng người dùng của work item ("yêu cầu `--apply` tường minh"). | KHÔNG ĐẦY ĐỦ — cờ này cần bốn site sửa nữa mà plan không đếm. | Thêm `--apply` là bốn chỉnh sửa ngoài bốn site action-list, và kỹ sư làm theo chỉ dẫn "bốn chỗ, đếm bốn dòng" sẽ tạo ra một lệnh nhận `migrate` rồi bỏ qua cờ đó. Bốn chỗ là: (1) `ConfigCommandArgs.flags` tại `config-cli.ts:26-28`, hiện chỉ khai báo `json?: boolean` — nên `apply` chưa có chỗ để nằm; (2) nhánh `--apply` trong vòng lặp cờ của `parseConfigArgs` tại `config-cli.ts:93-101`, cạnh nhánh `--json` sẵn có; (3) `static flags` trong `config.ts:31-33`, hiện chỉ khai báo `json` — parser oclot sẽ từ chối một cờ chưa khai báo, nên chỗ này người dùng thấy ngay cả khi các chỗ kia đã sửa; (4) object literal `cmd.flags` trong `config.ts:44-46`, hiện chỉ truyền `json: flags.json`. Tổng cộng: tám site trong `config-cli.ts`, bốn site trong `config.ts`. Chỉ dẫn review bằng cách đếm dòng của plan thì đúng, nhưng con số phải đếm là mười hai, không phải bốn. |
| W5-9 | Không phải claim của plan, mà là một thiếu sót của plan có chi phí trực tiếp: không gì trong plan nói rằng một helper move an toàn với EXDEV đã tồn tại trong cây. | THIẾU SÓT — helper đã có và AGENTS.md cấm phân nhánh lại nó. | `gc-cli.ts:528` đã cài đúng cái move mà work item này cần, gồm cả nhánh khác thiết bị: mkdir thư mục cha đích, `fs.rename`, và khi `code === "EXDEV"` thì `fs.cp(…, { recursive: true })` + `fs.rm(…, { recursive: true, force: true })` cho thư mục, hoặc `copyFile` + `unlink` cho file. Nó là module-private nên vô hình với người đang viết file mới — đó đúng là cách một cài đặt thứ hai xuất hiện. AGENTS.md nói thẳng đây là bug: "Two implementations of the same thing is a bug even when both work" và "Missing capability? Extend the central helper … don't fork its logic locally." Trường hợp khác thiết bị không phải chuyện lý thuyết cho work item này: root gốc và các root XDG có thể nằm trên hai volume khác nhau, và một lần rename trần sẽ để người dùng ở trạng thái di chuyển dở dang. |
| W5-10 | Ghi chú của W4 rằng `PI_CONFIG_DIR` giữ "**68 lượt / 25 file** (16 file `.ts`)". | CŨ — số đo không khớp. | Không thuộc bề mặt phụ thuộc của work item này, nhưng được ghi lại vì nó được đo trong lúc kiểm chứng và tính đúng của W5 phụ thuộc vào việc `PI_CONFIG_DIR` tiếp tục chạy (N16: tiền tố `PI_*`/`OMP_*` được giữ vĩnh viễn). Toàn repo: **78 lượt trên 27 file**. Chỉ `.ts`: **52 lượt trên 17 file**. Con số 68/25/16 của plan lệch 10 lượt và 2 file trên toàn repo. Không gì trong W5 phụ thuộc vào con số chính xác, nhưng một ngân sách `sed` dựng trên 68 sẽ quét thiếu. Cùng loại với W4-1, đo ở đây trên phạm vi toàn repo nên ra hai bộ số khác nhau — đừng đọc chúng là mâu thuẫn. |
| **W6** | | | |
| W6-1 | Phạm vi W6a là một chỗ đọc trực tiếp tại dirs.ts:589-591 — "Dòng :590 đọc trực tiếp CONFIG_DIR_NAME" được trình bày như site gốc-dự-án duy nhất mà plan bỏ sót. | CŨ / KHÔNG ĐẦY ĐỦ — site có thật nhưng không phải site duy nhất. | Có BA chỗ đọc CONFIG_DIR_NAME ở tầng gốc dự án, không phải một. Ngoài `dirs.ts:590` còn có `packages/coding-agent/src/modes/controllers/omfg-controller.ts:285` (`path.join(cwd, CONFIG_DIR_NAME, 'rules', name.md)`, tính năng rules phạm-vi-dự-án của omfg) và `packages/coding-agent/src/discovery/helpers.ts:47` (`projectDir: CONFIG_DIR_NAME` trong `SOURCE_PATHS.native`, được `discovery/builtin.ts:44` và `discovery/skillshare.ts:93` tiêu thụ). Cả hai phải trỏ lại `PROJECT_DIR_NAME` trong cùng commit. Claim của plan rằng bỏ sót site thì không có tín hiệu nào cũng sai: `omfg-controller.test.ts` đã hard-code `<projectDir>/.omp/rules` ở các dòng 178,198,202,215,220 và nhãn lựa chọn `This project (.omp/rules)` ở dòng 15, nên bỏ sót sẽ tạo ra một test đỏ ầm ĩ. Cùng chủ đề với W6a-1, ở đó phần kiểm kê đầy đủ hơn (bốn site, gồm cả `config.ts:12` là quyết định sản phẩm); ở đây chỉ liệt kê phần còn lại gọn. |
| W6-2 | Lệnh của W6 là `bun run check && (cd packages/utils && bun test test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts)` và W6 không cần test nào cho cú đảo chính ngoài W6a. | KHÔNG ĐẦY ĐỦ — bỏ sót một test sẽ đỏ. | `packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts:14` assert `expect(CONFIG_DIR_NAME).toBe(".omp")` — một literal chính xác, đỏ ngay khoảnh khắc cú đảo hạ cánh. Plan không hề nhắc tới nó. Hợp đồng của nó (theo chính tiêu đề file) là wiring của barrel mô tả tại `legacy-pi-coding-agent-shim.ts:1587-1591`, không phải giá trị, nên cách sửa là thay pin giá trị bằng một assert ràng buộc: CONFIG_DIR_NAME của shim bằng hằng số root-home và KHÔNG bằng hằng số root-dự-án. Nửa sau chỉ có tác dụng sau khi hai hằng số đã phân kỳ. |
| W6-3 | Tiền đề môi trường (harness): addon native chưa build nên `bun test` báo 0 pass với "Failed to load pi_natives native addon for darwin-arm64" và phải coi là bị chặn. | SAI — test chạy được trên máy này. | Addon native nạp được. `bun test packages/utils/test/dirs.test.ts` báo 6 pass / 0 fail, và `bun test packages/utils/test/dirs-python-gateway.test.ts` báo 2 pass / 0 fail — cái sau import `@oh-my-pi/pi-natives`, nên addon chắc chắn đang hoạt động. Cổng của W6 có và nên là một lần chạy test thật, không phải một bản thay thế chỉ kiểm type. Điều này làm cổng mạnh hơn đáng kể so với plan giả định. Cùng loại với W1-5, W6a-3 và W5-7; mục W1-5 là nơi tiền đề này được phát biểu đầu tiên và đã phân định đúng phạm vi. |
| W6-4 | Neo dòng của plan: `dirs.ts:27` (CONFIG_DIR_NAME), `:297-298` (getConfigDirName), `:360` (phép join XDG), `:589-591` (getProjectAgentDir), `:24` (APP_URL), `:36` (USER_AGENT). | XÁC MINH CHÍNH XÁC — không cần đính chính. | Cả sáu neo đều đúng ở HEAD 808b365. Cụ thể: 27 là CONFIG_DIR_NAME, 297/298 là chữ ký của getConfigDirName và `return process.env.PI_CONFIG_DIR \|\| CONFIG_DIR_NAME;` của nó, 360 là `const appRoot = path.join(value, APP_NAME);` (phép join XDG mà W4 phải phủ), 589/590/591 là getProjectAgentDir cùng phép join CONFIG_DIR_NAME trực tiếp của nó, 24 là APP_URL và 36 là USER_AGENT. Kỹ sư có thể gõ nguyên các neo này mà không cần suy lại. |
| W6-5 | Cổng của W6 chạy `bun test test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts`. | CŨ — hai file đó chưa tồn tại. | Không file nào tồn tại ở HEAD; `config-dir-write-root.test.ts` (file thứ ba mà chính chữ W4 thêm vào) cũng vậy. `ls` trên cả ba trả "No such file or directory". Điều này đúng và có thể chấp nhận được — chúng là sản phẩm bàn giao của W4 và W6 bị chặn cứng bởi W4 — nhưng lệnh cổng không thể chạy cho tới khi bước 1 xác nhận chúng tồn tại. Lưu ý thêm: `bun run check` là `check:ts` VÀ `check:rs` (root package.json:93-94), nên lệnh của plan kéo theo một cargo build cho một thay đổi không đụng Rust gì; `bun run check:ts` mới là cổng đúng ở đây. |
| W6-6 | Tên config root mới không được W6 nêu ("sang tên mới"). | ĐÃ GIẢI QUYẾT — plan đã quyết ở nơi khác, W6a chỉ bỏ sót. | Giá trị mới là `".ultraworkers"`. Plan nói như đã chốt ở ba chỗ: phần phân tích chi phí §1.2 ("chuyển ~/.omp sang ~/.ultraworkers"), quyết định danh tính trên đĩa §5.4 ("CONFIG_DIR_NAME trở thành tên mới (dirs.ts:27) và ghi mới rơi vào ~/.ultraworkers"), và dòng chi tiết của chính W5 ("di chuyển ~/.omp → ~/.ultraworkers"). Nó KHÔNG phải câu hỏi mở và người thực hiện không nên mở lại. |
| **W6a** | | | |
| W6a-1 | Plan dòng 13796 / 13800: `getProjectAgentDir` tại `packages/utils/src/dirs.ts:589-591` đọc CONFIG_DIR_NAME trực tiếp, "candidate list hai root của W4 không áp dụng, config migrate của W5 không đụng tới, và điều kiện nghiệm thu của W6 (chỉ phủ thư mục home và install-id) không nhìn thấy nó". | XÁC NHẬN nhưng KHÔNG ĐẦY ĐỦ — chẩn đoán của plan đúng, còn cách chữa thì thiếu phạm vi. | Số dòng, việc đọc trực tiếp, và việc W4/W5/W6 đều mù với nó đều được xác minh chính xác: `dirs.ts:590` là `return path.join(cwd, CONFIG_DIR_NAME);` và `grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts` trả đúng 3 hit (27, 298, 590). Điều plan bỏ sót: `dirs.ts:590` chỉ là MỘT trong ba lần đọc ở tầng dự án. `git grep -n CONFIG_DIR_NAME -- '*.ts' ':!*test*'` trả thêm hai phép join root-dự-án ngoài dirs.ts: `packages/coding-agent/src/discovery/helpers.ts:47` (`projectDir: CONFIG_DIR_NAME`, đi vào `getProjectPath()` ở :127-131 dưới dạng `path.join(ctx.cwd, paths.projectDir, subpath)`) và `packages/coding-agent/src/modes/controllers/omfg-controller.ts:285` (đường ghi rules phạm-vi-dự-án). Không chỗ nào đi qua `getProjectAgentDir()`, nên không chỗ nào được phủ khi trỏ lại dòng 590, và chữ W6a của plan không nhắc chỗ nào. Một site thứ ba — `packages/coding-agent/src/config.ts:12` — là quyết định sản phẩm (open question 1), vì `priorityList` nuôi cả bản đồ base của người dùng lẫn của dự án từ một giá trị. Thực hiện W6a đúng như plan mô tả sẽ để lại hai lần đọc root-dự-án còn sống gắn vào hằng số đang đảo. Xem W6-1 cho phần kiểm kê cùng chủ đề ở phía W6. |
| W6a-2 | Plan dòng 13809: "Effort: S dưới phương án khuyến nghị (b) — một hằng số riêng, một dòng do_not_rename, một ca test khẳng định getProjectAgentDir() vẫn trả .omp sau khi W6 đảo." | NÓI DƯỚI — cấp S giữ được, nhưng phần liệt kê thiếu hai call site, một file test, một dòng test sửa, và một quyết định sản phẩm có chặn. | Số thật: 1 hằng số mới; 4 call site trỏ lại (3 cơ học + 1 quyết định); 1 file test mới với 4 assert; 1 dòng của test sẵn có được nới (`legacy-pi-cli-exports.test.ts:14`); 1 dòng do_not_rename cộng việc tự tạo chính file `scripts/rename/keep-list.txt`. "Một ca test" của plan cũng yếu hơn vẻ ngoài: một assert duy nhất rằng `getProjectAgentDir()` trả `".omp"` thì bất kỳ cài đặt nào tình cờ trả chuỗi đó cũng thoả, và không phân biệt được một pin cố ý với một ràng buộc tai nạn vào CONFIG_DIR_NAME. Assert mang hợp đồng là DIVERGENCE (`PROJECT_DIR_NAME !== CONFIG_DIR_NAME`) — nó là assert duy nhất đỏ lên khi một đợt refactor tương lai gộp lại hai hằng số, và hiện không test nào trong repo làm điều đó. |
| W6a-3 | Ghi chú môi trường: "`bun test` bị CHẶN — addon native chưa build, mọi test báo 0 pass / 1 fail / 1 error với Failed to load pi_natives native addon for darwin-arm64." | SAI như một mệnh đề tổng quát — đúng với `packages/coding-agent/test/`, sai với `packages/utils/test/`. | Chặn có phạm vi theo package, không phải toàn cục. Đo trên máy này ở HEAD 84cbac9: `bun test packages/utils/test/dirs.test.ts` → 6 pass, 0 fail, 9 lời gọi expect(), 121ms; `bun test packages/utils/test/install-id.test.ts` → 5 pass, 0 fail, 11 lời gọi expect(), 115ms; `bun test packages/coding-agent/test/config/settings-reload.test.ts` → 0 pass, 1 fail, 1 error. Nguyên nhân: `packages/utils/src/dirs.ts` chỉ import `node:fs`, `node:os`, `node:path` và `../package.json` của chính nó — không có đường nào tới addon native. Hệ quả với đặc tả này, và cũng là câu hỏi harness nêu tường minh: một test đặt ở `packages/coding-agent/test/` sẽ là một cổng KHÔNG THỂ đỏ trên máy này, đúng cái nhầm lẫn "đã xong" với "test không chạy" cần tránh. Test mới của W6a vì thế đi vào `packages/utils/test/`. Điều này cũng có nghĩa "bun run check:ts là tín hiệu chính" của harness không phải tín hiệu dùng được duy nhất — với package sở hữu work item này, có một tín hiệu đỏ/xanh thật. Cùng loại với W1-5, W6-3 và W5-7. |
| W6a-4 | Plan dòng 13199 / N14: "root `.omp` tầng dự án (xem W6a — khuyến nghị là giữ nó) ... phải vào do_not_rename." | XÁC NHẬN, và cây trong repo làm cho lập luận cụ thể hơn plan nói. | Chính `.omp` tầng dự án của repo này được git theo dõi với 14 file, nên thất bại mà W6a ngăn không phải chuyện giả định đối với codebase này: một cú đảo sẽ làm hỏng chính `.omp/commands` của người bảo trì (5 file markdown: cleanup, fix-issues, release, review-prs, triage), `.omp/skills` (6 file trải trên semantic-compression, system-prompts, tool-prompt-optimization) và `.omp/tools` (3 file: package.json, bun.lock, tui.ts). Plan coi root dự án là mối lo chung của người dùng; nó còn là chính cấu hình làm việc của repo này nữa. Dòng do_not_rename là bắt buộc dù thế nào. |
| **W7** | | | |
| W7-1 | Lượt 1 chạy trên 4107 file chứa 17169 lượt `@oh-my-pi/`. | CŨ — cây đã trôi. | Tại HEAD `84cbac9` (nhánh milestone-1) con số thật cho toàn bộ file theo dõi là **4149 file / 17697 lượt**. Sau khi loại N11 (13 changelog / 85 lượt), `.lavish-wip/**` (13 file / 68 lượt) và 5 tài liệu kế hoạch (5 file / 332 lượt), tập in-scope đề xuất là **4118 file / 17212 lượt**. Hãy dùng 4118/17212, đừng dùng 4107/17169. Trong tập in-scope: 18 file là manifest + lock (16 `packages/*/package.json` + `package.json` gốc + `bun.lock`), 4100 file còn lại là mã và tài liệu. |
| W7-2 | Các mục kiểm chứng của plan được xác nhận trên HEAD `5873776`. | KHÔNG KIỂM CHỨNG ĐƯỢC — commit đó không tồn tại. | Commit `5873776` KHÔNG tồn tại trong repo này: `git cat-file -t 5873776` trả `fatal: Not a valid object name`. Không claim nào ghim vào SHA đó kiểm lại được. Hãy lấy lại toàn bộ mốc bằng `git rev-parse HEAD` tại thời điểm thực thi. Đáng chú ý: mốc N11 (13 file / 85 lượt) VẪN đúng ở `84cbac9` — phần trôi nằm ở ngoài changelog, không nằm ở changelog. Đây gần như là nguyên nhân gốc của mọi sai số còn lại trong W7, W8a và W8b: bảng kiểm kê được lập trên một trạng thái cây không nằm trong lịch sử repo, nên nó không tự phát hiện là cũ. Xem W1-7, W2-5 và W8b-2 cho cùng loại lỗi. |
| W7-3 | Rủi ro sai lầm thứ hai: "đổi scope trong manifest mà bỏ sót khóa subpath của `exports` map hoặc một mục `peerDependencies`". | SAI MỘT NỬA — | Vế `exports` map KHÔNG đúng và không cần lo. Đã kiểm: mọi khóa subpath trong `exports` đều là đường dẫn tương đối (`./compaction`, `./error`, `./*`) chứ không phải scope, và repo KHÔNG có trường `imports` ở bất kỳ manifest nào. Nên không khóa subpath nào mang scope. Vế `peerDependencies` thì ĐÚNG và còn lớn hơn plan nghĩ: 90 lượt trong 16 manifest, không phải 16 dòng `name`. Rủi ro thật là bỏ sót mục phụ thuộc, và nó chỉ lộ ra trên bản cài sạch. |
| W7-4 | 16 basename sau dấu `/` tách ba nhóm: 10 `pi-*`, 2 thương hiệu cũ, 4 không thuộc họ nào (`browser-relay`, `collab-web`, `snapcompact`, `typescript-edit-benchmark`). | XÁC NHẬN — giữ nguyên. | Giữ nguyên, và con số này là thứ plan làm đúng nhất. Đã liệt kê đủ 16 `name` từ manifest thật và phân nhóm khớp N17 chính xác. Bổ sung: catalog ở `package.json` gốn chỉ ghim 12 trong 16 — `browser-relay`, `collab-web`, `pi-metaharness`, `typescript-edit-benchmark` không có mục ghim. Đừng "sửa cho đủ 16" ở bước 8. |
| W7-5 | Plan liệt kê loại trừ cứng: `@mariozechner/*`, `@earendil-works/*`, `@sinclair/typebox`, `node_modules`, `packages/*/CHANGELOG.md`, và toàn bộ `do_not_rename`. | NÓI QUÁ — | Ba scope nước ngoài và `node_modules` KHÔNG THỂ bị vi phạm: mẫu `@oh-my-pi/` là chuỗi literal có dấu `/` ở cuối, nên về mặt cấu trúc nó không khớp `@mariozechner/`, `@earendil-works/`, `@sinclair/typebox`; `git grep` cũng không đi vào `node_modules`. Loại trừ thật sự có tác dụng chỉ có hai: `packages/*/CHANGELOG.md` (85 lượt) và 4 manifest ví dụ của N2 — nhưng 4 manifest N2 đã kiểm và có **0** lượt `@oh-my-pi/`, nên chúng cũng không cần loại trừ. Nói cách khác: rủi ro thật của W7 nằm ở tập file KHÔNG ai liệt kê (`.lavish-wip/`, 5 tài liệu kế hoạch, 2 transcript `.jsonl`), chứ không nằm ở danh sách loại trừ mà plan nhấn mạnh. Cùng chủ đề với W7-8 ở phía dưới, làm nổi lên cùng một loại: tập file chưa ai kiểm kê. |
| W7-6 | Dạng trần `"oh-my-pi"` nằm trong 15 file (W8a). | CŨ — thật là 16. | Ở HEAD `84cbac9` có **16** file khớp `git grep -lE '"oh-my-pi"' -- .`. File thứ 16 là `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — chính tài liệu kế hoạch. Plan tự đếm ngoài chính nó. Không thuộc phạm vi W7 (sed của W7 chỉ khớp dạng có `/`), nhưng Gate C của W7 bàn giao baseline 16 file cho W8a, và W8a nên biết là có file thứ 16 đó. Cùng con số này được lặp lại ở W8a-1 và W8b-7, cả ba đều phải là 16. |
| W7-7 | Ba bước sau pass 1 — đổi 16 trường `name`, cập nhật 12 mục ghim, tạo lại `bun.lock` — được trình bày như các chỉnh sửa riêng. | GÂY HIỂU NHẦM — | Không có chỉnh sửa tay nào trong ba bước đó: mẫu `@oh-my-pi/` đã phủ cả 16 trường `name`, cả 12 mục ghim, và cả 90 lượt phụ thuộc trong manifest. Chúng phải được viết lại thành bước XÁC MINH, không phải bước SỬA — vì nếu kỹ sư hiểu là "sửa tay 16 dòng name" sau pass, họ sẽ tạo ra một pass thứ hai, và đó chính là sai lầm phá N17 mà plan cảnh báo. Đã viết lại thành bước 8 (verify, 4 lệnh kiểm, không sửa) và bước 9 (`bun install` cho `bun.lock`). |
| W7-8 | Rủi ro lớn nhất về mặt quy tắc repo là để mẫu `git grep -o '@oh-my-pi/' -- .` quét tới `packages/*/CHANGELOG.md`. | XÁC NHẬN và NÓI DƯỚI — | Đúng, và đã dựng Gate B chống đúng điều đó. Nhưng còn một nhóm thứ hai mà plan không nhắc tới và cũng sẽ bị mẫu toàn-repo quét: 13 file `.lavish-wip/specs/*.spec.json` (68 lượt, workflow scratch đã bị commit) và 5 tài liệu kế hoạch (332 lượt). Cộng lại 400 lượt ngoài danh sách — lớn hơn nhiều so với 85 lượt changelog mà plan coi là rủi ro lớn nhất. Mục này là nơi phát biểu loại lỗi "tệp chưa ai kiểm kê" cho W7; W7-5 nói cùng loại từ phía danh sách loại trừ. |
| W7-9 | Lệnh nghiệm thu của W7: `bun install && bun run check && bun run test:ts`. | KHÔNG CHẠY ĐƯỢC trên máy này. | `bun run test:ts` là `bun scripts/ci-test-ts.ts local-ts` và `bun test` bị chặn bởi addon native chưa build (`Failed to load pi_natives native addon for darwin-arm64`); `bun --cwd=packages/natives run build` thất bại vì thiếu `ninja` (`CMake was unable to find a build program corresponding to "Ninja"`). `bun run check` còn gọi thêm `check:rs` cần cargo, chưa xác minh. Đã thay bằng `bun run check:ts` (đã đo exit 0 ở HEAD) và tách cổng test thành Gate E ghi rõ `NOT RUN — environment blocked`. Cần dạy kèm `brew install ninja` trước bất kỳ lệnh build nào. Cùng loại với W5-7 và W6-5 về việc một lệnh nghiệm thu không mang tính bác bỏ. |
| W7-10 | Plan không nói gì về `loader-state.js:70` và sáu leaf package `@oh-my-pi/pi-natives-<tag>`. | LỖ HỔNG CỦA PLAN — | Đây là phần thất bại im lặng đắt nhất của W7 và plan bỏ sót nó. `packages/natives/native/loader-state.js:70` gọi `require_.resolve(`@oh-my-pi/pi-natives-${platformTag}/package.json`)`. Sáu tên leaf package này KHÔNG nằm trong repo — chúng được publish lên registry (`.github/workflows/ci.yml:326` chạy `npm view @oh-my-pi/pi-natives-linux-x64@latest dist.tarball`, và :1035 nói rõ "Publishes the six @oh-my-pi/pi-natives-<tag> leaf packages"). Đổi scope trong loader TRƯỚC khi leaf package tồn tại dưới scope mới ⇒ `require_.resolve` ném ⇒ `catch { return null }` chạy ⇒ loader rơi sang nhánh dự phòng khác, không một lỗi nào được ném, không một test nào đỏ. W7 không tự giải quyết được; cần câu trả lời của open_question Q1 trước khi merge. |
| **W8a** | | | |
| W8a-1 | W8a xử lý "15 file có literal dạng trần `oh-my-pi`", và lệnh mà W8b Gate 0 dùng để sinh danh sách là `git grep -lE '"oh-my-pi"' -- .` với kỳ vọng 15 file. | GÂY HIỂU NHẦM — | Con số 15 chỉ đúng sau khi loại chính file kế hoạch. Lệnh ghi trong Gate 0 của W8b trả 16 trên HEAD `84cbac9`, và file thứ 16 là `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — chính tài liệu kế hoạch, chứa 20 lượt dạng trần trong bảng N1–N17 và các đoạn trích dẫn mà W8/W8b nên giữ nguyên. Hai cách sửa: (1) mọi lệnh đếm ở M5 phải có `:!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`; (2) con số đúng cho W8a là 15 file / 23 lượt, và 15 đó KHÔNG phải 7 nguồn + 5 test + 1 doc như plan ngầm ý — nó là 7 nguồn + 7 test + 1 doc. Đây là mẫu số mà Gate 0 của W8b sẽ ra nếu không loại file kế hoạch. Cùng lỗi đếm ở W7-6 và W8b-7. |
| W8a-2 | Danh sách 11 file còn lại gồm "4 file .ts dưới `packages/ai` + `packages/coding-agent/src/web/search/providers/exa.ts`, 5 file test, và `docs/provider-quirks.md:1`". | SAI — | Hai nhận sai, tổng thi đúng. (a) KHÔNG phải 4 file .ts dưới `packages/ai` — chỉ có ĐÚNG MỘT file dưới packages/ai là `packages/ai/src/registry/oauth/zai.ts`; 6 file nguồn còn lại đều nằm dưới `packages/coding-agent`. (b) KHÔNG phải 5 file test — có 7 file test. Phân bố thật: 7 nguồn + 7 test + 1 doc = 15. File thứ 8 nguồn mà plan không liệt kê trong danh sách 11 đó là `packages/coding-agent/src/mcp/oauth-flow.ts`, nó chỉ được nhắc trong văn xuôi chứ không bao giờ đưa vào danh sách đầy đủ. (c) `docs/provider-quirks.md` không có hit ở dòng 1 — dòng 1 là tiêu đề `# Provider quirks: special casings, streams, auth, and catalog handling`. Hit thật ở DÒNG 1706 trong file 1750 dòng. |
| W8a-3 | `packages/coding-agent/src/cli/gallery-fixtures/segments.ts` — 2 lượt trong "fixture transcript đã ghi". Đây là phán đoán: coi như LỊCH SỬ giống session record, không coi là danh tính — trừ khi demo gallery được định nghĩa là để trình diễn thương hiệu mới, thì phải sửa. | SAI — | Không có transcript nào ở file này và lập luận "lịch sử" không áp dụng. `segments.ts` là BỘ KHUNG HIỂN THỊ TỔNG HỢP: `createGallerySegmentContext()` trả về một `SegmentContext` nhận diện, và comment tại dòng 23 ghi rõ "Deterministic full context for isolated status-segment previews and tests". Hai giá trị `relativeRepoRoot` (dòng 33) và `projectName` (dòng 164) là chuỗi hiển thị được render ra stdout. `gallery` là lệnh CLI ĐÃ ĐĂNG KÝ VÀ PHÁT HÀNH — `cli-commands.ts:121-126` khai báo `name: "gallery"` trỏ sang `commands/gallery`, và `gallery-cli.ts:1-9` mô tả "`omp gallery` — render every built-in tool's renderer across its lifecycle ... and prints the rendered output to stdout", kèm `captureGalleryScreenshots`. Nên điều kiện "trừ khi demo gallery được định nghĩa là để trình diễn thương hiệu mới" đã được trả lời RÕ: có, chính là. DISPOSITION: đổi cả hai sang `ultraworkers`. Đây là thay đổi nguồn duy nhất của cả W8a — 2 dòng trong 1 file. |
| W8a-4 | "11 cái còn lại ... phần lớn là tên host HTTP hoặc kỳ vọng test, không phải danh tính — nhưng phải xác nhận từng file, không giả định". Và bốn mục "quan trọng nhất" đã được xử lý (N7 telemetry, N5 acp, gallery, N8 alias). | LỖ HỔNG CỦA PLAN — | BA file nguồn trong nhóm "còn lại" là giá trị wire gửi cho BÊN THỨ BA, và KHÔNG có mục nào trong bảng N1–N17 nào phủ chúng. Cụ thể: (1) `zai.ts:25` `KEY_NAME` là `name` gửi trong payload `businessLogin`/key-mint của Z.AI — comment tại dòng 24 nói rõ ý nghĩa: "OMP's own key name so sign-in never mutates ZCode's `zcode-api-key`", tức là danh tính SỞ HỮU KHOÁ, và đổi tên nghĩa là tạo một khoá mới trong tài khoản Z.AI của người dùng thay vì tái dùng khoá cũ (cùng loại với N3). (2) `exa.ts:26` `EXA_MCP_SOURCE` được gửi ở header `x-exa-source` tại dòng 369 — attribution phía Exa, cùng loại với N9. (3) `oauth-flow.ts:629` `client_name` là payload đăng ký client ĐỘNG RFC 7591 gửi tới máy chủ OAuth, và docblock ngay trên (dòng 612-620) nêu Figma từ chối client ngoài danh sách — tức provider dùng payload này để lập allowlist. Không cái nào là "tên host HTTP" (cả ba đều là giá trị, không phải hostname). TẤT CẢ BA phải giữ và phải được thêm vào keep-list — nếu không, một kỹ sư đọc keep-list sẽ không biết phải giữ và sẽ đổi chung. |
| W8a-5 | Test cần viết: "Telemetry: khẳng định giá trị thuộc tính resource được export đúng bằng giá trị đã quyết định, và ghim nó bằng một test". File test mới: `packages/coding-agent/test/telemetry-export-otlp.test.ts`. | ĐÚNG MỘT PHẦN — | `SERVICE_NAME` KHÔNG được export (`grep -n 'export' telemetry-export-otlp.ts` không có dòng nào export nó), và có MỘT seam sẵn sàng đúng dụng cho việc này: `packages/coding-agent/test/otel-resource-probe.ts`, chạy nhịp bởi `telemetry-export.test.ts:118-124`. Nhưng probe đó đặt `OTEL_SERVICE_NAME = "svc-probe"` (dòng 37) và comment dòng 59 nói "OTEL_SERVICE_NAME must win over the service.name in OTEL_RESOURCE_ATTRIBUTES" — tức nó TỒN TẠI để chứng minh biến môi trường THẮNG giá trị fallback. Do đó probe hiện có KHÔNG BAO GIỜ quan sát được giá trị fallback, và sửa nó để khẳng định `"oh-my-pi"` sẽ phá đúng hợp đồng precedence mà nó sinh ra. Cách sửa: tạo probe ANH EM `otel-service-name-probe.ts` bỏ `OTEL_SERVICE_NAME` và `OTEL_RESOURCE_ATTRIBUTES`, rồi thêm nó vào mảng `probes` hiện có — không cần hạ tầng mới, không cần sửa probe cũ. Tên file trong plan (`telemetry-export-otlp.test.ts`) nên đổi thành tên probe để trùng với quy ước sibling của file hiện có. |
| W8a-6 | Lệnh nghiệm thu của W8a: `bun run check && (cd packages/coding-agent && bun test test/extension-scope-canonicalization.test.ts test/telemetry-export-otlp.test.ts)`, và "Phần cần viết: phân giải extension, trong file test của W2". | SAI — | `test/extension-scope-canonicalization.test.ts` KHÔNG TỒN TẠI — đặc tả W2 của chính milestone này đặt tên file là `packages/coding-agent/test/pi-scope-aliases.test.ts` (xem W2-2). Lệnh nghiệm thu đó trỏ tới một file không ai sẽ tạo, nên nó đỏ mà không liên quan gì đến việc của kỹ sư. Về `bun run check`: nó gọi thêm `check:rs` cần cargo, chưa xác minh trong W8a; phần chạy được và chạm tới file W8a sửa là `bun run check:ts`, đã đo exit 0 tại HEAD. Về `bun test`: bị chặn bởi addon native chưa build trên máy này, nên lệnh đó phân biệt được "đã làm" với "test không chạy được" — đây là lý do Gate A–F trong đặc tả W8a viết để không cần chạy một dòng test nào, và Gate G ghi rõ NOT RUN. Cùng loại với W5-7 và W6-5. |
| W8a-7 | "W7 đẩy 585 file .ts có token `omp` sang 'làm theo từng file'" và W8a là 15 file dạng trần; ranh giới của W8a là phần literal dạng trần mà sed scope của W7 KHÔNG chạm tới. | ĐÚNG Ở CẤP LINH, SAI Ở CẤP FILE — | Ranh giới ĐÚNG ở CẤP LINH, SAI Ở CẤP FILE. Lệnh scope của W7 là `perl -pi -e 's{\@oh-my-pi/}{@ultraworkers/}g'` — nó không thể nào chứa được một literal dạng trần, nên cả 23 lượt này đều sống sót. NHƯNG 14/15 file trong bảng W8a CŨNG chứa dạng có dấu `/`: chỉ có `packages/ai/src/registry/oauth/zai.ts` có bảng 0 lượt scope; 14 file còn lại có từ 1 đến 16 lượt (acp-lazy-startup 16, acp-initialize-conformance 10, acp-agent 8, legacy-pi-compat 7, cursor-exec-modern và zai-oauth 6 mỗi cái, web-search-exa 6, segments 5, oauth-flow 5, telemetry 4, git-hosting 2, exa 2, oauth-flow.test 2, provider-quirks 1). Nghĩa là W7 ĐÃ sửa 14/15 file của W8a, và chỉ một file duy nhất là W8a sở hữu toàn bộ. Hai hệ quả phải nói rõ: (1) Gate C của W7 (so sánh tập dựng trước) là thứ bảo vệ W8a — W8a mà chạy trước sẽ làm nó đỏ; (2) khi review W8a, phải so với baseline W8a chứ KHÔNG phải với `main`, nếu không sẽ thấy 14 file có hơn hàng trăm dòng thay đổi của W7 trộn vào diff của W8a. Chỉ có một file (zai.ts) mà W8a sửa mà W7 không đụng. |
| W8a-8 | W8a phụ thuộc "W2, và M2 đã merge cho phần tài liệu". | LỖ HỔNG CỦA PLAN — | Danh sách phụ thuộc thiếu W7, và đây là phụ thuộc CÙNG chưa một điều kiện mở — không phải chỉ thứ tự thời quan. Gate C của W7 chụp baseline 16 file dạng trần rồi so sánh sau pass; nếu W8a đổi một literal dạng trần trước, Gate C đó và W7 không thể merge, đồng thời W8a cũng không thể chạy. Các file tài liệu mà plan giao cho W8a (`docs/extension-loading.md:231`, `docs/porting-from-pi-mono.md:46-51`) cũng không có literal dạng trần — `grep -cE '"oh-my-pi"'` trên cả hai đều bằng 0, chúng chỉ có dạng có dấu `/` thuộc W7. Nghĩa là phần tài liệu của W8a là sửa VĂN XUÔI sau W7, không phải thay chuỗi; chạy một pass thay chuỗi ở bước 10 sẽ không có gì để thay. |
| **W8b** | | | |
| W8b-1 | §2.2 hàng 6 và W8b: 1826 lượt / 585 file `.ts` chứa token `omp` đứng riêng; §2.4 dòng cuối còn ghi rõ đã "ghim regex" và sửa từ 1823/584 sang 1826/585. | SAI — cây đã trôi. | 599 file / 1853 lượt. Chênh +14 file / +27 lượt. Mọi câu chữ trong W8b nói "585" phải đổi thành 599, và cột `hits` phải cộng lại từ `git grep -o`. Vì con số này xuất hiện ở CẢ DoD lẫn bảng rủi ro, cả hai chỗ đều phải sửa — đúng bài học mà chính §2.4 đã viết ở dòng 13309. Đây là mục phát biểu loại lỗi "số đo đã cũ" cho cả W8b; W8b-2 là nguyên nhân gốc của nó, còn W8b-6, W8b-7, W8b-8 là cùng loại và được liệt kê gọn ở dưới. |
| W8b-2 | W8b: commit baseline `5873776` là trạng thái cây mà toàn bộ số liệu §2.2/§2.3 được dẫn lại. | SAI — commit không tồn tại trong repo này. | `git cat-file -t 5873776` → `fatal: Not a valid object name`; `git merge-base --is-ancestor 5873776 HEAD` → cũng lỗi. `git log --oneline -1` cho HEAD là 84cbac9. Không có mốc nào để "quay lại" — mọi con số phải đo lại trên HEAD 84cbac9 trước khi dùng. Đây gần như là nguyên nhân gốc của mọi sai số còn lại: bảng kiểm kê được dẫn lại trên một trạng thái cây không nằm trong lịch sử repo này, nên nó không tự phát hiện là cũ. Cùng loại với W7-2, W1-7 và W2-5. |
| W8b-3 | W8b: `scripts/rename/disposition.tsv` là nơi bảng quyết định sống, "cùng thư mục với keep-list của §2.3". | ĐÚNG VỀ ĐỊA CHỈ, SAI VỀ TIỀN ĐỀ — không có gì ở đó cả. | `ls scripts/rename/` → `No such file or directory`. `git ls-files scripts/rename/` → rỗng. Cả `keep-list.txt` lẫn `disposition.tsv` đều chưa tồn tại. Nói thẳng: W8b không có bảng để điền, và Gate 0 của chính nó đang ĐỎ. Đây là trạng thái đúng — nhưng nó kéo theo một hệ quả phải nói ra: W7 cũng đang bị chặn bởi cùng một thư mục chưa tồn tại, nên cả hai nên được giao CÙNG LÚC cho một người, không phải tuần tự. |
| W8b-4 | W8b: "Danh sách loại trừ bắt buộc: 7 mục trong do_not_rename". | SAI — 7 là số mục WIRE, không phải số mục keep-list. | 17 mục (N1…N17), không phải 7. Sai số này nguy hiểm theo đúng hướng: một người thực hiện đọc "7" sẽ lập danh sách loại trừ 7 dòng và tưởng đã đủ, rồi đổi nhầm N8 (alias scope), N11 (changelog), N16 (họ biến môi trường) hoặc N17 (basename) — bốn thứ mà số 7 không nhắc. §2.3 đánh số N1…N17; đếm hàng `^\| N[0-9]+` trong bảng §2.3 cho 17, mục cuối là N17. Con số 7 khớp với cột "7 vị trí" của hàng 19 §2.2 (danh tính wire), là thứ khác. |
| W8b-5 | W8b: loại trừ "toàn bộ 28 vị trí selector của W9". | SAI SỐ — thật là 30 vị trí trên 14 file .ts không-test. | 30 vị trí / 14 file (không phải 28/13), và 15 tên selector thật sau khi loại 2 fixture test — con số 20 trong lệnh thô là 15 + 2 fixture + 3 hệ dẫn xuất. QUAN TRỌNG HƠN: vì lớp loại trừ của regex W8b chứa `_`, chuỗi `__omp_worker_*` KHÔNG khớp biểu thức ghim — nên selector không tự rơi vào tập 599. Nhưng SÁU FILE vừa mang selector vừa có hit `omp` khác (cli.ts 5, aggregator.ts 3, title-protocol.ts 2, context-manager.ts 1, tts-client.ts 1, tab-supervisor.ts 1) thì CÓ trong 599. W8b phải rà lại sau W9 vì lý do đó. Chi tiết đếm: `git grep -c '__omp_worker_' -- '*.ts' ':!*test*'` cho 30 dòng trên 14 file (blob-broker/server.ts 1, cli.ts 8, worker-selectors.ts 8, context-manager.ts 2, embed-client.ts 2, embed-worker.ts 1, predict/daemon.ts 1, activity-worker.ts 1, asr-client.ts 1, title-protocol.ts 1, tab-supervisor.ts 1, tts-client.ts 1, aggregator.ts 1, worker-host.ts 1). `git grep -ohE '__omp_worker_[a-z_]+' -- . \| sort -u` cho 20 tên, trong đó `__omp_worker_test` và `__omp_worker_does_not_exist` là fixture test. |
| W8b-6 | W8b: loại trừ "258 literal `.\"omp\"`" (hàng 8 §2.2). | SAI — thật là 280 lượt / 94 file. | 280 lượt / 94 file. Ảnh hưởng tới Gate 0: `--gate0` phải so tập `dot-omp-literal` với 94 file chứ không phải 89, nếu không 5 file sẽ không bao giờ được đòi một hàng. `git grep -oE '"\.omp"' -- . \| wc -l` → 280; `git grep -lE '"\.omp"' -- . \| wc -l` → 94. Cùng loại với W8b-1 (số đo cũ). |
| W8b-7 | §2.2 hàng 2 và W8a: 15 file có literal dạng trần `"oh-my-pi"`. | SAI — thật là 16 file. | 16 file. Lưu ý đặc tả W7 đã viết 16 ở Gate C của nó (đã đúng, và Gate C đó diff với baseline nên tự bắt được) — còn §2.2 và W8a thì vẫn 15. W8b dùng 16. `git grep -lE '"oh-my-pi"' -- . \| wc -l` → 16. Cùng loại với W7-6 và W8a-1. |
| W8b-8 | W8b: cột `hits` là "số lượt trong file đó, đếm bằng biểu thức đã ghim ở §2.1". | ĐÚNG VỀ ĐỊNH NGHĨA, NGUY HIỂM VỀ CÀI ĐẶT — cần nói rõ `-o` chứ không phải `-c`. | Ghim rõ trong đặc tả: cột `hits` dùng `git grep -o`. Dùng `-c` là mất 85 lượt trên toàn tập mà không hàng nào báo sai — và Gate 1 chỉ so tập FILE nên vẫn xanh. Trên tập 599: `git grep -c` cộng lại = 1768 dòng; `git grep -o` cộng lại = 1853 lượt. Riêng `packages/coding-agent/test/update-cli.test.ts`: `-c` → 58, `-o` → 59. |

### Bằng chứng — W1

- **W1-1** — `git grep -n ORIGINATOR_CODEX` → 9 hits: definition at `packages/catalog/src/wire/codex.ts:52`, consumers at `packages/agent/src/compaction/compaction-v2-streaming.ts:435`, `packages/agent/src/compaction/openai.ts:832`, `packages/ai/src/images/openai-hosted.ts:70`, `packages/ai/src/providers/openai-codex-responses.ts:4781`, `packages/ai/src/registry/oauth/openai-codex.ts:137`, `packages/catalog/src/discovery/codex.ts:210`, `packages/coding-agent/src/web/search/providers/codex.ts:306`, plus `packages/ai/test/openai-codex.test.ts:24`. `sed -n '1,20p' packages/catalog/src/compat/rules/auth/openai-codex.kdl` → line 12: `originator "omp"`.
- **W1-2** — `git grep -n '"omp"' -- packages/coding-agent/src packages/catalog/src packages/utils/src packages/tui/src` → 50+ hits; the six above were each opened and confirmed by `sed`. Cross-check: `sed -n '45,55p' packages/coding-agent/src/cli/git-tui/avatar.ts` shows the literal inside a `Record<string, string>` header map; `sed -n '439,443p' packages/coding-agent/src/tools/report-tool-issue.ts` shows it inside a `JSON.stringify` body; `sed -n '26,30p' packages/coding-agent/src/internal-urls/omp-protocol.ts` shows `readonly scheme = "omp";`.
- **W1-3** — Four existing goldens confirmed by direct read: `sed -n '105,117p' packages/coding-agent/test/modes/warp-events.test.ts` (exact JSON.stringify including `agent: "omp"`); `sed -n '233,241p' packages/coding-agent/test/acp-initialize-conformance.test.ts` (objectContaining with `name: "oh-my-pi"`, `title: "omp"`); `sed -n '336,343p' packages/coding-agent/test/blob-uploaders-self-hosted-legacy.test.ts` (`expect(form.get("z")).toBe("omp")`); `sed -n '80,140p' packages/coding-agent/test/hindsight-bank.test.ts` (bankId `"omp"`, `"omp-proj"`, `"omp-unknown"`, `"omp-general"`). None of these four should be edited by W1 — and gate (3) makes that a hard requirement.
- **W1-4** — `grep -n 'agentInfo' packages/coding-agent/test/acp-agent.test.ts` → no match. `grep -n 'agentInfo' packages/coding-agent/test/acp-initialize-conformance.test.ts` → lines 26, 228, 233, 240. `grep -c '"omp"'` per file: warp-events.test.ts 2, acp-initialize-conformance.test.ts 1, blob-uploaders-self-hosted-legacy.test.ts 1, hindsight-bank.test.ts 4 (plus the `"omp-proj"`/`"omp-unknown"`/`"omp-general"` variants).
- **W1-5** — Two `bun test` invocations run at HEAD 808b365; outputs quoted above. The utils suite is addon-free because `packages/utils/src/dirs.ts` imports only `node:fs`, `node:os`, `node:path`, its own `package.json`, and `./fs-error` (see `sed -n '14,18p' packages/utils/src/dirs.ts`).
- **W1-6** — scope is enumerable bằng `git add -A && git diff --cached --stat`: 6 modified source files + 1 new test file, listed in the files_touched section of this spec.
- **W1-7** — `git log --oneline -3` → 808b365, 33d6e33, ecd516f. `git status --short` → only `?? .lavish-wip/m2-specs/`.
- **W1-8** — `sed -n '228,241p' packages/coding-agent/test/acp-initialize-conformance.test.ts` shows the objectContaining assertion with `name: "oh-my-pi"` and `title: "omp"`. `grep -n 'name: "oh-my-pi"' packages/coding-agent/src/modes/acp/acp-agent.ts` → line 656 only. Plan cross-reference: `N5` row at plan line 8227, and the W9 do-not-rename entry at plan line 8796.

### Bằng chứng — W2

- **W2-1** — `bun -e 'Bun.resolveSync("@ultraworkers/pi-utils", process.cwd())'` → `Cannot find module '@ultraworkers/pi-utils' from '/Users/tranquangdang21/Projects/ultraworkers'`, while the same call for `@oh-my-pi/pi-utils` → `/Users/.../packages/utils/src/index.ts`. Source: `legacy-pi-compat.ts:1077` (`Bun.resolveSync` in `getResolvedSpecifier`), `:1144-1149` (the swallowing try/catch), `:751-754` (`loadBundledModule` throws on an unregistered key), and `packages/coding-agent/scripts/legacy-pi-virtual-module.ts:126` (`addEntry(manifest.name, ...)` — registry keys are the literal manifest name, still `@oh-my-pi/pi-ai`). A full simulation of the post-W2 filter/remap/resolve chain confirmed all four scope spellings now remap to an unresolvable `@ultraworkers/*` target.
- **W2-2** — `cat -n packages/coding-agent/test/pi-scope-aliases.test.ts` — 135 lines; lines 43-83 are the `CASES` table; lines 109-117 emit `if (alias${idx} !== canonical${idx}) throw new Error(...)`; line 129-134 is the single gating test. `ls packages/coding-agent/test/ | grep -i 'scope'` returns exactly this one file; no `extension-scope-canonicalization.test.ts` exists and none should be added.
- **W2-3** — `legacy-pi-compat.ts:1453-1466` (`isBareExtensionDependencySpecifier` — pure shape classification, no manifest read); `:1158-1161` (the bare-dep fallback is only reached AFTER the canonicalizer has already failed, and operates on the original specifier). Simulation confirms `isBareExtensionDependencySpecifier('@ultraworkers/pi-utils')` returns true.
- **W2-4** — `git grep -n 'CANONICAL_PI_SCOPE\|PI_SCOPE_ALIASES'` at HEAD: only `legacy-pi-compat.ts:796,802` in source — both bare-quoted, no trailing slash. Plan line 8503 and line 8964 both state the sed pattern is trailing-slash and that the bare form needs its own grep.
- **W2-5** — `git log --oneline -1` → `808b365 docs(plan): fold the spec-verified M1 execution plan into the upgrade plan`; `git rev-parse --short HEAD` → `808b365`; `git branch --show-current` → `milestone-1`.
- **W2-6** — `legacy-pi-compat.ts:805` lists exactly 6 `pi-*` basenames; `for f in packages/*/package.json; do grep -m1 '"name"' ...; done` returns exactly 16 scoped package names. A simulation confirms `@ultraworkers/omp-stats` does NOT match the post-W2 filter.

### Bằng chứng — W3

- **W3-1** — `sed -n '360,372p' packages/utils/src/dirs.ts` → `const appRoot = path.join(value, APP_NAME);` kèm guard `if (fs.existsSync(appRoot)) return appRoot;`. Xác nhận qua `dirs.ts:983` (secret-placeholder.key dưới `$XDG_STATE_HOME/omp`), `dirs.ts:748` (autoqa.db dưới `$XDG_DATA_HOME/omp`), `dirs.ts:890/894` (cache dưới `$XDG_CACHE_HOME/omp`), `dirs.ts:990` (run/daemons). `grep -n APP_NAME packages/utils/src/dirs.ts` trả về đúng 5 chỗ: 21, 360, 621, 961, 1084.
- **W3-2** — `packages/utils/test/logger-contract.test.ts:77` `logFileNames` lọc bằng regex `/^omp\.\d{4}-\d{2}-\d{2}\.\d+\.log(?:\.\d+)?$/`; `:135, :296, :333` đọc `.omp.${result.pid}-audit.json`. Harness `runScenario()` (:38-73) spawn `process.execPath --preload <preload> <probe>` với HOME/USERPROFILE trỏ vào mkdtemp và `PI_CONFIG_DIR: ".omp"`.
- **W3-3** — `packages/utils/test/dirs.test.ts:82` `expect(path.basename(getLogPath(date, 123))).toBe("omp.2026-05-31.123.log")` — 4 chỗ literal khác. `packages/tui/test/composer-shape-preview.test.ts:45,49,54,59` đều `expect(...).toContain("omp")`. `packages/tui/test/desktop-notify.test.ts` có 9 literal "omp" tại dòng 114,117,132,144,147,153,163,166,202. Lệnh trong plan không có `cd packages/utils`.
- **W3-4** — `sed -n '44,46p' packages/tui/src/overlays/composer-shape-preview.ts` → `/** Stand-in session title shown while the previewed session is unnamed. */ const PREVIEW_TITLE = "omp";`, dùng ở :62,64,66,111 và render bởi `setup/scenes/composer.ts:86`. `sed -n '955,961p' packages/utils/src/dirs.ts` → `getCrashLogPath` dùng `"omp-crash.log"` cứng, `getDebugLogPath` dùng `${APP_NAME}-debug.log`. Sweep `git grep -nE '"omp[-._][^"]*"' -- 'packages/**/src/**'`.
- **W3-5** — `sed -n '619,622p' packages/utils/src/dirs.ts` → `return path.join(getLogsDir(), `${APP_NAME}.${localDay(date)}.${pid}.log`)`. `packages/utils/src/stderr-guard.ts:105` `const redirectPath = options?.redirectPath ?? getLogPath();`. `packages/coding-agent/src/debug/report-bundle.ts:208,253`. `packages/coding-agent/src/main.ts:285`.
- **W3-6** — `sed -n '607,614p' packages/utils/src/dirs.ts`. Ngoài ra import surface đã có sẵn ở mọi nơi: `packages/utils/src/index.ts:5` `export * from "./dirs"`; `logger.ts:17` đã import `{ getLogsDir }` từ `"./dirs"`; `packages/tui/src/setup/wizard-overlay.ts:8` và `packages/coding-agent/src/cli/args.ts:5` đã dùng đúng pattern import `APP_NAME`. Không có chu trình import vì `dirs.ts` không import logger (`grep 'from "./logger"' packages/utils/src/dirs.ts` → rỗng).

### Bằng chứng — W4

- **W4-1** — `git grep -o 'PI_CONFIG_DIR' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` → 69; `git grep -l 'PI_CONFIG_DIR' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` → 26; of those, `grep -c '\.ts$' `→ 17, `\.md$` → 7, `\.rs$` → 2. Including the plan document the totals are 81 and 27.
- **W4-2** — `crash_handler.rs:269` `let config_override = std::env::var_os("PI_CONFIG_DIR");` with fallback `DEFAULT_CONFIG_DIR` = `".omp"` at :49, used at :286 and :344. `darwin.rs:439-446` `context.env.get("PI_CONFIG_DIR")... .unwrap_or(".omp")`. Confirmed by opening both files, not by grepping. `git grep -ln 'PI_CONFIG_DIR' -- '*.rs'` returns exactly these two.
- **W4-3** — `helpers.ts:1032` `await fs.promises.stat(path.join(dir, getConfigDirName()))` and `:1034/:1049/:1079` `path.join(dir, getConfigDirName(), 'plugins', 'installed_plugins.json')`, all inside `resolveActiveProjectRegistryPath` / `resolveOrDefaultProjectRegistryPath` walking up from a project cwd. By contrast `helpers.ts:49` `projectDir: CONFIG_DIR_NAME` already reads the constant directly and needs no change.
- **W4-4** — `dirs.ts:30` `export const MAIN_CONFIG_FILENAMES = ["config.yml", "config.yaml"] as const;` — a constant, no logic. Consumers loop and return on first load: `settings.ts:2129-2133` `for (const filename of MAIN_CONFIG_FILENAMES) { ... if (loaded) return { settings: loaded, configPath }; }`. Rebuild paths that would strand a cache: `refreshDirsFromEnv` at :484, `setAgentDir` at :502, `setProfile` at :541, plus the import-time `let dirs = new DirResolver({...})` at :449. Runtime env assigners: 8 files listed in step 6.
- **W4-5** — `bun test packages/utils/test/install-id.test.ts` → 5 pass / 0 fail / 11 expect() calls. `bun test packages/utils/test/dirs-python-gateway.test.ts` → 2 pass / 0 fail. Full `packages/utils` → 658 pass / 2 skip / 17 fail / 16 errors, failures confined to `logger-contract.test.ts` and `procmgr.test.ts` (`procmgr.test.ts` alone → 0 pass / 1 fail / 1 error). `bun test test/config-dir-dual-root.test.ts` (missing) → exit 1; `bun test ./test/install-id.test.ts` (real) → exit 0. `bun run check:ts` → exit 0.
- **W4-6** — `grep -n` on `packages/utils/src/dirs.ts`: `export function getInstallId(): string` → 1104; `// XDG is a Linux convention` → 340; "orphaning" → 348; `const appRoot = path.join(value, APP_NAME)` → 360; `// XDG flattens the agent/` → 384.

### Bằng chứng — W5

- **W5-1** — `git grep -rn 'parseConfigArgs' -- .` returns exactly three hits: the definition at `packages/coding-agent/src/cli/config-cli.ts:72`, and two plan documents (`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:12092` and `:13770`). A filesystem-wide `grep -rn` for the same symbol across `.ts`/`.tsx`/`.md`/`.js` adds no source hit. `git grep -rn 'runConfigCommand'` shows the only production caller is `config.ts:50`; `initXdg` is likewise called only from `config-cli.ts:183`.
- **W5-2** — `sed -n '259,290p' packages/utils/src/cli.ts` — `const argVal = args[argName]; if (argVal !== undefined && desc.options && typeof argVal === "string") { if (!desc.options.includes(argVal)) { throw new CliUsageError(`Expected ${argName} to be one of: ${[...desc.options].join(", ")}; got "${argVal}"`) } }`. `class CliUsageError extends Error` is at `packages/utils/src/cli.ts:38`. The `options: ACTIONS` binding is at `config.ts:18`.
- **W5-3** — `sed -n '163,186p' config-cli.ts` — the switch has arms for `list`, `get`, `set`, `reset`, `path`, `init-xdg` and no `default`. `git grep -n 'noImplicitReturns\|strict' -- tsconfig.json packages/coding-agent/tsconfig.json` returns nothing. The full `.oxlintrc.json` rule list (read in full) contains only prefer-const, no-unused-vars, no-thenable, no-unused-private-class-members, no-eval, no-shadow-restricted-names, no-template-curly-in-string, and a block of explicit `off` entries — no exhaustiveness rule.
- **W5-4** — `git grep -rn 'printConfigHelp' -- packages/` returns exactly one line: the definition at `packages/coding-agent/src/cli/config-cli.ts:405`. `sed -n '405,432p'` shows the Commands block and the Options block (`--json  Output as JSON`, which is also where a `--apply` row would belong if the function is ever revived). `command-help.ts:51` is `export const configHelp = { description: "Manage configuration settings" } satisfies CommandMetadata;` — no action list.
- **W5-5** — `awk 'NR>=336 && NR<=356 {print NR": "$0}' packages/utils/src/dirs.ts` — line 338 is `const isDefault = ...;`, 339 blank, 340 begins `// XDG is a Linux convention. On supported platforms, default profile state`, 351 is `// migrates it (e.g. by mkdir'ing the XDG profile dir).`, 352 is `let xdgData: string | undefined;`. `grep -n` confirms `const appRoot = path.join(value, APP_NAME);` at 360, `const profilePath = path.join(appRoot, "profiles", profile);` at 362, and the XDG-flatten comment at 384.
- **W5-6** — `sed -n '118,121p' packages/utils/src/dirs.ts` — `function getProfileConfigRoot(profile) { const root = getBaseConfigRoot(); return profile ? path.join(root, "profiles", profile) : root; }`, with `getBaseConfigRoot()` at 114-115 being `path.join(os.homedir(), getConfigDirName())`. The XDG profile existence guard is at `dirs.ts:361-365`. Verified on this machine: `ls ~/.omp/profiles` returns nothing, and a real `~/.omp` contains `agent/`, `cache/`, `logs/`, `run/`, `natives/`, `puppeteer/`, `ssh-control/`, `install-id`, `autoqa.db`, `gpu_cache.json`.
- **W5-7** — `bun test packages/coding-agent/test/config-cli.test.ts` → `0 pass / 1 fail / 1 error`, error text `Cannot find module '.../packages/natives/native/pi_natives.darwin-arm64.node' from '.../packages/natives/native/loader-state.js'`, EXIT=1. Same for `config-cli-credentials.test.ts`. `bun test packages/utils/test/install-id.test.ts` → `5 pass / 0 fail`, EXIT=0 — it imports `@oh-my-pi/pi-utils/dirs` (subpath), not the barrel. `packages/utils/package.json:36-39` declares `"./*": {"types": "./src/*.ts", "import": "./src/*.ts"}`. `bun test packages/utils/test/does-not-exist.test.ts` → EXIT=1, so the gate is red before the work exists. `bun run check:ts` → EXIT=0, measured twice, ~40s.
- **W5-8** — `sed -n '20,29p' config-cli.ts` — `flags: { json?: boolean; }` is the whole type. `sed -n '92,101p'` — the loop has an `if (arg === "--json")` branch and an `else if (!arg.startsWith("-"))` positional branch, with no other flag. `cat -n config.ts` — line 31-33 `static flags = { json: Flags.boolean({ description: "Output JSON" }) };`, line 44-46 `flags: { json: flags.json, }`. `packages/utils/src/cli.ts:243-258` is where an undeclared `--apply` would be rejected.
- **W5-9** — `sed -n '528,546p' packages/coding-agent/src/cli/gc-cli.ts` — `async function movePath(source: string, destination: string): Promise<void>` with the EXDEV branch. `git grep -rn 'movePath' -- packages/` returns exactly three lines: the definition at 528 and calls at 673 and 682 — confirming it is unexported and used only there. EXDEV handling is a recognised pattern across the repo: `session/session-manager.ts:235,300,2017,2054`, `lsp/edits.ts:364`, `internal-urls/url-filesystem.ts:407`.
- **W5-10** — `git grep -n 'PI_CONFIG_DIR' -- . | wc -l` → 78; `git grep -l 'PI_CONFIG_DIR' -- . | wc -l` → 27; `git grep -n 'PI_CONFIG_DIR' -- '*.ts' | wc -l` → 52; `git grep -l 'PI_CONFIG_DIR' -- '*.ts' | wc -l` → 17. Scoped to `packages/` only: 53 occurrences across 18 files, which is the closest reading to the plan's figure but still does not match it.

### Bằng chứng — W6 và W6a

- **W6-1** — `git grep -n CONFIG_DIR_NAME -- '*.ts'` returns 3 non-utils call sites that build project-root paths: `dirs.ts:590`, `omfg-controller.ts:285`, `discovery/helpers.ts:47`. `sed -n '275,295p' omfg-controller.ts` and `sed -n '40,55p' discovery/helpers.ts` confirm both. `omfg-controller.test.ts:15,178,198,202,215,220` confirm the literal `.omp/rules` assertions.
- **W6-2** — `sed -n '1,30p' packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` shows line 14. `legacy-pi-coding-agent-shim.ts:1592` is `export { CONFIG_DIR_NAME } from "@oh-my-pi/pi-utils";` and the docblock at :1587-1591 explains the export exists to avoid a Bun static-export failure during extension validation.
- **W6-3** — Both commands executed at HEAD 808b365; `node_modules/@oh-my-pi/pi-natives` is a symlink to `packages/natives` and resolves.
- **W6-4** — `grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts` → 27, 298, 590. `grep -n 'path.join(value, APP_NAME)'` → 360. `sed -n '24p;36p'` → APP_URL and USER_AGENT.
- **W6-5** — `ls` on the three paths returns "No such file or directory" for each. `package.json:93` `"check": "bun run --parallel check:ts check:rs"` and `:94` `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`.
- **W6-6** — Plan lines 8136, 8585, and the W5 detail paragraph (~8712) all name `~/.ultraworkers` as the new root.
- **W6a-1** — `git grep -n CONFIG_DIR_NAME -- '*.ts' ':!*test*'` → 9 hits, of which 4 are project-root: `dirs.ts:590`, `discovery/helpers.ts:47`, `omfg-controller.ts:285`, `config.ts:12`. `sed -n '35,60p' packages/coding-agent/src/discovery/helpers.ts` shows `projectDir` feeding `getProjectPath()` at :127-131. `sed -n '275,295p' packages/coding-agent/src/modes/controllers/omfg-controller.ts` shows the project-scope rules join. `sed -n '84,93p' packages/coding-agent/src/config.ts` shows `priorityList` feeding both `USER_CONFIG_BASES` and `PROJECT_CONFIG_BASES`. Confirmed that `omfg-controller.test.ts:15,178,198` and `agent-session-rules-reload.test.ts:89,156` hard-code `.omp` paths and therefore go red if the repointing is skipped — verified by reading those exact lines.
- **W6a-2** — Enumerated from `git grep -n CONFIG_DIR_NAME -- '*.ts'`: `dirs.ts:27/298/590`, `help-extra.ts:3,66`, `config.ts:4,12,135`, `discovery/helpers.ts:6,47`, `legacy-pi-coding-agent-shim.ts:1588,1589,1592`, `omfg-controller.ts:2,285`. `ls scripts/rename` → "No such file or directory", so `keep-list.txt` must be created. `sed -n '1,20p' packages/coding-agent/test/extensibility/legacy-pi-cli-exports.test.ts` confirms line 14 is the literal pin.
- **W6a-3** — Direct runs quoted above. Import list of `dirs.ts` confirmed via `sed -n '1,17p' packages/utils/src/dirs.ts` (`node:fs`, `node:os`, `node:path`, `../package.json`, `./fs-error`). The coding-agent failure output names the missing module and prints the two paths it tried.
- **W6a-4** — `git ls-files | grep '^\.omp/'` → 14 paths, enumerated in full. `ls -la .omp` → `commands/`, `skills/`, `tools/`.

### Bằng chứng — W7

- **W7-1** — `git grep -l '@oh-my-pi/' -- . | wc -l` = 4149; `git grep -o '@oh-my-pi/' -- . | wc -l` = 17697. Tập in-scope đếm bằng script với `git ls-files` + bốn `:(exclude)` = 4118 file / 17212 lượt.
- **W7-2** — `git cat-file -t 5873776` → `fatal: Not a valid object name 5873776`; `git rev-list --count 5873776..HEAD` → `fatal: unknown revision`. HEAD hiện tại: `84cbac9`.
- **W7-3** — `git grep -n '"\./' -- 'packages/*/package.json'` trả toàn khóa tương đối; `git grep -ln '"imports"' -- 'packages/*/package.json'` trả rỗng; `git grep -o '@oh-my-pi/' -- 'packages/*/package.json' package.json | wc -l` = 90.
- **W7-4** — `git grep -n '"name": "@oh-my-pi/' -- '**/package.json'` trả đúng 16 dòng; `git grep -n '@oh-my-pi/' -- package.json` trả đúng 12 dòng, liên tiếp :19–:30.
- **W7-5** — Số lượt: `@mariozechner/` = 34, `@earendil-works/` = 77, `@sinclair/typebox` = 25 — nhưng mẫu không thể khớp chúng. `git grep -c '@oh-my-pi/'` trên cả 4 file N2 = 0.
- **W7-6** — `git grep -lE '"oh-my-pi"' -- . | wc -l` = 16; danh sách gồm 15 file plan liệt kê cộng `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.
- **W7-7** — `git grep -c '@oh-my-pi/' -- 'packages/*/package.json'` cho từng file đều > 1 (coding-agent 12, snapcompact 6, tui 9, agent 8, metaharness 8) — tức phần lớn lượt không nằm ở dòng `name`.
- **W7-8** — `git grep -l '@oh-my-pi/' -- .lavish-wip` trả 13 file; `git grep -c '@oh-my-pi/' -- 'MILESTONE_*'` cho 112 lượt trên 4 file, suy ra `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` có 220 lượt.
- **W7-9** — `bun run check:ts` exit 0 ở HEAD `84cbac9` (14/14 workspace `check:types` Done, oxfmt sạch 5445 file). Lỗi native addon và ninja đã được xác nhận bằng lệnh thật trên máy này.
- **W7-10** — `git grep -n 'pi-natives-' -- . ':!bun.lock'` → `.github/workflows/ci.yml:326,1035` và `packages/natives/native/loader-state.js:70`. `git ls-files 'packages/natives*/package.json'` chỉ trả `packages/natives/package.json` — không có manifest leaf package nào trong repo.

### Bằng chứng — W8a

- **W8a-1** — `git grep -lE '"oh-my-pi"' -- . | wc -l` = 16; `git grep -lE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` = 15; `git grep -oE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` = 23. Phân loại 15 file bằng lệnh shell: 7 SRC, 7 TEST, 1 DOC.
- **W8a-2** — `git grep -nE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md'` trả 23 dòng; phân loại theo đường dẫn cho 7 SRC / 7 TEST / 1 DOC. `sed -n '1,3p' docs/provider-quirks.md` in tiêu đề; `sed -n '1706p' docs/provider-quirks.md` in dòng mô tả `mintZaiApiKey` và `KEY_NAME`.
- **W8a-3** — `sed -n '1,18p' packages/coding-agent/src/cli/gallery-fixtures/segments.ts` (khai báo hàm `createGallerySegmentContext`, comment dòng 23); `sed -n '20,45p'` và `sed -n '155,172p'` (hai literal); `sed -n '121,126p' packages/coding-agent/src/cli-commands.ts` (`name: "gallery"`); `sed -n '1,9p' packages/coding-agent/src/cli/gallery-cli.ts`.
- **W8a-4** — `grep -n 'KEY_NAME' packages/ai/src/registry/oauth/zai.ts` → 25 (khai báo), 167 (so sánh khoá hiện có), 171 (`postJson(keysUrl, { name: KEY_NAME })`); `sed -n '24,25p'` in comment. `grep -rn 'EXA_MCP_SOURCE' packages/coding-agent/src/` → 26 và 369 (`"x-exa-source": EXA_MCP_SOURCE`). `sed -n '610,640p' packages/coding-agent/src/mcp/oauth-flow.ts` → `registrationBody.client_name` và docblock về Figma allowlist.
- **W8a-5** — `ls packages/coding-agent/test/telemetry-export-otlp.test.ts` → No such file; `grep -n 'export' packages/coding-agent/src/telemetry-export-otlp.ts` → không có `SERVICE_NAME`; `cat packages/coding-agent/test/otel-resource-probe.ts` → dòng 37 `process.env.OTEL_SERVICE_NAME = "svc-probe"`, dòng 59 comment precedence; `sed -n '118,145p' packages/coding-agent/test/telemetry-export.test.ts` → mảng `probes` 3 phần tử và `expect(Object.fromEntries(results))`.
- **W8a-6** — `ls -la packages/coding-agent/test/extension-scope-canonicalization.test.ts` → No such file; `bun -e` đọc `.lavish-wip/m5-specs/W2.spec.json` → `test_files: ["packages/coding-agent/test/pi-scope-aliases.test.ts"]`. `bun run check:ts` exit 0, oxlint + oxfmt trên 5445 file, 16/16 package `check:types` Done.
- **W8a-7** — Vòng `for f in <15 file>; do grep -c -F '@oh-my-pi/' $f; done` cho 0,1,6,6,5,7,5,8,4,2,10,16,2,2,6 theo thứ tự bảng. `git grep -l '@oh-my-pi/' -- . | wc -l` = 4149 với 17697 lượt, nên phần lớn tập W7 là file mà W8a cũng nằm trong đó.
- **W8a-8** — `grep -cE '"oh-my-pi"' docs/extension-loading.md docs/porting-from-pi-mono.md` → 0 và 0. `awk 'NR>=228 && NR<=232'` → dòng 231 là bullet về `onLoad` hook với `@oh-my-pi/pi-catalog/models` và `@mariozechner/*`. `awk 'NR>=44 && NR<=52' docs/porting-from-pi-mono.md` → dòng 46-50 là bảng 5 map `@mariozechner/pi-*` → `@oh-my-pi/pi-*`.

### Bằng chứng — W8b

- **W8b-1** — `git grep -lE '(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)' -- '*.ts' | wc -l` → 599 (kiểm chứng lần hai bằng `grep -rlE <cùng biểu thức> --include='*.ts' .` → 599, khớp). `git grep -oE '<cùng biểu thức>' -- '*.ts' | wc -l` → 1853. HEAD 84cbac9.
- **W8b-2** — `git cat-file -t 5873776` → `fatal: Not a valid object name`; `git merge-base --is-ancestor 5873776 HEAD` → cũng lỗi. `git log --oneline -1` cho HEAD là 84cbac9.
- **W8b-3** — `ls scripts/rename/` → `No such file or directory`. `git ls-files scripts/rename/` → rỗng. Cả `keep-list.txt` lẫn `disposition.tsv` đều chưa tồn tại.
- **W8b-4** — §2.3 đánh số N1…N17; đếm hàng `^\| N[0-9]+` trong bảng §2.3 cho 17, mục cuối là N17. Con số 7 khớp với cột "7 vị trí" của hàng 19 §2.2 (danh tính wire), là thứ khác.
- **W8b-5** — `git grep -c '__omp_worker_' -- '*.ts' ':!*test*'` cho 30 dòng trên 14 file (blob-broker/server.ts 1, cli.ts 8, worker-selectors.ts 8, context-manager.ts 2, embed-client.ts 2, embed-worker.ts 1, predict/daemon.ts 1, activity-worker.ts 1, asr-client.ts 1, title-protocol.ts 1, tab-supervisor.ts 1, tts-client.ts 1, aggregator.ts 1, worker-host.ts 1). `git grep -ohE '__omp_worker_[a-z_]+' -- . | sort -u` cho 20 tên, trong đó `__omp_worker_test` và `__omp_worker_does_not_exist` là fixture test.
- **W8b-6** — `git grep -oE '"\.omp"' -- . | wc -l` → 280; `git grep -lE '"\.omp"' -- . | wc -l` → 94.
- **W8b-7** — `git grep -lE '"oh-my-pi"' -- . | wc -l` → 16.
- **W8b-8** — Trên tập 599: `git grep -c` cộng lại = 1768 dòng; `git grep -o` cộng lại = 1853 lượt. Riêng `packages/coding-agent/test/update-cli.test.ts`: `-c` → 58, `-o` → 59.


---


## Đính chính so với plan tổng (tiếp)

Phần này nối tiếp bảng ở phần trước: cùng bốn cột, cùng cách ghi. Mỗi dòng được đánh số `#N` **trong phạm vi work item của chính nó** (W9 #3 là dòng thứ ba của W9) — đó đúng là cách đánh số mà các bằng chứng chéo trong bảng gốc dùng. Ở những chỗ bảng gốc tự trỏ về "correction #3" hay "correction #7", dòng đó ghi rõ nó ứng với số hiệu nào trong bảng này. Dòng nào chồng lấn dòng khác — cùng một claim, cùng một con số, cùng một lỗi — đều ghi rõ trùng với dòng nào, không bỏ dòng nào đi. Work item cuối cùng ghi là `W13'`; đó là work item mà bảng gốc gọi bằng khoá `W13p`.

| work item | claim của plan | verdict | đính chính |
| --- | --- | --- | --- |
| W8b #1 | Enum `disposition` của W8b có 5 giá trị: rename \| keep-wire \| keep-path \| keep-worker-selector \| keep-doc-name. | Thiếu một giá trị — họ URL scheme `omp://` không rơi vào giá trị nào | **Đính chính:** Thêm giá trị thứ 6 `keep-scheme` (hoặc `keep-url-scheme`) với `keep_refs` trỏ tới một mục §2.3 mới — N18 — và câu hỏi mở tương ứng. Không gán vội `keep-wire`: đây KHÔNG phải hợp đồng bên thứ ba, và người dùng gõ `omp://` bằng tay. Không gán `rename` được: sẽ phá mọi transcript đã ghi.<br>**Bằng chứng:** `packages/coding-agent/src/internal-urls/omp-protocol.ts:28` → `readonly scheme = "omp"`. 24 file `.ts` tham chiếu `omp://` (`grep -l 'omp://'` trên tập 599 → 24). Module: `omp-protocol.ts` + `omp-scope.ts`; prompt: `packages/coding-agent/src/prompts/internal-urls/omp.md`. 10 file thuộc họ này nằm trong tập 599. |
| W8b #2 | Lệnh của W8b: `bun run check && bun run test:ts`. | Cổng KHÔNG chạy được trên máy này — phải tách | **Đính chính:** Dùng `bun run check:ts` làm cổng typecheck, và khai báo `test:ts` là NOT RUN — environment blocked, kèm lệnh gỡ chặn `brew install ninja && bun --cwd=packages/natives run build`. Tuyệt đối không ghi 'pass' cho một cổng chưa chạy. Cổng thật sự của W8b là Gate 0 và Gate 1 — cả hai là script đọc file, không cần test runner, nên đỏ được ngay trên máy này.<br>**Bằng chứng:** `bun run test:ts` exit 1, lỗi `Failed to load pi_natives native addon for darwin-arm64.` `bun run check` kéo theo `check:rs` (cargo). `bun run check:ts` chạy được, exit 0, đo 54.3s wall. |
| W8b #3 | Task mô tả W8b là "MỤC L DUY NHẤT của milestone". | Sai — Wave 3 có ba work item | **Đính chính:** Không có milestone nào có một mục duy nhất. Điều này không đổi việc gì cho W8b, nhưng nó có nghĩa là thứ tự trong wave là thật: W8b lập bảng trên cây SAU W7 và trước W9, và cả ba cùng phụ thuộc `scripts/rename/` mà chưa ai tạo.<br>**Bằng chứng:** §6.3: "Wave 3 — Work items: W7, W8a, W8b". W7 nằm ngay trước W8b, W8a nằm giữa. |
| W9 #1 | `scripts/ci-release-publish.ts:165` (`publishBin: { omp: "dist/cli.js" }`) — vị trí khai báo bin thứ nhất trong ba. | SAI số dòng (lệch 21 dòng). Nội dung thì đúng. | **Đính chính:** Dòng thật là `:186`. Kế hoạch trỏ sai dòng sẽ khiến kỹ sư không tìm thấy gì ở 165 và phải grep lại.<br>**Bằng chứng:** `grep -n publishBin scripts/ci-release-publish.ts` → khai báo type ở `:69`, dùng ở `:243`, `:298`, `:301`, và GIÁ TRỊ `publishBin: { omp: "dist/cli.js" }` ở `:186`. Đã đọc trực tiếp, dòng 165 là `{ dir: "packages/omptype", kind: "typescript", publishJs: true }` — không liên quan.<br>**Trùng:** W12 #1 nêu đúng claim này và cùng một dòng sai; dòng W9 này có thêm các vị trí dùng `:243`, `:298`, `:301` mà W12 #1 không nêu. |
| W9 #2 | `packages/coding-agent/src/cli.ts:179-186` — 8 hằng số selector. | SAI số dòng (thật là `:182-189`). | **Đính chính:** 8 hằng số nằm ở `cli.ts:182-189`. Dòng 179-181 là phần đuôi của `runSmokeTest()` và dấu `}`.<br>**Bằng chứng:** `grep -n '__omp_worker_' packages/coding-agent/src/cli.ts` → 182 TINY, 183 STATS_SYNC, 184 TAB, 185 JS_EVAL, 186 JS_EVAL_PROCESS, 187 STT, 188 TTS, 189 MNEMOPI_EMBED. Đúng 8, đúng thứ tự như kế hoạch liệt kê. |
| W9 #3 | `worker-selectors.ts:9,11,13,15,17,19,21` — 7 hằng số (BLOB_BROKER, COMPUTER, DAEMON_BROKER, IDA_HOST, LSP_MUX, STATS_ACTIVITY, TERMINAL_OUTPUT). | SAI — thiếu một hằng số ở `:23`, và danh sách tên trong §3.5 tự mâu thuẫn (nó liệt kê 7 dòng nhưng đếm tên là TERMINAL_OUTPUT chứ không có TEXT_PREDICT). | **Đính chính:** Thật là 8 hằng số ở `:9,11,13,15,17,19,21,23`; hằng số thứ 8 là `TEXT_PREDICT_WORKER_ARG` ở `:23`. Bỏ sót nó là bỏ sót selector `__omp_worker_text_predict` — worker dự đoán văn bản sẽ không bao giờ dispatch.<br>**Bằng chứng:** Đọc trực tiếp file. Xác nhận thêm bằng `cli.ts`: `runWorkerEntrypoint` so sánh đủ 16 hằng số, trong đó có `if (arg === TEXT_PREDICT_WORKER_ARG)`.<br>**Liên quan:** đây là dòng mà W9 #6 và W9 #12 gọi là "correction #3"; W9 #4 (16 loại) là hệ quả trực tiếp của nó cộng W9 #2. |
| W9 #4 | Có **15 loại selector** (mục nghiệm thu: "15/15 loại selector phân giải"). | SAI — thật là **16 loại**. Con số này xuất hiện ít nhất 4 lần trong kế hoạch (tiêu đề §3.5, chi tiết W9, nghiệm thu W9, mục sai lầm thứ ba). | **Đính chính:** 16 = 8 hằng số ở `cli.ts` + 8 hằng số ở `worker-selectors.ts`. Mọi con số phải nói 16, và cổng phải nói 16/16.<br>**Bằng chứng:** Đếm bằng `grep -hoE '^(export )?const [A-Z_]+_ARG'` trên cả hai file → đúng 16 tên hằng. Đối chiếu `runWorkerEntrypoint` bằng awk: 16 nhánh `if (arg === ...)` khớp 16 hằng, không thừa không thiếu. Danh sách 16: blob_broker, computer, daemon_broker, ida_host, lsp_mux, stats_activity, text_predict, terminal_output, tiny_inference, stats_sync, tab, js_eval, js_eval_process, stt, tts, mnemopi_embed. |
| W9 #5 | Bề mặt selector là **13 file** với **24 vị trí** khai báo/thật. | SAI ở cả hai con số, theo hai cách đo khác nhau — và số 13/24 bỏ sót một file nguồn thật. | **Đính chính:** Đo theo file NGUỒN (không tính test/tài liệu): **14 file, 30 vị trí**, gồm 25 literal mã + 5 dòng comment. Đo theo toàn repo (trừ chính file kế hoạch): **28 file, 97 lượt**.<br>**Bằng chứng:** `git grep -o '__omp_worker_' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \| wc -l` → 97. Tách: nguồn 30 lượt / 14 file; test 54 lượt / 9 file; tài liệu+snapshot 13 lượt / 5 file. 14+9+5=28, 30+54+13=97.<br>**Trùng:** con số "13 file" còn xuất hiện ở W9 #20 và W9 #21; 5 dòng comment mà câu này đếm chính là W9 #6. |
| W9 #6 | §3.5 liệt kê 4 dòng comment có chứa selector: `blob-broker/server.ts:2`, `embed-client.ts:119`, `embed-worker.ts:4`, `activity-worker.ts:4`. | SAI — có 5 dòng comment, và `predict/daemon.ts:3` bị bỏ sót hoàn toàn. | **Đính chính:** Thêm `packages/coding-agent/src/predict/daemon.ts:3` (`` ` * `__omp_worker_text_predict`, started through the `text-predict` global broker).` ``). Đây là comment của worker thứ 8 trong `worker-selectors.ts` — đúng cái hằng số mà correction #3 cho thấy kế hoạch đã bỏ sót. Ngoài ra `embed-client.ts` phải là `:122`, không phải `:119`.<br>**Bằng chứng:** grep từng file. `predict/daemon.ts:3` và `activity-worker.ts:4` đều là dòng docblock, đều nằm trong khoảng dòng 2-4 như `blob-broker/server.ts:2` và `embed-worker.ts:4` mà §3.5 đã liệt kê — bỏ sót đúng một file là bất đối xứng không thể giải thích bằng tiêu chí lọc nào.<br>**Liên quan:** "correction #3" ở đây là W9 #3; số 5 dòng comment này cũng là con số W9 #5 dùng để tách 30 vị trí nguồn. |
| W9 #7 | `embed-client.ts:35`, `stt/asr-client.ts:71`, `tts/tts-client.ts:134` là vị trí khai báo selector. | SAI cả ba số dòng (mỗi sai đúng 3, 1 và 1 dòng). Nội dung thì đúng — ba file này khai báo bản trùng của hằng số đã có ở `cli.ts`. | **Đính chính:** `embed-client.ts:38`, `asr-client.ts:72`, `tts-client.ts:135`.<br>**Bằng chứng:** `grep -n '__omp_worker_'` trên từng file. Tại `asr-client.ts:72` hằng số được dùng ở `:80` (`resolveWorkerSpawnCmd(STT_WORKER_ARG)`), còn `cli.ts:187` giữ bản trùng và dùng ở `:258` — hai chuỗi chỉ khớp nhau vì chúng bằng nhau, không phải vì cùng tham chiếu.<br>**Liên quan:** đây là dòng mà W9 #19 gọi là "correction #7". |
| W9 #8 | `packages/coding-agent/src/subprocess/worker-client.ts:132` (fallback PATH `$which("omp")`). | SAI số dòng — `:132` là dấu `];` đóng mảng `candidates`. | **Đính chính:** `$which("omp", ...)` nằm ở `:131`; comment giải thích nó nằm ở `:130`.<br>**Bằng chứng:** `grep -n 'which("omp"'` → `131`. Đã đọc `:120-140` để xác nhận ngữ cảnh: 131 là phần tử cuối của mảng `candidates`, 132 là `];`. |
| W9 #9 | `packages/coding-agent/src/cli/completion-gen.ts` có **109** lượt `omp`, "phải sinh lại cho tên mới". | SAI TRONG CÁCH ĐẾM, và nguy hiểm vì nó gợi ý sai việc phải làm. 109 là con số đúng cho một `grep -o omp` thô — nhưng 109 đó phần lớn KHÔNG phải thương hiệu. | **Đính chính:** Trong 109 lượt thô, **58 nằm trong chữ `completion`/`complete`** (CompletionFlag, generateCompletion, `__complete`, ...). Chỉ **29 lượt** là token thương hiệu đứng riêng (đếm bằng `grep -oE '(^\|[^a-zA-Z])omp([^a-zA-Z]\|$)'`), và tất cả đều là TÊN HÀM SHELL trong script được sinh ra: `_omp`, `_omp_root`, `_omp_comma`, `_omp_call`, `_omp_tools`, `_omp_models_list`, `_omp_commands`, `_omp_cmd_*`, `__fish_omp_no_subcommand`. QUAN TRỌNG NHẤT: tên binary KHÔNG ghim trong file này. Nó đến qua `spec.bin` ← `config.bin: APP_NAME` tại `commands/completions.ts:29`. Nghĩa là W3 đã làm phần việc lớn nhất của W9 ở file này rồi, và lệnh `omp completions bash` sẽ tự phát ra tên mới.<br>**Bằng chứng:** `grep -oiE 'complet[a-z]*' completion-gen.ts \| wc -l` → 58. `grep -o omp \| wc -l` → 109. `grep -oE '(^\|[^a-zA-Z])omp([^a-zA-Z]\|$)' \| wc -l` → 29. Đã đọc `completion-gen.ts:149` (`return { bin: config.bin, ... }`), `:226,303` (`complete -F _omp ${bin}`), `:371,453` (`compdef _omp ${bin}`), `:498` (`complete -c ${bin}`), và `completions.ts:29` (`const config: CliConfig = { bin: APP_NAME, ... }`; dòng 46 còn gợi ý ghi ra `~/.config/fish/completions/${APP_NAME}.fish`). Nhận xét thêm: đổi `_omp` thành `_ultraworkers` là TÙY CHỌN và an toàn về mặt kỹ thuật vì fish chỉ dùng chuỗi `-n '__fish_omp_no_subcommand'` làm điều kiện, không yêu cầu khớp tên lệnh — nhưng nó đổi quy ước tên file autoload của zsh (`:447` ghi rõ "autoloaded from $fpath (file named _omp)"). |
| W9 #10 | Độ phủ của `bun run ci:test:smoke` là **2 trong 15** loại selector (stats sync + tiny model), theo AGENTS.md. Sai lầm thứ ba của W9: "coi `ci:test:smoke` là phủ đủ — nó phủ 2/15". | SAI, và sai theo HƯỚNG NGƯỢC LẠI so với mối lo sợ của kế hoạch: độ phủ cao hơn nhiều, không phải thấp hơn. Đây là correction quan trọng nhất của đặc tả này vì nó đổi hình dạng của cổng. | **Đính chính:** `runSmokeTest()` tại `cli.ts:136-179` gọi **14 hời gọi `await smokeTest*`**, ánh xạ tới **13 loại selector trên darwin** và **14 loại trên Linux**. Riêng 2 loại không được smoke nào chạm tới: `tab` và `js_eval_process`. Nói cách khác: smoke phủ 13/16 trên máy dev, không phải 2/16.<br>**Bằng chứng:** Đã đọc `cli.ts:136-179` và map từng lời gọi: SyncWorker→stats_sync, StatsActivity→stats_activity, TinyTitle→tiny_inference, Stt→stt, JsEval→js_eval, Computer→computer, Tts→tts, MnemopiEmbed→mnemopi_embed, DaemonBroker→daemon_broker, LspMux→lsp_mux, IdaHost→ida_host, BlobBroker→blob_broker, TerminalOutput→terminal_output, TextPredict→text_predict. Xác nhận mỗi client đi qua `resolveWorkerSpawnCmd(<CONST>)` bằng `grep -c 'resolveWorkerSpawnCmd\\\|workerHostEntry'` trên 19 file client. Đối chiếu: `git grep -c resolveWorkerSpawnCmd` cho thấy mỗi smoke client có mặt trong danh sách. |
| W9 #11 | AGENTS.md (dòng 62) là nguồn của con số "2/15": "`omp --smoke-test` spawns the stats sync worker and the tiny-model subprocess, pings them, and exits". | TÀI LIỆU ĐÃ CŨ — và nó là nguồn gốc của correction #11. AGENTS.md là file W9 buộc phải sửa, nên nó phải được cập nhật trong cùng commit. | **Đính chính:** Câu này mô tả một bản `--smoke-test` cũ. Code hiện tại spawn 14 worker. Nếu kỹ sư tin AGENTS.md, họ sẽ tưởng smoke chỉ phủ 2 loại và bỏ qua 11 loại khác — tức là bỏ qua chính những thứ W9 đang cố bảo vệ.<br>**Bằng chứng:** So sánh trực tiếp `AGENTS.md:62` với `cli.ts:151-179`. Ngoài ra AGENTS.md còn có 5 lượt `__omp_worker_` (dòng 52 và 57 trong khối tài liệu 'Worker scripts') phải đổi theo tên mới.<br>**Trùng:** "correction #11" trong verdict của bảng gốc trỏ về dòng độ phủ smoke; ở bảng này đó là W9 #10. Phần 11 dòng mang tên cũ trong AGENTS.md được đếm ở W13 #8. |
| W9 #12 | Phần thứ hai của cảnh báo độ phủ: `stats_sync` không được smoke chạm tới. | ĐÚNG — nhưng kế hoạch gắn nó sai chỗ và không nêu cơ chế. | **Đính chính:** `smokeTestSyncWorker` tại `packages/stats/src/aggregator.ts:193-194` là `if (process.platform === "darwin") return;` ngay dòng đầu của hàm. Docblock ở `:186-189` giải thích: worker spawn surface không reachable từ CLI trên macOS, và probe dưới hardened runtime sẽ chạm lại vào Bun-worker abort surface. Hệ quả: trên darwin, `__omp_worker_stats_sync` — chính là LITERAL THÔ khó chạm nhất — không có cổng nào chạm tới. Chỉ CI Linux bắt được.<br>**Bằng chứng:** Đã đọc `aggregator.ts:186-200`. `process.platform` cũng xuất hiện ở `lsp/mux/daemon.ts:325`, `ida/client.ts:477`, `predict/client.ts:329` nhưng chỉ để chọn đường ố trên win32 — không skip, nên không ảnh hưởng độ phủ. |
| W9 #13 | `profile-alias.ts:30-33` (mặc định `display`/`posix`/`fish`/`powerShell`) và `:157-158` (chốt chặn alias che lệnh gốc). | HAI DÒNG ĐÚNG, NHƯNG CHỈ MỘT PHNĂN. File này có **13** token `omp` đứng riêng, không phải 6 dòng. | **Đính chính:** Thêm 4 vị trí mà kế hoạch không nhắc, và 2 trong số đó là bẫy tương thích thật: `:268` (`posixJoinUnc(configHome, "fish", "conf.d", "omp-profiles.fish")` — TÊN FILE trên đĩa mà tool ghi ra), `:286-287` + `:309-310` (marker `# >>> omp profile alias: ... >>>` mà `upsertBlock` đọc ngược từ file rc của người dùng), `:292` (`--wraps omp` trong thân hàm fish). Bắt buộc phải đổi: `:30-33` (lệnh alias gọi), `:157-158` (chốt chặn — CẦN NHÁNH THỨ HAI cho tên mới như plan đã nói đúng), `:292` (nếu không, alias fish gọi lệnh cũ). Cần quyết định: `:268` và `:286-287,309-310`.<br>**Bằng chứng:** Đã đọc `profile-alias.ts:200-330`. `upsertBlock` tại `:308-327` làm `content.indexOf(start)` với `start` dựng từ chuỗi marker ở `:309`; trả -1 thì rơi vào nhánh append ở `:325-326`. Còn `resolveProfileAliasCommandFromProcess` (`:200-222`) trả `DEFAULT_ALIAS_COMMAND` khi `compiled` — tức bản compiled binary dùng đúng giá trị ở `:30-33`. |
| W9 #14 | Ca test (2): `packages/coding-agent/test/worker-selector.test.ts` (đã tồn tại) vào gate, khẳng định TẤT CẢ loại selector khớp tiền tố. | SAI — file tồn tại nhưng KHÔNG khẳng định điều đó. Không có ca nào trong file liệt kê hay so sánh bộ selector. | **Đính chính:** File có 7 ca: selector lạ → exit 1 + stderr; `workerHostEntry` được khai báo trước dispatch; root flag bình thường không bị đụng; selector IPC không có kênh IPC thì thoát nhanh; hai ca reap orphan (js_eval_process); PID 1 trong container; và computer worker entry side-effect-free. Toàn bộ chuỗi `__omp_worker_` trong file là `__omp_worker_does_not_exist` (cố ý sai) và `__omp_worker_js_eval_process`. Nó vẫn bắt được một lớp lỗi (đổi tiền tố mà quên literal thì ca 'unknown selector' sẽ đỏ vì chuỗi cũ không còn được nhận là selector) — nhưng đó là hệ quả, không phải thiết kế, và nó KHÔNG bắt được trường hợp ngược lại (đổi tiền tố nhưng bỏ sót một hằng số cũ ở nơi khác). Cần một ca parity MỚI.<br>**Bằng chứng:** Đã đọc toàn bộ 215 dòng. `grep -n '__omp_worker_'` → 8 lượt, đúng hai giá trị khác nhau. Không có import nào của `WORKER_HOST_SELECTOR_PREFIX` hay của `worker-selectors.ts` trong file.<br>**Trùng:** cùng một file này xuất hiện trong 9 file test có `__omp_worker_` mà W11 #3 phân loại. |
| W9 #15 | Ca test (4): "một kiểm tra CI khẳng định mọi literal `__<brand>_worker_` còn lại đều dẫn xuất từ `WORKER_HOST_SELECTOR_PREFIX`". | HỢP LÝ VỀ Ý, SAI VỀ CƠ CHẾ — và nó sẽ đụng luật của AGENTS.md. | **Đính chính:** AGENTS.md cấm source-grep trong test: khẳng định trên TEXT của file nguồn là kiểm tra "code trông thế nào", đỏ vì refactor vô hại và xanh khi hành vi hỏng. Có hai lối thoát đúng: (a) CÁCH ĐÃ CÓ SẴN TRONG REPO — `packages/coding-agent/test/fixtures/compiled-worker-selector-host.ts:5` viết `${WORKER_HOST_SELECTOR_PREFIX}stats_sync`. Áp dụng đúng mẫu đó cho 3 literal thô và 5 cặp trùng lặp, sau đó KHÔNG CÒN literal nào để quét, và cổng chuyển sang một ca runtime parity thuần. (b) Nếu vẫn muốn một kiểm tra CI quét, nó phải là script trong `scripts/`, không phải test — và phải chạy SAU khi (a) đã xong, lúc đó nó chỉ còn là lưới an toàn.<br>**Bằng chứng:** Đã đọc `packages/coding-agent/test/fixtures/compiled-worker-selector-host.ts:2,5,23` — dùng `WORKER_HOST_SELECTOR_PREFIX` để dựng selector và `arg.startsWith(WORKER_HOST_SELECTOR_PREFIX)` để nhận diện. Đường import là `@oh-my-pi/pi-utils/worker-host` (xác nhận qua `cli.ts:31` và subpath `./*` của `packages/utils/package.json`). |
| W9 #16 | Môi trường: `bun test` bị chặn hoàn toàn — mọi test báo `0 pass / 1 fail / 1 error` với lỗi addon native. | SAI — chặn có chọn lọc, và cách hiểu sai này sẽ làm kỹ sư bỏ một cổng đang chạy tốt. | **Đính chính:** Đo thật trên máy này: `bun test packages/utils/test/worker-host.test.ts` → **4 pass / 0 fail**, chạy được NGAY không cần build. `cd packages/coding-agent && bun test test/profile-alias.test.ts` → **23 pass / 0 fail**, cũng không cần build. Chỉ `bun test test/worker-selector.test.ts` mới đỏ (`Failed to load pi_natives native addon for darwin-arm64`) vì nó import `@oh-my-pi/pi-utils/procmgr`. Nghĩa là HAI file test quan trọng nhất cho tiền tố và cho chốt chặn alias đều chạy được, và cổng phải dựa vào chúng chứ không dựa vào file bị chặn.<br>**Bằng chứng:** Đã chạy cả ba lệnh, kết quả nêu trên. `worker-selector.test.ts:3` import `isPidRunning` từ `@oh-my-pi/pi-utils/procmgr` — đó là đường kéo addon native. Ngoài ra `bun run check:ts` đã chạy thật và exit 0 (pi-metaharness chậm nhất 39.85s, còn lại dưới 40s). |
| W9 #17 | Lệnh kiểm của W9: `bun run check && bun run ci:test:smoke && (cd packages/coding-agent && bun test test/worker-selector.test.ts test/profile-alias.test.ts)`. | Không chạy được trên máy này, và cổng đề xuất sẽ ĐỎ với lý do không liên quan tới W9. | **Đính chính:** `bun run check` kéo `check:rs` cần cargo/ninja; `bun test .../worker-selector.test.ts` đỏ vì addon chưa build. Người đọc sẽ không phân biệt được 'W9 làm hỏng' với 'máy chưa build'. Đặc tả này thay bằng cổng 3 tầng, tầng nào cũng phân biệt được hai trường hợp (xem trường `gate`).<br>**Bằng chứng:** Đã chạy `bun test test/worker-selector.test.ts` → `0 pass / 1 fail / 1 error`, lỗi nêu ở correction trên. `which ninja` → không có, khớp với ghi chú môi trường (cmake của opusic-sys cần ninja).<br>**Trùng:** cùng một khuôn cổng đỏ-vì-môi-trường này xuất hiện ở W11 #8, W12 #5 và W13 #10; W8b #2 là biến thể của nó. |
| W9 #18 | Ba khai báo bin là toàn bộ bề mặt tên lệnh. | THIẾU MỘT — `packages/stats/package.json:27` khai báo `"bin": { "omp-stats": "./src/index.ts" }`. | **Đính chính:** Đây là tên lệnh thứ tư được cài vào PATH, kế hoạch không nhắc ở đâu cả. Nó không thuộc N17 (N17 giữ BASENAME của gói, không giữ tên bin). Đã đưa thành open_questions[2] thay vì tự quyết.<br>**Bằng chứng:** Duyệt `bin` bằng `node -e` trên mọi package.json: coding-agent `{omp}`, metaharness `{metaharness}`, mnemopi `{mnemopi}`, stats `{omp-stats}`. Ngoài ra `packages/coding-agent/package.json:13` có `"homepage": "https://omp.sh"` và `:538` có `"@oh-my-pi/omp-stats"` — CẢ HAI đều không thuộc W9 (N9 chặn homepage tới khi có domain mới; N17 giữ basename). |
| W9 #19 | §3.5 nói 3 chuỗi thô ở `context-manager.ts:1010`, `tab-supervisor.ts:1615`, `aggregator.ts:130` "không dẫn xuất từ hằng số nào cả". | ĐÚNG, và đây là phần tốt nhất của §3.5 — giữ nguyên, chỉ bổ sung. | **Đính chính:** Xác nhận cả ba dòng và tìm ra mối liên hệ mà kế hoạch chưa nói: mỗi cái đều trùng với một hằng số ĐÃ TỒN TẠI ở `cli.ts` — `JS_EVAL_WORKER_ARG` (:185) ↔ `:1010`, `TAB_WORKER_ARG` (:184) ↔ `tab-supervisor.ts:1615`, `STATS_SYNC_WORKER_ARG` (:183) ↔ `aggregator.ts:130`. Nghĩa là fix không cần hằng số mới, chỉ cần làm spawn site dùng hằng số đã có. Điều này làm diff nhỏ hơn kế hoạch tưởng.<br>**Bằng chứng:** `cli.ts:182-189` liệt kê 8 hằng; so từng cặp với 3 literal thô, giá trị khớp từng ký tự. Ngược lại, 5 hằng trùng lặp (STT/TTS/MNEMOPI_EMBED/TINY/JS_EVAL_PROCESS) nằm ở file KHÁC và được dùng ở client khác — xem W9 #7 ("correction #7" của bảng gốc). |
| W9 #20 | Số 13 file trong tiêu đề W9 bao trọn bề mặt selector. | Thiếu hai đích test mà CHÍNH kế hoạch đã nhắc tên chung: `test/eval/worker-core.test.ts` (30 lượt) và `test/fixtures/computer-worker-cli-selector.ts` + `test/eval/process-entry-import.test.ts` (mỗi cái 1). | **Đính chính:** Nhưng cả ba KHÔNG nên đổi: `worker-core.test.ts` dùng `__omp_worker_core_gate` là tên thuộc tính `globalThis` (không liên quan worker host), `__omp_worker_test` trong `executable-fallback.test.ts` (8 lượt) là argv tùy ý chỉ để chuyển tiếp, `__omp_worker_does_not_exist` là selector cố ý sai. Ba file test `issue-1606/3031/7352-repro.test.ts` chỉ chứa selector trong DOCBLOCK, không phải literal. Đã đưa thành open_questions[5].<br>**Bằng chứng:** `git grep -o '__omp_worker_' \| cut -d: -f1 \| sort \| uniq -c \| sort -rn` → 30 / 8 / 8 / 8 / 8 / 2 / 2 / 2 rồi 1. Đã đọc `worker-core.test.ts:105,113,155,222,291` (gán `globalThis.__omp_worker_core_gate`) và `executable-fallback.test.ts:35,59,83,139` (`resolveWorkerSpawnCmd("__omp_worker_test")`). Đọc `issue-1606-repro.test.ts:11`, `issue-3031-repro.test.ts:13`, `issue-7352-repro.test.ts:6` — cả ba là dòng ` * `.<br>**Trùng:** cùng bộ ba `issue-*-repro.test.ts` và `worker-core.test.ts` được phân loại lại ở W11 #3. |
| W9 #21 | Không có gì trong repo ngoài 13 file selector chứa chuỗi này. | SAI — có một file KHÔNG PHẢI selector thật, và `sed` toàn repo sẽ bắt nó. | **Đính chính:** `crates/pi-natives/src/utok/claude/testdata/fixtures.json` có 5 lượt `__omp_worker_` nằm trong trường `"text"` của một snapshot tokenizer (dòng 2919 chứa nguyên văn AGENTS.md). Nó KHÔNG phải mã. Đừng sed nó: fixture đo hành vi tokenizer trên văn bản thật, đổi nội dung là đổi điều kiện thử chứ không phải đổi sản phẩm.<br>**Bằng chứng:** `grep -n` hiện dòng 2919 với nội dung là text AGENTS.md. `git grep -ln fixtures.json -- crates/pi-natives` cho thấy `src/utok/claude/mod.rs` và `src/utok/tests/claude.rs` dùng nó — đó là test tokenizer Rust. |
| W10 #1 | `.github/workflows/ci.yml` has 53 occurrences of `omp` across 50 lines. | WRONG in both numbers. | **Đính chính:** On HEAD 84cbac9 ci.yml is 1330 lines and has 65 raw `omp` occurrences across 62 lines. Of those, 55 are genuine brand references and 10 are English substrings that must not be touched (completion, compressing, compliance, compares, Compute, compiled, compileCodingAgent, cross-compiles x2, cross-compile, cross-compiled, .prompt x2, promptTemplates, openai-completions, OpenAI-compatible). Any mechanical pass over this file is therefore wrong on ~15% of its matches even before the substring traps in the Docker files are considered. The plan's own §2.4 lesson — pin the regex or two people will argue about numbers that do not correspond to code — applies here and the plan did not apply it to itself.<br>**Bằng chứng:** `grep -o omp .github/workflows/ci.yml \| wc -l` → 65; `git grep -c omp -- .github/workflows/ci.yml` → 62; `grep -o -E '[A-Za-z0-9_./-]*omp[A-Za-z0-9_./-]*' .github/workflows/ci.yml \| sort \| uniq -c` lists every token shape. |
| W10 #2 | `omp-kata` appears in 11 `runs-on:` lines in ci.yml: 10 expression form (:148,:237,:359,:381,:398,:415,:432,:451,:477,:492) and 1 bare label (:191). | WRONG — 12 lines, and every line number is stale. | **Đính chính:** 12 lines: 10 expression form and 2 bare labels (:229 and :513). All 12 plan line numbers are stale because the file has grown since the plan was written. The conclusion the plan draws from this count — do not rename the label, it is registered outside the repo (§3.2) — is CORRECT and is carried forward unchanged. Only the arithmetic and the anchors were wrong.<br>**Bằng chứng:** `grep -rn "runs-on:.*omp-kata" .github/workflows/ \| wc -l` → 12; bare-label form: `grep -rn 'runs-on: omp-kata' .github/workflows/ \| wc -l` → 2 (ci.yml:229, ci.yml:513). |
| W10 #3 | The robomp image job "runs least often, so [Dockerfile.robomp] will be missed longest". | WRONG, and the truth is worse than the plan says. | **Đính chính:** There is NO robomp image CI job, and no image-building CI job of any kind. CI never builds a Docker image. `Dockerfile.robomp` and `python/robomp/docker-compose.yml` therefore have ZERO automated coverage — not 'least often', but never. Neither is the install matrix: `scripts/install-tests/run-ci.sh` is referenced only by `package.json:124` and by comments; no GitHub workflow calls it. The plan's acceptance criterion 'the install matrix passes for binary, source-link and tarball' is a LOCAL, MANUAL step that no gate in the plan or the repo can enforce. This is the single most important correction in the item, because it changes what 'done' means: W10's verification is almost entirely human-run.<br>**Bằng chứng:** `git grep -n 'docker\\\|Dockerfile\\\|pi:image' -- .github/workflows/ci.yml` → exactly one line (:864, a `docker run` of an already-built musl binary on alpine). `git grep -n 'run-ci\.sh\\\|install-tests\\\|run-podman'` → the only executable reference is `package.json:124`. No workflow file mentions it. |
| W10 #4 | `Dockerfile:13,14,17,18,21,178`, including a `pi-base` tag variant, and `Dockerfile.dockerignore:1`, and `Dockerfile.robomp:5,12,19` — four Docker files. | MIXED — one anchor points at a comment, one points at the wrong line, and the file count is 7 not 4. But the plan's central conclusion is right, and right for a stronger reason than it gives. | **Đính chính:** `Dockerfile:21` is `#     ARG PI_BASE=oh-my-pi/pi:dev` — a usage-example COMMENT in the header block, not a build directive. `Dockerfile` defines NO `ARG PI_BASE` at all; the only two `PI_BASE` lines in the file are the comments at :21 and :22. `Dockerfile:178` is not a brand line (:179 is the shim's exec line; the shim is written at :180-181). `Dockerfile.dockerignore:1` is correct. `Dockerfile.robomp:5,12,19` are all correct. The file count is wrong: there are 7 Docker-related files in the blast radius — `.dockerignore`, `Dockerfile.dockerignore`, `Dockerfile.robomp.dockerignore` (the last two unlisted), plus `python/robomp/docker-compose.yml` and `package.json:139,140,148` which carry the SAME tag. The corrected picture is cleaner: the tag has exactly FOUR load-bearing code sites (Dockerfile.robomp:19, docker-compose.yml:23, package.json:139, :140, :148) and every other occurrence in the Docker surface is a comment. That is a better story than the plan's, because it means Dockerfile itself need not change for the build to work.<br>**Bằng chứng:** `grep -n '^[[:space:]]*ARG PI_BASE' Dockerfile` → no output (verified). `awk 'NR>=18&&NR<=24' Dockerfile` shows :21-22 are `#`-prefixed comments. `git grep -n 'oh-my-pi/pi:dev'` returns Dockerfile:13,14,17,18,186 (comments), Dockerfile.robomp:19, docker-compose.yml:23, package.json:139,140,148. |
| W10 #5 | `scripts/ci-update-brew-formula.ts` has 18 occurrences, at lines 76,78,81,83,89,91,94,96 and 120. | WRONG on the count and INCOMPLETE on the anchors in the way that matters most. | **Đính chính:** 28 raw occurrences on 22 lines (21 brand). The 9 anchors the plan lists are the URL/sha/targets lines. The four the plan OMITS are the ones that decide the name the user ends up typing: :101 `bin.install Dir["omp-*"].first => "omp"`, :102 `(bin/"omp").chmod 0555`, :104 `generate_completions_from_executable(bin/"omp", …)`, :109 `shell_output("#{bin}/omp --version")`. A rename that follows the plan's anchor list exactly produces a Formula that downloads the new asset and installs it under the OLD command name. The plan also does not flag :15 `HOMEPAGE = "https://omp.sh"`, which is APP_URL and is keep-list entry N9.<br>**Bằng chứng:** `grep -o omp scripts/ci-update-brew-formula.ts \| wc -l` → 28; `grep -n omp scripts/ci-update-brew-formula.ts` lists all 22 lines; file is 135 lines. |
| W10 #6 | The brew branch has no automated net: `test:scripts` at package.json:91 omits `ci-update-brew-formula.test.ts`, and `git grep ci-update-brew-formula.test` returns nothing repo-wide. | CORRECT — verified verbatim, and it is the plan's best catch in this item. | **Đính chính:** No correction. package.json:91 matches the plan's quotation character for character, the file exists, and the only repo-wide hit for its name is inside the plan document itself. The plan's remedy — add the file to `test:scripts` before the rename so it functions as a tripwire — is the right sequencing and is step 1 here. One addition to the plan's framing: the tripwire is only meaningful if the engineer records the RED run between the code change and the fixture update; a PR that shows only the green run has not shown that the guard works.<br>**Bằng chứng:** `git grep -n test:scripts -- package.json` → the five-file list, no brew test. `git ls-files 'scripts/*.test.ts'` → ci-update-brew-formula.test.ts present. `bun test scripts/ci-update-brew-formula.test.ts` → 3 pass / 0 fail, 166ms. |
| W10 #7 | §3.1's producer literals are at `ci-release-build-binaries.ts:37,44,51,58,65,72,79,86` and the consumer builds names from APP_NAME at `update-cli.ts:1205-1209`. | CORRECT — all 8 producer lines confirmed exactly; consumer off by one line but semantically right. | **Đính chính:** No correction to the producer — all 8 anchors are exact, and they are the anchors the whole item hangs on. The consumer is at :1206 and :1208, not the 1205-1209 range, but that is a two-line if/return and the substance is right: it derives from APP_NAME and needs no edit in W10. The one thing the plan does not say, and should: there are TWO further hardcoded consumers of the same asset name that APP_NAME does not cover — `scripts/install.sh:241` and `scripts/install.ps1`. Those break silently in exactly the way §3.1 describes, and they are not in the plan's file list at all.<br>**Bằng chứng:** `git grep -n 'outfile: "packages/coding-agent/binaries/' scripts/ci-release-build-binaries.ts` → 8 lines at 37,44,51,58,65,72,79,86. `git grep -n 'APP_NAME}-' -- packages/coding-agent/src/cli/update-cli.ts` → :1206, :1208. `grep -n 'BINARY=' scripts/install.sh` → :241. |
| W10 #8 | W10's scope is `.github/workflows/ci.yml`, four Docker files, `ci-update-brew-formula.ts`, `flake.nix`, `scripts/install-tests/`, and branch references. | UNDERCOUNTED — 8 files listed against 31 in the actual blast radius. | **Đính chính:** The plan omits, among others: `nix/package.nix` (the file that actually builds the package and the only place a mistake is LOUD rather than silent — its own build-time smoke test invokes the binary it just installed), `nix/home-manager.nix`, `nix/nixos-module.nix`, `nix/dev-shell.nix`, `scripts/install.sh`, `scripts/install.ps1`, `scripts/link-omp.sh`, `scripts/ci-macos-sign.sh`, `.dockerignore`, `Dockerfile.robomp.dockerignore`, `python/robomp/docker-compose.yml`, `package.json:139,140,148`, and `infra/runner.Dockerfile`. The two most consequential omissions are `scripts/install.sh` (a second hardcoded consumer of the release asset name — the same producer/consumer split §3.1 is built around, on the install path most users actually take) and `nix/package.nix` (the only surface where the rename fails loudly instead of silently).<br>**Bằng chứng:** `git grep -l omp -- scripts/ .github/ nix/ Dockerfile* .dockerignore flake.nix python/robomp/docker-compose.yml infra/` enumerates the full set; `git ls-files \| grep -i docker` returns 7 Docker-related files; per-file `grep -o omp \| wc -l` counts are recorded in files_touched. |
| W10 #9 | `test:scripts` is a valid gate command for W10, i.e. `bun run test:scripts && bash scripts/install-tests/run-ci.sh`. | WRONG as a gate — it is red on arrival for reasons unrelated to the rename. | **Đính chính:** `bun run test:scripts` currently returns 34 pass / 1 fail / 1 error, exit 1 — the failure is `Failed to load pi_natives native addon for darwin-arm64`, raised by `scripts/ci-test-ts.test.ts` only (it spawns the full packages/* TS suite). The four release test files in that same command all pass. So the command cannot distinguish 'rename complete' from 'native addon missing', which is precisely the distinguishability the plan's own gates require. Substitute: the five-file `bun test` invocation used in verification block A (verified 37 pass / 0 fail on HEAD 84cbac9), plus `bun run check:ts`. Separately, the second half of the plan's gate cannot run on this machine at all: `run-ci.sh:87` invokes `bun --cwd=packages/natives run build`, which fails with `CMake was unable to find a build program corresponding to "Ninja"` — `brew install ninja` is a prerequisite. `bazel` is also absent; the docker daemon is up; `podman` is absent.<br>**Bằng chứng:** `bun run test:scripts` → '34 pass / 1 fail / 1 error', stderr names scripts/ci-test-ts.test.ts and the pi_natives loader. `bun test scripts/ci-release-build-binaries.test.ts scripts/musl-release.test.ts scripts/ci-release-publish.test.ts scripts/release.test.ts scripts/ci-update-brew-formula.test.ts` → '37 pass / 0 fail'. `which ninja bazel podman` → all absent; `which docker` → present, daemon up. |
| W10 #10 | The self-hosted runner label `omp-kata` is the only identity registered outside the repository that M5 must not touch; branch references are mentioned only as 'branch references in .github'. | UNDERSTATED — there is a second externally-registered identity of exactly the same kind, and it is in the file the item is mostly about. | **Đính chính:** `.github/workflows/ci.yml:34` declares `pull_request: branches: [main, omp2]`, with a second reference in a comment at :578. `omp2` is a branch on the remote, registered outside this repository, exactly as `omp-kata` is registered on the runner host. Renaming it in ci.yml means pull requests targeting that branch stop triggering CI — the same silent, never-reported failure mode the plan describes for the runner label, and the plan gives it one clause and no line number. It belongs in `do_not_rename` on the same grounds as N12, and if the branch is ever to be renamed the correct order is identical: create the new branch, repoint ci.yml, delete the old one only after nothing targets it.<br>**Bằng chứng:** `git grep -n omp2 -- .github/` → ci.yml:34 (`branches: [main, omp2]`) and ci.yml:578 (comment about rulesets for `main/omp2`). Both are branch references; neither is a brand display string.<br>**Trùng:** cùng một cặp "định danh đăng ký ngoài repo" với nhãn runner ở W10 #2. |
| W11 #1 | 「Cỡ đúng: 178 file rộng / 59 có `".omp"` / 4 có `APP_NAME` / 9 có `__omp_worker_`」 | PARTIALLY_FALSE | **Đính chính:** Số 59 sai: thật là 61 file. Số 4 và 9 đúng. Số trần 178 không tái lập được bằng bất kỳ bộ lọc nào của plan — mẫu gần nhất cho ra 188 với regex lỏng hơn, và 61+9=70 mới là con số hành động. Bỏ hẳn 178 khỏi đặc tả.<br>**Bằng chứng:** `git grep -lE '\".omp\"' -- 'packages/*/test/**' \| wc -l` → 61; `git grep -lE '__omp_worker_' -- 'packages/*/test/**' \| wc -l` → 9; `git grep -lE 'APP_NAME' -- 'packages/*/test/**' \| wc -l` → 4. Thử `\".omp\"`=61, `.omp`=126, `\"omp\"`=54, `\".?omp\"\\|.omp\\|/.omp\\|omp/`=188 — không mẫu nào ra 178. |
| W11 #2 | 「Số phải hành động là 68 file phân biệt (59 + 9, hai tập không giao nhau)」 | PARTIALLY_FALSE | **Đính chính:** Vế 'hai tập không giao nhau' là ĐÚNG (comm -12 cho 0 file). Tổng thì sai: 61 + 9 = 70, không phải 68.<br>**Bằng chứng:** `comm -12 <(git grep -lE '"\.omp"' -- 'packages/*/test/**'\|sort) <(git grep -lE '__omp_worker_' -- 'packages/*/test/**'\|sort) \| wc -l` → 0.<br>**Trùng:** cùng một lỗi 59→61 với W11 #1; ở đây lỗi chạy tiếp sang phép cộng 68→70. |
| W11 #3 | 「9 có `__omp_worker_`」 — ngụ ý cả 9 đều khẳng định tên cũ. | PARTIALLY_FALSE | **Đính chính:** 9 file / 54 lượt là đúng, nhưng chỉ 5 file thật sự khẳng định một selector. 1 file (worker-core.test.ts, 20 lượt — chính là 37% của tổng) là globalThis instrument trùng tiền tố một cách tình cờ. 3 file chỉ có doc comment. 1 trong 5 là fixture chứ không phải test. Nếu không phân loại, W11 sẽ tốn công sửa tên biến nội bộ vô nghĩa và báo cáo thành công giả.<br>**Bằng chứng:** worker-core.test.ts:105,113,139,155,165,204,222,232,291,307,325,359,399,414,460,461 đều là `globalThis.__omp_worker_core_gate` / `__omp_worker_cwd_gate`. issue-1606-repro.test.ts:11, issue-3031-repro.test.ts:13, issue-7352-repro.test.ts:6 đều nằm trong block comment. fixtures/computer-worker-cli-selector.ts:3 là argv của fixture.<br>**Trùng:** cùng phân loại bộ file này đã ở W9 #20, chỉ khác cách đếm. |
| W11 #4 | 「4 file có `APP_NAME`」 — ngụ ý cả 4 cần sửa. | PARTIALLY_FALSE | **Đính chính:** Đếm 4 là đúng nhưng kết luận sai. 2 file đã đọc hằng số sẵn (profile-cli.test.ts, resume-command.test.ts) — không cần việc gì. 1 file là transcript lịch sử 2.3 MB không được tham chiếu ở đâu (before-compaction.jsonl) — phải đóng băng. CHỈ 1 file cần sửa thật: export-html-template.test.ts.<br>**Bằng chứng:** profile-cli.test.ts:9 import APP_NAME, dùng :154,:179,:205. resume-command.test.ts:3 import, dùng :14,:21. `git grep -rn 'before-compaction' -- .` → không kết quả. |
| W11 #5 | 「Ca đặc biệt: packages/coding-agent/test/export-html-template.test.ts:26,32 mang một specifier mock nội tuyến ... phải sửa ở cả hai nửa」 | PARTIALLY_FALSE | **Đính chính:** Về specifier mock thì plan đúng. Nhưng plan bỏ sót dòng nguy hiểm nhất của chính file đó: :143. Ba dòng mang tên trong một file, ba phân định khác nhau: :26 tiền tố tmpdir (cosmetíc), :32 mock specifier (phải theo hằng số), :143 khẳng định localStorage key `omp-export-theme` (phải GIỮ NGUYÊN).<br>**Bằng chứng:** `:26 const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "omp-html-template-"))`; `:32 "@oh-my-pi/pi-utils": 'export const APP_NAME = "omp"; ...'`; `:143 expect(first).toContain("const THEME_STORAGE_KEY = 'omp-export-theme';")` và `packages/coding-agent/src/export/html/template.js:4` định nghĩa `const THEME_STORAGE_KEY = 'omp-export-theme'` được đọc/ghi qua localStorage tại :8 và :18. |
| W11 #6 | 「Test wire hiện có: packages/coding-agent/test/modes/warp-events.test.ts, packages/coding-agent/test/acp-agent.test.ts」 — cả hai được gợi ý là ứng viên chuyển sang WIRE_NAME. | FALSE | **Đính chính:** warp-events.test.ts:111 đúng là phản chiếu site wire W1 (`src/modes/warp-events.ts:60`), nên chuyển sang WIRE_NAME là đúng. acp-agent.test.ts thì KHÔNG: nó khẳng định `extMethod("_omp/sessions/listAll")`, một tên ext method ACP hardcode tại `src/modes/acp/acp-agent.ts:1135`, KHÔNG dẫn xuất từ APP_NAME. Chuyển nó sang APP_NAME sẽ làm test đỏ vì app không còn nhận ext method đó. Đây là wire literal thứ 6, nằm ngoài danh sách 5 site của W1 (W1 phụ `title: "omp"` ở :657, không phụ :1135) — và không work item nào trong M5 sở hữu nó.<br>**Bằng chứng:** `git grep -n 'sessions/listAll' -- packages/coding-agent/src` → đúng 1 hit: `acp-agent.ts:1135 case "_omp/sessions/listAll": {`. acp-agent.test.ts:1140 dùng `_omp/sessions/listAll`, :1144 dùng `omp/sessions/listAll` và assert bị reject. |
| W11 #7 | 「Bộ test Python ... `python/omp-rpc/tests/test_user_group.py:26,34,36,40,45` ... chúng khẳng định group Unix `omp` phải được giữ」 | PARTIALLY_FALSE | **Đính chính:** Con số 5 dòng đúng, nhưng mô tả sai: chỉ 2 dòng (:36 và :40) là khẳng định group Unix. Ba dòng :26, :34, :45 là tham số `executable="omp"` — tên lệnh được spawn, thuộc phạm vi W13' (client.py:455), không phải group. Gọi cả 5 là 'group' khiến người đọc bảo vệ sai thứ, đồng thời tạo mâu thuẫn với W13' vốn phải sửa tên lệnh.<br>**Bằng chứng:** `:26 call = _start_and_capture(executable="omp")`; `:34 executable="omp"`; `:36 group="omp"`; `:40 assert call.kwargs["group"] == "omp"`; `:45 call = _start_and_capture(executable="omp", extra_groups=[])`. |
| W11 #8 | 「Lệnh: `bun run check && bun run test:ts && bun run test:py`」 là cổng nghiệm thu. | FALSE | **Đính chính:** Không phải cổng đỏ được trên máy này, vì cả ba lệnh đều không cho tín hiệu. `bun run test:ts` đỏ vì thiếu native addon (5/8 package), `bun run test:py` đỏ vì thiếu pytest, `bun run check` kéo cả `check:rs` cần cargo. Lệnh đỏ KHÔNG phân biệt được 'W11 chưa làm' với 'máy chưa build được'. Đặc tả này thay bằng cổng ba tầng, trong đó tầng 1 chạy được ngay và tầng 2 có canary bắt buộc chữ ký môi trường bị chặn.<br>**Bằng chứng:** `bun test packages/utils/test/worker-host.test.ts` → 4 pass 0 fail; `bun test packages/omptype/test/ark/arrays/array.test.ts` → 24 pass; `bun test packages/coding-agent/test/worker-selector.test.ts` → 0 pass 1 fail 1 error, `Failed to load pi_natives native addon for darwin-arm64`; `python3 -m pytest --version` → `No module named pytest`; `bun run check:ts` → exit 0 trong 4m14s. |
| W11 #9 | 「bun run test:ts đi qua scripts/ci-test-ts.ts và chỉ quét `packages/*` cộng `python/robomp/web`」 | VERIFIED_TRUE | **Đính chính:** Giữ nguyên. Đây là cơ sở đúng để bắt buộc ghép `bun run test:py` vào cổng — không có lệnh TS nào nhìn thấy `python/**/tests/`.<br>**Bằng chứng:** `scripts/ci-test-ts.ts:109-110`: comment 'robomp-web lives under python/robomp and is outside every CI TS bucket' và `const localOnlyWorkspacePackages = ["python/robomp/web"];` |
| W11 #10 | Cả 5 vị trí wire mà W1 sẽ gom về `WIRE_NAME` | VERIFIED_TRUE | **Đính chính:** Giữ nguyên, và bổ sung: `WIRE_NAME` hiện KHÔNG tồn tại trong source — nó chỉ xuất hiện trong chính tài liệu kế hoạch. Đây là lý do W11 phụ thuộc W1 theo đúng thứ tự.<br>**Bằng chứng:** `git grep -n 'WIRE_NAME' -- .` → chỉ khớp trong COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md. Năm site: `src/dap/session.ts:1465-1466` (clientID/clientName), `src/blob-broker/uploaders-legacy.ts:236` (z), `src/modes/warp-events.ts:60` (agent), `src/modes/acp/acp-agent.ts:657` (title), `src/hindsight/bank.ts:29` (DEFAULT_BANK_NAME) — tất cả đúng dòng plan nêu. |
| W12 #1 | `scripts/ci-release-publish.ts:165` holds `publishBin: { omp: "dist/cli.js" }`. | wrong-line | **Đính chính:** It is at line 186, on the `packages/coding-agent` entry of the exported `packages[]` array (`:164`). Line 165 is a blank line inside a docblock.<br>**Bằng chứng:** `grep -n 'publishBin\\\|manifest\.bin\\\|"bin"' scripts/ci-release-publish.ts` returns 16, 69, 186, 243, 298, 301. `sed -n '160,175p'` shows 165 is blank; `sed -n '178,192p'` shows `publishBin: { omp: "dist/cli.js" }` at 186.<br>**Trùng:** cùng claim và cùng dòng sai với W9 #1; hai work item cùng dựa vào một neo nên phải sửa một lần, và W9 #1 cho thêm các vị trí dùng `:243`, `:298`, `:301`. |
| W12 #2 | `ci-release-publish.ts:220` and `:278` overwrite `manifest.bin` unconditionally from `publishBin`, which is why the stub needs its own `publishBin`. | wrong-line-and-wrong-mechanism | **Đính chính:** Both line numbers are wrong and the 'unconditional' characterization is false. The only in-publish overwrite is at :243 and it IS conditional: `if (pkg.publishBin) manifest.bin = { ...pkg.publishBin };`. Line 301 is inside `applyPublishBin()`, a separate exported function (:296-303) that throws if the package has no `publishBin`; its only caller is `scripts/install-tests/run-ci.sh:156`, an install-test helper, not the release publish path. The hazard the plan describes is still REAL but for a different reason: the single static `publishBin` on the `packages[]` entry (:186) is applied to every publish of that directory, so once W9 renames it, a stub published from the same directory ships `bin: { ultraworkers: ... }`. Stating the wrong reason is dangerous here — an engineer who checks it may conclude the hazard is also wrong and skip the fix.<br>**Bằng chứng:** `sed -n '240,244p'` shows `if (pkg.publishBin) manifest.bin = { ...pkg.publishBin };` at 243. `sed -n '296,303p'` shows applyPublishBin. `grep -rn 'applyPublishBin'` returns exactly two hits: the definition at :296 and `scripts/install-tests/run-ci.sh:156`. |
| W12 #3 | W12 should extend `packages/coding-agent/test/cli/update-rename-migration.integration.test.ts` with a manifest whose `rename` points to a real new package, plus a second case where `dist` is the binary value. | already-covered-and-misplaced | **Đính chính:** Both cases already exist, in a different file. `packages/coding-agent/test/cli/update-cli.test.ts:60-79` already asserts a real two-package rename (`@oh-my-pi/pi-coding-agent` -> `@new/omp`) resolving version, dist and package names from the final manifest, including the exact two-hop registry URL sequence; the cycle guard follows at :90+. Parser unit cases are at `packages/coding-agent/test/update-cli.test.ts:642-653` and `:1420-1431` (the latter includes the unknown-value-coerces-to-binary case). Separately, `update-rename-migration.integration.test.ts` has NO manifest seam at all: it drives `migrateRenamedInstall` through injected `RenameMigrationSteps` against real npm and real bun over local `file:` fixtures, and never calls either resolver. Writing manifest cases there would duplicate existing coverage in a file built for a different seam.<br>**Bằng chứng:** `sed -n '60,79p' packages/coding-agent/test/cli/update-cli.test.ts` shows the rename fixture and its assertions. `grep -n 'resolveReleaseDist\\\|resolveReleaseRename' packages/coding-agent/test/update-cli.test.ts` returns 29, 30, 642, 646, 650, 651, 652, 653, 1420, 1421, 1425, 1429, 1430, 1431. The integration test's 171 lines contain `RenameMigrationSteps` at :108-120 and :149-161 and no resolver call. |
| W12 #4 | W12 acceptance includes `codesign --verify --strict` succeeding on the renamed artifact, implying this needs building. | already-exists | **Đính chính:** The gate already exists in two places and needs no new code. `scripts/ci-macos-sign.sh:109` runs `codesign --verify --strict --verbose=4 "$BINARY"` and is already name-parameterized (`BINARY="${1:-}"` at :35), called from `ci.yml:974`. W12's actual work is RE-RUNNING signing under the new filename — a prerequisite, not an edit. The one thing that will break it is in W10's file: `ci.yml` hardcodes `omp-darwin-arm64` in 9 places, so the verify job will curl a 404 after the asset rename.<br>**Bằng chứng:** `grep -rn 'codesign\\\|notarytool\\\|notariz' .github/workflows/ scripts/` returns ci.yml:962, 965, 1210, 1211, 1218, 1222; ci-macos-sign.sh:83, 84, 90, 91, 94, 98, 103, 109, 110, 112, 120, 122, 135, 137, 145. `grep -c 'omp-darwin-arm64' .github/workflows/ci.yml` = 9, at lines 922, 1206, 1207, 1210, 1211, 1213, 1214, 1218, 1225. |
| W12 #5 | W12's gate is `(cd packages/coding-agent && bun test test/cli/update-rename-migration.integration.test.ts) && bun run test:scripts`. | false-red | **Đính chính:** This gate cannot distinguish 'done' from 'test could not run' — it is red in this environment no matter what the engineer does. `bun test` on any test importing pi_natives exits 1 with 0 pass / 1 fail / 1 error and `Failed to load pi_natives native addon for darwin-arm64`. Both halves of the gate are affected, and `bun run test:scripts` is blocked for exactly one of its five members (`scripts/ci-test-ts.test.ts`); the other four exit 0 individually. Rewritten as a four-tier gate (see the `gate` field) so the one tier that can actually go red — `scripts/ci-release-publish.test.ts`, which runs here — is the discriminating signal, and the blocked tiers are labelled BLOCKED rather than passed. Unblocking tier 3 also needs `brew install ninja` first: `ninja` is not installed on this machine and the natives build cannot run without it.<br>**Bằng chứng:** Measured 2026-09-27: `bun test packages/coding-agent/test/cli/update-rename-migration.integration.test.ts` -> exit 1 (0 pass / 1 fail / 1 error, pi_natives load error); `bun test packages/coding-agent/test/update-cli.test.ts` -> exit 1; `bun run check:ts` -> exit 0. Per-member of test:scripts: ci-test-ts 1, ci-release-build-binaries 0, musl-release 0, ci-release-publish 0, release 0. `bun test scripts/ci-release-publish.test.ts` alone -> 11 pass / 0 fail / exit 0. `which ninja` -> not found; `brew list ninja` -> 'No such keg: /opt/homebrew/Cellar/ninja'.<br>**Trùng:** cùng khuôn cổng đỏ-vì-môi-trường với W9 #17, W11 #8, W13 #10; bản W10 #9 chỉ ra thêm một lý do riêng (một trong năm thành viên của `test:scripts` đỏ, bốn cái còn lại xanh). |
| W12 #6 | W12's 'Vị trí' lists the stub manifest, the parser, the publish script, and the signing step as the whole surface. | incomplete | **Đính chính:** One real dependency is missing from the plan entirely: `scripts/install-tests/run-ci.sh:94` copies `packages/coding-agent/dist/omp` into the test bin dir and :103 smokes `$BUN_INSTALL/bin/omp`. A stub that only carries a `bin` map pointing at a `dist/omp` that no longer exists fails the install matrix, which is W10's stated acceptance. W12 must either require a real `omp` shim artifact in the stub or get an explicit handoff decision from W10; leaving it undecided blocks both items.<br>**Bằng chứng:** `grep -n 'dist/omp\\\|BUN_INSTALL/bin\\\|BINARY_DIR' scripts/install-tests/run-ci.sh` returns 92, 93, 94, 95, 101, 103. |
| W13 #1 | §2.2 hàng 7 và W13 (dòng 13978): "723 lượt token `omp` trên 105 file" trong `.md`. | SAI | **Đính chính:** Trên HEAD `84cbac9`, biểu thức đã ghim ở §2.1 cho 1293 lượt trên 109 file. Nếu trừ 13 file changelog và 5 file kế hoạch ở gốc (chúng không thuộc W13 vì bất biến / không phải tài liệu sản phẩm), bề mặt thật của W13 là 549 lượt trên 93 file. Con số để vào allow-list là 93, không phải 105.<br>**Bằng chứng:** P='(^\|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]\|$)'; `git grep -ohE "$P" -- '*.md' \| wc -l` = 1293; `git grep -lE "$P" -- '*.md' \| wc -l` = 109; thêm `':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md'` thì ra 549 / 93. Con số 723 không tái lập được bằng bất kỳ biến thể nào của biểu thức đã ghim. |
| W13 #2 | W13 dòng 13975: "Có 603 file markdown được track". | SAI | **Đính chính:** 612 file markdown được track. Lệnh: `git ls-files '*.md' \| wc -l`. Chênh 9 file — khớp đúng với 9 file runtime dưới `.omp/` mà tôi phát hiện, nhiều khả năng số cũ đếm trước khi chúng được thêm.<br>**Bằng chứng:** `git ls-files '*.md' \| wc -l` = 612; `git ls-files '.omp/**/*.md' \| wc -l` = 9.<br>**Trùng:** cùng con số 603 mà W13 #12 dùng làm tiền đề cho "toàn bộ là văn xuôi có thể sed"; chính 9 file `.omp/` đó là lý do chênh. |
| W13 #3 | W13 dòng 13975: "79 chứa `@oh-my-pi/`". | SAI | **Đính chính:** 84 file `.md` chứa `@oh-my-pi/`. Sau khi trừ 13 file changelog (bất biến) và 5 file kế hoạch ở gốc, còn 66 file — đó mới là bề mặt scope thật của W13.<br>**Bằng chứng:** `git grep -l '@oh-my-pi/' -- '*.md' \| wc -l` = 84; `git grep -l '@oh-my-pi/' -- 'packages/*/CHANGELOG.md' \| wc -l` = 13; `git ls-files '*.md' \| grep -cE 'MILESTONE_[0-9]_EXECUTION_PLAN\.md$\|^COMPREHENSIVE_PLAN'` = 5; 84 − 13 − 5 = 66.<br>**Trùng:** cùng phép trừ "13 changelog + 5 kế hoạch" với W13 #1; con số 13 ở đây được chính W13 #9 sửa thành 14 tổng / 13 có scope. |
| W13 #4 | W13 dòng 13975: "82 trong `docs/` ở cấp đỉnh (134 nếu tính mọi cấp)". | ĐÚNG | **Đính chính:** Giữ nguyên. Lưu ý kỹ thuật: `git ls-files 'docs/*.md'` KHÔNG cho ra 82 — dấu `*` của git pathspec khớp cả dấu `/`, nên lệnh đó ra 134. Muốn 82 phải lọc bằng `grep -E '^docs/[^/]+\.md$'`.<br>**Bằng chứng:** `git ls-files '*.md' \| grep -cE '^docs/[^/]+\.md$'` = 82; `git ls-files '*.md' \| grep -cE '^docs/.+\.md$'` = 134. |
| W13 #5 | W13 dòng 13977 và §2.2 hàng 21: `docs/environment-variables.md` liệt kê 100 biến `PI_*`/`OMP_*`. | ĐÚNG | **Đính chính:** Giữ nguyên. Nhưng phải thêm: file có 11 bảng với header riêng, và cột tương thích phải thêm vào CẢ 11, không chỉ bảng đầu. Plan không nói cấu trúc bảng nên dễ làm thiếu.<br>**Bằng chứng:** `grep -cE '^\| .(PI\|OMP)_[A-Z0-9_]+' docs/environment-variables.md` = 100; `wc -l` = 648; `grep -nE '^\| *Variable'` ra các dòng 37, 117, 128, 191, 203, 220, 232, 244, 260, 270 và các bảng còn lại.<br>**Trùng:** cùng 100 dòng đó là đối tượng của W13 #13. |
| W13 #6 | W13: "`docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` đã thuộc W8". | ĐÚNG VỀ NỘI DUNG, SAI VỀ SỞ HỮU | **Đính chính:** Hai neo dòng chính xác — tôi đã mở và xác nhận nội dung khớp. Nhưng W8a (plan dòng 13841) đã NHẬN SỞ HỮU chúng ràng rõ, trong khi W13 lại liệt kê lại. Phải chọn một chủ sở hữu. Đề xuất W8a.<br>**Bằng chứng:** `sed -n '231p' docs/extension-loading.md` trả về câu về `onLoad` hook và các shim legacy; `sed -n '46,51p' docs/porting-from-pi-mono.md` trả về 5 dòng map `@mariozechner/pi-*` → `@oh-my-pi/pi-*` cộng dòng `@earendil-works/*`. Plan dòng 13841 (W8a): "`docs/extension-loading.md:231` cùng `docs/porting-from-pi-mono.md:46-51` phải được viết lại".<br>**Liên quan:** W13 #15 đặt điều kiện chặn (c) là `git log --oneline -- docs/extension-loading.md` — điều kiện đó chỉ có nghĩa sau khi W8a là chủ sở hữu. |
| W13 #7 | W13 dòng 13978 liệt kê `CONTRIBUTING.md` như file mang thương hiệu trong văn xuôi. | ĐÚNG NHƯNG QUÁ NHỎ ĐỂ LÀ CÁI RIÊNG | **Đính chính:** Chỉ 1 dòng thật sự khớp biểu thức §2.1: dòng 1 `# Contributing to omp`. Dòng 84 có `OMP` viết hoa, không khớp biểu thức viết thường. Không cần một mục riêng — gộp vào lượt văn xuôi.<br>**Bằng chứng:** `grep -nE 'oh.my.pi\|\bomp\b\|ultraworker' CONTRIBUTING.md` → dòng 1, dòng 84; `git grep -ohE "$P" -- CONTRIBUTING.md \| wc -l` = 1. |
| W13 #8 | W13 dòng 13975: "quy tắc scope không bao giờ hardcode trong TS của AGENTS.md giữ cách diễn đạt trung lập về thương hiệu — hãy kiểm tra, đừng giả định là cần sửa". | NỬA ĐÚNG | **Đính chính:** Câu đó về MỘT quy tắc thì đúng. Nhưng AGENTS.md nói chung KHÔNG trung lập về thương hiệu — nó cần sửa. 11 dòng mang tên cũ: 4 đường dẫn import `@oh-my-pi/pi-*`, `~/.omp/logs/omp.YYYY-MM-DD.log`, `__omp_worker_*` selector, `omp --smoke-test`, `omp-stats`, và 2 URL attribution `github.com/can1357/oh-my-pi`. Sửa AGENTS.md là đổi hành vi của coding agent, nên cần hỏi trước.<br>**Bằng chứng:** `grep -nE 'oh-my-pi\|\bomp\b' AGENTS.md` ra 15 dòng khớp (`grep -c` = 15; trong đó 3 lượt khớp biểu thức §2.1 và 9 dòng có `@oh-my-pi/`), ở các dòng 19, 24, 52, 54, 60, 62, 66, 69, 83, 150, 220, 227, 235, 337, 338.<br>**Trùng:** dòng 62 (câu `--smoke-test`) là nguồn của W9 #11; hai URL attribution ở dòng 337-338 cùng loại với khoảng trống ở W13 #14. |
| W13 #9 | W13 dòng 13976 và N11: "`packages/*/CHANGELOG.md`" được nhắc như một mục đơn. | ĐÚNG VỀ NGUYÊN TẮC, SAI VỀ SỐ | **Đính chính:** Có 14 file changelog, không phải 13. 13 file chứa `@oh-my-pi/` (`packages/natives/CHANGELOG.md` là file không có scope) và 11 file chứa token `omp`. Con số 13 xuất hiện ở plan dòng 13828 và khớp với "13 file có scope" — nhưng W13 nói `packages/*/CHANGELOG.md` chung chung, nên khi đếm phải nói rõ 14 tổng / 13 có scope.<br>**Bằng chứng:** `git ls-files 'packages/*/CHANGELOG.md' \| wc -l` = 14; `git grep -l '@oh-my-pi/' -- 'packages/*/CHANGELOG.md' \| wc -l` = 13; `git grep -lwE 'omp' -- 'packages/*/CHANGELOG.md' \| wc -l` = 11. |
| W13 #10 | W13 dòng 13983: "Lệnh: `bun run check`" là cổng nghiệm thu. | SAI — KHÔNG ĐỎ ĐƯỢC | **Đính chính:** `bun run check` là `bun run --parallel check:ts check:rs`: typecheck + cargo. Cả hai đều xanh dù W13 chưa sửa một dòng nào, và không cái nào đọc nội dung markdown. Nó không phân biệt được 'đã làm' với 'chưa làm'. Thay bằng ba quy tắc ở mục `gate`; giữ `bun run check:ts` như điều kiện phụ vì nó bắt được lỗi import nếu ai đó đổi tên `internal-urls/omp.md`.<br>**Bằng chứng:** `node -e "console.log(require('./package.json').scripts.check)"` → `bun run --parallel check:ts check:rs`; `check:ts` → `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`; `check:tools` → `oxlint . && oxfmt --check ...`. Tôi chạy `bun run check:ts` được exit 0 sau ~56s. `check:rs` cần cargo.<br>**Trùng:** cùng khuôn cổng đỏ-vì-môi-trường với W9 #17, W11 #8, W12 #5; điều kiện phụ `check:ts` ở đây bắt được đúng lỗi mà W13 #12 cảnh báo. |
| W13 #11 | W13 dòng 13982: "Test cần viết: không có test. Nội dung tài liệu không phải hợp đồng runtime quan sát được.". | ĐÚNG VỀ KẾT LUẬN, THIẾU MỘT NỬA | **Đính chính:** Đúng là không viết `bun test` — AGENTS.md cấm assert trên chữ của file, và đúng là DoD "không có biến mới nào mồ côi" của plan KHÔNG thể kiểm bằng `bun run check`. Nhưng kết luận "không có test" kéo theo việc KHÔNG CÓ GÌ ÉP AI, và đó là chỗ hởng. Thay bằng checker có exit code `scripts/rename/check-docs-rename.ts` chạy được ngay cả khi `bun test` đang bị chặn trên máy này.<br>**Bằng chứng:** AGENTS.md mục Testing: "Bad: wording/defaults. NEVER assert prompt/UI boilerplate" và cấm source-grep. Plan dòng 14042 nêu DoD hai chiều cho họ `PI_*`/`OMP_*`, mà `bun run check` không đụng tới. Baseline đo được: `git grep -ohE '(process\.env\|Bun\.env)\.ULTRAWORKERS_[A-Z0-9_]+' -- '*.ts'` = 0, nên quy tắc B xanh ngay bây giờ và đỏ đúng lúc W4 land mà W13 bỏ sót doc. |
| W13 #12 | W13 giả định toàn bộ 603 file `.md` là văn xuôi có thể sed. | SAI — THIẾU MỘT LOẠI FILE NGUY HIỂM | **Đính chính:** Ít nhất 10 file `.md` được track KHÔNG phải tài liệu mà là asset nạp lúc chạy. `packages/coding-agent/src/prompts/internal-urls/omp.md` được import theo đường dẫn — đổi tên file là `bun run check:ts` đỏ. 9 file dưới `.omp/commands/` và `.omp/skills/` là prompt corpus, cố ý nằm trong thư mục dot. Chúng nằm trong tập 93 file của lệnh `git grep -- '*.md'`, nên phải loại theo ĐƯỜNG DẪN, không phải theo phần mở rộng.<br>**Bằng chứng:** `packages/coding-agent/src/internal-urls/omp-protocol.ts:10`: `import ompDoc from "../prompts/internal-urls/omp.md" with { type: "text" };`. `git ls-files '.omp/**/*.md' \| wc -l` = 9. `packages/coding-agent/src/compress/index.ts:58`: "`dot: true` — prompt corpora live under dot directories such as `.omp/commands`". Ngoài ra `.omp.md` còn là đuôi file tạm tại `input-controller.ts:2515` và trong `packages/coding-agent/test/external-editor.test.ts:91,99` — ba vị trí phải giữ nguyên.<br>**Trùng:** 9 file `.omp/` ở đây chính là 9 file giải thích chênh lệch 603↔612 ở W13 #2. |
| W13 #13 | W13 dòng 13977: cần "thêm cột tương thích: mỗi biến phải có một dòng nêu tên mới tương ứng", và §2.2 hàng 21: "100 dòng phải bổ sung tên mới". | SAI — NẾU ĐỌC THẲNG SẼ PHÁT MINH 100 BÍ DANH MỚI | **Đính chính:** Cơ chế bí danh cho biến môi trường ĐÃ TỒN TẠI và đã được tài liệu hoá: `parseEnvFile` mirror mọi khoá `OMP_*` sang `PI_*`, và dòng 29 của chính file doc nói đúng điều đó. W4 chỉ thêm MỘT tên mới (`ULTRAWORKERS_CONFIG_DIR`). Vậy cột tương thích nên ghi lại cơ chế có sẵn, và chỉ một dòng mang tên mới. Đọc 'mỗi biến phải có tên mới' thành 100 tên mới là 100 chỗ đọc env trong code mà không work item nào sở hữu, và trái N16.<br>**Bằng chứng:** `packages/utils/src/env.ts:277-282`: `// OMP_ overrides PI_` rồi ``for (const k in result) { if (k.startsWith("OMP_")) result[`PI_${k.slice(4)}`] = result[k]; }``. `docs/environment-variables.md:29`: "every `OMP_*` key is mirrored to its `PI_*` alias, and that mirrored value replaces a same-file `PI_*` value". `git grep -c 'ULTRAWORKERS_CONFIG_DIR' -- '*.ts'` = 0 — W4 chưa land.<br>**Trùng:** 100 dòng ở W13 #5 và 100 bí danh ở đây là cùng một bảng, nhìn từ hai hướng khác nhau. |
| W13 #14 | W13: không có việc gì với URL `github.com/can1357/oh-my-pi` (24 lượt trong 13 file `.md`, 54 file `.ts`). | KHOẢNG TRỐNG TRONG PLAN | **Đính chính:** Bề mặt này không thuộc hàng nào của bảng `do_not_rename` N1–N17 và không work item nào sở hữu. Vì GitHub giữ redirect khi repo được đổi tên nên URL cũ KHÔNG gãy — đó là lý do dễ bị bỏ sót vĩnh viễn, và AGENTS.md dùng đúng mẫu URL đó làm ví dụ attribution trong mục Changelog (dòng 337-338). Cần câu hỏi mở, không cần quyết ngay trong W13.<br>**Bằng chứng:** `git grep -ohE 'github\.com/[A-Za-z0-9_.-]+/oh-my-pi' -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \| sort \| uniq -c` → 24 lượt, toàn bộ là `github.com/can1357/oh-my-pi`; `git grep -lE 'github\.com/[A-Za-z0-9_.-]+/oh-my-pi' -- '*.md' ... \| wc -l` = 13; cùng mẫu trong `*.ts` = 54 file. Bảng N1–N17 ở plan dòng 13266-13282 không có hàng nào nhắc URL.<br>**Trùng:** W13' #6 phát hiện đúng khoảng trống này từ phía Python (`pyproject.toml:27,28`). |
| W13 #15 | W13 dòng 13980: "Phụ thuộc: tất cả mục trước; M2 cho hai tài liệu hợp đồng.". | QUÁ MƠ HỒ ĐỂ LÀM ĐIỀU KIỆN CHẶN | **Đính chính:** "Tất cả mục trước" không kiểm được bằng máy. Thay bằng ba điều kiện cụ thể có lệnh: (a) `git grep -c 'ULTRAWORKERS_CONFIG_DIR' -- '*.ts'` khác 0 — hiện bằng 0, tức W4 chưa land; (b) `scripts/rename/keep-list.txt` và `scripts/rename/disposition.tsv` tồn tại — hiện thư mục `scripts/rename/` không có; (c) `git log --oneline -- docs/extension-loading.md` cho thấy W8a đã chạm file. Thiếu (a) thì cột tương thích không có nội dung và phần việc nặng nhất của W13 biến mất trong im lặng.<br>**Bằng chứng:** `git grep -c 'ULTRAWORKERS_CONFIG_DIR' -- '*.ts' \| wc -l` = 0 (0 file khớp). `ls scripts/rename/` → `No such file or directory (os error 2)`; `ls scripts/rename/disposition.tsv scripts/rename/keep-list.txt` → cả hai `No such file or directory`.<br>**Trùng:** điều kiện (a) là cùng phép đo với bằng chứng của W13 #13. |
| W13' #1 | §3.3 and W13': `grep '"omp"'` in `python/` returns 24 occurrences across 8 files, and 4 of them need to change while 20 stay. | The count is right; the budget is wrong. | **Đính chính:** 24 across 8 files is confirmed exactly, and the 4 / 8 / 12 split holds. But 4 is not the number of sites that must change. There are 6, because two more default-command sites exist that the `"omp"` grep cannot see: `python/robomp/docker-compose.yml:81` and `python/robomp/.env.example:185` both set `ROBOMP_OMP_COMMAND` to the old name, and a compose environment value OVERRIDES the pydantic default at `config.py:95`. An engineer who follows the plan exactly produces a diff that satisfies every stated acceptance criterion and a robomp container that still spawns the old binary. The 20-remaining check passes, the residual count is exactly right, and the product is broken in the one place it executes.<br>**Bằng chứng:** `git grep -c '"omp"' -- 'python/**/*.py'` → 24 across 8 files (client.py 1, test_client.py 2, test_user_group.py 5, config.py 1, sandbox.py 2, worker.py 2, test_sandbox.py 8, test_worker.py 3). `git grep -n 'ROBOMP_OMP_COMMAND' -- python/` → 5 hits: `config.py:95` (definition), `worker.py:647` (consumer), `docker-compose.yml:81` (`ROBOMP_OMP_COMMAND: omp` under the `# --- container-fixed paths ---` header at :80), `.env.example:185`, and a doc reference in `test_worker_smoke.py:4`. The two extra sites are outside the 24 because the value is not written as a bare `"omp"` literal.<br>**Trùng:** ba dòng `executable="omp"` trong `test_user_group.py` mà W11 #7 từng quy cho W13' là một phần của ngân sách 4 ở đây. |
| W13' #2 | §3.3 set (iii): the sandbox on-disk root is 12 occurrences at `sandbox.py:549,588` and `test_sandbox.py:759,828,1071,1073,1075,1105,1107,1109` and `test_worker.py:345,387`. | The 12 is right for what it counts; both the line numbers and the scope of the category are wrong. | **Đính chính:** Two separate problems. (1) Every one of the eight `test_sandbox.py` line numbers is off by exactly +1; the real lines are 760, 829, 1072, 1074, 1076, 1106, 1108, 1110. An engineer who trusts the plan edits the line above each target. (2) Set (iii) describes 12 occurrences, but the `.omp*` on-disk family in `python/` is 108 occurrences across 12 files, of which 63 are quoted literals: `.omp-xdg` 30, `.omp-tmp` 14, `.omp-session` 10, `.omp` 6, `.omp-session-v1.2.4` 1, `.omp-session-v1.2.3` 2. The plan counts only the 12 that happen to be the bare `"omp"` path segment and so misses `.omp-tmp` (which `sandbox.py:500,574` creates and `test_sandbox.py:726,735,749,824,1070,1104,2420,2430,2447` asserts) and `.omp-session*` (which `sandbox.py:899,1047` and `tasks.py:364` create). N15's keep-list names only `.omp-xdg` and `<xdg_root>/omp`, so a keep-list written straight from the plan is incomplete on this family.<br>**Bằng chứng:** `grep -n '"omp"' python/robomp/tests/test_sandbox.py` → 760, 829, 1072, 1074, 1076, 1106, 1108, 1110. `git grep -o '\.omp' -- python/ \| wc -l` → 108. `git grep -ohE '"\.omp[a-z0-9.-]*"' -- python/ \| sort \| uniq -c` → 30 `.omp-xdg`, 14 `.omp-tmp`, 10 `.omp-session`, 6 `.omp`, 2 `.omp-session-v1.2.3`, 1 `.omp-session-v1.2.4`. |
| W13' #3 | W13' and §2.3: the only identities in `python/` that must be preserved are the N13 Unix group and the N15 sandbox XDG layout; the taxonomy is three disjoint sets. | Incomplete — there is a fourth identity with the opposite disposition, and it belongs to another work item. | **Đính chính:** `worker.py:145,168,209` and `entrypoint.sh:60,61,65,66,77,78,79,80,81` reference `_AGENT_HOME / ".omp"` where `_AGENT_HOME = Path("/srv/agent-home")` (`worker.py:136`). That is the CLI's OWN config dir — `CONFIG_DIR_NAME` from `dirs.ts:27` — not a sandbox layout and not a Unix group. It is owned by W4 (dual-root reader) and W6 (the flip), and it must stay on `.omp` during the transition precisely BECAUSE W4 keeps reading the legacy root. This matters because a sweep of the `.omp*` family in `python/**` — the natural thing to run after reading set (iii) — moves robomp's staging off the root the CLI is still reading, a container-only break that neither the Python tests nor `check:ts` can see. `test_worker.py:278,290,295,296` assert the same staged-home layout. The plan needs a fourth keep-list row naming it, attributed to W4/W6 rather than to N13 or N15.<br>**Bằng chứng:** `git grep -n '\.omp' -- python/robomp/src/worker.py` → `:145` `for rel in (Path(".agent"), Path(".omp/agent"))`, `:168` `if root_path == _AGENT_HOME / ".omp"`, `:209` `run_dir = _AGENT_HOME / ".omp" / "run"`. `_AGENT_HOME = Path("/srv/agent-home")` at `worker.py:136`. `git grep -n '\.omp' -- python/robomp/entrypoint.sh` → `:60,61,65,66,77,78,79,80,81` all under `/srv/agent-home/.omp`. Cross-reference: `packages/utils/src/dirs.ts:27` `CONFIG_DIR_NAME = ".omp"`, which N14 and W6a already own for the TypeScript side.<br>**Trùng:** là phần mở rộng của W13' #2 — cùng họ `.omp*`, nhưng phải giữ vì lý do ngược lại. |
| W13' #4 | W13' lists `python/robomp/pyproject.toml:22` (`"omp-rpc>=0.1.0"`) as one of the six distribution-metadata sites to change, alongside `:6`, `:8`, and the four in `python/omp-rpc/pyproject.toml`. | Self-contradictory — it conflicts with the open-questions default in the same document. | **Đính chính:** Line 22 is a PEP 508 dependency requirement on the `omp-rpc` DISTRIBUTION name, not descriptive metadata. The open-questions table at the end of M5 decides that name and its stated default is KEEP `omp-rpc` permanently, because renaming breaks every existing `pip install omp-rpc`. Under that default, `:6` keeps the name and `:22` MUST keep matching it. Renaming `:22` while `:6` stays makes robomp's dependency unresolvable: `uv pip install` fails at resolve time and the entire bot does not install. Same coupling at `Dockerfile:164` (`pip install /tmp/wheels/omp_rpc-*.whl`, which resolves against the built wheel filename) and at `python/omp-rpc/pyproject.toml:31` (`package-dir`). Correct reading: `:22` is not a rename site at all — it is a consequence of a decision that belongs to the open-questions table, and under the default it is a KEEP line sitting in the middle of a change list.<br>**Bằng chứng:** `sed -n '14,23p' python/robomp/pyproject.toml` → `dependencies = [ ..., "omp-rpc>=0.1.0", ]` at line 22. `python/omp-rpc/pyproject.toml:6` → `name = "omp-rpc"`, unchanged. Open-questions row in the M5 back-matter: "Giữ `omp-rpc` vĩnh viễn, chỉ đổi metadata mô tả (`description`, `keywords`, `Homepage`) và tên lệnh mặc định" — three descriptive fields, which is `:8`, `:14`, `:26` and NOT `:22`. The plan's own §3.3 says the same thing in prose and then lists `:22` among the sites to change. |
| W13' #5 | W13' command: `bun run check && bun run test:py && git grep -n '"omp"' -- 'python/**/*.py'`, and its 'Test cần viết' says to update `test_client.py:1044,1061` to match. | The command cannot distinguish success from an unrunnable environment, and the test instruction produces a test that asserts nothing. | **Đính chính:** Two separate defects. (1) The command: `bun run test:py` FAILS on this machine with `No module named pytest` (exit 1) and `bun run lint:py` FAILS with `ruff: command not found` (exit 127) — both indistinguishable, by exit code alone, from a genuine test failure. Worse, `bun run check` is structurally blind to this item: `check:ts` filters `./packages/*` and oxlint is JS/TS-only, so no edit to any file under `python/**` can make it red, while `check:rs` adds a Rust toolchain invocation to work that touches no Rust. Both halves are cost without signal. (2) The test: `test_client.py:1044` passes `executable="omp"` in and `:1061` asserts `"omp"` out — an explicit value echoed back, which AGENTS.md bans as a success-passthrough. Swapping both strings leaves a test that passes under EITHER name, so the suite goes green without ever checking that the default moved. The fix is to drop the explicit argument and assert the computed default, which is also the transformation assertion the item's own test contract asks for.<br>**Bằng chứng:** `bun run test:py` on HEAD 84cbac9 → `python3.14: No module named pytest`, exit 1. `bun run lint:py` → `ruff: command not found`, exit 127. `bun run check:ts` → exit 0 in ~29s; `package.json` defines it as `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types`. `sed -n '1040,1063p' python/omp-rpc/tests/test_client.py` → the test constructs `RpcClient(executable="omp", ...)` and asserts `client.command == ("omp", "--mode", "rpc", ...)`. Working baseline obtained instead via `uv venv` + `uv pip install -e python/omp-rpc -e python/robomp`: 81 passed + 17 subtests (omp-rpc), 665 passed + 4 skipped (robomp).<br>**Trùng:** cùng khuôn cổng đỏ-vì-môi-trường với W9 #17, W11 #8, W12 #5, W13 #10; ở đây còn nặng hơn vì `check:ts` không nhìn thấy `python/**` — đúng lý do W11 #9 phải ghép `test:py` vào cổng. |
| W13' #6 | §3.3 verification command list: `git grep -n 'omp' -- 'python/**/pyproject.toml'` returns 15 lines, to be read as 2 path-noise + 6 display-branding + 7 distribution/module names; 'Đừng đếm 15 làm ngân sách sửa'. | Correct, and worth keeping verbatim — but it does not see two real surfaces. | **Đính chính:** The 15-line breakdown checks out exactly: 2 noise (`robomp:63` '"C4"', `:67` '"E501"', which match only because the path `python/robomp/pyproject.toml` contains the substring 'omp'), 6 branding (`omp-rpc:8,14,26` and `robomp:8,22`), 7 distribution/module (`omp-rpc:37` and `robomp:6,34,37,38,41,75`). The instruction not to treat 15 as an edit budget is right and should be preserved. What the command cannot see: `python/omp-rpc/pyproject.toml:27,28` carry `https://github.com/can1357/oh-my-pi` in `Repository` and `Documentation`. The bare string `oh-my-pi` does not contain the substring `omp`, so this grep misses it — and no work item claims it either, since W7's pattern is `@oh-my-pi/` with a trailing slash and W8a is scoped to TypeScript.<br>**Bằng chứng:** `git grep -n 'omp' -- 'python/**/pyproject.toml'` → 15 lines, matching the plan's 2/6/7 split. `git grep -n 'oh-my-pi' -- python/omp-rpc/pyproject.toml` → `:27 Repository = "https://github.com/can1357/oh-my-pi"` and `:28 Documentation = "https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md"`. The two commands return disjoint sets, which is the proof that neither covers the other.<br>**Trùng:** hai dòng `:27,:28` này là cùng khoảng trống URL attribution đã mở ở W13 #14, chỉ khác phía nhìn. |


---


## Định nghĩa hoàn thành

Mỗi dòng dưới đây là một mệnh đề phán đoán được: đúng hoặc sai, không có vùng giữa. "Bằng chứng" là cách ra phán đoán, không phải lời hứa.

| Work item | Điều kiện phải đúng | Bằng chứng cụ thể |
| --- | --- | --- |
| W1 | `WIRE_NAME` vẫn giữ đúng chuỗi `"omp"`; bốn file test ghim vàng cũ không bị sửa một byte; đúng sáu file nguồn được đổi (đếm bằng `git add -A && git diff --cached --stat` — `git diff --stat` không thấy file test mới), không có file thứ bảy; site DAP đóng gián tiếp chứ không sinh test hay export mới. | `bun test packages/utils/test/wire-name.test.ts` phải ĐỎ khi tạm đặt `WIRE_NAME` thành `"ultraworkers"`, xanh khi hoàn nguyên. `git diff packages/coding-agent/test/ packages/catalog/` rỗng. `git diff --stat` gồm 6 file nguồn + 1 file test mới, không có `packages/catalog/src/wire/codex.ts`. `git grep -n '"omp"'` trên `packages/coding-agent/src/dap/session.ts`, `blob-broker/uploaders-legacy.ts`, `modes/warp-events.ts`, `hindsight/bank.ts` → 0 hit. `packages/coding-agent/src/modes/acp/acp-agent.ts:656` còn `name: "oh-my-pi"`. `bun run check:ts` exit 0. |
| W2 | Scope chuẩn đã đổi sang `@ultraworkers` nhưng `@oh-my-pi` vẫn còn nguyên trong `PI_SCOPE_ALIASES`; và sau khi W7 land, tên trong `packages/utils/package.json` phải là `@ultraworkers/pi-utils`. | W2a: `git grep -n '"@oh-my-pi"' -- packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts` vẫn ra dòng 802; `git diff --stat` đúng 1 file, 2 dòng đổi. W2b: `cd packages/coding-agent && bun test test/pi-scope-aliases.test.ts` ra 1 pass / 0 fail, và `git grep -m1 '"name"' -- packages/utils/package.json` in `@ultraworkers/pi-utils`. Đỏ được cả hai chiều: rơi `"@oh-my-pi"` khỏi alias làm `result.errors` ở dòng 131 đỏ; W2b đi trước W7 thì `Bun.resolveSync("@ultraworkers/pi-utils")` ném ngay lúc nạp module. |
| W3 | Mọi bề mặt người dùng thấy — cả hai tên file log lẫn tên thông báo — dẫn xuất từ `APP_NAME`; và 25 khẳng định ghim literal cũ trong bốn file test đã chuyển sang derive chứ không được ghim lại bằng giá trị mới — `composer-shape-preview.test.ts` 7 chỗ (`:45, :49, :54, :59, :65, :70, :76`), `desktop-notify.test.ts` 9 chỗ (`:114, :117, :132, :144, :147, :153, :163, :166, :202`), `logger-contract.test.ts` 8 chỗ (`:77, :105, :135, :183, :286, :296, :313, :333`), `dirs.test.ts` 1 chỗ (`:82`). | `bun run check:ts` exit 0. Bốn file test (`packages/utils/test/logger-contract.test.ts`, `packages/utils/test/dirs.test.ts`, `packages/tui/test/desktop-notify.test.ts`, `packages/tui/test/composer-shape-preview.test.ts`) xanh, cộng ca OSC99 mới trong `packages/tui/test/terminal-capabilities.test.ts`. `bun run ci:test:smoke` xanh. Chạy tay `PI_CONFIG_DIR=.omp bun packages/coding-agent/src/cli.ts`: cấu hình cũ vẫn đọc từ `~/.omp`, `~/.omp/logs` có tên file tiền tố mới, file log tên cũ còn nguyên rồi tự prune. |
| W4 | `install-id` ở đường dẫn cũ đọc được và trả đúng UUID đã cài chứ không sinh UUID mới; khi cả hai root cùng tồn tại thì đọc về root cũ, ghi về root mới; `packages/utils/test/install-id.test.ts` hiện có vẫn xanh mà không sửa. | `cd packages/utils && bun test ./test/config-dir-dual-root.test.ts ./test/install-id-legacy-read.test.ts ./test/config-dir-write-root.test.ts`. CỔNG CHẠY ĐƯỢC: `cd packages/utils && bun test ./test/install-id.test.ts ./test/profiles.test.ts ./test/dirs-python-gateway.test.ts` (phải 0 fail). CỔNG BỊ CHẶN, ghi `NOT RUN — environment blocked (pi_natives native addon)`, gỡ chặn bằng `brew install ninja && bun --cwd=packages/natives run build` rồi chạy: `cd packages/coding-agent && bun test test/discovery/pi-config-dir.test.ts`. Tuyệt đối không để hai nhóm file này ở cùng một lệnh `bun test` — file bị chặn làm cả lệnh exit 1 trước khi W4 làm bất cứ việc gì và vẫn exit 1 sau khi làm đúng, đúng mẫu cổng đỏ vĩnh viễn mà vết đỏ không mang thông tin mà W5 trong file này đã gọi tên; tệ hơn, nó vẫn phân biệt được (23 pass / 1 fail) nên dễ bị đọc là "phần lớn đã xanh". Bắt buộc thấy đỏ trước khi xanh: cắm một UUID ở đường dẫn `install-id` cũ, resolve với root mới rỗng. Đối chứng âm: sửa tạm `getConfigWriteRootName()` trả về tên cũ thì hợp đồng 3 và 4 phải đỏ. Hai hunk Rust không có test — phải đọc tay `crates/pi-natives/src/crash_handler.rs:269` và `crates/pi-natives/src/oauth_callback/darwin.rs:441`. |
| W5 | `config migrate` xem trước không ghi gì; áp dụng thì chuyển hết mọi root; áp dụng lần hai là no-op và cây đã migrate phải giống byte; `install-id` giữ nguyên giá trị UUID; profile có tên đi theo root. | `bun run check:ts` exit 0 và `bun test packages/utils/test/config-migrate.test.ts` xanh (hôm nay đỏ: file chưa tồn tại, exit 1). Lệnh `cd packages/coding-agent && bun test test/config-migrate.test.ts` mà kế hoạch đưa ra KHÔNG phải cổng — nó đỏ vì thiếu native addon dù feature đã làm hay chưa. Sáu ca trong file kiểm: dry-run không ghi, apply đủ root, apply lần hai `moves.length === 0`, hai root cùng tồn tại thành `conflicts` chứ không phải `moves`, `install-id` bằng giá trị, profile theo root. |
| W6 | Mọi site project-root trỏ về hằng đã ghim `.omp`, mọi site home-root trỏ về hằng config mới; bằng chứng là bốn bộ test coding-agent ghim sẵn đường dẫn `.omp` vẫn xanh mà không được sửa. | `bun run check:ts` exit 0. `cd packages/utils && bun test test/project-dir-name-pinned.test.ts test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts test/config-dir-write-root.test.ts`. `cd packages/coding-agent && bun test test/extensibility/legacy-pi-cli-exports.test.ts test/modes/controllers/omfg-controller.test.ts test/agent-session-rules-reload.test.ts test/advisor-toggle.test.ts test/extensions-discovery.test.ts`. `git grep -n CONFIG_DIR_NAME -- 'packages/**/*.ts'` không còn hit nào là project-root join. `omfg-controller.test.ts:15,178,198` và `agent-session-concurrent.test.ts:1630` phải nguyên vẹn. |
| W6a | `PROJECT_DIR_NAME` cố ý ghim ở `.omp` và phân kỳ khỏi `CONFIG_DIR_NAME`; khẳng định phân kỳ ấy đã được chứng minh đỏ bằng negation proof chứ không chỉ viết ra; `scripts/rename/keep-list.txt` tồn tại, đã commit, và mục project-`.omp` mang lý do sau `#` khác rỗng. | `cd packages/utils && bun test test/project-dir-name-pinned.test.ts` (4 khẳng định: giá trị, phân kỳ, resolve dưới thư mục đối thủ, năm project getter). Negation proof: đặt `PROJECT_DIR_NAME = CONFIG_DIR_NAME`, chạy lại, khẳng định phân kỳ phải ĐỎ. `grep -n CONFIG_DIR_NAME packages/utils/src/dirs.ts` ra đúng 2 hit — 3 hit nghĩa là đã bỏ qua negation proof. `git grep -n CONFIG_DIR_NAME -- 'packages/**/*.ts'` chỉ còn bốn loại hit được phép: home-root, so sánh với chính nó, re-export, và project-root join đã chuyển sang `PROJECT_DIR_NAME`. Điều khoản thứ tư bắt buộc: hai file `packages/coding-agent/test/sdk-system-prompt-template.test.ts` và `packages/coding-agent/test/system-prompt-template.test.ts` phải do W6a sửa sang `PROJECT_DIR_NAME` tại đúng bốn dòng (`:23`, `:42`, `:111`, `:126`) — bốn site đó join vào thư mục project nên sẽ đỏ với cổng trên nếu không ai sở hữu. `bun run check:ts` exit 0. |
| W7 | Trong tập in-scope không còn scope cũ có dấu `/`; changelog không đổi một dòng; tập literal trần vẫn nguyên 16 file vì W8 sở hữu; banner của typecheck đã đổi theo. | Điều kiện mở: `scripts/rename/keep-list.txt` phải có và `CANONICAL_PI_SCOPE` phải xuất hiện — không thì là BLOCKED chứ không phải "chưa xong". Gate A: `test -s /tmp/w7-inscope-files.txt || { echo 'GATE A FAIL: baseline in-scope thiếu — chụp trước khi sửa'; exit 1; }` rồi `xargs grep -F -c '@oh-my-pi/' < /tmp/w7-inscope-files.txt 2>/dev/null | awk -F: '$NF>0' | grep . && { echo 'GATE A FAIL: còn scope cũ trong tập in-scope'; exit 1; }` — đọc danh sách bằng redirect `<` chứ không dùng cờ `-a` (chỉ GNU có; BSD xargs trên macOS in `invalid option` ra stderr và exit 1, `2>/dev/null` nuốt mất nên cổng xanh vô điều kiện), và lọc `$NF>0` vì `grep -c` với nhiều file vẫn in `file:0` cho file sạch nên `wc -l` không bao giờ về 0. Gate B: `diff` với `/tmp/w7-changelog-baseline.txt` rỗng, baseline phải là 13 file / 71 dòng khớp (85 là số lượt khi dùng `git grep -o`; Gate B đếm bằng `git grep -c` nên con số đúng là 71). Gate C: `diff /tmp/w7-bare-baseline.txt /tmp/w7-bare-after.txt` rỗng, baseline phải là 16 file. Gate D: `bun run check:ts` exit 0, banner in `@ultraworkers/...check:types` và không in `@oh-my-pi/...check:types`. Gate F: mọi mục trong `node_modules/@ultraworkers` phải là workspace link, không phải bản registry. `test:ts` phải ghi `NOT RUN — environment blocked`, tuyệt đối không ghi "pass". |
| W8a | Bảy giá trị wire dạng trần giữ nguyên đúng dòng; tập file chứa literal trần vẫn nguyên 15 dòng; W8a chỉ chạm đúng 5 file đã duyệt và chỉ 2 dòng trong `segments.ts`; `keep-list.txt` có ba hàng N18/N19/N20 kèm lý do. | Gate 0 chặn nếu W2 chưa merge, `keep-list.txt` thiếu, hoặc chưa có N7. Gate B vòm 7 địa chỉ: `packages/coding-agent/src/telemetry-export-otlp.ts:51`, `modes/acp/acp-agent.ts:656`, `extensibility/plugins/legacy-pi-compat.ts:802`, `packages/ai/src/registry/oauth/zai.ts:25`, `web/search/providers/exa.ts:26`, `mcp/oauth-flow.ts:629`, `docs/provider-quirks.md:1706`. Gate A: `diff` với `/tmp/w8a-bare-baseline.txt` rỗng (15 dòng). Gate C: `git diff --name-only` khớp đúng 5 file đã liệt kê. Gate D: `git diff --numstat` trên `packages/coding-agent/src/cli/gallery-fixtures/segments.ts` bằng 2 thêm và 2 xoá. Gate E: `keep-list.txt` chứa N18, N19, N20 và mỗi hàng có phần sau `#`. Gate F: `bun run check:ts` exit 0. |
| W8b | Sau pass thay chuỗi, mọi file còn khớp biểu thức ghim trong `*.ts` đều phải có ít nhất một hàng `keep-*`; bảng quyết định thoả cả năm điều kiện (phủ, lý do không rỗng, `keep_refs` khác rỗng khi và chỉ khi `disposition` bắt đầu bằng "keep-", `approved-by` khác `authored-by`, và dư lại); changelog không bị đụng. | `bun scripts/rename/check-disposition.ts --gate0` kiểm header 6 cột, khớp `hits` với `git grep -o`, và phủ cả ba scope trong cùng phạm vi `*.ts` (599 file display-token, 71 file `".omp"`, 14 file literal trần) — toàn repo là 94 file `".omp"` và 16 file literal trần; 23 file `.omp` nằm ngoài `*.ts` (crates/ 4, scripts/ 12, python/ 2, `packages/natives/native/loader-state.js`, `docs/task-agent-discovery.md`, cộng 2 file kế hoạch ngoài git) thuộc W4 và W13 chứ không thuộc W8b nếu checker chỉ quét `*.ts`, phải có hàng riêng trong bảng và không được đọc lẫn ba con số vào một phạm vi. Hai file literal trần ngoài `*.ts` là `docs/provider-quirks.md` và một file kế hoạch ngoài git; `--gate-a` đối chiếu tập còn hit với hàng `keep-*` trong chính bảng. `git diff --name-only origin/main...HEAD -- 'packages/*/CHANGELOG.md'` rỗng. `bun run check:ts` exit 0. Mục này không viết file test nào — đó là quyết định của kế hoạch, và cổng `omp://` chỉ áp dụng khi open_questions #1 trả lời "giữ"; file này không mang câu trả lời, nên nhánh đó chưa có mặc định — cần bạn quyết. |
| W9 | Cả 16 selector đều khớp tiền tố mới và tên cũ trả `false`; 16 hằng số phân biệt nhau; chốt chặn alias từ chối đúng tên lệnh mới nhưng vẫn nhận tên gần giống; block profile do bản cũ ghi vẫn được `upsertBlock` nhận ra; `ci:test:smoke` xanh dưới tên mới. | Tầng 1: `bun run check:ts` exit 0. Tầng 2 — hai bất biến chính, chạy được ngay: `bun test packages/utils/test/worker-host.test.ts` → 4 pass / 0 fail, và `cd packages/coding-agent && bun test test/profile-alias.test.ts` → 23 pass / 0 fail. Hàng âm bắt buộc: `isWorkerHostSelector("__omp_worker_stats_sync")` phải `false`; chứng minh nó sống bằng cách đặt tiền tố về giá trị cũ và thấy đỏ. Tầng 3: `bun test test/worker-selector.test.ts test/worker-selector-parity.test.ts`, chỉ chạy được sau `brew install ninja` rồi `bun --cwd=packages/natives run build`. Tầng 4: `bun run ci:test:smoke` exit 0 — trên darwin phủ 13/16 selector, thiếu `stats_sync` (`aggregator.ts:194` return sớm), `tab` và `js_eval_process`; báo cáo phải ghi đúng 13/16, không được viết "smoke xanh nghĩa là đổi tên selector đã đúng". |
| W10 | Tên release asset ở producer, `BINARY=` trong `scripts/install.sh` và `Dir[...]` trong công thức brew cùng đọc một giá trị; tag Docker giống nhau ở cả bốn site code; và toàn bộ danh sách giữ nguyên còn nguyên byte. | Lệnh ba nguồn in `producer=… consumer_install=… brew=…` và `test "$I" = "$C" -a "$I" = "$B"` — đây là cổng duy nhất bắt được việc tách tên release asset. `git grep -n 'oh-my-pi/pi:dev' -- Dockerfile.robomp python/robomp/docker-compose.yml package.json` phải ra 7 dòng, một tag duy nhất — và phép kiểm một-tag `[ "$(git grep -oh 'oh-my-pi/pi:dev' -- Dockerfile.robomp python/robomp/docker-compose.yml package.json | sort -u | wc -l)" -eq 1 ]` phải in đúng 1. (Chuỗi `PI:dev` không tồn tại ở đâu trong repo và `git grep` phân biệt hoa thường, nên cổng đó đỏ ngay từ cây sạch và vẫn đỏ sau khi làm đúng.) `grep -rn 'runs-on:.*omp-kata' .github/workflows/` đếm phải ra 12 và `ci.yml:34` còn `omp2`. `git diff --stat -- infra/runner.Dockerfile nix/bun.nix scripts/ci-release-checksums.ts` rỗng; `compaction-results` vẫn 3 dòng. Năm file test release/brew trả 0 fail và `bun run check:ts` exit 0. Hai việc phải dán output vào PR chứ máy không tự kiểm được: `bun run ci:test:install-methods`, và bằng chứng brew tripwire đã từng đỏ với thông điệp nêu tên asset cũ. |
| W11 | Detector báo sạch; các test cũ từng ghim literal đã chuyển sang derive mà hợp đồng vẫn còn — `WIRE_NAME` khác `APP_NAME`, khoá theme đã lưu trên máy người dùng không đổi, tên ext method ACP không đổi. | Tầng 1: `bun run check:ts` exit 0; `bun test packages/utils/test/worker-host.test.ts` in `4 pass` và `0 fail`; `bun scripts/ci-rename-test-literals.ts` exit 0 khi sạch. Tầng 2: `bun run test:ts` và `bun run test:py` phải cùng chạy ở CI, kèm canary khẳng định số pass > 0 VÀ không chứa chữ ký `Failed to load pi_natives native addon` hay `No module named pytest`, để môi trường bị chặn không bao giờ được báo là xanh. Tầng 3: không khẳng định nào được tạo ra mà chỉ đọc hằng số rồi so với chính nó. |
| W12 | Một bản phát hành cuối còn scope cũ vẫn để lại cho người dùng một lệnh `omp` chạy được; và manifest sinh ra từ `rewriteManifest` vẫn chứa khoá `omp` trong `bin` sau khi `publishBin` được đổi tên. | Tầng 2 là cổng phân biệt được: `bun test scripts/ci-release-publish.test.ts` — đo được 11 pass / 0 fail trước khi sửa, và phải được thấy đỏ trước rồi xanh sau. `bun run check:ts` exit 0. Tầng 3 (`test/cli/update-cli.test.ts`, `test/update-cli.test.ts`, ba file test release) chỉ chạy được sau `brew install ninja` rồi `bun --cwd=packages/natives run build`. Tầng 4 phải báo BLOCKED chứ không báo PASS: phát hành stub lên registry, `codesign --verify --strict` trên artifact đã ký lại, và sẵn có Apple identity. |
| W13 | Cả hai chiều của allow-list khớp nhau; mọi biến `ULTRAWORKERS_*` hai chiều giữa code và `docs/environment-variables.md` khớp nhau; và không file changelog nào bị sửa. | `bun scripts/rename/check-docs-rename.ts` chạy cả ba quy tắc. Quy tắc A: `comm -23` và `comm -13` đều rỗng — có dòng ở chiều nào cũng đỏ; và phải nuốt exit code của `git grep` thay vì nối bằng `&&`, vì `git grep` exit 1 khi không khớp — nối bằng `&&` thì lệnh phía sau bị bỏ qua và cổng luôn xanh. Quy tắc B: hai danh sách `ULTRAWORKERS_[A-Z0-9_]+` rỗng phần chênh. Quy tắc C: `git diff --name-only -- 'packages/*/CHANGELOG.md'` rỗng. `bun run check:ts` exit 0. Mục này không viết test `bun test` — checker có exit code là hàng phòng thủ thay thế. |
| W13p (W13′) | Ba file thuộc set-(i) không còn khớp `"omp"`; hai file bàn giao không còn ghim tên lệnh cũ; và bốn nguồn `client.py`, `config.py`, `docker-compose.yml`, `.env.example` cùng đọc một tên. | Gate 1 in `set_i_files_still_matching=0` và `keep_counts=5,2,2,8,3` — đếm theo từng file, nên rớt `test_user_group.py` từ 5 xuống 0 không thể bị che bởi việc xóa ở file khác. Gate 2 in `shipped_overrides=[ultraworkers,ultraworkers]`. Gate 3 in `client=… config=… compose=… env=…` bằng nhau. Phần pytest chỉ chạy sau `uv venv` rồi `uv pip install`; nếu `python3 -m pytest --version` fail thì phải báo NOT-RUNNABLE và exit 2, không được lặng lẽ xanh. Hai suite phải gọi riêng, gộp sẽ chết ở `ModuleNotFoundError: No module named 'tests.test_user_group'`. `bun run check:ts` mù với mục này — nó lọc `./packages/*` và oxlint chỉ phủ JS/TS. |
| **Cả milestone** | Cả 16 mục trên cùng xanh trên một môi trường đã build native addon và đã cài pytest, theo đúng thứ tự sóng, và `test:ts` cùng `test:py` đã chạy thật ở CI chứ không phải ở máy đang làm đặc tả. | Thứ tự là điều kiện nghiệm thu, không phải hệ quả: W2b chỉ chạy sau W7; W8a cần W2 merge, `keep-list.txt` có N7 và W7 merge; W8b cần `CANONICAL_PI_SCOPE` của W2 và thư mục `scripts/rename/` do W6a/W7 tạo ra; W13 cần `scripts/rename/docs-legacy-allowlist.txt`. Cổng nào bị chặn bởi môi trường phải ghi `NOT RUN` hoặc `BLOCKED`; một mục chưa chạy không được tính là xanh. |

## Những điều chưa được kiểm chứng

**Chưa có mục nào được code.** Milestone này được đặc tả bằng cách đọc cây mã và chạy lệnh, không phải bằng cách thực hiện công việc. Trạng thái được đo và ghi lại trong chính file cổng: `scripts/rename/` không tồn tại (`git ls-files scripts/rename/` rỗng), nên cả `keep-list.txt` lẫn `disposition.tsv` đều chưa có; `WIRE_NAME` chưa tồn tại trong nguồn; `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:796` vẫn là `CANONICAL_PI_SCOPE = "@oh-my-pi"`. Ba script là cổng phân biệt chính của các mục lớn — `scripts/rename/check-disposition.ts` (W8b), `scripts/rename/check-docs-rename.ts` (W13), `scripts/ci-rename-test-literals.ts` (W11) — đều chưa tồn tại.

**Các cổng mới viết ra, chưa chạy thử ở trạng thái sau.** Phần lớn những gì được đo là ảnh chụp trạng thái *trước* khi làm: `shipped_overrides=[omp,omp]` đỏ, `set_i_files_still_matching=3` đỏ, `client=omp config=omp compose=omp env=omp` xanh. Trạng thái *sau* — cổng xanh với tên mới — chưa lần nào quan sát được. Nhiều cổng còn phụ thuộc file baseline tạm trên máy: `/tmp/w7-inscope-files.txt`, `/tmp/w7-changelog-baseline.txt`, `/tmp/w7-bare-baseline.txt`, `/tmp/w8a-bare-baseline.txt`, `/tmp/w8a-head-baseline.txt`. Phải chụp trước khi sửa; nếu không, lệnh `diff` không có gì để so và cổng biến thành vô nghĩa. Và các con số baseline ấy chỉ đúng trên đúng một trạng thái cây.

**Các neo file:line là ảnh chụp tại một thời điểm, và file này tự mâu thuẫn về điều đó.** W2 và W3 đo ở HEAD `808b365`, còn mười mục còn lại đo ở `84cbac9`. Kế hoạch gốc viết trên commit `5873776` mà repo này không có (`git cat-file -t 5873776` → *fatal: Not a valid object name*), nên toàn bộ số của §2.2 và §2.3 được dẫn lại trên một cây chưa từng tồn tại ở đây. Sai lệch đã được ghi nhận và cần sửa khi dùng: thân `getInstallId` nằm ở `packages/utils/src/dirs.ts:1104` chứ không phải `:1090`; bình luận orphaning ở `:340-355` chứ không phải `:341-352`; `publishBin` thật ở `scripts/ci-release-publish.ts:186` chứ không phải `:165`; 61 file chứ không phải 59 và 70 file chứ không phải 68; dòng trong `python/robomp/tests/test_sandbox.py` lệch từng dòng một. Cổng H của W8a còn ghi rõ mâu thuẫn nội bộ: lệnh của W8b quy ra "15 file" nhưng chạy trên HEAD hiện tại trả 16. Thời gian chạy `bun run check:ts` cũng dao động từ ~29 giây tới ~10 phút giữa các mục cùng file — con số 29 giây là đầu lạc quan nhất, các lần đo khác là 54s, 56s, 85s và 4m14s.

**Môi trường chặn test, nhưng không chặn đều — và file này tự nói hai kiểu.** W1, W2, W3, W7, W8a, W8b và W11 coi `bun test` bị chặn toàn cục — **điều đó sai**. Thực tế: chặn là **CHỌN LỌC theo bề mặt import, không phải toàn cục** — đo tại HEAD `106eb3e`, 2026-09-28, trong khi addon của `packages/natives` CHƯA build: `packages/omptype` **1.191 test / 0 fail** và `packages/utils` chạy được. Chỉ những file import `pi_natives` mới đỏ. Phép đo theo package: `omptype` 1139/0 · `utils` 658/17 · `catalog` 141/104 · `stats` 43/19 · `mnemopi` 146/53 · `agent` 4/46 · `ai` 73/450 · `tui` 149/205 · `coding-agent` 913/1445. W4, W6 và W6a đo được `bun test packages/utils/test/dirs.test.ts` ra 6 pass và `install-id.test.ts` ra 5 pass, vì `packages/utils/src/dirs.ts` không có đường tới addon. Nghĩa là cổng nào thực sự đỏ được trên máy này phụ thuộc vào package nó nằm ở đâu, và điều đó chưa được thống nhất. Lệnh gỡ chặn `bun --cwd=packages/natives run build` tự nó thất bại khi thiếu `ninja` — phải `brew install ninja` trước. `bun run test:py` bị chặn vì lý do khác hẳn: `No module named pytest`; `bun run lint:py` chết với `ruff: command not found`. Không có cổng nào trong sáu milestone này chạy được hết. Ranh giới không nằm ở tên package mà ở đái dựng import: một file trong `packages/utils/test/` chạm `@oh-my-pi/pi-natives` là bị chặn ngay, nên trước khi tin một lệnh `bun test` là chạy được, hãy chạy nó một lần và đọc exit code chứ không suy từ vị trí file.

**Các câu hỏi mở chưa có câu trả lời trong file, nên các nhánh cổng phụ thuộc chưa có mặc định — cần bạn quyết.** W3 nêu "nếu open_questions[0] được giải quyết theo hướng (b) thì phải chạy thêm" một lượt kiểm tra XDG riêng; W8b nói cổng `omp://` "chỉ áp dụng nếu open_questions #1 được trả lời giữ", còn nếu trả lời "đổi" thì 24 file tham chiếu `omp://` phải đi cùng một commit và ba file phải được đổi tên; W9 dẫn `open_questions[5]` cho việc giữ hay đổi sentinel `__omp_worker_test`. File không mang đáp án của cả ba.

**Với một milestone đổi tên, phần cần kiểm chứng nhất là phần không chạy lệnh — và tài liệu này có phần đó.** Một lệnh thay chuỗi chạy sai không có đường lui: không có undo cho một `sed` đã quét xong trên hàng trăm file, và diff thu ra thì rộng đến mức không ai đọc nổi. File này đã dựng một lớp cổng riêng cho loại lỗi đó, và các thành viên của nó đều làm việc mà grep sạch không làm được: W1 giữ bốn file test ghim vàng bất biến byte (bắt được người "giúp" viết lại chúng thành tautology); W7 Gate B chụp baseline changelog 13 file / 71 dòng khớp (85 là số lượt nếu đếm bằng `git grep -o`; Gate B dùng `git grep -c` nên con số đúng là 71) để bắt một `sed` quét changelog — thứ mà Gate A im lặng vì changelog vốn nằm ngoài tập in-scope; W8b Gate 4 làm lại điều tương tự bằng `git diff --name-only`; W8a Gate B ghim từng dòng của bảy giá trị phải giữ, để một `sed` trên 15 file đổi cả bảy mà tập file vẫn không đổi nên Gate A vẫn xanh; W10 giữ nguyên 12 dòng `runs-on: … omp-kata` và `omp2` — nhãn runner tự đăng ký ngoài repo, không gì bên trong repo quan sát được hậu quả; W13 quy tắc C và W9 (mục "không thêm mục changelog") giữ changelog bất biến, đúng quy tắc chỉ cập nhật khi được yêu cầu; W8b điều kiện `approved-by` khác `authored-by` biến một quy tắc quy trình thành thứ máy đọc được.

Nhưng phần đó có biên, và biên đó chưa đo được. Các baseline chỉ có nghĩa trên một máy, một thời điểm; W8b tự nói một `grep` sạch có thể thu được bằng nhiều cách, trong đó có cách xoá sạch cả dòng lẽ ra phải giữ, và cổng của nó chỉ đỏ nếu bảng còn hàng `keep-*` tương ứng — tức là điều kiện chống lại cách xoá sạch lại trông quyền lực vào chính bảng mà người review vừa đọc. W6a nói thẳng hai mục grep của nó là checklist cho người, không phải test tự động. Và còn một bề mặt mà file này không có cổng nào chạm tới: metadata của gói Python khi phát hành. W13p soi nguồn `python/**` và hai file bàn giao (`docker-compose.yml`, `.env.example`), nhưng không mục nào đọc tên gói trong `pyproject.toml` hay `setup.py` — nơi mà tên cũ còn nằm lại sẽ không làm bất kỳ cổng nào ở đây đỏ.
