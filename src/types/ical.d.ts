declare module 'ical.js' {
  export function parse(input: string): any[]
  
  export class Component {
    constructor(jcalData: any)
    getAllSubcomponents(name: string): Component[]
    getAllProperties(name: string): Property[]
  }
  
  export class Event {
    constructor(component: Component)
    summary: string
    description: string
    location: string
    startDate: Time
    endDate: Time
    isRecurring(): boolean
  }
  
  export class Time {
    toJSDate(): Date
  }
  
  export class Property {
    getParameter(name: string): string | null
    getFirstValue(): string
  }
}

declare module 'applescript' {
  export function execString(script: string, callback: (err: any, result: any) => void): void
}
