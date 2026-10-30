import { useMemo, useState } from 'react'
import type { Store } from '../store'

export function LogTable({ logs }: { logs: Store['logs'] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Name</th>
          <th>ID</th>
          <th>Activity</th>
          <th>Status</th>
          <th>Attempt</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((l) => {
          const d = new Date(l.timestamp)
          return (
            <tr key={l.id}>
              <td>{d.toLocaleDateString()}</td>
              <td>{d.toLocaleTimeString()}</td>
              <td>{l.name}</td>
              <td>{l.memberNumber}</td>
              <td>{l.direction}</td>
              <td>
                <span className={`badge ${l.status === 'Granted' ? 'ok' : 'bad'}`}>{l.status}</span>
              </td>
              <td>{l.authorized ? 'Authorized' : 'Unauthorized'}</td>
              <td>{l.reason}</td>
            </tr>
          )
        })}
        {!logs.length && (
          <tr>
            <td colSpan={8} className="muted">
              No records.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`
const localDay = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Logs({ store }: { store: Store }) {
  const [status, setStatus] = useState('All')
  const [direction, setDirection] = useState('All')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const logs = useMemo(
    () =>
      store.logs.filter((l) => {
        const day = localDay(l.timestamp)
        return (
          (status === 'All' || l.status === status) &&
          (direction === 'All' || l.direction === direction) &&
          `${l.name} ${l.memberNumber}`.toLowerCase().includes(query.toLowerCase()) &&
          (!from || day >= from) &&
          (!to || day <= to)
        )
      }),
    [store.logs, status, direction, query, from, to],
  )

  const exportCsv = () => {
    const rows = [
      ['Timestamp', 'Name', 'ID', 'Activity', 'Status', 'Attempt', 'Reason'],
      ...logs.map((l) => [
        new Date(l.timestamp).toLocaleString(),
        l.name,
        l.memberNumber,
        l.direction,
        l.status,
        l.authorized ? 'Authorized' : 'Unauthorized',
        l.reason,
      ]),
    ]
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], {
      type: 'text/csv',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'access-logs.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <h1>Access Monitoring</h1>
      <section className="card">
        <div className="row filters">
          <input placeholder="Search name or ID" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            <option>Granted</option>
            <option>Denied</option>
          </select>
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option>All</option>
            <option>Entry</option>
            <option>Exit</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={exportCsv} disabled={!logs.length}>
            Export CSV
          </button>
          <button
            className="danger"
            onClick={() => confirm('Clear all Access Dashboard?') && store.clearLogs()}
          >
            Clear all
          </button>
        </div>
        <LogTable logs={logs} />
      </section>
    </>
  )
}
