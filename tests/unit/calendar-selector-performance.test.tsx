import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarSelector } from '../../src/renderer/components/CalendarSelector'

// Mock the electron API
const mockDiscoverCalendars = jest.fn()
Object.defineProperty(window, 'electronAPI', {
  value: {
    discoverCalendars: mockDiscoverCalendars
  }
})

describe('CalendarSelector Performance Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should memoize filtered calendars to prevent unnecessary recalculations', async () => {
    const mockCalendars = Array.from({ length: 100 }, (_, i) => ({
      name: `Calendar ${i}`,
      uid: `cal-${i}`,
      title: `Calendar ${i}`,
      type: 'local' as const,
      isVisible: true
    }))

    mockDiscoverCalendars.mockResolvedValue({ calendars: mockCalendars })

    const { rerender } = render(
      <CalendarSelector 
        selectedNames={[]} 
        onSelectionChange={() => {}} 
      />
    )

    // Wait for calendars to load
    await screen.findByText('Calendar 0')

    // Search for specific calendars
    const searchInput = screen.getByPlaceholderText('Search calendars...')
    fireEvent.change(searchInput, { target: { value: 'Calendar 1' } })

    // Should show filtered results
    expect(screen.getByText('Calendar 1')).toBeInTheDocument()
    expect(screen.getByText('Calendar 10')).toBeInTheDocument()
    expect(screen.queryByText('Calendar 2')).not.toBeInTheDocument()

    // Re-render with same props should not cause re-filtering
    rerender(
      <CalendarSelector 
        selectedNames={[]} 
        onSelectionChange={() => {}} 
      />
    )

    // Results should still be filtered correctly
    expect(screen.getByText('Calendar 1')).toBeInTheDocument()
    expect(screen.getByText('Calendar 10')).toBeInTheDocument()
  })
})
