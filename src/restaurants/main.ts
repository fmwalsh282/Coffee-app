import type { Restaurant, RestaurantInput, RestaurantMatch } from './types'

type SortKey = 'name' | 'cuisine' | 'suburb' | 'rating' | 'occasions' | 'accessible'
type Filter = 'all' | 'been' | 'want'
interface Sort {
  key: SortKey
  dir: 'asc' | 'desc'
}

const PRESET_OCCASIONS = [
  'Date night',
  'Cheap & cheerful',
  'Special occasion',
  'Family friendly',
  'Group dinner',
  'Brunch',
  'Quick bite',
  'Drinks',
]
const API = '/api/restaurants'
const LOOKUP_API = '/api/search-restaurant'
const LOOKUP_HINT = 'Type the name, plus the suburb if you know it. This fills in the name, type of food and website for you.'
const REFRESH_MS = 30_000

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

let restaurants: Restaurant[] = []
let loaded = false
let filter: Filter = 'all'
let occasionFilter = ''
let sort: Sort = { key: 'name', dir: 'asc' }
let editingId: string | null = null

try {
  const saved = JSON.parse(localStorage.getItem('pte-view') ?? 'null') as { sort?: Sort; filter?: Filter } | null
  if (saved?.sort) sort = saved.sort
  if (saved?.filter) filter = saved.filter
} catch {
  // Storage unavailable; use defaults.
}

function rememberView() {
  try {
    localStorage.setItem('pte-view', JSON.stringify({ sort, filter }))
  } catch {
    // Not important if this fails.
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function safeUrl(value: string): string {
  let url = value.trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : ''
  } catch {
    return ''
  }
}

const occasionsOf = (r: Restaurant) => (Array.isArray(r.occasions) ? r.occasions.filter((o) => o.trim()) : [])
const hasBeen = (r: Restaurant) => r.rating > 0

function allOccasions(): string[] {
  const seen = new Map<string, string>()
  for (const o of [...PRESET_OCCASIONS, ...restaurants.flatMap(occasionsOf)]) {
    const key = o.trim().toLowerCase()
    if (!seen.has(key)) seen.set(key, o.trim())
  }
  return [...seen.values()]
}

function compare(a: Restaurant, b: Restaurant): number {
  const dir = sort.dir === 'asc' ? 1 : -1
  const byName = a.name.localeCompare(b.name)
  if (sort.key === 'rating' || sort.key === 'accessible') {
    const x = sort.key === 'rating' ? a.rating : Number(a.accessible)
    const y = sort.key === 'rating' ? b.rating : Number(b.accessible)
    return x !== y ? (x - y) * dir : byName
  }
  const value = (r: Restaurant) =>
    sort.key === 'occasions'
      ? occasionsOf(r).map((o) => o.toLowerCase()).sort().join(', ')
      : String(r[sort.key] ?? '').toLowerCase()
  const x = value(a)
  const y = value(b)
  // Blank values always go last, whichever way the column is sorted.
  if (!x && y) return 1
  if (x && !y) return -1
  return x.localeCompare(y) * dir || byName
}

function renderSummary() {
  const summary = $('summary')
  if (!loaded) return
  const been = restaurants.filter(hasBeen).length
  summary.textContent = ''
  summary.append(
    el('b', undefined, String(restaurants.length)),
    restaurants.length === 1 ? ' place · ' : ' places · ',
    el('b', undefined, String(been)),
    ' been · ',
    el('b', undefined, String(restaurants.length - been)),
    ' want to go',
  )
}

function renderRow(r: Restaurant): HTMLTableRowElement {
  const tr = el('tr')
  tr.tabIndex = 0
  tr.dataset.id = r.id

  const name = el('td', 'c-name name')
  const url = safeUrl(r.url)
  if (url) {
    const link = el('a', undefined, r.name)
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener'
    link.append(el('span', 'ext', '↗'))
    name.append(link)
  } else {
    name.textContent = r.name
  }

  const rating = el('td', 'c-rating')
  if (hasBeen(r)) {
    const stars = el('span', 'stars')
    stars.setAttribute('aria-label', `${r.rating} out of 5`)
    stars.append('★'.repeat(r.rating), el('span', 'off', '★'.repeat(5 - r.rating)), el('small', undefined, `${r.rating}/5`))
    rating.append(stars)
  } else {
    rating.append(el('span', 'pill want', 'Want to go'))
  }

  const occasions = el('td', 'c-occ')
  const list = occasionsOf(r)
  if (list.length) {
    const tags = el('div', 'tags')
    for (const o of list) tags.append(el('span', 'tag', o))
    occasions.append(tags)
  }

  const accessible = el('td', 'c-access')
  accessible.append(el('span', `pill ${r.accessible ? 'yes' : 'no'}`, r.accessible ? 'Yes' : 'No'))

  tr.append(
    name,
    el('td', 'c-type', r.cuisine),
    el('td', 'c-suburb', r.suburb),
    rating,
    occasions,
    accessible,
    el('td', 'c-notes notes', r.notes),
  )
  return tr
}

function fillDatalist(id: string, values: string[]) {
  const list = $(id)
  list.textContent = ''
  for (const v of [...new Set(values.map((x) => x.trim()).filter(Boolean))].sort()) {
    const option = el('option')
    option.value = v
    list.append(option)
  }
}

function render() {
  renderSummary()

  const query = $<HTMLInputElement>('q').value.trim().toLowerCase()
  let visible = restaurants.filter((r) => filter === 'all' || (filter === 'been' ? hasBeen(r) : !hasBeen(r)))
  if (occasionFilter) visible = visible.filter((r) => occasionsOf(r).some((o) => o.toLowerCase() === occasionFilter))
  if (query) {
    visible = visible.filter((r) =>
      [r.name, r.cuisine, r.suburb, r.notes, occasionsOf(r).join(' ')].some((v) => v.toLowerCase().includes(query)),
    )
  }
  visible.sort(compare)

  $('rows').replaceChildren(...visible.map(renderRow))

  const empty = $('empty')
  empty.hidden = !loaded || visible.length > 0
  const [heading, body] = [empty.querySelector('h2')!, empty.querySelector('p')!]
  if (restaurants.length) {
    heading.textContent = 'Nothing matches'
    body.textContent = 'Try a different search or filter.'
  } else {
    heading.textContent = 'No restaurants yet'
    body.textContent = 'Places you add appear here for everyone with the link. Use “Add a restaurant” to start the list.'
  }

  document.querySelectorAll<HTMLElement>('th[data-k]').forEach((th) => {
    const active = th.dataset.k === sort.key
    if (active) th.setAttribute('aria-sort', sort.dir === 'asc' ? 'ascending' : 'descending')
    else th.removeAttribute('aria-sort')
    th.querySelector('.arrow')!.textContent = active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'
  })
  document
    .querySelectorAll<HTMLButtonElement>('.seg button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === filter)))
  const sortSelect = $<HTMLSelectElement>('sortSel')
  const sortValue = `${sort.key}:${sort.dir}`
  if ([...sortSelect.options].some((o) => o.value === sortValue)) sortSelect.value = sortValue

  fillDatalist('cuisines', restaurants.map((r) => r.cuisine))
  fillDatalist('suburbs', restaurants.map((r) => r.suburb))

  const occasionSelect = $<HTMLSelectElement>('occSel')
  occasionSelect.length = 1
  for (const o of allOccasions()) {
    const option = el('option', undefined, o)
    option.value = o.toLowerCase()
    occasionSelect.append(option)
  }
  occasionSelect.value = occasionFilter
  if (occasionSelect.value !== occasionFilter) {
    occasionFilter = ''
    occasionSelect.value = ''
  }
}

function showStatus(message: string | null) {
  const status = $('status')
  status.hidden = !message
  status.textContent = message ?? ''
}

async function load() {
  try {
    const res = await fetch(API, { cache: 'no-store' })
    if (!res.ok) throw new Error(String(res.status))
    restaurants = (await res.json()) as Restaurant[]
    loaded = true
    showStatus(null)
    $<HTMLButtonElement>('addBtn').disabled = false
  } catch {
    if (!loaded) $('summary').textContent = 'The list couldn’t load.'
    showStatus('Couldn’t reach the list. Check your connection; it will try again shortly.')
  }
  render()
}

async function send(method: 'POST' | 'PUT' | 'DELETE', id: string | null, body?: RestaurantInput) {
  const res = await fetch(id ? `${API}?id=${encodeURIComponent(id)}` : API, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'Couldn’t save just now. Check your connection and try again.')
  }
  restaurants = (await res.json()) as Restaurant[]
  render()
}

// ---- Toolbar ----

document.querySelectorAll<HTMLElement>('th[data-k] button').forEach((button) =>
  button.addEventListener('click', () => {
    const key = button.parentElement!.dataset.k as SortKey
    if (sort.key === key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
    else sort = { key, dir: key === 'rating' || key === 'accessible' ? 'desc' : 'asc' }
    rememberView()
    render()
  }),
)
$<HTMLSelectElement>('sortSel').addEventListener('change', (e) => {
  const [key, dir] = (e.target as HTMLSelectElement).value.split(':') as [SortKey, Sort['dir']]
  sort = { key, dir }
  rememberView()
  render()
})
document.querySelectorAll<HTMLButtonElement>('.seg button').forEach((button) =>
  button.addEventListener('click', () => {
    filter = button.dataset.f as Filter
    rememberView()
    render()
  }),
)
$<HTMLSelectElement>('occSel').addEventListener('change', (e) => {
  occasionFilter = (e.target as HTMLSelectElement).value
  render()
})
$('q').addEventListener('input', render)

// ---- Add / edit dialog ----

const dialog = $<HTMLDialogElement>('dlg')
const form = $<HTMLFormElement>('form')
const field = (id: string) => $<HTMLInputElement>(id)

function showFormError(message: string | null) {
  const err = $('formErr')
  err.hidden = !message
  err.textContent = message ?? ''
}

function openForm(r: Restaurant | null) {
  editingId = r?.id ?? null
  $('dlgTitle').textContent = r ? 'Edit restaurant' : 'Add a restaurant'
  field('f-name').value = r?.name ?? ''
  field('f-url').value = r?.url ?? ''
  field('f-cuisine').value = r?.cuisine ?? ''
  field('f-suburb').value = r?.suburb ?? ''
  $<HTMLTextAreaElement>('f-notes').value = r?.notes ?? ''
  field(`f-r${Math.min(5, Math.max(0, r?.rating ?? 0))}`).checked = true
  field(r?.accessible ? 'f-ay' : 'f-an').checked = true

  const chosen = new Set((r ? occasionsOf(r) : []).map((o) => o.toLowerCase()))
  const box = $('occChoices')
  box.textContent = ''
  allOccasions().forEach((o, i) => {
    const label = el('label', 'occ')
    const input = el('input')
    input.type = 'checkbox'
    input.name = 'occ'
    input.id = `f-occ-${i}`
    input.value = o
    input.checked = chosen.has(o.toLowerCase())
    label.append(input, el('span', undefined, o))
    box.append(label)
  })
  field('f-occ-other').value = ''

  resetLookup()

  const del = $('delBtn')
  del.hidden = !r
  del.classList.remove('armed')
  del.textContent = 'Delete'
  showFormError(null)
  dialog.showModal()
  field('f-name').focus()
}

function readForm(): RestaurantInput | null {
  const name = field('f-name').value.trim()
  if (!name) {
    showFormError('Add a name for the restaurant.')
    field('f-name').focus()
    return null
  }
  const rawUrl = field('f-url').value.trim()
  if (rawUrl && !safeUrl(rawUrl)) {
    showFormError('That website address doesn’t look right. Try something like https://example.com.')
    field('f-url').focus()
    return null
  }
  const occasions = new Map<string, string>()
  const picked = [...form.querySelectorAll<HTMLInputElement>('input[name=occ]:checked')].map((i) => i.value)
  for (const o of [...picked, ...field('f-occ-other').value.split(',')]) {
    const value = o.trim().slice(0, 40)
    if (value && !occasions.has(value.toLowerCase())) occasions.set(value.toLowerCase(), value)
  }
  return {
    name,
    url: rawUrl ? safeUrl(rawUrl) : '',
    cuisine: field('f-cuisine').value.trim(),
    suburb: field('f-suburb').value.trim(),
    rating: Number(form.querySelector<HTMLInputElement>('input[name=rating]:checked')?.value ?? 0),
    accessible: field('f-ay').checked,
    occasions: [...occasions.values()].slice(0, 12),
    notes: $<HTMLTextAreaElement>('f-notes').value.trim(),
  }
}

// ---- Look up name, type of food and website online ----

let lookupRun = 0

function setLookupMessage(message: string, found = false) {
  const msg = $('lookupMsg')
  msg.textContent = message
  msg.classList.toggle('found', found)
}

function resetLookup() {
  lookupRun++
  $<HTMLButtonElement>('lookupBtn').disabled = false
  $<HTMLButtonElement>('lookupBtn').textContent = 'Look it up online'
  $('lookupMatches').hidden = true
  $('lookupMatches').textContent = ''
  setLookupMessage(LOOKUP_HINT)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function applyMatch(m: RestaurantMatch) {
  field('f-name').value = m.name
  if (m.cuisine) field('f-cuisine').value = m.cuisine
  if (m.url) field('f-url').value = m.url
  $('lookupMatches').hidden = true
  const parts = ['name', m.cuisine && 'type of food', m.url && 'website'].filter(Boolean)
  const filled = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
  const where = m.suburb ? ` (${m.suburb})` : ''
  setLookupMessage(`Filled in the ${filled} for ${m.name}${where}. Check it looks right before saving.`, true)
}

async function lookUp() {
  const name = field('f-name').value.trim()
  const url = field('f-url').value.trim()
  if (!name && !url) {
    setLookupMessage('Type a name first, then look it up.')
    field('f-name').focus()
    return
  }
  const run = ++lookupRun
  const button = $<HTMLButtonElement>('lookupBtn')
  button.disabled = true
  button.textContent = 'Searching…'
  $('lookupMatches').hidden = true
  setLookupMessage('Searching the web. This usually takes 10–30 seconds.')
  try {
    const res = await fetch(LOOKUP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, suburb: field('f-suburb').value.trim() }),
    })
    const data = (await res.json().catch(() => null)) as { matches?: RestaurantMatch[]; error?: string } | null
    if (run !== lookupRun) return
    if (!res.ok) throw new Error(data?.error ?? 'The search didn’t work just now. Try again, or fill the details in yourself.')
    const matches = data?.matches ?? []
    if (matches.length === 0) {
      setLookupMessage('Couldn’t find that restaurant. Check the spelling or add the suburb, then try again.')
    } else if (matches.length === 1) {
      applyMatch(matches[0])
    } else {
      setLookupMessage('Found a few places with that name. Tap the right one:', true)
      const box = $('lookupMatches')
      box.replaceChildren(
        ...matches.map((m) => {
          const option = el('button', 'match')
          option.type = 'button'
          const details = [m.cuisine, m.suburb, hostOf(m.url)].filter(Boolean).join(' · ')
          option.append(el('strong', undefined, m.name), el('span', undefined, details))
          option.addEventListener('click', () => applyMatch(m))
          return option
        }),
      )
      box.hidden = false
    }
  } catch (err) {
    if (run === lookupRun) setLookupMessage((err as Error).message)
  } finally {
    if (run === lookupRun) {
      button.disabled = false
      button.textContent = 'Look it up again'
    }
  }
}

$('lookupBtn').addEventListener('click', () => void lookUp())
$('addBtn').addEventListener('click', () => openForm(null))
$('cancelBtn').addEventListener('click', () => dialog.close())
$('rows').addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (target.closest('a')) return
  const row = target.closest('tr')
  const r = restaurants.find((x) => x.id === row?.dataset.id)
  if (r) openForm(r)
})
$('rows').addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement
  if (e.key === 'Enter' && target.tagName === 'TR') target.click()
})

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const data = readForm()
  if (!data) return
  const save = $<HTMLButtonElement>('saveBtn')
  save.disabled = true
  try {
    await send(editingId ? 'PUT' : 'POST', editingId, data)
    dialog.close()
  } catch (err) {
    showFormError((err as Error).message)
  } finally {
    save.disabled = false
  }
})

$('delBtn').addEventListener('click', async () => {
  const del = $('delBtn')
  if (!del.classList.contains('armed')) {
    del.classList.add('armed')
    del.textContent = 'Tap again to delete'
    return
  }
  try {
    await send('DELETE', editingId)
    dialog.close()
  } catch (err) {
    showFormError((err as Error).message)
  }
})

// ---- Start ----

render()
void load()
// Pick up other people's additions while the page is open.
setInterval(() => {
  if (document.visibilityState === 'visible' && !dialog.open) void load()
}, REFRESH_MS)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !dialog.open) void load()
})
