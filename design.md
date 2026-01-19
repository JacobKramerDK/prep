```App.tsx
import React, { useState } from 'react'
import { HomePage } from './components/HomePage'
import { SettingsPage } from './components/SettingsPage'
type Page = 'home' | 'settings'
export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  return (
    <div className="min-h-screen bg-background text-primary selection:bg-brand-200 selection:text-brand-900 dark:selection:bg-brand-900 dark:selection:text-brand-100">
      {/* Titlebar Drag Region (simulated for Electron) */}
      <div className="h-8 w-full fixed top-0 left-0 z-50 select-none app-region-drag" />

      {/* Main Content */}
      <main className="pt-8 pb-12 min-h-screen">
        {currentPage === 'home' ? (
          <HomePage onNavigate={setCurrentPage} />
        ) : (
          <SettingsPage onBack={() => setCurrentPage('home')} />
        )}
      </main>
    </div>
  )
}

```
```components/HomePage.tsx
import React from 'react'
import { Settings, RefreshCw, Calendar, Sparkles } from 'lucide-react'
import { StatusCard } from './StatusCard'
import { MeetingCard, Meeting } from './MeetingCard'
interface HomePageProps {
  onNavigate: (page: 'settings') => void
}
const MOCK_MEETINGS: Meeting[] = [
  {
    id: '1',
    title: 'Pod Meeting - EMEA South Team',
    time: '9:30 AM - 10:30 AM',
    duration: '1h',
    location: 'https://trackunit.zoom.us/j/91698928749?pwd=...',
    description:
      'This is an invite to the EMEA South POD Meeting (Mondays - 60min). Objectives: We are here to kick-off the week with most important topics, align on priorities, and share updates.',
    attendees: 21,
    source: 'Apple Calendar',
    zoomLink: 'https://trackunit.zoom.us/j/91698928749',
  },
  {
    id: '2',
    title: 'Product Design Weekly Sync',
    time: '11:00 AM - 12:00 PM',
    duration: '1h',
    location: 'Google Meet',
    description:
      'Weekly sync to discuss design system updates, ongoing projects, and critique session.',
    attendees: 8,
    source: 'Google Calendar',
    zoomLink: 'https://meet.google.com/abc-defg-hij',
  },
  {
    id: '3',
    title: '1:1 with Engineering Manager',
    time: '2:00 PM - 2:30 PM',
    duration: '30m',
    location: 'Room 404',
    description:
      'Monthly career development chat and performance review check-in.',
    attendees: 2,
    source: 'Apple Calendar',
  },
  {
    id: '4',
    title: 'Q3 Roadmap Planning',
    time: '3:00 PM - 4:30 PM',
    duration: '1.5h',
    location: 'Boardroom A',
    description:
      'Planning session for Q3 initiatives. Please review the pre-read document attached to the invite.',
    attendees: 12,
    source: 'Google Calendar',
  },
  {
    id: '5',
    title: 'Team Social',
    time: '5:00 PM - 6:00 PM',
    duration: '1h',
    location: 'Lounge',
    description: 'Optional team hang out. Snacks provided!',
    attendees: 15,
    source: 'Apple Calendar',
  },
]
export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
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
                v35.7.5
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

      {/* Status Section */}
      <div className="space-y-4 mb-12">
        <div className="bg-success-light/30 border border-success/30 dark:bg-success-dark/10 dark:border-success-dark/30 rounded-lg p-3 flex items-center gap-3 text-sm font-medium text-success-dark dark:text-success-400">
          <Calendar className="w-5 h-5" />5 meetings scheduled for today
        </div>

        <StatusCard
          isConnected={true}
          path="/Users/jry/code/dynamous-kiro-hackathon/test-vault"
          indexedCount={111}
        />
      </div>

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

          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary hover:text-primary bg-surface border border-border rounded-lg hover:bg-surface-hover hover:shadow-sm transition-all">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid gap-4">
          {MOCK_MEETINGS.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      </div>
    </div>
  )
}

```
```components/MeetingCard.tsx
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
} from 'lucide-react'
export interface Meeting {
  id: string
  title: string
  time: string
  duration: string
  location?: string
  description?: string
  attendees: number
  source: 'Apple Calendar' | 'Google Calendar'
  zoomLink?: string
}
interface MeetingCardProps {
  meeting: Meeting
}
export function MeetingCard({ meeting }: MeetingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm hover:shadow-card-hover transition-all duration-200 overflow-hidden group">
      {/* Header Section */}
      <div className="p-5">
        <div className="flex justify-between items-start gap-4 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-primary leading-tight mb-1">
              {meeting.title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-secondary">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-tertiary" />
                <span>{meeting.time}</span>
                <span className="text-tertiary">•</span>
                <span>{meeting.duration}</span>
              </div>
            </div>
          </div>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-hover text-secondary border border-border">
            {meeting.source}
          </span>
        </div>

        {/* Location / Link */}
        {(meeting.location || meeting.zoomLink) && (
          <div className="flex items-center gap-2 mb-4 text-sm text-secondary">
            <MapPin className="w-4 h-4 text-tertiary flex-shrink-0" />
            <a
              href={meeting.zoomLink || '#'}
              className="truncate text-brand-600 hover:underline hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              {meeting.zoomLink || meeting.location}
            </a>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-1.5 text-sm text-secondary">
              <Users className="w-4 h-4 text-tertiary" />
              <span>{meeting.attendees} attendees</span>
            </div>
          </div>

          <button className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow-md active:scale-95">
            <Sparkles className="w-4 h-4" />
            Generate Brief
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-0 animate-slide-up">
          <div className="p-4 bg-surface-hover rounded-lg border border-border/50 text-sm text-secondary leading-relaxed">
            <p className="whitespace-pre-wrap font-sans">
              {meeting.description ||
                'No description provided for this meeting.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

```
```components/SettingsPage.tsx
import React, { useState } from 'react'
import { Tabs } from './Tabs'
import {
  Bot,
  Database,
  Calendar as CalendarIcon,
  ArrowLeft,
  Save,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  FileUp,
  Settings as SettingsIcon,
  Info,
  Apple,
} from 'lucide-react'
interface SettingsPageProps {
  onBack: () => void
}
export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('ai')
  const [apiKey, setApiKey] = useState(
    'sk-................................................',
  )
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo')
  const tabs = [
    {
      id: 'ai',
      label: 'AI Configuration',
      icon: <Bot className="w-4 h-4" />,
    },
    {
      id: 'vault',
      label: 'Vault Management',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'calendar',
      label: 'Calendar Import',
      icon: <CalendarIcon className="w-4 h-4" />,
    },
  ]
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary mb-6 transition-colors"
        >
          <div className="p-1.5 rounded-md bg-surface border border-border group-hover:bg-surface-hover transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to Home
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-surface border border-border rounded-lg shadow-sm">
            <SettingsIcon className="w-6 h-6 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            Settings
          </h1>
        </div>
        <p className="text-secondary text-lg">
          Configure your Prep application preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === 'ai' && (
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                <Bot className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-xl font-semibold text-primary">
                OpenAI API Configuration
              </h2>
            </div>

            <p className="text-secondary mb-6 max-w-2xl">
              To generate AI-powered meeting briefs, you need to provide your
              OpenAI API key. Your key is stored locally and never shared with
              anyone except OpenAI.
            </p>

            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  OpenAI API Key
                </label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-mono text-sm"
                    placeholder="sk-..."
                  />
                  <button className="h-11 px-6 font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-sm">
                    Validate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all appearance-none"
                >
                  <option value="gpt-4-turbo">GPT-4 Turbo (Recommended)</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>

              <div className="pt-4 flex items-center gap-3 border-t border-border">
                <button className="flex items-center gap-2 px-6 py-2.5 bg-success hover:bg-success-dark text-white font-medium rounded-lg shadow-sm transition-colors">
                  <Save className="w-4 h-4" />
                  Save Settings
                </button>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-danger hover:bg-danger-dark text-white font-medium rounded-lg shadow-sm transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Clear Key
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="bg-surface border border-border rounded-xl p-8 text-center shadow-sm min-h-[400px] flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Connect Your Obsidian Vault
            </h2>
            <p className="text-secondary max-w-md mb-8">
              Select your Obsidian vault directory to start browsing and
              searching your notes for context.
            </p>

            <div className="w-full max-w-md mb-8">
              <div className="bg-success-light/30 border border-success/30 dark:bg-success-dark/10 dark:border-success-dark/30 rounded-lg p-4 flex items-center justify-center gap-3">
                <Check className="w-5 h-5 text-success dark:text-success-400" />
                <span className="font-medium text-success-dark dark:text-success-400">
                  Vault indexed for AI context (111 files)
                </span>
              </div>
            </div>

            <button className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-colors">
              Select Different Vault
            </button>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <h2 className="text-xl font-semibold text-primary">
                  Import Options
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button className="flex items-center gap-3 p-5 border-2 border-border rounded-xl hover:border-brand-500 hover:bg-surface-hover transition-all group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center group-hover:bg-background transition-colors">
                    <CalendarIcon className="w-5 h-5 text-secondary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-primary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      Apple Calendar
                    </div>
                    <div className="text-sm text-secondary">
                      Extract events from macOS
                    </div>
                  </div>
                </button>

                <button className="flex items-center gap-3 p-5 border-2 border-border rounded-xl hover:border-brand-500 hover:bg-surface-hover transition-all group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center group-hover:bg-background transition-colors">
                    <FileUp className="w-5 h-5 text-secondary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-primary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      ICS File
                    </div>
                    <div className="text-sm text-secondary">
                      Import calendar file
                    </div>
                  </div>
                </button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-medium text-primary mb-4">
                  Google Calendar Integration
                </h3>
                <div className="bg-surface-hover rounded-lg p-6 border border-border">
                  <p className="text-secondary mb-4">
                    Connect your Google Calendar to automatically import events
                    for meeting preparation.
                  </p>
                  <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg shadow-sm text-sm font-medium text-primary hover:bg-surface-hover transition-colors mb-6">
                    <CalendarIcon className="w-4 h-4" />
                    Connect Google Calendar
                  </button>

                  <ul className="space-y-2 text-sm text-secondary">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      Prep will access your Google Calendar events (read-only)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      Events will be imported automatically
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      Your data stays private and local
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-12 p-6 bg-surface-hover rounded-xl border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="font-semibold text-primary">How it works</h3>
        </div>
        <ul className="space-y-2 text-sm text-secondary ml-1">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            Your API key is stored securely on your local machine
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            It's never shared with anyone except OpenAI for generating briefs
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            Brief generation requires an active internet connection
          </li>
        </ul>
      </div>
    </div>
  )
}

```
```components/StatusCard.tsx
import React from 'react'
import { CheckCircle2, AlertCircle, Database } from 'lucide-react'
interface StatusCardProps {
  isConnected: boolean
  path: string
  indexedCount: number
  onAction?: () => void
}
export function StatusCard({
  isConnected,
  path,
  indexedCount,
  onAction,
}: StatusCardProps) {
  // Extract just the vault name from the full path
  const vaultName = path.split('/').pop() || path
  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
              <Database className="w-5 h-5 text-secondary" />
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-primary">
                Obsidian Vault
              </h3>
              {isConnected && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-light/40 dark:bg-success-dark/20 border border-success/30 dark:border-success-dark/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-success dark:bg-success-400" />
                  <span className="text-xs font-medium text-success-dark dark:text-success-400">
                    Connected
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-secondary">
              <span className="font-medium text-primary">{indexedCount}</span>{' '}
              files indexed
              {vaultName !== path && (
                <span className="text-tertiary ml-1.5">• {vaultName}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {onAction && (
          <button
            onClick={onAction}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-secondary hover:text-primary bg-surface-hover hover:bg-surface border border-border rounded-lg transition-colors"
          >
            Change
          </button>
        )}
      </div>
    </div>
  )
}

```
```components/Tabs.tsx
import React from 'react'
import { motion } from 'framer-motion' // Assuming framer-motion is available, if not we'll use CSS transitions.
// Actually, to be safe and dependency-free, I'll use standard React + CSS.
interface TabsProps {
  tabs: {
    id: string
    label: string
    icon?: React.ReactNode
  }[]
  activeTab: string
  onChange: (id: string) => void
}
export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="border-b border-border w-full">
      <div className="flex space-x-8" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`
                group relative py-4 px-1 text-sm font-medium transition-colors duration-200
                flex items-center gap-2
                ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-secondary hover:text-primary'}
              `}
            >
              {tab.icon && (
                <span
                  className={`transition-colors duration-200 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-tertiary group-hover:text-secondary'}`}
                >
                  {tab.icon}
                </span>
              )}
              {tab.label}

              {/* Active Indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 dark:bg-brand-400 rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

```
```index.css

@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

:root {
  /* Light Mode Variables */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f1f3f5;
  
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #9ca3af;
  
  --border-color: #e5e7eb;
  
  --brand-primary: #2563eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark Mode Variables */
    --bg-primary: #1a1a1a;
    --bg-secondary: #242424;
    --bg-tertiary: #2d2d2d;
    
    --text-primary: #f3f4f6;
    --text-secondary: #d1d5db;
    --text-tertiary: #9ca3af;
    
    --border-color: #374151;
    
    --brand-primary: #3b82f6;
  }
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Custom Scrollbar for Electron feel */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* Focus styles for accessibility */
:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Utility classes */
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (prefers-color-scheme: dark) {
  .glass-panel {
    background: rgba(30, 30, 30, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
}

```
```index.tsx
import './index.css'
import React from "react";
import { render } from "react-dom";
import { App } from "./App";

render(<App />, document.getElementById("root"));

```
```tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media', // Uses system preference
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
      },
      colors: {
        // Light mode semantic colors
        background: 'var(--bg-primary)',
        surface: 'var(--bg-secondary)',
        'surface-hover': 'var(--bg-tertiary)',
        border: 'var(--border-color)',
        
        // Text colors
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        
        // Brand colors
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        
        // Status colors
        success: {
          light: '#d1fae5',
          DEFAULT: '#10b981',
          dark: '#059669',
        },
        danger: {
          light: '#fee2e2',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevation': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

```