import {
  cadastrarAluno, cadastrarTurma, atualizarTurma, listarAlunos,
  listarProfessoresAtivos, cadastrarProfessor, TURMAS_POR_SEGMENTO
} from '../services/cadastrosService.js';

function criarCampo({ id, rotulo, tipo = 'text', opcoes = [], multiplo = false, obrigatorio = true, selecao = false }) {
  const campo = document.createElement('div');
  campo.className = 'field';
  const label = document.createElement('label');
  label.className = 'field_label';
  label.htmlFor = id;
  label.textContent = obrigatorio ? `${rotulo} *` : rotulo;
  const input = opcoes.length || selecao ? document.createElement('select') : document.createElement('input');
  input.className = 'field_input';
  input.id = id;
  input.name = id;
  input.required = obrigatorio;
  input.multiple = multiplo;
  if (multiplo) input.size = Math.min(Math.max(opcoes.length, 3), 6);
  if (opcoes.length) opcoes.forEach(({ valor, texto }) => input.add(new Option(texto, valor)));
  else if (!selecao) input.type = tipo;
  campo.append(label, input);
  return campo;
}

function criarSeletorAlunos(turma) {
  const alunosDisponiveis = listarAlunos().filter((aluno) => {
    const estaSemTurma = !aluno.turmaId && (!aluno.turmaNome || aluno.turmaNome === 'Não Enturmado');
    return estaSemTurma || aluno.turmaId === turma?.id;
  });
  const matriculasDaTurma = new Set(
    listarAlunos().filter((aluno) => aluno.turmaId === turma?.id).map((aluno) => aluno.matricula)
  );
  const campo = document.createElement('div');
  campo.className = 'field';
  const label = document.createElement('label');
  label.className = 'field_label';
  label.textContent = 'Alunos da turma';
  const busca = document.createElement('input');
  busca.className = 'field_input seletor-busca';
  busca.type = 'search';
  busca.placeholder = 'Pesquisar aluno ou matrícula...';
  busca.setAttribute('aria-label', 'Pesquisar alunos disponíveis');
  const lista = document.createElement('div');
  lista.className = 'seletor-alunos';
  const vazio = document.createElement('p');
  vazio.className = 'seletor-vazio';
  vazio.textContent = alunosDisponiveis.length ? '' : 'Não há alunos disponíveis para esta turma.';
  alunosDisponiveis.forEach((aluno) => {
    const item = document.createElement('label');
    item.className = 'seletor-aluno';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.name = 'matriculas'; checkbox.value = aluno.matricula;
    checkbox.checked = matriculasDaTurma.has(aluno.matricula);
    const texto = document.createElement('span');
    texto.textContent = `${aluno.nome} — ${aluno.matricula}`;
    item.append(checkbox, texto);
    lista.append(item);
  });
  busca.addEventListener('input', () => {
    const termo = busca.value.trim().toLocaleLowerCase();
    [...lista.children].forEach((item) => { item.hidden = !item.textContent.toLocaleLowerCase().includes(termo); });
  });
  campo.append(label, busca, lista, vazio);
  return campo;
}

function criarModal(titulo, campos, aoEnviar, textoBotao) {
  document.querySelector('.modal-backdrop')?.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const conteudo = document.createElement('div');
  conteudo.className = 'modal-content';
  const cabecalho = document.createElement('div');
  cabecalho.className = 'modal-header';
  const heading = document.createElement('h2');
  heading.textContent = titulo;
  const fechar = document.createElement('button');
  fechar.className = 'btn-close'; fechar.type = 'button'; fechar.setAttribute('aria-label', 'Fechar'); fechar.innerHTML = '&times;';
  cabecalho.append(heading, fechar);
  const form = document.createElement('form');
  form.className = 'form-modal';
  campos.forEach((campo) => form.append(campo instanceof Node ? campo : criarCampo(campo)));
  const mensagem = document.createElement('p');
  mensagem.className = 'form-message';
  const acoes = document.createElement('div');
  acoes.className = 'modal-actions';
  const cancelar = document.createElement('button');
  cancelar.type = 'button'; cancelar.className = 'btn btn--ghost'; cancelar.textContent = 'Cancelar';
  const salvar = document.createElement('button');
  salvar.type = 'submit'; salvar.className = 'btn btn--primary'; salvar.textContent = textoBotao;
  acoes.append(cancelar, salvar);
  form.append(mensagem, acoes);
  conteudo.append(cabecalho, form);
  backdrop.append(conteudo);
  document.body.append(backdrop);
  const remover = () => backdrop.remove();
  fechar.addEventListener('click', remover);
  cancelar.addEventListener('click', remover);
  backdrop.addEventListener('click', (evento) => { if (evento.target === backdrop) remover(); });
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const formData = new FormData(form);
    const dados = Object.fromEntries(formData);
    dados.matriculas = formData.getAll('matriculas');
    try { aoEnviar(dados); remover(); } catch (erro) { mensagem.textContent = erro.message; }
  });
  return form;
}

export function criarModalAluno(onSucesso) {
  criarModal('Cadastrar novo aluno', [
    { id: 'nome', rotulo: 'Nome completo' },
    { id: 'segmento', rotulo: 'Segmento', opcoes: [{ valor: 'PREZINHO', texto: 'Pré-zinho (Educação Infantil)' }, { valor: 'FUNDAMENTAL_1', texto: 'Fundamental 1' }] },
    { id: 'dataNascimento', rotulo: 'Data de nascimento', tipo: 'date' },
    { id: 'nomeResponsavel', rotulo: 'Nome do responsável' },
    { id: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
    { id: 'email', rotulo: 'E-mail para acesso', tipo: 'email' }
  ], (dados) => { cadastrarAluno(dados); onSucesso?.(); }, 'Salvar matrícula');
}

export function criarModalTurma(onSucesso, turma = null) {
  const professores = listarProfessoresAtivos();
  const opcoesProfessores = professores.map((professor) => ({ valor: professor.nome, texto: professor.nome }));
  const form = criarModal(turma ? 'Editar turma' : 'Criar nova turma', [
    { id: 'segmento', rotulo: 'Segmento', opcoes: [{ valor: 'Educação Infantil', texto: 'Educação Infantil' }, { valor: 'Ensino Fundamental I', texto: 'Ensino Fundamental I' }] },
    { id: 'nome', rotulo: 'Turma', selecao: true },
    { id: 'turno', rotulo: 'Turno', opcoes: [{ valor: 'Matutino', texto: 'Matutino' }, { valor: 'Vespertino', texto: 'Vespertino' }] },
    { id: 'professor', rotulo: 'Professor regente', opcoes: opcoesProfessores },
    criarSeletorAlunos(turma)
  ], (dados) => { turma ? atualizarTurma(turma.id, dados) : cadastrarTurma(dados); onSucesso?.(); }, turma ? 'Salvar alterações' : 'Criar turma');
  const campoSegmento = form.querySelector('#segmento');
  const campoNome = form.querySelector('#nome');
  const atualizarTurmasDisponiveis = (nomeSelecionado = '') => {
    const turmas = TURMAS_POR_SEGMENTO[campoSegmento.value] || [];
    campoNome.replaceChildren(...turmas.map((nome) => new Option(nome, nome)));
    campoNome.value = turmas.includes(nomeSelecionado) ? nomeSelecionado : turmas[0];
  };
  if (turma) {
    Object.entries(turma).forEach(([chave, valor]) => {
      if (chave !== 'nome') {
        const input = form.elements.namedItem(chave);
        if (input) input.value = valor;
      }
    });
    atualizarTurmasDisponiveis(turma.nome);
  } else atualizarTurmasDisponiveis();
  campoSegmento.addEventListener('change', () => atualizarTurmasDisponiveis());
}
