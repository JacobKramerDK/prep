import { CalendarSyncScheduler } from '../../src/main/services/calendar-sync-scheduler'
import { CalendarManager } from '../../src/main/services/calendar-manager'
import { CalendarImportResult } from '../../src/shared/types/calendar'

// Mock node-schedule
jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn().mockReturnValue({
    cancel: jest.fn(),
    nextInvocation: jest.fn().mockReturnValue(new Date('2026-01-11T06:00:00Z'))
  })
}))

// Mock electron powerMonitor
jest.mock('electron', () => ({
  powerMonitor: {
    on: jest.fn()
  }
}))

// Mock CalendarManager
jest.mock('../../src/main/services/calendar-manager')

describe('CalendarSyncScheduler', () => {
  let calendarSyncScheduler: CalendarSyncScheduler
  let mockCalendarManager: jest.Mocked<CalendarManager>
  let mockScheduleJob: jest.Mock
  let mockPowerMonitorOn: jest.Mock

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Setup mocks
    mockCalendarManager = {
      hasConnectedCalendars: jest.fn(),
      performAutomaticSync: jest.fn()
    } as any

    mockScheduleJob = require('node-schedule').scheduleJob
    mockPowerMonitorOn = require('electron').powerMonitor.on

    calendarSyncScheduler = new CalendarSyncScheduler(mockCalendarManager)
  })

  afterEach(() => {
    calendarSyncScheduler.dispose()
  })

  describe('constructor', () => {
    it('should initialize with calendar manager', () => {
      expect(mockPowerMonitorOn).toHaveBeenCalledWith('resume', expect.any(Function))
    })
  })

  describe('startDailySync', () => {
    it('should schedule daily sync job', async () => {
      await calendarSyncScheduler.startDailySync()

      expect(mockScheduleJob).toHaveBeenCalledWith('0 6 * * *', expect.any(Function))
    })

    it('should not schedule if already enabled', async () => {
      await calendarSyncScheduler.startDailySync()
      await calendarSyncScheduler.startDailySync()

      expect(mockScheduleJob).toHaveBeenCalledTimes(1)
    })

    it('should perform initial sync if no previous sync today', async () => {
      mockCalendarManager.hasConnectedCalendars.mockResolvedValue(true)
      mockCalendarManager.performAutomaticSync.mockResolvedValue({
        events: [],
        totalEvents: 0,
        importedAt: new Date(),
        source: 'swift'
      } as CalendarImportResult)

      await calendarSyncScheduler.startDailySync()

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve))

      expect(mockCalendarManager.hasConnectedCalendars).toHaveBeenCalled()
      expect(mockCalendarManager.performAutomaticSync).toHaveBeenCalled()
    })
  })

  describe('stopDailySync', () => {
    it('should cancel scheduled job', async () => {
      const mockJob = {
        cancel: jest.fn(),
        nextInvocation: jest.fn()
      }
      mockScheduleJob.mockReturnValue(mockJob)

      await calendarSyncScheduler.startDailySync()
      await calendarSyncScheduler.stopDailySync()

      expect(mockJob.cancel).toHaveBeenCalled()
    })
  })

  describe('getStatus', () => {
    it('should return correct status when disabled', async () => {
      const status = await calendarSyncScheduler.getStatus()

      expect(status).toEqual({
        isEnabled: false,
        lastSyncTime: null,
        nextSyncTime: null,
        isRunning: false,
        error: null
      })
    })

    it('should return correct status when enabled', async () => {
      const mockNextInvocation = new Date('2026-01-11T06:00:00Z')
      const mockJob = {
        cancel: jest.fn(),
        nextInvocation: jest.fn().mockReturnValue(mockNextInvocation)
      }
      mockScheduleJob.mockReturnValue(mockJob)

      await calendarSyncScheduler.startDailySync()
      const status = await calendarSyncScheduler.getStatus()

      expect(status.isEnabled).toBe(true)
      expect(status.nextSyncTime).toEqual(mockNextInvocation)
    })
  })

  describe('performManualSync', () => {
    it('should perform sync successfully', async () => {
      const mockResult: CalendarImportResult = {
        events: [],
        totalEvents: 5,
        importedAt: new Date(),
        source: 'swift'
      }

      mockCalendarManager.hasConnectedCalendars.mockResolvedValue(true)
      mockCalendarManager.performAutomaticSync.mockResolvedValue(mockResult)

      const result = await calendarSyncScheduler.performManualSync()

      expect(result.success).toBe(true)
      expect(result.eventsCount).toBe(5)
      expect(mockCalendarManager.performAutomaticSync).toHaveBeenCalled()
    })

    it('should handle no connected calendars', async () => {
      mockCalendarManager.hasConnectedCalendars.mockResolvedValue(false)

      const result = await calendarSyncScheduler.performManualSync()

      expect(result.success).toBe(true)
      expect(result.eventsCount).toBe(0)
      expect(result.error).toBe('No calendars connected')
      expect(mockCalendarManager.performAutomaticSync).not.toHaveBeenCalled()
    })

    it('should handle sync errors', async () => {
      const error = new Error('Sync failed')
      mockCalendarManager.hasConnectedCalendars.mockResolvedValue(true)
      mockCalendarManager.performAutomaticSync.mockRejectedValue(error)

      const result = await calendarSyncScheduler.performManualSync()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Sync failed')
    })

    it('should prevent concurrent syncs', async () => {
      mockCalendarManager.hasConnectedCalendars.mockResolvedValue(true)
      mockCalendarManager.performAutomaticSync.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          events: [],
          totalEvents: 0,
          importedAt: new Date(),
          source: 'swift'
        } as CalendarImportResult), 100))
      )

      const [result1, result2] = await Promise.all([
        calendarSyncScheduler.performManualSync(),
        calendarSyncScheduler.performManualSync()
      ])

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('Sync already in progress')
    })
  })

  describe('dispose', () => {
    it('should stop daily sync', async () => {
      const mockJob = {
        cancel: jest.fn(),
        nextInvocation: jest.fn()
      }
      mockScheduleJob.mockReturnValue(mockJob)

      await calendarSyncScheduler.startDailySync()
      calendarSyncScheduler.dispose()

      expect(mockJob.cancel).toHaveBeenCalled()
    })
  })
})
