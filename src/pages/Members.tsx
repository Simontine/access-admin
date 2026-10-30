import { useState } from 'react'
import CameraCapture from '../CameraCapture'
import type { Member, Store } from '../store'

const MIN_PHOTOS = 3
const blank = { memberNumber: '', name: '', role: 'Student' }

export default function Members({ store }: { store: Store }) {
  const [form, setForm] = useState(blank)
  const [photos, setPhotos] = useState<string[]>([])
  const [editing, setEditing] = useState<Member | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const reset = () => {
    setForm(blank)
    setPhotos([])
    setEditing(null)
    setError('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const number = form.memberNumber.trim()
    const name = form.name.trim()
    if (!number || !name) return setError('Name and ID number are required.')
    if (store.members.some((m) => m.memberNumber === number && m.id !== editing?.id))
      return setError('ID number already registered.')
    if (photos.length < MIN_PHOTOS)
      return setError(`Capture at least ${MIN_PHOTOS} face images.`)
    if (editing) store.updateMember(editing.id, { ...form, memberNumber: number, name, photos })
    else store.addMember({ ...form, memberNumber: number, name, photos })
    reset()
  }

  const edit = (m: Member) => {
    setEditing(m)
    setForm({ memberNumber: m.memberNumber, name: m.name, role: m.role })
    setPhotos(m.photos)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const list = store.members.filter((m) =>
    `${m.name} ${m.memberNumber}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <>
      <h1>Members</h1>
      <section className="card">
        <h2>{editing ? `Edit ${editing.name}` : 'Register new member'}</h2>
        <form onSubmit={submit} className="grid">
          <label>
            Full name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            ID / student number
            <input
              value={form.memberNumber}
              onChange={(e) => setForm({ ...form, memberNumber: e.target.value })}
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Student</option>
              <option>Staff</option>
              <option>Lecturer</option>
              <option>Visitor</option>
            </select>
          </label>
          <div className="full">
            <strong>
              Face data ({photos.length}/{MIN_PHOTOS}+)
            </strong>
            <CameraCapture onCapture={(p) => setPhotos((x) => [...x, p])} />
            <div className="thumbs">
              {photos.map((p, i) => (
                <div key={i} className="thumb">
                  <img src={p} alt={`face ${i + 1}`} />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="error full">{error}</p>}
          <div className="row full">
            <button className="primary">{editing ? 'Save changes' : 'Register member'}</button>
            {editing && (
              <button type="button" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Registered members ({store.members.length})</h2>
          <input
            placeholder="Search name or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>ID</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td>
                  <img className="avatar" src={m.photos[0]} alt="" />
                </td>
                <td>{m.name}</td>
                <td>{m.memberNumber}</td>
                <td>{m.role}</td>
                <td>
                  <span className={`badge ${m.active ? 'ok' : 'bad'}`}>
                    {m.active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="actions">
                  <button onClick={() => edit(m)}>Edit</button>
                  <button onClick={() => store.updateMember(m.id, { active: !m.active })}>
                    {m.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="danger"
                    onClick={() => confirm(`Delete ${m.name}?`) && store.deleteMember(m.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={6} className="muted">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}
