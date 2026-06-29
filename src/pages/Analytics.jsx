import { useState, useEffect, useRef } from 'react'
import { supabase, todayISO, getNDaysAgo } from '../lib/supabase'
import Spinner from '../components/Spinner'
import { toast } from '../components/Toast'

export default function Analytics({ session }) {
  const [data14, setData14]   = useState([])
  const [todayLogs,setTL]     = useState([])
  const [goals, setGoals]     = useState({ cal_goal:2000, protein_goal:60, carbs_goal:250, fat_goal:65, water_goal:8 })
  const [water, setWater]     = useState(0)
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [bmiW, setBmiW]       = useState('')
  const [bmiH, setBmiH]       = useState('')
  const lineRef = useRef(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (!loading) setTimeout(drawLine, 50) }, [loading, data14, goals])

  const loadAll = async () => {
    const uid = session.user.id
    const today = todayISO()
    const d14 = getNDaysAgo(13)
    const [tlRes, goalsRes, waterRes, allRes, d14Res] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id',uid).eq('date',today),
      supabase.from('user_goals').select('*').eq('user_id',uid).single(),
      supabase.from('water_logs').select('glasses').eq('user_id',uid).eq('date',today).single(),
      supabase.from('food_logs').select('date,calories,logged_at').eq('user_id',uid).order('date',{ascending:true}),
      supabase.from('food_logs').select('date,calories,protein,carbs,fat').eq('user_id',uid).gte('date',d14),
    ])
    if (tlRes.data)    setTodayLogs(tlRes.data)
    if (goalsRes.data) setGoals(goalsRes.data)
    if (waterRes.data) setWater(waterRes.data.glasses||0)
    if (allRes.data)   setAllLogs(allRes.data)
    if (d14Res.data) {
      const map={}
      d14Res.data.forEach(r=>{ map[r.date]=(map[r.date]||{cal:0,protein:0,carbs:0,fat:0}); map[r.date].cal+=r.calories||0; map[r.date].protein+=parseFloat(r.protein)||0; map[r.date].carbs+=parseFloat(r.carbs)||0; map[r.date].fat+=parseFloat(r.fat)||0 })
      const arr=[]
      for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=d.toISOString().split('T')[0]; arr.push({date:k,day:['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()],...(map[k]||{cal:0,protein:0,carbs:0,fat:0}), isToday:i===0}) }
      setData14(arr)
    }
    setLoading(false)
  }

  const [todayLogsState, setTodayLogs] = useState([])
  // override
  useEffect(() => { if (!loading) {} }, [])

  const drawLine = () => {
    const canvas = lineRef.current
    if (!canvas || !data14.length) return
    const W = canvas.parentElement?.offsetWidth||600
    const H = 190
    canvas.width=W; canvas.height=H
    const ctx=canvas.getContext('2d')
    ctx.clearRect(0,0,W,H)
    const vals = data14.map(d=>d.cal)
    const maxV = Math.max(...vals, goals.cal_goal, 1)
    const pad={t:20,r:20,b:30,l:45}
    const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b
    const px=i=>pad.l+(i/(data14.length-1))*cW
    const py=v=>pad.t+(1-v/maxV)*cH

    // Goal line
    ctx.setLineDash([5,5]); ctx.strokeStyle='rgba(125,216,122,0.25)'; ctx.lineWidth=1
    ctx.beginPath(); ctx.moveTo(pad.l,py(goals.cal_goal)); ctx.lineTo(W-pad.r,py(goals.cal_goal)); ctx.stroke()
    ctx.setLineDash([])

    // Area
    const grad=ctx.createLinearGradient(0,pad.t,0,H)
    grad.addColorStop(0,'rgba(125,216,122,0.2)'); grad.addColorStop(1,'rgba(125,216,122,0)')
    ctx.beginPath()
    vals.forEach((v,i)=>{ if(i===0)ctx.moveTo(px(i),py(v)); else ctx.lineTo(px(i),py(v)) })
    ctx.lineTo(px(vals.length-1),pad.t+cH); ctx.lineTo(px(0),pad.t+cH); ctx.closePath()
    ctx.fillStyle=grad; ctx.fill()

    // Line
    ctx.beginPath(); ctx.strokeStyle='#7DD87A'; ctx.lineWidth=2; ctx.lineJoin='round'
    vals.forEach((v,i)=>{ if(i===0)ctx.moveTo(px(i),py(v)); else ctx.lineTo(px(i),py(v)) })
    ctx.stroke()

    // Dots + labels
    data14.forEach((d,i)=>{
      if(d.cal>0){
        ctx.beginPath(); ctx.arc(px(i),py(d.cal),d.isToday?5:3,0,Math.PI*2)
        ctx.fillStyle=d.isToday?'#7DD87A':'#4DAA49'; ctx.fill()
      }
      if(i%2===0||data14.length<=8){
        ctx.fillStyle='#6A7A6A'; ctx.font='9px Inter'; ctx.textAlign='center'
        ctx.fillText(d.day, px(i), H-8)
      }
    })
    ctx.fillStyle='#6A7A6A'; ctx.font='9px Inter'; ctx.textAlign='right'
    ctx.fillText(goals.cal_goal, pad.l-5, py(goals.cal_goal)+4)
  }

  const totals = { cal:todayLogsState.reduce((a,l)=>a+(l.calories||0),0), protein:todayLogsState.reduce((a,l)=>a+(parseFloat(l.protein)||0),0), carbs:todayLogsState.reduce((a,l)=>a+(parseFloat(l.carbs)||0),0), fat:todayLogsState.reduce((a,l)=>a+(parseFloat(l.fat)||0),0) }
  const avgCal = data14.filter(d=>d.cal>0).length>0 ? Math.round(data14.reduce((a,d)=>a+d.cal,0)/Math.max(1,data14.filter(d=>d.cal>0).length)) : 0

  // Streak
  const today = todayISO()
  let streak=0
  for(let i=0;i<365;i++){
    const d=new Date(); d.setDate(d.getDate()-i)
    const k=d.toISOString().split('T')[0]
    if(allLogs.some(l=>l.date===k)) streak++
    else if(i>0) break
  }

  // Health score
  let hscore=0
  const cr=totals.cal/Math.max(1,goals.cal_goal)
  if(cr>=0.8&&cr<=1.1) hscore+=40; else if(cr>=0.5&&cr<=1.3) hscore+=20
  const pr=totals.protein/Math.max(1,goals.protein_goal)
  hscore+=Math.min(30,Math.round(pr*30))
  hscore+=Math.min(30,todayLogsState.length*10)
  const hColor=hscore>=80?'var(--mint)':hscore>=60?'var(--gold)':'var(--coral)'
  const hGrade=hscore>=80?'Excellent! 🌟':hscore>=60?'Good job! 💪':hscore>=40?'Improving 📈':'Log more meals'

  // Heatmap
  const hourCounts=new Array(24).fill(0)
  allLogs.forEach(l=>{ const t=l.logged_at; if(t){ const h=new Date(t).getHours(); if(h>=0&&h<24) hourCounts[h]++ } })
  const maxH=Math.max(...hourCounts,1)

  // BMI
  const bmi=bmiW&&bmiH ? (parseFloat(bmiW)/((parseFloat(bmiH)/100)**2)).toFixed(1) : null
  const bmiCat=bmi?(bmi<18.5?{t:'Underweight',c:'var(--blue)'}:bmi<25?{t:'Normal ✅',c:'var(--mint)'}:bmi<30?{t:'Overweight ⚠️',c:'var(--gold)'}:{t:'Obese',c:'var(--coral)'}):null

  const updateWater = async (g) => {
    const uid=session.user.id; const d=todayISO()
    const { data:existing } = await supabase.from('water_logs').select('id').eq('user_id',uid).eq('date',d).single()
    if(existing) { await supabase.from('water_logs').update({glasses:g}).eq('id',existing.id) }
    else { await supabase.from('water_logs').insert({user_id:uid,date:d,glasses:g}) }
    setWater(g)
    toast(g+' glasses 💧')
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><Spinner size={32}/></div>

  const card = { background:'var(--card)',border:'1px solid var(--border)',borderRadius:'16px',padding:'1.5rem' }
  const cardTitle = { fontFamily:"'Space Grotesk',sans-serif",fontSize:'0.9rem',fontWeight:600,color:'var(--cream)' }
  const badge = (txt) => <span style={{fontSize:'0.7rem',color:'var(--mint)',background:'rgba(125,216,122,0.1)',padding:'0.2rem 0.6rem',borderRadius:'20px'}}>{txt}</span>

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
      <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'1.9rem',fontWeight:700,letterSpacing:'-0.04em',color:'var(--cream)'}}>Analytics 📊</h1>

      {/* Line chart */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={cardTitle}>14-Day Calorie Trend</div>
          {badge('Avg: '+avgCal+' kcal')}
        </div>
        <canvas ref={lineRef} style={{width:'100%',display:'block'}}/>
      </div>

      {/* Row 2 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'}}>
        {/* Macro bars */}
        <div style={card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
            <div style={cardTitle}>Macro Breakdown</div>{badge('Today')}
          </div>
          {[{n:'Calories',v:totals.cal,g:goals.cal_goal,u:'kcal',c:'var(--mint)'},
            {n:'Protein',v:Math.round(totals.protein),g:goals.protein_goal,u:'g',c:'var(--blue)'},
            {n:'Carbs',v:Math.round(totals.carbs),g:goals.carbs_goal,u:'g',c:'var(--gold)'},
            {n:'Fat',v:Math.round(totals.fat),g:goals.fat_goal,u:'g',c:'var(--coral)'}
          ].map(m=>(
            <div key={m.n} style={{marginBottom:'1rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',marginBottom:'0.3rem'}}>
                <span style={{color:'var(--cream-dim)'}}>{m.n}</span>
                <span style={{color:m.c,fontFamily:"'Space Grotesk',sans-serif",fontWeight:600}}>{m.v}{m.u} / {m.g}{m.u}</span>
              </div>
              <div style={{height:6,background:'var(--bg3)',borderRadius:3,overflow:'hidden'}}>
                <div style={{width:`${Math.min(100,m.g>0?m.v/m.g*100:0)}%`,height:'100%',background:m.c,borderRadius:3,transition:'width 1s ease'}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Health Score */}
        <div style={{...card,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}>
          <div style={{...cardTitle,alignSelf:'flex-start',width:'100%'}}>Health Score</div>
          <div style={{position:'relative',width:130,height:130,margin:'0.75rem 0'}}>
            <svg width={130} height={130} style={{transform:'rotate(-90deg)',display:'block'}}>
              <circle cx={65} cy={65} r={52} fill="none" stroke="var(--bg3)" strokeWidth={12}/>
              <circle cx={65} cy={65} r={52} fill="none" stroke={hColor} strokeWidth={12}
                strokeLinecap="round" strokeDasharray={326.7} strokeDashoffset={326.7-(hscore/100)*326.7}
                style={{transition:'stroke-dashoffset 1.2s ease'}}/>
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'2rem',fontWeight:700,color:hColor,lineHeight:1}}>{todayLogsState.length?hscore:'-'}</div>
              {todayLogsState.length>0&&<div style={{fontSize:'0.65rem',color:'var(--muted)',marginTop:'0.2rem'}}>/100</div>}
            </div>
          </div>
          <div style={{fontSize:'0.85rem',fontWeight:600,color:hColor}}>{todayLogsState.length?hGrade:'Log meals first'}</div>
          <div style={{fontSize:'0.72rem',color:'var(--muted)',textAlign:'center',maxWidth:220}}>Based on calorie balance, protein intake & logging streak</div>
        </div>
      </div>

      {/* Heatmap */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <div style={cardTitle}>Eating Pattern — 24h</div>{badge('All time')}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(24,1fr)',gap:'3px'}}>
          {hourCounts.map((c,i)=>{
            const a=c/maxH; const bg=c>0?`rgba(125,216,122,${0.1+a*0.9})`:'var(--bg3)'
            const lbl=(i%12||12)+(i<12?'AM':'PM')
            return <div key={i} title={lbl+': '+c+' meals'} style={{height:30,borderRadius:4,background:bg,transition:'background 0.3s',cursor:'default'}}/>
          })}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.65rem',color:'var(--muted)',marginTop:'0.4rem'}}>
          <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span>
        </div>
      </div>

      {/* Row 3 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1.25rem'}}>
        {/* Streak */}
        <div style={card}>
          <div style={cardTitle}>Logging Streak 🔥</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'3.5rem',fontWeight:700,color:'var(--mint)',lineHeight:1,margin:'0.75rem 0 0.25rem'}}>{streak}</div>
          <div style={{fontSize:'0.8rem',color:'var(--muted)',marginBottom:'1rem'}}>days in a row</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'3px'}}>
            {Array.from({length:28},(_,i)=>{
              const d=new Date(); d.setDate(d.getDate()-(27-i))
              const k=d.toISOString().split('T')[0]
              const has=allLogs.some(l=>l.date===k)
              return <div key={i} title={k} style={{width:10,height:10,borderRadius:'50%',background:has?'var(--mint)':'var(--bg3)',transition:'background 0.3s'}}/>
            })}
          </div>
        </div>

        {/* Water */}
        <div style={card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={cardTitle}>Water Intake 💧</div>{badge('Today')}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',marginBottom:'0.75rem'}}>
            {Array.from({length:goals.water_goal},(_,i)=>(
              <span key={i} onClick={()=>updateWater(i<water?i:i+1)} style={{fontSize:'1.7rem',cursor:'pointer',filter:i<water?'none':'grayscale(0.8) opacity(0.4)',transition:'all 0.2s',userSelect:'none'}} title={i<water?'Remove glass':'Add glass'}>💧</span>
            ))}
          </div>
          <div style={{fontSize:'0.82rem',color:'var(--muted)'}}>{water} of {goals.water_goal} glasses</div>
          <div style={{height:4,background:'var(--bg3)',borderRadius:2,marginTop:'0.75rem',overflow:'hidden'}}>
            <div style={{width:`${Math.min(100,water/Math.max(1,goals.water_goal)*100)}%`,height:'100%',background:'var(--blue)',borderRadius:2,transition:'width 0.5s ease'}}/>
          </div>
        </div>

        {/* BMI */}
        <div style={card}>
          <div style={cardTitle}>BMI Calculator</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginTop:'1rem'}}>
            {[['Weight (kg)',bmiW,setBmiW,'70'],['Height (cm)',bmiH,setBmiH,'175']].map(([pl,v,sv,ph])=>(
              <div key={pl}>
                <label style={{fontSize:'0.68rem',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--muted)',display:'block',marginBottom:'0.3rem'}}>{pl}</label>
                <input style={{width:'100%',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'7px',color:'var(--text)',fontSize:'0.88rem',padding:'0.55rem 0.7rem',outline:'none'}} type="number" placeholder={ph} value={v} onChange={e=>sv(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--mint)'} onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
              </div>
            ))}
          </div>
          {bmi&&bmiCat&&(
            <div style={{background:'var(--bg2)',borderRadius:'10px',padding:'1rem',marginTop:'0.75rem',textAlign:'center'}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'2.5rem',fontWeight:700,color:bmiCat.c,lineHeight:1}}>{bmi}</div>
              <div style={{fontSize:'0.82rem',color:bmiCat.c,marginTop:'0.3rem',fontWeight:500}}>{bmiCat.t}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
