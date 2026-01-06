#!/usr/bin/env node

/**
 * Debug Calendar Discovery
 * Tests the raw AppleScript output to see what calendars are actually available
 */

const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function debugCalendarDiscovery() {
  console.log('🔍 Debugging Calendar Discovery...\n')
  
  try {
    // Test 1: Basic calendar enumeration
    console.log('📅 Test 1: Basic calendar list...')
    const basicScript = `tell application "Calendar"
  set calendarNames to {}
  repeat with cal in calendars
    set end of calendarNames to name of cal
  end repeat
  return calendarNames
end tell`
    
    const { stdout: basicResult } = await execAsync(`osascript -e '${basicScript}'`)
    console.log('Raw output:', JSON.stringify(basicResult))
    console.log('Parsed calendars:', basicResult.split(', ').map(name => name.trim()))
    
    // Test 2: Detailed calendar info
    console.log('\n📋 Test 2: Detailed calendar info...')
    const detailedScript = `tell application "Calendar"
  set calendarInfo to {}
  repeat with cal in calendars
    try
      set calName to name of cal
      set calWritable to writable of cal
      set calDescription to description of cal
      set end of calendarInfo to (calName & " | writable:" & calWritable & " | desc:" & calDescription)
    on error errMsg
      set end of calendarInfo to ("ERROR: " & errMsg)
    end try
  end repeat
  return calendarInfo
end tell`
    
    const { stdout: detailedResult } = await execAsync(`osascript -e '${detailedScript}'`)
    console.log('Detailed output:', JSON.stringify(detailedResult))
    
    // Test 3: Calendar count
    console.log('\n🔢 Test 3: Calendar count...')
    const countScript = `tell application "Calendar"
  return count of calendars
end tell`
    
    const { stdout: countResult } = await execAsync(`osascript -e '${countScript}'`)
    console.log('Calendar count:', countResult.trim())
    
    // Test 4: Calendar visibility
    console.log('\n👁️ Test 4: Calendar visibility...')
    const visibilityScript = `tell application "Calendar"
  set visibleCalendars to {}
  repeat with cal in calendars
    try
      set calName to name of cal
      -- Check if calendar is visible (has events or is enabled)
      set end of visibleCalendars to (calName & " | visible")
    on error
      set end of visibleCalendars to (calName & " | hidden")
    end try
  end repeat
  return visibleCalendars
end tell`
    
    const { stdout: visibilityResult } = await execAsync(`osascript -e '${visibilityScript}'`)
    console.log('Visibility output:', JSON.stringify(visibilityResult))
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message)
    
    if (error.message.includes('not allowed') || error.message.includes('permission')) {
      console.log('\n🔐 Calendar permission required!')
      console.log('Go to: System Preferences > Security & Privacy > Privacy > Calendar')
      console.log('Add Terminal to the allowed applications.')
    }
  }
}

debugCalendarDiscovery().catch(console.error)
