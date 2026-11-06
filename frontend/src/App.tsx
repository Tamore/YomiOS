import { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Target, CheckCircle2, Circle, 
  FileText, Download, Bot, Play, Trash2, Plus, 
  Cpu, Battery, Mic, Send, BookOpen
} from 'lucide-react';

interface Domain {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface Project {
  id: string;
  domain_id: string;
  domain_name?: string;
  title: string;
  status: string;
  progress: number;
  target_date?: string;
}

interface Task {
  id: string;
  domain_id?: string;
  project_id?: string;
  domain_name?: string;
  project_title?: string;
  title: string;
  priority: string;
  is_completed: number;
  due_date?: string;
}

interface Subagent {
  id: string;
  name: string;
  role: string;
  prompt_template: string;
  tools_bound: string[];
  schedule: string;
  status: string;
  last_run?: string;
  last_output?: string;
}

interface Telemetry {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  battery_percent: number;
  is_charging: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'yomi';
  text: string;
  data?: any;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'academic' | 'roadmaps' | 'subagents'>('chat');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subagents, setSubagents] = useState<Subagent[]>([]);
  const [telemetry, setTelemetry] = useState<Telemetry>({
    cpu_percent: 18,
    ram_percent: 42,
    ram_used_gb: 6.8,
    ram_total_gb: 16.0,
    battery_percent: 100,
    is_charging: true
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'yomi',
      text: "System online. Bklit Minimalist HUD initialized. What are we building or researching today, Nirmiti?",
      timestamp: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Sub-agent spawner state
  const [newAgentPrompt, setNewAgentPrompt] = useState("");
  const [isSpawningAgent, setIsSpawningAgent] = useState(false);

  // Academic research query state
  const [researchQuery, setResearchQuery] = useState("");
  const [isSearchingPaper, setIsSearchingPaper] = useState(false);

  const [activeDomainFilter, setActiveDomainFilter] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialState();

    const ws = new WebSocket("ws://127.0.0.1:8765/ws");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'INITIAL_STATE' || data.type === 'STATE_UPDATE') {
          updateStateFromPayload(data.payload);
        } else if (data.type === 'CHAT_REPLY') {
          const reply = data.payload;
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'yomi',
              text: reply.reply,
              data: reply.data,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };
    return () => ws.close();
  }, []);

  const fetchInitialState = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8765/api/state");
      if (res.ok) {
        const data = await res.json();
        updateStateFromPayload(data);
      }
    } catch (e) {
      console.log("Backend offline or booting...", e);
    }
  };

  const updateStateFromPayload = (payload: any) => {
    if (payload.domains) setDomains(payload.domains);
    if (payload.projects) setProjects(payload.projects);
    if (payload.tasks) setTasks(payload.tasks);
    if (payload.subagents) setSubagents(payload.subagents);
    if (payload.telemetry) setTelemetry(payload.telemetry);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setInput("");
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch("http://127.0.0.1:8765/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const result = await res.json();
        const yomiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'yomi',
          text: result.reply,
          data: result.data,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, yomiMsg]);
        fetchInitialState();
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'yomi',
          text: "Command dispatched. Check your active matrix.",
          timestamp: "Now"
        }
      ]);
    } finally {
      setIsProcessing(false);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await fetch(`http://127.0.0.1:8765/api/tasks/${taskId}/toggle`, { method: "POST" });
      fetchInitialState();
    } catch (e) {
      console.error("Toggle task error:", e);
    }
  };

  const handleRunSubagent = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:8765/api/subagents/${id}/run`, { method: "POST" });
      fetchInitialState();
    } catch (e) {
      console.error("Run subagent error:", e);
    }
  };

  const handleDeleteSubagent = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:8765/api/subagents/${id}`, { method: "DELETE" });
      fetchInitialState();
    } catch (e) {
      console.error("Delete subagent error:", e);
    }
  };

  const handleSpawnSubagent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentPrompt.trim() || isSpawningAgent) return;
    setIsSpawningAgent(true);
    try {
      await fetch("http://127.0.0.1:8765/api/subagents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: newAgentPrompt })
      });
      setNewAgentPrompt("");
      fetchInitialState();
    } catch (e) {
      console.error("Spawn subagent error:", e);
    } finally {
      setIsSpawningAgent(false);
    }
  };

  const handleResearchSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchQuery.trim() || isSearchingPaper) return;
    setIsSearchingPaper(true);
    await handleSendMessage(`research ${researchQuery}`);
    setResearchQuery("");
    setIsSearchingPaper(false);
    setActiveTab('chat');
  };

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser. Try Google Chrome.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    if (!isListening) {
      recognition.start();
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSendMessage(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  const quickPrompts = [
    { label: "🔬 Research Kenji Tei", prompt: "research self-adaptive systems by Kenji Tei" },
    { label: "🛡️ Fault Tolerance Brief", prompt: "research distributed fault tolerance" },
    { label: "⛩️ Waseda Roadmap", prompt: "Start a roadmap for Waseda IPS Application" },
    { label: "⚡ System Telemetry", prompt: "System telemetry" }
  ];

  const filteredTasks = activeDomainFilter 
    ? tasks.filter(t => t.domain_id === activeDomainFilter) 
    : tasks;

  return (
    <div className="bklit-shell">
      
      {/* 1. BKLIT ULTRA-SLIM TOP NAVIGATION (h-14) */}
      <header className="bklit-header">
        <div className="bklit-header-inner">
          
          <div className="bklit-brand" onClick={() => setActiveTab('chat')}>
            <div className="bklit-logo-badge">⚡</div>
            <span className="bklit-logo-title">YOMI OS</span>
            <span className="bklit-logo-ver">v2.0-bklit</span>
          </div>

          {/* Segmented Navigation Tabs */}
          <nav className="bklit-nav-tabs">
            <button 
              onClick={() => setActiveTab('chat')} 
              className={`bklit-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            >
              <Terminal size={14} /> Intelligence HUD
            </button>
            <button 
              onClick={() => setActiveTab('academic')} 
              className={`bklit-tab-btn ${activeTab === 'academic' ? 'active' : ''}`}
            >
              <BookOpen size={14} /> Academic Radar
            </button>
            <button 
              onClick={() => setActiveTab('roadmaps')} 
              className={`bklit-tab-btn ${activeTab === 'roadmaps' ? 'active' : ''}`}
            >
              <Target size={14} /> Roadmaps & Matrix
            </button>
            <button 
              onClick={() => setActiveTab('subagents')} 
              className={`bklit-tab-btn ${activeTab === 'subagents' ? 'active' : ''}`}
            >
              <Bot size={14} /> Sub-Agents
            </button>
          </nav>

          {/* Header Telemetry Pills */}
          <div className="bklit-header-telemetry">
            <div className="telemetry-mini-pill">
              <div className="telemetry-dot" />
              <span>CPU {telemetry.cpu_percent}%</span>
            </div>
            <div className="telemetry-mini-pill">
              <span>RAM {telemetry.ram_percent}%</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. MAIN BKLIT WORKSPACE */}
      <main className="bklit-main">

        {/* =========================================================
            TAB 1: INTELLIGENCE HUD (CHAT & HERO COCKPIT)
            ========================================================= */}
        {activeTab === 'chat' && (
          <div className="chat-container">
            
            {/* Top KPI Telemetry Banner */}
            <div className="bklit-kpi-grid">
              <div className="bklit-kpi-card">
                <div className="bklit-kpi-label">
                  <span>CPU UTILIZATION</span>
                  <Cpu size={14} color="#a1a1aa" />
                </div>
                <div className="bklit-kpi-val">
                  {telemetry.cpu_percent}%
                  <span className="bklit-badge green">Nominal</span>
                </div>
              </div>

              <div className="bklit-kpi-card">
                <div className="bklit-kpi-label">
                  <span>MEMORY USAGE</span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{telemetry.ram_used_gb} / {telemetry.ram_total_gb} GB</span>
                </div>
                <div className="bklit-kpi-val">
                  {telemetry.ram_percent}%
                  <span className="bklit-badge blue">Active</span>
                </div>
              </div>

              <div className="bklit-kpi-card">
                <div className="bklit-kpi-label">
                  <span>BATTERY STATUS</span>
                  <Battery size={14} color="#a1a1aa" />
                </div>
                <div className="bklit-kpi-val">
                  {telemetry.battery_percent}%
                  <span className="bklit-badge">Balanced</span>
                </div>
              </div>

              <div className="bklit-kpi-card">
                <div className="bklit-kpi-label">
                  <span>AUTONOMOUS WORKERS</span>
                  <Bot size={14} color="#a1a1aa" />
                </div>
                <div className="bklit-kpi-val">
                  {subagents.length} Nodes
                  <span className="bklit-badge green">Active</span>
                </div>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="chat-thread-box">
              {messages.map((m) => (
                <div key={m.id} className={`chat-msg ${m.sender}`}>
                  <div className="chat-bubble">
                    <div>{m.text}</div>

                    {/* PDF Brief Card if generated */}
                    {m.data && (m.data.pdf_filename || m.data.filename) && (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#09090b', border: '1px solid var(--border-subtle)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={18} color="#ffffff" />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                              {m.data.pdf_filename || m.data.filename}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              Academic Synthesis & BibTeX PDF
                            </div>
                          </div>
                        </div>
                        <a 
                          href={`http://127.0.0.1:8765/api/exports/${m.data.pdf_filename || m.data.filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="action-btn primary"
                        >
                          <Download size={12} /> Open PDF
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="chat-meta">{m.timestamp}</span>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Action Chips */}
            <div className="quick-chips-row">
              {quickPrompts.map((q, idx) => (
                <button key={idx} onClick={() => handleSendMessage(q.prompt)} className="quick-chip">
                  {q.label}
                </button>
              ))}
            </div>

            {/* Floating Bklit Input Capsule */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="bklit-input-capsule">
              <button 
                type="button" 
                onClick={handleVoiceToggle} 
                className="capsule-btn"
                style={{ color: isListening ? '#ef4444' : undefined }}
                title="Voice Command"
              >
                <Mic size={18} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening to your voice..." : "Ask Yomi, research a topic, or spawn an agent..."}
                className="bklit-input-field"
                disabled={isProcessing}
              />

              <button 
                type="submit" 
                disabled={!input.trim() || isProcessing}
                className="capsule-submit-btn"
              >
                <Send size={14} />
              </button>
            </form>

          </div>
        )}

        {/* =========================================================
            TAB 2: ACADEMIC RADAR (LITERATURE & CITATION ENGINE)
            ========================================================= */}
        {activeTab === 'academic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Search Bar */}
            <div className="bklit-card" style={{ padding: '18px 24px' }}>
              <form onSubmit={handleResearchSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  placeholder="Enter research topic or professor (e.g. 'self-adaptive systems Kenji Tei' or 'distributed fault tolerance')..."
                  className="bklit-input-field"
                  style={{ background: 'var(--bg-muted)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                />
                <button type="submit" disabled={isSearchingPaper || !researchQuery.trim()} className="action-btn primary" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                  {isSearchingPaper ? "Synthesizing..." : "Synthesize Paper Brief"}
                </button>
              </form>
            </div>

            {/* Generated Briefs & Recent Research Cards */}
            <div className="bklit-grid-3">
              <div className="academic-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="bklit-badge blue">ArXiv 2014</span>
                    <a href="http://127.0.0.1:8765/api/exports/Orthogonal_Fault_Tolerance_for_Dynamically_Adaptiv_Research_Brief.pdf" target="_blank" rel="noreferrer" className="action-btn">
                      <Download size={11} /> PDF
                    </a>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                    Orthogonal Fault Tolerance for Dynamically Adaptive Systems
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Sobia K Khan et al. · Dependable Distributed Systems
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Proposes orthogonal separation of fault-tolerance mechanisms from dynamic adaptation loops to preserve consistency across distributed nodes.
                  </p>
                </div>
                <div className="bibtex-box">
                  <code>{`@article{khan2014orthogonal,\n  title = {Orthogonal Fault Tolerance...},\n  author = {Sobia K Khan et al.},\n  year = {2014}\n}`}</code>
                </div>
              </div>

              <div className="academic-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="bklit-badge blue">ArXiv 2024</span>
                    <a href="http://127.0.0.1:8765/api/exports/Requirements-Driven_Dynamic_Adaptation_to_Mitigate_Research_Brief.pdf" target="_blank" rel="noreferrer" className="action-btn">
                      <Download size={11} /> PDF
                    </a>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                    Requirements-Driven Dynamic Adaptation
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Kenji Tei et al. · Self-Adaptive Systems
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Mitigating runtime uncertainties in autonomous multi-agent environments using goal-oriented models and bounded state repair.
                  </p>
                </div>
                <div className="bibtex-box">
                  <code>{`@article{tei2024dynamic,\n  title = {Requirements-Driven Dynamic...},\n  author = {Kenji Tei et al.},\n  year = {2024}\n}`}</code>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================
            TAB 3: ROADMAPS & EXECUTION MATRIX
            ========================================================= */}
        {activeTab === 'roadmaps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Domain Selector Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveDomainFilter(null)}
                className={`quick-chip ${!activeDomainFilter ? 'active' : ''}`}
                style={{ background: !activeDomainFilter ? '#ffffff' : undefined, color: !activeDomainFilter ? '#000000' : undefined }}
              >
                All Domains
              </button>
              {domains.map(d => (
                <button
                  key={d.id}
                  onClick={() => setActiveDomainFilter(activeDomainFilter === d.id ? null : d.id)}
                  className="quick-chip"
                  style={{ background: activeDomainFilter === d.id ? '#ffffff' : undefined, color: activeDomainFilter === d.id ? '#000000' : undefined }}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {/* Strategic Roadmaps */}
            <div className="bklit-grid-3">
              {projects.map(p => (
                <div key={p.id} className="bklit-card">
                  <div className="bklit-card-header">
                    <span className="bklit-badge">{p.status}</span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {p.target_date || "2027 Entry"}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                    {p.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Milestone Progress</span>
                    <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#ffffff' }}>
                      {p.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actionable Task Matrix */}
            <div className="bklit-card">
              <div className="bklit-card-header">
                <div className="bklit-card-title">
                  <CheckCircle2 size={16} color="#ffffff" />
                  Actionable Execution Matrix
                </div>
                <span className="bklit-badge">
                  {filteredTasks.filter(t => t.is_completed === 1).length} / {filteredTasks.length} Completed
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTasks.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => handleToggleTask(t.id)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px 16px', 
                      background: 'var(--bg-muted)', 
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)',
                      opacity: t.is_completed === 1 ? 0.5 : 1
                    }}
                  >
                    {t.is_completed === 1 ? <CheckCircle2 size={16} color="#4ade80" /> : <Circle size={16} color="#a1a1aa" />}
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '13px', color: t.is_completed === 1 ? 'var(--text-muted)' : '#ffffff', textDecoration: t.is_completed === 1 ? 'line-through' : 'none' }}>
                        {t.title}
                      </span>
                    </div>
                    <span className={`bklit-badge ${t.priority === 'P1' ? 'blue' : ''}`}>{t.priority}</span>
                    {t.due_date && <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{t.due_date}</span>}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================
            TAB 4: SUB-AGENTS (META-AGENT FACTORY)
            ========================================================= */}
        {activeTab === 'subagents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Deploy New Worker Capsule */}
            <div className="bklit-card" style={{ padding: '18px 24px' }}>
              <form onSubmit={handleSpawnSubagent} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newAgentPrompt}
                  onChange={(e) => setNewAgentPrompt(e.target.value)}
                  placeholder="Prompt Meta-Agent (e.g. 'Deploy a worker to monitor Redis Streams latency')..."
                  className="bklit-input-field"
                  style={{ background: 'var(--bg-muted)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                />
                <button type="submit" disabled={isSpawningAgent || !newAgentPrompt.trim()} className="action-btn primary" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> {isSpawningAgent ? "Synthesizing..." : "Deploy Worker"}
                </button>
              </form>
            </div>

            {/* Sub-Agents Grid */}
            <div className="bklit-grid-3">
              {subagents.map(ag => (
                <div key={ag.id} className="bklit-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{ag.name}</h4>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{ag.role}</span>
                      </div>
                      <span className={`bklit-badge ${ag.status === 'RUNNING' ? 'green' : ''}`}>{ag.status}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '10px 0' }}>
                      {ag.tools_bound.map((tool, idx) => (
                        <span key={idx} style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', background: 'var(--bg-muted)', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                          {tool}
                        </span>
                      ))}
                    </div>

                    {ag.last_output && (
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: '#09090b', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ag.last_output}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {ag.last_run ? `Run: ${ag.last_run.slice(11, 16)}` : "Awaiting run"}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleRunSubagent(ag.id)} className="action-btn" title="Execute Sub-Agent">
                        <Play size={11} /> Run
                      </button>
                      <button onClick={() => handleDeleteSubagent(ag.id)} className="action-btn" title="Delete">
                        <Trash2 size={11} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
