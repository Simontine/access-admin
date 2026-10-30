import * as faceapi from '@vladmandic/face-api'
import type { Member } from './store'

export const MATCH_THRESHOLD = 0.5

let loading: Promise<void> | null = null
export const loadModels = () => {
  loading ??= (async () => {
    const url = `${import.meta.env.BASE_URL}models`
    await faceapi.nets.ssdMobilenetv1.loadFromUri(url)
    await faceapi.nets.faceLandmark68Net.loadFromUri(url)
    await faceapi.nets.faceRecognitionNet.loadFromUri(url)
  })().catch((e) => {
    loading = null
    throw e
  })
  return loading
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = src
  })

export const describe = async (input: HTMLImageElement | HTMLCanvasElement) => {
  const r = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()
  return r?.descriptor ?? null
}

const cache = new Map<string, Float32Array | null>()
const photoDescriptor = async (photo: string) => {
  if (!cache.has(photo)) cache.set(photo, await describe(await loadImage(photo)))
  return cache.get(photo) ?? null
}

export interface Match {
  member: Member
  distance: number
}

// Best (lowest-distance) member across all of their enrolled photos
export const identify = async (
  frame: HTMLCanvasElement,
  members: Member[],
): Promise<{ face: boolean; match: Match | null }> => {
  const probe = await describe(frame)
  if (!probe) return { face: false, match: null }
  let best: Match | null = null
  for (const member of members) {
    for (const photo of member.photos) {
      const d = await photoDescriptor(photo)
      if (!d) continue
      const distance = faceapi.euclideanDistance(probe, d)
      if (!best || distance < best.distance) best = { member, distance }
    }
  }
  return { face: true, match: best && best.distance <= MATCH_THRESHOLD ? best : null }
}
