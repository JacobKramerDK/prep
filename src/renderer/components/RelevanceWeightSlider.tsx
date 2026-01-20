import React from 'react'
import { Info } from 'lucide-react'

interface RelevanceWeightSliderProps {
  label: string
  description: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export function RelevanceWeightSlider({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01
}: RelevanceWeightSliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value))
  }

  const percentage = Math.round(value * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-primary flex items-center gap-2">
          {label}
          <div className="group relative">
            <Info className="w-4 h-4 text-tertiary hover:text-secondary cursor-help" />
            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 w-64 max-w-screen-sm p-2 bg-surface border border-border rounded-lg shadow-sm text-xs text-secondary">
              {description}
            </div>
          </div>
        </label>
        <span className="text-sm font-medium text-secondary">
          {percentage}%
        </span>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-2 bg-surface border border-border rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all slider"
        />
      </div>
    </div>
  )
}
