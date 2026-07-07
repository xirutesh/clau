"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Menu, X, Play, HardDrive, Eye, Star, ChevronDown, ChevronUp, Globe, Film, Video, Settings, BarChart3, Trash2, Edit, LogIn, LogOut, ArrowLeft, Info, Layout, Monitor, CreditCard, Loader2, Upload, Ban, Send, Users, Plus, FolderOpen } from "lucide-react";

const SB_URL="https://ehdtctlhfbvflgfdjhkc.supabase.co";
const SB_ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHRjdGxoZmJ2ZmxnZmRqaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzcxNTgsImV4cCI6MjA5ODcxMzE1OH0.WH_q6ZwT2I6c3YaYqylQK9ZmBdxklXO_xmW4PbFZTm0";
// SERVICE_ROLE key -> app/api/db/route.js ; NOWPAYMENTS key -> app/api/pay/route.js.
// Neither secret ships to the browser.
const G="#E5A816",R="#C0392B",PK="#F06292";
const tagC=[{bg:"#FFE0B2",t:"#E65100"},{bg:"#F8BBD0",t:"#AD1457"},{bg:"#C8E6C9",t:"#2E7D32"},{bg:"#BBDEFB",t:"#1565C0"},{bg:"#E1BEE7",t:"#6A1B9A"},{bg:"#FFF9C4",t:"#F9A825"},{bg:"#B2EBF2",t:"#00838F"},{bg:"#FFCDD2",t:"#C62828"},{bg:"#D1C4E9",t:"#4527A0"},{bg:"#DCEDC8",t:"#558B2F"},{bg:"#FFE0B2",t:"#BF360C"},{bg:"#F0F4C3",t:"#827717"},{bg:"#B3E5FC",t:"#01579B"},{bg:"#FCE4EC",t:"#880E4F"},{bg:"#E8EAF6",t:"#283593"},{bg:"#FFF3E0",t:"#E65100"}];
const defCats=["INFO","GOLD-AREA","Telegram","Action","Comedy","Drama","Thriller","Shorts","Candids","Other"];
const defHome=[{id:"top-selling",title:"Top Selling Section of the Month",visible:true},{id:"top-viewed",title:"Top Viewed Videos of the Month",visible:true},{id:"latest",title:"Latest Updates",visible:true}];
const defCfg={site_name:"XIRUTE.COM",slogan:"For All Your Pleasures",logo_url:null,telegram_link:"",stats:{},sections:defHome,categories:defCats,manual_payments:[],global_delivery_link:"",fake_users:12840,fake_users_annual:"+3200",stars_per_usd:50};

function useScreen(){const[w,setW]=useState(375);useEffect(()=>{setW(window.innerWidth);const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h)},[]);return{mobile:w<768,tablet:w>=768&&w<1024,desktop:w>=1024}}

const api={
  h:t=>({"apikey":SB_ANON,"Content-Type":"application/json","Authorization":`Bearer ${t||SB_ANON}`}),
  async get(tb,q="",t){try{const r=await fetch(`${SB_URL}/rest/v1/${tb}?${q}`,{headers:api.h(t)});const d=await r.json();return Array.isArray(d)?d:[];}catch{return[];}},
  async getOne(tb,q,t){const d=await api.get(tb,q,t);return d[0]||null;},
  async post(tb,data,t){try{const r=await fetch(`${SB_URL}/rest/v1/${tb}`,{method:"POST",headers:{...api.h(t),"Prefer":"return=representation"},body:JSON.stringify(data)});return r.json();}catch{return null;}},
  async patch(tb,q,data,t){try{const r=await fetch(`${SB_URL}/rest/v1/${tb}?${q}`,{method:"PATCH",headers:{...api.h(t),"Prefer":"return=representation"},body:JSON.stringify(data)});return r.ok;}catch{return false;}},
  async del(tb,q,t){try{await fetch(`${SB_URL}/rest/v1/${tb}?${q}`,{method:"DELETE",headers:api.h(t)});return true;}catch{return false;}},
  // Privileged ops go through /api/db, which holds the service_role key server-side
  // and validates the caller's admin session. Attach the session token; on 401
  // (expired token) refresh once and retry so the admin session doesn't die hourly.
  async adb(payload){
    const send=()=>{let tk;try{tk=JSON.parse(localStorage.getItem("auth")||"null")?.token}catch{}
      return fetch("/api/db",{method:"POST",headers:{"Content-Type":"application/json",...(tk?{"Authorization":`Bearer ${tk}`}:{})},body:JSON.stringify(payload)});};
    let r=await send();
    if(r.status===401&&await api.refreshToken())r=await send();
    return r;
  },
  async refreshToken(){
    try{const s=JSON.parse(localStorage.getItem("auth")||"null");if(!s?.refresh)return false;
      const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{"apikey":SB_ANON,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:s.refresh})});
      if(!r.ok)return false;const d=await r.json();if(!d.access_token)return false;
      localStorage.setItem("auth",JSON.stringify({...s,token:d.access_token,refresh:d.refresh_token||s.refresh}));return true;
    }catch{return false;}
  },
  async aGet(tb,q=""){try{const r=await api.adb({method:"GET",table:tb,query:q});const d=await r.json();return Array.isArray(d)?d:[];}catch{return[];}},
  async aPatch(tb,q,d){try{const r=await api.adb({method:"PATCH",table:tb,query:q,data:d});return r.ok;}catch{return false;}},
  async aPost(tb,data){try{const r=await api.adb({method:"POST",table:tb,data});return r.json();}catch{return null;}},
  async aDel(tb,q){try{await api.adb({method:"DELETE",table:tb,query:q});return true;}catch{return false;}},
};
function saveAuth(a){try{localStorage.setItem("auth",JSON.stringify(a))}catch{}}
const dId=id=>((id*9301+49297)%99999).toString().padStart(5,"0");
function loadAuth(){try{const s=localStorage.getItem("auth");return s?JSON.parse(s):null}catch{return null}}
function clearAuth(){try{localStorage.removeItem("auth")}catch{}}

// Components
function SiteLogo({size=44}){return<div style={{width:size,height:size,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.7)",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width={size*0.55} height={size*0.55} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"><path d="M12 2C9 2 7 5 7 8c0 2 1 3.5 2 4.5C7.5 13.5 4 15 4 18c0 2 3 4 8 4s8-2 8-4c0-3-3.5-4.5-5-5.5 1-1 2-2.5 2-4.5 0-3-2-6-5-6z"/></svg></div>}
function LI({src,size=40}){return src?<img src={src} alt="" style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,0.7)"}}/>:<SiteLogo size={size}/>}
function Spin({t}){return<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,gap:8,color:"#555",flexDirection:"column"}}><div style={{width:44,height:44,border:"4px solid #f0f0f0",borderTop:`4px solid ${R}`,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>{t&&<span style={{fontSize:13,marginTop:8}}>{t}</span>}<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
function SC({label,value,sub,change,icon,iconBg,ready}){return<div style={{background:"#fff",borderRadius:12,padding:"18px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{color:G,fontWeight:700,fontSize:13}}>{label}</div>{ready?<div style={{fontSize:28,fontWeight:800,color:"#1a1a1a",letterSpacing:-1,marginTop:4}}>{value}</div>:null}<div style={{fontSize:12,color:"#666",marginTop:4}}>{sub} {ready&&change?<span style={{color:"#27ae60",fontWeight:700}}>{change}</span>:null}</div></div><div style={{width:42,height:42,borderRadius:10,border:`2px solid ${iconBg}`,display:"flex",alignItems:"center",justifyContent:"center",color:iconBg}}>{icon}</div></div></div>}

function VT({v,onClick}){return<div onClick={onClick} style={{cursor:"pointer",marginBottom:16}}><div style={{background:v.image_url?`url(${v.image_url}) center/cover`:"#1a1a1a",borderRadius:10,paddingTop:"56.25%",position:"relative"}}>{!v.image_url&&<Film size={48} color="#444" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>}<div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,0.7)",color:"#fff",padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:700}}>{v.resolution||"1080P"}</div><div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 12px",background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:13,fontWeight:700}}>{v.title||v.name}</div></div><div style={{display:"flex",justifyContent:"flex-end",padding:"4px 4px 0",color:"#555",fontSize:12,alignItems:"center",gap:4}}><Eye size={14}/>{v.views||0}</div></div>}

function ImgUp({value,onChange}){
  const ref=useRef(onChange);ref.current=onChange;
  const hf=f=>{if(!f||!f.type.startsWith("image/"))return;const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{try{const max=900;let w=img.width,h=img.height;if(w>max){h=Math.round(h*max/w);w=max;}const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);ref.current(cv.toDataURL("image/jpeg",0.82));}catch{ref.current(e.target.result);}};img.onerror=()=>ref.current(e.target.result);img.src=e.target.result;};r.readAsDataURL(f);};
  useEffect(()=>{const h=e=>{const it=e.clipboardData?.items;if(!it)return;for(let i=0;i<it.length;i++)if(it[i].type.startsWith("image/")){hf(it[i].getAsFile());e.preventDefault();return;}};window.addEventListener("paste",h);return()=>window.removeEventListener("paste",h)},[]);
  return<div style={{marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}><label style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,background:G,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}><Upload size={14}/>{value?"Change":"Upload"}<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])hf(e.target.files[0])}}/></label>{value&&<button onClick={()=>onChange("")} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #fdd",background:"#fff",color:R,fontWeight:700,fontSize:12,cursor:"pointer"}}>Remove</button>}<span style={{fontSize:11,color:"#aaa"}}>or Ctrl+V</span></div>{value&&<img src={value} alt="" style={{width:120,height:68,objectFit:"cover",borderRadius:6,border:"1px solid #ddd"}}/>}</div>;
}

// Channel Page
function ChPage({ch,config,auth,onAuth,pendingSub,onSubmitted}){
  const[vid,setVid]=useState(null);const[pay,setPay]=useState(false);
  const[gc,setGc]=useState(false);const[code,setCode]=useState("");const[proof,setProof]=useState("");const[sub,setSub]=useState(false);const[done,setDone]=useState(false);
  const inProc=pendingSub||done;
  const oc=async()=>{if(!auth){onAuth();return;}setPay(true);try{const r=await fetch("/api/pay",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channelId:ch.id})});const d=await r.json();if(d.invoice_url)window.open(d.invoice_url,"_blank");else alert("Error");}catch{alert("Error");}setPay(false);};
  const openStars=()=>{if(!auth){onAuth();return;}const uid=auth?.user?.id||"";window.open(`https://t.me/hgfrdofldebot?start=${ch.id}_${uid}`,"_blank");};
  const subGift=async()=>{if(!auth){onAuth();return;}if(!code.trim()||!proof){alert("Enter the code and upload a photo of the card.");return;}setSub(true);try{let tk;try{tk=JSON.parse(localStorage.getItem("auth")||"null")?.token}catch{}const r=await fetch("/api/gift",{method:"POST",headers:{"Content-Type":"application/json",...(tk?{"Authorization":`Bearer ${tk}`}:{})},body:JSON.stringify({channelId:ch.id,code:code.trim(),photo:proof})});if(r.ok){setDone(true);setGc(false);if(onSubmitted)onSubmitted();}else{const d=await r.json().catch(()=>({}));alert(d.error||"Submission failed. Try again.");}}catch{alert("Submission failed. Try again.");}setSub(false);};
  return<div>
    <div style={{padding:16,background:"#f2f2f2"}}><div style={{background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
      <div style={{background:`linear-gradient(135deg,${PK},#F48FB1)`,padding:"28px 0 44px",textAlign:"center"}}><div style={{color:"#fff",fontSize:18,fontWeight:700}}>1 month</div><div style={{width:85,height:85,borderRadius:"50%",background:G,margin:"16px auto 0",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:28,fontWeight:900}}>${ch.price}</div></div>
      <div style={{textAlign:"center",padding:"16px 0 8px"}}><div style={{fontWeight:800,fontSize:18,color:"#1a1a1a"}}>Full Access</div><div style={{color:G,fontSize:15,marginTop:4,fontWeight:600}}>{ch.name}</div></div>
      <div style={{padding:"8px 20px 20px"}}>
        <button onClick={oc} disabled={pay} style={{width:"100%",padding:14,borderRadius:10,border:"none",fontSize:16,fontWeight:700,color:"#fff",cursor:"pointer",background:"linear-gradient(135deg,#43A047,#2E7D32)",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:pay?0.7:1}}><Globe size={18}/>{pay?"Loading...":"Crypto"}</button>
        <button onClick={openStars} style={{width:"100%",marginTop:10,padding:14,borderRadius:10,border:"none",fontSize:16,fontWeight:700,color:"#fff",cursor:"pointer",background:"linear-gradient(135deg,#2AABEE,#229ED9)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Send size={18}/>Telegram Stars</button>
        {!gc&&!inProc&&<button onClick={()=>{if(!auth){onAuth();return;}setGc(true)}} style={{width:"100%",marginTop:10,padding:14,borderRadius:10,border:"none",fontSize:16,fontWeight:700,color:"#fff",cursor:"pointer",background:"linear-gradient(135deg,#8E24AA,#5E35B1)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><CreditCard size={18}/>Gift Card</button>}
        {gc&&!inProc&&<div style={{marginTop:12,padding:14,borderRadius:10,background:"#F5F0FA",border:"1px solid #E1BEE7"}}>
          <div style={{fontWeight:700,fontSize:15,color:"#4A148C",marginBottom:6}}>Pay with Gift Card</div>
          <div style={{fontSize:13,color:"#4A148C",fontWeight:700,background:"#EDE1F5",borderRadius:8,padding:"10px 12px",marginBottom:10,lineHeight:1.5}}>⚠️ We ONLY accept <b>Binance</b> or <b>Rewarble Global</b> gift cards. Any other card (Amazon, Steam, iTunes, Google Play, etc.) will be rejected and your money lost.</div>
          <div style={{fontSize:12.5,color:"#3a3a3a",marginBottom:10,lineHeight:1.7,background:"#fff",border:"1px solid #E1BEE7",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontWeight:800,color:"#4A148C",marginBottom:6}}>How to buy &amp; pay (step by step):</div>
            <div style={{marginBottom:4}}><b>1.</b> Don&apos;t have one? Open Google and search: <b>&quot;buy Rewarble Global gift card&quot;</b> or <b>&quot;Binance Gift Card&quot;</b>.</div>
            <div style={{marginBottom:4}}><b>2.</b> Buy it on the official site (<b>rewarble.com</b> or <b>binance.com</b>) or a trusted reseller, for at least <b>${ch.price} USD</b>.</div>
            <div style={{marginBottom:4}}><b>3.</b> After buying, you get a <b>code</b>. Copy it and take a <b>clear photo</b> of the card/code.</div>
            <div style={{marginBottom:4}}><b>4.</b> Paste the code below and upload the photo.</div>
            <div><b>5.</b> Press Submit. We verify it and unlock your access.</div>
          </div>
          <input placeholder="Gift card code" value={code} onChange={e=>setCode(e.target.value)} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"2px solid #bbb",fontSize:16,marginBottom:10,boxSizing:"border-box",color:"#333",background:"#fff"}}/>
          <ImgUp value={proof} onChange={setProof}/>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={subGift} disabled={sub} style={{flex:1,padding:12,borderRadius:8,border:"none",fontWeight:700,color:"#fff",cursor:"pointer",background:"#8E24AA",opacity:sub?0.7:1}}>{sub?"Sending...":"Submit"}</button>
            <button onClick={()=>{setGc(false);setCode("");setProof("")}} style={{padding:"12px 16px",borderRadius:8,border:"1px solid #ccc",background:"#fff",color:"#555",fontWeight:700,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>}
        {inProc&&<div style={{marginTop:12,padding:16,borderRadius:10,background:"#FFF3E0",border:"1px solid #FFCC80",textAlign:"center",color:"#E65100",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>⏳ Your Gift Card request is in process. We&apos;ll review it and confirm your access shortly.</div>}
      </div>
    </div></div>
    <div style={{padding:"12px 16px"}}><div style={{background:"#fff",borderRadius:12,padding:"16px 20px",textAlign:"center"}}><div style={{color:G,fontWeight:700,fontSize:15}}>VIDEO COUNT: {ch.video_count||0}</div></div></div>
    <div style={{padding:"8px 16px 24px"}}><VT v={{title:ch.name,resolution:ch.resolution,views:ch.views,image_url:ch.image_url}} onClick={()=>setVid(ch)}/></div>
    {vid&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"40px 16px",overflowY:"auto"}} onClick={()=>setVid(null)}><div style={{background:"#fff",borderRadius:4,width:"100%",maxWidth:500,overflow:"hidden",border:"1px solid #ccc"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #ddd"}}><span style={{fontSize:14,color:"#333"}}>N:{dId(ch.id)} {ch.name}</span><X size={20} color="#333" style={{cursor:"pointer"}} onClick={()=>setVid(null)}/></div>
      <div style={{background:ch.image_url?`url(${ch.image_url}) center/cover`:"#ccc",paddingTop:"56.25%",position:"relative",borderBottom:"2px solid #c0392b"}}>{!ch.image_url&&<Film size={50} color="#999" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>}</div>
      <div style={{padding:"16px 16px 0"}}><div style={{background:"#FDE8E8",padding:"14px 16px",borderRadius:4,color:"#c0392b",textAlign:"center",fontSize:15,fontWeight:500}}>Download link , available after purchases.</div></div>
      {ch.description&&<div style={{padding:"14px 16px 0",fontSize:15,color:"#333",lineHeight:1.6,borderLeft:"3px solid #ddd",marginLeft:16,marginTop:12,paddingLeft:12}}>{ch.description}</div>}
      <div style={{padding:"16px 16px 20px",fontSize:16,color:"#1a1a1a"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{lineHeight:2.2}}><div><span style={{fontWeight:800}}>Resolution:</span> {ch.resolution||"—"}</div><div><span style={{fontWeight:800}}>Duration:</span> {ch.duration||"—"}</div><div><span style={{fontWeight:800}}>Size:</span> {ch.size||"—"}</div></div><div><span style={{fontWeight:800}}>Views:</span> {ch.views||0}</div></div></div>
    </div></div>}
  </div>;
}

// Dropdown Menu
function DM({open,channels,onSel,isAdmin,onAdmin,onLogout,onInfo,config,auth}){
  const[exp,setExp]=useState({});const scr=useScreen();
  const mp=scr.desktop?"14px 60px":"14px 20px",sp=scr.desktop?"10px 60px 10px 88px":"10px 20px 10px 48px";
  const cats=Array.isArray(config?.categories)?config.categories:defCats;
  const grp={};(channels||[]).forEach(c=>{if(!grp[c.category])grp[c.category]=[];grp[c.category].push(c);});Object.keys(grp).forEach(k=>grp[k].sort((a,b)=>(a.name||"").localeCompare(b.name||"")));
  if(!open)return null;
  return<div style={{background:G,width:"100%"}}>
    <style>{`@keyframes goldBlink{0%,100%{color:#C0392B}50%{color:#fff}}`}</style>
    <div onClick={()=>setExp(p=>({...p,INFO:!p.INFO}))} style={{padding:mp,color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}><Info size={16}/>INFO <span style={{color:"#FFD54F"}}>▼</span></div>
    {exp.INFO&&[{k:"p053",l:"Telegram"},{k:"p041",l:"18 USC 2257"},{k:"p072",l:"CONTENT REMOVAL"}].map(i=><div key={i.k} onClick={()=>onInfo(i.k)} style={{padding:sp,color:"#ffffffdd",fontSize:14,cursor:"pointer"}}>{i.l}</div>)}
    {cats.filter(c=>c!=="INFO").map((cat,i)=>{const items=grp[cat]||[];const isG=cat==="GOLD-AREA";const isExp=exp[cat];return<div key={i}>
      <div onClick={()=>items.length&&setExp(p=>({...p,[cat]:!p[cat]}))} style={{padding:mp,color:isG?undefined:"#fff",fontWeight:700,fontSize:16,cursor:items.length?"pointer":"default",display:"flex",alignItems:"center",gap:10,background:isExp?"rgba(0,0,0,0.08)":"transparent",animation:isG?"goldBlink 1s infinite":"none"}}><Video size={16} fill={isG?"currentColor":"#fff"} strokeWidth={0}/>{cat}{items.length>0&&<span style={{color:isG?undefined:"#FFD54F"}}>▼</span>}</div>
      {isExp&&items.map(ch=><div key={ch.id} onClick={()=>onSel(ch)} style={{padding:sp,color:"#ffffffdd",fontSize:14,cursor:"pointer"}}>{ch.name}</div>)}
    </div>})}
    <div style={{borderTop:"1px solid rgba(255,255,255,0.15)",marginTop:4}}>{auth?<>{isAdmin&&<div onClick={onAdmin} style={{padding:mp,color:"#fff",fontWeight:700,fontSize:16,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}><Settings size={16}/>Admin Panel</div>}<div style={{padding:mp,color:"#fff",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>Welcome : {auth.username||"user"}</span><span onClick={onLogout} style={{color:"#ffcccc",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:14}}><LogOut size={14}/>LogOut</span></div></>:<div onClick={onAdmin} style={{padding:mp,color:"#fff",fontWeight:700,fontSize:16,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}><LogIn size={16}/>LogIn</div>}</div>
  </div>;
}

// Info Pages
function InfoP({page,config}){
  if(page==="p053")return<div style={{background:"#fff",borderRadius:12,padding:20,margin:16,textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>✈️</div><div style={{fontWeight:800,fontSize:20,marginBottom:8,color:"#1a1a1a"}}>Join Our Telegram</div><p style={{color:"#444",fontSize:14,lineHeight:1.6,marginBottom:20}}>Stay updated with the latest content.</p><a href={config?.telegram_link||"#"} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",padding:"14px 32px",borderRadius:10,background:"#0088cc",color:"#fff",fontWeight:700,fontSize:16,textDecoration:"none"}}>Open Telegram</a></div>;
  if(page==="p041")return<div style={{margin:"0 16px"}}><div style={{borderTop:"1px solid #ddd"}}/><div style={{padding:"12px 0",borderBottom:"1px solid #ddd"}}><span style={{fontWeight:700,fontSize:16}}>18 USC 2257</span></div><div style={{padding:"16px 0",fontSize:15,color:"#444",lineHeight:1.7}}><p style={{marginBottom:14,textTransform:"uppercase",fontWeight:600}}>ALL PICTURES ARE PRESENTED BY THIRD PARTIES.</p><p style={{marginBottom:14,textTransform:"uppercase",fontWeight:600}}>ALL MODELS ARE 18 YEARS OF AGE OR OLDER IN COMPLIANCE WITH 18 USC 2257</p><p style={{fontWeight:600,fontStyle:"italic"}}>All visitors of this website are required to be over 18 years old (over 21 in some locations).</p><div style={{background:"#FFF3E0",borderRadius:10,padding:14,marginTop:16,textAlign:"center"}}><a href="mailto:legal-website@xirute.com" style={{color:"#E65100",fontWeight:700,fontSize:16,textDecoration:"none"}}>legal-website@xirute.com</a></div></div></div>;
  if(page==="p072")return<div style={{margin:"0 16px"}}><div style={{borderTop:"1px solid #ddd"}}/><div style={{padding:"12px 0",borderBottom:"1px solid #ddd"}}><span style={{fontWeight:700,fontSize:16}}>Content Removal</span></div><div style={{padding:"16px 0",fontSize:14,color:"#444",lineHeight:1.8}}><p style={{marginBottom:12}}>If you appear in any content and wish to have it removed, submit a removal request.</p><div style={{background:"#E8F5E9",borderRadius:10,padding:14,textAlign:"center"}}><a href="mailto:removal-website@xirute.com" style={{color:"#2E7D32",fontWeight:800,fontSize:17,textDecoration:"none"}}>removal-website@xirute.com</a></div></div></div>;
  return null;
}

// Auth
function Auth({onLogin,onBack,defaultMode}){
  const[mode,setMode]=useState(defaultMode||"login");const[user,setUser]=useState("");const[pass,setPass]=useState("");const[pass2,setPass2]=useState("");const[err,setErr]=useState("");const[busy,setBusy]=useState(false);
  const[ok,setOk]=useState("");
  const inp={width:"100%",padding:"12px 14px",borderRadius:4,border:"2px solid #aaa",fontSize:15,marginBottom:10,boxSizing:"border-box",outline:"none",color:"#333",background:"#fff"};
  const fakeEmail=u=>`${u.toLowerCase().replace(/[^a-z0-9_.-]/g,"")}@siteusers.com`;
  const go=async()=>{if(!user||!pass)return setErr("Fill in all fields");if(mode==="signup"&&pass.length<6)return setErr("Min 6 characters");if(mode==="signup"&&pass!==pass2)return setErr("Passwords don't match");const email=fakeEmail(user);setBusy(true);setErr("");setOk("");
    if(mode==="signup"){const r=await fetch(`${SB_URL}/auth/v1/signup`,{method:"POST",headers:{"apikey":SB_ANON,"Content-Type":"application/json"},body:JSON.stringify({email,password:pass,data:{username:user}})}).catch(()=>null);if(!r){setErr("Unable to connect.");setBusy(false);return;}const d=await r.json();if(r.status>=400){const m=d.error_description||d.msg||d.message||"Failed";const ms=String(m).toLowerCase();if(ms.includes("already")||ms.includes("email")||ms.includes("exists"))setErr("Username already taken.");else if(ms.includes("password"))setErr("Password too weak. Min 6 characters.");else setErr("Could not create account. Try a different username.");setBusy(false);return;}if(d.identities?.length===0){setErr("Username already taken.");setBusy(false);return;}
      // Save username to profile
      if(d.user?.id){await api.aPatch("profiles",`id=eq.${d.user.id}`,{username:user});}
      // Auto-confirm user via service role (fake emails can't confirm)
      if(d.user?.id){await api.adb({op:"confirm-email",userId:d.user.id}).catch(()=>null);}
      // Auto-login after confirm
      const lr=await fetch(`${SB_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"apikey":SB_ANON,"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})}).catch(()=>null);
      if(lr&&lr.ok){const ld=await lr.json();const p=await api.getOne("profiles",`id=eq.${ld.user.id}&select=*`,ld.access_token);const a={token:ld.access_token,refresh:ld.refresh_token,user:ld.user,role:p?.role||"user",username:user};saveAuth(a);onLogin(a);return;}
      setOk("Account created! Log in.");setMode("login");setBusy(false);return;
    }else{const email=fakeEmail(user);const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"apikey":SB_ANON,"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})}).catch(()=>null);if(!r){setErr("Unable to connect.");setBusy(false);return;}const d=await r.json();if(r.status>=400){if(r.status>=500)setErr("Server error. Try again later.");else setErr("Invalid username or password.");setBusy(false);return;}const p=await api.getOne("profiles",`id=eq.${d.user.id}&select=*`,d.access_token);const uname=p?.username||user;const a={token:d.access_token,refresh:d.refresh_token,user:d.user,role:p?.role||"user",username:uname};saveAuth(a);onLogin(a);}setBusy(false);};
  return<div style={{minHeight:"100dvh",background:"#e8e8e8"}}><style>{`@keyframes authDrop{from{transform:translateY(-300px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style><div style={{background:G,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}><ArrowLeft size={22} color="#fff" style={{cursor:"pointer"}} onClick={onBack}/><span style={{color:"#fff",fontWeight:900,fontSize:18}}>{mode==="login"?"Authorization":"Registration"}</span></div><div style={{padding:"20px 16px",display:"flex",justifyContent:"center"}}><div key={mode} style={{background:"#f5f5f5",borderRadius:4,padding:"24px 20px",width:"100%",maxWidth:360,border:"1px solid #ddd",animation:"authDrop 1.4s cubic-bezier(0.16,1,0.3,1)"}}>
    <input placeholder="username" value={user} onChange={e=>{setUser(e.target.value);setErr("")}} style={inp}/>
    <input placeholder="password" type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr("")}} style={inp} onKeyDown={e=>e.key==="Enter"&&mode==="login"&&go()}/>
    {mode==="signup"&&<input placeholder="password check" type="password" value={pass2} onChange={e=>{setPass2(e.target.value);setErr("")}} style={inp} onKeyDown={e=>e.key==="Enter"&&go()}/>}
    {ok&&<div style={{color:"#27ae60",fontSize:13,marginBottom:10,textAlign:"center",background:"#E8F5E9",padding:"8px 12px",borderRadius:4,fontWeight:600}}>{ok}</div>}
    {err&&<div style={{color:R,fontSize:13,marginBottom:10,textAlign:"center"}}>{err}</div>}
    {mode==="login"?<>
      <button onClick={go} disabled={busy} style={{width:"100%",padding:12,borderRadius:4,border:"none",background:G,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8,opacity:busy?0.7:1}}>{busy?"Loading...":"Authorization"}</button>
      <button onClick={()=>{setMode("signup");setErr("");try{window.history.replaceState(null,"","#signup")}catch{}}} style={{width:"100%",padding:12,borderRadius:4,border:"none",background:"#4A90D9",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>Registration</button>
    </>:<>
      <button onClick={go} disabled={busy} style={{width:"100%",padding:12,borderRadius:4,border:"none",background:"#4A90D9",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8,opacity:busy?0.7:1}}>{busy?"Loading...":"Registration"}</button>
      <div style={{textAlign:"center",marginTop:8,fontSize:13,color:"#888"}}>Already have an account? <span onClick={()=>{setMode("login");setErr("");try{window.history.replaceState(null,"","#login")}catch{}}} style={{color:G,fontWeight:700,cursor:"pointer"}}>Login</span></div>
    </>}
  </div></div></div>;
}

// Site Settings Tab (with Save button)
function SiteTab({config,sCfg,inp}){
  const cats=Array.isArray(config?.categories)?config.categories.filter(c=>c!=="INFO"):["Action"];
  const[f,setF]=useState({telegram_link:config?.telegram_link||"",global_delivery_link:config?.global_delivery_link||"",fake_users:config?.fake_users||12840,fake_users_annual:config?.fake_users_annual||"+3200",logo_url:config?.logo_url||"",default_category:config?.default_category||cats[0]||"Action",default_resolution:config?.default_resolution||"1080P",default_price:config?.default_price||50,stars_per_usd:config?.stars_per_usd||50});
  const[saved,setSaved]=useState(false);
  const save=async()=>{await sCfg({telegram_link:f.telegram_link,global_delivery_link:f.global_delivery_link,fake_users:Number(f.fake_users),fake_users_annual:f.fake_users_annual,logo_url:f.logo_url||null,default_category:f.default_category,default_resolution:f.default_resolution,default_price:Number(f.default_price)||50,stars_per_usd:Number(f.stars_per_usd)||50});setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return<div style={{padding:16}}>
    <div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🖼️ Site Logo</div>
      <ImgUp value={f.logo_url} onChange={v=>setF({...f,logo_url:v})}/>
      <div style={{fontSize:11,color:"#666",marginTop:4}}>Recommended: square image, shown in header as circle</div>
    </div>
    <div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:12}}>⚙️ New Channel Defaults</div>
      <div style={{fontSize:12,color:"#27ae60",marginBottom:8}}>These auto-fill when creating a new channel.</div>
      <label style={{fontSize:13,color:"#555",fontWeight:600}}>Default Category</label><select value={f.default_category} onChange={e=>setF({...f,default_category:e.target.value})} style={inp}>{cats.map(c=><option key={c}>{c}</option>)}</select>
      <label style={{fontSize:13,color:"#555",fontWeight:600}}>Default Resolution</label><select value={f.default_resolution} onChange={e=>setF({...f,default_resolution:e.target.value})} style={inp}><option value="1080P">1080P</option><option value="4K">4K</option><option value="720P">720P</option></select>
      <label style={{fontSize:13,color:"#555",fontWeight:600}}>Default Price $</label><input type="number" value={f.default_price} onChange={e=>setF({...f,default_price:e.target.value})} style={inp}/>
    </div>
    <div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🌐 Site</div>
      <label style={{fontSize:13,color:"#555",fontWeight:600}}>Telegram Link</label><input value={f.telegram_link} onChange={e=>setF({...f,telegram_link:e.target.value})} style={inp}/>
      <label style={{fontSize:13,color:"#555",fontWeight:600}}>Global Delivery Link</label><input value={f.global_delivery_link} onChange={e=>setF({...f,global_delivery_link:e.target.value})} style={inp}/>
      <label style={{fontSize:13,color:"#555",fontWeight:600}}>Telegram Stars per $1 (rate)</label><input type="number" value={f.stars_per_usd} onChange={e=>setF({...f,stars_per_usd:e.target.value})} style={inp}/>
      <div style={{fontSize:11,color:"#888",marginTop:-4,marginBottom:4}}>Ex: 50 → a $30 channel costs 1500 Stars</div>
    </div>
    <div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:12}}>📊 Fake Users</div>
      <div style={{fontSize:12,color:"#27ae60",marginBottom:8}}>Videos, Content Size & Views auto-calculate. Users are fake.</div>
      <label style={{fontSize:13,color:"#555",fontWeight:600}}>Users (homepage)</label><input type="number" value={f.fake_users} onChange={e=>setF({...f,fake_users:e.target.value})} style={inp}/>
      <label style={{fontSize:13,color:"#555",fontWeight:600}}>Annual Growth</label><input value={f.fake_users_annual} onChange={e=>setF({...f,fake_users_annual:e.target.value})} style={inp} placeholder="+3200"/>
    </div>
    <button onClick={save} style={{width:"100%",padding:14,borderRadius:10,border:"none",background:saved?"#27ae60":G,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>{saved?"✅ Saved!":"Save Changes"}</button>
  </div>;
}

// Admin Panel
function Toast({msg,type,onDone}){useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t)},[onDone]);return<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:type==="ok"?"#27ae60":type==="err"?"#e74c3c":"#f39c12",color:"#fff",padding:"12px 24px",borderRadius:10,fontWeight:700,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",animation:"fadeIn 0.3s"}}><style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>{msg}</div>}

function Admin({auth,channels,config,setConfig,onClose,reload,onLogout}){
  const[tab,setTab]=useState("channels");const[eCh,setECh]=useState(null);const[sav,setSav]=useState(false);
  const[toast,setToast]=useState(null);
  const notify=(msg,type="ok")=>setToast({msg,type,k:Date.now()});
  const cats=Array.isArray(config?.categories)?config.categories:defCats;
  const defF=()=>({name:"",price:String(config?.default_price||50),video_count:"",category:config?.default_category||cats.filter(c=>c!=="INFO")[0]||"Action",top_selling:false,resolution:config?.default_resolution||"1080P",size:"",duration:"",section_top_viewed:false,section_latest:false,delivery_link:"",image_url:"",description:""});
  const[form,setForm]=useState(defF());
  const[sel,setSel]=useState(new Set());const[cDel,setCDel]=useState(false);const[chSearch,setChSearch]=useState("");
  const[users,setUsers]=useState([]);const[subs,setSubs]=useState([]);const[eSec,setESec]=useState(null);const[secT,setSecT]=useState("");const[newCat,setNewCat]=useState("");
  const[bulkNames,setBulkNames]=useState("");const[bulkCat,setBulkCat]=useState(config?.default_category||cats.filter(c=>c!=="INFO")[0]||"Action");const[bulkSav,setBulkSav]=useState(false);
  const inp={width:"100%",padding:"10px 12px",borderRadius:8,border:"2px solid #aaa",fontSize:14,marginBottom:8,boxSizing:"border-box",color:"#333",background:"#fff"};
  const rawH=Array.isArray(config?.sections)?config.sections:[];
  const eS=(id,ti)=>{const f=rawH.find(s=>s.id===id);return f||{id,title:ti,visible:true};};
  const homeSecs=[eS("top-selling","Top Selling Section of the Month"),eS("top-viewed","Top Viewed Videos of the Month"),eS("latest","Latest Updates")];

  useEffect(()=>{api.aGet("profiles","select=*&order=created_at").then(d=>{if(Array.isArray(d))setUsers(d);});api.aGet("gift_submissions","select=*&order=created_at.desc").then(d=>{if(Array.isArray(d))setSubs(d);})},[]);

  const saveCh=async()=>{if(!form.name)return;setSav(true);
    const rv=Math.floor(Math.random()*(1320-232+1))+232;
    const data={name:form.name,price:Number(form.price)||50,video_count:Number(form.video_count)||0,category:form.category,top_selling:form.top_selling,resolution:form.resolution||"",size:form.size||"",duration:form.duration||"",section_top_viewed:form.section_top_viewed,section_latest:form.section_latest,delivery_link:form.delivery_link||null,image_url:form.image_url||null,description:form.description||null,views:eCh?(eCh.views||rv):rv};
    if(eCh){const ok=await api.aPatch("channels",`id=eq.${eCh.id}`,data);if(!ok){notify("Save failed","err");setSav(false);return;}setECh(null);notify("✅ Channel saved");}else{const r=await api.aPost("channels",data);if(!r||r.message){notify("Add failed: "+(r?.message||"Error"),"err");setSav(false);return;}notify("✅ Channel added");}
    setForm(defF());await reload();setSav(false);};
  const delSel=async()=>{setSav(true);await api.aDel("channels",`id=in.(${[...sel].join(",")})`);notify(`🗑 ${sel.size} channel(s) deleted`);setSel(new Set());setCDel(false);await reload();setSav(false);};
  const bulkAdd=async()=>{const lines=bulkNames.split("\n").map(l=>l.trim()).filter(l=>l.length>0);if(!lines.length)return;setBulkSav(true);const res=config?.default_resolution||"1080P";const price=Number(config?.default_price)||50;for(const name of lines){const rv=Math.floor(Math.random()*(1320-232+1))+232;await api.aPost("channels",{name,price,video_count:0,category:bulkCat,top_selling:false,resolution:res,size:"",section_top_viewed:false,section_latest:false,delivery_link:null,image_url:null,description:null,views:rv});}notify(`✅ ${lines.length} channels added`);setBulkNames("");await reload();setBulkSav(false);};
  const sCfg=async u=>{const n={...config,...u};setConfig(n);await api.aPatch("site_config","id=eq.1",u);notify("✅ Saved");};
  const ban=async(id,b)=>{await api.aPatch("profiles",`id=eq.${id}`,{banned:!b});setUsers(u=>u.map(x=>x.id===id?{...x,banned:!b}:x));notify(b?"✅ User unbanned":"🚫 User banned");};
  const deliver=async(uid,link)=>{const u=users.find(x=>x.id===uid);if(u&&link){await api.aPatch("profiles",`id=eq.${uid}`,{delivery_link:link});setUsers(us=>us.map(x=>x.id===uid?{...x,delivery_link:link}:x));notify(`✅ Delivered to ${u.username||"user"}`);}};
  const acceptSub=async(s)=>{const chObj=channels.find(c=>String(c.id)===String(s.channel_id));const link=chObj?.delivery_link||config?.global_delivery_link||"";if(s.user_id&&link)await api.aPatch("profiles",`id=eq.${s.user_id}`,{delivery_link:link});await api.aPatch("gift_submissions",`id=eq.${s.id}`,{status:"accepted"});setSubs(x=>x.map(v=>v.id===s.id?{...v,status:"accepted"}:v));notify(link?`✅ Accepted & delivered to ${s.username||"user"}`:"✅ Accepted (set a delivery link on the channel)");};
  const rejectSub=async(s)=>{await api.aPatch("gift_submissions",`id=eq.${s.id}`,{status:"rejected"});setSubs(x=>x.map(v=>v.id===s.id?{...v,status:"rejected"}:v));notify("❌ Rejected");};
  const startE=ch=>{setECh(ch);setForm({name:ch.name,price:String(ch.price||""),video_count:String(ch.video_count||""),category:ch.category||"Action",top_selling:!!ch.top_selling,resolution:ch.resolution||"",size:ch.size||"",duration:ch.duration||"",section_top_viewed:!!ch.section_top_viewed,section_latest:!!ch.section_latest,delivery_link:ch.delivery_link||"",image_url:ch.image_url||"",description:ch.description||""});};
  const allS=channels.length>0&&sel.size===channels.length;

  // Auto stats
  const aVids=channels.reduce((a,c)=>a+(c.video_count||0),0);
  const aViews=channels.reduce((a,c)=>a+(c.views||0),0);
  const aSizeMB=channels.reduce((a,c)=>{const s=c.size||"0";const n=parseFloat(s)||0;return a+(s.toLowerCase().includes("gb")?n*1024:n)},0);
  const aSize=aSizeMB>1024?`${(aSizeMB/1024).toFixed(2)}GB`:`${aSizeMB.toFixed(0)}MB`;
  const fUsers=config?.fake_users||12840;
  const fUA=config?.fake_users_annual||"+3200";

  const tabs=[{k:"channels",l:"Add",i:<Plus size={14}/>},{k:"edit",l:"Edit",i:<Edit size={14}/>},{k:"users",l:"Users",i:<Users size={14}/>},{k:"payments",l:"Payments",i:<CreditCard size={14}/>},{k:"categories",l:"Categories",i:<FolderOpen size={14}/>},{k:"homepage",l:"Homepage",i:<Layout size={14}/>},{k:"site",l:"Site",i:<Monitor size={14}/>},{k:"stats",l:"Stats",i:<BarChart3 size={14}/>}];
  const chForm=<div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:16}}><div style={{fontWeight:700,fontSize:14,marginBottom:12}}>{eCh?`✏️ ${eCh.name}`:"➕ New Channel"}</div>
    <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp}/>
    <textarea placeholder="Description (shown when user clicks the product)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{...inp,minHeight:50,resize:"vertical"}}/>
    <div style={{display:"flex",gap:8}}><input placeholder="Price $" type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} style={{...inp,flex:1}}/><input placeholder="Total Count" type="number" value={form.video_count} onChange={e=>setForm({...form,video_count:e.target.value})} style={{...inp,flex:1}}/></div>
    <div style={{display:"flex",gap:8}}><select value={form.resolution} onChange={e=>setForm({...form,resolution:e.target.value})} style={{...inp,flex:1}}><option value="1080P">1080P</option><option value="4K">4K</option><option value="720P">720P</option></select><input placeholder="Size" value={form.size} onChange={e=>setForm({...form,size:e.target.value})} style={{...inp,flex:1}}/></div>
    <input placeholder="Duration (e.g. 7:00 min)" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} style={inp}/>
    <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>{cats.filter(c=>c!=="INFO").map(c=><option key={c}>{c}</option>)}</select>
    <div style={{fontSize:14,color:"#333",fontWeight:700,marginBottom:4}}>Image:</div>
    <ImgUp value={form.image_url} onChange={v=>setForm({...form,image_url:v})}/>
    <input placeholder="Delivery link (optional)" value={form.delivery_link} onChange={e=>setForm({...form,delivery_link:e.target.value})} style={inp}/>
    <div style={{fontSize:14,color:"#333",fontWeight:700,marginBottom:6}}>Show in:</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:10}}><label style={{display:"flex",alignItems:"center",gap:6,fontSize:14,cursor:"pointer",color:"#333",fontWeight:500}}><input type="checkbox" checked={form.top_selling} onChange={e=>setForm({...form,top_selling:e.target.checked})}/>Top Selling</label><label style={{display:"flex",alignItems:"center",gap:6,fontSize:14,cursor:"pointer",color:"#333",fontWeight:500}}><input type="checkbox" checked={form.section_top_viewed} onChange={e=>setForm({...form,section_top_viewed:e.target.checked})}/>Top Viewed</label><label style={{display:"flex",alignItems:"center",gap:6,fontSize:14,cursor:"pointer",color:"#333",fontWeight:500}}><input type="checkbox" checked={form.section_latest} onChange={e=>setForm({...form,section_latest:e.target.checked})}/>Latest Updates</label></div>
    <div style={{display:"flex",gap:8}}><button onClick={saveCh} disabled={sav} style={{flex:1,padding:11,border:"none",borderRadius:8,fontWeight:700,color:"#fff",cursor:"pointer",background:eCh?"#27ae60":G}}>{sav?"Saving...":eCh?"Save":"Add"}</button>{eCh&&<button onClick={()=>{setECh(null);setForm(defF())}} style={{padding:11,border:"1px solid #ddd",borderRadius:8,fontWeight:700,color:"#444",cursor:"pointer",background:"#fff"}}>Cancel</button>}</div>
  </div>;

  return<div style={{position:"fixed",inset:0,background:"#f5f5f5",zIndex:2000,overflowY:"auto"}}>
    {toast&&<Toast key={toast.k} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    <div style={{background:"#1a1a1a",color:"#fff",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}><div style={{display:"flex",alignItems:"center",gap:8}}><Settings size={20} color={G}/><span style={{fontWeight:800,fontSize:16}}>Admin</span></div><div style={{display:"flex",gap:8}}><button onClick={()=>{onClose();if(typeof onLogout==="function")onLogout()}} style={{background:"#555",color:"#fff",border:"none",padding:"6px 12px",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:4}}><LogOut size={12}/>Sign Out</button><button onClick={onClose} style={{background:G,color:"#fff",border:"none",padding:"6px 16px",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13}}>← Site</button></div></div>
    <div style={{display:"flex",background:"#fff",borderBottom:"2px solid #eee",overflowX:"auto"}}>{tabs.map(t=><button key={t.k} onClick={()=>{setTab(t.k);if(t.k==="channels"){setECh(null);setForm(defF())}}} style={{flex:1,minWidth:50,padding:"10px 0",border:"none",cursor:"pointer",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:3,background:tab===t.k?G:"#fff",color:tab===t.k?"#fff":"#777"}}>{t.i}{t.l}</button>)}</div>

    {tab==="payments"&&<div style={{padding:16}}>
      <div style={{fontWeight:700,fontSize:16,marginBottom:12,color:"#1a1a1a"}}>💳 Manual Payments ({subs.filter(s=>s.status==="pending").length} pending)</div>
      {subs.length===0&&<div style={{color:"#777",fontSize:14}}>No submissions yet.</div>}
      {subs.map(s=><div key={s.id} style={{background:"#fff",borderRadius:10,padding:14,marginBottom:10,border:"1px solid #eee"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {s.photo&&<img src={s.photo} alt="" style={{width:90,height:90,objectFit:"cover",borderRadius:8,border:"1px solid #ddd"}}/>}
          <div style={{flex:1,minWidth:160}}>
            <div style={{fontWeight:700,fontSize:14,color:"#1a1a1a"}}>{s.username||"user"} · <span style={{color:"#8E24AA"}}>{s.method||"Gift Card"}</span></div>
            <div style={{fontSize:13,color:"#555",marginTop:2}}>{s.channel_name} · ${s.price}</div>
            <div style={{fontSize:13,color:"#333",marginTop:4,wordBreak:"break-all"}}>Code: <b>{s.code}</b></div>
            <div style={{marginTop:6}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:700,background:s.status==="accepted"?"#E8F5E9":s.status==="rejected"?"#FDE8E8":"#FFF3E0",color:s.status==="accepted"?"#2E7D32":s.status==="rejected"?"#C62828":"#E65100"}}>{(s.status||"pending").toUpperCase()}</span></div>
          </div>
        </div>
        {s.status==="pending"&&<div style={{display:"flex",gap:8,marginTop:10}}>
          <button onClick={()=>acceptSub(s)} style={{flex:1,padding:9,borderRadius:8,border:"none",background:"#27ae60",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>Accept</button>
          <button onClick={()=>rejectSub(s)} style={{flex:1,padding:9,borderRadius:8,border:"none",background:R,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>Reject</button>
        </div>}
      </div>)}
    </div>}

    {tab==="channels"&&<div style={{padding:16}}>
      {!eCh&&chForm}
      <div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:16}}><div style={{fontWeight:700,fontSize:14,marginBottom:12}}>📦 Bulk Add (multiple products)</div>
        <div style={{fontSize:12,color:"#27ae60",marginBottom:8}}>One name per line. Uses defaults (resolution, price) from Site tab.</div>
        <textarea placeholder={"Product Name 1\nProduct Name 2\nProduct Name 3"} value={bulkNames} onChange={e=>setBulkNames(e.target.value)} style={{...inp,minHeight:80,resize:"vertical"}}/>
        <label style={{fontSize:13,color:"#555",fontWeight:600}}>Category for all:</label>
        <select value={bulkCat} onChange={e=>setBulkCat(e.target.value)} style={inp}>{cats.filter(c=>c!=="INFO").map(c=><option key={c}>{c}</option>)}</select>
        <button onClick={bulkAdd} disabled={bulkSav} style={{width:"100%",padding:11,border:"none",borderRadius:8,fontWeight:700,color:"#fff",cursor:"pointer",background:"#1565C0",opacity:bulkSav?0.7:1}}>{bulkSav?"Adding...":"Add All"}</button>
      </div>
    </div>}

    {tab==="edit"&&<div style={{padding:16}}>
      {eCh&&chForm}
      <input placeholder="🔍 Search product by name to edit..." value={chSearch} onChange={e=>setChSearch(e.target.value)} style={{...inp,marginBottom:10,fontWeight:600}}/>
      <div style={{background:"#fff",borderRadius:10,padding:"10px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><label style={{display:"flex",alignItems:"center",gap:8,fontSize:14,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={allS} onChange={()=>setSel(allS?new Set():new Set(channels.map(c=>c.id)))} style={{width:18,height:18}}/>{allS?"Deselect":"Select"} All ({channels.length})</label>{sel.size>0&&(!cDel?<button onClick={()=>setCDel(true)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:R,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>Delete ({sel.size})</button>:<div style={{display:"flex",gap:4}}><button onClick={delSel} style={{padding:"6px 12px",borderRadius:8,border:"none",background:R,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11}}>⚠️ Confirm</button><button onClick={()=>setCDel(false)} style={{padding:"6px 10px",borderRadius:8,border:"1px solid #ddd",background:"#fff",color:"#444",cursor:"pointer",fontSize:11}}>No</button></div>)}</div>
      {(chSearch.trim()?channels.filter(c=>(c.name||"").toLowerCase().includes(chSearch.trim().toLowerCase())):channels).map(ch=><div key={ch.id} style={{background:sel.has(ch.id)?"#FFF8E1":"#fff",borderRadius:10,padding:"11px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10,border:sel.has(ch.id)?`2px solid ${G}`:"2px solid transparent"}}><input type="checkbox" checked={sel.has(ch.id)} onChange={()=>{const n=new Set(sel);n.has(ch.id)?n.delete(ch.id):n.add(ch.id);setSel(n)}} style={{width:18,height:18}}/>{ch.image_url&&<img src={ch.image_url} alt="" style={{width:50,height:28,objectFit:"cover",borderRadius:4}}/>}<div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:14}}>{ch.name} {ch.top_selling&&<span style={{fontSize:10,background:"#FFF3E0",color:"#E65100",padding:"2px 6px",borderRadius:4}}>TOP</span>} {ch.section_top_viewed&&<span style={{fontSize:10,background:"#E3F2FD",color:"#1565C0",padding:"2px 6px",borderRadius:4}}>VIEWED</span>} {ch.section_latest&&<span style={{fontSize:10,background:"#E8F5E9",color:"#2E7D32",padding:"2px 6px",borderRadius:4}}>LATEST</span>}</div><div style={{fontSize:11,color:"#555",marginTop:2}}>{ch.category} · ${ch.price} · {ch.video_count} · {ch.resolution||"—"} · 👁 {ch.views||0}</div></div><button onClick={()=>startE(ch)} style={{width:32,height:32,borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Edit size={13} color="#555"/></button></div>)}
    </div>}

    {tab==="users"&&<div style={{padding:16}}><div style={{fontWeight:700,fontSize:16,marginBottom:12}}>👥 Users ({users.length})</div>{users.map(u=><div key={u.id} style={{background:u.banned?"#FDE8E8":"#fff",borderRadius:10,padding:14,marginBottom:8,border:u.banned?"2px solid #fcc":"1px solid #eee"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div><div style={{fontWeight:700,fontSize:14}}>{u.username||"user"}</div><div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:700,background:u.role==="admin"?"#E65100":"#E8F5E9",color:u.role==="admin"?"#fff":"#2E7D32"}}>{(u.role||"user").toUpperCase()}</span>{u.banned&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:700,background:R,color:"#fff"}}>BANNED</span>}{u.delivery_link&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:700,background:"#E3F2FD",color:"#1565C0"}}>DELIVERED</span>}</div></div><div style={{display:"flex",gap:5}}>{u.role!=="admin"&&<button onClick={()=>ban(u.id,u.banned)} style={{padding:"6px 10px",borderRadius:8,border:"none",background:u.banned?"#27ae60":R,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11}}>{u.banned?"Unban":"Ban"}</button>}{u.role!=="admin"&&<button onClick={()=>{const l=prompt("Delivery link:",config?.global_delivery_link||"");if(l)deliver(u.id,l)}} style={{padding:"6px 10px",borderRadius:8,border:"none",background:"#1565C0",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11}}><Send size={11}/> Deliver</button>}</div></div>{u.delivery_link&&<div style={{marginTop:8,fontSize:12,color:"#1565C0",background:"#E3F2FD",padding:"6px 10px",borderRadius:6,wordBreak:"break-all"}}>📦 {u.delivery_link}</div>}</div>)}</div>}

    {tab==="categories"&&<div style={{padding:16}}>
      <div style={{fontWeight:700,fontSize:16,marginBottom:12}}>📁 Sidebar Categories</div>
      <div style={{marginBottom:12}}><textarea placeholder={"Add categories (one per line)\nExample:\nGOLD AREA 2\nGOLD 3\nGOLD 4"} value={newCat} onChange={e=>setNewCat(e.target.value)} style={{...inp,minHeight:70,resize:"vertical"}}/><button onClick={()=>{const lines=newCat.split("\n").map(l=>l.trim()).filter(l=>l.length>0);if(!lines.length)return;sCfg({categories:[...cats,...lines]});setNewCat("");notify(`✅ ${lines.length} category(s) added`)}} style={{width:"100%",padding:10,borderRadius:8,border:"none",background:G,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}><Plus size={14}/> Add</button></div>
      <div style={{display:"flex",gap:8,marginBottom:12}}><button onClick={()=>{if(!confirm("Delete ALL categories? (INFO stays)"))return;sCfg({categories:["INFO"]});notify("🗑 All categories deleted")}} style={{padding:"8px 16px",borderRadius:8,border:"none",background:R,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>🗑 Delete All (keep INFO)</button></div>
      {cats.map((cat,i)=><div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontWeight:700,fontSize:14}}>{cat==="GOLD-AREA"?<span style={{color:R}}>{cat}</span>:cat}</div><div style={{display:"flex",gap:4}}>{cat!=="INFO"&&i>0&&<button onClick={()=>{const n=[...cats];[n[i-1],n[i]]=[n[i],n[i-1]];sCfg({categories:n})}} style={{width:28,height:28,borderRadius:6,border:"1px solid #ddd",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronUp size={13}/></button>}{cat!=="INFO"&&i<cats.length-1&&<button onClick={()=>{const n=[...cats];[n[i],n[i+1]]=[n[i+1],n[i]];sCfg({categories:n})}} style={{width:28,height:28,borderRadius:6,border:"1px solid #ddd",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronDown size={13}/></button>}{cat!=="INFO"&&<button onClick={()=>{if(!confirm(`Delete "${cat}"?`))return;sCfg({categories:cats.filter((_,j)=>j!==i)});notify(`🗑 "${cat}" deleted`)}} style={{width:28,height:28,borderRadius:6,border:"1px solid #fdd",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Trash2 size={13} color={R}/></button>}</div></div>)}
    </div>}

    {tab==="homepage"&&<div style={{padding:16}}>
      <div style={{fontWeight:700,fontSize:16,marginBottom:12}}>🏠 Homepage Sections</div>
      {homeSecs.map(sec=><div key={sec.id} style={{background:"#fff",borderRadius:10,padding:14,marginBottom:10}}>{eSec===sec.id?<div><input value={secT} onChange={e=>setSecT(e.target.value)} style={inp}/><div style={{display:"flex",gap:8}}><button onClick={()=>{sCfg({sections:homeSecs.map(s=>s.id===sec.id?{...s,title:secT}:s)});setESec(null)}} style={{flex:1,padding:10,border:"none",borderRadius:8,background:"#27ae60",color:"#fff",fontWeight:700,cursor:"pointer"}}>Save</button><button onClick={()=>setESec(null)} style={{padding:10,border:"1px solid #ddd",borderRadius:8,color:"#444",cursor:"pointer",background:"#fff"}}>Cancel</button></div></div>:<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,fontSize:14,color:sec.visible?"#1a1a1a":"#bbb"}}>{sec.title}</div><div style={{fontSize:11,color:sec.visible?"#27ae60":"#ccc",marginTop:2}}>{sec.visible?"✅ Visible":"⬜ Hidden"}</div></div><div style={{display:"flex",gap:5}}><button onClick={()=>sCfg({sections:homeSecs.map(s=>s.id===sec.id?{...s,visible:!s.visible}:s)})} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #ddd",background:sec.visible?"#e8f5e9":"#fff",cursor:"pointer",fontSize:12}}>{sec.visible?"Hide":"Show"}</button><button onClick={()=>{setESec(sec.id);setSecT(sec.title)}} style={{width:32,height:32,borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Edit size={13} color="#555"/></button></div></div>}</div>)}
    </div>}

    {tab==="site"&&<SiteTab config={config} sCfg={sCfg} inp={inp}/>}

    {tab==="stats"&&<div style={{padding:16}}>{[{l:"Channels",v:channels.length,c:"#3498db"},{l:"Total Videos",v:aVids,c:"#27ae60"},{l:"Content Size",v:aSize,c:"#e67e22"},{l:"Total Views",v:aViews,c:"#9b59b6"},{l:"Revenue Potential",v:`$${channels.reduce((a,c)=>a+(c.price||0),0)}`,c:"#f39c12"},{l:"Registered Users",v:users.length,c:"#e74c3c"},{l:"Banned",v:users.filter(u=>u.banned).length,c:"#c0392b"},{l:"Display Users",v:fUsers,c:"#1abc9c"}].map((s,i)=><div key={i} style={{background:"#fff",borderRadius:12,padding:16,marginBottom:10,borderLeft:`4px solid ${s.c}`}}><div style={{fontSize:13,color:"#555",fontWeight:600,fontWeight:600}}>{s.l}</div><div style={{fontSize:26,fontWeight:800,marginTop:4}}>{s.v}</div></div>)}</div>}
  </div>;
}

// Route persistence via localStorage (not URL hash — avoids hydration issues)
function saveRoute(r){try{localStorage.setItem("route",JSON.stringify(r))}catch{}}
function loadRoute(){try{const s=localStorage.getItem("route");return s?JSON.parse(s):null}catch{return null}}
function clearRoute(){try{localStorage.removeItem("route")}catch{}}

// Main
export default function App(){
  const[mO,setMO]=useState(false);const[chs,setChs]=useState([]);const[cfg,setCfg]=useState(defCfg);
  const[sCh,setSCh]=useState(null);const[iP,setIP]=useState(null);const[auth,setAuth]=useState(null);
  const[sA,setSA]=useState(false);const[sAd,setSAd]=useState(false);const[aM,setAM]=useState("signup");
  const[mounted,setMounted]=useState(false);const[ready,setReady]=useState(false);
  const scr=useScreen();const isA=auth?.role==="admin";
  const[pendCh,setPendCh]=useState(null);
  const[userCount,setUserCount]=useState(0);
  const[mySubs,setMySubs]=useState([]);

  const navCh=(ch)=>{setSCh(ch);setIP(null);setMO(false);setPendCh(null);if(ch){saveRoute({t:"ch",id:ch.id});window.history.replaceState(null,"","#"+dId(ch.id));
    api.aPatch("channels",`id=eq.${ch.id}`,{views:(ch.views||0)+1}).then(()=>{setChs(prev=>prev.map(c=>c.id===ch.id?{...c,views:(c.views||0)+1}:c));});
  }else{clearRoute();window.history.replaceState(null,"",window.location.pathname);}};
  const navInfo=(p)=>{setIP(p);setSCh(null);setMO(false);setPendCh(null);if(p){saveRoute({t:"info",p});window.history.replaceState(null,"","#"+p);}else{clearRoute();window.history.replaceState(null,"",window.location.pathname);}};
  const navHome=()=>{setSCh(null);setIP(null);setMO(false);setPendCh(null);clearRoute();window.history.replaceState(null,"",window.location.pathname);};
  const openAdmin=()=>{setSAd(true);saveRoute({t:"admin"});window.history.replaceState(null,"",window.location.pathname);};
  const closeAdmin=()=>{setSAd(false);clearRoute();window.history.replaceState(null,"",window.location.pathname);load();};
  const openAuth=(m)=>{setSCh(null);setIP(null);setMO(false);setSAd(false);setPendCh(null);setAM(m);setSA(true);saveRoute({t:"auth",m});window.history.replaceState(null,"","#"+m);window.scrollTo(0,0);};
  const closeAuth=()=>{setSA(false);clearRoute();window.history.replaceState(null,"",window.location.pathname);window.scrollTo(0,0);};

  useEffect(()=>{
    let vp=document.querySelector('meta[name="viewport"]');
    if(!vp){vp=document.createElement("meta");vp.setAttribute("name","viewport");document.head.appendChild(vp);}
    vp.setAttribute("content","width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
  },[]);

  // Mount: restore from URL hash (shared links) OR localStorage (F5)
  useEffect(()=>{
    const s=loadAuth();if(s){setAuth(s);setSA(false);}
    const h=window.location.hash.replace("#","");
    if(h){
      // Shared link - hash takes priority
      if(["p053","p041","p072"].includes(h)){setIP(h);}
      else if(h==="login"||h==="signup"){if(!s){setAM(h);setSA(true);}}
      else if(/^\d{5}$/.test(h)){setPendCh(h);}// display ID, resolve after load
      else{// fallback to localStorage
        const r=loadRoute();
        if(r&&r.t==="info")setIP(r.p);
        else if(r&&r.t==="ch")setPendCh(r.id);
        else if(r&&r.t==="admin"&&s?.role==="admin")setSAd(true);
        else if(r&&r.t==="auth"&&!s){setAM(r.m||"login");setSA(true);}
      }
    }else{
      const r=loadRoute();
      if(r&&r.t==="info")setIP(r.p);
      else if(r&&r.t==="ch")setPendCh(r.id);
      else if(r&&r.t==="admin"&&s?.role==="admin")setSAd(true);
      else if(r&&r.t==="auth"&&!s){setAM(r.m||"login");setSA(true);}
    }
    setMounted(true);
  },[]);

  // Load data + restore pending channel (by real ID or display ID)
  const load=useCallback(async()=>{try{const c=await api.get("channels","select=*&order=id");const f=await api.getOne("site_config","id=eq.1&select=*");setChs(c);if(f)setCfg({...defCfg,...f,sections:Array.isArray(f.sections)?f.sections:defCfg.sections,categories:Array.isArray(f.categories)?f.categories:defCfg.categories,manual_payments:Array.isArray(f.manual_payments)?f.manual_payments:[]});
    const r=loadRoute();const h=window.location.hash.replace("#","");
    // Try hash first (shared link), then localStorage
    if(h&&/^\d{5}$/.test(h)){const found=c.find(x=>dId(x.id)===h);if(found){setSCh(found);setPendCh(null);saveRoute({t:"ch",id:found.id});}}
    else if(r&&r.t==="ch"){const found=c.find(x=>String(x.id)===String(r.id));if(found){setSCh(found);setPendCh(null);}}
    const u=await api.aGet("profiles","select=id");if(Array.isArray(u))setUserCount(u.length);
  }catch{setChs([]);setCfg(defCfg);}setReady(true)},[]);
  useEffect(()=>{load()},[load]);

  // Load the user's own Gift Card submissions (to show "in process" status)
  const refreshMySubs=useCallback(()=>{const tk=loadAuth()?.token;if(!tk){setMySubs([]);return;}fetch("/api/gift",{headers:{"Authorization":`Bearer ${tk}`}}).then(r=>r.ok?r.json():[]).then(d=>{setMySubs(Array.isArray(d)?d:[])}).catch(()=>{})},[]);
  useEffect(()=>{refreshMySubs()},[auth,refreshMySubs]);

  const hasPending=mySubs.some(s=>s.status==="pending");

  if(!mounted)return<div style={{minHeight:"100dvh",background:"#f2f2f2",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{background:G,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}><LI src={null} size={40}/><div><div style={{color:"#fff",fontWeight:900,fontSize:20,letterSpacing:1}}>XIRUTE.COM</div><div style={{color:"#ffffffbb",fontSize:10}}>For All Your Pleasures</div></div></div>
    <div style={{display:"flex",justifyContent:"center",padding:"90px 0"}}><div style={{width:46,height:46,border:"4px solid #f0f0f0",borderTop:`4px solid ${R}`,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/></div>
  </div>;

  if(sAd&&isA)return<Admin auth={auth} channels={chs} config={cfg} setConfig={setCfg} onClose={closeAdmin} reload={load} onLogout={()=>{setAuth(null);clearAuth();openAuth("login");}}/>;
  if(sA&&!auth)return<Auth defaultMode={aM} onLogin={a=>{setAuth(a);setSAd(false);closeAuth()}} onBack={()=>closeAuth()}/>;

  // If there's a pending channel, show header + spinner (not homepage)
  const waiting=pendCh!==null&&!sCh;
  const loading=!ready&&!waiting;

  const rawH=Array.isArray(cfg.sections)?cfg.sections:[];
  const eS=(id,ti)=>{const f=rawH.find(s=>s.id===id);return f||{id,title:ti,visible:true};};
  const tS=eS("top-selling","Top Selling Section of the Month"),tV=eS("top-viewed","Top Viewed Videos of the Month"),la=eS("latest","Latest Updates");

  const aVids=chs.reduce((a,c)=>a+(c.video_count||0),0);
  const aViews=chs.reduce((a,c)=>a+(c.views||0),0);
  const aSMB=chs.reduce((a,c)=>{const s=c.size||"0";const n=parseFloat(s)||0;return a+(s.toLowerCase().includes("gb")?n*1024:n)},0);
  const aS=aSMB>1024?`${(aSMB/1024).toFixed(2)}GB`:`${aSMB.toFixed(0)}MB`;
  const pad=scr.desktop?"20px 60px":scr.tablet?"16px 30px":"14px 16px";

  return<div onContextMenu={e=>{if(e.target.tagName==="IMG"||e.target.style?.backgroundImage)e.preventDefault()}} style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f2f2f2"}}>
    <style>{`html,body{background:#f2f2f2!important;margin:0;padding:0;-webkit-text-size-adjust:100%;}img{-webkit-user-drag:none;user-select:none;-webkit-touch-callout:none;pointer-events:none;}@keyframes spin{to{transform:rotate(360deg)}}::placeholder{color:#999!important;opacity:1!important;}input,textarea,select{color:#333!important;font-size:16px!important;max-height:none;touch-action:manipulation;}`}</style>
    <style>{`img{-webkit-user-select:none;user-select:none;pointer-events:none;-webkit-touch-callout:none;}div[style*="background:url"],div[style*="background: url"]{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}`}</style>
    <div style={{background:G,padding:scr.desktop?"16px 60px":"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>navHome()}><LI src={cfg.logo_url} size={scr.desktop?48:40}/><div><div style={{color:"#fff",fontWeight:900,fontSize:scr.desktop?26:20,letterSpacing:1}}>XIRUTE.COM</div><div style={{color:"#ffffffbb",fontSize:scr.desktop?12:10}}>For All Your Pleasures</div></div></div>{mO?<X size={28} color="#FFD54F" style={{cursor:"pointer"}} onClick={()=>setMO(false)}/>:<Menu size={28} color="#fff" style={{cursor:"pointer"}} onClick={()=>setMO(true)}/>}</div>

    <DM open={mO} channels={chs} config={cfg} auth={auth} onSel={ch=>navCh(ch)} isAdmin={isA} onAdmin={()=>{setMO(false);isA?openAdmin():openAuth("login")}} onLogout={()=>{setAuth(null);clearAuth();openAuth("login")}} onInfo={p=>navInfo(p)}/>

    {iP?<div style={{maxWidth:900,margin:"0 auto",padding:pad}}><InfoP page={iP} config={cfg}/></div>
    :sCh?<div style={{maxWidth:650,margin:"0 auto"}}><ChPage ch={sCh} config={cfg} auth={auth} onAuth={()=>openAuth("signup")} pendingSub={mySubs.some(s=>String(s.channel_id)===String(sCh.id)&&s.status==="pending")} onSubmitted={refreshMySubs}/></div>
    :waiting?<div style={{maxWidth:650,margin:"0 auto",padding:16}}><div style={{background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",padding:40,textAlign:"center"}}><Spin/></div></div>
    :<>
      {hasPending&&<div style={{margin:pad,padding:"12px 16px",background:"#FFF3E0",border:"1px solid #FFCC80",borderRadius:10,color:"#E65100",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",gap:8}}>⏳ Your Gift Card request is in process. We&apos;ll review it and confirm your access shortly.</div>}
      <div style={{padding:pad,display:"grid",gridTemplateColumns:scr.desktop?"1fr 1fr 1fr 1fr":scr.tablet?"1fr 1fr":"1fr",gap:12}}>
        <SC label="Video" value={aVids||0} sub="new Videos (annual)" change={`+${aVids}`} icon={<Play size={20}/>} iconBg="#F5D6A0" ready={ready}/>
        <SC label="Content Size" value={aS} sub="All video size" icon={<HardDrive size={20}/>} iconBg="#F5D6A0" ready={ready}/>
        <SC label="Views" value={aViews||0} sub="Total views" icon={<Eye size={20}/>} iconBg="#A0917B" ready={ready}/>
        <SC label="Users" value={(cfg.fake_users||12840)+userCount} sub="new Users (annual)" change={cfg.fake_users_annual||"+3200"} icon={<Star size={20}/>} iconBg="#F5D6A0" ready={ready}/>
      </div>
      {!ready&&<div style={{textAlign:"center",padding:"30px 0"}}><div style={{width:36,height:36,border:"4px solid #f0f0f0",borderTop:`4px solid ${R}`,borderRadius:"50%",animation:"spin 0.7s linear infinite",margin:"0 auto"}}/></div>}

      {tS.visible!==false&&chs.filter(c=>c.top_selling).length>0&&<><div style={{padding:scr.desktop?"30px 60px":"24px 16px",background:"#fafafa",textAlign:"center"}}><div style={{display:"inline-block",border:`1px solid ${G}50`,borderRadius:30,padding:"10px 24px",marginBottom:20}}><span style={{color:R,fontWeight:700,fontSize:scr.desktop?14:12,letterSpacing:2,textTransform:"uppercase"}}>{tS.title}</span></div><div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>{chs.filter(c=>c.top_selling).map((ch,i)=>{const c=tagC[i%tagC.length];return<span key={ch.id} onClick={()=>navCh(ch)} style={{background:c.bg,color:c.t,padding:scr.desktop?"10px 22px":"8px 18px",borderRadius:30,fontWeight:700,fontSize:scr.desktop?14:13,cursor:"pointer"}}>{ch.name}</span>})}</div></div><div style={{height:3,background:G}}/></>}

      {tV.visible!==false&&chs.filter(c=>c.section_top_viewed).length>0&&<><div style={{padding:scr.desktop?"30px 60px":"24px 16px",textAlign:"center"}}><div style={{display:"inline-block",border:`1px solid ${G}50`,borderRadius:30,padding:"10px 24px",marginBottom:20}}><span style={{color:R,fontWeight:700,fontSize:scr.desktop?14:12,letterSpacing:2,textTransform:"uppercase"}}>{tV.title}</span></div><div style={{display:"grid",gridTemplateColumns:scr.desktop?"1fr 1fr 1fr":scr.tablet?"1fr 1fr":"1fr",gap:16}}>{chs.filter(c=>c.section_top_viewed).map(ch=><VT key={`tv-${ch.id}`} v={{title:ch.name,resolution:ch.resolution,views:ch.views,image_url:ch.image_url}} onClick={()=>navCh(ch)}/>)}</div></div><div style={{height:3,background:G}}/></>}

      {la.visible!==false&&chs.filter(c=>c.section_latest).length>0&&<div style={{padding:scr.desktop?"30px 60px":"24px 16px",textAlign:"center"}}><div style={{display:"inline-block",border:`1px solid ${G}50`,borderRadius:30,padding:"10px 24px",marginBottom:20}}><span style={{color:R,fontWeight:700,fontSize:scr.desktop?14:12,letterSpacing:2,textTransform:"uppercase"}}>{la.title}</span></div><div style={{display:"grid",gridTemplateColumns:scr.desktop?"1fr 1fr 1fr":scr.tablet?"1fr 1fr":"1fr",gap:16}}>{chs.filter(c=>c.section_latest).map(ch=><VT key={`la-${ch.id}`} v={{title:ch.name,resolution:ch.resolution,views:ch.views,image_url:ch.image_url}} onClick={()=>navCh(ch)}/>)}</div></div>}

      <div style={{background:G,padding:"20px 16px",textAlign:"center",color:"#fff",fontSize:12}}>© 2026 XIRUTE.COM — All Rights Reserved</div>
    </>}
  </div>;
}