interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  max?: number
}

export function StarRating({ value, onChange, max = 5 }: StarRatingProps) {
  const interactive = Boolean(onChange)

  return (
    <div className="flex gap-0.5" role={interactive ? 'radiogroup' : undefined} aria-label="Rating">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          aria-pressed={star <= value}
          className={`text-xl leading-none ${interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'} ${
            star <= value ? 'text-amber-500' : 'text-stone-300 dark:text-stone-600'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
