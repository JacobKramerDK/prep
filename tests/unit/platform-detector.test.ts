import { PlatformDetector } from '../../src/main/services/platform-detector'

describe('PlatformDetector', () => {
  let originalPlatform: NodeJS.Platform

  beforeEach(() => {
    originalPlatform = process.platform
  })

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true
    })
  })

  describe('Windows detection', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true
      })
    })

    it('should detect Windows correctly', () => {
      const detector = new PlatformDetector()
      const platformInfo = detector.getPlatformInfo()

      expect(platformInfo.isWindows).toBe(true)
      expect(platformInfo.isMacOS).toBe(false)
      expect(platformInfo.isLinux).toBe(false)
      expect(platformInfo.platform).toBe('win32')
    })

    it('should report no Apple capabilities on Windows', () => {
      const detector = new PlatformDetector()
      const platformInfo = detector.getPlatformInfo()

      expect(platformInfo.hasAppleScript).toBe(false)
      expect(platformInfo.hasSwift).toBe(false)
    })

    it('should return correct capabilities for Windows', () => {
      const detector = new PlatformDetector()
      const capabilities = detector.getCapabilities()

      expect(capabilities.canAccessAppleCalendar).toBe(false)
      expect(capabilities.canAccessSwiftCalendar).toBe(false)
      expect(capabilities.supportsNativeBinary).toBe(false)
    })
  })

  describe('macOS detection', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true
      })
    })

    it('should detect macOS correctly', () => {
      const detector = new PlatformDetector()
      const platformInfo = detector.getPlatformInfo()

      expect(platformInfo.isWindows).toBe(false)
      expect(platformInfo.isMacOS).toBe(true)
      expect(platformInfo.isLinux).toBe(false)
      expect(platformInfo.platform).toBe('darwin')
    })

    it('should report Apple capabilities on macOS', () => {
      const detector = new PlatformDetector()
      const platformInfo = detector.getPlatformInfo()

      expect(platformInfo.hasAppleScript).toBe(true)
      expect(platformInfo.hasSwift).toBe(true)
    })

    it('should return correct capabilities for macOS', () => {
      const detector = new PlatformDetector()
      const capabilities = detector.getCapabilities()

      expect(capabilities.canAccessAppleCalendar).toBe(true)
      expect(capabilities.canAccessSwiftCalendar).toBe(true)
      expect(capabilities.supportsNativeBinary).toBe(true)
    })
  })

  describe('Linux detection', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true
      })
    })

    it('should detect Linux correctly', () => {
      const detector = new PlatformDetector()
      const platformInfo = detector.getPlatformInfo()

      expect(platformInfo.isWindows).toBe(false)
      expect(platformInfo.isMacOS).toBe(false)
      expect(platformInfo.isLinux).toBe(true)
      expect(platformInfo.platform).toBe('linux')
    })

    it('should report no Apple capabilities on Linux', () => {
      const detector = new PlatformDetector()
      const platformInfo = detector.getPlatformInfo()

      expect(platformInfo.hasAppleScript).toBe(false)
      expect(platformInfo.hasSwift).toBe(false)
    })
  })

  describe('convenience methods', () => {
    it('should provide correct convenience methods for Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true
      })

      const detector = new PlatformDetector()

      expect(detector.isWindows()).toBe(true)
      expect(detector.isMacOS()).toBe(false)
      expect(detector.isLinux()).toBe(false)
      expect(detector.hasAppleScript()).toBe(false)
      expect(detector.hasSwift()).toBe(false)
    })

    it('should provide correct convenience methods for macOS', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true
      })

      const detector = new PlatformDetector()

      expect(detector.isWindows()).toBe(false)
      expect(detector.isMacOS()).toBe(true)
      expect(detector.isLinux()).toBe(false)
      expect(detector.hasAppleScript()).toBe(true)
      expect(detector.hasSwift()).toBe(true)
    })
  })
})
