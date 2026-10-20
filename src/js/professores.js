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