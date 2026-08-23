'use client';

import { useEffect, useState, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { 
  Search, 
  Send, 
  Bot, 
  Ban, 
  Flame, 
  Sun, 
  Snowflake, 
  Check, 
  CheckCheck, 
  AlertCircle,
  RefreshCw,
  Phone,
  Sparkles,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  ad_source: string | null;
  ctwa_clid: string | null;
  blocked: boolean;
  bot_enabled: boolean;
  lead?: {
    score: 'hot' | 'warm' | 'cold';
    reason: string;
    qualified_at: string;
  } | null;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface Message {
  id: string;
  contact_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | null;
  whatsapp_message_id: string | null;
}

export default function ConversationsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversations list
  async function fetchConversations() {
    try {
      setLoadingContacts(true);
      const { data: contactsData, error: contactsErr } = await supabaseClient
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (contactsErr || !contactsData) {
        console.error('Error fetching contacts:', contactsErr);
        return;
      }

      // Fetch leads data
      const { data: leadsData } = await supabaseClient.from('leads').select('*');
      const leadsMap = new Map((leadsData || []).map(l => [l.contact_id, l]));

      // Fetch latest message per contact
      const enrichedContacts: Contact[] = await Promise.all(
        contactsData.map(async (c) => {
          const { data: msgs } = await supabaseClient
            .from('messages')
            .select('content, created_at')
            .eq('contact_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...c,
            bot_enabled: c.bot_enabled ?? true,
            lead: leadsMap.get(c.id) || null,
            lastMessage: msgs?.[0]?.content || 'Sin mensajes aún',
            lastMessageAt: msgs?.[0]?.created_at || c.created_at,
          };
        })
      );

      setContacts(enrichedContacts);
      if (enrichedContacts.length > 0 && !selectedContact) {
        setSelectedContact(enrichedContacts[0]);
      }
    } catch (err) {
      console.error('Error in fetchConversations:', err);
    } finally {
      setLoadingContacts(false);
    }
  }

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Fetch messages when selectedContact changes
  useEffect(() => {
    if (!selectedContact) return;
    const currentContactId = selectedContact.id;

    async function fetchMessages() {
      setLoadingMessages(true);
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('contact_id', currentContactId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
      }
      setLoadingMessages(false);
    }

    fetchMessages();
  }, [selectedContact?.id]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle manual send message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedContact || sending) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${selectedContact.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Error sending manual message:', err);
    } finally {
      setSending(false);
    }
  }

  // Toggle Bot state (ON / OFF)
  async function handleToggleBot() {
    if (!selectedContact) return;
    const newState = !selectedContact.bot_enabled;

    setSelectedContact({ ...selectedContact, bot_enabled: newState });
    setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, bot_enabled: newState } : c));

    await fetch(`/api/conversations/${selectedContact.id}/toggle-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_enabled: newState }),
    });
  }

  // Toggle Block state
  async function handleToggleBlock() {
    if (!selectedContact) return;
    const newState = !selectedContact.blocked;

    setSelectedContact({ ...selectedContact, blocked: newState });
    setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, blocked: newState } : c));

    await fetch(`/api/conversations/${selectedContact.id}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: newState }),
    });
  }

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    if (filterScore === 'all') return matchesSearch;
    return matchesSearch && c.lead?.score === filterScore;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-4 max-w-7xl mx-auto overflow-hidden">
      {/* 1. Conversations List Sidebar */}
      <div className="w-full md:w-80 lg:w-96 glass-panel rounded-2xl flex flex-col h-full border border-dark-border">
        {/* Search & Filters Header */}
        <div className="p-4 border-b border-dark-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Chats WhatsApp
            </h2>
            <button
              onClick={fetchConversations}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              title="Refrescar chats"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-dark-bg/90 rounded-xl border border-dark-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>

          {/* Lead Filter Tabs */}
          <div className="flex items-center gap-1 bg-dark-bg p-1 rounded-xl border border-dark-border text-xs">
            {(['all', 'hot', 'warm', 'cold'] as const).map((score) => (
              <button
                key={score}
                onClick={() => setFilterScore(score)}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-center uppercase text-[10px] ${
                  filterScore === score
                    ? 'bg-brand-500/20 text-brand-500 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {score === 'all' ? 'Todos' : score}
              </button>
            ))}
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loadingContacts ? (
            <div className="p-8 text-center text-xs text-slate-500">Cargando conversaciones...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No se encontraron contactos.</div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 cursor-pointer transition-all flex items-start gap-3 hover:bg-white/5 ${
                    isSelected ? 'bg-brand-500/10 border-l-4 border-brand-500' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-slate-200 shrink-0">
                    {contact.name ? contact.name.charAt(0).toUpperCase() : <Phone className="w-4 h-4 text-brand-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        {contact.name || contact.phone}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {format(new Date(contact.lastMessageAt || contact.created_at), 'HH:mm', { locale: es })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 truncate mb-2">
                      {contact.lastMessage}
                    </p>

                    <div className="flex items-center gap-2">
                      {/* Lead Score Badge */}
                      {contact.lead?.score === 'hot' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold flex items-center gap-1">
                          <Flame className="w-3 h-3" /> HOT
                        </span>
                      )}
                      {contact.lead?.score === 'warm' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                          <Sun className="w-3 h-3" /> WARM
                        </span>
                      )}
                      {contact.lead?.score === 'cold' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold flex items-center gap-1">
                          <Snowflake className="w-3 h-3" /> COLD
                        </span>
                      )}

                      {contact.blocked && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Active Chat View & Panel */}
      {selectedContact ? (
        <div className="flex-1 glass-panel rounded-2xl flex flex-col h-full border border-dark-border min-w-0">
          {/* Chat Top Header */}
          <div className="p-4 border-b border-dark-border flex flex-wrap items-center justify-between gap-3 bg-dark-bg/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-brand-500/30 flex items-center justify-center font-bold text-slate-200">
                {selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : <Phone className="w-4 h-4 text-brand-500" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {selectedContact.name || 'Sin Nombre'}
                  <span className="text-xs font-mono text-slate-400 font-normal">({selectedContact.phone})</span>
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>Fuente: {selectedContact.ad_source || 'Directo'}</span>
                </p>
              </div>
            </div>

            {/* Controls: Bot Switch & Block Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleBot}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedContact.bot_enabled
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                {selectedContact.bot_enabled ? 'Bot Berta ON' : 'Bot OFF'}
              </button>

              <button
                onClick={handleToggleBlock}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedContact.blocked
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-red-400 border-slate-700'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                {selectedContact.blocked ? 'Bloqueado' : 'Bloquear'}
              </button>
            </div>
          </div>

          {/* Messages History List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-bg/60">
            {loadingMessages ? (
              <div className="text-center text-xs text-slate-500 my-auto">Cargando mensajes...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-slate-500 my-auto">Sin mensajes grabados en la conversación.</div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed border ${
                        isUser
                          ? 'bg-brand-500/15 border-brand-500/30 text-emerald-100 rounded-tr-none'
                          : 'bg-dark-card border-white/10 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {!isUser && (
                        <span className="text-[10px] font-bold text-brand-500 block mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Agente Berta
                        </span>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      <div className={`flex items-center justify-end gap-1 text-[10px] mt-1.5 ${isUser ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                        <span>{format(new Date(msg.created_at), 'HH:mm', { locale: es })}</span>

                        {!isUser && msg.status && (
                          <span title={`Estado WhatsApp: ${msg.status}`}>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                            ) : msg.status === 'sent' ? (
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Lead Qualification Insight Box */}
          {selectedContact.lead && (
            <div className="p-3 bg-dark-card border-t border-dark-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-500 shrink-0" />
                <div>
                  <span className="font-bold text-slate-200">
                    Calificación ({selectedContact.lead.score.toUpperCase()}):
                  </span>{' '}
                  <span className="text-slate-400">{selectedContact.lead.reason}</span>
                </div>
              </div>
            </div>
          )}

          {/* Manual Send Message Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-dark-border bg-dark-bg/80 flex items-center gap-2">
            <input
              type="text"
              placeholder="Escribí un mensaje manual al WhatsApp..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
            />
            <button
              type="submit"
              disabled={sending || !inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-glow"
            >
              <Send className="w-3.5 h-3.5 text-black" />
              Enviar
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 glass-panel rounded-2xl flex items-center justify-center p-8 text-center text-slate-500 text-sm">
          Selecciona una conversación de la izquierda para ver el chat.
        </div>
      )}
    </div>
  );
}
