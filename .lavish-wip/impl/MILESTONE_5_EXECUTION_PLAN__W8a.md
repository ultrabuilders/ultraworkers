# Phiếu triển khai — W8a. 15 file literal dạng trần (sóng 3)

**Nguồn:** `MILESTONE_5_EXECUTION_PLAN.md` mục `## W8a.` (dòng 2264–334).
**Cây đã đối chiếu:** `/Users/tranquangdang21/Projects/ultraworkers` @ `47720fd` (nhánh `milestone-1`).
**Kết quả kiểm lại neo:** 25/35 neo đúng nguyên vẹn · **10 neo hỏng** (bảng ở mục 7.2).
**Kết luận quan trọng nhất:** cây đã trôi khỏi commit nền `84cbac9` mà plan dùng để đếm. Ba file ACP không còn literal nào, và ba file kế hoạch/nghiên cứu mới đã được thêm vào repo. **Cổng A và cổng B của plan, viết nguyên văn, sẽ đỏ trên cây hiện tại dù công việc đã làm đúng** — phần dưới đây viết lại chúng cho đỏ được.

---

## 1. Cái gì thay đổi, quan sát được

`omp gallery` in ra tên dự án `ultraworkers` thay vì `oh-my-pi` trong dòng trạng thái và trong các ảnh chụp màn hình mà lệnh đó tạo; đồng thời bảng chi phí telemetry OTLP, tên ACP client, tên khóa Z.AI, header attribution của Exa và `client_name` của RFC 7591 vẫn giữ nguyên giá trị cũ, và ba giá trị bên thứ ba đó giờ có tên trong `scripts/rename/keep-list.txt` để một đợt thay chuỗi sau này không xoá chúng.

Không có mục changelog nào được thêm: một fixture của lệnh gallery không phải mục changelog, và ba giá trị wire giữ nguyên thì không có gì để thông báo.

---

## 2. Bảng điểm sửa

| đường/dẫn | symbol | TRƯỚC (nguyên văn từ file) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli/gallery-fixtures/segments.ts:33` | `activeRepo.relativeRepoRoot` | `			relativeRepoRoot: "oh-my-pi",` | `			relativeRepoRoot: "ultraworkers",` |
| `packages/coding-agent/src/cli/gallery-fixtures/segments.ts:164` | `worktree.projectName` | `						worktree: { projectName: "oh-my-pi", worktreeName: "gallery-reference" },` | `						worktree: { projectName: "ultraworkers", worktreeName: "gallery-reference" },` |
| `scripts/rename/keep-list.txt` (W7 tạo; **hiện chưa tồn tại**) | ba hàng mới | — | `packages/ai/src/registry/oauth/zai.ts  # N18: tên khóa gửi lên Z.AI qua businessLogin; đổi là tạo khoá khác trong tài khoản người dùng`<br>`packages/coding-agent/src/web/search/providers/exa.ts  # N19: header x-exa-source; đổi làm mất credit traffic attribution, không lỗi cục bộ`<br>`packages/coding-agent/src/mcp/oauth-flow.ts  # N20: client_name trong đăng ký client động RFC 7591; là danh tínhi consent + allowlist của provider` |
| `packages/coding-agent/test/otel-service-name-probe.ts` (TẠI MỚI, ~60 dòng) | probe tiến trình con | — | Bản sao `otel-resource-probe.ts` bỏ `OTEL_SERVICE_NAME` + `OTEL_RESOURCE_ATTRIBUTES`, export 1 span, kiểm `service.name` fallback |
| `packages/coding-agent/test/telemetry-export.test.ts:129-133` | `probes[]` | `			["resource attributes", "./otel-resource-probe.ts"],` | thêm `			["fallback service name", "./otel-service-name-probe.ts"],` |
| `packages/coding-agent/test/telemetry-export.test.ts:149-153` | `expect(Object.fromEntries(results))` | `			"resource attributes": 0,` | thêm `			"fallback service name": 0,` |
| `packages/coding-agent/test/pi-scope-aliases.test.ts:129` | `it("remaps every aliased pi-* scope …")` | describe hiện chỉ có **1** `it()` — không có ca "không scope" | thêm 1 `it()` mới: import đến bằng scope cũ và import đến không scope phải phân giải về CÙNG một package host |

**Không đổi (đã đọc, đã giữ):** `telemetry-export-otlp.ts:51`, `legacy-pi-compat.ts:802`, `zai.ts:25`, `exa.ts:26`, `oauth-flow.ts:629`; `docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` (0 literal dạng trần — chỉ sửa văn xuôi sau W7); 5 file test pin + 2 file test fixture.

---

## 3. Các bước, mỗi bước có neo đã kiểm

### Bước 1 — DỪNG, kiểm 4 điều kiện mở

Cả bốn điều kiện đều **chưa thoả** trên cây hiện tại. Đo được:

| điều kiện | lệnh | kết quả @ `47720fd` |
| --- | --- | --- |
| (a) W7 merged | `git grep -l '@ultraworkers/pi-catalog' -- packages/catalog/package.json` | **ABSENT** — `packages/catalog/package.json:2` vẫn là `"name": "@oh-my-pi/pi-catalog"` |
| (b) W2 merged | `sed -n '796p' packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts` | `const CANONICAL_PI_SCOPE = "@oh-my-pi";` — symbol có, **giá trị chưa đổi** ⇒ W2 chưa merge |
| (c) keep-list duyệt | `test -f scripts/rename/keep-list.txt` | **MISSING** — `scripts/rename/` không tồn tại |
| (d) M2 merged | — | không kiểm được từ cây; giả định chưa |

Hệ quả: **W8a chưa được chạy.** Bước 1–12 dưới đây là bản gõ sau khi bốn điều kiện xanh.

### Bước 2 — Chụp baseline

```bash
git grep -nE '"oh-my-pi"' -- . \
  ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \
  ':!MILESTONE_5_EXECUTION_PLAN.md' \
  ':!RESEARCH_DSH_OMO_2026-09-28.md' \
  ':!RESEARCH_FINDINGS_2026-09-28.md' > /tmp/w8a-bare-baseline.txt
git rev-parse HEAD > /tmp/w8a-head-baseline.txt
```

> **Sửa bắt buộc so với plan.** Plan dùng `':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md'` một mình và kỳ vọng "15 dòng / 23 lượt". Câu đó **chỉ đúng tại `84cbac9`**, khi ba file kế hoạch/nghiên cứu chưa tồn tại. Đo tại `47720fd`:
> - lệnh nguyên văn của plan → **107 dòng / 143 lượt / 15 file**
> - lệnh trên (loại 4 file tài liệu) → **20 dòng / 20 lượt / 12 file**
>
> 12 file đó đúng là 12 file mã mà W8a sở hữu, và 20 lượt = 20 lượt code thật. Xem mục 7.3.

### Bước 3 — Đối chiếu bảng quyết định

Bảng quyết định của plan **đúng 12/15 hàng**; 3 hàng ACP đã bị upstream đổi trước khi W8a kịp chạy. Chi tiết ở mục 7.2. Không thêm hàng mới, không bỏ hàng nào.

### Bước 4 — Sửa DUY NHẤT file nguồn

`packages/coding-agent/src/cli/gallery-fixtures/segments.ts`, hai dòng, tay hoặc editor, **không sed** (file này còn 5 lượt `@oh-my-pi/` mà W7 sở hữu — một sed không phân biệt được).

Kiểm sau khi sửa:

```bash
grep -n 'ultraworkers' packages/coding-agent/src/cli/gallery-fixtures/segments.ts   # đúng 2 dòng
grep -c -F '@oh-my-pi/' packages/coding-agent/src/cli/gallery-fixtures/segments.ts    # vẫn 5
grep -n '/workspace/oh-my-pi' packages/coding-agent/src/cli/gallery-fixtures/segments.ts  # vẫn 2 dòng 31,32
```

### Bước 5 — KHÔNG sửa 6 literal còn lại

`telemetry-export-otlp.ts:51` (N7) · `legacy-pi-compat.ts:802` (N8, của W2) · `zai.ts:25` (N18) · `exa.ts:26` (N19) · `oauth-flow.ts:629` (N20) · `docs/provider-quirks.md:1710` (tài liệu của N18 — **không phải 1706**, xem mục 7.2).

> **Không có dòng ACP nào nữa.** `acp-agent.ts:656` đã là `name: "omp"`; `acp-initialize-conformance.test.ts:235` và `acp-lazy-startup.test.ts:375` đã bỏ hẳn khẳng định. Không có gì để giữ — cũng không có gì để làm. Xem mục 7.2, neo #1–3.

### Bước 6 — KHÔNG sửa 5 file test pin + 2 file fixture

Pin: `packages/ai/test/zai-oauth.test.ts:109,437,444` · `packages/coding-agent/test/oauth-flow.test.ts:81` · `packages/coding-agent/test/tools/web-search-exa.test.ts:577` (không phải 608).
Fixture: `packages/ai/test/cursor-exec-modern.test.ts:280,1450,1458` · `packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:152,160,192,201`.

Tổng: W8a sửa **0 dòng** của 5 file pin và 2 file fixture.

### Bước 7 — Thêm 3 hàng N18/N19/N20 vào keep-list

Mỗi hàng một dòng, `#` bắt buộc. Nội dung lý do nằm ở bảng điểm sửa mục 2. Không sửa, không xoá, không sắp xếp lại hàng N1–N17.

### Bước 8 — Tạo `packages/coding-agent/test/otel-service-name-probe.ts`

Copy cấu trúc từ `packages/coding-agent/test/otel-resource-probe.ts:1-65` (đã đọc đầy đủ 65 dòng). Giữ nguyên: `Bun.serve({ port: 0 })` nhận `POST …/v1/traces` (dòng 21-34), `process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = …` (dòng 36), `await initTelemetryExport(true)` (dòng 40 — **bắt buộc truyền `true`**, plan viết `initTelemetryExport()` không có tham số, sai với chữ ký `telemetry-export.ts:71`), `isTelemetryExportEnabled()` (41), `trace.getTracer(...).startSpan(...)` + `span.end()` (47-49), `await flushTelemetryExport()` (51), `body.toString("latin1")` + `const has = (s: string) => payload.includes(s)` (55-56), in `PROBE: RECEIVED` / `PROBE: NO_EXPORT` (62), `process.exit(0|1)` (64).

Ba khác biệt bắt buộc so với probe gốc:
1. **KHÔNG** có `process.env.OTEL_SERVICE_NAME` (probe gốc đặt ở dòng 37 với giá trị `"svc-probe"`).
2. **KHÔNG** có `process.env.OTEL_RESOURCE_ATTRIBUTES` (probe gốc dòng 38).
3. Phép kiểm: `has("oh-my-pi")` — **đúng giá trị constant của N7**, không hardcode chuỗi khác.

> **Sửa so với plan (mục «Cần người xác nhận» #1, đã tự giải quyết ở đây).** Bước 8 của plan bắt kiểm `has("ultraworkers-fallback-marker")` trong khi quyết định N7 là `keep-wire` ⇒ `SERVICE_NAME` vẫn là `"oh-my-pi"`. Marker đó **không bao giờ khớp**, probe in `PROBE: NO_EXPORT` vĩnh viễn và Gate G đỏ vĩnh viễn. Marker đúng là chính giá trị của N7: `"oh-my-pi"`. Đây là suy ra trực tiếp từ `telemetry-export-otlp.ts:51` đã đọc, không phải phỏng đoán.

### Bước 9 — Nối probe vào `telemetry-export.test.ts`

Thêm một cặp `["fallback service name", "./otel-service-name-probe.ts"]` vào mảng `probes` (dòng 129-133) và một khoá `"fallback service name": 0` vào `expect(Object.fromEntries(results)).toEqual({…})` (dòng 149-153). Giữ nguyên `Bun.spawn([process.execPath, probe], { env: { ...process.env }, … })` (dòng 137-144) — nó là thứ loại các biến OTEL kế thừa mà `beforeEach` (dòng 30-32) đã dọn.

Timeout: describe hiện là `20_000` (dòng 154). **Đã đo**: `bun test packages/coding-agent/test/telemetry-export.test.ts` chạy 9 test trong **545ms** ở cây sạch. Thêm probe thứ tư không cần nới; nếu vẫn nới thì ghi con số đo vào commit, đừng ghi "chưa đo".

### Bước 10 — Phần tài liệu (sau M2)

`docs/extension-loading.md:231` và `docs/porting-from-pi-mono.md:46-51` — đã đọc, **cả hai có 0 literal dạng trần** (`grep -cE '"oh-my-pi"'` → 0 và 0). Sau W7 dòng 46-50 tự động đọc `@mariozechner/… → @ultraworkers/…`. Việc còn lại là **sửa văn xuôi cho khỏi lỗi thời**, không chạy pass thay chuỗi.

### Bước 11 — KHÔNG đụng changelog

### Bước 12 — Chạy cổng theo thứ tự, dừng ở cổng đỏ đầu tiên

Ghi kết quả TỪNG cổng vào commit message.

---

## 4. Hợp đồng test

Hợp đồng duy nhất: **một lần đổi tên cơ học không được âm thầm dịch chuyển một giá trị wire dạng trần.**

**Invariant 1 — PIN TELEMETRY (nhánh fallback).** File mới `packages/coding-agent/test/otel-service-name-probe.ts` + một cặp trong `packages/coding-agent/test/telemetry-export.test.ts`.

- Điều người dùng thấy nếu hồi quy: không có gì đỏ ở đâu cả. `SERVICE_NAME` không được export (`grep '^export' telemetry-export-otlp.ts` → chỉ 4 dòng export, không có nó), không test nào chạm tới, nên đổi tên ở đó **xanh hoàn toàn**; hậu quả là bảng chi phí telemetry tách làm hai service và không ai biết cho tới khi telemetry đã bật trên máy thật. Đây là lỗ hổng duy nhất trong 6 literal còn lại.
- Ca này **bắt buộc là nhánh fallback, không phải nhánh precedence**. `otel-resource-probe.ts` đã tồn tại để chứng minh `OTEL_SERVICE_NAME` THẮNG (dòng 37 đặt biến, dòng 59 comment nói rõ, dòng 60 `precedence = has("svc-probe") && !has("should-lose")`). Sửa nó để khẳng định fallback là **phá hợp đồng precedence**; test sẽ xanh trong khi không còn bảo vệ đúng thứ gì.

**Invariant 2 — PHÂN GIẢI SCOPE KHÔNG GHI CHÈ.** `packages/coding-agent/test/pi-scope-aliases.test.ts`.

- File này **đã tồn tại** (5.3 KB), describe ở dòng 85, hiện chỉ có **một** `it()` ở dòng 129. Thêm ca thứ hai.
- Điều người dùng thấy nếu hồi quy: xoá `"oh-my-pi"` khỏi `PI_SCOPE_ALIASES` (`legacy-pi-compat.ts:802`) làm **mọi extension cũ hỏng bằng module-not-found lúc load plugin** — ở máy người dùng, lúc chạy extension của họ, không phải lúc test.

**Cấm tuyệt đối:** source-grep file implementation; `mock.module()` (rò `Bun` global — [oven-sh/bun#12823](https://github.com/oven-sh/bun/issues/12823)); assert lại 20 literal trong 7 file test; thêm test cho `segments.ts` (không có hợp đồng quan sát được nào đứng sau nó).

---

## 5. Cổng

### Trạng thái môi trường đã đo

| việc | kết quả @ `47720fd` |
| --- | --- |
| native addon | **ĐÃ BUILD** — `./packages/natives/native/pi_natives.darwin-arm64.node` tồn tại |
| `ninja` / `cmake` / `cargo` | đều có trong PATH |
| `bun test test/telemetry-export.test.ts` | **9 pass / 0 fail, 545ms** |
| `bun test test/pi-scope-aliases.test.ts` | **1 pass / 0 fail, 615ms** |

⇒ Gate G **CHẠY ĐƯỢC** trên máy này. Plan ghi "không chạy được trên máy này" là **sai** — commit `47720fd` ngay trên đầu cây đã sửa đúng điều đó cho phần khác của plan. Không được ghi `NOT RUN — environment blocked` cho Gate G.

### Cổng 0 — ĐIỀU KIỆN MỞ (đỏ được, và đang đỏ)

```bash
git grep -qF 'PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"]' \
  packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts \
  || { echo 'GATE 0 FAIL: N8 alias da bi pham'; exit 1; }
test -f scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list.txt missing'; exit 1; }
grep -q 'N7' scripts/rename/keep-list.txt || { echo 'GATE 0 FAIL: keep-list chua qua duyet W7'; exit 1; }
git grep -q '@ultraworkers/pi-catalog' -- packages/catalog/package.json \
  || { echo 'GATE 0 FAIL: W7 chua merge'; exit 1; }
```

**Đỏ được không?** Có. Bốn nhánh đỏ độc lập; ba nhánh sau **đang đỏ trên cây hiện tại** — có nghĩa là cổng này thật sự phân biệt được "W8a chưa làm" với "W8a làm xong". Đã chạy thử: `keep-list.txt` MISSING, `@ultraworkers/pi-catalog` ABSENT.

> **Sửa so với plan.** Gate 0 của plan kiểm `git grep -q 'CANONICAL_PI_SCOPE'` để đòi W2 merged. Câu đó **luôn xanh** vì `CANONICAL_PI_SCOPE` đã tồn tại ở dòng 796 kể từ trước, chỉ là giá trị chưa đổi — nó kiểm "symbol tồn tại", không kiểm "W2 đã merge". Đã đo: câu đó PASSES ở `47720fd` dù `CANONICAL_PI_SCOPE` vẫn là `"@oh-my-pi"`. Muốn nó đỏ được thì phải so **giá trị**, xem bên dưới.

### Cổng A — TẬP FILE TRÒN VẸN (đã viết lại cho đỏ được)

```bash
git grep -nE '"oh-my-pi"' -- . \
  ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' \
  ':!MILESTONE_5_EXECUTION_PLAN.md' \
  ':!RESEARCH_DSH_OMO_2026-09-28.md' \
  ':!RESEARCH_FINDINGS_2026-09-28.md' > /tmp/w8a-bare-after.txt
diff /tmp/w8a-bare-baseline.txt /tmp/w8a-bare-after.txt \
  || { echo 'GATE A FAIL: W8a them/xoa literal o file ngoai bang quyet dinh'; exit 1; }
```

**Đỏ được không?** Có. Đã chạy thử: câu nguyên văn của plan cho **107 dòng** thay vì 15, vì `MILESTONE_5_EXECUTION_PLAN.md` (82 lượt) + 2 file nghiên cứu đã được commit vào repo **sau** `84cbac9`. Cổng đó vẫn kỹ thuật "đỏ được" (một W8a đúng vẫn cho diff rỗng), nhưng nó **so sánh 107 dòng trong đó 87 dòng là văn xuôi kế hoạch** — mọi lần sửa plan sau này đều làm nó đỏ, và nó không còn chứng minh điều gì về W8a. Bốn mẫu loại ở trên đưa nó về đúng 20 dòng code thật.

### Cổng B — LITERAL GIỮ NGUYÊN (đã viết lại cho đỏ được)

```bash
check() { # file line expected-substring
  got=$(sed -n "$2p" "$1")
  case "$got" in
    *"$3"*) return 0 ;;
    *) echo "GATE B FAIL: $1:$2 mat gia tri '$3'"; got="$got"; return 1 ;;
  esac
}
check packages/coding-agent/src/telemetry-export-otlp.ts 51 '"oh-my-pi"' || exit 1
check packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts 802 '"oh-my-pi"' || exit 1
check packages/ai/src/registry/oauth/zai.ts 25 '"oh-my-pi"' || exit 1
check packages/coding-agent/src/web/search/providers/exa.ts 26 '"oh-my-pi"' || exit 1
check packages/coding-agent/src/mcp/oauth-flow.ts 629 '"oh-my-pi"' || exit 1
check docs/provider-quirks.md 1710 '"oh-my-pi"' || exit 1
echo 'GATE B: 6 gia tri wire van nguyen'
```

**Đỏ được không?** Có — nhưng **bản của plan thì không chạy được trên cây này**, đã đo:

| vị trí của plan | kết quả thật |
| --- | --- |
| `telemetry-export-otlp.ts:51` | ok |
| `acp-agent.ts:656` | **FAIL** — dòng đó giờ là `name: "omp",`, không còn literal nào |
| `legacy-pi-compat.ts:802` | ok |
| `zai.ts:25` | ok |
| `exa.ts:26` | ok |
| `oauth-flow.ts:629` | ok |
| `docs/provider-quirks.md:1706` | **FAIL** — dòng 1706 **rỗng**; literal thật ở dòng **1710** |

Hai lỗi này **khác nhau về bản chất** và cả hai đều nguy hiểm:
- `acp-agent.ts:656` đỏ vì **cây đã đổi**, không phải vì ai đó phá — sẽ dạy kỹ sư săn nhầm.
- `provider-quirks.md:1706` đỏ vì file **dài thêm 4 dòng** từ lần commit tài liệu. Đây là loại neo "đúng lúc viết, hỏng khi file lớn thêm" — dễ tái diễn với mọi file tài liệu.

Về độ nhạy của phép so: plan nói `case` khớp literal có dấu nháy kép nên bắt được cả sed nối hậu tố. **Đã kiểm chứng bằng thí nghiệm**: `"oh-my-pi"` và `"oh-my-pi-ultraworkers"` — chỉ khớp vế trước, vế sau bị loại. Tuyên bố của plan là đúng.

### Cổng C — KHÔNG CHẠM FILE NGOÀI DANH SÁCH (đỏ được, có một lỗi cấu hình)

```bash
BASE=$(cat /tmp/w8a-head-baseline.txt)
git diff --name-only "$BASE"..HEAD | sort > /tmp/w8a-touched.txt
printf '%s\n' \
  'packages/coding-agent/src/cli/gallery-fixtures/segments.ts' \
  'packages/coding-agent/test/otel-service-name-probe.ts' \
  'packages/coding-agent/test/telemetry-export.test.ts' \
  'packages/coding-agent/test/pi-scope-aliases.test.ts' \
  'scripts/rename/keep-list.txt' | sort > /tmp/w8a-expected.txt
diff /tmp/w8a-expected.txt /tmp/w8a-touched.txt \
  || { echo 'GATE C FAIL: W8a cham file ngoai danh sach da duyet'; exit 1; }
```

**Đỏ được không?** Có. Nhưng nó **luôn đỏ** cho tới khi cả 5 file kia thật sự bị chạm. Bốn điều kiện mở + Gate 0 đều BLOCKED, nên Gate C chưa từng có cơ hội xanh — và nó sẽ không xanh cho tới khi bước 4, 7, 8, 9 **và** ca test ở bước-invariant-2 đều chạy. Ba tài liệu ở bước 10 không có trong danh sách này, nên nếu bước 10 sửa file thật thì Gate C đỏ. Nếu bước 10 chạy sau W8a ở một commit riêng, bỏ nó khỏi phạm vi Gate C; nếu chạy chung thì phải thêm 2 dòng `docs/...` vào `w8a-expected.txt`. **Chốt một trong hai trước khi gõ** — đây chính là mâu thuẫn #4 mà work item tự ghi nhận và vẫn chưa giải quyết.

### Cổng D — HAI DÒNG GALLERY (đỏ được, một khẳng định thừa)

```bash
BASE=$(cat /tmp/w8a-head-baseline.txt)
read add del file <<<"$(git diff --numstat "$BASE"..HEAD -- packages/coding-agent/src/cli/gallery-fixtures/segments.ts)"
[ "$file" = "packages/coding-agent/src/cli/gallery-fixtures/segments.ts" ] || { echo "GATE D FAIL: file khong doi"; exit 1; }
[ "$add" = "2" ] && [ "$del" = "2" ] || { echo "GATE D FAIL: phai doi DUNG 2 dong (add=$add del=$del)"; exit 1; }
```

**Đỏ được không?** Có. Nhưng khẳng định đầu tiên của plan — `test "$(… | wc -l)" -eq 1` — **đỏ trên một cây chưa đổi gì**, đã đo: `numstat` rỗng ⇒ `wc -l` = 0 ≠ 1. Cổng đỏ ở đây là hành vi mong muốn, nhưng thông báo của nó (`GATE D FAIL: phai doi DUNG 2 dong`) sẽ chỉ ra chuyện không liên quan. Bản trên tách rõ: file chưa đổi và file đổi sai số dòng là hai lỗi khác nhau.

### Cổng E — KEEP-LIST ĐÃ CÓ 3 HÀNG MỚI (đỏ được, đã kiểm chứng)

```bash
for n in N18 N19 N20; do
  grep -q "^$n" scripts/rename/keep-list.txt || { echo "GATE E FAIL: thieu hang $n"; exit 1; }
done
awk -F'#' '/^N1[89]|^N20/ && NF < 2 { print "GATE E FAIL: hang khong co phan # ly do: " $0; found=1 } END { exit found?1:0 }' \
  scripts/rename/keep-list.txt || exit 1
```

**Đỏ được không?** Có, đã chạy thử cả hai nhánh:
- thiếu hàng → `FAIL` với đúng tên hàng;
- hàng thiếu `#` → awk in `GATE E FAIL: hang khong co phan # ly do: N18  packages/ai/…` và **exit 1**.

Hai sửa nhỏ so với plan: `^$n` thay vì `$n` (tránh khớp nhầm `N180`), và `END { exit found?1:0 }` thay vì `exit 1` trong thân vòng lặp (`exit 1` trong awk dừng ngay, bỏ sót các hàng sai phía sau; `END` thì quét hết rồi mới báo).

### Cổng F — TYPECHECK (đỏ được)

```bash
bun run check:ts    # oxlint + oxfmt --check + check:types cho 16 package
```

`check:ts` khai báo ở `package.json:90`. **TUYỆT ĐỐI không dùng `tsc` / `npx tsc`** — `AGENTS.md` cấm, và plan cũng đã tự sửa sang `check:ts`.

### Cổng G — BỘ TEST (CHẠY ĐƯỢC, đỏ được)

```bash
bun test packages/coding-agent/test/telemetry-export.test.ts \
          packages/coding-agent/test/pi-scope-aliases.test.ts
```

**Đỏ được không?** Có, và nó **đã chạy được** — addon đã build, `ninja` có mặt. Đã đo trên cây sạch: 9 pass / 0 fail (545ms) và 1 pass / 0 fail (615ms).

Đừng ghi `NOT RUN — environment blocked`. Nếu một máy khác thật sự chưa build addon thì mới ghi đúng ba chữ ấy, nhưng **không phải trên máy này**.

### Cổng H — BẢNG QUYẾT ĐỊNH CỦA W8b

```bash
awk -F'\t' '$1=="bare-oh-my-pi"' scripts/rename/disposition.tsv | wc -l   # >= 12
```

Ngưỡng đổi từ 15 xuống **12**, và phải loại **4** file tài liệu (không phải 1). File `scripts/rename/disposition.tsv` hiện chưa tồn tại — đúng như thiết kế, W7 mới tạo. Nếu W8b chưa chạy thì bỏ cổng này, đừng ghi xanh.

### Tổng kết cổng

`gate_can_fail: true` — **đúng**. Tám cổng có đường đỏ riêng. Ba cổng của plan (A, B, C) cần sửa trước khi dùng, lý do đo được ở trên; bản viết lại ở đây đã đỏ được trên cây thật.

---

## 6. Cạm bẫy riêng của work item này

1. **Cây đã trôi khỏi commit nền của chính work item, theo cả hai chiều.** Ba file ACP mất literal (upstream `f804d66` đã đổi `agentInfo.name` sang `"omp"` và xoá hai khẳng định test), ba file kế hoạch/nghiên cứu mới xuất hiện trong repo. Nếu kỹ sư tin bảng "15 file / 23 lượt" và cổng A/B nguyên văn, họ sẽ săn ba lỗi không tồn tại và bỏ sót ba lỗi có. Đây là lý do cây phải được đo lại, không đọc lại số trong tài liệu.

2. **Ba hàng keep-list nặng hơn hai dòng rename** — plan nói đúng, và cơ chế cụ thể là: `N18/N19/N20` **không có mục nào trong bảng `N1–N17`**, nên kỹ sư chỉ đọc keep-list mà không đọc phần này sẽ **không biết phải giữ chúng** và sẽ đổi. Đổi `"oh-my-pi"` ở `zai.ts:25` tạo một khoá thứ hai trong tài khoản Z.AI của người dùng — không ném lỗi, chỉ âm thầm tách dữ liệu. Đổi `client_name` ở `oauth-flow.ts:629` có thể khiến Figma từ chối client trong allowlist. Cả hai đều thất bại ở nơi không ai nhìn thấy.

3. **Sửa nhầm `otel-resource-probe.ts` thay vì tạo probe anh em.** File đó đặt `OTEL_SERVICE_NAME = "svc-probe"` (dòng 37) và tồn tại chính để chứng minh biến môi trường thắng giá trị fallback (dòng 59-60). Sửa nó để khẳng định fallback là phá hợp đồng precedence: test sẽ **xanh** trong khi không còn bảo vệ đúng thứ gì — xanh giả, tệ hơn đỏ.

4. **Marker của probe mâu thuẫn với quyết định N7.** Bước 8 của plan bắt kiểm `has("ultraworkers-fallback-marker")` trong khi N7 là `keep-wire`. Marker đó không bao giờ khớp và Gate G đỏ vĩnh viễn. Marker đúng là `"oh-my-pi"` — cùng giá trị với `telemetry-export-otlp.ts:51`, không phải chuỗi thứ hai.

5. **`initTelemetryExport()` thiếu tham số.** Bước 8 của plan viết `await initTelemetryExport()`. Chữ ký thật ở `telemetry-export.ts:71` là `initTelemetryExport(exportEnabled: boolean)` — bắt buộc `initTelemetryExport(true)`, đúng như probe gốc dòng 40. Gọi không tham số là lỗi type, `check:ts` đỏ.

6. **Đừng chạy `sed` trên `segments.ts`.** File đó chứa cùng lúc 2 literal dạng trần (dòng 33, 164 — việc của W8a) và 5 lượt `@oh-my-pi/` (việc của W7). Một `sed` không phân biệt được, và sẽ **hoàn nguyên công việc của W7**. Sửa tay.

7. **`/workspace/oh-my-pi` ở dòng 31-32 không thuộc W8a.** Nó là dạng trần không có dấu nháy kép, `sed` scope của W7 không chạm tới, và thuộc W8b. Nhưng nó **có một test quan sát được**: `packages/coding-agent/test/modes/components/status-line/component.test.ts:176` khẳng định `expect(text).not.toContain("/workspace/oh-my-pi")`. Đổi dòng 31-32 sẽ không làm test đỏ (khẳng định `not.toContain` vẫn đúng với giá trị mới) — nghĩa là **đổi nó là thay đổi không ai canh**, và cũng nghĩa là đừng đụng vào nó ở W8a.

8. **Review bằng `git diff main..HEAD` là thấy bẩn.** 14/15 file trong bảng W8a cũng chứa dạng có dấu `/` mà W7 đã đổi (đo: `acp-lazy-startup` 16, `acp-initialize-conformance` 10, `acp-agent` 8, `legacy-pi-compat` 7, `zai-oauth` 6, `cursor-exec-modern` 6, `web-search-exa` 6, `segments` 5, `oauth-flow` 5, `telemetry` 4, `exa` 2, `git-hosting` 2, `oauth-flow.test` 2, `provider-quirks` 1; chỉ `zai.ts` có 0). Review phải so `git diff $(cat /tmp/w8a-head-baseline.txt)..HEAD`.

---

## 7. Phụ lục — Bảng neo đã kiểm

Cột "kết quả" là trạng thái **tại `47720fd`**. Mọi trích dẫn đều từ file vừa mở bằng `sed -n` / `rg` / `git show`.

### 7.1 Neo ĐÚNG (25)

| # | neo | dòng thật | nội dung thật |
| --- | --- | --- | --- |
| 1 | `segments.ts:33` | 33 | `relativeRepoRoot: "oh-my-pi",` ✓ |
| 2 | `segments.ts:164` | 164 | `worktree: { projectName: "oh-my-pi", worktreeName: "gallery-reference" },` ✓ |
| 3 | `segments.ts:31-32` | 31-32 | `cwd: "/workspace/oh-my-pi",` / `repoRoot: "/workspace/oh-my-pi",` ✓ |
| 4 | `segments.ts:23` | 23 | `/** Deterministic full context for isolated status-segment previews and tests. */` ✓ |
| 5 | `gallery-cli.ts:1-9` | 1-9 | docblock mô tả `omp gallery` in ra stdout ✓ |
| 6 | `cli-commands.ts:121-126` | 123-126 | `name: "gallery",` + `load:` + `help:` ✓ |
| 7 | `telemetry-export-otlp.ts:51` | 51 | `const SERVICE_NAME = "oh-my-pi";` ✓ |
| 8 | `telemetry-export-otlp.ts:121` | 121 | `resourceFromAttributes({ "service.name": SERVICE_NAME }).merge(` ✓ |
| 9 | `telemetry-export-otlp.ts` "không export SERVICE_NAME" | — | `grep '^export'` → chỉ 4 dòng (79, 93, 116, 409), không có nó ✓ |
| 10 | `legacy-pi-compat.ts:796` | 796 | `const CANONICAL_PI_SCOPE = "@oh-my-pi";` ✓ |
| 11 | `legacy-pi-compat.ts:802` | 802 | `const PI_SCOPE_ALIASES = ["oh-my-pi", "mariozechner", "earendil-works"] as const;` ✓ |
| 12 | `zai.ts:24` | 24 | `/** OMP's own key name so sign-in never mutates ZCode's \`zcode-api-key\`. */` ✓ |
| 13 | `zai.ts:25` | 25 | `const KEY_NAME = "oh-my-pi";` ✓ |
| 14 | `zai.ts:171` | 171 | `postJson(keysUrl, { name: KEY_NAME }, auth, fetchImpl)` ✓ |
| 15 | `zai.ts` scope token = 0 | — | `grep -c -F '@oh-my-pi/'` = 0 ✓ (file duy nhất W7 không đụng) |
| 16 | `exa.ts:26` | 26 | `const EXA_MCP_SOURCE = "oh-my-pi";` ✓ |
| 17 | `exa.ts:369` | 369 | `"x-exa-source": EXA_MCP_SOURCE,` ✓ |
| 18 | `oauth-flow.ts:629` | 629 | `client_name: "oh-my-pi",` ✓ |
| 19 | `oauth-flow.ts:612-620` | 612-620 | docblock về Figma allowlist ✓ |
| 20 | `zai-oauth.test.ts:109,437,444` | 109/437/444 | `{ name: "oh-my-pi" … }` ✓ |
| 21 | `oauth-flow.test.ts:81` | 81 | `expect(…client_name).toBe("oh-my-pi");` ✓ |
| 22 | `cursor-exec-modern.test.ts:280` | 280 | `repository: create(ConnectScmGithubRepositorySchema, { owner: "can1357", repo: "oh-my-pi" })` ✓ |
| 23 | `otel-resource-probe.ts:37` | 37 | `process.env.OTEL_SERVICE_NAME = "svc-probe";` ✓ |
| 24 | `otel-resource-probe.ts:59` | 59 | `// OTEL_SERVICE_NAME must win over the service.name in OTEL_RESOURCE_ATTRIBUTES.` ✓ |
| 25 | `telemetry-export.test.ts:118-124` / `140-144` | 129-133 / 149-153 | mảng `probes` 3 phần tử; `expect(Object.fromEntries(results))` — lệch ~11 dòng, vẫn là đúng block ✓ |

Ngoài ra đã xác nhận đúng: `extension-loading.md:231` (bullet `onLoad` với `@oh-my-pi/pi-catalog/models` + `@mariozechner/*`), `porting-from-pi-mono.md:46-51` (bảng 5 dòng map scope), cả hai có `grep -cE '"oh-my-pi"'` = **0**; `provider-quirks.md:1` là `# Provider quirks: …` (0 literal); `extension-scope-canonicalization.test.ts` và `telemetry-export-otlp.test.ts` **không tồn tại** (đúng như work item đã tự sửa); `pi-scope-aliases.test.ts` **có tồn tại** (đúng như work item đã tự sửa).

### 7.2 Neo HỎNG (10)

| # | neo trong work item | thực tế @ `47720fd` | nguyên nhân | ảnh hưởng |
| --- | --- | --- | --- | --- |
| 1 | `acp-agent.ts:656` = `agentInfo.name = "oh-my-pi"` | dòng 656 là `name: "omp",` — **không còn literal dạng trần** | upstream `f804d66` "Sync from upstream omp 18.4.0" đã đổi | **GATE B đỏ ngay**, săn nhầm; hàng N5 của bảng quyết định không còn đối tượng; 3/15 file của baseline biến mất |
| 2 | `acp-initialize-conformance.test.ts:235` = `agentInfo.name === "oh-my-pi"` | dòng 235 là `title: "omp",`; khẳng định `name` đã bị xoá | cùng commit | hàng pin của bảng quyết định không tồn tại; "5 file pin" thực chất còn **3** |
| 3 | `acp-lazy-startup.test.ts:375` = `expect.objectContaining({ name: "oh-my-pi" })` | dòng 375 là `protocolVersion: 1,`; dòng `agentInfo: …` đã bị xoá | cùng commit | như #2 |
| 4 | `docs/provider-quirks.md:1706` | dòng 1706 **rỗng**; literal thật ở **1710** | `docs/provider-quirks.md` +5/-1 kể từ baseline (thêm mục Z.AI) | **GATE B đỏ ngay** tại một vị trí không liên quan; cần dùng 1710 |
| 5 | `web-search-exa.test.ts:608` | literal ở dòng **577** | file rút ngắn 31 dòng | đọc sai dòng trong bảng quyết định; cổng tương lai theo số dòng sẽ hỏng |
| 6 | `cursor-exec-modern.test.ts:1474` | dòng **1450** | file rút ngắn | như #5 |
| 7 | `cursor-exec-modern.test.ts:1482` | dòng **1458** | file rút ngắn | như #5 |
| 8 | `git-hosting.test.ts:214` | dòng **152** | file rút ngắn 62 dòng | như #5 |
| 9 | `git-hosting.test.ts:222` | dòng **160** | như trên | như #5 |
| 10 | `git-hosting.test.ts:254, 263` | dòng **192, 201** | như trên | như #5 |

### 7.3 Sai lệch đo được khác (không phải neo hỏng, nhưng làm work item sai)

| claim | số trong work item | số đo được @ `47720fd` | lệch |
| --- | --- | --- | --- |
| số dòng baseline Gate A | 15 | **107** với lệnh nguyên văn của plan; **20** khi loại 4 file tài liệu | +92 / +5 |
| số lượt baseline | 23 | **143** nguyên văn; **20** code thật | +120 / −3 |
| số file | 15 | **15** nguyên văn — nhưng **cùng số, khác tập**: 12 file mã của W8a + `MILESTONE_5_EXECUTION_PLAN.md` + 2 file nghiên cứu | trùng số, sai nội dung |
| số file quyết định | 15 | **12** còn literal | −3 |
| ngưỡng Gate H | `>= 15` | `>= 12` | −3 |
| `test/pi-scope-aliases.test.ts` "CHƯA kiểm chứng" | chưa xác minh | **đã tồn tại**, 5.3 KB, describe ở 85, 1 `it()` ở 129 | — |
| `initTelemetryExport()` (bước 8) | không tham số | `initTelemetryExport(exportEnabled: boolean)` — thiếu `true` | lỗi type |
| Gate G "không chạy được trên máy này" | `NOT RUN` | addon đã build, test chạy 9 pass / 1 pass | claim sai |
| "7 giá trị wire giữ nguyên" | 7 | 6 hàng `keep-wire` thật (N7, N5✗, N8, N18, N19, N20) — N5 không còn; hàng thứ 7 là `keep-doc` | số lệch |

> Nguồn gốc của toàn bộ lệch: work item được đối chiếu ở `84cbac9`; HEAD hiện tại là `47720fd`, **12 commit sau**, trong đó `f804d66` (sync upstream) xoá 3 literal và `14f2c1f` thêm chính file kế hoạch vào repo.
