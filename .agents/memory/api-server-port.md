---
name: API server port conflict on restart
description: How to handle EADDRINUSE 8080 when restarting the API server workflow
---

When restarting the `artifacts/api-server: API Server` workflow, a previous node process can linger and hold port 8080, causing `EADDRINUSE`. The `fuser -k 8080/tcp` command reports nothing because the zombie is tracked differently.

**Why:** The old manually-created `API Server` workflow spawned a process that wasn't cleaned up when the workflow was removed.

**How to apply:** Run `ps aux | grep "api-server\|dist/index.mjs"` to find the PID, then `kill -9 <PID>` before restarting the workflow.
