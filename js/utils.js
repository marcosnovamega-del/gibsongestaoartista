/* ========================================
   KSHOW MANAGER - UTILITIES
   Funções auxiliares e formatadores
======================================== */

const Utils = {
    // Hash de senha usando SHA-256 (Web Crypto API nativa)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Verificar se senha é fraca/padrão
    isDefaultPassword(password) {
        const senhasPadrao = ['admin123', 'manager123', 'financeiro123', '123456', 'senha123', 'password'];
        return senhasPadrao.includes(password.toLowerCase());
    },

    // Validar força de senha
    validatePassword(password, username = '') {
        if (!password || password.length < 8) return { ok: false, msg: 'A senha deve ter no mínimo 8 caracteres.' };
        if (username && password.toLowerCase() === username.toLowerCase()) return { ok: false, msg: 'A senha não pode ser igual ao nome de usuário.' };
        if (this.isDefaultPassword(password)) return { ok: false, msg: 'Essa senha é muito comum. Escolha uma mais segura.' };
        return { ok: true };
    },

    // Gerar ID único
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Formatar moeda
    formatCurrency(value) {
        if (!value && value !== 0) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // Formatar data
    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    },

    // Formatar data e hora
    formatDateTime(date) {
        if (!date) return '-';
        return new Date(date).toLocaleString('pt-BR');
    },

    // Formatar data para input
    formatDateInput(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Formatar CPF
    formatCPF(cpf) {
        if (!cpf) return '';
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    // Formatar CNPJ
    formatCNPJ(cnpj) {
        if (!cnpj) return '';
        return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    },

    // Formatar telefone
    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    },

    // Remover formatação
    removeFormatting(value) {
        return value ? value.replace(/\D/g, '') : '';
    },

    // Validar email
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // Validar CPF
    validateCPF(cpf) {
        cpf = this.removeFormatting(cpf);
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
        
        let sum = 0;
        let remainder;
        
        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10))) return false;
        
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(10, 11))) return false;
        
        return true;
    },

    // Validar CNPJ
    validateCNPJ(cnpj) {
        cnpj = this.removeFormatting(cnpj);
        if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
        
        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        const digits = cnpj.substring(size);
        let sum = 0;
        let pos = size - 7;
        
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result != digits.charAt(0)) return false;
        
        size = size + 1;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;
        
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result != digits.charAt(1)) return false;
        
        return true;
    },

    // Calcular dias entre datas
    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
    },

    // Verificar se data está vencida
    isOverdue(date) {
        return new Date(date) < new Date();
    },

    // Obter nome do mês
    getMonthName(month) {
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return months[month];
    },

    // Calcular lucro líquido de evento
    async calcularLucroEvento(eventoId) {
        const evento = await EventosDB.buscarPorId(eventoId);
        if (!evento) return { receita: 0, despesas: 0, lucro: 0, margem: 0 };

        const receita = evento.valor_liquido || 0;
        const despesas = await DespesasDB.calcularTotalEvento(eventoId);
        const lucro = receita - despesas;
        const margem = receita > 0 ? (lucro / receita * 100).toFixed(2) : 0;

        return { receita, despesas, lucro, margem };
    },

    // Calcular totais financeiros do mês (Consolidado Escritório)
    async calcularTotaisMes(mes, ano) {
        const [eventos, todasDespesas, todasReceitas] = await Promise.all([
            EventosDB.buscarPorMes(mes, ano),
            DespesasDB.listar(),
            ReceitasDB.listar()
        ]);

        // Apenas eventos com contrato assinado entram no financeiro
        const STATUS_CONFIRMADOS = ['Confirmado', 'Realizado', 'Concluído', 'Encerrado', 'Finalizado'];
        const eventosConfirmados = eventos.filter(e => STATUS_CONFIRMADOS.includes(e.status));

        let receitaShows = 0;
        let despesasOperacionais = 0;

        // 1. Receitas e Despesas de Shows — só contratos assinados
        for (const evento of eventosConfirmados) {
            receitaShows += evento.valor_liquido || 0;
            const despEv = todasDespesas.filter(d => d.evento_id === evento.id);
            despesasOperacionais += despEv.reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
        }

        // 2. Receitas Manuais (Extra Shows)
        const receitasManuais = todasReceitas.filter(r => {
            const dt = new Date((r.data_recebimento || r.data || r.created_at) + 'T12:00:00');
            return dt.getMonth() === mes && dt.getFullYear() === ano;
        });
        const totalReceitasManuais = receitasManuais.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);

        // 3. Despesas Fixas / Administrativas (Sem evento_id)
        const despesasFixas = todasDespesas.filter(d => {
            if (d.evento_id) return false;
            const dataVenc = new Date((d.data_vencimento || d.data || d.created_at) + 'T12:00:00');
            return dataVenc.getMonth() === mes && dataVenc.getFullYear() === ano;
        });
        const totalFixas = despesasFixas.reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
        
        const receitaTotal = receitaShows + totalReceitasManuais;
        const despesasTotal = despesasOperacionais + totalFixas;
        const lucroTotal = receitaTotal - despesasTotal;
        const margem = receitaTotal > 0 ? (lucroTotal / receitaTotal * 100).toFixed(2) : 0;
        
        return {
            receita: receitaTotal,
            receitaShows,
            receitaManual: totalReceitasManuais,
            despesas: despesasTotal,
            despesasOperacionais,
            despesasFixas: totalFixas,
            lucro: lucroTotal,
            margem: margem,
            eventos: eventosConfirmados.length,
            totalEventos: eventos.length
        };
    },

    // Notificação toast
    showToast(message, type = 'success') {
        // Remove toasts anteriores
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Estilos inline para o toast
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Confirmar ação
    async confirm(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Confirmar</h3>
                    </div>
                    <div class="modal-body">
                        <p style="color: var(--text-secondary); margin: 0;">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancelBtn">Cancelar</button>
                        <button class="btn-primary" id="confirmBtn">Confirmar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('#confirmBtn').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });

            modal.querySelector('#cancelBtn').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    },

    // Loading overlay
    showLoading() {
        if (document.getElementById('loadingOverlay')) return;
        const loading = document.createElement('div');
        loading.id = 'loadingOverlay';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
        `;
        loading.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: var(--brand-primary);"></i>
                <p style="color: white; margin-top: 16px; font-weight: 500;">Carregando...</p>
            </div>
        `;
        document.body.appendChild(loading);
    },

    hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) loading.remove();
    },

    // Debounce para busca
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Exportar para Excel (usando SheetJS se disponível, senão CSV)
    exportToExcel(data, filename) {
        if (!data || data.length === 0) {
            this.showToast('Nenhum dado para exportar', 'error');
            return;
        }

        // Se o SheetJS (XLSX) estiver disponível via CDN
        if (window.XLSX) {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
            XLSX.writeFile(workbook, `${filename}.xlsx`);
            this.showToast('Arquivo Excel gerado com sucesso!');
        } else {
            // Fallback para CSV se a biblioteca não carregar
            this.exportToCSV(data, filename);
        }
    },

    // Exportar para CSV
    exportToCSV(data, filename) {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(';'),
            ...data.map(row => headers.map(header => {
                let val = row[header] === null || row[header] === undefined ? '' : row[header];
                // Remover quebras de linha e ponto-e-vírgula para não quebrar o CSV
                return typeof val === 'string' ? val.replace(/[\n\r;]/g, ' ') : val;
            }).join(';'))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
        this.showToast('Arquivo CSV gerado (XLSX indisponível)');
    },

    // Gerar link do WhatsApp
    generateWhatsAppLink(phone, message = '') {
        const cleaned = this.removeFormatting(phone);
        if (!cleaned) return '#';
        
        // Adicionar código do país se não tiver
        const fullPhone = cleaned.length <= 11 ? `55${cleaned}` : cleaned;
        const encodedMsg = encodeURIComponent(message);
        return `https://wa.me/${fullPhone}${message ? '?text=' + encodedMsg : ''}`;
    },

    // Impressão de Rider Técnico e Camarim
    async printRider(turneId, tipo) {
        const riders = await TurnesDB.listarRiders(turneId);
        const rider = riders?.find(r => r.tipo === tipo);
        if (!rider || !rider.itens) {
            this.showToast('O Rider não possui itens salvos.', 'error');
            return;
        }

        const turne = await TurnesDB.buscarPorId(turneId);
        const evento = await EventosDB.buscarPorId(turne.evento_id);
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);

        const html = `
            <html>
                <head>
                    <title>Rider ${tipo === 'TECNICO' ? 'Técnico' : 'de Camarim'} - ${artista?.nome || 'Artista'}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; background: #fff; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo { height: 60px; object-fit: contain; }
                        .title { font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; }
                        .subtitle { font-size: 14px; color: #555; }
                        .content { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
                        .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 10px; text-align: center; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 class="title">RIDER ${tipo === 'TECNICO' ? 'TÉCNICO E MAPA DE PALCO' : 'DE CAMARIM E ESTRUTURA'}</h1>
                            <div class="subtitle">Artista: <strong>${artista?.nome || 'Não definido'}</strong></div>
                            <div class="subtitle">Show: ${evento?.cidade || 'Não definido'} - ${evento?.data ? new Date(evento.data).toLocaleDateString('pt-BR') : 'Data Indefinida'}</div>
                        </div>
                        <img src="${artista?.foto || ''}" class="logo" style="border-radius: 8px;">
                    </div>
                    <div class="content">${rider.itens}</div>
                    <div class="footer">Documento gerado automaticamente pelo sistema Gibson Manager</div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    },

    // Impressão de Rooming List
    async printRoomingList(turneId) {
        const rooming = await TurnesDB.listarRooming(turneId);
        if (!rooming || rooming.length === 0) {
            this.showToast('Nenhum quarto distribuído para impressão.', 'error');
            return;
        }

        const hosp = await TurnesDB.obterHospedagem(turneId);
        const turne = await TurnesDB.buscarPorId(turneId);
        const evento = await EventosDB.buscarPorId(turne.evento_id);
        const artista = await ArtistasDB.buscarPorId(evento.artista_id);

        const html = `
            <html>
                <head>
                    <title>Rooming List - ${artista?.nome || 'Artista'}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; background: #fff; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                        .title { font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; }
                        .subtitle { font-size: 14px; color: #555; margin-bottom: 4px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ccc; padding: 12px; text-align: left; font-size: 12px; }
                        th { background: #f5f5f5; font-weight: 700; text-transform: uppercase; }
                        .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 10px; text-align: center; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 class="title">ROOMING LIST OFICIAL</h1>
                            <div class="subtitle">Artista: <strong>${artista?.nome || 'Não definido'}</strong></div>
                            <div class="subtitle">Hotel: <strong>${hosp?.hotel || 'Pendente'}</strong></div>
                            <div class="subtitle">Check-in: ${hosp?.checkin ? new Date(hosp.checkin).toLocaleString('pt-BR') : '-'} | Check-out: ${hosp?.checkout ? new Date(hosp.checkout).toLocaleString('pt-BR') : '-'}</div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th width="15%">QUARTO</th>
                                <th width="15%">TIPO</th>
                                <th width="30%">HÓSPEDE 1</th>
                                <th width="30%">HÓSPEDE 2</th>
                                <th width="10%">OBS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rooming.map(q => `
                                <tr>
                                    <td><strong>${q.quarto_numero || '—'}</strong></td>
                                    <td>${q.tipo_quarto || 'Padrão'}</td>
                                    <td>${q.hospede_1}</td>
                                    <td>${q.hospede_2 || ''}</td>
                                    <td>${q.observacoes || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="footer">Documento gerado automaticamente pelo sistema Gibson Manager</div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    },

    // Sanitizar HTML simples
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    // Scroll suave para elemento
    scrollToElement(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // Copiar para área de transferência
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Link copiado com sucesso!', 'success');
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            this.showToast('Erro ao copiar link', 'error');
        });
    }
};

// Adicionar estilos de animação para toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================================
// MÁSCARAS DE INPUT
// ============================================================
Utils.maskCNPJ = function(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 14);
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    el.value = v;
};

Utils.maskCPF = function(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    el.value = v;
};

Utils.maskPhone = function(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    el.value = v;
};

Utils.maskCEP = function(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 8);
    v = v.replace(/(\d{5})(\d)/, '$1-$2');
    el.value = v;
};