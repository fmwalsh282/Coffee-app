import type { CoffeeBean } from '../types'
import { StarRating } from './StarRating'

interface BeanCardProps {
  bean: CoffeeBean
  onEdit: (bean: CoffeeBean) => void
  onRemove: (id: string) => void
}

export function BeanCard({ bean, onEdit, onRemove }: BeanCardProps) {
  return (
    <li className="relative rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="absolute right-3 top-3 flex gap-1 rounded-full bg-white/80 p-1 backdrop-blur-sm dark:bg-stone-900/70">
        <button
          type="button"
          onClick={() => onEdit(bean)}
          aria-label={`Edit ${bean.name}`}
          className="px-1 text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-500"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => onRemove(bean.id)}
          aria-label={`Remove ${bean.name}`}
          className="px-1 text-stone-500 hover:text-red-500 dark:text-stone-400 dark:hover:text-red-500"
        >
          ✕
        </button>
      </div>

      {bean.imageUrl && (
        <img
          src={bean.imageUrl}
          alt=""
          className="-mx-5 -mt-5 mb-4 h-40 w-[calc(100%+2.5rem)] rounded-t-xl object-cover"
        />
      )}

      <h3 className="pr-14 text-lg font-semibold text-stone-900 dark:text-stone-100">
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
            {bean.brewTimeSeconds}s
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
