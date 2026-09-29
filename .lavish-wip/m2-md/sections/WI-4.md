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
