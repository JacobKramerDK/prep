export interface PlatformInfo {
  isWindows: boolean
  isMacOS: boolean
  isLinux: boolean
  hasAppleScript: boolean
  hasSwift: boolean
  platform: NodeJS.Platform
}

export interface PlatformCapabilities {
  canAccessAppleCalendar: boolean
  canAccessSwiftCalendar: boolean
  supportsNativeBinary: boolean
}
