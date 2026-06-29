import { useState, useEffect } from 'react'
import { supabase, todayISO } from '../lib/supabase'
import { toast } from '../components/Toast'
import Spinner from '../components/Spinner'

const MEAL_SLOTS = [
  { value:'early_morning', label:'🌙 Early Morning', time:'5–7 AM' },
  { value:'breakfast',     label:'🌅 Breakfast',     time:'7–9 AM' },
  { value:'mid_morning',   label:'☕ Mid Morning',   time:'10–11 AM' },
  { value:'lunch',         label:'☀️ Lunch',         time:'12–2 PM' },
  { value:'evening',       label:'🌤️ Evening Snack', time:'4–6 PM' },
  { value:'dinner',        label:'🌙 Dinner',        time:'7–9 PM' },
  { value:'late_night',    label:'🌃 Late Night',    time:'After 10 PM' },
]
const MEAL_COLORS = { early_morning:'var(--purple)', breakfast:'var(--gold)', mid_morning:'var(--blue)', lunch:'var(--mint)', evening:'var(--coral)', dinner:'var(--purple)', late_night:'#6B8CAE' }
const SLOT_ORDER  = ['early_morning','breakfast','mid_morning','lunch','evening','dinner','late_night']

function getMealSlot() {
  const h = new Date().getHours()
  if (h < 7) return 'early_morning'; if (h < 10) return 'breakfast'
  if (h < 12) return 'mid_morning'; if (h < 15) return 'lunch'
  if (h < 19) return 'evening'; if (h < 22) return 'dinner'
  return 'late_night'
}

const inp = { width:'100%', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'8px', color:'var(--text)', fontSize:'0.9rem', padding:'0.65rem 0.85rem', outline:'none', transition:'border-color 0.2s' }
const onF = e => e.target.style.borderColor = 'var(--mint)'
const onB = e => e.target.style.borderColor = 'var(--border2)'

export default function LogPage({ session, onLogged }) {
  const [mealSlot, setMealSlot] = useState(getMealSlot())
  const [items, setItems]       = useState([''])
  const [saving, setSaving]     = useState(false)
  const [logs, setLogs]         = useState([])
  const [loadingLogs, setLL]    = useState(true)

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    setLL(true)
    const { data } = await supabase.from('food_logs').select('*').eq('user_id', session.user.id).order('logged_at', { ascending: false }).limit(60)
    if (data) setLogs(data)
    setLL(false)
  }

  const addItem    = () => setItems(p => [...p, ''])
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (i, v) => setItems(p => p.map((x, idx) => idx === i ? v : x))

  const handleLog = async () => {
    const filled = items.filter(v => v.trim())
    if (!filled.length) { toast('Kuch toh daalo!', 'error'); return }
    setSaving(true)
    const slot = MEAL_SLOTS.find(s => s.value === mealSlot)
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
    const inserts = filled.map(f => ({
      user_id:session.user.id, date:todayISO(), meal_type:mealSlot,
      food_name:f.trim(), calories:0, protein:0, carbs:0, fat:0,
      serving:'1 serving', note:`${slot?.label} at ${timeStr}`,
    }))
    const { error } = await supabase.from('food_logs').insert(inserts)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast(`${filled.length} item${filled.length > 1 ? 's' : ''} logged! ✅`)
    setItems(['']); setMealSlot(getMealSlot())
    loadLogs(); onLogged?.()
  }

  const deleteLog = async (id) => {
    await supabase.from('food_logs').delete().eq('id', id)
    toast('Hata diya', 'info')
    setLogs(p => p.filter(l => l.id !== id)); onLogged?.()
  }

  // Group by date → slot
  const grouped = {}
  logs.forEach(l => { if (!grouped[l.date]) grouped[l.date] = {}; if (!grouped[l.date][l.meal_type]) grouped[l.date][l.meal_type] = []; grouped[l.date][l.meal_type].push(l) })

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.9rem', fontWeight:700, letterSpacing:'-0.04em', color:'var(--cream)', marginBottom:'1.75rem' }}>Log Karo 🍽️</h1>
      <div style={{ display:'grid', gridTemplateColumns:'400px 1fr', gap:'1.5rem' }}>

        {/* Form */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1.75rem', height:'fit-content' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1rem', fontWeight:600, marginBottom:'1.25rem', color:'var(--cream)' }}>Naya Entry</div>

          <div style={{ marginBottom:'1.1rem' }}>
            <label style={{ fontSize:'0.72rem', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--muted)', display:'block', marginBottom:'0.4rem' }}>Kab Khaya?</label>
            <select style={{ ...inp, cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236A7A6A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 0.9rem center' }}
              value={mealSlot} onChange={e => setMealSlot(e.target.value)} onFocus={onF} onBlur={onB}>
              {MEAL_SLOTS.map(s => <option key={s.value} value={s.value} style={{ background:'var(--bg2)' }}>{s.label} — {s.time}</option>)}
            </select>
          </div>

          <div style={{ marginBottom:'1.25rem' }}>
            <label style={{ fontSize:'0.72rem', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--muted)', display:'block', marginBottom:'0.5rem' }}>Kya Khaya?</label>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {items.map((item, i) => (
                <div key={i} style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                  <input style={inp} type="text" placeholder={i === 0 ? 'e.g. Dal Chawal, Roti...' : 'Aur kuch...'} value={item}
                    onChange={e => updateItem(i, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && i === items.length - 1 && addItem()}
                    onFocus={onF} onBlur={onB} />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} style={{ background:'rgba(240,123,95,0.1)', border:'1px solid rgba(240,123,95,0.3)', borderRadius:'8px', color:'var(--coral)', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={addItem} style={{ background:'var(--bg2)', border:'1px dashed var(--border2)', borderRadius:'8px', color:'var(--muted)', padding:'0.6rem', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--mint)'; e.currentTarget.style.color='var(--mint)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--muted)' }}>
                <span style={{ fontWeight:600, fontSize:'1.1rem' }}>+</span> Aur add karo
              </button>
            </div>
          </div>

          {items.filter(v => v.trim()).length > 0 && (
            <div style={{ background:'var(--bg2)', borderRadius:'8px', padding:'0.65rem 0.9rem', marginBottom:'1rem', fontSize:'0.82rem', color:'var(--muted)', borderLeft:'3px solid var(--mint)' }}>
              <span style={{ color:'var(--mint)', fontWeight:600 }}>{MEAL_SLOTS.find(s => s.value === mealSlot)?.label}</span>
              {' → '}{items.filter(v => v.trim()).join(', ')}
            </div>
          )}

          <button onClick={handleLog} disabled={saving} style={{ width:'100%', background:'var(--mint)', color:'var(--bg)', border:'none', borderRadius:'10px', padding:'0.85rem', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.95rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', transition:'all 0.2s', cursor:'pointer' }}
            onMouseEnter={e => !saving && (e.currentTarget.style.background='#9AE897')}
            onMouseLeave={e => e.currentTarget.style.background='var(--mint)'}>
            {saving ? <Spinner size={16} color="var(--bg)" /> : 'Save ✓'}
          </button>
        </div>

        {/* History */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1.75rem' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1rem', fontWeight:600, marginBottom:'1.25rem', color:'var(--cream)' }}>Purana Log</div>
          {loadingLogs ? <div style={{ display:'flex', justifyContent:'center', padding:'2rem' }}><Spinner /></div> :
           Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem', color:'var(--muted)', fontSize:'0.88rem' }}><div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>📝</div>Koi entry nahi abhi tak.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', overflowY:'auto', maxHeight:520 }}>
              {Object.keys(grouped).sort().reverse().map(date => {
                const d = new Date(date), isToday = date === todayISO()
                return (
                  <div key={date}>
                    <div style={{ fontSize:'0.78rem', fontWeight:600, color:isToday ? 'var(--mint)' : 'var(--muted)', marginBottom:'0.6rem', letterSpacing:'0.05em', textTransform:'uppercase' }}>
                      {isToday ? '📅 Aaj' : d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                      {SLOT_ORDER.map(slot => {
                        if (!grouped[date][slot]) return null
                        return (
                          <div key={slot} style={{ background:'var(--bg2)', borderRadius:'10px', padding:'0.6rem 0.85rem', borderLeft:`3px solid ${MEAL_COLORS[slot]}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem' }}>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:'0.7rem', color:MEAL_COLORS[slot], fontWeight:600, marginBottom:'0.25rem' }}>{MEAL_SLOTS.find(s => s.value === slot)?.label}</div>
                                <div style={{ fontSize:'0.88rem', color:'var(--cream)', lineHeight:1.5 }}>
                                  {grouped[date][slot].map((l, idx) => (
                                    <span key={l.id}>
                                      {l.food_name}
                                      <button onClick={() => deleteLog(l.id)} title="Remove" style={{ background:'none', border:'none', color:'var(--muted)', fontSize:'0.65rem', cursor:'pointer', marginLeft:'0.3rem', padding:'0 0.2rem', borderRadius:'3px', transition:'all 0.15s', verticalAlign:'middle' }}
                                        onMouseEnter={e => { e.currentTarget.style.color='var(--coral)'; e.currentTarget.style.background='rgba(240,123,95,0.1)' }}
                                        onMouseLeave={e => { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.background='none' }}>✕</button>
                                      {idx < grouped[date][slot].length - 1 && <span style={{ color:'var(--muted)', margin:'0 0.3rem' }}>•</span>}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
