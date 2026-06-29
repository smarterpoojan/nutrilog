import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/supabase'
import { toast } from './Toast'
import Spinner from './Spinner'

const MEAL_SLOTS = [
  { value: 'early_morning', label: '🌙 Early Morning', time: '5–7 AM' },
  { value: 'breakfast',     label: '🌅 Breakfast',     time: '7–9 AM' },
  { value: 'mid_morning',   label: '☕ Mid Morning',   time: '10–11 AM' },
  { value: 'lunch',         label: '☀️ Lunch',         time: '12–2 PM' },
  { value: 'evening',       label: '🌤️ Evening Snack', time: '4–6 PM' },
  { value: 'dinner',        label: '🌙 Dinner',        time: '7–9 PM' },
  { value: 'late_night',    label: '🌃 Late Night',    time: 'After 10 PM' },
]

function getMealSlot() {
  const h = new Date().getHours()
  if (h < 7)  return 'early_morning'
  if (h < 10) return 'breakfast'
  if (h < 12) return 'mid_morning'
  if (h < 15) return 'lunch'
  if (h < 19) return 'evening'
  if (h < 22) return 'dinner'
  return 'late_night'
}

export default function LogModal({ open, onClose, session, onLogged }) {
  const [mealSlot, setMealSlot] = useState(getMealSlot())
  const [items, setItems]       = useState([''])
  const [loading, setLoading]   = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    if (open) { setMealSlot(getMealSlot()); setItems(['']); setTimeout(() => firstRef.current?.focus(), 150) }
  }, [open])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addItem    = () => setItems(p => [...p, ''])
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (i, v) => setItems(p => p.map((x, idx) => idx === i ? v : x))

  const handleSubmit = async () => {
    const filled = items.filter(v => v.trim())
    if (!filled.length) { toast('Kuch toh daalo! 🍽️', 'error'); return }
    setLoading(true)
    const slot = MEAL_SLOTS.find(s => s.value === mealSlot)
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    const inserts = filled.map(f => ({
      user_id: session.user.id, date: todayISO(), meal_type: mealSlot,
      food_name: f.trim(), calories: 0, protein: 0, carbs: 0, fat: 0,
      serving: '1 serving', note: `${slot?.label} at ${timeStr}`,
    }))
    const { error } = await supabase.from('food_logs').insert(inserts)
    setLoading(false)
    if (error) { toast(error.message, 'error'); return }
    toast(`${filled.length} item${filled.length > 1 ? 's' : ''} logged! ✅`)
    onLogged()
  }

  if (!open) return null

  const inp = { flex: 1, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.9rem', padding: '0.65rem 0.9rem', outline: 'none', transition: 'border-color 0.2s' }

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
      <div className="slide-up" style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '1.75rem', width: '100%', maxWidth: '500px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--cream)' }}>Kya Khaya? 🍽️</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)', width: 32, height: 32, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Meal Time Dropdown */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Kab Khaya?</label>
          <select value={mealSlot} onChange={e => setMealSlot(e.target.value)} style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '10px', color: 'var(--text)', fontSize: '0.92rem', padding: '0.7rem 0.9rem', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236A7A6A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.9rem center' }}
            onFocus={e => e.target.style.borderColor = 'var(--mint)'} onBlur={e => e.target.style.borderColor = 'var(--border2)'}>
            {MEAL_SLOTS.map(s => <option key={s.value} value={s.value} style={{ background: 'var(--bg2)' }}>{s.label} — {s.time}</option>)}
          </select>
        </div>

        {/* Food Items */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Kya Khaya?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input ref={i === 0 ? firstRef : null} style={inp} type="text"
                  placeholder={i === 0 ? 'e.g. Dal Chawal, Roti Sabzi...' : 'Aur kuch...'}
                  value={item} onChange={e => updateItem(i, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { if (i === items.length - 1) addItem(); else handleSubmit() } }}
                  onFocus={e => e.target.style.borderColor = 'var(--mint)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'} />
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} style={{ background: 'rgba(240,123,95,0.1)', border: '1px solid rgba(240,123,95,0.3)', borderRadius: '8px', color: 'var(--coral)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addItem} style={{ background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: '8px', color: 'var(--muted)', padding: '0.6rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mint)'; e.currentTarget.style.color = 'var(--mint)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>+</span> Aur add karo
            </button>
          </div>
        </div>

        {/* Preview */}
        {items.filter(v => v.trim()).length > 0 && (
          <div style={{ background: 'var(--bg2)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--muted)', borderLeft: '3px solid var(--mint)' }}>
            <span style={{ color: 'var(--mint)', fontWeight: 600 }}>{MEAL_SLOTS.find(s => s.value === mealSlot)?.label}</span>
            {' → '}{items.filter(v => v.trim()).join(', ')}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', background: 'var(--mint)', color: 'var(--bg)', border: 'none', borderRadius: '10px', padding: '0.85rem', fontFamily: "'Space Grotesk',sans-serif", fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', cursor: 'pointer' }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = '#9AE897')}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--mint)'}>
          {loading ? <Spinner size={16} color="var(--bg)" /> : 'Save ✓'}
        </button>
        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.6rem' }}>Enter to add more • Esc to close</div>
      </div>
    </div>
  )
}
