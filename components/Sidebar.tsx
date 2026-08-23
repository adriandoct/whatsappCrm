'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Bot, 
  Sparkles, 
  PhoneCall
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Conversaciones',
      href: '/conversations',
      icon: MessageSquare,
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
    },
    {
      name: 'Probador Agente',
      href: '/test-chat',
      icon: Bot,
    },
  ];

  return (
    <aside className="w-64 bg-dark-bg/95 border-r border-dark-border flex flex-col justify-between h-screen sticky top-0 backdrop-blur-xl z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-dark-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center text-black font-bold shadow-glow">
            <PhoneCall className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
              WhatsApp CRM
            </h1>
            <p className="text-xs text-brand-500 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> Agente Berta AI
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status Footbar */}
      <div className="p-4 border-t border-dark-border m-4 rounded-xl bg-dark-card/60 border border-white/5 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-300">Modelo IA</span>
          <span className="text-xs font-mono text-emerald-400">DeepSeek v3</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300">Estado Webhook</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Activo
          </span>
        </div>
      </div>
    </aside>
  );
}
