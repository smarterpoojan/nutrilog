import { useState, useEffect } from 'react'
import { supabase, todayISO } from '../lib/supabase'
import { toast } from '../components/Toast'
import Spinner from '../components/Spinner'

const MEAL_TYPES = [{value:'breakfast',label:'🌅 Breakfast'},{value:'lunch',label:'☀️ Lunch'},{value:'dinner',label:'🌙 Dinner'},{value:'snack',label:'🍎 Snack'}]
const MEAL_BADGE = { breakfast:{bg:'rgba(226,184,106,0.12)',color:'var(--gold)'}, lunch:{bg:'rgba(112,173,219,0.12)',color:'var(--blue)'}, dinner:{bg:'rgba(164,143,212,0.12)',color:'var(--purple)'}, snack:{bg:'rgba(240,123,95,0.12)',color:'var(--coral)'} }

const inp = { width:'100%',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'8px',color:'var(--text)',fontSize:'0.88rem',padding:'0.65rem 0.85rem',outline:'none',transition:'border-color 0.2s' }
const lbl = { fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--muted)',display:'block',marginBottom:'0.35rem' }
const onF = e => e.target.style.borderColor='var(--mint)'
const onB = e => e.target.style.borderColor='var(--border2)'

export default function LogPage({ session, onLogged }) {
  const [type,setType]       = useState('lunch')
  const [food,setFood]       = useState('')
  const [calories,setCal]    = useState('')
  const [protein,setProt]    = useState('')
  const [carbs,setCarbs]     = useState('')
  const [fat,setFat]         = useState('')
  const [serving,setServing] = useState('')
  const [note,setNote]       = useState('')
  const [saving,setSaving]   = useState(false)
  const [logs,setLogs]       = useState([])
  const [loadingLogs,setLL]  = useState(true)

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    setLL(true)
    const { data } = await supabase.from('food_logs').select('*').eq('user_id',session.user.id).order('logged_at',{ascending:false}).limit(30)
    if (data) setLogs(data)
    setLL(false)
  }

  const handleLog = async () => {
    if (!food.trim()) { toast('Food name daalo!','error'); return }
    setSaving(true)
    const { error } = await supabase.from('food_logs').insert({
      user_id:session.user.id, date:todayISO(), meal_type:type,
      food_name:food.trim(), calories:parseInt(calories)||0,
      protein:parseFloat(protein)||0, carbs:parseFloat(carbs)||0,
      fat:parseFloat(fat)||0, serving:serving||'1 serving', note:note||'',
    })
    setSaving(false)
    if (error) { toast(error.message,'error'); return }
    toast(`${food} logged! ✅`)
    setFood(''); setCal(''); setProt(''); setCarbs(''); setFat(''); setServing(''); setNote('')
    loadLogs()
    onLogged?.()
  }

  const deleteLog = async (id) => {
    const { error } = await supabase.from('food_logs').delete().eq('id',id)
    if (error) { toast(error.message,'error'); return }
    toast('Entry deleted','info')
    setLogs(prev => prev.filter(l=>l.id!==id))
    onLogged?.()
  }

  return (
    <div className="fade-in">
      <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1.9rem',fontWeight:700,letterSpacing:'-0.04em',color:'var(--cream)',marginBottom:'1.75rem'}}>Log a Meal 🍽️</h1>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
        {/* Form */}
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'16px',padding:'1.75rem'}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1rem',fontWeight:600,marginBottom:'1.25rem'}}>Add Food Entry</div>
          <div style={{marginBottom:'1rem'}}>
            <label style={lbl}>Meal Type</label>
            <select style={{...inp,cursor:'pointer'}} value={type} onChange={e=>setType(e.target.value)} onFocus={onF} onBlur={onB}>
              {MEAL_TYPES.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={lbl}>Food Name *</label>
            <input style={inp} type="text" placeholder="e.g. Dal Chawal, Poha, Sandwich..." value={food} onChange={e=>setFood(e.target.value)} onFocus={onF} onBlur={onB} onKeyDown={e=>e.key==='Enter'&&handleLog()}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem'}}>
            <div><label style={lbl}>Calories</label><input style={inp} type="number" placeholder="350 kcal" value={calories} onChange={e=>setCal(e.target.value)} onFocus={onF} onBlur={onB}/></div>
            <div><label style={lbl}>Serving</label><input style={inp} type="text" placeholder="1 plate" value={serving} onChange={e=>setServing(e.target.value)} onFocus={onF} onBlur={onB}/></div>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={lbl}>Macros (g)</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem'}}>
              {[['Protein',protein,setProt,'var(--blue)'],['Carbs',carbs,setCarbs,'var(--gold)'],['Fat',fat,setFat,'var(--coral)']].map(([pl,v,sv,col])=>(
                <input key={pl} style={{...inp,textAlign:'center',borderColor:'var(--border)'}} type="number" placeholder={pl} value={v} onChange={e=>sv(e.target.value)} onFocus={e=>e.target.style.borderColor=col} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
              ))}
            </div>
          </div>
          <div style={{marginBottom:'1.25rem'}}>
            <label style={lbl}>Note</label>
            <textarea style={{...inp,resize:'vertical',minHeight:60}} placeholder="Home cooked, restaurant..." value={note} onChange={e=>setNote(e.target.value)} onFocus={onF} onBlur={onB}/>
          </div>
          <button onClick={handleLog} disabled={saving} style={{width:'100%',background:'var(--mint)',color:'var(--bg)',border:'none',borderRadius:'10px',padding:'0.85rem',fontFamily:"'Space Grotesk',sans-serif",fontSize:'0.95rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',transition:'all 0.2s'}}
            onMouseEnter={e=>!saving&&(e.currentTarget.style.background='#9AE897')} onMouseLeave={e=>e.currentTarget.style.background='var(--mint)'}>
            {saving ? <Spinner size={16} color="var(--bg)"/> : 'Save Entry ✓'}
          </button>
        </div>

        {/* Recent Logs */}
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'16px',padding:'1.75rem'}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1rem',fontWeight:600,marginBottom:'1.25rem'}}>Recent Logs</div>
          {loadingLogs ? <div style={{display:'flex',justifyContent:'center',padding:'2rem'}}><Spinner/></div> :
           logs.length===0 ? <div style={{textAlign:'center',padding:'3rem 1rem',color:'var(--muted)',fontSize:'0.88rem'}}><div style={{fontSize:'2.5rem',marginBottom:'0.75rem'}}>📝</div>No entries yet.</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:'0',overflowY:'auto',maxHeight:480}}>
              {logs.map((l,i)=>{
                const bc=MEAL_BADGE[l.meal_type]||{bg:'rgba(255,255,255,0.05)',color:'var(--muted)'}
                return (
                  <div key={l.id} style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',padding:'0.7rem 0',borderBottom:i<logs.length-1?'1px solid var(--border)':'none'}}>
                    <span style={{...bc,fontSize:'0.65rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase',padding:'0.25rem 0.5rem',borderRadius:'20px',flexShrink:0,marginTop:'0.15rem'}}>{l.meal_type}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'0.88rem',fontWeight:500,color:'var(--cream)',marginBottom:'0.15rem'}}>{l.food_name}</div>
                      <div style={{fontSize:'0.72rem',color:'var(--muted)'}}>P:{l.protein}g · C:{l.carbs}g · F:{l.fat}g{l.note?' · '+l.note:''}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'0.9rem',color:'var(--gold)'}}>{l.calories} kcal</div>
                      <div style={{fontSize:'0.68rem',color:'var(--muted)',marginTop:'0.1rem'}}>{l.date}</div>
                      <button onClick={()=>deleteLog(l.id)} style={{background:'none',border:'none',color:'var(--muted)',fontSize:'0.72rem',marginTop:'0.2rem',padding:'0.1rem 0.3rem',borderRadius:'4px',transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.color='var(--coral)';e.currentTarget.style.background='rgba(240,123,95,0.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--muted)';e.currentTarget.style.background='none'}}>✕</button>
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
