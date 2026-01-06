import {
  CalendarEvent,
  CalendarEventIPC,
  CalendarImportResult,
  CalendarImportResultIPC,
  calendarEventToIPC,
  calendarEventFromIPC,
  calendarImportResultToIPC,
  calendarImportResultFromIPC
} from '../../src/shared/types/calendar'

describe('Calendar IPC Serialization', () => {
  const mockEvent: CalendarEvent = {
    id: 'test-1',
    title: 'Test Meeting',
    description: 'A test meeting',
    startDate: new Date('2026-01-06T10:00:00Z'),
    endDate: new Date('2026-01-06T11:00:00Z'),
    location: 'Conference Room A',
    attendees: ['user1@example.com', 'user2@example.com'],
    isAllDay: false,
    source: 'applescript',
    calendarName: 'Work Calendar'
  }

  const mockResult: CalendarImportResult = {
    events: [mockEvent],
    totalEvents: 1,
    importedAt: new Date('2026-01-06T09:00:00Z'),
    source: 'applescript'
  }

  test('should convert CalendarEvent to IPC format', () => {
    const ipcEvent = calendarEventToIPC(mockEvent)
    
    expect(ipcEvent.id).toBe(mockEvent.id)
    expect(ipcEvent.title).toBe(mockEvent.title)
    expect(ipcEvent.startDate).toBe('2026-01-06T10:00:00.000Z')
    expect(ipcEvent.endDate).toBe('2026-01-06T11:00:00.000Z')
    expect(typeof ipcEvent.startDate).toBe('string')
    expect(typeof ipcEvent.endDate).toBe('string')
  })

  test('should convert CalendarEvent from IPC format', () => {
    const ipcEvent: CalendarEventIPC = {
      ...mockEvent,
      startDate: '2026-01-06T10:00:00.000Z',
      endDate: '2026-01-06T11:00:00.000Z'
    }
    
    const event = calendarEventFromIPC(ipcEvent)
    
    expect(event.id).toBe(mockEvent.id)
    expect(event.title).toBe(mockEvent.title)
    expect(event.startDate).toEqual(new Date('2026-01-06T10:00:00Z'))
    expect(event.endDate).toEqual(new Date('2026-01-06T11:00:00Z'))
    expect(event.startDate instanceof Date).toBe(true)
    expect(event.endDate instanceof Date).toBe(true)
  })

  test('should handle round-trip conversion without data loss', () => {
    const ipcEvent = calendarEventToIPC(mockEvent)
    const convertedEvent = calendarEventFromIPC(ipcEvent)
    
    expect(convertedEvent.startDate.getTime()).toBe(mockEvent.startDate.getTime())
    expect(convertedEvent.endDate.getTime()).toBe(mockEvent.endDate.getTime())
    expect(convertedEvent.title).toBe(mockEvent.title)
  })

  test('should convert CalendarImportResult to IPC format', () => {
    const ipcResult = calendarImportResultToIPC(mockResult)
    
    expect(ipcResult.totalEvents).toBe(1)
    expect(ipcResult.importedAt).toBe('2026-01-06T09:00:00.000Z')
    expect(typeof ipcResult.importedAt).toBe('string')
    expect(ipcResult.events).toHaveLength(1)
    expect(typeof ipcResult.events[0].startDate).toBe('string')
  })

  test('should convert CalendarImportResult from IPC format', () => {
    const ipcResult = calendarImportResultToIPC(mockResult)
    const result = calendarImportResultFromIPC(ipcResult)
    
    expect(result.totalEvents).toBe(1)
    expect(result.importedAt instanceof Date).toBe(true)
    expect(result.importedAt.getTime()).toBe(mockResult.importedAt.getTime())
    expect(result.events[0].startDate instanceof Date).toBe(true)
  })

  test('should survive JSON serialization/deserialization', () => {
    const ipcResult = calendarImportResultToIPC(mockResult)
    
    // Simulate IPC serialization
    const serialized = JSON.stringify(ipcResult)
    const deserialized: CalendarImportResultIPC = JSON.parse(serialized)
    
    // Convert back to Date objects
    const result = calendarImportResultFromIPC(deserialized)
    
    expect(result.importedAt instanceof Date).toBe(true)
    expect(result.events[0].startDate instanceof Date).toBe(true)
    expect(result.events[0].startDate.getTime()).toBe(mockEvent.startDate.getTime())
  })
})
