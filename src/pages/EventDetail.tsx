import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useUpdateEvent, useDeleteEvent } from '@/hooks/useEvents'
import { useHousehold } from '@/contexts/HouseholdContext'
import { MemberAvatar, MemberDot } from '@/components/MemberBadge'
import type { CalEventWithParticipants } from '@/lib/database.types'

const schema = z.object({
  type: z.enum(['contrainte_perso', 'evenement_famille']),
  title: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  all_day: z.boolean(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { members, currentMember } = useHousehold()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: ev } = await supabase.from('cal_events').select('*').eq('id', id!).single()
      if (!ev) return null
      const { data: participants } = await supabase.from('cal_event_participants').select('*').eq('event_id', id!)
      const memberMap = new Map(members.map(m => [m.id, m]))
      return {
        ...ev,
        participants: (participants ?? []).map(p => memberMap.get(p.member_id)).filter(Boolean),
        creator: memberMap.get(ev.created_by_member_id) ?? null,
      } as CalEventWithParticipants
    },
  })

  const form = useForm<FormData>({ resolver: zodResolver(schema) })
  const watchType = form.watch('type')
  const watchAllDay = form.watch('all_day')

  const startEdit = () => {
    if (!event) return
    form.reset({
      type: event.type,
      title: event.title,
      start_date: event.start_date,
      end_date: event.end_date,
      all_day: event.all_day,
      start_time: event.start_time ?? undefined,
      end_time: event.end_time ?? undefined,
      note: event.note ?? undefined,
    })
    setSelectedMemberIds(event.participants.map(p => p.id))
    setEditing(true)
  }

  const onSave = form.handleSubmit(async (data) => {
    const participant_ids = data.type === 'contrainte_perso'
      ? [currentMember!.id]
      : selectedMemberIds

    await updateEvent.mutateAsync({
      id: id!,
      ...data,
      start_time: data.all_day ? undefined : data.start_time,
      end_time: data.all_day ? undefined : data.end_time,
      participant_ids,
    })
    setEditing(false)
  })

  const onDelete = async () => {
    await deleteEvent.mutateAsync(id!)
    navigate(-1)
  }

  const toggleMember = (mid: string) => {
    setSelectedMemberIds(prev => prev.includes(mid) ? prev.filter(x => x !== mid) : [...prev, mid])
  }

  const isOwner = event?.created_by_member_id === currentMember?.id

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement…</div>
  if (!event) return <div className="p-4 text-muted-foreground">Événement introuvable</div>

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 bg-background z-10 flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="font-semibold flex-1 truncate">{event.title}</h1>
        {isOwner && !editing && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={startEdit}><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Annuler</Button>
            <Button size="sm" onClick={onSave} disabled={updateEvent.isPending}>Enregistrer</Button>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-5">
        {!editing ? (
          <>
            <div className="space-y-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${event.type === 'contrainte_perso' ? 'bg-muted' : 'bg-primary/10 text-primary'}`}>
                {event.type === 'contrainte_perso' ? '👤 Contrainte perso' : '👨‍👩‍👧 Événement famille'}
              </span>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {event.start_date === event.end_date
                  ? formatDate(event.start_date)
                  : `${formatDate(event.start_date)} → ${formatDate(event.end_date)}`}
                {!event.all_day && event.start_time && ` · ${event.start_time}${event.end_time ? ` – ${event.end_time}` : ''}`}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Participants</p>
              <div className="flex flex-wrap gap-2">
                {event.participants.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white" style={{ backgroundColor: p.color }}>
                    <MemberAvatar member={p} className="w-5 h-5" />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
            {event.note && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Note</p>
                <p className="text-sm whitespace-pre-wrap">{event.note}</p>
              </div>
            )}
            {event.creator && (
              <p className="text-xs text-muted-foreground">Créé par {event.creator.name}</p>
            )}
          </>
        ) : (
          <form className="space-y-5" onSubmit={onSave}>
            <div className="flex gap-2">
              {(['contrainte_perso', 'evenement_famille'] as const).map(t => (
                <button key={t} type="button" onClick={() => form.setValue('type', t)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${watchType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {t === 'contrainte_perso' ? '👤 Contrainte perso' : '👨‍👩‍👧 Famille'}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input {...form.register('title')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Début</Label><Input type="date" {...form.register('start_date')} /></div>
              <div className="space-y-1.5"><Label>Fin</Label><Input type="date" {...form.register('end_date')} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="all_day_edit" checked={watchAllDay} onCheckedChange={(v: boolean) => form.setValue('all_day', v)} />
              <Label htmlFor="all_day_edit">Toute la journée</Label>
            </div>
            {!watchAllDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Début</Label><Input type="time" {...form.register('start_time')} /></div>
                <div className="space-y-1.5"><Label>Fin</Label><Input type="time" {...form.register('end_time')} /></div>
              </div>
            )}
            {watchType === 'evenement_famille' && (
              <div className="space-y-2">
                <Label>Membres</Label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleMember(m.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${selectedMemberIds.includes(m.id) ? 'text-white' : 'bg-muted text-muted-foreground'}`}
                      style={selectedMemberIds.includes(m.id) ? { backgroundColor: m.color } : {}}>
                      <MemberDot member={m} size={6} />{m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea {...form.register('note')} rows={3} />
            </div>
          </form>
        )}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer cet événement ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Annuler</Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleteEvent.isPending}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
