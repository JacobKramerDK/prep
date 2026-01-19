export class Debug {
  private static isDebugMode = false // Always start with false, rely on explicit setDebugMode calls

  static setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled
  }

  static isEnabled(): boolean {
    return this.isDebugMode
  }

  static log(...args: any[]): void {
    if (this.isDebugMode) {
      console.log('[DEBUG]', ...args)
    }
  }

  static error(...args: any[]): void {
    if (this.isDebugMode) {
      console.error('[DEBUG ERROR]', ...args)
    }
  }
}
