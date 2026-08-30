import { useEffect, useState } from 'react'
import type { CoffeeBean, NewCoffeeBean } from '../types'

export function useCoffeeBeans() {
  const [beans, setBeans] = useState<CoffeeBean[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/beans')
      .then((res) => res.json())
      .then((data: CoffeeBean[]) => setBeans(data))
      .catch(() => setBeans([]))
      .finally(() => setLoading(false))
  }, [])

  async function addBean(bean: NewCoffeeBean) {
    const res = await fetch('/api/beans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bean),
    })
    if (res.ok) {
      setBeans((await res.json()) as CoffeeBean[])
    }
  }

  async function removeBean(id: string) {
    const res = await fetch(`/api/beans?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) {
      setBeans((await res.json()) as CoffeeBean[])
    }
  }

  return { beans, loading, addBean, removeBean }
}
