import type { Store } from '../store'
import { LogTable } from './Logs'

export default function Dashboard({ store }: { store: Store }) {
  const today = new Date().toDateString()
  const todays = store.logs.filter((l) => new Date(l.timestamp).toDateString() === today)
  const denied = store.logs.filter((l) => l.status === 'Denied')
  const stats = [
    { label: 'Registered members', value: store.members.length },
    { label: 'Active members', value: store.members.filter((m) => m.active).length },
    { label: 'Granted today', value: todays.filter((l) => l.status === 'Granted').length },
    { label: 'Denied today', value: todays.filter((l) => l.status === 'Denied').length },
  ]

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <section className="card">
        <h2>Recent activity</h2>
        <LogTable logs={store.logs.slice(0, 10)} />
      </section>
      <section className="card">
        <h2>Recent unsuccessful attempts</h2>
        <LogTable logs={denied.slice(0, 10)} />
      </section>
    </>
  )
}
