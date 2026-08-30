import { list, put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'

interface CoffeeBean {
  id: string
  name: string
  tastingNotes: string
  brewTimeSeconds: number
  grindSize: number
  rating: number
  dateAdded: string
  imageUrl: string | null
}

const BEANS_PATHNAME = 'beans.json'

async function readBeans(): Promise<CoffeeBean[]> {
  const { blobs } = await list({ prefix: BEANS_PATHNAME, limit: 1 })
  if (blobs.length === 0) return []
  const res = await fetch(blobs[0].url)
  if (!res.ok) return []
  return (await res.json()) as CoffeeBean[]
}

async function writeBeans(beans: CoffeeBean[]): Promise<void> {
  await put(BEANS_PATHNAME, JSON.stringify(beans), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const beans = await readBeans()
    res.status(200).json(beans)
    return
  }

  if (req.method === 'POST') {
    const body = req.body as Partial<CoffeeBean> | undefined
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      res.status(400).json({ error: 'A bean name is required.' })
      return
    }

    const newBean: CoffeeBean = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      tastingNotes: typeof body.tastingNotes === 'string' ? body.tastingNotes.trim() : '',
      brewTimeSeconds: Number(body.brewTimeSeconds) || 0,
      grindSize: Number(body.grindSize) || 0,
      rating: Number(body.rating) || 0,
      dateAdded: new Date().toISOString(),
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : null,
    }

    const beans = await readBeans()
    const updated = [newBean, ...beans]
    await writeBeans(updated)
    res.status(201).json(updated)
    return
  }

  if (req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined
    if (!id) {
      res.status(400).json({ error: 'Missing bean id.' })
      return
    }

    const beans = await readBeans()
    const updated = beans.filter((bean) => bean.id !== id)
    await writeBeans(updated)
    res.status(200).json(updated)
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
