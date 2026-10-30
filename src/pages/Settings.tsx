import { useState } from 'react'
import type { Store } from '../store'

export default function Settings({ store }: { store: Store }) {
  const [streamUrl, setStreamUrl] = useState(store.settings.streamUrl)
  const [pin, setPin] = useState(store.settings.adminPin)
  const [msg, setMsg] = useState('')

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) return setMsg('PIN must be at least 4 characters.')
    store.saveSettings({ streamUrl: streamUrl.trim(), adminPin: pin })
    setMsg('Saved.')
  }

  const exportData = () => {
    const { members, logs, settings } = store
    const blob = new Blob([JSON.stringify({ members, logs, settings }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'access-control-data.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.members) || !Array.isArray(data.logs)) throw new Error()
      store.importData({ settings: store.settings, ...data })
      setMsg('Data imported.')
    } catch {
      setMsg('Invalid data file.')
    }
  }

  return (
    <>
      <h1>Settings</h1>
      <section className="card">
        <form onSubmit={save} className="grid">
          <label className="full">
            ESP32-CAM stream URL
            <input
              placeholder="http://192.168.4.1:81/stream"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
            />
          </label>
          <label>
            Admin PIN
            <input value={pin} onChange={(e) => setPin(e.target.value)} />
          </label>
          <div className="row full">
            <button className="primary">Save settings</button>
          </div>
        </form>
        {msg && <p className="muted">{msg}</p>}
      </section>
      <section className="card">
        <h2>Data (local storage)</h2>
        <div className="row">
          <button onClick={exportData}>Export JSON</button>
          <label className="btn">
            Import JSON
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                importData(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>
    </>
  )
}
