import type { Route } from '../App'
import { IconHome, IconDumbbell, IconRun, IconMeal, IconChart } from './icons'

const tabs = [
  { route: 'accueil', label: 'Accueil', Icon: IconHome },
  { route: 'salle', label: 'Salle', Icon: IconDumbbell },
  { route: 'cardio', label: 'Cardio', Icon: IconRun },
  { route: 'repas', label: 'Repas', Icon: IconMeal },
  { route: 'stats', label: 'Stats', Icon: IconChart },
] as const

export function TabBar({ active }: { active: Route }) {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {tabs.map(({ route, label, Icon }) => (
        <a key={route} href={`#${route}`} className="tab" aria-current={active === route ? 'page' : undefined}>
          <Icon />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  )
}
