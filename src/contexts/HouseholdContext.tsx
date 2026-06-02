import { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import type { Household, Member } from '@/lib/database.types'

interface HouseholdContextValue {
  household: Household | null
  allHouseholds: Household[]
  members: Member[]
  currentMember: Member | null
  loading: boolean
  error: string | null
  switchHousehold: (id: string) => void
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

const STORAGE_KEY = 'hades_household_id'

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  )

  const switchHousehold = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setSelectedHouseholdId(id)
  }

  // Récupère tous les foyers de l'utilisateur
  const { data: allHouseholds = [], isLoading: hLoading } = useQuery({
    queryKey: ['all_households', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('user_households')
        .select('household_id')
        .eq('user_id', user!.id)
      if (!rows?.length) return []
      const ids = rows.map(r => r.household_id)
      const { data } = await supabase
        .from('households')
        .select('*')
        .in('id', ids)
      return (data ?? []) as Household[]
    },
  })

  // Foyer actif = celui sélectionné, sinon le premier disponible
  const household = allHouseholds.find(h => h.id === selectedHouseholdId)
    ?? allHouseholds[0]
    ?? null

  // Membres + currentMember en une seule query
  const { data: membersData, isLoading: mLoading } = useQuery({
    queryKey: ['members', household?.id, user?.id],
    enabled: !!household && !!user,
    queryFn: async () => {
      const [{ data: membersRaw }, { data: uhRows }] = await Promise.all([
        supabase.from('members').select('*').eq('household_id', household!.id).order('created_at'),
        supabase.from('user_households').select('member_id').eq('user_id', user!.id).eq('household_id', household!.id),
      ])
      const members = (membersRaw ?? []) as Member[]
      const memberId = uhRows?.[0]?.member_id ?? null
      const currentMember = members.find(m => m.id === memberId) ?? null
      return { members, currentMember }
    },
  })

  const members = membersData?.members ?? []
  const currentMember = membersData?.currentMember ?? null

  const error = !hLoading && allHouseholds.length === 0
    ? 'Aucun foyer trouvé pour ce compte.'
    : null

  return (
    <HouseholdContext.Provider value={{
      household,
      allHouseholds,
      members,
      currentMember,
      loading: hLoading || mLoading,
      error,
      switchHousehold,
    }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider')
  return ctx
}
