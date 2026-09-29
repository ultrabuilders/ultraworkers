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

Native addon phải build trước khi `bun test` có nghĩa là gì:

```
brew install bazelisk
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
