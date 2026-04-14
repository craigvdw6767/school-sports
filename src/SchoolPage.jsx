import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    updates: (m.spectator_updates ?? []).length,
  };
}

function MatchRow({match, schoolName}) {
  const navigate = useNavigate();
  const sport = SPORTS[match.sport];
  const isHome = match.homeTeam === schoolName;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const myScore = isHome ? match.homeScore : match.awayScore;
  const theirScore = isHome ? match.awayScore : match.homeScore;
  const isCricket = match.sport === "cricket";

  const statusCfg = {
    live:     {bg:"#fef2f2",color:"#c00",dot:"#ef4444",label:"LIVE"},
    final:    {bg:"#f0fdf4",color:"#166534",dot:"#16a34a",label:"FINAL"},
    upcoming: {bg:"#f5f5f3",color:"#666",dot:"#bbb",label:"UPCOMING"},
  }[match.status]||{bg:"#f5f5f3",color:"#666",dot:"#bbb",label:match.status};

  return (
    <div onClick={()=>navigate(`/match/${match.id}`)}
      style={{background:"#fff",border:"0.5px solid #e8e8e4",borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer",
        borderLeft:match.status==="live"?"3px solid #ef4444":"0.5px solid #e8e8e4",
        borderRadius:match.status==="live"?"0 12px 12px 0":12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10,color:"#888"}}>{sport.icon} {sport.name} · {match.homeDesc}</span>
        <span style={{display:"inline-flex",alignItems:"center",gap:3,background:statusCfg.bg,color:statusCfg.color,borderRadius:20,padding:"2px 6px",fontSize:9,fontWeight:500}}>
          <span style={{width:4,height:4,borderRadius:"50%",background:statusCfg.dot,display:"inline-block"}}/>
          {statusCfg.label}{match.status==="live"&&match.time?" "+match.time:""}
        </span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 32px 1fr",alignItems:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:10,color:"#333",fontWeight:500,marginBottom:4}}>{match.homeTeam}</div>
          <div style={{fontSize:26,fontWeight:500,color:match.status==="upcoming"?"#ccc":"#111"}}>
            {match.status==="upcoming"?"–":match.homeScore}
            {isCricket&&match.status!=="upcoming"&&<span style={{fontSize:13,color:"#aaa"}}>/{match.wickets??0}</span>}
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:"#ccc"}}>vs</div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:10,color:"#333",fontWeight:500,marginBottom:4}}>{match.awayTeam}</div>
          <div style={{fontSize:26,fontWeight:500,color:match.status==="upcoming"?"#ccc":"#111"}}>
            {match.status==="upcoming"?"–":match.awayScore}
          </div>
        </div>
      </div>
      {match.status==="upcoming"&&match.date&&(
        <div style={{marginTop:6,textAlign:"center",fontSize:10,color:"#aaa"}}>{fmtDate(match.date)}{match.time?" · "+match.time:""}</div>
      )}
      {match.updates>0&&(
        <div style={{marginTop:6,textAlign:"right",fontSize:10,color:"#aaa"}}>💬 {match.updates}</div>
      )}
    </div>
  );
}

export default function SchoolPage({user}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [following, setFollowing] = useState(false);

  const load = useCallback(async () => {
    const [{ data: schoolData }, { data: matchData }] = await Promise.all([
      supabase.from('schools').select('*').eq('id', id).single(),
      supabase.from('matches')
        .select(`*, scores(*), spectator_updates(*), sport:sports(name), home_school:schools!home_school_id(name), away_school:schools!away_school_id(name)`)
        .or(`home_school_id.eq.${id},away_school_id.eq.${id}`)
        .order('match_date', {ascending: false}),
    ]);
    if (schoolData) setSchool(schoolData);
    if (matchData) setMatches(matchData.map(mapMatch));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#888",fontFamily:"var(--font-sans)"}}>Loading...</div>;
  if (!school) return <div style={{textAlign:"center",padding:40,color:"#888",fontFamily:"var(--font-sans)"}}>School not found.</div>;

  const c = badgeColor(school.name);
  const live = matches.filter(m=>m.status==="live");
  const upcoming = matches.filter(m=>m.status==="upcoming");
  const results = matches.filter(m=>m.status==="final");

  const filtered = filter==="all" ? matches
    : filter==="live" ? live
    : filter==="upcoming" ? upcoming
    : results;

  const wins = results.filter(m=>{
    const isHome = m.homeTeam===school.name;
    return isHome ? m.homeScore>m.awayScore : m.awayScore>m.homeScore;
  }).length;

  const sports = [...new Set(matches.map(m=>m.sport))];

  return (
    <div style={{maxWidth:420,margin:"0 auto",fontFamily:"var(--font-sans)"}}>
      <div style={{background:"#111",padding:"14px 16px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <button onClick={()=>navigate(-1)} style={{background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",padding:0}}>← Back</button>
          <button onClick={()=>setFollowing(f=>!f)}
            style={{background:following?"#fff":"#222",border:"none",color:following?"#111":"#aaa",borderRadius:8,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:following?500:400}}>
            {following?"★ Following":"★ Follow"}
          </button>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
          <div style={{width:56,height:56,borderRadius:14,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:500,color:c.color,flexShrink:0}}>
            {initials(school.name)}
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:500,color:"#fff"}}>{school.name}</div>
            <div style={{fontSize:12,color:"#555",marginTop:2}}>{school.city}{school.province?` · ${school.province}`:""}</div>
          </div>
        </div>

        <div style={{display:"flex",gap:20}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:500,color:"#fff"}}>{matches.length}</div>
            <div style={{fontSize:10,color:"#555"}}>Fixtures</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:500,color:"#fff"}}>{wins}</div>
            <div style={{fontSize:10,color:"#555"}}>Wins</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:500,color:"#fff"}}>{sports.length}</div>
            <div style={{fontSize:10,color:"#555"}}>Sports</div>
          </div>
          {live.length>0&&(
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:500,color:"#ef4444"}}>{live.length}</div>
              <div style={{fontSize:10,color:"#555"}}>Live now</div>
            </div>
          )}
        </div>
      </div>

      {school.sponsor_name&&(
        <div style={{background:"#1a1a1a",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"0.5px solid #222"}}>
          <div style={{width:28,height:28,borderRadius:6,background:"#faeeda",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:500,color:"#854f0b",flexShrink:0}}>
            {initials(school.sponsor_name)}
          </div>
          <div style={{fontSize:10,color:"#555",lineHeight:1.4}}>
            {school.name} on SchoolScores is proudly sponsored by <span style={{color:"#888"}}>{school.sponsor_name}</span>
          </div>
        </div>
      )}

      <div style={{padding:"12px 16px 80px"}}>
        <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
          {[["all","All"],["live","Live"],["upcoming","Upcoming"],["final","Results"]].map(([val,label])=>(
            <button key={val} onClick={()=>setFilter(val)}
              style={{whiteSpace:"nowrap",padding:"5px 12px",borderRadius:20,border:"0.5px solid",
                borderColor:filter===val?"#111":"#e8e8e4",
                background:filter===val?"#111":"#fff",
                color:filter===val?"#fff":"#666",
                fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {label}{val==="live"&&live.length>0?` (${live.length})`:""}
            </button>
          ))}
        </div>

        {filter==="all"?(
          <>
            {live.length>0&&(
              <>
                <div style={{fontSize:10,color:"#aaa",fontWeight:500,letterSpacing:"0.5px",marginBottom:8}}>LIVE NOW</div>
                {live.map(m=><MatchRow key={m.id} match={m} schoolName={school.name}/>)}
              </>
            )}
            {upcoming.length>0&&(
              <>
                <div style={{fontSize:10,color:"#aaa",fontWeight:500,letterSpacing:"0.5px",marginBottom:8,marginTop:live.length>0?12:0}}>UPCOMING</div>
                {upcoming.map(m=><MatchRow key={m.id} match={m} schoolName={school.name}/>)}
              </>
            )}
            {results.length>0&&(
              <>
                <div style={{fontSize:10,color:"#aaa",fontWeight:500,letterSpacing:"0.5px",marginBottom:8,marginTop:upcoming.length>0?12:0}}>RECENT RESULTS</div>
                {results.map(m=><MatchRow key={m.id} match={m} schoolName={school.name}/>)}
              </>
            )}
            {matches.length===0&&(
              <div style={{textAlign:"center",padding:"40px 0",color:"#aaa"}}>
                <div style={{fontSize:32,marginBottom:8}}>🏆</div>
                <div style={{fontSize:14}}>No fixtures yet</div>
              </div>
            )}
          </>
        ):(
          <>
            {filtered.length===0?(
              <div style={{textAlign:"center",padding:"40px 0",color:"#aaa",fontSize:13}}>No matches found</div>
            ):filtered.map(m=><MatchRow key={m.id} match={m} schoolName={school.name}/>)}
          </>
        )}
      </div>
    </div>
  );
}