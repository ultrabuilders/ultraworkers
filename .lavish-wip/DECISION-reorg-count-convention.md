# Quyết định: đếm thư mục trong `PACKAGE_REORGANIZATION_PLAN.md` — quy ước `.ts`/`.tsx` là mặc định, sửa **một** số cũ

Trả lời mục 10 của `applied/NEEDS-OWNER-DECISION.md`.

**Đo trên `~/Projects/ultraworkers` @ `e55bbee`, nhánh `milestone-1`.**
Tài liệu này chỉ quyết. Không sửa file kế hoạch nào.

## Tóm tắt một dòng

Mục 10 đúng ở chỗ "147 là số cũ", nhưng **sai ở chỗ còn lại**: nó bảo hai số `50` và `7` cũng
lỗi thời. Hai số đó **đang đúng**. Làm theo khuyến nghị của mục 10 sẽ **sinh ra** đúng cái
lỗi quy ước lẫn mà mục 10 đang cố dẹp.

## Đo trước

```bash
cd packages/coding-agent/src/tools
find . -type f | wc -l                                                  # 174
find . -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l              # 149
find . -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn
#  149 ts   21 txt   2 py   2 js
```

Hai quy ước đều cho ra số đúng. Câu hỏi là **file nào đang dùng quy ước nào**. Trả lời được
bằng cách so *các hàng khác* của chính bảng đó, chứ không phải bằng cách đo riêng `tools`.

## Bằng chứng quyết định: bảng §1 (dòng 98–116) dùng quy ước `.ts` ở 10/11 hàng

```bash
cd packages/coding-agent/src
for d in config session tools modes extensibility utils cli capability internal-urls registry mcp; do
  printf "%-16s all=%-4s ts=%-4s\n" $d \
    "$(find $d -type f | wc -l | tr -d ' ')" \
    "$(find $d -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l | tr -d ' ')"
done
```

| Hàng §1 (dòng 102) | File ghi | **đếm .ts** | đếm tất cả | Khớp quy ước nào |
|---|---:|---:|---:|---|
| `config` | 24 | **24** | 25 | `.ts` |
| `session` | 89 | 90 | 90 | `.ts` (lệch 1) |
| `tools` | 149 | **149** | 174 | `.ts` |
| `modes` | 67 | **67** | 67 | `.ts` |
| `extensibility` | 68 | **68** | 71 | `.ts` |
| `utils` | 41 | **41** | 43 | `.ts` |
| `cli` | 78 | **78** | 78 | `.ts` |
| `capability` | 18 | **18** | 18 | `.ts` |
| `internal-urls` | 29 | **29** | 29 | `.ts` |
| `registry` | 3 | **3** | 3 | `.ts` |
| `mcp` | 26 | **26** | 26 | `.ts` |

Không hàng nào khớp cột "tất cả". Bảng §1 là bảng **`.ts`/`.tsx`**. Vậy `149` ở dòng 102
không phải "con số may mắn đúng" — nó là **số đúng theo quy ước mà cả bảng đang dùng**.

## Hai số mà mục 10 bảo sửa — hoá ra đã đúng

`PACKAGE_REORGANIZATION_PLAN.md:652` ghi: *"`tools/browser` 50 file, `tools/computer` 7,
`tools/jfind` 8"*.

```bash
for d in browser computer jfind; do
  printf "%-9s all=%-3s ts=%s\n" $d \
    "$(find $d -type f | wc -l | tr -d ' ')" \
    "$(find $d -type f -name '*.ts' | wc -l | tr -d ' ')"
done
```

| Số ghi ở `:652` | đếm .ts | đếm tất cả | Kết luận |
|---|---:|---:|---|
| `browser` = 50 | **50** | 59 | **đúng theo `.ts`** |
| `computer` = 7 | **7** | 9 | **đúng theo `.ts`** |
| `jfind` = 8 | 8 | 8 | đúng (thuần `.ts`) |

Chênh lệch 25 file ở `browser` và 2 file ở `computer` là **asset không phải code**:
`tools/browser/` chứa 21 file `.txt` (bundle stealth, `manifest.json.txt`, `LICENSE.txt`, …)
cộng 2 file `prelude.js`, và `tools/computer/` chứa 2 file `prelude.py`.

**Phần tốt nhất của câu trong file, mà mục 10 bỏ qua:** ngay dòng `:653`, file tự nói ra quy
ước của nó — *"`tools/puppeteer` **14 file `.txt` + 0 file `.ts`**"*. Tôi đo lại:
`find puppeteer -name '*.ts' | wc -l` → **0**, `-name '*.txt'` → **14**. Khớp tuyệt đối.

Nghĩa là **quy ước `.ts` đã có sẵn trong file, chỉ là viết rải rác ở một chỗ thay vì ở đầu
bảng.** Đó mới là gốc rễ thật, và nó rẻ hơn nhiều so với một đợt đo lại toàn bộ.

## Vậy còn lại đúng cái gì?

| Chỗ | Ghi | Đo | Phán |
|---|---|---|---|
| `:16`, `:102`, `:1230` | `tools` = **149** | 149 (`.ts`) | ✅ đúng |
| `:336` | `147 file` | 149 | ❌ **cũ** |
| `:377` | `147` file / `59.871` dòng | 149 / 61.700 | ❌ **cũ** |
| `:449` | `147 file / 59.871 = 407 dòng/file` | 149 / 61.700 = **414** | ❌ **cũ** (407 là hệ quả của 147) |
| `:647` | `### 4.2 tools (147 file, …)` | 149 | ❌ **cũ** |
| `:102` | `61.718` dòng | 61.700 (`.ts`) | ❌ lệch 18 dòng |
| `:652` | `browser` 50, `computer` 7, `jfind` 8 | 50 / 7 / 8 | ✅ **đúng — đừng sửa** |
| `:653` | `puppeteer` 14 `.txt` + 0 `.ts` | 14 / 0 | ✅ đúng |
| `:654` | `84` file ở gốc `tools/` | 84 (và cả 84 đều là `.ts`) | ✅ đúng |
| `:695`, `:795` | `prompts/` = **227** file `.md` | 227 (và 227 tất cả) | ✅ đúng |

Tổng số site cần sửa: **5 dòng**, tất cả đều là biến thể của **một** số đo đã lỗi thời.
Không phải "nhiều thư mục phải đo lại".

## 147 bao lâu rồi mới cũ — và nó có phải quy ước thứ hai không?

```bash
for rev in ecd516f f804d66 HEAD; do
  echo "$rev: ts=$(git ls-tree -r --name-only $rev -- packages/coding-agent/src/tools | grep -c '\.tsx\?$')" \
       "all=$(git ls-tree -r --name-only $rev -- packages/coding-agent/src/tools | wc -l)"
done
# ecd516f: ts=149 all=174     f804d66: ts=149 all=174     HEAD: ts=149 all=174
```

`149` đã đúng ngay từ commit phát hành đầu tiên. Nghĩa là **147 không phải ảnh chụp cũ hơn
của cùng quy ước** — nó là con số đo từ **trước khi `pi` được chép vào `omp`**, mang sang
nguyên văn vào bảng §4.2 mà không được dán nhãn. Đây là **số mồ côi**, không phải **quy ước
thứ hai**. Mục 10 đọc nó thành quy ước thứ hai vì thấy nó lệch — nhưng một số không khớp
không tự sinh ra quy ước.

## Mặc định đã chọn

**Sửa 5 dòng, viết MỘT câu quy ước, không mở đợt đo lại toàn bộ.**

Cụ thể là phương án (b) của mục 10 **thu hẹp lại theo đúng những gì đo được**, cộng thêm câu
quy ước mà lẽ ra phải có sẵn từ đầu:

1. **Sửa 147 → 149** ở `:336`, `:377`, `:449`, `:647`.
2. **Sửa 59.871 → 61.700** ở `:377` và `:449`, và **407 → 414 dòng/file** ở `:449`
   (vì 407 là `59.871/147`, tức nó thừa hưởng lỗi của 147, không phải một số đo riêng).
3. **Sửa 61.718 → 61.700** ở `:102`.
4. **Thêm một câu** ngay trên bảng §1 (trước dòng 98), theo đúng văn phong sẵn có ở `:653`:
   > Số *file* trong mọi bảng của tài liệu này đếm **`.ts`/`.tsx`**. File tài nguyên
   > (`.txt`, `.js`, `.py`) không tính, và luôn được nêu riêng khi có ý nghĩa — xem mục 4.2.

5. **KHÔNG đụng** vào `50`, `7`, `8`, `14`, `84`, `227`.

### Vì sao đây là mặc định an toàn

- **Nó đúng theo cái đo, không theo cái đoán.** Mỗi số sửa đều có lệnh ở trên. 147 không
  khớp 149 lẫn 174, nên nó sai theo bất kỳ quy ước nào.
- **Nó không phá gì đang tồn tại.** Toàn bộ thay đổi nằm trong một file markdown, không đụng
  bề mặt công khai, không đụng cài đặt, không đụng cây code. Một con số trong bảng §4.2
  không ai chạy được.
- **Nó làm nhỏ phạm vi so với cả ba phương án mà mục 10 đưa ra.** Mục 10 nói cần "đo lại
  nhiều thư mục" — nhưng tôi đã đo lại **11 thư mục** ở trên, và 10/11 hàng của bảng §1 vốn
  đã đúng. Công việc đo đã xong; phần còn lại là chép kết quả.
- **Nó đảo ngược bằng một thay đổi nhỏ.** 5 số, đều là số trần trong bảng.
- **Nó không để lại nguyên nhân.** Câu ở bước 4 là toàn bộ phần "ghi quy ước vào file
  trước" mà phương án (a) đòi — chỉ là phần đắt nhất của (a) (một đợt riêng để đo lại mọi
  thứ) đã bị đo thay bằng bảng ở trên.

### Vì sao **không** phải (a), dù mục 10 khuyên (a)

Mục 10 khuyên (a) với lý do "chỉ sửa mâu thuẫn mà không chốt quy ước là sửa triệu chứng".
Lập luận đó đúng, nhưng nó giả định chi phí của (a) là cao — một đợt riêng, phải đo lại
nhiều thư mục. Tôi vừa đo xong phần đắt nhất đó. Sau khi đo, (a) còn lại đúng bằng **một câu**.
Trả tiền cho một đợt riêng để làm việc còn lại sáu dòng là chi phí vô nghĩa khi kết quả
đo đã nằm sẵn trên bảng.

### Vì sao **không** phải (c)

`:695` vừa được sửa thành 227 và đúng. Để `147` cạnh `149` trong cùng một tài liệu thì số
đúng ở một chỗ lại bị số cũ ở chỗ khác che mờ — đúng mệt đề của mục 10.

## Đảo ngược

Không cần `git revert` (mọi thứ đều untracked/markdown). Để quay lại hiện trạng:

1. Bốn số `147` ở `:336`, `:377`, `:449`, `:647` → trả về `147`.
2. `59.871` → trả về; `407` → trả về; `61.718` → trả về; `61.700`/`414` → xoá.
3. Xoá câu quy ước thêm ở bước 4.

Tổng cộng: 5 số + 1 câu. **Không sửa gì ở `:652`–`:654` và `:695`** — nếu thấy con số đó bị
đổi, đó là đợt sửa đã đi ngược quyết định này.

## Phạm vi mình KHÔNG phủ

Trung thực để nói rõ, vì bảng §4.2 còn cột `out-edge` và cột phụ thuộc:

- **`:377` cột `out-edges` = 359, `:647` ghi `359 out-edge`, và các số phụ thuộc
  `prompts(46), utils(41), internal-urls(31), task(25), config(23), sdk.ts(13)`** — đây là
  phân tích đồ thị import tĩnh, **không phải** đếm file. Tôi **không** đo lại chúng, và
  quyết định này **không** đụng tới. Nếu chúng cũng lệch thì đó là một mục riêng.
- **Vế `pi` của mọi so sánh** (`pi/src/core 96 file`, `pi/core/tools 24 file`, bảng dòng
  860…) — repo tham chiếu `pi` **không nằm trong cây này** (`ls -d pi` → không có). Không
  đo lại được, không sửa.
- **`session` lệch 1** (ghi 89, đo `.ts` ra 90) — trùng với mục 6 đã xử lý ở file khác; để
  nguyên, ngoài phạm vi.
- Mọi con số khác trong tài liệu này (bảng dòng 116 trở đi) **không** nằm trong phạm vi.

## Vì sao mục này không chặn ai

Đây là quyết định **kỹ thuật thuần**: một con số đo đúng nằm trong bảng tài liệu. Nó không
đổi hợp đồng với người dùng, không đổi tên thương hiệu, không chọn giữa hai kiến trúc, và
bằng chứng tự nói hết — cây đã trả lời, không cần ý chủ sở hữn. Mục 10 nằm ở nhóm "Mục
5–8 sửa được trong một đợt văn xuôi" và "Mục 9–11 không gấp" — đúng chỗ của nó.

Cổng nghiệm thu không dính: bất biến số file duy nhất là §4.7 `prompts/` = 227, và đo ra
**227 theo cả hai quy ước** (`find prompts -name '*.md' | wc -l` → 227, `-type f` → 227),
nên nó đứng vững bất kể quy ước nào được chọn.

---

*Đo lúc 2026-09-29 trên `e55bbee`. Không sửa file kế hoạch nào; mọi dòng số ở trên trích từ
trạng thái hiện tại của `PACKAGE_REORGANIZATION_PLAN.md`.*
