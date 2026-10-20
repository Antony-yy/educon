import '/src/styles/coord.css';
import '/src/styles/professores.css';
import { monitorarSessao, protegerRota } from './config/session.js';
import { ativarLogout } from './services/logout.js';
import { criarModalAluno, criarModalTurma, criarModalProfessor } from './components/modalCadastro.js';
import {
  alterarStatusProfessor, excluirAluno, excluirTurma, formatarCpf, formatarTelefone,
  listarAlunos, listarProfessores, listarTurmas
} from './services/cadastrosService.js';
import { inicializarSeedData } from './services/storageService.js';

protegerRota(['coordenador']);
monitorarSessao(['coordenador']);

const SECOES = ['turmas', 'alunos', 'professores'];
const SECOES_COM_ABAS = ['turmas', 'professores'];

document.addEventListener('DOMContentLoaded', () => {
  inicializarSeedData();
  const atualizarTela = () => {
    atualizarContadores();
    renderizarTurmas();
    renderizarAlunos();
    renderizarProfessores();
  };
  document.querySelector('#btn-logout') && ativarLogout(document.querySelector('#btn-logout'));
  document.querySelector('#btn-cadastrar-aluno')?.addEventListener('click', () => criarModalAluno(atualizarTela));
  document.querySelector('#btn-criar-turma')?.addEventListener('click', () => criarModalTurma(atualizarTela));
  document.querySelector('#btn-cadastrar-professor')?.addEventListener('click', () => criarModalProfessor(atualizarTela));
  document.querySelector('#busca-turma')?.addEventListener('input', renderizarTurmas);
  document.querySelector('#busca-aluno')?.addEventListener('input', renderizarAlunos);
  document.querySelector('#busca-professor')?.addEventListener('input', renderizarProfessores);

  // Menu lateral e abas apontam para as mesmas seções.
  document.querySelectorAll('[data-nav]').forEach((link) => link.addEventListener('click', (evento) => {
    evento.preventDefault();
    exibirSecao(link.dataset.nav);
  }));
  document.querySelectorAll('[data-tab]').forEach((aba) => aba.addEventListener('click', () => exibirSecao(aba.dataset.tab)));

  window.addEventListener('hashchange', () => exibirSecao(secaoDoHash()));
  atualizarTela();
  exibirSecao(secaoDoHash());
});

function secaoDoHash() {
  const secao = window.location.hash.replace('#', '');
  return secao === 'matriculas' ? 'alunos' : (SECOES.includes(secao) ? secao : 'turmas');
}

function exibirSecao(secao) {
  document.querySelectorAll('[data-secao]').forEach((elemento) => {
    elemento.classList.toggle('painel-oculto', elemento.dataset.secao !== secao);
  });
  document.querySelector('#tabs-painel').classList.toggle('painel-oculto', !SECOES_COM_ABAS.includes(secao));
  document.querySelectorAll('[data-tab]').forEach((aba) => {
    const ativa = aba.dataset.tab === secao;
    aba.classList.toggle('tabs_item--active', ativa);
    aba.setAttribute('aria-selected', String(ativa));
  });
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const ativo = link.dataset.nav === secao;
    link.classList.toggle('nav_link--active', ativo);
    if (ativo) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  // Guarda a seção na URL para o F5 manter a aba (replaceState não dispara hashchange).
  if (window.location.hash !== `#${secao}`) history.replaceState(null, '', `#${secao}`);
}

function atualizarContadores() {
  const alunos = listarAlunos();
  const turmas = listarTurmas();
  document.querySelector('.stat_value_alunos').textContent = `${alunos.length} aluno${alunos.length === 1 ? '' : 's'}`;
  document.querySelector('#stat-turmas').textContent = `${turmas.length} turma${turmas.length === 1 ? '' : 's'}`;
  atualizarContadoresProfessores();
}

// --- PROFESSORES ---
// Professores do seed antigo não têm o campo "ativo": contam como ativos.
const ehAtivo = (professor) => professor.ativo !== false;
const plural = (qtd, singular, pluralTxt) => `${qtd} ${qtd === 1 ? singular : pluralTxt}`;

function atualizarContadoresProfessores() {
  const professores = listarProfessores();
  const ativos = professores.filter(ehAtivo).length;
  document.querySelector('#stat-total').textContent = plural(professores.length, 'docente', 'docentes');
  document.querySelector('#stat-ativos').textContent = plural(ativos, 'ativo', 'ativos');
  document.querySelector('#stat-inativos').textContent = plural(professores.length - ativos, 'inativo', 'inativos');
  document.querySelector('#tabs-badge').textContent = professores.length;
}

function criarBadgeStatus(ativo) {
  const badge = document.createElement('span');
  badge.className = `status-badge status-badge--${ativo ? 'active' : 'inactive'}`;
  const ponto = document.createElement('span');
  ponto.className = 'status-dot';
  badge.append(ponto, ativo ? ' Ativo' : ' Inativo');
  return badge;
}

function criarAcoesProfessor(professor) {
  const ativo = ehAtivo(professor);
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `btn-sm ${ativo ? 'btn-sm--danger' : 'btn-sm--success'}`;
  botao.textContent = ativo ? 'Desativar' : 'Ativar';
  botao.addEventListener('click', () => {
    alterarStatusProfessor(professor.id, !ativo);
    atualizarContadoresProfessores();
    renderizarProfessores();
  });
  const acoes = document.createElement('div');
  acoes.className = 'actions';
  acoes.append(botao);
  return acoes;
}

function renderizarProfessores() {
  const corpo = document.querySelector('#lista-professores');
  const termo = document.querySelector('#busca-professor').value.trim().toLocaleLowerCase();
  const professores = listarProfessores()
    .filter((p) => [p.nome, p.email, formatarCpf(p.cpf), formatarTelefone(p.telefone)]
      .some((valor) => (valor || '').toLocaleLowerCase().includes(termo)))
    .sort((a, b) => Number(ehAtivo(b)) - Number(ehAtivo(a)) || a.nome.localeCompare(b.nome, 'pt-BR'));
  corpo.replaceChildren();
  if (!professores.length) {
    const linha = document.createElement('tr');
    const celula = criarCelula(termo ? 'Nenhum professor encontrado.' : 'Nenhum professor cadastrado.');
    celula.colSpan = 6; celula.className = 'empty-table'; linha.append(celula); corpo.append(linha);
    return;
  }
  professores.forEach((professor) => {
    const linha = document.createElement('tr');
    const nome = criarCelula(professor.nome); nome.className = 'teacher-name';
    const secundaria = (texto) => { const celula = criarCelula(texto || '—'); celula.className = 'teacher-email'; return celula; };
    linha.append(
      nome,
      secundaria(formatarCpf(professor.cpf)),
      secundaria(professor.email),
      secundaria(formatarTelefone(professor.telefone)),
      criarCelula(criarBadgeStatus(ehAtivo(professor))),
      criarCelula(criarAcoesProfessor(professor))
    );
    corpo.append(linha);
  });
}

function criarCelula(conteudo) {
  const celula = document.createElement('td');
  conteudo instanceof Node ? celula.append(conteudo) : celula.append(conteudo);
  return celula;
}

function renderizarTurmas() {
  const corpo = document.querySelector('#lista-turmas');
  corpo.classList.remove('lista-turmas--carregando');
  const termo = document.querySelector('#busca-turma').value.trim().toLocaleLowerCase();
  const turmas = listarTurmas().filter((turma) => [turma.nome, turma.segmento, turma.professor, turma.turno]
    .some((valor) => valor.toLocaleLowerCase().includes(termo)));
  corpo.replaceChildren();
  if (!turmas.length) {
    const linha = document.createElement('tr');
    const celula = criarCelula(termo ? 'Nenhuma turma encontrada.' : 'Nenhuma turma cadastrada. Crie a primeira turma.');
    celula.colSpan = 5; celula.className = 'empty-table'; linha.append(celula); corpo.append(linha);
    return;
  }
  const totalPorTurma = listarAlunos().reduce((totais, aluno) => ({ ...totais, [aluno.turmaId]: (totais[aluno.turmaId] || 0) + 1 }), {});
  turmas.forEach((turma) => {
    const linha = document.createElement('tr');
    const descricao = document.createElement('div');
    const nome = document.createElement('p'); nome.className = 'class-name'; nome.textContent = turma.nome;
    const nivel = document.createElement('p'); nivel.className = 'class-level'; nivel.textContent = turma.segmento;
    descricao.append(nome, nivel);
    const turno = document.createElement('span'); turno.className = 'pill'; turno.textContent = turma.turno;
    const acoes = document.createElement('div'); acoes.className = 'actions';
    const editar = document.createElement('button'); editar.type = 'button'; editar.className = 'btn-sm'; editar.textContent = 'Editar';
    editar.addEventListener('click', () => criarModalTurma(() => { atualizarContadores(); renderizarTurmas(); }, turma));
    const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'btn-icon btn-danger'; remover.setAttribute('aria-label', `Excluir ${turma.nome}`); remover.innerHTML = '<i class="bi bi-trash"></i>';
    remover.addEventListener('click', () => {
      if (window.confirm(`Excluir a turma ${turma.nome}? Os alunos ficarão não enturmados.`)) {
        excluirTurma(turma.id); atualizarContadores(); renderizarTurmas();
      }
    });
    acoes.append(editar, remover);
    linha.append(criarCelula(descricao), criarCelula(turno), criarCelula(turma.professor), criarCelula(String(totalPorTurma[turma.id] || 0)), criarCelula(acoes));
    corpo.append(linha);
  });
}

function renderizarAlunos() {
  const corpo = document.querySelector('#lista-alunos');
  const termo = document.querySelector('#busca-aluno').value.trim().toLocaleLowerCase();
  const alunos = listarAlunos()
    .filter((aluno) => [aluno.nome, aluno.matricula, aluno.turmaNome, aluno.nomeResponsavel]
      .some((valor) => (valor || '').toLocaleLowerCase().includes(termo)))
    .sort((primeiro, segundo) => primeiro.nome.localeCompare(segundo.nome, 'pt-BR'));
  corpo.replaceChildren();
  if (!alunos.length) {
    const linha = document.createElement('tr');
    const celula = criarCelula(termo ? 'Nenhum aluno encontrado.' : 'Ainda não há alunos matriculados.');
    celula.colSpan = 6; celula.className = 'empty-table'; linha.append(celula); corpo.append(linha);
    return;
  }
  alunos.forEach((aluno) => {
    const linha = document.createElement('tr');
    const nome = document.createElement('p'); nome.className = 'class-name'; nome.textContent = aluno.nome;
    const email = document.createElement('p'); email.className = 'class-level'; email.textContent = aluno.email;
    const descricao = document.createElement('div'); descricao.append(nome, email);
    const excluir = document.createElement('button');
    excluir.type = 'button'; excluir.className = 'btn-icon btn-danger';
    excluir.setAttribute('aria-label', `Excluir matrícula de ${aluno.nome}`);
    excluir.innerHTML = '<i class="bi bi-trash"></i>';
    excluir.addEventListener('click', () => {
      if (window.confirm(`Excluir a matrícula de ${aluno.nome}? Esta ação também remove o acesso do aluno.`)) {
        excluirAluno(aluno.matricula);
        atualizarContadores();
        renderizarAlunos();
      }
    });
    linha.append(
      criarCelula(descricao), criarCelula(aluno.matricula), criarCelula(aluno.turmaNome || 'Não Enturmado'),
      criarCelula(aluno.nomeResponsavel), criarCelula(aluno.telefone), criarCelula(excluir)
    );
    corpo.append(linha);
  });
}