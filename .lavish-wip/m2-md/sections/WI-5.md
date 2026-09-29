## WI-5. Capability registry có chủ sở hữu, có unregister, và có một reset thật sự

**Thay đổi gì:** Đổi tên `reset` của capability registry thành `invalidateAllCaches` trung thực, thêm một `resetRegistry()` riêng biệt thực sự xoá các định nghĩa capability, rồi tra cho các provider đã đăng ký một `sourceId` chủ sở hữu cùng một `unregisterProvidersForSource()` để đóng góp của một extension bị suspend thực sự được giải phóng. **Wave:** trải trên hai wave: commit 1 ở wave 3 (không điều kiện), commits 2-3 ở wave 4 (phụ thuộc M2-OQ2 từ wave 1). **Effort:** S cho commit 1, M cho commits 2-3. Ba commit, ba PR. Commit 1 là việc cơ học (8 dòng import, 12 call site, 1 comment) nhưng type checker sẽ liệt kê giúp bạn mọi lời gọi. Commits 2-3 là khoảng 40 dòng code registry mới cộng một dòng trong hot path.

**Người dùng thấy:** Commit 1 vô hình nhưng chặn một quả bom hẹn giờ: mọi người đọc capability registry từ nay được cho biết `reset` thực sự làm gì. Commits 2-3 KHÔNG phải hành vi nhìn thấy được: sau khi ship, tắt một extension trong settings sẽ GỌI teardown các capability provider của nó — nhưng vì chưa có call site nào đăng ký provider kèm `sourceId`, lời gọi đó hôm nay luôn trượt và không giải phóng gì cả. Người dùng sẽ không thấy khác biệt nào; extension bị vô hiệu hoá vẫn giữ nguyên đóng góp. Đây là nền cho WI-10, và mô tả PR không được hứa hành vi.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `packages/coding-agent/src/capability/index.ts` | sửa | COMMIT 1: đổi tên `export function reset()` ở :554-556 thành `invalidateAllCaches()`; thêm `export function resetRegistry(): void` chỉ xoá map `capabilities`. COMMIT 2: thêm hai Map ở cấp module cạnh ba Map sẵn có ở :34/:37/:40 — `const providersBySource = new Map<string, Set<string>>()` và `const providerSourceByName = new Map<string, string>()`; thêm tham số thứ ba tuỳ chọn `sourceId?: string` vào `registerProvider<T>` ở :101, ghi lại attribution và đuổi chủ sở hữu cũ (mirror `model-registry.ts:3011-3019`). COMMIT 3: thêm `export function unregisterProvidersForSource(sourceId: string): void` tra danh sách providerId của source, splice từng cái ra khỏi mảng `providers` của capability tương ứng, dọn `providerCapabilities`, và xoá cả hai entry attribution. | có (verified=true) |
| `packages/coding-agent/src/main.ts` | sửa | COMMIT 1: dòng import :24 thành `import { invalidateAllCaches } from "./capability";` (bỏ alias `as resetCapabilities`); call site :872 thành `invalidateAllCaches();`. Đây là đường resume-with-chdir — chạy ngay sau `clearPluginRootsAndCaches()` và trước khi preload lại ở đích. | có |
| `packages/coding-agent/src/sdk.ts` | sửa | COMMIT 1: dòng import :51 thành `import { invalidateAllCaches, loadCapability } from "./capability";`; call site :4571 (trong `reconcileExtensionSources`) thành `invalidateAllCaches();`; comment giải thích ở :3528 được viết lại để nêu tên hàm mới. COMMIT 3: trong cùng `reconcileExtensionSources`, ngay sau `const { suspended, resumed } = extensionRunner.setSuspendedExtensions(...)` mở ở :4579 (đóng ở :4581), thêm `for (const extension of suspended) unregisterProvidersForSource(extension.path);` — MỞ RỘNG nhánh suspend của WI-1 nếu nó đã tồn tại, đừng tạo lại. | có |
| `packages/coding-agent/src/session/agent-session.ts` | sửa | COMMIT 1: dòng import :112 thành `import { invalidateAllCaches } from "../capability";`; cả ba call site — :5435 (ranh giới `/clear`, ngay sau `appendResetBoundary()`), :5820, :8811 — thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/session/session-tools.ts` | sửa | COMMIT 1: dòng import :6 thành `import { invalidateAllCaches } from "../capability";`; call site :1651 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/modes/controllers/ssh-command-controller.ts` | sửa | COMMIT 1: dòng import :7 thành `import { invalidateAllCaches } from "../../capability";`; cả hai call site :208 và :369 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/modes/controllers/selector-controller.ts` | sửa | COMMIT 1: dòng import :25 thành `import { invalidateAllCaches } from "../../capability";`; call site :310 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/slash-commands/builtin-marketplace.ts` | sửa | COMMIT 1: dòng import :1 thành `import { invalidateAllCaches } from "../capability";`; call site :36 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/src/slash-commands/helpers/ssh.ts` | sửa | COMMIT 1: dòng import :2 thành `import { invalidateAllCaches } from "../../capability";`; cả hai call site :146 và :167 thành `invalidateAllCaches();`. | có |
| `packages/coding-agent/test/capability/reset-contract.test.ts` | tạo | MỚI, commit 1. Đúng hai khối `test()`, theo thứ tự này. Row 1 (hợp đồng âm; đỏ trên HEAD vì import, xanh ngay sau commit 1): sau `invalidateAllCaches()`, `getCapability(<module-level id>)` vẫn trả về capability — chọn một cái thật bằng cách import module định nghĩa, ví dụ `import { toolCapability } from "@oh-my-pi/pi-coding-agent/capability/tool"`, để `defineCapability` ở cấp module tại `capability/tool.ts:27` thực sự đã chạy. Row 2 (bản sửa có thể bị từ chối, đỏ trên HEAD vì `resetRegistry` chưa tồn tại — cùng lý do đỏ ở dòng import, không phải ở assertion): sau `resetRegistry()`, `getCapability(same id)` là `undefined`. | có |
| `packages/coding-agent/test/capability/provider-source-attribution.test.ts` | tạo | MỚI, commits 2-3. Ba khối `test()`. (a) một provider đăng ký kèm `sourceId` biến mất khỏi danh sách ĐÃ PHÂN GIẢI sau `unregisterProvidersForSource(sourceId)` — đọc danh sách đã phân giải qua `getCapabilityInfo(capabilityId)?.providers`, không đọc map nội bộ, vì đó mới là thứ discovery và settings UI thực sự đọc. (b) hai source đăng ký provider cho cùng một capability; suspend một cái thì provider của source kia vẫn còn trong danh sách đã phân giải — row hợp đồng âm chứng minh attribution là thật và rằng `unregisterProvidersForSource` không xoá quá tay. (c) `resetRegistry()` không đụng tới attribution sẵn có: sau đó, provider từ hai sourceId khác nhau đều vẫn còn trong danh sách đã phân giải. | có |

Ghi chú đã kiểm chứng kèm theo từng file: `capability/index.ts` dài 588 dòng, các neo đã xác nhận là Maps ở :34/:37/:40, hai mutable Set ở :43/:44, `defineCapability` :89, `registerProvider` :101, `getCapability` :459, `reset` :554-556, `resetCapabilityForTests` :561-566, `invalidate` :572; khoảng plan trích :30-41 và :99-127 lệch vài dòng và :30-41 bỏ sót hai Set. `main.ts`: plan nói :871, thực tế là :872 ở HEAD 808b365. `sdk.ts`: plan nói :4565 cho call và :4560-4624 cho hàm; thực tế là :4571 và hàm mở ở :4566; `setSuspendedExtensions` trả về `{ suspended: Extension[]; resumed: Extension[] }` và `Extension.path` chính là id mà model registry đã dùng làm sourceId (`loader.ts:363`). `agent-session.ts`: plan nói :5405/:5790/:8779, cả ba đã trôi; cái :5435 xác nhận là đường `/clear`. `session-tools.ts`: plan nói :1557, thực tế :1651. Hai file còn lại (`ssh-command-controller.ts`, `selector-controller.ts`, `builtin-marketplace.ts`, `helpers/ssh.ts`) khớp chính xác với plan. Thư mục `packages/coding-agent/test/capability/` đã tồn tại và chứa 3 test (fs-special-files, rule-agents, rule-buckets); `getCapabilityInfo` ở `capability/index.ts:473` trả về `{ id, displayName, description, providers: [{id, displayName, description, priority, enabled}] }` — chính mảng đã phân giải đó là bề mặt quan sát được.

### Các bước

1. Xác nhận trạng thái cây mà bạn bắt đầu: `git -C /Users/tranquangdang21/Projects/ultraworkers rev-parse --short HEAD` và `git -C /Users/tranquangdang21/Projects/ultraworkers branch --show-current`. Rồi chạy `git -C /Users/tranquangdang21/Projects/ultraworkers grep -n 'reset as resetCapabilities' -- packages/coding-agent/src` và `git -C /Users/tranquangdang21/Projects/ultraworkers grep -n 'resetCapabilities()' -- packages/coding-agent/src`. Bạn phải thấy 8 dòng import và 12 call site. Hai lệnh grep đó — không phải số dòng trong đặc tả này — mới là chuẩn; nhiều neo trong plan nguồn đã trôi sau khi HEAD dời tới 808b365. (anchor: repo root)

2. COMMIT 1 — chọn tên trước và viết nó vào mô tả PR trước khi đụng vào code. Dùng `invalidateAllCaches` trừ khi bạn có lý do tốt hơn. Mở `packages/coding-agent/src/capability/index.ts`, tới dòng 554, đổi export từ `export function reset(): void { clearFsCache(); }` thành `export function invalidateAllCaches(): void { clearFsCache(); }`, sửa doc comment phía trên để nói rằng nó xoá cache discovery trên filesystem sau một lần chdir hoặc thay đổi filesystem — và nói rõ KHÔNG phải registry. Để nguyên `resetCapabilityForTests` ở :561; đó là hàm khác, việc khác. (anchor: `packages/coding-agent/src/capability/index.ts:554`)

3. Vẫn commit 1: thêm `resetRegistry()` ngay sau `invalidateAllCaches` trong cùng phần Cache Management. Nó chỉ xoá map định nghĩa và không gì khác — không mảng provider, không `providerCapabilities`, không `providerMeta`, không fs cache, và (từ commit 2) không map attribution. Doc comment của nó phải nói rằng nó dành cho test và đường reload extension tương lai, rằng không call site sống nào gọi nó, và rằng gọi nó sẽ làm mất các định nghĩa capability ở cấp module cho suốt phần đời còn lại của process vì ESM đánh giá mỗi module định nghĩa đúng một lần. Câu cuối đó là toàn bộ lý do hàm này nguy hiểm và nó phải nằm trong code, không chỉ trong đặc tả này. (anchor: `packages/coding-agent/src/capability/index.ts:557`)

4. COMMIT 1 — cập nhật cả 8 dòng import. Với từng file main.ts:24, sdk.ts:51, session/agent-session.ts:112, session/session-tools.ts:6, modes/controllers/selector-controller.ts:25, modes/controllers/ssh-command-controller.ts:7, slash-commands/builtin-marketplace.ts:1, slash-commands/helpers/ssh.ts:2 — thay `import { reset as resetCapabilities } from "...capability"` bằng `import { invalidateAllCaches } from "...capability"`, bỏ hẳn alias `as resetCapabilities`. Với sdk.ts:51 giữ luôn `loadCapability` trong cùng câu lệnh. Đừng giữ alias: alias là nửa sau của lời nói dối, giữ nó nghĩa là người đọc kế tiếp vẫn tin rằng reconcile loop giải phóng capability. (anchor: `packages/coding-agent/src/main.ts:24 (and 7 siblings)`)

5. COMMIT 1 — cập nhật cả 12 call site thành `invalidateAllCaches();` — main.ts:872, sdk.ts:4571, session/agent-session.ts:5435/:5820/:8811, session/session-tools.ts:1651, modes/controllers/selector-controller.ts:310, modes/controllers/ssh-command-controller.ts:208/:369, slash-commands/builtin-marketplace.ts:36, slash-commands/helpers/ssh.ts:146/:167. Rồi viết lại comment ở sdk.ts:3528 hiện đang ghi 'resetCapabilities() clears the fs cache at those boundaries' để dùng tên mới. Một call site bị sót không phải là bug âm thầm — nó là lỗi kiểu, và đó là lý do commit này rẻ. Chạy `git grep -n resetCapabilities -- packages/coding-agent/src` sau đó và xác nhận bạn nhận được 0 kết quả. (anchor: `packages/coding-agent/src/sdk.ts:4571`)

6. COMMIT 1 — viết `packages/coding-agent/test/capability/reset-contract.test.ts` với đúng hai test theo thứ tự này. Row 1 khẳng định hợp đồng âm: gọi `invalidateAllCaches()`, rồi khẳng định `getCapability(toolCapability.id)` vẫn defined. Import `toolCapability` từ `@oh-my-pi/pi-coding-agent/capability/tool` để `defineCapability` ở cấp module tại `capability/tool.ts:27` đã chạy. Row này đỏ trên HEAD chỉ vì dòng import (xanh ngay sau commit 1), và từ đó trở đi nó đỏ ngay khi có ai thêm `capabilities.clear()` vào hàm vừa đổi tên — đó là toàn bộ công việc của nó. Row 2 khẳng định hợp đồng mới: gọi `resetRegistry()`, rồi khẳng định `getCapability(toolCapability.id)` là `undefined`. Row này đỏ trên HEAD vì hàm chưa tồn tại (xem cổng (2): trên HEAD cả file đỏ ở dòng import, chưa chạy tới assertion nào). Đừng đảo thứ tự; trong cùng một file trạng thái module là dùng chung, nên chạy row 1 sau row 2 sẽ làm nó đỏ sai lệch. (anchor: `packages/coding-agent/test/capability/reset-contract.test.ts`)

7. Cổng của commit 1: `cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts` rồi `cd packages/coding-agent && bun test test/capability/reset-contract.test.ts`. ĐÃ ĐO, test SẼ đỏ vì 'Failed to load pi_natives native addon', và nguyên nhân là import LAN TRUYỀN chứ không phải addon-trực-tiếp: `capability/index.ts:11` import `@oh-my-pi/pi-utils` (package đó tự fail với chính lỗi này), còn `:26`/`:27` import `../extensibility/settings` và `../config/model-settings` (cũng fail). Chỉ `capability/fs.ts` là sạch. Hãy ghi thẳng vào PR rằng test chưa chạy, đừng suy từ việc `capability/index.ts` tự nó không import `@oh-my-pi/pi-natives` để kết luận test mới thoát được; build trước bằng `bun --cwd=packages/natives run build`. Ship commit 1 thành PR riêng. (anchor: repo root)

8. TRƯỚC khi bắt đầu commits 2-3, xác nhận M2-OQ2 đã được WI-0 trả lời và câu trả lời là 'the capability registry becomes extension-reachable' (YES). Nếu câu trả lời là NO, đừng dựng map attribution — chúng sẽ là gánh nặng chết vĩnh viễn. Đồng thời kiểm tra lại xem WI-1 commit 1 đã hạ nhánh teardown có gắn owner trong suspend branch của `reconcileExtensionSources` chưa; nếu có rồi thì mở rộng nhánh đó, đừng viết nhánh thứ hai. (anchor: `packages/coding-agent/src/sdk.ts:4579`)

9. COMMIT 2 — thêm hai map attribution vào phần Registry State của `capability/index.ts`, ngay sau ba map sẵn có ở :34/:37/:40 và trước hai mutable Set ở :43/:44. Đặt tên và kiểu đúng y như ModelRegistry: `const providersBySource = new Map<string, Set<string>>()` và `const providerSourceByName = new Map<string, string>()`. Cho cả hai một doc comment trỏ tới `config/model-registry.ts:303-304` làm hình dạng được mirror, để người đọc kế tiếp biết đây là tái sử dụng có chủ đích chứ không phải một phát minh thứ hai. (anchor: `packages/coding-agent/src/capability/index.ts:40`)

10. COMMIT 2 — mở rộng chữ ký thành `registerProvider<T>(capabilityId: string, provider: Provider<T>, sourceId?: string)`. Khi có `sourceId`: thêm providerId vào set của source đó trong `providersBySource` (tạo set nếu chưa có) và đặt `providerSourceByName` trỏ tới source đó. Trước khi chiếm quyền sở hữu, hãy đuổi chủ cũ — đọc `providerSourceByName.get(provider.id)`, và nếu nó nêu một source khác thì xoá providerId khỏi set của source cũ đó và xoá entry ngược. Đây là bản port trực tiếp từ `model-registry.ts:3011-3019`. Khi bỏ trống `sourceId` (cả 84 call site hiện có), không chiếm attribution và không đuổi ai. Đặt cả hai quy tắc vào doc comment. (anchor: `packages/coding-agent/src/capability/index.ts:101`)

11. COMMIT 3 — thêm `export function unregisterProvidersForSource(sourceId: string): void` cạnh các hàm quản lý cache/registry khác. Thân hàm: tra set trong `providersBySource`; nếu vắng hoặc rỗng thì return ngay. Nếu không, với mỗi providerId, suy ra capability id của nó từ `providerCapabilities` và splice provider ra khỏi mảng `providers` của capability đó; sau vòng lặp, provider đó không còn gắn với capability nào (guard ở trên đã bỏ qua provider bị source khác sở hữu), nên xoá HẲN entry `providerCapabilities` và `providerMeta` của nó — hai entry này luôn đi cùng nhau trong vòng lặp này. Cuối cùng xoá entry `providersBySource` và mọi entry `providerSourceByName` mà source này sở hữu. Chặn toàn bộ phần này để một providerId còn thuộc về source KHÁC không bao giờ bị xoá — cái chặn đó chính là thứ test row (b) tồn tại để bắt. (anchor: `packages/coding-agent/src/capability/index.ts:566`)

12. COMMIT 3 — nối vào hot path. Trong `reconcileExtensionSources` ở sdk.ts, ngay sau `const { suspended, resumed } = extensionRunner.setSuspendedExtensions(...)` mở ở :4579 (đóng ở :4581), thêm một vòng lặp gọi `unregisterProvidersForSource(extension.path)` cho mỗi extension bị suspend. Dùng `extension.path`, không dùng `extension.resolvedPath` — `path` là id mà model registry đã dùng làm sourceId (`loader.ts:363`). Nếu WI-1 đã thêm một lời gọi teardown trong nhánh này, hãy đặt lời gọi của bạn cạnh nó thay vì tạo vòng lặp thứ hai. Viết một comment nói thẳng rằng hiện tại điều này là inert vì không có gì đăng ký capability provider kèm sourceId, và rằng nó tồn tại để mở đường seam cho WI-10. (anchor: `packages/coding-agent/src/sdk.ts:4579`)

13. COMMITS 2-3 — viết `packages/coding-agent/test/capability/provider-source-attribution.test.ts` với ba test. Đăng ký provider dùng nhỡ trực tiếp qua registry API với provider id khác nhau và sourceId khác nhau, và khẳng định trên danh sách ĐÃ PHÂN GIẢI từ `getCapabilityInfo(capabilityId)?.providers` — không bao giờ khẳng định trên map nội bộ, vì danh sách đã phân giải mới là thứ discovery và settings UI đọc. Row (a): provider thuộc một source biến mất khỏi danh sách đã phân giải sau `unregisterProvidersForSource`. Row (b): với hai source trên cùng một capability, suspend một cái thì provider của source kia vẫn còn. Row (c): sau `resetRegistry()`, provider từ hai sourceId khác nhau đều vẫn còn. Sắp thứ tự file sao cho row `resetRegistry()` không chạy trước (a) và (b). Dùng một capability id ở cấp module có thật từ `capability/tool.ts` để định nghĩa tồn tại. (anchor: `packages/coding-agent/test/capability/provider-source-attribution.test.ts`)

14. Cổng của commits 2-3: `cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts` rồi `cd packages/coding-agent && bun test test/capability/reset-contract.test.ts test/capability/provider-source-attribution.test.ts`. Sau đó chạy toàn bộ suite của coding-agent để chứng minh `resetRegistry()` trong một file không đầu độc file khác — đây là rủi ro thật mà plan nguồn không hề nhắc, và dù `bun test` đã được xác minh là cô lập theo file, toàn suite mới là bằng chứng. Cuối cùng `bun run check:tools` (oxlint + oxfmt), vốn `check:ts` đã gọi. (anchor: repo root)

### Hình dạng code

```typescript
// packages/coding-agent/src/capability/index.ts — Registry State section,
// immediately after the existing three Maps at :34/:37/:40.

/**
 * Providers registered by an owning source, mirroring ModelRegistry's
 * `#runtimeProvidersBySource` (config/model-registry.ts:303). Keyed by sourceId.
 */
const providersBySource = new Map<string, Set<string>>();

/**
 * Reverse index: provider ID -> owning sourceId, mirroring ModelRegistry's
 * `#runtimeProviderSourceByName` (config/model-registry.ts:304). At most one
 * owner per provider ID; a later registration evicts the previous owner.
 */
const providerSourceByName = new Map<string, string>();

// ---- registerProvider, signature change at :101 ----

export function registerProvider<T>(capabilityId: string, provider: Provider<T>, sourceId?: string): void {
	const capability = capabilities.get(capabilityId);
	if (!capability) {
		throw new Error(`Unknown capability: "${capabilityId}". Define it first with defineCapability().`);
	}

	if (!providerMeta.has(provider.id)) {
		providerMeta.set(provider.id, { displayName: provider.displayName, description: provider.description });
	}
	if (!providerCapabilities.has(provider.id)) {
		providerCapabilities.set(provider.id, new Set());
	}
	providerCapabilities.get(provider.id)!.add(capabilityId);

	// Attribution: only claimed when a sourceId is supplied. A source-less
	// registration never claims and never evicts — all 84 existing call sites are
	// source-less module-level registrations. Eviction ports ModelRegistry
	// (config/model-registry.ts:3011-3019): one owner per provider ID, last wins.
	if (sourceId !== undefined) {
		const previousSourceId = providerSourceByName.get(provider.id);
		if (previousSourceId !== undefined && previousSourceId !== sourceId) {
			const previousProviders = providersBySource.get(previousSourceId);
			previousProviders?.delete(provider.id);
			if (previousProviders && previousProviders.size === 0) {
				providersBySource.delete(previousSourceId);
			}
		}
		const sourceProviders = providersBySource.get(sourceId) ?? new Set<string>();
		sourceProviders.add(provider.id);
		providersBySource.set(sourceId, sourceProviders);
		providerSourceByName.set(provider.id, sourceId);
	}

	const providers = capability.providers as Provider<T>[];
	const idx = providers.findIndex(p => p.priority < provider.priority);
	if (idx === -1) providers.push(provider);
	else providers.splice(idx, 0, provider);
}

// ---- new teardown, next to the cache management section ----

/**
 * Remove every provider registered by `sourceId`.
 *
 * Contract: a provider ID has at most one owning source at a time. A provider
 * whose current owner is a different source is never removed. Safe to call for
 * an unknown or already-removed sourceId.
 */
export function unregisterProvidersForSource(sourceId: string): void {
	const sourceProviders = providersBySource.get(sourceId);
	if (!sourceProviders || sourceProviders.size === 0) return;

	for (const providerId of [...sourceProviders]) {
		if (providerSourceByName.get(providerId) !== sourceId) continue; // re-owned elsewhere

		for (const capabilityId of providerCapabilities.get(providerId) ?? []) {
			const capability = capabilities.get(capabilityId);
			if (!capability) continue;
			const providers = capability.providers as Provider<unknown>[];
			const idx = providers.findIndex(p => p.id === providerId);
			if (idx !== -1) providers.splice(idx, 1);
		}

		providerCapabilities.delete(providerId);
		providerMeta.delete(providerId);
		providerSourceByName.delete(providerId);
	}

	providersBySource.delete(sourceId);
}

// ---- COMMIT 1, the rename at :554 and the new function beside it ----

/**
 * Clear the filesystem discovery cache. Call after a chdir or filesystem change.
 *
 * This does NOT clear the capability registry: capability definitions and
 * registered providers survive. Use {@link resetRegistry} for the registry.
 */
export function invalidateAllCaches(): void {
	clearFsCache();
}

/**
 * Drop every registered capability definition. Tests and future extension
 * reload only — no live call site invokes this.
 *
 * DESTRUCTIVE: all 14 `defineCapability` calls are module-level `export const`
 * bindings and ESM evaluates each module exactly once, so no later import
 * re-runs them. After this call, `getCapability` returns undefined and
 * `loadCapability` throws for every capability for the rest of the process.
 *
 * Deliberately narrow: it touches `capabilities` and nothing else. Registered
 * providers and their source attribution survive (see provider-source-
 * attribution.test.ts row 3).
 */
export function resetRegistry(): void {
	capabilities.clear();
}
```

### Hợp đồng test

Bộ test bảo vệ một điều: các hàm vòng đời được export từ capability registry phải làm đúng điều tên chúng nói, và việc teardown provider phải được giới hạn đúng vào một chủ sở hữu.

Row 1 của `reset-contract.test.ts` bảo vệ một HỢP ĐỒNG ÂM và là thứ duy nhất đứng giữa plan với lựa chọn bị cấm duy nhất. Nếu nó hồi quy, ai đó đã làm cho hàm vô hiệu hoá fs-cache xoá luôn map capability — và hậu quả quan sát được là `/clear`, resume-with-chdir, các lần chuyển phiên ssh và vòng lặp reconcile extension đều âm thầm ngừng phân giải được cả 14 capability cho suốt phần đời còn lại của process, không có stack trace nào, vì ESM sẽ không đánh giá lại các lời gọi `defineCapability` ở cấp module. Người tiêu dùng thấy prompts, rules, hooks, slash commands, skills và tools lặng lẽ biến mất và không bao giờ quay lại.

Row 2 bảo vệ hợp đồng hướng tới: `resetRegistry()` phải thật sự bỏ các định nghĩa. Đó là row đỏ trên HEAD, vì hàm chưa tồn tại — nhưng lưu ý trên HEAD cả FILE đỏ ở dòng import chứ không phải ở assertion này (xem cổng (2)). Nó là phần có thể bị từ chối của bản sửa, và chính nó làm cho việc khoá ràng buộc "tên khớp hành vi" trở thành thứ bắt buộc chứ không chỉ là điều mong muốn.

Row (a) của `provider-source-attribution.test.ts` bảo vệ hợp đồng discovery: sau khi một source bị teardown, các provider của nó phải vắng mặt khỏi danh sách ĐÃ PHÂN GIẢI (`getCapabilityInfo(id).providers`) — mảng mà settings UI và discovery thực sự đọc. Nếu hồi quy, người tiêu dùng thấy đóng góp của một extension bị suspend vẫn lưu lại trong capability set thay vì biến mất. Nếu khẳng định vào map nội bộ thay vì, test sẽ xanh trong khi danh sách đã phân giải vẫn cũ — đó chính là toàn bộ failure mode.

Row (b) bảo vệ hợp đồng âm cho phạm vi teardown: hai source trên một capability, một cái bị teardown, provider của source kia phải sống sót. Nếu hồi quy, `unregisterProvidersForSource` xoá quá tay và việc tắt một extension sẽ lặng lẽ cởi bỏ đóng góp của một extension khác. Đây là row chứng minh attribution là thật chứ không phải một trường hợp đặc biệt đơn-chủ-sở-hữu.

Row (c) bảo vệ hợp đồng xuyên commit: hai commit không làm hỏng lẫn nhau. `resetRegistry()` không được làm xáo động attribution, để một bộ test gọi nó vẫn thấy các provider thuộc source sau đó. Nếu hồi quy, commit 1 lặng lẽ phá vỡ đường dọn dẹp của commit 2.

Điều người tiêu dùng thấy nếu bất kỳ điều nào trên đây hỏng là một capability registry hoặc rò rỉ mãi mãi provider của mọi extension bị suspend (trạng thái hiện tại ở HEAD), hoặc trong biến thể bị cấm, làm rơi mất mọi capability trong process. Cả hai đều im lặng; không cái nào ném exception.

Hai file test: `packages/coding-agent/test/capability/reset-contract.test.ts` và `packages/coding-agent/test/capability/provider-source-attribution.test.ts`.

### Xác minh

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test test/capability/reset-contract.test.ts test/capability/provider-source-attribution.test.ts
cd /Users/tranquangdang21/Projects/ultraworkers/packages/coding-agent && bun test   # full suite: prove resetRegistry() in one file poisons no other
git -C /Users/tranquangdang21/Projects/ultraworkers grep -n resetCapabilities -- packages/coding-agent/src   # must return zero hits after commit 1
```

### Cổng hoàn thành

Ba cổng, theo thứ tự.

(1) Sau commit 1: `bun run check:ts` xanh VÀ `git grep -n resetCapabilities -- packages/coding-agent/src` trả về 0 kết quả. Type checker chính là thứ làm cho việc đổi tên an toàn — một call site bị sót là lỗi compile, không phải thay đổi hành vi im lặng, và đó là lý do commit 1 là S chứ không phải M.

(2) Trên HEAD, `reset-contract.test.ts` đỏ ở DÒNG IMPORT chứ không phải ở assertion: cả `invalidateAllCaches` lẫn `resetRegistry` đều chưa được export (`capability/index.ts:554` chỉ có `reset()`), nên `tsgo` báo TS2305 cho CẢ HAI tên, còn `bun test` ném `SyntaxError: Export named 'invalidateAllCaches' not found` — `0 pass / 1 fail / 1 error`, không assertion nào chạy (đã đo). Vì vậy "row 2 đỏ trên HEAD" KHÔNG phải bằng chứng ghim được, và "row 1 xanh trên HEAD" cũng không. Đổi tạm import của row 1 sang tên cũ `reset` KHÔNG cứu được: `resetRegistry` thiếu vẫn làm hỏng module ngay ở lúc link, và ngay cả một file chỉ import `reset` vẫn đỏ vì native addon chưa build. Thứ tự đúng để ghim tripwire là: (a) build addon bằng `bun --cwd=packages/natives run build`; (b) chạy `bun test test/capability/reset-contract.test.ts` ngay sau commit 1 và xác nhận row 1 XANH; (c) tạm thêm `capabilities.clear()` vào `invalidateAllCaches()`, chạy lại, xác nhận row 1 ĐỎ; (d) gỡ thay đổi tạm đó. Ghi kết quả (b) và (c) vào PR.

(3) Sau commits 2-3: `bun run check:ts` xanh, cả hai file test mới xanh, và toàn bộ suite coding-agent vẫn xanh — cái cuối cùng chính xác chứng minh một file test gọi `resetRegistry()` không đầu độc bất kỳ file nào khác.

LƯU Ý MÔI TRƯỜNG, đã kiểm chứng chứ không phải phỏng đoán: ở HEAD 808b365 `bun run check:ts` pass (cả 15 package xanh) nhưng `bun test` không chạy được — native addon chưa build, nên ngay cả test có sẵn, không liên quan, `test/capability/rule-agents.test.ts` cũng báo `0 pass / 1 fail` với 'Failed to load pi_natives native addon for darwin-arm64'. Vì vậy hôm nay chỉ có nửa type-check của cổng (1) và nửa grep là chạy được. Build addon bằng `bun --cwd=packages/natives run build` để mở khoá các nửa test. ĐÃ ĐO, KHÔNG THOÁT ĐƯỢC: cả hai test mới đều chết ở lúc import, không phải vì lý do addon-trực-tiếp mà vì import LAN TRUYỀN. `capability/index.ts:11` import `@oh-my-pi/pi-utils`, và chính package đó đã fail với 'Failed to load pi_natives native addon'; `../extensibility/settings` (`:26`) và `../config/model-settings` (`:27`) cũng fail. Chỉ `capability/fs.ts` là sạch. Vậy cổng (3) không thể đánh giá được cho tới khi build addon (`bun --cwd=packages/natives run build`) — hãy ghi vào PR rằng test chưa chạy, đừng suy từ việc `capability/index.ts` tự nó không import `@oh-my-pi/pi-natives` (khác với `discovery/helpers.ts:4`) để kết luận test mới thoát được.

VÌ SAO CỔNG NÀY CÓ THỂ ĐỎ: Có, ở cả hai nửa. Nửa type-check đỏ ngay khi sót dù chỉ một trong 12 call site hoặc 8 dòng import, vì export đã đổi tên không còn tồn tại — đó là lỗi compile cứng, không phải cảnh báo mềm, và đó là lý do việc đổi tên 8 file an toàn mà không cần đọc từng file. Nửa test đỏ trên HEAD vì một lý do cụ thể, đã được chứng minh: cả `invalidateAllCaches` lẫn `resetRegistry` đều không được export ở HEAD, nên file đỏ ngay ở dòng import và không row nào resolve được, đừng nói pass. Row 1 là tripwire chống lựa chọn bị cấm, nhưng NÓ CHƯA TỪNG ĐƯỢC QUAN SÁT Ở TRẠNG THÁI XANH: trên HEAD nó đỏ vì import, và sau commit 1 thì vẫn đỏ nếu addon chưa build. Nó sẽ đỏ ngay khi có ai thêm `capabilities.clear()` vào hàm fs-cache, đúng bằng cái sai lầm mà plan dành cả một đoạn để cấm — hãy chứng minh điều đó theo thứ tự (a)–(d) ở cổng (2) chứ đừng mô tả nó như đã xanh. Điều duy nhất cổng này KHÔNG phủ là claim hành vi trong mô tả PR — vì không có đường dẫn production nào đăng ký capability provider kèm sourceId (đã kiểm chứng: cả 84 lời gọi `registerProvider` đều ở cấp module trong `src/discovery/`), nên lời gọi `unregisterProvidersForSource` trong suspend branch của `sdk.ts` là inert tại thời điểm ship và các test chạy trực tiếp registry API. Đừng để PR tuyên bố rằng việc tắt một extension giờ đã giải phóng provider của nó trong thực tế; nó chỉ mở seam, không hơn.

### Phụ thuộc

- `WI-1 commit 1 (wave 2)` — cả hai đều thêm một lời gọi teardown có gắn owner vào CÙNG nhánh suspend của `reconcileExtensionSources`. Đừng viết nhánh đó hai lần; ai đến sau MỞ RỘNG nó, không bao giờ tạo lại. Hãy kiểm chứng ở HEAD 808b365 rằng WI-1 chưa từng nhận phần đó.
- `WI-0 (wave 1)` — câu trả lời M2-OQ2 của nó ('is the capability registry extension-reachable?') quyết định có đáng dựng attribution ngay bây giờ không. Commits 2-3 phụ thuộc vào nó; commit 1 thì không.

Chặn ngược lại:

- `WI-6 (wave 4)` — plan nói WI-6 cần một câu chuyện tool-set đã ngã ngũ, và WI-5 chính là thứ ngã ngũ quyền sở hữu của provider set.
- `WI-9 (wave 7)` — unload cần inventory tài nguyên đầy đủ, và mục này là thứ thêm một chủ sở hữu cho trạng thái capability.

### Cách sai dễ nhất

Cách dễ sai nhất một lần là lựa chọn BỊ CẤM: làm cho `reset()` cũng xoá map `capabilities`. Trông như đó chính là bản sửa, và nó làm brick toàn bộ process một cách im lặng — xem mục open_questions về lý do. Cách sai dễ thứ hai là sót một lời gọi trong lúc đổi tên; cách sai dễ thứ ba là ship commits 2-3 trước khi wave 1 trả lời M2-OQ2, khiến các map attribution thành gánh nặng chết vĩnh viễn.

### Cần người quyết

- LỰA CHỌN BỊ CẤM — đừng làm điều này, và hãy biết vì sao. Làm cho `reset()` cũng xoá map `capabilities` là 'bản sửa' hiển nhiên và nó làm brick cả process. Cả 14 lời gọi `defineCapability` đều là `export const x = defineCapability(...)` ở phạm vi module, và ESM đánh giá mỗi module đúng một lần — không có import nào sau đó chạy lại chúng. Nên sau lần `reset()` đầu tiên, `getCapability` và `loadCapability` trả về `undefined`/ném lỗi cho CẢ 14 capability ở mọi một trong 12 call site (`/clear`, resume-with-chdir, vòng lặp reconcile, chuyển phiên ssh, marketplace install, …). Đó là một thất bại toàn process, im lặng, không có stack trace. Hình dạng DUY NHẤT được cho phép là: giữ hàm chỉ-xoá-fs, đổi tên nó thành điều nó thật sự làm, và thêm một `resetRegistry()` riêng cho registry. Test row bắt được sai lầm này là row 1 của `reset-contract.test.ts` — nó xanh ngay sau commit 1 (không phải trên HEAD: ở HEAD file đỏ ở dòng import) và fail ngay khi có ai thêm `capabilities.clear()` vào hàm đã đổi tên.
- Nên đổi tên hàm chỉ-xoá-fs thành gì? Plan nói 'rename to be correct' nhưng không chọn tên. Khuyến nghị: `invalidateAllCaches()`. Đó là người anh em trung thực của `invalidate(filePath, cwd?)` sẵn có ở `capability/index.ts:572`, nó nói 'caches' (số nhiều) vì nó xoá cả cache nội dung lẫn cache thư mục, và nó không đụng tên với `resetCapabilityForTests` ở `:561`. Phương án thay thế `clearFsCaches()` cộng hưởng với alias `clearFsCache` đã được import từ `./fs` tại `capability/index.ts:11`. Cả hai đều bảo vệ được — nhưng hãy chọn một và áp dụng cho cả 8 import lẫn 12 call site.
- Alias cục bộ `resetCapabilities` có nên sống sót qua lần đổi tên không? Khuyến nghị: KHÔNG. Cả 8 file hiện viết `import { reset as resetCapabilities }`, và chính alias là nửa sau của lời nói dối — cái tên `resetCapabilities` là thứ khiến reconcile loop trông như đang giải phóng capability. Sau khi đổi tên, hãy dùng thẳng tên trung thực ở cả 12 call site. Điều này cũng buộc bạn phải chạm tới `sdk.ts:3528`, nơi comment ('resetCapabilities() clears the fs cache at those boundaries') phải được cập nhật cho khớp.
- Cùng một `providerId` bị hai source khác nhau đăng ký — ai thắng? Plan không đề cập và đây là một lỗ hổng thiết kế thật. `providerMeta` (`:40`) là first-write-wins và `providerCapabilities` (`:37`) được khoá chỉ bằng providerId, nên cả hai đều không phân biệt được hai chủ sở hữu. Khuyến nghị: mirror ModelRegistry chính xác — `providerSourceByName` là one-to-one, đăng ký sau thắng, và `registerProvider` đuổi chủ cũ khỏi set của nó (chép `model-registry.ts:3011-3019`). Chi phí được chấp nhận đã biết, giống hệt hành vi đã ship của ModelRegistry: nếu source A và source B cùng đăng ký provider 'claude' và B thắng, suspend B sẽ xoá provider đó dù A vẫn còn khai báo nó. Hôm nay điều này là rỗng (không gì đăng ký theo source), và nó chỉ trở thành gánh nặng thật khi WI-10 làm registry trở nên extension-reachable. Nếu bạn không muốn chấp nhận, phương án thay thế là một bộ đếm tham chiếu cho mỗi (capabilityId, providerId) — nhưng đó là một hình dạng thứ hai do bạn tự chế ra, và plan cấm tự chế.
- `registerProvider` không có `sourceId` có nên đuổi chủ sở hữu hiện hữu không? Khuyến nghị: KHÔNG — một lần đăng ký không có source chỉ thêm vào mảng nhưng không chiếm và cũng không xoá attribution. Cả 84 lời gọi hiện tại là đăng ký ở cấp module không có source, chạy một lần lúc import; để chúng đuổi sẽ làm mồ côi một provider thuộc source bất kỳ khi có đánh giá lại. Đây là một quyết định, không phải tai nạn; hãy ghi nó vào doc comment.
- Câu hỏi cổng cho người triển khai: hai test mới có chạy được TRƯỚC khi native addon Rust được build không? Nếu có, commits 2-3 có thể được xác nhận tuần này thay vì phải chờ build. Hãy kiểm tra bằng cách chạy `bun test test/capability/reset-contract.test.ts` ngay sau khi viết xong. Nếu nó đỏ vì addon, hãy nói thẳng trong PR thay vì tuyên bố có coverage mà bạn không thể thực thi.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| §5.2 table: 12 call site `resetCapabilities()` nằm ở `main.ts:871`, `sdk.ts:4565`, `agent-session.ts:5405`/`:5790`/`:8779`, `session-tools.ts:1557`, và (không đổi) `ssh-command-controller.ts:208`/`:369`, `selector-controller.ts:310`, `builtin-marketplace.ts:36`, `helpers/ssh.ts:146`/`:167`. | STALE — đúng về số đếm, bốn file đã trôi | Các CON SỐ đúng hoàn toàn: 12 call site trên 8 file, đã kiểm chứng. Nhưng số dòng trôi vì HEAD đã dời tới 808b365 (lần gộp plan M1). Neo đúng: `main.ts:872`, `sdk.ts:4571`, `session/agent-session.ts:5435`/`:5820`/`:8811`, `session/session-tools.ts:1651`. Không đổi và vẫn đúng: `modes/controllers/ssh-command-controller.ts:208` và `:369`, `modes/controllers/selector-controller.ts:310`, `slash-commands/builtin-marketplace.ts:36`, `slash-commands/helpers/ssh.ts:146` và `:167`. Bằng chứng: `git grep -n resetCapabilities -- packages/coding-agent/src` ở HEAD 808b365; cả 8 dòng import xác nhận là `import { reset as resetCapabilities }`. ĐỪNG sửa tay số dòng: hãy chạy grep, đó là chuẩn. |
| §5.2/§5.3 trích `reconcileExtensionSources` ở `sdk.ts:4560-4624` với `resetCapabilities()` ở `:4565` và `setSuspendedExtensions()` ở `:4573`. | STALE khoảng 6 dòng | `const reconcileExtensionSources = async ()` nằm ở `sdk.ts:4566`; `resetCapabilities()` ở `sdk.ts:4571`; `extensionRunner.setSuspendedExtensions(...)` mở ở `sdk.ts:4579` và đóng ở `:4581` — lệch đúng 6 dòng so với `:4573` của plan, và `:4580` (con số plan từng dùng) chỉ là tham số hàm mũi tên, đặt code vào đó sẽ chèn vào giữa lời gọi. HÌNH DẠNG plan mô tả đúng tuyệt đối, và đây là phần xác nhận nền tảng cho cả mục: `resetCapabilities()` thật sự được gọi ngay trước `setSuspendedExtensions()`, tin rằng nó giải phóng registry trong khi nó chỉ xoá fs cache. Bằng chứng: `sed -n '4566,4582p' packages/coding-agent/src/sdk.ts` |
| §5.2: `clearSourceRegistrations` ở `config/model-registry.ts:2914`. | OFF BY ONE | Method mở ra ở `config/model-registry.ts:2913`; `:2914` là dấu ngoặc mở. `syncExtensionSources` ở `:2955` là đúng. Bằng chứng: `sed -n '2908,2930p' packages/coding-agent/src/config/model-registry.ts` |
| Mục 'File path' của WI-5: ba Map ở cấp module và hai mutable Set nằm ở `capability/index.ts:30-41`. | STALE — khoảng được trích BỎ SÓT hai Set | Ba Map ở `:34` (`capabilities`), `:37` (`providerCapabilities`), `:40` (`providerMeta`). Hai mutable Set ở `:43` và `:44` (`unboundDisabledProviders`, `unboundEnabledProviders`) — tức là NGOÀI khoảng được trích. Khối trạng thái thật là `:32-44`, và đó là năm container ở cấp module, không phải ba. Điều này quan trọng vì commits 2-3 thêm HAI Map nữa ngay cạnh chúng ở `:45-46`, đưa tổng lên bảy. Bằng chứng: `grep -n '^const capabilities\|^const providerCapabilities\|^const providerMeta\|^let unbound' packages/coding-agent/src/capability/index.ts` |
| Mục 'File path' của WI-5: `defineCapability` ở `:88-96`, `registerProvider` ở `:99-127`. | NEARLY EXACT | `defineCapability` ở `:89` (nhánh ném khi trùng ở `:90-91`); `registerProvider` ở `:101`. Lệch một ở đầu mỗi cái. Nội dung được xác nhận đầy đủ: `registerProvider<T>(capabilityId: string, provider: Provider<T>): void` KHÔNG có `sourceId` trong chữ ký, và `defineCapability` CÓ ném lỗi khi id trùng. Bằng chứng: `sed -n '88,102p' packages/coding-agent/src/capability/index.ts` |
| WI-5 trích `capability/index.ts:554-556` cho `reset()`, `:561-566` cho `resetCapabilityForTests`, và `capability/index.ts:459` cho `getCapability`. | EXACT — cả ba đã kiểm chứng | Không sửa gì. `reset()` ở `:554-556` đúng là `clearFsCache();` và không gì khác. `resetCapabilityForTests()` ở `:561-566` xoá settingsHolds + hai unbound Set + fs cache (nó KHÔNG đụng `capabilities`). `getCapability<T>(id)` ở `:459` trả về `capabilities.get(id)`. Đây là ba neo mà cả mục treo vào và cả ba đều đúng. Bằng chứng: `sed -n '548,568p;455,462p' packages/coding-agent/src/capability/index.ts` |
| WI-5: `model-registry.ts:303-304` là hình dạng attribution để chép. | EXACT | Không sửa gì. `#runtimeProvidersBySource: Map<string, Set<string>>` ở `:303` và `#runtimeProviderSourceByName: Map<string, string>` ở `:304`. Logic steal-on-re-register cần mirror nằm ở `:3011-3019` (`previousSourceId` eviction; `:3010` chỉ là `.get`, phần claim tương ứng là `:3020-3023`), và teardown cần mirror là `clearSourceRegistrations` ở `:2913-2930`. Bằng chứng: `sed -n '303,304p;3007,3027p' packages/coding-agent/src/config/model-registry.ts` |
| Plan liệt kê 14 call site `defineCapability` và 84 cặp provider/capability. | EXACT — cả 14 số dòng đã kiểm chứng, đều ở cấp module | Cả 14 xác nhận đúng ở các dòng được trích: `context-file.ts:27`, `extension-module.ts:23`, `extension.ts:37`, `hook.ts:27`, `instruction.ts:25`, `mcp.ts:108`, `prompt.ts:23`, `rule.ts:392`, `settings.ts:23`, `skill.ts:58`, `slash-command.ts:29`, `ssh.ts:31`, `system-prompt.ts:31`, `tool.ts:27`. Con số 84 cũng đúng: 104 dòng `registerProvider` dưới `src/discovery/` trừ 20 dòng import = 84 lời gọi. Bằng chứng: `git grep -n defineCapability -- packages/coding-agent/src`; `git grep -c registerProvider -- packages/coding-agent/src/discovery/` |
| (Plan không nói điều này) Ngầm hiểu rằng WI-5 giả định có một lời gọi sống nào đó truyền `sourceId` vào capability `registerProvider`, để `unregisterProvidersForSource` có cái gì để gỡ. | FALSE — đây là điều đáng kể nhất plan bỏ sót | KHÔNG có bất kỳ đăng ký capability-provider theo source nào trong repo. Cả 84 lời gọi capability `registerProvider` đều là câu lệnh top-level cấp module trong `src/discovery/*.ts` (agent-plugins, agents-md, agents, builtin-defaults, builtin, claude-plugins, claude, cline, codex, cursor, gemini, github, mcp-json, omp-plugins, opencode, skillshare, ssh, vscode, windsurf) — đã kiểm chứng: không call site nào lồng bên trong một hàm. Extension đóng góp vào capability registry bằng cách được ĐỌC tại thời điểm `load(ctx)`, không phải bằng cách đăng ký provider. `registerProvider` trên extension API (`extensibility/extensions/types.ts:1570`, `:1743`) là hàm khác cùng tên của model registry, vốn đã nhận `sourceId`. Hệ quả: lời gọi `unregisterProvidersForSource` trong suspend branch của `sdk.ts` là INERT tại thời điểm ship — nó sẽ là một tra map luôn trượt, vì map luôn rỗng. Nó là scaffolding tương thích-tương-lai cho WI-10, không phải một bản sửa sống. Do đó hai test attribution phải gọi registry API TRỰC TIẾP (đăng ký với sourceId, rồi gỡ), KHÔNG đi qua đường TUI/suspend, và mô tả PR không được tuyên bố rằng việc tắt một extension giờ đã giải phóng provider trong thực tế. Bằng chứng: `git grep -n registerProvider -- packages/coding-agent/src/discovery/` — mọi kết quả đều là dòng `import` hoặc một câu lệnh `registerProvider` top-level; bộ lọc các kết quả không top-level chỉ trả về dòng import. `git grep -n 'registerProvider' -- .../extensibility/extensions/{loader,runner,types}.ts` cho thấy chúng đi tới `ModelRegistry.registerProvider(name, config, sourceId)`, không phải hàm của capability. |
| Test row (c) của WI-5: sau `resetRegistry()`, một provider đăng ký từ một `sourceId` vẫn còn trong danh sách đã phân giải. | SOUND nhưng chỉ nếu `resetRegistry` được giữ hẹp | Row này buộc `resetRegistry()` chỉ xoá map `capabilities` — không `providerCapabilities`, không `providerMeta`, không các mảng `providers` theo từng capability, và không các map attribution mới. Giữ nó hẹp như vậy, nếu không row này không thể hiện thực. Lưu ý suy giảm được chấp nhận: sau `resetRegistry()`, `getProviderInfo` vẫn duyệt `providerCapabilities` và thấy `capabilities.get(capId) === undefined`, nên rơi xuống `priority = 0` (xem `capability/index.ts:502-522`). Điều đó chấp nhận được cho một hàm tồn tại chỉ để phục vụ test và một đường reload extension tương lai, nhưng nó phải là một lựa chọn có chủ đích, không phải tai nạn. Bằng chứng: `sed -n '502,525p' packages/coding-agent/src/capability/index.ts` |
| Lệnh xác minh của WI-5: `bun run check:ts && (cd packages/coding-agent && bun test test/capability/reset-contract.test.ts test/capability/provider-source-attribution.test.ts)`. | PARTIALLY BLOCKED tại HEAD 808b365 | `bun run check:ts` PASS ở HEAD — đã kiểm chứng trọn vẹn, cả 15 package xanh. Nửa `bun test` KHÔNG chạy được: native addon chưa build, nên ngay cả `test/capability/rule-agents.test.ts` có sẵn và không liên quan cũng báo `0 pass / 1 fail` với 'Failed to load pi_natives native addon for darwin-arm64'. Build trước bằng `bun --cwd=packages/natives run build`, rồi nửa `bun test` trở nên chạy được. ĐÃ ĐO, KHÔNG THOÁT ĐƯỢC: cả hai test mới đều chết ở lúc import, vì import lan truyền chứ không phải addon-trực-tiếp. Probe từ `packages/coding-agent`: `import * as M from "@oh-my-pi/pi-utils"` → `0 pass 1 fail 1 error`; `import * as M from "../src/capability/index"` → `0 pass 1 fail 1 error`; `"../src/config/model-settings"` và `"../src/extensibility/settings"` → cùng lỗi; chỉ `"../src/capability/fs"` → `1 pass 0 fail`; một file test không import gì → `1 pass 0 fail` (chứng minh lỗi đến từ import, không phải từ harness). Chuỗi import: `capability/index.ts:11` là `@oh-my-pi/pi-utils`, `:26` là `../extensibility/settings`, `:27` là `../config/model-settings`. Hệ quả: cổng (3) không thể đánh giá được cho tới khi build Rust hạ cánh. Bằng chứng: `bun run check:ts` → all packages Done. `cd packages/coding-agent && bun test test/capability/rule-agents.test.ts` → 0 pass, 1 fail, 'Failed to load pi_natives native addon for darwin-arm64'. |
| (Plan không nói điều này) Row 2 của `reset-contract.test.ts` gọi `resetRegistry()`, phá huỷ các định nghĩa capability ở cấp module cho phần đời còn lại của process. | RESOLVED — đã kiểm chứng thực nghiệm, thiết kế hai-row-trong-một-file của plan là an toàn | Điều này đã được kiểm chứng trực tiếp thay vì suy luận: `bun test` cho mỗi test FILE một module registry mới, còn trạng thái module CÓ được chia sẻ giữa các khối `test()` BÊN TRONG một file. Một file xoá một Map ở cấp module không ảnh hưởng tới file test anh em (đã kiểm chứng: 2 pass / 0 fail, file thứ hai vẫn quan sát thấy giá trị trước khi xoá). Vì vậy `resetRegistry()` trong `reset-contract.test.ts` không thể đầu độc `provider-source-attribution.test.ts` hay bất kỳ file nào khác. Chỉ thị của plan rằng hai row phải theo đúng thứ tự đó là đúng, và lý do nay đã được xác nhận thực nghiệm: trong một file, `resetRegistry()` ở row 2 sẽ làm row 1 fail nếu row 1 chạy sau. Bằng chứng: repro cô lập trong scratchpad: `a.test.ts` gọi `nuke()` rồi khẳng định đã xoá; `b.test.ts` khẳng định entry ở cấp module vẫn còn. `bun test` → `2 pass 0 fail`. Bản đối chứng trong cùng file (`c.test.ts`) cho thấy trạng thái tồn tại qua ba khối `test()`. |
