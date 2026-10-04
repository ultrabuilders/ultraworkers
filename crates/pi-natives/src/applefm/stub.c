// Stand-in for bridge.swift when the build host has no Swift 6.4+ toolchain
// with the macOS 27 SDK (or targets Intel): same C ABI, reports the bridge as
// not built.
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

typedef void (*ultraworkers_applefm_emit)(void *context, const char *event_json, bool final);

char *ultraworkers_applefm_availability(void) {
	return strdup("{\"type\":\"availability\",\"available\":false,\"reason\":\"not_built\"}");
}

void ultraworkers_applefm_generate(uint64_t handle, const char *request_json, void *context, ultraworkers_applefm_emit emit) {
	(void)handle;
	(void)request_json;
	emit(context,
		"{\"type\":\"error\",\"code\":\"not_built\",\"message\":\"This ultraworkers build does not include Apple Foundation "
		"Models support\"}",
		true);
}

void ultraworkers_applefm_cancel(uint64_t handle) { (void)handle; }

void ultraworkers_applefm_free(char *pointer) { free(pointer); }
