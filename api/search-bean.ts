import Anthropic from '@anthropic-ai/sdk'
import { put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const client = new Anthropic()

interface SearchBeanResult {
  found: boolean
  tastingNotes: string
  source: string | null
  imageUrl: string | null
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const SYSTEM_PROMPT = `You are a coffee research assistant. Use web search (and web fetch, to read a candidate page) to find the specific coffee bean or roast named by the user - check the roaster's own product page first, then coffee review sites. Extract only what is genuinely about that specific bean.

Respond with ONLY a single JSON object, no other text, matching exactly this shape:
{"found": boolean, "tastingNotes": string, "source": string | null, "imageUrl": string | null}

"tastingNotes" should be a short comma-separated list of flavor/aroma descriptors (e.g. "blueberry, floral, bright acidity"), written the way a taster would describe it - not a full paragraph. "source" is the URL you found the notes on, or null. "imageUrl" is a direct URL to a real product photo of this bean's bag/packaging (e.g. the roaster's product image or an og:image meta tag), or null if you can't find one - it must be a direct link to an image file, not a webpage. If you cannot find a specific, reliable match for the bean itself, set "found" to false, "tastingNotes" to "", "source" to null, and "imageUrl" to null - do not guess or invent notes.`

async function downloadAndStoreImage(imageUrl: string): Promise<string | null> {
  try {
    if (!/^https?:\/\//i.test(imageUrl)) return null

    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return null

    const contentType = imgRes.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return null

    const contentLength = Number(imgRes.headers.get('content-length') ?? 0)
    if (contentLength > MAX_IMAGE_BYTES) return null

    const buffer = Buffer.from(await imgRes.arrayBuffer())
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null

    const extension = contentType.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/gi, '') || 'jpg'
    const blob = await put(`bean-images/${crypto.randomUUID()}.${extension}`, buffer, {
      access: 'public',
      contentType,
    })
    return blob.url
  } catch (error) {
    console.error('image download/store failed', error)
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name || name.length > 200) {
    res.status(400).json({ error: 'Provide a coffee bean name (1-200 characters).' })
    return
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4096,
      output_config: { effort: 'low' },
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 3 },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 2 },
      ],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Coffee bean: ${name}` }],
    })

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    )
    const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      res
        .status(200)
        .json({ found: false, tastingNotes: '', source: null, imageUrl: null } satisfies SearchBeanResult)
      return
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<SearchBeanResult>
    const storedImageUrl =
      typeof parsed.imageUrl === 'string' ? await downloadAndStoreImage(parsed.imageUrl) : null

    res.status(200).json({
      found: Boolean(parsed.found),
      tastingNotes: typeof parsed.tastingNotes === 'string' ? parsed.tastingNotes : '',
      source: typeof parsed.source === 'string' ? parsed.source : null,
      imageUrl: storedImageUrl,
    } satisfies SearchBeanResult)
  } catch (error) {
    console.error('search-bean lookup failed', error)
    res.status(502).json({ error: 'Lookup failed. Try again or enter tasting notes manually.' })
  }
}
