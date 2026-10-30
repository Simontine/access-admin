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
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            if (pin === store.settings.adminPin) setAuthed(true)
            else setBad(true)
          }}
        >
          <h1>Door Access Admin</h1>
          <label>
            Admin PIN
            <input type="password" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} />
          </label>
          {bad && <p className="error">Incorrect PIN.</p>}
          <button className="primary">Sign in</button>
          <p className="muted">Default PIN: 1234</p>
        </form>
      </div>
    )
  }

  return (
    <div className="layout">
      <nav>
        <h2>Door Access</h2>
        {tabs.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <button onClick={() => setAuthed(false)}>Sign out</button>
      </nav>
      <main>
        {tab === 'Dashboard' && <Dashboard store={store} />}
        {tab === 'Members' && <Members store={store} />}
        {tab === 'Access Monitoring' && <Logs store={store} />}
        {tab === 'Face Recognition' && <FaceRecognition store={store} />}
        {tab === 'Settings' && <Settings store={store} />}
      </main>
    </div>
  )
}
