import { useState, useEffect } from 'react'
import { PlatformInfo } from '../../shared/types/platform'

export const useOSDetection = () => {
  const [osInfo, setOSInfo] = useState<PlatformInfo>({
    isWindows: false,
    isMacOS: false,
    isLinux: false,
    hasAppleScript: false,
    hasSwift: false,
    platform: 'darwin'
  })

  useEffect(() => {
    const detectOS = async () => {
      try {
        const platformInfo = await window.electronAPI.getPlatformInfo()
        setOSInfo(platformInfo)
      } catch (error) {
        console.error('Failed to detect OS:', error)
        // Fallback to Windows detection
        setOSInfo({
          isWindows: true,
          isMacOS: false,
          isLinux: false,
          hasAppleScript: false,
          hasSwift: false,
          platform: 'win32'
        })
      }
    }

    detectOS()
  }, [])

  return osInfo
}