import { useState } from 'react'
import type { FormEvent } from 'react'
import { GRIND_SIZES } from '../types'
import type { GrindSize, NewCoffeeBean } from '../types'
import { StarRating } from './StarRating'

interface BeanFormProps {
  onAdd: (bean: NewCoffeeBean) => void
  onCancel: () => void
}

export function BeanForm({ onAdd, onCancel }: BeanFormProps) {
  const [name, setName] = useState('')
  const [tastingNotes, setTastingNotes] = useState('')
  const [brewMinutes, setBrewMinutes] = useState('')
  const [brewSeconds, setBrewSeconds] = useState('')
  const [grindSize, setGrindSize] = useState<GrindSize>('Medium')
  const [rating, setRating] = useState(0)

  const totalSeconds = (Number(brewMinutes) || 0) * 60 + (Number(brewSeconds) || 0)
  const isValid = name.trim().length > 0 && totalSeconds > 0 && rating > 0

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
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ethiopia Yirgacheffe"
            required
            className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
          />
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
