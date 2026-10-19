import '/src/styles/coord.css';
import { monitorarSessao, protegerRota } from './config/session.js';
import { ativarLogout } from './services/logout.js';
import { criarModalAluno, criarModalTurma } from './components/modalCadastro.js';
import { excluirTurma, listarAlunos, listarTurmas } from './services/cadastrosService.js';
import { inicializarSeedData } from './services/storageService.js';

protegerRota(['coordenador']);
monitorarSessao(['coordenador']);

document.addEventListener('DOMContentLoaded', () => {
  inicializarSeedData();
  const atualizarTela = () => {
    atualizarContadores();
    renderizarTurmas();
    if (!document.querySelector('#painel-alunos').classList.contains('painel-oculto')) renderizarAlunos();
  };
  document.querySelector('#btn-logout') && ativarLogout(document.querySelector('#btn-logout'));
  document.querySelector('#btn-cadastrar-aluno')?.addEventListener('click', () => criarModalAluno(atualizarTela));
  document.querySelector('#btn-criar-turma')?.addEventListener('click', () => criarModalTurma(atualizarTela));
  document.querySelector('#busca-turma')?.addEventListener('input', renderizarTurmas);
  document.querySelector('#btn-matriculas-alunos')?.addEventListener('click', (evento) => {
    evento.preventDefault();
    exibirSecao('alunos');
  });
  document.querySelector('#btn-gestao-turmas')?.addEventListener('click', (evento) => {
    evento.preventDefault();
    exibirSecao('turmas');
  });
  document.querySelector('#busca-aluno')?.addEventListener('input', renderizarAlunos);
  atualizarTela();
});

function exibirSecao(secao) {
  const mostrandoAlunos = secao === 'alunos';
  document.querySelector('#painel-alunos').classList.toggle('painel-oculto', !mostrandoAlunos);
  document.querySelector('#tabs-painel').classList.toggle('painel-oculto', mostrandoAlunos);
  document.querySelector('#resumo-painel').classList.toggle('painel-oculto', mostrandoAlunos);
  document.querySelector('#painel-turmas').classList.toggle('painel-oculto', mostrandoAlunos);
  document.querySelector('#btn-criar-turma').classList.toggle('painel-oculto', mostrandoAlunos);
  document.querySelector('#btn-matriculas-alunos').classList.toggle('nav_link--active', mostrandoAlunos);
  document.querySelector('#btn-gestao-turmas').classList.toggle('nav_link--active', !mostrandoAlunos);
  document.querySelector('#btn-matriculas-alunos').toggleAttribute('aria-current', mostrandoAlunos);
  document.querySelector('#btn-gestao-turmas').toggleAttribute('aria-current', !mostrandoAlunos);
  if (mostrandoAlunos) renderizarAlunos();
}

function atualizarContadores() {
  const alunos = listarAlunos();
  const turmas = listarTurmas();
  document.querySelector('.stat_value_alunos').textContent = `${alunos.length} aluno${alunos.length === 1 ? '' : 's'}`;
  document.querySelector('#stat-turmas').textContent = `${turmas.length} turma${turmas.length === 1 ? '' : 's'}`;
}

function criarCelula(conteudo) {
  const celula = document.createElement('td');
  conteudo instanceof Node ? celula.append(conteudo) : celula.append(conteudo);
  return celula;
}

function renderizarTurmas() {
  const corpo = document.querySelector('#lista-turmas');
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
    celula.colSpan = 5; celula.className = 'empty-table'; linha.append(celula); corpo.append(linha);
    return;
  }
  alunos.forEach((aluno) => {
    const linha = document.createElement('tr');
    const nome = document.createElement('p'); nome.className = 'class-name'; nome.textContent = aluno.nome;
    const email = document.createElement('p'); email.className = 'class-level'; email.textContent = aluno.email;
    const descricao = document.createElement('div'); descricao.append(nome, email);
    linha.append(
      criarCelula(descricao), criarCelula(aluno.matricula), criarCelula(aluno.turmaNome || 'Não Enturmado'),
      criarCelula(aluno.nomeResponsavel), criarCelula(aluno.telefone)
    );
    corpo.append(linha);
  });
}
