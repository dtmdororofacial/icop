/* =========================================================
   ICOP-AL — Lógica de navegação
   Carrega data/icop-tree.json e conduz o usuário nó a nó.
   HTML/CSS/JS puro, sem dependências.
   ========================================================= */
(function () {
  'use strict';

  var TREE_URL = 'data/icop-tree.json';

  var data = null;       // JSON completo
  var nodes = null;      // mapa de nós
  var startId = null;    // id do nó inicial
  var currentId = null;  // nó atual
  var trail = [];        // pilha de nós visitados (para o "Voltar")
  var remainingCache = {};

  var el = {};
  function byId(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    el.intro       = byId('card-abertura');
    el.pergunta    = byId('card-pergunta');
    el.aviso       = byId('card-aviso');
    el.resultado   = byId('card-resultado');
    el.progress    = document.querySelector('.progress');
    el.nav         = document.querySelector('.nav');
    el.branch      = byId('branch-chip');
    el.count       = byId('progress-count');
    el.fill        = byId('progress-fill');
    el.progressbar = document.querySelector('.progress__track');

    el.qtext   = byId('question-text');
    el.qhelp   = byId('question-help');
    el.options = byId('options');

    el.ntext = byId('notice-text');
    el.nlist = byId('notice-list');
    el.ncont = el.aviso.querySelector('.option--continue');

    el.rcode    = byId('result-code');
    el.rcat     = byId('result-cat');
    el.rname    = byId('result-name');
    el.rcrit    = byId('result-criteria');
    el.rcopied  = byId('result-copied');

    el.btnIniciar   = byId('btn-iniciar');
    el.btnVoltar    = byId('btn-voltar');
    el.btnReiniciar = byId('btn-reiniciar');
    el.btnCopiar    = byId('btn-copiar');

    el.btnIniciar.addEventListener('click', start);
    el.btnVoltar.addEventListener('click', back);
    el.btnReiniciar.addEventListener('click', restart);
    el.btnCopiar.addEventListener('click', copyResult);

    showIntro();
    loadTree();
  });

  /* ---------- Carregamento ---------- */
  function loadTree() {
    el.btnIniciar.disabled = true;
    fetch(TREE_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) {
        data = json;
        nodes = json.nos;
        startId = (json.meta && json.meta.no_inicial) || null;
        if (!startId || !nodes[startId]) throw new Error('No inicial inválido');
        el.btnIniciar.disabled = false;
      })
      .catch(function (err) {
        console.error('Falha ao carregar', TREE_URL, err);
        el.btnIniciar.disabled = true;
        el.btnIniciar.textContent = 'Não foi possível carregar os dados';
        el.btnIniciar.classList.add('btn--secondary');
      });
  }

  /* ---------- Telas ---------- */
  function showOnly(which) {
    el.intro.hidden     = which !== 'intro';
    el.pergunta.hidden  = which !== 'pergunta';
    el.aviso.hidden     = which !== 'aviso';
    el.resultado.hidden = which !== 'resultado';

    var emFluxo = which !== 'intro';
    el.progress.hidden    = !emFluxo;
    el.nav.hidden         = !emFluxo;
    el.btnReiniciar.hidden = !emFluxo;
  }

  function showIntro() {
    currentId = null;
    trail = [];
    showOnly('intro');
    el.btnReiniciar.hidden = true;
    window.scrollTo(0, 0);
  }

  function start() {
    if (!startId) return;
    trail = [];
    currentId = startId;
    render();
  }

  function restart() { showIntro(); }

  /* ---------- Navegação ---------- */
  function forward(id) {
    if (!nodes[id]) { console.warn('Nó inexistente:', id); return; }
    trail.push(currentId);
    currentId = id;
    render();
  }

  function back() {
    if (trail.length > 0) {
      currentId = trail.pop();
      render();
    } else {
      showIntro();
    }
  }

  /* ---------- Renderização ---------- */
  function render() {
    var node = nodes[currentId];
    if (!node) return;

    updateProgress(node);

    if (node.tipo === 'pergunta')      renderPergunta(node);
    else if (node.tipo === 'aviso')    renderAviso(node);
    else if (node.tipo === 'resultado') renderResultado(node);

    window.scrollTo(0, 0);
  }

  function renderPergunta(node) {
    showOnly('pergunta');
    el.qtext.textContent = node.texto || '';
    el.qhelp.textContent = node.ajuda || '';

    el.options.innerHTML = '';
    var opcoes = node.opcoes || [];

    // Sim/Não curtos: lado a lado em telas largas
    var curtos = opcoes.length === 2 && opcoes.every(function (o) {
      return (o.rotulo || '').length <= 14;
    });
    el.options.className = 'options' + (curtos ? ' options--inline' : '');

    opcoes.forEach(function (op) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      var label = document.createElement('span');
      label.className = 'option__label';
      label.textContent = op.rotulo;
      var chevron = document.createElement('span');
      chevron.className = 'option__chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '›';
      btn.appendChild(label);
      btn.appendChild(chevron);
      btn.addEventListener('click', function () { forward(op.proximo); });
      el.options.appendChild(btn);
    });

    focar(el.qtext);
  }

  function renderAviso(node) {
    showOnly('aviso');
    el.ntext.textContent = node.texto || '';

    var detalhes = node.detalhes || [];
    el.nlist.innerHTML = '';
    if (detalhes.length) {
      el.nlist.hidden = false;
      detalhes.forEach(function (d) {
        var li = document.createElement('li');
        li.textContent = d;
        el.nlist.appendChild(li);
      });
    } else {
      el.nlist.hidden = true;
    }

    // (re)liga o botão "continuar" para o próximo nó
    var novo = el.ncont.cloneNode(true);
    el.ncont.parentNode.replaceChild(novo, el.ncont);
    el.ncont = novo;
    el.ncont.addEventListener('click', function () { forward(node.proximo); });

    focar(el.ntext);
  }

  function renderResultado(node) {
    showOnly('resultado');

    var ehDiagnostico = node.diagnostico !== false && node.codigo && node.codigo !== '—';
    if (ehDiagnostico) {
      el.rcode.hidden = false;
      el.rcode.textContent = 'ICOP ' + node.codigo;
    } else {
      el.rcode.hidden = true;
    }
    el.rcat.textContent = node.categoria || '';
    el.rname.textContent = node.nome || '';

    el.rcrit.innerHTML = '';
    (node.criterios || []).forEach(function (c) {
      var li = document.createElement('li');
      li.textContent = c;
      el.rcrit.appendChild(li);
    });

    el.rcopied.hidden = true;
    el.btnCopiar.textContent = 'Copiar resultado';

    focar(el.rname);
  }

  /* ---------- Progresso ---------- */
  function updateProgress(node) {
    el.branch.textContent = node.ramo || node.categoria || '';

    var passos = trail.length + 1;
    var falta = remaining(currentId);
    var pct = Math.round((passos / (passos + falta)) * 100);
    if (node.tipo === 'resultado') pct = 100;
    el.fill.style.width = pct + '%';
    if (el.progressbar) el.progressbar.setAttribute('aria-valuenow', String(pct));

    if (node.tipo === 'resultado') {
      el.count.textContent = 'Resultado';
    } else if (node.tipo === 'aviso') {
      el.count.textContent = 'Atenção';
    } else {
      var nQ = trail.filter(function (id) {
        return nodes[id] && nodes[id].tipo === 'pergunta';
      }).length + 1;
      el.count.textContent = 'Pergunta ' + nQ;
    }
  }

  // Maior número de passos do nó até um resultado (memoizado).
  function remaining(id) {
    if (id in remainingCache) return remainingCache[id];
    var n = nodes[id];
    if (!n || n.tipo === 'resultado') { remainingCache[id] = 0; return 0; }
    remainingCache[id] = 0; // proteção contra ciclos
    var proximos = [];
    if (n.proximo) proximos.push(n.proximo);
    (n.opcoes || []).forEach(function (o) { proximos.push(o.proximo); });
    var max = 0;
    proximos.forEach(function (p) {
      if (nodes[p]) { var r = remaining(p); if (r > max) max = r; }
    });
    remainingCache[id] = 1 + max;
    return remainingCache[id];
  }

  /* ---------- Copiar resultado ---------- */
  function copyResult() {
    var node = nodes[currentId];
    if (!node) return;

    var linhas = [];
    if (node.diagnostico !== false && node.codigo && node.codigo !== '—') {
      linhas.push('Diagnóstico (ICOP): ' + node.nome + ' — ' + node.codigo);
    } else {
      linhas.push('Resultado: ' + node.nome);
    }
    if (node.categoria) linhas.push('Categoria: ' + node.categoria);
    linhas.push('');
    linhas.push('Critérios diagnósticos (resumo):');
    (node.criterios || []).forEach(function (c) { linhas.push('• ' + c); });
    linhas.push('');
    linhas.push('Obtido com ferramenta de apoio à decisão clínica baseada na Classificação ' +
      'Internacional de Dor Orofacial (ICOP), 1ª edição. Não substitui o julgamento clínico ' +
      'nem a anamnese e o exame completos.');

    copiarTexto(linhas.join('\n'), function (ok) {
      el.rcopied.hidden = false;
      el.btnCopiar.textContent = ok ? 'Copiado' : 'Copiar resultado';
      el.rcopied.textContent = ok ? 'Copiado ✓' : 'Não foi possível copiar';
      setTimeout(function () { el.rcopied.hidden = true; }, 2500);
    });
  }

  function copiarTexto(texto, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(function () { cb(true); })
        .catch(function () { cb(fallbackCopy(texto)); });
    } else {
      cb(fallbackCopy(texto));
    }
  }

  function fallbackCopy(texto) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* ---------- Acessibilidade ---------- */
  function focar(elem) {
    if (!elem) return;
    elem.setAttribute('tabindex', '-1');
    try { elem.focus({ preventScroll: true }); } catch (e) { elem.focus(); }
  }

})();
