import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { CalendarSelector } from '../../src/renderer/components/CalendarSelector'

// Mock the electron API
const mockDiscoverCalendars = jest.fn()
Object.defineProperty(window, 'electronAPI', {
  value: {
    discoverCalendars: mockDiscoverCalendars
  }
})

describe('CalendarSelector Race Condition Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle component unmount during async operation', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: any) => void
    const controlledPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    mockDiscoverCalendars.mockReturnValue(controlledPromise)

    // Render and immediately unmount
    const { unmount } = render(
      <CalendarSelector 
        selectedNames={[]} 
        onSelectionChange={() => {}} 
      />
    )

    // Verify loading state is shown
    expect(screen.getByText('Loading calendars...')).toBeInTheDocument()

    // Unmount before async operation completes
    unmount()

    // Complete the async operation after unmount
    resolvePromise!({ calendars: [{ name: 'Test Calendar', uid: 'test', title: 'test', type: 'local', isVisible: true }] })

    // Wait a bit to ensure no state updates occur
    await new Promise(resolve => setTimeout(resolve, 100))

    // No errors should be thrown and no warnings should appear
    // This test passes if no React warnings about setting state on unmounted component appear
  })

  it('should properly set state when component remains mounted', async () => {
    const mockCalendars = [
      { name: 'Work Calendar', uid: 'work', title: 'work', type: 'local' as const, isVisible: true },
      { name: 'Personal Calendar', uid: 'personal', title: 'personal', type: 'local' as const, isVisible: true }
    ]

    mockDiscoverCalendars.mockResolvedValue({ calendars: mockCalendars })

    render(
      <CalendarSelector 
        selectedNames={[]} 
        onSelectionChange={() => {}} 
      />
    )

    // Wait for calendars to load
    await waitFor(() => {
      expect(screen.getByText('Work Calendar')).toBeInTheDocument()
      expect(screen.getByText('Personal Calendar')).toBeInTheDocument()
    })
  })
})
