# 🔧 GIBSON MANAGER PRO - Documentação Técnica

## Estrutura de Arquivos

```
gibson-manager-pro/
│
├── index.html (6.4 KB)
│   └── Página principal SPA com estrutura de login e app
│
├── README.md (12 KB)
│   └── Documentação completa do projeto
│
├── css/
│   └── style.css (15.5 KB)
│       └── Tema escuro completo, componentes e responsivo
│
└── js/
    ├── database.js (11.3 KB) - API e funções de banco de dados
    ├── auth.js (5.0 KB) - Sistema de autenticação e permissões
    ├── utils.js (11.7 KB) - Funções utilitárias e helpers
    ├── pages.js (29.8 KB) - Dashboard e páginas de Artistas
    ├── pages-eventos.js (18.1 KB) - Agenda, Eventos e Contratos
    ├── pages-financeiro.js (23.3 KB) - Financeiro, Equipe e Alertas
    ├── pages-usuarios.js (16.3 KB) - Usuários e Configurações
    ├── modals.js (28.1 KB) - Modals principais (Artista, Equipe, Evento)
    ├── modals-extra.js (25.4 KB) - Modals extras (Despesas, Usuário, etc)
    ├── init-data.js (15.3 KB) - População de dados iniciais
    └── main.js (6.1 KB) - Inicialização e controle principal
```

**Total:** ~190 KB de código fonte

---

## Fluxo de Dados

### Autenticação
```
Login Form → Auth.login() → UsuariosDB.buscarPorUsername() → localStorage → showMainApp()
```

### Criação de Evento
```
EventoModal → submitEventoForm() → EventosDB.criar() → gerarContratoEvento() → ContratosDB.criar() → renderEventos()
```

### Cálculo de Lucro
```
Evento.valor_liquido - DespesasDB.calcularTotalEvento() = Lucro Líquido
```

---

## APIs e Endpoints

### RESTful Table API

**Base URL:** `tables/`

#### Eventos
```javascript
GET    /tables/eventos?limit=1000
GET    /tables/eventos/{id}
POST   /tables/eventos
PUT    /tables/eventos/{id}
PATCH  /tables/eventos/{id}
DELETE /tables/eventos/{id}
```

#### Artistas
```javascript
GET    /tables/artistas?limit=1000
POST   /tables/artistas
PATCH  /tables/artistas/{id}
```

#### Despesas
```javascript
GET    /tables/despesas_evento?limit=1000
POST   /tables/despesas_evento
PATCH  /tables/despesas_evento/{id}
DELETE /tables/despesas_evento/{id}
```

---

## Sistema de Permissões

### Matriz de Acesso

| Módulo       | Admin | Manager | Financeiro | Produção |
|--------------|-------|---------|------------|----------|
| Dashboard    | ✅    | ✅      | ✅         | ✅       |
| Artistas     | CRUD  | View    | View       | View     |
| Eventos      | CRUD  | CRUD*   | View       | View     |
| Contratos    | CRUD  | View*   | View       | -        |
| Financeiro   | CRUD  | View*   | CRUD       | -        |
| Equipe       | CRUD  | CRUD*   | View       | View     |
| Alertas      | View  | View    | View       | View     |
| Usuários     | CRUD  | -       | -          | -        |
| Configurações| CRUD  | View    | View       | View     |

*Manager acessa apenas dados do artista vinculado

---

## Variáveis de Contrato

### Variáveis Disponíveis
```
{{razao_social}}    → Razão social ou nome do contratante
{{cnpj_cpf}}        → CNPJ (PJ) ou CPF (PF)
{{nome_artista}}    → Nome do artista
{{data_evento}}     → Data formatada do evento
{{local_evento}}    → Nome do local
{{cidade_evento}}   → Cidade/UF
{{valor_total}}     → Cachê bruto formatado
```

### Exemplo de Uso
```
CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{razao_social}}
CNPJ/CPF: {{cnpj_cpf}}
CONTRATADO: {{nome_artista}}

O CONTRATADO realizará apresentação em {{data_evento}},
no local {{local_evento}}, {{cidade_evento}},
pelo valor de {{valor_total}}.
```

---

## Cálculos Financeiros

### 1. Valor Líquido do Evento
```javascript
valor_liquido = cache_bruto - (cache_bruto * comissao / 100)
```

### 2. Total de Despesas
```javascript
total_despesas = sum(despesas_evento.valor)
```

### 3. Lucro Líquido
```javascript
lucro_liquido = valor_liquido - total_despesas
```

### 4. Margem de Lucro
```javascript
margem = (lucro_liquido / valor_liquido) * 100
```

### 5. Totais do Mês
```javascript
// Itera sobre eventos do mês
for (evento of eventos_mes) {
    receita_total += evento.valor_liquido
    despesas_total += calcularTotalEvento(evento.id)
}
lucro_total = receita_total - despesas_total
margem_mes = (lucro_total / receita_total) * 100
```

---

## Funções Principais

### Database.js
```javascript
DB.getAll(tableName, useCache)      // Buscar todos registros
DB.getById(tableName, id)           // Buscar por ID
DB.create(tableName, data)          // Criar novo
DB.update(tableName, id, data)      // Atualizar completo
DB.patch(tableName, id, data)       // Atualizar parcial
DB.delete(tableName, id)            // Deletar (soft)
DB.search(tableName, filters)       // Buscar com filtros
```

### Auth.js
```javascript
Auth.login(username, password)      // Fazer login
Auth.logout()                       // Fazer logout
Auth.hasPermission(permission)      // Verificar permissão
Auth.isAdmin()                      // É admin?
Auth.canEdit(dataType, itemId)      // Pode editar?
Auth.canDelete(dataType, itemId)    // Pode deletar?
```

### Utils.js
```javascript
Utils.formatCurrency(value)         // R$ 1.234,56
Utils.formatDate(date)              // 25/02/2026
Utils.formatCPF(cpf)                // 123.456.789-00
Utils.formatCNPJ(cnpj)              // 12.345.678/0001-99
Utils.validateEmail(email)          // true/false
Utils.showToast(message, type)      // Notificação
Utils.confirm(message)              // Confirmação
Utils.calcularLucroEvento(id)       // Lucro do evento
```

### Pages.js
```javascript
Pages.renderDashboard()             // Renderizar dashboard
Pages.renderArtistas()              // Renderizar artistas
Pages.renderArtistaProfile(id)      // Perfil do artista
Pages.renderEventos()               // Renderizar eventos
Pages.renderFinanceiro()            // Renderizar financeiro
Pages.changePage(page)              // Mudar página
```

### Modals.js
```javascript
Modals.showArtistaModal(id)         // Modal de artista
Modals.showEventoModal(id)          // Modal de evento
Modals.showEquipeModal(id, artistaId) // Modal de equipe
Modals.showDespesasModal(eventoId)  // Modal de despesas
Modals.showUsuarioModal(id)         // Modal de usuário
Modals.close()                      // Fechar modal
```

---

## Performance

### Cache Local
```javascript
DB.cache = {
    artistas: null,
    eventos: null,
    usuarios: null,
    // ... outras tabelas
}
```

O sistema utiliza cache em memória para reduzir requisições à API. O cache é limpo automaticamente após criar/editar/deletar.

### Lazy Loading
- Gráficos são renderizados apenas quando necessário
- Dados são carregados sob demanda
- Imagens de artistas com lazy loading

---

## Validações

### Frontend
- ✅ Campos obrigatórios
- ✅ Formato de email
- ✅ Formato de CPF/CNPJ
- ✅ Valores numéricos positivos
- ✅ Datas válidas

### Backend (Recomendado para Produção)
- [ ] Validação de tipos
- [ ] Validação de unicidade
- [ ] Sanitização de dados
- [ ] Prevenção de SQL injection
- [ ] Rate limiting

---

## Tratamento de Erros

### Try-Catch Global
```javascript
try {
    const result = await DB.create('artistas', data);
    if (result) {
        Utils.showToast('Sucesso!', 'success');
    } else {
        Utils.showToast('Erro ao salvar', 'error');
    }
} catch (error) {
    console.error('Erro:', error);
    Utils.showToast('Erro inesperado', 'error');
}
```

### Loading States
```javascript
Utils.showLoading();     // Mostra overlay de loading
// ... operação assíncrona ...
Utils.hideLoading();     // Remove overlay
```

---

## Boas Práticas Implementadas

### Código
- ✅ Comentários descritivos em português
- ✅ Nomenclatura consistente
- ✅ Separação de responsabilidades
- ✅ Modularização por funcionalidade
- ✅ Uso de async/await
- ✅ Tratamento de erros

### UI/UX
- ✅ Feedback visual em todas ações
- ✅ Loading states
- ✅ Confirmações para ações críticas
- ✅ Mensagens de erro claras
- ✅ Design responsivo
- ✅ Acessibilidade básica

### Segurança
- ✅ Validação de inputs
- ✅ Controle de acesso por perfil
- ✅ Sanitização de dados exibidos
- ⚠️ Senhas em texto plano (melhorar em produção)

---

## Testes Manuais Realizados

### ✅ Autenticação
- Login com usuários diferentes
- Logout e re-login
- Validação de credenciais inválidas
- Manutenção de sessão

### ✅ Navegação
- Troca entre páginas
- Menu mobile
- Permissões por perfil
- Breadcrumbs e voltar

### ✅ CRUD Artistas
- Criar novo artista
- Editar artista existente
- Visualizar perfil
- Pausar artista

### ✅ CRUD Eventos
- Criar evento PJ e PF
- Editar evento
- Adicionar despesas
- Calcular lucro
- Gerar contrato

### ✅ Financeiro
- Visualizar KPIs
- Marcar parcelas como pagas
- Visualizar gráficos
- Exportar dados

### ✅ Responsividade
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

---

## Deployment

### Requisitos
- Servidor web (Apache/Nginx)
- Suporte a HTML5 e JavaScript ES6+
- API RESTful configurada

### Passos
1. Upload dos arquivos para o servidor
2. Configurar endpoint da API em `database.js`
3. Testar login e funcionalidades
4. Configurar HTTPS
5. Configurar backup automático

---

## Troubleshooting

### Problema: Dados não carregam
**Solução:** Verificar console do navegador, verificar se API está respondendo

### Problema: Erro ao fazer login
**Solução:** Verificar se dados iniciais foram populados, verificar console

### Problema: Gráficos não aparecem
**Solução:** Verificar se Chart.js foi carregado, verificar console

### Problema: Modal não abre
**Solução:** Verificar se há erro JavaScript, verificar se container existe

---

## Contato Técnico

Para suporte técnico ou dúvidas sobre o sistema:

**Desenvolvedor:** Gibson Team
**Email:** dev@gibsonpromocoes.com.br
**Versão:** 1.0.0 MVP
**Data:** Fevereiro 2026

---

*Documentação gerada automaticamente - Gibson Manager Pro v1.0.0*