import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ── STRAVA PALETTE ─────────────────────────────────────────────
const C = {
  orange:  "#FC4C02",
  dark:    "#1A1A1E",
  card:    "#242428",
  card2:   "#2D2D31",
  border:  "#3A3A3E",
  muted:   "#6B6B6E",
  light:   "#EBEBEB",
  green:   "#2ECC71",
  yellow:  "#F1C40F",
  red:     "#E74C3C",
  blue:    "#3498DB",
  purple:  "#9B59B6",
  teal:    "#1ABC9C",
};

// ── REAL STRAVA DATA ────────────────────────────────────────────
const REAL_RUNS = [
  { date:"18.5", dist:5007, time:1849 }, { date:"19.5", dist:5013, time:1898 },
  { date:"21.5", dist:5055, time:1872 }, { date:"22.5", dist:5013, time:1910 },
  { date:"24.5", dist:5024, time:1826 }, { date:"27.5", dist:5010, time:1971 },
  { date:"1.6",  dist:5004, time:1925 }, { date:"3.6",  dist:5012, time:1902 },
  { date:"5.6",  dist:5019, time:1943 }, { date:"6.6",  dist:5015, time:1956 },
  { date:"8.6",  dist:5018, time:1948 }, { date:"9.6",  dist:5024, time:1835 },
  { date:"11.6", dist:5020, time:1880 }, { date:"12.6", dist:5013, time:1882 },
  { date:"13.6", dist:5075, time:2023 }, { date:"14.6", dist:5020, time:1720 },
];

const RECENT_ACTIVITIES = [
  { date:"14.6", name:"Evening Run",    type:"Run",  dist:5.02, time:"28:40", kcal:336, hr:null },
  { date:"14.6", name:"Afternoon Hike", type:"Hike", dist:5.36, time:"79:13", kcal:362, hr:null },
  { date:"14.6", name:"Lunch Ride",     type:"Ride", dist:2.98, time:"15:33", kcal:107, hr:null },
  { date:"13.6", name:"Lunch Run",      type:"Run",  dist:5.08, time:"33:43", kcal:336, hr:128 },
  { date:"12.6", name:"Evening Run",    type:"Run",  dist:5.01, time:"31:22", kcal:330, hr:135 },
  { date:"11.6", name:"Evening Run",    type:"Run",  dist:5.02, time:"31:20", kcal:335, hr:130 },
  { date:"9.6",  name:"Morning Run",    type:"Run",  dist:5.02, time:"30:35", kcal:334, hr:null },
];

// ── COMPUTED STATS ─────────────────────────────────────────────
const run5k = REAL_RUNS.map(r => ({ ...r, t5k: (r.time / (r.dist/1000)) * 5, pace: r.time / (r.dist/1000) }));
const best5k = Math.min(...run5k.map(r => r.t5k));
const avg5k  = run5k.reduce((s,r) => s+r.t5k, 0) / run5k.length;
const target5k = best5k * 0.9;
const fmt = s => { s=Math.round(s); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const fmtPace = s => { s=Math.round(s); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}/km`; };

const WEIGHT = 75;
const PROTEIN_DAILY = Math.round(WEIGHT * 1.8);
const PROTEIN_POST  = Math.round(WEIGHT * 0.30);
const KCAL_5K = Math.round(WEIGHT * 5 * 1.0);

const MONTHLY = [
  { m:"Mar", run:34, bike:15, walk:15, kcal:3100 },
  { m:"Apr", run:62, bike:56, walk:28, kcal:5900 },
  { m:"Máj", run:71, bike:85, walk:35, kcal:7200 },
  { m:"Jún", run:48, bike:11, walk:22, kcal:4100 },
];

// ── TRAINING PLAN ──────────────────────────────────────────────
const BASE_PLAN = [
  { w:1, phase:"Základ",  col:C.green,  tue:`5 km Z2 easy (SF<130)`,  wed:`Sila 30 min`, sat:`8 km easy Z2`,   focus:"Technika & základňa" },
  { w:2, phase:"Základ",  col:C.green,  tue:`5 km Z2 + 4×100 m`,      wed:`Sila 35 min`, sat:`9 km easy Z2`,   focus:"Buduj objem" },
  { w:3, phase:"Rozvoj",  col:C.yellow, tue:`4×800 m Z3 tempo`,        wed:`Sila 35 min`, sat:`10 km easy Z2`,  focus:"Laktátový prah" },
  { w:4, phase:"Deload",  col:C.blue,   tue:`4 km Z1 pomaly`,          wed:`Sila 30 min`, sat:`6 km easy Z2`,   focus:"Zotavenie ↓ 30 %" },
  { w:5, phase:"Tempo",   col:C.orange, tue:`3 km Z3 tempo run`,       wed:`Sila 40 min`, sat:`11 km easy Z2`,  focus:"Rýchlosť & sila" },
  { w:6, phase:"Tempo",   col:C.orange, tue:`6×1 min Z4 intervaly`,    wed:`Sila 40 min`, sat:`12 km easy Z2`,  focus:"VO₂max stimul" },
  { w:7, phase:"Vrchol",  col:C.red,    tue:`4 km Z3 + 4×200 m šprinty`, wed:`Sila 35 min`, sat:`13 km easy Z2`, focus:"Vrcholná záťaž" },
  { w:8, phase:"Test",    col:C.purple, tue:`4 km easy Z1`,            wed:`Voľno`,       sat:`🏁 5 km TEST PR!`, focus:"Tapering → PR" },
];

// ── SUB-COMPONENTS ─────────────────────────────────────────────
const Card = ({ children, style={} }) => (
  <div style={{ background:C.card, borderRadius:12, padding:16, border:`1px solid ${C.border}`, ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ icon, title }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
    <div style={{ width:3, height:20, background:C.orange, borderRadius:2 }} />
    <span style={{ fontSize:11, color:C.orange, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>{icon} {title}</span>
  </div>
);

const KPI = ({ label, value, sub, color=C.orange }) => (
  <div style={{ background:C.card2, borderRadius:10, padding:"12px 14px", borderTop:`2px solid ${color}` }}>
    <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>{label}</div>
    <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1.1 }}>{value}</div>
    {sub && <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{sub}</div>}
  </div>
);

const Tag = ({ label, color }) => (
  <span style={{ background:`${color}22`, color, fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>{label}</span>
);

const PaceAxis = ({ x, y, payload }) => {
  const s = Math.round(payload.value); const m=Math.floor(s/60); const sec=String(s%60).padStart(2,'0');
  return <text x={x} y={y} dy={4} textAnchor="end" fill={C.muted} fontSize={10}>{m}:{sec}</text>;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:11 }}>
      <div style={{ color:C.muted, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color }}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  );
};

// ── MAIN DASHBOARD ─────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab]           = useState("overview");
  const [loading, setLoading]   = useState(false);
  const [lastSync, setLastSync] = useState("13. 6. 2026, 15:42");
  const [zeppData, setZeppData] = useState({
    weight: 74.95, fat: 21.8, muscle: 55.61, water: 53.6,
    bmi: 23.1, bone: 2.98, visceral: 12, protein: 20.5,
    bodyScore: 79, bmr: 1488, bodyType: "Balanced", date: "15. 6. 2026"
  });
  const [zeppLoading, setZeppLoading] = useState(false);
  const [aiTips, setAiTips]     = useState(null);
  const [aiPlan, setAiPlan]     = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const fileRef = useRef();

  const paceChartData = [...run5k].reverse().map(r => ({
    date: r.date,
    pace: Math.round(r.pace),
    t5k:  Math.round(r.t5k),
  }));

  // ── SYNC STRAVA ──────────────────────────────────────────────
  const syncStrava = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLastSync(new Date().toLocaleString("sk-SK", { day:"numeric", month:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" }));
    setLoading(false);
  }, []);

  // ── AI TIPS ──────────────────────────────────────────────────
  const generateAiInsights = useCallback(async (bodyData=null) => {
    setAiLoading(true);
    try {
      const bodyCtx = bodyData
        ? `Telesné zloženie z Zepp Life (15.6.2026): hmotnosť ${bodyData.weight} kg, tukové tkanivo ${bodyData.fat}% (trochu vysoké pre bežca, cieľ <18%), svalová hmota ${bodyData.muscle} kg (dobrá), telesná voda ${bodyData.water}% (NÍZKA – nedostatočná, cieľ 55-65%), BMI ${bodyData.bmi} (v norme), viscerálny tuk ${bodyData.visceral} (ZVÝŠENÝ, cieľ <10), kostná hmota ${bodyData.bone} kg (nízka), proteín ${bodyData.protein}% (výborný), bazálny metabolizmus ${bodyData.bmr} kcal, Body Score ${bodyData.bodyScore}/100.`
        : `Hmotnosť 75 kg (bez detailných údajov z Zepp Life).`;

      const prompt = `Si osobný tréner a výživový poradca pre bežca.

Athlete profil:
- Vek: 42 rokov, hmotnosť 75 kg
- ${bodyCtx}
- Najlepší 5K čas: ${fmt(best5k)} (tempo ${fmtPace(best5k/5)})
- Priemerný 5K čas: ${fmt(avg5k)}
- Cieľ: 5K pod ${fmt(target5k)} (+10% zlepšenie)
- Aktuálny tréningový týždeň: ${currentWeek}/8
- Posledné aktivity: 4× beh za posledných 7 dní, SF 128–135 bpm (Z2)
- 95% behov rovnakým tempom, nulový silový tréning doteraz
- Proteín: cieľ ${PROTEIN_DAILY}g/deň, ${PROTEIN_POST}g po tréningu

Vygeneruj JSON objekt s týmito kľúčmi:
{
  "weekTip": "Tip na tento tréningový týždeň (max 120 znakov)",
  "nutritionTip": "Tip na výživu pre tento týždeň (max 120 znakov)",
  "recoveryTip": "Tip na zotavenie (max 120 znakov)",
  "nextRunGoal": "Konkrétny cieľ pre najbližší beh (max 80 znakov)",
  "strengthFocus": "Fokus silového tréningu túto stredu (max 100 znakov)",
  "warningSign": "Čo sledovať / čoho sa vyvarovať (max 100 znakov)",
  "motivation": "Motivačná veta personalizovaná pre Kornela (max 100 znakov)"
}

Odpovedaj LEN čistým JSON, bez markdown, bez preamble.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, messages:[{ role:"user", content:prompt }] })
      });
      const data = await res.json();
      const raw = data.content?.find(b=>b.type==="text")?.text || "{}";
      const clean = raw.replace(/```json|```/g,"").trim();
      setAiTips(JSON.parse(clean));
    } catch(e) {
      setAiTips({ weekTip:"Pokračuj v pláne, dôvera v proces je základ úspechu.", nutritionTip:`Dnes zjedz ${PROTEIN_DAILY}g proteínu a pi aspoň 2,5 l vody.`, recoveryTip:"Spánok 7–8h je najlepší doplnok stravy.", nextRunGoal:`Beh 5 km, SF pod 130 bpm, cieľ tempo ${fmtPace(avg5k/5)}`, strengthFocus:"Drepy 3×15, hip thrust 3×15, plank 3×30s, výpady 3×10", warningSign:"Ak SF stúpa pri rovnakom tempe – zober deň voľna.", motivation:"Každý beh ťa posúva bližšie k 27:15. Nezastávaj." });
    }
    setAiLoading(false);
  }, [currentWeek]);

  // ── ZEPP LIFE UPLOAD ─────────────────────────────────────────
  const handleZeppUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZeppLoading(true);
    try {
      const toBase64 = f => new Promise((res,rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const b64 = await toBase64(file);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:600,
          messages:[{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type:file.type, data:b64 }},
            { type:"text",  text:`Toto je screenshot z Zepp Life alebo smart váhy. Extrahuj telesné zloženie a vráť JSON:
{"weight": číslo, "fat": číslo, "muscle": číslo, "water": číslo, "bmi": číslo, "bone": číslo, "visceral": číslo, "date": "reťazec"}
Ak nejaký údaj chýba, daj null. Iba JSON, žiadny text navyše.` }
          ]}]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b=>b.type==="text")?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setZeppData(parsed);
      generateAiInsights(parsed);
    } catch(err) {
      console.error(err);
    }
    setZeppLoading(false);
  }, [generateAiInsights]);

  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [historyData, setHistoryData] = useState([]);

  const fetchHealthData = useCallback(async () => {
    setHealthLoading(true);
    try {
      const [res, histRes] = await Promise.all([
        fetch("https://kornel-fitness.vercel.app/api/health"),
        fetch("https://kornel-fitness.vercel.app/api/health?type=history"),
      ]);
      const data = await res.json();
      const hist = await histRes.json();
      if (data && Object.keys(data).length > 0) {
        setHealthData(data);
        setZeppData(prev => ({ ...prev, ...data }));
      }
      if (Array.isArray(hist)) setHistoryData(hist.reverse());
    } catch(e) { console.error(e); }
    setHealthLoading(false);
  }, []);

  useEffect(() => {
    fetchHealthData();
    generateAiInsights();
  }, []);

  const tabs = [
    { id:"overview",  label:"📊 Prehľad" },
    { id:"runs",      label:"🏃 Behy" },
    { id:"plan",      label:"📅 Plán" },
    { id:"nutrition", label:"🥗 Výživa" },
    { id:"body",      label:"⚖️ Telo" },
    { id:"ai",        label:"🤖 AI Tipy" },
    { id:"history",   label:"📈 História" },
  ];

  const activityIcon = t => ({ Run:"🏃", Ride:"🚴", Walk:"🚶", Hike:"🥾" }[t] || "⚡");
  const activityColor = t => ({ Run:C.orange, Ride:C.blue, Walk:C.purple, Hike:C.green }[t] || C.muted);

  return (
    <div style={{ background:C.dark, minHeight:"100vh", color:C.light, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", fontSize:13, overflowX:"hidden", maxWidth:"100vw" }}>

      {/* ── HEADER ── */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"0 12px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:48, gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            <div style={{ background:C.orange, borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, flexShrink:0 }}>S</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:13, lineHeight:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>KORNEL MICHALIC</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>42r · 75kg · Košice</div>
            </div>
          </div>
          <button onClick={syncStrava} disabled={loading}
            style={{ background:loading?C.card2:C.orange, color:"#fff", border:"none", borderRadius:8, padding:"6px 10px", fontWeight:700, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4, flexShrink:0, whiteSpace:"nowrap" }}>
            {loading ? <>⟳ Sync…</> : "⟳ Strava"}
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, overflowX:"auto", WebkitOverflowScrolling:"touch", msOverflowStyle:"none", scrollbarWidth:"none" }}>
        <div style={{ display:"flex", gap:0, minWidth:"max-content", padding:"0 8px" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background:"none", border:"none", borderBottom:`2px solid ${tab===t.id ? C.orange:"transparent"}`, color:tab===t.id ? C.orange : C.muted, padding:"10px 12px", cursor:"pointer", fontWeight:tab===t.id?700:400, fontSize:11, transition:"all .15s", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"12px" }}>

        {/* ══════════════════════════════════════
            TAB: PREHĽAD
        ══════════════════════════════════════ */}
        {tab === "overview" && (
          <>
            {/* Hero bar */}
            <div style={{ background:`linear-gradient(135deg, ${C.card} 0%, #1a1218 100%)`, borderRadius:12, padding:"14px 16px", marginBottom:14, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontSize:10, color:C.orange, letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Aktuálny cieľ</div>
                <div style={{ fontSize:28, fontWeight:900 }}>5 km pod <span style={{ color:C.orange }}>{fmt(target5k)}</span></div>
                <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>Najlepší reálny čas: <strong style={{ color:C.green }}>{fmt(best5k)}</strong> · Priemer: {fmt(avg5k)} · Potrebné zlepšenie: <strong style={{ color:C.orange }}>−{fmt(avg5k - target5k)}</strong></div>
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[
                  [fmt(best5k), "Najlepší 5K", C.green],
                  [fmt(avg5k), "Priemer 5K", C.orange],
                  [fmt(target5k), "Cieľ +10%", C.blue],
                  [fmtPace(best5k/5), "Najlepšie tempo", C.yellow],
                ].map(([v,l,col]) => (
                  <div key={l} style={{ background:C.card2, borderRadius:10, padding:"10px 14px", textAlign:"center", borderTop:`2px solid ${col}` }}>
                    <div style={{ fontSize:18, fontWeight:800, color:col }}>{v}</div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:8, marginBottom:14 }}>
              <KPI label="Celkové aktivity" value="87+" sub="Mar–Jún 2026" color={C.orange} />
              <KPI label="Km beh" value="215 km" sub="42 aktivít" color={C.green} />
              <KPI label="Km bicykel" value="167 km" sub="38 aktivít" color={C.blue} />
              <KPI label="Aktivít/týždeň" value="~7" sub="nadpriemer" color={C.yellow} />
              <KPI label="Kcal spálených" value="~20k" sub="3 mesiace" color={C.red} />
              <KPI label="Tréning. plán" value={`T${currentWeek}/8`} sub={BASE_PLAN[currentWeek-1]?.phase} color={BASE_PLAN[currentWeek-1]?.col || C.orange} />
            </div>

            {/* Charts row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <Card>
                <SectionTitle icon="📈" title="Vývoj 5km tempa" />
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={paceChartData}>
                    <defs>
                      <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.orange} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="date" tick={{ fill:C.muted, fontSize:9 }} />
                    <YAxis tick={<PaceAxis />} reversed domain={['dataMin - 20','dataMax + 20']} width={35} />
                    <Tooltip content={<CustomTooltip />} formatter={(v)=>[fmt(v)+" /km","Tempo"]} />
                    <ReferenceLine y={Math.round(target5k/5)} stroke={C.green} strokeDasharray="4 4" label={{ value:`Cieľ ${fmt(target5k/5)}`, fill:C.green, fontSize:9, position:"right" }} />
                    <Area type="monotone" dataKey="pace" stroke={C.orange} strokeWidth={2} fill="url(#gr1)" name="Tempo" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <SectionTitle icon="📦" title="Mesačný objem (km)" />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={MONTHLY}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="m" tick={{ fill:C.muted, fontSize:10 }} />
                    <YAxis tick={{ fill:C.muted, fontSize:10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="run"  name="Beh"     fill={C.orange} radius={[3,3,0,0]} />
                    <Bar dataKey="bike" name="Bicykel" fill={C.blue}   radius={[3,3,0,0]} />
                    <Bar dataKey="walk" name="Chôdza"  fill={C.purple} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Recent activities */}
            <Card>
              <SectionTitle icon="⚡" title="Posledné aktivity" />
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {RECENT_ACTIVITIES.map((a,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:C.card2, borderRadius:8, borderLeft:`3px solid ${activityColor(a.type)}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:16 }}>{activityIcon(a.type)}</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:12 }}>{a.name}</div>
                        <div style={{ color:C.muted, fontSize:10 }}>{a.date}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <span style={{ color:C.light, fontSize:12 }}>{a.dist} km</span>
                      <span style={{ color:C.muted, fontSize:11 }}>{a.time}</span>
                      <span style={{ color:C.yellow, fontSize:11 }}>{a.kcal} kcal</span>
                      {a.hr && <Tag label={`♥ ${a.hr}`} color={C.red} />}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ══════════════════════════════════════
            TAB: BEHY
        ══════════════════════════════════════ */}
        {tab === "runs" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
              <KPI label="Najlepší 5K" value={fmt(best5k)} sub="24. máj 2026" color={C.green} />
              <KPI label="Priemerný 5K" value={fmt(avg5k)} sub={`z ${run5k.length} behov`} color={C.orange} />
              <KPI label="Cieľ 5K" value={fmt(target5k)} sub="+10% zlepšenie" color={C.blue} />
              <KPI label="Najlepšie tempo" value={fmtPace(best5k/5)} sub="min/km" color={C.green} />
              <KPI label="Cieľové tempo" value={fmtPace(target5k/5)} sub="min/km" color={C.blue} />
            </div>

            <Card style={{ marginBottom:16 }}>
              <SectionTitle icon="⏱" title="5 km čas — každý beh" />
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={paceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fill:C.muted, fontSize:9 }} />
                  <YAxis tick={{ fill:C.muted, fontSize:10 }} reversed domain={[Math.round(target5k)-60, Math.round(Math.max(...run5k.map(r=>r.t5k)))+30]}
                    tickFormatter={v => fmt(v)} width={38} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [fmt(v), "5K čas"]} />
                  <ReferenceLine y={Math.round(best5k)}   stroke={C.green}  strokeDasharray="4 4" label={{ value:"Najlepší", fill:C.green,  fontSize:9 }} />
                  <ReferenceLine y={Math.round(avg5k)}    stroke={C.yellow} strokeDasharray="4 4" label={{ value:"Priemer",  fill:C.yellow, fontSize:9 }} />
                  <ReferenceLine y={Math.round(target5k)} stroke={C.blue}   strokeDasharray="4 4" label={{ value:"Cieľ",     fill:C.blue,   fontSize:9 }} />
                  <Line type="monotone" dataKey="t5k" stroke={C.orange} strokeWidth={2.5} dot={{ r:4, fill:C.orange }} name="5K čas" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Table */}
            <Card>
              <SectionTitle icon="📋" title="Tabuľka všetkých behov" />
              <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:400 }}>
                  <thead>
                    <tr style={{ background:C.card2, color:C.muted, fontSize:10, textTransform:"uppercase" }}>
                      {["Dátum","Vzdialenosť","Čas","Tempo /km","5K prepočet","vs. Najlepší"].map(h => (
                        <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {run5k.map((r,i) => {
                      const isBest = Math.abs(r.t5k - best5k) < 1;
                      const diff = r.t5k - best5k;
                      return (
                        <tr key={i} style={{ borderTop:`1px solid ${C.border}`, background: isBest ? `${C.green}11` : "transparent" }}>
                          <td style={{ padding:"7px 10px", color: isBest ? C.green : C.light, fontWeight: isBest ? 700 : 400 }}>{r.date}</td>
                          <td style={{ padding:"7px 10px", color:C.muted }}>{(r.dist/1000).toFixed(2)} km</td>
                          <td style={{ padding:"7px 10px" }}>{fmt(r.time)}</td>
                          <td style={{ padding:"7px 10px", fontFamily:"monospace" }}>{fmtPace(r.pace)}</td>
                          <td style={{ padding:"7px 10px", fontWeight:700, color: isBest ? C.green : C.light }}>{fmt(r.t5k)}</td>
                          <td style={{ padding:"7px 10px", color: isBest ? C.green : diff < 60 ? C.yellow : C.muted }}>
                            {isBest ? "⭐ NAJLEPŠÍ" : `+${fmt(diff)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ══════════════════════════════════════
            TAB: PLÁN
        ══════════════════════════════════════ */}
        {tab === "plan" && (
          <>
            {/* Week selector */}
            <Card style={{ marginBottom:16 }}>
              <SectionTitle icon="📅" title="8-týždenný bežecký + silový plán" />
              <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
                {BASE_PLAN.map(p => (
                  <button key={p.w} onClick={() => setCurrentWeek(p.w)}
                    style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${currentWeek===p.w ? p.col : C.border}`, background: currentWeek===p.w ? `${p.col}22` : "transparent", color: currentWeek===p.w ? p.col : C.muted, cursor:"pointer", fontWeight: currentWeek===p.w ? 700 : 400, fontSize:12 }}>
                    T{p.w} · {p.phase}
                  </button>
                ))}
              </div>

              {/* Active week detail */}
              {(() => {
                const w = BASE_PLAN[currentWeek-1];
                return (
                  <div style={{ background:C.card2, borderRadius:12, padding:16, borderLeft:`3px solid ${w.col}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div>
                        <Tag label={w.phase} color={w.col} />
                        <span style={{ marginLeft:8, color:C.muted, fontSize:11 }}>{w.focus}</span>
                      </div>
                      <span style={{ fontSize:11, color:C.muted }}>Týždeň {w.w} / 8</span>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:10 }}>
                      {[
                        ["Pondelok", "Voľno — aktívna regenerácia", C.muted],
                        ["Utorok ⭐", w.tue, C.orange],
                        ["Streda 💪", w.wed, C.purple],
                        ["Štvrtok", "6 km Z2 easy (SF < 130)", C.blue],
                        ["Piatok", "Voľno", C.muted],
                        ["Sobota", w.sat, C.green],
                        ["Nedeľa", "Bicykel 15 km easy alebo chôdza", C.teal],
                      ].map(([day,act,col]) => (
                        <div key={day} style={{ background:C.card, borderRadius:8, padding:"10px 12px", borderTop:`1px solid ${col}` }}>
                          <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{day}</div>
                          <div style={{ fontSize:12, color: act==="Voľno" ? C.muted : C.light, fontWeight: act==="Voľno" ? 400 : 600 }}>{act}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Full plan table */}
            <Card>
              <SectionTitle icon="🗓" title="Kompletný plán — všetky týždne" />
              <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:400 }}>
                  <thead>
                    <tr style={{ background:C.card2, color:C.muted, fontSize:10, textTransform:"uppercase" }}>
                      {["T#","Fáza","Uto (kľúčový)","Str (sila)","Sob (dlhý)","Fokus"].map(h => (
                        <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {BASE_PLAN.map((p,i) => (
                      <tr key={i} onClick={() => setCurrentWeek(p.w)}
                        style={{ borderTop:`1px solid ${C.border}`, cursor:"pointer", background: currentWeek===p.w ? `${p.col}11` : "transparent" }}>
                        <td style={{ padding:"8px 10px", fontWeight:800, color:p.col }}>T{p.w}</td>
                        <td style={{ padding:"8px 10px" }}><Tag label={p.phase} color={p.col} /></td>
                        <td style={{ padding:"8px 10px", color:C.yellow }}>{p.tue}</td>
                        <td style={{ padding:"8px 10px", color:C.purple }}>{p.wed}</td>
                        <td style={{ padding:"8px 10px", color:C.green }}>{p.sat}</td>
                        <td style={{ padding:"8px 10px", color:C.muted, fontSize:10 }}>{p.focus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ══════════════════════════════════════
            TAB: VÝŽIVA
        ══════════════════════════════════════ */}
        {tab === "nutrition" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
              <KPI label="Proteín / deň" value={`${PROTEIN_DAILY} g`} sub="1,8 g/kg" color={C.teal} />
              <KPI label="Min. / deň" value="120 g" sub="1,6 g/kg" color={C.green} />
              <KPI label="Max. / deň" value="150 g" sub="2,0 g/kg" color={C.yellow} />
              <KPI label="Po tréningu" value={`${PROTEIN_POST} g`} sub="do 30 minút" color={C.orange} />
              <KPI label="Kcal beh 5 km" value={`${KCAL_5K}`} sub="pre 75 kg" color={C.red} />
              <KPI label="Kcal sila 30 min" value="300" sub="pre 75 kg" color={C.purple} />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <Card>
                <SectionTitle icon="🍽" title="Rozloženie proteínu cez deň" />
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    ["Raňajky 🌅","34 g","3 vajcia + 150 g tvarohu",C.blue],
                    ["Obed 🍗","40 g","200 g kuracích pŕs + strukoviny",C.teal],
                    ["Po tréningu ⚡","22 g","Srvátkový proteín / 200 g tvaroh",C.orange],
                    ["Večera 🐟","40 g","200 g lososa / hovädzieho",C.teal],
                    ["Desiata 🥜","20 g","Grécky jogurt + oriešky",C.purple],
                  ].map(([meal,g,ex,col]) => (
                    <div key={meal} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background: meal.includes("tréningu") ? `${C.orange}18` : C.card2, borderRadius:8, borderLeft:`2px solid ${col}` }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600 }}>{meal}</div>
                        <div style={{ fontSize:10, color:C.muted }}>{ex}</div>
                      </div>
                      <div style={{ fontWeight:800, color:col, fontSize:14 }}>{g}</div>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:`${C.green}18`, borderRadius:8, borderLeft:`2px solid ${C.green}` }}>
                    <span style={{ fontWeight:700, fontSize:12 }}>CELKOM</span>
                    <span style={{ fontWeight:900, color:C.green, fontSize:14 }}>156 g/deň</span>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionTitle icon="💡" title="Výživové pravidlá pre bežca 75 kg" />
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    ["⚡","Do 30 min po tréningu","22 g proteínu + banán alebo ryžové chlebíky. Toto okno je kritické.",C.orange],
                    ["💧","Hydratácia","500 ml vody 30 min pred behom. Pri behu 45+ min doplniž minerály.",C.blue],
                    ["🌙","Kazeín pred spaním","30 g tvarohu pred spaním. Svaly rastú počas 6–8h spánku.",C.purple],
                    ["🍌","Sacharidy po záťaži","40–60 g sacharidov po behu (375 kcal). Banán, ovsené vločky, ryža.",C.green],
                    ["💊","Voliteľné doplnky","Kreatín 3–5 g/deň, Vit. D3+K2, Horčík. Ideálne pre 42-ročného.",C.yellow],
                    ["⚖️","Kalorický príjem","Nezredukuj príjem pri aktívnom tréningu. Jedz dosť — spaľuješ 375+ kcal/beh.",C.teal],
                  ].map(([ico,ti,bo,col]) => (
                    <div key={ti} style={{ display:"flex", gap:10, padding:"8px 10px", background:C.card2, borderRadius:8 }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{ico}</span>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:col }}>{ti}</div>
                        <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{bo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            TAB: TELO (Zepp Life)
        ══════════════════════════════════════ */}
        {tab === "body" && (
          <>
            <Card style={{ marginBottom:16 }}>
              <SectionTitle icon="⚖️" title="Apple Health & Zepp Life dáta" />
              {healthLoading ? (
                <div style={{ textAlign:"center", padding:20, color:C.muted }}>⏳ Načítavam dáta z Apple Health...</div>
              ) : healthData ? (
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <Tag label="🍎 Live Apple Health dáta" color={C.green} />
                    <button onClick={fetchHealthData} style={{ background:C.orange, color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontWeight:700, fontSize:11, cursor:"pointer" }}>
                      🔄 Aktualizovať
                    </button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:12 }}>
                    {[
                      ["VO2 Max", healthData.vo2max ? `${healthData.vo2max} ml/kg/min` : "—", C.orange, "Apple Watch"],
                      ["Hmotnosť", healthData.weight ? `${healthData.weight} kg` : "—", C.blue, "Apple Health"],
                      ["HRV", healthData.hrv ? `${healthData.hrv} ms` : "—", C.green, "Apple Watch"],
                      ["Spánok", healthData.sleep || "—", C.purple, "Apple Watch"],
                    ].map(([l,v,col,src]) => (
                      <div key={l} style={{ background:C.card2, borderRadius:10, padding:"12px 14px", borderTop:`2px solid ${col}` }}>
                        <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>{l}</div>
                        <div style={{ fontSize:20, fontWeight:800, color:col, lineHeight:1.1 }}>{v}</div>
                        <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>📱 {src}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:`${C.green}18`, borderRadius:8, padding:"10px 14px", fontSize:11, color:C.muted }}>
                    💡 Spusti Shortcut <strong style={{color:C.light}}>"Sync Health Dashboard"</strong> na iPhone pre aktualizáciu dát.
                  </div>
                </div>
              ) : null}
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16, marginTop:8 }}>
              <SectionTitle icon="⚖️" title="Zepp Life — telesné zloženie" />
              {!zeppData ? (
                <div style={{ textAlign:"center", padding:"32px 20px" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📱</div>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Nahraj screenshot z Zepp Life alebo smart váhy</div>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>AI automaticky extrahuje: hmotnosť, % tuku, svalovú hmotu, vodu, BMI, viscerálny tuk</div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleZeppUpload} style={{ display:"none" }} />
                  <button onClick={() => fileRef.current?.click()} disabled={zeppLoading}
                    style={{ background:zeppLoading ? C.card2 : C.orange, color:"#fff", border:"none", borderRadius:10, padding:"12px 24px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                    {zeppLoading ? "⏳ Analyzujem screenshot…" : "📤 Nahrať screenshot z Zepp Life"}
                  </button>
                  <div style={{ marginTop:12, fontSize:10, color:C.muted }}>Podporované: iPhone / Android screenshot, Xiaomi váha, Zepp Life export</div>
                </div>
              ) : (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <Tag label={`Dáta z: ${zeppData.date || "nahraného screenshotu"}`} color={C.green} />
                    <button onClick={() => { setZeppData(null); if(fileRef.current) fileRef.current.value=""; }}
                      style={{ background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11 }}>
                      ✕ Odstrániť
                    </button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:16 }}>
                    {[
                      ["Body Score", zeppData.bodyScore ? `${zeppData.bodyScore} / 100` : "—", C.orange, null],
                      ["Tukové tkanivo", zeppData.fat ? `${zeppData.fat} %` : "—", zeppData.fat > 20 ? C.yellow : C.green, zeppData.fat > 20 ? "⚠️ Trochu vysoké pre bežca" : "✅ V norme"],
                      ["Svalová hmota", zeppData.muscle ? `${zeppData.muscle} kg` : "—", C.blue, "✅ Normal"],
                      ["Telesná voda", zeppData.water ? `${zeppData.water} %` : "—", zeppData.water < 55 ? C.red : C.teal, "⚠️ Pi viac!"],
                      ["BMI", zeppData.bmi ? zeppData.bmi : "—", C.green, "✅ Normal"],
                      ["Viscerálny tuk", zeppData.visceral ? zeppData.visceral : "—", zeppData.visceral >= 10 ? C.red : C.green, "⚠️ Cieľ < 10"],
                      ["Proteín %", zeppData.protein ? `${zeppData.protein} %` : "—", C.green, "✅ Great"],
                    ].map(([l,v,col,sub]) => (
                      <KPI key={l} label={l} value={v} sub={sub} color={col} />
                    ))}
                  </div>
                  <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[
                      ["💧 Telesná voda 53,6 % — PRIORITA","Cieľ je 55–65 %. Pi min. 2,5–3 l vody denne, najmä ráno a pred tréningom. Dehydratácia priamo zhoršuje výkon a regeneráciu.", C.blue],
                      ["🫃 Viscerálny tuk 12 — ZVÝŠENÝ","Cieľ je pod 10. Viscerálny tuk redukuje aeróbny tréning + zníženie cukrov/alkoholu. Tvoje behy ho znižujú — pokračuj!", C.red],
                      ["🦴 Kostná hmota 2,98 kg — nízka","Beh po tvrdom povrchu pomáha, ale pridaj silový tréning (drepy, výpony) a vápnik + Vit. D3. Cieľ: 3,2+ kg.", C.yellow],
                      ["💪 Svalová hmota 55,61 kg — v norme","Pre bežca ideálne. Silový tréning (stredy) ti pomôže dostať sa na 57+ kg, čo priamo zlepší bežeckú ekonomiku.", C.green],
                    ].map(([ti,bo,col]) => (
                      <div key={ti} style={{ background:C.card2, borderRadius:8, padding:"10px 12px", borderLeft:`3px solid ${col}` }}>
                        <div style={{ fontSize:11, fontWeight:700, color:col, marginBottom:4 }}>{ti}</div>
                        <div style={{ fontSize:10, color:C.muted, lineHeight:1.5 }}>{bo}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </Card>

            {!zeppData && (
              <Card>
                <SectionTitle icon="📊" title="Odporúčané hodnoty pre aktívneho bežca 75 kg" />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    ["% telesného tuku", "10–20 %", "Optimum pre bežca: 12–16 %", C.orange],
                    ["Svalová hmota", "35–45 kg", "Pre 75 kg muža, 42 rokov", C.blue],
                    ["Telesná voda", "55–65 %", "Dôležité pre výdrž a regeneráciu", C.teal],
                    ["BMI", "18,5–24,9", "Pre 75 kg optimum výška ~175–180 cm", C.green],
                    ["Viscerálny tuk", "< 10", "Zdravé srdce a hormóny", C.yellow],
                    ["Kostná hmota", "3,5–4,5 kg", "Beh zvyšuje hustotu kostí", C.purple],
                  ].map(([l,v,d,col]) => (
                    <div key={l} style={{ background:C.card2, borderRadius:8, padding:"10px 12px", borderLeft:`2px solid ${col}` }}>
                      <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:1 }}>{l}</div>
                      <div style={{ fontSize:16, fontWeight:800, color:col }}>{v}</div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{d}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB: AI TIPY
        ══════════════════════════════════════ */}
        {tab === "ai" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>AI tréner — personalizované tipy</div>
                <div style={{ fontSize:11, color:C.muted }}>Generované na základe Strava dát{zeppData ? " + Zepp Life telesného zloženia" : ""} · Týždeň T{currentWeek}</div>
              </div>
              <button onClick={() => generateAiInsights(zeppData)} disabled={aiLoading}
                style={{ background:C.orange, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                {aiLoading ? "⏳ Generujem…" : "🔄 Aktualizovať tipy"}
              </button>
            </div>

            {aiLoading ? (
              <Card style={{ textAlign:"center", padding:40 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🤖</div>
                <div style={{ color:C.muted }}>AI analyzuje tvoje tréningové dáta…</div>
              </Card>
            ) : aiTips ? (
              <>
                {/* Week goal highlight */}
                <div style={{ background:`linear-gradient(135deg, ${C.card} 0%, #1a1520 100%)`, borderRadius:14, padding:20, marginBottom:16, border:`1px solid ${C.orange}44` }}>
                  <div style={{ fontSize:10, color:C.orange, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>🎯 Cieľ tento týždeň (T{currentWeek})</div>
                  <div style={{ fontSize:16, fontWeight:700 }}>{aiTips.nextRunGoal}</div>
                  <div style={{ marginTop:8, fontSize:13, color:C.muted, fontStyle:"italic" }}>💬 {aiTips.motivation}</div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                  {[
                    ["🏃 Tréningový tip", aiTips.weekTip, C.orange],
                    ["🥗 Výživa", aiTips.nutritionTip, C.teal],
                    ["😴 Zotavenie", aiTips.recoveryTip, C.blue],
                    ["💪 Silový fokus", aiTips.strengthFocus, C.purple],
                  ].map(([title, tip, col]) => (
                    <Card key={title} style={{ borderLeft:`3px solid ${col}` }}>
                      <div style={{ fontSize:11, fontWeight:700, color:col, marginBottom:6 }}>{title}</div>
                      <div style={{ fontSize:12, color:C.light, lineHeight:1.6 }}>{tip}</div>
                    </Card>
                  ))}
                </div>

                <Card style={{ borderLeft:`3px solid ${C.yellow}` }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.yellow, marginBottom:6 }}>⚠️ Sleduj toto</div>
                  <div style={{ fontSize:12, color:C.light }}>{aiTips.warningSign}</div>
                </Card>

                {zeppData && (
                  <div style={{ marginTop:12, background:`${C.teal}18`, borderRadius:10, padding:"10px 14px", border:`1px solid ${C.teal}44` }}>
                    <div style={{ fontSize:11, color:C.teal, fontWeight:700 }}>⚖️ Zepp Life dáta zahrnuté v analýze</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                      Hmotnosť {zeppData.weight} kg · Tuk {zeppData.fat}% · Svalová hmota {zeppData.muscle} kg
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card style={{ textAlign:"center", padding:30 }}>
                <div style={{ color:C.muted }}>Klikni "Aktualizovať tipy" pre AI analýzu</div>
              </Card>
            )}
          </>
        )}
      </div>

        {/* ══════════════════════════════════════
            TAB: HISTÓRIA
        ══════════════════════════════════════ */}
        {tab === "history" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>Históra zdravotných metrík</div>
                <div style={{ fontSize:11, color:C.muted }}>Denné záznamy z Apple Health · {historyData.length} dní</div>
              </div>
              <button onClick={fetchHealthData}
                style={{ background:C.orange, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                🔄 Aktualizovať
              </button>
            </div>

            {historyData.length === 0 ? (
              <Card style={{ textAlign:"center", padding:40 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
                <div style={{ color:C.muted }}>Žiadne historické dáta. Spusti Shortcut každý deň pre zber dát.</div>
              </Card>
            ) : (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:12, marginBottom:12 }}>
                  <Card>
                    <SectionTitle icon="❤️" title="HRV trend (ms)" />
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={historyData}>
                        <defs>
                          <linearGradient id="hrv_gr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fill:C.muted, fontSize:9 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fill:C.muted, fontSize:10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={40} stroke={C.yellow} strokeDasharray="4 4" label={{ value:"Optimum", fill:C.yellow, fontSize:9 }} />
                        <Area type="monotone" dataKey="hrv" stroke={C.green} strokeWidth={2} fill="url(#hrv_gr)" name="HRV (ms)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card>
                    <SectionTitle icon="⚖️" title="Hmotnosť trend (kg)" />
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={historyData}>
                        <defs>
                          <linearGradient id="weight_gr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fill:C.muted, fontSize:9 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fill:C.muted, fontSize:10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="weight" stroke={C.blue} strokeWidth={2} fill="url(#weight_gr)" name="Hmotnosť (kg)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card>
                    <SectionTitle icon="🫁" title="VO2 Max trend" />
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={historyData}>
                        <defs>
                          <linearGradient id="vo2_gr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.orange} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fill:C.muted, fontSize:9 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fill:C.muted, fontSize:10 }} domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={47} stroke={C.orange} strokeDasharray="4 4" label={{ value:"Aktuálne", fill:C.orange, fontSize:9 }} />
                        <Area type="monotone" dataKey="vo2max" stroke={C.orange} strokeWidth={2} fill="url(#vo2_gr)" name="VO2 Max" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card>
                    <SectionTitle icon="👣" title="Kroky trend" />
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fill:C.muted, fontSize:9 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fill:C.muted, fontSize:10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="steps" fill={C.purple} radius={[3,3,0,0]} name="Kroky" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* History table */}
                <Card>
                  <SectionTitle icon="📋" title="Denné záznamy" />
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                      <thead>
                        <tr style={{ background:C.card2, color:C.muted, fontSize:10, textTransform:"uppercase" }}>
                          {["Dátum","VO2 Max","Hmotnosť","HRV","Spánok"].map(h => (
                            <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...historyData].reverse().map((d,i) => (
                          <tr key={i} style={{ borderTop:`1px solid ${C.border}`, background: i%2 ? C.card2 : "transparent" }}>
                            <td style={{ padding:"7px 10px", color:C.orange, fontWeight:600 }}>{d.date}</td>
                            <td style={{ padding:"7px 10px", color:C.orange }}>{d.vo2max || "—"}</td>
                            <td style={{ padding:"7px 10px" }}>{d.weight ? `${d.weight} kg` : "—"}</td>
                            <td style={{ padding:"7px 10px", color: d.hrv > 40 ? C.green : d.hrv > 25 ? C.yellow : C.red }}>{d.hrv ? `${d.hrv} ms` : "—"}</td>
                            <td style={{ padding:"7px 10px", color:C.teal }}>{d.sleep || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </>
        )}

      {/* ── FOOTER ── */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 20px", marginTop:24 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:10, color:C.muted }}>Strava Fitness Dashboard · Kornel Michalic · Dáta zo Strava API</span>
          <div style={{ display:"flex", gap:12 }}>
            <span style={{ fontSize:10, color:C.muted }}>Najlepší 5K: <strong style={{ color:C.green }}>{fmt(best5k)}</strong></span>
            <span style={{ fontSize:10, color:C.muted }}>Cieľ: <strong style={{ color:C.orange }}>{fmt(target5k)}</strong></span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${C.dark}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
        @media (max-width: 600px) {
          table { font-size: 10px !important; }
          td, th { padding: 5px 6px !important; }
        }
        div::-webkit-scrollbar { display: none; }
        body { overflow-x: hidden; }
      `}</style>
    </div>
  );
}
