# KẾ HOẠCH THỰC THIỆN MỞ RỘNG MILESTONE 1 — CHUYỂN TOÀN BỘ `pi` VÀO omp

Tài liệu này bàn việc chuyển toàn bộ bảy package mà omp chưa có từ `earendil-works/pi` (MIT) vào
repo, bằng cách **chép nguyên văn rồi migrate**, không phải viết lại từ đầu. Bảy package đó là
`chord`, `pi-protocol`, `pi-server`, `pi-client`, `pi-durable`, `pi-telemetry`, `pi-evals` — tổng
232 file nguồn / 1.934.626 byte, 245 file sẽ chép vào, 516 symbol công khai, 56 va chạm với code
đã có. Đây là tài liệu DUY NHẤT bao trọn phần còn thiếu của M1; 17 hạng mục W1–W17 của M1 gốc nằm
riêng ở `MILESTONE_1_EXECUTION_PLAN.md`.

Mục đích của phần MỞ ĐẦU này là đủ để người bảo trì quyết định trong hai phút: có nên bắt tay vào
đợt migrate này hay không, và nếu có thì bắt đầu từ đâu. Nó không thay thế từng spec package.

---

## Mục tiêu

Với người dùng omp, đợt này mang tới ba thứ cụ thể:

- **Một runtime soạn thảo ứng dụng** (`chord`): vòng đời facet kích hoạt/huỷ, engine delta bất
  biến (CRDT) với tracker, diff, apply, encoder/decoder và chốt ô nhiễm prototype, một scope hủy
  theo `Context`, và provider/consumer dịch vụ từ xa.
- **Một cặp server/client nói chuyện qua RPC CBOR khung length-framed** (`pi-server`,
  `pi-client`, trên đặc tả wire `pi-protocol`), vận hành qua Unix-domain socket và không phụ thuộc
  transport cụ thể. Phía server host các Session bền vững; phía client là request/response có bảng
  tương quan theo `request-N`, hủy bằng `AbortSignal`, và rào hydration cho subscription.
- **Một runtime hội thoại/task/tài liệu bền vững** (`pi-durable`): bảng session, tài liệu,
  checkpoint + migration, fork, định nghĩa session, và ba tầng lưu trữ memory / JSONL / SQLite.

Với người viết extension, đợt này mở ra sáu package có thể import từ catalog: `@oh-my-pi/chord`,
`@oh-my-pi/pi-protocol`, `@oh-my-pi/pi-server`, `@oh-my-pi/pi-client`, `@oh-my-pi/pi-durable`,
`@oh-my-pi/pi-telemetry`. Đó là toàn bộ giá trị thực dụng của `pi-telemetry` ở thời điểm này — xem
mục Va chạm.

### Thành thật về những gì họ KHÔNG được

- **Không có test runner mới.** Bốn dependency của `pi-evals` (`vitest`, `vitest-evals`,
  `@vitest-evals/core`, `autoevals`) là một nền tảng test thứ hai, đặt cạnh `bun test` sẵn có. Bốn
  trong bảy dependency của `pi-evals` phải KHÔNG thêm. Hệ quả: harness eval chỉ chạy được phần lõi
  `bun test` chứ không chạy được các phần dựa trên `describeEval`/judge/reporter của vitest.
- **`typebox` chưa chốt.** `pi-protocol` khai báo `typebox@1.3.27` và dựng mọi envelope bằng
  `Type.*` + `Static<>`. omp không có `typebox` trong lockfile (chỉ có `@sinclair/typebox@0.34.52`
  — dependency transitive, khác API) và không có `node_modules/typebox`. Đây là quyết định chặn
  cả ba package `pi-protocol` → `pi-server` → `pi-client`.
- **Chỉ MỘT dependency runtime npm bên ngoài được chắc chắn thêm**: `esbuild@0.28.2`, của riêng
  `chord`, và chỉ dùng ở đúng một file — `src/node/bundle.ts:4`. Mọi import ngoài khác trong
  `src/` của `chord` đều là builtin của Node.
- **`pi-evals` chép một phần, không phải toàn bộ.** Khoảng 40% nó là máy móc Docker/vitest/tarball
  phát hành mà omp không có bản tương đương. Arm `without_docs` không xoá gì trong cây nguồn:
  `packages/evals/docker/Dockerfile:15-19` `rm -rf` trong
  `/opt/evaluator/install/node_modules/@earendil-works/pi-coding-agent/{README.md,CHANGELOG.md,docs,examples}`
  — tức thư mục npm ĐÃ CÀI trong image, không phải `packages/coding-agent/`. Ở omp,
  `packages/coding-agent/docs` không tồn tại và `files` trong `package.json` cũng không liệt kê
  `docs`, nên vế `docs` của phép thử là vô nghĩa. Nhưng rủi ro thật nặng hơn nằm ở chỗ đối lập:
  `packages/evals/docker/entrypoint.ts:55-62` (nhánh `with_docs`) ném `Missing documentation` khi
  thiếu `docs/models.md` hoặc `examples/README.md`, và `entrypoint.ts:31-33` đòi
  `package.json`/`npm-shrinkwrap.json`/`dist/index.js` trong thư mục đã cài. Dockerfile chép nguyên
  văn sẽ làm image `with_docs` **nổ ngay** khi khởi động container, chứ không phải "đo được không ra
  gì". Phải viết lại cả hai arm cho hình dạng cây omp — đó là một quyết định có tên, không phải một
  phép chép cơ học.
- **Tên `eval` không phải của package này.** `packages/coding-agent/src/eval/` của omp đã là một
  hệ thống lớn, không liên quan (59 file JS/Python sandbox, kernel session…). `pi-evals` là thứ
  khác và không được gộp.
- **Adapter SQLite của `pi-durable` còn nợ.** durable dùng `node:sqlite`; repo omp dùng
  `bun:sqlite` ở 51 file. Spec ghi việc viết adapter `bun:sqlite` là một bước SAU, chưa nằm trong
  cổng.
- **`ModelRuntime` không tồn tại ở omp**, nên phần dò model của `pi-evals` bị chặn. Cùng cơn với
  `CreateAgentSessionOptions.tools`/`.noTools`, `createAgentSessionServices`,
  `InlineExtension`, `getDocsPath`/`getExamplesPath`/`getReadmePath` — tất cả đều là 0 định nghĩa
  trong omp.

---

## Vì sao chép chứ không làm lại

**Bằng chứng một — bốn package omp đã có giữ nguyên tên, chỉ đổi scope.** Đợt migrate này không phải
lần đầu omp chạm vào `pi`; bốn package của `pi` đã nằm trong catalog dưới đúng tên, chỉ khác tiền tố
scope:

| Package của `pi` | Bản trong omp | Trạng thái |
| --- | --- | --- |
| `pi-agent-core` | `@oh-my-pi/pi-agent-core` | đã có trong omp |
| `pi-ai` | `@oh-my-pi/pi-ai` | đã có trong omp |
| `pi-utils` | `@oh-my-pi/pi-utils` | đã có trong omp |
| `typebox` | `@oh-my-pi/omptype` (mặt nạ TypeBox tương thích, dùng production) | đã có trong omp |

Ba package đầu giữ nguyên tên, chỉ đổi scope. Package thứ tư giữ VAI TRÒ (`@oh-my-pi/omptype/typebox`
đang được `packages/coding-agent/src/extensibility/legacy-typebox.ts` và bốn file test dùng thật),
khác tên. Khi tên đã khớp và scope đã khớp, việc dựng lại chỉ để có một bản "sạch" là tự tạo việc.

Nhưng phải nói thẳng một điều mà chính dữ liệu của `pi-server` cảnh báo: điều khoản "cùng tên, chỉ
khác scope" **đúng với TÊN và sai với PACKAGE**. `packages/agent/src` của omp là 34 file `.ts`
/ 739.550 byte (thêm 16 file `.md`) phát ra 18 module phẳng; của `pi` là 117 file `.ts` /
1.145.928 byte. Giữ tên không có nghĩa giữ được hợp đồng — và ở đây ngay cả quy mô cũng lệch theo hai
hướng khác nhau.

**Bằng chứng hai — nghĩa vụ pháp lý chỉ có đúng một hạng mục.** `pi` là MIT. Nghĩa vụ duy nhất là giữ
nguyên copyright và permission notice. Hạng mục này là TẠO MỚI hai file, không phải `cmp` file có
sẵn: ở `pi` tại `d6af72e` chỉ có MỘT `LICENSE` ở rễ repo
(`git ls-files | grep -iE 'license|notice'` trả về đúng một dòng) và không package nào trong bảy
package có file LICENSE/NOTICE riêng. Vì vậy `packages/durable/LICENSE` phải được `cp` từ `LICENSE`
ở rễ `pi-ref` tại commit `d6af72e` rồi `cmp` bản chép với bản gốc đó; `packages/evals/NOTICE` phải
chứa nguyên văn dòng `Copyright (c) 2025 Mario Zechner` cùng toàn văn permission notice lấy từ
cùng file đó. Không có yêu cầu nào về tên tác giả ở header file, không có yêu cầu nào về cơ chế
"derived work". Đây là phần việc pháp lý của cả đợt: một file LICENSE và một file NOTICE.

**Bằng chứng ba — lập luận ngược lại.** Ở đây, chép có **ÍT rủi ro pháp lý hơn tái tạo sạch**, chứ
không phải nhiều hơn. Lý do: một bản viết lại "sạch" chỉ thực sự an toàn khi người viết thật sự
chưa từng đọc bản gốc. Ở đợt này thì điều đó không đúng — mọi spec đều dựa trên việc đọc mã `pi`,
đọc cấu trúc thư mục của nó, và đo từng file của nó. Với bản gốc đã nằm trên bàn, viết lại mà
không giữ dấu vết dẫn xuất là **mất** vỏ bọc bản quyền mà lại **giữ** toàn bộ rủi ro: không có
LICENSE, không có dấu vết tác giả, không có đường chứng minh tương thích hành vi. Chép kèm giấy tờ
thì bằng chứng nằm ngay trong cây. Về mặt hành vi thì lập luận cũng nghiêng về chép: code bị chép
byte-for-byte thì mọi sai lệch phát sinh sau đó đều là một quyết định có tên và có người chịu, chứ
không phải một tai nạn không ai nhận.

---

## Thứ tự migrate

**Lịch do thứ tự quyết định, không do khối lượng.** Bằng chứng ngay trong bảng: `pi-durable` mới là
package lớn nhất (63 file / 807.033 byte) mà lại đứng thứ năm, còn `chord` đứng đầu dù nhỏ hơn
(62 file / 690.344 byte) — và lý do không phải vì lớn, mà vì `pi-durable` phụ thuộc nó.
`pi-telemetry` là 12 file / 62.831 byte, nhỏ nhất trong bảy, và đứng thứ sáu.
`pi-evals` chỉ 30 file / 133.025 byte nhưng đứng cuối. Ngược lại, `pi-client` nhỏ (18 file) nhưng
đứng thứ tư, vì 8 trên 27 test của nó không viết được nếu `pi-server` chưa có mặt.

| Vị trí | Package | Vị trí trong cây | Vì sao ở đúng chỗ này | Cái gì chặn nó |
| --- | --- | --- | --- | --- |
| 1 | `@oh-my-pi/chord` | `packages/chord` | Nền của cả đợt migrate — `durable` phụ thuộc nó, và M1 W1/W2 đã tuyên bố port tay từ chính file này. | Không có. Là package đầu tiên. Cần cài `esbuild@0.28.2` và dựng `package.json`/`tsconfig`/LICENSE. |
| 2 | `@oh-my-pi/pi-protocol` | `packages/protocol` (hàng ngang của `packages/wire`, không thay nó) | Wire schema; phải đứng trước server và client vì cả hai dùng nó. Toàn bộ coupling với `chord` chỉ là 2 symbol / 2 dòng import. | `chord` (bắt buộc) + quyết định schema engine. |
| 3 | `@oh-my-pi/pi-server` | `packages/server` | State machine 576 dòng mà giá trị nằm ở THỨ TỰ thao tác, không phải ở thuật toán. | `chord` + `pi-protocol` + `SessionMetadata` (không có ở omp) + native build cho 41 test. |
| 4 | `@oh-my-pi/pi-client` | `packages/client` (đường tiêu thụ dự kiến `@oh-my-pi/pi-coding-agent/client`) | Phí điều phối vượt phí viết code — 8/27 test không viết được nếu chưa có server. | `chord` + `pi-protocol` + `pi-server` cho 8/27 test đó. |
| 5 | `@oh-my-pi/pi-durable` | `packages/durable` | Có `src/documents.ts` — nửa "document" mà M1 tự thừa nhận là điểm không có bằng chứng duy nhất. | `chord` (52 import, 12 symbol). Không cần server hay protocol. |
| 6 | `@oh-my-pi/pi-telemetry` | `packages/telemetry` | 12 file nhỏ, 0 dependency mới, 5 va chạm tên gần giống nhưng khác nghĩa. | Không có. Có thể chạy song song với mọi package khác. |
| 7 | `@oh-my-pi/pi-evals` | `packages/evals` | 4 trong 7 dependency phải KHÔNG thêm (`vitest`); `ModelRuntime` không có ở omp nên chặn phần dò model. | `vitest` (phải quyết) + `ModelRuntime` + câu hỏi arm `without_docs`. |

Hệ quả thực tế: `chord` là cổng chai duy nhất của nửa đầu đồ thị. Không có nó thì 1, 2, 3, 4, 5 đứng
hết. Vì vậy bắt đầu ở đâu thì không có nghi vấn: **bắt đầu từ `chord`** — dù nó không phải package
lớn nhất; `pi-durable` mới là package lớn nhất mà vẫn phải chờ. Rủi ro của nó không nằm ở độ lớn mà
ở đúng một chỗ, xem mục kế tiếp.

---

## Dependency: cái nào thêm, cái nào KHÔNG

Bảy package mới đăng ký trong khối `workspaces.catalog` của `package.json` gốc — `@oh-my-pi/chord`,
`@oh-my-pi/pi-protocol`, `@oh-my-pi/pi-server`, `@oh-my-pi/pi-client`, `@oh-my-pi/pi-durable`,
`@oh-my-pi/pi-telemetry`, `@oh-my-pi/pi-evals`. Đây là dependency nội bộ, không có gì phải cân.

Bên ngoài thì hẻng. Toàn bộ phần phụ thuộc mới của đợt này:

| Dependency | Phiên bản | Package dùng | Đã có trong omp | Quyết định |
| --- | --- | --- | --- | --- |
| `esbuild` | `0.28.2` | `chord` | không | **Thêm.** Dependency runtime npm bên ngoài duy nhất của cả bảy package, dùng ở đúng một file (`src/node/bundle.ts:4`). Bản này thoả khoảng optional-peer của vite (`^0.27.0 \|\| ^0.28.0`) nên không sinh xung đột phiên bản. |
| `typebox` | `1.3.27` (ghim chính xác) | `pi-protocol` | không | **Chưa chốt** — xem bảng quyết định. Nếu chọn `@oh-my-pi/omptype/typebox` thì không cài gì cả. |
| `vitest` | `4.1.9` | `pi-evals` | không | **KHÔNG thêm** — tạo nền tảng test thứ hai cạnh `bun test`. |
| `vitest-evals` | `0.15.0` | `pi-evals` | không | **KHÔNG thêm** — API `describeEval`/judge của vitest. |
| `@vitest-evals/core` | `0.15.0` | `pi-evals` | không | **KHÔNG thêm** — đọc báo cáo JSON của vitest. |
| `autoevals` | `0.3.0` | `pi-evals` | không | **KHÔNG thêm** — judge Levenshtein, chỉ dùng bởi `tui.docs.eval.ts`. |
| `shx` | `0.4.0` | `chord`, `pi-protocol`, `pi-server`, `pi-client`, `pi-durable`, `pi-evals` (KHÔNG phải chỉ `pi-evals`) | không | **KHÔNG thêm** — là devDependency của sáu package và chỉ phục vụ script `clean` (`shx rm -rf dist` ở sáu package đầu, `shx rm -rf .eval` ở `pi-evals`). Vì không thêm, script `clean` phải được viết lại bằng idiom của omp khi chép `package.json`, nếu không sẽ gọi một binary không tồn tại. `pi-telemetry` là ngoại lệ duy nhất: không khai báo `shx` nhưng vẫn có script `clean` gọi nó. |
| `@types/bun` | `catalog:` | `chord`, `pi-evals` | có | **Dùng bản có sẵn.** Thay `@types/node`/`@types/vitest`. |
| `oven/bun docker base image` | `1.4-slim` | `pi-evals` | không | **Đổi** — thay `node:24-slim`. Không phải npm dep nhưng là một thay đổi thật trong container eval. |

Phần còn lại là dependency nội bộ đã có sẵn, và đáng chú ý là có package **không cần dependency nào
mới**: `pi-telemetry` có `new_deps: []` — 12 file / 62.831 byte, trong đó phần code (6 file `src/`
+ 2 file `test/`) là 40.555 byte, zero-dep, một chiếc lá thuần.

Hai điểm phải nói thẳng vì dữ liệu tự mâu thuẫn:

- **Hai con số khác nhau nói về hai thứ khác nhau, không phải một mâu thuẫn.** Ở `pi` tại `d6af72e` cả
  bảy package đều là `0.87.1`, và `pi-protocol` khai `@earendil-works/chord: ^0.87.1` — đó là
  dependency range upstream. Còn `18.3.3` là phiên bản publish của omp: mọi `@oh-my-pi/*` trong
  khối `workspaces.catalog` đều là `18.3.3`. `18.3.4` chỉ xuất hiện trong một dòng mô tả của spec
  `pi-server` và không khớp với bất kỳ giá trị nào trong cây. Không có gì phải quyết ở đây; nhưng
  `18.3.4` phải bị loại khỏi mọi spec.
- **Scope của `chord` lệch với sáu package kia.** Index ghi `@oh-my-pi/chord`, trong khi sáu package
  còn lại đều là `@oh-my-pi/pi-*`. Giữ nguyên bất đối xứng hay chuẩn hoá — chưa có mặc định — cần
  bạn quyết.

---

## Va chạm

Đây là mục quan trọng nhất của cả tài liệu, và lý do khiến "chép là xong" là một câu nói sai.

**56 va chạm được ghi nhận.** Nhưng con số đó không có nghĩa là 56 chỗ phải sửa tay theo cùng một
kiểu. Đa số **không phải cùng tên mà là cùng tên khác hành vi** — cùng tên khác **giá trị**, hoặc
cùng tên nhưng mô hình vòng đời ngược nhau. Và phần lớn trong số đó được giải quyết bằng đúng một
chiêu: **giữ cả hai bên, không đổi tên** — để specifier của import phân giải, để hai symbol cùng
tên sống ở hai package khác nhau. Đổi tên bên nào cũng là một quyết định phá huỷ hợp đồng công
khai, nên phải trả giá bằng một quyết định, không phải bằng một lần tìm-thay.

### Ba va chạm đổi thứ người dùng thấy được

Cả ba đều nằm ở `pi-durable`, và cả ba đều là hành vi quan sát được từ bên ngoài, không phải chi tiết
triển khai:

1. **`DEFAULT_MAX_LINES` — cùng tên, KHÁC GIÁ TRỊ.** `durable` = 2000, omp = 3000. Một lệnh shell
   dài 2.500 dòng sẽ bị `durable` cắt còn không bị omp cắt. Người dùng thấy output khác nhau giữa
   hai đường đi, không lý do gì để giải thích.
2. **Quy tắc đếm dòng khi cắt — cùng tên, KHÁC HÀNH VI.** `durable` đếm `totalLines` bỏ newline
   ở cuối, omp đếm bằng `countNewlines+1`; chuỗi `'a\nb\n'` ra **2 dòng ở durable, 3 dòng ở omp**.
   Marker cắt dòng cũng lệch: `durable` cắt ở 500 (`GREP_MAX_LINE_LENGTH`) và chèn
   `... [truncated]`; omp cắt ở 512. Cùng một nội dung, hai kết quả hiển thị khác nhau.
3. **`Shell` — cùng tên, KHÁC NGHĨA HOÀN TOÀN.** Ở `durable` nó là một **interface** (`exec` +
   `cleanup`) tại `src/env/index.ts:180`; ở omp nó là **string-union** `'bash'|'zsh'|'fish'`. Đây là
   thứ đổi thứ người viết extension phải viết, không chỉ thứ người dùng thấy.

### Vài ví dụ đáng chú ý khác

- **`toError(error: unknown): Error`** — trùng chức năng byte-for-byte giữa bản local của `pi-client`
  và bản chuẩn trong `pi-utils`. Đây là **va chạm code thật duy nhất** trong cả đợt. Cách xử lý đã
  rõ: chỉ định lại import sang `@oh-my-pi/pi-utils`, không giữ bản sao.
- **`PromiseResolvers<T>` / `createPromiseResolvers<T>()`** — cặp resolver tự chế của `pi`, và chính
  file nguồn của nó nói nên xoá. Thay bằng `Promise.withResolvers()`.
- **`Context` — cùng tên, khác khái niệm hoàn toàn.** `Context` của `chord`/`durable` là scope hủy;
  `Context` ở `packages/ai/src/types.ts:1476` là context của LLM. Giữ cả hai.
- **`JsonValue` — sáu định nghĩa trong omp, ba hình dạng khác nhau**, là va chạm có bán kính lan xa
  nhất: `pi-server`, `pi-client`, `pi-durable`, `pi-protocol` đều chạm vào nó.
- **`PROTOCOL_VERSION` — cùng tên export, KHÁC NGHĨA VÀ KHÁC GIÁ TRỊ**; **`encodeFrame` — cùng tên,
  chữ ký không tương thích, ba định nghĩa trong cây**. Riêng ở `pi-protocol` còn có một bản CBOR
  writer tự viết tay trong omp — đây là bản trùng byte-level thật sự duy nhất của cây.
- **Đường đi của durable dùng `node:child_process`** trong khi repo omp chỉ còn đúng một file dùng nó
  (`packages/metaharness/src/runner.ts`), và dùng `node:sqlite` trong khi omp dùng `bun:sqlite` ở
  51 file. Cả hai đều trái `AGENTS.md`.
- **`pi-telemetry` mang về khái niệm thứ BA về telemetry** mà omp đã có hai cái. Chúng không trùng
  nhau và **không được gộp**. `startSpan` của pi là callback-scoped (span sống đúng bằng thời gian
  callback); `startSpan` của omp là immediate. Cùng tên, mô hình vòng đời ngược nhau.
- **`pi-server` xuất `class Server<TMetadata>`** trong khi omp dùng chữ trần `Server` cho hai thứ
  không liên quan. Không phải va chạm mã, là va chạm nhận thức.

### Một va chạm không nằm trong danh sách 56

Va chạm lớn nhất của đợt này không nằm trong bất kỳ mục nào: `pi-evals` có thể **pass mọi cổng và vẫn
đo được không ra gì**. Arm `without_docs` chỉ xoá trong thư mục npm đã cài, mà `docs` thì omp không
có; `verifySystemPrompt` và các điều kiện loại trừ tham chiếu tới `ModelRuntime` mà omp không có.
Cổng `bun test packages/evals` **không chạm tới Docker**: cả sáu file test nằm trong
`packages/evals/test/` và không tham chiếu Dockerfile hay entrypoint, chúng chỉ chạy bên trong
container qua `ENTRYPOINT`. Vì vậy cổng này xanh không nói được gì về `without_docs` — kể cả khi
cả hai arm đọc cùng một tài liệu. Muốn có một cổng thật cho phép thử này thì phải thêm một cổng
riêng kiểm tra cấu trúc image, không phải chờ `bun test` xanh. Đây là lý do `pi-evals` đứng cuối
bảng, và là lý do câu hỏi về nó nằm trong bảng quyết định.

---

## Một tiền đề của M1 gốc bị bác

**M1 W1/W2 tuyên bố gì.** Hai hạng mục đó tuyên bố đã **port tay** cơ chế drain ngược thứ tự và cô lập
lỗi từ `pi-ref/packages/chord/src/facets/host.ts:125-142` sang omp.

**Kiểm chứng được gì.** `drainDisposers` **không tồn tại** trong omp. Và bốn vòng drain vẫn còn nguyên
hình dạng `for (const dispose of this.#X.splice(0)) dispose();` — thuận thứ tự, không `try/catch`.
Không có cô lập lỗi ở bất kỳ đâu trong bốn vòng đó. Tức là tiền đề sai ở cả hai vế: tên hàm không
tồn tại, và hành vi được mô tả không có ở đó.

**Vì sao điều này QUAN TRỌNG — vì đây là va chạm ngữ nghĩa, không phải khác biệt về tên.** Có **hai
thiết kế drain cố ý khác nhau**:

- `chord` dùng drain **ngược thứ tự khai báo, có cô lập lỗi**: đảo thứ tự huỷ là bảo đảm tài nguyên
  khai sau được giải phóng trước tài nguyên mà nó phụ thuộc; `try/catch` quanh mỗi dispose là bảo
  đảm một dispose ném lỗi không chặn các dispose còn lại.
- omp dùng **thuận thứ tự, không cô lập lỗi** ở cả bốn vòng.

Đây là hai quyết định thiết kế có chủ ý ở hai repo, không phải một sự lệch cần dẹp cho phẳng. Nếu
hòa giải theo chiều dễ thấy — hạ `chord` xuống thuận thứ tự cho khớp với omp, hoặc bê ngược bốn vòng
của omp lên để trông giống `chord` — thì sẽ **mất dữ liệu**. Chiều hạ `chord` xuống là huỷ sai thứ
tự: tài nguyên bị giải phóng trước khi thứ nó dùng kịp, tức là flush/xoá nhầm phần dữ liệu còn treo.
Chiều bê ngược lên là thay đổi hành vi của code omp đang chạy ổn, và thay đổi đó không có test nào
bảo chứng. Trong hai chiều, chỉ một chiều làm mất dữ liệu — nhưng chiều đó là chiều dễ thấy, vì nó
làm cho hai bên trông giống nhau.

**Việc phải làm.** Một trong hai điều sau, và điều này chưa có mặc định — cần bạn quyết:

1. Sửa lại phần W1/W2 trong `MILESTONE_1_EXECUTION_PLAN.md` để ghi đúng thực trạng: bốn vòng drain
   thuận thứ tự, không `try/catch`, không có `drainDisposers`. Đồng thời bỏ tiền đề "đã port tay" khỏi
   lý do chuyển `chord` — `chord` vẫn phải migrate vì ba package khác phụ thuộc nó, không phải vì
   phần của nó đã nằm sẵn trong omp.
2. Hoặc chấp nhận rằng đợt này chuyển `dispose()` của `chord` **nguyên văn** vào `packages/chord` như
   một package riêng, không đụng tới bốn vòng drain đang chạy ở omp.

Điều không được làm: để hai bên tiếp tục trông giống nhau trên giấy tờ. Tiền đề đã bị kiểm chứng là
sai một lần; để nguyên sai lần thứ hai thì người tiếp nhận sẽ tin vào một bảo đảm không tồn tại.

---

## Điều kiện tiên quyết

**1. Native addon phải build được trước.** Đây là điều kiện chặn mọi cổng `bun test` của cả bảy
package, và nó là vấn đề môi trường chứ không phải việc của bất kỳ spec nào:

```bash
brew install ninja
bun --cwd=packages/natives run build
```

Cho tới khi bước này xong, `pi-protocol` (28 khai báo `test()` cộng 12 khối `test.each`),
`pi-server` (41 khai báo `test()` cộng 1 khối `test.each`) và `pi-evals` (6 file test) đều
**không chạy được** — không phải vì chúng sai, mà vì runner chưa dựng được. Số khai báo `test()`
được đếm bằng `grep -cE '^\s*(test|it)\('` trên từng file; số case thật khi chạy còn cao hơn vì
mỗi `test.each` sinh ra nhiều case. Cổng của `pi-durable` còn nặng hơn: `packages/durable/test/`
có **195** khai báo `test()` — nhiều hơn tổng của `pi-server` (41) và `pi-client` (27) cộng lại —
nên nó đòi `bun test packages/durable` xanh với số lượng case lớn nhất trong cả đợt. Nói cách
khác: trước khi cài `ninja`, mọi thứ bạn kiểm được ở đợt này là `check:ts`, không phải test.

**2. `bun run check:ts` phải chạy xanh từ trước khi bắt đầu.** Đây là cổng chặn (GATE 1) của cả bảy
spec, và nó là cổng duy nhất chạy được ngay. Baseline đo được trong dữ liệu: exit 0, 24.2s wall —
tức hàng chục giây, hãy dành ngân sách dưới khoảng 30 giây cho mỗi lần chạy, vì mỗi lần sửa scope
hay hậu tố `.ts` đều phải qua lại nó. Nếu `check:ts` đang đỏ trước khi bạn viết dòng đầu tiên của
`chord`, thì mọi lỗi về sau sẽ lẫn vào lỗi cũ.

**3. Mọi work item trước đó trong M1 phải xong.** 17 hạng mục W1–W17 nằm ở
`MILESTONE_1_EXECUTION_PLAN.md`. Đợt mở rộng này chồng lên chúng ở đúng một chỗ đã biết là tiền đề
sai (xem mục trên) — nhưng ngoài ra nó nối vào code mà W1–W17 đã đụng tới, nên phần còn tồn đọng phải
đóng trước.

---

## Quyết định cần chốt trước khi code

Dữ liệu index tổng hợp được **33 câu hỏi mở** (chord 6, protocol 1, server 1, client 6, durable 8,
telemetry 6, evals 5) nhưng **không chứa nội dung** của chúng, trừ một câu được nêu rõ. Bảng dưới chỉ
liệt kê những câu chặn code mà index có bằng chứng. Phần còn lại nằm trong từng spec package.

| # | Quyết định | Vì sao chặn | Trạng thái |
| --- | --- | --- | --- |
| 1 | Schema engine cho `pi-protocol`: `typebox@1.3.27` (ghim chính xác) hay `@oh-my-pi/omptype/typebox`? | Chặn `pi-protocol` → chặn `pi-server` → chặn 8/27 test của `pi-client`. Mặt `@oh-my-pi/omptype` đã có builder `Type.*` và `Static` mà protocol gọi, cộng `additionalProperties:false`, `minLength`, `pattern`, `minimum`; **chỉ thiếu `Check`**, thay bằng một dòng theo đúng idiom sẵn có của omp: `const r = schema(value); if (r instanceof type.errors) throw ...`. | **Chưa có mặc định — cần bạn quyết** (là `open_questions[0]` của spec protocol) |
| 2 | Cụm `vitest` cho `pi-evals`: thêm 4 package, hay chấp nhận harness không có runner-native? | Thêm thì có hai nền tảng test trong một repo. Không thêm thì `describeEval`, judge, `StructuredOutputJudge`, `ToolCallJudge` và đọc báo cáo vitest đều mất. | **Chưa có mặc định — cần bạn quyết** |
| 3 | Arm `without_docs` của `pi-evals` có còn ý nghĩa trong omp không? | `docs` mà pi xoá không tồn tại ở omp; giữ nguyên thì cả hai arm đọc cùng tài liệu và phép thử đo được không ra gì. Ba cách thoát: viết lại thí nghiệm cho omp, thu hẹp phạm vi, hoặc không chép nhánh đó. | **Chưa có mặc định — cần bạn quyết** |
| 4 | `SessionMetadata` đặt ở đâu? | Nó là bound chung của `ServerHost`/`Server`/`SessionRouter`/`createUnixServer` và **không tồn tại ở đâu trong omp**. Bốn symbol còn lại mà `pi-server` import từ `pi-agent-core` (`Context`, `BACKGROUND_CONTEXT`, `TODO_CONTEXT`, `withAbortSignal`) chỉ là re-export thuần của `@earendil-works/chord/context`, nên trỏ lại `@oh-my-pi/chord/context` là package chỉ còn nợ `pi-agent-core` đúng một symbol. | **Chưa có mặc định — cần bạn quyết** |
| 5 | `MemorySessionRepo` đặt ở đâu? | `TestServerHost` phụ thuộc nó; đây là abstraction session-repository của `pi-agent-core`, không có bản tương đương trong omp và không có chỗ đứng rõ ràng. | **Chưa có mặc định — cần bạn quyết** |
| 6 | Tên scope: giữ `@oh-my-pi/chord` lệch với sáu `@oh-my-pi/pi-*`, hay chuẩn hoá? | Chạm vào mọi dòng import và mọi chuỗi định dạng trên đĩa của `chord` (một trong 6 va chạm của nó là chính các chuỗi định dạng trên đĩa gọi tên package upstream, mà package đó không còn là nữa). | **Chưa có mặc định — cần bạn quyết** |
| 7 | Phiên bản `chord` trong catalog: `18.3.3` hay `0.87.1`? | Index tự mâu thuẫn: ba spec ghi `18.3.3`/`18.3.4`, spec `pi-durable` ghi `0.87.1`. Phải thống nhất trước khi viết bất kỳ `package.json` nào. | **Câu hỏi sai — không phải một lựa chọn để cân.** `0.87.1` là dependency range upstream của `pi`, `18.3.3` là phiên bản publish của omp; chỉ có `18.3.4` là rác và phải bị loại khỏi mọi spec. |
| 8 | Phần văn bản sửa cho W1/W2 về drain. | Xem mục "Một tiền đề của M1 gốc bị bác". Chọn giữa việc sửa lại `MILESTONE_1_EXECUTION_PLAN.md`, hoặc chấp nhận `dispose()` của `chord` như một thiết kế riêng. | **Chưa có mặc định — cần bạn quyết** |

---

## Quy ước khi đọc

**Ngôn ngữ.** Văn xuôi tiếng Việt. Giữ nguyên: đường dẫn, neo dạng `file:line`, tên định danh, câu lệnh,
tên package, tên file test. Khi trích một giá trị đo được, giữ nguyên con số và đơn vị của nguồn.

**Kiểm tra.** `bun run check:ts` và `bun test`. **Tuyệt đối không dùng `tsc`** — dự án cấm. Hai loại
cổng này tách bạch: `check:ts` chạy được ngay, `bun test` cần `packages/natives` đã build (xem Điều
kiện tiên quyết). Không kết luận "xong" khi mới chỉ qua `check:ts`.

**Grep trong test là cấm, grep trong cổng thì được.** Đây là ranh giới quan trọng nhất của mục này và
nó dễ nhầm, vì các spec dùng grep rất nhiều:

- Cổng kiểm tra thì được phép quét: GATE 1b của `pi-protocol` là 6 lệnh grep cơ học (0
  `@earendil-works/`, 0 hậu tố `.ts` trong specifier tương đối, 0 `private`, 0 `vitest`, 0 `any` /
  `ReturnType<` / `await import(`, và dòng LICENSE), cổng của `pi-durable` có 6 mục kiểm tương tự.
  Chúng kiểm tra một thay đổi về HÌNH DẠNG file sau khi chép.
- Test thì không bao giờ được đọc file implementation rồi khẳng định trên **văn bản** của nó. Một
  test kiểu `expect(src).toContain("someCall()")` chết theo mọi refactor vô hại và sống nguyên khi
  hành vi hỏng. Test phải chạy code và kiểm tra hợp đồng quan sát được.

**`mock.module()` thì không bao giờ.** Nó ghi vào module registry toàn cục và rò sang các file test
khác. Thay bằng `vi.spyOn` trên object module đã import, kèm `vi.restoreAllMocks()` trong `afterEach`.
Không có ngoại lệ nào ở đợt này, kể cả trong các file test mới chép sang.

**Phép chép là cơ học; mọi đổi hành vi là một quyết định riêng.** Bộ viết lại cố định cho mọi package
là: bỏ hậu tố `.ts` ở specifier tương đối, đổi `@earendil-works/` sang `@oh-my-pi/`, `private` thành
`#`, `vitest` sang `bun:test`, `ReturnType<>` thành tên kiểu thật, không `await import()` và không
`import("pkg").Type`; xoá mọi script gọi `tsc` trong `package.json` chép (sáu package có
`"build": "tsc -p tsconfig.build.json"`; `pi-server`/`pi-client` còn có
`"typecheck": "tsc -p tsconfig.test.json"`) và thay bằng cổng `bun run check:ts` của repo —
`tsc`/`npx tsc` bị dự án cấm tuyệt đối; `new Promise((resolve, reject) => …)` phải thành
`Promise.withResolvers()` (13 chỗ trong `server`/`durable` `src/`, cộng 5 chỗ trong `client/src/` —
gồm cả `promise.ts` — và 1 chỗ mỗi package ở `chord`/`telemetry`); `console.log` trong
`evals/src/cli.ts` phải qua `logger` từ `@oh-my-pi/pi-utils` trừ khi được chứng minh là CLI độc lập
thoát sớm; script `clean` gọi `shx` phải viết lại vì `shx` không được thêm; `LICENSE`/`NOTICE` phải
được tạo mới từ `LICENSE` ở rễ `pi-ref` chứ không "giữ nguyên văn" (xem mục Vì sao chép chứ không làm
lại). Bất kỳ thay đổi nào ngoài danh sách đó — đặc biệt là bất kỳ thay đổi nào chạm vào một va chạm
ở mục trên — phải được ghi thành một quyết định có tên, không được làm lặng lẽ. Ba va chạm "người
dùng thấy được" ở `pi-durable` là mẫu kinh điển: đừng chọn một giá trị rồi im lặng.
