'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { 
  Users, 
  Flame, 
  Sun, 
  Snowflake, 
  MessageSquare, 
  TrendingUp, 
  Target, 
  Megaphone,
  ArrowRight,
  Sparkles,
  Bot
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalContacts: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  totalMessages: number;
  conversionRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    totalMessages: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          { count: contactsCount },
          { count: messagesCount },
          { data: leadsData }
        ] = await Promise.all([
          supabaseClient.from('contacts').select('*', { count: 'exact', head: true }),
          supabaseClient.from('messages').select('*', { count: 'exact', head: true }),
          supabaseClient.from('leads').select('score'),
        ]);

        const hot = (leadsData || []).filter(l => l.score === 'hot').length;
        const warm = (leadsData || []).filter(l => l.score === 'warm').length;
        const cold = (leadsData || []).filter(l => l.score === 'cold').length;
        const total = contactsCount || 0;
        const convRate = total > 0 ? Math.round((hot / total) * 100) : 0;

        setStats({
          totalContacts: total,
          hotLeads: hot,
          warmLeads: warm,
          coldLeads: cold,
          totalMessages: messagesCount || 0,
          conversionRate: convRate,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Dashboard del CRM
            <span className="text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 font-medium">
              En Vivo
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Resumen de rendimiento de calificación de leads y conversiones del agente Berta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/test-chat"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-sm font-medium transition-all"
          >
            <Bot className="w-4 h-4 text-brand-500" />
            Probar Agente IA
          </Link>
          <Link
            href="/conversations"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-semibold text-sm transition-all shadow-glow"
          >
            <MessageSquare className="w-4 h-4 text-black" />
            Ver Conversaciones
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Contacts */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Contactos</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">{loading ? '...' : stats.totalContacts}</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> WhatsApp Registrados
            </p>
          </div>
        </div>

        {/* Hot Leads */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-red-400 text-xs font-semibold uppercase tracking-wider">Leads HOT 🔥</span>
            <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-red-400">{loading ? '...' : stats.hotLeads}</h3>
            <p className="text-xs text-red-400/80 mt-1">Interés real / Alerta enviada</p>
          </div>
        </div>

        {/* Warm Leads */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Leads WARM ☀️</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-amber-400">{loading ? '...' : stats.warmLeads}</h3>
            <p className="text-xs text-amber-400/80 mt-1">Interesados en servicios</p>
          </div>
        </div>

        {/* Cold Leads */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Leads COLD ❄️</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Snowflake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-blue-400">{loading ? '...' : stats.coldLeads}</h3>
            <p className="text-xs text-blue-400/80 mt-1">Sin intención clara o spam</p>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Visual Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Temperature Distribution Bar */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-500" />
                Calificación Automática de Leads
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Porcentaje de leads clasificados por DeepSeek tras 3+ interacción del usuario.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-300">
              Conversión HOT: <span className="text-brand-500 font-bold">{stats.conversionRate}%</span>
            </span>
          </div>

          {/* Visual Distribution Progress Bar */}
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-white/5">
              <div 
                style={{ width: `${stats.totalContacts > 0 ? (stats.hotLeads / stats.totalContacts) * 100 : 33}%` }} 
                className="bg-red-500 transition-all duration-500 rounded-l-full"
                title="HOT"
              ></div>
              <div 
                style={{ width: `${stats.totalContacts > 0 ? (stats.warmLeads / stats.totalContacts) * 100 : 33}%` }} 
                className="bg-amber-500 transition-all duration-500"
                title="WARM"
              ></div>
              <div 
                style={{ width: `${stats.totalContacts > 0 ? (stats.coldLeads / stats.totalContacts) * 100 : 34}%` }} 
                className="bg-blue-500 transition-all duration-500 rounded-r-full"
                title="COLD"
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-red-400 font-bold block text-sm">🔥 HOT</span>
                <span className="text-slate-300 font-medium">{stats.hotLeads} contactos</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-400 font-bold block text-sm">☀️ WARM</span>
                <span className="text-slate-300 font-medium">{stats.warmLeads} contactos</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-blue-400 font-bold block text-sm">❄️ COLD</span>
                <span className="text-slate-300 font-medium">{stats.coldLeads} contactos</span>
              </div>
            </div>
          </div>

          {/* Activity Banner */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500/20 text-brand-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Mensajes Intercambiados</p>
                <p className="text-xs text-slate-400">Total acumulado en el sistema</p>
              </div>
            </div>
            <span className="text-xl font-bold text-white font-mono">{loading ? '...' : stats.totalMessages}</span>
          </div>
        </div>

        {/* Ad Sources & Channels Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-400" />
              Fuentes de Anuncios
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Origen de los leads entrantes (Click-to-WhatsApp CTWA).
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                <span className="text-slate-300 font-medium">Meta Ads (Facebook/IG)</span>
                <span className="text-emerald-400 font-bold font-mono">CTWA</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                <span className="text-slate-300 font-medium">Google Ads / Web Directo</span>
                <span className="text-slate-400 font-mono">Directo</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                <span className="text-slate-300 font-medium">Follow-Up Automático</span>
                <span className="text-indigo-400 font-bold font-mono">Cron 5h</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-dark-border">
            <Link
              href="/conversations"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-all border border-white/10"
            >
              Gestionar Conversaciones <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
