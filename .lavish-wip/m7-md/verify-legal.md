# Bác bỏ `w-legal.md` — kiểm chứng từng neo trên cây thật

**Cây đo:** omp `/Users/tranquangdang21/Projects/ultraworkers` @ `milestone-1` · senpi
`/Users/tranquangdang21/Projects/senpi-ref` @ `ea921626`
**Ngày đo:** 2026-09-28 · **12 lệnh shell / hạn mức 45**.

## Kết luận một dòng

**Kết luận trung tâm của W0 — "KHÔNG tạo `NOTICE.md` ở root, dùng `NOTICE` cạnh code + nhân
bản vào `THIRD-PARTY-NOTICES.txt`" — ĐỨNG VỮNG.** Mọi phép đo ở B3 đều khớp, và tôi đã tìm
thấy khuôn `crates/pi-shell/NOTICE` đúng như mô tả. Nhưng có **một lỗi làm hỏng chính luận
điểm B3-(iv)**, một lỗi phép đo không tái lập được, một định nghĩa test còn thiếu, và sáu sai
lệch dòng 1 đơn vị.

**Cái đáng sửa nhất:** W0 nói `stageLegalPayloads` "**chép đúng hai file đó vào mọi package
publishable**". Câu đó **sai**, và sai theo hướng làm hỏng bảo đảm mà W0 tự đặt ra. Chi tiết ở
[E1](#e1-cổng-gốc-của-b3-iv-sai).

---

## A. Các phát hiện nặng (sửa trước khi làm bước 3)

### E1. Cổng gốc của B3-(iv) SAI — attribution sẽ không ship tới 2 package

Tài liệu (dòng 106) viết: *"`stageLegalPayloads()` (`:111`) **chép đúng hai file đó vào mọi
package publishable**"* — và toàn bộ luận điểm B3-(iv) ("đây là lý do quyết định") đứng trên
đó. Đọc thật `scripts/ci-release-publish.ts:118-126`:

```
118|	for (const file of files) {
119|		const destination = path.join(pkgDir, file);
120|		if (await Bun.file(destination).exists()) continue;   ← file cục bộ THẮNG
121|		const source = path.join(sourceRoot, file);
```

Dòng `:120` **bỏ qua** file gốc nếu package đã có file riêng. Và trong cây hiện tại:

| file | `diff -q` với root | ý nghĩa |
| --- | --- | --- |
| `packages/natives/THIRD-PARTY-NOTICES.txt` | **IDENTICAL** | natives có bản riêng, sẽ **được giữ**, root không tới |
| `packages/coding-agent/src/tools/browser/relay/extension-assets/THIRD-PARTY-NOTICES.txt` | **IDENTICAL** | bản nhúng cho extension + lệnh `omp license` |

Hai bản này **không nằm trong bảng "File cần chạm tới"** của W0. Hệ quả: sửa aggregate gốc →
T1 xanh (vì T1 chạy `stageLegalPayloads` với `root=repoRoot` và một `pkgDir` sạch) → nhưng
người dùng `packages/natives` và người dùng extension browser vẫn **không thấy** attribution
của senpi. **Cổng xanh, nghĩa vụ không ship.** Đây chính là loại cổng chết mà W0 tự cảnh báo ở
bước 7, chỉ là theo chiều khác.

**Sửa:** bảng "File cần chạm tới" phải thêm 2 dòng, hoặc T1 phải lặp trên `pkgDir` có sẵn file
để chứng minh hành vi `continue`.

### E2. "Không có generator nào" — đúng cho bản gốc, SAI cho hai bản sao

Tài liệu (dòng 121-123) khẳng định: *"**không có generator nào trong repo** — `scripts/` không
có script nào sinh ra nó"*, rồi suy ra *"**không có gì tự bắt lệch**"*.

- Với **bản gốc**: khẳng định đúng. `grep -rln "THIRD-PARTY-NOTICES" --include=*.ts --include=*.js
  --include=*.json --include=*.sh --include=*.nix --include=*.yml` (loại `node_modules`) chỉ ra
  `scripts/ci-release-publish.ts`, `scripts/ci-release-publish.test.ts`, `nix/package.nix`,
  `.github/workflows/ci.yml` — toàn là **consumer**. `package.json` không có npm script nào
  nhắc `notice`. **Đứng vững.**
- Với **hai bản sao**: sai. `packages/browser-relay/scripts/build-extension.ts:40-42` chép từ
  `repoRoot` vào `distExtension`, rồi `:57` nhúng vào `assetsDir`; `packages/natives/scripts/gen-npm-packages.ts:61`
  khai `NATIVE_LEAF_LEGAL_FILES = ["LICENSE", "THIRD-PARTY-NOTICES.txt"]`.

Nói cách khác: **"không có gì tự bắt lệch" chỉ đúng cho aggregate gốc.** Hai bản sao được
build script sinh lại — nên E1 không phải "quên", mà là **W0 chưa biết có ba bản**.

### E3. T3 không có định nghĩa "đường dẫn" — test sẽ đỏ vĩnh viễn hoặc bị hardcode

Bước 6 / hợp đồng T3 nói: *"Đọc các đường dẫn trong mục `TRACKED VENDORED CODE AND ASSET
NOTICES`"*, và bảng File liệt *"Danh sách path đọc được ở `:22,59,250,289,320,339,375` — 7 mục"*.

Đo lại: mục TRACKED (từ `:18`) có **651 khối** ngăn cách bằng `-----`, **không phải 7**. Bảy
dòng trong tài liệu đúng, nhưng chúng **không phải toàn bộ** những gì một parser "dòng ngay sau
`-----`" sẽ nhặt. Ví dụ những dòng đó là **văn xuôi**, không phải path:

| dòng sau `-----` | nội dung | có tồn tại? |
| --- | --- | --- |
| `:81` | `Covers: base32, base64, basename, cat, cksum (shared checksum machinery),` | không |
| `:109` | `Covers: find, xargs.` | không |
| `:134` | `Covers: sed.` | không |
| `:161` | `Covers: jq (the command-line front end; the interpreter itself remains an` | không |
| `:191` | `Covers: the incremental UTF-8 decoder inside `src/wc.rs`.` | không |

Parser "lấy dòng sau `-----`" ⇒ ~651 ứng viên, đa số không tồn tại ⇒ **T3 đỏ vĩnh viễn**. Hoặc
người thực hiện hardcode đúng 7 dòng — tức **source-grep**, đúng cái AGENTS.md cấm.

**Sửa bắt buộc trước khi viết test:** định nghĩa quy tắc nhận diện path (vd: khớp
`^(crates|packages|scripts)/` **và** có phần mở rộng tệp), rồi khẳng định con số ứng viên ≥ 7
trong phần chống hụt hụt (T4).

### E4. Hai khẳng định đo sai — không tái lập được

Tài liệu dòng 61: *"`CONTRIBUTING.md` | 162 | **Một** dòng khớp `licen`, và nó không liên
quan: `CONTRIBUTING.md:143` …"*.
Tài liệu dòng 62: *"`SECURITY.md` | 87 | **Không có** dòng khớp
`licen`/`attribut`/`notice`/`third-party`/`disclos`"*.

Chạy **đúng** lệnh tác giả ghi:

| lệnh | kết quả thật | tài liệu nói |
| --- | --- | --- |
| `grep -niE "licen" senpi-ref/CONTRIBUTING.md` | **0 dòng** (exit 1) | "một dòng khớp, ở :143" |
| `grep -niE "licen\|attribut\|notice\|third-party\|disclos" senpi-ref/SECURITY.md` | **2 dòng** — `:40` (`disclosure`), `:57` (`third-party`) | "không có dòng nào" |

Dòng `:143` thật là *"Follow Anthropic's **legal** terms"* — chữ `legal` **không** chứa `licen`.
Nội dung kết luận vẫn đúng (không CLA, không DCO; `:40`/`:57` của SECURITY.md chỉ là chính
sách CVE, vô hại), **nhưng hai phép đo đều không tái lập được**. Theo đúng tiêu chuẩn bạn đặt
ra — một neo sai làm cho cả bước triển khai vô dụng — hai dòng này phải sửa trước khi ai đó
chạy lại và tưởng mình đo sai cây.

### E5. Vị trí đặt test mới — lập luận sai sự thật

Tài liệu dòng 271-273: *"**Không** đặt test này trong `packages/natives/` hay `crates/` — nó
thuộc `packages/coding-agent/test/` vì `stageLegalPayloads` là script root và **đó là nơi test
script root đang nằy**."*

`ls scripts/*.test.ts` ⇒ **13 file test của script root nằm ở `scripts/`**, gồm
`ci-release-publish.test.ts`, `ci-release-checksums.test.ts`, `ci-test-ts.test.ts`,
`release.test.ts`. Test của script root **không** nằm ở `packages/coding-agent/test/`.

T3 không phải test của script root ( nó kiểm một file dữ liệu ở root), nên đặt ở
`packages/coding-agent/test/` **vẫn hợp lý** — nhưng lý do nêu trong tài liệu là sai, và một
lý do sai thì sẽ bị lặp lại sai tiếp.

---

## B. Bảng khẳng định / lệnh kiểm / kết quả

### B1 — senpi có phải MIT thuần không?

| # | khẳng định | lệnh kiểm | kết quả | verdict |
| --- | --- | --- | --- | --- |
| 1 | `senpi-ref/LICENSE` dài **22** dòng | `wc -l senpi-ref/LICENSE` | `22` | **đứng vững** |
| 2 | `LICENSE:3` = Mario Zechner, `LICENSE:4` = Yeongyu Kim | `sed -n '1,6p'` | `:3` `Copyright (c) 2025 Mario Zechner (upstream pi-mono)`; `:4` `Copyright (c) 2026 Yeongyu Kim and senpi contributors` | **đứng vững** (`:3` có đuôi `(upstream pi-mono)` tài liệu không nói) |
| 3 | `LICENSE:7`–`:22` là văn bản MIT chuẩn | `sed -n '1,22p'` | văn bản MIT bắt đầu ở **`:6`** (`Permission is hereby granted`); `:5` trống | **sai** — lệch 1 dòng |
| 4 | MIT đòi giữ notice tại `LICENSE:14-15` | đếm dòng | câu đó nằm ở **`:13-14`** | **sai** — lệch 1 dòng |
| 5 | dòng phải giữ là `Copyright (c) 2026 Yeongyu Kim and senpi contributors` (`:4`) | `sed -n '4p'` | khớp chính xác | **đứng vững** |
| 6 | ba nghĩa vụ = giữ copyright · ghi attribution · không lấy thương hiệu | đọc `LICENSE` | MIT chuẩn, không ràng buộc bổ sung | **đứng vững** |
| 7 | nghĩa vụ 3 **tự thêm**, nguồn `CONTRIBUTING.md:139-147` | `sed -n '137,149p'` | `:139` `## Trademark and Brand References`; `:141` *"Do not make senpi look endorsed by another project or vendor."* | **đứng vững** (câu cụ thể ở **`:141`**, trong khoảng đã nêu) |

### B2 — ràng buộc ẩn

| # | khẳng định | lệnh kiểm | kết quả | verdict |
| --- | --- | --- | --- | --- |
| 8 | `NOTICE.md` 67 dòng | `wc -l` | `67` | **đứng vững** |
| 9 | 4 khoản, tất cả permissive; LinkeDOM 0.18.12 **ISC** | `sed -n '1,10p'` + `grep -niE licen` | `:3` `## LinkeDOM`, `:5` version 0.18.12, `:8` `ISC License`, `:10` `Copyright (c) 2021, Andrea Giammarchi`; 6 hit `licen`: `:8` ISC, `:29`/`:32` Gajae-Code MIT, `:43`/`:48` TTSR, `:59`/`:64` todo | **đứng vững** |
| 10 | `CONTRIBUTING.md` 162 dòng | `wc -l` | `162` | **đứng vững** |
| 11 | "**Một** dòng khớp `licen`, ở `:143`" | `grep -niE "licen"` | **0 dòng**, exit 1 | **sai** — xem E4 |
| 12 | `SECURITY.md` 87 dòng | `wc -l` | `87` | **đứng vững** |
| 13 | "**Không có** dòng khớp `licen\|attribut\|notice\|third-party\|disclos`" | `grep -niE "…"` | **2 dòng**: `:40` disclosure, `:57` third-party | **sai** — xem E4 |
| 14 | không CLA, không DCO trong 3 file | `grep -niE "licen\|cla\|dco"` trên 3 file | không có mục CLA/DCO nào | **đứng vững** |

### B3 — ĐÍNH CHÍNH: cơ chế attribution

| # | khẳng định | lệnh kiểm | kết quả | verdict |
| --- | --- | --- | --- | --- |
| 15 | `ls $OMP/NOTICE.md` không tồn tại | `ls NOTICE.md` | `No such file or directory` | **đứng vững** |
| 16 | 7 file pháp lý cạnh code tồn tại | vòng lặp `if [ -e … ]` | **7/7 EXISTS** (33/186/35/27/15/32/50 dòng) | **đứng vững** |
| 17 | aggregate dài **22.901** dòng | `wc -l` | `22901` | **đứng vững** |
| 18 | mục `TRACKED…` bắt đầu `:18` | `awk NR==18` | `:18 TRACKED VENDORED CODE AND ASSET NOTICES` | **đứng vững** |
| 19 | mục mẫu `:249-250`, SHA ở `:260` | `awk 'NR>=247&&NR<=262'` | `:249` kẻ, `:250` `crates/pi-shell/NOTICE`, `:260` `878af7de99e0ba71da2e8fd996f6b52a1836e06c` | **đứng vững** |
| 20 | nội dung `markit/NOTICE` và `pi-shell/NOTICE` **thật sự** nằm trong aggregate | `git grep markit-ai` + đối chiếu `:251-280` với file | `THIRD-PARTY-NOTICES.txt:342` có `markit-ai (https://github.com/Michaelliv/markit)`; khối `:251-280` khớp từng dòng với `crates/pi-shell/NOTICE` (chỉ khác chỗ xuống dòng) | **đứng vững** |
| 21 | 7 path ở `:22,59,250,289,320,339,375`, tất cả là file thật | `awk` từng dòng | khớp **7/7**, cả 7 đều trong bảng B3-(i) | **đứng vững** (nhưng xem E3) |
| 22 | `THIRD-PARTY-NOTICES.txt:3` tự mô tả *"This generated… aggregate"* | `sed -n '1,6p' \| cat -n` | ở **`:4`**; `:3` là dòng trống | **sai** — lệch 1 dòng |
| 23 | ranh giới first-party/third-party ở `:4-5` | `sed -n '1,6p'` | ở **`:5-6`** | **sai** — lệch 1 dòng |
| 24 | `ci-release-publish.ts:93-94` hằng, `:97` hàm, `:100` payload MIT, `:111` hàm stage | `awk 'NR>=88&&NR<=128'` | khớp **4/4** | **đứng vững** |
| 25 | "**chép đúng hai file đó vào mọi package publishable**" | đọc `:118-126` | `:120` `if (…exists()) continue;` — **không ghi đè**; 2 package đã có bản riêng (identical) | **sai** — xem [E1](#e1-cổng-gốc-của-b3-iv-sai-attribution-sẽ-không-ship-tới-2-package) |
| 26 | "**không có generator nào trong repo**" (bản gốc) | `grep -rln THIRD-PARTY-NOTICES` toàn repo, loại `node_modules` | chỉ consumer; `package.json` không script `notice` | **đứng vững** (cho bản gốc) |
| 27 | hệ quả "**không có gì tự bắt lệch**" | `build-extension.ts:40-42,57` · `gen-npm-packages.ts:61` | có generator cho 2 bản sao | **sai** — xem [E2](#e2-không-có-generator-nào--đúng-cho-bản-gốc-sai-cho-hai-bản-sao) |
| 28 | `ci.yml:1178` = artifact GitHub Release | `awk 'NR>=1172&&NR<=1190'` | `:1178` nằm trong step **"Generate checksums"** (`:1172`); step "Create GitHub Release" bắt đầu `:1179`, list ở `:1184-1189` với TPN ở **`:1188`** | **sai** — `:1188` đúng, `:1178` gắn sai nhãn |
| 29 | `SHA256SUMS.txt` ở `ci.yml:1174-1177` | `awk` | lệnh chạy `:1174-1178`; hai file pháp lý ở **`:1177-1178`** | **sai** — lệch 1 dòng |
| 30 | `Dockerfile:167` → `/usr/share/doc/omp/` | `awk NR==167` | `COPY LICENSE  THIRD-PARTY-NOTICES.txt /usr/share/doc/omp/` | **đứng vững** |
| 31 | `nix/package.nix:210` → `$out/share/doc/omp/` | `awk NR==210` | `install -Dm644 THIRD-PARTY-NOTICES.txt "$out/share/doc/omp/…"` | **đứng vững** |
| 32 | `README.md:686` trỏ người đọc | `awk NR==686` | ``See `THIRD-PARTY-NOTICES.txt` and`` | **đứng vững** |
| 33 | `git ls-files \| grep -i notice` → **10 hit** | chạy lại | **21 hit**; trong đó có 2 aggregate con | **sai** — xem E1/E2 |
| 34 | không có entry `NOTICE.md` ở root | `git ls-files` | đúng cho `NOTICE.md`; nhưng `THIRD-PARTY-NOTICES.txt` **có** ở root | **đứng vững** (hiểu hẹp) |
| 35 | `packages/coding-agent/test/notices-tracked-files-exist.test.ts` chưa tồn tại | `ls` | `No such file or directory` | **đứng vững** |
| 36 | thư mục `packages/coding-agent/test/` tồn tại | `ls \| wc -l` | `843` file | **đứng vững** |

### B4 — attribution ngược (`ttsr`, `todotools`)

| # | khẳng định | lệnh kiểm | kết quả | verdict |
| --- | --- | --- | --- | --- |
| 37 | `NOTICE.md:37-51` và `:53-67` nói *"ported and adapted from oh-my-pi's"* + liệt kê 7 file omp | `awk NR>=43&&NR<=67` | `:37` `## TTSR stream-rule extension`, `:40-41` *"ported and adapted from oh-my-pi's"*; `:53` `## Todo tool`, `:56-57` tương tự; **4 + 3 = 7 path** | **đứng vững** |
| 38 | `NOTICE.md:45` trỏ `https://github.com/can1357/oh-my-pi` | `awk NR==45` | ``[`oh-my-pi`](https://github.com/can1357/oh-my-pi)`` | **đứng vững** |
| 39 | 7/7 file omp tồn tại (kiểm bằng `git ls-files`) | `git ls-files --error-unmatch` từng path | **7/7 TRACKED-EXISTS** | **đứng vững** |
| 40 | `LICENSE:3-5` của omp có 3 dòng copyright | `cat -n LICENSE \| sed -n '1,5p'` | `:3` Mario Zechner · `:4` Can Bölük · `:5` Stencil Labs | **đứng vững** |
| 41 | `senpi-ref/NOTICE.md:48-50` và `:64-66` credit 3 bên | `awk` | `:48`/`:64` = `MIT License`; dòng copyright là **`:49-50`** và **`:65-66`** | **sai** — lệch 1 dòng (nhẹ) |
| 42 | kết luận "omp KHÔNG nợ gì; giữ dòng `ported from oh-my-pi` sẽ SAI SỰ THẬT" | lập luận 3 bước | bước 1 và 2 đo được; bước 3 suy ra | **đứng vững** (diễn giải pháp lý, không phải đo) |
| 43 | cảnh báo vòng attribution (omp → senpi → omp cần **hai** dòng) | — | hợp lý; `:45` xác nhận tầng gốc là oh-my-pi | **chưa bác bỏ được** |
| 44 | `LICENSE:1-22` của omp | `wc -l LICENSE` | **23 dòng** | **sai** — lệch 1 dòng |

### Bước 2 — ghim SHA

| # | khẳng định | lệnh kiểm | kết quả | verdict |
| --- | --- | --- | --- | --- |
| 45 | SHA `ea9216269e9254b821446130b60d1e00759761dc` | `git -C senpi-ref rev-parse HEAD` | khớp **chính xác** | **đứng vững** |
| 46 | `git log -1 --format='%ci %s'` cho `2026-09-28 14:12:31 +0900 Merge pull request #2273 from code-yeongyu/fix/2262-live-output-tail` | chạy lại | khớp **từng ký tự** | **đứng vững** |
| 47 | `senpi-ref/README.md:9` tự mô tả *"an in-flight fork… don't bet a production pipeline"* | `sed -n '7,11p'` | `:9` `> ⚠️ **Experimental.** senpi is an opinionated, in-flight fork of [badlogic/pi-mono]… Use it; don't bet a production pipeline on it.` | **đứng vững** |
| 48 | "senpi đã **xoá** cả stack computer-use 10 crate" | *chưa chạy* | — | **chưa đủ dữ liệu** — tôi chưa đo; cũng **không có neo `path:line`** trong `w-legal.md` cho khẳng định này. Nó chỉ xuất hiện trong cột "đánh giá" của bảng Rủi ro. Nên yêu cầu một neo trước khi dùng làm lập luận. |

### Khuôn `NOTICE` (bước 3, bước 8)

| # | khẳng định | lệnh kiểm | kết quả | verdict |
| --- | --- | --- | --- | --- |
| 49 | `crates/pi-shell/NOTICE` tồn tại, có **đúng 5 mảnh** | `cat -n` (35 dòng) | tên+URL `:2`; SHA `:9`; file nguồn `:7-8`; file đích `:10`; giữ gì/bỏ gì `:11-15` | **đứng vững** về nội dung |
| 50 | "**SHA ở dòng 8**" (xuất hiện 2 lần: bảng File dòng 171 và bước 3 dòng 206) | `cat -n` | `:8` = `` `src/cmds/python/pytest_cmd.rs` (pinned at commit ``; SHA ở **`:9`** | **sai** — lệch 1 dòng, lặp 2 lần |
| 51 | "phần *preserves failures… strips header framing* ngay sau" | `cat -n` | `:11-12` `It preserves failures, errors, and the final summary line; strips header framing,` | **đứng vững** |
| 52 | khuôn `markit/NOTICE:1-4` và `pi-shell/NOTICE:1-3` (bước 8) | `cat -n` | `markit/NOTICE:1-2` nêu nguồn+URL; `pi-shell/NOTICE:1-3` nêu thành phần+MIT | **đứng vững** (về nội dung) |
| 53 | 5 mảnh bắt buộc: tên repo+URL · SHA · file nguồn senpi · file đích omp · giữ gì/bỏ gì | đọc khuôn | đủ, nhưng khuôn **không** có trường "tên repo nguồn" dạng riêng — nó gộp vào câu đầu; và khuôn **không** ghi license của bên gốc dạng khối MIT đầy đủ ở `pi-shell/NOTICE` thì **có** (`:17-35`). | **chưa đủ dữ liệu** — 5 mảnh là hợp lý nhưng cần chốt có bắt buộc nhúng nguyên văn MIT không |

### Hợp đồng test & cổng

| # | khẳng định | lệnh kiểm | kết quả | verdict |
| --- | --- | --- | --- | --- |
| 54 | `scripts/ci-release-publish.test.ts:141-166`, describe ở `:141`, `stageLegalPayloads` gọi thật ở `:159`, test `legalPayloadFiles` ở `:142-146` | `awk 'NR>=138&&NR<=170'` | khớp **4/4** | **đứng vững** |
| 55 | mục brush-core là **diễn giải lại có thêm văn xuôi**, không phải bản sao (nên đừng test verbatim toàn repo) | `awk NR>=16&&NR<=24` | `:22` path, `:24` *"This directory contains a **vendored, locally-patched** copy of brush-core…"* | **đứng vững** |
| 56 | cổng phân biệt được "đã làm" với "không chạy được" | đọc 7 bước cổng | bước 1 (đỏ ở cây sạch) + bước 5 (đỏ-xanh ngược bằng cách xoá dòng SHA) là hai cổng **thật** | **đứng vững** — nhưng xem E1: T1 xanh **không** đảm bảo attribution ship tới cả 2 package |
| 57 | `git add -A && git diff --cached --stat` thấy file mới (bẫy `git diff --stat` không thấy) | — | đúng về git; chưa chạy | **chưa đủ dữ liệu** (lý thuyết git, không cần đo) |
| 58 | cổng chạy `bun test scripts/… packages/coding-agent/test/…` | `ls` | cả hai path hợp lệ (file thứ hai sẽ tạo) | **đứng vững** |
| 59 | "test script root đang nằm ở `packages/coding-agent/test/`" | `ls scripts/*.test.ts` | **13 file**, tất cả ở `scripts/` | **sai** — xem [E5](#e5-vị-trí-đặt-test-mới--lập-luận-sai-sự-thật) |
| 60 | T3 "7 mục" là toàn bộ đường dẫn trong mục TRACKED | đếm khối `-----` từ `:18` | **651 khối**, nhiều khối là văn xuôi | **sai** — xem [E3](#e3-t3-không-có-định-nghĩa-đường-dẫn--test-sẽ-đỏ-vĩnh-viễn-hoặc-bị-hardcode) |
| 61 | T4 chống hụt hụt là cần thiết | đọc | đúng; nhưng cần mở rộng sang "≥ N ứng viên path" cho T3 | **đứng vững**, cần bổ sung |
| 62 | T1 "payload chứa dòng copyright senpi **và** SHA" | đọc `:118-126` | với `pkgDir` sạch, payload = bản gốc; đỏ ở cây sạch, xanh sau khi thêm `NOTICE` | **đứng vững** — nhưng không bắt được trường hợp `continue` (E1) |

### AGENTS.md

| # | kiểm | kết quả | verdict |
| --- | --- | --- | --- |
| 63 | hardcode model id trong TS | W0 không động code, chỉ file pháp lý + test | **đứng vững** |
| 64 | prompt trong TS | không có | **đứng vững** |
| 65 | `any` / `ReturnType<>` / inline import | không có | **đứng vững** |
| 66 | `mock.module()` | tài liệu **cấm rõ** (`:271`) | **đứng vững** |
| 67 | `tsc` | tài liệu yêu cầu `bun check` (`:304`) | **đứng vững** |
| 68 | T1 có phải source-grep? | chạy hàm export thật, assert byte đầu ra → **không** phải source-grep | **đứng vững** |
| 69 | T3 có phải source-grep? | đọc `THIRD-PARTY-NOTICES.txt` (file **dữ liệu**, không phải file triển khai) rồi assert **tồn tại trên đĩa** → không assert hình dạng code | **đứng vững** — nhưng cần E3 để không biến thành hardcode 7 dòng |
| 70 | T2 (phủ địng "endorsed by") có vi phạm luật "wording/defaults"? | ngoại lệ "negative contract … ngăn một vi phạm đã ghi nhận" — ở đây là nghĩa vụ thương hiệu B1.3 | **đứng vững**, nên ghi rõ danh sách cụm cấm cụ thể |

### Effort

| # | khẳng định | kết quả | verdict |
| --- | --- | --- | --- |
| 71 | "~1 engineer-day = 0.25 + 0.25 + 0.5" | **không có số file/dòng nào** đứng sau 0.25 ngày. Đo được: 2 file văn bản, 1 aggregate chèn ~30 dòng, 2 file test, 3 câu hỏi cổng. Vế "0.5 ngày test đồng bộ" **có** cơ sở vì E1/E3 cho thấy phải đồng bộ **3** bản aggregate chứ không phải 2, và T3 cần định nghĩa parser. Vế "0.25 ngày viết NOTICE" là cảm giác. | **chưa đủ dữ liệu** — không bác bỏ được con số, nhưng **phải nói rõ chỗ nào là cảm giác**. Lưu ý: E1 làm effort tăng, không giảm. |

---

## C. Sai lệch dòng — bảng gộp để sửa một lượt

Toàn bộ đều lệch **đúng 1 dòng**, đều theo cùng hướng (vị trí thật lớn hơn 1):

| tài liệu nói | thực tế | dòng trong `w-legal.md` |
| --- | --- | --- |
| `senpi LICENSE:7` | `:6` | 39 |
| `senpi LICENSE:14-15` | `:13-14` | 46 |
| `senpi NOTICE.md:48-50` | `:49-50` | 146 |
| `senpi NOTICE.md:64-66` | `:65-66` | 146 |
| omp `LICENSE:1-22` (23 dòng) | `:1-23` | 175 |
| `THIRD-PARTY-NOTICES.txt:3` | `:4` | 121 |
| `THIRD-PARTY-NOTICES.txt:4-5` | `:5-6` | 191, 323 |
| `crates/pi-shell/NOTICE:8` (SHA) | `:9` | 171, 206 |
| `ci.yml:1174-1177` (checksums) | `:1174-1178`, file ở `:1177-1178` | 114 |
| `ci.yml:1178` (release artifact) | `:1178` thuộc step checksums; release ở `:1188` | 114 |

Sai số lượng: `git ls-files | grep -i notice` → **21**, không phải 10 (`:176`).

## D. Danh sách việc phải làm trước khi bước 3

1. **Sửa E1** — thêm 2 bản sao aggregate vào "File cần chạm tới", hoặc thêm một T1' chứng minh hành vi `continue`.
2. **Sửa E2** — nói đúng: bản gốc không có generator; **hai bản sao có**.
3. **Sửa E3** — định nghĩa cách nhận diện path trước khi viết T3.
4. **Sửa E4** — `licen` trong `CONTRIBUTING.md` là **0** dòng; `SECURITY.md` có **2** dòng khớp (`:40`, `:57`).
5. **Sửa E5** — viết lại lý do đặt test.
6. **Sửa bảng C** — 10 sai lệch dòng.
7. **Bổ sung neo** cho "xoá cả stack computer-use 10 crate".

## E. Những gì tôi **không** bác bỏ được

- **Mệnh đề trung tâm của B3** (không tạo `NOTICE.md` ở root). Nó đúng trên cả hai lớp: không
  có script nào chép `NOTICE.md` ở root, và `README.md:686` + `ci.yml:1188` + `Dockerfile:167`
  + `nix/package.nix:210` đều trỏ tới `THIRD-PARTY-NOTICES.txt`. Đây là phần **nên giữ nguyên**.
- **B4** (omp không nợ gì với `ttsr`/`todotools`). 7/7 path tồn tại và là của omp; hướng dòng
  `NOTICE.md:40-41` là omp → senpi. Lập luận ba bước đo được.
- **Con số 22.901 dòng**, **7 file pháp lý cạnh code**, **SHA `ea921626…`**, **`README.md:9`**,
  **4 khoản permissive trong `senpi/NOTICE.md`**. Tất cả khớp chính xác.
- **Effort 1 ngày** — không bác bỏ được, nhưng E1 làm nó **tăng** chứ không giảm.
