import { readFileSync, writeFileSync } from "node:fs";

const SRC = "/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/m5-index/corrections-b.json";
const OUT = "/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/m5-md/90-back2b.md";

const all = JSON.parse(readFileSync(SRC, "utf8"));

const ORDER = ["W8b", "W9", "W10", "W11", "W12", "W13", "W13p"];

const LEADS = {
	W8b: "Ba đính chính, ba kiểu sai khác nhau và không gộp được: enum `disposition` thiếu một giá trị, cổng kiểm không chạy được trên máy này, và mô tả vị trí của W8b trong milestone sai.",
	W9: "Hai mươi mốt đính chính — work item bị nhiều nhất. Sái lặp theo bốn kiểu: **sai số dòng ở neo** (B1, B2, B7, B8), **đếm thiếu và bề mặt bị thu nhỏ** (B3, B4, B5, B6, B20, B21), **đánh giá độ phủ ngược chiều với thực tế** (B9, B10), **cổng đỏ vì lý do không liên quan tới W9** (B16, B17). Năm dòng còn lại không thuộc bốn kiểu đó: B11 (tài liệu đã cũ), B13 (hai dòng đúng nhưng chỉ một phần), B14, B15, B18. Hai dòng plan nói đúng và chỉ cần giữ: B12, B19.",
	W10: "Mười đính chính. **Số đếm và neo sai** ở bốn dòng đầu: B1 (53/50 → 65/62), B2 (11 → 12 dòng `runs-on`, mọi số dòng của plan đều cũ), B4 (một neo trỏ vào comment, một neo lệch dòng, 4 → 7 file), B5 (18 → 28 lượt, thiếu đúng bốn dòng quyết định tên lệnh người dùng gõ). B3 nói ngược với thực tế và đổi nghĩa của \"xong\" trong chính mục nghiệm thu của W10. B8 bỏ sót file, B9 là cổng đỏ sẵn, B10 là một định danh đăng ký ngoài repo mà plan chỉ nói một câu, không có số dòng. Hai dòng plan nói đúng và phải giữ nguyên: B6, B7 — B7 kèm một bổ sung về hai consumer chưa ai nhắc.",
	W11: "Mười đính chính. Sái lặp rõ nhất ở sáu dòng `PARTIALLY_FALSE` (B1, B2, B3, B4, B5, B7): số đếm sai **và** kết luận kéo theo cũng sai, nên kỹ sư sẽ sửa — hoặc bảo vệ — nhầm thứ. Hai dòng `FALSE` (B6, B8) lệch hẳn: một cái đưa sai hướng xử lý wire, một cái là cổng không phân biệt được. Hai dòng `VERIFIED_TRUE` (B9, B10) phải giữ nguyên: chúng là cơ sở để bắt buộc ghép `bun run test:py` vào cổng và để W11 phụ thuộc W1 đúng thứ tự.",
	W12: "Sáu đính chính, mỗi cái một việc: B1 sai số dòng; B2 sai cả cơ chế chứ không chỉ số dòng; B3 một việc đã được phủ ở file khác; B4 một cổng đã tồn tại nên W12 chỉ cần chạy lại chứ không cần viết code; B5 một cổng đỏ sẵn; B6 một phụ thuộc thật bị bỏ sót khỏi danh sách \"Vị trí\".",
	W13: "Mười lăm đính chính theo bốn nhóm: **số đếm sai** (B1, B2, B3, B9), **kết luận sai dù phần số đúng** (B4, B5, B6, B7, B8, B11, B13, B14), **một loại file bị tính như văn xuôi** (B12), **cổng không đỏ được** (B10, B15). Ba số ở B1 không tái lập được bằng bất kỳ biến thể nào của biểu thức đã ghim ở §2.1 — số cũ phải bỏ hẳn chứ không sửa từng chữ số.",
	W13p: "Sáu đính chính. Bốn dòng cùng một kiểu: plan dừng ở bề mặt mà `grep` nhìn thấy và bỏ sót site mà `grep` không thấy (B1, B2, B3, B6). B4 là mâu thuẫn nội tại với chính bảng open-questions. B5 gồm hai lỗi tách biệt: một cổng không phân biệt được, và một test sẽ xanh dưới cả hai tên.",
};

// Two source spans contain backticks of their own: CommonMark needs a two-backtick
// delimiter to render them, and the source's protective backslashes must go.
const SPAN_FIXES = [
	[
		"` * `__omp_worker_text_predict`, started through the `text-predict` global broker).`",
		"`` ` * `__omp_worker_text_predict`, started through the `text-predict` global broker). ``",
	],
	[
		'`for (const k in result) { if (k.startsWith("OMP_")) result[\\`PI_${k.slice(4)}\\`] = result[k]; }`',
		'``for (const k in result) { if (k.startsWith("OMP_")) result[`PI_${k.slice(4)}`] = result[k]; }``',
	],
];
const applyFixes = s => SPAN_FIXES.reduce((acc, [from, to]) => acc.split(from).join(to), s);

// render a cell for a GFM table: nested-backtick spans get a two-backtick delimiter,
// then pipes become \| (already-escaped ones are left alone)
const cell = s =>
	applyFixes(s)
		.replace(/\n/g, " ")
		.replace(/\\?\|/g, m => (m === "|" ? "\\|" : m))
		.trim();

const out = [];
out.push(
	"Phần 2/2 gom **71 đính chính** trên 7 work item: W8b, W9, W10, W11, W12, W13, W13p. Bảng gom theo work item; mỗi dòng mang một mã `<work item>-B<n>` — hậu tố `B` đánh dấu phần 2/2, phần 1/2 dùng mã không hậu tố — và trong phần dẫn của từng mục, mã được viết tắt thành `Bn`. Bằng chứng nằm trong danh sách ngay dưới bảng với đúng mã đó, giữ nguyên từng chữ kể cả câu lệnh và con số, để người đọc tự chạy lại.",
	"",
);

let total = 0;
for (const id of ORDER) {
	const items = all.filter(c => c.id === id);
	if (items.length === 0) continue;
	total += items.length;

	out.push(`### ${id}`, "", LEADS[id], "");
	out.push("| Work item | Claim của plan | Verdict | Đính chính |");
	out.push("| --- | --- | --- | --- |");
	items.forEach((c, i) => {
		out.push(`| ${id}-B${i + 1} | ${cell(c.claim)} | ${cell(c.verdict)} | ${cell(c.correction)} |`);
	});
	out.push("");
	out.push(`**Bằng chứng (${items.length} mục, theo thứ tự dòng):**`, "");
	items.forEach((c, i) => {
		out.push(`${i + 1}. **${id}-B${i + 1}** — ${applyFixes(c.evidence).replace(/\n/g, " ")}`);
	});
	out.push("");
}

if (total !== all.length) {
	throw new Error(`coverage mismatch: emitted ${total} of ${all.length}`);
}

writeFileSync(OUT, out.join("\n"), "utf8");
console.log(`wrote ${OUT}: ${all.length} corrections, ${out.length} lines`);
