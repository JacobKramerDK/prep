#!/usr/bin/env node

/**
 * Manual Performance Test for Calendar Selection
 * 
 * This script tests the calendar selection functionality by:
 * 1. Discovering available calendars
 * 2. Testing selective extraction vs full extraction
 * 3. Measuring performance improvements
 */

const { CalendarManager } = require('../dist/main/src/main/services/calendar-manager.js')
const { SettingsManager } = require('../dist/main/src/main/services/settings-manager.js')

async function testCalendarSelection() {
  console.log('🧪 Testing Calendar Selection Performance...\n')
  
  try {
    const calendarManager = new CalendarManager()
    const settingsManager = new SettingsManager()
    
    // Test 1: Calendar Discovery
    console.log('📅 Step 1: Discovering calendars...')
    const startDiscovery = Date.now()
    
    try {
      const discovery = await calendarManager.discoverCalendars()
      const discoveryTime = Date.now() - startDiscovery
      
      console.log(`✅ Discovered ${discovery.totalCalendars} calendars in ${discoveryTime}ms`)
      console.log('📋 Available calendars:')
      discovery.calendars.forEach((cal, index) => {
        console.log(`   ${index + 1}. ${cal.name} (${cal.type})`)
      })
      
      if (discovery.errors && discovery.errors.length > 0) {
        console.log(`⚠️  ${discovery.errors.length} errors during discovery`)
      }
      
      // Test 2: Settings Persistence
      console.log('\n💾 Step 2: Testing settings persistence...')
      const testSelection = discovery.calendars.slice(0, 2).map(cal => cal.name)
      
      await settingsManager.updateCalendarSelection({
        selectedCalendarUids: testSelection,
        lastDiscovery: new Date().toISOString()
      })
      
      const savedSettings = await settingsManager.getCalendarSelection()
      console.log(`✅ Settings saved: ${savedSettings.selectedCalendarUids.length} calendars selected`)
      
      // Test 3: Performance Comparison (if on macOS)
      if (process.platform === 'darwin' && discovery.calendars.length > 1) {
        console.log('\n⚡ Step 3: Performance comparison...')
        
        // Test selective extraction
        console.log('Testing selective extraction (first 2 calendars)...')
        const startSelective = Date.now()
        
        try {
          const selectiveResult = await calendarManager.extractAppleScriptEvents(testSelection)
          const selectiveTime = Date.now() - startSelective
          console.log(`✅ Selective extraction: ${selectiveResult.totalEvents} events in ${selectiveTime}ms`)
          
          // Test full extraction (if user has many calendars)
          if (discovery.calendars.length > 3) {
            console.log('Testing full extraction (all calendars)...')
            
            // Clear cache to ensure fair comparison
            await calendarManager.invalidateCache()
            
            const startFull = Date.now()
            
            try {
              const fullResult = await calendarManager.extractAppleScriptEvents()
              const fullTime = Date.now() - startFull
              console.log(`✅ Full extraction: ${fullResult.totalEvents} events in ${fullTime}ms`)
              
              if (fullTime > selectiveTime) {
                const improvement = ((fullTime - selectiveTime) / fullTime * 100).toFixed(1)
                console.log(`🚀 Performance improvement: ${improvement}% faster with selection`)
              } else {
                console.log(`ℹ️  Cache effects: Full extraction was cached (${fullTime}ms vs ${selectiveTime}ms)`)
              }
            } catch (fullError) {
              console.log(`⚠️  Full extraction failed: ${fullError.message}`)
            }
          } else {
            console.log('ℹ️  Skipping full extraction comparison (not enough calendars)')
          }
        } catch (selectiveError) {
          console.log(`⚠️  Selective extraction failed: ${selectiveError.message}`)
        }
      } else {
        console.log('\n⚠️  Skipping performance test (not on macOS or no calendars)')
      }
      
      console.log('\n✅ Calendar selection functionality test completed!')
      
    } catch (discoveryError) {
      if (discoveryError.message.includes('permission')) {
        console.log('❌ Calendar permission required. Please grant access in System Preferences.')
        console.log('   Go to: System Preferences > Security & Privacy > Privacy > Calendar')
        console.log('   Add Terminal (or your IDE) to the allowed applications.')
      } else {
        console.log(`❌ Discovery failed: ${discoveryError.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
if (require.main === module) {
  testCalendarSelection().catch(console.error)
}

module.exports = { testCalendarSelection }
