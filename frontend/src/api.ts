const API_BASE = "http://127.0.0.1:8765";

export interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  is_completed: number;
  domain_id?: string;
  project_id?: string;
  due_date?: string;
}

export interface StateData {
  domains: any[];
  projects: any[];
  tasks: Task[];
  subagents: any[];
  logs: any[];
  telemetry: any;
  admissions: any[];
}

export interface JapaneseCard {
  id: string;
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  category: string;
  level: string;
  usage_tip: string;
}

export async function fetchState(): Promise<StateData> {
  const res = await fetch(`${API_BASE}/api/state`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function toggleTask(taskId: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${taskId}/toggle`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createTask(title: string, priority: string = "P2"): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, priority })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchJapaneseCards(): Promise<JapaneseCard[]> {
  const res = await fetch(`${API_BASE}/api/japanese/cards`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCitexStatus(): Promise<{ online: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/mcp/citex/status`);
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    return res.json();
  } catch (err: any) {
    return { online: false, error: err.message };
  }
}

export async function fetchGoogleStatus(): Promise<{ connected: boolean; mode: string; status: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/workspace/google/status`);
    if (!res.ok) return { connected: false, mode: "offline", status: "Offline" };
    return res.json();
  } catch {
    return { connected: false, mode: "offline", status: "Offline" };
  }
}

export async function searchAcademic(query: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/academic/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function sendChat(message: string, sessionId: string = "default"): Promise<any> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: string | null;
  timestamp: string;
}

export async function fetchChatHistory(sessionId: string = "default"): Promise<StoredChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/api/chat/history?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch {
    return [];
  }
}


