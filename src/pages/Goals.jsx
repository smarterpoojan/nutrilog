import { useState, useEffect } from 'react'
import { supabase, todayISO } from '../lib/supabase'
import { toast } from '../components/Toast'
import Spinner from '../components/Spinner'

export default function Goals({ session }) {
  const [goals, setGoals] = useState({ cal_goal:2000,protein_goal:60,carbs_goal:250,fat_goal:65,fiber_goal:30,water_goal:8 })
  const [profile, setProfile] = useState({ full_name:'',weight_kg:'',height_cm:'' })
  const [todayTotals, setTodayTotals] = useState({ cal:0,protein:0,carbs:0,fat:0 })
  const [water, setWater] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const uid = session.user.id
    const today = todayISO()
    const [goalsRes, profileRes, logsRes, waterRes] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id',uid).single(),
      supabase.from('profiles').select('*').eq('id',uid).single(),
      supabase.from('food_logs').select('calories,protein,carbs,fat').eq('user_id',uid).eq('date',today),
      supabase.from('water_logs').select('glasses').eq('user_id',uid).eq('date',today).single(),
    ])
    if (goalsRes.data) setGoals(goalsRes.data)
    if (profileRes.data) setProfile(profileRes.data)
    if (logsRes.data) setTodayTotals({
      cal:logsRes.data.reduce((a,l)=>a+(l.calories||0),0),
      protein:logsRes.data.reduce((a,l)=>a+(parseFloat(l.protein)||0),0),
      carbs:logsRes.data.reduce((a,l)=>a+(parseFloat(l.carbs)||0),0),
      fat:logsRes.data.reduce((a,l)=>a+(parseFloat(l.fat)||0),0),
    })
    if (waterRes.data) setWater(waterRes.data.glasses||0)
    setLoading(false)
  }

  const saveGoals = async () => {
    setSaving(true)
    const uid = session.user.id
    const { data:existing } = await supabase.from('user_goals').select('id').eq('user_id',uid).single()
    const payload = { ...goals, user_id:uid, updated_at:new Date().toISOString() }
    if (existing) await supabase.from('user_goals').update(payload).eq('user_id',uid)
    else await supabase.from('user_goals').insert(payload)
    const profPayload = { id:uid, full_name:profile.full_name, weight_kg:parseFloat(profile.weight_kg)||null, height_cm:parseFloat(profile.height_cm)||null }
    const { data:ep } = await supabase.from('profiles').select('id').eq('id',uid).single()
    if (ep) await supabase.from('profiles').update(profPayload).eq('id',uid)
    else await supabase.from('profiles').insert(profPayload)
    setSaving(false)
    toast('Goals saved! 🎯')
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><Spinner size={32}/></div>

  const card = { background:'var(--card)',border:'1px solid var(--border)',borderRadius:'16px',padding:'1.75rem' }
  const inp = { width:'100%',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'8px',color:'var(--text)',fontSize:'0.9rem',padding:'0.65rem 0.85rem',outline:'none',transition:'border-color 0.2s' }
  const lbl = { fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--muted)',display:'block',marginBottom:'0.35rem' }
  const onF=e=>e.target.style.borderColor='var(--mint)', onB=e=>e.target.style.borderColor='var(--border2)'

  const GOAL_FIELDS = [
    {key:'cal_goal',label:'Daily Calories',unit:'kcal',color:'var(--mint)',cur:todayTotals.cal},
    {key:'protein_goal',label:'Protein',unit:'g',color:'var(--blue)',cur:Math.round(todayTotals.protein)},
    {key:'carbs_goal',label:'Carbohydrates',unit:'g',color:'var(--gold)',cur:Math.round(todayTotals.carbs)},
    {key:'fat_goal',label:'Fat',unit:'g',color:'var(--coral)',cur:Math.round(todayTotals.fat)},
    {key:'fiber_goal',label:'Fiber',unit:'g',color:'var(--purple)',cur:0},
    {key:'water_goal',label:'Water',unit:'glasses',color:'var(--blue)',cur:water},
  ]

  return (
    <div className="fade-in">
      <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1.9rem',fontWeight:700,letterSpacing:'-0.04em',color:'var(--cream)',marginBottom:'1.75rem'}}>Goals 🎯</h1>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>

        {/* Goal Settings */}
        <div style={card}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1rem',fontWeight:600,marginBottom:'1.5rem'}}>Daily Nutrition Goals</div>
          {GOAL_FIELDS.map(f=>(
            <div key={f.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.65rem 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:f.color,flexShrink:0}}/>
                <span style={{fontSize:'0.88rem',color:'var(--cream-dim)'}}>{f.label}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                <input type="number" style={{width:80,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'6px',color:f.color,fontSize:'0.88rem',fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,padding:'0.35rem 0.6rem',textAlign:'right',outline:'none',transition:'border-color 0.2s'}}
                  value={goals[f.key]||''} onChange={e=>setGoals(prev=>({...prev,[f.key]:parseFloat(e.target.value)||0}))}
                  onFocus={e=>e.target.style.borderColor=f.color} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                <span style={{fontSize:'0.75rem',color:'var(--muted)',minWidth:40}}>{f.unit}</span>
              </div>
            </div>
          ))}
          <button onClick={saveGoals} disabled={saving} style={{width:'100%',marginTop:'1.5rem',background:'var(--mint)',color:'var(--bg)',border:'none',borderRadius:'10px',padding:'0.85rem',fontFamily:"'Space Grotesk',sans-serif",fontSize:'0.95rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',transition:'all 0.2s'}}
            onMouseEnter={e=>!saving&&(e.currentTarget.style.background='#9AE897')} onMouseLeave={e=>e.currentTarget.style.background='var(--mint)'}>
            {saving?<Spinner size={16} color="var(--bg)"/>:'Save Goals ✓'}
          </button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          {/* Profile */}
          <div style={card}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1rem',fontWeight:600,marginBottom:'1.25rem'}}>Profile</div>
            <div style={{marginBottom:'0.85rem'}}><label style={lbl}>Name</label><input style={inp} type="text" placeholder="Your name" value={profile.full_name||''} onChange={e=>setProfile(p=>({...p,full_name:e.target.value}))} onFocus={onF} onBlur={onB}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
              <div><label style={lbl}>Weight (kg)</label><input style={inp} type="number" placeholder="70" value={profile.weight_kg||''} onChange={e=>setProfile(p=>({...p,weight_kg:e.target.value}))} onFocus={onF} onBlur={onB}/></div>
              <div><label style={lbl}>Height (cm)</label><input style={inp} type="number" placeholder="175" value={profile.height_cm||''} onChange={e=>setProfile(p=>({...p,height_cm:e.target.value}))} onFocus={onF} onBlur={onB}/></div>
            </div>
          </div>

          {/* Today's Progress */}
          <div style={card}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1rem',fontWeight:600,marginBottom:'1.25rem'}}>Today's Progress</div>
            {GOAL_FIELDS.map(f=>{
              const pct=Math.min(100,goals[f.key]>0?f.cur/goals[f.key]*100:0)
              return (
                <div key={f.key} style={{marginBottom:'0.85rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',marginBottom:'0.3rem'}}>
                    <span style={{color:'var(--cream-dim)'}}>{f.label}</span>
                    <span style={{color:f.color,fontFamily:"'Space Grotesk',sans-serif",fontWeight:600}}>{f.cur} / {goals[f.key]} {f.unit}</span>
                  </div>
                  <div style={{height:6,background:'var(--bg3)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{width:pct+'%',height:'100%',background:f.color,borderRadius:3,transition:'width 1s ease'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
