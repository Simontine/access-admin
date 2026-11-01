import { useEffect, useRef, useState } from 'react'
import type { Direction, Store } from '../store'
import { reportDenied, unlockDoor } from '../lock'
import { identify, loadModels } from '../face'

type Result = { ok: boolean; text: string } | null

export default function FaceRecognition({ store }: { store: Store }) {
  const [result, setResult] = useState<Result>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const url = store.settings.streamUrl

  const show = (r: Result) => {
    setResult(r)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setResult(null), 4000)
  }

  // Stock CameraWebServer: stream on :81/stream, single JPEG at /capture
  const grabFrame = async () => {
    const u = new URL(url)
    const res = await fetch(`${u.protocol}//${u.hostname}/capture?_=${Date.now()}`)
    if (!res.ok) throw new Error('capture failed')
    const bmp = await createImageBitmap(await res.blob())
    const c = document.createElement('canvas')
    c.width = bmp.width
    c.height = bmp.height
    c.getContext('2d')!.drawImage(bmp, 0, 0)
    return c
  }

  const scan = async (direction: Direction) => {
    if (!url) return show({ ok: false, text: 'Set the ESP32-CAM stream URL in Settings.' })
    const enrolled = store.members.filter((m) => m.photos.length)
    if (!enrolled.length) return show({ ok: false, text: 'No members with face photos enrolled.' })
    setBusy(true)
    try {
      await loadModels()
      const frame = await grabFrame()
      const { face, match } = await identify(frame, enrolled)
      if (!face) return show({ ok: false, text: 'No face detected in the camera frame.' })
      if (!match) {
        store.addLog({
          memberId: null,
          memberNumber: '-',
          name: 'Unknown',
          status: 'Denied',
          direction,
          authorized: false,
          reason: 'Face not recognised',
        })
        const sent = await reportDenied(store.settings, 'Unknown').then(() => true, () => false)
        return show({
          ok: false,
          text: sent
            ? 'Unknown face: access denied'
            : 'Unknown face: access denied, but the status could not be sent to Firebase.',
        })
      }
      const m = match.member
      const ok = m.active
      const pct = Math.round((1 - match.distance) * 100)
      store.addLog({
        memberId: m.id,
        memberNumber: m.memberNumber,
        name: m.name,
        status: ok ? 'Granted' : 'Denied',
        direction,
        authorized: ok,
        reason: ok ? `Face matched (${pct}%)` : 'Member deactivated',
      })
      if (ok) {
        const sent = await unlockDoor(store.settings, m.name).then(() => true, () => false)
        return show({
          ok: sent,
          text: sent
            ? `Door unlocked for ${m.name}`
            : `Recognised ${m.name}, but the lock command could not be sent to Firebase.`,
        })
      }
      const sent = await reportDenied(store.settings, m.name).then(() => true, () => false)
      show({
        ok: false,
        text: sent
          ? `Denied: ${m.name} is deactivated`
          : `Denied: ${m.name} is deactivated, but the status could not be sent to Firebase.`,
      })
    } catch {
      show({
        ok: false,
        text: 'Scan failed. Check the ESP32-CAM address/network and that face models are available.',
      })
    } finally {
      setBusy(false)
    }
  }

  const manualExit = () => {
    store.addLog({
      memberId: null,
      memberNumber: '-',
      name: 'Manual exit',
      status: 'Granted',
      direction: 'Exit',
      authorized: true,
      reason: 'Push button',
    })
    unlockDoor(store.settings, 'Manual exit').then(
      () => show({ ok: true, text: 'Exit button pressed: door unlocked' }),
      () => show({ ok: false, text: 'Could not send the lock command to Firebase.' }),
    )
  }

  return (
    <>
      <h1>Face Recognition</h1>
      <section className="card">
        <p className="muted">
          Grabs a real frame from the ESP32-CAM and matches the face against enrolled members.
        </p>
        <div className="row">
          <button className="primary" disabled={busy} onClick={() => scan('Entry')}>
            {busy ? 'Scanning…' : 'Scan face (entry)'}
          </button>
          <button disabled={busy} onClick={() => scan('Exit')}>Scan face (exit)</button>
          <button onClick={manualExit}>Exit push button</button>
        </div>
        <div className="device">
          <span className={`led ${result?.ok ? 'green' : ''}`}>Green LED</span>
          <span className={`led ${result && !result.ok ? 'red' : ''}`}>Red LED</span>
          <span className={`led ${result && !result.ok ? 'buzz' : ''}`}>Buzzer</span>
          <span className={`led ${result?.ok ? 'green' : ''}`}>
            Lock: {result?.ok ? 'Open' : 'Locked'}
          </span>
        </div>
        {result && <p className={result.ok ? 'success' : 'error'}>{result.text}</p>}
      </section>
      <section className="card">
        <h2>Live camera stream</h2>
        {url ? (
          <img className="stream" src={url} alt="ESP32-CAM stream" />
        ) : (
          <p className="muted">Set the ESP32-CAM stream URL in Settings.</p>
        )}
      </section>
    </>
  )
}
