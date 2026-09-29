## 1. `chord` — cơ chế vòng đời, nền của cả đợt migrate

**Vị trí trong thứ tự migrate:** thứ nhất trong bảy package. Đây là runtime ghép thành phần ứng dụng mà sáu package còn lại đứng trên; `durable` phụ thuộc nó. Spec gọi nó là “FIRST of the 7 new packages”, và danh sách public API của nó bị bốn package anh em dùng ngay (`pi-server`, `pi-client`, `pi-durable`, `pi-protocol`) — vì vậy nó phải đứng trước tất cả.

**Quy mô:** nguồn tại `/Users/tranquangdang21/Projects/pi-ref/packages/chord`, 62 file / 690344 byte. Trong đó 30 file nguồn / 314681 byte, 21 file test hợp đồng (19 file `.test.ts` + fixture `retention.worker.ts` + helper `helpers.ts`), 6 file benchmark bị bỏ (`test/delta-traversal.bench.ts` cùng 5 file dưới `test/delta-benchmark/`, ~87 KB) và `PLANNING.md` (41634 byte). Hai file nặng nhất là `src/delta/tracker.ts` (78059 byte) và `src/delta/index.ts` (25058 byte) — riêng hai file delta chiếm 15% toàn package (33% phần `src/`); cả thư mục `src/delta/` là 44% phần `src/`.

**Cổng đỏ được:** `bun run check:ts`, spec ghi `gate_can_fail: true`. Chi tiết ở mục *Cổng hoàn thành*.

### File cần chép

Bảng dưới liệt kê đủ 64 mục của `files_to_copy` trong spec, gồm cả `LICENSE` và `CHANGELOG.md` vốn không tồn tại ở cây nguồn. Cột “bytes” là kích thước ở cây nguồn.

| path | bytes | hành động | dòng cần sửa sau khi chép |
| --- | --- | --- | --- |
| `packages/chord/package.json` | 1571 | chép rồi sửa | name -> @oh-my-pi/chord; version 0.87.1 -> 18.3.3; author 'Earendil Works' -> {name:'Stencil Labs, Inc.', url:'https://stencil.so'}; repository.url -> git+https://github.com/can1357/oh-my-pi.git, directory 'packages/chord'; bugs.url -> .../can1357/oh-my-pi/issues; homepage -> https://omp.sh; bỏ map `exports` 5 khóa (dist/types/import/source) và thay bằng hình dạng WILDCARD của omp, KHÔNG phải 4 subpath tường minh: `{".": {types:'./src/index.ts', import:'./src/index.ts'}, "./*": {types:'./src/*.ts', import:'./src/*.ts'}, "./*.js": './src/*.ts'}` (đúng bằng `packages/omptype/package.json` và `packages/wire/package.json`; không thêm khóa `./package.json` — không package omp nào có khóa đó); main/types -> ./src/index.ts; bỏ scripts.build (lệnh build dựa trên trình biên dịch mà dự án cấm dùng) cùng clean/prepublishOnly; thêm check/check:types/lint/fix/fmt/test theo packages/omptype/package.json; devDependencies: bỏ shx 0.4.0 và vitest 4.1.9, thêm '@types/bun':'catalog:'; dependencies: giữ esbuild 0.28.2; engines -> {node:'>=20', bun:'>=1.3.14'}; files -> ['src','README.md','CHANGELOG.md','LICENSE'] (omptype không liệt kê LICENSE; giữ nó ở đây vì MIT cần nó đi kèm); sideEffects: false giữ nguyên từ nguồn (omptype không đặt khóa này). |
| `packages/chord/LICENSE` | 1069 | chép nguyên văn | KHÔNG lấy từ package nguồn — pi-ref không có LICENSE riêng cho từng package. Dùng nguyên văn `/Users/tranquangdang21/Projects/pi-ref/LICENSE`, rồi NỐI THÊM các dòng bản quyền của omp cho khớp kiểu nhà ở `packages/omptype/LICENSE`: giữ `Copyright (c) 2025 Mario Zechner` là dòng ĐẦU, rồi thêm `Copyright (c) 2025-2026 Can Bölük` và `Copyright (c) 2026 Stencil Labs, Inc.`. Bỏ dòng Zechner là hành động duy nhất làm cho bản chép này vi phạm luật — MIT đòi thông báo phải đi kèm với phần lớn mã nguồn. Bảo đảm có dòng cuối (file của pi-ref không có). |
| `packages/chord/CHANGELOG.md` | 0 | chép rồi sửa | File mới, không tồn tại ở nguồn. Tạo với `## [Unreleased]` và một dòng `### Added`: `Added @oh-my-pi/chord — application composition runtime for facets, replicated state, and remote services, migrated from @earendil-works/chord.` Theo AGENTS.md, dòng này mở đầu bằng cái người dùng được, không tự sự diễn giải nguyên nhân. |
| `packages/chord/src/index.ts` | 2072 | chép rồi sửa | 8 hậu tố `.ts`; chuyển 8 khối re-export có tên thành `export * from` theo luật barrel của AGENTS.md ('In pure index.ts barrels, use star re-exports even for single-specifier cases'); 4-space -> tab. Cảnh báo mơ hồ do export-star: `./types.ts` và `./services/wire.ts` cùng lộ ra `RemoteServiceProvider`/`RemoteServiceError`. Giải quyết bằng cách bỏ đường re-export thừa trong `types.ts`, giữ cả hai ở barrel. |
| `packages/chord/src/api.ts` | 3916 | chép rồi sửa | 5 hậu tố `.ts`; tab. |
| `packages/chord/src/types.ts` | 12039 | chép rồi sửa | 4 hậu tố `.ts`; tab; thêm chú thích ngay trên `Context` (dòng 15) nói về Context không liên quan của pi-ai, để không ai thử hợp nhất chúng. |
| `packages/chord/src/json.ts` | 4840 | chép rồi sửa | 1 hậu tố `.ts`. Không đụng logic — chính các điều kiện ném `TypeError` LÀ hợp đồng. |
| `packages/chord/src/context/index.ts` | 3763 | chép rồi sửa | 1 hậu tố `.ts`; tab; VIẾT LẠI dòng 102: `return new Promise<T>((resolve, reject) => {` thành `const { promise, resolve, reject } = Promise.withResolvers<T>();` và dựng lại thân hàm quanh nó, giữ nguyên việc gắn/tháo listener hủy cùng phần dọn dẹp tương đương `finally`. Đây là site cấu trúc promise bị cấm duy nhất của package. |
| `packages/chord/src/delta/index.ts` | 25058 | chép rồi sửa | 5 hậu tố `.ts`; tab. `RESERVED_SEGMENTS` (:131), `UnsafePathError` (:133), `assertSafePath` (:279) và `PathError` (:310) phải sống sót nguyên byte ngoại trừ thụt lề — đó là hàng rào chống ô nhiễm prototype. |
| `packages/chord/src/delta/tracker.ts` | 78059 | chép rồi sửa | 5 hậu tố `.ts`. File lớn nhất package. Thuần cơ học — không đổi logic. |
| `packages/chord/src/delta/diff.ts` | 16970 | chép rồi sửa | 2 hậu tố `.ts`. |
| `packages/chord/src/delta/apply-immutable-trusted.ts` | 4654 | chép rồi sửa | 2 hậu tố `.ts`. Không đổi public. Trong lúc chép, xác nhận mọi call site đều truyền vào op đã qua `assertSafePath` — module này cố ý bỏ qua bước kiểm lại. |
| `packages/chord/src/delta/revision-validator.ts` | 3007 | chép rồi sửa | 1 hậu tố `.ts`. |
| `packages/chord/src/delta/draft.ts` | 386 | chép nguyên văn | Chỉ có type, 10 dòng, không import — file src duy nhất đã sạch sẵn. |
| `packages/chord/src/delta/README.md` | 10531 | chép rồi sửa | 3 lần `@earendil-works/chord/delta` -> `@oh-my-pi/chord/delta` (dòng 4, 10, 71) và bỏ hậu tố `.ts` khỏi hai specifier import ví dụ. Được phát hành qua `files` trong package.json nên nó đi theo bản cài đặt. |
| `packages/chord/src/facets/host.ts` | 32110 | chép rồi sửa | 8 hậu tố `.ts`. Vòng rút effect ở :125-142 giữ nguyên ngữ nghĩa — thứ tự ngược, try/catch cho từng effect, `AggregateError` khi >1. KHÔNG hạ thấp nó thành log-rồi-tiếp-tục: thay đổi đó thuộc về W2 trong coding-agent, không thuộc chỗ này. |
| `packages/chord/src/facets/loader.ts` | 324 | chép rồi sửa | 1 hậu tố `.ts`. |
| `packages/chord/src/services/provider.ts` | 22333 | chép rồi sửa | 5 hậu tố `.ts`. |
| `packages/chord/src/services/consumer.ts` | 21879 | chép rồi sửa | 7 hậu tố `.ts`. |
| `packages/chord/src/services/state.ts` | 11569 | chép rồi sửa | 5 hậu tố `.ts`. |
| `packages/chord/src/services/wire.ts` | 9020 | chép rồi sửa | 2 hậu tố `.ts`. 11 hàm parse/create là hợp đồng wire xuyên package — hành vi chấp nhận/từ chối không đổi. |
| `packages/chord/src/services/state-codec.ts` | 5010 | chép rồi sửa | 3 hậu tố `.ts`. |
| `packages/chord/src/services/instances.ts` | 4244 | chép rồi sửa | 2 hậu tố `.ts`. |
| `packages/chord/src/services/handle.ts` | 3468 | chép rồi sửa | 0 hậu tố `.ts`. |
| `packages/chord/src/services/errors.ts` | 785 | chép nguyên văn | Không import, không chuỗi scope, đã dùng tab sẵn (15 dòng thụt lề bằng tab, 0 dòng bằng khoảng trắng) — chép nguyên văn được, kể cả thụt lề. |
| `packages/chord/src/services/loopback.ts` | 653 | chép rồi sửa | 2 hậu tố `.ts`. |
| `packages/chord/src/services/state-internals.ts` | 800 | chép rồi sửa | 2 hậu tố `.ts`. |
| `packages/chord/src/node/bundle.ts` | 8876 | chép rồi sửa | 1 hậu tố `.ts`; dòng 97: cả `@earendil-works/chord` và `@earendil-works/chord/*` trong mảng `external` của esbuild -> `@oh-my-pi/chord` / `@oh-my-pi/chord/*`; dòng 118: `Awaited<ReturnType<typeof build>>` -> kiểu esbuild có tên (xem mục *Dependency mới* — esbuild re-export kiểu kết quả của nó; import ở top-level, tuyệt đối không import inline). |
| `packages/chord/src/node/bundle-loader.ts` | 16573 | chép rồi sửa | 2 hậu tố `.ts`; dòng 329/330/333: ba phép so sánh `@earendil-works/chord` trong bộ phân giải specifier -> `@oh-my-pi/chord`. |
| `packages/chord/src/node/package.ts` | 9232 | chép rồi sửa | 1 hậu tố `.ts`; dòng 57 và 182: `Awaited<ReturnType<typeof stat>>` -> `import type { Stats } from "node:fs"` ở đầu file, dùng như `let x: Stats`. |
| `packages/chord/src/node/manifest.ts` | 1514 | chép nguyên văn | Chỉ hằng số. Năm chuỗi giá trị KHÔNG được viết lại — xem mục *Va chạm với thứ omp đã có*. |
| `packages/chord/src/node.ts` | 610 | chép rồi sửa | 4 hậu tố `.ts`; chuyển hai khối re-export có tên thành `export * from`. |
| `packages/chord/src/bundler.ts` | 386 | chép rồi sửa | 5 hậu tố `.ts`; chuyển sang `export * from` theo luật barrel. |
| `packages/chord/README.md` | 10466 | chép rồi sửa | 9 lần `@earendil-works/chord` -> `@oh-my-pi/chord`; bỏ `.ts` khỏi các specifier import ví dụ; thay phần mở đầu cài đặt/import riêng của pi bằng phiên bản của omp; thêm dòng ghi công ở đầu: 'Migrated from earendil-works/pi (MIT, Copyright (c) 2025 Mario Zechner).' |
| `packages/chord/test/delta-tracker/tracker.test.ts` | 56112 | chép rồi sửa | `from "vitest"` -> `from "bun:test"`. 73 khối describe/it — lưới hồi quy của CRDT. File test có giá trị cao nhất trong toàn bộ migration. |
| `packages/chord/test/services.test.ts` | 27609 | chép rồi sửa | vitest -> bun:test. 23 khối. |
| `packages/chord/test/facets.test.ts` | 20955 | chép rồi sửa | vitest -> bun:test. 15 khối. Chứa các khẳng định về vòng rút khi dispose mà M1 W2 từng muốn. |
| `packages/chord/test/delta.test.ts` | 17921 | chép rồi sửa | vitest -> bun:test. 50 khối. |
| `packages/chord/test/state.test.ts` | 16354 | chép rồi sửa | vitest -> bun:test. 21 khối. |
| `packages/chord/test/delta-apply-immutable.test.ts` | 9133 | chép rồi sửa | vitest -> bun:test. Lưới hồi quy ô nhiễm prototype — khẳng định các lần từ chối `RESERVED_SEGMENTS` vẫn nổ. |
| `packages/chord/test/bundle.test.ts` | 10829 | chép rồi sửa | vitest -> bun:test; 3 lần `@earendil-works/chord` -> `@oh-my-pi/chord` (các khẳng định về những gì bundler đánh dấu external phải bám theo scope mới). File này còn cần có binary esbuild — là file test duy nhất không thể xanh trước khi `bun install` đã tải esbuild. |
| `packages/chord/test/facet-loader.test.ts` | 11801 | chép rồi sửa | vitest -> bun:test. 10 khối. |
| `packages/chord/test/state-diff.test.ts` | 10268 | chép rồi sửa | vitest -> bun:test. 23 khối. |
| `packages/chord/test/delta-diff.test.ts` | 10826 | chép rồi sửa | vitest -> bun:test. 24 khối. |
| `packages/chord/test/service-wire.test.ts` | 9469 | chép rồi sửa | vitest -> bun:test. 8 khối. Canh giữ 11 parser trên đầu vào độc hại. |
| `packages/chord/test/delta-tracker/retention.test.ts` | 992 | chép rồi sửa | vitest -> bun:test; bỏ hậu tố `.ts` trong `"./retention.worker.ts"` -> `"./retention.worker"`; thay `node:child_process` (AGENTS.md cấm, dòng 81 đưa nó vào cột "Not") bằng `Bun.spawnSync(["--expose-gc", workerPath, scenario], { stdout: "pipe", stderr: "pipe" })` rồi đọc qua `.stdout`/`.stderr` — dưới bun, `process.execPath` chính là bun, và cờ `--expose-gc` đã thử chạy được (`globalThis.gc` là `function`) nên không cần đổi. 2 khối. |
| `packages/chord/test/delta-tracker/retention.worker.ts` | 11910 | chép rồi sửa | worker spawn phải theo luật của omp (`hostEntry()` với nhánh fallback trực tiếp module). Yêu cầu `declareWorkerHostEntry` của AGENTS.md giới hạn cho worker production; đây là fixture test nên fallback `new Worker(new URL(...), {type:'module'})` trực tiếp là chấp nhận được — nhưng hãy chốt câu hỏi bảng dispatch trong mục *Cần người quyết* trước khi chọn. |
| `packages/chord/test/state-draft.test.ts` | 5006 | chép rồi sửa | vitest -> bun:test. 9 khối. |
| `packages/chord/test/state-fuzz.test.ts` | 4282 | chép rồi sửa | vitest -> bun:test. 1 khối. Fuzzing — khẳng định kết quả CÓ BIÊN hoặc lỗi được nêu ra, không bao giờ là `not.toThrow()` trần. |
| `packages/chord/test/context.test.ts` | 3546 | chép rồi sửa | vitest -> bun:test. 6 khối. Vẫn phải xanh sau khi viết lại bằng `Promise.withResolvers`. |
| `packages/chord/test/json.test.ts` | 2679 | chép rồi sửa | vitest -> bun:test. 7 khối. |
| `packages/chord/test/delta-clone.test.ts` | 2130 | chép rồi sửa | vitest -> bun:test. 5 khối. |
| `packages/chord/test/state-value.test.ts` | 1524 | chép rồi sửa | vitest -> bun:test. 4 khối. |
| `packages/chord/test/boundary.test.ts` | 1504 | chép rồi sửa | vitest -> bun:test; 2 kiểm tra tiền tố `@earendil-works/pi-` (dòng 15 và 26) -> `@oh-my-pi/pi-`. File này duyệt package và khẳng định không specifier scope thượng nguồn nào lọt vào một entry đã phát hành — đây là một cổng cấu trúc thật, và KHÔNG vi phạm lệnh cấm source-grep vì nó là kiểm tra ranh giới phân giải import, không phải khẳng định về văn bản mã. |
| `packages/chord/test/helpers.ts` | 78 | chép rồi sửa | Bỏ hậu tố `.ts`: `from "../src/services/loopback.ts"` -> `from "../src/services/loopback"`. Ngoài ra không còn gì để đổi. |
| `packages/chord/PLANNING.md` | 41634 | bỏ | n/a — không chép. |
| `packages/chord/tsconfig.build.json` | 209 | bỏ | n/a — không chép. omp không bao giờ chạy trình biên dịch bị cấm; `packages/omptype` giao một `tsconfig.json` 133 byte cho `tsgo --noEmit` thay thế. Hãy viết file đó. |
| `packages/chord/test/delta-traversal.bench.ts` | 6849 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/benchmark.ts` | 5535 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/benchmark.worker.ts` | 15065 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/conversation-view-benchmark.ts` | 9737 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/conversation-view-benchmark.worker.ts` | 39131 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/memory-benchmark.ts` | 4404 | bỏ | n/a — không chép trong M1. |
| `packages/chord/test/delta-benchmark/memory-benchmark.worker.ts` | 6134 | bỏ | n/a — không chép trong M1. |

Về thụt lề: trong toàn package chỉ 5/29 file `.ts` dưới `src/` thật sự dùng thụt lề khoảng trắng và cần chuyển sang tab — `api.ts`, `context/index.ts`, `delta/index.ts`, `index.ts`, `types.ts` (tổng 98 dòng). 24 file `src/` còn lại VÀ cả 21 file test đã là tab sẵn, nên bảng không nhắc `tab` ở những hàng đó: `oxfmt` không đổi gì.

### Bề mặt công khai

148 symbol. `already_exists_in_omp` trong spec là kết quả quét 0-hit trên toàn bộ `packages/**/*.ts`; chỉ hai symbol từng có mặt: `Context` và `JsonValue` (mục *Va chạm*). 147/148 neo khớp đúng với nguồn; hàng thứ 148 (`JsonRevisionValidator`) là chỗ duy nhất phải SỬA SO VỚ SPEC — `public_api` của spec ghi nó là `validateRevision` @ `revision-validator.ts:1`, nhưng `validateRevision` xuất hiện 0 lần trong toàn pi-ref và file đó chỉ export đúng một thứ: `export class JsonRevisionValidator` ở dòng 8. Cột dưới đây ghi theo NGUỒN.

| symbol | loại | neo ở nguồn | neo ở omp | đã có sẵn ở omp chưa |
| --- | --- | --- | --- | --- |
| `createFacetHost` | function | `packages/chord/src/api.ts:22` | `packages/chord/src/api.ts:22` | chưa |
| `createStaticFacetLoader` | function | `packages/chord/src/api.ts:32` | `packages/chord/src/api.ts:32` | chưa |
| `combineFacetLoaders` | function | `packages/chord/src/api.ts:41` | `packages/chord/src/api.ts:41` | chưa |
| `defineFacet` | function | `packages/chord/src/api.ts:69` | `packages/chord/src/api.ts:69` | chưa |
| `defineService` | function | `packages/chord/src/api.ts:73-80` | `packages/chord/src/api.ts:73-80` | chưa |
| `createRemoteServiceBinding` | function | `packages/chord/src/api.ts:87` | `packages/chord/src/api.ts:87` | chưa |
| `replicatedState` | function | `packages/chord/src/api.ts:91-100` | `packages/chord/src/api.ts:91-100` | chưa |
| `Draft` | type | `packages/chord/src/delta/draft.ts:2` | `packages/chord/src/delta/draft.ts:2` | chưa |
| `CopyJsonOptions` | type | `packages/chord/src/json.ts:10` | `packages/chord/src/json.ts:10` | chưa |
| `copyJson` | function | `packages/chord/src/json.ts:16` | `packages/chord/src/json.ts:16` | chưa |
| `isJsonValue` | function | `packages/chord/src/json.ts:74` | `packages/chord/src/json.ts:74` | chưa |
| `REMOTE_SERVICE_ERROR_CODES` | const | `packages/chord/src/services/errors.ts:1` | `packages/chord/src/services/errors.ts:1` | chưa |
| `RemoteServiceErrorCode` | type | `packages/chord/src/services/errors.ts:12` | `packages/chord/src/services/errors.ts:12` | chưa |
| `isRemoteServiceErrorCode` | function | `packages/chord/src/services/errors.ts:14` | `packages/chord/src/services/errors.ts:14` | chưa |
| `RemoteServiceError` | class | `packages/chord/src/services/errors.ts:18` | `packages/chord/src/services/errors.ts:18` | chưa |
| `ServiceUpdatePublisher` | type | `packages/chord/src/services/provider.ts:66` | `packages/chord/src/services/provider.ts:66` | chưa |
| `RemoteServiceEndpoint` | interface | `packages/chord/src/services/provider.ts:73` | `packages/chord/src/services/provider.ts:73` | chưa |
| `RemoteServiceProvider` | class | `packages/chord/src/services/provider.ts:78` | `packages/chord/src/services/provider.ts:78` | chưa |
| `createRemoteServiceEndpoint` | function | `packages/chord/src/services/provider.ts:532` | `packages/chord/src/services/provider.ts:532` | chưa |
| `validateRemoteServiceImplementation` | function | `packages/chord/src/services/provider.ts:570` | `packages/chord/src/services/provider.ts:570` | chưa |
| `ServiceStateEncoder` | interface | `packages/chord/src/services/state-codec.ts:11` | `packages/chord/src/services/state-codec.ts:11` | chưa |
| `ServiceStateDecoder` | interface | `packages/chord/src/services/state-codec.ts:17` | `packages/chord/src/services/state-codec.ts:17` | chưa |
| `createServiceStateEncoder` | function | `packages/chord/src/services/state-codec.ts:60` | `packages/chord/src/services/state-codec.ts:60` | chưa |
| `createServiceStateDecoder` | function | `packages/chord/src/services/state-codec.ts:90` | `packages/chord/src/services/state-codec.ts:90` | chưa |
| `createServiceCatalogueCall` | function | `packages/chord/src/services/wire.ts:54` | `packages/chord/src/services/wire.ts:54` | chưa |
| `createServiceSubscribeCall` | function | `packages/chord/src/services/wire.ts:58` | `packages/chord/src/services/wire.ts:58` | chưa |
| `createServiceUnsubscribeCall` | function | `packages/chord/src/services/wire.ts:62` | `packages/chord/src/services/wire.ts:62` | chưa |
| `decodeServiceControlCall` | function | `packages/chord/src/services/wire.ts:66` | `packages/chord/src/services/wire.ts:66` | chưa |
| `parseServiceCall` | function | `packages/chord/src/services/wire.ts:89` | `packages/chord/src/services/wire.ts:89` | chưa |
| `parseServiceCatalogue` | function | `packages/chord/src/services/wire.ts:99` | `packages/chord/src/services/wire.ts:99` | chưa |
| `parseServiceSubscriptionSnapshot` | function | `packages/chord/src/services/wire.ts:113` | `packages/chord/src/services/wire.ts:113` | chưa |
| `parseWireServiceSubscriptionSnapshot` | function | `packages/chord/src/services/wire.ts:118` | `packages/chord/src/services/wire.ts:118` | chưa |
| `parseServiceProviderUpdate` | function | `packages/chord/src/services/wire.ts:123` | `packages/chord/src/services/wire.ts:123` | chưa |
| `parseWireServiceProviderUpdate` | function | `packages/chord/src/services/wire.ts:128` | `packages/chord/src/services/wire.ts:128` | chưa |
| `ServiceControlCall` | type | `packages/chord/src/services/wire.ts:44` | `packages/chord/src/services/wire.ts:44` | chưa |
| `WireServiceMemberSnapshot` | type | `packages/chord/src/services/wire.ts:11` | `packages/chord/src/services/wire.ts:11` | chưa |
| `WireServiceInstanceSnapshot` | type | `packages/chord/src/services/wire.ts:15` | `packages/chord/src/services/wire.ts:15` | chưa |
| `WireServiceSubscriptionSnapshot` | type | `packages/chord/src/services/wire.ts:20` | `packages/chord/src/services/wire.ts:20` | chưa |
| `WireServiceProviderUpdate` | type | `packages/chord/src/services/wire.ts:26` | `packages/chord/src/services/wire.ts:26` | chưa |
| `ContextKey` | interface | `packages/chord/src/types.ts:8` | `packages/chord/src/types.ts:8` | chưa |
| `Context` | interface | `packages/chord/src/types.ts:15` | `packages/chord/src/types.ts:15` | **rồi** — xem *Va chạm* |
| `JsonValue` | type | `packages/chord/src/types.ts:21` | `packages/chord/src/types.ts:21` | **rồi** — xem *Va chạm* |
| `JsonRepresentation` | type | `packages/chord/src/types.ts:26` | `packages/chord/src/types.ts:26` | chưa |
| `ReplicatedState` | interface | `packages/chord/src/types.ts:43` | `packages/chord/src/types.ts:43` | chưa |
| `MutableReplicatedState` | interface | `packages/chord/src/types.ts:53` | `packages/chord/src/types.ts:53` | chưa |
| `ReplicatedStateDelivery` | interface | `packages/chord/src/types.ts:38` | `packages/chord/src/types.ts:38` | chưa |
| `ReplicatedStateSource` | interface | `packages/chord/src/types.ts:99` | `packages/chord/src/types.ts:99` | chưa |
| `ReplicatedStateSourceFrame` | interface | `packages/chord/src/types.ts:68` | `packages/chord/src/types.ts:68` | chưa |
| `ReplicatedStateSourceAttachment` | interface | `packages/chord/src/types.ts:78` | `packages/chord/src/types.ts:78` | chưa |
| `ReplicatedStateSourceOptions` | type | `packages/chord/src/types.ts:103` | `packages/chord/src/types.ts:103` | chưa |
| `AttachedReplicatedState` | interface | `packages/chord/src/types.ts:109` | `packages/chord/src/types.ts:109` | chưa |
| `ServiceMode` | type | `packages/chord/src/types.ts:117` | `packages/chord/src/types.ts:117` | chưa |
| `Service` | interface | `packages/chord/src/types.ts:120` | `packages/chord/src/types.ts:120` | chưa |
| `RemoteServiceContract` | type | `packages/chord/src/types.ts:167` | `packages/chord/src/types.ts:167` | chưa |
| `ServiceSpawner` | interface | `packages/chord/src/types.ts:169` | `packages/chord/src/types.ts:169` | chưa |
| `RemoteServices` | interface | `packages/chord/src/types.ts:173` | `packages/chord/src/types.ts:173` | chưa |
| `ServiceCatalogueEntry` | type | `packages/chord/src/types.ts:181` | `packages/chord/src/types.ts:181` | chưa |
| `ServiceInstanceAddress` | type | `packages/chord/src/types.ts:186` | `packages/chord/src/types.ts:186` | chưa |
| `ServiceMemberSnapshot` | type | `packages/chord/src/types.ts:191` | `packages/chord/src/types.ts:191` | chưa |
| `ServiceInstanceSnapshot` | type | `packages/chord/src/types.ts:195` | `packages/chord/src/types.ts:195` | chưa |
| `ServiceSubscriptionSnapshot` | type | `packages/chord/src/types.ts:200` | `packages/chord/src/types.ts:200` | chưa |
| `ServiceProviderUpdate` | type | `packages/chord/src/types.ts:206` | `packages/chord/src/types.ts:206` | chưa |
| `ServiceCall` | type | `packages/chord/src/types.ts:219` | `packages/chord/src/types.ts:219` | chưa |
| `ServiceSubscription` | interface | `packages/chord/src/types.ts:227` | `packages/chord/src/types.ts:227` | chưa |
| `RemoteServiceTransport` | interface | `packages/chord/src/types.ts:241` | `packages/chord/src/types.ts:241` | chưa |
| `RemoteServiceBindingOptions` | interface | `packages/chord/src/types.ts:251` | `packages/chord/src/types.ts:251` | chưa |
| `RemoteServiceBinding` | interface | `packages/chord/src/types.ts:259` | `packages/chord/src/types.ts:259` | chưa |
| `FacetEnvironment` | interface | `packages/chord/src/types.ts:263` | `packages/chord/src/types.ts:263` | chưa |
| `Facet` | interface | `packages/chord/src/types.ts:285` | `packages/chord/src/types.ts:285` | chưa |
| `RemoteServiceSource` | interface | `packages/chord/src/types.ts:290` | `packages/chord/src/types.ts:290` | chưa |
| `FacetOptions` | interface | `packages/chord/src/types.ts:301` | `packages/chord/src/types.ts:301` | chưa |
| `FacetHost` | interface | `packages/chord/src/types.ts:307` | `packages/chord/src/types.ts:307` | chưa |
| `LoadedFacets` | interface | `packages/chord/src/types.ts:314` | `packages/chord/src/types.ts:314` | chưa |
| `FacetLoader` | interface | `packages/chord/src/types.ts:319` | `packages/chord/src/types.ts:319` | chưa |
| `BACKGROUND_CONTEXT` | const | `packages/chord/src/context/index.ts:55` | `packages/chord/src/context/index.ts:55` | chưa |
| `TODO_CONTEXT` | const | `packages/chord/src/context/index.ts:56` | `packages/chord/src/context/index.ts:56` | chưa |
| `createContextKey` | function | `packages/chord/src/context/index.ts:58` | `packages/chord/src/context/index.ts:58` | chưa |
| `withContextValue` | function | `packages/chord/src/context/index.ts:63` | `packages/chord/src/context/index.ts:63` | chưa |
| `withAbortSignal` | function | `packages/chord/src/context/index.ts:71` | `packages/chord/src/context/index.ts:71` | chưa |
| `withoutAbortSignal` | function | `packages/chord/src/context/index.ts:78` | `packages/chord/src/context/index.ts:78` | chưa |
| `withCancel` | function | `packages/chord/src/context/index.ts:83` | `packages/chord/src/context/index.ts:83` | chưa |
| `awaitWithContext` | function | `packages/chord/src/context/index.ts:98` | `packages/chord/src/context/index.ts:98` | chưa |
| `Seg` | type | `packages/chord/src/delta/index.ts:14` | `packages/chord/src/delta/index.ts:14` | chưa |
| `Path` | type | `packages/chord/src/delta/index.ts:15` | `packages/chord/src/delta/index.ts:15` | chưa |
| `NonEmptyPath` | type | `packages/chord/src/delta/index.ts:16` | `packages/chord/src/delta/index.ts:16` | chưa |
| `PathRef` | type | `packages/chord/src/delta/index.ts:19` | `packages/chord/src/delta/index.ts:19` | chưa |
| `Op` | type | `packages/chord/src/delta/index.ts:32` | `packages/chord/src/delta/index.ts:32` | chưa |
| `WireOp` | type | `packages/chord/src/delta/index.ts:52` | `packages/chord/src/delta/index.ts:52` | chưa |
| `isReplace` | const | `packages/chord/src/delta/index.ts:70` | `packages/chord/src/delta/index.ts:70` | chưa |
| `isBase` | const | `packages/chord/src/delta/index.ts:76` | `packages/chord/src/delta/index.ts:76` | chưa |
| `overlap` | function | `packages/chord/src/delta/index.ts:87` | `packages/chord/src/delta/index.ts:87` | chưa |
| `diffRevisions` | function | `packages/chord/src/delta/index.ts:114` | `packages/chord/src/delta/diff.ts:1` | chưa |
| `RESERVED_SEGMENTS` | const | `packages/chord/src/delta/index.ts:131` | `packages/chord/src/delta/index.ts:131` | chưa |
| `UnsafePathError` | class | `packages/chord/src/delta/index.ts:133` | `packages/chord/src/delta/index.ts:133` | chưa |
| `assertValidOp` | function | `packages/chord/src/delta/index.ts:152` | `packages/chord/src/delta/index.ts:152` | chưa |
| `assertValidWireOp` | function | `packages/chord/src/delta/index.ts:211` | `packages/chord/src/delta/index.ts:211` | chưa |
| `assertSafePath` | function | `packages/chord/src/delta/index.ts:279` | `packages/chord/src/delta/index.ts:279` | chưa |
| `PathError` | class | `packages/chord/src/delta/index.ts:310` | `packages/chord/src/delta/index.ts:310` | chưa |
| `apply` | function | `packages/chord/src/delta/index.ts:326` | `packages/chord/src/delta/index.ts:326` | chưa |
| `applyImmutable` | function | `packages/chord/src/delta/index.ts:409` | `packages/chord/src/delta/index.ts:409` | chưa |
| `applyImmutableBatches` | function | `packages/chord/src/delta/index.ts:419` | `packages/chord/src/delta/index.ts:419` | chưa |
| `Encoder` | interface | `packages/chord/src/delta/index.ts:515` | `packages/chord/src/delta/index.ts:515` | chưa |
| `encoder` | function | `packages/chord/src/delta/index.ts:523` | `packages/chord/src/delta/index.ts:523` | chưa |
| `Decoder` | interface | `packages/chord/src/delta/index.ts:618` | `packages/chord/src/delta/index.ts:618` | chưa |
| `decoder` | function | `packages/chord/src/delta/index.ts:622` | `packages/chord/src/delta/index.ts:622` | chưa |
| `Tracker` | interface | `packages/chord/src/delta/tracker.ts:135` | `packages/chord/src/delta/tracker.ts:135` | chưa |
| `Change` | type | `packages/chord/src/delta/tracker.ts:129` | `packages/chord/src/delta/tracker.ts:129` | chưa |
| `Prepared` | type | `packages/chord/src/delta/tracker.ts:121` | `packages/chord/src/delta/tracker.ts:121` | chưa |
| `track` | function | `packages/chord/src/delta/tracker.ts:321` | `packages/chord/src/delta/tracker.ts:321` | chưa |
| `bundleFacets` | function | `packages/chord/src/bundler.ts:6` | `packages/chord/src/bundler.ts:6` | chưa |
| `bundleFacetPackage` | function | `packages/chord/src/bundler.ts:9` | `packages/chord/src/bundler.ts:9` | chưa |
| `BundleFacetsOptions` | type | `packages/chord/src/bundler.ts:2` | `packages/chord/src/bundler.ts:2` | chưa — tên re-export, định nghĩa ở `src/node/bundle.ts` |
| `BundleFacetsResult` | type | `packages/chord/src/bundler.ts:3` | `packages/chord/src/bundler.ts:3` | chưa — tên re-export, định nghĩa ở `src/node/bundle.ts` |
| `FacetBundlePlatform` | type | `packages/chord/src/bundler.ts:4` | `packages/chord/src/bundler.ts:4` | chưa — tên re-export, định nghĩa ở `src/node/bundle.ts` |
| `BundleFacetPackageOptions` | type | `packages/chord/src/bundler.ts:8` | `packages/chord/src/bundler.ts:8` | chưa |
| `BundleFacetPackageResult` | type | `packages/chord/src/bundler.ts:8` | `packages/chord/src/bundler.ts:8` | chưa |
| `createFacetBundleLoader` | function | `packages/chord/src/node.ts:8` | `packages/chord/src/node.ts:8` | chưa |
| `createFacetBundleArtifactLoader` | function | `packages/chord/src/node.ts:7` | `packages/chord/src/node.ts:7` | chưa |
| `readFacetBundleArtifact` | function | `packages/chord/src/node.ts:9` | `packages/chord/src/node.ts:9` | chưa |
| `readFacetBundleManifest` | function | `packages/chord/src/node.ts:10` | `packages/chord/src/node.ts:10` | chưa |
| `FACET_BUNDLE_FORMAT` | const | `packages/chord/src/node/manifest.ts:1` | `packages/chord/src/node/manifest.ts:1` | chưa |
| `FACET_BUNDLE_FORMAT_VERSION` | const | `packages/chord/src/node/manifest.ts:2` | `packages/chord/src/node/manifest.ts:2` | chưa |
| `FACET_BUNDLE_MANIFEST_FILE` | const | `packages/chord/src/node/manifest.ts:3` | `packages/chord/src/node/manifest.ts:3` | chưa |
| `FACET_BUNDLE_ARTIFACT_FORMAT` | const | `packages/chord/src/node/manifest.ts:4` | `packages/chord/src/node/manifest.ts:4` | chưa |
| `FACET_BUNDLE_ARTIFACT_FORMAT_VERSION` | const | `packages/chord/src/node/manifest.ts:5` | `packages/chord/src/node/manifest.ts:5` | chưa |
| `FacetBundleEntry` | interface | `packages/chord/src/node/manifest.ts:7` | `packages/chord/src/node/manifest.ts:7` | chưa |
| `FacetBundleManifest` | interface | `packages/chord/src/node/manifest.ts:18` | `packages/chord/src/node/manifest.ts:18` | chưa |
| `FacetBundlePlugin` | interface | `packages/chord/src/node/manifest.ts:25` | `packages/chord/src/node/manifest.ts:25` | chưa |
| `FacetBundleArtifact` | interface | `packages/chord/src/node/manifest.ts:31` | `packages/chord/src/node/manifest.ts:31` | chưa |
| `FacetBundleLoaderOptions` | type | `packages/chord/src/node.ts:4` | `packages/chord/src/node.ts:4` | chưa — tên re-export, định nghĩa ở `src/node/bundle-loader.ts` |
| `FacetBundleArtifactLoaderOptions` | type | `packages/chord/src/node.ts:2` | `packages/chord/src/node.ts:2` | chưa — tên re-export, định nghĩa ở `src/node/bundle-loader.ts` |
| `FacetBundleExternalResolver` | type | `packages/chord/src/node.ts:3` | `packages/chord/src/node.ts:3` | chưa — tên re-export, định nghĩa ở `src/node/bundle-loader.ts` |
| `FacetKernel` | class | `packages/chord/src/facets/host.ts:340` | `packages/chord/src/facets/host.ts:340` | chưa |
| `disposeLoadedFacets` | function | `packages/chord/src/facets/loader.ts:3` | `packages/chord/src/facets/loader.ts:3` | chưa |
| `ServiceSlot` | class | `packages/chord/src/services/handle.ts:9` | `packages/chord/src/services/handle.ts:9` | chưa |
| `InstanceDirectory` | class | `packages/chord/src/services/instances.ts:18` | `packages/chord/src/services/instances.ts:18` | chưa |
| `InstanceDirectoryEntry` | interface | `packages/chord/src/services/instances.ts:4` | `packages/chord/src/services/instances.ts:4` | chưa |
| `createLoopbackServiceTransport` | function | `packages/chord/src/services/loopback.ts:5` | `packages/chord/src/services/loopback.ts:5` | chưa |
| `RemoteServiceBindingImpl` | class | `packages/chord/src/services/consumer.ts:425` | `packages/chord/src/services/consumer.ts:425` | chưa |
| `MutableReplicatedStateImpl` | class | `packages/chord/src/services/state.ts:105` | `packages/chord/src/services/state.ts:105` | chưa |
| `ReplicatedStateReplica` | class | `packages/chord/src/services/state.ts:265` | `packages/chord/src/services/state.ts:265` | chưa |
| `attachReplicatedStateSource` | function | `packages/chord/src/services/state.ts:245` | `packages/chord/src/services/state.ts:245` | chưa |
| `serviceDeliveryContext` | function | `packages/chord/src/services/state.ts:345` | `packages/chord/src/services/state.ts:345` | chưa |
| `ReplicatedStateInternals` | interface | `packages/chord/src/services/state-internals.ts:4` | `packages/chord/src/services/state-internals.ts:4` | chưa |
| `registerReplicatedStateInternals` | function | `packages/chord/src/services/state-internals.ts:12` | `packages/chord/src/services/state-internals.ts:12` | chưa |
| `getReplicatedStateInternals` | function | `packages/chord/src/services/state-internals.ts:16` | `packages/chord/src/services/state-internals.ts:16` | chưa |
| `applyImmutableTrusted` | function | `packages/chord/src/delta/apply-immutable-trusted.ts:15` | `packages/chord/src/delta/apply-immutable-trusted.ts:15` | chưa |
| `JsonRevisionValidator` | class | `packages/chord/src/delta/revision-validator.ts:8` | `packages/chord/src/delta/revision-validator.ts:8` | chưa |

Bốn package anh em đứng trên nền này và import đúng những symbol sau, nên chúng là hợp đồng chéo gói: `pi-server` lấy `REMOTE_SERVICE_ERROR_CODES`, `ServiceStateEncoder`, `createServiceStateEncoder`, `decodeServiceControlCall`, `parseServiceCall`, `parseServiceSubscriptionSnapshot`, `parseServiceProviderUpdate`, `ServiceProviderUpdate`, `ServiceCall`; `pi-client` lấy `ServiceStateDecoder`, `createServiceStateDecoder`, `createServiceCatalogueCall`, `createServiceSubscribeCall`, `parseServiceCall`, và gọi vào phần cơ máy đứng sau `createRemoteServiceBinding`; `pi-durable` lấy `Op`, `track`, `apply`, `applyImmutable`, `applyImmutableBatches`, `RemoteServiceContract`, `BACKGROUND_CONTEXT`, `withoutAbortSignal`, `awaitWithContext`; `pi-protocol` lấy `JsonValue` và `isJsonValue`. Trong số đó vài symbol không đi qua barrel gốc mà chỉ là module nội bộ — `validateRemoteServiceImplementation`, `RemoteServiceContract`, `FacetKernel`, `disposeLoadedFacets` — nhưng vẫn được `test/services.test.ts` và `test/facets.test.ts` gọi tới, nên chúng phải được chép.

Vài quy mô đáng ghi nhớ: `RemoteServiceProvider` là 616 dòng (sổ đăng ký dịch vụ phía server), `RemoteServiceBindingImpl` là 660 dòng (file services lớn nhất), `Tracker` đứng sau 2205 dòng triển khai, `applyImmutableTrusted` là 128 dòng và không export gì qua barrel.

### Dependency mới

| package | phiên bản | license | đã có ở omp chưa |
| --- | --- | --- | --- |
| `esbuild` | `0.28.2` | MIT | chưa |
| `@types/bun` | `catalog:` | MIT | **rồi** |

**`esbuild` 0.28.2** là dependency runtime ngoài DUY NHẤT của cả package, và nó được import ở đúng một file: `src/node/bundle.ts:4` `import { type BuildOptions, build, type Message } from "esbuild"`. Mọi import ngoài khác trong `src/` đều là builtin của node (`node:crypto`, `node:fs/promises`, `node:module`, `node:os`, `node:path`, `node:url`, `node:vm`). Hôm nay đã xác minh nó vắng: không có `"esbuild"` trong package.json gốc hay bất kỳ `packages/*/package.json` nào, và `ls -d node_modules/esbuild` trả về “No such file or directory”. Dấu vết duy nhất trong `bun.lock` là dòng 1455, nơi esbuild xuất hiện như optional peer của vite (`peerDependencies: {..., "esbuild": "^0.27.0 || ^0.28.0", ...}`, `optionalPeers: [..., "esbuild", ...]`) — được khai báo, chưa bao giờ cài. 0.28.2 thỏa mãn khoảng đó, nên thêm nó không tạo xung đột phiên bản với vite.

**Cái KHÔNG thêm:**

- `@types/node` — nhu cầu import `node:` của chord được `@types/bun` trong catalog gốc của repo thay thế, nên không thêm.
- `vitest` 4.1.9 — bị gỡ khỏi devDependencies; toàn bộ 21 file test đổi sang `bun:test`.
- `shx` 0.4.0 — bị gỡ khỏi devDependencies; chỉ phục vụ script `clean` mà omp không dùng.
- Mọi script build dựa trên trình biên dịch bị cấm — bị xóa; typecheck chạy qua `tsgo -p tsconfig.json --noEmit`.
- 6 file benchmark dưới `test/delta-benchmark/` cùng `test/delta-traversal.bench.ts` và `PLANNING.md` — không phải dependency nhưng là ~87 KB nằm ngoài phạm vi; xem *Cần người quyết*.

### Va chạm với thứ omp đã có

Mục quan trọng nhất. Sáu mục dưới đây, và cả sáu đều là QUYẾT ĐỊNH — kể cả những cái được giải quyết bằng “giữ cả hai bên, không đổi tên”.

| cái gì | neo phía pi | neo phía omp | cách giải quyết |
| --- | --- | --- | --- |
| Vòng rút dọn disposer — XUNG ĐỘT NGỮ NGHĨA, và tiền đề của M1 W2 là sai. Ghi chú nhiệm vụ nói M1 W1/W2 “đã port thủ công drain thứ tự ngược + cô lập lỗi từ packages/chord/src/facets/host.ts:125-142”. Đã xác minh là sai theo hai cách. (1) Bản ghi `plan_corrections` của chính W2 ghi claim đó là verdict 'unverifiable — the reference does not exist in this repo', evidence '`ls -d pi-ref` → No such file or directory; `find . -path ./node_modules -prune -o -name host.ts -path \'*chord*\' -print` trả về rỗng', và correction là 'Do not attempt to read chord.' (2) Không có gì được đặt xuống: `drainDisposers` không tồn tại ở bất kỳ đâu trong omp. Bốn vòng rút mà W2 nhắm vẫn là dạng gốc: thứ tự thuận, không try/catch. | packages/chord/src/facets/host.ts:125-142 | packages/coding-agent/src/session/agent-session.ts:4983, packages/coding-agent/src/session/agent-session.ts:5218, packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112, packages/coding-agent/src/extensibility/extensions/runner.ts:1347 — cả bốn đều là `for (const dispose of this.#X.splice(0)) dispose();` | **GIỮ CỦA OMP.** Chép chord KHÔNG được nghĩa là chuyển bốn vòng rút này. Hai thiết kế cố ý bất đồng: `FacetKernel.dispose` của chord rút ngược, cô lập từng lỗi, rồi NÉM LẠI (`if (errors.length === 1) throw errors[0]; if (errors.length > 1) throw new AggregateError(errors, ...)`). Hợp đồng của W2 là ghi log rồi đi tiếp, vì `beginDispose()` được gọi từ `session-teardown.ts:70` TRƯỚC cái try bao quanh `await deps.saveDraft(draftText)` — một vòng rút ném lỗi sẽ từ chối teardown trước khi bản nháp được ghi, biến một rò rỉ tài nguyên có điều kiện thành đường mất dữ liệu không điều kiện. Sai lệch đó là đúng cho omp. Cài lại bốn vòng rút theo `FacetKernel` của chord là một thay đổi RIÊNG, SAU NÀY, theo spec riêng của W2, và khi làm vậy hãy giữ log-rồi-tiếp-tục. Spec này chỉ đặt xuống `packages/chord`; nó đổi không dòng nào trong `packages/coding-agent`. |
| JsonValue — sáu định nghĩa trong omp, ba hình dạng khác nhau. Va chạm tầm tới lớn nhất trong package, vì `pi-server`, `pi-client`, `pi-durable` và `pi-protocol` đều import `JsonValue` của chord. | packages/chord/src/types.ts:21 — `null \| boolean \| number \| string \| JsonValue[] \| { [key: string]: JsonValue }` | packages/catalog/src/discovery/protobuf.ts:11 (hình dạng giống hệt), packages/mnemopi/src/types.ts:2 (qua `JsonScalar`, giống hệt), packages/mnemopi/src/mcp-tools.ts:9 (qua `JsonPrimitive`, giống hệt), packages/mnemopi/src/core/beam/types.ts:4 (giống hệt), packages/ai/src/judgment/types.ts:17 (bản READONLY: `readonly JsonValue[]` / `{ readonly [key: string]: JsonValue }`), packages/coding-agent/src/secrets/obfuscator.ts:72 (LỆCH: nhánh object là `{ [key: string]: JsonValue \| undefined }`) | **GIỮ BẢN CỦA CHORD, nhưng đừng cố hợp nhất sáu bản của omp trong thay đổi này.** Chép nguyên văn `JsonValue` của chord là đúng và không phá vỡ gì: cả bốn package anh em import nó đều được chép từ cùng cây pi nên nhất quán với nhau. Bản `obfuscator.ts` là một chỗ lệch thật, nhưng không gì trong migration này truyền một giá trị từ obfuscator qua ranh giới chord, nên hợp nhất nằm ngoài phạm vi. Ghi lại làm việc theo sau: một `JsonValue` + `isJsonValue` chung ở `@oh-my-pi/pi-utils`, và cho cả sáu định nghĩa cùng hai bản của chord import từ đó. Lưu ý spec của `pi-protocol` nói nó import `JsonValue` và `isJsonValue` từ chord — sau migration này chúng đến từ `@oh-my-pi/chord`, và bản chép của `pi-protocol` phải được trỏ vào import đó thay vì giữ bản riêng. |
| isJsonValue — tên đã bị chiếm ba lần trong omp, một lần với chữ ký không tương thích. | packages/chord/src/json.ts:74 — `isJsonValue(value: unknown): value is JsonValue`, a TYPE GUARD | packages/coding-agent/src/eval/judgment-bridge.ts:47 và packages/ai/src/providers/cursor.ts:4643 (cả hai `(value: unknown): value is JsonValue`, tương thích), cộng packages/omptype/src/json-schema.ts:296 vốn là `isJsonValue(value: unknown, seen = new Set<object>()): boolean` — boolean thuần, thêm tham số tập vòng lặp, KHÔNG phải type guard | **GIỮ BẢN CỦA CHORD làm export chuẩn.** Không import site nào hiện star-import cả `@oh-my-pi/chord` lẫn một module export bản của omptype, nên bản chép không tạo mơ hồ. Đừng đụng bản của omptype trong thay đổi này — nó nằm sau một chữ ký khác và việc thay nó là một refactor riêng. Nhưng hãy làm cho `pi-protocol` import guard của chord thay vì khai báo một bản thứ tư. |
| Context — cùng tên, khác hẳn khái niệm. | packages/chord/src/types.ts:15 — immutable key/value cancellation scope: `value<T>(key: ContextKey<T>): T \| undefined`, `toString()`, and an `abortSignal` getter | packages/ai/src/types.ts:1476 — `export interface Context { systemPrompt?: string[]; messages: Message[]; tools?: Tool[]; inactiveTools?: Tool[] }`, một PAYLOAD REQUEST, export từ `@oh-my-pi/pi-ai` và được import theo tên ở hơn 10 file | **GIỮ CẢ HAI, KHÔNG GỘP.** Chúng không liên quan và cả hai đều đúng. Bản chép an toàn hôm nay vì không file nào star-import cả hai barrel — cả hơn 10 import `Context` từ `@oh-my-pi/pi-ai` đều là named import, và TS chỉ nêu mơ hồ khi va chạm `export *`. Rủi ro còn lại là một re-export barrel trong tương lai: nếu có module nào làm `export * from "@oh-my-pi/pi-ai"` cùng `export * from "@oh-my-pi/chord"`, TS sẽ nêu TS2308. Hãy để lại một chú thích tại `packages/chord/src/types.ts:15` nêu `Context` không liên quan của pi-ai để người sau không thử hợp nhất chúng. Không đổi tên symbol nào — `durable`, `client`, `server` và `protocol` đều import `Context` của chord theo tên, và đổi tên sẽ phá bốn package mà không đổi lấy gì. |
| Draft — một kiểu permissive hơn nhiều trong một codebase cấm `any` ở nơi khác. | packages/chord/src/delta/draft.ts:2 — recursive `-readonly` mapped type with an explicit depth cutoff at 8 | không có định nghĩa `Draft` nào trong omp (0 kết quả cho `type Draft\|interface Draft`) | **KHÔNG VA CHẠM — nhưng hãy ghi lại ý định.** Mốc cắt tồn tại để trình biên dịch không làm nổ stack trên các kiểu sâu. Giữ nguyên văn; đừng “đơn giản hóa” nó thành đệ quy không giới hạn. Chord có zero `any` trong `src` (đã xác minh: `: any\\|<any>\\|as any\\|any[]` = 0), nên bản chép không mang theo nợ `any`. |
| Chuỗi định dạng trên đĩa mang tên package thượng nguồn, mà package này không còn là nữa. | packages/chord/src/node/manifest.ts:1-5 — FACET_BUNDLE_FORMAT = "chord.facet-bundle", FACET_BUNDLE_ARTIFACT_FORMAT = "chord.facet-bundle-artifact", FACET_BUNDLE_MANIFEST_FILE = "chord-facets.json" | không có thứ tương đương trong omp; bề mặt bundler là hoàn toàn mới | **GIỮ NGUYÊN VĂN CÁC CHUỖI.** KHÔNG viết lại thành `"omp.…"` trong phạm vi viết lại scope. Chúng là danh tính của một artefact trên đĩa: một facet bundle do pi ghi ra phải vẫn nạp được dưới `@oh-my-pi/chord`, và ngược lại. Đổi tên chúng trong im lặng sẽ vô hiệu hoá mọi bundle còn nằm trên đĩa. Nếu omp sau này muốn định dạng riêng, đó là một lần tăng phiên bản định dạng, không phải sửa chuỗi trong một commit migration. |

### Các bước

1. **TẠO `packages/chord/LICENSE` TRƯỚC, trước khi bất kỳ dòng mã nào đặt xuống.** Chép nguyên văn `/Users/tranquangdang21/Projects/pi-ref/LICENSE`, rồi nối thêm các dòng bản quyền của omp để phần đầu đọc: `Copyright (c) 2025 Mario Zechner` / `Copyright (c) 2025-2026 Can Bölük` / `Copyright (c) 2026 Stencil Labs, Inc.` — khớp kiểu nhà ở `packages/omptype/LICENSE`. Bảo đảm có dòng cuối. Đây là điều kiện MIT gắn với mọi bước sau: pi là MIT (Copyright (c) 2025 Mario Zechner) và thông báo cho phép phải đi kèm với phần lớn mã nguồn. Làm việc này trước để không có commit trung gian nào chứa mã chép mà thiếu thông báo. *(anchor: `packages/chord/LICENSE`)*
2. Thêm esbuild vào khối `workspaces.catalog` của package.json gốc dưới dạng `"esbuild": "0.28.2"` (theo thứ tự alphabet, sau `"diff"` và trước `"fastembed"`), rồi chạy `bun install`. Đã xác minh là vắng hôm nay: không có khóa esbuild trong bất kỳ manifest nào, `ls -d node_modules/esbuild` thất bại, và dấu vết duy nhất trong `bun.lock` là optionalPeer của vite `^0.27.0 || ^0.28.0` mà 0.28.2 thỏa mãn — nên bước này thêm package mà không xáo trộn vite. Đây là dependency ngoài duy nhất migration giới thiệu. *(anchor: `package.json (workspaces.catalog)`)*
3. Chép nguyên văn 30 file dưới `src/` vào `packages/chord/src/`, giữ nguyên bố cục thư mục con (`context/`, `delta/`, `facets/`, `node/`, `services/`). Không đổi tên, không làm phẳng. *(anchor: `packages/chord/src/`)*
4. Bỏ hậu tố `.ts` khỏi TẤT CẢ 119 specifier import/export tương đối trong toàn package, KHÔNG chỉ `src/`: 84 specifier trong 25 file `src/` (`grep -rhoE 'from "\.\.?/[^"]*\.ts"' src | wc -l`) VÀ 35 specifier trong 19 file `test/` (cùng lệnh đó trên `test`, sau khi loại 4 file benchmark bị bỏ — tính cả benchmark thì là 42 trong 23 file). Quy ước của omp là không đuôi: `packages/omptype` và `packages/utils` có 0 import tương đối có đuôi và 355 import trần. Bỏ sót nhóm thứ hai sẽ làm `check:ts` đỏ: `tsconfig.json` mẫu của package khai báo `include: ["src","test","bench"]`, và chuỗi tsconfig mà package kế thừa (`tsconfig.json` -> `packages/tsconfig.workspace.json` -> `tsconfig.base.json`) không đặt `allowImportingTsExtensions` — chỉ `tsconfig.tools.json` đặt, mà nó chỉ phủ `scripts/` cùng `packages/natives/scripts/gen-npm-packages.ts`, không phủ `packages/chord` — nên `tsgo` nổ `TS5097` ("An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled") trên từng specifier còn đuôi — đã dựng lại đúng hình dạng tsconfig đó và chạy `tsgo -p ... --noEmit`: giữ đuôi -> exit 1, bóc đuôi -> exit 0. Làm bằng một sed cơ học trên `from "\.\.?/…\.ts"` -> `from "./…"`; không đụng specifier `node:` hay esbuild. *(anchor: `all of packages/chord/{src,test}/**/*.ts`)*
5. Chuyển các barrel `src/index.ts`, `src/node.ts` và `src/bundler.ts` từ re-export có tên sang `export * from` theo AGENTS.md. Ở `src/index.ts` có 8 khối re-export có tên: 6 khối mang giá trị runtime (`./api.ts`, `./json.ts`, `./services/errors.ts`, `./services/provider.ts`, `./services/state-codec.ts`, `./services/wire.ts`) trở thành star, cộng 2 khối type-only (`export type { Draft } from "./delta/index.ts"` và khối `./types.ts`) cũng được phép thành star; chỗ nào star va chạm (`types.ts` và `services/wire.ts` cùng lộ ra `RemoteServiceProvider` và `RemoteServiceError`) thì bỏ đường re-export thừa thay vì giữ cả hai. Giữ `export type { Draft } from "./delta/index"` dạng type-only — luật cho phép star re-export cho type nhưng không bắt buộc chuyển các dòng type-only không mang giá trị runtime. *(anchor: `packages/chord/src/index.ts, packages/chord/src/node.ts, packages/chord/src/bundler.ts`)*
6. Viết lại `@earendil-works/chord` -> `@oh-my-pi/chord` đúng 24 lần xuất hiện trong 7 file được chép: `package.json` (2 — dòng 2 `name` và dòng 59 `repository.url`), `README.md` (9), `src/delta/README.md` (3), `src/node/bundle-loader.ts` (3, dòng 329/330/333), `src/node/bundle.ts` (2 ở dòng 97 — specifier trần và glob `/*`), `test/bundle.test.ts` (3), `test/boundary.test.ts` (2, xử lý riêng ở bước 12). Tổng cộng là 29 lần trong 8 file nếu tính cả `PLANNING.md` (5, không chép) — con số này đáng nêu vì bỏ sót lần thứ hai trong `package.json` sẽ để lại URL trỏ về repo thượng nguồn trong manifest đã phát hành. Các dòng trong `bundle-loader` là bộ phân giải ánh xạ specifier của package về lại `../index.<ext>`, còn `bundle.ts:97` đánh dấu package là external cho esbuild; cả hai phải bám theo tên mới, nếu không bundler sẽ hỏng lúc chạy mà không có lỗi kiểu. *(anchor: `packages/chord/src/node/bundle-loader.ts:329-333, packages/chord/src/node/bundle.ts:97`)*
7. Viết lại 3 chỗ dùng `ReturnType<>` bị cấm (AGENTS.md: “NEVER use ReturnType<> — use the actual type name”). `src/node/bundle.ts:118` `Awaited<ReturnType<typeof build>>` trở thành kiểu kết quả build có tên của esbuild, import ở top-level từ `"esbuild"`. `src/node/package.ts:57` và `:182` `Awaited<ReturnType<typeof stat>>` trở thành `import type { Stats } from "node:fs"` dùng như `let x: Stats`. Thêm import ở đầu mỗi file — vị trí kiểu `import("esbuild").BuildResult` inline bị cấm. *(anchor: `packages/chord/src/node/bundle.ts:118, packages/chord/src/node/package.ts:57, packages/chord/src/node/package.ts:182`)*
8. Viết lại cấu trúc promise bị cấm duy nhất ở `src/context/index.ts:102` thành `Promise.withResolvers<T>()`. Giữ đúng ngữ nghĩa: gắn listener hủy với `{once:true}`, gỡ nó ở CẢ nhánh resolve và reject, và reject với `abortError(signal)` (hàm này ưu tiên `signal.reason` khi nó là một Error, nếu không thì dựng một DOMException có name 'AbortError'). Rồi chạy lại `test/context.test.ts` — đó là test duy nhất phủ hàm này. *(anchor: `packages/chord/src/context/index.ts:98-116`)*
9. Viết `packages/chord/package.json` theo cột sửa trong bảng *File cần chép*. Bốn điều sẽ vỡ nếu bỏ sót: (a) `main`/`types` phải trỏ tới `./src/index.ts` chứ không phải `./dist` — omp phát hành mã nguồn; (b) map `exports` bỏ các khóa `dist`/`source` và nhận ĐÚNG hình dạng wildcard của omp, không phải 4 subpath tường minh của pi: `{".": {types:'./src/index.ts', import:'./src/index.ts'}, "./*": {types:'./src/*.ts', import:'./src/*.ts'}, "./*.js": './src/*.ts'}` — đây chính là `packages/omptype/package.json` và `packages/wire/package.json`. Dạng wildcard còn là thứ duy nhất resolve được các subpath sâu mà `bundle-loader.ts` sinh ra. Không thêm khóa `./package.json` (không package omp nào có); (c) KHÔNG script nào gọi trình biên dịch bị cấm còn sót — script build bị xóa và kiểm tra kiểu chạy qua `check:types: tsgo -p tsconfig.json --noEmit`; (d) esbuild 0.28.2 là mục `dependencies` duy nhất. *(anchor: `packages/chord/package.json`)*
10. Viết `packages/chord/tsconfig.json` (133 byte, theo mẫu `packages/omptype/tsconfig.json`) để `tsgo -p tsconfig.json --noEmit` kiểm tra kiểu cho package. KHÔNG chép `tsconfig.build.json` của nguồn — nó extends `tsconfig.base.json` gốc của pi, phát ra `./dist` bằng trình biên dịch bị cấm, và tham chiếu một danh sách exclude `src/**/*.d.ts` không có bản tương ứng ở đây. *(anchor: `packages/chord/tsconfig.json`)*
11. Chép 21 file test hợp đồng (không phải 6 benchmark) vào `packages/chord/test/`, giữ thư mục con `delta-tracker/`. Rồi viết lại `from "vitest"` -> `from "bun:test"` trên 19 dòng import. Ở nơi file dùng thứ mà vitest có nhưng `bun:test` không (đáng chú ý nhất là `vi.waitFor` — KHÔNG có trong `bun:test`, và `expect.poll` cũng không có trên bun 1.3.14; đã probe trực tiếp: `typeof vi.waitFor === "undefined"`, `typeof vi.fn === "function"`, `typeof it.each === "function"`), thay bằng bản tương đương của bun hoặc cấu trúc lại khẳng định. Cụ thể `vi.waitFor` có 10 lời gọi nằm ở `test/services.test.ts:601,725,733,757` và `test/facets.test.ts:142,154,185,190,278,286` — cần một vòng poll tự viết tay, ví dụ `for (let i = 0; i < N; i++) { try { expect(...); break } catch { await Bun.sleep(...) } }`. `vi.fn` thì bun có sẵn nên giữ. KHÔNG có `toThrowError` ở đâu trong package (0 lần xuất hiện) — đừng tìm nó. Không để lại import vitest, vì `bun test` sẽ không resolve được module và cả file lỗi. *(anchor: `packages/chord/test/**`)*
12. Viết lại 2 kiểm tra tiền tố `@earendil-works/pi-` trong `test/boundary.test.ts` (dòng 15 và 26) thành `@oh-my-pi/pi-`. File này duyệt package và khẳng định không specifier scope thượng nguồn nào tới được entry point đã phát hành; nếu để chuỗi cũ, test sẽ pass một cách rỗng và bảo đảm ranh giới đó tan biến lặng lẽ. Đổi chuỗi, đừng đổi test. *(anchor: `packages/chord/test/boundary.test.ts:15, packages/chord/test/boundary.test.ts:26`)*
13. Chép hai README. `packages/chord/README.md`: 9 lần viết lại scope cùng phần mở đầu cài đặt/import, và thêm dòng ghi công 'Migrated from earendil-works/pi (MIT, Copyright (c) 2025 Mario Zechner)'. `packages/chord/src/delta/README.md`: 3 lần viết lại scope (dòng 4, 10, 71) cùng hậu tố `.ts` trên hai import ví dụ. README delta được phát hành — `package.json` của nguồn liệt kê nó trong `files` — nên ví dụ của nó phải hiện scope `@oh-my-pi`, nếu không chúng sẽ tài liệu hoá một import không resolve được. *(anchor: `packages/chord/README.md, packages/chord/src/delta/README.md`)*
14. Tạo `packages/chord/CHANGELOG.md` với mục `## [Unreleased]` và một dòng `### Added`, theo luật changelog của AGENTS.md: hướng tới người dùng, không tự sự diễn giải nguyên nhân, không chi tiết hiện thực. Rồi chạy `bun run fmt` trong package (oxfmt) để chuẩn hoá nguồn 4-space về kiểu tab/tabWidth-3/printWidth-120 của repo, và `bun run lint` (oxlint). *(anchor: `packages/chord/CHANGELOG.md`)*
15. Chạy cổng: `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers`. Exit 0, ~29s trên máy rảnh. Cổng thứ hai, chạy ĐƯỢC NGAY: `bun test packages/chord/test` — KHÔNG cần `brew install ninja`. Lý do: `packages/natives` CHƯA build (đúng — `bun --cwd=packages/natives run build` thật sự thất bại vì thiếu Ninja), nhưng điều đó chỉ chặn những package kéo addon; chord không kéo addon nào, và 21 file test của nó chỉ import `node:*` cùng `vitest` (không có `@oh-my-pi`, không có natives — đã quét). Đã chứng minh runner chạy sạch khi addon chưa có: `bun test packages/omptype/test` -> 1139 pass / 52 todo / 0 fail. Cổng thật sự của thay đổi này là CẢ HAI: `bun run check:ts` (kiểu) và `bun test packages/chord/test` (hành vi). Chỉ chạy một trong hai là chưa đủ. *(anchor: repo root)*

### Hợp đồng test

21 file, 35 nhóm `describe()`, 298 khối describe/it/test, tất cả đổi từ vitest sang `bun:test`. Mỗi cái bảo vệ một hợp đồng quan sát được; không cái nào là static echo. Các nhóm gánh trọng lực, theo thứ tự ưu tiên:

1. `test/delta-tracker/tracker.test.ts` (56112 byte, 73 khối) — CRDT. Thứ tự nhân quả, danh tính revision, chia sẻ cấu trúc, và điều gì xảy ra khi hai revision của cùng một trạng thái được theo dõi đồng thời. Đây là file làm cho package đáng chép hơn là viết lại.
2. `test/delta-apply-immutable.test.ts` (9133 byte, 9 khối) — hợp đồng AN TOÀN. Phải chứng minh rằng `apply`/`applyImmutable` trên một đường dẫn chứa `__proto__`, `constructor` hoặc `prototype` THẢ `UnsafePathError` chứ không ghi xuyên qua, và rằng việc ném ra là kết quả quan s được (không phải một op bị bỏ qua lặng lẽ). Một hồi quy biến lần ném thành no-op sẽ làm mọi test khác trong package vẫn xanh.
3. `test/facets.test.ts` (20955 byte, 15 khối) + `test/facet-loader.test.ts` (11801 byte, 10 khối) — máy trạng thái vòng đời. Phải chứng minh `dispose()` chạy các effect theo THỨ TỰ ĐẢO của thứ tự đăng ký, cô lập một effect ném lỗi để các effect còn lại vẫn chạy, và gộp nhiều lỗi thành một. Đây chính là cái neo M1 W2 không xác minh được; sau migration này tham chiếu nằm sẵn trong cây tại `packages/chord/src/facets/host.ts:125-142` và `test/facets.test.ts` là tài liệu chạy được của nó.
4. `test/service-wire.test.ts` (9469 byte, 8 khối) — ranh giới đầu vào độc hại. 11 parser trong `src/services/wire.ts` nhận `unknown`; khẳng định mỗi cái từ chối đầu vào sai hình thức bằng một kết cục cụ thể (undefined hay ném) và một frame đúng hình thức thì đi-về tròn được. Đây là hợp đồng phủ định, thứ AGENTS.md nêu tường minh là được chấp nhận.
5. `test/bundle.test.ts` (10829 byte, 6 khối) — chứng minh bundler vẫn đánh dấu `@oh-my-pi/chord` là external sau khi viết lại scope, và manifest đi-về tròn được. Đây là file không thể xanh trước khi `bun install` thực sự đã tải esbuild.
6. `test/boundary.test.ts` (1504 byte) — duyệt package và khẳng định không specifier `@earendil-works/` nào tới được một entry đã phát hành. Không phải source-grep bị cấm: nó là kiểm tra ranh giới phân giải import, không phải khẳng định về văn bản mã.
7. `test/state-fuzz.test.ts` (4282 byte, 1 khối) — fuzzing. Theo ngoại lệ kết thúc của AGENTS.md, các test này phải khẳng định một đầu ra CÓ BIÊN, một lỗi được nêu ra, hoặc một thay đổi trạng thái. `not.toThrow()` trần không chấp nhận được và phải bị bác trong review.

Quy tắc áp cho cả 21: không `mock.module()` (Bun rò registry module toàn cục giữa các file — oven-sh/bun#12823); không `vi.spyOn` trên namespace module được import dưới dạng giá trị; không assertion source-grep; không `expect(true).toBe(true)`; không assertion “dài hơn” hay “chuỗi không rỗng” khi không có consumer phía sau; dọn dẹp theo từng test bằng `vi.restoreAllMocks()` trong `afterEach` thay vì đột biến `Bun.*`, `process.env` hay `process.platform` ở cả file. Không để lại bất kỳ `vi.` nào mà `bun:test` không có (`vi.waitFor`, `vi.advanceTimersByTime`… — `bun test packages/chord/test` sẽ bắt, nhưng đừi để tới lúc đó mới biết). Không `node:child_process` — dùng `Bun.spawnSync`/`Bun.spawn`; file duy nhất vi phạm ở nguồn là `test/delta-tracker/retention.test.ts`. Bất cứ thứ gì chép từ nguồn mà không đạt các quy tắc này phải được viết lại hoặc xóa, không giữ lại chỉ vì nó xanh ở thượng nguồn.

Danh sách đủ 21 đường dẫn (21 file; `retention.worker.ts` là fixture chứ không phải file test, `helpers.ts` là helper chứ không phải file test — nên chỉ 19 file thật sự là test):

- `packages/chord/test/delta-tracker/tracker.test.ts`
- `packages/chord/test/delta-tracker/retention.test.ts`
- `packages/chord/test/delta-tracker/retention.worker.ts`
- `packages/chord/test/facets.test.ts`
- `packages/chord/test/facet-loader.test.ts`
- `packages/chord/test/services.test.ts`
- `packages/chord/test/service-wire.test.ts`
- `packages/chord/test/delta-apply-immutable.test.ts`
- `packages/chord/test/delta-diff.test.ts`
- `packages/chord/test/delta.test.ts`
- `packages/chord/test/delta-clone.test.ts`
- `packages/chord/test/state.test.ts`
- `packages/chord/test/state-diff.test.ts`
- `packages/chord/test/state-draft.test.ts`
- `packages/chord/test/state-fuzz.test.ts`
- `packages/chord/test/state-value.test.ts`
- `packages/chord/test/context.test.ts`
- `packages/chord/test/json.test.ts`
- `packages/chord/test/bundle.test.ts`
- `packages/chord/test/boundary.test.ts`
- `packages/chord/test/helpers.ts`

### Xác minh

Cổng chính: `bun run check:ts` từ `/Users/tranquangdang21/Projects/ultraworkers` — exit 0, ~29s khi rảnh. Nó chạy oxlint + oxfmt --check + tsgo --noEmit trên toàn workspace, nên bắt được cả bốn kiểu viết lại cơ học (tab, hậu tố `.ts`, star barrel, thay `ReturnType<>` và `new Promise`) trong một lượt. Nó KHÔNG chạy 21 file test.

Chạy test KHÔNG bị chặn: `bun --cwd=/Users/tranquangdang21/Projects/ultraworkers test packages/chord/test` chạy được ngay. Addon native của `packages/natives` chưa build và `bun --cwd=packages/natives run build` đúng là thất bại vì thiếu ninja — nhưng chord không kéo addon nào nên 21 file của nó độc lập với việc đó. Vị trí thành thật: PR phải là typecheck-VERIFIED và test-VERIFIED; chỉ được ghi "chưa xác minh bằng test" nếu `bun test packages/chord/test` thật sự đỏ vì một nguyên nhân cụ thể được nêu tên.

Các kiểm tra không cần `bun test`:

```bash
# binary esbuild phải có sau bước 2 (hiện tại: No such file or directory)
ls -d node_modules/esbuild

# không còn chuỗi thượng nguồn nào trong package
grep -rn 'earendil-works' packages/chord

# không còn ReturnType<> hay cấu trúc promise bị cấm trong src
grep -rn 'ReturnType<\|new Promise' packages/chord/src

# không còn specifier tương đối mang hậu tố .ts — toàn package, KHÔNG chỉ src
grep -rE 'from "\.\.?/[^"]*\.ts"' packages/chord

# dòng Zechner phải nằm ĐẦU, sau đó là hai dòng của omp
head -4 packages/chord/LICENSE

# zero thay đổi dưới packages/coding-agent — bốn vòng rút của W2 phải nguyên vẹn
git diff --stat

# cổng chính
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

`grep -rn 'earendil-works' packages/chord` đúng là một source-grep, nhưng nó chạy như một bước kiểm tra migration thủ công, không commit thành test — kiểm tra ranh giới đã commit là `test/boundary.test.ts`, kiểm tra phân giải import chứ không phải văn bản file.

### Cổng hoàn thành

`bun run check:ts`

Cổng này thực sự đỏ được: spec ghi `gate_can_fail: true`, và nó bắt được phần lớn việc bị bỏ sót (hậu tố `.ts`, chuỗi scope, thụt lề, barrel, ba `ReturnType<>` cùng một cấu trúc promise) — nhưng nó KHÔNG chạy 21 file test, nên nó không đỏ được với việc 73 khối tracker bị cắt bớt hay với hành vi wire đổi âm thầm.

### Rủi ro

MEDIUM, và phần medium tụ lại ở một chỗ rất cụ thể.

Rủi ro cơ học thấp và tự báo lại: sót một hậu tố `.ts` hay sót một chuỗi scope là lỗi biên dịch hoặc một lệnh grep không trả về 0. `bun run check:ts` bắt hết.

Rủi ro thật là việc chép `dispose()` của chord sẽ mở lại câu hỏi drain của M1 W2 với câu trả lời SAI. Ghi chú nhiệm vụ nói W1/W2 đã port thủ công reverse-drain + cô lập lỗi, và rằng việc chép “xóa sạch rủi ro đó” — đúng một nửa, sai một nửa, và nửa sai là nửa nguy hiểm. Đã xác minh: (a) bản ghi `plan_corrections` của chính W2 ghi trích dẫn chord là 'unverifiable — the reference does not exist in this repo' với correction 'Do not attempt to read chord', nên không ai từng đọc mã nguồn; (b) không có gì đặt xuống — `drainDisposers` không tồn tại trong omp và cả bốn vòng rút mục tiêu vẫn đọc là `for (const dispose of this.#X.splice(0)) dispose();`, tức THỨ TỰ THUẬN và không try/catch. Nên bốn vòng rút ấy hiện không phải thiết kế của W2 cũng không phải của chord. Chép chord không sửa chúng, và nó tạo một cái bẫy mới: một khi `packages/chord/src/facets/host.ts:125-142` tồn tại trong cây với hình dạng `throw errors[0]` / `AggregateError`, cách “sửa” trông hợp lý nhất là đấu bốn vòng rút qua đó — và đó sẽ là một HỒI QUY. W2 đã bác hình dạng đó một cách có chủ đích, vì `beginDispose()` chạy từ `session-teardown.ts:70` trước cái try bao quanh `await deps.saveDraft(draftText)`, nên một vòng rút ném lỗi biến một rò rỉ tài nguyên có điều kiện thành một thất bại ghi bản nháp không điều kiện. Giảm thiểu: thay đổi này đụng KHÔNG dòng nào trong `packages/coding-agent`, và bước kiểm tra `git diff --stat` ở mục *Xác minh* làm cho điều đó kiểm chứng được.

Rủi ro bậc hai: esbuild là một dependency runtime mới thật sự trong một repo từng chỉ dựa vào addon native. Nó là MIT, là một package nổi tiếng duy nhất, 0.28.2 thỏa mãn khoảng optional-peer mà vite khai báo nên không có gì khác dịch chuyển, và nó được import bởi đúng một file — nhưng nó có nghĩa `bun test packages/chord/test/bundle.test.ts` không thể xanh trước khi `bun install` thực sự tải nó, và một checkout CI mới mà bỏ qua install sẽ vỡ ở đó chứ không phải ở bước kiểm tra kiểu.

Rủi ro thứ ba: toàn bộ `src/delta/` là 44% phần `src/` và là lý do chép thay vì viết lại, nghĩa là giá trị của migration nằm trọn vẹn ở việc 73 khối tracker có sống sót nguyên vẹn qua phép chuyển vitest -> bun:test hay không. Nếu chúng bị cắt bớt lặng lẽ cho runner nhanh hơn, bản chép đã mất lý do tồn tại.

Ước lượng công sức theo spec: Medium-Large, ~1.5 ngày — ~30 phút cho LICENSE + package.json + tsconfig + cài esbuild; ~2 giờ cho 119 hậu tố `.ts` (84 trong `src/`, 35 trong `test/`) và 24 chuỗi scope; ~1 giờ cho chuyển barrel và giải quyết mơ hồ do export-star; ~30 phút cho 3 `ReturnType<>` và 1 `Promise.withResolvers`; ~2 giờ cho 19 chuyển đổi vitest -> bun:test cộng phần runner làm vỡ; ~1 giờ cho oxfmt/oxlint trên 52 file; ~1 giờ cho hai README và changelog. Phần có thể nở ra đáng kể là file tracker 56112 byte: nếu runner của bun bất đồng với vitest ở một ca lồng sâu hay ca cô lập worker, hãy dành thêm thời gian gỡ lỗi ở đó thay vì nới lỏng khẳng định.

### Cần người quyết

- Câu hỏi drain của M1 W2 cần một người chịu trách nhiệm quyết, và đó KHÔNG phải việc của thay đổi này. Bốn vòng rút hiện có (packages/coding-agent/src/session/agent-session.ts:4983, :5218, packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:112, packages/coding-agent/src/extensibility/extensions/runner.ts:1347) nên chuyển sang thiết kế log-rồi-tiếp-tục của W2, để nguyên, hay căn theo thiết kế ném lỗi của chord? Bằng chứng nghiêng về thiết kế của W2 về tính đúng đắn (nó bảo vệ `saveDraft`) và spec này cố ý không chạm vào chúng. Nhưng giờ chord đã có trong cây, sẽ có người muốn "hòa giải" hai bên — và việc hòa giải phải đi theo chiều NGƯỢC lại với trực giác.
- 6 file benchmark (test/delta-traversal.bench.ts cùng 5 file dưới test/delta-benchmark/, ~87 KB) và PLANNING.md (41634 bytes) có nên được chép trong một đợt sau không? Spec này bỏ qua cả 7. Kiểu nhà của omp đặt benchmark trong thư mục `bench/` cấp trên (packages/omptype/bench/), nên port chúng vừa phải di dời vừa phải chuyển từ bench API của vitest sang `bun bench`. Đáng quyết định tường minh thay vì để chúng mục rữa trong cây nguồn.
- TODO_CONTEXT (src/context/index.ts:56) được đặt tên theo một TODO trong cây nguồn và được export. Giữ nguyên tên để bản chép trung thành, hay đổi thành cái gì đó có nghĩa ngay từ bây giờ? Đổi tên là an toàn — không gì ngoài package import nó, và không anh em nào trong bảy package dùng một hằng Context theo tên. Nghiêng về giữ tên, để một diff với pi trong tương lai vẫn sạch.
- test/delta-tracker/retention.worker.ts spawn một Worker. Yêu cầu `declareWorkerHostEntry` / bảng dispatch của AGENTS.md viết cho worker production phải quay lại cli.ts; đây là fixture test. Hãy chốt rằng nhánh fallback trực tiếp `new Worker(new URL(...), {type:'module'})` là chấp nhận được cho một fixture bun:test, hay định tuyến nó qua host entry như code production.
- test/boundary.test.ts duyệt package và khẳng định không specifier scope thượng nguồn nào tới được một entry đã phát hành. Hãy xác nhận nó vượt qua luật "no source-grep". Cách hiểu của spec là nó kiểm tra PHÂN GIẢI import chứ không phải VĂN BẢN file — đó đúng là ranh giới mà luật vạch ra, nhưng nó đủ sát đường để một reviewer nên phán thẳng thay vì thừa kế phán đoán của người trước.
- Có muốn một `JsonValue`/`isJsonValue` dùng chung ở `@oh-my-pi/pi-utils` để thay cho sáu định nghĩa của omp cộng hai cái của chord (va chạm #2 và #3) không? Lần migrate này cố ý không hợp nhất — cả bốn package anh em đều import bản của chord và chúng nhất quán với nhau. Nhưng sự phân kỳ là có thật: packages/coding-agent/src/secrets/obfuscator.ts:72 chấp nhận `| undefined` trong nhánh object, những bản kia thì không, và packages/ai/src/judgment/types.ts:17 dùng biến thể readonly. Nên có người nhận riêng việc dọn dẹp đó.
