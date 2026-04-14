import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

const SPORTS = {
  football:   { name:"Football",   icon:"⚽" },
  rugby:      { name:"Rugby",      icon:"🏉" },
  cricket:    { name:"Cricket",    icon:"🏏" },
  netball:    { name:"Netball",    icon:"🏐" },
  hockey:     { name:"Hockey",     icon:"🏑" },
  basketball: { name:"Basketball", icon:"🏀" },
  tennis:     { name:"Tennis",     icon:"🎾" },
};

const SPORT_NAME_TO_KEY = Object.fromEntries(
  Object.entries(SPORTS).map(([k,v]) => [v.name.toLowerCase(), k])
);

const TEAM_DESCRIPTIONS = ["1st XI","2nd XI","3rd XI","U10","U11","U12","U13","U14","U15","U16","U17","U18","A Team","B Team","C Team","Senior","Junior"];
const KNOWN_SCHOOLS = ["St John's","Riverside High","Northview","Greenfield","Westpark","Lakeside","Cedar Park"];

function normalize(s) { return s.trim().toLowerCase().replace(/\s+/g," "); }
function timeAgo(ts) {
  const s = Math.floor((Date.now()-ts)/1000);
  if (s<60) return "just now";
  if (s<3600) return Math.floor(s/60)+"m ago";
  if (s<86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}
function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
}

function mapMatch(m) {
  const sportKey = SPORT_NAME_TO_KEY[m.sport?.name?.toLowerCase()] ?? "football";
  return {
    id: m.id,
    sport: sportKey,
    homeTeam: m.home_school?.name ?? "",
    homeDesc: m.home_team_desc ?? "",
    awayTeam: m.away_school?.name ?? "",
    awayDesc: m.away_team_desc ?? "",
    homeScore: m.scores?.home_score ?? 0,
    awayScore: m.scores?.away_score ?? 0,
    wickets: m.scores?.away_wickets ?? null,
    overs: m.scores?.away_overs ?? null,
    status: m.status ?? "upcoming",
    date: m.match_date ?? "",
    time: m.scheduled_at ? new Date(m.scheduled_at).toTimeString().slice(0,5) : "",
    period: m.period ?? "",
    confirmations: m.scores?.confirmed_final ? 3 : 0,
    updates: (m.spectator_updates ?? [])
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      .map(u => ({
        id: u.id,
        author: u.author_name ?? "User",
        verified: true,
        text: u.content,
        ts: new Date(u.created_at).getTime(),
      })),
  };
}

// ── UI atoms ──────────────────────────────────────────
function Badge({ status }) {
  const cfg = {
    live:     {bg:"#fee2e2",color:"#991b1b",dot:"#ef4444",label:"LIVE"},
    final:    {bg:"#f0fdf4",color:"#166534",dot:"#16a34a",label:"FINAL"},
    upcoming: {bg:"#eff6ff",color:"#1d4ed8",dot:"#3b82f6",label:"UPCOMING"},
  }[status]||{bg:"#f1f5f9",color:"#475569",dot:"#94a3b8",label:status};
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,background:cfg.bg,color:cfg.color,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:500}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:cfg.dot,display:"inline-block"}}/>
      {cfg.label}
    </span>
  );
}

const pill = active => ({
  whiteSpace:"nowrap",padding:"5px 12px",borderRadius:20,border:"0.5px solid",
  borderColor:active?"#1d4ed8":"var(--color-border-tertiary)",
  background:active?"#eff6ff":"var(--color-background-primary)",
  color:active?"#1d4ed8":"var(--color-text-secondary)",
  fontSize:12,cursor:"pointer",
});

const inputStyle = {width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:14,fontFamily:"inherit"};
const labelStyle = {fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4};

function Combobox({value,onChange,options,placeholder}) {
  const [open,setOpen]=useState(false);
  const filtered=options.filter(o=>o.toLowerCase().includes(value.toLowerCase())&&normalize(o)!==normalize(value));
  return (
    <div style={{position:"relative"}}>
      <input value={value} onChange={e=>{onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)} placeholder={placeholder} style={inputStyle}/>
      {open&&filtered.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,zIndex:10,maxHeight:160,overflowY:"auto"}}>
          {filtered.map(o=>(
            <div key={o} onMouseDown={()=>{onChange(o);setOpen(false);}} style={{padding:"8px 12px",fontSize:14,cursor:"pointer",color:"var(--color-text-primary)"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Auth screen ───────────────────────────────────────
function AuthScreen({onDone}) {
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");

  async function handleLogin() {
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    onDone();
  }

  async function handleRegister() {
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (pw.length<6) { setErr("Password must be at least 6 characters."); return; }
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { data: { display_name: name.trim() } }
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMessage("Account created! Check your email to confirm, then sign in.");
    setMode("login");
  }

  return (
    <div style={{maxWidth:380,margin:"0 auto",padding:"32px 24px",fontFamily:"var(--font-sans)"}}>
      <div style={{fontSize:22,fontWeight:500,color:"var(--color-text-primary)",marginBottom:4}}>School Sports</div>
      <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:28}}>{mode==="login"?"Sign in to post updates":"Create your account"}</div>
      {message&&<div style={{background:"#f0fdf4",border:"0.5px solid #bbf7d0",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#166534",marginBottom:14}}>{message}</div>}
      {err&&<div style={{background:"#fee2e2",border:"0.5px solid #fca5a5",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#991b1b",marginBottom:14}}>{err}</div>}
      {mode==="register"&&(
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Full name</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inputStyle}/>
        </div>
      )}
      <div style={{marginBottom:12}}>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="you@example.com" style={inputStyle}/>
      </div>
      <div style={{marginBottom:20}}>
        <label style={labelStyle}>Password</label>
        <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder={mode==="register"?"Min 6 characters":"Password"} style={inputStyle}/>
      </div>
      <button onClick={mode==="login"?handleLogin:handleRegister} disabled={loading}
        style={{width:"100%",padding:11,borderRadius:10,background:"#1d4ed8",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:500,marginBottom:14,opacity:loading?0.7:1}}>
        {loading?"Please wait...":(mode==="login"?"Sign in":"Create account")}
      </button>
      <div style={{textAlign:"center",fontSize:13,color:"var(--color-text-secondary)"}}>
        {mode==="login"?"Don't have an account? ":"Already have an account? "}
        <button onClick={()=>{setMode(m=>m==="login"?"register":"login");setErr("");setMessage("");}} style={{background:"none",border:"none",color:"#1d4ed8",cursor:"pointer",fontSize:13,padding:0}}>
          {mode==="login"?"Create one":"Sign in"}
        </button>
      </div>
    </div>
  );
}

// ── Profile screen ────────────────────────────────────
function ProfileScreen({user,matches,onLogout,onBack}) {
  const allSchools=useMemo(()=>{
    const s=new Set(KNOWN_SCHOOLS);
    matches.forEach(m=>{s.add(m.homeTeam);s.add(m.awayTeam);});
    return Array.from(s).sort();
  },[matches]);

  const [favSchools,setFavSchools]=useState([]);
  const [favTeams,setFavTeams]=useState([]);
  const [saved,setSaved]=useState(false);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    async function loadFavs() {
      const { data } = await supabase
        .from('user_favourites')
        .select('school:schools(name), sport:sports(name)')
        .eq('user_id', user.id);
      if (data) {
        setFavSchools(data.filter(f=>f.school).map(f=>f.school.name));
        setFavTeams(data.filter(f=>f.sport).map(f=>f.sport.name));
      }
    }
    loadFavs();
  },[user.id]);

  async function save() {
    setLoading(true);
    // Update display name in profile
    await supabase.from('profiles').update({ display_name: user.user_metadata?.display_name }).eq('id', user.id);
    setSaved(true);
    setLoading(false);
  }

  function toggleSchool(s) { setFavSchools(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s]); setSaved(false); }
  function toggleTeam(t) { setFavTeams(prev=>prev.includes(t)?prev.filter(x=>x!==t):[...prev,t]); setSaved(false); }

  const displayName = user.user_metadata?.display_name ?? user.email;

  return (
    <div style={{maxWidth:420,margin:"0 auto",padding:"0 16px 80px",fontFamily:"var(--font-sans)"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:"var(--color-text-secondary)",fontSize:14,cursor:"pointer",padding:"12px 0",display:"flex",alignItems:"center",gap:6}}>← Back</button>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:500,color:"#1d4ed8"}}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{fontSize:17,fontWeight:500,color:"var(--color-text-primary)"}}>{displayName}</div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{user.email}</div>
        </div>
      </div>

      <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:10}}>Favourite schools</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
        {allSchools.map(s=>(
          <button key={s} onClick={()=>toggleSchool(s)} style={{...pill(favSchools.includes(s)),fontSize:13}}>
            {favSchools.includes(s)?"★ ":""}{s}
          </button>
        ))}
      </div>

      <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",marginBottom:10}}>Favourite team groups</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:24}}>
        {TEAM_DESCRIPTIONS.map(t=>(
          <button key={t} onClick={()=>toggleTeam(t)} style={{...pill(favTeams.includes(t)),fontSize:13}}>
            {favTeams.includes(t)?"★ ":""}{t}
          </button>
        ))}
      </div>

      <button onClick={save} disabled={loading} style={{width:"100%",padding:11,borderRadius:10,background:"#1d4ed8",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:500,marginBottom:12,opacity:loading?0.7:1}}>
        {saved?"Saved!":"Save preferences"}
      </button>
      <button onClick={onLogout} style={{width:"100%",padding:11,borderRadius:10,background:"none",color:"#991b1b",border:"0.5px solid #fca5a5",cursor:"pointer",fontSize:14}}>
        Sign out
      </button>
    </div>
  );
}

// ── Match card ────────────────────────────────────────
function MatchCard({match,onClick}) {
  const sport=SPORTS[match.sport];
  return (
    <div onClick={()=>onClick(match.id)} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"14px 16px",cursor:"pointer",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{sport.icon} {sport.name}</span>
        <Badge status={match.status}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",alignItems:"center",gap:4}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:2}}>{match.homeTeam}</div>
          <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:4}}>{match.homeDesc}</div>
          <div style={{fontSize:28,fontWeight:500,color:"var(--color-text-primary)",lineHeight:1}}>
            {match.homeScore}{match.sport==="cricket"?<span style={{fontSize:16,color:"var(--color-text-secondary)"}}>/{match.wickets??0}</span>:""}
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:12,color:"var(--color-text-tertiary)"}}>
          <div>{match.period}</div>
          {match.time?<div style={{fontSize:11,color:"var(--color-text-secondary)",fontWeight:500}}>{match.time}</div>:null}
          <div style={{marginTop:2}}>vs</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:2}}>{match.awayTeam}</div>
          <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:4}}>{match.awayDesc}</div>
          <div style={{fontSize:28,fontWeight:500,color:"var(--color-text-primary)",lineHeight:1}}>{match.awayScore}</div>
        </div>
      </div>
      <div style={{marginTop:10,borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{fmtDate(match.date)||""}</span>
        {match.updates.length>0?<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>💬 {match.updates.length} update{match.updates.length!==1?"s":""}</span>:<span/>}
      </div>
    </div>
  );
}

// ── Add fixture ───────────────────────────────────────
function AddFixture({matches,allSchools,user,onAdd,onCancel}) {
  const [sport,setSport]=useState("");
  const [date,setDate]=useState("");
  const [time,setTime]=useState("");
  const [homeTeam,setHomeTeam]=useState("");
  const [homeDesc,setHomeDesc]=useState("");
  const [awayTeam,setAwayTeam]=useState("");
  const [awayDesc,setAwayDesc]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  async function handleAdd() {
    if (!sport) { setErr("Please select a sport."); return; }
    if (!date)  { setErr("Please select a date."); return; }
    if (!homeTeam.trim()) { setErr("Please enter the home team."); return; }
    if (!homeDesc) { setErr("Please select a description for the home team."); return; }
    if (!awayTeam.trim()) { setErr("Please enter the away team."); return; }
    if (!awayDesc) { setErr("Please select a description for the away team."); return; }
    if (normalize(homeTeam)===normalize(awayTeam)&&normalize(homeDesc)===normalize(awayDesc)) { setErr("Home and away team cannot be the same."); return; }

    setLoading(true);

    // Upsert sport
    let { data: sportRow } = await supabase.from('sports').select('id').eq('name', SPORTS[sport].name).maybeSingle();
    if (!sportRow) {
      const { data } = await supabase.from('sports').insert({ name: SPORTS[sport].name }).select('id').single();
      sportRow = data;
    }

    // Upsert schools
    async function upsertSchool(name) {
      let { data } = await supabase.from('schools').select('id').eq('name', name).maybeSingle();
      if (!data) {
        const { data: newS } = await supabase.from('schools').insert({ name }).select('id').single();
        data = newS;
      }
      return data;
    }

    const [homeSchool, awaySchool] = await Promise.all([upsertSchool(homeTeam.trim()), upsertSchool(awayTeam.trim())]);

    const { data: match, error } = await supabase.from('matches').insert({
      sport_id: sportRow.id,
      home_school_id: homeSchool.id,
      away_school_id: awaySchool.id,
      home_team_desc: homeDesc,
      away_team_desc: awayDesc,
      match_date: date,
      scheduled_at: time ? `${date}T${time}:00` : null,
      status: 'upcoming',
      period: 'Not started',
      added_by: user.id,
    }).select('id').single();

    if (error) {
      if (error.code === '23505') { setErr("This fixture already exists for that date."); }
      else { setErr(error.message); }
      setLoading(false);
      return;
    }

    // Create empty scores row
    await supabase.from('scores').insert({ match_id: match.id });
    setLoading(false);
    onAdd();
  }

  return (
    <div style={{paddingBottom:80}}>
      <button onClick={onCancel} style={{background:"none",border:"none",color:"var(--color-text-secondary)",fontSize:14,cursor:"pointer",padding:"12px 0",display:"flex",alignItems:"center",gap:6}}>← Back</button>
      <div style={{fontSize:18,fontWeight:500,color:"var(--color-text-primary)",marginBottom:16}}>Add fixture</div>
      {err&&<div style={{background:"#fee2e2",border:"0.5px solid #fca5a5",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#991b1b",marginBottom:14}}>{err}</div>}
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Sport</label>
        <select value={sport} onChange={e=>{setSport(e.target.value);setErr("");}} style={inputStyle}>
          <option value="">Select sport...</option>
          {Object.entries(SPORTS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.name}</option>)}
        </select>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={e=>{setDate(e.target.value);setErr("");}} style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>Start time</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inputStyle}/>
        </div>
      </div>
      {[["Home team",homeTeam,setHomeTeam,homeDesc,setHomeDesc],["Away team",awayTeam,setAwayTeam,awayDesc,setAwayDesc]].map(([label,team,setTeam,desc,setDesc])=>(
        <div key={label} style={{background:"var(--color-background-secondary)",borderRadius:10,padding:12,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:10}}>{label}</div>
          <div style={{marginBottom:10}}>
            <label style={labelStyle}>School name</label>
            <Combobox value={team} onChange={v=>{setTeam(v);setErr("");}} options={allSchools} placeholder="Type or select school..."/>
          </div>
          <div>
            <label style={labelStyle}>Team description</label>
            <select value={desc} onChange={e=>{setDesc(e.target.value);setErr("");}} style={inputStyle}>
              <option value="">Select description...</option>
              {TEAM_DESCRIPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      ))}
      <button onClick={handleAdd} disabled={loading} style={{width:"100%",padding:12,borderRadius:10,background:"#1d4ed8",color:"#fff",border:"none",cursor:"pointer",fontSize:15,fontWeight:500,marginTop:8,opacity:loading?0.7:1}}>
        {loading?"Adding...":"Add fixture"}
      </button>
    </div>
  );
}

// ── Match detail ──────────────────────────────────────
function MatchDetail({match,user,onBack,onMatchUpdated}) {
  const [msg,setMsg]=useState("");
  const [showScore,setShowScore]=useState(false);
  const [hScore,setHScore]=useState(String(match.homeScore));
  const [aScore,setAScore]=useState(String(match.awayScore));
  const [hasVoted,setHasVoted]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const isCricket=match.sport==="cricket";
  const [wickets,setWickets]=useState(String(match.wickets??0));
  const [overs,setOvers]=useState(String(match.overs??0));
  const sport=SPORTS[match.sport];
  const confirmations=match.confirmations||0;
  const scoreLocked=confirmations>=3;

  async function submitUpdate() {
    if (!msg.trim()||!user) return;
    setSubmitting(true);
    await supabase.from('spectator_updates').insert({
      match_id: match.id,
      user_id: user.id,
      content: msg.trim(),
      author_name: user.user_metadata?.display_name ?? user.email,
    });
    setMsg("");
    setSubmitting(false);
    onMatchUpdated();
  }

async function submitScore() {
  const update = {
    home_score: Number(hScore),
    away_score: Number(aScore),
    updated_at: new Date().toISOString(),
  };
  if (isCricket) {
    update.away_wickets = Number(wickets);
    update.away_overs = Number(overs);
  }
  const { data, error } = await supabase
    .from('scores')
    .update(update)
    .eq('match_id', match.id);
  console.log('score update result:', data, error);

  const { data: mData, error: mError } = await supabase
    .from('matches')
    .update({ status: 'live' })
    .eq('id', match.id);
  console.log('match update result:', mData, mError);

  setShowScore(false);
  onMatchUpdated();
}

  async function handleConfirm() {
    if (hasVoted||scoreLocked) return;
    setHasVoted(true);
    const newCount = confirmations + 1;
    const isFinal = newCount >= 3;
    await supabase.from('scores').update({ confirmed_final: isFinal }).eq('match_id', match.id);
    if (isFinal) {
      await supabase.from('matches').update({ status: 'final' }).eq('id', match.id);
      await supabase.from('spectator_updates').insert({
        match_id: match.id,
        user_id: user?.id ?? null,
        content: `Score confirmed as final: ${match.homeTeam} ${match.homeDesc} ${match.homeScore} – ${match.awayScore} ${match.awayTeam} ${match.awayDesc}`,
      });
    }
    onMatchUpdated();
  }

  return (
    <div style={{paddingBottom:80}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:"var(--color-text-secondary)",fontSize:14,cursor:"pointer",padding:"12px 0",display:"flex",alignItems:"center",gap:6}}>← Back</button>
      <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:16,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:14,color:"var(--color-text-secondary)"}}>{sport.icon} {sport.name}</span>
          <Badge status={match.status}/>
        </div>
        {match.date&&<div style={{textAlign:"center",fontSize:12,color:"var(--color-text-tertiary)",marginBottom:10}}>{fmtDate(match.date)}{match.time?" · "+match.time:""}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",alignItems:"center",gap:4,marginBottom:12}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:2}}>{match.homeTeam}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:6}}>{match.homeDesc}</div>
            {isCricket?(<>
              <div style={{fontSize:36,fontWeight:500,lineHeight:1}}>{match.homeScore}<span style={{fontSize:20,color:"var(--color-text-secondary)"}}>/{match.wickets??0}</span></div>
              <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:4}}>{match.overs??0} overs</div>
            </>):<div style={{fontSize:48,fontWeight:500,lineHeight:1}}>{match.homeScore}</div>}
          </div>
          <div style={{textAlign:"center",fontSize:12,color:"var(--color-text-tertiary)"}}>
            <div>{match.period}</div>
            {match.time&&!match.date?<div style={{marginTop:2}}>{match.time}</div>:null}
            <div style={{marginTop:4}}>vs</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:2}}>{match.awayTeam}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:6}}>{match.awayDesc}</div>
            <div style={{fontSize:48,fontWeight:500,lineHeight:1}}>{match.awayScore}</div>
          </div>
        </div>

        {/* Confirm strip */}
        <div style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"10px 14px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{scoreLocked?"Score confirmed as final":`Confirm final score (${confirmations}/3)`}</span>
            {!scoreLocked&&<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{3-confirmations} more needed</span>}
          </div>
          <div style={{height:4,borderRadius:4,background:"var(--color-border-tertiary)",marginBottom:10,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:4,width:`${Math.min((confirmations/3)*100,100)}%`,background:scoreLocked?"#16a34a":"#1d4ed8",transition:"width 0.3s"}}/>
          </div>
          {scoreLocked?<div style={{textAlign:"center",fontSize:12,color:"#16a34a",fontWeight:500}}>Score locked — no further updates allowed</div>:(
            <button onClick={handleConfirm} disabled={hasVoted}
              style={{width:"100%",padding:"7px",borderRadius:8,background:hasVoted?"var(--color-background-primary)":"#1d4ed8",color:hasVoted?"var(--color-text-secondary)":"#fff",border:hasVoted?"0.5px solid var(--color-border-tertiary)":"none",cursor:hasVoted?"not-allowed":"pointer",fontSize:13,fontWeight:500}}>
              {hasVoted?"You've confirmed this score":"Confirm as final score"}
            </button>
          )}
        </div>

        {!scoreLocked&&user&&(
          <div style={{textAlign:"center"}}>
            <button onClick={()=>setShowScore(s=>!s)} style={{fontSize:11,color:"var(--color-text-tertiary)",background:"none",border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>
              {showScore?"Close score update":"Update score"}
            </button>
          </div>
        )}
        {!scoreLocked&&!user&&(
          <div style={{textAlign:"center",fontSize:11,color:"var(--color-text-tertiary)",marginTop:6}}>Sign in to update the score</div>
        )}
        {!scoreLocked&&showScore&&user&&(
          <div style={{marginTop:10,background:"var(--color-background-secondary)",borderRadius:8,padding:12}}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:8}}>Score update</div>
            {isCricket?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                {[["Runs",hScore,setHScore,1,null],["Wickets",wickets,setWickets,1,10],["Overs",overs,setOvers,0.1,null]].map(([lbl,val,set,step,max])=>(
                  <div key={lbl}><label style={labelStyle}>{lbl}</label>
                    <input type="number" min="0" step={step} max={max||undefined} value={val} onChange={e=>set(e.target.value)} style={{...inputStyle,padding:"6px 8px",fontSize:15}}/>
                  </div>
                ))}
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                {[[match.homeTeam,hScore,setHScore],[match.awayTeam,aScore,setAScore]].map(([lbl,val,set])=>(
                  <div key={lbl}><label style={labelStyle}>{lbl}</label>
                    <input type="number" min="0" value={val} onChange={e=>set(e.target.value)} style={{...inputStyle,padding:"6px 10px",fontSize:16}}/>
                  </div>
                ))}
              </div>
            )}
            <button onClick={submitScore} style={{width:"100%",padding:8,borderRadius:8,background:"#1d4ed8",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:500}}>Save score</button>
          </div>
        )}
      </div>

      {/* Feed */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:10}}>Live updates</div>
        {match.updates.length===0&&<div style={{textAlign:"center",color:"var(--color-text-tertiary)",fontSize:13,padding:"24px 0"}}>No updates yet — be the first to post!</div>}
        {match.updates.map(u=>(
          <div key={u.id} style={{background:u.author==="System"?"#f0fdf4":"var(--color-background-primary)",border:`0.5px solid ${u.author==="System"?"#bbf7d0":"var(--color-border-tertiary)"}`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:500,color:u.author==="System"?"#16a34a":"var(--color-text-primary)"}}>
                {u.author}
                {u.verified&&u.author!=="System"&&<span style={{fontSize:10,background:"#eff6ff",color:"#1d4ed8",borderRadius:10,padding:"1px 6px"}}>verified</span>}
              </span>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{timeAgo(u.ts)}</span>
            </div>
            <div style={{fontSize:14,color:"var(--color-text-primary)"}}>{u.text}</div>
          </div>
        ))}
      </div>

      {/* Post update */}
      <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:"var(--color-text-primary)"}}>Post an update</div>
        {user?(
          <>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:8}}>
              Posting as <strong style={{fontWeight:500}}>{user.user_metadata?.display_name ?? user.email}</strong>
              <span style={{background:"#eff6ff",color:"#1d4ed8",borderRadius:10,padding:"1px 6px",fontSize:10,marginLeft:6}}>verified</span>
            </div>
            <textarea placeholder="What's happening? Share a score update, goal, wicket..." value={msg} onChange={e=>setMsg(e.target.value)} rows={3}
              style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14,resize:"none",fontFamily:"inherit"}}/>
            <button onClick={submitUpdate} disabled={!msg.trim()||submitting}
              style={{marginTop:8,width:"100%",padding:10,borderRadius:8,background:msg.trim()?"#1d4ed8":"#94a3b8",color:"#fff",border:"none",cursor:msg.trim()?"pointer":"not-allowed",fontSize:14,fontWeight:500,transition:"background 0.15s"}}>
              {submitting?"Posting...":"Post update"}
            </button>
          </>
        ):(
          <div style={{textAlign:"center",padding:"16px 0",color:"var(--color-text-secondary)",fontSize:13}}>
            You must be signed in to post updates.
          </div>
        )}
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [matches,setMatches]=useState([]);
  const [matchesLoading,setMatchesLoading]=useState(true);
  const [selectedId,setSelectedId]=useState(null);
  const [screen,setScreen]=useState("home");
  const [statusFilter,setStatusFilter]=useState("all");
  const [sportFilter,setSportFilter]=useState("all");
  const [schoolSearch,setSchoolSearch]=useState("");
  const [showFilters,setShowFilters]=useState(false);
  const [favOnly,setFavOnly]=useState(false);

  // Auth listener
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user??null);
      setAuthLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setUser(session?.user??null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  const loadMatches = useCallback(async ()=>{
    setMatchesLoading(true);
    const {data,error}=await supabase
      .from('matches')
      .select(`
        *,
        scores(*),
        spectator_updates(*),
        sport:sports(name),
        home_school:schools!home_school_id(name),
        away_school:schools!away_school_id(name)
      `)
      .order('match_date',{ascending:false});
    if (!error&&data) setMatches(data.map(mapMatch));
    setMatchesLoading(false);
  },[]);

  useEffect(()=>{ loadMatches(); },[loadMatches]);

  // Realtime subscription
  useEffect(()=>{
    const channel=supabase
      .channel('match-changes')
      .on('postgres_changes',{event:'*',schema:'public',table:'scores'},()=>loadMatches())
      .on('postgres_changes',{event:'*',schema:'public',table:'spectator_updates'},()=>loadMatches())
      .on('postgres_changes',{event:'*',schema:'public',table:'matches'},()=>loadMatches())
      .subscribe();
    return ()=>supabase.removeChannel(channel);
  },[loadMatches]);

  const allSchools=useMemo(()=>{
    const s=new Set(KNOWN_SCHOOLS);
    matches.forEach(m=>{s.add(m.homeTeam);s.add(m.awayTeam);});
    return Array.from(s).sort();
  },[matches]);

  const filtered=useMemo(()=>matches.filter(m=>{
    if (statusFilter!=="all"&&m.status!==statusFilter) return false;
    if (sportFilter!=="all"&&m.sport!==sportFilter) return false;
    if (schoolSearch.trim()){const q=schoolSearch.toLowerCase();if(!m.homeTeam.toLowerCase().includes(q)&&!m.awayTeam.toLowerCase().includes(q))return false;}
    return true;
  }),[matches,statusFilter,sportFilter,schoolSearch]);

  const selected=matches.find(m=>m.id===selectedId)||null;

  async function handleLogout(){
    await supabase.auth.signOut();
    setUser(null);
    setScreen("home");
    setFavOnly(false);
  }

  if (authLoading) return <div style={{textAlign:"center",padding:40,color:"var(--color-text-secondary)",fontFamily:"var(--font-sans)"}}>Loading...</div>;
  if (screen==="auth") return <AuthScreen onDone={()=>setScreen("home")}/>;
  if (screen==="profile"&&user) return <div style={{maxWidth:420,margin:"0 auto",padding:"0 16px",fontFamily:"var(--font-sans)"}}><ProfileScreen user={user} matches={matches} onLogout={handleLogout} onBack={()=>setScreen("home")}/></div>;
  if (screen==="add"&&user) return <div style={{maxWidth:420,margin:"0 auto",padding:"0 16px",fontFamily:"var(--font-sans)"}}><AddFixture matches={matches} allSchools={allSchools} user={user} onAdd={()=>{loadMatches();setScreen("home");}} onCancel={()=>setScreen("home")}/></div>;
  if (selected) return <div style={{maxWidth:420,margin:"0 auto",padding:"0 16px",fontFamily:"var(--font-sans)"}}><MatchDetail match={selected} user={user} onBack={()=>setSelectedId(null)} onMatchUpdated={()=>{loadMatches();}}/></div>;

  const anyFilter=statusFilter!=="all"||sportFilter!=="all"||schoolSearch.trim();

  return (
    <div style={{maxWidth:420,margin:"0 auto",padding:"0 16px",fontFamily:"var(--font-sans)"}}>
      {/* Header */}
      <div style={{padding:"16px 0 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:20,fontWeight:500,color:"var(--color-text-primary)"}}>School Sports</div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Today's fixtures</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {user?(
            <button onClick={()=>setScreen("profile")} style={{width:34,height:34,borderRadius:"50%",background:"#eff6ff",border:"none",cursor:"pointer",fontSize:15,fontWeight:500,color:"#1d4ed8"}}>
              {(user.user_metadata?.display_name??user.email).charAt(0).toUpperCase()}
            </button>
          ):(
            <button onClick={()=>setScreen("auth")} style={{padding:"6px 14px",borderRadius:20,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              Sign in
            </button>
          )}
          <button onClick={()=>user?setScreen("add"):setScreen("auth")} style={{padding:"6px 14px",borderRadius:20,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            + Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{position:"relative",marginBottom:10}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"var(--color-text-tertiary)"}}>🔍</span>
        <input placeholder="Search by school name..." value={schoolSearch} onChange={e=>setSchoolSearch(e.target.value)}
          style={{width:"100%",boxSizing:"border-box",padding:"9px 32px",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:14,fontFamily:"inherit"}}/>
        {schoolSearch&&<button onClick={()=>setSchoolSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--color-text-tertiary)",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>×</button>}
      </div>

      {/* Filter row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
          {["all","live","final","upcoming"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)} style={pill(statusFilter===s)}>
              {s==="all"?"All":s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowFilters(f=>!f)} style={{...pill(showFilters||sportFilter!=="all"),marginLeft:6,flexShrink:0}}>🎯 Sport</button>
      </div>

      {showFilters&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,padding:"10px 12px",background:"var(--color-background-secondary)",borderRadius:10}}>
          <button onClick={()=>setSportFilter("all")} style={pill(sportFilter==="all")}>All sports</button>
          {Object.entries(SPORTS).map(([k,s])=>(
            <button key={k} onClick={()=>setSportFilter(k)} style={pill(sportFilter===k)}>{s.icon} {s.name}</button>
          ))}
        </div>
      )}

      <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:10}}>
        {matchesLoading?"Loading matches...":`${filtered.length} match${filtered.length!==1?"es":""}`}
        {anyFilter&&!matchesLoading&&<> · <button onClick={()=>{setStatusFilter("all");setSportFilter("all");setSchoolSearch("");}} style={{background:"none",border:"none",color:"#1d4ed8",cursor:"pointer",fontSize:12,padding:0}}>Clear filters</button></>}
      </div>

      {matchesLoading?(
        <div style={{textAlign:"center",padding:"40px 0",color:"var(--color-text-tertiary)"}}>
          <div style={{fontSize:14}}>Loading matches...</div>
        </div>
      ):filtered.length===0?(
        <div style={{textAlign:"center",padding:"40px 0",color:"var(--color-text-tertiary)"}}>
          <div style={{fontSize:32,marginBottom:8}}>🏆</div>
          <div style={{fontSize:14}}>No matches yet</div>
          <div style={{fontSize:12,marginTop:4}}>Add a fixture to get started</div>
        </div>
      ):filtered.map(m=><MatchCard key={m.id} match={m} onClick={id=>setSelectedId(id)}/>)}
    </div>
  );
}