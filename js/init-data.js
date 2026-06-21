/* ========================================
   KSHOW MANAGER - DADOS INICIAIS
   População de dados de exemplo
======================================== */

// Inicializar dados apenas uma vez (verifica no Supabase)
(async function initializeData() {
    // Aguardar sbClient estar disponível
    if (!sbClient) {
        console.warn('⚠️ sbClient não disponível, pulando inicialização');
        return;
    }

    // Verificar se já existem dados no banco real
    const { data: usuariosExistentes, error } = await sbClient
        .from('usuarios')
        .select('id')
        .limit(1);

    if (error) {
        console.error('❌ Erro ao verificar dados iniciais:', error.message);
        return;
    }
    
    if (usuariosExistentes && usuariosExistentes.length > 0) {
        console.log('✅ Banco de dados já possui dados. Inicialização ignorada.');
        return;
    }

    console.log('🔄 Banco vazio detectado. Inicializando dados de exemplo...');

    try {
        // 1. Criar configurações
        await ConfigDB.atualizar({
            nome_empresa: 'Gibson Promoções',
            cnpj: '12345678000190',
            endereco: 'Rua da Música, 100 - Centro',
            telefone: '11987654321',
            email: 'contato@gibsonpromocoes.com.br',
            logo_url: 'https://ui-avatars.com/api/?name=Gibson&background=D4AF37&color=fff&size=200&bold=true',
            comissao_padrao: 10
        });

        // 2. Criar usuário Admin
        const adminCriado = await UsuariosDB.criar({
            username: 'admin',
            password: 'admin123',
            nome: 'Administrador Gibson',
            email: 'admin@gibsonpromocoes.com.br',
            nivel: 'Admin Master',
            artista_vinculado: null,
            permissoes: [],
            ativo: true
        });
        const adminId = adminCriado?.id;

        // 3. Criar 4 artistas iniciais — usar IDs retornados pelo banco
        const artista1Criado = await ArtistasDB.criar({
            nome: 'João Silva & Banda',
            foto: 'https://ui-avatars.com/api/?name=João+Silva&background=E10600&color=fff&size=200',
            status: 'Ativo',
            comissao_padrao: 10,
            modelo_contrato: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS

CONTRATANTE: {{razao_social}}
CNPJ/CPF: {{cnpj_cpf}}
CONTRATADO: {{nome_artista}}

Pelo presente instrumento particular, as partes acima qualificadas têm, entre si, justo e acordado o seguinte:

1. DO OBJETO
O CONTRATADO prestará serviços artísticos no evento a realizar-se em {{data_evento}}, no local {{local_evento}}, na cidade de {{cidade_evento}}.

2. DO VALOR
Pelo serviço prestado, o CONTRATANTE pagará ao CONTRATADO o valor de {{valor_total}}.

3. DAS OBRIGAÇÕES
O CONTRATADO se compromete a apresentar-se no horário acordado e realizar o show conforme combinado.

________________________
CONTRATANTE

________________________
CONTRATADO`,
        });
        const artista1Id = artista1Criado?.id;

        const artista2Criado = await ArtistasDB.criar({
            nome: 'Maria Estrela',
            foto: 'https://ui-avatars.com/api/?name=Maria+Estrela&background=E10600&color=fff&size=200',
            status: 'Ativo',
            comissao_padrao: 12,
            modelo_contrato: '',
        });
        const artista2Id = artista2Criado?.id;

        await ArtistasDB.criar({
            nome: 'Pedro Violão',
            foto: 'https://ui-avatars.com/api/?name=Pedro+Violão&background=E10600&color=fff&size=200',
            status: 'Ativo',
            comissao_padrao: 8,
            modelo_contrato: '',
        });

        await ArtistasDB.criar({
            nome: 'Ana Rock Band',
            foto: 'https://ui-avatars.com/api/?name=Ana+Rock&background=E10600&color=fff&size=200',
            status: 'Pausado',
            comissao_padrao: 15,
            modelo_contrato: '',
        });

        // 4. Criar equipe para artista 1
        await EquipeDB.criar({
            artista_id: artista1Id,
            nome: 'Carlos Batista',
            funcao: 'Baterista',
            cpf: '12345678900',
            email: 'carlos@email.com',
            telefone: '11987654321',
            tipo_vinculo: 'Fixo',
            valor_fixo: 500,
            percentual: 0,
            observacoes: 'Membro fixo da banda'
        });

        await EquipeDB.criar({
            artista_id: artista1Id,
            nome: 'Roberto Baixo',
            funcao: 'Baixista',
            cpf: '98765432100',
            email: 'roberto@email.com',
            telefone: '11987654322',
            tipo_vinculo: 'Fixo',
            valor_fixo: 500,
            percentual: 0,
            observacoes: ''
        });

        await EquipeDB.criar({
            artista_id: artista1Id,
            nome: 'Marcos Silva',
            funcao: 'Técnico de Som',
            cpf: '45678912300',
            email: 'marcos@email.com',
            telefone: '11987654323',
            tipo_vinculo: 'Por show',
            valor_fixo: 300,
            percentual: 0,
            observacoes: 'Contratado por show'
        });

        // 5. Criar eventos de exemplo
        const hoje = new Date();
        
        // Evento 1 - Próximo mês
        const dataEvento1 = new Date(hoje);
        dataEvento1.setDate(dataEvento1.getDate() + 15);
        
        const evento1Id = Utils.generateId();
        await EventosDB.criar({
            id: evento1Id,
            artista_id: artista1Id,
            data: dataEvento1.toISOString(),
            horario: '20:00',
            local: 'Casa de Shows Rock City',
            cidade: 'São Paulo',
            estado: 'SP',
            tipo_evento: 'Show',
            tipo_contratante: 'PJ',
            razao_social: 'Rock City Entretenimento LTDA',
            nome_fantasia: 'Rock City',
            cnpj: '12345678000199',
            nome_contratante: '',
            cpf_contratante: '',
            endereco: 'Rua do Rock, 500 - Vila Madalena',
            responsavel: 'Fernando Costa',
            email_contratante: 'fernando@rockcity.com.br',
            telefone_contratante: '11987654321',
            cache_bruto: 5000,
            comissao: 10,
            valor_liquido: 4500,
            alimentacao_inclusa: true,
            status: 'Confirmado'
        });

        // Criar despesas para evento 1
        await DespesasDB.criar({
            evento_id: evento1Id,
            tipo: 'Músicos',
            descricao: 'Pagamento equipe musical (2 músicos)',
            valor: 1000,
            status: 'Pendente',
            observacao: 'Pagar após o show'
        });

        await DespesasDB.criar({
            evento_id: evento1Id,
            tipo: 'Técnico',
            descricao: 'Técnico de som',
            valor: 300,
            status: 'Pendente',
            observacao: ''
        });

        await DespesasDB.criar({
            evento_id: evento1Id,
            tipo: 'Transfer',
            descricao: 'Transporte da equipe',
            valor: 200,
            status: 'Pendente',
            observacao: ''
        });

        // Evento 2 - Daqui a 30 dias
        const dataEvento2 = new Date(hoje);
        dataEvento2.setDate(dataEvento2.getDate() + 30);
        
        const evento2Id = Utils.generateId();
        await EventosDB.criar({
            id: evento2Id,
            artista_id: artista2Id,
            data: dataEvento2.toISOString(),
            horario: '19:00',
            local: 'Teatro Municipal',
            cidade: 'Rio de Janeiro',
            estado: 'RJ',
            tipo_evento: 'Show Acústico',
            tipo_contratante: 'PF',
            razao_social: '',
            nome_fantasia: '',
            cnpj: '',
            nome_contratante: 'João Pedro Santos',
            cpf_contratante: '12345678900',
            endereco: 'Av. Rio Branco, 200',
            responsavel: 'João Pedro Santos',
            email_contratante: 'joao@email.com',
            telefone_contratante: '21987654321',
            cache_bruto: 3000,
            comissao: 12,
            valor_liquido: 2640,
            alimentacao_inclusa: false,
            status: 'Confirmado'
        });

        // Criar despesas para evento 2
        await DespesasDB.criar({
            evento_id: evento2Id,
            tipo: 'Alimentação',
            descricao: 'Alimentação da equipe',
            valor: 150,
            status: 'Pendente',
            observacao: ''
        });

        await DespesasDB.criar({
            evento_id: evento2Id,
            tipo: 'Hotel',
            descricao: 'Hospedagem (2 diárias)',
            valor: 400,
            status: 'Pendente',
            observacao: ''
        });

        // Evento 3 - Mês passado (realizado)
        const dataEvento3 = new Date(hoje);
        dataEvento3.setDate(dataEvento3.getDate() - 20);
        
        const evento3Id = Utils.generateId();
        await EventosDB.criar({
            id: evento3Id,
            artista_id: artista1Id,
            data: dataEvento3.toISOString(),
            horario: '21:00',
            local: 'Festival de Verão',
            cidade: 'Salvador',
            estado: 'BA',
            tipo_evento: 'Festival',
            tipo_contratante: 'PJ',
            razao_social: 'Eventos Salvador LTDA',
            nome_fantasia: 'Salvador Eventos',
            cnpj: '98765432000188',
            nome_contratante: '',
            cpf_contratante: '',
            endereco: 'Av. Oceânica, 1000',
            responsavel: 'Carla Souza',
            email_contratante: 'carla@salvadoreventos.com.br',
            telefone_contratante: '71987654321',
            cache_bruto: 8000,
            comissao: 10,
            valor_liquido: 7200,
            alimentacao_inclusa: true,
            status: 'Realizado'
        });

        // Criar despesas para evento 3 (já pago)
        await DespesasDB.criar({
            evento_id: evento3Id,
            tipo: 'Músicos',
            descricao: 'Pagamento equipe',
            valor: 1000,
            status: 'Pago',
            observacao: 'Pago via transferência'
        });

        await DespesasDB.criar({
            evento_id: evento3Id,
            tipo: 'Aéreo',
            descricao: 'Passagens aéreas (ida e volta)',
            valor: 2000,
            status: 'Pago',
            observacao: ''
        });

        await DespesasDB.criar({
            evento_id: evento3Id,
            tipo: 'Hotel',
            descricao: 'Hotel (3 diárias)',
            valor: 900,
            status: 'Pago',
            observacao: ''
        });

        // 6. Criar contratos para os eventos
        const artista1 = await ArtistasDB.buscarPorId(artista1Id);
        const artista2 = await ArtistasDB.buscarPorId(artista2Id);

        // Contrato evento 1
        let contrato1 = artista1.modelo_contrato;
        const evento1 = await EventosDB.buscarPorId(evento1Id);
        contrato1 = contrato1.replace(/{{razao_social}}/g, evento1.razao_social);
        contrato1 = contrato1.replace(/{{cnpj_cpf}}/g, evento1.cnpj);
        contrato1 = contrato1.replace(/{{nome_artista}}/g, artista1.nome);
        contrato1 = contrato1.replace(/{{data_evento}}/g, Utils.formatDate(evento1.data));
        contrato1 = contrato1.replace(/{{local_evento}}/g, evento1.local);
        contrato1 = contrato1.replace(/{{cidade_evento}}/g, `${evento1.cidade}/${evento1.estado}`);
        contrato1 = contrato1.replace(/{{valor_total}}/g, Utils.formatCurrency(evento1.cache_bruto));

        await ContratosDB.criar({
            evento_id: evento1Id,
            artista_id: artista1Id,
            conteudo: contrato1,
            status: 'Pendente'
        });

        // Contrato evento 3 (assinado)
        let contrato3 = artista1.modelo_contrato;
        const evento3 = await EventosDB.buscarPorId(evento3Id);
        contrato3 = contrato3.replace(/{{razao_social}}/g, evento3.razao_social);
        contrato3 = contrato3.replace(/{{cnpj_cpf}}/g, evento3.cnpj);
        contrato3 = contrato3.replace(/{{nome_artista}}/g, artista1.nome);
        contrato3 = contrato3.replace(/{{data_evento}}/g, Utils.formatDate(evento3.data));
        contrato3 = contrato3.replace(/{{local_evento}}/g, evento3.local);
        contrato3 = contrato3.replace(/{{cidade_evento}}/g, `${evento3.cidade}/${evento3.estado}`);
        contrato3 = contrato3.replace(/{{valor_total}}/g, Utils.formatCurrency(evento3.cache_bruto));

        const dataAssinatura = new Date(evento3.data);
        dataAssinatura.setDate(dataAssinatura.getDate() - 10);

        await ContratosDB.criar({
            evento_id: evento3Id,
            artista_id: artista1Id,
            conteudo: contrato3,
            status: 'Assinado',
            data_assinatura: dataAssinatura.toISOString()
        });

        // 7. Criar parcelas
        // Parcela do evento 1 (vencendo)
        const vencimentoParcela1 = new Date(dataEvento1);
        vencimentoParcela1.setDate(vencimentoParcela1.getDate() + 5);

        await ParcelasDB.criar({
            evento_id: evento1Id,
            numero_parcela: 1,
            valor: 5000,
            data_vencimento: vencimentoParcela1.toISOString(),
            status: 'Pendente'
        });

        // Parcela do evento 3 (atrasada)
        const vencimentoParcela3 = new Date(hoje);
        vencimentoParcela3.setDate(vencimentoParcela3.getDate() - 5);

        await ParcelasDB.criar({
            evento_id: evento3Id,
            numero_parcela: 1,
            valor: 4000,
            data_vencimento: vencimentoParcela3.toISOString(),
            status: 'Pendente'
        });

        // Parcela do evento 3 - 2ª parcela (paga)
        const vencimentoParcela3_2 = new Date(dataEvento3);
        vencimentoParcela3_2.setDate(vencimentoParcela3_2.getDate() - 15);

        await ParcelasDB.criar({
            evento_id: evento3Id,
            numero_parcela: 2,
            valor: 4000,
            data_vencimento: vencimentoParcela3_2.toISOString(),
            status: 'Pago',
            data_pagamento: vencimentoParcela3_2.toISOString()
        });

        // 8. Criar usuário Manager vinculado ao artista 1
        const manager1Criado = await UsuariosDB.criar({
            username: 'manager1',
            password: 'manager123',
            nome: 'Gerente João Silva',
            email: 'gerente@gibsonpromocoes.com.br',
            nivel: 'Manager',
            artista_vinculado: artista1Id,
            permissoes: ['Dashboard', 'Artistas', 'Eventos', 'Equipe', 'Contratos', 'Alertas'],
            ativo: true
        });
        const manager1Id = manager1Criado?.id;

        // 9. Criar usuário Financeiro
        await UsuariosDB.criar({
            username: 'financeiro',
            password: 'financeiro123',
            nome: 'Financeiro Gibson',
            email: 'financeiro@gibsonpromocoes.com.br',
            nivel: 'Financeiro',
            artista_vinculado: null,
            permissoes: ['Dashboard', 'Financeiro', 'Eventos', 'Contratos', 'Alertas'],
            ativo: true
        });

        // 10. Criar usuário Artista (para o Portal do Artista)
        const artista1UserCriado = await UsuariosDB.criar({
            username: 'artista1',
            password: 'artista123',
            nome: 'João Silva (Artista)',
            email: 'joao@gibsonpromocoes.com.br',
            nivel: 'Artista',
            artista_vinculado: artista1Id,
            permissoes: ['Dashboard', 'Eventos', 'Financeiro', 'Alertas'],
            ativo: true
        });
        const artista1UserId = artista1UserCriado?.id;

        // 11. Criar vínculos usuario_artista (necessário para Auth.carregarArtistasVinculados)
        if (manager1Id && artista1Id) {
            await sbClient.from('usuario_artista').insert([
                { usuario_id: manager1Id, artista_id: artista1Id }
            ]);
        }
        if (artista1UserId && artista1Id) {
            await sbClient.from('usuario_artista').insert([
                { usuario_id: artista1UserId, artista_id: artista1Id }
            ]);
        }

        console.log('✅ Dados inicializados com sucesso!');
        console.log('👤 Usuários criados:');
        console.log('   - admin / admin123 (Admin Master)');
        console.log('   - manager1 / manager123 (Manager - João Silva)');
        console.log('   - financeiro / financeiro123 (Financeiro)');
        console.log('   - artista1 / artista123 (Portal do Artista)');
        console.log('🎸 4 artistas criados');
        console.log('🎪 3 eventos criados');
        console.log('💰 Dados financeiros completos');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar dados:', error);
    }
})();