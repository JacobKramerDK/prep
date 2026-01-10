import * as schedule from 'node-schedule'
import { powerMonitor } from 'electron'
import { CalendarManager } from './calendar-manager'
import { CalendarSyncStatus, CalendarSyncResult } from '../../shared/types/calendar-sync'

export class CalendarSyncScheduler {
  private calendarManager: CalendarManager
  private dailySyncJob: schedule.Job | null = null
  private isEnabled = false
  private lastSyncTime: Date | null = null
  private isRunning = false
  private lastError: string | null = null
  private readonly RESUME_DELAY_MS = 5000 // Configurable delay for system stabilization

  constructor(calendarManager: CalendarManager) {
    this.calendarManager = calendarManager
    this.setupPowerMonitor()
  }

  private setupPowerMonitor(): void {
    // Handle computer sleep/wake cycles
    powerMonitor.on('resume', () => {
      this.rescheduleIfNeeded()
    })
  }

  async startDailySync(): Promise<void> {
    if (this.isEnabled) {
      return
    }

    this.isEnabled = true
    this.lastError = null

    // Schedule daily sync at 6 AM
    this.dailySyncJob = schedule.scheduleJob('0 6 * * *', async () => {
      await this.performSync()
    })

    // Perform initial sync if we haven't synced today
    const today = new Date()
    const shouldPerformInitialSync = !this.lastSyncTime || 
      this.lastSyncTime.toDateString() !== today.toDateString()

    if (shouldPerformInitialSync) {
      // Perform sync in background without blocking
      setImmediate(async () => {
        try {
          await this.performSync()
        } catch (error) {
          console.error('Initial sync failed:', error)
        }
      })
    }
  }

  async stopDailySync(): Promise<void> {
    this.isEnabled = false
    
    if (this.dailySyncJob) {
      this.dailySyncJob.cancel()
      this.dailySyncJob = null
    }
  }

  private async rescheduleIfNeeded(): Promise<void> {
    if (!this.isEnabled) {
      return
    }

    // Check if we missed a sync while computer was asleep
    const now = new Date()
    const sixAMToday = new Date(now)
    sixAMToday.setHours(6, 0, 0, 0)

    const shouldSync = this.lastSyncTime === null || 
      (now > sixAMToday && this.lastSyncTime < sixAMToday)

    if (shouldSync) {
      // Perform sync after a short delay to allow system to stabilize
      setTimeout(() => this.performSync(), this.RESUME_DELAY_MS)
    }
  }

  private async performSync(): Promise<CalendarSyncResult> {
    if (this.isRunning) {
      return {
        success: false,
        eventsCount: 0,
        syncTime: new Date(),
        error: 'Sync already in progress'
      }
    }

    this.isRunning = true
    this.lastError = null
    const syncTime = new Date()

    try {
      // Check if any calendars are connected
      const hasConnectedCalendars = await this.calendarManager.hasConnectedCalendars()
      
      if (!hasConnectedCalendars) {
        this.isRunning = false
        return {
          success: true,
          eventsCount: 0,
          syncTime,
          error: 'No calendars connected'
        }
      }

      // Perform automatic sync
      const result = await this.calendarManager.performAutomaticSync()
      
      this.lastSyncTime = syncTime
      this.isRunning = false
      
      return {
        success: true,
        eventsCount: result.totalEvents,
        syncTime,
        error: null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
      this.lastError = errorMessage
      this.isRunning = false
      
      return {
        success: false,
        eventsCount: 0,
        syncTime,
        error: errorMessage
      }
    }
  }

  async getStatus(): Promise<CalendarSyncStatus> {
    const nextSyncTime = this.dailySyncJob?.nextInvocation() || null

    return {
      isEnabled: this.isEnabled,
      lastSyncTime: this.lastSyncTime,
      nextSyncTime,
      isRunning: this.isRunning,
      error: this.lastError
    }
  }

  async performManualSync(): Promise<CalendarSyncResult> {
    return await this.performSync()
  }

  dispose(): void {
    this.stopDailySync()
  }
}
