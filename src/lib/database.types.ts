export type EventType = 'contrainte_perso' | 'evenement_famille'

export interface Household {
  id: string
  name: string
  code: string
  created_at: string
}

export interface Member {
  id: string
  household_id: string
  user_id: string | null
  name: string
  color: string
  is_creator: boolean
  created_at: string
}

export interface UserHousehold {
  user_id: string
  household_id: string
  member_id: string | null
}

export interface CalEvent {
  id: string
  household_id: string
  created_by_member_id: string
  type: EventType
  title: string
  start_date: string
  end_date: string
  all_day: boolean
  start_time: string | null
  end_time: string | null
  note: string | null
  created_at: string
  deleted_at: string | null
}

export interface CalEventParticipant {
  event_id: string
  member_id: string
}

export interface CalEventWithParticipants extends CalEvent {
  participants: Member[]
  creator: Member | null
}

// Minimal Database type for supabase client
export type Database = {
  public: {
    Tables: {
      households: { Row: Household; Insert: Omit<Household, 'id' | 'created_at'>; Update: Partial<Household> }
      members: { Row: Member; Insert: Omit<Member, 'id' | 'created_at'>; Update: Partial<Member> }
      user_households: { Row: UserHousehold; Insert: UserHousehold; Update: Partial<UserHousehold> }
      cal_events: { Row: CalEvent; Insert: Omit<CalEvent, 'id' | 'created_at'>; Update: Partial<CalEvent> }
      cal_event_participants: { Row: CalEventParticipant; Insert: CalEventParticipant; Update: CalEventParticipant }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
