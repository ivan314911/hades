# PRD — Hades

> Calendrier collaboratif de foyer · 2026-05-31

## Identité

- **Nom** : Hades (prénom du border collie de la fille d'Ivan)
- **Logo** : border collie

## Pitch

PWA de calendrier partagé pour un foyer. Chaque membre pose ses contraintes (pro ou familiales) sur un calendrier commun, visible par tous. On consulte le calendrier avant de s'engager — pas de notifications.

---

## Deux types d'événements

| Type | Description |
|------|-------------|
| `contrainte_perso` | Te concerne uniquement toi (déplacement pro, RDV…) |
| `evenement_famille` | Concerne N membres du foyer (dîner chez tata, vacances…) |

- Tout est visible par tous, titres compris
- Pour `evenement_famille` : sélection des membres concernés (défaut = tous)

---

## Modèle de données

```sql
households       (id, name, invite_code, created_at)
members          (id, household_id, user_id NULLABLE, name, color, is_creator)
user_households  (user_id, household_id, member_id)   -- pivot accès

events (
  id, household_id, created_by_member_id,
  type TEXT CHECK IN ('contrainte_perso', 'evenement_famille'),
  title, start_date, end_date,
  all_day BOOLEAN DEFAULT true,
  start_time NULLABLE, end_time NULLABLE,
  note NULLABLE
)

event_participants (event_id, member_id)
-- contrainte_perso → 1 participant (le créateur)
-- evenement_famille → N participants sélectionnés
```

RLS activé sur toutes les tables. Pivot = `user_households`.

---

## Écrans MVP

| ID | Écran |
|----|-------|
| E1 | Onboarding — auth + créer/rejoindre foyer |
| E2 | Calendrier mois — vue foyer agrégée, filtre par membre |
| E3 | Calendrier semaine |
| E4 | Création événement — type, titre, dates, membres, note |
| E5 | Détail événement — lecture + édition/suppression |
| E6 | Foyer — membres, couleurs, code d'invitation |

Tap sur un jour = créer un événement pré-rempli à cette date.

---

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · shadcn/ui · React Router v7 · TanStack Query v5 · React Hook Form + Zod · Supabase (Auth + DB + Realtime) · vite-plugin-pwa
