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
    attendees: Property[]
    isRecurring(): boolean
  }
  
  export class Time {
    toJSDate(): Date
    isDate: boolean
  }
  
  export class Property {
    getParameter(name: string): string | null
    getFirstValue(): string
    toString(): string
  }
}
