# Sai lầm đã mắc phải — đọc trước khi viết bất kỳ tài liệu hoặc kế hoạch nào

Ghi lại vì chúng lặp lại, và vì mỗi lần lặp đều tốn công của hai phiên.
Không phải danh sách lỗi cụ thể — mà là **dạng lỗi** và cách phát hiện.

---

## 1. grep xác nhận được "lỗi đã biến mất", không xác nhận được "giá trị đã đúng"

Sai khi tôi gỡ `import { JS_EVAL_PROCESS_ARG }` rồi grep thấy 0 chỗ khớp và kết luận đã xong.
Nhưng mảng `ALL_16` chỉ có **15** phần tử, và chú thích trong file tự mâu thuẫn với tên mảng.
Grep không thấy "dùng mà không khai báo", cũng không thấy "thiếu phần tử".

**Cách phát hiện:** dựng cái cấu trúc đó rồi chạy nó. Ở đây: dựng lại mảng, đếm `length`,
kiểm tra từng phần tử có khớp selector thật trong cây không.

## 2. Đo dưới tải không phải đo

Agent đo `bun run check:ts` ra **3–3,5 phút** vì lúc đó 9 tiến trình khác đang chạy, rồi từ chối
một phát hiện đúng với lý do "con số không khớp". Máy rảnh: **29,0 giây**.

**Cách phát hiện:** đo lại khi máy rảnh, và luôn ghi kèm tải. Một số đo mà không nói điều kiện
đo thì không dùng được.

## 3. Cách đếm sai âm thầm sinh kết luận sai

Ba lần trong cùng một phiên:

- `isToolAllowed` tôi đếm **11** biến tự do, thật là **31** — và con số sai nằm ngay trong lập
  luận biện minh cho việc audit tay 33 tên.
- Quét theme của tôi bỏ mất dấu `$` trong `value in vars` nên ra **0**, trong khi thật là **2
  theme ném lỗi** — suýt bác bỏ đúng một reviewer.
- Bộ đếm bảng của tôi loại nhầm dòng phân cách, ra **78** dòng "rủi ro" thay vì 7.

**Cách phát hiện:** nếu một cách đếm ra kết quả lệch với kỳ vọng, đừng hỏi "con số nào đúng" mà
hỏi **"phép đo này có đo thứ tôi nghĩ không"**. So hai phép khác nhau rồi so sự khác biệt.

## 4. Sửa nửa vời: di chuyển chỗ chết, không xoá nó

Lần đầu tôi gỡ dòng import của một hằng không export. Test chết ở `SyntaxError`.
Sau khi gỡ, test vẫn chết — ở `ReferenceError` vì tôi để nguyên tên biến trong mảng.

**Cách phát hiện:** sau khi sửa một lỗi "lỗi ở dòng N", **chạy lại** để xác nhận lỗi ở dòng M
không còn. Sửa xong mà không chạy lại thì chỉ bằng một nửa.

## 5. Cổng chết tệ hơn là không có cổng

Ba cổng trong kế hoạch M5 chết theo ba kiểu khác nhau, và cả ba đều "thành công" về mặt văn bản:

- `git diff --stat` liệt kê "6 file sửa + 1 file **mới**" — nhưng nó không thấy file mới, nên cổng
  **xanh vì không thấy gì**.
- `git grep -E '\bomp\b'` — `git grep` **không hiểu** `\b` là ranh giới từ, nên luôn trả 0 hit, cổng
  **xanh vì không khớp gì**.
- Mảng thiếu một phần tử → `toHaveLength(16)` đỏ.

**Cách phát hiện:** với mọi cổng, hỏi *"lệnh này có phân biệt được 'đã làm' với 'không chạy được'
không?"* Cổng trả về thành công khi **không nhìn thấy gì cả** là cổng không có tác dụng.

## 6. Tài liệu dạy lệnh mà người đọc chạy ra kết quả khác

Kế hoạch M5 ghi `grep --version` → `ugrep 7.8.4`. Đúng trong shell của agent. Nhưng `command grep`
— thứ người đọc thật sự có trong terminal — là **BSD grep 2.6.0**. Người đọc sẽ tưởng đoạn đó bịa.

**Cách phát hiện:** với mọi lệnh trong tài liệu, hỏi *"lệnh này cho ra cùng kết quả ở máy của
người đọc không?"* Shell của agent có thể bọc lệnh; terminal của người đọc thì không.

## 7. Không có git add — mọi thứ untracked là vô hình

Tài liệu yêu cầu `git diff --stat` để chứng minh "đúng ba file", nhưng file mới chưa `git add`
thì `git diff` không thấy, và **đã `git add` rồi thì `git diff` vẫn không thấy** — chỉ `--cached`
hoặc `git diff HEAD` mới thấy. Đo được: untracked → rỗng; đã add → rỗng; `--cached` → có.

**Cách phát hiện:** mọi cổng đếm file mới phải `git add -A && git diff --cached --stat`.

## 8. Tin trạng thái agent trả về, không tin đĩa

Trong phiên này, **5 lần** agent báo "xong" nhưng file trên đĩa hỏng:

- JSON hỏng vì backslash không escape (`\S`, `\.`)
- JSON hỏng vì dấu nháy thô bên trong chuỗi (agent viết `` `"oh-my-pi"` `` thay vì `\"oh-my-pi\"`)
- JSON đúng nhưng thiếu 6 dòng đính chính, và tôi suýt nối thêm 6 dòng trùng
- Section Markdown bị viết dở, chỉ có 15/16 selector

**Công cụ:** `bun .lavish-wip/json-doctor.js <f>` báo lỗi kèm vị trí;
`bun .lavish-wip/json-fix-escapes.js <f>` escape backtick sai;
`bun .lavish-wip/json-fix-quotes.js <f>` escape dấu nháy thô.
Và `count-rows.py` để đếm bảng, in ra rõ nó loại dòng nào.

## 9. Sửa file sinh tự động bằng cách thay chuỗi — thay vì viết lại

`m1-chord.js` tôi hỏng 3 lần: xoá quá tay, rồi dùng chỉ số dòng, rồi dùng chỉ số chuỗi.
Ra ngoài thì lỗi khác: regex `W\d+[a-z]?` không khớp `W13′` (dấu prime) nên tôi tưởng thiếu 6
đính chính và tạo 6 dòng trùng.

**Cách phát hiện:** file nhỏ thì viết lại từ đầu ngay từ lần hỏng đầu tiên, đừng sửa chuỗi.
Regex có ký tự đặc biệt (dấu nháy kép, prime, backtick) thì kiểm thử trên dữ liệu thật trước.

## 10. Ba cái bẫy khi đếm bằng `git ls-files` + `xargs wc`

Cả ba nằm trong cùng một pipeline, và cả ba đều cho ra số đẹp mà sai:

- **`xargs` tự chia nhỏ khi đường dẫn dài.** `... | xargs -0 wc -l | tail -1` chỉ cho tổng của *lô
  cuối*, không phải tổng chung. Sửa: `awk '$NF!="total"{s+=$1} END{print s}'` — loại dòng `total`
  của từng lô.
- **`git -C <repo> ls-files` in đường dẫn tương đối với repo đó**, nhưng `xargs wc` chạy ở thư mục
  hiện tại của bạn. Không `cd` vào repo trước thì mọi file đều "không tồn tại" và tổng ra 0 (codex
  ra đúng 0 dòng cho 758 file). Sửa: `cd <repo>` rồi mới đo.
- **Nhiều pathspec của `git ls-files` là hợp nhất (union), không giao.** `git ls-files '<dir>/'
  '*.ts'` ra **toàn bộ** file `.ts` của repo, không phải file trong `<dir>/` — nên đếm kiểu này
  cho mọi builtin của senpi đều ra đúng 1.092.375 dòng, là tổng cả repo.

**Cách phát hiện:** mỗi phép đo in kèm `số_file`, rồi kiểm tra `số_dòng_trung_bình` có hợp lý
không (2,5 dòng/file và 1 triệu dòng/40 builtin đều là tín hiệu vô lý). Và mọi lệnh đếm phải ghi
đủ để **người đọc chạy lại được ở thư mục khác** — nêu rõ `cd` ở đâu.

## 11. Dùng h1 để cắt tài liệu mà không bỏ qua code fence

Lần gộp M3 đầu tiên cắt nhầm 187 dòng: bộ dò `^#\s` khớp một dòng **comment bash** (`# G5 — …`)
bên trong fenced block. Tài liệu mất 187 dòng cũ trùng lặp, và mọi fence phía sau lệch một cặp.

**Cách phát hiện:** khi quét cấu trúc Markdown, **luôn bỏ qua nội dung trong fence**. Đếm fence
bằng `sum(1 for l in lines if l.startswith("```"))` — **không** dùng `text.count("```")`, vì cái
sau đếm cả backtick inline và báo fence lẻ giả.

## 12. Một file đang được ghi KHÔNG phải là một file đã xong và hỏng

Tôi kết luận agent tổng hợp "đã chết ở §3" vì:
1. đọc file thấy 406 byte, một câu `_(đang viết)_`
2. vài phút sau chụp lại thấy 31 KB, dừng yên 55 giây
3. kết luận chết — và **ghi claim đó vào tài liệu rồi commit**

Sự thật: agent không chết. Nó viết tiếp và hoàn tất đủ 9 mục, 76 KB. Tôi bắt được nó đúng
giữa lúc nó đang viết §4, rồi đọc sự tĩnh lặng đó là "đã chết".

**Cách phát hiện:** phải chờ **cả hai** — workflow báo `result`, **và** file đổi. Chỉ một trong
hai thì chưa đủ. Và "file đang lớn lên" với "file đứng yên 55 giây" là hai tín hiệu khác hẳn nhau;
tôi đã quy chúng thành một.

Bài này tốn **hai commit**: một commit ghi sai, một commit sửa lại. Rẻ hơn nhiều nếu chờ thêm
một phút.

**Tổng quát hơn:** "agent đã chết" là một kết luận, không phải quan sát. Phải có bằng chứng
(`failed` trong journal, workflow kết thúc với lỗi, hoặc file cuối cùng bị cắt giữa chừng với
câu báo lỗi) — không phải im lặng.

## 13. `git grep` không lọc theo đuôi file trừ khi bạn nói `*.ts`

Bẫy thứ ba trong cùng họ "công cụ sai trả về 0 rồi đọc thành phát hiện" (hai cái trước: `\b`
và pathspec `ls-files`).

Tôi đi kiểm chứng claim "`executeTool` không builtin nào dùng", chạy:

```
git grep -c executeTool -- '.../builtin/*'    # → 2 file
```

Hai file đó là **`changes.md`** — sổ ghi chép của fork, chỉ *nhắc* tên trong văn xuôi. Lần kiểm
lại với đuôi tường minh:

```
git grep -c executeTool -- '.../builtin/*.ts'   # → 0 file
```

**Suy ra nhận ra:** vì `-- 'dir/*'` là pathspec glob, nó khớp **mọi thứ** dưới thư mục, kể cả
`.md` sinh tự động. Claim ban đầu **đúng**; lệnh kiểm của tôi sai. Đã suýt ghi một đính chính
sai vào tài liệu.

**Cách phát hiện:** khi đếm "file nào dùng symbol X", **luôn chỉ định đuôi** (`*.ts`), và khi
con số khác 0, **in ra tên file trước khi tin** — tên file cho biết ngay là bạn đang đếm code
hay đang đếm thư mục con.

Nói chung: kết quả khác 0 ở một phép đo mà bạn KỲ VỌNG 0 cũng nguy hiểm không kém kết quả 0.
Hai chiều đều cần mở file xem.
