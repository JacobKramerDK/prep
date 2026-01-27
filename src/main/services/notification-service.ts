import { BrowserWindow } from 'electron'
import { Debug } from '../../shared/utils/debug'

export interface CalendarEventNotification {
  source: string
  eventCount: number
  action?: string
  accountEmail?: string
}

export class NotificationService {
  private mainWindow: BrowserWindow | null = null
  private onCalendarEventsUpdatedCallback?: (data: CalendarEventNotification) => void

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  setCalendarEventsUpdatedCallback(callback: (data: CalendarEventNotification) => void): void {
    this.onCalendarEventsUpdatedCallback = callback
  }

  notifyCalendarEventsUpdated(data: CalendarEventNotification): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('calendar:eventsUpdated', data)
      Debug.log(`[NOTIFICATION] Calendar events updated: ${data.eventCount} events from ${data.source}`)
    } else {
      Debug.log('[NOTIFICATION] Cannot send notification - main window not available')
    }

    // Call the callback if set (for cache invalidation)
    if (this.onCalendarEventsUpdatedCallback) {
      this.onCalendarEventsUpdatedCallback(data)
    }
  }
}
