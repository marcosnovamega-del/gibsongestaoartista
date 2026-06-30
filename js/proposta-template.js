/* ============================================================
   GIBSON MANAGER — GERADOR DE PROPOSTA HTML (AUTÔNOMO)
   Abre em nova aba para impressão / salvar como PDF
   ============================================================ */

var PropostaTemplate = {};

PropostaTemplate.gerarAutonomo = function(proposta, dados) {
    var artistaNome = (proposta._artistaNome || '').toUpperCase();
    var cidade      = (proposta.cidade_evento || '').toUpperCase();
    var estado      = (proposta.estado_evento || '').toUpperCase();
    var cidadeEstado = cidade + (estado ? ', ' + estado : '');
    var cidadeStub   = cidade + (estado ? ' · ' + estado : '');

    // Tamanho da fonte do nome do artista
    var nomeLen = artistaNome.length;
    var nomeSize = nomeLen <= 4 ? 96 : nomeLen <= 8 ? 72 : nomeLen <= 12 ? 54 : nomeLen <= 16 ? 40 : 32;

    // Data do evento
    var MESES_EXT = ['janeiro','fevereiro','março','abril','maio','junho',
                     'julho','agosto','setembro','outubro','novembro','dezembro'];
    var MESES_ABR = ['JAN','FEV','MAR','ABR','MAI','JUN',
                     'JUL','AGO','SET','OUT','NOV','DEZ'];
    var dataObj   = proposta.data_evento ? new Date(proposta.data_evento + 'T12:00:00') : null;
    var diaMes    = dataObj ? String(dataObj.getDate()).padStart(2,'0') + ' ' + MESES_ABR[dataObj.getMonth()] : '—';
    var dataExt   = dataObj ? dataObj.getDate() + ' de ' + MESES_EXT[dataObj.getMonth()] + ' de ' + dataObj.getFullYear() : '—';

    // Duração
    var duracaoRaw  = dados.duracao || proposta.duracao_show || '90 min (noventa minutos) – 1h30m';
    var duracaoMin  = (duracaoRaw.match(/\d+\s*min/i) || ['90 MIN'])[0].toUpperCase();
    var duracaoText = duracaoRaw;

    // Cache
    var cacheTotal = proposta.cache_bruto || 0;
    var cacheFmt   = 'R$ ' + parseFloat(cacheTotal).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

    // Equipe
    var equipeNum  = dados.equipe || 20;
    var equipeText = equipeNum + ' pessoas (' + equipeNum + ' acompanhantes)';

    // Parágrafo de abertura
    var paragrafo = 'Conforme solicitado, segue abaixo proposta para a realização de <strong>1 (um) show</strong> com o cantor/a cantora <strong style="color:#e8261c;">' + artistaNome + '</strong>, na cidade de <strong>' + cidadeEstado + '</strong>.';

    // Itens do investimento
    var itens = dados.itens && dados.itens.length ? dados.itens : [
        { desc: 'Cachê artístico do cantor' },
        { desc: 'Direitos autorais e ECAD' },
        { desc: 'Apoio logístico — som, luz e palco para realização do show' },
        { desc: 'Jatinho (ida e volta)' },
    ];
    var itensHtml = itens.map(function(it, i) {
        var bg = i % 2 === 0 ? 'background:#fbf9f4;' : '';
        var brd = i > 0 ? 'border-top:1px solid #ece7dd;' : '';
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 18px;' + bg + brd + '">'
            + '<span style="width:6px;height:6px;background:#e8261c;transform:rotate(45deg);flex:none;"></span>'
            + '<span style="font-size:12.5px;color:#3a3a3e;font-weight:600;">' + it.desc + '</span>'
            + '</div>';
    }).join('');

    // Obrigações — parseia "LABEL: descrição" ou usa linha inteira
    var obgLinhas = (dados.obrigacoes || '').split('\n').filter(function(l){ return l.trim(); });
    var obgGrid = '';
    if (obgLinhas.length) {
        var obgItens = obgLinhas.map(function(l) {
            var sep = l.indexOf(':');
            if (sep > 0 && sep < 30) {
                return { label: l.substring(0, sep).trim(), desc: l.substring(sep+1).trim() };
            }
            return { label: '', desc: l.trim() };
        });
        obgGrid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 26px;">';
        for (var i = 0; i < obgItens.length; i += 2) {
            var a = obgItens[i];
            var b = obgItens[i+1] || null;
            obgGrid += '<div style="display:flex;gap:10px;font-size:12.5px;line-height:1.45;color:#3a3a3e;">'
                + (a.label ? '<strong style="color:#e8261c;">' + PropostaTemplate._capitalizar(a.label) + '</strong>' : '') + '</div>';
            obgGrid += b ? '<div style="display:flex;gap:10px;font-size:12.5px;line-height:1.45;color:#3a3a3e;">'
                + (b.label ? '<strong style="color:#e8261c;">' + PropostaTemplate._capitalizar(b.label) + '</strong>' : '') + '</div>' : '<div></div>';
            obgGrid += '<div style="font-size:12px;line-height:1.45;color:#6c6a64;margin-top:-6px;">' + a.desc + '</div>';
            obgGrid += b ? '<div style="font-size:12px;line-height:1.45;color:#6c6a64;margin-top:-6px;">' + b.desc + '</div>' : '<div></div>';
        }
        obgGrid += '</div>';
    } else {
        obgGrid = '<p style="font-size:12px;color:#6c6a64;">A combinar conforme contrato.</p>';
    }

    // Cronograma de parcelas
    var cronograma = dados.cronograma || [];
    var totalCronograma = cronograma.length;
    var parcelasHtml = '';
    if (totalCronograma > 0) {
        parcelasHtml = '<div style="display:grid;grid-template-columns:repeat(' + Math.min(totalCronograma,3) + ',1fr);gap:14px;margin-bottom:30px;">';
        cronograma.forEach(function(c, i) {
            var isLast = i === totalCronograma - 1;
            var bg     = isLast ? 'background:#1a1a1d;' : 'border:1px solid #ece7dd;';
            var cor    = isLast ? 'color:#fff;' : 'color:#e8261c;';
            var vencCor= isLast ? 'color:#a8a7ac;' : 'color:#6c6a64;';
            var vencFt = isLast ? 'color:#fff;' : 'color:#1a1a1d;';
            var dataVenc = c.venc ? new Date(c.venc + 'T12:00:00').toLocaleDateString('pt-BR') : '';
            var valFmt = 'R$ ' + parseFloat(c.valor||0).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
            var label  = c.desc || ((i+1) + 'ª Parcela');
            parcelasHtml += '<div style="' + bg + 'padding:18px;">'
                + '<div style="font-size:10.5px;letter-spacing:2px;color:' + (isLast ? '#8d8c92' : '#9a937f') + ';font-weight:700;text-transform:uppercase;margin-bottom:10px;">' + label + '</div>'
                + '<div style="font-family:Anton,sans-serif;font-size:30px;' + cor + 'line-height:1;">' + valFmt + '</div>'
                + (dataVenc ? '<div style="margin-top:12px;font-size:11.5px;' + vencCor + 'font-weight:600;">Vencimento <strong style="' + vencFt + '">' + dataVenc + '</strong></div>' : '')
                + '</div>';
        });
        parcelasHtml += '</div>';
    } else {
        parcelasHtml = '<div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:14px 18px;margin-bottom:30px;font-size:12.5px;color:#5c574d;">A combinar conforme contrato.</div>';
    }

    // Data de hoje
    var hoje = new Date();
    var datHoje = 'Uberlândia — MG, ' + hoje.getDate() + ' de ' + MESES_EXT[hoje.getMonth()] + ' de ' + hoje.getFullYear();

    // Validade
    var validadeDias = dados.validade || proposta.validade_proposta || 10;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proposta — ${artistaNome}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#e7e6e3; -webkit-font-smoothing:antialiased; font-family:Archivo,system-ui,sans-serif; color:#1a1a1d; }
.barra-acoes { position:fixed; top:0; left:0; right:0; background:#1a1a1d; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; z-index:999; box-shadow:0 2px 8px rgba(0,0,0,.3); }
.paginas { padding:80px 0 80px; display:flex; flex-direction:column; align-items:center; gap:40px; }
.pagina { width:794px; min-height:1123px; background:#fff; box-shadow:0 24px 60px -22px rgba(0,0,0,.35); display:flex; flex-direction:column; overflow:hidden; }

@media print {
  @page { size: A4 portrait; margin: 0; }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 210mm;
  }

  .barra-acoes { display: none !important; }

  .paginas {
    padding: 0 !important;
    gap: 0 !important;
    align-items: flex-start !important;
    display: block !important;
  }

  .pagina {
    width: 210mm !important;
    height: 297mm !important;
    min-height: 0 !important;
    max-height: 297mm !important;
    overflow: hidden !important;
    box-shadow: none !important;
    page-break-after: always !important;
    break-after: page !important;
  }

  .pagina:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
}
</style>
</head>
<body>

<!-- Barra de ações (some ao imprimir) -->
<div class="barra-acoes">
  <span style="font-family:Anton,sans-serif;font-size:18px;color:#e8261c;letter-spacing:2px;">DFG PRODUÇÕES</span>
  <div style="display:flex;gap:10px;">
    <button onclick="window.print()" style="background:#e8261c;color:#fff;border:none;padding:9px 22px;font-family:Anton,sans-serif;font-size:14px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;">⬇ Salvar / Imprimir PDF</button>
    <button onclick="window.close()" style="background:none;color:#b3aa97;border:1px solid #444;padding:9px 16px;font-size:13px;cursor:pointer;">Fechar</button>
  </div>
</div>

<div class="paginas">

  <!-- ========== PÁGINA 1 ========== -->
  <div class="pagina">

    <!-- HEADER ticket -->
    <div style="position:relative;height:260px;background:#f4efe5;overflow:hidden;display:flex;flex:none;">
      <!-- bloco vermelho esquerdo -->
      <div style="position:relative;width:170px;height:260px;flex:none;background:#e8261c;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 2px,transparent 2px 18px);"></div>
        <div style="position:absolute;top:18px;left:0;right:0;display:flex;justify-content:center;gap:12px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#fff;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.45);"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#fff;"></span>
        </div>
        <span style="transform:rotate(-90deg);white-space:nowrap;font-family:Anton,sans-serif;font-size:48px;letter-spacing:4px;color:#fff;text-transform:uppercase;line-height:1;">Ao Vivo</span>
        <span style="position:absolute;bottom:18px;left:0;right:0;text-align:center;font-size:11px;letter-spacing:3px;color:rgba(255,255,255,.7);font-weight:700;text-transform:uppercase;">Turnê 2026</span>
      </div>

      <!-- área creme -->
      <div style="flex:1;position:relative;padding:30px 40px 26px 40px;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="position:absolute;top:18px;left:40px;right:64px;display:flex;gap:13px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#e8261c;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#e8b3af;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#e8261c;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#e8b3af;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#e8261c;"></span>
        </div>

        <div style="margin-top:24px;display:flex;align-items:center;gap:10px;">
          <span style="display:inline-block;width:26px;height:3px;background:#1a1a1d;"></span>
          <span style="font-size:12px;letter-spacing:3px;font-weight:700;color:#1a1a1d;text-transform:uppercase;">DFG Produções &amp; Eventos</span>
        </div>

        <div>
          <div style="font-family:Anton,sans-serif;font-size:${nomeSize}px;line-height:.82;color:#e8261c;text-transform:uppercase;letter-spacing:1px;">${artistaNome}</div>
          <div style="margin-top:10px;font-size:13px;letter-spacing:2.5px;color:#5c574d;font-weight:700;text-transform:uppercase;">Show ao vivo · ${duracaoMin}</div>
        </div>

        <div style="display:flex;align-items:center;gap:14px;">
          <span style="background:#e8261c;color:#fff;font-family:Anton,sans-serif;font-size:14px;letter-spacing:1.2px;padding:8px 16px;text-transform:uppercase;">Proposta de Serviços Artísticos</span>
        </div>

        <!-- perfuração + stub -->
        <div style="position:absolute;top:0;right:54px;height:100%;border-left:2px dashed #cfc6b4;"></div>
        <div style="position:absolute;top:-11px;right:43px;width:22px;height:22px;border-radius:50%;background:#e7e6e3;"></div>
        <div style="position:absolute;bottom:-11px;right:43px;width:22px;height:22px;border-radius:50%;background:#fff;"></div>
        <div style="position:absolute;top:0;right:0;width:54px;height:100%;display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(90deg);white-space:nowrap;font-family:Anton,sans-serif;font-size:13px;letter-spacing:3px;color:#b3aa97;text-transform:uppercase;">${cidadeStub}</span>
        </div>
      </div>
    </div>

    <!-- BODY pág 1 -->
    <div style="flex:1;padding:26px 50px 20px;display:flex;flex-direction:column;">

      <p style="margin:0 0 18px;font-size:13.5px;line-height:1.55;color:#3a3a3e;">${paragrafo}</p>

      <!-- grade info show -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:12px 16px;">
          <div style="font-size:10px;letter-spacing:2px;color:#9a937f;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Duração</div>
          <div style="font-family:Anton,sans-serif;font-size:22px;color:#1a1a1d;line-height:1;">${duracaoMin}</div>
          <div style="font-size:10px;color:#8c8678;font-weight:600;margin-top:4px;">${duracaoText}</div>
        </div>
        <div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:12px 16px;">
          <div style="font-size:10px;letter-spacing:2px;color:#9a937f;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Data</div>
          <div style="font-family:Anton,sans-serif;font-size:22px;color:#1a1a1d;line-height:1;">${diaMes}</div>
          <div style="font-size:10px;color:#8c8678;font-weight:600;margin-top:4px;">${dataExt}</div>
        </div>
        <div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:12px 16px;">
          <div style="font-size:10px;letter-spacing:2px;color:#9a937f;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Local</div>
          <div style="font-family:Anton,sans-serif;font-size:22px;color:#1a1a1d;line-height:1;">${cidade.split(' ')[0]}</div>
          <div style="font-size:10px;color:#8c8678;font-weight:600;margin-top:4px;">${cidade} — ${estado}</div>
        </div>
      </div>

      <!-- Investimento -->
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:17px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Investimento</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>

      <div style="display:flex;flex-direction:column;gap:0;margin-bottom:12px;border:1px solid #ece7dd;">
        ${itensHtml}
      </div>

      <!-- total -->
      <div style="display:flex;align-items:center;justify-content:space-between;background:#1a1a1d;padding:14px 24px;margin-bottom:6px;">
        <div style="display:flex;align-items:baseline;gap:14px;">
          <span style="font-size:12px;letter-spacing:2.5px;color:#a8a7ac;font-weight:700;text-transform:uppercase;">Valor total</span>
          <span style="font-size:11px;color:#7a7980;font-weight:600;">Equipe: ${equipeText}</span>
        </div>
        <div style="font-family:Anton,sans-serif;font-size:30px;color:#fff;letter-spacing:.5px;">${cacheFmt.replace(',', '<span style="color:#e8261c;">,').replace(/(\d{2})$/, '$1</span>')}</div>
      </div>

      <!-- Por conta do contratante -->
      <div style="display:flex;align-items:center;gap:11px;margin:16px 0 10px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:17px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Por conta do contratante</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>

      ${obgGrid}

      <!-- rodapé pág 1 -->
      <div style="margin-top:auto;padding-top:14px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #ece7dd;">
        <span style="font-size:11px;letter-spacing:2px;color:#b3aa97;font-weight:700;text-transform:uppercase;">DFG Produções &amp; Eventos</span>
        <span style="font-size:11px;letter-spacing:2px;color:#b3aa97;font-weight:700;text-transform:uppercase;">Página 1 de 2</span>
      </div>

    </div>
  </div>

  <!-- ========== PÁGINA 2 ========== -->
  <div class="pagina">

    <!-- cabeçalho pág 2 -->
    <div style="position:relative;height:120px;background:#e8261c;flex:none;overflow:hidden;display:flex;align-items:center;padding:0 50px;">
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 2px,transparent 2px 18px);"></div>
      <div style="position:absolute;top:14px;left:50px;display:flex;gap:11px;">
        <span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.45);"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>
      </div>
      <div style="display:flex;align-items:baseline;gap:18px;">
        <span style="font-family:Anton,sans-serif;font-size:46px;color:#fff;letter-spacing:1px;text-transform:uppercase;line-height:1;">${artistaNome}</span>
        <span style="font-family:Anton,sans-serif;font-size:18px;color:rgba(255,255,255,.85);letter-spacing:2px;text-transform:uppercase;">Condições de Pagamento</span>
      </div>
      <span style="position:absolute;right:50px;bottom:16px;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.7);font-weight:700;text-transform:uppercase;">DFG Produções &amp; Eventos</span>
    </div>

    <!-- BODY pág 2 -->
    <div style="flex:1;padding:40px 50px 28px;display:flex;flex-direction:column;">

      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:19px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Forma de Pagamento</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>

      ${parcelasHtml}

      <!-- Observações -->
      <div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:16px 20px;margin-bottom:30px;">
        <div style="font-size:10.5px;letter-spacing:2px;color:#9a937f;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Observações</div>
        <p style="margin:0;font-size:12.5px;line-height:1.6;color:#5c574d;">A previsão da data do pagamento deve constar no contrato. O não cumprimento dos prazos acordados implica na suspensão do espetáculo, e a empresa não assumirá nenhum prejuízo decorrente da não realização do mesmo.</p>
      </div>

      <!-- Dados para pagamento -->
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:19px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Dados para Pagamento</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>

      <div style="border:1px solid #ece7dd;margin-bottom:30px;">
        ${PropostaTemplate._rowBanco('Razão Social', dados.banco && dados.banco.razao || 'DFG Produções e Eventos LTDA', true)}
        ${PropostaTemplate._rowBanco('CNPJ',         dados.banco && dados.banco.cnpj  || '24.483.999/0001-35')}
        ${PropostaTemplate._rowBanco('Banco',        dados.banco && dados.banco.banco || 'Banco Sicoob', true)}
        ${PropostaTemplate._rowBanco('Agência',      dados.banco && dados.banco.agencia || '3224')}
        ${PropostaTemplate._rowBanco('Conta C/C',    dados.banco && dados.banco.conta  || '19.259-7', true)}
        ${PropostaTemplate._rowBanco('Chave PIX',    dados.banco && dados.banco.pix    || '(34) 99902-0200 — SICOOB')}
        ${PropostaTemplate._rowBanco('Titular PIX',  dados.banco && dados.banco.pixTitular || 'Douglas Gomes Fonseca', true)}
        ${PropostaTemplate._rowBanco('CPF Titular',  dados.banco && dados.banco.pixCpf || '098.549.066-71', false, true)}
      </div>

      <!-- Validade + assinatura -->
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:24px;">
        <div>
          <div style="display:inline-block;background:#f6f1e7;border:1px dashed #d8cfbd;padding:8px 14px;font-size:11.5px;color:#5c574d;font-weight:700;margin-bottom:18px;">
            Validade da proposta: <strong style="color:#e8261c;">${validadeDias} dias corridos</strong> da data deste orçamento
          </div>
          <div style="font-size:12px;color:#8c8678;font-weight:600;">${datHoje}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#8c8678;margin-bottom:10px;">Atenciosamente,</div>
          <div style="font-family:Anton,sans-serif;font-size:20px;color:#1a1a1d;text-transform:uppercase;letter-spacing:.5px;">DFG Produções e Eventos LTDA</div>
          <div style="font-size:11.5px;color:#8c8678;font-weight:600;margin-top:6px;">CNPJ: 24.483.999/0001-35 · Tel: (34) 99902-0200</div>
        </div>
      </div>

      <!-- rodapé pág 2 -->
      <div style="margin-top:22px;padding-top:18px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #ece7dd;">
        <span style="font-size:11px;letter-spacing:2px;color:#b3aa97;font-weight:700;text-transform:uppercase;">DFG Produções &amp; Eventos</span>
        <span style="font-size:11px;letter-spacing:2px;color:#b3aa97;font-weight:700;text-transform:uppercase;">Página 2 de 2</span>
      </div>

    </div>
  </div>

</div>
</body>
</html>`;
};

PropostaTemplate._rowBanco = function(label, valor, alt, isLast) {
    var bg  = alt ? 'background:#fbf9f4;' : '';
    var brd = isLast ? '' : 'border-bottom:1px solid #ece7dd;';
    return '<div style="display:flex;' + brd + '">'
        + '<div style="width:200px;flex:none;padding:11px 18px;' + bg + 'font-size:11px;letter-spacing:1.5px;color:#9a937f;font-weight:700;text-transform:uppercase;">' + label + '</div>'
        + '<div style="flex:1;padding:11px 18px;font-size:13px;color:#1a1a1d;font-weight:600;">' + valor + '</div>'
        + '</div>';
};

PropostaTemplate._capitalizar = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// ============================================================
// TEMPLATE PREFEITURA
// ============================================================
PropostaTemplate.gerarPrefeitura = function(proposta, dados) {
    var artistaNome  = (proposta._artistaNome || '').toUpperCase();
    var cidade       = (proposta.cidade_evento || '').toUpperCase();
    var estado       = (proposta.estado_evento || '').toUpperCase();
    var cidadeEstado = cidade + (estado ? ', ' + estado : '');
    var cidadeStub   = cidade + (estado ? ' · ' + estado : '');
    var destinatario = (proposta.razao_social || '').toUpperCase();

    var nomeLen  = artistaNome.length;
    var nomeSize = nomeLen <= 4 ? 96 : nomeLen <= 8 ? 72 : nomeLen <= 12 ? 54 : nomeLen <= 16 ? 40 : 32;
    var nomeSizeP2 = nomeLen <= 8 ? 46 : nomeLen <= 14 ? 36 : 28;

    var MESES_EXT = ['janeiro','fevereiro','março','abril','maio','junho',
                     'julho','agosto','setembro','outubro','novembro','dezembro'];
    var MESES_ABR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    var dataObj   = proposta.data_evento ? new Date(proposta.data_evento + 'T12:00:00') : null;
    var diaMes    = dataObj ? String(dataObj.getDate()).padStart(2,'0') + ' ' + MESES_ABR[dataObj.getMonth()] : '—';
    var dataExt   = dataObj ? dataObj.getDate() + ' de ' + MESES_EXT[dataObj.getMonth()] + ' de ' + dataObj.getFullYear() : '—';

    var duracaoRaw = dados.duracao || proposta.duracao_show || '90 min (noventa minutos) – 1h30m';
    var duracaoMin = (duracaoRaw.match(/\d+\s*min/i) || ['90 MIN'])[0].toUpperCase();

    var cacheTotal = proposta.cache_bruto || 0;
    var cacheFmt   = 'R$ ' + parseFloat(cacheTotal).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

    var equipeNum  = dados.equipe || 20;
    var validadeDias = dados.validade || proposta.validade_proposta || 15;

    // Itens COM valores (prefeitura)
    var itens = dados.itens && dados.itens.length ? dados.itens : [
        { desc: 'Cachê artístico do cantor', valor: 0 },
        { desc: 'Direitos autorais e ECAD', valor: 0 },
        { desc: 'Apoio logístico — som, luz e palco para realização do show', valor: 0 },
    ];
    var itensHtml = itens.map(function(it, i) {
        var bg  = i % 2 !== 0 ? 'background:#fbf9f4;' : '';
        var valFmt = it.valor ? 'R$ ' + parseFloat(it.valor).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
        return '<div style="display:flex;align-items:center;border-top:1px solid #ece7dd;' + bg + '">'
            + '<div style="flex:1;padding:11px 18px;font-size:13px;color:#3a3a3e;font-weight:600;">'
            + '<span style="display:inline-block;width:6px;height:6px;background:#e8261c;transform:rotate(45deg);margin-right:11px;vertical-align:middle;"></span>'
            + it.desc + '</div>'
            + '<div style="width:190px;flex:none;padding:11px 18px;font-size:13px;color:#1a1a1d;font-weight:700;text-align:right;font-variant-numeric:tabular-nums;">' + valFmt + '</div>'
            + '</div>';
    }).join('');

    // Obrigações
    var obgLinhas = (dados.obrigacoes || '').split('\n').filter(function(l){ return l.trim(); });
    var obgGrid = '';
    if (obgLinhas.length) {
        var obgItens = obgLinhas.map(function(l) {
            var sep = l.indexOf(':');
            return sep > 0 && sep < 30
                ? { label: l.substring(0, sep).trim(), desc: l.substring(sep+1).trim() }
                : { label: '', desc: l.trim() };
        });
        obgGrid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 26px;">';
        for (var i = 0; i < obgItens.length; i += 2) {
            var a = obgItens[i], b = obgItens[i+1] || null;
            obgGrid += '<div style="font-size:12px;color:#3a3a3e;">' + (a.label ? '<strong style="color:#e8261c;">' + PropostaTemplate._capitalizar(a.label) + '</strong>' : '') + '</div>';
            obgGrid += b ? '<div style="font-size:12px;color:#3a3a3e;">' + (b.label ? '<strong style="color:#e8261c;">' + PropostaTemplate._capitalizar(b.label) + '</strong>' : '') + '</div>' : '<div></div>';
            obgGrid += '<div style="font-size:11.5px;line-height:1.4;color:#6c6a64;margin-top:-5px;">' + a.desc + '</div>';
            obgGrid += b ? '<div style="font-size:11.5px;line-height:1.4;color:#6c6a64;margin-top:-5px;">' + b.desc + '</div>' : '<div></div>';
        }
        obgGrid += '</div>';
    } else {
        obgGrid = '<p style="font-size:12px;color:#6c6a64;">A combinar conforme contrato.</p>';
    }

    // Cronograma
    var cronograma = dados.cronograma || [];
    var parcelasHtml = '';
    if (cronograma.length > 0) {
        parcelasHtml = '<div style="display:grid;grid-template-columns:repeat(' + Math.min(cronograma.length, 3) + ',1fr);gap:14px;margin-bottom:26px;">';
        cronograma.forEach(function(c, i) {
            var isLast = i === cronograma.length - 1;
            var bg     = isLast ? 'background:#1a1a1d;' : 'border:1px solid #ece7dd;';
            var cor    = isLast ? 'color:#fff;' : 'color:#e8261c;';
            var vencCor= isLast ? 'color:#a8a7ac;' : 'color:#6c6a64;';
            var vencFt = isLast ? 'color:#fff;' : 'color:#1a1a1d;';
            var dataVenc = c.venc ? new Date(c.venc + 'T12:00:00').toLocaleDateString('pt-BR') : '';
            var valFmt = 'R$ ' + parseFloat(c.valor||0).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
            parcelasHtml += '<div style="' + bg + 'padding:18px;">'
                + '<div style="font-size:10.5px;letter-spacing:2px;color:' + (isLast ? '#8d8c92' : '#9a937f') + ';font-weight:700;text-transform:uppercase;margin-bottom:10px;">' + (c.desc || (i+1) + 'ª Parcela') + '</div>'
                + '<div style="font-family:Anton,sans-serif;font-size:28px;' + cor + 'line-height:1;">' + valFmt + '</div>'
                + (dataVenc ? '<div style="margin-top:12px;font-size:11.5px;' + vencCor + 'font-weight:600;">Vencimento <strong style="' + vencFt + '">' + dataVenc + '</strong></div>' : '')
                + '</div>';
        });
        parcelasHtml += '</div>';
    } else {
        parcelasHtml = '<div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:14px 18px;margin-bottom:26px;font-size:12.5px;color:#5c574d;">A combinar conforme contrato.</div>';
    }

    var hoje    = new Date();
    var datHoje = 'Uberlândia — MG, ' + hoje.getDate() + ' de ' + MESES_EXT[hoje.getMonth()] + ' de ' + hoje.getFullYear();
    var banco   = dados.banco || {};

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proposta Prefeitura — ${artistaNome}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#e7e6e3; -webkit-font-smoothing:antialiased; font-family:Archivo,system-ui,sans-serif; color:#1a1a1d; }
.barra-acoes { position:fixed; top:0; left:0; right:0; background:#1a1a1d; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; z-index:999; box-shadow:0 2px 8px rgba(0,0,0,.3); }
.paginas { padding:80px 0 80px; display:flex; flex-direction:column; align-items:center; gap:40px; }
.pagina { width:794px; min-height:1123px; background:#fff; box-shadow:0 24px 60px -22px rgba(0,0,0,.35); display:flex; flex-direction:column; overflow:hidden; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; width: 210mm; }
  .barra-acoes { display: none !important; }
  .paginas { padding: 0 !important; gap: 0 !important; align-items: flex-start !important; display: block !important; }
  .pagina { width: 210mm !important; height: 297mm !important; min-height: 0 !important; max-height: 297mm !important; overflow: hidden !important; box-shadow: none !important; page-break-after: always !important; break-after: page !important; }
  .pagina:last-child { page-break-after: avoid !important; break-after: avoid !important; }
}
</style>
</head>
<body>

<div class="barra-acoes">
  <span style="font-family:Anton,sans-serif;font-size:18px;color:#e8261c;letter-spacing:2px;">DFG PRODUÇÕES</span>
  <div style="display:flex;gap:10px;">
    <button onclick="window.print()" style="background:#e8261c;color:#fff;border:none;padding:9px 22px;font-family:Anton,sans-serif;font-size:14px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;">⬇ Salvar / Imprimir PDF</button>
    <button onclick="window.close()" style="background:none;color:#b3aa97;border:1px solid #444;padding:9px 16px;font-size:13px;cursor:pointer;">Fechar</button>
  </div>
</div>

<div class="paginas">

  <!-- ========== PÁGINA 1 ========== -->
  <div class="pagina">

    <!-- HEADER ticket -->
    <div style="position:relative;height:260px;background:#f4efe5;overflow:hidden;display:flex;flex:none;">
      <div style="position:relative;width:170px;height:260px;flex:none;background:#e8261c;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 2px,transparent 2px 18px);"></div>
        <div style="position:absolute;top:18px;left:0;right:0;display:flex;justify-content:center;gap:12px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#fff;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.45);"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#fff;"></span>
        </div>
        <span style="transform:rotate(-90deg);white-space:nowrap;font-family:Anton,sans-serif;font-size:48px;letter-spacing:4px;color:#fff;text-transform:uppercase;line-height:1;">Ao Vivo</span>
        <span style="position:absolute;bottom:18px;left:0;right:0;text-align:center;font-size:11px;letter-spacing:3px;color:rgba(255,255,255,.7);font-weight:700;text-transform:uppercase;">Turnê 2026</span>
      </div>
      <div style="flex:1;position:relative;padding:28px 40px 24px 40px;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="position:absolute;top:16px;left:40px;right:64px;display:flex;gap:13px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#e8261c;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#e8b3af;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#e8261c;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#e8b3af;"></span>
          <span style="width:7px;height:7px;border-radius:50%;background:#e8261c;"></span>
        </div>
        <div style="margin-top:22px;display:flex;align-items:center;gap:10px;">
          <span style="display:inline-block;width:26px;height:3px;background:#1a1a1d;"></span>
          <span style="font-size:12px;letter-spacing:3px;font-weight:700;color:#1a1a1d;text-transform:uppercase;">DFG Produções &amp; Eventos</span>
        </div>
        <div>
          <div style="font-family:Anton,sans-serif;font-size:${nomeSize}px;line-height:.82;color:#e8261c;text-transform:uppercase;letter-spacing:1px;">${artistaNome}</div>
          <div style="margin-top:10px;font-size:12px;letter-spacing:2.5px;color:#5c574d;font-weight:700;text-transform:uppercase;">Show ao vivo · ${duracaoMin}</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <span style="background:#e8261c;color:#fff;font-family:Anton,sans-serif;font-size:13px;letter-spacing:1.2px;padding:7px 14px;text-transform:uppercase;">Proposta de Serviços Artísticos</span>
        </div>
        <div style="position:absolute;top:0;right:54px;height:100%;border-left:2px dashed #cfc6b4;"></div>
        <div style="position:absolute;top:-11px;right:43px;width:22px;height:22px;border-radius:50%;background:#e7e6e3;"></div>
        <div style="position:absolute;bottom:-11px;right:43px;width:22px;height:22px;border-radius:50%;background:#fff;"></div>
        <div style="position:absolute;top:0;right:0;width:54px;height:100%;display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(90deg);white-space:nowrap;font-family:Anton,sans-serif;font-size:12px;letter-spacing:3px;color:#b3aa97;text-transform:uppercase;">${cidadeStub}</span>
        </div>
      </div>
    </div>

    <!-- BODY pág 1 -->
    <div style="flex:1;padding:22px 50px 18px;display:flex;flex-direction:column;">

      <!-- Bloco institucional -->
      <div style="margin-bottom:16px;">
        <div style="font-family:Anton,sans-serif;font-size:19px;letter-spacing:.8px;color:#1a1a1d;text-transform:uppercase;line-height:1.1;">À ${destinatario}</div>
        <div style="width:120px;height:4px;background:#e8261c;margin-top:8px;"></div>
      </div>

      <p style="margin:0 0 18px;font-size:13px;line-height:1.55;color:#3a3a3e;">
        Conforme solicitado pela ${PropostaTemplate._capitalizar(destinatario)}, segue abaixo orçamento para a realização de <strong>1 (um) show</strong> com o cantor/a cantora <strong style="color:#e8261c;">${artistaNome}</strong>, na cidade de <strong>${cidadeEstado}</strong>.
      </p>

      <!-- 4 cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;">
        <div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:12px 14px;">
          <div style="font-size:9.5px;letter-spacing:1.8px;color:#9a937f;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Duração</div>
          <div style="font-family:Anton,sans-serif;font-size:20px;color:#1a1a1d;line-height:1;">${duracaoMin}</div>
          <div style="font-size:10px;color:#8c8678;font-weight:600;margin-top:4px;">1h30m</div>
        </div>
        <div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:12px 14px;">
          <div style="font-size:9.5px;letter-spacing:1.8px;color:#9a937f;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Data</div>
          <div style="font-family:Anton,sans-serif;font-size:20px;color:#1a1a1d;line-height:1;">${diaMes}</div>
          <div style="font-size:10px;color:#8c8678;font-weight:600;margin-top:4px;">${dataExt}</div>
        </div>
        <div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:12px 14px;">
          <div style="font-size:9.5px;letter-spacing:1.8px;color:#9a937f;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Local</div>
          <div style="font-family:Anton,sans-serif;font-size:20px;color:#1a1a1d;line-height:1;">${cidade.split(' ')[0]}</div>
          <div style="font-size:10px;color:#8c8678;font-weight:600;margin-top:4px;">${cidade} — ${estado}</div>
        </div>
        <div style="background:#e8261c;padding:12px 14px;">
          <div style="font-size:9.5px;letter-spacing:1.8px;color:rgba(255,255,255,.75);font-weight:700;text-transform:uppercase;margin-bottom:6px;">Valor do show</div>
          <div style="font-family:Anton,sans-serif;font-size:20px;color:#fff;line-height:1;">${cacheFmt}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.8);font-weight:600;margin-top:4px;">valor total</div>
        </div>
      </div>

      <!-- Investimento -->
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:10px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:17px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Investimento</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>

      <div style="border:1px solid #ece7dd;margin-bottom:12px;">
        <div style="display:flex;background:#1a1a1d;">
          <div style="flex:1;padding:10px 18px;font-size:10.5px;letter-spacing:2px;color:#fff;font-weight:700;text-transform:uppercase;">Descrição</div>
          <div style="width:190px;flex:none;padding:10px 18px;font-size:10.5px;letter-spacing:2px;color:#fff;font-weight:700;text-transform:uppercase;text-align:right;">Valor unitário</div>
        </div>
        ${itensHtml}
        <div style="display:flex;align-items:center;border-top:2px solid #e8261c;background:#fdeceb;">
          <div style="flex:1;padding:13px 18px;font-family:Anton,sans-serif;font-size:16px;letter-spacing:1px;color:#e8261c;text-transform:uppercase;">Total</div>
          <div style="width:190px;flex:none;padding:13px 18px;font-family:Anton,sans-serif;font-size:18px;color:#e8261c;text-align:right;">${cacheFmt}</div>
        </div>
      </div>

      <!-- Equipe + NF badge -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <span style="font-size:11.5px;color:#8c8678;font-weight:600;">Equipe: ${equipeNum} pessoas (${equipeNum} acompanhantes)</span>
        <span style="background:#e8261c;color:#fff;font-family:Anton,sans-serif;font-size:12px;letter-spacing:1px;padding:6px 14px;text-transform:uppercase;">Obs. Com Nota Fiscal</span>
      </div>

      <!-- Por conta do contratante -->
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:10px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:17px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Por conta do contratante</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>

      ${obgGrid}

      <div style="margin-top:auto;padding-top:14px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #ece7dd;">
        <span style="font-size:11px;letter-spacing:2px;color:#b3aa97;font-weight:700;text-transform:uppercase;">DFG Produções &amp; Eventos</span>
        <span style="font-size:11px;letter-spacing:2px;color:#b3aa97;font-weight:700;text-transform:uppercase;">Página 1 de 2</span>
      </div>
    </div>
  </div>

  <!-- ========== PÁGINA 2 ========== -->
  <div class="pagina">

    <div style="position:relative;height:120px;background:#e8261c;flex:none;overflow:hidden;display:flex;align-items:center;padding:0 50px;">
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 2px,transparent 2px 18px);"></div>
      <div style="position:absolute;top:14px;left:50px;display:flex;gap:11px;">
        <span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.45);"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>
      </div>
      <div style="display:flex;align-items:baseline;gap:18px;">
        <span style="font-family:Anton,sans-serif;font-size:${nomeSizeP2}px;color:#fff;letter-spacing:1px;text-transform:uppercase;line-height:1;">${artistaNome}</span>
        <span style="font-family:Anton,sans-serif;font-size:17px;color:rgba(255,255,255,.85);letter-spacing:2px;text-transform:uppercase;">Condições de Pagamento</span>
      </div>
      <span style="position:absolute;right:50px;bottom:16px;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.7);font-weight:700;text-transform:uppercase;">DFG Produções &amp; Eventos</span>
    </div>

    <div style="flex:1;padding:36px 50px 26px;display:flex;flex-direction:column;">

      <div style="display:flex;align-items:center;gap:11px;margin-bottom:14px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:18px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Forma de Pagamento</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>

      ${parcelasHtml}

      <!-- Observações Legais -->
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:18px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Observações Legais</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>
      <div style="background:#f6f1e7;border-left:3px solid #e8261c;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:12.5px;line-height:1.6;color:#5c574d;">A previsão da data do pagamento deve constar no contrato. O não cumprimento dos prazos acordados implica na suspensão do espetáculo, e a empresa não assumirá nenhum prejuízo decorrente da não realização do mesmo.</p>
      </div>

      <!-- Dados para pagamento -->
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:14px;">
        <span style="display:inline-block;width:12px;height:12px;background:#e8261c;transform:rotate(45deg);"></span>
        <h2 style="margin:0;font-family:Anton,sans-serif;font-size:18px;letter-spacing:1.5px;color:#1a1a1d;text-transform:uppercase;">Dados para Pagamento</h2>
        <span style="flex:1;border-top:2px dashed #d8cfbd;"></span>
      </div>

      <div style="border:1px solid #ece7dd;margin-bottom:24px;">
        ${PropostaTemplate._rowBanco('Razão Social', banco.razao || 'DFG Produções e Eventos LTDA', true)}
        ${PropostaTemplate._rowBanco('CNPJ',         banco.cnpj  || '24.483.999/0001-35')}
        ${PropostaTemplate._rowBanco('Banco',        banco.banco || 'Banco Sicoob', true)}
        ${PropostaTemplate._rowBanco('Agência',      banco.agencia || '3224')}
        ${PropostaTemplate._rowBanco('Conta C/C',    banco.conta  || '19.259-7', true)}
        ${PropostaTemplate._rowBanco('Chave PIX',    banco.pix    || '(34) 99902-0200 — SICOOB')}
        ${PropostaTemplate._rowBanco('Titular PIX',  banco.pixTitular || 'Douglas Gomes Fonseca', true)}
        ${PropostaTemplate._rowBanco('CPF Titular',  banco.pixCpf || '098.549.066-71', false, true)}
      </div>

      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:20px;">
        <div>
          <div style="display:inline-block;background:#f6f1e7;border:1px dashed #d8cfbd;padding:8px 14px;font-size:11.5px;color:#5c574d;font-weight:700;margin-bottom:16px;">
            Validade da proposta: <strong style="color:#e8261c;">${validadeDias} dias corridos</strong> da data deste orçamento
          </div>
          <div style="font-size:12px;color:#8c8678;font-weight:600;">${datHoje}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#8c8678;margin-bottom:10px;">Atenciosamente,</div>
          <div style="font-family:Anton,sans-serif;font-size:20px;color:#1a1a1d;text-transform:uppercase;letter-spacing:.5px;">DFG Produções e Eventos LTDA</div>
          <div style="font-size:11.5px;color:#8c8678;font-weight:600;margin-top:6px;">CNPJ: 24.483.999/0001-35 · Tel: (34) 99902-0200</div>
        </div>
      </div>

      <div style="margin-top:20px;padding-top:16px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #ece7dd;">
        <span style="font-size:11px;letter-spacing:2px;color:#b3aa97;font-weight:700;text-transform:uppercase;">DFG Produções &amp; Eventos</span>
        <span style="font-size:11px;letter-spacing:2px;color:#b3aa97;font-weight:700;text-transform:uppercase;">Página 2 de 2</span>
      </div>
    </div>
  </div>

</div>
</body>
</html>`;
};
