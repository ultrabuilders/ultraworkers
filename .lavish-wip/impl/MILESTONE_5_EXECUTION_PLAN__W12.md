# PHIẾU TRIỂN KHAI — W12: Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md` dòng 3713–3840 (mục `## W12.`)
**Đo trên:** HEAD `47720fd` (plan viết nhắm `84cbac9` / `5873776`)
**Ngày đo:** 2026-09-29
**Kết luận ngắn:** phía nhận (`update-cli.ts`) đã đúng và không cần sửa. Việc thật là
một override `publishBin` theo từng lần phát hành ở phía sản xuất. **Ba claim trong
plan đã hỏng theo giá trị** — đọc mục "Neo hỏng" cuối phiếu trước khi gõ.

---

## 1. Cái gì thay đổi, quan sát được

Một người dùng đang chạy `omp` ở scope cũ và **không bao giờ chạy `omp update`** sẽ
vẫn có một lệnh `omp` chạy được sau khi bản cuối dưới tên cũ được phát hành — vì
lần publish đó ghi đè `bin` bằng `{ omp: <shim> }` thay vì kế thừa
`{ ultraworkers: ... }` mà W9 sẽ đặt vào bảng.

Không có thay đổi nào ở phía parser. Không có thay đổi hành vi nào ở phía người
dùng đã có updater hiểu rename pointer — họ đã đi qua đường đó từ trước.

---

## 2. Bảng điểm sửa

Trích "TRƯỚC" từ file thật, mở bằng `sed -n` ở phần Neo hỏng bên dưới.

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `scripts/ci-release-publish.ts:69` | `PublishPackage.publishBin` | `publishBin?: Readonly<Record<string, string>>;` | **giữ nguyên.** Đây là trường tĩnh, một giá trị cho mọi lần publish của thư mục. Bỏ nó là `:298` ném lỗi và làm `run-ci.sh:156` exit 1. |
| `scripts/ci-release-publish.ts:186` | phần tử `packages/coding-agent` | `publishBin: { omp: "dist/cli.js" },` | **giữ nguyên vị trí**, giá trị sẽ đổi thành `{ ultraworkers: "dist/cli.js" }` ở W9. Override stub **không** được viết ở đây. |
| `scripts/ci-release-publish.ts:240` | `rewriteManifest` | `export async function rewriteManifest(pkg: PublishPackage, write: boolean): Promise<PackageManifest> {` | thêm tham số thứ 3 tuỳ chọn: `(pkg, write, binOverride?: Readonly<Record<string,string>>)`. Hai call site 2-arg hiện có (`:287` và hai call trong test) không phải sửa. |
| `scripts/ci-release-publish.ts:243` | ghi `bin` trong `rewriteManifest` | `if (pkg.publishBin) manifest.bin = { ...pkg.publishBin };` | `if (binOverride) manifest.bin = { ...binOverride }; else if (pkg.publishBin) manifest.bin = { ...pkg.publishBin };` — override thắng, tĩnh làm fallback. |
| `scripts/ci-release-publish.ts:287` | `preparePackage` | `return rewriteManifest(pkg, !isDryRun);` | `return rewriteManifest(pkg, !isDryRun, releaseBinOverride(pkg.dir));` — nơi duy nhất override theo từng lần phát hành được nối vào đường publish. |
| `scripts/ci-release-publish.ts:296-298` | `applyPublishBin` | `if (!pkg?.publishBin) throw new Error(\`No publishBin override declared for ${pkgRelDir}\`);` | **không sửa.** Đây là hàm của install-test, không phải đường publish; nó phải tiếp tục đọc `publishBin` tĩnh. |
| `scripts/ci-release-publish.test.ts:214`, `:244` | hai test `rewriteManifest(pkg, false)` | `const manifest = await rewriteManifest(pkg, false);` (×2, ở test `packages/omptype` và `packages/utils`) | **không sửa.** Chứng minh tham số thứ 3 là tuỳ chọn. |
| `scripts/ci-release-publish.test.ts` | test mới | (file không có assertion nào về `bin` — `grep -c 'publishBin\|manifest\.bin'` = **0**) | thêm `describe("stub release bin override")` với 2 case, xem mục 4. |
| `packages/coding-agent/package.json:3` | `version` | `"version": "18.4.0",` | **> 18.4.0**, tuyệt đối không hạ. Xem cạm bẫy #1. |
| `packages/coding-agent/package.json:27-29` | `bin` | `"bin": {` / `"omp": "src/cli.ts"` / `},` | giữ nguyên trong repo (source install cần nó). Khối `omp:` stub **không** nằm ở đây — xem quyết định open question 1. |
| `scripts/ci-macos-sign.sh` | — | — | **không sửa.** Đã tham số hoá theo tên ở `:35`, đã verify ở `:109`. Chỉ chạy lại. |
| `.github/workflows/ci.yml` | — | 9 hit `omp-darwin-arm64` tại 922, 1206, 1207, 1210, 1211, 1213, 1214, 1218, 1225 | **thuộc W10, không sửa ở đây.** Nhưng W12 không được ký duyệt khi còn 9 hit. |
| `scripts/install-tests/run-ci.sh:94`, `:103` | — | `cp packages/coding-agent/dist/omp "$BINARY_DIR/omp"` / `smoke_cli "$BUN_INSTALL/bin/omp"` | **thuộc W10, không sửa ở đây.** Thiếu artifact này thì ma trận cài đặt vỡ. |

---

## 3. Các bước

### Bước 1 — Xác nhận parser rename đã đúng, KHÔNG sửa

```bash
grep -n 'resolveReleaseDist\|resolveReleaseRename\|isRecord(manifest\.omp)' packages/coding-agent/src/cli/update-cli.ts
```

Kỳ vọng **đúng 7 dòng**: `165`, `166`, `189`, `190`, `875`, `895`, `907`.

- `:165` `export function resolveReleaseDist(manifest: unknown): ReleaseDist | undefined {` ✓
- `:166` `if (!isRecord(manifest) || !isRecord(manifest.omp)) return undefined;` ✓
- `:189` `export function resolveReleaseRename(manifest: unknown): ReleaseRename | undefined {` ✓
- `:190` `if (!isRecord(manifest) || !isRecord(manifest.omp)) return undefined;` ✓

Dừng lại **chỉ khi** thiếu một trong bốn dòng trên. Tên key `omp` là `do_not_rename` N1.

**Neo đã kiểm:** `packages/coding-agent/src/cli/update-cli.ts:165,166,189,190`

### Bước 2 — Đọc coverage sẵn có, đừng viết lại

```bash
sed -n '60,79p' packages/coding-agent/test/cli/update-cli.test.ts
grep -n 'resolveReleaseDist\|resolveReleaseRename' packages/coding-agent/test/update-cli.test.ts
```

Case rename-pointer hai chặng đã có ở `test/cli/update-cli.test.ts:60-79`; chốt vòng
lặp ở `:90` (`it("ignores a rename pointer that cycles back to an already-visited
package", ...)`). Case parser ở `test/update-cli.test.ts:642-653` và `:1420-1431`.

**Neo đã kiểm:** `packages/coding-agent/test/cli/update-cli.test.ts:60-79`, `:90`

### Bước 3 — Viết test và làm nó ĐỎ trước

Thêm vào `scripts/ci-release-publish.test.ts`. **Dùng đúng hình dạng dưới đây** —
xong mục "Cạm bẫy #3" để hiểu vì sao plan ghi thiếu tham số thứ ba.

```ts
describe("stub release bin override", () => {
	let originalPublishBin: Readonly<Record<string, string>> | undefined;
	const codingAgent = () => {
		const pkg = packages.find(entry => entry.dir === "packages/coding-agent");
		if (!pkg) throw new Error("coding-agent missing from publish set");
		return pkg;
	};

	beforeEach(() => {
		originalPublishBin = codingAgent().publishBin;
	});
	afterEach(() => {
		codingAgent().publishBin = originalPublishBin;
	});

	// RED hôm nay: :243 ghi đè bin bằng publishBin tĩnh → không còn key `omp`.
	it("keeps the omp key when the stub release supplies a bin override", async () => {
		const pkg = codingAgent();
		pkg.publishBin = { ultraworkers: "dist/cli.js" }; // trạng thái sau W9

		const manifest = await rewriteManifest(pkg, false, { omp: "dist/cli.js" });

		expect(manifest.bin).toEqual({ omp: "dist/cli.js" });
	});

	// Nhánh đối chiếu: không có override thì bản tên mới đi đúng đường của nó.
	// Nếu case này không có, một bản cài đặt "luôn giữ omp" sẽ xanh vô lý.
	it("falls back to the table publishBin when no override is supplied", async () => {
		const pkg = codingAgent();
		pkg.publishBin = { ultraworkers: "dist/cli.js" };

		const manifest = await rewriteManifest(pkg, false);

		expect(manifest.bin).toEqual({ ultraworkers: "dist/cli.js" });
	});
});
```

Chạy và **xác nhận ĐỎ**:

```bash
bun test scripts/ci-release-publish.test.ts
```

Case 1 đỏ hôm nay vì `:243` bỏ qua mọi override. Case 2 xanh sẵn (nhánh fallback
là hành vi hiện tại) — đó là đúng, nó là chân đối của case 1.

**Đo nền trước khi sửa:** `bun test scripts/ci-release-publish.test.ts` →
**11 pass / 0 fail / exit 0**. Vậy một FAIL ở đây là đỏ thật từ thay đổi của bạn, không
phải nhiễu môi trường.

**Neo đã kiểm:** `scripts/ci-release-publish.test.ts:214`, `:244` (hai call site
2-arg sẽ không vỡ), `scripts/ci-release-publish.ts:243` (chỗ ghi `bin`)

### Bước 4 — Quyết open question 1, viết vào COMMIT MESSAGE

Khối `omp` stub soạn ở đâu?

- **A. Trong `packages/coding-agent/package.json`.** Đơn giản nhất. Nhưng mọi lần
  publish của thư mục đó — kể cả package tên mới — đều mang rename pointer trỏ về
  chính nó. Vòng lặp rename tự trỏ.
- **B. Tiêm theo từng lần phát hành.** Nhiều code hơn, nhưng pointer chỉ đi trên bản
  cuối dưới tên cũ.

Plan không chọn. **Chọn trong im lặng là cách đưa lựa chọn sai lên production.**
Ghi lý do vào commit message, không vào comment.

**Neo đã kiểm:** `packages/coding-agent/package.json:27-29` (chỉ có `bin`, **không**
có khối `omp:` — `grep -n '"omp"' packages/coding-agent/package.json` trả về đúng
một hit, ở dòng 28)

### Bước 5 — Cài override `publishBin` theo từng lần phát hành

Ràng buộc cứng, đã kiểm: `:298` **ném lỗi** khi phần tử `packages[]` không có
`publishBin`, và `scripts/install-tests/run-ci.sh:156` gọi
`applyPublishBin("packages/coding-agent", true)` không có guard → lỗi đó làm
`run-ci.sh` exit 1. **Override phải được thêm BÊN CẠNH `publishBin` tĩnh ở `:186`,
không được thay thế nó.**

Hình dạng:

1. `rewriteManifest(pkg, write, binOverride?)` — `binOverride` thắng `publishBin`.
2. Một hàm nhỏ đọc override theo lần phát hành (env var là lựa chọn ít thay đổi
   nhất: `ci.yml` set, `applyPublishBin` không set nên không bị ảnh hưởng).
3. Nối vào `:287` trong `preparePackage` — **đây là đường publish thật**.

**Đừng** nối vào `applyPublishBin` (`:296`). Đó là helper của install-test, và
`run-ci.sh:156` sẽ không bao giờ thấy stub.

**Neo đã kiểm:** `scripts/ci-release-publish.ts:69,186,240,243,287,296-298` ·
`scripts/install-tests/run-ci.sh:156`

### Bước 6 — Làm xanh và chạy lại cả bộ script

```bash
bun test scripts/ci-release-publish.test.ts          # 11 + 2 = 13 pass / 0 fail
bun run test:scripts                                  # 5 file, 37 + 2 = 39 pass
```

**Đo nền 2026-09-29:** `bun run test:scripts` → **exit 0, 37 pass / 0 fail** (5 file).
Không kỳ vọng nó đỏ ở `ci-test-ts` như plan nói — trạng thái đó đã cũ, xem mục 6.

**Neo đã kiểm:** `scripts/ci-release-publish.ts:243`

### Bước 7 — Tính liên tục dòng version

Stub phải **> `18.4.0`** (giá trị ở `packages/coding-agent/package.json:3` hôm nay)
và không bao giờ hạ. `getLatestRelease` (`update-cli.ts:884`) phân giải version từ
manifest cuối trong chuỗi; `shouldForceBinaryUpdate` (`:216-222`) so sánh nó. Một lần
hạ version làm mọi lần update so sánh ra là "đã là bản mới nhất": update im lặng
không bao giờ tới, **không lỗi ở bất kỳ đâu, không test đỏ nào**.

Đây là sai lầm tốn kém nhất trong work item này. **Plan ghi version là `18.3.3` —
sai. Xem cạm bẫy #1.**

**Neo đã kiểm:** `packages/coding-agent/package.json:3` = `"version": "18.4.0",`

### Bước 8 — Chặn: W10 phải đã đổi 9 dòng trong `ci.yml`

```bash
grep -c 'omp-darwin-arm64' .github/workflows/ci.yml   # phải KHÁC 9
```

**Đo hôm nay: `9`** — tại 922, 1206, 1207, 1210, 1211, 1213, 1214, 1218, 1225.

Nếu còn 9, W12 **không được ký duyệt**: job verify curl 404 vì một lý do không
liên quan gì tới chữ ký. Đây là cổng đỏ **thật và có chủ sở hữu rõ ràng** (W10),
khác với mọi cổng khác trong work item.

**Neo đã kiểm:** `.github/workflows/ci.yml:922,1206,1207,1210,1211,1213,1214,1218,1225`

### Bước 9 — Ký lại dưới tên file mới (chạy lại, không sửa)

`ci.yml:974` gọi `bash scripts/ci-macos-sign.sh "${{ matrix.binary_path }}"`. Script đã
làm `codesign --verify --strict --verbose=4 "$BINARY"` ở `:109`, probe `--version` /
`--smoke-test` ở `:117-118`, vòng khứ hồi `notarytool` ở `:120-145`. **Không sửa gì.**

Việc thật của W12 ở đây là **chạy lại** dưới tên mới. Đây là điều kiện tiên quyết
của bản phát hành, không phải một việc làm sau.

**Neo đã kiểm:** `scripts/ci-macos-sign.sh:35,109,117-118,120-145` · `ci.yml:974`

### Bước 10 — Ngoài repo, BLOCKED

Ba việc, cả ba đều ngoài repo, cả ba đều chặn thẳng W12:

1. Scope `@ultraworkers` tồn tại và đã được sở hữu?
2. Scope cũ còn phát hành được cho stub?
3. Có danh tính ký Apple?

Không có cái nào thì W12 là **BLOCKED** — không đánh dấu xong, không nới rộng phạm
vi để lách. Nguồn kiểm tra identity: `scripts/ci-macos-sign.sh:94-98`.

**Neo đã kiểm:** `scripts/ci-macos-sign.sh:94-98`

### Bước 11 — Xác minh rename end-to-end với manifest đã phát hành thật

Cần truy cập registry. Nếu không làm được, **nói rõ trong bàn giao** thay vì thay
bằng một test fixture — fixture chứng minh parser, không phải bản phát hành.

**Neo đã kiểm:** `packages/coding-agent/src/cli/update-cli.ts:894-902` (vòng lặp
`for (let hop = 0; hop < MAX_RENAME_HOPS; hop++)` → `}`, đóng đúng ở 902)

---

## 4. Hợp đồng test

**File:** `scripts/ci-release-publish.test.ts` (thêm vào, không sửa file khác)

| case | assertion | ĐỎ trước / XANH sau |
| --- | --- | --- |
| `keeps the omp key when the stub release supplies a bin override` | `rewriteManifest(pkg, false, { omp: "dist/cli.js" })` → `manifest.bin` **bằng** `{ omp: "dist/cli.js" }` khi `pkg.publishBin` đã bị W9 đổi thành `{ ultraworkers: ... }` | **ĐỎ** → xanh |
| `falls back to the table publishBin when no override is supplied` | không truyền override → `manifest.bin` bằng `{ ultraworkers: "dist/cli.js" }` | xanh sẵn (nhánh fallback là hành vi hiện tại) |

Hai case là **một hợp đồng hai mặt**: override là *theo từng lần phát hành*, không
phải "luôn giữ `omp`" và không phải "luôn theo bảng". Bỏ case thứ hai thì một bản
cài đặt "luôn giữ `omp`" sẽ xanh vô lý.

**Người dùng thấy gì nếu hồi quy:**

- Case 1 đỏ → manifest stub không có key `omp` → `bun install -g
  @oh-my-pi/pi-coding-agent` trên một máy đã có `omp` sẽ **xoá lệnh `omp` khỏi
  PATH**. Người dùng type `omp` → `command not found`. Không có thông báo nào, vì
  package vẫn cài thành công — nó chỉ không còn mang binary.
- Case 2 đỏ → mọi lần publish, kể cả bản tên mới, đều mang `bin: { omp: ... }` →
  người dùng bản mới cài xong vẫn không có lệnh `ultraworkers`, và updater của họ
  có thể đi vòng rename về chính nó.

**Có phải tautology không?** Không. Case 1 assert một phép biến đổi (đầu vào override
→ đầu ra `manifest.bin`), không phải một hằng số được echo lại. Nhưng nó chỉ chứng
minh **hàm** tôn trọng override — nó **KHÔNG** chứng minh pipeline publish của lần
stub thật sự truyền override. Khoảng trống đó đóng bằng bước 11, không đóng được bằng
unit test. Đừng viết một test fixture cho nó và gọi là phủ.

**Không làm:** không thêm case manifest vào
`test/cli/update-rename-migration.integration.test.ts` (file 170 dòng, **không có**
seam manifest nào — `grep 'manifest\|resolveRelease'` trên file đó trả về **không
hit nào**; nó chỉ điều khiển `migrateRenamedInstall` qua `RenameMigrationSteps` ở
`:108-120` và `:149-161` với npm/bun thật trên fixture `file:`). Không dùng
`mock.module()`. Không source-grep file cài đặt.

---

## 5. Cổng

### Tier 1 — chạy được, đã đo xanh

```bash
bun run check:ts
```

**Đo 2026-09-29: exit 0.** Không cần addon. **CÓ ĐỎ ĐƯỢC KHÔNG?** Không — đây là
type-check, nó đỏ vì lỗi kiểu, không phải vì hành vi W12. Giữ như smoke, đừng gọi
nó là tín hiệu.

### Tier 2 — tầng phân biệt, CÓ ĐỎ ĐƯỢC

```bash
bun test scripts/ci-release-publish.test.ts
```

**Đo nền trước khi sửa: 11 pass / 0 fail / exit 0.** Không cần addon, không cần
network, không cần credential.

**CÓ ĐỎ ĐƯỢC KHÔNG? CÓ — và đây là câu trả lời quan trọng nhất của phiếu.**

Bằng cách nào: case 1 ở bước 3 lấy `pkg` từ `packages[]`, gán
`pkg.publishBin = { ultraworkers: "dist/cli.js" }` (trạng thái sau W9), gọi
`rewriteManifest(pkg, false, { omp: "dist/cli.js" })`. Hôm nay `:243` là
`if (pkg.publishBin) manifest.bin = { ...pkg.publishBin };` — không đọc tham số thứ
ba, không có tham số thứ ba — nên `manifest.bin` ra `{ ultraworkers: "dist/cli.js" }`
và `expect(manifest.bin).toEqual({ omp: "dist/cli.js" })` **fail**. Đỏ thật, trên máy
này, ngay bây giờ, không cần build gì.

Vì suite nền xanh sạch (11/11), một FAIL ở đây không thể là nhiễu. Đây là tầng phân
biệt được "xong" với "test chưa chạy được".

### Tier 3 — KHÔNG còn bị chặn (plan đã lỗi thời)

```bash
bun --cwd=packages/natives run build     # exit 0
(cd packages/coding-agent && bun test test/cli/update-cli.test.ts test/update-cli.test.ts)
bun run test:scripts
```

**Đo lại 2026-09-29:**
- `bun --cwd=packages/natives run build` → **exit 0** (addon dựng xong tại
  `packages/natives/native/pi_natives.darwin-arm64.node`)
- `(cd packages/coding-agent && bun test test/cli/update-cli.test.ts test/update-cli.test.ts test/cli/update-rename-migration.integration.test.ts)` → **107 pass / 1 skip / 0 fail**
- `bun run test:scripts` → **exit 0, 37 pass / 0 fail** (5 file, gồm cả `ci-test-ts`)

`ninja` **đã có** ở `/opt/homebrew/bin/ninja`. Plan ghi "không có" và dựng cả
phân tầng cổng lên đó. **Không ghi "BLOCKED" cho tầng này nữa** — chạy thật rồi báo
số thật. (Cổng vẫn nên ghi, vì nó bắt hồi quy ngoài W12; nhưng **ĐỎ ĐƯỢC** và đỏ
không phải vì W12.)

### Tier 4 — ngoài repo, **KHÔNG ĐỎ ĐƯỢC, BÁO BLOCKED**

Publish stub lên registry · rename end-to-end với manifest thật · `codesign
--verify --strict` trên artifact đã ký lại · tính khả dụng của danh tính Apple.

Đây là **checklist**, không phải cổng. Không có lệnh nào trong repo trả exit code
theo kết quả của chúng, và không lệnh nào **từng đỏ được**. Đừng ghi chúng vào một
"completion gate" — hãy báo `BLOCKED` với lý do và tên người sở hữu credential.

### Cổng chặn chéo W10 (đỏ THẬT, có chủ sở hữu)

```bash
grep -c 'omp-darwin-arm64' .github/workflows/ci.yml   # phải ≠ 9
grep -n 'dist/omp\|BUN_INSTALL/bin' scripts/install-tests/run-ci.sh
```

Cổng này **đỏ ngay bây giờ** (đếm được 9) và nó là thật. Nó thuộc W10, nhưng W12
không được ký duyệt khi nó còn đỏ.

---

## 6. Cạm bẫy riêng của work item này

**#1 — Version trong plan đã cũ, và đọc sai nó là tốn kém nhất trong W12.**
Plan viết `packages/coding-agent/package.json:3` là `18.3.3`. **Hôm nay nó là
`18.4.0`.** Kỹ sư tin plan sẽ set stub lên `18.3.4` — tức **hạ version**. Đây chính
là kịch bản giết người mà cả work item cảnh báo: `shouldForceBinaryUpdate`
(`update-cli.ts:216-222`) so sánh version và kết luận "đã là bản mới nhất", update
im lặng ngừng tới, **không có lỗi nào và không test đỏ nào**. Người dùng ở tên cũ bị
kẹt vĩnh viễn mà không có gì báo cáo. **Đọc `:3` bằng mắt trước khi gõ bất cứ con
số nào.**

**#2 — Hai chỗ ghi `manifest.bin` nằm ở hai hàm khác nhau, một cái có điều kiện.**
`:243` trong `rewriteManifest` **có** điều kiện; `:301` trong `applyPublishBin` là
ghi vô điều kiện. Chúng không cùng một đường. Nối override vào nhầm hàm thì test bước 3
xanh (vì nó gọi `rewriteManifest`) trong khi stub publish thật vẫn mang
`bin: { ultraworkers: ... }`. Đường publish thật đi qua `:287` trong `preparePackage`.

**#3 — Test trong plan thiếu tham số, nên nó sẽ không bao giờ xanh.**
Plan bảo gán `pkg.publishBin = { ultraworkers: ... }` rồi gọi `rewriteManifest(pkg,
false)` — hai tham số. Nhưng nếu override đến từ kênh riêng (đó chính là nghĩa của
"theo từng lần phát hành"), thì `rewriteManifest` **không có cách nào biết** đây là
lần stub. Test sẽ đỏ **cả sau khi cài đặt đúng** — và sẽ tạo ra một vòng lặp sửa
vô tận. Hình dạng đúng ở mục 3 bước 3 truyền override làm tham số thứ ba.

**#4 — Đừng bỏ `publishBin` tĩnh ở `:186` để "cho sạch".**
`:298` ném lỗi khi phần tử `packages[]` không có nó, và `run-ci.sh:156` gọi
`applyPublishBin("packages/coding-agent", true)` không có guard → `run-ci.sh` exit 1.
Nếu buộc phải bỏ, phải sửa `applyPublishBin` **và** `run-ci.sh:156` cùng lúc, và nói
rõ trong commit message — không làm lặng lẽ.

**#5 — Nguy cơ `publishBin` là THẬT, nhưng lý do plan nêu thì SAI.**
Plan (và bảng đính chính của chính nó) mô tả "ghi đè vô điều kiện". Thực tế `:243`
**có** điều kiện. Nguy cơ thật là: một `publishBin` tĩnh duy nhất áp cho **mọi** lần
publish của thư mục đó — nên ngay khi W9 đổi nó thành `ultraworkers`, stub publish từ
chính thư mục đó sẽ mang `bin: { ultraworkers: ... }`. Nguy cơ thật, lý do sai. Kỹ sư
đi kiểm tra theo lý do của plan sẽ kết luận cả nguy cơ cũng sai và bỏ qua bản vá.

**#6 — Stub không mang `dist` sẽ ra một lệnh không có code.**
Manifest stub phải có `omp: { rename: {...}, dist: "binary" }`. Cài bằng trình quản
lý package mà không có `dist` là người dùng có một lệnh `omp` exit ngay, không báo lỗi.

**#7 — `update-rename-migration.integration.test.ts` là cái bẫy dễ nhất.**
File đó đúng là nơi trực giác bảo "thêm case rename vào". Nó **không có seam
manifest** — 170 dòng, `grep 'manifest\|resolveRelease'` không trả về hit nào. Thêm
case vào đó là viết test trùng coverage trong một file được dựng cho seam khác.

**#8 — Hai neo trong plan lệch, cùng nằm trong file test.**
Plan ghi seam `rewriteManifest(pkg, false)` ở `:212` và `:242`. Thật là **`:214` và
`:244`**. Sai 2 dòng — vô hại ở đây vì test mới không đụng chúng, nhưng đừng mở
`:212`/`:242` để tìm hiểu.

---

## 7. Neo hỏng (ghi ra, KHÔNG sửa trong tài liệu)

| Neo trong plan | plan nói | Thực tế trên HEAD `47720fd` | Ảnh hưởng |
| --- | --- | --- | --- |
| `packages/coding-agent/package.json:3` | version `18.3.3` | `"version": "18.4.0",` | **cao** — set stub `18.3.4` là hạ version, giết updater im lặng |
| `scripts/ci-release-publish.test.ts:212`, `:242` | seam `rewriteManifest(pkg, false)` | `:214` và `:244` | thấp — chỉ lệch 2 dòng, không nằm trên đường sửa |
| `scripts/ci-release-publish.ts:69` | "Interface `PublishPackage` ở `:69`" | `:49` là `export interface PublishPackage {`; `:69` là **trường** `publishBin?: Readonly<Record<string, string>>;` | thấp |
| `packages/coding-agent/src/cli/update-cli.ts:183-188` | "docblock hợp đồng stub ở `:183-188`" | docblock đầy đủ là **`:172-188`**; `:183-188` chỉ là đoạn thứ hai ("MUST declare `dist: npm`" + "MUST continue the old version line") | thấp — nhưng `:177` là dòng mang chuỗi stub contract thật, nên đọc `:172-188` |
| Plan "Hình dạng code", khối `:69` | `publishBin?: Record<string, string>;` | `publishBin?: Readonly<Record<string, string>>;` (có `Readonly`) | thấp — plan ghi trong code block trang trí |
| Plan "Hình dạng code", khối `:240` | `export function rewriteManifest(...)` | `export async function rewriteManifest(...)` | thấp — thiếu `async` |
| Plan "Cổng hoàn thành" Tier 3 | `which ninja` → không có; `brew list ninja` → `No such keg` | `/opt/homebrew/bin/ninja` **có**; `bun --cwd=packages/natives run build` → **exit 0** | **cao** — cả phân tầng cổng 4 tầng dựng trên trạng thái máy đã chết |
| Plan "Cổng hoàn thành" Tier 3 | `bun run test:scripts` exit 1 vì `ci-test-ts` | **exit 0, 37 pass / 0 fail** (5 file) | **cao** — đừng báo BLOCKED cho tầng 3; nó chạy được |
| Plan "Cổng hoàn thành" Tier 3 | addon chưa build ⇒ `update-cli.test.ts` exit 1 | **107 pass / 1 skip / 0 fail** (3 file) | **cao** — như trên |

### Neo ĐÚNG (đã mở và đọc)

`ci-release-publish.ts:16,164,165,186,240,243,287,296,298,301` ·
`update-cli.ts:165,166,189,190,216-222,807,875,884,894-902,895,907` ·
`update-cli.test.ts:60-79,90` · `test/update-cli.test.ts:642-653,1420-1431` ·
`update-rename-migration.integration.test.ts` (170 dòng, `:108-120`, `:149-161`) ·
`package.json:27-29,28` · `ci-macos-sign.sh:35,94-98,103,109,117-118,120-145` ·
`ci.yml:922,974,1206,1207,1210,1211,1213,1214,1218,1225` ·
`run-ci.sh:94,103,156` · `ci-release-publish.test.ts:214,244`

---

## 8. Bàn giao

W12 **không** thể ký duyệt khi bất kỳ điều nào sau đây còn đúng:

1. `grep -c 'omp-darwin-arm64' .github/workflows/ci.yml` **= 9** → cổng codesign xác
   minh một asset không tồn tại. **Thuộc W10.**
2. `run-ci.sh:94` vẫn đòi artifact `dist/omp` mà W9 sẽ đổi tên → ma trận cài đặt vỡ.
   **Cần một quyết định tường minh từ W10: stub mang shim `omp` thật, hay install-test
   học tên mới.** Để ngỏ nghĩa là không mục nào được ký duyệt.
3. Bước 10 (scope, quyền phát hành, danh tính Apple) chưa xác nhận → **BLOCKED**.
4. Open question 1 (khối `omp` soạn ở đâu) chưa quyết và ghi vào commit message.
