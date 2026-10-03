Release a path you locked, using the fence token peer.lock returned.
A stale token is refused rather than forced: it means the claim already expired and someone else may hold the path now.
