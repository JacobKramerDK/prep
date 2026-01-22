import * as fs from 'fs'
import * as path from 'path'

export class Debug {
  private static isDebugMode = false // Always start with false, rely on explicit setDebugMode calls
  private static logStream: fs.WriteStream | null = null
  private static logFilePath: string | null = null

  static setDebugMode(enabled: boolean, logPath?: string): void {
    this.isDebugMode = enabled
    if (enabled && logPath) {
      this.initializeFileLogging(logPath)
    } else if (!enabled) {
      this.closeFileLogging()
    }
  }

  private static initializeFileLogging(logPath: string): void {
    try {
      // Close existing stream if it exists to prevent file handle leaks
      if (this.logStream) {
        this.logStream.end()
      }
      
      this.logFilePath = logPath
      const logDir = path.dirname(logPath)
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      this.logStream = fs.createWriteStream(logPath, { flags: 'a' })
    } catch (error) {
      console.error('Failed to initialize debug file logging:', error)
    }
  }

  private static closeFileLogging(): void {
    if (this.logStream) {
      this.logStream.end()
      this.logStream = null
    }
    this.logFilePath = null
  }

  static isEnabled(): boolean {
    return this.isDebugMode
  }

  static log(...args: any[]): void {
    if (this.isDebugMode) {
      const timestamp = new Date().toISOString()
      const serializedArgs = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      const message = `[${timestamp}] [DEBUG] ${serializedArgs}`
      console.log(message)
      if (this.logStream) {
        this.logStream.write(message + '\n')
      }
    }
  }

  static error(...args: any[]): void {
    if (this.isDebugMode) {
      const timestamp = new Date().toISOString()
      const serializedArgs = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      const message = `[${timestamp}] [DEBUG ERROR] ${serializedArgs}`
      console.error(message)
      if (this.logStream) {
        this.logStream.write(message + '\n')
      }
    }
  }
}
