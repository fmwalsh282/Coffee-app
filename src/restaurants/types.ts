export interface Restaurant {
  id: string
  name: string
  url: string
  cuisines: string[]
  suburb: string
  /** 0 means "want to go"; 1-5 is a rating after visiting. */
  rating: number
  accessible: boolean
  occasions: string[]
  notes: string
  dateAdded: string
}

export type RestaurantInput = Omit<Restaurant, 'id' | 'dateAdded'>
