import React, { useState } from 'react'
import {
  Clock,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Sparkles,
  FileText,
  File,
  Chrome,
  RotateCcw,
} from 'lucide-react'
import type { Meeting } from '../../shared/types/meeting'

interface MeetingCardProps {
  meeting: Meeting
  onGenerateBrief?: () => void
  onViewBrief?: () => void
  onRegenerateBrief?: () => void
  hasBrief?: boolean
  isGenerating?: boolean
  isRegenerating?: boolean
}

export function MeetingCard({ meeting, onGenerateBrief, onViewBrief, onRegenerateBrief, hasBrief, isGenerating, isRegenerating }: MeetingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (start: Date, end: Date): string => {
    const durationMs = end.getTime() - start.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const getSourceIcon = (source: string) => {
    if (source === 'ics') return <File className="w-4 h-4" />
    if (source === 'google') return <Chrome className="w-4 h-4" />
    return <Calendar className="w-4 h-4" /> // Apple Calendar
  }

  const timeDisplay = meeting.isAllDay 
    ? 'All Day' 
    : `${formatTime(meeting.startDate)} - ${formatTime(meeting.endDate)}`

  const duration = meeting.isAllDay 
    ? null 
    : formatDuration(meeting.startDate, meeting.endDate)

  const sourceDisplay = meeting.source === 'ics' ? 'ICS' : 
                       meeting.source === 'google' ? 'Google Calendar' : 
                       'Apple Calendar'

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm hover:shadow-card-hover transition-all duration-200 overflow-hidden group">
      {/* Header Section */}
      <div className="p-5">
        <div className="flex justify-between items-start gap-4 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-primary leading-tight mb-1">
              {meeting.title || 'Untitled Meeting'}
            </h3>
            <div className="flex items-center gap-3 text-sm text-secondary">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-tertiary" />
                <span>{timeDisplay}</span>
                {duration && (
                  <>
                    <span className="text-tertiary">•</span>
                    <span>{duration}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-hover text-secondary border border-border">
            <span className="mr-1">{getSourceIcon(meeting.source || 'apple')}</span>
            {sourceDisplay}
          </span>
        </div>

        {/* Location / Link */}
        {meeting.location && (
          <div className="flex items-center gap-2 mb-4 text-sm text-secondary">
            <MapPin className="w-4 h-4 text-tertiary flex-shrink-0" />
            {meeting.location.includes('http') || meeting.location.includes('zoom') || meeting.location.includes('meet') ? (
              <a
                href={meeting.location.startsWith('http') ? meeting.location : `https://${meeting.location}`}
                className="truncate text-brand-600 hover:underline hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                target="_blank"
                rel="noreferrer"
              >
                {meeting.location}
              </a>
            ) : (
              <span className="truncate">{meeting.location}</span>
            )}
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            {meeting.description && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Hide details <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show details <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {meeting.attendees && meeting.attendees.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-secondary">
                <Users className="w-4 h-4 text-tertiary" />
                <span>{meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {hasBrief ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={onViewBrief}
                className="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success-dark text-white text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow-md active:scale-95">
                <FileText className="w-4 h-4" />
                View Brief
              </button>
              <button 
                onClick={onRegenerateBrief}
                disabled={isRegenerating}
                className="inline-flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed text-primary border border-border text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow-md active:scale-95">
                {isRegenerating ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </button>
            </div>
          ) : (
            <button 
              onClick={onGenerateBrief}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow-md active:scale-95">
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Brief
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && meeting.description && (
        <div className="px-5 pb-5 pt-0 animate-slide-up">
          <div className="p-4 bg-surface-hover rounded-lg border border-border/50 text-sm text-secondary leading-relaxed">
            <p className="whitespace-pre-wrap font-sans">
              {meeting.description}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
