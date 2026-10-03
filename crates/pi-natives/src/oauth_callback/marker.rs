//! Ownership-marker name resolution for the Windows OAuth callback transaction.
//!
//! This lives outside [`super::windows`] on purpose. `windows.rs` is gated on
//! `target_os = "windows"` and imports `std::os::windows`, so it does not even
//! compile on the platforms CI runs its tests on — logic kept there has no test
//! that can observe it. The rule here is a pure two-value choice, so it is split
//! out and covered everywhere.
//!
//! Scope is deliberately narrow: only the *name* resolution that the
//! pre-rename fallback needs. The marker *value* comparison stays inline in
//! `windows.rs` because it compares `RawValue`, which is itself Windows-only,
//! and that part is unchanged from before the rename.

// Every consumer of this module is `target_os = "windows"`-gated; elsewhere it
// exists only for its own tests.
#![cfg_attr(not(target_os = "windows"), allow(dead_code))]

/// The registry value name this build writes the ownership marker under.
pub(crate) const MARKER_NAME: &str = "ultraworkers OAuth Callback Transaction";

/// The registry value name a pre-rename build wrote the marker under.
///
/// This is NOT dead data. `Layout::new` stores [`MARKER_NAME`] at `values[3]`,
/// and recovery compares the value stored there against the live registry entry
/// to decide whether the registration is still ours to clean up. A machine that
/// crashed under the old build therefore has a journal naming the legacy value,
/// while a read under the current name alone returns `None` — which satisfies
/// neither the "unchanged since we wrote it" test nor the "equals what we would
/// write" test, and wedges recovery permanently. Mirrors
/// `LSP_MUX_DAEMON_NAME_LEGACY` in
/// `packages/coding-agent/src/lsp/mux/protocol.ts`.
pub(crate) const MARKER_NAME_LEGACY: &str = "omp OAuth Callback Transaction";

/// The registry's answer under each spelling of the marker name.
#[derive(Clone, Copy, Debug)]
pub(crate) struct MarkerReads<T> {
	/// Value stored under [`MARKER_NAME`].
	pub(crate) current: Option<T>,
	/// Value stored under [`MARKER_NAME_LEGACY`].
	pub(crate) legacy: Option<T>,
}

/// Pick the marker the registry actually holds.
///
/// The current name wins when both are present, so a value this build wrote is
/// never shadowed by a stale legacy value left behind by an older one.
pub(crate) fn resolve<T>(reads: MarkerReads<T>) -> Option<T> {
	reads.current.or(reads.legacy)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn current_name_wins_when_a_stale_legacy_value_is_also_present() {
		assert_eq!(
			resolve(MarkerReads {
				current: Some(MARKER_NAME),
				legacy:  Some(MARKER_NAME_LEGACY),
			}),
			Some(MARKER_NAME)
		);
	}

	#[test]
	fn legacy_name_is_read_when_the_current_one_is_absent() {
		assert_eq!(
			resolve(MarkerReads {
				current: None,
				legacy:  Some(MARKER_NAME_LEGACY),
			}),
			Some(MARKER_NAME_LEGACY)
		);
	}

	#[test]
	fn an_absent_marker_reads_as_none_rather_than_an_empty_value() {
		assert_eq!(resolve(MarkerReads::<&str> { current: None, legacy: None }), None);
	}
}