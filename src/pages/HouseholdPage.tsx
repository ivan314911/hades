import { useState } from 'react'
import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Check, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { MemberAvatar } from '@/components/MemberBadge'
import type { Member } from '@/lib/database.types'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function HouseholdPage() {
  const { signOut } = useAuth()
  const { household, allHouseholds, members, currentMember, loading, error, switchHousehold } = useHousehold()
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)
  // color edit state removed
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(currentMember?.name ?? '')

  const copyCode = () => {
    if (!household) return
    navigator.clipboard.writeText(household.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveColor = async (color: string) => {
    if (!currentMember) return
    await supabase.from('members').update({ color }).eq('id', currentMember.id)
    qc.invalidateQueries({ queryKey: ['members'] })
  }

  const saveName = async () => {
    if (!currentMember || !nameValue.trim()) return
    await supabase.from('members').update({ name: nameValue.trim() }).eq('id', currentMember.id)
    qc.invalidateQueries({ queryKey: ['members'] })
    setEditingName(false)
  }

  if (loading) return <div className="p-4 text-muted-foreground">Chargement…</div>
  if (error || !household) return (
    <div className="p-6 space-y-3">
      <p className="font-medium text-destructive">Foyer introuvable</p>
      <p className="text-sm text-muted-foreground">{error ?? 'Aucun foyer associé à ce compte.'}</p>
      <Button variant="outline" onClick={signOut}>Se déconnecter</Button>
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Sélecteur de foyer (si plusieurs) */}
      {allHouseholds.length > 1 && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mes foyers</Label>
          <div className="flex flex-col gap-1">
            {allHouseholds.map(h => (
              <button
                key={h.id}
                onClick={() => switchHousehold(h.id)}
                className={`text-left px-3 py-2.5 rounded-xl font-medium transition-colors ${h.id === household.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'}`}
              >
                {h.name}
              </button>
            ))}
          </div>
          <Separator />
        </div>
      )}

      <h1 className="text-xl font-bold">{household.name}</h1>

      {/* Invitation */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Code d'invitation</Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-lg font-mono font-bold tracking-widest">{household.code}</code>
          <Button variant="outline" size="icon" onClick={copyCode}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Partagez ce code pour inviter quelqu'un dans le foyer.</p>
      </div>

      <Separator />

      {/* Mon profil */}
      {currentMember && (
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mon profil</Label>
          <div className="flex items-center gap-3">
            <MemberAvatar member={currentMember} className="w-10 h-10 text-base" />
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2">
                  <Input value={nameValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameValue(e.target.value)} className="h-8" />
                  <Button size="sm" onClick={saveName}>OK</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingName(false)}>✕</Button>
                </div>
              ) : (
                <button className="font-medium hover:underline" onClick={() => { setNameValue(currentMember.name); setEditingName(true) }}>
                  {currentMember.name}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Couleur</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  className="w-8 h-8 rounded-full border-2 transition-transform"
                  style={{ backgroundColor: c, borderColor: currentMember.color === c ? '#000' : 'transparent', transform: currentMember.color === c ? 'scale(1.2)' : 'scale(1)' }}
                  onClick={() => saveColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Membres */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Membres du foyer</Label>
        <div className="space-y-2">
          {members.map((m: Member) => (
            <div key={m.id} className="flex items-center gap-3 py-1">
              <MemberAvatar member={m} className="w-9 h-9" />
              <span className="flex-1 font-medium">{m.name}</span>
              {m.is_creator && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Créateur</span>}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <Button variant="outline" className="w-full text-destructive" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" />
        Se déconnecter
      </Button>
    </div>
  )
}
