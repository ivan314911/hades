import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEvents, useDeleteEvent } from '@/hooks/useEvents'
import { useHousehold } from '@/contexts/HouseholdContext'
import type { CalEventWithParticipants } from '@/lib/database.types'

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function ParticipantPie({ colors, size = 7 }: { colors: string[]; size?: number }) {
  if (colors.length === 0) return null
  const bg = colors.length === 1
    ? colors[0]
    : `conic-gradient(${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(',')})`
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'inline-block', background: bg }} />
  )
}

export default function CalendarMonth() {
  const navigate = useNavigate()
  const today = new Date()

  const [year, setYear] = useState(() => parseInt(sessionStorage.getItem('cal_year') ?? '') || today.getFullYear())
  const [month, setMonth] = useState(() => parseInt(sessionStorage.getItem('cal_month') ?? '') || today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    sessionStorage.setItem('cal_year', String(year))
    sessionStorage.setItem('cal_month', String(month))
  }, [year, month])

  const { data: events = [] } = useEvents(year, month)
  const deleteEvent = useDeleteEvent()
  const { currentMember, members } = useHousehold()

  const prev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const days = useMemo(() => buildMonthGrid(year, month), [year, month])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEventWithParticipants[]>()
    for (const event of events) {
      const cur = new Date(event.start_date + 'T00:00:00')
      const end = new Date(event.end_date + 'T00:00:00')
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(event)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [events])

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : []
  const todayStr = today.toISOString().slice(0, 10)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="font-semibold text-lg">{MONTHS[month - 1]} {year}</h2>
          <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Legend */}
      {members.length > 0 && (
        <div className="flex justify-center gap-3 px-4 py-1.5 flex-wrap">
          {members.map(m => (
            <span key={m.id} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: m.color, display: 'inline-block', flexShrink: 0 }} />
              {m.name}
            </span>
          ))}
        </div>
      )}

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground font-medium py-2 px-1">
        {DAY_LABELS.map((d, i) => <span key={i}>{d}</span>)}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 px-1 gap-y-2">
        {days.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = eventsByDate.get(dateStr) ?? []
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={i}
              className={`flex flex-col items-center py-1.5 rounded-xl transition-colors ${isSelected ? 'bg-muted' : 'hover:bg-muted/50'}`}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                ${isToday ? 'bg-primary text-primary-foreground' : ''}
              `}>
                {day}
              </span>
              <div className="flex gap-0.5 mt-1 items-center">
                {dayEvents.length > 0
                  ? dayEvents.slice(0, 3).map((event, ci) => {
                      const colors = event.participants.length > 0
                        ? event.participants.map(p => p.color)
                        : [event.creator?.color ?? '#888888']
                      return <ParticipantPie key={ci} colors={colors} size={6} />
                    })
                  : <span className="w-1.5 h-1.5 invisible" />
                }
              </div>
            </button>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <div className="mt-2 border-t border-border px-4 pt-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => navigate(`/evenement/nouveau?date=${selectedDate}`)}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setSelectedDate(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien de prévu ce jour.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(event => (
                <div
                  key={event.id}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-muted flex items-center gap-2"
                >
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => navigate(`/evenement/${event.id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <ParticipantPie
                          colors={event.participants.length > 0 ? event.participants.map(p => p.color) : [event.creator?.color ?? '#888888']}
                          size={12}
                        />
                        <span className="font-medium text-sm truncate">{event.title}</span>
                      </span>
                    </div>
                    {!event.all_day && event.start_time && (
                      <p className="text-xs text-muted-foreground mt-0.5">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}</p>
                    )}
                    {event.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.note}</p>}
                  </button>
                  {event.created_by_member_id === currentMember?.id && (
                    <button
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
                      onClick={() => deleteEvent.mutate(event.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const offset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const grid: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}


