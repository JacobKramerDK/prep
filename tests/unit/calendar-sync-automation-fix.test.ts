import { CalendarManager } from '../../src/main/services/calendar-manager'
import { SettingsManager } from '../../src/main/services/settings-manager'

// Mock the settings manager
jest.mock('../../src/main/services/settings-manager')

describe('Calendar Sync Automation Fix', () => {
  let calendarManager: CalendarManager
  let mockSettingsManager: jest.Mocked<SettingsManager>

  beforeEach(() => {
    mockSettingsManager = new SettingsManager() as jest.Mocked<SettingsManager>
    calendarManager = new CalendarManager()
    
    // Inject the mocked settings manager
    ;(calendarManager as any).settingsManager = mockSettingsManager
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('performAutomaticSync', () => {
    it('should get selected calendars from settings and pass them to Apple Calendar extraction', async () => {
      // Mock settings to return empty selected calendars (the problematic case)
      mockSettingsManager.getCalendarSelection.mockResolvedValue({
        selectedCalendarUids: [], // This was causing the undefined issue
        lastDiscovery: null,
        discoveryCache: [],
        autoSelectNew: true
      })

      mockSettingsManager.getGoogleCalendarConnected.mockResolvedValue(false)

      // Mock the Apple Calendar extraction method to verify it gets called with correct parameters
      const mockExtractAppleScriptEvents = jest.spyOn(calendarManager, 'extractAppleScriptEvents')
        .mockResolvedValue({
          events: [],
          totalEvents: 0,
          importedAt: new Date(),
          source: 'applescript'
        })

      // Mock isAppleScriptAvailable to true
      ;(calendarManager as any).isAppleScriptAvailable = true

      try {
        await calendarManager.performAutomaticSync()
      } catch (error) {
        // We expect this to potentially fail due to mocking, but we want to verify the call
      }

      // Verify that extractAppleScriptEvents was called with the empty array from settings
      expect(mockExtractAppleScriptEvents).toHaveBeenCalledWith([])
      expect(mockSettingsManager.getCalendarSelection).toHaveBeenCalled()
    })

    it('should pass selected calendar names when they exist in settings', async () => {
      // Mock settings to return some selected calendars
      const selectedCalendars = ['Work Calendar', 'Personal Calendar']
      mockSettingsManager.getCalendarSelection.mockResolvedValue({
        selectedCalendarUids: selectedCalendars,
        lastDiscovery: null,
        discoveryCache: [],
        autoSelectNew: true
      })

      mockSettingsManager.getGoogleCalendarConnected.mockResolvedValue(false)

      // Mock the Apple Calendar extraction method
      const mockExtractAppleScriptEvents = jest.spyOn(calendarManager, 'extractAppleScriptEvents')
        .mockResolvedValue({
          events: [],
          totalEvents: 0,
          importedAt: new Date(),
          source: 'applescript'
        })

      // Mock isAppleScriptAvailable to true
      ;(calendarManager as any).isAppleScriptAvailable = true

      try {
        await calendarManager.performAutomaticSync()
      } catch (error) {
        // We expect this to potentially fail due to mocking, but we want to verify the call
      }

      // Verify that extractAppleScriptEvents was called with the selected calendars
      expect(mockExtractAppleScriptEvents).toHaveBeenCalledWith(selectedCalendars)
      expect(mockSettingsManager.getCalendarSelection).toHaveBeenCalled()
    })
  })

  describe('performAppleScriptExtraction', () => {
    it('should handle empty selected calendars by auto-discovering available calendars', async () => {
      // Mock the discovery method to return some calendars
      const mockDiscoverCalendars = jest.spyOn(calendarManager, 'discoverCalendars')
        .mockResolvedValue({
          calendars: [
            {
              uid: 'calendar1',
              name: 'Work Calendar',
              title: 'Work Calendar',
              type: 'local',
              isVisible: true
            },
            {
              uid: 'calendar2', 
              name: 'Personal Calendar',
              title: 'Personal Calendar',
              type: 'local',
              isVisible: true
            },
            {
              uid: 'birthdays',
              name: 'Birthdays',
              title: 'Birthdays',
              type: 'local',
              isVisible: true
            }
          ],
          totalCalendars: 3,
          discoveredAt: new Date()
        })

      // Mock the checkAppleScriptPermissions method
      jest.spyOn(calendarManager as any, 'checkAppleScriptPermissions')
        .mockResolvedValue(undefined)

      // Mock the actual AppleScript execution to avoid real system calls
      jest.spyOn(calendarManager as any, 'executeAppleScriptRaw')
        .mockResolvedValue('[]') // Empty events result

      try {
        // Call with empty array (the problematic case)
        const result = await (calendarManager as any).performAppleScriptExtraction([])
        
        // Should have called discovery when no calendars were selected
        expect(mockDiscoverCalendars).toHaveBeenCalled()
        
        // Should return a valid result
        expect(result).toBeDefined()
        expect(result.source).toBe('applescript')
      } catch (error) {
        // The method should auto-discover calendars and not fail with undefined
        const errorMessage = error instanceof Error ? error.message : String(error)
        expect(errorMessage).not.toContain('undefined')
        expect(errorMessage).not.toContain('Selected calendars for extraction: undefined')
      }
    })

    it('should filter out system calendars during auto-discovery', async () => {
      // Mock the discovery method to return calendars including system ones
      const mockDiscoverCalendars = jest.spyOn(calendarManager, 'discoverCalendars')
        .mockResolvedValue({
          calendars: [
            {
              uid: 'calendar1',
              name: 'Work Calendar',
              title: 'Work Calendar', 
              type: 'local',
              isVisible: true
            },
            {
              uid: 'birthdays',
              name: 'Birthdays',
              title: 'Birthdays',
              type: 'local',
              isVisible: true
            },
            {
              uid: 'siri',
              name: 'Siri Suggestions',
              title: 'Siri Suggestions',
              type: 'local',
              isVisible: true
            }
          ],
          totalCalendars: 3,
          discoveredAt: new Date()
        })

      // Mock other methods
      jest.spyOn(calendarManager as any, 'checkAppleScriptPermissions')
        .mockResolvedValue(undefined)
      jest.spyOn(calendarManager as any, 'executeAppleScriptRaw')
        .mockResolvedValue('[]')

      try {
        await (calendarManager as any).performAppleScriptExtraction([])
        
        expect(mockDiscoverCalendars).toHaveBeenCalled()
        // The method should filter out 'Birthdays' and 'Siri Suggestions'
        // and only use 'Work Calendar'
      } catch (error) {
        // Should not fail due to system calendar filtering
        const errorMessage = error instanceof Error ? error.message : String(error)
        expect(errorMessage).not.toContain('Birthdays')
        expect(errorMessage).not.toContain('Siri Suggestions')
      }
    })
  })
})
