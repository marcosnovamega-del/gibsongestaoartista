/* ============================================================
   GIBSON MANAGER PRO — COMPARTILHAMENTO DE PROPOSTA
   modals-compartilhar.js  v1.0

   Gera link público + mensagens prontas para WhatsApp/Email
   ============================================================ */

// ── Abrir modal de compartilhamento ────────────────────────
Modals.showCompartilharProposta = async function (propostaId) {
    // Fechar modal anterior se houver
    document.getElementById('modalCompartilhar')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'modalCompartilhar';
    overlay.innerHTML = `
        <div class="modal-content" style="max-width:600px;max-height:90vh;overflow-y:auto;">
            <div class="modal-header" style="background:linear-gradient(135deg,#075e54,#128c7e);color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between;">
                <h3 style="margin:0;font-size:16px;"><i class="fab fa-whatsapp"></i> Compartilhar Proposta</h3>
                <button onclick="document.getElementById('modalCompartilhar').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;">×</button>
            </div>
            <div id="compartilharBody" style="padding:24px;">
                <div style="text-align:center;padding:24px;"><div class="loading-spinner"></div></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    await Modals._compartilharCarregar(propostaId);
};

// ── Carregar / re-renderizar o corpo do modal ───────────────
Modals._compartilharCarregar = async function (propostaId) {
    const body = document.getElementById('compartilharBody');
    if (!body) return;

    // Buscar proposta
    const { data: p, error } = await sbClient
        .from('propostas')
        .select('id,artista_id,link_token,link_ativo,cache_bruto,data_evento,cidade_evento,estado_evento,razao_social,nome_contratante')
        .eq('id', propostaId)
        .single();

    if (error || !p) { body.innerHTML = '<p style="color:red;">Erro ao carregar proposta.</p>'; return; }

    // Buscar nome do artista
    let artistaNome = '';
    if (p.artista_id) {
        const { data: ar } = await sbClient.from('artistas').select('nome').eq('id', p.artista_id).single();
        artistaNome = ar?.nome || '';
    }

    const contratante = p.razao_social || p.nome_contratante || 'Contratante';
    const cidadeUF    = [p.cidade_evento, p.estado_evento].filter(Boolean).join('/') || 'cidade';
    const dataShow    = p.data_evento
        ? new Date(p.data_evento + 'T12:00:00').toLocaleDateString('pt-BR')
        : null;
    const cache       = p.cache_bruto
        ? new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(p.cache_bruto)
        : '';

    const linkAtivo  = !!p.link_ativo;
    const linkToken  = p.link_token;
    const linkPublic = linkToken
        ? `${window.location.origin}/proposta-publica?token=${linkToken}`
        : null;

    // ── Mensagem WhatsApp ─────────────────────────────────
    const msgWpp = artistaNome
        ? `Olá${contratante ? ', ' + contratante : ''}! 👋\n\nSegue a proposta de *${artistaNome.toUpperCase()}* para o show${dataShow ? ' em *' + dataShow + '*' : ''} em *${cidadeUF}*.\n\n${cache ? '💰 Valor: *' + cache + '*\n\n' : ''}${linkPublic && linkAtivo ? '🔗 Acesse a proposta completa:\n' + linkPublic + '\n\n' : ''}Qualquer dúvida, estou à disposição!\n\nAtt,\nDFG Produções e Eventos`
        : '';

    // ── Mensagem Email ────────────────────────────────────
    const assuntoEmail = `Proposta Artística — ${artistaNome.toUpperCase()}${dataShow ? ' · ' + dataShow : ''}`;
    const corpoEmail   = `Prezado(a) ${contratante},\n\nConforme conversado, segue proposta para a contratação do(a) artista ${artistaNome.toUpperCase()} para apresentação em ${cidadeUF}${dataShow ? ', no dia ' + dataShow : ''}.\n\n${cache ? 'Valor total: ' + cache + '\n\n' : ''}${linkPublic && linkAtivo ? 'Acesse a proposta completa pelo link:\n' + linkPublic + '\n\n' : ''}Ficamos à disposição para quaisquer esclarecimentos.\n\nAtenciosamente,\nDFG Produções e Eventos\n(34) 99902-0200`;

    body.innerHTML = `
        <!-- Info da proposta -->
        <div style="background:var(--bg-secondary,#f5f5f5);border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;">
            <strong>${artistaNome}</strong> · ${cidadeUF}${dataShow ? ' · ' + dataShow : ''}${cache ? ' · <span style="color:#e8261c;">' + cache + '</span>' : ''}
        </div>

        <!-- ── SEÇÃO LINK PÚBLICO ── -->
        <div style="border:1px solid var(--border-color,#e0e0e0);border-radius:10px;padding:18px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div>
                    <h4 style="margin:0;font-size:14px;font-weight:700;">🔗 Link público da proposta</h4>
                    <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted,#888);">Qualquer pessoa com o link pode visualizar a proposta formatada</p>
                </div>
                <label class="toggle-switch" style="cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;">
                    <input type="checkbox" id="toggleLinkAtivo" ${linkAtivo ? 'checked' : ''}
                        onchange="Modals._compartilharToggleLink('${propostaId}', this.checked)"
                        style="width:0;height:0;opacity:0;position:absolute;">
                    <span id="toggleLinkSpan" style="display:inline-flex;width:44px;height:24px;background:${linkAtivo ? '#22c55e' : '#d1d5db'};border-radius:12px;position:relative;transition:.2s;">
                        <span style="position:absolute;top:3px;left:${linkAtivo ? '23px' : '3px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2);"></span>
                    </span>
                    <span id="toggleLinkLabel">${linkAtivo ? 'Ativo' : 'Inativo'}</span>
                </label>
            </div>

            ${linkPublic ? `
            <div id="linkBox" style="display:${linkAtivo ? 'flex' : 'none'};gap:8px;align-items:center;">
                <input type="text" id="linkPublicInput" value="${linkPublic}" readonly
                    style="flex:1;font-size:12px;padding:8px 12px;border:1px solid var(--border-color,#e0e0e0);border-radius:6px;background:var(--bg-secondary,#f9f9f9);color:var(--text-primary,#333);"
                    onclick="this.select()">
                <button onclick="Modals._copiarTexto('${linkPublic}', this)" title="Copiar link"
                    style="padding:8px 14px;background:#e8261c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">
                    <i class="fas fa-copy"></i> Copiar
                </button>
                <a href="${linkPublic}" target="_blank" title="Abrir"
                    style="padding:8px 12px;background:var(--bg-secondary,#f0f0f0);border:1px solid var(--border-color,#e0e0e0);border-radius:6px;color:var(--text-primary,#333);text-decoration:none;font-size:13px;">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
            <p id="linkBoxInativo" style="display:${linkAtivo ? 'none' : 'block'};font-size:12px;color:var(--text-muted,#999);margin-top:8px;">
                Ative o link para compartilhar. Você pode desativar a qualquer momento.
            </p>
            ` : `<p style="font-size:12px;color:var(--text-muted,#999);">Ativando o link, um endereço único será gerado para esta proposta.</p>`}
        </div>

        <!-- ── WHATSAPP ── -->
        <div style="border:1px solid #25D36622;border-radius:10px;padding:18px;margin-bottom:16px;background:#f0fdf4;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <h4 style="margin:0;font-size:14px;font-weight:700;color:#166534;"><i class="fab fa-whatsapp" style="color:#25D366;margin-right:6px;"></i>Mensagem WhatsApp</h4>
                <button onclick="Modals._copiarTexto(document.getElementById('msgWpp').value, this)"
                    style="padding:6px 14px;background:#25D366;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">
                    <i class="fas fa-copy"></i> Copiar
                </button>
            </div>
            <textarea id="msgWpp" style="width:100%;min-height:120px;font-size:12px;line-height:1.55;padding:10px 12px;border:1px solid #bbf7d0;border-radius:6px;resize:vertical;background:#fff;color:#1a1a1a;">${msgWpp}</textarea>
        </div>

        <!-- ── EMAIL ── -->
        <div style="border:1px solid #dbeafe;border-radius:10px;padding:18px;background:#eff6ff;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <h4 style="margin:0;font-size:14px;font-weight:700;color:#1e40af;"><i class="fas fa-envelope" style="color:#3b82f6;margin-right:6px;"></i>Template de Email</h4>
                <div style="display:flex;gap:6px;">
                    <button onclick="Modals._copiarTexto(document.getElementById('assuntoEmail').value, this)"
                        style="padding:6px 14px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">
                        Copiar assunto
                    </button>
                    <button onclick="Modals._copiarTexto(document.getElementById('corpoEmail').value, this)"
                        style="padding:6px 14px;background:#1e40af;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">
                        Copiar corpo
                    </button>
                </div>
            </div>
            <div style="margin-bottom:8px;">
                <label style="font-size:11px;font-weight:600;color:#1e40af;">ASSUNTO</label>
                <input id="assuntoEmail" type="text" value="${assuntoEmail}"
                    style="width:100%;margin-top:4px;font-size:12px;padding:7px 10px;border:1px solid #bfdbfe;border-radius:6px;background:#fff;">
            </div>
            <label style="font-size:11px;font-weight:600;color:#1e40af;">CORPO</label>
            <textarea id="corpoEmail" style="width:100%;min-height:140px;font-size:12px;line-height:1.55;padding:10px 12px;border:1px solid #bfdbfe;border-radius:6px;resize:vertical;background:#fff;color:#1a1a1a;margin-top:4px;">${corpoEmail}</textarea>
        </div>
    `;
};

// ── Toggle ativar / desativar link ──────────────────────────
Modals._compartilharToggleLink = async function (propostaId, ativar) {
    const labelEl  = document.getElementById('toggleLinkLabel');
    const spanEl   = document.getElementById('toggleLinkSpan');
    const dotEl    = spanEl?.querySelector('span');
    const linkBox  = document.getElementById('linkBox');
    const linkInativo = document.getElementById('linkBoxInativo');

    if (labelEl) labelEl.textContent = ativar ? 'Ativo' : 'Inativo';
    if (spanEl)  spanEl.style.background = ativar ? '#22c55e' : '#d1d5db';
    if (dotEl)   dotEl.style.left = ativar ? '23px' : '3px';

    // Gerar token se ainda não existir
    let token = null;
    if (ativar) {
        const { data: atual } = await sbClient.from('propostas').select('link_token').eq('id', propostaId).single();
        token = atual?.link_token;
        if (!token) {
            // uuid v4 simples sem dependência
            token = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        }
    }

    await sbClient.from('propostas').update({
        link_ativo: ativar,
        ...(token ? { link_token: token } : {}),
    }).eq('id', propostaId);

    if (ativar && token) {
        const linkPublic = `${window.location.origin}/proposta-publica?token=${token}`;
        const inputEl = document.getElementById('linkPublicInput');
        if (inputEl) { inputEl.value = linkPublic; }
        else {
            // Criar campo se não existia ainda
            if (linkBox) {
                linkBox.innerHTML = `
                    <input type="text" id="linkPublicInput" value="${linkPublic}" readonly
                        style="flex:1;font-size:12px;padding:8px 12px;border:1px solid var(--border-color,#e0e0e0);border-radius:6px;background:var(--bg-secondary,#f9f9f9);"
                        onclick="this.select()">
                    <button onclick="Modals._copiarTexto('${linkPublic}', this)"
                        style="padding:8px 14px;background:#e8261c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                    <a href="${linkPublic}" target="_blank"
                        style="padding:8px 12px;background:var(--bg-secondary,#f0f0f0);border:1px solid var(--border-color,#e0e0e0);border-radius:6px;color:var(--text-primary,#333);text-decoration:none;font-size:13px;">
                        <i class="fas fa-external-link-alt"></i>
                    </a>`;
            }
        }
        // Atualizar o link nas mensagens
        const wppEl = document.getElementById('msgWpp');
        const emailEl = document.getElementById('corpoEmail');
        if (wppEl && !wppEl.value.includes(linkPublic)) {
            wppEl.value = wppEl.value.replace(/\n\nQualquer/, `\n\n🔗 Acesse a proposta:\n${linkPublic}\n\nQualquer`);
        }
        if (emailEl && !emailEl.value.includes(linkPublic)) {
            emailEl.value = emailEl.value.replace(/\n\nFicamos/, `\n\nAcesse a proposta:\n${linkPublic}\n\nFicamos`);
        }
    }

    if (linkBox)    linkBox.style.display    = ativar ? 'flex' : 'none';
    if (linkInativo) linkInativo.style.display = ativar ? 'none' : 'block';
};

// ── Utilitário: copiar texto com feedback visual ─────────────
Modals._copiarTexto = function (texto, btnEl) {
    navigator.clipboard.writeText(texto).then(() => {
        const orig = btnEl?.innerHTML;
        if (btnEl) { btnEl.innerHTML = '<i class="fas fa-check"></i> Copiado!'; }
        setTimeout(() => { if (btnEl && orig) btnEl.innerHTML = orig; }, 2000);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = texto;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        if (btnEl) {
            const orig = btnEl.innerHTML;
            btnEl.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            setTimeout(() => { btnEl.innerHTML = orig; }, 2000);
        }
    });
};
