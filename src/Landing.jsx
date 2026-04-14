export default function Landing() {
  return (
    <div style={{background:"#111",color:"#fff",minHeight:"100vh",fontFamily:"var(--font-sans)"}}>

      {/* Nav */}
      <div style={{padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid #1a1a1a",maxWidth:900,margin:"0 auto"}}>
        <div style={{fontSize:16,fontWeight:500}}>School Scores</div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <span style={{fontSize:13,color:"#ccc",cursor:"pointer"}}>For schools</span>
        <span style={{fontSize:13,color:"#ccc",cursor:"pointer"}}>Sponsors</span>
        <a href="/app" style={{textDecoration:"none",background:"none",border:"0.5px solid #555",borderRadius:20,padding:"6px 14px",fontSize:13,color:"#fff",cursor:"pointer"}}>Sign in</a>
        <a href="/app" style={{textDecoration:"none",background:"#fff",borderRadius:20,padding:"6px 14px",fontSize:13,color:"#111",fontWeight:500,cursor:"pointer"}}>Sign up</a>
      </div>
    </div>

      {/* Hero */}
      <div style={{padding:"64px 24px 56px",maxWidth:900,margin:"0 auto",textAlign:"center"}}>
        <div style={{display:"inline-block",background:"#2a2a2a",color:"#fff",border:"0.5px solid #666",borderRadius:20,padding:"4px 14px",fontSize:12,marginBottom:20}}>
          🏆 Live · Crowdsourced · Free
        </div>
        <h1 style={{fontSize:52,fontWeight:500,lineHeight:1.1,marginBottom:16,letterSpacing:-1,color:"#fff"}}>
          Be there.<br/>Even when you're not.
        </h1>
        <p style={{fontSize:18,color:"#bbb",marginBottom:48,maxWidth:480,marginLeft:"auto",marginRight:"auto",lineHeight:1.6}}>
          Live school sports scores, crowdsourced from parents, pupils and coaches at the match.
        </p>

        {/* CTA blocks */}
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",maxWidth:600,margin:"0 auto"}}>
          <a href="/app" style={{textDecoration:"none",flex:1,minWidth:240}}>
            <div style={{background:"#fff",color:"#111",borderRadius:16,padding:"32px 24px",textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:32,marginBottom:12}}>🏟</div>
              <div style={{fontSize:20,fontWeight:500,marginBottom:8}}>Take me to<br/>the games</div>
              <div style={{fontSize:13,color:"#bbb",marginBottom:20}}>See all live matches happening right now</div>
              <div style={{background:"#111",color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:500,display:"inline-block"}}>View live scores →</div>
            </div>
          </a>
          <a href="/schools" style={{textDecoration:"none",flex:1,minWidth:240}}>
            <div style={{background:"#1a1a1a",color:"#fff",border:"1.5px solid #fff",borderRadius:16,padding:"32px 24px",textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:32,marginBottom:12}}>🏫</div>
              <div style={{fontSize:20,fontWeight:500,marginBottom:8}}>Find<br/>my school</div>
              <div style={{fontSize:13,color:"#bbb",marginBottom:20}}>Follow your school and get live updates</div>
              <div style={{background:"#fff",color:"#111",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:500,display:"inline-block"}}>Search schools →</div>
            </div>
          </a>
        </div>
        <div style={{fontSize:12,color:"#444",marginTop:16}}>
          School not listed? <a href="/register-school" style={{color:"#ccc",textDecoration:"underline"}}>Register it for free →</a>
        </div>
      </div>

      {/* Stats */}
      <div style={{borderTop:"0.5px solid #222",borderBottom:"0.5px solid #222",padding:"40px 24px"}}>
        <div style={{display:"flex",justifyContent:"center",gap:40,flexWrap:"wrap",maxWidth:900,margin:"0 auto"}}>
          {[["50+","Schools"],["Live","Score updates"],["7","Sports"],["Free","To use"]].map(([num,label])=>(
            <div key={label} style={{textAlign:"center"}}>
              <div style={{fontSize:36,fontWeight:500,color:"#fff",lineHeight:1,marginBottom:4}}>{num}</div>
              <div style={{fontSize:13,color:"#bbb"}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Who it's for */}
      <div style={{padding:"48px 24px",maxWidth:900,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:11,color:"#bbb",fontWeight:500,letterSpacing:1,marginBottom:8}}>WHO IT'S FOR</div>
          <div style={{fontSize:28,fontWeight:500}}>Built for the whole community</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
          {[
            {icon:"👨‍👩‍👧",title:"For parents & pupils",text:"Follow your school and get live scores from parents, pupils and coaches at the match. Never miss a goal, wicket or try again."},
            {icon:"🏫",title:"For schools",text:"Your own school page with logo, colours and full fixture history. Premium schools can even earn revenue through a page sponsorship."},
            {icon:"🤝",title:"For sponsors",text:"Reach thousands of engaged school sports parents and pupils. Sponsor a sport, a school, or a region. Hyper-targeted and brand-safe."},
          ].map(({icon,title,text})=>(
            <div key={title} style={{background:"#1a1a1a",border:"0.5px solid #2a2a2a",borderRadius:16,padding:24}}>
              <div style={{fontSize:24,marginBottom:12}}>{icon}</div>
              <div style={{fontSize:16,fontWeight:500,marginBottom:8}}>{title}</div>
              <div style={{fontSize:13,color:"#ccc",lineHeight:1.6}}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{borderTop:"0.5px solid #222",padding:"48px 24px",maxWidth:900,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:11,color:"#bbb",fontWeight:500,letterSpacing:1,marginBottom:8}}>HOW IT WORKS</div>
          <div style={{fontSize:28,fontWeight:500}}>Crowdsourced, not corporate</div>
          <div style={{fontSize:15,color:"#bbb",marginTop:12,maxWidth:480,marginLeft:"auto",marginRight:"auto",lineHeight:1.6}}>
            Anyone at the match can post score updates. The crowd keeps the scores honest — 3 confirmations locks in the final result.
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16}}>
          {[
            {icon:"📍",title:"At the match",text:"Parent, pupil or coach posts a score update from the sideline"},
            {icon:"⚡",title:"Instant update",text:"Score appears live for everyone following that match or school"},
            {icon:"✅",title:"Crowd confirmed",text:"3 people confirm the final score — it locks in and the match is done"},
          ].map(({icon,title,text})=>(
            <div key={title} style={{textAlign:"center",padding:"24px 16px"}}>
              <div style={{width:40,height:40,borderRadius:10,background:"#1a1a1a",border:"0.5px solid #2a2a2a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,margin:"0 auto 12px"}}>{icon}</div>
              <div style={{fontSize:14,fontWeight:500,marginBottom:6}}>{title}</div>
              <div style={{fontSize:12,color:"#bbb",lineHeight:1.5}}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{borderTop:"0.5px solid #222",padding:"64px 24px",textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:500,marginBottom:12}}>Ready to get started?</div>
        <div style={{fontSize:15,color:"#bbb",marginBottom:32}}>Free for parents and pupils. Premium options for schools.</div>
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",maxWidth:500,margin:"0 auto 16px"}}>
          <a href="/app" style={{textDecoration:"none",flex:1,minWidth:200}}>
            <div style={{background:"#fff",color:"#111",borderRadius:16,padding:"20px 24px",textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>🏟 Take me to the games</div>
              <div style={{fontSize:12,color:"#888"}}>View all live scores →</div>
            </div>
          </a>
          <a href="/schools" style={{textDecoration:"none",flex:1,minWidth:200}}>
            <div style={{background:"#1a1a1a",color:"#fff",border:"1.5px solid #fff",borderRadius:16,padding:"20px 24px",textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>🏫 Find my school</div>
              <div style={{fontSize:12,color:"#ccc"}}>Search and follow →</div>
            </div>
          </a>
        </div>
        <div style={{fontSize:12,color:"#444"}}>
          School not listed? <a href="/register-school" style={{color:"#ccc",textDecoration:"underline"}}>Register it for free →</a>
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:24,borderTop:"0.5px solid #1a1a1a",textAlign:"center"}}>
        <div style={{fontSize:12,color:"#444"}}>© 2025 SchoolScores · schoolscores.co.za</div>
      </div>

    </div>
  );
}