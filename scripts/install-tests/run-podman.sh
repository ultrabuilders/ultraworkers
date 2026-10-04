#!/bin/sh
set -e

cd "$(dirname "$0")/../.."

echo "=== Testing binary build ==="
podman build -f scripts/install-tests/binary.dockerfile -t ultraworkers-test-binary .

echo ""
echo "=== Testing source install ==="
podman build -f scripts/install-tests/source.dockerfile -t ultraworkers-test-source .

echo ""
echo "=== Testing tarball install (publish simulation) ==="
podman build -f scripts/install-tests/tarball.dockerfile -t ultraworkers-test-tarball .

echo ""
echo "=== All tests passed ==="
