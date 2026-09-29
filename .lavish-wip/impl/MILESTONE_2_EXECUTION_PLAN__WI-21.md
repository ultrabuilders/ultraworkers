# Phiếu triển khai — WI-21 (GAP-M2-14) `omp plugin update`

Kế hoạch: `MILESTONE_2_EXECUTION_PLAN.md` §WI-21 (dòng 4949).
Trạng thái cây lúc đo: `milestone-1` @ `65cc6c1`.
Ngày đo: 2026-09-29.

---

## 0. KẾT QUẢ KIỂM LẠI NEO (đọc trước phần còn lại)

**Hai neo được việc dẫn (`git-url.ts:16,184`) là ĐÚNG.** Nhưng phần lớn tiền đề của mục là SAI, và sai theo cách làm một grep sai báo động đỏ trên một lỗ hổng không tồn tại.

| Neo trong mục | Lệnh đã chạy | Kết quả | Verdict |
| --- | --- | --- | --- |
| `packages/coding-agent/src/…/git-url.ts:16` | `sed -n '16p'` | `	pinned: boolean;` | **ĐÚNG** — khai báo field trong `export type GitSource` (dòng 4), doc comment dòng 15: `/** True if ref was specified (package won't be auto-updated) */` |
| `packages/coding-agent/src/…/git-url.ts:184` | `sed -n '184p'` | `		pinned: Boolean(info.committish || split.ref),` | **ĐÚNG** — chỗ **gán** cờ, trong `tryKnownHostSource()` |
| `config/registry.ts:789` (namespace của WI-8a, dẫn ở bảng rủi ro) | `sed -n '785,795p'` | `	byId.set(definition.id, handle as AnySetting);` | **ĐÚNG** — và đúng nghĩa: đây là biến dạng ghi duy nhất, không có `unregister` |
| GAP-M6-15 chưa merge | `rg 'sourcePin\|assertPinnedSource' packages/coding-agent/src` | **0 hit** | **ĐÚNG** — thứ tự phụ thuộc là thật |
| `grep -rniE 'plugins update\|extensions update\|updateExtension\|updatePlugin' packages/coding-agent/src --include='*.ts'` | chạy lại | **0 hit** | **ĐÚNG VỀ CON SỐ, SAI VỀ KẾT LUẬN** — xem D1 |

Ba bước của mục tự ghi `*(neo: không)*` (bước 1, 3, 5). Không có neo nào để kiểm. Bước 5 là bước *duy nhất* định nghĩa bất biến an toàn, và nó cũng là bước không có neo.

### D1 — CORRECTION LỚN NHẤT: lệnh update **đã tồn tại**, và grep của mục là false-negative

Mẫu grep trong mục (`plugins update|extensions update|updateExtension|updatePlugin`) **không trùng tên hàm thật**. Tên thật trong cây là `upgrade*`, và action verb là `"upgrade"` — không phải `update`. Đây là một probe đo sai đối tượng: 0 hit **không** chứng minh thiếu lệnh, nó chỉ chứng minh cây không dùng đúng từ mà người đo tưởng nó dùng.

`omp plugin upgrade` **đã có, đã đăng ký, đã test, đã xuất bản**:

| Mắt xích | Neo đã mở | Nội dung |
| --- | --- | --- |
| Action trong union | `plugin-cli.ts:39` | `	\| "upgrade";` (dòng cuối của `PluginAction`) |
| Action trong bảng hợp lệ | `plugin-cli.ts:73` | `	"upgrade",` |
| Dispatch | `plugin-cli.ts:189-190` | `		case "upgrade":` / `			await handleUpgrade(cmd.args, cmd.flags);` |
| Handler | `plugin-cli.ts:311` | `async function handleUpgrade(args: string[], flags: PluginCommandArgs["flags"]): Promise<void> {` |
| Gọi "nâng tất cả" | `plugin-cli.ts:344` | `			const results = await manager.upgradeAllPlugins();` |
| Ngữ cảnh cảnh báo | `cli-commands.ts:326-327` | `	upgrade:` / `` '`omp upgrade` is not a top-level command. Use `omp plugin upgrade [name@marketplace]` …' `` |
| Tài liệu | `docs/marketplace.md:71` | `omp plugin upgrade [--scope user\|project] [name@marketplace]` |
| Đã phát hành | `CHANGELOG.md:739` | ``- `plugin upgrade` on an npm-installed plugin … now points to `omp plugin install <pkg> --force` … ([#11090](…))`` |

Bốn hàm phía dước tất cả đã tồn tại, đã mở file và đọc:

- `marketplace/manager.ts:762` — `async checkForUpdates(): Promise<Array<{ pluginId: string; scope: "user" | "project"; from: string; to: string }>> {`
- `marketplace/manager.ts:812` — `async upgradePlugin(pluginId: string, scope?: "user" | "project"): Promise<InstalledPluginEntry> {`
- `marketplace/manager.ts:848` — `async upgradePluginAcrossScopes(pluginId: string): Promise<InstalledPluginEntry[]> {`
- `marketplace/manager.ts:880` — `async upgradeAllPlugins(): Promise<…>`

Test đã có và **chạy xanh ngay bây giờ**: `bun test packages/coding-agent/test/marketplace/manager.test.ts` → **62 pass, 0 fail**, gồm `upgradePlugin updates the installed version` (dòng 1272), `upgradeAllPlugins upgrades outdated plugins and returns results` (1300), `upgradePluginAcrossScopes …` (1372).

**Hệ quả trực tiếp lên câu hỏi "cần người quyết":**

- *«Có cần `--all` không, hay chỉ từng cái?»* — **Đã có câu trả lời trong code**: `handleUpgrade` với `pluginId === undefined` gọi `upgradeAllPlugins()`. `omp plugin upgrade` trần **đã là** `--all`. Câu hỏi này **đóng**, không cần hỏi. (Còn lại: hết `--scope` khi nâng tất cả — dòng 339-343 đã in cảnh báo.)
- *«Effort S hay M?»* — câu trả lời đổi hẳn: **S**, vì transaction đã có sẵn (mục 3 dưới). M chỉ còn nếu người quyết định mở rộng sang cả ba kênh git/URL/local.

### D2 — CORRECTION: transaction đã có sẵn ở đường install, không phải phải dựng

Mục bước 5 nói update phải là "resolve + tải + verify digest + đổi trỏ" và cảnh báo gộp 4 thành 3 sẽ để lại trạng thái nửa vời. Trên HEAD, 3 trong 4 bước đã có và đã có rollback:

- `manager.ts:333` — `async #snapshotInstalledPackage(actualName: string | undefined): Promise<PluginPackageSnapshot | null> {`
- `manager.ts:364` — `async #rollbackFailedInstall(` — khôi phục `package.json` **và** `bun.lock` **và** cây package
- `manager.ts:397` — `async #validateInstalledExtensions(plugin: InstalledPlugin): Promise<void> {`
- `manager.ts:447` — `async install(specString: string, options: InstallOptions = {}): Promise<InstalledPlugin> {`
- `manager.ts:672-687` — `catch (err) { try { await this.#rollbackFailedInstall(` … `} finally { await this.#cleanupSnapshot(packageSnapshot); } }`
- `manager.ts:1181` — `async #reconcileVersionDrift(name: string, expected: string): Promise<boolean> {` — một rollback thứ hai, dùng cho `doctor --fix`

Thêm nữa, đường **git re-install đã có sẵn bước nâng**: `manager.ts:591-610` chạy `refreshBunGitCache(gitSource, getPluginsDir())` rồi `Bun.spawn(["bun", "update", actualName])` khi `gitSource && existingActualName`. Nghĩa là **cơ chế "nâng một plugin git đã cài" đã tồn tại** — nó chỉ chưa có lệnh để gọi vào.

Tài liệu `docs/plugin-manager-installer-plumbing.md:252` nói thẳng `The plugin manager is not transactional.` — và bảng ngay dưới (dòng 256-258) liệt kê ba giai đoạn có rollback thật. Nên "không transaction" là **thật**, nhưng **giới hạn ở uninstall và link**, không phải install/update.

### D3 — CORRECTION: `pinned` là field CHẾT, không có consumer nào

Mục bước 4 coi `pinned` là ràng buộc phải tôn trọng. Trên HEAD, nó **chưa từng được đọc ở đâu**:

```
rg -n "pinned" packages/coding-agent/src/extensibility/plugins/ packages/coding-agent/src/cli/plugin-cli.ts
→ git-url.ts:16   (khai báo)
→ git-url.ts:184  (gán, tryKnownHostSource)
→ git-url.ts:232  (gán, parseGenericGitUrl)
→ git-url.ts:268  (gán)
```

Bốn chỗ, **không có chỗ đọc**. Doc comment ở dòng 15 hứa `package won't be auto-updated` — nhưng không dòng nào thực thi lời hứa đó. Không có chỗ nào trong mục nào của WI-21 cần sửa `git-url.ts`; mục đã ghi đúng khi nói "đọc, KHÔNG sửa".

**Đây là tin tốt cho bước 4 và tin xấu cho cổng:** bất biến "pinned không tự nhảy version" **đang đúng bằng ngẫu nhiên**, không bằng cưỡng chế. Một implementation nao trôi theo đường marketplace (đã có) sẽ **không hề đụng** tới git, nên test sẽ xanh mà không chứng minh gì.

### D4 — CORRECTION: `upgradeAllPlugins` **đã vi phạm DÒNG 2 ngay hôm nay**

Đây là phát hiện sắc nhất. DÒNG 2 của mục: *"một lần tải hỏng giữa chừng không để lại trạng thái nửa vời"*. Code đã có:

`marketplace/manager.ts:877-880` (comment) —
```
	// Upgrade every (pluginId, scope) pair that checkForUpdates reports as outdated.
	// Only stale scopes are touched; a current user install is not re-installed when only
	// the project scope is stale. Per-entry failures are skipped — partial success is returned.
```
`marketplace/manager.ts:885-893` (thân) —
```
		for (const update of updates) {
			try {
				const entry = await this.upgradePlugin(update.pluginId, update.scope);
				results.push({ pluginId: update.pluginId, scope: update.scope, from: update.from, to: entry.version });
			} catch {
				// Skip this entry; partial upgrades are better than none.
			}
		}
```

`catch {}` **rỗng, nuốt lỗi không log**. Một plugin nâng hỏng giữa chừng **không hề được báo**, và `handleUpgrade` in ra danh sách **trông như thành công toàn bộ**. Đó **chính là** trạng thái nửa vời mà DÒNG 2 cấm — không phải trạng thái nửa vời trên đĩa, mà là trạng thái nửa vời trong **lời nói với người dùng**. Người dùng đọc "3 plugin đã nâng" và tin cả ba.

Nên WI-21 không phải "thêm lệnh". Nó là **đóng một lỗ hẹn dẫn dữ liệu đã tồn tại**, và cái lỗ hẹn nằm ở chỗ dễ tưởng là an toàn nhất (`catch` rỗng = "best effort").

### D5 — Correction nhỏ nhưng phải ghi: hạ tầng test KHÔNG bị chặn trên máy này

Mục ghi: *"Bị chặn cho tới khi có native addon: `bun test` chết ngay ở bước import với `Failed to load pi_natives native addon for darwin-arm64`"*. Chạy thật trên máy này:

```
$ bun test packages/coding-agent/test/marketplace/manager.test.ts
 62 pass  0 fail  159 expect() calls  Ran 62 tests across 1 file. [1053.00ms]

$ bun test packages/coding-agent/test/plugin-command.test.ts
 1 pass  0 fail

$ bun run check:ts
… @oh-my-pi/pi-coding-agent:check:types | Done in 5.44s
[exited with code 0]
```

Addon **đã build**. Cả ba cổng chạy được ngay. Đừng dùng "bị chặn" làm lý do hoãn.

---

## 1. Cái gì thay đổi, quan sát được

`omp plugin upgrade <spec>` ngừng từ chối ba kênh mà nó hôm nay đẩy người dùng ra: một plugin cài từ git/URL/local, chạy `omp plugin upgrade <spec>` **được nâng tại chỗ theo nguồn đã ghim** thay vì in `Invalid plugin ID` rồi bảo người dùng tự xoá-cài-lại; và `omp plugin upgrade` nâng tất cả **không còn im lặng nuốt lỗi** — một plugin nâng hỏng được in ra tên và không được tính vào dòng thành công.

## 2. Bảng điểm sửa

| Đường/dẫn | Symbol | TRƯỚC (trích nguyên văn) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/cli/plugin-cli.ts:39` | `PluginAction` | `	\| "upgrade";` | giữ nguyên. `upgrade` **đã có**; không thêm action mới. Nếu thêm `update` thì đó là **alias**, và phải thêm vào `VALID_ACTIONS` (`plugin-cli.ts:73`) cùng một lần nữa — hai bảng phải khớp. |
| `packages/coding-agent/src/cli/plugin-cli.ts:317` | `handleUpgrade` | `	if (pluginId && !parsePluginId(pluginId)) {`<br>`		console.error(chalk.red(\`Invalid plugin ID: "${pluginId}". Marketplace plugins upgrade as "name@marketplace".\`));`<br>`		console.error(`<br>`			chalk.yellow(\`For an npm-installed plugin, upgrade with: ${APP_NAME} plugin install ${pluginId} --force\`),`<br>`		);`<br>`		process.exit(1);`<br>`	}` | Rẽ nhánh theo **channel** thay vì nhảy thẳng ra `exit(1)`. `parsePluginId` thành một trong ba: **marketplace** → `manager.upgradePlugin` như hiện tại; **npm** → `PluginManager` đường `--force` như hiện tại, **thêm** in dòng nói chỗ này là `reinstall`, không phải `upgrade`; **git / url / local** → đường mới ở `PluginManager.update()`. Cờ `pinned` được đọc **trước** khi gọi `update()`. |
| `packages/coding-agent/src/extensibility/plugins/manager.ts:447` | `PluginManager.install` | `	async install(specString: string, options: InstallOptions = {}): Promise<InstalledPlugin> {` | **không đổi dòng này.** Thân nó (snapshot `:333` → validate `:397` → catch/rollback `:672-687`) là transaction sẵn có, và `update()` mới phải **gọi lại nó**, không được viết lại. Nếu phải nhân bản snapshot/rollback, đó là dấu hiệu sai cấu trúc — dừng lại. |
| `packages/coding-agent/src/extensibility/plugins/manager.ts` (mới, cạnh `install` `:447`) | `PluginManager.update` | *(không có)* | Hàm mới. Thân gọi lại `install()` với spec đã resolve + `--force`, nên rollback của `install` áp dụng nguyên vẹn. Trả về kèm một mốc `pinnedSkipped: boolean` để lớp CLI in ra thay vì im lặng. Trả về `null` (không phải throw) khi spec có ref ⇒ caller biết đây là **bỏ qua có chủ ý**, không phải hỏng. |
| `packages/coding-agent/src/extensibility/plugins/git-url.ts:16` | `GitSource.pinned` | `	/** True if ref was specified (package won't be auto-updated) */`<br>`	pinned: boolean;` | **không sửa `git-url.ts`.** Chỉ **đọc** `source.pinned` ở nơi quyết định. Doc comment này hôm nay là **lời hứa không ai thực thi** (xem D3) — sau PR này nó mới thành đúng. Nếu cần sửa comment thì sửa **sau**, và phải kèm test chứng minh, không sửa comment không kèm test. |
| `packages/coding-agent/src/extensibility/plugins/marketplace/manager.ts:889-892` | `upgradeAllPlugins` | `			} catch {`<br>`				// Skip this entry; partial upgrades are better than none.`<br>`			}` | `catch (err)` ghi vào mảng thất bại đi cùng kết quả: `{ pluginId, scope, error }`. `handleUpgrade` (`plugin-cli.ts:344`) in mảng thất bại **sau** mảng thành công, và `process.exit(1)` nếu có. Đây là sửa DÒNG 2 — **không** sửa được bằng `check:ts`. |
| `packages/coding-agent/src/cli/plugin-cli.ts:344-352` | `handleUpgrade`, nhánh không có `pluginId` | `			const results = await manager.upgradeAllPlugins();`<br>`			if (results.length === 0) {`<br>`				console.log("All marketplace plugins are up to date.");` | In thêm khối thất bại. Khi **có** thất bại, dòng `"All … are up to date"` phải **không** được in, và exit code phải khác 0 — nếu không, lệnh vẫn nói dối. Đây là hợp đồng người dùng thấy, không phải chi tiết in ấn. |
| `packages/coding-agent/src/cli/cli-commands.ts:326-327` | bảng hint verb trần | `	upgrade:`<br>`	'\`omp upgrade\` is not a top-level command. Use \`omp plugin upgrade [name@marketplace]\` …'` | Nếu thêm alias `update`, thêm một hàng `update:` trỏ cùng chỗ. Bỏ trống thì `omp update` — và **cả `omp update the deps`** — rơi xuống `launch` như một prompt bình thường, đúng cái lỗi #4845 đã sửa cho `upgrade`. |

## 3. Các bước

Mỗi bước có neo đã mở và đọc ở phần 0 hoặc phần 2.

1. **Đóng ba câu hỏi "cần người quyết" bằng code đã có, đừng hỏi lại.** `--all` đã tồn tại (bước trần của `handleUpgrade` → `upgradeAllPlugins`, `plugin-cli.ts:344`). Chỉ còn **một** câu thật sự mở: **git/URL/local có vào phạm vi wave 9 không** — vì `npm` đã có đường `--force` và `marketplace` đã có `upgradePlugin`. Ghi câu trả lời vào `.lavish-wip/DECISION-*.md` **trước** khi mở file đầu tiên. *(neo: `plugin-cli.ts:344`)*

2. **Viết test đỏ trước, và bắt nó đỏ thật.** Dựng `test/plugin-update.test.ts`. Ba ca ở mục 4. Chạy. **Xác nhận đỏ** vì `PluginManager.update` chưa tồn tại. Một lần chạy xanh lúc này nghĩa là test vô nghĩa — dừng lại và viết lại test. *(neo: `manager.ts:447`)*

3. **Thêm `PluginManager.update()`, cơ thể gọi lại `install()`.** Đừng viết lại snapshot/rollback. `install()` đã có đủ: `#snapshotInstalledPackage` (`:333`), `#validateInstalledExtensions` (`:397`), `catch` → `#rollbackFailedInstall` (`:672-687`). Mới chỉ thêm: đọc `source.pinned` (đọc, **không sửa** `git-url.ts:16`) và trả `null` khi pinned. *(neo: `manager.ts:333`, `manager.ts:397`, `manager.ts:672-687`, `git-url.ts:16`)*

4. **Rẽ `handleUpgrade` theo channel.** `plugin-cli.ts:317`. Ba nhánh, mỗi nhánh một test. Nhánh marketplace giữ nguyên hành vi (đã có 62 test xanh — đừng phá). *(neo: `plugin-cli.ts:317`, `marketplace/manager.ts:812`)*

5. **Sửa `catch {}` ở `upgradeAllPlugins`.** Đây là DÒNG 2, và nó nằm trong code đã có chứ không phải code mới. `marketplace/manager.ts:889`. Bắt buộc kèm: test chứng minh exit code khác 0 và tên plugin hỏng xuất hiện trong output. *(neo: `marketplace/manager.ts:889`, `plugin-cli.ts:344`)*

6. **`CHANGELOG.md`, dưới `## [Unreleased]` (dòng 3).** Đây là hành vi người dùng thấy. Lưu ý `CHANGELOG.md:739` đã mô tả hành vi `plugin upgrade` hiện tại ở **section đã phát hành** (`18.2.2`) — **đừng sửa dòng đó**, thêm dòng mới. *(neo: `CHANGELOG.md:3`, `CHANGELOG.md:739`)*

## 4. Hợp đồng test

File mới: `packages/coding-agent/test/plugin-update.test.ts`.
Harness: theo đúng `packages/coding-agent/test/plugin-install-git.test.ts` — `vi.spyOn` sáu getter đường dẫn plugin trong `@oh-my-pi/pi-utils` trỏ vào cây tạm, `vi.spyOn(Bun, "spawn")` để mô phỏng side effect, `afterEach` gọi `vi.restoreAllMocks()`. **Không** dùng `mock.module()` (cấm theo AGENTS.md — rò `bun#12823`).

| # | Ca | Khẳng định | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| **1** | **DÒNG 1 — plugin git có ref không bao giờ nhảy version** | Cài `github:u/r#v1`, chạy update với ref đó vẫn còn ở đâu đó trên remote. Assert `update()` trả `{ pinnedSkipped: true }` **và** `Bun.spawn` **không** được gọi với `["bun","update", …]`. Phải assert **cả hai**: trả `null` mà vẫn spawn là trường hợp "báo là bỏ qua nhưng vẫn nâng" — tệ hơn cả im lặng. | Người dùng ghim `v1` để giữ một bản đã duyệt. Một lần `omp plugin upgrade` âm thầm kéo nhánh chính về → code đang chạy đổi mà không ai yêu cầu, và ref trong `package.json` nói dối vì họ vẫn tưởng mình đang ở `v1`. |
| **2** | **DÒNG 2 — tải hỏng giữa chừng không để lại trạng thái nửa vời** | Cho `Bun.spawn` của `bun install` trả exit 1. Assert `package.json` và `bun.lock` **bằng byte trước**, `node_modules/<name>` còn nguyên, `omp-plugins.lock.json` không đổi. | Registry vẫn trỏ vào một cây package đã bị xoá nửa chừng. Lần `plugin doctor` sau báo đẹp, lần `install` sau không biết đang sửa cái gì. |
| **3** | **Lỗi nâng-tất-cả không bị nuốt** | `upgradeAllPlugins` với một entry nâng hỏng: assert mảng kết quả **có mục thất bại mang tên plugin**, và lớp CLI **thoát với code ≠ 0** và **không** in `"All marketplace plugins are up to date."` | Im lặng là trường hợp nguy hiểm nhất: `catch {}` ở `manager.ts:891` khiến lệnh in ra danh sách trông như thành công toàn bộ. Người dùng tin cả ba plugin đã nâng; một cái vẫn là bản cũ. Đây là hồi quy **đã tồn tại trên HEAD**, không phải hồi quy do PR này gây ra. |

Không thêm ca nào khác. Ba ca trên là ba bất biến của mục; ca thứ tư trở đi là "test bao nhiêu thì đủ", và AGENTS.md cấm đúng loại đó.

## 5. Cổng

Bốn phần như mục gốc, nhưng **viết lại phần 2 và 3 vì chúng không đỏ được**. Trả lời thẳng câu hỏi của mục — *cổng này có ĐỎ ĐƯỢC không, bằng cách nào*:

**(1) HAI BẤT BIẾN BẢO MẬT.**
- **ĐỎ ĐƯỢC — bằng test ca 1 và ca 2.** Cả hai nằm trong `bun test packages/coding-agent/test/plugin-update.test.ts`.
- *Bẫy:* vì `pinned` hôm nay là field chết (D3), một implementation **không hề đọc** `pinned` vẫn làm test 1 xanh nếu test chỉ assert "version không đổi". Test 1 phải spy `Bun.spawn` và assert **không có** lời gọi `bun update` — đó mới là thứ đỏ khi ai đó bỏ `if (source.pinned) return null`.

**(2) MỘT NAMESPACE.**
- **KHÔNG ĐỎ ĐƯỢC. Không có cách nào làm nó đỏ.** `check:ts` không bắt được "bạn ghi bằng đường khác"; nó chỉ bắt được kiểu. Tách `PluginManager` (`manager.ts`) và `MarketplaceManager` (`marketplace/manager.ts`) là **hai substrate khác nhau** ngay từ trước WI-8a — WI-8a dựng namespace *bên trong* registry setting, không phải bên trong installer.
- **Viết lại để đỏ được:** thay "một namespace" bằng một khẳng định có thể kiểm. Đường mới **phải** đi qua `PluginManager.install()` (`manager.ts:447`) — vì đó là nơi duy nhất có snapshot/rollback. Khẳng định đỏ được: nếu ai đó gọi `Bun.spawn(["bun","install",…])` từ chỗ khác, test sẽ thấy snapshot không được tạo. Cụ thể: trong ca 2, assert `#snapshotInstalledPackage` có hiệu ứng quan sát được (byte `bun.lock` được khôi phục) — nếu ai đó lách vòng `install()`, dòng đó xanh-mà-vô-nghĩa… **trừ khi** ta khẳng định luôn `Bun.spawn` chỉ được gọi từ dưới `manager.ts:447`.

**(3) THỨ TỰ — GAP-M6-15 merge trước.**
- **KHÔNG ĐỎ ĐƯỢC bằng cổng tự động, nhưng đỏ được bằng một kiểm tra thủ công có ghi vào PR.** Chạy:
  ```bash
  rg -n 'sourcePin|assertPinnedSource' packages/coding-agent/src   # hôm nay: 0 hit
  ```
  Merge PR này khi lệnh đó **còn 0 hit** ⇒ thứ tự bị vi phạm. Ghi kết quả vào mô tả PR. Đây là cổng **có thể đỏ** bằng cách con người đọc; nó không tự đỏ, và nói thẳng như vậy còn hơn giả vờ.

**(4) `check:ts` exit 0.**
- **ĐỎ ĐƯỢC, nhưng yếu.** Đã chạy trên HEAD: `bun run check:ts` → `[exited with code 0]`. Nó đỏ được **chỉ** khi có lỗi kiểu. Một `update()` ghi sai registry vẫn xanh. Giữ nó ở cổng, đừng để nó đứng một mình.

**Hạ tầng trên máy này (D5):** `bun test` chạy được — 62 pass / 0 fail trên `marketplace/manager.test.ts`. `check:ts` exit 0. **Không** có blocker. Câu "bị chặn cho tới khi có native addon" trong mục là **sai trên máy này**; nếu gặp lỗi addon thì `bun --cwd=packages/natives run build`, nhưng **đừng dùng nó làm lý do bỏ qua test đỏ**.

## 6. Cạm bẫy riêng của work item này

1. **Cái bẫy lớn nhất: tin cái grep 0 hit.** Mẫu `updateExtension|updatePlugin` là false-negative — tên thật là `upgrade*`. Người gõ PR theo mục này sẽ mở `plugin-cli.ts`, thấy `upgrade` đã có ở dòng 39/73/189/311, và phải đi tìm xem mình đang sửa cái gì. Việc này tốn nửa ngày nếu không được nói trước. Nếu một ai đó "xác nhận lại" bằng **đúng cái grep cũ**, họ sẽ kết luận sai lần thứ hai.

2. **Cái bẫy thứ hai: coi DÒNG 1 là miễn phí vì `pinned` không có consumer.** `git-url.ts:16` không ai đọc ⇒ invariant "pinned không nhảy version" **đang đúng một cách ngẫu nhiên**. Một PR thêm `update()` mà chỉ phủ marketplace sẽ **xanh** mà không đụng tới `pinned` lần nào. Test ca 1 phải **ép** đường git đi qua, nếu không nó không chứng minh gì.

3. **Cái bẫy thứ ba: tưởng `install()` là một khối nguyên.** Nó không phải. Nó dài ~245 dòng, có **hai** chỗ rollback (`install` ở `:672`, `#reconcileVersionDrift` ở `:1181`) và một nhánh git-riêng (`bun update` ở `:591-610`) chỉ chạy khi `gitSource && existingActualName`. Viết `update()` bằng cách gọi lại `install()` là đúng. Nhân bản vì "sợ đụng" là sai và tạo hai transaction song song.

4. **Cái bẫy thứ tư — nguy hiểm nhất về mặt im lặng: `catch {}` ở `manager.ts:891`.** Nó **trông** như "xử lý lỗi mềm" và review sẽ lướt qua. Thực tế nó là DÒNG 2 bị vi phạm, trên đúng cây code mà mục này định sửa. Người viết PR dễ chỉ tập trung vào đường git mới và **quên dọn chỗ này** — rồi mục lên tiếng "đã bảo đảm transaction" trong khi `omp plugin upgrade` vẫn in ra danh sách toàn-tim mà một phần hỏng.

5. **Cái bẫy thứ năm: `--all` là câu hỏi đã có đáp án.** Đừng mở một quyết định người dùng cho thứ mà `plugin-cli.ts:344` đã trả lời. Tệ hơn: nếu thêm alias `update`, mà quên `cli-commands.ts` (verb trần), thì `omp update the deps` sẽ chạy thành một phiên agent với prompt là "the deps" — đúng lỗi #4845 đã sửa cho `upgrade`.

6. **Cái bẫy thứ sáu: dùng `bun test` đỏ vì thiếu addon làm lý do.** Trên máy này addon đã build, 62/62 xanh. Một lần đỏ giả ở đây không chứng minh gì và — theo chính bảng rủi ro chung của M2 — là cách sai kinh điển làm mất một bản sửa thật.

---

## Phụ lục — câu hỏi "cần người quyết" của mục, đã đối chiếu lại

| Câu hỏi trong mục | Trạng thái sau khi kiểm |
| --- | --- |
| Effort S hay M (có phải xử lý version-migration + rollback không)? | **S.** Rollback đã có (`manager.ts:333`/`:364`/`:672-687`), transaction tài liệu hoá ở `docs/plugin-manager-installer-plumbing.md:121`. Chỉ lên **M** nếu người quyết mở rộng phạm vi sang git/URL/local — mà đó mới là câu hỏi thật. |
| `update` có hỏi xác nhận trước khi ghi đè package đang chạy không? | **Còn mở, và là câu hỏi đáng hỏi nhất.** Lưu ý khi hỏi: `omp plugin upgrade` **đã tồn tại và đã không hỏi** (`marketplace/manager.ts:812` gọi thẳng `installPlugin(..., { force: true })`). Nếu trả lời "có hỏi" thì phải hỏi cho **cả hai** đường, không chỉ đường mới — nếu không thì đường cũ thành đường lách. |
| Cần `--all` không? | **ĐÓNG.** `omp plugin upgrade` trần **đã là** nâng-tất-cả (`plugin-cli.ts:344` → `upgradeAllPlugins`). |
