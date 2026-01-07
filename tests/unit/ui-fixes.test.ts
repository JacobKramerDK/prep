import { meetingFromIPC, MeetingIPC } from '../../src/shared/types/meeting'

describe('UI Fixes', () => {
  describe('Date serialization handling', () => {
    it('should handle meeting dates from IPC correctly', () => {
      const meetingIPC: MeetingIPC = {
        id: 'test-meeting',
        title: 'Test Meeting',
        startDate: '2026-01-07T10:00:00.000Z',
        endDate: '2026-01-07T11:00:00.000Z',
        location: 'Test Location',
        description: 'Test Description',
        attendees: [],
        isAllDay: false,
        source: 'ics'
      }

      const meeting = meetingFromIPC(meetingIPC)
      
      expect(meeting.startDate).toBeInstanceOf(Date)
      expect(meeting.endDate).toBeInstanceOf(Date)
      expect(meeting.startDate.toLocaleDateString()).toBeDefined()
      expect(meeting.startDate.toLocaleTimeString()).toBeDefined()
    })

    it('should handle date objects correctly', () => {
      const startDate = new Date('2026-01-07T10:00:00.000Z')
      const endDate = new Date('2026-01-07T11:00:00.000Z')

      expect(() => startDate.toLocaleDateString()).not.toThrow()
      expect(() => startDate.toLocaleTimeString()).not.toThrow()
      expect(() => endDate.toLocaleDateString()).not.toThrow()
      expect(() => endDate.toLocaleTimeString()).not.toThrow()
    })
  })
})
