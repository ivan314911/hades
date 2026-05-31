import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateEvent } from '@/hooks/useEvents'
import { useHousehold } from '@/contexts/HouseholdContext'
import { MemberDot } from '@/components/MemberBadge'

const schema = z.object({
  type: z.enum(['contrainte_perso', 'evenement_famille']),
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
  const { members, currentMember } = useHousehold()
  const createEvent = useCreateEvent()
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [submitError, setSubmitError] = useState('')

  // Sélectionne tous les membres dès qu'ils sont chargés
  useEffect(() => {
    if (members.length > 0 && selectedMemberIds.length === 0) {
      setSelectedMemberIds(members.map(m => m.id))
    }
  }, [members])

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'evenement_famille',
      title: '',
      start_date: defaultDate,
      end_date: defaultDate,
      all_day: true,
      note: '',
    },
  })

  const watchType = form.watch('type')
  const watchAllDay = form.watch('all_day')

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const submit = async () => {
    setSubmitError('')
    // Lire les valeurs directement (contourne les problèmes de validation iOS)
    const data = form.getValues()
    if (!data.title?.trim()) { setSubmitError('Le titre est requis.'); return }
    if (!data.start_date) { setSubmitError('La date de début est requise.'); return }
    if (!data.end_date) { setSubmitError('La date de fin est requise.'); return }
    if (!currentMember) { setSubmitError('Membre introuvable — rechargez la page.'); return }

    const participant_ids = data.type === 'contrainte_perso'
      ? [currentMember.id]
      : selectedMemberIds

    try {
      await createEvent.mutateAsync({
        type: data.type,
        title: data.title.trim(),
        start_date: data.start_date,
        end_date: data.end_date,
        all_day: data.all_day ?? true,
        participant_ids,
        start_time: data.all_day ? undefined : data.start_time,
        end_time: data.all_day ? undefined : data.end_time,
        note: data.note ?? undefined,
      })
      navigate(-1)
    } catch (e) {
      setSubmitError((e as Error).message ?? 'Erreur lors de la création')
    }
  }

  const onSubmit = form.handleSubmit(submit, (errors) => {
    // Affiche la première erreur de validation
    const first = Object.values(errors)[0]
    setSubmitError(first?.message ?? 'Formulaire invalide')
  })

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
      <form className="flex-1 px-4 py-4 space-y-5" onSubmit={onSubmit}>
        {/* Type */}
        <div className="flex gap-2">
          {(['contrainte_perso', 'evenement_famille'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => form.setValue('type', t)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${watchType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {t === 'contrainte_perso' ? '👤 Contrainte perso' : '👨‍👩‍👧 Événement famille'}
            </button>
          ))}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label>Titre</Label>
          <Input {...form.register('title')} placeholder="Ex: Déplacement Lyon, Dîner chez tata…" autoFocus />
          {form.formState.errors.title && (
            <p className="text-destructive text-xs">{form.formState.errors.title.message}</p>
          )}
        </div>

        {/* Dates */}
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

        {/* All day */}
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

        {/* Members (famille seulement) */}
        {watchType === 'evenement_famille' && (
          <div className="space-y-2">
            <Label>Membres concernés</Label>
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${selectedMemberIds.includes(m.id) ? 'text-white' : 'bg-muted text-muted-foreground'}`}
                  style={selectedMemberIds.includes(m.id) ? { backgroundColor: m.color } : {}}
                >
                  <MemberDot member={m} size={6} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="space-y-1.5">
          <Label>Note (optionnelle)</Label>
          <Textarea {...form.register('note')} placeholder="Détails…" rows={3} />
        </div>
      </form>
    </div>
  )
}
