## W8a. 15 file literal dạng trần (sóng 3)

**Sóng:** Wave 3 · **Effort:** S về thao tác gõ, M về quyết định. Số dòng thật sự phải sửa trong mã nguồn là 2 (một file). 13 file còn lại là 13 quyết định "không sửa", và đó mới là chi phí. Thêm 3 hàng keep-list, 1 file probe mới (~60 dòng, copy từ probe hiện có), 1 dòng nối vào test hiện có, 1 ca thêm vào test của W2, và 2 đoạn văn xuôi tài liệu. Tổng dưới 2 giờ nếu đã đọc bảng quyết định ở `code_shape`; trên 4 giờ nếu phải tự suy lại từng file. · **Rủi ro chính:** áp cùng một quyết định cho cả 15 file. "Giữ tất cả" đóng băng luôn hai dòng gallery, và gallery là lệnh CLI đã phát hành nên thương hiệu cũ sẽ xuất hiện trong ảnh chụp màn hình của lệnh đó. "Đổi tất cả" phá ba giá trị wire của bên thứ ba (N18/N19/N20) — chúng không có mục nào trong bảng N1–N17, nên kỹ sư chỉ đọc keep-list mà không đọc phần này sẽ đổi chúng. Đó là lý do ba hàng keep-list ở bước 7 nặng hơn cả hai dòng rename.

Tóm một câu: mỗi literal dạng trần `oh-my-pi` nằm ngoài tầm với của sed scope của W7, nên W8a là 15 quyết định riêng chứ không phải một mẫu. Kết quả là 7 giá trị wire giữ nguyên (3 cái phải thêm mới vào keep-list), đúng 1 file đổi tên hiển thị, và 7 file test không sửa dòng nào.

Hiệu ứng người dùng thấy: lệnh `omp gallery` in ra tên dự án `ultraworkers` thay vì `oh-my-pi` trong dòng trạng thái và trong ảnh chụp màn hình mà lệnh đó tạo. Không có thay đổi nào khác người dùng nhìn thấy: bảng chi phí telemetry OTLP vẫn tách theo service `oh-my-pi`, client ACP vẫn tự giới thiệu là `oh-my-pi`, và các provider bên thứ ba (Z.AI, Exa, máy chủ OAuth) vẫn nhận đúng tên khóa/tên client/tên nguồn mà chúng đã nhận — đổi bất kỳ giá trị nào trong ba cái đó sẽ hỏng mà không có lỗi nào được ném.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli/gallery-fixtures/segments.ts` | sửa | Đổi DUY NHẤT hai literal dạng trần trong toàn bộ W8a: `relativeRepoRoot: "oh-my-pi"` tại dòng 33 và `projectName: "oh-my-pi"` tại dòng 164, thành `ultraworkers`. KHÔNG đụng `cwd`/`repoRoot` (`/workspace/oh-my-pi`, dòng 31-32) — đó là dạng trần không có dấu nháy kép nên nằm ngoài phạm vi W8a; nếu muốn đồng bộ thì thuộc W8b. Giữ nguyên 5 lượt scope `@oh-my-pi/` trong file này — W7 đã đổi chúng. | Có (`verified: true`). Đã đọc `packages/coding-agent/src/cli/gallery-cli.ts:1-9` và `packages/coding-agent/src/cli-commands.ts:121-126`: `gallery` là lệnh CLI đã đăng ký và phát hành, in ra stdout qua `captureGalleryScreenshots`. Đây là fixture TỔNG HỢP (deterministic display context), KHÔNG phải transcript đã ghi. |
| `scripts/rename/keep-list.txt` | sửa | Thêm đúng 3 hàng mới theo định dạng bắt buộc `<mẫu hoặc đường dẫn>  # <lý do>`: N18 cho `packages/ai/src/registry/oauth/zai.ts:25`, N19 cho `packages/coding-agent/src/web/search/providers/exa.ts:26`, N20 cho `packages/coding-agent/src/mcp/oauth-flow.ts:629`. Ba hàng này CHƯA tồn tại ở bảng N1–N17 của plan. Không sửa, không xoá, không sắp xếp lại bất kỳ hàng N1–N17 nào. | Có (`verified: true`). File do W7 tạo ra. Định dạng và quy tắc duyệt lấy từ §2.3 của plan và Gate 0 của W7. Phần `#` là bắt buộc. |
| `packages/coding-agent/test/otel-service-name-probe.ts` | tạo | TẠI MỚI. Probe tiến trình con, anh em của `packages/coding-agent/test/otel-resource-probe.ts`, dựng OTLP/proto receiver trên loopback, KHÔNG đặt `OTEL_SERVICE_NAME` và KHÔNG đặt `OTEL_RESOURCE_ATTRIBUTES`, export một span, rồi đọc `service.name` trong payload protobuf và in `PROBE: RECEIVED` khi nó khớp giá trị fallback đã chốt, `PROBE: NO_EXPORT` khi không. Exit 0/1 tương ứng. | Có (`verified: true`). Bắt buộc phải là file RIÊNG, không sửa `otel-resource-probe.ts` — probe hiện có đặt `OTEL_SERVICE_NAME="svc-probe"` (dòng 37) và tồn tại chính để chứng minh biến môi trường THẮNG giá trị fallback. |
| `packages/coding-agent/test/telemetry-export.test.ts` | sửa | Thêm một mục `["fallback service name", "./otel-service-name-probe.ts"]` vào mảng `probes` trong `describe("initTelemetryExport signals export path")` (khoảng dòng 118-124) và thêm kỳ vọng tương ứng vào `expect(Object.fromEntries(results)).toEqual({...})` (khoảng dòng 140-144). KHÔNG sửa probe hiện có, KHÔNG đổi `beforeEach`, KHÔNG đụng env. | Có (`verified: true`). Cùng cơ chế spawn subprocess đã dùng cho 3 probe kia — không cần hạ tầng mới. Timeout của describe hiện là 20_000; thêm probe thứ tư có thể cần nới lên, nếu không thì để nguyên và ghi vào commit rằng timeout chưa được đo. |
| `packages/coding-agent/test/pi-scope-aliases.test.ts` | sửa (có điều kiện) | Thêm ca cho một import đến mà KHÔNG scope nào được áp dụng, và một ca cho import đến bằng scope cũ, cùng phân giải về CÙNG một package host (xem `Hợp đồng test`, invariant 2). | CHƯA kiểm chứng như một mục `files_touched`: file này không có trong `files_touched` và không có bước nào trong `steps` bảo sửa nó, nhưng lại xuất hiện trong `test_files` và trong danh sách file bắt buộc của Gate C. Chỉ có bằng chứng gián tiếp từ `plan_corrections` #6. |
| `docs/extension-loading.md` | sửa (có điều kiện) | Sửa văn xuôi ở dòng 231 sau khi W7 đã merge; KHÔNG chạy pass thay chuỗi (bước 10). | CHƯA kiểm chứng như một mục `files_touched`: không nằm trong `files_touched`. Bằng chứng gián tiếp từ `plan_corrections` #8: `grep -cE '"oh-my-pi"'` trên file này bằng 0. |
| `docs/porting-from-pi-mono.md` | sửa (có điều kiện) | Sửa văn xuôi ở dòng 46-51 sau khi W7 đã merge; KHÔNG chạy pass thay chuỗi (bước 10). | CHƯA kiểm chứng như một mục `files_touched`: không nằm trong `files_touched`. Bằng chứng gián tiếp từ `plan_corrections` #8: `grep -cE '"oh-my-pi"'` trên file này bằng 0. |

Bảy file nguồn còn lại và bảy file test được nêu ở các bước 5-6 không nằm trong bảng trên: chúng là các quyết định "không sửa" và không phải file cần chạm tới.

### Các bước

1. **DỪNG và kiểm tra bốn điều kiện mở.** Nếu bất kỳ điều nào chưa đúng: DỪNG, không sửa dòng nào, báo lại.
   - (a) W7 đã merge và Gate C của W7 xanh — đây là điều kiện CỨNG, không phải cảnh báo: W8a mà chạy trước sẽ làm Gate C của W7 đỏ và phá bằng chứng rằng pass scope không chạm dạng trần.
   - (b) W2 đã merge: `CANONICAL_PI_SCOPE` tại `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:796` đã trỏ scope mới, và `PI_SCOPE_ALIASES` tại `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802` VẪN còn nguyên dạng trần `["oh-my-pi", "mariozechner", "earendil-works"]`.
   - (c) `scripts/rename/keep-list.txt` tồn tại trên `main` và đã được một người duyệt không phải người viết.
   - (d) M2 đã merge và đã chốt `exports` map — chỉ cần cho phần tài liệu ở bước 10.

2. **Chụp baseline trước mọi thay đổi, ra `/tmp`, KHÔNG để trong repo** (anchor: `<repo root>`):

   ```bash
   git grep -nE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' > /tmp/w8a-bare-baseline.txt
   git rev-parse HEAD > /tmp/w8a-head-baseline.txt
   ```

   Tại HEAD `84cbac9` (nhánh milestone-1) file baseline PHẢI có ĐÚNG 15 dòng và 23 lượt. Nếu lệch, cây đã đổi — dừng và đếm lại, đừng tiếp tục trên con số của tài liệu này.

3. **Đối chiếu bảng quyết định với file thật trước khi tin vào nó.** Bảng ở `Hình dạng code` dưới đây đã được đối chiếu với file thật ở HEAD `84cbac9`. Nó gồm 8 file nguồn/doc (7 nguồn + 1 doc) và 7 file test. Không có hàng nào được bỏ qua và không có hàng nào thêm mới — nếu bạn tìm thấy một literal dạng trần thứ 24 ở đâu đó, đó là phát hiện mới, hãy báo lại chứ đừng tự thêm vào bảng. (Xem `Cần người xác nhận` về cách bảng này tự đếm.)

4. **SỬA DUY NHẤT file nguồn của cả W8a.** Đổi hai literal ở `packages/coding-agent/src/cli/gallery-fixtures/segments.ts` — dòng 33 `relativeRepoRoot: "oh-my-pi"` và dòng 164 `projectName: "oh-my-pi"` — thành `"ultraworkers"`.
   - Dùng tay hoặc editor, **KHÔNG dùng sed**: hai dòng này nằm trong cùng file với 5 lượt scope `@oh-my-pi/` mà W7 đã đổi, và một sed không phân biệt trên file này sẽ hoàn nguyên phần việc của W7.
   - Sau khi sửa, `grep -n 'ultraworkers' packages/coding-agent/src/cli/gallery-fixtures/segments.ts` phải ra đúng 2 dòng, và `git diff` trên file này phải hiện ĐÚNG 2 dòng bị đổi — nhiều hơn 2 là sai.

5. **KHÔNG SỬA 7 file nguồn còn lại.** Chúng được giữ nguyên có chủ ý:
   - `packages/coding-agent/src/telemetry-export-otlp.ts:51` (N7)
   - `packages/coding-agent/src/modes/acp/acp-agent.ts:656` (N5)
   - `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802` (N8, thuộc W2)
   - `packages/ai/src/registry/oauth/zai.ts:25` (N18 mới)
   - `packages/coding-agent/src/web/search/providers/exa.ts:26` (N19 mới)
   - `packages/coding-agent/src/mcp/oauth-flow.ts:629` (N20 mới)
   - `docs/provider-quirks.md:1706` (mô tả giá trị wire của `zai.ts`, phải khớp quyết định N18)

   Chạy lệnh kiểm ở Gate B để chứng minh cả 7 vẫn còn nguyên sau khi bạn xong — đó là bằng chứng, không phải việc làm thêm.

6. **KHÔNG SỬA 7 file test.** Chúng là hai loại khác nhau và cả hai đều phải giữ:
   - 5 file là **pin khóa chặn**: `packages/ai/test/zai-oauth.test.ts`, `packages/coding-agent/test/acp-initialize-conformance.test.ts`, `packages/coding-agent/test/acp-lazy-startup.test.ts`, `packages/coding-agent/test/oauth-flow.test.ts`, `packages/coding-agent/test/tools/web-search-exa.test.ts` — chúng khẳng định đúng giá trị wire mà bước 5 giữ.
   - 2 file là **dữ liệu fixture tùy ý**: `packages/ai/test/cursor-exec-modern.test.ts` và `packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts` — chúng truyền một tên repo giả vào `parseGitHubUrl` và vào một schema SCM.
   - Đổi 5 file pin khi giá trị wire giữ là LÀM HỎNG chính tấm chắn; đổi 2 file fixture là churn thuần với không một hợp đồng nào đổi.
   - Hệ quả cần nói rõ: dưới các quyết định ở bước 4-5, W8a sửa ĐÚNG 0 dòng test có sẵn.

7. **Thêm 3 hàng N18/N19/N20 vào `scripts/rename/keep-list.txt`**, mỗi hàng một dòng, phần `#` lý do bắt buộc không được bỏ trống, theo đúng định dạng của các hàng N1–N17 sẵn có. Lý do gợi ý:
   - N18: "tên khóa gửi lên API bên thứ ba qua businessLogin, đổi nó là tạo một khóa khác trong tài khoản Z.AI của người dùng"
   - N19: "header x-exa-source gửi cho Exa, là attribution phía nhà cung cấp, đổi nó làm mất credit traffic mà không có lỗi cục bộ nào"
   - N20: "client_name trong payload đăng ký client động RFC 7591, là danh tính hiển thị với người dùng ở màn hình consent và là thứ provider dùng để lập allowlist"

   KHÔNG sửa bất kỳ hàng N1–N17 nào và không sắp xếp lại file.

8. **Tạo file test mới `packages/coding-agent/test/otel-service-name-probe.ts`.** Copy cấu trúc từ `packages/coding-agent/test/otel-resource-probe.ts` (anchor `packages/coding-agent/test/otel-resource-probe.ts:1`): receiver loopback `Bun.serve` port 0, đọc `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `await initTelemetryExport()`, kiểm tra `isTelemetryExportEnabled()`, startSpan + end, `await flushTelemetryExport()`, đọc payload bằng `body.toString("latin1")`. Ba khác biệt bắt buộc:
   1. KHÔNG gán `process.env.OTEL_SERVICE_NAME`;
   2. KHÔNG gán `process.env.OTEL_RESOURCE_ATTRIBUTES`;
   3. phép kiểm là `has("ultraworkers-fallback-marker")` đúng tên bạn đã chốt ở hàng N7 — dùng chính giá trị constant, không hardcode lần thứ hai một chuỗi khác.

   `SERVICE_NAME` KHÔNG được export, nên đây là cách duy nhất quan sát được nó mà không sửa mã nguồn. (Xem `Cần người xác nhận` về xung đột giữa marker ở điểm 3 và quyết định giữ tại hàng N7.)

9. **Nối probe mới vào `packages/coding-agent/test/telemetry-export.test.ts`** (anchor `packages/coding-agent/test/telemetry-export.test.ts:118`): thêm một cặp `[tên, "./otel-service-name-probe.ts"]` vào mảng `probes` và một khoá tương ứng trong `expect(Object.fromEntries(results)).toEqual({...})`. Giữ nguyên cơ chế `Bun.spawn([process.execPath, probe], { env: { ...process.env }, ... })` — nó loại các biến OTEL kế thừa mà `beforeEach` đã dọn. Cân nhắc nới timeout 20_000 của describe lên 30_000 vì giờ có 4 probe chạy song song; nếu không đo được thì để nguyên và ghi rõ trong commit là chưa đo.

10. **Phần tài liệu — chỉ làm sau khi M2 đã merge.** Hai file `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` phải được viết lại để mô tả ánh xạ scope mới.
    - **LƯU Ý QUAN TRỌNG:** hai file này KHÔNG chứa literal dạng trần — `grep -cE '"oh-my-pi"'` trên cả hai đều bằng 0. Chúng chứa dạng có dấu `/`, đã thuộc về W7.
    - Việc W8a làm ở đây là **SỬA VĂN XUÔI, không phải thay chuỗi**: sau W7, dòng 46-50 của `porting-from-pi-mono.md` sẽ tự động đã đọc `@mariozechner/...` → `@ultraworkers/...`, và dòng 231 của `extension-loading.md` sẽ tự động đã đọc scope mới.
    - Hãy đọc lại sau W7 rồi chỉ sửa phần câu chữ đã lỗi thời, đừng chạy thêm một pass thay chuỗi.

11. **KHÔNG thêm, KHÔNG sửa, KHÔNG sắp xếp lại bất kỳ mục changelog nào trong bất kỳ package nào.** `AGENTS.md` nói phần đã phát hành là bất biến, và N11 giữ 13 file changelog. W8a không có thay đổi user-facing nào đáng ghi changelog: một fixture của lệnh gallery không phải mục changelog, và các giá trị wire giữ nguyên thì không có gì để thông báo. Nếu bạn vẫn thấy cần ghi, hãy hỏi người dùng trước — plan nói rõ chỉ cập nhật changelog khi được yêu cầu. (anchor: `packages/*/CHANGELOG.md`)

12. **Chạy cổng ở mục `Cổng hoàn thành` theo đúng thứ tự**, dừng ngay khi cổng đầu tiên đỏ. Ghi kết quả TỪNG cổng vào commit message, kể cả cổng không chạy được. Một cổng bị chặn bởi môi trường phải được ghi `NOT RUN — environment blocked`, TUYỆT ĐỐI không ghi `pass`. Gate C là cổng quan trọng nhất của W8a: nó là thứ chứng minh pass của W7 không lẫn sang việc của W8a và ngược lại. (anchor: `<repo root>`)

### Hình dạng code

W8a là BẢNG QUYẾT ĐỊNH, không phải một mẫu thay chuỗi. Bảng dưới là sản phẩm của work item; nó đã được đối chiếu với file thật ở HEAD `84cbac9`. Mỗi hàng là một literal, không phải một file — file test có nhiều hàng.

**8 file nguồn/doc — 7 giữ, 1 file đổi (2 lượt)**

| quyết định | mã | path:line | literal | ghi chú |
| --- | --- | --- | --- | --- |
| keep-wire | N7 | `packages/coding-agent/src/telemetry-export-otlp.ts:51` | `SERVICE_NAME = "oh-my-pi"` | → `resourceFromAttributes({"service.name": SERVICE_NAME})` tại `:121`. Tách dashboard chi phí theo service. KHÔNG có test nào hiện tại pin giá trị này. |
| keep-wire | N5 | `packages/coding-agent/src/modes/acp/acp-agent.ts:656` | `agentInfo.name = "oh-my-pi"` | → trả cho ACP client. Dòng `:657` `"omp"` là N4, dùng hàng này. |
| keep-wire | N8 | `packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802` | `PI_SCOPE_ALIASES[0]` | → giữ VĨNH VIỄN. Cơ sở của cả cuộc chuyển đổi. Thuộc W2, W8a KHÔNG sửa. |
| keep-wire | N18 | `packages/ai/src/registry/oauth/zai.ts:25` | `KEY_NAME = "oh-my-pi"` | → `postJson(keysUrl, { name: KEY_NAME })` tại `:171`. Comment `:24` nói rõ lý do: `OMP's own key name so sign-in never mutates ZCode's zcode-api-key` — danh tính SỞ HỮU khoá, đổi tên = tạo khoá mới trong tài khoản của người dùng. |
| keep-wire | N19 | `packages/coding-agent/src/web/search/providers/exa.ts:26` | `EXA_MCP_SOURCE = "oh-my-pi"` | → header `x-exa-source` tại `:369`. Attribution phía Exa, cùng loại với N9. |
| keep-wire | N20 | `packages/coding-agent/src/mcp/oauth-flow.ts:629` | `client_name: "oh-my-pi"` | → payload đăng ký client động RFC 7591. Docblock ngay trên (tại `:612-620`) nêu nếu Figma từ chối client ngoài danh sách — provider dùng payload này để lập allowlist. |
| keep-doc | N18 | `docs/provider-quirks.md:1706` | mô tả `KEY_NAME` của `zai.ts` | → phải khớp quyết định N18; bảng 0 literal ở dòng 1 (plan sai, xem Đính chính #2). |
| RENAME | — | `packages/coding-agent/src/cli/gallery-fixtures/segments.ts:33` | `relativeRepoRoot: "oh-my-pi"` | → `"ultraworkers"` |
| RENAME | — | `packages/coding-agent/src/cli/gallery-fixtures/segments.ts:164` | `projectName: "oh-my-pi"` | → `"ultraworkers"` |

**7 file test — 14 lượt — giữ nguyên, 0 dòng sửa**

| loại | path:line | lượt | khẳng định | lý do giữ |
| --- | --- | --- | --- | --- |
| pin (khóa chặn) | `packages/ai/test/zai-oauth.test.ts:109,437,444` | 3 | `{ name: "oh-my-pi" }` gửi lên Z.AI | giữ vì N18 giữ |
| pin (khóa chặn) | `packages/coding-agent/test/acp-initialize-conformance.test.ts:235` | 1 | `agentInfo.name === "oh-my-pi"` | giữ vì N5 giữ |
| pin (khóa chặn) | `packages/coding-agent/test/acp-lazy-startup.test.ts:375` | 1 | `expect.objectContaining({ name: "oh-my-pi" })` | giữ vì N5 giữ |
| pin (khóa chặn) | `packages/coding-agent/test/oauth-flow.test.ts:81` | 1 | `client_name === "oh-my-pi"` | giữ vì N20 giữ |
| pin (khóa chặn) | `packages/coding-agent/test/tools/web-search-exa.test.ts:608` | 1 | `x-exa-source === "oh-my-pi"` | giữ vì N19 giữ |
| fixture (tùy ý) | `packages/ai/test/cursor-exec-modern.test.ts:280,1474,1482` | 3 | `repo: "oh-my-pi"` trong fixture SCM/GitHub | chuỗi fixture tùy ý, đổi không đổi gì |
| fixture (tùy ý) | `packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:214,222,254,263` | 4 | `parseGitHubUrl(".../can1357/oh-my-pi/...")` | dữ liệu cho một parser thuần, đổi là churn thuần |

TỔNG: 9 lượt ở 8 file nguồn/doc + 14 lượt ở 7 file test = 23 lượt trên 15 file. (Con số 16 xuất hiện nếu không loại file kế hoạch — xem Đính chính #1.)

Hình dạng biến theo quy ước W1 (sau khi W1 đặt xuống) — W8a KHÔNG sửa bất kỳ dòng nào trong khối này:

```typescript
const SERVICE_NAME = "ultraworkers" hoặc giữ "oh-my-pi" — W8a KHÔNG sửa dòng này.
const EXA_MCP_SOURCE = "ultraworkers";   // W8a KHÔNG sửa dòng này.
client_name: "ultraworkers",             // W8a KHÔNG sửa dòng này.
const KEY_NAME = "ultraworkers";         // W8a KHÔNG sửa dòng này.
const PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"] as const;  // W8a KHÔNG sửa dòng này (W2 sở hữu).
name: "ultraworkers",                    // W8a KHÔNG sửa dòng này (N5).
```

Duy nhất hai dòng W8a sửa (gallery):

```typescript
relativeRepoRoot: "ultraworkers",
worktree: { projectName: "ultraworkers", worktreeName: "gallery-reference" },
```

### Hợp đồng test

Hợp đồng duy nhất W8a phải bảo vệ là: **giá trị wire dạng trần không bị một lần đổi tên cơ học bỏ sót và âm thầm dịch chuyển.** Cụ thể, hai invariant, mỗi invariant một test.

**Invariant 1 — PIN TELEMETRY.** Giá trị fallback của `service.name` OTLP. Đây là lỗ hổng phủ thật sự: 3 giá trị wire còn lại (N5, N19, N20) đã có test khẳng định sẵn ở 5 file test, nhưng `SERVICE_NAME` thì không test nào chạm tới, và `SERVICE_NAME` không được export. Test mới phải chứng minh resource attribute thật sự mang giá trị đã chốt khi KHÔNG có `OTEL_SERVICE_NAME` — tức là **nhánh fallback, không phải nhánh precedence**. Nếu không có test này, đổi tên ở đây không đỏ test nào và dashboard chi phí tách làm hai mà không ai biết.

- Nằm ở `packages/coding-agent/test/otel-service-name-probe.ts` + `packages/coding-agent/test/telemetry-export.test.ts`.

**Invariant 2 — PHÂN GIẢI SCOPE KHÔNG CÓ GHI CHÈ.** Mở rộng vào file test của W2, tức `packages/coding-agent/test/pi-scope-aliases.test.ts` (KHÔNG phải `packages/coding-agent/test/extension-scope-canonicalization.test.ts` như plan viết — file đó không tồn tại, xem Đính chính #6). Thêm một ca cho một import đến mà KHÔNG scope nào được áp dụng, và một ca cho import đến bằng scope cũ, cùng phân giải về CÙNG một package host. Đây là ca bảo vệ N8 — xoá `"oh-my-pi"` khỏi `PI_SCOPE_ALIASES` làm mọi extension cũ hỏng bằng module-not-found lúc load plugin, và không có gì đỏ.

Bốn test file hiện có đã là sẵn pin cho 3 giá trị wire — W8a KHÔNG viết lại chúng và KHÔNG thêm ca nào vào 5 file đó. Ca fallback-vs-precedence ở trên là ca duy nhất chứng minh được nhánh fallback; chỉ khẳng định lại giá trị precedence sẽ vừa thừa vừa phá hợp đồng precedence hiện có. (Xem `Cần người xác nhận` — hai câu này tự mâu thuẫn về số file.)

**TUYỆT ĐỐI KHÔNG:**

- KHÔNG source-grep file implementation (đọc `packages/coding-agent/src/telemetry-export-otlp.ts` rồi `expect(src).toContain("oh-my-pi")` là test cấm — nó chết ngay khi ai đó refactor hợp lệ và sống sót khi hành vi hỏng).
- KHÔNG `mock.module()`.
- KHÔNG assert lại 14 literal trong 7 file test.
- KHÔNG thêm test cho `segments.ts` (đó là dữ liệu fixture của lệnh gallery, không có hợp đồng quan sát được nào đứng sau nó).

### Xác minh

**CHẠY ĐƯỢC trên máy này:**

- `bun run check:ts` — exit 0 tại HEAD `84cbac9`. Đã đo: oxlint sạch, oxfmt sạch trên 5445 file, cả 16 package `check:types` Done. Lần đo mất 85s (máy đang bận; con số 29s trong briefing là trên máy rảnh). Đây là tín hiệu chính.

**KHÔNG CHẠY ĐƯỢC (đã xác nhận bằng lệnh thật trên máy này):**

- `bun test` — bị chặn: `Failed to load pi_natives native addon for darwin-arm64`, mọi test báo 0 pass / 1 fail / 1 error.
- Gỡ chặn: `brew install ninja` TRƯỚC, rồi `bun --cwd=packages/natives run build`, rồi `bun run test:ts`. Không có `ninja` thì build fail với `CMake was unable to find a build program corresponding to "Ninja"` — cmake build của opusic-sys cần nó.
- `bun run check` — gọi thêm `check:rs` cần cargo, chưa xác minh trong W8a. Plan dùng `bun run check`; ở đây thay bằng `bun run check:ts` vì đó mới là phần chạm tới các file W8a sửa. **`tsc` không được dùng.**

**SAU KHI CÓ `ninja` + native addon đã build:**

```bash
cd packages/coding-agent && bun test test/telemetry-export.test.ts test/pi-scope-aliases.test.ts
```

### Cổng hoàn thành

`gate_can_fail: true`. Chạy theo đúng thứ tự, dừng ngay khi cổng đầu tiên đỏ.

**GATE 0 — ĐIỀU KIỆN MỞ**

```bash
git merge-base --is-ancestor HEAD main >/dev/null 2>&1 || true
git grep -q 'CANONICAL_PI_SCOPE' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts || { echo 'GATE 0 FAIL: W2 chua merge'; exit 1; }
git grep -qF 'PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"]' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts || { echo 'GATE 0 FAIL: N8 alias da bi pham — dung lai, W8a khong the chay'; exit 1; }
test -f scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list.txt missing'; exit 1; }
grep -q 'N7' scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list chua qua duyet W7'; exit 1; }
git grep -l '@ultraworkers/pi-catalog' -- 'packages/catalog/package.json' >/dev/null || { echo 'GATE 0 FAIL: W7 chua merge — W8a phai chay SAU W7 vi Gate C cua W7 so sanh baseline dang truan'; exit 1; }
```

Phân biệt được: W7 chưa xong → BLOCKED, không phải "W8a chưa xong".

**GATE A — TẬP FILE TRÒN VẸN KHÔNG ĐỔI**

```bash
git grep -lE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' > /tmp/w8a-bare-after.txt
diff /tmp/w8a-bare-baseline.txt /tmp/w8a-bare-after.txt && echo 'GATE A: tap 15 file van nguyen (chi gallery doi noi dung)'
```

Baseline PHẢI là 15 dòng. Đọc kỹ: dòng 6 (gallery) vẫn xuất hiện là ĐÚNG — W8a đổi GIÁ TRỊ trong file, không xoá file. Dòng 16 (kế hoạch) nên được loại bằng `:!` vì nó chứa chuỗi trong bản kế hoạch, không phải mục tiêu. Phân biệt được: dòng khác biệt nghĩa là W8a đã thêm/xoá literal ở file ngoài bảng quyết định — dừng ngay.

**GATE B — 7 LITERAL GIỮ NGUYÊN (cổng chống sed)**

```bash
for loc in 'packages/coding-agent/src/telemetry-export-otlp.ts:51:"oh-my-pi"' 'packages/coding-agent/src/modes/acp/acp-agent.ts:656:"oh-my-pi"' 'packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:802:"oh-my-pi"' 'packages/ai/src/registry/oauth/zai.ts:25:"oh-my-pi"' 'packages/coding-agent/src/web/search/providers/exa.ts:26:"oh-my-pi"' 'packages/coding-agent/src/mcp/oauth-flow.ts:629:"oh-my-pi"' 'docs/provider-quirks.md:1706:"oh-my-pi"'; do
  f=${loc%%:*}; rest=${loc#*:}; n=${rest%%:*}; v=${rest#*:}
  line=$(sed -n "${n}p" "$f")
  case "$line" in *"$v"*) ;; *) echo "GATE B FAIL: $f:$n mat gia tri giu '$v'"; exit 1;; esac
done
echo 'GATE B: 7 gia tri wire van nguyen'
```

Phân biệt được: đây là cổng giữ GIÁ TRỊ trong code, và nó là con đỏ đầu tiên bắt được một sed dài — chạy trước Gate C vì Gate C chỉ báo "chạm file ngoài danh sách" mà không nói vì sao. Vế `case` khớp LITERAL có dấu nháy kép, không phải chuỗi con: một sed đổi `"oh-my-pi"` thành `"oh-my-pi-ultraworkers"` vẫn chứa `oh-my-pi` nên phép so khớp chuỗi con sẽ bỏ lọt. Gate A vẫn XANH trong cả hai trường hợp, vì tập file không đổi.

**GATE C — W8A KHÔNG LẪN SANG VIỆC CỦA W7**

```bash
BASE=$(cat /tmp/w8a-head-baseline.txt)
git diff --name-only "$BASE"..HEAD | sort > /tmp/w8a-touched.txt
printf '%s\n' \
  'packages/coding-agent/src/cli/gallery-fixtures/segments.ts' \
  'packages/coding-agent/test/otel-service-name-probe.ts' \
  'packages/coding-agent/test/telemetry-export.test.ts' \
  'packages/coding-agent/test/pi-scope-aliases.test.ts' \
  'scripts/rename/keep-list.txt' | sort > /tmp/w8a-expected.txt
diff /tmp/w8a-expected.txt /tmp/w8a-touched.txt || { echo 'GATE C FAIL: W8a cham file ngoai danh sach da duyet — xem lai'; exit 1; }
```

Phân biệt được: W7 đã sửa 14/15 file này ở pass scope. Gate C là thứ bắt được "W8a chạy lại một sed" và "W8a sửa thêm cho một mục không ai duyệt", và nó cũng là bằng chứng W8a không phạm vi của W7.

**GATE D — HAI DÒNG GALLERY**

```bash
test "$(git diff --numstat "$BASE"..HEAD -- packages/coding-agent/src/cli/gallery-fixtures/segments.ts | wc -l)" -eq 1
test "$(git diff --numstat "$BASE"..HEAD -- packages/coding-agent/src/cli/gallery-fixtures/segments.ts | cut -f1)" -eq 2 || { echo 'GATE D FAIL: phai doi DUNG 2 dong'; exit 1; }
test "$(git diff --numstat "$BASE"..HEAD -- packages/coding-agent/src/cli/gallery-fixtures/segments.ts | cut -f2)" -eq 2 || { echo 'GATE D FAIL: phai xoa DUNG 2 dong'; exit 1; }
```

Dùng numstat hai cột, KHÔNG dùng `grep -c "^-"`: dòng header `--- a/...` của git diff cũng khai dấu bằng dấu gạch, đếm nó sẽ ra 3 thay vì 2. Phân biệt được: file này còn 5 lượt scope đã đổi bởi W7. W8a chỉ được tách thêm 2 dòng. Nhiều hơn 2 nghĩa là W8a đã chạy một pass thay chuỗi lần nữa.

**GATE E — KEEP-LIST ĐÃ CÓ 3 HÀNG MỚI**

```bash
for n in N18 N19 N20; do
  grep -q "$n" scripts/rename/keep-list.txt || { echo "GATE E FAIL: thieu hang $n"; exit 1; }
done
awk -F'#' '/N1[89]|N20/ && NF < 2 { print "GATE E FAIL: hang khong co phan # ly do: " $0; exit 1 }' scripts/rename/keep-list.txt
```

Phân biệt được: Gate B giữ được giá trị trong CODE; Gate E giữ được quyết định trong KEEP-LIST, để một sed tương lai không xoá chúng. Hai cổng này soi hai file khác nhau.

**GATE F — TYPECHECK**

```bash
bun run check:ts    # phai exit 0
```

Phân biệt được: file W8a sửa đều nằm trong `packages/coding-agent`, mà `check:types` của package đó chạy trong 25s và nó bắt lỗi type. Không thay thế bằng việc đọc bằng mắt.

**GATE G — BỘ TEST: NOT RUN, ENVIRONMENT BLOCKED**

Không chạy được ở máy này. Ghi vào commit message đúng ba chữ:

```text
test:ts = NOT RUN — environment blocked (pi_natives native addon not built)
```

Gỡ chặn:

```bash
brew install ninja && bun --cwd=packages/natives run build && bun run test:ts
```

TUYỆT ĐỐI không ghi `pass` cho cổng này khi nó chưa chạy. Đây là lý do Gate A–F viết để không cần test: chúng phân biệt được "đã làm" với "test không chạy được" mà không cần chạy một dòng test nào. Nếu CI có runner đã build native addon, chạy `cd packages/coding-agent && bun test test/telemetry-export.test.ts test/pi-scope-aliases.test.ts` ở đó và dán kết quả vào PR.

**GATE H — BẢNG QUYẾT ĐỊNH CỦA W8b (chỉ khi W8b chạy ngay sau)**

```bash
awk -F'\t' '$1=="bare-oh-my-pi"' scripts/rename/disposition.tsv | wc -l   # phai >= 15
```

Phân biệt được: W8b Gate 0 dùng lệnh ghi "15 file" cho `scope=bare-oh-my-pi`, nhưng lệnh đó trả 16 trên HEAD hiện tại. Xem Đính chính #1 — W8b phải loại `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` theo đường dẫn, nếu không Gate 0 của W8b sẽ đỏ vì một hàng thuộc về tài liệu kế hoạch.

**Cổng có thực sự đỏ được không?** Có — `gate_can_fail: true`. Gate 0, A, B, C, D, E, F, H đều phân biệt được "đã làm" với "chưa làm" và mỗi cổng có một đường đỏ riêng. Riêng Gate G thì **không**: nó không chạy được trên máy này, nên nếu ghi `pass` cho nó thì đó là khai sai; nó chỉ ghi được `NOT RUN — environment blocked`.

### Phụ thuộc

**depends_on:**
- `W2`
- `W7` (phụ thuộc CỨNG, không chỉ thứ tự thời gian: Gate C của W7 chụp baseline rồi so sánh sau pass; W8a đổi một literal dạng trần trước thì Gate C đó đỏ và W7 không thể merge, đồng thời W8a cũng không thể chạy)
- `M2` (chỉ cho phần tài liệu ở bước 10)

**blocks:**
- `W8b` — bảng quyết định `scripts/rename/disposition.tsv` phải có ≥ 15 hàng `scope=bare-oh-my-pi` khớp đúng quyết định ở đây.

### Cách sai dễ nhất

1. **Áp cùng một quyết định cho cả 15 file.** (a) "Giữ tất cả" đóng băng luôn hai dòng gallery, và gallery là lệnh CLI đã phát hành nên thương hiệu cũ sẽ xuất hiện trong ảnh chụp màn hình của lệnh đó — lỗi thấy được, nhưng chỉ thấy được sau khi ship. (b) "Đổi tất cả" phá ba giá trị wire của bên thứ ba. Ba cái (b) là N18/N19/N20 — chúng KHÔNG có mục nào trong bảng N1–N17 của plan, tức là nếu kỹ sư chỉ đọc keep-list mà không đọc phần này, họ sẽ không biết phải giữ chúng và sẽ đổi. Đó là lý do ba hàng keep-list ở bước 7 là phần quan trọng nhất của W8a, nặng hơn cả hai dòng rename.
2. **Sai do thứ tự.** W8a chạy sau W7 trên 14/15 file mà W7 đã sửa. Diff của W8a khi review sẽ trộn lẫn thay đổi của hai wave nếu ai đó review bằng `git diff main..HEAD` thay vì `git diff $(cat /tmp/w8a-head-baseline.txt)..HEAD`. Gate C chống đúng cái này bằng cách đòi so với baseline, không so với `main`.
3. **Tin Gate B rồi tưởng xong, không thêm probe telemetry.** Ba giá trị wire còn lại đã có test sẵn nên dễ tưởng đã đủ phủ — nhưng `SERVICE_NAME` không được export và không test nào chạm tới nó. Đó là lỗ hổng duy nhất, và nó chỉ lộ ra khi telemetry đã bật trên máy người dùng thật.
4. **Sửa nhầm `packages/coding-agent/test/otel-resource-probe.ts` thay vì tạo probe anh em.** Probe đó đặt `OTEL_SERVICE_NAME="svc-probe"` và tồn tại chính để chứng minh biến môi trường thắng giá trị fallback; sửa nó để khẳng định giá trị fallback là phá hợp đồng precedence, và test sẽ xanh trong khi không còn bảo vệ đúng thứ gì.

### Cần người quyết

- Ba hàng N18/N19/N20 có được một người duyệt riêng không, hay chấp nhận theo tiền lệ đã đặt ở W7? Đây là câu hỏi có thật về quy trình, không phải về kỹ thuật: §2.3 nói bảng phải do người không viết nó duyệt, và W8a thêm 3 hàng mới thì người duyệt W7 chưa chắc là người duyệt W8a.
- `KEY_NAME` ở `packages/ai/src/registry/oauth/zai.ts:25` có thật sự cần giữ, hay Z.AI coi nó là nhãn tuỳ ý và chấp nhận tên mới? Comment tại `:24` cho thấy ý định thiết kế là "khoá của riêng OMP, không đụng zcode-api-key" — nếu Z.AI chỉ cần một nhãn phân biệt thì đổi tên vẫn an toàn về mặt chức năng, nhưng nó sẽ tạo ra một khoá thứ hai trong tài khoản của người dùng thay vì tái dùng khoá cũ. Không có bằng chứng nào trong repo trả lời được; đây là câu hỏi cho người đã từng chạy `mintZaiApiKey`.
- `EXA_MCP_SOURCE` ở `packages/coding-agent/src/web/search/providers/exa.ts:26` có được Exa dùng cho billing/attribution thật không, hay chỉ là header chẩn đoán? Nếu chỉ chẩn đoán thì đổi tên được và N19 không cần. Nhưng nó đúng cùng loại với N9 (`APP_URL`/`USER_AGENT` — thứ plan đã chốt "giữ nếu chưa có domain mới"), nên mặc định giữ là an toàn.
- Phần tài liệu ở bước 10 có thuộc phạm vi M5 không, hay nên chuyển sang W11 (viết tài liệu)? Cả hai file đó không chứa literal dạng trần, nên việc duy nhất còn lại là sửa câu chữ — đó là việc nhỏ và nó phụ thuộc M2 đã merge, trong khi 13 quyết định còn lại thì không.
- Lệnh nghiệm thu của plan trỏ tới `packages/coding-agent/test/extension-scope-canonicalization.test.ts` không tồn tại. Ở đây đã dùng `packages/coding-agent/test/pi-scope-aliases.test.ts` theo đặc tả W2. Nếu người thực hiện W2 thực tế đặt tên khác, cả hai phải khớp trước khi W8a chạy.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| W8a xử lý "15 file có literal dạng trần `oh-my-pi`", và lệnh mà W8b Gate 0 dùng để sinh danh sách là `git grep -lE '"oh-my-pi"' -- .` với kỳ vọng 15 file. | misleading | Con số 15 chỉ đúng sau khi loại chính file kế hoạch. Lệnh ghi trong Gate 0 của W8b trả 16 trên HEAD `84cbac9`, và file thứ 16 là `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — chính tài liệu kế hoạch, nó chứa 20 lượt dạng trần trong bảng N1–N17 và các đoạn trích dẫ mà W8/W8b nên giữ nguyên. Hai fix: (1) mọi lệnh đếm ở M5 phải có `:!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`; (2) con số đúng cho W8a là 15 file / 23 lượt, và 15 đó KHÔNG phải 7 nguồn + 5 test + 1 doc như plan ngầm ý — nó là 7 nguồn + 7 test + 1 doc. Đây là mẫu số của W8b Gate 0 sẽ đỏ nếu không loại file kế hoạch. Bằng chứng: `git grep -lE '"oh-my-pi"' -- . \| wc -l` = 16; `… ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \| wc -l` = 15; `git grep -oE '"oh-my-pi"' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \| wc -l` = 23. |
| Danh sách 11 file còn lại gồm "4 file .ts dưới `packages/ai` + `packages/coding-agent/src/web/search/providers/exa.ts`, 5 file test, và `docs/provider-quirks.md:1`". | wrong | Hai nhận sai, tổng thì đúng. (a) KHÔNG phải 4 file .ts dưới `packages/ai` — chỉ có ĐÚNG MỘT file dưới `packages/ai` là `packages/ai/src/registry/oauth/zai.ts`; 6 file nguồn còn lại đều nằm dưới `packages/coding-agent`. (b) KHÔNG phải 5 file test — có 7 file test. Phân bố thật: 7 nguồn + 7 test + 1 doc = 15. File thứ 8 nguồn mà plan không liệt kê trong danh sách 11 đó là `packages/coding-agent/src/mcp/oauth-flow.ts`, nó chỉ được nhắc trong văn xuôi chứ chưa bao giờ được đưa vào danh sách đầy đủ. (c) `docs/provider-quirks.md` không có hit ở dòng 1 — dòng 1 là tiêu đề `# Provider quirks: special casings, streams, auth, and catalog handling`. Hit thật ở DÒNG 1706 trong file 1750 dòng. |
| `packages/coding-agent/src/cli/gallery-fixtures/segments.ts` — 2 lượt trong "fixture transcript đã ghi". Đây là phán đoán: coi như LỊCH SỬ, không coi là danh tính — trừ khi demo gallery được định nghĩa là để trình diễn thương hiệu mới, thì phải sửa. | wrong | Không có transcript nào ở file này và lập luận "lịch sử" không áp dụng. `segments.ts` là BỘ KHUNG HIỂN THỊ TỔNG HỢP: `createGallerySegmentContext()` trả về một `SegmentContext` nhận dính, và comment tại dòng 23 ghi rõ "Deterministic full context for isolated status-segment previews and tests". Hai giá trị `relativeRepoRoot` (dòng 33) và `projectName` (dòng 164) là chuỗi hiển thị được render ra stdout. `gallery` là lệnh CLI ĐÃ ĐĂNG KÝ và PHÁT HÀNH — `packages/coding-agent/src/cli-commands.ts:121-126` khai báo `name: "gallery"` trỏ sang `commands/gallery`, và `packages/coding-agent/src/cli/gallery-cli.ts:1-9` mô tả "`omp gallery` — render every built-in tool's renderer across its lifecycle ... and prints the rendered output to stdout", kèm `captureGalleryScreenshots`. Nên điều kiện "trừ khi demo gallery được định nghĩa là để trình diễn thương hiệu mới" đã được trả lời RÕ: có, chính là. DISPOSITION: đổi cả hai sang `ultraworkers`. Đây là thay đổi nguồn duy nhất của cả W8a — 2 dòng trong 1 file. |
| "11 cái còn lại … phần lớn là tên host HTTP hoặc kỳ vọng test, không phải danh tính — nhưng phải xác nhận từng file, không giả định". Và bốn mục "quan trọng nhất" đã được xử lý (N7 telemetry, N5 acp, gallery, N8 alias). | gap-in-plan | BA file nguồn trong nhóm "còn lại" là giá trị wire gửi cho BÊN THỨ BA, và KHÔNG có mục nào trong bảng N1–N17 nào phủ chúng. Chi tiết: (1) `packages/ai/src/registry/oauth/zai.ts:25` `KEY_NAME` là `name` gửi trong payload `businessLogin`/key-mint của Z.AI — comment tại dòng 24 nói rõ ngữ nghĩa: "OMP's own key name so sign-in never mutates ZCode's `zcode-api-key`", tức là danh tính SỞ HỮU khoá, và đổi tên nghĩa là tạo một khoá mới trong tài khoản Z.AI của người dùng thay vì tái dùng khoá cũ (cùng loại với N3). (2) `packages/coding-agent/src/web/search/providers/exa.ts:26` `EXA_MCP_SOURCE` được gửi ở header `x-exa-source` tại dòng 369 — attribution phía Exa, cùng loại với N9. (3) `packages/coding-agent/src/mcp/oauth-flow.ts:629` `client_name` là payload đăng ký client ĐỘNG RFC 7591 gửi tới máy chủ OAuth, và docblock ngay trên (dòng 612-620) nêu nếu Figma từ chối client ngoài danh sách — tức provider dùng payload này để lập allowlist. Không cái nào là "tên host HTTP" (cả ba đều là giá trị, không phải hostname). TẤT CẢ BA phải giữ và phải được thêm vào keep-list — nếu không, một kỹ sư đọc keep-list sẽ không biết phải giữ và sẽ đổi chúng. Bằng chứng: `grep -n 'KEY_NAME' packages/ai/src/registry/oauth/zai.ts` → 25 (khai báo), 167 (so sánh khoá hiện có), 171 (`postJson(keysUrl, { name: KEY_NAME })`); `grep -rn 'EXA_MCP_SOURCE' packages/coding-agent/src/` → 26 và 369; `sed -n '610,640p' packages/coding-agent/src/mcp/oauth-flow.ts` → `registrationBody.client_name` và docblock về Figma allowlist. |
| Test cần viết: "Telemetry: khẳng định giá trị thuộc tính resource được export đúng bằng giá trị đã quyết định, và ghim nó bằng một test". File test mới: `packages/coding-agent/test/telemetry-export-otlp.test.ts`. | partly-wrong | `SERVICE_NAME` KHÔNG được export (`grep -n 'export' packages/coding-agent/src/telemetry-export-otlp.ts` không có dòng nào export nó), và có MỘT seam sẵn đúng dụng cho việc này: `packages/coding-agent/test/otel-resource-probe.ts`, chạy nhịp bởi `packages/coding-agent/test/telemetry-export.test.ts:118-124`. Nhưng probe đó đặt `OTEL_SERVICE_NAME = "svc-probe"` (dòng 37) và comment dòng 59 nói "OTEL_SERVICE_NAME must win over the service.name in OTEL_RESOURCE_ATTRIBUTES" — tức nó TỒN TẠI để chứng minh biến môi trường THẮNG giá trị fallback. Do đó probe hiện có KHÔNG BAO GIỜ quan sát được giá trị fallback, và sửa nó để khẳng định `"oh-my-pi"` sẽ phá đúng hợp đồng precedence mà nó sinh ra. Fix: tạo probe ANH EM `packages/coding-agent/test/otel-service-name-probe.ts` bỏ `OTEL_SERVICE_NAME` và `OTEL_RESOURCE_ATTRIBUTES`, và thêm nó vào mảng `probes` hiện có — không cần hạ tầng mới, không cần sửa probe cũ. Tên file trong plan (`telemetry-export-otlp.test.ts`) nên đổi thành tên probe để trùng với quy ước sibling của file hiện có. Bằng chứng: `ls packages/coding-agent/test/telemetry-export-otlp.test.ts` → No such file; `sed -n '118,145p' packages/coding-agent/test/telemetry-export.test.ts` → mảng `probes` 3 phần tử và `expect(Object.fromEntries(results))`. |
| Lệnh nghiệm thu của W8a: `bun run check && (cd packages/coding-agent && bun test test/extension-scope-canonicalization.test.ts test/telemetry-export-otlp.test.ts)`, và "Phần cần viết: phân giải extension, trong file test của W2". | wrong | `packages/coding-agent/test/extension-scope-canonicalization.test.ts` KHÔNG TỒN TẠI — đặc tả W2 của chính milestone này đặt tên file là `packages/coding-agent/test/pi-scope-aliases.test.ts`. Lệnh nghiệm thu đó trỏ tới một file không ai sẽ tạo, nên nó đỏ mà không liên quan gì đến việc của kỹ sư. Về `bun run check`: nó gọi thêm `check:rs` cần cargo, chưa xác minh trong W8a; phần chạy được và chạm tới file W8a sửa là `bun run check:ts`, đã đo exit 0 tại HEAD. Về `bun test`: bị chặn bởi native addon chưa build trên máy này, nên lệnh đó phân biệt được "đã làm" với "test không chạy được" — đây là lý do Gate A–F viết để không cần chạy một dòng test nào, và Gate G ghi rõ NOT RUN. Bằng chứng: `ls -la packages/coding-agent/test/extension-scope-canonicalization.test.ts` → No such file; `bun run check:ts` exit 0, oxlint + oxfmt trên 5445 file, 16/16 package `check:types` Done. |
| "W7 đẩy 585 file .ts có token `omp` sang 'làm theo từng file'" và W8a là 15 file dạng trần; ranh giới của W8a là phần literal dạng trần mà sed scope của W7 KHÔNG chạm tới. | partly-wrong | Ranh giới ĐÚNG ở CẤP LÍNH, SAI ở CẤP FILE. Lệnh scope của W7 là `perl -pi -e 's{\@oh-my-pi/}{@ultraworkers/}g'` — nó không thể nào chứa được một literal dùng trong, nên 23 lượt này đều sống sau. NHƯNG 14/15 file trong bảng W8a CŨNG chứa dạng có dấu `/`: chỉ có `packages/ai/src/registry/oauth/zai.ts` có bằng 0 lượt scope; 14 file còn lại có từ 1 đến 16 lượt (acp-lazy-startup 16, acp-initialize-conformance 10, acp-agent 8, legacy-pi-compat 7, cursor-exec-modern và zai-oauth 6 mỗi file, web-search-exa 6, segments 5, oauth-flow 5, telemetry 4, git-hosting 2, exa 2, oauth-flow.test 2, provider-quirks 1). Nghĩa là W7 ĐÃ sửa 14/15 file của W8a, và chỉ một file duy nhất là W8a sở hữu toàn bộ. Hai hệ quả phải nói rõ: (1) Gate C của W7 (so sánh tập dạng trần) là thứ bảo vệ W8a — W8a mà chạy trước sẽ làm nó đỏ; (2) khi review W8a, phải so sánh với baseline W8a chứ KHÔNG phải với `main`, nếu không sẽ thấy 14 file có hơn trăm hàng thay đổi của W7 trộn vào diff của W8a. Chỉ có một file (`zai.ts`) mà W8a sửa mà W7 không đụng. Bằng chứng: vòng `for f in <15 file>; do grep -c -F '@oh-my-pi/' $f; done` cho 0,1,6,6,5,7,5,8,4,2,10,16,2,2,6 theo thứ tự bảng; `git grep -l '@oh-my-pi/' -- . \| wc -l` = 4149 với 17697 lượt. |
| W8a phụ thuộc "W2, và M2 đã merge cho phần tài liệu". | gap-in-plan | Danh sách phụ thuộc thiếu W7, và đây là phụ thuộc CỨNG chứ không chỉ thứ tự thời gian. Gate C của W7 chụp baseline dạng trần rồi so sánh sau pass; nếu W8a đổi một literal dạng trần trước, Gate C đó và W7 không thể merge, đồng thời W8a cũng không thể chạy. Các file tài liệu mà plan giao cho W8a (`docs/extension-loading.md:231`, `docs/porting-from-pi-mono.md:46-51`) cũng không có literal dạng trần — `grep -cE '"oh-my-pi"'` trên cả hai đều bằng 0, chúng chỉ có dạng có dấu `/` thuộc W7. Nghĩa là phần tài liệu của W8a là sửa VĂN XUÔI sau W7, không phải thay chuỗi; chạy một pass thay chuỗi ở bước 10 sẽ không có gì để thay. Bằng chứng: `grep -cE '"oh-my-pi"' docs/extension-loading.md docs/porting-from-pi-mono.md` → 0 và 0; `awk 'NR>=228 && NR<=232'` → dòng 231 là bullet về `onLoad` hook với `@oh-my-pi/pi-catalog/models` và `@mariozechner/*`; `awk 'NR>=44 && NR<=52' docs/porting-from-pi-mono.md` → dòng 46-50 là bảng 5 map `@mariozechner/pi-*` → `@oh-my-pi/pi-*`. |

## Cần người xác nhận

Bốn chỗ đặc tả tự mâu thuẫn với chính nó. Không tự sửa ở trên — cần người quyết trước khi gõ.

1. **Marker của probe mâu thuẫn với quyết định N7.** Bước 8 nói phép kiểm trong probe mới là `has("ultraworkers-fallback-marker")` "đúng tên bạn đã chốt ở hàng N7", nhưng hàng N7 trong bảng quyết định là `keep-wire` — `SERVICE_NAME` giữ nguyên `"oh-my-pi"`, và khối "hình dạng biến theo quy ước W1" cũng viết `const SERVICE_NAME = "ultraworkers" hoặc giữ "oh-my-pi"` — một nhánh mơ hồ. Nếu N7 giữ `"oh-my-pi"` thì marker `ultraworkers-fallback-marker` không bao giờ khớp, và probe sẽ in `PROBE: NO_EXPORT` vĩnh viễn. Cần chốt: giá trị thật của `SERVICE_NAME` sau W8a, rồi suy ra marker tương ứng.

2. **Số file pin test tự mâu thuẫn trong `test_contract`.** Cùng một đoạn: "Bốn test file hiện có đã là sẵn pin cho 3 giá trị wire" rồi vài dòng sau "KHÔNG thêm ca nào vào 5 file đó". Bảng quyết định liệt kê 5 file pin, và chúng phủ 4 giá trị wire chứ không phải 3 (N18 qua `packages/ai/test/zai-oauth.test.ts`, N5 qua hai file `acp-initialize-conformance` và `acp-lazy-startup`, N19 qua `web-search-exa`, N20 qua `oauth-flow.test.ts`) — trong khi `test_contract` chỉ kể "3 giá trị wire còn lại (N5, N19, N20)", bỏ sót N18. Tương tự, phần tóm đầu file và `user_visible_effect` nói "7 giá trị wire giữ nguyên", nhưng bảng chỉ đánh dấu 6 hàng `keep-wire` (N7, N5, N8, N18, N19, N20); hàng thứ 7 là `keep-doc` cho `docs/provider-quirks.md`, tức là tài liệu chứ không phải giá trị wire — Gate B cũng kiểm 7 vị trí nhưng một vị trí là file doc.

3. **Bước 3 đếm bảng quyết định khác với chính bảng đó.** Bước 3 nói "Bảng gồm 15 hàng: 8 dòng literal (7 file nguồn + 1 file doc) và 7 dòng test". Bảng trong `Hình dạng code` thật sự có 16 hàng (9 hàng nguồn/doc + 7 hàng test), vì hai hàng `RENAME` nằm cùng một file là hai hàng riêng. Con số 15 khớp với SỐ FILE, không khớp với số hàng. Cần chốt bước 3 nói "15 file" hay "16 hàng".

4. **`packages/coding-agent/test/pi-scope-aliases.test.ts` bị Gate C đòi chạm tới nhưng không bước nào bảo sửa.** Gate C đòi danh sách file bị chạm đúng 5 mục, trong đó có file này; nhưng nó không có trong `files_touched`, không có bước nào trong 12 bước nhắc tới, và hai file doc ở bước 10 lại không có trong danh sách của Gate C. Cần chốt: thêm một bước sửa `pi-scope-aliases.test.ts`, hay sửa danh sách Gate C. Gate C sẽ đỏ nếu cứ làm theo đúng 12 bước hiện tại.
