import { useEffect, useRef, useState } from 'react'

interface Props {
  onCapture: (dataUrl: string) => void
}

export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [on, setOn] = useState(false)

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setOn(false)
  }

  useEffect(() => stop, [])

  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setOn(true)
    } catch {
      setError('Camera unavailable. Check permissions or upload a photo instead.')
    }
  }

  const snap = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = 320
    c.height = Math.round((320 * v.videoHeight) / v.videoWidth)
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    onCapture(c.toDataURL('image/jpeg', 0.8))
  }

  const [espUrl, setEspUrl] = useState(() => localStorage.getItem('espCamUrl') ?? 'http://192.168.4.1')
  const [espOn, setEspOn] = useState(false)
  const [streamUrl, setStreamUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const espBase = espUrl.trim().replace(/\/+$/, '')

  const connectEsp = () => {
    setError('')
    try {
      const u = new URL(espBase)
      setStreamUrl(`${u.protocol}//${u.hostname}:81/stream`)
    } catch {
      setError('Enter a valid address, e.g. http://192.168.1.50')
      return
    }
    localStorage.setItem('espCamUrl', espUrl.trim())
    stop()
    setEspOn(true)
  }

  // Stock CameraWebServer: stream on :81/stream, single JPEG at /capture
  const snapEsp = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${espBase}/capture?_=${Date.now()}`)
      if (!res.ok) throw new Error()
      const bmp = await createImageBitmap(await res.blob())
      const c = document.createElement('canvas')
      c.width = 320
      c.height = Math.round((320 * bmp.height) / bmp.width)
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
      onCapture(c.toDataURL('image/jpeg', 0.8))
    } catch {
      setError('Could not fetch a frame from the ESP32-CAM. Check the address and that you are on its network.')
    } finally {
      setBusy(false)
    }
  }

  const upload = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = 320
        c.height = Math.round((320 * img.height) / img.width)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        onCapture(c.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="camera">
      <video ref={videoRef} autoPlay playsInline muted className={on ? '' : 'hidden'} />
      {espOn && (
        <img
          src={streamUrl}
          alt="ESP32-CAM stream"
          style={{ maxWidth: '100%' }}
          onError={() => setError('ESP32-CAM stream not reachable.')}
        />
      )}
      {error && <p className="error">{error}</p>}
      <div className="row">
        <input
          value={espUrl}
          onChange={(e) => setEspUrl(e.target.value)}
          placeholder="http://ESP32-IP"
          aria-label="ESP32-CAM address"
        />
        <button type="button" onClick={connectEsp}>Connect ESP32-CAM</button>
        {espOn && (
          <>
            <button type="button" className="primary" disabled={busy} onClick={snapEsp}>
              Capture from ESP32
            </button>
            <button type="button" onClick={() => setEspOn(false)}>Disconnect</button>
          </>
        )}
      </div>
      <div className="row">
        {!on ? (
          <button type="button" onClick={start}>Start camera</button>
        ) : (
          <>
            <button type="button" className="primary" onClick={snap}>Capture face</button>
            <button type="button" onClick={stop}>Stop</button>
          </>
        )}
        <label className="btn">
          Upload photo
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              upload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
