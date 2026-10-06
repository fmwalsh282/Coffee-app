import { list, put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { geocode, geoKey, type GeoPoint } from './_geocode.js'

interface Restaurant {
  id: string
  name: string
  url: string
  cuisines: string[]
  suburb: string
  address: string
  /** Map position, or null if it couldn't be found. */
  location: GeoPoint | null
  /** What `location` was looked up from (see geoKey); '' if not looked up yet. */
  geoKey: string
  /** 0 means "want to go"; 1-5 is a rating after visiting. */
  rating: number
  accessible: 'yes' | 'outside' | 'no'
  occasions: string[]
  notes: string
  dateAdded: string
}

// Saving can include a map lookup of a second or two, so allow more than the default time.
export const config = { maxDuration: 60 }

const RESTAURANTS_PATHNAME = 'restaurants.json'
/** Places looked up per "locate" request, keeping each request well under Vercel's time limit. */
const LOCATE_BATCH = 3

async function readRestaurants(): Promise<Restaurant[]> {
  const { blobs } = await list({ prefix: RESTAURANTS_PATHNAME, limit: 1 })
  if (blobs.length === 0) return []
  // Query string keeps the blob CDN from serving a stale copy after a write.
  const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return []
  const stored = (await res.json()) as (Restaurant & { cuisine?: string })[]
  // Older entries kept a single "cuisine" string; read those as a one-item list.
  return stored.map(({ cuisine, ...r }) => ({
    ...r,
    accessible: toAccess(r.accessible),
    address: r.address ?? '',
    location: r.location ?? null,
    geoKey: r.geoKey ?? '',
    cuisines: Array.isArray(r.cuisines) ? r.cuisines : cuisine ? [cuisine] : [],
  }))
}

async function writeRestaurants(restaurants: Restaurant[]): Promise<void> {
  await put(RESTAURANTS_PATHNAME, JSON.stringify(restaurants), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function safeUrl(value: unknown): string {
  let url = text(value, 400)
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : ''
  } catch {
    return ''
  }
}

/** Older entries stored accessible as true/false. */
function toAccess(value: unknown): Restaurant['accessible'] {
  if (value === true || value === 'yes') return 'yes'
  if (value === 'outside') return 'outside'
  return 'no'
}

function cleanList(value: unknown): string[] {
  const seen = new Map<string, string>()
  for (const item of Array.isArray(value) ? value : []) {
    const clean = text(item, 40)
    if (clean && !seen.has(clean.toLowerCase())) seen.set(clean.toLowerCase(), clean)
  }
  return [...seen.values()].slice(0, 12)
}

function cleanFields(body: Partial<Restaurant>) {
  const rating = Math.round(Number(body.rating) || 0)
  return {
    name: text(body.name, 120),
    url: safeUrl(body.url),
    cuisines: cleanList(body.cuisines),
    suburb: text(body.suburb, 60),
    address: text(body.address, 200),
    rating: Math.min(5, Math.max(0, rating)),
    accessible: toAccess(body.accessible),
    occasions: cleanList(body.occasions),
    notes: text(body.notes, 1000),
  }
}

const needsLocation = (r: Restaurant) => r.geoKey !== geoKey(r)

/** Look up a map position for a restaurant whose name, suburb or address changed. */
async function locate(r: Restaurant): Promise<Restaurant> {
  if (!needsLocation(r)) return r
  try {
    return { ...r, location: await geocode(r), geoKey: geoKey(r) }
  } catch (error) {
    // Geocoder unreachable: keep the old position and leave geoKey stale so it's retried later.
    console.error('geocode failed', error)
    return r
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    res.status(200).json(await readRestaurants())
    return
  }

  if (req.method === 'POST' && req.query.action === 'locate') {
    // Find positions for a few places that don't have one yet; the map calls this until none remain.
    const pending = (await readRestaurants()).filter(needsLocation).slice(0, LOCATE_BATCH)
    const located = new Map<string, Restaurant>()
    for (const r of pending) {
      const done = await locate(r)
      if (!needsLocation(done)) located.set(r.id, done)
    }
    // Re-read so edits made while we were geocoding aren't lost.
    const latest = await readRestaurants()
    const updated = latest.map((r) => {
      const done = located.get(r.id)
      return done && geoKey(done) === geoKey(r) ? { ...r, location: done.location, geoKey: done.geoKey } : r
    })
    if (located.size) await writeRestaurants(updated)
    const remaining = updated.filter(needsLocation).length
    // If nothing could be looked up (geocoder down), report none left so the map stops asking.
    res.status(200).json({ restaurants: updated, remaining: located.size || !pending.length ? remaining : 0 })
    return
  }

  if (req.method === 'POST') {
    const body = req.body as Partial<Restaurant> | undefined
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      res.status(400).json({ error: 'A restaurant name is required.' })
      return
    }

    const newRestaurant = await locate({
      id: crypto.randomUUID(),
      ...cleanFields(body),
      location: null,
      geoKey: '',
      dateAdded: new Date().toISOString(),
    })

    const updated = [newRestaurant, ...(await readRestaurants())]
    await writeRestaurants(updated)
    res.status(201).json(updated)
    return
  }

  if (req.method === 'PUT') {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined
    const body = req.body as Partial<Restaurant> | undefined
    if (!id || !body || typeof body.name !== 'string' || !body.name.trim()) {
      res.status(400).json({ error: 'A restaurant id and name are required.' })
      return
    }

    const existing = (await readRestaurants()).find((restaurant) => restaurant.id === id)
    if (!existing) {
      res.status(404).json({ error: 'Restaurant not found. Someone may have deleted it.' })
      return
    }
    const edited = await locate({ ...existing, ...cleanFields(body) })

    // Re-read in case someone else saved while the location was being looked up.
    const updated = await readRestaurants()
    const index = updated.findIndex((restaurant) => restaurant.id === id)
    if (index === -1) {
      res.status(404).json({ error: 'Restaurant not found. Someone may have deleted it.' })
      return
    }
    updated[index] = edited
    await writeRestaurants(updated)
    res.status(200).json(updated)
    return
  }

  if (req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined
    if (!id) {
      res.status(400).json({ error: 'Missing restaurant id.' })
      return
    }

    const updated = (await readRestaurants()).filter((restaurant) => restaurant.id !== id)
    await writeRestaurants(updated)
    res.status(200).json(updated)
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
