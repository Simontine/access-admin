import { useCallback, useEffect, useState } from 'react'

export type Direction = 'Entry' | 'Exit'
export type Status = 'Granted' | 'Denied'

export interface Member {
  id: string
  memberNumber: string
  name: string
  role: string
  photos: string[]
  active: boolean
  createdAt: string
}

export interface AccessLog {
  id: string
  memberId: string | null
  memberNumber: string
  name: string
  status: Status
  direction: Direction
  authorized: boolean
  reason: string
  timestamp: string
}

export interface Settings {
  streamUrl: string
  adminPin: string
}

interface State {
  members: Member[]
  logs: AccessLog[]
  settings: Settings
}

const KEY = 'face-access-control-v1'
const empty: State = {
  members: [],
  logs: [],
  settings: { streamUrl: '', adminPin: '1234' },
}

const load = (): State => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : empty
  } catch {
    return empty
  }
}

const uid = () => crypto.randomUUID()

export function useStore() {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const addMember = useCallback(
    (m: Omit<Member, 'id' | 'createdAt' | 'active'>) =>
      setState((s) => ({
        ...s,
        members: [
          { ...m, id: uid(), active: true, createdAt: new Date().toISOString() },
          ...s.members,
        ],
      })),
    [],
  )

  const updateMember = useCallback(
    (id: string, patch: Partial<Member>) =>
      setState((s) => ({
        ...s,
        members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      })),
    [],
  )

  const deleteMember = useCallback(
    (id: string) =>
      setState((s) => ({ ...s, members: s.members.filter((m) => m.id !== id) })),
    [],
  )

  const addLog = useCallback(
    (l: Omit<AccessLog, 'id' | 'timestamp'>) =>
      setState((s) => ({
        ...s,
        logs: [{ ...l, id: uid(), timestamp: new Date().toISOString() }, ...s.logs],
      })),
    [],
  )

  const clearLogs = useCallback(
    () => setState((s) => ({ ...s, logs: [] })),
    [],
  )

  const saveSettings = useCallback(
    (settings: Settings) => setState((s) => ({ ...s, settings })),
    [],
  )

  const importData = useCallback((data: State) => setState({ ...empty, ...data }), [])

  return {
    ...state,
    addMember,
    updateMember,
    deleteMember,
    addLog,
    clearLogs,
    saveSettings,
    importData,
  }
}

export type Store = ReturnType<typeof useStore>
