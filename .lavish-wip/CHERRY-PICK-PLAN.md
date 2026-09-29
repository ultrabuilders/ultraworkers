# Kế hoạch cherry-pick sang `main` — sau khi beads chốt

Chạy SAU khi vòng polish cuối cùng xong và `.beads/` đã được `br sync --flush-only` + commit.
Chạy sớm hơn thì pick vào một `.beads/` còn đang bị agent sửa, và commit đó sẽ thành stale ngay.

## Thứ tự

1. `br sync --flush-only --force` → xuất `.beads/issues.jsonl` (dùng `--force`: sửa timestamp
   sửa trực tiếp DB nên beads không tự đánh dấu dirty).
2. Commit `.beads/` trên `milestone-1`.
3. `git checkout main`.
4. Cherry-pick theo nhóm dưới đây.
5. `br dep cycles` phải vẫn rỗng; `br list` phải vẫn 105 work item + 9 epic.
6. **Đọc lại `git status`** — `.beads/issues.jsonl` phải sạch, không có conflict marker.

## Nhóm commit

| nhóm | commit | nội dung |
|---|---|---|
| `.beads` | `300ce8d` (+ commit polish mới) | 105 work item, 9 epic, 129 cạnh |
| kế hoạch | 49 commit | `MILESTONE_1..8`, `COMPREHENSIVE`, `PACKAGE_REORGANIZATION` |
| `.lavish` | 15 commit | quyết định, residue, gap register |

**Rủi ro thật:** 49 + 15 commit là nhiều. Nếu chọn từng commit, một commit đụng cả kế hoạch lẫn
`.lavish` sẽ phải tách. Đơn giản và ít rủi ro hơn:

```bash
# 1 commit duy nhất, đúng nội dung, không kéo theo lịch sử rác
git checkout main
git checkout milestone-1 -- MILESTONE_*_EXECUTION_PLAN.md COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md \
                             PACKAGE_REORGANIZATION_PLAN.md .lavish .lavish-wip .beads
git commit -m "plan: bring the milestone plans, .lavish records and the beads workspace onto main"
```

Cách này **không** phải cherry-pick thật, nó là checkout-theo-path. Nó cho đúng kết quả mong
muốn (một commit gọn, không kéo commit rác) với rủi ro thấp hơn nhiều.

**Nếu chủ sở hữu vẫn muốn cherry-pick thật** (muốn giữ lịch sử từng bước):

```bash
git checkout main
git cherry-pick 300ce8d          # .beads — một commit, sạch
git log --oneline main..milestone-1 -- MILESTONE_1_EXECUTION_PLAN.md   # xem thứ tự
# rồi cherry-pick theo thứ tự thời gian, bỏ commit không đụng file cần
```

Cherry-pick 49 commit có xác suất conflict không bằng 0, và mỗi conflict phải phán đoán tay.

## Không được bỏ sót

- `.beads/` — đã yêu cầu rõ, và là commit `300ce8d`.
- `.omp/skills/sync-squashed-fork/` — skill nằm trong repo; mất nó thì mất công cụ sync.
- `AGENTS.md` — đã có trên `origin/main`, nhưng milestone-1 có thêm mục programme goal; **kiểm
  lại nội dung sau khi checkout**, đừng để bản cũ đè bản mới.

## Sau khi cherry-pick

```bash
br dep cycles                 # phải rỗng
br list --json | jq 'length'  # phải là 114 (105 + 9)
git status --porcelain        # phải sạch
```

Nếu `br` không thấy workspace (vì `.beads/config.yaml` sai path), chạy `br init --prefix omp`
rồi `br sync --import-only` — **không** init lại rồi mất dữ liệu.
