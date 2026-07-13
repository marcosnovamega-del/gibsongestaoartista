-- ============================================================
--  GIBSON MANAGER PRO
--  Módulo: Prestação de Contas de Shows
--  Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela principal: um registro por show/cidade
CREATE TABLE IF NOT EXISTS prestacao_contas (
    id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
    artista_id      UUID          REFERENCES artistas(id) ON DELETE CASCADE,
    escritorio_id   UUID,
    evento_nome     VARCHAR(255)  NOT NULL,
    cidade          VARCHAR(255),
    data_show       DATE,
    cache_artista   NUMERIC(15,2) DEFAULT 0,
    nf_valor        NUMERIC(15,2) DEFAULT 0,
    comissao_valor  NUMERIC(15,2) DEFAULT 0,
    status          VARCHAR(50)   DEFAULT 'rascunho',   -- rascunho | fechado | aprovado
    observacoes     TEXT,
    created_at      TIMESTAMPTZ   DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- 2. Despesas por prestação (categorias pré-definidas + personalizadas)
CREATE TABLE IF NOT EXISTS prestacao_despesas (
    id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
    prestacao_id    UUID          REFERENCES prestacao_contas(id) ON DELETE CASCADE,
    categoria_nome  VARCHAR(255)  NOT NULL,
    tipo            VARCHAR(50)   DEFAULT 'padrao',   -- padrao | personalizado
    valor_cobrado   NUMERIC(15,2) DEFAULT 0,
    valor_gasto     NUMERIC(15,2) DEFAULT 0,
    ordem           INTEGER       DEFAULT 0,
    created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- 3. Checklist do contratante
CREATE TABLE IF NOT EXISTS prestacao_contratante (
    id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    prestacao_id    UUID         REFERENCES prestacao_contas(id) ON DELETE CASCADE,
    item_nome       VARCHAR(255) NOT NULL,
    responsabilidade VARCHAR(50) DEFAULT 'contratante',   -- contratante | artista
    status          VARCHAR(50)  DEFAULT 'pendente',      -- pendente | ok | nao_se_aplica
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prestacao_artista ON prestacao_contas(artista_id);
CREATE INDEX IF NOT EXISTS idx_prestacao_despesas ON prestacao_despesas(prestacao_id);
CREATE INDEX IF NOT EXISTS idx_prestacao_contratante ON prestacao_contratante(prestacao_id);

-- RLS (Row Level Security) — habilite se seu projeto usar RLS
-- ALTER TABLE prestacao_contas       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prestacao_despesas     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prestacao_contratante  ENABLE ROW LEVEL SECURITY;
