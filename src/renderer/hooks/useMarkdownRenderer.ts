import { useMemo } from 'react'

interface UseMarkdownRendererOptions {
  content: string
  enableCache?: boolean
}

export const useMarkdownRenderer = ({ content, enableCache = true }: UseMarkdownRendererOptions) => {
  const processedContent = useMemo(() => {
    if (!content || content.trim() === '') {
      return ''
    }

    // Basic preprocessing for better Obsidian compatibility
    let processed = content

    // Handle Obsidian-style callouts (basic support)
    processed = processed.replace(/^> \[!(\w+)\]/gm, '> **$1:**')

    // Note: Tags are now handled safely in the ReactMarkdown component
    return processed
  }, enableCache ? [content] : [content, Math.random()])

  const isEmpty = useMemo(() => {
    return !content || content.trim() === ''
  }, [content])

  const wordCount = useMemo(() => {
    if (isEmpty) return 0
    return content.trim().split(/\s+/).length
  }, [content, isEmpty])

  const estimatedReadTime = useMemo(() => {
    // Conservative reading speed: 150 words per minute (accounts for technical content)
    return Math.max(1, Math.ceil(wordCount / 150))
  }, [wordCount])

  return {
    processedContent,
    isEmpty,
    wordCount,
    estimatedReadTime
  }
}
