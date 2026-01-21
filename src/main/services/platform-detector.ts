import { PlatformInfo, PlatformCapabilities } from '../../shared/types/platform'

export class PlatformDetector {
  private platformInfo: PlatformInfo

  constructor() {
    this.platformInfo = this.detectPlatform()
  }

  private detectPlatform(): PlatformInfo {
    const platform = process.platform
    const isWindows = platform === 'win32'
    const isMacOS = platform === 'darwin'
    const isLinux = platform === 'linux'

    return {
      isWindows,
      isMacOS,
      isLinux,
      hasAppleScript: isMacOS,
      hasSwift: isMacOS,
      platform
    }
  }

  getPlatformInfo(): PlatformInfo {
    return { ...this.platformInfo }
  }

  isWindows(): boolean {
    return this.platformInfo.isWindows
  }

  isMacOS(): boolean {
    return this.platformInfo.isMacOS
  }

  isLinux(): boolean {
    return this.platformInfo.isLinux
  }

  hasAppleScript(): boolean {
    return this.platformInfo.hasAppleScript
  }

  hasSwift(): boolean {
    return this.platformInfo.hasSwift
  }

  getCapabilities(): PlatformCapabilities {
    return {
      canAccessAppleCalendar: this.isMacOS(),
      canAccessSwiftCalendar: this.isMacOS(),
      supportsNativeBinary: this.isMacOS()
    }
  }
}
