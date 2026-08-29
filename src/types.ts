export type GrindSize =
  | 'Extra Fine'
  | 'Fine'
  | 'Medium-Fine'
  | 'Medium'
  | 'Medium-Coarse'
  | 'Coarse'
  | 'Extra Coarse'

export const GRIND_SIZES: GrindSize[] = [
  'Extra Fine',
  'Fine',
  'Medium-Fine',
  'Medium',
  'Medium-Coarse',
  'Coarse',
  'Extra Coarse',
]

export interface CoffeeBean {
  id: string
  name: string
  tastingNotes: string
  brewTimeSeconds: number
  grindSize: GrindSize
  rating: number
  dateAdded: string
}

export type NewCoffeeBean = Omit<CoffeeBean, 'id' | 'dateAdded'>
