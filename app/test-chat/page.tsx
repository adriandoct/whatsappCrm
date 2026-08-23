'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, RotateCcw, Sparkles, User, Flame, Sun, Snowflake } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LeadEvaluation {
  score: 'hot' | 'warm' | 'cold';
  reason: string;
}

export default function TestChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadEval, setLeadEval] = useState<LeadEvaluation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');

    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const res = await fetch('/api/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.leadEvaluation) {
          setLeadEval(data.leadEvaluation);
        }
      }
    } catch (err) {
      console.error('Error in test chat:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([]);
    setLeadEval(null);
  }

  const userCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Probador del Agente Berta
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Entorno de Pruebas (Simulador)
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Simulá la conversación con Berta y verificá las respuestas y la calificación automática de leads sin enviar mensajes reales a WhatsApp.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar Chat
        </button>
      </div>

      {/* Main Chat Panel */}
      <div className="glass-panel rounded-2xl border border-dark-border flex flex-col h-[550px] overflow-hidden">
        {/* Top Info Bar */}
        <div className="p-4 border-b border-dark-border bg-dark-bg/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                Simulación Berta AI
                <span className="text-[10px] text-slate-400 font-mono">({userCount} msgs usuario)</span>
              </h3>
              <p className="text-[10px] text-slate-400">DeepSeek v3 • Modo Voseo Argentino</p>
            </div>
          </div>

          {/* Lead Qualification Preview Pill */}
          {leadEval ? (
            <div className="flex items-center gap-2">
              {leadEval.score === 'hot' && (
                <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Lead HOT
                </span>
              )}
              {leadEval.score === 'warm' && (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5" /> Lead WARM
                </span>
              )}
              {leadEval.score === 'cold' && (
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1">
                  <Snowflake className="w-3.5 h-3.5" /> Lead COLD
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 italic">
              {userCount < 3 ? `Se evaluará tras ${3 - userCount} msgs más` : 'Evaluando...'}
            </span>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-bg/60">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Iniciá una simulación</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Escribí un mensaje como si fueras un cliente de WhatsApp (ej: &quot;Hola, quería saber qué servicios ofrecen&quot;).
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed border ${
                      isUser
                        ? 'bg-brand-500/15 border-brand-500/30 text-emerald-100 rounded-tr-none'
                        : 'bg-dark-card border-white/10 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <span className="text-[10px] font-bold block mb-1 flex items-center gap-1 text-slate-400">
                      {isUser ? <User className="w-3 h-3 text-emerald-400" /> : <Sparkles className="w-3 h-3 text-brand-500" />}
                      {isUser ? 'Cliente (Tú)' : 'Berta (IA)'}
                    </span>
                    <p>{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic p-2">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
              Berta está escribiendo...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Lead Evaluation Reasoning Panel */}
        {leadEval && (
          <div className="p-3 bg-dark-card border-t border-dark-border text-xs text-slate-300">
            <span className="font-bold text-slate-200">Justificación de Calificación:</span> {leadEval.reason}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-dark-border bg-dark-bg/80 flex items-center gap-2">
          <input
            type="text"
            placeholder="Simular mensaje entrante de cliente..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-glow"
          >
            <Send className="w-3.5 h-3.5 text-black" />
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
