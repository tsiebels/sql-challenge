import { useState, useEffect, useRef } from "react";

const CHALLENGES = [
  {
    id: 1, label: "Part 1", title: "Query Optimization", timeEstimate: "~7 min",
    prompt: "The following Spark SQL query runs against a large production data warehouse and is timing out. Identify all performance issues and rewrite it as an optimized query.",
    codeBlock: `SELECT *
FROM orders o, customers c, products p
WHERE o.customer_id = c.id
AND o.product_id = p.id
AND YEAR(o.order_date) = 2023
ORDER BY o.order_date DESC`,
    context: ["orders — ~2B rows, partitioned by order_date (DATE)", "customers — ~500K rows (lookup table)", "products — ~10K rows (lookup table)"],
    placeholder: "-- Write your optimized Spark SQL here...",
    inputType: "code"
  },
  {
    id: 2, label: "Part 2", title: "Execution Plan Analysis", timeEstimate: "~5 min",
    prompt: "A Spark job is taking 45 minutes to complete. Review the EXPLAIN output below. Identify the core bottleneck and explain specifically how you would resolve it. A written explanation is sufficient — no code required.",
    codeBlock: `== Physical Plan ==
AdaptiveSparkPlan (isFinalPlan=false)
+- SortMergeJoin [customer_id#12], [customer_id#89], Inner
   :- Sort [customer_id#12 ASC]
   :  +- Exchange hashpartitioning(customer_id#12, 200)
   :     +- [Shuffle: 14.2 GB] Scan parquet orders (200 partitions)
   +- Sort [customer_id#89 ASC]
      +- Exchange hashpartitioning(customer_id#89, 200)
         +- [Shuffle: 42 MB] Scan parquet customers (1 partition)`,
    context: null,
    placeholder: "Describe the bottleneck and your recommended fix...",
    inputType: "text"
  },
  {
    id: 3, label: "Part 3", title: "Write From Scratch", timeEstimate: "~8 min",
    prompt: "Write a production-quality, optimized Spark SQL query for the business requirement below. Apply all relevant Spark-specific performance considerations.",
    codeBlock: null,
    context: [
      "Requirement: Return each store's daily total revenue AND 7-day rolling average revenue for Q1 2024 (Jan 1 – Mar 31) only.",
      "sales — sale_date DATE [partitioned], store_id STRING, revenue DECIMAL(12,2)",
      "store_lookup — ~500 rows: store_id STRING, region STRING, store_name STRING"
    ],
    placeholder: "-- Write your optimized Spark SQL here...",
    inputType: "code"
  }
];

const buildEvalDoc = (name, email, elapsed, answers) => {
  const fmt = s => `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2,"0")}s`;
  return `# BI Engineering Evaluation — Candidate Submission
Submitted: ${new Date().toLocaleString()} | Time Elapsed: ${fmt(elapsed)}
Candidate: ${name} | Email: ${email}

---

## Part 1 — Query Optimization

### Challenge
Table context:
- orders — ~2B rows, partitioned by order_date (DATE)
- customers — ~500K rows (lookup table)
- products — ~10K rows (lookup table)

Original query:
\`\`\`sql
SELECT *
FROM orders o, customers c, products p
WHERE o.customer_id = c.id
AND o.product_id = p.id
AND YEAR(o.order_date) = 2023
ORDER BY o.order_date DESC
\`\`\`

### Candidate Answer
\`\`\`sql
${answers[0] || "[No answer provided]"}
\`\`\`

---

## Part 2 — Execution Plan Analysis

### Challenge
\`\`\`
== Physical Plan ==
AdaptiveSparkPlan (isFinalPlan=false)
+- SortMergeJoin [customer_id#12], [customer_id#89], Inner
   :- Sort [customer_id#12 ASC]
   :  +- Exchange hashpartitioning(customer_id#12, 200)
   :     +- [Shuffle: 14.2 GB] Scan parquet orders (200 partitions)
   +- Sort [customer_id#89 ASC]
      +- Exchange hashpartitioning(customer_id#89, 200)
         +- [Shuffle: 42 MB] Scan parquet customers (1 partition)
\`\`\`

### Candidate Answer
${answers[1] || "[No answer provided]"}

---

## Part 3 — Write From Scratch

### Challenge
Table context:
- Requirement: Daily total revenue + 7-day rolling average per store, Q1 2024 only
- sales — sale_date DATE [partitioned], store_id STRING, revenue DECIMAL(12,2)
- store_lookup — ~500 rows: store_id STRING, region STRING, store_name STRING

### Candidate Answer
\`\`\`sql
${answers[2] || "[No answer provided]"}
\`\`\`

---
*Paste this submission into the BI Engineering Evaluator project to generate a scored rubric.*`;
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
  :root {
    --bg:#07090f;--surface:#0d1221;--surface2:#111827;
    --border:#1c2a3e;--border2:#243044;
    --cyan:#22d3ee;--cyan-dim:#0891b2;--amber:#f59e0b;
    --green:#10b981;--red:#ef4444;--yellow:#eab308;
    --text:#e2e8f0;--muted:#64748b;--muted2:#94a3b8;
    --code-bg:#040608;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;}
  .mono{font-family:'JetBrains Mono',monospace;}
  .syne{font-family:'Syne',sans-serif;}

  .btn-primary{
    background:var(--cyan);color:#07090f;font-family:'Syne',sans-serif;
    font-weight:700;font-size:14px;padding:12px 28px;border:none;
    cursor:pointer;letter-spacing:.05em;text-transform:uppercase;
    transition:all .15s;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);
  }
  .btn-primary:hover{background:#67e8f9;transform:translateY(-1px);}
  .btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none;}

  .btn-ghost{
    background:transparent;color:var(--muted2);font-family:'DM Sans',sans-serif;
    font-size:14px;padding:10px 20px;border:1px solid var(--border2);
    cursor:pointer;transition:all .15s;
  }
  .btn-ghost:hover{color:var(--text);border-color:var(--cyan-dim);}
  .btn-ghost.sm{font-size:12px;padding:8px 14px;}

  .card{background:var(--surface);border:1px solid var(--border);padding:28px;}
  .card-sm{padding:18px 22px;}

  textarea{
    width:100%;background:var(--code-bg);color:#7dd3fc;
    font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.7;
    border:1px solid var(--border);padding:18px;resize:vertical;min-height:180px;
    outline:none;transition:border-color .15s;
  }
  textarea:focus{border-color:var(--cyan-dim);}
  textarea.text-input{color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;min-height:140px;}

  input[type="text"]{
    width:100%;background:var(--surface2);color:var(--text);
    font-family:'DM Sans',sans-serif;font-size:15px;
    border:1px solid var(--border2);padding:12px 16px;outline:none;
    transition:border-color .15s;
  }
  input[type="text"]:focus{border-color:var(--cyan);}

  .tab-btn{
    padding:10px 0;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;
    background:none;border:none;color:var(--muted);cursor:pointer;
    border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;
  }
  .tab-btn.active{color:var(--cyan);border-bottom-color:var(--cyan);}
  .tab-btn.done{color:var(--green);}
  .tab-btn.done.active{color:var(--cyan);border-bottom-color:var(--cyan);}

  .tag{
    display:inline-block;font-size:11px;font-family:'Syne',sans-serif;
    font-weight:600;letter-spacing:.08em;text-transform:uppercase;
    padding:3px 10px;border:1px solid;
  }
  .tag-cyan{color:var(--cyan);border-color:var(--cyan);background:rgba(34,211,238,.07);}
  .tag-amber{color:var(--amber);border-color:var(--amber);background:rgba(245,158,11,.07);}
  .tag-green{color:var(--green);border-color:var(--green);background:rgba(16,185,129,.08);}

  .fade-in{animation:fadeIn .4s ease-out;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  .grid-dots{background-image:radial-gradient(circle,#1c2a3e 1px,transparent 1px);background-size:28px 28px;}
  .glow-cyan{text-shadow:0 0 30px rgba(34,211,238,.4);}

  .eval-doc{
    background:var(--code-bg);border:1px solid var(--border);
    padding:20px;font-family:'JetBrains Mono',monospace;
    font-size:11.5px;line-height:1.75;color:var(--muted2);
    white-space:pre-wrap;max-height:340px;overflow-y:auto;
    word-break:break-word;
  }
  .eval-doc::-webkit-scrollbar{width:5px;}
  .eval-doc::-webkit-scrollbar-track{background:var(--surface2);}
  .eval-doc::-webkit-scrollbar-thumb{background:var(--border2);}

  .hm-panel{
    border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.04);
    padding:24px;margin-top:56px;
  }
  .hm-header{
    display:flex;align-items:center;gap:10px;
    padding-bottom:16px;margin-bottom:20px;
    border-bottom:1px solid rgba(245,158,11,.2);
  }
  .lock-icon{
    width:32px;height:32px;border:1px solid rgba(245,158,11,.4);
    display:flex;align-items:center;justify-content:center;
    font-size:14px;flex-shrink:0;
  }
`;

export default function BIEval() {
  const [phase, setPhase]   = useState("intro");
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [answers, setAnswers]     = useState({ 0:"", 1:"", 2:"" });
  const [elapsed, setElapsed]     = useState(0);
  const [evalDoc, setEvalDoc]     = useState("");
  const [copied, setCopied]       = useState(false);
  const [showDoc, setShowDoc]     = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase === "challenge") timerRef.current = setInterval(() => setElapsed(e => e+1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const fmt   = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
  const done  = i => answers[i]?.trim().length > 10;
  const allDone = [0,1,2].every(done);

  const submit = () => {
    clearInterval(timerRef.current);
    setEvalDoc(buildEvalDoc(name, email, elapsed, answers));
    setPhase("submitted");
  };

  const copyDoc = () => {
    navigator.clipboard.writeText(evalDoc).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:"100vh", background:"var(--bg)" }}>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="grid-dots fade-in" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
            <div style={{ maxWidth:560, width:"100%" }}>
              <div style={{ marginBottom:12 }}><span className="tag tag-cyan">BI Engineering</span></div>
              <h1 className="syne glow-cyan" style={{ fontSize:"clamp(28px,5vw,42px)", fontWeight:800, lineHeight:1.1, marginBottom:8 }}>
                SQL Optimization<br /><span style={{ color:"var(--cyan)" }}>Evaluation</span>
              </h1>
              <p style={{ color:"var(--muted2)", fontSize:15, marginBottom:36, lineHeight:1.6 }}>
                Three Spark SQL challenges assessing query optimization, execution plan analysis, and production SQL craft. Budget approximately 20 minutes.
              </p>
              <div style={{ display:"grid", gap:12, marginBottom:36 }}>
                {CHALLENGES.map((c,i) => (
                  <div key={i} className="card card-sm" style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ width:36, height:36, border:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span className="mono" style={{ fontSize:13, color:"var(--cyan)" }}>0{c.id}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{c.title}</div>
                      <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{c.timeEstimate}</div>
                    </div>
                    <span className="tag" style={{ color:"var(--muted)", borderColor:"var(--border2)", fontSize:10 }}>{c.inputType==="code"?"SQL":"Written"}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ marginBottom:24 }}>
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--muted)", marginBottom:8 }}>Full Name</label>
                  <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--muted)", marginBottom:8 }}>Email Address</label>
                  <input type="text" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
              </div>
              <button className="btn-primary" style={{ width:"100%" }} disabled={!name.trim()||!email.trim()} onClick={()=>setPhase("challenge")}>
                Begin Evaluation →
              </button>
            </div>
          </div>
        )}

        {/* ── CHALLENGE ── */}
        {phase === "challenge" && (
          <div className="fade-in" style={{ maxWidth:820, margin:"0 auto", padding:"32px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontSize:12, color:"var(--muted)", marginBottom:4 }}>Candidate: <span style={{ color:"var(--muted2)" }}>{name}</span></div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:done(i)?"var(--green)":"var(--border2)", transition:"background .3s" }} />
                  ))}
                  <span style={{ fontSize:12, color:"var(--muted)", marginLeft:4 }}>{[0,1,2].filter(done).length}/3 complete</span>
                </div>
              </div>
              <div className="card card-sm" style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 18px" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:elapsed>1100?"var(--red)":"var(--green)" }} />
                <span className="mono" style={{ fontSize:18, fontWeight:500, color:elapsed>1100?"var(--amber)":"var(--text)" }}>{fmt(elapsed)}</span>
              </div>
            </div>

            <div style={{ display:"flex", borderBottom:"1px solid var(--border)", marginBottom:28 }}>
              {CHALLENGES.map((c,i) => (
                <button key={i} className={`tab-btn ${activeTab===i?"active":""} ${done(i)?"done":""}`}
                  onClick={()=>setActiveTab(i)}
                  style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  {done(i) && <span style={{ color:"var(--green)", fontSize:11 }}>✓</span>}
                  {c.label} — {c.title}
                </button>
              ))}
            </div>

            {CHALLENGES.map((c,i) => activeTab===i && (
              <div key={i} className="fade-in">
                <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                  <span className="tag tag-amber">{c.timeEstimate}</span>
                  {c.inputType==="code"
                    ? <span className="tag tag-cyan">Spark SQL</span>
                    : <span className="tag" style={{ color:"var(--muted2)", borderColor:"var(--border2)" }}>Written Response</span>}
                </div>
                <div className="card" style={{ marginBottom:20 }}>
                  <p style={{ fontSize:14, lineHeight:1.7, color:"var(--muted2)" }}>{c.prompt}</p>
                </div>
                {c.context && (
                  <div style={{ background:"rgba(34,211,238,.05)", border:"1px solid rgba(34,211,238,.15)", padding:"14px 18px", marginBottom:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"var(--cyan)", marginBottom:10 }}>Table Context</div>
                    {c.context.map((row,j) => (
                      <div key={j} className="mono" style={{ fontSize:12, color:"var(--muted2)", marginBottom:4, lineHeight:1.5 }}>
                        <span style={{ color:"var(--muted)", marginRight:8 }}>›</span>{row}
                      </div>
                    ))}
                  </div>
                )}
                {c.codeBlock && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"var(--muted)", marginBottom:8 }}>
                      {i===1?"EXPLAIN Output":"Query to Optimize"}
                    </div>
                    <pre className="mono" style={{ background:"var(--code-bg)", border:"1px solid var(--border)", padding:"18px", fontSize:12.5, lineHeight:1.7, color:"#7dd3fc", overflowX:"auto", whiteSpace:"pre-wrap" }}>
                      {c.codeBlock}
                    </pre>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"var(--muted)", marginBottom:8 }}>Your Answer</div>
                  <textarea
                    className={c.inputType==="text"?"text-input":""}
                    value={answers[i]}
                    onChange={e=>setAnswers(a=>({...a,[i]:e.target.value}))}
                    placeholder={c.placeholder}
                    style={{ minHeight:i===2?220:180 }}
                  />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20, flexWrap:"wrap", gap:12 }}>
                  <div style={{ display:"flex", gap:10 }}>
                    {i>0 && <button className="btn-ghost" onClick={()=>setActiveTab(i-1)}>← Previous</button>}
                    {i<2 && <button className="btn-primary" onClick={()=>setActiveTab(i+1)}>Next Part →</button>}
                  </div>
                  {i===2 && (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                      {!allDone && <div style={{ fontSize:12, color:"var(--amber)" }}>Complete all 3 parts to submit</div>}
                      <button className="btn-primary" disabled={!allDone} onClick={submit}>Submit Evaluation →</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SUBMITTED ── */}
        {phase === "submitted" && (
          <div className="fade-in" style={{ maxWidth:640, margin:"0 auto", padding:"60px 20px" }}>

            {/* Candidate thank-you */}
            <div style={{ textAlign:"center", paddingBottom:48, borderBottom:"1px solid var(--border)" }}>
              <div style={{ width:64, height:64, border:"2px solid var(--green)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 28px", fontSize:26, color:"var(--green)" }}>✓</div>
              <h2 className="syne" style={{ fontSize:28, fontWeight:800, marginBottom:14 }}>Evaluation Submitted</h2>
              <p style={{ color:"var(--muted2)", fontSize:15, lineHeight:1.7, marginBottom:10 }}>
                Thank you, <strong style={{ color:"var(--text)" }}>{name}</strong>. Your responses have been received and will be reviewed by our team.
              </p>
              <p style={{ color:"var(--muted)", fontSize:14 }}>
                We'll follow up at <span style={{ color:"var(--muted2)" }}>{email}</span> with next steps.
              </p>
            </div>

            {/* Hiring manager panel */}
            <div className="hm-panel">
              <div className="hm-header">
                <div className="lock-icon">🔒</div>
                <div>
                  <div className="syne" style={{ fontSize:13, fontWeight:700, color:"var(--amber)", letterSpacing:".06em", textTransform:"uppercase" }}>Hiring Manager</div>
                  <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>Copy the evaluation document and paste into Claude with your scoring skill</div>
                </div>
              </div>

              {/* Candidate summary */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { label:"Candidate", value:name },
                  { label:"Email", value:email },
                  { label:"Time", value:`${Math.floor(elapsed/60)}m ${(elapsed%60).toString().padStart(2,"0")}s` }
                ].map((item,i) => (
                  <div key={i} style={{ background:"var(--surface2)", border:"1px solid var(--border)", padding:"12px 14px" }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"var(--muted)", marginBottom:4 }}>{item.label}</div>
                    <div style={{ fontSize:13, color:"var(--text)", wordBreak:"break-all" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Document actions */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:showDoc?14:0, flexWrap:"wrap", gap:10 }}>
                <div style={{ fontSize:13, color:"var(--muted2)" }}>
                  Contains all 3 answers + full rubric — ready for Claude skill input
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button className="btn-ghost sm" onClick={()=>setShowDoc(v=>!v)}>{showDoc?"Hide Preview":"Preview"}</button>
                  <button className="btn-primary" style={{ fontSize:12, padding:"10px 20px" }} onClick={copyDoc}>
                    {copied?"✓ Copied!":"Copy Document"}
                  </button>
                </div>
              </div>

              {showDoc && (
                <div className="eval-doc fade-in">{evalDoc}</div>
              )}

              <div style={{ marginTop:16, background:"var(--surface2)", border:"1px solid var(--border)", padding:"12px 16px" }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"var(--muted)", marginBottom:6 }}>Suggested Prompt</div>
                <div className="mono" style={{ fontSize:12, color:"var(--cyan)", lineHeight:1.6 }}>
                  "Evaluate this BI Engineering candidate submission using the scoring rubric provided. Return a structured score for each part, an overall grade, and 2–3 key observations."
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </>
  );
}
