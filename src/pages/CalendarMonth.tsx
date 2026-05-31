import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEvents } from '@/hooks/useEvents'
import { useHousehold } from '@/contexts/HouseholdContext'
import { MemberDot } from '@/components/MemberBadge'
import type { CalEventWithParticipants, Member } from '@/lib/database.types'

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function CalendarMonth() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)
  const { members } = useHousehold()
  const { data: events = [] } = useEvents(year, month)

  const filteredEvents = filterMemberId
    ? events.filter(e => e.participants.some(p => p.id === filterMemberId))
    : events

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
    for (const event of filteredEvents) {
      const cur = new Date(event.start_date + 'T00:00:00')
      const end = new Date(event.end_date + 'T00:00:00')
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(event)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [filteredEvents])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 px-4 pt-4 pb-2 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="font-semibold">{MONTHS[month - 1]} {year}</h2>
          <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        {/* Member filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterMemberId(null)}
            className={`px-3 py-1 rounded-full text-sm shrink-0 transition-colors ${!filterMemberId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >Tous</button>
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => setFilterMemberId(filterMemberId === m.id ? null : m.id)}
              className={`px-3 py-1 rounded-full text-sm shrink-0 flex items-center gap-1.5 transition-colors ${filterMemberId === m.id ? 'text-white' : 'bg-muted text-muted-foreground'}`}
              style={filterMemberId === m.id ? { backgroundColor: m.color } : {}}
            >
              <MemberDot member={m} size={6} />
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground font-medium py-2 px-1">
        {DAY_LABELS.map((d, i) => <span key={i}>{d}</span>)}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 px-1 gap-y-1">
        {days.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = eventsByDate.get(dateStr) ?? []
          const isToday = dateStr === today.toISOString().slice(0, 10)

          return (
            <button
              key={i}
              className="flex flex-col items-center p-1 rounded-lg hover:bg-muted transition-colors min-h-[52px]"
              onClick={() => navigate(`/evenement/nouveau?date=${dateStr}`)}
            >
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}`}>
                {day}
              </span>
              <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                {uniqueParticipants(dayEvents).slice(0, 4).map(m => (
                  <MemberDot key={m.id} member={m} size={5} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay()
  // ISO: Monday = 0
  const offset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const grid: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

function uniqueParticipants(events: CalEventWithParticipants[]): Member[] {
  const seen = new Set<string>()
  const result: Member[] = []
  for (const e of events) {
    for (const p of e.participants) {
      if (!seen.has(p.id)) { seen.add(p.id); result.push(p) }
    }
  }
  return result
}
