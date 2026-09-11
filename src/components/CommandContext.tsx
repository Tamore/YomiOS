"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Message = { role: 'user' | 'assistant', content: string, action?: string, payload?: any };
export type AppState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type AttachedFile = { name: string; base64: string; mimeType: string };

type CommandContextType = {
  prompt: string;
  setPrompt: (p: string) => void;
  loading: boolean;
  messages: Message[];
  tutorLanguage: string | null;
  setTutorLanguage: (lang: string | null) => void;
  appState: AppState;
  setAppState: (state: AppState) => void;
  visibleWidgets: string[];
  setVisibleWidgets: (w: string[]) => void;
  toggleWidget: (widget: string) => void;
  showWidget: (widget: string) => void;
  hideWidget: (widget: string) => void;
  hideAllWidgets: () => void;
  attachedFile: AttachedFile | null;
  setAttachedFile: (f: AttachedFile | null) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearMessages: () => void;
};


const CommandContext = createContext<CommandContextType | undefined>(undefined);

export function CommandProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tutorLanguage, setTutorLanguage] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const router = useRouter();

  const majorWindows = ['settings', 'activity', 'courses', 'agents'];

  const toggleWidget = (widget: string) => {
    setVisibleWidgets(prev => {
      if (prev.includes(widget)) {
        return prev.filter(w => w !== widget);
      }
      const isMajor = majorWindows.includes(widget);
      return [...prev.filter(w => !(isMajor && majorWindows.includes(w))), widget];
    });
  };

  const showWidget = (widget: string) => {
    setVisibleWidgets(prev => {
      if (prev.includes(widget)) return prev;
      const isMajor = majorWindows.includes(widget);
      return [...prev.filter(w => !(isMajor && majorWindows.includes(w))), widget];
    });
  };

  const hideWidget = (widget: string) => {
    setVisibleWidgets(prev => prev.filter(w => w !== widget));
  };

  const hideAllWidgets = () => {
    setVisibleWidgets([]);
  };

  // Load chat history from local storage on first mount
  useEffect(() => {
    const saved = localStorage.getItem("yomi_chat_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, []);

  // Save chat history to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem("yomi_chat_history", JSON.stringify(messages));
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setPrompt("");
    setLoading(true);
    setAppState('thinking');

    try {
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          command: userMessage, 
          tutorLanguage,
          attachedFile: attachedFile ? { base64: attachedFile.base64, mimeType: attachedFile.mimeType } : undefined 
        }),
      });
      
      setAttachedFile(null); // Clear after sending
      const data = await res.json();
      
      if (data.reply || data.action) {
        if (data.action === 'UI_COMMAND') {
          const { action: uiAction, widget } = data.payload;
          if (uiAction === 'clear' || widget === 'none') {
            hideAllWidgets();
          } else if (uiAction === 'show' || !uiAction) {
            showWidget(widget);
          } else if (uiAction === 'hide') {
            hideWidget(widget);
          } else if (uiAction === 'toggle') {
            toggleWidget(widget);
          }
        }

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply || "",
          action: data.action,
          payload: data.payload
        }]);
        
        // Play the Voice response automatically if there is a speech reply
        if (data.reply) {
          try {
            const voiceRes = await fetch("/api/voice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: data.reply }),
            });
            if (voiceRes.ok) {
              const blob = await voiceRes.blob();
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audio.onplay = () => setAppState('speaking');
              audio.onended = () => setAppState('idle');
              audio.play().catch(e => {
                console.log("Audio autoplay blocked by browser:", e);
                setAppState('idle');
              });
            } else {
              setAppState('idle');
            }
          } catch (e) {
            console.error("Voice playback failed:", e);
            setAppState('idle');
          }
        }

        // Force the background pages (Activity Center/Dashboard) to fetch the new DB data instantly
        router.refresh();
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "System communication failure." }]);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => setMessages([]);

  return (
    <CommandContext.Provider value={{ 
        prompt, setPrompt, loading, messages, tutorLanguage, setTutorLanguage, 
        appState, setAppState, visibleWidgets, setVisibleWidgets, 
        toggleWidget, showWidget, hideWidget, hideAllWidgets,
        attachedFile, setAttachedFile, handleSubmit, clearMessages 
    }}>
      {children}
    </CommandContext.Provider>
  );
}

export function useCommand() {
  const context = useContext(CommandContext);
  if (context === undefined) {
    throw new Error("useCommand must be used within a CommandProvider");
  }
  return context;
}
