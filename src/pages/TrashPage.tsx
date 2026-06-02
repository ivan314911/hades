import { useState } from 'react'
import { Trash2, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTrashEvents, useRestoreEvent, usePermanentDeleteEvent } from '@/hooks/useEvents'
import type { CalEventWithParticipants } from '@/lib/database.types'

export default function TrashPage() {
  const { data: events = [], isLoading } = useTrashEvents()
  const restore = useRestoreEvent()
  const permanentDelete = usePermanentDeleteEvent()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const daysLeft = (deletedAt: string) => {
    const diff = 10 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, diff)
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement…</div>

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 bg-background z-10 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-muted-foreground" />
          <h1 className="font-semibold text-lg">Corbeille</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Les événements sont supprimés définitivement après 10 jours.</p>
      </div>

      <div className="flex-1 px-4 py-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-12">La corbeille est vide.</p>
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <EventTrashRow
                key={event.id}
                event={event}
                daysLeft={daysLeft(event.deleted_at!)}
                onRestore={() => restore.mutate(event.id)}
                onDelete={() => setConfirmId(event.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer définitivement ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={permanentDelete.isPending}
              onClick={() => { permanentDelete.mutate(confirmId!); setConfirmId(null) }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EventTrashRow({ event, daysLeft, onRestore, onDelete }: {
  event: CalEventWithParticipants
  daysLeft: number
  onRestore: () => void
  onDelete: () => void
}) {
  const dateLabel = event.start_date === event.end_date
    ? formatDate(event.start_date)
    : `${formatDate(event.start_date)} → ${formatDate(event.end_date)}`

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
        <p className="text-xs text-muted-foreground">Supprimé dans {daysLeft}j</p>
      </div>
      <Button size="icon" variant="ghost" className="w-8 h-8 shrink-0" onClick={onRestore} title="Restaurer">
        <RotateCcw className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="ghost" className="w-8 h-8 shrink-0 text-destructive hover:text-destructive" onClick={onDelete} title="Supprimer définitivement">
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}
