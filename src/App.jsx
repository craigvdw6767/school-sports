import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import Landing from "./Landing";
import SchoolPage from "./SchoolPage";
import SchoolsPage from "./SchoolsPage";

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

const TEAM_DESCRIPTIONS = [
  "1st Team","2nd Team","3rd Team","4th Team","5th Team","6th Team","7th Team","8th Team",
  "U10","U11","U12","U13","U14","U15","U16","U17","U18",
  "A Team","B Team","C Team",
  "Senior","Junior"
];

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
function initials(name) {
  return name.split(" ").filter(Boolean).slice(0,3).map(w=>w[0]).join("").toUpperCase();
}

const BADGE_COLORS = [
  {bg:"#e6f1fb",color:"#185fa5"},
  {bg:"#faeeda",color:"#854f0b"},
  {bg:"#eeedfe",color:"#534ab7"},
  {bg:"#faece7",color:"#993c1d"},
  {bg:"#e1f5ee",color:"#0f6e56"},
  {bg:"#fbeaf0",color:"#993556"},
];
function badgeColor(name) {
  let h = 0;
  for (let i=0;i<name.length;i++) h = (h*31+name.charCodeAt(i))&0xffff;
  return BADGE_COLORS[h % BADGE_COLORS.length];
}

function SchoolBadge({name, size=40}) {
  const c = badgeColor(name);
  return (
    <div style={{width:size,height:size,borderRadius:10,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.28,fontWeight:500,color:c.color,flexShrink:0}}>
      {initials(name)}
    </div>
  );
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

// ── Styles ────────────────────────────────────────────
const S = {
  darkHeader: {background:"#111",padding:"14px 16px"},
  card: {background:"#fff",borderRadius:14,border:"0.5px solid #e8e8e4",padding:"14px"},
  cardSection: {background:"#fff",borderRadius:14,border:"0.5px solid #e8e8e4",padding:"12px 14px"},
  sectionLabel: {fontSize:11,color:"#888",fontWeight:500,letterSpacing:"0.5px",marginBottom:10},
  btnPrimary: {width:"100%",padding:"10px",borderRadius:10,background:"#111",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:500},
  btnSecondary: {background:"none",border:"0.5px solid #e0e0dc",borderRadius:8,padding:"5px 12px",fontSize:12,color:"#666",cursor:"pointer"},
  input: {width:"100%",boxSizing:"border-box",padding:"9px 11px",borderRadius:8,border:"0.5px solid #e0e0dc",background:"#f9f9f7",color:"#111",fontSize:14,fontFamily:"inherit"},
  label: {fontSize:11,color:"#888",display:"block",marginBottom:4},
  page: {maxWidth:420,margin:"0 auto",fontFamily:"var(--font-sans)"},
};

function StatusBadge({status}) {
  const cfg = {
    live:     {bg:"#fef2f2",color:"#c00",dot:"#ef4444",label:"LIVE"},
    final:    {bg:"#f0fdf4",color:"#166534",dot:"#16a34a",label:"FINAL"},
    upcoming: {bg:"#f5f5f3",color:"#666",dot:"#bbb",label:"UPCOMING"},
  }[status]||{bg:"#f5f5f3",color:"#666",dot:"#bbb",label:status};
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:cfg.bg,color:cfg.color,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:500}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:cfg.dot,display:"inline-block"}}/>
      {cfg.label}
    </span>
  );
}

const pill = active => ({
  whiteSpace:"nowrap",padding:"5px 12px",borderRadius:20,border:"0.5px solid",
  borderColor:active?"#fff":"transparent",
  background:active?"#fff":"#1a1a1a",
  color:active?"#111":"#888",
  fontSize:12,cursor:"pointer",fontFamily:"inherit",
});

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
    const { error } = await supabase.auth.signUp({ email, password: pw, options: { data: { display_name: name.trim() } } });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMessage("Account created! Check your email to confirm, then sign in.");
    setMode("login");
  }

  return (
    <div style={{minHeight:"100vh",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:24,fontWeight:500,color:"#fff",marginBottom:4}}>School Scores</div>
          <div style={{fontSize:13,color:"#666"}}>{mode==="login"?"Sign in to your account":"Create your account"}</div>
        </div>
        <div style={{background:"#1a1a1a",borderRadius:16,padding:24}}>
          {message&&<div style={{background:"#0f2b1a",border:"0.5px solid #1a4a2a",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#4ade80",marginBottom:14}}>{message}</div>}
          {err&&<div style={{background:"#2b0f0f",border:"0.5px solid #4a1a1a",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#f87171",marginBottom:14}}>{err}</div>}
          {mode==="register"&&(
            <div style={{marginBottom:12}}>
              <label style={{...S.label,color:"#666"}}>Full name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{...S.input,background:"#222",border:"0.5px solid #333",color:"#fff"}}/>
            </div>
          )}
          <div style={{marginBottom:12}}>
            <label style={{...S.label,color:"#666"}}>Email</label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="you@example.com" style={{...S.input,background:"#222",border:"0.5px solid #333",color:"#fff"}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{...S.label,color:"#666"}}>Password</label>
            <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder={mode==="register"?"Min 6 characters":"Password"} style={{...S.input,background:"#222",border:"0.5px solid #333",color:"#fff"}}/>
          </div>
          <button onClick={mode==="login"?handleLogin:handleRegister} disabled={loading}
            style={{...S.btnPrimary,background:"#fff",color:"#111",opacity:loading?0.7:1,marginBottom:16}}>
            {loading?"Please wait...":(mode==="login"?"Sign in":"Create account")}
          </button>
          <div style={{textAlign:"center",fontSize:13,color:"#666"}}>
            {mode==="login"?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>{setMode(m=>m==="login"?"register":"login");setErr("");setMessage("");}} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:13,padding:0}}>
              {mode==="login"?"Create one":"Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile screen ────────────────────────────────────
function ProfileScreen({user,onLogout,onBack}) {
  const displayName = user.user_metadata?.display_name ?? user.email;
  const [saved,setSaved]=useState(false);

  return (
    <div style={S.page}>
      <div style={S.darkHeader}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",padding:0}}>← Back</button>
          <div style={{fontSize:14,fontWeight:500,color:"#fff"}}>Profile</div>
          <div style={{width:40}}/>
        </div>
      </div>
      <div style={{padding:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,padding:"16px",background:"#fff",borderRadius:14,border:"0.5px solid #e8e8e4"}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:500,color:"#fff"}}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:500,color:"#111"}}>{displayName}</div>
            <div style={{fontSize:12,color:"#888"}}>{user.email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{...S.btnPrimary,background:"#fef2f2",color:"#c00",border:"0.5px solid #fca5a5"}}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Match card ────────────────────────────────────────
function MatchCard({match}) {
  const navigate = useNavigate();
  const sport = SPORTS[match.sport];
  const isCricket = match.sport==="cricket";

  return (
    <div onClick={()=>navigate(`/match/${match.id}`)}
      style={{background:"#fff",border:"0.5px solid #e8e8e4",borderRadius:14,marginBottom:10,cursor:"pointer",overflow:"hidden"}}>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:11,color:"#888",fontWeight:500}}>{sport.icon} {sport.name.toUpperCase()}</span>
          <StatusBadge status={match.status}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 48px 1fr",alignItems:"center",gap:4}}>
          <div style={{textAlign:"center"}}>
            <SchoolBadge name={match.homeTeam} size={38}/>
            <div style={{fontSize:11,color:"#333",fontWeight:500,marginTop:6,marginBottom:1}}>{match.homeTeam}</div>
            <div style={{fontSize:10,color:"#aaa",marginBottom:6}}>{match.homeDesc}</div>
            <div style={{fontSize:32,fontWeight:500,color:"#111",lineHeight:1}}>
              {match.status==="upcoming"?"–":match.homeScore}
              {isCricket&&match.status!=="upcoming"?<span style={{fontSize:16,color:"#aaa"}}>/{match.wickets??0}</span>:""}
            </div>
            {isCricket&&match.status!=="upcoming"&&<div style={{fontSize:10,color:"#aaa",marginTop:2}}>{match.overs??0} ov</div>}
          </div>
          <div style={{textAlign:"center"}}>
            {match.status==="live"&&match.time&&<div style={{fontSize:11,color:"#ef4444",fontWeight:500,marginBottom:2}}>{match.time}</div>}
            {match.status==="upcoming"&&match.time&&<div style={{fontSize:11,color:"#888",marginBottom:2}}>{match.time}</div>}
            <div style={{fontSize:12,color:"#ccc"}}>vs</div>
          </div>
          <div style={{textAlign:"center"}}>
            <SchoolBadge name={match.awayTeam} size={38}/>
            <div style={{fontSize:11,color:"#333",fontWeight:500,marginTop:6,marginBottom:1}}>{match.awayTeam}</div>
            <div style={{fontSize:10,color:"#aaa",marginBottom:6}}>{match.awayDesc}</div>
            <div style={{fontSize:32,fontWeight:500,color:"#111",lineHeight:1}}>
              {match.status==="upcoming"?"–":match.awayScore}
            </div>
          </div>
        </div>
      </div>
      <div style={{padding:"8px 14px",borderTop:"0.5px solid #f5f5f3",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafaf8"}}>
        <span style={{fontSize:10,color:"#aaa"}}>{fmtDate(match.date)||""}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {match.updates.length>0&&<span style={{fontSize:11,color:"#aaa"}}>💬 {match.updates.length}</span>}
          <button onClick={e=>{e.stopPropagation();const url=`${window.location.origin}/match/${match.id}`;if(navigator.share){navigator.share({title:`${match.homeTeam} vs ${match.awayTeam}`,url});}else{navigator.clipboard.writeText(url);alert("Link copied!");}}}
            style={{background:"none",border:"0.5px solid #e0e0dc",borderRadius:6,padding:"2px 8px",fontSize:10,color:"#888",cursor:"pointer"}}>
            🔗 Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ── School picker ─────────────────────────────────────
function SchoolPicker({label, searchVal, setSearchVal, selectedId, setSelectedId, filtered, schoolsList}) {
  const [open, setOpen] = useState(false);
  const selected = schoolsList.find(s => s.id === selectedId);
  return (
    <div style={{marginBottom:10}}>
      <label style={S.label}>{label}</label>
      {selected ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,border:"0.5px solid #e0e0dc",background:"#f9f9f7"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <SchoolBadge name={selected.name} size={28}/>
            <div>
              <div style={{fontSize:13,color:"#111",fontWeight:500}}>{selected.name}</div>
              {selected.city&&<div style={{fontSize:11,color:"#aaa"}}>{selected.city}</div>}
            </div>
          </div>
          <button onClick={()=>{setSelectedId("");setSearchVal("");}} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>×</button>
        </div>
      ) : (
        <div style={{position:"relative"}}>
          <input value={searchVal} onChange={e=>{setSearchVal(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)} placeholder="Search school..." style={S.input}/>
          {open&&filtered.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"0.5px solid #e0e0dc",borderRadius:8,zIndex:10,maxHeight:200,overflowY:"auto",boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>
              {filtered.map(s=>(
                <div key={s.id} onMouseDown={()=>{setSelectedId(s.id);setSearchVal("");setOpen(false);}}
                  style={{padding:"10px 12px",cursor:"pointer",borderBottom:"0.5px solid #f5f5f3",display:"flex",alignItems:"center",gap:10}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f9f9f7"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <SchoolBadge name={s.name} size={28}/>
                  <div>
                    <div style={{fontSize:13,color:"#111"}}>{s.name}</div>
                    {s.city&&<div style={{fontSize:11,color:"#aaa"}}>{s.city}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add fixture ───────────────────────────────────────
function AddFixture({schoolsList, user, onAdd, onCancel}) {
  const [sport,setSport]=useState("");
  const [date,setDate]=useState("");
  const [time,setTime]=useState("");
  const [homeSchoolId,setHomeSchoolId]=useState("");
  const [homeDesc,setHomeDesc]=useState("");
  const [awaySchoolId,setAwaySchoolId]=useState("");
  const [awayDesc,setAwayDesc]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [homeSearch,setHomeSearch]=useState("");
  const [awaySearch,setAwaySearch]=useState("");

  const filteredHome = schoolsList.filter(s=>s.name.toLowerCase().includes(homeSearch.toLowerCase()));
  const filteredAway = schoolsList.filter(s=>s.name.toLowerCase().includes(awaySearch.toLowerCase()));

  async function handleAdd() {
    if (!sport) { setErr("Please select a sport."); return; }
    if (!date) { setErr("Please select a date."); return; }
    if (!homeSchoolId) { setErr("Please select the home school."); return; }
    if (!homeDesc) { setErr("Please select a description for the home team."); return; }
    if (!awaySchoolId) { setErr("Please select the away school."); return; }
    if (!awayDesc) { setErr("Please select a description for the away team."); return; }
    if (homeSchoolId===awaySchoolId&&homeDesc===awayDesc) { setErr("Home and away team cannot be the same."); return; }
    setLoading(true);
    let { data: sportRow } = await supabase.from('sports').select('id').eq('name', SPORTS[sport].name).maybeSingle();
    if (!sportRow) {
      const { data } = await supabase.from('sports').insert({ name: SPORTS[sport].name }).select('id').single();
      sportRow = data;
    }
    const { data: match, error } = await supabase.from('matches').insert({
      sport_id: sportRow.id,
      home_school_id: homeSchoolId,
      away_school_id: awaySchoolId,
      home_team_desc: homeDesc,
      away_team_desc: awayDesc,
      match_date: date,
      scheduled_at: time ? `${date}T${time}:00` : null,
      status: 'upcoming',
      period: 'Not started',
      added_by: user.id,
    }).select('id').single();
    if (error) {
      if (error.code==='23505') { setErr("This fixture already exists for that date."); }
      else { setErr(error.message); }
      setLoading(false); return;
    }
    await supabase.from('scores').insert({ match_id: match.id });
    setLoading(false);
    onAdd();
  }

  return (
    <div style={S.page}>
      <div style={S.darkHeader}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={onCancel} style={{background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",padding:0}}>← Back</button>
          <div style={{fontSize:14,fontWeight:500,color:"#fff"}}>Add fixture</div>
          <div style={{width:40}}/>
        </div>
      </div>
      <div style={{padding:16,paddingBottom:80}}>
        {err&&<div style={{background:"#2b0f0f",border:"0.5px solid #4a1a1a",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#f87171",marginBottom:14}}>{err}</div>}
        <div style={{...S.cardSection,marginBottom:12}}>
          <div style={S.sectionLabel}>Sport & date</div>
          <div style={{marginBottom:10}}>
            <label style={S.label}>Sport</label>
            <select value={sport} onChange={e=>{setSport(e.target.value);setErr("");}} style={S.input}>
              <option value="">Select sport...</option>
              {Object.entries(SPORTS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.name}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={S.label}>Date</label>
              <input type="date" value={date} onChange={e=>{setDate(e.target.value);setErr("");}} style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Start time</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={S.input}/>
            </div>
          </div>
        </div>
        {[
          ["Home team",homeSearch,setHomeSearch,homeSchoolId,setHomeSchoolId,filteredHome,homeDesc,setHomeDesc],
          ["Away team",awaySearch,setAwaySearch,awaySchoolId,setAwaySchoolId,filteredAway,awayDesc,setAwayDesc],
        ].map(([label,searchVal,setSearchVal,selectedId,setSelectedId,filtered,desc,setDesc])=>(
          <div key={label} style={{...S.cardSection,marginBottom:12}}>
            <div style={S.sectionLabel}>{label.toUpperCase()}</div>
            <SchoolPicker label="School" searchVal={searchVal} setSearchVal={setSearchVal} selectedId={selectedId} setSelectedId={setSelectedId} filtered={filtered} schoolsList={schoolsList}/>
            <div>
              <label style={S.label}>Team</label>
              <select value={desc} onChange={e=>{setDesc(e.target.value);setErr("");}} style={S.input}>
                <option value="">Select...</option>
                {TEAM_DESCRIPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        ))}
        <button onClick={handleAdd} disabled={loading} style={{...S.btnPrimary,opacity:loading?0.7:1}}>
          {loading?"Adding...":"Add fixture"}
        </button>
      </div>
    </div>
  );
}

// ── Match detail ──────────────────────────────────────
function MatchDetail({match, user, onBack, onMatchUpdated}) {
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
  const [confirmations, setConfirmations] = useState(match.confirmations||0);
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
    setMsg(""); setSubmitting(false); onMatchUpdated();
  }

  async function submitScore() {
      console.log('match id:', match.id);
  console.log('match object:', match);
  const update = { home_score:Number(hScore), away_score:Number(aScore), updated_at:new Date().toISOString() };
  if (isCricket) { update.away_wickets=Number(wickets); update.away_overs=Number(overs); }
  
  const { data: scoreData, error: scoreError } = await supabase
    .from('scores').update(update).eq('match_id', match.id);

  const { data: matchData, error: matchError } = await supabase
    .from('matches').update({ status:'live' }).eq('id', match.id);
  

  setShowScore(false);
window.location.reload();
}

  async function handleConfirm() {
    if (hasVoted||scoreLocked) return;
    setHasVoted(true);
    const newCount = confirmations + 1;
    setConfirmations(newCount);
    const isFinal = newCount>=3;
    await supabase.from('scores').update({ confirmed_final:isFinal }).eq('match_id', match.id);
    if (isFinal) {
      await supabase.from('matches').update({ status:'final' }).eq('id', match.id);
      await supabase.from('spectator_updates').insert({ match_id:match.id, user_id:user?.id??null, content:`Score confirmed as final: ${match.homeTeam} ${match.homeDesc} ${match.homeScore} – ${match.awayScore} ${match.awayTeam} ${match.awayDesc}`, author_name:"System" });
    }
    onMatchUpdated();
  }

  function shareMatch() {
    const url = window.location.href;
    if (navigator.share) { navigator.share({title:`${match.homeTeam} vs ${match.awayTeam}`, url}); }
    else { navigator.clipboard.writeText(url); alert("Link copied!"); }
  }

  return (
    <div style={S.page}>
      <div style={S.darkHeader}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",padding:0}}>← Back</button>
          <button onClick={shareMatch} style={{background:"#222",border:"none",color:"#aaa",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>🔗 Share match</button>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:"#555",fontWeight:500,letterSpacing:"0.5px",marginBottom:12}}>
          {sport.icon} {sport.name.toUpperCase()} · {match.homeDesc}
        </div>
        {match.date&&<div style={{textAlign:"center",fontSize:11,color:"#555",marginBottom:12}}>{fmtDate(match.date)}{match.time?" · "+match.time:""}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",alignItems:"center",gap:8,marginBottom:8}}>
          <div style={{textAlign:"center"}}>
            <SchoolBadge name={match.homeTeam} size={48}/>
            <div style={{fontSize:12,color:"#ccc",marginTop:8,marginBottom:4}}>{match.homeTeam}</div>
            {isCricket?(
              <>
                <div style={{fontSize:40,fontWeight:500,color:"#fff",lineHeight:1}}>{match.homeScore}<span style={{fontSize:20,color:"#555"}}>/{match.wickets??0}</span></div>
                <div style={{fontSize:11,color:"#555",marginTop:4}}>{match.overs??0} overs</div>
              </>
            ):<div style={{fontSize:48,fontWeight:500,color:"#fff",lineHeight:1}}>{match.status==="upcoming"?"–":match.homeScore}</div>}
          </div>
          <div style={{textAlign:"center"}}>
            <StatusBadge status={match.status}/>
            {match.status==="live"&&match.time&&<div style={{fontSize:12,color:"#ef4444",fontWeight:500,marginTop:4}}>{match.time}</div>}
            <div style={{fontSize:12,color:"#444",marginTop:6}}>vs</div>
          </div>
          <div style={{textAlign:"center"}}>
            <SchoolBadge name={match.awayTeam} size={48}/>
            <div style={{fontSize:12,color:"#ccc",marginTop:8,marginBottom:4}}>{match.awayTeam}</div>
            <div style={{fontSize:48,fontWeight:500,color:"#fff",lineHeight:1}}>{match.status==="upcoming"?"–":match.awayScore}</div>
          </div>
        </div>
      </div>

      <div style={{padding:"12px 16px",paddingBottom:80}}>
        <div style={{...S.cardSection,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,color:"#333",fontWeight:500}}>{scoreLocked?"Score confirmed as final":`Confirm final score (${confirmations}/3)`}</span>
            {!scoreLocked&&<span style={{fontSize:11,color:"#aaa"}}>{3-confirmations} more needed</span>}
          </div>
          <div style={{height:4,borderRadius:4,background:"#f0f0ee",marginBottom:10,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:4,width:`${Math.min((confirmations/3)*100,100)}%`,background:scoreLocked?"#16a34a":"#111",transition:"width 0.3s"}}/>
          </div>
          {scoreLocked?(
            <div style={{textAlign:"center",fontSize:12,color:"#16a34a",fontWeight:500}}>Score locked</div>
          ):(
            <button onClick={handleConfirm} disabled={hasVoted} style={{...S.btnPrimary,opacity:hasVoted?0.5:1}}>
              {hasVoted?"You've confirmed this score":"Confirm as final score"}
            </button>
          )}
        </div>

        {!scoreLocked&&user&&(
          <div style={{textAlign:"center",marginBottom:10}}>
            <button onClick={()=>setShowScore(s=>!s)} style={{...S.btnSecondary,fontSize:12}}>
              {showScore?"Close":"Update score"}
            </button>
          </div>
        )}
        {!scoreLocked&&showScore&&user&&(
          <div style={{...S.cardSection,marginBottom:10}}>
            <div style={S.sectionLabel}>UPDATE SCORE</div>
            {isCricket?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                {[["Runs",hScore,setHScore,1,null],["Wickets",wickets,setWickets,1,10],["Overs",overs,setOvers,0.1,null]].map(([lbl,val,set,step,max])=>(
                  <div key={lbl}><label style={S.label}>{lbl}</label>
                    <input type="number" min="0" step={step} max={max||undefined} value={val} onChange={e=>set(e.target.value)} style={{...S.input,padding:"6px 8px",fontSize:15}}/>
                  </div>
                ))}
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                {[[match.homeTeam,hScore,setHScore],[match.awayTeam,aScore,setAScore]].map(([lbl,val,set])=>(
                  <div key={lbl}><label style={S.label}>{lbl}</label>
                    <input type="number" min="0" value={val} onChange={e=>set(e.target.value)} style={{...S.input,padding:"6px 10px",fontSize:16}}/>
                  </div>
                ))}
              </div>
            )}
            <button onClick={submitScore} style={S.btnPrimary}>Save score</button>
          </div>
        )}

        <div style={{...S.cardSection,marginBottom:10}}>
          <div style={S.sectionLabel}>LIVE UPDATES</div>
          {match.updates.length===0&&<div style={{textAlign:"center",color:"#aaa",fontSize:13,padding:"16px 0"}}>No updates yet</div>}
          {match.updates.map((u,i)=>(
            <div key={u.id} style={{paddingBottom:i<match.updates.length-1?10:0,marginBottom:i<match.updates.length-1?10:0,borderBottom:i<match.updates.length-1?"0.5px solid #f5f5f3":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:500,color:u.author==="System"?"#16a34a":"#111"}}>
                  {u.author}
                  {u.verified&&u.author!=="System"&&<span style={{fontSize:10,background:"#e6f1fb",color:"#185fa5",borderRadius:6,padding:"1px 6px"}}>verified</span>}
                </span>
                <span style={{fontSize:10,color:"#aaa"}}>{timeAgo(u.ts)}</span>
              </div>
              <div style={{fontSize:13,color:"#333"}}>{u.text}</div>
            </div>
          ))}
        </div>

        <div style={S.cardSection}>
          <div style={S.sectionLabel}>POST AN UPDATE</div>
          {user?(
            <>
              <div style={{fontSize:12,color:"#888",marginBottom:8}}>
                Posting as <span style={{color:"#111",fontWeight:500}}>{user.user_metadata?.display_name??user.email}</span>
                <span style={{background:"#e6f1fb",color:"#185fa5",borderRadius:6,padding:"1px 6px",fontSize:10,marginLeft:6}}>verified</span>
              </div>
              <textarea placeholder="What's happening? Goal, wicket, score update..." value={msg} onChange={e=>setMsg(e.target.value)} rows={3}
                style={{...S.input,resize:"none",marginBottom:8}}/>
              <button onClick={submitUpdate} disabled={!msg.trim()||submitting} style={{...S.btnPrimary,opacity:(!msg.trim()||submitting)?0.5:1}}>
                {submitting?"Posting...":"Post update"}
              </button>
            </>
          ):(
            <div style={{textAlign:"center",padding:"12px 0",color:"#aaa",fontSize:13}}>Sign in to post updates</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Match page (routed) ───────────────────────────────
function MatchPage({user}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMatch = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select(`*, scores(*), spectator_updates(*), sport:sports(name), home_school:schools!home_school_id(name), away_school:schools!away_school_id(name)`)
      .eq('id', id).single();
    if (data) setMatch(mapMatch(data));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadMatch();
    const channel = supabase.channel(`match-page-${id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'scores'},loadMatch)
      .on('postgres_changes',{event:'*',schema:'public',table:'spectator_updates'},loadMatch)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id, loadMatch]);

  if (loading) return <div style={{textAlign:"center",padding:40,fontFamily:"var(--font-sans)",color:"#888"}}>Loading...</div>;
  if (!match) return <div style={{textAlign:"center",padding:40,fontFamily:"var(--font-sans)",color:"#888"}}>Match not found.</div>;

  return <MatchDetail match={match} user={user} onBack={()=>navigate("/")} onMatchUpdated={loadMatch}/>;
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
  const [schoolsList, setSchoolsList] = useState([]);

  useEffect(() => {
    async function loadSchools() {
      const { data } = await supabase.from('schools').select('id, name, city, abbreviation').order('name', { ascending: true });
      if (data) setSchoolsList(data);
    }
    loadSchools();
  }, []);

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
      .select(`*, scores(*), spectator_updates(*), sport:sports(name), home_school:schools!home_school_id(name), away_school:schools!away_school_id(name)`)
      .order('match_date',{ascending:false});
    if (!error&&data) setMatches(data.map(mapMatch));
    setMatchesLoading(false);
  },[]);

  useEffect(()=>{ loadMatches(); },[loadMatches]);

  useEffect(()=>{
    const channel=supabase.channel('match-changes')
      .on('postgres_changes',{event:'*',schema:'public',table:'scores'},()=>loadMatches())
      .on('postgres_changes',{event:'*',schema:'public',table:'spectator_updates'},()=>loadMatches())
      .on('postgres_changes',{event:'*',schema:'public',table:'matches'},()=>loadMatches())
      .subscribe();
    return ()=>supabase.removeChannel(channel);
  },[loadMatches]);

  const filtered=useMemo(()=>matches.filter(m=>{
    if (statusFilter!=="all"&&m.status!==statusFilter) return false;
    if (sportFilter!=="all"&&m.sport!==sportFilter) return false;
    if (schoolSearch.trim()){const q=schoolSearch.toLowerCase();if(!m.homeTeam.toLowerCase().includes(q)&&!m.awayTeam.toLowerCase().includes(q))return false;}
    return true;
  }),[matches,statusFilter,sportFilter,schoolSearch]);

  async function handleLogout(){
    await supabase.auth.signOut();
    setUser(null); setScreen("home");
  }

  if (screen==="auth") return <AuthScreen onDone={()=>setScreen("home")}/>;
  if (screen==="profile"&&user) return <ProfileScreen user={user} onLogout={handleLogout} onBack={()=>setScreen("home")}/>;
  if (screen==="add"&&user) return <AddFixture schoolsList={schoolsList} user={user} onAdd={()=>{loadMatches();setScreen("home");}} onCancel={()=>setScreen("home")}/>;

  const anyFilter=statusFilter!=="all"||sportFilter!=="all"||schoolSearch.trim();

  return (
    <Routes>
      <Route path="/match/:id" element={<MatchPage user={user}/>}/>
      <Route path="/" element={<Landing/>}/>
      <Route path="/school/:id" element={<SchoolPage user={user}/>}/>
      <Route path="/schools" element={<SchoolsPage/>}/>
      <Route path="/app" element={
        <div style={{maxWidth:420,margin:"0 auto",fontFamily:"var(--font-sans)"}}>
          <div style={S.darkHeader}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontSize:20,fontWeight:500,color:"#fff"}}>School Scores</div>
                <div style={{fontSize:12,color:"#555",marginTop:1}}>{fmtDate(new Date().toISOString().slice(0,10))}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {user?(
                  <button onClick={()=>setScreen("profile")} style={{width:32,height:32,borderRadius:"50%",background:"#333",border:"none",cursor:"pointer",fontSize:13,fontWeight:500,color:"#fff"}}>
                    {(user.user_metadata?.display_name??user.email).charAt(0).toUpperCase()}
                  </button>
                ):(
                  <button onClick={()=>setScreen("auth")} style={{padding:"6px 14px",borderRadius:20,border:"0.5px solid #333",background:"transparent",color:"#aaa",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                    Sign in
                  </button>
                )}
                <button onClick={()=>user?setScreen("add"):setScreen("auth")} style={{padding:"6px 14px",borderRadius:20,background:"#fff",color:"#111",border:"none",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>
                  + Add
                </button>
              </div>
            </div>
            <div style={{position:"relative",marginBottom:12}}>
              <input placeholder="Search by school name..." value={schoolSearch} onChange={e=>setSchoolSearch(e.target.value)}
                style={{width:"100%",boxSizing:"border-box",padding:"8px 12px 8px 32px",borderRadius:10,border:"0.5px solid #333",background:"#1a1a1a",color:"#fff",fontSize:13,fontFamily:"inherit"}}/>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#555"}}>🔍</span>
              {schoolSearch&&<button onClick={()=>setSchoolSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,padding:0}}>×</button>}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
                {["all","live","final","upcoming"].map(s=>(
                  <button key={s} onClick={()=>setStatusFilter(s)} style={pill(statusFilter===s)}>
                    {s==="all"?"All":s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
              <button onClick={()=>setShowFilters(f=>!f)} style={{...pill(showFilters||sportFilter!=="all"),marginLeft:6,flexShrink:0}}>Sport</button>
            </div>
          </div>

          {showFilters&&(
            <div style={{background:"#1a1a1a",padding:"10px 16px",display:"flex",gap:6,flexWrap:"wrap"}}>
              <button onClick={()=>setSportFilter("all")} style={pill(sportFilter==="all")}>All</button>
              {Object.entries(SPORTS).map(([k,s])=>(
                <button key={k} onClick={()=>setSportFilter(k)} style={pill(sportFilter===k)}>{s.icon} {s.name}</button>
              ))}
            </div>
          )}

          <div style={{padding:"12px 16px",paddingBottom:80}}>
            <div style={{fontSize:12,color:"#aaa",marginBottom:10}}>
              {matchesLoading?"Loading...":`${filtered.length} match${filtered.length!==1?"es":""}`}
              {anyFilter&&!matchesLoading&&<> · <button onClick={()=>{setStatusFilter("all");setSportFilter("all");setSchoolSearch("");}} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:12,padding:0,textDecoration:"underline"}}>Clear</button></>}
            </div>
            {matchesLoading?(
              <div style={{textAlign:"center",padding:"40px 0",color:"#aaa"}}>Loading matches...</div>
            ):filtered.length===0?(
              <div style={{textAlign:"center",padding:"40px 0",color:"#aaa"}}>
                <div style={{fontSize:32,marginBottom:8}}>🏆</div>
                <div style={{fontSize:14}}>No matches yet</div>
                <div style={{fontSize:12,marginTop:4}}>Add a fixture to get started</div>
              </div>
            ):filtered.map(m=><MatchCard key={m.id} match={m}/>)}
          </div>
        </div>
      }/>
    </Routes>
  );
}