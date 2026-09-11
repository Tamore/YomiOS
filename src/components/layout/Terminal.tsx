"use client";

import { useState, useEffect, useRef } from "react";
import { useCommand, AppState } from "../CommandContext";
import { useRouter } from "next/navigation";

function HumanGateCard({ payload, onApprove, onReject }: any) {
  const [status, setStatus] = useState<'pending' | 'executing' | 'approved' | 'rejected'>('pending');

  const handleApprove = async () => {
    setStatus('executing');
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: payload.tool, args: payload.args }),
      });
      if (res.ok) {
        setStatus('approved');
        onApprove();
      } else {
        setStatus('rejected');
      }
    } catch (e) {
      setStatus('rejected');
    }
  };

  const handleReject = () => {
    setStatus('rejected');
    onReject();
  };

  if (status === 'approved') return <div className="text-secondary text-[10px] font-label-mono mt-2 tracking-widest border border-secondary/30 bg-secondary/10 px-2 py-1 rounded inline-block">✓ ACTION EXECUTED</div>;
  if (status === 'rejected') return <div className="text-error text-[10px] font-label-mono mt-2 tracking-widest border border-error/30 bg-error/10 px-2 py-1 rounded inline-block">✗ ACTION REJECTED</div>;

  return (
    <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-surface-container-highest shadow-[0_0_15px_rgba(192,132,252,0.1)]">
      <div className="font-bold text-[10px] mb-2 uppercase tracking-widest text-primary flex items-center gap-2">
        <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
        Human Gate Approval: {payload.tool.replace('_', ' ')}
      </div>
      <pre className="text-[10px] text-on-surface-variant mb-3 font-label-mono bg-surface-charcoal p-2 rounded overflow-x-auto border border-border-muted">
        {JSON.stringify(payload.args, null, 2)}
      </pre>
      <div className="flex gap-2">
        <button onClick={handleApprove} disabled={status === 'executing'} className="flex-1 bg-primary/20 hover:bg-primary/40 border border-primary text-primary text-xs py-1.5 rounded uppercase tracking-wider font-bold transition-all shadow-[0_0_10px_rgba(192,132,252,0.2)]">
          {status === 'executing' ? 'Executing...' : 'Approve'}
        </button>
        <button onClick={handleReject} disabled={status === 'executing'} className="flex-1 bg-error/10 hover:bg-error/30 border border-error/50 text-error text-xs py-1.5 rounded uppercase tracking-wider font-bold transition-all">
          Reject
        </button>
      </div>
    </div>
  );
}

export default function Terminal() {
  console.log("TERMINAL MOUNTING");
  const { prompt, setPrompt, loading, handleSubmit, messages, tutorLanguage, appState, setAppState, attachedFile, setAttachedFile, visibleWidgets } = useCommand();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isContinuousVoice, setIsContinuousVoice] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      setAttachedFile({
        name: file.name,
        base64: base64String,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
    // Clear input so same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Auto-open when Yomi is thinking or speaking
  useEffect(() => {
    if (appState === 'thinking' || appState === 'speaking' || appState === 'listening') {
      setIsOpen(true);
    }
  }, [appState]);

  // Auto-expand if a new message comes in (like when loading starts)
  useEffect(() => {
    if (loading) setIsMinimized(false);
  }, [loading]);

  // The Continuous Voice Loop Engine
  useEffect(() => {
    if (isContinuousVoice && appState === 'idle' && !isListening && !loading) {
      // Small delay before automatically re-engaging the mic
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isContinuousVoice, appState, isListening, loading]);

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      setIsContinuousVoice(false);
      return;
    }

    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Dynamically set language based on tutor mode!
    if (tutorLanguage === "Japanese") recognition.lang = 'ja-JP';
    else if (tutorLanguage === "Spanish") recognition.lang = 'es-ES';
    else if (tutorLanguage === "French") recognition.lang = 'fr-FR';
    else recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setAppState(prev => prev === 'idle' ? 'listening' : prev);
    };
    
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentText = finalTranscript || interimTranscript;
      let processedTranscript = currentText;
      const lowerT = currentText.toLowerCase();
      
      // Wake Word Logic
      if (isContinuousVoice) {
         if (lowerT.includes("hey yomi") || lowerT.includes("hi yomi")) {
            const triggerMatch = currentText.match(/(?:hey|hi)\s+yomi\s*(.*)/i);
            if (triggerMatch && triggerMatch[1].trim()) {
                processedTranscript = triggerMatch[1].trim();
            } else {
                processedTranscript = ""; // Just said "hey yomi" with no command yet
            }
         } else {
            // Ignore background noise that isn't the wake word
            return;
         }
      }

      setPrompt(processedTranscript);

      // If we have a final transcript that contains a valid command, submit it immediately!
      if (finalTranscript && processedTranscript.trim()) {
        setTimeout(() => {
           formRef.current?.requestSubmit();
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') {
        setIsListening(false);
        setAppState(prev => prev === 'listening' ? 'idle' : prev);
        return; 
      }
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      setAppState(prev => prev === 'listening' ? 'idle' : prev);
    };

    recognition.onend = () => {
      setIsListening(false);
      setAppState(prev => prev === 'listening' ? 'idle' : prev);
    };

    try {
        recognition.start();
    } catch (e) {
        console.error(e);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsContinuousVoice(false);
      setIsListening(false);
      setAppState('idle');
    } else {
      startListening();
    }
  };

  const toggleContinuousVoice = () => {
    if (isContinuousVoice) {
      setIsContinuousVoice(false);
      if (recognitionRef.current) recognitionRef.current.stop();
    } else {
      setIsContinuousVoice(true);
      if (!isListening) startListening();
    }
  };

  if (!isOpen) {
    console.log("TERMINAL RENDERING BUTTON");
    return (
      <button 
        data-testid="terminal-summon-btn"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-[360px] w-16 h-16 rounded-full glass-card flex items-center justify-center text-primary hover:text-white transition-all active-glow group z-[100] shadow-[0_0_20px_rgba(192,132,252,0.3)] animate-pulse border-primary/50"
      >
        <span className="material-symbols-outlined text-[32px] group-hover:scale-110 transition-transform">graphic_eq</span>
      </button>
    );
  }

  return (
    <nav className="fixed left-8 top-8 bottom-8 w-[400px] z-[60] flex flex-col justify-end gap-3 transition-all animate-in slide-in-from-left-8 fade-in duration-300 pointer-events-none">
      
      {messages.length > 0 && !isMinimized && (
        <div className="glass-card rounded-2xl p-5 overflow-y-auto flex flex-col gap-4 relative group custom-scrollbar shadow-[0_0_30px_rgba(192,132,252,0.1)] border-primary/20 bg-background/90 backdrop-blur-xl pointer-events-auto h-full max-h-[80vh]">
          <button 
            type="button"
            onClick={() => setIsMinimized(true)}
            className="sticky top-0 float-right text-on-surface-variant hover:text-primary p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity self-end bg-surface-container-highest/80 backdrop-blur z-10"
            title="Minimize Chat"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
          
          <div className="flex-1"></div>
          
          {messages.map((msg, idx) => {
            const contentParts = msg.content.split(/(https?:\/\/[^\s]+|\/exports\/[^\s]+)/g);
            return (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`whitespace-pre-wrap max-w-[90%] rounded-xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-surface-container-highest/50 text-on-surface border border-border-muted/50'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 border-b border-border-muted/50 pb-1">
                    <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                      <span className="material-symbols-outlined text-[10px]">smart_toy</span>
                    </span>
                    <span className="font-label-mono text-[9px] text-primary uppercase tracking-[0.2em]">Yomi</span>
                  </div>
                )}
                {contentParts.map((part, i) => {
                  if (part.match(/(https?:\/\/[^\s]+|\/exports\/[^\s]+)/)) {
                    return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline font-bold">{part}</a>;
                  }
                  return <span key={i}>{part}</span>;
                })}
                
                {msg.action === 'PROPOSE' && msg.payload && (
                  <HumanGateCard 
                    payload={msg.payload}
                    onApprove={() => router.refresh()}
                    onReject={() => {}}
                  />
                )}
              </div>
            </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-container-highest/50 border border-border-muted/50 rounded-xl px-4 py-3 text-[13px] animate-pulse flex items-center gap-3">
                <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                  <span className="material-symbols-outlined text-[10px]">hourglass_empty</span>
                </span>
                <span className="text-on-surface-variant font-label-mono tracking-widest uppercase">Channeling intent...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {attachedFile && (
        <div className="mx-4 mb-1 p-2 bg-primary/20 border border-primary/40 rounded-lg flex items-center justify-between shadow-[0_0_10px_rgba(192,132,252,0.2)]">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="material-symbols-outlined text-primary text-[16px]">attachment</span>
            <span className="text-primary font-label-mono text-[10px] truncate">{attachedFile.name}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setAttachedFile(null)}
            className="text-primary hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="w-full glass-card border border-primary/30 bg-background/90 backdrop-blur-xl hover:border-primary/50 transition-colors rounded-xl px-4 py-3 flex items-center gap-3 shadow-[0_0_20px_rgba(192,132,252,0.15)] group focus-within:border-primary focus-within:shadow-[0_0_20px_rgba(192,132,252,0.3)] pointer-events-auto shrink-0">
        
        <button 
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-on-surface-variant hover:text-error transition-colors flex items-center mr-1"
          title="Dismiss Chat"
        >
          <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
        </button>

        {messages.length > 0 && isMinimized && (
          <button 
            type="button" 
            onClick={() => setIsMinimized(false)}
            className="text-primary/70 hover:text-primary transition-colors flex items-center"
            title="Show Chat History"
          >
            <span className="material-symbols-outlined text-[18px] animate-bounce">chat</span>
          </button>
        )}

        <input 
          className="bg-transparent border-none text-on-surface font-label-mono text-sm flex-1 focus:ring-0 placeholder:text-on-surface-variant focus:outline-none w-full" 
          placeholder={loading ? "Channeling intent..." : "Cast a spell or enter command..."} 
          type="text"
          value={prompt}
          onFocus={() => setIsMinimized(false)}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading} className="hidden">Submit</button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,application/pdf" 
        />
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-full transition-all flex items-center justify-center text-on-surface-variant hover:text-primary"
            title="Attach File"
          >
            <span className="material-symbols-outlined text-[18px]">attach_file</span>
          </button>
          <button 
            type="button" 
            onClick={toggleContinuousVoice}
            className={`p-1.5 rounded-full transition-all flex items-center justify-center ${isContinuousVoice ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(192,132,252,0.6)]' : 'text-on-surface-variant hover:text-primary'}`}
            title="Continuous Voice Mode"
          >
            <span className="material-symbols-outlined text-[16px]">all_inclusive</span>
          </button>
          
          <button 
            type="button" 
            onClick={toggleListening}
            className={`p-1.5 rounded-full transition-all flex items-center justify-center ${isListening ? 'bg-error/20 text-error animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.5)]' : 'text-primary hover:bg-primary/10'}`}
            title="Dictate Command"
          >
            <span className="material-symbols-outlined text-[18px]">mic</span>
          </button>
        </div>
      </form>
    </nav>
  );
}
