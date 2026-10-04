# NOTICE

This plugin contains code copied from:

**pi-dynamic-workflows** — <https://github.com/quintinshaw/pi-dynamic-workflows>
Licensed under the MIT License, Copyright (c) 2026 QuintinShaw.

The full licence text is retained at `.tmp/ref/pi-dynamic-workflows/LICENSE` and
reproduced below.

## What was copied, and from where

| File here | Copied from | Version |
|---|---|---|
| `src/errors.ts` | `src/errors.ts` (`WorkflowErrorCode`, `WorkflowError`, `CapabilityErrorDiagnostic`, `WorkflowCapabilityContractError`) | 3.13.1 @ `3bea96c` |
| `src/engine/parse.ts` | `src/workflow.ts:514`, `:2011-2133` | 3.13.1 @ `3bea96c` |
| `src/engine/vm.ts` | `src/workflow.ts:1799-1817`, `:529-546` | 3.13.1 @ `3bea96c` |
| `src/engine/contract.ts` | `src/workflow-capability-contract.ts:92-101`, `:107-110`, `:113-132`, `:146-149`, `:698-760`, `:839-845`; `src/enums.ts:34-38`; the 18 `runtimeGlobal(...)` declarations at `:317-490` | 3.13.1 @ `3bea96c` |

`src/engine/vm.ts`'s `DETERMINISM_PRELUDE` is byte-for-byte identical to the
reference's, verified by comparing the 16 array elements.

## The one required deviation

`src/engine/parse.ts` parses with `@babel/parser` where the reference uses `acorn`.
The eight-step validation logic and its order are unchanged; only the AST layer
differs. The differences were measured against babel 7.29.9 rather than assumed,
and each is recorded at the top of that file. The load-bearing one is
`allowReturnOutsideFunction`, which babel exposes as a top-level option (as acorn
does) and not as a plugin.

---

MIT License

Copyright (c) 2026 QuintinShaw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.