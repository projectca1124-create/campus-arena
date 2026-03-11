'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Users, Bot, Copy, Check, Loader2, Zap, Grid3X3, Gamepad2, Send, UserPlus, Share2, Search } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────
const PRESET_COLORS = ['#6366f1','#f59e0b','#10b981','#e11d48','#0ea5e9','#8b5cf6']
const REACTIONS     = ['👍','🔥','😂','😮']

// ─── Types ────────────────────────────────────────────────────────
interface Me { id:string; firstName:string; lastName:string; profileImage?:string|null; university?:string|null; major?:string|null; academicStanding?:string|null }
interface Classmate { id:string; firstName:string; lastName:string; profileImage?:string|null; major?:string|null; academicStanding?:string|null; year?:string }
interface LBEntry { userId:string; firstName:string; lastName:string; profileImage?:string|null; major?:string|null; academicStanding?:string|null; weeklyScore:number; gamesPlayed:number }
interface RoomPlayer { userId:string; firstName:string; lastName:string; profileImage?:string|null; color:string; major?:string|null; ready?:boolean }
interface ChatMsg { from:string; text:string; color:string; ts:number; profileImage?:string|null }
interface FloatReaction { id:number; emoji:string; x:number }
type GS = { rows:number; cols:number; hLines:number[][]; vLines:number[][]; boxes:number[][]; scores:number[]; turn:number; done:boolean; lastBoxes:number[][]; streaks?:number[]; maxStreak?:number[] }

// ─── Game logic ───────────────────────────────────────────────────
function newGame(size:number, players=2):GS {
  return { rows:size, cols:size, hLines:Array.from({length:size+1},()=>Array(size).fill(0)), vLines:Array.from({length:size},()=>Array(size+1).fill(0)), boxes:Array.from({length:size},()=>Array(size).fill(0)), scores:Array(players).fill(0), turn:1, done:false, lastBoxes:[], streaks:Array(players).fill(0), maxStreak:Array(players).fill(0) }
}
function cloneGS(g:GS):GS { return {...g, hLines:g.hLines.map(r=>[...r]), vLines:g.vLines.map(r=>[...r]), boxes:g.boxes.map(r=>[...r]), scores:[...g.scores], lastBoxes:[], streaks:[...(g.streaks??[])], maxStreak:[...(g.maxStreak??[])] } }
function boxDone(g:GS,r:number,c:number){return g.hLines[r][c]&&g.hLines[r+1][c]&&g.vLines[r][c]&&g.vLines[r][c+1]}
function place(g:GS,type:'h'|'v',r:number,c:number):GS|null {
  const n=cloneGS(g)
  if(type==='h'){if(n.hLines[r][c])return null;n.hLines[r][c]=n.turn}else{if(n.vLines[r][c])return null;n.vLines[r][c]=n.turn}
  let cap=false
  if(type==='h'){
    if(r>0&&!n.boxes[r-1][c]&&boxDone(n,r-1,c)){n.boxes[r-1][c]=n.turn;n.scores[n.turn-1]++;cap=true;n.lastBoxes.push([r-1,c])}
    if(r<n.rows&&!n.boxes[r][c]&&boxDone(n,r,c)){n.boxes[r][c]=n.turn;n.scores[n.turn-1]++;cap=true;n.lastBoxes.push([r,c])}
  }else{
    if(c>0&&!n.boxes[r][c-1]&&boxDone(n,r,c-1)){n.boxes[r][c-1]=n.turn;n.scores[n.turn-1]++;cap=true;n.lastBoxes.push([r,c-1])}
    if(c<n.cols&&!n.boxes[r][c]&&boxDone(n,r,c)){n.boxes[r][c]=n.turn;n.scores[n.turn-1]++;cap=true;n.lastBoxes.push([r,c])}
  }
  if(cap){
    const s=[...(n.streaks??Array(n.scores.length).fill(0))]
    const mx=[...(n.maxStreak??Array(n.scores.length).fill(0))]
    s[n.turn-1]=(s[n.turn-1]||0)+n.lastBoxes.length
    if(s[n.turn-1]>mx[n.turn-1])mx[n.turn-1]=s[n.turn-1]
    n.streaks=s; n.maxStreak=mx
  } else {
    const s=[...(n.streaks??Array(n.scores.length).fill(0))]
    s[n.turn-1]=0; n.streaks=s
    n.turn=(n.turn%n.scores.length)+1
  }
  if(n.scores.reduce((a,b)=>a+b,0)===n.rows*n.cols)n.done=true
  return n
}
function sides(g:GS,r:number,c:number){return(g.hLines[r][c]?1:0)+(g.hLines[r+1][c]?1:0)+(g.vLines[r][c]?1:0)+(g.vLines[r][c+1]?1:0)}
function allMoves(g:GS):Array<['h'|'v',number,number]>{const m:Array<['h'|'v',number,number]>=[];for(let r=0;r<=g.rows;r++)for(let c=0;c<g.cols;c++)if(!g.hLines[r][c])m.push(['h',r,c]);for(let r=0;r<g.rows;r++)for(let c=0;c<=g.cols;c++)if(!g.vLines[r][c])m.push(['v',r,c]);return m}
function botMove(g:GS):['h'|'v',number,number]|null{const mv=allMoves(g);if(!mv.length)return null;for(const m of mv){const n=place(g,m[0],m[1],m[2]);if(n?.lastBoxes.length)return m}const safe=mv.filter(([t,r,c])=>{const adj=t==='h'?[r>0?sides(g,r-1,c):4,r<g.rows?sides(g,r,c):4]:[c>0?sides(g,r,c-1):4,c<g.cols?sides(g,r,c):4];return adj.every(s=>s!==2)});const pool=safe.length?safe:mv;return pool[Math.floor(Math.random()*pool.length)]}

// ─── Global styles ────────────────────────────────────────────────
const G=()=>(<><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/><style>{`
  *{box-sizing:border-box}
  .of{font-family:'Outfit',system-ui,sans-serif!important}
  @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @keyframes pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
  @keyframes scorePop{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-44px) scale(1.5)}}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes dn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
  @keyframes cfll{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(110vh) rotate(720deg)}}
  @keyframes pd{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
  @keyframes floatR{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-90px) scale(1.7)}}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes chatIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
  @keyframes glowRing{0%,100%{box-shadow:0 0 0 3px var(--rc),0 0 16px var(--rc)}50%{box-shadow:0 0 0 5px var(--rc),0 0 28px var(--rc)}}
  @keyframes readyBounce{0%{transform:scale(.85)}100%{transform:scale(1)}}
  ::-webkit-scrollbar{width:0;height:0}
  .hl{transition:background .12s,transform .12s}
  .card-hover{transition:all .22s cubic-bezier(.34,1.56,.64,1)}
  .card-hover:hover{transform:translateY(-4px)}
  .btn-press:active{transform:scale(.96)}
`}</style></>)

// ─── Micro-components ─────────────────────────────────────────────
function Spin({sz=20,color='#6366f1'}:{sz?:number;color?:string}){
  return <Loader2 size={sz} color={color} style={{animation:'sp 1s linear infinite',display:'block',flexShrink:0}}/>
}

function Av({src,name,sz=36,color='#6366f1',ring=false}:{src?:string|null;name:string;sz?:number;color?:string;ring?:boolean}){
  const ini=name.trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const base:React.CSSProperties={width:sz,height:sz,borderRadius:'50%',flexShrink:0,border:`2px solid ${color}70`}
  const ringStyle:React.CSSProperties=ring?{'--rc':color+'99',animation:'glowRing 2s ease infinite',border:`2.5px solid ${color}`} as React.CSSProperties:{}
  if(src)return <img src={src} alt={name} style={{...base,...ringStyle,objectFit:'cover'}}/>
  return <div style={{...base,...ringStyle,background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',color,fontWeight:800,fontSize:sz*.36,fontFamily:"'Outfit',sans-serif"}}>{ini}</div>
}

function MajorBadge({major,color='#6366f1'}:{major?:string|null;color?:string}){
  if(!major)return null
  return <span style={{fontSize:9,fontWeight:700,color,background:`${color}15`,border:`1px solid ${color}30`,padding:'2px 7px',borderRadius:20,flexShrink:0,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{major}</span>
}

function Confetti(){
  const p=Array.from({length:90},(_,i)=>({l:Math.random()*100,d:Math.random()*.9,dur:1.4+Math.random()*1.8,c:['#6366f1','#f59e0b','#10b981','#e11d48','#8b5cf6','#0ea5e9','#f97316','#ec4899'][i%8],rot:Math.random()*360,sz:4+Math.random()*10,circ:Math.random()>.5}))
  return <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,overflow:'hidden'}}>{p.map((x,i)=><div key={i} style={{position:'absolute',top:-16,left:`${x.l}%`,width:x.sz,height:x.circ?x.sz:x.sz*1.8,background:x.c,borderRadius:x.circ?'50%':2,animation:`cfll ${x.dur}s ease-in ${x.d}s forwards`,transform:`rotate(${x.rot}deg)`}}/>)}</div>
}

// ─── Size Picker ──────────────────────────────────────────────────
const SZOPT=[
  {sz:6,  label:'6 × 6',  tag:'Quick',    icon:'⚡', c:'#10b981', glow:'rgba(16,185,129,0.18)',
   hint:"36 boxes total — first to 19 wins. Perfect when you're tight on time. Ends before you blink."},
  {sz:9,  label:'9 × 9',  tag:'Classic',  icon:'⭐', c:'#6366f1', glow:'rgba(99,102,241,0.18)',
   hint:'81 boxes, real strategy kicks in. Chains, traps, sacrifice plays — this is the real game.'},
  {sz:12, label:'12 × 12',tag:'Marathon', icon:'🔥', c:'#f59e0b', glow:'rgba(245,158,11,0.18)',
   hint:'144 boxes of pure calculation. Mid-game collapses happen fast. Only for the patient and ruthless.'},
]
function SizePick({title,sub,onBack,onGo}:{title:string;sub:string;onBack:()=>void;onGo:(sz:number)=>void}){
  const[sel,setSel]=useState(1)
  const[hovered,setHovered]=useState<number|null>(null)
  return(
    <div className="of" style={{height:'100%',display:'flex',flexDirection:'column',background:'#f5f7ff',overflow:'hidden'}}>
      <G/>
      <style>{`
        @keyframes szIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes hintIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .sz-card{transition:all .22s cubic-bezier(.34,1.2,.64,1)!important}
        .sz-card:hover{transform:translateY(-2px)!important}
      `}</style>

      {/* Top bar */}
      <div style={{flexShrink:0,padding:'18px 24px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid #e8eaf6',background:'white'}}>
        <button onClick={onBack} style={{width:36,height:36,borderRadius:10,background:'#f8fafc',border:'1.5px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'}
          onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}>
          <ArrowLeft size={16} color="#374151"/>
        </button>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:'#0f172a',letterSpacing:'-.02em',lineHeight:1.2}}>{title}</div>
          <div style={{fontSize:11,color:'#94a3b8',marginTop:2,fontWeight:500}}>{sub}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'28px 24px'}}>
        <div style={{width:'100%',maxWidth:560}}>

          {/* Section label */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
            <span style={{fontSize:10,fontWeight:800,color:'#94a3b8',letterSpacing:'.12em',textTransform:'uppercase'}}>Choose Grid Size</span>
            <div style={{flex:1,height:'1px',background:'#e2e8f0'}}/>
          </div>

          {/* Cards */}
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:28}}>
            {SZOPT.map((o,i)=>{
              const active=sel===i
              const isHov=hovered===i
              return(
                <button key={o.sz}
                  onClick={()=>setSel(i)}
                  onMouseEnter={()=>setHovered(i)}
                  onMouseLeave={()=>setHovered(null)}
                  className="sz-card btn-press"
                  style={{width:'100%',border:'none',cursor:'pointer',textAlign:'left',padding:0,background:'none',animation:`szIn .3s ease ${i*.06}s both`}}>
                  <div style={{
                    borderRadius:18,
                    background: active ? `linear-gradient(135deg,${o.c}10,${o.c}04)` : 'white',
                    border: `1.5px solid ${active ? o.c+'55' : isHov ? o.c+'25' : '#e8eaf6'}`,
                    boxShadow: active ? `0 6px 24px ${o.glow}` : isHov ? `0 4px 16px ${o.glow}` : '0 1px 4px rgba(0,0,0,.04)',
                    transition:'all .22s cubic-bezier(.34,1.2,.64,1)',
                    position:'relative',overflow:'hidden',
                  }}>
                    {/* Glow bg */}
                    {(active||isHov)&&<div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 15% 50%, ${o.c}07, transparent 65%)`,pointerEvents:'none'}}/>}

                    {/* Main row */}
                    <div style={{display:'flex',alignItems:'center',gap:16,padding:'20px 22px'}}>
                      {/* Icon */}
                      <div style={{
                        width:52,height:52,borderRadius:15,flexShrink:0,
                        background: active ? `${o.c}18` : isHov ? `${o.c}10` : '#f8fafc',
                        border:`1.5px solid ${active?o.c+'35':isHov?o.c+'20':'#e2e8f0'}`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:26,transition:'all .2s',
                        boxShadow: active ? `0 4px 16px ${o.c}28` : 'none',
                      }}>{o.icon}</div>

                      {/* Text */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                          <span style={{fontSize:20,fontWeight:900,color:active?'#0f172a':isHov?'#1e293b':'#374151',letterSpacing:'-.03em',lineHeight:1,transition:'color .15s'}}>{o.label}</span>
                          <span style={{
                            fontSize:9,fontWeight:800,letterSpacing:'.07em',
                            color: active ? o.c : isHov ? o.c+'cc' : '#94a3b8',
                            background: active ? `${o.c}15` : isHov ? `${o.c}10` : '#f1f5f9',
                            border:`1px solid ${active?o.c+'30':isHov?o.c+'20':'#e2e8f0'}`,
                            padding:'2px 8px',borderRadius:20,transition:'all .18s',
                          }}>{o.tag}</span>
                        </div>
                        {/* Hover hint */}
                        <div style={{
                          fontSize:12,color: active ? '#475569' : '#94a3b8',
                          lineHeight:1.5,fontWeight:500,
                          maxHeight: (active||isHov) ? 60 : 0,
                          overflow:'hidden',
                          opacity: (active||isHov) ? 1 : 0,
                          transition:'max-height .25s ease, opacity .2s ease',
                          animation: (active||isHov) ? 'hintIn .22s ease both' : 'none',
                          marginTop: (active||isHov) ? 6 : 0,
                        }}>{o.hint}</div>
                      </div>

                      {/* Radio */}
                      <div style={{
                        width:24,height:24,borderRadius:'50%',flexShrink:0,
                        background: active ? o.c : 'transparent',
                        border:`2px solid ${active?o.c:isHov?o.c+'50':'#d1d5db'}`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        boxShadow: active ? `0 0 12px ${o.c}60` : 'none',
                        transition:'all .2s',
                      }}>
                        {active&&<Check size={12} color="white" strokeWidth={3}/>}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Start button */}
          <button
            onClick={()=>onGo(SZOPT[sel].sz)}
            className="btn-press"
            style={{
              width:'100%',height:56,
              background:`linear-gradient(135deg, #6366f1, #7c3aed)`,
              border:'none',borderRadius:16,cursor:'pointer',
              color:'white',fontSize:15,fontWeight:800,
              fontFamily:"'Outfit',sans-serif",
              boxShadow:`0 8px 32px rgba(99,102,241,.45)`,
              display:'flex',alignItems:'center',justifyContent:'center',gap:9,
              transition:'all .2s',letterSpacing:'-.01em',
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(99,102,241,.55)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 8px 32px rgba(99,102,241,.45)'}}
          >
            <Zap size={17} style={{flexShrink:0}}/> Start Game
          </button>

          <p style={{textAlign:'center',fontSize:11,color:'#94a3b8',marginTop:12,fontWeight:500}}>
            Score saved to campus leaderboard after every game
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Game Board ───────────────────────────────────────────────────
interface BP{label:string;ini:string;color:string;avatar?:string|null;major?:string|null}
interface ScorePop{id:number;x:number;y:number;color:string}

function Board({game,bps,myTurn,onLine,onBack,status,stColor,done,reactions,onReact,chatMsgs,chatInput,setChatInput,sendChat,isMulti,lastBotLine}:{
  game:GS;bps:BP[];myTurn:boolean;onLine:(t:'h'|'v',r:number,c:number)=>void;onBack:()=>void;
  status:string;stColor:string;done:boolean;reactions?:FloatReaction[];onReact?:(e:string)=>void;
  chatMsgs?:ChatMsg[];chatInput?:string;setChatInput?:(v:string)=>void;sendChat?:()=>void;isMulti?:boolean;
  lastBotLine?:{t:'h'|'v';r:number;c:number}|null;
}){
  const[hov,setHov]=useState<{t:'h'|'v';r:number;c:number}|null>(null)
  const[anim,setAnim]=useState<Set<string>>(new Set())
  const[scorePops,setScorePops]=useState<ScorePop[]>([])
  const[popId,setPopId]=useState(0)
  const prev=useRef<GS|null>(null)
  const chatEnd=useRef<HTMLDivElement|null>(null)
  const boardRef=useRef<HTMLDivElement|null>(null)

  useEffect(()=>{
    if(!prev.current){prev.current=game;return}
    const fresh=new Set<string>()
    const newPops:ScorePop[]=[]
    game.boxes.forEach((row,r)=>row.forEach((v,c)=>{
      if(v&&prev.current!.boxes[r][c]!==v){
        fresh.add(`${r}-${c}`)
        const x=DOT/2+c*(CELL+LW)+LW+CELL/2
        const y=DOT/2+r*(CELL+LW)+LW
        newPops.push({id:popId+newPops.length,x,y,color:bps[v-1]?.color??'#6366f1'})
      }
    }))
    if(fresh.size){setAnim(fresh);setTimeout(()=>setAnim(new Set()),600)}
    if(newPops.length){
      setPopId(p=>p+newPops.length)
      setScorePops(p=>[...p,...newPops])
      setTimeout(()=>setScorePops(p=>p.filter(x=>!newPops.find(n=>n.id===x.id))),900)
    }
    prev.current=game
  },[game])

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:'smooth'})},[chatMsgs])

  const sz=game.rows,CELL=sz<=6?76:sz<=9?58:42,DOT=sz<=6?13:sz<=9?11:9,LW=sz<=6?6:sz<=9?5:4
  const total=game.rows*game.cols,filled=game.scores.reduce((a,b)=>a+b,0),pct=filled/total

  return(
    <div className="of" style={{height:'100%',display:'flex',flexDirection:'column',background:'#f5f7ff',overflow:'hidden'}}>
      <G/>
      <style>{`
        @keyframes turnPulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes scoreUp{0%{transform:scale(1.4);opacity:1}100%{transform:scale(1);opacity:1}}
        @keyframes scorePopIn{0%{opacity:0;transform:scale(.7) translateY(8px)}60%{transform:scale(1.15) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes botBlink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes segSlide{from{width:0}to{width:var(--tw)}}
        .player-card{transition:all .3s cubic-bezier(.34,1.2,.64,1)!important}
      `}</style>

      {/* ── Top bar: back + segmented progress bar + status pill ── */}
      <div style={{flexShrink:0,background:'white',borderBottom:'1px solid #e8eaf6',padding:'10px 20px 12px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{width:32,height:32,borderRadius:9,background:'#f8fafc',border:'1.5px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'}
          onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}>
          <ArrowLeft size={14} color="#64748b"/>
        </button>

        {/* Segmented progress bar */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
          <div style={{position:'relative',height:26,background:'#f1f5f9',borderRadius:14,overflow:'hidden',border:'1px solid #e2e8f0',boxShadow:'inset 0 1px 3px rgba(0,0,0,.07)'}}>
            {/* Player segments */}
            {bps.map((p,i)=>{
              const seg=game.scores[i]
              const segPct=(seg/total)*100
              const offsetPct=bps.slice(0,i).reduce((a,_,j)=>(a+(game.scores[j]/total)*100),0)
              if(!seg)return null
              return(
                <div key={i} style={{
                  position:'absolute',top:0,bottom:0,
                  left:`${offsetPct}%`,
                  width:`${segPct}%`,
                  background:p.color,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  transition:'width .7s cubic-bezier(.34,1,.64,1), left .7s cubic-bezier(.34,1,.64,1)',
                  overflow:'hidden',
                  boxShadow:`inset 0 1px 0 rgba(255,255,255,.3)`,
                }}>
                  {seg>=1&&<span style={{fontSize:12,fontWeight:900,color:'#0f172a',letterSpacing:'-.02em',whiteSpace:'nowrap'}}>{seg}</span>}
                </div>
              )
            })}
            {/* Remaining label */}
            {total-filled>0&&(
              <div style={{position:'absolute',top:0,bottom:0,right:0,width:`${((total-filled)/total)*100}%`,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                <span style={{fontSize:12,fontWeight:900,color:'#0f172a',whiteSpace:'nowrap'}}>{total-filled}</span>
              </div>
            )}
            {/* Shimmer */}
            {!done&&<div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,.18) 50%,transparent 100%)',backgroundSize:'200% 100%',animation:'shimmer 2.5s ease infinite',pointerEvents:'none'}}/>}
          </div>

          {/* Legend row */}
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {bps.map((p,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:p.color,flexShrink:0}}/>
                <span style={{fontSize:9,fontWeight:700,color:'#64748b',letterSpacing:'.02em'}}>{p.label} · {game.scores[i]}</span>
              </div>
            ))}
            <div style={{display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#e2e8f0',flexShrink:0}}/>
              <span style={{fontSize:9,fontWeight:700,color:'#94a3b8'}}>{total-filled} left</span>
            </div>
          </div>
        </div>

        {/* Status pill moved to right column beside grid */}
      </div>

      {/* ── Main area: grid + inline player cards ── */}
      <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px 20px',position:'relative'}}>
        {reactions?.map(r=>(
          <div key={r.id} style={{position:'absolute',bottom:20,left:`${r.x}%`,fontSize:30,pointerEvents:'none',animation:'floatR .95s ease forwards',zIndex:50}}>{r.emoji}</div>
        ))}
        {scorePops.map(sp=>(
          <div key={sp.id} style={{position:'absolute',fontSize:22,fontWeight:900,color:sp.color,pointerEvents:'none',animation:'scorePop .85s ease forwards',zIndex:60,left:sp.x,top:sp.y,transform:'translateX(-50%)',textShadow:`0 0 14px ${sp.color}`,lineHeight:1}}>+1</div>
        ))}

        {/* Outer wrapper: [grid] [right col] */}
        <div style={{display:'flex',alignItems:'center',gap:116,flexShrink:0}}>

          {/* Grid */}
          <div ref={boardRef} style={{position:'relative',flexShrink:0}}>
            <div style={{position:'relative',userSelect:'none',width:game.cols*(CELL+LW)+DOT,height:game.rows*(CELL+LW)+DOT}}>
              {game.boxes.map((row,r)=>row.map((val,c)=>{
                if(!val)return null
                const color=bps[val-1]?.color??'#6366f1',pl=bps[val-1]
                const avatarSize=Math.max(CELL*.52,18)
                const ini=(pl?.ini||pl?.label?.slice(0,2)||'?').toUpperCase()
                return <div key={`b${r}${c}`} style={{position:'absolute',left:DOT/2+c*(CELL+LW)+LW,top:DOT/2+r*(CELL+LW)+LW,width:CELL,height:CELL,borderRadius:6,background:`${color}1e`,display:'flex',alignItems:'center',justifyContent:'center',animation:anim.has(`${r}-${c}`)?'pop .45s cubic-bezier(.34,1.56,.64,1) both':'none'}}>
                  {pl?.avatar
                    ?<img src={pl.avatar} alt="" style={{width:avatarSize,height:avatarSize,borderRadius:'50%',objectFit:'cover',opacity:.85,border:`1.5px solid ${color}60`,boxShadow:`0 1px 6px ${color}40`}}/>
                    :<div style={{width:avatarSize,height:avatarSize,borderRadius:'50%',background:`${color}35`,border:`1.5px solid ${color}60`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:avatarSize*.42,fontWeight:900,color,opacity:.9}}>{ini}</div>
                  }
                </div>
              }))}
              {game.hLines.map((row,r)=>row.map((val,c)=>{
                const h=!val&&hov?.t==='h'&&hov.r===r&&hov.c===c,can=!val&&myTurn&&!done
                const isBotNew=lastBotLine?.t==='h'&&lastBotLine.r===r&&lastBotLine.c===c
                const bg=val?(bps[val-1]?.color??'#6366f1'):h?'rgba(99,102,241,.75)':'#c8ccd4'
                return <div key={`hl${r}${c}`} onMouseEnter={()=>can&&setHov({t:'h',r,c})} onMouseLeave={()=>setHov(null)} onClick={()=>can&&onLine('h',r,c)} style={{position:'absolute',left:DOT/2+c*(CELL+LW)+LW,top:DOT/2+r*(CELL+LW)+(DOT-LW)/2-7,width:CELL,height:14+LW,cursor:can?'pointer':'default',zIndex:10,display:'flex',alignItems:'center'}}>
                  <div className="hl" style={{width:'100%',height:LW,borderRadius:LW,background:bg,
                    boxShadow:isBotNew?`0 0 8px 3px ${bps[1]?.color??'#f59e0b'}`:val?`0 0 10px ${bps[val-1]?.color??'#6366f1'}60`:'none',
                    transform:h?'scaleY(2.5)':'scaleY(1)',
                    animation:isBotNew?`botBlink 1.2s ease-in-out 1`:'none',
                    transition:'background .12s, transform .12s',
                  }}/>
                </div>
              }))}
              {game.vLines.map((row,r)=>row.map((val,c)=>{
                const h=!val&&hov?.t==='v'&&hov.r===r&&hov.c===c,can=!val&&myTurn&&!done
                const isBotNew=lastBotLine?.t==='v'&&lastBotLine.r===r&&lastBotLine.c===c
                const bg=val?(bps[val-1]?.color??'#6366f1'):h?'rgba(99,102,241,.75)':'#c8ccd4'
                return <div key={`vl${r}${c}`} onMouseEnter={()=>can&&setHov({t:'v',r,c})} onMouseLeave={()=>setHov(null)} onClick={()=>can&&onLine('v',r,c)} style={{position:'absolute',left:DOT/2+c*(CELL+LW)+(DOT-LW)/2-7,top:DOT/2+r*(CELL+LW)+LW,width:14+LW,height:CELL,cursor:can?'pointer':'default',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div className="hl" style={{width:LW,height:'100%',borderRadius:LW,background:bg,
                    boxShadow:isBotNew?`0 0 8px 3px ${bps[1]?.color??'#f59e0b'}`:val?`0 0 10px ${bps[val-1]?.color??'#6366f1'}60`:'none',
                    transform:h?'scaleX(2.5)':'scaleX(1)',
                    animation:isBotNew?`botBlink 1.2s ease-in-out 1`:'none',
                    transition:'background .12s, transform .12s',
                  }}/>
                </div>
              }))}
              {/* Bold dots */}
              {Array.from({length:game.rows+1},(_,r)=>Array.from({length:game.cols+1},(_,c)=>(
                <div key={`d${r}${c}`} style={{position:'absolute',left:DOT/2+c*(CELL+LW)-DOT/2,top:DOT/2+r*(CELL+LW)-DOT/2,width:DOT,height:DOT,borderRadius:'50%',background:'#64748b',zIndex:20,boxShadow:'0 0 0 1.5px #f5f7ff'}}/>
              )))}
            </div>
          </div>

          {/* Right column: status pill + both player cards stacked */}
          <div style={{display:'flex',flexDirection:'column',gap:10,flexShrink:0,width:200}}>

            {/* Status pill */}
            <div style={{background:'#f1f5f9',border:`1.5px solid ${stColor}40`,borderRadius:14,padding:'8px 14px',textAlign:'center'}}>
              <span style={{fontSize:13,fontWeight:900,color:'#0f172a',whiteSpace:'nowrap'}}>{status}</span>
            </div>

            {/* Both player cards */}
            {bps.map((p,i)=>{
              const active=(game.turn-1)===i&&!done
              const isLeading=game.scores[i]===Math.max(...game.scores)&&game.scores[i]>0
              const shareOfTotal=total>0?Math.round((game.scores[i]/total)*100):0
              return(
                <div key={i} className="player-card" style={{
                  borderRadius:18,padding:'16px 16px',
                  background: active ? `linear-gradient(160deg,${p.color}16,${p.color}06)` : 'white',
                  border:`1.5px solid ${active?p.color+'55':'#e8eaf6'}`,
                  boxShadow: active ? `0 6px 24px ${p.color}22` : '0 1px 4px rgba(0,0,0,.04)',
                  position:'relative',overflow:'hidden',
                }}>
                  {active&&<div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 50% 0%, ${p.color}12, transparent 70%)`,pointerEvents:'none'}}/>}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <div style={{position:'relative',flexShrink:0}}>
                      <Av src={p.avatar} name={p.label} sz={40} color={p.color} ring={active}/>
                      {active&&<div style={{position:'absolute',bottom:-1,right:-1,width:10,height:10,borderRadius:'50%',background:'#22c55e',border:'2px solid white',animation:'turnPulse 1.5s ease infinite'}}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:800,color:active?'#0f172a':'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.label}</div>
                      {p.major&&<div style={{fontSize:10,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:2}}>{p.major}</div>}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:8}}>
                    <span style={{fontSize:42,fontWeight:900,color:active?p.color:'#cbd5e1',letterSpacing:'-.05em',lineHeight:1,transition:'color .3s',fontFamily:"'Outfit',sans-serif"}}>{game.scores[i]}</span>
                    <span style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>pts</span>
                    {shareOfTotal>0&&<span style={{marginLeft:4,fontSize:10,fontWeight:700,color:active?p.color+'aa':'#cbd5e1'}}>({shareOfTotal}%)</span>}
                  </div>
                  <div style={{height:4,background:'#f1f5f9',borderRadius:4,overflow:'hidden',marginBottom:7}}>
                    <div style={{height:'100%',width:`${shareOfTotal}%`,background:p.color,borderRadius:4,transition:'width .7s ease'}}/>
                  </div>
                  {isLeading&&game.scores[i]>0&&(
                    <div style={{display:'inline-flex',alignItems:'center',gap:3,background:`${p.color}14`,border:`1px solid ${p.color}28`,borderRadius:20,padding:'3px 10px'}}>
                      <span style={{fontSize:9,fontWeight:800,color:p.color,letterSpacing:'.06em'}}>LEADING</span>
                    </div>
                  )}
                  {active&&<div style={{height:2,background:`linear-gradient(90deg,${p.color},${p.color}00)`,borderRadius:2,marginTop:8}}/>}
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {isMulti&&(
        <div style={{flexShrink:0,background:'white',borderTop:'1px solid #e8eaf6',padding:'8px 12px 10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            <span style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:'.08em',flexShrink:0}}>REACT</span>
            {REACTIONS.map(e=>(
              <button key={e} onClick={()=>onReact?.(e)} style={{background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:10,width:34,height:28,cursor:'pointer',fontSize:14,transition:'all .15s',fontFamily:"'Outfit',sans-serif"}}
                onMouseEnter={x=>x.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={x=>x.currentTarget.style.background='#f1f5f9'}>{e}</button>
            ))}
          </div>
          {chatMsgs&&chatMsgs.length>0&&(
            <div style={{marginBottom:6}}>
              {chatMsgs.slice(-2).map((m,i)=>(
                <div key={`${m.ts}${i}`} style={{fontSize:11,color:'#64748b',animation:'chatIn .2s ease both',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  <span style={{fontWeight:800,color:m.color,marginRight:4}}>{m.from}:</span>{m.text}
                </div>
              ))}
              <div ref={chatEnd}/>
            </div>
          )}
          <div style={{display:'flex',gap:7,alignItems:'center'}}>
            <input value={chatInput??''} onChange={e=>setChatInput?.(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChat?.()}} placeholder="Quick message…" maxLength={60} style={{flex:1,height:30,borderRadius:9,background:'#f8fafc',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'0 10px',fontFamily:"'Outfit',sans-serif",outline:'none'}}/>
            <button onClick={sendChat} style={{width:30,height:30,borderRadius:9,background:'#6366f1',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Send size={13} color="white"/></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Match Summary ────────────────────────────────────────────────
function MatchSummary({game,bps,myIdx,onAgain,onBack,onShare,showConf,rPlayers}:{
  game:GS;bps:BP[];myIdx:number;onAgain:()=>void;onBack:()=>void;onShare?:()=>void;showConf?:boolean;rPlayers?:RoomPlayer[]
}){
  const scores=game.scores,mx=Math.max(...scores),winnerIdx=scores.indexOf(mx)
  const isDraw=scores.filter(s=>s===mx).length>1,iWon=!isDraw&&winnerIdx===myIdx
  const maxStreak=game.maxStreak??scores.map(()=>0)
  const bestStreakIdx=maxStreak.indexOf(Math.max(...maxStreak))

  return(
    <div className="of" style={{height:'100%',overflowY:'auto',background:'#f5f7ff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 20px',animation:'slideUp .4s ease both'}}>
      <G/>
      {showConf&&<Confetti/>}
      <div style={{width:'100%',maxWidth:440,display:'flex',flexDirection:'column',gap:16}}>

        {/* Hero */}
        <div style={{textAlign:'center',paddingBottom:4}}>
          <div style={{fontSize:44,marginBottom:8,lineHeight:1}}>{iWon?'🎉':isDraw?'🤝':'🎮'}</div>
          <div style={{fontSize:28,fontWeight:900,color:'#0f172a',letterSpacing:'-.04em',marginBottom:4}}>
            {iWon?'You won!':isDraw?"It's a draw!":`${bps[winnerIdx]?.label} wins!`}
          </div>
          <div style={{fontSize:11,color:'#b0b8cc',fontWeight:500}}>Scores saved to campus leaderboard</div>
        </div>

        {/* Score cards */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[...scores.map((s,i)=>({s,i}))].sort((a,b)=>b.s-a.s).map(({s,i},rank)=>{
            const M3=['🥇','🥈','🥉'],p=bps[i]
            const isWinner=rank===0
            return(
              <div key={i} style={{
                display:'flex',alignItems:'center',gap:12,
                background:isWinner?'white':'#fafbff',
                border:`1.5px solid ${isWinner?`${p.color}35`:'#eceef8'}`,
                borderRadius:16,padding:'12px 16px',
                boxShadow:isWinner?`0 4px 20px ${p.color}18`:'none',
                animation:`slideUp .35s ease ${rank*.08}s both`
              }}>
                <span style={{fontSize:18,width:22,flexShrink:0,textAlign:'center'}}>{M3[rank]??`#${rank+1}`}</span>
                <Av src={p.avatar} name={p.label} sz={34} color={p.color}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{p.label}</span>
                    {p.major&&<MajorBadge major={p.major} color={p.color}/>}
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>🔥 streak: {maxStreak[i]}</div>
                </div>
                <div style={{fontSize:28,fontWeight:900,color:isWinner?p.color:'#94a3b8',letterSpacing:'-.04em'}}>{s}</div>
              </div>
            )
          })}
        </div>

        {/* Stats strip */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[
            {icon:'🔥',label:'Best Streak',val:`${Math.max(...maxStreak)} boxes`},
            {icon:'📦',label:'Total Boxes',val:`${game.rows*game.cols}`},
            {icon:'⚡',label:'Grid Size',val:`${game.rows}×${game.cols}`},
          ].map((x,i)=>(
            <div key={i} style={{background:'white',borderRadius:13,padding:'11px 10px',border:'1px solid #eceef8',textAlign:'center'}}>
              <div style={{fontSize:16,marginBottom:4}}>{x.icon}</div>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:2}}>{x.val}</div>
              <div style={{fontSize:9,color:'#b0b8cc',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>{x.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{display:'flex',gap:10}}>
          <button onClick={onAgain} className="btn-press" style={{flex:2,height:48,background:'linear-gradient(135deg,#6366f1,#7c3aed)',border:'none',borderRadius:14,cursor:'pointer',color:'white',fontSize:14,fontWeight:800,fontFamily:"'Outfit',sans-serif",boxShadow:'0 6px 20px rgba(99,102,241,.35)'}}>Play Again</button>
          <button onClick={onBack} className="btn-press" style={{flex:1,height:48,background:'white',border:'1.5px solid #e2e8f0',borderRadius:14,cursor:'pointer',color:'#64748b',fontSize:14,fontWeight:700,fontFamily:"'Outfit',sans-serif"}}>Back</button>
        </div>
        {onShare&&(
          <button onClick={onShare} className="btn-press" style={{width:'100%',height:40,background:'white',border:'1.5px solid #e8eaf6',borderRadius:12,cursor:'pointer',color:'#94a3b8',fontSize:12,fontWeight:700,fontFamily:"'Outfit',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
            <Share2 size={13}/> Share to Campus Talks
          </button>
        )}
        {rPlayers&&rPlayers.length>1&&(
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {rPlayers.slice(1).map((p,i)=>(
              <button key={i} className="btn-press" style={{flex:1,minWidth:100,height:36,background:'white',border:'1.5px solid #e2e8f0',borderRadius:11,cursor:'pointer',color:'#64748b',fontSize:11,fontWeight:700,fontFamily:"'Outfit',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                <UserPlus size={12}/> Add {p.firstName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Hub ──────────────────────────────────────────────────────────
function Hub({me,onArena}:{me:Me;onArena:()=>void}){
  return(
    <div className="of" style={{height:'100%',overflowY:'auto',background:'#f5f7ff',position:'relative'}}>
      <G/>
      <FloatingPixels/>
      <div style={{maxWidth:960,margin:'0 auto',padding:'40px 36px 60px'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:36}}>
          <div style={{width:54,height:54,borderRadius:18,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 6px 20px rgba(99,102,241,.35)'}}><Gamepad2 size={26} color="white"/></div>
          <div>
            <h1 style={{margin:0,fontSize:30,fontWeight:900,color:'#0f172a',letterSpacing:'-.04em',lineHeight:1}}>Campus Games</h1>
            <p style={{margin:'5px 0 0',fontSize:14,color:'#64748b',lineHeight:1.5}}>Play quick, competitive games with your classmates. Challenge friends, climb the leaderboard, and dominate the grid.</p>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <span style={{fontSize:11,fontWeight:800,color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase'}}>Available Now</span>
          <div style={{flex:1,height:1,background:'#e2e8f0'}}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:22}}>
          <div onClick={onArena} className="card-hover" style={{background:'white',borderRadius:24,border:'1.5px solid #e8eaf6',overflow:'hidden',cursor:'pointer',boxShadow:'0 2px 12px rgba(99,102,241,.08)'}}>
            <div style={{background:'linear-gradient(135deg,#eef2ff,#e0e7ff 60%,#ede9fe)',padding:'32px 28px 24px',display:'flex',alignItems:'center',justifyContent:'center',minHeight:170,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(99,102,241,.08)'}}/>
              <svg width="130" height="110" viewBox="0 0 130 110" style={{filter:'drop-shadow(0 4px 12px rgba(99,102,241,.2))'}}>
                {[20,55,90].map(x=>[20,55,90].map(y=>[20,55,90].filter(x2=>x2!==x).map(x2=><line key={`${x}${y}${x2}`} x1={x} y1={y} x2={x2} y2={y} stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>)))}
                {[20,55,90].map(y=>[20,55,90].map(x=>[20,55,90].filter(y2=>y2!==y).map(y2=><line key={`v${x}${y}${y2}`} x1={x} y1={y} x2={x} y2={y2} stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>)))}
                <line x1="20" y1="20" x2="55" y2="20" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"/>
                <line x1="55" y1="20" x2="55" y2="55" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"/>
                <line x1="20" y1="55" x2="55" y2="55" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"/>
                <line x1="20" y1="20" x2="20" y2="55" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"/>
                <rect x="21" y="21" width="33" height="33" rx="4" fill="#6366f1" fillOpacity="0.18"/>
                <text x="37" y="41" textAnchor="middle" fontSize="13" fontWeight="900" fill="#6366f1" fontFamily="system-ui">{`${me.firstName?.[0]??''}${me.lastName?.[0]??''}`}</text>
                {[20,55,90].flatMap(x=>[20,55,90].map(y=><circle key={`d${x}${y}`} cx={x} cy={y} r="5" fill="#6366f1" opacity=".7"/>))}
              </svg>
            </div>
            <div style={{padding:'18px 22px 22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <span style={{fontSize:18,fontWeight:900,color:'#0f172a',letterSpacing:'-.02em'}}>Arena Grid</span>
                  <span style={{fontSize:10,fontWeight:800,color:'#6366f1',background:'#eef2ff',border:'1px solid #c7d2fe',padding:'3px 10px',borderRadius:20}}>Strategy</span>
                </div>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 0 3px rgba(34,197,94,.2)',animation:'pd 2s ease-in-out infinite'}}/>
              </div>
              <p style={{margin:'0 0 16px',fontSize:13,color:'#64748b',lineHeight:1.65}}>Classic dots and boxes, reimagined for your campus.</p>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',gap:6}}>{['1–4 Players','vs Bot'].map(t=><span key={t} style={{fontSize:10,fontWeight:700,color:'#8b5cf6',background:'#f5f3ff',padding:'3px 8px',borderRadius:8}}>{t}</span>)}</div>
                <span style={{fontSize:13,fontWeight:700,color:'#6366f1'}}>Play now →</span>
              </div>
            </div>
          </div>
          <div style={{background:'white',borderRadius:24,border:'2px dashed #e2e8f0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:300,padding:'36px 28px',gap:12}}>
            <div style={{width:56,height:56,borderRadius:18,background:'#f8fafc',border:'1.5px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center'}}><Gamepad2 size={24} color="#cbd5e1"/></div>
            <div style={{fontSize:15,fontWeight:700,color:'#94a3b8',textAlign:'center'}}>More Games Coming Soon</div>
            <div style={{fontSize:12,color:'#cbd5e1',textAlign:'center',lineHeight:1.6}}>Stay tuned for new challenges</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Arena Detail ─────────────────────────────────────────────────
function ArenaDetail({me,onBack,onBot,onFriends}:{me:Me;onBack:()=>void;onBot:()=>void;onFriends:()=>void}){
  const[lb,setLB]=useState<LBEntry[]>([]);const[wl,setWL]=useState('This week');const[loading,setLoad]=useState(false)
  useEffect(()=>{const go=async()=>{setLoad(true);try{const r=await fetch(`/api/games/arena-grid/leaderboard?userId=${me.id}`);if(r.ok){const d=await r.json();setLB(d.leaderboard??[]);if(d.weekStart){const dt=new Date(d.weekStart);setWL(`Week of ${dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`)}}}catch{}setLoad(false)};go()},[me.id])
  return(
    <div className="of" style={{height:'100%',overflowY:'auto',background:'#f5f7ff'}}>
      <G/>
      <div style={{maxWidth:980,margin:'0 auto',padding:'20px 48px 48px'}}>
        <button onClick={onBack} style={{display:'inline-flex',alignItems:'center',gap:7,background:'none',border:'none',cursor:'pointer',color:'#64748b',fontSize:13,fontWeight:600,padding:'0 0 16px',fontFamily:"'Outfit',sans-serif"}}><ArrowLeft size={15}/> Campus Games</button>

        {/* ── Compact hero banner ── */}
        <div style={{background:'linear-gradient(135deg,#5b5ef4,#7c3aed 45%,#c026d3)',borderRadius:22,padding:'22px 32px',marginBottom:16,position:'relative',overflow:'hidden',boxShadow:'0 12px 36px rgba(99,102,241,.28)'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(255,255,255,.10) 1.5px,transparent 1.5px)',backgroundSize:'20px 20px',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,.06)',filter:'blur(30px)',pointerEvents:'none'}}/>
          <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',gap:28,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:240}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.15)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Grid3X3 size={18} color="white"/></div>
                <span style={{fontSize:26,fontWeight:900,color:'white',letterSpacing:'-.04em',lineHeight:1}}>Arena Grid</span>
              </div>
              <p style={{margin:0,fontSize:13,color:'rgba(255,255,255,.80)',lineHeight:1.5}}>Classic dots & boxes — claim the most squares to win.</p>
            </div>
            <div style={{display:'flex',gap:10,flexShrink:0,flexWrap:'wrap'}}>
              <button onClick={onBot} className="btn-press" style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',border:'none',borderRadius:50,padding:'10px 22px',cursor:'pointer',fontSize:13,fontWeight:700,color:'#374151',fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 14px rgba(0,0,0,.16)',transition:'transform .2s,box-shadow .2s'}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.2)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 4px 14px rgba(0,0,0,.16)'}}><Bot size={15} color="#6366f1"/> Play with Bot</button>
              <button onClick={onFriends} className="btn-press" style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.15)',border:'1.5px solid rgba(255,255,255,.35)',borderRadius:50,padding:'10px 22px',cursor:'pointer',fontSize:13,fontWeight:700,color:'white',fontFamily:"'Outfit',sans-serif",backdropFilter:'blur(8px)',transition:'background .2s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}><Users size={15} color="white"/> Play with Friends</button>
            </div>
          </div>
        </div>

        {/* ── How to play — slim single-row strip ── */}
        <div style={{background:'white',borderRadius:16,border:'1.5px solid #e8eaf6',padding:'14px 24px',marginBottom:20,display:'flex',alignItems:'center',gap:0}}>
          {[
            {emoji:'✏️',step:'01',label:'Draw a line',hint:'Click any gap between two dots'},
            {emoji:'⬛',step:'02',label:'Close a box',hint:'All 4 sides = yours, go again'},
            {emoji:'🏆',step:'03',label:'Most boxes wins',hint:'Game ends when the grid is full'},
          ].map((x,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:0,flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flex:1,padding:'0 16px'}}>
                <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#eef2ff,#e0e7ff)',border:'1px solid #c7d2fe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>{x.emoji}</div>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:'#a5b4fc',letterSpacing:'.08em',lineHeight:1,marginBottom:2}}>STEP {x.step}</div>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a',lineHeight:1.2}}>{x.label}</div>
                  <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.3,marginTop:1}}>{x.hint}</div>
                </div>
              </div>
              {i<2&&<div style={{width:1,height:36,background:'#e8eaf6',flexShrink:0}}/>}
            </div>
          ))}
        </div>

        {/* ── Leaderboard ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,#fef9c3,#fde68a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🏆</div>
            <span style={{fontSize:17,fontWeight:800,color:'#0f172a',letterSpacing:'-.02em'}}>Campus Leaderboard</span>
          </div>
          <span style={{fontSize:11,fontWeight:600,color:'#94a3b8',background:'#f1f5f9',padding:'3px 10px',borderRadius:8}}>{wl}</span>
        </div>
        {loading?<div style={{display:'flex',justifyContent:'center',padding:'40px 0'}}><Spin sz={24}/></div>:lb.length===0?(
          <div style={{background:'white',borderRadius:18,border:'1.5px solid #e8eaf6',padding:'40px 24px',textAlign:'center'}}>
            <div style={{fontSize:44,marginBottom:10}}>🏆</div>
            <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:5}}>No scores yet this week</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:18}}>Be the first — play now and claim #1!</div>
            <button onClick={onBot} className="btn-press" style={{background:'linear-gradient(135deg,#6366f1,#7c3aed)',border:'none',borderRadius:12,padding:'10px 24px',cursor:'pointer',color:'white',fontSize:13,fontWeight:700,fontFamily:"'Outfit',sans-serif"}}>Play Now</button>
          </div>
        ):(
          <div style={{background:'white',borderRadius:18,border:'1.5px solid #e8eaf6',overflow:'hidden'}}>
            {lb.map((e,idx)=>{
              const isMe=e.userId===me.id
              const medals=[{emoji:'🥇',bg:'linear-gradient(135deg,#fffbeb,#fef3c7)',nc:'#d97706'},{emoji:'🥈',bg:'linear-gradient(135deg,#f8fafc,#f1f5f9)',nc:'#64748b'},{emoji:'🥉',bg:'linear-gradient(135deg,#fff7ed,#ffedd5)',nc:'#c2410c'}]
              const m=medals[idx]
              return(
                <div key={e.userId} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 16px',background:isMe?'#f5f3ff':(m?m.bg:'transparent'),borderBottom:idx<lb.length-1?'1px solid #f8fafc':'none'}}>
                  <div style={{width:24,textAlign:'center',flexShrink:0}}>{m?<span style={{fontSize:17}}>{m.emoji}</span>:<span style={{fontSize:11,fontWeight:700,color:'#cbd5e1'}}>#{idx+1}</span>}</div>
                  <Av src={e.profileImage} name={`${e.firstName} ${e.lastName}`} sz={32} color={m?m.nc:isMe?'#6366f1':'#94a3b8'}/>
                  <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:2}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.firstName} {e.lastName}</span>
                      {isMe&&<span style={{fontSize:8,fontWeight:800,color:'#6366f1',background:'#e0e7ff',padding:'1px 6px',borderRadius:5,flexShrink:0}}>YOU</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:4,overflow:'hidden'}}>
                      {e.major&&<span style={{fontSize:10,fontWeight:500,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.major}</span>}
                      {e.major&&e.academicStanding&&<span style={{fontSize:10,color:'#d1d5db',flexShrink:0}}>·</span>}
                      {e.academicStanding&&<span style={{fontSize:10,fontWeight:500,color:'#94a3b8',whiteSpace:'nowrap',flexShrink:0}}>{e.academicStanding}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:idx<3?20:15,fontWeight:900,color:m?m.nc:isMe?'#6366f1':'#374151',letterSpacing:'-.03em',lineHeight:1}}>{e.weeklyScore}</div>
                    <div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>Games Played: {e.gamesPlayed}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bot Flow ─────────────────────────────────────────────────────
function BotFlow({me,onBack}:{me:Me;onBack:()=>void}){
  const[phase,setPhase]=useState<'pick'|'play'|'done'>('pick')
  const[gsz,setGsz]=useState(9);const[game,setGame]=useState<GS|null>(null)
  const[thinking,setThink]=useState(false);const[conf,setConf]=useState(false)
  const[reactions,setReactions]=useState<FloatReaction[]>([]);const[reactId,setReactId]=useState(0)
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const[lastBotLine,setLastBotLine]=useState<{t:'h'|'v';r:number;c:number}|null>(null)
  const botLineTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const pendingBotMove=useRef<['h'|'v',number,number]|null>(null)
  const prevGameRef=useRef<GS|null>(null)
  const scorePosted=useRef(false)
  const start=(sz:number)=>{setGsz(sz);setGame(newGame(sz,2));setThink(false);setConf(false);setLastBotLine(null);pendingBotMove.current=null;scorePosted.current=false;setPhase('play')}
  const replay=()=>{setGame(newGame(gsz,2));setThink(false);setConf(false);setLastBotLine(null);pendingBotMove.current=null;scorePosted.current=false;setPhase('play')}
  const finish=useCallback(async(g:GS)=>{
    if(scorePosted.current)return
    scorePosted.current=true
    setPhase('done');if(g.scores[0]>g.scores[1])setConf(true)
    try{await fetch('/api/games/arena-grid/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:me.id,score:g.scores[0],won:g.scores[0]>g.scores[1],gridSize:gsz,mode:'bot',opponentCount:1})})}catch{}
  },[gsz,me.id])
  const onLine=useCallback((t:'h'|'v',r:number,c:number)=>{
    setGame(prev=>{if(!prev||prev.done||prev.turn!==1||thinking)return prev;const n=place(prev,t,r,c);if(!n)return prev;if(n.done){finish(n);return n};if(n.turn===2)setThink(true);return n})
  },[thinking,finish])
  useEffect(()=>{
    if(!game||game.done||game.turn!==2||!thinking)return
    timer.current=setTimeout(()=>{
      const mv=botMove(game)
      if(!mv){setThink(false);return}
      pendingBotMove.current=mv
      setGame(prev=>{
        if(!prev||prev.done||prev.turn!==2){setThink(false);return prev}
        const n=place(prev,mv[0],mv[1],mv[2])
        if(!n){setThink(false);return prev}
        if(n.done){finish(n);return n}
        if(n.turn!==2)setThink(false)
        return n
      })
    },900+Math.random()*600)
    return()=>{if(timer.current)clearTimeout(timer.current)}
  },[game,thinking,finish])
  useEffect(()=>{
    if(!game||!pendingBotMove.current)return
    if(prevGameRef.current===game)return
    prevGameRef.current=game
    const mv=pendingBotMove.current
    pendingBotMove.current=null
    if(botLineTimer.current)clearTimeout(botLineTimer.current)
    setLastBotLine({t:mv[0],r:mv[1],c:mv[2]})
    botLineTimer.current=setTimeout(()=>setLastBotLine(null),1200)
  },[game])
  const handleReact=(e:string)=>{const id=reactId;setReactId(p=>p+1);setReactions(p=>[...p,{id,emoji:e,x:10+Math.random()*80}]);setTimeout(()=>setReactions(p=>p.filter(r=>r.id!==id)),1000)}

  if(phase==='pick')return <SizePick title="vs Bot" sub="Solo game — score posts to campus leaderboard" onBack={onBack} onGo={start}/>
  if(!game)return null
  const ini=`${me.firstName[0]}${me.lastName[0]}`.toUpperCase()
  const bps:BP[]=[{label:'You',ini,color:PRESET_COLORS[0],avatar:me.profileImage,major:me.major},{label:'Bot',ini:'BOT',color:PRESET_COLORS[1],avatar:null,major:'AI Opponent'}]
  const done=phase==='done',won=game.scores[0]>game.scores[1],draw=game.scores[0]===game.scores[1]
  const st=done?(won?'🎉 You win!':draw?'🤝 Draw!':'🤖 Bot wins!'):game.turn===1?'Your turn — click a line':'Bot is thinking…'
  const sc=done?(won?'#22c55e':draw?'#94a3b8':'#f87171'):game.turn===1?'#a78bfa':'#fbbf24'
  if(done)return <MatchSummary game={game} bps={bps} myIdx={0} onAgain={replay} onBack={onBack} showConf={conf} onShare={()=>alert('Share to Campus Talks coming soon!')}/>
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <Board game={game} bps={bps} myTurn={game.turn===1 && !lastBotLine && !thinking} onLine={onLine} onBack={onBack} status={st} stColor={sc} done={false} reactions={reactions} onReact={handleReact} isMulti={false} lastBotLine={lastBotLine}/>
    </div>
  )
}


// ─── Floating Pixels Background ───────────────────────────────────
const ICONS = [
  ['🎮', 4,   6,   64, -15, 0.13, 18, 0],
  ['🏆', 6,   78,  56, 12,  0.12, 22, 1.5],
  ['🎯', 17,  22,  44, -8,  0.11, 20, 0.8],
  ['⚡', 5,   45,  50, 20,  0.14, 16, 2.1],
  ['🎲', 27,  88,  60, -20, 0.12, 24, 0.3],
  ['🥇', 38,  3,   48, 10,  0.11, 19, 1.9],
  ['🕹️', 52,  68,  68, -10, 0.13, 21, 0.6],
  ['⭐', 62,  28,  40, 15,  0.12, 17, 2.4],
  ['🎖️', 72,  82,  52, -18, 0.11, 23, 1.1],
  ['🔥', 80,  11,  44, 5,   0.12, 20, 1.7],
  ['🏅', 88,  52,  56, -12, 0.11, 25, 0.4],
  ['💥', 44,  48,  38, 22,  0.10, 18, 2.8],
  ['🎪', 13,  58,  46, -6,  0.11, 22, 1.3],
  ['⚔️', 66,  93,  54, 18,  0.12, 19, 0.9],
  ['🌟', 92,  33,  46, -14, 0.11, 21, 2.0],
  ['🎰', 34,  17,  50, 8,   0.10, 26, 1.6],
  ['💎', 22,  72,  40, -22, 0.12, 17, 3.0],
  ['🃏', 78,  61,  52, 16,  0.11, 20, 0.7],
  ['🎴', 56,  7,   42, -5,  0.10, 23, 2.2],
  ['🏁', 48,  86,  46, 12,  0.11, 18, 1.4],
] as const

function FloatingPixels(){
  return(
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0}}>
      <style>{`
        @keyframes iconFloat0{0%,100%{transform:translateY(0px) rotate(var(--rot))}50%{transform:translateY(-14px) rotate(var(--rot))}}
        @keyframes iconFloat1{0%,100%{transform:translateY(0px) rotate(var(--rot))}50%{transform:translateY(-10px) rotate(var(--rot))}}
        @keyframes iconFloat2{0%,100%{transform:translateY(0px) rotate(var(--rot))}50%{transform:translateY(-18px) rotate(var(--rot))}}
        @keyframes iconFloat3{0%,100%{transform:translateY(-6px) rotate(var(--rot))}50%{transform:translateY(8px) rotate(var(--rot))}}
        .fp-icon{position:absolute;will-change:transform;filter:saturate(0.55) brightness(0.82)}
      `}</style>
      {ICONS.map(([icon,top,left,size,rot,opacity,dur,delay],i)=>(
        <div key={i} className="fp-icon" style={{
          top:`${top}%`,left:`${left}%`,
          fontSize:size,opacity,
          '--rot':`${rot}deg`,
          animation:`iconFloat${i%4} ${dur}s ease-in-out ${delay}s infinite`,
          lineHeight:1,
        } as React.CSSProperties}>{icon}</div>
      ))}
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(99,102,241,.09) 1.5px,transparent 1.5px)',backgroundSize:'26px 26px'}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 40%,rgba(240,244,255,.6) 100%)'}}/>
    </div>
  )
}

// ─── Friends Flow ─────────────────────────────────────────────────
type FP='setup'|'waiting'|'sizepick'|'play'|'done'

// ─── Inline DM Share Panel ────────────────────────────────────────
function DMSharePanel({me,code,inviteLink,onClose}:{me:Me;code:string;inviteLink:string;onClose:()=>void}){
  const[search,setSearch]=useState('')
  const[classmates,setClassmates]=useState<Classmate[]>([])
  const[loading,setLoading]=useState(false)
  const[sent,setSent]=useState<Set<string>>(new Set())
  const[sending,setSending]=useState<string|null>(null)
  const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null)

  const load=useCallback(async(q:string)=>{
    setLoading(true)
    try{
      const r=await fetch(`/api/classmates?userId=${me.id}&search=${encodeURIComponent(q)}`)
      if(r.ok){const d=await r.json();setClassmates(d.students||[])}
    }catch{}
    setLoading(false)
  },[me.id])

  useEffect(()=>{load('')},[])
  useEffect(()=>{
    if(timerRef.current)clearTimeout(timerRef.current)
    timerRef.current=setTimeout(()=>load(search),300)
    return()=>{if(timerRef.current)clearTimeout(timerRef.current)}
  },[search])

  const sendInvite=async(c:Classmate)=>{
    setSending(c.id)
    try{
      const msg=`Hey! Join my Arena Grid room on Campus Arena 🎮\nRoom Code: ${code}\nJoin here: ${inviteLink}`
      const r=await fetch('/api/dm',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({content:msg,receiverId:c.id,senderId:me.id})})
      if(r.ok)setSent(prev=>new Set([...prev,c.id]))
    }catch{}
    setSending(null)
  }

  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',background:'rgba(15,12,46,.5)',backdropFilter:'blur(6px)'}}>
      <style>{`@keyframes panelUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div style={{width:'100%',maxWidth:520,background:'white',borderRadius:'24px 24px 0 0',maxHeight:'82vh',display:'flex',flexDirection:'column',boxShadow:'0 -16px 48px rgba(0,0,0,.18)',animation:'panelUp .32s cubic-bezier(.34,1.1,.64,1) both'}}>

        <div style={{padding:'14px 20px 0',flexShrink:0}}>
          <div style={{width:40,height:4,borderRadius:4,background:'#e2e8f0',margin:'0 auto 16px'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div>
              <div style={{fontSize:16,fontWeight:900,color:'#0f172a',letterSpacing:'-.02em'}}>Share via DM</div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Send your room code to classmates</div>
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:10,background:'#f8fafc',border:'1.5px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,color:'#64748b',fontWeight:700}}>✕</button>
          </div>
          <div style={{background:'#f0f4ff',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:11,fontWeight:700,color:'#6366f1'}}>Code:</span>
            <span style={{fontSize:22,fontWeight:900,color:'#3730a3',letterSpacing:'.2em',fontFamily:"'Outfit',sans-serif"}}>{code}</span>
            <span style={{fontSize:11,color:'#94a3b8',marginLeft:'auto'}}>tap Send →</span>
          </div>
          <div style={{position:'relative',marginBottom:12}}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="9" cy="9" r="6" stroke="#94a3b8" strokeWidth="2"/><path d="M15 15l3 3" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search classmates…"
              style={{width:'100%',height:40,borderRadius:11,border:'1.5px solid #e8eaf6',background:'#f8fafc',paddingLeft:34,paddingRight:12,fontSize:13,color:'#0f172a',fontFamily:"'Outfit',sans-serif",outline:'none',boxSizing:'border-box'}}/>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'0 20px 24px'}}>
          {loading&&!classmates.length
            ?<div style={{display:'flex',justifyContent:'center',padding:'28px 0'}}><Spin sz={22}/></div>
            :classmates.length===0
              ?<div style={{textAlign:'center',padding:'28px 0',color:'#94a3b8',fontSize:13}}>No classmates found</div>
              :classmates.map(c=>{
                const isSent=sent.has(c.id), isSending=sending===c.id
                const ini=`${c.firstName[0]||''}${c.lastName[0]||''}`.toUpperCase()
                return(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #f8fafc'}}>
                    {c.profileImage
                      ?<img src={c.profileImage} alt="" style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:'1.5px solid #e8eaf6'}}/>
                      :<div style={{width:42,height:42,borderRadius:'50%',background:'#eef2ff',border:'1.5px solid #c7d2fe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#6366f1',flexShrink:0}}>{ini}</div>
                    }
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{c.firstName} {c.lastName}</div>
                      <div style={{display:'flex',alignItems:'center',gap:4,overflow:'hidden'}}>
                        {c.major&&<span style={{fontSize:11,fontWeight:500,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.major}</span>}
                        {c.major&&c.academicStanding&&<span style={{fontSize:11,color:'#d1d5db',flexShrink:0}}>·</span>}
                        {c.academicStanding&&<span style={{fontSize:11,fontWeight:500,color:'#94a3b8',whiteSpace:'nowrap',flexShrink:0}}>{c.academicStanding}</span>}
                      </div>
                    </div>
                    <button onClick={()=>{if(!isSent&&!isSending)sendInvite(c)}} disabled={isSent||isSending}
                      style={{height:34,borderRadius:10,border:'none',padding:'0 14px',
                        background:isSent?'#f0fdf4':isSending?'#f1f5f9':'linear-gradient(135deg,#6366f1,#7c3aed)',
                        color:isSent?'#16a34a':isSending?'#94a3b8':'white',
                        fontSize:12,fontWeight:700,cursor:isSent||isSending?'default':'pointer',
                        display:'flex',alignItems:'center',gap:5,flexShrink:0,
                        fontFamily:"'Outfit',sans-serif",
                        boxShadow:isSent||isSending?'none':'0 3px 10px rgba(99,102,241,.3)',transition:'all .2s'}}>
                      {isSending?<Spin sz={12} color="#94a3b8"/>:isSent?'✓ Sent!':'Send →'}
                    </button>
                  </div>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}


// ─── Room Chat Mini Box ───────────────────────────────────────────
const EMOJI_LIST=['😂','🔥','👍','😮','😭','🎮','💀','🏆','⚡','🥳','😤','🫡','💯','👀','🤝']

function RoomChat({msgs,myId,players,input,setInput,onSend,onClose}:{
  msgs:ChatMsg[];myId:string;players:RoomPlayer[];
  input:string;setInput:(v:string)=>void;onSend:()=>void;onClose:()=>void;
}){
  const[showEmoji,setShowEmoji]=useState(false)
  const bottomRef=useRef<HTMLDivElement|null>(null)
  const[pos,setPos]=useState<{x:number;y:number}|null>(null)
  const dragging=useRef(false)
  const dragOffset=useRef({x:0,y:0})
  const boxRef=useRef<HTMLDivElement|null>(null)

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const fmt=(ts:number)=>new Date(ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})

  const onMouseDown=(e:React.MouseEvent)=>{
    if((e.target as HTMLElement).closest('button')||(e.target as HTMLElement).closest('input'))return
    dragging.current=true
    const rect=boxRef.current!.getBoundingClientRect()
    dragOffset.current={x:e.clientX-rect.left,y:e.clientY-rect.top}
    e.preventDefault()
  }
  useEffect(()=>{
    const onMove=(e:MouseEvent)=>{
      if(!dragging.current)return
      setPos({x:e.clientX-dragOffset.current.x, y:e.clientY-dragOffset.current.y})
    }
    const onUp=()=>{dragging.current=false}
    window.addEventListener('mousemove',onMove)
    window.addEventListener('mouseup',onUp)
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}
  },[])

  const boxStyle:React.CSSProperties = pos
    ? {position:'fixed',left:pos.x,top:pos.y,bottom:'auto',right:'auto'}
    : {position:'fixed',bottom:88,right:20}

  return(
    <div ref={boxRef} style={{
      ...boxStyle,
      width:340,zIndex:300,
      background:'white',borderRadius:18,
      border:'1.5px solid #e8eaf6',
      boxShadow:'0 8px 40px rgba(99,102,241,.18), 0 2px 12px rgba(0,0,0,.08)',
      display:'flex',flexDirection:'column',overflow:'hidden',
      animation:'chatPopUp .22s cubic-bezier(.34,1.2,.64,1) both',
      userSelect:'none',
    }}>
      <style>{`@keyframes chatPopUp{from{opacity:0;transform:scale(.92) translateY(12px)}to{opacity:1;transform:none}}`}</style>

      {/* Header — drag handle, NO player avatars */}
      <div onMouseDown={onMouseDown} style={{
        flexShrink:0,padding:'11px 14px',
        background:'linear-gradient(135deg,#6366f1,#7c3aed)',
        display:'flex',alignItems:'center',gap:8,cursor:'grab',
      }}>
        <span style={{fontSize:14}}>💬</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:800,color:'white',letterSpacing:'-.01em'}}>Room Chat</div>
        </div>
        {/* Online count badge */}
        <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(255,255,255,.18)',borderRadius:10,padding:'3px 9px',marginRight:4}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80'}}/>
          <span style={{fontSize:10,fontWeight:700,color:'white'}}>{players.length}</span>
        </div>
        <button onClick={onClose} style={{width:26,height:26,borderRadius:8,background:'rgba(255,255,255,.2)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white',fontSize:13,fontWeight:700,flexShrink:0}}>✕</button>
      </div>

      {/* Messages */}
      <div style={{height:300,overflowY:'auto',padding:'10px 12px',display:'flex',flexDirection:'column',gap:2,background:'#fafbff'}}>
        {msgs.length===0&&(
          <div style={{textAlign:'center',padding:'50px 0',color:'#94a3b8'}}>
            <div style={{fontSize:24,marginBottom:6}}>👋</div>
            <div style={{fontSize:12,fontWeight:600}}>Say hi to your opponents!</div>
          </div>
        )}
        {msgs.map((m,i)=>{
          // Match sender by color (each player has unique color assigned at room join)
          const myPlayer=players.find(p=>p.userId===myId)
          const isMe=!!myPlayer&&myPlayer.color===m.color
          // Show avatar only on first message of each consecutive group from same sender
          const showAvatar=i===0||msgs[i-1].from!==m.from||msgs[i-1].color!==m.color
          // Use profileImage stored directly on the message (set at send time)
          const avatarNode=m.profileImage
            ?<img src={m.profileImage} alt={m.from} style={{width:30,height:30,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:`2px solid ${m.color}55`,boxShadow:'0 1px 6px rgba(0,0,0,.1)'}}/>
            :<div style={{width:30,height:30,borderRadius:'50%',background:`${m.color}20`,border:`2px solid ${m.color}45`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:m.color,flexShrink:0}}>
                {(m.from||'?')[0].toUpperCase()}
              </div>
          const fmt2=(ts:number)=>new Date(ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})
          return(
            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',gap:1,marginBottom:2}}>
              <div style={{display:'flex',alignItems:'flex-end',gap:7,flexDirection:isMe?'row-reverse':'row'}}>
                {/* WhatsApp-style: avatar on first msg of each group, spacer otherwise */}
                {showAvatar ? avatarNode : <div style={{width:30,flexShrink:0}}/>}
                <div style={{display:'flex',flexDirection:'column',gap:1,alignItems:isMe?'flex-end':'flex-start',maxWidth:210}}>
                  {/* Sender name — only for others, first msg of group */}
                  {showAvatar&&!isMe&&(
                    <div style={{fontSize:9,fontWeight:700,color:m.color,paddingLeft:3,marginBottom:1}}>{m.from}</div>
                  )}
                  <div style={{
                    padding:'7px 12px',
                    borderRadius:isMe?'14px 4px 14px 14px':'4px 14px 14px 14px',
                    background:isMe?'linear-gradient(135deg,#6366f1,#7c3aed)':'white',
                    color:isMe?'white':'#1e293b',fontSize:12,lineHeight:1.55,wordBreak:'break-word',
                    boxShadow:isMe?'0 2px 8px rgba(99,102,241,.28)':'0 1px 4px rgba(0,0,0,.07)',
                    border:isMe?'none':'1px solid #eff1f7',
                  }}>{m.text}</div>
                  <div style={{fontSize:8,color:'#c4c9d4',marginTop:2}}>{fmt2(m.ts)}</div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Emoji tray */}
      {showEmoji&&(
        <div style={{flexShrink:0,padding:'6px 10px',borderTop:'1px solid #f1f5f9',display:'flex',flexWrap:'wrap',gap:3,background:'white'}}>
          {EMOJI_LIST.map(e=>(
            <button key={e} onClick={()=>{setInput(input+e);setShowEmoji(false)}}
              style={{width:30,height:30,borderRadius:7,background:'#f8fafc',border:'1px solid #e2e8f0',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}
              onMouseEnter={x=>x.currentTarget.style.background='#eef2ff'}
              onMouseLeave={x=>x.currentTarget.style.background='#f8fafc'}>{e}</button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{flexShrink:0,padding:'8px 10px',borderTop:'1px solid #f1f5f9',display:'flex',gap:6,alignItems:'center',background:'white'}}>
        <button onClick={()=>setShowEmoji(s=>!s)}
          style={{width:30,height:30,borderRadius:8,background:showEmoji?'#eef2ff':'#f8fafc',border:`1px solid ${showEmoji?'#c7d2fe':'#e2e8f0'}`,cursor:'pointer',fontSize:16,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>😊</button>
        <input
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend();setShowEmoji(false)}}}
          placeholder="Type a message…" maxLength={200} autoFocus
          style={{flex:1,height:32,borderRadius:9,border:'1.5px solid #e8eaf6',background:'#f8fafc',padding:'0 10px',fontSize:12,color:'#0f172a',fontFamily:"'Outfit',sans-serif",outline:'none',userSelect:'text'}}
          onFocus={e=>e.target.style.borderColor='#a5b4fc'}
          onBlur={e=>e.target.style.borderColor='#e8eaf6'}
        />
        <button onClick={()=>{onSend();setShowEmoji(false)}} disabled={!input.trim()}
          style={{width:30,height:30,borderRadius:8,background:input.trim()?'linear-gradient(135deg,#6366f1,#7c3aed)':'#f1f5f9',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
          <Send size={13} color={input.trim()?'white':'#cbd5e1'}/>
        </button>
      </div>
    </div>
  )
}


function FriendsFlow({me,onBack}:{me:Me;onBack:()=>void}){
  const[phase,setPhase]=useState<FP>('setup')
  const[total,setTotal]=useState(2)
  const[isHost,setIsHost]=useState(false)
  const[code,setCode]=useState('')
  const[inviteLink,setInviteLink]=useState('')
  const[creating,setCreating]=useState(false)
  const[copied,setCopied]=useState<'code'|'link'|null>(null)
  const[showDMPanel,setShowDMPanel]=useState(false)
  const[rPlayers,setRP]=useState<RoomPlayer[]>([])
  const[gsz,setGsz]=useState(9)
  const[game,setGame]=useState<GS|null>(null)
  const[myIdx,setMyIdx]=useState(0)
  const[conf,setConf]=useState(false)
  const[reactions,setReactions]=useState<FloatReaction[]>([])
  const[reactId,setReactId]=useState(0)
  const[chatMsgs,setChatMsgs]=useState<ChatMsg[]>([])
  const[chatInput,setChatInput]=useState('')
  const[secondsLeft,setSecondsLeft]=useState(300)
  const[roomExpiresAt,setRoomExpiresAt]=useState<number|null>(null)
  const[joinCode,setJoinCode]=useState('')
  const[joinError,setJoinError]=useState('')
  const[joining,setJoining]=useState(false)
  const[showChat,setShowChat]=useState(false)
  const showChatRef=useRef(false)
  const[unreadChat,setUnreadChat]=useState(0)
  const[lastOpponentLine,setLastOpponentLine]=useState<{t:'h'|'v';r:number;c:number}|null>(null)
  const friendsScorePosted=useRef(false)
  const opponentLineTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const prevGameStateRef=useRef<GS|null>(null)

  const pollRef=useRef<ReturnType<typeof setInterval>|null>(null)
  const countdownRef=useRef<ReturnType<typeof setInterval>|null>(null)
  const ROOM_TTL=5*60*1000

  const saveRoom=(c:string,host:boolean,exp:number,t:number)=>{try{localStorage.setItem('cg_room',JSON.stringify({code:c,host,exp,total:t}))}catch{}}
  const clearRoom=()=>{try{localStorage.removeItem('cg_room')}catch{}}
  const stopPoll=()=>{if(pollRef.current){clearInterval(pollRef.current);pollRef.current=null}}

  const startPoll=useCallback((c:string)=>{
    stopPoll()
    // ── Ably real-time subscription for instant chat + moves ──
    try{
      const{getAblyClient}=require('@/lib/ably-client')
      const ably=getAblyClient(me.id)
      const ch=ably.channels.get(`game-room-${c}`)
      ch.subscribe('chat-message',(msg:any)=>{
        const m=msg.data as ChatMsg
        setChatMsgs(prev=>{
          if(prev.find(x=>x.ts===m.ts&&x.from===m.from))return prev
          return [...prev,m]
        })
        // Auto-open chat for everyone when a message arrives; just clear unread if already open
        if(!showChatRef.current){
          setShowChat(true);showChatRef.current=true;setUnreadChat(0)
        } else {
          setUnreadChat(0)
        }
      })
      ch.subscribe('move-made',(msg:any)=>{
        const{gameState,move,userId:mover}=msg.data
        if(mover===me.id)return
        if(gameState)setGame(gameState)
        if(move){
          if(opponentLineTimer.current)clearTimeout(opponentLineTimer.current)
          setLastOpponentLine(move)
          opponentLineTimer.current=setTimeout(()=>setLastOpponentLine(null),1200)
        }
      })
    }catch(e){console.warn('Ably subscription failed, falling back to poll',e)}
    pollRef.current=setInterval(async()=>{
      try{
        const r=await fetch('/api/games/arena-grid/room',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'get',userId:me.id,code:c})})
        if(!r.ok)return
        const d=await r.json(); const rm=d.room
        setRP(rm.players??[])
        if(rm.chat){
          setChatMsgs(rm.chat)
          setUnreadChat(prev=>showChatRef.current?0:rm.chat.length>0?rm.chat.length-(prev):prev)
        }
        if(rm.lastReaction&&rm.lastReaction.ts>Date.now()-1500){
          setReactId(p=>{const id=p;setReactions(prev=>[...prev,{id,emoji:rm.lastReaction.emoji,x:10+Math.random()*80}]);setTimeout(()=>setReactions(prev=>prev.filter(x=>x.id!==id)),1000);return p+1})
        }
        if(rm.status==='playing'&&rm.gameState){
          const newGs=rm.gameState
          if(prevGameStateRef.current&&newGs&&phase==='play'){
            const prev=prevGameStateRef.current
            let foundLine:{t:'h'|'v';r:number;c:number}|null=null
            outer: for(let r=0;r<=newGs.rows;r++)for(let c=0;c<newGs.cols;c++){
              if((newGs.hLines[r]?.[c]??0)&&!(prev.hLines[r]?.[c]??0)){foundLine={t:'h',r,c};break outer}
            }
            if(!foundLine){
              outer2: for(let r=0;r<newGs.rows;r++)for(let c=0;c<=newGs.cols;c++){
                if((newGs.vLines[r]?.[c]??0)&&!(prev.vLines[r]?.[c]??0)){foundLine={t:'v',r,c};break outer2}
              }
            }
            if(foundLine){
              const lineOwner=foundLine.t==='h'?newGs.hLines[foundLine.r]?.[foundLine.c]:newGs.vLines[foundLine.r]?.[foundLine.c]
              const myPlayerIdx=rm.players.findIndex((p:RoomPlayer)=>p.userId===me.id)
              if(lineOwner&&lineOwner-1!==myPlayerIdx){
                if(opponentLineTimer.current)clearTimeout(opponentLineTimer.current)
                setLastOpponentLine(foundLine)
                opponentLineTimer.current=setTimeout(()=>setLastOpponentLine(null),1200)
              }
            }
          }
          prevGameStateRef.current=newGs
          setGame(newGs);setPhase('play')
          const idx=rm.players.findIndex((p:RoomPlayer)=>p.userId===me.id)
          setMyIdx(idx>=0?idx:0)
        }
      }catch{}
    },2500)
  },[me.id])

  useEffect(()=>()=>{stopPoll();if(countdownRef.current)clearInterval(countdownRef.current)},[])

  useEffect(()=>{
    if(!roomExpiresAt)return
    if(countdownRef.current)clearInterval(countdownRef.current)
    countdownRef.current=setInterval(()=>{
      const s=Math.max(0,Math.floor((roomExpiresAt-Date.now())/1000))
      setSecondsLeft(s)
      if(s===0){clearInterval(countdownRef.current!);stopPoll();clearRoom();setCode('');setRP([]);setPhase('setup')}
    },1000)
    return()=>{if(countdownRef.current)clearInterval(countdownRef.current)}
  },[roomExpiresAt])

  useEffect(()=>{
    try{
      const s=localStorage.getItem('cg_room')
      if(s){
        const{code:c,host,exp,total:t}=JSON.parse(s)
        if(exp>Date.now()){
          setCode(c);setIsHost(host);setTotal(t||2)
          setRoomExpiresAt(exp)
          setSecondsLeft(Math.floor((exp-Date.now())/1000))
          setInviteLink(`${window.location.origin}/home/campus-games?join=${c}`)
          setPhase('waiting');startPoll(c)
        }else clearRoom()
      }
    }catch{clearRoom()}
  },[])

  const createRoom=async()=>{
    setCreating(true)
    try{
      const r=await fetch('/api/games/arena-grid/room',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'create',userId:me.id,gridSize:9,color:PRESET_COLORS[0]})})
      if(r.ok){
        const d=await r.json()
        const exp=Date.now()+ROOM_TTL
        setCode(d.room.code);setIsHost(true);setRP(d.room.players||[])
        const link=`${window.location.origin}/home/campus-games?join=${d.room.code}`
        setInviteLink(link);setRoomExpiresAt(exp);setSecondsLeft(300)
        saveRoom(d.room.code,true,exp,total)
        setPhase('waiting');startPoll(d.room.code)
      }
    }catch{}
    setCreating(false)
  }

  const joinRoom=async(c?:string)=>{
    const rc=(c??joinCode).trim().toUpperCase()
    if(!rc)return
    setJoining(true);setJoinError('')
    try{
      const r=await fetch('/api/games/arena-grid/room',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'join',userId:me.id,code:rc,color:PRESET_COLORS[1]})})
      const d=await r.json()
      if(r.ok){
        setCode(d.room.code);setIsHost(false);setRP(d.room.players||[])
        const link=`${window.location.origin}/home/campus-games?join=${d.room.code}`
        setInviteLink(link);setPhase('waiting');startPoll(d.room.code)
        try{const u=new URL(window.location.href);u.searchParams.delete('join');window.history.replaceState({},'',u.toString())}catch{}
      }else{
        if(d.expired){
          setJoinError('⏰ Room has expired. Ask your friend to create a new one, or create your own.')
        }else{
          setJoinError(d.error||'Room not found. Check your code.')
        }
      }
    }catch{setJoinError('Network error. Please try again.')}
    setJoining(false)
  }

  useEffect(()=>{
    try{
      const p=new URLSearchParams(window.location.search)
      const jc=p.get('join')
      if(jc)joinRoom(jc)
    }catch{}
  },[])

  const launchGame=async(sz:number)=>{
    friendsScorePosted.current=false
    try{
      await fetch('/api/games/arena-grid/room',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'start',userId:me.id,code,gridSize:sz})})
      const g=newGame(sz,rPlayers.length)
      await fetch('/api/games/arena-grid/room',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code,userId:me.id,gameState:g})})
      setGame(g);setMyIdx(0);setConf(false);setPhase('play')
    }catch{}
  }

  const onLine=async(t:'h'|'v',r:number,c:number)=>{
    if(!game||game.done||(game.turn-1)!==myIdx)return
    const n=place(game,t,r,c);if(!n)return
    setGame(n)
    try{await fetch('/api/games/arena-grid/room',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({code,userId:me.id,move:{t,r,c},gameState:n})})}catch{}
    if(n.done){
      const mx=Math.max(...n.scores)
      const won=n.scores[myIdx]===mx&&n.scores.filter(s=>s===mx).length===1
      if(won)setConf(true);setPhase('done')
      // Guard: only post score once per game
      if(!friendsScorePosted.current){
        friendsScorePosted.current=true
        try{await fetch('/api/games/arena-grid/score',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({userId:me.id,score:n.scores[myIdx],won,gridSize:gsz,mode:'friends',opponentCount:rPlayers.length-1})})}catch{}
      }
    }
  }

  const handleReact=async(emoji:string)=>{
    setReactId(p=>{const id=p;setReactions(prev=>[...prev,{id,emoji,x:10+Math.random()*80}]);setTimeout(()=>setReactions(prev=>prev.filter(x=>x.id!==id)),1000);return p+1})
    try{await fetch('/api/games/arena-grid/room',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({code,userId:me.id,reaction:{emoji,ts:Date.now()}})})}catch{}
  }

  const sendChat=async()=>{
    if(!chatInput.trim())return
    const myColor=rPlayers.find(p=>p.userId===me.id)?.color??PRESET_COLORS[0]
    const myPlayer=rPlayers.find(p=>p.userId===me.id)
    const msg:ChatMsg={from:me.firstName,text:chatInput.trim(),color:myColor,ts:Date.now(),profileImage:myPlayer?.profileImage??me.profileImage??null}
    setChatMsgs(p=>[...p,msg]);setChatInput('')
    try{
      const{getAblyClient}=require('@/lib/ably-client')
      const ably=getAblyClient(me.id)
      ably.channels.get(`game-room-${code}`).publish('chat-message',msg).catch(()=>{})
      await fetch('/api/games/arena-grid/room',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code,userId:me.id,chat:msg})})
    }catch{}
  }

  const resetBack=()=>{
    stopPoll();clearRoom()
    if(countdownRef.current)clearInterval(countdownRef.current)
    setPhase('setup');setGame(null);setConf(false);setCode('')
    setRP([]);setJoinCode('');setJoinError('');setChatMsgs([])
    setRoomExpiresAt(null);setSecondsLeft(300);setShowDMPanel(false)
    setShowChat(false);showChatRef.current=false;setUnreadChat(0)
  }

  const copyVal=(v:string,k:'code'|'link')=>{
    navigator.clipboard.writeText(v);setCopied(k);setTimeout(()=>setCopied(null),2000)
  }

  // ── SETUP PHASE ──────────────────────────────────────────────────
  if(phase==='setup') return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#f0f4ff',position:'relative',overflow:'hidden'}}>
      <G/>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 50%}100%{background-position:-200% 50%}}
        .sz-btn{transition:all .22s cubic-bezier(.34,1.4,.64,1)!important;cursor:pointer!important}
        .sz-btn:hover{transform:scale(1.04)!important}
        .create-card{transition:all .25s cubic-bezier(.34,1.2,.64,1)!important}
        .create-card:hover{transform:translateY(-4px)!important;box-shadow:0 20px 48px rgba(99,102,241,.18)!important;cursor:pointer!important}
        .join-btn{transition:all .22s!important}
        .join-btn:hover:not(:disabled){transform:translateY(-2px)!important}
      `}</style>

      <FloatingPixels/>

      <div style={{flexShrink:0,background:'rgba(255,255,255,.88)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(232,234,246,.8)',padding:'14px 22px',display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:2}}>
        <button onClick={onBack} style={{width:38,height:38,borderRadius:12,background:'white',border:'1.5px solid #e8eaf6',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
          <ArrowLeft size={16} color="#64748b"/>
        </button>
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:900,color:'#0f172a',letterSpacing:'-.03em',lineHeight:1}}>Play with Friends</div>
          <div style={{fontSize:11,color:'#94a3b8',marginTop:2,fontWeight:500}}>Invite classmates · Battle for the grid</div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'24px 20px 36px',position:'relative',zIndex:1}}>
        <div style={{maxWidth:500,margin:'0 auto',display:'flex',flexDirection:'column',gap:14}}>

          <div style={{background:'white',borderRadius:22,border:'1.5px solid #f0f0f7',padding:'18px 20px',boxShadow:'0 4px 24px rgba(99,102,241,.06)',animation:'fadeUp .4s ease both'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:14}}>Squad Size</div>
            <div style={{display:'flex',gap:10}}>
              {([{n:2,tag:'Duel',sub:'1v1 classic'},{n:3,tag:'Trio',sub:'3-way chaos'},{n:4,tag:'Squad',sub:'Full mayhem'}] as {n:number;tag:string;sub:string}[]).map(({n,tag,sub})=>(
                <button key={n} className="sz-btn" onClick={()=>setTotal(n)} style={{
                  flex:1,height:74,borderRadius:16,border:`2px solid ${total===n?'#6366f1':'#e8eaf6'}`,
                  background:total===n?'#eef2ff':'white',color:total===n?'#6366f1':'#64748b',
                  boxShadow:total===n?'0 6px 20px rgba(99,102,241,.2),0 0 0 4px rgba(99,102,241,.08)':'none',
                  fontFamily:"'Outfit',sans-serif",display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,
                }}>
                  <div style={{fontSize:24,fontWeight:900}}>{n}</div>
                  <div style={{fontSize:11,fontWeight:700}}>{tag}</div>
                  <div style={{fontSize:9,color:total===n?'rgba(99,102,241,.55)':'#cbd5e1'}}>{sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="create-card" onClick={creating?undefined:createRoom} style={{
            background:'white',borderRadius:22,border:'1.5px solid rgba(99,102,241,.2)',
            padding:'26px 24px',boxShadow:'0 6px 28px rgba(99,102,241,.08)',
            position:'relative',overflow:'hidden',opacity:creating?.6:1,
            animation:'fadeUp .4s .08s ease both',animationFillMode:'forwards',
          }}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#6366f1,#8b5cf6)'}}/>
            {creating&&<div style={{position:'absolute',top:0,left:0,right:0,height:3,backgroundImage:'linear-gradient(90deg,transparent,rgba(255,255,255,.8),transparent)',backgroundSize:'200% 100%',animation:'shimmer 1.2s linear infinite'}}/>}
            <div style={{display:'flex',alignItems:'center',gap:18}}>
              <div style={{width:60,height:60,borderRadius:18,background:'linear-gradient(135deg,#eef2ff,#e0e7ff)',border:'1.5px solid #c7d2fe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,flexShrink:0}}>
                {creating?'⏳':'⚔️'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:17,fontWeight:900,color:'#0f172a',marginBottom:3,letterSpacing:'-.02em'}}>
                  {creating?'Creating Room…':'Create a Room'}
                </div>
                <div style={{fontSize:12,color:'#64748b',lineHeight:1.5,marginBottom:10}}>
                  {creating?'Setting up your game, hold tight…':'Host the game and share your invite code with friends.'}
                </div>
                <div style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:800,color:'#6366f1'}}>
                  {creating?<Spin sz={13} color="#6366f1"/>:null}
                  {creating?'Please wait…':'Be the Host →'}
                </div>
              </div>
            </div>
          </div>

          <div style={{background:'white',borderRadius:22,border:'1.5px solid #f0f0f7',padding:'20px 20px',boxShadow:'0 4px 16px rgba(0,0,0,.04)',animation:'fadeUp .4s .14s ease both',animationFillMode:'forwards',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#f59e0b,#fbbf24)'}}/>
            <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>Have a Code?</div>
            <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:3}}>Join a Room</div>
            <div style={{fontSize:12,color:'#64748b',marginBottom:14,lineHeight:1.5}}>Got an invite link or code from a friend? Enter it below to jump in.</div>
            <div style={{display:'flex',gap:8}}>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,6))}
                onKeyDown={e=>e.key==='Enter'&&joinRoom()} placeholder="XXXXXX" maxLength={6}
                style={{flex:1,height:46,borderRadius:12,border:`2px solid ${joinError?'#ef4444':joinCode.length>0?'#6366f1':'#e8eaf6'}`,background:'#f8fafc',textAlign:'center',fontSize:22,fontWeight:900,color:'#0f172a',letterSpacing:'.2em',fontFamily:"'Outfit',sans-serif",outline:'none',boxSizing:'border-box',transition:'border-color .2s'}}/>
              <button onClick={()=>joinRoom()} disabled={joining||joinCode.length<6} className="join-btn"
                style={{height:46,borderRadius:12,border:'none',padding:'0 22px',
                  background:joinCode.length>=6?'linear-gradient(135deg,#f59e0b,#d97706)':'#f1f5f9',
                  color:joinCode.length>=6?'white':'#94a3b8',fontSize:14,fontWeight:800,
                  cursor:joinCode.length>=6&&!joining?'pointer':'not-allowed',
                  fontFamily:"'Outfit',sans-serif",
                  boxShadow:joinCode.length>=6?'0 4px 14px rgba(245,158,11,.35)':'none',
                  display:'flex',alignItems:'center',gap:6,transition:'all .2s'}}>
                {joining?<Spin sz={14} color="#94a3b8"/>:'Join →'}
              </button>
            </div>
            {joinError&&(
              <div style={{
                marginTop:10,borderRadius:10,padding:'10px 14px',textAlign:'center',
                background: joinError.startsWith('⏰') ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${joinError.startsWith('⏰') ? '#fde68a' : '#fca5a5'}`,
                color: joinError.startsWith('⏰') ? '#92400e' : '#ef4444',
                fontSize:12,fontWeight:600,lineHeight:1.5,
              }}>{joinError}</div>
            )}
          </div>

          <div style={{textAlign:'center',fontSize:12,color:'#94a3b8',fontWeight:500,padding:'4px 0',animation:'fadeUp .4s .2s ease both',animationFillMode:'forwards'}}>
            Scores posted to campus leaderboard after every game
          </div>
        </div>
      </div>
    </div>
  )

  // ── WAITING PHASE ────────────────────────────────────────────────
  if(phase==='waiting'){
    const allJoined=rPlayers.length>=total
    const mm=String(Math.floor(secondsLeft/60)).padStart(2,'0')
    const ss2=String(secondsLeft%60).padStart(2,'0')

    return(
      <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#f0f4ff',position:'relative',overflow:'hidden'}}>
        <G/>
        <style>{`
          @keyframes waitUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
          @keyframes playerIn{from{opacity:0;transform:scale(.93) translateX(-8px)}to{opacity:1;transform:none}}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes dotBlink{0%,100%{opacity:.5;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
        `}</style>

        <FloatingPixels/>

        {showDMPanel&&<DMSharePanel me={me} code={code} inviteLink={inviteLink} onClose={()=>setShowDMPanel(false)}/>}
        {showChat&&<RoomChat msgs={chatMsgs} myId={me.id} players={rPlayers} input={chatInput} setInput={setChatInput} onSend={sendChat} onClose={()=>{setShowChat(false);showChatRef.current=false}}/>}

        <div style={{flexShrink:0,background:'rgba(255,255,255,.9)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(232,234,246,.8)',padding:'14px 22px',display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:2}}>
          <button onClick={resetBack} style={{width:38,height:38,borderRadius:12,background:'white',border:'1.5px solid #e8eaf6',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <ArrowLeft size={16} color="#64748b"/>
          </button>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:900,color:'#0f172a',letterSpacing:'-.03em',lineHeight:1}}>Waiting Room</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Share your code — friends join instantly</div>
          </div>

        </div>

        <div style={{flex:1,overflowY:'auto',padding:'18px 20px 36px',position:'relative',zIndex:1}}>
          <div style={{maxWidth:500,margin:'0 auto',display:'flex',flexDirection:'column',gap:12}}>

            <div style={{background:'white',borderRadius:20,border:'1.5px solid #e0e7ff',padding:'20px 22px',boxShadow:'0 4px 20px rgba(99,102,241,.08)',animation:'waitUp .4s ease both'}}>
              <div style={{fontSize:10,fontWeight:800,color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12}}>Room Code — Share with friends</div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <span style={{fontSize:42,fontWeight:900,color:'#3730a3',letterSpacing:'.18em',fontFamily:"'Outfit',sans-serif",flex:1,lineHeight:1}}>{code}</span>
                <button onClick={()=>copyVal(code,'code')} style={{height:38,borderRadius:10,background:copied==='code'?'#10b981':'#eef2ff',border:`1.5px solid ${copied==='code'?'#10b981':'#c7d2fe'}`,color:copied==='code'?'white':'#6366f1',padding:'0 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,whiteSpace:'nowrap',transition:'all .2s',fontFamily:"'Outfit',sans-serif"}}>
                  {copied==='code'?'✓ Copied!':'Copy Code'}
                </button>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>copyVal(inviteLink,'link')} style={{flex:1,height:40,borderRadius:10,background:copied==='link'?'#10b981':'#f8fafc',border:`1.5px solid ${copied==='link'?'#10b981':'#e2e8f0'}`,color:copied==='link'?'white':'#374151',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all .2s',fontFamily:"'Outfit',sans-serif"}}>
                  {copied==='link'?'✓ Copied!':'🔗 Copy Link'}
                </button>
                <button onClick={()=>setShowDMPanel(true)} style={{flex:1,height:40,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#7c3aed)',border:'none',color:'white',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:'0 4px 14px rgba(99,102,241,.3)',fontFamily:"'Outfit',sans-serif",transition:'all .2s'}}>
                  💬 Share via DM
                </button>
              </div>
            </div>

            <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:14,padding:'10px 16px',display:'flex',alignItems:'center',gap:10,animation:'waitUp .4s .06s ease both',animationFillMode:'forwards'}}>
              <span style={{fontSize:16}}>💡</span>
              <span style={{fontSize:12,color:'#92400e',fontWeight:600,flex:1}}>Room stays open — you can leave and come back!</span>
              <button onClick={()=>{setShowChat(true);showChatRef.current=true;setUnreadChat(0)}} style={{background:'#6366f1',border:'none',borderRadius:9,padding:'6px 13px',color:'white',cursor:'pointer',fontSize:11,fontWeight:800,whiteSpace:'nowrap',fontFamily:"'Outfit',sans-serif",display:'flex',alignItems:'center',gap:5}}>
                💬 Chat
              </button>
            </div>

            <div style={{background:'white',borderRadius:20,border:'1.5px solid #f0f0f7',padding:'16px 18px',boxShadow:'0 4px 20px rgba(0,0,0,.05)',animation:'waitUp .4s .12s ease both',animationFillMode:'forwards'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <span style={{fontSize:11,fontWeight:800,color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase'}}>Players {rPlayers.length}/{total}</span>
                {allJoined&&<span style={{fontSize:11,fontWeight:700,color:'#10b981',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:20,padding:'2px 10px'}}>Everyone&apos;s in ✓</span>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {Array.from({length:total},(_,i)=>{
                  const p=rPlayers[i]
                  const clr=p?.color??PRESET_COLORS[i]
                  const isMe=p?.userId===me.id
                  return p?(
                    <div key={p.userId} style={{display:'flex',alignItems:'center',gap:12,background:`${clr}08`,border:`1.5px solid ${clr}22`,borderRadius:14,padding:'11px 14px',animation:'playerIn .35s ease both'}}>
                      <div style={{width:40,height:40,borderRadius:'50%',background:`linear-gradient(135deg,${clr},${clr}bb)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'white',flexShrink:0,boxShadow:`0 4px 12px ${clr}40`}}>
                        {(p.firstName[0]||'')+(p.lastName[0]||'')}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                          <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{p.firstName} {p.lastName}{isMe?' (You)':''}</span>
                          <span style={{fontSize:9,fontWeight:800,color:clr,background:`${clr}18`,padding:'2px 8px',borderRadius:8}}>{i===0?'Host':`P${i+1}`}</span>
                        </div>
                        {p.major&&<div style={{fontSize:11,color:'#94a3b8',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.major}</div>}
                      </div>
                    </div>
                  ):(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'#f8fafc',border:'1.5px dashed #e2e8f0',borderRadius:14,padding:'11px 14px'}}>
                      <div style={{width:40,height:40,borderRadius:'50%',background:'#f1f5f9',border:'2px dashed #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <div style={{width:14,height:14,border:'2px solid #e2e8f0',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
                      </div>
                      <span style={{fontSize:13,color:'#94a3b8',fontStyle:'italic'}}>Waiting for player {i+1}…</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {isHost?(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <button onClick={()=>setPhase('sizepick')} disabled={!allJoined}
                  style={{width:'100%',height:54,borderRadius:15,border:'none',
                    cursor:allJoined?'pointer':'not-allowed',
                    background:allJoined?'linear-gradient(135deg,#6366f1,#7c3aed)':'#f1f5f9',
                    color:allJoined?'white':'#94a3b8',fontSize:15,fontWeight:800,
                    fontFamily:"'Outfit',sans-serif",
                    boxShadow:allJoined?'0 8px 28px rgba(99,102,241,.35)':'none',
                    transition:'all .3s'}}>
                  {allJoined?`Let's go — Choose Grid Size →`:`Waiting for ${total-rPlayers.length} more…`}
                </button>
                <button onClick={resetBack} style={{width:'100%',height:40,borderRadius:12,border:'1.5px solid #fca5a5',background:'white',color:'#ef4444',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif",transition:'all .2s'}}>
                  Leave Room
                </button>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{background:'white',borderRadius:15,padding:'16px',textAlign:'center',border:'1.5px solid #f0f0f7',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <div style={{width:16,height:16,border:'2px solid #e2e8f0',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin .75s linear infinite'}}/>
                  <span style={{fontSize:13,fontWeight:600,color:'#64748b'}}>Waiting for host to start…</span>
                </div>
                <button onClick={resetBack} style={{width:'100%',height:40,borderRadius:12,border:'1.5px solid #fca5a5',background:'white',color:'#ef4444',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Outfit',sans-serif",transition:'all .2s'}}>
                  Leave Room
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if(phase==='sizepick') return(
    <SizePick
      title="Choose Grid Size"
      sub={`${rPlayers.length} players ready — you're the host`}
      onBack={()=>setPhase('waiting')}
      onGo={sz=>{setGsz(sz);launchGame(sz)}}
    />
  )

  const bpsCurrent:BP[]=rPlayers.map((p,i)=>({
    label:p.userId===me.id?'You':p.firstName,
    ini:`${p.firstName[0]||''}${p.lastName[0]||''}`.toUpperCase(),
    color:p.color??PRESET_COLORS[i],
    avatar:p.profileImage,
    major:p.major,
  }))

  if(phase==='play'&&game&&rPlayers.length){
    const myTurn=(game.turn-1)===myIdx&&!game.done
    const curP=rPlayers[game.turn-1]
    const st=game.done?'Game over!':myTurn?'Your turn — click a line':`${curP?.firstName??'Player'}'s turn…`
    const sc=game.done?'#94a3b8':myTurn?'#a78bfa':'#fbbf24'
    if(game.done) return(
      <MatchSummary game={game} bps={bpsCurrent} myIdx={myIdx}
        onAgain={()=>{setPhase('setup');setGame(null);setConf(false)}}
        onBack={resetBack} showConf={conf} rPlayers={rPlayers}
        onShare={()=>alert('Share to Campus Talks coming soon!')}/>
    )
    return(
      <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <Board game={game} bps={bpsCurrent} myTurn={myTurn} onLine={onLine} onBack={resetBack}
          status={st} stColor={sc} done={false} reactions={reactions}
          onReact={handleReact} chatMsgs={chatMsgs} chatInput={chatInput}
          setChatInput={setChatInput} sendChat={sendChat} isMulti={false}
          lastBotLine={lastOpponentLine}/>
        <button onClick={()=>{const next=!showChat;setShowChat(next);setUnreadChat(0);showChatRef.current=next}} style={{
          position:'fixed',bottom:24,right:24,width:52,height:52,borderRadius:'50%',
          background:'linear-gradient(135deg,#6366f1,#7c3aed)',border:'none',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 6px 24px rgba(99,102,241,.45)',zIndex:150,transition:'transform .2s',
        }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          <span style={{fontSize:22}}>💬</span>
          {unreadChat>0&&<div style={{position:'absolute',top:0,right:0,width:18,height:18,borderRadius:'50%',background:'#ef4444',border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'white'}}>{unreadChat>9?'9+':unreadChat}</div>}
        </button>
        {showChat&&<RoomChat msgs={chatMsgs} myId={me.id} players={rPlayers} input={chatInput} setInput={setChatInput} onSend={sendChat} onClose={()=>{setShowChat(false);showChatRef.current=false}}/>}
      </div>
    )
  }

  if(phase==='done'&&game&&rPlayers.length) return(
    <div style={{height:'100%',position:'relative'}}>
      <MatchSummary game={game} bps={bpsCurrent} myIdx={myIdx}
        onAgain={()=>{setPhase('setup');setGame(null);setConf(false)}}
        onBack={resetBack} showConf={conf} rPlayers={rPlayers}
        onShare={()=>alert('Share to Campus Talks coming soon!')}/>
      <button onClick={()=>{const next=!showChat;setShowChat(next);setUnreadChat(0);showChatRef.current=next}} style={{
        position:'fixed',bottom:24,right:24,width:52,height:52,borderRadius:'50%',
        background:'linear-gradient(135deg,#6366f1,#7c3aed)',border:'none',cursor:'pointer',
        display:'flex',alignItems:'center',justifyContent:'center',
        boxShadow:'0 6px 24px rgba(99,102,241,.45)',zIndex:150,
      }}>
        <span style={{fontSize:22}}>💬</span>
        {unreadChat>0&&<div style={{position:'absolute',top:0,right:0,width:18,height:18,borderRadius:'50%',background:'#ef4444',border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'white'}}>{unreadChat}</div>}
      </button>
      {showChat&&<RoomChat msgs={chatMsgs} myId={me.id} players={rPlayers} input={chatInput} setInput={setChatInput} onSend={sendChat} onClose={()=>{setShowChat(false);showChatRef.current=false}}/>}
    </div>
  )

  return null
}


// ─── Root ─────────────────────────────────────────────────────────
type Screen='hub'|'arena'|'bot'|'friends'
export default function CampusGamesPage(){
  const router=useRouter()
  const[screen,setScreen]=useState<Screen>('hub')
  const[me,setMe]=useState<Me|null>(null)
  useEffect(()=>{
    try{
      const raw=localStorage.getItem('user')
      if(!raw){router.push('/auth');return}
      setMe(JSON.parse(raw))
      const p=new URLSearchParams(window.location.search)
      if(p.get('join'))setScreen('friends')
    }catch{router.push('/auth')}
  },[router])
  if(!me)return(<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f7ff'}}><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style><Loader2 size={28} color="#6366f1" style={{animation:'sp 1s linear infinite'}}/></div>)
  if(screen==='hub')return <Hub me={me} onArena={()=>setScreen('arena')}/>
  if(screen==='arena')return <ArenaDetail me={me} onBack={()=>setScreen('hub')} onBot={()=>setScreen('bot')} onFriends={()=>setScreen('friends')}/>
  if(screen==='bot')return <BotFlow me={me} onBack={()=>setScreen('arena')}/>
  if(screen==='friends')return <FriendsFlow me={me} onBack={()=>setScreen('arena')}/>
  return null
}