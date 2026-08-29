import { useState } from 'react'
import type { FormEvent } from 'react'
import { GRIND_SIZES } from '../types'
import type { GrindSize, NewCoffeeBean } from '../types'
import { StarRating } from './StarRating'

interface BeanFormProps {
  onAdd: (bean: NewCoffeeBean) => void
  onCancel: () => void
}

interface SearchBeanResult {
  found: boolean
  tastingNotes: string
  source: string | null
}

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; source: string | null }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

export function BeanForm({ onAdd, onCancel }: BeanFormProps) {
  const [name, setName] = useState('')
  const [tastingNotes, setTastingNotes] = useState('')
  const [brewMinutes, setBrewMinutes] = useState('')
  const [brewSeconds, setBrewSeconds] = useState('')
  const [grindSize, setGrindSize] = useState<GrindSize>('Medium')
  const [rating, setRating] = useState(0)
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' })

  const totalSeconds = (Number(brewMinutes) || 0) * 60 + (Number(brewSeconds) || 0)
  const isValid = name.trim().length > 0 && totalSeconds > 0 && rating > 0

  async function handleSearch() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setLookup({ status: 'loading' })
    try {
      const res = await fetch('/api/search-bean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setLookup({ status: 'error', message: body?.error ?? 'Lookup failed.' })
        return
      }

      const result = (await res.json()) as SearchBeanResult
      if (!result.found) {
        setLookup({ status: 'not-found' })
        return
      }

      setTastingNotes(result.tastingNotes)
      setLookup({ status: 'found', source: result.source })
    } catch {
      setLookup({ status: 'error', message: 'Could not reach the lookup service.' })
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValid) return
    onAdd({
      name: name.trim(),
      tastingNotes: tastingNotes.trim(),
      brewTimeSeconds: totalSeconds,
      grindSize,
      rating,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
    >
      <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
        Add a coffee bean
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Name</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setLookup({ status: 'idle' })
              }}
              placeholder="e.g. Ethiopia Yirgacheffe"
              required
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={!name.trim() || lookup.status === 'loading'}
              className="shrink-0 rounded-lg border border-amber-600 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-500 dark:hover:bg-stone-700"
            >
              {lookup.status === 'loading' ? 'Searching…' : 'Search online'}
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Tasting notes</span>
          <textarea
            value={tastingNotes}
            onChange={(e) => setTastingNotes(e.target.value)}
            placeholder="e.g. Blueberry, floral, bright acidity"
            rows={2}
            className="resize-none rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
          />
          {lookup.status === 'found' && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Filled from a web search{' '}
              {lookup.source && (
                <>
                  (
                  <a href={lookup.source} target="_blank" rel="noreferrer" className="underline">
                    source
                  </a>
                  )
                </>
              )}{' '}
              — check it before saving.
            </p>
          )}
          {lookup.status === 'not-found' && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Couldn't find a reliable match online — enter notes manually.
            </p>
          )}
          {lookup.status === 'error' && (
            <p className="text-xs text-red-600 dark:text-red-400">{lookup.message}</p>
          )}
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Ideal brew time
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={brewMinutes}
              onChange={(e) => setBrewMinutes(e.target.value)}
              placeholder="min"
              className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            />
            <span className="text-stone-500">min</span>
            <input
              type="number"
              min={0}
              max={59}
              value={brewSeconds}
              onChange={(e) => setBrewSeconds(e.target.value)}
              placeholder="sec"
              className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            />
            <span className="text-stone-500">sec</span>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Ideal grind size
          </span>
          <select
            value={grindSize}
            onChange={(e) => setGrindSize(e.target.value as GrindSize)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
          >
            {GRIND_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Your rating</span>
          <StarRating value={rating} onChange={setRating} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save bean
        </button>
      </div>
    </form>
  )
}
