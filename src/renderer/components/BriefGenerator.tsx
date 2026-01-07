import React, { useState } from 'react'
import { BriefGenerationRequest } from '../../shared/types/brief'
import type { Meeting } from '../../shared/types/meeting'

interface Props {
  meeting: Meeting
  onGenerate: (request: BriefGenerationRequest) => Promise<void>
  isGenerating: boolean
  error?: string | null
  onClose: () => void
}

export const BriefGenerator: React.FC<Props> = ({ 
  meeting, 
  onGenerate, 
  isGenerating, 
  error, 
  onClose 
}) => {
  const [formData, setFormData] = useState({
    userContext: '',
    meetingPurpose: '',
    keyTopics: '',
    attendees: '',
    additionalNotes: ''
  })

  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.userContext.trim()) {
      setValidationError('Please provide some context about the meeting')
      return
    }

    setValidationError(null)

    const request: BriefGenerationRequest = {
      meetingId: meeting.id,
      userContext: formData.userContext.trim(),
      meetingPurpose: formData.meetingPurpose.trim() || undefined,
      keyTopics: formData.keyTopics.trim() 
        ? formData.keyTopics.split(',').map(topic => topic.trim()).filter(Boolean)
        : undefined,
      attendees: formData.attendees.trim()
        ? formData.attendees.split(',').map(attendee => attendee.trim()).filter(Boolean)
        : undefined,
      additionalNotes: formData.additionalNotes.trim() || undefined
    }

    await onGenerate(request)
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (validationError) {
      setValidationError(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Generate Meeting Brief</h2>
              <p className="text-sm text-gray-600 mt-1">{meeting.title}</p>
              <p className="text-xs text-gray-500">
                {meeting.startDate.toLocaleDateString()} at {meeting.startDate.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isGenerating}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userContext" className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Context <span className="text-red-500">*</span>
              </label>
              <textarea
                id="userContext"
                value={formData.userContext}
                onChange={(e) => handleInputChange('userContext', e.target.value)}
                placeholder="Describe what this meeting is about, your role, and what you hope to accomplish..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                disabled={isGenerating}
                required
              />
            </div>

            <div>
              <label htmlFor="meetingPurpose" className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Purpose
              </label>
              <input
                id="meetingPurpose"
                type="text"
                value={formData.meetingPurpose}
                onChange={(e) => handleInputChange('meetingPurpose', e.target.value)}
                placeholder="e.g., Project kickoff, Status update, Decision making..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label htmlFor="keyTopics" className="block text-sm font-medium text-gray-700 mb-2">
                Key Topics
              </label>
              <input
                id="keyTopics"
                type="text"
                value={formData.keyTopics}
                onChange={(e) => handleInputChange('keyTopics', e.target.value)}
                placeholder="Separate topics with commas: Budget review, Timeline, Resource allocation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label htmlFor="attendees" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Attendees
              </label>
              <input
                id="attendees"
                type="text"
                value={formData.attendees}
                onChange={(e) => handleInputChange('attendees', e.target.value)}
                placeholder="Separate names with commas: John Smith, Sarah Johnson..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                placeholder="Any other relevant information, concerns, or preparation notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                disabled={isGenerating}
              />
            </div>

            {(validationError || error) && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{validationError || error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={isGenerating || !formData.userContext.trim()}
              >
                {isGenerating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Brief...
                  </span>
                ) : (
                  'Generate Brief'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
