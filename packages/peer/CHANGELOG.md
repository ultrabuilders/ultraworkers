# Changelog

## [Unreleased]

### Added

- Cross-session agent messaging and file leases with fencing. A lease hands back a monotonic **fence token**; a write or release carrying a stale one is refused, so a holder that was reaped and re-taken can no longer act on the claim it thinks it still has.
- A closed name space for session identities — an **adjective + noun** pair, allocated once at session start and never recomputed. Not from the working directory, not from the PID, not from a counter, because a name derived from mutable ambient state cannot be an address.
- `peer.list`, `peer.send`, `peer.lock` and `peer.release` — the agent-facing surface, four verbs and nothing else. Server administration is deliberately **not** exposed as agent tools.
- `/list-agents` (alias `/peers`) reports the live roster with this session first, so an agent can learn its own name without guessing. `/rename` renames the current session and accepts any string; reserved names are refused.
- Presence judging from four independent signals. Only a dead process counts as dead — an idle agent, a quiet mailbox and a still-reachable host are all evidence of life, not death.

### Changed

- **A full inbox now refuses the message instead of dropping the oldest one.** This is a behaviour change: the in-process bus still shifts the oldest message out when its mailbox fills, but a durable store discarding unread mail because a backlog accumulated while no session was running is the one failure mode it must not have. A send that would exceed the horizon raises `MailboxFullError` (`code: "mailbox_full"`) and the caller decides what to do.

### Security

- `/rename` strips Unicode control and format characters and truncates at 64 graphemes. A name reaches a terminal renderer, so `U+001B` or `U+200E` surviving into a label is a display attack rather than cosmetics. An empty result after sanitisation is refused, never replaced with a generated name.
- Name uniqueness is checked case-insensitively, because `BlueLake` and `bluelake` are one owner on NTFS — and because an ambiguous name makes `send` fail rather than guess, so a rename that created a duplicate would break delivery for two sessions instead of disambiguating one.
- `force_release` is **not** an agent tool. It is the one operation in this design that can destroy work another agent is actively doing, and handing it to an agent would put the sharpest tool in the system's weakest hands. The equivalent remains a human calling it on the mail server directly.