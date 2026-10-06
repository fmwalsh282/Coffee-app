import { list, put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'

interface Restaurant {
  id: string
  name: string
  url: string
  cuisine: string
  suburb: string
  /** 0 means "want to go"; 1-5 is a rating after visiting. */
  rating: number
  accessible: boolean
  occasions: string[]
  notes: string
  dateAdded: string
}

const RESTAURANTS_PATHNAME = 'restaurants.json'

async function readRestaurants(): Promise<Restaurant[]> {
  const { blobs } = await list({ prefix: RESTAURANTS_PATHNAME, limit: 1 })
  if (blobs.length === 0) return []
  // Query string keeps the blob CDN from serving a stale copy after a write.
  const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return []
  return (await res.json()) as Restaurant[]
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

function cleanFields(body: Partial<Restaurant>) {
  const occasions = Array.isArray(body.occasions) ? body.occasions : []
  const seen = new Map<string, string>()
  for (const occasion of occasions) {
    const value = text(occasion, 40)
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value)
  }
  const rating = Math.round(Number(body.rating) || 0)
  return {
    name: text(body.name, 120),
    url: safeUrl(body.url),
    cuisine: text(body.cuisine, 60),
    suburb: text(body.suburb, 60),
    rating: Math.min(5, Math.max(0, rating)),
    accessible: body.accessible === true,
    occasions: [...seen.values()].slice(0, 12),
    notes: text(body.notes, 1000),
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    res.status(200).json(await readRestaurants())
    return
  }

  if (req.method === 'POST') {
    const body = req.body as Partial<Restaurant> | undefined
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      res.status(400).json({ error: 'A restaurant name is required.' })
      return
    }

    const newRestaurant: Restaurant = {
      id: crypto.randomUUID(),
      ...cleanFields(body),
      dateAdded: new Date().toISOString(),
    }

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

    const restaurants = await readRestaurants()
    const index = restaurants.findIndex((restaurant) => restaurant.id === id)
    if (index === -1) {
      res.status(404).json({ error: 'Restaurant not found. Someone may have deleted it.' })
      return
    }

    const updated = [...restaurants]
    updated[index] = { ...updated[index], ...cleanFields(body) }
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
