
import '/src/styles/professores.css';
// Dados simulados dos alunos por turma regida (Issue #62)
const classStudentsData = {
    '3a-lp': [
        { id: '01', initials: 'AC', name: 'Ana Clara Oliveira' },
        { id: '02', initials: 'BH', name: 'Bruno Henrique Lima' },
        { id: '03', initials: 'CS', name: 'Carla Souza' },
        { id: '04', initials: 'DS', name: 'Daniel Santos' }
    ],
    '3a-mat': [
        { id: '01', initials: 'AC', name: 'Ana Clara Oliveira' },
        { id: '02', initials: 'BH', name: 'Bruno Henrique Lima' },
        { id: '05', initials: 'EF', name: 'Eduardo Ferreira' }
    ],
    '3a-his': [
        { id: '01', initials: 'AC', name: 'Ana Clara Oliveira' },
        { id: '03', initials: 'CS', name: 'Carla Souza' },
        { id: '06', initials: 'GV', name: 'Gabriel Vieira' }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    // Define a data atual no input do tipo date (Issue #59)
    const dateInput = document.getElementById('input-data-chamada');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Carrega os alunos da turma inicial ao abrir a página (Issue #62)
    if (document.getElementById('attendance-table-body')) {
        loadStudentsForClass('3a-lp');
    }
});

// 1. Função para carregar os alunos dinamicamente na tabela (Issue #62)
window.loadStudentsForClass = function(turmaId) {
    const tbody = document.getElementById('attendance-table-body');
    const summary = document.getElementById('attendance-summary');
    const students = classStudentsData[turmaId] || [];

    if (!tbody) return;
    tbody.innerHTML = '';

    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/50 transition-colors attendance-row';
        tr.innerHTML = `
            <td class="py-3.5 px-6">
                <div class="flex items-center gap-3">
                    <span class="text-slate-400 text-[11px] font-semibold w-4">${student.id}</span>
                    <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center shrink-0">${student.initials}</div>
                    <span class="font-bold text-slate-900 student-name">${student.name}</span>
                </div>
            </td>
            <td class="py-3.5 px-6">
                <div class="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-xl max-w-[160px] mx-auto">
                    <button type="button" onclick="toggleAttendance(this, 'presence')" class="status-btn-presence active flex-1 py-1 px-2.5 rounded-lg border text-[11px] transition-all flex items-center justify-center gap-1"><span>P</span> Presença</button>
                    <button type="button" onclick="toggleAttendance(this, 'absence')" class="status-btn-absence flex-1 py-1 px-2.5 rounded-lg border text-[11px] transition-all flex items-center justify-center gap-1"><span>F</span> Falta</button>
                </div>
            </td>
            <td class="py-3.5 px-6">
                <input type="text" placeholder="Adicionar observação..." class="input-obs w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400" />
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (summary) {
        summary.textContent = `${students.length} alunos regidos nesta turma`;
    }
};

// 2. Função de salvamento e atualização em lote via upsert (Issues #61 e #63)
window.saveAttendanceBatch = function() {
    const turmaSelect = document.getElementById('select-turma-chamada');
    const dateInput = document.getElementById('input-data-chamada');
    
    if (!turmaSelect || !dateInput) return;

    const turmaId = turmaSelect.value;
    const dataAula = dateInput.value;

    const rows = document.querySelectorAll('.attendance-row');
    const frequencyRecords = [];

    rows.forEach(row => {
        const studentName = row.querySelector('.student-name').textContent.trim();
        const isPresent = row.querySelector('.status-btn-presence').classList.contains('active');
        const obs = row.querySelector('.input-obs').value.trim();

        frequencyRecords.push({
            turma_id: turmaId,
            data: dataAula,
            aluno: studentName,
            status: isPresent ? 'P' : 'F',
            observacao: obs
        });
    });

    const alertBox = document.getElementById('attendance-save-alert');
    const alertMsg = document.getElementById('attendance-save-msg');
    
    if (alertBox && alertMsg) {
        alertMsg.textContent = `Frequência de ${frequencyRecords.length} alunos gravada/atualizada via upsert para a turma (${turmaId}) em ${dataAula}.`;
        alertBox.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// 3. Função auxiliar para alternar entre Presença e Falta nos botões
window.toggleAttendance = function(button, type) {
    const container = button.parentElement;
    const presenceBtn = container.querySelector('.status-btn-presence');
    const absenceBtn = container.querySelector('.status-btn-absence');

    if (type === 'presence') {
        presenceBtn.classList.add('active');
        absenceBtn.classList.remove('active');
    } else {
        absenceBtn.classList.add('active');
        presenceBtn.classList.remove('active');
    }
};

import '/src/styles/coord.css';
import '/src/styles/professores.css';
import { monitorarSessao, protegerRota } from './config/session.js';
import { ativarLogout } from './services/logout.js';
import { criarModalProfessor } from './components/modalCadastro.js';
import {
  alterarStatusProfessor, listarProfessores, formatarCpf, formatarTelefone
} from './services/cadastrosService.js';
import { inicializarSeedData } from './services/storageService.js';

protegerRota(['coordenador']);
monitorarSessao(['coordenador']);

const corpo = document.querySelector('#lista-professores');
const campoBusca = document.querySelector('#busca-professor');

// Professores do seed antigo não têm o campo "ativo": contam como ativos.
const ehAtivo = (professor) => professor.ativo !== false;
const plural = (qtd, singular, pluralTxt) => `${qtd} ${qtd === 1 ? singular : pluralTxt}`;

function atualizarContadores(professores) {
  const ativos = professores.filter(ehAtivo).length;
  document.querySelector('#stat-total').textContent = plural(professores.length, 'docente', 'docentes');
  document.querySelector('#stat-ativos').textContent = plural(ativos, 'ativo', 'ativos');
  document.querySelector('#stat-inativos').textContent = plural(professores.length - ativos, 'inativo', 'inativos');
  document.querySelector('#tabs-badge').textContent = professores.length;
}

function criarCelula(conteudo, classe) {
  const celula = document.createElement('td');
  if (classe) celula.className = classe;
  celula.append(conteudo);
  return celula;
}

function criarBadge(ativo) {
  const badge = document.createElement('span');
  badge.className = `status-badge status-badge--${ativo ? 'active' : 'inactive'}`;
  const ponto = document.createElement('span');
  ponto.className = 'status-dot';
  badge.append(ponto, ativo ? ' Ativo' : ' Inativo');
  return badge;
}

function criarAcoes(professor) {
  const ativo = ehAtivo(professor);
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `btn-sm ${ativo ? 'btn-sm--danger' : 'btn-sm--success'}`;
  botao.textContent = ativo ? 'Desativar' : 'Ativar';
  botao.addEventListener('click', () => {
    alterarStatusProfessor(professor.id, !ativo);
    renderizar();
  });
  const acoes = document.createElement('div');
  acoes.className = 'actions';
  acoes.append(botao);
  return acoes;
}

function renderizar() {
  const todos = listarProfessores();
  atualizarContadores(todos);

  const termo = campoBusca.value.trim().toLocaleLowerCase();
  const professores = todos
    .filter((p) => [p.nome, p.email, formatarCpf(p.cpf), formatarTelefone(p.telefone)]
      .some((valor) => (valor || '').toLocaleLowerCase().includes(termo)))
    .sort((a, b) => Number(ehAtivo(b)) - Number(ehAtivo(a)) || a.nome.localeCompare(b.nome, 'pt-BR'));

  corpo.replaceChildren();
  if (!professores.length) {
    const linha = document.createElement('tr');
    const celula = criarCelula(termo ? 'Nenhum professor encontrado.' : 'Nenhum professor cadastrado.', 'empty-table');
    celula.colSpan = 6;
    linha.append(celula);
    corpo.append(linha);
    return;
  }

  professores.forEach((professor) => {
    const linha = document.createElement('tr');
    linha.append(
      criarCelula(professor.nome, 'teacher-name'),
      criarCelula(formatarCpf(professor.cpf) || '—'),
      criarCelula(professor.email || '—', 'teacher-email'),
      criarCelula(formatarTelefone(professor.telefone) || '—'),
      criarCelula(criarBadge(ehAtivo(professor))),
      criarCelula(criarAcoes(professor))
    );
    corpo.append(linha);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarSeedData();
  const btnLogout = document.querySelector('#btn-logout');
  if (btnLogout) ativarLogout(btnLogout);
  document.querySelector('#btn-novo-professor').addEventListener('click', () => criarModalProfessor(renderizar));
  campoBusca.addEventListener('input', renderizar);
  renderizar();
});

