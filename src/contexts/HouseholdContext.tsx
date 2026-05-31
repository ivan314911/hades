import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import type { Household, Member } from '@/lib/database.types'

interface HouseholdContextValue {
  household: Household | null
  members: Member[]
  currentMember: Member | null
  loading: boolean
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setCurrentMemberId(null); return }
    supabase
      .from('user_households')
      .select('member_id, household_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setCurrentMemberId(data?.member_id ?? null))
  }, [user])

  const { data: household, isLoading: hLoading } = useQuery({
    queryKey: ['household', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: uh } = await supabase
        .from('user_households')
        .select('household_id')
        .eq('user_id', user!.id)
        .single()
      if (!uh) return null
      const { data } = await supabase
        .from('households')
        .select('*')
        .eq('id', uh.household_id)
        .single()
      return data as Household | null
    },
  })

  const { data: members = [], isLoading: mLoading } = useQuery({
    queryKey: ['members', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at')
      return (data ?? []) as Member[]
    },
  })

  const currentMember = members.find(m => m.id === currentMemberId) ?? null

  return (
    <HouseholdContext.Provider value={{
      household: household ?? null,
      members,
      currentMember,
      loading: hLoading || mLoading,
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
