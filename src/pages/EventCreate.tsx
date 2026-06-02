import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateEvent } from '@/hooks/useEvents'
import { useHousehold } from '@/contexts/HouseholdContext'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1, 'Titre requis'),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  all_day: z.boolean(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function EventCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultDate = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const { currentMember, members } = useHousehold()
  const createEvent = useCreateEvent()
  const [submitError, setSubmitError] = useState('')
  // null = Tous (tous les membres), sinon liste d'IDs spécifiques
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null)

  const toggleMember = (id: string) => {
    if (selectedIds === null) {
      setSelectedIds([id])
    } else if (selectedIds.includes(id)) {
      const next = selectedIds.filter(x => x !== id)
      setSelectedIds(next.length === 0 ? [id] : next)
    } else {
      const next = [...selectedIds, id]
      setSelectedIds(next.length === members.length ? null : next)
    }
  }

  const form = useForm<FormData>({
    defaultValues: {
      title: '',
      start_date: defaultDate,
      end_date: defaultDate,
      all_day: true,
      note: '',
    },
  })

  const watchAllDay = form.watch('all_day')

  const submit = async () => {
    setSubmitError('')
    const data = form.getValues()
    if (!data.title?.trim()) { setSubmitError('Le titre est requis.'); return }
    if (!data.start_date) { setSubmitError('La date de début est requise.'); return }
    if (!data.end_date) { setSubmitError('La date de fin est requise.'); return }
    if (!currentMember) { setSubmitError('Membre introuvable — rechargez la page.'); return }

    try {
      await createEvent.mutateAsync({
        type: 'evenement_famille',
        title: data.title.trim(),
        start_date: data.start_date,
        end_date: data.end_date,
        all_day: data.all_day ?? true,
        participant_ids: selectedIds ?? members.map(m => m.id),
        start_time: data.all_day ? undefined : data.start_time,
        end_time: data.all_day ? undefined : data.end_time,
        note: data.note ?? undefined,
      })
      navigate(-1)
    } catch (e) {
      setSubmitError((e as Error).message ?? 'Erreur lors de la création')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 bg-background z-10 border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="font-semibold flex-1">Nouvel événement</h1>
          <Button size="sm" onClick={submit} disabled={createEvent.isPending}>
            {createEvent.isPending ? 'Création…' : 'Créer'}
          </Button>
        </div>
        {submitError && <p className="px-4 pb-2 text-sm text-destructive">{submitError}</p>}
      </div>
      <form className="flex-1 px-4 py-4 space-y-5" onSubmit={e => e.preventDefault()}>
        <div className="space-y-1.5">
          <Label>Titre</Label>
          <Input {...form.register('title')} placeholder="Ex: Déplacement Lyon, Dîner chez tata…" autoFocus />
        </div>

        <div className="space-y-1.5">
          <Label>Qui est concerné ?</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(null)}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                selectedIds === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              )}
            >
              Tous
            </button>
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                  (selectedIds === null || selectedIds.includes(m.id))
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Début</Label>
            <Input type="date" {...form.register('start_date')} />
          </div>
          <div className="space-y-1.5">
            <Label>Fin</Label>
            <Input type="date" {...form.register('end_date')} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="all_day"
            checked={watchAllDay}
            onCheckedChange={(v: boolean) => form.setValue('all_day', v)}
          />
          <Label htmlFor="all_day">Toute la journée</Label>
        </div>

        {!watchAllDay && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Heure début</Label>
              <Input type="time" {...form.register('start_time')} />
            </div>
            <div className="space-y-1.5">
              <Label>Heure fin</Label>
              <Input type="time" {...form.register('end_time')} />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Note (optionnelle)</Label>
          <Textarea {...form.register('note')} placeholder="Détails…" rows={3} />
        </div>
      </form>
    </div>
  )
}
