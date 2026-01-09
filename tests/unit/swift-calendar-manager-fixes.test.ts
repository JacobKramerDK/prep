describe('Swift Calendar Integration Fixes', () => {
  it('should have built the Swift binary successfully', () => {
    const fs = require('fs')
    const path = require('path')
    const binaryPath = path.join(process.cwd(), 'resources/bin/calendar-helper')
    
    expect(fs.existsSync(binaryPath)).toBe(true)
    expect(fs.statSync(binaryPath).isFile()).toBe(true)
  })

  it('should have proper build script with cleanup', () => {
    const fs = require('fs')
    const path = require('path')
    const buildScriptPath = path.join(process.cwd(), 'native/build.sh')
    
    expect(fs.existsSync(buildScriptPath)).toBe(true)
    
    const buildScript = fs.readFileSync(buildScriptPath, 'utf8')
    expect(buildScript).toContain('cleanup()')
    expect(buildScript).toContain('trap cleanup EXIT')
  })

  it('should have timeout handling in Swift binary', () => {
    const fs = require('fs')
    const path = require('path')
    const swiftPath = path.join(process.cwd(), 'native/CalendarHelper.swift')
    
    expect(fs.existsSync(swiftPath)).toBe(true)
    
    const swiftCode = fs.readFileSync(swiftPath, 'utf8')
    expect(swiftCode).toContain('timeout')
    expect(swiftCode).toContain('PERMISSION_TIMEOUT')
  })
})
