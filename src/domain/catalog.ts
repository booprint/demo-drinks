/** The bar catalogue and stock. */
export interface Drink {
  sku: string
  name: string
  price_minor: number
  stock: number
  alcoholic: boolean
}

/** A drink sold with a food item at a discount. The food price comes from the food service. */
export interface Combo {
  sku: string
  name: string
  drink_sku: string
  /** A menu item id in food. */
  food_item_id: string
  discount_minor: number
}

const drinks = new Map<string, Drink>(
  [
    { sku: 'd_pint_ipa', name: 'IPA (pint)', price_minor: 800, stock: 120, alcoholic: true },
    { sku: 'd_pint_lager', name: 'Lager (pint)', price_minor: 700, stock: 140, alcoholic: true },
    { sku: 'd_house_red', name: 'House red (glass)', price_minor: 1100, stock: 60, alcoholic: true },
    { sku: 'd_margarita', name: 'Margarita', price_minor: 1400, stock: 80, alcoholic: true },
    { sku: 'd_espresso', name: 'Espresso', price_minor: 350, stock: 400, alcoholic: false },
    { sku: 'd_lemonade', name: 'Lemonade', price_minor: 450, stock: 90, alcoholic: false },
  ].map((d) => [d.sku, d]),
)

export const combos: Combo[] = [
  { sku: 'c_burger_pint', name: 'Burger and a pint', drink_sku: 'd_pint_lager', food_item_id: 'm_burger', discount_minor: 300 },
  { sku: 'c_wings_ipa', name: 'Wings and an IPA', drink_sku: 'd_pint_ipa', food_item_id: 'm_wings', discount_minor: 250 },
  { sku: 'c_kids_lemonade', name: 'Kids pasta and lemonade', drink_sku: 'd_lemonade', food_item_id: 'm_kids_pasta', discount_minor: 150 },
]

export function listDrinks(): Drink[] {
  return [...drinks.values()]
}

export function findDrink(sku: string): Drink | undefined {
  return drinks.get(sku)
}

export function findCombo(sku: string): Combo | undefined {
  return combos.find((c) => c.sku === sku)
}

export class OutOfStock extends Error {}

/** Takes stock for a sale. */
export function take(sku: string, quantity: number) {
  const d = drinks.get(sku)
  if (!d) throw new Error(`Unknown drink ${sku}`)
  if (d.stock < quantity) throw new OutOfStock(`${d.name} is out of stock`)
  d.stock -= quantity
}

export function restock(sku: string, quantity: number) {
  const d = drinks.get(sku)
  if (d) d.stock += quantity
}
