import re

jsx_source = open(r'd:\NirmitiOS\temp_jsx.txt', 'r', encoding='utf-8').read()

# Replace the input nav block
nav_replacement = """
{/* BottomNavBar */}
<nav className="fixed bottom-0 right-0 w-[calc(100%-240px)] p-4 bg-surface-container-lowest/80 backdrop-blur-xl border-t border-border-muted flex justify-center items-center z-50 ml-[240px] shadow-lg">
  <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-surface-container-high border border-primary rounded-xl px-4 py-2 flex items-center gap-4">
    <span className="material-symbols-outlined text-primary">terminal</span>
    <input 
      className="bg-transparent border-none text-primary font-label-mono text-sm flex-1 focus:ring-0 placeholder:text-primary/40 focus:outline-none" 
      placeholder={loading ? "Executing command..." : "Initiate neural command..."} 
      type="text"
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      disabled={loading}
    />
    <button type="submit" disabled={loading} className="hidden">Submit</button>
    <div className="flex items-center gap-2">
      <kbd className="px-2 py-0.5 bg-surface-container-lowest border border-border-muted rounded text-[10px] text-on-surface-variant">ENTER</kbd>
    </div>
  </form>
</nav>
"""

jsx_source = re.sub(r'\{/\* BottomNavBar.*?</nav>', nav_replacement, jsx_source, flags=re.DOTALL)

# Replace the Ambient AI Insight block
insight_replacement = """
{/* Ambient AI Insight & Logs */}
<div className="mt-8 pt-6 border-t border-border-muted/50 flex flex-col gap-4 max-h-[300px] overflow-y-auto no-scrollbar">
  {messages.length === 0 ? (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-secondary-container/30 flex items-center justify-center text-secondary">
        <span className="material-symbols-outlined text-[20px]">psychology</span>
      </div>
      <div>
        <p className="text-body-sm text-on-surface-variant italic">"System initialized. Awaiting command parameters."</p>
      </div>
    </div>
  ) : (
    messages.map((msg, idx) => (
      <div key={idx} className="flex items-start gap-4">
        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-surface-slate text-on-surface' : 'bg-primary/20 text-primary'}`}>
          <span className="material-symbols-outlined text-[20px]">{msg.role === 'user' ? 'person' : 'smart_toy'}</span>
        </div>
        <div className="flex-1 bg-surface-container-lowest p-3 rounded-lg border border-border-muted whitespace-pre-wrap font-label-mono text-xs text-on-surface-variant leading-relaxed">
          {msg.content}
        </div>
      </div>
    ))
  )}
  <div ref={messagesEndRef} />
</div>
"""

jsx_source = re.sub(r'\{/\* Ambient AI Insight \*/\}.*?(?=</section>)', insight_replacement, jsx_source, flags=re.DOTALL)

# Wrap with React Component logic
final_code = f"""\"use client\";

import {{ useState, useRef, useEffect }} from "react";

export default function Dashboard() {{
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{{ role: 'user' | 'assistant', content: string }}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {{
    messagesEndRef.current?.scrollIntoView({{ behavior: "smooth" }});
  }};

  useEffect(() => {{
    scrollToBottom();
  }}, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {{
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, {{ role: 'user', content: userMessage }}]);
    setPrompt("");
    setLoading(true);

    try {{
      const res = await fetch("/api/command", {{
        method: "POST",
        headers: {{ "Content-Type": "application/json" }},
        body: JSON.stringify({{ prompt: userMessage }}),
      }});
      
      const data = await res.json();
      
      if (data.assistantResponseText) {{
        setMessages(prev => [...prev, {{ role: 'assistant', content: data.assistantResponseText }}]);
      }} else if (data.error) {{
        setMessages(prev => [...prev, {{ role: 'assistant', content: `Error: ${{data.error}}` }}]);
      }}
    }} catch (error) {{
      console.error(error);
      setMessages(prev => [...prev, {{ role: 'assistant', content: "System communication failure." }}]);
    }} finally {{
      setLoading(false);
    }}
  }};

  return (
    <>
{jsx_source}
    </>
  );
}}
"""

with open(r'd:\NirmitiOS\src\app\page.tsx', 'w', encoding='utf-8') as f:
    f.write(final_code)

print("page.tsx successfully built!")
