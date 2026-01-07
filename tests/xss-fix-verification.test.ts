describe('XSS Protection Verification', () => {
  test('should verify react-markdown is used instead of dangerouslySetInnerHTML', () => {
    // Read the MeetingBriefDisplay component to verify the fix
    const fs = require('fs')
    const path = require('path')
    
    const componentPath = path.join(__dirname, '../src/renderer/components/MeetingBriefDisplay.tsx')
    const componentContent = fs.readFileSync(componentPath, 'utf8')
    
    // Verify dangerouslySetInnerHTML is not used
    expect(componentContent).not.toContain('dangerouslySetInnerHTML')
    
    // Verify ReactMarkdown is imported and used
    expect(componentContent).toContain('import ReactMarkdown from \'react-markdown\'')
    expect(componentContent).toContain('<ReactMarkdown>')
    
    // Verify the old formatContentForDisplay function is removed
    expect(componentContent).not.toContain('formatContentForDisplay')
  })

  test('should verify print function sanitizes content', () => {
    const fs = require('fs')
    const path = require('path')
    
    const componentPath = path.join(__dirname, '../src/renderer/components/MeetingBriefDisplay.tsx')
    const componentContent = fs.readFileSync(componentPath, 'utf8')
    
    // Verify print function includes sanitization
    expect(componentContent).toContain('replace(/[<>&"\']/g')
    expect(componentContent).toContain('&lt;')
    expect(componentContent).toContain('&gt;')
    expect(componentContent).toContain('&amp;')
  })
})
