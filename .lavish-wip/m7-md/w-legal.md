# W0 — Pháp lý và ghim nguồn (điều kiện tiên quyết, KHÔNG phải việc port)

**Sóng / phạm vi:** W0. Đây **không phải một hạng mục port** — không dòng code nào của omp được
đổi. W0 là **điều kiện tiên quyết**: mọi hạng mục port trong M7 đều bị chặn cho tới khi W0 đóng,
vì cổng của W0 là **tiền điều kiện của cổng của chúng**. W0 đứng ở sóng 0, trước Sóng 1.

Phạm vi gồm bốn việc, độc lập nhau, không cái nào chặn cái nào:
**(a)** chốt lại ba nghĩa vụ pháp lý khi lấy code từ senpi;
**(b)** quyết định *mảnh* nào của omp ghi attribution — và đo lại kết luận của nghiên cứu trước,
vì kết luận đó sai ở chỗ quan trọng nhất;
**(c)** ghim nguồn theo commit SHA theo đúng tiền lệ đã có sẵn trong repo;
**(d)** trả lời chiều attribution ngược cho `ttsr` và `todotools`.

> **Không phải việc port nên W0 không nằm trong bảng "23 chung · 21 chỉ-senpi · 18 chỉ-omp"**
> của nghiên cứu cũ, và cũng không cộng vào effort port. Nó là chi phí cố định của milestone.

**Hiệu ứng người dùng thấy:** Không có hiệu ứng trực tiếp lúc chạy. Hiệu ứng thật nằm ở chỗ
**người cài omp từ npm phải nhận được attribution đúng trong payload pháp lý đi kèm package**,
và ở chỗ omp không bao giờ trở thành bên nhận nợ của chính code do mình sinh ra. Cụ thể: sau W0,
mọi đóng góp lấy từ senpi đều mang tên nguồn + commit SHA tới tận file mà người dùng tải về,
và `npm install omp` không đọc được attribution của riêng package nào.

**Effort:** ~1 engineer-day. Tách nhỏ: viết `NOTICE` cạnh code ~0.25 ngày · nhân bản vào
aggregate ~0.25 ngày · **test đồng bộ ~0.5 ngày**. Ngân sách dồn về test là có chủ ý: theo
đúng bài học từ Sóng 1 của M3 (fixture loader A5 tốn nửa ngày vì sinh ra dữ liệu thật), phần
khó ở đây không phải viết văn bản pháp lý mà là làm cho hai bản sao không lệch nhau — và phần
lệch đó không tự biểu hiện, nó chỉ im lặng.

---

## A. Đo lại bốn điều kiện tiên quyết

Bốn mục dưới đây là **kết quả chạy lệnh**, không phải trích lại tài liệu nghiên cứu cũ. Ở mục
B3 nghiên cứu cũ sai, và đó là phần quan trọng nhất của work item này.

### B1. senpi có phải MIT thuần không? — CÓ, và thuần đến từng dòng

`senpi-ref/LICENSE` dài **22 dòng**. Ba dòng đầu là `MIT License` + hai dòng copyright
(`LICENSE:3` Mario Zechner / `LICENSE:4` Yeongyu Kim và senpi contributors). Từ `LICENSE:7`
đến `LICENSE:22` là **văn bản MIT chuẩn nguyên văn, không thêm điều khoản nào** — không có
ràng buộc bổ sung, không có điều khoản phi thương mại, không có điều khoản đòi phê duyệt.

**Ba nghĩa vụ cụ thể** (không phải "ba nghĩa vụ" chung chung):

1. **Giữ nguyên dòng copyright.** MIT đòi "The above copyright notice and this permission
   notice shall be included in all copies or substantial portions" (`LICENSE:14-15`).
   Với code lấy từ senpi, dòng cần giữ là `Copyright (c) 2026 Yeongyu Kim and senpi
   contributors` (`LICENSE:4`).
2. **Ghi attribution cho phần vay mượn** — xem B3 để biết ghi **vào đâu** (nghiên cứu cũ trả lời
   sai chỗ này).
3. **Không lấy thương hiệu.** Đây là nghĩa vụ **tự thêm**, không phải nghĩa vụ MIT. Nguồn:
   `senpi-ref/CONTRIBUTING.md:139-147`.

### B2. Có ràng buộc ẩn nào trong `NOTICE.md` / `CONTRIBUTING.md` / `SECURITY.md` không? — KHÔNG

Đo bằng `grep -niE` trên cả ba file, không đọc hết:

| file | dòng | kết quả |
| --- | --- | --- |
| `NOTICE.md` | 67 | 4 khoản, **tất cả permissive**. LinkeDOM 0.18.12 (**ISC** — nghĩa vụ duy nhất có hành vi thật trong toàn bộ senpi: phải giữ copyright + permission notice), system prompt cảm hứng từ Gajae-Code (MIT), extension TTSR port từ oh-my-pi (MIT), tool todo + `/todo` port từ oh-my-pi (MIT). |
| `CONTRIBUTING.md` | 162 | **Một** dòng khớp `licen`, và nó không liên quan: `CONTRIBUTING.md:143` nói phải gọi "Anthropic" theo referentially và tuân thủ điều khoản pháp lý của Anthropic. **Không có CLA. Không có DCO.** |
| `SECURITY.md` | 87 | **Không có** dòng khớp `licen`/`attribut`/`notice`/`third-party`/`disclos`. Đây thuần là chính sách công bố lỗ hổng. |

Nói cách khác: **ba nghĩa vụ ở B1 là toàn bộ nghĩa vụ.** Không có điều khoản bổ sung nào ẩn.

### B3. ĐÍNH CHÍNH — omp không có `NOTICE.md`, nhưng kết luận "nên tạo `NOTICE.md`" là SAI

Đây là phần quan trọng nhất của work item, và nó đảo ngược một chỉ dẫn cụ thể của nghiên cứu cũ.

**Mệnh đề của nghiên cứu cũ:** *"ghi attribution vào `NOTICE.md` của omp — omp hiện chưa có file
này"*. **Nửa đầu đúng, nửa sau dẫn tới hành động sai.**

`ls $OMP/NOTICE.md` → không tồn tại. Đã kiểm chứng. **NHƯNG** omp không thiếu cơ chế
attribution — omp đã có, đã dùng, đã ghim SHA, và **đã chứng minh nó tới tận người dùng npm**.
Cơ chế đó không tên là `NOTICE.md`:

**(i) Quy ước: `NOTICE` cạnh code.** Mỗi thành phần vay mượn trong omp có một file pháp lý
**nằm ngay cạnh thư mục code của nó**, không tập trung ở root:

| file pháp lý cạnh code | thành phần |
| --- | --- |
| `crates/vendor/brush-core/LICENSE` | brush shell, patch `[patch.crates-io]` |
| `crates/pi-builtins/LICENSE` | pi-builtins vendored |
| `crates/pi-shell/NOTICE` | thuật toán từ RTK |
| `crates/pi-natives/data/LICENSE.ctok` | ctok tokenizer data |
| `crates/pi-natives/src/fonts/Silver.LICENSE` | font Silver |
| `packages/coding-agent/src/markit/NOTICE` | markit-ai |
| `packages/coding-agent/src/export/html/vendor/NOTICE` | thư viện vendor của export html |

**(ii) Tiền lệ ghim SHA — `crates/pi-shell/NOTICE` là khuôn mẫu.** Nó ghi tên thuật toán đã
mượn, **SHA commit nguồn** `878af7de99e0ba71da2e8fd996f6b52a1836e06c`, tên file nguồn, tên file
đích, và **nêu rõ nó giữ gì / bỏ gì**. Đây đúng là hình thức M7 cần cho senpi.

**(iii) Aggregate `THIRD-PARTY-NOTICES.txt` (22.901 dòng) nhân bản từng file trên.** Mục
`TRACKED VENDORED CODE AND ASSET NOTICES` (`:18`) liệt kê từng file pháp lý cạnh code, mỗi mục
mở đầu bằng đường kẻ `--` rồi **đường dẫn file nguồn** — ví dụ `:249-250` rồi nội dung
`crates/pi-shell/NOTICE`, trong đó SHA xuất hiện ở `:260`. Đã kiểm chứng bằng `git grep -w`
rằng nội dung `markit/NOTICE` và `pi-shell/NOTICE` **thật sự nằm trong aggregate**, không phải
trích dẫn chéo.

**(iv) Aggregate này được BÁN RA — và đây là lý do quyết định.** Không phải file lưu trữ:

- `scripts/ci-release-publish.ts:93-94` đặt hằng `MIT_LICENSE` và `THIRD_PARTY_NOTICES`.
- `legalPayloadFiles()` (`:97`) trả về `["LICENSE", "THIRD-PARTY-NOTICES.txt"]` cho package MIT
  (`:100`).
- `stageLegalPayloads()` (`:111`) **chép đúng hai file đó vào mọi package publishable**.

Nghĩa là: attribution đặt trong `THIRD-PARTY-NOTICES.txt` **đi tới người dùng qua từng package
trên npm**. Attribution đặt trong một file `NOTICE.md` mới ở root thì **không** — không có
script nào chép nó, không có checksum nào băm nó, không có ai đọc nó.

Ngoài ra nó còn đi vào: artifact GitHub Release (`.github/workflows/ci.yml:1178` và `:1188`),
`SHA256SUMS.txt` (`ci.yml:1174-1177`), image Docker (`Dockerfile:167` → `/usr/share/doc/omp/`),
gói nix (`nix/package.nix:210` → `$out/share/doc/omp/`), và `README.md:686` trỏ người đọc tới.

> **Kết luận hành động: KHÔNG tạo `NOTICE.md` ở root.** Làm vậy là tạo ra một bề mặt pháp lý
> thứ hai, không được ship, không ai đọc, và tách attribution ra khỏi payload đang được
> kiểm chứng. Làm theo tiền lệ: `NOTICE` cạnh code + nhân bản vào aggregate.

**Cạm bẫy cần ghi rõ:** aggregate tự mô tả mình là *"This generated… aggregate"*
(`THIRD-PARTY-NOTICES.txt:3`) nhưng **không có generator nào trong repo** — `scripts/` không
có script nào sinh ra nó, `package.json` không có npm script nào nhắc tới, `ci.yml` chỉ dùng nó
làm path filter và artifact. Nó được **duy trì bằng tay**. Hệ quả trực tiếp: **không có gì tự
bắt lệch**, nên M7 sửa cả hai bản và phải tự thêm test đồng bộ (xem "Hợp đồng test"). Nói thẳng
"generated" trong khi không có generator là một dối trá; đừng tin vào từ đó.

### B4. Chiều attribution ngược: `ttsr` và `todotools` — omp KHÔNG nợ gì

Câu hỏi: nếu M7 chạm vào `ttsr`/`todotools` của senpi (dù chỉ để loại bỏ), `NOTICE.md` của ta
có phải giữ dòng *"ported from oh-my-pi"* không?

**Trả lời: KHÔNG. Và giữ dòng đó sẽ SAI SỰ THẬT.**

Lập luận, ba bước, mỗi bước đều đo được:

1. **Hướng dòng đi là omp → senpi, không phải ngược lại.** `senpi-ref/NOTICE.md:37-51` và
   `:53-67` nói nguyên văn TTSR và todo *"ported and adapted from oh-my-pi's"*, rồi liệt kê
   **7 file của omp**. `NOTICE.md:45` trỏ tới `https://github.com/can1357/oh-my-pi` — đúng
   upstream của repo này.
2. **Cả 7 file đó đều tồn tại trong omp, và là của omp.** Kiểm bằng `git ls-files` từng
   path: `packages/coding-agent/src/export/ttsr.ts`, `src/session/ttsr-coordinator.ts`,
   `src/capability/rule.ts`, `src/prompts/system/ttsr-interrupt.md`, `src/tools/todo.ts`,
   `src/prompts/tools/todo.md`, `src/modes/controllers/todo-command-controller.ts` — **7/7
   EXISTS**. omp là bên **sáng tạo**, không phải bên nhận.
3. **Quyền đã nằm sẵn trong giấy phép của chính omp.** `LICENSE:3-5` đã ghi
   `Copyright (c) 2025 Mario Zechner` / `2025-2026 Can Bölük` / `2026 Stencil Labs, Inc.` —
   ba bên mà `senpi-ref/NOTICE.md:48-50` và `:64-66` credit cho code đó.

**Suy ra cụ thể, theo file:**

| tình huống | file của ta phải ghi gì |
| --- | --- |
| M7 **không** chạm `ttsr*` / `todo*` của omp | **Không ghi gì cả.** Không có file nào của ta thay đổi. |
| M7 **sửa** một file gốc của omp (`ttsr.ts`, `todo.ts`, …) | **Không ghi gì.** Đây là sửa code của chính mình, phủ bởi `LICENSE:3-5`. Không có bên thứ ba nào trong vòng. |
| M7 **xoá** một file gốc của omp | **Không ghi gì.** Xoá không tạo nghĩa vụ attribution. |
| M7 **lấy code CHỈ CÓ Ở senpi** rồi đặt vào một trong các file trên | Ghi attribution **senpi** cho **phần đó** (xem B3), **không** ghi "ported from oh-my-pi" cho phần code gốc vẫn nằm đó. |

**Lưu ý vòng tròn attribution — đây là cái bẫy thật.** Nếu M7 lấy `ttsr` **từ senpi** (tức
đi vòng omp → senpi → omp), thì `NOTICE` cạnh code phải ghi **cả hai chiều** cho phần đó:
senpi là nguồn *trực tiếp* của bản M7 nhận, còn oh-my-pi là nguồn *gốc*. Ghi thiếu tầng gốc là
mất vòng dấu vết; ghi tầng gốc mà bỏ tầng trung gian là sai về mặt sự thật. **Hai dòng, không
phải một.** Đây là lý do nghiên cứu cũ nói "vẫn phải giữ dòng 'ported from oh-my-pi'" là
**đúng một nửa**: đúng khi M7 thực sự đi vòng, sai khi M7 chỉ sửa/xoá code của chính mình.

---

## File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| *(thư mục đích của hạng mục port)/NOTICE` | tạo | **MỘT file cho mỗi hạng mục port**, đặt cạnh code đã port, theo đúng khuôn `crates/pi-shell/NOTICE`. Nội dung bắt buộc có 5 mảnh: tên repo nguồn + URL · **SHA commit đã ghim** · tên file nguồn ở senpi · tên file đích ở omp · điều khoản giữ gì / bỏ gì. | Có. `crates/pi-shell/NOTICE` tồn tại và có **đúng 5 mảnh đó** — SHA ở dòng 8, tên file nguồn và đích cùng một câu, phần "preserves failures… strips header framing" ngay sau. Khuôn này đã qua review, không phải phỏng đoán. **Thư mục đích chưa xác định** — nó do hạng mục port chọn, W0 chỉ chốt khuôn. |
| `THIRD-PARTY-NOTICES.txt` | sửa | Nhân bản `NOTICE` mới vào mục `TRACKED VENDORED CODE AND ASSET NOTICES` (bắt đầu `:18`), theo đúng hình thức mục hiện có: đường kẻ `--`, rồi **đường dẫn file cạnh code**, rồi nội dung. Vị trí chèn: cùng nhóm với `crates/pi-shell/NOTICE` (`:249`). | Có. Mục `:18` tồn tại; mục pi-shell `:249-250` là hình thức mẫu; nội dung của nó **thật sự nằm trong aggregate** (SHA lặp ở `:260`) — `git grep -w` xác nhận. |
| `scripts/ci-release-publish.test.ts` | sửa | **MỞ RỘNG** describe `published legal payloads` (`:141`) bằng hợp đồng attribution: payload pháp lý mà package MIT thật sự giao cho npm phải chứa dòng copyright của senpi và SHA đã ghim. Đây là file test đã có, đã có factory, **không** tạo file mới. | Có. `scripts/ci-release-publish.test.ts:141-166` tồn tại, `describe("published legal payloads")` ở `:141`, `stageLegalPayloads` được gọi thật ở `:159`. `legalPayloadFiles` đã export (`:97`) và đã có test (`:142-146`). |
| `packages/coding-agent/test/notices-tracked-files-exist.test.ts` | tạo | Test MỚI: mọi đường dẫn mà mục `TRACKED VENDORED CODE AND ASSET NOTICES` khai báo phải **tồn tại trên đĩa**. Đây là hợp đồng chống aggregate nói về file đã bị đổi tên/xoá. | Có. Thư mục test tồn tại. Danh sách path đọc được ở `THIRD-PARTY-NOTICES.txt:22,59,250,289,320,339,375` — 7 mục, tất cả là file có thật (xem bảng B3-(i)). File test này chưa tồn tại. |
| `LICENSE` | **KHÔNG đụng** | Không thêm dòng nào. Attribution cho code vay mượn **không** thuộc `LICENSE` của bên nhận — nó thuộc `NOTICE`. Thêm vào đây sẽ nói dối rằng omp sở hữu thêm một đóng góp gốc. | Có. `LICENSE:1-22` là MIT thuần của omp với 3 dòng copyright tại `:3-5`; phần `TRACKED` của aggregate tách bạch "first-party licensing" khỏi "third-party code" ngay ở `THIRD-PARTY-NOTICES.txt:4-5`, đúng ranh giới này. |
| `NOTICE.md` (root) | **KHÔNG tạo** | Đây là kết luận trung tâm của B3. Tạo file này là tạo bề mặt pháp lý thứ hai không được ship. | Có. `ls NOTICE.md` → không tồn tại; `git ls-files \| grep -i notice` → **không có entry ở root** (10 hit còn lại đều là `NOTICE` cạnh code, `*-notice.md` là prompt, và `glyph-notice.md`). |

---

## Các bước

1. **CỔNG — lấy quyết định P-L1 bằng văn bản từ người duy trì TRƯỚC khi viết bất kỳ dòng
   pháp lý nào:** xác nhận rằng cơ chế attribution của omp là **`NOTICE` cạnh code + nhân bản
   vào `THIRD-PARTY-NOTICES.txt`**, và **không** tạo `NOTICE.md` ở root. Ghi câu trả lời
   nguyên văn vào work item này trong kế hoạch đã track. **Không** ghi vào file trong
   `.lavish-wip/` — thư mục đó chưa được track, nên không sống sót cùng commit và người
   review sẽ không thấy. Vì sao cần hỏi: cả ba lựa chọn (tạo `NOTICE.md` mới / dùng
   `THIRD-PARTY-NOTICES.txt` / sửa `LICENSE`) đều *hợp pháp về mặt pháp lý* — điều B3 chứng
   minh là cái nào **tới được người dùng**, và đó là tiêu chí duy nhất để chọn. Đây là quyết
   định về **bề mặt phân phối**, không phải về luật, nên không tự ý quyết được.
   *(anchor: `THIRD-PARTY-NOTICES.txt:4-5` (first-party vs third-party), `scripts/ci-release-publish.ts:100` (payload = LICENSE + aggregate))*

2. **Đóng băng SHA nguồn và ghi nó vào work item trước khi động vào code.** SHA là
   `ea9216269e9254b821446130b60d1e00759761dc`. Ghi kèm ngày đo và lệnh đã dùng để xác minh nó
   vẫn là commit đó (`git -C <senpi-ref> rev-parse HEAD` → đúng SHA; `git -C <senpi-ref>
   log -1 --format='%ci %s'` → `2026-09-28 14:12:31 +0900 Merge pull request #2273 from
   code-yeongyu/fix/2262-live-output-tail`). **Cấm** ghi "bản mới nhất", "HEAD", hay tên tag.
   Lý do không phải hình thức: `README.md:9` của senpi tự mô tả là *"an in-flight fork… Use it;
   don't bet a production pipeline on it"*, và senpi đã **xoá** cả stack computer-use 10 crate
   vì OMO đã sở hữu tính năng đó. Một tham chiếu không ghim không tái lập được, và đó chính là
   định nghĩa của việc không thể kiểm toán. *(anchor: `senpi-ref/README.md:9`)*

3. **Sửa `NOTICE` cạnh code, theo khuôn `crates/pi-shell/NOTICE`.** Sao chép đủ 5 mảnh; mảnh
   quan trọng nhất và mảnh dễ bỏ nhất là **"giữ gì / bỏ gì"** — mục `pi-shell/NOTICE` nêu rõ nó
   giữ failure/error/tổng kết và bỏ framing, và đó là thứ giúp người đọc sau này phân biệt
   "phái sinh" với "chép nguyên". *(anchor: `crates/pi-shell/NOTICE:1-12` (khuôn), `:8` (SHA))*

4. **Nhân bản vào `THIRD-PARTY-NOTICES.txt`.** Chèn cạnh mục `crates/pi-shell/NOTICE`
   (`:249`). **Sửa cả hai bản trong cùng một commit** — xem bước 6 về lý do đây là điểm dễ
   hỏng nhất. *(anchor: `THIRD-PARTY-NOTICES.txt:18` (mục đích), `:249-250` (mục mẫu))*

5. **Mở rộng test payload pháp lý — đây là hợp đồng thật, không phải kiểm tra văn bản.** Gọi
   `stageLegalPayloads` thật (như `:159` đã làm với fixture tạm) rồi khẳng định **payload mà
   package MIT giao cho npm** chứa dòng `Copyright (c) 2026 Yeongyu Kim and senpi
   contributors` và chứa SHA đã ghim. Vì sao đây là hợp đồng chứ không phải source-grep: nó
   chạy hàm export thật và khẳng định **byte đi ra ngoài**, tức đúng thứ người dùng nhận
   được. Đọc `THIRD-PARTY-NOTICES.txt` để khẳng định nội dung là **cần** — đó là dữ liệu mà
   hàm đó phát ra, không phải văn bản nguồn của một file triển khai.
   *(anchor: `scripts/ci-release-publish.test.ts:159` (gọi thật), `scripts/ci-release-publish.ts:111`)*

6. **Tạo test "mọi file mà aggregate khai báo đều tồn tại".** Đọc các đường dẫn trong mục
   `TRACKED VENDORED CODE AND ASSET NOTICES`, khẳng định từng cái tồn tại trên đĩa. Hợp đồng
   này bắt được đúng tai nạn của bước 4: đổi tên hoặc xoá `NOTICE` cạnh code mà quên sửa
   aggregate → aggregate vẫn khoe một file không tồn tại, và không có gì báo.
   *(anchor: `packages/coding-agent/test/notices-tracked-files-exist.test.ts` (mới), `THIRD-PARTY-NOTICES.txt:22,59,250,289,320,339,375`)*

7. **Thêm chốt chống hụt hụt (non-vacuity) vào CẢ HAI test.** Mỗi test phải khẳng định nó
   **thật sự đọc được dữ liệu** trước khi khẳng định điều kiện: khẳng định đã phân tích được
   **ít nhất một** mục `TRACKED`, và khẳng định chuỗi payload pháp lý **không rỗng**. Một
   parser hỏng tìm ra 0 mục rồi `expect(0).toBe(0)` sẽ làm cổng **xanh trong khi không kiểm tra
   gì** — đúng cái bẫy đã làm hỏng một test khác trong M3 (fixture một dòng vượt qua ràng buộc
   `lines.length > 1`). Cổng xanh mà không đo được gì là cổng không có tác dụng.
   *(anchor: test mới, phần khẳng định mở đầu)*

8. **CỔNG — câu hỏi P-L2: `NOTICE` cạnh code có phải MỘT file cho cả M7, hay MỘT file cho mỗi
   hạng mục port?** Đề xuất: **một file cho mỗi hạng mục port**, đặt cạnh thư mục đích, vì khuôn
   hiện có (`markit/NOTICE`, `pi-shell/NOTICE`) là **một file cho một thành phần**, và một
   `NOTICE` gộp cho cả milestone sẽ phải sửa lại mỗi khi thêm hạng mục. Hỏi trước vì nó quyết
   định cấu trúc thư mục của các hạng mục port về sau. *(anchor: `packages/coding-agent/src/markit/NOTICE:1-4`, `crates/pi-shell/NOTICE:1-3`)*

9. **Quy tắc bump SHA — trách nhiệm và kiểm tra.** Người chịu trách nhiệm là **work item port
   đã đưa mã vào**; một lần bump SHA **không** đi kèm thay đổi hành vi. Bắt buộc kèm: diff
   `git -C <senpi-ref> diff <sha-cũ>..<sha-mới> -- <đường dẫn nguồn đã port>`, và ghi kết quả
   vào `NOTICE`. Nếu diff chạm phần đã port thì bump phải là một work item riêng có cổng
   riêng, không được gộp. Cơ chế kiểm tra ở đây là **cổng đỏ-xanh ở Cổng hoàn thành**, không
   phải CI tự động — vì senpi nằm ngoài repo, CI không thể fetch nó mà không thêm một
   phụ thuộc mạng vào đường release.
   *(anchor: bước 2, `senpi-ref/README.md:9`)*

---

## Hợp đồng test

Bốn hợp đồng. **Cả bốn đều là hành vi quan sát được**, không đọc văn bản nguồn của file
triển khai để khẳng định về hình dạng code.

| # | hợp đồng | loại | vì sao đáng có |
| --- | --- | --- | --- |
| **T1** | Payload pháp lý mà `stageLegalPayloads` giao cho một package MIT **chứa** dòng copyright của senpi **và** SHA đã ghim. | dương | Đây là *hợp đồng duy nhất quan trọng*: attribution tới được người dùng qua npm, hay không tới. Bỏ nó thì M7 port đầy đủ mà không ai được biết. |
| **T2** | Cùng payload đó **không** chứa cách diễn đạt làm senpi thành bên bảo trợ/nhà cung cấp của omp (không có "endorsed by", không có "vendored from senpi" ở dạng bảo trợ). | **phủ định** | Nghĩa vụ thứ ba (B1.3) là nghĩa vụ **tự thêm**, và nó là nghĩa vụ duy nhất không ai kiểm tra bằng mắt một lần đọc thẳng. `CONTRIBUTING.md:139-147` của senpi nói rõ: *"Do not make senpi look endorsed by another project or vendor."* Chỉ `toContain` thì lỗi này lọt. |
| **T3** | Mọi đường dẫn khai báo trong mục `TRACKED VENDORED CODE AND ASSET NOTICES` đều tồn tại trên đĩa. | dương, phổ quát | Bắt tai nạn đổi tên/xoá file cạnh code mà aggregate quên sửa. Hợp đồng này có giá trị **hôm nay** cho 7 mục sẵn có, không chỉ cho M7. |
| **T4** | Cả T1 và T3 **đều khẳng định chúng đọc được dữ liệu** trước khi khẳng định điều kiện (≥1 mục được phân tích; payload không rỗng). | chống hụt hụt | Không có T4 thì một parser hỏng làm cổng xanh vô nghĩa. Đây là phần rẻ nhất và là phần hay bị bỏ nhất. |

**Cạm bẫy đã loại trừ, nêu rõ để không ai cắm vào:** đừng viết test khẳng định nội dung file
cạnh code xuất hiện **nguyên văn** trong aggregate. Điều đó **không đúng với toàn repo**:
mục `crates/vendor/brush-core/LICENSE` (`:21-57`) là **diễn giải lại có thêm văn xuôi**, không
phải bản sao. `markit` và `pi-shell` thì đúng là được nhân bản. Test chỉ nên khẳng định
**tồn tại** (T3) và **payload có attribution** (T1) — đừng khẳng định nhân bản verbatim trên
toàn repo, sẽ đỏ ngay vì brush-core.

**Không** dùng `mock.module()`. **Không** dùng `tsc` — `bun check`. **Không** đặt test này
trong `packages/natives/` hay `crates/` — nó thuộc `packages/coding-agent/test/` vì
`stageLegalPayloads` là script root và đó là nơi test script root đang nằm.

---

## Cổng hoàn thành

Cổng này phải **ĐỎ** được khi attribution còn thiếu, và phải phân biệt được "đã làm" với
"không chạy được".

**Lệnh:**

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
bun test scripts/ci-release-publish.test.ts packages/coding-agent/test/notices-tracked-files-exist.test.ts
```

**Đỏ trước, xanh sau — và bằng chứng đỏ phải thu được TRƯỚC khi làm bước 3:**

1. Chạy cổng ở cây sạch. Phải **ĐỎ** vì `NOTICE` của senpi chưa tồn tại, nên T1 không tìm thấy
   attribution. **Nếu cổng XANH ở cây sạch, dừng lại** — nghĩa là test không kiểm tra gì cả
   (vi phạm T4) và nó sẽ không bảo vệ gì sau này.
2. Làm bước 3-6.
3. Chạy lại. Phải **XANH**.
4. **Bằng chứng khác rỗng:** `git add -A && git diff --cached --stat` phải **thấy file mới**.
   `git diff --stat` một mình **không** thấy file mới — đây là bẫy đã làm hỏng tài liệu
   trước. Phải thấy đúng: 1 file `NOTICE` cạnh code (tạo), `THIRD-PARTY-NOTICES.txt` (sửa),
   `scripts/ci-release-publish.test.ts` (sửa), và file test mới (tạo). Cổng xanh mà
   `git diff --cached --stat` rỗng nghĩa là không có gì được làm.
5. **Đỏ-xanh ngược, một lần, để chứng minh cổng có tác dụng:** tạm xoá dòng SHA khỏi
   `THIRD-PARTY-NOTICES.txt`, chạy lại cổng, phải **ĐỎ**; khôi phục, phải **XANH**. Không làm
   bước này thì chưa biết cổng có bắt được thứ nó nói là bắt hay không.
6. `bun check` xanh.
7. Bước 1 (P-L1) và bước 8 (P-L2) có câu trả lời văn bản **đã ghi trong kế hoạch đã track**,
   không phải trong `.lavish-wip/`.

**Điều kiện tiên quyết:** cổng này **XANH là tiền điều kiện cho cổng của mọi hạng mục port**.
Một hạng mục port không được báo xanh khi attribution của nó chưa có trong payload.

---

## Rủi ro

| rủi ro | mức | đánh giá |
| --- | --- | --- |
| **Nghiên cứu cũ đã dẫn người thực hiện tạo `NOTICE.md` ở root** | **cao nếu không đính chính** | Đây chính là lý do W0 tồn tại như một hạng mục riêng. `NOTICE.md` ở root sẽ **không** được `stageLegalPayloads` chép vào package, không có trong `SHA256SUMS.txt`, không vào Docker/nix. Attribution viết ở đó là attribution **không tới được ai**. Đính chính nằm ở B3 và cổng bước 1. |
| **Sửa `THIRD-PARTY-NOTICES.txt` một tay, quên `NOTICE` cạnh code** | trung bình | Hệ quả: người đọc mã không thấy attribution ở nơi mã nằm, và bước bump SHA sau này không biết phải diff file nào. T3 bắt được chiều ngược (aggregate trỏ vào file không tồn tại) nhưng **không** bắt được chiều này. Vì vậy bước 4 nói rõ "sửa cả hai bản trong cùng một commit". |
| **Aggregate tự gọi mình "generated" nhưng không có generator** | trung bình | Không có gì tự bắt lệch, và không có gì cảnh báo khi ai đó chạy lại một quy trình sinh file (nếu tồn tại ngoài repo) và ghi đè bản sửa tay. Đã ghi rõ ở B3. Nếu sau này phát hiện có generator ngoài repo, **T3 và T1 phải chạy lại** vì chúng giả định bản tay. |
| **Ghim SHA rồi để lệch** | trung bình | Senpi là fork "in-flight" tự thừa nhận không ổn định, đã xoá cả stack 10 crate. SHA cũ vẫn **tái lập được** (đó là mục đích của việc ghim) nhưng sẽ lệch dần về sau. Bước 9 gắn trách nhiệm vào work item port và bắt kèm diff. |
| **Đọc thẳng `senpi-ref/` khi đánh giá bump** | thấp | `senpi-ref` là checkout cục bộ **không được track** (như `pi-ref` và `claude-code-ref` trước đó). Bằng chứng đọc từ nó không sống sót cùng commit. Vì vậy bước 1 và bước 8 ghi câu trả lời vào **kế hoạch đã track**, không phải vào `.lavish-wip/`. |
| **Test payload pháp lý biến thành source-grep** | thấp | Đã chặn ở Hợp đồng test: khẳng định trên **payload do hàm thật phát ra**, không phải trên văn bản nguồn của file triển khai. Đọc chính `THIRD-PARTY-NOTICES.txt` là cần — nó là dữ liệu đầu ra, không phải nguồn. |
| **Sửa nhầm `LICENSE`** | thấp | Đã khoá ở bảng File: `LICENSE` dòng **KHÔNG đụng**, kèm lập luận. Ranh giới first-party/third-party đã được chính repo vạch ở `THIRD-PARTY-NOTICES.txt:4-5`. |

