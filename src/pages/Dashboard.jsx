import { useState, useEffect, useRef } from 'react'
import { supabase, todayISO, getNDaysAgo } from '../lib/supabase'
import Spinner from '../components/Spinner'

const MEAL_EMOJI = { breakfast:'🌅', lunch:'☀️', dinner:'🌙', snack:'🍎' }
const MEAL_COLOR = { breakfast:'var(--gold)', lunch:'var(--blue)', dinner:'var(--purple)', snack:'var(--coral)' }

function Ring({ size=180, strokeW=11, pct=0, color='var(--mint)', bg='var(--bg3)' }) {
  const r = (size - strokeW*2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - Math.min(1, Math.max(0, pct)) * circ
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', display:'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={strokeW}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.34,1.2,0.64,1)' }}/>
    </svg>
  )
}

function StatCard({ label, value, unit, sub, color, pct }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'14px', padding:'1.1rem 1.25rem' }}>
      <div style={{ fontSize:'0.7rem', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--muted)', marginBottom:'0.5rem' }}>{label}</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'2rem', fontWeight:700, color, lineHeight:1, letterSpacing:'-0.04em' }}>
        {value}<span style={{ fontSize:'0.9rem', fontWeight:400, marginLeft:'0.2rem' }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize:'0.72rem', color:'var(--muted)', marginTop:'0.35rem' }}>{sub}</div>}
      {pct !== undefined && (
        <div style={{ height:3, background:'var(--bg3)', borderRadius:2, marginTop:'0.75rem', overflow:'hidden' }}>
          <div style={{ width:`${Math.min(100,pct)}%`, height:'100%', background:color, borderRadius:2, transition:'width 1s ease' }}/>
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ session, greeting, userName, onLog }) {
  const [logs, setLogs]     = useState([])
  const [goals, setGoals]   = useState({ cal_goal:2000, protein_goal:60, carbs_goal:250, fat_goal:65, water_goal:8 })
  const [water, setWater]   = useState(0)
  const [weekly, setWeekly] = useState([])
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef(null)

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!loading) { setTimeout(drawBars, 50) }
  }, [loading, weekly, goals])

  const loadAll = async () => {
    const uid = session.user.id
    const today = todayISO()
    const weekAgo = getNDaysAgo(6)
    const [logsRes, goalsRes, waterRes, weeklyRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id',uid).eq('date',today).order('logged_at'),
      supabase.from('user_goals').select('*').eq('user_id',uid).single(),
      supabase.from('water_logs').select('glasses').eq('user_id',uid).eq('date',today).single(),
      supabase.from('food_logs').select('date,calories').eq('user_id',uid).gte('date',weekAgo),
    ])
    if (logsRes.data)  setLogs(logsRes.data)
    if (goalsRes.data) setGoals(goalsRes.data)
    if (waterRes.data) setWater(waterRes.data.glasses||0)
    const dayMap = {}
    weeklyRes.data?.forEach(r => { dayMap[r.date]=(dayMap[r.date]||0)+(r.calories||0) })
    const days = []
    for (let i=6; i>=0; i--) {
      const d=new Date(); d.setDate(d.getDate()-i)
      const key=d.toISOString().split('T')[0]
      const dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
      days.push({ key, day:dn, cal:dayMap[key]||0, isToday:i===0 })
    }
    setWeekly(days)
    setLoading(false)
  }

  const drawBars = () => {
    const canvas = canvasRef.current
    if (!canvas || !weekly.length) return
    const W = canvas.parentElement?.offsetWidth||400
    const H = 140
    canvas.width=W; canvas.height=H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,W,H)
    const maxCal = Math.max(...weekly.map(d=>d.cal), goals.cal_goal, 1)
    const bw = (W-40)/weekly.length
    weekly.forEach((d,i) => {
      const bh = Math.max(4, (d.cal/maxCal)*(H-30))
      const x = 20 + i*bw + bw*0.15
      const bwA = bw*0.7
      const color = d.isToday ? '#7DD87A' : d.cal>goals.cal_goal ? '#F07B5F' : '#4DAA49'
      ctx.globalAlpha = d.isToday ? 1 : 0.6
      ctx.fillStyle = color
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x, H-30-bh, bwA, bh, [4,4,0,0])
      else ctx.rect(x, H-30-bh, bwA, bh)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = d.isToday ? '#7DD87A' : '#6A7A6A'
      ctx.font = `${d.isToday?'600':'400'} 11px Inter`
      ctx.textAlign = 'center'
      ctx.fillText(d.day, x+bwA/2, H-10)
      if (d.cal>0) {
        ctx.fillStyle='#A8A098'; ctx.font='9px Inter'
        ctx.fillText(d.cal, x+bwA/2, H-30-bh-5)
      }
    })
    const gy = H-30-(goals.cal_goal/maxCal)*(H-30)
    ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(125,216,122,0.25)'; ctx.lineWidth=1
    ctx.beginPath(); ctx.moveTo(20,gy); ctx.lineTo(W-20,gy); ctx.stroke()
    ctx.setLineDash([])
  }

  const totals = {
    cal:     logs.reduce((a,l)=>a+(l.calories||0),0),
    protein: logs.reduce((a,l)=>a+(parseFloat(l.protein)||0),0),
    carbs:   logs.reduce((a,l)=>a+(parseFloat(l.carbs)||0),0),
    fat:     logs.reduce((a,l)=>a+(parseFloat(l.fat)||0),0),
  }
  const calLeft = Math.max(0, goals.cal_goal - totals.cal)
  const dateStr = new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><Spinner size={32}/></div>

  return (
    <div className="fade-in">
      <div style={{fontSize:'0.75rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--muted)',marginBottom:'0.3rem'}}>{dateStr}</div>
      <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1.9rem',fontWeight:700,letterSpacing:'-0.04em',color:'var(--cream)',marginBottom:'1.75rem'}}>
        Good <span style={{color:'var(--mint)'}}>{greeting}</span>, {userName} 👋
      </h1>

      {/* Hero row */}
      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:'1.25rem',marginBottom:'1.25rem'}}>
        {/* Ring Card */}
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'16px',padding:'1.5rem',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:'0.7rem',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:'1rem',alignSelf:'flex-start'}}>Today's Intake</div>
          <div style={{position:'relative',width:180,height:180,marginBottom:'1rem'}}>
            <Ring size={180} strokeW={11} pct={totals.cal/goals.cal_goal} color="var(--mint)" bg="var(--bg3)"/>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'2rem',fontWeight:700,color:'var(--cream)',lineHeight:1}}>{totals.cal}</div>
              <div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.2rem'}}>of {goals.cal_goal} kcal</div>
            </div>
          </div>
          {[{label:'Protein',val:Math.round(totals.protein),goal:goals.protein_goal,unit:'g',color:'var(--blue)'},
            {label:'Carbs',val:Math.round(totals.carbs),goal:goals.carbs_goal,unit:'g',color:'var(--gold)'},
            {label:'Fat',val:Math.round(totals.fat),goal:goals.fat_goal,unit:'g',color:'var(--coral)'}
          ].map(m=>(
            <div key={m.label} style={{width:'100%',marginBottom:'0.6rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.78rem',marginBottom:'0.25rem'}}>
                <span style={{color:'var(--cream-dim)'}}>{m.label}</span>
                <span style={{color:m.color,fontFamily:"'Space Grotesk',sans-serif",fontWeight:600}}>{m.val}{m.unit} <span style={{color:'var(--muted)',fontWeight:400}}>/ {m.goal}{m.unit}</span></span>
              </div>
              <div style={{height:3,background:'var(--bg3)',borderRadius:2,overflow:'hidden'}}>
                <div style={{width:`${Math.min(100,m.goal>0?m.val/m.goal*100:0)}%`,height:'100%',background:m.color,borderRadius:2,transition:'width 1.2s ease'}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:'1rem'}}>
          <StatCard label="Calories Left" value={calLeft} unit="kcal" sub={`${Math.min(100,Math.round(totals.cal/goals.cal_goal*100))}% consumed`} color="var(--mint)" pct={totals.cal/goals.cal_goal*100}/>
          <StatCard label="Protein" value={Math.round(totals.protein)} unit="g" sub={`${Math.round(totals.protein/Math.max(1,goals.protein_goal)*100)}% of ${goals.protein_goal}g`} color="var(--blue)" pct={totals.protein/Math.max(1,goals.protein_goal)*100}/>
          <StatCard label="Water" value={water} unit={`/ ${goals.water_goal}`} sub="glasses today" color="var(--blue)" pct={water/Math.max(1,goals.water_goal)*100}/>
          <StatCard label="Meals Today" value={logs.length} sub={`${logs.filter(l=>l.meal_type==='breakfast').length} B · ${logs.filter(l=>l.meal_type==='lunch').length} L · ${logs.filter(l=>l.meal_type==='dinner').length} D`} color="var(--purple)" pct={Math.min(100,logs.length/4*100)}/>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'1.25rem'}}>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'16px',padding:'1.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'0.9rem',fontWeight:600}}>Weekly Calories</div>
            <div style={{fontSize:'0.7rem',color:'var(--mint)',background:'rgba(125,216,122,0.1)',padding:'0.2rem 0.6rem',borderRadius:'20px'}}>Last 7 days</div>
          </div>
          <canvas ref={canvasRef} style={{width:'100%',display:'block'}}/>
        </div>
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'16px',padding:'1.5rem',overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'0.9rem',fontWeight:600}}>Today's Meals</div>
            <div style={{fontSize:'0.7rem',color:'var(--mint)',background:'rgba(125,216,122,0.1)',padding:'0.2rem 0.6rem',borderRadius:'20px'}}>{logs.length} logged</div>
          </div>
          {logs.length===0 ? (
            <div style={{textAlign:'center',padding:'2rem 1rem',color:'var(--muted)'}}>
              <div style={{fontSize:'2.5rem',marginBottom:'0.75rem'}}>🍽️</div>
              <div style={{fontSize:'0.85rem'}}>No meals yet today</div>
              <button onClick={onLog} style={{marginTop:'0.75rem',background:'rgba(125,216,122,0.1)',border:'1px solid var(--mint)',borderRadius:'8px',color:'var(--mint)',padding:'0.45rem 1rem',fontSize:'0.82rem',fontWeight:600}}>Log first meal</button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',overflowY:'auto',maxHeight:240}}>
              {logs.map((l,i)=>(
                <div key={l.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.6rem 0',borderBottom:i<logs.length-1?'1px solid var(--border)':'none'}}>
                  <span style={{fontSize:'1.4rem',width:36,textAlign:'center',flexShrink:0}}>{MEAL_EMOJI[l.meal_type]||'🍽️'}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'0.85rem',fontWeight:500,color:'var(--cream)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.food_name}</div>
                    <div style={{fontSize:'0.7rem',color:'var(--muted)',marginTop:'0.1rem'}}>{l.meal_type} · {l.serving}</div>
                  </div>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'0.85rem',fontWeight:600,color:MEAL_COLOR[l.meal_type]||'var(--gold)',flexShrink:0}}>{l.calories} kcal</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
