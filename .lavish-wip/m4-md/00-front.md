# KẾ HOẠCH THỰC THIỆN — MILESTONE 4: MƯỢN KỶ LUẬT, KHÔNG MƯỢN KIẾN TRÚC

M1 bọc trọn `pi` làm tiền đề, M2 cắt seam composable, M3 dựng trải nghiệm người dùng kiểu Claude Code. M4 không thêm tính năng nào đáng kể. Nó là milestone duy nhất trong chương trình **lấy bài học từ một dự án khác** — `deepseek-ai/deepseek-harness` — và quyết định một dòng mà cả milestone đứng trên: *chỉ mượn KỶ LUẬT của dsh, không mượn KIẾN TRÚC, và không mượn bất kỳ thứ gì dsh đã phải tự vá để có được*. Sản phẩm bàn giao của M4 cho cả chương trình là một câu hỏi mà omp hiện tại không trả lời được: **thao tác này có thật sự xảy ra không?** Sau M4, lỗi "omp báo *applied*, nhưng không có gì thay đổi" không còn biểu đạt được.

**Trạng thái hiện tại của M4 (đọc để quyết định có bắt đầu hay không):**

| | |
| --- | --- |
| Work item còn lại | **4** (M4-4, M4-6, M4-7, M4-9) trên tổng 10 ban đầu |
| File được chạm | 37 mục đã kiểm chứng đường dẫn, trong đó 2 mục `[create,UNVERIFIED]` |
| Câu hỏi mở / đính chính | **19 câu hỏi mở, 34 đính chính** |
| Sóng | 3 (B, C, D) — và **cả ba đều `shippable: false`** |
| Cổng đang đỏ ngay bây giờ | 4/6 bước kiểm của M4-4 đỏ — (a)(b) vì cây chưa build addon native; (c)(d) vì refactor chưa thực thi |
| Phụ thuộc chưa thoả | 2 (M2 WI-8a/8b cho M4-6; M2 WI-2 cho M4-9) |

Đây **không phải** một milestone bắt đầu từ xanh. Hai trong bốn item phụ thuộc công việc M2 **chưa được thực thi** trên nhánh này, và item lớn nhất về mặt cơ học (M4-4) không viết test được cho tới khi build addon native xong.

---

## Mục tiêu

Viết bằng kết quả quan sát được, không bằng kết quả nội bộ.

**Người dùng cuối**

- Bật/tắt một plugin trong `/settings` **nhận được câu trả lời thật** thay vì `void` vô điều kiện: gọi đó biết lockfile có thật sự đổi không, và phiên đang chạy có nhận thay đổi không. *(M4-4)*
- Chỉnh một setting trong panel mà đang bị project config, `--config` overlay, runtime override hoặc biến môi trường chiếm giá trị: **panel nói rõ lớp nào đang che nó**, và giá trị chết đó **không còn được ghi vào `config.yml` toàn cục**. Trước M4, thao tác đó ghi một bản sao chết rồi gọi đó là "đã áp dụng". *(M4-6)*
- Một thẻ thiết bị `xd://` và mọi thẻ tool do extension đăng ký **thôi đóng băng giữa luồng**: renderer theo dõi buffer tham số thô giờ vẽ lại ở mỗi lần tiền tố dài thêm, thay vì chỉ vẽ lại khi *identity* của object `args` đã parse đổi. *(M4-7)*
- Một lệnh CLI mới, chỉ đọc: `omp extensions-triage`, in cho **mọi** extension mà loader tìm thấy — active / disabled / shadowed, và chính sách disable nào đã chặn nó. *(M4-9)*

**Người viết extension**

- `renderResult` cuối cùng nhận được đúng những gì type đã khai báo từ lâu: `argsComplete`, `executionStarted`, và kênh `rawArgs: { json, complete }` mới có kiểu. Hôm nay **hai adapter âm thầm vứt bốn field** trước khi extension kịp thấy chúng. *(M4-7)*
- Bật/tắt plugin trả về `ChangeResult` có cấu trúc, và một `SettingsWriteResult` cùng hình dạng — **một kiểu kết quả chung**, không phải hai kiểu gần giống nhau. *(M4-4 + M4-6)*

**Thành thật về phần vô hình.** Ba trong bốn item chỉ hiện ra khi có chuyện xấu xảy ra — một ghi file thất bại, một setting bị che, một extension bị chặn. Chỉ M4-7 có tác dụng nhìn thấy liên tục trên màn hình. Ngoài ra M4 tạo ra hạ tầng mà người dùng không bao giờ chạm tới: một `atomicWriteJson` dùng chung trong `packages/utils`, một `shadowing.ts` mới, một module capability mới, và một entry đăng ký lệnh CLI mới. Đổi lại, milestone này **giữ kỷ luật cho những milestone sau**: một release gate duy nhất, một quyết định changelog duy nhất, và các PR được phép merge nhưng không được phép release cho tới khi cả ba sóng xong.

---

## Vì sao chỉ mượn kỷ luật

`light.json` không chứa bản kiểm kê mã nguồn dsh — nó chỉ chứa bốn work item. Nên phần "dsh làm tốt hơn omp ở chỗ nào" phải suy ra từ chính bốn item, và suy ra rất gọn: **cả bốn item đều sửa một loại vi phạm cùng một hình dạng — hệ thống tuyên bố một điều mà nó không kiểm chứng được.**

- **M4-4:** bật/tắt plugin trả `void` vô điều kiện. Không có cách nào để biết ghi file có thành công hay không. Hệ thống nói *"đã áp dụng"* bằng cách không hỏi.
- **M4-6:** panel ghi một giá trị mà không biết lớp nào đang sở hữu nó. Giá trị chết được ghi xuống đĩa và được gọi là *"đã áp dụng"* — lần này là do một **lớp khác** âm thầm ghi đè.
- **M4-7:** hai adapter nhận `options` rồi **vứt bốn field** đi trước khi extension thấy. Hợp đồng được khai báo đúng, rồi bị phá bởi đường nối.
- **M4-9:** một bản kiểm kê plugin mà tự suy diễn lại shadowing thay vì chiếu từ `loadAllExtensions`. Rủi ro mà chính kế hoạch gọi ra và đúng: **"một bản kiểm kê nói dối tệ hơn không có bản kiểm kê nào."**

Đó là kỷ luật được mượn: **không tuyên bố hiệu ứng mà bạn không đo được; không dựng nguồn sự thật thứ hai; không nuốt thứ được giao.** Đây là thứ một dự án buộc phải nói ra to, vì dsh là một *harness* không có monolith để giấu mình vào. omp thì ngược lại — là một monolith đã gắn plugin, nên kỷ luật phải được **cưỡng chế** từ trong ra chứ không thể thừa hưởng.

**Và những thứ dsh đã phải tự vá — đó chính là danh sách loại trừ.** Bốn dòng `risk` trong `light.json` viết bằng lời của chính kế hoạch, và chúng là bản dịch các bước vá đó thành câu hỏi cho omp:

| Dòng `risk` | Cái giá nếu vá sai |
| --- | --- |
| "ghi rồi báo *applied* trong khi giá trị bị project config che" | ghi config chết |
| "rollback của `/settings` — quyết định rollback là thứ có thể brick `/settings`" | hỏng chức năng vĩnh viễn |
| "một thay đổi chỉ-đổi-type xanh ở mọi nơi và không đến với ai" | refactor ảo, không đổi hành vi |
| "bản kiểm kê lệch với dashboard" | hai nguồn sự thật |

M4 **không mượn bất kỳ mảnh kiến trúc nào của dsh** mà để đến được bốn điều trên. Không có file nào trong 37 mục nguồn từ dsh; không có gì để vendor, không có asset đích danh, không có phần phụ thuộc license nào gắn vào bốn item này.

**Vì sao mượn kiến trúc của dsh sẽ sai — ba lý do, đều suy ra từ chính các phụ thuộc ghi trong `light.json`:**

1. **Ba trong bốn item có phụ thuộc cứng vào thứ chỉ tồn tại trong repo này.** M4-6 sửa bề mặt `pi.registerSetting` có namespace do M2 WI-8a/8b tạo ra. M4-9 bắt buộc phải đi sau M2 WI-2 (thứ tự nạp extension xác định). M4-4 phải xử lý thứ tự merge với M3-A4, vì M3-A4 viết lại đúng dải `setPluginSetting` 942-949. Kiến trúc mượn về không có chỗ để chứa ba cái đó — chúng sẽ phải bị bẻ lại hoặc bỏ.
2. **Nó sẽ phá đúng những thứ M1 và M2 đã dựng.** M1 bọc trọn `pi`, M2 cắt seam composable. M4-7 nằm *trước* M2 WI-4b theo thứ tự bắt buộc của kế hoạch, và chính vì vậy nó chỉ làm cho hợp đồng render **thật sự đến nơi**, còn phần đăng ký renderer là của WI-4b. Đó là thứ tự "cứu seam", không phải thứ tự "thay seam".
3. **Các cổng kiểm của bốn item đều neo vào cây này.** Chúng grep `packages/`, chạy `packages/utils/test/file-lock.test.ts`, so kết quả CLI với dashboard. Một kiến trúc mượn về không làm bất kỳ điều gì trong số đó xanh.

Câu tắc để mang theo: **khi bốn ý đầu tiên của `one_line` có thể được viết thành một dòng mô tả hợp đồng cục bộ, hãy làm nó cục bộ.** Cả bốn đều vừa khít.

---

## Phạm vi đã thu hẹp

M4 từng có **mười** work item. Sáu đã rời đi. Tài liệu này chỉ nói về bốn.

**Sáu ID đã rời M4: `M4-0`, `M4-1`, `M4-2`, `M4-3`, `M4-5`, `M4-8`.**

Ba lý do, theo đúng cách kế hoạch đã ghi:

- **Năm item trùng công việc đã nằm trong M2 WI-1..WI-4** (seam composable và độ bền vững dữ liệu). Đây là lý do lớn nhất: M4 từng định mở rộng sang những thứ M2 đã giao.
- **`M4-3` rời đi vì nó là authoring surface thứ sáu, và M2 WI-4 đã đóng nó rồi.** Mở lại ở M4 là làm trùng.
- **`M4-5` rời đi vì nó là lỗi va chạm trong đường mint tên, không phải việc plugin.** Sai chỗ; nó thuộc về seam mint tên, không thuộc về chương trình "mọi thứ là plugin".

Riêng `M4-5` cần một câu nói thêm, vì "rời đi" ở đây **không** có nghĩa là "xong": nó là **một deliverable còn nợ của M4** — việc viết nó vào kế hoạch M1 vẫn phải làm, và hiện chưa hề có mục nào tên `M4-5` trong `MILESTONE_1_EXECUTION_PLAN.md`. Đừng đọc "đã ghi chú sang M1" là "đã bàn giao xong".

Chúng sống ở **tập work item của M2** (WI-1..WI-4) và trong phạm vi bọc trọn của M1. Tài liệu này cố tình **không lặp lại** ánh xạ ID→WI cụ thể — nó nằm ở kế hoạch tổng và kế hoạch thực thiện M2. Nếu cần tra cứu, hãy đọc kế hoạch M2; **đừng tìm `M4-0`..`M4-5` trong tài liệu này rồi kết luận M4 thiếu.**

Hệ quả trực tiếp cho bản chất milestone: M4 là **bốn PR, không phải mười**. Kế hoạch M2 phải đi trước; M4 là phần đuôi của chương trình, không phải đầu.

---

## Quy tắc `shippable`

Đây là trục xương của milestone, và `light.json` nói thẳng: **cả ba sóng đều `shippable: false`.** Không sóng nào của M4 được phép đi một mình.

M4 có **đúng một** quyết định release, và nó phủ cả ba sóng. Đây là hệ quả dẫn xuất, từng đằng nặng:

1. **Không mục CHANGELOG nào được thêm trong PR riêng lẻ.** M4-4 chạm tới *ba* file CHANGELOG (coding-agent, tui, utils) — nhưng đó là **một** quyết định, không phải ba. Wave C và Wave D cùng nằm trong cùng quyết định đó.
2. **Merge được phép, release thì không.** `light.json` viết nguyên văn: *"merge is allowed, release is not."* Wave B có thể vào nhánh, có thể xanh, nhưng không xuất hiện trong bản phát hành cho tới khi Wave C và Wave D cũng xong.
3. **Wave B là MỘT PR.** M4-4 và M4-6 cùng thay đổi một giao diện có điều kiện đã thoả trong cùng `packages/tui/src/overlays/`. Kế hoạch nói thẳng: **một lần review, hai commit**. M4-6 thêm một thành viên vào `SettingsHost`; M4-4 đổi kiểu trả về của `PluginSettingsManager.setEnabled`.
4. **Hai kiểu kết quả phải gộp thành một.** `ChangeResult` của M4-4 là tiền lệ cho `SettingsWriteResult` của M4-6. Hai kiểu gần giống nhau là một PR không liên kết. Wave B phải ship **một** kiểu kết quả nhất quán.
5. **M4-7 không được mở PR trước khi bản viết của M2 WI-4b được thống nhất** (§6.1). Tệ hơn: WI-4b **chưa tồn tại** trong danh sách work item của kế hoạch M2 (WI-0..WI-13) — bản thân nó là một việc phải làm trước.
6. **Wave D cần ủy quyền bằng văn bản.** Cổng của M4-9 đòi có `shippable: false authorization granted in writing` trước khi coi là xong.

**Work item nào `shippable: false` và vì sao:**

| Item | Sóng | Vì sao không ship một mình |
| --- | --- | --- |
| M4-4 | B | Gộp với M4-6 thành một PR (cùng giao diện cấu trúc trong `packages/tui/src/overlays/`); định hình `ChangeResult` là tiền lệ cho M4-6 |
| M4-6 | B | Gộp với M4-4 — "one review, one changelog gate"; còn bị chặn bởi quyết định changelog chung |
| M4-7 | C | "§6.2 forbids shipping any M4 wave alone"; nó **đổi thứ renderer `xd://` đầu tiên nhận** và **đổi tên một key** — cả hai đều người dùng nhìn thấy |
| M4-9 | D | Chờ cổng changelog chung; thêm một lệnh CLI top-level mới |

**Định nghĩa "M4 xong" mà quy tắc này áp đặt:** bốn commit đã merge **+** một quyết định changelog duy nhất **+** một lần release. Không có đường nào để bốn sóng thành công mà M4 vẫn treo. Và vì cả ba sóng đều đỏ hoặc chưa thể chạy ngay lúc này, đây là lý do thực tế để **không** mở Wave B trước khi M2 WI-8a/8b đã vào nhánh.

Một điểm đáng nói: M4-9 là item **duy nhất `blocks: []`** — không item nào trong M4 chờ nó. Nó có thể đến cuối mà không chặn ai. Nhưng nó vẫn không được ship một mình. `shippable: false` không phải câu hỏi về thứ tự merge; nó là câu hỏi về quyền phát hành.

---

## Không làm gì

**Không thêm runtime plugin mới.** M4 không dựng hệ thống plugin. Nó sửa bốn hợp đồng *bên trong* các seam M2 đã cắt.

**Không thêm authoring surface thứ sáu.** Đó là `M4-3`, đã rời đi vì M2 WI-4 đã đóng nó.

**Không dựng bề mặt đăng ký renderer.** M4-7 chỉ làm cho các field **đã được khai báo trong type** thật sự đến nơi. Bề mặt đăng ký là M2 WI-4b, và WI-4b xếp **sau** M4-7, không được nằm chung PR. WI-4b còn phải được viết và thống nhất **trước khi** M4-7 mở PR.

**M4-9 không báo nguồn che.** Tiêu đề đã ghi: *"scoped down: state/shadowed only, no shadow-source"*. Item ở phạm vi option **(a)** — 2 file mới, 2 file sửa, 1 test, khoảng một ngày, **không chạm shared core**. Option **(b)** (thêm `shadowedBy` và đổi `capability/index.ts` + 6 call site trong `state-manager.ts`, 2-3 ngày) **không nằm trong M4 đã thu hẹp**. Nếu sau này ai đó mở lại (b), nó là việc riêng.

**Không giải quyết câu hỏi `application`.** Cổng của M4-4 nói thẳng: *"DONE additionally requires a human decision on open question 1 (who owns `application`), because the plan's model for that type lives in a repo that does not exist here."* Kiểu đó **không có trong repo này**. M4-4 không được coi là xong khi câu hỏi này còn treo.

**Không coi các bước `grep` là test.** Cổng M4-4 tự nói: bước (c)(d)(e) là *"a human checklist, not a test"*. Cụ thể và đáng nhớ: nếu ai đó đổi thứ tự refactor để `#saveRuntimeConfig` bị **đổi tên** thay vì bị xoá, các lệnh grep vẫn xanh trong khi ổ khoá đã biến mất im lặng. **Phòng thủ duy nhất là test tranh chấp kèm control phản âm** — xoá `withFileLock` khỏi `#mutateConfig` và xác nhận test chuyển đỏ. Một cổng chưa từng thấy đỏ thì không phải cổng.

**Không sửa `tsc`, không `mock.module()`, không source-grep trong test.** Xem [Quy ước khi đọc](#quy-u-c-khi-%C4%91-c).

**Mục pháp lý §7 về deepseek-harness.** `light.json` **không có trường nào** về pháp lý, giấy phép hay attribution — và điều đó là thông tin có giá trị: không file nào trong 37 mục đến từ dsh, không có gì để vendor, nên **§7 gắn với chương trình, không gắn với bốn item này**. Không có nghĩa vụ license nào chặn việc merge M4-4/6/7/9. Việc cần làm: **xác nhận §7 trong kế hoạch tổng trước khi phát hành** — vì điểm pháp lý chỉ trở thành việc thật ở thời điểm phát hành, đúng lúc cả ba sóng đang chờ cùng một quyết định changelog.

---

## Điều kiện tiên quyết

### Addon native phải build trước khi `bun test` có nghĩa

```
bun --cwd=packages/natives run build
```

Đây là **tiền đề cứng, không phải tiện nghi.** `withFileLock` import `FileLock` từ `@oh-my-pi/pi-natives`. Không có addon:

```
bun test packages/utils/test/file-lock.test.ts
→ 0 pass, 1 fail
→ Failed to load pi_natives native addon for darwin-arm64
```

Concretely, "addon chưa build" nghĩa là **test của M4-4 chưa viết được và chưa chạy được** — kể cả control phản âm, vì control phản âm đòi xoá `withFileLock` rồi xác nhận đỏ; không có lock thì không có gì để xoá. Trên máy lạnh đây là một khoảng thời gian thật, và nó nằm **trước** phần viết code của M4-4. Bốn trong sáu bước kiểm của M4-4 đỏ ngay lúc này: (a)(b) vì cây chưa build addon native, (c)(d) vì refactor chưa thực thi.

### `bun run check:ts` chạy được không cần addon

Và nó **là** một cổng thật cho cả bốn item — không phải hình thức:

- **M4-4** bước (f): chính là thứ bắt được sự trôi giao diện `tui`/`coding-agent` mà kế hoạch cảnh báo, biến nó thành lỗi build thay vì một điều bất ngờ lúc chạy.
- **M4-6** cổng (4): ngoài việc sạch, nó còn **cấm** `SettingsProvenance` (tui, **tạo mới bởi M4-6**) và `SettingProvenance` (coding-agent, **đã tồn tại**) trôi lệch nhau — hai tên khác nhau, ở hai package khác nhau, cố ý giữ cho khớp điểm đầu-cuối.
- **M4-7** cổng G5.
- **M4-9** điều kiện (1).

### Điều kiện riêng của từng M4

| Điều kiện | Chặn item nào | Trạng thái |
| --- | --- | --- |
| Addon native đã build | M4-4 | Chưa build — cổng đỏ |
| **M2 WI-8a + WI-8b** phải merge — chúng là thứ tạo ra bề mặt `pi.registerSetting` có namespace mà M4-6 sửa | M4-6 | **CHƯA XÁC NHẬN** — WI-8a/8b là việc M2 chưa thực thi; phải xác nhận đã vào nhánh này trước khi bắt đầu |
| **M2 WI-2** (thứ tự nạp extension + giải quyết va chạm tường minh) phải merge | M4-9 | **CHƯA THOẢ** — `extension-load-order-determinism.test.ts` không tồn tại, `git grep -n 'extension-load-order' packages/coding-agent/` trả **0 hit** |
| Bản viết M2 WI-4b phải viết và thống nhất (§6.1) | M4-7 (trước khi mở PR) | Chưa tồn tại trong danh sách WI của kế hoạch M2 |
| Quyết định về merge order với M3-A4 | M4-4 | M3-A4 viết lại đúng dải `setPluginSetting` 942-949; hai bản vá độc lập sẽ âm thầm hủy lẫn nhau |
| Quyết định con người về câu hỏi mở 1 (ai sở hữu `application`) | M4-4 (điều kiện DONE) | Chờ bạn |
| Quyết định changelog của M4 (plan:§6.2) | Mở PR của Wave B | Chờ bạn — merge thì được, release thì không |
| Ủy quyền `shippable: false` của Wave D bằng văn bản | M4-9 | Chờ bạn |

**Lưu ý khi đọc cột `verified`:** hai mục `[create,UNVERIFIED]` trong M4-4 (`packages/utils/src/atomic-write.ts` và `packages/coding-agent/test/plugin-runtime-config-lock.test.ts`) là **file chưa tồn tại** — chúng được tạo ra bởi chính item đó. Đó không phải đường dẫn sai.

---

## Thứ tự thực hiện

Ba sóng, theo thứ tự **B → C → D**. Lưu ý: đây là thứ tự **merge**, không phải thứ tự release. Không sóng nào release.

### Wave B — Ghi trạng thái bền vững và sự thật của bảng settings

**Gồm:** M4-4 + M4-6. **Một PR, một lần review, hai commit** — kế hoạch xác nhận điều này, không phải suy đoán.

**Cần trước:** addon native đã build; M2 WI-8a/WI-8b đã merge; merge order với M3-A4 đã chốt; câu hỏi mở 1 về `application` đã có quyết định của người.

**Bàn giao:** `ChangeResult` + `withFileLock` + một `atomicWriteJson` dùng chung; lớp `shadowing.ts` mới; trả lời thật cho mọi ghi trạng thái bền vững; guard chặn ghi giá trị chết; **một** kiểu kết quả chung cho Wave B (không phải hai).

**Đúng sau khi kết thúc:**

- `git grep -n saveRuntimeConfig -- packages/` → **0 hit**
- `git grep -n atomicWriteJson -- packages/` → **đúng một** định nghĩa, trong `packages/utils`
- `grep -c secret .../manager.ts` → **0**
- `grep -c 'settings\.set(' packages/tui/src/overlays/settings-selector.ts` → **0** (cổng chống trôi: nó đỏ ngay khi có call site thứ 14 xuất hiện)
- `bun test packages/utils/test/file-lock.test.ts` → xanh (hiện là 0 pass / 1 fail)
- Test tranh chấp **và** control phản âm của nó đã từng được thấy đỏ
- Test project-shadow khẳng định trên **byte thật** của file rằng sau khi panel ghi, key không có trong `config.yml` toàn cục và giá trị **trước khi ghi** vẫn còn — rollback in-memory xảy ra trước khi debounce `#queueSave` 100ms ráo nên ghi và rollback của nó hợp nhất thành một lần save
- Test control "không có shadow" khẳng định **cùng key đó CÓ** trong `config.yml` — không có test này thì hai cổng trên thỏa mãn được bằng một con guard từ chối **mọi** ghi
- `bun run check:ts` sạch

**Rời khỏi Wave B mà chưa release.** Đây là ranh giới quan trọng: xanh ở đây nghĩa là "đúng", không phải "đã ship".

### Wave C — Hợp đồng render

**Gồm:** M4-7. **Cần trước:** bản viết WI-4b đã được thống nhất (§6.1) — chưa mở PR nếu chưa. Không để WI-4b thay đổi đường đăng ký renderer trong cùng PR; WI-4b xây trên hợp đồng mà item này tạo ra.

**Bàn giao:** kênh `rawArgs: { json, complete }` có kiểu thật sự; **toàn bộ** object `options` được chuyển tiếp xuống renderer của extension (thay vì bốn field bị vứt); `__partialJson` thôi mang một nghĩa; renderer theo buffer thô vẽ lại theo mọi lần tiền tố dài thêm.

**Đúng sau khi kết thúc — năm cổng, tất cả đều cơ học và đều có thể đỏ:**

- **G1 — ADAPTER REACH (cổng quyết định).** `raw-args-render-channel.test.ts` **ĐỎ trên cây trước khi sửa** và xanh sau. Nó đỏ vì `RegisteredToolAdapter.renderResult` nhận `options.argsComplete === true` và khẳng định object đã bắt vẫn còn nó — hôm nay `wrapper.ts:62` đã vứt nó. **Để chứng minh cổng này có răng:** chỉ thêm field `rawArgs` vào hai interface, đổi gì khác, chạy lại — và quan sát nó **vẫn xanh**. Đó chính là bẫy mà kế hoạch gọi tên: một thay đổi chỉ-đổi-type xanh ở mọi nơi và không đến với ai. G1 là thứ phân biệt item này với một refactor ảo.
- **G2 — STREAM MONOTONICITY.** Chuỗi `rawArgs.json` ghi lại phải **không giảm** và **nối tiền tố**; giá trị cuối phải chứa `"path":"xd://probe"` (lớp ngoài) và **không phải** JSON thiết bị lớp trong.
- **G3 — REBUILD PARITY.** Render dựng lại từ transcript bằng render dựng động. Đỏ nếu `ui-helpers.ts:605` chưa được nối — một kiểu hỏng mà **cả `bun check` lẫn các test xdev có sẵn đều không nhìn thấy**.
- **G4 — HIDDEN-KEY NEGATIVE.** `HIDDEN_ARG_KEYS` (`json-tree.ts:23`) phải phủ key xdev mới. Khẳng định qua `formatArgsInline` rằng **cả cách viết cũ lẫn mới** đều không xuất hiện trong output. Đỏ ngay khi ai đó đổi tên ở `xdev.ts:57` và quên dòng này — rủi ro im lặng mà kế hoạch nêu tên.
- **G5 — TYPES.** `bun run check:ts` thoát 0.

**Sau Wave C:** hợp đồng render đã có thật, và **M2 WI-4b mới được phép xây lên trên nó**. Đây là thứ duy nhất trong M4 mở khóa công việc ở milestone khác. Vẫn chưa release.

### Wave D — Khả năng nhìn thấy triage

**Gồm:** M4-9 (phạm vi option **(a)**: state/shadowed, **không** có shadow-source).

**Cần trước:** **M2 WI-2 phải merge** — chưa thoả. Lý do không thể trì hoãn: nếu CLI này ship trước, nó báo một thứ tự mà người dùng **chưa từng thấy** trên dashboard.

**Bàn giao:** lệnh chỉ-đọc `omp extensions-triage`, **chiếu** đúng những hàng mà `loadAllExtensions` đã trả về, không suy diễn lại bất cứ thứ gì.

**Đúng sau khi kết thúc:**

- `bun run check:ts` sạch; `extensions-triage-cli.test.ts` xanh
- **Diff thủ công ở bước 13 cho thấy các hàng của CLI khớp dashboard chính xác** — cụ thể: một hàng mà dashboard gọi là `disabled` tuyệt đối không được bị CLI báo là `active`. Đây là điều kiện **không thể bịa**: xoá phần mirror `Settings.init()` / `cfgDisabledExtensions` khỏi CLI thì JSON vẫn trông hợp lý, nhưng mọi disable ở mức item sẽ lật sang `active` và diff sẽ lộ ra
- Dòng CHANGELOG tồn tại **và** ủy quyền `shippable: false` của Wave D đã được cấp bằng văn bản
- *(nếu mở lại option (b))* một hàng bị winner cùng tên che phải báo `shadowedBy` khác rỗng, và một test trong capability suite **đỏ** nếu `_shadowed` được set mà không có winner

**Một thứ mà *không* cổng nào bắt được, người review phải tự mắt xác nhận:** `Command` có thật sự được đăng ký trong `cli-commands.ts` hay không. Thiếu một mục registry làm `omp extensions-triage` rơi xuống `runCli` và **chuyển argv cho LLM như một prompt** (hồi quy #1496) — và **không test nào liệt kê ở đây sẽ nhận ra**. Gợi ý lệnh test của chính kế hoạch, `bun test ... -t 'acp'`, sẽ xanh trước **mọi** khiếm khuyết nêu trên.

**Sau Wave D:** đủ ba sóng đã merge. Chưa release gì cả. Bước kế tiếp là **một** quyết định changelog duy nhất phủ B, C và D — rồi release.

---

## Quyết định cần chốt trước khi code

Những cái này suy ra trực tiếp từ `depends_on` và từ dòng `risk`; không cái nào được bịa thêm.

| # | Quyết định | Vì sao nó chặn code | Chặn item |
| --- | --- | --- | --- |
| 1 | **Ai sở hữu `application`?** | Kiểu mà kế hoạch dùng cho nó **sống trong một repo không tồn tại ở đây**. Đây là câu hỏi mở 1 và là điều kiện DONE của M4-4 | M4-4 |
| 2 | **Merge order với M3-A4** cho dải `setPluginSetting` 942-949 | Cùng PR, hoặc một thứ tự merge tường minh. Hai bản vá độc lập sẽ âm thầm hủy lẫn nhau | M4-4 |
| 3 | **`ChangeResult` hay `SettingsWriteResult`?** | `ChangeResult` của M4-4 là tiền lệ. Chốt một hình dạng để Wave B ship **một** kiểu kết quả, không phải hai kiểu gần giống | M4-6 (với M4-4) |
| 4 | **Quyết định rollback của `/settings`** | Dòng `risk` nói thẳng: *"the rollback decision is what can brick /settings"*. Đây là cái có thể làm hỏng vĩnh viễn một chức năng | M4-6 |
| 5 | **M4-9 là (a) hay (b)?** | Tiêu đề đã khoanh vùng là (a) — state/shadowed, không shadow-source, không chạm shared core. Xác nhận (b) nằm ngoài M4, và nếu ai mở lại (b) thì đó là việc riêng với `capability/index.ts` + 6 call site | M4-9 |
| 6 | **Giữ hai tên `SettingsProvenance` (tui) và `SettingProvenance` (coding-agent), hay hợp nhất?** | Cổng chỉ **cấm trôi lệch**, không **bắt phải giống nhau**. Cần biết trước để viết `check:ts` và tên biến | M4-6 |
| 7 | **Có viết bản WI-4b bây giờ, hay sau Wave B?** | M4-7 không được mở PR trước khi nó được thống nhất (§6.1), và nó **chưa tồn tại** | M4-7 (chặn sóng) |

---

## Quyết định cần bạn chốt

Bảng này là của người bảo trì, không phải của kỹ sư.

| # | Quyết định | Bối cảnh |
| --- | --- | --- |
| 1 | **Quyết định changelog của M4** (plan:§6.2) | Wave B **không thể mở PR** cho tới khi quyết định này có. *"Merge is allowed, release is not."* Đây là một quyết định duy nhất phủ cả ba sóng |
| 2 | **Ủy quyền `shippable: false` của Wave D bằng văn bản** | Cổng của M4-9 đòi nó như một điều kiện xong, bằng chữ |
| 3 | **Có bắt đầu M4 lúc này không, khi 2/4 item phụ thuộc công việc M2 chưa tồn tại?** | WI-8a/WI-8b (chặn M4-6) và WI-2 (chặn M4-9) đều chưa có trong cây. Wave C là item duy nhất không bị chặn bởi M2 — nó có thể đi trước nếu bạn muốn tạo hợp đồng render sớm cho WI-4b |
| 4 | **Chấp nhận việc giữ ba sóng unreleased?** | Cả ba đều `shippable: false`, nghĩa là người dùng có thể thấy thay đổi user-visible đã merge nhưng chưa xuất hiện trong bản phát hành cho tới khi milestone đóng lại. Đó là hệ quả trực tiếp của §6.2, không phải sự cố |
| 5 | **Xác nhận §7 về deepseek-harness** trước khi phát hành | Bốn item này không mang theo nghĩa vụ license nào (không file nào đến từ dsh). Nhưng điểm pháp lý chỉ thành việc thật **ở thời điểm phát hành** — đúng lúc cả ba sóng đang chờ cùng một quyết định changelog |

---

## Quy ước khi đọc

- **Tài liệu này bằng tiếng Việt. Code giữ nguyên tiếng Anh.** Tên file, tên symbol, tên commit và nội dung CHANGELOG không được dịch.
- **`bun check` và `bun test` — không bao giờ `tsc`, không bao giờ `npx tsc`.** `bun run check:ts` là cổng thật cho cả bốn item.
- **Không source-grep file implementation trong test.** Cấm `expect(src).toContain("someCall()")`, `.not.toContain("oldName")`, hay bất kỳ trò gì nào đọc mã nguồn rồi khẳng định về **hình dạng văn bản** của nó. Một test như vậy vỡ khi refactor vô hại và xanh khi hành vi đang hỏng. Khẳng định hợp đồng quan sát được; nếu phải khẳng định bất biến cấu trúc thì dùng type test hoặc oxlint rule — **không** quét chuỗi.
  - Hệ quả cụ thể cho M4-4: các bước `git grep` trong cổng là **checklist của con người, không phải test**. Đừng chuyển chúng vào file test.
  - Được phép: đọc một file mà **chính code của bạn vừa ghi** (kết quả apply-patch, bundle đã sinh, fixture tạm) và khẳng định về **output đó** — đó là hành vi, không phải source-grep.
- **Không `mock.module()`.** Nó đột biến module registry toàn cục và rò sang các file khác. Dùng `spyOn` trên object module đã import, `vi.restoreAllMocks()` trong `afterEach`. Mọi test phải **an toàn khi chạy full-suite**, không chỉ an toàn khi chạy một file.
- **Một cổng chưa từng thấy đỏ thì không phải cổng.** Với test tranh chấp của M4-4 và G1 của M4-7, phải **chứng minh** cổng có răng: xoá `withFileLock` / chỉ thêm field type, rồi xác nhận đỏ (hoặc xanh, đúng như G1 yêu cầu để chứng minh bẫy).
- **Cổng (3) của M4-9 không thể bịa**, nhưng việc `Command` có được đăng ký trong `cli-commands.ts` thì có thể. Cái đó phải mắt thấy, không phải test thấy.
- **`[create,UNVERIFIED]` nghĩa là file chưa tồn tại**, vì item đó tạo ra nó — không phải đường dẫn sai.
