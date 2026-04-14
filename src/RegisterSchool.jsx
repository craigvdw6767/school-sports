import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

export default function RegisterSchool() {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const inputStyle = {
    width:"100%",
    boxSizing:"border-box",
    padding:"14px 16px",
    borderRadius:10,
    border:"0.5px solid #333",
    background:"#1a1a1a",
    color:"#fff",
    fontSize:15,
    fontFamily:"inherit",
    outline:"none",
  };

  const labelStyle = {
    fontSize:11,
    color:"#666",
    display:"block",
    marginBottom:8,
    letterSpacing:"0.5px",
    fontWeight:500,
  };

  async function handleSubmit() {
    if (!schoolName.trim()) { setErr("Please enter the school name."); return; }
    if (!contactEmail.trim()) { setErr("Please enter a contact email."); return; }
    setLoading(true); setErr("");
    const { error } = await supabase.from('school_requests').insert({
      school_name: schoolName.trim(),
      city: city.trim(),
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim().toLowerCase(),
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  }

  return (
    <div style={{background:"#111",minHeight:"100vh",color:"#fff",fontFamily:"var(--font-sans)"}}>

      {/* Nav */}
      <div style={{padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid #1a1a1a",maxWidth:900,margin:"0 auto"}}>
        <button onClick={()=>navigate("/")} style={{background:"none",border:"none",color:"#aaa",fontSize:13,cursor:"pointer",padding:0}}>← Back</button>
        <div style={{fontSize:12,color:"#555",letterSpacing:"2px"}}>SCHOOL SCORES</div>
        <div style={{width:40}}/>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"48px 24px"}}>

        {done ? (
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:64,marginBottom:24}}>🎉</div>
            <div style={{fontSize:32,fontWeight:500,color:"#EF9F27",letterSpacing:"2px",marginBottom:16}}>REQUEST SENT</div>
            <div style={{fontSize:16,color:"#888",marginBottom:40,lineHeight:1.8}}>
              Thanks! We'll review your request and add your school within 24 hours. We'll email you when it's live.
            </div>
            <button onClick={()=>navigate("/")}
              style={{background:"#fff",color:"#111",border:"none",borderRadius:12,padding:"14px 32px",fontSize:15,fontWeight:500,cursor:"pointer"}}>
              Back to home
            </button>
          </div>
        ) : (
          <>
            <div style={{textAlign:"center",marginBottom:40}}>
              <div style={{fontSize:32,fontWeight:500,color:"#EF9F27",letterSpacing:"4px",marginBottom:16}}>
                REGISTER YOUR SCHOOL
              </div>
              <div style={{fontSize:15,color:"#888",lineHeight:1.7}}>
                Can't find your school? Fill in the details below and we'll add it within 24 hours — for free.
              </div>
            </div>

            {err&&<div style={{background:"#2b0f0f",border:"0.5px solid #4a1a1a",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#f87171",marginBottom:20}}>{err}</div>}

            <div style={{marginBottom:12}}>
              <label style={labelStyle}>SCHOOL NAME *</label>
              <input value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="e.g. Sandton High School" style={inputStyle}/>
            </div>

            <div style={{marginBottom:32}}>
              <label style={labelStyle}>CITY</label>
              <input value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Johannesburg" style={inputStyle}/>
            </div>

            <div style={{height:"0.5px",background:"#222",marginBottom:32}}/>

            <div style={{marginBottom:12}}>
              <label style={labelStyle}>YOUR NAME</label>
              <input value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="Your name" style={inputStyle}/>
            </div>

            <div style={{marginBottom:40}}>
              <label style={labelStyle}>EMAIL ADDRESS *</label>
              <input type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="you@example.com" style={inputStyle}/>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              style={{width:"100%",padding:16,borderRadius:12,background:"#fff",color:"#111",border:"none",cursor:"pointer",fontSize:16,fontWeight:500,opacity:loading?0.7:1,letterSpacing:"0.5px"}}>
              {loading?"Submitting...":"Register my school →"}
            </button>

            <div style={{fontSize:12,color:"#444",textAlign:"center",marginTop:16}}>
              We'll add your school within 24 hours and notify you by email.
            </div>
          </>
        )}
      </div>
    </div>
  );
}