import type { CoffeeBean } from '../types'
import { StarRating } from './StarRating'

interface BeanCardProps {
  bean: CoffeeBean
  onRemove: (id: string) => void
}

function formatBrewTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  if (seconds === 0) return `${minutes}m`
  return `${minutes}m ${seconds}s`
}

export function BeanCard({ bean, onRemove }: BeanCardProps) {
  return (
    <li className="group relative rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <button
        type="button"
        onClick={() => onRemove(bean.id)}
        aria-label={`Remove ${bean.name}`}
        className="absolute right-3 top-3 text-stone-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
      >
        ✕
      </button>

      <h3 className="pr-6 text-lg font-semibold text-stone-900 dark:text-stone-100">
        {bean.name}
      </h3>

      <div className="mt-1">
        <StarRating value={bean.rating} />
      </div>

      {bean.tastingNotes && (
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{bean.tastingNotes}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3 text-sm dark:border-stone-700">
        <div>
          <dt className="text-stone-400 dark:text-stone-500">Brew time</dt>
          <dd className="font-medium text-stone-700 dark:text-stone-200">
            {formatBrewTime(bean.brewTimeSeconds)}
          </dd>
        </div>
        <div>
          <dt className="text-stone-400 dark:text-stone-500">Grind size</dt>
          <dd className="font-medium text-stone-700 dark:text-stone-200">{bean.grindSize}</dd>
        </div>
      </dl>
    </li>
  )
}
