---
name: sync-squashed-fork
description: Pull upstream code into a squashed fork as exactly one new commit, carrying the fork's git identity and its own docs but zero upstream commits and zero upstream authors. Use when syncing or updating a mirror/fork, when "sync from upstream", "update the mirror", "cập nhật từ upstream", or "đồng bộ repo", or when upstream code must be merged in without the original author attribution. Covers the case where the fork was published as a single commit and therefore has no merge base with upstream, where `git merge --squash` and `git cherry-pick` both die with `refusing to merge unrelated histories`.
---

# Sync a Squashed Fork

Pull upstream code into a fork that was published as one commit, producing **exactly one new
commit** authored by the fork's owner, with **zero upstream commits and zero upstream authors**.

## The constraint that shapes everything

A squashed mirror has **no merge base** with upstream. Both of these fail:

```
$ git merge --squash upstream/main
fatal: refusing to merge unrelated histories
```

`git cherry-pick` fails the same way. So don't reach for merge or cherry-pick — build the commit
directly from upstream's tree object instead.

## Run the script

```bash
bash .omp/skills/sync-squashed-fork/scripts/sync-fork.sh \
  --preserve COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
```

It refuses to run on a dirty worktree, prints the change summary, and **does not push** unless
you pass `--push`. Run with `--help` for all flags.

The dirty-worktree check is load-bearing, not fussy. The script stages with `git add -A`, so any
untracked file lying around — an editor scratch dir, a stray `.env`, this skill's own `.omp/`
on a fresh checkout — would otherwise be swept into the sync commit and land on the public branch.
Commit or stash first, and treat the error as the warning it is.

It also refuses to run without a **repo-local** `user.email`. A fresh clone inherits the global
identity and would silently stamp the wrong author on a public branch. Set it once with
`git config --local user.email <you@example.com>`, or pass `--allow-global-identity` if that is
really what you want.

Under the hood:

```bash
git fetch upstream
git read-tree --reset -u upstream/main          # index + worktree := upstream tree
git checkout main -- <preserve-path>...         # restore fork-only files
git add -A
git commit -m "Sync from upstream ..."
```

`read-tree` replaces the index without moving `HEAD`, so the new commit's parent is the old
`main`. History stays a chain of one-commit-per-sync, and no upstream commit is ever reachable.

## Verify before pushing

```bash
git diff --stat main upstream/main     # must list ONLY the preserved paths
git log --format='%an <%ae>' | sort -u # must list only the fork owner's identities
```

If the first lists more than the preserved paths, the preserve list is incomplete — upstream
removed files the fork still had. Add them or accept the deletion deliberately; do not discover
this after pushing.

## Reading the delta without getting it backwards

`git diff --name-status main upstream/main` shows changes going **from main to upstream**:

| Code | Meaning | Effect of sync |
|---|---|---|
| `A` | only in upstream | **added** |
| `D` | only in main | **deleted** |
| `M` | differs | updated |

This trips people up constantly — a repo's "upstream-only files" are the `A` rows, not the `D` rows.

**Deletions are not renames.** `git diff -M` finds no rename matches between releases. A run of
`D` rows is upstream genuinely removing those files, which is usually intended.

## Choosing what to preserve

Preserve only what the fork genuinely owns. For `ultrabuilders/ultraworkers` that is exactly one
file: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`.

Verify ownership before preserving — do not assume a fork-only file is fork-authored:

```bash
git log --oneline --all --diff-filter=A -- <path>   # which commit added it, upstream included
```

`assets/banner.html` is a trap: it is absent from upstream's tip, but it was added **upstream** in
`458437d4b4` and later replaced there. "Absent upstream" is not the same as "belongs to the fork".

## Push policy

Default is local-only. **Confirm with the user before pushing** — it advances a public branch and
is visible to everyone immediately. When the sync commit's parent is the previous `main`, the push
is a fast-forward and needs no `--force`. Only reach for `--force-with-lease` if the remote was
moved from elsewhere, and say so explicitly rather than defaulting to it.

The script tags each sync commit `sync/<upstream-sha>`, which makes the next run's commit count
exact via `git rev-list --count sync/HEAD..upstream/main`. Pass `--no-tag` to skip tagging.
