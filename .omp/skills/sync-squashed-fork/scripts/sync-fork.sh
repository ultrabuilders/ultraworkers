#!/usr/bin/env bash
# Sync a squashed fork from upstream into a single new commit.
# See ../SKILL.md for why merge/cherry-pick cannot be used here.
set -euo pipefail

UPSTREAM="upstream"
BRANCH="main"
PUSH=0
TAG=1
ALLOW_GLOBAL=0
MSG=""
PRESERVE=()

usage() {
  cat <<'EOF'
Usage: sync-fork.sh [options]

  --upstream <remote>  upstream remote name          (default: upstream)
  --branch <branch>    branch to sync onto           (default: main)
  --preserve <path>    fork-only file to keep; repeatable
  --message <text>     commit message
  --push               push to origin afterwards    (default: local only)
  --no-tag             do not tag the sync commit
  --allow-global-identity  proceed without a repo-local user.email
  -h, --help           show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --upstream) UPSTREAM="$2"; shift 2 ;;
    --branch)   BRANCH="$2";   shift 2 ;;
    --preserve) PRESERVE+=("$2"); shift 2 ;;
    --message)  MSG="$2";      shift 2 ;;
    --push)     PUSH=1;        shift ;;
    --no-tag)   TAG=0;         shift ;;
    --allow-global-identity) ALLOW_GLOBAL=1; shift ;;
    -h|--help)  usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage; exit 2 ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: worktree is dirty. Commit or stash first." >&2
  git status --short | head -20 >&2
  exit 1
fi

# Correct authorship is the entire point of this script. A fresh clone has no
# repo-local identity and silently falls back to the global one, which stamps the
# wrong name on a public branch. Refuse rather than guess.
AUTHOR_NAME="$(git config --get user.name || true)"
AUTHOR_EMAIL="$(git config --get user.email || true)"
LOCAL_EMAIL="$(git config --local --get user.email || true)"

if [[ -z "$LOCAL_EMAIL" && $ALLOW_GLOBAL -eq 0 ]]; then
  cat >&2 <<EOF
error: no repo-local user.email, so this commit would be attributed to the global
       identity instead — the wrong name on a public branch.

       would commit as: ${AUTHOR_NAME:-<unset>} <${AUTHOR_EMAIL:-<unset>}>

  Set the fork owner's identity:
    git config --local user.name  "<your name>"
    git config --local user.email "<you@example.com>"

  Or pass --allow-global-identity if that is genuinely what you want.
EOF
  exit 1
fi
echo "==> author: ${AUTHOR_NAME:-<unset>} <${AUTHOR_EMAIL:-<unset>}>"

git remote get-url "$UPSTREAM" >/dev/null 2>&1 || {
  echo "error: no remote '$UPSTREAM'. Add it first:" >&2
  echo "  git remote add $UPSTREAM <url>" >&2
  exit 1
}

# Fetch before checking the tracking ref: on a fresh clone the remote exists but
# refs/remotes/<upstream>/<branch> does not until this runs.
echo "==> fetching $UPSTREAM"
git fetch "$UPSTREAM" --tags --quiet

git rev-parse --verify --quiet "$UPSTREAM/$BRANCH" >/dev/null || {
  echo "error: remote '$UPSTREAM' has no branch '$BRANCH'." >&2
  exit 1
}

UP_REF="$UPSTREAM/$BRANCH"
UP_TREE="$(git rev-parse "$UP_REF^{tree}")"
UP_SHA="$(git rev-parse --short "$UP_REF")"

# Exact commit count only when a previous sync tag exists; otherwise say so.
COUNT="unknown number of"
if [[ $TAG -eq 1 ]] && git rev-parse --verify --quiet sync/HEAD >/dev/null; then
  COUNT="$(git rev-list --count sync/HEAD.."$UP_REF")"
fi

echo "==> upstream $UP_REF @ $UP_SHA ($COUNT commits since last sync)"
echo "==> preserve: ${PRESERVE[*]:-(none)}"
echo

# Replace index + worktree with upstream's tree, then re-apply fork-only files.
git read-tree --reset -u "$UP_REF"
for path in "${PRESERVE[@]}"; do
  if git cat-file -e "$BRANCH:$path" 2>/dev/null; then
    git checkout "$BRANCH" -- "$path"
  else
    echo "error: '$path' not found on $BRANCH. Refusing to guess." >&2
    exit 1
  fi
done

git add -A
echo "==> change summary"
git diff --cached --shortstat "$BRANCH" | sed 's/^/    /'
echo

# The staged tree must differ from upstream in exactly the preserved paths and
# nothing else. Compare the index, not the branch tip: the branch is still the
# pre-sync commit, so diffing it against upstream would flag the whole update.
if [[ ${#PRESERVE[@]} -gt 0 ]]; then
  STRAY="$(git diff --cached --name-only "$UP_REF" | grep -vxF "${PRESERVE[@]}" || true)"
else
  STRAY="$(git diff --cached --name-only "$UP_REF")"
fi
if [[ -n "$STRAY" ]]; then
  echo "error: these paths would diverge from upstream but are not preserved:" >&2
  echo "$STRAY" | sed 's/^/    /' >&2
  echo "  Add them with --preserve, or accept the change deliberately." >&2
  git reset --hard "$BRANCH" >/dev/null
  exit 1
fi

if git diff --cached --quiet "$BRANCH"; then
  echo "==> already in sync with $UP_REF, nothing to commit"
  exit 0
fi

if [[ -z "$MSG" ]]; then
  MSG="Sync from upstream $UP_REF ($COUNT commits, squashed)"
  if [[ ${#PRESERVE[@]} -gt 0 ]]; then
    MSG="$MSG — keep fork-only files"
  fi
fi

git commit -q -m "$MSG"

if [[ $TAG -eq 1 ]]; then
  # -f keeps this idempotent across re-runs and same-upstream re-syncs. Tagging is
  # bookkeeping; never let it fail a sync that already committed.
  if git tag -f "sync/$UP_SHA" >/dev/null 2>&1; then
    echo "==> tagged sync/$UP_SHA"
  else
    echo "==> warning: could not tag sync/$UP_SHA (commit is fine)" >&2
  fi
fi

echo "==> created $(git rev-parse --short HEAD) by $(git log -1 --format='%an <%ae>')"
echo "    $(git log -1 --format='%s')"

if [[ $PUSH -eq 1 ]]; then
  if git merge-base --is-ancestor "origin/$BRANCH" HEAD 2>/dev/null; then
    echo "==> pushing to origin/$BRANCH (fast-forward)"
    git push origin "$BRANCH"
  else
    echo "error: push would not be a fast-forward. Review before using --force-with-lease." >&2
    exit 1
  fi
else
  echo "==> not pushed. Review, then: git push origin $BRANCH"
fi
