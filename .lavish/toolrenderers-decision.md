# BẢN QUYẾT ĐỊNH — mâu thuẫn `toolRenderers` giữa M2 WI-4 và M3 B1

## 1. Đây có phải mâu thuẫn thật không

**Có, và nó không giải được bằng thứ tự merge.** Cả hai thứ tự đều đỏ: merge WI-4 trước thì fixture của B1 ném `TypeError` lúc load (ESM strict-mode, object đã `Object.freeze`) và type-check đỏ `TS2542`; merge B1 trước thì `Readonly<Record<...>>` làm type-check của B1 đỏ ngay, và gate (b) của WI-4 (grep writer) thấy writer. Không tồn tự thứ tự nào để cả hai xanh. Mâu thuẫn là **một chiều**: nạn nhân duy nhất là B1; WI-4 không bao giờ là nạn nhân.

## 2. Câu hỏi gốc, viết đúng như nó phải được hỏi

> **Plugin có được phép ghi đè (`override`) renderer của một built-in tool mà plugin đó không sở hữu hay không?**

Câu này trả lời được có/không. Nếu **có** → WI-4 phải có đường đăng ký tường minh (phương án ii). Nếu **không** → WI-4 đóng băng là đủ, B1 phải viết lại để không cưỡi tên built-in (phương án i). Câu hỏi "nên làm gì" không quyết định hậu quả — chỉ câu hỏi sản phẩm này mới quyết định.

## 3. Bằng chứng quyết định

**3.1. Registry hiện là object phẳng, không đóng băng, không `Readonly`.**
`packages/tui/src/tools/index.ts:35` = `export const toolRenderers: Record<string, ToolRenderer> = {`. `grep -n 'Object.freeze\|Readonly' packages/tui/src/tools/index.ts` → exit 1 (không có cả hai). WI-4 chưa hạ cánh.

**3.2. Không có writer nào trong repo hôm nay.**
`git grep -nE 'toolRenderers\[[^]]*\] *=|toolRenderers\.[A-Za-z_$]+ *=|delete toolRenderers|Object\.assign\(toolRenderers|Reflect\.(set|defineProperty)\(toolRenderers' -- packages` → exit 1, **0 hit**. 13 tham chiếu trên 5 file, tất cả là lượt đọc. Đóng băng không phá consumer hiện hữu nào.

**3.3. B1 gán trực tiếp vào registry — đúng thứ WI-4 sẽ chặn.**
`MILESTONE_3_EXECUTION_PLAN.md:1697` (bước 5): "gán `toolRenderers.grep` một renderer hiện thực cả `renderCall` lẫn `renderResult`". Fixture nằm ở `packages/coding-agent/test/fixtures/tool-renderer-override/index.ts` — trong scope type-check của `packages/coding-agent/tsconfig.json` (`include: ["src","test","scripts"]`). Dưới `Readonly<Record<string, ToolRenderer>>`, dòng gán đó tạo `TS2542: Index signature in type 'Readonly<...>' only permits reading`. Đã tái lập bằng `tsc` của repo trên /tmp.

**3.4. Gate (b) của WI-4 cũng đỏ — độc lập với type-check.**
`MILESTONE_2_EXECUTION_PLAN.md:2782` dùng regex `toolRenderers\[[^]]*\] *=|toolRenderers\.[A-Za-z_$]+ *=|…`. Chạy đúng regex đó trên 3 dòng fixture mô phỏng → trúng `toolRenderers.grep = myGrepRenderer;` (exit 0). Trên cây hiện tại cùng regex → exit 1 (zero hit), vì fixture chưa tồn tại. Nghĩa là có **hai** cổng đỏ độc lập: type-level và grep-level.

**3.5. `registerToolRenderer` không có chủ nhận.**
`grep -c registerToolRenderer MILESTONE_4_EXECUTION_PLAN.md MILESTONE_5_EXECUTION_PLAN.md` → **0 và 0**. M3:258 giao "nợ bàn giao M4/M5 #4" nhưng không milestone nào nhận. Phương án (ii) trong M3:674 ghi "đường đăng ký tường minh **do WI-9 sở hữu**" — nhưng WI-9 (M2:5211-5640) không hề nhắc `toolRenderers` (0 hit trong toàn mục). 11 bucket của `Extension` interface (`types.ts:1827-1842`) không có bucket nào là tool-renderer.

**3.6. Package được publish — importer ngoài repo là khách hàng thật.**
`packages/tui/package.json`: `private` là `undefined`, `files: ["src","README.md","CHANGELOG.md"]`, version 18.4.0. `scripts/ci-release-publish.ts:171` liệu `{ dir: "packages/tui", kind: "typescript" }`. Exports map `"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }` (package.json:94-97) mở cho bất kỳ specifier nào. Trust gate hôm nay: `isProjectTrusted: () => true` (`runner.ts:1293`, `agent-session.ts:7552`).

## 4. Bảng phương án

| Phương án | Đổi ở file nào | Milestone nào sở hữu | Test nào chứng minh | Cái giá |
|---|---|---|---|---|
| **(i) Đóng băng + B1 viết lại** | `packages/tui/src/tools/index.ts:35,70` (Object.freeze + Readonly); B1 fixture đổi sang dùng `ToolDefinition.renderCall/renderResult` thay vì gán trực tiếp | M2 (WI-4) + M3 (B1) | Gate (a) WI-4: `bun run --cwd packages/coding-agent check:types` xanh; gate (b) WI-4: grep writer = 0 hit; B1 test xanh | B1 mất khả năng pin "registry writable" — nhưng không consumer nào trong repo cần nó. Plugin ngoài repo đang dựa vào mutation sẽ vỡ (không có dữ liệu để đánh giá). |
| **(ii) Đóng băng + đường đăng ký tường minh** | `packages/tui/src/tools/index.ts` (freeze + Readonly); thêm `registerToolRenderer` vào `Extension` interface (`types.ts:1827-1842`) + bucket thứ 12; wiring trong `tool-execution.ts` để ưu tiên renderer đăng ký; unload quét trong WI-9 | M2 (WI-4) + M3 (B1) + **milestone mới** cho đường đăng ký (WI-9 không nhận — 0 hit) | Cần test mới cho đường đăng ký; B1 test xanh vì gọi `registerToolRenderer` thay vì gán trực tiếp | Phải dựng bucket + registration path + wiring unload từ đầu. WI-9 hiện có 2 bucket renderer (`assistantThinkingRenderers`, `messageRenderers`) làm khuôn, nhưng cả hai đều last-wins im lặng — không có cơ chế chẩn đoán trùng. Chi phí lớn hơn (i) đáng kể. |
| **(iii) Giữ nguyên writable** | Không đổi `tools/index.ts`; WI-4 không làm | Không milestone nào | Không có gate nào đỏ | Backdoor mở cho bất kỳ extension nào (kể cả không tin cậy) mutate registry toàn cục. Không có consumer nào trong repo cần quyền ghi hôm nay — nhưng "không ai cần hôm nay" không nói lên "tương lai không cần". |

## 5. Không có option nào sạch

Cả (i) lẫn (ii) đều đúng về mặt kỹ thuật. Khác biệt nằm ở câu trả lời cho câu hỏi sản phẩm ở mục 2 — và câu hỏi đó không có câu trả lời trong bất kỳ tài liệu nào trong repo.

**Cách hòa giải tối thiểu nếu owner chưa sẵn sàng chốt câu hỏi sản phẩm:**

Tách WI-4 thành hai phần:
- **Phầa A** (có thể merge ngay): thêm `Readonly<Record<string, ToolRenderer>>` vào type annotation **mà không** thêm `Object.freeze`. Đóng được tầng type (TS2542) nhưng để runtime vẫn ghi được. B1 vẫn xanh ở runtime, nhưng type-check của B1 sẽ đỏ — nên B1 phải thêm `@ts-expect-error` hoặc viết lại. Đây là trạng thái **không** an toàn vĩnh viễn nhưng cho phép merge WI-4 mà không phá B1 hoàn toàn.
- **Phần B** (chờ quyết định sản phẩm): thêm `Object.freeze` vào runtime. Chỉ làm khi owner đã chốt câu hỏi ở mục 2.

Cách này không phải là "thỏa hiệp an toàn" — nó là cách để **trì hoãn** quyết định sản phẩm mà không chặn milestone. Nhưng nó để lại một trạng thái trung gian mà type-check đỏ, nên chỉ nên dùng nếu owner chấp nhận điều đó.

## 6. Điều CHƯA biết

**Chưa đo được (không phải "đo rồi kết quả là vậy"):**

1. **Có plugin ngoài repo nào đang dựa vào mutation `toolRenderers` không?** Repo không có dữ liệu hệ sinh thái plugin. Nếu có, phương án (i) sẽ là breaking change với họ. Không có cách nào suy ra câu trả lời từ code.
2. **Trong binary đã compile, extension resolve `@oh-my-pi/pi-tui/tools` về đâu?** Đo được ở dev/source-link (workspace symlink). Ở binary, module của host nằm trong `/$bunfs/` qua `bundledModuleVirtualSpecifier`. Bảng override chỉ khoá package root — không subpath nào bị khoá. Nhưng **không quan sát được** binary thực tế, nên không xác nhận được extension có nhận đúng instance của host hay một instance thứ hai.
3. **B1 thực sự đỏ lúc `bun test` chạy như thế nào?** Máy này thiếu `pi_natives_win32-x64.node` nên `bun test` không chạy được. Mọi kết luận về B1 là từ type-level và grep-level, cộng với đọc mã nguồn — không phải quan sát runtime.

**Đo rồi, kết quả là vậy:**

- Registry hiện không đóng băng, không `Readonly` (grep exit 1).
- 0 writer trong repo (grep exit 1 trên 13 tham chiếu).
- `registerToolRenderer` = 0 hit trong M4 và M5.
- WI-9 không nhắc `toolRenderers` (0 hit trong M2:5211-5640).
- `Object.freeze` trên object phẳng trong ESM strict-mode ném `TypeError` khi gán (đã quan sát trên Bun).
- `Readonly<Record<string, ToolRenderer>>` biến phép gán thành `TS2542` (đã tái lập bằng `tsc` của repo).
- Gate (b) của WI-4 (grep writer) trúng dòng fixture của B1 (đã chạy regex trên fixture mô phỏng).