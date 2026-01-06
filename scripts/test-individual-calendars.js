#!/usr/bin/env node

/**
 * Test individual calendar performance
 */

const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function testIndividualCalendars() {
  console.log('🔍 Testing individual calendar performance...\n')
  
  const calendars = ['Calendar', 'Birthdays', 'United Kingdom holidays', 'Asana tasks', 'Arbejde', 'Hjem']
  
  for (const calName of calendars) {
    console.log(`📅 Testing: ${calName}`)
    const start = Date.now()
    
    try {
      const script = `tell application "Calendar"
  set todayStart to current date
  set time of todayStart to 0
  set todayEnd to todayStart + 1 * days
  
  try
    set targetCal to calendar "${calName.replace(/"/g, '\\"')}"
    set dayEvents to (events of targetCal whose start date ≥ todayStart and start date < todayEnd)
    return count of dayEvents
  on error errMsg
    return "ERROR: " & errMsg
  end try
end tell`
      
      const { stdout } = await execAsync(`osascript -e '${script}'`, { timeout: 10000 })
      const time = Date.now() - start
      console.log(`   ✅ ${stdout.trim()} events in ${time}ms`)
      
    } catch (error) {
      const time = Date.now() - start
      console.log(`   ❌ Failed in ${time}ms: ${error.message}`)
    }
  }
}

testIndividualCalendars().catch(console.error)
