import { cadastrarAluno, cadastrarTurma, atualizarTurma, listarAlunos } from '../services/cadastrosService.js';

function criarCampo({ id, rotulo, tipo = 'text', opcoes = [] }) {
  const campo = document.createElement('div');
  campo.className = 'field';
  const label = document.createElement('label');
  label.className = 'field_label';
  label.htmlFor = id;
  label.textContent = `${rotulo} *`;
  const input = opcoes.length ? document.createElement('select') : document.createElement('input');
  input.className = 'field_input';
  input.id = id;
  input.name = id;
  input.required = true;
  if (opcoes.length) opcoes.forEach(({ valor, texto }) => input.add(new Option(texto, valor)));
  else input.type = tipo;
  campo.append(label, input);
  return campo;
}

function criarSeletorAlunos(turma) {
  const alunos = listarAlunos().filter((aluno) => (
    aluno.turmaId === turma?.id || (!aluno.turmaId && aluno.turmaNome === 'Não Enturmado')
  ));
  const campo = document.createElement('div');
  campo.className = 'field';
  const titulo = document.createElement('p');
  titulo.className = 'field_label';
  titulo.textContent = 'Alunos da turma';
  const lista = document.createElement('div');
  lista.className = 'seletor-alunos';
  if (!alunos.length) lista.textContent = 'Não há alunos disponíveis.';
  alunos.forEach((aluno) => {
    const item = document.createElement('label');
    item.className = 'seletor-aluno';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.name = 'matriculas'; checkbox.value = aluno.matricula;
    checkbox.checked = aluno.turmaId === turma?.id;
    item.append(checkbox, document.createTextNode(`${aluno.nome} — ${aluno.matricula}`));
    lista.append(item);
  });
  campo.append(titulo, lista);
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
  const form = criarModal(turma ? 'Editar turma' : 'Criar nova turma', [
    { id: 'nome', rotulo: 'Nome da turma' },
    { id: 'segmento', rotulo: 'Segmento', opcoes: [{ valor: 'Educação Infantil', texto: 'Educação Infantil' }, { valor: 'Ensino Fundamental I', texto: 'Ensino Fundamental I' }] },
    { id: 'turno', rotulo: 'Turno', opcoes: [{ valor: 'Matutino', texto: 'Matutino' }, { valor: 'Vespertino', texto: 'Vespertino' }] },
    { id: 'professor', rotulo: 'Professor regente' },
    criarSeletorAlunos(turma)
  ], (dados) => { turma ? atualizarTurma(turma.id, dados) : cadastrarTurma(dados); onSucesso?.(); }, turma ? 'Salvar alterações' : 'Criar turma');
  if (turma) Object.entries(turma).forEach(([chave, valor]) => {
    const input = form.elements.namedItem(chave);
    if (input) input.value = valor;
  });
}
