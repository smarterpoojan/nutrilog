import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/supabase'
import { toast } from './Toast'
import Spinner from './Spinner'

const MEAL_TYPES = [
  { value:'breakfast', label:'Breakfast', emoji:'🌅' },
  { value:'lunch',     label:'Lunch',     emoji:'☀️' },
  { value:'dinner',    label:'Dinner',    emoji:'🌙' },
  { value:'snack',     label:'Snack',     emoji:'🍎' },
]

function getMealType() {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h < 20) return 'dinner'
  return 'snack'
}

export default function LogModal({ open, onClose, session, onLogged }) {
  const [type, setType]       = useState(getMealType())
  const [food, setFood]       = useState('')
  const [calories, setCal]    = useState('')
  const [protein, setProt]    = useState('')
  const [carbs, setCarbs]     = useState('')
  const [fat, setFat]         = useState('')
  const [serving, setServing] = useState('')
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const foodRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => foodRef.current?.focus(), 150)
  }, [open])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reset = () => { setFood(''); setCal(''); setProt(''); setCarbs(''); setFat(''); setServing(''); setNote('') }

  const handleSubmit = async () => {
    if (!food.trim()) { toast('Food name daalo!', 'error'); return }
    setLoading(true)
    const { error } = await supabase.from('food_logs').insert({
      user_id:   session.user.id,
      date:      todayISO(),
      meal_type: type,
      food_name: food.trim(),
      calories:  parseInt(calories) || 0,
      protein:   parseFloat(protein) || 0,
      carbs:     parseFloat(carbs) || 0,
      fat:       parseFloat(fat) || 0,
      serving:   serving || '1 serving',
      note:      note || '',
    })
    setLoading(false)
    if (error) { toast(error.message, 'error'); return }
    toast(`${food} logged! 🎉`)
    reset()
    onLogged()
  }

  if (!open) return null

  const inp = {
    background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'8px',
    color:'var(--text)', fontSize:'0.88rem', padding:'0.6rem 0.85rem', outline:'none',
    width:'100%', transition:'border-color 0.2s',
  }
  const lbl = { fontSize:'0.72rem', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--muted)', display:'block', marginBottom:'0.35rem' }

  return (
    <div onClick={(e) => e.target===e.currentTarget && onClose()} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:200, padding:'1rem',
    }}>
      <div className="slide-up" style={{
        background:'var(--card)', border:'1px solid var(--border2)',
        borderRadius:'20px', padding:'1.75rem', width:'100%', maxWidth:'480px',
        boxShadow:'0 32px 80px rgba(0,0,0,0.6)',
        maxHeight:'90vh', overflowY:'auto',
      }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.15rem', fontWeight:700, color:'var(--cream)' }}>Log a Meal 🍽️</div>
            <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'0.2rem' }}>Aaj kya khaya?</div>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--muted)', width:32, height:32, fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Meal Type Selector */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.4rem', marginBottom:'1.25rem' }}>
          {MEAL_TYPES.map(m => (
            <button key={m.value} onClick={() => setType(m.value)} style={{
              background: type===m.value ? 'var(--mint-glow)' : 'var(--bg2)',
              border: `1px solid ${type===m.value ? 'var(--mint)' : 'var(--border)'}`,
              borderRadius:'8px', padding:'0.55rem 0.25rem', textAlign:'center',
              color: type===m.value ? 'var(--mint)' : 'var(--muted)',
              fontSize:'0.75rem', fontWeight:600, transition:'all 0.15s',
            }}>
              <div style={{ fontSize:'1.2rem', marginBottom:'0.2rem' }}>{m.emoji}</div>
              {m.label}
            </button>
          ))}
        </div>

        {/* Food Name */}
        <div style={{ marginBottom:'1rem' }}>
          <label style={lbl}>What did you eat? *</label>
          <input ref={foodRef} style={inp} type="text" placeholder="e.g. Dal Chawal, Poha, Roti Sabzi..."
            value={food} onChange={e=>setFood(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && !e.shiftKey && handleSubmit()}
            onFocus={e=>e.target.style.borderColor='var(--mint)'}
            onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
        </div>

        {/* Calories + Serving */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1rem' }}>
          <div>
            <label style={lbl}>Calories (kcal)</label>
            <input style={inp} type="number" placeholder="350" value={calories} onChange={e=>setCal(e.target.value)}
              onFocus={e=>e.target.style.borderColor='var(--mint)'} onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
          </div>
          <div>
            <label style={lbl}>Serving</label>
            <input style={inp} type="text" placeholder="1 plate" value={serving} onChange={e=>setServing(e.target.value)}
              onFocus={e=>e.target.style.borderColor='var(--mint)'} onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
          </div>
        </div>

        {/* Macros */}
        <div style={{ marginBottom:'0.5rem' }}>
          <label style={lbl}>Macros (optional)</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem' }}>
            {[['Protein g', protein, setProt, 'var(--blue)'],['Carbs g', carbs, setCarbs, 'var(--gold)'],['Fat g', fat, setFat, 'var(--coral)']].map(([pl, val, set, color]) => (
              <input key={pl} style={{...inp, borderColor:'var(--border)', textAlign:'center'}} type="number" placeholder={pl}
                value={val} onChange={e=>set(e.target.value)}
                onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom:'1.25rem', marginTop:'0.75rem' }}>
          <label style={lbl}>Note (optional)</label>
          <input style={inp} type="text" placeholder="Home cooked, office lunch..." value={note} onChange={e=>setNote(e.target.value)}
            onFocus={e=>e.target.style.borderColor='var(--mint)'} onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{
          width:'100%', background:'var(--mint)', color:'var(--bg)', border:'none', borderRadius:'10px',
          padding:'0.85rem', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.95rem', fontWeight:700,
          display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', transition:'all 0.2s',
        }}
          onMouseEnter={e=>!loading && (e.currentTarget.style.background='#9AE897')}
          onMouseLeave={e=>e.currentTarget.style.background='var(--mint)'}>
          {loading ? <Spinner size={16} color="var(--bg)"/> : 'Save Entry ✓'}
        </button>

        <div style={{ textAlign:'center', fontSize:'0.72rem', color:'var(--muted)', marginTop:'0.75rem' }}>
          Press Esc to close · Enter to save
        </div>
      </div>
    </div>
  )
}
