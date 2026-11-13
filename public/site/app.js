'use strict';

const PHASES = [
  {
    number: '01',
    title: 'Diagnóstico e kickoff',
    weeks: 'Semanas 1–2',
    label: 'Entender o cenário',
    description: 'Alinhamos objetivos, prioridades, responsáveis e processos. O diagnóstico orienta o que precisa ser configurado primeiro e quais pontos exigem atenção especial.',
    deliverable: 'Plano de implantação e prioridades alinhados',
    color: 'teal',
    activities: [
      { text: 'Realizar a reunião de abertura e alinhar expectativas', who: 'Em conjunto' },
      { text: 'Indicar os responsáveis e pontos focais do projeto', who: 'Consultoria' },
      { text: 'Mapear processos, projetos, contratos e controles atuais', who: 'Em conjunto' },
      { text: 'Definir escopo, prioridades e calendário de validações', who: 'Em conjunto' }
    ]
  },
  {
    number: '02',
    title: 'Configuração e customização',
    weeks: 'Semanas 3–4',
    label: 'Preparar a plataforma',
    description: 'Preparamos o ambiente do Growth Ambiental e ajustamos a estrutura às necessidades identificadas, respeitando as funcionalidades e customizações previstas no escopo.',
    deliverable: 'Ambiente inicial configurado e revisado',
    color: 'aqua',
    activities: [
      { text: 'Organizar unidades, projetos e cadastros essenciais', who: 'Growth Ambiental' },
      { text: 'Configurar estrutura financeira e permissões de acesso', who: 'Growth Ambiental' },
      { text: 'Validar fluxos, campos e regras definidos no escopo', who: 'Em conjunto' },
      { text: 'Revisar a configuração com os usuários-chave', who: 'Consultoria' }
    ]
  },
  {
    number: '03',
    title: 'Dados e homologação',
    weeks: 'Semanas 5–6',
    label: 'Conferir o essencial',
    description: 'Organizamos os dados prioritários, executamos as importações previstas e conferimos os fluxos críticos com exemplos reais antes do início de operação.',
    deliverable: 'Dados essenciais conferidos e testes homologados',
    color: 'blue',
    activities: [
      { text: 'Preparar arquivos de origem e revisar inconsistências', who: 'Consultoria' },
      { text: 'Importar os dados priorizados e previstos no escopo', who: 'Growth Ambiental' },
      { text: 'Conferir cadastros, informações financeiras e relatórios', who: 'Em conjunto' },
      { text: 'Testar processos reais e registrar ajustes necessários', who: 'Em conjunto' }
    ]
  },
  {
    number: '04',
    title: 'Treinamento e go-live',
    weeks: 'Semanas 7–8',
    label: 'Capacitar e começar',
    description: 'Realizamos capacitações conforme os papéis da equipe, resolvemos pendências prioritárias e combinamos a entrada em operação.',
    deliverable: 'Equipe-chave treinada e go-live autorizado',
    color: 'indigo',
    activities: [
      { text: 'Realizar treinamentos por função e rotina', who: 'Growth Ambiental' },
      { text: 'Praticar operações com exemplos do dia a dia', who: 'Consultoria' },
      { text: 'Validar critérios de entrada em operação', who: 'Em conjunto' },
      { text: 'Iniciar o uso real conforme o plano de transição', who: 'Em conjunto' }
    ]
  },
  {
    number: '05',
    title: 'Operação assistida',
    weeks: 'Semanas 9–10',
    label: 'Consolidar a adoção',
    description: 'Acompanhamos os primeiros ciclos de uso, identificamos dificuldades e consolidamos orientações e ajustes previstos para uma operação mais autônoma.',
    deliverable: 'Rotinas estabilizadas e próximos passos definidos',
    color: 'green',
    activities: [
      { text: 'Acompanhar a execução das rotinas prioritárias', who: 'Em conjunto' },
      { text: 'Organizar dúvidas e resolver pendências do escopo', who: 'Growth Ambiental' },
      { text: 'Verificar a adoção pelos diferentes perfis de usuários', who: 'Em conjunto' },
      { text: 'Formalizar pendências e próximos passos após o onboarding', who: 'Em conjunto' }
    ]
  }
];

const PREPARATION = [
  { title: 'Indicar o responsável pelo projeto', desc: 'Pessoa que concentra alinhamentos, dúvidas e validações.' },
  { title: 'Relacionar os projetos e contratos ativos', desc: 'Uma visão inicial do portfólio que será acompanhado.' },
  { title: 'Organizar dados financeiros disponíveis', desc: 'Plano de contas, lançamentos, orçamentos e saldos relevantes.' },
  { title: 'Identificar usuários e áreas envolvidas', desc: 'Gestores, financeiro, administração e equipe operacional.' },
  { title: 'Separar planilhas e documentos utilizados', desc: 'Arquivos prioritários, sem necessidade de enviar dados sensíveis por esta página.' },
  { title: 'Listar dúvidas, prioridades e necessidades', desc: 'Principais desafios e decisões que devem orientar a implantação.' }
];

const STORAGE_KEY = 'growth-ambiental-onboarding-v1';
let state = { phases: {}, prep: {} };
let currentPhase = 0;

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (stored && typeof stored === 'object') {
      state.phases = (stored.phases && typeof stored.phases === 'object') ? stored.phases : {};
      state.prep = (stored.prep && typeof stored.prep === 'object') ? stored.prep : {};
    }
  } catch (_) { /* Private browsing can block storage */ }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* Keep current session usable */ }
}
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}
function countPhaseDone(index) {
  return PHASES[index].activities.reduce((total, _, i) => total + (state.phases[`${index}-${i}`] ? 1 : 0), 0);
}
function renderPhaseTabs() {
  const tabs = document.getElementById('phase-tabs');
  if (!tabs) return;
  tabs.innerHTML = PHASES.map((p, i) => `
    <button class="phase-tab ${i === currentPhase ? 'is-selected' : ''}" id="phase-tab-${i}" type="button" role="tab" aria-selected="${i === currentPhase}" aria-controls="phase-panel" tabindex="${i === currentPhase ? 0 : -1}" data-phase="${i}">
      <span class="phase-tab-index">${p.number}</span>
      <span class="phase-tab-copy"><strong>${escapeHTML(p.title)}</strong><small>${p.weeks} <span class="phase-tab-dot">·</span> ${countPhaseDone(i)}/${p.activities.length} marcadas</small></span>
      <span class="phase-tab-arrow" aria-hidden="true">↗</span>
    </button>`).join('');
  tabs.querySelectorAll('button[data-phase]').forEach(button => {
    button.addEventListener('click', () => setPhase(Number(button.dataset.phase)));
    button.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? PHASES.length - 1 : (currentPhase + ((event.key === 'ArrowDown' || event.key === 'ArrowRight') ? 1 : -1) + PHASES.length) % PHASES.length;
      setPhase(next);
      document.getElementById(`phase-tab-${next}`)?.focus();
    });
  });
}
function renderPhasePanel() {
  const panel = document.getElementById('phase-panel');
  if (!panel) return;
  const p = PHASES[currentPhase];
  const done = countPhaseDone(currentPhase);
  panel.setAttribute('aria-labelledby', `phase-tab-${currentPhase}`);
  panel.innerHTML = `
    <div class="phase-panel-top"><div><span class="phase-panel-label">ETAPA ${p.number} <span>·</span> ${escapeHTML(p.weeks)}</span><h3>${escapeHTML(p.title)}</h3><p>${escapeHTML(p.description)}</p></div><span class="phase-panel-ordinal" aria-hidden="true">${p.number}</span></div>
    <div class="task-header"><span>ATIVIDADES PREVISTAS</span><span class="task-count">${done} de ${p.activities.length} marcadas</span></div>
    <div class="task-list">${p.activities.map((activity, index) => {
      const key = `${currentPhase}-${index}`;
      const checked = Boolean(state.phases[key]);
      return `<label class="task-row ${checked ? 'task-checked' : ''}"><input type="checkbox" data-task="${index}" ${checked ? 'checked' : ''}><span class="custom-check" aria-hidden="true">✓</span><span class="task-text">${escapeHTML(activity.text)}</span><span class="task-role">${escapeHTML(activity.who)}</span></label>`;
    }).join('')}</div>
    <div class="deliverable"><div class="deliverable-icon" aria-hidden="true">✓</div><div><span>ENTREGA ESPERADA</span><strong>${escapeHTML(p.deliverable)}</strong></div></div>
    <div class="phase-panel-actions"><button type="button" id="prev-phase" class="nav-phase-btn" ${currentPhase === 0 ? 'disabled' : ''}>← Etapa anterior</button><button type="button" id="next-phase" class="nav-phase-btn nav-phase-next" ${currentPhase === PHASES.length - 1 ? 'disabled' : ''}>Próxima etapa →</button></div>`;
  panel.querySelectorAll('input[data-task]').forEach(input => input.addEventListener('change', () => {
    state.phases[`${currentPhase}-${Number(input.dataset.task)}`] = input.checked;
    saveState();
    renderPhaseTabs();
    renderPhasePanel();
  }));
  panel.querySelector('#prev-phase')?.addEventListener('click', () => setPhase(currentPhase - 1));
  panel.querySelector('#next-phase')?.addEventListener('click', () => setPhase(currentPhase + 1));
}
function setPhase(index) {
  if (index < 0 || index >= PHASES.length) return;
  currentPhase = index;
  renderPhaseTabs();
  renderPhasePanel();
}
function renderPrep() {
  const list = document.getElementById('prep-list');
  if (!list) return;
  const done = PREPARATION.reduce((count, _, i) => count + (state.prep[i] ? 1 : 0), 0);
  list.innerHTML = PREPARATION.map((p, i) => {
    const checked = Boolean(state.prep[i]);
    return `<label class="prep-item ${checked ? 'prep-done' : ''}"><input type="checkbox" data-prep="${i}" ${checked ? 'checked' : ''}><span class="prep-custom-check" aria-hidden="true">✓</span><span><strong>${escapeHTML(p.title)}</strong><small>${escapeHTML(p.desc)}</small></span></label>`;
  }).join('');
  document.getElementById('prep-score').textContent = `${done}/${PREPARATION.length}`;
  const meter = document.getElementById('prep-progress');
  meter.setAttribute('aria-valuenow', String(done));
  document.getElementById('prep-progress-bar').style.width = `${(done / PREPARATION.length) * 100}%`;
  list.querySelectorAll('input[data-prep]').forEach(input => input.addEventListener('change', () => {
    state.prep[Number(input.dataset.prep)] = input.checked;
    saveState(); renderPrep();
  }));
}
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast._timeout);
  showToast._timeout = setTimeout(() => toast.classList.remove('is-visible'), 3500);
}
function getSummary() {
  const lines = [
    'GROWTH AMBIENTAL — RESUMO DE IMPLEMENTAÇÃO E ONBOARDING',
    'Plano-base ilustrativo: 10 semanas · 5 etapas',
    'Durações e escopo sujeitos a diagnóstico e aprovação.', '',
    ...PHASES.flatMap((p, index) => [
      `${p.number}. ${p.title.toUpperCase()} — ${p.weeks}`,
      `Entrega: ${p.deliverable}`,
      ...p.activities.map((a, i) => `[${state.phases[`${index}-${i}`] ? 'x' : ' '}] ${a.text} (${a.who})`), ''
    ]),
    'PREPARAÇÃO DA CONSULTORIA',
    ...PREPARATION.map((p, i) => `[${state.prep[i] ? 'x' : ' '}] ${p.title}`), '',
    'Este documento apresenta marcações locais deste navegador. Não é um status oficial de implantação nem comprovação de entregas.',
    'Growth Ambiental | Implementação e Onboarding'
  ];
  return lines.join('\n');
}
async function copySummary() {
  const summary = getSummary();
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(summary);
    } else {
      const temp = document.createElement('textarea');
      temp.value = summary;
      temp.style.position = 'fixed'; temp.style.left = '-9999px';
      document.body.appendChild(temp); temp.select();
      const ok = document.execCommand('copy');
      temp.remove();
      if (!ok) throw new Error('Falha ao copiar');
    }
    showToast('Resumo do plano copiado para a área de transferência.');
  } catch (_) {
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'growth-ambiental-plano-de-implementacao.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Não foi possível copiar; resumo salvo em arquivo de texto.');
  }
}
function setupNavigation() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav-primary');
  if (!toggle || !nav) return;
  const close = () => {
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    nav.classList.remove('is-open');
  };
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.classList.toggle('is-open', !isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', !isOpen ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', !isOpen);
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', e => { if (!toggle.contains(e.target) && !nav.contains(e.target)) close(); });
}
function setupFAQ() {
  document.querySelectorAll('.faq-list details').forEach(detail => detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    document.querySelectorAll('.faq-list details').forEach(other => { if (other !== detail) other.open = false; });
  }));
}

loadState();
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = String(new Date().getFullYear());
  setupNavigation(); setupFAQ(); setPhase(0); renderPrep();
  document.getElementById('reset-prep')?.addEventListener('click', () => {
    state.prep = {}; saveState(); renderPrep(); showToast('Marcações de preparação apagadas.');
  });
  document.getElementById('copy-plan')?.addEventListener('click', copySummary);
});
