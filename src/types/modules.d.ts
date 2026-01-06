declare module 'applescript' {
  export function execString(script: string): Promise<any>
  export function execString(script: string, callback: (err: any, result: any) => void): void
  export function execFile(path: string, callback?: (error: Error | null, result?: any) => void): void
}

declare module 'ical.js' {
  export function parse(input: string): any[]
  
  export class Component {
    constructor(jCal: any)
    getAllSubcomponents(name: string): Component[]
  }
  
  export class Event {
    constructor(component: Component)
    summary: string
    description: string
    location: string
    startDate: Time
    endDate: Time
    attendees: Property[]
    isRecurring(): boolean
  }
  
  export class Time {
    toJSDate(): Date
    isDate: boolean
  }
  
  export class Property {
    toString(): string
  }
}
