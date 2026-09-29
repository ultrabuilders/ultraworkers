## WI-2. Thứ tự nạp extension xác định, và cách giải quyết trùng tên được nói thẳng ra

**Thay đổi gì:** Extension giờ luôn được nạp theo thứ tự đường dẫn đã sắp xếp, thay vì thứ tự tuỳ ý mà hệ điều hành file tình cờ trả về; và khi hai extension đăng ký cùng một tên tool thì bên thắng vừa là một quy tắc được viết ra vừa là một chẩn đoán gọi tên cả hai bên.
**Wave:** M2 wave 2 (shippable; WI-2 tách thành 2 PR — phần sort là một thay đổi hành vi thật nên đi một mình, phần chẩn đoán đi kèm).
**Effort:** S. Hai chỗ sort, một collector private, một interface export, một đoạn doc, một file test mới, một dòng changelog. Nửa sort thì dưới một tiếng; phần test là phần chính vì fixture phải được dựng sao cho nó thật sự phân biệt được.

**Người dùng thấy:** Hai plugin đăng ký cùng một tên tool giờ luôn resolve về cùng một bên trên mọi máy, mọi lần chạy, và sau mọi lần cài lại — thay vì âm thầm đảo chiều theo bố cục thư mục. Bên thua không còn biến mất trong im lặng ở tầng API nữa: `getToolCollisionDiagnostics()` trả về từng lần trùng kèm đường dẫn của cả hai bên, và `message` tự chứa cả hai chuỗi đường dẫn. Lưu ý rõ cho người đọc changelog: WI-2 này KHÔNG gắn cảnh báo vào TUI hay log — người dùng cuối vẫn không thấy gì cho tới khi một work item sau nối seam này vào một bề mặt hiển thị. Một người dùng từng liệt kê extension theo một thứ tự cụ thể trong settings và dựa vào thứ tự đó để thắng sẽ thấy thứ tự trở thành alphabet; đó là cú lật chủ ý và sẽ được ghi rõ trong changelog.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | Sắp xếp mảng `allPaths` tích luỹ bằng comparator theo code-unit ngay trước `return allPaths;` tại dòng 660 (sau dedup, sau cả bốn nhánh discovery). | có (verified) |
| `packages/coding-agent/src/discovery/helpers.ts` | sửa | Trong `discoverLinkedExtensionModuleFiles`, thay `const entries = await readDirEntries(dir);` ở dòng 763 bằng một BẢN SAO của mảng cache, sắp xếp theo tên entry với comparator code-unit, trước `Promise.all(entries.map(...))` sẵn có ở dòng 767-768. | có (verified) |
| `packages/coding-agent/src/capability/fs.ts` | sửa theo khai báo, nhưng thực tế KHÔNG đổi — chỉ đọc để xác nhận vì sao không được chạm vào (xem "## Cần người xác nhận") | `readDirEntries` ở 37-51 trả về mảng `dirCache` cấp module THEO THAM CHIẾU tại 39-41. Ngoài việc dùng chung/có cache, nó còn có năm module consumer khác ngoài helpers.ts — `discovery/builtin.ts:48,531,582,701,743`, `discovery/cline.ts:23`, `discovery/gemini.ts:195`, `discovery/omp-extension-roots.ts:243`, `discovery/omp-plugins.ts:236` — cộng ba call site còn lại của chính nó, `discovery/helpers.ts:844,848,874`. Sort tại đây sẽ đảo thứ tự cả năm module kia. Cách sửa đúng là ở hai consumer nhạy thứ tự. | có (verified) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Thêm `interface ExtensionRegistrationDiagnostic` export ngay sau `RegisteredTool` (đóng tại dòng 1676) cùng tài liệu cho discriminant `type`. | có (verified) |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | (1) Đổi tên field private `#commandDiagnostics` thành `#registrationDiagnostics` và đổi kiểu thành `ExtensionRegistrationDiagnostic[]` (dòng 481). (2) Thêm private `#collectToolNameCollisions()`. (3) Đẩy kết quả của nó vào `#registrationDiagnostics` ở cuối `getRegisteredCommands` (reset ở 1186, push ở 1193). (4) Nới kiểu trả về của `getCommandDiagnostics()` (dòng 1206). (5) Thêm public `getToolCollisionDiagnostics()`. (6) Mở rộng doc comment trên `getRegisteredTool` (dòng 984) để nói rõ last-wins là quy tắc đã định nghĩa. | có (verified) |
| `packages/coding-agent/test/extension-load-order-determinism.test.ts` | tạo | File test mới. Dòng 1 khẳng định TÊN của bên thắng qua hai subprocess mới. Dòng 2 khẳng định một trùng tên tool được báo cáo với cả hai bên đăng ký được nêu tên. | có (verified) |
| `packages/coding-agent/CHANGELOG.md` | sửa | Một dòng dưới `## [Unreleased]` → `### Changed`: thứ tự nạp extension giờ đã sort, nên một tên tool trùng luôn resolve về cùng extension; và có thêm một API chẩn đoán (`getToolCollisionDiagnostics()`) báo bên bị che, chưa gắn vào bất kỳ UI hay log nào. Về `### Added`: không có gì mới nhìn thấy được từ phía người dùng ngoài bản báo cáo, nên gộp vào cùng dòng Changed. | có (verified) |

Ghi chú neo đã kiểm chứng cho file đầu: `discoverExtensionPaths` nằm ở dòng 572 (neo của plan đúng); `allPaths` khai báo ở 578, `addPath` dedupe theo đường dẫn ĐÃ RESOLVE ở 585-591, `return allPaths` ở 660. Danh sách được dựng cục bộ nên sort tại chỗ an toàn — không có cache dùng chung nào bị nhiễm.

Ghi chú cho `runner.ts`: CẢ BỐN dòng mà plan nêu đều cũ khoảng 11-13 dòng: khai báo field là 481 chứ không phải 470, chỗ push là 1193 chứ không phải 1180, getter là 1206 chứ không phải 1193, `getRegisteredTool` là 984-990 chứ không phải 971-977. Đã kiểm chứng từng cái bằng grep. `#registrationDiagnostics` phải tiếp tục được reset bên trong `getRegisteredCommands` (dòng 1186) — xem phần "Cần người quyết" để biết vì sao vẫn còn một getter riêng.

Ghi chú cho `types.ts`: `export interface RegisteredTool` nằm ở 1666 — đã kiểm chứng. `RegisteredTool` mang `extensionPath: string` (dòng 1668), đó là thứ mà khẳng định về tên bên thắng đọc tới. `Extension.tools` là `Map<string, RegisteredTool<any, any>>` ở dòng 1807 — `any` có sẵn đó KHÔNG nằm trong phạm vi thay đổi này; đừng nới nó ra.

Ghi chú cho `CHANGELOG.md`: `## [Unreleased]` tồn tại ở dòng 3 và hiện đang rỗng; `## [18.3.3]` bắt đầu ở dòng 5 và là bất biến.

### Các bước

1. **loader.ts — chèn sort.** Chèn một khối comment cộng với `allPaths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));` ngay trên dòng trước `return allPaths;`. Comment phải nói: (a) vì sao — việc đăng ký là last-extension-wins, nên một thứ tự phụ thuộc hệ file là một thay đổi hành vi nhìn thấy được mà không có tín hiệu; (b) đây là comparator theo code-unit, không phải `localeCompare`, để bên thắng không phụ thuộc locale của máy chủ; (c) nó nằm sau dedup và sau mọi nhánh discovery, để cả bốn nhánh cùng đóng góp vào một thứ tự duy nhất. KHÔNG đụng vào `addPath`/`addPaths` — chúng là lớp dedupe và lọc disable, đã đúng sẵn. Neo: `packages/coding-agent/src/extensibility/extensions/loader.ts:660`.

2. **helpers.ts — sort bản sao, không sort tại chỗ.** Thay dòng đơn `const entries = await readDirEntries(dir);` bằng một câu lệnh vừa `await readDirEntries` vừa spread kết quả ra mảng mới và sort bản sao đó theo `entry.name` bằng comparator code-unit. Comment BẮT BUỘC nói rằng `readDirEntries` trả về mảng `dirCache` cấp module theo tham chiếu và rằng sort tại chỗ sẽ đảo thứ tự cache cho cả năm module discovery kia — đây là chỗ dễ sai nhất của toàn bộ thay đổi và nó im lặng. Cũng phải nói rằng một post-sort trong `discoverExtensionPaths` không thể sửa lại hàm này, vì `Promise.all` bên dưới push từ bên trong các callback nên thứ tự kết quả là thứ tự hoàn tất I/O. Neo: `packages/coding-agent/src/discovery/helpers.ts:763`.

3. **types.ts — khai báo interface chẩn đoán.** Thêm `export interface ExtensionRegistrationDiagnostic` ngay sau khi interface `RegisteredTool` đóng lại. Bốn trường: `type: string` (được tài liệu hoá là luôn giữ `"warning"` cho cả hai producer hiện tại, có mặt để một producer tương lai có thể được lọc), `message: string` (được tài liệu hoá là bắt buộc phải nêu TẤT CẢ các bên xung đột, để một consumer chỉ đọc log vẫn thấy đủ cả hai), `path: string` (bên thắng theo last-wins, hoặc bên duy nhất khi không có xung đột), và `paths: string[]` (mọi bên xung đột theo thứ tự nạp, phần tử cuối là bên thắng). Neo: `packages/coding-agent/src/extensibility/extensions/types.ts:1676`.

4. **runner.ts — thêm collector.** Thêm method private `#collectToolNameCollisions(): ExtensionRegistrationDiagnostic[]`. Duyệt `this.extensions` theo thứ tự, dựng một `Map<toolName, string[]>` các đường dẫn bên đăng ký, rồi phát một chẩn đoán cho mỗi tên có từ hai bên đăng ký trở lên. Dùng đường dẫn CUỐI CÙNG làm cả `path` lẫn bên thắng được nêu trong message. Message phải chứa mọi đường dẫn dưới dạng text. Trả về mảng. Ghi chú trong comment rằng thứ tự chèn của Map làm cho chính danh sách chẩn đoán cũng xác định, miễn là thứ tự nạp đã xác định. Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:984`.

5. **runner.ts — đổi tên field và đẩy kết quả.** Đổi kiểu field private thành `#registrationDiagnostics: ExtensionRegistrationDiagnostic[] = []` và đổi tên cả bốn chỗ tham chiếu (khai báo, reset, push, return). Ở cuối `getRegisteredCommands`, sau vòng lệnh và trước lệnh return, đẩy `...this.#collectToolNameCollisions()`. Cố ý KHÔNG thêm `logger.warn` cho trùng tool — nhánh reserved-command ở 1193-1196 chỉ log khi `!this.hasUI()`, và một cây plugin có thể sinh ra rất nhiều trùng; ghi lại mà không log giữ cho lúc khởi động yên tĩnh nhưng vẫn đưa được ra cho bất kỳ consumer nào đọc báo cáo. Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:481,1186,1193,1206`.

6. **runner.ts — nới getter và thêm getter mới.** Nới `getCommandDiagnostics()` để trả về `ExtensionRegistrationDiagnostic[]` (kiểu phần tử của mảng đổi, tên method và trường `path` không đổi). Thêm `getToolCollisionDiagnostics(): ExtensionRegistrationDiagnostic[]` trả về `this.#collectToolNameCollisions()` tính mới. Giữ doc comment trên cả hai giải thích rằng `#registrationDiagnostics` chỉ được điền sau khi `getRegisteredCommands()` đã chạy — và đó chính xác là lý do getter tool phải tính lại thay vì lọc. Thêm import cấp cao nhất của `ExtensionRegistrationDiagnostic` từ `./types` vào khối import type sẵn có — chỉ import cấp cao nhất, không import nội tuyến. Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:1206`.

7. **runner.ts — viết luật ra.** Mở rộng doc comment một dòng trên `getRegisteredTool` thành phát biểu luật: extension bind theo thứ tự `discoverExtensionPaths`, thứ tự đó được sort theo đường dẫn; khi trùng tên tool thì đăng ký của extension có đường dẫn sort CUỐI CÙNG thắng; bên đăng ký bị che vẫn được `getAllRegisteredTools()` trả về; và xung đột được báo cáo bởi `#collectToolNameCollisions` / `getToolCollisionDiagnostics`. Đây chính là câu mà WI-2 sinh ra để viết ra — thân vòng lặp duyệt ngược bản thân nó không đổi. Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:983`.

8. **Dựng fixture cho file test mới.** Cấu trúc: `TempDir.createSync("@omp-ext-order-")` trong `beforeEach`, `removeSync()` trong `afterEach`. Dựng thư mục fixture `<temp>/exts/` chứa 8 thư mục con `ext-a` .. `ext-h`, mỗi thư mục có một `index.ts` đăng ký một tool tên `dup` với một nhãn khác nhau. Thư mục fixture TUYỆT ĐỐI không được chứa `package.json` và cũng không được chứa trực tiếp `index.ts`/`index.js` — một index trực tiếp sẽ rút ngắn `resolveExtensionDirectory` thành một file đơn tại `directory-resolution.ts:109-110` và biến test thành vô nghĩa, còn một `package.json` làm nhánh manifest trở thành nguồn quyết định tại 106-107. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

9. **Kiểm tra tiền đề của fixture, trong test, trước khi chạy subprocess.** Gọi `fs.readdirSync(extsDir)` và khẳng định CẢ HAI điều kiện, cả hai đều bắt buộc: (a) thứ tự trả về KHÔNG sẵn có là đã sort (`expect(names).not.toEqual([...names].sort())`); VÀ (b) phần tử CUỐI CÙNG của thứ tự trả về KHÔNG phải `ext-h` (`expect(names.at(-1)).not.toBe("ext-h")`). Điều kiện (b) là điều kiện quyết định: `getRegisteredTool` quét NGƯỢC và trả phần tử khớp đầu tiên, nên bên thắng là phần tử CUỐI CÙNG. Nếu chỉ có (a) mà thiếu (b), thì trên một hệ file mà readdir tình cờ kết thúc bằng `ext-h`, dòng 1 vẫn xanh dù không có sort nào — cổng pass vô nghĩa, đúng thứ cả dòng này sinh ra để chặn. Đây chính là kiểm tra mà plan đã gọi tên, với một đính chính — nó phải dùng `fs.readdirSync`, KHÔNG dùng `readDirEntries`, vì nhánh thư mục được cấu hình của `discoverExtensionPaths` đi qua `resolveExtensionDirectory`, hàm này dùng `fs.readdirSync` thô tại `directory-resolution.ts:114` và không bao giờ chạm vào helper cache. Kiểm tra bằng primitive sai sẽ xác nhận một tiền đề về một đường code mà fixture không hề đi qua. Khi một trong hai điều kiện hỏng, ném một lỗi có message nêu đúng thứ tự thực tế, giá trị `.at(-1)`, và chỉ dạy kỹ sư đổi tên các thư mục con cho tới khi CẢ HAI điều kiện đều đúng — không bao giờ bỏ qua trong im lặng. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

10. **Thêm probe cho dòng 1.** Một hằng template `PROBE_SCRIPT`, nội suy với `JSON.stringify(extsDir)` và `JSON.stringify(tempDir.path())`, spawn bằng `Bun.spawn([process.execPath, "-e", script], { cwd: path.resolve(import.meta.dir, "../../../"), env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: tempDir.path() }, stdout: "pipe", stderr: "pipe" })`. `cwd` bắt buộc là repo root để các import tương đối `./packages/coding-agent/src/...` của probe resolve được (đây là thủ thuật từ `bench-auth-fallback.test.ts:284-285`). Probe: `await discoverExtensionPaths([extsDir], cwd, undefined, { ambient: false })`, rồi `await loadExtensions(paths, cwd)`, dựng `SessionManager.inMemory()` + `AuthStorage.create` + `ModelRegistry` + `ExtensionRunner` đúng y như `extensions-runner.test.ts:389-395` làm, sau đó in MỘT dòng JSON `{ winnerPath, extensionOrder }` và thoát với 0. Khẳng định exit code của probe là 0 và kèm stderr vào message lỗi. Chạy nó HAI LẦN, trong hai tiến trình tách biệt, và khẳng định CẢ HAI đều báo `winnerPath === path.join(extsDir, "ext-h", "index.ts")`. Không gọi loader hai lần trong cùng một tiến trình — `dirCache` cấp module ở `capability/fs.ts:5` và module cache ESM của Bun đều sống sót qua lần gọi thứ hai và sẽ che đúng thứ tự mà test này sinh ra để bắt. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

11. **Thêm dòng 2, trong tiến trình.** Dùng lại bộ dựng của `extensions-runner.test.ts`: một `AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"))` + `new ModelRegistry(authStorage)` trong `beforeAll` (comment bên đó ghi chi phí khoảng 100ms, nên đừng dựng lại mỗi test), `SessionManager.inMemory()` trong `beforeEach`. Viết hai extension một file vào một TempDir thứ hai, mỗi cái đăng ký một tool tên `dup`, `loadExtensions` chúng theo thứ tự tường minh, dựng runner, rồi khẳng định chẩn đoán: `type === "warning"`, `paths` có đúng hai đường dẫn extension, và `message` chứa CẢ HAI chuỗi đường dẫn dưới dạng substring. Khẳng định qua `getToolCollisionDiagnostics()` để dòng này không phụ thuộc việc `getRegisteredCommands()` đã được gọi trước hay chưa. Neo: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

12. **Thêm mục changelog.** Viết các mục dưới `## [Unreleased]`, một dòng dưới `### Changed`. Mở đầu bằng điều người dùng thấy: thứ tự nạp extension giờ xác định và một tên tool trùng resolve giống nhau ở mọi nơi, và xung đột giờ được báo cáo. Đừng kể chuyện về sort hay `Promise.all` trong changelog — chuyện đó thuộc về phần thân PR. Cụm "xung đột giờ được báo cáo" phải được viết cho đúng: một API chẩn đoán mới (`ExtensionRunner#getToolCollisionDiagnostics()`) cho biết bên nào đã bị che, kèm `message` nêu tên cả hai bên — hiện chưa có giao diện nào hiển thị nó, nên đây là seam cho SDK và fork, không phải cảnh báo trong UI. Neo: `packages/coding-agent/CHANGELOG.md:3`.

### Hình dạng code

```typescript
// ── packages/coding-agent/src/extensibility/extensions/loader.ts:659 ──────────
// Deterministic load order. `allPaths` accumulates in discovery order, which is
// raw-`readdir` order for ambient/configured scans and I/O-completion order for
// the linked-module branch — both filesystem-dependent. Registration is
// last-extension-wins (see ExtensionRunner#getRegisteredTool), so that order IS
// user-visible behavior. Sort once, here, after dedup and after all four
// discovery branches, so every branch contributes to a single stable order.
// Code-unit order, deliberately not localeCompare: the winning extension must
// not depend on the host's locale.
allPaths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
return allPaths;

// ── packages/coding-agent/src/discovery/helpers.ts:763 ──────────────────────
// `readDirEntries` hands back the module-level `dirCache` array BY REFERENCE, so
// sorting in place would reorder the cache for the five other discovery modules
// that share it (builtin, cline, gemini, omp-extension-roots, omp-plugins) —
// plus helpers.ts's own other three call sites. Copy first.
//
// This sort is load-bearing on its own: the Promise.all below pushes into shared
// arrays from inside its callbacks, so the result order is I/O-completion order,
// and the post-sort in discoverExtensionPaths cannot repair it.
const entries = [...(await readDirEntries(dir))].sort((a, b) =>
	a.name < b.name ? -1 : a.name > b.name ? 1 : 0
);

// ── packages/coding-agent/src/extensibility/extensions/types.ts (after :1676) ─
/** A registration conflict surfaced by the extension runner. */
export interface ExtensionRegistrationDiagnostic {
	/** `"warning"` for both current producers; lets a future one be filtered. */
	type: string;
	/**
	 * Human-readable text that names EVERY conflicting side, so a consumer that
	 * only reads `message` (a log line, a crash dump) still sees the full picture
	 * without having to learn the record shape.
	 */
	message: string;
	/** The winning side under last-extension-wins, or the single side when unconflicted. */
	path: string;
	/** Every conflicting side in load order. The last entry is the winner. */
	paths: string[];
}

// ── packages/coding-agent/src/extensibility/extensions/runner.ts ────────────
/**
 * Tool names resolve by last-extension-wins. Extensions bind in
 * `discoverExtensionPaths` order, which is sorted by path, so a duplicate name
 * resolves to the registrant whose path sorts last. The shadowed registration
 * remains in `getAllRegisteredTools()`. A collision used to be entirely silent,
 * so a plugin that overrode another's tool looked like it had never been
 * installed — report both sides instead.
 *
 * Pure: derived from `this.extensions` on every call, so it is correct
 * regardless of whether `getRegisteredCommands()` has run.
 */
#collectToolNameCollisions(): ExtensionRegistrationDiagnostic[] {
	const registrants = new Map<string, string[]>();
	for (const ext of this.extensions) {
		for (const name of ext.tools.keys()) {
			const seen = registrants.get(name);
			if (seen) seen.push(ext.path);
			else registrants.set(name, [ext.path]);
		}
	}

	const diagnostics: ExtensionRegistrationDiagnostic[] = [];
	// Map iteration is insertion-ordered, so with a deterministic load order the
	// diagnostic list is too.
	for (const [name, paths] of registrants) {
		if (paths.length < 2) continue;
		const winner = paths.at(-1)!;
		diagnostics.push({
			type: "warning",
			message:
				`Extension tool '${name}' is registered by ${paths.length} extensions ` +
				`(${paths.join(", ")}). Last-extension-wins: ${winner}.`,
			path: winner,
			paths,
		});
	}
	return diagnostics;
}

/** Duplicate tool names, recomputed on demand — see #collectToolNameCollisions. */
getToolCollisionDiagnostics(): ExtensionRegistrationDiagnostic[] {
	return this.#collectToolNameCollisions();
}

// inside getRegisteredCommands, after the reserved-command loop:
this.#registrationDiagnostics.push(...this.#collectToolNameCollisions());
return [...commands.values()];
```

### Hợp đồng test

Hai hợp đồng nhìn thấy được từ bên ngoài, mỗi cái có một tên hỏng.

**DÒNG 1 — "Thứ tự nạp extension được sort, nên một tên tool trùng luôn resolve về bên đăng ký có đường dẫn sort cuối cùng, xuyên qua các tiến trình mới."** Quan sát được: `ExtensionRunner#getRegisteredTool("dup")?.extensionPath`. Nếu hồi quy, người dùng có hai plugin đã cài đăng ký cùng một tên tool sẽ nhận về bên nào mà readdir tình cờ nhả ra trước — nên cùng một bản cài sẽ resolve khác nhau trên APFS so với ext4, trước và sau một lần cài lại làm đổi bố cục thư mục, và cú lật đó hoàn toàn im lặng (không log, không lỗi, plugin thua đơn giản là trông như chưa từng được cài). Vì sao khẳng định TÊN bên thắng chứ không phải một khẳng định tính nhất quán qua các lần chạy: thứ tự readdir thô là thuộc tính của THƯ MỤC chứ không phải của tiến trình, nên hai subprocess đọc cùng một thư mục fixture sẽ thấy cùng một thứ tự, có sort hay không. Một khẳng định chỉ tính nhất quán sẽ pass y hệt trên một cài đặt mà không sort gì cả — đó là lý do fixture được dựng để readdir trả về thứ tự khác thứ tự từ điển, và tiền đề ấy được kiểm chứng ngay trong test bằng `fs.readdirSync` trước khi subprocess chạy. Vì sao hai subprocess chứ không phải hai lần gọi trong cùng tiến trình: `dirCache` cấp module (`capability/fs.ts:5`) và module cache ESM của Bun đều sống sót lần gọi thứ hai và sẽ che đúng thứ tự đang bị thử. DÒNG NÀY FAIL trên HEAD và chỉ pass sau khi có sort ở loader.ts.

**DÒNG 2 — "Một tên tool trùng được báo cáo thành một chẩn đoán nêu tên cả hai bên đang đăng ký."** Quan sát được: `ExtensionRunner#getToolCollisionDiagnostics()` trả về một bản ghi mà `paths` giữ đúng hai bên đăng ký và `message` chứa cả hai chuỗi đường dẫn. Nếu hồi quy, tác giả plugin mà tool của họ bị một plugin khác âm thầm ghi đè hoàn toàn không có tín hiệu nào — lần ghi đè vô hình trên UI, trong log và trong API, và triệu chứng duy nhất là một tool chạy khác với điều source của nó nói. `message` được khẳng định là mang cả hai đường dẫn dưới dạng text, để bảo vệ cả đường consumer chỉ-đọc-log chứ không chỉ trường có cấu trúc.

Cố ý KHÔNG khẳng định: rằng mảng `allPaths` đã sort. Đó là hình dạng mảng bên trong; danh tính của bên thắng mới là hợp đồng, và khẳng định mảng sẽ để cho một người triển khai làm cho test pass bằng cách sort nhầm tầng.

Tên file test: `packages/coding-agent/test/extension-load-order-determinism.test.ts`.

### Xác minh

Bị CHẶN cho tới khi có native addon. `bun test` hiện chết ngay ở bước import: `"Failed to load pi_natives native addon for darwin-arm64"` — đo được 0 pass / 1 fail / 1 error, phạm vi theo file, không phải 0-pass toàn suite. Gỡ chặn bằng `bun --cwd=packages/natives run build`, rồi:

```bash
bun run check:ts
cd packages/coding-agent && bun test test/extension-load-order-determinism.test.ts test/extensions-discovery.test.ts
```

`bun run check:ts` đã được đo là **XANH** trên cây này ở HEAD 808b365: exit 0, 34.8 giây, không cần addon. Nhưng đó là cổng trên **TOÀN CÂY**, không phải cổng trên diff của WI-2: nó quét 5445 file, nên một file rác `.ts` untracked dưới `packages/` làm nó đỏ ngay ở bước `check:tools` (oxfmt) trong dưới một giây, chưa tới `tsgo` bao giờ. Đo được cả hai trạng thái: cây sạch → exit 0 / 34.8s; có một file rác `packages/coding-agent/src/__wi3_probe.ts` → exit 1 / 0.7s với `Format issues found in above 1 files`. Hệ quả cho người triển khai: nếu `check:ts` đỏ, đừng coi là do thay đổi của mình — kiểm tra `git status --porcelain -- packages/` trước, và chỉ chạy lại cổng khi cây sạch. Chạy lại hai file test đã nêu sau khi build; không thay bằng `tsc` (AGENTS.md).

Chứng minh cổng, chạy trước khi mở PR: (1) với bản sửa đã có, cả hai dòng pass; (2) xoá dòng `allPaths.sort(...)` tại loader.ts:659, chạy lại — dòng 1 PHẢI đỏ với bên thắng `ext-*` sai; (3) khôi phục, rồi xoá phần sort trước `map` ở helpers.ts:763, chạy lại — dòng 1 PHẢI vẫn xanh (điều này là dự kiến: chính post-sort ở loader là thứ fixture này đi qua) và `extensions-discovery.test.ts` PHẢI vẫn xanh, chứng minh hai chỗ sort không thừa và rằng chỗ sort ở linked-module không có coverage quan sát được trong fixture này — xem phần "Cần người quyết"; (4) khôi phục, xoá `#collectToolNameCollisions`, chạy lại — dòng 2 PHẢI đỏ.

### Cổng hoàn thành

Bốn phần. Ba phần đỏ được nhờ một bước hoàn tác có chủ đích; phần (1) là cổng trên toàn cây.

**(1) TYPE:** `bun run check:ts` thoát với 0. Đỏ nếu interface chẩn đoán bị export sai, thiếu import type cấp cao nhất, hoặc có một `any` lọt vào. (1) chỉ chạy được sau khi cây sạch — xem "Xác minh"; ở cây có file rác `.ts` untracked nó đỏ vì lý do không liên quan, nên đỏ ở đây không phải bằng chứng thay đổi của bạn sai.

**(2) DÒNG 1 CÓ KHẢ NĂNG PHÂN BIỆT:** khi hoàn tác bản sửa, dòng 1 báo một bên thắng KHÔNG phải `ext-h`. Đây mới là một cổng thật vì test trước hết chứng minh tiền đề của chính fixture — nó đọc thư mục fixture bằng `fs.readdirSync` (đúng primitive mà `resolveExtensionDirectory` dùng tại `directory-resolution.ts:114`) và từ chối đi tiếp nếu readdir tình cờ đã trả về thứ tự từ điển HOẶC tình cờ kết thúc bằng `ext-h`; nếu không chặn cả hai, khẳng định sẽ pass trên một cài đặt mà không sort gì cả.

**(3) DÒNG 2 CÓ KHẢ NĂNG PHÂN BIỆT:** khi `#collectToolNameCollisions` bị gỡ, dòng 2 nhận về không chẩn đoán nào và đỏ trên `paths` cũng như trên phần kiểm tra substring của message.

**(4) KHÔNG HỒI QUY (chỉ phần có tác dụng thật):** `bun test test/extensions-discovery.test.ts` vẫn xanh — nó là bảo đảm không hồi quy cho toàn bộ đường discovery. **Đã bỏ** việc dựa vào `test/extension-loader-concurrency.test.ts` làm chốt chặn cho sort ở loader: file đó chỉ import `loadExtensions` và gọi nó với mảng literal (`extension-loader-concurrency.test.ts:85,120`), không bao giờ gọi `discoverExtensionPaths`, nên nó không thể đỏ vì thay đổi này. Nó vẫn đáng chạy như một smoke test bảo vệ `loadExtensions`, nhưng đừng tính nó là cổng.

Ba phần (2), (3), (4) có bước hoàn tác cụ thể đã được đặt tên trong phần "Xác minh" (xoá `allPaths.sort(...)`, xoá sort ở helpers.ts, xoá `#collectToolNameCollisions`). Phần (1) là cổng trên TOÀN CÂY chứ không phải trên diff này, nên nó chỉ xanh khi không có file rác `.ts` untracked dưới `packages/` — xem "Xác minh"; đỏ ở đó không mặc định là do thay đổi của bạn.

### Phụ thuộc

- `depends_on`: không.
- `blocks`:
  - WI-7 (wave 5 registerMode) — tiền đề cứng. Mode registry tự tạo ra các đăng ký nhạy thứ tự của riêng nó, nên nó phải đáp xuống một thứ tự đã được định nghĩa, không phải đáp xuống thứ tự hệ file.
  - WI-6 (wave 4) — bảng wave nói WI-6 cần luật trùng của WI-2 đã chốt trước khi nó có thể an toàn đổi thứ tự ưu tiên.

### Cách sai dễ nhất

MỨC TRUNG BÌNH, và nó là một thay đổi hành vi thật chứ không phải sửa lỗi — đó chính là lý do plan tách mục này thành hai PR. Người dùng có hai plugin trùng tên hôm nay đang dựa vào một thứ tự tình cờ, và bản sửa sẽ lật ngược nó. Rủi ro thứ hai, im lặng hơn nhiều, là sort tại chỗ: `readDirEntries` trả về `fs.Dirent[]` đã cache THEO THAM CHIẾU, nên `[...entries].sort()` viết thành `entries.sort()` sẽ đột biến một cache cấp module dùng chung với năm module discovery khác và lặng lẽ đảo thứ tự kết quả của chúng nữa. Nó không sinh ra lỗi, không làm hỏng import — đây là kiểu hỏng dễ lọt tới nhất, và comment tại helpers.ts:763 là thứ duy nhất đứng giữa một kỹ sư mệt mỏi và nó.

### Cần người quyết

- Chuyển sort sau có áp dụng cho các đường dẫn được cấu hình TƯỜNG MINH không? Sắp xếp trọn `allPaths` (lựa chọn của plan, và là cái bước 1 thực hiện) nghĩa là người dùng viết `extensions: ["b-ext", "a-ext"]` trong settings và dựa vào việc b-ext thắng thì nay sẽ được a-ext. Chỉ sắp xếp phần ambient/discovered và giữ thứ tự đã cấu hình thì tôn trọng ý định hơn, nhưng làm luật khó phát biểu hơn và fixture của test sẽ phải đi qua đường ambient. Plan đã chốt theo hướng sắp xếp trọn; cần một người xác nhận trước khi mở PR, vì đây là phần duy nhất của WI-2 mà người dùng hợp lý có thể gọi là hồi quy.
- Kiểm tra tiền đề suy biến trên fixture 8-extension nên hard-fail hay skip? Hard-fail là thẳng thắn và là lựa chọn của plan, nhưng trên một hệ file mà readdir tình cờ trả về thứ tự từ điển thì dòng đó đỏ trên một nền tảng không hỏng. Bỏ qua trong im lặng sẽ tái tạo đúng cái pass vô nghĩa mà plan được viết ra để chặn. Có một lựa chọn thứ ba — khẳng định tên bên thắng vô điều kiện và chỉ ghi tiền đề vào phần text của thông báo lỗi — đánh đổi một lần đỏ hiếm để lấy một test vĩnh viễn yếu hơn trên một số nền tảng. Hãy chọn một trước khi viết test.
- Chỗ sort ở linked-module tại helpers.ts:763 không có coverage quan sát được trong fixture của WI này, vì fixture đi qua đường thư mục được cấu hình (đường mà post-sort ở loader đã sửa xong). Bước cổng (3) ở trên chứng minh hai chỗ sort không thừa nhưng không thể chứng minh chỗ sort ở helpers.ts có tác dụng gì. Lựa chọn: dựng fixture thứ hai ép nhánh linked-directory của `discoverExtensionModulePaths` (một thư mục con symlink chứa index.ts, mà native glob không đi xuống), hoặc chấp nhận rằng chỗ sort ở helpers.ts đứng trên một lập luận đọc-code và nói thẳng như vậy trong PR. Cần quyết định của người, vì fixture thứ hai chiếm phần lớn công sức test còn lại.
- `getCommandDiagnostics()` có consumer ngoài repo (SDK đã phát hành, fork downstream) không? `git grep -rn "getCommandDiagnostics" -- packages/` chỉ khớp đúng định nghĩa tại runner.ts:1206, nên KHÔNG gì trong repo này cần cập nhật — nhưng nới kiểu phần tử của nó vẫn là một thay đổi bề mặt API đã phát hành. Hãy xác nhận export công khai của SDK trước khi nới thay vì chỉ tin grep trong repo.
- Có nối `getToolCollisionDiagnostics()` vào `extension-ui-controller` (panel Extensions) hoặc vào `logger.warn` một lần ở lúc khởi động trong WI-2 không? Không nối thì phần "Người dùng thấy" của WI-2 chỉ còn đúng một nửa và câu changelog phải tự giới hạn như trên. Lưu ý khi cân: `getRegisteredCommands` có ba call site thật (get-commands-handler.ts:36, interactive-mode.ts:2051, available-commands.ts:77) và cả ba đều chỉ lấy danh sách lệnh, không đọc chẩn đoán.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Bản ghi chẩn đoán được khai báo tại runner.ts:470, đẩy tại runner.ts:1180, và `getCommandDiagnostics` ở runner.ts:1193. | stale-line-numbers | Cả bốn neo lệch 11-13 dòng. Field private nằm ở runner.ts:481, chỗ reset ở 1186, chỗ push duy nhất ở 1193, getter ở 1206. `getRegisteredTool` ở 984-990, không phải 971-977. |
| Tiền đề fixture nên được kiểm bằng cách đọc `readDirEntries` một lần trong test, vì đó là thứ quyết định thứ tự. | wrong-primitive | Kiểm bằng `fs.readdirSync` thay thế. Nhánh thư mục được cấu hình của `discoverExtensionPaths` gọi `resolveExtensionDirectory`, hàm này tự làm `fs.readdirSync` thô và không bao giờ chạm vào helper capability có cache — `readDirEntries` không nằm trên đường code mà fixture đi qua, nên kiểm bằng nó là xác nhận một tiền đề về sai hàm. Bằng chứng: `packages/coding-agent/src/extensibility/extensions/directory-resolution.ts:114` `children = fs.readdirSync(dir);` — `readDirEntries` không được import ở bất kỳ đâu trong file đó. Import duy nhất của nó trong discovery là helpers.ts:17. |
| Sắp xếp `entries` bên trong `discoverLinkedExtensionModuleFiles` trước khi map. | incomplete-missing-hazard | Chỉ dẫn đúng, nhưng nó bỏ sót cái bẫy khiến nó sai trong cách hiện thực hiển nhiên: `entries` CHÍNH LÀ mảng cache, nên `.sort()` tại chỗ sẽ đột biến cache dùng chung ở cấp module. Bước này phải chỉ rõ phải tạo bản sao. Không có điều này, thay đổi lặng lẽ đảo thứ tự kết quả cho năm module discovery khác, không lỗi, không import nào hỏng. Bằng chứng: `packages/coding-agent/src/capability/fs.ts:39-41` trả về `dirCache.get(abs) ?? []` — cùng một tham chiếu `fs.Dirent[]`, không phải bản sao. Consumer khác: discovery/builtin.ts:48,531,582,701,743; cline.ts:23; gemini.ts:195; omp-extension-roots.ts:243; omp-plugins.ts:236. |
| `getCommandDiagnostics()` trả về `Array<{ type: string; message: string; path: string }>` và cách sửa là thêm `paths: string[]` vào đó. | verified-but-underdetermined | Claim "không có consumer" là đã kiểm chứng. Nhưng plan không nói Ở ĐÂU một chẩn đoán trùng tool được tính ra, và câu trả lời là bị ép: `#commandDiagnostics` bị reset ở đầu `getRegisteredCommands` (runner.ts:1186), nên một chẩn đoán tool chỉ được đẩy vào đó sẽ vô hình với bất kỳ consumer nào chưa gọi `getRegisteredCommands()` trước. Đặc tả này giải quyết bằng một collector private thuần tuý cộng một getter riêng tính lại, để báo cáo tool không mang theo hợp đồng thứ tự ngầm nào. Bằng chứng: runner.ts:1185-1186 `getRegisteredCommands(reserved?) { this.#commandDiagnostics = [];`. `git grep -rn getCommandDiagnostics -- packages/` chỉ trả về runner.ts:1206. |
| Ngữ cảnh nhiệm vụ nói git HEAD là 5873776. | stale | HEAD là 808b365 trên nhánh milestone-1. Mọi neo dòng trong đặc tả này đã được kiểm chứng và khớp với nội dung ở 808b365. Nhưng đừng mặc định cây lúc bạn chạy cũng sạch: nhiều work item chạy song song trên cùng một cây và để lại file rác untracked, mà `bun run check:ts` quét toàn cây nên sẽ đỏ vì chúng — xem "Xác minh". Bằng chứng: `git log --oneline -1` → 808b365 docs(plan): fold the spec-verified M1 execution plan into the upgrade plan. |
| `bun test` báo 0 pass kèm lỗi native-addon. | partly-wrong | Nó báo 0 pass / 1 FAIL / 1 error trên mỗi file — file được tính là fail, không phải skip. Nhỏ thôi, nhưng nó cho kỹ sư biết lần chạy test thật sự đỏ chứ không âm thầm rỗng, đó là điều họ cần biết trước khi tưởng một lần chạy xanh. Bằng chứng: `cd packages/coding-agent && bun test test/extension-loader-concurrency.test.ts` → `0 pass / 1 fail / 1 error / Ran 1 test across 1 file`. |
| Sắp xếp `allPaths` là no-op với consumer vì không gì trong codebase phụ thuộc thứ tự hệ file tình cờ. | verified-with-caveat | Đã kiểm chứng — `loadExtensions` (loader.ts:485-487) dùng `Promise.all(paths.map(...))`, giữ nguyên thứ tự đầu vào, và `bindPreparedExtensions` duyệt theo thứ tự đó, nên thứ tự `this.extensions` đúng bằng thứ tự `allPaths`. Nhưng lưu ý: `resolveExtensionDirectory` được gọi với CONFIGURED_EXTENSION_DIRECTORY_OPTIONS, vốn KHÔNG đặt `sortChildren` (chỉ các plugin options tại `extensibility/plugins/loader.ts:290` mới đặt), nên một thư mục được cấu hình gồm các sub-extension là con đường DUY NHẤT mà post-sort ở loader thực sự gánh trọng. Đó đúng là con đường fixture test đi qua, tốt cho coverage, nhưng nghĩa là đường plugin vốn đã sort và không được gì thêm. Bằng chứng: loader.ts:485-487; loader.ts:526-533 `CONFIGURED_EXTENSION_DIRECTORY_OPTIONS` (không sortChildren) so với `extensibility/plugins/loader.ts:287-291` `PLUGIN_EXTENSION_DIRECTORY_OPTIONS` (sortChildren: true); directory-resolution.ts:119 `if (options.sortChildren) children.sort();`. |

## Cần người xác nhận

Hai chỗ đặc tả mâu thuẫn với chính nó, ghi ra đây thay vì tự sửa:

1. **Hành động của `packages/coding-agent/src/capability/fs.ts`.** Mục trong bảng "File cần chạm tới" khai báo `action: "modify"`, nhưng phần `change` của chính nó nói "KHÔNG THAY ĐỔI. Chỉ đọc để xác nhận vì sao không được chạm vào." — tức là sửa một file mà đồng thời bảo đừng sửa. Cách đọc an toàn: file này CHỈ ĐỌC, không viết; `action: "modify"` là sai. Việc thực hiện theo hướng đó không gây hại, nhưng bảng nên nói "đọc" cho chính xác.

2. **Changelog: `### Changed` hay thêm `### Added`.** Mục `files_touched` cho `packages/coding-agent/CHANGELOG.md` viết "một dòng dưới `### Added`: không có gì mới nhìn thấy được từ phía người dùng ngoài bản báo cáo, nên gộp vào cùng dòng Changed." — tức là tự nó kết luận là không có mục `### Added` và dồn vào `### Changed`. Bước 12 cũng chỉ yêu cầu một dòng dưới `### Changed`. Hai chỗ này thực chất cùng kết luận, nhưng cách viết của mục file khiến người đọc có thể tưởng còn một mục `### Added` riêng cần viết. Chốt lại: chỉ một dòng dưới `### Changed`, không có `### Added`.
