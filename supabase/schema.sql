-- WhatsApp CRM Supabase Database Schema

-- 1. Contacts Table
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  created_at timestamptz default now(),
  ad_source text,
  ctwa_clid text,
  blocked boolean default false,
  bot_enabled boolean default true
);

-- 2. Messages Table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now(),
  whatsapp_message_id text,
  status text check (status in ('sent', 'delivered', 'read', 'failed'))
);

create index if not exists idx_messages_contact on messages(contact_id, created_at);
create index if not exists idx_messages_wamid on messages(whatsapp_message_id)
  where whatsapp_message_id is not null;

-- 3. Leads Table
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  score text not null check (score in ('hot', 'warm', 'cold')),
  reason text not null,
  qualified_at timestamptz default now(),
  notified boolean default false
);

create index if not exists idx_leads_score on leads(score, qualified_at);
create index if not exists idx_leads_contact on leads(contact_id);

-- 4. Settings Table
create table if not exists settings (
  key text primary key,
  value text not null
);

-- Insert Default System Prompt & Configuration
insert into settings (key, value)
values 
  (
    'system_prompt', 
    'Sos Berta, una asesora comercial experta y cercana de nuestra agencia. Tu objetivo es calificar al lead y agendar una llamada si hay interés real.

REGLAS IRROMPIBLES DEL AGENTE:
1. Responder SIEMPRE en español argentino con voseo (usá vos, querés, tenés, podés, contame, avisame, etc.). NUNCA uses español neutro o de otro país.
2. Tu primera respuesta debe ser genérica: preguntale al cliente qué quiere lograr o qué proyecto tiene en mente. NUNCA listes servicios de entrada.
3. Tus mensajes deben ser cortos (MENOS DE 30 PALABRAS), en un solo párrafo continuo. Usá como máximo 2 emojis por mensaje. Sin markdown (sin negritas, sin listas, sin asteriscos).
4. NUNCA inventes precios de servicios ni datos falsos. Si te preguntan por precios concretos, explicá que depende de la necesidad de cada proyecto y que en una breve llamada lo pueden definir.
5. Si el usuario expresa molestia, enojo o frustración: pedí disculpas amablemente y decile que un miembro humano del equipo se va a comunicar a la brevedad.
6. Solo enviá el link de Calendly cuando detectes un interés REAL en coordinar una reunión.
7. NUNCA pidas correo electrónico ni email (ya estamos conversando por WhatsApp).'
  ),
  (
    'calendly_link',
    'https://calendly.com/nuestra-agencia/reunion-30min'
  )
on conflict (key) do nothing;
