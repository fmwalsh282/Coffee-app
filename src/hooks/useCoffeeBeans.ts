import { useEffect, useState } from 'react'
import type { CoffeeBean, NewCoffeeBean } from '../types'

const STORAGE_KEY = 'coffee-beans'

function loadBeans(): CoffeeBean[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CoffeeBean[]) : []
  } catch {
    return []
  }
}

export function useCoffeeBeans() {
  const [beans, setBeans] = useState<CoffeeBean[]>(loadBeans)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(beans))
  }, [beans])

  function addBean(bean: NewCoffeeBean) {
    const newBean: CoffeeBean = {
      ...bean,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
    }
    setBeans((prev) => [newBean, ...prev])
  }

  function removeBean(id: string) {
    setBeans((prev) => prev.filter((bean) => bean.id !== id))
  }

  return { beans, addBean, removeBean }
}
