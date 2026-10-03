# Test binary build from local source
FROM debian:bookworm-slim

# cmake, ninja-build and pkg-config are required by the native addon: opusic-sys
# builds the bundled Opus through the cmake crate, which shells out to
# `cmake -G Ninja`, so the driver, the generator and the compiler lookup all have
# to be installed. git is required too — Opus's own CMakeLists calls
# `find_package(Git)` to stamp its version.
#
# Each was measured on this image, one failing layer at a time, and each layer
# only appears once the previous one is gone:
#   cmake absent   -> panicked: is `cmake` not installed?
#   git absent     -> Could NOT find Git (missing: GIT_EXECUTABLE)
#   ninja absent   -> CMake was unable to find a build program corresponding to "Ninja"
RUN apt-get update && apt-get install -y curl ca-certificates unzip build-essential cmake ninja-build pkg-config git && rm -rf /var/lib/apt/lists/*

# Install bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Install Rust — the host native addon builds through the default
# cargo/napi-rs backend, so no bazelisk is needed.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain nightly
ENV PATH="/root/.cargo/bin:$PATH"

# Copy local repo
WORKDIR /repo
COPY . .

# Build native addon and binary
RUN bun install --frozen-lockfile
RUN bun --cwd=packages/natives run build
RUN cd packages/coding-agent && bun run build

# Install binary to PATH
RUN mkdir -p /root/.local/bin && \
    cp packages/coding-agent/dist/ultraworkers /root/.local/bin/
ENV PATH="/root/.local/bin:$PATH"

# Verify
RUN HOME=/tmp/omp-home XDG_DATA_HOME=/tmp/omp-xdg ultraworkers --version
