## 5. `durable` — có `documents.ts`, đóng lỗ hổng lớn nhất của M1

**Vị trí trong thứ tự migrate:** thứ 5 trong 7. Nó đứng sau `chord`, `protocol`, `server`, `client` vì 52 import trỏ vào `@oh-my-pi/chord` mà `chord` chưa tồn tại ở omp — thiếu 14 symbol là `Context`, `Draft`, `JsonValue`, `Op`, `Change`, `Prepared`, `Tracker`, `copyJson`, `track`, `apply`, `applyImmutableBatches`, `awaitWithContext`, `withoutAbortSignal`, `BACKGROUND_CONTEXT` thì `durable` không biên dịch được. **Quy mô:** 63 file / 807,033 byte; 9,024 dòng `src`, trong đó 1,520 dòng là bộ kiểm chứng dùng chung cho 3 back-end storage, cộng 114 KB đặc tả normative trong `docs/pico-v5.md`. Đổi 78 lần `@earendil-works/` → `@oh-my-pi/` và giải quyết 11 va chạm với code omp đã có trước đó khi mới chạy được. **Cổng đỏ được:** có — `gate_can_fail: true`.

Lý do là CHÉP chứ không phải làm lại, gói trong một dòng: `pi-ref` là 1 commit squash (`git log --oneline | wc -l = 1`, 1,935 file), nên không có diff nào để "cập nhật" — chỉ có copy. Và `durable` không phải bản sao cũ của omp: `pi-ref packages/agent/` có 117 file `src`, omp `packages/agent/` chỉ có 50, và chỉ 5 tên file trùng nhau (đo theo ĐƯỜNG DẪN TƯƠNG ĐỐI trong `src/`; nếu chỉ so tên file thì 12) — `agent-loop.ts` 26KB (pi) vs 148KB (omp), `agent.ts` 19KB vs 74KB, `types.ts` 19KB vs 51KB. `durable` là sực tách ra TÍCH LŨY TRONG PI sau khi omp đã phát triển tiếp: ba nơi gộp 3 thứ, tổng 20KB source. LƯU Ý: ở HEAD d6af72e KHÔNG package nào ngoài `durable` import nó — `git grep -l pi-durable d6af72e` chỉ ra README.md, package-lock.json, tsconfig.json và `scripts/*` ở root. `durable` là package CHƯA ĐƯỢC TIÊU THỤ, không phải runtime đã kiểm chứng; bằng chứng duy nhất là 23 file test của chính nó. Vì vậy càng phải giữ nguyên bộ test khi chép.

**Về `documents.ts`** — `packages/durable/src/documents.ts` (207 dòng, 7,888 byte) là nửa document mà M1 gọi là điểm không có bằng chứng duy nhất trong milestone. Đọc kỹ thì KHÔNG phải một phần document. Nó là LỚP PHẢI — nơi đọc các Định nghĩa (definitions) thành địa chỉ lưu (address) và kiểm tra chúng (validation). Hạ tầng thật sự — Session, Transaction, và cả 3 storage back-end — đều gọi qua nó. Ba khả năng cụ thể:

1. **PHÂN GIẢI ĐA NĂNG (từ 2 overload thành 1).** `defineDoc` và `defineDocFamily` có 4 overload mới: scope `'session'`, scope `'conversation'` + history `'latest'`, scope `'conversation'` + history `'rewindable'`, scope `'task'`. Kiểu trả về khác nhau (`SessionDocToken` / `ConversationDocToken` / `RewindableConversationDocToken` / `TaskDocToken`). Nghe đổi là `tx.doc(MyToken)` sẽ KHÔNG bị chạy khi token và bản ghi đã lưu lệch scope — đó là định nghĩa tại thời gian biên dịch, không phải kiểm tra runtime.
2. **ĐỊA CHỈ LUÔN ỔN ĐỊNH.** `resolveAddress` biến danh sách tham số thành một `DocumentAddress` (kind + scope + key), rồi `addressId` biến nó thành chuỗi JSON định dạng `[[kind, scopeKind, owner, key]]` làm KEY của `Map`. Một tài liệu tại MỘT địa chỉ logic nào đó có ĐÚNG MỘT thế hệ chuỗi, nên được trả về nhanh, và MỘT địa chỉ có thể BỊ TÁI TẠI nhiều lần.
3. **MIGRATION CÓ CỔNG.** `checkRecordVersion` ném nếu bản ghi mới hơn definition, và ném thêm nếu bản ghi CŨ hơn mà definition không có `migrate`. `materializeDocument` chạy `migrate(value, fromVersion)` rồi copy lại.

Bằng chứng thì có: nguồn có 3 test nên trực tiếp vào nó — `test/session-documents.test.ts` (27,086 byte, 2 import) phủ 5 nhóm hợp đồng; `test/session-checkpoints-migrations.test.ts` (24,698 byte) phủ `migrate` + checkpoint; `test/session-forks.test.ts` (26,608 byte) phủ fork + asOf; và `src/testing/storage-conformance.ts` (1,520 dòng) dùng chung cho 3 backend. 3 file test đó là 78,392 byte; cộng `src/testing/storage-conformance.ts` (54,178) thành 132,570 byte test cho 7,888 byte code — tỉ lệ ~17:1. Phần CHƯA có trong repo này là lớp trên: Scheduler (`docs/pico-v5.md` mục 5.4), Submissions và Inbox (mục 6), Hooks + bảng Tools (mục 7), và các Built-in tasks (mục 8). Nói rõ: `durable` = HẠ TẦNG ĐƯỢC XÁC NHẬN, còn hệ thống task đầy đủ thì chưa.

### File cần chép — bảng: path | bytes | hành động (chép nguyên văn / chép rồi sửa / bỏ) | dòng cần sửa sau khi chép

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `package.json` | 2,475 | chép rồi sửa | Viết lại: tên → `@oh-my-pi/pi-durable`; bỏ `'source'` condition và `'dist'` (omp xuất `src/index.ts` trực tiếp); bỏ devDeps `shx`+`vitest`; thêm 2 dep `@oh-my-pi/chord` + `@oh-my-pi/pi-ai`; thêm `'check:types'` script; đổi `'repository.url'` sang `github.com/can1357/oh-my-pi`; đổi `'build'` → KHÔNG có (không `dist`). |
| `tsconfig.build.json` | 339 | bỏ | Không cần: omp không biên dịch `dist`, tsconfig workspace lo. Xem `steps[]` bước 1. |
| `vitest.config.ts` | 604 | bỏ | Xoá: omp dùng `bun:test`. Alias chuyển sang tsconfig paths + package.json exports. |
| `vitest.benchmark.config.ts` | 285 | bỏ | Xoá: bench chuyển sang `packages/durable/bench/*.bench.ts` theo convention omp. |
| `README.md` | 4,404 | chép rồi sửa | Đổi 11 lần `@earendil-works/` → `@oh-my-pi/`; bỏ đoạn `'npm run bench:storage'`; thêm mục CHANGELOG/LICENSE pháp lý; bỏ `'vitest/jest'` ví dụ sang `bun:test`. |
| `CHANGELOG.md` | 1,387 | chép rồi sửa | Giữ lại, thêm mục `'### Added'` dưới `## [Unreleased]` theo convention omp. |
| `src/index.ts` | 1,240 | chép rồi sửa | Đổi thành star re-export theo AGENTS.md (hiện là named re-export 62 dòng). Giữ nguyên danh sách export. |
| `src/types.ts` | 27,019 | chép rồi sửa | 3 dòng scope: L1,L2 `@earendil-works/chord` → `@oh-my-pi/chord`; L3 `@earendil-works/pi-ai` → `@oh-my-pi/pi-ai`. Ngoài ra dùng nguyên. |
| `src/documents.ts` | 7,888 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/delta) → `@oh-my-pi/chord`. Ngoài ra nguyên văn. |
| `src/errors.ts` | 555 | chép nguyên văn | Không có import, không có scope. |
| `src/ids.ts` | 377 | chép nguyên văn | Chỉ import type từ `./types.ts`. |
| `src/session/session.ts` | 10,105 | chép rồi sửa | 3 dòng scope (L1-2 chord, L2 chord/context, L3 chord/delta). Dùng ES `#private` có sẵn. |
| `src/session/transaction.ts` | 32,484 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/delta). |
| `src/session/forks.ts` | 2,912 | chép rồi sửa | 1 dòng scope (L1 chord). |
| `src/session/publications.ts` | 585 | chép nguyên văn | Chỉ import từ `../types.ts` và `./transaction.ts`. |
| `src/storage/memory.ts` | 28,693 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/delta). |
| `src/storage/sqlite/storage.ts` | 29,659 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/delta). |
| `src/storage/sqlite/database.ts` | 1,318 | chép nguyên văn | Không có scope, không có node import. |
| `src/storage/sqlite/migrations.ts` | 5,230 | chép nguyên văn | Không có scope. |
| `src/storage/sqlite/index.ts` | 263 | chép rồi sửa | Chuyển named re-export sang star (AGENTS.md). Không có scope. |
| `src/storage/sqlite/node.ts` | 3,756 | chép rồi sửa | KHÔNG đổi scope. NHƯNG sửa runtime: bỏ `node:sqlite`/`node:fs`/`node:path` (AGENTS.md 'Bun Over Node') → dùng `openSqliteDatabaseSync` từ `@oh-my-pi/pi-utils`, hoặc viết adapter `bun:sqlite` mới. Xem `collisions[]`. |
| `src/storage/jsonl/storage.ts` | 29,888 | chép rồi sửa | 1 dòng scope (L1 chord). |
| `src/storage/jsonl/node.ts` | 583 | chép rồi sửa | 1 dòng scope (L1 chord). |
| `src/storage/jsonl/index.ts` | 125 | chép rồi sửa | Chuyển sang star re-export. |
| `src/env/index.ts` | 6,010 | chép rồi sửa | 1 dòng scope (L1 chord). |
| `src/env/node.ts` | 30,551 | chép rồi sửa | 1 dòng scope (L21 chord). HÀM biến đổi lớn nhất của package: `node:child_process`/`node:crypto`/`node:fs`/`node:os`/`node:path`/`node:url` → `Bun.spawn`, `Bun.write`, `node:fs/promises` cho phần còn lại. |
| `src/env/utils/truncate.ts` | 9,916 | chép rồi sửa | KHÔNG copy thuần. Cắt phần trùng với `@oh-my-pi/pi-tui/tools/streaming-output.ts`; chỉ giữ riêng `GREP_MAX_LINE_LENGTH`, `utf8ByteLength`, `formatSize` và bỏ wrapper để bổ sung trường `maxLines`/`maxBytes` vào `TruncationResult`. Xem `collisions[]`. |
| `src/env/utils/output-capture.ts` | 9,131 | chép rồi sửa | 1 dòng scope (L1 chord). Sửa L203: đọc `current.truncation.maxBytes` — trường này không tồn tại trên shape của omp, phải bổ sung hoặc tính lại từ `limits`. |
| `src/env/utils/adaptive-publisher.ts` | 2,677 | chép rồi sửa | Không có scope. Ý nguyên hình dạng so với `pi-ref agent/harness/utils/adaptive-publisher.ts`. Nhưng KHÔNG chép nguyên văn được: L25 `#timer: ReturnType<typeof setTimeout> | undefined;` vi phạm AGENTS.md 'NEVER use `ReturnType<>`' → thay bằng `Timer`. Xem bước 15b. |
| `src/testing/index.ts` | 720 | chép rồi sửa | Chuyển sang star re-export. |
| `src/testing/types.ts` | 790 | chép nguyên văn | Không có scope. |
| `src/testing/assertions.ts` | 1,229 | chép nguyên văn | Không có scope. File này KHÔNG import test framework nào (chỉ định nghĩa adapter `'ExpectLike'`/`createExpectAssertions`), nên chạy được sau khi chuyển test sang `bun:test` mà không cần sửa — giữ nguyên. Không phải vì 'trùng lặp' (nó không trùng `bun:test`), mà vì không có gì để đổi. |
| `src/testing/runner.ts` | 878 | chép nguyên văn | Không có scope. |
| `src/testing/storage-conformance.ts` | 54,178 | chép rồi sửa | 3 dòng scope (L1 chord, L2 chord/context, L3 chord/delta). |
| `src/testing/storage-benchmark.ts` | 13,994 | chép rồi sửa | 2 dòng scope (L1 chord, L2 chord/context). |
| `test/session-support.ts` | 4,926 | chép rồi sửa | 3 dòng scope (L1 chord, L2 chord/context) + L3 `pi-durable` self-import. đổi `vitest` → `bun:test` nếu có. |
| `test/session-documents.test.ts` | 27,086 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/session-definitions.test.ts` | 4,654 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`; `expectTypeOf` cần xem xét bỏ (xem `test_contract`). |
| `test/session-checkpoints-migrations.test.ts` | 24,698 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/session-forks.test.ts` | 26,608 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/session-tables.test.ts` | 18,204 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/types.test.ts` | 8,227 | chép rồi sửa | đổi `'vitest'` → `'bun:test'`. File này chỉ kiểm tra kiểu → phải viết lại thành type-level hoặc bỏ; AGENTS.md cấm test 'echo'. |
| `test/memory-storage.test.ts` | 1,356 | chép rồi sửa | 2 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/sqlite-storage.test.ts` | 21,367 | chép rồi sửa | 3 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/sqlite-facade.test.ts` | 6,576 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/sqlite-migrations.test.ts` | 5,427 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/jsonl-storage.test.ts` | 40,744 | chép rồi sửa | 3 dòng scope. đổi `'vitest'` → `'bun:test'`. |
| `test/storage-runtime-boundary.test.ts` | 2,020 | chép rồi sửa | đổi `'vitest'` → `'bun:test'`. |
| `test/env-node.test.ts` | 39,230 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` + `'vi'` → `'bun:test'` (`vi.useFakeTimers` → `jest.setSystemTime` / Bun equivalent). |
| `test/env-node-spill.test.ts` | 3,306 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` + `'vi'` → `'bun:test'`. |
| `test/env-output-capture.test.ts` | 11,423 | chép rồi sửa | 1 dòng scope. đổi `'vitest'` + `'vi'` → `'bun:test'` (file này dùng `vi.setSystemTime` nhiều nhất). |
| `test/env-truncate.test.ts` | 8,681 | chép rồi sửa | đổi `'vitest'` → `'bun:test'`. Phải viết lại: phần lớn không còn hiệu lực sau khi cắt trùng với pi-tui. |
| `test/env-adaptive-publisher.test.ts` | 3,776 | chép rồi sửa | đổi `'vitest'` + `'vi'` → `'bun:test'`. |
| `test/fixtures/delete-buffer.ts` | 156 | chép rồi sửa | Fixture để xoá `globalThis.Buffer`. Kiểm tra còn phù hợp với Bun trước khi giữ. |
| `test/fixtures/utf8-byte-length-without-buffer.ts` | 438 | chép rồi sửa | Fixture để test `utf8ByteLength` khi không có `Buffer`. |
| `test/storage-memory.ts` | 8,486 | chép rồi sửa | 2 dòng scope. Script chạy bằng `'node --experimental-strip-types'` → đổi sang `bun`. |
| `test/storage.bench.ts` | 7,088 | chép rồi sửa | 2 dòng scope. `vitest` bench → chuyển sang `packages/durable/bench/*.bench.ts` (Bun bench). |
| `test/scratch.ts` | 6,871 | chép rồi sửa | 1 dòng scope. Script viết tay - xem xét bỏ, không phải test contract. |
| `docs/pico-v5.md` | 114,252 | chép rồi sửa | 3 dòng scope. 114 KB - đặc tả normative giữ nguyên. |
| `docs/pico-v5-chord-usage.md` | 18,156 | chép rồi sửa | 3 dòng scope. |
| `docs/pico-v5-handoff.md` | 26,291 | chép rồi sửa | 1 dòng scope. |
| `docs/pico-v5-live-registries.md` | 25,169 | chép nguyên văn | Không có scope. |
| `docs/chord-delta-findings.md` | 19,469 | chép nguyên văn | Không có scope. |
| _(không phải 1 file — áp dụng cho mọi file trong `src/`)_ | — | chép rồi sửa | **BẮT BUỘC sửa luật dự án sau khi chép** (`bun run check:ts` + `oxlint` sẽ đỏ nếu bỏ qua). (a) `private` → `#private`: 64 chỗ field/method trong `src/storage/memory.ts` (13), `src/storage/sqlite/storage.ts` (17), `src/storage/sqlite/node.ts` (3), `src/storage/jsonl/storage.ts` (22), `src/env/node.ts` (11) — AGENTS.md:49. (`src/session/session.ts` đã dùng `#` sẵn.) (b) `ReturnType<>`: 11 chỗ — `src/env/node.ts` (8), `src/storage/jsonl/storage.ts` (2), `src/env/utils/adaptive-publisher.ts` (1) — AGENTS.md:45. (c) `new Promise(`: 3 chỗ trong `src/env/node.ts` (L149, L296, L485) → `Promise.withResolvers()` — AGENTS.md:50. Xem bước 15b. |

Ngoài 63 file trên, bước 2 tạo thêm `packages/durable/LICENSE` — không chép từ đâu, mà tạo mới từ bản MIT ở `pi-ref` root.

### Bề mặt công khai — bảng: symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa |
| --- | --- | --- | --- | --- |
| `defineDoc` | function | `src/documents.ts:38-53` | `packages/durable/src/documents.ts` | Không — overload set chọn scope→token |
| `defineDocFamily` | function | `src/documents.ts:59-79` | `packages/durable/src/documents.ts` | Không — overload set nhét |
| `ReadAfterWrite` | class | `src/errors.ts:2` | `packages/durable/src/errors.ts` | Không |
| `StorageRejected` | class | `src/errors.ts:10` | `packages/durable/src/errors.ts` | Không |
| `createSession` | function | `src/session/session.ts:37` | `packages/durable/src/session/session.ts` | Không |
| `SessionKernel` | class | `src/session/session.ts:47` | `packages/durable/src/session/session.ts` | Không — không export từ index, nội bộ |
| `MemoryStorage` | class | `src/storage/memory.ts:215` | `packages/durable/src/storage/memory.ts` | Không — storage trong bộ 772 dòng |
| `JsonObject` | type | `src/types.ts:6` | XEM `collisions[]` | **Có** — VA CHẠM hình dạng |
| `Id` | type | `src/types.ts:11` | `packages/durable/src/types.ts` | Không — nominal brand trên number |
| `ConversationId` | type | `src/types.ts:18` | `packages/durable/src/types.ts` | Không |
| `EntryId` | type | `src/types.ts:19` | `packages/durable/src/types.ts` | Không |
| `TaskId` | type | `src/types.ts:20` | `packages/durable/src/types.ts` | Không |
| `SubmissionId` | type | `src/types.ts:21` | `packages/durable/src/types.ts` | Không |
| `DocumentId` | type | `src/types.ts:22` | `packages/durable/src/types.ts` | Không |
| `Seq` | type | `src/types.ts:27` | `packages/durable/src/types.ts` | Không — commit sequence đánh số |
| `ROOT_CONVERSATION_ID` | const | `src/types.ts:30` | `packages/durable/src/types.ts` | Không — giá trị 1 gắn với brand |
| `LatestConversationSemantics` | type | `src/types.ts:33` | `packages/durable/src/types.ts` | Không |
| `RewindableConversationSemantics` | type | `src/types.ts:40` | `packages/durable/src/types.ts` | Không |
| `DocumentSemantics` | type | `src/types.ts:47` | `packages/durable/src/types.ts` | Không |
| `CommonDocDefinition` | type | `src/types.ts:54` | `packages/durable/src/types.ts` | Không |
| `DocDefinition` | type | `src/types.ts:65` | `packages/durable/src/types.ts` | Không |
| `DocFamilyDefinition` | type | `src/types.ts:68` | `packages/durable/src/types.ts` | Không |
| `DocToken` | interface | `src/types.ts:77` | `packages/durable/src/types.ts` | Không |
| `DocFamilyToken` | interface | `src/types.ts:83` | `packages/durable/src/types.ts` | Không |
| `SessionDocToken` | type | `src/types.ts:88` | `packages/durable/src/types.ts` | Không |
| `ConversationDocToken` | type | `src/types.ts:89` | `packages/durable/src/types.ts` | Không |
| `RewindableConversationDocToken` | type | `src/types.ts:93` | `packages/durable/src/types.ts` | Không |
| `TaskDocToken` | type | `src/types.ts:97` | `packages/durable/src/types.ts` | Không |
| `SessionDocFamilyToken` | type | `src/types.ts:99` | `packages/durable/src/types.ts` | Không |
| `ConversationDocFamilyToken` | type | `src/types.ts:104` | `packages/durable/src/types.ts` | Không |
| `RewindableConversationDocFamilyToken` | type | `src/types.ts:109` | `packages/durable/src/types.ts` | Không |
| `TaskDocFamilyToken` | type | `src/types.ts:114` | `packages/durable/src/types.ts` | Không |
| `TaskDefinition` | type | `src/types.ts:123` | `packages/durable/src/types.ts` | Không |
| `Task` | interface | `src/types.ts:136` | `packages/durable/src/types.ts` | Không |
| `TaskOptions` | type | `src/types.ts:141` | `packages/durable/src/types.ts` | Không |
| `ConversationOwnership` | type | `src/types.ts:151` | `packages/durable/src/types.ts` | Không |
| `ConversationRecord` | type | `src/types.ts:154` | `packages/durable/src/types.ts` | Không |
| `ContextEdit` | type | `src/types.ts:169` | `packages/durable/src/types.ts` | Không |
| `EntryRecord` | type | `src/types.ts:185` | `packages/durable/src/types.ts` | Không |
| `EntryDraft` | type | `src/types.ts:203` | `packages/durable/src/types.ts` | Không |
| `SubmissionRecord` | type | `src/types.ts:217` | `packages/durable/src/types.ts` | Không |
| `SubmissionCreate` | type | `src/types.ts:284` | `packages/durable/src/types.ts` | Không |
| `TaskOutcomeError` | type | `src/types.ts:291` | `packages/durable/src/types.ts` | Không |
| `TaskOutcome` | type | `src/types.ts:298` | `packages/durable/src/types.ts` | Không |
| `TaskState` | type | `src/types.ts:335` | `packages/durable/src/types.ts` | Không |
| `TaskRecord` | type | `src/types.ts:376` | `packages/durable/src/types.ts` | Không |
| `DocumentRecord` | type | `src/types.ts:390` | `packages/durable/src/types.ts` | Không |
| `DocumentCreate` | type | `src/types.ts:429` | `packages/durable/src/types.ts` | Không |
| `Page` | type | `src/types.ts:436` | `packages/durable/src/types.ts` | Không |
| `Cursor` | type | `src/types.ts:442` | `packages/durable/src/types.ts` | Không |
| `ConversationQuery` | type | `src/types.ts:445` | `packages/durable/src/types.ts` | Không |
| `EntryQuery` | type | `src/types.ts:451` | `packages/durable/src/types.ts` | Không |
| `TaskQuery` | type | `src/types.ts:460` | `packages/durable/src/types.ts` | Không |
| `DocumentPoint` | type | `src/types.ts:469` | `packages/durable/src/types.ts` | Không |
| `DocumentAddress` | type | `src/types.ts:472` | `packages/durable/src/types.ts` | Không |
| `DocumentQuery` | type | `src/types.ts:480` | `packages/durable/src/types.ts` | Không |
| `DocumentContent` | type | `src/types.ts:487` | `packages/durable/src/types.ts` | Không |
| `DocumentCopySource` | type | `src/types.ts:500` | `packages/durable/src/types.ts` | Không |
| `StoredDocument` | type | `src/types.ts:506` | `packages/durable/src/types.ts` | Không |
| `StorageWrite` | type | `src/types.ts:513` | `packages/durable/src/types.ts` | Không |
| `Tx` | interface | `src/types.ts:535` | `packages/durable/src/types.ts` | Không |
| `Session` | interface | `src/types.ts:607` | `packages/durable/src/types.ts` | Không |
| `Storage` | interface | `src/types.ts:665` | `packages/durable/src/types.ts` | Không |
| `Result` | type | `src/env/index.ts:5` | `packages/durable/src/env/index.ts` | Không — không phải pi `Result` |
| `ok` | function | `src/env/index.ts:7` | `packages/durable/src/env/index.ts` | Không |
| `err` | function | `src/env/index.ts:11` | `packages/durable/src/env/index.ts` | Không |
| `getOrThrow` | function | `src/env/index.ts:15` | `packages/durable/src/env/index.ts` | Không |
| `getOrUndefined` | function | `src/env/index.ts:20` | `packages/durable/src/env/index.ts` | Không |
| `toError` | function | `src/env/index.ts:24` | XEM `collisions[]` | **Có** — omp có sẵn ở `packages/utils/src/type-guards.ts:15` |
| `FileKind` | type | `src/env/index.ts:34` | `packages/durable/src/env/index.ts` | Không |
| `FileErrorCode` | type | `src/env/index.ts:36` | `packages/durable/src/env/index.ts` | Không |
| `FileError` | class | `src/env/index.ts:46` | `packages/durable/src/env/index.ts` | Không |
| `ExecutionErrorCode` | type | `src/env/index.ts:58` | `packages/durable/src/env/index.ts` | Không |
| `ExecutionError` | class | `src/env/index.ts:66` | `packages/durable/src/env/index.ts` | Không |
| `FileInfo` | interface | `src/env/index.ts:76` | `packages/durable/src/env/index.ts` | Không |
| `TextLine` | interface | `src/env/index.ts:84` | `packages/durable/src/env/index.ts` | Không |
| `TextLineReader` | interface | `src/env/index.ts:89` | `packages/durable/src/env/index.ts` | Không |
| `FileSystem` | interface | `src/env/index.ts:95` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputRetention` | type | `src/env/index.ts:136` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputLimits` | interface | `src/env/index.ts:138` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputCaptureOptions` | interface | `src/env/index.ts:144` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputTruncation` | type | `src/env/index.ts:149` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputMetadata` | interface | `src/env/index.ts:151` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputView` | interface | `src/env/index.ts:157` | `packages/durable/src/env/index.ts` | Không |
| `ShellOutputUpdate` | type | `src/env/index.ts:161` | `packages/durable/src/env/index.ts` | Không |
| `ShellExecResult` | interface | `src/env/index.ts:167` | `packages/durable/src/env/index.ts` | Không |
| `ShellExecOptions` | interface | `src/env/index.ts:171` | `packages/durable/src/env/index.ts` | Không |
| `Shell` | interface | `src/env/index.ts:180` | XEM `collisions[]` | **Có** — omp có `Shell` là string-union `'bash'`\|`'zsh'`\|`'fish'` tại `packages/coding-agent/src/cli/completion-gen.ts:20` |
| `ExecutionEnv` | interface | `src/env/index.ts:189` | `packages/durable/src/env/index.ts` | Không |
| `NodeExecutionEnv` | class | `src/env/node.ts:438` | `packages/durable/src/env/node.ts` | Không — 963 dòng, đọc lại bằng `node:child_process` |
| `SqliteValue` | type | `src/storage/sqlite/database.ts:2` | `packages/durable/src/storage/sqlite/database.ts` | Không |
| `SqliteStatement` | interface | `src/storage/sqlite/database.ts:8` | `packages/durable/src/storage/sqlite/database.ts` | Không |
| `SqliteDatabase` | interface | `src/storage/sqlite/database.ts:26` | `packages/durable/src/storage/sqlite/database.ts` | Không — facade đồng bộ để adapter Bun/Node cùng hiểu |
| `SqliteStorage` | class | `src/storage/sqlite/storage.ts:166` | `packages/durable/src/storage/sqlite/storage.ts` | Không — 809 dòng |
| `SqliteMigration` | type | `src/storage/sqlite/migrations.ts:3` | `packages/durable/src/storage/sqlite/migrations.ts` | Không |
| `SQLITE_MIGRATIONS` | const | `src/storage/sqlite/migrations.ts:85` | `packages/durable/src/storage/sqlite/migrations.ts` | Không — chỉ 1 migration version 1 |
| `CURRENT_SQLITE_SCHEMA_VERSION` | const | `src/storage/sqlite/migrations.ts:87` | `packages/durable/src/storage/sqlite/migrations.ts` | Không |
| `applySqliteMigrations` | function | `src/storage/sqlite/migrations.ts:92` | `packages/durable/src/storage/sqlite/migrations.ts` | Không |
| `NodeSqliteDatabase` | class | `src/storage/sqlite/node.ts:40` | `packages/durable/src/storage/sqlite/node.ts` | Không — adapter `node:sqlite`, xung đột với AGENTS.md, xem `collisions[]` |
| `openNodeSqliteDatabase` | function | `src/storage/sqlite/node.ts:91` | `packages/durable/src/storage/sqlite/node.ts` | Không |
| `openNodeSqliteStorage` | function | `src/storage/sqlite/node.ts:116` | `packages/durable/src/storage/sqlite/node.ts` | Không |
| `NodeSqliteStorageOptions` | type | `src/storage/sqlite/node.ts:9` | `packages/durable/src/storage/sqlite/node.ts` | Không |
| `JsonlStorage` | class | `src/storage/jsonl/storage.ts:240` | `packages/durable/src/storage/jsonl/storage.ts` | Không — 840 dòng |
| `JsonlStorageOptions` | type | `src/storage/jsonl/storage.ts:75` | `packages/durable/src/storage/jsonl/storage.ts` | Không |
| `JsonlCorruptionError` | class | `src/storage/jsonl/storage.ts:80` | `packages/durable/src/storage/jsonl/storage.ts` | Không |
| `JsonlStoragePoisonedError` | class | `src/storage/jsonl/storage.ts:87` | `packages/durable/src/storage/jsonl/storage.ts` | Không |
| `openNodeJsonlStorage` | function | `src/storage/jsonl/node.ts:6` | `packages/durable/src/storage/jsonl/node.ts` | Không |
| `createExpectAssertions` | function | `src/testing/assertions.ts:17` | `packages/durable/src/testing/assertions.ts` | Không — cấu hình vitest, dùng lại nguyên |
| `ExpectLike` | type | `src/testing/assertions.ts:3` | `packages/durable/src/testing/assertions.ts` | Không |
| `registerStorageConformance` | function | `src/testing/runner.ts:12` | `packages/durable/src/testing/runner.ts` | Không |
| `StorageConformanceRunner` | interface | `src/testing/runner.ts:5` | `packages/durable/src/testing/runner.ts` | Không |
| `createStorageConformance` | function | `src/testing/storage-conformance.ts:90` | `packages/durable/src/testing/storage-conformance.ts` | Không — 1,520 dòng, bộ conformance lớn nhất |
| `StorageConformanceAssertions` | interface | `src/testing/types.ts:3` | `packages/durable/src/testing/types.ts` | Không |
| `StorageConformanceProvider` | type | `src/testing/types.ts:12` | `packages/durable/src/testing/types.ts` | Không |
| `StorageConformanceOptions` | type | `src/testing/types.ts:14` | `packages/durable/src/testing/types.ts` | Không |
| `StorageConformanceCase` | type | `src/testing/types.ts:19` | `packages/durable/src/testing/types.ts` | Không |
| `StorageBenchmarkScale` | type | `src/testing/storage-benchmark.ts:17` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `STORAGE_MEMORY_SCALES` | const | `src/testing/storage-benchmark.ts:24` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `TIMING_SCALE` | const | `src/testing/storage-benchmark.ts:29` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `storageBenchmarkPrimaryRecordCount` | function | `src/testing/storage-benchmark.ts:42` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `StorageBenchmarkDataset` | type | `src/testing/storage-benchmark.ts:56` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `seedStorageBenchmark` | function | `src/testing/storage-benchmark.ts:89` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `StorageReadBenchmark` | type | `src/testing/storage-benchmark.ts:279` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `STORAGE_READ_BENCHMARKS` | const | `src/testing/storage-benchmark.ts:285` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `StorageWriteBenchmark` | type | `src/testing/storage-benchmark.ts:385` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `seedStorageWriteBenchmark` | function | `src/testing/storage-benchmark.ts:392` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `STORAGE_WRITE_BENCHMARKS` | const | `src/testing/storage-benchmark.ts:410` | `packages/durable/src/testing/storage-benchmark.ts` | Không |
| `truncateHead` | function | `src/env/utils/truncate.ts:132` | XEM `collisions[]` | **Có** — VA CHẠM |
| `truncateTail` | function | `src/env/utils/truncate.ts:220` | XEM `collisions[]` | **Có** — VA CHẠM |
| `truncateLine` | function | `src/env/utils/truncate.ts:338` | XEM `collisions[]` | **Có** — VA CHẠM |
| `TruncationResult` | interface | `src/env/utils/truncate.ts:15` | XEM `collisions[]` | **Có** — VA CHẠM hình dạng |
| `TruncationOptions` | interface | `src/env/utils/truncate.ts:40` | XEM `collisions[]` | **Có** — VA CHẠM hình dạng |
| `DEFAULT_MAX_LINES` | const | `src/env/utils/truncate.ts:11` | XEM `collisions[]` | **Có** — VA CHẠM giá trị 2000 vs 3000 |
| `DEFAULT_MAX_BYTES` | const | `src/env/utils/truncate.ts:12` | XEM `collisions[]` | **Có** — cùng giá trị 50*1024 |
| `GREP_MAX_LINE_LENGTH` | const | `src/env/utils/truncate.ts:13` | `packages/durable/src/env/utils/truncate.ts` | Không — riêng của durable |
| `utf8ByteLength` | function | `src/env/utils/truncate.ts:54` | `packages/durable/src/env/utils/truncate.ts` | Không — omp chỉ có bản private trong `packages/coding-agent/src/live/protocol.ts:203` |
| `formatSize` | function | `src/env/utils/truncate.ts:115` | XEM `collisions[]` | **Có** — omp có `formatBytes` tại pi-tui/render/render-utils, alias ở legacy shim:1596 |
| `OutputCapture` | class | `src/env/utils/output-capture.ts:26` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `applyShellOutputUpdate` | function | `src/env/utils/output-capture.ts:173` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `sanitizeShellOutput` | function | `src/env/utils/output-capture.ts:234` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `OUTPUT_MIN_EMIT_INTERVAL_MS` | const | `src/env/utils/output-capture.ts:6` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `OUTPUT_TARGET_BYTES_PER_SECOND` | const | `src/env/utils/output-capture.ts:7` | `packages/durable/src/env/utils/output-capture.ts` | Không |
| `AdaptivePublisher` | class | `src/env/utils/adaptive-publisher.ts:18` | `packages/durable/src/env/utils/adaptive-publisher.ts` | Không |
| `AdaptivePublisherOptions` | interface | `src/env/utils/adaptive-publisher.ts:1` | `packages/durable/src/env/utils/adaptive-publisher.ts` | Không |
| `AnyDocDefinition` | type | `src/documents.ts:82` | `packages/durable/src/documents.ts` | Không |
| `AnyDocToken` | type | `src/documents.ts:92` | `packages/durable/src/documents.ts` | Không |
| `ResolvedAddress` | type | `src/documents.ts:101` | `packages/durable/src/documents.ts` | Không |
| `resolveAddress` | function | `src/documents.ts:108` | `packages/durable/src/documents.ts` | Không |
| `addressId` | function | `src/documents.ts:136` | `packages/durable/src/documents.ts` | Không |
| `documentCreate` | function | `src/documents.ts:147` | `packages/durable/src/documents.ts` | Không |
| `checkRecordScope` | function | `src/documents.ts:167` | `packages/durable/src/documents.ts` | Không |
| `checkRecordVersion` | function | `src/documents.ts:178` | `packages/durable/src/documents.ts` | Không |
| `materializeDocument` | function | `src/documents.ts:192` | `packages/durable/src/documents.ts` | Không |
| `materializeDocumentValue` | function | `src/documents.ts:197` | `packages/durable/src/documents.ts` | Không |
| `idFromNumber` | function | `src/ids.ts:4` | `packages/durable/src/ids.ts` | Không |
| `seqFromNumber` | function | `src/ids.ts:9` | `packages/durable/src/ids.ts` | Không |
| `Transaction` | class | `src/session/transaction.ts:150` | `packages/durable/src/session/transaction.ts` | Không — 879 dòng |
| `TransactionHost` | interface | `src/session/transaction.ts:87` | `packages/durable/src/session/transaction.ts` | Không |
| `DocumentCommitChange` | type | `src/session/transaction.ts:56` | `packages/durable/src/session/transaction.ts` | Không |
| `LoadedDocument` | type | `src/session/transaction.ts:78` | `packages/durable/src/session/transaction.ts` | Không |
| `CommitPublication` | type | `src/session/publications.ts:13` | `packages/durable/src/session/publications.ts` | Không |
| `CommitChange` | type | `src/session/publications.ts:10` | `packages/durable/src/session/publications.ts` | Không |
| `TableCommitChange` | type | `src/session/publications.ts:5` | `packages/durable/src/session/publications.ts` | Không |
| `ForkDocumentCopy` | type | `src/session/forks.ts:20` | `packages/durable/src/session/forks.ts` | Không |
| `prepareForkDocumentCopies` | function | `src/session/forks.ts:26` | `packages/durable/src/session/forks.ts` | Không |

### Dependency mới

| tên | phiên bản | đã có ở omp | vì sao |
| --- | --- | --- | --- |
| `@oh-my-pi/chord` | `0.87.1` (workspace) | Không | 52 lần import. Cung cấp 14 symbol (đã đếm từ 24 câu lệnh import trong `src/`; `Change`/`Prepared`/`Tracker` đến từ `src/session/transaction.ts:2`): `Context`/`Draft`/`JsonValue`/`Op`/`Change`/`Prepared`/`Tracker`/`copyJson`/`track`/`apply`/`applyImmutableBatches`/`awaitWithContext`/`withoutAbortSignal`/`BACKGROUND_CONTEXT`. `withAbortSignal` chỉ dùng ở `test/env-node.test.ts:7`, không có trong `src/`. KHÔNG có nó thì `durable` không chạy được. License MIT. |
| `@oh-my-pi/pi-ai` | workspace | Có | CHỈ 1 import type: `Message` tại `src/types.ts:3`, dùng trong `ContextEdit.replace.messages` và `EntryRecord.model`. Shape giống hệt omp `packages/ai/src/types.ts:1199`. License MIT. |

Những thứ **KHÔNG** thêm vào, và vì sao:

- `vitest` — bỏ. omp dùng `bun:test`; `vitest.config.ts` và `vitest.benchmark.config.ts` cùng bị loá khỏi danh sách chép, và 19 file test phải đổi `from 'vitest'` sang `from 'bun:test'`.
- `shx` — bỏ khỏi devDeps cùng `vitest`. Không còn script nào trong package cần nó.
- Không dựng `dist`: `package.json` không có `'source'` condition, không có trường `'dist'`, không có script `'build'`; `exports` trỏ thẳng vào `./src/*.ts` như `packages/utils` và `packages/tui`.
- Không có `tsconfig.build.json` (không build `dist`), nhưng CÓ `tsconfig.json` tối thiểu chỉ để `check:types` chạy được.
- Không dùng chung DB với các store hiện có: 51 file `src` của omp đã dùng `bun:sqlite`, còn `durable` thêm storage sqlite với schema riêng (`conversations`/`entries`/`tasks`/`submissions`/`documents`). Mặc định giữ DB RIÊNG — dùng chung sẽ phải viết migration nội bộ và tăng rủi ro gấp 2 lần.
- `@oh-my-pi/pi-utils` và `@oh-my-pi/pi-tui` không nằm trong danh sách 2 dep ở trên, nhưng bước 8 và bước 9 bắt buộc import `truncateHead`/`truncateTail`/`truncateLine`/`TruncationResult`/`TruncationOptions`/`formatBytes` từ hai package đó. Cần xác nhận chúng có nằm trong `dependencies` của `packages/durable/package.json` hay không.

### Va chạm với thứ omp đã có — bảng: cái gì | neo phía pi | neo phía omp | cách giải quyết

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| `TruncationResult` — cùng tên, KHÁC HÌNH DẠNG. durable (11 trường bắt buộc: `content`, `truncated:boolean`, `truncatedBy:'lines'\|'bytes'\|null`, `totalLines`, `totalBytes`, `outputLines:number`, `outputBytes:number`, `lastLinePartial:boolean`, `firstLineExceedsLimit:boolean`, `maxLines:number`, `maxBytes:number`) khác omp (14 trường nhưng chỉ 3 bắt buộc, 11 OPTIONAL, KHÔNG có `maxLines`/`maxBytes`, và thêm 6 trường middle-truncation `elidedBytes`/`elidedLines`/`headLines`/`tailLines`/`partialByteWindows` + `truncatedBy` chấp nhận thêm `'middle'`). | `src/env/utils/truncate.ts:15-45` | `packages/tui/src/tools/streaming-output.ts:105-126` | **GIỮ omp.** Không cắt sang phía durable. `durable` bỏ wrapper riêng để bổ sung 2 trường `maxLines`/`maxBytes` vào kết quả của pi-tui, vì `src/env/utils/output-capture.ts:203` ĐỌC `current.truncation.maxBytes` để tính độ đo quét overlap. Cách này giữ 1 hình dạng duy nhất trong repo và không phải sửa 1,576 dòng `streaming-output.ts` đang dùng bởi cả TUI. |
| `DEFAULT_MAX_LINES` — cùng tên, KHÁC GIÁ TRỊ. durable = 2000, omp = 3000. Đây là observable: một lệnh shell 2,500 dòng sẽ bị durable cắt, không bị omp cắt. | `src/env/utils/truncate.ts:11` | `packages/tui/src/tools/streaming-output.ts:10` | **GIỮ omp (3000).** `durable` luôn truyền `limits` tương minh qua `OutputCapture` (`src/env/utils/output-capture.ts:46-47`), nên default ít khi đường đánh tính. Bắt buộc nếu muốn giữ 2000 thì truyền rõ ràng, không đưa vào constant. |
| `truncateLine` — cùng tên, KHÁC MARKER và KHÁC DEFAULT. durable cắt ở 500 (`GREP_MAX_LINE_LENGTH`) và chèn `'... [truncated]'`; omp cắt ở 512 (`DEFAULT_MAX_COLUMN`) và chèn `'…'`, kèm `materializeString()` để intern string của Bun. | `src/env/utils/truncate.ts:338-345` | `packages/tui/src/tools/streaming-output.ts:285-293` | **GIỮ omp.** Đó là dải 2,500/3,000 dòng, dùng để hiển thị, không phải contract dữ liệu. Nếu cần hạn 500 thì truyền 500. |
| `Shell` — cùng tên, KHÁC NGHĨA HOÀN TOÀN. durable là INTERFACE (exec + cleanup); omp là STRING-UNION `'bash'`\|`'zsh'`\|`'fish'`. | `src/env/index.ts:180-187` | `packages/coding-agent/src/cli/completion-gen.ts:20` | **KHÔNG sửa gì cả hai bên** — ở các package khác nhau nên không conflict. NHƯNG cần canh: bảo đảm KHÔNG bao giờ merge `durable/env` vào một barrel chung với `pi-coding-agent`. Giữ nguyên. |
| `Context` — cùng tên, KHÁC NGHĨA. durable import `Context` từ chord (context nền / hủy); omp `Context` tại `packages/ai/src/types.ts:1476` là `{systemPrompt, messages, tools, inactiveTools}` — context của một request model. | `src/types.ts:1`, `src/session/session.ts:1` | `packages/ai/src/types.ts:1476-1483` | **KHÔNG đổi tên.** `durable` nhập ĐÚNG từ `@oh-my-pi/chord` nên không bao giờ nhập `Context` từ `pi-ai`. Khi wiring lại trong omp, phải truyền chord `Context` (`BACKGROUND_CONTEXT`) — truyền nhầm `pi-ai` `Context` sẽ lỗi type, đây là biến cạnh bao phải ghi vào README. |
| `JsonObject` — cùng tên, KHÁC HÌNH DẠNG. durable: `{ [key: string]: JsonValue }` với `JsonValue` từ chord; omp: `Record<string, unknown>`. | `src/types.ts:6` | `packages/ai/src/utils/schema/types.ts:1` | **GIỮ durable.** Riêng `durable` KHÔNG import `JsonObject` từ `pi-ai` nên không conflict trực tiếp. NHƯNG BẤT BUỘC không re-export cả hai vào cùng một barrel — nếu cần, đặt lại tên thành `DurableJsonObject` ở khi biên giới. |
| `toError` — cùng tên, cùng chức năng, KHÁC XỬ LÝ. durable (thử `Error` → `string` → `JSON.stringify` → `String`); omp có sẵn. | `src/env/index.ts:24-32` | `packages/utils/src/type-guards.ts:15` | **DÙNG BẢN CỦA omp.** Xoá hàm trong `durable`, import `{ toError }` từ `@oh-my-pi/pi-utils`. AGENTS.md: 'Search first: grep for the operation before implementing it. Two implementations of the same thing is a bug.' |
| `formatSize` — cùng tên, khác hàm. durable là helper in kích thước byte; omp có `formatBytes` trong pi-tui/render/render-utils, đã được alias ở `packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1596`. | `src/env/utils/truncate.ts:115-130` | `packages/tui/src/render/render-utils.ts` (qua alias `legacy-pi-coding-agent-shim.ts:1596`) | **DÙNG BẰNG `formatBytes` CỦA omp.** Xoá hàm riêng khi cắt `truncate.ts`. Giữ `utf8ByteLength` vì omp chỉ có bản private trong một file không xuất. |
| Node SQLite adapter dùng `node:sqlite`, còn omp dùng `bun:sqlite` ở 51 file `src` (`git grep -l 'bun:sqlite' -- 'packages/*/src/**'` = 51). AGENTS.md quy định Bun trước Node. | `src/storage/sqlite/node.ts:3-4` (import `DatabaseSync` từ `node:sqlite`) | `packages/catalog/src/model-cache.ts:5`, `packages/coding-agent/src/session/agent-storage.ts:1` (`bun:sqlite`), pi-utils `openSqliteDatabaseSync` | **VIẾT adapter `bun:sqlite` mới** cho `SqliteDatabase` facade (`src/storage/sqlite/database.ts:26`) — facade 31 dòng nên adapter mới ~60 dòng, tái dùng 100% `SqliteStorage` 809 dòng. Giữ bản `node:sqlite` sau phía subpath `/storage/sqlite/node` để không phá API công khai. |
| `NodeExecutionEnv` dùng `node:child_process` `spawn`; repo chỉ còn 1 file duy nhất dùng `node:child_process`. AGENTS.md quy 'Bun Over Node' và cấm spawn shell khi có API. | `src/env/node.ts:1` (`spawn` từ `node:child_process`) | `packages/metaharness/src/runner.ts:1` (duy nhất còn lại) | **Đổi sang `Bun.spawn`.** Đây là file nguy hiểm nhất của package (963 dòng, streaming + spill + adaptive publish). LÀM MỘT PR RIÊNG, không gộp với migration, để 14 test hiện có làm mạng an toàn. |
| Vị trí đặt: omp `packages/agent/` và `pi-ref packages/agent/` CHỈ giao 5 tên file trên 50 (omp) vs 117 (pi) — đo theo ĐƯỜNG DẪN TƯƠNG ĐỐI trong `src/`; nếu chỉ so tên file thì 12 — và cả 5 đều lệch khỏi đối lượng lớn (`agent-loop.ts` 148KB omp vs 26KB pi). `durable` là sực EXTEND của pi, không phải bản sao. | `packages/agent/src/harness/{session,utils}` (pi) vs `packages/agent/src` (omp) | `packages/agent/src/` (omp) | **Đặt `durable` ở `packages/durable/` (mới) — KHÔNG BAO GIỜ ghi đè `packages/agent/`.** Cùng bộ đặc tả trong pi `packages/agent/src/harness/utils/{truncate,output-capture,adaptive-publisher}.ts` là TIỀN THÂN của `durable`, nên khi migrate `agent` phải khớp — đã ghi vào `open_questions`. |

Đọc `documents.ts` thì còn hai xung đột do BẢN BỎ QUA mà bản sao + đổi 2 dòng scope không giải được:

- (a) `checkRecordScope` so sánh `record.scope.kind` và `definition.scope`, và `documentCreate` là bản ghi SCOPE có bản ghi HISTORY/FORK — khi wiring vào code omp đang dùng `pi-ai` `Context`, hay truyền nhầm sẽ biến thành lỗi so sánh ký tự dương.
- (b) `materializeDocument` gọi `copyJson` của chord — HÀM NÀY PHẢI ĐƯỢC DÙNG ĐÚNG, không được thế bằng `structuredClone`, vì nó giữ nguyên tính bất biến của chord mà `track()` sau đó đo.

### Các bước

1. **TAO KHUNG.** `mkdir -p packages/durable/{src/{session,storage/{sqlite,jsonl},env/utils,testing},test,docs,bench}`. Không bắt buộc là `cp -r` cả thư mục — tạo đúng cấu trúc để không kéo theo `vitest.config.ts`, `vitest.benchmark.config.ts`, `tsconfig.build.json` (3 file sẽ bị lo). *(neo: `packages/durable/` (mới))*
2. **PHÁP LÝ — BẮT BUỘC LÀM TRƯỚC KHI COPY FILE NÀO.** Tạo `packages/durable/LICENSE` = verbatim bản MIT ở `pi-ref/` root LICENSE (Copyright (c) 2025 Mario Zechner). File đó có 21 dòng nội dung nhưng KHÔNG có newline ở dòng cuối, nên `wc -l` báo 20 — đừng "sửa cho đủ 21 dòng". KHÔNG sửa dòng nào. Đây là điều kiện để việc chép hợp pháp. *(neo: `packages/durable/LICENSE`)*
3. **CHÉP 29 file `src/` nguyên văn**, dùng `git show d6af72e:packages/durable/<path>` để ghi ra (không dùng `cp -r` để không kéo file rác). 312,754 byte, 9,024 dòng. *(neo: `packages/durable/src/`)*
4. **CHÉP 23 file `test/`** cùng cách. 281,348 byte. *(neo: `packages/durable/test/`)*
5. **CHÉP 5 file `docs/`** cùng cách. 203,437 byte. KHÔNG bỏ docs — 114 KB đặc tả normative là bằng chứng hiện trạng. *(neo: `packages/durable/docs/`)*
6. **CHÉP `README.md` và `CHANGELOG.md`.** 4,404 + 1,387 byte. *(neo: `packages/durable/{README,CHANGELOG}.md`)*
7. **ĐỔI SCOPE.** 78 lần, dùng `grep -rl '@earendil-works/' packages/durable | xargs sed -i '' 's|@earendil-works/|@oh-my-pi/|g'`. 24 `chord` + 11 `chord/delta` + 17 `chord/context` + 4 `pi-ai` + 22 `pi-durable`. KIỂM CHỨNG: `grep -rc '@earendil-works/' packages/durable` phải ra 0 ở mọi dòng. *(neo: 37 file có scope — 14 `src`, 17 `test`, 3 `docs`, `package.json`, `README.md`, `tsconfig.build.json`)*
8. **GIẢI QUYẾT TRÙNG TÊN — BƯỚC NGUY HIỂM NHẤT.** Xoá `src/env/utils/truncate.ts` và viết lại: import `truncateHead`/`truncateTail`/`truncateLine`/`TruncationResult`/`TruncationOptions` từ `@oh-my-pi/pi-tui/tools/streaming-output` (KHÔNG phải barrel `@oh-my-pi/pi-tui/tools` — barrel đó là registry renderer, KHÔNG re-export `streaming-output`; đã kiểm chứng: `bun -e 'import { truncateHead } from "@oh-my-pi/pi-tui/tools"'` → `SyntaxError: Export named 'truncateHead' not found`. LƯU Ý: subpath này kéo theo `pi-natives` — xem mục Cần người quyết), giữ riêng `GREP_MAX_LINE_LENGTH` + `utf8ByteLength`, và bọc `'enhance'` trả về thêm `maxLines`/`maxBytes` cho mỗi kết quả. Sửa `src/env/utils/output-capture.ts:203` để đọc `maxBytes` từ `limits` thay vì từ `truncation`. Xem `collisions[0..2]`. *(neo: `src/env/utils/truncate.ts`, `src/env/utils/output-capture.ts:203`)*
9. **DÙNG LẠI TÁI DỤNG.** Xoá hàm `toError` (`src/env/index.ts:24-32`) và `formatSize` (`src/env/utils/truncate.ts:115-130`); import `{ toError }` từ `@oh-my-pi/pi-utils` và `{ formatBytes as formatSize }` từ `@oh-my-pi/pi-tui/render/render-utils`. AGENTS.md: 'Missing capability? Extend the central helper - do not fork its logic locally.' *(neo: `src/env/index.ts`, `src/env/utils/truncate.ts`)*
10. **BARREL → STAR.** `src/index.ts` (62 dòng named re-export), `src/storage/sqlite/index.ts`, `src/storage/jsonl/index.ts`, `src/testing/index.ts`: chuyển sang `export * from` theo AGENTS.md. Giữ nguyên danh sách tên export. *(neo: `src/index.ts`, `src/storage/{sqlite,jsonl}/index.ts`, `src/testing/index.ts`)*
11. **VIẾT `package.json` theo convention omp:** tên `@oh-my-pi/pi-durable`, KHÔNG có trường `'source'` condition, KHÔNG có `'dist'` — `exports` trỏ thẳng vào `./src/*.ts` như `packages/utils` và `packages/tui`. 10 subpath: `'.'`, `'./env'`, `'./env/node'`, `'./storage/memory'`, `'./storage/jsonl'`, `'./storage/jsonl/node'`, `'./storage/sqlite'`, `'./storage/sqlite/node'`, `'./testing'`, `'./package.json'`. Dependencies: `@oh-my-pi/chord` + `@oh-my-pi/pi-ai`. DevDeps: KHÔNG `vitest`, KHÔNG `shx`. Scripts: `'check:types'`. Không `'build'`. *(neo: `packages/durable/package.json`)*
12. **CẦN `packages/durable/tsconfig.json` riêng (KHÔNG phải `tsconfig.build.json`).** Không có `tsconfig.build.json` vì omp không build `dist`, NHƯNG script `check:types` mà bước 11 thêm là `tsgo -p tsconfig.json --noEmit` (y hệt `packages/utils/package.json:47` và `packages/tui/package.json:33`) — nó CẦN file này tồn tại, nếu không Xác minh (4) và Cổng sẽ fail. Tạo `packages/durable/tsconfig.json` = `{"extends": "../tsconfig.workspace.json", "include": ["src", "test"]}`, y hệt `packages/utils/tsconfig.json`; `extends` trỏ tới `packages/tsconfig.workspace.json` vốn đã khai báo `include: ["*/src", "*/test", ...]` nên không cần khai lại. Đồng thời thêm `'@oh-my-pi/pi-durable'` vào catalog root package.json để resolve workspace dep (version `18.3.3` như các package khác). *(neo: `package.json` (root) catalog, `packages/durable/tsconfig.json`, `packages/tsconfig.workspace.json`)*
13. **CHUYỂN TEST SANG `bun:test`.** 19 file có `from 'vitest'` → `from 'bun:test'`. AGENTS.md cấm `mock.module()` — máy sử dụng `vi` ở `durable` KHÔNG chỉ là fake timer: (đã kiểm tra: KHÔNG có `mock.module`, NHƯNG `test/env-node-spill.test.ts` DÙNG `vi.hoisted` (L12) + `vi.mock('node:fs', ...)` (L15) để ép backpressure spill deterministic — đây là mock MỨC MODULE, `bun:test` không có API tương đương và AGENTS.md cấm `mock.module()`; phải viết lại bằng seam khác, dependency-inject `createWriteStream` vào `NodeExecutionEnv`, và tách thành task riêng vì đây là test DUY NHẤT ép backpressure spill DETERMINISTIC — `env-node.test.ts` và `env-output-capture.test.ts` có đụng spill nhưng không ép được nhịp). Fake timer (`vi.useFakeTimers`/`vi.setSystemTime`/`vi.advanceTimersByTime`) chỉ ở 2 file: `env-output-capture`, `env-adaptive-publisher`. Ngoài ra còn `vi.spyOn`/`vi.restoreAllMocks` ở `env-node.test.ts:122,425,524` và `vi.useRealTimers` ở `env-output-capture.test.ts:33`, `env-adaptive-publisher.test.ts:5` — chuyển sang `spyOn` trực tiếp từ `bun:test` + `restoreAllMocks()` trong `afterEach`. *(neo: 18 file trong `test/`)*
14. **Viết lại `test/vi` bằng `bun:test`.** omp đã có 176 file dùng `import { afterEach, beforeEach, describe, expect, it } from 'bun:test'` và nhiều file dùng `setSystemTime`, nên có mẫu sẵn để nối. *(neo: 4 file dùng `vi.*`)*
15. **XOÁ 3 file config:** `tsconfig.build.json`, `vitest.config.ts`, `vitest.benchmark.config.ts`. Chuyển `test/storage.bench.ts` + `test/storage-memory.ts` sang `packages/durable/bench/*.bench.ts` theo convention omp (`packages/agent/bench/*.bench.ts`). *(neo: `packages/durable/bench/`)*
15b. **SỬA LUẬT DỰ ÁN SAU KHI CHÉP — BẮT BUỘC, `bun run check:ts` + `oxlint` sẽ đỏ nếu bỏ qua.** (a) `private` → `#private`: 64 chỗ field/method trong `src/storage/memory.ts` (13), `src/storage/sqlite/storage.ts` (17), `src/storage/sqlite/node.ts` (3), `src/storage/jsonl/storage.ts` (22), `src/env/node.ts` (11); AGENTS.md:49 cấm `private`/`protected`/`public` trên field và method. (`src/session/session.ts` đã dùng `#` sẵn.) (b) `ReturnType<>`: 11 chỗ — `src/env/node.ts` (8), `src/storage/jsonl/storage.ts` (2), `src/env/utils/adaptive-publisher.ts` (1) — nên `src/env/utils/adaptive-publisher.ts` KHÔNG chép nguyên văn được (L25 `#timer: ReturnType<typeof setTimeout> | undefined;` → `Timer`). (c) `new Promise(`: 3 chỗ trong `src/env/node.ts` (L149, L296, L485) → `Promise.withResolvers()`. Không có `any`, không có `await import(`, không có `console.*` trong `src/`. *(neo: `src/storage/{memory.ts,jsonl/storage.ts,sqlite/storage.ts,sqlite/node.ts}`, `src/env/node.ts`, `src/env/utils/adaptive-publisher.ts`)*
16. **DỄ CƠI HẠ (chưa làm trong PR này):** đọc lại 11 file docs + README, đổi 11 lần `@earendil-works/` → `@oh-my-pi/`, thêm mục `'## [Unreleased] ### Added'` vào CHANGELOG theo convention omp, thêm mục PHÁP LÝ trỏ về LICENSE vào README. *(neo: `packages/durable/{docs/,README.md,CHANGELOG.md}`)*
17. **GATE.** `bun run check:ts` phải exit 0. Sau đó `bun test packages/durable` — LUÔN Ý CHỈ DÙNG 51 file `src` đã dùng sqlite trong omp, còn `durable` thêm 1 file adapter `bun:sqlite`; xem `gate_can_fail`. *(neo: toàn repo)*

### Hợp đồng test

HỢP ĐỒNG QUAN SÁT ĐƯỢC, 5 nhóm, mỗi nhóm một test thật tại chức năng quan sát được — không test 'code chạy được':

1. **COMMIT NGUYÊN TÚYỆT ĐỐI.** Commit một Session, tất cả ghi vào Memory/Jsonl/Sqlite phải nhìn thấy một commit. Bằng bộ 3 backend cùng một script là bằng chứng tốt nhất — đây là cái test gốc của `storage-conformance.ts` (1,520 dòng) và nên GIỮ NGUYÊN VERBATIM.
2. **TÁI.** `ReadAfterWrite` ném khi đọc sau ghi; `StorageRejected` làm Session vẫn chạy. Đây là hai error class duy nhất.
3. **MIGRATION VĂN BẢN.** document version N được đọc với definition version M&lt;N và không có `migrate` → throw; có `migrate` → giá trị đã migrate. Nhánh không lỗi là thường vong nhất của mọi chặng schema.
4. **AS-OF / FORK.** `snapshotAsOf` tại một EntryId cũ hơn phải trả về đúng giá trị lịch sử, và fork một conversation tại entry giữa phải giữ đúng ancestry. Chỉ 'latest' thì không được có `asOf`.
5. **SCOPE MISMATCH.** Truy cập một doc token 'session' vào bản ghi đã lưu có scope 'conversation' → `TypeError`. Là hành vi đọc sai nhất, và cũng là nơi 2 va chạm Context/Scope sẽ lộ hỏng.

**CHẤM ĐIỂM RIÊNG — ENV.** truncate: cắt 2,500 dòng, cả 3,000 (omp) và 2,000 (durable) đều phải ra kết quả ĐÚNG; dấu là `'lines'` hay `'bytes'` là observable. output-capture: emit byte-rate + adaptive publisher phải bọc được trong khi luồng dữ liệu giới hạn.

**Cảnh báo bằng chứng:** `storage-conformance.ts` CHƯA chạy 3 file test với 3 backend của nó đang chạy; chạy con 1 backend không chứng minh gì. Bắt buộc chạy cả 3.

**KHÔNG copy 2 loại test:** (a) `vi.g. assert.storage` phải đổi được mạng an toàn — dấu là đó thay thế bắt buộc; (b) `test/types.test.ts` chỉ kiểm tra kiểu tĩnh, và `expectTypeOf` thiếu khả năng trong bun — theo AGENTS.md 'Bad: static echo' và 'Compile-time guarantees → type checks, KHÔNG runtime placeholders', nên hoặc biến thành type test trong tsconfig, hoặc bỏ. Đã quyết: **bỏ**, và ghi rõ lý do trong `test_contract`.

**Không được viết test mới** cho các thứ chạy 'constructor copy đúng fixture' — cấm theo AGENTS.md.

Tên file test (23 file `test/` + 1 file conformance dùng chung):

`packages/durable/test/session-tables.test.ts` · `packages/durable/test/session-documents.test.ts` · `packages/durable/test/session-checkpoints-migrations.test.ts` · `packages/durable/test/session-forks.test.ts` · `packages/durable/test/session-definitions.test.ts` · `packages/durable/test/types.test.ts` · `packages/durable/test/session-support.ts` · `packages/durable/test/memory-storage.test.ts` · `packages/durable/test/jsonl-storage.test.ts` · `packages/durable/test/sqlite-storage.test.ts` · `packages/durable/test/sqlite-facade.test.ts` · `packages/durable/test/sqlite-migrations.test.ts` · `packages/durable/test/storage-runtime-boundary.test.ts` · `packages/durable/test/env-node.test.ts` · `packages/durable/test/env-node-spill.test.ts` · `packages/durable/test/env-output-capture.test.ts` · `packages/durable/test/env-truncate.test.ts` · `packages/durable/test/env-adaptive-publisher.test.ts` · `packages/durable/test/fixtures/delete-buffer.ts` · `packages/durable/test/fixtures/utf8-byte-length-without-buffer.ts` · `packages/durable/test/storage-memory.ts` · `packages/durable/test/storage.bench.ts` · `packages/durable/test/scratch.ts` · `packages/durable/src/testing/storage-conformance.ts`

### Xác minh

```bash
grep -rc '@earendil-works/' packages/durable
bun run check:ts
bun test packages/durable
bun --cwd=packages/durable run check:types
grep -rn 'node:sqlite\|node:child_process' packages/durable/src
grep -rn "from 'vitest'" packages/durable
```

- (1) `grep -rc '@earendil-works/' packages/durable` → tất cả 0 (78 lần trong 37 file, đã đo lại bằng `grep -roh '@earendil-works/[a-zA-Z0-9/_-]*' packages/durable | sort | uniq -c`).
- (2) `bun run check:ts` → exit 0 (baseline đã đo: 24.5s wall / 79s user).
- (3) `bun test packages/durable` → xanh — SAU khi `pi-natives` đã build (xem mục Cần người quyết). Trên máy chưa build, lệnh này FAIL với lỗi native addon, KHÔNG phải lỗi của `durable`: `bun --cwd=packages/natives run build` cần `ninja` → phải `brew install ninja` trước.
- (4) `bun --cwd=packages/durable run check:types` → exit 0.
- (5) Kiểm tra không còn node-only trong code chạy: `grep -rn 'node:sqlite\|node:child_process' packages/durable/src` → chỉ còn được trong `src/storage/sqlite/node.ts` và `src/env/node.ts` NẾU quyết định giữ bản node sau (bước 16/17). Nếu đổi sang Bun hết → phải ra 0.
- (6) Kiểm tra không có `from 'vitest'` còn: `grep -rn "from 'vitest'" packages/durable` → 0.
- (7) Đọc lại file JSON đặc tả xong để xác nhận JSON hợp lệ.

### Cổng hoàn thành

1. `bun run check:ts` == 0. THẤT BẠI NẾU: còn import sai scope, còn named re-export trong barrel, còn đọc field không tồn tại trên shape của pi-tui (ví dụ `maxBytes`), còn thiếu export trong package.json.
2. `grep -rc '@earendil-works/' packages/durable` == 0 dòng. THẤT BẠI NẾU: còn sót.
3. `bun test packages/durable` xanh — SAU khi `pi-natives` đã build (xem mục Cần người quyết); trên máy chưa build, lệnh này FAIL với lỗi native addon, KHÔNG phải lỗi của `durable`. THẤT BẠI NẾU: hành vi khác trước/sau cắt trùng với pi-tui — nhất là `totalLines` đếm sai khi content kết thúc bằng `'\n'` và dấu `truncatedBy`.
4. `ls packages/durable/LICENSE` và `cmp packages/durable/LICENSE <(git -C ../pi-ref show d6af72e:LICENSE)` == 0. (`pi-ref` là thư mục ANH EM cạnh omp, KHÔNG phải thư mục con — `git -C pi-ref` chạy từ omp sẽ fail với lý do sai.) THẤT BẠI NẾU: còn sửa hoặc quên bản quyền.
5. `grep -rn 'from "vitest"' packages/durable` == 0. THẤT BẠI NẾU: còn file test chưa chuyển.
6. `ls packages/durable/tsconfig.build.json packages/durable/vitest.config.ts` == không tồn tại. THẤT BẠI NẾU: quên xoá.

Cổng này CÓ THỰC SỰ ĐỎ ĐƯỢC — `gate_can_fail: true`. Nó không phải một danh sách lệnh luôn trả 0: mục 4 so sánh byte-với-byte LICENSE với nguồn, mục 2 và 5 đếm số dòng khớp scope còn sót, mục 6 kiểm tra file phải bị xoá thực sự không còn, và mục 3 là nơi mọi khác biệt hành vi của `documents.ts` + 11 va chạm ở trên lộ ra.

### Rủi ro

**CAO.**

1. **PHẢI CÓ CHORD TRƯỚC** — 52 import, 14 symbol, không thể biên dịch khi chưa có.
2. **VA CHẠM TRUNCATION** — `durable` và pi-tui cùng tên `truncateHead`/`truncateTail`/`truncateLine`/`TruncationResult`/`TruncationOptions` nhưng KHÁC HÌNH DẠNG và KHÁC HÀNH VI: `durable` đếm `totalLines` bỏ newline trailing, omp đếm bằng `countNewlines+1`, nên `'a\nb\n'` ra 2 dòng ở `durable` và 3 ở omp; `durable` tiên trong `truncatedBy`, omp ưu tiên byte; `output-capture.ts:203` ĐỌC `truncation.maxBytes` — trường này KHÔNG TỒN TẠI trên shape của omp. Giải quyết: giữ omp, `durable` bọc thêm.
3. 4 file test dùng `vi.useFakeTimers`/`vi.setSystemTime`/`vi.advanceTimersByTime` — mỗi quy tắc sang khác nhau, phải viết lại.
4. 2 file 963 + 840 dòng là streaming/process I/O, hong khi đổi runtime.
5. 118 KB đặc tả normative đi kèm — nếu đổi contract mà không đổi code, test sẽ xanh nhầm.
6. omp `packages/agent/` đã trỏ khác xa pi (5/117 tên file trùng, đo theo ĐƯỜNG DẪN TƯƠNG ĐỐI trong `src/`) — dựa cơ sở đo rất có biến lẫng `durable` sẽ ghi đè nó.

Ước lượng công: **5-7 ngày công.** Copy 2 phút, việc thật sự là: giải quyết 11 va chạm (bước 8-9, ~1.5 ngày), chuyển 19 file test từ `vitest` sang `bun:test` kèm 4 file dùng `vi.*` fake timers (bước 13-14, ~1 ngày), viết package.json theo convention source-exports (bước 11-12, ~0.5 ngày), adapter `bun:sqlite` mới (bước sau, ~0.5 ngày), đọc lại docs/README (bước 16, ~0.5 ngày), gate và vòng lặp (bước 17, ~1 ngày). Task nào KHÔNG nằm trong ước lượng này: `NodeExecutionEnv` → `Bun.spawn` (963 dòng) và `storage-benchmark` → Bun bench, cả hai đã tách thành PR riêng.

### Cần người quyết

- **CHORD.** 52 import trỏ vào `@oh-my-pi/chord`, chưa tồn tại ở omp. Phải migrate `chord` TRƯỚC `durable`. Bao giờ `durable` có thể dịch chuyển không? Không — thì thiếu 14 symbol (đã đếm từ 24 câu lệnh import trong `src/`; `Change`/`Prepared`/`Tracker` đến từ `src/session/transaction.ts:2`): `Context`, `Draft`, `JsonValue`, `Op`, `Change`, `Prepared`, `Tracker`, `copyJson`, `track`, `apply`, `applyImmutableBatches`, `awaitWithContext`, `withoutAbortSignal`, `BACKGROUND_CONTEXT`. Ngoài ra test còn cần `withAbortSignal` — nó chỉ dùng ở `test/env-node.test.ts:7`, không có trong `src/`. Phải khớp đúng chu kỳ pi: `chord` phải ra trước, `durable` sau.
- **OMITTED:** ở HEAD pi-ref (d6af72e) 12 package, omp có 4 trùng tên (agent, ai, coding-agent, tui), còn 8 KHÁC tên. Task ghi 7 — 8 là đúng nếu tính `session-backends/sqlite-node` là package riêng (tên `@earendil-works/pi-session-backend-sqlite-node`), NHƯNG nó KHÔNG phụ thuộc `durable`: `dependencies` của nó chỉ có `@earendil-works/pi-ai` và `@earendil-works/pi-agent-core` (chữ "durable" trong CHANGELOG/README/SQL của nó là tính từ tiếng Anh, không phải package). Nó có thể migrate bất kỳ lúc nào, không bị `durable` chặn. Xác nhận số 7 hay 8 trước khi chốt kế hoạch chung.
- **TÁCH BIÊN CHỐT.** 51 file `src` của omp đã dùng `bun:sqlite`. `durable` thêm `storage/sqlite` với schema riêng (conversations/entries/tasks/submissions/documents) trong một DB riêng. Nếu muốn dùng chung DB với các store hiện có, sẽ phải viết migration nội bộ — tăng rủi ro gấp 2 lần. Để mặc định: DB riêng, ghi rõ trong README.
- **`NodeExecutionEnv`:** giữ `node:child_process` hay đổi sang `Bun.spawn` trong cùng PR? Đã quyết ở spec này: TÁCH RA, PR riêng. Đề nghị cho roadmap chung.
- **`test/types.test.ts` và `expectTypeOf`:** chuyển thành type test trong tsconfig hay bỏ hẳn? Đã quyết: bỏ, và ghi rõ lý do trong `test_contract`.
- **Cách chạy test khi CHƯA build `pi-natives` — ĐÃ TRẢ LỜI (đo thật 2026-09-28): KHÔNG chạy độc lập được.** Sau bước 8, `durable` import `@oh-my-pi/pi-tui/tools/streaming-output`, và chuỗi `streaming-output.ts:2-3` → `@oh-my-pi/pi-utils` ( qua `../render/sixel`) → `file-lock`/`sanitize-text` → `@oh-my-pi/pi-natives` kéo theo native addon chưa build. `bun -e 'import("@oh-my-pi/pi-tui/tools/streaming-output")'` trên máy này fail với `Failed to load pi_natives native addon for darwin-arm64`; `which ninja` → không có. KẾT LUẬN: `brew install ninja` + build `pi-natives` là bước BẮT BUỘC trước Cổng #3, không phải tuỳ chọn.
- **LICENSE:** omp đặt LICENSE cho TỪNG package (`packages/agent/LICENSE`, `packages/ai/LICENSE`) và cả root LICENSE đều ghi 'Copyright (c) 2025 Mario Zechner'. Bản LICENSE riêng cho `durable` nên dùng nguyên 21 dòng MIT của pi-ref, hay gộp thêm 3 dòng copyright của omp như root? Đề nghị: dùng nguyên 21 dòng + thêm 'Copyright (c) 2025-2026 Can Boluk' và 'Copyright (c) 2026 Stencil Labs, Inc.' cho khớp root — nhưng đây là quyết định của chủ sở hữu, không tự quyết.
- **Suy nghĩ:** `durable/CHANGELOG.md` là changelog của pi-ref, không phải của omp. Có nên giữ lịch sử của pi hay bắt đầu '## [Unreleased]' mới? Đề nghị giữ — nó là bằng chứng nguồn.
