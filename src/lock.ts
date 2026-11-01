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
  if (!res.ok) throw new Error(`Firebase ${res.status}`)
}

// The ESP32 polls /lock for commands. Reset the unlock flag after 3s.
export async function unlockDoor(settings: Settings, by: string) {
  const res = await patch(settings, { unlock: true, status: 'Granted', by, at: Date.now() })
  if (!res.ok) throw new Error(`Firebase ${res.status}`)
  setTimeout(() => {
    void patch(settings, { unlock: false }).then(
      (reset) => {
        if (!reset.ok) console.error(`Firebase unlock reset ${reset.status}`)
      },
      (error: unknown) => console.error('Firebase unlock reset failed', error),
    )
  }, RESET_MS)
}
