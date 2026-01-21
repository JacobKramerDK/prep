#!/usr/bin/env node

// Debug script to check calendar data flow
const { app, BrowserWindow } = require('electron')
const path = require('path')

// Mock Electron environment for testing
if (!app) {
  console.log('Running in Node.js environment - mocking Electron')
  global.app = { getVersion: () => '0.1.0' }
}

async function debugCalendarFlow() {
  console.log('=== Calendar Debug Flow ===')
  
  try {
    // Import the services
    const { CalendarManager } = require('./dist/main/src/main/services/calendar-manager')
    const { MeetingDetector } = require('./dist/main/src/main/services/meeting-detector')
    const { SettingsManager } = require('./dist/main/src/main/services/settings-manager')
    
    const settingsManager = new SettingsManager()
    const calendarManager = new CalendarManager()
    const meetingDetector = new MeetingDetector(calendarManager)
    
    console.log('\n1. Checking stored calendar events...')
    const storedEvents = await calendarManager.getStoredEvents()
    console.log(`Stored events count: ${storedEvents.length}`)
    
    if (storedEvents.length > 0) {
      console.log('First stored event:', JSON.stringify(storedEvents[0], null, 2))
    }
    
    console.log('\n2. Checking today\'s meetings...')
    const todaysMeetings = await meetingDetector.getTodaysMeetings()
    console.log(`Today's meetings count: ${todaysMeetings.totalMeetings}`)
    console.log('Detection time:', todaysMeetings.detectedAt)
    
    if (todaysMeetings.meetings.length > 0) {
      console.log('First meeting:', JSON.stringify(todaysMeetings.meetings[0], null, 2))
    }
    
    console.log('\n3. Checking calendar sync status...')
    const { CalendarSyncScheduler } = require('./dist/main/src/main/services/calendar-sync-scheduler')
    const syncScheduler = new CalendarSyncScheduler(calendarManager)
    const syncStatus = await syncScheduler.getStatus()
    console.log('Sync status:', JSON.stringify(syncStatus, null, 2))
    
    console.log('\n4. Performing manual sync...')
    const syncResult = await syncScheduler.performManualSync()
    console.log('Sync result:', JSON.stringify(syncResult, null, 2))
    
    console.log('\n5. Re-checking stored events after sync...')
    const newStoredEvents = await calendarManager.getStoredEvents()
    console.log(`New stored events count: ${newStoredEvents.length}`)
    
    console.log('\n6. Re-checking today\'s meetings after sync...')
    meetingDetector.invalidateCache()
    const newTodaysMeetings = await meetingDetector.getTodaysMeetings()
    console.log(`New today's meetings count: ${newTodaysMeetings.totalMeetings}`)
    
    // Cleanup
    await calendarManager.dispose()
    await meetingDetector.dispose()
    
  } catch (error) {
    console.error('Debug failed:', error)
  }
}

// Run the debug
debugCalendarFlow().then(() => {
  console.log('\n=== Debug Complete ===')
  process.exit(0)
}).catch(error => {
  console.error('Debug script failed:', error)
  process.exit(1)
})
