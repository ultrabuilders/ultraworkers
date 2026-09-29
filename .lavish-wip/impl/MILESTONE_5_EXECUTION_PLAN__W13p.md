# Phiếu triển khai — W13p (khoá `W13'`): Hai gói Python

**Kế hoạch:** `MILESTONE_5_EXECUTION_PLAN.md`, mục `## W13'. Hai gói Python (sóng 4)` (dòng 4129–4358).
**HEAD khi viết phiếu:** `47720fd`.
**Tên binary mới:** `<new>` = `ultraworkers` (do W9 quyết định; `code_shape` trong spec viết thẳng tên này).

> Lưu ý về khoá: kế hoạch tự ghi ở dòng 4690 rằng "Work item cuối cùng ghi là `W13'`; đó là work item mà bảng gốc gọi bằng khoá `W13p`". Mọi tham chiếu `W13p` trong tài liệu = mục `W13'`.

---

## 1. Cái gì thay đổi, quan sát được

Typed RPC client (`python/omp-rpc`) và bot triage `python/robomp` spawn lệnh `ultraworkers` thay vì lệnh không còn tồn tại, **ở cả bốn nơi sinh tên** — hai dòng nguồn Python và hai override cấu hình được ship — nên container robomp không còn âm thầm gọi binary cũ sau khi CLI đã đổi tên.

---

## 2. Bảng điểm sửa

Tất cả văn bản "TRƯỚC" dưới đây trích từ file thật tại HEAD `47720fd`, đã mở và đọc.

### 2.1. Bốn site sinh tên — tất cả đều phải đổi

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `python/omp-rpc/src/omp_rpc/client.py:455` | `RpcClient.__init__`, tham số `executable` (keyword-only) | `        executable: str = "omp",` | `        executable: str = "ultraworkers",` |
| `python/robomp/src/config.py:95` | `Settings.omp_command` (pydantic v2 `Field`) | `    omp_command: str = Field("omp", alias="ROBOMP_OMP_COMMAND")` | `    omp_command: str = Field("ultraworkers", alias="ROBOMP_OMP_COMMAND")` |
| `python/robomp/docker-compose.yml:81` | env của compose service | `      ROBOMP_OMP_COMMAND: omp` | `      ROBOMP_OMP_COMMAND: ultraworkers` |
| `python/robomp/.env.example:185` | default có tài liệu | `ROBOMP_OMP_COMMAND=omp` | `ROBOMP_OMP_COMMAND=ultraworkers` |

Hai dòng này **KHÔNG đổi** ở `config.py`: tên field `omp_command` và alias `ROBOMP_OMP_COMMAND`. `worker.py:647` đọc nó theo tên field (`        executable=settings.omp_command,`) — đã kiểm chứng `git grep -n 'omp_command' -- python/robomp/src` trả về **đúng 2 hit** (`config.py:95` định nghĩa, `worker.py:647` consumer).

### 2.2. Comment đi kèm bắt buộc sửa

| đường/dẫn | dòng | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `python/robomp/.env.example` | 183 | `# Path or command name for the omp binary inside the container. The shipped` | nhắc tên binary mới |
| `python/robomp/.env.example` | 184 | `# image installs a shim that invokes Bun against the mounted pi checkout.` | giữ nguyên (không chứa tên lệnh) |
| `python/robomp/AGENTS.md` | 111 | `... exposes \`omp\` via a \`/usr/local/bin/omp\` shim; \`ROBOMP_OMP_COMMAND=omp\` should not need changing.` | `...` shim `<new>`; `ROBOMP_OMP_COMMAND=<new>` khi dựng image mới |

Dòng `AGENTS.md:111` là file agent của gói robomp **tự đọc** — một lời dẫn sai ở đây là lời dẫn sai trong cây, và cổng 2 không bắt được (nó chỉ glob `docker-compose.yml` + `.env.example`).

### 2.3. Metadata mô tả

| đường/dẫn | dòng | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `python/omp-rpc/pyproject.toml` | 8 | `description = "Typed Python client for the omp coding-agent RPC protocol"` | bỏ chữ "omp" khỏi mô tả |
| `python/omp-rpc/pyproject.toml` | 14 | `keywords = ["omp", "rpc", "agent", "coding-agent", "jsonl", "stdio"]` | bỏ phần tử `"omp"` |
| `python/omp-rpc/pyproject.toml` | 26 | `Homepage = "https://omp.sh/"` | **để nguyên** trừ khi N9 đã chốt (xem §6) |
| `python/robomp/pyproject.toml` | 8 | `description = "Self-hosted GitHub triage/fix bot driving omp --mode rpc"` | `... driving ultraworkers --mode rpc` |

### 2.4. Dòng PHẢI ĐỂ NGUYÊN (nếu đổi là hỏng)

| đường/dẫn | dòng | Nội dung | Vì sao giữ |
| --- | --- | --- | --- |
| `python/omp-rpc/pyproject.toml` | 6 | `name = "omp-rpc"` | tên distribution đã phát hành — quyết định của bảng open-questions |
| `python/robomp/pyproject.toml` | 6 | `name = "robomp"` | cùng lý do |
| `python/robomp/pyproject.toml` | 22 | `  "omp-rpc>=0.1.0",` | PEP 508 trên tên distribution `omp-rpc`; đổi `:6` mà giữ `:22` là hỏng ngược lại |
| `python/omp-rpc/pyproject.toml` | 31 | `package-dir = { "" = "src" }` | layout |

### 2.5. Test — viết lại, KHÔNG đổi tên máy móc

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `python/omp-rpc/tests/test_client.py:1044` | `test_command_builder_supports_common_rpc_options` | `            executable="omp",` | **xoá hẳn dòng này** (bỏ đối số tường minh để test chạy đúng default thật) |
| `python/omp-rpc/tests/test_client.py:1061` | cùng test, kỳ vọng `client.command` | `                "omp",` | `                "ultraworkers",` |

Hoán đổi cả hai chuỗi để lại một test xanh dưới **tên nào** và không bảo vệ điều gì.

---

## 3. Các bước (mỗi bước có neo đã kiểm)

### Bước 1 — Lấy tên từ W9, không lấy từ plan này
Nguồn của tên: `packages/coding-agent/package.json:28` → `		"omp": "src/cli.ts"` (trong khối `"bin"`), và `scripts/ci-release-publish.ts:186` → `		publishBin: { omp: "dist/cli.js" },`. Token ở mọi site phải đúng chuỗi W9 cài.

Sửa `python/omp-rpc/src/omp_rpc/client.py:455`. Xác minh file đã sạch:
```bash
git grep -c '"omp"' -- python/omp-rpc/src/omp_rpc/client.py   # phải KHÔNG in gì
```

### Bước 2 — `python/robomp/src/config.py:95`
Chỉ đổi chuỗi default. Xác minh consumer vẫn resolve:
```bash
git grep -n 'omp_command' -- python/robomp/src   # đúng 2 hit: config.py:95, worker.py:647
```

### Bước 3 — `python/robomp/docker-compose.yml:81` (bước quyết định item này có làm được gì không)
Dưới header `# --- container-fixed paths ---` (`:80`). Env trong compose service **ĐÈ LÊN** pydantic default ở bước 2 — dừng ở bước 2 thì container được ship vẫn spawn binary cũ, trong khi mọi tiêu chí nghiệm thu dựa trên grep đều báo xong. **Làm bước này trước khi đụng bất kỳ metadata nào.**

### Bước 4 — `python/robomp/.env.example:185`
Kèm hai dòng comment `:183-184`. Đây là site thứ tư phải khớp, và là thứ người dùng nhìn thấy.

### Bước 5 — `python/omp-rpc/tests/test_client.py:1044,1061` — viết lại
Xoá đối số `executable="omp",` ở `:1044`, đổi `"omp",` ở `:1061` thành `"ultraworkers",`. Đây là **bằng chứng tự động duy nhất** trong toàn repo rằng default đã dời.

### Bước 6 — `python/omp-rpc/pyproject.toml:8,14` (+ `:26` có điều kiện)
`:26` (`Homepage`) cùng giá trị `APP_URL` tại `packages/utils/src/dirs.ts:25` → `export const APP_URL: string = "https://omp.sh/";`. Nếu N9 chưa chốt, **để `:26` nguyên trạng** và ghi rõ lý do trong commit message.

### Bước 7 — `python/robomp/pyproject.toml:8`
Một dòng. **KHÔNG** đụng `:6` và **KHÓNG** đụng `:22`. Cùng kiểu ràng buộc tại `Dockerfile:164` → `RUN pip install /tmp/wheels/omp_rpc-*.whl && rm -rf /tmp/wheels` (resolve theo tên file wheel đã build).

### Bước 8 — Mở rộng keep-list (W7 sở hữu)
`scripts/rename/keep-list.txt` **không tồn tại trên cây hiện tại** (đã kiểm: `find . -name 'keep-list*'` → không có; kế hoạch tự ghi ở dòng 118 là `[create,verified]` ở W7). Đây là phụ thuộc tiến, không phải neo hỏng. Cần bổ sung bốn nhóm danh tính:
- Unix group N13: `entrypoint.sh:25,28,29,32,33,53` + `worker.py:211,664`
- `.omp-xdg` / `<xdg_root>/omp` (N15) — đã có trong spec
- `.omp-tmp` và `.omp-session*` — spec N15 hiện **thiếu**, phải thêm
- **Mục thứ tư** (config dir của CLI dưới agent home, thuộc W4/W6, KHÔNG thuộc N13/N15): `worker.py:145,168,209`, `entrypoint.sh:60,61,65,66,77-81`, `test_worker.py:278,290,295,296`, và — **trong chính các file item này sửa** — `docker-compose.yml:91,105,107` (dòng `:107` là bind mount `${HOME}/.omp/agent/models.container.yml:/srv/agent-home-stage/.omp/agent/models.yml:ro`), `.env.example:102`, `robomp/AGENTS.md:101`, `robomp/README.md:48,58,233`.

Cổng 2 không bắt được site nào trong nhóm thứ tư, vì pattern của nó là `ROBOMP_OMP_COMMAND[=:]`.

### Bước 9 — Chạy assertion keep-set đầy đủ, không chỉ tổng
Xác nhận các keep site giống hệt HEAD **từng byte**. Xem §4 hợp đồng test 3 cho các con số phải ghim riêng.

### Bước 10 — Không đụng `test_user_group.py`
`test_user_group.py:26,34,36,40,45` và `test_worker.py:465` là lưới tự động **duy nhất** cho quyết định Unix group N13. Bố cục sandbox có **ba** file test giữ lưới, không phải một. Xác minh bằng `git diff --stat` rằng **năm** file test này vắng mặt khỏi thay đổi trước khi commit.

---

## 4. Hợp đồng test

### (1) DEFAULT ĐÃ DỜI — sửa `python/omp-rpc/tests/test_client.py::test_command_builder_supports_common_rpc_options`
Dựng `RpcClient()` **không** truyền `executable`, assert `client.command[0] == "ultraworkers"`. Đây là assertion biến đổi trên giá trị code tự tính, không phải kiểm tra tồn tại.
**Hồi quy → người dùng thấy gì:** RPC client spawn một lệnh mà không release nào cài; **mọi** lời gọi chết với `FileNotFoundError` ngay ở request đầu tiên.

### (2) OVERRIDE VẪN THẮNG — test MỚI, phải là case thứ hai tách biệt
Đặt `ROBOMP_OMP_COMMAND` thành giá trị tường minh, nạp `Settings`, assert `settings.omp_command` trả override chứ không phải default.
**Hồi quy → người dùng thấy gì:** người đã đặt `ROBOMP_OMP_COMMAND` trên image cũ không thể override được nữa → sự cố toàn diện thay vì lối thoát có tài liệu.

> **Sửa chữa so với spec (ghi ra, không sửa trong tài liệu):** spec nói đặt case override này vào `python/omp-rpc/tests/test_client.py`. **Sai về mặt kỹ thuật** — `omp-rpc` không phụ thuộc `robomp` (đã kiểm: không import chéo nào; `python/robomp/pyproject.toml:22` mới là chiều `robomp → omp-rpc`), nên `test_client.py` không nạp được `Settings`. Nơi đúng là **`python/robomp/tests/test_config.py`** (đã có sẵn `from robomp.config import Settings, reset_settings_cache` ở dòng 6, và fixture `env`/`monkeypatch` dùng `monkeypatch.setenv` ở dòng 23-24). Spec cũng nói "Không có file test mới" — nhưng thêm một hàm vào `test_config.py` **không phải** tạo file mới, nên ràng buộc đó vẫn giữ được.

### (3) CÁC KEEP SET KHÔNG BỊ ĐỤNG — hợp đồng phủ định
Số đếm **theo từng file** của cổng 1 (`5,2,2,8,3`) cộng số zero trên ba file được đổi. Phần kiểm thử sẵn có trong `test_user_group.py` và `test_worker.py:465` được **giữ lại, không thay thế**.
**Hồi quy → người dùng thấy gì:** container không khởi động (`KeyError`), hoặc `Permission denied` trên `/data` cho mọi slot user.

**Hai con số phải ghim riêng** (không nằm trong pattern cổng nào, vì cổng 1 chỉ thấy chuỗi `"omp"` có quote):
```bash
git grep -c '\.omp' -- python/robomp/tests/test_host_tools.py python/robomp/tests/test_permissions_e2e.py
# phải trả về 7 và 1  (đã kiểm chứng: đúng 7 và 1)
```

### Cố ý KHÔNG test
Không có gì trong repo này thực thi `docker-compose.yml` → cổng 3 là so khớp chuỗi tĩnh, **không** phải bằng chứng container spawn đúng lệnh. Phải nói thẳng điều này trong PR.

---

## 5. Cổng

### Cổng 1 — THE SPLIT (tripwire: **ĐỎ hôm nay**)
```bash
CHANGED=$(git grep -c '"omp"' -- python/omp-rpc/src/omp_rpc/client.py python/robomp/src/config.py python/omp-rpc/tests/test_client.py 2>/dev/null | wc -l | tr -d ' ')
KEPT=$(git grep -c '"omp"' -- python/omp-rpc/tests/test_user_group.py python/robomp/src/worker.py python/robomp/src/sandbox.py python/robomp/tests/test_sandbox.py python/robomp/tests/test_worker.py 2>/dev/null | tr -d ' ' | cut -d: -f2 | paste -sd, -)
echo "set_i_files_still_matching=$CHANGED keep_counts=$KEPT"
[ "$CHANGED" = "0" ] && [ "$KEPT" = "5,2,2,8,3" ]
```
**Đo thật hôm nay:** `set_i_files_still_matching=3 keep_counts=5,2,2,8,3`, **exit 1**. Đúng như thiết kế.
**Có đỏ được không: CÓ.** Đã thử tấn công trong repo tạm có commit thật: sửa đúng ba file set-(i) rồi đổi tên nhầm `test_user_group.py` 5→0 và `test_sandbox.py` 8→3. Kết quả `set_i=0 keep=2,2,3,3` → **ĐỎ**. Cổng bắt được.

### Cổng 2 — KHÔNG FILE SHIPPED NÀO GHIM TÊN CŨ (tripwire: **ĐỎ hôm nay**)
```bash
OV=$(git grep -ohE 'ROBOMP_OMP_COMMAND[=:][[:space:]]*[A-Za-z][A-Za-z0-9_-]*' -- python/robomp/docker-compose.yml python/robomp/.env.example | awk -F'[=:] *' '{print $2}' | paste -sd, -)
echo "shipped_overrides=[$OV]"; [ "$OV" = "ultraworkers,ultraworkers" ]
```
**Đo thật hôm nay:** `shipped_overrides=[omp,omp]`, **exit 1**. Đúng như thiết kế.
**Có đỏ được không: CÓ** — và đây là cổng **duy nhất ghim đúng tên `ultraworkers`**.

### Cổng 3 — AGREEMENT TÊN BỐN-BÊN (bất biến: **XANH hôm nay**)
```bash
C=$(grep -oE 'executable: str = "[^"]+"' python/omp-rpc/src/omp_rpc/client.py | grep -oE '"[^"]+"' | tr -d '"')
R=$(grep -oE 'omp_command: str = Field\("[^"]+"' python/robomp/src/config.py | grep -oE '"[^"]+"' | tr -d '"')
D=$(grep -oE 'ROBOMP_OMP_COMMAND: *[^ ]+' python/robomp/docker-compose.yml | awk '{print $2}')
E=$(grep -oE 'ROBOMP_OMP_COMMAND=[A-Za-z][A-Za-z0-9_-]*' python/robomp/.env.example | cut -d= -f2)
echo "client=$C config=$R compose=$D env=$E"
{ [ -n "$C" ] && [ "$C" = "$R" ] && [ "$C" = "$D" ] && [ "$C" = "$E" ]; }
```
**Đo thật hôm nay:** `client=omp config=omp compose=omp env=omp`, **exit 0**.
**Có đỏ được không: CÓ, nhưng chỉ với một loại lỗi.** Đã thử trong bản sao tạm:
- *Đổi nửa vời* (chỉ `client.py` + `config.py`): `client=ultraworkers config=ultraworkers compose=omp env=omp` → **exit 1**. Đúng như kỳ vọng.

> **Phát hiện quan trọng về cổng 3 — chỉ là kiểm tra TÍNH NHẤT QUÁN, không phải TÍNH ĐÚNG ĐẮN.** Đã thử đổi tên **đồng nhất** cả bốn nguồn sang một tên sai (`pi`): `client=pi config=pi compose=pi env=pi` → **exit 0, XANH**. Cổng 3 sẽ xanh với bất kỳ tên nào, kể cả tên bịa. Cổng 2 là thứ **duy nhất** đỏ trong trường hợp đó (`shipped_overrides=[pi,pi]` → exit 1).
> Hệ quả thực tế: **không được báo cổng 3 là bằng chứng "đã đổi đúng tên"** — nó chứng minh "bốn nơi đọc cùng một tên". Cổng 2 mới là neo tên. Nếu cả hai cùng xanh thì tên đúng **vẫn** là điều kiện của W9, không phải điều cổng nào tự chứng minh được.

### Cổng hành vi (có kiểm tra prefix)
```bash
if python3 -m pytest --version >/dev/null 2>&1; then echo READY; else
  echo "NOT-RUNNABLE: pytest missing."; exit 2; fi
/tmp/ompw13-venv/bin/python -m pytest -q python/omp-rpc/tests    # 81 passed, 17 subtests
/tmp/ompw13-venv/bin/python -m pytest -q python/robomp/tests     # 665 passed, 4 skipped
```
**Đo thật trên máy này (đã build venv và chạy):**
- `python3 -m pytest --version` → `/opt/homebrew/opt/python@3.14/bin/python3.14: No module named pytest`, **exit 1** → prefix in `NOT-RUNNABLE` và **exit 2**. Đúng như spec.
- `python/omp-rpc/tests` → `81 passed, 17 subtests passed in 3.23s` ✅
- `python/robomp/tests` → `665 passed, 4 skipped, 3 warnings in 108.59s` ✅
- **Gộp lại** → `4 errors during collection`, đúng 4 module: `No module named 'tests.test_client'`, `tests.test_host_uris`, `tests.test_protocol`, `tests.test_user_group`. Đã xác nhận nguyên nhân: cả hai thư mục đều tên `tests` **và đều có `__init__.py`**, còn thư mục cha (`python/omp-rpc/`, `python/robomp/`) thì **không** có. Đây là lý do `package.json:131` xâu hai lệnh riêng:
  ```
  "test:py": "python3 -m pytest -x python/omp-rpc/tests && python3 -m pytest -x python/robomp/tests",
  ```

### Trung thực về những gì KHÔNG bảo vệ
- **`bun run check:ts` mù hoàn toàn với item này.** Đã đọc `package.json:90`: `bun run --filter './packages/*' ...` và `:91` `oxlint . && oxfmt --check 'packages/*/...'`. Không dòng sửa nào dưới `python/**` có thể làm nó đỏ. **Không được báo là bằng chứng cho công việc này.**
- **`bun run test:py` FAIL** (`No module named pytest`, exit 1) và **`bun run lint:py` FAIL** (`ruff` không có trên PATH, exit 127 — đã kiểm). Cả hai không phân biệt được với lỗi test thật chỉ qua mã thoát.
- **Không có gì test `docker-compose.yml`.** Cổng 3 là so khớp chuỗi tĩnh.

---

## 6. Cạm bẫy riêng của work item này

1. **Sửa đúng hai dòng nguồn rồi kết luận xong** — lỗi có hậu quả lớn nhất. `docker-compose.yml:81` đè lên pydantic default. Grep `"omp"` rơi đúng 20, mọi tiêu chí nghiệm thu đều qua, container vẫn spawn binary cũ. Vì sao dễ sót: giá trị ở đó **không quote** và nằm **ngay sau tên biến**, nên `git grep '"omp"'` không thấy.
   *(Ghi chú: số 20 là tổng của **cả** 24 hit trừ 4 chỗ đã đổi — không phải tổng của riêng nhóm keep-set. Nhóm keep-set 5 file là 5+2+2+8+3 = 20 lượt, và `client.py`+`config.py`+`test_client.py` là 4 lượt riêng. Đừng cộng hai lần.)*
2. **`pyproject.toml:22`** — sắc hơn cả một bản sửa thiếu. Plan liệt kê nó như rename site trong khi bảng open-questions quyết định GIỮ `omp-rpc`. Đổi cả `:6` và `:22` → `uv pip install` chết lúc resolve, kéo sập toàn bộ bot.
3. **Quét `.omp` rộng trên `python/**`** — 108 lượt trên 12 file. Trong đó `worker.py:145,168,209` và `entrypoint.sh:60,61,65,66,77-81` quản lý `/srv/agent-home/.omp` (`worker.py:136` → `_AGENT_HOME = Path("/srv/agent-home")`) — **config dir của chính CLI** (`CONFIG_DIR_NAME`, `dirs.ts:28`), không phải bố cục sandbox. Dời chúng làm staging của robomp trỏ vào root CLI không đọc. Giới hạn trong container, vô hình với cả test Python lẫn `check:ts`.
4. **Tin số dòng của plan.** Tám tham chiếu `test_sandbox.py` lệch đúng +1. **Đã kiểm chứng:** dòng thật là `760, 829, 1072, 1074, 1076, 1106, 1108, 1110`; plan (bản gốc) ghi `759, 828, 1071, 1073, 1075, 1105, 1107, 1109`. Sửa tại số của plan gốc = sửa dòng ngay trên mỗi mục tiêu.
5. **Đổi tên máy móc `test_client.py:1044,1061`** — yên lặng nhất. Test xanh dưới tên nào; item ship ra mà không có bằng chứng tự động nào rằng default đã dời.
6. **`AGENTS.md:111` là cây tự đọc** — và cổng 2 không thấy nó (chỉ glob hai file shipped).
7. **Cổng 3 không kiểm tra tên đúng** (xem §5). Đừng dựa vào nó để kết luận "đã đổi sang `ultraworkers`".

---

## 7. Ghi chú về neo (đã kiểm từng cái)

Tất cả neo dưới đây đã mở và đọc tại HEAD `47720fd`.

**Neo ĐÚNG:** `client.py:455` · `config.py:95` · `docker-compose.yml:80,81` · `.env.example:183,184,185` · `test_client.py:1044,1061` · `AGENTS.md:101,111` · `README.md:48,58,233` · `omp-rpc/pyproject.toml:6,8,14,26,27,28,31` · `robomp/pyproject.toml:6,8,22` · `worker.py:136,145,168,209,211,647,664` · `entrypoint.sh:25,28,29,32,33,53,60,61,65,66,77,78,79,80,81` · `test_user_group.py:26,34,36,40,45` · `test_worker.py:278,290,295,296,341,345,346,387,465` · `test_host_tools.py:28,143,144,145,153,189,4674` · `test_permissions_e2e.py:263` · `tasks.py:364` · `sandbox.py:17,493,500,541,549,567,572,574,584,588,759,899,1047` · `test_sandbox.py:760,829,1072,1074,1076,1106,1108,1110` · `test_worker_smoke.py:4` · `Dockerfile:164,180,216` · `packages/coding-agent/package.json:28` · `scripts/ci-release-publish.ts:186` · `dirs.ts:28` (`CONFIG_DIR_NAME`).

**Neo LỆCH (đều là doc comment, giá trị nằm dòng kế tiếp — nội dung vẫn đúng, chỉ lệch 1 dòng):**
- `dirs.ts:24` → `APP_URL` thật ở **`dirs.ts:25`**. Dòng 24 là comment `/** Public homepage ... */`.
- `dirs.ts:36` → `USER_AGENT` thật ở **`dirs.ts:37`**. Dòng 36 là comment `/** Default User-Agent header string ... */`.
- `package.json:135` → script `test:py` thật ở **`package.json:131`**.
- `pyproject.toml:34,37,38,41,75` (robomp) và `:37` (omp-rpc) trong bảng "Đính chính" — **đã kiểm, ĐÚNG**: `package-dir`, `packages`, `package-data`, `known-first-party`. Đây là layout/distribution, không phải rename site.

**Số dòng ĐÃ SỬA trong spec (đúng, đã kiểm chứng độc lập):** tám dòng `test_sandbox.py` lệch +1 so với plan gốc; spec đã sửa đúng sang `760, 829, 1072, 1074, 1076, 1106, 1108, 1110`.

**File không tồn tại:** `scripts/rename/keep-list.txt` — nhưng kế hoạch tự nói (dòng 118) nó là `[create,verified]` ở W7. Phụ thuộc tiến, không phải neo hỏng.

**Toàn bộ số đếm inventory trong spec — ĐÃ KIỂM CHỨNG, tất cả khớp tuyệt đối:**
| lệnh | spec | đo thật |
| --- | --- | --- |
| `git grep -o '"omp"' -- 'python/**/*.py' \| wc -l` | 24 | **24** ✅ |
| per-file (8 file) | client 1, test_client 2, test_user_group 5, config 1, sandbox 2, worker 2, test_sandbox 8, test_worker 3 | **khớp từng file** ✅ |
| `git grep -n 'ROBOMP_OMP_COMMAND' -- python/` | 5 hit | **5** ✅ |
| `git grep -o '\.omp' -- python/ \| wc -l` | 108 trên 12 file | **108 / 12** ✅ |
| `git grep -lE '"\.omp[a-z0-9.-]*"'` | 6 file | **6** ✅ |
| họ `.omp*` có quote | `.omp-xdg` 30, `.omp-tmp` 14, `.omp-session` 10, `.omp` 6, v1.2.3 = 2, v1.2.4 = 1 | **khớp từng loại** ✅ |
| `.omp-tmp` tổng vs có quote | 19 vs 14 | **19 / 14** ✅ |
| `.omp-session` tổng vs có quote | 20 vs 13 | **20 / 13** ✅ |
| `test_host_tools.py` / `test_permissions_e2e.py` | 7 và 1 | **7 / 1** ✅ |

**Số test:** `81 passed, 17 subtests` và `665 passed, 4 skipped` — **đã chạy thật, khớp tuyệt đối**.
