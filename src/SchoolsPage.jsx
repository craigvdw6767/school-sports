import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

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
function initials(name) {
  return name.split(" ").filter(Boolean).slice(0,3).map(w=>w[0]).join("").toUpperCase();
}

export default function SchoolsPage() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('schools')
        .select('id, name, city, province')
        .order('name', { ascending: true });
      if (data) setSchools(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city && s.city.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = filtered.reduce((acc, school) => {
    const key = school.city || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(school);
    return acc;
  }, {});

  return (
    <div style={{maxWidth:420,margin:"0 auto",fontFamily:"var(--font-sans)"}}>
      <div style={{background:"#111",padding:"14px 16px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button onClick={()=>navigate("/")} style={{background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",padding:0}}>← Back</button>
          <div style={{fontSize:14,fontWeight:500,color:"#fff"}}>Find my school</div>
          <div style={{width:40}}/>
        </div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#555"}}>🔍</span>
          <input
            autoFocus
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search by school or city..."
            style={{width:"100%",boxSizing:"border-box",padding:"9px 12px 9px 32px",borderRadius:10,border:"0.5px solid #333",background:"#1a1a1a",color:"#fff",fontSize:14,fontFamily:"inherit"}}
          />
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,padding:0}}>×</button>}
        </div>
      </div>

      <div style={{padding:"12px 16px 80px"}}>
        {loading?(
          <div style={{textAlign:"center",padding:"40px 0",color:"#aaa"}}>Loading schools...</div>
        ):filtered.length===0?(
          <div style={{textAlign:"center",padding:"40px 0",color:"#aaa"}}>
            <div style={{fontSize:32,marginBottom:8}}>🏫</div>
            <div style={{fontSize:14,marginBottom:4}}>School not found</div>
            <div style={{fontSize:12,color:"#888",marginBottom:16}}>"{search}" isn't in our list yet</div>
            <button onClick={()=>navigate("/register-school")}
              style={{background:"#111",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:500,cursor:"pointer"}}>
              Register your school →
            </button>
          </div>
        ):search?(
          <>
            <div style={{fontSize:11,color:"#aaa",marginBottom:10}}>{filtered.length} school{filtered.length!==1?"s":""} found</div>
            {filtered.map(s=><SchoolRow key={s.id} school={s} onClick={()=>navigate(`/school/${s.id}`)}/>)}
          </>
        ):(
          Object.entries(grouped).map(([city, citySchools])=>(
            <div key={city} style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#aaa",fontWeight:500,letterSpacing:"0.5px",marginBottom:8}}>{city.toUpperCase()}</div>
              {citySchools.map(s=><SchoolRow key={s.id} school={s} onClick={()=>navigate(`/school/${s.id}`)}/>)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SchoolRow({school, onClick}) {
  const c = badgeColor(school.name);
  return (
    <div onClick={onClick}
      style={{background:"#fff",border:"0.5px solid #e8e8e4",borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}
      onMouseEnter={e=>e.currentTarget.style.background="#f9f9f7"}
      onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
      <div style={{width:40,height:40,borderRadius:10,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,color:c.color,flexShrink:0}}>
        {initials(school.name)}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:500,color:"#111"}}>{school.name}</div>
        {school.city&&<div style={{fontSize:11,color:"#aaa",marginTop:1}}>{school.city}</div>}
      </div>
      <div style={{fontSize:16,color:"#ccc"}}>→</div>
    </div>
  );
}