import type { Access, Restaurant, RestaurantInput } from './types'

type SortKey = 'name' | 'cuisines' | 'suburb' | 'rating' | 'occasions' | 'accessible'
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
const REFRESH_MS = 30_000

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

let restaurants: Restaurant[] = []
let loaded = false
let filter: Filter = 'all'
let occasionFilter = ''
let foodFilter = ''
let accessFilter: Access | '' = ''
let sort: Sort = { key: 'name', dir: 'asc' }
let editingId: string | null = null

try {
  const saved = JSON.parse(localStorage.getItem('pte-view') ?? 'null') as { sort?: Sort; filter?: Filter } | null
  const keys: SortKey[] = ['name', 'cuisines', 'suburb', 'rating', 'occasions', 'accessible']
  if (saved?.sort && keys.includes(saved.sort.key)) sort = saved.sort
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

const listOf = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v.trim()) : [])
const occasionsOf = (r: Restaurant) => listOf(r.occasions)
const cuisinesOf = (r: Restaurant) => listOf(r.cuisines)
const hasBeen = (r: Restaurant) => r.rating > 0
const ACCESS_LABEL: Record<Access, string> = { yes: 'Yes', outside: 'Outside only', no: 'No' }
const ACCESS_RANK: Record<Access, number> = { yes: 2, outside: 1, no: 0 }
const accessOf = (r: Restaurant): Access => (r.accessible in ACCESS_LABEL ? r.accessible : 'no')

/** Distinct values, first spelling wins, ignoring case. */
function distinct(values: string[]): string[] {
  const seen = new Map<string, string>()
  for (const v of values) {
    const key = v.trim().toLowerCase()
    if (key && !seen.has(key)) seen.set(key, v.trim())
  }
  return [...seen.values()]
}

const allOccasions = () => distinct([...PRESET_OCCASIONS, ...restaurants.flatMap(occasionsOf)])
const allCuisines = () => distinct(restaurants.flatMap(cuisinesOf)).sort((a, b) => a.localeCompare(b))

function compare(a: Restaurant, b: Restaurant): number {
  const dir = sort.dir === 'asc' ? 1 : -1
  const byName = a.name.localeCompare(b.name)
  if (sort.key === 'rating' || sort.key === 'accessible') {
    const x = sort.key === 'rating' ? a.rating : ACCESS_RANK[accessOf(a)]
    const y = sort.key === 'rating' ? b.rating : ACCESS_RANK[accessOf(b)]
    return x !== y ? (x - y) * dir : byName
  }
  const value = (r: Restaurant) =>
    sort.key === 'occasions' || sort.key === 'cuisines'
      ? (sort.key === 'occasions' ? occasionsOf(r) : cuisinesOf(r)).map((o) => o.toLowerCase()).sort().join(', ')
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
  accessible.append(el('span', `pill ${accessOf(r)}`, ACCESS_LABEL[accessOf(r)]))

  const edit = el('td', 'c-edit')
  const editButton = el('button', 'btn edit', 'Edit')
  editButton.type = 'button'
  editButton.setAttribute('aria-label', `Edit ${r.name}`)
  edit.append(editButton)

  tr.append(
    name,
    el('td', 'c-type', cuisinesOf(r).join(', ')),
    el('td', 'c-suburb', r.suburb),
    rating,
    occasions,
    accessible,
    el('td', 'c-notes notes', r.notes),
    edit,
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
  if (accessFilter) visible = visible.filter((r) => accessOf(r) === accessFilter)
  if (foodFilter) visible = visible.filter((r) => cuisinesOf(r).some((c) => c.toLowerCase() === foodFilter))
  if (occasionFilter) visible = visible.filter((r) => occasionsOf(r).some((o) => o.toLowerCase() === occasionFilter))
  if (query) {
    visible = visible.filter((r) =>
      [r.name, cuisinesOf(r).join(' '), r.suburb, r.notes, occasionsOf(r).join(' ')].some((v) => v.toLowerCase().includes(query)),
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

  fillDatalist('suburbs', restaurants.map((r) => r.suburb))
  foodFilter = fillFilter('foodSel', allCuisines(), foodFilter)
  occasionFilter = fillFilter('occSel', allOccasions(), occasionFilter)
}

/** Refill a filter dropdown, keeping the current choice if it still exists. */
function fillFilter(id: string, values: string[], current: string): string {
  const select = $<HTMLSelectElement>(id)
  select.length = 1
  for (const v of values) {
    const option = el('option', undefined, v)
    option.value = v.toLowerCase()
    select.append(option)
  }
  select.value = current
  if (select.value !== current) select.value = ''
  return select.value
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
$<HTMLSelectElement>('accessSel').addEventListener('change', (e) => {
  accessFilter = (e.target as HTMLSelectElement).value as Access | ''
  render()
})
$<HTMLSelectElement>('foodSel').addEventListener('change', (e) => {
  foodFilter = (e.target as HTMLSelectElement).value
  render()
})
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
  field('f-suburb').value = r?.suburb ?? ''
  $<HTMLTextAreaElement>('f-notes').value = r?.notes ?? ''
  field(`f-r${Math.min(5, Math.max(0, r?.rating ?? 0))}`).checked = true
  field({ yes: 'f-ay', outside: 'f-ao', no: 'f-an' }[r ? accessOf(r) : 'no']).checked = true

  renderChoices('foodChoices', 'food', allCuisines(), r ? cuisinesOf(r) : [])
  renderChoices('occChoices', 'occ', allOccasions(), r ? occasionsOf(r) : [])

  const del = $('delBtn')
  del.hidden = !r
  del.classList.remove('armed')
  del.textContent = 'Delete'
  showFormError(null)
  dialog.showModal()
  field('f-name').focus()
}

/** Tick-box chips for each option, plus an "add your own" box (id `f-<name>-other`). */
function renderChoices(boxId: string, name: string, options: string[], chosen: string[]) {
  const picked = new Set(chosen.map((o) => o.toLowerCase()))
  $(boxId).replaceChildren(
    ...distinct([...options, ...chosen]).map((o, i) => {
      const label = el('label', 'occ')
      const input = el('input')
      input.type = 'checkbox'
      input.name = name
      input.id = `f-${name}-${i}`
      input.value = o
      input.checked = picked.has(o.toLowerCase())
      label.append(input, el('span', undefined, o))
      return label
    }),
  )
  field(`f-${name}-other`).value = ''
}

function readChoices(name: string): string[] {
  const picked = [...form.querySelectorAll<HTMLInputElement>(`input[name=${name}]:checked`)].map((i) => i.value)
  const typed = field(`f-${name}-other`).value.split(',')
  return distinct([...picked, ...typed].map((o) => o.trim().slice(0, 40))).slice(0, 12)
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
  return {
    name,
    url: rawUrl ? safeUrl(rawUrl) : '',
    cuisines: readChoices('food'),
    suburb: field('f-suburb').value.trim(),
    rating: Number(form.querySelector<HTMLInputElement>('input[name=rating]:checked')?.value ?? 0),
    accessible: (form.querySelector<HTMLInputElement>('input[name=accessible]:checked')?.value ?? 'no') as Access,
    occasions: readChoices('occ'),
    notes: $<HTMLTextAreaElement>('f-notes').value.trim(),
  }
}

$('addBtn').addEventListener('click', () => openForm(null))
$('cancelBtn').addEventListener('click', () => dialog.close())
$('rows').addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (target.closest('a')) return
  const row = target.closest('tr')
  const r = restaurants.find((x) => x.id === row?.dataset.id)
  if (r) openForm(r)
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
