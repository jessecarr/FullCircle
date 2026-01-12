'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CalendarProps {
  selectedDates: Date[]
  onDatesChange: (dates: Date[]) => void
  className?: string
}

export function Calendar({ selectedDates, onDatesChange, className }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const isDateSelected = (date: Date) => {
    return selectedDates.some(
      (d) =>
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
    )
  }

  const toggleDate = (date: Date) => {
    if (isDateSelected(date)) {
      onDatesChange(
        selectedDates.filter(
          (d) =>
            !(
              d.getFullYear() === date.getFullYear() &&
              d.getMonth() === date.getMonth() &&
              d.getDate() === date.getDate()
            )
        )
      )
    } else {
      onDatesChange([...selectedDates, date])
    }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = []
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-9 w-9" />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    date.setHours(0, 0, 0, 0)
    const isSelected = isDateSelected(date)
    const isPast = date < today

    days.push(
      <button
        key={day}
        type="button"
        onClick={() => !isPast && toggleDate(date)}
        disabled={isPast}
        className={cn(
          'h-9 w-9 rounded-md text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
          isPast && 'opacity-40 cursor-not-allowed hover:bg-transparent',
          !isSelected && !isPast && 'text-foreground'
        )}
      >
        {day}
      </button>
    )
  }

  return (
    <div className={cn('p-3 bg-background border rounded-lg', className)}>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="h-9 w-9 flex items-center justify-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{days}</div>
      {selectedDates.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="text-sm text-muted-foreground mb-2">
            Selected: {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedDates
              .sort((a, b) => a.getTime() - b.getTime())
              .map((date, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded text-xs"
                >
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <button
                    type="button"
                    onClick={() => toggleDate(date)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
