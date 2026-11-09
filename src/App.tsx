import { useEffect, useState } from 'react'
import { TabBar } from './components/TabBar'
import { IconSettings, IconBack } from './components/icons'
import { Accueil } from './screens/Accueil'
import { Salle } from './screens/Salle'
import { Cardio } from './screens/Cardio'
import { Repas } from './screens/Repas'
import { Stats } from './screens/Stats'
import { Reglages } from './screens/Reglages'

export type Route = 'accueil' | 'salle' | 'cardio' | 'repas' | 'stats' | 'reglages'

const screens: Record<Route, { title: string; view: () => React.ReactElement | null }> = {
  accueil: { title: 'Accueil', view: Accueil },
  salle: { title: 'Salle', view: Salle },
  cardio: { title: 'Cardio', view: Cardio },
  repas: { title: 'Repas', view: Repas },
  stats: { title: 'Stats', view: Stats },
  reglages: { title: 'Réglages', view: Reglages },
}

function readRoute(): Route {
  const hash = location.hash.slice(1)
  return hash in screens ? (hash as Route) : 'accueil'
}

export function App() {
  // La page active est gardée dans l'adresse (#salle...) : le bouton retour marche,
  // et GitHub Pages n'a pas besoin de connaître nos pages.
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const { title, view: Screen } = screens[route]

  return (
    <div className="app">
      <header className="topbar">
        <h1>{title}</h1>
        {route === 'reglages' ? (
          <a className="icon-button" href="#accueil" aria-label="Retour à l’accueil">
            <IconBack />
          </a>
        ) : (
          <a className="icon-button" href="#reglages" aria-label="Réglages">
            <IconSettings />
          </a>
        )}
      </header>
      <main className="content">
        <Screen />
      </main>
      <TabBar active={route} />
    </div>
  )
}
