import { useState, useEffect } from 'react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'auth' | 'choice' | 'create' | 'join' | 'reset' | 'reset_sent' | 'new_password'

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const createSchema = z.object({
  householdName: z.string().min(1),
  memberName: z.string().min(1),
  color: z.string().min(1),
})

const joinSchema = z.object({
  code: z.string().min(1),
  memberName: z.string().min(1),
  color: z.string().min(1),
})

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('auth')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const { session, loading } = useAuth()

  // Écoute l'événement PASSWORD_RECOVERY émis par le client Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('new_password')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Redirige vers l'app si déjà connecté (sauf si on est en train de changer le mdp)
  useEffect(() => {
    if (!loading && session && step !== 'new_password') {
      navigate('/', { replace: true })
    }
  }, [session, loading, navigate, step])

  const authForm = useForm({ resolver: zodResolver(authSchema) })
  const createForm = useForm({ resolver: zodResolver(createSchema), defaultValues: { color: COLORS[0] } })
  const joinForm = useForm({ resolver: zodResolver(joinSchema), defaultValues: { color: COLORS[2] } })

  const handleAuth = authForm.handleSubmit(async ({ email, password }) => {
    setError('')
    const fn = authMode === 'signup'
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password })
    const { data, error } = await fn
    if (error) { setError(error.message); return }

    if (data.user) {
      setUserId(data.user.id)

      // 1. Already linked via user_households → accès direct
      const { data: uh } = await supabase
        .from('user_households')
        .select('household_id')
        .eq('user_id', data.user.id)
        .single()
      if (uh) { navigate('/'); return }

      // 2. Compte Chihuahua existant : member déjà créé avec cet user_id
      const { data: existingMember } = await supabase
        .from('members')
        .select('id, household_id')
        .eq('user_id', data.user.id)
        .single()
      if (existingMember) {
        await supabase.from('user_households').insert({
          user_id: data.user.id,
          household_id: existingMember.household_id,
          member_id: existingMember.id,
        })
        navigate('/')
        return
      }

      // 3. Nouveau compte → choix créer / rejoindre
      setStep('choice')
    }
  })

  const [newPassword, setNewPassword] = useState('')
  const [newPasswordLoading, setNewPasswordLoading] = useState(false)

  const handleNewPassword = async () => {
    if (newPassword.length < 6) { setError('6 caractères minimum'); return }
    setNewPasswordLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setNewPasswordLoading(false)
    if (error) { setError(error.message); return }
    await supabase.auth.signOut()
    setStep('auth')
    setError('')
  }

  const handleReset = async () => {
    if (!resetEmail) return
    setResetLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://luxury-mooncake-4aefba.netlify.app/onboarding',
    })
    setResetLoading(false)
    if (error) { setError(error.message); return }
    setStep('reset_sent')
  }

  const handleCreate = createForm.handleSubmit(async ({ householdName, memberName, color }) => {
    setError('')
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()

    const { data: household, error: hErr } = await supabase
      .from('households')
      .insert({ name: householdName, code })
      .select()
      .single()
    if (hErr) { setError(hErr.message); return }

    const { data: member, error: mErr } = await supabase
      .from('members')
      .insert({ household_id: household.id, user_id: userId, name: memberName, color, is_creator: true })
      .select()
      .single()
    if (mErr) { setError(mErr.message); return }

    await supabase.from('user_households').insert({ user_id: userId, household_id: household.id, member_id: member.id })
    navigate('/')
  })

  const handleJoin = joinForm.handleSubmit(async ({ code, memberName, color }) => {
    setError('')
    const { data: household } = await supabase
      .from('households')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()
    if (!household) { setError('Code invalide'); return }

    const { data: member, error: mErr } = await supabase
      .from('members')
      .insert({ household_id: household.id, user_id: userId, name: memberName, color, is_creator: false })
      .select()
      .single()
    if (mErr) { setError(mErr.message); return }

    await supabase.from('user_households').insert({ user_id: userId, household_id: household.id, member_id: member.id })
    navigate('/')
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <img src="/hades-logo.svg" alt="Hades" className="w-24 h-24 mx-auto drop-shadow-md" />
          <h1 className="text-2xl font-bold">Hades Planner</h1>
        </div>

        {step === 'auth' && (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={authMode === 'login' ? 'default' : 'outline'} className="flex-1" onClick={() => setAuthMode('login')}>Connexion</Button>
              <Button type="button" variant={authMode === 'signup' ? 'default' : 'outline'} className="flex-1" onClick={() => setAuthMode('signup')}>Inscription</Button>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...authForm.register('email')} placeholder="vous@example.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mot de passe</Label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => { setResetEmail(authForm.getValues('email') ?? ''); setError(''); setStep('reset') }}
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <Input type="password" {...authForm.register('password')} placeholder="••••••" />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={authForm.formState.isSubmitting}>
              {authMode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </Button>
          </form>
        )}

        {step === 'reset' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-semibold">Réinitialiser le mot de passe</h2>
              <p className="text-sm text-muted-foreground">Un lien vous sera envoyé par email.</p>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={resetEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetEmail(e.target.value)}
                placeholder="vous@example.com"
                autoFocus
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('auth')}>Retour</Button>
              <Button className="flex-1" onClick={handleReset} disabled={resetLoading || !resetEmail}>
                {resetLoading ? 'Envoi…' : 'Envoyer le lien'}
              </Button>
            </div>
          </div>
        )}

        {step === 'reset_sent' && (
          <div className="space-y-4 text-center">
            <div className="text-4xl">📬</div>
            <div>
              <p className="font-medium">Email envoyé !</p>
              <p className="text-sm text-muted-foreground mt-1">Consultez votre boîte mail et cliquez sur le lien pour choisir un nouveau mot de passe.</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setStep('auth')}>Retour à la connexion</Button>
          </div>
        )}

        {step === 'new_password' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-semibold">Nouveau mot de passe</h2>
              <p className="text-sm text-muted-foreground">Choisissez un nouveau mot de passe.</p>
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="6 caractères minimum"
                autoFocus
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button className="w-full" onClick={handleNewPassword} disabled={newPasswordLoading || !newPassword}>
              {newPasswordLoading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </Button>
          </div>
        )}

        {step === 'choice' && (
          <div className="space-y-3">
            <Button className="w-full" onClick={() => setStep('create')}>Créer un foyer</Button>
            <Button variant="outline" className="w-full" onClick={() => setStep('join')}>Rejoindre avec un code</Button>
          </div>
        )}

        {step === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <h2 className="font-semibold">Nouveau foyer</h2>
            <div className="space-y-2">
              <Label>Nom du foyer</Label>
              <Input {...createForm.register('householdName')} placeholder="Famille Dupont" />
            </div>
            <div className="space-y-2">
              <Label>Votre prénom</Label>
              <Input {...createForm.register('memberName')} placeholder="Alice" />
            </div>
            <div className="space-y-2">
              <Label>Votre couleur</Label>
              <ColorPicker value={createForm.watch('color')} onChange={c => createForm.setValue('color', c)} />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('choice')}>Retour</Button>
              <Button type="submit" className="flex-1" disabled={createForm.formState.isSubmitting}>Créer</Button>
            </div>
          </form>
        )}

        {step === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <h2 className="font-semibold">Rejoindre un foyer</h2>
            <div className="space-y-2">
              <Label>Code d'invitation</Label>
              <Input {...joinForm.register('code')} placeholder="ABC123" className="uppercase" />
            </div>
            <div className="space-y-2">
              <Label>Votre prénom</Label>
              <Input {...joinForm.register('memberName')} placeholder="Bob" />
            </div>
            <div className="space-y-2">
              <Label>Votre couleur</Label>
              <ColorPicker value={joinForm.watch('color')} onChange={c => joinForm.setValue('color', c)} />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('choice')}>Retour</Button>
              <Button type="submit" className="flex-1" disabled={joinForm.formState.isSubmitting}>Rejoindre</Button>
            </div>
          </form>
        )}
      </div>
      <p className="absolute bottom-4 text-xs text-muted-foreground/50">
        Mis à jour le {__BUILD_DATE__}
      </p>
    </div>
  )
}

declare const __BUILD_DATE__: string

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
  return (
    <div className="flex gap-2 flex-wrap">
      {colors.map(c => (
        <button
          key={c}
          type="button"
          className="w-8 h-8 rounded-full border-2 transition-transform"
          style={{ backgroundColor: c, borderColor: value === c ? '#000' : 'transparent', transform: value === c ? 'scale(1.2)' : 'scale(1)' }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}
