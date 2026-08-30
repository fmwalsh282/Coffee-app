import { useState } from 'react'
import { BeanCard } from './components/BeanCard'
import { BeanForm } from './components/BeanForm'
import { useCoffeeBeans } from './hooks/useCoffeeBeans'

function App() {
  const { beans, loading, addBean, removeBean } = useCoffeeBeans()
  const [showForm, setShowForm] = useState(false)

  const sortedBeans = [...beans].sort((a, b) => b.rating - a.rating)

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              ☕ Coffee Bean Tracker
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {beans.length} bean{beans.length === 1 ? '' : 's'} tried
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              + Add bean
            </button>
          )}
        </header>

        {showForm && (
          <BeanForm
            onAdd={(bean) => {
              addBean(bean)
              setShowForm(false)
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-400 dark:border-stone-700 dark:text-stone-500">
            Loading…
          </p>
        ) : sortedBeans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-400 dark:border-stone-700 dark:text-stone-500">
            No beans yet. Add the first one you've tried!
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sortedBeans.map((bean) => (
              <BeanCard key={bean.id} bean={bean} onRemove={removeBean} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
