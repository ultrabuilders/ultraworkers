# KẾ HOẠCH THỰC THIỆN — MILESTONE 3: BỀ MẶT NGƯỜI DÙNG KIỂU CLAUDE CODE

Cả chương trình hướng tới một coding agent duy nhất, mọi thứ là plugin. M1 đã làm `omp` thành strict
superset của `earendil-works/pi`; M2 cắt các seam để mọi thứ lắp ghép được. M3 mang trải nghiệm
người dùng của Claude Code sang — và đây là chỗ luận điểm đó được kiểm chứng hoặc bị bác bỏ, vì
M3 là milestone đầu tiên chạm đúng những bề mặt mà luận điểm "mọi thứ là plugin" đòi phải mở.
Milestone gồm 16 work item (A1–A9, B1–B3, C2, D1–D3) trong 6 sóng, hai mục bối cảnh chạy trước
sóng 1, và phần đuôi §7–§8 cùng §9–§11.

M3 port **ý tưởng**, không port code. Claude Code đóng, và §8 của kế hoạch nói thẳng nó không cấp
giấy phép nào cho phần bề mặt này — nên ở đây không có lời hứa nào về việc sao chép.

## Mục tiêu

Sau M3, người dùng nhận được:

- **Status line hiện hạn mức.** Segment quota (tier, cửa sổ 5h/1d/7d/tháng, mốc reset credit) xuất
  hiện trong các preset bảo trì chọn, và vẫn còn trên màn hình ở 80 cột.
- **Cuộn bằng chuột cảm thấy đồng nhất.** Cuộn nhanh bằng wheel `clicky` tăng tốc như trackpad đã
  luôn tăng, thay vì bị đóng cứng 3 dòng mỗi notch, kèm setting `ui.mouseWheelSpeedMultiplier`.
- **Hàng trạng thái tạm thời không còn cuộn mất.** Dòng trạng thái mới có key nên thay dòng cũ thay vì
  trôi đi vĩnh viễn; overlay transcript agent có divider "chưa đọc" bấm được để nhảy ngược lại.
- **MCP server hỏi được người dùng.** Một server spec-compliant giờ hỏi được câu hỏi giữa phiên và
  nhận lại câu trả lời thật — `decline`, `cancel`, `timeout` là ba giá trị khác nhau trên wire.
- **Setting bí mật của plugin không tự vẽ ra.** Ô liệt kê kiểu enum không còn hiện giá trị, và không
  còn vẽ lại plaintext sau khi bạn chọn giá trị mới.
- **Màu an toàn cho người mật thị đỏ–lục.** Với Color-Blind Mode, dòng diff thêm phân biệt được với
  dấu thành công, với git status sạch, và với lỗi — hôm nay chỉ dòng diff thêm đổi màu, nên `success`
  và `statusLineGitClean` vẫn xanh và vẫn đọc thành "dòng thêm" lướt qua.

Phần còn lại **vô hình** và nên nói thẳng: bốn trong mười mục của kế hoạch (hai mục bối cảnh, §7–§8,
§9–§11) thuần nội bộ — chúng không thêm gì cho người dùng, chúng làm cho các mục còn lại đáng tin.
C2 là ví dụ rõ nhất: plugin mẫu được **ship nhưng tắt mặc định**, nên mặc định status row phải
byte-identical với một phiên chưa từng load plugin.

## Vì sao M3 không thể là "port Claude Code"

Ba điều, cả ba đều phải nói trước khi viết dòng code M3 đầu tiên.

**Cái gì đóng.** Bề mặt plugin của status line đang đóng, và đóng kiểu không thể lấn: `schema.ts` là
một union 27 id đã niêm phong, `status-line/index.ts` là barrel 6 dòng không có `register*` nào, còn
`setStatus` đã đi dây end to end. Hai claim "bề mặt plugin đóng" ấy không được để nằm trong văn xuôi —
mục bối cảnh ctx1 biến chúng thành hai test (`status-line-segment-closure.test.ts` và
`status-line-segment-picker.test.ts`) để đỏ nếu có ai đó mở nửa seam về sau. Hệ quả trực tiếp có mặt
ngay trong kế hoạch: M3-C1 bị gỡ khỏi M3, và B3 không bị C1 chặn.

**Cái gì đảo ngược.** Framing "cell buffer" và "pre-styled ANSI" trong bản brief gốc **không có bằng
chứng nào ở bất cứ đâu**; dossier chưa từng phân tích tương thích runtime CCB-engine với omp-plugin.
Mục (4) của `docs/plugin-surface-closure.md` — "what this does not prove" — phải sống nguyên. Xoá nó là
tự nhập lại claim chưa kiểm chứng mà chính mục đó sinh ra để cách ly.

**Cái gì phải mở core trước.** Seam status line chưa tồn tại: `registerStatusLineSegment` không có ở bất
kỳ đâu trong `packages/**`, các hit duy nhất nằm trong tài liệu kế hoạch. Nên C2 và D2 không tiêu thụ
seam đó, và dưới phương án 2 hoặc 3 của M2-OQ3 thì cả hai đều không bị chặn. Ngược lại, A2 + D1 buộc
phải mở core: khai báo capability và handler là **một commit không chia**, nằm trong `mcp/types.ts`,
`mcp/client.ts`, `mcp/manager.ts` cùng bốn chính sách per-mode (interactive / ACP / RPC / headless —
headless không có file riêng nhưng vẫn phải trả lời, và câu trả lời của nó nằm trong commit không chia).

Port code sẽ vỡ ở đúng chỗ này: cả ba điều trên đều là về *bề mặt*, mà bề mặt thì đang đóng. Claude
Code đóng và §8 không cấp giấy phép, nên port code nghĩa là nhập một hợp đồng runtime mà chưa ai kiểm
chứng là tương thích. Port ý tưởng nghĩa là port cái người dùng quan sát được, rồi dựng lại từ seam
đã kiểm chứng — và đó là lý do mục ctx1 phải là lá đầu tiên chạy, trước cả khi lên lịch.

## Không làm gì

- **Không sao chép, không dịch, không suy ra từ cây Claude Code.** `docs/clean-room-policy.md` ở §7–§8
  mang bốn hàng phân loại với neo đã sửa; lưới ký của nó hiện các mục §8.6 1/3/4/5 là **OPEN**, không
  được âm thầm tick. `CONTRIBUTING.md:82-91` mới chỉ yêu cầu quyền gửi, chưa nêu hiểm hại cụ thể — đó
  chính là lỗ hổng §8.6 #5 chỉ ra, và nó chỉ đóng lại được bằng câu trả lời của con người.
- **Không thêm test grep cho invariant `setFrameProvider` một call site.** Vắng mặt nó là một phần của
  cổng: thấy một test grep-based cho nó trong diff nghĩa là mục đó sai, không phải thiếu.
- **Không để C2 đi kèm countdown.** D2 báo đúng tỉ lệ hit mà `cache_hit` đã tính; phần S của ước lượng
  là hệ quả của việc từ chối countdown, không phải giấy phép để mở lại nửa bị cắt. Đây là cách sai dễ
  xảy ra nhất, vì bản tham chiếu có sẵn countdown và nó đi cùng hit rate trong cùng một mảng.
- **Không đúc API công khai cho tool-renderer.** B1 pin cái khe đang có và sửa **0 dòng core**; quyết
  định có nâng thành `registerToolRenderer` không thuộc M3, nó là nợ bàn giao M4/M5 #4.
- **Không gộp A4-PERSIST vào commit hiển thị.** Nó chờ M2 WI-8a (`manager.ts:942-949`) và là một mục
  riêng ~1 ngày. Che mask hiển thị mà chưa sửa phần lưu là cho người dùng một sự yên tâm giả.
- **Không cộng C1** — nó không còn tồn tại trong kế hoạch này.
- **Không thêm cổng `bun test` cho ctx2.** ctx2 nói thẳng: không có hành vi runtime ở đó để bảo vệ,
  và một test chiếm chỗ sẽ vi phạm AGENTS.md. (ctx1 thì ngược lại: chính nó là cổng — xem dòng trên.)
- **Không biến cổng grep thành test grep.** Đây là rủi ro chủ đạo của tail1: G4/G4b là cổng
  source-grep, chúng không được biến thành một file test grep.
- **C2 được phép trượt nếu Q6 chưa có câu trả lời.** Đây là chỉ dẫn của chính kế hoạch; ship trên một
  tiền đề không nói ra còn tệ hơn là trượt.

## Điều kiện tiên quyết

**Addon native phải build trước khi `bun test` có nghĩa là gì.** Phần lớn cổng của M3 là cổng test:
nếu addon chưa build thì chúng không chạy, chỉ có `bun run check:ts` chạy được — và nó chạy xanh mà
không cần addon (đo lại tại HEAD e040a60: exit 0, cả 16 package type-check Done). Thứ tự đúng là
`brew install bazelisk` rồi `bun --cwd=packages/natives run build`, và chỉ sau đó mới tính kết quả
test là bằng chứng.

**Một lần chạy test đỏ TRƯỚC khi build addon không phải là tín hiệu.** Nó không phân biệt được "thay
đổi của tôi làm hỏng" với "thiếu addon". Với ctx1, người viết nói thẳng: không có nó thì mục đó chỉ là
một tài liệu có tham vọng. Nếu addon không build được, ctx1 kẹt ở chân (2) và việc đúng là **báo lên**,
không phải vòng qua.

**Điều kiện riêng của M3**, ngoài môi trường:

- Hai mục bối cảnh (ctx1, ctx2) phải có mặt trước khi lên lịch s1–s6. ctx2 chặn cả 16 work item; ctx1
  chặn theo kiểu tiền đề — mục S1 đang điều hướng bằng số dòng của kế hoạch và đã phải sửa giữa chừng,
  nên mọi mục trích dẫn neo §1–§2 thừa hưởng cùng một lớp trôi neo đó.
- **P0 và P1 phải đóng bằng văn bản trước khi sóng 1 bắt đầu.** Sóng 1 nói thẳng: "Before ANY code is
  written". P0 là provenance đặc tả của A8 cộng vị trí bằng chứng, và bằng chứng đó **không được**
  là checkout chưa track ở `~/Projects/claude-code-ref`. P1 là preset nào nhận `usage`; A1 không bắt
  đầu được nếu thiếu nó.
- **P0/P1 không phải là loại duy nhất không thể đỏ.** Chúng là quyết định của con người, không phải
  code, và một câu trả lời chưa ghi lại trông y hệt một câu trả lời đã ghi lại cho tới khi ai đó mở đặc
  tả ra kiểm. Ba chân cổng nữa cũng không tự đỏ và cần nói thẳng: chân (3) của ctx1 (tài liệu — số
  dòng sai trong văn xuôi không báo đỏ ở đâu cả), cổng (a)+(g) của s2 (bảng đo thật + hai câu hỏi
  người), và cổng (6) của s4 (kiểm tra lúc review PR). Đó là lý do tail2 đòi một hàng trong §10 có
  người phụ trách và hạn chót — và vì sao ctx1 được giao hai file test: để các bất biến load-bearing
  nằm trong phần chạy được, không nằm trong phần văn xuôi.

## Thứ tự thực hiện

Nhìn tổng quan trước đã:

| Mục | Nội dung | Cỡ | Chặn bởi |
| --- | --- | --- | --- |
| ctx1 | `docs/plugin-surface-closure.md` + 2 test đóng bề mặt | ~1 ngày | gì cả (chân (2) cần addon) |
| ctx2 | Sổ neo đã kiểm chứng cho §3–§5, 60 neo | S, nửa ngày | gì cả |
| Sóng 1 | A1, A8, A6, A5 | ~6 ngày | P0, P1 |
| Sóng 2 | A3, A7, D3 | ~6–7 ngày | D3 chờ A3 (cùng file) |
| Sóng 3 | A2 + D1, một commit | ~5 ngày | gì cả |
| Sóng 4 | A4-display, B1, B2, B3 (+A4-PERSIST riêng) | ~4 ngày (+1) | A4-PERSIST chờ M2 WI-8a |
| Sóng 5 | C2, D2 | ~3–4 ngày | C2 chờ Q6 |
| Sóng 6 | A9 | S, ~1 ngày | gì cả |
| tail1 §7–§8 | script cổng + `docs/clean-room-policy.md` | S, nửa ngày | sau sóng 6 |
| tail2 §9–§11 | rủi ro, câu hỏi mở, định nghĩa xong | ~2 ngày | song song sóng 6 |

Tổng phần code ~25–27 ngày công; ~4 ngày cho toàn bộ phần bối cảnh và phần đuôi.

**Ghim lại baseline.** Các neo số dòng trong đặc tả (`plan lines 7294-7346`, `7347-7360`,
`plan:7401-7405`) được chốt ở 808b365; ở HEAD e040a60 file plan đã dài 10234 -> 11741 dòng và sóng M3
đã dời sang 8749/8801/8854/8868/8917/8956. Phải chạy lại lệnh trước khi dùng.

**Hai mục bối cảnh, trước sóng 1.** Chạy song song được với nhau — cả hai đều không có phụ thuộc
trên. ctx2 nhanh và tự chứa (chạy script khẳng định in `failures: 0`; 7 trong 60 khẳng định là số dòng
đã sửa, nên ai viết từ kế hoạch sẽ thấy đỏ ngay lần chạy đầu). ctx1 lâu hơn nửa ngày và chân (2) của
nó treo trên addon. Sau khi cả hai xong, mọi mục S1–S6 điều hướng bằng một nguồn neo đúng thay vì số
dòng của kế hoạch.

**Sóng 1 — bốn khoảng mở nhỏ.** Bàn giao: preset có quota, tmux prefix hiện trong keybinding hints,
quyết định nhóm read-tool đến từ một predicate có dữ liệu ở cả bảy chỗ, và chỉ báo stall theo pha
kèm breakdown frame-time. Cần có trước: P0 + P1 đóng bằng văn bản. Sau khi kết thúc: năm file test
xanh, `bun run check:ts` exit 0, và mọi neo trong đặc tả được kiểm lại lúc code chứ không tin bản kế
hoạch. Riêng A8: test phải **chứng minh** đã đi vào nhánh tmux thật, vì guard `isBunTestRuntime()`
ở `tmux.ts:49` làm cho một bản test xanh mà không kiểm tra gì rất dễ xảy ra — vì vậy bộ test bắt buộc
phải có một khẳng định rằng nhánh tmux thực sự được vào.

**Sóng 2 — UX cảm nhận được ngay.** A3 và A7 không phụ thuộc gì; D3 phải đến **sau** A3 vì cùng sửa
`packages/tui/src/overlays/agent-transcript-viewer.ts` và hằng số wheel (:470) nằm ngay vùng đó — làm
D3 trước nghĩa là sửa hằng số hai lần trong một file. Sau khi kết thúc: bảng đo có **ba số thật cho
mỗi terminal** (Ghostty, Terminal.app, VS Code, Cursor) và `MEASURED_THRESHOLDS` giữ đúng những số
đó; con số 200/1500/5 trong kế hoạch là placeholder, ship nguyên xi là hỏng cổng. Ba file test mới
phải thực sự chạy; `packages/coding-agent/test/interactive-mode-status.test.ts` phải xanh với các
khẳng định sẵn có của nó **không bị sửa** (`toHaveLength(2)` / `toHaveLength(5)`); file vẫn được phép
thêm khẳng định mới, vì nếu A7 buộc phải đụng vào đó thì nhánh unkeyed đã đổi hành vi; và grep
`wheel * [0-9]` cùng
`delta * 3` dưới `packages/tui/src` phải trả 0 hit. Từ sóng này trở đi, mọi bề mặt cuộn mới phải đi qua
`packages/tui/src/mouse-wheel.ts` chứ không tự nhân thêm một hệ số.

**Sóng 3 — MCP elicitation, không chia.** Không có phụ thuộc nào, nên chạy song song với sóng 1 và 2
được. ~5 ngày là **một đơn vị không tách**; khai báo capability và handler là hai commit thì tính là
chưa xong, và test `elicitation-capability.test.ts` tồn tại chính để bản build nửa vời thất bại thay vì
review thấy ổn. Sau khi kết thúc: test đi cả hai chiều, với nửa âm khẳng định `code === -32601` khi
ép elicit lên manager không có handler.

**Sóng 4 — bề mặt plugin.** Ba trong bốn mục mở được ngay hôm nay; chỉ A4-PERSIST chờ M2 WI-8a. Sau
khi kết thúc: bốn file test tồn tại và xanh; khẳng định mask của A4 phải đúng **cả trước và sau** một
vòng chọn submenu (nó đỏ trên cây sạch vì `settings-list.ts:797` gán lại `currentValue` khi select, tức
tự vẽ lại plaintext — một mask chỉ lúc build sẽ không làm nó xanh); B1 pin qua **nhánh SOURCE remap**
và fixture phải được nạp **bằng đường dẫn**, không import tĩnh, nếu không khẳng định module-identity
thành đúng vô điều kiện. Nói thẳng: cổng của B1 là cổng yếu nhất — nó xanh trước và sau, chỉ là
cảnh báo lại cho một refactor tương lai đóng khe, đừng tính nó là bằng chứng B1 đã làm việc.

**Sóng 5 — người tiêu thụ đầu tiên của seam M2 chốt.** D2 không bị chặn (nó không tiêu thụ
`registerStatusLineSegment`; dưới phương án 2 và 3 của M2-OQ3 thì C2 cũng vậy). C2 bị Q6 chặn. Sau
khi kết thúc: D2 có ba hợp đồng âm — hàng render không chứa countdown và không chứa nhãn TTL, tỉ lệ
của segment mới bằng đúng tỉ lệ của `cache_hit` trên usage giống nhau, và không có usage thì segment
không đóng góp gì. C2: **case đầu tiên là case tắt** — thiếu key `enabled` và `enabled: false` đều
sinh zero spawn và cho status row byte-identical với baseline không có plugin. Và
`git grep -n "examples/extensions"` dưới `src` phải là 0 hit, nếu không plugin sẽ tự load và phá vỡ
bảo đảm "inert by default".

**Sóng 6 — màu an toàn.** Không phụ thuộc, không chặn ai, chạy song song từ đầu. Sau khi kết thúc:
cổng quan trọng nhất là test **negative-identity** — nó đỏ nếu nhánh `colorBlindMode` bị nhấc lên trên
`resolveThemeColors` (lúc đó remap chạy trên chuỗi `$var` chưa resolve và đổi mọi theme bất kể cờ),
nếu nhánh được mở rộng sang một đường chạy khi cờ tắt, hoặc nếu remap mutate trạng thái dùng chung
rò vào theme khi cờ tắt. Cả ba đều dễ phạm và cả ba đều vô hình khi review. Harness tương phản 4.5
được kỳ vọng là cổng đắt nhất: nó nhiều khả năng sẽ lộ ra các theme vốn đã sát ngưỡng, và đó là danh
sách cần sửa, không phải lý do hạ ngưỡng trong im lặng.

**Còn chạy song song được cái gì.** Từ sau ctx1/ctx2, **S1, S2, S3, S6 không phụ thuộc lẫn nhau** —
bốn sóng này có thể chạy đồng thời hoàn toàn. S4 mở được ngay, chỉ A4-PERSIST tách ra. S5 tách D2 ra
chạy được. tail2 viết song song với sóng 6 và cần có đặc tả của s1/s4/s5/s6 để ghép, nhưng cổng
P0/P1 vẫn phải đóng trước khi s1 bắt đầu. tail1 là hàng cuối: nó tiêu thụ s1, s4, s5, s6 và không sóng
nào chờ nó.

## Quyết định cần chốt trước khi code

| Mã | Câu hỏi | Chặn cái gì |
| --- | --- | --- |
| P0 | Provenance đặc tả của A8: black-box hay omp-native? Bằng chứng ở đâu — và **không phải** checkout chưa track `~/Projects/claude-code-ref` | A8, cả sóng 1 |
| P1 | `usage` vào cả bảy preset hay chỉ `full` + `nerd`? Nêu tên từng preset | A1, cả sóng 1 |
| Q6 | Câu hỏi niềm tin cho C2 — chưa ai trả lời tại HEAD e040a60 | C2 (D2 không chặn) |
| — | Hai kiểm tra `toolName === "read"` phía kết quả (`chat-transcript-builder.ts:507`, `ui-helpers.ts:663`) có nằm trong phạm vi A6 không? | A6 |
| — | `acp-event-mapper.ts:645` có phải một chỗ gán nhóm read không? | A6 |
| — | Ngữ nghĩa tăng tốc `handleWheel`, và setting mới có chỉ nằm trong file cấu hình không? Cả hai đổi hành vi quan sát được | A3 |

## Quyết định cần bạn chốt

| Mã | Câu hỏi | Hậu quả nếu để ngỏ |
| --- | --- | --- |
| M2-OQ3 | Cơ chế đăng ký mở rộng status line, ba nhánh | §11 viết ba nhánh; C2/D2 vô hại dưới phương án 2–3 |
| Q7 | A9 theo biến thể S hay M | Chặn §11 clause 9 và câu "M3-C2 được trượt" |
| M2 WI-8a | Đường ghi sau khi `manager.ts:942-949` đổi | A4-PERSIST không ship, phải ghi deferral trong PR |
| Q-A | Trả lời người cho §8.6 #5 | `CONTRIBUTING.md` không có addendum; câu licensing gốc phải sống nguyên |
| — | C2 có trượt hay không, nếu Q6 chưa có | Có quyết định thì đóng; không có thì trượt |

## Quy ước khi đọc

Văn xuôi tiếng Việt, giữ nguyên mọi đường dẫn, neo `file:line`, tên định danh, câu lệnh và tên file
test. Kiểm tra kiểu bằng `bun check` và `bun test`; **không bao giờ** `tsc` — dự án cấm. Trong test,
không bao giờ source-grep một file implementation: test phải chạy code rồi khẳng định hợp đồng quan
sát được, vì đọc text của file rồi `expect(src).toContain(...)` là test cách code trông chứ không
phải cách nó chạy, và nó vẫn xanh khi hành vi đã hỏng. Không dùng `mock.module()` — nó mutate
registry module toàn cục và rò sang các file khác; spy trên đối tượng module đã import rồi
`vi.restoreAllMocks()` trong `afterEach`. Mọi thứ hiển thị trong TUI đều phải sanitize: `replaceTabs`,
`truncateToWidth`, `shortenPath`, `PREVIEW_LIMITS` — kể cả ở nhánh lỗi, vì message lỗi hay nhúng nguyên
file và chính nó phá terminal. Chính sách model/provider không được viết trong TypeScript: nó nằm ở cây
`.kdl` trong `packages/catalog/src/compat/rules/`, rồi sinh ra bằng `bun run gen:compat` và commit
`rules.json` cùng lúc.

Và một điều nối từng đặc tả của M3: **đừng chép neo từ văn xuôi của kế hoạch.** tail1 đo được bảy neo
`* 3` trong §7.1 đều sai (lệch +1 đến +13), và `usage-dashboard.ts:753` thực ra là 759. Mọi neo phải
được chốt lại bằng một câu lệnh chạy thật trên cây hiện tại.
