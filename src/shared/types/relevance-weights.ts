export interface RelevanceWeights {
  title: number
  content: number
  tags: number
  attendees: number
  flexSearchBonus: number
  recencyBonus: number
}

export const DEFAULT_RELEVANCE_WEIGHTS: RelevanceWeights = {
  title: 0.4,
  content: 0.3,
  tags: 0.2,
  attendees: 0.1,
  flexSearchBonus: 0.2,
  recencyBonus: 0.15
}
