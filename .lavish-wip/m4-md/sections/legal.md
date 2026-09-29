## Pháp lý (§7)

> ### ⚠️ CẢNH BÁO — ĐỌC TRƯỚC KHI COPY BẤT KỲ FILE NÀO
>
> **Các neo pháp lý trong mục này được ghi lại từ một phiên nghiên cứu ĐÃ CÓ checkout deepseek-harness. Chúng chưa được kiểm chứng lại trên cây hiện tại.**
>
> Máy này **không có** checkout nào của `deepseek-ai/deepseek-harness`. Đã kiểm:
>
> - Không có `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/deepseek-harness`
> - Không có `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/dsh`
> - Thư mục `/Users/tranquangdang21/Documents/dsh-vs-omp-audit/` chỉ chứa **một** file: `report.md` (47 KB, 319 dòng)
>
> Nghĩa là: **không claim nào về `LICENSE`, `BRAND_GUIDELINES.md`, `vendor/README.md`, `vendor/cordis/package.json` hay `patches/` của dsh là kiểm chứng được lúc này.** Chúng tồn tại như *ghi chép của một nguồn thứ cấp*, không phải như bằng chứng.
>
> **Việc phải làm TRƯỚC khi copy bất kỳ file nào:**
>
> ```bash
> git clone https://github.com/deepseek-ai/deepseek-harness
> # rồi đọc lại, từng dòng:
> sed -n '1,5p'   deepseek-harness/LICENSE            # giấy phép gốc của dsh
> sed -n '1,15p'  deepseek-harness/BRAND_GUIDELINES.md  # nhãn hiệu — chưa có nguồn thứ cấp nào
> sed -n '1,70p'  deepseek-harness/vendor/README.md     # manifest + 22 divergence
> sed -n '1,3p'   deepseek-harness/vendor/cordis/LICENSE # ai thực sự giữ bản quyền code được port
> ```
>
> **Đây là điều kiện tiên quyết, không phải lưu ý thủ tục.** Nếu `BRAND_GUIDELINES.md` hoặc `vendor/README.md` nói khác với những ghi chép ở đây, thì phải sửa mục này theo file thật, không sửa theo bản thảo. Không ai được coi mục này là căn cứ để copy file trước khi đọc lại nguồn.

Nguồn duy nhất còn trên đĩa là `/Users/tranquangdang21/Documents/dsh-vs-omp-audit/report.md`. Mục pháp lý của nó nằm ở `report.md:250-271`, mở đầu bằng câu:

```
**Đã verify, không suy đoán:**
```

(`report.md:252`). Bảng của nó là nguồn thứ cấp duy nhất cho mọi claim về dsh. Những gì bên dưới đây tách rõ cái nào đọc được từ cây này và cái nào chỉ là ghi chép.

---

### Những gì ĐÃ kiểm chứng được trên cây này

- **oh-my-pi là MIT với ba chủ sở hữu.** **[ĐÃ KIỂM CHỨNG]** `LICENSE:1-5`, nguyên văn:

  ```
  MIT License

  Copyright (c) 2025 Mario Zechner
  Copyright (c) 2025-2026 Can Bölük
  Copyright (c) 2026 Stencil Labs, Inc.
  ```

  *Đính chính quan trọng:* báo cáo kiểm toán ghi sai ở `report.md:265` — nó chỉ nêu một dòng, `Copyright (c) 2025 Mario Zechner`. Trên đĩa có **ba**. Bản thảo §7 đúng, báo cáo thiếu. Ai đọc báo cáo sẽ tưởng chỉ có một bên; đây là lý do `deny.toml`/attribution phải đọc từ file thật chứ không từ báo cáo.

- **Mọi manifest đều khai MIT.** **[ĐÃ KIỂM CHỨNG]** `package.json:5` → `"license": "MIT",`; `packages/coding-agent/package.json:17` → `"license": "MIT",`. Quét **toàn bộ 17** manifest dưới `packages/`: 16 package workspace (`snapcompact`, `coding-agent`, `wire`, `browser-relay`, `tui`, `typescript-edit-benchmark`, `metaharness`, `catalog`, `utils`, `agent`, `omptype`, `ai`, `natives`, `mnemopi`, `stats`, `collab-web`) đều khai `"license": "MIT"`; manifest thứ 17 là `packages/coding-agent/examples/extensions/with-deps/package.json` — **không khai `license`**, nhưng nó là ví dụ extension nằm ngoài workspace (`package.json:9` chỉ glob `packages/*`) và không được publish, nên không phát sinh nghĩa vụ nào.

- **Nghĩa vụ duy nhất của MIT là giữ copyright notice và permission notice.** **[ĐÃ KIỂM CHỨNG — văn bản văn bản luật có sẵn trên đĩa]** Không phải trích MIT của dsh, mà là chính LICENSE của oh-my-pi, tức cùng một văn bản chuẩn. `LICENSE:14-15`, nguyên văn:

  ```
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  ```

  Cùng điều đó, `LICENSE:10-11` cấp rõ `to use, copy, modify, merge, publish, distribute, sublicense, and/or sell`. Đây là toàn bộ điều kiện mà MIT đặt ra — không có điều khoản bắt buộc công bố nguồn, không có điều khoản đối xứng, không có điều khoản cấm bán.

- **`cargo-deny` không chặn MIT.** **[ĐÃ KIỂM CHỨNG]** `deny.toml:31` nằm trong mảng `allow` (khối `[licenses]` mở ở `deny.toml:12`, mảng `allow` chạy `deny.toml:22-35`) và chứa `"MIT",`. Chính sách này áp cho lưới crate Rust, không áp cho TypeScript — nhưng với một mục port dạng text, nó vẫn cho thấy MIT nằm trong tập được chấp nhận.

- **Khuôn dạng attribution mà repo đã dùng có thật, và đúng vị trí bản thảo nêu.** **[ĐÃ KIỂM CHỨNG]** `THIRD-PARTY-NOTICES.txt:18` → `TRACKED VENDORED CODE AND ASSET NOTICES`. Ngay bên dưới, `THIRD-PARTY-NOTICES.txt:22-40` là mục `crates/vendor/brush-core/LICENSE` với đúng ba thứ bản thảo mô tả: giữ copyright upstream, mô tả đường dẫn (`reubeno/brush`), và liệt kê *cụ thể* các sửa đổi cục bộ ("Windows path handling fixes… an async background-PID fix for the nohup wrapper…"). Đây là mẫu để sao chép cho bất kỳ mục M4 nào.

- **Phần lớn văn bản notice theo crate là do `cargo about` sinh ra.** **[ĐÃ KIỂM CHỨNG]** `about.toml:4-17` khai `accepted` gồm `"MIT"` ở `about.toml:5`. Cơ chế đúng như bản thảo nói: một lần regen sẽ viết lại phần sinh, mục thủ công của M4 sẽ biến mất — trừ khi được viết lại sau mỗi lần regen.

- **Mục tiêu port `pi-ai` là hồi quy chức năng — phía omp xác nhận được.** **[ĐÃ KIỂM CHỨNG]** `packages/coding-agent/src/modes/controllers/tool-args-reveal.ts:2` nguyên văn:

  ```ts
  import { parseStreamingJson, parseStreamingJsonThrottled, STREAMING_JSON_PARSE_MIN_GROWTH } from "@oh-my-pi/pi-utils";
  ```

  Ba ký hiệu, đúng như bản thảo nêu. omp giữ thêm một **cửa sổ parse bị throttle**, nghiêm hơn hẳn việc gỡ thẳng. Phần còn lại của claim (nội dung bản vá của dsh) không kiểm được — xem bên dưới.

---

### Ba điểm pháp lý then chốt

Ba điểm này giữ nguyên vì chúng quyết định hành động, nhưng nhãn kiểm chứng của chúng **không đồng đều**. Đọc nhãn trước khi dựa vào.

**(a) MIT cho phép dùng lại CODE, nghĩa vụ duy nhất là giữ copyright và permission notice.**

- **[ĐÃ KIỂM CHỨNG — phần văn bản luật]** — xem `LICENSE:10-11` và `LICENSE:14-15` ở trên. Đây là văn bản MIT thật, nằm trên đĩa, và đó là toàn bộ nghĩa vụ của nó.
- **[CHƯA KIỂM CHỨNG ĐƯỢC — phần áp dụng cho dsh]** — bản thảo khẳng định `LICENSE:1-3` của dsh đọc nguyên văn `"MIT License"` / `"Copyright (c) 2026 DeepSeek"` và ghi *"Đã kiểm: đúng vậy"*. Câu đó **không kiểm được trên cây này**. Nguồn duy nhất là `report.md:256`. Đây là chỗ dễ sai nhất theo hướng nguy hiểm: nếu dsh không MIT ở root (ví dụ một repo dùng giấy phép kép nhưng LICENSE gốc khác, hoặc có `LICENSE` theo từng subsystem), thì cả mục này đổi dấu. Kiểm: `sed -n '1,5p' deepseek-harness/LICENSE` sau khi clone.
- **[CHƯA KIỂM CHỨNG ĐƯỢC — ngoại lệ đã biết trong chính báo cáo]** — `report.md:263` liệt kê các dependency bên thứ ba của vendored (`@standard-schema/spec`, `js-yaml`, `chokidar`, `picomatch`, `@babel/code-frame`, `supports-color`, `node-addon-require-builtin`). Bản thảo §7 **không** đề cập tới chúng. Nếu M4 chạm tới bất kỳ gì kéo theo một trong bảy package này thì phải đọc license riêng của nó, không được suy từ MIT của dsh. Ngoài ra `§8` của bản thảo tổng đã tự cảnh báo `native/system/` là BSD 3-Clause — `report.md` không nói điều đó, và nó cũng không kiểm được.

**(b) Nhãn hiệu KHÔNG thuộc grant MIT.**

- **[ĐÃ KIỂM CHỨNG — nguyên lý]** — quyền copyright không cấp quyền nhãn hiệu. Đây là ranh giới cơ bản của hệ thống pháp lý, và nó đúng độc lập với việc dsh có `BRAND_GUIDELINES.md` hay không. Nhánh này đúng bất kể điều gì xảy ra với file của dsh.
- **[CHƯA KIỂM CHỨNG ĐƯỢC — và yếu hơn các claim khác]** — bản thảo dẫn `BRAND_GUIDELINES.md:9` (nhãn hiệu đã đăng ký của DeepSeek, cảnh báo dùng trái phép trong tên dự án *"may also involve trademark infringement"*), `BRAND_GUIDELINES.md:7` (mô tả được phép, ví dụ *"built on DeepSeek Harness"*) và `BRAND_GUIDELINES.md:8` (khi đặt tên nên dùng **"DSH"**). **Không có nguồn thứ cấp nào trên máy này.** Đã grep toàn bộ `report.md` (319 dòng) với `brand|trademark` → **0 hit**; grep rộng hơn (`brand|trademark|nhãn hiệu|đăng ký`) → **1 hit**, và hit đó là `report.md:24` (`splice theo thứ tự đăng ký` — nghĩa là thứ tự đăng ký disposer, không liên quan nhãn hiệu). Mục pháp lý của báo cáo tự mở đầu bằng *"Đã verify, không suy đoán"* (`report.md:252`) và vậy mà **không nhắc tới nhãn hiệu đang một lần**. Đây là claim mong manh nhất của mục này: nó không chỉ thiếu kiểm chứng sơ cấp, nó còn thiếu cả xác nhận thứ cấp.
  → Kiểm: `sed -n '1,20p' deepseek-harness/BRAND_GUIDELINES.md` sau khi clone. **Đừng dùng chuỗi "DeepSeek" trong tên package/module/subcommand, và đừng dùng "DSH" như tên công khai, cho tới khi đọc được file này.** Đây là điểm bị bỏ sót nhiều nhất theo đánh giá của bản thảo, và việc nó đứng một mình không có nguồn làm nó càng dễ bị coi là sẵn sàng.
- **[CHƯA KIỂM CHỨNG ĐƯỢC]**`Cần người xác nhận trước khi phát hành công khai` — giữ nguyên, và nên nâng lên thành điều kiện chặn, vì toàn bộ Wave B/C/D của M4 đang `shippable: false` cho một lý do khác (§6.2). Việc M4 chưa phát hành là thuận lợi: **không có bề mặt công khai nào đã tồn tại để phải gỡ.**

**(c) Tái tạo sạch từ pattern đã tài liệu hoá thì không nợ notice nào.**

- **[CHƯA KIỂM CHỨNG ĐƯỢC — nhưng đây là claim mang tính khuyến nghị, không phải dữ kiện]**` Bản thảo viết: tái tạo sạch mô hình từ `docs/cordis-primer.md` và `docs/architecture.md` thì không nợ notice, và đó là đường kế hoạch nghiêng về, vì M4 chỉ port **kỷ luật ưu tiên** (một mảng ~40 dòng logic, chưa tới 200 dòng tổng) chứ không phải runtime. Bản thảo không nói ranh giới pháp lý nằm ở đâu — nó chỉ khẳng định hệ quả (tái tạo sạch thì không nợ notice) và đòi phải quyết rõ từng deliverable. **Câu tiếp đây là đóng góp của lượt kiểm chứng này, không phải trích dẫn.**
- **Sai lầm cần nêu thẳng, vì đây là nơi dễ tự thuyết phục mình nhất:** "chỉ port kỷ luật, chưa tới 200 dòng" **không phải** tiêu chí pháp lý. Ranh giới là *mức độ giống nhau và nguồn gốc suy nghĩ*, không phải số dòng. Một mảng 40 dòng mà đọc ra là bản chép lại cấu trúc `DisposableList` của Cordis thì vẫn là mã nguồn được sao chép, và vẫn nợ notice. Ngược lại một mô hình 500 dòng viết lại từ đặc tả hành vi thì không nợ. Vì vậy con số "40 dòng / 200 dòng" trong bản thảo là **ngân sách kỹ thuật, không phải tiêu chí pháp lý** — đừng dùng nó để kết luận rằng một deliverable nào đó "chắc chắn sạch".
- **Hệ quả vận hành, đã kiểm được:** bản thảo yêu cầu *"phải quyết rõ cho từng deliverable và ghi lại quyết định đó"*. Đây là yêu cầu đúng và là phần quan trọng nhất của mục này — nhưng nó chỉ thực hiện được **sau** khi đọc lại nguồn. Với mỗi deliverable của M4, ghi vào PR: lấy từ đâu (cụ thể tới file và dòng), hoặc *tái tạo từ pattern nào đã tài liệu hoá*, và ai kết luận. Cần **người có chuyên môn xác nhận ranh giới này, không phải kỹ sư tự kết luận.**

---

### Đính chính sau khi kiểm chứng

Bốn claim của bản thảo sai hoặc không chính xác. Không có claim nào trong số này đổi hướng quyết định của M4, nhưng cả bốn đều sai về *sự thật*, và sai về sự thật ở mục pháp lý thì đắt hơn sai ở mục kỹ thuật.

1. **Số dòng `TRACKED VENDORED CODE` trong `ci.yml` là sai.** Bản thảo ghi `.github/workflows/ci.yml:889`, `:899`. Trên đĩa, `THIRD-PARTY-NOTICES.txt` xuất hiện ở **`ci.yml:22`** và **`:51`** (bộ lọc path), **`:1178`** (sinh `SHA256SUMS.txt`) và **`:1188`** (danh sách file của `softprops/action-gh-release`). Dòng 887-900 thật sự chứa là khối comment về Rosetta và Xcode của job `release_binary_hosted` — không liên quan gì. **Sửa thành `ci.yml:1188`** cho ý "đi kèm mọi bản phát hành", và `ci.yml:22`, `:51`, `:1178` cho ba chỗ còn lại. Nội dung thì đúng: file có thật trong danh sách release asset.

2. **Số dòng `stageLegalPayloads` là sai.** Bản thảo ghi `scripts/ci-release-publish.ts:85`, `88-93`. Thực tế: hằng `MIT_LICENSE` / `THIRD_PARTY_NOTICES` ở **`:93-94`**, hàm `legalPayloadFiles` khai ở **`:97`**, và nhánh quyết định ở **`:99-100`**:

   ```ts
   case "MIT":
       return [MIT_LICENSE, THIRD_PARTY_NOTICES];
   ```

   `stageLegalPayloads` được **định nghĩa ở `:111`** và được **gọi ở ba call site: `:279`, `:319` và `:599`** (`:599` là `coreManifest.license ?? "MIT"` — đường đóng gói package lõi). Dòng 85-88 rơi vào giữa `interface PackageManifest` (`:81-89`), không liên quan. **Sửa thành `scripts/ci-release-publish.ts:97-100` và `:111`.** Nội dung thì đúng: mọi package MIT đều nhận cả hai file.

3. **`grep -rln 'TRACKED VENDORED CODE'` khớp nhiều hơn "chính file .txt đó" — và điều này làm rủi ro nặng hơn bản thảo nói.** Bản thảo viết lệnh này chỉ khớp bên trong chính file `.txt` đó. Chạy lại trên cây hiện tại cho **4** kết quả **ngoài `.lavish-wip/`** (chính file mục này và file danh sách phát hiện cũng chứa chuỗi đó, nên grep toàn cây chưa lọc sẽ ra nhiều hơn): `THIRD-PARTY-NOTICES.txt` (root), `packages/coding-agent/src/tools/browser/relay/extension-assets/THIRD-PARTY-NOTICES.txt`, `packages/natives/THIRD-PARTY-NOTICES.txt`, và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` (bản thảo tự trích dẫn chính nó — dương giả). **Ba file `.txt` là ba bản giống nhau từng byte** (`md5 = 0d464153645a70d915816410b75d9cbd`, đều 22901 dòng), cả ba đều được git track. **Cơ chế thật là `stageLegalPayloads` — *"Package-local license/notice files win; missing files fall back to the repository payload"* (`:108-109`) — và nó không đồng nhất giữa ba bản; đó mới là chỗ cần canh.** (grep `THIRD-PARTY-NOTICES` trong `scripts/`, `.github/workflows/`, `package.json` cho **11** hit: 4 ở `ci.yml`, 1 ở `scripts/ci-release-publish.ts:94`, 6 ở `scripts/ci-release-publish.test.ts` — và grep đó **bỏ sót** hai script ở `packages/*/scripts/`, là hai chỗ duy nhất thực sự di chuyển file.) Cụ thể:

   **(i)** `packages/coding-agent/src/tools/browser/relay/extension-assets/THIRD-PARTY-NOTICES.txt` là **artifact sinh tự động**, không phải bản sao thủ công — `packages/browser-relay/scripts/build-extension.ts:40-42` copy từ file root, rồi `:51-61` nhúng vào thư mục `extension-assets` (định nghĩa ở `:21`) mà chính script tự in *"commit these"* ở `:66`. Nó được wire vào build tại `packages/browser-relay/package.json:16`, và bản sinh ra được `packages/coding-agent/src/cli/license.ts:2` import thẳng làm payload cho lệnh `omp license`. Sửa tay bản này là **việc thừa** — `bun run build` của browser-relay sẽ ghi đè.
   
   **(ii)** `packages/natives/THIRD-PARTY-NOTICES.txt` là **nguồn thủ công có quyền ưu tiên** — `resolveLegalPayload` ở `packages/natives/scripts/gen-npm-packages.ts:128-133` ưu tiên file package-local (`NATIVE_LEAF_LEGAL_FILES` khai ở `:61`, đưa vào `files` ở `:99`), nên nó **thắng** file root và được `fs.copyFile` vào từng thư mục `npm/<tag>/` (`:168-172`). Bản này lệch âm thầm là lệch **có hậu quả** — nó đi thẳng vào npm tarball, và hiện không có test nào assert nó bằng root.
   
   **(iii)** File root là nguồn duy nhất được `ci.yml:22`, `:51`, `:1178`, `:1188` đưa vào release asset và mọi package MIT.
   
   **Hệ quả thật, ngược với cách tài liệu cũ diễn đạt:** một mục M4 thêm vào root mà không sửa bản natives sẽ **không xuất hiện** trong các leaf package đã phát hành; còn sửa bản relay bằng tay là việc thừa. **Đây là phát hiện mới của lượt kiểm chứng này, không có trong bản thảo, và nó nặng hơn phần "bảo trì thủ công" mà bản thảo đã cảnh báo.**

4. **Báo cáo kiểm toán đếm thiếu chủ sở hữu bản quyền của chính oh-my-pi.** `report.md:265` ghi oh-my-pi là `MIT License` / `Copyright (c) 2025 Mario Zechner` — một dòng. `LICENSE:3-5` trên đĩa có **ba**. Bản thảo §7 nói đúng ("ba chủ sở hữu"). Không sửa bản thảo; ghi vào đây vì ai đọc `report.md` làm nguồn sẽ sai, và vì nó là ví dụ rõ nhất cho vì sao các neo pháp lý phải đọc từ file thật chứ không từ báo cáo.

Ngoài ra, một chỗ **lệch giữa bản thảo và nguồn thứ cấp của nó** (chưa đủ cơ sở gọi là sai, nhưng phải ghi): bản thảo nói 22 divergence nằm ở `vendor/README.md` *"từ dòng 29"*, còn `report.md:236` ghi `vendor/README.md:31-58`. Hai nguồn không khớp nhau. Số 22 thì **ba lần lặp trong báo cáo** (`report.md:170`, `:236`, `:269`) và `:170` còn gắn nó với "2.696 dòng" — con số đó xuất hiện ở cả hai nơi, nên nó là dữ kiện thật của báo cáo, chỉ là chưa kiểm được. Khi clone, đếm lại từ file và ghi dải dòng thật.

---

### Điều chưa kiểm chứng được

Toàn bộ danh sách dưới đây **không có bằng chứng nào trên máy này** ngoài `report.md`. Chúng không sai — chúng **chưa được biết là đúng**. Đây là những gì một người sẽ dựa vào để quyết định có copy file nào, nên chúng được liệt kê đầy đủ thay vì gộp.

> Mọi lệnh trong cột *Cách kiểm* giả định bạn đang đứng **bên trong** checkout. Viết tắt cho gọn; nếu chạy từ thư mục cha, thêm tiền tố `deepseek-harness/` vào mọi đường dẫn (giống hộp cảnh báo ở trên) — ví dụ `sed -n '1,5p' deepseek-harness/LICENSE`, `ls deepseek-harness/vendor/`.

| # | Claim của bản thảo | Nguồn thứ cấp duy nhất | Cách kiểm sau khi clone dsh |
|---|---|---|---|
| 1 | dsh MIT, không phiên bản; `LICENSE:1-3` = `"MIT License"` / `"Copyright (c) 2026 DeepSeek"` | `report.md:256` | `sed -n '1,5p' LICENSE` |
| 2 | Phần đáng port là Cordis đã vendor, 9 package + `packages/boot/hmr` | **không có.** `report.md:258` chỉ xác nhận 9 vendor package đều MIT; mệnh đề này là nguyên văn từ bản thảo (`COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:11597`), không xuất hiện trong báo cáo | `ls vendor/` |
| 3 | Mọi LICENSE vendor đọc `"Copyright (c) 2021-present Shigma"`; chủ là Shigma/cordiverse, **không phải** DeepSeek | `report.md:257` | `head -3 vendor/*/LICENSE` |
| 4 | `vendor/README.md:5`: *"Upstream MIT `LICENSE` files are preserved in each package directory."* | `report.md:260` | `sed -n '1,10p' vendor/README.md` |
| 5 | Quy trình sync dsh giữ LICENSE upstream (`vendor/README.md:64`) | `report.md:261` | `sed -n '60,70p' vendor/README.md` |
| 6 | Manifest chia nguồn: `cordis`+`loader` từ cordiverse; `include`/`group`/`timer`/`hmr`/`logger-console` từ fork DeepSeek; `cosmokit`+`schemastery` từ fork DeepSeek | `report.md:262` | `sed -n '1,20p' vendor/README.md` |
| 7 | **22** divergence cục bộ đã đánh số, dải dòng `31-58` (bản thảo ghi "từ dòng 29") | `report.md:170`, `:236`, `:269` | đếm lại từ `vendor/README.md` |
| 8 | `vendor/cordis/package.json` = `@deepseek-ai/cordis` `4.0.4` MIT | `report.md:259` | `cat vendor/cordis/package.json` |
| 9 | dsh có `THIRD_PARTY_NOTICES.md` 23KB ở root | `report.md:264` | `ls -la THIRD_PARTY_NOTICES.md` |
| 10 | `native/system/` là **BSD 3-Clause**, không phải MIT | *(báo cáo không nói; chỉ có §8 bản thảo tổng)* | `head -3 native/system/LICENSE` |
| 11 | **`BRAND_GUIDELINES.md:7`, `:8`, `:9`** — nhãn hiệu đã đăng ký, cảnh báo trademark infringement, quy tắc đặt tên "DSH" | **không có. 0 hit trong toàn bộ `report.md`.** | `sed -n '1,20p' BRAND_GUIDELINES.md` |
| 12 | `patches/@earendil-works__pi-ai@0.85.1.patch` toàn bộ là gỡ `block.arguments = parseStreamingJson(block.partialJson)` | **không có. Báo cáo không nhắc tới file patch này.** | `cat patches/@earendil-works__pi-ai@0.85.1.patch` |

Ba dòng đó (#2, #11, #12) nổi lên vì chúng là **claim không có nguồn thứ cấp nào** — kể cả khi đối chiếu với một báo cáo tự nhận là *"Đã verify, không suy đoán"*. Nếu số 11 và 12 được viết từ đọc trực tiếp `BRAND_GUIDELINES.md` và thư mục `patches/` trong một phiên đã mất, thì chúng có thể đúng; nhưng hiện tại chúng đứng trên cùng một chỗ với các claim khác mà lại yếu hơn, vì không có gì để đối chiếu. **Xử lý chúng như câu hỏi mở, không như dữ kiện.**

Số 12 cần thêm một bước: dù claim "port bản vá đó là hồi quy chức năng" có phía omp đã xác nhận (`tool-args-reveal.ts:2`, xem trên), thì việc **gạch khỏi danh sách port** là một quyết định kỹ thuật và nó **đúng bất kể nội dung patch là gì** — vì omp đã có thiết kế mạnh hơn, nên không có lý do kỹ thuật nào để lấy. Đừng để một claim pháp lý chưa kiểm chứng mang quyết định đã đúng sẵn.

---

### Không phải tư vấn pháp lý

Đây là tổng hợp sự thật về văn bản cấp phép và hệ quả thực tế của chúng, dựng từ các file được trích. Nó không phải tư vấn pháp lý, và ba câu hỏi dưới đây cần người có chuyên môn trả lời, không phải kỹ sư:

1. **Ranh giới "tái tạo sạch"** ở điểm (c) — kỹ thuật không tự phân định được ranh giới này.
2. **Nhãn hiệu** ở điểm (b) — và mọi câu hỏi về việc dùng tên, trước khi bất kỳ thứ gì của M4 được phát hành công khai.
3. **`packages/natives/THIRD-PARTY-NOTICES.txt` phải được giữ bằng file root bằng cách nào** — nó thắng root trong `resolveLegalPayload` và đi vào mọi leaf tarball, hiện không có test nào assert hai file bằng nhau. Có nên thêm một assertion byte-equality vào `packages/natives/test/npm-packages.test.ts` (nơi đã có sẵn fixture `THIRD-PARTY-NOTICES.txt`), và ai là người chịu trách nhiệm khi `cargo about` regen ghi đè phần sinh?
