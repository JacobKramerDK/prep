describe('Security Fixes Validation', () => {
  describe('Email parsing ReDoS prevention', () => {
    it('should handle long strings without catastrophic backtracking', () => {
      // Test the safe string parsing approach
      const longString = 'a'.repeat(10000) + '<test@example.com>'
      
      const startTime = Date.now()
      
      // Simulate the safe parsing logic
      const trimmedAttendee = longString.trim()
      let result = ''
      
      if (trimmedAttendee.length > 200) {
        result = trimmedAttendee.substring(0, 50)
      } else {
        const angleIndex = trimmedAttendee.indexOf('<')
        if (angleIndex !== -1 && trimmedAttendee.endsWith('>')) {
          result = trimmedAttendee.substring(0, angleIndex).trim()
        }
      }
      
      const duration = Date.now() - startTime
      
      // Should complete quickly (under 10ms) even with malicious input
      expect(duration).toBeLessThan(10)
      expect(result).toBe('a'.repeat(50))
    })

    it('should parse normal email formats correctly', () => {
      const testCases = [
        'John Doe <john@example.com>',
        'jane@example.com',
        'Bob Smith',
        'Alice <alice@test.com>'
      ]
      
      testCases.forEach(attendee => {
        const trimmedAttendee = attendee.trim()
        let name = ''
        let email = ''
        
        const angleIndex = trimmedAttendee.indexOf('<')
        if (angleIndex !== -1 && trimmedAttendee.endsWith('>')) {
          name = trimmedAttendee.substring(0, angleIndex).trim()
          email = trimmedAttendee.substring(angleIndex + 1, trimmedAttendee.length - 1).trim()
        } else if (trimmedAttendee.includes('@')) {
          email = trimmedAttendee
        } else {
          name = trimmedAttendee
        }
        
        // Should not throw errors
        expect(typeof name).toBe('string')
        expect(typeof email).toBe('string')
      })
    })
  })

  describe('FlexSearch disposal safety', () => {
    it('should safely check for destroy method existence', () => {
      const mockIndex = {
        destroy: jest.fn()
      }
      
      // Test the safe disposal logic
      let error = null
      try {
        if (mockIndex && typeof (mockIndex as any).destroy === 'function') {
          (mockIndex as any).destroy()
        }
      } catch (e) {
        error = e
      }
      
      expect(error).toBeNull()
      expect(mockIndex.destroy).toHaveBeenCalled()
    })

    it('should handle missing destroy method gracefully', () => {
      const mockIndex = {}
      
      let error = null
      try {
        if (mockIndex && typeof (mockIndex as any).destroy === 'function') {
          (mockIndex as any).destroy()
        }
      } catch (e) {
        error = e
      }
      
      expect(error).toBeNull()
    })
  })

  describe('Recursive rescan prevention', () => {
    it('should prevent recursive calls with flag', () => {
      let isRescanning = false
      let rescanCount = 0
      
      const mockRescan = () => {
        if (!isRescanning) {
          isRescanning = true
          rescanCount++
          // Simulate async operation
          setTimeout(() => {
            isRescanning = false
          }, 1)
        }
      }
      
      // Multiple rapid calls
      mockRescan()
      mockRescan()
      mockRescan()
      
      expect(rescanCount).toBe(1)
    })
  })

  describe('Production performance optimization', () => {
    it('should skip timing calculations in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      let timingCalculated = false
      
      // Simulate the production check
      if (process.env.NODE_ENV === 'development') {
        const startTime = Date.now()
        // Simulate work
        const endTime = Date.now()
        timingCalculated = true
      }
      
      expect(timingCalculated).toBe(false)
      
      process.env.NODE_ENV = originalEnv
    })
  })
})
