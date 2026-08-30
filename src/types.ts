export interface CoffeeBean {
  id: string
  name: string
  tastingNotes: string
  brewTimeSeconds: number
  grindSize: number
  rating: number
  dateAdded: string
}

export type NewCoffeeBean = Omit<CoffeeBean, 'id' | 'dateAdded'>
