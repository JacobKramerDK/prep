/**
 * Text cleaning utilities for removing markdown and special characters
 */
export class TextCleaner {
  /**
   * Clean text snippet by removing markdown formatting and special characters
   */
  static cleanSnippet(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]*`/g, '') // Remove inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting (do this before other * processing)
      .replace(/^\s*[#*>-]\s*/gm, '') // Remove markdown headers, bullets, quotes
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert [text](link) to text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }
}
