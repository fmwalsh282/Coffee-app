import { useState } from 'react'
import { BeanCard } from './components/BeanCard'
import { BeanForm } from './components/BeanForm'
import { useCoffeeBeans } from './hooks/useCoffeeBeans'
import type { CoffeeBean } from './types'

function randomBackgroundUrl(): string {
  const cacheBuster = Math.floor(Math.random() * 1_000_000)
  return `https://loremflickr.com/1920/1080/cafe,coffeeshop?random=${cacheBuster}`
}

function App() {
  const { beans, loading, addBean, updateBean, removeBean } = useCoffeeBeans()
  const [showForm, setShowForm] = useState(false)
  const [editingBean, setEditingBean] = useState<CoffeeBean | null>(null)
  const [backgroundUrl] = useState(randomBackgroundUrl)

  const sortedBeans = [...beans].sort((a, b) => b.rating - a.rating)
  const isFormOpen = showForm || editingBean !== null

  function closeForm() {
    setShowForm(false)
    setEditingBean(null)
  }

  return (
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 -z-10 bg-stone-800 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${backgroundUrl})`,
        }}
      />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow">☕ Coffee Bean Tracker</h1>
            <p className="text-sm text-white/80 drop-shadow">
              {beans.length} bean{beans.length === 1 ? '' : 's'} tried
            </p>
          </div>
          {!isFormOpen && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              + Add bean
            </button>
          )}
        </header>

        {isFormOpen && (
          <BeanForm
            initialBean={editingBean ?? undefined}
            onSubmit={(bean) => {
              if (editingBean) {
                updateBean(editingBean.id, bean)
              } else {
                addBean(bean)
              }
              closeForm()
            }}
            onCancel={closeForm}
          />
        )}

        {loading ? (
          <p className="rounded-xl border border-dashed border-white/30 bg-black/20 p-10 text-center text-white/80 backdrop-blur-sm">
            Loading…
          </p>
        ) : sortedBeans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/30 bg-black/20 p-10 text-center text-white/80 backdrop-blur-sm">
            No beans yet. Add the first one you've tried!
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sortedBeans.map((bean) => (
              <BeanCard key={bean.id} bean={bean} onEdit={setEditingBean} onRemove={removeBean} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
