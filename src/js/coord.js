import { monitorarSessao, protegerRota } from './config/session.js';
import { ativarLogout } from './services/logout.js';
import { criarModalAluno, criarModalProfessor, criarModalTurma } from './components/modalCadastro.js';
import { alunoCompativelComTurma, alterarStatusProfessor, enturmarAluno, excluirAluno, excluirTurma, formatarCpf, formatarTelefone, listarAlunos, listarProfessores, listarTurmas } from './services/cadastrosService.js';
import { inicializarSeedData } from './services/storageService.js';

protegerRota(['coordenador']);
monitorarSessao(['coordenador']);

document.addEventListener('DOMContentLoaded', () => {
  inicializarSeedData();
  const atualizarTela = () => {
    atualizarContadores();
    renderizarTurmas();
    renderizarAlunos();
    renderizarProfessores();
    renderizarEnturmacao();
  };
  document.querySelector('#btn-logout') && ativarLogout(document.querySelector('#btn-logout'));
  document.querySelector('#btn-cadastrar-aluno')?.addEventListener('click', () => criarModalAluno(atualizarTela));
  document.querySelector('#btn-criar-turma')?.addEventListener('click', () => criarModalTurma(atualizarTela));
  document.querySelector('#btn-novo-professor')?.addEventListener('click', () => criarModalProfessor(atualizarTela));
  document.querySelector('#busca-turma')?.addEventListener('input', renderizarTurmas);
  document.querySelector('#busca-aluno')?.addEventListener('input', renderizarAlunos);
  document.querySelector('#busca-professor')?.addEventListener('input', renderizarProfessores);
  document.querySelector('#seletor-turma-enturmar')?.addEventListener('change', renderizarEnturmacao);
  document.querySelector('#busca-aluno-disponivel')?.addEventListener('input', renderizarEnturmacao);
  document.querySelector('#busca-aluno-enturmado')?.addEventListener('input', renderizarEnturmacao);
  document.querySelectorAll('[data-secao]').forEach((controle) => controle.addEventListener('click', (evento) => {
    evento.preventDefault();
    exibirSecao(controle.dataset.secao);
  }));
  atualizarTela();
  exibirSecao(location.hash.slice(1) || 'turmas');
});

function exibirSecao(secao) {
  const secaoValida = ['alunos', 'turmas', 'professores', 'enturmar'].includes(secao) ? secao : 'turmas';
  history.replaceState(null, '', `#${secaoValida}`);
  const paineis = {
    turmas: ['#resumo-painel', '#painel-turmas'],
    alunos: ['#painel-alunos'],
    professores: ['#resumo-professores', '#painel-professores'],
    enturmar: ['#painel-enturmar']
  };
  ['#resumo-painel', '#painel-turmas', '#painel-alunos', '#resumo-professores', '#painel-professores', '#painel-enturmar']
    .forEach((seletor) => document.querySelector(seletor)?.classList.add('painel-oculto'));
  paineis[secaoValida].forEach((seletor) => document.querySelector(seletor)?.classList.remove('painel-oculto'));
  document.querySelector('#btn-cadastrar-aluno')?.classList.toggle('painel-oculto', secaoValida !== 'alunos');
  document.querySelector('#btn-criar-turma')?.classList.toggle('painel-oculto', secaoValida !== 'turmas');
  document.querySelector('#btn-novo-professor')?.classList.toggle('painel-oculto', secaoValida !== 'professores');
  document.querySelectorAll('[data-secao]').forEach((controle) => {
    const ativo = controle.dataset.secao === secaoValida;
    controle.classList.toggle(controle.classList.contains('nav_link') ? 'nav_link--active' : 'tabs_item--active', ativo);
    if (controle.matches('[role="tab"]')) controle.setAttribute('aria-selected', String(ativo));
    else if (ativo) controle.setAttribute('aria-current', 'page');
    else controle.removeAttribute('aria-current');
  });
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
    const enturmar = document.createElement('button'); enturmar.type = 'button'; enturmar.className = 'btn-sm'; enturmar.textContent = 'Enturmar';
    enturmar.addEventListener('click', () => abrirEnturmacao(turma.id));
    const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'btn-icon btn-danger'; remover.setAttribute('aria-label', `Excluir ${turma.nome}`); remover.innerHTML = '<i class="bi bi-trash"></i>';
    remover.addEventListener('click', () => {
      if (window.confirm(`Excluir a turma ${turma.nome}? Os alunos ficarão não enturmados.`)) {
        excluirTurma(turma.id); atualizarContadores(); renderizarTurmas();
      }
    });
    acoes.append(enturmar, editar, remover);
    linha.append(criarCelula(descricao), criarCelula(turno), criarCelula(turma.professor), criarCelula(String(totalPorTurma[turma.id] || 0)), criarCelula(acoes));
    corpo.append(linha);
  });
}

function abrirEnturmacao(turmaId) {
  const seletor = document.querySelector('#seletor-turma-enturmar');
  if (seletor) seletor.value = turmaId;
  exibirSecao('enturmar');
  renderizarEnturmacao();
}

function criarLinhaEnturmacao(aluno, acao, rotulo) {
  const item = document.createElement('li');
  item.className = 'enrollment-student';
  const detalhes = document.createElement('div');
  const nome = document.createElement('p');
  nome.className = 'enrollment-student_name';
  nome.textContent = aluno.nome;
  const matricula = document.createElement('p');
  matricula.className = 'enrollment-student_id';
  matricula.textContent = aluno.matricula;
  detalhes.append(nome, matricula);
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'btn-icon enrollment-transfer';
  botao.setAttribute('aria-label', `${rotulo} ${aluno.nome}`);
  botao.innerHTML = `<i class="bi ${rotulo === 'Adicionar' ? 'bi-arrow-right' : 'bi-arrow-left'}" aria-hidden="true"></i>`;
  botao.addEventListener('click', () => {
    const turmaId = document.querySelector('#seletor-turma-enturmar').value;
    try {
      enturmarAluno(aluno.matricula, rotulo === 'Adicionar' ? turmaId : null);
      renderizarTurmas();
      renderizarAlunos();
      atualizarContadores();
      renderizarEnturmacao();
    } catch (erro) {
      window.alert(erro.message);
    }
  });
  item.append(detalhes, botao);
  return item;
}

function renderizarListaEnturmacao(lista, alunos, termo, mensagem, acao, rotulo) {
  lista.replaceChildren();
  const filtrados = alunos.filter((aluno) => [aluno.nome, aluno.matricula]
    .some((valor) => (valor || '').toLocaleLowerCase().includes(termo)));
  if (!filtrados.length) {
    const vazio = document.createElement('li');
    vazio.className = 'enrollment-empty';
    vazio.textContent = mensagem;
    lista.append(vazio);
    return;
  }
  filtrados.forEach((aluno) => lista.append(criarLinhaEnturmacao(aluno, acao, rotulo)));
}

function renderizarEnturmacao() {
  const seletor = document.querySelector('#seletor-turma-enturmar');
  if (!seletor) return;
  const turmaSelecionada = seletor.value;
  const turmas = listarTurmas();
  seletor.replaceChildren(...turmas.map((turma) => new Option(turma.nome, turma.id)));
  if (turmas.some((turma) => turma.id === turmaSelecionada)) seletor.value = turmaSelecionada;
  const turma = turmas.find((item) => item.id === seletor.value);
  const resumo = document.querySelector('#detalhes-turma-enturmar');
  const disponiveisLista = document.querySelector('#lista-alunos-disponiveis');
  const enturmadosLista = document.querySelector('#lista-alunos-enturmados');
  if (!turma) {
    resumo.textContent = turmas.length ? 'Selecione uma turma para consultar o segmento e o professor regente.' : 'Cadastre uma turma para iniciar a enturmação.';
    document.querySelector('#disponiveis-contagem').textContent = '0 alunos';
    document.querySelector('#nesta-turma-contagem').textContent = '0 alunos';
    renderizarListaEnturmacao(disponiveisLista, [], '', 'Nenhuma turma selecionada.', () => {}, 'Adicionar');
    renderizarListaEnturmacao(enturmadosLista, [], '', 'Nenhuma turma selecionada.', () => {}, 'Remover');
    return;
  }

  resumo.textContent = `Segmento: ${turma.segmento} | Professor Regente: ${turma.professor || 'Não definido'}`;
  const alunosDoSegmento = listarAlunos().filter((aluno) => alunoCompativelComTurma(aluno, turma));
  const enturmados = alunosDoSegmento.filter((aluno) => aluno.turmaId === turma.id)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const disponiveis = alunosDoSegmento.filter((aluno) => !aluno.turmaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  document.querySelector('#disponiveis-contagem').textContent = `${disponiveis.length} aluno${disponiveis.length === 1 ? '' : 's'}`;
  document.querySelector('#nesta-turma-contagem').textContent = `${enturmados.length} aluno${enturmados.length === 1 ? '' : 's'}`;
  renderizarListaEnturmacao(disponiveisLista, disponiveis, document.querySelector('#busca-aluno-disponivel').value.trim().toLocaleLowerCase(), 'Nenhum aluno sem turma neste segmento.', enturmarAluno, 'Adicionar');
  renderizarListaEnturmacao(enturmadosLista, enturmados, document.querySelector('#busca-aluno-enturmado').value.trim().toLocaleLowerCase(), 'Nenhum aluno nesta turma.', enturmarAluno, 'Remover');
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

const professorAtivo = (professor) => professor.ativo !== false;
const plural = (quantidade, singular, pluralTexto) => `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;

function criarCelulaProfessor(conteudo, classe = '') {
  const celula = document.createElement('td');
  celula.className = classe;
  celula.append(conteudo);
  return celula;
}

function renderizarProfessores() {
  const corpo = document.querySelector('#lista-professores');
  if (!corpo) return;
  const todos = listarProfessores();
  const ativos = todos.filter(professorAtivo).length;
  document.querySelector('#stat-total').textContent = plural(todos.length, 'docente', 'docentes');
  document.querySelector('#stat-ativos').textContent = plural(ativos, 'ativo', 'ativos');
  document.querySelector('#stat-inativos').textContent = plural(todos.length - ativos, 'inativo', 'inativos');
  document.querySelector('#tabs-badge').textContent = String(todos.length);

  const termo = document.querySelector('#busca-professor').value.trim().toLocaleLowerCase();
  const professores = todos
    .filter((professor) => [professor.nome, professor.email, formatarCpf(professor.cpf), formatarTelefone(professor.telefone)]
      .some((valor) => (valor || '').toLocaleLowerCase().includes(termo)))
    .sort((a, b) => Number(professorAtivo(b)) - Number(professorAtivo(a)) || a.nome.localeCompare(b.nome, 'pt-BR'));
  corpo.replaceChildren();
  if (!professores.length) {
    const linha = document.createElement('tr');
    const celula = criarCelula('Nenhum professor encontrado.', 'empty-table');
    celula.colSpan = 6;
    linha.append(celula);
    corpo.append(linha);
    return;
  }

  professores.forEach((professor) => {
    const ativo = professorAtivo(professor);
    const linha = document.createElement('tr');
    const badge = document.createElement('span');
    badge.className = `status-badge status-badge--${ativo ? 'active' : 'inactive'}`;
    const ponto = document.createElement('span');
    ponto.className = 'status-dot';
    badge.append(ponto, ativo ? ' Ativo' : ' Inativo');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `btn-sm ${ativo ? 'btn-sm--danger' : 'btn-sm--success'}`;
    botao.textContent = ativo ? 'Desativar' : 'Ativar';
    botao.addEventListener('click', () => { alterarStatusProfessor(professor.id, !ativo); renderizarProfessores(); });
    const acoes = document.createElement('div');
    acoes.className = 'actions';
    acoes.append(botao);
    linha.append(
      criarCelulaProfessor(professor.nome, 'teacher-name'),
      criarCelulaProfessor(formatarCpf(professor.cpf) || '—'),
      criarCelulaProfessor(professor.email || '—', 'teacher-email'),
      criarCelulaProfessor(formatarTelefone(professor.telefone) || '—'),
      criarCelulaProfessor(badge),
      criarCelulaProfessor(acoes)
    );
    corpo.append(linha);
  });
}

