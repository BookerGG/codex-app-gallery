const appProjects = [
  {
    title: "Job Hunt Tracker",
    eyebrow: "Personal workflow",
    status: "Live demo",
    date: "Started July 29, 2026",
    href: "/apps/job-hunt-tracker/index.html",
    image: "/apps/job-hunt-tracker/preview.png",
    accent: "teal",
    summary:
      "A focused dashboard for applications, interviews, contacts, next steps, and browser-local progress tracking.",
    stats: [
      ["Applications", "6"],
      ["Interviewing", "1"],
      ["Offers", "1"],
    ],
    highlights: [
      "Searchable application table",
      "Status filters and summary metrics",
      "Create, edit, delete, reset, and save locally",
    ],
  },
  {
    title: "Support Ticket System",
    eyebrow: "Internal tool",
    status: "Live demo",
    date: "Started July 29, 2026",
    href: "/apps/support-ticket-system/index.html",
    image: "/apps/support-ticket-system/preview.png",
    accent: "coral",
    summary:
      "A compact support queue for customer requests, urgency, ownership, channel context, and triage health.",
    stats: [
      ["Open", "2"],
      ["Urgent", "1"],
      ["Resolved", "1"],
    ],
    highlights: [
      "Status, priority, and text filtering",
      "New ticket capture workflow",
      "Operational summary metrics",
    ],
  },
];

const galleryStats = [
  ["Codex apps", "3"],
  ["Live demos", "2"],
  ["Static copies", "2"],
  ["Portfolio hub", "1"],
];

const timeline = [
  {
    label: "First operational app",
    title: "Job Hunt Tracker",
    detail: "Turned a portfolio idea into a working CRUD dashboard with local storage.",
  },
  {
    label: "Second internal tool",
    title: "Support Ticket System",
    detail: "Built a triage workspace around priority, status, search, and intake.",
  },
  {
    label: "Current app",
    title: "Codex App Gallery",
    detail: "Collected the Codex-built apps into a single launchable portfolio surface.",
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
              Your two existing Codex apps are collected here as live demos, with
              room for the next projects you make.
            </p>
            <div className="intro-actions" aria-label="Primary actions">
              <a className="primary-link" href="#apps">
                Browse apps
              </a>
              <a
                className="secondary-link"
                href="/apps/support-ticket-system/index.html"
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
            Each card opens the copied demo inside this site, so the gallery
            works on its own when published.
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
                  {app.stats.map(([label, value]) => (
                    <div key={label}>
                      <strong>{value}</strong>
                      <span>{label}</span>
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
