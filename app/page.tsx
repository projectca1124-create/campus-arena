'use client'

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/* ═══ DATA ═══ */
const CARDS: { type: string; av?: string; bg?: string; name?: string; tag?: string; text: string; time: string; emoji?: string }[] = [
  { type:"msg", av:"S", bg:"#6366f1", name:"Sarah", tag:"CS Major", text:"Anyone taken CSE 3310? 🤔", time:"2m" },
  { type:"msg", av:"J", bg:"#9333ea", name:"Janice", tag:"Senior", text:"Take it with Dr. Lee 👍", time:"1m" },
  { type:"msg", av:"M", bg:"#e11d48", name:"Maya", tag:"Freshman", text:"Just got my acceptance letter! 🥳", time:"5m" },
  { type:"note", emoji:"🎉", text:"12 new students joined today", time:"now" },
  { type:"note", emoji:"📢", text:"CS Fall 2026 group is live", time:"10m" },
  { type:"msg", av:"A", bg:"#7c3aed", name:"Alex", tag:"Junior", text:"Study sesh at library 8pm?", time:"3m" },
  { type:"note", emoji:"🤝", text:"Jake is now mentoring freshmen", time:"8m" },
  { type:"msg", av:"R", bg:"#c026d3", name:"Rachel", tag:"Sophomore", text:"Best dining hall on campus? 🍕", time:"4m" },
  { type:"msg", av:"D", bg:"#0ea5e9", name:"David", tag:"Transfer", text:"Where do I park on campus? 🚗", time:"6m" },
  { type:"msg", av:"K", bg:"#ea580c", name:"Kevin", tag:"Graduate", text:"TA applications still open?", time:"7m" },
  { type:"note", emoji:"💬", text:"53 questions answered today", time:"now" },
  { type:"msg", av:"L", bg:"#059669", name:"Lily", tag:"Pre-Med", text:"Anyone in Orgo Chem study group? 🧪", time:"1m" },
  { type:"msg", av:"N", bg:"#dc2626", name:"Nathan", tag:"Senior", text:"Cap and gown pickup is Wed! 🎓", time:"3m" },
  { type:"note", emoji:"🏀", text:"Intramural basketball signups open", time:"5m" },
  { type:"msg", av:"P", bg:"#7c3aed", name:"Priya", tag:"Data Sci", text:"Python workshop was so good 🐍", time:"8m" },
  { type:"msg", av:"T", bg:"#0891b2", name:"Tyler", tag:"Freshman", text:"How early should I get to the game?", time:"2m" },
  { type:"note", emoji:"🎵", text:"Battle of the Bands this Friday!", time:"12m" },
  { type:"msg", av:"O", bg:"#b45309", name:"Olivia", tag:"Nursing", text:"Clinical rotations are no joke 😅", time:"4m" },
  { type:"msg", av:"C", bg:"#4f46e5", name:"Carlos", tag:"Engineering", text:"3D printer in the lab is free rn", time:"1m" },
  { type:"note", emoji:"📚", text:"Finals study rooms now bookable", time:"2m" },
  { type:"msg", av:"E", bg:"#be185d", name:"Emma", tag:"Art Major", text:"Gallery opening Thursday — come thru! 🎨", time:"9m" },
  { type:"msg", av:"W", bg:"#16a34a", name:"Will", tag:"Athlete", text:"6am track practice crew? 🏃", time:"3m" },
  { type:"note", emoji:"🌮", text:"New food truck outside the union", time:"now" },
  { type:"msg", av:"H", bg:"#9333ea", name:"Hannah", tag:"Junior", text:"Who has the notes from psych today?", time:"5m" },
]

// 8 positions spread across full viewport — avoids center 30% where headline lives
const SLOTS: { top: string; left?: string; right?: string; d: number; accent: string }[] = [
  { top:"10%", left:"2%",   d:9,   accent:"#6366f1" },  // top-left
  { top:"6%",  right:"18%", d:10,  accent:"#9333ea" },  // top-right area
  { top:"28%", left:"5%",   d:8.5, accent:"#0891b2" },  // mid-left high
  { top:"22%", right:"2%",  d:9.5, accent:"#c026d3" },  // mid-right high
  { top:"55%", left:"3%",   d:10.5,accent:"#059669" },  // mid-left low
  { top:"48%", right:"3%",  d:8,   accent:"#7c3aed" },  // mid-right low
  { top:"74%", left:"6%",   d:9,   accent:"#e11d48" },  // bottom-left
  { top:"70%", right:"5%",  d:11,  accent:"#ea580c" },  // bottom-right
]

const JOURNEY = [
  { label:"Freshman", emoji:"🎒", hook:"Know your classmates before you even get there.", detail:"Get added to your major group automatically. Ask seniors real questions. Show up on Day 1 with people who already know your name.", tags:["Classmate Discovery","Senior Q&A","Pre-arrival Groups"], c:"#4f46e5" },
  { label:"Sophomore", emoji:"📚", hook:"Find your major group, your club, your crowd.", detail:"Join study groups for your courses. Discover clubs that actually match your interests. Stay in the loop on events you'd actually go to.", tags:["Major Groups","Club Discovery","Campus Events"], c:"#0d9488" },
  { label:"Junior", emoji:"🤝", hook:"Now you're the senior someone else is looking for.", detail:"Answer questions on Campus Talks. Share what you wish someone told you. Freshmen and sophomores are already looking for people like you.", tags:["Campus Talks","Mentorship","Knowledge Sharing"], c:"#b45309" },
  { label:"Senior", emoji:"🎓", hook:"Lead the conversations. Leave your mark.", detail:"Start discussions that shape how your campus thinks. Guide students picking their major, their housing, their path. Your experience is someone else's shortcut.", tags:["Lead Discussions","Guide Newcomers","Career Conversations"], c:"#7c3aed" },
  { label:"Alumni", emoji:"🏛️", hook:"You graduated. Your campus didn't. Drop back in.", detail:"Answer career questions from students entering your field. Stay connected to your university's pulse. One tap and you're back in the Arena.", tags:["Industry Guidance","Give Back","Lifelong Network"], c:"#be123c" },
]

const WHY = [
  { emoji:"🔒", title:"Verified Students Only", desc:"Every account is verified through a .edu email. No strangers, no bots. Just real students from your campus.", c:"#6366f1" },
  { emoji:"🏟️", title:"Your Entire Campus", desc:"The moment you sign up, you're in your university's main arena. Every verified student, one space. If it matters to your campus, it lives here.", c:"#7c3aed" },
  { emoji:"👥", title:"Your Community", desc:"Automatically placed into groups based on your major, semester, and interests. Want something more specific? Create your own group.", c:"#9333ea" },
  { emoji:"💬", title:"Campus Talks", desc:"Post a question about anything on campus. Real students who've been through it will answer. Usually within minutes.", c:"#c026d3" },
]

const FAQ_DATA = [
  { q:"Is Campus Arena free?", a:"Yes. Completely free for all verified students. No hidden fees, no premium tiers, no ads. If you have a .edu email, you're in." },
  { q:"Which universities are supported?", a:"All of them. If your university has a .edu email, you're in. We built Campus Arena to work for every college and university from day one — no waitlist, no rollout schedule, no exceptions." },
  { q:"How do I sign up?", a:"Sign up with your university email. We'll send you a verification code. Once verified, you're placed into your campus community and matched with groups. Takes about two minutes." },
  { q:"Is my data safe?", a:"Your privacy matters to us. We don't sell your data, we don't run ads, and we don't share your information with anyone. Your conversations stay between you and your campus community." },
  { q:"Can I use it after I graduate?", a:"Absolutely. Alumni keep their accounts. Keep participating in Campus Talks, mentoring students, and staying connected. Your campus doesn't end at graduation." },
  { q:"I'm a transfer student. Does this work for me?", a:"Yes. When you verify with your new university email, you'll be placed into the right groups automatically. It's one of the best ways to meet people at a new campus before you even show up." },
]

/* ═══ HOOKS ═══ */
function useReveal(th = 0.1): [React.RefObject<any>, boolean] {
  const r = useRef<HTMLElement>(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = r.current; if (!el) return
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold: th })
    o.observe(el); return () => o.disconnect()
  }, [th])
  return [r, v]
}

/* ═══ COMPONENTS — Apple iMessage Notification Style ═══ */
function Card({ card, accent = "#6366f1" }: { card: typeof CARDS[0]; accent?: string }) {
  const tint = card.type === "msg" ? card.bg || accent : accent

  if (card.type === "msg") return (
    <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
      {/* App icon — exact Apple notification avatar style */}
      <div style={{
        width:"36px", height:"36px", borderRadius:"10px",
        background: `linear-gradient(145deg, ${card.bg}, ${card.bg}cc)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"14px", color:"#fff", fontWeight:800,
        fontFamily:"-apple-system, 'SF Pro Display', sans-serif",
        flexShrink:0,
        boxShadow:`0 2px 6px ${card.bg}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
      }}>{card.av}</div>

      {/* Content */}
      <div style={{ flex:1, minWidth:0 }}>
        {/* Top row: name + tag + time — Apple notification header */}
        <div style={{ display:"flex", alignItems:"baseline", gap:"5px", marginBottom:"2px" }}>
          <span style={{
            fontFamily:"-apple-system, 'SF Pro Text', sans-serif",
            fontSize:"12px", fontWeight:600,
            color:"rgba(0,0,0,0.85)",
            letterSpacing:"-0.01em",
          }}>{card.name}</span>
          <span style={{
            fontSize:"9.5px", fontWeight:600,
            color: "rgba(255,255,255,0.95)",
            background: card.bg,
            padding:"1.5px 6px", borderRadius:"100px",
            letterSpacing:"0.02em",
            lineHeight:"1.4",
          }}>{card.tag}</span>
          <span style={{
            fontFamily:"-apple-system, 'SF Pro Text', sans-serif",
            fontSize:"11px", color:"rgba(0,0,0,0.35)",
            marginLeft:"auto", flexShrink:0,
            letterSpacing:"-0.01em",
          }}>{card.time}</span>
        </div>
        {/* Message text — Apple uses slightly muted, not pure black */}
        <p style={{
          fontFamily:"-apple-system, 'SF Pro Text', sans-serif",
          fontSize:"12.5px",
          color:"rgba(0,0,0,0.6)",
          lineHeight:1.35,
          fontWeight:400,
          letterSpacing:"-0.005em",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        }}>{card.text}</p>
      </div>
    </div>
  )

  // Notification-style note (system event)
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
      {/* System icon bubble */}
      <div style={{
        width:"36px", height:"36px", borderRadius:"10px",
        background:`linear-gradient(145deg, ${accent}ee, ${accent}aa)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"17px", flexShrink:0,
        boxShadow:`0 2px 6px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}>{card.emoji}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"1px" }}>
          <span style={{
            fontFamily:"-apple-system, 'SF Pro Text', sans-serif",
            fontSize:"11.5px", fontWeight:600,
            color:"rgba(0,0,0,0.5)",
            letterSpacing:"0.01em", textTransform:"uppercase",
          }}>Campus Arena</span>
          <span style={{
            fontFamily:"-apple-system, 'SF Pro Text', sans-serif",
            fontSize:"11px", color:"rgba(0,0,0,0.35)",
            letterSpacing:"-0.01em",
          }}>{card.time}</span>
        </div>
        <p style={{
          fontFamily:"-apple-system, 'SF Pro Text', sans-serif",
          fontSize:"12.5px",
          color:"rgba(0,0,0,0.65)",
          lineHeight:1.35,
          fontWeight:400,
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        }}>{card.text}</p>
      </div>
    </div>
  )
}

/* ═══ MAIN ═══ */
export default function Home() {
  const router = useRouter()
  const [vis, setVis] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mob, setMob] = useState(false)
  const [slots, setSlots] = useState([0,1,2,3,4,5,6,7])
  const [sVis, setSVis] = useState([false,false,false,false,false,false,false,false])
  const nc = useRef(8)
  const [jA, setJA] = useState(0)
  const [jAuto, setJAuto] = useState(true)
  const [jK, setJK] = useState(0)
  const [wH, setWH] = useState<number | null>(null)
  const [fO, setFO] = useState<number | null>(null)
  const jT = useRef<NodeJS.Timeout | null>(null)
  const [jRef, jV] = useReveal(0.12)
  const [wRef, wV] = useReveal(0.1)
  const [qRef, qV] = useReveal(0.08)
  const [cRef, cV] = useReveal(0.15)
  const [fRef, fV] = useReveal(0.08)

  const js = JOURNEY[jA]
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" })
  const joinCampus = () => router.push('/auth')

  useEffect(() => {
    setTimeout(() => setVis(true), 300)
    const chk = () => setMob(window.innerWidth < 768)
    chk()
    ;[0,1,2,3,4,5,6,7].forEach(i => setTimeout(() => setSVis(p => { const n=[...p]; n[i]=true; return n }), 600+i*150))
    const onS = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onS, { passive:true })
    window.addEventListener("resize", chk)
    return () => { window.removeEventListener("scroll", onS); window.removeEventListener("resize", chk) }
  }, [])

  // Staggered card rotation — each slot cycles independently, never shows duplicates
  const lastSwap = useRef<number[]>([0,0,0,0,0,0,0,0])
  useEffect(() => {
    const intervals = [4200, 5100, 4700, 5500, 4400, 5800, 4900, 5300]
    const delays =    [0,    600,  1200, 1800, 2400, 3000, 3600, 4200]
    const timers: NodeJS.Timeout[] = []

    delays.forEach((delay, si) => {
      const timer = setTimeout(() => {
        const iv = setInterval(() => {
          const now = Date.now()
          // Skip if any other slot swapped within last 800ms
          if (lastSwap.current.some((t, i) => i !== si && now - t < 800)) return

          lastSwap.current[si] = now
          setSVis(p => { const n=[...p]; n[si]=false; return n })
          setTimeout(() => {
            setSlots(prev => {
              const n = [...prev]
              // Pick a card index not currently shown in any slot
              let next = nc.current % CARDS.length
              let attempts = 0
              while (n.some(idx => idx === next) && attempts < CARDS.length) {
                nc.current++; next = nc.current % CARDS.length; attempts++
              }
              nc.current++
              n[si] = next
              return n
            })
            setTimeout(() => setSVis(p => { const n=[...p]; n[si]=true; return n }), 180)
          }, 600)
        }, intervals[si])
        timers.push(iv)
      }, delay)
      timers.push(timer)
    })
    return () => timers.forEach(t => clearTimeout(t))
  }, [])

  useEffect(() => {
    if (jAuto) { jT.current = setInterval(() => { setJA(p => { setJK(k=>k+1); return (p+1)%5 }) }, 4500) }
    return () => { if (jT.current) clearInterval(jT.current) }
  }, [jAuto])
  const pickJ = (i: number) => { setJA(i); setJK(k=>k+1); setJAuto(false); if (jT.current) clearInterval(jT.current); setTimeout(()=>setJAuto(true),14000) }

  const e = "cubic-bezier(0.22,1,0.36,1)"
  const sp = "cubic-bezier(0.34,1.56,0.64,1)"

  return (
    <div style={{ "--heading":"'Sora',sans-serif", "--body":"'DM Sans',sans-serif", fontFamily:"var(--body)", background:"#FDFBF7", color:"#1a1a2e", width:"100%", minHeight:"100vh", overflowX:"hidden" } as React.CSSProperties}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;scrollbar-width:none;-ms-overflow-style:none}
        *::-webkit-scrollbar{display:none}
        html,body,#root,#__next{height:auto;min-height:100vh;overflow-x:hidden;scrollbar-width:none;-ms-overflow-style:none}
        html::-webkit-scrollbar,body::-webkit-scrollbar,#root::-webkit-scrollbar,#__next::-webkit-scrollbar{display:none}
        html{scroll-behavior:smooth}
        ::selection{background:rgba(99,102,241,0.2)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes gradFlow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes shimmer{0%{left:-100%}100%{left:200%}}
        @keyframes breathe{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.3);opacity:1}}
        @keyframes navIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes orbFloat{0%{transform:translate(0,0)}33%{transform:translate(20px,-15px)}66%{transform:translate(-12px,10px)}100%{transform:translate(0,0)}}
        @keyframes scrollB{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}
        @keyframes reveal{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tagIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
        @keyframes ansIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cf0{0%{transform:translateY(0) rotate(-1deg)}25%{transform:translateY(-9px) rotate(0deg)}50%{transform:translateY(-4px) rotate(-1.5deg)}75%{transform:translateY(-11px) rotate(-0.5deg)}100%{transform:translateY(0) rotate(-1deg)}}
        @keyframes cf1{0%{transform:translateY(0) rotate(0.8deg)}30%{transform:translateY(-7px) rotate(1.5deg)}65%{transform:translateY(-13px) rotate(0deg)}100%{transform:translateY(0) rotate(0.8deg)}}
        @keyframes cf2{0%{transform:translateY(0) translateX(0)}35%{transform:translateY(-8px) translateX(3px)}70%{transform:translateY(-4px) translateX(-2px)}100%{transform:translateY(0) translateX(0)}}
        @keyframes cf3{0%{transform:translateY(0) rotate(1deg)}20%{transform:translateY(-10px) rotate(0deg)}55%{transform:translateY(-5px) rotate(1.8deg)}80%{transform:translateY(-12px) rotate(0.5deg)}100%{transform:translateY(0) rotate(1deg)}}
        @keyframes cf4{0%{transform:translateY(0) translateX(0) rotate(-0.5deg)}40%{transform:translateY(-6px) translateX(-3px) rotate(0.3deg)}75%{transform:translateY(-11px) translateX(2px) rotate(-1deg)}100%{transform:translateY(0) translateX(0) rotate(-0.5deg)}}
        @keyframes cf5{0%{transform:translateY(0) rotate(0.5deg)}33%{transform:translateY(-9px) rotate(1.2deg)}66%{transform:translateY(-5px) rotate(-0.3deg)}100%{transform:translateY(0) rotate(0.5deg)}}
        @keyframes cf6{0%{transform:translateY(0) rotate(-0.8deg)}25%{transform:translateY(-7px) rotate(0.2deg)}60%{transform:translateY(-12px) rotate(-1.2deg)}100%{transform:translateY(0) rotate(-0.8deg)}}
        @keyframes cf7{0%{transform:translateY(0) translateX(0) rotate(0.6deg)}30%{transform:translateY(-10px) translateX(2px) rotate(-0.2deg)}65%{transform:translateY(-4px) translateX(-3px) rotate(1deg)}100%{transform:translateY(0) translateX(0) rotate(0.6deg)}}
        @keyframes emojiPulse{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.05) rotate(2deg)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        padding: scrolled ? (mob?"8px 16px":"8px 40px") : (mob?"14px 16px":"16px 40px"),
        background: scrolled ? "rgba(253,251,247,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        transition:`all 0.4s ${e}`, animation:`navIn 0.6s ${e} both`,
      }}>
        <div onClick={() => window.scrollTo({top:0,behavior:"smooth"})} style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", zIndex:2 }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontFamily:"var(--heading)", fontSize:"14px", fontWeight:800, boxShadow:"0 4px 14px rgba(99,102,241,0.3)" }}>CA</div>
          <span style={{ fontFamily:"var(--heading)", fontSize:"17px", fontWeight:700, letterSpacing:"-0.02em" }}>Campus Arena</span>
        </div>
        {/* Center nav links */}
        {!mob && (
          <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:"32px" }}>
            {["Your Journey","Why Arena?","Questions"].map((l,i) => (
              <button key={l} onClick={() => go(["journey","why","questions"][i])} style={{ background:"none", border:"none", fontFamily:"var(--body)", fontSize:"13.5px", fontWeight:500, color:"#666", cursor:"pointer", transition:"color 0.2s" }}
                onMouseEnter={(ev) => (ev.target as HTMLElement).style.color="#6366f1"} onMouseLeave={(ev) => (ev.target as HTMLElement).style.color="#666"}
              >{l}</button>
            ))}
          </div>
        )}
        {/* Join button at end */}
        <button onClick={joinCampus} style={{ fontFamily:"var(--heading)", fontSize:"13px", fontWeight:700, color:"white", background:"#1a1a2e", border:"none", borderRadius:"10px", padding: mob ? "9px 18px" : "10px 24px", cursor:"pointer", transition:`all 0.3s ${e}`, zIndex:2 }}
          onMouseEnter={(ev) => {(ev.target as HTMLElement).style.transform="translateY(-1px)";(ev.target as HTMLElement).style.boxShadow="0 6px 20px rgba(26,26,46,0.3)"}}
          onMouseLeave={(ev) => {(ev.target as HTMLElement).style.transform="translateY(0)";(ev.target as HTMLElement).style.boxShadow="none"}}
        >Join Your Campus →</button>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section id="hero" style={{ minHeight:"100vh", position:"relative", display:"flex", alignItems:"center", justifyContent:"center", overflow:"visible" }}>
        <div style={{ position:"absolute", top:"-5%", left:"-5%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.08), transparent 65%)", animation:"orbFloat 18s ease-in-out infinite", filter:"blur(50px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"0%", right:"-5%", width:"450px", height:"450px", borderRadius:"50%", background:"radial-gradient(circle, rgba(192,38,211,0.06), transparent 60%)", animation:"orbFloat 22s ease-in-out infinite 5s", filter:"blur(50px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"30%", left:"50%", width:"600px", height:"600px", borderRadius:"50%", background:"radial-gradient(circle, rgba(251,191,36,0.04), transparent 55%)", filter:"blur(70px)", pointerEvents:"none" }} />

        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width: mob ? "320px" : "520px", height: mob ? "320px" : "520px", pointerEvents:"none", zIndex:0, opacity:0.7 }}>
          <div style={{ position:"absolute", top:"0", left:"18%", width:"200px", height:"200px", borderRadius:"50%", background:"rgba(99,102,241,0.06)", border:"1.5px solid rgba(99,102,241,0.08)", animation:"orbFloat 16s ease-in-out infinite" }} />
          <div style={{ position:"absolute", top:"12%", right:"8%", width:"180px", height:"180px", borderRadius:"50%", background:"rgba(147,51,234,0.05)", border:"1.5px solid rgba(147,51,234,0.07)", animation:"orbFloat 20s ease-in-out infinite 3s" }} />
          <div style={{ position:"absolute", bottom:"5%", left:"5%", width:"220px", height:"220px", borderRadius:"50%", background:"rgba(225,29,72,0.04)", border:"1.5px solid rgba(225,29,72,0.06)", animation:"orbFloat 24s ease-in-out infinite 6s" }} />
          <div style={{ position:"absolute", bottom:"0%", right:"12%", width:"160px", height:"160px", borderRadius:"50%", background:"rgba(124,58,237,0.05)", border:"1.5px solid rgba(124,58,237,0.07)", animation:"orbFloat 18s ease-in-out infinite 2s" }} />
          <div style={{ position:"absolute", top:"32%", left:"32%", width:"160px", height:"160px", borderRadius:"50%", background:"rgba(99,102,241,0.07)", border:"1.5px solid rgba(99,102,241,0.1)", animation:"orbFloat 22s ease-in-out infinite 4s" }} />
        </div>

        <div style={{ position:"absolute", inset:0, pointerEvents:"none", opacity:0.03, backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize:"180px" }} />

        {!mob && SLOTS.map((sl, si) => {
          const cd = CARDS[slots[si]]; const iv = sVis[si]
          const tint = cd.type === "msg" ? cd.bg || sl.accent : sl.accent
          const pos: Record<string,string> = {}; if(sl.top) pos.top=sl.top; if(sl.left) pos.left=sl.left; if(sl.right) pos.right=sl.right
          return (
            <div key={si} style={{
              position:"absolute", ...pos, zIndex:3, pointerEvents:"none", maxWidth:"272px", minWidth:"220px",
              opacity:iv?1:0,
              transform:iv?"translateY(0) scale(1)":"translateY(10px) scale(0.97)",
              transition:`opacity 0.55s ${e}, transform 0.55s ${e}`,
              animation:iv?`cf${si} ${sl.d}s ease-in-out infinite`:"none",
            }}>
              {/* Apple Live Notification glass shell */}
              <div style={{
                background:"rgba(250,250,252,0.78)",
                backdropFilter:"blur(48px) saturate(2) brightness(1.04)",
                WebkitBackdropFilter:"blur(48px) saturate(2) brightness(1.04)",
                borderRadius:"22px",
                padding:"11px 12px 12px",
                border:"0.5px solid rgba(255,255,255,0.9)",
                boxShadow:[
                  "0 0 0 0.5px rgba(0,0,0,0.07)",
                  "0 12px 36px rgba(0,0,0,0.11)",
                  "0 3px 10px rgba(0,0,0,0.06)",
                  "inset 0 1px 0 rgba(255,255,255,0.95)",
                  "inset 0 -1px 0 rgba(0,0,0,0.03)",
                ].join(", "),
                position:"relative",
                overflow:"hidden",
              }}>
                {/* Apple specular sheen — micro gloss on top half */}
                <div style={{
                  position:"absolute", top:0, left:0, right:0, height:"48%",
                  background:"linear-gradient(180deg, rgba(255,255,255,0.32) 0%, transparent 100%)",
                  borderRadius:"22px 22px 0 0",
                  pointerEvents:"none",
                }} />
                <Card card={cd} accent={sl.accent} />
              </div>
            </div>
          )
        })}

        <div style={{ textAlign:"center", maxWidth:"640px", padding: mob ? "130px 20px 80px" : "140px 24px 100px", position:"relative", zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>

          <h1 style={{ fontFamily:"var(--heading)", fontSize: mob ? "clamp(36px,10vw,48px)" : "clamp(48px,5.5vw,68px)", fontWeight:800, lineHeight:1.08, letterSpacing:"-0.04em", margin:"0 0 16px 0", whiteSpace: mob ? "normal" : "nowrap", opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(28px)", transition:`all 0.9s ${e} 0.35s` }}>
            Your Campus.{" "}
            <span style={{ background:"linear-gradient(135deg,#6366f1,#9333ea,#c026d3,#e11d48)", backgroundSize:"250% 250%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"gradFlow 5s ease infinite" }}>One Space.</span>
          </h1>

          <p style={{ fontFamily:"var(--body)", fontSize: mob ? "16px" : "18px", color:"#555", lineHeight:1.6, margin:"0 auto 36px", whiteSpace: mob ? "normal" : "nowrap", opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(22px)", transition:`all 0.9s ${e} 0.5s` }}>
            The verified space where your entire campus connects.
          </p>

          <div style={{ opacity:vis?1:0, transform:vis?"translateY(0) scale(1)":"translateY(16px) scale(0.96)", transition:`all 0.9s ${sp} 0.65s` }}>
            <button onClick={joinCampus} style={{ fontFamily:"var(--heading)", fontSize:"16px", fontWeight:700, color:"white", background:"#1a1a2e", border:"none", borderRadius:"14px", padding: mob ? "16px 36px" : "16px 44px", cursor:"pointer", position:"relative", overflow:"hidden", boxShadow:"0 6px 28px rgba(26,26,46,0.25)", transition:`all 0.35s ${e}`, zIndex:20 }}
              onMouseEnter={(ev) => {(ev.target as HTMLElement).style.transform="translateY(-2px) scale(1.03)";(ev.target as HTMLElement).style.boxShadow="0 12px 40px rgba(26,26,46,0.35)"}}
              onMouseLeave={(ev) => {(ev.target as HTMLElement).style.transform="translateY(0) scale(1)";(ev.target as HTMLElement).style.boxShadow="0 6px 28px rgba(26,26,46,0.25)"}}
            >
              Join Your Campus →
              <div style={{ position:"absolute", top:0, left:"-100%", width:"60%", height:"100%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)", animation:"shimmer 4s ease infinite 1s" }} />
            </button>
          </div>

          <div style={{ marginTop:"28px", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(12px)", transition:`all 0.9s ${e} 0.8s` }}>
            <div style={{ display:"flex" }}>
              {["#6366f1","#9333ea","#c026d3","#e11d48","#ea580c"].map((c,i)=>(
                <div key={i} style={{ width:"28px", height:"28px", borderRadius:"50%", background:c, border:"2px solid #FDFBF7", marginLeft:i?"-8px":"0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"white", fontWeight:700, fontFamily:"var(--heading)", zIndex:5-i }}>{["S","J","M","A","R"][i]}</div>
              ))}
            </div>
            <p style={{ fontSize:"13px", color:"#888" }}>Students from <span style={{ color:"#6366f1", fontWeight:600 }}>5+ universities</span> have joined Campus Arena as their official campus space.</p>
          </div>
        </div>

        <div style={{ position:"absolute", bottom:"24px", left:"50%", transform:"translateX(-50%)", opacity:vis?.3:0, transition:"opacity 1s ease 2s", zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
          <p style={{ fontSize:"10px", color:"#999", letterSpacing:"0.1em", textTransform:"uppercase" }}>Scroll</p>
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none" style={{ animation:"scrollB 2s ease-in-out infinite" }}><rect x=".5" y=".5" width="13" height="21" rx="6.5" stroke="#bbb" fill="none"/><circle cx="7" cy="7" r="1.5" fill="#bbb"/></svg>
        </div>
      </section>

      {/* ═══════════ YOUR JOURNEY ═══════════ */}
      <section id="journey" ref={jRef} style={{ padding: mob ? "80px 16px" : "120px 24px", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(180deg, #FDFBF7, ${js.c}06 40%, ${js.c}04 60%, #FDFBF7)`, transition:"background 1.2s ease", pointerEvents:"none" }} />
        <div style={{ maxWidth:"1100px", margin:"0 auto", position:"relative", zIndex:2 }}>
          <div style={{ textAlign:"center", marginBottom:"56px", opacity:jV?1:0, transform:jV?"translateY(0)":"translateY(24px)", transition:`all 0.7s ${e}` }}>
            <span style={{ fontFamily:"var(--heading)", fontSize:"12px", fontWeight:700, color:js.c, letterSpacing:"0.1em", textTransform:"uppercase", transition:"color 0.8s ease" }}>✦ Your Journey</span>
            <h2 style={{ fontFamily:"var(--heading)", fontSize: mob ? "clamp(28px,7vw,36px)" : "clamp(34px,4vw,46px)", fontWeight:800, lineHeight:1.15, margin:"16px 0 16px 0", letterSpacing:"-0.03em" }}>
              One Platform. <span style={{ color:js.c, transition:"color 0.8s ease" }}>Every Stage.</span>
            </h2>
            <p style={{ fontSize:"17px", color:"#666", maxWidth:"500px", margin:"0 auto", lineHeight:1.6 }}>Whether you just got your acceptance letter or graduated years ago. Campus Arena grows with you.</p>
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap: mob ? "6px" : "8px", marginBottom:"40px", flexWrap:"wrap", opacity:jV?1:0, transform:jV?"translateY(0)":"translateY(16px)", transition:`all 0.7s ${e} 0.15s` }}>
            {JOURNEY.map((st, i) => (
              <button key={i} onClick={() => pickJ(i)} style={{
                fontFamily:"var(--heading)", fontSize: mob ? "12px" : "13px", fontWeight: i===jA ? 700 : 500,
                color: i===jA ? "white" : "#666", background: i===jA ? st.c : "rgba(0,0,0,0.04)",
                border:"none", borderRadius:"100px", padding: mob ? "8px 14px" : "10px 20px",
                cursor:"pointer", transition:`all 0.4s ${e}`,
                boxShadow: i===jA ? `0 4px 16px ${st.c}35` : "none",
                transform: i===jA ? "scale(1.05)" : "scale(1)",
              }}>
                {st.emoji} {st.label}
              </button>
            ))}
          </div>
          <div key={jK} style={{ maxWidth:"1000px", margin:"0 auto", animation:`reveal 0.45s ${e} forwards` }}>
            <div style={{
              background:`linear-gradient(135deg, ${js.c}06, ${js.c}03)`,
              backdropFilter:"blur(20px)",
              WebkitBackdropFilter:"blur(20px)",
              borderRadius:"28px",
              padding: mob ? "36px 28px 32px" : "52px 60px 48px",
              border:`1.5px solid ${js.c}12`,
              boxShadow:`0 16px 60px ${js.c}08, 0 2px 8px rgba(0,0,0,0.03)`,
              position:"relative",
              overflow:"hidden",
              transition:`border-color 0.8s ease, box-shadow 0.8s ease, background 0.8s ease`,
            }}>
              {/* Bottom gradient fade */}
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"50%", background:`linear-gradient(180deg, transparent, ${js.c}05)`, borderRadius:"0 0 28px 28px", pointerEvents:"none", transition:"background 0.8s ease" }} />
              {/* Large emoji watermark */}
              <div style={{ position:"absolute", top: mob?"-5px":"-15px", right: mob?"0":"20px", fontSize: mob?"100px":"150px", opacity:0.05, lineHeight:1, pointerEvents:"none", animation:"emojiPulse 8s ease-in-out infinite", transition:"opacity 0.5s ease" }}>{js.emoji}</div>
              {/* Color glow orb */}
              <div style={{ position:"absolute", top:"-60px", right:"-60px", width:"240px", height:"240px", borderRadius:"50%", background:`radial-gradient(circle, ${js.c}0c, transparent 70%)`, pointerEvents:"none", transition:"background 0.8s ease" }} />
              {/* Floating dot accent */}
              <div style={{ position:"absolute", top:"16px", right:"20px", width:"6px", height:"6px", borderRadius:"50%", background:js.c, opacity:0.3, transition:"background 0.8s ease" }} />

              <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection: mob ? "column" : "row", gap: mob ? "20px" : "48px", alignItems: mob ? "flex-start" : "center" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:"var(--heading)", fontSize: mob ? "22px" : "28px", fontWeight:700, color:"#1a1a2e", lineHeight:1.3, margin:"0 0 16px 0", letterSpacing:"-0.02em", maxWidth:"520px" }}>{js.hook}</p>
                  <p style={{ fontSize: mob ? "14px" : "16px", color:"#666", lineHeight:1.7, margin:"0 0 28px 0", maxWidth:"540px", animation:`fadeUp 0.5s ${e} 0.12s both` }}>{js.detail}</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                    {js.tags.map((t, i) => (
                      <span key={`${jK}-${i}`} style={{
                        fontSize:"12.5px", fontWeight:700, padding:"7px 18px", borderRadius:"100px",
                        background: "white", color: js.c,
                        border: `1.5px solid ${js.c}15`,
                        boxShadow: `0 2px 8px ${js.c}08`,
                        animation:`tagIn 0.35s ${e} ${0.2+i*0.08}s both`,
                        transition:"color 0.6s ease, border-color 0.6s ease",
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
                {/* Stage indicator */}
                {!mob && (
                  <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:"8px" }}>
                    <div style={{
                      width:"80px", height:"80px", borderRadius:"24px",
                      background:`linear-gradient(135deg, ${js.c}15, ${js.c}08)`,
                      border:`1.5px solid ${js.c}15`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"40px",
                      boxShadow:`0 8px 24px ${js.c}10`,
                      transition:"all 0.8s ease",
                    }}>{js.emoji}</div>
                    <span style={{ fontFamily:"var(--heading)", fontSize:"11px", fontWeight:700, color:js.c, letterSpacing:"0.05em", textTransform:"uppercase", transition:"color 0.8s ease" }}>{js.label}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:"6px", marginTop:"28px" }}>
              {JOURNEY.map((st, i) => <button key={i} onClick={() => pickJ(i)} style={{ width:i===jA?"28px":"8px", height:"8px", borderRadius:"100px", background:i===jA?st.c:i<=jA?`${st.c}30`:"#ddd", border:"none", cursor:"pointer", transition:`all 0.4s ${e}`, padding:0 }} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ WHY ARENA ═══════════ */}
      <section id="why" ref={wRef} style={{ padding: mob ? "80px 16px" : "120px 24px", position:"relative" }}>
        <div style={{ maxWidth:"980px", margin:"0 auto", position:"relative", zIndex:2 }}>
          <div style={{ textAlign:"center", marginBottom:"56px", opacity:wV?1:0, transform:wV?"translateY(0)":"translateY(24px)", transition:`all 0.7s ${e}` }}>
            <span style={{ fontFamily:"var(--heading)", fontSize:"12px", fontWeight:700, color:"#7c3aed", letterSpacing:"0.1em", textTransform:"uppercase" }}>✦ Why Arena?</span>
            <h2 style={{ fontFamily:"var(--heading)", fontSize: mob ? "clamp(28px,7vw,36px)" : "clamp(34px,4vw,46px)", fontWeight:800, lineHeight:1.15, margin:"16px 0 16px 0", letterSpacing:"-0.03em" }}>
              Your Campus Has Everything.<br /><span style={{ color:"#7c3aed" }}>Just Not in One Place.</span>
            </h2>
            <p style={{ fontSize:"17px", color:"#666", lineHeight:1.6 }}>Built by students who lived it. For students living it now.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap:"16px" }}>
            {WHY.map((item, i) => {
              const isH = wH === i
              return (
                <div key={i} onMouseEnter={() => setWH(i)} onMouseLeave={() => setWH(null)} style={{
                  background: isH ? "white" : "rgba(255,255,255,0.6)", borderRadius:"20px", padding: mob ? "28px 24px" : "32px",
                  border: isH ? `2px solid ${item.c}20` : "2px solid transparent",
                  boxShadow: isH ? `0 16px 48px ${item.c}0c` : "0 1px 4px rgba(0,0,0,0.02)",
                  transition:`all 0.45s ${e}`, cursor:"default", position:"relative", overflow:"hidden",
                  transform: isH ? "translateY(-4px)" : "translateY(0)",
                  opacity: wV ? 1 : 0, transitionDelay: wV ? `${i*0.08}s` : "0s",
                }}>
                  <div style={{ position:"absolute", bottom:"-15px", right:"-10px", fontSize:"100px", opacity: isH ? 0.1 : 0.035, transition:"all 0.6s ease", pointerEvents:"none", lineHeight:1, transform: isH ? "scale(1.1) rotate(-5deg)" : "scale(1) rotate(0deg)" }}>{item.emoji}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px", position:"relative", zIndex:2 }}>
                    <div style={{ width:"42px", height:"42px", borderRadius:"12px", background: isH ? item.c : `${item.c}0a`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", transition:`all 0.45s ${e}`, boxShadow: isH ? `0 6px 18px ${item.c}30` : "none", flexShrink:0 }}>{item.emoji}</div>
                    <h3 style={{ fontFamily:"var(--heading)", fontSize:"17px", fontWeight:700, letterSpacing:"-0.01em" }}>{item.title}</h3>
                  </div>
                  <p style={{ fontSize:"14.5px", color: isH ? "#333" : "#666", lineHeight:1.7, position:"relative", zIndex:2, transition:"color 0.3s ease" }}>{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ QUESTIONS ═══════════ */}
      <section id="questions" ref={qRef} style={{ padding: mob ? "80px 16px" : "120px 24px", position:"relative", background:"linear-gradient(180deg,#FDFBF7,#FEF5EE 40%,#FEF3EA 60%,#FDFBF7)" }}>
        <div style={{ position:"absolute", top:"15%", left:"8%", fontSize:"80px", opacity:0.03, transform:"rotate(-15deg)", pointerEvents:"none", color:"#e11d48" }}>?</div>
        <div style={{ position:"absolute", bottom:"20%", right:"6%", fontSize:"60px", opacity:0.03, transform:"rotate(10deg)", pointerEvents:"none", color:"#e11d48" }}>?</div>
        <div style={{ position:"absolute", top:"45%", right:"12%", fontSize:"40px", opacity:0.025, transform:"rotate(-8deg)", pointerEvents:"none", color:"#e11d48" }}>?</div>
        <div style={{ maxWidth:"680px", margin:"0 auto", position:"relative", zIndex:2 }}>
          <div style={{ textAlign:"center", marginBottom:"48px", opacity:qV?1:0, transform:qV?"translateY(0)":"translateY(24px)", transition:`all 0.7s ${e}` }}>
            <span style={{ fontFamily:"var(--heading)", fontSize:"12px", fontWeight:700, color:"#e11d48", letterSpacing:"0.1em", textTransform:"uppercase" }}>✦ Questions</span>
            <h2 style={{ fontFamily:"var(--heading)", fontSize: mob ? "clamp(28px,7vw,36px)" : "clamp(34px,4vw,44px)", fontWeight:800, lineHeight:1.15, margin:"16px 0 14px 0", letterSpacing:"-0.03em" }}>
              Before You <span style={{ color:"#e11d48" }}>Join.</span>
            </h2>
            <p style={{ fontSize:"16px", color:"#666", lineHeight:1.6 }}>Quick answers to the things students ask us most.</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {FAQ_DATA.map((item, i) => {
              const isO = fO === i
              return (
                <div key={i} onClick={() => setFO(isO ? null : i)} style={{
                  background: isO ? "white" : "rgba(255,255,255,0.6)", borderRadius:"16px", padding: isO ? "22px 24px 24px" : "20px 24px",
                  border: isO ? "1.5px solid rgba(225,29,72,0.12)" : "1.5px solid transparent",
                  boxShadow: isO ? "0 8px 32px rgba(225,29,72,0.05)" : "0 1px 3px rgba(0,0,0,0.01)",
                  cursor:"pointer", transition:`all 0.35s ${e}`,
                  opacity: qV ? 1 : 0, transitionDelay: qV ? `${0.04+i*0.05}s` : "0s",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <h3 style={{ fontFamily:"var(--heading)", fontSize:"15.5px", fontWeight:600, color: isO ? "#e11d48" : "#1a1a2e", transition:"color 0.25s", lineHeight:1.4, paddingRight:"14px" }}>{item.q}</h3>
                    <div style={{ width:"26px", height:"26px", borderRadius:"8px", background: isO ? "#e11d4812" : "rgba(0,0,0,0.03)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.3s ease" }}>
                      <span style={{ fontSize:"15px", color: isO ? "#e11d48" : "#999", transition:"all 0.3s ease", transform: isO ? "rotate(45deg)" : "rotate(0)", display:"block", lineHeight:1 }}>+</span>
                    </div>
                  </div>
                  {isO && <p style={{ fontSize:"14.5px", color:"#555", lineHeight:1.75, marginTop:"12px", animation:`ansIn 0.3s ${e} both` }}>{item.a}</p>}
                </div>
              )
            })}
          </div>
          <p style={{ fontSize:"13px", color:"#999", marginTop:"28px", textAlign:"center" }}>
            Still have questions? <span onClick={() => router.push('/contact')} style={{ color:"#e11d48", fontWeight:600, cursor:"pointer" }} onMouseEnter={(ev) => (ev.target as HTMLElement).style.opacity=".7"} onMouseLeave={(ev) => (ev.target as HTMLElement).style.opacity="1"}>Get in touch →</span>
          </p>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section ref={cRef} style={{ padding: mob ? "80px 16px" : "100px 24px", textAlign:"center", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 50% 40% at 50% 50%,rgba(99,102,241,0.04),transparent 60%)" }} />
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"300px", height:"300px", borderRadius:"50%", border:"1.5px dashed rgba(99,102,241,0.08)", pointerEvents:"none" }} />
        <div style={{ opacity:cV?1:0, transform:cV?"translateY(0)":"translateY(24px)", transition:`all 0.7s ${e}`, position:"relative", zIndex:2 }}>
          <div style={{ fontSize:"48px", marginBottom:"16px" }}>🎓</div>
          <h2 style={{ fontFamily:"var(--heading)", fontSize: mob ? "clamp(24px,6vw,32px)" : "clamp(28px,3.5vw,38px)", fontWeight:800, lineHeight:1.2, margin:"0 0 12px 0", letterSpacing:"-0.03em" }}>Your campus community is waiting.</h2>
          <p style={{ fontSize:"16px", color:"#666", margin:"0 0 32px 0" }}>Be one of the first students on your campus to join.</p>
          <button onClick={joinCampus} style={{ fontFamily:"var(--heading)", fontSize:"16px", fontWeight:700, color:"white", background:"#1a1a2e", border:"none", borderRadius:"14px", padding:"16px 40px", cursor:"pointer", boxShadow:"0 6px 28px rgba(26,26,46,0.25)", transition:`all 0.35s ${e}` }}
            onMouseEnter={(ev) => {(ev.target as HTMLElement).style.transform="translateY(-2px) scale(1.03)";(ev.target as HTMLElement).style.boxShadow="0 12px 40px rgba(26,26,46,0.35)"}}
            onMouseLeave={(ev) => {(ev.target as HTMLElement).style.transform="translateY(0) scale(1)";(ev.target as HTMLElement).style.boxShadow="0 6px 28px rgba(26,26,46,0.25)"}}
          >Join Your Campus →</button>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer ref={fRef} style={{ borderTop:"1px solid rgba(0,0,0,0.06)", opacity:fV?1:0, transform:fV?"translateY(0)":"translateY(16px)", transition:`all 0.7s ${e}` }}>
        <div style={{ maxWidth:"980px", margin:"0 auto", padding: mob ? "40px 20px 20px" : "52px 40px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap: mob ? "32px" : "48px", marginBottom:"40px", flexDirection: mob ? "column" : "row" }}>
            <div style={{ maxWidth:"260px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"9px", marginBottom:"14px" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontFamily:"var(--heading)", fontSize:"12px", fontWeight:800 }}>CA</div>
                <span style={{ fontFamily:"var(--heading)", fontSize:"16px", fontWeight:700 }}>Campus Arena</span>
              </div>
              <p style={{ fontSize:"13.5px", color:"#777", lineHeight:1.65 }}>Your campus. One space. Connecting students from their first semester to their last.</p>
              {/* Social Icons — X, LinkedIn, Instagram */}
              <div style={{ display:"flex", gap:"10px", marginTop:"16px" }}>
                <a href="https://x.com/_campusarena?s=21" target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"34px", height:"34px", borderRadius:"8px", background:"rgba(0,0,0,0.04)", color:"#555", textDecoration:"none", fontSize:"14px", fontWeight:700, transition:"all 0.25s ease", border:"1px solid rgba(0,0,0,0.06)" }}
                  onMouseEnter={(ev) => {ev.currentTarget.style.background="#1a1a2e";ev.currentTarget.style.color="white";ev.currentTarget.style.borderColor="transparent"}}
                  onMouseLeave={(ev) => {ev.currentTarget.style.background="rgba(0,0,0,0.04)";ev.currentTarget.style.color="#555";ev.currentTarget.style.borderColor="rgba(0,0,0,0.06)"}}
                >𝕏</a>
                <a href="https://www.linkedin.com/company/campus-arena" target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"34px", height:"34px", borderRadius:"8px", background:"rgba(0,0,0,0.04)", color:"#555", textDecoration:"none", fontSize:"14px", fontWeight:700, transition:"all 0.25s ease", border:"1px solid rgba(0,0,0,0.06)" }}
                  onMouseEnter={(ev) => {ev.currentTarget.style.background="#0077B5";ev.currentTarget.style.color="white";ev.currentTarget.style.borderColor="transparent"}}
                  onMouseLeave={(ev) => {ev.currentTarget.style.background="rgba(0,0,0,0.04)";ev.currentTarget.style.color="#555";ev.currentTarget.style.borderColor="rgba(0,0,0,0.06)"}}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://www.instagram.com/_campusarena?igsh=NjBkZjE2eGphNmZ2&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"34px", height:"34px", borderRadius:"8px", background:"rgba(0,0,0,0.04)", color:"#555", textDecoration:"none", fontSize:"14px", fontWeight:700, transition:"all 0.25s ease", border:"1px solid rgba(0,0,0,0.06)" }}
                  onMouseEnter={(ev) => {ev.currentTarget.style.background="#E4405F";ev.currentTarget.style.color="white";ev.currentTarget.style.borderColor="transparent"}}
                  onMouseLeave={(ev) => {ev.currentTarget.style.background="rgba(0,0,0,0.04)";ev.currentTarget.style.color="#555";ev.currentTarget.style.borderColor="rgba(0,0,0,0.06)"}}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              </div>
            </div>
            <div style={{ display:"flex", gap: mob ? "36px" : "64px", flexWrap:"wrap" }}>
              {[
                {t:"Product",l:[{n:"Your Journey",id:"journey"},{n:"Why Arena?",id:"why"},{n:"Questions",id:"questions"}]},
                {t:"Company",l:[{n:"Our Story",href:"/story"},{n:"Careers",href:"/careers"},{n:"Contact",href:"/contact"}]},
                {t:"Legal",l:[{n:"Privacy Policy",href:"/privacy"},{n:"Terms of Service",href:"/terms"}]},
              ].map(col=>(
                <div key={col.t}>
                  <p style={{ fontFamily:"var(--heading)", fontSize:"11.5px", fontWeight:700, marginBottom:"16px", letterSpacing:"0.06em", textTransform:"uppercase", color:"#1a1a2e" }}>{col.t}</p>
                  {col.l.map((item: any) => <p key={item.n} onClick={() => item.id ? go(item.id) : item.href ? router.push(item.href) : null} style={{ fontSize:"13.5px", color:"#777", margin:"0 0 10px 0", cursor:"pointer", transition:"color 0.2s" }} onMouseEnter={(ev) => (ev.target as HTMLElement).style.color="#6366f1"} onMouseLeave={(ev) => (ev.target as HTMLElement).style.color="#777"}>{item.n}</p>)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:"1px solid rgba(0,0,0,0.05)", paddingTop:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexDirection: mob ? "column" : "row", gap: mob ? "6px" : "0" }}>
            <p style={{ fontSize:"12px", color:"#aaa" }}>© 2026 Campus Arena. All rights reserved.</p>
            <p style={{ fontSize:"12px", color:"#ccc" }}>Made with 💜 for every student</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

//Deployment PUSH//