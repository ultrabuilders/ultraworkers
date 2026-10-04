# Changelog

## [Unreleased]

### Changed

- The README now states that this package has no consumer in the workspace. It
  previously read as though the surrounding pi packages were passing telemetry
  contexts, which none of them do — the one other match for the string
  "telemetry" outside this package is a `mkdtemp` prefix in
  `packages/mnemopi/test`, not an import. Tracked in `epic-l8nc`.

### Added

- Added `@oh-my-pi/pi-telemetry`: vendor-neutral telemetry contracts, an in-memory
  reference context, a reusable adapter conformance suite, and typed schema
  utilities. ([pi](https://github.com/earendil-works/pi) MIT, Copyright (c) 2025
  Mario Zechner)
