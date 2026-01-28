// Debug logging utilities for renderer process
export const debugLog = (prefix: string, message: string, ...args: any[]) => {
  if (window.electronAPI?.isDebugMode) {
    // Serialize objects for better logging
    const serializedArgs = args.map(arg => 
      typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : arg
    )
    console.log(`[${prefix}] ${message}`, ...serializedArgs)
  }
}

export const debugError = (prefix: string, message: string, error: any) => {
  if (window.electronAPI?.isDebugMode) {
    console.error(`[${prefix}] ${message}`, error)
  }
}
