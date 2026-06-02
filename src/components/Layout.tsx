import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Users, Trash2 } from 'lucide-react'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-background border-t border-border flex">
        <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
          <CalendarDays className="w-5 h-5" />
          <span className="text-xs">Calendrier</span>
        </NavLink>
        <NavLink to="/foyer" className={({ isActive }) => navClass(isActive)}>
          <Users className="w-5 h-5" />
          <span className="text-xs">Foyer</span>
        </NavLink>
        <NavLink to="/corbeille" className={({ isActive }) => navClass(isActive)}>
          <Trash2 className="w-5 h-5" />
          <span className="text-xs">Corbeille</span>
        </NavLink>
      </nav>
    </div>
  )
}

function navClass(isActive: boolean) {
  return `flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
    isActive ? 'text-primary' : 'text-muted-foreground'
  }`
}
