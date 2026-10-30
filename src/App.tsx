import { useState } from 'react'
import { useStore } from './store'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Logs from './pages/Logs'
import FaceRecognition from './pages/FaceRecognition'
import Settings from './pages/Settings'

const tabs = ['Dashboard', 'Members', 'Access Monitoring', 'Face Recognition', 'Settings'] as const
type Tab = (typeof tabs)[number]

export default function App() {
  const store = useStore()
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [bad, setBad] = useState(false)
  const [tab, setTab] = useState<Tab>('Dashboard')

  if (!authed) {
    return (
      <div className="login">
        <form
          className="login-panel"
          onSubmit={(e) => {
            e.preventDefault()
            if (pin === store.settings.adminPin) setAuthed(true)
            else setBad(true)
          }}
        >
          <div className="login-brand">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <div>
              <span className="brand-kicker">SECURE ACCESS</span>
              <h1>Control center</h1>
            </div>
          </div>
          <p className="login-copy">Authenticate to manage facility access and security operations.</p>
          <label>
            Administrator PIN
            <input
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setBad(false)
              }}
            />
          </label>
          {bad && <p className="error">Incorrect PIN.</p>}
          <button className="primary login-submit">
            Authenticate <span aria-hidden="true">→</span>
          </button>
          <p className="login-footnote">
            <span className="status-dot" /> Protected local session
          </p>
          <p className="muted login-default">Default PIN: 1234</p>
        </form>
      </div>
    )
  }

  return (
    <div className="layout">
      <nav>
        <div className="nav-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <div>
            <span className="brand-kicker">SECURITY SYSTEMS</span>
            <h2>Sentinel<span>.</span></h2>
          </div>
        </div>
        <div className="nav-section-label">OPERATIONS</div>
        {tabs.map((t) => (
          <button
            key={t}
            className={t === tab ? 'active' : ''}
            aria-current={t === tab ? 'page' : undefined}
            onClick={() => setTab(t)}
          >
            <span className={`nav-icon nav-icon-${tabs.indexOf(t)}`} aria-hidden="true" />
            {t}
          </button>
        ))}
        <div className="nav-spacer" />
        <div className="nav-session">
          <span className="status-dot" />
          <div>
            <strong>Admin session</strong>
            <small>Access granted</small>
          </div>
        </div>
        <button className="sign-out" onClick={() => setAuthed(false)}>
          <span className="nav-icon nav-icon-exit" aria-hidden="true" />
          Sign out
        </button>
      </nav>
      <main>
        <header className="topbar">
          <div>
            <span className="topbar-kicker">SECURITY OPERATIONS</span>
            <span className="topbar-divider">/</span>
            <span>{tab}</span>
          </div>
          <span className="session-badge">
            <span className="status-dot" /> LOCAL CONSOLE
          </span>
        </header>
        {tab === 'Dashboard' && <Dashboard store={store} />}
        {tab === 'Members' && <Members store={store} />}
        {tab === 'Access Monitoring' && <Logs store={store} />}
        {tab === 'Face Recognition' && <FaceRecognition store={store} />}
        {tab === 'Settings' && <Settings store={store} />}
      </main>
    </div>
  )
}
