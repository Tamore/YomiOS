import re

with open('d:\\NirmitiOS\\temp_jsx.txt', 'r', encoding='utf-8') as f:
    jsx = f.read()

# Extract only the content inside <main>
main_match = re.search(r'<main[^>]*>(.*?)</main>', jsx, re.DOTALL)
if main_match:
    main_content = main_match.group(1).strip()
    
    # We need to inject the messages map inside the Ambient AI Insight block
    insight_replacement = """{/* Ambient AI Insight & Logs */}
<div className="mt-8 pt-6 border-t border-border-muted/50 flex flex-col gap-4 max-h-[300px] overflow-y-auto no-scrollbar">
  {messages.length === 0 ? (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-secondary-container/30 flex items-center justify-center text-secondary">
        <span className="material-symbols-outlined text-[20px]">psychology</span>
      </div>
      <div>
        <p className="text-body-sm text-on-surface-variant italic">&quot;System initialized. Awaiting command parameters.&quot;</p>
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
</section>"""
    
    # The original Insight block in temp_jsx.txt is right before </section>
    main_content = re.sub(r'\{/\* Ambient AI Insight \*/\}.*?(?=</section>)', insight_replacement, main_content, flags=re.DOTALL)
    
    # Fix quotes
    main_content = main_content.replace('"Project X Review"', '&quot;Project X Review&quot;')
    main_content = main_content.replace("Today's Mission", "Today&apos;s Mission")

    final_code = f"""\"use client\";

import {{ useRef, useEffect }} from "react";
import {{ useCommand }} from "@/components/CommandContext";

export default function Dashboard() {{
  const {{ messages }} = useCommand();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {{
    messagesEndRef.current?.scrollIntoView({{ behavior: "smooth" }});
  }}, [messages]);

  return (
    <>
      {main_content}
    </>
  );
}}
"""
    with open('d:\\NirmitiOS\\src\\app\\page.tsx', 'w', encoding='utf-8') as f:
        f.write(final_code)
    print("page.tsx refactored successfully")
else:
    print("Could not find <main> in temp_jsx.txt")
