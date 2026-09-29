# Quyết định — Tên package cắt từ `blob-broker` (mục 9)

**Nguồn:** `.lavish-wip/applied/NEEDS-OWNER-DECISION.md` §9
**Ngày:** 2026-09-29 · **Trạng thái:** ĐÃ CÓ MẶC ĐỊNH — không chặn
**Không sửa file kế hoạch nào.** File này chỉ ghi lại quyết định + cách dán.

---

## MẶC ĐỊNH: **`@oh-my-pi/pi-blob`**

Cắt `blob-broker` ra package tên `@oh-my-pi/pi-blob`. Bỏ hẳn lý do "khớp `pi/durable`".
Tên này **viết được ngay** — không cần ai đặt thêm tên nữa.

## Ba câu hỏi con, trả lời luôn

| Câu hỏi | Đáp án | Cơ sở |
| --- | --- | --- |
| Có **tạo** package mang tên `pi-durable` không? | **Không** | `pi/durable` đã bị phán quyết là package chết và loại khỏi phạm vi chép. Mượn tên nó là mượn nhãn của một thứ không ai dùng. |
| **Cắt `blob-broker`** có còn đúng là cắt đầu tiên? | **Có, giữ nguyên vị trí Giai đoạn 3** | Số đo của nó tự đứng vững, không cần `pi` để biện minh: 27 file, 8.917 dòng, 6 nơi import sản phẩm. Đây là seam rẻ nhất trong toàn bộ bảng. |
| Có cần **giữ chỗ đặt tên trống** cho chủ? | **Không** | Tên đo được từ từ vựng mã đã dùng. Để trống chính là giữ nguyên cái vướng. |

---

## Vì sao `pi-blob`, không phải `pi-storage`

Nguồn gợi ý `@oh-my-pi/pi-storage`. Đo lại thì `storage` là tên sai — nó gọi tên một tầng
kiến trúc mà đoạn code này **không có**:

```
grep -c "Storage" packages/coding-agent/src/blob-broker/*.ts   # tổng: 0
```

Còn đây là những gì nó **làm**, đọc từ chính docstring của nó:

- `broker.ts:1` — *"Blob URL backends: give outgoing images an externally fetchable URL."*
- `service.ts:1` — *"Session-facing image URL service."*
- `publication.ts:16` — *"The durable result of publishing a blob to a destination."*

Tức là nó **không lưu trữ**. Nó **mints URL**. Từ vựng đo được trong 27 file:

```
BlobDestinationId 59 · BlobUploader 52 · BlobPublication 36 · BlobUploadRequest 27
BlobBackend 14 · BlobRegistryEntry 8 · Upload 16 · ExposureKind 6
```

Mọi tên đều bắt đầu bằng `Blob`. Package tên `pi-blob` khớp **từ vựng mà code đã dùng**;
`pi-storage` sẽ phải giải thích mới hiểu, và giải thích sai một lần là hỏng.

**Tên không trùng gì:** `git ls-files | grep -i durable` → **0 dòng**. Package `pi-durable`
**không tồn tại** trong repo. Nó chỉ là một chữ trong file kế hoạch. Nên đổi tên ở đây
**không phá cài đặt nào** — không có gì để phá.

## Vì sao không phải (b) giữ `pi-durable` + chú thích

Vì cái tên là thứ đọc **trước** chú thích. `pi-durable` gợi "session bền vững, transaction,
lưu trữ" — người đọc sẽ tìm session store. Không có cái đó ở đây. Chú thích đúng đặt sau
tên sai vẫn là tên sai; chỉ thêm một thứ phải đọc.

## Vì sao không phải (c) giữ tên, chỉ bỏ lý do

(c) giữ `pi-durable` mà xóa lý do → tên sai, không lý do. Tệ hơn (a). Cắt (a) hoàn toàn
đúng: đổi 4 chữ trong file .md, không đụng code.

---

## Sửa số đo trong kế hoạch (kèm theo, cùng một lần dán)

Kế hoạch ghi `8.944 dòng` và `18 importer`. Đo lại:

| Kế hoạch ghi | Đo được | Sai ở đâu |
| --- | --- | --- |
| 8.944 dòng | **8.917** | Không file nào thiếu newline cuối (đo: 0/27) → không phải lỗi đếm newline. Là con số cũ, code đã đổi. |
| 18 importer | **6 sản phẩm** (+13 test = 19 file) | 18 là **số file**, không phải số nơi import. Tách ra thì 6 prod / 13 test. |

Số **27 file** thì đúng. `18` đúng nếu hiểu là "18 file" — nhưng cột ghi "18 importer" và
Giai đoạn 3 lại dùng nó như số nơi import, nên nên ghi rõ.

## Bốn chỗ cần dán (dòng đã đo lại, hôm nay)

```
$ grep -n "pi-durable" PACKAGE_REORGANIZATION_PLAN.md
434:  | `pi-durable` | 29 | 9.024 | chord, ai |          ← hàng so sánh với pi
446:  ... (`pi-protocol`, `pi-client`, `pi-server`, `pi-durable`) ...  ← danh sách
1161: | `blob-broker` (27f / 8.944d) | `@oh-my-pi/pi-durable` | ...  ← bảng cắt
1205: Giai đoạn 3  Cắt `blob-broker` → package `pi-durable`. ...     ← kế hoạch
```

⚠️ **Hai chỗ đầu (434, 446) không nói "cắt ra" — chúng nói về `pi/durable` của repo `pi`.**
Đừng đổi tên ở đó. Chỉ đổi **1161** và **1205**.

**Câu thay ở dòng 1161:**

> `blob-broker` (27f / 8.917d) | `@oh-my-pi/pi-blob` | Không mượn tên `pi/durable`: package đó
> đã bị loại khỏi phạm vi chép (xem `DECISIONS.md` §durable). Tên lấy từ từ vựng mã đã dùng —
> 59 `BlobDestinationId`, 52 `BlobUploader`, 36 `BlobPublication`; đây là tầng **mints URL
> để publish**, không phải storage (0 identifier `Storage` trong 27 file) | 6 importer sản
> phẩm + 13 test, 3 vòng → 2 lần `bun check`

**Câu thay ở dòng 1205–1206:**

> Giai đoạn 3  Cắt `blob-broker` → package `pi-blob`. Đây là cắt package ĐẦU TIÊN và có
> thể là duy nhất. Lý do: fan-in thấp (6 nơi import sản phẩm) nên seam rẻ nhất; cắt này
> **không phụ thuộc** vào repo `pi`.

---

## Bằng chứng — lệnh đã chạy

```bash
# 1. Tên "pi-durable" chỉ tồn tại trong file kế hoạch, không có ở đâu khác
grep -c "pi-durable" bun.lock                                   # → 0
grep -rn "pi-durable" --include=package.json packages/ package.json   # → (rỗng)
ls node_modules/@oh-my-pi/ | grep durable                        # → (rỗng)
git ls-files | grep -i durable                                   # → 0

# 2. Phán quyết durable là thật, đo lại ở repo pi
cd ~/Projects/pi-ref
git ls-files 'packages/durable/*' | wc -l                       # → 63
git ls-files 'packages/durable/*' | xargs wc -l | tail -1       # → 21093
git grep -n "pi-durable" -- '*.json' '*.ts' '*.md' | grep -v '^packages/durable/'
#   → README.md:33 · package-lock.json:738,5778
#     · scripts/durable-browser-smoke-entry.ts:1-4 · tsconfig.json:19-21   (0 mã sản phẩm)
git show HEAD:packages/agent/package.json | grep -c durable      # → 0

# 3. Số đo blob-broker hôm nay
find packages/coding-agent/src/blob-broker -type f | wc -l      # → 27
find ... -name '*.ts' -exec cat {} + | wc -l                    # → 8917   (kế hoạch ghi 8944)
grep -rln "blob-broker" --include='*.ts' packages/ \
  | grep -v 'src/blob-broker/' | grep -v '/test/' | wc -l        # → 6 prod
#   (13 file test nữa; "18" trong kế hoạch là số file cũ, không phải số nơi import)

# 4. "storage" là tên sai — code không có tầng đó
grep -c "Storage" packages/coding-agent/src/blob-broker/*.ts | grep -v ':0'   # → (rỗng)
grep -ohE "\bBlob[A-Za-z]*" .../blob-broker/*.ts | sort | uniq -c | sort -rn | head
#   → BlobDestinationId 59 · BlobUploader 52 · BlobPublication 36 · BlobUploadRequest 27 · BlobBackend 14

# 5. Không trùng tên, và chưa có package nào publish
ls packages/coding-agent/src/blob-broker/index.ts 2>/dev/null || echo "NO barrel"
#   → NO barrel: cắt ra phải tạo index.ts + exports + workspace entry (đã tính trong chi phí)
for n in pi-blob pi-storage; do grep -rl "@oh-my-pi/$n" --include='*.ts' --include='*.json' packages/ | wc -l; done
#   → 0 / 0
cd ~/Projects/pi-ref && ls packages/ | grep -iE 'blob|storage'   # → (rỗng): pi không có package nào tên blob/storage
```

## Cách đảo ngược

Một lần sửa .md, không đụng code — vì package **chưa tồn tại**:

```bash
# trả tên cũ ở đúng 2 chỗ (1161, 1205), giữ nguyên 434/446 vì chúng nói về pi/durable
sed -i '' '1161s/@oh-my-pi\/pi-blob/@oh-my-pi\/pi-durable/' PACKAGE_REORGANIZATION_PLAN.md
sed -i '' '1205s/pi-blob/pi-durable/' PACKAGE_REORGANIZATION_PLAN.md
```

Nếu đã cắt package thật rồi mới muốn đổi: `git mv packages/blob packages/pi-durable`,
sửa `name` trong `package.json`, `tsconfig.json` paths, và `grep -rl '@oh-my-pi/pi-blob'`.
Vẫn là một commit, vẫn chưa ai import vì nó mới.

## Rủi ro còn lại

Nhỏ nhưng nói thẳng: `pi-blob` là tên **mới**, không ai đã quen. Nếu sau này `blob-broker` nuốt
việc khác (ví dụ session blob store) thì tên có thể phải nới ra. Đo hiện tại: `store.ts`
import `../session/blob-store` — tức **session blob store đang nằm NGOÀI** đoạn cắt. Nếu sau
này gộp nó vào, tên `pi-blob` vẫn đúng (rộng hơn), không bị sai. Đây là lý do `pi-blob` an
hơn `pi-storage`: nó không cần thu hẹp lại.

---

## Vì sao đây KHÔNG cần người

Không đổi hợp đồng với người dùng (package chưa tồn tại, chưa ai import, chưa publish) ·
không đổi tên thương hiệu (`pi-durable` chưa bao giờ là tên của repo này) · không phải chọn
giữa hai kiến trúc lớn (phần cắt đã chốt từ trước, câu hỏi chỉ là **tên**) · tên suy ra từ
từ vựng mã đã có, không phải ý thích. Đây là quyết định kỹ thuật mà cây tự trả lời được.

**Nếu chủ vẫn muốn đặt tay vào:** đây là 4 chữ trong file .md. Ghi đè dòng 1161/1205 ở trên,
xong. Nhưng đừng để nó chặn — mặc định đã có, ai cũng gõ được ngay.
