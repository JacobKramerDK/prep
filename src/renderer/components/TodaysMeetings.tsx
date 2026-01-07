import React, { useState } from 'react'
import type { Meeting } from '../../shared/types/meeting'
import { BriefGenerator } from './BriefGenerator'
import { MeetingBriefDisplay } from './MeetingBriefDisplay'
import { useBriefGeneration } from '../hooks/useBriefGeneration'
import { BriefGenerationRequest } from '../../shared/types/brief'

interface Props {
  meetings: Meeting[]
  isLoading: boolean
  onRefresh: () => void
}

export const TodaysMeetings: React.FC<Props> = ({ meetings, isLoading, onRefresh }) => {
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null)
  const [viewingBriefForMeeting, setViewingBriefForMeeting] = useState<string | null>(null)
  
  const {
    isGenerating,
    error,
    generateBrief,
    clearError,
    getBrief,
    hasBrief
  } = useBriefGeneration()

  const handleGenerateBrief = async (request: BriefGenerationRequest) => {
    const brief = await generateBrief(request)
    if (brief) {
      setExpandedMeetingId(null)
      setViewingBriefForMeeting(request.meetingId)
    }
  }

  const handleToggleExpanded = (meetingId: string) => {
    setExpandedMeetingId(expandedMeetingId === meetingId ? null : meetingId)
    clearError()
  }

  const handleViewBrief = (meetingId: string) => {
    setViewingBriefForMeeting(meetingId)
  }

  const handleCloseBriefDisplay = () => {
    setViewingBriefForMeeting(null)
  }
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <p>Loading today's meetings...</p>
        </div>
      </div>
    )
  }

  if (meetings.length === 0) {
    return (
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>No meetings scheduled for today</p>
          <p style={{ fontSize: '14px' }}>Import your calendar to see today's meetings</p>
        </div>
      </div>
    )
  }

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

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '1.5rem',
          margin: 0,
          color: '#334155'
        }}>
          📅 Today's Meetings ({meetings.length})
        </h3>
        <button
          onClick={onRefresh}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {meetings.map((meeting) => (
          <div key={meeting.id} style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b',
                flex: 1
              }}>
                {meeting.title || 'Untitled Meeting'}
              </h4>
              <span style={{
                fontSize: '12px',
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '8px'
              }}>
                {meeting.source === 'applescript' ? 'Apple Calendar' : 'ICS'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '8px'
            }}>
              <span>
                🕐 {meeting.isAllDay ? 'All Day' : `${formatTime(meeting.startDate)} - ${formatTime(meeting.endDate)}`}
              </span>
              {!meeting.isAllDay && (
                <span>
                  ⏱️ {formatDuration(meeting.startDate, meeting.endDate)}
                </span>
              )}
            </div>

            {meeting.location && (
              <div style={{
                fontSize: '14px',
                color: '#64748b',
                marginBottom: '8px'
              }}>
                📍 {meeting.location}
              </div>
            )}

            {meeting.description && (
              <div style={{
                fontSize: '14px',
                color: '#475569',
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#f8fafc',
                borderRadius: '4px',
                borderLeft: '3px solid #e2e8f0'
              }}>
                {meeting.description.length > 150 
                  ? `${meeting.description.substring(0, 150)}...` 
                  : meeting.description
                }
              </div>
            )}

            {meeting.attendees && meeting.attendees.length > 0 && (
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                marginTop: '8px'
              }}>
                👥 {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
              </div>
            )}

            {/* Brief Generation Actions */}
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px'
            }}>
              {hasBrief(meeting.id) ? (
                <button
                  onClick={() => handleViewBrief(meeting.id)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '500'
                  }}
                >
                  <span>📄</span>
                  View Brief
                </button>
              ) : (
                <button
                  onClick={() => handleToggleExpanded(meeting.id)}
                  disabled={isGenerating}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: expandedMeetingId === meeting.id ? '#64748b' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '500',
                    opacity: isGenerating ? 0.6 : 1
                  }}
                >
                  <span>{isGenerating && expandedMeetingId === meeting.id ? '⏳' : '🤖'}</span>
                  {expandedMeetingId === meeting.id ? 'Cancel' : 'Generate Brief'}
                </button>
              )}
            </div>

            {/* Inline Brief Generator */}
            {expandedMeetingId === meeting.id && (
              <BriefGenerator
                meeting={meeting}
                onGenerate={handleGenerateBrief}
                isGenerating={isGenerating}
                error={error}
                onClose={() => setExpandedMeetingId(null)}
                inline={true}
              />
            )}
          </div>
        ))}
      </div>

      {/* Brief Display Modal */}
      {viewingBriefForMeeting && (
        <MeetingBriefDisplay
          brief={getBrief(viewingBriefForMeeting)!}
          onClose={handleCloseBriefDisplay}
        />
      )}
    </div>
  )
}
