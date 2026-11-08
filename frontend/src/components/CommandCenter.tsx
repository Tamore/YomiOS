import React, { useState } from 'react';
import { Mic, Send, Terminal } from 'lucide-react';

interface CommandCenterProps {
  onSendMessage: (text: string) => Promise<any>;
  isProcessing: boolean;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  const handleVoiceToggle = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Web Speech API is not available. Please type your command!");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setInput(speechResult);
      onSendMessage(speechResult);
      setInput('');
    };

    recognition.start();
  };

  const quickPrompts = [
    { label: "Research Literature", prompt: "research self-adaptive systems by Kenji Tei" },
    { label: "Summarize URL & PDF", prompt: "Summarize https://news.ycombinator.com and export a PDF" },
    { label: "⛩️ Japan Roadmap", prompt: "Start a roadmap for Japan Master's Fall 2027 Admissions" },
    { label: "⚡ System Telemetry", prompt: "System telemetry" }
  ];

  return (
    <div className="command-wrapper">
      {/* Quick Action Chips */}
      <div className="quick-chips-row">
        <span style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Terminal size={12} /> Commands:
        </span>
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(q.prompt)}
            className="quick-chip"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Main Input Capsule */}
      <form onSubmit={handleSubmit} className="capsule-form">
        <div className="capsule-input-box">
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            title="Voice Command"
          >
            <Mic size={18} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening to your voice..." : "Ask Yomi, summarize a URL, create a roadmap or task..."}
            className="main-input"
            disabled={isProcessing}
          />

          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="send-btn"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
};
