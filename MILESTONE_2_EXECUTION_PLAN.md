# KẾ HOẠCH THỰC THIỆN — MILESTONE 2: MỌI THỨ LÀ PLUGIN

Milestone 2 không mang lại khả năng mới cho người dùng. Nó làm cho ranh giới giữa "lõi" và "extension" trở nên trung thực — ai đang giữ tài nguyên, ai phải trả lại, và lúc nào việc gỡ extension thật sự xảy ra chứ không chỉ là "quên" trong bộ nhớ. Vì vậy nó là bước đầu tiên của luận điểm của cả chương trình: nếu một extension không thật sự được nhả ra khi bị tắt, thì câu chuyện "mọi thứ là plugin" chỉ là một câu chuyện về cách load, không phải về cách sống. Milestone 1 đã dựng tiền đề bằng cách biến `omp` thành strict superset của `earendil-works/pi` — một năng lực không thể trở thành plugin nếu nó chưa tồn tại. Nhưng bao trọn không phải mục tiêu cuối, và cũng không phải mục tiêu của milestone này. M2 không viết lại toàn bộ; phần lớn công việc là sửa cho đúng những chỗ đang nói dối về quyền sở hữu.

Milestone 2 dự kiến gồm **15 work item trong 8 wave**. Chỉ mục đi đi kèm đã đánh dấu 69 câu hỏi còn mở và 129 đính chính so với dự thảo kế hoạch — con số này không phải để làm kế hoạch trông nặng, mà để báo trước rằng phần lớn rủi ro nằm ở chỗ đồ thuật nghe đúng nhưng chưa ai chắc.

---

## Mục tiêu

Đọc mục tiêu theo hướng ngược: nhìn vào những gì người dùng cuối cùng thấy được, rồi bỏ phần còn lại.

**Ba thay đổi người dùng thật sự nhận ra:**

- **Tắt một extension trong settings thì nó thật sự dừng.** Những interval chạy nền mà nó đã hẹn, và model provider mà nó đã đăng ký, không còn tác dụng; bật lại thì chúng trở về. Trước M2, "disable" chỉ là một cờ trong bộ nhớ — extension vẫn giữ module state của nó.
- **Hai plugin đăng ký trùng tên tool thì ra cùng một kẻ thắng, trên mọi máy, mọi lần chạy, và sau mỗi lần cài lại.** Trước đó thứ tự thắng lệ thuộc thứ tự filesystem trả về — nghĩa là nó âm thầm đổi theo bố cục thư mục. Sau M2, thứ tự load là path sort, và khi có trùng thì cả hai bên đều bị nêu tên trong một chẩn đoán.
- **Gọi `ctx.ui.setHeader(...)` giờ báo lỗi thật**, nêu đúng tên method và chỉ sang `setWidget`/`setEditorComponent`, thay vì nuốt im lặng. Kèm theo, mỗi hook widget được ghi vào account của extension đã set nó, nên gỡ một extension không còn xóa luôn widget của tất cả những extension khác, và `/new` không còn làm trắng widget của một extension vẫn đang chạy.

**Một tầng năng lực mới — phần lớn vô hình, nhưng không phải toàn bộ:**

Người viết extension cuối cùng cuối cùng có một bề mặt ngắn để làm việc thật. `pi.registerMode` cài một mode — tool set, cổng settings, enter/exit, chính sách ghi file, và một chip hiển thị trên status line — thay vì tự dựng 15 KB cơ chế mode. Năm mode built-in cũng được đăng ký lại qua chính con đường đó mà không đổi hành vi. Tương tự, `pi.registerSetting` cho phép extension khai báo một khoá cấu hình có namespace của riêng nó, hiện được trong settings panel, báo cáo được qua sáu lớp provenance, và gỡ được khi extension rời đi. Khoá setting của plugin chuyển từ hai file JSON vặt sang namespace `plugins.<id>.<key>` bên trong `Settings` sẵn có, nên nó nhận đúng sáu tầng phân cấp mà setting lõi đang có, và `provenance()` nói được lớp nào đã thắng.

**Phần lớn công việc còn lại là vô hình — và đó là chủ ý.** Đây là mục tiêu cần nói thẳng, vì nếu không nói thì người đọc sẽ tưởng M2 là một đợt refactor vô nghĩa:

- Bảng chuyển tiếp event thay chuỗi `if/else` 19 nhánh bằng một bảng tra có kiểu khoá liệt kê đủ 19 tên. Hành vi không đổi một byte. Thay đổi thật là: thêm một loại event mới vào session mà không thêm nhánh chuyển tiếp thì **không compile**.
- Registry capability được đổi tên từ `reset` thành điều thật sự nó làm — `invalidateAllCaches` — kèm một `resetRegistry()` riêng thật sự xoá định nghĩa. Cả 12 call site và 8 dòng import cũng đổi theo. Người đọc tương lai được cho biết `reset` cũ thật ra chỉ xoá cache fs. Người dùng cuối cùng không thấy gì.
- Bảng admission tool thay chuỗi 25 nhánh `if (name === …)` bằng một `Map`. Tập tool tới được model là **giống hệt nhau trước và sau**.
- Registry `toolRenderers` built-in được đóng băng (`Object.freeze` + `Readonly`). Mọi renderer built-in render ra byte-identical, vì một object literal đầy đủ mà không ai mutate thì đóng băng cũng y hệt. Cả 14 consumer trong repo đều là lượt đọc. Cái thu được là backdoor bị đóng: không còn plugin nào âm thầm tô lại transcript của mọi tool cho cả tiến trình.
- Một `ExtensionRunner.unloadExtension()` thật sự rỡ extension khỏi registry, dispose đúng các trampoline ghi/xoá file của riêng nó, và xoá đúng các cờ runtime của riêng nó — **cố ý khác** `setSuspendedExtensions`, vốn giữ state để resume không phải đấu lại dây. Ở thời điểm này nó vẫn là thay đổi nội bộ, người dùng chưa thấy gì.

Có một điều nữa cần gọi tên trước khi ai đó tự kết luận: **M2 không làm `isProjectTrusted()` thành giá trị thật.** Hàm đó hôm nay được khai báo và cài bằng `() => true`, tức là một check không bao giờ fail. M2 chốt tư thế tin cậy trên giấy; phần cài thật là công việc M–L, nằm ngoài M2, và là tiền đề bắt buộc cho bất kỳ việc marketplace nào sau này.

---

## Không làm gì

Các hạng mục dưới đây bị **cố ý hoãn**, không phải bị bỏ sót.

- **Hai thiết kế ở wave 8 — WI-11 và WI-12 — KHÔNG build gì cả.** Đây là điểm dễ nói sai nhất của toàn bộ kế hoạch, nên nói thẳng: chúng chỉ **ghi lại trạng thái hiện tại** để wave sau có chỗ bám, chứ không phải đã làm xong.
  - **WI-11** (state persistence theo từng extension) viết một tài liệu quyết định state riêng của một plugin nằm ở đâu: nó xếp hạng ba substrate, chọn một, và đặt tên một đường dẫn trên đĩa cùng một đơn vị sở hữu cụ thể. Không có store nào được dựng. Lý do hoãn build đã được kiểm chứng trong cây: `git grep -n 'async unload|unloadExtension|#unload' -- packages/coding-agent/src/extensibility/` trả về **zero hit**. Seam gỡ duy nhất trong toàn bộ extension API là `unregisterProvider` — một lần gỡ provider hẹp, không phải teardown tổng quát. Một store dựng trước khi có unload thật sẽ phải gắn vòng đời vào sau, tốn hơn là thiết kế một store đã có vòng đời từ đầu. Đừng đọc WI-11 là "tính năng state đã có" — nó là một quyết định có tên, có ngày, chưa có code.
  - **WI-12** (extension đóng góp MCP server) cũng chỉ là một tài liệu quyết định, chọn giữa hai kiến trúc và nói thẳng ra luật approval và trust. Cổng bị chặn của nó đã được xác minh: `isProjectTrusted()` là `() => true`, nên một MCP server do extension đóng góp thừa hưởng một check không bao giờ fail. Sản phẩm được chấp nhận ở đây là **một quyết định người maintainer review được**, không phải một build xanh. Có một cái bẫy cần biết: danh sách file trong chỉ mục cho WI-12 có kèm các file sản xuất mà tài liệu đó **đã đọc để thiết kế**, nhưng gate của nó yêu cầu `git diff --stat HEAD` chỉ liệt kê đúng ba path docs và **không có gì dưới `packages/`**. Động vào một file nguồn ở đây nghĩa là item đã bị build thay vì designed.
- **Không cài tư thế tin cậy.** WI-0 chỉ ra ba phương án A/B/C và bắt buộc ghi tên người quyết, ngày, và câu trả lời cho `ctx.exec`. Phần cài enforcement là M–L, nằm ngoài M2, và M2-OQ7 ràng buộc bất kỳ ai làm marketplace sau này theo đúng lựa chọn mà ADR đó chọn.
- **Không gỡ các shim tương thích cũ.** WI-10 nêu chúng với số dòng thật và nói rõ việc gỡ là một dự án breaking-change riêng, ngoài M2.
- **Không làm marketplace.** Ngoài M2, bị buộc bởi M2-OQ7.
- **Không cộng dồn thêm "viết lại toàn bộ".** Ba work item XS–S đầu tiên đều là sửa ranh giới sở hữu, không phải di chuyển kiến trúc. Wave 5 (WI-7) là hạng mục lớn nhất — 5–8 PR trong 4–5 tuần — và cũng là hạng mục duy nhất có thể làm hỏng dữ liệu người dùng, vì nó đụng write-guard của plan mode.

Còn một mục nữa đáng nêu như một sự thật chứ không phải một lời hứa: **build của cả WI-11 và build của cả WI-12 hiện chưa có chủ.** Kế hoạch gốc yêu cầu phải đặt tên người và hạn cho chúng trước khi M2 đóng. Việc M2 làm là biến nghĩa vụ đó thành việc cụ thể; việc gán tên và ngày là quyết định của con người, và nó nằm ở bảng "Quyết định cần bạn chốt".

---

## Điều kiện tiên quyết

Native addon: khi nào `bun test` có nghĩa, và khi nào không. Chặn là **CHỌN LỌC theo bề mặt import, không phải toàn cục** — đo tại HEAD `106eb3e`, 2026-09-28, trong khi addon của `packages/natives` CHƯA build: `packages/omptype` **1.191 test / 0 fail** và `packages/utils` chạy được. Chỉ những file import `pi_natives` mới đỏ. Phép đo theo package: `omptype` 1139/0 · `utils` 658/17 · `catalog` 141/104 · `stats` 43/19 · `mnemopi` 146/53 · `agent` 4/46 · `ai` 73/450 · `tui` 149/205 · `coding-agent` 913/1445.

Để build được (khi bạn cần), thứ tự là:

```
brew install bazelisk
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
```

`bun run check:ts` thì **không** cần addon — ở HEAD hiện tại nó chạy xanh toàn bộ 15 package, exit 0. Đây là nhiều gate nhất trong kế hoạch chỉ vì thế, và nhiều gate được thiết kế để đỏ được.

**Một lần chạy test thất bại TRƯỚC khi build addon nghĩa là gì:** nó không nghĩa là gì cả về thay đổi của bạn. Toàn bộ suite báo `0 pass / 1 fail` với lỗi `Failed to load pi_natives native addon for darwin-arm64` — kể cả những test có sẵn, không liên quan, như `test/capability/rule-agents.test.ts`. Đây là một đặc tính của checkout, không phải tín hiệu về code.

Ba hệ quả thực tế kéo theo, đáng nhớ trước khi đụng vào việc test:

1. **`0 pass` không phải là xanh và cũng không phải là đỏ.** Đừng báo một gate là "pass" chỉ vì nó im lặng. Với WI-9, chẳng hạn: `bun run check:ts` xanh hoàn toàn **kể cả khi xoá sạch cả file test 15 dòng**, nên nó không thể chứng nhận hành vi teardown một mình. Gate thật là `bun test` báo 15 pass — và gate đó đang bị chặn.
2. **Đừng báo "đỏ trước / xanh sau" một cách vội vàng.** Một assertion nào đó pass sơ-vơng trên HEAD chỉ chứng minh nó không làm gì cả. Ví dụ ở WI-1: assertion **(1) timer chết sau suspend** và assertion **(3) provider biến mất khỏi `ModelRegistry` sau suspend** đỏ trên HEAD và xanh sau khi làm; assertion **(2) timer sống lại sau resume** pass sơ-vơng trên HEAD vì chưa có gì được dọn — nó là chốt hồi quy cho commit 1, và chỉ thành gate thật khi commit 1 đã đáp. Lưu ý: assertion (3) là của **commit 2, tức wave 4**, không phải wave 2. Có một điểm tương tự ở WI-2: test phải tự chứng minh premise của chính nó — nó đọc thư mục fixture bằng chính primitive mà loader dùng, và từ chối chạy nếu `readdir` tình cờ đã trả về thứ tự lexical, vì khi đó assertion sẽ pass trên một implementation chẳng sort gì.
3. **Test mới viết mà không chạy được vẫn phải commit.** Ở WI-4, hai file test không thi hành được trong checkout này nhưng là chốt hồi quy cho người build addon kế tiếp. Xoá chúng vì "test đỏ" chính là failure mode mà item đó nhiều khả năng rơi vào nhất — và cả hai file đều bị chặn ở đúng lý do đó, không phải vì thiếu addon.

Một lưu ý nữa về độ tin cậy của gate: nhiều gate trong kế hoạch này là **gate người**. Markdown nằm ngoài mọi glob lint và typecheck, không có markdown linter, và không có docs index nào để vỡ. Một lần CI xanh trên nhánh đó không nói được điều gì về WI-0, WI-10, WI-11 hay WI-12. Các gate đó phải được chạy như một lần đọc của người, và kết quả phải được ghi lại bằng tên.

---

## Thứ tự thực hiện

### Wave 1 — Hai ADR, không dòng code nào

**Bàn giao:** hai tài liệu quyết định trong `docs/`, mỗi cái nêu người quyết và ngày, và ba file markdown được chạm — không file TypeScript nào.

**Gồm:** WI-0 (extension trust model) và WI-10 (bề mặt viết chuẩn). WI-10 phụ thuộc cứng của WI-0, và thứ tự là bắt buộc: M2-OQ2 đổi nghĩa của chữ "canonical" đối với một tác giả bên thứ ba, nên viết bảng xếp hạng bề mặt lên một tư thế tin cậy chưa viết ra là đóng băng sai hợp đồng, và mọi thay đổi tư thế về sau trở thành breaking change với những tác giả đã xuất bản.

**Cần trước khi bắt đầu:** một người có quyền chốt. Wave 1 nằm ở đầu toàn bộ chuỗi vì WI-0 chặn WI-10, WI-7, WI-11, WI-12 và hai commit sau của WI-5 — sáu thứ. Nếu wave 1 trượt, milestone này không lùi được.

**Đúng sau khi nó kết thúc:** `docs/extension-trust-model.md` và `docs/extension-writing-surfaces.md` tồn tại; quyết định của WI-0 là một trong ba phương án A/B/C và câu trả lời cho `ctx.exec` là một câu trích được — một câu trì hoãn đóng gói thành "chưa có tư thế" **không** phải một trong ba phương án và sẽ fail; M2-OQ2 được viết thành **đúng một trong ba chữ** YES / NO / DEFERRED, nằm trên một dòng đứng riêng, không suy ra từ văn xuôi quanh nó; `git diff --stat` đúng ba file, không file `.ts`; và một maintainer khác — không phải tác giả — trả lời được ba câu hỏi từ text một mình, không phải hỏi lại tác giả. Hãy nhớ cạm bẫy đặc trưng của mục này: một tài liệu liệt kê sáu bề mặt, gán cho mỗi cái một tính từ mô tả, và không nói cái nào là canonical cho công việc mới — đó là một quyết định giả, và một maintainer sẽ không trả lời được câu hỏi.

### Wave 2 — Ba việc độc lập, ba PR riêng

**Bàn giao:** disable trở nên trung thực (nửa timer), thứ tự load trở nên tất định, backdoor `toolRenderers` bị đóng.

**Gồm:** WI-1 **commit 1 (timers)**, WI-2, WI-4.

**Song song:** cả ba hoàn toàn độc lập, không mục nào chặn mục nào. Đây là wave duy nhất trong M2 bạn có thể mở ba nhánh cùng lúc mà không cần ai xin phép ai.

**Cần trước khi bắt đầu:** addon đã build, nếu bạn muốn test thật thay vì chỉ type-check. Ngoài ra có một va chạm cần thỏa thuận trước, dù nó nằm ở wave 3: WI-1 commit 1 và WI-5 commit 1 đều thêm một lệnh teardown có owner vào **cùng một nhánh suspend** của `reconcileExtensionSources`. Không viết nhánh đó hai lần. Ai đáp sau thì **mở rộng** nhánh sẵn có, không dựng lại — và hãy kiểm tra ở HEAD rằng WI-1 chưa đã chiếm chỗ đó.

**Đúng sau khi nó kết thúc:** callback của timer đã hẹn không bắn trong khi session còn sống, và hai extension thì tắt một không làm chết cái kia; sau resume thì callback bắn lại. (Phần **provider là commit 2 của WI-1, thuộc wave 4** — không phải gate của wave này, và commit 1 bị cấm đụng vào nó.) Fixture của test load-order tự chứng minh nó thật sự phân biệt. `git grep -nE 'toolRenderers\[[^]]*\] *=|toolRenderers\.[A-Za-z_$]+ *=' -- packages` vẫn trả về **zero hit** — thay đổi không được tạo ra writer nào. Cả hai file test của WI-4 đã commit, dù không chạy được. `test/extensions-discovery.test.ts` và `test/extension-loader-concurrency.test.ts` vẫn xanh — file thứ hai là chốt đứng canh việc `loadExtensions` import đồng thời nhưng ràng factory theo thứ tự path, và thứ tự sort mới không được làm xáo nó.

### Wave 3 — Đóng hai chỗ máy nói dối về chính nó

**Bàn giao:** bảng chuyển tiếp event có kiểu kiểm tra, và registry capability nói đúng tên.

**Gồm:** WI-3 (event relay exhaustive) và WI-5 **commit 1** (đổi tên `reset` → `invalidateAllCaches`).

**Song song:** WI-3 độc lập với WI-1 và WI-2 và có thể chạy song song. Nhưng WI-3 và WI-5 commit 1 **cùng chạm `session/agent-session.ts`**, nên phải thống nhất thứ tự merge. Điểm giao duy nhất được ghi nhận giữa WI-3 và phần còn lại là file đó cùng M2-OQ6, và từ `export` trên `extensions/runner.ts`. **M2-OQ6 phải chốt trước khi bất kỳ ai đụng vào file** — đây là quyết định chặn, xem bảng bên dưới.

**Cần trước khi bắt đầu:** M2-OQ6. Không có gì khác. WI-5 commit 1 không phụ thuộc WI-0; hai commit sau mới phụ thuộc.

**Đúng sau khi nó kết thúc:** `bun run check:ts` exit 0 — và đây là gate mang sức nặng thật, không phải nghi thức: nếu ai đó thêm một tên vào `RelayableEventKind` mà không thêm nhánh, kiểu ánh xạ đòi thuộc tính thiếu và tsgo fail. Nếu ai đó viết dạng `Record` trần theo sketch của kế hoạch gốc, mọi nhánh chạm vào trường riêng của một biến thể event sẽ không compile. Nếu ai đó dùng `HookEvent` làm kiểu khoá, `Extract` sụp về `never` và bảng hỏng. Với WI-5: `git grep -n resetCapabilities -- packages/coding-agent/src` trả về zero hit, và dòng thứ hai của `reset-contract.test.ts` phải **đỏ trên HEAD** — nếu không làm đỏ được trước khi sửa thì chưa có gì được chốt. Dòng đầu của file test đó là một cái bẫy ngầm: nó xanh ngay hôm nay và đỏ ngay khi có ai thêm `capabilities.clear()` vào hàm cache fs — đúng cái nhầm mà kế hoạch dành cả một đoạn để cấm. **Cấm** làm `reset()` xoá luôn map `capabilities`.

### Wave 4 — Sở hữu provider, và bảng admission

**Bàn giao:** provider đã đăng ký mang `sourceId` và gỡ được theo nguồn; công cụ tới được model được quyết định bởi một bảng dữ liệu.

**Gồm:** WI-1 **commit 2 (provider + resume)**, WI-5 **commit 2–3** (bị gate bởi câu trả lời M2-OQ2), WI-6 (bảng admission tool).

**Song song:** WI-1 commit 2 chạy song song được với WI-6. WI-5 commit 2–3 thì không — chúng chờ ADR wave 1, vì câu trả lời "capability registry có extension-reachable không" quyết định có đáng xây attribution hay không lúc này hay không. WI-6 phụ thuộc WI-2 (quy tắc trùng tên phải chốt trước, vì thứ tự đăng ký trở nên nhạy thứ tự khi bảng admission trở thành khai báo) và WI-5 (bảng tool-set mà mode registry sẽ rút ra).

**Cần trước khi bắt đầu:** RIÊNG cho WI-6, một **characterization test** phải được viết và commit **trước** refactor, và chứng minh xanh. Không phải sau. Đó là bước duy nhất giữ bạn khỏi việc âm thầm làm rụng một closure capture.

**Đúng sau khi nó kết thúc:** toàn bộ sáu dòng nhánh của characterization test cùng dòng extension-tool cùng dòng an toàn prototype đều xanh trên **cả** chuỗi 25 nhánh lẫn bảng, trước và sau. Và một audit thủ công một lần: diff tập phân giải `.names` cho cả 33 tên tool trên ma trận settings × depth (taskDepth 0 và 1 × gates tất cả tắt và tất cả bật × memory backend `hindsight`/`mnemopi`/`local`) giữa commit trước và commit sau refactor — hai bên phải **byte-identical**. Đây chính là check bắt được closure capture bị rơi, thứ mà không assertion nào trong file test tự bắt được. Ở WI-5, đây là lúc câu chốt buộc phải nói thẳng trong PR: **chưa có đường code sản xuất nào đăng ký capability provider với sourceId** (toàn bộ 84 lời gọi `registerProvider` đều ở mức module trong `src/discovery/`), nên lời gọi `unregisterProvidersForSource` trong nhánh suspend là bất hoạt tại thời điểm ship. PR đó chỉ đặt seam, không hơn. Đừng để PR tuyên bố rằng bật/tắt extension giờ thật sự nhả provider trong thực tế.

**Đúng sau khi nó kết thúc (tiếp — phần provider của wave này):** WI-1 commit 2 — provider đã đăng ký biến mất khỏi `ModelRegistry` và `registry.authStorage.keys.source(name)` trở về `undefined` sau suspend, rồi cả hai trở lại sau khi bật. Cổng này **chưa tồn tại trên HEAD** cho tới khi bạn xem mục WI-1: `unregisterProvider(name, sourceId)` chỉ có ở *chữ ký*, cả hai hiện thực đều bỏ qua `sourceId` (`loader.ts:108`, `runner.ts:713`). Xem hàng `WRONG PREMISE` trong bảng đính chính của WI-9.

### Wave 5 — `registerMode`: phần việc thực chất của M2

**Bàn giao:** một lời gọi `pi.registerMode` cài trọn một mode, năm mode built-in đi qua cùng con đường đó mà không đổi hành vi, và seam status-line được đóng băng.

**Gồm:** WI-7. Đây là hạng mục L — 5–8 PR trong 4–5 tuần — và là hạng mục duy nhất của M2 có thể làm hỏng dữ liệu người dùng.

**Cần trước khi bắt đầu:** tất cả wave 1–4 đã đáp. WI-7 phụ thuộc WI-1, WI-2, WI-5, WI-6 và WI-10. Lý do từng cái đều cụ thể: một mode đã bị suspend phải thật sự dừng, nếu không nó thừa kế bug timer còn sống; thứ tự mode phải tất định trước khi mode trở nên nhạy thứ tự, vì hôm nay chuỗi priority của segment mode là nguồn thứ tự duy nhất và trường `order` của WI-7 phải suy ra từ đó; mode cần capability state thật sự phải giải phóng được; `ModeDefinition.initialToolSet` phụ thuộc vào các quy tắc admission mà WI-6 chốt. Ngoài ra **bước 1 phải được viết trước khi registry tồn tại**.

**Đúng sau khi nó kết thúc:** `bun run check:ts` exit 0; grep seam-2 vẫn báo đúng 51 dòng trên 21 file với **zero hand-edit**, và seam-1 vẫn hiện sáu boolean ở `modes/types.ts:189-194`; một mode đăng ký từ **BÊN NGOÀI repo** — qua `packages/coding-agent/test/fixtures/outsider-extension/`, nạp bằng `discoverAndLoadExtensions([], tempProjectDir)` chứ không phải qua `configuredPaths` — xuất hiện trong registry với `statusLine` bắt buộc, vẽ được chip trong segment `mode` của status line, **chặn** một lần ghi vào working tree nhưng **cho phép** một lần ghi `local://`, và chạy với `result.errors` rỗng; và `examples/extensions/plan-mode.ts` không còn tồn tại. Đây chính là mục tiêu thật của wave: bằng chứng rằng đường cài thật, chứ không phải một đường nội bộ, đã đi qua.

### Wave 6 — UI không còn nuốt im lặng, widget có chủ

**Bàn giao:** `setHeader`/`setFooter` ném lỗi thật; mỗi hook widget thuộc về đúng extension đã set nó.

**Gồm:** WI-13, **hai PR với hai điều kiện gate khác nhau**.

**Cần trước khi bắt đầu:** PR 1 không cần gì. PR 2 không bị gate ở wave 6, nhưng **phải đáp trước WI-9**.

**Đúng sau khi PR 1 kết thúc (đây là gate của wave 6):** `bun run check:ts` xanh; `bun test test/extension-ui-header-footer.test.ts` báo 2 passing; `grep -rn 'setFooter: () => {}\|setHeader: () => {}' packages/coding-agent/src` trả về **zero hit** ở cả bốn site, không chỉ site bạn đã sửa — sửa một trong bốn site để lại sáu hit và mệnh đề (c) không đạt; và **cả hai test phải được quan sát là ĐỎ trên HEAD trước khi sửa** — một test pass trên HEAD không chứng minh gì cả.

Đây là cách hỏng nhiều khả năng nhất của M2, nên nói thẳng: **ship PR 1 rồi đóng wave là hỏng.** Mọi mệnh đề trên khi ấy đều xanh, mọi thứ giống như xong, và khung vẫn giữ widget của những extension đã bị gỡ, `/new` vẫn làm trắng widget của một extension đang chạy. Cái lỗ hổng đó chỉ đóng bằng ràng buộc thứ tự "PR 2 đáp trước WI-9" — đó là một kiểm tra của con người, không phải một lệnh. Khi PR 2 xong: năm call site remount đều phải được chuyển (đếm, đừng liếc), map widget phải theo từng extension **và phải giữ lại factory/content** — nếu không giữ thì remount là bất khả thi và đó là lý do PR 2 là M chứ không phải S. PR 2 cố ý ship **không có test** cho hành vi owner, vì WI-9 sẽ viết các dòng (3)(4)(5); PR của nó phải nói thẳng điều đó thay vì ngụ ý có coverage.

### Wave 7 — Sở hữu settings và seam unload thật

**Bàn giao:** cấu hình plugin vào bên trong `Settings`; extension khai báo được khoá setting của riêng nó; và `unloadExtension()` rơi đúng các bucket của riêng nó.

**Gồm:** WI-8a, WI-8b, WI-9. Đây là wave rộng nhất, M–L, khoảng 2,5 tuần, 4 PR.

**Song song:** WI-8a không phụ thuộc gì cả. WI-8b phụ thuộc cứng WI-8a — không phải "cải thiện", mà là điều kiện tiên quyết: substrate có namespace phải tồn tại trước, vì một id trần sẽ đụng id lõi qua so sánh chuỗi và `register()` **ném lỗi lúc load** thay vì hạ nhẹ. WI-9 đứng cuối, sau cả hai.

**Cần trước khi bắt đầu:** với WI-8b, **M2-OQ4** phải đã có câu trả lời trước khi bắt đầu các bước 5–7. Với WI-9, toàn bộ danh mục tài nguyên phải đã có chủ: WI-1 cả hai nửa, WI-4, WI-5 commit 1, và **PR 2 của WI-13**. Tạm hoãn — xem wave 8. Với WI-12 ở wave sau, WI-9 là thứ **duy nhất** cho phép thiết kế MCP contribution — kế hoạch ghi rõ không thể thiết kế nó mà không có WI-9.

**Đúng sau khi nó kết thúc:** `bun run check:ts` exit 0 — hôm nay đây là gate duy nhất thực sự chạy được, và nó phủ đúng cái migration bốn file là nơi một call site bị sót sẽ lộ ra. `test/extension-unload.test.ts` tồn tại với đủ 15 dòng, 11 dòng là một-dòng-mỗi-bucket, và **mutation phân biệt của từng dòng được viết ra như bình luận ngay trong file test**. `bun test` báo 15 pass / 0 fail — **đang bị chặn bởi addon chưa build, và không được báo là xanh**. Grep xác nhận không còn writer hay reader phẳng `flagValues` nào. Nói rõ điều mà `check:ts` **không** bắt được: nó xanh hoàn toàn kể cả khi xoá sạch file test, nên nó không thể chứng nhận hành vi teardown một mình. Nếu chỉ có `check:ts` xanh mà chưa chạy được test, item này phải được báo là **đã viết nhưng chưa kiểm chứng** — không phải là xong.

Với WI-8a: ba dòng của `plugin-settings-provenance.test.ts` xanh (hai dòng migration và một dòng env/provenance), ba file test cũ vẫn xanh, và **migrate đã được chạy tay đúng thứ tự** trên một project thật có `.omp/plugin-overrides.json` viết tay — một giá trị bị xoá khỏi kho mới vẫn còn bị xoá sau lần chạy thứ hai. Đó là kiểm tra "hồi sinh" mà bộ test không bắt được. Ngoài ra hãy nói thẳng khi trình bày: WI-8a đăng ký setting plugin **động lúc load** vào một registry **không có unregister**. Đây là rủi ro chính của nó, và nó cao hơn mức "LOW" mà kế hoạch gốc đánh giá.

### Wave 8 — Thiết kế hoãn

**Bàn giao:** hai tài liệu quyết định, và **không một dòng sản xuất nào**.

**Gồm:** WI-11 và WI-12 — xem mục "Không làm gì" ở trên, đừng đọc chúng là đã làm xong.

**Cần trước khi bắt đầu:** wave 1 phải có, vì cả hai tài liệu đều phải nói rõ khuyến nghị của mình có điều kiện theo tư thế tin cậy hay không. Riêng WI-11: nếu WI-8a đã đáp, hãy đọc `manager.ts:929-960` trước — đó là tiền lệ cụ thể của "substrate sai" trông như thế nào, và tài liệu mạnh hơn nhiều khi trích dẫn code đã migrate thật thay vì đoán trước.

**Đúng sau khi nó kết thúc:** `git diff --name-only | grep -c '\.ts$'` trả về **0**. Tài liệu WI-11 xếp hạng **ba** substrate và chọn một — một tài liệu nêu người thắng mà không nêu người bị đánh bại thì đọc lên như sơ suất chứ không như một quyết định. Nó phải đặt tên một đường dẫn trên đĩa cụ thể và một đơn vị sở hữu cụ thể (theo danh tính extension, khoá theo đường dẫn cài, khớp `extension.flags` chứ **không phải** `runtime.flagValues`). Cả hai hợp đồng tương lai phải viết ở thì hiện tại, và cái thứ hai phải nói **values sẽ ra sao khi đổi tên**, chứ không chỉ khẳng định việc đổi tên không được làm mồ côi giá trị. Với WI-12, `git diff --stat HEAD` chỉ liệt kê ba path docs và **không có gì dưới `packages/`**; tài liệu phải nói đúng tiền đề của nó — contribution khai báo ở mức package **đã ship** và cái thiếu là contribution mệnh lệnh ở runtime; và một maintainer khác phải trả lời được từ tài liệu một mình, không cần đọc code, câu hỏi: "nếu tôi cài một extension đăng ký MCP server thì mạng và credential của tôi sẽ ra sao?". Tầm trust chưa được một con người trả lời **không phải là pass**, kể cả khi mọi thứ khác xanh.

---

## Quyết định cần chốt trước khi code

Đây là các quyết định phải chốt trước khi viết code. **Ba hàng đầu chặn việc bắt đầu**; hàng thứ tư thì không — nó chặn việc **đóng** M2. Xếp theo số thứ nó chặn nhiều nhất.

| Quyết định | Chặn cái gì | Chốt ở đâu |
| --- | --- | --- |
| **M2-OQ2 — capability registry có extension-reachable không?** Trả lời bằng đúng một trong ba chữ `YES` / `NO` / `DEFERRED`, nằm trên dòng đứng riêng. | WI-10, WI-7, WI-5 commit 2–3, WI-11, WI-12 — và nó đổi nghĩa của chữ "canonical" cho tác giả bên thứ ba, nên nó là thứ đóng băng sai hợp đồng sớm nhất. | Wave 1, WI-10. Đây là câu hỏi duy nhất có câu trả lời bắt buộc bằng ba chữ; một tài liệu nói `TBD` hoặc "tùy" là fail. |
| **Ba câu hỏi trong ADR của WI-0:** extension ở project scope nạp vô điều kiện, có bị chặn, hay không nạp; `ctx.exec` có bị gate riêng hay cố ý nằm ngoài; `isProjectTrusted()` có thành giá trị thật hay vẫn là stub `() => true`. |Toàn bộ wave 1, và qua đó **bốn work item** phía sau (WI-10, WI-7, WI-11, WI-12) cùng **hai commit 2–3 của một** work item là WI-5.| Wave 1, WI-0. Quyết định phải là một trong ba phương án A/B/C — một câu trì hoãn đóng gói thành "chúng ta chưa có tư thế" **không phải** phương án nào trong ba cái. |
| **M2-OQ6 — chuyển 46 overload của `agent-session.ts` thành interface `Events` khai báo ở mức module hay không.** | WI-3, và mọi thứ khác sửa `session/agent-session.ts` trong cùng đợt. | Trước khi wave 3 chạm file. Đây là điểm giao duy nhất giữa WI-3 và phần còn lại. |
| **Ai giữ tên enforcement của tư thế tin cậy, và bao giờ.** M2 chỉ ghi quyết định; phần cài là M–L và nằm ngoài M2. | Không chặn việc code trong M2, nhưng chặn việc **đóng** M2 — và nó là tiền đề bắt buộc cho bất kỳ việc marketplace nào, với M2-OQ7 ràng buộc người làm công việc đó theo lựa chọn của ADR. | Chốt trong ADR wave 1; phải có TÊN, CHỦ và NGÀY trước khi M2 đóng. |

---

## Quyết định cần bạn chốt

Những cái này **không** chặn bắt đầu — ngoại lệ duy nhất là **M2-OQ4**: chính chỉ mục gọi nó là một quyết định chặn ("Not a code dependency but a blocking one"), vì bước 5–7 và dòng test 3 của WI-8b không thể làm được trước khi nó có câu trả lời. Ngoài ra chúng sẽ chặn về sau. Nếu không chốt đúng lúc, chúng biến thành thất bại thầm lặng — tức là thất bại mà không có gì đỏ.

| Quyết định | Chặn cái gì, và khi nào |
| --- | --- |
| **M2-OQ4 — khoá setting của extension hiện ở đâu trong settings panel.** | WI-8b bước 5–7 và dòng test 3. Đây là chính xác cái thất bại mà kế hoạch gọi tên: expose `registerSetting` trong khi panel vẫn không hiển thị được key — tác giả không nhận lỗi, người dùng không có UI, và **không có gì trong CI đỏ**. Trả lời sau khi đã expose API là cách mở lại đúng lỗi đó. |
| **M2-OQ3 — seam status-line.** | Sinh ra ở bước 0 của WI-7 (wave 5), và đóng lại ở đó. M3 sẽ tiêu thụ chính cái seam này và **không được mở lại** — nên nó phải chốt trong wave 5, không phải khi M3 bắt đầu. |
| **M2-OQ8 — substrate cho state riêng của từng extension.** | Quyết định trong WI-11 (wave 8). Câu trả lời ở WI-8b quyết định state của WI-11 nằm cạnh các khoá đó hay trong một kho thứ hai — và WI-8a đã tồn tại để loại bỏ chính cái kho thứ hai đó. |
| **M2-OQ7 — ràng buộc công việc marketplace về sau theo lựa chọn của ADR WI-0.** | Ngoài M2, nhưng bắt buộc tiền đề. Nếu không ràng buộc, thị trường sẽ được xây trên một tư thế mà bản thân nó nói chưa chốt. |
| **Build của WI-11 (store state theo từng extension) — ai làm, ở milestone nào.** | Chưa có chủ. Kế hoạch yêu cầu đặt tên và hạn trước khi M2 đóng. Chốt cùng lúc với các mục khác trong bảng trên. |
| **Build của WI-12 (extension đóng góp MCP server) — ai làm, ở milestone nào.** | Chưa có chủ, và nằm ngoài M2 theo thiết kế. Tài liệu wave 8 không tự gán được, và một tài liệu thiết kế có thể bị người đọc sau lặng lẽ biến thành kế hoạch build nếu không ai gán tên. |
| **Ở ACP, việc im lặng có đúng không.** | Mệnh đề (c) của gate WI-13 grep cả bốn site `setHeader`/`setHeader: () => {}`. Nếu quyết định là "im lặng của ACP là đúng", mệnh đề thu hẹp còn ba site — **và quyết định phải được ghi trong PR. Không được thu hẹp lặng lẽ.** |
| **Quy tắc đặt tên biến môi trường cho setting của plugin.** | WI-8a bước 3. Nó **không** do bộ test bắt: dòng test dùng đúng tên mà fixture khai báo, nên một cái trượt đặt tên là vô hình với cả suite. Vì thế luật phải được viết ra và được review, không được để lại cho test. Cùng kiểu, `deletePluginSetting` đổi ngữ nghĩa và không có dòng nào khẳng định điều đó. |

---

## Quy ước khi đọc

- **Văn xuôi tiếng Việt, code giữ nguyên.** Comment, chuỗi log, tên biến, tên hàm và thông điệp lỗi viết theo ngôn ngữ gốc của chúng, không dịch. Giải thích thì giải thích bằng tiếng Việt.
- **`bun check` và `bun test`. Không bao giờ `tsc`, không bao giờ `npx tsc`.** Type check đi qua `bun run check:ts`; nó là nhiều gate nhất trong kế hoạch này vì lý do đó.
- **Không bao giờ source-grep một file implementation trong test.** Một test đọc file nguồn rồi khẳng định về *văn bản* của nó — `expect(src).toContain("someCall()")`, `.toMatch(/import …/)`, `.not.toContain("oldName")` — là test về cách code *trông*, không phải nó *làm gì*: nó vỡ vì một refactor vô hại (xuống dòng comment, đổi tên, sắp lại import) và xanh trong lúc hành vi đã hỏng. Hãy khẳng định hợp đồng quan sát được, dùng probe lúc chạy cho phần điện không test được trong tiến trình, và ép các bất biến cấu trúc bằng type test hoặc luật oxlint — không bằng quét chuỗi. Đọc một file mà **chính code của bạn đã ghi** (kết quả apply-patch, bundle sinh ra, fixture tạm) rồi khẳng định về output đó thì được — đó là hành vi, không phải quét nguồn.
- **Không `mock.module()`.** Nó biến đổi module registry toàn cục và rò sang các file khác. Dùng `spyOn` trên object module đã import, kèm `vi.restoreAllMocks()` trong `afterEach`. Một test pass riêng lẻ nhưng làm hỏng file chạy sau là một test hỏng.
- **Không để test mới chỉ kiểm tra điều dễ thấy nhất.** Mỗi test mới phải bảo vệ một hợp đồng cụ thể mà người tiêu thụ quan sát được: hành vi, hình dạng đầu ra, chuyển trạng thái, ánh xạ lỗi, hay một ranh giới parsing dễ vỡ. Không có placeholder, không tautology, không assertion kiểu "code chạy được". Và **đừng trùng coverage giữa các tầng**: nếu một test tích hợp đã chứng minh hành vi thì bỏ test đơn vị hẹp hơn lặp lại nó qua mock.
- **Policy của catalog sửa trong cây `.kdl` rồi sinh ra.** Sửa KDL ở `packages/catalog/src/compat/rules/`, chạy `bun run gen:compat`, và commit `rules.json` cùng thay đổi `.kdl`. **Không sửa trực tiếp file JSON sinh ra** — `models.json` và `rules.json` đều là output của generator, bàn tay sửa tay sẽ bị ghi đè ở lần regenerate kế tiếp. Thêm test hồi quy vào **rule/descriptor/mapper**, không vào JSON bundle. Sau khi sửa rules: `bun run gen:compat` và commit file sinh ra kèm theo.
- **Hai cái bẫy lặp lại trong kế hoạch này, đáng nhớ trước khi đi vào code.** Một là WI-5: KHÔNG cho `reset()` xoá luôn map `capabilities` — đó là phương án bị cấm, và có một dòng test đứng canh nó sẽ đỏ ngay khi có ai làm vậy. Hai là WI-3: sketch literal trong kế hoạch gốc — `satisfies Record<RelayableEventKind, (event: AgentSessionEvent) => …>` — sai theo hai chiều, và bản `Record` trần sẽ làm mọi nhánh chạm vào trường riêng của một biến thể event không compile.


---


## WI-0. Chốt và viết ra mô hình tin cậy cho extension (quyết định, không code)

**Thay đổi gì:** Viết một ADR phê chuẩn hoặc lật ngược cách `oh-my-pi` đối xử với code extension đi kèm khi bạn clone một project — không code, không build, không test — bởi thế bài tin cậy đã được giao hàng một cách ngầm, và một thế bài mà không ai viết ra thì không ai dám thay đổi mà không làm vỡ mọi tác giả bên thứ ba.

**Wave:** 1

**Effort:** S — nửa ngày thiết kế cộng viết ADR, khớp với mức "S để quyết định" của chính plan. Ước lượng này chỉ đúng nếu tác giả kìm được bản thân không nở tài liệu thành một thiết kế cơ chế thực thi: phần thực thi là M–L và nằm ngoài M2. Cộng thêm khoảng hai giờ so với ước lượng thô cho bước 2, vì truy vết đường dẫn plugin phạm vi project là nghiên cứu plan chưa từng làm, và câu trả lời của nó làm thay đổi mức cấp bách của chính quyết định. Chi phí cài đặt, chỉ để lên kế hoạch, là M–L tùy phương án được chọn — nằm ngoài M2 nhưng KHÔNG nằm ngoài chương trình: nó là tiền đề bắt buộc cho bất kỳ việc marketplace nào, và M2-OQ7 ràng buộc bất kỳ ai làm việc đó vào phương án mà ADR này chọn.

**Người dùng thấy:** Không có gì độc lập — mục này giao hàng một tài liệu. Cái thấy được là một maintainer giờ trả lời được câu "oh-my-pi có hỏi trước khi chạy code extension từ repo này không?" bằng cách đọc một file, thay vì bằng hai chú thích trong code; và một tác giả extension bên thứ ba đọc một chỗ là biết luật mình đang bị ràng buộc. ADR còn ghi tên, gán chủ và đặt hạn cho hạng mục thực thi mà M2 hiện để bỏ trống chủ — làm cho việc trì hoãn là nhìn thấy được chứ không phải im lặng.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `docs/extension-trust-model.md` | tạo | Bản ghi quyết định. Các mục bắt buộc, đúng thứ tự này: (1) Status / Decider / Date; (2) "What ships today" — chỉ sự thật, mỗi mục một neo `file:line`, không phán xét; (3) "Threat model" — gọi tên kẻ tấn công và tài sản một cách cụ thể chứ không trừu tượng; (4) Phương án A / B / C, mỗi phương án kèm chi phí thật, kể cả cái nó phá; (5) THE DECISION — đúng một câu, chọn A, B hoặc C, kèm lý do; (6) "The three answers" — ba câu hỏi chấp nhận viết lại thành câu khẳng định trích dẫn được, không phải câu hỏi mở; (7) "Consequences" — mở khoá gì, và hạng mục thực thi mang một TÊN, một CHỦ và một NGÀY; (8) Revisit triggers. | **có** (`verified: true`) |
| `docs/extensions.md` | sửa | Thêm một mục "Trust" ngắn nêu thế bài đã được phê chuẩn cho tác giả extension, và dẫn tới `docs/extension-trust-model.md`. Đây là file tác giả thực sự mở, nên nó mang câu trả lời ngắn và liên kết, không mang lập luận. Gói trong ba hoặc bốn câu: extension phạm vi project tải vô điều kiện hay bị chặn; `isProjectTrusted()` trả về gì và vì sao; quyết định đầy đủ và các điều kiện xem xét lại nằm ở đâu. | **có** (`verified: true`) |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới tiêu đề `## [Unreleased]` hiện có (đã xác nhận ở dòng 3), trong một mục `### Added` MỚI phải tạo ngay dưới nó — hiện chưa có: dòng 4 trống, dòng 5 là `## [18.3.3] - 2026-09-27`, và `### Added` ở dòng 7 thuộc về 18.3.3 (mục đã phát hành, bất biến, tuyệt đối không chèn vào) — không có thay đổi hành vi nên không phải `Changed`, không có gì vỡ nên không phải `Fixed`. Dẫn đầu bằng thứ người đọc tìm được, ví dụ: `Documented the extension trust model: project-local extensions [load unconditionally | are gated]` và `isProjectTrusted()` `[returns a real value | stays a compatibility stub returning true]`. | **có** (`verified: true`) |

Ghi chú chung về độ tin cậy của neo: cả ba file đều đã kiểm chứng, nhưng **toàn bộ số dòng được đối chiếu với HEAD `808b365`**, không phải `5873776` như ngữ cảnh task cũ nói. Cảnh báo thao tác bắt buộc: `packages/coding-agent/CHANGELOG.md:1057` là mục **ĐÃ PHÁT HÀNH** nằm dưới `## [18.1.16] - 2026-09-09` (tiêu đề mục xác nhận ở dòng 1039) và là bất biến — tuyệt đối không sửa. Hãy viết dòng mới sao cho đọc ra là tài liệu hóa một thế bài đã được phê chuẩn, chứ không phải là phủ định bản ghi đã phát hành đó; nếu quyết định lật ngược thế bài "không chặn", hãy nói thẳng và dẫn link issue, vì đó là thay đổi hành vi mà nếu không nói thì bản ghi phát hành sẽ trông như bị đảo ngược.

### Các bước

1. **Chốt sự thật trước khi hình thành ý kiến.** Đọc hai chú thích đã giao hàng vốn đã phát biểu một thế bài: `packages/coding-agent/src/extensibility/extensions/types.ts:487-494` và `:548-561`; cùng hai chỗ hiện thực nó: `packages/coding-agent/src/extensibility/extensions/runner.ts:1264` và `packages/coding-agent/src/session/agent-session.ts:7406`. Viết ra danh sách "What ships today" gồm năm câu phẳng, mỗi câu kèm `file:line` của nó: (a) input phạm vi project được phát hiện và tải vô điều kiện; (b) project root của đường `.omp/extensions` là `<cwd>/.omp` (`packages/coding-agent/src/discovery/omp-extension-roots.ts:162`), còn project root của đường plugin KHÔNG phải `<cwd>/.omp` mà là `entry.installPath` đọc từ registry của ancestor gần nhất (xem bước 2) — đừng gộp hai đường thành một sự thật; (c) `isProjectTrusted()` tồn tại trên extension context tại hai chỗ khai báo; (d) cả hai hiện thực đều là đúng chuỗi `() => true`; (e) không có prompt, allowlist hay cổng chặn nào tồn tại ở bất kỳ đâu trên đường tải. Mục này **chỉ sự thật** — đừng để lập luận lọt vào đây. *(neo: `packages/coding-agent/src/extensibility/extensions/types.ts:548`)*

2. **Làm đúng mảng nghiên cứu mà plan chưa bao giờ làm: truy vết đường dẫn PLUGIN phạm vi project** — đây là mức phơi nhiễm lớn hơn hẳn đường `.omp/extensions` mà plan đang bàn. Đọc `packages/coding-agent/src/discovery/helpers.ts:1271-1307` — khối đầu bằng `Project-scoped OMP registry`, chú thích `Loaded from the nearest .omp/plugins/installed_plugins.json relative to cwd. Project entries take precedence over user entries for the same plugin ID` — nơi dựng các entry `projectRoots` với `scope: "project"` và `path: entry.installPath`. Rồi đọc `packages/coding-agent/src/extensibility/plugins/loader.ts:19` (`scope: "user" | "project"`), `:93-95` (liệt kê `<root>/node_modules` cho từng root), và `:331` / `:407` (`resolvePluginPaths(plugin, "extensions")` phân giải khoá manifest `omp.extensions`). Xác nhận điểm vào tại `packages/coding-agent/src/discovery/helpers.ts:1013-1021` và `:1025` (`resolveActiveProjectRegistryPath`: ancestor gần nhất chứa `.omp/`, nếu không thì `.git` gần nhất làm mốc neo). Rồi viết kết luận bằng **một câu**: clone một repository có chứa `.omp/plugins/installed_plugins.json` khiến các module extension của plugin đó tải như các root phạm vi project mà không có prompt, và các entry project **CHE KHUẤT** entry của chính người dùng. Câu này là lập luận mạnh nhất của ADR — đừng làm nó yếu đi. *(neo: `packages/coding-agent/src/discovery/helpers.ts:1300`)*

3. **Viết mục threat model.** Gọi tên kẻ tấn công và tài sản một cách cụ thể, vì "supply chain" không phải là một threat model. Kẻ tấn công là bất kỳ ai kiểm soát repository bạn vừa clone, hoặc kiểm soát một phiên bản plugin được pin trong lockfile của repository đó. Tài sản là quyền thực thi mã tùy ý với credential và shell của bạn, đạt được bằng cách chạy `omp` bên trong một thư mục bạn được bảo rằng an toàn để mở. Nói thẳng điều ĐÃ ĐÚNG: `ctx.exec` được khai báo trên extension context (`packages/coding-agent/src/extensibility/extensions/types.ts:1492`) và một extension đã tải đã có nó; và suspend chưa thu hồi credential của provider (đó là commit 2 của WI-1, wave 4). Đừng mềm hóa điều này thành rủi ro ở thì tương lai. *(neo: `packages/coding-agent/src/extensibility/extensions/types.ts:1492`)*

4. **Viết ba phương án với chi phí THẬT**, không phải bản tóm tắt của plan. **(A) Prompt theo thư mục:** rẻ nhất về code — API đã được đóng sẵn đúng hình dạng — nhưng KHÔNG miễn phí, và ADR phải nói rõ vì sao: hai chỗ hiện thực phải đổi (`runner.ts:1264`, `agent-session.ts:7406`), hai test hiện có khẳng định giá trị hiện tại và sẽ chuyển đỏ (xem mục Hợp đồng test), và nó mâu thuẫn với một mục changelog **ĐÃ PHÁT HÀNH** tại `packages/coding-agent/CHANGELOG.md:1057`, khiến nó thành thay đổi hành vi người dùng thấy được. Cũng nêu bán kính ảnh hưởng rộng hơn module extension: chú thích `types.ts:548-561` mô tả project trust là bao trùm `extensions, settings, skills, resources`, nên phương án A hoặc chặn nhiều hơn phạm vi ADR này quyết, hoặc là tự mâu thuẫn. **(B) Allowlist theo tầng nguồn gốc:** không prompt, ma sát bằng không, và ranh giới supply chain nằm trong cấu hình — nhưng đòi hỏi một entry ở user scope tường minh, tức là một mức ma sát phải trả ở chỗ khác. **(C) Trì hoãn có tuyên bố:** hợp lệ, nhưng chỉ hợp lệ nếu ADR nói rõ M2 khẳng định và không khẳng định điều gì — mà đó là nửa công việc. *(neo: `packages/coding-agent/CHANGELOG.md:1057`)*

5. **ĐƯA RA QUYẾT ĐỊNH.** Viết `Option A`, `Option B` hoặc `Option C` trong **một câu**, và không câu trả lời nào khác. Nếu câu trả lời là C, ngay đoạn kế tiếp phải là tuyên bố "M2 khẳng định và không khẳng định gì", vì một sự trì hoãn không tự định phạm vi cho chính nó thì không phân biệt được với việc chưa từng quyết định. Đây là bước mà toàn bộ sổ rủi ro treo vào: plan ghi rằng tác giả API đã đưa ra quyết định này một cách công khai và vô hình, và bất kỳ thay đổi nào về sau đều là breaking change với những tác giả bên thứ ba đã xuất bản dựa trên seam đó. *(neo: không)*

6. **Trả lời M2-OQ5 bằng một câu khẳng định trích dẫn được về `ctx.exec`:** nó nằm trong phạm vi của cổng chặn, hay cố ý nằm ngoài với lập luận "nếu nó đã tải rồi thì nó đã được tin cậy"? Câu trả lời nào cũng chấp nhận được; **một câu trả lời vắng mặt thì không** — vì chặn việc tải module mà để `ctx.exec` nằm ngoài sẽ tạo ra một tài liệu **có vẻ** an toàn nhưng không an toàn. Plan gọi ra điều này hai lần: với tư cách câu hỏi chấp nhận thứ hai trong hợp đồng ba câu hỏi (plan:257), và với tư cách câu hỏi mở M2-OQ5 ở mục "Cần người quyết" (plan:323) — KHÔNG có "quy tắc R8" nào trong plan, token `R8` chỉ xuất hiện trong chính câu này; và cổng chấp nhận của chính M2 cho M2 thất bại khi ADR không nêu câu trả lời này. *(neo: `packages/coding-agent/src/extensibility/extensions/types.ts:1492`)*

7. **Trả lời câu hỏi chấp nhận thứ ba:** `isProjectTrusted()` trở thành một giá trị thật, hay vẫn là một stub tương thích trả về `true`? Nêu như một quyết định kèm lý do; và nếu nó ở lại làm stub, hãy nói rõ đây là một thế bài **CỐ Ý, ĐÃ ĐƯỢC TÀI LIỆU HÓA** chứ không phải một tính năng chưa làm — vì đó đúng là khác biệt mà chú thích đã giao hàng tại `types.ts:548-561` đang cố tạo ra mà không một người đọc bên ngoài nào nhìn thấy. Cũng nêu hệ quả: nếu câu trả lời là "giá trị thật", thì hai test trong mục Hợp đồng test bị xoá hoặc viết lại, và mục changelog đã phát hành bị thay thế. *(neo: `packages/coding-agent/src/extensibility/extensions/types.ts:561`)*

8. **Viết mục hệ quả và bịt lỗ hổng việc chưa có chủ.** Plan nói thẳng rằng phần THỰC THI của phương án được chọn là M–L, nằm ngoài M2, và — điểm mấu chốt — **không milestone nào trong toàn bộ chương trình sở hữu nó, kể cả M3**, và quyết định mở marketplace cũng không có chủ. Vì bước 2 đã xác lập rằng đường cài marketplace phạm vi project **đã giao hàng**, hạng mục chưa có chủ này không phải chuyện giả định. Hãy đặt một TÊN, một CHỦ và một NGÀY cho hạng mục thực thi ngay trong ADR. Sau đó thêm mục "Trust" vào `docs/extensions.md`, rồi thêm một dòng changelog dưới `## [Unreleased]`. **Không commit nếu không được yêu cầu.** *(neo: không)*

### Hợp đồng test

**Không có test, và đó chính là công cụ đúng** — AGENTS.md cấm test hình thức, còn một quyết định dạng tài liệu không có hợp đồng runtime nào quan sát được. Hợp đồng là một chấp nhận **BA CÂU HỎI** mà một maintainer phải trả lời được chỉ từ phần chữ của ADR, không cần hỏi tác giả:

1. Extension phạm vi project tải vô điều kiện, bị chặn, hay không tải?
2. `ctx.exec` bị chặn riêng, hay cố ý nằm ngoài cổng chặn?
3. `isProjectTrusted()` trở thành một giá trị thật, hay ở lại làm stub tương thích trả về `true`?

Bất kỳ câu nào tài liệu không trả lời được nghĩa là tài liệu chưa xong. Hai hợp đồng **PHẢI ĐỊNH** cũng còn hiệu lực và không được vi phạm: ADR không được để M2-OQ5 bị bỏ ngang, và không được để hạng mục thực thi thiếu TÊN, CHỦ và NGÀY. **Người tiêu dùng thấy gì nếu hồi quy:** thế bài tin cậy vẫn cứ do ai đó tình cờ viết API extension trước quyết định, một cách vô hình, cho tới khi thế bài buộc phải đổi — lúc đó nó là breaking change với mọi tác giả extension bên thứ ba đã xuất bản dựa trên seam đó, và không có tài liệu nào giải thích họ được dựa vào điều gì.

**Hai file test có sẵn — KHÔNG do mục này viết ra.** Cả hai được trích dẫn như hợp đồng-bằng-quan-sát, và không được mô tả là đã xanh ở bất kỳ đâu trong PR:

- `packages/coding-agent/test/extension-context-project-trust.test.ts` — CÓ SẴN. Hiện khẳng định `runner.createContext().isProjectTrusted()` là `true`. Nếu câu trả lời thứ ba của ADR là "giá trị thật", test này chuyển đỏ và **phải được viết lại trong cùng thay đổi**. Hiện không chạy được (xem mục Xác minh).
- `packages/coding-agent/test/issue-7955-extension-project-trusted.test.ts` — CÓ SẴN. Test hồi quy cho issue #7955: khẳng định `ctx.isProjectTrusted` là một hàm, trả về `true`, và command context kế thừa nó. Xử lý như trên — một hợp đồng-bằng-quan-sát ràng buộc mọi quyết định làm `isProjectTrusted()` thành giá trị thật.

### Xác minh

Đánh giá bằng review thủ công của **MỘT** maintainer. Mục này **không có** cổng build và **không có** cổng test, và plan nói đúng lý do: không gì trong cây thay đổi hành vi, nên `bun run check:ts` hoàn toàn không bị ảnh hưởng và chạy nó không chứng minh được điều gì về mục này. **Không được trình bày `bun run check:ts` làm bằng chứng cho WI-0** — đó là cách nhanh nhất để biến một mục quyết định thành mục trông như đã xong khi nó chưa.

1. Maintainer mở `docs/extension-trust-model.md` và trả lời ba câu hỏi chấp nhận từ phần chữ, không hỏi tác giả. Bất kỳ câu nào không trả lời được là mục này thất bại.
2. `git add -N docs/extension-trust-model.md && git diff --stat` cho thấy **đúng ba file** và dòng tổng kết phải là `3 files changed`. `git add -N` là **bắt buộc, không phải tuỳ chọn**: bước 8 cấm commit nên file ADR luôn untracked, mà `git diff` (không kèm `HEAD`, không kèm `--cached`) **không thấy file untracked** — nên lệnh sẽ tối đa ra hai path và điều kiện này không bao giờ xanh: `docs/extension-trust-model.md` (mới), `docs/extensions.md`, `packages/coding-agent/CHANGELOG.md`. Một diff chạm bất kỳ file `.ts` nào nghĩa là đã viết code, điều mà plan cấm: `Cấm bắt đầu bằng code trước khi quyết định được viết.`
3. `git diff packages/coding-agent/CHANGELOG.md` cho thấy dòng mới nằm dưới `## [Unreleased]` và dòng 1057 (mục #7955 đã phát hành dưới `## [18.1.16]`) không bị đụng tới.
4. `grep -nE 'ctx\.exec.{0,40}(nằm (trong|ngoài)|cố ý|gate|cổng chặn)|(Trong|Ngoài).{0,40}cổng chặn' docs/extension-trust-model.md` trả về một kết quả khớp — câu trả lời M2-OQ5 có mặt và grep được bởi người review. **KHÔNG dùng** `grep 'ctx.exec\|ExecOptions'`: bước 3 bắt tác giả dán chính chữ ký `options?: ExecOptions` khi mô tả sự thật, nên lệnh đó xanh dù M2-OQ5 hoàn toàn chưa được trả lời — đúng cái thất bại thứ hai mà mục "Cách sai dễ nhất" tự cảnh báo.
5. ADR có một bảng enforcement, và **cả hai** lệnh dưới đều phải khớp. Lệnh đầu trả về hàng tiêu đề mang nhãn OWNER/CHỦ **và** DATE/NGÀY trong cùng một hàng — đó là chỗ "một CHỦ và một NGÀY" được ghi ra. Lệnh sau phải in **ít nhất một hàng dữ liệu** sau khi đã lọc hàng tiêu đề và hàng kẻ ngang: nó chỉ in dòng nào có ô thứ hai và ô thứ ba đều KHÔNG rỗng, tức là hàng mang chủ và hạn thật. **KHÔNG dùng** `grep -iE 'owner|due|target'`: `target` xuất hiện trong bất kỳ threat model nào và `owner` là chuỗi con của `ownership`, nên lệnh đó xanh dù cột OWNER còn trống — và lệnh đó còn kiểm đúng chiều ngược với cổng, vì nó được mô tả là kiểm hạng mục "chưa có chủ" trong khi cổng đòi hạng mục CÓ chủ.

```bash
# 2 — đúng ba file, không file .ts nào
git add -N docs/extension-trust-model.md && git diff --stat

# 3 — dòng mới nằm dước [Unreleased]; dòng 1057 bất biến
git diff packages/coding-agent/CHANGELOG.md

# 4 — câu trả lời M2-OQ5 về ctx.exec phải có mặt và grep được.
# KHÔNG dùng 'ctx.exec\|ExecOptions': chữ ký options?: ExecOptions luôn khớp, kể cả khi câu hỏi chưa được trả lời.
grep -nE 'ctx\.exec.{0,40}(nằm (trong|ngoài)|cố ý|gate|cổng chặn)|(Trong|Ngoài).{0,40}cổng chặn' docs/extension-trust-model.md

# 5 — hạng mục thực thi phải mang tên, chủ và hạn. Bám nhãn cột và ô có giá trị,
# KHÔNG bám từ khoá rời: 'target' và 'ownership' làm lệnh cũ xanh dù OWNER còn trống.
grep -nE '^[[:space:]]*\|[^|]*\|[[:space:]]*[^|]*(OWNER|CHỦ|DECIDER)[^|]*\|[[:space:]]*[^|]*(DATE|NGÀY)' docs/extension-trust-model.md
grep -nE '^\|[[:space:]]*[^|[:space:]][^|]*\|[[:space:]]*[^|[:space:]][^|]*\|[[:space:]]*[^|[:space:]]' docs/extension-trust-model.md | grep -vE 'OWNER|CHỦ|DATE|NGÀY|---'
```

**Cảnh báo môi trường, đã kiểm chứng tận tay:** `bun test` bị chặn **một phần**, không phải toàn cục. Chặn là **CHỌN LỌC theo bề mặt import, không phải toàn cục** — đo tại HEAD `106eb3e`, 2026-09-28, trong khi addon của `packages/natives` CHƯA build: `packages/omptype` **1.191 test / 0 fail** và `packages/utils` chạy được. Chỉ những file import `pi_natives` mới đỏ. Phép đo theo package: `omptype` 1139/0 · `utils` 658/17 · `catalog` 141/104 · `stats` 43/19 · `mnemopi` 146/53 · `agent` 4/46 · `ai` 73/450 · `tui` 149/205 · `coding-agent` 913/1445. Chạy `bun test test/extension-context-project-trust.test.ts` từ `packages/coding-agent` báo `'0 pass, 1 fail, 1 error'` với `'Failed to load pi_natives native addon for darwin-arm64'` — binary addon `packages/natives/native/pi_natives.darwin-arm64.node` không tồn tại. Điều này không đổi WI-0 (mục này không viết test), nhưng nó nghĩa là hai test tin cậy có sẵn chỉ được trích dẫn như hợp đồng-bằng-QUAN-SÁT và không được mô tả là đã xanh ở bất kỳ đâu. Hãy build addon trước bất kỳ mục nào sau đó cần một lần chạy test thật:

```bash
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
```

### Cổng hoàn thành

DONE nghĩa là cả năm điều sau cùng đúng. (1) `docs/extension-trust-model.md` tồn tại trong cây và nêu một decider cùng một ngày. (2) **MỘT** maintainer đọc nó và trả lời được ba câu hỏi chấp nhận từ phần chữ, không hỏi tác giả: extension phạm vi project tải vô điều kiện, bị chặn, hay không tải; `ctx.exec` bị chặn riêng hay cố ý nằm ngoài; `isProjectTrusted()` thành giá trị thật hay ở lại làm stub trả về `true`. (3) Quyết định của ADR là đúng một trong ba chữ A, B hoặc C, và câu trả lời của nó về `ctx.exec` hiện diện dưới dạng một câu trích dẫn được — một sự trì hoãn được định phạm là "không, chúng ta không có thế bài nào" KHÔNG phải một trong ba phương án và thất bại. (4) `git add -N docs/extension-trust-model.md && git diff --stat` chạm đúng ba file và KHÔNG file TypeScript nào. (5) Hạng mục thực thi mang một TÊN, một CHỦ và một NGÀY, và ADR nêu đường dẫn plugin phạm vi project đã-giao-hàng là một đầu vào mà quyết định buộc phải cân nhắc. Cổng này **THẤT BẠI** nếu: không có file ADR nào trong cây; ADR không trả lời câu hỏi `ctx.exec`; quyết định không phải một trong ba phương án dạng chữ; bất kỳ file `.ts` nào xuất hiện trong diff; hoặc hạng mục thực thi vẫn chưa được gán khi đóng M2.

**Cổng này CÓ thực sự đỏ được, và vì sao.** Đỏ được — `gate_can_fail: true` — vì năm điều kiện trên đều là kiểm chữ và kiểm cây, không cái nào cần chạy build: một file vắng mặt, một quyết định không nằm trong ba chữ A/B/C, một câu trả lời `ctx.exec` không grep ra được, một file `.ts` lọt vào diff, hay một hạng mục thực thi còn trống OWNER đều là đỏ — nhưng cái nào đỏ bằng máy và cái nào chỉ đỏ khi có người đọc thì đoạn dưới nói rõ. Nhưng cần nói thẳng độ nghiêm ngặt thực tế: cổng này gần như **không tự bảo vệ**. Nó chỉ đỏ khi có người chủ động mở ADR ra và đọc, và ở một mục mà bản thân người viết là người duy nhất biết mình đã trả lời ba câu hỏi đó thế nào, xác suất tự phát hiện là thấp. **Hai** trong năm điều kiện có thể kiểm bằng máy — (4) `git add -N … && git diff --stat` và (5) hai lệnh `grep` bám nhãn cột — và cả hai đều yếu hơn vẻ ngoài: lệnh `grep` cũ bám tên symbol (`ctx.exec`, `ExecOptions`) nên xanh dù M2-OQ5 bỏ ngang, và lệnh bám từ khoá rời (`owner|due|target`) xanh dù cột OWNER còn trống. Ba điều kiện còn lại — (1) file ADR tồn tại và nêu decider cùng ngày, (2) một maintainer bên ngoài trả lời được ba câu hỏi mà không hỏi tác giả, và (3) quyết định là đúng một trong ba chữ A/B/C — KHÔNG có lệnh nào trong mục Xác minh kiểm; chúng phải đọc bằng mắt. Điều kiện (2) là điều kiện duy nhất thực sự bắt được tài liệu tốt, và nó là điều kiện duy nhất phải thuê một người khác để chạy.

### Phụ thuộc

**`depends_on`: không** — mục này không chặn gì cả.

**`blocks`:**

- **WI-10 — authoring surface chuẩn.** Bị chặn vì M2-OQ2 làm thay đổi ý nghĩa của "chuẩn" đối với một tác giả bên thứ ba; dựng một authoring surface công khai trên một thế bài tin cậy chưa viết ra là đóng băng sai hợp đồng. Wave 1 đặt WI-0 trước WI-10 nghiêm ngặt chính vì lý do này.
- **WI-7 — registry `registerMode`.** Bị chặn vì registry được dựng trên lớp capability, và việc capability có tới được từ extension hay không phụ thuộc vào câu trả lời tin cậy.
- **WI-11 — lưu trữ trạng thái theo từng extension.** Bị chặn vì một kho theo từng extension phải biết mức tin cậy theo từng extension là gì trước khi lưu bất cứ thứ gì được khoá theo mức đó.
- **WI-12 — kiến trúc đóng góp MCP.** Bị chặn vì các MCP server được extension đóng góp cần một câu trả lời ngang hàng về việc phê duyệt, mà approval parity là một hàm của thế bài tin cậy.
- **M2 acceptance item 9 (§11.3) — "Hai ADR đã merge (WI-0, WI-10)".** Milestone không thể đóng khi ADR này vắng mặt, và acceptance item đó thất bại với bất kỳ điều nào sau: (a) không có file ADR cho WI-0 trong cây; (b) ADR không trả lời `ctx.exec`; (c) câu trả lời M2-OQ2 không phải đúng chữ YES / NO / DEFERRED.
- **M2 acceptance item 12 (§11.3) — fixture `outsider-extension`**, được tải qua đường cài thật ở CẢ hai phạm vi project lẫn user, chính vì câu trả lời tin cậy này còn chưa quyết, và vì vậy phải xanh dưới bất kỳ thế bài nào mà ADR chọn.

### Cách sai dễ nhất

**Trì hoãn** — và đó là cách thất bại thoải mái mà chính sổ rủi ro của plan đã dự báo. Dấu hiệu nhận biết là một quyết định mà tác giả API đã công khai và vô hình: extension API giao hàng với `isProjectTrusted: () => true` ở hai chỗ, cộng một mục changelog đã phát hành nói rằng OMP không áp dụng cổng chặn tin cậy project nào, và chưa ai bao giờ ngồi xuống chọn điều đó. Nó ẩn cho tới khi thế bài buộc phải đổi, lúc đó nó là breaking change với mọi tác giả bên thứ ba đã xuất bản dựa trên seam đó. Cách thất bại thứ hai là một quyết định có nêu một mức tin cậy nhưng bỏ sót câu hỏi `ctx.exec`: chặn việc tải module mà để `ctx.exec` nằm ngoài, và bạn đã tạo ra một tài liệu trông có vẻ an toàn nhưng không phải. Cách thất bại thứ ba, mới được nhận diện và riêng cho cây này: viết ADR chỉ dựa trên đường `.omp/extensions` mà plan bàn, và bỏ sót việc một đường cài marketplace phạm vi project **đã giao hàng** và **đã** tải module extension vô điều kiện, với các entry project che khuất entry user. Một ADR bỏ sót đường đó là một ADR đã quyết định câu hỏi mà sản phẩm đang chạy đã trả lời bằng cách giao hàng.

### Cần người quyết

- **A, B hay C?** Đây chính là quyết định, và nó thuộc về một maintainer là người, không thuộc về đặc tả này. Không gì ở phía sau WI-0 có thể chốt lại trước khi nó được viết ra.
- **`ctx.exec` có nằm trong phạm vi cổng chặn không (M2-OQ5)?** ADR phải trả lời tường minh; "nó suy ra từ quyết định module" **không phải** là một câu trả lời.
- **ADR PHÊ CHUẨN hay LẬT NGƯỢC thế bài "không chặn" đã phát hành?** Phê chuẩn là tài liệu hóa. Lật ngược là một thay đổi hành vi người dùng thấy được, nó thay thế một mục changelog đã phát hành (`packages/coding-agent/CHANGELOG.md:1057`, dưới `## [18.1.16]`) — đó là một quyết định lớn hơn hẳn mức "S, nửa ngày" của plan gợi ý, và nó cần một mục changelog cùng link issue, không chỉ một tài liệu.
- **Ai sở hữu phần thực thi, và trước thời điểm nào?** Plan nói không milestone nào trong toàn bộ chương trình sở hữu nó, kể cả M3. ADR này phải gắn một TÊN, một CHỦ và một NGÀY. Người đó là ai, và ngày là ngày nào?
- **`docs/extension-loading.md` có cần thêm một mục trust không?** Chú thích đã giao hàng tại `types.ts:548-561` gửi người đọc tới file đó, và file đó hiện im lặng hoàn toàn về trust (`grep -i trust docs/extension-loading.md` không trả về gì) — một con trỏ treo sống, dẫn tới một tài liệu không trả lời câu hỏi mà nó được dẫn chiếu.
- **Đường cài marketplace phạm vi project (bước 2) có cần được đưa VÀO M2 thay vì để lại cho hạng mục thực thi chưa có chủ không?** Nó đã giao hàng và không có gác chặn, nên coi nó là việc tương lai là một rủi ro về lịch trình, không chỉ là rủi ro về sở hữu.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Hai chú thích doc về việc không có trust nằm ở `packages/coding-agent/src/extensibility/extensions/types.ts:462-469` và `:523-536`. | **STALE** — cả hai số dòng sai, mô tả thì đúng | Thực tế: `:487-494` (chú thích 487-493, khai báo `isProjectTrusted(): boolean;` ở 494) và `:548-561` (chú thích 548-560, khai báo ở 561). Cả hai khối đều tồn tại và đều thật sự nói về việc không có cổng chặn tin cậy, nên phần mô tả của plan là chính xác; chỉ có số dòng đã dịch chuyển. Dùng 487-494 và 548-561. |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1251` hardcode `true`. | **STALE** — lệch 13 dòng | Thực tế: `runner.ts:1264` — `isProjectTrusted: () => true,` bên trong object literal ExtensionContext mà `createContext()` trả về. Dòng 1251 nằm trong danh sách tham số của chính hàm đó, không phải trong thân. |
| `packages/coding-agent/src/session/agent-session.ts:7369` hardcode `true`. | **STALE** — lệch 37 dòng | Thực tế: `agent-session.ts:7406` — `isProjectTrusted: () => true,` trong nhánh `#createCommandContext()`. Dòng 7369 nằm trong `#tryExecuteExtensionCommand`, một method không liên quan. |
| `packages/coding-agent/src/discovery/omp-extension-roots.ts:162` là project root. | **CORRECT** — cái duy nhất trong bốn neo còn đúng | Không thay đổi. Dòng 162 là `project: path.join(ctx.cwd, ".omp"),` bên trong `function scopeDirs(ctx: LoadContext): ScopeDirs` (interface ở 155-158, hàm mở ở 160, user scope ở 163). |
| F2 / "không có cơ sở nào để khuyến nghị một extension bên thứ ba" — thế bài tin cậy chưa được định nghĩa và chưa viết, nên không có cơ sở nào để khuyến nghị một extension bên thứ ba. | **MISLEADING** — một thế bài CỐ Ý đã viết và đã phát hành, điều này làm nó CẤP BÁCH chứ không phải VẮNG MẶT | Một thế bài "không chặn" đã được ghi trong hai chú thích source đã giao hàng và nói với người dùng trong một mục changelog đã phát hành. `types.ts:548-561` nói thẳng: "OMP has no equivalent per-directory trust gate … This method exists for compatibility with that upstream surface and always returns true, truthfully reflecting that OMP already trusts project-local inputs by default — it does not narrow or widen OMP's own security model." Mục đã phát hành nói điều tương tự với người dùng. Vì vậy cách đóng khung đúng cho WI-0 là PHÊ CHUẨN-HOẶC-LẬT NGƯỢC một thế bài đã tồn tại, đã tài liệu hóa, đã phát hành — một quyết định mạnh hơn và cấp bách hơn việc soạn thảo từ số không, và mang theo một nghĩa vụ tương thích mà plan không thừa nhận. Cái thật sự vắng mặt là bất kỳ tài liệu nào mà tác giả bên thứ ba hay một người review bảo mật có thể đọc: `grep -c -iE 'isProjectTrusted\|project trust\|no trust' docs/extensions.md` trả về 0, và `docs/extension-loading.md` — file mà chú thích đã giao hàng trỏ tới — im lặng hoàn toàn về trust. |
| "Thi triển khai là M–L … nó là tiền đề bắt buộc của bất kỳ ai muốn mở marketplace" và "chưa milestone nào nhận việc thực thi này — kể cả M3, và M3 cũng không mở marketplace" — phần thực thi là tiền đề cho ai muốn mở marketplace, và không milestone nào mở. | **SAI THEO HƯỚNG LÀM TĂNG CẤP BÁCH** — đường cài marketplace phạm vi project đã giao hàng, và nó đã tải module extension vô điều kiện | Marketplace không phải chuyện giả định. `/marketplace install [--force] [--scope user|project] name@marketplace` đã tồn tại (`docs/marketplace.md:51`) và `--scope project` ghi vào `.omp/plugins/installed_plugins.json` của PROJECT GẦN NHẤT (`docs/marketplace.md:20-23`). Đường dẫn registry được phân giải bởi `resolveActiveProjectRegistryPath` (`discovery/helpers.ts:1025`, thứ tự duyệt ghi ở `:1013-1021`: ancestor gần nhất chứa `.omp/`, nếu không thì `.git` gần nhất làm mốc neo). Loader sau đó dựng `projectRoots` với `scope: "project"` và `path: entry.installPath` (`helpers.ts:1271-1307`, khối chú thích "Project entries take precedence over user entries for the same plugin ID"), và `extensibility/plugins/loader.ts` liệt kê `<root>/node_modules` cho từng root (`loader.ts:93-95`, kiểu scope ở `:19`) rồi phân giải khoá manifest `omp.extensions` qua `resolvePluginPaths(plugin, "extensions")` (`loader.ts:331`, được gọi ở `:407`). Hệ quả: clone một repository chứa `.omp/plugins/installed_plugins.json` sẽ chạy các module extension của repo đó, không có prompt, và các entry project đó CHE KHUẤT chính các bản cài của người dùng. Tiền đề của plan — rằng marketplace đang đóng và có thể giữ đóng cho tới khi có cổng chặn tin cậy — đã sai rồi. Điều này không đổi phạm vi của WI-0 (vẫn là một tài liệu), nhưng nó phải là một ĐẦU VÀO cho quyết định, và nó là lập luận mạnh nhất chống lại việc trì hoãn. |
| Phương án A là "rẻ nhất, và là đường mà API được thiết kế vừa khít" — đường rẻ nhất, và là đường API được thiết kế quanh. | **ĐÚNG MỘT PHẦN** — plan đánh giá thấp chi phí | Stub đúng là đã được đặt sẵn cho A, nhưng A không phải là thay đổi một dòng ở `runner.ts:1264`. Nó đòi đổi **CẢ HAI** chỗ hiện thực (`runner.ts:1264` và `agent-session.ts:7406`), nó làm **HAI** test hiện có chuyển đỏ (`test/extension-context-project-trust.test.ts` và `test/issue-7955-extension-project-trusted.test.ts`), và nó mâu thuẫn với một mục changelog **ĐÃ PHÁT HÀNH** tại `CHANGELOG.md:1057` — khiến nó thành thay đổi hành vi người dùng thấy được, không phải một bài tập tài liệu hóa. Còn một chỗ lệch phạm vi: chú thích `types.ts:548-561` mô tả project trust là bao trùm "extensions, settings, skills, resources", rộng hơn việc tải module extension mà work item này nói về, nên A hoặc chặn nhiều hơn phạm vi quyết định của ADR, hoặc là tự mâu thuẫn. Hãy đưa chi phí đó vào ADR thay vì lặp lại chữ "rẻ nhất" của plan. |
| Xác minh là "Không build, không test" và việc chạy `bun run check:ts` "chạy nó không chứng minh gì về mục này". | **CORRECT**, kèm một bổ sung môi trường mà kỹ sư cần | Giữ nguyên thế đứng không-build — plan đúng rằng `check:ts` không bị ảnh hưởng và không chứng minh gì ở đây. Thêm sự thật để kỹ sư không phí thời gian: `bun test` hiện bị chặn hoàn toàn vì native addon chưa build. Đã kiểm chứng tận tay — `bun test test/extension-context-project-trust.test.ts` từ `packages/coding-agent` báo "0 pass, 1 fail, 1 error" với "Failed to load pi_natives native addon for darwin-arm64"; binary `packages/natives/native/pi_natives.darwin-arm64.node` vắng mặt. Vì WI-0 không viết test, điều này không đổi gì về mục, nhưng hai test tin cậy hiện có phải được trích dẫn như hợp đồng-bằng-QUAN-SÁT và không được mô tả là đã xanh. Build bằng `bun --cwd=packages/natives run build` trước bất kỳ mục nào sau đó cần một lần chạy thật. |
| Ngữ cảnh task/repo nói git HEAD là 5873776. | **STALE** — cây đã đi xa | HEAD thực tế là `808b365409fa36719c38319a041c0e612b4e702b` trên nhánh `milestone-1`. Mọi số dòng trong đặc tả này được đối chiếu lại với `808b365`, không phải `5873776`. Nếu cây lại dịch chuyển trước khi bắt tay, hãy chạy lại năm lệnh grep xác minh trong `files_touched[0].note` và trong `plan_corrections` trước khi tin các neo. |

## Cần người xác nhận

Mâu thuẫn nội tại của đặc tả, ghi ra đây thay vì tự sửa:

- **Số file trong diff: cổng chặn bốn file, danh sách câu hỏi mở nghiêng về bốn.** Cổng hoàn thành (điều kiện 4) và bước xác minh 2 yêu cầu `git add -N docs/extension-trust-model.md && git diff --stat` chạm **đúng ba file**, nhưng câu hỏi mở thứ năm hỏi có nên thêm một mục trust vào `docs/extension-loading.md` không. Nếu câu trả lời là có, diff sẽ thành bốn file và vi phạm chính cổng của mục này. Cần một quyết định rõ ràng: giữ ba file và chấp nhận con trỏ treo, hay nới cổng.
- **M2-OQ2 trong danh sách chặn.** `blocks` ghi rằng M2 acceptance item 9 thất bại nếu "câu trả lời M2-OQ2 không phải đúng chữ YES / NO / DEFERRED", trong khi `blocks` cũng nói WI-0 chặn WI-10 — và WI-10 mới là nơi M2-OQ2 được quyết định. Rõ ràng WI-0 không tự trả lời được câu đó, nên cần xác nhận đây là điều kiện của acceptance item gộp hai ADR (chấp nhận được) hay là một rò rỉ phạm vi từ WI-10 sang WI-0.


---


## WI-1. Gán timer và model-provider theo đúng extension đã tạo ra chúng, và thả chúng khi suspend

**Thay đổi gì:** Khi một extension bị vô hiệu hoá, các interval nền mà nó đã lên lịch và model provider mà nó đã đăng ký ngừng có tác dụng — và cả hai trở lại khi nó được bật lại.
**Wave:** Wave 2 — commit 1 (timers) ONLY. Commit 2 (providers + resume) thuộc Wave 4, được đặc tả ở đây nhưng MUST NOT được hiện thực trong PR của Wave 2.
**Effort:** Commit 1: XS — khoảng 20-25 dòng production đổi trên 3 file có sẵn, không file mới, không đổi public API. Commit 2: S — một field mới ~2 dòng trên interface `Extension`, một chỗ điền ~4 dòng trong một khối drain, một chèn ~6 dòng trong `reconcileExtensionSources`, cộng một file test mới. Tính cả file test: khoảng 120 dòng đổi.

**Người dùng thấy:** Tắt một extension trong phần cài đặt giờ thực sự dừng nó lại. Ngày nay một extension đã tắt mà đã lên lịch `ctx.setInterval` vẫn tiếp tục polling trên session sống mãi, và model provider tùy chỉnh của một extension đã tắt vẫn nằm trong `ModelRegistry` còn API key của nó vẫn nằm trong `authStorage` — nên một plugin mà người dùng đã tắt vẫn còn chạm tới mạng. Sau thay đổi này callback của interval ngừng gọi ngay khoảnh khắc extension bị suspend, các model của provider biến mất khỏi `/model` và key đã lưu của nó bị gỡ, và bật lại extension sẽ khôi phục cả hai. Người dùng thấy điều này qua luồng cài đặt sẵn có 'Restart omp to load newly enabled extensions': bật/tắt `extensions` / `disabledExtensions` giờ có tác dụng với công việc nền và provider, thay vì chỉ có tác dụng với commands, tools và renderers.

### File cần chạm tới

Quy tắc trích dẫn: chỉ mọi neo `file:line` xuất phát từ entry `verified: true` mới được coi là đã kiểm chứng. Entry của file test mới là `verified: false`; các neo tham chiếu tới file test khác (ví dụ `test/extensions-runner.test.ts:3956-4070`) cũng phải kiểm lại bằng lệnh thật trước khi dùng làm neo.

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/managed-timers.ts` | sửa | `readonly #timers = new Set<Timer>()` -> `readonly #timers = new Map<Timer, Extension>()`; `setInterval` và `setTimeout` nhận thêm tham số đầu `owner: Extension` và ghi lại nó; thêm `clearFor(owner: Extension)`; `clearAll()` duyệt `.keys()` thay vì duyệt trực tiếp tập. `clear(timer)` giữ nguyên ngữ nghĩa so khớp danh tính. `clearFor` phải xoá CẢ interval lẫn timeout thuộc extension đó, không chỉ interval — một one-shot đang chờ cũng là công việc nền. | có (verified: true) |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | Thêm private method `#ownTimers<T extends ExtensionContext>(ctx: T, owner: Extension): T` Object.create context và shadow `setInterval`/`setTimeout`/`clearTimer` bằng bản định tuyến owner. Áp dụng đúng bốn điểm: (1) lời gọi `createHandlerContext(...)` trong `#runHandlerWithTimeout` (~line 1405) thành `createHandlerContext(this.#ownTimers(ctx, ext), handlerSignal, ...)`; (2) trampoline file-write `const ctx = this.createContext()` (line 780) thành `this.#ownTimers(this.createContext(), ext)`; (3) trampoline file-delete, dòng line 799, y hệt; (4) `createCommandContext()` (runner.ts:1350-1352) là một **spread** — `{ ...this.createContext(), … }` — nên phải gọi `#ownTimers` TRƯỚC khi spread, đổi chữ ký thành `createCommandContext(owner: Extension)` và nối `owner` từ call site (`modes/controllers/input-controller.ts:2538`, `session/agent-session.ts:7378`). Điểm (4) là BẮT BUỘC, không tuỳ chọn: `ExtensionCommandContext extends ExtensionContext` (types.ts:572) nên slash command và shortcut có quyền gọi `ctx.setInterval`, mà spread hiện tại copy thẳng ba own property không-owner (`runner.ts:1304-1306`) vào command context. Bỏ qua nó thì timer do command/shortcut lên lịch mang owner sentinel, `clearFor` không bao giờ khớp, và timer sống mãi sau khi plugin bị tắt. Trong `setSuspendedExtensions` (~line 947-969) thêm `this.#managedTimers.clearFor(extension)` bên trong nhánh `if (suspend)`, sau `#suspendedExtensions.add(extension)`. | có (verified: true) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | COMMIT 1: KHÔNG thay đổi — chữ ký public `ExtensionContext.setInterval/setTimeout` (lines 516 và 522) phải giữ nguyên hình dạng hiện tại. COMMIT 2 ONLY: thêm `registeredProviders: Array<{ name: string; config: ProviderConfig }>` vào interface `Extension` (1802-1817). LƯU Ý API: `Extension` là type public — `src/index.ts:25` re-export barrel `src/extensibility/extensions`, và barrel đó có `export * from "./types"` — nên một field BẮT BUỘC (không phải optional) là một thay đổi type phá vỡ tương thích với code dựng `Extension` bên ngoài repo. `createExtension` (loader.ts:374, gọi từ 450 và 471) là nơi DUY NHẤT dựng object `Extension`, nên seed tại đó là đủ và `check:types` bắt được chỗ sót; nhưng bước 11 phải nêu việc này trong PR body, không chỉ nêu hành vi người dùng. | có (verified: true) |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | COMMIT 2 ONLY: gieo `registeredProviders: []` vào object literal trả về bởi `createExtension` (lines 374-390). Không thay đổi gì khác — `registerProvider` ở line 362-364 đã truyền `this.extension.path` làm sourceId. | có (verified: true) |
| `packages/coding-agent/src/sdk.ts` | sửa | COMMIT 2 ONLY, hai chỗ sửa. (a) Tại khối drain của session (lines 2487-2492, bên trong `createAgentSessionScoped` khai báo ở 1493): dựng `new Map(extensionsResult.extensions.map(e => [e.path, e]))`, và bên trong vòng lặp đăng ký sẵn có thì push `{ name, config }` vào `extensionsByPath.get(sourceId)?.registeredProviders`. (b) Trong `reconcileExtensionSources` (lines 4566-4630), ngay sau lời gọi `setSuspendedExtensions` tại 4579-4581: gọi `modelRegistry.syncExtensionSources(extensionRunner.getExtensionPaths())`, rồi duyệt `for (const extension of resumed)` gọi lại `modelRegistry.registerProvider(name, config, extension.path)` từ `extension.registeredProviders`. | có (verified: true) |
| `packages/coding-agent/src/config/model-registry.ts` | không sửa (chỉ đọc) | NO CHANGE. File này được đọc, không sửa: `syncExtensionSources` (2955-2965) và `clearSourceRegistrations` (2914-2932) là các primitive mà commit 2 tái sử dụng, còn `#runtimeProvidersBySource` / `#runtimeProviderSourceByName` (303-304) là tiền lệ đã có cho quan hệ source↔name mà retention record của WI-1 phản chiếu ở một tầng cao hơn. Nếu bạn thấy mình đang sửa file này thì call site mới sai, không phải primitive. | có (verified: true) |
| `packages/coding-agent/test/extension-suspend-teardown.test.ts` | tạo | File test mới, ba case theo `test_contract`: (1) timer chết sau suspend, có một extension thứ hai chứng minh extension bên cạnh còn sống; (2) timer sống sau resume; (3) provider biến mất sau suspend và trở lại sau resume. | **KHÔNG** — `verified: false`. File chưa tồn tại: `ls packages/coding-agent/test/ \| grep -i suspend` chỉ trả về `input-controller-suspend.test.ts` (về input controller ở interactive mode, không liên quan tới suspend extension). Không test nào trong repo hiện gọi `setSuspendedExtensions` (`grep -ln setSuspendedExtensions test/*.ts` trả về rỗng), nên case 1 và 2 thực sự chưa được che phủ. |

Ghi chú đã kiểm chứng cho từng file production:

- `managed-timers.ts`: file tồn tại, 2.9 KB, 83 dòng. `#timers` ở line 23; `clear` ở 51-55; `clearAll` ở 58-64. Câu `constructor(private readonly onError: ...)` ở line 25 ĐÃ hợp lệ dưới AGENTS.md (từ khoá `private` được phép trên constructor parameter property) — để nguyên. Lệnh import mới `import type { Extension } from "./types"` là type-only và bị xoá lúc compile; `types.ts` không import `managed-timers.ts` nên không sinh runtime cycle.
- `runner.ts`: file tồn tại, 73 KB. Số dòng đã kiểm chứng tại HEAD `808b365`, và chúng LỆCH so với plan khoảng +13: `#managedTimers` ở 518 (plan nói 507); lời gọi `clearManagedTimers()` duy nhất ở 411 (plan nói 408); `setSuspendedExtensions` trải 947-969 (plan nói 934-956); hai cổng `#suspendedExtensions.has(ext)` của trampoline ở 779 và 798 (plan nói 766 và 785); chữ ký `createContext` ở 1242 (plan nói 1229); hai arrow property `setInterval`/`setTimeout` không owner ở 1304-1305 (plan nói 1290-1291); `clearManagedTimers()` định nghĩa ở 1336-1337; `createHandlerContext` ở 230-241 (plan nói 227-239); `#runHandlerWithTimeout` khai báo ở 1375 (plan nói 1361). 12 call site của `#runHandlerWithTimeout` là 1480, 1493, 1538, 1600, 1651, 1686, 1723, 1770, 1831, 1869, 1896, 1945 — đếm 12 ĐÃ XÁC NHẬN, mỗi cái lệch +14 so với danh sách của plan. `getExtensionPaths()` ở 927-929. `#suspendedExtensions` khai báo ở 487.
- `types.ts`: COMMIT 1 MUST NOT chạm file này — đó chính là ý nghĩa của việc định tuyến owner qua chữ ký internal của `ManagedTimers` thay vì qua chữ ký public. Với commit 2: interface `Extension` ở 1802-1817, KHÔNG phải 1777-1792 như plan trích (xem đính chính #4). `path` là 1803, `resolvedPath` là 1804 — cả hai đã có sẵn, nên tương ứng resolvedPath→path mà plan yêu cầu không cần dựng. `ProviderConfig` được KHAI BÁO ngay trong file này (`export interface ProviderConfig` ở line 1589; dùng ở 1570, 1741, 1743), nên không cần import mới.
- `loader.ts`: COMMIT 1 MUST NOT chạm file này. Đã kiểm chứng: `pendingProviderRegistrations` khai báo ở line 102 và push ở 105, khớp plan chính xác; `registerProvider(name, config, sourceId)` ở line 362 với `this.runtime.registerProvider(name, config, this.extension.path)` ở line 363 — cũng chính xác. Checkpoint rollback factory ở 402-411 splice cùng mảng đó, nên một factory ném lỗi sẽ unwind các đăng ký đang chờ; đường đó không bị ảnh hưởng vì retention record chỉ được ghi ở drain, sau khi load đã thành công.
- `sdk.ts`: COMMIT 1 MUST NOT chạm file này — nếu chạm thì nửa provider đã lẫn vào PR của Wave 2. Tại HEAD các neo sdk.ts là khớp tốt nhất của plan: 1002-1004 (sync/clear trong `loadCliExtensionProviders`, khai báo ở 995) và 1006-1009 (drain một lần) là CHÍNH XÁC; 2482 và 2484 (sync/clear) là CHÍNH XÁC; 2487-2491 lệch một dòng (khối đóng ở 2492); `new ExtensionRunner(` ở 3074 là CHÍNH XÁC. Các neo reconcile lệch +6 so với plan: hàm ở 4566 (plan nói 4560), `resetCapabilities()` ở 4571 (plan nói 4565), `await Promise.all([...])` ở 4573-4576 (plan nói 4567-4570), `setSuspendedExtensions` ở 4579 (plan nói 4573). Một chi tiết cấu trúc có ý nghĩa: khối drain 2487-2492 cố ý nằm NGOÀI guard `if (!restrictToolNames)` bọc quanh 2481-2486, nên retention record vẫn được ghi kể cả trong session giới hạn tool name — giữ nguyên như vậy. `getExtensionPaths()` trả `this.extensions.map(e => e.path)`, và `setSuspendedExtensions` đã splice mảng đó về tập active, nên nó đúng là danh sách source-id active mà `syncExtensionSources` cần.
- `config/model-registry.ts`: cả ba neo của plan đều CHÍNH XÁC và còn hiện hành: 303-304, 2914, 2955. `syncExtensionSources` prune mọi entry của `#registeredProviderSources` (khai báo 271, điền ở 3009) vắng mặt khỏi danh sách active, gọi `clearSourceRegistrations` rồi xoá entry khỏi set — điều đó kéo theo việc gỡ auth key qua `#clearRuntimeProviderState` (quanh 2905-2909, `this.authStorage.keys.removeConfig(providerName)`). Đó chính là cơ chế mà case 3 của test contract quan sát.

### Các bước

1. **Viết test đỏ trước, chưa đụng source.** File: `packages/coding-agent/test/extension-suspend-teardown.test.ts`. Case 1 và 2 (timers) đi qua ĐƯỜNG EVENT: nạp hai file fixture extension, mỗi cái đăng ký một handler `session_start` gọi `ctx.setInterval`; dựng runner bằng `loadExtensions` + `new ExtensionRunner(...)` theo đúng hình dạng dùng ở `test/extensions-runner.test.ts:3956-4070`; chạy bằng `await runner.emit({ type: 'session_start' })`; rồi gọi `runner.setSuspendedExtensions(ext => ext === a)` và đẩy fake timer. Case 3 (providers) dùng lại fixture `ModelRegistry` từ `test/model-registry-runtime-cleanup.test.ts`. Xác nhận cả hai case timer đỏ vì đúng lý do (bộ đếm callback vẫn leo) trước khi viết bất kỳ bản sửa nào. Case provider (case 3) KHÔNG viết ở PR Wave 2 — nó thuộc commit 2 / Wave 4, và gate của Wave 2 là 2 passing, 0 failing (xem mục "Cổng hoàn thành").
2. **Sửa `managed-timers.ts`** (`packages/coding-agent/src/extensibility/extensions/managed-timers.ts`). Áp khối managed-timers trong `code_shape`: thêm `import type { Extension } from "./types"` (khoảng line 18, sau import logger sẵn có), đổi `#timers` thành `Map<Timer, Extension>`, thêm tham số đầu `owner: Extension` cho `setInterval` và `setTimeout` với `this.#timers.set(timer, owner)`, và thêm `clearFor(owner: Extension)` cạnh `clearAll()`. Để nguyên ngữ nghĩa `clear()` và thân `#run` / `#report`. Cập nhật câu về `clearAll` trong docblock của class để nhắc `clearFor`.
3. **Thêm method `#ownTimers` vào `runner.ts`** (`packages/coding-agent/src/extensibility/extensions/runner.ts`). Thêm private method `#ownTimers<T extends ExtensionContext>(ctx: T, owner: Extension): T`. Đặt nó ngay trước `#runHandlerWithTimeout` (~line 1375), để cơ chế và bốn call site của nó nằm cạnh nhau. Method phải dùng `Object.create(ctx)` cộng `Object.defineProperties` với `enumerable: true, configurable: true` — khớp cách `createHandlerContext` (line 236-239) định nghĩa override `ui`, để các timer bị shadow nhìn thấy được qua liệt kê thuộc tính y như những cái mà nó thay thế.
4. **Nối BỐN điểm owner, và tự đếm lại xem có đúng bốn không.** (0) Điểm thứ tư mà bản thảo ban đầu bỏ sót: `createCommandContext()` (`runner.ts:1350-1352`) làm `{ ...this.createContext(), … }` — một **spread**, nên nó copy thẳng ba own property không-owner (`setInterval`/`setTimeout`/`clearTimer` ở `runner.ts:1304-1306`) vào `ExtensionCommandContext`. Vì `ExtensionCommandContext extends ExtensionContext` (`types.ts:572`), một slash command hay shortcut **có quyền** gọi `ctx.setInterval` — và đường đó đang sống: `modes/controllers/input-controller.ts:2538` và `session/agent-session.ts:7378, 7396, 7494`. Bỏ qua điểm này thì timer do command/shortcut lên lịch mang owner là sentinel `UNOWNED_TIMERS`, `clearFor(extension)` quét Map thấy `timerOwner !== owner` nên bỏ qua, và timer sống mãi sau khi plugin bị tắt. Sửa bằng cách gọi `#ownTimers` trong `createCommandContext` **trước** khi spread. (1) ở ~line 1405, đổi `createHandlerContext(ctx, handlerSignal, event.type === 'tool_call' ? budget : undefined)` để truyền `this.#ownTimers(ctx, ext)` làm đối số đầu. (2) ở line 780 (trampoline file-write) đổi `const ctx = this.createContext();` thành `const ctx = this.#ownTimers(this.createContext(), ext);`. (3) ở line 799 (trampoline file-delete), đổi y hệt. Sau đó chạy `grep -c 'this.#ownTimers(' packages/coding-agent/src/extensibility/extensions/runner.ts` — nó phải in ra **4**: `grep -c` đếm SỐ DÒNG khớp, định nghĩa method ở bước 3 là `#ownTimers<T extends ExtensionContext>(...)` nên KHÔNG có tiền tố `this.` và không được đếm, còn lại đúng bốn call site. Đối chiếu bằng tay với bốn điểm — đây đúng là chỗ dễ bỏ sót mà khiến lỗi vẫn sống. (Xem mục "Cần người xác nhận" về cách đếm mâu thuẫn trong đặc tả.)
5. **Thả timer khi suspend.** Trong `setSuspendedExtensions` (~947-969), thêm `this.#managedTimers.clearFor(extension);` bên trong nhánh `if (suspend)`, giữa `this.#suspendedExtensions.add(extension)` và `suspended.push(extension)`. KHÔNG thêm gì vào nhánh `else` (resume). Mở rộng docblock của method bằng một câu nói rằng một extension bị suspend còn mất luôn việc qua `ctx.setInterval` / `ctx.setTimeout`, vì đó là hành vi người gọi giờ quan sát được.
6. **Cập nhật hai call site `ManagedTimers` bên trong `createContext`** (`packages/coding-agent/src/extensibility/extensions/runner.ts`, lines 1304-1305) — chúng không còn type-check vì `setInterval` đã có tham số đầu `owner`. Hai chỗ này PHẢI tiếp tục không có owner (chúng dựng prototype context dùng chung); cách sửa tối thiểu là truyền sentinel scope của chính context. Nếu TypeScript bắt buộc một giá trị thật, câu trả lời đúng là sentinel `const UNOWNED_TIMERS: Extension = ...` ở cấp module mà `clearFor` không bao giờ khớp, TUYỆT ĐỐI KHÔNG phải một extension thật — vì ở thời điểm đó chưa biết extension nào. Kiểm bốn case 'managed timers' có sẵn ở `test/extensions-runner.test.ts:3956-4070` vẫn pass: CẢ BỐN case đều gọi trực tiếp `runner.createContext()` không owner (dòng 3970, 4002, 4025, 4052) và phải tiếp tục chạy được. (Neo test chưa được đánh dấu verified.)
7. **DỪNG TẠI ĐÂY. Đây là hết PR của Wave 2.** Kiểm bằng `cd packages/coding-agent && bun run check:types` (baseline 0 lỗi, exit 0) và `bun --cwd=packages/natives run build && cd packages/coding-agent && bun test test/extension-suspend-teardown.test.ts test/extensions-runner.test.ts test/model-registry-runtime-cleanup.test.ts` (0 failure). Case provider chưa được viết ở Wave 2 và cũng không được hiện thực trong PR này — nó thuộc commit 2 / Wave 4, nơi bar mới là 3 passing, 0 failing.
8. **COMMIT 2 / WAVE 4 ONLY.** Thêm `registeredProviders: Array<{ name: string; config: ProviderConfig }>` vào interface `Extension` (`types.ts:1802-1817`) kèm docblock trong `code_shape`, và gieo `registeredProviders: []` trong `createExtension` ở `loader.ts` (374-390). Sửa cả hai hoặc không sửa cái nào — thiếu seed sẽ làm vòng drain ném lỗi ở `undefined.push`.
9. **COMMIT 2 / WAVE 4 ONLY.** Tại drain của session (`sdk.ts:2487-2492`), dựng map `extensionsByPath` và push `{ name, config }` vào extension khớp bên trong vòng lặp đăng ký sẵn có. Để nguyên drain `sdk.ts:1006-1009` (`loadCliExtensionProviders`) và drain `cli/models-cli.ts:359-362` — nói rõ trong PR body thay vì âm thầm bỏ qua, vì cả hai là chủ ý, không phải sơ suất.
10. **COMMIT 2 / WAVE 4 ONLY.** Trong `reconcileExtensionSources`, chèn cặp prune-rồi-đăng-ký-lại ngay sau lời gọi `setSuspendedExtensions` tại 4579-4581. Thứ tự có tính tải trọng: `syncExtensionSources` trước (nó prune mọi source đã đăng ký mà vắng khỏi danh sách), rồi mới vòng đăng ký lại khi resume. Đảo thứ tự sẽ thêm lại một source rồi lập tức bị sync kế tiếp loại bỏ. Chú thích lời gọi bằng lý do `extension.path` là khoá đúng còn `resolvedPath` thì không.
11. **COMMIT 2 / WAVE 4 ONLY.** Thêm mục changelog dưới `## [Unreleased]` trong `packages/coding-agent/CHANGELOG.md`, một dòng, hướng tới người dùng: tắt một extension giờ dừng các timer nền của nó và gỡ model provider của nó, và bật lại sẽ khôi phục. Không có issue link nào khả dụng (điều này bắt nguồn từ upgrade plan, không phải issue đã filed), nên để trống attribution thay vì bịa một số.

### Hình dạng code

```typescript
// ---------------------------------------------------------------------------
// COMMIT 1 — managed-timers.ts. `#timers` becomes Map<Timer, Extension> so a
// timer remembers WHO scheduled it. `clearAll()` stays for session teardown.
// The import is `import type` so it is erased at compile time and cannot form a
// runtime cycle with types.ts (types.ts never imports managed-timers.ts).
// ---------------------------------------------------------------------------
import type { Extension } from "./types";

export class ManagedTimers {
	#timers = new Map<Timer, Extension>();

	constructor(private readonly onError: ManagedTimerErrorHandler) {}

	setInterval(owner: Extension, callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer {
		const timer = setInterval(() => this.#run("interval", callback, args), ms, ...args);
		timer.unref?.();
		this.#timers.set(timer, owner);
		return timer;
	}

	setTimeout(owner: Extension, callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): Timer {
		const timer = setTimeout(
			() => {
				this.#timers.delete(timer);
				this.#run("timeout", callback, args);
			},
			ms,
			...args,
		);
		timer.unref?.();
		this.#timers.set(timer, owner);
		return timer;
	}

	/** Clear one managed timer. Accepts an interval or timeout handle. */
	clear(timer: Timer): void {
		if (!this.#timers.delete(timer)) return;
		clearInterval(timer);
		clearTimeout(timer);
	}

	/**
	 * Clear every timer one extension scheduled, leaving every other extension's
	 * timers running. Called when an extension is suspended: a disabled extension
	 * must stop doing background work, but its neighbours must not.
	 */
	clearFor(owner: Extension): void {
		// Deleting the current entry mid-iteration is defined for Map.
		for (const [timer, timerOwner] of this.#timers) {
			if (timerOwner !== owner) continue;
			clearInterval(timer);
			clearTimeout(timer);
			this.#timers.delete(timer);
		}
	}

	/** Clear every outstanding managed timer. Called on session teardown. */
	clearAll(): void {
		for (const timer of this.#timers.keys()) {
			clearInterval(timer);
			clearTimeout(timer);
		}
		this.#timers.clear();
	}
	// #run / #report unchanged
}

// ---------------------------------------------------------------------------
// COMMIT 1 — runner.ts. ONE new private method is the whole mechanism; there is
// no DisposableList, no effect() helper, no disposer registry. Object.create
// shadowing is what makes this work: createContext() returns a plain object
// literal whose OWN setInterval/setTimeout/clearTimer properties are the
// ownerless versions (runner.ts:1304-1306), and createHandlerContext
// (runner.ts:230-241) is already Object.create(ctx) — so that literal becomes
// the handler context's prototype and the ownerless versions are inherited
// unless we shadow them on the handler context's own object.
// ---------------------------------------------------------------------------

	/**
	 * Bind a context to the extension whose handler is about to run, so every
	 * timer it schedules through `ctx.setInterval` / `ctx.setTimeout` records an
	 * owner and can be released the moment that extension is suspended.
	 *
	 * This is the ONLY place owner is attached, and it is a method (not a
	 * `createContext()` parameter) because 12 of the 15 `createContext()` call
	 * sites feed ONE shared per-event context into `#runHandlerWithTimeout` — an
	 * owner threaded through there would be `undefined` for all of them. The 15
	 * split as 2 file trampolines (780, 799) + 1 `createCommandContext` spread
	 * (1352) + these 12.
	 */
	#ownTimers<T extends ExtensionContext>(ctx: T, owner: Extension): T {
		const scoped: T = Object.create(ctx);
		Object.defineProperties(scoped, {
			setInterval: {
				value: (callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) =>
					this.#managedTimers.setInterval(owner, callback, ms, ...args),
				enumerable: true,
				configurable: true,
			},
			setTimeout: {
				value: (callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) =>
					this.#managedTimers.setTimeout(owner, callback, ms, ...args),
				enumerable: true,
				configurable: true,
			},
			clearTimer: {
				value: (timer: Timer) => this.#managedTimers.clear(timer),
				enumerable: true,
				configurable: true,
			},
		});
		return scoped;
	}

	// OWNER POINT 1 of 4 — runner.ts:1375 `#runHandlerWithTimeout` already
	// receives `ext` as its 4th parameter. Hand it the owned context instead of
	// the raw one; createHandlerContext then layers `ui` on top of the owned
	// object, so the owner shadow survives the second Object.create.
	//
	//   BEFORE (runner.ts:1405-1408)
	//     const handlerContext = createHandlerContext(
	//         ctx, handlerSignal,
	//         event.type === "tool_call" ? budget : undefined,
	//     );
	//   AFTER
	//     const handlerContext = createHandlerContext(
	//         this.#ownTimers(ctx, ext),
	//         handlerSignal,
	//         event.type === "tool_call" ? budget : undefined,
	//     );

	// OWNER POINTS 2 and 3 of 4 — the two file-fallback trampolines. These call
	// the handler DIRECTLY (runner.ts:781 and :800), never through
	// #runHandlerWithTimeout, and they already close over `ext`. Same one-liner:
	//
	//   BEFORE (runner.ts:780)   const ctx = this.createContext();
	//   AFTER                   const ctx = this.#ownTimers(this.createContext(), ext);
	//   BEFORE (runner.ts:799)   const ctx = this.createContext();
	//   AFTER                   const ctx = this.#ownTimers(this.createContext(), ext);
	//
	// These two are NOT redundant with owner point 1: they are the only handlers
	// that bypass #runHandlerWithTimeout.

	// OWNER POINT 4 of 4 — runner.ts:1350-1352 `createCommandContext`. This one is
	// a SPREAD, so #ownTimers must run BEFORE the spread; the owner is whichever
	// extension registered the command / shortcut, threaded in by the caller.
	//
	//   BEFORE (runner.ts:1350-1352)
	//     createCommandContext(): ExtensionCommandContext {
	//       return { ...this.createContext(), /* ... */ };
	//   AFTER
	//     createCommandContext(owner: Extension): ExtensionCommandContext {
	//       return { ...this.#ownTimers(this.createContext(), owner), /* ... */ };
	//
	// Call sites to thread `owner` from: modes/controllers/input-controller.ts:2538
	// (the shortcut's own registration) and session/agent-session.ts:7378 / :7396
	// (the command's own registration). Object.create shadowing cannot compose with
	// a spread on its own — wrap FIRST, spread second.

	// Release on suspend — runner.ts:947-969 `setSuspendedExtensions`, the
	// `if (suspend)` branch. `clearFor` is scoped to this one extension, so a
	// sibling extension's timers keep firing.
	//
	//     if (suspend) {
	//         this.#suspendedExtensions.add(extension);
	//         this.#managedTimers.clearFor(extension);
	//         suspended.push(extension);
	//     }
	//
	// Do NOT add a clearFor call to the `else` (resume) branch. A resumed
	// extension's timers were already destroyed; see open_questions #1.

// ---------------------------------------------------------------------------
// COMMIT 1 — types.ts. NO CHANGE. `ExtensionContext.setInterval/setTimeout`
// (types.ts:516 and :522) are the extension-facing public API and keep their
// current `(callback, ms?, ...args)` shape; only the INTERNAL ManagedTimers
// signature gains the leading owner. If you find yourself wanting to change
// types.ts here, you have changed a public API that extensions already call.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// COMMIT 2 — types.ts:1802-1817. The retention record lives on `Extension`,
// NOT on `ExtensionRuntime`: ExtensionRuntime is ONE instance per session
// (loader.ts:101), so a per-extension map hung off it is precisely the
// shared-state-without-an-owner defect this work item exists to fix.
// ---------------------------------------------------------------------------
export interface Extension {
	path: string;
	resolvedPath: string;
	// ... existing fields, unchanged ...
	/**
	 * Providers this extension registered, retained for the life of the
	 * extension. `runtime.pendingProviderRegistrations` is destructively drained
	 * (all three consumers reassign `[]`), so a resume cannot re-read it — this is
	 * the only record that survives a suspend/resume cycle.
	 */
	registeredProviders: Array<{ name: string; config: ProviderConfig }>;
}

// loader.ts:374-390 `createExtension` must seed the new field:
//     registeredProviders: [],
// A missing seed means `undefined.push(...)` throws inside the drain loop.

// ---------------------------------------------------------------------------
// COMMIT 2 — sdk.ts:2487-2492, the SESSION drain inside
// createAgentSessionScoped (declared at sdk.ts:1493). This is the only drain
// that matters, because the Extension objects it drains into are the same
// objects handed to `new ExtensionRunner(extensionsResult.extensions, ...)` at
// sdk.ts:3074 — i.e. the same objects setSuspendedExtensions hands back to the
// reconcile loop. Do NOT replicate this in the other two drains:
//   sdk.ts:1006-1009  loadCliExtensionProviders — one-shot CLI commands only,
//                     never reached from createAgentSessionScoped. Filling the
//                     record here leaves it empty in every interactive session.
//   cli/models-cli.ts:359-362 — `omp models`, a one-shot command with no
//                     suspend/resume cycle. Out of scope, say so in the PR body.
// ---------------------------------------------------------------------------
	if (extensionsResult.runtime.pendingProviderRegistrations.length > 0) {
		// One pass over the drained queue: register into the registry AND retain for
		// a later resume. `sourceId` IS `extension.path` — loader.ts:363 passes
		// `this.extension.path` down to `runtime.registerProvider` — so the lookup
		// is exact and needs no resolvedPath->path normalisation.
		const extensionsByPath = new Map(extensionsResult.extensions.map(extension => [extension.path, extension]));
		for (const { name, config, sourceId } of extensionsResult.runtime.pendingProviderRegistrations) {
			modelRegistry.registerProvider(name, config, sourceId);
			extensionsByPath.get(sourceId)?.registeredProviders.push({ name, config });
		}
		extensionsResult.runtime.pendingProviderRegistrations = [];
	}

// ---------------------------------------------------------------------------
// COMMIT 2 — sdk.ts:4566-4630 `reconcileExtensionSources`. The insertion goes
// AFTER the `await Promise.all([...])` at :4573-4576 and AFTER the
// `setSuspendedExtensions` call at :4579, for three reasons:
//   (1) it is a synchronous prune + re-register; placing it after the discover
//       await keeps the reconcile loop from blocking on it,
//   (2) it must observe the post-suspend `this.extensions` splice that
//       setSuspendedExtensions performs at :966-967,
//   (3) resetCapabilities() at :4571 runs before the await and is about the
//       filesystem cache, not provider state — there is no ordering constraint
//       between them, so leave it where it is.
// PRUNE FIRST, then RE-REGISTER. The reverse order re-adds a source and then
// immediately prunes it, because syncExtensionSources drops every registered
// source not present in the active list.
// ---------------------------------------------------------------------------
		const { suspended, resumed } = extensionRunner.setSuspendedExtensions(
			extension => governed.has(extension.resolvedPath) && !enabled.has(extension.resolvedPath),
		);

		// A suspended extension must stop contributing model providers. The active
		// source ids are `extension.path` — the same key registerProvider was called
		// with (loader.ts:363) — not `resolvedPath`, which is only the key the
		// governed/enabled sets above are built in.
		modelRegistry.syncExtensionSources(extensionRunner.getExtensionPaths());
		// Resume cannot re-read pendingProviderRegistrations: it is destructively
		// drained at :2491. The retained per-extension record is the only source.
		for (const extension of resumed) {
			for (const { name, config } of extension.registeredProviders) {
				modelRegistry.registerProvider(name, config, extension.path);
			}
		}

// `getExtensionPaths()` (runner.ts:927-929) is `this.extensions.map(e => e.path)`,
// and setSuspendedExtensions has already spliced this.extensions down to the
// active set — so it is exactly the active source id list syncExtensionSources
// needs. No new runner method is required.
```

### Hợp đồng test

Tóm tắt: Suspend một extension dừng đúng các callback mà chính extension đó đã lên lịch và đúng provider mà nó đã đăng ký — không hơn, không kém — và resume khôi phục cả hai. Nửa "không hơn" được khẳng định bằng hai extension để bắt được lỗi owner gắn nhầm từ context dùng chung; nửa "không kém" được khẳng định bằng một extension thứ hai có timer phải tiếp tục chạy trong khi láng giềng của nó đang bị suspend.

Nếu hồi quy, người tiêu dùng thấy:

- **Với timer:** ngày nay `ctx.setInterval` của một extension đã tắt vẫn nổ suốt đời session. Không gì ném lỗi, không gì được ghi log — một plugin đã tắt âm thầm vẫn polling ổ đĩa, mạng, hay một LLM. Nếu owner bị gán sai từ `ctx` dùng chung, lỗi đó là một bug-DISABLED trông như một bản sửa: suspend extension A cũng giết luôn timer khoẻ của extension B, và B vẫn chết sau khi A được resume. Nếu timer không bao giờ được khởi động lại trên đường resume, một extension vốn polling sẽ ngừng polling vĩnh viễn sau một vòng tắt/bật.
- **Với provider:** provider tùy chỉnh của một extension đã tắt vẫn resolve được qua `ModelRegistry`, API key đã lưu vẫn nằm trong `authStorage.keys`, và `omp models` vẫn liệt kê nó — nên "tôi đã tắt plugin" không xoá được credential mà nó được cấp. Nếu thiếu resume, lỗi đối xứng còn tệ hơn: bật lại plugin không khôi phục gì cả và provider của người dùng đơn giản là biến mất mà không có lỗi nào ở đâu.

Các case cụ thể, với tên file test: `packages/coding-agent/test/extension-suspend-teardown.test.ts` (file mới, chưa tồn tại — `verified: false`).

1. **TIMER DEAD AFTER SUSPEND, and the sibling extension's timer survives** — bảo vệ hợp đồng duy nhất "tắt một extension dừng việc nền của nó, và chỉ của nó". Trên HEAD nó đỏ vì bộ đếm callback vẫn tăng sau khi suspend: `#timers` là một `Set<Timer>` (`managed-timers.ts:23`) không có owner, và `setSuspendedExtensions` (`runner.ts:947-969`) chỉ chạm vào `#suspendedExtensions` cùng mảng `extensions` — không gì tới timer. Chi tiết then chốt: handler BẮT BUỘC được đăng ký trên một event thật (`session_start`) và đi qua `runner.emit(...)`, KHÔNG đi qua các trampoline fallback ghi/xoá file. Các trampoline chỉ nổ khi agent cố biến đổi file, nên test viết theo chúng sẽ pass trên một bản hiện thực chỉ gán owner ở `runner.ts:779-780` và `:798-799` — tức là pass trên đúng cái lỗi mà nó sinh ra để bắt. Assertions: bộ đếm tick của extension A >= 1 trước khi suspend; sau `runner.setSuspendedExtensions(ext => ext === A)`, `vi.advanceTimersByTime(5000)` giữ nguyên bộ đếm của A trong khi session vẫn sống; bộ đếm của extension B TĂNG qua cùng cửa sổ đó — so sánh cùng một tick thì chưa đủ, B phải chứng minh được nó tiến triển trong khi A thì không.
2. **TIMER ALIVE AFTER RESUME** — bảo vệ việc xoá lúc suspend không biến thành "xoá vĩnh viễn". Một extension bị suspend không phải bị unload, nên ngay khoảnh khắc nó resume handler phải lên lịch được việc nền có quản lý và việc đó phải nổ. Nếu commit 1 sai (thỏa mãn gate 1 bằng cách không bao giờ lên lịch interval, hoặc bằng cách xoá ở cả nhánh resume lẫn nhánh suspend) thì bộ đếm vẫn bằng 0 sau resume. Case này pass hụt trên HEAD chưa sửa gì vì chưa có gì bị xoá. Assertions: sau `runner.setSuspendedExtensions(ext => ext === A)` với A không còn khớp, emit lại event đó sẽ chạy lại handler của A; bộ đếm do lần gọi handler THỨ HAI tạo ra tăng — đây là timer mới, không phải timer trước suspend, và test không được assert trên handle `Timer` cũ; handle trước-suspend thực sự đã mất: giữ tham chiếu tới nó rồi đẩy thời gian không hồi sinh callback cũ.
3. **PROVIDER GONE AFTER SUSPEND, and back after RESUME** — bảo vệ việc một extension đã tắt không đóng góp model provider và không giữ credential, và bật lại khôi phục cả hai. Trên HEAD nó đỏ vì `reconcileExtensionSources` (`sdk.ts:4566-4630`) chỉ gọi `resetCapabilities()` (`:4571`) và `setSuspendedExtensions()` (`:4579`). Nó không bao giờ gọi `modelRegistry.syncExtensionSources`, nên provider vẫn đăng ký và key vẫn nằm trong auth storage. Assertions: `registry.find(providerName, modelId)` defined sau khi đăng ký; sau suspend reconcile thì `registry.find(providerName, modelId)` là `undefined`; sau suspend reconcile thì `registry.authStorage.keys.source(providerName)` là `undefined` — credential bị gỡ, không chỉ overlay model; sau resume reconcile thì cả hai defined trở lại — đây là nửa đòi hỏi retention record, vì `pendingProviderRegistrations` đã bị drain phá huỷ. Chi tiết then chốt: assert trên bề mặt QUAN SÁT ĐƯỢC (`registry.find(...)`, `registry.authStorage.keys.source(...)`), đúng kiểu đã được chứng minh trong `test/model-registry-runtime-cleanup.test.ts`. KHÔNG assert `#runtimeProvidersBySource` hay field private nào khác — một assertion trên field private sẽ pass ngay cả khi `syncExtensionSources` được gọi nhưng việc đăng ký lại không bao giờ xảy ra.

Quy tắc dựng test:

- TUYỆT ĐỐI không dùng `mock.module()` — AGENTS.md cấm vì cách hiện thực của Bun rò rỉ qua các file test. Dùng `vi.spyOn` trên module object đã import, kèm `vi.restoreAllMocks()` trong `afterEach`.
- TUYỆT ĐỐI không đọc một file hiện thực rồi assert trên văn bản của nó. Gate 1 và gate 3 phải đỏ được khi source chưa đụng tới.
- Dùng `vi.useFakeTimers()` / `vi.advanceTimersByTime` trong try/finally khôi phục timer thật, khớp bốn case 'managed timers' sẵn có ở `test/extensions-runner.test.ts:3956-4070`. File đó là hình mẫu tham chiếu cho `new ExtensionRunner(extensions, new ExtensionRuntime(), cwd, sessionManager, modelRegistry)` dạng trần.
- Với case provider, dùng lại fixture từ `test/model-registry-runtime-cleanup.test.ts`: `AuthStorage.create(':memory:')` và `new ModelRegistry(authStorage, undefined, { ignoreLocalModelConfig: true })`, kèm `clearCustomApis()` và `authStorage.close()` trong `afterEach` để test an toàn khi chạy cả suite.

### Xác minh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun --cwd=packages/natives run build   # MỘT LẦN cho mỗi máy; thiếu nó thì mọi `bun test` đều báo 0 pass kèm 'Failed to load pi_natives native addon for darwin-arm64' (tái hiện tại HEAD: 0 pass, 1 fail, 1 error)
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun run check:types   # tsgo -p tsconfig.json --noEmit; baseline tại 808b365 là exit 0 với không lỗi nào, nên thanh là KHÔNG lỗi
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/extension-suspend-teardown.test.ts   # file mới; ở Wave 2 case 1 và case 2 phải là 2 passing, 0 failing, và lần chạy KHÔNG được in lỗi addon pi_natives
# File mới test/extension-suspend-teardown.test.ts ở PR Wave 2 chỉ chứa case 1 và case 2 và phải xanh hết;
# case provider KHÔNG được viết cho tới Wave 4 — bar đầy đủ 3 case chỉ thành cổng ở Wave 4.
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/model-registry-runtime-cleanup.test.ts   # không hồi quy ở primitive mà call site mới tái sử dụng
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/extensions-runner.test.ts   # bốn case 'managed timers' sẵn có ở :3956-4070 phải vẫn pass; CẢ BỐN đều gọi trực tiếp `runner.createContext()` không owner (dòng 3970, 4002, 4025, 4052), nên chúng cố tình đi trên đường context không owner
```

Kiểm tra độ hợp lý của diff:

```bash
# `git diff --stat` của commit 1 phải chạm đúng 2 file: src/extensibility/extensions/managed-timers.ts và src/extensibility/extensions/runner.ts. Nếu file thứ ba xuất hiện, đó là types.ts bị lỡ tay — bốn chỗ khác trong đặc tả nói commit 1 KHÔNG được chạm types.ts (xem mục "Cần người xác nhận"). Nếu file thứ tư xuất hiện, một abstraction mới đã lọt vào: quy tắc Central Utilities của AGENTS.md cộng lệnh cấm DisposableList / effect() của plan nghĩa là `ManagedTimers.clearFor` phải là bề mặt mới DUY NHẤT.
grep -n 'this\.createContext(' packages/coding-agent/src/extensibility/extensions/runner.ts | wc -l   # vẫn phải in ra 15. Nếu in 16, ai đó đã luồn owner qua `createContext()` — đó là thiết kế sai và 12 call site dùng chung ctx sẽ nhận `undefined`.
# diff của commit-1 KHÔNG được chạm sdk.ts. Nếu chạm, nửa provider đã lẫn vào PR Wave 2.
```

KHÔNG dùng làm cổng:

- `bun check` ở thư mục gốc repo — nó là `check:ts` + `check:rs` chạy song song và nửa Rust cần cargo toolchain trong nhiều phút. `bun run check:types` bên trong `packages/coding-agent` là cổng nhanh và đủ cho thay đổi này.
- `tsc` / `npx tsc` — bị AGENTS.md cấm; script của package là `tsgo -p tsconfig.json --noEmit`.
- Một source grep kiểu `grep -c clearFor runner.ts` — AGENTS.md cấm các test assert trên văn bản file hiện thực, và như một kiểm tra thủ công thì nó không chứng minh gì về hành vi.

### Cổng hoàn thành

Ba khẳng định. (1) và (3) đỏ trên HEAD hôm nay và xanh khi công việc này đáp; (2) pass hụt trên HEAD và chỉ thành một cổng thật khi commit 1 đã đất (xem đính chính #7 — KHÔNG báo nó là đỏ-trước / xanh-sau).

1. **TIMER DEAD AFTER SUSPEND** — một extension lên lịch `ctx.setInterval` từ một EVENT handler `session_start`, bị suspend qua `setSuspendedExtensions`, và callback của nó được quan sát là KHÔNG nổ trong khi session vẫn sống. Khẳng định nằm trên bộ đếm callback, không bao giờ trên việc một field nội bộ bị làm rỗng, vì một "bản sửa" chưa từng bắt đầu timer cũng làm rỗng field đó. Hai extension cùng lên lịch timer; suspend một thì cái kia vẫn phải nổ.
2. **TIMER ALIVE AFTER RESUME** — cùng extension đó được resume, handler chạy lại, và callback vừa được lên lịch lại nổ trở lại. Điều này chặn việc commit 1 được thỏa mãn bởi một timer chưa từng được bắt đầu.
3. **PROVIDER GONE AFTER SUSPEND** — một extension gọi `pi.registerProvider`; sau suspend reconcile thì tên provider không còn resolve qua `ModelRegistry` và `registry.authStorage.keys.source(name)` là `undefined`; sau resume thì cả hai trở lại.

Lệnh cổng cho PR Wave 2 (chỉ commit 1): `bun --cwd=packages/natives run build` một lần (`bun test` là 0-pass nếu thiếu addon), rồi `cd packages/coding-agent && bun run check:types` (0 lỗi; baseline hiện là 0 lỗi, exit 0), rồi `cd packages/coding-agent && bun test test/extension-suspend-teardown.test.ts` (case 1 và case 2: 2 passing, 0 failing, KHÔNG phải '0 pass' kèm lỗi pi_natives addon), rồi `cd packages/coding-agent && bun test test/extensions-runner.test.ts test/model-registry-runtime-cleanup.test.ts` (0 failure). Case provider KHÔNG được viết cho tới Wave 4.

Lệnh cổng cho commit 2 (Wave 4): `bun --cwd=packages/natives run build` một lần, rồi `cd packages/coding-agent && bun run check:types` (0 lỗi), rồi `cd packages/coding-agent && bun test test/extension-suspend-teardown.test.ts test/model-registry-runtime-cleanup.test.ts test/extensions-runner.test.ts` (3 passing, 0 failing — bar đầy đủ của cả ba case trong `test_contract`, KHÔNG phải '0 pass' kèm lỗi pi_natives addon).

Cổng này CÓ thực sự đỏ được: có. Vì trên HEAD `#timers` là `Set<Timer>` không owner (`managed-timers.ts:23`) và `setSuspendedExtensions` (`runner.ts:947-969`) không chạm tới timer nào, nên bộ đếm callback vẫn leo sau khi suspend và `registry.find(...)` vẫn defined sau suspend reconcile. Riêng gate (2) thì không đỏ trên HEAD — nó pass hụt vì chưa có gì bị xoá — và chỉ thành cổng thật ngay khoảnh khắc commit 1 đáp.

### Phụ thuộc

Không (không phụ thuộc work item nào khác).

Chặn những gì sau:

- WI-9 — inventory unload không thể quét các tài nguyên không có owner, nên nó cần trạng thái timer và provider capability đã được gắn nhãn.
- WI-5 commit 2-3 — tool admission và capability state được dựng trên cùng một hợp đồng trust-and-ownership.
- Cổng Wave 4 — mọi wave M2 sau đều coi suspend là đáng tin; đây là tiền đề làm cho điều đó thành hiện thực.

### Cách sai dễ nhất

Thiếu một ĐIỂM GÁN OWNER, không phải thiếu cơ chế. `createContext()` có 15 call site nhưng chỉ BỐN trong số đó có thể gọi đúng tên extension sở hữu: `#runHandlerWithTimeout` (vốn đã nhận `ext`), hai trampoline fallback đọc/ghi file (vốn đã đóng trên `ext`), và `createCommandContext` (một spread tại `runner.ts:1352`, phải gọi `#ownTimers` TRƯỚC khi spread — xem owner point 4). 12 call site còn lại dùng chung một `ctx` dựng một lần cho mỗi vòng emit (`ctx ??= this.createContext()` tại `runner.ts:1478` và `:1490`), nên truyền `ext` vào `createContext()` ở các điểm đó sẽ truyền `undefined` cho mọi extension và lỗi vẫn sống trên đường event đa-extension — đúng đường mà một timer `session_start` / `user_bash` thật đi qua. Một test chỉ assert một field đã bị xoá sẽ pass trên bản hiện thực hỏng đó.

Rủi ro thứ hai, riêng cho commit 2, là bán suspend mà không bán resume: `pendingProviderRegistrations` bị drain phá huỷ (cả ba consumer đều gán `[]` lại), nên một lời gọi lại sẽ không đăng ký gì cả, biến "một plugin đã tắt vẫn kết nối" thành tệ hơn: "tôi đã bật lại plugin và không có gì xảy ra". Đó là lý do nửa provider không thể tách khỏi nửa resume.

### Cần người quyết

Chặn việc bắt đầu commit 1 (Wave 2 PR):

- **RESUME VÀ TIMERS** — đây là quyết định thiết kế thật, và plan không trả lời. Xoá lúc suspend thì không mơ hồ. Điều xảy ra lúc resume thì có: nhánh resume của `setSuspendedExtensions` chỉ lật membership của một Set, nên việc nền của một extension vừa resume là mất cho tới khi handler của nó chạy lại. Một extension polling vì thế ngừng polling vĩnh viễn sau một vòng tắt/bật, trong im lặng. Ba lựa chọn: (a) chấp nhận và tài liệu hoá rằng extension vừa resume tự dựng lại việc nền của mình ở event kế tiếp — rẻ nhất, và là điều case 2 của đặc tả này giả định; (b) cho nhánh resume phát một event khởi động tổng hợp để handler dựng lại subscription — đúng hơn, lớn hơn, và có lẽ thuộc về công việc vòng đời của WI-7; (c) nhớ các timer đã xoá và re-arm chúng khi resume, điều này trái ngược đúng thứ đáng giá của việc xoá. Một con người phải chọn trước khi viết code. Đặc tả này viết theo phương án (a) và nêu ra thay vì giấu đi.
- **COMMIT 1 — sentinel `UNOWNED_TIMERS` ở bước 6 có chấp nhận được không, hay các helper timer của `createContext` nên ném lỗi?** Một sentinel âm thầm sinh ra timer không owner giữ nguyên hành vi hiện tại cho các caller tiền-`#ownTimers` của trampoline và cho hai test đơn vị sẵn có. Ném lỗi sẽ lộ ngay bất kỳ điểm gán owner nào bị bỏ sót trong tương lai, nhưng làm hỏng bốn test sẵn có ở `test/extensions-runner.test.ts:3956-4070` vốn dựng context trực tiếp. Đặc tả đề xuất sentinel; một con người nên phê chuẩn.

Không chặn PR của Wave 2, nhưng phải quyết trước commit 2 (Wave 4):

- **COMMIT 2 — việc đăng ký lại lúc resume có cần `refreshRuntimeProviders()` phía sau không?** Các đường lạnh ở `sdk.ts:1010`, `sdk.ts:2499` và `cli/models-cli.ts:364` đều gọi nó sau khi đăng ký, và đây là call site đăng ký duy nhất sẽ không gọi. Lập luận ngược lại là `reconcileExtensionSources` là một đường nóng của listener cài đặt và `clearSourceRegistrations` vốn đã buộc phải nạp lại static model. Đặc tả giả định KHÔNG refresh (giữ đường nóng rẻ). Xác nhận hoặc bác bỏ.
- **COMMIT 2 — bất đối xứng `restrictToolNames`.** Cặp `syncExtensionSources` / `clearSourceRegistrations` tại `sdk.ts:2481-2486` nằm bên trong `if (!restrictToolNames)`, nhưng phần điền retention record ở 2487-2492 nằm NGOÀI nó. Nên trong một session giới hạn tool name, provider vẫn được đăng ký và vẫn được ghi lại, trong khi nhánh prune chưa từng chạy. Điều này có sẵn từ trước và ngoài phạm vi, nhưng lời gọi mới trong `reconcileExtensionSources` sẽ chạy ở session giới hạn nữa, nghĩa là các session giới hạn sẽ có một prune mà trước đó chưa từng có. Xác nhận rằng điều đó là mong muốn chứ không phải bất ngờ.
- **COMMIT 2 — có nên xoá retention record nếu extension gọi `pi.unregisterProvider` không?** `ExtensionRuntime.unregisterProvider` (`loader.ts:108-111`) gỡ một entry khỏi `pendingProviderRegistrations`, mà vốn đã bị drain. Sau drain nó là no-op. Một lần resume sau đó sẽ đăng ký lại một provider mà extension đã rút lại. Có lẽ hiếm, nhưng cách sửa chỉ một dòng (lọc record khi unregister) và không rõ có đáng bề mặt hay không.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Repo state: 'git HEAD 5873776, currently on branch milestone-1'. | STALE — commit không tồn tại | HEAD là `808b365` ('docs(plan): fold the spec-verified M1 execution plan into the upgrade plan'). `git cat-file -t 5873776` trả về 'fatal: Not a valid object name'. Đúng nhánh (milestone-1). Mọi số dòng dưới đây đo trên `808b365`. Evidence: `git rev-parse --short HEAD` -> 808b365; `git cat-file -t 5873776` -> fatal; `git branch --show-current` -> milestone-1 |
| runner.ts anchors: `#managedTimers` at :507, `clearManagedTimers()` call at :408, `setSuspendedExtensions` at :934-956, `createContext` signature at :1229, trampoline gates at :766/:785, `#runHandlerWithTimeout` at :1361, `createHandlerContext` at :227-239, timer arrow props at :1290-1291. | STALE — lệch có hệ thống | Mọi neo runner.ts trong plan đều sai. Đo tại HEAD: `#managedTimers` = 518, lời gọi `clearManagedTimers()` = 411, method định nghĩa = 1336-1337, `setSuspendedExtensions` = 947-969, cổng trampoline = 779 và 798, chữ ký `createContext` = 1242, arrow property timer = 1304-1305, `#runHandlerWithTimeout` = 1375, `createHandlerContext` = 230-241, lời gọi `createHandlerContext(...)` = 1405-1408. Mức lệch không đều: +11, +3, +13, +13, +3, +14, +14, +3, +14. Đừng `sed -n '507p'` file này — hãy suy lại mọi neo bằng grep. Evidence: `grep -n '#managedTimers\|clearManagedTimers\|setSuspendedExtensions\|runHandlerWithTimeout\|createHandlerContext' packages/coding-agent/src/extensibility/extensions/runner.ts` |
| sdk.ts anchors: `reconcileExtensionSources` at 4560-4624, `resetCapabilities()` at :4565, `setSuspendedExtensions` at :4573, the discover await at :4567-4570. | STALE — lệch đều +6 | Đo tại HEAD: `const reconcileExtensionSources` = 4566, `resetCapabilities()` = 4571, `await Promise.all([...])` = 4573-4576, `const { suspended, resumed } = extensionRunner.setSuspendedExtensions(` = 4579-4581, hàm kết thúc ở 4630 (đã đo; 4631 là `cfgExtensionSources.listen(session, …)`). Cả bốn đều +6. CÁC neo sdk.ts KHÁC trong plan là chính xác: 1002-1004, 1006-1009, 2482, 2484, và 3074. Khối drain 2487-2491 chỉ lệch một dòng, ở dấu ngoặc đóng (2492). Evidence: `grep -n 'resetCapabilities()\|setSuspendedExtensions(' packages/coding-agent/src/sdk.ts` -> 4571, 4579; `sed -n '4566,4584p' packages/coding-agent/src/sdk.ts` |
| The retention record lives on the `Extension` interface at `types.ts:1777-1792`. | STALE — sai vị trí | `export interface Extension` ở `types.ts:1802-1817`, không phải 1777-1792. Claim ở dòng 1777-1779 của plan rằng `Extension` 'đã có cả path và resolvedPath' là đúng nhưng ở 1803-1804, muộn hơn 25 dòng. `types.ts:1777-1792` thực tế chứa `ExtensionCommandContextActions` và `ExtensionRuntime`. Kết luận thiết kế không đổi — record vẫn thuộc về `Extension`, không phải `ExtensionRuntime` — nhưng đừng mở 1777. Evidence: `grep -n '^export interface Extension ' packages/coding-agent/src/extensibility/extensions/types.ts` -> 1802; `sed -n '1770,1800p'` cho thấy ExtensionCommandContextActions / ExtensionRuntime |
| Two constraints on commit 1 that read as design inputs are not. | CONFIRMED TRUE — ghi lại vì đây là insight mang tải trọng | Cả hai đều đúng như đã nêu, và chúng là lý do work item này không phải một dòng đơn. (a) `createContext()` có đúng 15 call site — `grep -n 'this\.createContext(' packages/coding-agent/src/extensibility/extensions/runner.ts \| wc -l` -> 15 — trong đó 2 (lines 780, 799) là trampoline fallback đọc/ghi file gọi handler trực tiếp, 1 (line 1352) là spread trong `createCommandContext`, và 12 dùng chung một context qua mọi extension trong vòng emit (hai điểm `ctx ??= this.createContext()` tại lines 1478 và 1490, cộng mười `const ctx = this.createContext()` trong từng hàm emit riêng). Truyền `ext` vào `createContext()` sẽ truyền `undefined` ở cả 12. (b) `createHandlerContext` (230-241) là `Object.create(ctx)` chỉ override `ui`, nên các `setInterval`/`setTimeout` không owner mà `createContext()` cài ở 1304-1305 được mọi handler kế thừa. Cả hai đều đã kiểm chứng, cả hai đều quyết định. Evidence: 15 call site liệt kê tại 780, 799, 1352, 1478, 1490, 1529, 1587, 1644, 1675, 1716, 1738, 1819, 1855, 1880, 1937; #runHandlerWithTimeout được gọi từ đúng 12 điểm: 1480, 1493, 1538, 1600, 1651, 1686, 1723, 1770, 1831, 1869, 1896, 1945 |
| 'Commit 2 must join the resume record, and the two `createContext` caller shapes mean only three owner points exist' — tức là hình dạng của toàn bộ bản sửa. | CONFIRMED, kèm một điểm tinh chỉnh mà plan nói quá | Ba điểm gán owner là đúng. Điểm tinh chỉnh: plan nói đường reconcile 'hoạt động trong không gian resolvedPath, nên hai không gian phải được nối qua một mapping không dùng trực tiếp được' (và lặp lại điều đó dưới mục 'where the record lives'). Điều đó đúng cho các tập `governed`/`enabled` tại 4577-4578, nhưng KHÔNG áp cho phần provider. `setSuspendedExtensions` trả về các OBJECT `Extension`, và `Extension` mang cả `path` lẫn `resolvedPath` — nên source id chỉ là một lần đọc `.path`, và `sourceId` chính xác là `extension.path` theo cách dựng (loader.ts:363). `extensionRunner.getExtensionPaths()` (927-929) trao cả danh sách active trong đúng không gian khoá chỉ bằng một lời gọi. Không cần mapping ở bất kỳ đâu trong nửa provider, và dựng một cái sẽ là sai. Evidence: `sed -n '4577,4582p' packages/coding-agent/src/sdk.ts` (predicate dùng `.resolvedPath`); `sed -n '362,364p' packages/coding-agent/src/extensibility/extensions/loader.ts` (sourceId CHÍNH XÁC là `this.extension.path`); `sed -n '927,929p' .../runner.ts` (`this.extensions.map(e => e.path)`) |
| Test rows 1-2 fail on HEAD; row 3 also fails on HEAD. | PARTLY WRONG — row 2 pass hụt trên HEAD | Row 1 và row 3 đúng là đỏ trên HEAD. Row 2 (TIMER ALIVE AFTER RESUME) thì KHÔNG: trên HEAD chưa sửa gì, không có gì bị xoá, nên một interval vẫn nổ xuyên suốt vòng suspend/resume và row pass vì lý do sai. Nó chỉ thành cổng thật khi commit 1 đã đất — nó chặn một bản hiện thực commit-1 thỏa mãn row 1 bằng cách không bao giờ lên lịch, hoặc bằng cách xoá ở cả nhánh resume. Vẫn nên viết nó (nó là một regression guard thật), nhưng đừng báo nó là đỏ-trước / xanh-sau. Evidence: managed-timers.ts không có khái niệm owner và setSuspendedExtensions (947-969) chỉ chạm `#suspendedExtensions` cùng mảng `extensions`; do đó mọi timer đã lên lịch vẫn chạy bất kể trạng thái suspend tại HEAD. |
| Wave split: commit 1 ships in Wave 2, commit 2 (suspend + resume together) in Wave 4. | CONFIRMED — đặc tả này chỉ chở nửa Wave 2 | Theo chính bảng wave của plan (section 6.1, line 4693) và lập luận nó nêu ở 4866-4869: nửa provider không thể chỉ ship suspend, vì `pendingProviderRegistrations` bị drain phá huỷ bởi cả ba consumer (loader.ts:102/105 khai báo và push; sdk.ts:1009, sdk.ts:2491, cli/models-cli.ts:362 mỗi cái gán lại `[]`), nên một lời gọi lại trần sẽ không đăng ký gì. Plan không ship bất kỳ bước tăng provider chỉ-suspend nào cho người dùng. Vì vậy PR của Wave 2 chỉ chứa các bước 1-7. Evidence: Plan lines 4693, 4860-4869, 4718-4720; `grep -n 'pendingProviderRegistrations' packages/coding-agent/src` -> sdk.ts:1006,1009,2487,2488,2491; cli/models-cli.ts:359,362; loader.ts:102,105 |
| Environment: `bun test` reports 0 pass because the pi_natives addon is not built. | CONFIRMED — đã tái hiện nguyên văn | Tái hiện tại HEAD: `bun test test/model-registry-runtime-cleanup.test.ts` -> '0 pass, 1 fail, 1 error' với 'Failed to load pi_natives native addon for darwin-arm64'. Cách gỡ là `bun --cwd=packages/natives run build` (package script đã kiểm chứng ở `packages/natives/package.json:32`). Riêng biệt, baseline type sạch và nên được ghi lại: `cd packages/coding-agent && bun run check:types` exit 0 với không lỗi nào tại HEAD, nên cổng là 'zero errors' thật sự, không phải 'no new errors'. Evidence: `bun test test/model-registry-runtime-cleanup.test.ts` (output ở trên); `grep -n '"build"' packages/natives/package.json` -> line 32; `bun run check:types` -> EXIT=0 |

## Cần người xác nhận

Các điểm dưới đây là mâu thuẫn nội tại của chính đặc tả. Không tự sửa — ghi lại để người đọc quyết.

- **`git diff --stat` của commit 1 phải chạm đúng 3 file, một trong số là `types.ts`** — mâu thuẫn với bốn chỗ khác trong cùng đặc tả nói commit 1 KHÔNG được chạm `types.ts`: mục file cần chạm tới ("COMMIT 1 MUST NOT TOUCH THIS FILE — that is the whole point of routing the owner through the internal ManagedTimers signature rather than the public one"), khối `code_shape` ("COMMIT 1 — types.ts. NO CHANGE"), và ghi chú `loader.ts`/`sdk.ts` theo cùng logic. Nếu commit 1 thực sự không đụng `types.ts` thì con số file phải là 2, không phải 3. Trường `effort` cũng viết "20-25 changed production lines across 3 existing files", cùng hướng với con số 3.
- **Con số mà `grep -c` ở bước 4 phải in ra.** Bước 4 chạy `grep -c 'this.#ownTimers(' packages/coding-agent/src/extensibility/extensions/runner.ts`. `grep -c` đếm SỐ DÒNG khớp: định nghĩa method ở bước 3 là `#ownTimers<T extends ExtensionContext>(...)` — KHÔNG có tiền tố `this.` nên không được đếm; chỉ bốn call site mới khớp, nên con số kỳ vọng là `4`. Nếu người viết đọc "3" (cơ chế + hai call site) thì lệnh sẽ báo fail ngay cả khi bước 4 làm đúng. (Câu mà bản nháp này trích trước đây — "and confirm it prints 3 (definition + 2 calls) plus the one inside step 1's edit" — không còn tồn tại trong tài liệu: nó đã bị sửa khỏi bước 4.)
- **`readonly` trên `#timers` không nhất quán.** `files_touched` ghi `` `readonly #timers = new Set<Timer>()` -> `readonly #timers = new Map<Timer, Extension>()` ``, còn `code_shape` viết `#timers = new Map<Timer, Extension>();` không có `readonly`. Chọn một và giữ nhất quán.
- **Đường dẫn trong `open_questions` #1 trỏ tới `WI-7`**, trong khi `blocks` của WI-1 chỉ liệt kê WI-9 và WI-5. Không mâu thuẫn logic, nhưng phụ thuộc đó không xuất hiện ở danh sách chặn — nếu WI-7 chưa được lập kế hoạch thì lựa chọn phương án (b) trong câu hỏi về resume không có chỗ đổ.


---


## WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra

**Thay đổi gì:** Extension giờ luôn được nạp theo thứ tự đường dẫn đã sắp xếp, thay vì thứ tự tuỳ ý mà hệ điều hành file tình cờ trả về; và khi hai extension đăng ký cùng một tên tool thì bên thắng vừa là một quy tắc được viết ra vừa là một chẩn đoán gọi tên cả hai bên.
**Wave:** M2 wave 2 (shippable; WI-2 tách thành 2 PR — phần sort là một thay đổi hành vi thật nên đi một mình, phần chẩn đoán đi kèm).
**Effort:** S. Hai chỗ sort, một collector private, một interface export, một đoạn doc, một file test mới, một dòng changelog. Nửa sort thì dưới một tiếng; phần test là phần chính vì fixture phải được dựng sao cho nó thật sự phân biệt được.

**Người dùng thấy:** Hai plugin đăng ký cùng một tên tool giờ luôn resolve về cùng một bên trên mọi máy, mọi lần chạy, và sau mọi lần cài lại — thay vì âm thầm đảo chiều theo bố cục thư mục. Bên thua không còn biến mất trong im lặng ở tầng API nữa: `getToolCollisionDiagnostics()` trả về từng lần trùng kèm đường dẫn của cả hai bên, và `message` tự chứa cả hai chuỗi đường dẫn. Lưu ý rõ cho người đọc changelog: WI-2 này KHÔNG gắn cảnh báo vào TUI hay log — người dùng cuối vẫn không thấy gì cho tới khi một work item sau nối seam này vào một bề mặt hiển thị. Một người dùng từng liệt kê extension theo một thứ tự cụ thể trong settings và dựa vào thứ tự đó để thắng sẽ thấy thứ tự trở thành alphabet; đó là cú lật chủ ý và sẽ được ghi rõ trong changelog.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | Sắp xếp mảng `allPaths` tích luỹ bằng comparator theo code-unit ngay trước `return allPaths;` tại dòng 660 (sau dedup, sau cả bốn nhánh discovery). | có (verified) |
| `packages/coding-agent/src/discovery/helpers.ts` | sửa | Trong `discoverLinkedExtensionModuleFiles`, thay `const entries = await readDirEntries(dir);` ở dòng 763 bằng một BẢN SAO của mảng cache, sắp xếp theo tên entry với comparator code-unit, trước `Promise.all(entries.map(...))` sẵn có ở dòng 767-768. | có (verified) |
| `packages/coding-agent/src/capability/fs.ts` | sửa theo khai báo, nhưng thực tế KHÔNG đổi — chỉ đọc để xác nhận vì sao không được chạm vào (xem "## Cần người xác nhận") | `readDirEntries` ở 37-51 trả về mảng `dirCache` cấp module THEO THAM CHIẾU tại 39-41. Ngoài việc dùng chung/có cache, nó còn có năm module consumer khác ngoài helpers.ts — `discovery/builtin.ts:48,531,582,701,743`, `discovery/cline.ts:23`, `discovery/gemini.ts:195`, `discovery/omp-extension-roots.ts:243`, `discovery/omp-plugins.ts:236` — cộng ba call site còn lại của chính nó, `discovery/helpers.ts:844,848,874`. Sort tại đây sẽ đảo thứ tự cả năm module kia. Cách sửa đúng là ở hai consumer nhạy thứ tự. | có (verified) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Thêm `interface ExtensionRegistrationDiagnostic` export ngay sau `RegisteredTool` (đóng tại dòng 1676) cùng tài liệu cho discriminant `type`. | có (verified) |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | (1) Đổi tên field private `#commandDiagnostics` thành `#registrationDiagnostics` và đổi kiểu thành `ExtensionRegistrationDiagnostic[]` (dòng 481). (2) Thêm private `#collectToolNameCollisions()`. (3) Đẩy kết quả của nó vào `#registrationDiagnostics` ở cuối `getRegisteredCommands` (reset ở 1186, push ở 1193). (4) Nới kiểu trả về của `getCommandDiagnostics()` (dòng 1206). (5) Thêm public `getToolCollisionDiagnostics()`. (6) Mở rộng doc comment trên `getRegisteredTool` (dòng 984) để nói rõ last-wins là quy tắc đã định nghĩa. | có (verified) |
| `packages/coding-agent/test/extension-load-order-determinism.test.ts` | tạo | File test mới. Dòng 1 khẳng định TÊN của bên thắng qua hai subprocess mới. Dòng 2 khẳng định một trùng tên tool được báo cáo với cả hai bên đăng ký được nêu tên. | có (verified) |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Changed`: thứ tự nạp extension giờ đã sort, nên một tên tool trùng luôn resolve về cùng extension; và có thêm một API chẩn đoán (`getToolCollisionDiagnostics()`) báo bên bị che, chưa gắn vào bất kỳ UI hay log nào. Về `### Added`: không có gì mới nhìn thấy được từ phía người dùng ngoài bản báo cáo, nên gộp vào cùng dòng Changed. | có (verified) |

Ghi chú neo đã kiểm chứng cho file đầu: `discoverExtensionPaths` nằm ở dòng 572 (neo của plan đúng); `allPaths` khai báo ở 578, `addPath` dedupe theo đường dẫn ĐÃ RESOLVE ở 585-591, `return allPaths` ở 660. Danh sách được dựng cục bộ nên sort tại chỗ an toàn — không có cache dùng chung nào bị nhiễm.

Ghi chú cho `runner.ts`: CẢ BỐN dòng mà plan nêu đều cũ khoảng 11-13 dòng: khai báo field là 481 chứ không phải 470, chỗ push là 1193 chứ không phải 1180, getter là 1206 chứ không phải 1193, `getRegisteredTool` là 984-990 chứ không phải 971-977. Đã kiểm chứng từng cái bằng grep. `#registrationDiagnostics` phải tiếp tục được reset bên trong `getRegisteredCommands` (dòng 1186) — xem phần "Cần người quyết" để biết vì sao vẫn còn một getter riêng.

Ghi chú cho `types.ts`: `export interface RegisteredTool` nằm ở 1666 — đã kiểm chứng. `RegisteredTool` mang `extensionPath: string` (dòng 1668), đó là thứ mà khẳng định về tên bên thắng đọc tới. `Extension.tools` là `Map<string, RegisteredTool<any, any>>` ở dòng 1807 — `any` có sẵn đó KHÔNG nằm trong phạm vi thay đổi này; đừng nới nó ra.

Ghi chú cho `CHANGELOG.md`: `## [Unreleased]` tồn tại ở dòng 3 và hiện đang rỗng; `## [18.3.3]` bắt đầu ở dòng 5 và là bất biến.

### Các bước

1. **loader.ts — chèn sort.** Chèn một khối comment cộng với `allPaths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));` ngay trên dòng trước `return allPaths;`. Comment phải nói: (a) vì sao — việc đăng ký là last-extension-wins, nên một thứ tự phụ thuộc hệ file là một thay đổi hành vi nhìn thấy được mà không có tín hiệu; (b) đây là comparator theo code-unit, không phải `localeCompare`, để bên thắng không phụ thuộc locale của máy chủ; (c) nó nằm sau dedup và sau mọi nhánh discovery, để cả bốn nhánh cùng đóng góp vào một thứ tự duy nhất. KHÔNG đụng vào `addPath`/`addPaths` — chúng là lớp dedupe và lọc disable, đã đúng sẵn. Neo: `packages/coding-agent/src/extensibility/extensions/loader.ts:660`.

2. **helpers.ts — sort bản sao, không sort tại chỗ.** Thay dòng đơn `const entries = await readDirEntries(dir);` bằng một câu lệnh vừa `await readDirEntries` vừa spread kết quả ra mảng mới và sort bản sao đó theo `entry.name` bằng comparator code-unit. Comment BẮT BUỘC nói rằng `readDirEntries` trả về mảng `dirCache` cấp module theo tham chiếu và rằng sort tại chỗ sẽ đảo thứ tự cache cho cả năm module discovery kia — đây là chỗ dễ sai nhất của toàn bộ thay đổi và nó im lặng. Cũng phải nói rằng một post-sort trong `discoverExtensionPaths` không thể sửa lại hàm này, vì `Promise.all` bên dưới push từ bên trong các callback nên thứ tự kết quả là thứ tự hoàn tất I/O. Neo: `packages/coding-agent/src/discovery/helpers.ts:763`.

3. **types.ts — khai báo interface chẩn đoán.** Thêm `export interface ExtensionRegistrationDiagnostic` ngay sau khi interface `RegisteredTool` đóng lại. Bốn trường: `type: string` (được tài liệu hoá là luôn giữ `"warning"` cho cả hai producer hiện tại, có mặt để một producer tương lai có thể được lọc), `message: string` (được tài liệu hoá là bắt buộc phải nêu TẤT CẢ các bên xung đột, để một consumer chỉ đọc log vẫn thấy đủ cả hai), `path: string` (bên thắng theo last-wins, hoặc bên duy nhất khi không có xung đột), và `paths: string[]` (mọi bên xung đột theo thứ tự nạp, phần tử cuối là bên thắng). Neo: `packages/coding-agent/src/extensibility/extensions/types.ts:1676`.

4. **runner.ts — thêm collector.** Thêm method private `#collectToolNameCollisions(): ExtensionRegistrationDiagnostic[]`. Duyệt `this.extensions` theo thứ tự, dựng một `Map<toolName, string[]>` các đường dẫn bên đăng ký, rồi phát một chẩn đoán cho mỗi tên có từ hai bên đăng ký trở lên. Dùng đường dẫn CUỐI CÙNG làm cả `path` lẫn bên thắng được nêu trong message. Message phải chứa mọi đường dẫn dưới dạng text. Trả về mảng. Ghi chú trong comment rằng thứ tự chèn của Map làm cho chính danh sách chẩn đoán cũng xác định, miễn là thứ tự nạp đã xác định. Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:984`.

5. **runner.ts — đổi tên field và đẩy kết quả.** Đổi kiểu field private thành `#registrationDiagnostics: ExtensionRegistrationDiagnostic[] = []` và đổi tên cả bốn chỗ tham chiếu (khai báo, reset, push, return). Ở cuối `getRegisteredCommands`, sau vòng lệnh và trước lệnh return, đẩy `...this.#collectToolNameCollisions()`. Cố ý KHÔNG thêm `logger.warn` cho trùng tool — nhánh reserved-command ở 1193-1196 chỉ log khi `!this.hasUI()`, và một cây plugin có thể sinh ra rất nhiều trùng; ghi lại mà không log giữ cho lúc khởi động yên tĩnh nhưng vẫn đưa được ra cho bất kỳ consumer nào đọc báo cáo. Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:481,1186,1193,1206`.

6. **runner.ts — nới getter và thêm getter mới.** Nới `getCommandDiagnostics()` để trả về `ExtensionRegistrationDiagnostic[]` (kiểu phần tử của mảng đổi, tên method và trường `path` không đổi). Thêm `getToolCollisionDiagnostics(): ExtensionRegistrationDiagnostic[]` trả về `this.#collectToolNameCollisions()` tính mới. Giữ doc comment trên cả hai giải thích rằng `#registrationDiagnostics` chỉ được điền sau khi `getRegisteredCommands()` đã chạy — và đó chính xác là lý do getter tool phải tính lại thay vì lọc. Thêm import cấp cao nhất của `ExtensionRegistrationDiagnostic` từ `./types` vào khối import type sẵn có — chỉ import cấp cao nhất, không import nội tuyến. Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:1206`.

7. **runner.ts — viết luật ra.** Mở rộng doc comment một dòng trên `getRegisteredTool` thành phát biểu luật: extension bind theo thứ tự `discoverExtensionPaths`, thứ tự đó được sort theo đường dẫn; khi trùng tên tool thì đăng ký của extension có đường dẫn sort CUỐI CÙNG thắng; bên đăng ký bị che vẫn được `getAllRegisteredTools()` trả về; và xung đột được báo cáo bởi `#collectToolNameCollisions` / `getToolCollisionDiagnostics`. Đây chính là câu mà WI-2 sinh ra để viết ra — thân vòng lặp duyệt ngược bản thân nó không đổi. Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:983`.

8. **Dựng fixture cho file test mới.** Cấu trúc: `TempDir.createSync("@omp-ext-order-")` trong `beforeEach`, `removeSync()` trong `afterEach`. Dựng thư mục fixture `<temp>/exts/` chứa 8 thư mục con `ext-a` .. `ext-h`, mỗi thư mục có một `index.ts` đăng ký một tool tên `dup` với một nhãn khác nhau. Thư mục fixture TUYỆT ĐỐI không được chứa `package.json` và cũng không được chứa trực tiếp `index.ts`/`index.js` — một index trực tiếp sẽ rút ngắn `resolveExtensionDirectory` thành một file đơn tại `directory-resolution.ts:109-110` và biến test thành vô nghĩa, còn một `package.json` làm nhánh manifest trở thành nguồn quyết định tại 106-107. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

9. **Kiểm tra tiền đề của fixture, trong test, trước khi chạy subprocess.** Gọi `fs.readdirSync(extsDir)` và khẳng định CẢ HAI điều kiện, cả hai đều bắt buộc: (a) thứ tự trả về KHÔNG sẵn có là đã sort (`expect(names).not.toEqual([...names].sort())`); VÀ (b) phần tử CUỐI CÙNG của thứ tự trả về KHÔNG phải `ext-h` (`expect(names.at(-1)).not.toBe("ext-h")`). Điều kiện (b) là điều kiện quyết định: `getRegisteredTool` quét NGƯỢC và trả phần tử khớp đầu tiên, nên bên thắng là phần tử CUỐI CÙNG. Nếu chỉ có (a) mà thiếu (b), thì trên một hệ file mà readdir tình cờ kết thúc bằng `ext-h`, dòng 1 vẫn xanh dù không có sort nào — cổng pass vô nghĩa, đúng thứ cả dòng này sinh ra để chặn. Đây chính là kiểm tra mà plan đã gọi tên, với một đính chính — nó phải dùng `fs.readdirSync`, KHÔNG dùng `readDirEntries`, vì nhánh thư mục được cấu hình của `discoverExtensionPaths` đi qua `resolveExtensionDirectory`, hàm này dùng `fs.readdirSync` thô tại `directory-resolution.ts:114` và không bao giờ chạm vào helper cache. Kiểm tra bằng primitive sai sẽ xác nhận một tiền đề về một đường code mà fixture không hề đi qua. Khi một trong hai điều kiện hỏng, ném một lỗi có message nêu đúng thứ tự thực tế, giá trị `.at(-1)`, và chỉ dạy kỹ sư đổi tên các thư mục con cho tới khi CẢ HAI điều kiện đều đúng — không bao giờ bỏ qua trong im lặng. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

10. **Thêm probe cho dòng 1.** Một hằng template `PROBE_SCRIPT`, nội suy với `JSON.stringify(extsDir)` và `JSON.stringify(tempDir.path())`, spawn bằng `Bun.spawn([process.execPath, "-e", script], { cwd: path.resolve(import.meta.dir, "../../../"), env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: tempDir.path() }, stdout: "pipe", stderr: "pipe" })`. `cwd` bắt buộc là repo root để các import tương đối `./packages/coding-agent/src/...` của probe resolve được (đây là thủ thuật từ `bench-auth-fallback.test.ts:284-285`). Probe: `await discoverExtensionPaths([extsDir], cwd, undefined, { ambient: false })`, rồi `await loadExtensions(paths, cwd)`, dựng `SessionManager.inMemory()` + `AuthStorage.create` + `ModelRegistry` + `ExtensionRunner` đúng y như `extensions-runner.test.ts:389-395` làm, sau đó in MỘT dòng JSON `{ winnerPath, extensionOrder }` và thoát với 0. Khẳng định exit code của probe là 0 và kèm stderr vào message lỗi. Chạy nó HAI LẦN, trong hai tiến trình tách biệt, và khẳng định CẢ HAI đều báo `winnerPath === path.join(extsDir, "ext-h", "index.ts")`. Không gọi loader hai lần trong cùng một tiến trình — `dirCache` cấp module ở `capability/fs.ts:5` và module cache ESM của Bun đều sống sót qua lần gọi thứ hai và sẽ che đúng thứ tự mà test này sinh ra để bắt. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

11. **Thêm dòng 2, trong tiến trình.** Dùng lại bộ dựng của `extensions-runner.test.ts`: một `AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"))` + `new ModelRegistry(authStorage)` trong `beforeAll` (comment bên đó ghi chi phí khoảng 100ms, nên đừng dựng lại mỗi test), `SessionManager.inMemory()` trong `beforeEach`. Viết hai extension một file vào một TempDir thứ hai, mỗi cái đăng ký một tool tên `dup`, `loadExtensions` chúng theo thứ tự tường minh, dựng runner, rồi khẳng định chẩn đoán: `type === "warning"`, `paths` có đúng hai đường dẫn extension, và `message` chứa CẢ HAI chuỗi đường dẫn dưới dạng substring. Khẳng định qua `getToolCollisionDiagnostics()` để dòng này không phụ thuộc việc `getRegisteredCommands()` đã được gọi trước hay chưa. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

12. **Thêm mục changelog.** Viết các mục dưới `## [Unreleased]`, một dòng dưới `### Changed`. Mở đầu bằng điều người dùng thấy: thứ tự nạp extension giờ xác định và một tên tool trùng resolve giống nhau ở mọi nơi, và xung đột giờ được báo cáo. Đừng kể chuyện về sort hay `Promise.all` trong changelog — chuyện đó thuộc về phần thân PR. Cụm "xung đột giờ được báo cáo" phải được viết cho đúng: một API chẩn đoán mới (`ExtensionRunner#getToolCollisionDiagnostics()`) cho biết bên nào đã bị che, kèm `message` nêu tên cả hai bên — hiện chưa có giao diện nào hiển thị nó, nên đây là seam cho SDK và fork, không phải cảnh báo trong UI. Neo: `packages/coding-agent/CHANGELOG.md:3`.

### Hình dạng code

```typescript
// ── packages/coding-agent/src/extensibility/extensions/loader.ts:659 ──────────
// Deterministic load order. `allPaths` accumulates in discovery order, which is
// raw-`readdir` order for ambient/configured scans and I/O-completion order for
// the linked-module branch — both filesystem-dependent. Registration is
// last-extension-wins (see ExtensionRunner#getRegisteredTool), so that order IS
// user-visible behavior. Sort once, here, after dedup and after all four
// discovery branches, so every branch contributes to a single stable order.
// Code-unit order, deliberately not localeCompare: the winning extension must
// not depend on the host's locale.
allPaths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
return allPaths;

// ── packages/coding-agent/src/discovery/helpers.ts:763 ──────────────────────
// `readDirEntries` hands back the module-level `dirCache` array BY REFERENCE, so
// sorting in place would reorder the cache for the five other discovery modules
// that share it (builtin, cline, gemini, omp-extension-roots, omp-plugins) —
// plus helpers.ts's own other three call sites. Copy first.
//
// This sort is load-bearing on its own: the Promise.all below pushes into shared
// arrays from inside its callbacks, so the result order is I/O-completion order,
// and the post-sort in discoverExtensionPaths cannot repair it.
const entries = [...(await readDirEntries(dir))].sort((a, b) =>
	a.name < b.name ? -1 : a.name > b.name ? 1 : 0
);

// ── packages/coding-agent/src/extensibility/extensions/types.ts (after :1676) ─
/** A registration conflict surfaced by the extension runner. */
export interface ExtensionRegistrationDiagnostic {
	/** `"warning"` for both current producers; lets a future one be filtered. */
	type: string;
	/**
	 * Human-readable text that names EVERY conflicting side, so a consumer that
	 * only reads `message` (a log line, a crash dump) still sees the full picture
	 * without having to learn the record shape.
	 */
	message: string;
	/** The winning side under last-extension-wins, or the single side when unconflicted. */
	path: string;
	/** Every conflicting side in load order. The last entry is the winner. */
	paths: string[];
}

// ── packages/coding-agent/src/extensibility/extensions/runner.ts ────────────
/**
 * Tool names resolve by last-extension-wins. Extensions bind in
 * `discoverExtensionPaths` order, which is sorted by path, so a duplicate name
 * resolves to the registrant whose path sorts last. The shadowed registration
 * remains in `getAllRegisteredTools()`. A collision used to be entirely silent,
 * so a plugin that overrode another's tool looked like it had never been
 * installed — report both sides instead.
 *
 * Pure: derived from `this.extensions` on every call, so it is correct
 * regardless of whether `getRegisteredCommands()` has run.
 */
#collectToolNameCollisions(): ExtensionRegistrationDiagnostic[] {
	const registrants = new Map<string, string[]>();
	for (const ext of this.extensions) {
		for (const name of ext.tools.keys()) {
			const seen = registrants.get(name);
			if (seen) seen.push(ext.path);
			else registrants.set(name, [ext.path]);
		}
	}

	const diagnostics: ExtensionRegistrationDiagnostic[] = [];
	// Map iteration is insertion-ordered, so with a deterministic load order the
	// diagnostic list is too.
	for (const [name, paths] of registrants) {
		if (paths.length < 2) continue;
		const winner = paths.at(-1)!;
		diagnostics.push({
			type: "warning",
			message:
				`Extension tool '${name}' is registered by ${paths.length} extensions ` +
				`(${paths.join(", ")}). Last-extension-wins: ${winner}.`,
			path: winner,
			paths,
		});
	}
	return diagnostics;
}

/** Duplicate tool names, recomputed on demand — see #collectToolNameCollisions. */
getToolCollisionDiagnostics(): ExtensionRegistrationDiagnostic[] {
	return this.#collectToolNameCollisions();
}

// inside getRegisteredCommands, after the reserved-command loop:
this.#registrationDiagnostics.push(...this.#collectToolNameCollisions());
return [...commands.values()];
```

### Hợp đồng test

Hai hợp đồng nhìn thấy được từ bên ngoài, mỗi cái có một tên hỏng.

**DÒNG 1 — "Thứ tự nạp extension được sort, nên một tên tool trùng luôn resolve về bên đăng ký có đường dẫn sort cuối cùng, xuyên qua các tiến trình mới."** Quan sát được: `ExtensionRunner#getRegisteredTool("dup")?.extensionPath`. Nếu hồi quy, người dùng có hai plugin đã cài đăng ký cùng một tên tool sẽ nhận về bên nào mà readdir tình cờ nhả ra trước — nên cùng một bản cài sẽ resolve khác nhau trên APFS so với ext4, trước và sau một lần cài lại làm đổi bố cục thư mục, và cú lật đó hoàn toàn im lặng (không log, không lỗi, plugin thua đơn giản là trông như chưa từng được cài). Vì sao khẳng định TÊN bên thắng chứ không phải một khẳng định tính nhất quán qua các lần chạy: thứ tự readdir thô là thuộc tính của THƯ MỤC chứ không phải của tiến trình, nên hai subprocess đọc cùng một thư mục fixture sẽ thấy cùng một thứ tự, có sort hay không. Một khẳng định chỉ tính nhất quán sẽ pass y hệt trên một cài đặt mà không sort gì cả — đó là lý do fixture được dựng để readdir trả về thứ tự khác thứ tự từ điển, và tiền đề ấy được kiểm chứng ngay trong test bằng `fs.readdirSync` trước khi subprocess chạy. Vì sao hai subprocess chứ không phải hai lần gọi trong cùng tiến trình: `dirCache` cấp module (`capability/fs.ts:5`) và module cache ESM của Bun đều sống sót lần gọi thứ hai và sẽ che đúng thứ tự đang bị thử. DÒNG NÀY FAIL trên HEAD và chỉ pass sau khi có sort ở loader.ts.

**DÒNG 2 — "Một tên tool trùng được báo cáo thành một chẩn đoán nêu tên cả hai bên đang đăng ký."** Quan sát được: `ExtensionRunner#getToolCollisionDiagnostics()` trả về một bản ghi mà `paths` giữ đúng hai bên đăng ký và `message` chứa cả hai chuỗi đường dẫn. Nếu hồi quy, tác giả plugin mà tool của họ bị một plugin khác âm thầm ghi đè hoàn toàn không có tín hiệu nào — lần ghi đè vô hình trên UI, trong log và trong API, và triệu chứng duy nhất là một tool chạy khác với điều source của nó nói. `message` được khẳng định là mang cả hai đường dẫn dưới dạng text, để bảo vệ cả đường consumer chỉ-đọc-log chứ không chỉ trường có cấu trúc.

Cố ý KHÔNG khẳng định: rằng mảng `allPaths` đã sort. Đó là hình dạng mảng bên trong; danh tính của bên thắng mới là hợp đồng, và khẳng định mảng sẽ để cho một người triển khai làm cho test pass bằng cách sort nhầm tầng.

Tên file test: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

### Xác minh

Bị CHẶN cho tới khi có native addon. `bun test` hiện chết ngay ở bước import: `"Failed to load pi_natives native addon for darwin-arm64"` — đo được 0 pass / 1 fail / 1 error, phạm vi theo file, không phải 0-pass toàn suite. Gỡ chặn bằng `bun --cwd=packages/natives run build`, rồi:

```bash
bun run check:ts
cd packages/coding-agent && bun test test/extension-load-order-determinism.test.ts test/extensions-discovery.test.ts
```

`bun run check:ts` đã được đo là **XANH** trên cây này ở HEAD 808b365: exit 0, 34.8 giây, không cần addon. Nhưng đó là cổng trên **TOÀN CÂY**, không phải cổng trên diff của WI-2: nó quét 5445 file, nên một file rác `.ts` untracked dưới `packages/` làm nó đỏ ngay ở bước `check:tools` (oxfmt) trong dưới một giây, chưa tới `tsgo` bao giờ. Đo được cả hai trạng thái: cây sạch → exit 0 / 34.8s; có một file rác `packages/coding-agent/src/__wi3_probe.ts` → exit 1 / 0.7s với `Format issues found in above 1 files`. Hệ quả cho người triển khai: nếu `check:ts` đỏ, đừng coi là do thay đổi của mình — kiểm tra `git status --porcelain -- packages/` trước, và chỉ chạy lại cổng khi cây sạch. Chạy lại hai file test đã nêu sau khi build; không thay bằng `tsc` (AGENTS.md).

Chứng minh cổng, chạy trước khi mở PR: (1) với bản sửa đã có, cả hai dòng pass; (2) xoá dòng `allPaths.sort(...)` tại loader.ts:659, chạy lại — dòng 1 PHẢI đỏ với bên thắng `ext-*` sai; (3) khôi phục, rồi xoá phần sort trước `map` ở helpers.ts:763, chạy lại — dòng 1 PHẢI vẫn xanh (điều này là dự kiến: chính post-sort ở loader là thứ fixture này đi qua) và `extensions-discovery.test.ts` PHẢI vẫn xanh, chứng minh hai chỗ sort không thừa và rằng chỗ sort ở linked-module không có coverage quan sát được trong fixture này — xem phần "Cần người quyết"; (4) khôi phục, xoá `#collectToolNameCollisions`, chạy lại — dòng 2 PHẢI đỏ.

### Cổng hoàn thành

Bốn phần. Ba phần đỏ được nhờ một bước hoàn tác có chủ đích; phần (1) là cổng trên toàn cây.

**(1) TYPE:** `bun run check:ts` thoát với 0. Đỏ nếu interface chẩn đoán bị export sai, thiếu import type cấp cao nhất, hoặc có một `any` lọt vào. (1) chỉ chạy được sau khi cây sạch — xem "Xác minh"; ở cây có file rác `.ts` untracked nó đỏ vì lý do không liên quan, nên đỏ ở đây không phải bằng chứng thay đổi của bạn sai.

**(2) DÒNG 1 CÓ KHẢ NĂNG PHÂN BIỆT:** khi hoàn tác bản sửa, dòng 1 báo một bên thắng KHÔNG phải `ext-h`. Đây mới là một cổng thật vì test trước hết chứng minh tiền đề của chính fixture — nó đọc thư mục fixture bằng `fs.readdirSync` (đúng primitive mà `resolveExtensionDirectory` dùng tại `directory-resolution.ts:114`) và từ chối đi tiếp nếu readdir tình cờ đã trả về thứ tự từ điển HOẶC tình cờ kết thúc bằng `ext-h`; nếu không chặn cả hai, khẳng định sẽ pass trên một cài đặt mà không sort gì cả.

**(3) DÒNG 2 CÓ KHẢ NĂNG PHÂN BIỆT:** khi `#collectToolNameCollisions` bị gỡ, dòng 2 nhận về không chẩn đoán nào và đỏ trên `paths` cũng như trên phần kiểm tra substring của message.

**(4) KHÔNG HỒI QUY (chỉ phần có tác dụng thật):** `bun test test/extensions-discovery.test.ts` vẫn xanh — nó là bảo đảm không hồi quy cho toàn bộ đường discovery. **Đã bỏ** việc dựa vào `test/extension-loader-concurrency.test.ts` làm chốt chặn cho sort ở loader: file đó chỉ import `loadExtensions` và gọi nó với mảng literal (`extension-loader-concurrency.test.ts:85,120`), không bao giờ gọi `discoverExtensionPaths`, nên nó không thể đỏ vì thay đổi này. Nó vẫn đáng chạy như một smoke test bảo vệ `loadExtensions`, nhưng đừng tính nó là cổng.

Ba phần (2), (3), (4) có bước hoàn tác cụ thể đã được đặt tên trong phần "Xác minh" (xoá `allPaths.sort(...)`, xoá sort ở helpers.ts, xoá `#collectToolNameCollisions`). Phần (1) là cổng trên TOÀN CÂY chứ không phải trên diff này, nên nó chỉ xanh khi không có file rác `.ts` untracked dưới `packages/` — xem "Xác minh"; đỏ ở đó không mặc định là do thay đổi của bạn.

### Phụ thuộc

- `depends_on`: không.
- `blocks`:
  - WI-7 (wave 5 registerMode) — tiền đề cứng. Mode registry tự tạo ra các đăng ký nhạy thứ tự của riêng nó, nên nó phải đáp xuống một thứ tự đã được định nghĩa, không phải đáp xuống thứ tự hệ file.
  - WI-6 (wave 4) — bảng wave nói WI-6 cần luật trùng của WI-2 đã chốt trước khi nó có thể an toàn đổi thứ tự ưu tiên.

### Cách sai dễ nhất

MỨC TRUNG BÌNH, và nó là một thay đổi hành vi thật chứ không phải sửa lỗi — đó chính là lý do plan tách mục này thành hai PR. Người dùng có hai plugin trùng tên hôm nay đang dựa vào một thứ tự tình cờ, và bản sửa sẽ lật ngược nó. Rủi ro thứ hai, im lặng hơn nhiều, là sort tại chỗ: `readDirEntries` trả về `fs.Dirent[]` đã cache THEO THAM CHIẾU, nên `[...entries].sort()` viết thành `entries.sort()` sẽ đột biến một cache cấp module dùng chung với năm module discovery khác và lặng lẽ đảo thứ tự kết quả của chúng nữa. Nó không sinh ra lỗi, không làm hỏng import — đây là kiểu hỏng dễ lọt tới nhất, và comment tại helpers.ts:763 là thứ duy nhất đứng giữa một kỹ sư mệt mỏi và nó.

### Cần người quyết

- Chuyển sort sau có áp dụng cho các đường dẫn được cấu hình TƯỜNG MINH không? Sắp xếp trọn `allPaths` (lựa chọn của plan, và là cái bước 1 thực hiện) nghĩa là người dùng viết `extensions: ["b-ext", "a-ext"]` trong settings và dựa vào việc b-ext thắng thì nay sẽ được a-ext. Chỉ sắp xếp phần ambient/discovered và giữ thứ tự đã cấu hình thì tôn trọng ý định hơn, nhưng làm luật khó phát biểu hơn và fixture của test sẽ phải đi qua đường ambient. Plan đã chốt theo hướng sắp xếp trọn; cần một người xác nhận trước khi mở PR, vì đây là phần duy nhất của WI-2 mà người dùng hợp lý có thể gọi là hồi quy.
- Kiểm tra tiền đề suy biến trên fixture 8-extension nên hard-fail hay skip? Hard-fail là thẳng thắn và là lựa chọn của plan, nhưng trên một hệ file mà readdir tình cờ trả về thứ tự từ điển thì dòng đó đỏ trên một nền tảng không hỏng. Bỏ qua trong im lặng sẽ tái tạo đúng cái pass vô nghĩa mà plan được viết ra để chặn. Có một lựa chọn thứ ba — khẳng định tên bên thắng vô điều kiện và chỉ ghi tiền đề vào phần text của thông báo lỗi — đánh đổi một lần đỏ hiếm để lấy một test vĩnh viễn yếu hơn trên một số nền tảng. Hãy chọn một trước khi viết test.
- Chỗ sort ở linked-module tại helpers.ts:763 không có coverage quan sát được trong fixture của WI này, vì fixture đi qua đường thư mục được cấu hình (đường mà post-sort ở loader đã sửa xong). Bước cổng (3) ở trên chứng minh hai chỗ sort không thừa nhưng không thể chứng minh chỗ sort ở helpers.ts có tác dụng gì. Lựa chọn: dựng fixture thứ hai ép nhánh linked-directory của `discoverExtensionModulePaths` (một thư mục con symlink chứa index.ts, mà native glob không đi xuống), hoặc chấp nhận rằng chỗ sort ở helpers.ts đứng trên một lập luận đọc-code và nói thẳng như vậy trong PR. Cần quyết định của người, vì fixture thứ hai chiếm phần lớn công sức test còn lại.
- `getCommandDiagnostics()` có consumer ngoài repo (SDK đã phát hành, fork downstream) không? `git grep -rn "getCommandDiagnostics" -- packages/` chỉ khớp đúng định nghĩa tại runner.ts:1206, nên KHÔNG gì trong repo này cần cập nhật — nhưng nới kiểu phần tử của nó vẫn là một thay đổi bề mặt API đã phát hành. Hãy xác nhận export công khai của SDK trước khi nới thay vì chỉ tin grep trong repo.
- Có nối `getToolCollisionDiagnostics()` vào `extension-ui-controller` (panel Extensions) hoặc vào `logger.warn` một lần ở lúc khởi động trong WI-2 không? Không nối thì phần "Người dùng thấy" của WI-2 chỉ còn đúng một nửa và câu changelog phải tự giới hạn như trên. Lưu ý khi cân: `getRegisteredCommands` có ba call site thật (get-commands-handler.ts:36, interactive-mode.ts:2051, available-commands.ts:77) và cả ba đều chỉ lấy danh sách lệnh, không đọc chẩn đoán.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Bản ghi chẩn đoán được khai báo tại runner.ts:470, đẩy tại runner.ts:1180, và `getCommandDiagnostics` ở runner.ts:1193. | stale-line-numbers | Cả bốn neo lệch 11-13 dòng. Field private nằm ở runner.ts:481, chỗ reset ở 1186, chỗ push duy nhất ở 1193, getter ở 1206. `getRegisteredTool` ở 984-990, không phải 971-977. |
| Tiền đề fixture nên được kiểm bằng cách đọc `readDirEntries` một lần trong test, vì đó là thứ quyết định thứ tự. | wrong-primitive | Kiểm bằng `fs.readdirSync` thay thế. Nhánh thư mục được cấu hình của `discoverExtensionPaths` gọi `resolveExtensionDirectory`, hàm này tự làm `fs.readdirSync` thô và không bao giờ chạm vào helper capability có cache — `readDirEntries` không nằm trên đường code mà fixture đi qua, nên kiểm bằng nó là xác nhận một tiền đề về sai hàm. Bằng chứng: `packages/coding-agent/src/extensibility/extensions/directory-resolution.ts:114` `children = fs.readdirSync(dir);` — `readDirEntries` không được import ở bất kỳ đâu trong file đó. Import duy nhất của nó trong discovery là helpers.ts:17. |
| Sắp xếp `entries` bên trong `discoverLinkedExtensionModuleFiles` trước khi map. | incomplete-missing-hazard | Chỉ dẫn đúng, nhưng nó bỏ sót cái bẫy khiến nó sai trong cách hiện thực hiển nhiên: `entries` CHÍNH LÀ mảng cache, nên `.sort()` tại chỗ sẽ đột biến cache dùng chung ở cấp module. Bước này phải chỉ rõ phải tạo bản sao. Không có điều này, thay đổi lặng lẽ đảo thứ tự kết quả cho năm module discovery khác, không lỗi, không import nào hỏng. Bằng chứng: `packages/coding-agent/src/capability/fs.ts:39-41` trả về `dirCache.get(abs) ?? []` — cùng một tham chiếu `fs.Dirent[]`, không phải bản sao. Consumer khác: discovery/builtin.ts:48,531,582,701,743; cline.ts:23; gemini.ts:195; omp-extension-roots.ts:243; omp-plugins.ts:236. |
| `getCommandDiagnostics()` trả về `Array<{ type: string; message: string; path: string }>` và cách sửa là thêm `paths: string[]` vào đó. | verified-but-underdetermined | Claim "không có consumer" là đã kiểm chứng. Nhưng plan không nói Ở ĐÂU một chẩn đoán trùng tool được tính ra, và câu trả lời là bị ép: `#commandDiagnostics` bị reset ở đầu `getRegisteredCommands` (runner.ts:1186), nên một chẩn đoán tool chỉ được đẩy vào đó sẽ vô hình với bất kỳ consumer nào chưa gọi `getRegisteredCommands()` trước. Đặc tả này giải quyết bằng một collector private thuần tuý cộng một getter riêng tính lại, để báo cáo tool không mang theo hợp đồng thứ tự ngầm nào. Bằng chứng: runner.ts:1185-1186 `getRegisteredCommands(reserved?) { this.#commandDiagnostics = [];`. `git grep -rn getCommandDiagnostics -- packages/` chỉ trả về runner.ts:1206. |
| Ngữ cảnh nhiệm vụ nói git HEAD là 5873776. | stale | HEAD là 808b365 trên nhánh milestone-1. Mọi neo dòng trong đặc tả này đã được kiểm chứng và khớp với nội dung ở 808b365. Nhưng đừng mặc định cây lúc bạn chạy cũng sạch: nhiều work item chạy song song trên cùng một cây và để lại file rác untracked, mà `bun run check:ts` quét toàn cây nên sẽ đỏ vì chúng — xem "Xác minh". Bằng chứng: `git log --oneline -1` → 808b365 docs(plan): fold the spec-verified M1 execution plan into the upgrade plan. |
| `bun test` báo 0 pass kèm lỗi native-addon. | partly-wrong | Nó báo 0 pass / 1 FAIL / 1 error trên mỗi file — file được tính là fail, không phải skip. Nhỏ thôi, nhưng nó cho kỹ sư biết lần chạy test thật sự đỏ chứ không âm thầm rỗng, đó là điều họ cần biết trước khi tưởng một lần chạy xanh. Bằng chứng: `cd packages/coding-agent && bun test test/extension-loader-concurrency.test.ts` → `0 pass / 1 fail / 1 error / Ran 1 test across 1 file`. |
| Sắp xếp `allPaths` là no-op với consumer vì không gì trong codebase phụ thuộc thứ tự hệ file tình cờ. | verified-with-caveat | Đã kiểm chứng — `loadExtensions` (loader.ts:485-487) dùng `Promise.all(paths.map(...))`, giữ nguyên thứ tự đầu vào, và `bindPreparedExtensions` duyệt theo thứ tự đó, nên thứ tự `this.extensions` đúng bằng thứ tự `allPaths`. Nhưng lưu ý: `resolveExtensionDirectory` được gọi với CONFIGURED_EXTENSION_DIRECTORY_OPTIONS, vốn KHÔNG đặt `sortChildren` (chỉ các plugin options tại `extensibility/plugins/loader.ts:290` mới đặt), nên một thư mục được cấu hình gồm các sub-extension là con đường DUY NHẤT mà post-sort ở loader thực sự gánh trọng. Đó đúng là con đường fixture test đi qua, tốt cho coverage, nhưng nghĩa là đường plugin vốn đã sort và không được gì thêm. Bằng chứng: loader.ts:485-487; loader.ts:526-533 `CONFIGURED_EXTENSION_DIRECTORY_OPTIONS` (không sortChildren) so với `extensibility/plugins/loader.ts:287-291` `PLUGIN_EXTENSION_DIRECTORY_OPTIONS` (sortChildren: true); directory-resolution.ts:119 `if (options.sortChildren) children.sort();`. |

## Cần người xác nhận

Hai chỗ đặc tả mâu thuẫn với chính nó, ghi ra đây thay vì tự sửa:

1. **Hành động của `packages/coding-agent/src/capability/fs.ts`.** Mục trong bảng "File cần chạm tới" khai báo `action: "modify"`, nhưng phần `change` của chính nó nói "KHÔNG THAY ĐỔI. Chỉ đọc để xác nhận vì sao không được chạm vào." — tức là sửa một file mà đồng thời bảo đừng sửa. Cách đọc an toàn: file này CHỈ ĐỌC, không viết; `action: "modify"` là sai. Việc thực hiện theo hướng đó không gây hại, nhưng bảng nên nói "đọc" cho chính xác.

2. **Changelog: `### Changed` hay thêm `### Added`.** Mục `files_touched` cho `packages/coding-agent/CHANGELOG.md` viết "một dòng dưới `### Added`: không có gì mới nhìn thấy được từ phía người dùng ngoài bản báo cáo, nên gộp vào cùng dòng Changed." — tức là tự nó kết luận là không có mục `### Added` và dồn vào `### Changed`. Bước 12 cũng chỉ yêu cầu một dòng dưới `### Changed`. Hai chỗ này thực chất cùng kết luận, nhưng cách viết của mục file khiến người đọc có thể tưởng còn một mục `### Added` riêng cần viết. Chốt lại: chỉ một dòng dưới `### Changed`, không có `### Added`.


---


## WI-3. Bảng relay sự kiện đầy đủ, được trình biên dịch kiểm tra

**Thay đổi gì:** Thay chuỗi `if/else` 19 nhánh chuyển tiếp sự kiện phiên sang cho extension bằng một bảng tra cứu được khai báo, tập khoá của bảng là một tập con 19 phần tử có tên, để một loại sự kiện mới không thể được thêm vào phiên mà không hoặc có một nhánh chuyển tiếp tương ứng, hoặc làm kiểm tra kiểu thất bại.

**Wave:** 3. WI-3 là 2 commit, tự ship một mình; độc lập với WI-1 và WI-2, có thể chạy song song. Mối nối duy nhất: file dùng chung `session/agent-session.ts` với M2-OQ6 (câu hỏi 46-overload → interface `Events` khai báo ở cấp module, phải quyết trước khi đụng vào cả hai), và từ khoá `export` một từ trên `extensions/runner.ts`.

**Effort:** S — vài giờ. Một từ trong `runner.ts`, một bảng 19 nhánh, một dispatcher bốn dòng, một lần viết lại comment năm dòng, một file test. Xếp hạng "S-M" của plan là do quyết định sản phẩm về `model_changed` làm thổi phồng; nửa cơ khọc thực sự là S và trình biên dịch lo phần kiểm tra.

**Người dùng thấy:** trực tiếp thì không có gì — không thay đổi hành vi. Hệ quả người dùng thấy là ở phía tác giả plugin: tập hợp sự kiện mà extension có thể đăng ký nay được nêu ở một chỗ duy nhất, và một sự kiện phiên không có hook extension nào (ví dụ `model_changed`) không còn bị mô tả trong văn xuôi như thể nó có. Nói cách khác: nội bộ, người dùng cuối không thấy — chỉ tác giả plugin hưởng được.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | Thêm từ khoá `export` vào `type RunnerEmitEvent = Exclude<ExtensionEvent, ...>`. File đã dùng type này ở 361, 371, 1364, 1372, 1464; không có thay đổi nào khác. Barrel `src/extensibility/extensions/index.ts` đã có `export * from "./runner"`, nên type trở nên import được từ `../extensibility/extensions` mà không cần sửa barrel. | **Có** (`verified: true`). Ghi chú: plan ghi dòng 344 — khai báo thật ở 347 (comment tài liệu chiếm 343-346). `agent-session.ts` đã import các type sự kiện anh em từ `../extensibility/extensions` (khối ở 139-156), nên không sinh đường dẫn import mới. |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | Thêm `type RelayableEventKind` (19 tên) ở cấp module và `type SessionEventRelays` (mapped type trên kiểu đó) ở cấp module, rồi thêm private class field `#sessionEventRelay` giữ object literal 19 nhánh đóng bằng `} satisfies SessionEventRelays;`. Thay toàn bộ thân `#emitExtensionEvent` (hiện là 4602-4747) bằng một dispatch bốn dòng tra nhánh rồi `await` nó. | **Có** (`verified: true`). Ghi chú: plan ghi 4572-4770. Method thật là `async #emitExtensionEvent(event: AgentSessionEvent): Promise<void>` ở 4602-4747; 19 phép so sánh `event.type ===` nằm ở 4604, 4611, 4615, 4622, 4631, 4637, 4644, 4657, 4666, 4675, 4684, 4690, 4700, 4709, 4717, 4725, 4731, 4733, 4740 (đếm đủ 19 bằng grep). Vùng này có 0 `case` và 0 `satisfies` (đã kiểm chứng). |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | Viết lại comment văn xuôi 5 dòng ngay trên `if (isChanging) { this.#emit({ type: "model_changed" }); }` trong `setModel`. Giữ lại lý do kỹ thuật (`#emit` đồng bộ tránh việc thêm một await giao tới extension vào mọi lần đổi model, kể cả retry-fallback trên nhánh lỗi). Chỉ xoá mệnh đề khẳng định sự thật hiện thực rằng relay không map `model_changed`, và thay bằng một con trỏ tới `RelayableEventKind`. Văn bản hiện tại nằm nguyên văn ở phần các bước. | **Có** (`verified: true`). Ghi chú: plan ghi 9442-9443. Comment thật là 9523-9527. KHÔNG xoá cả comment — lý do await-trong-đường-nóng vẫn đúng và còn giá trị; chỉ khẳng định "no extension-facing hook" mới lỗi thời khi relay thành bảng. |
| `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts` | tạo | File test mới. Một dòng runtime: extension handler đã đăng ký `goal_updated` nhận payload của goal bị drop, đi hết đường qua bảng relay. Chép khung dựng từ `test/agent-session-aside-delivery.test.ts:890-935` (TempDir + AuthStorage + ModelRegistry + createMockModel + SessionManager.inMemory + ExtensionRuntime + loadExtensionFromFactory + new ExtensionRunner + new AgentSession với `extensionRunner` trong config) và chạy nó bằng `session.setGoalModeState(...)` rồi `await session.goalRuntime.dropGoal()`. | **Có** (`verified: true`). Ghi chú: `GoalModeState` = `{ enabled: boolean; mode: "active" \| "exiting"; reason?: "completed"; goal: Goal }` tại `src/goals/state.ts:4-9`. `setGoalModeState` là setter thuần tại `src/session/agent-session.ts:6159` và KHÔNG emit; `dropGoal()` (`src/goals/runtime.ts:456`) mới là thứ emit `goal_updated` qua cầu nối `GoalRuntimeHost.emit` tại `src/session/agent-session.ts:1916-1920`. Tới được relay mà không cần stream model và không cần chạy tool. |

> Lưu ý về độ chắc của neo: cả bốn mục trên đều mang `verified: true`, tức đã đối chiếu với source thật ở HEAD `808b365`. Nếu cây thư mục dịch chuyển trước khi bắt tay vào, phải kiểm chứng lại bốn neo trong `agent-session.ts` (4602, 4747, 9523, 837) trước khi sửa.

### Các bước

1. **Neo `packages/coding-agent/src/extensibility/extensions/runner.ts:347`** — Đổi `type RunnerEmitEvent = Exclude<` thành `export type RunnerEmitEvent = Exclude<`. Một từ. Không sửa gì khác trong file này.

2. **Neo `packages/coding-agent/src/session/agent-session.ts` (cấp module, cạnh các module-scope type khác)** — Thêm kiểu khoá. Nó PHẢI là `Extract<AgentSessionEvent["type"], ...>` trên đúng 19 tên sau và KHÔNG phải `AgentSessionEvent["type"]` trần: `agent_start`, `agent_end`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `auto_compaction_start`, `auto_compaction_end`, `auto_retry_start`, `auto_retry_end`, `retry_fallback_applied`, `retry_fallback_succeeded`, `ttsr_triggered`, `todo_reminder`, `goal_updated`. Thêm doc comment nói rõ tập con này là cố ý, và việc thêm một tên mà không có nhánh chính là lỗi biên dịch mà toàn bộ work item này sinh ra để bắt.

3. **Neo `packages/coding-agent/src/session/agent-session.ts` (ngay sau `RelayableEventKind`)** — Thêm kiểu MAPPED, không phải `Record` trần. `type SessionEventRelays = { [E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent | undefined> };`. Đây là nửa mà plan cảnh báo không được bỏ qua, và lý do là cơ học chứ không phải thẩm mỹ: chỉ dạng mapped mới contextually định kiểu tham số `event` của từng nhánh theo biến thể của chính nhánh đó, nhờ đó `event.message` / `event.toolCallId` typecheck được bên trong nhánh. Dạng `Record<RelayableEventKind, (event: AgentSessionEvent) => ...>` sẽ buộc phải cast ở cả 19 nhánh.

4. **Neo `packages/coding-agent/src/session/agent-session.ts` (khu vực class field, cạnh các private field khác quanh dòng 837-849)** — Thêm `#sessionEventRelay = { ...19 nhánh... } satisfies SessionEventRelays;` như một private class field — KHÔNG phải biến cục bộ bên trong `#emitExtensionEvent`. `message_update` bắn ra mỗi delta được stream; dựng lại object literal 19 closure trên mỗi sự kiện là một chi phí per-token thật sự. Field initializer chạy lúc khởi tạo; các nhánh chỉ đọc `this.#turnIndex` khi được gọi, nên thứ tự khai báo so với `#turnIndex` (dòng 849) không phải ràng buộc.

5. **Neo `packages/coding-agent/src/session/agent-session.ts:4602-4747` (`#emitExtensionEvent`)** — Chuyển toàn bộ thân 19 nhánh vào bảng, nguyên văn, giữ nguyên hình dạng local có annotation của từng nhánh (`const hookEvent: TurnStartEvent = { ... }; return hookEvent;`). Phần import: tám type `TurnStartEvent`, `TurnEndEvent`, `MessageStartEvent`, `MessageUpdateEvent`, `MessageEndEvent`, `ToolExecutionStartEvent`, `ToolExecutionUpdateEvent`, `ToolExecutionEndEvent` đã nằm trong khối 139-156. `code_shape` còn dùng MƯỚI type nữa mà file hiện chưa import: `AgentStartEvent`, `AutoCompactionStartEvent`, `AutoCompactionEndEvent`, `AutoRetryStartEvent`, `AutoRetryEndEvent`, `RetryFallbackAppliedEvent`, `RetryFallbackSucceededEvent`, `TtsrTriggeredEvent`, `TodoReminderEvent`, `GoalUpdatedEvent` — cộng `RunnerEmitEvent` từ bước 1. Chín `GoalUpdatedEvent` KHÔNG lấy được từ `../extensibility/extensions`: nó chỉ được `extensions/types.ts` import vào union `ExtensionEvent` (dòng 1147) chứ không re-export, định nghĩa thật ở `src/extensibility/shared-events.ts:147`. Phải thêm một dòng import riêng ngay cạnh khối 139-156: `import type { GoalUpdatedEvent } from "../extensibility/shared-events";`. Không thêm `import type { AgentSessionEvent }` — nó đã có, là kiểu tham số của chính method.

6. **Neo `packages/coding-agent/src/session/agent-session.ts` — nhánh `agent_start`** — Nhánh `agent_start` giữ phần reset bộ đếm lượt và trả về payload: `agent_start: async () => { this.#turnIndex = 0; const extensionEvent: AgentStartEvent = { type: "agent_start" }; return extensionEvent; },`. Thêm `AgentStartEvent` vào khối import 139-156 nếu dùng annotation; bỏ local annotation và trả thẳng object literal cũng typecheck dưới mapped type và ít code hơn.

7. **Neo `packages/coding-agent/src/session/agent-session.ts` — nhánh `agent_end`** — `agent_end: async () => undefined,` kèm comment nêu chỗ emit thật nằm ở đâu: `#emitAgentEndNotification` (agent-session.ts:4538-4544), thứ emit `{ type: "agent_end", messages, willContinue }` từ đường bảo trì đã lắng xuống để các control hook `session_stop` không bị chặn. Đây là một quyết định định tuyến có tài liệu, không phải một tính năng còn thiếu — hãy nói rõ điều đó trong comment, vì một nhánh no-op không giải thích đúng là đúng cái mùi mà WI-3 sinh ra để dẹp. Tiền lệ no-op trong TUI: `event-controller.ts:287` (`turn_start: async () => {}`) và `:356` (`goal_updated: async () => {}`).

8. **Neo `packages/coding-agent/src/session/agent-session.ts` — nhánh `turn_end`** — Chuyển `this.#turnIndex++` VÀO trong nhánh, ngay trước `return`. Hiện nó nằm sau `await emit(...)` ở dòng 4630; bảng trả về payload và dispatcher phát, nên phép tăng buộc phải nằm trước lúc emit. Điều này tương đương về mặt quan sát được: `#turnIndex` chỉ được đọc bởi các nhánh `turn_start`/`turn_end` (4618, 4625) và bởi `turn_id: Math.max(0, this.#turnIndex - 1)` ở 4561, tất cả đều chạy sau hẳn trong vòng đời lượt, không bao giờ tái-đệ quy từ bên trong một extension handler `turn_end` (handler nhận `ExtensionContext` và không với tới được nội bộ session). Nêu lý do này trong PR body — nếu không, người review sẽ đọc nó thành một thứ tự sắp xếp nhầm.

9. **Neo `packages/coding-agent/src/session/agent-session.ts` — nhánh `message_end`** — Giữ clone payload: `const extensionEvent: MessageEndEvent = { type: "message_end", message: cloneMessageEndNotification(event.message) };`. Helper là một hàm module-scope trong chính file này ở 612-630; comment 5 dòng giải thích VÌ SAO payload bị tách ra (một observer bất đồng bộ sửa event sau một `await` không được phép viết lại request kế tiếp tới provider) phải chuyển vào nhánh, không được xoá.

10. **Neo `packages/coding-agent/src/session/agent-session.ts:4602` (thân method mới)** — Thay toàn bộ chuỗi bằng dispatch sau, giữ nguyên thứ tự của hai cổng chặn sẵn có:

    ```typescript
    async #emitExtensionEvent(event: AgentSessionEvent): Promise<void> {
        const runner = this.#extensionRunner;
        if (!runner) return;
        const arm = this.#sessionEventRelay[event.type as RelayableEventKind] as
            | ((event: AgentSessionEvent) => Promise<RunnerEmitEvent | undefined>)
            | undefined;
        if (!arm) return;
        // `agent_start` stays ungated: its arm resets the turn counter, which also
        // feeds `turn_id` on the session_stop continuation path and must not depend
        // on any extension being subscribed. Every other relayable kind keeps the
        // pre-existing zero-handler fast path.
        if (event.type !== "agent_start" && !runner.hasHandlers(event.type)) return;
        const payload = await arm(event);
        if (payload) await runner.emit(payload);
    }
    ```

    Hai cast, không phải một: cast khoá (`as RelayableEventKind`) thu hẹp union 28 phần tử xuống 19 mà bảng phủ, và cast giá trị gộp union 19 kiểu hàm thành một chữ ký gọi được. Cast giá trị đúng là tiền lệ mà plan đã trích cho TUI rồi không mang sang — `event-controller.ts:851` làm `const run = this.#handlers[event.type] as (e: AgentSessionEvent) => Promise<void>;`.

11. **Neo `packages/coding-agent/src/session/agent-session.ts:9523-9527`** — Thay comment 5 dòng. Văn bản hiện tại, nguyên văn:

    ```typescript
    // Fan-out uses the synchronous `#emit`, matching `thinking_level_changed`:
    // `model_changed` has no extension-facing hook (`#emitExtensionEvent`
    // never maps it), so routing it through `#emitSessionEvent` would only
    // add an extension-delivery await inside every model switch — including
    // retry-fallback on the error path.
    ```

    Thay bằng:

    ```typescript
    // Fan-out uses the synchronous `#emit`, matching `thinking_level_changed`:
    // routing it through `#emitSessionEvent` would add an extension-delivery await
    // inside every model switch — including retry-fallback on the error path.
    // `model_changed` is deliberately absent from `RelayableEventKind`; add it
    // there together with a real relay arm, never on its own.
    ```

    Hai dòng đầu là lý do kỹ thuật mang trọng — không được xoá.

12. **Neo `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts` (file mới)** — Viết một dòng runtime. Đăng ký `pi.on("goal_updated", ...)` trong một extension tạo bằng `loadExtensionFromFactory`, đẩy event nhận được vào một mảng, dựng runner và session theo khung ở `test/agent-session-aside-delivery.test.ts:890-935`, rồi `session.setGoalModeState({ enabled: true, mode: "active", goal: { id: "g-relay", objective: "Prove the relay table is live", status: "active", tokensUsed: 0, timeUsedSeconds: 0, createdAt: 0, updatedAt: 0 } })`, sau đó `await session.goalRuntime.dropGoal()`. Khẳng định handler nhận đúng một event có `goal.id === "g-relay"`, `goal.status === "dropped"` và `state.enabled === false`. Dọn dẹp bằng `await session.dispose()`, `authStorage.close()`, `tempDir.removeSync()` trong `afterEach`, khớp với `agent-session-aside-delivery.test.ts:29-47`. Không `mock.module()`, không đột biến global `Bun.*`.

13. **Neo `packages/coding-agent/package.json` (không sửa)** — KHÔNG thêm test kiểu bằng `@ts-expect-error`, và KHÔNG export bảng ra để test. AGENTS.md cấm test placeholder/tautological, và một case object cố tình thiếu dưới `@ts-expect-error` không phát hiện được thất bại mà work item này sinh ra để ngăn: lỗi thiếu khoá nằm trong một literal độc lập sai hoài bất kể bảng production làm gì, và `@ts-expect-error` chỉ nổ khi lỗi BIẾN MẤT. Tính đầy đủ hoàn toàn do `satisfies` trên bảng production cộng `bun run check:ts` gánh.

14. **Neo `commit`** — Commit 1 = bước 1-12 gộp thành một commit (xanh độc lập). Commit 2 CHỈ khi sản phẩm trả lời câu hỏi mở về `model_changed` là "có, ship một hook": thêm `model_changed` vào `RelayableEventKind` và một nhánh thật trong CÙNG commit đó. Không bao giờ thêm tên vào union với một nhánh rỗng — đó đúng là lỗi mà WI-3 sinh ra để tiêu diệt. Không gộp kèm việc gom các call site `extensionRunner.emit(...)` rải rác ở nơi khác trong file; đó là refactor khác, mức rủi ro khác.

### Hình dạng code

```typescript
// ---- module scope, near the top of agent-session.ts ----

/**
 * Session event kinds the extension relay forwards.
 *
 * Deliberately a subset of `AgentSessionEvent["type"]`: `model_changed`,
 * `config_warnings_changed`, `advisor_cost_changed`, `advisor_yielded`,
 * `todo_auto_clear`, `irc_message`, `notice`, `thinking_level_changed` and
 * `tool_stream_update` are delivered to in-process subscribers only and have no
 * extension-facing hook. Adding a name here without adding an arm below is a
 * compile error, which is the entire point of this table.
 */
type RelayableEventKind = Extract<
	AgentSessionEvent["type"],
	| "agent_start" | "agent_end" | "turn_start" | "turn_end"
	| "message_start" | "message_update" | "message_end"
	| "tool_execution_start" | "tool_execution_update" | "tool_execution_end"
	| "auto_compaction_start" | "auto_compaction_end"
	| "auto_retry_start" | "auto_retry_end"
	| "retry_fallback_applied" | "retry_fallback_succeeded"
	| "ttsr_triggered" | "todo_reminder" | "goal_updated"
>;

/**
 * MAPPED type, not `Record<...>`. The `Extract` in the value position is what
 * gives each arm its own event variant, so arm bodies narrow without casts.
 * The return is a Promise because arms also carry the relay's non-emit side
 * effects (the `agent_start` counter reset, the `turn_end` increment); a pure
 * synchronous `event -> RunnerEmitEvent` signature would silently drop them.
 */
type SessionEventRelays = {
	[E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent | undefined>;
};

// ---- class field, next to #extensionRunner (line 837) / #turnIndex (line 849) ----

#sessionEventRelay = {
	agent_start: async () => {
		// Ungated in the dispatcher: this reset also feeds `turn_id` at the
		// session_stop continuation path, which must not depend on any
		// extension being subscribed.
		this.#turnIndex = 0;
		return { type: "agent_start" } satisfies AgentStartEvent;
	},
	// No payload from the session path. The extension `agent_end` notification is
	// emitted from `#emitAgentEndNotification` (this file) so `session_stop` control
	// hooks are not blocked by unrelated notification-only work. Routing decision,
	// not a missing arm.
	agent_end: async () => undefined,
	turn_start: async () => {
		return { type: "turn_start", turnIndex: this.#turnIndex, timestamp: Date.now() } satisfies TurnStartEvent;
	},
	turn_end: async event => {
		// Increment moved ahead of the emit (the table returns, the dispatcher emits).
		// Safe: #turnIndex is read only by the arms above and by `turn_id` at the
		// session_stop path, all strictly later in the turn lifecycle.
		this.#turnIndex++;
		return { type: "turn_end", turnIndex: this.#turnIndex - 1, message: event.message, toolResults: event.toolResults } satisfies TurnEndEvent;
	},
	message_start: async event => ({ type: "message_start", message: event.message }) satisfies MessageStartEvent,
	message_update: async event =>
		({ type: "message_update", message: event.message, assistantMessageEvent: event.assistantMessageEvent }) satisfies
			MessageUpdateEvent,
	message_end: async event => {
		// Detach the payload from agent-owned history so an async observer that mutates
		// the event after an `await` cannot race mid-run maintenance and enlarge (or
		// otherwise rewrite) the next provider request after its threshold check.
		return { type: "message_end", message: cloneMessageEndNotification(event.message) } satisfies MessageEndEvent;
	},
	tool_execution_start: async event =>
		({
			type: "tool_execution_start",
			toolCallId: event.toolCallId,
			toolName: event.toolName,
			args: event.args,
			intent: event.intent,
		}) satisfies ToolExecutionStartEvent,
	tool_execution_update: async event =>
		({
			type: "tool_execution_update",
			toolCallId: event.toolCallId,
			toolName: event.toolName,
			args: event.args,
			partialResult: event.partialResult,
		}) satisfies ToolExecutionUpdateEvent,
	tool_execution_end: async event =>
		({
			type: "tool_execution_end",
			toolCallId: event.toolCallId,
			toolName: event.toolName,
			result: event.result,
			isError: event.isError ?? false,
		}) satisfies ToolExecutionEndEvent,
	auto_compaction_start: async event =>
		({ type: "auto_compaction_start", reason: event.reason, action: event.action }) satisfies AutoCompactionStartEvent,
	auto_compaction_end: async event =>
		({
			type: "auto_compaction_end",
			action: event.action,
			result: event.result,
			aborted: event.aborted,
			willRetry: event.willRetry,
			errorMessage: event.errorMessage,
			skipped: event.skipped,
		}) satisfies AutoCompactionEndEvent,
	auto_retry_start: async event =>
		({
			type: "auto_retry_start",
			attempt: event.attempt,
			maxAttempts: event.maxAttempts,
			delayMs: event.delayMs,
			errorMessage: event.errorMessage,
			errorId: event.errorId,
		}) satisfies AutoRetryStartEvent,
	auto_retry_end: async event =>
		({
			type: "auto_retry_end",
			success: event.success,
			attempt: event.attempt,
			finalError: event.finalError,
			retryErrors: event.retryErrors,
		}) satisfies AutoRetryEndEvent,
	retry_fallback_applied: async event =>
		({ type: "retry_fallback_applied", from: event.from, to: event.to, role: event.role, reason: event.reason }) satisfies
			RetryFallbackAppliedEvent,
	retry_fallback_succeeded: async event =>
		({ type: "retry_fallback_succeeded", model: event.model, role: event.role }) satisfies RetryFallbackSucceededEvent,
	ttsr_triggered: async event => ({ type: "ttsr_triggered", rules: event.rules }) satisfies TtsrTriggeredEvent,
	todo_reminder: async event =>
		({ type: "todo_reminder", todos: event.todos, attempt: event.attempt, maxAttempts: event.maxAttempts }) satisfies
			TodoReminderEvent,
	goal_updated: async event => ({ type: "goal_updated", goal: event.goal, state: event.state }) satisfies GoalUpdatedEvent,
} satisfies SessionEventRelays;

// ---- method ----

async #emitExtensionEvent(event: AgentSessionEvent): Promise<void> {
	const runner = this.#extensionRunner;
	if (!runner) return;
	const arm = this.#sessionEventRelay[event.type as RelayableEventKind] as
		| ((event: AgentSessionEvent) => Promise<RunnerEmitEvent | undefined>)
		| undefined;
	if (!arm) return;
	if (event.type !== "agent_start" && !runner.hasHandlers(event.type)) return;
	const payload = await arm(event);
	if (payload) await runner.emit(payload);
}
```

### Hợp đồng test

**Hợp đồng quan sát được:** một extension handler đã đăng ký `goal_updated` nhận được event, mang theo danh tính goal và trạng thái đã drop mà session tạo ra.

**Nếu hồi quy, người tiêu dùng thấy gì:** mảng `received` của handler vẫn rỗng — `pi.on("goal_updated", ...)` của tác giả plugin âm thầm không bao giờ bắn — khi tra bảng trượt (sai cast `as`, khoá đảo, nhánh trả `undefined` thay vì payload), hoặc khi dispatcher ngừng định tuyến qua `#emitExtensionEvent`. Nếu chỉ payload sai, các khẳng định về `goal.id` / `goal.status === "dropped"` / `state.enabled === false` sẽ fail, bắt được một nhánh chuyển tiếp bị map nhầm hoặc bị cắt cụt vẫn còn tới được handler.

**Vì sao đây không phải một phép so sánh chu kỳ với chính nó:** object goal do `GoalRuntime.dropGoal` tạo ra (chính nó đặt `status: "dropped"` và `state.enabled: false` ở `goals/runtime.ts:456-471`) và đi qua chuỗi runtime → cầu nối `GoalRuntimeHost.emit` (`agent-session.ts:1916-1920`) → `#emitSessionEvent` → `#emitExtensionEvent` → bảng → `ExtensionRunner.emit` → handler. Relay không khẳng định gì; nó chỉ di chuyển payload. Không có fixture nào được so với chính nó.

**Điều nó cố ý KHÔNG bảo vệ: tính đầy đủ.** Một dòng runtime chỉ một sự kiện không thể fail khi ai đó thêm một khoá vào bảng, và cũng không thể fail khi một tên bị bỏ hẳn ra khỏi `RelayableEventKind`. Hợp đồng đó được gánh 100% bởi `satisfies SessionEventRelays` trên bảng production cộng `bun run check:ts` — và claim của plan rằng dòng runtime này sẽ fail trong kịch bản đó là sai (xem mục Đính chính so với plan).

**Tên file test:** `packages/coding-agent/test/extension-event-relay-exhaustive.test.ts`

### Xác minh

Chạy được ngay hôm nay (đã kiểm chứng xanh tại HEAD `808b365`, exit 0):

```bash
bun run check:ts
```

Chạy được sau khi đã build native addon (hiện đang bị chặn — `bun test` báo `0 pass, 1 fail`, `Failed to load pi_natives native addon for darwin-arm64`; đã xác nhận bằng cách chạy `cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts`):

```bash
cd packages/coding-agent && bun test test/extension-event-relay-exhaustive.test.ts
```

Lệnh kết hợp (của plan), chỉ hợp lệ sau `bun run build:native`:

```bash
bun run check:ts && (cd packages/coding-agent && bun test test/extension-event-relay-exhaustive.test.ts)
```

`check:ts` không phải nghi thức hình thức: nó chạy `oxlint` + `oxfmt --check` rồi `tsgo -p tsconfig.json --noEmit` theo từng package, và `packages/coding-agent/tsconfig.json` bao gồm `["src", "test", "scripts"]` — nên cả bảng lẫn file test mới đều được kiểm tra kiểu bởi nó.

Lệnh sửa khi native addon chưa build, theo gợi ý trong thông báo lỗi: `bun --cwd=packages/natives run build`.

Không dùng `tsc` — dự án cấm. Cổng kiểm tra là `bun run check:ts`.

### Cổng hoàn thành

`bun run check:ts` exit 0. Đây là cổng mang trọng và nó thực sự mang trọng: nếu người triển khai thêm một tên vào `RelayableEventKind` mà không có nhánh, mapped type đòi property còn thiếu và tsgo fail. Nếu họ viết dạng `Record<RelayableEventKind, (event: AgentSessionEvent) => ...>` trần từ phác thảo của plan, mọi nhánh chạm vào trường riêng của biến thể sẽ fail biên dịch. Nếu họ dùng `HookEvent` làm kiểu khoá, `Extract` sẽ co lại thành `never` và bảng hỏng. Cổng thứ hai, sau khi addon được build: `cd packages/coding-agent && bun test test/extension-event-relay-exhaustive.test.ts` exit 0 với đúng 1 test pass.

Trạng thái đỏ thứ tư, không nằm trong ba cái trên: `code_shape` ở trên được viết theo kiểu xuống dòng thủ công, nên `oxfmt --check` sẽ đỏ NGAY CẢ KHI phần kiểu hoàn toàn đúng. Vì `check:ts` chạy `check:tools` (oxlint + oxfmt) trước `check:types`, lệch format sẽ che mất lỗi kiểu. Sau khi viết xong bảng và dispatcher, chạy `bun run fmt:ts` một lần rồi mới chạy lại `bun run check:ts`.

**Cổng có thực sự đỏ được không:** CÓ với `check:ts`, và đó là cổng quan trọng. Ba trạng thái đỏ cụ thể: (1) thêm `"model_changed"` vào `RelayableEventKind` mà không có nhánh → TS2741 missing property, tsgo exit khác 0. (2) xoá nhánh `turn_end` → tương tự. (3) đổi annotation `satisfies TurnEndEvent` thành một interface sự kiện sai → TS2322 trên object literal. Nó đã được quan sát là xanh ở HEAD (`bun run check:ts` → exit 0) nên chứng minh là sống. KHÔNG với nửa `bun test` hôm nay: native addon chưa build, nên toàn bộ suite báo 0 pass bất kể code. Nửa đó chỉ là cổng thật sau `bun run build:native`; cho tới đó đừng coi sự im lặng của nó là xanh.

### Phụ thuộc

- `depends_on`: không.
- `blocks`: không.
- Mối nối phối hợp (không phải phụ thuộc theo nghĩa chặn): file dùng chung `session/agent-session.ts` với M2-OQ6 — câu hỏi 46-overload → interface `Events` khai báo ở cấp module; phải quyết trước khi đụng vào cả hai. Ngoài ra một từ `export` trên `extensions/runner.ts`.

### Cách sai dễ nhất

Cách nhiều khả năng nhất để làm sai: cầm phác thảo chữ-literal của plan — `satisfies Record<RelayableEventKind, (event: AgentSessionEvent) => RunnerEmitEvent | undefined>` — sai theo hai lần. Nó ĐỒNG BỘ, nên phép reset `#turnIndex` trong `agent_start` và phép tăng trong `turn_end` không còn chỗ để nằm và bị âm thầm rơi mất, để lại `turnIndex` đóng băng ở 0 với mọi extension mãi mãi. Và nó định kiểu tham số của mọi nhánh là `AgentSessionEvent` đủ 28 phần tử, không narrow theo nhánh, nên `event.message` / `event.toolCallId` không typecheck và cả 19 nhánh đều cần cast — tức là đúng kết quả mà refactor này sinh ra để loại bỏ. Dạng đúng là mapped `SessionEventRelays` với kiểu trả về async, chép từ `event-controller.ts:107-109` + `:284-357`, cộng thêm cast giá trị tại chỗ tra mà plan cũng bỏ sót (tiền lệ TUI: `event-controller.ts:851`).

Khả năng sai thứ hai: đặt bảng bên trong thân method thay vì làm class field, cấp phát 19 closure mỗi delta `message_update`. Khả năng sai thứ ba: xoá cả comment `model_changed` thay vì chỉ mệnh đề lỗi thời của nó, vứt mất lý do await-trong-đường-nóng.

### Cần người quyết

Câu hỏi **chặn commit 2** nhưng không chặn commit 1:

- **SẢN PHẨM — `model_changed`: ship một extension hook hay không?** Mặc định của đặc tả là KHÔNG: để nó ngoài `RelayableEventKind` và giữ con trỏ trong comment. Một hook sẽ bắn ở mọi lần đổi model kể cả retry-fallback trên nhánh lỗi, và `setModel` nằm trên đường nóng. Nếu câu trả lời là có, đó là commit 2 và phải đi kèm một nhánh thật — không bao giờ là một cái tên trong union với nhánh rỗng.

Hai câu hỏi dưới đây không chặn việc bắt đầu commit 1; mặc định của đặc tả đã đủ để làm:

- **SẢN PHẨM/REVIEW — lỗi tiềm ẩn ở `#turnIndex` mà refactor này làm lộ ra:** `this.#turnIndex++` (agent-session.ts:4630) hiện nằm SAU chốt chặn `if (!runner.hasHandlers(event.type)) return;` ở 4610. Khi không extension nào đăng ký handler `turn_end`, `#turnIndex` vì thế không bao giờ tăng, nên `turnIndex` đưa cho handler `turn_start`/`turn_end` suốt phiên là 0 và `turn_id` ở 4561 (`Math.max(0, this.#turnIndex - 1)`) luôn là 0. Đặc tả GIỮ NGUYÊN đúng hành vi này để WI-3 thành một commit cơ khọc zero-diff. Sửa nó là một commit riêng, nhỏ, có thay đổi hành vi, kèm test runtime riêng. Có nên ghi thành một mục follow-up, và có ai muốn đưa nó vào M2 không?
- **REVIEW — giữ `agent_end` là một nhánh `async () => undefined` có tài liệu, hay nên bỏ `agent_end` khỏi `RelayableEventKind` (còn 18 khoá) vì nó không có payload nào từ đường session?** Đặc tả giữ ở 19 để khớp số nhánh hiện tại và buộc người viết tương lai phải đối diện với quyết định định tuyến; TUI có tiền lệ cho nhánh no-op (`event-controller.ts:287`, `:356`). Người review bất đồng chỉ cần xoá một khoá và một nhánh.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| Kiểu giá trị của bảng là `(event: AgentSessionEvent) => RunnerEmitEvent \| undefined` (một `Record<RelayableEventKind, …>` trần kèm `satisfies`). | **SAI** — và làm theo chữ nghĩa ra tốn một lần làm lại toàn bộ 19 nhánh | Dùng kiểu MAPPED với kiểu trả về ASYNC: `type SessionEventRelays = { [E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent \| undefined> };`. Hai lỗi độc lập trong dạng của plan. (a) Nó đồng bộ, nên hai nhánh có mutate trạng thái relay — `this.#turnIndex = 0` (4605) và `this.#turnIndex++` (4630) — không còn chỗ để nằm và bị rơi, đóng băng `turnIndex` ở 0 với mọi extension suốt phiên. (b) Tham số của nó là `AgentSessionEvent` đủ 28 phần tử, không narrow theo nhánh, nên `event.message` / `event.toolCallId` / `event.goal` không typecheck và cả 19 nhánh cần cast — đúng kết quả mà refactor này sinh ra để loại bỏ. Plan có gần như chỉ tới đáp án đúng ("copy BOTH halves, not just the object literal") nhưng rồi lại viết phác thảo của nửa không dùng được.<br>Bằng chứng: `packages/coding-agent/src/modes/controllers/event-controller.ts:107-109` — `type AgentSessionEventHandlers = { [E in AgentSessionEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<void>; };`, đóng ở `:357` bằng `} satisfies AgentSessionEventHandlers;`. Các nhánh ở đó đọc `e` với narrowing biến thể đầy đủ (`event-controller.ts:287-300`). `AgentSessionEventKind = AgentSessionEvent["type"]` ở `:74`. |
| Dispatch là `relayTable[event.type as RelayableEventKind]?.(event)` — "cast `as` tại chỗ tra là nơi duy nhất cần cast". | **SAI** — cần hai cast | `this.#sessionEventRelay[event.type as RelayableEventKind]` có kiểu `SessionEventRelays[RelayableEventKind]`, tức là một union của 19 kiểu hàm. Gọi một union các kiểu hàm đòi hỏi đối số gán được cho PHÉP GIAO các tham số của chúng, và một `AgentSessionEvent` đầy đủ không gán được cho `Extract<AgentSessionEvent, { type: "turn_start" }>`. Chỗ tra còn phải cast GIÁ TRỊ về một chữ ký rộng duy nhất: `as ((event: AgentSessionEvent) => Promise<RunnerEmitEvent \| undefined>) \| undefined`. TUI làm đúng như vậy và plan đã trích TUI làm khuôn mẫu mà không mang nửa dispatch sang.<br>Bằng chứng: `packages/coding-agent/src/modes/controllers/event-controller.ts:851` — `const run = this.#handlers[event.type] as (e: AgentSessionEvent) => Promise<void>;` |
| Dòng test runtime "là thứ FAIL nếu ai đó bỏ sót một biến thể khỏi `RelayableEventKind` rồi thêm nó vào bảng". | **SAI NHIỀU CÁCH** — claim tự mâu thuẫn và không dòng test một sự kiện nào có thể giữ được | Hai nửa câu mô tả hai tình huống trái ngược nhau và không nửa nào làm cho dòng runtime mang trọng. Nếu một tên được thêm vào BẢNG nhưng không có trong union, `satisfies` fail như excess-property error — đó là `bun run check:ts`, không phải dòng runtime. Nếu một tên bị bỏ khỏi CẢ HAI, không gì fail ở đâu cả: một sự kiện phiên mới mà không ai relay là một quyết định sản phẩm hợp lệ, không phải khiếm khuyết. Cái dòng runtime thực sự bảo vệ hẹp hơn và vẫn đáng có: bảng LÀ đường dispatch sống, và payload tới handler là payload do session tạo ra. Hãy phát biểu như vậy; đừng để người review tin rằng test chắn được tính đầy đủ.<br>Bằng chứng: `packages/coding-agent/tsconfig.json` bao gồm `["src", "test", "scripts"]`, nên `tsgo --noEmit` kiểm tra kiểu cả bảng — đó là toàn bộ cổng đầy đủ. Một test runtime một sự kiện chỉ quan sát việc giao của một sự kiện và không gì về 18 sự kiện kia. |
| Bảng khoá `AgentSessionEvent["type"]` trần "sẽ đòi hơn mười nhánh `() => undefined`". | **ĐÚNG THỰC CHẤT, SAI CON SỐ** | Đúng 9, không phải "hơn mười". `AgentSessionEvent` có 28 tên type khác nhau (11 từ `AgentEvent` + 17 do union của session thêm vào); 19 relayable, còn lại 9: `tool_stream_update`, `model_changed`, `config_warnings_changed`, `advisor_cost_changed`, `advisor_yielded`, `todo_auto_clear`, `irc_message`, `notice`, `thinking_level_changed`. Kết luận — dùng `Extract` 19 phần tử — không đổi. Đáng viết đúng 9 tên đó vào doc comment của `RelayableEventKind` để người viết kế tiếp biết có hai lựa chọn hợp lệ.<br>Bằng chứng: `packages/coding-agent/src/session/agent-session-events.ts:13-80` (union; 17 biến thể chỉ-của-session ở 29-80). `packages/agent/src/types.ts:1197-1219` — `AgentEvent` có 11 biến thể, kết thúc ở 1219. Đối chiếu chéo: bảng handler của TUI (`event-controller.ts:284-357`) có nhánh thật cho cả 28, vì TUI đăng ký tất cả. |
| `model_changed`: "hoặc xoá văn xuôi ở agent-session.ts:9442-9443". | **SAI NEO, VÀ XOÁ CẢ COMMENT LÀ CÁCH SỬA SAI** | Comment nằm ở 9523-9527, không phải 9442-9443, và chỉ mệnh đề thứ ba của nó mới lỗi thời. Dòng 1-2 ("Fan-out uses the synchronous `#emit` … would only add an extension-delivery await inside every model switch — including retry-fallback on the error path") là lý do mang trọng cho việc dùng `#emit` thay vì `#emitSessionEvent`, và chúng vẫn đúng. Xoá khẳng định "`model_changed` has no extension-facing hook (`#emitExtensionEvent` never maps it)" và thay bằng một con trỏ tới `RelayableEventKind`. Văn bản thay thế chính xác nằm ở bước 11.<br>Bằng chứng: `packages/coding-agent/src/session/agent-session.ts:9523-9527`, đọc trực tiếp; theo sau ở 9528-9530 là `if (isChanging) { this.#emit({ type: "model_changed" }); }`. |
| 19 nhánh relay nằm ở `agent-session.ts:4572-4770`, tên nhánh lấy từ `:4572-4720`; ghi chú `model_changed` ở `:9442-9443`; `RunnerEmitEvent` ở `extensions/runner.ts:344`; `ExtensionEvent` ở `extensions/extensions/types.ts:1095`; `AgentSessionEvent` ở `session/agent-session-events.ts:13-77`; `AgentEvent` ở `agent/src/types.ts:1189`; khuôn mẫu TUI ở `event-controller.ts:106-108` và `:279-352`. | **SAI BẢY NEO** — số dòng đã kiểm chứng bên dưới | Dùng các neo sau, tất cả đã xác nhận bằng `git grep -n` / `sed -n` tại HEAD `808b365`: method relay 4602-4747; 19 phép so sánh `event.type ===` ở 4604, 4611, 4615, 4622, 4631, 4637, 4644, 4657, 4666, 4675, 4684, 4690, 4700, 4709, 4717, 4725, 4731, 4733, 4740; ghi chú `model_changed` 9523-9527; `RunnerEmitEvent` runner.ts:347; `ExtensionEvent` extensions/types.ts:1120; `AgentSessionEvent` agent-session-events.ts:13-80; `AgentEvent` agent/src/types.ts:1197-1219; kiểu mapped của TUI event-controller.ts:107-109 và object literal 284-357 (`satisfies` đóng ở 357).<br>Bằng chứng: đọc trực tiếp từng file; `agent-session.ts:4746-4747` cho thấy dấu `}` đóng chuỗi và dấu `}` của method; `event-controller.ts:357` là `} satisfies AgentSessionEventHandlers;`. |
| Repo đang ở git HEAD `5873776` trên branch milestone-1. | **LỖI THỜI** — commit đó không tồn tại trong repo này | HEAD thật là `808b365` ("docs(plan): fold the spec-verified M1 execution plan into the upgrade plan"), branch milestone-1, working tree sạch. `git cat-file -t 5873776` trả về 'fatal: Not a valid object name'. Mọi số dòng trong đặc tả này đã được kiểm chứng trên `808b365`; nếu cây thư mục dịch chuyển trước khi triển khai, hãy kiểm chứng lại bốn neo trong `agent-session.ts` (4602, 4747, 9523, 837) trước khi sửa.<br>Bằng chứng: `git rev-parse --short HEAD` → `808b365`; `git log --oneline -3` → `808b365`, `33d6e33`, `ecd516f`. |
| `HookEvent` là union 15 phần tử ở `extensibility/hooks/types.ts:393` và thiếu 9 type chỉ-có-relay. | **ĐÃ XÁC NHẬN** — cảnh báo kiểu sắc nhất của plan vẫn đúng | Đã xác minh đúng 15 phần tử (394-408) và số dòng là chính xác. Liệt kê ở đây để người triển khai không phải tự suy lại: SessionEvent, ContextEvent, BeforeAgentStartEvent, AgentStartEvent, AgentEndEvent, TurnStartEvent, TurnEndEvent, AutoCompactionStartEvent, AutoCompactionEndEvent, AutoRetryStartEvent, AutoRetryEndEvent, TtsrTriggeredEvent, TodoReminderEvent, ToolCallEvent, ToolResultEvent. 9 type chỉ-có-relay (message_start/update/end, tool_execution_start/update/end, retry_fallback_applied, retry_fallback_succeeded, goal_updated) vắng mặt — dùng nó làm kiểu khoá làm `Extract` co lại thành `never`.<br>Bằng chứng: `packages/coding-agent/src/extensibility/hooks/types.ts:393-408`. `ExtensionEventType` cũng được xác nhận là không tồn tại: `git grep -n ExtensionEventType -- packages` không trả về gì. |
| Ghi chú môi trường: `bun test` bị chặn bởi native addon chưa build; `bun run check:ts` chạy được. | **ĐÃ XÁC NHẬN** — và hệ quả đối với cổng đã nêu trong `gate` | Đã chạy: `cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts` → '0 pass, 1 fail, 1 error', 'Failed to load pi_natives native addon for darwin-arm64', gợi ý sửa `bun --cwd=packages/natives run build`. `bun run check:ts` tại HEAD exit 0 (đã kiểm chứng, chạy đầy đủ). Nên cổng DUY NHẤT còn sống hôm nay là `check:ts` — may mắn thay, đó cũng là cổng mang tính đầy đủ. Đừng báo test là pass trước khi addon được build.<br>Bằng chứng: các lần chạy thật; đầu ra `bun run check:ts` kết thúc bằng `check:types \| Done` của mọi package và `[exited with code 0]`. |

## Cần người xác nhận

Mâu thuẫn nội tại trong chính đặc tả — không tự sửa, nêu ra ở đây:

- **`one_line` và `plan_corrections` #3 nói ngược nhau.** `one_line` kết luận rằng "một loại sự kiện mới không thể được thêm vào phiên mà không hoặc có nhánh chuyển tiếp, hoặc làm kiểm tra kiểu thất bại". Nhưng `plan_corrections` #3 nói: nếu một tên bị bỏ khỏi CẢ bảng lẫn union thì không gì fail ở đâu cả, vì một sự kiện phiên mới không ai relay là một quyết định sản phẩm hợp lệ. Cái thật sự được bảo vệ chỉ là chiều ngược lại — thêm một tên vào union mà không có nhánh thì fail — chứ không phải chiều trong `one_line`. Cần chốt xem `one_line` có phải sửa lại không, hay giữ nguyên và để mục Đính chính so với plan đứng sau nó.
- **Bước 12 tự tham chiếu chính nó.** Câu "dựng runner và session theo khung ở bước 12" nằm ngay trong bước 12. Khung thật sự được định nghĩa ở mục File cần chạm tới: `test/agent-session-aside-delivery.test.ts:890-935`. Mục Các bước đã dùng neo đó.


---


## WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu

**Thay đổi gì:** Biến registry renderer có sẵn của tool thành chỉ-đọc, để không plugin nào có thể âm thầm tô lại transcript của mọi tool cho cả tiến trình — đồng thời giữ nguyên, y như cũ, đường hợp thức duy nhất để cung cấp renderer: một tool definition tự mang hàm render của nó. **Wave:** 2 (M2 wave 2 — "Làm cho disable trung thực": WI-1 nửa timer, WI-2, WI-4. Ba work item độc lập, không mục nào chặn mục nào. XS–S, ~3 ngày cho cả wave, WI-4 là XS.) **Effort:** XS — nhỏ hơn cả mức XS mà plan tự ấn định, vì bản thân thay đổi chỉ là hai dòng trong một file. Phần lớn thời gian nằm ở hai file test, và cả hai đều bị chặn bởi một điều kiện môi trường chứ không phải bởi thiết kế.

**Người dùng thấy:** Với core oh-my-pi: không có. Mọi renderer có sẵn đều render ra byte-for-byte y hệt, vì một object literal đã đầy mà không ai ghi vào thì hành xử giống hệt trước và sau khi freeze, và cả 14 consumer trong repo đều là lượt đọc. Thay đổi người dùng thấy được chỉ rơi lên đúng nhóm dân plugin ngoài repo vốn đang ghi vào global — chính là nhóm mà freeze sinh ra để đuổi: override của chúng không còn có tác dụng, và vì extension module là ESM strict-mode nên phép gán giờ ném `TypeError` ngay lúc load thay vì thành công âm thầm. Đó là một thất bại ồn thay cho một thất bại im lặng, và đó chính là điểm cố ý. Đường được hợp thức hoá (tool definition mang `renderCall`/`renderResult` của riêng nó) không bị đụng tới và vẫn thắng renderer có sẵn với bất kỳ tool nào tự cung cấp.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/tui/src/tools/index.ts` | sửa | Dòng 35: đổi khai báo từ `export const toolRenderers: Record<string, ToolRenderer> = {` thành `export const toolRenderers: Readonly<Record<string, ToolRenderer>> = Object.freeze<Record<string, ToolRenderer>>({`. Dòng 70: đổi `};` thành `});`. Không gì khác trong file thay đổi — 31 entry renderer giữ nguyên, và lệnh `setXdevRendererLookup(name => toolRenderers[name])` ở dòng 73 là lượt đọc qua closure nên không bị freeze ảnh hưởng. | Có. Đã đọc toàn bộ file, xác nhận cả ba neo: dòng 35 đúng là `export const toolRenderers: Record<string, ToolRenderer> = {`; object literal kết thúc ở dòng 70 bằng `};`; dòng 73 là `setXdevRendererLookup(name => toolRenderers[name]);` với tham số có kiểu `(name: string) => ToolRenderer | undefined` (`packages/tui/src/tools/xdev.ts:48`) — một closure chỉ-đọc. |
| `packages/tui/test/tool-renderers-frozen.test.ts` | tạo | File test mới. Hai test: (1) registry từ chối một lệnh ghi từ bên ngoài, (2) sau lần từ chối đó, đường hợp thức — một tool definition mang hàm render của riêng nó — vẫn render ra byte của chính nó qua `ToolExecutionComponent`, kể cả với một tên tool vốn CŨNG là key của registry, chứng minh freeze không biến global thành đường bắt buộc. | Có, ở mức "thư mục tồn tại và chưa có file này": `packages/tui/test/` tồn tại với 235 file và không có `tool-renderers-frozen.test.ts`. **Nhưng file này hiện KHÔNG chạy được trong checkout này** — xem mục "Xác minh" và "Cổng hoàn thành". Nó được thiết kế là nửa chạy được của cặp, nhưng không phải, vì import registry sẽ tải theo native addon. |
| `packages/coding-agent/test/extension-tool-renderer-registration.test.ts` | tạo | File test mới. Một test: một tool definition đăng ký qua extension API với `renderResult` của riêng nó vẫn tạo ra output đã render sau khi registry bị freeze, chứng minh đường ghi hợp thức không bị freeze đụng tới. Test này chạm `wrapRegisteredTools` từ extension adapter — đúng tầng chép các render hook của definition lên tool object mà transcript đọc. | Có, ở mức "thư mục tồn tại và chưa có file này": `packages/coding-agent/test/` tồn tại, không có file trùng tên. **Cũng đang không chạy được** — đã kiểm chứng bằng probe: import `wrapRegisteredTools` từ `extensibility/extensions/wrapper` ném lỗi thiếu native addon. |
| `packages/tui/package.json` | **không chạm tới** | KHÔNG SỬA. Plan đưa ra việc thu hẹp wildcard export-map `"./*"` (dòng 94) như một phần tuỳ chọn. Không làm việc đó trong work item này — nó là một câu hỏi mở riêng, nó đổi bề mặt công khai, và không cần cho việc freeze. Liệt kê ở đây để không ai "tiện tay" gộp vào. | Có. Wildcard nằm ở dòng 94-97 (`"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }`), **không phải** 93-96 như plan nói. Entry `"./tools"` mà các consumer trong repo thực sự dùng nằm ở dòng 86 và không bị wildcard ảnh hưởng dù theo hướng nào. |

### Các bước

1. **Xác nhận lại zero writer trước khi đụng vào bất cứ thứ gì** — đây là tiền đề duy nhất mà cả mục dựa vào, và nó phải chạy lại vào đúng ngày bạn bắt tay làm, không được tin từ tài liệu này. Neo: `packages/tui/src/tools/index.ts:35`.

   ```bash
   git grep -nE 'toolRenderers\[[^]]*\] *=|toolRenderers\.[A-Za-z_$]+ *=|delete toolRenderers' -- packages
   ```

   Phải trả về **ZERO** hit. Sau đó chạy kiểm kê:

   ```bash
   git grep -n toolRenderers -- packages
   ```

   và xác nhận đúng **14 hit trên 5 file**:
   - `packages/tui/src/tools/index.ts:35,73`
   - `packages/tui/src/chat/tool-execution.ts:17,355`
   - `packages/coding-agent/src/cli/gallery-cli.ts:16,141,307,344`
   - `packages/coding-agent/test/gallery-cli.test.ts:18,79`
   - `packages/coding-agent/test/tools/apply-patch-renderer.test.ts:8,29,77,90`

   Nếu con số đã dịch chuyển thì dừng lại và kiểm kê lại: một writer mới nghĩa là freeze không còn là XS nữa.

2. **Áp dụng thay đổi khai báo.** Neo: `packages/tui/src/tools/index.ts:35`. Thay `export const toolRenderers: Record<string, ToolRenderer> = {` bằng `export const toolRenderers: Readonly<Record<string, ToolRenderer>> = Object.freeze<Record<string, ToolRenderer>>({`. Type argument tường minh trên `Object.freeze` là điểm mấu chốt: nó định kiểu object literal thành `Record<string, ToolRenderer>` (nên 31 kiểu renderer dị dạng vẫn được kiểm tra y như hiện tại), trong khi kiểu khai báo của `const` mang `Readonly` — và đó mới là thứ biến một lệnh ghi thành lỗi compile. Để nguyên cả 31 entry và hai dòng comment alias.

3. **Đóng lời gọi thay vì đóng literal.** Neo: `packages/tui/src/tools/index.ts:70`. Đổi `};` ở dòng 70 thành `});`. Không di chuyển dòng `setXdevRendererLookup(...)` — nó là một closure chỉ-đọc và phải tiếp tục chạy; thực tế đây còn là một thứ đáng để test dựa vào.

4. **Viết test cho freeze.** File: `packages/tui/test/tool-renderers-frozen.test.ts`. Import `toolRenderers` từ đường dẫn source cục bộ `../src/tools/index` (không dùng package specifier — giữ test tự chứa bên trong package). Test 1 khẳng định hợp đồng quan sát được: một importer bên ngoài thử `registry.probe_backdoor = someRenderer` bị từ chối. Vì file test là ESM strict-mode nên phép gán đó ném `TypeError`; hãy assert sự từ chối, và **không** assert rằng `Object.freeze` đã được gọi hay rằng một cờ nội bộ nào đó được bật — đó là assert implementation, không phải hợp đồng. Lưu ý ở đây không có gì để dọn dẹp: đối tượng không thể bị mutate, và chính vì vậy test này an toàn cho cả suite (không cần khôi phục shared state, khác với khuôn mẫc đang có trong repo nơi một global ghi được sẽ buộc phải có `afterEach`). Test 2 chứng minh freeze không làm hỏng đường hợp thức: dựng một object hình dạng `AgentTool` mang `renderResult` (và `renderCall`) của riêng nó, đưa cho `ToolExecutionComponent` với một tên tool **cũng là** key có sẵn như `bash`, điều khiển nó bằng `updateResult`, và assert byte đã render của extension xuất hiện trong `component.render(width)` sau khi bóc ANSI. Sự trùng tên đó là cố ý và mang tính nạp trọng: đó là cách duy nhất để chứng minh một renderer tuỳ chỉnh vẫn có thể thắng global đã đóng băng chứ không bị nó che.

5. **Viết test cho đường hợp thức ở tầng adapter.** File: `packages/coding-agent/test/extension-tool-renderer-registration.test.ts`. Đây là chế độ hỏng khác đau đớn mà freeze có thể gây ra: một freeze vô tình làm hỏng đường ghi hợp lệ chính là thứ đẩy tác giả extension quay lại mutate global, nên nó xứng đáng có test riêng tại đúng tầng nơi definition trở thành tool mà transcript render. Dựng một `RegisteredTool` có definition mang `renderResult`, cho nó đi qua `wrapRegisteredTools`, và assert output render của tool kết quả chứa các byte marker của extension. Không assert vào bên trong; assert vào output đã render. Test này hiện bị chặn trong checkout này — xem trường `gate` để biết lệnh gỡ chặn.

6. **Chạy các cổng theo đúng thứ tự trong mục verification.** Neo: `packages/tui/src/tools/index.ts:35`. Hai lệnh đầu là hai lệnh thực sự chạy được hôm nay; cặp `bun test` thì không, và đó là một điều kiện môi trường có sẵn từ trước chứ không phải do work item này gây ra. Nếu native addon đã được build vào lúc bạn nhặt việc này thì chạy luôn cặp test — chúng được viết để làm regression pin, không phải để chứng minh thay đổi chạy được.

### Hình dạng code

```typescript
// packages/tui/src/tools/index.ts — dòng 35 và dòng 70 là HAI dòng duy nhất thay đổi.

-/** Renderers keyed by tool name (plus `apply_patch`/`reject` aliases that share a renderer). */
-export const toolRenderers: Record<string, ToolRenderer> = {
+/** Renderers keyed by tool name (plus `apply_patch`/`reject` aliases that share a renderer).
+ *  Frozen: this is core's built-in presentation, not an extension point. A plugin that
+ *  wants a different transcript for its own tool declares `renderCall`/`renderResult` on
+ *  the tool definition — that path is per-tool, ordered, and owned by the runner. Writing
+ *  here would repaint every tool for the whole process, so it is closed. */
+export const toolRenderers: Readonly<Record<string, ToolRenderer>> = Object.freeze<Record<string, ToolRenderer>>({
 	ask: askToolRenderer,
 	... 29 more entries, unchanged ...
 	write: writeToolRenderer,
-};
+	});

// dòng 73 KHÔNG ĐỔI và vẫn đúng — nó là một lượt đọc qua closure:
// setXdevRendererLookup(name => toolRenderers[name]);

// Vì sao `Readonly<>` chứ không chỉ `Object.freeze`:
//   Object.freeze một mình là chốt bảo vệ CHỈ Ở RUNTIME. `export const x: Record<string, T> = ...`
//   giữ nguyên kiểu khai báo `Record<string, T>`, nên một người đóng góp tương lai viết
//   `toolRenderers.grep = myRenderer` vẫn qua `bun check` và chỉ nổ lúc runtime, trong
//   session của người khác. Khai báo const là `Readonly<...>` đưa chốt chặn về compile time.
//   ĐÃ KIỂM CHỨNG: với annotation Readonly đã đặt, câu
//   `toolRenderers.probe_backdoor = toolRenderers.bash;` fail tsgo với
//   `TS2542: Index signature in type 'Readonly<Record<string, ToolRenderer>>' only permits reading.`
//   Freeze ở runtime vẫn được giữ lại vì một cast (`as Record<string, ToolRenderer>`) vẫn
//   lọt qua kiểu, mà kiểu thì không chặn nổi một cast.
```

### Hợp đồng test

**Hai hợp đồng, mỗi test file một cái, cố ý không trùng lặp.**

**(1) `packages/tui/test/tool-renderers-frozen.test.ts`** — "Một importer bên thứ ba không thể tô lại cách core render tool có sẵn cho cả tiến trình." Nếu hồi quy, người tiêu dùng thấy: một plugin gán `toolRenderers.grep = ...` sẽ âm thầm cướp transcript của **mọi** lệnh gọi grep trong **mọi** session, cho **mọi** importer khác của module đó, không chủ sở hữu, không thứ tự, và không cách nào để gỡ xuống. Chính vì vậy test này được phép tồn tại dù AGENTS.md nói chung rất thù địch với các test về wiring nội bộ: thứ được bảo vệ ở đây không phải private state mà là **output của một consumer khác**, và đó chính là định nghĩa của một hợp đồng quan sát được từ bên ngoài. Test cũng **không** assert rằng `Object.freeze` đã được gọi — assert cơ chế thay vì bảo đảm là đúng loại test sống sót qua refactor mà không chứng minh điều gì.

**(2) `packages/coding-agent/test/extension-tool-renderer-registration.test.ts`** — "Đường hợp thức không bị freeze ảnh hưởng." Nếu hồi quy, người tiêu dùng thấy: một tool definition mang `renderResult` của riêng nó vẫn render ra byte của chính nó sau khi freeze. Chế độ hỏng mà test này chống lại là chế độ tinh vi: một freeze làm hỏng đường ghi hợp lệ không làm cái gì nổ tung ồn lào, nó chỉ đẩy tác giả extension quay lại mutate global, phá hủy toàn bộ ý nghĩa của mục này trong khi mọi test vẫn xanh. Test assert output đã render, chứ không phải "adapter đã chép đúng hai field".

Test thứ hai đáng giá vì nó nằm ở tầng khác, chứ không phải vì nó kể lại test thứ nhất: test thứ nhất chứng minh global đã đóng, test thứ hai chứng minh cánh cửa bên cạnh vẫn mở. Nếu trong checkout này chỉ chạy được một trong hai, hãy chạy cái thứ nhất — nó gần hơn với thay đổi.

### Xác minh

**CHẠY ĐƯỢC HÔM NAY** (đã xác minh xanh khi có thay đổi, rồi đã revert):

```bash
# 1
bun run --cwd packages/tui check:types
# 2
bun run --cwd packages/coding-agent check:types
# 3
bunx oxlint packages/tui/src/tools/index.ts && bunx oxfmt --check packages/tui/src/tools/index.ts
# 4
bun run check:ts   # cổng toàn repo mà plan nêu; hai lệnh trên là tập con nhanh
```

- Lệnh 1: pass sạch. ĐÃ XÁC MINH: đã áp thay đổi, chạy, exit 0, không diagnostic.
- Lệnh 2: pass sạch. ĐÃ XÁC MINH: đây mới là bằng chứng tương thích thật, vì package coding-agent là nơi 10 trong 14 consumer nằm, và `Readonly<...>` là kiểu hẹp hơn thứ nó thay thế. Exit 0, không diagnostic.
- Lệnh 3: cả hai sạch. ĐÃ XÁC MINH.

**KHÔNG CHẠY ĐƯỢC TRONG CHECKOUT NÀY** — đúng lệnh mà plan nêu, và lý do nó fail:

```bash
bun run check:ts && (cd packages/tui && bun test test/tool-renderers-frozen.test.ts) && (cd packages/coding-agent && bun test test/extension-tool-renderer-registration.test.ts)
# -> 'Failed to load pi_natives native addon for darwin-arm64' và 0 pass, trên CẢ HAI file test.
```

Plan tưởng chỉ có nửa coding-agent bị chặn; nửa tui cũng bị chặn. Cạnh import chính xác và lệnh gỡ chặn nằm ở bảng "Đính chính so với plan", mục 3.

### Cổng hoàn thành

XONG khi, theo đúng thứ tự:

- **(a)** `bun run --cwd packages/tui check:types` xanh **VÀ** `bun run --cwd packages/coding-agent check:types` xanh khi đã áp freeze, **VÀ** file `packages/tui/test/tool-renderers-frozen.test.ts` chứa khẳng định ở TẦNG KIỂU dưới đây. Lớp thứ ba là phần không được bỏ: typecheck trần xanh trên **cả** bản `Object.freeze` không kèm `Readonly`, nên nếu không có nó thì "làm đủ hai nửa" và "chỉ làm nửa runtime" là hai trạng thái không phân biệt được.

  ```ts
  import { expect, test } from "bun:test";
  import { toolRenderers } from "../src/tools/index";

  // Nửa kiểu của hợp đồng: directive này thành UNUSED (TS2578) ngay khi `toolRenderers`
  // được khai báo ghi được, nên bỏ annotation `Readonly` làm check:types exit 1 —
  // không cần native addon, không cần chạy runtime.
  test("registry is read-only at the type level", () => {
  	expect(toolRenderers.bash).toBeDefined();
  	// @ts-expect-error toolRenderers phải từ chối ghi — backdoor đã đóng.
  	toolRenderers.probe_backdoor = toolRenderers.bash;
  });
  ```

  Đây là type test thuần, không phải assert implementation: `packages/tui/tsconfig.json` khai báo `include: ["src", "test"]`, nên `tsgo -p tsconfig.json --noEmit` thuộc cổng (a) thật sự đọc file này. ĐÃ KIỂM CHỨNG: bản `Readonly` đầy đủ → `check:types` exit 0; bỏ đúng annotation `Readonly` (giữ nguyên `Object.freeze`) → `test/tool-renderers-frozen.test.ts(6,2): error TS2578: Unused '@ts-expect-error' directive.`, exit 1. `oxlint` và `oxfmt --check` trên file test này đều exit 0. Không `mock.module()`, không source-grep, không native addon.
- **(b)** `git grep -nE 'toolRenderers\[[^]]*\] *=|toolRenderers\.[A-Za-z_$]+ *=|delete toolRenderers|Object\.assign\(toolRenderers|Reflect\.(set|defineProperty)\(toolRenderers' -- packages` vẫn trả về **zero** hit — tức thay đổi không sinh ra writer nào. Mẫu này phải **rộng bằng hoặc rộng hơn** mẫu kiểm kê ở bước 1 và ở đính chính số 6, không được hẹp hơn: `delete toolRenderers` và `Object.assign(toolRenderers, …)` là writer thật, và một cổng bỏ sót chúng thì xanh trong khi backdoor vẫn mở. ĐÃ KIỂM CHỨNG: trên cây sạch cả ba mẫu đều zero hit, và `Object.assign(toolRenderers, { grep: x })` / `Reflect.set(toolRenderers, "grep", x)` cho **0** hit dưới mẫu hẹp ban đầu.
- **(c)** Cả hai file test mới tồn tại và **đã được commit**, dù chúng không chạy được ở đây. Chúng là regression pin cho người build addon tiếp theo; xoá chúng đi vì chúng đang đỏ chính là chế độ hỏng mà mục này dễ rơi vào nhất.
- **(d)** KHÔNG phải cổng: `bun test` có pass hay không. Nó không thể, trong checkout này, vì những lý do có trước work item này. Nếu kỹ sư báo "test đỏ", hãy kiểm tra xem cái đỏ có phải thiếu native addon không trước khi điều tra thay đổi của họ.

**Cổng có thực sự đỏ được không:** Có, nhưng **chỉ sau khi thêm khẳng định tầng kiểu ở mục (a)**. Cần nói thẳng một điều đã đo, không phải suy luận: typecheck trần **không** phân biệt được hai trạng thái. Đo lại từ đầu — (i) với `Readonly` đầy đủ **và** dòng writer thật `toolRenderers.probe_backdoor = toolRenderers.bash;` chèn ở `packages/tui/src/chat/tool-execution.ts:355`, `bun run --cwd packages/tui check:types` exit 1 với `src/chat/tool-execution.ts(355,3): error TS2542: Index signature in type 'Readonly<Record<string, ToolRenderer<unknown, unknown>>>' only permits reading.`; (ii) với `Object.freeze` **nhưng không** `Readonly`, giữ nguyên dòng writer thật đó, cùng lệnh đó exit **0**, không diagnostic. Cổng (a) vì thế đỏ trên một bản sửa giả lập của người khác trong tương lai, chứ không đỏ trên chính thay đổi đang review — và chính vì vậy nửa `Readonly` mà không có khẳng định tầng kiểu là một nửa không ai nhìn thấy là thiếu. Khẳng định `@ts-expect-error` ở mục (a) là thứ đóng lỗ hổng đó: nó làm cùng lệnh `check:types` đỏ (TS2578) ngay khi `Readonly` bị rơi, dù thay đổi gốc vẫn hoàn hảo. Cả hai probe đã chạy, đã đo exit code, và cây đã revert. Đó chính là lý do bước 2 đòi cả hai nửa **và** mục (a) đòi cả ba điều kiện.

### Phụ thuộc

- `depends_on`: **không**. Wave 2 gồm WI-1 nửa timer, WI-2, WI-4 — ba work item độc lập, không mục nào chặn mục nào.
- `blocks`: **WI-7** (registerMode — M2 wave 5). Thứ tự plan nói rõ: làm WI-4 trước để việc unload có một bản kiểm kê đầy đủ về những gì phải được giải phóng. Một global đã đóng băng thì không có gì để giải phóng, và đó là thứ làm cho cuộc rà soát tài nguyên của WI-7 trở nên dễ kiểm chứng.

### Cách sai dễ nhất

Cách dễ sai nhất là coi "test đang đỏ" là "thay đổi của tôi hỏng" rồi hoặc xoá test đi, hoặc revert freeze cho nó chạy được. Cả hai đều sai và cả hai đều lặng lẽ phá hủy mục này. Cái đỏ là một native addon thiếu có sẵn từ trước; thay đổi thì chứng minh được là an toàn mà không cần nó. Sai lầm thứ hai dễ gặp nhất là gộp luôn việc thu hẹp export-map tuỳ chọn (`"./*"` tại `packages/tui/package.json:94`) vào diff này vì nó được mô tả là việc liền kề — nó đổi bề mặt công khai, nó là một câu hỏi mở chưa có câu trả lời, và nó không cần cho việc freeze. Sai lầm thứ ba là freeze mà thiếu kiểu `Readonly`: bản đó chỉ là chốt bảo vệ ở runtime, `bun check` vẫn không bắt được một writer tương lai, và mục tiêu đã tuyên bố của mục này (đóng backdoor để nó không thể âm thầm mở lại) mới chỉ được giao một nửa.

### Cần người quyết

- **Annotation `Readonly<>` nên nằm trong WI-4 hay chờ "WI-4b" mà plan liên tục hoãn?** Chính các mục sau trong plan (quanh dòng 7866 và 8076 của nó) thừa nhận `Object.freeze` một mình không mang cơ chế cưỡng chế nào và ràng buộc phải đến từ kiểu — nhưng WI-4b không xuất hiện ở bất kỳ đâu trong bảng wave của M2, nên hiện tại không ai sở hữu nó. Bằng chứng thu thập ở đây nói phần kiểu là **miễn phí**: `Readonly<Record<string, ToolRenderer>>` type-check sạch với cả 14 consumer ở cả hai package, và nó biến một lệnh ghi thành TS2542. **KHUYẾN NGHỊ:** đặt nó ở đây, trong WI-4, và đóng WI-4b là "đã xong". Đây là một quyết định, không phải nút chặn — nếu reviewer không đồng ý thì bỏ đi chỉ là một revert một token, còn freeze vẫn đứng vững bằng riêng nó.
- **Ai build native addon, và khi nào?** Cả hai file test của mục này — và một phần lớn test suite của cả repo — đang phụ thuộc vào `packages/natives/native/pi_natives.darwin-arm64.node`, mà bazel **không** được cài trong môi trường này, nên lệnh build đã ghi tại tài liệu không chạy được ở đây. Chuyện này không riêng WI-4, nhưng WI-4 là work item M2 đầu tiên dính vào nó, nên lệnh xác minh mà nó tuyên bố là không chạy được. Một quyết định ở tầm M2 về "test nào cần addon" và "test nào không" sẽ gỡ chặn được nhiều wave cùng lúc.
- **Value import `@oh-my-pi/pi-natives` tại `packages/tui/src/theme/theme.ts:3` có đáng tách ra không** để các test phụ thuộc theme chạy được không cần addon? Chính một import đó làm cho **toàn bộ** registry tool-renderer không nạp được trong môi trường này — mọi renderer đều nhận một `Theme`, nên mọi module renderer đều tải theo module theme. Ngoài phạm vi của WI-4 và có lẽ không đáng làm chỉ vì bản thân nó, nhưng đây là nguyên nhân gốc và nó rẻ để gọi tên ngay bây giờ.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| Đường ghi hợp thức nằm ở `packages/coding-agent/src/extensibility/extensions/types.ts:1322`. | **STALE** — sai dòng, và chỉ vào một khai báo không liên quan | Dòng 1322 là `on(event: "tool_execution_end", handler: ExtensionHandler<ToolExecutionEndEvent>): void;` — một đăng ký event, không phải đường đăng ký tool. Các neo đúng: interface `ToolDefinition` bắt đầu ở `types.ts:636`; field `renderCall` của nó ở `types.ts:686` và field `renderResult` ở `types.ts:689`; khai báo `registerTool` trên extension API ở `types.ts:1347`. Plan trích `:661` và `:664` ở hai chỗ khác — chúng cũng lệch; hãy dùng 686 và 689. Bằng chứng: `grep -n 'registerTool<TParams' packages/coding-agent/src/extensibility/extensions/types.ts` → 1347; `grep -n 'renderCall\|renderResult' .../types.ts` → 686 và 689; `grep -rn 'interface ToolDefinition' packages/coding-agent/src/` → `types.ts:636`; `sed -n '1300,1360p'` xác nhận dòng 1322 là event `tool_execution_end`. |
| `RegisteredToolAdapter` bọc render hook tại `wrapper.ts:54-62`. | **NEARLY CORRECT** — lệch ở cuối | Dải binding là dòng **54-66**, không phải 54-62 (cũng không phải 54-63). Dòng 50-53 là comment giải thích vì sao các method được định nghĩa có điều kiện; 54-57 là phép gán `renderCall`; 58-66 là phép gán `renderResult`, trong đó `args,` ở dòng 64, `);` đóng lời gọi ở dòng 65, và `}` đóng khối `if` ở dòng 66. Bằng chứng: `awk 'NR>=50 && NR<=66 {printf "%d: %s\n", NR, $0}' packages/coding-agent/src/extensibility/extensions/wrapper.ts` (phải mở rộng tới 66, không phải 64). |
| Lệnh xác minh là `bun run check:ts && (cd packages/tui && bun test test/tool-renderers-frozen.test.ts) && (cd packages/coding-agent && bun test test/extension-tool-renderer-registration.test.ts)`, kèm ghi chú rằng chỉ nửa coding-agent bị chặn bởi môi trường. | **WRONG** — **cả hai** file test đều bị chặn, gồm cả nửa tui mà plan coi là chạy được | `bun test` bị chặn với bất kỳ thứ gì tải theo native addon, ở **cả hai** package. Đã kiểm chứng bằng probe: trong `packages/tui`, `import * as m from "../src/tools/index"` fail với lỗi thiếu addon, và package specifier `@oh-my-pi/pi-tui/tools` cũng vậy. Cạnh import chính xác là `packages/tui/src/theme/theme.ts:3` — `import { detectMacOSAppearance, MacAppearanceObserver } from "@oh-my-pi/pi-natives"` — một VALUE import (không phải `import type`). Mọi `ToolRenderer` đều nhận một `Theme`, nên mọi module renderer đều tải theo module theme, nên toàn bộ registry không nạp được nếu thiếu addon. Chỉ `../src/tools/renderer` (module type-only) nạp sạch. Nửa coding-agent bị chặn riêng: import `wrapRegisteredTools` từ `extensibility/extensions/wrapper` đi tới `../../tools/approval`, `../../tools/essential-tools` và `../../tools/file-write-fallback`, và probe ném lỗi. Lệnh gỡ chặn là `bun --cwd=packages/natives run build` — nhưng script đó là `bun ../../scripts/bazel-natives.ts host --dest native`, mà bazel **KHÔNG** được cài trong môi trường này, nên không thể gỡ chặn tại đây. Hệ quả thực tế: `bun run check:ts` là cổng thật duy nhất cho tới đó, và đó chính là lý do nửa kiểu `Readonly` của thay đổi này quan trọng đến vậy — nó là nửa mà `check:ts` thực sự trông giữ được. Bằng chứng: probe trong `packages/tui` cho ra `../src/tools/renderer` → OK; `../src/tools/index` → 'Failed to load pi_natives native addon for darwin-arm64'; `@oh-my-pi/pi-tui/tools` → như trên; `../src/theme/theme` → như trên; `../src/chat/tool-execution` → như trên. Cả 23 module renderer con dưới `src/tools/` đều probe là bị chặn. Đối chứng với file có sẵn: `packages/tui/test/countdown-timer.test.ts` chạy xanh (2 pass), nên `bun test` bản thân nó hoạt động — cái bị chặn là import graph. Trong `packages/coding-agent`, `bun test test/tools/apply-patch-renderer.test.ts` → 0 pass / 1 fail với cùng lỗi addon, và một probe import `wrapRegisteredTools` tái hiện nó. `which bazel bazelisk` → not found. |
| WI-4 là `Object.freeze(toolRenderers)` — một chốt bảo vệ ở runtime. (Chính các mục sau của plan thừa nhận điều này không mang cơ chế cưỡng chế nào và ràng buộc phải đến từ kiểu, hoãn nửa kiểu lại cho một "WI-4b" không xuất hiện ở bảng wave của M2.) | **UNDERSPECIFIED** — nửa runtime một mình không giao được mục tiêu đã tuyên bố | `Object.freeze` trên một `const` khai báo là `Record<string, ToolRenderer>` là vô hình với `bun check`: một người đóng góp tương lai viết `toolRenderers.grep = x` vẫn type-check và vẫn compile. Mục tiêu của mục này — đóng backdoor để nó không thể âm thầm mở lại — vì thế chỉ được giao một nửa bởi riêng freeze. Hãy thêm annotation kiểu `Readonly`. Nó miễn phí, và điều này đã được kiểm chứng chứ không phải suy luận: với `Readonly<Record<string, ToolRenderer>>` đã đặt, `bun run --cwd packages/tui check:types` và `bun run --cwd packages/coding-agent check:types` đều pass sạch, và một dòng ghi được chèn `toolRenderers.probe_backdoor = toolRenderers.bash;` tại `tool-execution.ts:355` fail với `TS2542: Index signature in type 'Readonly<Record<string, ToolRenderer<unknown, unknown>>>' only permits reading.` Vì WI-4b không ai sở hữu trong bảng wave, gộp nó vào đây là cách để nó thôi là việc của không ai. Vẫn giữ freeze ở runtime — kiểu không chặn nổi một cast. Bằng chứng: đã áp thay đổi hai dòng vào một bản sao tạm, chạy `bun run --cwd packages/tui check:types` → exit 0; `bun run --cwd packages/coding-agent check:types` → exit 0; `bunx oxlint` → sạch; `bunx oxfmt --check` → sạch. Sau đó chèn một dòng ghi và chạy lại type check của tui → `src/chat/tool-execution.ts(355,3): error TS2542: Index signature in type 'Readonly<Record<string, ToolRenderer<unknown, unknown>>>' only permits reading.` Cây đã revert; `git status --porcelain` chỉ hiện output spec chưa track. |
| Export-map wildcard nằm ở `packages/tui/package.json:93-96`. | **STALE** — lệch một dòng | Entry `"./*"` nằm ở dòng **94-97**. Entry `"./tools"` mà các consumer trong repo thực sự resolve qua nằm ở dòng 86, và nó là một entry riêng, tường minh, mà wildcard không che. Bằng chứng: `grep -n '"\./\*"\|"\./tools"' packages/tui/package.json` → 86 cho `"./tools"`, 94 cho `"./*"`, 98 cho `"./components/*"`, 102 cho `"./*.js"`. |
| Có đúng 14 tham chiếu `toolRenderers` trong repo, trên 5 file, tất cả chỉ-đọc, không có phép gán nào. | **CONFIRMED** — đừng suy diễn lại điều này | Đã chạy lại `git grep -n toolRenderers -- packages` và nhận đúng 14 hit trên đúng 5 file được nêu, đúng những số dòng plan liệt kê. Cũng đã chạy probe writer trên toàn repo và nhận zero hit cho `toolRenderers[x] =`, `toolRenderers.foo =`, và `delete toolRenderers`. Việc plan hạ cấp từ S xuống XS dựa trên bản kiểm kê này là có cơ sở. Bằng chứng: `git grep -n toolRenderers -- packages` → 14 dòng rải ở `gallery-cli.ts`(4), `gallery-cli.test.ts`(2), `apply-patch-renderer.test.ts`(4), `tool-execution.ts`(2), `tools/index.ts`(2). `git grep -n 'toolRenderers\[.*\]\s*=\|delete toolRenderers\|Object.assign(toolRenderers'` → không có hit. |

## Cần người xác nhận

Hai điểm mà bản đặc tả tự mâu thuẫn. Ghi lại nguyên trạng, không tự sửa:

1. **"Đừng suy diễn lại" vs "phải chạy lại vào ngày làm".** Đính chính số 6 kết luận bằng vỏ để mời `"CONFIRMED — do not re-derive this"` và `"Saving you the hour."` cho việc kiểm kê 14 hit. Nhưng bước 1 nói tiền đề duy nhất mà cả mục dựa vào **phải được chạy lại vào đúng ngày triển khai, không được tin từ tài liệu này**, và lặp lại chính hai lệnh `git grep` đó. Hai câu này cùng đúng nếu hiểu là "đừng suy diễn lại trong lúc đọc" và "cứ chạy lại lúc làm" — nhưng văn bản không nói ra ranh giới đó. Cần người đọc xác nhận bước 1 là bắt buộc (và vậy câu "do not re-derive" chỉ áp cho bước đọc-kỹ-lý), hay hai câu đang thật sự mâu thuẫn.

2. **Nửa `Readonly` vừa là bước không-điều-kiện vừa là câu hỏi mở.** Bước 2 và bước 3 viết thay đổi `Readonly<...>` một cách vô điều kiện, và đính chính số 4 kêu gọi thêm nó như một phần bắt buộc của mục. Nhưng câu hỏi mở đầu tiên lại hỏi liệu nó có nên nằm trong WI-4 hay không, và kết luận `"RECOMMENDATION: land it here"` cùng điều kiện `"This is a decision, not a blocker"`. Tức là danh sách bước đã khoá một thứ mà phần câu hỏi mở vẫn đang để ngỏ. Cần biết bước 2 có được viết theo lời khuyến nghị (và phần `Readonly` là bắt buộc) hay theo trạng thái trước quyết định (và phần `Readonly` là tùy chọn, bỏ đi chỉ là một revert một token).


---


## WI-5. Capability registry có chủ sở hữu, có unregister, và có một reset thật sự

**Thay đổi gì:** Đổi tên `reset` của capability registry thành `invalidateAllCaches` trung thực, thêm một `resetRegistry()` riêng biệt thực sự xoá các định nghĩa capability, rồi tra cho các provider đã đăng ký một `sourceId` chủ sở hữu cùng một `unregisterProvidersForSource()` để đóng góp của một extension bị suspend thực sự được giải phóng. **Wave:** trải trên hai wave: commit 1 ở wave 3 (không điều kiện), commits 2-3 ở wave 4 (phụ thuộc M2-OQ2 từ wave 1). **Effort:** S cho commit 1, M cho commits 2-3. Ba commit, ba PR. Commit 1 là việc cơ học (8 dòng import, 12 call site, 1 comment) nhưng type checker sẽ liệt kê giúp bạn mọi lời gọi. Commits 2-3 là khoảng 40 dòng code registry mới cộng một dòng trong hot path.

**Người dùng thấy:** Commit 1 vô hình nhưng chặn một quả bom hẹn giờ: mọi người đọc capability registry từ nay được cho biết `reset` thực sự làm gì. Commits 2-3 KHÔNG phải hành vi nhìn thấy được: sau khi ship, tắt một extension trong settings sẽ GỌI teardown các capability provider của nó — nhưng vì chưa có call site nào đăng ký provider kèm `sourceId`, lời gọi đó hôm nay luôn trượt và không giải phóng gì cả. Người dùng sẽ không thấy khác biệt nào; extension bị vô hiệu hoá vẫn giữ nguyên đóng góp. Đây là nền cho WI-10, và mô tả PR không được hứa hành vi.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/capability/index.ts` | sửa | COMMIT 1: đổi tên `export function reset()` ở :554-556 thành `invalidateAllCaches()`; thêm `export function resetRegistry(): void` chỉ xoá map `capabilities`. COMMIT 2: thêm hai Map ở cấp module cạnh ba Map sẵn có ở :34/:37/:40 — `const providersBySource = new Map<string, Set<string>>()` và `const providerSourceByName = new Map<string, string>()`; thêm tham số thứ ba tuỳ chọn `sourceId?: string` vào `registerProvider<T>` ở :101, ghi lại attribution và đuổi chủ sở hữu cũ (mirror `model-registry.ts:3011-3019`). COMMIT 3: thêm `export function unregisterProvidersForSource(sourceId: string): void` tra danh sách providerId của source, splice từng cái ra khỏi mảng `providers` của capability tương ứng, dọn `providerCapabilities`, và xoá cả hai entry attribution. | có (verified=true) |
| `packages/coding-agent/src/main.ts` | sửa | COMMIT 1: dòng import :24 thành `import { invalidateAllCaches } from "./capability";` (bỏ alias `as resetCapabilities`); call site :872 thành `invalidateAllCaches();`. Đây là đường resume-with-chdir — chạy ngay sau `clearPluginRootsAndCaches()` và trước khi preload lại ở đích. | có |
| `packages/coding-agent/src/sdk.ts` | sửa | COMMIT 1: dòng import :51 thành `import { invalidateAllCaches, loadCapability } from "./capability";`; call site :4571 (trong `reconcileExtensionSources`) thành `invalidateAllCaches();`; comment giải thích ở :3528 được viết lại để nêu tên hàm mới. COMMIT 3: trong cùng `reconcileExtensionSources`, ngay sau `const { suspended, resumed } = extensionRunner.setSuspendedExtensions(...)` mở ở :4579 (đóng ở :4581), thêm `for (const extension of suspended) unregisterProvidersForSource(extension.path);` — MỞ RỘNG nhánh suspend của WI-1 nếu nó đã tồn tại, đừng tạo lại. | có |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | COMMIT 1: dòng import :112 thành `import { invalidateAllCaches } from "../capability";`; cả ba call site — :5435 (ranh giới `/clear`, ngay sau `appendResetBoundary()`), :5820, :8811 — thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/session/session-tools.ts` | sửa | COMMIT 1: dòng import :6 thành `import { invalidateAllCaches } from "../capability";`; call site :1651 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/modes/controllers/ssh-command-controller.ts` | sửa | COMMIT 1: dòng import :7 thành `import { invalidateAllCaches } from "../../capability";`; cả hai call site :208 và :369 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/modes/controllers/selector-controller.ts` | sửa | COMMIT 1: dòng import :25 thành `import { invalidateAllCaches } from "../../capability";`; call site :310 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/slash-commands/builtin-marketplace.ts` | sửa | COMMIT 1: dòng import :1 thành `import { invalidateAllCaches } from "../capability";`; call site :36 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/slash-commands/helpers/ssh.ts` | sửa | COMMIT 1: dòng import :2 thành `import { invalidateAllCaches } from "../../capability";`; cả hai call site :146 và :167 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/test/capability/reset-contract.test.ts` | tạo | MỚI, commit 1. Đúng hai khối `test()`, theo thứ tự này. Row 1 (hợp đồng âm; đỏ trên HEAD vì import, xanh ngay sau commit 1): sau `invalidateAllCaches()`, `getCapability(<module-level id>)` vẫn trả về capability — chọn một cái thật bằng cách import module định nghĩa, ví dụ `import { toolCapability } from "@oh-my-pi/pi-coding-agent/capability/tool"`, để `defineCapability` ở cấp module tại `capability/tool.ts:27` thực sự đã chạy. Row 2 (bản sửa có thể bị từ chối, đỏ trên HEAD vì `resetRegistry` chưa tồn tại — cùng lý do đỏ ở dòng import, không phải ở assertion): sau `resetRegistry()`, `getCapability(same id)` là `undefined`. | có |
| `packages/coding-agent/test/capability/provider-source-attribution.test.ts` | tạo | MỚI, commits 2-3. Ba khối `test()`. (a) một provider đăng ký kèm `sourceId` biến mất khỏi danh sách ĐÃ PHÂN GIẢI sau `unregisterProvidersForSource(sourceId)` — đọc danh sách đã phân giải qua `getCapabilityInfo(capabilityId)?.providers`, không đọc map nội bộ, vì đó mới là thứ discovery và settings UI thực sự đọc. (b) hai source đăng ký provider cho cùng một capability; suspend một cái thì provider của source kia vẫn còn trong danh sách đã phân giải — row hợp đồng âm chứng minh attribution là thật và rằng `unregisterProvidersForSource` không xoá quá tay. (c) `resetRegistry()` không đụng tới attribution sẵn có: sau đó, provider từ hai sourceId khác nhau đều vẫn còn trong danh sách đã phân giải. | có |

Ghi chú đã kiểm chứng kèm theo từng file: `capability/index.ts` dài 588 dòng, các neo đã xác nhận là Maps ở :34/:37/:40, hai mutable Set ở :43/:44, `defineCapability` :89, `registerProvider` :101, `getCapability` :459, `reset` :554-556, `resetCapabilityForTests` :561-566, `invalidate` :572; khoảng plan trích :30-41 và :99-127 lệch vài dòng và :30-41 bỏ sót hai Set. `main.ts`: plan nói :871, thực tế là :872 ở HEAD 808b365. `sdk.ts`: plan nói :4565 cho call và :4560-4624 cho hàm; thực tế là :4571 và hàm mở ở :4566; `setSuspendedExtensions` trả về `{ suspended: Extension[]; resumed: Extension[] }` và `Extension.path` chính là id mà model registry đã dùng làm sourceId (`loader.ts:363`). `agent-session.ts`: plan nói :5405/:5790/:8779, cả ba đã trôi; cái :5435 xác nhận là đường `/clear`. `session-tools.ts`: plan nói :1557, thực tế :1651. Hai file còn lại (`ssh-command-controller.ts`, `selector-controller.ts`, `builtin-marketplace.ts`, `helpers/ssh.ts`) khớp chính xác với plan. Thư mục `packages/coding-agent/test/capability/` đã tồn tại và chứa 3 test (fs-special-files, rule-agents, rule-buckets); `getCapabilityInfo` ở `capability/index.ts:473` trả về `{ id, displayName, description, providers: [{id, displayName, description, priority, enabled}] }` — chính mảng đã phân giải đó là bề mặt quan sát được.

### Các bước

1. Xác nhận trạng thái cây mà bạn bắt đầu: `git -C /Users/tranquangdang21/Projects/ultraworkers rev-parse --short HEAD` và `git -C /Users/tranquangdang21/Projects/ultraworkers branch --show-current`. Rồi chạy `git -C /Users/tranquangdang21/Projects/ultraworkers grep -n 'reset as resetCapabilities' -- packages/coding-agent/src` và `git -C /Users/tranquangdang21/Projects/ultraworkers grep -n 'resetCapabilities()' -- packages/coding-agent/src`. Bạn phải thấy 8 dòng import và 12 call site. Hai lệnh grep đó — không phải số dòng trong đặc tả này — mới là chuẩn; nhiều neo trong plan nguồn đã trôi sau khi HEAD dời tới 808b365. (anchor: repo root)

2. COMMIT 1 — chọn tên trước và viết nó vào mô tả PR trước khi đụng vào code. Dùng `invalidateAllCaches` trừ khi bạn có lý do tốt hơn. Mở `packages/coding-agent/src/capability/index.ts`, tới dòng 554, đổi export từ `export function reset(): void { clearFsCache(); }` thành `export function invalidateAllCaches(): void { clearFsCache(); }`, sửa doc comment phía trên để nói rằng nó xoá cache discovery trên filesystem sau một lần chdir hoặc thay đổi filesystem — và nói rõ KHÔNG phải registry. Để nguyên `resetCapabilityForTests` ở :561; đó là hàm khác, việc khác. (anchor: `packages/coding-agent/src/capability/index.ts:554`)

3. Vẫn commit 1: thêm `resetRegistry()` ngay sau `invalidateAllCaches` trong cùng phần Cache Management. Nó chỉ xoá map định nghĩa và không gì khác — không mảng provider, không `providerCapabilities`, không `providerMeta`, không fs cache, và (từ commit 2) không map attribution. Doc comment của nó phải nói rằng nó dành cho test và đường reload extension tương lai, rằng không call site sống nào gọi nó, và rằng gọi nó sẽ làm mất các định nghĩa capability ở cấp module cho suốt phần đời còn lại của process vì ESM đánh giá mỗi module định nghĩa đúng một lần. Câu cuối đó là toàn bộ lý do hàm này nguy hiểm và nó phải nằm trong code, không chỉ trong đặc tả này. (anchor: `packages/coding-agent/src/capability/index.ts:557`)

4. COMMIT 1 — cập nhật cả 8 dòng import. Với từng file main.ts:24, sdk.ts:51, session/agent-session.ts:112, session/session-tools.ts:6, modes/controllers/selector-controller.ts:25, modes/controllers/ssh-command-controller.ts:7, slash-commands/builtin-marketplace.ts:1, slash-commands/helpers/ssh.ts:2 — thay `import { reset as resetCapabilities } from "...capability"` bằng `import { invalidateAllCaches } from "...capability"`, bỏ hẳn alias `as resetCapabilities`. Với sdk.ts:51 giữ luôn `loadCapability` trong cùng câu lệnh. Đừng giữ alias: alias là nửa sau của lời nói dối, giữ nó nghĩa là người đọc kế tiếp vẫn tin rằng reconcile loop giải phóng capability. (anchor: `packages/coding-agent/src/main.ts:24 (and 7 siblings)`)

5. COMMIT 1 — cập nhật cả 12 call site thành `invalidateAllCaches();` — main.ts:872, sdk.ts:4571, session/agent-session.ts:5435/:5820/:8811, session/session-tools.ts:1651, modes/controllers/selector-controller.ts:310, modes/controllers/ssh-command-controller.ts:208/:369, slash-commands/builtin-marketplace.ts:36, slash-commands/helpers/ssh.ts:146/:167. Rồi viết lại comment ở sdk.ts:3528 hiện đang ghi 'resetCapabilities() clears the fs cache at those boundaries' để dùng tên mới. Một call site bị sót không phải là bug âm thầm — nó là lỗi kiểu, và đó là lý do commit này rẻ. Chạy `git grep -n resetCapabilities -- packages/coding-agent/src` sau đó và xác nhận bạn nhận được 0 kết quả. (anchor: `packages/coding-agent/src/sdk.ts:4571`)

6. COMMIT 1 — viết `packages/coding-agent/test/capability/reset-contract.test.ts` với đúng hai test theo thứ tự này. Row 1 khẳng định hợp đồng âm: gọi `invalidateAllCaches()`, rồi khẳng định `getCapability(toolCapability.id)` vẫn defined. Import `toolCapability` từ `@oh-my-pi/pi-coding-agent/capability/tool` để `defineCapability` ở cấp module tại `capability/tool.ts:27` đã chạy. Row này đỏ trên HEAD chỉ vì dòng import (xanh ngay sau commit 1), và từ đó trở đi nó đỏ ngay khi có ai thêm `capabilities.clear()` vào hàm vừa đổi tên — đó là toàn bộ công việc của nó. Row 2 khẳng định hợp đồng mới: gọi `resetRegistry()`, rồi khẳng định `getCapability(toolCapability.id)` là `undefined`. Row này đỏ trên HEAD vì hàm chưa tồn tại (xem cổng (2): trên HEAD cả file đỏ ở dòng import, chưa chạy tới assertion nào). Đừng đảo thứ tự; trong cùng một file trạng thái module là dùng chung, nên chạy row 1 sau row 2 sẽ làm nó đỏ sai lệch. (anchor: `packages/coding-agent/test/capability/reset-contract.test.ts`)

7. Cổng của commit 1: `cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts` rồi `cd packages/coding-agent && bun test test/capability/reset-contract.test.ts`. ĐÃ ĐO, test SẼ đỏ vì 'Failed to load pi_natives native addon', và nguyên nhân là import LAN TRUYỀN chứ không phải addon-trực-tiếp: `capability/index.ts:11` import `@oh-my-pi/pi-utils` (package đó tự fail với chính lỗi này), còn `:26`/`:27` import `../extensibility/settings` và `../config/model-settings` (cũng fail). Chỉ `capability/fs.ts` là sạch. Hãy ghi thẳng vào PR rằng test chưa chạy, đừng suy từ việc `capability/index.ts` tự nó không import `@oh-my-pi/pi-natives` để kết luận test mới thoát được; build trước bằng `bun --cwd=packages/natives run build`. Ship commit 1 thành PR riêng. (anchor: repo root)

8. TRƯỚC khi bắt đầu commits 2-3, xác nhận M2-OQ2 đã được WI-0 trả lời và câu trả lời là 'the capability registry becomes extension-reachable' (YES). Nếu câu trả lời là NO, đừng dựng map attribution — chúng sẽ là gánh nặng chết vĩnh viễn. Đồng thời kiểm tra lại xem WI-1 commit 1 đã hạ nhánh teardown có gắn owner trong suspend branch của `reconcileExtensionSources` chưa; nếu có rồi thì mở rộng nhánh đó, đừng viết nhánh thứ hai. (anchor: `packages/coding-agent/src/sdk.ts:4579`)

9. COMMIT 2 — thêm hai map attribution vào phần Registry State của `capability/index.ts`, ngay sau ba map sẵn có ở :34/:37/:40 và trước hai mutable Set ở :43/:44. Đặt tên và kiểu đúng y như ModelRegistry: `const providersBySource = new Map<string, Set<string>>()` và `const providerSourceByName = new Map<string, string>()`. Cho cả hai một doc comment trỏ tới `config/model-registry.ts:303-304` làm hình dạng được mirror, để người đọc kế tiếp biết đây là tái sử dụng có chủ đích chứ không phải một phát minh thứ hai. (anchor: `packages/coding-agent/src/capability/index.ts:40`)

10. COMMIT 2 — mở rộng chữ ký thành `registerProvider<T>(capabilityId: string, provider: Provider<T>, sourceId?: string)`. Khi có `sourceId`: thêm providerId vào set của source đó trong `providersBySource` (tạo set nếu chưa có) và đặt `providerSourceByName` trỏ tới source đó. Trước khi chiếm quyền sở hữu, hãy đuổi chủ cũ — đọc `providerSourceByName.get(provider.id)`, và nếu nó nêu một source khác thì xoá providerId khỏi set của source cũ đó và xoá entry ngược. Đây là bản port trực tiếp từ `model-registry.ts:3011-3019`. Khi bỏ trống `sourceId` (cả 84 call site hiện có), không chiếm attribution và không đuổi ai. Đặt cả hai quy tắc vào doc comment. (anchor: `packages/coding-agent/src/capability/index.ts:101`)

11. COMMIT 3 — thêm `export function unregisterProvidersForSource(sourceId: string): void` cạnh các hàm quản lý cache/registry khác. Thân hàm: tra set trong `providersBySource`; nếu vắng hoặc rỗng thì return ngay. Nếu không, với mỗi providerId, suy ra capability id của nó từ `providerCapabilities` và splice provider ra khỏi mảng `providers` của capability đó; sau vòng lặp, provider đó không còn gắn với capability nào (guard ở trên đã bỏ qua provider bị source khác sở hữu), nên xoá HẲN entry `providerCapabilities` và `providerMeta` của nó — hai entry này luôn đi cùng nhau trong vòng lặp này. Cuối cùng xoá entry `providersBySource` và mọi entry `providerSourceByName` mà source này sở hữu. Chặn toàn bộ phần này để một providerId còn thuộc về source KHÁC không bao giờ bị xoá — cái chặn đó chính là thứ test row (b) tồn tại để bắt. (anchor: `packages/coding-agent/src/capability/index.ts:566`)

12. COMMIT 3 — nối vào hot path. Trong `reconcileExtensionSources` ở sdk.ts, ngay sau `const { suspended, resumed } = extensionRunner.setSuspendedExtensions(...)` mở ở :4579 (đóng ở :4581), thêm một vòng lặp gọi `unregisterProvidersForSource(extension.path)` cho mỗi extension bị suspend. Dùng `extension.path`, không dùng `extension.resolvedPath` — `path` là id mà model registry đã dùng làm sourceId (`loader.ts:363`). Nếu WI-1 đã thêm một lời gọi teardown trong nhánh này, hãy đặt lời gọi của bạn cạnh nó thay vì tạo vòng lặp thứ hai. Viết một comment nói thẳng rằng hiện tại điều này là inert vì không có gì đăng ký capability provider kèm sourceId, và rằng nó tồn tại để mở đường seam cho WI-10. (anchor: `packages/coding-agent/src/sdk.ts:4579`)

13. COMMITS 2-3 — viết `packages/coding-agent/test/capability/provider-source-attribution.test.ts` với ba test. Đăng ký provider dùng nhỡ trực tiếp qua registry API với provider id khác nhau và sourceId khác nhau, và khẳng định trên danh sách ĐÃ PHÂN GIẢI từ `getCapabilityInfo(capabilityId)?.providers` — không bao giờ khẳng định trên map nội bộ, vì danh sách đã phân giải mới là thứ discovery và settings UI đọc. Row (a): provider thuộc một source biến mất khỏi danh sách đã phân giải sau `unregisterProvidersForSource`. Row (b): với hai source trên cùng một capability, suspend một cái thì provider của source kia vẫn còn. Row (c): sau `resetRegistry()`, provider từ hai sourceId khác nhau đều vẫn còn. Sắp thứ tự file sao cho row `resetRegistry()` không chạy trước (a) và (b). Dùng một capability id ở cấp module có thật từ `capability/tool.ts` để định nghĩa tồn tại. (anchor: `packages/coding-agent/test/capability/provider-source-attribution.test.ts`)

14. Cổng của commits 2-3: `cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts` rồi `cd packages/coding-agent && bun test test/capability/reset-contract.test.ts test/capability/provider-source-attribution.test.ts`. Sau đó chạy toàn bộ suite của coding-agent để chứng minh `resetRegistry()` trong một file không đầu độc file khác — đây là rủi ro thật mà plan nguồn không hề nhắc, và dù `bun test` đã được xác minh là cô lập theo file, toàn suite mới là bằng chứng. Cuối cùng `bun run check:tools` (oxlint + oxfmt), vốn `check:ts` đã gọi. (anchor: repo root)

### Hình dạng code

```typescript
// packages/coding-agent/src/capability/index.ts — Registry State section,
// immediately after the existing three Maps at :34/:37/:40.

/**
 * Providers registered by an owning source, mirroring ModelRegistry's
 * `#runtimeProvidersBySource` (config/model-registry.ts:303). Keyed by sourceId.
 */
const providersBySource = new Map<string, Set<string>>();

/**
 * Reverse index: provider ID -> owning sourceId, mirroring ModelRegistry's
 * `#runtimeProviderSourceByName` (config/model-registry.ts:304). At most one
 * owner per provider ID; a later registration evicts the previous owner.
 */
const providerSourceByName = new Map<string, string>();

// ---- registerProvider, signature change at :101 ----

export function registerProvider<T>(capabilityId: string, provider: Provider<T>, sourceId?: string): void {
	const capability = capabilities.get(capabilityId);
	if (!capability) {
		throw new Error(`Unknown capability: "${capabilityId}". Define it first with defineCapability().`);
	}

	if (!providerMeta.has(provider.id)) {
		providerMeta.set(provider.id, { displayName: provider.displayName, description: provider.description });
	}
	if (!providerCapabilities.has(provider.id)) {
		providerCapabilities.set(provider.id, new Set());
	}
	providerCapabilities.get(provider.id)!.add(capabilityId);

	// Attribution: only claimed when a sourceId is supplied. A source-less
	// registration never claims and never evicts — all 84 existing call sites are
	// source-less module-level registrations. Eviction ports ModelRegistry
	// (config/model-registry.ts:3011-3019): one owner per provider ID, last wins.
	if (sourceId !== undefined) {
		const previousSourceId = providerSourceByName.get(provider.id);
		if (previousSourceId !== undefined && previousSourceId !== sourceId) {
			const previousProviders = providersBySource.get(previousSourceId);
			previousProviders?.delete(provider.id);
			if (previousProviders && previousProviders.size === 0) {
				providersBySource.delete(previousSourceId);
			}
		}
		const sourceProviders = providersBySource.get(sourceId) ?? new Set<string>();
		sourceProviders.add(provider.id);
		providersBySource.set(sourceId, sourceProviders);
		providerSourceByName.set(provider.id, sourceId);
	}

	const providers = capability.providers as Provider<T>[];
	const idx = providers.findIndex(p => p.priority < provider.priority);
	if (idx === -1) providers.push(provider);
	else providers.splice(idx, 0, provider);
}

// ---- new teardown, next to the cache management section ----

/**
 * Remove every provider registered by `sourceId`.
 *
 * Contract: a provider ID has at most one owning source at a time. A provider
 * whose current owner is a different source is never removed. Safe to call for
 * an unknown or already-removed sourceId.
 */
export function unregisterProvidersForSource(sourceId: string): void {
	const sourceProviders = providersBySource.get(sourceId);
	if (!sourceProviders || sourceProviders.size === 0) return;

	for (const providerId of [...sourceProviders]) {
		if (providerSourceByName.get(providerId) !== sourceId) continue; // re-owned elsewhere

		for (const capabilityId of providerCapabilities.get(providerId) ?? []) {
			const capability = capabilities.get(capabilityId);
			if (!capability) continue;
			const providers = capability.providers as Provider<unknown>[];
			const idx = providers.findIndex(p => p.id === providerId);
			if (idx !== -1) providers.splice(idx, 1);
		}

		providerCapabilities.delete(providerId);
		providerMeta.delete(providerId);
		providerSourceByName.delete(providerId);
	}

	providersBySource.delete(sourceId);
}

// ---- COMMIT 1, the rename at :554 and the new function beside it ----

/**
 * Clear the filesystem discovery cache. Call after a chdir or filesystem change.
 *
 * This does NOT clear the capability registry: capability definitions and
 * registered providers survive. Use {@link resetRegistry} for the registry.
 */
export function invalidateAllCaches(): void {
	clearFsCache();
}

/**
 * Drop every registered capability definition. Tests and future extension
 * reload only — no live call site invokes this.
 *
 * DESTRUCTIVE: all 14 `defineCapability` calls are module-level `export const`
 * bindings and ESM evaluates each module exactly once, so no later import
 * re-runs them. After this call, `getCapability` returns undefined and
 * `loadCapability` throws for every capability for the rest of the process.
 *
 * Deliberately narrow: it touches `capabilities` and nothing else. Registered
 * providers and their source attribution survive (see provider-source-
 * attribution.test.ts row 3).
 */
export function resetRegistry(): void {
	capabilities.clear();
}
```

### Hợp đồng test

Bộ test bảo vệ một điều: các hàm vòng đời được export từ capability registry phải làm đúng điều tên chúng nói, và việc teardown provider phải được giới hạn đúng vào một chủ sở hữu.

Row 1 của `reset-contract.test.ts` bảo vệ một HỢP ĐỒNG ÂM và là thứ duy nhất đứng giữa plan với lựa chọn bị cấm duy nhất. Nếu nó hồi quy, ai đó đã làm cho hàm vô hiệu hoá fs-cache xoá luôn map capability — và hậu quả quan sát được là `/clear`, resume-with-chdir, các lần chuyển phiên ssh và vòng lặp reconcile extension đều âm thầm ngừng phân giải được cả 14 capability cho suốt phần đời còn lại của process, không có stack trace nào, vì ESM sẽ không đánh giá lại các lời gọi `defineCapability` ở cấp module. Người tiêu dùng thấy prompts, rules, hooks, slash commands, skills và tools lặng lẽ biến mất và không bao giờ quay lại.

Row 2 bảo vệ hợp đồng hướng tới: `resetRegistry()` phải thật sự bỏ các định nghĩa. Đó là row đỏ trên HEAD, vì hàm chưa tồn tại — nhưng lưu ý trên HEAD cả FILE đỏ ở dòng import chứ không phải ở assertion này (xem cổng (2)). Nó là phần có thể bị từ chối của bản sửa, và chính nó làm cho việc khoá ràng buộc "tên khớp hành vi" trở thành thứ bắt buộc chứ không chỉ là điều mong muốn.

Row (a) của `provider-source-attribution.test.ts` bảo vệ hợp đồng discovery: sau khi một source bị teardown, các provider của nó phải vắng mặt khỏi danh sách ĐÃ PHÂN GIẢI (`getCapabilityInfo(id).providers`) — mảng mà settings UI và discovery thực sự đọc. Nếu hồi quy, người tiêu dùng thấy đóng góp của một extension bị suspend vẫn lưu lại trong capability set thay vì biến mất. Nếu khẳng định vào map nội bộ thay vì, test sẽ xanh trong khi danh sách đã phân giải vẫn cũ — đó chính là toàn bộ failure mode.

Row (b) bảo vệ hợp đồng âm cho phạm vi teardown: hai source trên một capability, một cái bị teardown, provider của source kia phải sống sót. Nếu hồi quy, `unregisterProvidersForSource` xoá quá tay và việc tắt một extension sẽ lặng lẽ cởi bỏ đóng góp của một extension khác. Đây là row chứng minh attribution là thật chứ không phải một trường hợp đặc biệt đơn-chủ-sở-hữu.

Row (c) bảo vệ hợp đồng xuyên commit: hai commit không làm hỏng lẫn nhau. `resetRegistry()` không được làm xáo động attribution, để một bộ test gọi nó vẫn thấy các provider thuộc source sau đó. Nếu hồi quy, commit 1 lặng lẽ phá vỡ đường dọn dẹp của commit 2.

Điều người tiêu dùng thấy nếu bất kỳ điều nào trên đây hỏng là một capability registry hoặc rò rỉ mãi mãi provider của mọi extension bị suspend (trạng thái hiện tại ở HEAD), hoặc trong biến thể bị cấm, làm rơi mất mọi capability trong process. Cả hai đều im lặng; không cái nào ném exception.

Hai file test: `packages/coding-agent/test/capability/reset-contract.test.ts` và `packages/coding-agent/test/capability/provider-source-attribution.test.ts`.

### Xác minh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/capability/reset-contract.test.ts test/capability/provider-source-attribution.test.ts
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test   # full suite: prove resetRegistry() in one file poisons no other
git -C /Users/tranquangdang21/Projects/ultraworkers grep -n resetCapabilities -- packages/coding-agent/src   # must return zero hits after commit 1
```

### Cổng hoàn thành

Ba cổng, theo thứ tự.

(1) Sau commit 1: `bun run check:ts` xanh VÀ `git grep -n resetCapabilities -- packages/coding-agent/src` trả về 0 kết quả. Type checker chính là thứ làm cho việc đổi tên an toàn — một call site bị sót là lỗi compile, không phải thay đổi hành vi im lặng, và đó là lý do commit 1 là S chứ không phải M.

(2) Trên HEAD, `reset-contract.test.ts` đỏ ở DÒNG IMPORT chứ không phải ở assertion: cả `invalidateAllCaches` lẫn `resetRegistry` đều chưa được export (`capability/index.ts:554` chỉ có `reset()`), nên `tsgo` báo TS2305 cho CẢ HAI tên, còn `bun test` ném `SyntaxError: Export named 'invalidateAllCaches' not found` — `0 pass / 1 fail / 1 error`, không assertion nào chạy (đã đo). Vì vậy "row 2 đỏ trên HEAD" KHÔNG phải bằng chứng ghim được, và "row 1 xanh trên HEAD" cũng không. Đổi tạm import của row 1 sang tên cũ `reset` KHÔNG cứu được: `resetRegistry` thiếu vẫn làm hỏng module ngay ở lúc link, và ngay cả một file chỉ import `reset` vẫn đỏ vì native addon chưa build. Thứ tự đúng để ghim tripwire là: (a) build addon bằng `bun --cwd=packages/natives run build`; (b) chạy `bun test test/capability/reset-contract.test.ts` ngay sau commit 1 và xác nhận row 1 XANH; (c) tạm thêm `capabilities.clear()` vào `invalidateAllCaches()`, chạy lại, xác nhận row 1 ĐỎ; (d) gỡ thay đổi tạm đó. Ghi kết quả (b) và (c) vào PR.

(3) Sau commits 2-3: `bun run check:ts` xanh, cả hai file test mới xanh, và toàn bộ suite coding-agent vẫn xanh — cái cuối cùng chính xác chứng minh một file test gọi `resetRegistry()` không đầu độc bất kỳ file nào khác.

LƯU Ý MÔI TRƯỜNG, đã kiểm chứng chứ không phải phỏng đoán: ở HEAD 808b365 `bun run check:ts` pass (cả 15 package xanh) nhưng `bun test` không chạy được — native addon chưa build, nên ngay cả test có sẵn, không liên quan, `test/capability/rule-agents.test.ts` cũng báo `0 pass / 1 fail` với 'Failed to load pi_natives native addon for darwin-arm64'. Vì vậy hôm nay chỉ có nửa type-check của cổng (1) và nửa grep là chạy được. Build addon bằng `bun --cwd=packages/natives run build` để mở khoá các nửa test. ĐÃ ĐO, KHÔNG THOÁT ĐƯỢC: cả hai test mới đều chết ở lúc import, không phải vì lý do addon-trực-tiếp mà vì import LAN TRUYỀN. `capability/index.ts:11` import `@oh-my-pi/pi-utils`, và chính package đó đã fail với 'Failed to load pi_natives native addon'; `../extensibility/settings` (`:26`) và `../config/model-settings` (`:27`) cũng fail. Chỉ `capability/fs.ts` là sạch. Vậy cổng (3) không thể đánh giá được cho tới khi build addon (`bun --cwd=packages/natives run build`) — hãy ghi vào PR rằng test chưa chạy, đừng suy từ việc `capability/index.ts` tự nó không import `@oh-my-pi/pi-natives` (khác với `discovery/helpers.ts:4`) để kết luận test mới thoát được.

VÌ SAO CỔNG NÀY CÓ THỂ ĐỎ: Có, ở cả hai nửa. Nửa type-check đỏ ngay khi sót dù chỉ một trong 12 call site hoặc 8 dòng import, vì export đã đổi tên không còn tồn tại — đó là lỗi compile cứng, không phải cảnh báo mềm, và đó là lý do việc đổi tên 8 file an toàn mà không cần đọc từng file. Nửa test đỏ trên HEAD vì một lý do cụ thể, đã được chứng minh: cả `invalidateAllCaches` lẫn `resetRegistry` đều không được export ở HEAD, nên file đỏ ngay ở dòng import và không row nào resolve được, đừng nói pass. Row 1 là tripwire chống lựa chọn bị cấm, nhưng NÓ CHƯA TỪNG ĐƯỢC QUAN SÁT Ở TRẠNG THÁI XANH: trên HEAD nó đỏ vì import, và sau commit 1 thì vẫn đỏ nếu addon chưa build. Nó sẽ đỏ ngay khi có ai thêm `capabilities.clear()` vào hàm fs-cache, đúng bằng cái sai lầm mà plan dành cả một đoạn để cấm — hãy chứng minh điều đó theo thứ tự (a)–(d) ở cổng (2) chứ đừng mô tả nó như đã xanh. Điều duy nhất cổng này KHÔNG phủ là claim hành vi trong mô tả PR — vì không có đường dẫn production nào đăng ký capability provider kèm sourceId (đã kiểm chứng: cả 84 lời gọi `registerProvider` đều ở cấp module trong `src/discovery/`), nên lời gọi `unregisterProvidersForSource` trong suspend branch của `sdk.ts` là inert tại thời điểm ship và các test chạy trực tiếp registry API. Đừng để PR tuyên bố rằng việc tắt một extension giờ đã giải phóng provider của nó trong thực tế; nó chỉ mở seam, không hơn.

### Phụ thuộc

- `WI-1 commit 1 (wave 2)` — cả hai đều thêm một lời gọi teardown có gắn owner vào CÙNG nhánh suspend của `reconcileExtensionSources`. Đừng viết nhánh đó hai lần; ai đến sau MỞ RỘNG nó, không bao giờ tạo lại. Hãy kiểm chứng ở HEAD 808b365 rằng WI-1 chưa từng nhận phần đó.
- `WI-0 (wave 1)` — câu trả lời M2-OQ2 của nó ('is the capability registry extension-reachable?') quyết định có đáng dựng attribution ngay bây giờ không. Commits 2-3 phụ thuộc vào nó; commit 1 thì không.

Chặn ngược lại:

- `WI-6 (wave 4)` — plan nói WI-6 cần một câu chuyện tool-set đã ngã ngũ, và WI-5 chính là thứ ngã ngũ quyền sở hữu của provider set.
- `WI-9 (wave 7)` — unload cần inventory tài nguyên đầy đủ, và mục này là thứ thêm một chủ sở hữu cho trạng thái capability.

### Cách sai dễ nhất

Cách dễ sai nhất một lần là lựa chọn BỊ CẤM: làm cho `reset()` cũng xoá map `capabilities`. Trông như đó chính là bản sửa, và nó làm brick toàn bộ process một cách im lặng — xem mục open_questions về lý do. Cách sai dễ thứ hai là sót một lời gọi trong lúc đổi tên; cách sai dễ thứ ba là ship commits 2-3 trước khi wave 1 trả lời M2-OQ2, khiến các map attribution thành gánh nặng chết vĩnh viễn.

### Cần người quyết

- LỰA CHỌN BỊ CẤM — đừng làm điều này, và hãy biết vì sao. Làm cho `reset()` cũng xoá map `capabilities` là 'bản sửa' hiển nhiên và nó làm brick cả process. Cả 14 lời gọi `defineCapability` đều là `export const x = defineCapability(...)` ở phạm vi module, và ESM đánh giá mỗi module đúng một lần — không có import nào sau đó chạy lại chúng. Nên sau lần `reset()` đầu tiên, `getCapability` và `loadCapability` trả về `undefined`/ném lỗi cho CẢ 14 capability ở mọi một trong 12 call site (`/clear`, resume-with-chdir, vòng lặp reconcile, chuyển phiên ssh, marketplace install, …). Đó là một thất bại toàn process, im lặng, không có stack trace. Hình dạng DUY NHẤT được cho phép là: giữ hàm chỉ-xoá-fs, đổi tên nó thành điều nó thật sự làm, và thêm một `resetRegistry()` riêng cho registry. Test row bắt được sai lầm này là row 1 của `reset-contract.test.ts` — nó xanh ngay sau commit 1 (không phải trên HEAD: ở HEAD file đỏ ở dòng import) và fail ngay khi có ai thêm `capabilities.clear()` vào hàm đã đổi tên.
- Nên đổi tên hàm chỉ-xoá-fs thành gì? Plan nói 'rename to be correct' nhưng không chọn tên. Khuyến nghị: `invalidateAllCaches()`. Đó là người anh em trung thực của `invalidate(filePath, cwd?)` sẵn có ở `capability/index.ts:572`, nó nói 'caches' (số nhiều) vì nó xoá cả cache nội dung lẫn cache thư mục, và nó không đụng tên với `resetCapabilityForTests` ở `:561`. Phương án thay thế `clearFsCaches()` cộng hưởng với alias `clearFsCache` đã được import từ `./fs` tại `capability/index.ts:11`. Cả hai đều bảo vệ được — nhưng hãy chọn một và áp dụng cho cả 8 import lẫn 12 call site.
- Alias cục bộ `resetCapabilities` có nên sống sót qua lần đổi tên không? Khuyến nghị: KHÔNG. Cả 8 file hiện viết `import { reset as resetCapabilities }`, và chính alias là nửa sau của lời nói dối — cái tên `resetCapabilities` là thứ khiến reconcile loop trông như đang giải phóng capability. Sau khi đổi tên, hãy dùng thẳng tên trung thực ở cả 12 call site. Điều này cũng buộc bạn phải chạm tới `sdk.ts:3528`, nơi comment ('resetCapabilities() clears the fs cache at those boundaries') phải được cập nhật cho khớp.
- Cùng một `providerId` bị hai source khác nhau đăng ký — ai thắng? Plan không đề cập và đây là một lỗ hổng thiết kế thật. `providerMeta` (`:40`) là first-write-wins và `providerCapabilities` (`:37`) được khoá chỉ bằng providerId, nên cả hai đều không phân biệt được hai chủ sở hữu. Khuyến nghị: mirror ModelRegistry chính xác — `providerSourceByName` là one-to-one, đăng ký sau thắng, và `registerProvider` đuổi chủ cũ khỏi set của nó (chép `model-registry.ts:3011-3019`). Chi phí được chấp nhận đã biết, giống hệt hành vi đã ship của ModelRegistry: nếu source A và source B cùng đăng ký provider 'claude' và B thắng, suspend B sẽ xoá provider đó dù A vẫn còn khai báo nó. Hôm nay điều này là rỗng (không gì đăng ký theo source), và nó chỉ trở thành gánh nặng thật khi WI-10 làm registry trở nên extension-reachable. Nếu bạn không muốn chấp nhận, phương án thay thế là một bộ đếm tham chiếu cho mỗi (capabilityId, providerId) — nhưng đó là một hình dạng thứ hai do bạn tự chế ra, và plan cấm tự chế.
- `registerProvider` không có `sourceId` có nên đuổi chủ sở hữu hiện hữu không? Khuyến nghị: KHÔNG — một lần đăng ký không có source chỉ thêm vào mảng nhưng không chiếm và cũng không xoá attribution. Cả 84 lời gọi hiện tại là đăng ký ở cấp module không có source, chạy một lần lúc import; để chúng đuổi sẽ làm mồ côi một provider thuộc source bất kỳ khi có đánh giá lại. Đây là một quyết định, không phải tai nạn; hãy ghi nó vào doc comment.
- Câu hỏi cổng cho người triển khai: hai test mới có chạy được TRƯỚC khi native addon Rust được build không? Nếu có, commits 2-3 có thể được xác nhận tuần này thay vì phải chờ build. Hãy kiểm tra bằng cách chạy `bun test test/capability/reset-contract.test.ts` ngay sau khi viết xong. Nếu nó đỏ vì addon, hãy nói thẳng trong PR thay vì tuyên bố có coverage mà bạn không thể thực thi.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| §5.2 table: 12 call site `resetCapabilities()` nằm ở `main.ts:871`, `sdk.ts:4565`, `agent-session.ts:5405`/`:5790`/`:8779`, `session-tools.ts:1557`, và (không đổi) `ssh-command-controller.ts:208`/`:369`, `selector-controller.ts:310`, `builtin-marketplace.ts:36`, `helpers/ssh.ts:146`/`:167`. | STALE — đúng về số đếm, bốn file đã trôi | Các CON SỐ đúng hoàn toàn: 12 call site trên 8 file, đã kiểm chứng. Nhưng số dòng trôi vì HEAD đã dời tới 808b365 (lần gộp plan M1). Neo đúng: `main.ts:872`, `sdk.ts:4571`, `session/agent-session.ts:5435`/`:5820`/`:8811`, `session/session-tools.ts:1651`. Không đổi và vẫn đúng: `modes/controllers/ssh-command-controller.ts:208` và `:369`, `modes/controllers/selector-controller.ts:310`, `slash-commands/builtin-marketplace.ts:36`, `slash-commands/helpers/ssh.ts:146` và `:167`. Bằng chứng: `git grep -n resetCapabilities -- packages/coding-agent/src` ở HEAD 808b365; cả 8 dòng import xác nhận là `import { reset as resetCapabilities }`. ĐỪNG sửa tay số dòng: hãy chạy grep, đó là chuẩn. |
| §5.2/§5.3 trích `reconcileExtensionSources` ở `sdk.ts:4560-4624` với `resetCapabilities()` ở `:4565` và `setSuspendedExtensions()` ở `:4573`. | STALE khoảng 6 dòng | `const reconcileExtensionSources = async ()` nằm ở `sdk.ts:4566`; `resetCapabilities()` ở `sdk.ts:4571`; `extensionRunner.setSuspendedExtensions(...)` mở ở `sdk.ts:4579` và đóng ở `:4581` — lệch đúng 6 dòng so với `:4573` của plan, và `:4580` (con số plan từng dùng) chỉ là tham số hàm mũi tên, đặt code vào đó sẽ chèn vào giữa lời gọi. HÌNH DẠNG plan mô tả đúng tuyệt đối, và đây là phần xác nhận nền tảng cho cả mục: `resetCapabilities()` thật sự được gọi ngay trước `setSuspendedExtensions()`, tin rằng nó giải phóng registry trong khi nó chỉ xoá fs cache. Bằng chứng: `sed -n '4566,4582p' packages/coding-agent/src/sdk.ts` |
| §5.2: `clearSourceRegistrations` ở `config/model-registry.ts:2914`. | OFF BY ONE | Method mở ra ở `config/model-registry.ts:2913`; `:2914` là dấu ngoặc mở. `syncExtensionSources` ở `:2955` là đúng. Bằng chứng: `sed -n '2908,2930p' packages/coding-agent/src/config/model-registry.ts` |
| Mục 'File path' của WI-5: ba Map ở cấp module và hai mutable Set nằm ở `capability/index.ts:30-41`. | STALE — khoảng được trích BỎ SÓT hai Set | Ba Map ở `:34` (`capabilities`), `:37` (`providerCapabilities`), `:40` (`providerMeta`). Hai mutable Set ở `:43` và `:44` (`unboundDisabledProviders`, `unboundEnabledProviders`) — tức là NGOÀI khoảng được trích. Khối trạng thái thật là `:32-44`, và đó là năm container ở cấp module, không phải ba. Điều này quan trọng vì commits 2-3 thêm HAI Map nữa ngay cạnh chúng ở `:45-46`, đưa tổng lên bảy. Bằng chứng: `grep -n '^const capabilities\|^const providerCapabilities\|^const providerMeta\|^let unbound' packages/coding-agent/src/capability/index.ts` |
| Mục 'File path' của WI-5: `defineCapability` ở `:88-96`, `registerProvider` ở `:99-127`. | NEARLY EXACT | `defineCapability` ở `:89` (nhánh ném khi trùng ở `:90-91`); `registerProvider` ở `:101`. Lệch một ở đầu mỗi cái. Nội dung được xác nhận đầy đủ: `registerProvider<T>(capabilityId: string, provider: Provider<T>): void` KHÔNG có `sourceId` trong chữ ký, và `defineCapability` CÓ ném lỗi khi id trùng. Bằng chứng: `sed -n '88,102p' packages/coding-agent/src/capability/index.ts` |
| WI-5 trích `capability/index.ts:554-556` cho `reset()`, `:561-566` cho `resetCapabilityForTests`, và `capability/index.ts:459` cho `getCapability`. | EXACT — cả ba đã kiểm chứng | Không sửa gì. `reset()` ở `:554-556` đúng là `clearFsCache();` và không gì khác. `resetCapabilityForTests()` ở `:561-566` xoá settingsHolds + hai unbound Set + fs cache (nó KHÔNG đụng `capabilities`). `getCapability<T>(id)` ở `:459` trả về `capabilities.get(id)`. Đây là ba neo mà cả mục treo vào và cả ba đều đúng. Bằng chứng: `sed -n '548,568p;455,462p' packages/coding-agent/src/capability/index.ts` |
| WI-5: `model-registry.ts:303-304` là hình dạng attribution để chép. | EXACT | Không sửa gì. `#runtimeProvidersBySource: Map<string, Set<string>>` ở `:303` và `#runtimeProviderSourceByName: Map<string, string>` ở `:304`. Logic steal-on-re-register cần mirror nằm ở `:3011-3019` (`previousSourceId` eviction; `:3010` chỉ là `.get`, phần claim tương ứng là `:3020-3023`), và teardown cần mirror là `clearSourceRegistrations` ở `:2913-2930`. Bằng chứng: `sed -n '303,304p;3007,3027p' packages/coding-agent/src/config/model-registry.ts` |
| Plan liệt kê 14 call site `defineCapability` và 84 cặp provider/capability. | EXACT — cả 14 số dòng đã kiểm chứng, đều ở cấp module | Cả 14 xác nhận đúng ở các dòng được trích: `context-file.ts:27`, `extension-module.ts:23`, `extension.ts:37`, `hook.ts:27`, `instruction.ts:25`, `mcp.ts:108`, `prompt.ts:23`, `rule.ts:392`, `settings.ts:23`, `skill.ts:58`, `slash-command.ts:29`, `ssh.ts:31`, `system-prompt.ts:31`, `tool.ts:27`. Con số 84 cũng đúng: 104 dòng `registerProvider` dưới `src/discovery/` trừ 20 dòng import = 84 lời gọi. Bằng chứng: `git grep -n defineCapability -- packages/coding-agent/src`; `git grep -c registerProvider -- packages/coding-agent/src/discovery/` |
| (Plan không nói điều này) Ngầm hiểu rằng WI-5 giả định có một lời gọi sống nào đó truyền `sourceId` vào capability `registerProvider`, để `unregisterProvidersForSource` có cái gì để gỡ. | FALSE — đây là điều đáng kể nhất plan bỏ sót | KHÔNG có bất kỳ đăng ký capability-provider theo source nào trong repo. Cả 84 lời gọi capability `registerProvider` đều là câu lệnh top-level cấp module trong `src/discovery/*.ts` (agent-plugins, agents-md, agents, builtin-defaults, builtin, claude-plugins, claude, cline, codex, cursor, gemini, github, mcp-json, omp-plugins, opencode, skillshare, ssh, vscode, windsurf) — đã kiểm chứng: không call site nào lồng bên trong một hàm. Extension đóng góp vào capability registry bằng cách được ĐỌC tại thời điểm `load(ctx)`, không phải bằng cách đăng ký provider. `registerProvider` trên extension API (`extensibility/extensions/types.ts:1570`, `:1743`) là hàm khác cùng tên của model registry, vốn đã nhận `sourceId`. Hệ quả: lời gọi `unregisterProvidersForSource` trong suspend branch của `sdk.ts` là INERT tại thời điểm ship — nó sẽ là một tra map luôn trượt, vì map luôn rỗng. Nó là scaffolding tương thích-tương-lai cho WI-10, không phải một bản sửa sống. Do đó hai test attribution phải gọi registry API TRỰC TIẾP (đăng ký với sourceId, rồi gỡ), KHÔNG đi qua đường TUI/suspend, và mô tả PR không được tuyên bố rằng việc tắt một extension giờ đã giải phóng provider trong thực tế. Bằng chứng: `git grep -n registerProvider -- packages/coding-agent/src/discovery/` — mọi kết quả đều là dòng `import` hoặc một câu lệnh `registerProvider` top-level; bộ lọc các kết quả không top-level chỉ trả về dòng import. `git grep -n 'registerProvider' -- .../extensibility/extensions/{loader,runner,types}.ts` cho thấy chúng đi tới `ModelRegistry.registerProvider(name, config, sourceId)`, không phải hàm của capability. |
| Test row (c) của WI-5: sau `resetRegistry()`, một provider đăng ký từ một `sourceId` vẫn còn trong danh sách đã phân giải. | SOUND nhưng chỉ nếu `resetRegistry` được giữ hẹp | Row này buộc `resetRegistry()` chỉ xoá map `capabilities` — không `providerCapabilities`, không `providerMeta`, không các mảng `providers` theo từng capability, và không các map attribution mới. Giữ nó hẹp như vậy, nếu không row này không thể hiện thực. Lưu ý suy giảm được chấp nhận: sau `resetRegistry()`, `getProviderInfo` vẫn duyệt `providerCapabilities` và thấy `capabilities.get(capId) === undefined`, nên rơi xuống `priority = 0` (xem `capability/index.ts:502-522`). Điều đó chấp nhận được cho một hàm tồn tại chỉ để phục vụ test và một đường reload extension tương lai, nhưng nó phải là một lựa chọn có chủ đích, không phải tai nạn. Bằng chứng: `sed -n '502,525p' packages/coding-agent/src/capability/index.ts` |
| Lệnh xác minh của WI-5: `bun run check:ts && (cd packages/coding-agent && bun test test/capability/reset-contract.test.ts test/capability/provider-source-attribution.test.ts)`. | PARTIALLY BLOCKED tại HEAD 808b365 | `bun run check:ts` PASS ở HEAD — đã kiểm chứng trọn vẹn, cả 15 package xanh. Nửa `bun test` KHÔNG chạy được: native addon chưa build, nên ngay cả `test/capability/rule-agents.test.ts` có sẵn và không liên quan cũng báo `0 pass / 1 fail` với 'Failed to load pi_natives native addon for darwin-arm64'. Build trước bằng `bun --cwd=packages/natives run build`, rồi nửa `bun test` trở nên chạy được. ĐÃ ĐO, KHÔNG THOÁT ĐƯỢC: cả hai test mới đều chết ở lúc import, vì import lan truyền chứ không phải addon-trực-tiếp. Probe từ `packages/coding-agent`: `import * as M from "@oh-my-pi/pi-utils"` → `0 pass 1 fail 1 error`; `import * as M from "../src/capability/index"` → `0 pass 1 fail 1 error`; `"../src/config/model-settings"` và `"../src/extensibility/settings"` → cùng lỗi; chỉ `"../src/capability/fs"` → `1 pass 0 fail`; một file test không import gì → `1 pass 0 fail` (chứng minh lỗi đến từ import, không phải từ harness). Chuỗi import: `capability/index.ts:11` là `@oh-my-pi/pi-utils`, `:26` là `../extensibility/settings`, `:27` là `../config/model-settings`. Hệ quả: cổng (3) không thể đánh giá được cho tới khi build Rust hạ cánh. Bằng chứng: `bun run check:ts` → all packages Done. `cd packages/coding-agent && bun test test/capability/rule-agents.test.ts` → 0 pass, 1 fail, 'Failed to load pi_natives native addon for darwin-arm64'. |
| (Plan không nói điều này) Row 2 của `reset-contract.test.ts` gọi `resetRegistry()`, phá huỷ các định nghĩa capability ở cấp module cho phần đời còn lại của process. | RESOLVED — đã kiểm chứng thực nghiệm, thiết kế hai-row-trong-một-file của plan là an toàn | Điều này đã được kiểm chứng trực tiếp thay vì suy luận: `bun test` cho mỗi test FILE một module registry mới, còn trạng thái module CÓ được chia sẻ giữa các khối `test()` BÊN TRONG một file. Một file xoá một Map ở cấp module không ảnh hưởng tới file test anh em (đã kiểm chứng: 2 pass / 0 fail, file thứ hai vẫn quan sát thấy giá trị trước khi xoá). Vì vậy `resetRegistry()` trong `reset-contract.test.ts` không thể đầu độc `provider-source-attribution.test.ts` hay bất kỳ file nào khác. Chỉ thị của plan rằng hai row phải theo đúng thứ tự đó là đúng, và lý do nay đã được xác nhận thực nghiệm: trong một file, `resetRegistry()` ở row 2 sẽ làm row 1 fail nếu row 1 chạy sau. Bằng chứng: repro cô lập trong scratchpad: `a.test.ts` gọi `nuke()` rồi khẳng định đã xoá; `b.test.ts` khẳng định entry ở cấp module vẫn còn. `bun test` → `2 pass 0 fail`. Bản đối chứng trong cùng file (`c.test.ts`) cho thấy trạng thái tồn tại qua ba khối `test()`. |


---


## WI-6. Bảng admission tool — một nguồn sự thật khai báo duy nhất cho việc tool nào được đưa tới model

**Thay đổi gì:** Thay thế chuỗi 25 nhánh `if (name === …)` bên trong `isToolAllowed` bằng một `Map` duy nhất ánh xạ tên tool → quy tắc admission, để việc một built-in tool có được nhận hay không trở thành **một mục dữ liệu** thay vì **một vị trí trong chuỗi**, và làm cho bốn khai báo tên tool chạy song song trở nên chứng minh được là khớp nhau. **Wave:** 4. **Effort:** M (~1.5 days) — chủ yếu là việc cơ học cẩn thận, cộng một test đặc tính hoá (characterization test) phải được viết và chứng minh xanh **TRƯỚC** khi refactor, không phải sau.

**Người dùng thấy:** Trực tiếp thì **không** — đúng tập tool đó đi tới model trước và sau khi thay đổi. Nó chỉ thành hữu hình thông qua công việc khác mà nó mở đường: nó gom ba site admission (`BUILTIN_TOOL_NAMES`, `BUILTIN_TOOLS`, chuỗi `isToolAllowed`) vào một định danh duy nhất, và biến việc thêm một built-in mới thành bắt buộc kèm một quyết định admission ở thời điểm biên dịch. **Phần "một built-in ra thành extension là một thay đổi một file" thuộc về WI-6 + WI-5 + WI-8a cộng lại, không phải WI-6 đứng riêng** — và tính riêng WI-6 thì nó còn làm *tăng* số file phải sửa cho thao tác đó (chuỗi `if` rời khỏi `index.ts` sang `tool-admission.ts`).

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/tools/index.ts` | sửa | Thay chuỗi 25 nhánh `isToolAllowed` (dòng 731-793) bằng một object context + một dòng gọi xuống module bảng mới. Thêm import. `BuiltinToolPlan.isAllowed` (dòng 611) và object được trả về (dòng 806) giữ nguyên hình dạng hiện tại. | **Có.** `const isToolAllowed = (name: string) => {` nằm ở dòng 731 và chuỗi đóng bằng `};` ở dòng 793. Khoảng `:725-789` mà plan nêu lệch 6 dòng ở đầu và 4 dòng ở cuối. |
| `packages/coding-agent/src/tools/tool-admission.ts` | tạo | Module mới chứa `ToolAdmissionContext`, object `ADMISSION_RULES` (`satisfies Record<BuiltinToolName \| HiddenToolName, ToolAdmissionRule>`), Map `TOOL_ADMISSION`, và helper `isToolAllowed`. | **Chưa** — file mới, chưa tồn tại (dòng 0). Tách thành module riêng thay vì thêm ~60 dòng vào `index.ts` đã dài 966 dòng; tách riêng cũng giữ cho các cfg getter import được mà không tạo vòng lặp ngược về `index.ts`. |
| `packages/coding-agent/test/tools/tool-admission-table.test.ts` | tạo | Test đặc tính hoá + hợp đồng. 6 dòng bảng mỗi dòng một nhánh khác nhau, 1 dòng extension-tool, 1 dòng prototype-safety, tất cả chạy qua `resolveBuiltinToolPlan` và khẳng định trên `.names`. | **Chưa** — file mới, chưa tồn tại (dòng 0). Đã xác nhận vắng mặt: `ls` trên đường dẫn đó trả về `No such file or directory`. Đường dẫn trong plan là đúng và trống. |
| `packages/coding-agent/src/tools/essential-tools.ts` | sửa | **Tuỳ chọn.** `name in ESSENTIAL_BUILTIN_TOOL_NAMES` → `Object.hasOwn(ESSENTIAL_BUILTIN_TOOL_NAMES, name)` tại dòng 47, vá rò rỉ khóa prototype vào `"essential"`. | **Có.** Dòng 47 là `return name in ESSENTIAL_BUILTIN_TOOL_NAMES ? "essential" : "discoverable";`. Đã xác nhận bằng thực thi rằng `defaultLoadModeForToolName("toString")` hôm nay trả về `"essential"`. Khoảng `:23-37` của chính record là đúng. |
| `packages/coding-agent/src/sdk.ts` | sửa | **Tuỳ chọn, một dòng:** chú thích `SESSION_MANAGED_BUILTIN_TOOL_NAMES` thành `readonly BuiltinToolName[]` để một chính tả trong danh sách đó là lỗi biên dịch thay vì một lượt trượt âm thầm lúc runtime. | **Có.** `const SESSION_MANAGED_BUILTIN_TOOL_NAMES = ["manage_skill", "learn", "context_notes", "new_context"];` ở dòng 1161, hiện là `string[]` không kiểu, không có liên kết biên dịch nào với union tên built-in. |
| `packages/coding-agent/src/tools/builtin-names.ts` | sửa | **Không cần thay đổi.** Đã xác minh là neo đúng và vốn đã là nguồn duy nhất cho `BUILTIN_TOOL_NAMES` (30 tên, dòng 2-31) và `HIDDEN_TOOL_NAMES` (3 tên, dòng 36). | **Có.** Đã đọc. Các neo `:2-31` và `:36` của plan là **đúng** — chỉ là các neo plan đúng ngay từ đầu trong toàn bộ mục này. `BUILTIN_TOOL_NAMES` đã được tiêu thụ như union `BuiltinToolName` bởi `tools/index.ts:554`. |

### Các bước

1. **Anchor `packages/coding-agent/src/tools/index.ts:731-793`.** Trước khi đụng vào bất cứ thứ gì, hãy viết test đặc tính hoá (bước 2) và làm cho nó **xanh** trên chuỗi `if` **hiện tại**. Cảnh báo của chính plan là đúng ở chỗ đây là nơi công việc đi sai; cách phòng ngựa duy nhất là một test từng đỏ khi hành vi khác đi, và test đó vô dụng nếu viết sau khi refactor.

2. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts` (tạo).** Dựng một helper `makeSession(overrides)` mô phỏng theo helper ở `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts:22-31` — nó **BẮT BUỘC** đặt `skipPythonPreflight: true`, nếu không `resolveBuiltinToolPlan` sẽ chờ một lần dò kernel Python thật. Dẫn mọi dòng bảng qua `resolveBuiltinToolPlan(session, toolNames)` đã export và khẳng định trên danh sách `.names` đã resolve, **không bao giờ** khẳng định vào bên trong bảng (AGENTS.md: khẳng định hợp đồng quan sát được, và plan đồng ý rằng hợp đồng là "tool nào được đưa cho model").

3. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts`.** Thêm **đúng sáu** dòng bảng, mỗi dòng một nhánh **khác nhau**, không trùng lặp: (a) `goal` ba chiều — goal.enabled tắt, và các trạng thái `getGoalModeState()` là `undefined` / `{enabled:false}` / `{enabled:false, status:"dropped"}`; (b) `wait` OR ba chiều — từng cái async / irc / launch một mình, cộng cả ba đều tắt, vì chính cái OR **là** toàn bộ luật; (c) cặp `checkpoint`+`rewind` phụ thuộc độ sâu ở `taskDepth` 0 và 1, có và không có danh sách tool tường minh; (d) `manage_skill` autolearn bật/tắt giao với cùng ma trận độ sâu; (e) `learn` = (d) cộng thêm trục memory-backend (`local` được nhận, một backend không nằm trong danh sách thì không); (f) `task` qua `canSpawnAtDepth` tại giới hạn đệ quy — đây thực sự là một fork **khác** ( nó đọc `cfgTaskMaxRecursionDepth`, không phải vế hạng từ `taskDepth === 0`), và đó là lý do nó xứng đáng một dòng riêng thay vì bị gộp vào (c)/(d).

4. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts`.** Thêm dòng mà plan gọi là bắt buộc và là dòng **hỏng trước tiên**: một tên tool do extension đăng ký mà **không phải** built-in phải sống sót qua `resolveBuiltinToolPlan` **không đổi** dưới **mọi** tổ hợp settings. Duyệt một ma trận settings đại diện (tất cả cổng tắt, tất cả cổng bật, memory backend `mnemopi`, autolearn bật, goal mode bật) và khẳng định tên extension nằm trong `.names` mỗi lần.

5. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts`.** Thêm dòng prototype-safety: một tool extension tên `toString` (và `constructor`) phải được nhận, và một tên `__proto__` phải được nhận mà **không ném lỗi**. Khẳng định bằng **định danh boolean**, không phải bằng phép lọc danh sách: `expect(plan.isAllowed("toString")).toBe(true)`, `expect(plan.isAllowed("constructor")).toBe(true)`, `expect(plan.isAllowed("__proto__")).toBe(true)`. Phải là `toBe(true)` chứ không phải `toBeTruthy()` hay "có mặt trong `.names`" — vì dưới một `Record` ngây thơ, `TABLE["toString"]?.(ctx)` trả về **chuỗi truthy** (`"[object Object]"`) và `TABLE["constructor"]?.(ctx)` trả về `{}`, mà chuỗi truthy và `true` không phân biệt được khi lọc `.names`; chỉ phép khẳng định `toBe(true)` mới đỏ. `__proto__` đỏ theo cơ chế riêng: tra ra thứ không phải hàm và ném `TypeError` khi gọi. Đây là hợp đồng **mới**, mà code cũ thoả mãn một cách tình cờ (chuỗi `if` rơi xuống `return true`) và một cách hiện thực `Record` ngây thơ sẽ phá vỡ. Đóng dấu nó trước khi refactor để lỗi trở nên quan sát được.

6. **Anchor `packages/coding-agent/test/tools/tool-admission-table.test.ts`.** Commit test đặc tính hoá **riêng một mình**, với mã production chưa đụng tới. Xác nhận nó xanh. Nếu không, thì chuỗi `if` không phải là thứ plan nói — dừng lại và đọc lại `tools/index.ts:731-793`.

7. **Anchor `packages/coding-agent/src/tools/tool-admission.ts` (tạo).** Tạo module mới. Khai báo interface `ToolAdmissionContext` với **một** field cho mỗi closure capture đã liệt kê trong `risk`, rồi object `ADMISSION_RULES` chú thích `satisfies Record<BuiltinToolName | HiddenToolName, ToolAdmissionRule>` — **union**, KHÔNG phải `ToolName`, vì `goal` và `think` là `HiddenToolName` còn `ToolName = BuiltinToolName` (`tools/index.ts:593`). Cho `read`/`write`/`edit`/`yield` các mục tường minh `() => true`: chúng không có nhánh nào trong chuỗi cũ, và việc nói ra chúng biến bảng thành một mô tả **đầy đủ** về admission thay vì một mô tả một phần.

8. **Anchor `packages/coding-agent/src/tools/tool-admission.ts`.** Export `TOOL_ADMISSION: ReadonlyMap<string, ToolAdmissionRule> = new Map(Object.entries(ADMISSION_RULES))` cùng helper `isToolAllowed(name, ctx)` có phép tra là `TOOL_ADMISSION.get(name)?.(ctx) ?? true`. Lớp bọc `Map` là **cố ý** và **có tải trọng thật** — đừng đơn giản hoá nó lại thành object trần; lý do nằm trong `code_shape` và được lặp lại ở mục *Đính chính so với plan*.

9. **Anchor `packages/coding-agent/src/tools/index.ts:731-793`.** Xoá toàn bộ chuỗi 25 nhánh và thay bằng một object literal `admissionCtx` cộng với `const isToolAllowed = (name: string) => evaluateToolAdmission(name, admissionCtx)`. Giữ nguyên **byte-identical** hình dạng export của `BuiltinToolPlan.isAllowed` (`tools/index.ts:611`) — `sdk.ts:3350` gọi nó trong đường reconcile settings trực tiếp và không được phép cần thay đổi.

10. **Anchor `packages/coding-agent/src/tools/index.ts:719-730`.** Kiểm kê **THỨ TỰ** các lần mutate `requestedTools` so với thời điểm dựng `admissionCtx`. `requestedTools.push("yield")` ở `:794-796` chạy **sau** khi `isToolAllowed` được định nghĩa nhưng **trước** khi nó được gọi ở `:799`/`:801`; ba luật phụ thuộc độ sâu đọc `ctx.requestedTools !== undefined`, một phép so sánh tham chiếu **sống sót** qua lệnh push, nên hành vi được giữ nguyên — nhưng hãy **kiểm chứng** thay vì phỏng đoán, và **KHÔNG** chụp `requestedTools` thành một bản sao trong context.
    *(Ghi chú kiểm chứng: các neo `:794-796`, `:799`, `:801` được lấy từ mục `risk`/`plan_corrections` của spec; cờ `verified=true` tường minh trong `files_touched` chỉ phủ khoảng `:731-793`, `:611`, `:806`, `:593`, `:554` của chính file này. Khi thực thi nên tự xác nhận lại hai dòng này.)*

11. **Anchor `packages/coding-agent/src/tools/essential-tools.ts:47`.** Tuỳ chọn nhưng rất đáng làm, và đây chính là thời điểm tự nhiên để làm nó: `defaultLoadModeForToolName` dùng `name in ESSENTIAL_BUILTIN_TOOL_NAMES` trên một object literal, nên `defaultLoadModeForToolName("toString")` hôm nay trả về `"essential"` — các key của `Object.prototype` thoả mãn phép `in`. Chuyển sang `Object.hasOwn(ESSENTIAL_BUILTIN_TOOL_NAMES, name)`. Đây là **lỗi có sẵn**, không phải hồi quy do bạn gây ra; hãy ghi rõ như vậy trong PR để không bị nhầm lẫn với công việc về bảng.

12. **Anchor `packages/coding-agent/src/tools/essential-tools.ts:23-37` (đã kiểm chứng) và `packages/coding-agent/src/sdk.ts:1161`.** Xử lý nửa "một nguồn sự thật". Cặp `BUILTIN_TOOL_NAMES` ↔ `BUILTIN_TOOLS` **đã** được ép buộc ở thời điểm biên dịch (`tools/index.ts:554`, `Record<BuiltinToolName, ToolFactory>` — trình biên dịch báo lỗi khi thiếu **lẫn** khi thừa key), nên không có gì để gộp ở đó. Hai khai báo **không** có liên kết kiểu nào là `ESSENTIAL_BUILTIN_TOOL_NAMES` (`Record<string, true>`, key không kiểu, chỉ được canh bằng test runtime tại `issue-5764-registertool-loadmode.test.ts:113`) và `SESSION_MANAGED_BUILTIN_TOOL_NAMES` (`sdk.ts:1161`, một mảng string trần). Hãy cho cái sau chú thích `readonly BuiltinToolName[]` — một thay đổi một dòng biến một độ trôi dạng âm thầm thành lỗi biên dịch. **Giữ nguyên** `ESSENTIAL_BUILTIN_TOOL_NAMES` dưới dạng record được canh lúc runtime — nó được khoá theo **hành vi lớp tool**, không theo danh tính tên, và canh chống hiện có là công cụ đúng cho việc đó.

### Hình dạng code

```typescript
// packages/coding-agent/src/tools/tool-admission.ts  (NEW)

import type { BuiltinToolName, HiddenToolName } from "./builtin-names";
import type { ToolSession } from "./index";

/** Every value the admission rules are allowed to read. One field per closure capture. */
export interface ToolAdmissionContext {
	readonly session: ToolSession;
	/** Session forces a restricted subagent set; blocks `goal` outright. */
	readonly restrictToolNames: boolean;
	/** Live array — read for `!== undefined` by the three depth-gated rules. */
	readonly requestedTools: readonly string[] | undefined;
	readonly includeYield: boolean;
	readonly enableLsp: boolean;
	readonly goalEnabled: boolean;
	readonly externalThinkingActive: boolean;
	readonly allowEval: boolean;
}

export type ToolAdmissionRule = (ctx: ToolAdmissionContext) => boolean;

/** Keyed by the UNION, not `ToolName` (= `BuiltinToolName`): `goal` and `think` carry real
 *  rules but are `HiddenToolName`, so a `Record<ToolName, …>` would not typecheck. */
const ADMISSION_RULES = {
	// --- always admitted: the three transport tools + yield had NO branch in the old chain ---
	read: () => true,
	write: () => true,
	edit: () => true,
	yield: () => true,

	// --- three-way goal rule (old `tools/index.ts:737-741`) ---
	goal: (ctx) => {
		if (!ctx.goalEnabled || ctx.restrictToolNames) return false;
		const state = ctx.session.getGoalModeState?.();
		return state === undefined || state.enabled === true || state.goal.status === "dropped";
	},

	// --- depth-gated family: the SAME `taskDepth === 0 || requestedTools !== undefined` term ---
	checkpoint: (ctx) =>
		cfgCheckpointEnabled.get(ctx.session.settings) &&
		((ctx.session.taskDepth ?? 0) === 0 || ctx.requestedTools !== undefined),
	rewind: (ctx) =>
		cfgCheckpointEnabled.get(ctx.session.settings) &&
		((ctx.session.taskDepth ?? 0) === 0 || ctx.requestedTools !== undefined),
	manage_skill: (ctx) =>
		cfgAutolearnEnabled.get(ctx.session.settings) &&
		((ctx.session.taskDepth ?? 0) === 0 || ctx.requestedTools !== undefined),
	learn: (ctx) =>
		cfgAutolearnEnabled.get(ctx.session.settings) &&
		((ctx.session.taskDepth ?? 0) === 0 || ctx.requestedTools !== undefined) &&
		["hindsight", "mnemopi", "local"].includes(cfgMemoryBackend.get(ctx.session.settings)),

	// --- three-way OR (old `:766-772`) ---
	wait: (ctx) =>
		cfgAsyncEnabled.get(ctx.session.settings) ||
		(ctx.session.enableIrc !== false && isIrcEnabled(ctx.session.settings, ctx.session.taskDepth ?? 0)) ||
		cfgLaunchEnabled.get(ctx.session.settings),

	// --- its OWN depth gate, via canSpawnAtDepth — a different fork, not a duplicate row ---
	task: (ctx) => canSpawnAtDepth(cfgTaskMaxRecursionDepth.get(ctx.session.settings), ctx.session.taskDepth ?? 0),

	// --- simple single-setting reads, one line each ---
	lsp: (ctx) => ctx.enableLsp && cfgLspEnabled.get(ctx.session.settings),
	bash: (ctx) => cfgBashEnabled.get(ctx.session.settings),
	eval: (ctx) => ctx.allowEval,
	// … 19 more, one per old branch …
} satisfies Record<BuiltinToolName | HiddenToolName, ToolAdmissionRule>;

/** `satisfies` above gives COMPILE-TIME exhaustiveness (missing AND extra keys both error).
 *  Wrapping in a Map gives PROTOTYPE-SAFE lookup: `ADMISSION['toString']` would return a
 *  callable `Object.prototype.toString` (truthy string, not a boolean) and `["__proto__"]`
 *  would return a non-function that throws when called. A plain `Record` lookup is a
 *  live hazard here because `tools/index.ts:799` already lets `"toString"` past its own
 *  `name in BUILTIN_TOOLS` gate. */
export const TOOL_ADMISSION: ReadonlyMap<string, ToolAdmissionRule> = new Map(
	Object.entries(ADMISSION_RULES),
);

/** Default-allow. A name with no rule is NOT a built-in — extension / MCP / custom tool. */
export function isToolAllowed(name: string, ctx: ToolAdmissionContext): boolean {
	return TOOL_ADMISSION.get(name)?.(ctx) ?? true;
}

// packages/coding-agent/src/tools/index.ts — the call site collapses to:
//
//   const admissionCtx: ToolAdmissionContext = {
//     session, restrictToolNames, requestedTools, includeYield,
//     enableLsp, goalEnabled, externalThinkingActive, allowEval,
//   };
//   const isToolAllowed = (name: string) => evaluateToolAdmission(name, admissionCtx);
//
// …and `isToolAllowed` keeps its exact current signature, so the `BuiltinToolPlan.isAllowed`
// contract at `tools/index.ts:611` and its consumer at `sdk.ts:3350` are untouched.
```

### Hợp đồng test

Bảo vệ: *"tập tool mà một session được nhận không thay đổi khi thang admission trở thành một bảng"*. Một hồi quy ở phía người tiêu dùng ở đây là **âm thầm và nghiêm trọng** — một tool thừa trong schema tốn token và làm rối model, một tool thiếu làm một năng lực trở nên không với tới được mà không có lỗi nào ở bất kỳ đâu. Cụ thể nó đóng dấu: luật ba chiều của `goal` **bao gồm** ngoại lệ trạng thái `dropped`; phép OR ba chiều trong `wait`; ba luật phụ thuộc độ sâu dùng chung vế hạng từ `taskDepth === 0 || requestedTools !== undefined`; fork `canSpawnAtDepth` riêng của `task`; và mặc định-cho-phép cho bất cứ thứ gì không phải built-in.

Nếu hồi quy, người tiêu dùng thấy một trong hai: hoặc một built-in tool biến mất khỏi schema của model mà không có lỗi nào báo ra, hoặc một tool không nên tới được model mà lại tới. Dòng prototype-safety là dòng bắt được một cách hiện thực `Record` ngây thơ, và dòng extension-tool là dòng bắt được một bảng vô tình khoá theo sai union hoặc một phép tra cụ thể bỏ sót mặc định `?? true` của nó.

**Tên file test:**
- `packages/coding-agent/test/tools/tool-admission-table.test.ts` (tạo mới)
- `packages/coding-agent/test/issue-5764-registertool-loadmode.test.ts` (giữ làm lưới hồi quy, phải xanh)

### Xác minh

```bash
# 1. Cổng chính, chạy được khi native addon chưa build
bun run check:ts

# 2. Test đặc tính hoá — BỊ CHẶN ở HEAD 808b365: báo 0 pass / 1 fail,
#    "Failed to load pi_natives native addon for darwin-arm64"
#    Build addon trước rồi chạy lại:
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
cd packages/coding-agent && bun test test/tools/tool-admission-table.test.ts

# 3. Canh chống độ trôi sẵn có — phải giữ xanh
cd packages/coding-agent && bun test test/issue-5764-registertool-loadmode.test.ts

# 4. Cặp bị loại trừ khỏi họ phụ thuộc độ sâu
cd packages/coding-agent && bun test test/experimental-context-management.test.ts
```

Không dùng `tsc` — dự án cấm. `check:ts` là cổng chính.

### Cổng hoàn thành

Test đặc tính hoá ở các bước 2-6, viết và commit **trước** khi refactor, xanh **cả trước và sau**. Cụ thể: cả sáu dòng nhánh, cộng dòng extension-tool, cộng dòng prototype-safety, phải pass trên **cả hai** — chuỗi 25 nhánh lẫn bảng. Nhưng sáu dòng (a)-(f) chỉ phủ **7 trong 29** tên mà chuỗi `if` xử lý — 22 tên còn lại (`lsp`, `eval`, `think`, `todo`, `find`, `retain`/`recall`/`reflect`, `memory_edit`, `context_notes`/`new_context`, …) không có dòng nào biến động chúng, nên rơi `enableLsp` hay `externalThinkingActive` vẫn khiến cả bảy dòng kia xanh. Vì vậy phần kiểm kê phải là một test **snapshot** tự động trong `tool-admission-table.test.ts`, không phải một đợt làm tay: trên ma trận settings × độ sâu (taskDepth 0 và 1 × tất cả cổng tắt và tất cả cổng bật × memory backend `hindsight`/`mnemopi`/`local`), gọi `resolveBuiltinToolPlan` cho **từng** tên trong `BUILTIN_TOOL_NAMES` + `HIDDEN_TOOL_NAMES` (33 tên) rồi `expect(plan.isAllowed(name)).toBe(true/false)` theo một bảng kỳ vọng commit sẵn. Vì 33 tên đều có ô, một field context bị rơi làm **một** ô lệch và test đỏ ngay trong CI. Giữ thêm một đợt kiểm kê thủ công một-lần (diff danh sách `.names` byte-identical giữa commit trước và sau refactor) như **đối chiếu bổ sung**, không phải như cổng.

**Cổng này có thực sự đỏ được không: Có.** Nó đỏ được ở ba chỗ khác nhau, mỗi chỗ một cơ chế hỏng khác nhau: (1) nếu một trong tám field context bị rơi khi nâng closure lên thành field, `.names` sẽ lệch và ô tương ứng trong bảng snapshot đỏ; (2) nếu ai đó đơn giản hoá `Map` về `Record` trần, dòng prototype-safety đỏ — `toString` trả về chuỗi truthy thay vì boolean nên `toBe(true)` hỏng, còn `__proto__` ném lỗi khi gọi; (3) nếu bảng bị khoá theo `ToolName` thay vì union, `bun run check:ts` đỏ ngay tại biên dịch vì `goal`/`think` là `HiddenToolName`. Ngoài ra cổng còn đỏ sớm hơn nữa nếu không build native addon — `bun test` báo `0 pass / 1 fail` với `Failed to load pi_natives native addon for darwin-arm64`.

### Phụ thuộc

- `WI-2` (collision rules đã chốt — thứ tự đăng ký trở nên nhạy với thứ tự một khi bảng admission trở thành khai báo).
- `WI-5` (bảng tập tool mà registry chế độ sẽ rút ra, để nó bắt đầu từ một khai báo duy nhất).

Chặn:
- Lần tách built-in → extension đầu tiên dưới WI-6 / WI-8a (mục đích plan nêu: biến một thay đổi bốn file thành cơ học).
- `WI-8a` (settings ownership) — lần tách đầu tiên đáp xuống bảng này.

### Cách sai dễ nhất

Closure `isToolAllowed` bắt **tám** biến tự do trực tiếp (`session`, `restrictToolNames`, `requestedTools`, `includeYield`, `enableLsp`, `goalEnabled`, `externalThinkingActive`, `allowEval`) cộng **hai mươi ba** tên `cfg*`/helper khác nhau được đọc trong thân (`cfgAskEnabled` … `canSpawnAtDepth`, tổng 26 lần đọc). Nâng từng nhánh lên thành một `(ctx) => boolean` độc lập buộc tám biến đó trở thành field context tường minh — và đúng tám field đó là `ToolAdmissionContext`; **một field bị rơi biên dịch vẫn sạch** và âm thầm mở rộng hoặc thu hẹp admission. Cái cắn **nặng nhất** là `requestedTools`, vì nó **không phải** một bản chụp — nó là một mảng sống mà `isToolAllowed` đọc tại thời điểm gọi **sau khi** `requestedTools.push("yield")` đã mutate nó tại `tools/index.ts:794-796`.

Cái sai thứ hai, và cái này plan nêu sai hướng: rủi ro **không** phải "đảo thứ tự ưu tiên âm thầm". Cả 25 nhánh đều là `if (name === "literal")` và 29 tên phân biệt trong đó **đôi một rời nhau**, nên nhiều nhất chỉ một nhánh có thể khớp một `name` cho trước. Thứ tự nhánh vì thế **chứng minh được** là không thể làm đổi kết quả nào; cơ chế hỏng đã nêu **không thể xảy ra**. Việc cơ học là bất nhạy với thứ tự; việc ngữ nghĩa là bất nhạy với capture.

Cái sai thứ ba: dùng `Record` trần thay vì `Map`. Với một object literal và phép tra `TABLE[name]`, `TABLE["toString"]` phân giải thành `Object.prototype.toString` — một **HÀM**, nên gọi nó trả về chuỗi truthy `"[object Undefined]"` thay vì một boolean; `TABLE["constructor"]` trả về `Object`, truthy; `TABLE["__proto__"]` trả về một thứ không phải hàm và **ném lỗi** khi gọi. Đây là đường đi **thật**, không lý thuyết: `tools/index.ts:799` cổng trên `name in BUILTIN_TOOLS`, mà `in` trên một object literal cũng bị ô nhiễm prototype đúng y như vậy.

### Cần người quyết

- Bốn tên luôn được nhận (`read`, `write`, `edit`, `yield`) có nên có các dòng `() => true` tường minh, hay vắng mặt và dựa vào mặc định `?? true`? Đặc tả chọn dòng tường minh để bảng là một mô tả **đầy đủ** về admission, nhưng một người review có thể hợp lý cho rằng vắng mặt thì thành thật hơn, vì trước đó chúng không có luật nào. Đây là lựa chọn về hình thức, **không** khác nhau về hành vi — hãy chọn một và ghi lại.
- Dòng prototype-safety (một tool extension mang chính cái tên `toString` / `__proto__`) có thuộc PR này không, hay là một hạng mục hardening riêng? Đây là một rủi ro mới **thực sự** do refactor sinh ra, nên lẽ ra phải nằm trong phạm vi — nhưng nó nới bề rộng PR từ "refactor" thành "refactor + hardening".
- `SESSION_MANAGED_BUILTIN_TOOL_NAMES` có thuộc WI-6 không, hay thuộc bảng tập tool của WI-5? Plan không nhắc tới nó; nó được phát hiện khi đi tìm các khai báo song song không có kiểu, và nó cùng một lớp vấn đề.
- Hai thay đổi **tuỳ chọn** (bước 11 và vế sau của bước 12) có nằm trong phạm vi WI-6 không, hay tách ra? Bước 11 là **vá lỗi có sẵn**, không phải hồi quy do refactor này gây ra — gộp vào sẽ làm PR khó review hơn; vế `SESSION_MANAGED_BUILTIN_TOOL_NAMES` lại được plan hoàn toàn bỏ sót, nên ai đó có thể cho rằng nó thuộc WI-5.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| `packages/coding-agent/src/tools/index.ts:725-789` là chuỗi 25 nhánh `isToolAllowed`. | STALE | Chuỗi nằm ở dòng **731-793**. Lệch +6 ở đầu, +4 ở cuối. Bằng chứng: `grep -n 'const isToolAllowed' packages/coding-agent/src/tools/index.ts` → `731: const isToolAllowed = (name: string) => {`; đọc 731-793 thấy dấu `};` đóng ở 793. |
| Các neo con: `goal` ở `:731-735`, `wait` ở `:762-769`, `checkpoint`/`rewind` ở `:755-761`, `manage_skill` ở `:774-778`, `learn` ở `:779-785`, `task` ở `:786-788`, `context_notes`/`new_context` ở `:753-754`. | STALE (cả bảy) | Dòng thật: goal **737-741**, context_notes/new_context **759-760**, checkpoint/rewind **761-765**, wait **766-772**, manage_skill **777-781**, learn **782-788**, task **789-791**. Tất cả đều thấp hơn plan nói 3-6 dòng. Sao chép máy móc các neo này sẽ rơi nhầm nhánh. Bằng chứng: đếm bằng `awk` số dòng khớp `^\s*if (name ===` trong 731-793 ra **đúng 25**, xác nhận **số nhánh** plan nói là đúng dù số dòng thì không. |
| `BUILTIN_TOOLS` ở `:548-579`, `SETTINGS_GATED_BUILTIN_TOOL_NAMES` ở `:594-597`, ràng buộc `isMountableUnderXdev` ở `:899`. | STALE | Thật: `BUILTIN_TOOLS` **554-585**, `SETTINGS_GATED_BUILTIN_TOOL_NAMES` **600-602**, ràng buộc xdev ở **902**. |
| Rủi ro là "đảo thứ tự ưu tiên âm thầm": chuỗi 25 nhánh là một thang early-return, nên sắp lại nhánh trong lúc di chuyển có thể đổi luật nào thắng mà không đổi thân luật nào. | OVERSTATED — và chỉ người triển khai vào đó sẽ phí hết một ngày lẽ ra phải dành cho rủi ro thật | Cả 25 nhánh đều là `if (name === "literal")` và 29 tên phân biệt trong đó đôi một rời nhau, nên nhiều nhất một nhánh có thể khớp một `name` cho trước. Thứ tự nhánh vì thế **chứng minh được** không thể đổi bất kỳ kết quả nào. Rủi ro thật là cái plan **không** nêu tên: nâng mỗi nhánh thành một `(ctx) => boolean` độc lập đòi hỏi phải nâng **tám** biến tự do của closure thành field context tường minh, và một field bị rơi biên dịch vẫn sạch trong khi âm thầm đổi admission. Bằng chứng: trích 29 tên phân biệt từ `tools/index.ts:731-793` và xác nhận không tên nào xuất hiện ở hai nhánh: `ask ast_edit ast_grep bash checkpoint context_notes debug eval find github glob goal grep ida learn lsp manage_skill memory_edit new_context recall reflect retain rewind security_scan task think todo wait web_search`. |
| Bảng nên là `Record<ToolName, (ctx) => boolean>`. | WOULD NOT TYPECHECK | `ToolName = BuiltinToolName` (`tools/index.ts:593`), tức 30 tên built-in. Nhưng `isToolAllowed` mang luật thật, không phải mặc định, cho `goal` và `think`, và cả hai là `HiddenToolName`, không phải `BuiltinToolName`. Key phải là `BuiltinToolName \| HiddenToolName` (33 tên). Viết theo đúng cách plan nói hoặc làm typecheck hỏng, hoặc âm thầm làm rơi luật `goal` — mà luật `goal` chính là luật mang điều kiện ba chiều và ngoại lệ trạng thái `dropped`. Bằng chứng: `grep -n 'export type ToolName' tools/index.ts` → `593: export type ToolName = BuiltinToolName;`; `builtin-names.ts:36` cho `HIDDEN_TOOL_NAMES = ["yield", "goal", "think"]`; trừ 30 tên `BUILTIN_TOOL_NAMES` ra thì còn **đúng hai** tên được phủ nhưng không phải built-in. |
| Không được plan nào nhắc: một bảng admission hình `Record` tạo ra nguy cơ tra cứu theo chuỗi prototype mà code hiện tại không có. | NEW FINDING — đây là rủi ro đúng đắn nhất của cả mục | Với object literal trần và phép tra `TABLE[name]`, `TABLE["toString"]` phân giải thành `Object.prototype.toString` — một HÀM, gọi nó trả về chuỗi truthy `"[object Undefined]"` thay vì boolean; `TABLE["constructor"]` trả về `Object`, truthy; `TABLE["__proto__"]` trả về thứ không phải hàm và **ném lỗi** khi gọi. Chuỗi `if` hiện tại miễn nhiễm vì tên không khớp rơi xuống `return true`. Đường đi này là thật: `tools/index.ts:799` cổng trên `name in BUILTIN_TOOLS`, và `in` trên object literal cũng bị ô nhiễm prototype y hệt — một tool extension tên `toString` đã vượt qua cổng đó ngày hôm nay và tới `isToolAllowed`. Giảm thiểu: dựng `Map` từ `Object.entries()` của một literal `satisfies Record<…>`, giữ exhaustive ở thời điểm biên dịch trong khi tra cứu thì an toàn prototype. Bằng chứng: đã chạy một probe trên hình dạng cổng thật: `["read","toString","constructor","__proto__"].filter(n => n in BUILTIN_TOOLS)` → cả bốn đều qua. Và trên bảng đề xuất: `toString`/`constructor` → callable, truthy không phải boolean; `__proto__`/`my_ext_tool` → không callable, ném lỗi. |
| Các khai báo song song cần gộp là `BUILTIN_TOOL_NAMES` (30), `BUILTIN_TOOLS`, và `ESSENTIAL_BUILTIN_TOOL_NAMES` (13). | PARTLY REDUNDANT — một trong ba đã an toàn rồi | Cặp `BUILTIN_TOOL_NAMES` ↔ `BUILTIN_TOOLS` **đã** được ép buộc ở thời điểm biên dịch: `BUILTIN_TOOLS` khai báo là `Record<BuiltinToolName, ToolFactory>` (`tools/index.ts:554`), và TypeScript từ chối cả key thiếu lẫn key thừa. Không có gì để gộp ở đó và không có test nào cần thêm. Các khai báo thực sự thiếu liên kết kiểu là `ESSENTIAL_BUILTIN_TOOL_NAMES` (`Record<string, true>` — key không kiểu, chỉ có canh runtime) và `SESSION_MANAGED_BUILTIN_TOOL_NAMES` (`sdk.ts:1161`, `string[]` trần, **không có** canh nào cả). Plan cũng không bao giờ nhắc tới cái sau. Bằng chứng: biên dịch một probe với `bunx tsc --noEmit --strict`: `Record<"a"\|"b"\|"c", F>` với `{a,b}` → TS2741 'Property c is missing'; với một `d` thừa → TS2353 'Object literal may only specify known properties'. Baseline `bun run check:ts` xanh tại HEAD. *(Ghi chú: probe này là cách **kiểm chứng** đã dùng khi lập đặc tả, không phải một lệnh dành cho người triển khai chạy lại trong PR — dự án cấm dùng `tsc`.)* |
| `ESSENTIAL_BUILTIN_TOOL_NAMES` ở `essential-tools.ts:23-37` (13 tên) và `builtin-names.ts:2-31` (30) / `:36` (3). | CORRECT | Không thay đổi. Đây là **những neo duy nhất** trong toàn bộ mục đã đúng sẵn — đáng nói rõ tường minh để người triển khai không phải kiểm chứng lại. Bằng chứng: đọc trọn cả hai file; đếm 13 và 30 mục tương ứng. |
| Ba built-in cộng `yield` được nhận ẩn; plan không nói. | HÀNH VI CHƯA ĐƯỢC TÀI LIỆU HOÁ — KHÔNG ĐƯỢC ĐÁNH MẤT | `read`, `edit`, `write` và hidden `yield` **không có** nhánh nào trong thang và chạm tới `return true` ở cuối. Một bảng `Record` chỉ liệt kê các tool có luật sẽ **không** đổi gì hôm nay, nhưng nó để lại admission dưới dạng chưa đặc tả cho bốn trong ba mươi ba tên. Đặc tả chọn các mục `() => true` tường minh để bảng là một mô tả **đầy đủ** thay vì một phần. Bằng chứng: trừ 29 tên được phủ khỏi 30 `BUILTIN_TOOL_NAMES` còn đúng read, edit, write; trừ khỏi `HIDDEN_TOOL_NAMES` còn đúng yield. |
| (Khung nhiệm vụ) repo git HEAD là `5873776`. | STALE | HEAD là `808b365` trên nhánh `milestone-1`. Bằng chứng: `git rev-parse HEAD` → `808b365409fa36719c38319a041c0e612b4e702b`; `git log --oneline -3`. |
| Lệnh kiểm chứng `bun run check:ts && (cd packages/coding-agent && bun test test/tools/tool-admission-table.test.ts)`. | HALF-BLOCKED | `check:ts` chạy xanh tại HEAD (cả 15 package Done). Nửa lệnh test **không** chạy được: `bun test` báo `0 pass / 1 fail / 1 error` với `Failed to load pi_natives native addon for darwin-arm64`. Phải build addon bằng `bun --cwd=packages/natives run build` trước khi nửa test của cổng này có ý nghĩa. Đã xác nhận bằng cách thực sự chạy cả hai lệnh tại HEAD 808b365. |


---


## WI-7. registerMode: sổ đăng ký mode cấp cao nhất, thiết kế cùng đường may (seam) của status-line

**Nguồn của tài liệu này:** phần WI-7 của `MILESTONE_2_EXECUTION_PLAN.md` (:1978-2261) được sao chép nguyên văn; bảng "Đính chính so với plan" và cột "đã đối chiếu" là của chính plan, chưa qua một lượt kiểm chứng độc lập. Lượt kiểm chứng này đã chạy lại toàn bộ neo và sửa các claim còn sai (xem các hàng ĐÍNH CHÍNH bên dưới); mọi neo chưa được sửa ở đây vẫn phải tự chạy lệnh trước khi tin.

**Thay đổi gì:** Tác giả extension chỉ cần một lời gọi `pi.registerMode` để cài một mode (tools, cổng settings, enter/exit, chính sách ghi, và một chip nhìn thấy được trên status-line) thay vì tự dựng 15 KB cơ chế mode, đồng thời năm mode tích hợp sẵn được đăng ký lại qua đúng đường đó mà không đổi hành vi.

**Wave:** 5 (M2 wave 5 — registerMode: phần việc thực chất của M2)

**Effort:** L — một milestone nhiều PR, không phải một thay đổi lẻ. Dự trù 5-8 PR trong 4-5 tuần: (1) rút writePolicy ra khỏi code, (2) lõi registry, (3) cặp accessor trên bảy field, (4) đường may M2-OQ3 kèm test của nó, (5) bọc plan mode, (6) bọc goal/vibe/loop/prewalk, (7) registerMode trên ExtensionAPI + xoá ví dụ, (8) fixture "outsider" + test cài đặt. Bước 1 phải được viết trước khi registry tồn tại.

**Người dùng thấy:** Với người dùng không bao giờ cài mode từ bên thứ ba thì **không có gì đổi** — năm mode tích hợp sẵn render, chặn cổng và chặn ghi y hệt như hôm nay. Điều thay đổi là một mode được cài từ ngoài repo không còn có thể vô hình: `ModeDefinition.statusLine` là field bắt buộc, nên một mode đã đăng ký luôn sinh ra một chip trong segment `mode` sẵn có của status-line, với đúng tông accent/warning và đúng hậu tố pause mà các mode tích hợp sẵn đang dùng. Thứ bị gỡ khỏi tầm nhìn của người dùng: `examples/extensions/plan-mode.ts` (549 dòng) bị xoá và thay bằng một lời gọi `registerMode` khoảng 50 dòng, nên ai đã copy ví dụ đó thì mất phần văn xuôi hướng dẫn và giữ lại hành vi.

### File cần chạm tới

| path | hành động | thay đổi | đã đối chiếu (chạy lại lệnh trước khi tin) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/modes/mode-registry.ts` | tạo | Class `ModeRegistry` mới + các type `ModeDefinition` / `WritePolicy` / `ModeStatusLine` / `ModeContext`. Sở hữu việc đăng ký, thứ tự tất định, trạng thái active/paused, và `resolvedMode()` (người thắng duy nhất của thứ tự ưu tiên trên status-line). | Có — thư mục `packages/coding-agent/src/modes/` đã tồn tại và là đúng chỗ ở nhà (nó đã giữ `status-line-host.ts`, `settings.ts`, `types.ts`); bản thân file là file mới. |
| `packages/coding-agent/src/modes/index.ts` | sửa | Thêm `export * from "./mode-registry";` — star re-export, theo luật barrel của AGENTS.md. | Có — file tồn tại (603 bytes). |
| `packages/coding-agent/src/plan-mode/write-policy.ts` | tạo | Rút chính sách ghi của plan mode ra dạng dữ liệu: một literal `WritePolicy` cộng với bộ đánh giá `checkWritePolicy(policy, ctx)` trả về kind vi phạm (`move` | `delete` | `workingTree` | null). Core giữ quyền sở hữu văn bản thông báo cho người dùng. | Có — file mới bên trong thư mục `packages/coding-agent/src/plan-mode/` đã tồn tại (8 file: approved-plan, model-transition, plan-autosave, plan-files, plan-handoff, plan-protection, settings, state). |
| `packages/coding-agent/src/tools/plan-mode-guard.ts` | sửa | `enforcePlanModeWrite` trở thành một adapter mỏng: tra `writePolicy` của mode đang active từ registry, gọi `checkWritePolicy`, ném `ToolError` với text sẵn có ứng với kind vi phạm trả về. | Có — `enforcePlanModeWrite` ở :127, dấu `}` đóng ở :148, `targetsLocalSandbox` early-return ở :143. Thân hàm vi không đổi. |
| `packages/coding-agent/src/tools/write.ts` | sửa | 4 call site `enforcePlanModeWrite` hiện có nay tra chính sách qua registry thay vì đọc trực tiếp trạng thái plan mode. Bản thân lời gọi không đổi chữ ký. | Có — call site: :778 (update), :814 (archive, update), :842 (sqlite, update), :859 (create). Site archive và sqlite truyền `{ op: "update" }` trên path KHÔNG phải file cây làm việc thuần — phải soi từng cái với quy tắc working-tree. |
| `packages/coding-agent/src/modes/types.ts` | sửa | Dòng 189-194 giữ nguyên tên và kiểu `boolean` nhưng trở thành cặp accessor trên context (registry-backed). Bốn field không phải boolean ở 195-198 không bị đụng tới. | Có — :189 planModeEnabled, :190 vibeModeEnabled, :191 goalModeEnabled, :192 goalModePaused, :193 loopModeEnabled, :194 loopModePaused. :195-198 là loopPrompt/loopLimit/loopCondition/planModePlanFilePath — bị loại khỏi boolean seam một cách đúng đắn. |
| `packages/coding-agent/src/modes/interactive-mode.ts` | sửa | Thay 7 initializer field của class bằng cặp getter/setter nối tới registry. Thêm thực thể registry. Nối `resolvedMode()` vào đường cập nhật status-line. | Có — **ĐÍNH CHÍNH ANO CŨ**: plan nói field ở :981-988; thực tế ở :908-915. Có **BẢY** field chứ không phải sáu: `planModePaused = false` ở :909 là runtime-only và không có trong `InteractiveModeContext`. Có 32 chỗ gán trong src (đều nằm trong file này), nên getter trần sẽ không compile — xem mục Đính chính. |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | Bốn accessor trạng thái mode giữ nguyên tên, kiểu trả về, và hành vi trả `undefined` khi inactive; registry cấp giá trị đằng sau chúng. | Có — **ĐÍNH CHÍNH ANO CŨ**: plan nói getPlanModeState :6097 / getPrewalkState :6102 / getGoalModeState :6120 / getVibeModeState :6128; thực tế là :6132 / :6137 / :6155 / :6163. Còn `codeModeNamespacesInfo` ở :5852 (plan nói :5822) và `#codeModeState` ở :1395 (plan nói :1387). |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Thêm `registerMode(definition: ModeDefinition): void` vào `ExtensionAPI`. KHÔNG thêm bí danh `ui`. | Có — `ExtensionAPI` (:1256-1582) không có member `ui`: `awk 'NR>=1256 && NR<=1582' .../types.ts \| grep -E '^\s+(readonly )?ui\b'` trả về rỗng; lần xuất hiện duy nhất của `ctx.ui` là một comment ở :1376. `registerTool` (:1347), `registerCommand` (:1411), `registerFlag` (:1430), `setActiveTools` (:1501) là khuôn mẫu trong nhà để noi theo. |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | Bind `registerMode` trên object `pi` đưa cho từng factory extension; ghi lại source id chủ sở hữu để unload bỏ được các mode của nó. | Có — loader đã import `resolvePath, withHostGuard` từ `../utils` ở :40 — đường ống provenance mà WI-5 thêm vào là seam để tái dùng. |
| `packages/tui/src/status-line/types.ts` | sửa | Thêm một type `ModeStatusLine` và **MỘT** field mới của `SegmentContext` mang phần đóng góp hiển thị của mode đã resolve. Phụ thuộc quyết định M2-OQ3 — xem open_questions. | Có — `SegmentContext` ở :75 với NĂM field mode hardcode riêng biệt: planMode :96, prewalk :100, loopMode :103, goalMode :109, vibeMode :113. Chính các field đóng theo từng mode mới là thứ chặn thật, chứ không chỉ riêng union id. |
| `packages/tui/src/status-line/schema.ts` | sửa | Không kỳ vọng thay đổi. Union `StatusLineSegmentId` 27 phần tử vẫn đóng; một mode từ extension render bên trong segment `mode` sẵn có chứ không phải thành một id mới. | Có — array literal trải :2-30 và đúng 27 phần tử. File này chỉ được liệt kê để người review xác nhận rằng nó cố ý được để nguyên đóng. |
| `packages/tui/src/status-line/segments.ts` | sửa | `modeSegment` hỏi field mode-đã-resolve mới trước, rồi rơi tiếp xuống chuỗi ưu tiên 5 nhánh hiện có, không đổi. | Có — const `modeSegment` ở :364, `id: "mode"` ở :365, chuỗi ưu tiên plan→prewalk→goal→vibe→loop ở :369-407. Ngoài lề: "segments.ts:919-947" của plan là record SEGMENTS và CẢ HAI ĐẦU ĐỀU ĐÚNG — :919 mở ra, :947 là `};` đóng; không cần sửa. `id: "mode"` ở :365 (const mở ra ở :364) cũng đúng. |
| `packages/coding-agent/src/modes/status-line-host.ts` | sửa | Đưa mode đã resolve của registry vào status-line host để segment thấy nó cạnh năm field hiện có. | Có — file tồn tại (3.2 KB) và là chỗ duy nhất khối policy `StatusLineHost` được dựng. |
| `packages/coding-agent/examples/extensions/plan-mode.ts` | xoá | Xoá ví dụ tự dựng 549 dòng. Đây là ĐIỀU KIỆN TIÊN QUYẾT, không phải cổng nghiệm thu. | Có — 549 dòng / 15,153 bytes. Các neo :216 (registerFlag), :255 (setActiveTools), :301 (tool_call hook) mà plan trích đều rơi đúng chỗ. Xoá file này là một input thiết kế, không phải bằng chứng — xem trường risk. |
| `packages/coding-agent/test/plan-mode/write-policy.test.ts` | tạo | An toàn cốt lõi. Một mode do extension đăng ký, có writePolicy, TỪ CHỐI một ghi vào cây làm việc VÀ CHO PHÉ một ghi vào sandbox `local://`. Cả hai nửa đều bắt buộc. | Có — thư mục đã xác nhận (5 file: approved-plan, model-transition, plan-handoff, plan-protection, reentry-prompt). Phần phủ của `plan-protection.test.ts` KHÔNG được lặp lại ở đây. |
| `packages/coding-agent/test/modes/mode-registry.test.ts` | tạo | Với mỗi mode đã migrate: cùng tập tool sau `enter`, cùng giá trị `mode` báo ngược lại cho extension, cùng kết quả resolve settings-domain. | Có — thư mục đã xác nhận. Khẳng định trạng thái session quan sát được — không bao giờ khẳng định "registry đã được gọi". |
| `packages/tui/test/status-line-extension-mode.test.ts` | tạo | Một mode do extension đăng ký render ra một mode segment. Dòng test này là thứ duy nhất khiến mặc định "mode mới không có chỉ báo" không thể ship lặng lẽ. | Có — thư mục đã xác nhận; có 8 file status-line-*.test.ts sẵn để noi về văn phong. Chỉ viết được SAU khi có quyết định seam M2-OQ3. |
| `packages/coding-agent/test/fixtures/outsider-extension/index.ts` | tạo | Chỉ chân wave 5: một package nằm ngoài examples/ đăng ký một tool, một slash command, một hook session_start, ctx.ui.setWidget, và pi.registerMode. KHÔNG có dòng registerSetting. | Có — chưa tồn tại, đã xác nhận. Đặc tả ở plan §11.2 mục 12. `pi.registerMode` và `pi.registerSetting` đều vắng ở HEAD (`git grep` rỗng), nên file này không thể typecheck cho tới khi cả hai tồn tại. |
| `packages/coding-agent/test/fixtures/outsider-extension/package.json` | tạo | Khai báo `omp.extensions` trỏ tới index.ts. Không path hardcode, không danh sách tên trong bất kỳ loader nào. | Có — chưa tồn tại, đã xác nhận. |
| `packages/coding-agent/test/extension-outsider-install.test.ts` | tạo | Nạp fixture qua đường cài đặt thật và khẳng định nó CHẠY: `result.errors` rỗng, tool có trong bảng tool, command có trong registry, handler session_start bắn, widget có trong frame, mode có trong registry KÈM status-line segment của nó. | Có — chưa tồn tại, đã xác nhận. Phải sao chép kỷ luật cô lập của file sẵn có `packages/coding-agent/test/plugin-extensions-discovery.test.ts` (26 KB, đã xác nhận có mặt). |

### Các bước

0. **Làm việc này TRƯỚC MỌI CODE:** lấy quyết định về đường may status-line M2-OQ3 được ký bằng văn bản. Quyết định phải thoả bốn ràng buộc đã đối chiếu với HEAD: (1) union 27 phần tử ở schema.ts:2-30 vẫn đóng; (2) một mode đã đăng ký render bên trong segment `mode` sẵn có (segments.ts:364), không phải thành id mới; (3) chuỗi ưu tiên năm nhánh plan→prewalk→goal→vibe→loop (segments.ts:369-407) được giữ nguyên và thứ tự của nó đến từ registry, không phải từ hệ thống file; (4) `ModeDefinition.statusLine` là BẮT BUỘC, không bao giờ optional. Phương án 3 của chính plan (§7.4, "mode segment reads id from ModeRegistry") là phương án duy nhất trong ba phương án thoả cả bốn — nhưng plan cố ý KHÔNG chọn, nên phải có người quyết. Mọi thứ ở bước 3 trở đi đều phụ thuộc bước này.

1. **Test `packages/coding-agent/test/plan-mode/write-policy.test.ts` được viết ở BƯỚC 3 — ngay sau khi `ModeRegistry` có mặt, và TRƯỚC khi bất kỳ mode nào được bọc. Bước 2 cấm viết nó ở commit đó, vì nó dẫn qua policy của registry mà bước 2 cố tình không chạm tới.** Test phải chứng minh CẢ HAI nửa: một mode có writePolicy chặn ghi vào cây làm việc thì TỪ CHỐI một lần ghi `src/foo.ts`, VÀ chính mode đó CHO PHÉP một lần ghi `local://slug-plan.md`. Thiếu một khẳng định trong hai là một test vẫn xanh trên một implementation vốn cũng chặn luôn sandbox. Hãy dẫn nó qua một policy do registry cấp, không phải qua plan mode tích hợp sẵn — bất đẳng thức của plan mode tích hợp sẵn đã được phủ tại test/tools/plan-mode-guard-local.test.ts:90-127, và lặp lại nó ở đây là trùng lặp bị cấm. (anchor: packages/coding-agent/src/tools/plan-mode-guard.ts:127)

2. **Rút chính sách thành dữ liệu trong một commit MỚI không chạm registry mode nào.** `enforcePlanModeWrite` đọc writePolicy của mode đang active, gọi bộ đánh giá, và ném đúng các chuỗi `ToolError` sẵn có theo kind vi phạm (core giữ quyền sở hữu text; một extension không được phép tiêm chuỗi vào tool error). BẰNG CHỨNG CỦA COMMIT NÀY, không phải commit mới: `packages/coding-agent/test/tools/plan-mode-guard-local.test.ts` phải chạy xanh và TẤT CẢ năm khẳng định của nó phải được giữ nguyên, không dòng nào bị sửa. File đó đi vào `enforcePlanModeWrite` trực tiếp (nó stub `getPlanModeState` ở :33) và không cần registry, nên nó là integration test của đúng đoạn code bước 2 này sửa. Các message phải khớp với các regex mà test đó khẳng định: /working tree is read-only/, /deleting files is not allowed/, /renaming files is not allowed/. Đừng viết `test/plan-mode/write-policy.test.ts` ở commit này — nó dẫn qua policy của registry và chỉ chạy được từ bước 3; viết nó ở bước 3. (anchor: packages/coding-agent/src/plan-mode/write-policy.ts)

3. **Thêm `ModeRegistry` + type `ModeDefinition`.** Registry sở hữu: map id→definition, một thứ tự tất định (output của WI-2), trạng thái active/paused theo từng id, và `resolvedMode()` trả về người thắng duy nhất cho status-line. Từ chối id trùng lúc đăng ký bằng cách ném Error có nêu đích danh id. Không `any`, không `ReturnType<>`, chỉ field `#private`, chỉ import top-level, star re-export từ modes/index.ts. (anchor: packages/coding-agent/src/modes/mode-registry.ts)

4. **Chuyển 7 field trạng thái mode (dòng 908-915) thành cặp getter/setter có registry làm chân đế.** Commit này phải TÁCH khỏi bước 3. Getter trần là chưa đủ — có 32 chỗ gán `this.<mode>.x = ` ngay trong file này (planModeEnabled x4, planModePaused x5, vibeModeEnabled x3, goalModeEnabled x7, goalModePaused x7, loopModeEnabled x2, loopModePaused x4), nên mỗi cặp cần một setter định tuyến lệnh ghi vào registry. Sau commit này chạy hai cổng grep bên dưới và xác nhận không có diff site mới nào. (anchor: packages/coding-agent/src/modes/interactive-mode.ts:908)

5. **Đặt bốn accessor (getPlanModeState :6132, getPrewalkState :6137, getGoalModeState :6155, getVibeModeState :6163) lên registry**, giữ nguyên tên, nguyên kiểu trả về chính xác, và trả `undefined` khi inactive. `getPrewalkState` trả `Prewalk | undefined`, KHÔNG phải boolean — một getter boolean dẫn xuất không thay thế được nó. Rồi chạy lại grep seam-2: nó vẫn phải đúng 51 dòng trên 21 file, không dòng nào bị sửa tay. (anchor: packages/coding-agent/src/session/agent-session.ts:6132)

6. **Cài seam M2-OQ3 theo quyết định ở bước 0.** Thêm MỘT field mới của `SegmentContext` mang phần đóng góp hiển thị của mode đã resolve, đứng cạnh năm field mode hardcode sẵn có. Luồn nó qua `status-line-host.ts`. Trong `modeSegment` ở `segments.ts`, đọc field mới trước rồi rơi tiếp xuống chuỗi cũ, không đổi. Để `schema.ts` nguyên đóng. Viết `packages/tui/test/status-line-extension-mode.test.ts` trong chính commit này. (anchor: packages/tui/src/status-line/types.ts:96)

7. **Nạp registry bằng cách BỌC, không bao giờ viết lại:** đăng ký plan mode trước, rồi goal, vibe, loop, prewalk. Mỗi definition bọc ủy quyền `enter`/`exit` cho method `InteractiveMode` sẵn có; code gốc đứng nguyên tại chỗ. Chạy lại grep seam-1 sau MỖI mode được migrate. (anchor: packages/coding-agent/src/modes/mode-registry.ts)

8. **Viết `test/modes/mode-registry.test.ts`.** Với TỪNG mode trong năm mode đã migrate, khẳng định tính tương đương quan sát được so với bản build trước migrate: tập tool sau `enter` giống hệt, giá trị `mode` báo ngược lại cho extension giống hệt, kết quả resolve settings-domain giống hệt. Khẳng định trạng thái session quan sát được — không bao giờ khẳng định "registry đã được gọi". (anchor: packages/coding-agent/test/modes/mode-registry.test.ts)

9. **Thêm `registerMode(definition: ModeDefinition): void` vào `ExtensionAPI`**, theo khuôn mẫu registerTool/registerCommand/registerFlag. Bind nó trong extension loader và ghi lại source id chủ sở hữu để unload bỏ được các mode của extension đó. KHÔNG thêm bí danh `ui` vào `ExtensionAPI` — hôm nay nó không có member `ui` (đã xác minh: `ExtensionAPI` là :1256-1582, không có member `ui`; hit duy nhất của `ctx.ui` trong đó là một comment ở :1376) và thêm nó sẽ thành public member thứ 30 trên một bề mặt mà §5.2 đếm là 29. (anchor: packages/coding-agent/src/extensibility/extensions/types.ts:1347)

10. **Xoá `examples/extensions/plan-mode.ts` (549 dòng) và hạ một bản thay thế khoảng 50 dòng dựa trên `registerMode` trong cùng một commit.** Đây là ĐIỀU KIỆN TIÊN QUYẾT chứng tỏ API dùng được, KHÔNG phải cổng nghiệm thu — xoá một ví dụ nằm trong repo không chứng minh gì về một extension từ bên ngoài. (anchor: packages/coding-agent/examples/extensions/plan-mode.ts)

11. **Tạo fixture "outsider" (package.json khai báo `omp.extensions` + index.ts) đăng ký:** một tool, một slash command, một hook session_start, `ctx.ui.setWidget` (KHÔNG phải `pi.ui.setWidget` — cái đó sẽ không compile), và `pi.registerMode` kèm một `writePolicy`. KHÔNG thêm dòng `registerSetting` nào. Rồi viết `test/extension-outsider-install.test.ts`: dựng nó ở `<TempDir>/.omp/extensions/outsider-extension/` và gọi `discoverAndLoadExtensions([], tempProjectDir)` — không bao giờ truyền một path vào `configuredPaths`, vì làm vậy là vòng qua bước discovery — và lặp lại ở phạm vi user qua `setAgentDir` + `getAgentDir()`. Khẳng định nó CHẠY chứ không phải nó được tìm thấy: `result.errors` rỗng, tool có trong bảng tool, command có trong registry, hook bắn khi có event, widget có trong frame, mode có trong registry kèm status-line segment của nó. Sao chép kỷ luật cô lập của plugin-extensions-discovery.test.ts: spyOn(os,'homedir') trỏ về một temp home, xoá XDG_*, setAgentDir trong afterEach. (anchor: packages/coding-agent/test/fixtures/outsider-extension/index.ts)

### Hình dạng code

```typescript
// packages/coding-agent/src/modes/mode-registry.ts — the parts that are NOT obvious

/** Write admission for a mode. Data only — never a message string.
 *  Core keeps ownership of the user-facing `ToolError` text so an extension
 *  cannot inject arbitrary prose into a tool error. */
export interface WritePolicy {
	/** Writes under `local://` sandbox roots. */
	readonly sandbox: "allow" | "deny";
	/** Writes that land in the working tree. */
	readonly workingTree: "allow" | "deny";
	/** `op: "delete"`. */
	readonly delete: "allow" | "deny";
	/** `move:` renames. */
	readonly move: "allow" | "deny";
}

/** How a registered mode appears in the status line's `mode` segment. */
export interface ModeStatusLine {
	readonly label: string;
	readonly icon: string | undefined;
	readonly tone: "accent" | "warning" | "customMessageLabel" | undefined;
	/** Rendered after the label when the mode is paused (default " (paused)"). */
	readonly pausedSuffix: string | undefined;
}

/** Narrow context handed to `enter`/`exit`. Deliberately NOT InteractiveModeContext —
 *  an outside extension must not receive TUI internals. */
export interface ModeContext {
	readonly session: AgentSession;
	readonly settings: Settings;
	setActiveTools(toolNames: readonly string[]): Promise<void>;
	notify(message: string): void;
}

export interface ModeDefinition {
	readonly id: string;
	readonly label: string;
	readonly icon: string | undefined;
	/** REQUIRED — a mode that cannot announce itself does not register. */
	readonly statusLine: ModeStatusLine;
	/** `all-settings.ts` DOMAINS id whose keys gate this mode. */
	readonly settingsDomain: string;
	readonly initialToolSet: readonly string[];
	/** Lower sorts first in the `mode` segment. Unique. Fed by WI-2's order. */
	readonly order: number;
	enter(ctx: ModeContext): Promise<void>;
	exit(ctx: ModeContext): Promise<void>;
	readonly writePolicy?: WritePolicy;
}

export type ModeActivation = "active" | "paused";

/** Winner of the status-line priority order, computed ONCE by the registry so the
 *  segment does not re-derive it. `null` when no mode is active. */
export interface ResolvedMode {
	readonly id: string;
	readonly display: ModeStatusLine;
	readonly activation: ModeActivation;
}

export class ModeRegistry {
	readonly #definitions = new Map<string, ModeDefinition>();
	/** Absent = inactive. `ModeActivation` has no "inactive" member on purpose:
	 *  undefined is the only way to spell it, so it must be in the value type. */
	readonly #activation = new Map<string, ModeActivation | undefined>();
	#sorted: readonly string[] = [];
	#dirty = true;

	register(definition: ModeDefinition): void {
		if (this.#definitions.has(definition.id)) {
			throw new Error(`ModeRegistry: duplicate mode id "${definition.id}"`);
		}
		this.#definitions.set(definition.id, definition);
		this.#dirty = true;
	}

	/** Registry-backed backing for the `InteractiveMode` accessor pairs. */
	isActive(id: string): boolean {
		return this.#activation.get(id) === "active";
	}

	setActivation(id: string, activation: ModeActivation | undefined): void {
		if (activation === undefined) this.#activation.delete(id);
		else this.#activation.set(id, activation);
	}

	/** The single winner of the deterministic order, computed once here so the
	 *  segment never re-derives it. `null` when no mode is active. */
	resolvedMode(): ResolvedMode | null {
		for (const id of this.#sortedIds()) {
			const activation = this.#activation.get(id);
			const definition = this.#definitions.get(id);
			if (definition && activation) {
				return { id, display: definition.statusLine, activation };
			}
		}
		return null;
	}

	/** Active AND enabled for write policy. Drives `enforcePlanModeWrite`. */
	writePolicy(): WritePolicy | undefined {
		for (const id of this.#sortedIds()) {
			if (this.#activation.get(id) === "active") {
				const policy = this.#definitions.get(id)?.writePolicy;
				if (policy) return policy;
			}
		}
		return undefined;
	}

	#sortedIds(): readonly string[] {
		if (this.#dirty) {
			this.#sorted = [...this.#definitions.values()]
				.sort((a, b) => a.order - b.order)
				.map(d => d.id);
			this.#dirty = false;
		}
		return this.#sorted;
	}
}

// packages/coding-agent/src/modes/interactive-mode.ts:908 — accessor pairs, NOT bare getters.
// 32 assignment sites live in this file; a getter alone will not compile.
	get planModeEnabled(): boolean {
		return this.#modeRegistry.isActive("plan");
	}
	set planModeEnabled(value: boolean) {
		this.#modeRegistry.setActivation("plan", value ? "active" : undefined);
	}

// packages/tui/src/status-line/types.ts — ONE new field beside the five hardcoded ones.
// The five (`planMode` :96, `prewalk` :100, `loopMode` :103, `goalMode` :109,
// `vibeMode` :113) are the real blocker; the closed 27-id union is only half of it.
export interface SegmentContext {
	// ...existing fields unchanged...
	/** Winner of the registry's deterministic mode order, or null. Checked BEFORE the
	 *  legacy plan→prewalk→goal→vibe→loop chain, which then acts as the fallback. */
	resolvedMode: ResolvedMode | null;
}
```

### Hợp đồng test

Bốn hợp đồng, mỗi cái một thất bại quan sát được có tên rõ ràng.

1. **BẤT ĐẲNG THỨC WRITE-POLICY** — `packages/coding-agent/test/plan-mode/write-policy.test.ts`: một mode có chính sách chặn ghi vào cây làm việc sẽ từ chối một lần ghi `src/foo.ts` **và** chính mode đó chấp nhận một lần ghi `local://slug-plan.md`. Nếu hồi quy: một lần refactor nâng phép kiểm sandbox lên trên nhánh working-tree sẽ lặng lẽ chặn mất không gian gạch duy nhất mà coding-agent còn lại trong lúc plan mode bật; người dùng mất chỗ để soạn kế hoạch và không có gì trên UI giải thích vì sao. Nếu hồi quy theo hướng kia, coding-agent sẽ sửa một cái cây làm việc mà người dùng tin là chỉ-đọc — đường hỏng dữ liệu âm thầm duy nhất của M2.
2. **TƯƠNG ĐƯƠNG REGISTRY** — `packages/coding-agent/test/modes/mode-registry.test.ts`: với từng mode trong năm mode đã bọc, tập tool sau `enter`, giá trị `mode` báo ngược lại cho extension, và kết quả resolve settings-domain phải giống bản build trước migrate. Nếu hồi quy: một mode đã lên registry nhưng lại vào với một tập tool khác, khiến một tính năng biến mất lặng lẽ khỏi tầm nhìn của mô hình.
3. **NHÌN THẤY MODE SEGMENT** — `packages/tui/test/status-line-extension-mode.test.ts`: một mode do extension đăng ký phải render ra một chip trên status-line. Nếu hồi quy: một mode không có chỉ báo bị người dùng đọc như một lỗi, vì một segment `mode` đã tồn tại ở segments.ts:364 và họ sẽ mong một mode mới xuất hiện ở đó. Dòng test này là thứ duy nhất khiến mặc định đó không thể ship lặng lẽ.
4. **CÀI ĐẶT TỪ BÊN NGOÀI** — `packages/coding-agent/test/extension-outsider-install.test.ts`: một extension thật viết bên ngoài repo, nạp qua đường cài đặt thật, đăng ký một mode có writePolicy, và mode đó xuất hiện trong mode registry KÈM status-line segment của nó, đồng thời extension chạy được (errors rỗng, tool có trong bảng tool, command có trong registry, hook bắn, widget có trong frame). Nếu hồi quy: `registerMode` tồn tại nhưng không với tới được bởi bất kỳ thứ gì không nằm trong repo — đúng cái xanh giả mà plan nói việc xoá ví dụ trong repo không thể loại trừ.

**Tên file test:**

- `packages/coding-agent/test/plan-mode/write-policy.test.ts`
- `packages/coding-agent/test/modes/mode-registry.test.ts`
- `packages/tui/test/status-line-extension-mode.test.ts`
- `packages/coding-agent/test/extension-outsider-install.test.ts`
- `packages/coding-agent/test/fixtures/outsider-extension/index.ts`
- `packages/coding-agent/test/fixtures/outsider-extension/package.json`

### Xác minh

Cổng theo từng mục (chạy từ gốc repo) — TÁCH RIÊNG, KHÔNG xâu bằng `&&`. `check:ts` đứng trước dấu `&&` sẽ chặn không cho hai chân test chạy tới mỗi khi nó đỏ, kể cả vì một lý do không liên quan tới WI-7:

```bash
(cd packages/coding-agent && bun test test/plan-mode/write-policy.test.ts test/modes/mode-registry.test.ts) ; \
(cd packages/tui && bun test test/status-line-extension-mode.test.ts)
bun run check:ts
```

Cổng nghiệm thu wave 5 — TÁCH RIÊNG, và cố ý KHÔNG kèm check:ts (fixture được typecheck vì `packages/coding-agent/tsconfig.json` có `include "test"`, nên một dòng `registerSetting` sẽ làm check:ts đỏ và dấu `&&` sẽ chặn không cho test chạy tới):

```bash
cd packages/coding-agent && bun test test/extension-outsider-install.test.ts
```

Cổng đóng M2 (sau khi WI-8b thêm dòng `registerSetting` duy nhất) là lệnh đầy đủ có kèm check:ts. Không đặt check:ts lên cổng wave 5 và không dùng `// @ts-expect-error` để giữ một chân sống trong fixture.

Các cổng seam — chạy lại sau MỌI commit ở bước 4-7; bất kỳ call site nào bị sửa tay nghĩa là commit đó đã phá vỡ lời hứa tương thích GĐ1:

```bash
grep -n "planModeEnabled\|vibeModeEnabled\|goalModeEnabled\|goalModePaused\|loopModeEnabled\|loopModePaused" packages/coding-agent/src/modes/types.ts   # vẫn 6 dòng, 189-194
grep -cE "^\t(planModeEnabled|planModePaused|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused) = " packages/coding-agent/src/modes/interactive-mode.ts   # hôm nay 7, sau bước 4 phải bằng 0
grep -cE "^\t(get|set) (planModeEnabled|planModePaused|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused)" packages/coding-agent/src/modes/interactive-mode.ts   # hôm nay 0, sau bước 4 phải bằng 14
git grep -n "getPlanModeState\|getGoalModeState\|getVibeModeState\|getPrewalkState" -- packages/coding-agent/src | grep -v gallery-fixtures
```

Lệnh đầu một mình KHÔNG phân biệt được "đã làm accessor" với "chưa làm gì cả": `InteractiveModeContext` là một `interface` (`modes/types.ts:108`), nên các dòng `planModeEnabled: boolean;` vẫn phải y nguyên sau bước 4 — grep đó chỉ đỏ nếu ai đó ĐỔI TÊN field, điều bước 4 cấm. Hai lệnh `grep -c` mới là phần có tín hiệu thật.

Lệnh `git grep` cuối cùng (seam-2) phải báo đúng 51 dòng trên 21 file, không đổi, sau từng commit trong số đó.

**MÔI TRƯỜNG — đã đo lại trên máy này:** `bun run check:ts` PASS (exit 0): cây làm việc hiện SẠCH (`git status --porcelain` chỉ còn các thư mục `.lavish-wip/` và `MILESTONE_2_EXECUTION_PLAN.md` chưa track), nên cổng này XANH và đi hết tới `check:types`. Nó từng ĐỎ khi cây mang file sửa chưa commit, và chỉ dừng ở chặng đầu `check:tools` (`oxlint . && oxfmt --check ...`) chứ chưa từng tới `check:types` — `packages/coding-agent/src/__wi3_probe.ts` từng dừng nó ở đó và nay không còn tồn tại, nên đỏ cũ là do cây bẩn dùng chung chứ HEAD vẫn xanh. `bun test` vẫn bị CHẶN: nó báo `0 pass / 1 fail` với "Failed to load pi_natives native addon for darwin-arm64". Cả hai cổng đều phải được chạy tách riêng, không xâu bằng `&&`, để một cổng đỏ vì môi trường không chặn cổng kia phát ra tín hiệu. Hãy build native addon trước, hoặc coi mọi cổng test ở đây là CHƯA KIỂM CHỨNG — đừng đọc một kết quả đỏ là hồi quy trong code dưới test.

### Cổng hoàn thành

DONE nghĩa là cả bốn đều đúng. (1) `bun run check:ts` exit 0. (2) Grep seam-2 vẫn báo đúng 51 dòng trên 21 file với không chỗ sửa tay nào; sáu tên boolean vẫn còn nguyên ở modes/types.ts:189-194, đồng thời interactive-mode.ts không còn initializer thô nào cho bảy field (grep = 0) và có đúng 14 accessor (7 cặp get/set). (3) Một mode được đăng ký từ NGOÀI repo — packages/coding-agent/test/fixtures/outsider-extension/, nạp qua `discoverAndLoadExtensions([], tempProjectDir)` chứ không phải qua `configuredPaths` — xuất hiện trong mode registry mang một `statusLine` không optional, render ra một chip trong segment `mode` của status-line, chặn một lần ghi vào cây làm việc trong khi vẫn cho phép một lần ghi `local://`, và extension chạy với `result.errors` rỗng. (4) `examples/extensions/plan-mode.ts` không còn tồn tại.

Cổng này **có thực sự đỏ được không: CÓ, nhưng cần tách phần tín hiệu thật khỏi phần nhiễu môi trường.** Điều kiện (4) là sự tồn tại file và có thể đỏ; nửa `grep -c` của điều kiện (2) là câu lệnh thật và có thể đỏ. Điều kiện (1) cũng là câu lệnh thật và hiện XANH (exit 0, xem MÔI TRƯỜNG) — nhưng nó đã từng đỏ vì một file sửa chưa commit ngoài phạm vi WI-7, nên nếu cây lại bẩn, đừng quy kết quả đó cho công việc này. Ba nửa test của điều kiện (2) và (3) thì **không đỏ có ý nghĩa** ngày hôm nay, vì `bun test` đang bị chặn repo-wide bởi native addon thiếu: chúng sẽ đỏ vì một lý do không liên quan tới công việc này, nên độ tin cậy của cổng phải được xây lại sau khi build addon.

### Phụ thuộc

**Phụ thuộc vào (`depends_on`):**

- WI-1 — một mode bị treo phải thật sự dừng lại; nếu không, việc treo mode sẽ kế thừa lỗi timer đang sống.
- WI-2 — thứ tự mode phải tất định trước khi mode trở nên nhạy với thứ tự; hôm nay chuỗi ưu tiên trong mode segment là thứ tự duy nhất, và trường `order` của WI-7 phải đến từ đó.
- WI-5 — mode cần trạng thái năng lực có thể thật sự được thu hồi (registry sở hữu + gán nguồn cho unload).
- WI-6 — bảng tập tool, vì `ModeDefinition.initialToolSet` phụ thuộc vào các quy tắc tiếp nhận mà nó chốt lại.
- WI-10 — mode trả lời trên bề mặt ghi nào.

**Chặn (`blocks`):**

- M2-OQ3 close-out — câu trả lời cho đường may status-line do bước 0 của work item này sinh ra.
- M3 mục 5 / O2 — công việc M2 về status-line segment tiêu thụ đường may mà mục này đóng băng, và không được mở lại.
- §11.2 mục 12 chân wave 5 — dòng `pi.registerMode` của fixture là dòng duy nhất đóng được trong wave 5.

### Cách sai dễ nhất

**Hồi quy lặng lẽ chính chốt ghi của plan mode** — thứ duy nhất ở M2 có thể làm hỏng dữ liệu người dùng. coding-agent sửa một cái cây làm việc mà người dùng tin là chỉ-đọc và không có UI nào báo. Sự hỏng vô hình đúng vì chốt ghi ném `ToolError` mà người dùng không bao giờ thấy. Hai phòng ngừa bắt buộc, theo đúng thứ tự này: (1) hạ việc rút writePolicy như một commit RIÊNG trước khi migrate bất kỳ mode nào, giữ nguyên và xanh toàn bộ `test/tools/plan-mode-guard-local.test.ts` như bằng chứng, để trong cây chỉ còn đúng một implementation đang thực thi; (2) giữ các field trạng thái mode là cặp accessor registry-backed trong TOÀN BỘ quá trình migrate — tên và kiểu không đổi, cộng thêm một field thứ bảy mà plan đã bỏ sót — để luôn có đường rollback từng phần. Rủi ro cao thứ hai là ship một mode registry không có câu trả lời nào cho status-line: một mode không có chỉ báo bị người dùng đọc là lỗi, vì một segment `mode` đã tồn tại ở segments.ts:364 và người dùng sẽ mong mode mới hiện ở đó. Đó chính là lý do bước 0 tồn tại.

### Cần người quyết

- **M2-OQ3 — LÀM THẾ NÀO để một mode do extension đăng ký đi tới status line?** Điều này CHẶN bước 6 và không thể do người triển khai tự quyết. Plan đã phân tích ba phương án ở §7.4 và cố ý KHÔNG chọn. Bốn ràng buộc mà bất kỳ câu trả lời nào phải thoả, tất cả đã đối chiếu với HEAD: union 27 phần tử ở schema.ts:2-30 vẫn đóng; một mode đã đăng ký render bên trong segment `mode` sẵn có ở segments.ts:364, không phải thành id mới; chuỗi ưu tiên plan→prewalk→goal→vibe→loop (segments.ts:369-407) được giữ nguyên với thứ tự do registry cung cấp; `ModeDefinition.statusLine` là bắt buộc. Plan nghiêng về phương án 3 ("mode segment reads id from ModeRegistry") là phương án duy nhất thoả cả bốn, nhưng §7.4 nói phương án 3 KHÔNG phủ trường hợp một mode muốn có segment nằm ngoài `mode` — nếu sau này cần điều đó thì cả ba phương án phải mở lại. Chủ sở hữu quyết định: người giữ WI-10 / buổi review thiết kế M2. Cần trước bước 6, không cần trước bước 0.
- **writePolicy có điều khiển TEXT thông báo cho người dùng, hay chỉ các cờ?** Đặc tả này đặt text thông báo ở core (một `WritePolicy` chỉ là cờ allow/deny; chốt ghi giữ các chuỗi `ToolError`) để một extension không thể tiêm văn xuôi tuỳ ý vào một tool error. Phương án thay thế để mỗi mode tự viết câu từ chối của riêng nó, thân thiện hơn và cũng là điều một ví dụ đã phát hành sẽ muốn. Mặc định mang hương vị bảo mật, phương án thay thế mang hương vị sản phẩm — người ta chọn.
- **`ModeContext` có mở ra bất kỳ tiện ích UI nào không?** Đặc tả này giữ nó hẹp (session, settings, setActiveTools, notify) và không tra tay cầm TUI nào, vì khu vực tự vẽ của một mode đã đăng ký đúng là thứ WI-13 định nghĩa và nó đổ vào wave 6. Nếu ở wave 5 một mode được kỳ vọng render nhiều hơn một chip trên status-line, thì context cần một seam ngay bây giờ chứ không phải vào wave 6.
- **Chân thứ hai của fixture thật sự có cần là một commit riêng không?** Lý lẽ của plan là chặn đáng kỹ (tsconfig có `include "test"`, nên một dòng `registerSetting` sẽ làm check:ts đỏ và dấu `&&` không bao giờ tới được các test) và đặc tả này đi theo. Hãy xác nhận với người giữ WI-8b rằng cổng wave 5 và cổng đóng M2 vẫn là hai lệnh riêng chứ không phải một lệnh duy nhất dễ chịu.
- **Năm mode tích hợp sẵn có nên được đăng ký với các giá trị `order` hiện có lấy từ WI-2, hay WI-2 tạo ra một artifact riêng mà mục này phải đọc?** Bước 7 phụ thuộc output của WI-2 là một thứ tự cụ thể, ổn định. Nếu WI-2 chỉ hạ một thứ tự kiểu chẩn đoán mà không có danh sách chuẩn, thì bước 7 không có thứ tự nào để gán và ưu tiên trên status-line trở thành một nguồn sự thật thứ hai, cạnh tranh với nhau.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Sáu boolean là các field runtime của `InteractiveMode` ở `modes/interactive-mode.ts:981-988`. | stale | Chúng ở `modes/interactive-mode.ts:908-915`, không phải 981-988 — lệch khoảng 73 dòng. Nửa còn lại của cùng claim đó, `types.ts:189-194`, là ĐÚNG. Bằng chứng: `grep -n 'planModeEnabled\|vibeModeEnabled\|goalModeEnabled\|goalModePaused\|loopModeEnabled\|loopModePaused' packages/coding-agent/src/modes/types.ts` → 189,190,191,192,193,194 (chính xác). `sed -n '900,920p' packages/coding-agent/src/modes/interactive-mode.ts` → dòng 908 `planModeEnabled = false;` tới dòng 915 `loopModePaused = false;`. Dòng 975-1000 mà plan trỏ tới chứa `pendingPythonComponents` / `isPythonMode` và cache working-message. |
| Bốn accessor mode của `AgentSession` ở `agent-session.ts:6097`, `:6102`, `:6120`, `:6128`; `codeModeNamespacesInfo` ở `:5822`; `#codeModeState` khai báo ở `:1387`. | stale | Cả sáu neo đều lệch. getPlanModeState ở :6132, getPrewalkState :6137, getGoalModeState :6155, getVibeModeState :6163, codeModeNamespacesInfo :5852, #codeModeState :1395. Các neo accessor lệch đều khoảng 30-35 dòng; hai cái kia lệch khoảng 30 và khoảng 8. Bằng chứng: `grep -n 'getPlanModeState\|getPrewalkState\|getGoalModeState\|getVibeModeState\|codeModeNamespacesInfo\|#codeModeState' packages/coding-agent/src/session/agent-session.ts` → 1366, 1395, 1404, 1474, 1783, 5852, 5853, 6132, 6137, 6155, 6163. Hai con số đếm seam-grep của chính plan vẫn đúng tuyệt đối, nên độ trôi chỉ giới hạn ở số dòng, không phải cấu trúc. |
| Sáu boolean trở thành "derived getter" trên registry, giữ nguyên tên và kiểu. | incomplete-and-blocking | Getter trần sẽ không compile. Có 32 chỗ gán `this.<mode>.x = ` trong src/, TẤT CẢ ở interactive-mode.ts (planModeEnabled x4, planModePaused x5, vibeModeEnabled x3, goalModeEnabled x7, goalModePaused x7, loopModeEnabled x2, loopModePaused x4). Mỗi field cần một cặp getter VÀ setter, setter định tuyến lệnh ghi vào registry. Cách diễn đạt của plan đánh giá thấp khối lượng việc và, nếu làm theo đúng chữ, sinh ra một commit không build được. Bằng chứng: `git grep -nE '\.(planModeEnabled|vibeModeEnabled|goalModeEnabled|goalModePaused|loopModeEnabled|loopModePaused|planModePaused) = ' -- packages/coding-agent/src` → 32 dòng, và `git grep -l` trên cùng pattern → đúng một file, `interactive-mode.ts`. Số chỗ gán theo từng field từ `grep -cE '^\s*this\.<name> = ' interactive-mode.ts`. |
| Sáu boolean là toàn bộ bề mặt trạng thái mode cần giữ dạng derived getter. | wrong-count | Có BẢY bit trạng thái mode. `planModePaused = false` khai báo ở interactive-mode.ts:909 và được đọc ở 16 chỗ — nhưng nó KHÔNG được khai báo trên `InteractiveModeContext` (grep planModePaused trong modes/types.ts không trả về gì), nên một plan liệt kê interface đã bỏ sót nó. Nó là chốt chặn thật: interactive-mode.ts:3750-3753 đổ thẳng nó vào status line dưới tên `paused`, và segments.ts:369-373 render chip cảnh báo `Plan ⏸` từ nó. Chuyển sáu mà để field thứ bảy là field thô thì trạng thái pause trên status-line ngừng cập nhật âm thầm ngay khoảnh khắc sáu cái kia chuyển sang registry. Bằng chứng: `grep -n 'this.planModePaused' packages/coding-agent/src/modes/interactive-mode.ts` → 16 chỗ (2318, 3750, 3753, 4018, 4031, 4158, 4181, 4377, 4398, 4406, 5069, 5075, 5130, 5253, 5361, 5406). `sed -n '3748,3757p'` cho thấy #updatePlanModeStatus truyền `{ enabled, paused }` vào `this.statusLine.setPlanModeStatus(status)`. `sed -n '369,373p' packages/tui/src/status-line/segments.ts` cho thấy nhánh paused tạo ra chip tông cảnh báo. |
| `test/plan-mode/write-policy.test.ts` là file mới và phải bảo vệ bất đẳng thức sandbox `local://` mà hiện chưa gì phủ. | partly-stale | Bất đẳng thức ĐÃ được phủ cho plan mode tích hợp sẵn, tại `packages/coding-agent/test/tools/plan-mode-guard-local.test.ts:90-127`: nó khẳng định create và update trên `local://` đều qua, `src/foo.ts` và `PLAN.md` bị từ chối với /working tree is read-only/, delete bị từ chối với /deleting files is not allowed/, và move bị từ chối với /renaming files is not allowed/. AGENTS.md cấm lặp lại phần phủ ở một tầng thứ hai. File mới phải bảo vệ một hợp đồng KHÁC — chính sách được đánh giá như DỮ LIỆU qua một mục registry, dẫn bởi một mode do extension đăng ký — nếu không nó là một bản trùng mà quy tắc cấm. Bằng chứng: `sed -n '90,127p' packages/coding-agent/test/tools/plan-mode-guard-local.test.ts` cho thấy cả năm khẳng định trên. File cỡ 11 KB và nối đầy đủ vào `enforcePlanModeWrite`. |
| Thứ chặn status-line là union `StatusLineSegmentId` 27 phần tử đóng ở `schema.ts:2-30` không có seam cho người đóng góp. | right-but-incomplete | Union đúng như mô tả (đã xác minh 27 phần tử). Nhưng nửa khó hơn nằm thấp hơn một tầng: `SegmentContext` (types.ts:75) mang NĂM field mode hardcode riêng biệt — planMode :96, prewalk :100, loopMode :103, goalMode :109, vibeMode :113 — và `modeSegment` giải chúng qua một if-chain 5 nhánh viết tay ở thứ tự ưu tiên cố định (segments.ts:369-407). Một mode từ extension cũng không có field nào ở đó, và if-chain lặng lẽ trả `{ visible: false }` cho bất cứ thứ gì nó không nhận ra. Một thiết kế mở union id nhưng để năm field hardcode vẫn ship ra một mode vô hình, nên bất kỳ câu trả lời nào cho M2-OQ3 đều phải xử lý cả hai nửa. Bằng chứng: `sed -n '96,116p' packages/tui/src/status-line/types.ts` cho thấy năm field. `sed -n '364,410p' packages/tui/src/status-line/segments.ts` cho thấy chuỗi ấy (nhánh plan :369, prewalk :379, goal :385, vibe :390, loop :396-407) và `return { content: "", visible: false };` ở :409. Ngoài lề: `segments.ts:919-947` của plan là record SEGMENTS và CẢ HAI ĐẦU ĐỀU ĐÚNG — :919 mở ra, :947 là `};` đóng; không cần sửa. `id: "mode"` ở :365 (const mở ra ở :364) cũng đúng. |
| `enforcePlanModeWrite` được "gọi từ tầng tool". | vague-but-not-wrong | Có đúng 4 call site và chúng không đồng nhất: `tools/write.ts:778` (op update), `:814` (đường archive, op update), `:842` (đường sqlite, op update), `:859` (op create). Site archive và sqlite truyền một op working-tree trên path không phải file nguồn thuần, nên mỗi cái cần suy luận riêng về quy tắc `workingTree: allow|deny` mới. Liệt kê chúng không tốn chi phí gì và ngăn ba trong bốn cái bị giả định là tương đương. Bằng chứng: `git grep -n enforcePlanModeWrite -- packages/` → 4 site trong write.ts, cộng phần định nghĩa ở plan-mode-guard.ts:127 và file test hiện có. |

## Cần người xác nhận

- **Mâu thuẫn thời điểm bên trong chính đặc tả về M2-OQ3.** Bước 0 ghi "DO THIS BEFORE ANY CODE" và "Everything in steps 3+ is gated on this" — tức quyết định phải có trước bước 3. Nhưng câu hỏi mở đầu tiên lại ghi rõ "Needed before step 6, not before step 0", và bước 6 cũng nói "Implement the M2-OQ3 seam per the step-0 decision". Hai chỗ này không thể cùng đúng. Không tự chọn một trong hai: hãy chốt rõ quyết định M2-OQ3 có chặn bước 3 hay chỉ chặn bước 6, vì bước 3 (lõi registry) có thể làm được mà không cần seam status-line.
- ~~**Cổng hoàn thành tự mâu thuẫn với chính lệnh xác minh khi nói "sáu boolean".**~~ **ĐÃ CHỐT trong lượt kiểm chứng này, không còn cần người quyết.** Điều kiện (2) của cổng và bước 4 giờ nói rõ: `InteractiveModeContext` là một `interface` (`modes/types.ts:108`) nên 189-194 giữ nguyên tên và kiểu `boolean`; cặp accessor thay cho bảy initializer thô trên `InteractiveMode` của class, và cổng grep đo bằng `grep -c` (initializer 7→0, accessor 0→14) chứ không bằng cách đếm tên trong `types.ts`. Còn lại: vì sao bước 4 cần bảy accessor chứ không phải sáu — xem hàng `wrong-count` của bảng Đính chính, đã có câu trả lời.
- **Ranh giới kiểm chứng của fixture `outsider-extension`.** Đặc tả vừa ghi file này "không thể typecheck cho tới khi cả hai tồn tại" (`pi.registerMode` và `pi.registerSetting` đều vắng ở HEAD), vừa yêu cầu fixture KHÔNG có dòng `registerSetting`. Vậy nghĩa là cổng check:ts của wave 5 có thể xanh trong khi `packages/coding-agent/tsconfig.json` vẫn `include "test"`. Cần xác nhận đây là trạng thái được chấp nhận có chủ đích cho tới khi WI-8b đóng M2, chứ không phải một lỗ sót sẽ bị phát hiện muộn.


---


## WI-8a. Định tuyến cài đặt plugin qua Settings dưới dạng overlay có namespace (Phương án A)

**Thay đổi gì:** Cài đặt plugin ngừng nằm trong hai file JSON vệt phụ và bắt đầu nằm bên trong các lớp Settings đã có sẵn dưới một namespace dành riêng `plugins.<id>.<key>`, để một cài đặt của plugin nhận đúng phân tầng sáu lớp (runtime → overlay → project → global → parent → default, cộng env) mà cài đặt lõi đã có, và `provenance()` có thể chỉ ra lớp nào thắng.
**Wave:** 7 trong 8 (M2) — cùng với WI-8b và WI-9; không phụ thuộc gì, cố ý giữ lại ở đây theo §5.1 C.
**Effort:** M (~2–3 ngày). Plan gọi là M với rủi ro THẤP; tài liệu này nâng rủi ro lên TRUNG BÌNH và giữ nguyên M, vì plan đếm thiếu bề mặt: nó nêu sáu file và bỏ sót `loader.ts:474`, còn phân tích rủi ro của nó hoàn toàn dựa vào việc test provenance sẽ bắt được lỗi — trong khi dạng lỗi khả dĩ hơn là trường hợp hồi sinh giá trị đã xoá và ngữ nghĩa delete mà không test nào chạm tới. Phần gõ kiểu (bộ chuyển schema→definition, bất đối xứng `envFallback`, registry chỉ-thêm) tinh vi hơn nhiều so với cách plan diễn đạt "substrate, not API".

**Người dùng thấy:** Cài đặt plugin trở nên chỉnh sửa được trong bảng cài đặt thông thường, kèm một lớp nguồn nhìn thấy được, và có thể bị ghi đè bởi một biến môi trường mà plugin tự khai báo. Không có gì thay đổi với người dùng không bao giờ chạm tới cài đặt plugin: các giá trị hiện có được di chuyển thầm lặng, tại chỗ, không hỏi và không phải xác thực lại.

> Lưu ý về phạm vi: đây là phần CORE-side. Nó KHÔNG được thêm gì vào `ExtensionAPI` (việc đó là WI-8b, thêm method thứ 30 lên 29 method hiện có) và KHÔNG được đổi danh sách tab cố định của bảng cài đặt hay mảng `DOMAINS` — `extensibilitySettings` đã nằm trong `DOMAINS` tại `config/all-settings.ts:64`, nên thêm helper namespace ở đây là miễn phí và không đụng tới blocker 1 của 8b. Tab Plugins của TUI và interface `PluginSettingsHost` tại `packages/tui/src/overlays/plugin-settings.ts:85` giữ nguyên từng byte.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/settings.ts` | sửa | Thêm các nguyên thủy namespace: `pluginSettingId(pluginId, key)`, `sanitizePluginSegment(raw)`, và một `registerPluginSetting(definition)` idempotent tra id trước khi gọi `register()`. Đây là nơi schema `manifest.settings` của một plugin trở thành handle có kiểu.<br>Neo: `packages/coding-agent/src/extensibility/settings.ts:5` (dòng `import { combine, register, ... } from "../config/registry"`) và `:10` (dòng `register({ id: "extensions", ... })` đầu tiên).<br>Ghi chú: module miền này ĐÃ nằm trong mảng `DOMAINS` tại `config/all-settings.ts:64` (import ở `:27`), nên bất cứ thứ gì đăng ký ở đây là sống ngay khi `config/settings.ts:53` chạy side-effect `import "./all-settings"`. Không cần sửa `all-settings.ts` — điều đó cũng nghĩa là file này KHÔNG đụng tới blocker 1 của WI-8b, nên 8b vẫn không bị chặn. | Có |
| `packages/coding-agent/src/extensibility/plugins/manager.ts` | sửa | Viết lại `getPluginSettings` (929), `setPluginSetting` (942) và `deletePluginSetting` (954) để đọc/ghi qua các handle `plugins.*` đã đăng ký trên thể hiện Settings MÀ BƯỚC 0 CHỌN — hôm nay `PluginManager` chỉ giữ `#cwd` và `#runtimeConfig`, không giữ thể hiện `Settings` nào, nên quyết định đó phải viết ra trước khi viết dòng đầu tiên — và thêm một migration idempotent chạy một lần gộp CẢ HAI file legacy vào dạng mới.<br>Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:929, 942, 954` (ba method public); migration đọc `manager.ts:148` (`#saveRuntimeConfig`) và `manager.ts:153` (`#loadProjectOverrides`).<br>Ghi chú: `#saveRuntimeConfig` (148-151) và `#loadProjectOverrides` (153-162) trở thành reader CHỈ DÙNG cho migration legacy. Plan KHÔNG nhắc rằng chúng phải được giữ lại cho migration, dù chúng chính là store đang bị thay thế — xoá chúng là cách bug mất dữ liệu mà plan cảnh báo thực sự xảy ra. | Có |
| `packages/coding-agent/src/extensibility/plugins/loader.ts` | sửa | Làm cho `getPluginSettings(pluginName, cwd)` ở cấp module (474) ủy nhiệm sang substrate mới thay vì tự cài lại phép trộn với hai file legacy.<br>Neo: `packages/coding-agent/src/extensibility/plugins/loader.ts:474`.<br>Ghi chú: PLAN KHÔNG BAO GIỜ NHẮC HÀM NÀY. Nó là một bản sao từng byte của phép trộn `{ ...global, ...project }`, được re-export qua barrel `extensibility/plugins`, và là đường đọc mà một extension gọi theo tên. Chỉ migrate `manager.ts` thì bề mặt hướng về extension vẫn đọc file legacy mãi mãi — một bản sao đúng lỗi "hai đường đọc, bạn migrate một" mà plan nêu là rủi ro chính. Đã kiểm chứng là không có caller nào trong repo, và đó chính là lý do nó sẽ bị bỏ sót: bên tiêu thụ là code bên thứ ba. | Có |
| `packages/coding-agent/test/config/plugin-settings-provenance.test.ts` | tạo | Test mới bảo vệ hợp đồng phân tầng: một cài đặt plugin có namespace và khai báo `env` bị biến môi trường ghi đè ở phạm vi project, và `provenance(scope)` GỌI TÊN lớp thắng.<br>Neo: file mới; thư mục `test/config/` đã tồn tại với 7 file anh em (settings-registry.test.ts, settings-reload.test.ts, …).<br>Ghi chú: mẫu thiết lập sao chép từ `test/config/settings-registry.test.ts:1-46` sẵn có — `Settings.isolated(...)` cho các dòng phân tầng registry và một helper `withEnv` cho env. Phía `PluginManager` dùng mẫu `spyOn(piUtils, ...)` đã chứng minh ở `test/plugin-config.test.ts:25-33`. Không có `mock.module()` ở bất cứ đâu. | Có |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Changed`: cài đặt plugin giờ được lưu trong file cài đặt chính và có thể được đặt bằng một biến môi trường mà plugin khai báo.<br>Neo: `packages/coding-agent/CHANGELOG.md:3`. | Có — `packages/coding-agent/CHANGELOG.md:3`<br>Đã kiểm chứng: `## [Unreleased]` nằm ở `packages/coding-agent/CHANGELOG.md:3` và hiện KHÔNG có mục con nào, nên `### Changed` phải được TẠO MỚI ngay dưới nó (mục kế tiếp là `## [18.3.3]` ở :5). |

### Các bước

**0. Quyết định thể hiện Settings nào là nhà của cài đặt plugin — và viết ra quyết định đó trước khi viết dòng đầu tiên.** Hôm nay `PluginManager` (`manager.ts:115-121`) chỉ giữ `#cwd` và `#runtimeConfig`, và `createPluginSettingsHost(cwd)` (`settings-host.ts:14`) dựng nó bằng `new PluginManager(cwd)` (`settings-host.ts:16`) — không có instance `Settings` nào trên toàn bộ đường plugin. Vì ba method phải GIỮ NGUYÊN chữ ký, manager buộc phải có một Settings. Ba lựa chọn, phải chọn một và viết ra: (a) nhận `Settings` qua constructor và để `createPluginSettingsHost` (`settings-host.ts:14`) lấy nó từ host — đúng nhất, nhưng đổi chữ ký constructor và phải chỉ ra host có Settings ở đâu (`selector-controller.ts:266` hiện chỉ truyền `getProjectDir()`); (b) manager tự `await Settings.load()` — tạo một instance thứ hai bên cạnh instance bảng cài đặt đang giữ, tức tái tạo đúng vấn đề hai store mà mục này sinh ra để gỡ; (c) `Settings.isolated()` (`config/settings.ts:694`) — không đọc được lớp global nên `handle.set` không bền vững, loại trừ. Lựa chọn nào cũng phải nói rõ `loader.ts:474` lấy Settings ở đâu, vì hàm cấp module đó không có manager lẫn session.

1. **Viết các nguyên thủy namespace vào `extensibility/settings.ts`:** `sanitizePluginSegment`, `PLUGIN_SETTINGS_ROOT`, `pluginSettingId`, `registerPluginSetting`. Tính idempotent ở bước 1 KHÔNG phải đánh bóng cho sạch — nó là khác biệt giữa mục này và một quả mìn dành cho WI-7 và WI-9. Trước khi viết, hãy tự xác nhận registry là append-only: grep `byId` và `ordered` trong `config/registry.ts` và quan sát rằng `byId.set` (:789) và `ordered.push` (:790) là các đột biến duy nhất, còn `resetRegistryForTest` (:953) chỉ chạm mảng `effects`, không bao giờ chạm `byId`/`ordered`. Thêm import `lookup` từ `../config/registry` cạnh import `combine`/`register` hiện có.
   Neo: `packages/coding-agent/src/extensibility/settings.ts:5`

2. **Xây bộ chuyển schema→definition.** Mỗi plugin khai báo cài đặt của nó trong manifest dưới dạng `PluginSettingSchema` (`extensibility/plugins/types.ts:48` — `settings?: Record<string, PluginSettingSchema>`), đây là một hình dạng lỏng hơn `SettingDefinition`. Ánh xạ (đọc `PluginSettingSchema` tại `extensibility/plugins/types.ts:57-93`, đừng đoán): `type` giữ nguyên vì `PluginSettingType` (:55) là tập con của vốn từ của `SettingDefinition`; `default` mang sang nguyên vẹn; **`values` (enum, bắt buộc — `EnumDefinition.values` ở `config/registry.ts:143` không phải optional, bỏ nó là definition không typecheck) mang sang `values`**; `description` thành `ui.description`; `env` mang thẳng sang `SettingDefinition.env` — KHÔNG được bỏ, đây là trường duy nhất nối manifest với tầng env của bước 3, và nó đã tồn tại sẵn ở `types.ts:65`; `min`/`max`/`step` thành `validate` hoặc bị ghi nhận là chưa hỗ trợ, phải nói ra chứ không im lặng bỏ. `secret` thì KHÔNG map thẳng: `ui.secret` chỉ tồn tại trên `UiString` (`config/registry.ts:48`), nên setting boolean/enum/number phải dùng `credential: true` trên `DefinitionBase` (:95) thay thế — `isCredential()` ở `registry.ts:509` đọc cả hai. Không có trường `options` nào trong schema: các lựa chọn của enum nằm ở `values`, và `UiEnum.options` là trường tuỳ chọn riêng cho submenu. Đọc manifest qua accessor CÓ SẴN (`manager.ts:256`, cùng hai điểm đọc khác ở `:622` và `:845`) — không mở thêm đường thứ tư tới manifest.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:256`

3. **Quyết định và viết ra quy tắc đặt tên biến môi trường TRƯỚC khi viết test, trong cùng một commit:** `OMP_<PLUGIN_ID>_<KEY>`, chữ hoa, `-` và `.` gộp thành `_`, được viết ra một cách tường minh trong `SettingDefinition.env` bởi chính plugin. Không bao giờ có tên biến nào được tổng hợp từ id. Ghi nhận bất đối xứng làm cho thao tác này là opt-in và do đó test được: một plugin không khai báo `env` thì không tham gia lớp thứ sáu chút nào, vì `envValue()` thoát ra ở `config/registry.ts:515` khi không có `envName`. Một dòng test khẳng định `"env"` cho một key không khai báo `env` PHẢI đỏ — đó là hành vi đúng, không phải lỗi để giấu.
   Neo: `packages/coding-agent/src/config/registry.ts:514`

4. **Viết lại `setPluginSetting` TRƯỚC** — đây là đường ghi và nó phải xuống trước mọi thay đổi đường đọc. Định tuyến nó qua `handle.set(scope, value)`, thứ ghi vào lớp global tại `config/settings.ts:828` và xếp hàng lần lưu debounce. Xác nhận ghi vào vệt phụ cũ đã biến mất: `setPluginSetting` không được còn gọi `#saveRuntimeConfig`. KHÔNG xoá `#saveRuntimeConfig` hay `#loadProjectOverrides` ở bước này — bước 6 vẫn cần chúng.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:942`

5. **Viết lại `getPluginSettings` và `deletePluginSetting`** đi qua cùng bộ handle đã đăng ký. `deletePluginSetting` trở thành `handle.unset(scope)` → `unsetGlobalValue` (`config/settings.ts:845`), xoá chỉ ở lớp GLOBAL và để một giá trị ở lớp project hiện lại đúng như cũ. Cần cờ: hành vi cũ xoá thẳng key. Hãy nêu lên (xem phần Cần người quyết) thay vì lặng lẽ ship thay đổi này.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:929` và `:954`

6. **Thêm migration một-lần, và làm cho hình dạng của nó đúng** — đây chính là toàn bộ rủi ro mất dữ liệu của mục này. Nó PHẢI đọc CẢ HAI hình dạng legacy, vì `setPluginSetting` chưa bao giờ lần nào ghi vào file thứ hai: (a) `settings[name]` trong runtime config do `#saveRuntimeConfig` ghi → `~/.omp/omp-plugins.lock.json` (đường dẫn từ `getPluginsLockfile`, `utils/src/dirs.ts:652`), và (b) `settings?.[name]` trong `<project>/.omp/plugin-overrides.json` (`ProjectPluginOverrides`, `extensibility/plugins/types.ts:156`; đường dẫn từ `getProjectPluginOverridesPath`, `utils/src/dirs.ts:1046`), đọc qua `#loadProjectOverrides` (`manager.ts:153`). Trộn với project thắng — đó là thứ tự `{ ...global, ...project }` hiện tại — rồi ghi vào các handle `plugins.*` qua `set()`. Bao nó bằng một marker hoàn thành đã được persist.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:148, 153`

7. **Marker hoàn thành không phải sổ sách, nó là một yêu cầu đúng đắn.** Không có nó, migration chạy lại mỗi lần khởi động và HỒI SINH một key mà người dùng đã cố ý xoá sau lần migrate đầu tiên — một giá trị đã bị xoá trong store mới vẫn còn nằm trong file legacy, nên một lần chạy lại sẽ âm thầm mang nó trở lại. Marker chỉ được ghi SAU khi dạng mới đã persist bền vững, và nó phải được namespaced cho migration này để một thay đổi substrate tương lai có thể migrate lại một cách có chủ đích. Xác minh đường ghi của chính marker là lớp Settings hoặc một file marker riêng — TUYỆT ĐỐI không phải một store plugin thứ ba, nếu không mục này đã tái tạo đúng vấn đề mà nó được viết ra để gỡ bỏ.
   Neo: `packages/coding-agent/src/extensibility/plugins/manager.ts:148`

8. **Làm cho `getPluginSettings(pluginName, cwd)` cấp module trong `loader.ts` (474) ủy nhiệm sang substrate mới.** Hàm này là một bản sao từng byte của logic trộn, nó được re-export qua barrel `extensibility/plugins`, và nó là hàm một extension gọi theo tên. Để nó lại trên các file legacy nghĩa là bề mặt hướng về extension không bao giờ migrate. Plan không nhắc gì tới file này — đây là cách khả dĩ nhất để ship mục này một nửa, vì `git grep` không thấy caller nào trong repo và trông như code chết.
   Neo: `packages/coding-agent/src/extensibility/plugins/loader.ts:474`

9. **Để yên tab Plugins và overlay TUI.** `settings-selector.ts:438` (KHÔNG phải :435 — xem phần Đính chính) hard-code `{ id: "plugins", label: ... }` trong `getSettingsTabs()` (:431-440), và đường đọc `tui/src/overlays/plugin-settings.ts:147` đi qua interface `PluginSettingsManager` (khai báo ở `:68`, thân :68-76) — KHÔNG phải `PluginSettingsHost`, là interface khác, khai báo ở `:85` và giữ `manager: PluginSettingsManager` ở `:86`. Cả hai interface giữ nguyên từng byte. Việc gộp cài đặt plugin vào bảng cài đặt chính là blocker 4 của WI-8b, nằm ngoài phạm vi rõ ràng ở đây. Xác nhận bằng cách đọc rằng thân `PluginSettingsManager` không đổi — nếu interface host phải đổi, mục này đã rò sang 8b.
   Neo: `packages/tui/src/overlays/plugin-settings.ts:68` (PluginSettingsManager) và `:85` (PluginSettingsHost), `packages/tui/src/overlays/settings-selector.ts:438`

10. **Viết `test/config/plugin-settings-provenance.test.ts`** — ba nhóm, theo đúng thứ tự dưới đây, vì thứ tự đó mã hoá chính hợp đồng chống mất dữ liệu. Dòng 1 và dòng 2 là các dòng migration; dòng 3 là dòng phân tầng. Xem phần Hợp đồng test để biết khẳng định chính xác.
    Neo: `packages/coding-agent/test/config/plugin-settings-provenance.test.ts` (file mới)

11. **Cập nhật hai test cũ theo hợp đồng mới.** `plugin-config.test.ts:47-56` hôm nay khẳng định `setPluginSetting` ghi `settings[<plugin>][<key>]` vào `omp-plugins.lock.json`; sau bước 4 điều đó không còn đúng, và test sẽ đỏ. Viết lại nó thành: sau `setPluginSetting`, giá trị đọc lại qua `getPluginSettings` khớp VÀ `provenance(scope)` báo `"global"`, và lockfile KHÔNG bị ghi thêm khoá `settings`. Tương tự, `plugin-config.test.ts:114-119` gọi `setPluginSetting` rồi đọc lại qua `getPluginSettings` — viết lại theo đường đọc handle mới. Đây là dòng đỏ-và-chuyển-xanh thật, không phải xanh giả.
    Neo: `packages/coding-agent/test/plugin-config.test.ts:47-56` và `:114-119`

12. **Chạy cổng.** `bun test` bị CHẶN trong môi trường này cho tới khi native addon được build — harness đã báo và đã tái hiện: `0 pass, 1 fail` với `Cannot find module .../pi_natives.darwin-arm64.node`. Build trước bằng `bun --cwd=packages/natives run build`, rồi mới chạy test. `bun run check:ts` không cần addon và đã được xác nhận XANH trên HEAD ngay lúc này, nên nó là một cổng dùng được ngay hôm nay.
    Neo: `package.json` gốc:94 (`check:ts`)

13. **Thêm dòng changelog.** Tạo mới mục `### Changed` ngay dưới `## [Unreleased]` (`packages/coding-agent/CHANGELOG.md:3`, mục này hiện chưa có mục con nào) rồi thêm một dòng hướng về người dùng, không kể chuyện nguyên nhân: mở đầu bằng điều người dùng giờ làm được (cài đặt plugin nằm trong file cài đặt chính và tôn trọng một biến môi trường đã khai báo).
    Neo: `packages/coding-agent/CHANGELOG.md:3`

### Hình dạng code

```typescript
// ── packages/coding-agent/src/extensibility/settings.ts ──────────────────────
// Naming is the load-bearing part: `register()` THROWS on a duplicate id and the
// registry has NO unregister, so a colliding id breaks plugin load, not degrade.

/** `my-plugin` + `autoContext.enabled` → `my_plugin` + `auto_context_enabled`. */
export function sanitizePluginSegment(raw: string): string {
	return raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Reserved namespace root. Nothing outside this module may register under `plugins.`. */
export const PLUGIN_SETTINGS_ROOT = "plugins";

export function pluginSettingId(pluginId: string, key: string): string {
	return `${PLUGIN_SETTINGS_ROOT}.${sanitizePluginSegment(pluginId)}.${sanitizePluginSegment(key)}`;
}

/**
 * Register a plugin-owned setting, or return the handle a previous registration made.
 *
 * The registry is append-only (`byId.set` at config/registry.ts:789 is its only
 * mutation, `ordered.push` at :790 likewise) — there is no unregister and no registry
 * reset. A plugin loaded twice in one process — a reload, a suspend/resume, two
 * PluginManager instances in a test file — must get the SAME handle, not a throw.
 */
export function registerPluginSetting<const D extends SettingDefinition>(
	pluginId: string,
	definition: Omit<D, "id">,
): Setting<DefinitionValue<D>> {
	const id = pluginSettingId(pluginId, definition.id as unknown as string);
	const existing = lookup(id);
	if (existing) return existing as unknown as Setting<DefinitionValue<D>>;
	return register({ ...definition, id } as D);
}

// ── the env naming rule, decided in the same commit as the first test ───────────
// Convention (documented, NOT auto-generated): OMP_<PLUGIN_ID>_<KEY>, uppercase,
// `-`/`.` → `_`. The plugin states the literal name in `definition.env`; no variable
// name is ever synthesised from an id. A plugin that declares no `env` opts OUT of the
// sixth layer: `envValue()` returns undefined at config/registry.ts:515 when the
// definition declares none, so `provenance()` correctly reports the settings layer.

export const cfgGraphifyAutoContext = registerPluginSetting("@gaodes/pi-graphify", {
	id: "autoContext.enabled",
	type: "boolean",
	default: false,
	env: "OMP_GRAPHIFY_AUTO_CONTEXT_ENABLED",
	ui: { tab: "tools", group: "Graphify", label: "Auto Context", description: "…" },
});

// ── packages/coding-agent/src/extensibility/plugins/manager.ts ──────────────────
// ORDER IS MANDATORY: write the new shape → read BOTH legacy shapes → drop the old reads.

async getPluginSettings(name: string): Promise<Record<string, unknown>> {
	const settings = this.#settingsScope();
	const out: Record<string, unknown> = {};
	for (const [key, schema] of Object.entries(this.#schemaFor(name))) {
		const handle = registerPluginSetting(name, toDefinition(key, schema));
		out[key] = handle.get(settings);
	}
	return out;
}

async setPluginSetting(name: string, key: string, value: unknown): Promise<void> {
	const handle = registerPluginSetting(name, toDefinition(key, this.#schemaFor(name)[key]));
	handle.set(this.#settingsScope(), value); // global layer; persisted to config.yml
}

async deletePluginSetting(name: string, key: string): Promise<void> {
	// SEMANTIC CHANGE — see open_questions. `unset` clears the GLOBAL layer only, so a
	// project-layer value correctly resurfaces. Today the key is gone from both files.
	registerPluginSetting(name, toDefinition(key, this.#schemaFor(name)[key])).unset(this.#settingsScope());
}
```

### Hợp đồng test

Một cài đặt plugin có namespace tham gia vào ĐÚNG phân tầng sáu lớp như một cài đặt lõi: một giá trị ở lớp project bị biến môi trường mà plugin khai báo ghi đè, và `Setting.provenance(scope)` GỌI TÊN lớp đã thắng.

**Nếu hồi quy, người tiêu dùng thấy:** Trên chính substrate mà mục này thay thế, lớp env bị bỏ qua trong im lặng với các key của plugin và không có gì để báo nguồn nào thắng, vì store vệt phụ không có lớp nào để gọi tên. Người dùng đặt `OMP_GRAPHIFY_AUTO_CONTEXT_ENABLED=1`, plugin vẫn đọc `false` từ file project, và cả plugin lẫn UI đều không nói được vì sao. Điều này vô hình cho tới khi một người dùng thực sự có một cài đặt plugin được cấu hình — và đó chính là lý do nó sống sót qua năm vòng review.

**Phải khẳng định qua:** `Setting.provenance(scope)` tại `config/registry.ts:764-765`, TUYỆT ĐỐI KHÔNG dùng `Settings.getProvenance` (`config/settings.ts:800-808`). Cái sau kiểm tra runtime → overlay → project → global → parent → default và không bao giờ có thể trả về `"env"`, dù `"env"` nằm trong union `SettingProvenance` tại `settings.ts:62`. Khẳng định qua sai bề mặt sẽ xanh trong khi hợp đồng đã hỏng.

**Phải khẳng định cả hai:** CẢ giá trị đã phân giải LẪN lớp được báo. Chỉ khẳng định giá trị sẽ xanh trên một store tình cờ đọc đúng file — và đó chính xác là kiểu xanh-nhầm mà plan cảnh báo.

**Đỏ trên HEAD ngay hôm nay:** Có. Trên HEAD, `getPluginSettings` trả về `{ ...global, ...project }` hoàn toàn không có bước env, và bề mặt `Setting.provenance(scope)` không tồn tại cho một key của plugin vì chưa handle `plugins.*` nào được đăng ký.

Ba dòng test, theo thứ tự này vì thứ tự mã hoá chính hợp đồng chống mất dữ liệu:

1. **File test:** `packages/coding-agent/test/config/plugin-settings-provenance.test.ts`
   **Tên dòng:** một giá trị chỉ tồn tại trong file project-overrides legacy vẫn đọc lại được sau migration.
   **Vì sao:** cảnh báo sắc nhất của chính plan: `setPluginSetting` CHƯA BAO GIỜ ghi vào `.omp/plugin-overrides.json`, nên với một người dùng đã tự đặt giá trị plugin ở phạm vi project bằng tay, file đó là nơi DUY NHẤT giá trị tồn tại. Bỏ đường đọc này đi thì mọi cài đặt như vậy âm thầm đọc thành giá trị mặc định — mất dữ liệu không có lỗi nào, chỉ lộ ra với những người đã có cài đặt plugin được cấu hình.
   **Khẳng định:** ghi `<project>/.omp/plugin-overrides.json` với `settings: { "<plugin>": { <key>: <value> } }`, chạy migration, và khẳng định giá trị được `getPluginSettings` trả về **VÀ** `provenance(scope)` của handle báo `"project"`.

2. **File test:** `packages/coding-agent/test/config/plugin-settings-provenance.test.ts`
   **Tên dòng:** một giá trị chỉ tồn tại trong runtime config legacy vẫn đọc lại được sau migration.
   **Khẳng định:** ghi `settings["<plugin>"]["<key>"]` vào `omp-plugins.lock.json` legacy, chạy migration, khẳng định giá trị được trả về **VÀ** `provenance(scope)` báo `"global"` (nó là một giá trị lớp global, nên nó rơi vào lớp global của dạng mới).

3. **File test:** `packages/coding-agent/test/config/plugin-settings-provenance.test.ts`
   **Tên dòng:** lớp env — một biến môi trường đã khai báo thắng giá trị lớp project và TỰ GỌI TÊN MÌNH.
   **Khẳng định:** khi lớp project đang giữ một giá trị cho key, đặt biến môi trường mà plugin khai báo trong `definition.env`, và khẳng định CẢ `handle.get(scope)` bằng giá trị suy ra từ env LẪN `handle.provenance(scope) === "env"`. Dùng `withEnv` riêng từng test, có lưu/khôi phục (chép helper tại `test/config/settings-registry.test.ts:25-43`); KHÔNG đột biến `process.env` ở phạm vi file — một ghi env làm nhiễu cả suite là một test hỏng theo AGENTS.md.

**Cái bẫy ở dòng 3:** `#effectiveEnv` (`config/registry.ts:526-535`) làm cho env NHƯỜNG cho một lớp đã cấu hình khi definition đặt `envFallback`. Mặc định là `false` (`registry.ts:480` — `typeof env === "object" ? (env.fallback ?? false) : false`), nên env thắng theo mặc định và dòng test xanh. Nhưng nếu setting trong fixture khai báo `envFallback: true`, biến env sẽ thua giá trị project và `provenance` báo `"project"` — dòng test sẽ đỏ, và ĐỎ VÌ HÀNH VI ĐÚNG. Fixture KHÔNG ĐƯỢC khai báo `envFallback`. Plan không bao giờ nhắc cờ này; nó là cách dễ nhất nhất để viết một test đỏ vì lý do sai rồi "sửa" nó bằng cách làm lỏng khẳng định.

**Cấm `mock.module()`:** TUYỆT ĐỐI không `mock.module()` — nó đột biến module registry toàn cục và rò ra giữa các file. Các dòng `PluginManager` dùng `spyOn(piUtils, "getPluginsDir")` / `getPluginsLockfile` / `getProjectDir` / `getProjectPluginOverridesPath` riêng từng test, với `mock.restore()` trong `afterEach`, đúng như `test/plugin-config.test.ts:25-38` đã làm. Các dòng registry dùng một thể hiện `Settings.isolated(...)` thật trên một thư mục tạm — không mock module nào cả.

**Cấm source-grep:** Test được phép khẳng định trên file config tạm mà nó đã ghi (đó là hành vi). Nó KHÔNG được phép đọc một file triển khai `.ts` và khẳng định về văn bản của file đó — AGENTS.md cấm, và việc đó không thay thế được cho bất kỳ dòng nào ở đây.

**Test sẵn có phải vẫn xanh:**
- `packages/coding-agent/test/plugin-config.test.ts` — hai test `:47-56` và `:114-119` khẳng định HÌNH DẠNG LOCKFILE LEGACY và buộc phải viết lại ở bước 11; chúng là tín hiệu sớm tốt nhất vì đỏ NGAY khi bước 4 đi vào đúng hướng. Phần còn lại của file không được phá.
- `packages/coding-agent/test/plugin-config-validate.test.ts` — spy `PluginManager.prototype.getPluginSettings` tại `:63` và `:116`, đúng hình dạng mà bản viết lại không được phá.
- `packages/coding-agent/test/config/settings-registry.test.ts` — tham chiếu cho mẫu phân tầng và `withEnv`; cũng là nơi một hồi quy ở đây sẽ lộ ra.

### Xác minh

```bash
bun run check:ts
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build
cd packages/coding-agent && bun test test/config/plugin-settings-provenance.test.ts
cd packages/coding-agent && bun test test/plugin-config.test.ts test/plugin-config-validate.test.ts test/config/settings-registry.test.ts
```

- `bun run check:ts` — PHẢI pass. Không cần native addon. ĐÃ XÁC NHẬN XANH trên HEAD (milestone-1, 808b365) lúc viết: oxlint + oxfmt sạch, cả 16 package check:types Done, không lỗi.
- `bun --cwd=packages/natives run build` — bắt buộc trước mọi `bun test`; ĐÃ XÁC NHẬN LÀ BẮT BUỘC. Đã tái hiện lỗi chặn: `bun test test/config/settings-registry.test.ts` trả về `0 pass / 1 fail` với `Cannot find module .../native/pi_natives.darwin-arm64.node`.
- Lệnh test thứ ba là test mới; chỉ chạy được sau khi addon đã build.
- Lệnh test thứ tư là các test sẵn có mà thay đổi này không được phá.
- TUYỆT ĐỐI KHÔNG `tsc` / `npx tsc` (AGENTS.md). Chỉ `bun check` và `bun test`.

### Cổng hoàn thành

DONE nghĩa là đủ cả bốn điều: (1) `bun run check:ts` xanh; (2) `bun test test/config/plugin-settings-provenance.test.ts` pass cả ba dòng — hai dòng migration và dòng env/provenance; (3) `bun test test/plugin-config.test.ts` CHỈ CÒN các test không chạm đường ghi cũ, và `bun test test/plugin-config-validate.test.ts test/config/settings-registry.test.ts` vẫn xanh nguyên vẹn; test `set initializes missing settings in legacy runtime config` (`plugin-config.test.ts:47-56`) và test `resolves marketplace settings without restoring duplicate list entries` (`:114-119`) PHẢI được viết lại theo hợp đồng mới trong chính commit đó, không phải xanh bằng cách giữ nguyên; (4) migration đã được chạy thử thủ công theo đúng thứ tự đã nêu trên một project tạm thật chứa một file `.omp/plugin-overrides.json` viết tay, và một giá trị đã xoá khỏi store mới vẫn còn mất sau lần chạy thứ hai (kiểm tra hồi sinh ở bước 7). Lưu ý rằng (2) KHÔNG thể đánh giá trong môi trường này cho tới khi native addon được build — hãy coi (1) là cổng duy nhất chạy được ngay, còn (2)–(4) là bị chặn, KHÔNG phải là đã pass.

Cổng này CÓ thực sự đỏ được không: **CÓ** cho kiểm tra kiểu và các dòng test. Dòng provenance là một ca đỏ-chuyển-xanh thật: trên HEAD không tồn tại handle `plugins.*` nào để gọi `provenance()`, nên nó không thể xanh trước khi công việc hoàn tất. Hai dòng migration cũng là đỏ-chuyển-xanh thật: trên HEAD substrate mới không tồn tại, và một migration chỉ đọc MỘT trong hai file legacy sẽ để lại dòng 1 hoặc dòng 2 đỏ. Cổng sẽ KHÔNG bắt được: một migration chạy được nhưng chạy lại mỗi lần khởi động và hồi sinh key đã xoá (chỉ bước kiểm tra thủ công ở (4) bắt được), một tên biến môi trường sai-nhưng-hợp-lý (dòng test dùng đúng tên fixture khai báo nên một lỗi trượt trong cách đặt tên là vô hình với suite — vì vậy quy tắc đặt tên ở bước 3 phải được viết ra và review, không được để cho test), và thay đổi ngữ nghĩa của `deletePluginSetting` (không dòng nào khẳng định nó). Ba đó là những lỗ hổng trung thực của cổng này.

### Phụ thuộc

- **depends_on:** không.
- **blocks:**
  - WI-8b (Phương án B, `pi.registerSetting`) — bị chặn tường minh bởi mục này. Lý do rất cụ thể: blocker 2 của 8b là một setting id là chuỗi trần không có cơ chế ép namespace, nên một extension có thể đụng id với một id lõi, và `register()` ném tại `config/registry.ts:787`, làm hỏng lúc load thay vì suy giảm. Helper namespace dựng ở bước 1 CHÍNH LÀ cơ chế ép đó.
  - WI-11 / WI-12 (wave 8 của M2, chỉ thiết kế) — cả hai đều suy luận về vấn đề store thứ hai mà mục này gỡ bỏ. Ghi chú của chính plan ở dòng 5994 gọi một thiết kế đóng góp MCP là "đúng vấn đề store thứ hai mà WI-8a Phương án A sinh ra để giải quyết".
  - WI-9 (unload) — gián tiếp. Chỉ sau khi mục này xuống, trạng thái cài đặt plugin mới do một hệ thống sở hữu với một substrate duy nhất mà unload thực sự dọn dẹp được.

### Cách sai dễ nhất

Đăng ký cài đặt plugin động tại thời điểm load vào một registry KHÔNG có unregister (`byId.set` tại `config/registry.ts:789` là đột biến duy nhất; `resetRegistryForTest` tại :953 chỉ chạm `effects`). Lần load đầu chạy; lần load THỨ HAI của cùng plugin trong cùng process — một reload, một suspend/resume, một `PluginManager` thứ hai trong một file test — ném `Setting "plugins.x.y" is registered twice`. Đó không phải crash ở một nhánh hiếm: suspend/resume chính là thứ WI-1 và WI-7 dựng, còn unload là thứ WI-9 dựng, nên mục này theo đúng đặc tả sẽ đặt một quả mìn ngay trên đường đi của hai mục kế sau nó. Lập luận của chính plan về namespacing là cái throw trùng id, và rồi nó lại đặc tả một thiết kế đi thẳng vào chính cái throw đó. Cách sửa là `registerPluginSetting` trả về handle đã có khi tra cứu lại trùng, và nó phải là bước 1, trước mọi thứ khác.

Cách sai dễ nhất thứ hai: chỉ migrate `manager.ts` và bỏ sót `loader.ts:474` — vì `git grep` không thấy caller trong repo và trông như code chết, trong khi người tiêu thụ thật của nó là code bên thứ ba.

### Cần người quyết

- **`deletePluginSetting` đổi nghĩa.** Hôm nay nó xoá thẳng key khỏi store đã trộn. `handle.unset()` chỉ xoá lớp GLOBAL (`unsetGlobalValue`, `config/settings.ts:845`), nên một giá trị ở lớp project sẽ hiện lại đúng như cũ — đó là phân tầng đúng, nhưng nó là thay đổi hành vi đối với `omp plugin config delete` (`cli/plugin-cli.ts:917`, subcommand `delete` ở :911). "unset" nghĩa là "quên override global của tôi" (phân tầng đúng, chấp nhận thay đổi) hay là "xoá ở mọi nơi" (cần thêm một đường ghi ở lớp project)? Cần một con người quyết; nó nhìn thấy được với người dùng.
- **Lớp Settings nào là nhà bền vững của một cài đặt plugin?** Plan nói "overlay" và không bao giờ nêu tên lớp. Global (`handle.set` → `config.yml`) là thứ đường lõi có kiểu đang làm và là lớp duy nhất persist được mà không cần máy mới, nhưng nó đặt các key máy ghi của bên thứ ba vào một file người dùng tự tay chỉnh. Chính plan cũng cờ bạt căng này ở dòng 5946 ("Settings is user-edited YAML and is probably the WRONG substrate for internal plugin state"). Nếu câu trả lời là "không phải lớp global", mục này sẽ mọc thêm một store mới và toàn bộ cách kể "store thứ hai" sẽ đổi.
- **Marker migration nên là một key ở lớp Settings hay một file marker riêng?** File marker đơn giản hơn và không thể bị người dùng dọn config xoá mất; một key Settings thì ít một file. Cả hai đều bảo vệ được — nhưng nó phải là một lựa chọn có chủ đích, không phải tai nạn, bởi một người dùng xoá nó sẽ gặp bug cài đặt hồi sinh.
- **Một cài đặt plugin có nên được phép khai báo `envFallback` không?** Quy tắc đặt tên ở bước 3 nói đến opt-in; nó không nói gì về opt-out đảo ngược thứ tự ưu tiên. Để một plugin bên thứ ba khai báo `envFallback: true` nghĩa là biến env của nó nhường cho một file project, điều gần như chắc chắn ngược với điều một tác giả plugin dự định.
- **Điều gì xảy ra với `ProjectPluginOverrides.disabled` và `.features`?** Mục này chỉ migrate `settings`. `.omp/plugin-overrides.json` sống sót với hai trong ba trường của nó, nên file KHÔNG bị xoá. Hãy xác nhận đó là chủ ý chứ không phải làm nửa.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `registry.ts:476-480` — lớp env là opt-in, `envValue()` trả undefined khi một setting không khai báo `definition.env`. | STALE LINE, SOUND CONCLUSION (DÒNG CŨ, KẾT LUẬN ĐÚNG) | Dòng 476-481 là thân CONSTRUCTOR (`const env = definition.env;` ở :476, `this.envName = ...` ở :477, `this.#parseEnv = ...` ở :478-479, `this.envFallback = ...` ở :480), không phải `envValue`. Hàm plan muốn nói là `envValue()` tại `config/registry.ts:514-523`, mà guard opt-in của nó là dòng đầu tiên: `if (!this.envName \|\| !this.#parseEnv) return undefined;` (:515). Hãy trích :515, hoặc :514-523.<br>Bằng chứng: grep -n trên `packages/coding-agent/src/config/registry.ts`: `envValue():` ở 514, `#effectiveEnv` ở 526, và dòng 480 là `this.envFallback = typeof env === "object" ? (env.fallback ?? false) : false;` — một phép gán trong constructor. Kết luận của plan đúng, con trỏ của nó thì không. |
| `Settings.getProvenance` (settings.ts:800-808) kiểm tra năm lớp và không bao giờ trả về `"env"`; chỉ `Setting.provenance(scope)` tại `registry.ts:764-765` mới trả được. | VERIFIED CORRECT (ĐÃ XÁC NHẬN ĐÚNG) | Không cần sửa. Đây là claim mang sức nặng nhất của toàn mục và nó đúng như được viết. `getProvenance` tại `config/settings.ts:800-808` trả runtime/overlay/project/global/parent-default, còn `Setting.provenance` tại `config/registry.ts:763-765` trả `this.#effectiveEnv(scope) !== undefined ? "env" : settingsOf(scope).getProvenance(this)`. Thành viên `"env"` của union tại `settings.ts:62` chỉ tới được từ đúng một bề mặt.<br>Bằng chứng: sed `settings.ts:800-808` cho thấy return năm nhánh kết thúc bằng `return this.#parent?.getProvenance(setting) ?? "default";`. sed `registry.ts:763-765` cho thấy ternary `#effectiveEnv`. Test phải khẳng định qua cái sau. |
| `register()` tại `registry.ts:783-792` ném khi trùng id, và đó là lý do namespacing mang sức nặng. | VERIFIED CORRECT, BUT INCOMPLETE — AND THE OMISSION IS THE ITEM'S BIGGEST RISK (ĐÚNG NHƯNG THIẾU — VÀ PHẦN THIẾU LÀ RỦI RO LỚN NHẤT CỦA MỤC) | Cái throw là có thật ở :787 và khối doc bắt đầu ở :783, nên khoảng dòng đúng. Điều plan không bao giờ nói là registry chỉ-THÊM: `byId.set` (:789) là đột biến duy nhất của `byId`, `ordered.push` (:790) là đột biến duy nhất của `ordered`, và `resetRegistryForTest` (:953) chỉ chạm mảng `effects`. KHÔNG có unregister. Nên một thiết kế đăng ký cài đặt plugin động lúc load làm lần load thứ hai của cùng plugin trong một process ném lỗi — và reload, suspend/resume (WI-1, WI-7) cùng unload (WI-9) đúng là những thứ các wave sau dựng. Đặc tả này thêm một `registerPluginSetting` idempotent trả về handle đã có khi tra cứu lại trùng, đặt ở bước 1.<br>Bằng chứng: grep -n `'byId'` trên registry.ts trả đúng bốn hit: khai báo :778, kiểm tra `has()` :787, `set` :789, `get` :796. grep -n `'ordered'` trả khai báo :779 và `push` :790. `resetRegistryForTest` tại :953 có thân gọi `unbindEffects()` và duyệt `effects` — không bao giờ `byId`. |
| Store vệt phụ là `manager.ts:929-960` đọc từ hai file, và migrate vùng đó chính là công việc. | INCOMPLETE — a second copy of the same merge exists and the plan never mentions it (THIẾU — có một bản sao nữa của đúng phép trộn đó và plan không bao giờ nhắc) | `packages/coding-agent/src/extensibility/plugins/loader.ts:474-483` export một `getPluginSettings(pluginName, cwd)` cấp module, là bản sao từng byte của phép trộn `{ ...global, ...project }` trên đúng hai file legacy đó. Nó được re-export qua barrel `extensibility/plugins` (`plugins/index.ts:5`) và nó là hàm một EXTENSION gọi theo tên. Chỉ migrate `manager.ts` thì đường đọc hướng về extension vẫn nằm trên file legacy mãi mãi — đúng cái thất bại "hai đường đọc, bạn migrate một" mà plan nêu là rủi ro chính, tái lập y hệt ở file kế bên. Nó dễ bị bỏ sót chính vì `git grep` không thấy caller nào trong repo: bên tiêu thụ là code bên thứ ba. Bước 8 của đặc tả này phủ nó.<br>Bằng chứng: sed `loader.ts:460-483` cho thấy `export async function getPluginSettings(pluginName: string, cwd: string)` gọi `loadRuntimeConfig()` và `loadProjectOverrides(cwd)` rồi trả `{ ...global, ...project }`. `git grep -n getPluginSettings` trên `packages/` chỉ trả về manager.ts, loader.ts, plugin-cli.ts, tui/overlays/plugin-settings.ts và các test — không có caller production nào của bản loader. |
| Tab cài đặt Plugins nằm ở `packages/tui/src/overlays/settings-selector.ts:435` và phải được để yên bởi mục này. | STALE LINE, SOUND INSTRUCTION (DÒNG CŨ, CHỈ DẪN ĐÚNG) | Tab hard-code nằm ở :438, không phải :435: `{ id: "plugins", label: ... }`, nằm trong `getSettingsTabs()` (:431-440). Có một hit thứ hai ở :856. Chỉ dẫn để yên là đúng và thuộc blocker 4 của WI-8b, không thuộc mục này. Cùng một dòng sai này lặp lại trong danh sách file của WI-8b.<br>Bằng chứng: grep -n `'id: "plugins"'` trên settings-selector.ts trả về :438 và :856; sed 420-450 xác định tab Plugins ở 438 bên trong `getSettingsTabs()`. |
| Hình dạng `ProjectPluginOverrides` tại `plugins/types.ts:156-163`, với `settings?` ở `:162`. | VERIFIED CORRECT (ĐÃ XÁC NHẬN ĐÚNG) | Không cần sửa. Interface khai báo ở :156, đóng ở :163, và `settings?` nằm ở :162; `disabled?` ở :158 và `features?` ở :160 (dòng :157/:159/:161 là JSDoc). Điều này liên quan vì mục này chỉ migrate `settings` — file sống sót với hai trong ba trường, nên nó KHÔNG bị xoá.<br>Bằng chứng: sed `types.ts:156-163` cho thấy đúng sáu dòng nêu trên, theo thứ tự. |
| Lớp env là nơi giá trị của test bị biến môi trường ghi đè, và plan nói ra rằng một dòng khẳng định `"env"` mà không có `env` khai báo phải đỏ. | VERIFIED, WITH AN UNSTATED INVERSION THE PLAN MISSES (ĐÚNG, KÈM MỘT ĐẢO NGƯỢC CHƯA NÊU MÀ PLAN BỎ SÓT) | Cả hành vi opt-in lẫn hành vi đỏ-khi-không-khai-báo đều đúng. Điều plan không nhắc là `envFallback`: `#effectiveEnv` (`config/registry.ts:526-535`) làm cho env NHƯỜNG cho bất kỳ lớp nào đã cấu hình khi definition đặt nó, và mặc định là `false` (:480), nên env thắng theo mặc định. Một fixture khai báo `envFallback: true` sẽ khiến giá trị project thắng và `provenance` báo `"project"` — một test đỏ vì hành vi đúng, và đúng là hình dạng sai lầm mà người ta "sửa" bằng cách làm lỏng khẳng định. Đặc tả này nêu nó là cái bẫy ở dòng 3.<br>Bằng chứng: sed `registry.ts:526-535` cho thấy `if (value === undefined \|\| !this.envFallback) return value;` rồi tới nhánh `envFallback === true` và nhánh so sánh chuỗi. registry.ts:480 là `this.envFallback = typeof env === "object" ? (env.fallback ?? false) : false;`. |
| Rủi ro migration đã được bao phủ trọn vẹn bởi test provenance chạy phân tầng thật. | OVERSTATED (NÓI QUÁ) | Test provenance bảo vệ PHÂN TẦNG, không bảo vệ MIGRATION. Ba dạng lỗi sống sót qua nó: (a) một migration không có marker hoàn thành chạy lại mỗi lần khởi động và hồi sinh các key người dùng đã xoá sau lần chạy đầu — không thể phát hiện bởi một suite chỉ migrate một lần; (b) lớp bền vững mới sai và giá trị được ghi vào nơi đường đọc không hề tham chiếu tới; (c) `deletePluginSetting` lặng lẽ đổi nghĩa từ "xoá thẳng" thành "chỉ xoá lớp global". Vì vậy cổng của đặc tả này thêm một bước thủ công (4) phủ ca hồi sinh khi chạy lại, cùng hai open_question liên quan, thay vì dựa vào test một mình.<br>Bằng chứng: `unsetGlobalValue` (`config/settings.ts:845-859`) chỉ gọi `deleteByPath(this.#global, segments)`; không có thao tác xoá ở lớp project nào trong method đó, và không có thứ tương đương nào tồn tại trong delete vệt phụ cũ. |
| Môi trường: `bun test` báo 0 pass vì native addon chưa build; `bun run check:ts` là cổng dùng được. | VERIFIED EXACTLY (ĐÃ XÁC NHẬN CHÍNH XÁC) | Không cần sửa. Đã tái hiện cả hai. `bun test test/config/settings-registry.test.ts` → `0 pass / 1 fail`, `Cannot find module .../native/pi_natives.darwin-arm64.node`, kèm gợi ý của chính loader `bun --cwd=packages/natives run build`. `bun run check:ts` → sạch, oxlint + oxfmt pass trên 5445 files, cả 16 package `check:types` Done. Lệnh build là nửa đầu của cổng; nửa test bị chặn cho tới khi nó chạy.<br>Bằng chứng: chạy trực tiếp cả hai lệnh trong repo ở HEAD 808b365 trên nhánh milestone-1. |

## Cần người xác nhận

Hai điểm tự mâu thuẫn nhẹ trong chính đặc tả, ghi ra thay vì tự sửa:

- **Wave và `blocks` không thống nhất.** Trường `wave` ghi "7 of 8 (M2) — alongside WI-8b and WI-9", tức là 8b chạy SONG SONG với mục này; nhưng `blocks` ghi rằng "WI-8b … explicitly gated on this item". Hai mốc quan hệ đó không vừa nhau nếu đọc cứng. Cần xác nhận: WI-8b nằm cùng wave nhưng phải chạy SAU trong wave, hay thực sự phải dời sang wave 8.
- **Đếm số lớp không nhất quán.** `one_line` và ghi chú trong `files_touched` đều viết "the same six-layer tiering (runtime → overlay → project → global → parent → default, plus env)" — tức là 6 lớp được liệt kê RỒI cộng thêm env, tổng cộng 7. Trong khi `test_contract` lại gọi đây là "the SAME six-layer tiering as a core setting" và coi env là một trong các lớp. Số lớp không ảnh hưởng gì tới hợp đồng (điểm chỉ bắt buộc là `provenance` trả về `"env"`), nhưng văn bản nên thống nhất trước khi dùng làm mốc so sánh khi review.


---


## WI-8b. Mở `pi.registerSetting` để một extension tự khai báo config key của nó (Phương án B)

**Thay đổi gì:** Một extension có thể gọi `pi.registerSetting(definition)` lúc load để khai báo một config key có namespace, có kiểu và nhận biết biến môi trường, với hành vi y hệt một setting lõi — hiện ra và sửa được trong settings panel, báo cáo được qua sáu lớp provenance, và gỡ bỏ được khi extension unload.

**Wave:** 7 (settings ownership và unload seam thật: WI-8a, WI-8b, WI-9)

**Effort:** L. Bề mặt API công khai chỉ là một method; phần việc thật là bốn blocker cộng thêm hai cái mà plan bỏ sót (unregistration theo phạm vi owner và tính idempotent khi prepared-rebind, cả hai đều đã kiểm chứng bên dưới). Ước lượng: M cho owner-scoped registry + invalidation, M cho loader/API/đường typing, S–M cho vị trí trên panel tùy M2-OQ4 đã quyết (M nếu panel trở thành data-driven, S nếu key của extension nằm dưới tab Plugins sẵn có), S cho test. Không bắt đầu bước 5–7 trước khi quyết định M2-OQ4 đã được ghi lại — xem mục Cần người quyết.

**Người dùng thấy:** Một extension bên thứ ba tự mang setting của nó: key xuất hiện trong settings panel dưới vị trí mà M2-OQ4 chọn, sửa nó ghi vào các lớp setting thường (runtime/overlay/project/global), một biến môi trường có thể ghi đè nó, và lớp thắng được báo qua `setting.provenance(scope)` — hiện CHƯA có màn hình panel nào vẽ lớp này (`git grep -ni provenance -- packages/tui/src/` chỉ ra 5 kết quả, không cái nào liên quan settings; entry của panel ở `settings-ui.ts:58-66` không có trường provenance; `envNote` ở :39-44 chỉ nối một câu mô tả env vào `description`). Nếu muốn panel thật sự hiện lớp thắng thì đó là phần việc riêng, chưa nằm trong bốn dòng test và chưa có trong phạm vi mục này. Hai extension mà chọn trùng một key sẽ tạo ra lỗi lúc khởi động, nêu đích danh chỗ trùng, thay vì một bên âm thầm ghi đè bên kia. Hiện tại tác giả extension không có cách nào làm bất kỳ điều gì trong số đó — họ phải tự viết một file side-channel mà không ai đọc.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/config/registry.ts` | sửa | Thêm `ownerById` / `idsByOwner` cạnh `byId` (778) và `ordered` (779); chuyển thân `register` vào hàm mới `registerOwned(owner, definition)`; `register` (786) ủy nhiệm với owner `"core"` và giữ nguyên chữ ký; thay throw ở 787 bằng message nêu cả id bị trùng, cả owner hiện tại, cả quy tắc namespace; thêm `ownedBy` và `unregisterOwned` cạnh `lookup` (795) / `all` (800). | Có — HEAD 808b365 |
| `packages/coding-agent/src/config/all-settings.ts` | sửa | Thêm `invalidateOrderedSettings()` xoá memo `ordered` (85); gọi nó từ đường add/remove của registry. Mở rộng `orderedSettings()` (88-123) để nối thêm các handle có trong `all()` mà không `DOMAINS` nào nhận, theo thứ tự đăng ký, sau dãy tĩnh. | Có — HEAD 808b365 |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Thêm `registerSetting<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]>` vào `ExtensionAPI` cạnh `registerFlag`; thêm `readonly settingIds: string[]` vào `Extension`. | Có — HEAD 808b365 |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | Thêm `extensionSettingOwner(extension)` sinh owner ổn định từ `extension.resolvedPath`; thêm `registerSetting` vào `ConcreteExtensionAPI` (kiểm tra namespace, idempotent khi rebind, đẩy id vào `extension.settingIds`); export `releaseExtensionSettings(owner)`. | Có — HEAD 808b365 |
| `packages/coding-agent/src/config/settings-ui.ts` | chỉ đối chiếu | Không dự kiến sửa. Đây là nguồn dữ liệu mà dòng test của panel phải đọc: `createSettingsHost()` dựng `entries` bằng cách duyệt `SETTING_TABS` × `orderedSettings()` và giữ lại entry có `ui?.tab === tab`. Chỉ đụng vào file này nếu M2-OQ4 buộc host phải mang một tab không tĩnh. | Có — HEAD 808b365 |
| `packages/tui/src/overlays/settings-defs.ts` | chỉ đối chiếu | Chưa sửa cho tới khi M2-OQ4 có câu trả lời. `SettingTab` (:4-15) là union đóng gồm đúng mười literal, `SETTING_TABS` (:20) là mảng tĩnh, `TAB_METADATA` (:34, JSDoc ở :33) là record metadata tĩnh, `TAB_GROUPS` (:52-88) là `Record<SettingTab, readonly string[]>` tĩnh, và `UiBase` (:97-111) đòi `tab: SettingTab` cùng một `group` phải có sẵn trong `TAB_GROUPS[tab]`. | Có — HEAD 808b365 |
| `packages/tui/src/overlays/settings-selector.ts` | chỉ đối chiếu | Chưa sửa cho tới khi M2-OQ4 có câu trả lời. `getSettingsTabs()` trả về mười tab theo schema cộng một entry `plugins` viết cứng; phần tìm kiếm dựa trên schema thêm độc lập một entry `plugins` bị làm mờ ngoài đường đi của schema. | Có — HEAD 808b365 |
| `packages/coding-agent/test/config/extension-registered-setting.test.ts` | tạo | File mới. Bốn dòng do §11.2 mục 7 yêu cầu, cộng dòng 5 về `unregisterOwned` (xem mục Hợp đồng test): (1) hai extension khai cùng một id sinh ra một entry `errors` nêu đích danh chỗ trùng; (2) một key đã đăng ký đọc được qua typed handle của nó và `provenance(scope)` nêu lớp thắng không phải env; (3) key xuất hiện trong settings overlay tại vị trí M2-OQ4 chọn, khẳng định trên `createSettingsHost().entries` — BỊ CHẶN cho tới khi có M2-OQ4; (4) một key khai `definition.env` báo `"env"` từ `provenance(scope)` khi biến môi trường của nó được set và báo lớp khác khi không, còn key không khai `env` thì không bao giờ báo `"env"`. | Có — thư mục `packages/coding-agent/test/config/` tồn tại và giữ bảy file test, trong đó có `settings-registry.test.ts`; bản thân file này chưa tồn tại |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Added` cho API mới; thêm một dòng nữa dưới `### Changed` nếu M2-OQ4 cấu trúc lại các tab của panel. | Có — HEAD 808b365 |

Ghi chú về phạm vi trích dẫn: cột cuối phản ánh cờ `verified` của spec. Các neo kiểu `registry.ts:476-480`, `registry.ts:764-765`, `settings.ts:800-808`, `model-registry.ts:2914` và `model-registry.ts:2955` xuất hiện dưới đây lấy từ ghi chú trong chính spec chứ không nằm trong bảng đã kiểm chứng ở trên; đọc chúng như tham chiếu của spec, chưa phải neo đã đánh dấu verified.

### Các bước

1. **Xác nhận WI-8a đã xuống, và quyết định namespacing của nó đã được viết ra — BLOCKING PREREQUISITE.** WI-8a là phụ thuộc cứng: `registerOwned` dưới đây từ chối một id trần, mà sự từ chối đó vô nghĩa nếu chất nền sở hữu key của extension chưa tồn tại. Tại thời điểm viết tài liệu này, `.lavish-wip/m2-specs/` ĐÃ có `WI-8a.spec.json` (39 KB) — mục này được đặc tả trước tiền đề của nó, nhưng tiền đề đã có mặt (`.lavish-wip/m2-index/specs` là symlink trỏ sang cùng thư mục). Trước khi code, đọc `WI-8a.spec.json` và đối chiếu ba điểm nó đã chốt: namespace dành riêng `plugins.<id>.<key>`; quy tắc env `OMP_<PLUGIN_ID>_<KEY>` (viết hoa, `-`/`.` → `_`, khai tường minh trong `SettingDefinition.env`, không bao giờ tự sinh); và câu hỏi còn mở về lớp bền vững cho setting bên thứ ba. Nếu WI-8b chọn namespace khác `plugins.` thì phải ghi lý do, vì WI-9 sẽ quét cả hai không gian tên trong một bảng kiểm kê.
2. **`packages/coding-agent/src/config/registry.ts:778-792` — thêm đăng ký theo phạm vi owner.** Khai báo `ownerById: Map<string, string>` và `idsByOwner: Map<string, Set<string>>` cạnh `byId`/`ordered` ở module scope (:778-779). Chuyển thân của `register` vào hàm mới `registerOwned(owner, definition)` và cho `register` ủy nhiệm sang nó với owner `"core"` — chữ ký phải không đổi, vì 41 file dưới `packages/coding-agent/src` gọi `register({...})` và tất cả phải tiếp tục biên dịch mà không cần sửa. Thay throw ở :787 bằng message nêu cả id bị trùng, cả owner hiện tại, cả quy tắc namespace. Đây là compatibility gate của GĐ6: không test nào khẳng định message cũ (đã kiểm chứng: `git grep -n "registered twice" -- '*test*'` không trả gì; lệnh không giới hạn phạm vi thì trả 3 kết quả — dòng source `registry.ts:787` cùng hai chỗ văn xuôi ở `docs/secrets.md:140` và `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:9923`, không phải test), nên đổi nó không làm hỏng gì, và nó là khác biệt giữa một tác giả debug được chỗ trùng và một tác giả không.
3. **`packages/coding-agent/src/config/registry.ts:794-802` — thêm `ownedBy(owner)` và `unregisterOwned(owner)`** cạnh `lookup`/`all`. `unregisterOwned` phải xoá id khỏi `byId`, khỏi `ordered` (splice handle tương ứng ra), và khỏi cả hai index owner, đồng thời trả về các id đã gỡ để caller vô hiệu hóa cache dẫn xuất. Giữ nó là no-op với một owner chưa đăng ký gì. Hàm này hôm nay không tồn tại, và việc thiếu nó là điều tốn kém nhất có thể mắc phải ở đây: với trạng thái module chỉ nối thêm, việc tắt rồi bật lại một extension trong cùng một process sẽ ném "already registered" ở lần bật thứ hai. `packages/coding-agent/src/config/model-registry.ts` là khuôn mẫu để chép hình dạng — `clearSourceRegistrations(sourceId)` ở :2914 và `syncExtensionSources(activeSourceIds)` ở :2955 đã làm đúng điều đó cho provider.
4. **`packages/coding-agent/src/config/all-settings.ts:43-77, 85-89, 88-123` — làm cho `orderedSettings()` nhìn thấy setting đăng ký động.** Có hai khiếm khác riêng biệt, sửa cả hai. (a) Memo `ordered` ở :85-89 không bao giờ bị vô hiệu hóa, nên một setting đăng ký sau lần gọi đầu tiên sẽ vô hình mãi mãi — thêm `invalidateOrderedSettings()` và gọi nó ở mọi nơi thêm hoặc gỡ key. (b) `domainHandles` chỉ ghé các giá trị tới được từ 33 entry tĩnh `DOMAINS` ở :43-77, nên một handle thuộc extension có trong `all()` nhưng không thuộc domain nào và bị rơi lặng lẽ. Nối thêm các handle trong `all()` mà không domain nào nhận, theo thứ tự đăng ký, sau dãy tĩnh. Giữ nguyên sổ sách `sequence`/`seen` hiện có — nó là thứ cho thứ tự khai báo bên trong một domain, mất nó sẽ đảo thứ tự toàn bộ panel. Vị trí của khối nối thêm nằm CHÍNH LÀ quyết định M2-OQ4; đừng chốt trước bước 6.
5. **`packages/coding-agent/src/extensibility/extensions/types.ts:1256-1582` (method gần :1430), :1802-1817` — mở rộng API công khai.** Thêm `registerSetting<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]>` vào `ExtensionAPI`, ngay cạnh `registerFlag` ở :1430, kèm doc comment nói rõ yêu cầu namespace, throw khi trùng, và bảo đảm idempotent khi rebind. Thêm `readonly settingIds: string[]` vào `Extension` ở :1802-1817 để extension sở hữu biết mình đã khai gì. Import `SettingDefinition`, `DefinitionValue` và `Setting` bằng type import ở top-level từ config module — không `import("...").Type` nội tuyến, không `ReturnType<>`, không `any`. Interface hiện có đúng 29 method (đã kiểm chứng bằng cách liệt kê tên method khác nhau có tab đầu trong khoảng 1256-1582); thêm method này thành 30, nên hãy cập nhật mọi doc hay con số đang khẳng định 29.
6. **CHẶN THEO M2-OQ4 — xem mục Cần người quyết. Đừng viết bước này cho tới khi quyết định M2-OQ4 được ghi lại.** Blocker 3 và 4 của plan hoá ra là MỘT vấn đề gắn liền nhau, không phải hai, và đây là đính chính quan trọng nhất: từ vựng định vị của panel là một union đóng. `SettingTab` trong `packages/tui/src/overlays/settings-defs.ts:4-15` đúng bằng mười literal; `TAB_GROUPS` ở :52-88 là một `Record<SettingTab, readonly string[]>` tĩnh; và `createSettingsHost()` trong `packages/coding-agent/src/config/settings-ui.ts:51-68` dựng panel bằng cách duyệt `SETTING_TABS` và giữ các entry có `ui?.tab === tab` (:53-56). Nên một key của extension chỉ có thể rơi vào một trong mười tab sẵn có — "một tab động cho mỗi extension" không biểu đạt được nếu không đổi cả union, và tab id `plugins` hiện có đã nằm ngoài union đó. Quyết trước, rồi mới cài: nếu key của extension nằm dưới tab Plugins sẵn có, còn phải chốt luôn `:848-860` trong `settings-selector.ts` (phần tìm kiếm dựa trên schema, mà comment ở :854 đã nói "Plugins hosts its own UI; it is not part of the schema-backed search") — chỉ sửa danh sách tab để lại một mặt bề mặt thứ hai nơi một key đăng ký lúc load vĩnh viễn vô hình, đúng thứ mà GĐ6 cảnh báo.
7. **`packages/coding-agent/src/extensibility/extensions/loader.ts:179, 191-208, 259-267, 277-289` — cài `registerSetting` trên `ConcreteExtensionAPI`.** Constructor ở :191-208 duyệt prototype và bind mọi method, nên KHÔNG cần wiring constructor — chỉ thêm method vào class. Lấy `registerComposerShape` ở :277-289 làm khuôn mẫu: nó đã validate id và ném typed error trước khi mutate bất cứ thứ gì; đó là khuôn mẫu của nhà cho "từ chối lúc đăng ký, không phải để sau". Cài đặt phải có ba hành vi: (a) từ chối `id` không có namespace với message nêu prefix bắt buộc; (b) coi lời gọi lặp lại cùng definition của CÙNG owner là no-op trả về handle đã có — `bindPreparedExtensions` (loader.ts:491-520) cố ý rebind một extension đã prepare cho một session con, chạy lại factory, và đường đó đã được `test/extension-prepared-rebind.test.ts` phủ; (c) đẩy id vào `extension.settingIds`.
8. **`packages/coding-agent/src/extensibility/extensions/loader.ts:438-459, 491-520` — nối teardown.** Thêm helper `releaseExtensionSettings(owner)` cạnh các seam export khác của loader, gọi `unregisterOwned` rồi `invalidateOrderedSettings`, và gọi nó từ đường unload. WI-9 sở hữu seam unload chung và bảng kiểm kê 11 bucket của nó; đóng góp của WI-8b là bucket — các key setting — và WI-9 phải nhìn thấy bucket đó nếu không nó không đếm được. Đừng nới phạm vi sang phần việc của WI-9: cứ đưa helper vào, expose các id, để WI-9 quét.
9. **`packages/coding-agent/test/config/extension-registered-setting.test.ts` — viết năm dòng hợp đồng (bốn dòng của §11.2 mục 7, cộng dòng 5 về `unregisterOwned`; xem mục Hợp đồng test).** Mẫu setup, chép từ `test/extension-registered-tool-source-info.test.ts`: `new ExtensionRuntime()` + `new EventBus()` + `loadExtensionFromFactory(factory, "/project", events, runtime, name)`, import từ `../src/extensibility/extensions/loader`. Riêng cho dòng 1, dùng `loadExtensions` hoặc `bindPreparedExtensions` — hai hàm đó gom vào `LoadExtensionsResult.errors` (loader.ts:497-505), còn `loadExtensionFromFactory` ném thẳng ở :473 và không tạo entry lỗi nào. Riêng cho dòng 1, 2 và 4, bạn không cần loader: gọi `register`/`registerOwned`/`lookup` trực tiếp với một `Settings` thật dựng trên thư mục tạm, đúng như `test/config/settings-registry.test.ts` đang làm. `withEnv` để mutate biến môi trường đã nằm sẵn trong file đó — chép nó, đừng viết cái thứ hai. Không `mock.module()`, tuyệt đối.
10. **`packages/coding-agent/CHANGELOG.md` — thêm changelog.** Một dòng dưới `## [Unreleased]` → `### Added`, hướng người dùng, không kể nguyên nhân gốc: đại ý `Added pi.registerSetting so extensions can declare their own settings, editable in the settings panel`. Nếu M2-OQ4 rơi vào phương án đổi cấu trúc tab của panel, cần thêm một dòng hướng người dùng nữa dưới `### Changed` — người dùng đã có thói quen với panel mười tab sẽ nhận ra.

### Hình dạng code

```typescript
// ── packages/coding-agent/src/config/registry.ts ──────────────────────────────
// Owner-scoped registration. Core declarations go through `register` (owner
// "core"); extension declarations go through `registerOwned` and are removable.
// `register` keeps its existing signature so the 41 files of `register({...})`
// call sites are untouched.

const byId = new Map<string, AnySetting>();
const ordered: AnySetting[] = [];
/** Setting id → the owner that declared it. Absent means a module-level core setting. */
const ownerById = new Map<string, string>();
/** Owner → the ids it declared, so a whole extension's keys drop in one call. */
const idsByOwner = new Map<string, Set<string>>();

/** Ids an extension owns are namespaced; a bare id can never be claimed. */
const EXTENSION_ID_PREFIX = "extension.";
// Cần khớp hoặc giải thích lệch với namespace WI-8a đã chốt: `plugins.<id>.<key>`.

export function isExtensionSettingId(id: string): boolean {
	return id.startsWith(EXTENSION_ID_PREFIX);
}

/**
 * Declares a setting owned by `owner` and returns its typed handle.
 *
 * @throws Error naming BOTH the colliding id and the current owner when `id` is
 *   already taken — by a core setting or by a different extension. The message
 *   must state the namespace rule, otherwise an author who collided with a core
 *   id has no way to learn that was the cause.
 */
export function registerOwned<const D extends SettingDefinition>(
	owner: string,
	definition: D,
): Setting<DefinitionValue<D>, D["id"]> {
	const existing = byId.get(definition.id);
	if (existing) {
		const holder = ownerById.get(definition.id) ?? "core";
		throw new Error(
			`Setting "${definition.id}" is already registered by ${holder}. ` +
				`An extension setting id must start with "${EXTENSION_ID_PREFIX}" and ` +
				`be unique across all extensions.`,
		);
	}
	const handle = new Setting<DefinitionValue<D>, D["id"]>(definition);
	byId.set(definition.id, handle as AnySetting);
	ordered.push(handle as AnySetting);
	ownerById.set(definition.id, owner);
	const ids = idsByOwner.get(owner) ?? new Set<string>();
	ids.add(definition.id);
	idsByOwner.set(owner, ids);
	return handle;
}

/** Existing core entry point; now an `registerOwned` call with owner "core". */
export function register<const D extends SettingDefinition>(definition: D): Setting<DefinitionValue<D>, D["id"]> {
	return registerOwned("core", definition);
}

/** Ids currently owned by `owner` — no-op for an owner that declared none. */
export function ownedBy(owner: string): readonly string[] {
	return [...(idsByOwner.get(owner) ?? [])];
}

/**
 * Drops every setting `owner` declared, from the id map, the order array and the
 * owner index. Returns the removed ids so the caller can invalidate derived
 * caches. Without this an extension that is disabled and re-enabled in one
 * process throws "already registered" on its second enable.
 */
export function unregisterOwned(owner: string): string[] {
	const ids = [...(idsByOwner.get(owner) ?? [])];
	for (const id of ids) {
		byId.delete(id);
		ownerById.delete(id);
		const index = ordered.findIndex(handle => handle.id === id);
		if (index >= 0) ordered.splice(index, 1);
	}
	idsByOwner.delete(owner);
	return ids;
}

// ── packages/coding-agent/src/config/all-settings.ts ───────────────────────────
// `ordered` currently memoizes forever (`:85-89`). A setting registered after the
// first call is invisible to the panel, so it needs an invalidation hook that the
// owner-scoped registry calls. Clearing the memo is all that takes — `let ordered`
// already supports it, no generation counter required.

let ordered: readonly AnySetting[] | undefined;

/** Called by the owner-scoped add/remove path; forces the next `orderedSettings()` to recompute. */
export function invalidateOrderedSettings(): void {
	ordered = undefined;
}

// A dynamically registered setting belongs to no DOMAINS entry, so
// `domainHandles` never visits it and the current `orderedSettings()` drops it
// on the floor. Append owned settings that no domain claims, in registration
// order, after the static sequence — the placement the M2-OQ4 decision selects.
export function orderedSettings(): readonly AnySetting[] {
	if (ordered) return ordered;
	const sequence = new Map(all().map((handle, index) => [handle, index]));
	const seen = new Set<AnySetting>();
	const domainHandles = (domain: Readonly<Record<string, unknown>>): AnySetting[] => { /* unchanged */ };
	const placedBefore = new Map<AnySetting, AnySetting[]>();
	/* unchanged PLACED_DOMAINS fold */
	const result: AnySetting[] = [];
	for (const domain of DOMAINS) {
		for (const handle of domainHandles(domain)) {
			const placed = placedBefore.get(handle);
			if (placed) result.push(...placed);
			result.push(handle);
		}
	}
	// NEW: keys that no static domain claims, so `createSettingsHost` can see them.
	for (const handle of all()) {
		if (seen.has(handle)) continue;
		result.push(handle);
	}
	ordered = result;
	return result;
}

// ── packages/coding-agent/src/extensibility/extensions/types.ts ────────────────
// `ExtensionAPI` spans 1256-1582. Add the method beside `registerFlag` (1430)
// and add the returned setting to `Extension` (1802-1817).

/**
 * A settings definition an extension may declare. Identical to `SettingDefinition`
 * except `id` must be namespaced: `extension.<slug>.<key>`.
 */
export type ExtensionSettingDefinition = SettingDefinition;

// inside `interface ExtensionAPI`, next to registerFlag:
/**
 * Declares a setting owned by this extension and returns its typed handle.
 * The `id` is rewritten to `extension.<slug>.<key>` — a bare id throws — so an
 * extension can never collide with a core setting id or another extension's key.
 *
 * Calling this twice with the same definition during the SAME bind is a no-op
 * returning the same handle; a prepared extension rebound to a child session
 * re-runs its factory, so rebinding must not throw.
 *
 * @throws Error when `id` is not namespaced, or names an id another owner holds.
 */
registerSetting<const D extends ExtensionSettingDefinition>(
	definition: D,
): Setting<DefinitionValue<D>, D["id"]>;

// inside `interface Extension` (1802-1817):
/** Setting ids this extension declared, in declaration order. */
readonly settingIds: string[];

// ── packages/coding-agent/src/extensibility/extensions/loader.ts ───────────────
// `ConcreteExtensionAPI` is at 179; its constructor (191-208) walks the prototype
// and binds every method, so a new method needs NO constructor wiring.

// CHƯA CHỐT — xem mục Cần người quyết 「Điều gì tạo ra một slug namespace ổn định cho một extension?」.
// Đừng hardcode ở đây.
// `Extension.path` là đường dẫn người gõ, không ổn định.
// `Extension.resolvedPath` chỉ là đường dẫn tuyệt đối trên đường `loadExtensions` (loader.ts:417);
// trên `loadExtensionFromFactory` nó BẰNG `name` (loader.ts:471), nên hai extension nạp
// bằng cùng một tên sẽ gộp làm một owner.
// Khoôn mẫu có sẵn: `capability/extension-module.ts:28` — toExtensionId: ext => `extension-module:${ext.name}`
function extensionSettingOwner(extension: Extension): string {
	throw new Error("unimplemented: settle the owner-slug question first");
}

class ConcreteExtensionAPI implements ExtensionAPI, IExtensionRuntime {
	// ... existing fields ...

	registerSetting<const D extends ExtensionSettingDefinition>(
		definition: D,
	): Setting<DefinitionValue<D>, D["id"]> {
		if (!isExtensionSettingId(definition.id)) {
			throw new Error(
				`Extension setting id "${definition.id}" is not namespaced; ` +
					`it must start with "${EXTENSION_ID_PREFIX}".`,
			);
		}
		const owner = extensionSettingOwner(this.extension);
		// Rebind-safe: the same prepared extension bound to a child session
		// re-runs its factory; the key already belongs to us, so reuse it.
		const existing = lookup(definition.id);
		if (existing && ownerByIdOf(definition.id) === owner) return existing as Setting<DefinitionValue<D>, D["id"]>;
		const handle = registerOwned(owner, definition);
		this.extension.settingIds.push(definition.id);
		return handle;
	}
}

// A rebind or unload must also drop the keys, or a disabled-then-re-enabled
// extension throws on its second enable. `bindPreparedExtensions` is the seam
// exported to the session layer; wire the drop next to the unload seam WI-9 builds.
export function releaseExtensionSettings(owner: string): string[] {
	const removed = unregisterOwned(owner);
	if (removed.length > 0) invalidateOrderedSettings();
	return removed;
}
```

### Hợp đồng test

Bốn dòng do §11.2 mục 7 yêu cầu, cộng MỘT dòng do chính blocker bị plan bỏ sót bắt buộc — không có nó thì cổng xanh trên một bản cài thiếu `unregisterOwned`. Tên file: `packages/coding-agent/test/config/extension-registered-setting.test.ts`.

1. **CHỖ TRÙNG ĐƯỢC NÊU RA, KHÔNG BỊ NUỐT.** Hai extension khai cùng một setting id tạo ra một entry trong `LoadExtensionsResult.errors` mà nội dung nêu cả id bị trùng lẫn việc một id có namespace là bắt buộc — không phải last-writer-wins, không phải nuốt throw. Nếu hồi quy: extension thứ hai âm thầm thừa kế hoặc đè key của extension thứ nhất, và không tác giả nào biết id của mình đã bị lấy. Phải khẳng định qua `loadExtensions`/`bindPreparedExtensions` (hai hàm gom vào `errors`, loader.ts:497-505), KHÔNG qua `loadExtensionFromFactory` — hàm sau ném thẳng raw ở loader.ts:473 và không bao giờ sinh entry `errors`.
2. **MỘT SETTING ĐÃ ĐĂNG KÝ LÀ MỘT SETTING HẠNG NHẤT, KHÔNG PHẢI MỘT KHO LƯU ĐÃ ĐỔI TÊN.** Sau khi một extension khai một key, `lookup(id)` trả về handle, `handle.get(scope)` đọc nó, và `handle.provenance(scope)` nêu lớp thắng trong năm lớp không phải env — chứng minh key động đã gia nhập cùng một ngăn xếp lớp với key lõi. Phải khẳng định CẢ giá trị đã phân giải LẪN lớp được báo; khẳng định chỉ giá trị sẽ pass ngay cả trên một kho lưu tình cờ đọc đúng file. Khẳng định qua `Setting.provenance` (registry.ts:764-765), không phải `Settings.getProvenance` (settings.ts:800-808) — hàm sau không bao giờ trả về `"env"`.
3. **CÓ MẶT TRONG PANEL — BỊ CHẶN THEO M2-OQ4, xem mục Cần người quyết.** Sau khi một extension đăng ký một key lúc load, khẳng định nó CÓ TRONG danh sách của settings overlay, đúng tại vị trí M2-OQ4 chọn, bằng cách dựng danh sách từ nguồn dữ liệu mà panel thực sự render. Nguồn đã kiểm chứng là `createSettingsHost()` (settings-ui.ts:51-68), vốn duyệt `SETTING_TABS` × `orderedSettings()` và giữ các entry có `ui?.tab === tab` (settings-ui.ts:53-56) — vậy khẳng định trên `host.entries`, không bao giờ trên DOM, và không bao giờ source-grep `settings-selector.ts`.
4. **LỚP `env` LÀ OPT-IN VÀ TUỲ CHỌN.** Một key động khai `definition.env` báo `"env"` từ `provenance(scope)` khi biến môi trường của nó được set, và báo một lớp khác khi không; một key động KHÔNG khai `env` thì không bao giờ báo `"env"` kể cả khi có biến cùng tên được set. Dòng này tồn tại vì `env` là opt-in theo từng setting — `#parseEnv` vẫn là `undefined` khi thiếu `definition.env` (registry.ts:476-480), nên `envValue()` trả về `undefined` và provenance rơi xuống lớp khác — và vì một overlay chỉ vẽ lại năm lớp cũ sẽ pass dòng 1 và dòng 2 trong khi lặng lẽ mất trọn vẹn env. Khẳng định cả giá trị đã phân giải lẫn lớp hiện ra; không bao giờ khẳng định rằng "registerSetting đã được gọi".
5. **GỠ ĐƯỢC RỒI BẬT LẠI ĐƯỢC, VÀ REBIND KHÔNG NÉM.** (a) `unregisterOwned(owner)` xoá key khỏi `byId`, khỏi `ordered` và khỏi cả hai index owner, trả về danh sách id đã gỡ; gọi lại `registerOwned` với cùng owner và cùng id phải thành công, và `orderedSettings()` phải chứa lại key đó sau khi `invalidateOrderedSettings()`. (b) Chạy factory hai lần cho cùng một owner (mô phỏng `bindPreparedExtensions`) phải trả về cùng một handle và không ném. Không có dòng nào trong bốn dòng hiện tại phủ (a), và `check:ts` không bắt được vì không gì gọi tới `unregisterOwned` — đây là lỗ hổng cổng lớn nhất của mục này.

### Xác minh

```bash
bun run check:ts
brew install ninja   # BẮT BUỘC TRƯỚC — cmake build của opusic-sys cần Ninja.
#   Thiếu nó, lệnh ngay dưới exit 1 với "CMake was unable to find a build program
#   corresponding to Ninja. CMAKE_MAKE_PROGRAM is not set."
bun --cwd=packages/natives run build   # unblock bun test; verified: without it bun test reports 0 pass / 1 fail / 1 error
cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts
cd packages/coding-agent && bun test test/config/settings-registry.test.ts   # the 41 files of existing register({...}) call sites must not regress
```

Tuyệt đối không dùng `tsc` — dự án cấm. Dùng `bun run check:ts`.

### Cổng hoàn thành

Ba dòng, theo đúng thứ tự:

(0) `bun --cwd=packages/natives run build` — TIỀN ĐỀ, phải xanh trước khi đọc (2); nếu (0) đỏ thì (2) không mang ý nghĩa.

(1) `bun run --filter './packages/coding-agent' --filter './packages/tui' --if-present check:types` — thay cho `bun run check:ts`, vì `check:ts` còn chạy `check:tools` tức `oxlint .` và `oxfmt --check` trên toàn bộ cây mọi package (`oxfmt --check` báo 5445 file) nên đỏ được bởi bất kỳ file nào không liên quan. Nửa này thực sự đỏ: thêm `registerSetting` vào `ExtensionAPI` mà không cài trên `ConcreteExtensionAPI` là lỗi biên dịch, vì class được khai `implements ExtensionAPI` (loader.ts:179); kiểu trả về `SettingDefinition` lệch cũng vậy.

(2) `cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts` — nếu báo `0 pass / 1 fail / 1 error` kèm `Failed to load pi_natives native addon for darwin-arm64` thì đó là (0), KHÔNG phải hồi quy của bạn (đã tái kiểm chứng trên một file test có sẵn: `test/config/settings-registry.test.ts`). Cả năm dòng test đều fail trên HEAD theo cấu thức: dòng 1 và dòng 2 gọi `pi.registerSetting`, vốn chưa tồn tại, nên file thậm chí không type-check. Dòng 1, 2 và 4 còn chạy được NGAY CẢ khi không có extension loader (chúng đi thẳng qua `register`/`lookup`/`Setting.provenance` với một `Settings` tạm), nên một khi addon được build, chúng không cần session, không cần TUI và không cần fixture trên đĩa.

Cổng này có thực sự đỏ được không: **Có, nhưng phải nói thẳng ranh giới.** Nửa type-check thực sự đỏ — thêm `registerSetting` vào `ExtensionAPI` mà không cài trên `ConcreteExtensionAPI` là lỗi biên dịch, và kiểu trả về `SettingDefinition` lệch cũng vậy. Nó SẼ KHÔNG bắt được ba thứ thực sự làm hỏng người dùng: một id không có namespace, một key đã đăng ký mà panel không bao giờ render, và một bản cài quên `unregisterOwned` (thứ ba chỉ lộ ra ở dòng test 5, vì không gì trong cây lệnh type-check gọi tới nó). Hai thứ đầu hoàn toàn do dòng test 1, 3 và 4 gánh, mà dòng 3 không thể viết cho tới khi M2-OQ4 có câu trả lời. Nói cách khác, cổng có thật nhưng chưa phải toàn bộ cổng, và dòng panel là thứ duy nhất đứng giữa mục này và thất bại "âm thầm và vĩnh viễn" mà plan đã gọi tên.

### Phụ thuộc

- **WI-8a** — tiền đề cứng, không phải cải thiện. Chất nền có namespace phải tồn tại trước: `registerOwned` từ chối id trần, và một key của extension không có namespace sẽ đụng id lõi qua một so sánh chuỗi thuần ở registry.ts:787. Plan nói rõ đây là điều kiện tiên quyết, và tài liệu này xác nhận: hôm nay không có owner, không có cưỡng chế namespace, và không có cách gỡ một key.
- **M2-OQ4** — quyết định vị trí trên panel. Không phải phụ thuộc code nhưng là phụ thuộc chặn: bước 5-7 và dòng test 3 không thi triển khai được cho tới khi nó có câu trả lời, và trả lời nó sau khi đã mở API chính là thất bại "âm thầm và vĩnh viễn" mà plan gọi tên.

**Chặn:**

- **WI-9 (real unload seam)** — không hoàn thành nổi bảng kiểm kê 11 bucket của nó nếu các setting do extension đăng ký không phải là một bucket nhận diện được và gỡ được. WI-8b góp phần bucket, WI-9 quét nó.
- **M2-OQ8 (per-extension state substrate, WI-11)** — một câu trả lời đã chốt ở đây (overlay nằm trong `Settings` hay một kho riêng) quyết định state của WI-11 nằm cạnh các key này hay trong một kho thứ hai.

### Cách sai dễ nhất

Lỗi chi phối là lỗi âm thầm và vĩnh viễn, đúng như plan nói: mở `registerSetting` trong khi panel vẫn không hiện được key, và tác giả extension không nhận được lỗi nào, người dùng không có UI nào, không có gì trong CI đỏ. Lỗi thứ hai là bỏ qua namespacing — một extension id trùng với một core id sẽ ném ngay trong lúc load chính extension đó, và message hiện tại (`Setting "X" is registered twice`, registry.ts:787) chỉ nêu id, nên tác giả không bao giờ tìm ra nguyên nhân thật. Lỗi thứ ba, mà plan không nêu tên: `register()` nối thêm vào `byId`/`ordered` ở module level (registry.ts:778-779) mà KHÔNG có unregister, nên một extension bị tắt rồi bật lại trong cùng một process sẽ ném "registered twice" ở lần bật thứ hai, và `orderedSettings()` memoize kết quả của nó mãi mãi (all-settings.ts:85-89) nên nó còn không thấy nổi một setting được đăng ký sau lần gọi đầu tiên.

### Cần người quyết

- **M2-OQ4 — một key của extension render ở đâu?** Ba phương án trong plan (panel data-driven / dưới tab Plugins sẵn có / một tab động). HÃY QUYẾT, ĐỪNG KHÁM PHÁ BẰNG CODE. Hai ràng buộc đã kiểm chứng thu hẹp lựa chọn: `SettingTab` là union đóng gồm mười literal (settings-defs.ts:4-15) và `TAB_GROUPS` là một record tĩnh (:52-88), nên "một tab động cho mỗi extension" đòi phải đổi cả hai; và tab Plugins hiện có là một bề mặt PLUGIN (npm/marketplace) dựng từ `plugin-settings.ts` với `PluginSettingsHost` riêng, không phải bề mặt extension — đặt key của extension vào đó là gộp hai thứ khác nhau dưới một tab. GĐ6 đúng khi nói quyết định này phải phủ luôn phần tìm kiếm dựa trên schema ở settings-selector.ts:848-860, không chỉ danh sách tab ở :431-440.
- **Điều gì tạo ra một slug namespace ổn định cho một extension?** `Extension.path` là đường dẫn người dùng gõ và KHÔNG ổn định — `omp --extension /abs/path` và một entry config viết nó khác đi. `Extension.resolvedPath` chỉ là đường dẫn tuyệt đối trên đường `loadExtensions` (đặt ở loader.ts:417 qua `resolvePath(extensionPath, cwd)`). Trên `loadExtensionFromFactory` nó BẰNG đúng `name` (loader.ts:471, `createExtension(name, name)`), và mẫu test mà bước 9 bảo chép truyền vào một tên package (`"pi-fabric@0.92.4"`), không phải một đường dẫn. Nghĩa là `resolvedPath` ổn định trên đường file thật nhưng KHÔNG phải đường dẫn tuyệt đối nói chung — hai extension nạp bằng `loadExtensionFromFactory` với cùng một `name` (kể cả mặc định `"<inline>"`) sẽ có cùng owner, và nhánh idempotent sẽ âm thầm trả handle của extension thứ nhất. Đó là failure last-writer-wins ngược, và dòng test 1 không bắt được. Đây là một lý do nữa để không chốt owner theo resolvedPath. Dù vậy, nhúng một đường dẫn máy-local vào một config key tồn tại lâu trong settings file dùng chung vẫn tệ cho một project config được commit. Không có trường manifest nào trên `Extension` (types.ts:1802-1817) để treo id do tác giả khai. NHƯNG codebase ĐÃ có họ id-derivation: `git grep -nE 'extensionId|slugExtension|normalizeExtensionId' -- packages/` trả 33 kết quả (đã đếm), và `git grep -n toExtensionId -- packages/` chỉ ra đúng khuôn mẫu cần nằm ở `capability/extension-module.ts:28` — ``toExtensionId: ext => `extension-module:${ext.name}` ``, khai trong interface `Capability.toExtensionId` (`capability/types.ts:204`) và tiêu thụ ở `capability/index.ts:192-193` để lọc theo `disabledExtensionIds`. Đọc `capability/extension-module.ts` TRƯỚC khi chọn giữa ba phương án; nếu vẫn chọn manifest id thì nêu vì sao không theo. Marketplace có `buildPluginId(name, marketplace)` tại `extensibility/plugins/marketplace/types.ts:29` làm khuôn mẫu hình dạng, nhưng plugin có id từ manifest còn extension thì không. Một người phải chọn: manifest id do tác giả khai, hash của resolved-path, hay basename. Đừng tự bịa ra.
- **Biến môi trường cho một key của extension nên do tác giả chọn hay tự suy ra?** WI-8a đã chốt điều này cho plugin (`OMP_<PLUGIN_ID>_<KEY>`, viết hoa, `-`/`.` → `_`, khai tường minh trong `SettingDefinition.env`, không bao giờ tự sinh) và đã kiểm chứng lớp đó là opt-in ở registry.ts:476-480. WI-8b nên thừa hưởng nguyên vẹn quyết định đó thay vì suy ra lại — nhưng hãy xác nhận WI-8a thực sự đã đưa nó vào đúng dạng trước khi cài theo.
- **Đăng ký lại cùng key bởi cùng owner nên là no-op im lặng hay ném lỗi?** Tài liệu này chọn no-op, vì `bindPreparedExtensions` (loader.ts:491-520) rebind một extension đã prepare cho một session con và chạy lại factory, và đó là một hợp đồng đã được test (`test/extension-prepared-rebind.test.ts`). Nhưng no-op lặng lẽ che mất một khai báo trùng thật bên trong một extension. Một người có thể thích ném lỗi ở lần khai thứ hai trong cùng một bind, với một đường phát hiện rebind riêng; plan không đề cập tới chuyện này.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/types.ts:1231-1557` là span chính xác của `ExtensionAPI`. | stale-anchor | Interface thật ra span :1256-1582. `export interface ExtensionAPI` ở :1256, dấu ngoặc đóng ở :1582, khai báo top-level kế tiếp (`export interface ProviderConfig`) ở :1589. Cả hai đầu của khoảng của plan lệch đúng 25 dòng. Con số 29 method của plan là ĐÚNG và giữ nguyên 29 — đã liệt kê các tên method khác nhau có tab đầu trong khoảng 1256-1582 và ra đúng 29; mục này đưa nó lên 30. |
| `packages/tui/src/overlays/settings-selector.ts:435` là danh sách tab cố định kèm tab Plugins riêng (và §7 GĐ6 trích `:847-853` cho bề mặt tìm kiếm dựa trên schema). | stale-anchor | Lệch vài dòng ở cả hai nơi. `getSettingsTabs()` là :431-440 và entry tab `plugins` nằm ở :438; dòng :435 là `const icon = theme.symbol(meta.icon);` bên trong callback `SETTING_TABS.map`. Về phía tìm kiếm, vòng `for (const id of SETTING_TABS)` là :848-853, comment "Plugins hosts its own UI" ở :854, và lệnh push entry plugins bị làm mờ là :855-860. Phần chất của GĐ6 là đúng — cả hai bề mặt phải được quyết cùng nhau — chỉ có số dòng là dịch chuyển. |
| Blocker 3 và 4 là hai chuyện tách biệt: (3) thứ tự panel là thứ tự khai báo bên trong một domain, nên một domain động không có chỗ; (4) panel là danh sách tab cố định với tab Plugins riêng. | incomplete — cả hai là một vấn đề gắn liền, và plan bỏ mất ràng buộc quyết định giữa các phương án | Từ vựng định vị của panel là một union ĐÓNG, không chỉ là một danh sách cố định. `SettingTab` trong `packages/tui/src/overlays/settings-defs.ts:4-15` đúng bằng mười literal; `TAB_GROUPS` ở :52-88 là `Record<SettingTab, readonly string[]>` tĩnh; `UiBase` ở :97-111 đòi `tab: SettingTab` và một `group` phải có sẵn trong `TAB_GROUPS[tab]`. Và `createSettingsHost()` (`config/settings-ui.ts:51-68`) dựng panel bằng cách duyệt `SETTING_TABS` và giữ entry có `ui?.tab === tab` (:53-56). Nên một key của extension chỉ có thể rơi vào một trong mười tab sẵn có, và phương án thứ ba của M2-OQ4 — một tab động cho mỗi extension — không biểu đạt được nếu không đổi cả union lẫn record. Quyết 3 và 4 tách riêng như plan trình bày thì dễ chọn một phương án hoá ra không biểu đạt được. |
| `config/registry.ts:783-792` là `register` với throw trùng id; ghi chú duy nhất về trạng thái module chính là throw đó. | stale-anchor cộng thêm một blocker bị bỏ sót | `register` ở :786 và throw ở :787 (:783 của plan là một dòng JSDoc, :792 là dấu ngoặc đóng). Blocker bị bỏ sót: `byId` (:778) và `ordered` (:779) ở module level và CHỈ NỐI THÊM — `registry.ts` không có `unregister` nào (đã kiểm chứng: `git grep -n unregister -- packages/coding-agent/src/config/` trả 7 kết quả, tất cả ở `model-registry.ts` cho provider/API/OAuth, không kết quả nào ở `registry.ts`). Một extension bị tắt rồi bật lại trong cùng một process vì thế sẽ ném "registered twice" ở lần bật thứ hai, và key của nó không với tới được nữa suốt vòng đời process. WI-8b phải thêm một unregister theo phạm vi owner, và khuôn mẫu hình dạng cho nó đã có sẵn trong cùng package: `clearSourceRegistrations(sourceId)` ở `config/model-registry.ts:2914` và `syncExtensionSources(activeSourceIds)` ở :2955 làm đúng điều đó cho provider. Đây cũng chính là thứ biến bảng kiểm kê 11 bucket unload của WI-9 từ bất khả thi thành khả thi. |
| `orderedSettings()` liệt kê setting theo thứ tự domain rồi thứ tự khai báo; một domain động không có chỗ trong panel (blocker 3). | incomplete — có một lỗi thứ hai, sắc hơn, mà plan không nêu tên | Có hai khiếm khác, không phải một. (a) `all-settings.ts:85-89` memoize `ordered` trong một `let` module-level KHÔNG có invalidation, nên bất kỳ setting nào đăng ký sau lần gọi `orderedSettings()` đầu tiên sẽ vô hình mãi mãi — bất kể đặt ở đâu trên panel. (b) `domainHandles` (:92-106) chỉ duyệt các giá trị tới được từ 33 entry tĩnh `DOMAINS`, nên một handle của extension CÓ trong `registry.all()` bị rơi lặng lẽ. Plan mô tả (b) là "không có chỗ trong panel"; (a) tệ hơn vì nó phụ thuộc thứ tự và sẽ không lộ ra trong một test tình cờ đăng ký trước lần gọi đầu tiên. |
| Một dòng test khẳng định id trùng sinh ra lỗi được báo cho tác giả extension sẽ fail trên HEAD vì "hôm nay loader không có nghĩa vụ truyền tiếp nó". | wrong in detail — loader ĐÃ truyền tiếp; thứ thiếu là một message nêu đích danh chỗ trùng | Loader CÓ báo lỗi factory. `runExtensionFactory` (loader.ts:397-414) ném lại, `bindExtension` (:438-459) bắt và trả `Failed to load extension: <message>` ở :457, và `bindPreparedExtensions` (:491-520) gom những lỗi đó vào `LoadExtensionsResult.errors` (:497-505), mà `formatExtensionLoadNotifications` (`load-errors.ts`) kết xuất cho người dùng. Nên đường truyền tiếp đã có và không cần việc gì. Lỗ hổng thật là message hiện tại là `Setting "X" is registered twice` — nó nêu id nhưng không nêu owner và không nêu quy tắc namespace, đúng cái compatibility gate của GĐ6. Hệ quả cho thiết kế test rõ ràng và dễ làm sai: hãy khẳng định chỗ trùng qua `loadExtensions`/`bindPreparedExtensions` và đọc `result.errors`, KHÔNG qua `loadExtensionFromFactory` (:464-475), vì hàm sau ném lại ở :473 và không bao giờ điền vào `errors`. |
| `pi.registerSetting` được thêm như method thứ 30 trên `ExtensionAPI`, và wiring của `ConcreteExtensionAPI` theo mẫu của các method đăng ký sẵn có. | đúng, kèm một tiết kiệm công đáng biết | Đã xác nhận, và tốt hơn plan tưởng: KHÔNG cần wiring nào. Constructor của `ConcreteExtensionAPI` (loader.ts:191-208) duyệt `ConcreteExtensionAPI.prototype` và bind lại mọi method lên instance, và comment ở :198-200 nói thẳng điều đó ("Walk the prototype rather than listing methods: a new method is bound without touching this"). Class được khai `implements ExtensionAPI, IExtensionRuntime` (:179), nên bỏ sót phần cài là lỗi biên dịch — đó là thứ làm cho nửa `check:ts` của cổng có thật chứ không trang trí. Khuôn mẫu anh em tốt nhất không phải `registerFlag` (:259-267) mà là `registerComposerShape` (:277-289), vốn đã validate id và ném typed error trước khi mutate bất kỳ trạng thái nào. |
| Xác minh là `bun run check:ts && (cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts)`. | đúng như đã viết, nhưng nửa sau bị chặn trong môi trường này — nói ra trước khi giao | `bun run check:ts` chạy và pass trên HEAD 808b365 (đã kiểm chứng: cả 15 package đều báo Done). `bun test` thì KHÔNG: chạy một test có sẵn trong thư mục đó báo `0 pass / 1 fail / 1 error` kèm `Failed to load pi_natives native addon for darwin-arm64` và chỉ về `bun --cwd=packages/natives run build`. Nên cả năm dòng test không thi hành được cho tới khi addon được build. Điều này không làm suy yếu công việc — dòng 1, 2 và 4 không cần loader, không cần session, không cần fixture trên đĩa — nhưng người nhận việc phải biết cổng chỉ chạy được một nửa hôm nay, và không nên đọc một lỗi `bun test` là hồi quy do thay đổi của chính họ. |
| WI-8b chỉ phụ thuộc WI-8a; WI-7 không phải phụ thuộc vì không file nào trên đường `registerSetting` biết mode. | confirmed | Đã kiểm chứng độc lập. Không gì trên đường đi nào đọc mode: `registry.ts:786-792` chỉ là sổ sách id thuần, `all-settings.ts:43-77` là danh sách import tĩnh, và danh sách tab của panel là `settings-selector.ts:431-440` cộng `settings-defs.ts:20`. Tiền đề thật sự mà plan đánh giá thấp là M2-OQ4, không phải code nhưng chặn thẳng bước 5-7 và dòng test 3. |

## Cần người xác nhận

Ba điểm tự mâu thuẫn trong chính đặc tả, ghi lại chứ không tự sửa:

- **Cổng hoàn thành đòi file test năm dòng, nhưng dòng 3 thì bị chặn.** `gate` yêu cầu `cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts` chạy qua, trong khi `test_contract` và bước 9 đều nói dòng 3 (present in the panel) không viết được cho tới khi M2-OQ4 có câu trả lời. Cần chốt: hoãn toàn bộ gate phần test cho tới khi M2-OQ4 xong, hay chấp nhận một phiên bản file tạm bốn dòng rồi bổ sung dòng 3 ở đợt sau.
- **`code_shape` không biên dịch được như viết.** Khối `ConcreteExtensionAPI.registerSetting` gọi `ownerByIdOf(definition.id)`, một hàm không xuất hiện ở bất kỳ đâu trong đặc tả, trong khi `ownerById` ở khối `registry.ts` được khai báo là `const` module-level không export; `EXTENSION_ID_PREFIX` cũng vậy. Cần chốt: export một accessor (ví dụ một hàm đọc owner theo id), hay để `registerOwned` trả kèm owner để loader tự theo dõi.
- **Cách hiểu dòng test 1 và 2 không thống nhất giữa `gate` và bước 9.** `gate` viết rằng dòng 1 và dòng 2 gọi `pi.registerSetting` nên file không type-check trên HEAD; bước 9 lại viết rằng dòng 1, 2 và 4 không cần loader và gọi thẳng `register`/`registerOwned`/`lookup`. Hai cách cho hai kết luận khác nhau về việc dòng 2 có thực sự chạm mặt cung API công khai hay không — điều này quyết định test có bắt được hồi quy ở tầng API hay chỉ ở tầng registry.


---


## WI-9. Seam unload, khác hẳn suspend — thêm `ExtensionRunner.unloadExtension()` gỡ một extension khỏi registry và giải phóng đúng các bucket riêng của nó cùng trampoline fallback riêng của nó

**Thay đổi gì:** Thêm một đường unload thật cho extension: hôm nay "disable" chỉ *suspend* (extension vẫn giữ module state, các bucket đăng ký riêng và các trampoline fallback đã cài), nên ta thêm `ExtensionRunner.unloadExtension(path)` gỡ extension khỏi registry của runner, dispose đúng các trampoline file-write/file-delete của riêng extension đó, và xoá các giá trị runtime flag của nó — cố ý khác `setSuspendedExtensions`, vốn giữ state có chủ đích để resume không phải đấu lại dây.

**Wave:** Wave 7 (vị trí cuối, sau WI-8a và WI-8b). Wave 7 là "Sở hữu của settings và seam unload thật", M–L, ~2.5 tuần, 4 PR. Kế hoạch đặt WI-9 cuối M2 vì bản kiểm kê tài nguyên mà nó khẳng định chỉ hoàn tất sau khi wave 2 và wave 4 đã trao quyền sở hữu cho timer, provider và capability state.

**Effort:** M — lớn hơn vẻ ngoài. Bản thân phần teardown bucket chỉ ~20 dòng; hai tiền đề (giá trị flag theo từng extension, disposer fallback theo từng extension) mới là việc thật, và ma trận test có 15 dòng vì AGENTS.md đòi mỗi dòng một hợp đồng khác nhau.

**Người dùng thấy:** chưa có — nội bộ, người dùng không thấy. Chưa có API nào hướng về extension được phơi bày; kế hoạch cấm rõ ràng việc đưa `unloadExtension` lên `ExtensionAPI` cho tới khi nó đã được chạy qua cả 11 bucket. Hệ quả người dùng thấy chỉ tới khi một milestone sau (WI-12, thiết kế hoãn lại) nối unload vào một cử chỉ thật của người dùng; lúc đó việc vô hiệu hóa một extension sẽ dừng timer nền của nó và dừng fallback file-write của nó khỏi chặn các lần ghi bị từ chối quyền, thay vì chỉ tạm dừng chúng.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | **PREREQ 1:** `#fileFallbackDisposers` (khai báo field, dòng 537) đổi từ `Array<() => void>` thành `Map<string, Array<() => void>>` khóa theo `ext.path`; hai chỗ push (dòng 778, 797) ghi vào bucket của extension đó. `disposeFileFallbacks()` (dòng 1346) rút hết mọi bucket rồi clear, giữ nguyên hành vi của hai đường teardown (shutdown phiên ở dòng 410 và re-initialize ở dòng 747). **Mới:** `unloadExtension(extensionPath): boolean`, đặt ngay sau `setSuspendedExtensions` (kết thúc ở dòng 970), giải phóng trampoline, các bucket, mục trong `#suspendedExtensions`, mục trong `#loadOrder`, managed timer và đăng ký provider, và mục `flagValues` theo từng extension. **PREREQ 3:** `getFlagValues()` (dòng 1094) flatten theo `this.extensions` thay vì copy map runtime. `setFlagValue` (dòng 1098) để ngỏ chờ câu hỏi mở. | Có (verified=true; mọi số dòng đã xác nhận bằng `git grep` và `awk` đánh số trên HEAD 808b365) |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | **PREREQ 3:** dòng 101 `flagValues = new Map<string, boolean \| string>()` thành map lồng theo từng extension. Dòng 184 `readonly flagValues = new Map<string, boolean \| string>()` trên `ConcreteExtensionAPI` là **chết** — không ai đọc hay ghi; xoá nó. Dòng 265 `this.runtime.flagValues.set(name, options.default)` thành get-or-create trên map trong, khóa `this.extension.path`. Dòng 293 `return this.runtime.flagValues.get(name)` thành `this.runtime.flagValues.get(this.extension.path)?.get(name)`. | Có (verified=true; 101, 184, 223, 263, 265, 291-294 đều khớp chính xác trên HEAD 808b365) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Dòng 1739, trên `interface ExtensionRuntimeState` (khai báo ở dòng 1738): `flagValues: Map<string, boolean \| string>` thành `Map<string, Map<string, boolean \| string>>` — khóa ngoài là extension path, — KHÔNG lấy `unregisterProvider` ở dòng 1745 làm tiền lệ: chữ ký ở đó có `sourceId` nhưng cả hai
  hiện thực đều bỏ qua nó (xem hàng `WRONG PREMISE` trong bảng đính chính bên dưới). Các bucket trên `interface Extension` (dòng 1801-1817) **không** sửa — không cần đổi hình dạng, đây chính là luận điểm trung tâm (và đúng) của kế hoạch. | Có (verified=true; số dòng của plan sai, xem bảng đính chính) |
| `packages/coding-agent/src/main.ts` | sửa | Dòng 2210, bên trong literal `extensionFlagSink` (2207-2212), ghi `extensionsResult.runtime.flagValues.set(name, value)` trực tiếp, bỏ qua runner hoàn toàn. Đây là writer thứ ba và khó nhận ra nhất của map khóa theo tên, và **phải** được di cùng đổi hình dạng nếu không sẽ không typecheck. Dòng 543-544 (`setFlagValue: (name, value) => { runner.setFlagValue(name, value); }`) là writer thứ tư. | Có (verified=true; không được kế hoạch nhắc tới, tìm ra bằng `git grep '\.flagValues' -- packages/coding-agent/src`) |
| `packages/coding-agent/test/extension-unload.test.ts` | tạo | 15 dòng: một bảng 11 dòng (mỗi dòng một bucket) cộng các dòng (a) file-write seam, (b) shared flag name, (c) toolRegistrationListener, cộng một dòng BASELINE có nhãn khẳng định rằng một runner không có extension nào đăng ký fallback thì không cài trampoline nào. | Có (verified=true; xác nhận vắng mặt trên HEAD) |

### Các bước

1. Đổi `flagValues` trên `ExtensionRuntimeState` (`types.ts:1739`) và trên class `ExtensionRuntime` (`loader.ts:101`) từ `Map<string, boolean | string>` thành `Map<string, Map<string, boolean | string>>`, khóa ngoài là extension path. KHÔNG lấy `unregisterProvider(name, sourceId)` ở `types.ts:1745` làm tiền lệ để phản chiếu: chữ ký có `sourceId`
nhưng hiện thực thì không — `loader.ts:108` lọc theo `registration.name !== name`, và `runner.ts:713` rebind
thành `name => this.modelRegistry.unregisterProvider(name)`, bỏ mất `sourceId`. Đây là shape change đầu tiên
gắn sở hữu theo extension path trên `ExtensionRuntimeState`. **KHÔNG** đụng 11 bucket trên `interface Extension` (`types.ts:1801-1817`): chúng đã là per-extension và không cần đổi hình dạng.
   Neo: `packages/coding-agent/src/extensibility/extensions/types.ts:1739`
2. Xoá `readonly flagValues = new Map<string, boolean | string>()` chết trên `ConcreteExtensionAPI` (`loader.ts:184`). Nó chỉ tồn tại để thoả `implements IExtensionRuntime` ở dòng 179; không ai đọc hay ghi — mọi truy cập `.flagValues` trong cả package đều đi qua `this.runtime`. Việc bỏ nó là điều khiến bước 1 trở thành một đổi hình dạng thật sự thay vì hai map song song.
   Neo: `packages/coding-agent/src/extensibility/extensions/loader.ts:184`
3. Viết lại chỗ ghi của `registerFlag` (`loader.ts:265`) thành get-or-create map trong dưới `this.extension.path` trước khi set default. Giữ nguyên guard `options.default !== undefined` ở dòng 264 — một flag không có default vẫn không được tạo entry trong map trong.
   Neo: `packages/coding-agent/src/extensibility/extensions/loader.ts:259-267`
4. Viết lại `getFlag` (`loader.ts:291-294`) sao cho gate per-extension sẵn có `if (!this.extension.flags.has(name)) return undefined;` **ở nguyên**, chỉ phần đọc giá trị mới thành `this.runtime.flagValues.get(this.extension.path)?.get(name)`. Gate vốn đã là per-extension; đây là thứ chặn hai extension chia sẻ tên flag đọc lẫn giá trị của nhau.
   Neo: `packages/coding-agent/src/extensibility/extensions/loader.ts:291-294`
5. Chuyển `#fileFallbackDisposers` từ `Array<() => void>` thành `Map<string, Array<() => void>>` khóa theo `ext.path`, và cập nhật hai chỗ push trong `initialize()` để append vào bucket của extension đó. Không có bước này thì không cách nào diễn đạt "disposer của extension đó" — kế hoạch đòi unload chỉ tiêu đúng trampoline của một extension và không bao giờ toàn bộ danh sách.
   Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:537, 778, 797`
6. Viết lại `disposeFileFallbacks()` để rút hết mọi bucket rồi clear map, sao cho hai đường teardown sẵn có — shutdown phiên (dòng 410) và guard re-initialize (dòng 747) — hành xử **y hệt** hiện nay. Đây là bước thuần refactor: chạy `bun run check:ts` và xác nhận không có gì downstream của đổi hình dạng vỡ trước khi thêm bất kỳ hành vi mới nào.
   Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:1346-1348`
7. Viết lại `getFlagValues()` (`runner.ts:1094-1096`) để flatten theo `this.extensions` theo thứ tự load, last-writer-wins **chỉ ở mặt đọc**. Đây chính là quyết định kế hoạch ghim: hai extension khai báo cùng tên flag không còn ghi đè lên nhau ở mặt sở hữu, nhưng một lần đọc "flag này là gì" vẫn trả về **một** giá trị và extension khai báo sau thắng. Sở hữu vẫn chính xác; thứ tự ưu tiên trở thành chuyện của thời điểm đọc.
   Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:1094-1096`
8. Di cùng hai writer còn lại của map phẳng cũ: `main.ts:2210` (`extensionsResult.runtime.flagValues.set(name, value)`) và `main.ts:543-544`. Bước 7 sẽ không typecheck nếu thiếu bước này — đừng để `bun check` tự phát hiện. Phân giải `setFlagValue` (`runner.ts:1098`) theo quyết định trong *Cần người quyết* **trước khi** viết dòng (b) của test, vì một `--flag=value` do người dùng cung cấp không được lặng lẽ biến mất khi unload.
   Neo: `packages/coding-agent/src/main.ts:2207-2212`
9. Viết `unloadExtension(extensionPath: string): boolean` ngay sau `setSuspendedExtensions`. Thứ tự bên trong thân hàm có ý nghĩa: bắt object `Extension` **trước khi** splice; gỡ khỏi **cả** `this.extensions` **và** `#loadOrder` (chỉ xoá khỏi `this.extensions` là bug — `initialize()` cài lại trampoline cho `getLoadedExtensions()`, mà nó là `#loadOrder ?? this.extensions`, nên một lần re-initialize sẽ hồi sinh trampoline cho một extension không còn tồn tại); gỡ khỏi `#suspendedExtensions`; dispose trampoline fallback của nó; gọi `this.#managedTimers.clearExtension(path)` và `this.runtime.unregisterProvider(path, path)` (cả hai đến từ WI-1 — nếu thiếu bất kỳ cái nào, mục này chưa được mở khóa); xoá entry `flagValues` của path đó; rồi clear cả 11 bucket trên object `Extension`. Trả `false` khi path lạ, để double-unload là no-op chứ không phải throw.
   Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:970`
10. **KHÔNG** phơi `unloadExtension` lên `ExtensionAPI`. Nó ở lại mức runner cho tới khi đã được chạy qua cả 11 bucket. Ngoài ra: đừng thử cách diễn đạt `DisposableList` mà báo cáo dsh đã bác — nó biến 9 phương thức đăng ký thành phương thức trả về effect. Các bucket per-extension **CHÍNH LÀ** sổ sở hữu; chỉ có tài nguyên toàn-runner là thiếu, và bước 1 cùng bước 5 đóng đúng khoảng trống đó.
    Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:947`
11. Tạo `packages/coding-agent/test/extension-unload.test.ts` trên harness của `extensions-runner.test.ts` (`TempDir` + `getProjectAgentDir(tempDir.path())/extensions` + file extension `.ts` thật + `loadExtensions` + `new ExtensionRunner`). Viết bảng bucket 11 dòng trước, mỗi dòng một hợp đồng, rồi mới viết ba dòng ngoài bảng. Trước khi tick bất kỳ dòng nào, phải nói được mutation nào làm nó đỏ — một dòng không trả lời được câu đó thì không phải là một dòng test.
    Neo: `packages/coding-agent/test/extension-unload.test.ts`
12. Chạy `bun run check:ts` (đã xác nhận xanh trên HEAD 808b365 — 16 package đều Done). `bun test` bị **CHẶN** trên máy này: native addon chưa build, nên mọi file test báo 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64` (đã xác nhận bằng cách chạy `test/extension-flag-dispatch.test.ts`). Vẫn phải viết file test, nhưng đừng tuyên bố gate đã đạt cho tới khi addon được build và file thực sự chạy.
    Neo: `package.json:94`

### Hình dạng code

```typescript
// packages/coding-agent/src/extensibility/extensions/runner.ts
// PREREQUISITE 1 — index the fallback disposers by extension so unload can consume
// exactly its own. Today it is a flat, unkeyed array, so "that extension's
// disposer" is not expressible.
-#fileFallbackDisposers: Array<() => void> = [];
+#fileFallbackDisposers = new Map<string, Array<() => void>>();

// in initialize(), the two push sites (runner.ts:778 and runner.ts:797) become:
//   const bucket = this.#fileFallbackDisposers.get(ext.path) ?? [];
//   bucket.push(addFileWriteFallback(async req => { /* unchanged closure */ }));
//   this.#fileFallbackDisposers.set(ext.path, bucket);

// disposeFileFallbacks() must drain EVERY bucket so the two existing teardown
// paths (runner.ts:410 session shutdown, runner.ts:747 re-initialize) are
// behaviorally identical to today.
disposeFileFallbacks(): void {
-	for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();
+	for (const disposers of this.#fileFallbackDisposers.values()) {
+		for (const dispose of disposers) dispose();
+	}
+	this.#fileFallbackDisposers.clear();
}

// PREREQUISITE 2 — the new method. Note the order: capture the Extension
// BEFORE splicing, dispose trampolines BEFORE clearing handler arrays, and
// remove from #loadOrder (not just this.extensions) or a later initialize()
// re-installs the unloaded extension's trampolines at runner.ts:749.
unloadExtension(extensionPath: string): boolean {
-	// ...
+	const liveIndex = this.extensions.findIndex(ext => ext.path === extensionPath);
+	const orderIndex = this.#loadOrder?.findIndex(ext => ext.path === extensionPath) ?? -1;
+	if (liveIndex === -1 && orderIndex === -1) return false;
+	const extension = liveIndex === -1 ? this.#loadOrder![orderIndex] : this.extensions[liveIndex];
+	if (liveIndex !== -1) this.extensions.splice(liveIndex, 1);
+	if (this.#loadOrder && orderIndex !== -1) this.#loadOrder.splice(orderIndex, 1);
+	this.#suspendedExtensions.delete(extension);
+	for (const dispose of this.#fileFallbackDisposers.get(extensionPath) ?? []) dispose();
+	this.#fileFallbackDisposers.delete(extensionPath);
+	this.#managedTimers.clearExtension(extensionPath);            // WI-1, not yet present
+	// WI-1 provider half — CHƯA tồn tại trên HEAD 808b365. Cả loader.ts:108 và runner.ts:713
+	// đều bỏ qua sourceId, nên (extensionPath, extensionPath) sẽ gọi
+	// modelRegistry.unregisterProvider(<đường dẫn file>) — không khớp provider nào, và provider mà
+	// extension đăng ký vẫn nằm lại. Cần unregisterProvidersForSource(sourceId) thật, xem "Cần người quyết".
+	this.runtime.flagValues.delete(extensionPath);                 // new shape
+	extension.handlers.clear();
+	extension.tools.clear();
+	extension.toolRegistrationListeners?.clear();
+	extension.assistantThinkingRenderers.length = 0;
+	extension.fileWriteFallbackHandlers.length = 0;
+	extension.fileDeleteFallbackHandlers.length = 0;
+	extension.messageRenderers.clear();
+	extension.composerShapes.clear();
+	extension.commands.clear();
+	extension.flags.clear();
+	extension.shortcuts.clear();
+	return true;
}

// PREREQUISITE 3 — flagValues becomes attributable. types.ts:1739 (ExtensionRuntimeState),
// loader.ts:101 (ExtensionRuntime), loader.ts:184 (dead per-API copy — delete it, and
// drop `implements IExtensionRuntime` compliance with the flat field if nothing else needs it).
- flagValues: Map<string, boolean | string>;
+ flagValues: Map<string, Map<string, boolean | string>>;   // outer key = extension path

// loader.ts:263-266 registerFlag — the write gains attribution it always should have had
this.extension.flags.set(name, { name, extensionPath: this.extension.path, ...options });
if (options.default !== undefined) {
-	this.runtime.flagValues.set(name, options.default);
+	let values = this.runtime.flagValues.get(this.extension.path);
+	if (!values) {
+		values = new Map();
+		this.runtime.flagValues.set(this.extension.path, values);
+	}
+	values.set(name, options.default);
}

// loader.ts:291-294 getFlag — already gated per-extension by this.extension.flags.has(name);
// only the value read becomes per-extension. Two extensions declaring the same name no
// longer overwrite one slot; each owns its own, and last-declaring-wins moves to the read face.
getFlag(name: string): boolean | string | undefined {
	if (!this.extension.flags.has(name)) return undefined;
-	return this.runtime.flagValues.get(name);
+	return this.runtime.flagValues.get(this.extension.path)?.get(name);
}

// runner.ts:1094 getFlagValues() — flatten over this.extensions in load order, so a flag
// declared by several extensions still answers "what is this flag" with ONE value and a
// later-declaring extension wins at the READ face, not at the ownership face.
getFlagValues(): Map<string, boolean | string> {
-	return new Map(this.runtime.flagValues);
+	const flattened = new Map<string, boolean | string>();
+	for (const ext of this.extensions) {
+		for (const [name, value] of this.runtime.flagValues.get(ext.path) ?? []) {
+			flattened.set(name, value);
+		}
+	}
+	return flattened;
}

// runner.ts:1098 setFlagValue — the open question. Do NOT silently widen the inner map to
// every declaring extension without deciding; see open_questions.
```

### Hợp đồng test

File test: `packages/coding-agent/test/extension-unload.test.ts` (file MỚI — không tồn tại trên HEAD; đã xác nhận bằng `ls`, và không có symbol `unloadExtension`/`removeExtension` nào trong `src` hay `test`). Dựng trên harness của `extensions-runner.test.ts:1-97` — `TempDir.createSync('@pi-...-')`, `getProjectAgentDir(tempDir.path())/extensions`, ghi file extension `.ts` thật, `loadExtensions(paths, cwd)`, `new ExtensionRunner(result.extensions, result.runtime, cwd, sessionManager, modelRegistry)`.

Hợp đồng quan sát được: sau khi `ExtensionRunner.unloadExtension(path)` trả `true`, extension đó **không đóng góp gì** cho runner — nó vắng trong `getLoadedExtensions()`/`isExtensionActive`, và cả 11 bucket đăng ký mà nó đã điền đều rỗng — trong khi mọi extension **khác** vẫn chạy, và một giá trị flag do extension còn sống khai báo vẫn đọc được.

Dịch thành "nếu hồi quy, người tiêu dùng thấy …": nếu hồi quy, người dùng vô hiệu hóa lại một extension sẽ thấy **lệnh ma**, **mô tả tool cũ**, **shortcut chết**, **flag trùng lặp**, hoặc một file-write fallback âm thầm làm trung gian lệnh ghi của họ cho một broker mà họ vừa tắt.

15 dòng bảo vệ:

- **11 dòng bucket** — mỗi dòng một hợp đồng, theo AGENTS.md.
- **Dòng (a) — file-write seam**, gồm hai nửa: (i) handler của extension không còn được gọi khi có một lần ghi bị từ chối quyền, và (ii) `hasFileWriteFallback()` trả `false` trở lại. Nửa (ii) là nửa phân biệt, và là dòng **fail** nếu unload rút bucket mà quên disposer của trampoline.
- **Dòng (b) — hai extension khai báo cùng tên flag với default khác nhau**: unload một cái, giá trị đọc được phải là default của extension **CÒN LẠI** — không phải `undefined`, không phải giá trị của extension đã bị unload. Đây là dòng duy nhất bắt được bug xoá nhầm entry.
- **Dòng (c)** — listener `onToolRegistered` do extension A đăng ký không bắn khi extension B đăng ký một tool sau khi A đã bị unload.
- **Dòng BASELINE** (có nhãn) — một runner không có extension nào đăng ký fallback thì không cài trampoline nào.

### Xác minh

**Chạy được ngay hôm nay:**

```bash
bun run check:ts
```

(đã chạy trên HEAD 808b365, cả 16 package báo Done, exit 0)

**Chưa chạy được ngay hôm nay** — `bun test` bị chặn vì native addon chưa build, nên `cd packages/coding-agent && bun test test/extension-unload.test.ts test/extensions-runner.test.ts` báo `0 pass, 1 fail` kèm `Failed to load pi_natives native addon for darwin-arm64` trước khi chạy một khẳng định nào. Đã xác nhận bằng cách chạy một file test có sẵn và biết là tốt (`test/extension-flag-dispatch.test.ts`): 0 pass, 1 fail, 1 error.

**Cổng đầy đủ, một khi addon đã build:**

```bash
bun run check:ts && (cd packages/coding-agent && bun test test/extension-unload.test.ts test/extensions-runner.test.ts)
```

với file mới báo **15 pass / 0 fail**.

### Cổng hoàn thành

Cổng này chỉ có thể fail **MỘT PHẦN**, và điều đó phải nói thẳng. `bun run check:ts` thực sự đỏ nếu bỏ sót bất kỳ call site nào của việc đổi hình dạng `flagValues` (có bốn writer, ba cái nằm ngoài `loader.ts`), và nó đỏ nếu `#fileFallbackDisposers` được đánh lại khoá mà không cập nhật `disposeFileFallbacks`. Nhưng `check:ts` **hoàn toàn xanh khi xoá sạch cả 15 dòng test**, nên nó không thể đứng một mình chứng minh hành vi teardown bucket. Cổng phân biệt là dòng (a) nửa (ii) cộng dồng (b): một mutation rút bucket mà bỏ qua disposer trampoline, hoặc xoá nhầm entry `flagValues`, là vô hình với `check:ts` và chỉ bị test bắt — mà test thì không chạy được cho tới khi native addon được build.

DONE đòi **TẤT CẢ** những điều sau:

1. `bun run check:ts` exit 0 — cổng duy nhất thực sự chạy được trên máy này hôm nay, và nó phủ phần di dời type trên bốn file (`types.ts:1739`, `loader.ts:101/184/265/293`, `runner.ts:537/1094`, `main.ts:2210`), tức là nơi một call site bỏ sót sẽ lộ ra.
2. `packages/coding-agent/test/extension-unload.test.ts` tồn tại với đủ 15 dòng, 11 dòng là một-dòng-một-bucket, và mutation phân biệt của từng dòng được viết ra trong file test dưới dạng comment.
3. `bun test test/extension-unload.test.ts` báo **15 pass / 0 fail** — điều này **hiện đang BỊ CHẶN** bởi native addon chưa build và tuyệt đối không được tuyên bố xanh.
4. `grep` xác nhận không còn writer hay reader phẳng nào dạng `.flagValues.set(name, ...)` / `.flagValues.get(name)` bất cứ đâu dưới `packages/coding-agent/src`.

Cần nhấn mạnh: (1) một mình **không** đủ làm bằng chứng hoàn thành — `check:ts` xanh hoàn toàn ngay cả khi xoá cả file test — nên (3) mới là cổng thực sự có thể đỏ trên một cái unload làm dở.

`gate_can_fail: true`.

### Phụ thuộc

- **WI-1 (chặt, CẢ HAI NỬA)** — đừng build unload trước khi suspend đúng, nếu không unload sẽ thừa hưởng timer và provider leak. Đã kiểm chứng: `managed-timers.ts:22-68` `ManagedTimers` là một `Set<Timer>` phẳng, runner-wide, chỉ có `clear(handle)` và `clearAll()`; hôm nay không có sở hữu timer per-extension, nên unload không thể giải phóng timer của một extension cho tới khi WI-1 thêm nó.
- **WI-1 provider half (wave 4) — CHƯA có trên HEAD `808b365`.** `types.ts:1745` chỉ khai *chữ ký* `unregisterProvider(name: string, sourceId: string)`; cả hai
  hiện thực đều bỏ qua `sourceId` — `loader.ts:108` lọc theo `registration.name !== name`, và `runner.ts:713`
  rebind thành `name => this.modelRegistry.unregisterProvider(name)`. `unregisterProvidersForSource` không tồn tại. Vì vậy
  `flagValues` **không** có tiền lệ để phản chiếu: nó là shape change đầu tiên gắn sở hữu theo extension path
  trên `ExtensionRuntimeState`, và WI-1 phải làm provider registry theo cùng cách thì `unloadExtension`
  mới giải phóng được provider. Thiếu nó thì mục này âm thầm rò provider.
- **WI-4 (wave 2)** — để wave 7 có bản kiểm kê tài nguyên đầy đủ cần giải phóng.
- **WI-5 (wave 3 commit 1)** — để bản kiểm kê tài nguyên toàn-runner đầy đủ. Cụ thể `reset()` phải đã là unconditional.

**Chặn:** WI-12 (M2 wave 8, chỉ thiết kế, hoãn lại) — kế hoạch nói WI-12 không thể thiết kế nếu chưa có WI-9.

### Cách sai dễ nhất

Một cái unload nửa vời mà rò rỉ. Extension bị unload một nửa, một nửa đăng ký của nó còn sống sót — khó gỡ lỗi hơn hẳn suspend all-or-nothing của hôm nay, vì nó biến một hạn chế đã biết thành một lời hứa sai. Ba bẫy cụ thể, theo đúng thứ tự kế hoạch nêu:

1. Giá trị runtime của `registerFlag` — không assertion bucket nào nhìn thấy nó.
2. Dispose nhầm trampoline fallback (hoặc không dispose cái nào) — trampoline là một module array phạm vi tiến trình, nên một trampoline rò rỉ vẫn giữ `hasFileWriteFallback()` trả `true` ngay cả sau khi mọi mảng handler đã được rỗng.
3. Bẫy êm nhất — một dòng test viết sai hướng vẫn xanh mà chẳng gate gì.

Trước khi tick bất kỳ dòng nào, hỏi: **mutation nào làm dòng này đỏ?** Một dòng không trả lời được câu đó không phải là một dòng test, dù nó có xanh đến đâu.

### Cần người quyết

Các câu hỏi mở dưới đây đều cần một con người chọn trước khi viết code; không được tự bịa. Trong đó **hai câu đầu chặn việc bắt đầu** vì chúng quyết định hình dạng của `flagValues` và của dòng test (b):

- **Làm sao giá trị flag do CLI cấp sống sót qua việc đổi hình dạng `flagValues`?** `runner.ts:1098 setFlagValue(name, value)` và `main.ts:2210 extensionsResult.runtime.flagValues.set(name, value)` đều là ghi không gắn extension, và `runner.ts:1094 getFlagValues()` trả một `Map<string, boolean|string>` phẳng. Dưới `Map<extensionPath, Map<flagName, value>>` không có chỗ rõ ràng cho một `--flag=value` do người dùng gõ. Hai ứng viên: **(a)** một lớp `flagValueOverrides: Map<string, boolean|string>` riêng, thắng lúc đọc và không bị unload đụng tới; **(b)** `setFlagValue` fan ra mọi extension khai báo và `getFlagValues()` flatten lúc đọc. (a) sạch hơn và nghĩa là một giá trị người dùng đặt vẫn sống sót sau khi unload extension chỉ cung cấp *default* — đúng như người dùng mong. **Một con người phải chọn; đừng tự bịa.**
- ****ĐÃ kiểm chứng, câu trả lời là không.** `getFlagValues()` không có caller nào trong toàn bộ `packages/` — `grep -rn 'getFlagValues' packages/ --include='*.ts'` chỉ ra đúng một dòng, chính khai báo ở `runner.ts:1094`. Nó đã có sẵn một hình dạng phẳng mà không ai tiêu thụ; đổi sang per-extension là miễn phí về mặt call site. Giữ lại như một câu hỏi đã đóng, không phải để trả lời.** `cli/extension-flags.ts:9 ExtensionFlagSink` chỉ cần `getFlags()` và `setFlagValue()`, nên flatten có thể nằm lại bên trong runner — nhưng phải xác nhận không có consumer SDK nào đọc thẳng `runtime.flagValues` trước khi đổi kiểu.

- **Câu thứ ba, chặn việc đóng mục: `unloadExtension` gỡ provider registration theo tên nào?** Tên `name` là do extension tự chọn
  (`pi.registerProvider("anthropic", …)`), nên cặp `(extensionPath, extensionPath)` **không bao giờ khớp** — xem hàng
  `WRONG PREMISE` trong bảng đính chính bên dưới. Cần một trong hai: `unregisterProvidersForSource(sourceId)` thật
  (là deliverable của WI-5 commit 2-3, hiện chưa tồn tại), hoặc duyệt `pendingProviderRegistrations` và `modelRegistry`
  theo `sourceId`. Chọn hướng nào? Đây là câu hỏi duy nhất trong mục này quyết định
  `unloadExtension` có thật sự gải phóng hết hay không.

Còn hai câu nữa không chặn việc bắt đầu nhưng phải trả lời trước khi đóng mục:

- `unloadExtension` nên trả về `Extension` đã gỡ (để caller có thể add lại) hay `boolean`? Kế hoạch không nói gì. `boolean` là bề mặt nhỏ hơn và khớp hình dạng của `isExtensionActive`; trả về object mời lời một đường add-lại mà chưa ai thiết kế.
- Reload (unload + load) có nằm trong phạm vi WI-9 không, hay thuần tuý là unload? Kế hoạch hoãn cache-busting và gọi module cache là follow-up — nhưng xem bảng đính chính: cache-busting **đã tồn tại** và **đã per-load**, nên nếu reload có trong phạm vi thì nó thừa hưởng cơ chế sẵn có miễn phí và follow-up biến mất. Nếu reload không có trong phạm vi, WI-9 thuần tuý là teardown và không có việc gì với module graph.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| `runner.ts:1333` — "cú quét dispose() toàn bộ `#fileFallbackDisposers`; unload phải tiêu đúng disposer của extension đó" | STALE-LINE + MISSING-PREREQUISITE | Cú quét không ở 1333 và không phải một `dispose()` trần. Đó là `disposeFileFallbacks()` ở `runner.ts:1346-1348`, được gọi từ hai nơi: shutdown phiên (`runner.ts:410`) và guard re-initialize (`runner.ts:747`). Quan trọng hơn, yêu cầu của plan **không diễn đạt được** hôm nay: `#fileFallbackDisposers` (`runner.ts:537`) là một `Array<() => void>` phẳng, không gắn với extension nào, nên "disposer của extension đó" không tồn tại. Chuyển nó thành Map khóa theo path là việc bắt buộc **bên trong** WI-9 mà plan không liệt kê thành một bước. |
| (1) "module graph được cache bởi runtime, nên unload thật cần cache-busting" … "coi module cache là follow-up" | **SAI — đã được cài đặt** | Cache-busting không phải follow-up; nó **đã tồn tại** và **đã per-load**. `loadLegacyPiModule` gắn một tag tăng đơn điệu mới vào entry specifier ở mỗi lần import, nên mọi lần load đã nhận một module graph mới. Không có việc cache nào cho WI-9 phải làm. Lời khuyên sequencing "giải quyết bucket teardown trước, coi module cache là follow-up" của plan nhắm vào một vấn đề codebase không hề có. Nếu reload bao giờ có trong phạm vi thì nó thừa hưởng cơ chế này miễn phí; nếu không thì WI-9 thuần tuý là teardown và đoạn về module-graph nên bị xoá khỏi plan. |
| `types.ts:1806-1816` (11 bucket phải giải phóng), `:1783` (toolRegistrationListeners là Set per-extension) | STALE-LINE (lệch ~25) | `interface Extension` ở `types.ts:1801-1817`; `toolRegistrationListeners?: Set<ToolRegistrationListener>` ở dòng **1808**. Con đếm 11 bucket và kết luận "không cần đổi hình dạng" đều **đúng** — chỉ có số sai. (Đếm chuẩn: handlers 1805, tools 1806, toolRegistrationListeners 1808, assistantThinkingRenderers 1809, fileWriteFallbackHandlers 1810, fileDeleteFallbackHandlers 1811, messageRenderers 1812, composerShapes 1813, commands 1814, flags 1815, shortcuts 1816.) |
| `runner.ts:755` (điều kiện cài trampoline) và `:766-771` (bất biến trampoline cần giữ) | STALE-LINE | Skip-guard ở `runner.ts:755`: `if (ext.fileWriteFallbackHandlers.length === 0 && ext.fileDeleteFallbackHandlers.length === 0) continue;`. Các lần cài thật là `addFileWriteFallback(...)` ở 778 và `addFileDeleteFallback(...)` ở 797. Comment bất biến mà plan trỏ tới là khối 750-755. Lập luận baseline-row của plan ("một dòng khẳng định seam rỗng sẽ xanh ngay trên HEAD") vẫn **đúng** và là điểm sắc nhất của mục — giữ lại. |
| `runner.ts:1290-1292` (timer runtime-scoped) | STALE-LINE (lệch ~14) | Bộ ba timer nằm ở `runner.ts:1304-1306` trong `createContext()`: `setInterval`/`setTimeout`/`clearTimer` đều uỷ quyền về cùng một `#managedTimers` runner-wide. Claim nội dung — kho timer là toàn-runner, không có chủ per-extension, đó là lý do WI-1 là tiền đề cứng — là **XÁC NHẬN**: `ManagedTimers` giữ một `Set<Timer>` phẳng và chỉ phơi ra `clear(handle)` và `clearAll()`. Nên unload không thể giải phóng timer của một extension cho tới khi WI-1 thêm sở hữu per-extension. |
| row (b) nói về giá trị runtime của `registerFlag` tại `loader.ts:265` | **THIẾU — thêm ba call site mà plan không bao giờ nhắc** | `flagValues` có **bốn** writer và **một** reader phẳng trên toàn package, và chỉ một cái nằm trong `loader.ts`. Ba cái còn lại hỏng âm thầm dưới đổi hình dạng nếu bỏ sót: `runner.ts:1099 setFlagValue` (không gắn extension — chính là câu hỏi mở), `runner.ts:1095 getFlagValues()` (trả một bản copy phẳng — phải thành flatten theo `this.extensions`), và `main.ts:2210 extensionsResult.runtime.flagValues.set(name, value)` (bỏ qua runner hoàn toàn). `flagValues` sau đổi hình dạng là thay đổi trên bốn file, không phải thứ chuyện nội bộ `loader.ts`, và row (b) của plan không chuẩn bị cho con người điều đó. |
| Cơ chế của row (c): "extension rời registry, nên nó không còn đăng ký được tool, nên bucket của nó không còn ai drain" | PARTLY-CORRECT — cơ chế được nêu yếu hơn thực tế | Phần còn lại của phân tích đúng tuyệt đối: bucket là per-extension, `loader.ts:223` là reader duy nhất của nó, và disposer của `onToolRegistered` (`runner.ts:1044-1048`) đóng trên một mảng `subscriptions` cục bộ, huỷ chính lệ đăng ký đó trên **mọi** extension cùng lúc — một hợp đồng khác, không phải hợp đồng unload. Nhưng "nó không còn đăng ký được tool" chỉ đúng với đường lúc load. Object API của extension A vẫn giữ `Extension` của nó sau khi A bị unload, nên một closure async đã giữ lại mà gọi `api.registerTool` về sau vẫn drain listener set của A và listener vẫn bắn. Test theo cách plan viết (đăng ký ở extension B) pass dù thế nào và không phân biệt được. Một dòng — `extension.toolRegistrationListeners?.clear()` bên trong `unloadExtension` — làm cho hợp đồng đã nêu trở thành vô điều kiện. Hãy viết dòng test theo hợp đồng **hành vi** (listener không bắn), vốn đúng bất kể thế nào, và thêm lệnh clear để cơ chế khớp với claim. |
| Lệnh xác minh `bun run check:ts && (cd packages/coding-agent && bun test test/extension-unload.test.ts test/extensions-runner.test.ts)` | **PARTIALLY UNRUNNABLE** như đã viết | Nửa đầu chạy và xanh (đã chạy trên HEAD 808b365: cả 15 package Done, exit 0). Nửa sau không chạy được trên máy này: native addon chưa build, nên mọi file test báo 0 pass / 1 fail trước khi khẳng định điều gì. Phải nói cổng là **bị chặn** thay vì trình bày lệnh gộp như một pass/fail đơn lẻ. |
| Tiền đề: `unregisterProvider(name, sourceId)` (`types.ts:1745`) "sẵn đã khóa theo sourceId, nên đổi hình dạng `flagValues` chỉ là phản chiếu tiền lệ có sẵn" | **WRONG PREMISE** | Chữ ký ở `types.ts:1745` có `sourceId`, nhưng **không hiện thực nào dùng nó**. `loader.ts:108` lọc `pendingProviderRegistrations` bằng `registration.name !== name`; `runner.ts:713-715` sau `initialize()` rebind thành một lambda một tham số trỏ thẳng vào `modelRegistry.unregisterProvider(name)`, nên `sourceId` biến mất hoàn toàn. Hệ quả trực tiếp: `unregisterProvider(extensionPath, extensionPath)` **không** gỡ được provider mà extension đăng ký dưới tên khác (ví dụ `pi.registerProvider("anthropic", …)`), và sau khi runner rebind thì nó lại xoá một *model provider* theo tên đường dẫn file. `unregisterProvidersForSource` — thứ plan gọi là deliverable của WI-5 commit 2-3 — **không tồn tại** (`grep -rn 'unregisterProvidersForSource' packages/coding-agent/src/` → rỗng). Phần đúng của hàng: `ManagedTimers` thật sự không có chủ per-extension, và plan đúng khi nói WI-9 không được build trước. |
| `runner.ts:934-956` (suspend) và `:984-1050` (phóng `onToolRegistered`), `:1031-1035` (disposer theo từng đăng ký) | STALE-LINE (lệch 6-13, vùng vẫn nhận ra) | `setSuspendedExtensions` ở 947 (doc comment 940-946, thân tới 970); `isExtensionActive` ở 937. Chữ ký `onToolRegistered` ở 997, wrapper per-extension ở 1027-1040, và disposer ở 1044-1048, không phải 1031-1035. Đặc tả của plan về disposer đó là đúng: nó đóng trên một mảng `subscriptions` cục bộ và huỷ một lệ `onToolRegistered` trên mọi extension cùng một lúc. |

## Cần người xác nhận

Ba chỗ đặc tả tự mâu thuẫn hoặc viết mơ hồ. Không tự sửa — ghi lại đây:

1. **Bước 9 so với `code_shape` về cách xoá giá trị flag.** Prose của bước 9 yêu cầu "delete `this.runtime.flagValues.get(path)`" — đây là một lệnh **no-op**, vì `.get()` không xoá gì. Khối `code_shape` cho cùng thân hàm lại dùng `this.runtime.flagValues.delete(extensionPath);`, và chính `code_shape` cũng là nơi duy nhất viết `getFlagValues` đọc bằng `.get(ext.path)`. Hai bên không thể cùng đúng. Bản `code_shape` khớp với hình dạng `Map` mà bước 1 đặt ra, nhưng sự tồn tại của hai câu chữ nghĩa là bước 9 cần một người xác nhận trước khi gõ.
2. **Điều kiện ở hàng `types.ts` đọc ngược.** Hàng đó viết "Delete the now-orphaned flat declaration on ConcreteExtensionAPI **if** IExtensionRuntime still requires one" — trong khi bước 2 và `code_shape` đều yêu cầu xoá vô điều kiện, kèm lý do "không ai đọc hay ghi" và "bỏ nó là thứ khiến bước 1 thành đổi hình dạng thật". Mệnh đề cũng đọc ngược logic: nếu interface vẫn *yêu cầu* field thì xoá field ở phía implement sẽ làm hỏng typecheck chứ không phải giải quyết gì. Ngoài ra field bị nhắc nằm ở `loader.ts:184`, không phải trong `types.ts` — hàng mang tên file nhưng nội dung nói về file khác.
3. **Khoảng cách "hai dòng bên dưới" ở bước 1.** Bước 1 mô tả `unregisterProvider(name, sourceId)` là "hai dòng bên dưới" `types.ts:1739`, tức là khoảng 1741; cùng đặc tả lại đặt nó ở `types.ts:1745` ở nhiều chỗ khác. Chênh lệch này vô hại, nhưng neo phải là `types.ts:1745`.


---


## WI-10. Chốt một bề mặt viết chuẩn (tài liệu quyết định, không code)

**Thay đổi gì:** Viết một ADR xếp hạng năm bề mặt viết dành cho extension, đánh dấu các bề mặt chỉ còn để tương thích là đã đóng băng, và trả lời M2-OQ2 bằng đúng một trong ba chữ YES / NO / DEFERRED — không sửa một dòng runtime code nào, không thêm một test nào. **Wave:** 1. **Effort:** S — nửa ngày, khớp với chính ước lượng "S để quyết định" của plan. Ước lượng đó chỉ đúng nếu người viết kìm được bản thân không nở tài liệu thành một thiết kế cưỡng chế: phần cưỡng chế là M–L và nằm ngoài M2. Cộng thêm khoảng một giờ so với ước lượng thận trọng cho bước 3, vì bộ marker đúng là bốn chỗ `fallow-ignore-next-line code-duplication` còn plan mới chỉ nói hai, nên lập luận "superset" phải dựng lại từ cây mã thay vì sao chép. Chi phí hiện thực hoá quyết định, chỉ để lên kế hoạch, là HIGH và nằm ngoài M2 — chính cái bất đối xứng đó, chứ không phải việc viết, là lý do làm cái này trước.

**Người dùng thấy:** Không có gì ở runtime — diff gồm ba file markdown và không có TypeScript. Thứ duy nhất người dùng nhận ra là một tác giả extension bên thứ ba nay có đúng một trang nói rõ nên viết vào bề mặt nào, thay vì phải tự suy ra từ năm thư mục cùng một đoạn văn bốn câu chôn vùi trong `docs/extensions.md`.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `docs/extension-writing-surfaces.md` | tạo | Bản thân ADR. Một bảng trạng thái sáu dòng (năm bề mặt viết hướng tới extension + sổ đăng ký capability chỉ thuộc lõi), mỗi dòng mang một trạng thái tường minh: CANONICAL, COMPATIBILITY-ONLY / FROZEN, hoặc CORE-ONLY / NOT EXTENSION-REACHABLE. Kèm câu trả lời M2-OQ2, luật "capability mới phải nêu bề mặt đích của nó", và số phận của lớp shim cũ. | đã kiểm chứng |
| `docs/extensions.md` | sửa | Thay mục chín dòng `## Extensions vs hooks vs custom-tools` (tiêu đề ở dòng 901, thân nội dung ở 903-909) bằng một con trỏ ngắn, nêu ADR là bảng xếp hạng bề mặt chính thức. Giữ tối đa một dòng tóm tắt; không để lại hai câu trả lời độc lập cho cùng một câu hỏi trong cây. | đã kiểm chứng |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới tiêu đề rỗng `## [Unreleased]` ở dòng 3, viết theo hướng người dùng, mở đầu bằng điều tác giả nay làm được. | đã kiểm chứng |

Ghi chú đã kiểm chứng kèm theo, cần đọc trước khi viết:

- Với `docs/extension-writing-surfaces.md`: thư mục `docs/` tồn tại và là nơi quy ước cho đúng loại tài liệu này — `docs/` phẳng, chứa 82 file `.md`, và đã có sẵn `extension-loading.md`, `extensions.md`, `hooks.md`, `custom-tools.md`. KHÔNG có thư mục con nào kiểu `adr/`, `decisions/` hay `architecture/` trong cây — `find` theo `*adr*` và `*decision*` chỉ ra `packages/coding-agent/src/prompts/system/plan-mode-tool-decision-reminder.md`, đó là một prompt và không liên quan. Nên `docs/` là quy ước duy nhất sẵn có. Tên file cố tình soi theo `docs/extension-trust-model.md` của WI-0 để hai ADR wave 1 đọc ra như một cặp; PHẢI THỐNG NHẤT TÊN VỚI WI-0 TRƯỚC KHI VIẾT, vì hai ADR không được nằm dưới hai cách đặt tên khác nhau.
- Với `docs/extensions.md`: đây là điều quan trọng nhất mà plan không hề nhắc tới — `docs/extensions.md:901-909` ĐÃ trả lời một phần việc này, theo cách nửa vời và không đầy đủ. Nó nói "Use the right surface", gọi extensions là "unified system", gọi hooks là "separate legacy event API", có nói tới custom-tools, rồi kết bằng "If you need one package that owns policy, tools, command UX, and rendering together, use extensions." Nó chỉ phủ ba trong năm bề mặt — `custom-commands/` và `plugins/` vắng mặt — không dùng từ trạng thái nào mà người review kiểm được, và không nhắc gì tới sổ đăng ký capability. Nếu ADR mà không kèm bản sửa này, cây sẽ cầm hai câu trả lời xung đột cho cùng một câu hỏi, tệ hơn dù chỉ có một.
- Với `packages/coding-agent/CHANGELOG.md`: `## [Unreleased]` nằm ở dòng 3 và hiện đang rỗng; tiêu đề kế tiếp là `## [18.3.3] - 2026-09-27` ở dòng 5. Theo `AGENTS.md`, mục là một dòng, ngắn, hướng người dùng, phần kể nguyên nhân để dành cho commit. Mục này thuần tài liệu nên về lý thuộc về loại có thể bỏ qua changelog, nhưng WI-0 cùng đụng file này, và một cặp ADR có đúng một dòng changelog chen giữa thì trông như tai nạn.

### Các bước

1. **CỔNG CẨN — đừng bắt đầu cho tới khi `docs/extension-trust-model.md` tồn tại trong cây (WI-0 đã merge).** Chạy `ls docs/extension-trust-model.md`. Nếu vắng, DỪNG LẠI và báo WI-10 bị chặn; đừng soạn một ADR nửa vời. M2-OQ2 làm thay đổi điều mà chữ "canonical" có nghĩa với một tác giả bên thứ ba, nên một ADR viết trên một thái độ tin cậy chưa có sẽ đóng băng nhầm hợp đồng, và mọi thay đổi thái độ về sau đều trở thành breaking change với những tác giả đã xuất bản dựa trên đó.
   Neo: `docs/extension-trust-model.md` (do WI-0 tạo ra; chưa tồn tại ở HEAD 808b365).

2. **Chốt tên file với người viết WI-0 trước khi tạo bất cứ thứ gì**, rồi tạo ADR với bảng trạng thái là mục ĐẦU TIÊN — không phải lời mở đầu, không phải phần bối cảnh. Sáu dòng, mỗi dòng một bề mặt, các cột: Surface | Path | Status | What it is for | Evidence. Sáu bề mặt đúng như sau, theo đúng thứ tự này: (1) extension factory TypeScript, (2) hooks, (3) custom tools, (4) custom-command markdown, (5) plugin manifest package, (6) capability registry — dòng cuối đánh dấu CORE-ONLY.
   Neo: `packages/coding-agent/src/extensibility/extensions/`, `hooks/`, `custom-tools/`, `custom-commands/`, `plugins/`; `packages/coding-agent/src/capability/index.ts`.

3. **Với mỗi dòng trong năm dòng hướng tới extension, viết một từ trạng thái mà người review kiểm được bằng mắt** — CANONICAL, hoặc COMPATIBILITY-ONLY / FROZEN. Đừng viết văn xuôi lướt. Cột Evidence của dòng extension-factory phải trích dẫn bốn dấu hiệu có sẵn trong cây nói rằng bề mặt extension là superset nghiêm của bề mặt hook; có BỐN dấu hiệu, không phải hai dấu hiệu plan nêu. Trích nguyên văn comment của từng dấu hiệu để lập luận superset trở nên kiểm chứng được thay vì chỉ được khẳng định.
   Neo: `packages/coding-agent/src/extensibility/extensions/types.ts:230`, `:395`, `:568`, `:1227` (cả bốn đều mang `// falllow-ignore-next-line code-duplication` — chuỗi trong anchor gõ `fallow` với ba chữ `l`; trong mã nguồn thật nó là `fallow-ignore-next-line code-duplication` với hai chữ `l`, và lệnh `grep` ở khống dưới dùng đúng chữ viết đó).
   Vì sao bốn dấu hiệu đó: `:230` đứng trước `ExtensionUIContext`, comment là "extensions expose a strictly larger UI surface"; `:395` là cặp thứ hai thực sự dựng lên lập luận superset cho UI và runtime context; `:568` phủ `ExtensionCommandContext`; `:1227` phủ `RegisteredCommand`.

4. **Trả lời M2-OQ2 bằng một dòng đứng riêng, trích dẫn được, chứa đúng một trong ba chữ YES, NO, hoặc DEFERRED** — `Capability registry: <YES|NO|DEFERRED>`. Đặt nó ở gần đầu tài liệu để người review chỉ cần đọc mỗi thứ khác cũng còn lấy được. Rồi mới nêu lập luận bên dưới, trong một đoạn ngắn, dựa vào: `defineCapability` ném lỗi khi trùng id, sổ đăng ký không có lớp provenance, và việc một sổ đăng ký ở phạm vi module với đúng một người ghi chính là thứ khiến lần nạp thứ hai trong cùng một tiến trình trở thành một crash chứ không phải một lần đăng ký lại. Một DEFERRED là câu trả lời hợp pháp, nhưng nó phải là một sự hoãn CÓ tên người phụ trách và tên milestone, nếu không thì không khác gì không trả lời.
   Neo: `packages/coding-agent/src/capability/index.ts:89-96` (`defineCapability`; lệnh ném nằm ở `:90-92`).

5. **Phát biểu LUẬT ĐÃ CHẤP NHẬN — đây mới là thứ được giao**: một capability mới BẮT BUỘC phải nêu bề mặt đích của nó trong phần mô tả PR. Viết rõ rằng không có luật lint hay bước CI nào cưỡng chế điều đó, và giải thích trong một câu vì sao — một kiểm tra kiểu "PR có nhắc tới một bề mặt hay không" không xứng đáng với chi phí bảo trì của nó và sẽ vi phạm lệnh cấm trong `AGENTS.md` về các khẳng định không có hợp đồng tiêu thụ. Việc cưỡng chế là một chuẩn mực review, và đó là một lựa chọn có chủ đích, không phải một sự thiếu sót.
   Neo: `AGENTS.md`, mục `Testing Guidance` — không placeholder test, không khẳng định mà không nêu tên hợp đồng tiêu thụ.

6. **Thêm danh sách FROZEN, nêu những gì không được đụng khi hiện thực hoá quyết định**: lớp shim cũ, cùng sự thật rằng gỡ chúng là một dự án breaking-change riêng với milestone riêng. Nêu số dòng thật để người đọc sau này thấy được cái giá và tự kiểm nó không đã lặng lẽ thay đổi. Cả năm đều đã kiểm chứng chính xác và cộng lại là 4833: `extensibility/legacy-pi-coding-agent-shim.ts` (1649), `extensibility/plugins/legacy-pi-compat.ts` (2783), `legacy-pi-ai-shim.ts` (179), `legacy-typebox.ts` (179), `legacy-pi-tui-shim.ts` (43).

7. **Thêm mục ngắn "Consequences"** nêu ba thứ quyết định này mở khoá và MỘT thứ nó không mở khoá: nó mở khoá WI-5 commit 2-3 (việc nhận dạng nguồn là hạ tầng hay là tải trọng chết), WI-7 (việc mode registry được xây TRÊN lớp capability hay BÊN CẠNH nó), và WI-11/WI-12 (chúng nhắm vào nền tảng nào). Nó KHÔNG mở khoá bất kỳ dòng code nào — việc hiện thực hoá quyết định nằm ngoài phạm vi M2 một cách tường minh, và tài liệu phải nói thế, nếu không kỹ sư tiếp theo sẽ đọc một thái độ đã chốt thành giấy phép bắt đầu xoá shim.
   Neo: plan dòng 4531-4532 (ràng buộc của WI-5), 6669-6673 (bán kính ảnh hưởng của M2-OQ2).

8. **Sửa `docs/extensions.md`**: thay mục `## Extensions vs hooks vs custom-tools` bằng một con trỏ. Đừng xoá hẳn mục đó — có người đọc bên ngoài đã liên kết tới nó — và cũng đừng để nguyên thân nội dung cũ nằm cạnh con trỏ mới, vì làm vậy là tái tạo đúng cái bài toán hai-câu-trả-lời mà bước này sinh ra để chặn.
   Neo: `docs/extensions.md:901-909`.

9. **Thêm dòng changelog, rồi chạy cổng trong trường `gate` trước khi tuyên bố xong.**
   Neo: `packages/coding-agent/CHANGELOG.md:3`.

### Hợp đồng test

Không có test nào, và sự vắng mặt đó là công cụ đúng ở đây — không phải một nhượng bộ. Ba lý do độc lập, và lý do thứ ba mới là cái ràng buộc thật sự. (1) Một tài liệu không có hợp đồng runtime quan sát được; `AGENTS.md` cấm placeholder test và cấm những test chỉ khẳng định một thứ tồn tại. (2) Kiểm tra tự động duy nhất mà ai cũng sẽ với tới — một luật lint hay bước CI khẳng định "PR có nhắc bề mặt đích" — bị plan và bởi lệnh cấm trong `AGENTS.md` về các khẳng định không có hợp đồng tiêu thụ từ chối một cách tường minh; không có bên tiêu thụ nào sẽ nhận ra nó thiếu. (3) Bản năng tự nhiên nhất — một test khẳng định file ADR tồn tại — là một source-grep và bị cấm hẳn: nó sẽ vượt qua trong khi tài liệu nói sai, đúng thứ hỏng mà mục này sinh ra để ngăn. Hợp đồng thật là một DANH SÁCH ĐỌC CỦA NGƯỜI REVIEW với năm điều kiện hỏng, nêu ở mục Cổng hoàn thành. Một người bảo trì không trả lời được ba câu hỏi chỉ từ phần chữ của ADR, không cần hỏi tác giả, thì chưa được trao một quyết định.

**Nêu tên file test:** không có. Danh sách file test cho mục này rỗng — và đó là dự kiến, không phải sơ suất. Hai file mà plan thỉnh thoảng nhắc tới, `test/extension-ui-header-footer.test.ts` (cổng wave 6 của WI-13) và `test/extension-unload.test.ts` (fixture của WI-9), đều CHƯA TỒN TẠI; WI-13 và WI-9 tạo ra chúng ở wave 6 và 7. Vị trí thật của chúng nếu có là `packages/coding-agent/test/`, không phải `test/`. Vì WI-10 không viết test nên điều này không tốn gì trực tiếp, nhưng nó có nghĩa là checklist năm capability ở §11.1 không thể được gọi là xanh chỉ nhờ mục này, và không file tài liệu nào làm nó xanh thêm.

Nếu hồi quy: người tiêu dùng của tài liệu này là tác giả extension bên thứ ba và người review. Họ thấy một cây có hai câu trả lời xung đột cho cùng câu hỏi "viết vào bề mặt nào", trong đó câu trả lời thứ hai được quyết định bởi tài liệu nào họ mở trước; hoặc họ thấy một danh sách sáu bề mặt không hề chọn, mà mọi người đọc lại coi như đã chốt, và kỹ sư tiếp theo dựng một API công khai trên một thái độ chưa ai chọn.

### Xác minh

Do một người bảo trì review bằng mắt. TUYỆT ĐỐI KHÔNG trình `bun run check:ts` làm bằng chứng cho mục này — nó chạy oxlint cộng `tsgo --noEmit` trên `packages/*/src/**/*.{ts,tsx}` và `packages/*/{test,bench,examples,scripts}/**/*.ts` (`package.json:94-95`). Markdown nằm ngoài mọi cái glob đó, nên một lần `check:ts` xanh chỉ là một phát biểu về không byte nào của thay đổi này. Tương tự, `bun test` hiện đang bị chặn trên toàn môi trường: addon native chưa được build (không có `pi_natives*.node` dưới `packages/natives`), nên nó báo 0 pass. Không cái nào là bằng chứng ở đây; đừng chạy cái nào và cứ nói thẳng như vậy. Xác minh thật là năm bước sau, mỗi bước người review làm xong trong vài phút:

```bash
# 1. File nằm trong cây, và nêu người quyết định cùng ngày
ls docs/extension-writing-surfaces.md

# 2. Câu trả lời M2-OQ2 nằm ở một dòng mà ô trạng thái đúng bằng YES, NO, hoặc DEFERRED
grep -n 'Capability registry' docs/extension-writing-surfaces.md

# 3. Diff đúng ba file và KHÔNG file nào kết thúc bằng .ts
git diff --stat

# 4. Mục ở dòng 901 cũ giờ trỏ tới ADR, và danh sách ba bề mặt cũ không còn đứng như một câu trả lời cạnh tranh
git diff docs/extensions.md

# 5. Dòng mới nằm dưới '## [Unreleased]' (dòng 3), và mục '## [18.3.3] - 2026-09-27' bên dưới không bị đụng
git diff packages/coding-agent/CHANGELOG.md
```

Lưu ý khi đọc kết quả: ở bước 2, một dòng chỉ liệt kê sổ đăng ký trong sáu bề mặt mà không kèm từ trạng thái thì TRƯỢT điều kiện này — đó đúng là kiểu hoãn mà plan cảnh báo, và là thất bại duy nhất mục này tuyệt đối không được giao hàng.

### Cổng hoàn thành

DONE nghĩa là cả năm điều sau đều đúng. (1) `docs/extension-writing-surfaces.md` tồn tại, và nêu một người quyết định cùng một ngày. (2) Một người bảo trì chưa đọc gì khác vẫn trả lời được ba câu hỏi chỉ từ phần chữ, không cần hỏi tác giả: bề mặt nào là CANONICAL cho công việc mới; bề mặt nào là COMPATIBILITY-ONLY và đã đóng băng; và sổ đăng ký capability có tới được từ phía extension hay không. (3) Câu trả lời M2-OQ2 là đúng một trong ba chữ — YES, NO, hoặc DEFERRED — và grep ra được như một dòng đứng riêng, không phải điều ám chỉ bởi văn xuôi quanh nó. (4) `git diff --stat` cho thấy đúng ba file, không file nào là TypeScript. (5) Các shim cũ được nêu tên kèm số dòng thật của chúng cùng một phát biểu tường minh rằng gỡ chúng là một dự án breaking-change riêng, nằm ngoài M2.

Cổng NÀY ĐỎ ĐƯỢC khi: không có file ADR nào trong cây; bảng sáu bề mặt liệt kê các bề mặt mà không hề chọn giữa chúng; câu trả lời M2-OQ2 vắng mặt hoặc là bất kỳ cách diễn đạt thứ tư nào như "TBD", "under discussion", hay "it depends"; `docs/extensions.md` vẫn còn câu trả lời ba bề mặt cũ nằm cạnh câu trả lời mới; bất kỳ file `.ts` nào xuất hiện trong diff; hoặc các shim bị mô tả là có thể gỡ trong M2.

Giới hạn thành thật của cổng này: không có gì trong CI cưỡng chế được bất kỳ điều nào ở trên. Markdown nằm ngoài mọi glob lint và typecheck trong `package.json`, không có markdown linter, và không có chỉ mục tài liệu nào để vỡ. Cổng là một lượt đọc của con người, và nó phải được chạy như vậy — một lần CI xanh trên nhánh này không nói được gì về việc mục này đã xong hay chưa. (`gate_can_fail` là `true`; đây là cổng người đọc, không phải cổng máy.)

### Phụ thuộc

**Phụ thuộc (depends_on):**

- **WI-0 — extension trust model.** Phụ thuộc cứng và một chỗ dừng cứng: M2-OQ2 làm thay đổi điều mà "canonical" có nghĩa với một tác giả bên thứ ba, nên viết bảng xếp hạng bề mặt trên một thái độ tin cậy chưa được viết ra sẽ đóng băng nhầm hợp đồng, và mọi thay đổi thái độ về sau trở thành breaking change với những tác giả đã xuất bản. WI-0 cũng là mục anh em sở hữu luôn tên file ADR theo cặp và cùng file CHANGELOG.

**Chặn (blocks):**

- **WI-7 — registerMode mode registry.** Bị chặn vì chính văn bản bán kính ảnh hưởng M2-OQ2 của plan nêu nó trước tiên: mode registry phải được xây TRÊN lớp capability hay BÊN CẠNH nó, và câu trả lời chỉ biết được một khi extension-reachability đã được chốt. Wave 5 cũng phụ thuộc việc wave 1-4 đã xuống đất.
- **WI-11 — per-extension state persistence.** Bị chặn vì một store per-extension phải biết có tồn tại capability-per-extension hay không trước khi nó chọn được nền tảng để lưu, và lưu khoá theo nền tảng đó.
- **WI-12 — MCP contribution architecture.** Bị chặn vì cùng lý do đó — ghi chú wave 8 của plan nói rõ WI-10 phải nói một đóng góp MCP thuộc về bề mặt nào.
- **M2 acceptance item 9 (§11.3)** — "Hai ADR đã merge (WI-0, WI-10), và M2-OQ2 đã được trả lời bằng YES / NO / DEFERRED". Trượt nếu: không có file ADR nào trong cây; câu trả lời M2-OQ2 không đúng bằng một trong ba chữ. Plan nói rõ mục này không có test và không được giả vờ có.
- **M2 acceptance item 10 (§11.3)** — không mục §4.3 nào bị xoá lặng lẽ. Người làm closer đi hết §4.3 dòng này dòng một, thêm một cột "still present / replaced by a decision at line …" và không để ô nào trống; chính ADR này lấp đầy ô của hàng Capability.
- **M3** — §11.x ghi rằng M3 cần một bề mặt viết đã ổn định (M2-OQ1/OQ2/OQ7) trước khi có thể bắt đầu.

### Cách sai dễ nhất

Cách hỏng dễ chịu nhất là một sự hoãn mặc áo quyết định, và nó có một dấu hiệu rất riêng: một tài liệu liệt kê sáu bề mặt, gán cho mỗi cái một tính từ mô tả, và không bao giờ nói cái nào là canonical cho công việc mới. Mọi người đọc sau đó đều coi danh sách là đã chốt, và kỹ sư tiếp theo dựng một API công khai trên một thái độ chưa ai chọn — đúng cái hiểm họa plan gọi tên khi nó nói một danh sách không kèm lựa chọn thì "đã hoãn quyết định trong lúc trông như đã quyết". Dấu hiệu thì đơn giản và kiểm được: nếu ô M2-OQ2 là bất kỳ thứ gì ngoài một trong ba chữ nghĩa, thì mục này chưa xong. Rủi ro bậc hai là chiều ngược lại — một người viết đọc chữ "NO" cho M2-OQ2 như giấy phép bắt đầu xoá 4833 dòng shim cũ. Chúng KHÔNG bị xoá trong M2; chúng là lý do các plugin hiện hành còn chạy, và gỡ chúng là một dự án breaking-change riêng với milestone riêng. Phải nói điều đó trong chính tài liệu, ngay cùng nhịp thở với câu trả lời, nếu không quyết định sẽ bị thi hành chứ không chỉ được ghi lại.

### Cần người quyết

Ba câu hỏi dưới đây chặn việc bắt đầu viết:

- **PHẢI ĐƯỢC NGƯỜI NGƯỜI QUYẾT, KHÔNG PHẢI KỸ SƯ ĐANG VIẾT TÀI LIỆU: từ nào trong ba chữ là câu trả lời M2-OQ2.** Tài liệu này cố tình không chọn sẵn. Chọn hộ sẽ lặp lại đúng thất bại mà mục này sinh ra để ngăn — một quyết định được đưa ra một cách tình cờ, bên trong một tài liệu, bởi một người vốn chỉ việc ghi lại. Hãy chuẩn bị lựa chọn; đừng tự chốt.
- **Nếu câu trả lời là DEFERRED thay vì YES hoặc NO:** DEFERRED chỉ đứng vững khi có tên người phụ trách và tên milestone. Một sự hoãn thiếu cả hai không khác gì không trả lời, và nó trượt điều kiện (3) của cổng. Phải chốt người phụ trách và milestone TRƯỚC khi viết chữ đó, hoặc viết YES hoặc NO.
- **PHỐI HỢP VỚI WI-0 (cùng wave, cùng người review, hai trong ba file giống nhau):** thống nhất quy ước tên file ADR để cặp đọc ra như một bộ — WI-0 chọn `docs/extension-trust-model.md`, nên `docs/extension-writing-surfaces.md` là tên khớp. Cần lưu ý thêm: WI-0 neo changelog của nó là "dòng 1057, mục #7955 dưới `## [18.1.16]`", và neo đó đã cũ — tiêu đề đã phát hành hiện tại là `## [18.3.3] - 2026-09-27` ở dòng 5. Hai mục sửa cùng một file trong cùng một wave sẽ đụng độ ở các dòng ngữ cảnh.

Hai câu hỏi dưới đây không chặn việc bắt đầu, nhưng nên có câu trả lời trước khi viết:

- **`custom-commands/` và plugin manifest có tự mang một từ trạng thái riêng, hay bị gộp vào "extensions"?** Plan liệt kê chúng là hai trong năm bề mặt riêng biệt và cây mã ủng hộ điều đó — chúng thật sự là các thư mục phân biệt với các loader phân biệt. Mục này giả định năm dòng riêng; nếu người bảo trì gộp lại, việc gộp phải được lập luận trong tài liệu, không được thực hiện lặng lẽ bằng cách im lặng bỏ đi.
- **ADR có cần nêu những tài liệu hiện có nào trở thành cấp dưới không (`docs/hooks.md`, `docs/custom-tools.md`), hay chỉ chuyển hướng `docs/extensions.md:901` là đủ?** Khuyến nghị mức tối thiểu — ba file — rồi để một mục tiếp theo mở rộng, để diff vẫn review được.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Plan dòng 5894: bề mặt extension factory nằm ở `types.ts:1231`. | STALE — lệch 25 dòng | `ExtensionAPI` được khai báo tại `packages/coding-agent/src/extensibility/extensions/types.ts:1256`. Dòng 1231 nằm trong doc comment của một kiểu bên cạnh ("Service tiers accepted by each provider family"). Bất cứ việc gì kỹ sư làm với con số 1231 của plan sẽ dừng thiếu 25 dòng so với interface thật. |
| Plan dòng 5900 và 5915: có HAI marker `fallow-ignore-next-line code-duplication`, ở `types.ts:230` và `:543`, và chúng mang lập luận rằng bề mặt extension là superset nghiêm của bề mặt hook. | WRONG COUNT và WRONG ANCHOR — có bốn marker, và `:543` không khớp gì cả | File có BỐN marker như thế, ở dòng 230, 395, 568 và 1227. `:230` của plan là đúng (đứng trước `ExtensionUIContext`, comment "extensions expose a strictly larger UI surface"). `:543` của plan không tương ứng với marker nào — gần nhất là `:568`. Nói cách khác plan tự đánh giá thấp bằng chứng của chính mình một nửa: 230 và 395 là cặp thật sự dựng lên lập luận superset cho UI và runtime context, 568 phủ `ExtensionCommandContext`, 1227 phủ `RegisteredCommand`. |
| Plan dòng 5898 và 4441: lớp capability là "14 capability trên 84 provider pair". | HALF RIGHT — 14 đúng, 84 không tái lập được, và phép đếm sai này che một bẫy về tính đúng đắn | 14 capability là chính xác. Con số 84 thì không: đếm tĩnh số lần đăng ký capability-provider là 20, tất cả ở top level module, không cái nào trong vòng lặp, mỗi lần một provider. Con số 84 gần như chắc chắn đến từ việc nhầm sổ đăng ký capability với một registry thứ hai hoàn toàn không liên quan nhưng cùng tên hàm `registerProvider` — registry provider MODEL tại `config/model-registry.ts`, được mở ra cho extension dưới tên `pi.registerProvider` (khai báo `extensions/types.ts:1570`, hiện thực `loader.ts:362`, phát lại từ `pendingProviderRegistrations` trong `sdk.ts:1007` và `:2489`). Sự nhầm lẫn đó không phải chuyện hình thức: registry provider model ĐÃ extension-reachable ngay hôm nay, và `docs/extensions.md:905` nói thẳng như vậy ("extensions (…): unified system (events + tools + commands + renderers + provider registration)"). Một ADR nói "các registry provider không extension-reachable" sẽ sai thẳng. CHỈ registry CAPABILITY là core-only. Tài liệu buộc phải nêu rõ nó nói registry nào. |
| Plan dòng 5911 (và 4609): registry capability chỉ thuộc lõi nằm ở `capability/index.ts:88`. | OFF BY ONE — trỏ vào dấu kết của JSDoc, không phải vào code | `defineCapability` được khai báo tại `packages/coding-agent/src/capability/index.ts:89` và kết thúc ở `:96`. Dòng 88 là dấu ` */` đóng doc comment của nó. Registry map ở phạm vi module nằm ở `:34` và lệnh ném khi trùng id nằm ở `:90-92`. Hãy trích `:89-96` (đây cũng là `:88-96` mà chính §4.3 R1 của plan dùng — nên plan tự mâu thuẫn về neo này, và bản của §4.3 mới là bản đúng). |
| Plan dòng 4734 (lý do wave 6): "`setHookWidget` giữ widget trong hai map không ai giải phóng (`extension-ui-controller.ts:78-79`)". | WRONG ANCHOR — lệch 9 dòng, và các dòng được trích chứa code không liên quan | Hai map không ai sở hữu nằm ở `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:87-88`, không phải 78-79. Chúng là hai field riêng `#hookWidgetsAbove` và `#hookWidgetsBelow`. Dòng 78-79 nằm trong helper `toWireSelectOptions`, ánh xạ field description của một select option — không liên quan gì tới quyền sở hữu widget. Đây là neo của WI-13 và WI-9 chứ không phải của WI-10, nhưng nó xuất hiện trong bảng wave mà mục này giao đi, nên đính chính ở đây thay vì để WI-9 thừa hưởng nhầm. |
| Plan dòng 4696 (cổng wave 5) và WI-0: cổng wave 5 là "hàng `pi.registerMode` của fixture outsider-extension". | NOT A CURRENT ANCHOR — không cái nào tồn tại; cả hai là sản phẩm wave 5/6 sắp được tạo | Không có fixture outsider-extension nào trong cây, và `pi.registerMode` không tồn tại như một symbol. Đây là những thứ WI-7 và WI-13 sẽ XÂY, không phải thứ plan này có thể trích làm bằng chứng. Cách hiểu đúng là hướng tới tương lai: cổng wave 5 là một hàng fixture chưa tồn tại cho tới khi WI-7 xuống đất. Đừng viết bất kỳ tên nào trong hai tên đó vào spec hay ADR như thể chúng đang hiện diện, và đừng trông đợi mở được chúng trong lúc review. |
| Plan dòng 4697 (hàng wave 6 của WI-13) và 5562-5563 tham chiếu `test/extension-ui-header-footer.test.ts` (cổng wave 6 của WI-13) và `test/extension-unload.test.ts` (fixture của WI-9). | NOT YET EXISTING — đúng là file tương lai, nhưng không được trích như thể chạy được | Không file nào tồn tại. `packages/coding-agent/test/` chứa một tập lớn test extension (`extensions-runner.test.ts`, `extensions-discovery.test.ts`, `plugin-extensions-discovery.test.ts`, `extension-provider-registration-rollback.test.ts` và nhiều file khác) nhưng không có hai file này. WI-13 và WI-9 tạo chúng ở wave 6 và 7. Vì WI-10 không viết test nên điều này không tốn gì trực tiếp — nhưng nó có nghĩa checklist năm capability ở §11.1 không thể gọi là xanh nhờ mục này, và không file tài liệu nào làm nó xanh thêm. |
| Không được plan nhắc tới ở đâu cả: không có gì nói rằng cây ĐÃ chứa một câu trả lời một phần cho mục việc này. | MISSING FROM THE PLAN — và đây là phát hiện giá trị cao nhất của lần rà này | `docs/extensions.md:901-909` đã chứa một mục tên `## Extensions vs hooks vs custom-tools`, mở đầu bằng "Use the right surface:". Nó xếp hạng ba trong năm bề mặt bằng văn xuôi, gọi hooks là "separate legacy event API", và kết bằng "If you need one package that owns policy, tools, command UX, and rendering together, use extensions." Đó là một câu trả lời trước đó có thật, nó không đầy đủ (`custom-commands/` và `plugins/` vắng mặt), không kiểm chứng được (không có từ trạng thái), và im lặng về registry capability. Nói cách khác, câu hỏi "bề mặt nào là canonical" của plan không phải trang trắng mà là một trang đã có bản nháp cục bộ trên đó. ADR buộc phải dung hoà section đó chứ không ngồi cạnh nó, nếu không cây sẽ giao hai câu trả lời và xung đột được giải quyết bởi cái nào người đọc mở trước. |
| Plan dòng 5933: "Phụ thuộc: WI-0 … và WI-7 / WI-8, vì hai cái đó quyết định năng lực mới sẽ đáp trên bề mặt nào." | INTERNALLY INCONSISTENT — bảng wave của plan nói ngược lại | WI-7/WI-8 xuất hiện ở đây như một phụ thuộc mềm, nhưng bảng wave (§6.1) và văn bản bán kính ảnh hưởng M2-OQ2 của chính plan đều nói ngược lại: WI-10 CHẶN WI-7, và ghi chú wave 5 nói wave 5 phụ thuộc nghiêm ngặt vào 1-4. WI-8 không xuất hiện ở đâu là bị chặn bởi WI-10. Hãy coi WI-0 là phụ thuộc cứng duy nhất; phần nhắc WI-7/WI-8 tốt nhất được đọc là "quyết định này phải dự liệu trước cái mà WI-7 và WI-8 sẽ cần", tức một chỉ dẫn khi soạn thảo chứ không phải một ràng buộc trình tự. |

#### Lệnh đã chạy để kiểm chứng các đính chính trên

```bash
# Đính chính 1 — ExtensionAPI ở 1256, không phải 1231
grep -n 'export interface ExtensionAPI' packages/coding-agent/src/extensibility/extensions/types.ts
# → 1256:export interface ExtensionAPI
#   liên quan: ExtensionFactory ở :1660; §5.x của plan trích 'extensions/types.ts:1255-1315' cho 46 overload on(),
#   và neo đầu 1255 cũng lệch một dòng so với interface thật ở 1256

# Đính chính 2 — bốn marker, không phải hai
grep -n 'fallow-ignore-next-line code-duplication' packages/coding-agent/src/extensibility/extensions/types.ts
# → 230, 395, 568, 1227   (file dài 1849 dòng nên cả bốn đều là vị trí ổn định)

# Đính chính 3 — 14 hằng capability (+1 khai báo hàm = 15 hit), 20 capability-provider, KHÔNG phải 84
grep -rn 'defineCapability<' packages/coding-agent/src/
# → 15 hit, TẤT CẢ dưới packages/coding-agent/src/capability/: 14 hằng capability + khai báo hàm
#   ở capability/index.ts:89. "14" là số HẰNG, không phải số hit — ghi "→ 14 hit" là ghi sai
#   chính output của lệnh đang được trích.
grep -rn '^registerProvider(' packages/coding-agent/src/ | grep -cE 'Capability\.id'
# → 20, rải ở discovery/{opencode:6, gemini:5, cursor:3, github:2, mcp-json:1, claude-md:1, agents-md:1, ssh:1}
#   tất cả 20 đều ở top level module, mỗi lần một provider, không cái nào trong vòng lặp.
#   KHÔNG phải "20 capability + 22 model-provider": 42 là số hit unanchored của chuỗi `registerProvider(`,
#   phần lớn là khai báo method trong interface/class, dòng gọi trùng chuỗi con, và comment ở types.ts.

# Đính chính 4 — defineCapability ở :89-96, throw ở :90-92
sed -n '84,99p' packages/coding-agent/src/capability/index.ts
# → 84 banner section, 86-88 JSDoc của defineCapability, 89 dòng export, 90-92 lệnh ném trùng id, 96 dấu ngoặc đóng

# Đính chính 5 — hai map không ai sở hữu ở :87-88
grep -n 'new Map\|setHookWidget' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts
# → 87:#hookWidgetsAbove, 88:#hookWidgetsBelow, 343: setHookWidget(...)
sed -n '78,79p' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts
# → : option.description / : { label: option.label, description: option.description }   (file dài 1342 dòng)

# Đính chính 6 — không có fixture outsider, không có registerMode
grep -rln 'outsider' packages/
grep -rn 'registerMode' packages/coding-agent/src/
find . -name '*outsider*' -not -path './node_modules/*'
# → không kết quả nào ở cả ba lệnh

# Đính chính 7 — 15 file extension test, không có hai file được nêu
ls packages/coding-agent/test/ | grep -iE '^extension'
# → 15 file, không file nào tên extension-ui-header-footer.test.ts hay extension-unload.test.ts

# Đính chính 8 — câu trả lời một phần đã có sẵn trong cây
sed -n '901,909p' docs/extensions.md
# → tiêu đề ở 901, "Use the right surface" ở 903, ba bullet ở 905-907, câu kết ở 909
```

Vị trí thật của hai file test chưa tồn tại là `packages/coding-agent/test/`, không phải `test/` như bảng wave 6 của plan viết.


---


## WI-11. Lưu trữ trạng thái riêng cho từng extension (chỉ thiết kế, phụ thuộc WI-8 và WI-9)

**Thay đổi gì:** Viết một tài liệu thiết kế duy nhất quyết định trạng thái key-value riêng của một plugin sẽ nằm ở đâu, và không build nó — vì nửa "dọn dẹp" của câu trả lời đó chưa thiết kế được cho tới khi WI-9 trao cho extension một cơ chế unload thật, mà một store dựng trước thời điểm đó sẽ phải có vòng đời gắn vào sau, tốn hơn thiết kế một cái vốn đã có vòng đời.
**Wave:** 8.
**Effort:** S cho phần thiết kế, khớp với mức "S mỗi cái" mà bảng wave của plan gán cho wave 8. Nửa ngày khảo sát cộng một ngày viết là con số thực tế, không phải bốn giờ — vì bước 2 (điều tra xem hôm nay một extension làm được gì) là việc khảo sát mà plan chưa từng làm, và nó đổi nội dung tài liệu phải nói. Phần build là M, KHÔNG nằm trong mục này và KHÔNG nằm trong M2. Cần biết bảng wave của plan gọi wave 8 là "S mỗi cái, không build" trong khi §8.2 nói phần build là việc không ai nhận và phải được gọi tên + gán ngày trước khi M2 đóng lại — hai câu đó chỉ nhất quán nếu đọc "S" là chỉ phủ tài liệu, và spec này đọc theo cách đó.

**Người dùng thấy:** Không có gì thay đổi trực tiếp. Mục này chỉ bàn giao một tài liệu. Hiệu ứng nhìn thấy được là: một tác giả plugin hỏi "tôi đặt trạng thái của mình ở đâu, và khi tôi gỡ cài đặt thì bạn có dọn không?" nhận được MỘT câu trả lời có đường dẫn nêu rõ, có vòng đời nêu rõ, và có lý do nêu rõ vì sao hai nền tảng ứng viên còn lại bị loại — thay vì một công thức trong `docs/extensions.md` bảo "nối thêm một custom session entry và dựng lại từ branch", vốn gắn với phạm vi session nên không thể là câu trả lời cho bất cứ thứ gì phải sống sót qua session. Hiệu ứng nhìn thấy được thứ hai là: quyết định HOÃN phần build trở nên không còn vô hình — tài liệu gọi tên work item chưa ai nhận, điều kiện kỹ thuật của nó (WI-9), và hai hợp đồng mà người triển khai sau này phải bảo vệ.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `docs/extension-state-persistence.md` | tạo | Tài liệu thiết kế mới, khoảng 120–180 dòng. Các mục: những gì đang tồn tại hôm nay (khảo sát "không có primitive", cộng nền tảng `appendEntry`/session-branch đã ship); câu hỏi thiết kế; ba nền tảng được xếp hạng (A Settings overlay / B dedicated store / C session-entry replay) kèm khuyến nghị B và một lý do cụ thể cho mỗi lựa chọn bị loại; hình dạng khuyến nghị gồm đơn vị sở hữu và một đường dẫn trên đĩa cụ thể; hai hợp đồng mà bản build sau này phải bảo vệ, viết ở thì hiện tại; và một mục trạng thái kết đóng lại ghi phần build là chưa ai nhận, phụ thuộc WI-9, không dùng nhãn phase. | **CHƯA kiểm chứng** — file mới, không tồn tại ở HEAD 808b365, không có dòng nào để kiểm chứng. Tên file theo đúng quy ước của spec anh em WI-0 là `docs/extension-trust-model.md` (dạng `docs/extension-<topic>.md`); nếu người duy trì thích tên khác thì đổi, nhưng giữ nguyên hình dạng. |
| `docs/extensions.md` | sửa | Thêm MỘT đoạn ngắn ngay dưới tiêu đề `## Session and state patterns` ở dòng 699, liên kết chéo tới `docs/extension-state-persistence.md` và nói thẳng trạng thái trung thực: hôm nay chưa có store trạng thái riêng cho từng extension, câu hỏi chọn nền tảng đã được quyết trong tài liệu kia, phần build bị hoãn và chưa ai nhận. KHÔNG viết lại hay xoá hướng dẫn `appendEntry` ở :701-722 — nó vẫn là lời khuyên đúng cho trạng thái phạm vi session. | **Có** — đã đọc: dòng 699 là `## Session and state patterns`, và :701-722 là hướng dẫn đánh số "For durable extension state" dựa trên `pi.appendEntry("com.example.my-extension.state", data)` cộng với việc dựng lại từ `ctx.sessionManager.getBranch()`. |
| `packages/coding-agent/CHANGELOG.md` | sửa (TÙY CHỌN) | Nếu người duy trì muốn sự nhất quán của wave 8 với WI-0, thêm đúng một dòng dưới `## [Unreleased]` (đang ở dòng 3) với nội dung gần đúng "Documented the design for per-extension state persistence; the store itself is deferred pending extension unload". Không đụng gì khác — mọi section đã phát hành là bất biến. | **Có** — grep xác nhận `## [Unreleased]` nằm ở dòng 3. Mặc định của spec này là BỎ QUA hoàn toàn file này (không có gì user-visible thay đổi); xem open_questions và bước 9. |

### Các bước

1. **Chấp nhận lệnh cấm trước khi viết bất cứ thứ gì.** Neo: `docs/extension-state-persistence.md` (file mới). Trước khi viết, đọc lại lệnh cấm ở gate bước 1 và chấp nhận nó: mục này không được chạm vào một file `.ts` nào. Plan nói rõ — "Không build, không test dưới M2" — và cái cám dỗ là rất cụ thể, vì hai hợp đồng tương lai ở bước 6 trông y hệt test case và chỉ cách một chỉnh sửa là thành code. Nếu bạn thấy mình đang viết test thì dừng lại: AGENTS.md cấm test placeholder, và lập luận của chính plan nói một test ở đây "sẽ cho ra đúng một placeholder mà AGENTS.md cấm".

2. **Viết phần khảo sát TRƯỚC, trước phần khuyến nghị**, vì chính phần khảo sát làm cho khuyến nghị trở nên kiểm chứng được, và đó là phần plan chưa từng làm. Neo: `docs/extension-state-persistence.md` mục "Cái gì đang tồn tại hôm nay". Plan khẳng định như hiện trạng rằng "một extension cần nhớ bất cứ thứ gì sẽ tự chế file dưới `~/.omp` hoặc `cwd`" — ĐỪNG viết câu đó như một sự thật đã quan sát được, vì nó không phải. `grep -nE 'Bun.write|Bun.file|readFileSync|writeFileSync' packages/coding-agent/examples/extensions/*.ts` trả về KHÔNG hit nào; không extension ví dụ nào trong repo lưu thứ gì. Cái đã kiểm chứng là SỰ VẮNG MẶT của một primitive (`ExtensionAPI` có 74 phương thức ở `types.ts:1256-1582` và không cái nào là một store), cộng thêm một workaround đã được tài liệu hoá (bước 3). Hãy viết bản trung thực: không có store, nên extension bên thứ ba không có chỗ nào được thừa nhận để đặt trạng thái, và mẫu tự chế file là hệ quả có thể đoán trước chứ không phải thứ repo này đã bị quan sát làm. Sai theo hướng phóng đại chính là chỗ thất bại mà plan tự cảnh báo năm dòng sau.

3. **Đọc và trích dẫn section "Session and state patterns" trong khảo sát.** Neo: `docs/extensions.md:699-723`. Đây là nền tảng đã ship và là nền tảng duy nhất tác giả chạm tới được hôm nay: `pi.appendEntry("com.example.my-extension.state", data)` (chữ ký ở `types.ts:1489`) cộng với việc dựng lại từ `ctx.sessionManager.getBranch()` trên `session_start` / `session_branch` / `session_tree`. Nói thẳng vì sao nó không phải câu trả lời cho câu hỏi thiết kế này — custom entry nằm trên một session branch nên không sống sót qua session, và mẫu đó là append-and-replay (entry khớp gần nhất thắng) chứ không phải get/set theo khoá. KHÔNG xoá hay viết lại section này trong mục này: mẫu đó vẫn là lời khuyên đúng cho trạng thái phạm vi session, và tài liệu thiết kế là một quyết định hướng tới tương lai về một store chưa tồn tại. Chỉnh sửa duy nhất mục này làm với `docs/extensions.md` là một đoạn liên kết chéo (bước 8).

4. **Phát biểu câu hỏi thiết kế trong một câu, rồi trả lời nó.** Neo: `docs/extension-state-persistence.md` mục "Câu hỏi thiết kế". Câu hỏi: một extension có được một store key-value có namespace bên trong `Settings` phân lớp sẵn có, hay một store riêng cho từng extension với vòng đời riêng và cơ chế dọn dẹp lúc unload không? Xếp hạng CẢ BA nền tảng từ bước 2/3 (A Settings overlay, B dedicated store, C session-entry replay) và KHUYẾN NGHỊ B. Với mỗi lựa chọn bị loại, viết lý do cụ thể chứ không phải một mối trừu tượng: A bị loại vì trạng thái nội bộ của plugin không phải cấu hình người dùng và sẽ nằm trong một file YAML người dùng tự tay chỉnh, và vì sáu lớp `SettingProvenance` (`config/settings.ts:62`) gọi tên ý định của NGƯỜI DÙNG chứ không mô tả cache entry của plugin đến từ đâu; C bị loại vì nó phạm vi session và là append-and-replay chứ không phải get/set theo khoá. Một khuyến nghị mà không nêu tên lý do loại là chế độ thất bại — nó đọc như một sơ suất và người sau sẽ mở lại câu hỏi.

5. **Đưa hình dạng code vào, đánh dấu không thể nhầm là sketch, và nói điều mang tính quyết định bằng văn xuôi.** Neo: `docs/extension-state-persistence.md` mục "Hình dạng khuyến nghị". Điều mang tính quyết định: quyền sở hữu là theo DANH TÍCH extension (đường dẫn cài đặt), không phải theo `ExtensionContext`, vì `ExtensionContext` được dựng lại ở mỗi lần gọi nên một handle gắn vào nó sẽ là per-call. Khoá map phía host theo cách `extension.flags` đang khoá ở `loader.ts:263` — theo `extensionPath` — và nói tường minh rằng nó KHÔNG được khoá theo cách `runtime.flagValues` đang khoá ở `loader.ts:265`, tức theo tên flag trần, và đó chính là hình dạng mà WI-9 tồn tại để thay đổi. Sau đó GỌI TÊN một đường dẫn trên đĩa cụ thể và biện minh nó (`~/.omp/extensions-state/<extension-id>.json` theo đúng quy ước `getPluginsDir()` sẵn có; helper thuộc về `packages/utils/src/dirs.ts` ngay cạnh `getPluginsLockfile` ở `:652-654`). Một tài liệu nói "đường dẫn sẽ quyết sau" là đã hoãn quyết định thay vì đưa ra quyết định, và như vậy không đạt.

6. **Viết cả HAI hợp đồng có thể ghi, ở thì hiện tại, như những thứ người triển khai sau này phải bảo vệ** — không phải như test, không phải như mã TODO. Neo: `docs/extension-state-persistence.md` mục "Các hợp đồng bản build sau phải bảo vệ". (1) Trạng thái của một extension bị loại bỏ khi chính extension đó được unload, và việc loại trạng thái của một extension không làm trạng thái của extension khác mất khả đọc, kể cả khi hai extension từng cùng nhận một tên khoá. (2) Một extension đổi id hoặc đường dẫn cài đặt thì không âm thầm bỏ rơi các giá trị cũ — tài liệu phải nói rõ chuyện gì xảy ra với chúng (từ chối việc đổi tên, migrate chúng, hoặc ghi nhận chúng là bị bỏ rơi), vì "một setting được đổi tên không làm mồ côi một giá trị" không trả lời được gì cho tới khi trường hợp đổi tên được phát biểu. Dùng lại nguyên văn hợp đồng sở hữu của WI-9 ở nơi nó đã tồn tại (plan §11.3) thay vì bịa ra một hợp đồng song song; hai hợp đồng sở hữu lệch nhau một chút trong cùng một milestone là một bug tương lai.

7. **Kết bằng phần hoãn, viết sao cho không thể bị đọc là đã chốt.** Neo: `docs/extension-state-persistence.md` mục "Trạng thái: đã thiết kế, phần build chưa ai nhận". Gọi tên phần build là một work item CHƯA AI NHẬN, gọi tên điều kiện kỹ thuật của nó (WI-9, wave 7 — plan ghi nguyên văn: "cleanup khi uninstall không thi triển khả thi tới khi WI-9 có một unload thật", `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:5961`), và ghi lại rằng không milestone nào trong plan nhận nó. Plan (§8.2) đòi quyết định này phải được gọi tên và gán ngày trước khi M2 đóng lại, và đòi không viết nó thành "Phase 4/5" vì plan không có khái niệm phase. Nếu tài liệu không nói thẳng được rằng "cái này đã thiết kế, chưa build, và không ai nhận phần build" thì nó chưa xong. Cân nhắc ghi thêm một dòng rằng nếu phần build CÓ được kéo vào M2 sau wave 7 thì WI-9 xanh là điều kiện CẦN nhưng KHÔNG đủ — plan nói rõ điều này và đó là câu dễ bị mất nhất. (Các neo mục ở bước 2, 4, 5, 6 và 7 đã đổi sang tiếng Việt cho khớp văn phong của tài liệu đích; không lệnh `grep` nào ở phần Xác minh tham chiếu tới tên mục, nên đổi tiêu đề không làm đỏ bất kỳ cổng nào.)

8. **Thêm một đoạn trỏ tới tài liệu thiết kế.** Neo: `docs/extensions.md:699`. Thêm MỘT đoạn ngắn ở đầu `## Session and state patterns` trỏ tới `docs/extension-state-persistence.md` và nói trạng thái một cách trung thực: hôm nay không có store trạng thái riêng cho từng extension; câu hỏi chọn nền tảng đã được quyết trong tài liệu đó; phần build bị hoãn và chưa ai nhận. Đừng viết lại hướng dẫn `appendEntry` hiện có và đừng trình bày quyết định như đã ship — một tác giả đọc trang này không được kết luận rằng `pi.state` tồn tại. Giữ ngắn đến mức tác giả tự biết trong năm giây liệu điều này có đổi điều họ nên làm hôm nay không (không).

9. **Cần người quyết, xem open_questions: mặc định của spec này là KHÔNG thêm mục changelog**, vì không có gì user-visible thay đổi và AGENTS.md giới hạn mục changelog cho "user-facing: lead with what the user will see or can now do". Spec anh em WI-0 chọn thêm một mục, nên nếu người duy trì muốn sự nhất quán của wave 8 thì thêm đúng một dòng dưới `## [Unreleased]` với nội dung gần đúng "Documented the design for per-extension state persistence; the store itself is deferred pending extension unload" — và không đụng gì khác trong file. Nếu người duy trì đồng ý với mặc định của spec này thì bỏ hẳn file. Đừng làm nửa vời: một mục gợi ý rằng tính năng đã tồn tại tệ hơn việc không có mục nào. Neo: `packages/coding-agent/CHANGELOG.md:3`.

### Hình dạng code

**KHÔNG PHẢI CODE ĐÃ ĐƯỢC ĐẤT.** Đây là một sketch nằm BÊN TRONG tài liệu thiết kế, để người review có thể tranh luận về hình dạng. Nó không bao giờ được chép vào `src/` bởi mục này — xem gate bước 1.

Câu hỏi quyền sở hữu là câu quyết định mọi thứ, nên sketch mở đầu bằng nó. WI-9 (plan §11.3) đã chốt sẵn hình dạng tiền lệ cho trạng thái theo từng extension: `Map<extensionPath, Map<flagName, value>>`, hôm nay do `extension.flags` mang (bản thân nó có `extensionPath`) chứ KHÔNG do `runtime.flagValues` mang (nó không có — `flagValues.set(name, options.default)` ở `:265` được khoá theo tên flag trần). Một state store phải được khoá theo cách `extension.flags` được khoá, không phải theo cách `flagValues` được khoá.

```ts
// Sketch for the doc. One store per extension IDENTITY, not per ExtensionContext:
// ExtensionContext is rebuilt on every invocation, so a handle hung off ctx is per-call.
interface ExtensionStateStore {
	get<T>(key: string): T | undefined;
	set<T>(key: string, value: T): void;
	delete(key: string): void;
	keys(): string[];
}

// Proposed surface — ONE new member on ExtensionContext, and the only one this item
// would ever authorise. It is shown here so the review can attack the shape, not so
// anyone can add it today.
interface ExtensionContext {
	// ... 26 existing members ...
	state: ExtensionStateStore;
}

// Host-side, mirroring the §11.3 shape:
//   Map<extensionPath, ExtensionStateStore>
// Unload contract: removing an extension drops ITS entry and nothing else, even when
// another extension previously claimed the same flag name — the earlier claimer's
// value must stay readable. This is WI-9's contract verbatim and the doc should cite
// it rather than reinvent it.
```

Ba nền tảng mà tài liệu buộc phải xếp hạng, kèm hình dạng mà mỗi nền tảng hàm ý:

**(A) Key-value có namespace bên trong `Settings` phân lớp sẵn có.**
→ `SettingProvenance` (`config/settings.ts:62`) có sáu lớp, nên một lớp phủ (overlay) được miễn phí và khớp với Option A của WI-8a. Chi phí: gần như bằng không. Nhưng `Settings` là một file YAML người dùng tự tay chỉnh, còn trạng thái nội bộ của plugin không phải cấu hình người dùng — một người dùng định dạng lại hay dọn file settings của họ sẽ âm thầm xoá trạng thái của plugin, và các lớp provenance gọi tên ý định của NGƯỜI DÙNG (`env`, `runtime`, `overlay`, `project`, `global`, `default`) không mô tả một cache entry đến từ đâu. Nó còn thừa kế một vòng đời settings (không có đường dọn dẹp) — đúng cái thứ đang được thiết kế để vòng quanh.

**(B) Một store riêng cho từng extension, có vòng đời riêng và dọn dẹp lúc unload. KHUYẾN NGHỊ.**
→ Tốn hơn (một path helper mới trong `packages/utils/src/dirs.ts` ngay cạnh mẫu `getPluginsLockfile` ở `:652-654`; một runtime map mới; một nhánh unload mới trong WI-9). Nhưng nền tảng là đúng: trạng thái của plugin không phải cấu hình người dùng, nên nó không thuộc về một file người dùng chỉnh, và nó có thể được trao đúng một tính chất vòng đời duy nhất khiến "dọn sạch những gì extension này đã ghi" trở thành điều thiết kế được ngay từ đầu.

**(C) Cái đã ship sẵn:** `pi.appendEntry(<qualified customType>, data)` (`ExtensionAPI.appendEntry`, `types.ts:1489`) cộng với việc dựng lại từ `ctx.sessionManager.getBranch()` trên `session_start` / `session_branch` / `session_tree`, đã tài liệu hoá ở `docs/extensions.md:699-723`. Phạm vi session: entry thuộc về một session branch, nên nó không thể trả lời "nhớ điều này qua các session". Không phải một key-value store — nó là append-and-replay, và entry khớp gần nhất thắng. Tài liệu phải nói rõ điều này và KHÔNG được loại nó chỉ vì "không phải store" mà không nói lý do, vì đây là nền tảng duy nhất tác giả chạm tới được hôm nay và người đọc sẽ hỏi.

Tài liệu còn phải nêu một đường dẫn cụ thể trên đĩa theo hướng (B) và biện minh nó, nếu không nó chỉ đã hoãn quyết định chứ không đưa ra quyết định. `~/.omp/extensions-state/<extension-id>.json` là hình dạng đi theo đúng quy ước `getPluginsDir()` sẵn có; tài liệu hoặc chấp nhận nó, hoặc thay bằng một thứ được biện minh tốt hơn. "Chúng ta sẽ quyết đường dẫn sau" không đạt.

### Hợp đồng test

**KHÔNG có test, và đó là công cụ đúng chứ không phải một lỗ hổng.** Lý do của plan là mang tính nội dung chứ không phải thủ tục: dọn dẹp lúc uninstall không thiết kế được cho tới khi WI-9 trao một unload thật, nên bất kỳ test nào viết hôm nay đều khẳng định điều gì đó về một store chưa tồn tại và về một vòng đời chưa ai xây — đúng cái placeholder mà AGENTS.md cấm. Viết một cái còn bất lợi nữa, vì một test PASS cho một tính năng đã hoãn không khác gì một test PASS cho một tính năng đã ship với bất kỳ ai đọc CI sau này.

Hợp đồng ở đây là một **điều kiện nghiệm thu gồm CÂU HỎI**, mà người duy trì phải trả lời chỉ từ chữ trong tài liệu, không hỏi tác giả: (a) nền tảng nào thắng, và cụ thể vì sao mỗi nền tảng còn lại bị loại; (b) dữ liệu nằm ở đâu trên đĩa; (c) chuyện gì xảy ra với trạng thái của một extension khi nó bị unload, và việc unload một extension có để lại giá trị của extension khác đọc được không; (d) chuyện gì xảy ra với các giá trị của một extension khi nó bị đổi tên hoặc đổi đường dẫn cài đặt; (e) ai nhận phần build và điều gì chặn nó. Bất kỳ câu hỏi nào tài liệu không trả lời được nghĩa là tài liệu chưa xong.

Hai hợp đồng **PHẢI ĐỊNH** cũng đang giữ và không được vi phạm. Thứ nhất, tài liệu không được đọc như đã ship — không ai đọc nó được kết luận rằng một thành viên `state` tồn tại trên `ExtensionContext` hôm nay. Thứ hai, tài liệu không được dùng nhãn phase; plan không có khái niệm phase, và viết "Phase 4/5" là bịa ra một cấu trúc không tồn tại.

**Người tiêu dùng thấy gì nếu hồi quy:** câu hỏi nền tảng vẫn treo, nên người đầu tiên cần trạng thái theo extension sẽ dựng cái store nào tiện tay — rất có thể đúng là file tự chế dưới `~/.omp` hoặc `cwd` mà plan mô tả là kết cục có thể đoán trước — và store đó sẽ ship ra không có chủ sở hữu và không có đường dọn dẹp. Đến lúc WI-9 hạ cánh và muốn dọn những gì một extension đã ghi, store đã có người gọi, và gắn quyền sở hữu vào một store đã có người gọi tốn hơn hẳn so với thiết kế đã khiến nó chỉ là một nhánh unload một dòng. Cái giá không nằm ở code; nó nằm ở chỗ một quyết định không ai viết ra sẽ được người cần tính năng đầu tiên tự quyết, và đổi lại sau này là một breaking change với mọi tác giả extension đã ship theo nó.

**Tên file test:** `NONE WRITTEN BY THIS ITEM` — mục này không tạo file test nào, và không được tạo. Plan nói thẳng lý do: "Không dưới M2 — đây là mục thiết kế và cố ý ngoài phạm vi build, vì cleanup khi uninstall không thi triển khả thi tới khi WI-9 có một unload thật. Viết test bây giờ sẽ cho ra đúng một placeholder mà AGENTS.md cấm."

Các file được trích dẫn để đối chiếu (không phải test): `packages/coding-agent/src/extensibility/extensions/types.ts:452-562` là interface `ExtensionContext` mà mục này nói về và KHÔNG được sửa; `packages/coding-agent/src/extensibility/extensions/loader.ts:263-265` là tiền lệ mà hình dạng sở hữu phải theo; `packages/coding-agent/src/extensibility/extensions/types.ts:1256-1582` là `ExtensionAPI` mà plan nói không có primitive lưu trữ; `packages/coding-agent/src/memory-backend/types.ts:79-83` là `MemoryRuntimeContext`; `docs/extensions.md:699-723` là section "Session and state patterns" đã ship.

### Xác minh

Xác minh là **review của con người đối với tài liệu thiết kế, bởi MỘT người duy trì**. KHÔNG có cổng build và KHÔNG có cổng test, và plan nói đúng lý do — không có gì trong cây thay đổi hành vi, nên `bun run check:ts` hoàn toàn không bị ảnh hưởng bởi mục này, và việc dùng nó làm bằng chứng cho WI-11 là cách nhanh nhất để một mục thiết kế trông như đã xong khi thực ra chưa.

Môi trường, đã kiểm chứng tận tay ở HEAD 808b365 trên nhánh `milestone-1`: `bun run check:ts` XANH (cả 14 package đều báo Done; `pi-coding-agent:check:types` Done trong 10.18s) — nên một typecheck đỏ sau thay đổi của bạn nghĩa là bạn đã phá thứ gì đó, dù với mục này điều đó gần như không thể. `bun test` bị CHẶN: chạy `bun test test/extension-context-project-trust.test.ts` từ `packages/coding-agent` báo "0 pass, 1 fail, 1 error" với "Failed to load pi_natives native addon for darwin-arm64". Hãy build addon bằng `bun --cwd=packages/natives run build` trước mọi mục cần một lần chạy test thật; WI-11 thì không.

Các câu lệnh phải giữ được sau khi thay đổi (chạy từ repo root):

```bash
git status --porcelain | grep -vE '^\?\? \.lavish-wip/|^\?\? MILESTONE_2_EXECUTION_PLAN\.md$' | cut -c4- | grep -c '\.ts$'   # phải trả về 0 — bắt cả file .ts MỚI chưa `git add`, vì `git diff --name-only` không thấy file untracked
git status --porcelain | grep -vE '^\?\? \.lavish-wip/|^\?\? MILESTONE_2_EXECUTION_PLAN\.md$'                          # đã bỏ WIP kế hoạch có sẵn ở HEAD; phần còn lại: đúng các file trong bảng "File cần chạm tới", không gì khác
test -f docs/extension-state-persistence.md || exit 1                                                                 # file phải tồn tại
grep -cE '\(A\)|\(B\)|\(C\)' docs/extension-state-persistence.md                                                     # >= 3: ba nền tảng được đánh số
grep -niE 'khuyến nghị|recommend' docs/extension-state-persistence.md                                               # phải có hit: có NGƯỜI THẮNG
grep -n 'appendEntry' docs/extension-state-persistence.md                                                            # phải có hit
grep -n -iE 'unload|WI-9' docs/extension-state-persistence.md                                                        # phải có hit
grep -n -iE 'unowned|deferred|không ai nhận|not owned' docs/extension-state-persistence.md                           # phải có hit
grep -nE '`~/[^`]+`' docs/extension-state-persistence.md                                                             # phải có hit: MỘT đường dẫn cụ thể, không phải "sẽ quyết sau"
grep -n 'dirs.ts' docs/extension-state-persistence.md                                                               # phải có hit: helper nào trong dirs.ts sinh ra nó
```

Ngoài ra: người duy trì mở `docs/extension-state-persistence.md` và trả lời, chỉ từ chữ trong tài liệu và không hỏi tác giả: (a) nền tảng nào thắng, và vì sao hai cái còn lại bị loại; (b) dữ liệu nằm ở đâu trên đĩa; (c) chuyện gì xảy ra với trạng thái của một extension khi nó bị unload; (d) chuyện gì xảy ra với các giá trị của nó khi nó bị đổi tên; (e) ai nhận phần build và điều gì chặn nó. Bất kỳ câu hỏi nào không trả lời được thì mục đó trượt. Và người duy trì xác nhận tài liệu KHÔNG đọc như đã ship: đọc nó không được khiến bất kỳ ai tin rằng `pi.state` hay một thành viên `ExtensionContext.state` tồn tại hôm nay.

### Cổng hoàn thành

DONE nghĩa là cả sáu điều sau đều đúng.

1. `git status --porcelain | cut -c4- | grep -c '\.ts$'` trả về 0. Không file TypeScript nào bị chạm — kể cả file MỚI chưa `git add`, vì `git diff --name-only` không thấy file untracked. Một mục thiết kế mà lại ship một chỉnh sửa trong `types.ts` là thất bại bất kể văn xuôi nói gì.

2. `docs/extension-state-persistence.md` tồn tại, và nó ĐÃ XẾP HẠNG ba nền tảng rồi khuyến nghị một cái. `test -f` phải xanh, `grep -cE '\(A\)|\(B\)|\(C\)'` phải trả về >= 3, và `grep -niE 'khuyến nghị|recommend'` phải ra hit. Thất bại mà điều này ngăn là một tài liệu gọi tên người thắng mà không gọi tên thứ nó đã đánh bại — đọc như sơ suất chứ không phải quyết định.

3. Tài liệu nêu một đường dẫn trên đĩa cụ thể (hai lệnh `grep` cuối trong khối lệnh) và một đơn vị sở hữu cụ thể — theo danh tính extension, khoá theo đường dẫn cài đặt, khớp `extension.flags` ở `loader.ts:263` và tường minh KHÔNG phải `runtime.flagValues` ở `loader.ts:265`. Một tài liệu nói đường dẫn sẽ quyết sau là đã hoãn quyết định thay vì đưa ra quyết định.

4. Cả hai hợp đồng tương lai được viết ra ở thì hiện tại (bước 6), và hợp đồng thứ hai phát biểu chuyện gì xảy ra với các giá trị khi đổi tên thay vì chỉ khẳng định rằng việc đổi tên không được làm mồ côi giá trị. Một chính sách đổi tên chưa phát biểu chính là cái lỗ hổng nguy hiểm nhất mà người đọc sẽ rơi vào.

5. Phần hoãn được ghi lại: phần build được gọi tên là chưa ai nhận, WI-9 được gọi tên là điều kiện kỹ thuật, và văn bản KHÔNG dùng cụm "Phase 4/5" hay bất kỳ nhãn phase nào khác (plan không có khái niệm phase và cấm rõ ràng viết ra). Ngoài ra: nếu văn bản có nhắc tới việc kéo phần build vào M2 thì nó phải nói rằng WI-9 xanh là cần và không đủ.

6. Người duy trì trả lời được cả năm câu hỏi ở bước xác minh 8 chỉ từ chữ trong tài liệu. Đây là cổng review của con người mà plan yêu cầu ("Review người tài liệu thiết kế") và là cổng DUY NHẤT — không có bản thay thế tự động, và việc giả vờ có là cách mục này bị đóng lại trong lúc sinh ra văn xuôi không ai kiểm.

Những gì KHÔNG thuộc cổng: việc `bun run check:ts` xanh không chứng minh gì về mục này và không được trích dẫn làm bằng chứng; không test nào được thêm, vì lý do plan nêu là dọn dẹp-lúc-uninstall không thiết kế được cho tới khi WI-9 hạ cánh, nên một test viết lúc này sẽ đúng là placeholder mà AGENTS.md cấm.

**Cổng này có thực sự đỏ được không?** Có, và nó đỏ theo ba kiểu khác nhau. Kiểu cơ học: `git status --porcelain | cut -c4- | grep -c '\.ts$'` trả về khác 0 là đỏ, kể cả với một file `.ts` mới tạo chưa `git add` (lệnh cũ `git diff --name-only` bỏ lọt đúng trường hợp đó) — đó là lệnh rẻ nhất và lại là lệnh mang tính quyết định nhất của cả mục. Kiểu nội dung: bảy lệnh `grep` bắt buộc đều ra hit (và `test -f` phải xanh), nên một tài liệu thiếu nền tảng thứ ba, thiếu `appendEntry`, thiếu tên `WI-9`, thiếu một đường dẫn cụ thể hoặc thiếu chỗ ghi phần build chưa ai nhận đều lộ ra ngay, không cần đọc diễn giải. Kiểu người: năm câu hỏi ở bước xác minh 8 là điều kiện nghiệm thu thật sự, và nó đỏ theo cách tự động không thể đỏ — nếu người duy trì phải quay lại hỏi tác giả "state khi unload thì sao" hoặc "rename thì sao" thì tài liệu chưa xong, bất kể có bao nhiêu từ. Điểm yếu thật sự của cổng này là nó phụ thuộc một người có thời gian đọc; không có cổng tự động nào thay thế được, và đó chính là điều plan đang nói khi nó yêu cầu review người.

### Phụ thuộc

- **WI-8** (cụ thể là quyết định nền tảng của WI-8a, Option A) — phụ thuộc mềm, giải quyết được ngay. WI-8a định tuyến phần SETTINGS của plugin qua `Settings` dưới dạng một lớp phủ có namespace. WI-11 hỏi cùng câu nền tảng đó nhưng về STATE của plugin, và điểm cốt lõi của plan là hai thứ đó có CÂU TRẢ LỜI KHÁC NHAU. Phụ thuộc này mềm vì tài liệu WI-11 bắt buộc phải lập luận rõ sự khác biệt đó, và nó có thể được viết trước khi WI-8a hạ cánh — nhưng nếu WI-8a đã hạ cánh rồi thì hãy đọc `manager.ts:929-960` trước, vì đoạn code đó là tiền lệ cụ thể cho hình dạng "nền tảng sai trông như thế nào", và tài liệu sẽ mạnh hơn nhiều khi trích dẫn code đã được migrate thật thay vì dự đoán.
- **WI-9** (wave 7) — phụ thuộc CỨNG cho phần BUILD, không có cho phần THIẾT KẾ. Lập luận xuyên suốt của plan là dọn-dẹp-lúc-uninstall không thiết kế được nếu không có unload thật, và điều này ĐÃ ĐƯỢC KIỂM CHỨNG: `git grep -n 'async unload|unloadExtension|#unload' -- packages/coding-agent/src/extensibility/` trả về KHÔNG hit nào. Seam unregister duy nhất trong toàn bộ extension API là `unregisterProvider` (`types.ts:1578`) — một thao tác gỡ provider đơn lẻ, không phải teardown tổng quát. Tài liệu thiết kế có thể và PHẢI được viết ngay bây giờ; phần build không thể bắt đầu cho tới khi WI-9 hạ cánh.
- **WI-0 / WI-10** (wave 1) — mềm, chỉ thứ tự. Bảng wave của plan xếp wave 1 (trust model, canonical authoring surface) trước wave 8 một cách nghiêm ngặt vì M2-OQ2 (capability registry có bao giờ trở nên extension-reachable không) đổi điều "canonical" CÓ NGHĨA GÌ với một tác giả bên thứ ba, và một store theo từng extension chính là một canonical authoring surface. Nếu wave 1 chưa hạ cánh, tài liệu thiết kế phải nói rõ khuyến nghị của nó là có điều kiện theo thái độ trust, và không được viết như thể `ctx.state` đã có một mức trust ổn định.

**Chặn:**

- Phần build chưa ai nhận của một state store theo từng extension — plan (§8.2) đòi nó phải được GỌI TÊN và GÁN NGÀY trước khi M2 đóng lại, và không milestone nào hiện nhận. Nguyên văn plan: "Có kéo build này vào M2 hay không, ai làm, ở milestone nào — cả ba đều chưa được gán". Tài liệu thiết kế này chính là thứ làm cho nghĩa vụ gọi-tên-và-gán-ngày trở nên cụ thể.
- **WI-9** (wave 7) — chỉ yếu, và chỉ như một ràng buộc chứ không phải blocker. Nhánh unload của WI-9 phải biết cần dọn cái gì, mà store chưa tồn tại, nên WI-9 có thể đi tiếp mà không cần mục này. Phụ thuộc là một chiều: phần BUILD của mục này cần WI-9, chứ không ngược lại. Đừng để điều này bị đọc thành lý do đổi thứ tự wave 7.
- **M3** (theo plan §11.3: "M3 cần: một bề mặt authoring đã chốt ... và một `unload` thật để cài/gỡ không rò"). Một nền tảng đã chốt là điều kiện tiên quyết cho các bề mặt authoring của M3; một nền tảng chưa chốt nghĩa là M3 phải khám phá lại câu hỏi với ít ngữ cảnh hơn mục này.
- **M4** (theo plan §11.3: quyền sở hữu có thể kiểm chứng — mọi thứ đăng ký đều truy ngược được về một extension, và mọi tài nguyên toàn-runner đều có owner và đều được giải phóng khi treo). Một state store không có chủ là một vi phạm M4 trực tiếp, đó là lý do đơn vị sở hữu ở bước 5 không phải chi tiết tuỳ chọn.

### Cách sai dễ nhất

Xây nó trước WI-9 — plan gọi đúng điều đó và đó chính là toàn bộ rủi ro. Dấu hiệu nhận biết là một handle `state` xuất hiện trên `ExtensionContext` với một file JSON đằng sau mà không có chủ sở hữu: tại thời điểm đó WI-9 phải đóng thêm vòng đời vào một store đã có người gọi, và việc đóng thêm quyền sở hữu lên một store đã có người gọi tốn hơn hẳn so với thiết kế một cái có quyền sở hữu ngay từ đầu, vì mọi call site hiện có trở thành một call site có thể bị dọn khỏi chính nó.

Cách sai thứ hai là một tài liệu chọn một nền tảng mà không nói vì sao hai cái kia bị loại — một quyết định không kèm lý do loại đọc như sơ suất, và người sau sẽ mở lại nó.

Cách sai thứ ba, và riêng đúng với cây code này, là viết tài liệu dựa trên hai nền tảng plan nêu tên mà bỏ sót nền tảng thứ ba đã ship và đã được tài liệu hoá: `docs/extensions.md:699-723` bảo tác giả lưu trạng thái bền vững bằng `pi.appendEntry("com.example.my-extension.state", data)` và dựng lại từ `ctx.sessionManager.getBranch()`. Đó là phạm vi session — nó chết cùng session, và nó là một mẫu tái dựng, không phải một key-value store. Một tài liệu thiết kế không hề nhắc tới nó sẽ bị đọc là đã khảo sát các lựa chọn khi thực ra là chưa.

### Cần người quyết

- **CHANGELOG** — một mục thiết kế thuần wave 8 có được ghi changelog không? Spec anh em WI-0 đã thêm một mục; mặc định của spec này là không. Khác lớn ở chỗ: trust model của WI-0 ràng buộc những gì tác giả bên thứ ba có thể dựa vào HÔM NAY, còn tài liệu thiết kế của WI-11 điều chỉnh một primitive chưa tồn tại, nên không tác giả nào bị ràng buộc bởi nó. Người duy trì nên quyết một lần cho cả hai rồi áp dụng nhất quán cho WI-0 và WI-12. Mặc định nếu chưa quyết: không ghi mục, theo phạm vi "user-facing" của AGENTS.md.
- **ĐƯỜNG DẪN TRÊN ĐĨA** — `~/.omp/extensions-state/<extension-id>.json` là hình dạng spec này đề xuất, theo quy ước `getPluginsDir()` sẵn có và nằm cạnh `getPluginsLockfile` (`packages/utils/src/dirs.ts:652-654`). Người duy trì có thể muốn một chỗ khác (bên trong thư mục riêng của extension, hay một file mỗi extension kèm một index dùng chung). Điều KHÔNG chấp nhận được là để đường dẫn chưa quyết — điều đó biến một mục thiết kế thành một sự hoãn mặc đồ thiết kế.
- **M2-OQ2** — §10 của plan nói M2-OQ2 (capability registry có bao giờ trở nên extension-reachable không: YES / NO / DEFERRED) chặn "substrate của WI-11/WI-12". Nếu M2-OQ2 vẫn còn mở khi tài liệu này được viết, tài liệu phải nói khuyến nghị của mình là có điều kiện theo câu trả lời đó thay vì âm thầm giả định một câu trả lời. Nếu M2-OQ2 đã đóng, hãy trích dẫn câu trả lời và nói nó có đổi khuyến nghị hay không.
- **PHẠM VI CỦA "ĐỔI TÊN"** — hợp đồng tương lai thứ hai của plan là "một setting được đổi tên không làm mồ côi một giá trị". Với một state store, các khoá do chính extension chọn, nên trường hợp thú vị là DANH TÍNH của chính extension thay đổi (id, hoặc đường dẫn cài đặt khi người dùng di chuyển nó), chứ không phải một khoá bị đổi tên. Người duy trì phải quyết chuyện gì xảy ra khi danh tính đổi: từ chối, migrate các giá trị, hay ghi nhận chúng là bị bỏ rơi. Tài liệu không thể phát biểu hợp đồng nếu chưa có câu trả lời này.
- **MIGRATE CÁC FILE TỰ CHẾ HÔM NAY** — các extension đã ship (nếu có) đã tự viết file của riêng chúng dưới `~/.omp` hoặc `cwd`. Một store tương lai có nhận chúng không, hay bắt đầu sạch? Plan im lặng. Mặc định có thể bảo vệ được là "bắt đầu sạch, không nhận diện" — không có cách nào biết file nào thuộc extension nào — nhưng người duy trì nên nói thẳng điều đó trong tài liệu thay vì để ngầm, vì "chúng ta sẽ migrate sau" là loại câu sẽ trở thành một breaking change không ai lên kế hoạch.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| "`ExtensionAPI` có 29 phương thức và không có primitive lưu trữ nào" (mở đầu WI-11: "`ExtensionAPI` 29 phương thức **không có primitive lưu trữ nào**") | STALE | Khẳng định "không có primitive lưu trữ" là ĐÚNG và mang tính quyết định — giữ nguyên. Con số sai theo hệ số 2.4: `ExtensionAPI` khai báo 80 thành viên (35 tên duy nhất), 74 phương thức. Một kỹ sư tin vào con số "29" sẽ tưởng bề mặt nhỏ hơn nhiều và có thể suy luận rằng thêm một cái nữa là rẻ — điều mà bề mặt thật không cho phép. Bằng chứng: `git grep -n 'export interface ExtensionAPI' -- packages/coding-agent/src` → `packages/coding-agent/src/extensibility/extensions/types.ts:1256`; interface đóng ở :1582. Khoảng đó có **80 khai báo thành viên** trên **35 tên duy nhất** (nặng về overload). `grep -cE '^\t[a-zA-Z#]+\??\('` trên cùng khoảng → 69, nhưng con số đó THẤP hơn thật vì mẫu bỏ sót tham số kiểu. Đếm đúng bằng cách phân loại phần đuôi sau tên (phương thức nếu là `(` hoặc `<`, property nếu là `:`) thì ra **74 phương thức / 6 property**; 6 property không phải phương thức là logger, pi, events, typebox, arktype, zod. Năm mục `appendEntry`, `registerTool`, `registerMessageRenderer`, `sendMessage`, `setServiceTier` là phương thức có tham số kiểu, không phải property. Đối chiếu độc lập: `git grep -niE '\b(storage|state|kv|getState|setState|loadState|saveState|persist)\b'` trên types.ts không trả về primitive lưu trữ nào. |
| "`packages/coding-agent/src/extensibility/extensions/types.ts:429-537` là `ExtensionContext`, và nó có 12 field, không lưu trữ" | STALE | Interface nằm ở dòng 452-562 — cũ hơn +23 ở đầu và +25 ở cuối. Số field sai nặng: 26 thành viên duy nhất trên 27 khai báo, không phải 12. `isProjectTrusted(): boolean` được khai báo HAI LẦN, ở :494 và :561. Khẳng định "không lưu trữ" thì đúng. Bằng chứng: `git grep -n 'interface ExtensionContext' -- packages/coding-agent/src` → `types.ts:452` (hit thứ hai ở :1768 là `ExtensionContextActions`, một interface khác). Đọc 452-562 thấy dấu `}` đóng ở 562. Liệt kê thành viên thụt lề bằng tab trong khoảng đó cho 27 khai báo / 26 tên duy nhất, với `isProjectTrusted` xuất hiện hai lần — xác nhận độc lập bằng `grep -n isProjectTrusted types.ts` → `494:` và `561:`. Các thành viên gồm ui, mode, getContextUsage, getAsyncJobSnapshot, compact, hasUI, cwd, sessionManager, modelRegistry, localProtocolOptions, model, models, isIdle, abort, hasPendingMessages, shutdown, agent, isProjectTrusted, getSystemPrompt, runEphemeralTurn, memory, setInterval, setTimeout, clearTimer, addAdditionalContext, invokeTool. |
| "`types.ts:480-481` là `memory?: MemoryRuntimeContext` — bộ nhớ nội dung, không phải key-value store theo từng extension" | STALE | Thành viên nằm ở dòng 506, một dòng đơn lẻ, không phải khoảng hai dòng ở 480-481. NỘI DUNG thì đúng và là một phần mang tính quyết định của lập luận: `MemoryRuntimeContext` có đúng ba phương thức — `status()`, `search()`, `save()` — và là bộ nhớ nội dung, nên không thể phục vụ làm một store theo khoá cho từng extension. Giữ lập luận này; sửa số dòng. Bằng chứng: `git grep -n 'MemoryRuntimeContext' -- packages/coding-agent/src` → `types.ts:506` (`memory?: MemoryRuntimeContext;`), import ở `types.ts:80`. Định nghĩa tại `packages/coding-agent/src/memory-backend/types.ts:79-83`: `status(): Promise<MemoryBackendStatus>`, `search(query, options?)`, `save(input)`. Được nối vào extension context ở `extensions/runner.ts:1303` (`memory: this.#getMemoryFn?.()`), cấp từ `sdk.ts:3080` qua `createSessionMemoryRuntimeContext`. |
| "`packages/coding-agent/src/extensibility/plugins/manager.ts:929-957` là store tạm để lấy làm mẫu cho một vòng đời" | CONFIRMED_WITH_DRIFT | Cả ba phương thức đều có, nhưng khoảng kết thúc ở 960 chứ không phải 957: `getPluginSettings` 929-937, `setPluginSetting` 942-949, `deletePluginSetting` 954-960. Neo này quan trọng hơn bình thường vì lập luận trung tâm của WI-11 là store này chính là mẫu sẽ lan rộng — nên kỹ sư nên được đưa tới đúng những dòng đó. Bằng chứng: `grep -nE 'async (getPluginSettings|setPluginSetting|deletePluginSetting)' packages/coding-agent/src/extensibility/plugins/manager.ts` → 929, 942, 954. Đọc 926-965 thấy mỗi thân kết thúc ở 937, 949, 960 tương ứng. Các neo phụ trợ, tất cả ĐÃ KIỂM CHỨNG: `#saveRuntimeConfig` ở :148-151 (ghi `getPluginsLockfile()`), `#loadProjectOverrides` ở :153-162 (đọc `getProjectPluginOverridesPath(this.#cwd)`), và `getPluginsLockfile` ở `packages/utils/src/dirs.ts:652-654` → `~/.omp/plugins/omp-plugins.lock.json`. Lưu ý store này thực sự LÀ gì: một đường đọc trải trên HAI file (`config.settings[name]` cộng `projectOverrides.settings?.[name]`) với một đường ghi chỉ bao giờ ghi file thứ nhất — đó chính là cái bẫy mất dữ liệu âm thầm của WI-8a, và là một lập luận cụ thể mạnh cho việc state không thuộc về settings. |
| "Trạng thái repo mà task nêu: 'git HEAD 5873776, hiện đang ở nhánh milestone-1'" | STALE | HEAD là 808b365, vẫn ở nhánh `milestone-1`. Các commit gần đây: 808b365 "docs(plan): fold the spec-verified M1 execution plan into the upgrade plan", 33d6e33 "docs(m1): execution plan for milestone 1...", ecd516f "feat: initial publish — oh-my-pi 18.3.3". Sự trôi số dòng xuyên suốt plan là nhất quán với việc các commit đã hạ cánh sau khi plan được viết, và đó là lý do phần lớn neo của nó lệch 10-30 dòng chứ không phải lệch một hai. Bằng chứng: `git rev-parse HEAD` → `808b365409fa36719c38319a041c0e612b4e702b`; `git branch --show-current` → `milestone-1`. Điều này được chính mẫu trôi xác nhận: `settings.ts:62`, `settings.ts:800-808`, `registry.ts:786-792`, `loader.ts:263`/`:265`, `dirs.ts:1046-1048`, `dirs.ts:652-654` và `plugins/types.ts:156-163` đều tái lập chính xác, trong khi toàn bộ neo `types.ts` đều lệch 23-26. Một mức dịch chuyển đều +23-26 trên một file nghĩa là file đó đã lớn thêm phía trên dòng 429 sau khi plan được viết; các file trong config/ không dịch chuyển. |
| "Plan đặt câu hỏi thiết kế thành nhị phân: một key-value store có namespace bên trong `Settings` phân lớp sẵn có, hay một store riêng cho từng extension với vòng đời riêng" | INCOMPLETE | Nó là tam phân, và lựa chọn thứ ba chính là cái tác giả thực sự chạm tới được hôm nay: `pi.appendEntry(<qualified customType>, data)` (chữ ký ở `types.ts:1489`) cộng với việc dựng lại từ `ctx.sessionManager.getBranch()` trên `session_start` / `session_branch` / `session_tree`, đã tài liệu hoá ở `docs/extensions.md:699-723` dưới tiêu đề "For durable extension state". Nó phạm vi session — entry sống trên một session branch nên không gì sống sót qua session — và nó là append-and-replay với latest-match-wins, không phải get/set theo khoá. Tài liệu thiết kế phải xếp hạng cả ba. Một tài liệu chỉ khảo sát hai cái plan nêu sẽ bị đọc là đã khảo sát các lựa chọn khi thực ra là chưa, và câu hỏi đầu tiên của người review sẽ là "vậy còn mẫu appendEntry mà chính docs của chúng ta đã khuyên dùng thì sao?". Bằng chứng: đọc `docs/extensions.md:699-723` thấy tiêu đề, ba bước đánh số, và ví dụ dựng lại trên `session_start` dùng `entry.type === "custom" && entry.customType === "com.example.my-extension.state"`. `git grep -n appendEntry -- packages/coding-agent/src/extensibility/extensions/` → khai báo ở `types.ts:1489` (ExtensionAPI) và `types.ts:1752` (kiểu handler), hiện thực ở `loader.ts:307-308` uỷ quyền cho `runner.ts:694`. |
| "WI-11 chỉ phụ thuộc WI-8 và WI-9, và M2-OQ2 không liên quan tới nó" | INCOMPLETE | §10 của plan tự mâu thuẫn với phần WI-11 của chính nó: M2-OQ2 (capability registry có bao giờ trở nên extension-reachable không — YES / NO / DEFERRED) liệt kê "substrate của WI-11/WI-12" trong số những thứ nó CHẶN, và §6.1 xếp wave 1 (WI-0, WI-10) trước wave 8 chính vì lý do đó. Nếu tài liệu thiết kế được viết khi M2-OQ2 còn mở, nó phải nói khuyến nghị của mình là có điều kiện theo câu trả lời đó thay vì giả định một thái độ trust chưa được chọn. Bằng chứng: đọc plan §10, M2-OQ2: "Chặn: WI-5 commit 2-3 ..., WI-7 ..., và substrate của WI-11/WI-12." Đọc §6.1: "WI-0 chặn WI-10 vì câu trả lời trust làm thay đổi nghĩa của \"canonical\" với tác giả bên thứ ba; WI-10 chặn WI-7 ... và WI-11/WI-12." |


---


## WI-12. Cho phép extension đóng góp MCP server — CHỈ THIẾT KẾ, M2 không build

**Thay đổi gì:** Viết một tài liệu quyết định chọn một trong hai kiến trúc để một extension đã được nạp có thể trao một MCP server cho manager của core — kiến trúc được khuyến nghị là đăng ký một server descriptor mà manager sẵn có của core dựng lên — và nói thẳng ra luật phê duyệt cùng luật tin cậy, bởi hạng mục này bàn giao một quyết định chứ không phải một dòng code.

**Wave:** 8 (Thiết kế hoãn: lưu trạng thái extension và MCP — WI-11, WI-12. S mỗi cái, không build)

**Effort:** S để viết (một tài liệu quyết định cộng một dòng trỏ, nửa ngày), M để build — và việc build KHÔNG được xếp lịch trong M2 bởi hạng mục này, nó chỉ trở nên khả thi sau khi WI-0 và WI-10 đã xuống đất.

**Người dùng thấy:** nội bộ, người dùng không thấy. Hạng mục này viết đúng một tài liệu thiết kế và không đổi hành vi runtime nào. Không gì trong cây nguồn được bàn giao dưới M2: plan (§8.2) ghi rõ rằng việc đóng góp MCP không có chủ sở hữu, không có milestone, và không có lịch build nào.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `docs/mcp-server-contribution-by-extensions.md` | tạo | Toàn bộ sản phẩm bàn giao. Một tài liệu thiết kế dạng ADR. Phải chứa, đúng thứ tự này: (1) hai kiến trúc được nêu như hai phương án thật; (2) khuyến nghị kèm lý do; (3) trust tier, nêu trong đúng một câu không mập mờ; (4) đề xuất approval-parity viết theo các tier thật (MCP tool hardcode `write` tại `mcp/tool-bridge.ts:656` và `:771`; extension tool mặc định `exec` tại `extensions/types.ts:658`) kèm ghi chú rằng dòng 'Origin: MCP server tool' ở `tools/approval.ts:369-371` hiện không với tới được; (5) vòng đời, mà tài liệu nên cho thấy phần lớn là có sẵn (xem `code_shape`); (6) những gì tường minh KHÔNG quyết ở đây. Viết thành văn xuôi, không phải checklist — một tài liệu thiết kế đọc ra như danh sách việc sẽ bị nhầm là kế hoạch build và ai đó sẽ xếp lịch cho nó. Ghi chú: repo này không có thư mục ADR nào (`find . -maxdepth 3 -type d -iname 'adr*' -not -path './node_modules/*'` không trả về gì), và mọi ghi chú kiến trúc khác đều nằm phẳng trong `docs/` — ví dụ `docs/blob-artifact-architecture.md`, `docs/fs-scan-cache-architecture.md`. Vì vậy `docs/` là nơi đúng, và tên file nên chứa 'design' hoặc 'contribution' để không bị đọc như tài liệu tham khảo hướng người dùng. | có (verified=true) |
| `docs/extensions.md` | sửa | Thêm MỘT dòng vào mô tả MCP surface quanh `:392` (mục `mcp_notification`, tức phạm vi hiện tại đã được tài liệu hoá của mức tham gia MCP của extension API) trỏ sang tài liệu thiết kế mới và nói thẳng rằng một extension đã nạp hiện KHÔNG thể đóng góp MCP server. Đây là 'lời nói dối thứ hai nằm cạnh lỗ hổng' mà spec của WI-13 cũng chỉ ra: tài liệu hiện chỉ mô tả nửa vào, đọc lên thì như một danh sách đầy đủ. Ghi chú: `docs/extensions.md` dài 51 KB; `:392` là bullet `mcp_notification`. Đọc quanh đó trước khi sửa để dòng mới khớp hình dạng bullet xung quanh. Đừng viết lại cả mục — đây chỉ là một dòng trỏ, và spec là thiết kế-thuần-túy. | có (verified=true) |
| `docs/mcp-config.md` | sửa | Một dòng trong danh sách nguồn tại `:40` và/hoặc danh sách thứ tự ưu tiên tại `:484-495`, ghi lại rằng extension package đóng góp MCP server theo cách KHAI BÁO (declarative) qua `.mcp.json` / `mcp.json`, và rằng việc đóng góp lúc runtime theo mệnh lệnh (imperative) đã được thiết kế nhưng chưa build. Thiếu dòng này thì người đọc tìm thấy tài liệu thiết kế mới sẽ hợp lý kết luận rằng hôm nay không package nào đóng góp được server — điều đó sai. Ghi chú: `:40` đã nói 'installed Claude marketplace plugins and OMP extension packages that declare MCP servers' — từ 'declare' đang gánh phần việc mà dòng này nên làm rõ. Danh sách thứ tự ưu tiên tại `:484-495` xếp OMP extension package ở vị trí #2. | có (verified=true) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa (thực tế: KHÔNG sửa) | KHÔNG SỬA — hạng mục này không viết dòng code nào. Ghi lại ở đây vì đây là file mà bản build sau này sẽ chạm: `ExtensionAPI` (interface tại `:1256`) là nơi `registerMcpServer` sẽ được khai báo, cạnh các method `register*` khác (`:1347` registerTool, `:1379` registerFileWriteFallback, `:1411` registerCommand, `:1421` registerShortcut, `:1430` registerFlag). `ToolDefinition.approval` (`:658`), `mcpServerName` (`:663`), `mcpToolName` (`:665`), `McpNotificationEvent` (`:904-916`) và `on('mcp_notification')` vào (`:1340`) là các thành viên sẵn có mà tài liệu thiết kế buộc phải trích dẫn. Ghi chú: được đánh dấu là modify vì đó là bề mặt của bản build, nhưng dưới hạng mục này nó là CHỈ-ĐỌC — kỹ sư không được thêm method vào. Nếu file này bị bẩn khi mở PR, nghĩa là hạng mục đã bị hiện thực hoá thay vì được thiết kế. Đã xác minh: file dài 1849 dòng; độ trôi +25 ghi ở `plan_corrections` áp dụng cho mọi neo mà plan đưa cho file này. | có (verified=true) |
| `packages/coding-agent/src/mcp/manager.ts` | sửa (thực tế: KHÔNG sửa) | KHÔNG SỬA — ghi lại vì đây là seam mà thiết kế phải build TRÊN, và phát hiện trung tâm của spec là không cần vòng đời mới nào. `connectServers(configs, sources, onStatus?, startupTimeoutMs?)` được khai báo tại `:664-669`, đã là public và đã tăng dần. Nó đóng dấu `sources[name]` lên cả `#sources` lẫn `_source` của một connection đang tồn tại tại `:690-696`, và bỏ qua các tên đã connect hoặc đang in-flight tại `:700-712`. Teardown là `disconnectServer(name)` tại `:1242`. Quyền sở hữu đã được khoá đúng: `#replaceServerTools` tại `:942-948` lọc theo `mcpServerName`, và comment tại `:937-941` giải thích vì sao tiền tố đã sanitize `mcp__<name>_` tuyệt đối không được dùng ('atlassian' so với 'atlassian:atlassian'). Ghi chú: chỉ-đọc dưới hạng mục này. File dài 1941 dòng / 72 KB; tài liệu thiết kế nên trích đúng bốn neo trên và không gì hơn. Comment `#937-941` là tiền lệ mà thiết kế nên nhận luôn thay vì nghĩ lại — một kỹ sư viết phép so khớp theo tiền tố tên ở đây sẽ tái tạo một bug codebase đã ghi nhận. | có (verified=true) |
| `packages/coding-agent/src/capability/mcp.ts` | sửa (thực tế: KHÔNG sửa) | KHÔNG SỬA — ghi lại vì nó định nghĩa hình dạng chuẩn mà descriptor đề xuất phải được định kiểu theo. `MCPServer` tại `:15-74` (name, enabled, timeout, requestIdFormat, instructions, command, args, env, envPolicy, envLiteralKeys, cwd, url, headers, headerPolicy, auth, oauth, transport, _source) và `mcpCapability` tại `:108-129` (key / equivalent / toExtensionId / validate). Chú ý các trục gia cố sẵn có mà thiết kế descriptor không được âm thầm bỏ rơi: `envPolicy: "literal"` (`:36`), `envLiteralKeys` (`:38`), `headerPolicy: "origin-locked"` (`:50`). Ghi chú: chỉ-đọc dưới hạng mục này. Thiết kế nên nói rõ descriptor là MCPServer TRỪ `_source` (core sở hữu provenance — extension không được giả mạo nó) và PHẢI nói nó làm gì với ba trục policy ở trên; một server do extension đóng góp mà lặng lẽ thoát khỏi việc ghim header origin-locked là một lỗ hổng chuyển tiếp credential. | có (verified=true) |
| `packages/coding-agent/src/modes/components/extensions/dashboard-runtime.ts` | sửa (thực tế: KHÔNG sửa) | KHÔNG SỬA — ghi lại vì đây là site 'core sở hữu' mà plan trích, và đính chính ở trên đã định khung lại nó. `persistMcpToggle` ở `:40-48` và `applyMcpToggle` ở `:49-62`. File dài 80 dòng. Ghi chú: chỉ-đọc dưới hạng mục này. `import { setMcpServerEnabled } from "../../../mcp/config-writer"` nằm ở `:7` và `MCPManager` được type-import ở `:8` — lưu ý runtime được đưa manager như một tham số tuỳ chọn (`:22`) và chuyển tiếp một bề mặt hẹp hình dạng `MCPRuntimeSource`, chứ không phải chính manager. | có (verified=true) |
| `packages/tui/src/overlays/extensions/extension-dashboard.ts` | sửa (thực tế: KHÔNG sửa) | KHÔNG SỬA — ghi lại vì `#writableMcpSourcePath` tại `:449-453` là bằng chứng mạnh nhất, đơn lẻ, trong tài liệu thiết kế. Nó allowlist đúng `native` và `mcp-json` và trả về `undefined` cho mọi provider khác, nên toggle của một server do package đóng góp không bao giờ viết lại file của package; nó rơi xuống denylist/allowlist ở tầng user. Call site là `#toggleMcpExtension` tại `:418-447` (call site từ :396), truyền kết quả vào `persistMcpToggle` tại `:421`. Ghi chú: chỉ-đọc dưới hạng mục này. Đây chính là lập luận phản biện cho Option B: codebase đã một lần từ chối ghi MCP config do plugin sở hữu, trong UI, và mã hoá sự từ chối đó thành một allowlist provider. Hãy trích nó trong tài liệu thiết kế thay vì suy diễn lại. | có (verified=true) |

### Các bước

1. **Xác nhận cây trước khi tin bất kỳ số dòng nào trong spec này:** `git -C /Users/tranquangdang21/Projects/ultraworkers rev-parse --short HEAD` trả về `808b365`. Nếu HEAD đã dịch chuyển, chạy lại các lệnh grep neo ở mục Xác minh trước khi dùng bất kỳ neo nào bên dưới — ba neo plan đưa cho `extensions/types.ts` đã sai lệch +25 ngay tại HEAD này. *(anchor: repo root)*

2. **CỔNG DỪNG — không viết một dòng nào của tài liệu thiết kế cho tới khi trust tier (câu hỏi mở số 1) đã có câu trả lời bằng văn bản từ một con người.** Khuyến nghị: option (b), cùng tier với một server ở user-scope, có chặn theo việc extension có đáng tin hay không — nghĩa là thiết kế bị CHẶN một cách tường minh bởi WI-0, và nói thẳng điều đó. Option (a) (auto-connect, không chặn) chỉ bảo vệ được nếu WI-0 đã chọn một trust prompt theo thư mục, vì nếu không thì nó là một primitive kết nối ra ngoài không điều kiện. Option (c) (grant rõ ràng cho từng server) là mặc định an toàn và tốn ma sát nhiều nhất. Dù chọn gì, nó phải là MỘT câu mà người review có thể phản bác, không phải một đoạn văn lướt. Đây là chế độ hỏng mà plan nêu tên: một thiết kế viết như thể câu hỏi phê duyệt đã xong, khiến phần hiện thực âm thầm tự chọn. *(anchor: quyết định, không có neo code)*

3. **Đọc lại năm thành viên MCP-extension đã kiểm chứng** để tài liệu mô tả đúng TRẠNG THÁI HIỆN TẠI và không thừa hưởng sự nói quá của plan: `sed -n '655,676p;898,918p;1256,1257p;1338,1342p' packages/coding-agent/src/extensibility/extensions/types.ts`. Rồi xác nhận extension API thật sự không có method đóng góp MCP nào: `grep -n 'registerMcp\|registerMcpServer\|McpServer' packages/coding-agent/src/extensibility/extensions/types.ts` không trả về gì. *(anchor: `packages/coding-agent/src/extensibility/extensions/types.ts:663`)*

4. **Thiết lập đính chính mà plan cần nhất, vì nó đổi cả khuyến nghị: một extension PACKAGE đã đóng góp MCP server theo cách khai báo.** Đọc `sed -n '275,280p;293,300p;355,370p;423,429p' packages/coding-agent/src/discovery/omp-plugins.ts` và xác nhận hai provider anh em tại `discovery/agent-plugins.ts:335` và `discovery/claude-plugins.ts:737`. Tài liệu thiết kế phải mở đầu bằng cách phát biểu đúng lỗ hổng: việc package đóng góp theo kiểu khai báo ĐÃ CÓ TRONG CÂY, việc đóng góp theo mệnh lệnh lúc runtime thì không tồn tại. Đừng viết 'extensions cannot contribute MCP servers' ở bất kỳ đâu trong tài liệu — điều đó sai, và một người review biết codebase sẽ ngừng đọc ngay đó. *(anchor: `packages/coding-agent/src/discovery/omp-plugins.ts:423`)*

5. **Viết hai kiến trúc như hai phương án thật**, mỗi phương án kèm chế độ hỏng của nó. (A) SERVER DESCRIPTOR: extension trao cho core một descriptor; core đóng dấu `_source`, sở hữu credential và vòng đời connection, rồi gọi `MCPManager.connectServers` vốn đã là public; teardown là `disconnectServer(name)` khoá theo `mcpServerName`. (B) CONFIG WRITE: extension tự ghi MCP config. Với (B), hãy viết ra thiệt hại cụ thể chứ không phải khẩu hiệu: nó tạo ra một kho thứ hai nằm ngoài capability registry (đúng vấn đề mà Option A của WI-8a sinh ra để giải), nó đặt dữ liệu do extension soạn vào một file mà `setMcpServerEnabled` sau này sẽ viết lại, và nó tái tạo nguyên văn một chế độ hỏng mà dashboard đã phải lách cho các server do package đóng góp — `#writableMcpSourcePath` tại `packages/tui/src/overlays/extensions/extension-dashboard.ts:449-453` chỉ allowlist `native` và `mcp-json`, nên file do plugin sở hữu không bao giờ được ghi. Hãy gọi đích danh hàm đó; nó là lập luận mạnh nhất trong tài liệu và nó đã nằm sẵn trong cây. *(anchor: `packages/tui/src/overlays/extensions/extension-dashboard.ts:449`)*

6. **Ghi lại khuyến nghị (A) kèm lý do**, và — phát hiện mang tính quyết định — nói rõ rằng nó KHÔNG cần vòng đời mới nào. Đọc `sed -n '656,700p' packages/coding-agent/src/mcp/manager.ts` và viết ra bốn sự thật: `connectServers` là public và đã tăng dần; nó nhận một `Record<string, SourceMeta>` và đóng dấu nó lên cả `#sources` lẫn `_source` của bất kỳ connection sẵn có nào (`:690-696`); nó bỏ qua các tên đã connect hoặc đang in-flight (`:700-712`); và `disconnectServer(name)` là teardown đối xứng (`:1242`). Rồi đọc comment sở hữu tại `:937-941` và nhận luôn quy tắc đó một cách tường minh: quyền sở hữu được khớp qua `mcpServerName`, KHÔNG BAO GIỜ qua tiền tố tên đã sanitize `mcp__<name>_`, vì 'atlassian' có thể là tiền tố của 'atlassian:atlassian' và một server có ký tự đã sanitize không bao giờ khớp tiền tố với chính tool của nó. Đây là thứ hữu ích nhất mà tài liệu mang lại — nó biến 'một bản build cỡ M lớn' thành 'một producer cho hai bản ghi cộng một chỉ mục chủ sở hữu'. *(anchor: `packages/coding-agent/src/mcp/manager.ts:664`)*

7. **Định kiểu descriptor đề xuất theo hình dạng chuẩn** và nói nó bỏ gì. `sed -n '15,74p' packages/coding-agent/src/capability/mcp.ts` — descriptor là MCPServer TRỪ `_source` (core sở hữu provenance; extension không bao giờ được phép giả mạo server đến từ đâu). Gọi tên ba trục gia cố và nói một server do extension đóng góp có kế thừa chúng hay không: `envPolicy: "literal"` (`:36`), `envLiteralKeys` (`:38`), `headerPolicy: "origin-locked"` (`:50`). Một server do extension đóng góp mà lặng lẽ thoát khỏi việc ghim header origin-locked sẽ chuyển tiếp header đã cấu hình qua các origin khác. Nếu tài liệu không giải quyết mấy điều này, bản build sẽ giải quyết. *(anchor: `packages/coding-agent/src/capability/mcp.ts:15`)*

8. **Viết đề xuất approval-parity với các con số thật**, và đánh dấu phát hiện mà plan không thể có. Các tier hôm nay là: `MCPTool.approval` hardcode `readonly approval = "write" as const;` tại `mcp/tool-bridge.ts:656`; `DeferredMCPTool.approval` là phép hardcode y hệt tại `:771` — cả hai đều vô điều kiện, không cái nào suy ra từ config của server, nên một server stdio spawn subprocess và một server http POST tới host từ xa chia sẻ một tier. Tool do extension đăng ký mặc định CHẶT HƠN: `ToolDefinition.approval` tại `extensions/types.ts:658` được tài liệu hoá là mặc định `"exec"` khi bị bỏ trống. Vậy cách đọc nguồn thiên về 'parity' là ngược, và tài liệu phải nói thẳng điều đó. Rồi ghi lại phát hiện về nhánh với tới được: `tools/approval.ts:369-371` chỉ đẩy 'Origin: MCP server tool' khi `tool.name.startsWith("mcp__") && tool.approval === undefined`, và vì cả hai lớp tool MCP luôn đặt `approval`, dòng đó không bao giờ bắn được với một tool do manager mint ra — nên hôm nay prompt phê duyệt không bao giờ tiết lộ nguồn gốc MCP. Hãy quyết định dứt khoát liệu server được đóng góp có nhận một tier riêng và liệu dòng đó có trở nên với tới được hay không; im lặng ở đây chính là thứ plan cảnh báo. *(anchor: `packages/coding-agent/src/mcp/tool-bridge.ts:656`)*

9. **Nói phụ thuộc WI-0 như một tiền điều kiện kiểm chứng được**, chứ không phải một cảm giác. Viết: `isProjectTrusted(): boolean` được khai báo tại `extensions/types.ts:494` và `:561` và hardcode `() => true` tại `extensions/runner.ts:1264` và `session/agent-session.ts:7406`, nên hôm nay phép kiểm tra tin cậy không thể thất bại. Vì vậy 'server được đóng góp kế thừa project trust tier' tại HEAD này, tương đương với 'server được đóng góp không có tier nào' — và tiền điều kiện để thiết kế này có ý nghĩa là `grep -n 'isProjectTrusted: () => true' packages/coding-agent/src` phải ngừng trả về hai hit. Một thiết kế nêu tên một tier mà thiếu câu này là đang mô tả một tier không tồn tại. *(anchor: `packages/coding-agent/src/extensibility/extensions/runner.ts:1264`)*

10. **Trả lời câu hỏi credential (câu hỏi mở số 3)** hoặc đánh dấu rõ là chưa giải quyết kèm người chịu trách nhiệm. Kho OAuth của core được khoá theo URL của server — `mcpOAuthCredentialIdsForServerUrl` tại `mcp/oauth-credentials.ts:24` — và luồng refresh ghi lại qua `refreshManagedMcpOAuthCredential` (`:105`). Một extension được phép đóng góp server OAuth do đó có thể chỉ đích một URL mà người dùng đã có credential. Tài liệu hoặc phải làm cho server được đóng góp không đủ điều kiện dùng managed OAuth, hoặc phải nói rằng việc phân giải credential được namespaced theo từng extension. Đừng để lại điều này như một đoạn văn nghe có vẻ đã quyết. *(anchor: `packages/coding-agent/src/mcp/oauth-credentials.ts:24`)*

11. **Trả lời câu hỏi enable/disable (câu hỏi mở số 4) bằng code, không bằng trực giác.** Truy vết `setMcpServerEnabled` (`mcp/config-writer.ts:333-379`): khi server không nằm trong bất kỳ candidate path nào ghi được, thao tác disable thêm nó vào denylist `disabledServers` ở tầng user và enable thêm nó vào allowlist `enabledServers`. Hãy nói server được descriptor đóng góp rơi vào nhóm nào, và xác nhận UX được chủ đích là một công tắc tắt ở tầng từng user, sống sót cùng với việc extension còn hiện diện — chứ không phải một cờ `enabled` do extension sở hữu mà công tắc của người dùng không thể ghi đè. *(anchor: `packages/coding-agent/src/mcp/config-writer.ts:333`)*

12. **Viết mục 'những gì không quyết ở đây'**, và đặt việc không ai sở hữu bản build vào đó. §8.2 của plan ghi rằng việc đóng góp MCP không có chủ sở hữu và không có milestone, và plan không có khái niệm phase — vì vậy tài liệu không được nói 'Phase 4' hay 'Phase 5'. Hãy nói thay: thiết kế này được merge dưới M2; bản build thì chưa có chủ; phải gán một cái tên và một thời hạn trước khi M2 đóng lại. Khuyến nghị bản build được xếp lịch SAU WI-9 (wave 7), vì việc gỡ một extension đang sở hữu một connection sống là một bài toán quản lý kiểm kê tài nguyên mà WI-9 đã giải, không phải một bài toán mới. *(anchor: `docs/mcp-server-contribution-by-extensions.md` — file đang viết)*

13. **Thêm hai dòng trỏ:** một trong `docs/extensions.md` quanh `:392`, ghi rằng một extension đã nạp hiện không thể đóng góp MCP server và trỏ sang tài liệu mới; một trong `docs/mcp-config.md` tại `:40` hoặc trong danh sách thứ tự ưu tiên tại `:484-495`, ghi rằng việc đóng góp ở tầng package theo kiểu khai báo ĐÃ CÓ, còn việc đóng góp lúc runtime theo mệnh lệnh thì đã thiết kế nhưng chưa build. Cả hai đều dài MỘT dòng. Đừng mở rộng mục nào. *(anchor: `docs/extensions.md:392`)*

14. **Xác nhận PR không chứa thay đổi source nào:** `git status --porcelain -- docs packages` phải chỉ liệt kê ba dòng tài liệu — trong đó file mới phải ở trạng thái `??` (untracked), vì `git diff --stat HEAD` không bao giờ thấy một file chưa stage. Nếu `packages/coding-agent/src/**` xuất hiện ở bất kỳ đâu, hạng mục này đã bị hiện thực hoá thay vì được thiết kế — điều nằm ngoài phạm vi M2 một cách tường minh và sẽ đưa một public API không ai sở hữu vào cây trên một thế trạng tin cậy mà chưa ai viết ra. *(anchor: repo root)*

### Hình dảng code

```typescript
// Chỉ là sketch thiết kế — không dòng nào ở đây được viết dưới hạng mục này.
// Điểm của sketch là cho thấy phương án được khuyến nghị cần một producer và một
// chỉ mục chủ sở hữu, không phải một vòng đời mới.

// Bề mặt đề xuất hướng về extension (KHÔNG thêm dưới M2).
// Descriptor là MCPServer (capability/mcp.ts:15-74) TRỪ `_source`:
// core đóng dấu provenance để extension không thể giả mạo một server đến từ đâu.
interface McpServerDescriptor {
	name: string;
	enabled?: boolean;
	timeout?: number;
	command?: string;   // stdio
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	url?: string;      // http | sse
	headers?: Record<string, string>;
	transport?: "stdio" | "sse" | "http";
	auth?: MCPServer["auth"];
	oauth?: MCPServer["oauth"];
}

// Trên ExtensionAPI (extensions/types.ts:1256), cạnh các method register* khác
// (:1347 registerTool, :1411 registerCommand, :1430 registerFlag):
registerMcpServer(descriptor: McpServerDescriptor): void;

// Phía core — mọi bước bên dưới đã tồn tại. Bản build là một producer cộng một map.
class McpServerRegistry {
	#byExtension = new Map<string, Set<string>>();  // extensionId -> server names

	async #connect(extensionId: string, source: SourceMeta, descriptor: McpServerDescriptor) {
		// TODO(build): cần bộ chuyển MCPServer -> MCPServerConfig (chưa tồn tại;
		// MCPServerConfig là union stdio|http|sse tại mcp/types.ts:145, khác shape MCPServer).
		const config: MCPServerConfig = /* TODO(build) */ ({} as MCPServerConfig);
		// Đã public, đã tăng dần, đã đóng dấu source (:690-696).
		await this.#manager.connectServers({ [descriptor.name]: config }, { [descriptor.name]: source });
		this.#byExtension.get(extensionId)?.add(descriptor.name);
	}

	// Teardown. Quyền sở hữu được khớp qua mcpServerName, TUYỆT ĐỐI KHÔNG
	// qua tiền tố đã sanitize mcp__<name>_ — xem comment tại manager.ts:937-941
	// ('atlassian' so với 'atlassian:atlassian').
	async #disconnectAll(extensionId: string) {
		for (const name of this.#byExtension.get(extensionId) ?? []) {
			await this.#manager.disconnectServer(name);   // manager.ts:1242
		}
		this.#byExtension.delete(extensionId);
	}
}

// Trust tier, dưới dạng MỘT câu mà người review có thể phản bác — thứ mà
// bước 2 bắt buộc có trước khi bất cứ dòng nào ở trên được viết. Tại HEAD 808b6
// isProjectTrusted là `() => true` (runner.ts:1264, session/agent-session.ts:7406),
// nên tier nào được chọn ở đây hiện đều là một no-op và tài liệu phải nói thẳng.
```

### Hợp đồng test

Không có test dưới M2, và đó là công cụ đúng chứ không phải lỗ hổng — `AGENTS.md` cấm test hình thức/rỗng cho một tài liệu quyết định, và không gì trong cây thay đổi, nên không có hành vi nào để quan sát. Thêm một test ở đây hoặc là mệnh đề vô nghĩa, hoặc là đang hiện thực hoá hạng mục, điều mà chính hạng mục này tường minh không làm.

Nếu và khi bản build bao giờ được xếp lịch, hợp đồng nghiệm thu mà tài liệu thiết kế phải viết trước NGAY BÂY GIỜ (vì chính mục 'Chỗ dễ sai' của plan nói đó là thứ bị rơi mất giữa chừng khi hiện thực hoá) là điều này: tool của một MCP server do extension đóng góp phải với tới được qua ĐƯỜNG MCP tool thông thường — cùng cách mint `mcp__<server>_<tool>`, cùng khoá sở hữu `mcpServerName`, cùng một loader entry trong `mcp/loader.ts` định dạng `mcp:<server> via <providerName>` (`loader.ts:92-107`) — và phải mang CÙNG approval gating như mọi MCP tool khác. Mệnh đề cuối cùng mới là hợp đồng, và đó là một hợp đồng có răng: hôm nay `MCPTool.approval` và `DeferredMCPTool.approval` đều hardcode `"write"` (`tool-bridge.ts:656`, `:771`) không có đầu vào per-server, nên một thiết kế hứa parity mà không quyết định server được đóng góp có miễn trừ, bằng, hay chặt hơn phép hardcode đó thì đã hứa một thứ không thiết kế nổi. Test bảo vệ nó phải khẳng định approval đã phân giải cho tool của một server được đóng góp BẰNG approval đã phân giải cho một server cùng tên được đóng góp bởi một `.mcp.json` — một khẳng định so chênh lệch với đường đi sẵn có, TUYỆT ĐỐI không phải một literal `"write"` hardcode, vì một literal hardcode sẽ vẫn pass vào ngày ai đó đổi tier cho tất cả và sẽ không chứng minh gì về parity.

Cũng phải viết trước: phát hiện về việc tiết lộ nguồn gốc. `tools/approval.ts:369-371` chỉ phát ra 'Origin: MCP server tool' khi `approval === undefined`, và cả hai lớp tool MCP luôn đặt nó, nên nhánh đó hôm nay không với tới được. Việc server được đóng góp có làm cho nhánh đó với tới được hay không là một quyết định thiết kế, và một test khẳng định trên văn bản prompt chỉ nên viết sau quyết định đó — khẳng định cái nhánh chết hiện tại sẽ đóng bức tường lại một bug.

Điều hạng mục này TUYỆT ĐỐI KHÔNG được làm: bàn giao một test đọc `extensions/types.ts` và khẳng định `registerMcpServer` không tồn tại. Đó là source grep, bị `AGENTS.md` cấm, và nó sẽ biến việc merge tài liệu thiết kế thành một test fail vào đúng ngày bản build xuống đất — tức là nó sẽ chủ động trừng phạt công việc tiếp theo. Danh sách `test_files` trong spec là rỗng, và đó là chủ ý.

### Xác minh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && git rev-parse --short HEAD
#   expected: 808b365

# Sản phẩm là văn xuôi, nên cách kiểm chứng là: tài liệu tồn tại, ba dòng trỏ đã xuống đất,
# và KHÔNG có gì dưới packages/ đổi.
cd /Users/tranquangdang21/Projects/ultraworkers && git status --porcelain -- docs packages
#   expected: đúng ba dòng dạng ' M docs/extensions.md', ' M docs/mcp-config.md',
#   '?? docs/mcp-server-contribution-by-extensions.md' — và KHÔNG có dòng nào
#   trỏ vào packages/. '??' là bắt buộc: file mới chưa stage là untracked nên
#   `git diff --stat HEAD` không bao giờ thấy nó. Nếu muốn dùng diff, phải
#   `git add -A` trước rồi `git diff --cached --stat HEAD`.

# Kiểm lại các neo (chạy TRƯỚC TIÊN nếu HEAD đã dịch chuyển):
cd /Users/tranquangdang21/Projects/ultraworkers && grep -n 'mcpServerName?: string;\|mcpToolName?: string;\|export interface McpNotificationEvent\|export interface ExtensionAPI\|on(event: "mcp_notification"' packages/coding-agent/src/extensibility/extensions/types.ts
#   expected: 663, 665, 904, 1256, 1340
cd /Users/tranquangdang21/Projects/ultraworkers && grep -n 'registerProvider<MCPServer>\|registerProvider(mcpCapability' packages/coding-agent/src/discovery/ | wc -l
#   expected: 12
cd /Users/tranquangdang21/Projects/ultraworkers && grep -n 'async connectServers(\|async disconnectServer(' packages/coding-agent/src/mcp/manager.ts
#   expected: 664, 1242
cd /Users/tranquangdang21/Projects/ultraworkers && grep -n 'readonly approval = ' packages/coding-agent/src/mcp/tool-bridge.ts
#   expected: 656, 771 — cả hai đều là "write"; nếu một trong hai đã đổi, phần approval của tài liệu đã cũ
cd /Users/tranquangdang21/Projects/ultraworkers && grep -rn 'isProjectTrusted: () => true' packages/coding-agent/src
#   expected: 2 hit (runner.ts:1264, session/agent-session.ts:7406). Nếu lệnh này trả về KHÔNG,
#   WI-0 đã xuống đất và bước 9 của spec — cùng trust tier — phải được xem lại trước khi viết.
cd /Users/tranquangdang21/Projects/ultraworkers && grep -n '#writableMcpSourcePath' packages/tui/src/overlays/extensions/extension-dashboard.ts
#   expected: :421 (call site) và :449 (định nghĩa)

cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
#   Kỳ vọng xanh — nhưng lưu ý nó KHÔNG chứng minh gì cho hạng mục này: không có dòng
#   source nào đổi. Chạy nó là để bắt nhầm sửa ngoài ý muốn, không phải bằng chứng thiết kế đúng.

# Bị chặn trong môi trường này, không phải lỗi: native addon chưa build, nên
# `bun test` báo 0 pass kèm "Failed to load pi_natives native addon for darwin-arm64".
# Build bằng `bun --cwd=packages/natives run build` trước khi tin một lần `bun test` xanh.
# Hạng mục này không viết test nên dù sao cũng không chặn.
```

### Cổng hoàn thành

XONG khi cả năm điều sau cùng đúng. (a) `docs/mcp-server-contribution-by-extensions.md` tồn tại và chứa, dưới dạng văn bản tìm được, tất cả sáu phần bắt buộc liệt ở hàng 1 của bảng file ở trên — đặc biệt là một trust tier được nêu thành MỘT câu mà người review có thể phản bác, và đề xuất approval-parity viết theo các tier thật chứ không phải giả định. (b) `git status --porcelain -- docs packages` liệt kê đúng ba dòng tài liệu và không có gì dưới `packages/` — một thay đổi source ở đây nghĩa là hạng mục đã bị hiện thực hoá thay vì được thiết kế, và §8.2 đặt việc đó ngoài M2 với không ai sở hữu. (c) Tiền đề của tài liệu khớp với cây: nó nói rằng việc package đóng góp theo kiểu KHAI BÁO đã có (ba provider, `omp-plugins.ts:423` / `agent-plugins.ts:335` / `claude-plugins.ts:737`) và lỗ hổng là việc đóng góp theo MỆNH LỆNH lúc runtime. Nếu tài liệu nói rằng extension không thể đóng góp MCP server nào cả, nó sai và phải sửa — một người review biết codebase sẽ dừng đọc ngay đó. (d) Một maintainer con người đã trả lời trust tier và câu hỏi credential trong các issue đang mở hoặc ngay trong tài liệu, có ghi tên và thời điểm, và tài liệu ghi lại ai và khi nào. Một trust tier chưa được trả lời KHÔNG phải là đạt, dù mọi thứ khác đều xanh. (e) Một maintainer khác tác giả đã đọc tài liệu và có thể trả lời mà không cần đọc code câu hỏi 'nếu tôi cài một extension đăng ký MCP server, mạng của tôi và credential của tôi sẽ ra sao' — nếu họ không trả lời được, tài liệu chưa xong bất kể dài bao nhiêu.

Sản phẩm nghiệm thu là một quyết định mà maintainer có thể review, không phải một bản build pass. Không có gì trong cây để test, và giả vờ có sẽ biến một S thành một M.

**Cổng có thực sự đỏ được không, và vì sao:** Có — nhưng chỉ trên bốn trong năm điều khoản, và đáng nói rõ là điều khoản nào. Điều khoản (b) đỏ cứng và cơ khí: chạm bất kỳ file nào dưới `packages/` là `git status --porcelain -- docs packages` hiện ngay. Điều khoản (c) đỏ nếu tài liệu lặp lại sự nói quá của plan — đó là một phép kiểm thật vì chính văn bản của plan chứa lỗi đó và một kỹ sư làm theo trung thành sẽ tái tạo nó. Điều khoản (d) chỉ đỏ nếu một con người có kỷ luật; không có gì cơ khí nào phát hiện một trust tier chưa được trả lời, và đó chính là lý do nó được viết thành một điều khoản cứng chứ không phải một gợi ý. Điều khoản (e) chỉ đỏ qua một lượt đọc của con người.

Điều cổng KHÔNG bắt được, và spec không nên giả vờ ngược lại: nó không phát hiện được một thiết kế nêu tên một trust tier mà nói sai về tier đó, và nó không phát hiện được việc thiết kế bị lặng lẽ biến thành một kế hoạch build bởi người đọc sau này lướt qua mục 'không quyết ở đây'. Đó chính là phụ thuộc con người mà yêu cầu gán việc của §11.3 tồn tại để đối phó. Cân bằng cơ khí duy nhất là điều khoản (b), bắt được lỗi phổ biến nhất — ai đó 'cứ thêm cái method thôi' vì tài liệu thiết kế làm cho nó trông dễ. Vì đây là hạng mục wave 8, và cổng của wave 8 là một buổi review thiết kế của con người chứ không phải một build, nên điều đó trung thực nhưng yếu nếu đứng một mình; phần củng cố nằm ở (d) và (c). Lỗ hổng còn lại là một người review tin vào mô tả tự tham chiếu của tài liệu vẫn có thể gạt một thiết kế mà khuyến nghị trung tâm của nó là sai — lập luận chống lại Option B dựa vào việc trích dẫn `#writableMcpSourcePath`, nên nếu trích dẫn đó có mặt thì lập luận là kiểm chứng được, còn nếu vắng thì người review nên coi khuyến nghị là không có bằng chứng. Hạng mục cùng wave (WI-11) dùng chung hình dạng cổng này; hai hạng mục phải được review cùng nhau, vì WI-8a chọn substrate settings còn WI-12 chọn substrate MCP, và người đọc lấy cái này làm chuẩn và cái kia làm phương án thay thế thì đã đọc sai cả hai.

### Phụ thuộc

**Phụ thuộc vào (`depends_on`):**

- **WI-0** — mô hình tin cậy extension phải được quyết và viết ra trước. Đã kiểm chứng là không chỉ còn bỏ ngỏ mà còn bị cắm sẵn: `isProjectTrusted(): boolean` được khai báo tại `extensions/types.ts:494` và `:561` và hiện thực thành `() => true` tại `extensions/runner.ts:1264` và `session/agent-session.ts:7406`. Một MCP server do extension đóng góp kế thừa phép kiểm tra đó, và hôm nay nó không thể thất bại.
- **WI-10** — phải nói, dưới dạng YES/NO/DEFERRED tường minh, cái nào trong năm (hay sáu) bề mặt ghi là canonical cho việc đóng góp MCP. Tài liệu thiết kế này không được lặng lẽ trở thành câu trả lời đó; nếu nó trở thành, WI-10 đã bị đi trước.

**Chặn (`blocks`):** Không gì bên trong M2. Bản build mà thiết kế này mở đường cho chưa có chủ sở hữu theo §8.2 và phải được gán một cái tên cùng một thời hạn trước khi M2 đóng lại — việc gán đó là quyết định của con người mà spec này không đưa ra.

### Cách sai dễ nhất

Viết tài liệu thiết kế như thể câu hỏi phê duyệt đã được chốt. Việc đóng góp một server là một kiểu quyết định tin cậy khác hẳn việc đóng góp một tool — nó mang theo một vòng đời connection, một đường đi credential, và một đích mạng ra ngoài — và nó kế thừa thế trạng chưa được trả lời của WI-0, thế trạng đó không chỉ là chưa quyết mà còn bị hardcode theo hướng cấp quyền: `isProjectTrusted()` là `() => true` ở CẢ `runner.ts:1264` lẫn `session/agent-session.ts:7406`. Nếu tài liệu nêu tên một trust tier mà không trả lời câu đó, phần hiện thực sẽ tự chọn một cách lặng lẽ và hành vi được bàn giao sẽ là bất cứ điều gì `MCPManager` tình cờ làm.

### Cần người quyết

Các câu chặn việc bắt đầu:

- **TRUST TIER** — câu phải được trả lời trong tài liệu, không được hoãn: một MCP server do extension đã nạp đóng góp rơi vào tier nào, và ai là người uỷ quyền cho connection? Cụ thể là (a) cùng tier với một server `.mcp.json` ở tầng project, tức auto-connect khi nạp, (b) cùng tier với một server ở user-scope nhưng có chặn theo việc extension đáng tin, nên kế thừa câu trả lời của WI-0, hay (c) luôn đòi một grant rõ ràng cho từng server trước connection đầu tiên. Đây không phải chi tiết nhỏ: (a) nghĩa là bất kỳ extension nào được nạp cũng có thể mở một connection mạng ra ngoài tới một URL tuỳ ý mà không hề có prompt, tức bán kính ảnh hưởng lớn hơn hẳn việc đăng ký một tool. Nếu tài liệu chọn (a) mà không nói đúng những chữ đó, nó chưa trả lời câu hỏi. Lưu ý phần cắm sẵn hiện tại khiến cả ba lựa chọn trông giống hệt nhau trong code hôm nay — xem đính chính về `isProjectTrusted` — nên lựa chọn đó vô hình cho tới khi ai đó thay đổi phần cắm sẵn.

Các câu còn lại, cần giải quyết trong tài liệu nhưng không chặn việc bắt đầu viết (bước 1–5 không phụ thuộc chúng):

- Descriptor có bắt buộc phải khai báo lúc nạp thôi không, hay một extension còn sống có thể đăng ký server muộn hơn (từ một tool call, một event handler)? Plan không nói. Chỉ-khai-báo (lúc nạp) nhỏ hơn hẳn và cũng là điều đường package hiện có đang làm; khai-báo-muộn theo mệnh lệnh mới là cái mà chữ 'extension' thường gợi ra, và nó là trường hợp buộc phải có một lời gọi `connectServers` trên đường nóng. Nên khuyến nghị chỉ-lúc-nạp trong tài liệu và nói lý do — một lần đăng ký muộn là một event mới trên manager, và đó chính là bài toán `registerMode` của WI-7 đội mũ khác.
- Quyền sở hữu credential: một server được đóng góp có `auth.type === "oauth"` cần một ô credential. Kho OAuth của core khoá theo URL của server (`mcpOAuthCredentialIdsForServerUrl`, `mcp/oauth-credentials.ts:24`) và luồng refresh ghi lại qua `refreshManagedMcpOAuthCredential` (`:105`) / `refreshStoredManagedMcpOAuthCredential` (`:159`). Nếu một extension được phép đóng góp server OAuth, một `url` do extension soạn có thể trùng với credential id mà người dùng đã có cho URL đó. Tài liệu phải nói liệu server được đóng góp có bị loại khỏi managed OAuth không, hay việc phân giải credential được namespaced theo từng extension. Bỏ qua điều này là cách một extension của bên thứ ba lọt vào đọc token của người dùng cho một URL do chính nó chọn.
- Level và provenance của server do extension đóng góp: `SourceMeta` bắt buộc có `path`, `provider`, `providerName` và `level: "user" | "project" | "native"` (`capability/types.ts:139-156`). Một server đóng góp lúc runtime không có file, không có provider trong danh mục hiện có, và `level` của nó đi thẳng vào cổng chặn `state-manager.ts:60` (`source.level === "user" && !isUserSourceEnabled(...)` → disabled, lý do `user-opt-in`, cùng trục `isSourceEnabled` ở `extensibility/skills.ts:163-185`). Chọn level nào, provider id nào, và path giả hay path rỗng — tài liệu phải trả lời, vì đây là chỗ lớp "chỉ là một producer" của bản build hấp thụ.
- Ngữ nghĩa enable/disable: hôm nay toggle của dashboard với một nguồn không phải `native` và không phải `mcp-json` cố ý KHÔNG ghi file của nguồn đó — `#writableMcpSourcePath` (`packages/tui/src/overlays/extensions/extension-dashboard.ts:449-453`) allowlist đúng `native` và `mcp-json` và trả về `undefined` cho mọi provider khác, nên toggle rơi xuống denylist/allowlist ở tầng user `disabledServers` / `enabledServers` trong `setMcpServerEnabled` (`mcp/config-writer.ts:333-379`, nhánh else ở cuối). Một server được đóng góp qua descriptor rơi vào đúng nhóm đó. Hãy xác nhận đó là UX được chủ đích (một công tắc tắt ở tầng từng user, sống sót cùng với việc extension có mặt) chứ không phải một cờ `enabled` do extension sở hữu mà toggle của người dùng không được phép ghi đè.
- Tài liệu thiết kế này có quyết bề mặt ghi không, hay hoãn cho WI-10? Plan liệt kê WI-10 là phụ thuộc, và tài liệu này nên nêu câu trả lời MCP như một ĐỀ XUẤT cần đối chiếu với WI-10, chứ không phải một tuyên bố canonical-surface đã chốt. Nếu WI-10 đã xuống đất vào lúc viết, đây chỉ là một câu đối chiếu — hãy kiểm tra trước khi viết.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Plan §WI-12: 'Extension API tiêu thụ được MCP ... nhưng KHÔNG đóng góp được server — config MCP do core sở hữu qua `mcpSettings` cộng writer `setMcpServerEnabled` của dashboard.' | STALE AND MATERIALLY OVERSTATED — tiền đề sai một nửa, và nửa sai đó đổi kiến trúc nào là đúng | Nửa `ExtensionAPI` là đúng: `ExtensionAPI` (`extensions/types.ts:1256`) không khai báo method đóng góp MCP nào, và các thành viên MCP duy nhất đều là chiều vào (`types.ts:663`, `:665`, `:1340`, `904-916`). Nhưng một extension PACKAGE đã đóng góp MCP server hôm nay, theo kiểu khai báo. Ba provider đăng ký capability `mcps`: `registerProvider<MCPServer>(mcpCapability.id, …)` tại `discovery/omp-plugins.ts:423`, `discovery/agent-plugins.ts:335`, và `discovery/claude-plugins.ts:737` — tổng cộng 12 provider đăng ký. omp-plugins đọc `.mcp.json` / `mcp.json` từ package root (`MCP_FILENAMES` tại `omp-plugins.ts:275`, `loadMCPServers` tại `:293-369`, đăng ký tại `:423`), và `docs/mcp-config.md:40` cùng `:489-491` đã tài liệu hoá extension package là một nguồn MCP, xếp #2 trong thứ tự ưu tiên discovery. Lỗ hổng thật vì thế hẹp hơn và phải được phát biểu đúng: một extension module ĐÃ NẠP và còn sống không thể đóng góp server theo mệnh lệnh lúc runtime. Phân biệt đó mang tính quyết định — Option B bên dưới không chỉ là bất lợi, nó là một hồi quy so với một đường đã được bàn giao. |
| Plan §WI-12 file path: `extensibility/extensions/types.ts:1315` (thành viên MCP duy nhất của API — chiều vào). | STALE by +25 | Thành viên MCP duy nhất của bề mặt API nằm ở `types.ts:1340`: `on(event: "mcp_notification", handler: ExtensionHandler<McpNotificationEvent>): void;` — overload `on(...)` cuối cùng trong khối event chạy `:1290-1340`. Đã xác nhận đây là thành viên MCP DUY NHẤT: `grep -n 'mcp' packages/coding-agent/src/extensibility/extensions/types.ts` trả về đúng sáu hit (`:663`, `:665`, `:711`, `:905`, `:908`, `:1340`) và `:711` là doc comment của `SourceInfo.source`, không phải một thành viên. Bằng chứng: `grep -n 'mcp' packages/coding-agent/src/extensibility/extensions/types.ts` tại HEAD 808b365; file dài 1849 dòng. |
| Plan §WI-12 file path: `types.ts:638`/`:640` (mcpServerName / mcpToolName) và `:879-883` (McpNotificationEvent). | STALE by +25 (trôi đồng nhất trên cả ba neo trong file này) | Neo đúng: `mcpServerName?: string;` tại `types.ts:663` với doc comment ở `:662`; `mcpToolName?: string;` tại `:665` với doc comment ở `:664`; `export interface McpNotificationEvent` tại `:904` chạy tới `:916` (`type: "mcp_notification"` `:905`, `server: string` `:911`, `method: string` `:913`, `params: unknown` `:915`). Nó được hợp nhất vào event map tại `:1149`. Độ trôi +25 tương tự áp dụng cho các trường `ToolDefinition` của extension tool mà lập luận Option B của plan dựa vào: `approval?: ToolApproval` tại `:658` (doc comment `:656-657` nói mặc định `"exec"` khi bị bỏ trống) và `sourcePath?: string` tại `:672`. Cặp giống hệt bị nhân bản trên `CustomTool` nội bộ tại `custom-tools/types.ts:213-215` và `:221`. Bằng chứng: `grep -n 'mcpServerName\|mcpToolName\|McpNotificationEvent\|approval?:\|sourcePath?:' packages/coding-agent/src/extensibility/extensions/types.ts packages/coding-agent/src/extensibility/custom-tools/types.ts` tại HEAD 808b365. |
| Plan §WI-12 file path: quyền sở hữu của core tại `mcp/config-writer.ts` qua `modes/components/extensions/dashboard-runtime.ts:41-49`. | NEARLY EXACT — lệch một dòng, và cách mô tả ai sở hữu MCP config là sai | `persistMcpToggle` nằm ở `dashboard-runtime.ts:40-48` (bản thân lời gọi `setMcpServerEnabled({...})` là `:41-47`, các call site tại `:42` và `:44` là hai dòng `getMCPConfigPath`) và `applyMcpToggle` ở `:49-62`. Neo `:41-49` cắt qua ranh giới giữa hai thành viên. Quan trọng hơn, `config-writer.ts` KHÔNG phải nơi core sở hữu MCP config — nó là một writer cho dashboard toggle, và chính doc comment của nó nói vậy: `SetMcpServerEnabledOptions.sourcePath` tại `config-writer.ts:297-306` yêu cầu caller 'Provide ONLY for formats this codebase owns (native `.omp/mcp.json` and `mcp-json`) ... Tool-owned configs MUST be omitted; we never mutate another tool's file.' Quyền sở hữu thật là capability registry — `MCPServer` tại `capability/mcp.ts:15-74` và `mcpCapability` tại `:108-129` với `key: server => server.name`, `equivalent: isSameMCPConnection`, `toExtensionId: server => 'mcp:' + server.name` — được hợp nhất bởi `loadAllMCPConfigs` tại `mcp/config.ts:103` thành các bản ghi `configs` / `sources` thành cặp. Module `mcpSettings` (`mcp/settings.ts`) là cái bẫy cho thiết kế này: nó giữ năm UI setting đã đăng ký (enableProjectConfig, startupTimeoutMs, renderMarkdownResults, notifications, notificationDebounceMs) và không có danh mục server nào. Bằng chứng: `cat -n packages/coding-agent/src/modes/components/extensions/dashboard-runtime.ts` (80 dòng, đọc trọn); `cat -n packages/coding-agent/src/capability/mcp.ts`; `cat -n packages/coding-agent/src/mcp/settings.ts`; `grep -n '^export' packages/coding-agent/src/mcp/config-writer.ts`. |
| Plan §WI-12 mục 'Chỗ dễ sai' và 'Test cần viết': đề xuất approval-parity ('tools of an extension-registered MCP server appear through the normal MCP tool path, with the same approval gating as any other tool') là thứ phân biệt thiết kế được khuyến nghị với phương án ghi config. | UNDERSPECIFIED — đề xuất không thể kiểm chứng như đang viết, vì các tier hiện tại không phải thứ plan giả định | Hãy viết với các con số thật, và ghi nhận rằng trạng thái hôm nay tự nó cũng là một sản phẩm phái sinh. `MCPTool.approval` bị hardcode `readonly approval = "write" as const;` tại `mcp/tool-bridge.ts:656` và `DeferredMCPTool.approval` là phép hardcode y hệt tại `tool-bridge.ts:771` — cả hai đều vô điều kiện, không cái nào suy ra từ config của server, nên một server stdio spawn subprocess và một server http POST tới host từ xa nằm cùng một tier. Trong khi đó đường extension tool lại mặc định CHẶT HƠN: `ToolDefinition.approval` (`extensions/types.ts:658`) được tài liệu hoá là mặc định `"exec"` khi bị bỏ trống. Vậy cách đọc nguồn về 'parity' là ngược — một tool do extension đăng ký đã bị chặn ở `exec` trong khi một MCP tool bị chặn ở `write`. Hệ quả mà thiết kế buộc phải xử lý: nhánh tại `tools/approval.ts:369-371`, `if (tool.name.startsWith("mcp__") && tool.approval === undefined) { lines.push("Origin: MCP server tool"); }`, hiện KHÔNG VỚI TỚI ĐƯỢC với các MCP tool do manager mint ra, vì cả hai lớp luôn đặt `approval` — nên prompt phê duyệt không bao giờ báo cho người dùng lời gọi đến từ một MCP server. Nếu một server được đóng góp rơi vào cùng đường đó, người dùng nhận được một prompt ở tier `write` mà không có dòng nguồn gốc — đúng là lỗ hổng tiết lộ mà một quyết định tin cậy lẽ ra phải bịt lại. Thiết kế phải nói liệu server được đóng góp có nhận một tier riêng và liệu dòng nguồn gốc có trở nên với tới được. Bằng chứng: `sed -n '648,700p' packages/coding-agent/src/mcp/tool-bridge.ts` và `sed -n '765,812p'` trên cùng file; `sed -n '340,385p' packages/coding-agent/src/tools/approval.ts`; `sed -n '655,660p' packages/coding-agent/src/extensibility/extensions/types.ts`. |
| Plan §WI-12: việc đóng góp một server 'inherits WI-0's unanswered posture'. | UNDERSTATED — không chỉ là chưa trả lời, nó còn bị hardcode theo hướng cấp quyền, là bằng chứng mạnh hơn thứ plan đưa ra | `isProjectTrusted(): boolean` được khai báo hai lần trên các bề mặt hướng extension (`extensions/types.ts:494` và `:561`) và hiện thực thành `isProjectTrusted: () => true` tại `extensions/runner.ts:1264` và lần nữa tại `session/agent-session.ts:7406`. Không có cổng chặn nào để kế thừa — giá trị là một hằng số. Vậy một thiết kế nói 'server do extension đóng góp rơi vào cùng tier với server project `.mcp.json`' là, tính đến HEAD này, đang nói 'không có tier nào'. Hãy nói điều đó tường minh trong tài liệu; nó biến một phụ thuộc trừu tượng vào WI-0 thành một tiền điều kiện kiểm chứng được (`grep -n 'isProjectTrusted: () => true'` phải ngừng trả về hai hit trước khi trust tier trong thiết kế này có ý nghĩa). Bằng chứng: `grep -rn 'isProjectTrusted' packages/coding-agent/src` → 4 hit: `extensions/types.ts:494`, `extensions/types.ts:561`, `extensions/runner.ts:1264`, `session/agent-session.ts:7406`. |


---


## WI-13. `ui.setHeader` / `ui.setFooter` thay vì nuốt im lặng, và widget hook có chủ sở hữu

**Thay đổi gì:** Một extension gọi `ctx.ui.setHeader(...)` — trên TUI hay trên một lần chạy headless — nay nhận được một lỗi thật, nêu đúng tên phương thức và chỉ về `setWidget`/`setEditorComponent`, thay vì không có gì cả; và mọi widget hook đều được ghi lại dưới đúng extension đã đặt nó, nên gỡ bỏ một extension không còn kéo theo widget của người khác, và bấm `/new` không còn xoá trắng widget của một extension vẫn đang chạy.

**Wave:** Wave 6 trong tổng 8 của M2. **HAI PR, và chúng được gate khác nhau.** PR 1 = hai chỗ ném lỗi + `test/extension-ui-header-footer.test.ts`; đây là thứ duy nhất gate wave 6 chạy. PR 2 = nửa chủ sở hữu (bản đồ widget theo từng extension + UI context theo từng extension + remount thay cho xoá toàn cục); nó **KHÔNG** được gate ở wave 6, nhưng **BẮT BUỘC** phải land trước WI-9 (wave 7) để inventory unload 11 nhóm của WI-9 có cái gì để liệt kê.

**Effort:**
- **PR 1** (hai chỗ ném lỗi + test của wave 6): **S/M**. Hai thành viên object literal trở thành method ném lỗi, một module helper mới ở `extensibility/extensions/ui-context-errors.ts` cộng một dòng `export *` vào `index.ts`, và dòng test (1) phải dùng harness có sẵn thay vì dựng fixture riêng. **S** chỉ đúng nếu dòng (1) được viết trong `test/modes/controllers/extension-ui-controller.test.ts` sẵn có.
- **PR 2** (nửa chủ sở hữu): **M, không phải S**. Bản đồ widget đổi hình dạng, object literal `uiContext` của TUI thành factory, `ExtensionRunner` có thêm một constructor context theo từng extension, và lần xoá toàn cục trở thành remount theo từng extension trên **NĂM** call site rải trong hai khối handler bị nhân bản giống hệt từng byte. PR 2 chỉ đủ cỡ M **nếu** bạn đồng thời giữ lại factory/nội dung của widget — xem mục `plan_corrections` về điều đó, vì bản đồ hiện tại vứt mất nó và nếu không thì remount không thể viết được.

**Người dùng thấy:** Hai điều người dùng thực sự nhận ra được. (1) Một extension mà tác giả đã dùng `ui.setHeader`/`ui.setFooter` sẽ hỏng một cách ồn ào — hoặc panel hiện lên, hoặc chính lời gọi của extension nổi ra một lỗi nêu tên `setHeader` cùng hai phương thức thực sự chạy được — thay vì âm thầm vẽ ra chẳng gì và để lại tác giả không có một điểm bám nào để debug. (2) Chạy `/new` hoặc đổi session không còn làm widget của một extension vẫn đang chạy biến mất khỏi khung hình, và gỡ bỏ một extension không còn giật widget của một extension khác. **Chỉ PR 1 tạo ra (1); (2) cần PR 2.**

---

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | **Chỉ JSDoc — không đổi chữ ký.** Cập nhật hai doc comment phía trên `setFooter` (`:273`) và `setHeader` (`:276`) để hợp đồng khai báo khớp với thực tế sau PR 1: lời gọi hoặc cài một component (phương án A) hoặc ném lỗi nêu tên phương thức cùng hai phương án thay thế được hỗ trợ. Comment hiện tại ("Set a custom footer component, or undefined to restore the built-in footer.") là một lời nói dối thứ hai nằm ngay cạnh stub im lặng, và để nguyên nó là cách khiến tác giả bên thứ ba tiếp tục giao panel hỏng. | Đã kiểm chứng. `WidgetPlacement` ở `:205` (chỉ có `aboveEditor` và `belowEditor`), `setStatus` ở `:264`, `setWidget` ở `:270`, `setFooter` ở `:273`, `setHeader` ở `:276`, `setEditorComponent` ở `:329-331`, interface `ExtensionUIContext` khai báo ở `:235`, `hasUI: boolean` trên context ở `:464`. **Mọi neo của plan cho file này CHÍNH XÁC — không trôi.** |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts` | sửa | Khối lượng lớn nhất, ba việc tách biệt. (1) **PR 1:** `setFooter: () => {}` / `setHeader: () => {}` tại `:157-158` trở thành method ném lỗi, dùng một message helper dùng chung. (2) **PR 2:** hai bản đồ tại `:87-88` đổi từ `Map<string, ExtensionUiComponent>` thành bản đồ theo từng extension, giá trị mang theo cả nội dung bên cạnh component (xem mục `plan_corrections` — hình dạng hiện tại khiến remount bất khả thi). (3) **PR 2:** object literal `uiContext` tại `:119-163` phải thành một factory, vì runner giờ cần N biến thể theo từng extension của nó và một object literal không thể mang `extensionPath` vào trong `setWidget`; `setHookWidget` (`:343`), `#removeHookWidget` (`:358`), `#createHookWidget` (`:364`), `#rebuildHookWidgets` (`:381`), `#renderHookWidgetContainer` (`:387`) và `clearHookWidgets` (`:1210`) đều đổi hình dạng, và vòng xoá toàn cục tại `:1211-1218` thành remount theo từng extension (`:1219` là lời gọi `#rebuildHookWidgets()` ngay sau đó — giữ nguyên nó). | Đã kiểm chứng. File dài 1342 dòng; **mọi neo của plan trong file này thấp hơn thực tế đúng 9 dòng** (xem phần đính chính). `MAX_WIDGET_LINES = 10` ở `:39` — widget dạng mảng đã bị cắt còn 10 dòng kèm dấu hiệu `... (widget truncated)`, nên đừng đánh mất hành vi đó khi đổi hình dạng. `#renderHookWidgetContainer` thêm `EditorTopGap`/`Spacer` khi bản đồ rỗng — đó là quan sát được mà dòng test (3) dùng được. |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | **PR 1:** `setFooter: () => {}` / `setHeader: () => {}` tại `:424-425` trở thành method ném lỗi với thông điệp **KHÁC** so với đường TUI — bản này phải nói mode hiện tại không có frame VÀ bảo tác giả chặn bằng `ctx.hasUI`. **PR 2:** thêm `createUIContext(extensionPath)` sinh ra một `ExtensionUIContext` theo từng extension, uỷ quyền về context dùng chung với path được nhúng vào `setWidget` (và bất cứ gì khác giành được chủ sở hữu); `createContext()` (`:1242`) có thêm một tham số cuối **tuỳ chọn** `extensionPath` để chuyển tiếp, và `ui: this.#uiContext` (`:1255`) trở thành context theo từng extension đã phân giải khi có path. `#uiContext` (`:459`) giữ nguyên làm mặc định cho các context không chủ sở hữu, để hai trampoline ở `:780`/`:799` tiếp tục gọi `createContext()` không tham số một cách không đổi. | Đã kiểm chứng. File dài 1963 dòng. Neo của plan trôi **+3 đến +13** (không đều — xem phần đính chính). `hasUI()` ở `:923-925` là phép so sánh danh tính `this.#uiContext !== noOpUIContext` — **đừng đổi nó**, vì test dùng nó. Khối comment ở `:756-777` ghi lại quyết định hiện hữu "createContext() takes no extension argument" cùng lý do; tham số tuỳ chọn mới đảo ngược một phần quyết định đó, nên comment phải được cập nhật **trong cùng một commit**, nếu không nó sẽ mâu thuẫn với code. |
| `packages/coding-agent/src/modes/interactive-mode.ts` | sửa | **Chỉ PR 2:** lệnh đơn lẻ `this.#extensionUiController.clearHookWidgets();` tại `:6020` tham gia vào việc chuyển từ xoá toàn cục sang remount. Nó nằm **ngoài** controller, nên rất dễ bị bỏ sót khi đang làm việc bên trong controller. | Đã kiểm chứng. File nặng 288 KB. Plan ghi `:6071`, dòng thật là `:6020` (plan **cao hơn 51 dòng**). `setEditorComponent` khai báo ở `:6273`; forwarder `initializeHookRunner` ở `:6269-6270`. |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | **PR 1, chỗ im lặng thứ tư mà plan không nhắc tới:** `setFooter: () => {},` / `setHeader: () => {},` trong chính `const noOpUIContext: ExtensionUIContext` của file này (khai báo `:518`, cặp im lặng `:540-541`, dùng ở `:7400`). Nó được với tới bởi `#createCommandContext()` khi session không có extension runner, trao cho một extension command handler một context `mode: 'print'`, `hasUI: false` mà lời gọi header/footer biến mất. Chuyển sang cùng dạng method ném lỗi như bản trong runner. Lưu ý đây là một `noOpUIContext` **THỨ HAI**, không phải import dùng chung — hai cái phải được giữ đồng bộ một cách có chủ đích, nên thông báo lỗi phải đến từ cùng một helper dùng chung thay vì viết hai lần. | Đã kiểm chứng bằng `grep -rn 'setFooter: () => {}\|setHeader: () => {}' packages/coding-agent/src`, trả về site này là thứ tư trong bốn. Khai báo ở `:518`; `sed -n '7394,7410p'` cho thấy nơi dùng duy nhất, bên trong `#createCommandContext()`, mà comment `//` ở `:7407-7408` nói đường này chỉ đến từ những session dựng tay. **Vẫn với tới được, vẫn im lặng.** |
| `packages/coding-agent/src/modes/acp/acp-agent.ts` | sửa | **PR 1, chỗ im lặng thứ ba mà plan không nhắc tới:** `setFooter: () => {},` / `setHeader: () => {},` tại `:581-582` bên trong hàm được export `createAcpExtensionUiContext()`. Chuyển sang method ném lỗi kiểu no-frame **VÀ** cập nhật JSDoc của hàm ở `:408-423`, vốn đang tài liệu hoá sự im lặng là cố ý ("The non-elicitation surface (custom components, theming, terminal input) remains stubbed — ACP clients render those themselves or not at all"). Để lại một doc comment trái ngược với code là cùng loại lỗi như JSDoc ở `types.ts:273`/`:276`. Việc này **bị chặn bởi câu hỏi mở về ACP** ở dưới — nếu quyết định rằng sự im lặng của ACP là đúng, file này **KHÔNG** được sửa và kỳ vọng grep của gate thu hẹp còn ba site. | Đã kiểm chứng bằng cùng lệnh grep đó; `sed -n '405,430p'` cho thấy builder được export khai báo ở `:424` với JSDoc ngay phía trên (`:408-423`). **Đây là site duy nhất mà sự im lặng được tài liệu hoá là một lựa chọn thiết kế có chủ đích thay vì là sơ suất** — vì vậy nó cần một quyết định chứ không phải một sửa đổi máy móc. |
| `packages/coding-agent/test/modes/controllers/extension-ui-controller.test.ts` | sửa | Dòng test (1) của gate thuộc về **ĐÂY**, không phải file mới. File này đã có sẵn harness dựng `ExtensionUiController` và `await controller.initHooksAndCustomTools()` rồi trả về `uiContext` (`:89-93`) — đó chính là object chứa hai stub ở `extension-ui-controller.ts:157-158`. Thêm `it('setHeader/setFooter throw instead of drawing nothing', ...)` vào đây, dùng lại `harness.init()`. | Đã kiểm chứng. File dài 525 dòng, import `ExtensionUiController` ở `:8`, `makeHarness()` khai báo ở `:23`, `new ExtensionUiController(ctx)` ở `:67`, harness `async init()` ở `:89-93` trả về `uiContext` sau `await controller.initHooksAndCustomTools()`; `getToolUIContext()` ở `extension-ui-controller.ts:339-341`. Cũng là nơi duy nhất trong cây đã biết cách dựng controller này — sáu file test khác chỉ import nó, không dựng. |
| `packages/coding-agent/test/extension-ui-header-footer.test.ts` | tạo | **MỚI** — file gate của wave 6, chứa **dòng (2)**; **dòng (1) nằm ở `test/modes/controllers/extension-ui-controller.test.ts`** (xem hàng ngay trên) vì site mà PR 1 sửa chỉ quan sát được qua `ExtensionUiController`. Cụ thể: (2) hợp đồng phủ định trên đường no-UI — một extension được nạp mà không có UI, gọi `ui.setHeader(...)` cũng phải ném lỗi, nhắm thẳng vào `runner.ts:424-425` cụ thể, vì harness của dòng (1) không bao giờ chạm tới `noOpUIContext`. | Đã kiểm chứng: **không tồn tại** ở HEAD 808b365. File này phải chứa **CHỈ** dòng (2) — các dòng (3)(4)(5) thuộc về file của WI-9, và đặt chúng vào đây sẽ làm lệnh xác minh của wave 6 đỏ đúng ngày WI-13 land. |
| `packages/coding-agent/test/extension-unload.test.ts` | tạo (KHÔNG phải WI-13) | **KHÔNG** được tạo hay sửa bởi WI-13. Các dòng (3) "widget thực sự xuất hiện trong khung hình", (4) "chủ sở hữu: gỡ một extension chỉ gỡ widget của nó", và (5) "hai extension dùng cùng một key được báo cáo" được viết trong file này — nhưng bởi **WI-9**, vì lệnh xác minh của WI-9 đã chạy file đó. Việc của WI-13 là để lại phần code sản xuất ở trạng thái mà các dòng đó có thể viết được. | Đã kiểm chứng: **không tồn tại** ở HEAD 808b365 — đó là file của WI-9 để tạo. Liệt kê ở đây để kỹ sư không tạo nó trong PR 1 hay PR 2. Dòng (4) **thật sự đỏ** trên HEAD, vì hôm nay không tồn tại đường nào để gỡ widget của một extension cụ thể. |
| `packages/coding-agent/CHANGELOG.md` | sửa | Hai mục dưới tiêu đề `## [Unreleased]` sẵn có. (1) Dưới `### Fixed`: một extension gọi `ui.setHeader`/`ui.setFooter` nay nhận được một lỗi nêu tên phương thức cùng hai phương án thay thế được hỗ trợ, thay vì im lặng không làm gì. (2) Dưới `### Fixed`: widget của extension sống sót qua việc đổi session và chỉ bị gỡ khi chính extension đó bị gỡ. | Đã kiểm chứng. `## [Unreleased]` có mặt và hiện đang rỗng, nằm ngay trên `## [18.3.3] - 2026-09-27`. Chưa có số issue hay PR nào, nên các mục sẽ ship không kèm liên kết attribution và sẽ được gắn khi có số PR. |

---

### Các bước

1. **Xác nhận bạn đang bắt đầu từ cây đúng:** `git -C /Users/tranquangdang21/Projects/ultraworkers rev-parse --short HEAD` trả về `808b365` và `git status --short` KHÔNG được hiện bất kỳ dòng ` M`/`MM` nào trong `packages/` (các mục chưa track như `.lavish-wip/` và `MILESTONE_2_EXECUTION_PLAN.md` là bình thường). **Cây bẩn làm mọi neo trong tài liệu này dịch**, kể cả khi HEAD không đổi: nếu `git status --short` hiện file đã sửa trong `packages/`, hãy `git stash` hoặc chờ, rồi chạy lại toàn bộ lệnh grep neo ở mục Xác minh trước khi tin bất kỳ số dòng nào. *(neo: repo root)*

2. **CỔNG DỪNG — phải có quyết định bằng văn bản cho phương án (A) hay (B) trước khi viết code.** Khuyến nghị là **(B)**: cả hai phương thức ném lỗi, và thông điệp nêu tên phương thức đã gọi cùng `setWidget` và `setEditorComponent` là hai cách thực sự vẽ được vào khung hình. Nếu ai đó chọn (A), việc này không còn là S: nó thêm một bề mặt header/footer vào `packages/tui`, vốn hôm nay không có gì, và mệnh đề "M2 adds no new insertion point" ở §4.2 phải được sửa đổi trong cùng thay đổi. **Không bắt đầu PR 1 khi câu hỏi này còn mở.** *(neo: quyết định, không có neo code)*

3. **Viết hai thông điệp lỗi thành một helper dùng chung, không phải hai string literal**, để hai đường có thể phân kỳ một cách có chủ đích mà vẫn giữ đồng bộ. Thông điệp của đường UI phải nêu tên phương thức đã gọi **và** cả hai phương án thay thế được hỗ trợ. Thông điệp của đường no-UI phải **khác**: nó phải nói mode hiện tại không có frame nào cả và bảo tác giả chặn lời gọi bằng `ctx.hasUI`, vì tại call site đó một frame **CÓ** mặt và lời gọi thất bại vì một lý do khác. Dùng lại một thông điệp cho cả hai chính là lỗi mà plan cảnh báo. *(neo: một helper dùng chung mới trong `packages/coding-agent/src/extensibility/extensions/ui-context-errors.ts`, re-export bằng `export * from "./ui-context-errors";` trong `index.ts` — KHÔNG đặt trong `extension-ui-controller.ts`)*. `runner.ts` không có một cạnh import nào vào `modes/`; đặt helper ở `modes/controllers/` buộc phải tạo cạnh `extensibility/extensions → modes/controllers` ngược hướng phụ thuộc, hoặc chép message — mà bước này cấm. Cả bốn site tiêu thụ (`runner.ts`, `agent-session.ts`, `acp-agent.ts`, `extension-ui-controller.ts`) đã import barrel `extensibility/extensions`.

4. **PR 1, site 1 trên 4:** thay `setFooter: () => {}` và `setHeader: () => {}` bằng các method ném lỗi gọi helper cho đường có UI. Chúng nằm trong object literal `uiContext` bên trong `async initHooksAndCustomTools()`. Đây là site duy nhất trong bốn site mà một frame thực sự có mặt — và vì thế thông điệp của nó trỏ tới hai phương thức chạy được chứ không trỏ tới `ctx.hasUI`. *(neo: `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:157-158`)*

5. **PR 1, các site 2–4 trên 4:** thay cặp im lặng tại cả ba site no-frame. `runner.ts:424-425` là `noOpUIContext` của runner. `session/agent-session.ts:540-541` là một `noOpUIContext` **THỨ HAI**, tách biệt (khai báo `:518`, dùng ở `:7400`) — nó không phải import của bản trong runner, nên hai cái phải được giữ đồng bộ một cách có chủ đích, và đó là lý do thông điệp phải đến từ helper dùng chung và **không bao giờ** viết hai lần. `acp-agent.ts:581-582` nằm trong hàm được export `createAcpExtensionUiContext()`; chỉ làm site này **nếu** câu hỏi mở về ACP được quyết định là "ACP không có frame, hãy ném lỗi". Ở cả ba site, giữ nguyên các thành viên no-op xung quanh (`setStatus`, `setWidget`, `setWorkingMessage`, …) — hạng mục này chỉ gồm header và footer, và mở rộng sang mọi thành viên im lặng là một thay đổi khác cần review riêng. Sau tất cả các sửa đổi, **grep của gate phải trả về zero hit**. *(neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:424-425`, `packages/coding-agent/src/session/agent-session.ts:540-541`, `packages/coding-agent/src/modes/acp/acp-agent.ts:581-582`)*

6. **PR 1:** cập nhật JSDoc phía trên `setFooter` và `setHeader` trong `types.ts` để hợp đồng khai báo khớp với hành vi mới. Comment hiện tại hứa "Set a custom header component, or undefined to restore the built-in header" — một lời hứa mà implementation chưa bao giờ giữ. Thay bằng hợp đồng thật và một con trỏ tới hai phương thức thực sự chạy được. Nếu site ACP đang được đổi, hãy cập nhật JSDoc của `createAcpExtensionUiContext` ở `:408-423` **trong cùng commit**, vì nó hiện tài liệu hoá sự im lặng là cố ý và sẽ trở nên trái ngược với code. *(neo: `packages/coding-agent/src/extensibility/extensions/types.ts:273`, `:276`)*

7. **PR 1:** viết **đúng hai test**, mỗi test một chỗ. **Dòng (1) phải chạm đúng site mà PR 1 sửa**, và site đó **KHÔNG** nằm trong runner: `extension-ui-controller.ts:157-158` nằm trong object literal mà `initHooksAndCustomTools()` dựng ra, trong khi `getUIContext()` (`runner.ts:919-921`) chỉ trả về đúng object mà test truyền vào `initialize(...)` (`runner.ts:740`) — nên khẳng định trên đó là khẳng định trên fixture của chính test, và sẽ xanh ngay cả trên HEAD. **TUYỆT ĐỐI KHÔNG dựng `ExtensionRunner` rồi gọi `initialize(...)` với một context tự chế cho dòng (1).** Hãy dựng `ExtensionUiController` bằng harness có sẵn ở `test/modes/controllers/extension-ui-controller.test.ts` — `makeHarness()` (`:23`), `await controller.initHooksAndCustomTools()` rồi dùng `uiContext` mà `harness.init()` (`:89-93`) trả về, hoặc `controller.getToolUIContext()` (`:339-341`) — rồi khẳng định `ui.setHeader(factory)` và `ui.setFooter(factory)` đều ném lỗi và thông điệp nêu đúng phương thức sai cùng cả `setWidget` và `setEditorComponent`. Dòng (2) dựng một runner **KHÔNG** khởi tạo UI và khẳng định hai lời gọi đó cũng ném lỗi, thêm nữa là thông điệp trỏ tới `ctx.hasUI` và `hasUI()` là false — điều đó chứng minh dòng này đã đi qua `noOpUIContext` chứ không phải object literal của TUI. **Dòng (1) phải đỏ trên HEAD** (các stub trở về im lặng) và **dòng (2) phải đỏ trên HEAD một cách độc lập**; nếu chỉ có thể làm dòng (2) đỏ bằng cách cũng phá dòng (1), thì cách chia đó sai. Các site ACP và agent-session **không** được trực tiếp kích hoạt bởi dòng nào — chúng được che bởi điều khoản grep của gate, không phải bởi một test, và **PR description phải nói rõ điều đó**. *(neo: dòng (1) — `packages/coding-agent/test/modes/controllers/extension-ui-controller.test.ts`; dòng (2) — `packages/coding-agent/test/extension-ui-header-footer.test.ts`)*

8. **PR 1:** thêm mục changelog dưới `## [Unreleased]` → `### Fixed`, rồi chạy lệnh xác minh của wave 6 **và** điều khoản grep của gate. **Land đây thành PR riêng. Không bắt đầu PR 2 trong cùng nhánh** — PR 1 là thứ gate wave 6 được định nghĩa để chạy, và trộn chúng làm gate mơ hồ về điều nó đang chứng minh. *(neo: `packages/coding-agent/CHANGELOG.md`)*

9. **PR 2, nước đi thứ nhất:** đổi kiểu giá trị của bản đồ để **nội dung** của widget được giữ lại, không chỉ component đã render. Hôm nay bản đồ giữ `ExtensionUiComponent` và `content` là một biến cục bộ chết ở cuối `setHookWidget`, nên không có gì để gọi lại lúc remount — với nội dung dạng mảng, các dòng gốc **hoàn toàn biến mất**. Hãy đưa vào một kiểu record nhỏ mang cả hai, ví dụ `{ content: ExtensionWidgetContent; component: ExtensionUiComponent }`, và cập nhật `#createHookWidget`, `#removeHookWidget`, `#renderHookWidgetContainer` và `clearHookWidgets` để đọc `.component`. Giữ nguyên lời gọi `dispose?.()` ở dạng optional-chained **đúng như hôm nay**, vì `ExtensionUiComponent` khai báo `dispose?()` là tuỳ chọn. *(neo: `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:87-88`, `:343-356`, `:358-362`, `:364-379`, `:387-408`, `:1210-1220`)*

10. **PR 2, nước đi thứ hai:** thêm tầng theo từng extension vào hai bản đồ — `Map<extensionPath, Map<string, {content, component}>>` — để hai extension chọn cùng một widget key không còn ghi đè lẫn nhau, và cho controller một method dispose widget của **một** extension mà để mọi extension khác nguyên vẹn. Method đó là điểm nối mà WI-9 sẽ gọi; **đừng** cố hiện thực luôn unload ở đây, vì `unloadExtension` chưa tồn tại ở bất kỳ đâu trong `packages/coding-agent/src` và WI-9 mới là thứ tạo ra nó. *(neo: `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:87-88`)*

11. **PR 2, nước đi thứ ba:** biến object literal `uiContext` trong `initHooksAndCustomTools()` thành một hàm factory nhận `extensionPath` và trả về một `ExtensionUIContext` mới, uỷ quyền về controller với path được nhúng vào `setWidget`. Một object literal không thể mang path, nên bước này là **tiền đề** cho thay đổi phía runner — **đừng** thử làm thay đổi phía runner trước. Object literal đăng ký qua `setToolUIContext` ở `:163` và lưu trong `#toolUIContext` là bản dùng chung/mặc định và **phải tiếp tục chạy không đổi**. *(neo: `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:119-163`)*

12. **PR 2, nước đi thứ tư:** thêm `createUIContext(extensionPath)` vào `ExtensionRunner`, trả về một context theo từng extension, và cho `createContext()` một tham số cuối **tuỳ chọn** `extensionPath` để chuyển tiếp. Làm cho `ui: this.#uiContext` phân giải thành context theo từng extension khi có path, và thành mặc định dùng chung khi không có. **Hình dạng tham số tuỳ chọn chính là tính chất an toàn ở đây:** có khoảng một tách call site `createContext()` sẵn có, gồm cả hai trampoline không tham số ở `:780` và `:799`, và mọi cái trong số đó phải vẫn biên dịch được và giữ nguyên hành vi. Cũng hãy cập nhật khối comment ở `:756-777`, vốn đang ghi "createContext() takes no extension argument" là một quyết định đã chốt — để nguyên nó sẽ khiến code trái ngược với chính lý do của nó. *(neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:1242-1255`, `:459`, `:756-777`, `:780`, `:799`)*

13. **PR 2, nước đi thứ năm:** chuyển lần xoá toàn cục thành remount theo từng extension, tại **NĂM** call site, không phải bốn. Bốn cái nằm trong controller — `:246` và `:307` trong khối `actions` thứ nhất (khai báo `:183`), và `:478` và `:536` trong khối thứ hai, bản song sinh giống hệt từng byte (khai báo `:416`). Cái thứ năm nằm ở `interactive-mode.ts:6020`, bên ngoài controller. Mỗi cái trở thành: dispose mọi widget được theo dõi, rồi gọi lại nội dung đã giữ của nó để dựng lại trên session vừa mở. **Giữ lại lời gọi `#rebuildHookWidgets()`** hiện đang đứng sau lần xoá, nếu không khung hình sẽ không vẽ lại. Sửa cả hai khối song sinh hoặc không sửa cái nào — một sửa đổi một phía là một khoảng trống hành vi im lặng mà không test nào phát hiện được. *(neo: `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:246`, `:307`, `:478`, `:536` và `packages/coding-agent/src/modes/interactive-mode.ts:6020`)*

14. **PR 2:** xác nhận hành vi **bằng tay** trước khi viết bất cứ thứ gì, vì các dòng (3)(4)(5) là của WI-9 và PR này ship mà không có chúng. Nạp một extension, gọi `setWidget`, bấm `/new`, và xác nhận widget vẫn còn. Rồi xác nhận widget do một extension đặt không bị gỡ bởi thao tác ảnh hưởng tới một extension khác. PR này chỉ bị gate bởi `check:ts` và file test của wave 6, nên một hồi quy trên đường remount sẽ **không** bị CI bắt — hãy nói thẳng điều đó trong PR description thay vì ám chỉ rằng test đã che phủ. *(neo: thủ công, không có neo test)*

15. **PR 2:** thêm mục changelog thứ hai, rồi chạy `bun run check:ts` và chạy lại file test của wave 6 để chứng minh PR 2 không làm hồi quy hai dòng của PR 1. **Land trước WI-9.** *(neo: `packages/coding-agent/CHANGELOG.md`)*

---

### Hình dạng code

```typescript
// packages/coding-agent/src/modes/controllers/extension-ui-controller.ts

// A widget entry must keep the CONTENT, not just the rendered component, or the
// per-extension remount on session switch has nothing to re-invoke. The current
// `Map<string, ExtensionUiComponent>` at :87-88 discards it — for array content the
// original lines are gone the moment `#createHookWidget` returns.
interface HookWidgetEntry {
	content: ExtensionWidgetContent;
	component: ExtensionUiComponent;
}

// One map per extension, so two extensions picking the same widget key stop
// silently overwriting each other.
#hookWidgetsAbove = new Map<string, Map<string, HookWidgetEntry>>();
#hookWidgetsBelow = new Map<string, Map<string, HookWidgetEntry>>();

// PR 1: the two silent members inside the `uiContext` literal (:157-158). One message,
// shared with the no-UI path's shape but NOT its text — at that call site a frame IS
// present and the call fails for a different reason.
// No `if` on `factory`: the helper is what lets the two paths diverge later,
// so there is nothing to branch on today.
setFooter: () => {
	throw new Error(unsupportedFrameSurfaceError("setFooter"));
},
setHeader: () => {
	throw new Error(unsupportedFrameSurfaceError("setHeader"));
},

// The message names the method actually called and BOTH supported alternatives —
// naming only the failing one turns a silence into a wall.
function unsupportedFrameSurfaceError(method: "setHeader" | "setFooter"): string {
	return (
		`ctx.ui.${method}() is not supported — the frame has no header/footer slot. ` +
		`Use ctx.ui.setWidget(key, content, { placement: "aboveEditor" | "belowEditor" }) ` +
		`or ctx.ui.setEditorComponent(factory) to draw into the frame.`
	);
}

// PR 1, other site: `noOpUIContext` in runner.ts:424-425. DIFFERENT text — this path
// has no frame at all, so the guidance is the `ctx.hasUI` guard, not the two methods.
function noFrameAtAllError(method: "setHeader" | "setFooter"): string {
	return (
		`ctx.ui.${method}() is not supported in this mode — there is no frame. ` +
		`Guard the call with ctx.hasUI, or use ctx.ui.setWidget(...) / ` +
		`ctx.ui.setEditorComponent(...) when a frame is present.`
	);
}

// PR 2: remount, replacing the global wipe at :1210-1220. Applies to EVERY
// extension — a widget belongs to an extension, not to a session, so pressing `/new`
// must not make a running extension vanish from the frame.
remountHookWidgets(): void {
	for (const registry of [this.#hookWidgetsAbove, this.#hookWidgetsBelow]) {
		for (const perExtension of registry.values()) {
			for (const [key, entry] of perExtension) {
				entry.component.dispose?.();
				entry.component = this.#createHookWidget(entry.content);
				perExtension.set(key, entry);
			}
		}
	}
	this.#rebuildHookWidgets(); // keep this — without it the frame never repaints
}

// packages/coding-agent/src/extensibility/extensions/runner.ts

// Per-extension UI context. `#uiContext` (:459) stays the shared default for
// contexts with no owner, so every existing no-arg `createContext()` call —
// including both trampolines at :780 and :799 — is untouched.
createUIContext(extensionPath: string): ExtensionUIContext {
	return {
		...this.#uiContext,
		setWidget: (key, content, options) => this.#uiContext.setWidget.call(
			this.#uiContext, extensionPath, key, content, options,
		),
	};
}

// `createContext()` (:1242) gains an OPTIONAL trailing parameter. The optional shape is
// the whole safety story: ~12 existing call sites keep compiling unchanged.
createContext(
	model?: Model,
	delegation?: { /* unchanged */ },
	extensionPath?: string,
): ExtensionContext {
	return {
		ui: extensionPath !== undefined ? this.createUIContext(extensionPath) : this.#uiContext,
		// ...unchanged
	};
}

// Dòng test (1) KHÔNG đi qua ExtensionRunner — nó đi qua
// ExtensionUiController.initHooksAndCustomTools() và cái object mà method đó dựng ra.
// Đây là lý do site `extension-ui-controller.ts:157-158` là site duy nhất cần một test,
// và cũng là lý do dòng (1) phải đỏ trên HEAD.
```

---

### Hợp đồng test

Hai điều, cả hai đều quan sát được từ bên ngoài implementation, và không cái nào là "hàm đã được gọi".

**Dòng (1) — hợp đồng phủ định, có UI.** Một extension context được backing bởi một frame thật — cụ thể là object literal mà `ExtensionUiController.initHooksAndCustomTools()` dựng ra, **không phải** một context do test tự dựng rồi đưa vào `ExtensionRunner.initialize(...)` — gọi `ui.setHeader(factory)` và `ui.setFooter(factory)`. Lời gọi **không được** trở về im lặng. Hoặc component xuất hiện trong khung hình (phương án A), hoặc lời gọi ném lỗi; theo phương án (B) được khuyến nghị thì nó ném lỗi, và thông điệp nêu tên phương thức thực sự đã gọi cùng **CẢ HAI** `setWidget` và `setEditorComponent`. Nếu ai đó hồi quy điều này về no-op im lặng, panel của tác giả extension biến mất mà không có lỗi nào ở bất kỳ đâu — đó chính xác là thất bại mà hạng mục này sinh ra để tiêu diệt. Lưu ý khẳng định là trên **cú ném** và nội dung của nó, không bao giờ trên wiring nội bộ.

**Dòng (2) — hợp đồng phủ định, đường no-UI.** Một runner chưa bao giờ được khởi tạo với UI context trao cho các extension `noOpUIContext`. Gọi `ui.setHeader(...)` trên đó cũng phải ném lỗi, và thông điệp phải bảo tác giả chặn bằng `ctx.hasUI` — một cách chữa khác hẳn dòng (1), vì tại call site đó không có frame nào cả. Test còn khẳng định thêm `hasUI()` là false, và đó chính là thứ chứng minh dòng này đã đi qua `noOpUIContext` chứ không phải object literal của TUI. Ảnh hưởng tới người tiêu dùng nếu hồi quy: trên RPC, print và JSON modes — những mode mà người dùng có ít thấy nhất — lời gọi lại bị nuốt và tác giả không có bất kỳ điểm bám debug nào. Dòng này **không** quan sát được từ harness của dòng (1), và đó là lý do bỏ nó đi sẽ để gate của wave sáng xanh trong khi vẫn còn nửa lỗi nằm trong cây.

**Điều file này KHÔNG che phủ, và không được làm ra vẻ như nó có che phủ:** rằng một widget thực sự xuất hiện trong khung hình; rằng gỡ bỏ một extension chỉ gỡ widget của nó (điều này **thật sự đỏ** trên HEAD hôm nay); và rằng hai extension trên cùng một key được báo cáo thay vì âm thầm ghi đè. Ba dòng đó thuộc về `test/extension-unload.test.ts` dưới WI-9, vì lệnh xác minh của WI-9 đã chạy file đó. Wave 6 ship chỉ với dòng (1) và (2) là **4/5** của năng lực thứ năm ở §11.1 — đúng trạng thái mà mục 11 ở §11.2 sinh ra để chặn việc bị nhầm là đã xong.

**Tên file test:** `packages/coding-agent/test/extension-ui-header-footer.test.ts`

---

### Xác minh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
bun --cwd=/Users/tranquangdang21/Projects/ultraworkers/packages/natives run build   # PREFLIGHT — see below
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/extension-ui-header-footer.test.ts
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/modes/controllers/extension-ui-controller.test.ts -t 'setHeader/setFooter throw'

# Anchor re-check, if HEAD has moved since this spec was written (run FIRST if these do not match).
# The pattern is deliberately spelling-agnostic; narrowing it back to one spelling makes it a no-op gate.
cd /Users/tranquangdang21/Projects/ultraworkers && grep -rnE 'set(Header|Footer): *(\(\) *=> *(\{\}|undefined)|[^=]*=>)|set(Header|Footer)\(\) *\{' packages/coding-agent/src
#   expected on HEAD: FOUR sites, eight lines —
#     modes/controllers/extension-ui-controller.ts:157, :158
#     extensibility/extensions/runner.ts:424, :425
#     session/agent-session.ts:540, :541
#     modes/acp/acp-agent.ts:581, :582
#   The plan says there are two. There are four.
cd /Users/tranquangdang21/Projects/ultraworkers && grep -n 'clearHookWidgets' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts packages/coding-agent/src/modes/interactive-mode.ts
#   expected on HEAD: 5 call sites at controller :246, :307, :478, :536 and interactive-mode :6020, plus the definition at controller :1210

# Blocked in this environment, not a failure of the change: the native addon is not built, so
# `bun test` reports 0 pass with "Failed to load pi_natives native addon for darwin-arm64".
# Verified on 2026-09-27 against the pre-existing extension-ui-controller.test.ts. That output is a
# MODULE-LOAD error, not a failing test, and it looks identical to one — which is why clause (b)
# carries the `bun --cwd=packages/natives run build` preflight inline rather than leaving it to this note.
# Until then `bun run check:ts` is the only real execution signal.
```

---

### Cổng hoàn thành

**PR 1 (đây là gate của wave 6) DONE khi cả bốn điều sau cùng đúng.** (a) `bun run check:ts` xanh. (b) **Addon native phải có trước khi đo.** Chạy `bun --cwd=packages/natives run build` TRƯỚC, rồi `cd packages/coding-agent && bun test test/extension-ui-header-footer.test.ts` phải báo **1 test pass** (dòng (2)) và `bun test test/modes/controllers/extension-ui-controller.test.ts -t 'setHeader/setFooter throw'` phải báo **1 test pass** (dòng (1)) — tổng cộng **2 dòng**. Nếu lệnh test kết thúc với `Failed to load pi_natives native addon` thì đó là lỗi MÔI TRƯỜNG, không phải kết quả của công việc: build lại rồi chạy lại, và KHÔNG được ghi kết quả đó vào báo cáo. Mọi lần chạy clause (b) phải kèm dòng `bun --cwd=packages/natives run build` ở phía trên; không có dòng đó thì clause (b) chưa từng được đo. (c) `grep -rnE 'set(Header|Footer): *(\(\) *=> *(\{\}|undefined)|[^=]*=>)|set(Header|Footer)\(\) *\{' packages/coding-agent/src` trả về **ZERO hit** — không còn cặp im lặng nào sống sót ở bất kỳ site nào trong bốn site. **Đừng thu hẹp mẫu này về một chữ:** mẫu cũ `setFooter: () => {}` chỉ bắt được MỘT chính tả. `setHeader() {}` và `setHeader: () => undefined` đều thoả `ExtensionUIContext` (`types.ts:276`), đều vẫn im lặng, và đều làm clause xanh. (Nếu câu hỏi mở về ACP được quyết định là "sự im lặng của ACP là đúng", điều khoản (c) thu hẹp còn ba site và quyết định phải được ghi lại trong PR; **không được thu hẹp trong im lặng**.) (d) Cả hai test đã được quan sát thấy **FAIL trên HEAD** trước khi sửa; nếu chúng pass trên HEAD thì chúng chứng minh được điều gì đó bằng không.

**PR 2 (nửa chủ sở hữu, land trước WI-9) DONE khi:** `bun run check:ts` xanh, hai test của PR 1 vẫn pass, các bản đồ widget là theo từng extension với nội dung được giữ lại, **toàn bộ NĂM** call site remount đã được chuyển đổi (controller `:246`, `:307`, `:478`, `:536` và interactive-mode `:6020` — **đếm, đừng liếc mắt**), khối comment ở `runner.ts:756-777` không còn mâu thuẫn với tham số tuỳ chọn mới, và việc kiểm tra `/new` bằng tay ở bước 14 đã được thực hiện và báo cáo. **PR 2 ship KHÔNG có test cho hành vi chủ sở hữu, theo thiết kế** — WI-9 viết các dòng (3)(4)(5) — nên PR description của nó phải nói thẳng điều đó thay vì ám chỉ một mức che phủ mà nó không có.

**Cổng này CÓ thực sự đỏ được** — đó chính là tính chất làm cho nó đáng có. Sửa mỗi `extension-ui-controller.ts:157-158` và bỏ sót ba site còn lại để lại sáu hit và điều khoản (c) không pass. Hoàn nguyên bất kỳ site ném lỗi nào về no-op im lặng làm điều khoản (b) đỏ, vì cả hai test đều gọi các phương thức bắt buộc phải ném. Điều khoản (d) chính là thứ phân biệt một cổng thật với một cổng trang trí: một test pass trên HEAD chứng minh được điều gì đó bằng không, nên cả hai dòng phải được chạy trên HEAD trước.

**Điều duy nhất gate wave 6 KHÔNG bắt được là nửa chủ sở hữu còn thiếu.** Nếu PR 1 ship và PR 2 không bao giờ bắt đầu, mọi điều khoản trên đều thoả mãn, test thứ năm của §11.1 sáng xanh, và khung hình vẫn giữ widget thuộc về các extension đã bị gỡ, trong khi `/new` vẫn xoá trắng widget của một extension đang chạy. Lỗ hổng đó được đóng bằng ràng buộc thứ tự §5.1 H (land trước WI-9) — đó là một **kiểm tra của con người, không phải một lệnh**.

---

### Phụ thuộc

- **depends_on:** không.
- **blocks:** `WI-9 (wave 7)` — nửa chủ sở hữu của PR 2 phải land trước, nếu không inventory unload của WI-9 không có cách nào liệt kê hay giải phóng hook widget. Đây là §5.1 H: land trước WI-9.

---

### Cách sai dễ nhất

Cách nhiều khả năng nhất để làm sai là **ship PR 1 rồi đóng wave**. Các lời gọi im lặng trở thành trung thực, test thứ năm của §11.1 sáng xanh, và khung hình vẫn giữ widget thuộc về một extension đã bị gỡ, trong khi `clearHookWidgets()` vẫn xoá widget của một extension đang chạy mỗi lần người dùng bấm `/new`.

Cách nhiều khả năng thứ hai là **sửa `extension-ui-controller.ts:157-158` rồi dừng lại ở đó**: plan nói có hai site im lặng, nhưng có **BỐN**, và ba cái còn lại là `runner.ts:424-425`, `session/agent-session.ts:540-541` và `acp-agent.ts:581-582`. Các dòng test của wave 6 vẫn sẽ sáng xanh, vì dòng (1) chạy trên một UI context và không bao giờ chạm tới một context không có frame, và dòng (2) chỉ chạm tới bản trong runner. **Đây là lý do điều khoản grep của gate đếm hit thay vì tin hai dòng test.**

Thứ ba: **chỉ sửa một trong hai khối handler `newSession`/`switchSession` bị nhân bản** — hôm nay chúng giống hệt từng byte, nên một sửa đổi một phía tạo ra một khoảng trống hành vi im lặng mà không test nào nhìn thấy.

Thứ tư: **coi site ACP là sơ suất thay vì một quyết định**, vì chính JSDoc của nó tài liệu hoá sự im lặng là cố ý.

---

### Cần người quyết

- **Phương án (A) hay (B) chưa phải là một quyết định, nó là một khuyến nghị.** Plan khuyến nghị (B) — làm cả hai ném lỗi và trỏ về hai phương thức thực sự chạy được — và không có bằng chứng nào cho thấy ai đó đã chấp nhận. **Xác nhận bằng văn bản trước khi PR 1 bắt đầu.** Nếu (A) được chọn thay thế, `packages/tui` sẽ có public API mới và §4.2 phải được sửa đổi một cách tường minh; nó không được lặng lẽ trượt vào như một chi tiết implementation.
- **Hành vi khi đổi session:** plan bắt buộc remount (dispose widget cũ, gọi lại factory trên session vừa mở). Hãy xác nhận điều đó là đúng, vì nó có nghĩa một widget factory được gọi nhiều hơn một lần cho mỗi session, và một factory đóng trên state của session phải chịu được điều đó. Phương án thay thế — giữ widget xuyên suốt lúc chuyển mà không gọi lại — không phải điều plan nói, nên đừng trôi vào nó mà không có quyết định.
- **Va chạm widget key giữa hai extension.** Plan nói va chạm phải được "báo cáo, không âm thầm ghi đè", nhưng không nói "báo cáo" nghĩa là gì. Các lựa chọn: `logger.warn` và bên ghi đè thắng; hoặc từ chối lời gọi thứ hai giống hệt cách `setHeader` nay ném lỗi. Dòng test (5) phải khẳng định một kết quả cụ thể, nên điều này phải được chốt trước khi viết dòng đó.
- **`setStatus` có giành được chủ sở hữu theo từng extension trong cùng PR không?** `setHookStatus` tại `extension-ui-controller.ts:591-592` chuyển tiếp tới `this.ctx.statusLine.setHookStatus(key, text)`, và status line giữ bản đồ key riêng bên ngoài controller này. Nó nằm ngoài phạm vi đã tuyên bố của WI-13, nhưng nó có nghĩa `setWidget` và `setStatus` sẽ có **ngữ nghĩa va chạm và sở hữu khác nhau** sau PR 2. Sự bất đối xứng đó phải là một quyết định, không phải một tai nạn.
- **Dòng test (3) ("widget thực sự xuất hiện trong khung hình") cần một fixture** được nạp qua `discoverAndLoadExtensions(configuredPaths, cwd, eventBus?, disabledExtensionIds?, options?)` — `packages/coding-agent/src/extensibility/extensions/loader.ts:668-677`. Plan nói "một extension fixture" mà không nói nó có phải là fixture `outsider-extension` ngoài repo ở mục 12 của §11.2 (vốn chưa tồn tại) hay một fixture tạm cục bộ trong test. Hãy chọn một; nếu là fixture outsider thì dòng (3) bị chặn sau mục 12 và thuộc về wave 7 cùng hai dòng kia, không thuộc wave 6.
- **ACP mode là một quyết định phạm vi, không phải một sửa lỗi máy móc.** `createAcpExtensionUiContext` (`modes/acp/acp-agent.ts:424`) stub `setHeader`/`setFooter` ở `:581-582`, và JSDoc của chính nó ở `:408-423` nói bề mặt đó "remains stubbed — ACP clients render those themselves or not at all". Vậy có hai câu trả lời có cơ sở: (i) ACP không có frame, nên nó ném cùng thông điệp no-frame như các đường non-TUI khác và JSDoc được cập nhật; hoặc (ii) ACP thật sự có một khái niệm frame do client sở hữu, trong đó sự im lặng là đúng và JSDoc giữ nguyên — nhưng khi đó test thứ năm của §11.1 không được thoả trên ACP và điều đó phải được viết ra. **(i) là lựa chọn nhất quán với phần còn lại của hạng mục này, nhưng đó là một thay đổi hành vi đối với một mode đã được tài liệu hoá và phải được quyết định, không được giả định. Điều khoản gate ở trên giả định (i).**

---

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| Danh sách path của plan: `extension-ui-controller.ts:148-149` (hai stub TUI), `:121` (setWidget), `:78-79` (hai bản đồ không chủ), `:1203-1212` (clearHookWidgets), `:334-347` (setHookWidget), `:349-353` (#removeHookWidget), `:355-370` (#createHookWidget), và bốn call site `:237` / `:298` / `:469` / `:527`. | **STALE — mọi số dòng trong file này thấp hơn đúng 9** | Cả mười neo đều **đúng về nội dung** nhưng thấp hơn đều 9 dòng. Dùng: bản đồ tại `:87-88`; chuyển tiếp `setWidget` tại `:130`; hai stub im lặng tại `:157-158`; chuyển tiếp `setEditorComponent` tại `:159`; `setHookWidget` tại `:343-356`; dòng `target.set(key, ...)` tại `:353-354`; `#removeHookWidget` tại `:358-362`; `#createHookWidget` tại `:364-379`; `#rebuildHookWidgets` tại `:381-385`; `#renderHookWidgetContainer` tại `:387-408`; `clearHookWidgets` tại `:1210-1220`; và bốn call site tại `:246` (newSession, khối 1), `:307` (switchSession, khối 1), `:478` (newSession, khối 2), `:536` (switchSession, khối 2). File dài 1342 dòng. |
| Danh sách path của plan: `runner.ts:412-425` (`noOpUIContext`) và **`:421-422`** — "cặp im lặng thứ hai" — cùng `:448` (`#uiContext`), `:627` và `:727` (hai lệnh gán), `:1229-1242` (`createContext()`, với `ui: this.#uiContext` ở `:1242`), `:745-747` (quyết định "createContext() takes no extension argument"), và `:766-771` (trampoline). | **STALE — độ trôi không đều; nằm trong khoảng +3 đến +13** | Số dòng đúng: `const noOpUIContext: ExtensionUIContext = {` tại `:415`; cặp im lặng `setFooter: () => {},` / `setHeader: () => {},` tại `:424-425`; trường `#uiContext: ExtensionUIContext;` tại `:459`; fallback trong constructor `this.#uiContext = noOpUIContext;` tại `:640`; fallback lúc init `this.#uiContext = uiContext ?? noOpUIContext;` tại `:740`; `createContext(` tại `:1242`; `ui: this.#uiContext,` tại `:1255`; comment "createContext() takes no extension argument" tại `:758`; và hai lời gọi trampoline không tham số tại `:780` và `:799`. Ngoài ra lưu ý `hasUI()` tại `:923-925` là `return this.#uiContext !== noOpUIContext;` — đó là phép so sánh danh tính mà test dùng được, nên **đừng phá nó** khi `#uiContext` bắt đầu uỷ quyền về các biến thể theo từng extension. |
| Plan: `interactive-mode.ts:6071` (call site thứ năm của `clearHookWidgets`) và `:6324` (`setEditorComponent`). | **STALE — cả hai CAO hơn 51 dòng** | Lệnh gọi `clearHookWidgets()` nằm ở `interactive-mode.ts:6020` (`this.#extensionUiController.clearHookWidgets();`). Khai báo method `setEditorComponent` nằm ở `interactive-mode.ts:6273`; forwarder trao UI context của `interactive-mode` cho controller nằm ở `:6269-6270` (`initializeHookRunner`). `:6324` của plan không phải là một neo thật cho hạng mục này. |
| Plan: hai khối handler bị nhân bản là handler `newSession`/`switchSession` của "hai UI context khác nhau" tại `:237`/`:469` và `:298`/`:527`. | **VERIFIED về bản chất, kèm tên các site bao quanh** | Đã xác nhận có **đúng hai** khối `const actions: ExtensionActions = {` và mỗi khối chứa handler `newSession` và `switchSession` riêng. Khối 1 ở `extension-ui-controller.ts:183`, bên trong `async initHooksAndCustomTools()` (khai báo `:118`, dựng object literal `uiContext` của TUI tại `:119-163`). Khối 2 ở `:416`, bên trong `initializeHookRunner(uiContext, _hasUI)` (khai báo `:410`, được gọi từ `interactive-mode.ts:6269-6270`). Sửa một và bỏ trống bản song sinh là một khoảng trống im lặng — plan đúng về điều này và đây là lỗi dễ mắc nhất ở đây. |
| Plan: "Sau khi widget có owner, cú quét không còn được xoá toàn cục nữa: nó trở thành remount theo từng extension — `dispose()` widget cũ rồi gọi lại factory của nó để dựng widget mới trên session vừa mở." | **GAP — remount của plan không cài được lên cấu trúc dữ liệu hiện tại; đây là điều duy nhất nhiều khả năng làm cháy một kỹ sư** | Hai bản đồ lưu **COMPONENT ĐÃ RENDER**, không phải nội dung/factory. `#hookWidgetsAbove = new Map<string, ExtensionUiComponent>()` (`:87`) và `#hookWidgetsBelow` (`:88`), và `setHookWidget` làm `target.set(key, this.#createHookWidget(content))` (`:354`) — `content` là một biến cục bộ đi ra ngoài phạm vi. `#createHookWidget` (`:364-379`) biến một `string[]` thành một `Container` mới của các child `Text`, nên với nội dung dạng mảng, các dòng gốc **hoàn toàn biến mất**. Không còn gì để gọi lại, nên "remount bằng cách gọi lại factory" không thể viết được nếu chưa đổi bản đồ đang giữ gì. **PR 2 buộc phải đổi kiểu giá trị để mang nội dung bên cạnh component** — ví dụ `Map<extensionPath, Map<string, { content: ExtensionWidgetContent; component: ExtensionUiComponent }>>` — và `#createHookWidget`/`#removeHookWidget`/`#renderHookWidgetContainer` cập nhật để đọc `.component` còn remount thì đọc lại `.content`. Cũng lưu ý `ExtensionUiComponent` là `Component & { dispose?(): void }` (`packages/tui/src/chat/extension-types.ts:5`), nên `dispose` là tuỳ chọn: remount phải gọi `dispose?.()`, khớp với `#removeHookWidget` hiện có ở `:359`. |
| Plan: `packages/tui/src/tui.ts` không có bề mặt header/footer; các hit `grep` duy nhất trong `packages/tui/src` là `components/wizard-step.ts:132` và `prompt/composer.ts:822 setHeaderExtras`. | **VERIFIED, lệch một dòng** | Đã xác nhận, và đây là kiểm tra mang tính quyết định cho việc phương án (A) bị loại: `packages/tui/src/tui.ts` dài 3633 dòng và chứa **zero** lần xuất hiện của `setHeader`, `setFooter`, `headerComponent`, hay `footerComponent`. Trên toàn bộ `packages/tui/src` có **đúng hai** hit, và cả hai đều là private với một component khác — `components/wizard-step.ts:132` (`setFooter(footer: Component | undefined)`, slot footer riêng của wizard) và `prompt/composer.ts:823` (`setHeaderExtras(before, after)`, phần welcome-scene riêng của composer; plan ghi 822, dòng thật là 823). Vậy phương án (A) thật sự là một bề mặt public **mới** của `packages/tui`, và mệnh đề "M2 adds no new insertion point" ở §4.2 sẽ phải được sửa đổi bằng văn bản nếu (A) từng được chọn. |
| Plan: lệnh xác minh của wave 6 là `bun run check:ts && (cd packages/coding-agent && bun test test/extension-ui-header-footer.test.ts)`, và file `packages/coding-agent/test/extension-unload.test.ts` đã sở hữu phần quét các nhóm unload. | **VERIFIED như một plan; cảnh báo môi trường không được plan mang theo** | **Cả hai** file `packages/coding-agent/test/extension-ui-header-footer.test.ts` lẫn `packages/coding-agent/test/extension-unload.test.ts` đều **không tồn tại** trên HEAD — `ls` trả về "No such file or directory" cho cả hai, và `packages/coding-agent/test/fixtures/outsider-extension/` cũng không tồn tại. Vậy cách chia hai file của plan vẫn là lựa chọn đúng (nó giữ lệnh của wave 6 không đỏ vì những dòng chưa được viết của WI-9), và cả hai file thật sự do milestone này tạo ra. **Cảnh báo môi trường:** native addon chưa được build, nên `bun test` hiện báo 0 pass kèm "Failed to load pi_natives native addon for darwin-arm64". `bun run check:ts` không cần addon và là tín hiệu thực thi duy nhất có sẵn cho tới khi chạy `bun --cwd=packages/natives run build`. |
| Ngầm định trong plan: `noOpUIContext` là "context mà mọi extension nhận được khi không có UI, vì `runner.ts:627` và `runner.ts:727` đều fallback về nó". | **VERIFIED, kèm một bổ sung mà plan bỏ sót** | Cả hai fallback đều có thật (`:640` trong constructor, `:740` trong `initialize`). Bổ sung: một runner chưa bao giờ được khởi tạo **đã quan sát được**, vì constructor gán `#uiContext = noOpUIContext` ở `:640` và `getUIContext()` (`:919-921`) trả về nó. Đó là thứ làm cho dòng test (2) rẻ — nó không cần chạy một session headless, chỉ cần `new ExtensionRunner(...)` rồi `runner.getUIContext().setHeader(...)`. Ngoài ra hiện **không có** `unloadExtension` ở bất kỳ đâu trong `packages/coding-agent/src` (grep không trả về gì) và `getExtensionPaths()` nằm ở `:927-929`; phần dispose theo từng extension của PR 2 không nên giả định một entry point unload đã tồn tại, vì WI-9 mới là thứ tạo ra nó. |
| Tiêu đề §WI-13 của plan: "Cặp stub đó không chỉ có một chỗ... Sửa mỗi `extension-ui-controller.ts` là ship một nửa... Vì vậy cả hai site đều nằm trong phạm vi WI-13." Toàn bộ phân tích failure-mode-4 của plan đứng trên giả định có **đúng HAI** site. | **SAI — có BỐN, và chúng không cùng ý định** | `grep -rn 'setFooter: () => {}\|setHeader: () => {}' packages/coding-agent/src` trả về **TÁM** dòng = **bốn** site riêng biệt, không phải hai. (a) `modes/controllers/extension-ui-controller.ts:157-158` — đường TUI, site 1 của plan. (b) `extensibility/extensions/runner.ts:424-425` — `noOpUIContext`, site 2 của plan. (c) `session/agent-session.ts:540-541` — một `noOpUIContext` **THỨ HAI, hoàn toàn tách biệt**, khai báo tại `:518` và dùng tại `:7400`, mà plan không bao giờ nhắc tới. Đây là một fallback thật sự đối diện với extension: `#createCommandContext()` trả về `{ ui: noOpUIContext, mode: 'print', hasUI: false, ... }` khi session không có extension runner, nên một extension command handler trong session dựng tay nhận context này và lời gọi `setHeader` của nó bị nuốt. comment riêng của nó ở `:7407-7408` ghi đường này chỉ đến từ những session dựng tay, nhưng nó vẫn với tới được và vẫn im lặng. (d) `modes/acp/acp-agent.ts:581-582` — bên trong hàm được export `createAcpExtensionUiContext(connection, getSessionId, clientCapabilities)` khai báo ở `:424`. Cái này **KHÁC LOẠI**: JSDoc riêng ở `:408-423` cố ý tài liệu hoá sự im lặng ("The non-elicitation surface (custom components, theming, terminal input) remains stubbed — ACP clients render those themselves or not at all"). Hệ quả với plan: cảnh báo failure-mode-4 của nó ("sửa controller, quên runner, gate vẫn xanh") vẫn đúng nhưng **đánh giá thấp mức phơi nhiễm gấp 2 lần**, và cách chữa của plan — "cả hai site đều nằm trong phạm vi WI-13" — không phải là một quyết định có thể làm bằng máy móc, bởi (c) là một **lỗi** còn (d) là một **lựa chọn thiết kế đã được tài liệu hoá**. Xem câu hỏi mở về ACP. |


---


## Rủi ro và cách sai dễ nhất

Ba kiểu hỏng nhiều khả năng xảy ra nhất trong M2. Một: thấy test đỏ vì `pi_natives` chưa build rồi xóa test hoặc revert fix — WI-4 gọi đây là cách sai dễ nhất của chính nó, và các mục khác ghi nguyên nhân y hệt vào gate. Hai: hoãn hoặc bịa câu trả lời ở wave 1 — WI-0 và WI-10 là hai ADR mà §11.3 bắt buộc phải merge, chúng chặn WI-11 và WI-12; WI-7 thì bị chặn bởi WI-2, và câu M2-OQ3 của nó chỉ được giao cho người sở hữu WI-10 chứ không phải chờ WI-10 merge. Câu trả lời bị hoãn càng lâu càng đắt. Ba: đăng ký mà không có chủ sở hữu, khiến suspend và unload chỉ nửa vời trong khi `check:ts` vẫn xanh.

Trước hết, một điều kiện môi trường chi phối mọi cổng hoàn thành bên dưới: native addon chưa build. Mọi lời gọi `bun test` hiện trả về `Failed to load pi_natives native addon for darwin-arm64` hoặc `0 pass`. Ở trạng thái đó **một lần chạy đỏ không chứng minh gì, và một lần chạy xanh cũng không**. `bun --cwd=packages/natives run build` là điều kiện tiên quyết để tin bất kỳ tín hiệu test nào.

| Work item | Rủi ro | Cách giảm |
| --- | --- | --- |
| Quyết định bằng văn bản, không CI nào canh — WI-0, WI-10, WI-11, WI-12 | Cùng một kiểu hỏng: tài liệu ra đủ ba file nhưng không ra câu trả lời. WI-0/WI-10 hoãn ("chưa có quan điểm"), WI-11/WI-12 viết như thể câu hỏi trước đó đã có đáp án. Markdown nằm ngoài mọi glob lint và typecheck, nên CI xanh không nói gì. | Đọc như việc của người, không phải của máy. WI-0: quyết định là đúng một trong ba chữ A/B/C, câu trả lời về `ctx.exec` phải là một câu trích được, hạng mục enforcement có TÊN + NGƯỜI + NGÀY. Và câu `isProjectTrusted()` không tự do: hai test đang assert nó trả `true` (`extension-context-project-trust.test.ts:14`, `issue-7955-extension-project-trusted.test.ts:19,24`), nên trả lời "thành giá trị thật" bắt buộc phải sửa hai file `.ts` đó — tức là phá điều kiện ba-file của chính cổng đó. Hoặc ADR ghi rõ đây là câu bị ràng buộc và câu trả lời là "giữ stub", hoặc phải nới điều kiện — quyết định này phải chốt trước, không để tới lúc viết. WI-10: M2-OQ2 là đúng `YES`/`NO`/`DEFERRED` trên một dòng riêng. WI-11: `git diff --name-only \| grep -c '\.ts$'` = 0. WI-12: `git diff --stat HEAD` chỉ liệt kê ba file docs. |
| Cổng hoàn thành không đáng tin — WI-1, WI-4, WI-5, WI-7, WI-8a, WI-8b, WI-9, WI-13 | Đỏ giả (thiếu addon) và xanh giả (cổng không có cấu trúc để đỏ) là cùng một lỗi: tin tín hiệu mà không hỏi tín hiệu đó có đỏ được không. WI-4: `Object.freeze` một mình để nguyên type khai báo ghi được, nên `check:ts` không thể đỏ khi thiếu `Readonly`. WI-9: `check:ts` xanh ngay cả khi xóa sạch 15 dòng test. WI-13: wave-6 gate xanh dù PR 2 chưa bắt đầu. | Build addon trước khi đọc bất kỳ tín hiệu test nào, và phải chứng minh mỗi cổng đỏ được. WI-4 đã có probe `toolRenderers.probe_backdoor` tại `packages/tui/src/chat/tool-execution.ts:355` → TS2542. WI-5 dòng 1 của `reset-contract.test.ts` là tripwire cho lựa chọn cấm. WI-13: hai test của PR 1 phải chạy trên HEAD trước — nếu xanh trên HEAD thì chúng không chứng minh gì. Trong PR: ghi "blocked", không ghi "xanh". |
| Đăng ký mà không có chủ — WI-1, WI-5 commit 2–3, WI-8a, WI-9, WI-13 PR 2 | Cùng một kiểu: cơ chế có, điểm gán chủ thiếu. Hậu quả giống nhau — tắt extension xong thì tài nguyên vẫn sống, và không test nào đỏ vì phần bị bỏ sót nằm ngoài tầm type checker. | Gán chủ ngay tại điểm đăng ký, không để về sau. WI-1: `ManagedTimers` ở `managed-timers.ts:22-68` là `Set<Timer>` phẳng, chỉ có `clear(handle)` và `clearAll()`, nên phải đổi shape trước khi unload cần đến. Không mở API đăng ký mới trước khi có đường gỡ theo chủ: WI-8b cứ sau WI-8a; registry của WI-8a không có unregister (`byId.set` tại `config/registry.ts:789` là biến dạng duy nhất). WI-9 chỉ "xong" khi dòng (3) — 15 test — chạy thật, không phải khi `check:ts` xanh. |
| Bật API mà chưa có chỗ hiển thị — WI-8b | Lỗi "âm thầm và vĩnh viễn": expose `pi.registerSetting` trong khi panel vẫn không vẽ ra key. Tác giả extension không có lỗi nào, người dùng không có UI nào, CI không đỏ ở đâu cả. | Không làm bước 5–7 trước khi M2-OQ4 (panel placement) có câu trả lời. Biết rõ `check:ts` chỉ bắt được trường hợp `ExtensionAPI` khai báo mà `ConcreteExtensionAPI` (`loader.ts:179`) chưa implement — nó không bắt được id thiếu namespace lẫn key panel không render, nên hai cái đó nằm ở test row 1/3/4. |
| Rơi capture của closure — WI-6 | `isToolAllowed` bắt **31** giá trị tự do (`tools/index.ts:731-791`, đếm sau khi bỏ comment và chuỗi; không tính tham số `name`, chính `isToolAllowed`, và biến cục bộ `goalState`). Thay chuỗi 25 nhánh `if (name === …)` bằng một `Map` thì một capture bị rơi là tool biến mất khỏi danh sách — và không assertion nào trong test file bắt được. | Characterization test viết và xanh **trước** khi refactor, chạy được cả hai phía. Rồi audit thủ công một lần: `.names` của cả 33 tool phải giống byte-for-byte giữa commit trước và commit sau, trên ma trận taskDepth 0/1 × gates all-off/all-on × memory backend `hindsight`/`mnemopi`/`local`. |
| Hồi quy chặn ghi của plan mode — WI-7 | Thứ duy nhất trong M2 có thể làm hỏng dữ liệu người dùng: write policy mới quên một nhánh, plan mode cho ghi vào working tree. Không có hiệu ứng nhìn thấy nên không ai phát hiện. | Sau khi bóc `write-policy.ts` ra, nối lại vào `plan-mode-guard.ts` và `write.ts` phải giữ nguyên hành vi: deny working-tree, allow `local://`. Kiểm bằng grep seam (51 dòng / 21 file, sáu boolean tại `modes/types.ts:189-194`) và bộ test của `outsider-extension` ở wave 5 — không kiểm bằng mắt. |
| Đổi thứ tự nạp là thay đổi hành vi thật — WI-2 | Sort path là thay đổi hành vi, không phải sửa lỗi: plugin của bên thứ ba đổi thứ tự nạp, và bên thắng cuộc tranh tên tool trùng sẽ đảo theo. Rủi ro phụ: làm hỏng `test/extension-loader-concurrency.test.ts`. | Hai PR, phần sort một mình. Test phải tự chứng minh tiền đề của nó trước: đọc fixture bằng `fs.readdirSync` (cùng primitive với `resolveExtensionDirectory` tại `directory-resolution.ts:114`) và dừng nếu `readdir` vốn đã trả về thứ tự lexical — nếu không, assertion sẽ xanh trên một implementation không sort gì. |

WI-3 gần như không có rủi ro đáng kể: cách sai dễ nhất của nó là dùng nguyên sketch `satisfies Record<RelayableEventKind, …>` thay vì mapped type, và cái đó đỏ ngay ở `check:ts` trong vài giây. Nửa `bun test` của nó thuộc cùng cảnh addon chặn, không phải rủi ro riêng.


---


## Bảng quyết định cần bạn chốt

69 câu hỏi mở trên 15 work item. Bảng dưới chia làm hai nhóm: nhóm đầu là những câu **chặn việc bắt đầu** một work item — không có câu trả lời thì kỹ sư phải chờ mới mở được commit đầu; nhóm sau là những câu **chỉ chặn về sau**, có thể trả lúc review hoặc khi tới commit thứ hai. Cột cuối là mặc định sẽ được áp nếu bạn im lặng; chỗ nào câu hỏi không nêu mặc định thì ghi rõ là chưa có, không tự bịa.

Ba dây chuyền xuyên suốt, trả trước sẽ tiết kiệm nhiều nhất: WI-0 → WI-12 (trust tier của MCP server kế thừa câu A/B/C của WI-0), WI-10 → WI-11 (M2-OQ2), WI-2 → WI-7 (thứ tự nạp làm input của `order` cho registered mode).

### Nhóm 1 — chặn bắt đầu work item

| Work item | Câu hỏi | Vì sao nó chặn | Mặc định nếu không trả lời |
| --- | --- | --- | --- |
| WI-0 | Trust model: chọn A, B hay C? | Chặn bắt đầu WI-0; không work item nào phía dưới chốt được trước khi nó viết ra. WI-12 kế thừa chính câu này. | chưa có mặc định — cần bạn quyết |
| WI-0 | `ctx.exec` có nằm trong phạm vi gate (M2-OQ5) không? | Chặn WI-0: ADR phải trả lời, "nó suy ra từ quyết định module" không phải câu trả lời. | chưa có mặc định — cần bạn quyết |
| WI-0 | ADR RATIFY hay OVERTURN thái độ no-gate đã phát hành (CHANGELOG.md:1057, `## [18.1.16]`)? | Chặn WI-0. OVERTURN là thay đổi người dùng nhìn thấy, cần changelog entry và issue link, không chỉ một chữ trong doc. | chưa có mặc định — cần bạn quyết |
| WI-0 | Ai chịu trách nhiệm enforcement — tên, owner, ngày? | Chặn WI-0: ADR phải gắn một NAME, một OWNER, một DATE; cả chương trình không milestone nào sở hữu nó, kể cả M3. | chưa có mặc định — cần bạn quyết |
| WI-1 | Resume thì làm gì với background work đã bị clear: (a) chấp nhận, extension tự dựng lại ở event kế tiếp; (b) nhánh resume phát một startup event tổng hợp; (c) nhớ timer đã clear rồi re-arm? | Chặn bắt đầu WI-1 — một người phải chọn trước khi viết code. Hôm nay `setSuspendedExtensions` chỉ đổi membership của Set, nên một extension polling sẽ ngừng poll vĩnh viễn sau một vòng disable/enable, không báo lỗi. | (a) — chấp nhận và tài liệu hoá; spec viết theo (a) |
| WI-1 | `UNOWNED_TIMERS` sentinel trong `createContext`, hay để timer helper throw? | Chặn commit 1 của WI-1. Sentinel giữ hành vi cho trampoline gọi trước `#ownTimers` và cho 4 test tại test/extensions-runner.test.ts:3956-4070; throw sẽ làm đỏ chúng. | sentinel — spec khuyến nghị sentinel, cần người phê chuẩn |
| WI-2 | Post-sort có áp cho cả path khai báo tường minh không? | Chặn mở PR WI-2; đây là phần duy nhất của WI-2 người dùng có thể gọi là hồi quy. | sort toàn bộ `allPaths` — kế hoạch đã chốt |
| WI-3 | Có ship extension hook `model_changed` không? | Chặn bắt đầu WI-3: câu trả lời quyết định có commit 2 hay không. Nếu có thì phải có arm thật, không được chỉ có tên trong union. | không — spec mặc định NO, để ngoài `RelayableEventKind` và giữ comment pointer |
| WI-4, WI-5 | Ai build native addon và khi nào? Và: `test/capability/reset-contract.test.ts` có chạy được khi chưa có addon không? | Cùng một quyết định nên gộp một dòng. WI-5 gọi nó là gate question của commit 2–3, WI-4 nói nó chặn cả hai file test của mình và một phần lớn suite. Cách rẻ nhất là chạy `bun test test/capability/reset-contract.test.ts` ngay khi viết xong rồi mới leo lên quyết định M2-wide "test cần addon" tách khỏi "test không cần". | chưa có mặc định — cần bạn quyết |
| WI-5 | Đổi tên hàm fs-only thành tên gì? | Chặn commit đầu WI-5; 8 import và 12 call site phải đổi theo một tên. | `invalidateAllCaches()` |
| WI-5 | Alias `resetCapabilities` có sống sót sau khi đổi tên không? | Cùng commit đổi tên, và còn phải sửa comment ở sdk.ts:3528. | không — bỏ alias, dùng tên thật ở cả 12 call site |
| WI-5 | `reset()` có được clear map `capabilities` không? | Ràng buộc chứ không phải câu hỏi mở, nhưng chặn commit đầu: 14 `defineCapability` đều ở module scope và ESM chạy mỗi module đúng một lần, nên sau lần `reset()` đầu tiên `getCapability` và `loadCapability` chết cho toàn bộ 14 capability ở cả 12 call site — không stack trace, cả tiến trình. | không — giữ hàm fs-only, đổi tên, thêm `resetRegistry()` riêng cho registry |
| WI-6 | Hàng prototype-safety (tool tên `toString` hay `__proto__`) nằm trong PR này hay tách hardening riêng? | Quyết định nội dung WI-6: refactor này mở ra một rủi ro mới thật. | có, đưa vào WI-6 — spec cho rằng nên in scope |
| WI-7 | M2-OQ3 — mode do extension đăng ký đi tới status line bằng cách nào? | Chặn step 6 của WI-7; §7.4 đã phân tích ba phương án và cố ý không chọn. Bốn ràng buộc đã kiểm trên HEAD: union 27 phần tử ở schema.ts:2-30, segment `mode` tại segments.ts:364, chuỗi ưu tiên ở segments.ts:369-403, `ModeDefinition.statusLine` bắt buộc. | phương án 3 — mode segment đọc id từ ModeRegistry; kế hoạch nghiêng về, chưa ai chốt |
| WI-7 | `ModeContext` có mở UI affordance không? | Chặn hình dạng `ModeContext` ở step 6; nếu mode phải vẽ nhiều hơn một chip ở wave 5 thì cần seam ngay chứ không đợi wave 6. | hẹp — session, settings, setActiveTools, notify; không TUI handle |
| WI-7 | `writePolicy` có kiểm soát cả text lỗi, hay chỉ flags? | Chặn viết `WritePolicy`: nếu text nằm ở core thì extension không rơi prose vào tool error; nếu không thì mỗi mode tự viết lời từ chối của nó. | chưa có mặc định — cần bạn quyết |
| WI-7 | 5 mode built-in lấy `order` từ WI-2, hay từ artifact riêng? | Chặn step 7: nếu WI-2 chỉ cho một thứ tự chẩn đoán mà không có danh sách canonical, status-line priority sẽ thành nguồn sự thật thứ hai. | chưa có mặc định — cần bạn quyết |
| WI-8a | `deletePluginSetting` nghĩa là "quên global override" hay "xoá ở mọi layer"? | Chặn bắt đầu WI-8a; nó đổi hành vi người dùng nhìn thấy ở `omp plugin config unset` (cli/plugin-cli.ts:917). | chưa có mặc định — cần bạn quyết |
| WI-8a | Layer Settings nào là nhà bền của một plugin setting? | Kế hoạch chỉ nói "overlay" và không nêu layer; đổi câu trả lời này là đổi luôn cả framing "second store". | chưa có mặc định — cần bạn quyết |
| WI-8a | Migration marker là một key trong Settings hay một file riêng? | Chặn thiết kế migration: người dùng xoá nhầm là settings quay lại. | chưa có mặc định — cần bạn quyết |
| WI-8a | Plugin setting có được khai `envFallback` không? | Chặn bước 3 của WI-8a: quy tắc ở step 3 phủ opt-IN, nói không gì về opt-out đảo thứ tự ưu tiên. | chưa có mặc định — cần bạn quyết |
| WI-8a | `ProjectPluginOverrides.disabled` và `.features` thì sao? | Chặn phạm vi WI-8a: item này chỉ migrate `settings`, nên `.omp/plugin-overrides.json` còn lại hai trong ba field — phải xác nhận đây là chủ ý chứ không phải làm dở. | giữ nguyên file, không xoá |
| WI-8b | M2-OQ4 — key của extension render ở đâu? | Chặn bắt đầu WI-8b; "DECIDE, DO NOT DISCOVER IN CODE". `SettingTab` là union đóng 10 literal (settings-defs.ts:4-15) và `TAB_GROUPS` là static record (:52-88), nên "một tab động cho mỗi extension" phải sửa cả hai; tab Plugins hiện tại là bề mặt plugin npm chứ không phải bề mặt extension. | chưa có mặc định — cần bạn quyết |
| WI-8b | Slug namespace ổn định cho một extension lấy từ đâu? | Chặn bắt đầu WI-8b. `Extension.path` là đường dẫn người dùng gõ nên không ổn định; `Extension.resolvedPath` (loader.ts:471) ổn định nhưng nhúng path máy vào một key nằm trong settings dùng chung; `Extension` không có field manifest để treo id. | chưa có mặc định — cần bạn quyết |
| WI-8b | Biến env cho key của extension: do author chọn hay tự sinh? | Chặn bắt đầu WI-8b, và phải xác nhận WI-8a đã land đúng như đã viết trước khi code dựa vào nó. | kế thừa WI-8a — `OMP_<PLUGIN_ID>_<KEY>`, khai tường minh trong `SettingDefinition.env`, không tự sinh |
| WI-8b | Đăng ký lại cùng key của cùng owner: no-op hay throw? | Chặn hợp đồng của `bindPreparedExtensions` (loader.ts:491-520) — rebind một extension đã chuẩn bị là hợp đồng đã có test tại test/extension-prepared-rebind.test.ts. | no-op, vì rebind đã được test |
| WI-9 | Giá trị flag do CLI gán sống sót thế nào sau khi reshape `flagValues`? | Chặn bắt đầu WI-9. Dưới `Map<extensionPath, Map<flagName, value>>` không còn chỗ cho `--flag=value` do người dùng gõ; `setFlagValue` ở runner.ts:1098 và main.ts:2210 đều là ghi không có source. | chưa có mặc định — cần bạn quyết |
| WI-9 | `getFlagValues()` có còn phải phẳng bên ngoài CLI không? | Chặn việc đổi kiểu: phải xác nhận không consumer SDK nào đọc thẳng `runtime.flagValues` trước khi đổi. | flatten ở biên đọc bên trong runner; `ExtensionFlagSink` (cli/extension-flags.ts:11) không đổi |
| WI-9 | `unloadExtension` trả về `Extension` hay `boolean`? | Chặn chữ ký hàm ngay ở commit đầu WI-9. | `boolean` — mặt nhỏ hơn, khớp hình dạng của `isExtensionActive` |
| WI-9 | Có reload (unload rồi load) trong phạm vi WI-9 không? | Chặn phạm vi WI-9. Nếu có reload thì nó thừa kế cơ chế cache-busting đã có sẵn và theo sau biến mất; nếu không thì WI-9 thuần teardown, không đụng module graph. | chưa có mặc định — cần bạn quyết |
| WI-10 | M2-OQ2: capability registry có bao giờ tới tay extension không — YES, NO hay DEFERRED? | Chặn bắt đầu WI-10; WI-11 chờ đúng câu này. Spec cố ý không chọn, chọn ở đây là lặp lại đúng thất bại mà item này sinh ra để chặn. | chưa có mặc định — cần bạn quyết |
| WI-10 | Nếu chọn DEFERRED thì owner và milestone cụ thể là gì? | Chặn WI-10: DEFERRED không có cả hai thì không khác gì không trả lời, và hỏng gate (3). | chưa có mặc định — cần bạn quyết |
| WI-10 | custom-commands/ và plugin manifest có status word riêng, hay gộp vào "extensions"? | Chặn số hàng của bảng surface trong ADR; gộp thì phải được lập luận trong tài liệu chứ không im lặng bỏ bằng cách không nhắc. | năm hàng riêng — spec giả định vậy |
| WI-11 | Đường dẫn on-disk cho state store là gì? | Chặn viết hợp đồng của WI-11; để ngỏ biến một design item thành một cái hoãn mặc đồ design. | `~/.omp/extensions-state/<extension-id>.json` — theo `getPluginsDir()` và `getPluginsLockfile` tại packages/utils/src/dirs.ts:652-654 |
| WI-11 | Khi M2-OQ2 còn mở, WI-11 có ghi khuyến nghị là có điều kiện không? | Chặn viết WI-11; phụ thuộc WI-10. | ghi là có điều kiện nếu M2-OQ2 chưa đóng, và trích dẫn đáp án nếu đã đóng |
| WI-11 | Khi identity của extension đổi (id, hoặc install path khi người dùng di chuyển): từ chối, migrate, hay bỏ? | Chặn viết hợp đồng "một setting được đổi tên không làm mồ côi một giá trị" — với state store, key do extension chọn nên ca thú vị là identity đổi. | chưa có mặc định — cần bạn quyết |
| WI-11 | Store tương lai có nhận các DIY file hôm nay không? | Chặn viết hợp đồng; câu "sẽ migrate sau" là câu sau này thành breaking change chẳng ai lên kế hoạch. | start clean, no adoption |
| WI-12 | MCP server do extension đóng góp rơi vào trust tier nào, và ai authorize kết nối? (a) cùng tier với project `.mcp.json`; (b) cùng tier user-scope nhưng gated theo extension trusted; (c) luôn cần grant tường minh | Chặn bắt đầu WI-12, phải trả trong tài liệu chứ không hoãn. Chọn (a) nghĩa là mọi extension nạp được có thể mở kết nối ra ngoài tới URL bất kỳ mà không hỏi. | chưa có mặc định — cần bạn quyết |
| WI-12 | Descriptor chỉ khai lúc load, hay extension sống được đăng ký server sau (từ tool call, event handler)? | Chặn hình dạng API của WI-12; late register là một event mới trên manager, tức là vấn đề registerMode của WI-7 mặc khác. | chỉ lúc load-time |
| WI-12 | Server `auth.type === "oauth"` do extension đóng góp lấy credential ở đâu? | Chặn WI-12. Store OAuth lõi khoá theo server URL (mcpOAuthCredentialIdsForServerUrl, mcp/oauth-credentials.ts:24) và refresh ghi lại qua `refreshManagedMcpOAuthCredential` (:105), nên một `url` do extension viết có thể đụng credential id sẵn có của người dùng. | chưa có mặc định — cần bạn quyết |
| WI-12 | Toggle enable/disable: rơi vào denylist/allowlist cấp người dùng, hay là cờ `enabled` do extension sở hữu? | Chặn UX quan sát được của WI-12. `#writableMcpSourcePath` (packages/tui/src/overlays/extensions/extension-dashboard.ts:449-453) chỉ allowlist `native` và `mcp-json`, nên server do descriptor đóng góp rơi vào nhánh else của `setMcpServerEnabled` (mcp/config-writer.ts:333-380). | hành vi hôm nay — toggle cấp người dùng, sống sót cả khi extension còn hiện diện |
| WI-12 | Câu trả lời MCP này tự chốt write surface hay đẩy sang WI-10? | Chặn viết WI-12; WI-10 là dependency cùng wave. | nêu là PROPOSAL để đối chiếu WI-10, không khẳng định canonical surface |
| WI-13 | packages/tui chọn phương án (A) hay (B)? | Chặn bắt đầu WI-13 — phải xác nhận bằng văn bản trước khi PR 1 mở. Nếu chọn (A) thì `packages/tui` có public API mới và §4.2 phải được sửa tường minh. | (B) — cả hai throw và chỉ sang hai method chạy được; kế hoạch khuyến nghị, chưa thấy ai xác nhận |
| WI-13 | Khi đổi session, widget có remount không (dispose cũ, gọi lại factory)? | Chặn hợp đồng vòng đời widget: factory sẽ bị gọi nhiều lần trên một session, nên factory đóng over state của session phải chịu được điều đó. | remount — kế hoạch đã ấn định |
| WI-13 | Trùng widget key giữa hai extension thì "reported" nghĩa là gì? | Chặn hành vi: test row (5) phải assert một kết quả cụ thể, không thể để "tùy". | chưa có mặc định — cần bạn quyết |
| WI-13 | ACP mode: throw như các non-TUI path khác, hay im lặng vì client tự render? | Chặn mọi đường của WI-13. `createAcpExtensionUiContext` (modes/acp/acp-agent.ts:425) đang stub `setHeader`/`setFooter` ở :581-582 và JSDoc ở :409-424 nói rõ surface đó vẫn còn stub. | (i) — throw, và sửa JSDoc; nếu chọn (ii) thì test thứ năm của §11.1 không đạt trên ACP và phải ghi ra |

### Nhóm 2 — chỉ chặn về sau

| Work item | Câu hỏi | Vì sao nó chặn | Mặc định nếu không trả lời |
| --- | --- | --- | --- |
| WI-0 | Có thêm mục trust vào docs/extension-loading.md không? | Chặn danh sách file của PR WI-0, không chặn viết ADR. Comment ở types.ts:548-561 trỏ sang file đó mà file đó im lặng hoàn toàn về trust. | chưa có mặc định — cần bạn quyết |
| WI-0 | Project-scope marketplace path (step 2) có vào M2 không, hay để hẳn cho hạng mục enforcement chưa có owner? | Chặn việc chốt phạm vi M2, không chặn work item nào đã có. Nó đã ship và đang không có guard, nên coi là việc tương lai là rủi ro lịch chứ không chỉ rủi ro sở hữu. | chưa có mặc định — cần bạn quyết |
| WI-1 (commit 2) | Sau khi resume đăng ký lại có cần `refreshRuntimeProviders()` không? | Chặn commit 2, không chặn commit 1. Các cold path sdk.ts:1010, :2499 và cli/models-cli.ts:364 đều gọi nó; đây là register site duy nhất không gọi. | không — spec giữ hot path rẻ |
| WI-1 (commit 2) | `restrictToolNames` bất đối xứng: có chạy prune trong restricted session không? | Chặn commit 2. Cặp `syncExtensionSources`/`clearSourceRegistrations` nằm trong `if (!restrictToolNames)` còn phần ghi retention record nằm ngoài (sdk.ts:2481-2492), nên lời gọi mới sẽ khiến restricted session có prune mà trước đó không có. | chưa có mặc định — cần bạn quyết |
| WI-1 (commit 2) | Có xoá retention record khi extension gọi `pi.unregisterProvider` không? | Chặn commit 2. Sau khi drain thì `ExtensionRuntime.unregisterProvider` (loader.ts:108-111) là no-op, nên một lần resume sau sẽ đăng ký lại đúng thứ extension đã rút. | chưa có mặc định — cần bạn quyết |
| WI-2 | Fixture 8 extension: tiền đề suy biến thì hard-fail hay skip? | Chặn test row, không chặn code. Skip âm thầm tái tạo đúng vacuous pass mà kế hoạch viết ra để tránh. | hard-fail — kế hoạch chọn vậy |
| WI-2 | Có dựng fixture thứ hai ép nhánh linked-directory của `discoverExtensionModulePaths` không? | Chặn ngân sách test WI-2: sort tại helpers.ts:763 chưa có coverage quan sát được trong fixture hiện tại, và fixture thứ hai chiếm gần hết phần test còn lại. | chưa có mặc định — cần bạn quyết |
| WI-2 | `getCommandDiagnostics()` có consumer ngoài repo không? | Chặn việc mở rộng element type. Grep trong repo rỗng không đủ — phải xác nhận export công khai của SDK trước khi widen. | chưa có mặc định — cần bạn quyết |
| WI-3 | Bug tiềm ẩn `#turnIndex` (agent-session.ts:4630) có file follow-up không, có ai muốn đưa vào M2 không? | Chặn việc chốt phạm vi M2. WI-3 cố ý zero-diff nên giữ nguyên hành vi; `this.#turnIndex++` nằm sau guard `if (!runner.hasHandlers(event.type)) return;` ở :4610, nên `turnIndex` và `turn_id` (:4561) luôn bằng 0 khi không extension nào đăng ký `turn_end`. Fix là commit riêng, đổi hành vi, có test runtime riêng. | chưa có mặc định — cần bạn quyết |
| WI-3 | Giữ `agent_end` làm arm `async () => undefined` tài liệu hoá, hay bỏ khỏi `RelayableEventKind`? | Chặn review WI-3, không chặn commit. Bất đồng thì chỉ cần xoá một key và một arm. | giữ 19 khóa — spec giữ để khớp số nhánh hiện tại |
| WI-4 | Chú thích `Readonly<>` land trong WI-4 hay chờ WI-4b? | Không chặn: WI-4b không có trong wave table M2 nên không ai sở hữu nó, và `Object.freeze` một mình không có cơ chế ép buộc. | land trong WI-4, đóng WI-4b là "already done" |
| WI-4 | Có tách value import của `@oh-my-pi/pi-natives` ở packages/tui/src/theme/theme.ts:3 không? | Chặn phạm vi WI-4. Đây là nguyên nhân gốc khiến cả registry renderer không nạp được, nhưng tách riêng thì không đáng về mặt riêng. | ngoài phạm vi WI-4 — tách import là việc riêng |
| WI-5 | Cùng `providerId` do hai nguồn đăng ký: ai thắng? | Chặn commit `registerProvider`, không chặn commit đổi tên. Hôm nay còn vacuous vì chưa có gì đăng ký theo nguồn; nó chỉ thành load-bearing khi WI-10 mở registry cho extension. | mirror ModelRegistry — đăng ký sau thắng, `registerProvider` evict chủ sở hữu cũ (model-registry.ts:3010-3015) |
| WI-5 | `registerProvider` không có `sourceId` có evict chủ sở hữu hiện tại không? | Chặn commit `registerProvider`. Cả 84 call site hiện tại đều không có source và chạy một lần lúc import, nên để evict sẽ bỏ rơi provider thuộc nguồn. | không — thêm vào mảng nhưng không chiếm cũng không xoá attribution |
| WI-6 | Bốn tên luôn được nhận (read, write, edit, yield) có hàng `() => true` tường minh không? | Chặn review, không chặn code; khác biệt thuần style. | hàng tường minh — spec chọn để bảng mô tả trọn admission |
| WI-6 | `SESSION_MANAGED_BUILTIN_TOOL_NAMES` ở WI-6 hay ở bảng tool-set của WI-5? | Chặn phân bổ giữa WI-6 và WI-5, không chặn commit đầu WI-6. Kế hoạch không nhắc tới nó. | chưa có mặc định — cần bạn quyết |
| WI-7 | Chân commit thứ hai của fixture có cần tách commit riêng không? | Chặn chốt cổng wave-5 và M2-close cùng WI-8b, không chặn step 6. Lý do tách là thật: tsconfig có test, nên một dòng `registerSetting` làm đỏ `check:ts` và `&&` không bao giờ tới test. | hai lệnh riêng — spec theo lập luận của kế hoạch |
| WI-10 | Quy ước tên file ADR và neo changelog: file nào, neo dòng nào? | Chặn mở PR WI-10 và tránh conflict context với WI-0 trên cùng hai file. | `docs/extension-writing-surfaces.md` khớp với `docs/extension-trust-model.md` của WI-0; neo changelog hiện tại là `## [18.3.3] - 2026-09-27` ở dòng 5, không phải dòng 1057 |
| WI-10 | ADR có phải nêu những tài liệu nào trở thành phụ thuộc (docs/hooks.md, docs/custom-tools.md) không? | Chặn phạm vi diff của PR WI-10. | mức tối thiểu — ba file, để follow-up mới mở rộng |
| WI-11 | Wave-8 design-only có changelog entry không? | Chặn đóng gói PR WI-11, không chặn viết tài liệu. Nên quyết một lần rồi áp luôn cho WI-0 và WI-12. | không có entry, theo scoping "user-facing" của AGENTS.md |
| WI-13 | `setStatus` có vào cùng PR để có ownership per-extension không? | Chặn chốt phạm vi PR 2, không chặn PR 1. `setHookStatus` tại extension-ui-controller.ts:591-592 đẩy xuống key map riêng của status line, ngoài controller. | chưa có mặc định — cần bạn quyết |
| WI-13 | Test row (3) dùng fixture nào: `outsider-extension` ngoài repo (§11.2 item 12) hay temp fixture cục bộ? | Chặn viết test row (3) và xếp wave. Nếu dùng outsider fixture thì row này vướng item 12 và phải sang wave 7 cùng hai row kia. | chưa có mặc định — cần bạn quyết |

69 câu trên 68 dòng bảng: cặp câu của WI-4 và WI-5 về native addon là một quyết định, gộp chung một dòng và đã nêu cả hai work item. 47 câu chặn bắt đầu, 22 câu chỉ chặn về sau.


---


## Đính chính so với plan tổng

| work item | claim của plan | verdict | đính chính | evidence |
| --- | --- | --- | --- | --- |
| | | | **Kiểu sai trội của cả phần 1: neo dòng cũ vì HEAD đã dời từ 5873776 sang 808b365 — số đếm và kết luận thường vẫn đúng, chỉ sai dòng. Kiểu còn lại là plan im lặng về một tiền đề bắt buộc mà code không hàm ý. File `corrections-a.json` không có mục nào mang id `WI-0`, nên phần này không có dòng nào cho WI-0.** | |
| **WI-2** | *Loại trội: tiền đề sai hoặc thiếu (3/4) — mỗi dòng một loại riêng, không dòng nào trùng dòng nào; chỉ dòng đầu là trôi số dòng.* | | | |
| WI-2 | Bản ghi chẩn đoán được khai báo tại runner.ts:470, push tại runner.ts:1180, và `getCommandDiagnostics` ở runner.ts:1193. | SAI SỐ DÒNG | Cả bốn neo đều lệch 11-13 dòng. Field private ở runner.ts:481, chỗ reset ở 1186, chỗ push duy nhất ở 1193, getter ở 1206. `getRegisteredTool` ở 984-990, không phải 971-977. | grep -n trên `packages/coding-agent/src/extensibility/extensions/runner.ts`: 481:#commandDiagnostics; 1185:getRegisteredCommands(reserved?); 1186: reset; 1193: push; 1206: getCommandDiagnostics; 984: getRegisteredTool(name). |
| WI-2 | Tiền đề của fixture nên được kiểm bằng cách đọc `readDirEntries` một lần trong test, vì đó là thứ quyết định thứ tự. | SAI NGUYÊN TỬ | Kiểm bằng `fs.readdirSync`. Nhánh thư mục-đã-cấu-hình của `discoverExtensionPaths` gọi `resolveExtensionDirectory`, hàm này tự làm `fs.readdirSync` và không bao giờ chạm vào helper có cache của capability — `readDirEntries` không nằm trên đường đi mà fixture kích hoạt, nên kiểm bằng nó là xác nhận một tiền đề về nhầm hàm. | `packages/coding-agent/src/extensibility/extensions/directory-resolution.ts:114` — `children = fs.readdirSync(dir);`. `readDirEntries` không được import ở bất kỳ dòng nào trong file đó; import duy nhất của nó trong discovery là `helpers.ts:17`. |
| WI-2 | Sort `entries` bên trong `discoverLinkedExtensionModuleFiles` trước khi map. | THIẾU — BẪY NGUY HIỂM | Chỉ dẫn đúng, nhưng bỏ sót cái bẫy khiến nó sai trong cách làm hiển nhiên nhất: `entries` CHÍNH LÀ mảng đã cache, nên `.sort()` tại chỗ sẽ mutate cache ở tầng module dùng chung. Bước này phải nói rõ tạo bản sao. Không làm vậy thì thay đổi lặng lẽ đảo thứ tự kết quả cho sáu module discovery khác, không một lỗi nào, không một import nào đỏ. | `packages/coding-agent/src/capability/fs.ts:39-41` trả về `dirCache.get(abs) ?? []` — cùng tham chiếu `fs.Dirent[]`, không phải bản sao. Nơi dùng khác: `discovery/builtin.ts:48,531,582,701,743`; `cline.ts:23`; `gemini.ts:195`; `omp-extension-roots.ts:243`; `omp-plugins.ts:236`. |
| WI-2 | `getCommandDiagnostics()` trả về `Array<{ type: string; message: string; path: string }>` và cách sửa là thêm `paths: string[]` vào đó. | ĐÚNG NHƯNG CHƯA XÁC ĐỊNH | Phần khẳng định không có consumer là đúng. Nhưng plan không nói ở ĐÂU thì chẩn đoán xung đột tool được tính, và câu trả lời bị ép: `#commandDiagnostics` bị reset ở đầu `getRegisteredCommands` (runner.ts:1186), nên một chẩn đoán tool chỉ push vào đó sẽ vô hình với bất kỳ consumer nào chưa gọi `getRegisteredCommands()` trước. Spec giải quyết bằng một collector private thuần cộng một getter tính lại riêng, để báo cáo tool không mang theo hợp đồng thứ tự ẩn. | `runner.ts:1185-1186` — `getRegisteredCommands(reserved?) { this.#commandDiagnostics = [];`. `git grep -rn getCommandDiagnostics -- packages/` chỉ trả về `runner.ts:1206`. |
| **WI-3** | *Loại trội: sai ở tầng kiểu dữ liệu, không phải ở số dòng (4 dòng đầu) — đây là phần làm refactor tốn công; riêng dòng về `HookEvent` thì plan đã đúng và chỉ cần liệt kê lại cho người triển khai khỏi suy diễn lại. Ba dòng còn lại là neo cũ do HEAD dời, trùng loại với nhau và với dòng `model_changed`.* | | | |
| WI-3 | Kiểu giá trị của bảng là `(event: AgentSessionEvent) => RunnerEmitEvent \| undefined` (một `Record<RelayableEventKind, …>` trần đi kèm `satisfies`). | SAI — và làm theo đúng nghĩa sẽ tốn một lần refactor toàn bộ 19 nhánh | Phải dùng MAPPED type với giá trị trả về ASYNC: `type SessionEventRelays = { [E in RelayableEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<RunnerEmitEvent \| undefined> };`. Có hai lỗi độc lập trong dạng plan đưa ra. (a) Nó đồng bộ, nên hai nhánh có mutate state relay — `this.#turnIndex = 0` (4605) và `this.#turnIndex++` (4630) — không còn chỗ để đứng và sẽ bị rơi mất, khoá `turnIndex` ở 0 cho mọi extension suốt session. (b) Tham số của nó là toàn bộ `AgentSessionEvent` 28 thành viên, không narrow theo từng nhánh, nên `event.message` / `event.toolCallId` / `event.goal` không typecheck và cả 19 nhánh đều phải có một cast — đúng kết quả mà refactor này sinh ra để loại bỏ. Plan có gợi ý đúng đáp án ('copy CẢ HAI nửa, không chỉ object literal') rồi lại viết ra phác thảo của nửa không dùng được. | `packages/coding-agent/src/modes/controllers/event-controller.ts:107-109` — `type AgentSessionEventHandlers = { [E in AgentSessionEventKind]: (event: Extract<AgentSessionEvent, { type: E }>) => Promise<void>; };`, đóng ở `:357` bằng `} satisfies AgentSessionEventHandlers;`. Các nhánh ở đó đọc `e` với narrowing đầy đủ biến thể (`event-controller.ts:287-300`). `AgentSessionEventKind = AgentSessionEvent["type"]` ở `:74`. |
| WI-3 | Phần dispatch là `relayTable[event.type as RelayableEventKind]?.(event)` — 'cast `as` ở chỗ tra cứu là nơi duy nhất cần cast'. | SAI — cần HAI cast | `this.#sessionEventRelay[event.type as RelayableEventKind]` có kiểu `SessionEventRelays[RelayableEventKind]`, tức là hợp của 19 kiểu hàm. Gọi một hợp các kiểu hàm đòi hỏi đối số gán được cho PHÉP GIAO của các tham số, mà `AgentSessionEvent` đầy đủ không gán được cho `Extract<AgentSessionEvent, { type: "turn_start" }>`. Vì vậy chỗ tra cứu còn phải cast cả VALUE về một chữ ký rộng: `as ((event: AgentSessionEvent) => Promise<RunnerEmitEvent \| undefined>) \| undefined`. TUI làm đúng như vậy, và plan đã trích TUI làm mẫu mà không mang nửa dispatch sang. | `packages/coding-agent/src/modes/controllers/event-controller.ts:851` — `const run = this.#handlers[event.type] as (e: AgentSessionEvent) => Promise<void>;` |
| WI-3 | Dòng test runtime 'chính là thứ SẼ FAIL nếu ai đó bỏ sót một biến thể khỏi `RelayableEventKind` rồi thêm nó vào bảng'. | SAI NGHỊCH — câu tự mâu thuẫn và không test một sự kiện nào giữ được điều đó | Hai nửa của câu mô tả hai tình huống ngược nhau, và nửa nào cũng không làm cho dòng runtime mang trọng lượng. Nếu một tên có trong BẢNG nhưng không có trong union thì `satisfies` fail ngay như lỗi thừa thuộc tính — `bun run check:ts`, không phải dòng runtime. Nếu một tên vắng mặt ở CẢ HAI thì không chỗ nào fail: một session event mà không ai relay là một quyết định sản phẩm hợp lệ, không phải khiếm khuyết. Điều dòng runtime thực sự bảo vệ thì hẹp hơn và vẫn đáng có: bảng là đường dispatch SỐNG, và payload tới handler là payload mà session tạo ra. Hãy viết theo hướng đó; đừng để người review tin rằng test này chống chỗ thiếu. | `packages/coding-agent/tsconfig.json` includes `["src", "test", "scripts"]`, nên `tsgo --noEmit` typecheck chính cái bảng — đó là toàn bộ cổng chặn tính đầy đủ. Một test runtime một sự kiện chỉ quan sát việc giao của một sự kiện chứ không nói gì về 18 sự kiện còn lại. |
| WI-3 | Một khoá bảng `AgentSessionEvent["type"]` trần 'sẽ đòi hơn mười nhánh `() => undefined`'. | ĐÚNG VỀ NỘI DUNG, SAI SỐ ĐẾM | Đúng ra là 9, không phải 'hơn mười'. `AgentSessionEvent` có 28 tên type phân biệt (11 từ `AgentEvent` + 17 thêm bởi union của session); 19 relayable, còn lại 9: `tool_stream_update`, `model_changed`, `config_warnings_changed`, `advisor_cost_changed`, `advisor_yielded`, `todo_auto_clear`, `irc_message`, `notice`, `thinking_level_changed`. Kết luận — dùng `Extract` 19 thành viên — không đổi. Đáng viết đúng 9 tên này vào doc comment của `RelayableEventKind` để người kế tiếp thêm session event biết có đúng hai lựa chọn hợp lệ. | `packages/coding-agent/src/session/agent-session-events.ts:13-80` (union; 17 biến thể chỉ có ở session ở 29-80). `packages/agent/src/types.ts:1197-1219` — `AgentEvent` là 11 biến thể, kết thúc ở 1219. Đối chiếu chéo: bảng handler của TUI (`event-controller.ts:284-357`) có nhánh thật cho cả 28, vì TUI subscribe tất cả. |
| WI-3 | `model_changed`: 'hoặc xoá đoạn văn xuân tại agent-session.ts:9442-9443'. | SAI NEO, VÀ XOÁ CẢ KHỐI LÀ CÁCH SỬA SAI | Khối chú thích nằm ở 9523-9527, không phải 9442-9443, và chỉ mệnh đề thứ ba của nó mới lỗi thời. Dòng 1-2 ('Fan-out uses the synchronous `#emit` … would only add an extension-delivery await inside every model switch — including retry-fallback on the error path') là lý do nền tảng để dùng `#emit` thay vì `#emitSessionEvent`, và chúng vẫn đúng. Xoá đúng khẳng định '`model_changed` has no extension-facing hook (`#emitExtensionEvent` never maps it)' và thay bằng một con trỏ tới `RelayableEventKind`. Văn bản thay thế chính xác nằm ở bước 11. (Trùng loại trôi neo với hai dòng kế dưới, nhưng khác cơ chế: đây là trôi neo kèm khuyến nghị sửa sai.) | `packages/coding-agent/src/session/agent-session.ts:9523-9527`, đọc trực tiếp; ngay sau ở 9528-9530 là `if (isChanging) { this.#emit({ type: "model_changed" }); }`. |
| WI-3 | 19 nhánh relay nằm ở `agent-session.ts:4572-4770`, tên nhánh lấy từ `:4572-4720`; ghi chú `model_changed` ở `:9442-9443`; `RunnerEmitEvent` ở `extensions/runner.ts:344`; `ExtensionEvent` ở `extensions/extensions/types.ts:1095`; `AgentSessionEvent` ở `session/agent-session-events.ts:13-77`; `AgentEvent` ở `agent/src/types.ts:1189`; mẫu TUI ở `event-controller.ts:106-108` và `:279-352`. | BẢY NEO CŨ | Dùng các neo sau, tất cả đã xác nhận bằng `git grep -n` / `sed -n` tại HEAD 808b365: relay method 4602-4747; 19 phép so sánh `event.type ===` ở 4604, 4611, 4615, 4622, 4631, 4637, 4644, 4657, 4666, 4675, 4684, 4690, 4700, 4709, 4717, 4725, 4731, 4733, 4740; ghi chú `model_changed` 9523-9527; `RunnerEmitEvent` runner.ts:347; `ExtensionEvent` extensions/types.ts:1120; `AgentSessionEvent` agent-session-events.ts:13-80; `AgentEvent` agent/src/types.ts:1197-1219; mapped type của TUI event-controller.ts:107-109 và object literal 284-357 (`satisfies` đóng ở 357). | Đọc trực tiếp từng file; `agent-session.ts:4746-4747` cho thấy dấu `}` đóng chuỗi rồi đóng method; `event-controller.ts:357` là `} satisfies AgentSessionEventHandlers;`. |
| WI-3 | Repo đang ở git HEAD 5873776 trên branch milestone-1. | CŨ — commit đó không tồn tại trong repo này | HEAD thật là 808b365 ("docs(plan): fold the spec-verified M1 execution plan into the upgrade plan"), branch milestone-1, working tree sạch. `git cat-file -t 5873776` trả về 'fatal: Not a valid object name'. Mọi số dòng trong spec đã được kiểm chứng trên 808b365; nếu cây mã dịch chuyển trước khi triển khai, hãy kiểm lại bốn neo trong agent-session.ts (4602, 4747, 9523, 837) trước khi sửa. | `git rev-parse --short HEAD` -> 808b365; `git log --oneline -3` -> 808b365, 33d6e33, ecd516f. |
| WI-3 | `HookEvent` là union 15 thành viên tại `extensibility/hooks/types.ts:393` và thiếu 9 type chỉ-relay. | ĐÃ XÁC NHẬN — cảnh báo kiểu dữ liệu sắc nhất của plan vẫn đúng | Đúng 15 thành viên (394-408) và số dòng cũng đúng. Liệt kê ở đây để người triển khai khỏi suy diễn lại: SessionEvent, ContextEvent, BeforeAgentStartEvent, AgentStartEvent, AgentEndEvent, TurnStartEvent, TurnEndEvent, AutoCompactionStartEvent, AutoCompactionEndEvent, AutoRetryStartEvent, AutoRetryEndEvent, TtsrTriggeredEvent, TodoReminderEvent, ToolCallEvent, ToolResultEvent. 9 type chỉ-relay (message_start/update/end, tool_execution_start/update/end, retry_fallback_applied, retry_fallback_succeeded, goal_updated) vắng mặt — dùng nó làm kiểu khoá sẽ làm `Extract` sập về `never`. | `packages/coding-agent/src/extensibility/hooks/types.ts:393-408`. `ExtensionEventType` cũng được xác nhận là không tồn tại: `git grep -n ExtensionEventType -- packages` không trả về gì. |
| WI-3 | Ghi chú môi trường: `bun test` bị chặn bởi native addon chưa build; `bun run check:ts` chạy được. | ĐÃ XÁC NHẬN — hệ quả với cổng chặn được nói rõ | Đã chạy: `cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts` -> '0 pass, 1 fail, 1 error', 'Failed to load pi_natives native addon for darwin-arm64', gợi ý sửa `bun --cwd=packages/natives run build`. `bun run check:ts` ở HEAD exit 0 (đã kiểm, full run). Nên cổng chặn DUY NHẤT còn sống hôm nay là `check:ts` — may mắn, vì nó cũng chính là cổng mang tính đầy đủ. Đừng báo test là pass trước khi addon được build. | Các lần chạy trực tiếp trong phiên kiểm chứng; output của `bun run check:ts` kết thúc bằng `check:types \| Done` cho từng package và `[exited with code 0]`. |
| **WI-4** | *Loại trội: neo cũ (3/6: `types.ts:1322`, `package.json:93-96`, và `wrapper.ts:54-62` lệch đúng một dòng) — trong đó dòng `types.ts:1322` nguy hiểm vì nó trỏ sang một khai báo khác hẳn; riêng dòng về lệnh kiểm chứng thì phải đảo ngược kết luận của plan.* | | | |
| WI-4 | Đường ghi được cho phép nằm ở `packages/coding-agent/src/extensibility/extensions/types.ts:1322`. | CŨ — sai dòng, và nó trỏ tới một khai báo không liên quan | Dòng 1322 là `on(event: "tool_execution_end", handler: ExtensionHandler<ToolExecutionEndEvent>): void;` — một đăng ký sự kiện, không phải đường đăng ký tool. Neo đúng: interface `ToolDefinition` bắt đầu ở types.ts:636; trường `renderCall` ở types.ts:686 và `renderResult` ở types.ts:689; khai báo `registerTool` trên extension API ở types.ts:1347. Plan trích `:661` và `:664` ở hai chỗ khác — chúng cũng sai; dùng 686 và 689. | `grep -n 'registerTool<TParams' packages/coding-agent/src/extensibility/extensions/types.ts` -> 1347. `grep -n 'renderCall\|renderResult' .../types.ts` -> 686 và 689. `grep -rn 'interface ToolDefinition' packages/coding-agent/src/` -> types.ts:636. `sed -n '1300,1360p'` xác nhận dòng 1322 là event `tool_execution_end`. |
| WI-4 | `RegisteredToolAdapter` bọc các render hook ở `wrapper.ts:54-62`. | GẦN ĐÚNG — lệch một dòng ở cuối | Dải ràng buộc là 54-63, không phải 54-62. Dòng 50-53 là chú thích giải thích vì sao các method được định nghĩa có điều kiện; 54-57 là phép gán `renderCall`; 58-63 là phép gán `renderResult`, object literal của nó đóng ở 63. | `sed -n '50,64p' packages/coding-agent/src/extensibility/extensions/wrapper.ts` — `if (registeredTool.definition.renderCall) {` ở 54, `if (registeredTool.definition.renderResult) {` ở 58, và phần đóng `args,` / `);` / `}` chạy tới 63. |
| WI-4 | Lệnh kiểm chứng là `bun run check:ts && (cd packages/tui && bun test test/tool-renderers-frozen.test.ts) && (cd packages/coding-agent && bun test test/extension-tool-renderer-registration.test.ts)`, kèm ghi chú rằng chỉ nửa coding-agent bị chặn môi trường. | SAI — CẢ HAI file test đều bị chặn, gồm cả nửa tui mà plan coi là chạy được | `bun test` bị chặn với bất kỳ thứ gì tải native addon theo đường import, Ở CẢ HAI package. Đã dò bằng probe: trong `packages/tui`, `import * as m from "../src/tools/index"` fail với lỗi thiếu addon, và `../src/tools/renderer` thì không. Ranh giới chính xác là `packages/tui/src/theme/theme.ts:3` — `import { detectMacOSAppearance, MacAppearanceObserver } from "@oh-my-pi/pi-natives"`, một VALUE import (không phải `import type`). Mọi `ToolRenderer` đều nhận một `Theme`, nên mọi module renderer đều tải theme, nên cả registry không load được nếu thiếu addon. Nửa coding-agent bị chặn riêng: import `wrapRegisteredTools` từ `extensibility/extensions/wrapper` đi tới `../../tools/approval`, `../../tools/essential-tools` và `../../tools/file-write-fallback`, và probe ném lỗi. Lệnh mở khóa là `bun --cwd=packages/natives run build` — nhưng script đó là `bun ../../scripts/bazel-natives.ts host --dest native`, mà bazel KHÔNG được cài trong môi trường này, nên không mở khóa được tại đây. Hệ quả thực tế: `bun run check:ts` là cổng chặn thật duy nhất cho tới đó — và đó chính là lý do nửa `Readonly` của thay đổi này quan trọng đến vậy: nó là nửa mà `check:ts` thực sự có thể canh giữ. | Probe trong `packages/tui`: `../src/tools/renderer` -> OK; `../src/tools/index` -> 'Failed to load pi_natives native addon for darwin-arm64'; `@oh-my-pi/pi-tui/tools` -> y như vậy; `../src/theme/theme` -> y như vậy; `../src/chat/tool-execution` -> y như vậy. Cả 20 module renderer con dưới `src/tools/` đều probe ra bị chặn. Đối chứng với file có sẵn: `packages/tui/test/countdown-timer.test.ts` chạy xanh (2 pass), nên `bun test` bản thân nó chạy được — cái bị chặn là đồ thị import. Trong `packages/coding-agent`, `bun test test/tools/apply-patch-renderer.test.ts` -> 0 pass / 1 fail với cùng lỗi addon, và một probe import `wrapRegisteredTools` tái hiện nó. `which bazel bazelisk` -> not found. |
| WI-4 | WI-4 là `Object.freeze(toolRenderers)` — một chốt chặn runtime. (Chính các mục sau của plan thừa nhận rằng nó không mang cơ chế cưỡng chế nào và ràng buộc phải đến từ kiểu, đẩy nửa kiểu sang một 'WI-4b' mà không xuất hiện ở đâu trong bảng sóng M2.) | THIẾU ĐỊNH NGHĨA — nửa runtime một mình không đạt mục tiêu đã tuyên bố | `Object.freeze` trên một `const` khai báo kiểu `Record<string, ToolRenderer>` là vô hình với `bun check`: một người đóng góp viết `toolRenderers.grep = x` vẫn typecheck và vẫn compile. Mục tiêu của item — đóng lại cánh cửa sau để nó không thể lặng lẽ mở ra — vì thế chỉ được giao một nửa bởi cái freeze. Hãy thêm chú thích kiểu `Readonly`. Nó miễn phí, và điều này đã được kiểm chứng chứ không suy đoán: với `Readonly<Record<string, ToolRenderer>>`, `bun run --cwd packages/tui check:types` và `bun run --cwd packages/coding-agent check:types` đều pass sạch, và một lệnh ghi chèn vào `toolRenderers.probe_backdoor = toolRenderers.bash;` tại `tool-execution.ts:355` fail với `TS2542: Index signature in type 'Readonly<Record<string, ToolRenderer<unknown, unknown>>>' only permits reading.` Vì WI-4b không có chủ sở hữu trong bảng sóng, gộp nửa này vào là cách để nó không còn là việc của ai. Giữ cả freeze runtime — kiểu không chặn nổi một cast. | Đã áp thay đổi hai dòng lên một bản sao scratch, chạy `bun run --cwd packages/tui check:types` -> exit 0; `bun run --cwd packages/coding-agent check:types` -> exit 0; `bunx oxlint` -> sạch; `bunx oxfmt --check` -> sạch. Rồi chèn một dòng ghi và chạy lại type check của tui -> `src/chat/tool-execution.ts(355,3): error TS2542: Index signature in type 'Readonly<Record<string, ToolRenderer<unknown, unknown>>>' only permits reading.` Cây mã đã revert; `git status --porcelain` chỉ còn output spec chưa track. |
| WI-4 | Wildcard của export-map nằm ở `packages/tui/package.json:93-96`. | CŨ — lệch một dòng | Mục `"./*"` nằm ở dòng 94-97. Mục `"./tools"` mà các consumer trong repo thực sự resolve qua lại nằm ở dòng 86, và nó là một mục riêng, tường minh, không bị wildcard che. | `grep -n '"\./\*"\|"\./tools"' packages/tui/package.json` -> 86 cho `"./tools"`, 94 cho `"./*"`, 98 cho `"./components/*"`, 102 cho `"./*.js"`. |
| WI-4 | Có đúng 14 tham chiếu trong repo tới `toolRenderers` trên 5 file, tất cả chỉ đọc, không có cái nào là phép gán. | ĐÃ XÁC NHẬN — đừng suy diễn lại | Đã chạy lại `git grep -n toolRenderers -- packages` và thu được đúng 14 dòng trên đúng 5 file được nêu, đúng số dòng plan liệt kê. Cũng đã chạy probe writer trên toàn repo và thu được 0 kết quả cho `toolRenderers[x] =`, `toolRenderers.foo =` và `delete toolRenderers`. Việc plan hạ cỡ từ S xuống XS dựa trên bản kiểm kê này là hợp lý. Bỏ tiết một tiếng cho bạn. | `git grep -n toolRenderers -- packages` -> 14 dòng: gallery-cli.ts(4), gallery-cli.test.ts(2), apply-patch-renderer.test.ts(4), tool-execution.ts(2), tools/index.ts(2). `git grep -n 'toolRenderers\[.*\]\s*=\|delete toolRenderers\|Object.assign(toolRenderers'` -> không có kết quả nào. |
| **WI-5** | *Loại trội: bốn dòng trôi số dòng (do HEAD dời) và bốn dòng ĐÃ ĐÚNG — cả hai nhóm đều không cần sửa nội dung, chỉ sửa hoặc giữ neo. Ba dòng còn lại là tiền đề bị plan bỏ sót, và trong đó dòng FALSE về `registerProvider` là đính chính quan trọng nhất của cả phần này: nó biến WI-5 từ một sửa chữa đang chạy thành scaffolding tiền WI-10.* | | | |
| WI-5 | Bảng §5.2: 12 call site của `resetCapabilities()` nằm ở `main.ts:871`, `sdk.ts:4565`, `agent-session.ts:5405`/`:5790`/`:8779`, `session-tools.ts:1557`, và (không đổi) `ssh-command-controller.ts:208`/`:369`, `selector-controller.ts:310`, `builtin-marketplace.ts:36`, `helpers/ssh.ts:146`/`:167`. | CŨ — đếm đúng, bốn file đã trôi | SỐ ĐẾM chính xác: 12 call site trên 8 file, đã kiểm chứng. Nhưng số dòng đã trôi vì HEAD chuyển sang 808b365 (lần gấp plan M1). Neo đúng: `main.ts:872`, `sdk.ts:4571`, `session/agent-session.ts:5435`/`:5820`/`:8811`, `session/session-tools.ts:1651`. Không đổi và vẫn đúng: `modes/controllers/ssh-command-controller.ts:208` và `:369`, `modes/controllers/selector-controller.ts:310`, `slash-commands/builtin-marketplace.ts:36`, `slash-commands/helpers/ssh.ts:146` và `:167`. | `git grep -n resetCapabilities -- packages/coding-agent/src` tại HEAD 808b365. Cả 8 dòng import đã xác nhận là `import { reset as resetCapabilities }`. KHÔNG sửa tay số dòng: hãy chạy grep, nó là nguồn chuẩn. |
| WI-5 | §5.2/§5.3 trích `reconcileExtensionSources` ở `sdk.ts:4560-4624` với `resetCapabilities()` ở `:4565` và `setSuspendedExtensions()` ở `:4573`. | CŨ khoảng 6 dòng | `const reconcileExtensionSources = async ()` nằm ở `sdk.ts:4566`; `resetCapabilities()` ở `sdk.ts:4571`; `extensionRunner.setSuspendedExtensions(...)` ở `sdk.ts:4580`. DẠNG mà plan mô tả thì đúng tuyệt đối, và đây chính là phần xác nhận mang trọng lượng cho cả item: `resetCapabilities()` thật sự được gọi ngay trước `setSuspendedExtensions()`, tin rằng nó giải phóng registry trong khi nó chỉ xoá cache fs. | `sed -n '4566,4582p' packages/coding-agent/src/sdk.ts` |
| WI-5 | §5.2: `clearSourceRegistrations` ở `config/model-registry.ts:2914`. | LỆCH MỘT DÒNG | Method mở tại `config/model-registry.ts:2913`; `:2914` là dấu ngoặc mở của nó. `syncExtensionSources` ở `:2955` là đúng. | `sed -n '2908,2930p' packages/coding-agent/src/config/model-registry.ts` |
| WI-5 | Mục 'File path' của WI-5: ba Map và hai Set mutable ở tầng module nằm ở `capability/index.ts:30-41`. | CŨ — dải được trích BỎ SÓT hai Set | Ba Map ở `:34` (`capabilities`), `:37` (`providerCapabilities`), `:40` (`providerMeta`). Hai Set mutable ở `:43` và `:44` (`unboundDisabledProviders`, `unboundEnabledProviders`) — tức là NẰM NGOÀI dải được trích. Khối state thật là `:32-44`, và đó là năm container ở tầng module, không phải ba. Điều này quan trọng vì commit 2-3 thêm TWO Map nữa ngay cạnh chúng ở `:45-46`, nâng tổng lên bảy. | `grep -n '^const capabilities\|^const providerCapabilities\|^const providerMeta\|^let unbound' packages/coding-agent/src/capability/index.ts` |
| WI-5 | Mục 'File path' của WI-5: `defineCapability` ở `:88-96`, `registerProvider` ở `:99-127`. | GẦN CHÍNH XÁC | `defineCapability` ở `:89` (nhánh ném khi trùng id của nó ở `:90-91`); `registerProvider` ở `:101`. Lệch một dòng ở đầu mỗi cái. Nội dung thì xác nhận trọn vẹn: `registerProvider<T>(capabilityId: string, provider: Provider<T>): void` không có `sourceId` trong chữ ký, và `defineCapability` CÓ ném khi id trùng. | `sed -n '88,102p' packages/coding-agent/src/capability/index.ts` |
| WI-5 | WI-5 trích `capability/index.ts:554-556` cho `reset()`, `:561-566` cho `resetCapabilityForTests`, và `capability/index.ts:459` cho `getCapability`. | CHÍNH XÁC — cả ba neo đã kiểm chứng | Không sửa gì. `reset()` ở `:554-556` đúng là `clearFsCache();` và không gì khác. `resetCapabilityForTests()` ở `:561-566` xoá settingsHolds + hai Set unbound + fs cache (nó KHÔNG đụng tới `capabilities`). `getCapability<T>(id)` ở `:459` trả `capabilities.get(id)`. Đây là ba neo mà cả item treo vào, và cả ba đều đúng. | `sed -n '548,568p;455,462p' packages/coding-agent/src/capability/index.ts` |
| WI-5 | WI-5: `model-registry.ts:303-304` là dáng attribution để sao chép. | CHÍNH XÁC | Không sửa gì. `#runtimeProvidersBySource: Map<string, Set<string>>` ở `:303` và `#runtimeProviderSourceByName: Map<string, string>` ở `:304`. Logic steal-on-re-register cần soi là ở `:3010-3015` (đuổi `previousSourceId`), còn teardown cần soi là `clearSourceRegistrations` ở `:2913-2930`. | `sed -n '303,304p;3008,3024p' packages/coding-agent/src/config/model-registry.ts` |
| WI-5 | Plan liệt kê 14 call site của `defineCapability` và 84 cặp provider/capability. | CHÍNH XÁC — cả 14 số dòng đã kiểm chứng, đều ở tầng module | Cả 14 xác nhận đúng ở số dòng được trích: `context-file.ts:27`, `extension-module.ts:23`, `extension.ts:37`, `hook.ts:27`, `instruction.ts:25`, `mcp.ts:108`, `prompt.ts:23`, `rule.ts:392`, `settings.ts:23`, `skill.ts:58`, `slash-command.ts:29`, `ssh.ts:31`, `system-prompt.ts:31`, `tool.ts:27`. Con số 84 cũng đúng: 104 dòng `registerProvider` dưới `src/discovery/` trừ 20 dòng import = 84 call. | `git grep -n defineCapability -- packages/coding-agent/src`; `git grep -c registerProvider -- packages/coding-agent/src/discovery/` |
| WI-5 | (Plan không nói điều này) Ngầm định rằng WI-5 giả định có một caller sống nào đó truyền `sourceId` vào `registerProvider` của capability, để `unregisterProvidersForSource` có thứ để gỡ. | SAI — đây là điều đáng kể nhất plan bỏ sót | KHÔNG có chỗ nào trong repo đăng ký capability-provider theo từng source. Cả 84 call `registerProvider` của capability đều là phát biểu top-level ở tầng module trong `src/discovery/*.ts` (agent-plugins, agents-md, agents, builtin-defaults, builtin, claude-plugins, claude, cline, codex, cursor, gemini, github, mcp-json, omp-plugins, opencode, skillshare, ssh, vscode, windsurf) — đã kiểm chứng: không call site nào nằm lồng trong một hàm. Extension đóng góp vào capability registry bằng cách được ĐỌC tại thời điểm `load(ctx)`, không phải bằng cách đăng ký provider. `registerProvider` trên extension API (`extensibility/extensions/types.ts:1570`, `:1743`) là hàm cùng tên nhưng khác vai trò của MODEL registry, và nó đã nhận `sourceId`. Hệ quả: call `unregisterProvidersForSource` trong nhánh suspend của `sdk.ts` là INERT tại thời điểm ship — nó sẽ là một tra cứu Map luôn trượt, vì map luôn rỗng. Đó là scaffolding tiền WI-10, không phải một sửa chữa đang chạy. Do đó hai test attribution buộc phải điều khiển registry API TRỰC TIẾP (đăng ký với sourceId, rồi gỡ), KHÔNG đi qua đường TUI/suspend, và mô tả PR không được tuyên bố rằng bật tắt một extension bây giờ đã giải phóng provider trong thực tế. | `git grep -n registerProvider -- packages/coding-agent/src/discovery/` — mọi kết quả hoặc là dòng `import` hoặc là phát biểu top-level `registerProvider`; bộ lọc các kết quả không-top-level chỉ trả về dòng import. `git grep -n 'registerProvider' -- .../extensibility/extensions/{loader,runner,types}.ts` cho thấy chúng đi tới `ModelRegistry.registerProvider(name, config, sourceId)`, không phải bản capability. |
| WI-5 | Dòng test (c) của WI-5: sau `resetRegistry()`, một provider đăng ký từ một `sourceId` vẫn còn trong danh sách đã resolve. | ĐÁNG GIỮ — nhưng chỉ khi `resetRegistry` được giữ hẹp | Dòng này buộc `resetRegistry()` chỉ xoá map `capabilities` — không xoá `providerCapabilities`, không xoá `providerMeta`, không xoá các mảng `providers` theo từng capability, và không xoá các map attribution mới. Giữ nó hẹp như vậy, nếu không dòng này không cài được. Lưu ý phần suy giảm được chấp nhận: sau `resetRegistry()`, `getProviderInfo` vẫn duyệt `providerCapabilities` và thấy `capabilities.get(capId) === undefined`, nên rơi xuống `priority = 0` (xem `capability/index.ts:502-522`). Điều đó chấp nhận được cho một hàm chỉ tồn tại để phục vụ test và một đường reload extension tương lai, nhưng nó phải là một lựa chọn có chủ đích, không phải tai nạn. | `sed -n '502,525p' packages/coding-agent/src/capability/index.ts` |
| WI-5 | Lệnh kiểm chứng của WI-5: `bun run check:ts && (cd packages/coding-agent && bun test test/capability/reset-contract.test.ts test/capability/provider-source-attribution.test.ts)`. | BỊ CHẶN MỘT NỬA tại HEAD 808b365 | `bun run check:ts` PASS tại HEAD — đã kiểm chứng trọn vẹn, cả 15 package đều xanh. Nửa `bun test` KHÔNG chạy được: native addon chưa build, nên ngay cả file có sẵn, không liên quan là `test/capability/rule-agents.test.ts`, cũng báo `0 pass / 1 fail` với 'Failed to load pi_natives native addon for darwin-arm64'. Build trước bằng `bun --cwd=packages/natives run build`, rồi nửa `bun test` trở lại chạy được. Khá chắc hai test mới KHÔNG bị chặn ngay cả khi thiếu addon, vì `capability/index.ts` không import `@oh-my-pi/pi-natives` (khác `discovery/helpers.ts:4`, thứ làm hỏng test có sẵn) — nhưng `capability/index.ts` có kéo `./fs`, `../extensibility/settings` và `../config/model-settings`, nên điều này CHƯA được kiểm chứng. Hãy kiểm sớm: nó quyết định item này có kiểm chứng được trước khi build Rust hay không. | `bun run check:ts` -> mọi package Done. `cd packages/coding-agent && bun test test/capability/rule-agents.test.ts` -> 0 pass, 1 fail, 'Failed to load pi_natives native addon for darwin-arm64'. |
| WI-5 | (Plan không nói điều này) Dòng 2 của `reset-contract.test.ts` gọi `resetRegistry()`, hủy định nghĩa capability ở tầng module cho suốt tiến trình còn lại. | ĐÃ GIẢI QUYẾT — đã kiểm thực nghiệm, thiết kế hai dòng-trong-một-file của plan là an toàn | Điều này đã được kiểm trực tiếp thay vì suy luận: `bun test` cấp cho mỗi test FILE một module registry mới, còn state của module ĐƯỢC chia sẻ giữa các khối `test()` BÊN TRONG một file. Một file xoá một Map ở tầng module không ảnh hưởng tới một file test anh em (đã kiểm: 2 pass / 0 fail, file thứ hai vẫn thấy giá trị trước khi xoá). Vì vậy `resetRegistry()` trong `reset-contract.test.ts` không thể đầu độc `provider-source-attribution.test.ts` hay file nào khác. Chỉ dẫn của plan rằng hai dòng phải ở đúng thứ tự là đúng, và lý do nay đã được xác nhận bằng thực nghiệm: trong cùng một file, `resetRegistry()` ở dòng 2 sẽ làm dòng 1 fail nếu dòng 1 chạy sau. | Repro tách biệt trong scratchpad: `a.test.ts` gọi `nuke()` rồi khẳng định đã xoá; `b.test.ts` khẳng định mục ở tầng module vẫn còn. `bun test` -> `2 pass 0 fail`. Đối chứng cùng file (`c.test.ts`) cho thấy state tồn tại xuyên suốt ba khối `test()`. |
| **WI-8a** | *Loại trội: ba dòng trôi số dòng nhỏ (một dòng, một dòng, một dòng) và ba dòng ĐÃ ĐÚNG cần giữ nguyên; ba dòng còn lại là tiền đề plan không nói, trong đó dòng về bản sao thứ hai trong `loader.ts` là cái nguy hiểm nhất vì nó tái hiện đúng mối nguy mà item này sinh ra để tránh.* | | | |
| WI-8a | `registry.ts:476-480` — tầng env là opt-in, `envValue()` trả undefined khi một setting không khai báo `definition.env`. | SAI DÒNG, KẾT LUẬN ĐÚNG | Dòng 476-480 là thân CONSTRUCTOR (`this.#parseEnv = ...` ở :477-479, `this.envFallback = ...` ở :478), không phải `envValue`. Hàm mà plan muốn nói là `envValue()` ở `config/registry.ts:514-522`, và guard opt-in của nó là dòng đầu: `if (!this.envName \|\| !this.#parseEnv) return undefined;` (:515). Hãy trích :515, hoặc :514-522. | grep -n trên `packages/coding-agent/src/config/registry.ts`: `envValue():` ở 514, `#effectiveEnv` ở 526, và dòng 478 là `this.envFallback = typeof env === "object" ? (env.fallback ?? false) : false;` — một phép gán trong constructor. Kết luận của plan vẫn đúng, con trỏ của nó thì không. |
| WI-8a | `Settings.getProvenance` (settings.ts:800-808) kiểm tra năm tầng và không bao giờ trả `"env"`; chỉ `Setting.provenance(scope)` tại `registry.ts:764-765` mới có thể. | ĐÃ XÁC NHẬN ĐÚNG | Không sửa gì. Đây là claim mang trọng lượng nhất của item và nó đúng tuyệt đối. `getProvenance` tại `config/settings.ts:800-808` trả runtime/overlay/project/global/parent-default, còn `Setting.provenance` tại `config/registry.ts:763-765` trả `this.#effectiveEnv(scope) !== undefined ? "env" : settingsOf(scope).getProvenance(this)`. Thành viên `"env"` của union tại `settings.ts:62` chỉ tới được đúng từ một bề mặt. | sed `settings.ts:800-808` cho thấy return năm nhánh kết thúc bằng `return this.#parent?.getProvenance(setting) ?? "default";`. sed `registry.ts:763-765` cho thấy ternary `#effectiveEnv`. Test phải khẳng định qua cái sau. |
| WI-8a | `register()` tại `registry.ts:783-792` ném khi trùng id, và đó là lý do namespacing mang trọng lượng. | ĐÃ XÁC NHẬN ĐÚNG, NHƯNG THIẾU — VÀ PHẦN THIẾU CHÍNH LÀ RỦI RO LỚN NHẤT CỦA ITEM | Lệnh ném là có thật ở :787 và khối doc bắt đầu ở :783, nên dải đúng. Điều plan không nói là registry CHỈ THÊM, KHÔNG BAO GIỜ XOÁ: `byId.set` (:789) là mutation duy nhất của `byId`, `ordered.push` (:790) là mutation duy nhất của `ordered`, và `resetRegistryForTest` (:953) chỉ chạm vào mảng `effects`. KHÔNG có unregister. Nên một thiết kế đăng ký plugin settings động lúc load sẽ làm lần load thứ hai của cùng một plugin trong một tiến trình ném lỗi — mà reload, suspend/resume (WI-1, WI-7) và unload (WI-9) đúng là những thứ các đợt sau xây. Spec thêm một `registerPluginSetting` idempotent trả về handle cũ khi tra lại trùng, làm bước 1. | grep -n 'byId' trên registry.ts trả về đúng bốn kết quả: khai báo :778, kiểm tra has() :787, set :789, get :796. grep -n 'ordered' trả về khai báo :779 và push :790. `resetRegistryForTest` ở :953 có thân gọi `unbindEffects()` và duyệt `effects` — không bao giờ chạm `byId`. |
| WI-8a | Side-channel store là `manager.ts:929-960` đọc từ hai file, và việc migrate vùng đó là phần công việc. | THIẾU — có một bản sao thứ hai của cùng phép merge và plan không hề nhắc | `packages/coding-agent/src/extensibility/plugins/loader.ts:474-483` export một hàm `getPluginSettings(pluginName, cwd)` ở tầng module, là bản sao từng byte của phép merge `{ ...global, ...project }` trên đúng hai file legacy đó. Nó được re-export qua barrel `extensibility/plugins` (`plugins/index.ts:5`) và chính là hàm một EXTENSION gọi theo tên. Chỉ migrate `manager.ts` nghĩa là đường đọc phía extension vẫn nằm trên file legacy mãi mãi — đúng mối nguy 'hai đường đọc, bạn migrate một cái' mà plan tự đặt làm nguy cơ chính, tái hiện y hệt cách file kế. Nó dễ bỏ sót chính vì `git grep` không thấy caller nào trong repo: consumer của nó là code bên thứ ba. Bước 8 của spec phủ khoản này. | sed `loader.ts:460-483` cho thấy `export async function getPluginSettings(pluginName: string, cwd: string)` gọi `loadRuntimeConfig()` và `loadProjectOverrides(cwd)` rồi trả `{ ...global, ...project }`. `git grep -n getPluginSettings` trên toàn packages chỉ trả về manager.ts, loader.ts, plugin-cli.ts, tui/overlays/plugin-settings.ts và các test — không có caller sản xuất nào cho bản loader. |
| WI-8a | Tab Plugins nằm ở `packages/tui/src/overlays/settings-selector.ts:435` và item này phải để yên nó. | SAI DÒNG, CHỈ DẪN ĐÚNG | Tab hard-code nằm ở :438, không phải :435: `{ id: "plugins", label: ... }`, bên trong `getSettingsTabs()` (:433-440). Có một hit thứ hai ở :856. Chỉ dẫn để yên là đúng và là việc của blocker 4 của WI-8b, không phải của item này. Cùng một dòng sai này lặp lại trong danh sách file của WI-8b. | grep -n 'id: "plugins"' trên settings-selector.ts trả về :438 và :856; sed 420-450 đặt tab Plugins ở 438 bên trong getSettingsTabs(). |
| WI-8a | Dạng `ProjectPluginOverrides` tại `plugins/types.ts:156-163`, với `settings?` ở `:162`. | CŨ MỘT DÒNG | Interface nằm ở :156-162 và trường `settings?` ở :161, không phải :162. Ba trường là `disabled?` (:157), `features?` (:159), `settings?: Record<string, Record<string, unknown>>` (:161). Điểm đáng lưu vì item này chỉ migrate `settings` — file vẫn còn với hai trong ba trường của nó, nên nó KHÔNG bị xoá. | sed `types.ts:150-170` cho thấy `export interface ProjectPluginOverrides {` ở 156, `disabled?` 157, `features?` 159, `settings?` 161, dấu ngoặc đóng 162. |
| WI-8a | Tầng env là nơi giá trị của test bị env var ghi đè, và plan chỉ ra rằng một dòng khẳng định `"env"` mà không khai báo `env` thì phải fail. | ĐÃ XÁC NHẬN, KÈM MỘT LẬT NGƯỢC MÀ PLAN BỎ SÓT | Cả opt-in lẫn hành vi fail-không-khai-báo đều đúng. Điều plan không nhắc là `envFallback`: `#effectiveEnv` (`config/registry.ts:526-536`) làm cho env NHƯỜNG bất kỳ tầng nào được cấu hình khi definition đặt nó, và mặc định là `false` (:478), nên env thắng theo mặc định. Một fixture khai báo `envFallback: true` sẽ khiến giá trị project thắng và `provenance` báo `"project"` — một test đỏ cho hành vi ĐÚNG, đúng dạng sai lầm mà người ta sẽ 'sửa' bằng cách làm yếu assertion. Spec gọi đây là cái bẫy ở dòng 3. | sed `registry.ts:526-536` cho thấy `if (value === undefined \|\| !this.envFallback) return value;` rồi đến nhánh `envFallback === true` và các nhánh so sánh chuỗi. registry.ts:478 là `this.envFallback = typeof env === "object" ? (env.fallback ?? false) : false;`. |
| WI-8a | Rủi ro migration đã được phủ trọn bởi test provenance chạy tiering thật. | NÓI QUÁ | Test provenance bảo vệ TIERING, không bảo vệ MIGRATION. Ba chế độ hỏng vẫn sống sót qua nó: (a) một migration không có dấu hoàn tất sẽ chạy lại mỗi lần start và hồi sinh những khoá mà người dùng đã xoá sau lần chạy đầu — không phát hiện được bởi một bộ test chỉ migrate đúng một lần; (b) tầng bền vững mới bị sai và giá trị được ghi đi đâu đó mà đường đọc không hề tra; (c) `deletePluginSetting` lặng lẽ đổi nghĩa từ 'xoá hẳn' thành 'chỉ xoá tầng global'. Vì vậy cổng chặn của spec này thêm một bước thủ công (4) phủ trường hợp hồi sinh khi chạy lại, cùng hai open_questions liên quan, thay vì chỉ dựa vào test. | `unsetGlobalValue` (`config/settings.ts:845-859`) chỉ gọi `deleteByPath(this.#global, segments)`; không có xoá ở tầng project bất cứ đâu trong hàm đó, và bản side-channel cũ cũng không có. |
| WI-8a | Môi trường: `bun test` báo 0 pass vì native addon chưa build; `bun run check:ts` là cổng dùng được. | ĐÃ XÁC NHẬN CHÍNH XÁC | Không sửa gì. Đã tái hiện cả hai. `bun test test/config/settings-registry.test.ts` -> `0 pass / 1 fail`, `Cannot find module .../native/pi_natives.darwin-arm64.node`, kèm chính gợi ý của loader `bun --cwd=packages/natives run build`. `bun run check:ts` -> sạch, oxlint + oxfmt pass trên 5445 file, cả 17 package `check:types` Done. Lệnh build là nửa đầu của cổng; nửa test bị chặn tới khi nó chạy. | Thực thi trực tiếp cả hai lệnh trong repo tại HEAD 808b365 trên branch milestone-1. |
| **WI-9** | *Loại trội: năm dòng trôi số dòng (đều lệch 6-25 dòng, vùng vẫn nhận ra được) — nhưng dòng đầu không chỉ trôi dòng mà còn kèm một TIỀN ĐỀ BẮT BUỘC mà plan không liệt kê thành bước. Bốn dòng còn lại là plan im lặng hoặc khẳng định ngược với code; trong đó dòng về `flagValues` cho thấy thay đổi là bốn file, không phải một file.* | | | |
| WI-9 | `runner.ts:1333` — 'cú quét dispose() toàn bộ #fileFallbackDisposers; unload phải tiêu đúng disposer của extension đó' | SAI DÒNG + THIẾU TIỀN ĐỀ | Cú quét không ở 1333 và không phải một `dispose()` trần. Nó là `disposeFileFallbacks()` ở runner.ts:1346-1348, được gọi từ hai nơi: shutdown của session (runner.ts:410) và guard re-initialize (runner.ts:747). Quan trọng hơn: yêu cầu của plan hiện chưa diễn đạt được — `#fileFallbackDisposers` (runner.ts:537) là một `Array<() => void>` phẳng, không gắn với extension nào, nên 'disposer của extension đó' không tồn tại. Chuyển nó thành Map khoá theo path là công việc BẮT BUỘC BÊN TRONG WI-9 mà plan không liệt kê thành bước. | `git grep -n '#fileFallbackDisposers'` -> runner.ts:537 (khai báo), 777, 796 (push), 1347 (splice sweep). `git grep -n 'disposeFileFallbacks'` -> runner.ts:410, 747, 1346. |
| WI-9 | (1) 'module graph được cache bởi runtime, nên unload thật cần cache-busting' … 'coi module cache là follow-up' | SAI — đã được hiện thực từ trước | Cache-busting không phải follow-up; nó đã tồn tại và đã per-load. `loadLegacyPiModule` nối thêm một tag tăng dần đơn điệu vào entry specifier ở MỖI lần import, nên mỗi lần load vốn đã nhận một module graph mới. Không có việc cache nào để WI-9 làm. Lời khuyên sắp xếp của plan ('giải quyết teardown bucket trước, coi module cache là follow-up') đang nhắm vào một vấn đề codebase không có. Nếu reload có bao giờ nằm trong phạm vi thì nó thừa hưởng cơ chế này miễn phí; nếu không thì WI-9 thuần túy là teardown và đoạn văn về module graph nên bị xoá khỏi plan. | `legacy-pi-compat.ts:2630` `return await import(\`${entrySpecifier}?mtime=${nextLegacyPiLoadTag()}\`)` bên trong `loadLegacyPiModule` (2613-2637); `nextLegacyPiLoadTag` ở 2101-2104 trả về `String(Math.max(legacyPiLoadTag + 1, Date.now()))` — đơn điệu, nên không hai lần load nào chia sẻ một tag. |
| WI-9 | `types.ts:1777-1792` (11 bucket phải giải phóng), `:1783` (toolRegistrationListeners là Set per-extension) | SAI DÒNG (lệch khoảng 25) | `interface Extension` nằm ở types.ts:1801-1817; `toolRegistrationListeners?: Set<ToolRegistrationListener>` nằm ở dòng 1808. Con đếm 11 bucket và kết luận 'không cần đổi dạng' đều đúng — chỉ có số là sai. | git grep -n trên types.ts -> handlers 1805, tools 1806, toolRegistrationListeners 1808, assistantThinkingRenderers 1809, fileWriteFallbackHandlers 1810, fileDeleteFallbackHandlers 1811, messageRenderers 1812, composerShapes 1813, commands 1814, flags 1815, shortcuts 1816. |
| WI-9 | `runner.ts:763` (điều kiện cài trampoline) và `:766-771` (bất biến trampoline cần giữ) | SAI DÒNG | Guard bỏ qua nằm ở runner.ts:756: `if (ext.fileWriteFallbackHandlers.length === 0 && ext.fileDeleteFallbackHandlers.length === 0) continue;`. Các lệnh cài thật là `addFileWriteFallback(...)` ở 778 và `addFileDeleteFallback(...)` ở 797. Khối chú thích bất biến plan trỏ tới là block 750-755. Lập luận về dòng baseline của plan ('một dòng khẳng định seam rỗng sẽ xanh trên HEAD') dù vẫn ĐÚNG lại là phần sắc nhất của item — hãy giữ nó. | `sed -n '750,790p' runner.ts` và `git grep -n 'addFileWriteFallback\|addFileDeleteFallback'` -> runner.ts:778, 797. |
| WI-9 | `runner.ts:1290-1292` (timer thuộc runtime scope) | SAI DÒNG (lệch khoảng 14) | Bộ ba timer nằm ở runner.ts:1304-1306 bên trong createContext(): setInterval/setTimeout/clearTimer đều uỷ thác về một `#managedTimers` duy nhất toàn runner. Claim nội dung — kho timer là toàn-runner, không có chủ sở hữu per-extension, và đó là lý do WI-1 là tiền đề cứng — được XÁC NHẬN: ManagedTimers giữ một `Set<Timer>` phẳng và chỉ phơi ra `clear(handle)` và `clearAll()`. Nên unload không thể giải phóng timer của một extension cho tới khi WI-1 bổ sung sở hữu per-extension. | `git grep -n 'managedTimers'` -> runner.ts:518 (field), 1304-1306 (đăng ký), 1336-1337 (clearManagedTimers). `managed-timers.ts:22-68`, `#timers = new Set<Timer>()`, các method setInterval/setTimeout/clear/clearAll và không gì khác. |
| WI-9 | Dòng (b) nói về giá trị runtime của registerFlag tại `loader.ts:265` | THIẾU — ba call site nữa plan không hề nhắc | `flagValues` có BỐN writer và một reader phẳng trên toàn package, và chỉ một writer nằm trong loader.ts. Ba writer kia sẽ hỏng lặng lẽ nếu bị bỏ sót khi reshape: runner.ts:1099 `setFlagValue` (không có extension — đây là câu hỏi mở), runner.ts:1095 `getFlagValues()` (trả một bản sao phẳng — phải trở thành một phép flatten trên this.extensions), và main.ts:2210 `extensionsResult.runtime.flagValues.set(name, value)` (đi vòng qua runner hoàn toàn). `flagValues` sau khi reshape là một thay đổi bốn file, không phải thay đổi cục bộ trong loader.ts, và dòng (b) của plan không chuẩn bị tinh thần cho điều đó. | `git grep -n '\.flagValues' -- packages/coding-agent/src` trả về đúng năm kết quả: loader.ts:265, loader.ts:293, runner.ts:1095, runner.ts:1099, main.ts:2210. |
| WI-9 | Cơ chế của dòng (c): 'extension rời registry, nên nó không còn đăng ký được tool, nên bucket của nó không còn ai drain' | ĐÚNG MỘT NỬA — cơ chế nêu ra yếu hơn đã tuyên bố | Phần phân tích còn lại hoàn toàn đúng: bucket là per-extension, loader.ts:223 là reader duy nhất của nó, và disposer onToolRegistered (runner.ts:1044-1048) đóng trên một mảng `subscriptions` cục bộ, hủy đúng LẦN đăng ký đó trên mọi extension — một hợp đồng khác, không phải hợp đồng unload. Nhưng 'nó không còn đăng ký được tool nữa' chỉ đúng với đường lúc load. Object API của Extension A vẫn giữ Extension của nó sau khi unload, nên một closure bất đồng bộ bị giữ lại gọi `api.registerTool` về sau vẫn drain listener set của A và listener vẫn nổ. Test theo cách plan viết (đăng ký ở extension B) pass dù có hay không, nên không phân biệt được. Một dòng — `extension.toolRegistrationListeners?.clear()` bên trong unloadExtension — làm cho hợp đồng đã tuyên bố trở thành vô điều kiện. Hãy viết dòng test theo hợp đồng HÀNH VI (listener không nổ), vốn đúng bất kể, và thêm lệnh clear để cơ chế khớp với claim. | `loader.ts:222-223` — `this.extension.tools.set(tool.name, registered); for (const listener of this.extension.toolRegistrationListeners ?? []) listener(tool.name);` — vòng lặp không đặt điều kiện vào membership registry. `ConcreteExtensionAPI` giữ `private readonly extension: Extension` (loader.ts:193) suốt đời của object API. |
| WI-9 | Lệnh kiểm chứng `bun run check:ts && (cd packages/coding-agent && bun test test/extension-unload.test.ts test/extensions-runner.test.ts)` | CHẠY ĐƯỢC MỘT NỬA như đã viết | Nửa đầu chạy và xanh (đã chạy trên HEAD 808b365: cả 15 package Done, exit 0). Nửa sau không chạy được trên máy này: native addon chưa build, nên mọi file test báo 0 pass / 1 fail trước khi khẳng định điều gì. Hãy nói cổng chặn là bị chặn thay vì trình bày lệnh ghép như một pass/fail duy nhất. | `bun run check:ts` -> cả 15 @oh-my-pi/*:check:types Done. `cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts` -> '0 pass, 1 fail, 1 error, Ran 1 test across 1 file' với 'Failed to load pi_natives native addon for darwin-arm64' tại `packages/natives/native/index.js:23:24`. |
| WI-9 | Xếp đợt sóng: WI-9 cuối đợt 7, cần bản kiểm kê đầy đủ chỉ tồn tại sau khi đợt 2 và 4 trao quyền sở hữu cho state timer, provider và capability | ĐÃ XÁC NHẬN | Không sửa gì. Phụ thuộc là có thật và đã được kiểm chứng: ManagedTimers không có chủ sở hữu per-extension, và `unregisterProvider(name, sourceId)` sẵn có (types.ts:1745) đã khoá theo sourceId — đó là tiền lệ mà reshape flagValues nên soi theo, và plan đúng khi nói WI-9 không được làm trước. | `managed-timers.ts:22-68` (không khoá theo extension); `types.ts:1745` `unregisterProvider(name: string, sourceId: string): void;`. |
| WI-9 | `runner.ts:934-956` (suspend) và `:984-1050` (phóng onToolRegistered), `:1031-1035` (disposer theo từng đăng ký) | SAI DÒNG (lệch 6-13, vùng vẫn nhận ra được) | setSuspendedExtensions ở 947 (doc comment 940-946, thân tới 970); isExtensionActive ở 937. Chữ ký onToolRegistered ở 997, wrapper per-extension ở 1027-1040, và disposer ở 1044-1048, không phải 1031-1035. Đặc tả của plan về disposer đó là đúng: nó đóng trên một mảng `subscriptions` cục bộ và hủy một lời gọi onToolRegistered trên mọi extension cùng lúc. | git grep -n trên runner.ts -> setSuspendedExtensions 947, onToolRegistered 997, `extension.toolRegistrationListeners.add(wrapped)` 1041, thân disposer 1044-1048. |
| **WI-12** | *Loại trội: một cụm trôi đồng loạt +25 dòng trên ba neo liên tiếp trong cùng một file — đó là hệ quả của việc HEAD dời, không phải ba lỗi riêng. Nhưng dòng đầu về tiền đề kiến trúc mới là đính chính nặng nhất của WI-12: nó làm Option B trong plan không còn là lựa chọn kém hơn mà là hồi quy so với một đường đã ship.* | | | |
| WI-12 | §WI-12 của plan: 'Extension API tiêu thụ được MCP ... nhưng KHÔNG đóng góp được server — config MCP do core sở hữu qua `mcpSettings` cộng writer `setMcpServerEnabled` của dashboard.' | CŨ VÀ NÓI QUÁ — tiền đề sai một nửa, và nửa sai đó đổi kiến trúc nào là đúng | Nửa ExtensionAPI là đúng: `ExtensionAPI` (extensions/types.ts:1256) không khai báo phương thức đóng góp MCP nào, và các thành viên MCP duy nhất đều là chiều vào (types.ts:663, :665, :1340, :904-916). Nhưng một extension PACKAGE đã đóng góp MCP server từ hôm nay, theo kiểu khai báo. Ba provider đăng ký capability mcps: `registerProvider<MCPServer>(mcpCapability.id, …)` tại discovery/omp-plugins.ts:423, discovery/agent-plugins.ts:335 và discovery/claude-plugins.ts:737 — tổng cộng 12 provider đăng ký nó. omp-plugins đọc `.mcp.json` / `mcp.json` từ gốc package (`MCP_FILENAMES` tại omp-plugins.ts:275, `loadMCPServers` tại :293-370, đăng ký tại :423), và docs/mcp-config.md:40 cùng :489-491 đã tài liệu hoá extension package là một nguồn MCP, xếp thứ 2 trong thứ tự ưu tiên discovery. Lỗ hổng thật vì thế hẹp hơn và phải được phát biểu đúng là: một extension module đã được LOAD và đang SỐNG không thể đóng góp server một cách mệnh lệnh (imperatively) lúc chạy. Phân biệt đó mang trọng lượng — Option B dưới đây không chỉ bị bất lợi, nó là hồi quy so với một con đường đã ship. | `grep -n 'registerProvider<MCPServer>\|registerProvider(mcpCapability' packages/coding-agent/src/discovery/` -> 12 kết quả (agent-plugins.ts:335, builtin.ts:241, claude-plugins.ts:737, claude.ts:578, codex.ts:536, cursor.ts:201, gemini.ts:302, mcp-json.ts:186, omp-plugins.ts:423, opencode.ts:507, vscode.ts:22, windsurf.ts:138); `sed -n '36,44p;484,495p' docs/mcp-config.md`; `grep -n 'mcp' packages/coding-agent/src/extensibility/plugins/types.ts` -> không có kết quả nào (PluginManifest tại :26-49 không có trường mcp; MCP đến qua quy ước .mcp.json riêng, không phải qua manifest). |
| WI-12 | §WI-12 file path: `extensibility/extensions/types.ts:1315` (thành viên MCP duy nhất của API — chiều vào). | CŨ, LỆCH +25 | Thành viên MCP duy nhất của bề mặt API nằm ở `types.ts:1340`: `on(event: "mcp_notification", handler: ExtensionHandler<McpNotificationEvent>): void;` — overload `on(...)` cuối cùng trong khối event chạy :1290-1340. Đã xác nhận đây là thành viên MCP DUY NHẤT: `grep -n 'mcp' packages/coding-agent/src/extensibility/extensions/types.ts` trả về đúng năm hit (:663, :665, :711, :905, :908, :1340) và :711 là doc comment của `SourceInfo.source`, không phải thành viên. | `grep -n 'mcp' packages/coding-agent/src/extensibility/extensions/types.ts` tại HEAD 808b365; file dài 1849 dòng. |
| WI-12 | §WI-12 file path: `types.ts:638`/`:640` (mcpServerName / mcpToolName) và `:879-883` (McpNotificationEvent). | CŨ, LỆCH +25 (trôi đồng loạt trên cả ba neo trong file này) | Neo đúng: `mcpServerName?: string;` ở `types.ts:663` với doc comment ở :662; `mcpToolName?: string;` ở `:665` với doc comment ở :664; `export interface McpNotificationEvent` ở `:904` chạy tới `:916` (`type: "mcp_notification"` :905, `server: string` :911, `method: string` :913, `params: unknown` :915). Nó được hợp nhất vào event map ở `:1149`. Cùng mức trôi +25 đó áp dụng cho các trường `ToolDefinition` của extension tool mà lập luận Option B của plan dựa vào: `approval?: ToolApproval` ở `:658` (doc comment :656-657 nói mặc định là `"exec"` khi bỏ trống) và `sourcePath?: string` ở `:672`. Cặp trùng lặp y hệt nằm trên `CustomTool` nội bộ tại custom-tools/types.ts:213-215 và :221. | `grep -n 'mcpServerName\|mcpToolName\|McpNotificationEvent\|approval?:\|sourcePath?:' packages/coding-agent/src/extensibility/extensions/types.ts packages/coding-agent/src/extensibility/custom-tools/types.ts` tại HEAD 808b365. |
| WI-12 | §WI-12 file path: quyền sở hữu ở core tại `mcp/config-writer.ts` qua `modes/components/extensions/dashboard-runtime.ts:41-49`. | GẦN CHÍNH XÁC — lệch một dòng, và cách mô tả ai sở hữu config MCP là sai | `persistMcpToggle` nằm ở dashboard-runtime.ts:40-48 (bản thân lời gọi `setMcpServerEnabled({...})` ở :41-47, các call site ở :42 và :44 là hai dòng `getMCPConfigPath`) và `applyMcpToggle` ở :49-62. Neo `:41-49` cắt ngang ranh giới giữa hai thành viên. Quan trọng hơn, `config-writer.ts` KHÔNG phải nơi core sở hữu config MCP — nó là một writer ghi nút bật/tắt của dashboard, và chính doc comment của nó nói rõ: `SetMcpServerEnabledOptions.sourcePath` tại config-writer.ts:298-306 yêu cầu người gọi 'Provide ONLY for formats this codebase owns (native `.omp/mcp.json` and `mcp-json`) ... Tool-owned configs MUST be omitted; we never mutate another tool's file.' Quyền sở hữu thật là capability registry — `MCPServer` tại capability/mcp.ts:15-74 và `mcpCapability` tại :108-129 với `key: server => server.name`, `equivalent: isSameMCPConnection`, `toExtensionId: server => 'mcp:' + server.name` — được hợp nhất bởi `loadAllMCPConfigs` tại mcp/config.ts:103 thành các bản ghi `configs` / `sources` thành cặp. Module `mcpSettings` (mcp/settings.ts) là cái tên gây hiểu nhầm cho thiết kế này: nó giữ năm UI setting đã đăng ký (enableProjectConfig, startupTimeoutMs, renderMarkdownResults, notifications, notificationDebounceMs) và không có bất kỳ inventory server nào. | `cat -n packages/coding-agent/src/modes/components/extensions/dashboard-runtime.ts` (80 dòng, đọc trọn); `cat -n packages/coding-agent/src/capability/mcp.ts`; `cat -n packages/coding-agent/src/mcp/settings.ts`; `grep -n '^export' packages/coding-agent/src/mcp/config-writer.ts`. |
| WI-12 | §WI-12 mục 'Chỗ dễ sai' và 'Test cần viết': đề xuất về approval-parity ('tool của một MCP server do extension đăng ký xuất hiện qua đường MCP tool thông thường, với approval gating giống hệt mọi tool khác') chính là thứ phân biệt thiết kế đề xuất với lựa chọn ghi config. | ĐỊNH NGHĨA THIẾU — đề xuất không kiểm được như đang viết, vì các tầng hiện tại không phải những gì plan giả định | Hãy viết kèm con số thật, và nói rõ rằng trạng thái hôm nay cũng là một sản phẩm phụ. `MCPTool.approval` bị hardcode `readonly approval = "write" as const;` tại mcp/tool-bridge.ts:656 và `DeferredMCPTool.approval` là hardcode giống hệt tại tool-bridge.ts:771 — cả hai đều vô điều kiện, không cái nào bị suy ra từ config của server, nên một server stdio spawn subprocess và một server http POST tới host từ xa nằm cùng một tầng. Trong khi đó đường tool của extension mặc định CHẶT hơn: `ToolDefinition.approval` (extensions/types.ts:658) được tài liệu hoá là mặc định `"exec"` khi bỏ trống. Nên cách đọc nguồn của 'parity' là ngược: một tool do extension đăng ký đã bị gate ở `exec` trong khi một tool MCP bị gate ở `write`. Hệ quả mà thiết kế buộc phải giải quyết: nhánh tại tools/approval.ts:369-371, `if (tool.name.startsWith("mcp__") && tool.approval === undefined) { lines.push("Origin: MCP server tool"); }`, hiện KHÔNG BAO GIỜ tới được với các tool MCP do manager mint, vì cả hai lớp luôn đặt `approval` — nên prompt approval không bao giờ nói cho người dùng biết lời gọi đến từ MCP server. Nếu một server được đóng góp rơi vào đúng đường đó, người dùng nhận một prompt tầng `write` không có dòng nguồn gốc, đúng cái lỗ hổng tiết lộ mà một quyết định tin cậy sinh ra để bịt. Thiết kế phải nói có server được đóng góp vào một tầng riêng hay không, và dòng nguồn gốc có trở nên tới được hay không. | `sed -n '648,700p' packages/coding-agent/src/mcp/tool-bridge.ts` và `sed -n '765,812p'` trên cùng file; `sed -n '340,385p' packages/coding-agent/src/tools/approval.ts`; `sed -n '655,660p' packages/coding-agent/src/extensibility/extensions/types.ts`. |
| WI-12 | §WI-12 của plan: việc đóng góp một server 'kế thừa thái độ chưa trả lời của WI-0'. | NÓI THIỂU — không chỉ là chưa trả lời, nó còn bị hardcode theo hướng cấp quyền, và đó là bằng chứng mạnh hơn điều plan đưa ra | `isProjectTrusted(): boolean` được khai báo hai lần trên các bề mặt hướng extension (extensions/types.ts:494 và :561) và được cài đặt là `isProjectTrusted: () => true` tại extensions/runner.ts:1264 và lần nữa tại session/agent-session.ts:7406. Không có cổng chặn nào để kế thừa — giá trị là một hằng số. Vậy nên thiết kế nói 'server do extension đóng góp rơi vào cùng tầng với server .mcp.json của project' thì, tính tới HEAD này, đang nói 'không tầng nào cả'. Hãy nói thẳng điều đó trong tài liệu; nó biến một phụ thuộc trừu tượng vào WI-0 thành một tiền đề kiểm được (`grep -n 'isProjectTrusted: () => true'` phải ngừng trả về hai kết quả trước khi tầng tin cậy trong thiết kế này có nghĩa gì). | `grep -rn 'isProjectTrusted' packages/coding-agent/src` -> 4 kết quả: extensions/types.ts:494, extensions/types.ts:561, extensions/runner.ts:1264, session/agent-session.ts:7406. |
| **WI-13** | *Loại trội: năm dòng ĐÃ ĐÚNG (kể cả những cái tưởng là sẽ sai) và ba dòng trôi số dòng với độ trôi KHÔNG đồng loạt (file thứ nhất lệch đều +9, file thứ hai lệch +3 đến +13, file thứ ba lệch −51). Dòng cuối là đính chính lớn nhất: plan đứng trên tiền đề "đúng HAI chỗ" thì thực tế là BỐN, và chúng không cùng ý định.* | | | |
| WI-13 | Danh sách file của §WI-13: `extension-ui-controller.ts:148-149` (hai stub TUI), `:121` (setWidget), `:78-79` (hai map không chủ sở hữu), `:1203-1212` (clearHookWidgets), `:334-347` (setHookWidget), `:349-353` (#removeHookWidget), `:355-370` (#createHookWidget), và bốn call site `:237` / `:298` / `:469` / `:527`. | CŨ — mọi số dòng trong file này thấp hơn đúng 9 | Cả mười neo đều đúng về nội dung nhưng trôi đều 9 dòng. Hãy dùng: các map ở `:87-88`; chuyển tiếp `setWidget` ở `:130`; hai stub im lặng ở `:157-158`; chuyển tiếp `setEditorComponent` ở `:159`; `setHookWidget` ở `:343-356`; dòng `target.set(key, ...)` ở `:353-354`; `#removeHookWidget` ở `:358-362`; `#createHookWidget` ở `:364-379`; `#rebuildHookWidgets` ở `:381-385`; `#renderHookWidgetContainer` ở `:387-408`; `clearHookWidgets` ở `:1210-1220`; và bốn call site ở `:246` (newSession, khối 1), `:307` (switchSession, khối 1), `:478` (newSession, khối 2), `:536` (switchSession, khối 2). File dài 1342 dòng. | `grep -n 'setFooter\|setHeader\|setWidget\|hookWidgetsAbove\|hookWidgetsBelow\|clearHookWidgets\|setHookWidget\|removeHookWidget\|createHookWidget' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts` tại HEAD 808b365; `wc -l` trên cùng file. |
| WI-13 | Danh sách file của §WI-13: `runner.ts:412-425` (`noOpUIContext`) và **`:421-422`** — 'cặp im lặng thứ hai' — cùng `:448` (`#uiContext`), `:627` và `:727` (hai phép gán), `:1229-1242` (`createContext()`, với `ui: this.#uiContext` ở `:1242`), `:745-747` (quyết định 'createContext() không nhận đối số extension'), và `:766-771` (trampoline). | CŨ — độ trôi KHÔNG đồng loạt, từ +3 đến +13 | Số dòng đúng: `const noOpUIContext: ExtensionUIContext = {` ở `:415`; cặp im lặng `setFooter: () => {},` / `setHeader: () => {},` ở `:424-425`; field `#uiContext: ExtensionUIContext;` ở `:459`; phép gán dự phòng trong constructor `this.#uiContext = noOpUIContext;` ở `:640`; phép gán dự phòng lúc init `this.#uiContext = uiContext ?? noOpUIContext;` ở `:740`; `createContext(` ở `:1242`; `ui: this.#uiContext,` ở `:1255`; chú thích 'createContext() không nhận đối số extension' ở `:758`; và hai lời gọi trampoline không tham số ở `:780` và `:799`. Cũng lưu ý `hasUI()` ở `:923-925` là `return this.#uiContext !== noOpUIContext;` — đó là phép kiểm tra danh tính mà test có thể dùng, nên đừng phá nó khi `#uiContext` bắt đầu uỷ thác cho các biến thể per-extension. | `grep -n 'noOpUIContext\|setFooter\|setHeader\|#uiContext\|createContext' packages/coding-agent/src/extensibility/extensions/runner.ts` và `sed -n '410,432p;915,930p;1242,1262p;752,805p'` tại HEAD 808b365. File dài 1963 dòng. |
| WI-13 | §WI-13 của plan: `interactive-mode.ts:6071` (call site thứ năm của `clearHookWidgets`) và `:6324` (`setEditorComponent`). | CŨ — cả hai đều CAO hơn 51 dòng | Lời gọi `clearHookWidgets()` nằm ở `interactive-mode.ts:6020` (`this.#extensionUiController.clearHookWidgets();`). Khai báo method `setEditorComponent` nằm ở `interactive-mode.ts:6273`; forwarder trao UI context của `interactive-mode` cho controller nằm ở `:6269-6270` (`initializeHookRunner`). `:6324` của plan không phải neo thật cho item này. | `grep -n 'clearHookWidgets\|setEditorComponent' packages/coding-agent/src/modes/interactive-mode.ts` tại HEAD 808b365. |
| WI-13 | §WI-13 của plan: hai khối handler bị nhân bản là các handler `newSession`/`switchSession` của 'hai UI context khác nhau' tại `:237`/`:469` và `:298`/`:527`. | ĐÃ XÁC NHẬN về nội dung, và đã nêu tên các site bao quanh | Đã xác nhận có đúng hai khối `const actions: ExtensionActions = {` và mỗi khối chứa handler `newSession` và `switchSession` riêng. Khối 1 ở `extension-ui-controller.ts:183`, bên trong `async initHooksAndCustomTools()` (khai báo `:117`, dựng literal TUI `uiContext` ở `:119-163`). Khối 2 ở `:416`, bên trong `initializeHookRunner(uiContext, _hasUI)` (khai báo `:410`, được gọi từ `interactive-mode.ts:6269-6270`). Sửa một bên và bỏ ngang bên kia là một kẻ nứt lặng lẽ — plan đúng về điều này, và đây là lỗi dễ mắc nhất ở đây. | `grep -n 'const actions: ExtensionActions' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts` trả về đúng `:183` và `:416`; `sed -n '238,250p;300,312p;468,482p;528,540p'` cho thấy hai thân bản sinh đôi giống nhau từng byte. |
| WI-13 | §WI-13 của plan: 'Sau khi widget có owner, cú quét không còn được xoá toàn cục nữa: nó trở thành remount theo từng extension — `dispose()` widget cũ rồi gọi lại factory của nó để dựng widget mới trên session vừa mở.' | LỖ HỔNG — phép remount của plan không viết được với cấu trúc dữ liệu hiện tại; đây là điều dễ làm cháy kỹ sư nhất ở đây | Hai map lưu COMPONENT ĐÃ RENDER, không phải nội dung/factory. `#hookWidgetsAbove = new Map<string, ExtensionUiComponent>()` (`:87`) và `#hookWidgetsBelow` (`:88`), còn `setHookWidget` làm `target.set(key, this.#createHookWidget(content))` (`:354`) — `content` là một biến cục bộ rồi ra khỏi scope. `#createHookWidget` (`:364-379`) biến một `string[]` thành một `Container` mới gồm các child `Text`, nên với nội dung dạng mảng thì các dòng gốc đã mất hẳn. Không còn gì để gọi lại, nên 'remount bằng cách gọi lại factory' không thể viết nếu chưa đổi điều map giữ. PR 2 phải đổi kiểu giá trị để mang nội dung đi cùng component — ví dụ `Map<extensionPath, Map<string, { content: ExtensionWidgetContent; component: ExtensionUiComponent }>>` — và cập nhật `#createHookWidget`/`#removeHookWidget`/`#renderHookWidgetContainer` để đọc `.component` còn remount thì đọc lại `.content`. Cũng lưu ý `ExtensionUiComponent` là `Component & { dispose?(): void }` (`packages/tui/src/chat/extension-types.ts:5`), nên `dispose` là tuỳ chọn: remount phải gọi `dispose?.()`, khớp với `#removeHookWidget` sẵn có ở `:359`. | `sed -n '340,395p;1205,1225p'` của controller tại HEAD 808b365; `grep -n 'ExtensionUiComponent' packages/tui/src/chat/extension-types.ts` trả về `:5` (`export type ExtensionUiComponent = Component & { dispose?(): void };`) và `:7` (kiểu factory). |
| WI-13 | §WI-13 của plan: `packages/tui/src/tui.ts` không có bề mặt header/footer; các hit `grep` duy nhất trong `packages/tui/src` là `components/wizard-step.ts:132` và `prompt/composer.ts:822 setHeaderExtras`. | ĐÃ XÁC NHẬN, lệch một dòng | Đã xác nhận, và đây chính là phép kiểm tra mang trọng lượng đứng sau việc loại (A): `packages/tui/src/tui.ts` dài 3633 dòng và chứa KHÔNG lần xuất hiện nào của `setHeader`, `setFooter`, `headerComponent` hay `footerComponent`. Trên toàn `packages/tui/src` có đúng hai hit, và cả hai đều là private của một component khác — `components/wizard-step.ts:132` (`setFooter(footer: Component \| undefined)`, footer slot riêng của wizard) và `prompt/composer.ts:823` (`setHeaderExtras(before, after)`, phần welcome-scene riêng của composer; plan ghi 822, dòng thật là 823). Vậy (A) đúng là một bề mặt public MỚI của `packages/tui`, và câu 'M2 adds no new insertion point' ở §4.2 sẽ phải được sửa bằng văn bản nếu (A) được chọn. | `grep -rn 'setHeader\|setFooter\|headerComponent\|footerComponent' packages/tui/src` tại HEAD 808b365 trả về đúng hai dòng đó; `wc -l packages/tui/src/tui.ts` = 3633. |
| WI-13 | §WI-13 của plan: lệnh kiểm chứng đợt 6 là `bun run check:ts && (cd packages/coding-agent && bun test test/extension-ui-header-footer.test.ts)`, và file `packages/coding-agent/test/extension-unload.test.ts` đã sở hữu cú quét bucket unload. | ĐÃ XÁC NHẬN như một kế hoạch; cảnh báo môi trường không được mang theo | Cả `packages/coding-agent/test/extension-ui-header-footer.test.ts` lẫn `packages/coding-agent/test/extension-unload.test.ts` đều KHÔNG tồn tại trên HEAD — `ls` trả về 'No such file or directory' cho cả hai, và `packages/coding-agent/test/fixtures/outsider-extension/` cũng không tồn tại. Nên cách chia hai file của plan vẫn là lựa chọn đúng (nó giữ lệnh đợt 6 không đỏ vì các dòng của WI-9 chưa viết), và cả hai file đều thật sự do milestone này tạo ra. Cảnh báo môi trường: native addon chưa build, nên `bun test` hiện báo 0 pass với 'Failed to load pi_natives native addon for darwin-arm64'. `bun run check:ts` không cần addon và là tín hiệu thực thi duy nhất cho tới khi chạy `bun --cwd=packages/natives run build`. | `ls packages/coding-agent/test/fixtures/outsider-extension` và `ls packages/coding-agent/test/extension-unload.test.ts` đều fail tại HEAD 808b365; `grep -n '"check:ts"' package.json` cho `bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types` ở dòng 94 của file gốc. |
| WI-13 | Ngầm định trong plan: `noOpUIContext` là 'context mọi extension nhận khi không có UI, vì cả `runner.ts:627` và `runner.ts:727` đều rơi về nó'. | ĐÃ XÁC NHẬN, kèm một bổ sung plan bỏ sót | Cả hai phép dự phòng đều có thật (`:640` trong constructor, `:740` trong initialize). Phần bổ sung: một runner chưa từng được initialize đã quan sát được rồi, vì constructor đặt `#uiContext = noOpUIContext` ở `:640` và `getUIContext()` (`:919-921`) trả về nó. Đó là thứ làm cho dòng test (2) rẻ — nó không cần chạy một session headless, chỉ cần `new ExtensionRunner(...)` rồi `runner.getUIContext().setHeader(...)`. Ngoài ra hiện KHÔNG có `unloadExtension` ở bất cứ đâu trong `packages/coding-agent/src` (grep không trả về gì) và `getExtensionPaths()` ở `:927-929`; phần dispose per-extension của PR 2 không nên giả định một entry point unload đã tồn tại, vì chính WI-9 là thứ tạo ra nó. | `sed -n '630,645p;915,930p'` và `grep -rn 'unloadExtension' packages/coding-agent/src` tại HEAD 808b365. |
| WI-13 | Tiêu đề §WI-13 của plan: 'Cặp stub đó không chỉ có một chỗ... Sửa mỗi `extension-ui-controller.ts` là ship một nửa... Vì vậy cả hai site đều nằm trong phạm vi WI-13.' Toàn bộ phân tích failure-mode-4 của plan dựa trên việc có đúng HAI site. | SAI — có BỐN, và chúng không cùng ý định | `grep -rn 'setFooter: () => {}\|setHeader: () => {}' packages/coding-agent/src` trả về TÁM dòng = bốn site phân biệt, không phải hai. (a) `modes/controllers/extension-ui-controller.ts:157-158` — đường TUI, site 1 của plan. (b) `extensibility/extensions/runner.ts:424-425` — `noOpUIContext`, site 2 của plan. (c) `session/agent-session.ts:540-541` — một `noOpUIContext` thứ hai, hoàn toàn tách bạch, khai báo ở `:518` và dùng ở `:7400`, mà plan không hề nhắc. Nó là một fallback hướng extension có thật: `#createCommandContext()` trả `{ ui: noOpUIContext, mode: 'print', hasUI: false, ... }` khi session không có extension runner, nên một handler command của extension trong session dựng tay nhận context này và lời gọi `setHeader` của nó bị nuốt mất. JSDoc riêng của nó ở `:7404-7406` ghi rằng đường này chỉ tới được bởi session dựng tay, nhưng nó vẫn tới được và vẫn im lặng. (d) `modes/acp/acp-agent.ts:581-582` — bên trong hàm export `createAcpExtensionUiContext(connection, getSessionId, clientCapabilities)` khai báo ở `:425`. Cái này KHÁC LOẠI: JSDoc riêng của nó ở `:409-424` cố ý tài liệu hoá sự im lặng ('The non-elicitation surface (custom components, theming, terminal input) remains stubbed — ACP clients render those themselves or not at all'). Hệ quả cho plan: cảnh báo failure-mode-4 của nó ('sửa controller, quên runner, cổng vẫn xanh') vẫn đúng nhưng đánh giá thấp mức phơi bày gấp đôi, và biện pháp của plan — 'cả hai site đều nằm trong phạm vi WI-13' — không phải một quyết định có thể áp dụng bằng máy, vì (c) là một lỗi còn (d) là một lựa chọn thiết kế đã được tài liệu hoá. Xem câu hỏi mở về ACP. | `grep -rn 'setFooter: () => {}\|setHeader: () => {}' packages/coding-agent/src` tại HEAD 808b365 trả về đúng `extension-ui-controller.ts:157,:158`, `acp-agent.ts:581,:582`, `runner.ts:424,:425`, `agent-session.ts:540,:541`. `sed -n '405,430p'` của acp-agent.ts cho thấy builder được export và JSDoc của nó; `sed -n '516,545p;7394,7410p'` của agent-session.ts cho thấy `noOpUIContext` thứ hai và nơi dùng duy nhất của nó. |


---


## Đính chính so với plan tổng (tiếp)

Phần 2 của 2. Bảng dưới đây có bốn cột thay vì năm: ở phần này bằng chứng đã được gộp thẳng vào
ô *đính chính* nên không tách cột riêng. Nội dung là 64 đính chính còn lại, thuộc các work item
WI-0, WI-1, WI-2, WI-6, WI-7, WI-8b, WI-10, WI-11.

| work item | claim của plan | verdict | đính chính |
| --- | --- | --- | --- |
| **WI-0** | — | — | Nhóm: 9 đính chính cho WI-0 (trust posture). |
| WI-0 | The two doc comments about the absence of trust are at packages/coding-agent/src/extensibility/extensions/types.ts:462-469 and :523-536. | STALE — both line numbers wrong, characterisation correct | Actual: :487-494 (comment 487-493, declaration `isProjectTrusted(): boolean;` at 494) and :548-561 (comment 548-560, declaration at 561). Both blocks exist and both are genuinely about the absence of a trust gate, so the plan's description of them is accurate; only the line numbers moved. Use 487-494 and 548-561.<br>**Bằng chứng:** `git grep -n 'isProjectTrusted' -- packages/coding-agent/src/extensibility/extensions/types.ts` returns exactly 494 and 561 for the two declarations. `sed -n '480,500p'` shows the first doc comment opening at 487; `sed -n '548,575p'` shows the second opening at 548 and the interface closing at 562. |
| WI-0 | packages/coding-agent/src/extensibility/extensions/runner.ts:1251 hardcodes `true`. | STALE — off by 13 lines | Actual: runner.ts:1264 — `isProjectTrusted: () => true,` inside the ExtensionContext object literal returned by `createContext()`. Line 1251 is inside that same function's parameter list, not its body.<br>**Bằng chứng:** `git grep -n 'isProjectTrusted: () => true' -- packages/coding-agent/src/extensibility/extensions/runner.ts` returns 1264. `sed -n '1250,1275p'` shows 1251 is a parameter line of `createContext()`. |
| WI-0 | packages/coding-agent/src/session/agent-session.ts:7369 hardcodes `true`. | STALE — off by 37 lines | Actual: agent-session.ts:7406 — `isProjectTrusted: () => true,` in the `#createCommandContext()` path. Line 7369 is inside `#tryExecuteExtensionCommand`, an unrelated method.<br>**Bằng chứng:** `git grep -n 'isProjectTrusted: () => true' -- packages/coding-agent/src/session/agent-session.ts` returns 7406. `sed -n '7392,7415p'` confirms the context literal. |
| WI-0 | packages/coding-agent/src/discovery/omp-extension-roots.ts:162 is the project root. | CORRECT — the only one of the four anchors that survives | No change. Line 162 is `project: path.join(ctx.cwd, ".omp"),` inside `function scopeDirs(ctx: LoadContext): ScopeDirs` (interface at 155-158, function opens at 160, user scope at 163).<br>**Bằng chứng:** `sed -n '150,175p' packages/coding-agent/src/discovery/omp-extension-roots.ts` — line 162 is exactly the project join. `git grep -n 'path.join(ctx.cwd' -- .../omp-extension-roots.ts` returns a single hit at 162. |
| WI-0 | F2 / 'không có cơ sở nào để khuyến nghị một extension bên thứ ba' — the trust posture is undefined and unwritten, so there is no basis on which to recommend a third-party extension. | MISLEADING — a deliberate posture IS already written and already released, which makes this URGENT rather than absent | A 'no gate' posture is already documented in two shipped source comments and stated to users in a released changelog entry. types.ts:548-561 says explicitly: 'OMP has no equivalent per-directory trust gate … This method exists for compatibility with that upstream surface and always returns true, truthfully reflecting that OMP already trusts project-local inputs by default — it does not narrow or widen OMP's own security model.' The released entry says the same to users. So the correct framing of WI-0 is RATIFY-OR-OVERTURN an existing, documented, released posture — a stronger and more urgent decision than authoring one from nothing, and one that carries a compatibility obligation the plan does not acknowledge. What genuinely is absent is any document a third-party author or a security reviewer can read: `grep -c -iE 'isProjectTrusted\|project trust\|no trust' docs/extensions.md` returns 0, and docs/extension-loading.md — the file the shipped comment points at — is entirely silent on trust.<br>**Bằng chứng:** `sed -n '548,561p'` of types.ts; CHANGELOG.md:1057 (section header `## [18.1.16] - 2026-09-09` confirmed at line 1039); `grep -c -iE 'isProjectTrusted\|project trust\|no trust' docs/extensions.md` → 0; `grep -niE 'trust\|unconditional\|project-local' docs/extension-loading.md` → no matches. |
| WI-0 | 'Thi triển khai khai là M–L … nó là tiền đề bắt buộc của bất kỳ ai muốn mở marketplace' and 'chưa milestone nào nhận việc thực thi này — kể cả M3, và M3 cũng không mở marketplace' — enforcement is a prerequisite for anyone who wants to OPEN a marketplace, and no milestone opens one. | WRONG IN A DIRECTION THAT RAISES URGENCY — a project-scope marketplace install path already ships, and it already loads extension modules unconditionally | The marketplace is not hypothetical. `/marketplace install [--force] [--scope user\|project] name@marketplace` already exists (docs/marketplace.md:51) and `--scope project` writes the NEAREST PROJECT's `.omp/plugins/installed_plugins.json` (docs/marketplace.md:20-23). The registry path is resolved by `resolveActiveProjectRegistryPath` (discovery/helpers.ts:1025, walk order documented at :1013-1021: nearest ancestor containing `.omp/`, else the nearest `.git` as anchor). The loader then builds `projectRoots` with `scope: "project"` and `path: entry.installPath` (helpers.ts:1271-1307, the block commented 'Project entries take precedence over user entries for the same plugin ID'), and `extensibility/plugins/loader.ts` enumerates `<root>/node_modules` per root (loader.ts:93-95, scope type at :19) and resolves the `omp.extensions` manifest key via `resolvePluginPaths(plugin, "extensions")` (loader.ts:331, called at :407). Net effect: cloning a repository that contains `.omp/plugins/installed_plugins.json` runs that repo's plugin extension modules, with no prompt, and those project entries SHADOW the user's own installs. The plan's premise — that the marketplace is closed and could be held closed until a trust gate exists — is already false. This does not change WI-0's scope (still a document), but it must be an INPUT to the decision and it is the strongest argument against deferring.<br>**Bằng chứng:** `sed -n '1262,1312p' packages/coding-agent/src/discovery/helpers.ts` shows the project-registry block and `scope: "project"` at 1300; `sed -n '1013,1021p'` of the same file documents the walk order; `grep -n 'omp.extensions\|node_modules\|scope' packages/coding-agent/src/extensibility/plugins/loader.ts` returns 19, 95, 331, 407; `sed -n '18,23p'` and `sed -n '49,55p'` of docs/marketplace.md; `git grep -l marketplace -- packages/coding-agent/src` returns 38 files, including a full `extensibility/plugins/marketplace/` module (fetcher, cache, registry, manager, source-resolver, auto-update). |
| WI-0 | Option A is 'rẻ nhất, và là đường mà API được thiết kế vừa khít' — the cheapest path, and the one the API was designed around. | PARTLY TRUE — the plan understates the cost | The stub is genuinely pre-positioned for A, but A is not a one-line change to runner.ts:1264. It requires changing BOTH implementation sites (runner.ts:1264 and agent-session.ts:7406), it turns TWO existing tests red (test/extension-context-project-trust.test.ts and test/issue-7955-extension-project-trusted.test.ts), and it contradicts a RELEASED changelog entry at CHANGELOG.md:1057 — making it a user-visible behaviour change, not a documentation exercise. There is also a scope mismatch: the types.ts:548-561 comment describes project trust as covering 'extensions, settings, skills, resources', which is wider than the extension module load this work item is about, so A either gates more than the ADR is scoped to decide or is internally inconsistent. Put that cost in the ADR rather than repeating the plan's 'cheapest'.<br>**Bằng chứng:** Both test files confirmed to exist and to assert `true` (via `git grep -n isProjectTrusted`); CHANGELOG.md:1057 confirmed under `## [18.1.16]` at line 1039; the wider-scope wording is quoted verbatim from types.ts:548-561. |
| WI-0 | Verification is 'Không build, không test' and running `bun run check:ts` 'chạy nó không chứng minh gì về mục này'. | CORRECT, with an environment addition the engineer needs | Keep the no-build stance — the plan is right that `check:ts` is unaffected and proves nothing here. Add the fact so the engineer does not burn time: `bun test` is currently blocked outright because the native addon is not built. Verified first-hand — `bun test test/extension-context-project-trust.test.ts` from packages/coding-agent reports '0 pass, 1 fail, 1 error' with 'Failed to load pi_natives native addon for darwin-arm64'; the binary packages/natives/native/pi_natives.darwin-arm64.node is absent. Since WI-0 writes no test this changes nothing about the item, but the two existing trust tests must be cited as contracts-by-INSPECTION and must not be described as verified-green. Build with `bun --cwd=packages/natives run build` before any later item needing a real run.<br>**Bằng chứng:** `bun test test/extension-context-project-trust.test.ts` in packages/coding-agent → '0 pass / 1 fail / 1 error', error text names the missing darwin-arm64 addon and the two paths it tried. |
| WI-0 | The task/repo context states git HEAD is 5873776. | STALE — the tree has moved | Actual HEAD is 808b365409fa36719c38319a041c0e612b4e702b on branch milestone-1. Every line number in this spec was re-verified against 808b365, not 5873776. If the tree moves again before Monday, re-run the five verification greps in `files_touched[0].note` and `plan_corrections` before trusting the anchors.<br>**Bằng chứng:** `git rev-parse HEAD` → 808b365409fa36719c38319a041c0e612b4e702b; `git log --oneline -3` → 808b365, 33d6e33, ecd516f. |
| **WI-1** | — | — | Nhóm: 9 đính chính cho WI-1 (timer/extension ownership, sóng 2). |
| WI-1 | Repo state: 'git HEAD 5873776, currently on branch milestone-1'. | STALE — the commit does not exist | HEAD is 808b365 ('docs(plan): fold the spec-verified M1 execution plan into the upgrade plan'). `git cat-file -t 5873776` returns 'fatal: Not a valid object name'. The branch is correct (milestone-1). All line numbers below were measured against 808b365.<br>**Bằng chứng:** `git rev-parse --short HEAD` -> 808b365; `git cat-file -t 5873776` -> fatal; `git branch --show-current` -> milestone-1 |
| WI-1 | runner.ts anchors: `#managedTimers` at :507, `clearManagedTimers()` call at :408, `setSuspendedExtensions` at :934-956, `createContext` signature at :1229, trampoline gates at :766/:785, `#runHandlerWithTimeout` at :1361, `createHandlerContext` at :227-239, timer arrow props at :1290-1291. | STALE — systematically shifted | Every runner.ts anchor in the plan is off. Measured at HEAD: `#managedTimers` = 518, `clearManagedTimers()` call = 411, method defined = 1336-1337, `setSuspendedExtensions` = 947-969, trampoline gates = 779 and 798, `createContext` signature = 1242, timer arrow props = 1304-1305, `#runHandlerWithTimeout` = 1375, `createHandlerContext` = 230-241, `createHandlerContext(...)` call = 1405-1408. The shift is not uniform: +11, +3, +13, +13, +3, +14, +14, +3, +14. Do not `sed -n '507p'` this file — re-derive every anchor with grep.<br>**Bằng chứng:** `grep -n '#managedTimers\|clearManagedTimers\|setSuspendedExtensions\|runHandlerWithTimeout\|createHandlerContext' packages/coding-agent/src/extensibility/extensions/runner.ts` |
| WI-1 | sdk.ts anchors: `reconcileExtensionSources` at 4560-4624, `resetCapabilities()` at :4565, `setSuspendedExtensions` at :4573, the discover await at :4567-4570. | STALE — uniformly +6 | Measured at HEAD: `const reconcileExtensionSources` = 4566, `resetCapabilities()` = 4571, the `await Promise.all([...])` = 4573-4576, the `const { suspended, resumed } = extensionRunner.setSuspendedExtensions(` = 4579-4581, function ends near 4629. All four are +6. The OTHER sdk.ts anchors in the plan are exact: 1002-1004, 1006-1009, 2482, 2484, and 3074. The 2487-2491 drain block is off by one only at its closing brace (2492).<br>**Bằng chứng:** `grep -n 'resetCapabilities()\|setSuspendedExtensions(' packages/coding-agent/src/sdk.ts` -> 4571, 4579; `sed -n '4566,4584p' packages/coding-agent/src/sdk.ts` |
| WI-1 | The retention record lives on the `Extension` interface at `types.ts:1777-1792`. | STALE — wrong location | `export interface Extension` is at types.ts:1802-1818, not 1777-1792. The plan's line 1777-1779 claim that `Extension` 'already has both path and resolvedPath' is true but at 1803-1804, 25 lines later. types.ts:1777-1792 actually contains `ExtensionCommandContextActions` and `ExtensionRuntime`. The design conclusion is unaffected — the record still belongs on `Extension`, not on `ExtensionRuntime` — but do not open 1777.<br>**Bằng chứng:** `grep -n '^export interface Extension ' packages/coding-agent/src/extensibility/extensions/types.ts` -> 1802; `sed -n '1770,1800p'` shows ExtensionCommandContextActions / ExtensionRuntime |
| WI-1 | Two constraints on commit 1 that read as design inputs are not. | CONFIRMED TRUE — recorded because it is the load-bearing insight | Both hold exactly as stated, and they are the reason this work item is not a one-liner. (a) `createContext()` has exactly 15 call sites — `grep -n 'this\.createContext(' packages/coding-agent/src/extensibility/extensions/runner.ts \| wc -l` -> 15 — of which 2 (lines 780, 799) are the file-fallback trampolines that call handlers directly, and 13 share one context across the emit loop via `ctx ??= this.createContext()` (lines 1478 and 1490). Threading `ext` into `createContext()` would pass `undefined` at all 13. (b) `createHandlerContext` (230-241) is `Object.create(ctx)` overriding only `ui`, so the ownerless `setInterval`/`setTimeout` `createContext()` installs at 1304-1305 are inherited by every handler. Both verified, both decisive.<br>**Bằng chứng:** 15 call sites listed at 780, 799, 1352, 1478, 1490, 1529, 1587, 1644, 1675, 1716, 1738, 1819, 1855, 1880, 1937; #runHandlerWithTimeout is called from exactly 12 sites: 1480, 1493, 1538, 1600, 1651, 1686, 1723, 1770, 1831, 1869, 1896, 1945 |
| WI-1 | 'Commit 2 must join the resume record, and the two `createContext` caller shapes mean only three owner points exist' — i.e. the shape of the whole fix. | CONFIRMED, with one refinement the plan overstates | Three owner points is right. The refinement: the plan says the reconcile path 'works in resolvedPath space, so the two spaces must be joined through a mapping that cannot be used directly' (and repeats it under 'where the record lives'). That is true for the `governed`/`enabled` sets at 4577-4578, but it does NOT apply to the provider work. `setSuspendedExtensions` returns `Extension` OBJECTS, and `Extension` carries both `path` and `resolvedPath` — so the source id is a plain `.path` read, and `sourceId` is exactly `extension.path` by construction (loader.ts:363). `extensionRunner.getExtensionPaths()` (927-929) hands over the whole active list in the right key space in one call. No mapping is needed anywhere in the provider half, and building one would be the error.<br>**Bằng chứng:** `sed -n '4577,4582p' packages/coding-agent/src/sdk.ts` (predicate uses `.resolvedPath`); `sed -n '362,364p' packages/coding-agent/src/extensibility/extensions/loader.ts` (sourceId IS `this.extension.path`); `sed -n '927,929p' .../runner.ts` (`this.extensions.map(e => e.path)`) |
| WI-1 | Test rows 1-2 fail on HEAD; row 3 also fails on HEAD. | PARTLY WRONG — row 2 passes vacuously on HEAD | Rows 1 and 3 do fail on HEAD. Row 2 (TIMER ALIVE AFTER RESUME) does NOT: on unmodified HEAD nothing is ever cleared, so an interval keeps firing across a suspend/resume cycle and the row passes for the wrong reason. It only becomes a real gate once commit 1 lands — it blocks a commit-1 implementation that satisfies row 1 by never scheduling, or by clearing on the resume branch too. Write it anyway (it is a genuine regression guard), but do not report it as red-before / green-after.<br>**Bằng chứng:** managed-timers.ts has no owner concept and setSuspendedExtensions (947-969) touches only `#suspendedExtensions` and the `extensions` array; therefore every scheduled timer keeps running regardless of suspend state at HEAD. |
| WI-1 | Wave split: commit 1 ships in Wave 2, commit 2 (suspend + resume together) in Wave 4. | CONFIRMED — this spec ships the Wave 2 half only | Per the plan's own wave table (section 6.1, line 4693) and its stated reasoning at 4866-4869: the provider half cannot ship suspend-only, because `pendingProviderRegistrations` is destructively drained by all three consumers (loader.ts:102/105 declare and push; sdk.ts:1009, sdk.ts:2491, cli/models-cli.ts:362 each reassign `[]`), so a bare re-call would re-register nothing. The plan ships no suspend-only provider increment to users at all. The Wave 2 PR therefore contains steps 1-7 only.<br>**Bằng chứng:** Plan lines 4693, 4860-4869, 4718-4720; `grep -n 'pendingProviderRegistrations' packages/coding-agent/src` -> sdk.ts:1006,1009,2487,2488,2491; cli/models-cli.ts:359,362; loader.ts:102,105 |
| WI-1 | Environment: `bun test` reports 0 pass because the pi_natives addon is not built. | CONFIRMED — reproduced verbatim | Reproduced at HEAD: `bun test test/model-registry-runtime-cleanup.test.ts` -> '0 pass, 1 fail, 1 error' with 'Failed to load pi_natives native addon for darwin-arm64'. The unblock is `bun --cwd=packages/natives run build` (package script verified at packages/natives/package.json:32). Separately, the type baseline is clean and should be recorded: `cd packages/coding-agent && bun run check:types` exits 0 with zero errors at HEAD, so the gate is genuinely 'zero errors', not 'no new errors'.<br>**Bằng chứng:** `bun test test/model-registry-runtime-cleanup.test.ts` (output above); `grep -n '"build"' packages/natives/package.json` -> line 32; `bun run check:types` -> EXIT=0 |
| **WI-2** | — | — | Nhóm: 3 đính chính cho WI-2. |
| WI-2 | The task context states git HEAD is 5873776. | stale | HEAD is 808b365 on branch milestone-1, working tree clean. Every line anchor in this spec was verified against 808b365.<br>**Bằng chứng:** `git log --oneline -1` → 808b365 docs(plan): fold the spec-verified M1 execution plan into the upgrade plan. |
| WI-2 | `bun test` reports 0 pass with the native-addon error. | partly-wrong | It reports 0 pass / 1 FAIL / 1 error per file — the file is counted as failed, not skipped. Small, but it tells the engineer the test run is genuinely red rather than silently empty, which is what they need to know before assuming a green run.<br>**Bằng chứng:** `cd packages/coding-agent && bun test test/extension-loader-concurrency.test.ts` → `0 pass / 1 fail / 1 error / Ran 1 test across 1 file`. |
| WI-2 | Sorting `allPaths` is a no-op for consumers because nothing in the codebase depends on incidental filesystem order. | verified-with-caveat | Verified — `loadExtensions` (loader.ts:485-487) uses `Promise.all(paths.map(...))`, which preserves input order, and `bindPreparedExtensions` iterates in that order, so `this.extensions` order is exactly `allPaths` order. The caveat: `resolveExtensionDirectory` is called with CONFIGURED_EXTENSION_DIRECTORY_OPTIONS, which does NOT set `sortChildren` (only the plugin options at plugins/loader.ts:290 do), so a configured directory of sub-extensions is the one path the loader post-sort is load-bearing for. That is exactly the path the test fixture exercises, which is good for coverage but means the plugin path was already sorted and gains nothing.<br>**Bằng chứng:** loader.ts:485-487; loader.ts:528-536 `CONFIGURED_EXTENSION_DIRECTORY_OPTIONS` (no sortChildren) vs plugins/loader.ts:287-291 `PLUGIN_EXTENSION_DIRECTORY_OPTIONS` (sortChildren: true); directory-resolution.ts:119 `if (options.sortChildren) children.sort();`. |
| **WI-6** | — | — | Nhóm: 11 đính chính cho WI-6 (bảng admission tool). |
| WI-6 | `packages/coding-agent/src/tools/index.ts:725-789` is the `isToolAllowed` 25-branch ladder. | STALE | The ladder is at lines 731-793. Off by +6 at the start, +4 at the end.<br>**Bằng chứng:** `grep -n 'const isToolAllowed' packages/coding-agent/src/tools/index.ts` → `731: const isToolAllowed = (name: string) => {`; read of 731-793 shows the closing `};` at 793. |
| WI-6 | Sub-anchors: `goal` at `:731-735`, `wait` at `:762-769`, `checkpoint`/`rewind` at `:755-761`, `manage_skill` at `:774-778`, `learn` at `:779-785`, `task` at `:786-788`, `context_notes`/`new_context` at `:753-754`. | STALE (all seven) | Actual lines: goal 737-741, context_notes/new_context 759-760, checkpoint/rewind 761-765, wait 766-772, manage_skill 777-781, learn 782-788, task 789-791. Every one is 3-6 lines lower than the plan says. A mechanical copy of these anchors lands on the wrong branch.<br>**Bằng chứng:** Read of `tools/index.ts:700-807` with per-branch line numbers; `awk` count of `^\s*if (name ===` over 731-793 returns exactly 25, confirming the branch COUNT in the plan is right even though the line numbers are not. |
| WI-6 | `BUILTIN_TOOLS` at `:548-579`, `SETTINGS_GATED_BUILTIN_TOOL_NAMES` at `:594-597`, the `isMountableUnderXdev` coupling at `:899`. | STALE | Actual: `BUILTIN_TOOLS` 554-585, `SETTINGS_GATED_BUILTIN_TOOL_NAMES` 600-602, the xdev coupling at 902.<br>**Bằng chứng:** `grep -n` on `tools/index.ts` for each symbol. |
| WI-6 | The risk is 'silent priority inversion': the 25-branch chain is an early-return ladder, so reordering branches during the move can change which rule wins without changing any rule's body. | OVERSTATED — and pointing the implementer at it will waste the day they should spend on the real risk | All 25 branches are `if (name === "literal")` and the 29 distinct names across them are pairwise disjoint, so at most one branch can ever match a given `name`. Branch order therefore provably cannot change any outcome; the stated failure mode cannot occur. The REAL risk is the one the plan does not name: hoisting each branch into a standalone `(ctx) => boolean` requires promoting eleven closure captures to explicit context fields, and a dropped field compiles cleanly while silently changing admission. The mechanical move is order-insensitive; the semantic move is capture-insensitive.<br>**Bằng chứng:** Extracted the 29 distinct names from `tools/index.ts:731-793` and confirmed none appears in two branches: ask ast_edit ast_grep bash checkpoint context_notes debug eval find github glob goal grep ida learn lsp manage_skill memory_edit new_context recall reflect retain rewind security_scan task think todo wait web_search. |
| WI-6 | The table should be `Record<ToolName, (ctx) => boolean>`. | WOULD NOT TYPECHECK | `ToolName = BuiltinToolName` (`tools/index.ts:593`), which is the 30 built-in names. But `isToolAllowed` carries real, non-default rules for `goal` and `think`, and both are `HiddenToolName`, not `BuiltinToolName`. The key must be `BuiltinToolName \| HiddenToolName` (33 names). Writing it as the plan states either fails the typecheck or silently drops the `goal` rule — and the `goal` rule is the one carrying a three-way condition and a `dropped`-status exception.<br>**Bằng chứng:** `grep -n 'export type ToolName' tools/index.ts` → `593: export type ToolName = BuiltinToolName;`. `builtin-names.ts:36` shows `HIDDEN_TOOL_NAMES = ["yield", "goal", "think"]`. The branch list contains `goal` and `think`; subtracting the 30 `BUILTIN_TOOL_NAMES` leaves exactly those two as covered-but-not-builtin. |
| WI-6 | Not mentioned anywhere in the plan: a `Record`-shaped admission table introduces a prototype-chain lookup hazard that the current if-chain does not have. | NEW FINDING — this is the sharpest correctness risk in the item | With a plain object literal and a `TABLE[name]` lookup, `TABLE["toString"]` resolves to `Object.prototype.toString` — a FUNCTION, so calling it returns the truthy string `"[object Undefined]"` instead of a boolean; `TABLE["constructor"]` returns `Object`, truthy; `TABLE["__proto__"]` returns a non-function that THROWS when called. The current if-chain is immune because unmatched names fall through to `return true`. This is reachable, not theoretical: `tools/index.ts:799` gates on `name in BUILTIN_TOOLS`, and `in` on an object literal is exactly as prototype-polluted — an extension tool named `toString` already passes that gate today and reaches `isToolAllowed`. Mitigation: build the `Map` from `Object.entries()` of a `satisfies Record<…>` literal, which keeps compile-time exhaustiveness while making lookup prototype-safe.<br>**Bằng chứng:** Executed a probe against the real gate shape: `["read","toString","constructor","__proto__"].filter(n => n in BUILTIN_TOOLS)` → all four pass. And against the proposed table: `toString`/`constructor` → callable, truthy non-boolean; `__proto__`/`my_ext_tool` → not callable, throws. |
| WI-6 | The parallel declarations to merge are `BUILTIN_TOOL_NAMES` (30), `BUILTIN_TOOLS`, and `ESSENTIAL_BUILTIN_TOOL_NAMES` (13). | PARTLY REDUNDANT — one of the three is already safe | `BUILTIN_TOOL_NAMES` ↔ `BUILTIN_TOOLS` is ALREADY compile-time enforced: `BUILTIN_TOOLS` is declared `Record<BuiltinToolName, ToolFactory>` (`tools/index.ts:554`), and TypeScript rejects both a missing key and an unknown extra key. There is nothing to merge there and no test to add. The declarations that genuinely lack a type link are `ESSENTIAL_BUILTIN_TOOL_NAMES` (`Record<string, true>` — untyped keys, runtime-only guard) and `SESSION_MANAGED_BUILTIN_TOOL_NAMES` (`sdk.ts:1161`, bare `string[]`, no guard at all). The plan also never mentions the latter.<br>**Bằng chứng:** Compiled a probe with `bunx tsc --noEmit --strict`: `Record<"a"\|"b"\|"c", F>` with `{a,b}` → TS2741 'Property c is missing'; with an extra `d` → TS2353 'Object literal may only specify known properties'. Baseline `bun run check:ts` is green at HEAD. |
| WI-6 | `ESSENTIAL_BUILTIN_TOOL_NAMES` at `essential-tools.ts:23-37` (13 names) and `builtin-names.ts:2-31` (30) / `:36` (3). | CORRECT | No change. These are the only anchors in the item that are already right — worth stating explicitly so the implementer does not re-verify them.<br>**Bằng chứng:** Read of both files in full; counted 13 and 30 entries respectively. |
| WI-6 | Three built-ins plus `yield` are implicitly admitted; not stated in the plan. | UNDOCUMENTED BEHAVIOUR THAT MUST NOT BE LOST | `read`, `edit`, `write` and hidden `yield` have NO branch in the ladder and reach the trailing `return true`. A `Record` table that only lists tools with rules would silently change nothing today, but it leaves admission under-specified for four of thirty-three names. I specified explicit `() => true` entries so the table is a complete description rather than a partial one.<br>**Bằng chứng:** Subtracting the 29 covered names from the 30 `BUILTIN_TOOL_NAMES` leaves exactly read, edit, write; subtracting from `HIDDEN_TOOL_NAMES` leaves exactly yield. |
| WI-6 | (Task framing) repo git HEAD is 5873776. | STALE | HEAD is 808b365 on branch `milestone-1`.<br>**Bằng chứng:** `git rev-parse HEAD` → `808b365409fa36719c38319a041c0e612b4e702b`; `git log --oneline -3`. |
| WI-6 | Verification command `bun run check:ts && (cd packages/coding-agent && bun test test/tools/tool-admission-table.test.ts)`. | HALF-BLOCKED | `check:ts` passes green at HEAD (all 15 packages Done). The test command cannot run: `bun test` reports `0 pass / 1 fail / 1 error` with `Failed to load pi_natives native addon for darwin-arm64`. The addon must be built with `bun --cwd=packages/natives run build` before the test half of the gate is meaningful. Confirmed by actually running it.<br>**Bằng chứng:** Ran both commands at HEAD 808b365. |
| **WI-7** | — | — | Nhóm: 7 đính chính cho WI-7 (mode registry). |
| WI-7 | The six booleans are runtime fields of `InteractiveMode` at `modes/interactive-mode.ts:981-988`. | stale | They are at `modes/interactive-mode.ts:908-915`, not 981-988 — off by roughly 73 lines. The `types.ts:189-194` half of the same claim IS correct.<br>**Bằng chứng:** `grep -n 'planModeEnabled\|vibeModeEnabled\|goalModeEnabled\|goalModePaused\|loopModeEnabled\|loopModePaused' packages/coding-agent/src/modes/types.ts` → 189,190,191,192,193,194 (exact). `sed -n '900,920p' packages/coding-agent/src/modes/interactive-mode.ts` → 908 `planModeEnabled = false;` through 915 `loopModePaused = false;`. Lines 975-1000, which the plan points at, hold `pendingPythonComponents` / `isPythonMode` and the working-message cache. |
| WI-7 | The four `AgentSession` mode accessors are at `agent-session.ts:6097`, `:6102`, `:6120`, `:6128`; `codeModeNamespacesInfo` at `:5822`; `#codeModeState` declared at `:1387`. | stale | All six anchors are off. getPlanModeState is at :6132, getPrewalkState :6137, getGoalModeState :6155, getVibeModeState :6163, codeModeNamespacesInfo :5852, #codeModeState :1395. The accessor anchors are off by a consistent ~30-35 lines; the other two by ~30 and ~8.<br>**Bằng chứng:** `grep -n 'getPlanModeState\|getPrewalkState\|getGoalModeState\|getVibeModeState\|codeModeNamespacesInfo\|#codeModeState' packages/coding-agent/src/session/agent-session.ts` → 1366, 1395, 1404, 1474, 1783, 5852, 5853, 6132, 6137, 6155, 6163. The plan's own two seam-grep counts still hold exactly, so the drift is confined to line numbers, not to structure. |
| WI-7 | The six booleans become 'derived getters' on the registry, keeping their names and types. | incomplete-and-blocking | A bare getter will not compile. There are 28 `this.<mode>.x = ` assignment sites in src/, ALL in interactive-mode.ts (planModeEnabled x4, planModePaused x5, vibeModeEnabled x3, goalModeEnabled x7, goalModePaused x7, loopModeEnabled x2, loopModePaused x4). Each field needs a getter AND a setter pair, with the setter routing the write into the registry. The plan's framing understates the work and, followed literally, produces a commit that does not build.<br>**Bằng chứng:** `git grep -nE '\.(planModeEnabled\|vibeModeEnabled\|goalModeEnabled\|goalModePaused\|loopModeEnabled\|loopModePaused\|planModePaused) = ' -- packages/coding-agent/src` → 28 lines, and `git grep -l` on the same pattern → exactly one file, `interactive-mode.ts`. Per-field assignment counts from `grep -cE '^\s*this\.<name> = ' interactive-mode.ts`. |
| WI-7 | Six booleans is the complete mode-state surface to preserve as derived getters. | wrong-count | There are SEVEN mode-state bits. `planModePaused = false` is declared at interactive-mode.ts:909 and is read at 11 sites — but it is NOT declared on `InteractiveModeContext` (grep for planModePaused in modes/types.ts returns nothing), so it was missed by a plan that enumerated the interface. It is load-bearing: interactive-mode.ts:3750-3753 feeds it straight into the status line as `paused`, and segments.ts:369-373 renders the `Plan ⏸` warning chip from it. Converting six and leaving the seventh as a raw field means the status line's paused state silently stops updating the moment the other six move to the registry.<br>**Bằng chứng:** `grep -n 'this.planModePaused' packages/coding-agent/src/modes/interactive-mode.ts` → 11 sites (2318, 3750, 3753, 4018, 4031, 4158, 4181, 4377, 4398, 4406, 5069, 5075, 5130, 5253, 5361, 5406). `sed -n '3748,3757p'` shows #updatePlanModeStatus passing `{ enabled, paused }` to `this.statusLine.setPlanModeStatus(status)`. `sed -n '369,373p' packages/tui/src/status-line/segments.ts` shows the paused branch producing the warning-toned chip. |
| WI-7 | `test/plan-mode/write-policy.test.ts` is new and must defend the `local://` sandbox inequality that nothing currently covers. | partly-stale | The inequality IS already covered for the built-in plan mode, at `packages/coding-agent/test/tools/plan-mode-guard-local.test.ts:90-127`: it asserts `local://` create and update resolve, `src/foo.ts` and `PLAN.md` reject with /working tree is read-only/, delete rejects with /deleting files is not allowed/, and move rejects with /renaming files is not allowed/. AGENTS.md bans restating coverage at a second level. The new file must defend a DIFFERENT contract — the policy evaluated AS DATA through a registry entry, driven by an extension-registered mode — or it is a duplicate that the rules forbid.<br>**Bằng chứng:** `sed -n '90,127p' packages/coding-agent/test/tools/plan-mode-guard-local.test.ts` shows all five assertions above. The file is 26 KB-scale and fully wired to `enforcePlanModeWrite`. |
| WI-7 | The status-line blocker is the closed 27-member `StatusLineSegmentId` union at `schema.ts:2-30` with no seam for contributors. | right-but-incomplete | The union is exactly as described (verified 27 members). But the harder half of the blocker is one level down: `SegmentContext` (types.ts:75) carries FIVE separate hardcoded per-mode fields — planMode :96, prewalk :100, loopMode :103, goalMode :109, vibeMode :113 — and `modeSegment` resolves them through a hand-written 5-way if-chain in a fixed priority order (segments.ts:369-403). An extension mode has no field there either, and the if-chain silently returns `{ visible: false }` for anything it does not recognise. A design that opens the id union but leaves the five fields hardcoded still ships an invisible mode, so any M2-OQ3 answer must address both halves.<br>**Bằng chứng:** `sed -n '96,116p' packages/tui/src/status-line/types.ts` shows the five fields. `sed -n '364,406p' packages/tui/src/status-line/segments.ts` shows the chain and the `return { content: "", visible: false };` fallthrough. Minor: the plan's 'segments.ts:919-947' for the SEGMENTS record actually ends at :945, and `id: "mode"` is at :365 (the const opens at :364). |
| WI-7 | `enforcePlanModeWrite` is 'called from the tool layer'. | vague-but-not-wrong | There are exactly 4 call sites and they are not uniform: `tools/write.ts:778` (op update), `:814` (archive path, op update), `:842` (sqlite path, op update), `:859` (op create). The archive and sqlite sites pass a working-tree op over a path that is not a plain source file, so each needs individual reasoning about the new `workingTree: allow\|deny` rule. Listing them costs nothing and prevents three of the four being assumed equivalent.<br>**Bằng chứng:** `git grep -n enforcePlanModeWrite -- packages/` → 4 sites in write.ts, plus the definition at plan-mode-guard.ts:127 and the existing test file. |
| **WI-8b** | — | — | Nhóm: 8 đính chính cho WI-8b (registerSetting). |
| WI-8b | `packages/coding-agent/src/extensibility/extensions/types.ts:1231-1557` is the exact span of `ExtensionAPI`. | stale-anchor | The interface spans :1256-1582. `export interface ExtensionAPI` is at :1256, the closing brace at :1582, and the next top-level declaration (`export interface ProviderConfig`) at :1589. Both ends of the plan's range are off by exactly 25 lines. The plan's method count of 29 is CORRECT and stays 29 — I enumerated the distinct leading-tab method names over 1256-1582 and got exactly 29; this item makes it 30.<br>**Bằng chứng:** `grep -n '^}' packages/coding-agent/src/extensibility/extensions/types.ts \| awk -F: '$1>1256' \| head -5` → 1582, 1627, 1657, 1676, 1687. `awk 'NR>=1256 && NR<=1582' ... \| grep -oE '^\t[a-zA-Z_][a-zA-Z0-9_]*[<(]' \| sed 's/[(<]//' \| sort -u \| wc -l` → 29. |
| WI-8b | `packages/tui/src/overlays/settings-selector.ts:435` is the fixed tab list with its own Plugins tab (and §7 GĐ6 cites `:847-853` for the schema-backed search). | stale-anchor | Off by a few lines in both places. `getSettingsTabs()` is :431-440 and the `plugins` tab entry is at :438; line :435 is `const icon = theme.symbol(meta.icon);` inside the `SETTING_TABS.map` callback. On the search side, the `for (const id of SETTING_TABS)` loop is :848-853, the "Plugins hosts its own UI" comment is at :854, and the muted plugins push is :855-860. GĐ6's substance is right — both surfaces must be decided together — only the numbers move.<br>**Bằng chứng:** `git grep -n 'id: "plugins"' -- packages/tui/src/overlays/settings-selector.ts` → :438 and :856. `awk 'NR>=431 && NR<=440' ...` and `awk 'NR>=840 && NR<=860' ...` confirm the surrounding lines. |
| WI-8b | Blockers 3 and 4 are separate: (3) panel order is declaration order within a domain, so a dynamic domain has no place; (4) the panel is a fixed tab list with its own Plugins tab. | incomplete — the two are one coupled problem, and the plan misses the constraint that decides between the options | The panel's placement vocabulary is a CLOSED union, not just a fixed list. `SettingTab` in `packages/tui/src/overlays/settings-defs.ts:4-15` is exactly ten literals; `TAB_GROUPS` at :52-88 is a static `Record<SettingTab, readonly string[]>`; `UiBase` at :97-111 requires `tab: SettingTab` and a `group` that must already be listed in `TAB_GROUPS[tab]`. And `createSettingsHost()` (`config/settings-ui.ts:51-68`) builds the panel by iterating `SETTING_TABS` and keeping entries whose `ui?.tab === tab` (:53-56). So an extension key can only land in one of the ten existing tabs, and M2-OQ4's third option — a dynamic tab per extension — is not expressible without changing both the union and the record. Deciding 3 and 4 separately, as the plan frames them, invites picking an option that turns out to be unrepresentable.<br>**Bằng chứng:** `awk 'NR>=45 && NR<=140' packages/tui/src/overlays/settings-defs.ts` shows `TAB_GROUPS` at :52-88 and `UiBase` at :97-111 with `tab: SettingTab`. `awk 'NR>=40 && NR<=80' packages/coding-agent/src/config/settings-ui.ts` shows the double loop at :53-56. Separately verified: the existing `plugins` tab id is NOT in the `SettingTab` union, which is why it renders from `plugin-settings.ts` and not from this schema — so "put extension keys under Plugins" merges two unrelated surfaces under one tab and is a product decision, not a mechanical one. |
| WI-8b | `config/registry.ts:783-792` is `register` with the duplicate-id throw; the only note on module state is the throw itself. | stale-anchor plus a missed blocker | `register` is at :786 and the throw at :787 (the plan's :783 is a JSDoc line, :792 is the closing brace). The missed blocker: `byId` (:778) and `ordered` (:779) are module-level and APPEND-ONLY — there is no `unregister` anywhere in `packages/coding-agent/src/config/` (verified by grep). An extension that is disabled and re-enabled in one process therefore throws "registered twice" on its second enable, and its keys are unreachable for the process lifetime. WI-8b must add an owner-scoped unregister, and the precedent for the shape already exists in the same package: `clearSourceRegistrations(sourceId)` at `config/model-registry.ts:2914` and `syncExtensionSources(activeSourceIds)` at :2955 do exactly this for providers. This is also what makes WI-9's 11-bucket unload inventory tractable rather than impossible.<br>**Bằng chứng:** `git grep -n 'unregister\|delete byId\|ordered.length\|ordered.splice' -- packages/coding-agent/src/config/registry.ts` returns nothing. `awk 'NR>=779 && NR<=802' packages/coding-agent/src/config/registry.ts` shows `byId`/`ordered` declared once at module scope with only `register` appending. `awk 'NR>=2950 && NR<=2966' packages/coding-agent/src/config/model-registry.ts` shows the provider-owner precedent. |
| WI-8b | `orderedSettings()` lists settings by domain order then declaration order; a dynamic domain has no place in the panel (blocker 3). | incomplete — there is a second, sharper failure the plan does not name | Two defects, not one. (a) `all-settings.ts:85-89` memoizes `ordered` in a module-level `let` with NO invalidation, so any setting registered after the first `orderedSettings()` call is invisible forever — regardless of panel placement. (b) `domainHandles` (:92-106) only ever walks values reachable from the 33 static `DOMAINS` entries, so an extension handle that IS in `registry.all()` is silently dropped. The plan describes (b) as "no place in the panel"; (a) is worse because it is order-dependent and would not show up in a test that happens to register before the first call.<br>**Bằng chứng:** `awk 'NR>=78 && NR<=160' packages/coding-agent/src/config/all-settings.ts` shows `let ordered` at :85, `if (ordered) return ordered;` at :89, and `domainHandles` at :92-106 iterating only `for (const key in domain)`. No invalidation function exists anywhere in the file. |
| WI-8b | A test row asserting that a duplicate id produces an error surfaced to the extension author fails on HEAD because "the loader has no obligation to propagate it today". | wrong in detail — the loader already propagates; what is missing is a message that names the collision | The loader DOES surface factory errors. `runExtensionFactory` (loader.ts:397-414) rethrows, `bindExtension` (:438-459) catches and returns `Failed to load extension: <message>` at :457, and `bindPreparedExtensions` (:491-520) collects those into `LoadExtensionsResult.errors` (:497-505), which `formatExtensionLoadNotifications` (`load-errors.ts`) renders to the user. So the propagation path exists and needs no work. The actual gap is that the current message is `Setting "X" is registered twice` — it names the id but not the owner and not the namespace rule, which is exactly the GĐ6 compatibility gate. The test-design consequence is concrete and easy to get wrong: assert the collision through `loadExtensions`/`bindPreparedExtensions` and read `result.errors`, NOT through `loadExtensionFromFactory` (:464-475), which rethrows at :473 and never populates `errors`.<br>**Bằng chứng:** `awk 'NR>=380 && NR<=470' packages/coding-agent/src/extensibility/extensions/loader.ts` shows all three functions. `cat packages/coding-agent/src/extensibility/extensions/load-errors.ts` shows the formatter. `git grep -n 'bindPreparedExtensions\|errors.push\|errors:' -- .../loader.ts` → :497 and :505. |
| WI-8b | `pi.registerSetting` is added as the 30th method on `ExtensionAPI`, and the `ConcreteExtensionAPI` wiring follows the pattern of the existing registration methods. | correct, with one saving worth knowing | Confirmed, and better than the plan assumes: NO wiring is needed. `ConcreteExtensionAPI`'s constructor (loader.ts:191-208) walks `ConcreteExtensionAPI.prototype` and rebinds every method onto the instance, and the comment at :198-200 says so explicitly ("Walk the prototype rather than listing methods: a new method is bound without touching this"). The class is declared `implements ExtensionAPI, IExtensionRuntime` (:179), so omitting the implementation is a compile error — which is what makes the `check:ts` half of the gate real rather than decorative. The best sibling template is not `registerFlag` (:259-267) but `registerComposerShape` (:277-289), which already validates its id and throws a typed error before mutating any state.<br>**Bằng chứng:** `awk 'NR>=179 && NR<=290' packages/coding-agent/src/extensibility/extensions/loader.ts` shows the prototype-walk constructor, `registerFlag`, and `registerComposerShape`'s validate-then-throw body. `bun run check:ts` passes on HEAD (all 15 packages report Done), confirming the current baseline is green. |
| WI-8b | Verification is `bun run check:ts && (cd packages/coding-agent && bun test test/config/extension-registered-setting.test.ts)`. | correct as written, but the second half is blocked in this environment — flag it before assigning | `bun run check:ts` runs and passes on HEAD 808b365 (verified: all 15 packages report Done). `bun test` does NOT: running an existing test in that directory reports `0 pass / 1 fail / 1 error` with `Failed to load pi_natives native addon for darwin-arm64` and points at `bun --cwd=packages/natives run build`. So the four test rows cannot be executed until the addon is built. This does not weaken the work — rows 1, 2 and 4 need no loader, no session and no fixture on disk — but the assignee must know the gate is half-runnable today, and should not read a `bun test` failure as a regression in their own change.<br>**Bằng chứng:** `bun run check:ts` → 15 packages Done. `cd packages/coding-agent && bun test test/config/settings-registry.test.ts` → `0 pass / 1 fail / 1 error`, `Failed to load pi_natives native addon for darwin-arm64`. |
| WI-8b | WI-8b depends only on WI-8a; WI-7 is not a dependency because no file on the `registerSetting` path knows the mode. | confirmed | Verified independently. Nothing on the path reads a mode: `registry.ts:786-792` is pure id bookkeeping, `all-settings.ts:43-77` is a static import list, and the panel tab list is `settings-selector.ts:431-440` plus `settings-defs.ts:20`. The one genuine prerequisite the plan understates is M2-OQ4, which is not code but blocks steps 5-7 and test row 3 outright.<br>**Bằng chứng:** `sed -n '760,800p' packages/coding-agent/src/config/registry.ts`, `sed -n '43,77p' packages/coding-agent/src/config/all-settings.ts`, `sed -n '431,440p' packages/tui/src/overlays/settings-selector.ts` — no mode reference in any of them. |
| **WI-10** | — | — | Nhóm: 9 đính chính cho WI-10 (canonical surface / ADR). |
| WI-10 | Plan line 5895: the extension factory surface is at 'types.ts:1231'. | STALE — off by 25 lines | ExtensionAPI is declared at packages/coding-agent/src/extensibility/extensions/types.ts:1256. Line 1231 is inside a doc comment for a neighbouring type ('Service tiers accepted by each provider family'). Anything an engineer does with the plan's 1231 lands 25 lines short of the interface.<br>**Bằng chứng:** `grep -n 'export interface ExtensionAPI' packages/coding-agent/src/extensibility/extensions/types.ts` → 1256:export interface ExtensionAPI. Related: ExtensionFactory at :1660, and §5.x of the plan separately cites 'extensions/types.ts:1255-1315' for the 46 on() overloads, whose start anchor 1255 is likewise one line off the real interface at 1256. |
| WI-10 | Plan lines 5893-5896 and 5911: there are TWO 'fallow-ignore-next-line code-duplication' markers, at types.ts:230 and :543, and they carry the argument that the extension surface is a strict superset of the hook surface. | WRONG COUNT and WRONG ANCHOR — there are four markers, and :543 matches nothing | The file has FOUR such markers, at lines 230, 395, 568 and 1227. The plan's :230 is correct (it precedes ExtensionUIContext, commented 'extensions expose a strictly larger UI surface'). Its :543 does not correspond to a marker at all — the nearest is :568. The plan therefore understates its own evidence by half: 230 and 395 are the pair that actually make the superset argument for the UI and runtime contexts, 568 covers ExtensionCommandContext, and 1227 covers RegisteredCommand.<br>**Bằng chứng:** `grep -n 'fallow-ignore-next-line code-duplication' packages/coding-agent/src/extensibility/extensions/types.ts` → 230, 395, 568, 1227. The file is 1849 lines, so all four are stable positions. |
| WI-10 | Plan lines 5893 and 4441: the capability layer is '14 capability trên 84 provider pair'. | HALF RIGHT — 14 verified, 84 NOT REPRODUCIBLE, and the miscount hides a correctness trap | 14 capabilities is exactly right. The 84 is not: the static count of capability-provider registrations is 20, all at module top level, none in a loop, one provider per call. The 84 figure almost certainly came from conflating the capability registry with a SECOND, unrelated registry that shares the function name registerProvider — the MODEL provider registry at config/model-registry.ts, exposed to extensions as pi.registerProvider (declared extensions/types.ts:1570, implemented loader.ts:362, replayed from pendingProviderRegistrations in sdk.ts:1007 and :2489). That conflation is not cosmetic: the model-provider registry IS already extension-reachable today, and docs/extensions.md:905 says so in as many words ('extensions (…): unified system (events + tools + commands + renderers + provider registration)'). An ADR that says 'provider registries are not extension-reachable' would be flatly false. Only the CAPABILITY registry is core-only. The document must name which registry it means.<br>**Bằng chứng:** 14: `grep -rn 'defineCapability<' packages/coding-agent/src/` → 14 hits, all under packages/coding-agent/src/capability/. 20: `grep -rn '^registerProvider(' packages/coding-agent/src/ \| grep -cE 'Capability\.id'` → 20, spread over discovery/{opencode:6, gemini:5, cursor:3, github:2, mcp-json:1, claude-md:1, agents-md:1, ssh:1}. Full `registerProvider(` hits number 42, splitting 20 capability / 22 model-provider. The two registries are distinguishable by first argument: `someCapability.id` versus a name string. |
| WI-10 | Plan line 5904: the core-only capability registry is at 'capability/index.ts:88'. | OFF BY ONE — points at a JSDoc terminator, not the code | defineCapability is declared at packages/coding-agent/src/capability/index.ts:89 and ends at :96. Line 88 is the closing ' */' of its doc comment. The module-scope registry map is at :34 and the duplicate-id throw is at :90-92. Cite :89-96 (which is what the plan's own §4.3 R1 does — so the plan is internally inconsistent about this anchor, and §4.3's version is the correct one).<br>**Bằng chứng:** `sed -n '84,99p' packages/coding-agent/src/capability/index.ts` → 84 section banner, 86-88 JSDoc for defineCapability, 89 the export, 90-92 the duplicate-id throw, 96 the closing brace. §4.3 R1 of the plan cites ':88-96'; the WI-10 body cites ':88'. |
| WI-10 | Plan line 4724 (wave 6 rationale): 'setHookWidget giữ widget trong hai map không ai giải phóng (extension-ui-controller.ts:78-79)'. | WRONG ANCHOR — off by 9 lines, and the cited lines contain unrelated code | The two unowned maps are at packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:87-88, not 78-79. They are the private fields #hookWidgetsAbove and #hookWidgetsBelow. Lines 78-79 are inside the toWireSelectOptions helper, mapping a select option's description field — nothing to do with widget ownership. This is WI-13's and WI-9's anchor rather than WI-10's, but it appears in the wave table this item ships in, so correct it here rather than letting WI-9 inherit it.<br>**Bằng chứng:** `grep -n 'new Map\|setHookWidget' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts` → 87:#hookWidgetsAbove, 88:#hookWidgetsBelow, 343: setHookWidget(...). The file is 1342 lines; `sed -n '78,79p'` returns `: option.description` / `: { label: option.label, description: option.description }`. |
| WI-10 | Plan line 4694 (wave 5 gate) and WI-0's spec: the wave-5 gate is 'the pi.registerMode row of the outsider-extension fixture'. | NOT A CURRENT ANCHOR — neither exists; both are wave-5/6 artifacts to be created | There is no outsider-extension fixture anywhere in the tree, and pi.registerMode does not exist as a symbol. These are things WI-7 and WI-13 will BUILD, not things this plan can cite as evidence. The correct reading is prospective: wave 5's gate is a fixture row that does not exist until WI-7 lands. Do not write either name into a spec or an ADR as if it were present, and do not expect to open them during review.<br>**Bằng chứng:** `grep -rln 'outsider' packages/` → no matches. `grep -rn 'registerMode' packages/coding-agent/src/` → no matches. `find . -name '*outsider*' -not -path './node_modules/*'` → nothing. |
| WI-10 | Plan lines 4697 and 5921 reference test/extension-ui-header-footer.test.ts (WI-13's wave-6 gate) and test/extension-unload.test.ts (WI-9's fixture). | NOT YET EXISTING — correctly future files, but must not be cited as if runnable | Neither file exists. packages/coding-agent/test/ contains a large set of extension tests (extensions-runner.test.ts, extensions-discovery.test.ts, plugin-extensions-discovery.test.ts, extension-provider-registration-rollback.test.ts and many more) but not these two. WI-13 and WI-9 create them in waves 6 and 7. Since WI-10 writes no test, this costs nothing directly — but it does mean the §11.1 five-capability checklist cannot be called green on the strength of this item, and neither doc-side file makes it greener.<br>**Bằng chứng:** `ls packages/coding-agent/test/ \| grep -iE '^extension'` returns 15 files, none named extension-ui-header-footer.test.ts or extension-unload.test.ts. Note also that the plan's wave-6 gate names these without the packages/coding-agent/ prefix; the real location is packages/coding-agent/test/. |
| WI-10 | Not mentioned anywhere in the plan: nothing states that the tree ALREADY contains a partial answer to this work item. | MISSING FROM THE PLAN — and it is the highest-value finding in this review | docs/extensions.md:901-909 already contains a section titled '## Extensions vs hooks vs custom-tools' that begins 'Use the right surface:'. It ranks three of the five surfaces in prose, calls hooks a 'separate legacy event API', and closes with 'If you need one package that owns policy, tools, command UX, and rendering together, use extensions.' It is a real prior answer, it is incomplete (custom-commands/ and plugins/ absent), it is uncheckable (no status word), and it is silent on the capability registry. The plan's own framing — 'which surface is canonical' — is therefore not a blank page but a page with a partial draft on it. The ADR must reconcile that section rather than sit beside it, or the tree ships two answers and the conflict is resolved by whichever one a reader opens first.<br>**Bằng chứng:** `sed -n '901,909p' docs/extensions.md` → heading at 901, 'Use the right surface' at 903, the three bullets at 905-907, the closing sentence at 909. |
| WI-10 | Plan line 5923: 'Phụ thuộc: WI-0 … và WI-7 / WI-8, vì hai cái đó quyết định năng lực mới sẽ đáp trên bề mặt nào.' | INTERNALLY INCONSISTENT — the wave table inverts this | WI-7/WI-8 appear here as a soft dependency, but the plan's own wave table (§6.1) and its M2-OQ2 blast-radius text both say the opposite: WI-10 BLOCKS WI-7, and the wave-5 note states wave 5 depends strictly on waves 1-4. WI-8 does not appear as blocked by WI-10 anywhere. Treat WI-0 as the only hard dependency; the WI-7/WI-8 mention is best read as 'this decision must anticipate what WI-7 and WI-8 will need', which is a drafting instruction, not a sequencing constraint.<br>**Bằng chứng:** Plan line 5923 lists WI-7/WI-8 under 'Phụ thuộc'. Plan lines 4693 ('Wave 5 phụ thuộc nghiêm ngặc vào 1-4') and 4704 ('WI-10 chặn WI-7') state the inverse. Line 6669-6673 names WI-7 first among what M2-OQ2 blocks. |
| **WI-11** | — | — | Nhóm: 7 đính chính cho WI-11 (state store). |
| WI-11 | `ExtensionAPI` has 29 methods and no storage primitive (WI-11 opening: '`ExtensionAPI` 29 phương thức **không có primitive lưu trữ nào**'). | STALE | The no-storage-primitive claim is CORRECT and load-bearing — keep it. The count is wrong by a factor of 2.4: `ExtensionAPI` declares 80 members, 69 of them methods. An engineer who trusts '29' will assume a much smaller surface and may reason that adding one more is cheap in a way the real surface does not support.<br>**Bằng chứng:** `git grep -n 'export interface ExtensionAPI' -- packages/coding-agent/src` → `packages/coding-agent/src/extensibility/extensions/types.ts:1256`. The interface closes at :1582. Enumerating members over that range: 80 unique names; `grep -cE '^\t[a-zA-Z#]+\??\('` over the same range → 69. The non-method properties are appendEntry, arktype, events, logger, pi, registerMessageRenderer, registerTool, sendMessage, setServiceTier, typebox, zod. Independently confirmed: `git grep -niE '\b(storage\|state\|kv\|getState\|setState\|loadState\|saveState\|persist)\b'` over types.ts returns no storage primitive. |
| WI-11 | `packages/coding-agent/src/extensibility/extensions/types.ts:429-537` is `ExtensionContext`, and it has 12 fields, no storage. | STALE | The interface is at lines 452-562 — stale by +23 at the start and +25 at the end. The field count is badly wrong: 26 unique members across 27 declarations, not 12. `isProjectTrusted(): boolean` is declared TWICE, at :494 and :561. The 'no storage' claim is correct.<br>**Bằng chứng:** `git grep -n 'interface ExtensionContext' -- packages/coding-agent/src` → `types.ts:452` (the second hit at :1768 is `ExtensionContextActions`, a different interface). Read of 452-562 shows the closing `}` at 562. Enumerating tab-indented members in that range yields 27 declarations / 26 unique names, with `isProjectTrusted` appearing twice — confirmed independently by `grep -n isProjectTrusted types.ts` → `494:` and `561:`. Members include ui, mode, getContextUsage, getAsyncJobSnapshot, compact, hasUI, cwd, sessionManager, modelRegistry, localProtocolOptions, model, models, isIdle, abort, hasPendingMessages, shutdown, agent, isProjectTrusted, getSystemPrompt, runEphemeralTurn, memory, setInterval, setTimeout, clearTimer, addAdditionalContext, invokeTool. |
| WI-11 | `types.ts:480-481` is `memory?: MemoryRuntimeContext` — the agent's content memory, not a per-extension key-value store. | STALE | The member is at line 506, a single line, not a two-line range at 480-481. The SUBSTANCE is correct and is a load-bearing part of the argument: `MemoryRuntimeContext` has exactly three methods — `status()`, `search()`, `save()` — and is agent content memory, so it cannot serve as a per-extension keyed store. Keep this argument; fix the line number.<br>**Bằng chứng:** `git grep -n 'MemoryRuntimeContext' -- packages/coding-agent/src` → `types.ts:506` (`memory?: MemoryRuntimeContext;`), imported at `types.ts:80`. Definition at `packages/coding-agent/src/memory-backend/types.ts:79-83`: `status(): Promise<MemoryBackendStatus>`, `search(query, options?)`, `save(input)`. Wired into the extension context at `extensions/runner.ts:1303` (`memory: this.#getMemoryFn?.()`), supplied from `sdk.ts:3080` via `createSessionMemoryRuntimeContext`. |
| WI-11 | `packages/coding-agent/src/extensibility/plugins/manager.ts:929-957` is the ad-hoc store to model a lifecycle after. | CONFIRMED_WITH_DRIFT | The three methods are all there, but the range ends at 960, not 957: `getPluginSettings` 929-937, `setPluginSetting` 942-949, `deletePluginSetting` 954-960. This anchor matters more than usual because WI-11's central argument is that this store is the pattern that will spread — so an engineer should be sent to the exact lines.<br>**Bằng chứng:** `grep -nE 'async (getPluginSettings\|setPluginSetting\|deletePluginSetting)' packages/coding-agent/src/extensibility/plugins/manager.ts` → 929, 942, 954. Read of 926-965 shows each body ending at 937, 949, 960 respectively. Supporting anchors, all VERIFIED: `#saveRuntimeConfig` at :148-151 (writes `getPluginsLockfile()`), `#loadProjectOverrides` at :153-162 (reads `getProjectPluginOverridesPath(this.#cwd)`), and `getPluginsLockfile` at `packages/utils/src/dirs.ts:652-654` → `~/.omp/plugins/omp-plugins.lock.json`. Note what this store actually IS: a read path spanning TWO files (`config.settings[name]` plus `projectOverrides.settings?.[name]`) with a write path that only ever writes the first — which is WI-8a's silent-data-loss trap and a strong concrete argument for why state does not belong in settings. |
| WI-11 | The task's stated repo state: 'git HEAD 5873776, currently on branch milestone-1'. | STALE | HEAD is 808b365, still on branch milestone-1. Recent commits: 808b365 'docs(plan): fold the spec-verified M1 execution plan into the upgrade plan', 33d6e33 'docs(m1): execution plan for milestone 1...', ecd516f 'feat: initial publish — oh-my-pi 18.3.3'. The line-number drift throughout the plan is consistent with commits landing after the plan was written, which is the reason so many of its anchors are off by 10-30 lines rather than by an odd one or two.<br>**Bằng chứng:** `git rev-parse HEAD` → `808b365409fa36719c38319a041c0e612b4e702b`; `git branch --show-current` → `milestone-1`. This is corroborated by the drift pattern itself: `settings.ts:62`, `settings.ts:800-808`, `registry.ts:786-792`, `loader.ts:263`/`:265`, `dirs.ts:1046-1048`, `dirs.ts:652-654` and `plugins/types.ts:156-163` ALL reproduce exactly, while the `types.ts` anchors are all off by 23-26. A uniform +23-26 shift on one file means that file grew above line 429 after the plan was written; the config/ files did not move. |
| WI-11 | The plan frames the design question as a binary: a namespaced key-value store inside the existing layered `Settings`, or a dedicated per-extension store with its own lifecycle. | INCOMPLETE | It is a ternary, and the third option is the one an author can actually reach today: `pi.appendEntry(<qualified customType>, data)` (signature at `types.ts:1489`) plus a rebuild from `ctx.sessionManager.getBranch()` on `session_start` / `session_branch` / `session_tree`, documented at `docs/extensions.md:699-723` under the heading 'For durable extension state'. It is session-scoped — entries live on a session branch, so nothing survives the session — and it is append-and-replay with latest-match-wins, not a keyed get/set. The design document must rank all three. A document that surveys only the two the plan names will be read as having surveyed the options when it did not, and the first reviewer question will be 'what about the appendEntry pattern that our own docs already recommend?'.<br>**Bằng chứng:** Read of `docs/extensions.md:699-723` shows the heading, the three numbered steps, and the `session_start` rebuild example using `entry.type === "custom" && entry.customType === "com.example.my-extension.state"`. `git grep -n appendEntry -- packages/coding-agent/src/extensibility/extensions/` → declared at `types.ts:1489` (ExtensionAPI) and `types.ts:1752` (handler type), implemented at `loader.ts:307-308` delegating to `runner.ts:694`. |
| WI-11 | WI-11 depends only on WI-8 and WI-9, and M2-OQ2 does not bear on it. | INCOMPLETE | The plan's own §10 contradicts its WI-11 section: M2-OQ2 (does the capability registry ever become extension-reachable — YES / NO / DEFERRED) explicitly lists 'substrate của WI-11/WI-12' among the things it BLOCKS, and §6.1 wave ordering puts wave 1 (WI-0, WI-10) before wave 8 for this reason. If the design document is written while M2-OQ2 is open, it must say its recommendation is conditional on that answer rather than assuming a trust posture that has not been chosen.<br>**Bằng chứng:** Read of plan §10, M2-OQ2: 'Chặn: WI-5 commit 2-3 ..., WI-7 ..., và substrate của WI-11/WI-12.' Read of §6.1: 'WI-0 chặn WI-10 vì câu trả lời trust làm thay đổi nghĩa của "canonical" với tác giả bên thứ ba; WI-10 chặn WI-7 ... và WI-11/WI-12.' |

Kiểu sai lặp nhiều nhất ở phần này là **neo `file:line` đã cũ**: plan được viết khi HEAD còn là 5873776, còn cây hiện tại là 808b365, nên phần lớn các dòng trên chỉ là hiện tượng dịch chuyển dòng chứ không phải sai về nội dung. Các dòng cùng kiểu, liệt kê gọn ở đây và đã có đủ bằng chứng ở bảng phía trên: claim HEAD 5873776 của WI-0, WI-1, WI-2, WI-6, WI-11 (cùng một sự thật, lặp 5 lần); neo dòng của WI-0 (types.ts 462-469/523-536 → 487-494/548-561; runner.ts:1251 → 1264; agent-session.ts:7369 → 7406), WI-1 (toàn bộ neo runner.ts; neo sdk.ts lệch đều +6; `Extension` 1777-1792 → 1802-1818), WI-6 (`isToolAllowed` 725-789 → 731-793 cùng bảy sub-anchor; `BUILTIN_TOOLS` 548-579 → 554-585; `SETTINGS_GATED_BUILTIN_TOOL_NAMES` 594-597 → 600-602; xdev 899 → 902), WI-7 (interactive-mode.ts:981-988 → 908-915; sáu neo agent-session.ts), WI-8b (span `ExtensionAPI` 1231-1557 → 1256-1582; settings-selector.ts:435 → :431-440/:438 và :847-853 → :848-853; registry.ts:783-792 → :786/:787), WI-10 (types.ts:1231 → :1256; capability/index.ts:88 → :89-96; extension-ui-controller.ts:78-79 → :87-88), WI-11 (`ExtensionContext` 429-537 → 452-562; `memory` 480-481 → :506). Có hai ngoại lệ không thuộc kiểu này và phải giữ nguyên cảnh báo: dòng `ExtensionContext` của WI-11 còn kèm sai số trường (12 → 26), và dòng registry.ts của WI-8b còn kèm một blocker bị bỏ sót (không có `unregister` cho `byId`/`ordered`). Riêng WI-0 còn một neo đúng, giữ nguyên: `packages/coding-agent/src/discovery/omp-extension-roots.ts:162`.


---


## Định nghĩa hoàn thành

| Work item | Điều kiện phải đúng | Bằng chứng cụ thể |
| --- | --- | --- |
| WI-0 | `docs/extension-trust-model.md` có trong cây và nêu người quyết cùng ngày; một maintainer trả lời được từ chính văn bản, không hỏi tác giả, ba câu: project-local extension nạp không điều kiện / có cổng / không nạp; `ctx.exec` bị cổng riêng hay cố ý nằm ngoài cổng; `isProjectTrusted()` thành giá trị thật hay giữ stub trả `true`. Quyết định là đúng một từ A, B hoặc C, câu trả lời về `ctx.exec` phải trích được. `git diff --stat` đúng ba file, không file `.ts`. Hạng mục enforcement mang TÊN + CHỦ + NGÀY, và ADR nêu extension project-scope đã ship là một input mà quyết định buộc phải cân.

> **Ràng buộc loại trừ, phải biết trước khi chốt:** vì `extension-context-project-trust.test.ts:14` và `issue-7955-extension-project-trusted.test.ts:19,24` đang assert `isProjectTrusted()` trả `true`, câu trả lời "thành giá trị thật" bắt buộc phải kèm sửa hai file test đó — tức là có `.ts` trong diff, và điều đó vi phạm chính điều kiện ba-file ở trên. Dưới cổng này, câu trả lời duy nhất còn lại là **giữ stub trả `true`**. Nếu maintainer muốn "thành giá trị thật" thì phải nới điều kiện ba-file, và việc nới đó phải được ghi vào ADR chứ không được âm thầm chọn. | `ls docs/extension-trust-model.md`; `grep -n 'ctx.exec\|ExecOptions' docs/extension-trust-model.md` có hit; `git diff --stat` ra đúng ba path; `git diff packages/coding-agent/CHANGELOG.md` có dòng mới dưới `## [Unreleased]`; tên + ngày người quyết nằm trong file. |
| WI-1 | Ba khẳng định: (1) timer do extension đã suspend không còn fire khi session còn sống, đồng thời timer của extension thứ hai vẫn tăng; (2) sau resume, handler chạy lại và timer mới sinh ra fire; (3) sau suspend reconcile, `registry.find(providerName, modelId)` và `registry.authStorage.keys.source(providerName)` đều `undefined`, sau resume cả hai trở lại. Kèm `bun run check:types` trong `packages/coding-agent` bằng 0 lỗi. | `bun test test/extension-suspend-teardown.test.ts` ≥ 4 pass / 0 fail và không in lỗi addon; `bun test test/model-registry-runtime-cleanup.test.ts` và `bun test test/extensions-runner.test.ts` vẫn xanh; `git diff --stat` của commit 1 đúng ba file; `grep -n 'this\.createContext(' … | wc -l` vẫn ra 15. |
| WI-2 | `bun run check:ts` exit 0. Row 1 thật sự phân biệt: đỏ khi bỏ `allPaths.sort(...)` ở `loader.ts:659`, xanh khi có, và fixture tự phơi tiền đề bằng `fs.readdirSync` (từ chối chạy nếu thứ tự đã trùng từ điển). Row 2 thật sự phân biệt: đỏ khi bỏ `#collectToolNameCollisions`. `test/extensions-discovery.test.ts` và `test/extension-loader-concurrency.test.ts` không đổi. | Exit code của `bun run check:ts`; số pass/fail từng file; ảnh chụp "đỏ" ghi lại trước khi khôi phục dòng sort, rồi "xanh" sau khi khôi phục. |
| WI-3 | `bun run check:ts` exit 0 — đây là cổng gánh thật: bảng `satisfies SessionEventRelays` đòi mọi arm của `RelayableEventKind`, thiếu arm là TS2741, dùng `HookEvent` làm khoá làm `Extract` sụp về `never`. Sau khi build addon, `bun test test/extension-event-relay-exhaustive.test.ts` exit 0 với đúng 1 test pass. | Exit 0 của `bun run check:ts`; dòng "1 pass / 0 fail" của file test. |
| WI-4 | `bun run --cwd packages/tui check:types` và `bun run --cwd packages/coding-agent check:types` đều xanh khi đã áp chú thích `Readonly`; `git grep -nE 'toolRenderers\[[^]]*\] *=\|toolRenderers\.[A-Za-z_$]+ *=' -- packages` vẫn 0 hit; cả hai file test mới tồn tại và đã commit dù không chạy được ở checkout này. `bun test` không phải cổng. | Exit 0 của cả hai lệnh `check:types`; output rỗng của lệnh grep; `bunx oxlint` + `bunx oxfmt --check` trên `packages/tui/src/tools/index.ts` sạch; hai path có trong `git ls-files`. |
| WI-5 | (1) Sau commit 1: `bun run check:ts` xanh VÀ `git grep -n resetCapabilities -- packages/coding-agent/src` trả 0 hit. (2) Row 2 của `reset-contract.test.ts` đỏ trên HEAD, chỉ xanh khi `resetRegistry()` tồn tại và thật sự xóa `capabilities`. (3) Sau commit 2-3: check:ts xanh, cả hai file test mới xanh, và full suite `packages/coding-agent` vẫn xanh — số cuối chứng minh file test gọi `resetRegistry()` không hủy hoại file khác. | Exit 0 của `bun run check:ts`; grep rỗng; số pass/fail của `reset-contract.test.ts`, `provider-source-attribution.test.ts`, và của cả suite. |
| WI-6 | Characterization test (6 nhánh + extension-tool + prototype-safety) được viết và commit TRƯỚC refactor và xanh ở cả hai bên, trên cả chuỗi 25 nhánh lẫn bảng. Thêm audit thủ công một lần: `.names` đã resolve của cả 33 tên tool phải giống hệt từng byte giữa commit trước và sau refactor, trên ma trận taskDepth 0/1 × gates all-off/all-on × memory backend `hindsight`/`mnemopi`/`local`. | Log `bun test` chạy trước và sau refactor; bảng diff kết quả audit cho 33 tên tool. |
| WI-7 | `bun run check:ts` exit 0. Grep seam-2 vẫn đúng 51 dòng trên 21 file, không call site nào bị sửa tay; seam-1 vẫn thấy sáu boolean ở `modes/types.ts:189-194`. Một extension viết ngoài repo (`test/fixtures/outsider-extension/`, nạp qua `discoverAndLoadExtensions([], tempProjectDir)` chứ không qua `configuredPaths`) hiện trong mode registry với `statusLine` không optional, render chip ở segment `mode`, chặn ghi working-tree nhưng cho ghi `local://`, và chạy với `result.errors` rỗng. `examples/extensions/plan-mode.ts` không còn tồn tại. | Exit 0 của `bun run check:ts`; output hai lệnh grep (51 dòng / 21 file); kết quả bốn file test `write-policy`, `mode-registry`, `status-line-extension-mode`, `extension-outsider-install`; `ls examples/extensions/plan-mode.ts` báo không có. |
| WI-8a | `bun run check:ts` xanh. `bun test test/config/plugin-settings-provenance.test.ts` xanh cả ba dòng (hai dòng migration, một dòng env/provenance). `test/plugin-config.test.ts`, `test/plugin-config-validate.test.ts`, `test/config/settings-registry.test.ts` vẫn xanh. Migration đã được chạy thủ công theo đúng thứ tự trên một project thật chứa `.omp/plugin-overrides.json` viết tay, và một giá trị bị xóa khỏi store mới vẫn biến mất sau lần chạy thứ hai. | Exit 0 của `bun run check:ts`; "3 pass" của file test mới và của ba file cũ; biên bản hai lần chạy migration ghi lại kết quả kiểm tra hồi sinh. |
| WI-8b | `bun run check:ts` xanh — đỏ ngay khi `ExtensionAPI` khai báo `registerSetting` mà `ConcreteExtensionAPI` không implement, vì lớp khai báo `implements ExtensionAPI`. Sau khi build addon, `bun test test/config/extension-registered-setting.test.ts` xanh đủ bốn dòng, và `test/config/settings-registry.test.ts` không đổi — **với điều kiện tiên quyết**: dòng test 3 chỉ viết được sau khi M2-OQ4 có câu trả lời; chưa có thì dòng này ở trạng thái *trình bày trong panel nhưng chưa hành vi* và phải ghi rõ vậy, không được ghi như đã xong. | Exit 0 của `bun run check:ts`; "4 pass / 0 fail" của file test mới; kết quả `settings-registry.test.ts`. |
| WI-9 | `bun run check:ts` exit 0. `test/extension-unload.test.ts` tồn tại với đủ 15 dòng (11 dòng một-bucket) và mỗi dòng ghi đột biến phân biệt của nó ngay trong file. `bun test test/extension-unload.test.ts` báo 15 pass / 0 fail. Grep xác nhận không còn `.flagValues.set(name, ...)` / `.flagValues.get(name)` phẳng nào dưới `packages/coding-agent/src`. Điều kiện 1 một mình không đủ: check:ts vẫn xanh khi xóa sạch cả file test. | Exit 0 của `bun run check:ts`; dòng "15 pass / 0 fail"; output grep rỗng. |
| WI-10 | `docs/extension-writing-surfaces.md` có trong cây và nêu người quyết cùng ngày. Một maintainer chưa đọc gì khác trả lời được từ văn bản: surface nào CANONICAL cho việc mới, surface nào COMPATIBILITY-ONLY bị đóng băng, và capability registry có extension-reachable hay không. Câu trả lời M2-OQ2 là đúng một trong ba từ `YES` / `NO` / `DEFERRED`, nằm thành dòng riêng grep được, không ám chỉ trong văn xuôi. `git diff --stat` đúng ba file, không file TypeScript. Shim cũ được nêu kèm số dòng thật kèm câu nói rõ việc gỡ ra là một dự án breaking-change riêng nằm ngoài M2. | `ls docs/extension-writing-surfaces.md`; `grep -n 'Capability registry' docs/extension-writing-surfaces.md` cho đúng một từ trong ba từ trên; `git diff --stat` không có đuôi `.ts`; `git diff docs/extensions.md` không còn danh sách ba-surface cũ đứng cạnh. |
| WI-11 | `git diff --name-only \| grep -c '\.ts$'` bằng 0. `docs/extension-state-persistence.md` có, và đã xếp hạng ba substrate rồi chọn một; nêu đường dẫn on-disk cụ thể và đơn vị sở hữu là identity của extension, khoá theo install path, theo `extension.flags` (`loader.ts:263`) chứ không phải `runtime.flagValues` (`loader.ts:265`). Hai hợp đồng tương lai viết ở thì hiện tại, và cái thứ hai nói rõ chuyện gì xảy ra với giá trị khi extension đổi tên. Deferral được ghi lại: build vô chủ, WI-9 là tiền đề kỹ thuật, không dùng nhãn "Phase 4/5". Maintainer trả lời được cả năm câu từ văn bản. | Số 0 từ lệnh grep; các lệnh `grep` phải có hit cho ba substrate, `appendEntry`, `WI-9`, `unowned`, `extensions-state`; câu trả lời của maintainer cho (a)–(e). |
| WI-12 | `docs/mcp-server-contribution-by-extensions.md` tồn tại và chứa đủ sáu phần bắt buộc, trong đó trust tier là MỘT câu một reviewer có thể bất đồng, và đề xuất approval-parity được viết theo tier thật chứ không giả định. `git diff --stat HEAD` liệt kê đúng ba path docs và không có gì dưới `packages/` — chạm vào source nghĩa là mục này bị build thay vì được thiết kế. Tiền đề của văn bản khớp với cây: đóng góp DECLARATIVE ở mức package đã ship (ba provider), khoảng trống là đóng góp IMPERATIVE lúc runtime. Một maintainer đã trả lời bằng tên cả câu hỏi trust tier lẫn credential, và văn bản ghi lại ai, khi nào. Một maintainer khác đọc văn bản là trả lời được "cài extension đăng ký MCP server thì mạng và credential của tôi ra sao" mà không cần đọc code. | `git diff --stat HEAD` ra đúng ba path; tên + ngày trong văn bản; câu trả lời của maintainer thứ hai. |
| WI-13 | PR 1: `bun run check:ts` xanh; `bun test test/extension-ui-header-footer.test.ts` báo 2 test pass; grep `setFooter: () => {}\|setHeader: () => {}` trả 0 hit ở cả bốn vị trí; cả hai test đã được quan sát ĐỎ trên HEAD trước khi sửa. PR 2: check:ts xanh, hai test của PR 1 vẫn xanh, widget map theo từng extension và giữ nội dung, cả năm call site remount đã đổi (`controller` :246, :307, :478, :536 và `interactive-mode` :6020), khối comment `runner.ts:756-777` không còn mâu thuẫn, và kiểm tra thủ công `/new` đã làm và ghi lại. | Output grep (0 hit); "2 pass"; biên bản đỏ-trước/xanh-sau của từng test; danh sách năm call site đã đếm, không đếm bằng mắt. |

Milestone 2 chỉ được coi là xong khi cả 15 dòng trên cùng đúng cùng lúc — kể cả các dòng chỉ kiểm được bằng đọc của một maintainer, và cả các dòng phải build native addon trước khi chạy được.

## Những điều chưa được kiểm chứng

- **Milestone này mới chỉ được đặc tả, chưa được thực thi.** Nó được soạn ra bằng cách đọc cây mã và chạy lệnh để dò hiện trạng; chưa work item nào trong 15 mục được code. Các cổng hoàn thành ở trên được viết ra nhưng **chưa chạy thử lần nào** — nên mọi con số "15 pass", "4 pass", "2 test pass" trong cột bằng chứng là số phải đạt, không phải số đã đo.
- **Cổng đỏ vì thiếu native addon không chứng minh gì.** Ở trạng thái cây hiện tại `bun test` chết ngay lúc import với `Failed to load pi_natives native addon for darwin-arm64` và báo `0 pass / 1 fail`, kể cả với file test cũ đã biết là tốt (`test/capability/rule-agents.test.ts`, `test/extension-flag-dispatch.test.ts`). Phải build trước bằng `bun --cwd=packages/natives run build`. Đây là lý do WI-4 ghi rõ nửa `packages/tui` cũng bị chặn chứ không chỉ nửa `coding-agent` như kế hoạch giả định.
- **Mọi neo `file:line` là ảnh chụp tại một thời điểm.** Cây sẽ trôi; phải chạy lại các lệnh grep neo trước khi tin chúng.
- **Chỗ chưa chắc, nêu đúng chỗ:**
  - WI-5: cổng tự thừa nhận chưa xác minh được `capability/index.ts` có kéo theo `@oh-my-pi/pi-natives` hay không — nó import `./fs`, `../extensibility/settings`, `../config/model-settings`, và cạnh gãy đã biết nằm ở `discovery/helpers.ts:4`. Nếu không thoát được, hai file test mới cũng đỏ vì addon chứ không vì việc đã làm.
  - WI-5: phần hành vi là rỗng lúc ship. Không call site sản xuất nào đăng ký capability provider kèm sourceId (toàn bộ 84 lời gọi `registerProvider` đều ở mức module trong `src/discovery/`), nên nhánh suspend gọi `unregisterProvidersForSource` trong `sdk.ts` không làm gì lúc chạy; test chỉ gọi thẳng API của registry. Không được mô tả là "tắt extension là giải phóng provider trong thực tế".
  - WI-1: khẳng định (2), "timer sống sau resume", pass rỗng trên HEAD. Đừng báo nó là đỏ-trước/xanh-sau.
  - WI-9: `bun run check:ts` vẫn xanh khi xóa sạch cả file test. Điều kiện (1) không chứng minh (3).
  - WI-13: kế hoạch nói có hai chỗ `setHeader`/`setFooter` no-op im lặng; cổng đo thấy có bốn chỗ, tám dòng. Nếu câu hỏi mở về ACP được quyết là "im lặng của ACP là đúng", điều kiện (c) thu hẹp còn ba vị trí — phải ghi quyết định vào PR, không được thu hẹp âm thầm. Chưa có mặc định cho câu hỏi này — cần bạn quyết.
  - WI-8b: dòng 3, "setting đã đăng ký xuất hiện trong settings panel", bị chặn ở M2-OQ4. Chưa có mặc định — cần bạn quyết. Thiếu dòng này thì lỗi "âm thầm và vĩnh viễn" mà kế hoạch nêu không còn gì chặn.
  - WI-2: bỏ lớp sắp xếp ở `helpers.ts:763` thì row 1 vẫn xanh — tức lớp sắp xếp ở module liên kết không có coverage quan sát được trong fixture này. Câu hỏi mở, chưa đóng.
  - WI-11: hai con số trong kế hoạch là sai và không được lặp lại vào văn bản — `ExtensionContext` có 26 thành viên duy nhất chứ không phải 12, `ExtensionAPI` có 80 thành viên / 69 phương thức chứ không phải 29.
  - WI-12: tiền đề trong kế hoạch là sai — extension **đã** đóng góp MCP server ở mức package khai báo. Văn bản nói "extension không thể đóng góp MCP server" là sai và phải sửa.
  - WI-8a: cổng tự thừa nhận không bắt được ba thứ — migration chạy lại mỗi lần khởi động và hồi sinh key đã xóa (chỉ bước kiểm tra thủ công bắt được), tên biến môi trường sai nhưng hợp lý (fixture tự khai tên nên lỗi đặt tên là vô hình với suite), và thay đổi ngữ nghĩa `deletePluginSetting` (không dòng nào assert).
  - WI-10 và WI-11: không có gì trong CI ép được bất kỳ điều kiện nào. Markdown nằm ngoài mọi glob lint và typecheck. `bun run check:ts` xanh nói **không** gì về hai mục này — nó chạy trên 0 byte của thay đổi.
