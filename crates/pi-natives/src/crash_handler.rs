//! Native crash diagnostics.
//!
//! Installs Rust-side panic and allocation-error hooks the first time the
//! native module loads, so any crash inside `pi-natives` writes an actionable
//! record (thread, payload, backtrace) to disk and to stderr before the host
//! process exits.
//!
//! Without these hooks, Bun receives only the bare
//! `memory allocation of N bytes failed` line and aborts with no stack —
//! see issue #2211 ("Windows crash: Rust allocator failure after tasklist.exe
//! popup"). The cdylib builds with `panic = "unwind"`, so a panic in vendored
//! uutils code unwinds to the shell boundary and is recovered as a failed
//! command, and a panic in a `task::blocking` worker is caught at the napi
//! boundary and surfaces as a rejected JS Promise; such recoverable panics are
//! logged to disk only, while fatal crashes (allocation failure, or panics
//! with no active recovery scope) still get the stderr dump + process exit.
//! Either way the record stays diagnosable.
//!
//! Notes:
//! - Backtraces are captured via [`Backtrace::force_capture`], so they work
//!   regardless of `RUST_BACKTRACE`.
//! - The crash log path mirrors the JS side (`packages/utils/src/dirs.ts`):
//!   `$XDG_STATE_HOME/ultraworkers/logs/` on Linux / macOS when the user has
//!   migrated to XDG (i.e. that directory already exists and
//!   `PI_CODING_AGENT_DIR` isn't pointed somewhere custom), otherwise
//!   `<home>/<resolved config dir>/logs/`, where the resolved dir is the same
//!   override → read-root → write-root chain `getConfigDirName()` walks, so a
//!   half-migrated install keeps receiving crash reports in the directory that
//!   actually holds its config.
//! - Hook installation is idempotent across repeated module loads.

use std::{
	alloc::Layout,
	backtrace::Backtrace,
	cell::Cell,
	ffi::{OsStr, OsString},
	fmt::Write as _,
	fs::{self, OpenOptions},
	io::Write as _,
	path::{Path, PathBuf},
	process,
	sync::{
		Once,
		atomic::{AtomicBool, Ordering},
	},
	thread,
	time::{SystemTime, UNIX_EPOCH},
};

/// Ordered home-scoped config spellings, newest first -- the pair
/// `CONFIG_DIR_CANDIDATES` holds at `packages/utils/src/dirs.ts:73`. Order is
/// the whole contract here and the compiler cannot check it: both entries are
/// bare strings, so a swap still builds and silently reverses the precedence.
const CONFIG_DIR_CANDIDATES: [&str; 2] = [CONFIG_DIR_NAME_NEXT, LEGACY_CONFIG_DIR_NAME];

/// The WRITE target, i.e. `getConfigWriteRootName()` at `dirs.ts:508`. Its
/// comment at `dirs.ts:382` is explicit that falling back to the legacy
/// spelling here would make a brand-new install create `.omp`, "the opposite
/// of the migration" -- so this is the last resort, never the first guess.
const CONFIG_DIR_NAME_NEXT: &str = ".ultraworkers";

/// `LEGACY_CONFIG_DIR_NAME` at `dirs.ts:59`. Read-only: it may be selected when
/// it holds the user's real config, and must never be created by a fresh
/// install.
const LEGACY_CONFIG_DIR_NAME: &str = ".omp";

/// `MAIN_CONFIG_FILENAMES` at `dirs.ts:86`. The marker is ANY name in this
/// list, not just the first -- writes target `[0]`, but every reader loops the
/// list (`dirs.ts:437`).
const MAIN_CONFIG_FILENAMES: [&str; 2] = ["config.yml", "config.yaml"];

/// XDG-root subdirectory, i.e. `$XDG_STATE_HOME/ultraworkers/`: the FIRST entry
/// of `XDG_CONFIG_DIR_CANDIDATES` in `packages/utils/src/dirs.ts`, which lists
/// the new spelling before the old. Deliberately NOT `APP_NAME` from
/// `packages/utils/src/brand.ts` — dirs.ts says in so many words that
/// `APP_NAME` is display identity only and these are the paths where user state
/// actually lives. The two strings coincide today, which is what makes citing
/// `APP_NAME` tempting and wrong: it points a reader at a constant that does
/// not govern this value. Track the candidate list, not the brand.
#[cfg(any(target_os = "linux", target_os = "macos"))]
const APP_NAME: &str = "ultraworkers";

static INSTALL: Once = Once::new();
static ALLOC_HOOK_ACTIVE: AtomicBool = AtomicBool::new(false);

thread_local! {
	/// Active `task::blocking` panic recovery frames on this thread.
	///
	/// The panic hook runs before [`std::panic::catch_unwind`] returns. A
	/// borrow-free `Cell` lets the hook recognize panics that are already inside
	/// a known recovery boundary without touching potentially borrowed task
	/// state while the stack is unwinding.
	static BLOCKING_TASK_PANIC_SCOPE_DEPTH: Cell<usize> = const { Cell::new(0) };
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum PanicDisposition {
	/// No recovery boundary is active: persist the report, echo it to stderr,
	/// and chain to the default hook (which ends the process).
	Fatal,
	/// The panic will be caught and mapped to a failed command / rejected
	/// Promise: persist the report to the crash log for diagnosis, but keep
	/// stderr quiet and do not chain to the default hook.
	LoggedRecoverable,
}

/// Install the panic and allocation-error hooks. Idempotent.
pub fn install() {
	INSTALL.call_once(|| {
		let prev_panic = std::panic::take_hook();
		std::panic::set_hook(Box::new(move |info| match panic_disposition() {
			PanicDisposition::LoggedRecoverable => {
				let report = format_panic_report(info);
				persist(&report, CrashKind::Panic, false);
			},
			PanicDisposition::Fatal => {
				let report = format_panic_report(info);
				persist(&report, CrashKind::Panic, true);
				prev_panic(info);
			},
		}));

		std::alloc::set_alloc_error_hook(|layout| {
			// Print the canonical line before doing anything allocation-prone.
			// If this is genuine process-wide OOM, report formatting/path work may
			// recursively enter this hook; the secondary entry writes the same
			// stack-only fallback and aborts immediately.
			write_alloc_failure_line(std::io::stderr(), layout.size());
			if ALLOC_HOOK_ACTIVE.swap(true, Ordering::AcqRel) {
				process::abort();
			}
			let report = format_alloc_report(layout);
			persist(&report, CrashKind::Alloc, true);
			process::abort();
		});
	});
}

/// Run `f` inside a `task::blocking` panic recovery boundary.
///
/// The global panic hook checks this thread-local scope before reporting a
/// panic. When a blocking worker closure panics, [`std::panic::catch_unwind`]
/// will turn it into a rejected JS Promise, so the hook downgrades the panic
/// to [`PanicDisposition::LoggedRecoverable`]: the report (location +
/// backtrace) is still persisted to the crash log, but nothing is echoed to
/// stderr and the default hook is not chained.
pub(crate) fn blocking_task_panic_scope<R>(f: impl FnOnce() -> R) -> R {
	struct Guard;

	impl Drop for Guard {
		fn drop(&mut self) {
			BLOCKING_TASK_PANIC_SCOPE_DEPTH.with(|d| d.set(d.get().saturating_sub(1)));
		}
	}

	BLOCKING_TASK_PANIC_SCOPE_DEPTH.with(|d| d.set(d.get() + 1));
	let _guard = Guard;
	f()
}

fn blocking_task_panic_scope_active() -> bool {
	BLOCKING_TASK_PANIC_SCOPE_DEPTH.with(|d| d.get() > 0)
}

fn panic_disposition() -> PanicDisposition {
	if blocking_task_panic_scope_active() || pi_shell::panic_scope_active() {
		PanicDisposition::LoggedRecoverable
	} else {
		PanicDisposition::Fatal
	}
}

#[derive(Clone, Copy)]
enum CrashKind {
	Panic,
	Alloc,
}

impl CrashKind {
	const fn as_str(self) -> &'static str {
		match self {
			Self::Panic => "panic",
			Self::Alloc => "alloc",
		}
	}
}

fn format_panic_report(info: &std::panic::PanicHookInfo<'_>) -> String {
	let bt = Backtrace::force_capture();
	let location = info.location().map_or_else(
		|| String::from("<unknown>"),
		|l| format!("{}:{}:{}", l.file(), l.line(), l.column()),
	);
	let mut out = report_header(CrashKind::Panic);
	let _ = writeln!(out, "location: {location}");
	let _ = writeln!(out, "message:  {}", panic_payload(info.payload()));
	let _ = writeln!(out, "backtrace:\n{bt}");
	out
}

fn format_alloc_report(layout: Layout) -> String {
	// Capturing a backtrace allocates. If the global allocator is in a state
	// where small allocations keep failing this will recurse into the hook —
	// `Backtrace::force_capture` swallows the secondary failure internally and
	// returns an empty backtrace, which is still strictly more useful than the
	// nothing the default handler prints.
	let bt = Backtrace::force_capture();
	let mut out = report_header(CrashKind::Alloc);
	let _ = writeln!(out, "size:      {} bytes", layout.size());
	let _ = writeln!(out, "alignment: {} bytes", layout.align());
	let _ = writeln!(out, "backtrace:\n{bt}");
	out
}

fn report_header(kind: CrashKind) -> String {
	let thread_name = thread::current().name().unwrap_or("<unnamed>").to_owned();
	let now_ms = unix_millis();
	format!(
		"pi-natives {kind} crash\npid:       {pid}\nthread:    {thread_name}\ntimestamp: {now_ms} \
		 (unix ms)\n",
		kind = kind.as_str(),
		pid = process::id(),
	)
}
fn write_alloc_failure_line(mut out: impl std::io::Write, size: usize) {
	let _ = out.write_all(b"memory allocation of ");
	let mut digits = [0u8; usize::MAX.ilog10() as usize + 1];
	let mut pos = digits.len();
	let mut value = size;
	if value == 0 {
		pos -= 1;
		digits[pos] = b'0';
	} else {
		while value > 0 {
			pos -= 1;
			digits[pos] = b'0' + (value % 10) as u8;
			value /= 10;
		}
	}
	let _ = out.write_all(&digits[pos..]);
	let _ = out.write_all(b" bytes failed\n");
}

/// Extract a printable message from a panic payload captured by
/// [`std::panic::catch_unwind`] or handed to the panic hook. Handles the two
/// shapes `panic!` produces — `&'static str` (literal) and `String`
/// (formatted) — and degrades to a sentinel for arbitrary
/// [`panic_any`](std::panic::panic_any) payloads.
pub(crate) fn panic_payload(payload: &(dyn std::any::Any + Send)) -> String {
	if let Some(s) = payload.downcast_ref::<&'static str>() {
		(*s).to_owned()
	} else if let Some(s) = payload.downcast_ref::<String>() {
		s.clone()
	} else {
		String::from("<non-string panic payload>")
	}
}

fn persist(report: &str, kind: CrashKind, echo_stderr: bool) {
	// Echo to stderr so the user sees something even when the file write fails
	// (read-only home, missing $HOME, …). Suppressed for recoverable panics
	// (uutils shell boundary, `task::blocking` workers), which surface as a
	// failed command / rejected Promise instead of a crash.
	if echo_stderr {
		let _ = writeln!(std::io::stderr(), "{report}");
	}

	let Some(path) = crash_log_path(kind) else {
		return;
	};
	if let Some(parent) = path.parent() {
		let _ = fs::create_dir_all(parent);
	}
	if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
		let _ = f.write_all(report.as_bytes());
		let _ = f.flush();
		let _ = f.sync_data();
		if echo_stderr {
			let _ =
				writeln!(std::io::stderr(), "pi-natives crash report written to {}", path.display());
		}
	}
}

fn crash_log_path(kind: CrashKind) -> Option<PathBuf> {
	let dir = logs_dir()?;
	Some(build_crash_log_path(&dir, kind, process::id(), unix_millis()))
}

fn build_crash_log_path(dir: &Path, kind: CrashKind, pid: u32, now_ms: u128) -> PathBuf {
	dir.join(format!("native-{}-{pid}-{now_ms}.log", kind.as_str()))
}

/// The two config-dir env overrides in precedence order, newest spelling first.
///
/// This mirrors the `process.env.ULTRAWORKERS_CONFIG_DIR ||
/// process.env.PI_CONFIG_DIR` chain at `dirs.ts:379`, and the JS `||` is doing
/// real work that a plain `Option::or_else` does not: `||` treats `""` as
/// falsy, so an empty `ULTRAWORKERS_CONFIG_DIR` falls through to
/// `PI_CONFIG_DIR` instead of winning.
///
/// `Option::or_else` cannot express that -- it stops at the first `Some`, and
/// `var_os("")` is `Some("")`. Chaining the two reads directly therefore let an
/// empty primary var shadow the legacy one entirely, sending a caller who set
/// `ULTRAWORKERS_CONFIG_DIR=""` and `PI_CONFIG_DIR=".foo"` down the candidate
/// scan instead of to `.foo`.
///
/// Extracted from `logs_dir` so the precedence is testable without mutating
/// process env; the env reads stay at the call site.
fn config_dir_override_from(
	primary: Option<OsString>,
	legacy: Option<OsString>,
) -> Option<OsString> {
	primary
		.filter(|value| !value.is_empty())
		.or_else(|| legacy.filter(|value| !value.is_empty()))
}

fn logs_dir() -> Option<PathBuf> {
	let home = home_dir()?;
	// Newest spelling first, legacy second, matching the precedence chain in
	// `packages/utils/src/dirs.ts`. Order is the whole contract here, and it is
	// not something the compiler checks: `var_os` returns an `Option`, so
	// swapping these two still compiles and silently reverses the precedence.
	let config_override = config_dir_override_from(
		std::env::var_os("ULTRAWORKERS_CONFIG_DIR"),
		std::env::var_os("PI_CONFIG_DIR"),
	);
	let xdg_logs = xdg_state_logs_from_env(&home, config_override.as_deref());
	Some(resolve_logs_dir(
		&home,
		config_override.as_deref(),
		xdg_logs,
		&Path::exists,
		&list_profile_dirs,
	))
}

fn resolve_logs_dir(
	home: &Path,
	config_dir_override: Option<&OsStr>,
	xdg_state_logs: Option<PathBuf>,
	exists: &dyn Fn(&Path) -> bool,
	profile_dirs: &dyn Fn(&Path) -> Vec<PathBuf>,
) -> PathBuf {
	// XDG takes precedence so users who migrated to
	// `$XDG_STATE_HOME/ultraworkers/logs/` see native crash reports in the same
	// directory the JS logger rotates.
	if let Some(p) = xdg_state_logs {
		return p;
	}
	let config_dir = resolve_config_dir_name(home, config_dir_override, exists, profile_dirs);
	config_root_dir(home, &config_dir).join("logs")
}

/// Resolve the config-dir name exactly as `getConfigDirName()` does at
/// `dirs.ts:379`: explicit override, else the read root, else the write root.
///
/// The read root is `getConfigReadRootName()` (`dirs.ts:446`), which asks two
/// questions per candidate before giving up and deferring to the write root:
/// first, which candidate actually holds an agent config; then, failing that,
/// which candidate merely exists. The first question is what makes this correct
/// for a half-migrated install: when both spellings are on disk, the one that
/// holds the user's config is the one whose logs they are already reading, and
/// preferring the newer name unconditionally would point crash reports at an
/// empty directory instead.
///
/// Before this existed the fallback was a bare `.omp`, so on macOS -- which
/// sets no `XDG_STATE_HOME`, leaving the branch above dead -- the native panic
/// handler wrote to `~/.omp/logs` while `getLogsDir()` read `~/.ultraworkers`,
/// and `omp debug report` (which bundles from `getLogsDir()`) could not see the
/// crash it was meant to report. Tracked as `epic-usoz`.
///
/// Both predicates are injected rather than called directly so the decision
/// stays pure and testable without a real home directory -- the same shape as
/// [`xdg_state_logs`], which takes its own `exists` argument for that reason.
fn resolve_config_dir_name(
	home: &Path,
	config_dir_override: Option<&OsStr>,
	exists: &dyn Fn(&Path) -> bool,
	profile_dirs: &dyn Fn(&Path) -> Vec<PathBuf>,
) -> OsString {
	if let Some(s) = config_dir_override.filter(|s| !s.is_empty()) {
		// Returned before any `join`, and that is load-bearing rather than
		// incidental. Rust's `Path::join` REPLACES the receiver when the argument
		// is absolute, whereas Node's `path.join("/home/u", "/abs")` yields
		// `/home/u/abs`. The two candidates below are relative so they cannot
		// diverge — but an override is an arbitrary user string, so joining it
		// would silently disagree with `dirs.ts` on absolute values. Keep the
		// early return; do not "normalise" it into a join.
		return s.to_os_string();
	}
	for candidate in CONFIG_DIR_CANDIDATES {
		let root = config_root_dir(home, OsStr::new(candidate));
		if has_main_config_file(&root, exists, profile_dirs) {
			return OsString::from(candidate);
		}
	}
	for candidate in CONFIG_DIR_CANDIDATES {
		if exists(&config_root_dir(home, OsStr::new(candidate))) {
			return OsString::from(candidate);
		}
	}
	OsString::from(CONFIG_DIR_NAME_NEXT)
}

/// `hasMainConfigFile` at `dirs.ts:482`: the candidate holds a main config
/// under `agent/`, or under any profile's `agent/`.
///
/// The TS loop's `entry.isDirectory()` filter is applied by the injected
/// implementation rather than here — [`list_profile_dirs`] does the `is_dir`
/// check on the real path. Splitting it that way keeps the predicate injectable
/// and the decision pure, and both sides agree on the result: a non-directory
/// entry yields `<entry>/agent/<name>`, which cannot exist anyway.
///
/// The trade-off is that tests supply their own profile listing, so they pin
/// the *selection* rule but cannot catch a filtering mistake in
/// `list_profile_dirs` itself. That filter is a single `is_dir` whose failure
/// mode is admitting a bogus profile path no config can hang off, which is why
/// the blind spot is recorded here rather than papered over.
fn has_main_config_file(
	config_root: &Path,
	exists: &dyn Fn(&Path) -> bool,
	profile_dirs: &dyn Fn(&Path) -> Vec<PathBuf>,
) -> bool {
	let agent_dir = config_root.join("agent");
	if MAIN_CONFIG_FILENAMES
		.iter()
		.any(|name| exists(&agent_dir.join(name)))
	{
		return true;
	}
	profile_dirs(&config_root.join("profiles"))
		.iter()
		.any(|profile| {
			let profile_agent = profile.join("agent");
			MAIN_CONFIG_FILENAMES
				.iter()
				.any(|name| exists(&profile_agent.join(name)))
		})
}

/// Real implementation of the profile listing injected into
/// [`has_main_config_file`]. A missing `profiles/` directory is ordinary --
/// every install that has never set a profile lacks one -- so it reads as empty
/// rather than as an error.
fn list_profile_dirs(profiles_root: &Path) -> Vec<PathBuf> {
	std::fs::read_dir(profiles_root)
		.into_iter()
		.flatten()
		.flatten()
		.map(|entry| entry.path())
		.filter(|path| path.is_dir())
		.collect()
}

/// Compute the XDG-state logs dir if the runtime environment matches the
/// JS-side eligibility rules in `packages/utils/src/dirs.ts`: linux/macos,
/// `$XDG_STATE_HOME` set, `$XDG_STATE_HOME/ultraworkers` exists on disk, and
/// `PI_CODING_AGENT_DIR` is unset or pointing at the default agent dir.
#[cfg(any(target_os = "linux", target_os = "macos"))]
fn xdg_state_logs_from_env(home: &Path, config_dir_override: Option<&OsStr>) -> Option<PathBuf> {
	let default_agent_dir =
		default_agent_dir(home, config_dir_override, &Path::exists, &list_profile_dirs);
	let agent_override = std::env::var_os("PI_CODING_AGENT_DIR");
	let xdg_state_home = std::env::var_os("XDG_STATE_HOME");
	xdg_state_logs(
		xdg_state_home.as_deref(),
		agent_override.as_deref(),
		&default_agent_dir,
		Path::exists,
	)
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
#[allow(clippy::missing_const_for_fn, reason = "windows/non-xdg platforms keep the signature")]
fn xdg_state_logs_from_env(_home: &Path, _config_dir_override: Option<&OsStr>) -> Option<PathBuf> {
	None
}

/// Pure XDG-eligibility computation extracted for unit testing — no env
/// reads, no fs reads. `app_dir_exists` decides whether the candidate
/// `<xdg_state_home>/ultraworkers` actually lives on disk.
#[cfg(any(target_os = "linux", target_os = "macos"))]
fn xdg_state_logs(
	xdg_state_home: Option<&OsStr>,
	agent_dir_override: Option<&OsStr>,
	default_agent_dir: &Path,
	app_dir_exists: impl FnOnce(&Path) -> bool,
) -> Option<PathBuf> {
	if let Some(ov) = agent_dir_override.filter(|s| !s.is_empty()) {
		// `path.resolve(value)` on the JS side: make absolute against cwd
		// without touching the filesystem. Anything that diverges from the
		// default agent dir disables XDG, matching `isDefault === false`.
		let resolved = std::path::absolute(Path::new(ov)).ok()?;
		if resolved != default_agent_dir {
			return None;
		}
	}
	let xdg = xdg_state_home.filter(|s| !s.is_empty())?;
	let app_dir = Path::new(xdg).join(APP_NAME);
	if !app_dir_exists(&app_dir) {
		return None;
	}
	Some(app_dir.join("logs"))
}
#[cfg(any(target_os = "linux", target_os = "macos"))]
fn default_agent_dir(
	home: &Path,
	config_dir_override: Option<&OsStr>,
	exists: &dyn Fn(&Path) -> bool,
	profile_dirs: &dyn Fn(&Path) -> Vec<PathBuf>,
) -> PathBuf {
	// Probe-based, because the JS side is: `defaultAgent` at `dirs.ts:544` is
	// `path.join(this.configRoot, "agent")`, and `configRoot` is the same
	// resolved candidate the rest of `dirs.ts` walks. Pinning a literal `.omp`
	// here instead made this comparison disagree with the very default it is
	// meant to detect, so a user who set `PI_CODING_AGENT_DIR` to the CURRENT
	// spelling read as "pointing somewhere custom" and lost XDG eligibility.
	let config_dir = resolve_config_dir_name(home, config_dir_override, exists, profile_dirs);
	config_root_dir(home, &config_dir).join("agent")
}

fn config_root_dir(home: &Path, config_dir: &OsStr) -> PathBuf {
	let mut base = PathBuf::from(home);
	for component in Path::new(config_dir).components() {
		match component {
			std::path::Component::Prefix(_) | std::path::Component::RootDir => {},
			std::path::Component::CurDir => {},
			std::path::Component::ParentDir => {
				base.pop();
			},
			std::path::Component::Normal(part) => base.push(part),
		}
	}
	base
}

fn home_dir() -> Option<PathBuf> {
	#[cfg(unix)]
	{
		std::env::var_os("HOME").map(PathBuf::from)
	}
	#[cfg(windows)]
	{
		if let Some(profile) = std::env::var_os("USERPROFILE") {
			return Some(PathBuf::from(profile));
		}
		let drive = std::env::var_os("HOMEDRIVE")?;
		let path = std::env::var_os("HOMEPATH")?;
		let mut combined = drive;
		combined.push(path);
		Some(PathBuf::from(combined))
	}
}

fn unix_millis() -> u128 {
	SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map_or(0, |d| d.as_millis())
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn blocking_task_panic_scope_downgrades_to_logged_recoverable() {
		assert_eq!(panic_disposition(), PanicDisposition::Fatal);
		blocking_task_panic_scope(|| {
			assert_eq!(panic_disposition(), PanicDisposition::LoggedRecoverable);
		});
		assert_eq!(panic_disposition(), PanicDisposition::Fatal);
	}

	#[test]
	fn blocking_task_panic_scope_restores_after_unwind() {
		// Silence the process-global hook for the injected panic (and serialize
		// the swap with every other hook-mutating test — see `crate::testing`).
		let _silence = crate::testing::SilenceHook::new();
		let unwound = std::panic::catch_unwind(|| blocking_task_panic_scope(|| panic!("boom")));

		assert!(unwound.is_err(), "panic propagated to catch_unwind");
		assert_eq!(panic_disposition(), PanicDisposition::Fatal);
	}

	#[test]
	fn alloc_report_contains_size_alignment_and_backtrace() {
		let layout = Layout::from_size_align(7714, 8).unwrap();
		let report = format_alloc_report(layout);
		assert!(report.contains("pi-natives alloc crash"), "report missing header: {report}");
		assert!(report.contains("size:      7714 bytes"), "report missing size: {report}");
		assert!(report.contains("alignment: 8 bytes"), "report missing alignment: {report}");
		assert!(report.contains("backtrace:"), "report missing backtrace section: {report}");
		assert!(
			report.contains(&format!("pid:       {}", process::id())),
			"report missing pid: {report}"
		);
		assert!(report.contains("thread:"), "report missing thread: {report}");
	}

	#[test]
	fn alloc_failure_line_matches_rust_default_text_without_heap_formatting() {
		let mut buf = Vec::new();
		write_alloc_failure_line(&mut buf, 7714);
		assert_eq!(buf, b"memory allocation of 7714 bytes failed\n");
		buf.clear();
		write_alloc_failure_line(&mut buf, usize::MAX);
		assert_eq!(buf, format!("memory allocation of {} bytes failed\n", usize::MAX).as_bytes());
	}

	#[test]
	fn panic_payload_handles_str_string_and_other() {
		let static_str: Box<dyn std::any::Any + Send> = Box::new("static panic");
		assert_eq!(panic_payload(&*static_str), "static panic");

		let owned: Box<dyn std::any::Any + Send> = Box::new(String::from("owned panic"));
		assert_eq!(panic_payload(&*owned), "owned panic");

		let other: Box<dyn std::any::Any + Send> = Box::new(42u32);
		assert_eq!(panic_payload(&*other), "<non-string panic payload>");
	}

	/// Stands in for the filesystem for the predicates [`resolve_logs_dir`] and
	/// [`resolve_config_dir_name`] take. `present` is the set of paths that
	/// exist; the empty set is a home with no config directory at all, which is
	/// the fresh-install case. Keeping it a set rather than a bool is what lets
	/// a test put two spellings on disk at once.
	fn exists_in(present: &[&str]) -> impl Fn(&Path) -> bool {
		let owned: Vec<PathBuf> = present.iter().map(PathBuf::from).collect();
		move |path: &Path| owned.iter().any(|p| p == path)
	}

	/// Every install that has never set a profile has no `profiles/` directory.
	fn no_profiles(_root: &Path) -> Vec<PathBuf> {
		Vec::new()
	}

	#[test]
	fn config_dir_override_falls_through_an_empty_primary() {
		// The regression. `Option::or_else` stops at the first `Some`, and
		// `var_os("")` is `Some("")`, so chaining the two env reads directly let
		// an empty primary shadow the legacy var entirely. JS `||` does the
		// opposite, so `dirs.ts` reaches `.foo` and the native side diverged
		// into the candidate scan. Same boundary that had just been corrected on
		// the TS side for an empty `ULTRAWORKERS_CONFIG_DIR`.
		let dir = config_dir_override_from(Some(OsString::from("")), Some(OsString::from(".foo")));
		assert_eq!(dir, Some(OsString::from(".foo")));
	}

	#[test]
	fn config_dir_override_prefers_the_primary_spelling() {
		let dir =
			config_dir_override_from(Some(OsString::from(".new")), Some(OsString::from(".foo")));
		assert_eq!(dir, Some(OsString::from(".new")));
	}

	#[test]
	fn config_dir_override_is_absent_when_neither_var_is_usable() {
		// Both empty is not an override: it must fall through to the candidate
		// scan rather than resolve to a directory named "".
		assert_eq!(
			config_dir_override_from(Some(OsString::from("")), Some(OsString::from(""))),
			None
		);
		assert_eq!(config_dir_override_from(None, Some(OsString::from(""))), None);
		assert_eq!(config_dir_override_from(None, None), None);
	}

	#[test]
	fn an_unusable_override_falls_through_to_the_candidate_scan() {
		// The two halves together: no usable env override and nothing on disk,
		// so the write target. Before the precedence fix this path was never
		// reachable with an empty primary — the empty string resolved instead.
		let override_value =
			config_dir_override_from(Some(OsString::from("")), Some(OsString::from("")));
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			override_value.as_deref(),
			None,
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.ultraworkers/logs"));
	}

	#[test]
	fn resolve_logs_dir_defaults_to_next_spelling_when_no_candidate_exists() {
		// A fresh install has neither spelling on disk and so must get the write
		// target. Falling back to the legacy name here would make a brand-new
		// machine create `.omp`, which `dirs.ts:382` calls out as the opposite of
		// the migration.
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			None,
			None,
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.ultraworkers/logs"));
	}

	#[test]
	fn resolve_logs_dir_prefers_the_candidate_that_holds_a_config() {
		// Both spellings are on disk and only the legacy one holds an agent
		// config. Pointing crash reports at the newer directory would file them
		// somewhere the user's config is not, so this case is what separates
		// scanning the candidate list from merely preferring the new name: the
		// `exists`-only alternative resolves this to `.ultraworkers` and fails.
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			None,
			None,
			&exists_in(&[
				"/tmp/pi-natives-test-home/.ultraworkers",
				"/tmp/pi-natives-test-home/.omp",
				"/tmp/pi-natives-test-home/.omp/agent/config.yml",
			]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.omp/logs"));
	}

	#[test]
	fn resolve_logs_dir_recognizes_a_config_held_by_a_profile() {
		// The agent-config marker also counts under `<profile>/agent/`, so a user
		// who only ever configured through profiles still resolves to the
		// directory holding that config.
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			None,
			None,
			&exists_in(&[
				"/tmp/pi-natives-test-home/.ultraworkers",
				"/tmp/pi-natives-test-home/.omp",
				"/tmp/pi-natives-test-home/.omp/profiles/work/agent/config.yaml",
			]),
			&|profiles_root: &Path| {
				if profiles_root.ends_with(".omp/profiles") {
					vec![PathBuf::from("/tmp/pi-natives-test-home/.omp/profiles/work")]
				} else {
					Vec::new()
				}
			},
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.omp/logs"));
	}

	#[test]
	fn resolve_logs_dir_prefers_next_spelling_when_only_it_exists() {
		// No config marker anywhere, but the new spelling is the only directory:
		// that is a completed migration and must not read back into legacy.
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			None,
			None,
			&exists_in(&["/tmp/pi-natives-test-home/.ultraworkers"]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.ultraworkers/logs"));
	}

	#[test]
	fn resolve_logs_dir_honors_relative_pi_config_dir() {
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			Some(OsStr::new(".omp-dev")),
			None,
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.omp-dev/logs"));
	}

	#[test]
	fn resolve_logs_dir_reroots_absolute_pi_config_dir_under_home() {
		// JS resolves the config root via `path.join(os.homedir(),
		// getConfigDirName())`, which never honors an absolute PI_CONFIG_DIR — it
		// is always re-rooted under `$HOME` (and `..` components are normalized
		// away).
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			Some(OsStr::new("/var/tmp/pi-natives-state")),
			None,
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/var/tmp/pi-natives-state/logs"));
	}

	#[test]
	fn resolve_logs_dir_normalizes_parent_components_like_path_join() {
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			Some(OsStr::new("nested/../.omp-dev")),
			None,
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.omp-dev/logs"));
	}

	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn xdg_state_logs_ignores_empty_agent_dir_override() {
		// An empty PI_CODING_AGENT_DIR is "unset", not a divergent override; it
		// must not disable XDG resolution.
		let dir = xdg_state_logs(
			Some(OsStr::new("/xdg/state")),
			Some(OsStr::new("")),
			Path::new("/tmp/pi-natives-test-home/.omp/agent"),
			|_p| true,
		);
		assert_eq!(dir, Some(PathBuf::from("/xdg/state/ultraworkers/logs")));
	}

	#[test]
	fn resolve_logs_dir_ignores_empty_pi_config_dir() {
		// An empty override is "unset", not a directory named "". It therefore
		// falls through to the candidate scan, and with nothing on disk the scan
		// yields the write target -- so this asserts the override was ignored
		// rather than honored as a literal empty path segment.
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			Some(OsStr::new("")),
			None,
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.ultraworkers/logs"));
	}

	#[test]
	fn resolve_logs_dir_prefers_xdg_when_provided() {
		let dir = resolve_logs_dir(
			Path::new("/tmp/pi-natives-test-home"),
			None,
			Some(PathBuf::from("/xdg/state/ultraworkers/logs")),
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/xdg/state/ultraworkers/logs"));
	}

	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn xdg_state_logs_resolves_when_dir_exists_and_no_agent_override() {
		// Positive control, and the one that straddles the change: the existence
		// check succeeds ONLY for the canonical spelling. `|_p| true` accepted any
		// path, so a regression that probed the legacy `omp` root would still have
		// passed while producing a different directory. This closure fails closed
		// for anything else, so the spelling is what the assertion is about.
		let dir = xdg_state_logs(
			Some(OsStr::new("/xdg/state")),
			None,
			Path::new("/tmp/pi-natives-test-home/.omp/agent"),
			|p| p == Path::new("/xdg/state/ultraworkers"),
		);
		assert_eq!(dir, Some(PathBuf::from("/xdg/state/ultraworkers/logs")));
	}

	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn xdg_state_logs_skipped_when_ultraworkers_dir_missing() {
		// The closure records what it was asked about instead of answering blind.
		// `|_p| false` returns false for ANY path, so it proves "something was not
		// on disk" and nothing about WHICH directory is gated — the test name would
		// have asserted a fact the body never checked. Pinned here so the name is a
		// claim the test actually defends.
		let mut probed: Option<PathBuf> = None;
		let dir = xdg_state_logs(
			Some(OsStr::new("/xdg/state")),
			None,
			Path::new("/tmp/pi-natives-test-home/.omp/agent"),
			|p| {
				probed = Some(p.to_path_buf());
				false
			},
		);
		assert_eq!(dir, None);
		assert_eq!(probed, Some(PathBuf::from("/xdg/state/ultraworkers")));
	}

	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn xdg_state_logs_skipped_when_xdg_state_home_unset_or_empty() {
		let default_agent = Path::new("/tmp/pi-natives-test-home/.omp/agent");
		assert_eq!(xdg_state_logs(None, None, default_agent, |_p| true), None);
		assert_eq!(xdg_state_logs(Some(OsStr::new("")), None, default_agent, |_p| true), None);
	}

	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn xdg_state_logs_skipped_when_agent_dir_overridden() {
		// `PI_CODING_AGENT_DIR` pointing elsewhere mirrors the JS `isDefault ===
		// false` branch in `packages/utils/src/dirs.ts` and must disable XDG.
		let dir = xdg_state_logs(
			Some(OsStr::new("/xdg/state")),
			Some(OsStr::new("/some/custom/agent")),
			Path::new("/tmp/pi-natives-test-home/.omp/agent"),
			|_p| true,
		);
		assert_eq!(dir, None);
	}

	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn xdg_state_logs_honored_when_agent_override_matches_default() {
		let default_agent = std::path::absolute(Path::new("./.omp/agent")).unwrap();
		let dir = xdg_state_logs(
			Some(OsStr::new("/xdg/state")),
			Some(OsStr::new("./.omp/agent")),
			&default_agent,
			|_p| true,
		);
		assert_eq!(dir, Some(PathBuf::from("/xdg/state/ultraworkers/logs")));
	}

	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn default_agent_dir_defaults_to_next_spelling_when_no_candidate_exists() {
		// The agent-dir default is derived, not literal: with nothing on disk
		// the candidate scan yields the write target, which is the spelling
		// `PI_CODING_AGENT_DIR` is compared against. Pinning `.omp` here made
		// that comparison reject a user pointing at the CURRENT spelling.
		let dir = default_agent_dir(
			Path::new("/tmp/pi-natives-test-home"),
			None,
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.ultraworkers/agent"));
	}
	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn default_agent_dir_follows_the_candidate_holding_the_config() {
		// The half-migrated shape: both spellings present, only the legacy one
		// holds an agent config. The default must follow the config, or the
		// XDG eligibility check compares against a directory nobody is using.
		let dir = default_agent_dir(
			Path::new("/tmp/pi-natives-test-home"),
			None,
			&exists_in(&[
				"/tmp/pi-natives-test-home/.ultraworkers",
				"/tmp/pi-natives-test-home/.omp/agent/config.yml",
			]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.omp/agent"));
	}
	#[cfg(any(target_os = "linux", target_os = "macos"))]
	#[test]
	fn default_agent_dir_respects_pi_config_dir() {
		let dir = default_agent_dir(
			Path::new("/tmp/pi-natives-test-home"),
			Some(OsStr::new(".omp-dev")),
			&exists_in(&[]),
			&no_profiles,
		);
		assert_eq!(dir, PathBuf::from("/tmp/pi-natives-test-home/.omp-dev/agent"));
	}

	#[test]
	fn build_crash_log_path_tags_kind_and_pid() {
		let dir = Path::new("/tmp/pi-natives-test-home/.omp/logs");
		let panic_log = build_crash_log_path(dir, CrashKind::Panic, 4242, 1_700_000_000_000);
		assert_eq!(
			panic_log,
			PathBuf::from("/tmp/pi-natives-test-home/.omp/logs/native-panic-4242-1700000000000.log")
		);
		let alloc_log = build_crash_log_path(dir, CrashKind::Alloc, 99, 1);
		assert_eq!(
			alloc_log,
			PathBuf::from("/tmp/pi-natives-test-home/.omp/logs/native-alloc-99-1.log")
		);
	}
}
