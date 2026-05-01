import { useState, useEffect, useRef, useCallback } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0A0A0F",card:"#12121A",card2:"#1A1A28",card3:"#1F1F30",
  primary:"#7C3AED",primaryLight:"#9D5FF3",primaryDark:"#5B21B6",
  accent:"#F59E0B",accentLight:"#FCD34D",
  white:"#FFFFFF",muted:"#6B7280",mutedLight:"#9CA3AF",
  success:"#10B981",error:"#EF4444",border:"#2D2D4E",info:"#3B82F6",
  glass:"rgba(255,255,255,0.04)",glassBorder:"rgba(255,255,255,0.08)",
};

// ─── DB (avec sécurité JSON) ───────────────────────────────────────────────────
const safeGet = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const defaultStats = () => ({
  xp:0,level:1,streak:0,bestStreak:0,quizDone:0,goodAnswers:0,
  totalAnswers:0,history:[],lastLogin:null,subjectStats:{},
  weeklyXP:[0,0,0,0,0,0,0],hasPerfect:false,hasNightOwl:false,hasSpeed:false,
  totalTimeSpent:0,avgScore:0,
});
const DB = {
  getUsers:()=>safeGet("sq_users",[]),
  saveUsers:u=>localStorage.setItem("sq_users",JSON.stringify(u)),
  getNotes:uid=>safeGet(`sq_notes_${uid}`,[]),
  saveNotes:(uid,n)=>localStorage.setItem(`sq_notes_${uid}`,JSON.stringify(n)),
  getStats:uid=>({...defaultStats(),...safeGet(`sq_stats_${uid}`,{})}),
  saveStats:(uid,s)=>localStorage.setItem(`sq_stats_${uid}`,JSON.stringify(s)),
  getFriends:uid=>safeGet(`sq_friends_${uid}`,[]),
  saveFriends:(uid,f)=>localStorage.setItem(`sq_friends_${uid}`,JSON.stringify(f)),
  getQHist:uid=>safeGet(`sq_qhist_${uid}`,[]),
  saveQHist:(uid,h)=>localStorage.setItem(`sq_qhist_${uid}`,JSON.stringify(h)),
};

// ─── BADGES ───────────────────────────────────────────────────────────────────
const ALL_BADGES = [
  {id:"first_quiz",icon:"⭐",label:"Débutant",desc:"Terminer son 1er quiz",color:"#F59E0B",check:s=>s.quizDone>=1},
  {id:"quiz10",icon:"🎯",label:"Assidu",desc:"10 quiz réalisés",color:"#3B82F6",check:s=>s.quizDone>=10},
  {id:"quiz50",icon:"📚",label:"Bibliothécaire",desc:"50 quiz réalisés",color:"#8B5CF6",check:s=>s.quizDone>=50},
  {id:"quiz100",icon:"💯",label:"Centurion",desc:"100 quiz réalisés",color:"#EF4444",check:s=>s.quizDone>=100},
  {id:"good10",icon:"✅",label:"Premier pas",desc:"10 bonnes réponses",color:"#10B981",check:s=>s.goodAnswers>=10},
  {id:"good50",icon:"🏆",label:"Expert",desc:"50 bonnes réponses",color:"#F59E0B",check:s=>s.goodAnswers>=50},
  {id:"good200",icon:"🧠",label:"Génie",desc:"200 bonnes réponses",color:"#7C3AED",check:s=>s.goodAnswers>=200},
  {id:"perfect",icon:"💎",label:"Parfait",desc:"Score 100% sur un quiz",color:"#06B6D4",check:s=>s.hasPerfect},
  {id:"streak3",icon:"🔥",label:"En feu",desc:"3 jours consécutifs",color:"#F97316",check:s=>s.bestStreak>=3},
  {id:"streak7",icon:"⚡",label:"Série 7j",desc:"7 jours consécutifs",color:"#EF4444",check:s=>s.bestStreak>=7},
  {id:"streak30",icon:"🌟",label:"Légende",desc:"30 jours consécutifs",color:"#F59E0B",check:s=>s.bestStreak>=30},
  {id:"xp500",icon:"💰",label:"Riche en XP",desc:"500 XP accumulés",color:"#10B981",check:s=>s.xp>=500},
  {id:"xp5000",icon:"👑",label:"Roi des XP",desc:"5000 XP accumulés",color:"#F59E0B",check:s=>s.xp>=5000},
  {id:"note1",icon:"📝",label:"Scribe",desc:"Créer sa 1ère note",color:"#3B82F6",check:(s,n)=>n.length>=1},
  {id:"note10",icon:"📖",label:"Encyclopédie",desc:"10 notes créées",color:"#8B5CF6",check:(s,n)=>n.length>=10},
  {id:"night_owl",icon:"🦉",label:"Oiseau de nuit",desc:"Réviser après minuit",color:"#6366F1",check:s=>s.hasNightOwl},
  {id:"speed",icon:"⚡",label:"Speed Runner",desc:"Quiz terminé en <60s",color:"#06B6D4",check:s=>s.hasSpeed},
  {id:"multilang",icon:"🌍",label:"Polyglotte",desc:"Notes dans 3 matières",color:"#10B981",check:(s,n)=>new Set(n.map(x=>x.subject)).size>=3},
  {id:"accuracy90",icon:"🎖️",label:"Précision",desc:"90%+ de taux de réussite (≥10 quiz)",color:"#F59E0B",check:s=>s.quizDone>=10&&s.totalAnswers>0&&Math.round(s.goodAnswers/s.totalAnswers*100)>=90},
  {id:"marathon",icon:"🏃",label:"Marathon",desc:"Passer 60min à réviser",color:"#EC4899",check:s=>(s.totalTimeSpent||0)>=3600},
];

// ─── RANGS ────────────────────────────────────────────────────────────────────
const ALL_RANKS = [
  {id:"novice",    label:"Novice",       icon:"🌱", minXP:0,     color:"#6B7280", shadow:"rgba(107,114,128,.4)"},
  {id:"apprenti",  label:"Apprenti",     icon:"📖", minXP:500,   color:"#10B981", shadow:"rgba(16,185,129,.4)"},
  {id:"etudiant",  label:"Étudiant",     icon:"🎒", minXP:1500,  color:"#3B82F6", shadow:"rgba(59,130,246,.4)"},
  {id:"savant",    label:"Savant",       icon:"🔬", minXP:3000,  color:"#8B5CF6", shadow:"rgba(139,92,246,.4)"},
  {id:"expert",    label:"Expert",       icon:"⚡", minXP:6000,  color:"#F59E0B", shadow:"rgba(245,158,11,.4)"},
  {id:"maitre",    label:"Maître",       icon:"🏆", minXP:10000, color:"#EF4444", shadow:"rgba(239,68,68,.4)"},
  {id:"champion",  label:"Champion",     icon:"💎", minXP:20000, color:"#06B6D4", shadow:"rgba(6,182,212,.4)"},
  {id:"legende",   label:"Légende",      icon:"👑", minXP:50000, color:"#F59E0B", shadow:"rgba(245,158,11,.6)"},
];

const getRank = xp => {
  let rank = ALL_RANKS[0];
  for (const r of ALL_RANKS) { if (xp >= r.minXP) rank = r; else break; }
  return rank;
};
const getNextRank = xp => {
  const idx = ALL_RANKS.findIndex(r => r.id === getRank(xp).id);
  return ALL_RANKS[idx+1] || null;
};

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
if (!OPENROUTER_KEY) console.warn("⚠️ VITE_OPENROUTER_API_KEY manquante dans le fichier .env");

const hashPwd = pwd => {
  let h = 5381;
  for (let i = 0; i < pwd.length; i++) h = ((h << 5) + h) ^ pwd.charCodeAt(i);
  return (h >>> 0).toString(16) + "_" + pwd.length;
};

const timeAgo = ts => {
  const d = Date.now() - ts;
  if (d < 60000) return "À l'instant";
  if (d < 3600000) return `Il y a ${Math.floor(d/60000)}min`;
  if (d < 86400000) return `Il y a ${Math.floor(d/3600000)}h`;
  return `Il y a ${Math.floor(d/86400000)}j`;
};

const formatTime = secs => {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2,"0")}`;
};

const SUBJECTS = ["Biologie","Maths","Physique","Histoire","Chimie","Géographie","Littérature","Informatique"];
const SC = {Biologie:"#10B981",Maths:"#3B82F6",Physique:"#F59E0B",Histoire:"#EF4444",Chimie:"#8B5CF6",Géographie:"#06B6D4",Littérature:"#F97316",Informatique:"#6366F1"};
const SI = {Biologie:"🔬",Maths:"📐",Physique:"⚛️",Histoire:"🏛️",Chimie:"🧪",Géographie:"🌍",Littérature:"📚",Informatique:"💻"};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const gs = {
  app:{minHeight:"100vh",background:"#050508",fontFamily:"'Nunito',sans-serif",color:C.white,display:"flex",justifyContent:"center",alignItems:"center",padding:"20px 0"},
  phone:{width:390,height:780,background:C.bg,borderRadius:40,overflow:"hidden",boxShadow:`0 0 0 1px ${C.glassBorder},0 0 60px rgba(124,58,237,.15),0 60px 120px rgba(0,0,0,.95)`,display:"flex",flexDirection:"column",position:"relative"},
  statusBar:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 22px 4px",fontSize:12,color:C.white,flexShrink:0},
  scroll:{flex:1,overflowY:"auto",scrollbarWidth:"none"},
  btn:(v="primary",extra={})=>({width:"100%",padding:"14px",borderRadius:16,cursor:"pointer",fontSize:14,fontWeight:800,fontFamily:"'Nunito',sans-serif",letterSpacing:.3,transition:"all .2s",
    background:v==="primary"?`linear-gradient(135deg,${C.primary},${C.primaryLight})`:v==="danger"?`${C.error}18`:"transparent",
    color:v==="danger"?C.error:C.white,
    boxShadow:v==="primary"?`0 4px 24px rgba(124,58,237,.45),inset 0 1px 0 rgba(255,255,255,.1)`:"none",
    border:v==="outline"?`1.5px solid ${C.border}`:v==="danger"?`1.5px solid ${C.error}44`:"none",...extra}),
  input:{width:"100%",padding:"12px 14px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.card,color:C.white,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",transition:"border .2s"},
  card:(extra={})=>({background:C.card,borderRadius:18,padding:16,...extra}),
  glass:(extra={})=>({background:C.glass,backdropFilter:"blur(20px)",borderRadius:18,padding:16,border:`1px solid ${C.glassBorder}`,...extra}),
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type="info", icon) => {
    const id = Date.now();
    setToasts(t => [...t.slice(-2), {id, msg, type, icon}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);
  return {toasts, show};
}

function Toast({toasts}) {
  return (
    <div style={{position:"absolute",top:58,left:0,right:0,zIndex:999,display:"flex",flexDirection:"column",gap:6,padding:"0 14px",pointerEvents:"none"}}>
      {toasts.map(t => (
        <div key={t.id} style={{background:t.type==="success"?`${C.success}F0`:t.type==="error"?`${C.error}F0`:`${C.primary}F0`,borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 8px 24px rgba(0,0,0,.5)",animation:"slideIn .3s cubic-bezier(0.34,1.56,0.64,1)"}}>
          <span style={{fontSize:16}}>{t.icon||"ℹ️"}</span>
          <span style={{fontSize:13,fontWeight:700}}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── BADGE POPUP ──────────────────────────────────────────────────────────────
function BadgePopup({badge, onClose}) {
  const cb = useCallback(onClose, [onClose]);
  useEffect(() => { const t = setTimeout(cb, 4500); return () => clearTimeout(t); }, [cb]);
  if (!badge) return null;
  return (
    <div style={{position:"absolute",bottom:90,left:14,right:14,zIndex:998,background:`linear-gradient(135deg,${badge.color}28,${C.card2})`,border:`1.5px solid ${badge.color}66`,borderRadius:20,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,boxShadow:`0 12px 40px ${badge.color}44,0 0 0 1px ${badge.color}22`,animation:"slideUp .5s cubic-bezier(0.34,1.56,0.64,1)"}}>
      <div style={{width:54,height:54,borderRadius:16,background:`linear-gradient(135deg,${badge.color},${badge.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,boxShadow:`0 6px 20px ${badge.color}66`}}>{badge.icon}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:9,color:badge.color,fontWeight:800,letterSpacing:1.5,marginBottom:2}}>🏅 BADGE DÉBLOQUÉ !</div>
        <div style={{fontWeight:800,fontSize:15}}>{badge.label}</div>
        <div style={{fontSize:11,color:C.mutedLight,marginTop:2}}>{badge.desc}</div>
      </div>
      <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",flexShrink:0,padding:4}}>✕</button>
    </div>
  );
}

// ─── MODAL CONFIRMATION ───────────────────────────────────────────────────────
function ConfirmModal({title, message, onConfirm, onCancel, danger=true}) {
  return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(8px)"}}>
      <div style={{...gs.card({padding:24,background:C.card2,border:`1px solid ${danger?C.error+"44":C.border}`,maxWidth:320,width:"100%"}),animation:"slideUp .3s ease"}}>
        <div style={{fontSize:32,textAlign:"center",marginBottom:12}}>{danger?"🗑️":"⚠️"}</div>
        <div style={{fontWeight:800,fontSize:16,textAlign:"center",marginBottom:8}}>{title}</div>
        <div style={{color:C.mutedLight,fontSize:13,textAlign:"center",marginBottom:20,lineHeight:1.5}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button style={gs.btn("outline",{flex:1,padding:"12px"})} onClick={onCancel}>Annuler</button>
          <button style={gs.btn(danger?"danger":"primary",{flex:1,padding:"12px"})} onClick={onConfirm}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

// ─── STATUS BAR ───────────────────────────────────────────────────────────────
function StatusBar() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => { const t = new Date(); setTime(`${t.getHours()}:${String(t.getMinutes()).padStart(2,"0")}`); };
    update(); const iv = setInterval(update, 30000); return () => clearInterval(iv);
  }, []);
  return (
    <div style={gs.statusBar}>
      <span style={{fontWeight:800,letterSpacing:.5}}>{time}</span>
      <div style={{display:"flex",gap:4,fontSize:14}}>📶🔋</div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({active, onChange}) {
  const tabs = [{id:"home",icon:"🏠",label:"Accueil"},{id:"notes",icon:"📝",label:"Notes"},{id:"quiz",icon:"✨",label:"Quiz"},{id:"stats",icon:"📊",label:"Stats"},{id:"profile",icon:"👤",label:"Profil"}];
  return (
    <div style={{display:"flex",background:C.card,borderTop:`1px solid ${C.glassBorder}`,padding:"6px 0 12px",flexShrink:0}}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 0",transition:"all .15s"}}>
          <span style={{fontSize:20,transition:"transform .2s",transform:active===t.id?"scale(1.2)":"scale(1)"}}>{t.icon}</span>
          <span style={{fontSize:9,fontFamily:"'Nunito',sans-serif",color:active===t.id?C.primaryLight:C.muted,fontWeight:active===t.id?800:500,transition:"color .2s"}}>{t.label}</span>
          {active===t.id && <div style={{width:20,height:3,borderRadius:3,background:`linear-gradient(90deg,${C.primary},${C.primaryLight})`,marginTop:2}}/>}
        </button>
      ))}
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({onLogin}) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({username:"",email:"",password:""});
  const [err, setErr] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    if (!form.email.includes("@")) { setErr("Email invalide"); return; }
    if (form.password.length < 6) { setErr("Mot de passe ≥ 6 caractères"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400)); // feedback visuel
    const users = DB.getUsers();
    if (mode === "register") {
      if (form.username.trim().length < 2) { setErr("Pseudo trop court (min. 2 car.)"); setLoading(false); return; }
      if (users.find(u => u.email === form.email)) { setErr("Email déjà utilisé"); setLoading(false); return; }
      if (users.find(u => u.username === form.username.trim())) { setErr("Pseudo déjà pris"); setLoading(false); return; }
      const user = {id:Date.now(), username:form.username.trim(), email:form.email, password:hashPwd(form.password), bio:"", createdAt:Date.now()};
      DB.saveUsers([...users, user]);
      const h = new Date().getHours();
      DB.saveStats(user.id, {...defaultStats(), streak:1, bestStreak:1, lastLogin:Date.now(), hasNightOwl:h>=0&&h<6});
      onLogin(user);
    } else {
      const user = users.find(u => u.email === form.email && u.password === hashPwd(form.password));
      if (!user) { setErr("Email ou mot de passe incorrect"); setLoading(false); return; }
      const s = DB.getStats(user.id);
      const last = s.lastLogin ? new Date(s.lastLogin) : null;
      const today = new Date();
      let streak = s.streak || 0;
      if (last) {
        const diff = Math.floor((today - last) / 86400000);
        if (diff === 1) streak++;
        else if (diff > 1) streak = 1;
      } else streak = 1;
      const bestStreak = Math.max(streak, s.bestStreak || 0);
      const h = today.getHours();
      DB.saveStats(user.id, {...s, streak, bestStreak, lastLogin:Date.now(), hasNightOwl:s.hasNightOwl||(h>=0&&h<6)});
      onLogin(user);
    }
    setLoading(false);
  };

  return (
    <div style={{...gs.scroll, display:"flex", flexDirection:"column"}}>
      <div style={{padding:"0 28px 28px", display:"flex", flexDirection:"column", flex:1}}>
        <div style={{textAlign:"center", marginTop:40, marginBottom:28}}>
          <div style={{fontSize:60, marginBottom:10, filter:"drop-shadow(0 8px 24px rgba(124,58,237,.6))"}}>🎓</div>
          <div style={{fontSize:34, fontWeight:900, letterSpacing:-1.5, background:`linear-gradient(135deg,${C.primary},${C.accentLight})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>StudyQuest</div>
          <div style={{color:C.muted, fontSize:13, marginTop:5, fontWeight:600}}>Révise. Progresse. Gagne. ✨</div>
        </div>
        <div style={{display:"flex", background:C.card, borderRadius:16, padding:4, marginBottom:24, border:`1px solid ${C.glassBorder}`}}>
          {[["login","Connexion"],["register","Inscription"]].map(([m,l]) => (
            <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{flex:1,padding:"11px 0",borderRadius:13,border:"none",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,transition:"all .25s",background:mode===m?`linear-gradient(135deg,${C.primary},${C.primaryLight})`:"transparent",color:mode===m?C.white:C.muted,boxShadow:mode===m?`0 4px 16px rgba(124,58,237,.4)`:"none"}}>{l}</button>
          ))}
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          {mode==="register" && (
            <div>
              <label style={{fontSize:11,color:C.muted,marginBottom:5,display:"block",fontWeight:700,letterSpacing:.5}}>PSEUDO</label>
              <input style={gs.input} placeholder="Alex Martin" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>
          )}
          <div>
            <label style={{fontSize:11,color:C.muted,marginBottom:5,display:"block",fontWeight:700,letterSpacing:.5}}>EMAIL</label>
            <input style={gs.input} type="email" placeholder="alex@mail.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          <div>
            <label style={{fontSize:11,color:C.muted,marginBottom:5,display:"block",fontWeight:700,letterSpacing:.5}}>MOT DE PASSE</label>
            <div style={{position:"relative"}}>
              <input style={{...gs.input,paddingRight:46}} type={showPwd?"text":"password"} placeholder="••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submit()}/>
              <button onClick={()=>setShowPwd(!showPwd)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted,lineHeight:1}}>{showPwd?"🙈":"👁️"}</button>
            </div>
          </div>
          {err && <div style={{color:C.error,fontSize:12,textAlign:"center",background:`${C.error}12`,padding:"10px 14px",borderRadius:12,border:`1px solid ${C.error}33`,fontWeight:600}}>⚠️ {err}</div>}
          <button style={{...gs.btn(), opacity:loading?0.7:1}} onClick={submit} disabled={loading}>
            {loading ? "⏳ Chargement..." : mode==="login" ? "Se connecter →" : "Créer mon compte →"}
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:"auto",paddingTop:24,fontSize:11,color:C.muted,fontWeight:600}}>🔒 Données locales · 100% gratuit · Hors ligne</div>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({user, stats, notes, onNav}) {
  const level = Math.floor(stats.xp/1000)+1;
  const xpInLevel = stats.xp%1000;
  const pct = stats.totalAnswers>0 ? Math.round(stats.goodAnswers/stats.totalAnswers*100) : 0;
  const motd = ["Tu peux le faire ! 💪","Continue comme ça ! 🔥","Excellent travail ! ⭐","La connaissance, c'est le pouvoir ! 🧠","Chaque question te rend plus fort ! ⚡"];
  const recentNotes = [...notes].reverse().slice(0,4);

  return (
    <div style={gs.scroll}><div style={{padding:"0 18px 24px"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <div style={{fontSize:22,fontWeight:900}}>👋 Salut {user.username} !</div>
          <div style={{fontSize:12,color:C.muted,marginTop:3,fontWeight:600}}>{motd[Math.floor(Date.now()/86400000)%motd.length]}</div>
        </div>
        <button onClick={()=>onNav("leaderboard")} style={{background:C.card,border:`1px solid ${C.glassBorder}`,borderRadius:14,padding:"8px 12px",cursor:"pointer",fontSize:11,color:C.white,display:"flex",alignItems:"center",gap:5,fontWeight:700,fontFamily:"'Nunito',sans-serif"}}>🏆 Classement</button>
      </div>

      {/* Streak banner */}
      {stats.streak>0 && (
        <div style={{background:`linear-gradient(135deg,${C.accent}28,${C.card2})`,border:`1px solid ${C.accent}44`,borderRadius:18,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:28,filter:"drop-shadow(0 4px 12px rgba(245,158,11,.6))"}}>🔥</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:14}}>Série de {stats.streak} jour{stats.streak>1?"s":""}  !</div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>Reviens demain pour continuer ta série</div>
          </div>
          <div style={{fontSize:28,fontWeight:900,color:C.accent,minWidth:36,textAlign:"right"}}>{stats.streak}</div>
        </div>
      )}

      {/* Niveau XP barre */}
      <div style={{...gs.card({border:`1px solid ${C.primary}33`,marginBottom:14,background:`linear-gradient(135deg,${C.primary}12,${C.card})`}),padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontWeight:800,fontSize:15}}>⭐ Niveau {level}</div>
          <div style={{fontSize:11,color:C.muted,fontWeight:700}}>{xpInLevel.toLocaleString()} / 1 000 XP</div>
        </div>
        <div style={{height:8,background:C.border,borderRadius:8,overflow:"hidden"}}>
          <div style={{width:`${(xpInLevel/1000)*100}%`,height:"100%",background:`linear-gradient(90deg,${C.primary},${C.primaryLight},${C.accent})`,borderRadius:8,transition:"width 1s ease"}}/>
        </div>
        <div style={{fontSize:10,color:C.muted,marginTop:5,fontWeight:600}}>{1000-xpInLevel} XP pour le niveau {level+1}</div>
      </div>

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {label:"XP totaux",value:stats.xp.toLocaleString(),sub:"Points gagnés",color:C.accent,icon:"💰"},
          {label:"Quiz réalisés",value:stats.quizDone,sub:"Terminés",color:C.info,icon:"✅"},
          {label:"Taux de réussite",value:`${pct}%`,sub:`${stats.goodAnswers} bonnes rép.`,color:pct>=70?C.success:pct>=40?C.accent:C.error,icon:"🎯"},
          {label:"Meilleur streak",value:`${stats.bestStreak}j`,sub:"Record personnel",color:C.primary,icon:"⚡"},
        ].map((s,i) => (
          <div key={i} style={gs.card({border:`1px solid ${C.glassBorder}`,cursor:"pointer",padding:"14px"})} onClick={()=>onNav("stats")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:.3}}>{s.label.toUpperCase()}</div>
              <span style={{fontSize:14}}>{s.icon}</span>
            </div>
            <div style={{fontSize:24,fontWeight:900,color:s.color}}>{s.value}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:4,fontWeight:600}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
        <button onClick={()=>onNav("quiz")} style={{background:`linear-gradient(135deg,${C.primary},${C.primaryLight})`,border:"none",borderRadius:18,padding:"16px 14px",cursor:"pointer",textAlign:"left",boxShadow:`0 6px 24px rgba(124,58,237,.4),inset 0 1px 0 rgba(255,255,255,.1)`}}>
          <div style={{fontSize:28,marginBottom:6}}>🤖</div>
          <div style={{fontWeight:800,fontSize:13,color:C.white}}>Générer un quiz</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:2}}>Avec l'IA Gemini</div>
        </button>
        <button onClick={()=>onNav("notes")} style={{background:C.card,border:`1px solid ${C.info}33`,borderRadius:18,padding:"16px 14px",cursor:"pointer",textAlign:"left"}}>
          <div style={{fontSize:28,marginBottom:6}}>📝</div>
          <div style={{fontWeight:800,fontSize:13,color:C.white}}>Nouvelle note</div>
          <div style={{fontSize:10,color:C.muted,marginTop:2}}>{notes.length} note{notes.length!==1?"s":""}</div>
        </button>
      </div>

      {/* Notes récentes */}
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:800,fontSize:14}}>Révision récente</div>
          <button onClick={()=>onNav("notes")} style={{background:"none",border:"none",color:C.primary,fontSize:12,cursor:"pointer",fontWeight:700,fontFamily:"'Nunito',sans-serif"}}>Voir toutes →</button>
        </div>
        {recentNotes.length===0 ? (
          <div style={gs.card({border:`1px dashed ${C.border}`,textAlign:"center",padding:28})}>
            <div style={{fontSize:36,marginBottom:8}}>📭</div>
            <div style={{color:C.muted,fontSize:13,fontWeight:600}}>Ajoute ta première note !</div>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {recentNotes.map(n => (
              <div key={n.id} onClick={()=>onNav("notes")} style={{...gs.card({cursor:"pointer",background:`linear-gradient(135deg,${SC[n.subject]||C.primary}18,${C.card})`,border:`1px solid ${SC[n.subject]||C.primary}33`,padding:12})}}>
                <div style={{fontSize:22,marginBottom:5}}>{SI[n.subject]||"📖"}</div>
                <div style={{fontSize:10,color:SC[n.subject]||C.primary,fontWeight:800,letterSpacing:.3}}>{n.subject.toUpperCase()}</div>
                <div style={{fontSize:12,fontWeight:700,marginTop:3,marginBottom:4,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</div>
                <div style={{fontSize:9,color:C.muted,fontWeight:600}}>{timeAgo(n.updatedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activité récente */}
      {(stats.history||[]).length>0 && (
        <div>
          <div style={{fontWeight:800,fontSize:14,marginBottom:10}}>Activité récente</div>
          {[...(stats.history||[])].reverse().slice(0,4).map((h,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.glassBorder}`}}>
              <div style={{width:34,height:34,borderRadius:10,background:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{h.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.title}</div>
                <div style={{fontSize:10,color:C.muted,fontWeight:600}}>{h.sub}</div>
              </div>
              <div style={{fontSize:10,color:C.muted,whiteSpace:"nowrap",fontWeight:600}}>{h.time}</div>
            </div>
          ))}
        </div>
      )}
    </div></div>
  );
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
function NotesScreen({user, notes, setNotes, showToast, onCheckBadges}) {
  const [tab, setTab] = useState("Toutes");
  const [view, setView] = useState("list");
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({title:"",subject:"Biologie",content:""});
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [confirmDel, setConfirmDel] = useState(null);
  const fileRef = useRef();
  const imgRef = useRef();

  const filtered = notes
    .filter(n => tab==="Toutes" || n.subject===tab)
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sortBy==="alpha" ? a.title.localeCompare(b.title) : sortBy==="subject" ? a.subject.localeCompare(b.subject) : b.updatedAt-a.updatedAt);

  const save = () => {
    if (!form.title.trim() || !form.content.trim()) { showToast("Titre et contenu requis","error","⚠️"); return; }
    const wc = form.content.trim().split(/\s+/).filter(Boolean).length;
    let updated;
    if (current) {
      updated = notes.map(n => n.id===current.id ? {...n,...form,updatedAt:Date.now(),wordCount:wc} : n);
      showToast("Note modifiée ✅","success","✅");
    } else {
      const nn = {id:Date.now(),...form,createdAt:Date.now(),updatedAt:Date.now(),wordCount:wc};
      updated = [...notes, nn];
      showToast("Note créée !","success","📝");
    }
    setNotes(updated); DB.saveNotes(user.id, updated); onCheckBadges(null, updated);
    setView("list"); setCurrent(null); setForm({title:"",subject:"Biologie",content:""});
  };

  const del = id => {
    const u = notes.filter(n => n.id!==id);
    setNotes(u); DB.saveNotes(user.id, u);
    showToast("Note supprimée","error","🗑️");
    setView("list"); setCurrent(null); setConfirmDel(null);
  };

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.type==="application/pdf") showToast("PDF importé","success","📄"), setForm(f=>({...f,content:f.content+`\n\n[PDF: ${file.name}]`}));
    else if (file.type.startsWith("image/")) showToast("Image importée","success","🖼️"), setForm(f=>({...f,content:f.content+`\n\n[Image: ${file.name}]`}));
    e.target.value="";
  };

  // — Vue édition/ajout
  if (view==="add" || view==="edit") {
    const wc = form.content.trim().split(/\s+/).filter(Boolean).length;
    return (
      <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
        {confirmDel && <ConfirmModal title="Supprimer cette note ?" message="Cette action est irréversible." onConfirm={()=>del(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}
        <div style={{padding:"0 18px 10px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <button onClick={()=>{setView("list");setCurrent(null);}} style={{background:"none",border:"none",color:C.white,fontSize:22,cursor:"pointer"}}>←</button>
            <div style={{fontWeight:800,fontSize:16,flex:1}}>{view==="edit"?"Modifier la note":"Nouvelle note"}</div>
            <button onClick={save} style={{background:`linear-gradient(135deg,${C.primary},${C.primaryLight})`,border:"none",borderRadius:12,padding:"8px 16px",color:C.white,fontWeight:800,fontSize:13,cursor:"pointer",boxShadow:`0 4px 14px rgba(124,58,237,.4)`,fontFamily:"'Nunito',sans-serif"}}>Sauver ✓</button>
          </div>
          <input style={{...gs.input,marginBottom:10,fontSize:15,fontWeight:800}} placeholder="Titre de la note" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:6}}>
            {SUBJECTS.map(s => (
              <button key={s} onClick={()=>setForm({...form,subject:s})} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${form.subject===s?SC[s]||C.primary:"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",fontSize:11,fontWeight:700,fontFamily:"'Nunito',sans-serif",background:form.subject===s?`${SC[s]||C.primary}28`:C.card2,color:form.subject===s?SC[s]||C.primary:C.muted,transition:"all .15s"}}>{SI[s]||"📖"} {s}</button>
            ))}
          </div>
        </div>
        <div style={{...gs.scroll,flex:1,padding:"0 18px"}}>
          <textarea style={{...gs.input,minHeight:260,resize:"none",lineHeight:1.75,fontSize:13}} placeholder="Tape ou colle ton cours ici..." value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,marginBottom:12}}>
            <span style={{fontSize:11,color:C.muted,fontWeight:600}}>{wc} mots · {form.content.length} car.</span>
            <span style={{fontSize:11,color:wc>100?C.success:C.muted,fontWeight:600}}>{wc>100?"📚 Bonne longueur !":wc>0?"✍️ Continue...":""}</span>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <button onClick={()=>fileRef.current.click()} style={gs.btn("outline",{flex:1,padding:"10px",fontSize:12,width:"auto"})}>📄 Importer PDF</button>
            <button onClick={()=>imgRef.current.click()} style={gs.btn("outline",{flex:1,padding:"10px",fontSize:12,width:"auto"})}>🖼️ Scanner</button>
            <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={handleFile}/>
            <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
          </div>
          {view==="edit" && current && (
            <button style={gs.btn("danger")} onClick={()=>setConfirmDel(current.id)}>🗑️ Supprimer la note</button>
          )}
        </div>
      </div>
    );
  }

  // — Vue lecture
  if (view==="read" && current) {
    return (
      <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
        <div style={{padding:"0 18px 12px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <button onClick={()=>setView("list")} style={{background:"none",border:"none",color:C.white,fontSize:22,cursor:"pointer"}}>←</button>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15,lineHeight:1.3}}>{current.title}</div>
              <div style={{fontSize:11,color:SC[current.subject]||C.primary,marginTop:2,fontWeight:700}}>{SI[current.subject]||"📖"} {current.subject}</div>
            </div>
            <button onClick={()=>{setForm({title:current.title,subject:current.subject,content:current.content});setView("edit");}} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"7px 13px",color:C.white,fontSize:13,cursor:"pointer"}}>✏️</button>
          </div>
          <div style={{fontSize:10,color:C.muted,fontWeight:600}}>{current.wordCount||"?"} mots · Modifié {timeAgo(current.updatedAt)}</div>
        </div>
        <div style={{...gs.scroll,flex:1,padding:"0 18px 20px"}}>
          <div style={{fontSize:14,lineHeight:1.9,color:"rgba(255,255,255,.88)",whiteSpace:"pre-wrap",fontWeight:500}}>{current.content}</div>
        </div>
      </div>
    );
  }

  // — Liste
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      <div style={{padding:"0 18px 10px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:900,fontSize:20}}>Mes notes</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowSearch(!showSearch)} style={{background:showSearch?C.primary:C.card,border:`1px solid ${showSearch?C.primary:C.border}`,borderRadius:12,padding:"7px 11px",cursor:"pointer",fontSize:14,color:C.white,transition:"all .2s"}}>🔍</button>
            <button onClick={()=>setSortBy(s=>s==="recent"?"alpha":s==="alpha"?"subject":"recent")} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"7px 11px",cursor:"pointer",fontSize:12,color:C.muted}}>
              {sortBy==="recent"?"⏰":sortBy==="alpha"?"🔤":"📚"}
            </button>
          </div>
        </div>
        {showSearch && <input style={{...gs.input,marginBottom:10}} placeholder="Rechercher dans tes notes..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>}
        {/* Filtre matières */}
        <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
          {["Toutes",...SUBJECTS].map(s => (
            <button key={s} onClick={()=>setTab(s)} style={{padding:"6px 13px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:11,fontWeight:700,fontFamily:"'Nunito',sans-serif",background:tab===s?C.primary:C.card2,color:tab===s?C.white:C.muted,transition:"all .2s"}}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{...gs.scroll,flex:1,padding:"0 18px"}}>
        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:40}}>
            <div style={{fontSize:48,marginBottom:12}}>📭</div>
            <div style={{color:C.muted,fontSize:14,fontWeight:600}}>Aucune note trouvée</div>
          </div>
        ) : filtered.map(n => (
          <div key={n.id} onClick={()=>{setCurrent(n);setView("read");}} style={{...gs.card({border:`1px solid ${SC[n.subject]||C.border}33`,marginBottom:10,cursor:"pointer",background:`linear-gradient(135deg,${SC[n.subject]||C.primary}08,${C.card})`}),display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:14,background:`${SC[n.subject]||C.primary}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{SI[n.subject]||"📖"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</div>
              <div style={{fontSize:11,color:SC[n.subject]||C.primary,marginTop:1,fontWeight:700}}>{n.subject}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2,fontWeight:600}}>{n.wordCount||"?"} mots · {timeAgo(n.updatedAt)}</div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>{setForm({title:n.title,subject:n.subject,content:n.content});setCurrent(n);setView("edit");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:4}}>✏️</button>
              <button onClick={()=>setConfirmDel(n.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:4}}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {confirmDel && <ConfirmModal title="Supprimer cette note ?" message="Cette action est irréversible." onConfirm={()=>del(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}

      <div style={{padding:"10px 18px 8px",flexShrink:0}}>
        <button style={gs.btn()} onClick={()=>{setView("add");setForm({title:"",subject:"Biologie",content:""});}}>+ Nouvelle note</button>
      </div>
    </div>
  );
}

// ─── GENERATOR ────────────────────────────────────────────────────────────────
function GeneratorScreen({user, notes, stats, onStartQuiz, showToast, onCheckBadges}) {
  const [sel, setSel] = useState(null);
  const [nbQ, setNbQ] = useState(10);
  const [type, setType] = useState("QCM");
  const [diff, setDiff] = useState("Moyen");
  const [loading, setLoading] = useState(false);
  const [hist, setHist] = useState(()=>DB.getQHist(user.id));

  const generate = async () => {
    if (!sel) { showToast("Sélectionne une note","error","⚠️"); return; }
    // Fix bug 1: vérifier la clé API avant d'appeler l'API
    if (!OPENROUTER_KEY) {
      showToast("Clé API manquante – configure VITE_OPENROUTER_API_KEY dans .env","error","🔑");
      return;
    }
    setLoading(true);
    try {
      const prompt = `Tu es un professeur expert. À partir du cours suivant, génère exactement ${nbQ} questions de type "${type}" niveau "${diff}" en français.\n\nCours (${sel.subject}) :\n${sel.content.substring(0,2500)}\n\nRéponds UNIQUEMENT avec un tableau JSON valide sans markdown ni explication :\n[{"question":"...","type":"${type}","options":["A...","B...","C...","D..."],"correct":0,"explanation":"..."}]\nPour Vrai/Faux: options=["Vrai","Faux"], correct=0 ou 1\nPour Réponse courte: options=[], correct="réponse attendue"`;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${OPENROUTER_KEY}`},
        body:JSON.stringify({model:"openrouter/free",messages:[{role:"user",content:prompt}]})
      });
      if (!res.ok) throw new Error(`Erreur réseau (${res.status})`);
      const data = await res.json();
      let text = data?.choices?.[0]?.message?.content || "";
      text = text.replace(/```json|```/g,"").trim();
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Réponse IA invalide");
      const questions = JSON.parse(match[0]);
      if (!questions.length) throw new Error("Aucune question générée");
      const entry = {id:Date.now(),noteTitle:sel.title,subject:sel.subject,type,diff,nbQ:questions.length,date:Date.now()};
      const nh = [entry,...hist].slice(0,10);
      setHist(nh); DB.saveQHist(user.id, nh);
      showToast(`${questions.length} questions générées !`,"success","🤖");
      // Fix bug 7: appeler onCheckBadges après génération réussie
      if (onCheckBadges) onCheckBadges(null);
      onStartQuiz({questions, note:sel});
    } catch(e) {
      showToast("Erreur: "+e.message,"error","❌");
    }
    setLoading(false);
  };

  return (
    <div style={gs.scroll}><div style={{padding:"0 18px 24px"}}>
      <div style={{fontWeight:900,fontSize:20,marginBottom:2}}>Générateur IA ✨</div>
      <div style={{color:C.muted,fontSize:12,marginBottom:18,fontWeight:600}}>Transforme tes notes en quiz avec Gemini</div>

      {/* Sélection note */}
      <div style={{marginBottom:18}}>
        <div style={{fontWeight:800,fontSize:13,marginBottom:10,color:C.mutedLight}}>📝 SÉLECTIONNE UNE NOTE</div>
        {notes.length===0 ? (
          <div style={gs.card({border:`1px dashed ${C.border}`,textAlign:"center",padding:28})}>
            <div style={{fontSize:36,marginBottom:8}}>📭</div>
            <div style={{color:C.muted,fontSize:13,fontWeight:600}}>Crée d'abord une note !</div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {notes.slice().reverse().slice(0,8).map(n => (
              <button key={n.id} onClick={()=>setSel(n)} style={{...gs.card({cursor:"pointer",border:`1.5px solid ${sel?.id===n.id?SC[n.subject]||C.primary:C.border}`,background:sel?.id===n.id?`${SC[n.subject]||C.primary}18`:C.card,transition:"all .2s"}),display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                <span style={{fontSize:22}}>{SI[n.subject]||"📖"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Nunito',sans-serif",color:C.white}}>{n.title}</div>
                  <div style={{fontSize:10,color:SC[n.subject]||C.primary,marginTop:1,fontWeight:700}}>{n.subject} · {n.wordCount||"?"} mots</div>
                </div>
                {sel?.id===n.id && <span style={{color:SC[n.subject]||C.primary,fontSize:20,flexShrink:0}}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nb questions */}
      <div style={{marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:13,marginBottom:10,color:C.mutedLight}}>🔢 NOMBRE DE QUESTIONS</div>
        <div style={{display:"flex",gap:8}}>
          {[5,10,15,20].map(n => (
            <button key={n} onClick={()=>setNbQ(n)} style={{flex:1,padding:"11px 0",borderRadius:12,border:`1.5px solid ${nbQ===n?C.primary:C.border}`,background:nbQ===n?`${C.primary}28`:C.card,color:nbQ===n?C.primaryLight:C.muted,fontWeight:800,fontSize:16,fontFamily:"'Nunito',sans-serif",cursor:"pointer",transition:"all .2s"}}>{n}</button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div style={{marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:13,marginBottom:10,color:C.mutedLight}}>❓ TYPE DE QUESTIONS</div>
        <div style={{display:"flex",gap:8}}>
          {[["QCM","🔤"],["Vrai / Faux","⚖️"],["Réponse courte","✍️"]].map(([t,ic]) => (
            <button key={t} onClick={()=>setType(t)} style={{flex:1,padding:"10px 4px",borderRadius:12,border:`1.5px solid ${type===t?C.primary:C.border}`,background:type===t?`${C.primary}28`:C.card,color:type===t?C.primaryLight:C.muted,fontWeight:700,fontSize:10,fontFamily:"'Nunito',sans-serif",cursor:"pointer",transition:"all .2s"}}>{ic}<br/>{t}</button>
          ))}
        </div>
      </div>

      {/* Difficulté */}
      <div style={{marginBottom:22}}>
        <div style={{fontWeight:800,fontSize:13,marginBottom:10,color:C.mutedLight}}>🎯 DIFFICULTÉ</div>
        <div style={{display:"flex",gap:8}}>
          {[["Facile","🟢","#10B981"],["Moyen","🟡","#F59E0B"],["Difficile","🔴","#EF4444"]].map(([l,ic,col]) => (
            <button key={l} onClick={()=>setDiff(l)} style={{flex:1,padding:"11px 0",borderRadius:12,border:`1.5px solid ${diff===l?col:C.border}`,background:diff===l?`${col}22`:C.card,color:diff===l?col:C.muted,fontWeight:700,fontSize:12,fontFamily:"'Nunito',sans-serif",cursor:"pointer",transition:"all .2s"}}>{ic} {l}</button>
          ))}
        </div>
      </div>

      <button style={{...gs.btn(), opacity:loading?0.7:1, fontSize:15}} onClick={generate} disabled={loading}>
        {loading ? "⏳ Génération en cours..." : "✨ Générer les questions"}
      </button>

      {/* Historique */}
      {hist.length>0 && (
        <div style={{marginTop:22}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:10,color:C.mutedLight}}>🕐 HISTORIQUE</div>
          {hist.slice(0,5).map(h => (
            <div key={h.id} style={{...gs.card({border:`1px solid ${C.glassBorder}`,marginBottom:8,padding:12}),display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{SI[h.subject]||"📖"}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.noteTitle}</div>
                <div style={{fontSize:10,color:C.muted,fontWeight:600}}>{h.nbQ} questions · {h.type} · {h.diff}</div>
              </div>
              <div style={{fontSize:10,color:C.muted,fontWeight:600}}>{timeAgo(h.date)}</div>
            </div>
          ))}
        </div>
      )}
    </div></div>
  );
}

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
function QuizScreen({quizData, user, stats, setStats, onFinish, onBack, showToast, onCheckBadges}) {
  const {questions} = quizData;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [shortAns, setShortAns] = useState("");
  const [score, setScore] = useState(0);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [startTime] = useState(Date.now());
  const [showReview, setShowReview] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [xpAnim, setXpAnim] = useState(null);

  // Timer en temps réel
  useEffect(() => {
    if (done) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now()-startTime)/1000)), 1000);
    return () => clearInterval(iv);
  }, [done, startTime]);

  if (!questions?.length) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:48}}>❌</div>
      <div style={{color:C.muted,fontWeight:700}}>Aucune question</div>
      <button style={gs.btn("outline",{width:"auto",padding:"10px 20px"})} onClick={onBack}>Retour</button>
    </div>
  );

  const q = questions[idx];
  const isShort = !q.options || q.options.length===0 || q.type==="Réponse courte";

  const check = () => {
    let correct;
    if (isShort) correct = shortAns.trim().toLowerCase().split(/\s+/).some(w => String(q.correct).toLowerCase().includes(w) && w.length>2);
    else correct = selected===q.correct;
    const r = {correct, answer:isShort?shortAns:selected, correctAnswer:q.correct, question:q.question, explanation:q.explanation};
    // Fix bug: stocker dans variable locale car setResults est async
    const newResults = [...results, r];
    setResults(newResults);
    if (correct) { setScore(s=>s+1); showToast("+10 XP ! 🎉","success","✅"); setXpAnim(Date.now()); }
    setAnswered(true);
    // Fix bug: si dernière question, finir avec les résultats complets (pas l'état stale)
    if (idx+1>=questions.length) {
      setTimeout(() => finishQuiz(newResults), 50);
    }
  };

  const finishQuiz = (finalResults) => {
    const good = finalResults.filter(r=>r.correct).length;
    const total = questions.length;
    const pct = Math.round(good/total*100);
    const totalElapsed = Math.floor((Date.now()-startTime)/1000);
    const isPerfect = pct===100;
    const isSpeed = totalElapsed<60 && total>=5;
    const wd = new Date().getDay();
    const weekly = [...(stats.weeklyXP||[0,0,0,0,0,0,0])];
    weekly[wd] = (weekly[wd]||0)+good*10;
    const xpGained = good*10 + (isPerfect?50:0);
    const newStats = {
      ...stats, quizDone:stats.quizDone+1, goodAnswers:stats.goodAnswers+good,
      totalAnswers:stats.totalAnswers+total, xp:stats.xp+xpGained,
      hasPerfect:stats.hasPerfect||isPerfect, hasSpeed:stats.hasSpeed||isSpeed,
      weeklyXP:weekly, totalTimeSpent:(stats.totalTimeSpent||0)+totalElapsed,
      history:[...(stats.history||[]),{icon:"✅",title:`Quiz terminé – ${quizData.note.subject}`,sub:`${good}/${total} (${pct}%) · +${xpGained} XP`,time:"À l'instant"}],
      subjectStats:{...stats.subjectStats,[quizData.note.subject]:{
        quizzes:((stats.subjectStats||{})[quizData.note.subject]?.quizzes||0)+1,
        good:((stats.subjectStats||{})[quizData.note.subject]?.good||0)+good,
        total:((stats.subjectStats||{})[quizData.note.subject]?.total||0)+total,
      }},
    };
    newStats.level = Math.floor(newStats.xp/1000)+1;
    setStats(newStats); DB.saveStats(user.id, newStats); onCheckBadges(newStats);
    setDone(true);
  };

  const next = () => {
    // Note: finishQuiz est maintenant appelé directement depuis check() pour la dernière question
    if (idx+1<questions.length) { setIdx(i=>i+1); setSelected(null); setAnswered(false); setShortAns(""); }
  };

  const lastResult = results[results.length-1];
  const finalGood = results.filter(r=>r.correct).length;
  const finalPct = Math.round(finalGood/questions.length*100);

  // — Écran résultat
  if (done) {
    if (showReview) return (
      <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <button onClick={()=>setShowReview(false)} style={{background:"none",border:"none",color:C.white,fontSize:22,cursor:"pointer"}}>←</button>
          <div style={{fontWeight:800,fontSize:16}}>Révision des réponses</div>
        </div>
        <div style={{...gs.scroll,flex:1,padding:"0 18px 20px"}}>
          {results.map((r,i) => (
            <div key={i} style={{...gs.card({border:`1px solid ${r.correct?C.success:C.error}44`,marginBottom:10,background:`${r.correct?C.success:C.error}08`})}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:3,fontWeight:700}}>QUESTION {i+1}</div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:8,lineHeight:1.4}}>{questions[i].question}</div>
              <div style={{display:"flex",gap:8,fontSize:12,marginBottom:r.explanation?6:0}}>
                <span>{r.correct?"✅":"❌"}</span>
                <span style={{color:r.correct?C.success:C.error,fontWeight:700}}>{typeof r.answer==="number"?questions[i].options[r.answer]:r.answer||"Sans réponse"}</span>
              </div>
              {!r.correct && <div style={{fontSize:11,color:C.mutedLight,marginTop:4,fontWeight:600}}>✓ Bonne réponse : <span style={{color:C.success}}>{typeof r.correctAnswer==="number"?questions[i].options[r.correctAnswer]:String(r.correctAnswer)}</span></div>}
              {r.explanation && <div style={{fontSize:11,color:C.muted,marginTop:6,fontStyle:"italic",lineHeight:1.5,padding:"8px",background:C.card2,borderRadius:8}}>{r.explanation}</div>}
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div style={gs.scroll}><div style={{padding:"20px 18px",textAlign:"center"}}>
        <div style={{fontSize:72,marginBottom:10,filter:`drop-shadow(0 8px 24px ${finalPct>=80?"rgba(245,158,11,.5)":"rgba(124,58,237,.5))"})`}}>{finalPct===100?"🏆":finalPct>=80?"🥇":finalPct>=60?"🥈":"📚"}</div>
        <div style={{fontSize:22,fontWeight:900}}>Résultat du quiz</div>
        <div style={{fontSize:58,fontWeight:900,color:finalPct>=70?C.success:finalPct>=40?C.accent:C.error,margin:"10px 0 4px",letterSpacing:-2}}>{finalGood}/{questions.length}</div>
        <div style={{fontSize:28,fontWeight:900,color:finalPct>=70?C.success:C.accent,marginBottom:6}}>{finalPct}%</div>
        <div style={{fontSize:13,color:C.mutedLight,marginBottom:8,fontWeight:600}}>⏱️ Temps : {formatTime(Math.floor((Date.now()-startTime)/1000))}</div>
        <div style={{fontSize:15,marginBottom:20,fontWeight:700,color:finalPct===100?C.accent:C.white}}>
          {finalPct===100?"Parfait ! Tu es un génie 🧠":finalPct>=80?"Excellent travail ! 💪":finalPct>=60?"Bien joué ! 👍":finalPct>=40?"Continue d'apprendre ! 📚":"Révise encore ! 💡"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
          {[{l:"Bonnes",v:finalGood,c:C.success,icon:"✅"},{l:"Mauvaises",v:questions.length-finalGood,c:C.error,icon:"❌"},{l:"XP gagnés",v:`+${finalGood*10+(finalPct===100?50:0)}`,c:C.accent,icon:"💰"}].map((s,i) => (
            <div key={i} style={gs.card({textAlign:"center",border:`1px solid ${s.c}33`,padding:14,background:`${s.c}08`})}>
              <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:2,fontWeight:700}}>{s.l.toUpperCase()}</div>
            </div>
          ))}
        </div>
        {finalPct===100 && (
          <div style={{background:`${C.accent}22`,border:`1px solid ${C.accent}55`,borderRadius:14,padding:"12px 16px",marginBottom:16,fontSize:14,color:C.accent,fontWeight:800,animation:"slideIn .5s ease"}}>
            🎉 SCORE PARFAIT ! +50 XP bonus !</div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button style={gs.btn()} onClick={()=>setShowReview(true)}>👁️ Voir les réponses</button>
          <button style={gs.btn("outline")} onClick={()=>onFinish("quiz")}>🔄 Nouveau quiz</button>
          <button style={gs.btn("outline")} onClick={()=>onFinish("home")}>🏠 Accueil</button>
        </div>
      </div></div>
    );
  }

  // — Écran question
  const optL = ["A","B","C","D"];
  const progPct = ((idx+1)/questions.length)*100;
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header quiz */}
      <div style={{padding:"10px 18px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>✕</button>
        <div style={{fontSize:13,fontWeight:800}}>Question {idx+1} / {questions.length}</div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:12,color:C.muted,fontWeight:700}}>⏱ {formatTime(elapsed)}</span>
          <span style={{fontSize:13,fontWeight:800,color:C.accent}}>🏆 {score}</span>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{padding:"8px 18px 12px",flexShrink:0}}>
        <div style={{height:5,background:C.border,borderRadius:5,overflow:"hidden"}}>
          <div style={{width:`${progPct}%`,height:"100%",background:`linear-gradient(90deg,${C.primary},${C.primaryLight},${C.accent})`,borderRadius:5,transition:"width .5s ease"}}/>
        </div>
      </div>

      <div style={{...gs.scroll,flex:1,padding:"0 18px"}}>
        {/* Badge type */}
        <div style={{display:"inline-flex",padding:"5px 12px",borderRadius:20,background:`${C.primary}22`,border:`1px solid ${C.primary}44`,color:C.primaryLight,fontSize:10,fontWeight:800,marginBottom:12,letterSpacing:.5}}>
          {isShort?"✍️ RÉPONSE COURTE":q.options?.length===2?"⚖️ VRAI / FAUX":"🔤 QCM"}
        </div>
        <div style={{fontSize:16,fontWeight:700,lineHeight:1.65,marginBottom:20,minHeight:56}}>{q.question}</div>

        {/* Réponse courte */}
        {isShort ? (
          <div>
            <textarea style={{...gs.input,minHeight:90,resize:"none"}} placeholder="Ta réponse..." value={shortAns} onChange={e=>setShortAns(e.target.value)} disabled={answered}/>
            {answered && (
              <div style={{...gs.card({marginTop:10,background:`${lastResult?.correct?C.success:C.error}12`,border:`1px solid ${lastResult?.correct?C.success:C.error}44`})}}>
                <div style={{fontWeight:800,color:lastResult?.correct?C.success:C.error,marginBottom:4}}>{lastResult?.correct?"✅ Bonne réponse !":"❌ Pas tout à fait..."}</div>
                <div style={{fontSize:12,color:C.mutedLight,marginBottom:5,fontWeight:600}}>Réponse attendue : <strong style={{color:C.white}}>{String(q.correct)}</strong></div>
                {q.explanation && <div style={{fontSize:11,color:C.muted,lineHeight:1.6,background:C.card2,borderRadius:8,padding:8}}>{q.explanation}</div>}
              </div>
            )}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {q.options.map((opt,i) => {
              let bg=C.card, border=C.border, color=C.white;
              if (answered) {
                if (i===q.correct) { bg=`${C.success}20`; border=C.success; color=C.success; }
                else if (i===selected && i!==q.correct) { bg=`${C.error}20`; border=C.error; color=C.error; }
              } else if (selected===i) { bg=`${C.primary}22`; border=C.primary; color=C.primary; }
              return (
                <button key={i} onClick={()=>!answered&&setSelected(i)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderRadius:14,border:`1.5px solid ${border}`,background:bg,cursor:answered?"default":"pointer",textAlign:"left",fontFamily:"'Nunito',sans-serif",transition:"all .2s"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${border}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color,flexShrink:0}}>{optL[i]||i}</div>
                  <span style={{fontSize:13,color,flex:1,fontWeight:600,lineHeight:1.4}}>{opt}</span>
                  {answered && i===q.correct && <span style={{fontSize:18}}>✅</span>}
                  {answered && i===selected && i!==q.correct && <span style={{fontSize:18}}>❌</span>}
                </button>
              );
            })}
            {answered && (
              <div style={{...gs.card({background:`${lastResult?.correct?C.success:C.error}08`,border:`1px solid ${lastResult?.correct?C.success:C.error}33`,marginTop:4})}}>
                <div style={{fontWeight:800,color:lastResult?.correct?C.success:C.error,marginBottom:4,fontSize:13}}>{lastResult?.correct?"✅ Bonne réponse ! +10 XP":"❌ Mauvaise réponse"}</div>
                {q.explanation && <div style={{fontSize:11,color:C.muted,lineHeight:1.6,background:C.card2,borderRadius:8,padding:8}}>{q.explanation}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{padding:"12px 18px 8px",flexShrink:0}}>
        {!answered ? (
          <button style={{...gs.btn(),opacity:(selected===null&&!isShort&&!shortAns.trim())?0.5:1}} onClick={check} disabled={selected===null&&!isShort&&!shortAns.trim()}>
            Valider →
          </button>
        ) : (
          <button style={gs.btn()} onClick={next}>
            {idx+1>=questions.length ? "Voir le résultat 🏆" : "Question suivante →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function StatsScreen({stats}) {
  const pct = stats.totalAnswers>0 ? Math.round(stats.goodAnswers/stats.totalAnswers*100) : 0;
  const days = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  const weekly = stats.weeklyXP || [0,0,0,0,0,0,0];
  const maxW = Math.max(...weekly, 1);
  const todayIdx = new Date().getDay();
  const totalMins = Math.floor((stats.totalTimeSpent||0)/60);
  const subjStats = Object.entries(stats.subjectStats||{})
    .map(([s,v]) => ({subject:s, pct:v.total>0?Math.round(v.good/v.total*100):0, quizzes:v.quizzes, color:SC[s]||C.primary}))
    .sort((a,b) => b.pct-a.pct);

  return (
    <div style={gs.scroll}><div style={{padding:"0 18px 24px"}}>
      <div style={{fontWeight:900,fontSize:20,marginBottom:18}}>Statistiques 📊</div>

      {/* Taux global */}
      <div style={{...gs.card({border:`1px solid ${C.primary}33`,marginBottom:14,padding:24,background:`linear-gradient(135deg,${C.primary}14,${C.card})`}),textAlign:"center"}}>
        <div style={{fontSize:10,color:C.muted,marginBottom:4,letterSpacing:1.5,fontWeight:800}}>TAUX DE RÉUSSITE GLOBAL</div>
        <div style={{fontSize:56,fontWeight:900,color:pct>=70?C.success:pct>=40?C.accent:C.error,letterSpacing:-2}}>{pct}%</div>
        <div style={{height:8,background:C.border,borderRadius:8,marginTop:12,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:pct>=70?`linear-gradient(90deg,${C.success},#34D399)`:pct>=40?`linear-gradient(90deg,${C.accent},${C.accentLight})`:`linear-gradient(90deg,${C.error},#F87171)`,borderRadius:8,transition:"width 1.2s ease"}}/>
        </div>
      </div>

      {/* Grille 3 colonnes */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
        {[
          {l:"Quiz",v:stats.quizDone,ic:"✅"},
          {l:"Bonnes rép.",v:stats.goodAnswers,ic:"🎯"},
          {l:"XP total",v:stats.xp>999?`${(stats.xp/1000).toFixed(1)}k`:stats.xp,ic:"💰"},
          {l:"Streak",v:`${stats.streak}j`,ic:"🔥"},
          {l:"Record",v:`${stats.bestStreak}j`,ic:"⚡"},
          {l:"Niveau",v:Math.floor(stats.xp/1000)+1,ic:"⭐"},
        ].map((s,i) => (
          <div key={i} style={gs.card({border:`1px solid ${C.glassBorder}`,textAlign:"center",padding:12})}>
            <div style={{fontSize:18,marginBottom:4}}>{s.ic}</div>
            <div style={{fontSize:18,fontWeight:900,color:C.primary}}>{s.v}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:2,lineHeight:1.2,fontWeight:700}}>{s.l.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Temps total */}
      {totalMins>0 && (
        <div style={{...gs.card({border:`1px solid ${C.glassBorder}`,marginBottom:14,padding:14}),display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:42,height:42,borderRadius:14,background:`${C.info}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>⏱️</div>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>{totalMins<60?`${totalMins} min`:`${Math.floor(totalMins/60)}h ${totalMins%60}min`}</div>
            <div style={{fontSize:11,color:C.muted,fontWeight:600}}>de révision au total</div>
          </div>
        </div>
      )}

      {/* Graphe hebdo */}
      <div style={{...gs.card({border:`1px solid ${C.glassBorder}`,marginBottom:14})}}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>📈 XP cette semaine</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80}}>
          {weekly.map((v,i) => (
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:8,color:C.muted,height:14,display:"flex",alignItems:"flex-end",fontWeight:700}}>{v>0?v:""}</div>
              <div style={{width:"100%",background:v>0?`linear-gradient(180deg,${i===todayIdx?C.accent:C.primary},${i===todayIdx?C.accentLight:C.primaryLight}44)`:`${C.border}55`,borderRadius:"5px 5px 0 0",minHeight:4,height:`${Math.max((v/maxW)*62,v>0?4:2)}px`,transition:"height .8s ease",boxShadow:v>0&&i===todayIdx?`0 0 12px ${C.accent}66`:"none"}}/>
              <div style={{fontSize:8,color:i===todayIdx?C.accent:C.muted,fontWeight:i===todayIdx?800:500}}>{days[i].slice(0,2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats par matière */}
      {subjStats.length>0 ? (
        <div style={gs.card({border:`1px solid ${C.glassBorder}`,marginBottom:14})}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>📚 Par matière</div>
          {subjStats.map(s => (
            <div key={s.subject} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:700}}>{SI[s.subject]||"📖"} {s.subject}</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:10,color:C.muted,fontWeight:600}}>{s.quizzes} quiz</span>
                  <span style={{fontSize:13,fontWeight:800,color:s.pct>=70?C.success:s.pct>=40?C.accent:C.error}}>{s.pct}%</span>
                </div>
              </div>
              <div style={{height:6,background:C.border,borderRadius:6,overflow:"hidden"}}>
                <div style={{width:`${s.pct}%`,height:"100%",background:s.color,borderRadius:6,transition:"width 1.2s ease"}}/>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={gs.card({border:`1px dashed ${C.border}`,textAlign:"center",padding:28})}>
          <div style={{fontSize:36,marginBottom:8}}>📊</div>
          <div style={{color:C.muted,fontSize:13,fontWeight:600}}>Fais des quiz pour voir tes stats par matière</div>
        </div>
      )}
    </div></div>
  );
}

// ─── BADGES SCREEN ────────────────────────────────────────────────────────────
function BadgesScreen({stats, notes, onBack}) {
  const earned = ALL_BADGES.filter(b => b.check(stats, notes));
  const notEarned = ALL_BADGES.filter(b => !b.check(stats, notes));
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      <div style={{padding:"0 18px 12px",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.white,fontSize:22,cursor:"pointer"}}>←</button>
        <div style={{fontWeight:900,fontSize:18,flex:1}}>Tous les badges</div>
        <div style={{background:`${C.primary}22`,border:`1px solid ${C.primary}44`,borderRadius:20,padding:"5px 13px",fontSize:12,color:C.primaryLight,fontWeight:800}}>{earned.length}/{ALL_BADGES.length}</div>
      </div>
      <div style={{...gs.scroll,flex:1,padding:"0 18px 20px"}}>
        {earned.length>0 && (
          <>
            <div style={{fontSize:10,color:C.success,fontWeight:800,marginBottom:12,letterSpacing:1.5}}>✅ DÉBLOQUÉS ({earned.length})</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {earned.map(b => (
                <div key={b.id} style={gs.card({border:`1.5px solid ${b.color}44`,background:`${b.color}12`})}>
                  <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,${b.color},${b.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:10,boxShadow:`0 6px 18px ${b.color}55`}}>{b.icon}</div>
                  <div style={{fontWeight:800,fontSize:13}}>{b.label}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:4,lineHeight:1.4,fontWeight:600}}>{b.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {notEarned.length>0 && (
          <>
            <div style={{fontSize:10,color:C.muted,fontWeight:800,marginBottom:12,letterSpacing:1.5}}>🔒 À DÉBLOQUER ({notEarned.length})</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {notEarned.map(b => (
                <div key={b.id} style={gs.card({border:`1px solid ${C.border}`,opacity:0.5})}>
                  <div style={{width:48,height:48,borderRadius:14,background:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:10}}>🔒</div>
                  <div style={{fontWeight:800,fontSize:13,color:C.muted}}>{b.label}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:4,lineHeight:1.4}}>{b.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function RanksScreen({stats, onBack}) {
  const rank = getRank(stats.xp);
  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      <div style={{padding:"0 18px 12px",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.white,fontSize:22,cursor:"pointer"}}>←</button>
        <div style={{fontWeight:800,fontSize:16}}>Tous les rangs</div>
      </div>
      <div style={{...gs.scroll,flex:1,padding:"0 18px 24px"}}>
        <div style={{...gs.card({border:`1px solid ${rank.color}44`,marginBottom:18,background:`linear-gradient(135deg,${rank.color}18,${C.card})`}),textAlign:"center",padding:"20px 16px"}}>
          <div style={{fontSize:48,marginBottom:6,filter:`drop-shadow(0 6px 18px ${rank.shadow})`}}>{rank.icon}</div>
          <div style={{fontWeight:900,fontSize:20,color:rank.color}}>{rank.label}</div>
          <div style={{fontSize:12,color:C.muted,fontWeight:600,marginTop:4}}>Ton rang actuel · {stats.xp.toLocaleString()} XP</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {ALL_RANKS.map((r,i) => {
            const unlocked = stats.xp >= r.minXP;
            const isCurrent = r.id === rank.id;
            return (
              <div key={r.id} style={{...gs.card({border:`2px solid ${isCurrent?r.color:unlocked?r.color+"44":C.border}`,background:isCurrent?`linear-gradient(135deg,${r.color}22,${C.card})`:unlocked?`${r.color}0A`:C.card,padding:"12px 14px"}),display:"flex",alignItems:"center",gap:14,opacity:unlocked?1:0.55}}>
                <div style={{width:50,height:50,borderRadius:15,background:unlocked?`linear-gradient(135deg,${r.color},${r.color}88)`:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,boxShadow:unlocked?`0 4px 14px ${r.shadow}`:"none"}}>{unlocked?r.icon:"🔒"}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontWeight:900,fontSize:14,color:unlocked?r.color:C.muted}}>{r.label}</span>
                    {isCurrent && <span style={{fontSize:9,background:r.color,color:"#fff",borderRadius:6,padding:"2px 6px",fontWeight:800}}>ACTUEL</span>}
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontWeight:600,marginTop:2}}>{r.minXP.toLocaleString()} XP requis</div>
                  {unlocked && !isCurrent && <div style={{fontSize:10,color:C.success,fontWeight:700,marginTop:1}}>✅ Débloqué</div>}
                  {!unlocked && <div style={{fontSize:10,color:C.muted,fontWeight:600,marginTop:1}}>🔒 {(r.minXP-stats.xp).toLocaleString()} XP manquants</div>}
                </div>
                <div style={{width:30,height:30,borderRadius:10,background:i===0?"transparent":C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:C.muted,fontWeight:800,flexShrink:0}}>{i+1}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({user, stats, notes, onLogout, showToast, setStats}) {
  const [subView, setSubView] = useState("main");
  const [editForm, setEditForm] = useState({username:user.username, bio:user.bio||"", favSubject:user.favSubject||"", color:user.color||C.primary});
  const [confirmLogout, setConfirmLogout] = useState(false);
  const level = Math.floor(stats.xp/1000)+1;
  const xpInLevel = stats.xp%1000;
  const pct = stats.totalAnswers>0 ? Math.round(stats.goodAnswers/stats.totalAnswers*100) : 0;
  const earned = ALL_BADGES.filter(b => b.check(stats, notes));
  const rank = getRank(stats.xp);
  const nextRank = getNextRank(stats.xp);
  const rankPct = nextRank ? Math.min(100,Math.round((stats.xp - rank.minXP)/(nextRank.minXP - rank.minXP)*100)) : 100;

  const AVATAR_COLORS = ["#7C3AED","#EF4444","#10B981","#F59E0B","#3B82F6","#EC4899","#06B6D4","#F97316"];

  if (subView==="badges") return <BadgesScreen stats={stats} notes={notes} onBack={()=>setSubView("main")}/>;
  if (subView==="ranks") return <RanksScreen stats={stats} onBack={()=>setSubView("main")}/>;

  if (subView==="edit") return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      <div style={{padding:"0 18px 12px",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>setSubView("main")} style={{background:"none",border:"none",color:C.white,fontSize:22,cursor:"pointer"}}>←</button>
        <div style={{fontWeight:800,fontSize:16}}>Modifier le profil</div>
      </div>
      <div style={{...gs.scroll,flex:1,padding:"0 18px 24px"}}>
        {/* Avatar avec couleur choisie */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{width:90,height:90,borderRadius:45,background:`linear-gradient(135deg,${editForm.color},${editForm.color}BB)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,margin:"0 auto 10px",boxShadow:`0 10px 32px ${editForm.color}66`}}>{editForm.username.charAt(0).toUpperCase()||"?"}</div>
          <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:12}}>Choisis ta couleur d'avatar</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {AVATAR_COLORS.map(col => (
              <button key={col} onClick={()=>setEditForm({...editForm,color:col})} style={{width:32,height:32,borderRadius:10,background:col,border:`3px solid ${editForm.color===col?"#fff":"transparent"}`,cursor:"pointer",boxShadow:editForm.color===col?`0 4px 12px ${col}88`:"none",transition:"all .2s"}}/>
            ))}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:11,color:C.muted,marginBottom:6,display:"block",fontWeight:800,letterSpacing:.5}}>PSEUDO</label>
            <input style={gs.input} value={editForm.username} onChange={e=>setEditForm({...editForm,username:e.target.value})} placeholder="Ton pseudo"/>
          </div>
          <div>
            <label style={{fontSize:11,color:C.muted,marginBottom:6,display:"block",fontWeight:800,letterSpacing:.5}}>BIO</label>
            <textarea style={{...gs.input,minHeight:80,resize:"none"}} placeholder="Parle de toi en quelques mots..." value={editForm.bio} onChange={e=>setEditForm({...editForm,bio:e.target.value})}/>
          </div>
          <div>
            <label style={{fontSize:11,color:C.muted,marginBottom:8,display:"block",fontWeight:800,letterSpacing:.5}}>MATIÈRE PRÉFÉRÉE</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {SUBJECTS.map(s => (
                <button key={s} onClick={()=>setEditForm({...editForm,favSubject:s})} style={{padding:"6px 12px",borderRadius:10,border:`1.5px solid ${editForm.favSubject===s?SC[s]||C.primary:C.border}`,background:editForm.favSubject===s?`${SC[s]||C.primary}22`:C.card,color:editForm.favSubject===s?SC[s]||C.primary:C.muted,fontWeight:700,fontSize:11,fontFamily:"'Nunito',sans-serif",cursor:"pointer",transition:"all .2s"}}>{SI[s]} {s}</button>
              ))}
            </div>
          </div>
          <button style={gs.btn()} onClick={()=>{
            if (editForm.username.trim().length<2) { showToast("Pseudo trop court","error","⚠️"); return; }
            const users = DB.getUsers();
            const updated = users.map(u => u.id===user.id ? {...u,...editForm} : u);
            DB.saveUsers(updated); Object.assign(user, editForm);
            showToast("Profil mis à jour !","success","✅"); setSubView("main");
          }}>Enregistrer les modifications</button>
        </div>
      </div>
    </div>
  );

  const avatarColor = user.color || C.primary;

  return (
    <div style={gs.scroll}><div style={{padding:"0 18px 24px"}}>
      {confirmLogout && <ConfirmModal title="Se déconnecter ?" message="Tu devras te reconnecter pour accéder à tes données." danger={false} onConfirm={onLogout} onCancel={()=>setConfirmLogout(false)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontWeight:900,fontSize:20}}>Profil</div>
        <button onClick={()=>setSubView("edit")} style={{background:C.card,border:`1px solid ${C.glassBorder}`,borderRadius:12,padding:"7px 13px",cursor:"pointer",fontSize:13,color:C.white,fontWeight:700,fontFamily:"'Nunito',sans-serif"}}>✏️ Modifier</button>
      </div>

      {/* Carte profil hero */}
      <div style={{background:`linear-gradient(135deg,${avatarColor}22,${C.card2})`,border:`1.5px solid ${avatarColor}44`,borderRadius:22,padding:"18px 16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
          <div style={{width:68,height:68,borderRadius:34,background:`linear-gradient(135deg,${avatarColor},${avatarColor}CC)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0,boxShadow:`0 8px 24px ${avatarColor}66`}}>{user.username.charAt(0).toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:900,fontSize:18,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.username}</div>
            <div style={{fontSize:11,color:C.muted,fontWeight:600,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
            {user.favSubject && <div style={{fontSize:11,color:SC[user.favSubject]||C.primary,fontWeight:700,marginTop:3}}>{SI[user.favSubject]} {user.favSubject}</div>}
            {user.bio && <div style={{fontSize:11,color:C.mutedLight,marginTop:4,fontStyle:"italic",lineHeight:1.4}}>"{user.bio}"</div>}
          </div>
        </div>
        {/* Rang actuel dans la carte */}
        <div style={{background:`${rank.color}18`,border:`1px solid ${rank.color}44`,borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:12,cursor:"pointer"}} onClick={()=>setSubView("ranks")}>
          <div style={{fontSize:26,filter:`drop-shadow(0 4px 10px ${rank.shadow})`}}>{rank.icon}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontWeight:900,fontSize:14,color:rank.color}}>{rank.label}</span>
              {nextRank && <span style={{fontSize:9,color:C.muted,fontWeight:600}}>→ {nextRank.label}</span>}
            </div>
            <div style={{height:5,background:C.border,borderRadius:5,overflow:"hidden",marginTop:5}}>
              <div style={{width:`${rankPct}%`,height:"100%",background:`linear-gradient(90deg,${rank.color},${nextRank?nextRank.color:rank.color})`,borderRadius:5,transition:"width 1s ease"}}/>
            </div>
            {nextRank
              ? <div style={{fontSize:9,color:C.muted,fontWeight:600,marginTop:3}}>{(nextRank.minXP-stats.xp).toLocaleString()} XP pour {nextRank.label}</div>
              : <div style={{fontSize:9,color:rank.color,fontWeight:700,marginTop:3}}>🎉 Rang maximum atteint !</div>
            }
          </div>
          <span style={{fontSize:11,color:C.muted,fontWeight:700}}>›</span>
        </div>
        {/* Barre XP niveau */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:11,color:C.accent,fontWeight:800}}>⭐ Niveau {level}</span>
            <span style={{fontSize:10,color:C.muted,fontWeight:700}}>{xpInLevel}/1000 XP</span>
          </div>
          <div style={{height:6,background:C.border,borderRadius:6,overflow:"hidden"}}>
            <div style={{width:`${(xpInLevel/1000)*100}%`,height:"100%",background:`linear-gradient(90deg,${C.accent},${C.accentLight})`,borderRadius:6,transition:"width 1s ease"}}/>
          </div>
          <div style={{fontSize:9,color:C.muted,marginTop:4,fontWeight:600}}>{1000-xpInLevel} XP pour le niveau {level+1}</div>
        </div>
      </div>

      {/* Grille stats rapides */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[
          {icon:"🏆",label:"Quiz",val:stats.quizDone,color:C.info},
          {icon:"🎯",label:"Réussite",val:`${pct}%`,color:pct>=70?C.success:pct>=40?C.accent:C.error},
          {icon:"🔥",label:"Streak",val:`${stats.streak}j`,color:C.accent},
          {icon:"💰",label:"XP total",val:stats.xp>=1000?`${(stats.xp/1000).toFixed(1)}k`:stats.xp,color:C.primaryLight},
          {icon:"⚡",label:"Record",val:`${stats.bestStreak}j`,color:"#8B5CF6"},
          {icon:"📝",label:"Notes",val:notes.length,color:"#06B6D4"},
        ].map((s,i) => (
          <div key={i} style={{...gs.card({border:`1px solid ${C.glassBorder}`,padding:"10px 8px",textAlign:"center"})}}>
            <div style={{fontSize:16,marginBottom:3}}>{s.icon}</div>
            <div style={{fontSize:16,fontWeight:900,color:s.color}}>{s.val}</div>
            <div style={{fontSize:9,color:C.muted,fontWeight:600,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rangs - aperçu */}
      <div style={{...gs.card({border:`1px solid ${C.glassBorder}`,marginBottom:14}),cursor:"pointer"}} onClick={()=>setSubView("ranks")}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:14}}>🏅 Rangs</div>
          <span style={{fontSize:12,color:C.primary,fontWeight:700}}>Voir tous →</span>
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
          {ALL_RANKS.map(r => {
            const unlocked = stats.xp >= r.minXP;
            const isCurrent = r.id === rank.id;
            return (
              <div key={r.id} style={{flexShrink:0,width:52,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:44,height:44,borderRadius:13,background:unlocked?`linear-gradient(135deg,${r.color},${r.color}88)`:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:isCurrent?`2.5px solid ${r.color}`:"2px solid transparent",boxShadow:isCurrent?`0 0 12px ${r.shadow}`:"none",transition:"all .3s"}}>{unlocked?r.icon:"🔒"}</div>
                <div style={{fontSize:8,fontWeight:isCurrent?800:600,color:isCurrent?r.color:C.muted,textAlign:"center",lineHeight:1.2}}>{r.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div style={gs.card({border:`1px solid ${C.glassBorder}`,marginBottom:14})}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:14}}>🏅 Badges</div>
          <button onClick={()=>setSubView("badges")} style={{background:"none",border:"none",color:C.primary,fontSize:12,cursor:"pointer",fontWeight:700,fontFamily:"'Nunito',sans-serif"}}>{earned.length}/{ALL_BADGES.length} voir tous →</button>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {earned.length===0 && <div style={{color:C.muted,fontSize:12,fontWeight:600}}>Complète des quiz pour débloquer des badges !</div>}
          {earned.slice(0,9).map(b => (
            <div key={b.id} title={b.label} style={{width:44,height:44,borderRadius:13,background:`linear-gradient(135deg,${b.color},${b.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 3px 10px ${b.color}44`}}>{b.icon}</div>
          ))}
          {earned.length>9 && <div style={{width:44,height:44,borderRadius:13,background:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.muted,fontWeight:800}}>+{earned.length-9}</div>}
        </div>
      </div>

      {/* Stats détaillées */}
      <div style={gs.card({border:`1px solid ${C.glassBorder}`,marginBottom:14})}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>📊 Statistiques détaillées</div>
        {[
          {l:"Bonnes réponses",v:`${stats.goodAnswers} / ${stats.totalAnswers}`},
          {l:"Taux de réussite",v:`${pct}%`,bold:true,color:pct>=70?C.success:pct>=40?C.accent:C.error},
          {l:"Série actuelle",v:`${stats.streak} jours 🔥`},
          {l:"Meilleur streak",v:`${stats.bestStreak} jours ⚡`},
          {l:"Temps de révision",v:stats.totalTimeSpent>0?`${Math.floor(stats.totalTimeSpent/60)} min`:"—"},
          {l:"Membre depuis",v:user.createdAt?new Date(user.createdAt).toLocaleDateString("fr-FR",{month:"short",year:"numeric"}):"—"},
        ].map((item,i,arr) => (
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${C.glassBorder}`:"none"}}>
            <span style={{fontSize:13,color:C.muted,fontWeight:600}}>{item.l}</span>
            <span style={{fontSize:13,fontWeight:item.bold?900:800,color:item.color||C.white}}>{item.v}</span>
          </div>
        ))}
      </div>

      <button style={gs.btn("danger")} onClick={()=>setConfirmLogout(true)}>🚪 Déconnexion</button>
    </div></div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function LeaderboardScreen({user, stats, onBack, showToast}) {
  const [tab, setTab] = useState("Global");
  const [addFriend, setAddFriend] = useState("");
  const [friends, setFriends] = useState(()=>DB.getFriends(user.id));
  const allUsers = DB.getUsers();
  const allWithStats = allUsers
    .map(u => { const s = DB.getStats(u.id); return {...u, xp:s.xp, level:Math.floor(s.xp/1000)+1, streak:s.streak}; })
    .sort((a,b) => b.xp-a.xp);
  const friendList = allWithStats.filter(u => friends.includes(u.username));
  const myRank = allWithStats.findIndex(u => u.id===user.id)+1;
  const medals = ["🥇","🥈","🥉"];

  // Fix: la liste Amis n'affiche "ajoute des amis" que si vraiment 0 ami
  const list = tab==="Global" ? allWithStats : friendList;

  const addFriendH = () => {
    if (!addFriend.trim()) return;
    const found = allUsers.find(u => u.username===addFriend.trim() && u.id!==user.id);
    if (!found) { showToast("Utilisateur introuvable","error","❌"); return; }
    if (friends.includes(found.username)) { showToast("Déjà ami !","error","⚠️"); return; }
    const u = [...friends, found.username]; setFriends(u); DB.saveFriends(user.id, u);
    showToast(`${found.username} ajouté ! 🤝`,"success","🤝"); setAddFriend("");
  };

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      <div style={{padding:"0 18px 10px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.white,fontSize:22,cursor:"pointer"}}>←</button>
          <div style={{fontWeight:900,fontSize:18,flex:1}}>Classement</div>
          <div style={{fontSize:12,color:C.muted,fontWeight:700,background:C.card,border:`1px solid ${C.glassBorder}`,borderRadius:10,padding:"5px 10px"}}>#{myRank}</div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {["Global","Amis"].map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 0",borderRadius:13,border:"none",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,transition:"all .2s",background:tab===t?`linear-gradient(135deg,${C.primary},${C.primaryLight})`:C.card,color:tab===t?C.white:C.muted,boxShadow:tab===t?`0 4px 14px rgba(124,58,237,.4)`:"none"}}>
              {t}{t==="Amis"?` (${friends.length})`:""}
            </button>
          ))}
        </div>
        {tab==="Amis" && (
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input style={{...gs.input,flex:1,padding:"10px 12px",fontSize:13}} placeholder="Ajouter un ami par pseudo..." value={addFriend} onChange={e=>setAddFriend(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addFriendH()}/>
            <button onClick={addFriendH} style={{background:`linear-gradient(135deg,${C.primary},${C.primaryLight})`,border:"none",borderRadius:13,padding:"0 16px",cursor:"pointer",fontSize:20,color:C.white,boxShadow:`0 4px 14px rgba(124,58,237,.4)`}}>+</button>
          </div>
        )}
      </div>

      <div style={{...gs.scroll,flex:1,padding:"0 18px 20px"}}>
        {list.length===0 && (
          <div style={{textAlign:"center",padding:40}}>
            <div style={{fontSize:48,marginBottom:12}}>👥</div>
            <div style={{color:C.muted,fontSize:14,fontWeight:600}}>Ajoute des amis par leur pseudo !</div>
          </div>
        )}
        {list.map((u,i) => (
          <div key={u.id} style={{...gs.card({border:`1.5px solid ${u.id===user.id?C.primary:C.glassBorder}`,marginBottom:10,background:u.id===user.id?`${C.primary}14`:C.card,transition:"all .2s"}),display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:11,flexShrink:0,background:i<3?`linear-gradient(135deg,${C.accent},#f97316)`:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:i<3?20:13,fontWeight:800,color:i<3?C.white:C.muted}}>{i<3?medals[i]:i+1}</div>
            <div style={{width:40,height:40,borderRadius:20,background:`linear-gradient(135deg,${C.primary},${C.primaryLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{u.username.charAt(0).toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:u.id===user.id?C.primaryLight:C.white}}>{u.username}{u.id===user.id?" (Moi)":""}</div>
              <div style={{fontSize:10,color:C.muted,fontWeight:600}}>Niv. {u.level} · 🔥 {u.streak}j</div>
            </div>
            <div style={{fontWeight:900,fontSize:13,color:C.accent}}>{u.xp.toLocaleString()} XP</div>
          </div>
        ))}
        <div style={{textAlign:"center",marginTop:14,fontSize:13,color:C.accent,fontWeight:800}}>Continue comme ça ! 🚀</div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function StudyQuest() {
  const [user, setUser] = useState(() => safeGet("sq_current_user", null));
  const [tab, setTab] = useState("home");
  const [stats, setStats] = useState(null);
  const [notes, setNotes] = useState([]);
  const [quizData, setQuizData] = useState(null);
  const [badgePopup, setBadgePopup] = useState(null);
  const {toasts, show:showToast} = useToast();
  const prevBadges = useRef([]);

  useEffect(() => {
    if (user) {
      const s = DB.getStats(user.id); const n = DB.getNotes(user.id);
      setStats(s); setNotes(n);
      localStorage.setItem("sq_current_user", JSON.stringify(user));
      prevBadges.current = ALL_BADGES.filter(b => b.check(s,n)).map(b => b.id);
    }
  }, [user]);

  const checkBadges = useCallback((newStats, newNotes) => {
    const s = newStats || stats; const n = newNotes || notes;
    const now = ALL_BADGES.filter(b => b.check(s,n)).map(b => b.id);
    const unlocked = now.filter(id => !prevBadges.current.includes(id));
    if (unlocked.length>0) {
      const badge = ALL_BADGES.find(b => b.id===unlocked[0]);
      setBadgePopup(badge); prevBadges.current = now;
    }
  }, [stats, notes]);

  const handleSetStats = useCallback(s => { setStats(s); if (user) DB.saveStats(user.id, s); }, [user]);
  const login = u => { setUser(u); setStats(DB.getStats(u.id)); setNotes(DB.getNotes(u.id)); };
  const logout = () => { localStorage.removeItem("sq_current_user"); setUser(null); setTab("home"); setStats(null); setNotes([]); };

  const render = () => {
    if (!user) return <AuthScreen onLogin={login}/>;
    if (!stats) return null;
    if (tab==="quiz_active" && quizData) return (
      <QuizScreen quizData={quizData} user={user} stats={stats} setStats={handleSetStats}
        onFinish={dest=>{setQuizData(null);setTab(dest||"home");setStats(DB.getStats(user.id));}}
        onBack={()=>setTab("quiz")} showToast={showToast} onCheckBadges={checkBadges}/>
    );
    if (tab==="leaderboard") return <LeaderboardScreen user={user} stats={stats} onBack={()=>setTab("home")} showToast={showToast}/>;
    switch(tab) {
      case"home": return <HomeScreen user={user} stats={stats} notes={notes} onNav={setTab}/>;
      case"notes": return <NotesScreen user={user} notes={notes} setNotes={n=>{setNotes(n);DB.saveNotes(user.id,n);}} showToast={showToast} onCheckBadges={checkBadges}/>;
      case"quiz": return <GeneratorScreen user={user} notes={notes} stats={stats} onStartQuiz={d=>{setQuizData(d);setTab("quiz_active");}} showToast={showToast} onCheckBadges={checkBadges}/>;
      case"stats": return <StatsScreen stats={stats}/>;
      case"profile": return <ProfileScreen user={user} stats={stats} notes={notes} onLogout={logout} showToast={showToast} setStats={handleSetStats}/>;
      default: return <HomeScreen user={user} stats={stats} notes={notes} onNav={setTab}/>;
    }
  };

  // ── PWA Manifest injection ────────────────────────────────────────────────
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestData = {
        name:"StudyQuest", short_name:"StudyQuest",
        description:"Application de révision intelligente avec IA",
        start_url:"/", display:"standalone", orientation:"portrait",
        background_color:"#0A0A0F", theme_color:"#7C3AED",
        icons:[
          {src:"/studyquest_logo.png",sizes:"512x512",type:"image/png",purpose:"any maskable"},
          {src:"/studyquest_logo.png",sizes:"192x192",type:"image/png"}
        ]
      };
      const blob = new Blob([JSON.stringify(manifestData)],{type:"application/json"});
      const link = document.createElement("link");
      link.rel = "manifest"; link.href = URL.createObjectURL(blob);
      document.head.appendChild(link);
    }
    const metas = [
      {name:"theme-color",content:"#7C3AED"},
      {name:"mobile-web-app-capable",content:"yes"},
      {name:"apple-mobile-web-app-capable",content:"yes"},
      {name:"apple-mobile-web-app-status-bar-style",content:"black-translucent"},
      {name:"apple-mobile-web-app-title",content:"StudyQuest"},
      {name:"description",content:"Application de révision intelligente avec IA"},
    ];
    metas.forEach(({name,content})=>{
      if (!document.querySelector(`meta[name="${name}"]`)) {
        const m = document.createElement("meta"); m.name=name; m.content=content;
        document.head.appendChild(m);
      }
    });
    document.title = "StudyQuest";
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideIn{from{transform:translateY(-16px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{display:none}
      `}</style>
      <div style={gs.app}>
        <div style={gs.phone}>
          <StatusBar/>
          <Toast toasts={toasts}/>
          {badgePopup && <BadgePopup badge={badgePopup} onClose={()=>setBadgePopup(null)}/>}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>{render()}</div>
          {user && tab!=="quiz_active" && <BottomNav active={tab} onChange={setTab}/>}
        </div>
      </div>
    </>
  );
}
