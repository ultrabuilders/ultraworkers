Claim exclusive ownership of a path, so no other agent edits it while you work.
If the path is already held, this returns WHO holds it and until when — it does not fail, because knowing the holder is usually the reason you asked. Pass probe=true to check without claiming.
Returns a fence token; hand it back to peer.release. The claim expires on its own, so a crashed holder does not block the path forever.
