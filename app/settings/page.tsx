'use client';

import { useEffect, useState } from 'react';
import { Save, CheckCircle, AlertCircle, Sparkles, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { DEFAULT_BERTA_PROMPT } from '@/lib/openrouter';

export default function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_BERTA_PROMPT);
  const [calendlyLink, setCalendlyLink] = useState('https://calendly.com/nuestra-agencia/reunion-30min');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.system_prompt) {
            setSystemPrompt(data.settings.system_prompt);
          }
          if (data.settings?.calendly_link) {
            setCalendlyLink(data.settings.calendly_link);
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          calendly_link: calendlyLink,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuración de Berta guardada exitosamente.' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red al guardar.' });
    } finally {
      setSaving(false);
    }
  }

  function handleResetDefault() {
    setSystemPrompt(DEFAULT_BERTA_PROMPT);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          Configuración del Agente Berta
          <Sparkles className="w-5 h-5 text-brand-500" />
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Personaliza las instrucciones del agente conversacional IA, reglas de negocio y enlaces de agendamiento.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* System Prompt Editor Box */}
        <div className="glass-panel p-6 rounded-2xl border border-dark-border space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              System Prompt de Berta
            </label>
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-xs text-slate-400 hover:text-brand-500 underline transition-all"
            >
              Restaurar Prompt por Defecto
            </button>
          </div>

          <textarea
            rows={12}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            disabled={loading}
            className="w-full bg-dark-bg/90 rounded-xl border border-dark-border p-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all leading-relaxed"
            placeholder="Ingresa las instrucciones para Berta..."
          />
        </div>

        {/* Calendly Link Setting */}
        <div className="glass-panel p-6 rounded-2xl border border-dark-border space-y-3">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-indigo-400" />
            Enlace de Agendamiento (Calendly / Cal.com)
          </label>
          <p className="text-xs text-slate-400">
            Este enlace será compartido únicamente por Berta cuando detecte un interés real de reunión.
          </p>
          <input
            type="url"
            value={calendlyLink}
            onChange={(e) => setCalendlyLink(e.target.value)}
            className="w-full bg-dark-bg/90 rounded-xl border border-dark-border px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
            placeholder="https://calendly.com/tu-agencia/reunion"
          />
        </div>

        {/* Unbreakable Agent Rules Card */}
        <div className="glass-panel p-6 rounded-2xl border border-dark-border space-y-3 bg-dark-card/50">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Reglas Irrompibles del Agente Berta (PASO 6)
          </h3>
          <ul className="text-xs text-slate-400 space-y-2 list-disc pl-5">
            <li>Responder SIEMPRE en español argentino (voseo), nunca en otro idioma ni neutro.</li>
            <li>Primera respuesta genérica: preguntar qué quiere lograr, nunca listar servicios de entrada.</li>
            <li>Mensajes cortos (&lt; 30 palabras), máximo 2 emojis, sin markdown, sin listas.</li>
            <li>Nunca inventar precios de servicios ni datos falsos.</li>
            <li>Si el usuario expresa molestia o enojo: derivar inmediatamente a humano.</li>
            <li>Solo enviar link de Calendly cuando hay interés REAL.</li>
            <li>Nunca pedir email (la comunicación ya es por WhatsApp).</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-sm flex items-center gap-2 transition-all shadow-glow"
          >
            <Save className="w-4 h-4 text-black" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
