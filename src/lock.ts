import type { Settings } from './store'

const FIREBASE_URL = 'https://face-recognition-68205-default-rtdb.firebaseio.com'
const RESET_MS = 3000

const patch = (settings: Settings, body: object) => {
  const auth = settings.firebaseSecret ? `?auth=${encodeURIComponent(settings.firebaseSecret)}` : ''
  return fetch(`${FIREBASE_URL}/lock.json${auth}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function reportDenied(settings: Settings, by: string) {
  const res = await patch(settings, { unlock: false, status: 'Denied', by, at: Date.now() })
  if (!res.ok) throw new Error(`Firebase ${res.status}: ${await res.text()}`)
}

// The ESP32 polls /lock for commands. Reset the unlock flag after 3s.
export async function unlockDoor(settings: Settings, by: string) {
  const res = await patch(settings, { unlock: true, status: 'Granted', by, at: Date.now() })
  if (!res.ok) throw new Error(`Firebase ${res.status}: ${await res.text()}`)
  setTimeout(() => {
    void patch(settings, { unlock: false }).then(
      (reset) => {
        if (!reset.ok) console.error(`Firebase unlock reset ${reset.status}`)
      },
      (error: unknown) => console.error('Firebase unlock reset failed', error),
    )
  }, RESET_MS)
}

export function firebaseErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Firebase request failed.'
  if (error.message.startsWith('Firebase 401')) {
    return 'Firebase rejected the auth token (HTTP 401). Check the token in Settings.'
  }
  if (error.message.startsWith('Firebase 403')) {
    return 'Firebase denied the write (HTTP 403). Check Realtime Database rules and the auth token in Settings.'
  }
  return `Firebase request failed: ${error.message}`
}
