# gajae — chunk 6/6 (1 năng lực)

## gajae.111 Config resolution có `!` = shell command, cache + dedupe + timeout

- **where:** packages/coding-agent/src/config/resolve-config-value.ts
- **what:** Bất kỳ giá trị config nào bắt đầu bằng `!` sẽ được chạy qua native `executeShell` với `timeoutMs = 10_000`, cache suốt đời process, dedupe bằng `commandInFlight` map, `cacheScope` để tách cache khi caller rotate config. Nhánh không phải `!`: env var trước, rồi literal.
- **how:** Consumer: MCP server `env`/`headers` (runtime-mcp/manager.ts:3245) và SDK `configValueResolver`.
- **solves:** Cho phép lấy secret không nằm sẵn trong config (1Password, keychain, `op read`).
- **port effort:** thấp về code, CAO về rủi ro — xem finding #3. Nếu port thì phải kèm trust gate. | **idea only:** True

