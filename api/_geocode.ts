// Finds a map position for a restaurant using OpenStreetMap's Nominatim
// geocoder (free, no key). Its usage policy asks for at most one request per
// second and an identifying User-Agent, so callers geocode one place at a time.

export interface GeoPoint {
  lat: number
  lng: number
  /** True when only the suburb was found, so the pin is the suburb's centre. */
  approx: boolean
}

export interface Locatable {
  name: string
  address?: string
  suburb: string
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'PlacesToEat/1.0 (personal restaurant list; https://github.com/fmwalsh282/Coffee-app)'
const COUNTRY = 'au'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** What the position was looked up from; re-geocode only when this changes. */
export function geoKey(r: Locatable): string {
  return [r.address ?? '', r.name, r.suburb].map((v) => v.trim().toLowerCase()).join('|')
}

async function search(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=${COUNTRY}&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`)
  const results = (await res.json()) as { lat: string; lon: string }[]
  if (!results.length) return null
  const lat = Number(results[0].lat)
  const lng = Number(results[0].lon)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

/**
 * Tries the street address, then the restaurant's name in its suburb, then
 * the suburb alone (marked approximate). Returns null if nothing matched.
 * Throws if the geocoder itself can't be reached, so callers can retry later.
 */
export async function geocode(r: Locatable): Promise<GeoPoint | null> {
  const address = r.address?.trim() ?? ''
  const name = r.name.trim()
  const suburb = r.suburb.trim()
  const attempts: [string, boolean][] = []
  if (address) attempts.push([suburb && !address.toLowerCase().includes(suburb.toLowerCase()) ? `${address}, ${suburb}` : address, false])
  if (name && suburb) attempts.push([`${name}, ${suburb}`, false])
  if (suburb) attempts.push([suburb, true])

  for (const [i, [query, approx]] of attempts.entries()) {
    if (i > 0) await sleep(1100)
    const point = await search(query)
    if (point) return { ...point, approx }
  }
  return null
}
