# Precompiled Binaries

This directory contains precompiled calendar-helper binaries for fallback scenarios when Swift compiler is not available.

## Architecture Support

- `calendar-helper-arm64`: Apple Silicon (M1/M2/M3) Macs
- `calendar-helper-x64`: Intel x64 Macs

## Usage

These binaries are used automatically by the build system when Swift compilation fails. The build script will copy the appropriate binary based on the target architecture.

## Updating Binaries

To update precompiled binaries:

1. Build on each target architecture:
   ```bash
   # On Apple Silicon Mac
   swiftc ../CalendarHelper.swift -O -o calendar-helper-arm64 -target arm64-apple-macosx11.0
   
   # On Intel Mac (or cross-compile)
   swiftc ../CalendarHelper.swift -O -o calendar-helper-x64 -target x86_64-apple-macosx11.0
   ```

2. Verify binaries work:
   ```bash
   ./calendar-helper-arm64  # Should output JSON or permission error
   ./calendar-helper-x64    # Should output JSON or permission error
   ```

3. Commit updated binaries to repository

## Security

These binaries are signed during the Electron packaging process and inherit the app's entitlements for calendar access.
