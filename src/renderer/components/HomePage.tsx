import React, { useState } from 'react'
import { Settings, RefreshCw, Calendar, Sparkles, BookOpen, Clock, CalendarDays, Link } from 'lucide-react'
import { StatusCard } from './StatusCard'
import { MeetingCard } from './MeetingCard'
import { BriefGenerator } from './BriefGenerator'
import { MeetingBriefDisplay } from './MeetingBriefDisplay'
import { useBriefGeneration } from '../hooks/useBriefGeneration'
import type { Meeting } from '../../shared/types/meeting'
import type { BriefGenerationRequest } from '../../shared/types/brief'

interface HomePageProps {
  onNavigate: (page: 'settings') => void
  version: string
  todaysMeetings: Meeting[]
  meetingsLoading: boolean
  hasVault: boolean
  vaultPath: string | null
  vaultIndexed: boolean
  vaultFileCount: number
  calendarError: string | null
  onRefreshMeetings: () => void
}

export function HomePage({ 
  onNavigate, 
  version,
  todaysMeetings,
  meetingsLoading,
  hasVault,
  vaultPath,
  vaultIndexed,
  vaultFileCount,
  calendarError,
  onRefreshMeetings
}: HomePageProps) {
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null)
  const [viewingBriefForMeeting, setViewingBriefForMeeting] = useState<string | null>(null)
  const [regeneratingMeetingId, setRegeneratingMeetingId] = useState<string | null>(null)
  
  const {
    isGenerating,
    error,
    generateBrief,
    regenerateBrief,
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

  const handleRegenerateBrief = async (meetingId: string) => {
    const meeting = todaysMeetings.find(m => m.id === meetingId)
    if (!meeting) return

    setRegeneratingMeetingId(meetingId)
    
    const request: BriefGenerationRequest = {
      meetingId: meeting.id,
      userContext: `Meeting: ${meeting.title || 'Untitled Meeting'}
Description: ${meeting.description || 'No description provided'}
Attendees: ${meeting.attendees?.join(', ') || 'No attendees listed'}
Time: ${meeting.startDate.toLocaleString()} - ${meeting.endDate.toLocaleString()}
Location: ${meeting.location || 'No location specified'}`,
      meetingPurpose: meeting.title || 'Meeting',
      keyTopics: meeting.description ? [meeting.description] : [],
      attendees: meeting.attendees || []
    }

    const brief = await regenerateBrief(request)
    setRegeneratingMeetingId(null)
    
    if (brief) {
      setViewingBriefForMeeting(meetingId)
    }
  }

  const handleRegenerateFromDisplay = async () => {
    if (!viewingBriefForMeeting) return
    
    const meeting = todaysMeetings.find(m => m.id === viewingBriefForMeeting)
    if (!meeting) return

    const request: BriefGenerationRequest = {
      meetingId: meeting.id,
      userContext: `Meeting: ${meeting.title || 'Untitled Meeting'}
Description: ${meeting.description || 'No description provided'}
Attendees: ${meeting.attendees?.join(', ') || 'No attendees listed'}
Time: ${meeting.startDate.toLocaleString()} - ${meeting.endDate.toLocaleString()}
Location: ${meeting.location || 'No location specified'}`,
      meetingPurpose: meeting.title || 'Meeting',
      keyTopics: meeting.description ? [meeting.description] : [],
      attendees: meeting.attendees || []
    }

    await regenerateBrief(request)
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

  return (
    <div className="max-w-full mx-auto px-6 py-8 animate-fade-in overflow-x-hidden break-words">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="flex-shrink-0 mt-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-700 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* App Info */}
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-primary tracking-tight">
                Prep
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface border border-border text-tertiary">
                {version}
              </span>
            </div>
            <p className="text-base text-secondary leading-relaxed">
              Meeting preparation assistant for Obsidian
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg shadow-sm hover:bg-surface-hover hover:shadow-md transition-all text-sm font-medium text-secondary hover:text-primary"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Error Message */}
      {calendarError && (
        <div className="mb-6 p-4 bg-danger-light/30 border border-danger/30 dark:bg-danger-dark/10 dark:border-danger-dark/30 rounded-lg">
          <p className="text-sm text-danger-dark dark:text-danger-400">
            {calendarError}
          </p>
        </div>
      )}

      {/* Status Section */}
      <div className="space-y-4 mb-12">
        {todaysMeetings.length > 0 && (
          <div className="bg-success-light/30 border border-success/30 dark:bg-success-dark/10 dark:border-success-dark/30 rounded-lg p-3 flex items-center gap-3 text-sm font-medium text-success-dark dark:text-success-400">
            <Calendar className="w-5 h-5" />
            {todaysMeetings.length} meeting{todaysMeetings.length !== 1 ? 's' : ''} scheduled for today
          </div>
        )}

        <StatusCard
          isConnected={!!vaultPath}
          path={vaultPath}
          indexedCount={vaultIndexed ? vaultFileCount : 0}
          isIndexed={vaultIndexed}
        />
      </div>

      {/* No Vault Connected State */}
      {!vaultPath && (
        <div className="mb-12 p-8 bg-surface border border-border rounded-xl text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
              <BookOpen className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            </div>
            <span className="text-xl font-semibold text-primary">
              No Obsidian Vault Connected
            </span>
          </div>
          <p className="text-secondary mb-6 max-w-md mx-auto">
            Connect your Obsidian vault to generate AI-powered meeting briefs with relevant context from your notes.
          </p>
          <button
            onClick={() => onNavigate('settings')}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Open Settings to Connect Vault
          </button>
        </div>
      )}

      {/* Meetings List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg shadow-sm">
              <Calendar className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-2xl font-semibold text-primary">
              Today's Meetings
            </h2>
          </div>

          <button 
            onClick={onRefreshMeetings}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary hover:text-primary bg-surface border border-border rounded-lg hover:bg-surface-hover hover:shadow-sm transition-all">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {meetingsLoading ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                <Clock className="w-8 h-8 text-brand-600 dark:text-brand-400" />
              </div>
            </div>
            <p className="text-secondary">Loading today's meetings...</p>
          </div>
        ) : todaysMeetings.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-surface-hover rounded-lg">
                <CalendarDays className="w-12 h-12 text-secondary" />
              </div>
            </div>
            <p className="text-lg text-primary mb-2">No meetings scheduled for today</p>
            <p className="text-sm text-secondary">Import your calendar to see today's meetings</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {todaysMeetings
              .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
              .map((meeting) => (
              <div key={meeting.id}>
                <MeetingCard 
                  meeting={meeting} 
                  onGenerateBrief={() => handleToggleExpanded(meeting.id)}
                  onViewBrief={() => handleViewBrief(meeting.id)}
                  onRegenerateBrief={() => handleRegenerateBrief(meeting.id)}
                  hasBrief={hasBrief(meeting.id)}
                  isGenerating={isGenerating && expandedMeetingId === meeting.id}
                  isRegenerating={regeneratingMeetingId === meeting.id}
                />
                
                {/* Inline Brief Generator - only show if vault is connected */}
                {hasVault && expandedMeetingId === meeting.id && (
                  <div className="mt-4">
                    <BriefGenerator
                      meeting={meeting}
                      onGenerate={handleGenerateBrief}
                      isGenerating={isGenerating}
                      error={error}
                      onClose={() => setExpandedMeetingId(null)}
                      inline={true}
                    />
                  </div>
                )}
                
                {/* Show message if trying to generate brief without vault */}
                {!hasVault && expandedMeetingId === meeting.id && (
                  <div className="mt-4 p-4 bg-surface border border-border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                      <span className="font-medium text-primary">Vault Required for AI Briefs</span>
                    </div>
                    <p className="text-sm text-secondary mb-4">
                      Connect your Obsidian vault to generate AI-powered meeting briefs with relevant context from your notes.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onNavigate('settings')}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Connect Vault
                      </button>
                      <button
                        onClick={() => setExpandedMeetingId(null)}
                        className="px-4 py-2 bg-surface border border-border hover:bg-surface-hover text-secondary text-sm font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brief Display Modal */}
      {viewingBriefForMeeting && (
        <MeetingBriefDisplay
          brief={getBrief(viewingBriefForMeeting)!}
          onClose={handleCloseBriefDisplay}
          onRegenerate={handleRegenerateFromDisplay}
          isRegenerating={regeneratingMeetingId === viewingBriefForMeeting}
        />
      )}
    </div>
  )
}
