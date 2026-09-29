# Session / Lưu trữ / Khôi phục — omp so với 4 repo tham chiếu

Ngày đo: 2026-09-28. Tất cả số đo chạy tại chỗ trên 5 cây, không clone.
Lệnh dùng: `git ls-files | wc -l`, `wc -l`, `git grep -n`, `find`, `ls`.

---

## 0. Đính chính tiền đề trước khi so sánh

### 0.1. gajae KHÔNG phải repo độc lập — nó là anh em cùng gia đình với omp

Đây là phát hiện quan trọng nhất về *phương pháp*, không phải về *tính năng*:

```
# cùng một file, cùng một hàm, cùng nội bộ
gajae packages/utils/src/stream.ts:434  export function parseJsonlLenient<T>(buffer: string): T[]
omp   packages/utils/src/stream.ts:575  export function parseJsonlLenient<T>(buffer: string, options: { onMalformedRecord?: () => void } = {}): T[]

# cùng dùng Bun.JSONL.parseChunk bên trong
gajae packages/utils/src/stream.ts:15,20   Bun.JSONL.parseChunk(input)
omp   packages/utils/src/stream.ts:49,208,225  Bun.JSONL.parseChunk(...)
```

Và cả hai đều có `recoverOrphanedBackups` (1 file mỗi repo), cùng tên hàm, cùng mục đích
(khôi phục file `.bak` mồ côi sau crash giữa hai lần rename).

**Hệ quả:** trong miền session/storage, `gajae` **không phải nguồn tham chiếu độc lập**.
Nó là một fork đã tiến thêm 2 phiên bản định dạng (v5 vs v3 của omp). Diff omp↔gajae ở đây
là *tiến hóa cùng codebase*, rẻ hơn nhiều so với port từ `pi` hay `codex`.
Bốn repo tham chiếu **thực sự độc lập** chỉ còn 3: `pi`, `opencode`, `codex`.

### 0.2. `pi` cũng chung gia đình — nhưng ở nhánh khác

```
pi    packages/coding-agent/src/core/session-manager.ts:41   export const CURRENT_SESSION_VERSION = 3;
pi    packages/coding-agent/src/core/session-manager.ts:287  function migrateV1ToV2(...)
pi    git grep -l 'parseJsonlLenient' -- packages  → 0 file
```

`pi` giữ nguyên session-JSONL v3 **và không có** `parseJsonlLenient`. Nghĩa là: `pi` rời
nhánh JSONL transcript *trước khi* `omp`/`gajae` thêm lớp parse khoá. `pi` đã đi sang hướng
`durable` (log + projection) — khác hẳn.

**Trách nhiệm M1B cần sửa:** brief nói "M1B đang lên kế hoạch chép `session-backends` + `durable`".
Đo cho thấy `pi` **không có** `parseJsonlLenient` ⇒ `pi` **không sửa được** điểm yếu hỏng file
JSONL mà omp vẫn còn. Port `durable` của pi là **đổi mô hình dữ liệu**, không phải bổ sung
một tiện ích. Chi phí phải tính lại (xem `## Chi phí`).

### 0.3. Kiểm lại số đo quy mô trong brief

| Số | Brief | Đo lại | Kết luận |
|---|---|---|---|
| pi TS files | 1.564 | **1.591** | brief thấp hơn 27 |
| omp TS files | 5.325 | **5.407** | brief thấp hơn 82 |
| pi `session-backends` | 27 file | **33 file** (gồm bench + `*.sql`) | thấp hơn 6 |
| pi `durable` | 52 file | **63 file** (gồm 24 file test + 7 docs) | thấp hơn 11 |
| pi `durable` + `session-backends` src | — | **11.118 dòng** | mới đo |
| opencode / codex / gajae TS | 3.639 / 758 / 4.459 | không đo lại (ngoài miền) | — |

Khác biệt nhỏ, nhưng hai số về `durable`/`session-backends` thấp hơn thực tế vì brief
đếm trước khi tách test/docs. Dùng số đo lại cho phần tính chi phí.

---

## 1. Bảng per_repo

| repo | Có gì | Bằng chứng | Kích thước |
|---|---|---|---|
| **omp** | JSONL 1 file/session, `version: 3`, title slot 256 byte ở dòng vật lý đầu | `packages/coding-agent/src/session/session-entries.ts:13` `CURRENT_SESSION_VERSION = 3`; `docs/session.md:35-45` | 89 file, **55.309 dòng** |
| omp | Append-only, **không fsync**, tự ghi trong doc là "software-crash safe but not power-loss safe" | `session-manager.ts:691-696` (nguyên văn comment của repo) | — |
| omp | Migration tại chỗ v1→v2→v3, **không ghi lại ngay**, đánh dấu rewrite rồi ghi ở lần persist kế tiếp | `session-migrations.ts:63-73`; `docs/session.md:418-422`; `session-manager.ts:1882` | file migration 78 dòng |
| omp | **Dòng hỏng bị bỏ qua và sau đó bị dọn**: parse lenient → đếm → rewrite thân file | `utils/src/stream.ts:575-600` `parseJsonlLenient` + `session-loader.ts:95`; `session-manager.ts:1882` `#rewriteRequired = migrated \|\| malformedRecords > 0` | — |
| omp | Khóa cross-process thật (flock) cho chuyển draft→durable + xoá có điều kiện; **append thường không khoá** | `session-manager.ts:1340-1348` (điều kiện hẹp); `utils/src/file-lock.ts:84-91`; `crates/pi-natives/src/file_lock/unix.rs` | file-lock 100 dòng |
| omp | CAS theo kích thước byte cho mọi full-rewrite, 3 backend | `session-storage.ts:66-75` `SessionWriteConflictError`; `indexed-session-storage.ts:146`; `sql-session-storage.ts:394`; `redis-session-storage.ts:214` | storage 1.262 dòng |
| omp | 4 backend: File / Memory / Indexed(Redis) / Indexed(SQL), SQL hỗ trợ postgres+mysql+sqlite | `sql-session-storage.ts:15` `SqlSessionStorageAdapter` | 712+434+281 dòng |
| omp | GC thật: archive lạnh, gzip, sweep blob, WAL checkpoint; có `gc.lock` + breaker | `cli/gc-cli.ts` 1.704 dòng; mặc định `coldArchiveAfterDays:30`, `retainNewestGlobal:20`, `retainNewestPerCwd:10` (`cli/gc-settings.ts:13,15,17`) | test gc-cli 78 KB |
| omp | **File transcript không bao giờ nhỏ lại**: `#fileBody()` ghi lại *toàn bộ* `#entries`, compaction chỉ là marker | `session-manager.ts:1126-1131` | — |
| omp | Session không đọc được → **bỏ qua khỏi danh sách, âm thầm**, file vẫn còn | `session-listing.ts:422-435` `return undefined` | listing 848 dòng |
| omp | Thừa nhận mất dữ liệu bằng thông báo thật | `modes/persistence-failure.ts:23` "unsaved entries are lost" | 24 dòng |
| omp | 27 file test trong `test/session-manager/` + 26 file `session*.test.ts` | `ls packages/coding-agent/test/session-manager \| wc -l` | 6.806 dòng test |
| **pi** | **Hai SQLite schema độc lập + JSONL**, không có hợp đồng trên đĩa thống nhất | `durable/src/storage/sqlite/migrations.ts` (8 bảng, 12 index) và `session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql` (7 bảng `WITHOUT ROWID`, 2 trigger) | 8 file chính = **4.316 dòng** |
| pi | JSONL: `FORMAT_VERSION = 1` hằng cứng, mismatch → **ném lỗi cả file** | `durable/src/storage/jsonl/storage.ts:27,178,208` | storage 840 dòng |
| pi | `sqlite-node` version theo từng row: **cả hai chiều đều ném**, không có upgrader | `sqlite-node/src/sqlite/session/session-row.ts:57-62` | 1 file `.sql` duy nhất toàn repo |
| pi | JSONL `fsync` **mặc định tắt** (`fsync ?? false`); SQLite `WAL` + `synchronous = NORMAL` | `jsonl/storage.ts:75-78,255`; `durable/src/storage/sqlite/node.ts:101-103` | — |
| pi | **Đuôi rách → cắt bỏ, load tiếp**. Dòng hỏng *hoàn chỉnh* → **mất cả file** | `jsonl/storage.ts:780-798` (cắt byte) vs `:115-121` `JsonlCorruptionError` (ném ra `open()`) | — |
| pi | JSONL **không hỗ trợ nhiều tiến trình**: không flock, chỉ có chuỗi promise trong process | `grep -rniE "flock|lockfile|advisory"` trên `durable/src` + `session-backends` → **0 hit** | `#enqueue` session.ts:284-291 |
| pi | SQLite thì an toàn nhờ chính engine (`BEGIN IMMEDIATE`, `busy_timeout=5000`) | `sqlite-node/src/sqlite/repo.ts:64-70` | — |
| pi | Danh sách session hỏng → **biến mất khỏi listing**, chỉ báo lỗi khi mở | `sqlite-node/src/sqlite/repo.ts:277-280` `catch {}` | — |
| pi | Fork = **con trỏ cha**, không copy entry; `forks.ts` chỉ 97 dòng và chỉ lập *kế hoạch* copy | `durable/src/session/forks.ts:20-23,87-93` | 97 dòng |
| pi | `transaction.ts` 879 dòng nhưng **không phải storage transaction** — là staging object, không begin/commit/fsync | `durable/src/session/transaction.ts:144-148` | 879 dòng |
| **opencode** | **Không có file per session.** Tất cả trong **một file SQLite** duy nhất | `packages/core/src/session/sql.ts:22,79` bảng `session_v2`, `session_message` | 36 file = **8.109 dòng** |
| opencode | Không hề có file IO trong tầng session | `grep -rnE "writeFile\|Bun\.write\|appendFile\|fsync"` trên `core/src/session`+`database` → **0 hit** | — |
| opencode | `synchronous = NORMAL` → mất commit gần nhất khi mất điện | `core/src/database/database.ts:37-45` | — |
| opencode | Cột `version` là **version của app**, không phải schema; không bao giờ được đọc lại | `core/src/session.ts:266`; `info.ts:16-63` không đọc `row.version` | — |
| opencode | 50 file migration SQL + **1.135 dòng** data-migration v1→v2, có cursor để resume | `core/src/database/migration/` (50 file); `v1-migration.bun.ts` | 1.135 dòng |
| opencode | Event log + projection trong **cùng một** `IMMEDIATE` transaction | `core/src/bus.ts:317-318,433` | bus 908 dòng |
| opencode | Event type có `version` riêng; bản cũ **không có projector → bị bỏ qua âm thầm khi replay** | `schema/src/session-event.ts:45-50`; `bus.ts:314,885` `projectors.get(key) ?? []` | — |
| opencode | `flock` **có** nhưng **không dùng cho session** — chỉ cho git cache, npm plugin, log | `packages/util/src/flock.ts`; consumer: `repository-cache.ts:120`, `plugin/update.ts:19` | — |
| opencode | 1 dòng JSON hỏng → **toàn bộ session không đọc được** | `core/src/session/store.ts:174-177` `Effect.forEach` không có `either` | — |
| opencode | `store.list` **không có chắn lỗi** → 1 row hỏng làm hỏng cả endpoint list | `store.ts:138` → `info.ts:17` `Info.make()` ném | — |
| opencode | **Không có retention/GC/VACUUM nào cả** | `grep -rniE "prune\|retention\|maxSessions\|vacuum"` → chỉ trúng `tool-output`/`shell`/`pty` | — |
| **codex** | JSONL "rollout", 1 file/session, append-only, 12 biến thể item | `codex-rs/rollout/src/rollout_file_name.rs:62-74`; `history/src/rollout_payload.rs:22-24` | 36 file = **16.664 dòng** |
| codex | Đường dẫn có phân cấp ngày: `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl` | `recorder.rs:1730-1741` | — |
| codex | **Không fsync ở đâu trong write path.** `tokio::fs::File` không buffer nên `flush()` là no-op → không mất khi process crash, **mất đuôi khi mất điện** | `recorder.rs:2090-2096` `write_line`; `compression.rs:151,161,878` là 3 hit `sync_all` duy nhất và ở worker nén | — |
| codex | **Không có trường version.** Tương thích dựa hoàn toàn vào `#[serde(default)]` + 2 shim thủ công | `history/src/lib.rs:352`; `rollout_payload.rs:292-298` union untagged `WindowIdWire` | — |
| codex | Đường ghi hỏng bị **bỏ qua im lặng**, có đếm nhưng **số đếm bị vứt** | `recorder.rs:1110,1129` `continue`; `:1157` bind `_parse_errors` | — |
| codex | Tự chữa đuôi rách: thêm `\n` vào dòng rác để "niêm phong" nó thành dòng riêng | `recorder.rs:2042-2055` `ensure_rollout_is_newline_terminated` | — |
| codex | **Khoá cross-process thật và đúng**: `flock` mỗi thread + khoá phối hợp + **GC khoá cũ** | `rollout/src/writer_lock.rs:51-79`; `:124-171` `remove_stale_thread_locks` | 200 dòng |
| codex | Tranh lock → lỗi có kiểu `ThreadStoreError::Conflict`, **không** nối dòng | `thread-store/src/local/mod.rs:335-350` | — |
| codex | Fork = **con trỏ cha + byte-offset** (`history_base`, `forked_from_ordinal_exclusive`), không copy | `core/src/session/mod.rs:423-431`; `protocol.rs:3131-3138,3182-3184` | — |
| codex | Nén zstd session > 7 ngày, tự giải nén khi append lại | `compression.rs:336` `MIN_ROLLOUT_AGE = 7 ngày` | 1.414 dòng |
| codex | **Không có upload nào.** Đường thoát duy nhất là `/feedback` có consent-gate | `grep share_session\|upload_rollout` trên `codex-rs/` → **0 hit**; `feedback/src/lib.rs:484-486` | — |
| **gajae** | JSONL 1 file/session, **`version: 5`** (cao hơn omp 2 bậc) | `gajae packages/coding-agent/src/session/session-manager.ts:251` `CURRENT_SESSION_VERSION = 5` | session-manager **22.545 dòng** |
| gajae | Migration giống hệt omp v1→v2→v3, cộng 2 bản nâng version chỉ-đổi-header | `session-manager.ts:2701,2731,2744-2759` | — |
| gajae | **Có `fsyncSync()`** thật + fsync thư mục sau mỗi publish | `session-storage.ts:1219-1226`; `:757-761` `fsyncDirectorySync` | storage 3.677 dòng |
| gajae | Rewrite = tmp + fsync + rename, có rollback `.bak` khi EPERM | `session-manager.ts:15800-15809`; `:12155-12187` | — |
| gajae | **Hai loader, chính sách hỏng ngược nhau**: `loadEntriesFromFile` lenient (bỏ đuôi rách, im lặng) vs `inspectTranscriptStrict` ném cả file | `utils/src/stream.ts:443-447` vs `session-manager.ts:4002-4007,4030` | — |
| gajae | Session hỏng → bỏ khỏi danh sách, `catch { return undefined }`, **file không bị xoá** | `session-manager.ts:4803-4831` | — |
| gajae | Transcript **không khoá cross-process**; khoá duy nhất thuộc về memory sidecar | `session-manager.ts:8754` (chỉ spill build); `docs/session.md:52` tự thừa nhận | — |
| gajae | Nhưng SDK session index **có** khoá cross-process + event log **có checksum** + seq tăng đơn điệu | `sdk/broker/session-index.ts:1151-1163,1679-1690` | 2.515 dòng |
| gajae | Retention có thật nhưng **mặc định tắt**: 60 ngày, trục dung lượng = 0, cần `--prune` | `config/settings-schema.ts:3257-3268` | — |

---

## 2. So sánh theo 5 trục của miền

### 2.1. Định dạng lưu trữ

| | omp | pi | opencode | codex | gajae |
|---|---|---|---|---|---|
| Đơn vị | 1 file `.jsonl` / session | JSONL (`main.jsonl` + sidecar) **hoặc** SQLite | 1 file SQLite, nhiều bảng | 1 file `.jsonl` / session | 1 file `.jsonl` / session |
| Append-only | có | có (JSONL) | không (INSERT/UPDATE row) | có | có |
| Checksum | không | không | không | không | không (chỉ SDK index có) |
| Có trường version | **có, v3** | có (JSONL v1 cứng; SQLite per-row v1) | **không** (cột `version` là version app) | **không** | **có, v5** |
| Backend thay thế | File/Memory/Redis/SQL | 2 schema SQLite + JSONL + Memory | SQLite, chạy được cả trong Durable Object | JSONL + SQLite projection | JSONL |

**Điểm đáng chú ý:** không repo nào trong 5 có checksum hay chữ ký nội dung. `codex` và `gajae`
dùng *ordinal tăng đơn điệu* để phát hiện lệch, `pi` dùng `seq` tăng nghiêm ngặt — đó là
tín hiệu toàn vẹn cấu trúc, yếu hơn checksum nhưng mạnh hơn "hy vọng".

### 2.2. Migration

| | Cơ chế | File cũ mở ra | Chi phí |
|---|---|---|---|
| omp | header `version` + `migrateToCurrentVersion`, sửa **trong bộ nhớ**, đánh dấu rewrite | đọc & nâng cấp | 78 dòng, 2 hàm |
| pi (SQLite) | `durable_schema` bảng version, contiguity check | nâng cấp tuần tự | 123 dòng |
| pi (sqlite-node) | version trên từng row | **cả 2 chiều đều ném** — không có upgrader | 57-62 |
| opencode | 50 file SQL + 1.135 dòng data-migration có cursor | nâng cấp thật, **resume được** | lớn nhất trong 5 repo |
| codex | **không có version**, dựa vào `#[serde(default)]` + shim | parse được, bỏ qua dòng lạ | 0 dòng code migration |
| gajae | `version: 5`, 2 hàm migration thật | nâng cấp trong bộ nhớ, **không ghi lại khi đọc** | `session-manager.ts:2744` |

**Điểm đáng chú ý:** `codex` chọn "không version, chịu bằng serde mặc định" — rẻ nhưng
một dòng JSON *đúng hình dạng, sai ngữ nghĩa* sẽ parse xong rồi bị drop im lặng. `omp` và
`gajae` chọn "có version, nâng cấp tại chỗ" — đắt hơn nhưng **không bao giờ** âm thầm
đọc sai. `opencode` đắt nhất và cũng đáng nhất: có cursor nên migration 1.135 dòng chạy
được trên DB thật mà không sập giữa chừng.

### 2.3. Bền vững trước crash

Đây là trục nơi **không repo nào** đạt chuẩn điện — cả 5 đều mất đuôi khi mất điện:

| repo | fsync trên write path? | Trục đỏ khi mất điện | Nguồn |
|---|---|---|---|
| omp | **không, có chủ đích** | vài giây cuối | `session-manager.ts:691-696` (tự thừa nhận) |
| pi JSONL | không, mặc định `fsync ?? false` | toàn bộ phiên | `jsonl/storage.ts:255` |
| pi SQLite | `WAL` + `synchronous = NORMAL` | tới checkpoint (1000 trang) | `durable/src/storage/sqlite/node.ts:101-103` |
| opencode | `WAL` + `synchronous = NORMAL` | tới checkpoint | `core/src/database/database.ts:37-45` |
| codex | không có `sync_all` nào trong write path | vài giây cuối | `recorder.rs:2090-2096` |
| gajae | **có `fsyncSync()` thật**, nhưng phải gọi tay | tùy caller | `session-storage.ts:1219-1226` |

**Điểm đáng chú ý — khác biệt thật sự, không phải khác biệt văn phong:**
`omp` tự viết ra *"software-crash safe but not power-loss safe"*. `codex` cũng không fsync
nhưng **không nói gì**, và thêm `\n` vào dòng rác để niêm phong nó — tức là *ghi đè dấu vết
sự cố đi kèm lỗi*. Đây là khuyến nghị cụ thể nhất tôi rút ra: **nếu giữ nguyên chính sách
không-fsync, hãy giữ tiếng nói của omp và bỏ thói quen niêm phong của codex.**

### 2.4. Nhiều tiến trình

| repo | Cơ chế | Hệ quả tranh chấp |
|---|---|---|
| omp | `flock` thật (Linux abstract socket / unix flock) nhưng **chỉ khoá hẹp**: chuyển draft→durable + xoá có điều kiện. Append thường dựa vào `O_APPEND` + CAS kích thước byte | `SessionWriteConflictError`, không ghi đè âm thầm |
| pi (JSONL) | **không có gì** — grep flock/lockfile/advisory → 0 hit | **hai tiến trình sẽ hỏng file** |
| pi (SQLite) | `BEGIN IMMEDIATE` + `busy_timeout=5000` | SQLite tự serialize |
| opencode | `IMMEDIATE` transaction + owner_id + sequence + dedup guard | chết to, không ghi đè |
| codex | `flock` **mỗi thread** + khoá phối hợp + **GC khoá cũ sau crash** | `ThreadStoreError::Conflict` |
| gajae (transcript) | **không có** | `O_APPEND` mỗi-dòng, mất cập nhật khi full-rewrite |
| gajae (SDK index) | `withFileLock` + checksum + seq | đúng |

**Điểm đáng chú ý:** `codex` là repo duy nhất xử lý được **khoá mồ côi sau crash**
(`remove_stale_thread_locks`, `writer_lock.rs:124-171`) — `flock` của OS tự giải phóng khi
tiến trình chết, nhưng *file khoá* thì không. Cả omp lẫn gajae đều dựa vào chính kernel
giải phóng (`crates/pi-natives/src/file_lock/mod.rs:48` "process-owned and automatically
released on exit") nên không cần GC — nhưng đó là một điều kiện kiến trúc mà
`pi`/`gajae` không có.

### 2.5. Hỏng file / đuôi rách — **"mất" hay "bỏ qua"?**

Đây là câu hỏi trọng tâm của miền. Bảng dưới là kết quả đo:

| repo | Đuôi rách (crash giữa append) | Dòng hỏng giữa file | Session hỏng trong danh sách |
|---|---|---|---|
| **omp** | **bỏ qua, rồi bị dọn** — parse lenient đếm `malformedRecords`, set `#rewriteRequired`, lần persist kế tiếp ghi lại thân file ⇒ dòng rác **biến mất vĩnh viễn** | **bỏ qua, tự dọn** (cùng đường) | bỏ khỏi danh sách, âm thầm, file còn nguyên |
| **pi** | **cắt byte trên đĩa**, load tiếp, không lỗi | **mất cả file** — `JsonlCorruptionError` ném ra `open()` | **biến mất khỏi listing**, chỉ báo khi mở |
| **opencode** | không mô hình hoá (SQLite lo) | 1 row hỏng ⇒ **cả session không đọc được** | **1 row hỏng làm hỏng cả endpoint list** |
| **codex** | **bỏ qua im lặng**, đếm rồi **vứt số đếm**; tự thêm `\n` niêm phong dòng rác | bỏ qua im lặng | không mô hình hoá (quét file) |
| **gajae** | lenient: bỏ đuôi rách im lặng. **strict**: ném cả file — **tùy đường vào** | lenient bỏ qua / strict ném cả file | bỏ khỏi danh sách, `catch { return undefined }` |

**Điểm đáng chú ý — đây là phát hiện đáng giá nhất của toàn bài:**

1. **`omp` là repo duy nhất tự chữa lành.** Không ai khác lấy "bỏ qua" rồi **xoá rác khỏi đĩa**.
   `pi` cắt đuôi rách nhưng một dòng hỏng giữa file vẫn giết cả session. `codex` bỏ qua rồi
   **niêm phong dòng rác thành dòng vĩnh viễn** — tức là rác tích tụ mãi. `gajae` có hai
   loader trái chiều. Chỉ `omp` có đường `malformed → count → rewrite → sạch`.

2. **Nhưng `omp` có một lỗ hổng đúng nơi tệ nhất:** `session-listing.ts:422-435` trả
   `undefined` cho file không parse được — **không log, không cảnh báo**. Người dùng nhìn
   session biến mất khỏi danh sách mới hiểu là hỏng. File vẫn còn (đây là "bỏ qua", đúng
   nghĩa) nhưng **không ai được báo**. `gajae` yếu hơn ở đây vì nó có thêm đường *strict*
   cho resume/fork/ACP; `omp` chỉ có một con đường lenient duy nhất cho mọi thứ.

3. **`pi` là repo có rủi ro lớn nhất trong miền này** — và nó chính là repo M1B đang định
   chép. `parseJson` của `pi` (`jsonl/storage.ts:115-121`) không có `try/catch` quanh
   chỗ gọi (`:813`), nên **một byte hỏng giữa file = mất trọn session**. Không có
   `--lenient`, không có salvage. Nếu M1B port nguyên xi, omp **mất** hạ tầng hỗ trợ
   dòng hỏng mà nó đang có.

---

## 3. omp thiếu gì

Xếp theo mức hại khi thiếu, không theo độ "hay".

### 3.1. Thiếu thật, và có hại

| # | Thiếu | Vì sao có hại | Bằng chứng thiếu |
|---|---|---|---|
| 1 | **Cảnh báo khi bỏ qua session không đọc được** | `scanSessionFile` trả `undefined` im lặng. Người dùng thấy session "biến mất", không biết là hỏng hay bị xoá. Đúng câu hỏi "mất hay bỏ qua" — omp trả lời *bỏ qua* nhưng **không ai nói** | `session-listing.ts:422-435`; không có `logger` trong hàm |
| 2 | **fsync không bao giờ được gọi** | Mất vài giây cuối khi mất điện/kernel panic. Chấp nhận được **nếu nói ra**; omp có nói trong doc nhưng người dùng không đọc doc | `session-manager.ts:691-696` |
| 3 | **Đường đọc "nghiêm ngặt"** cho fork / resume / ACP | Mọi lỗi hiện đều đi qua một loader lenient. Fork từ file có đuôi rách sẽ âm thầm mất entry cuối thay vì từ chối | `session-loader.ts` chỉ có `parseSessionContent`; không có biến thể strict |
| 4 | **Transcript không bao giờ nhỏ lại** | `#fileBody()` ghi lại toàn bộ `#entries`. Session 6 tháng tuổi vẫn giữ mọi entry đã compact. Chỉ giảm khi `omp gc` archive + gzip (mặc định 30 ngày) | `session-manager.ts:1126-1131` |
| 5 | **Khoá cross-process chỉ phủ 1 trường hợp hẹp** | Append thường dựa `O_APPEND`. Hai tiến trình cùng mở một session vẫn có thể xen dòng; CAS kích thước chỉ bảo vệ *rewrite*, không bảo vệ *append* | `session-manager.ts:1340-1348` — điều kiện `&&` rất hẹp |

### 3.2. Thiếu, nhưng cân nhắc được

| # | Thiếu | Bằng chứng ở repo khác | Đánh giá |
|---|---|---|---|
| 6 | **Checksum nội dung** | Không repo nào có (kể cả 4 repo tham chiếu). gajae có ở *SDK index* | Không lấy. Chuẩn ngành chưa ai làm; thêm vào sẽ tốn I/O trên đường nóng |
| 7 | **Compression nền** cho session cũ | codex zstd > 7 ngày (`compression.rs:336`); omp gzip nhưng chỉ trong `gc` | omp đã có, chỉ khác codec và ngưỡng. Không cần |
| 8 | **Đếm bản ghi hỏng và lưu lại** | codex đếm rồi **vứt** (`recorder.rs:1157` bind `_parse_errors`) | Không lấy codex. Nhưng nên giữ `malformedRecords` của omp để **báo cáo**, không phải để nuôi thêm bộ đếm |
| 9 | **GC khoá mồ côi** | codex `remove_stale_thread_locks` (`writer_lock.rs:124-171`) | Không cần — `pi-natives` FileLock tự giải phóng khi tiến trình chết (`crates/pi-natives/src/file_lock/mod.rs:48`). Đây là lợi thế kiến trúc của omp |
| 10 | **Migration có cursor / resume được** | opencode `v1-migration.bun.ts:95,562,598` | Chỉ cần khi migration nặng. omp migration là 78 dòng, chạy tức thì. Chưa cần |
| 11 | **GC theo dung lượng tổng** | gajae `gc.sessions.maxTotalBytes` — mặc định **0 (tắt)** | Chính gajae mặc định tắt. Không lấy |
| 12 | **Reset/revert tạo rollout mới thay vì ghi đè** | codex `revert_thread.rs:130` | omp đã có `reset_boundary` entry (`docs/session.md:278`). Tương đương |

### 3.3. Không thiếu — cần nói rõ để khỏi port nhầm

- **SQLite backend**: omp **đã có** (`sql-session-storage.ts`, hỗ trợ postgres+mysql+sqlite) và 4 backend tổng cộng. `pi` có 2 schema SQLite nhưng omp không thiếu khả năng.
- **Multi-process**: omp có `flock` thật qua Rust native, `pi` có **0**, `gajae` transcript có **0**. Không có gì để lấy.
- **Fork**: omp có `parentId` + `leafId` (`docs/session.md:439-449`); `pi` chỉ lập kế hoạch copy 97 dòng; `codex` dùng byte-offset. Không thiếu.
- **Retention**: omp có `gc` với archive 30 ngày + giữ 20 global / 10 per-cwd. `opencode` **không có gì cả**.
- **Backup + khôi phục**: omp có `.bak` + `recoverOrphanedBackups`; `opencode` không có khái niệm này.

---

## 4. Kết luận

### 🟢 LÀM

**L1 — Báo cáo session bị bỏ qua. Rẻ nhất, hại nhất.**
`session-listing.ts:422-435` đang trả `undefined` im lặng khi file không parse được.
Thêm một `logger.warn` với đường dẫn + `malformedRecords`. Đây là thứ duy nhất trong toàn
bảng ở mục 2.5 mà người dùng đang bị tước mất thông tin mà không hề biết.
- Chi phí: ~5 dòng. Không đổi hợp đồng.
- Bằng chứng hỗ trợ: omp đã có `logger` sẵn (AGENTS.md yêu cầu dùng logger trong mọi code
  chạy song song với TUI), và `malformedRecords` đã được đếm sẵn — chỉ chưa ai đọc nó ở
  nhánh listing.

**L2 — Thêm đường đọc nghiêm ngặt cho fork và resume.**
omp hiện có **một** loader lenient cho mọi thứ. `gajae` đã chứng minh pattern: cùng một
file, hai chính sách — `loadEntriesFromFile` lenient cho resume thường,
`inspectTranscriptStrict` (`session-manager.ts:4002-4007`) ném cả file cho fork/ACP.
- Chi phị: ~30 dòng (một biến thể `parseSessionContent` gọi `JSON.parse` không bọc try).
- Bằng chứng hỗ trợ: `session-manager.ts:4007` dùng `TextDecoder(fatal: true)` — ngay cả
  UTF-8 dở cũng bị từ chối, tức là họ đã cân nhắc nghiêm túc.

**L3 — Siết khoá cross-process cho append.**
Hiện chỉ khoá hẹp ở `session-manager.ts:1340-1348`. Mở rộng `withSessionFileLockSync`
(đã có sẵn, đã là flock thật) ra phủ cả append. `codex` cho thấy cách làm đúng:
khoá mỗi thread, khoá phối hợp khi tạo/xoá, tranh chấp → lỗi có kiểu chứ không phải nối dòng.
- Chi phí: thay đổi nhỏ trong `session-manager.ts`, nhưng **phải đo lại** vì `flock` mỗi
  append là một syscall trên đường nóng. Đo trước khi làm.

### 🟡 LÀM NẾU CÓ ĐIỀU KIỆN

**Đ1 — fsync, chỉ khi người dùng chịu trả giá.**
Cả 5 repo đều không fsync mặc định; đó là quyết định chung của ngành, không phải thiếu sót
của omp. Nhưng omp là repo duy nhất **tự viết ra giới hạn** (`session-manager.ts:691-696`).
Nếu muốn fsync: bật cho session không phải draft-only, hoặc thêm setting
`session.durability = "process" | "power"`. **Điều kiện:** có người dùng thật sự cần và
chấp nhận chậm. Đo trước — append đang là đường nóng.

**Đ2 — Cắt bớt transcript cũ, thay vì để phình.**
`#fileBody()` ghi lại toàn bộ `#entries`, nên file chỉ lớn thêm. `gc` gzip từ 30 ngày,
nhưng file 29 ngày tuổi vẫn phình. **Điều kiện:** có số liệu thật về phân bố kích thước
trên máy người dùng. Không đo được thì đừng đoán.

### 🔴 KHÔNG LÀM

**K1 — KHÔNG port `durable` / `session-backends` từ `pi` như M1B đang lên kế hoạch.**

Đây là khuyến nghị mạnh nhất, và nó chống lại giả định trong brief. Lý do đo được:

1. **Nó là đổi mô hình dữ liệu, không phải bổ sung.** `pi` bỏ hẳn JSONL transcript
   (`grep parseJsonlLenient -- packages` → **0 hit** trong khi omp và gajae đều có).
   `pi` chạy log + projection; omp chạy append-only transcript. Ghép hai mô hình là
   viết lại tầng lưu trữ, không phải copy 11.118 dòng.
2. **Nó làm omp MẤT hạ tầng đang có.** `parseJson` của `pi` (`jsonl/storage.ts:115-121`)
   ném `JsonlCorruptionError` cho **một dòng hỏng giữa file** → mất trọn session. omp hiện
   bỏ qua rồi tự dọn. Port `pi` là **hạ cấp** mục 2.5.
3. **Nó không thêm gì cho các trục omp đang yếu.** Đo 4 trục:
   - fsync: `pi` cũng tắt mặc định → không giải quyết Đ1
   - nhiều tiếng trình: `pi` JSONL **không có khoá nào** (0 hit flock/lockfile/advisory) →
     không giải quyết L3
   - đuôi rách: `pi` cắt byte nhưng không có cơ chế đếm-và-dọn như omp → **kém omp**
   - migration: `pi` sqlite-node **ném ở cả hai chiều**, không có upgrader → kém omp
4. **Chi phí thật.** 11.118 dòng src (25.496 kể cả test) + 2 schema SQLite song song,
   trong khi omp đã có SQL backend của riêng mình. Ước 2 schema × ~600 test = việc bảo trì
   kép vĩnh viễn.

**Thay bằng:** nếu cần tuổi thọ schema (nhiều backend cùng lúc, hoặc cần truy vấn theo
trường), lấy **interface** của `pi` (`types.ts:657-749`, 14 phương thức) làm checklist
thiết kế — nhưng hiện thực trên `SessionStorage` của omp đã có
(`session-storage.ts:111-181`), vốn đã gọn hơn.

**K2 — KHÔNG lấy `version` cột của opencode hay cách chịu bằng `serde(default)` của codex.**
Cột `version` của opencode là version của app và không bao giờ được đọc lại — đây là bẫy,
không phải mẫu. `omp` đã có version thật, 78 dòng, 2 hàm. Đừi lấy.

**K3 — KHÔNG lấy thói quen niêm phong dòng rác của codex.**
`ensure_rollout_is_newline_terminated` (`recorder.rs:2042-2055`) thêm `\n` vào dòng dở để
"niêm phong" nó thành dòng riêng. Kết quả: dòng hỏng **tích tụ mãi** trong file, và số
đếm bị vứt (`:1157` bind `_parse_errors`). omp đang làm ngược lại đúng hơn — giữ.

**K4 — KHÔNG coi `gajae` là nguồn tham chiếu độc lập.**
Đã chứng minh ở mục 0.1: cùng `parseJsonlLenient` trong cùng file path, cùng
`recoverOrphanedBackups`. Nó là nhánh anh em. Nếu muốn cải tiến session, **diff
omp↔gajae** rẻ hơn nhiều và cho câu trả lời "2 bản version session đó làm gì" — đó
chính là câu hỏi M1B cần trả lời.

---

## 5. Chi phí

Đơn vị: dòng code. Giá ước tính = số dòng thay đổi + số test contract bắt buộc viết.

### 5.1. Làm (3 việc)

| Việc | Code | Test | Tổng | Ghi chú |
|---|---|---|---|---|
| L1 cảnh báo session bị bỏ qua | ~5 | ~40 (1 file) | **~45** | Rẻ nhất. `malformedRecords` đã có sẵn ở `parseSessionContent` |
| L2 đường đọc nghiêm ngặt | ~30 | ~120 (2 file: fork, ACP) | **~150** | Theo mẫu `inspectTranscriptStrict` gajae |
| L3 khoá cross-process cho append | ~40 | ~200 (race test) | **~240** | **Phải đo syscall trước.** Có sẵn `session-manager-atomic-rewrite-race.test.ts` (37 KB) làm mẫu |
| **Tổng** | **~75** | **~360** | **~435** | <1% subsystem 55.309 dòng |

### 5.2. Nếu có điều kiện

| Việc | Ước tính | Điều kiện chặn |
|---|---|---|
| Đ1 fsync tuỳ chọn | ~80 + đo hiệu năng | Cần số đo p99 của append trước. Không đo thì không làm |
| Đ2 cắt transcript cũ | ~300 (kèm checkpoint + phục hồi) | Cần phân bố kích thước file thật. Không có số liệu thì không đoán |

### 5.3. Không làm — và giá nếu làm

| Việc | Giá | Cái mất |
|---|---|---|
| **K1 port `durable` + `session-backends` từ `pi`** | 11.118 dòng src + 25.496 kể cả test; 2 schema SQLite; viết lại tầng lưu trữ | **Mất cơ chế bỏ-qua-và-dọn dòng hỏng** (mục 2.5). Không thêm fsync, không thêm khoá đa tiến trình, migration kém hơn. Đổi mô hình dữ liệu transcript. Đổi lại: gì? |
| K2 lấy version của opencode | ~10 | Bẫy: cột không bao giờ được đọc |
| K3 lấy niêm phong dòng rác của codex | ~15 | Rác tích tụ mãi trong file |
| K4 coi gajae là nguồn độc lập | — | Mất ~8 giờ đo sai hướng; thay bằng diff omp↔gajae (~30 phút) |

### 5.4. Chi phí cơ hội của việc KHÔNG làm

Bỏ qua L1-L3: người dùng mất session hỏng **không ai báo** (L1), fork âm thầm mất entry
cuối (L2), và hai tiến trình có thể xen dòng transcript (L3). Cả ba đều hiếm. Không cái
nào là mất dữ liệu hàng loạt. Chấp nhận được nếu tài liệu nói rõ — và `docs/session.md`
đã nói khá rõ phần bền vững.

### 5.5. Chi phí M1B nếu giữ nguyên kế hoạch hiện tại

Nếu M1B tiếp tục chép `durable` + `session-backends` như brief mô tả:
- **Bỏ dương:** 11.118 dòng src có hệ thống transaction thật (`durable` SQLite
  `BEGIN IMMEDIATE`), fork bằng con trỏ cha, và 2 trigger toàn vẹn ở tầng engine
  (`001_initial.sql:69-82`) — những thứ omp chưa có.
- **Bỏ âm:** ba điểm ở mục 2.5. Đáng kể nhất: mất cơ chế bỏ-qua-và-dọn dòng hỏng.
- **Bỏ bù:** bảy tháng bảo trì hai schema SQLite song song, một trong hai sẽ chết dần.

**Khuyến nghị:** hoãn M1B cho tới khi trả lời được *"session v5 của gajae khác v3 của omp
bằng những gì, và cái nào đáng lấy"*. Đó là một diff, không phải một kế hoạch port.

---

## 6. Phụ lục — bảng tổng hợp nhanh

| Trục | omp | pi | opencode | codex | gajae |
|---|---|---|---|---|---|
| Định dạng | JSONL v3 | JSONL v1 **+** 2× SQLite | 1 SQLite DB | JSONL (không version) | JSONL v5 |
| Có version | ✅ 3 | ⚠️ v1 cứng / per-row | ❌ (cột app version) | ❌ | ✅ 5 |
| fsync mặc định | ❌ (có ghi rõ) | ❌ | ❌ (`NORMAL`) | ❌ (không nói) | ⚠️ có hàm, gọi tay |
| Khoá đa tiến trình | ⚠️ hẹp (flock thật) | ❌ JSONL / ✅ SQLite | ✅ SQLite | ✅ flock + GC khoá cũ | ❌ transcript / ✅ SDK index |
| Đuôi rách | ✅ bỏ + **tự dọn** | ✅ cắt byte | n/a | ⚠️ bỏ + niêm phong | ⚠️ tùy loader |
| Dòng hỏng giữa file | ✅ bỏ + tự dọn | ❌ **mất cả file** | ❌ **hỏng cả session** | ⚠️ bỏ im lặng | ⚠️ tùy loader |
| Session hỏng trong list | ⚠️ bỏ, **không báo** | ❌ biến mất | ❌ **hỏng cả list** | n/a | ✅ bỏ, file còn |
| Số đo mất báo | 0 (chưa ai đọc) | 0 | n/a | đếm rồi vứt | 0 |
| File nhỏ lại được | ❌ (chỉ gc gzip) | ❌ | n/a | nén >7 ngày | ❌ |
| Retention | ✅ gc 30 ngày | ❌ | ❌ không có gì | ✅ nén | ⚠️ 60 ngày, mặc định tắt |
| Migration dễ hỏng file | ✅ 78 dòng | ⚠️ 2 chiều đều ném | ✅ 50 file + cursor | ✅ không version | ✅ ~60 dòng |
