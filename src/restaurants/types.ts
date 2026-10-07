export type Access = 'yes' | 'no' | 'outside' | 'unsure'

export interface Restaurant {
  id: string
  name: string
  url: string
  cuisines: string[]
  suburb: string
  address: string
  /** Map position; approx means only the suburb was found. Null if not found. */
  location: { lat: number; lng: number; approx: boolean } | null
  geoKey: string
  /** 0 means "want to go"; 1-5 is a rating after visiting. */
  rating: number
  accessible: Access
  occasions: string[]
  notes: string
  dateAdded: string
}

export type RestaurantInput = Omit<Restaurant, 'id' | 'dateAdded' | 'location' | 'geoKey'>
