import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const client = new Anthropic()

interface SearchBeanResult {
  found: boolean
  tastingNotes: string
  source: string | null
}

const SYSTEM_PROMPT = `You are a coffee research assistant. Use web search to find the specific coffee bean or roast named by the user - check the roaster's own product page first, then coffee review sites. Extract only what is genuinely about that specific bean.

Respond with ONLY a single JSON object, no other text, matching exactly this shape:
{"found": boolean, "tastingNotes": string, "source": string | null}

"tastingNotes" should be a short comma-separated list of flavor/aroma descriptors (e.g. "blueberry, floral, bright acidity"), written the way a taster would describe it - not a full paragraph. "source" is the URL you found the notes on, or null. If you cannot find a specific, reliable match, set "found" to false, "tastingNotes" to "", and "source" to null - do not guess or invent notes.`

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
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Coffee bean: ${name}` }],
    })

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    )
    const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      res.status(200).json({ found: false, tastingNotes: '', source: null } satisfies SearchBeanResult)
      return
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<SearchBeanResult>
    res.status(200).json({
      found: Boolean(parsed.found),
      tastingNotes: typeof parsed.tastingNotes === 'string' ? parsed.tastingNotes : '',
      source: typeof parsed.source === 'string' ? parsed.source : null,
    } satisfies SearchBeanResult)
  } catch (error) {
    console.error('search-bean lookup failed', error)
    res.status(502).json({ error: 'Lookup failed. Try again or enter tasting notes manually.' })
  }
}
