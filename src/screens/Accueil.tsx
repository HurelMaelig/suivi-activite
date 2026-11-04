const dateDuJour = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())

// Phase 0 : la structure est en place, les vraies données arrivent en Phase 1.
export function Accueil() {
  return (
    <>
      <p className="date">{dateDuJour}</p>
      <section className="stat-grid" aria-label="Aujourd’hui">
        <div className="card stat">
          <span className="stat-label">Minutes</span>
          <span className="stat-value">—</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Calories</span>
          <span className="stat-value">—</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Pas</span>
          <span className="stat-value">—</span>
        </div>
      </section>
      <section className="card">
        <h2>Pas du jour</h2>
        <p className="muted">
          Saisie manuelle en Phase 1, puis import automatique depuis l’iPhone en Phase 3 s’il fonctionne.
        </p>
      </section>
    </>
  )
}
