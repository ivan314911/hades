import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWeekEvents } from '@/hooks/useEvents'
import { MemberAvatar } from '@/components/MemberBadge'
import type { CalEventWithParticipants } from '@/lib/database.types'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getMonday(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day + 6) % 7
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
}

export default function CalendarWeek() {
  const navigate = useNavigate()

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d }, [weekStart])

  const { data: events = [] } = useWeekEvents(toISODate(weekStart), toISODate(weekEnd))

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    }), [weekStart])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEventWithParticipants[]>()
    for (const event of events) {
      const cur = new Date(event.start_date + 'T00:00:00')
      const end = new Date(event.end_date + 'T00:00:00')
      while (cur <= end) {
        const key = toISODate(cur)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(event)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [events])

  const todayStr = toISODate(new Date())

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 bg-background z-10 px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium">{formatDate(weekStart)} – {formatDate(weekEnd)}</span>
          <Button variant="ghost" size="icon" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {days.map((day, i) => {
          const dateStr = toISODate(day)
          const dayEvents = eventsByDate.get(dateStr) ?? []
          const isToday = dateStr === todayStr

          return (
            <div key={i} className="flex gap-3 px-4 py-3 min-h-[60px]">
              <div className="w-12 shrink-0 flex flex-col items-center">
                <span className="text-xs text-muted-foreground">{DAY_LABELS[i]}</span>
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>
                  {day.getDate()}
                </span>
              </div>
              <div className="flex-1 space-y-1.5">
                {dayEvents.length === 0 && (
                  <button
                    onClick={() => navigate(`/evenement/nouveau?date=${dateStr}`)}
                    className="w-full text-left text-muted-foreground text-sm py-1 hover:text-foreground transition-colors"
                  >
                    + Ajouter
                  </button>
                )}
                {dayEvents.map(event => (
                  <EventChip key={event.id} event={event} onClick={() => navigate(`/evenement/${event.id}`)} />
                ))}
                {dayEvents.length > 0 && (
                  <button
                    onClick={() => navigate(`/evenement/nouveau?date=${dateStr}`)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Ajouter
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventChip({ event, onClick }: { event: CalEventWithParticipants; onClick: () => void }) {
  const isPerso = event.type === 'contrainte_perso'
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${isPerso ? 'bg-muted' : 'bg-primary/10'}`}
    >
      <span className="flex-1 font-medium truncate">{event.title}</span>
      <div className="flex -space-x-1">
        {event.participants.slice(0, 3).map(p => (
          <MemberAvatar key={p.id} member={p} className="w-5 h-5 border border-background" />
        ))}
      </div>
    </button>
  )
}
