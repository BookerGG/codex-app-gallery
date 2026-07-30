import { appProjects } from "./app-projects";

const latestApp = appProjects[appProjects.length - 1];

const galleryStats = [
  ["Codex apps", String(appProjects.length + 1)],
  ["Live demos", String(appProjects.length)],
  ["Auto sync", "15 min"],
  ["Portfolio hub", "1"],
];

const timeline = [
  ...appProjects.map((app, index) => ({
    label: `Codex app ${index + 1}`,
    title: app.title,
    detail: app.summary,
  })),
  {
    label: "Current app",
    title: "Codex App Gallery",
    detail:
      "Collects Codex-built apps into one launchable portfolio surface and refreshes from the source projects.",
  },
];

export default function Home() {
  return (
    <main className="showcase-shell">
      <header className="masthead">
        <nav className="nav-bar" aria-label="Gallery">
          <a className="brand-mark" href="#top" aria-label="Codex App Gallery">
            <span className="brand-icon" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>Codex App Gallery</span>
          </a>
          <div className="nav-links" aria-label="Sections">
            <a href="#apps">Apps</a>
            <a href="#timeline">Timeline</a>
          </div>
        </nav>

        <section className="intro" id="top" aria-labelledby="page-title">
          <div className="intro-copy">
            <p className="eyebrow">Built with Codex</p>
            <h1 id="page-title">A launchpad for every app in progress.</h1>
            <p className="lede">
              Your Codex apps are collected here as live demos, with an
              automatic refresh that keeps the gallery aligned with the source
              projects.
            </p>
            <div className="intro-actions" aria-label="Primary actions">
              <a className="primary-link" href="#apps">
                Browse apps
              </a>
              <a
                className="secondary-link"
                href={latestApp?.href ?? "#apps"}
              >
                Open latest demo
              </a>
            </div>
          </div>

          <div className="stat-strip" aria-label="Gallery summary">
            {galleryStats.map(([label, value]) => (
              <div className="stat-tile" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
      </header>

      <section className="section-band apps-band" id="apps" aria-labelledby="apps-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">App shelf</p>
            <h2 id="apps-title">Live demos</h2>
          </div>
          <p>
            Each card opens the latest synced demo inside this site, so the
            gallery works on its own when published.
          </p>
        </div>

        <div className="app-grid">
          {appProjects.map((app) => (
            <article className={`app-card ${app.accent}`} key={app.title}>
              <a className="preview-link" href={app.href} aria-label={`Open ${app.title}`}>
                <img src={app.image} alt={`${app.title} dashboard preview`} />
              </a>
              <div className="app-card-body">
                <div className="card-kicker">
                  <span>{app.eyebrow}</span>
                  <span className="status-pill">{app.status}</span>
                </div>
                <div className="card-title-row">
                  <div>
                    <h3>{app.title}</h3>
                    <p>{app.date}</p>
                  </div>
                  <a className="open-link" href={app.href}>
                    Open app
                  </a>
                </div>
                <p className="summary">{app.summary}</p>
                <div className="mini-stats" aria-label={`${app.title} metrics`}>
                  {app.stats.map((stat) => (
                    <div key={stat.label}>
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
                <ul className="highlight-list">
                  {app.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="section-band timeline-band"
        id="timeline"
        aria-labelledby="timeline-title"
      >
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Portfolio trail</p>
            <h2 id="timeline-title">What Codex has helped ship so far</h2>
          </div>
        </div>

        <div className="timeline-list">
          {timeline.map((item, index) => (
            <article className="timeline-item" key={item.title}>
              <span className="timeline-number">{index + 1}</span>
              <div>
                <p>{item.label}</p>
                <h3>{item.title}</h3>
                <span>{item.detail}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
