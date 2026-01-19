import React from 'react'

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
