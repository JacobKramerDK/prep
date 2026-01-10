#!/bin/bash
set -e

cd "$(dirname "$0")"

# Cleanup function for error handling
cleanup() {
    echo "Cleaning up temporary files..."
    rm -f calendar-helper-arm64 calendar-helper-x64
    if [ -f ../resources/bin/calendar-helper ]; then
        rm -f ../resources/bin/calendar-helper
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Validate Swift availability
if ! command -v swiftc &> /dev/null; then
    echo "ERROR: Swift compiler not found. Install Xcode Command Line Tools: xcode-select --install"
    exit 1
fi

echo "Building calendar-helper..."

# Create output directory
mkdir -p ../resources/bin

# Build for both architectures with error handling
echo "Building for arm64..."
if ! swiftc CalendarHelper.swift -O -o calendar-helper-arm64 -target arm64-apple-macosx11.0; then
    echo "ERROR: Failed to build arm64 binary"
    exit 1
fi

echo "Building for x64..."
if ! swiftc CalendarHelper.swift -O -o calendar-helper-x64 -target x86_64-apple-macosx11.0; then
    echo "ERROR: Failed to build x64 binary"
    exit 1
fi

# Create universal binary
echo "Creating universal binary..."
if ! lipo -create -output ../resources/bin/calendar-helper calendar-helper-arm64 calendar-helper-x64; then
    echo "ERROR: Failed to create universal binary"
    exit 1
fi

# Make executable
chmod +x ../resources/bin/calendar-helper

# Sign the binary with calendar entitlements
echo "Signing binary with calendar entitlements..."
if [ -f ../build/entitlements.mac.plist ]; then
    if codesign --force --sign - --entitlements ../build/entitlements.mac.plist ../resources/bin/calendar-helper; then
        echo "SUCCESS: Binary signed with calendar entitlements"
    else
        echo "WARNING: Failed to sign binary, but continuing..."
    fi
else
    echo "WARNING: Entitlements file not found, signing without entitlements..."
    codesign --force --sign - ../resources/bin/calendar-helper || echo "WARNING: Failed to sign binary"
fi

echo "Built universal binary: resources/bin/calendar-helper"

# Verify binary
if file ../resources/bin/calendar-helper | grep -q "universal binary"; then
    echo "SUCCESS: Universal binary created successfully"
else
    echo "WARNING: Binary may not be universal"
fi

# Disable trap cleanup since we succeeded
trap - EXIT

# Manual cleanup of temporary files only
rm -f calendar-helper-arm64 calendar-helper-x64
