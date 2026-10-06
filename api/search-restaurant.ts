import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const client = new Anthropic()

interface RestaurantMatch {
  name: string
  cuisine: string
  url: string
  suburb: string
}

interface SearchRestaurantResult {
  matches: RestaurantMatch[]
}

const SYSTEM_PROMPT = `You help fill in a restaurant list. The user gives whatever they know about one restaurant: part of its name, a suburb, a website, or a mix. Use web search (and web fetch to check a page) to identify the restaurant.

Respond with ONLY a single JSON object, no other text, in exactly this shape:
{"matches": [{"name": string, "cuisine": string, "url": string, "suburb": string}]}

- "name": the restaurant's name as the restaurant itself writes it.
- "cuisine": the type of food in one to three words, e.g. "Thai", "Modern Australian", "Pizza", "Japanese ramen".
- "url": the restaurant's own website. If it has none, use its main social media or booking page. Use "" if you can't find either. Never use a review or directory site such as TripAdvisor or Google Maps.
- "suburb": the suburb or neighbourhood it's in, so the user can tell similarly named places apart. Use "" if unknown.

Return one match when you're confident which restaurant is meant. If several real restaurants plausibly fit (for example a chain with several locations, or the same name in different places), return up to 3, best first. If you can't find a real restaurant that fits, return {"matches": []}. Never invent details: leave a field as "" rather than guess.`

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanUrl(value: unknown): string {
  const url = text(value, 400)
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : ''
  } catch {
    return ''
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const name = text(req.body?.name, 200)
  const suburb = text(req.body?.suburb, 100)
  const url = text(req.body?.url, 400)
  if (!name && !url) {
    res.status(400).json({ error: 'Type a name or a website first.' })
    return
  }

  const clues = [
    name && `Name: ${name}`,
    suburb && `Suburb: ${suburb}`,
    url && `Website: ${url}`,
  ].filter(Boolean)

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 4 },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 2 },
      ],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: clues.join('\n') }],
    })

    if (response.stop_reason === 'refusal') {
      res.status(200).json({ matches: [] } satisfies SearchRestaurantResult)
      return
    }

    const textBlock = response.content.findLast(
      (block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text',
    )
    const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Partial<SearchRestaurantResult>) : null
    const matches = (Array.isArray(parsed?.matches) ? parsed.matches : [])
      .map((m) => ({
        name: text(m?.name, 120),
        cuisine: text(m?.cuisine, 60),
        url: cleanUrl(m?.url),
        suburb: text(m?.suburb, 60),
      }))
      .filter((m) => m.name)
      .slice(0, 3)

    res.status(200).json({ matches } satisfies SearchRestaurantResult)
  } catch (error) {
    console.error('search-restaurant lookup failed', error)
    res.status(502).json({ error: 'The search didn’t work just now. Try again, or fill the details in yourself.' })
  }
}
