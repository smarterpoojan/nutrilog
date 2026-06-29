import { useState, useEffect, useRef } from 'react'
import { supabase, todayISO, getNDaysAgo } from '../lib/supabase'
import Spinner from '../components/Spinner'
import { toast } from '../components/Toast'

const MEAL_COLORS = { early_morning:'var(--purple)', breakfast:'var(--gold)', mid_morning:'var(--blue)', lunch:'var(--mint)', evening:'var(--coral)', dinner:'var(--purple)', late_night:'#6B8CAE' }
const MEAL_LABELS = { early_morning:'🌙 Early Morning', breakfast:'🌅 Breakfast', mid_morning:'☕ Mid Morning', lunch:'☀️ Lunch', evening:'🌤️ Evening', dinner:'🌙 Dinner', late_night:'🌃 Late Night' }
const SLOT_ORDER  = ['early_morning','breakfast','mid_morning','lunch','evening','dinner','late_night']
const SLOT_NAMES  = { early_morning:'Early Morning', breakfast:'Breakfast', mid_morning:'Mid Morning', lunch:'Lunch', evening:'Evening Snack', dinner:'Dinner', late_night:'Late Night' }

export default function Dashboard({ session, greeting, onLog }) {
  const [todayLogs, setTodayLogs] = useState([])
  const [weekly, setWeekly]       = useState([])
  const [allLogs, setAllLogs]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [exporting, setExporting] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (!loading) setTimeout(drawBars, 50) }, [loading, weekly])

  const loadAll = async () => {
    const uid = session.user.id
    const [todayRes, weeklyRes, allRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id', uid).eq('date', todayISO()).order('logged_at', { ascending: true }),
      supabase.from('food_logs').select('date,meal_type').eq('user_id', uid).gte('date', getNDaysAgo(6)),
      supabase.from('food_logs').select('date').eq('user_id', uid),
    ])
    if (todayRes.data)  setTodayLogs(todayRes.data)
    if (allRes.data)    setAllLogs(allRes.data)
    const dayMap = {}
    weeklyRes.data?.forEach(r => { dayMap[r.date] = (dayMap[r.date] || 0) + 1 })
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days.push({ key, day: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()], meals: dayMap[key] || 0, isToday: i === 0 })
    }
    setWeekly(days)
    setLoading(false)
  }

  const drawBars = () => {
    const canvas = canvasRef.current
    if (!canvas || !weekly.length) return
    const W = canvas.parentElement?.offsetWidth || 400, H = 130
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    const maxM = Math.max(...weekly.map(d => d.meals), 5)
    const bw = (W - 40) / weekly.length
    weekly.forEach((d, i) => {
      const bh = Math.max(4, (d.meals / maxM) * (H - 30))
      const x = 20 + i * bw + bw * 0.15, bwA = bw * 0.7
      ctx.globalAlpha = d.isToday ? 1 : 0.55
      ctx.fillStyle = d.isToday ? '#7DD87A' : '#4DAA49'
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x, H - 30 - bh, bwA, bh, [4,4,0,0]); else ctx.rect(x, H - 30 - bh, bwA, bh)
      ctx.fill(); ctx.globalAlpha = 1
      ctx.fillStyle = d.isToday ? '#7DD87A' : '#6A7A6A'
      ctx.font = `${d.isToday ? '600' : '400'} 11px Inter`
      ctx.textAlign = 'center'
      ctx.fillText(d.day, x + bwA / 2, H - 10)
      if (d.meals > 0) { ctx.fillStyle = '#A8A098'; ctx.font = '9px Inter'; ctx.fillText(d.meals, x + bwA / 2, H - 30 - bh - 5) }
    })
  }

  // Streak
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const k = d.toISOString().split('T')[0]
    if (allLogs.some(l => l.date === k)) streak++; else if (i > 0) break
  }

  // Group today by slot
  const grouped = {}
  todayLogs.forEach(l => { if (!grouped[l.meal_type]) grouped[l.meal_type] = []; grouped[l.meal_type].push(l.food_name) })

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data } = await supabase.from('food_logs').select('date,meal_type,food_name,logged_at').eq('user_id', session.user.id).order('logged_at', { ascending: true })
      if (!data?.length) { toast('Koi data nahi mila', 'error'); setExporting(false); return }
      const byDate = {}
      data.forEach(l => { if (!byDate[l.date]) byDate[l.date] = {}; if (!byDate[l.date][l.meal_type]) byDate[l.date][l.meal_type] = []; byDate[l.date][l.meal_type].push(l.food_name) })
      const lines = ['# My Food Log — NutriLog Export', `Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, '']
      Object.keys(byDate).sort().forEach(date => {
        const d = new Date(date)
        lines.push(`## ${d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`)
        SLOT_ORDER.forEach(slot => { if (byDate[date][slot]) lines.push(`- ${SLOT_NAMES[slot]}: ${byDate[date][slot].join(', ')}`) })
        lines.push('')
      })
      lines.push('---', `Total days tracked: ${Object.keys(byDate).length}`, `Total meal entries: ${data.length}`)
      const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href = url; a.download = `food-log-${todayISO()}.txt`; a.click(); URL.revokeObjectURL(url)
      toast('Export ho gaya! AI ko de sakte ho 🤖')
    } catch (e) { toast(e.message, 'error') }
    setExporting(false)
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}><Spinner size={32} /></div>

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  const card = { background:'var(--card)', border:'1px solid var(--border)', borderRadius:'14px', padding:'1.1rem 1.25rem' }

  return (
    <div className="fade-in">
      <div style={{ fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--muted)', marginBottom:'0.3rem' }}>{dateStr}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.75rem', flexWrap:'wrap', gap:'0.75rem' }}>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.9rem', fontWeight:700, letterSpacing:'-0.04em', color:'var(--cream)', margin:0 }}>
          Good <span style={{ color:'var(--mint)' }}>{greeting}</span>! 👋
        </h1>
        <button onClick={handleExport} disabled={exporting} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'10px', color:'var(--cream)', padding:'0.55rem 1.1rem', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.85rem', fontWeight:600, display:'flex', alignItems:'center', gap:'0.5rem', transition:'all 0.2s', cursor:'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mint)'; e.currentTarget.style.color = 'var(--mint)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--cream)' }}>
          {exporting ? <Spinner size={14} /> : '📤'} Export for AI
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:"Today's Meals",  value: todayLogs.length, unit:'logged',  color:'var(--mint)' },
          { label:'Streak',         value: streak,           unit:'days',    color:'var(--coral)' },
          { label:'This Week',      value: weekly.reduce((a,d) => a+d.meals, 0), unit:'entries', color:'var(--blue)' },
        ].map(s => (
          <div key={s.label} style={card}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--muted)', marginBottom:'0.4rem' }}>{s.label}</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2.2rem', fontWeight:700, color:s.color, lineHeight:1, letterSpacing:'-0.04em' }}>
              {s.value}<span style={{ fontSize:'0.85rem', fontWeight:400, marginLeft:'0.3rem', color:'var(--muted)' }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Today */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'1.25rem' }}>
        {/* Weekly chart */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.9rem', fontWeight:600 }}>Weekly Meal Frequency</div>
            <div style={{ fontSize:'0.7rem', color:'var(--mint)', background:'rgba(125,216,122,0.1)', padding:'0.2rem 0.6rem', borderRadius:'20px' }}>Last 7 days</div>
          </div>
          <canvas ref={canvasRef} style={{ width:'100%', display:'block' }} />
        </div>

        {/* Today's meals */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.9rem', fontWeight:600 }}>Aaj Ka Khana</div>
            <div style={{ fontSize:'0.7rem', color:'var(--mint)', background:'rgba(125,216,122,0.1)', padding:'0.2rem 0.6rem', borderRadius:'20px' }}>{todayLogs.length} items</div>
          </div>
          {Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem 1rem', color:'var(--muted)' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🍽️</div>
              <div style={{ fontSize:'0.85rem', marginBottom:'0.75rem' }}>Aaj kuch nahi khaya abhi tak!</div>
              <button onClick={onLog} style={{ background:'rgba(125,216,122,0.1)', border:'1px solid var(--mint)', borderRadius:'8px', color:'var(--mint)', padding:'0.45rem 1rem', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>+ Log karo</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', overflowY:'auto', maxHeight:260 }}>
              {SLOT_ORDER.map(slot => {
                if (!grouped[slot]) return null
                return (
                  <div key={slot} style={{ padding:'0.6rem 0.85rem', borderRadius:'10px', background:'var(--bg2)', borderLeft:`3px solid ${MEAL_COLORS[slot]}` }}>
                    <div style={{ fontSize:'0.7rem', fontWeight:600, color:MEAL_COLORS[slot], marginBottom:'0.25rem' }}>{MEAL_LABELS[slot]}</div>
                    <div style={{ fontSize:'0.88rem', color:'var(--cream)', lineHeight:1.5 }}>{grouped[slot].join(' • ')}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI hint */}
      <div style={{ marginTop:'1.25rem', background:'var(--bg2)', border:'1px dashed var(--border2)', borderRadius:'12px', padding:'0.85rem 1.1rem', display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.82rem', color:'var(--muted)' }}>
        <span style={{ fontSize:'1.2rem' }}>🤖</span>
        <span><span style={{ color:'var(--cream)', fontWeight:500 }}>AI se analyze karo: </span>
        "Export for AI" se file download karo → ChatGPT ya Claude ko do → poocho <span style={{ color:'var(--mint)' }}>"Meri diet kaisi hai?"</span></span>
      </div>
    </div>
  )
}
