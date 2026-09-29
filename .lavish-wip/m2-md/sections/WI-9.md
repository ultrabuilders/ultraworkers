## WI-9. Seam unload, khác hẳn suspend — thêm `ExtensionRunner.unloadExtension()` gỡ một extension khỏi registry và giải phóng đúng các bucket riêng của nó cùng trampoline fallback riêng của nó

**Thay đổi gì:** Thêm một đường unload thật cho extension: hôm nay "disable" chỉ *suspend* (extension vẫn giữ module state, các bucket đăng ký riêng và các trampoline fallback đã cài), nên ta thêm `ExtensionRunner.unloadExtension(path)` gỡ extension khỏi registry của runner, dispose đúng các trampoline file-write/file-delete của riêng extension đó, và xoá các giá trị runtime flag của nó — cố ý khác `setSuspendedExtensions`, vốn giữ state có chủ đích để resume không phải đấu lại dây.

**Wave:** Wave 7 (vị trí cuối, sau WI-8a và WI-8b). Wave 7 là "Sở hữu của settings và seam unload thật", M–L, ~2.5 tuần, 4 PR. Kế hoạch đặt WI-9 cuối M2 vì bản kiểm kê tài nguyên mà nó khẳng định chỉ hoàn tất sau khi wave 2 và wave 4 đã trao quyền sở hữu cho timer, provider và capability state.

**Effort:** M — lớn hơn vẻ ngoài. Bản thân phần teardown bucket chỉ ~20 dòng; hai tiền đề (giá trị flag theo từng extension, disposer fallback theo từng extension) mới là việc thật, và ma trận test có 15 dòng vì AGENTS.md đòi mỗi dòng một hợp đồng khác nhau.

**Người dùng thấy:** chưa có — nội bộ, người dùng không thấy. Chưa có API nào hướng về extension được phơi bày; kế hoạch cấm rõ ràng việc đưa `unloadExtension` lên `ExtensionAPI` cho tới khi nó đã được chạy qua cả 11 bucket. Hệ quả người dùng thấy chỉ tới khi một milestone sau (WI-12, thiết kế hoãn lại) nối unload vào một cử chỉ thật của người dùng; lúc đó việc vô hiệu hóa một extension sẽ dừng timer nền của nó và dừng fallback file-write của nó khỏi chặn các lần ghi bị từ chối quyền, thay vì chỉ tạm dừng chúng.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/runner.ts` | sửa | **PREREQ 1:** `#fileFallbackDisposers` (khai báo field, dòng 537) đổi từ `Array<() => void>` thành `Map<string, Array<() => void>>` khóa theo `ext.path`; hai chỗ push (dòng 778, 797) ghi vào bucket của extension đó. `disposeFileFallbacks()` (dòng 1346) rút hết mọi bucket rồi clear, giữ nguyên hành vi của hai đường teardown (shutdown phiên ở dòng 410 và re-initialize ở dòng 747). **Mới:** `unloadExtension(extensionPath): boolean`, đặt ngay sau `setSuspendedExtensions` (kết thúc ở dòng 970), giải phóng trampoline, các bucket, mục trong `#suspendedExtensions`, mục trong `#loadOrder`, managed timer và đăng ký provider, và mục `flagValues` theo từng extension. **PREREQ 3:** `getFlagValues()` (dòng 1094) flatten theo `this.extensions` thay vì copy map runtime. `setFlagValue` (dòng 1098) để ngỏ chờ câu hỏi mở. | Có (verified=true; mọi số dòng đã xác nhận bằng `git grep` và `awk` đánh số trên HEAD 808b365) |
| `packages/coding-agent/src/extensibility/extensions/loader.ts` | sửa | **PREREQ 3:** dòng 101 `flagValues = new Map<string, boolean \| string>()` thành map lồng theo từng extension. Dòng 184 `readonly flagValues = new Map<string, boolean \| string>()` trên `ConcreteExtensionAPI` là **chết** — không ai đọc hay ghi; xoá nó. Dòng 265 `this.runtime.flagValues.set(name, options.default)` thành get-or-create trên map trong, khóa `this.extension.path`. Dòng 293 `return this.runtime.flagValues.get(name)` thành `this.runtime.flagValues.get(this.extension.path)?.get(name)`. | Có (verified=true; 101, 184, 223, 263, 265, 291-294 đều khớp chính xác trên HEAD 808b365) |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | sửa | Dòng 1739, trên `interface ExtensionRuntimeState` (khai báo ở dòng 1738): `flagValues: Map<string, boolean \| string>` thành `Map<string, Map<string, boolean \| string>>` — khóa ngoài là extension path, — KHÔNG lấy `unregisterProvider` ở dòng 1745 làm tiền lệ: chữ ký ở đó có `sourceId` nhưng cả hai
  hiện thực đều bỏ qua nó (xem hàng `WRONG PREMISE` trong bảng đính chính bên dưới). Các bucket trên `interface Extension` (dòng 1801-1817) **không** sửa — không cần đổi hình dạng, đây chính là luận điểm trung tâm (và đúng) của kế hoạch. | Có (verified=true; số dòng của plan sai, xem bảng đính chính) |
| `packages/coding-agent/src/main.ts` | sửa | Dòng 2210, bên trong literal `extensionFlagSink` (2207-2212), ghi `extensionsResult.runtime.flagValues.set(name, value)` trực tiếp, bỏ qua runner hoàn toàn. Đây là writer thứ ba và khó nhận ra nhất của map khóa theo tên, và **phải** được di cùng đổi hình dạng nếu không sẽ không typecheck. Dòng 543-544 (`setFlagValue: (name, value) => { runner.setFlagValue(name, value); }`) là writer thứ tư. | Có (verified=true; không được kế hoạch nhắc tới, tìm ra bằng `git grep '\.flagValues' -- packages/coding-agent/src`) |
| `packages/coding-agent/test/extension-unload.test.ts` | tạo | 15 dòng: một bảng 11 dòng (mỗi dòng một bucket) cộng các dòng (a) file-write seam, (b) shared flag name, (c) toolRegistrationListener, cộng một dòng BASELINE có nhãn khẳng định rằng một runner không có extension nào đăng ký fallback thì không cài trampoline nào. | Có (verified=true; xác nhận vắng mặt trên HEAD) |

### Các bước

1. Đổi `flagValues` trên `ExtensionRuntimeState` (`types.ts:1739`) và trên class `ExtensionRuntime` (`loader.ts:101`) từ `Map<string, boolean | string>` thành `Map<string, Map<string, boolean | string>>`, khóa ngoài là extension path. KHÔNG lấy `unregisterProvider(name, sourceId)` ở `types.ts:1745` làm tiền lệ để phản chiếu: chữ ký có `sourceId`
nhưng hiện thực thì không — `loader.ts:108` lọc theo `registration.name !== name`, và `runner.ts:713` rebind
thành `name => this.modelRegistry.unregisterProvider(name)`, bỏ mất `sourceId`. Đây là shape change đầu tiên
gắn sở hữu theo extension path trên `ExtensionRuntimeState`. **KHÔNG** đụng 11 bucket trên `interface Extension` (`types.ts:1801-1817`): chúng đã là per-extension và không cần đổi hình dạng.
   Neo: `packages/coding-agent/src/extensibility/extensions/types.ts:1739`
2. Xoá `readonly flagValues = new Map<string, boolean | string>()` chết trên `ConcreteExtensionAPI` (`loader.ts:184`). Nó chỉ tồn tại để thoả `implements IExtensionRuntime` ở dòng 179; không ai đọc hay ghi — mọi truy cập `.flagValues` trong cả package đều đi qua `this.runtime`. Việc bỏ nó là điều khiến bước 1 trở thành một đổi hình dạng thật sự thay vì hai map song song.
   Neo: `packages/coding-agent/src/extensibility/extensions/loader.ts:184`
3. Viết lại chỗ ghi của `registerFlag` (`loader.ts:265`) thành get-or-create map trong dưới `this.extension.path` trước khi set default. Giữ nguyên guard `options.default !== undefined` ở dòng 264 — một flag không có default vẫn không được tạo entry trong map trong.
   Neo: `packages/coding-agent/src/extensibility/extensions/loader.ts:259-267`
4. Viết lại `getFlag` (`loader.ts:291-294`) sao cho gate per-extension sẵn có `if (!this.extension.flags.has(name)) return undefined;` **ở nguyên**, chỉ phần đọc giá trị mới thành `this.runtime.flagValues.get(this.extension.path)?.get(name)`. Gate vốn đã là per-extension; đây là thứ chặn hai extension chia sẻ tên flag đọc lẫn giá trị của nhau.
   Neo: `packages/coding-agent/src/extensibility/extensions/loader.ts:291-294`
5. Chuyển `#fileFallbackDisposers` từ `Array<() => void>` thành `Map<string, Array<() => void>>` khóa theo `ext.path`, và cập nhật hai chỗ push trong `initialize()` để append vào bucket của extension đó. Không có bước này thì không cách nào diễn đạt "disposer của extension đó" — kế hoạch đòi unload chỉ tiêu đúng trampoline của một extension và không bao giờ toàn bộ danh sách.
   Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:537, 778, 797`
6. Viết lại `disposeFileFallbacks()` để rút hết mọi bucket rồi clear map, sao cho hai đường teardown sẵn có — shutdown phiên (dòng 410) và guard re-initialize (dòng 747) — hành xử **y hệt** hiện nay. Đây là bước thuần refactor: chạy `bun run check:ts` và xác nhận không có gì downstream của đổi hình dạng vỡ trước khi thêm bất kỳ hành vi mới nào.
   Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:1346-1348`
7. Viết lại `getFlagValues()` (`runner.ts:1094-1096`) để flatten theo `this.extensions` theo thứ tự load, last-writer-wins **chỉ ở mặt đọc**. Đây chính là quyết định kế hoạch ghim: hai extension khai báo cùng tên flag không còn ghi đè lên nhau ở mặt sở hữu, nhưng một lần đọc "flag này là gì" vẫn trả về **một** giá trị và extension khai báo sau thắng. Sở hữu vẫn chính xác; thứ tự ưu tiên trở thành chuyện của thời điểm đọc.
   Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:1094-1096`
8. Di cùng hai writer còn lại của map phẳng cũ: `main.ts:2210` (`extensionsResult.runtime.flagValues.set(name, value)`) và `main.ts:543-544`. Bước 7 sẽ không typecheck nếu thiếu bước này — đừng để `bun check` tự phát hiện. Phân giải `setFlagValue` (`runner.ts:1098`) theo quyết định trong *Cần người quyết* **trước khi** viết dòng (b) của test, vì một `--flag=value` do người dùng cung cấp không được lặng lẽ biến mất khi unload.
   Neo: `packages/coding-agent/src/main.ts:2207-2212`
9. Viết `unloadExtension(extensionPath: string): boolean` ngay sau `setSuspendedExtensions`. Thứ tự bên trong thân hàm có ý nghĩa: bắt object `Extension` **trước khi** splice; gỡ khỏi **cả** `this.extensions` **và** `#loadOrder` (chỉ xoá khỏi `this.extensions` là bug — `initialize()` cài lại trampoline cho `getLoadedExtensions()`, mà nó là `#loadOrder ?? this.extensions`, nên một lần re-initialize sẽ hồi sinh trampoline cho một extension không còn tồn tại); gỡ khỏi `#suspendedExtensions`; dispose trampoline fallback của nó; gọi `this.#managedTimers.clearExtension(path)` và `this.runtime.unregisterProvider(path, path)` (cả hai đến từ WI-1 — nếu thiếu bất kỳ cái nào, mục này chưa được mở khóa); xoá entry `flagValues` của path đó; rồi clear cả 11 bucket trên object `Extension`. Trả `false` khi path lạ, để double-unload là no-op chứ không phải throw.
   Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:970`
10. **KHÔNG** phơi `unloadExtension` lên `ExtensionAPI`. Nó ở lại mức runner cho tới khi đã được chạy qua cả 11 bucket. Ngoài ra: đừng thử cách diễn đạt `DisposableList` mà báo cáo dsh đã bác — nó biến 9 phương thức đăng ký thành phương thức trả về effect. Các bucket per-extension **CHÍNH LÀ** sổ sở hữu; chỉ có tài nguyên toàn-runner là thiếu, và bước 1 cùng bước 5 đóng đúng khoảng trống đó.
    Neo: `packages/coding-agent/src/extensibility/extensions/runner.ts:947`
11. Tạo `packages/coding-agent/test/extension-unload.test.ts` trên harness của `extensions-runner.test.ts` (`TempDir` + `getProjectAgentDir(tempDir.path())/extensions` + file extension `.ts` thật + `loadExtensions` + `new ExtensionRunner`). Viết bảng bucket 11 dòng trước, mỗi dòng một hợp đồng, rồi mới viết ba dòng ngoài bảng. Trước khi tick bất kỳ dòng nào, phải nói được mutation nào làm nó đỏ — một dòng không trả lời được câu đó thì không phải là một dòng test.
    Neo: `packages/coding-agent/test/extension-unload.test.ts`
12. Chạy `bun run check:ts` (đã xác nhận xanh trên HEAD 808b365 — 16 package đều Done). `bun test` bị **CHẶN** trên máy này: native addon chưa build, nên mọi file test báo 0 pass / 1 fail với `Failed to load pi_natives native addon for darwin-arm64` (đã xác nhận bằng cách chạy `test/extension-flag-dispatch.test.ts`). Vẫn phải viết file test, nhưng đừng tuyên bố gate đã đạt cho tới khi addon được build và file thực sự chạy.
    Neo: `package.json:94`

### Hình dạng code

```typescript
// packages/coding-agent/src/extensibility/extensions/runner.ts
// PREREQUISITE 1 — index the fallback disposers by extension so unload can consume
// exactly its own. Today it is a flat, unkeyed array, so "that extension's
// disposer" is not expressible.
-#fileFallbackDisposers: Array<() => void> = [];
+#fileFallbackDisposers = new Map<string, Array<() => void>>();

// in initialize(), the two push sites (runner.ts:778 and runner.ts:797) become:
//   const bucket = this.#fileFallbackDisposers.get(ext.path) ?? [];
//   bucket.push(addFileWriteFallback(async req => { /* unchanged closure */ }));
//   this.#fileFallbackDisposers.set(ext.path, bucket);

// disposeFileFallbacks() must drain EVERY bucket so the two existing teardown
// paths (runner.ts:410 session shutdown, runner.ts:747 re-initialize) are
// behaviorally identical to today.
disposeFileFallbacks(): void {
-	for (const dispose of this.#fileFallbackDisposers.splice(0)) dispose();
+	for (const disposers of this.#fileFallbackDisposers.values()) {
+		for (const dispose of disposers) dispose();
+	}
+	this.#fileFallbackDisposers.clear();
}

// PREREQUISITE 2 — the new method. Note the order: capture the Extension
// BEFORE splicing, dispose trampolines BEFORE clearing handler arrays, and
// remove from #loadOrder (not just this.extensions) or a later initialize()
// re-installs the unloaded extension's trampolines at runner.ts:749.
unloadExtension(extensionPath: string): boolean {
-	// ...
+	const liveIndex = this.extensions.findIndex(ext => ext.path === extensionPath);
+	const orderIndex = this.#loadOrder?.findIndex(ext => ext.path === extensionPath) ?? -1;
+	if (liveIndex === -1 && orderIndex === -1) return false;
+	const extension = liveIndex === -1 ? this.#loadOrder![orderIndex] : this.extensions[liveIndex];
+	if (liveIndex !== -1) this.extensions.splice(liveIndex, 1);
+	if (this.#loadOrder && orderIndex !== -1) this.#loadOrder.splice(orderIndex, 1);
+	this.#suspendedExtensions.delete(extension);
+	for (const dispose of this.#fileFallbackDisposers.get(extensionPath) ?? []) dispose();
+	this.#fileFallbackDisposers.delete(extensionPath);
+	this.#managedTimers.clearExtension(extensionPath);            // WI-1, not yet present
+	// WI-1 provider half — CHƯA tồn tại trên HEAD 808b365. Cả loader.ts:108 và runner.ts:713
+	// đều bỏ qua sourceId, nên (extensionPath, extensionPath) sẽ gọi
+	// modelRegistry.unregisterProvider(<đường dẫn file>) — không khớp provider nào, và provider mà
+	// extension đăng ký vẫn nằm lại. Cần unregisterProvidersForSource(sourceId) thật, xem "Cần người quyết".
+	this.runtime.flagValues.delete(extensionPath);                 // new shape
+	extension.handlers.clear();
+	extension.tools.clear();
+	extension.toolRegistrationListeners?.clear();
+	extension.assistantThinkingRenderers.length = 0;
+	extension.fileWriteFallbackHandlers.length = 0;
+	extension.fileDeleteFallbackHandlers.length = 0;
+	extension.messageRenderers.clear();
+	extension.composerShapes.clear();
+	extension.commands.clear();
+	extension.flags.clear();
+	extension.shortcuts.clear();
+	return true;
}

// PREREQUISITE 3 — flagValues becomes attributable. types.ts:1739 (ExtensionRuntimeState),
// loader.ts:101 (ExtensionRuntime), loader.ts:184 (dead per-API copy — delete it, and
// drop `implements IExtensionRuntime` compliance with the flat field if nothing else needs it).
- flagValues: Map<string, boolean | string>;
+ flagValues: Map<string, Map<string, boolean | string>>;   // outer key = extension path

// loader.ts:263-266 registerFlag — the write gains attribution it always should have had
this.extension.flags.set(name, { name, extensionPath: this.extension.path, ...options });
if (options.default !== undefined) {
-	this.runtime.flagValues.set(name, options.default);
+	let values = this.runtime.flagValues.get(this.extension.path);
+	if (!values) {
+		values = new Map();
+		this.runtime.flagValues.set(this.extension.path, values);
+	}
+	values.set(name, options.default);
}

// loader.ts:291-294 getFlag — already gated per-extension by this.extension.flags.has(name);
// only the value read becomes per-extension. Two extensions declaring the same name no
// longer overwrite one slot; each owns its own, and last-declaring-wins moves to the read face.
getFlag(name: string): boolean | string | undefined {
	if (!this.extension.flags.has(name)) return undefined;
-	return this.runtime.flagValues.get(name);
+	return this.runtime.flagValues.get(this.extension.path)?.get(name);
}

// runner.ts:1094 getFlagValues() — flatten over this.extensions in load order, so a flag
// declared by several extensions still answers "what is this flag" with ONE value and a
// later-declaring extension wins at the READ face, not at the ownership face.
getFlagValues(): Map<string, boolean | string> {
-	return new Map(this.runtime.flagValues);
+	const flattened = new Map<string, boolean | string>();
+	for (const ext of this.extensions) {
+		for (const [name, value] of this.runtime.flagValues.get(ext.path) ?? []) {
+			flattened.set(name, value);
+		}
+	}
+	return flattened;
}

// runner.ts:1098 setFlagValue — the open question. Do NOT silently widen the inner map to
// every declaring extension without deciding; see open_questions.
```

### Hợp đồng test

File test: `packages/coding-agent/test/extension-unload.test.ts` (file MỚI — không tồn tại trên HEAD; đã xác nhận bằng `ls`, và không có symbol `unloadExtension`/`removeExtension` nào trong `src` hay `test`). Dựng trên harness của `extensions-runner.test.ts:1-97` — `TempDir.createSync('@pi-...-')`, `getProjectAgentDir(tempDir.path())/extensions`, ghi file extension `.ts` thật, `loadExtensions(paths, cwd)`, `new ExtensionRunner(result.extensions, result.runtime, cwd, sessionManager, modelRegistry)`.

Hợp đồng quan sát được: sau khi `ExtensionRunner.unloadExtension(path)` trả `true`, extension đó **không đóng góp gì** cho runner — nó vắng trong `getLoadedExtensions()`/`isExtensionActive`, và cả 11 bucket đăng ký mà nó đã điền đều rỗng — trong khi mọi extension **khác** vẫn chạy, và một giá trị flag do extension còn sống khai báo vẫn đọc được.

Dịch thành "nếu hồi quy, người tiêu dùng thấy …": nếu hồi quy, người dùng vô hiệu hóa lại một extension sẽ thấy **lệnh ma**, **mô tả tool cũ**, **shortcut chết**, **flag trùng lặp**, hoặc một file-write fallback âm thầm làm trung gian lệnh ghi của họ cho một broker mà họ vừa tắt.

15 dòng bảo vệ:

- **11 dòng bucket** — mỗi dòng một hợp đồng, theo AGENTS.md.
- **Dòng (a) — file-write seam**, gồm hai nửa: (i) handler của extension không còn được gọi khi có một lần ghi bị từ chối quyền, và (ii) `hasFileWriteFallback()` trả `false` trở lại. Nửa (ii) là nửa phân biệt, và là dòng **fail** nếu unload rút bucket mà quên disposer của trampoline.
- **Dòng (b) — hai extension khai báo cùng tên flag với default khác nhau**: unload một cái, giá trị đọc được phải là default của extension **CÒN LẠI** — không phải `undefined`, không phải giá trị của extension đã bị unload. Đây là dòng duy nhất bắt được bug xoá nhầm entry.
- **Dòng (c)** — listener `onToolRegistered` do extension A đăng ký không bắn khi extension B đăng ký một tool sau khi A đã bị unload.
- **Dòng BASELINE** (có nhãn) — một runner không có extension nào đăng ký fallback thì không cài trampoline nào.

### Xác minh

**Chạy được ngay hôm nay:**

```bash
bun run check:ts
```

(đã chạy trên HEAD 808b365, cả 16 package báo Done, exit 0)

**Chưa chạy được ngay hôm nay** — `bun test` bị chặn vì native addon chưa build, nên `cd packages/coding-agent && bun test test/extension-unload.test.ts test/extensions-runner.test.ts` báo `0 pass, 1 fail` kèm `Failed to load pi_natives native addon for darwin-arm64` trước khi chạy một khẳng định nào. Đã xác nhận bằng cách chạy một file test có sẵn và biết là tốt (`test/extension-flag-dispatch.test.ts`): 0 pass, 1 fail, 1 error.

**Cổng đầy đủ, một khi addon đã build:**

```bash
bun run check:ts && (cd packages/coding-agent && bun test test/extension-unload.test.ts test/extensions-runner.test.ts)
```

với file mới báo **15 pass / 0 fail**.

### Cổng hoàn thành

Cổng này chỉ có thể fail **MỘT PHẦN**, và điều đó phải nói thẳng. `bun run check:ts` thực sự đỏ nếu bỏ sót bất kỳ call site nào của việc đổi hình dạng `flagValues` (có bốn writer, ba cái nằm ngoài `loader.ts`), và nó đỏ nếu `#fileFallbackDisposers` được đánh lại khoá mà không cập nhật `disposeFileFallbacks`. Nhưng `check:ts` **hoàn toàn xanh khi xoá sạch cả 15 dòng test**, nên nó không thể đứng một mình chứng minh hành vi teardown bucket. Cổng phân biệt là dòng (a) nửa (ii) cộng dồng (b): một mutation rút bucket mà bỏ qua disposer trampoline, hoặc xoá nhầm entry `flagValues`, là vô hình với `check:ts` và chỉ bị test bắt — mà test thì không chạy được cho tới khi native addon được build.

DONE đòi **TẤT CẢ** những điều sau:

1. `bun run check:ts` exit 0 — cổng duy nhất thực sự chạy được trên máy này hôm nay, và nó phủ phần di dời type trên bốn file (`types.ts:1739`, `loader.ts:101/184/265/293`, `runner.ts:537/1094`, `main.ts:2210`), tức là nơi một call site bỏ sót sẽ lộ ra.
2. `packages/coding-agent/test/extension-unload.test.ts` tồn tại với đủ 15 dòng, 11 dòng là một-dòng-một-bucket, và mutation phân biệt của từng dòng được viết ra trong file test dưới dạng comment.
3. `bun test test/extension-unload.test.ts` báo **15 pass / 0 fail** — điều này **hiện đang BỊ CHẶN** bởi native addon chưa build và tuyệt đối không được tuyên bố xanh.
4. `grep` xác nhận không còn writer hay reader phẳng nào dạng `.flagValues.set(name, ...)` / `.flagValues.get(name)` bất cứ đâu dưới `packages/coding-agent/src`.

Cần nhấn mạnh: (1) một mình **không** đủ làm bằng chứng hoàn thành — `check:ts` xanh hoàn toàn ngay cả khi xoá cả file test — nên (3) mới là cổng thực sự có thể đỏ trên một cái unload làm dở.

`gate_can_fail: true`.

### Phụ thuộc

- **WI-1 (chặt, CẢ HAI NỬA)** — đừng build unload trước khi suspend đúng, nếu không unload sẽ thừa hưởng timer và provider leak. Đã kiểm chứng: `managed-timers.ts:22-68` `ManagedTimers` là một `Set<Timer>` phẳng, runner-wide, chỉ có `clear(handle)` và `clearAll()`; hôm nay không có sở hữu timer per-extension, nên unload không thể giải phóng timer của một extension cho tới khi WI-1 thêm nó.
- **WI-1 provider half (wave 4) — CHƯA có trên HEAD `808b365`.** `types.ts:1745` chỉ khai *chữ ký* `unregisterProvider(name: string, sourceId: string)`; cả hai
  hiện thực đều bỏ qua `sourceId` — `loader.ts:108` lọc theo `registration.name !== name`, và `runner.ts:713`
  rebind thành `name => this.modelRegistry.unregisterProvider(name)`. `unregisterProvidersForSource` không tồn tại. Vì vậy
  `flagValues` **không** có tiền lệ để phản chiếu: nó là shape change đầu tiên gắn sở hữu theo extension path
  trên `ExtensionRuntimeState`, và WI-1 phải làm provider registry theo cùng cách thì `unloadExtension`
  mới giải phóng được provider. Thiếu nó thì mục này âm thầm rò provider.
- **WI-4 (wave 2)** — để wave 7 có bản kiểm kê tài nguyên đầy đủ cần giải phóng.
- **WI-5 (wave 3 commit 1)** — để bản kiểm kê tài nguyên toàn-runner đầy đủ. Cụ thể `reset()` phải đã là unconditional.

**Chặn:** WI-12 (M2 wave 8, chỉ thiết kế, hoãn lại) — kế hoạch nói WI-12 không thể thiết kế nếu chưa có WI-9.

### Cách sai dễ nhất

Một cái unload nửa vời mà rò rỉ. Extension bị unload một nửa, một nửa đăng ký của nó còn sống sót — khó gỡ lỗi hơn hẳn suspend all-or-nothing của hôm nay, vì nó biến một hạn chế đã biết thành một lời hứa sai. Ba bẫy cụ thể, theo đúng thứ tự kế hoạch nêu:

1. Giá trị runtime của `registerFlag` — không assertion bucket nào nhìn thấy nó.
2. Dispose nhầm trampoline fallback (hoặc không dispose cái nào) — trampoline là một module array phạm vi tiến trình, nên một trampoline rò rỉ vẫn giữ `hasFileWriteFallback()` trả `true` ngay cả sau khi mọi mảng handler đã được rỗng.
3. Bẫy êm nhất — một dòng test viết sai hướng vẫn xanh mà chẳng gate gì.

Trước khi tick bất kỳ dòng nào, hỏi: **mutation nào làm dòng này đỏ?** Một dòng không trả lời được câu đó không phải là một dòng test, dù nó có xanh đến đâu.

### Cần người quyết

Các câu hỏi mở dưới đây đều cần một con người chọn trước khi viết code; không được tự bịa. Trong đó **hai câu đầu chặn việc bắt đầu** vì chúng quyết định hình dạng của `flagValues` và của dòng test (b):

- **Làm sao giá trị flag do CLI cấp sống sót qua việc đổi hình dạng `flagValues`?** `runner.ts:1098 setFlagValue(name, value)` và `main.ts:2210 extensionsResult.runtime.flagValues.set(name, value)` đều là ghi không gắn extension, và `runner.ts:1094 getFlagValues()` trả một `Map<string, boolean|string>` phẳng. Dưới `Map<extensionPath, Map<flagName, value>>` không có chỗ rõ ràng cho một `--flag=value` do người dùng gõ. Hai ứng viên: **(a)** một lớp `flagValueOverrides: Map<string, boolean|string>` riêng, thắng lúc đọc và không bị unload đụng tới; **(b)** `setFlagValue` fan ra mọi extension khai báo và `getFlagValues()` flatten lúc đọc. (a) sạch hơn và nghĩa là một giá trị người dùng đặt vẫn sống sót sau khi unload extension chỉ cung cấp *default* — đúng như người dùng mong. **Một con người phải chọn; đừng tự bịa.**
- ****ĐÃ kiểm chứng, câu trả lời là không.** `getFlagValues()` không có caller nào trong toàn bộ `packages/` — `grep -rn 'getFlagValues' packages/ --include='*.ts'` chỉ ra đúng một dòng, chính khai báo ở `runner.ts:1094`. Nó đã có sẵn một hình dạng phẳng mà không ai tiêu thụ; đổi sang per-extension là miễn phí về mặt call site. Giữ lại như một câu hỏi đã đóng, không phải để trả lời.** `cli/extension-flags.ts:9 ExtensionFlagSink` chỉ cần `getFlags()` và `setFlagValue()`, nên flatten có thể nằm lại bên trong runner — nhưng phải xác nhận không có consumer SDK nào đọc thẳng `runtime.flagValues` trước khi đổi kiểu.

- **Câu thứ ba, chặn việc đóng mục: `unloadExtension` gỡ provider registration theo tên nào?** Tên `name` là do extension tự chọn
  (`pi.registerProvider("anthropic", …)`), nên cặp `(extensionPath, extensionPath)` **không bao giờ khớp** — xem hàng
  `WRONG PREMISE` trong bảng đính chính bên dưới. Cần một trong hai: `unregisterProvidersForSource(sourceId)` thật
  (là deliverable của WI-5 commit 2-3, hiện chưa tồn tại), hoặc duyệt `pendingProviderRegistrations` và `modelRegistry`
  theo `sourceId`. Chọn hướng nào? Đây là câu hỏi duy nhất trong mục này quyết định
  `unloadExtension` có thật sự gải phóng hết hay không.

Còn hai câu nữa không chặn việc bắt đầu nhưng phải trả lời trước khi đóng mục:

- `unloadExtension` nên trả về `Extension` đã gỡ (để caller có thể add lại) hay `boolean`? Kế hoạch không nói gì. `boolean` là bề mặt nhỏ hơn và khớp hình dạng của `isExtensionActive`; trả về object mời lời một đường add-lại mà chưa ai thiết kế.
- Reload (unload + load) có nằm trong phạm vi WI-9 không, hay thuần tuý là unload? Kế hoạch hoãn cache-busting và gọi module cache là follow-up — nhưng xem bảng đính chính: cache-busting **đã tồn tại** và **đã per-load**, nên nếu reload có trong phạm vi thì nó thừa hưởng cơ chế sẵn có miễn phí và follow-up biến mất. Nếu reload không có trong phạm vi, WI-9 thuần tuý là teardown và không có việc gì với module graph.

### Đính chính so với plan

| claim của plan | verdict | correction |
| --- | --- | --- |
| `runner.ts:1333` — "cú quét dispose() toàn bộ `#fileFallbackDisposers`; unload phải tiêu đúng disposer của extension đó" | STALE-LINE + MISSING-PREREQUISITE | Cú quét không ở 1333 và không phải một `dispose()` trần. Đó là `disposeFileFallbacks()` ở `runner.ts:1346-1348`, được gọi từ hai nơi: shutdown phiên (`runner.ts:410`) và guard re-initialize (`runner.ts:747`). Quan trọng hơn, yêu cầu của plan **không diễn đạt được** hôm nay: `#fileFallbackDisposers` (`runner.ts:537`) là một `Array<() => void>` phẳng, không gắn với extension nào, nên "disposer của extension đó" không tồn tại. Chuyển nó thành Map khóa theo path là việc bắt buộc **bên trong** WI-9 mà plan không liệt kê thành một bước. |
| (1) "module graph được cache bởi runtime, nên unload thật cần cache-busting" … "coi module cache là follow-up" | **SAI — đã được cài đặt** | Cache-busting không phải follow-up; nó **đã tồn tại** và **đã per-load**. `loadLegacyPiModule` gắn một tag tăng đơn điệu mới vào entry specifier ở mỗi lần import, nên mọi lần load đã nhận một module graph mới. Không có việc cache nào cho WI-9 phải làm. Lời khuyên sequencing "giải quyết bucket teardown trước, coi module cache là follow-up" của plan nhắm vào một vấn đề codebase không hề có. Nếu reload bao giờ có trong phạm vi thì nó thừa hưởng cơ chế này miễn phí; nếu không thì WI-9 thuần tuý là teardown và đoạn về module-graph nên bị xoá khỏi plan. |
| `types.ts:1806-1816` (11 bucket phải giải phóng), `:1783` (toolRegistrationListeners là Set per-extension) | STALE-LINE (lệch ~25) | `interface Extension` ở `types.ts:1801-1817`; `toolRegistrationListeners?: Set<ToolRegistrationListener>` ở dòng **1808**. Con đếm 11 bucket và kết luận "không cần đổi hình dạng" đều **đúng** — chỉ có số sai. (Đếm chuẩn: handlers 1805, tools 1806, toolRegistrationListeners 1808, assistantThinkingRenderers 1809, fileWriteFallbackHandlers 1810, fileDeleteFallbackHandlers 1811, messageRenderers 1812, composerShapes 1813, commands 1814, flags 1815, shortcuts 1816.) |
| `runner.ts:755` (điều kiện cài trampoline) và `:766-771` (bất biến trampoline cần giữ) | STALE-LINE | Skip-guard ở `runner.ts:755`: `if (ext.fileWriteFallbackHandlers.length === 0 && ext.fileDeleteFallbackHandlers.length === 0) continue;`. Các lần cài thật là `addFileWriteFallback(...)` ở 778 và `addFileDeleteFallback(...)` ở 797. Comment bất biến mà plan trỏ tới là khối 750-755. Lập luận baseline-row của plan ("một dòng khẳng định seam rỗng sẽ xanh ngay trên HEAD") vẫn **đúng** và là điểm sắc nhất của mục — giữ lại. |
| `runner.ts:1290-1292` (timer runtime-scoped) | STALE-LINE (lệch ~14) | Bộ ba timer nằm ở `runner.ts:1304-1306` trong `createContext()`: `setInterval`/`setTimeout`/`clearTimer` đều uỷ quyền về cùng một `#managedTimers` runner-wide. Claim nội dung — kho timer là toàn-runner, không có chủ per-extension, đó là lý do WI-1 là tiền đề cứng — là **XÁC NHẬN**: `ManagedTimers` giữ một `Set<Timer>` phẳng và chỉ phơi ra `clear(handle)` và `clearAll()`. Nên unload không thể giải phóng timer của một extension cho tới khi WI-1 thêm sở hữu per-extension. |
| row (b) nói về giá trị runtime của `registerFlag` tại `loader.ts:265` | **THIẾU — thêm ba call site mà plan không bao giờ nhắc** | `flagValues` có **bốn** writer và **một** reader phẳng trên toàn package, và chỉ một cái nằm trong `loader.ts`. Ba cái còn lại hỏng âm thầm dưới đổi hình dạng nếu bỏ sót: `runner.ts:1099 setFlagValue` (không gắn extension — chính là câu hỏi mở), `runner.ts:1095 getFlagValues()` (trả một bản copy phẳng — phải thành flatten theo `this.extensions`), và `main.ts:2210 extensionsResult.runtime.flagValues.set(name, value)` (bỏ qua runner hoàn toàn). `flagValues` sau đổi hình dạng là thay đổi trên bốn file, không phải thứ chuyện nội bộ `loader.ts`, và row (b) của plan không chuẩn bị cho con người điều đó. |
| Cơ chế của row (c): "extension rời registry, nên nó không còn đăng ký được tool, nên bucket của nó không còn ai drain" | PARTLY-CORRECT — cơ chế được nêu yếu hơn thực tế | Phần còn lại của phân tích đúng tuyệt đối: bucket là per-extension, `loader.ts:223` là reader duy nhất của nó, và disposer của `onToolRegistered` (`runner.ts:1044-1048`) đóng trên một mảng `subscriptions` cục bộ, huỷ chính lệ đăng ký đó trên **mọi** extension cùng lúc — một hợp đồng khác, không phải hợp đồng unload. Nhưng "nó không còn đăng ký được tool" chỉ đúng với đường lúc load. Object API của extension A vẫn giữ `Extension` của nó sau khi A bị unload, nên một closure async đã giữ lại mà gọi `api.registerTool` về sau vẫn drain listener set của A và listener vẫn bắn. Test theo cách plan viết (đăng ký ở extension B) pass dù thế nào và không phân biệt được. Một dòng — `extension.toolRegistrationListeners?.clear()` bên trong `unloadExtension` — làm cho hợp đồng đã nêu trở thành vô điều kiện. Hãy viết dòng test theo hợp đồng **hành vi** (listener không bắn), vốn đúng bất kể thế nào, và thêm lệnh clear để cơ chế khớp với claim. |
| Lệnh xác minh `bun run check:ts && (cd packages/coding-agent && bun test test/extension-unload.test.ts test/extensions-runner.test.ts)` | **PARTIALLY UNRUNNABLE** như đã viết | Nửa đầu chạy và xanh (đã chạy trên HEAD 808b365: cả 15 package Done, exit 0). Nửa sau không chạy được trên máy này: native addon chưa build, nên mọi file test báo 0 pass / 1 fail trước khi khẳng định điều gì. Phải nói cổng là **bị chặn** thay vì trình bày lệnh gộp như một pass/fail đơn lẻ. |
| Tiền đề: `unregisterProvider(name, sourceId)` (`types.ts:1745`) "sẵn đã khóa theo sourceId, nên đổi hình dạng `flagValues` chỉ là phản chiếu tiền lệ có sẵn" | **WRONG PREMISE** | Chữ ký ở `types.ts:1745` có `sourceId`, nhưng **không hiện thực nào dùng nó**. `loader.ts:108` lọc `pendingProviderRegistrations` bằng `registration.name !== name`; `runner.ts:713-715` sau `initialize()` rebind thành một lambda một tham số trỏ thẳng vào `modelRegistry.unregisterProvider(name)`, nên `sourceId` biến mất hoàn toàn. Hệ quả trực tiếp: `unregisterProvider(extensionPath, extensionPath)` **không** gỡ được provider mà extension đăng ký dưới tên khác (ví dụ `pi.registerProvider("anthropic", …)`), và sau khi runner rebind thì nó lại xoá một *model provider* theo tên đường dẫn file. `unregisterProvidersForSource` — thứ plan gọi là deliverable của WI-5 commit 2-3 — **không tồn tại** (`grep -rn 'unregisterProvidersForSource' packages/coding-agent/src/` → rỗng). Phần đúng của hàng: `ManagedTimers` thật sự không có chủ per-extension, và plan đúng khi nói WI-9 không được build trước. |
| `runner.ts:934-956` (suspend) và `:984-1050` (phóng `onToolRegistered`), `:1031-1035` (disposer theo từng đăng ký) | STALE-LINE (lệch 6-13, vùng vẫn nhận ra) | `setSuspendedExtensions` ở 947 (doc comment 940-946, thân tới 970); `isExtensionActive` ở 937. Chữ ký `onToolRegistered` ở 997, wrapper per-extension ở 1027-1040, và disposer ở 1044-1048, không phải 1031-1035. Đặc tả của plan về disposer đó là đúng: nó đóng trên một mảng `subscriptions` cục bộ và huỷ một lệ `onToolRegistered` trên mọi extension cùng một lúc. |

## Cần người xác nhận

Ba chỗ đặc tả tự mâu thuẫn hoặc viết mơ hồ. Không tự sửa — ghi lại đây:

1. **Bước 9 so với `code_shape` về cách xoá giá trị flag.** Prose của bước 9 yêu cầu "delete `this.runtime.flagValues.get(path)`" — đây là một lệnh **no-op**, vì `.get()` không xoá gì. Khối `code_shape` cho cùng thân hàm lại dùng `this.runtime.flagValues.delete(extensionPath);`, và chính `code_shape` cũng là nơi duy nhất viết `getFlagValues` đọc bằng `.get(ext.path)`. Hai bên không thể cùng đúng. Bản `code_shape` khớp với hình dạng `Map` mà bước 1 đặt ra, nhưng sự tồn tại của hai câu chữ nghĩa là bước 9 cần một người xác nhận trước khi gõ.
2. **Điều kiện ở hàng `types.ts` đọc ngược.** Hàng đó viết "Delete the now-orphaned flat declaration on ConcreteExtensionAPI **if** IExtensionRuntime still requires one" — trong khi bước 2 và `code_shape` đều yêu cầu xoá vô điều kiện, kèm lý do "không ai đọc hay ghi" và "bỏ nó là thứ khiến bước 1 thành đổi hình dạng thật". Mệnh đề cũng đọc ngược logic: nếu interface vẫn *yêu cầu* field thì xoá field ở phía implement sẽ làm hỏng typecheck chứ không phải giải quyết gì. Ngoài ra field bị nhắc nằm ở `loader.ts:184`, không phải trong `types.ts` — hàng mang tên file nhưng nội dung nói về file khác.
3. **Khoảng cách "hai dòng bên dưới" ở bước 1.** Bước 1 mô tả `unregisterProvider(name, sourceId)` là "hai dòng bên dưới" `types.ts:1739`, tức là khoảng 1741; cùng đặc tả lại đặt nó ở `types.ts:1745` ở nhiều chỗ khác. Chênh lệch này vô hại, nhưng neo phải là `types.ts:1745`.
