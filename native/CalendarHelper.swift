import EventKit
import Foundation

let store = EKEventStore()

// Request access with timeout to prevent hanging
let semaphore = DispatchSemaphore(value: 0)
var accessGranted = false

store.requestAccess(to: .event) { granted, error in
    accessGranted = granted
    semaphore.signal()
}

// Wait with timeout (10 seconds) to prevent indefinite blocking
let timeoutResult = semaphore.wait(timeout: .now() + 10.0)

if timeoutResult == .timedOut {
    fputs("ERROR:PERMISSION_TIMEOUT\n", stderr)
    exit(1)
}

guard accessGranted else {
    fputs("ERROR:PERMISSION_DENIED\n", stderr)
    exit(1)
}

// Get today's date range
let calendar = Calendar.current
let todayStart = calendar.startOfDay(for: Date())
let todayEnd = calendar.date(byAdding: .day, value: 1, to: todayStart)!

// Get events
let predicate = store.predicateForEvents(withStart: todayStart, end: todayEnd, calendars: nil)
let events = store.events(matching: predicate)

// Output as JSON for easy parsing
let dateFormatter = ISO8601DateFormatter()
var output: [[String: Any]] = []

for event in events {
    // Extract attendees - EKParticipant.url is not optional but can be nil in practice
    let attendeeEmails = event.attendees?.compactMap { attendee in
        return attendee.url.absoluteString.replacingOccurrences(of: "mailto:", with: "")
    } ?? []
    
    output.append([
        "id": event.eventIdentifier ?? UUID().uuidString,
        "title": event.title ?? "Untitled",
        "startDate": dateFormatter.string(from: event.startDate),
        "endDate": dateFormatter.string(from: event.endDate),
        "calendar": event.calendar.title,
        "location": event.location ?? "",
        "notes": event.notes ?? "",
        "attendees": attendeeEmails,
        "isAllDay": event.isAllDay,
        "url": event.url?.absoluteString ?? ""
    ])
}

if let jsonData = try? JSONSerialization.data(withJSONObject: output),
   let jsonString = String(data: jsonData, encoding: .utf8) {
    print(jsonString)
}
