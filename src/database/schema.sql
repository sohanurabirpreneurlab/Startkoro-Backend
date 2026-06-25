create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  mobile_number text not null,
  address text not null,
  password_hash text not null,
  role text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table users add column if not exists mobile_number text;
alter table users add column if not exists address text;

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  sender text not null check (sender in ('user', 'assistant', 'system')),
  content text not null,
  tokens_used int default 0,
  model text,
  created_at timestamptz default now()
);

create table if not exists knowledge_upload_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references users(id) on delete set null,
  file_name text,
  file_type text,
  total_rows int default 0,
  success_count int default 0,
  failed_count int default 0,
  skipped_count int default 0,
  status text default 'processing',
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists knowledge_documents (
  id bigserial primary key,
  title text not null,
  source_type text default 'manual_qa',
  original_question text,
  original_answer text,
  normalized_question text,
  status text default 'ready',
  uploaded_by uuid references users(id) on delete set null,
  batch_id uuid references knowledge_upload_batches(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table knowledge_documents add column if not exists normalized_question text;
alter table knowledge_documents add column if not exists batch_id uuid;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'knowledge_documents_batch_id_fkey'
  ) then
    alter table knowledge_documents
    add constraint knowledge_documents_batch_id_fkey
    foreign key (batch_id) references knowledge_upload_batches(id) on delete set null;
  end if;
end;
$$;

create table if not exists document_chunks (
  id bigserial primary key,
  document_id bigint references knowledge_documents(id) on delete cascade,
  chunk_index int not null,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz default now()
);

create or replace function match_document_chunks (
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id bigint,
  document_id bigint,
  chunk_text text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.chunk_text,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.embedding is not null
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

create index if not exists chats_user_id_idx on chats(user_id);
create index if not exists messages_chat_id_idx on messages(chat_id);
create index if not exists knowledge_documents_uploaded_by_idx on knowledge_documents(uploaded_by);
create unique index if not exists knowledge_documents_normalized_question_idx
on knowledge_documents(normalized_question)
where normalized_question is not null;
create index if not exists knowledge_documents_batch_id_idx on knowledge_documents(batch_id);
create index if not exists knowledge_upload_batches_uploaded_by_idx on knowledge_upload_batches(uploaded_by);
create index if not exists document_chunks_document_id_idx on document_chunks(document_id);
create index if not exists document_chunks_embedding_idx
on document_chunks
using hnsw (embedding vector_cosine_ops);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
before update on users
for each row
execute function set_updated_at();

drop trigger if exists chats_set_updated_at on chats;
create trigger chats_set_updated_at
before update on chats
for each row
execute function set_updated_at();

drop trigger if exists knowledge_documents_set_updated_at on knowledge_documents;
create trigger knowledge_documents_set_updated_at
before update on knowledge_documents
for each row
execute function set_updated_at();

create or replace function touch_chat_updated_at()
returns trigger
language plpgsql
as $$
begin
  update chats
  set updated_at = now()
  where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_chat_updated_at on messages;
create trigger messages_touch_chat_updated_at
after insert on messages
for each row
execute function touch_chat_updated_at();
