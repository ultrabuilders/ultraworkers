# Changelog

## [Unreleased]

### Added

- `@oh-my-pi/pi-server`: a transport-neutral RPC server that hosts durable
  Sessions, routes contract-agnostic service calls per presentation attachment,
  and releases an attachment only after its admitted service calls settle. Ships
  a Unix-domain-socket transport with stale-socket and non-socket path safety,
  plus a `@oh-my-pi/pi-server/testing` host for exercising routing in-process.
