import { useState } from 'react'
import { BeanCard } from './components/BeanCard'
import { BeanForm } from './components/BeanForm'
import { useCoffeeBeans } from './hooks/useCoffeeBeans'
import type { CoffeeBean } from './types'

function App() {
  const { beans, loading, addBean, updateBean, removeBean } = useCoffeeBeans()
  const [showForm, setShowForm] = useState(false)
  const [editingBean, setEditingBean] = useState<CoffeeBean | null>(null)

  const sortedBeans = [...beans].sort((a, b) => b.rating - a.rating)
  const isFormOpen = showForm || editingBean !== null

  function closeForm() {
    setShowForm(false)
    setEditingBean(null)
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden bg-[#3a2717]">
        <img
          src="/cafe-background.svg"
          alt=""
          className="h-full w-full object-contain object-center"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

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
