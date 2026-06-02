import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/contexts/HouseholdContext'
import type { CalEvent, CalEventWithParticipants, Member } from '@/lib/database.types'

export function useEvents(year: number, month: number) {
  const { household, members } = useHousehold()
  const qc = useQueryClient()

  useEffect(() => {
    if (!household) return
    const channel = supabase
      .channel(`cal_events_${household.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cal_events',
        filter: `household_id=eq.${household.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['cal_events'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [household?.id])

  return useQuery({
    queryKey: ['cal_events', household?.id, year, month, members.length],
    enabled: !!household && members.length > 0,
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

      const { data: events } = await supabase
        .from('cal_events')
        .select('*')
        .eq('household_id', household!.id)
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .order('start_date')

      if (!events?.length) return [] as CalEventWithParticipants[]

      const { data: participants } = await supabase
        .from('cal_event_participants')
        .select('*')
        .in('event_id', events.map(e => e.id))

      const memberMap = new Map<string, Member>(members.map(m => [m.id, m]))

      return events.map(event => ({
        ...event,
        participants: (participants ?? [])
          .filter(p => p.event_id === event.id)
          .map(p => memberMap.get(p.member_id))
          .filter(Boolean) as Member[],
        creator: memberMap.get(event.created_by_member_id) ?? null,
      })) as CalEventWithParticipants[]
    },
  })
}

export function useWeekEvents(startDate: string, endDate: string) {
  const { household, members } = useHousehold()

  return useQuery({
    queryKey: ['cal_events_week', household?.id, startDate, endDate, members.length],
    enabled: !!household && members.length > 0,
    queryFn: async () => {
      const { data: events } = await supabase
        .from('cal_events')
        .select('*')
        .eq('household_id', household!.id)
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .order('start_date')

      if (!events?.length) return [] as CalEventWithParticipants[]

      const { data: participants } = await supabase
        .from('cal_event_participants')
        .select('*')
        .in('event_id', events.map(e => e.id))

      const memberMap = new Map<string, Member>(members.map(m => [m.id, m]))

      return events.map(event => ({
        ...event,
        participants: (participants ?? [])
          .filter(p => p.event_id === event.id)
          .map(p => memberMap.get(p.member_id))
          .filter(Boolean) as Member[],
        creator: memberMap.get(event.created_by_member_id) ?? null,
      })) as CalEventWithParticipants[]
    },
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  const { household, currentMember } = useHousehold()

  return useMutation({
    mutationFn: async (data: {
      type: 'contrainte_perso' | 'evenement_famille'
      title: string
      start_date: string
      end_date: string
      all_day: boolean
      start_time?: string
      end_time?: string
      note?: string
      participant_ids: string[]
    }) => {
      const { data: event, error } = await supabase
        .from('cal_events')
        .insert({
          household_id: household!.id,
          created_by_member_id: currentMember!.id,
          type: data.type,
          title: data.title,
          start_date: data.start_date,
          end_date: data.end_date,
          all_day: data.all_day,
          start_time: data.start_time ?? null,
          end_time: data.end_time ?? null,
          note: data.note ?? null,
        })
        .select()
        .single()

      if (error) throw error

      const participantIds = data.type === 'contrainte_perso'
        ? [currentMember!.id]
        : data.participant_ids

      if (participantIds.length > 0) {
        await supabase.from('cal_event_participants').insert(
          participantIds.map(member_id => ({ event_id: event.id, member_id }))
        )
      }

      return event as CalEvent
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cal_events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, participant_ids, ...data }: Partial<CalEvent> & { id: string; participant_ids?: string[] }) => {
      const { data: event, error } = await supabase
        .from('cal_events')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      if (participant_ids !== undefined) {
        await supabase.from('cal_event_participants').delete().eq('event_id', id)
        if (participant_ids.length > 0) {
          await supabase.from('cal_event_participants').insert(
            participant_ids.map(member_id => ({ event_id: id, member_id }))
          )
        }
      }

      return event as CalEvent
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cal_events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cal_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cal_events'] }),
  })
}
