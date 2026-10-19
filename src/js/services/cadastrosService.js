// src/js/services/cadastrosService.js
import {
  obterDados, salvarDados, CHAVE_ALUNOS, CHAVE_PROFESSORES,
  CHAVE_TURMAS, CHAVE_USUARIOS
} from './storageService.js';

export const TURMAS_POR_SEGMENTO = {
  'Educação Infantil': ['Infantil 1', 'Infantil 2', 'Infantil 3', 'Alfabetização'],
  'Ensino Fundamental I': Array.from({ length: 5 }, (_, indice) => (
    ['A', 'B', 'C'].map((letra) => `${indice + 1}º Ano ${letra}`)
  )).flat()
};

// --- GESTÃO DE ALUNOS ---
export function listarAlunos() {
  return obterDados(CHAVE_ALUNOS);
}

export function listarProfessores() {
  return obterDados(CHAVE_PROFESSORES);
}

export function cadastrarAluno(dadosForm) {
  const alunos = obterDados(CHAVE_ALUNOS);
  const usuarios = obterDados(CHAVE_USUARIOS);
  const anoAtual = new Date().getFullYear(); // 2026

  // 1. Gera a matrícula sequencial (Ex: 2026001, 2026002...)
  const maiorSequencial = alunos.reduce((maior, aluno) => {
    const sequencialAtual = Number(aluno.matricula?.slice(-3)) || 0;
    return Math.max(maior, sequencialAtual);
  }, 0);
  const sequencial = String(maiorSequencial + 1).padStart(3, '0');
  const matricula = `${anoAtual}${sequencial}`;
  const senhaInicial = matricula; // A senha inicial é a própria matrícula

  // 2. Registra o Aluno no banco de dados da escola
  const novoAluno = {
    id: crypto.randomUUID(),
    matricula,
    nome: dadosForm.nome,
    segmento: dadosForm.segmento,
    dataNascimento: dadosForm.dataNascimento,
    nomeResponsavel: dadosForm.nomeResponsavel,
    telefone: dadosForm.telefone,
    email: dadosForm.email,
    turmaNome: 'Não Enturmado'
  };

  alunos.unshift(novoAluno);
  salvarDados(CHAVE_ALUNOS, alunos);

  // 3. Cria a conta de acesso para o login do Aluno
  const usuarioAluno = {
    usuario: matricula, // O aluno usará a matrícula no campo "Usuário" do Login
    senha: senhaInicial, // Senha inicial
    nome: dadosForm.nome,
    perfil: 'aluno',
    matricula: matricula
  };

  usuarios.push(usuarioAluno);
  salvarDados(CHAVE_USUARIOS, usuarios);

  return { ...novoAluno, senhaInicial };
}

export function atualizarSenhaAluno(matricula, senhaAtual, novaSenha) {
  const usuarios = obterDados(CHAVE_USUARIOS);
  const indice = usuarios.findIndex((usuario) => (
    usuario.matricula === matricula && usuario.senha === senhaAtual
  ));

  if (indice === -1) throw new Error('A senha atual está incorreta.');
  usuarios[indice] = { ...usuarios[indice], senha: novaSenha };
  salvarDados(CHAVE_USUARIOS, usuarios);
}

// Ação provisória para a gestão de matrículas.
export function excluirAluno(matricula) {
  salvarDados(CHAVE_ALUNOS, listarAlunos().filter((aluno) => aluno.matricula !== matricula));
  salvarDados(CHAVE_USUARIOS, obterDados(CHAVE_USUARIOS).filter((usuario) => usuario.matricula !== matricula));
}

// --- GESTÃO DE TURMAS (CRUD) ---
export function listarTurmas() {
  return obterDados(CHAVE_TURMAS);
}

export function cadastrarTurma(dadosForm) {
  const turmas = listarTurmas();
  validarNomeDaTurma(dadosForm);
  const nomeNormalizado = dadosForm.nome.trim().toLocaleLowerCase();
  if (turmas.some((turma) => turma.nome.toLocaleLowerCase() === nomeNormalizado)) {
    throw new Error('Já existe uma turma com este nome.');
  }

  const { matriculas = [], ...dadosTurma } = dadosForm;
  const novaTurma = { id: crypto.randomUUID(), ...dadosTurma, nome: dadosForm.nome.trim() };
  salvarDados(CHAVE_TURMAS, [novaTurma, ...turmas]);
  atualizarAlunosDaTurma(novaTurma, matriculas);
  return novaTurma;
}

export function atualizarTurma(id, dadosForm) {
  const turmas = listarTurmas();
  validarNomeDaTurma(dadosForm);
  const existeNome = turmas.some((turma) => (
    turma.id !== id && turma.nome.toLocaleLowerCase() === dadosForm.nome.trim().toLocaleLowerCase()
  ));
  if (existeNome) throw new Error('Já existe uma turma com este nome.');

  const turmaAnterior = turmas.find((turma) => turma.id === id);
  if (!turmaAnterior) throw new Error('Turma não encontrada.');
  const { matriculas = [], ...dadosTurma } = dadosForm;
  const turmaAtualizada = { ...turmaAnterior, ...dadosTurma, nome: dadosForm.nome.trim() };
  salvarDados(CHAVE_TURMAS, turmas.map((turma) => turma.id === id ? turmaAtualizada : turma));
  atualizarAlunosDaTurma(turmaAtualizada, matriculas);
  return turmaAtualizada;
}

function validarNomeDaTurma({ segmento, nome }) {
  if (!TURMAS_POR_SEGMENTO[segmento]?.includes(nome)) {
    throw new Error('Selecione uma turma válida para o segmento informado.');
  }
}

function atualizarAlunosDaTurma(turma, matriculasSelecionadas) {
  const matriculas = new Set(matriculasSelecionadas);
  salvarDados(CHAVE_ALUNOS, listarAlunos().map((aluno) => {
    if (matriculas.has(aluno.matricula)) return { ...aluno, turmaId: turma.id, turmaNome: turma.nome };
    if (aluno.turmaId === turma.id) return { ...aluno, turmaId: null, turmaNome: 'Não Enturmado' };
    return aluno;
  }));
}

export function excluirTurma(id) {
  const turma = listarTurmas().find((item) => item.id === id);
  if (!turma) return;
  salvarDados(CHAVE_TURMAS, listarTurmas().filter((item) => item.id !== id));
  salvarDados(CHAVE_ALUNOS, listarAlunos().map((aluno) => (
    aluno.turmaId === id ? { ...aluno, turmaId: null, turmaNome: 'Não Enturmado' } : aluno
  )));
}

export function alunosDaTurma(turmaId) {
  return listarAlunos().filter((aluno) => aluno.turmaId === turmaId);
}

export function enturmarAluno(matricula, turmaId) {
  const turma = listarTurmas().find((item) => item.id === turmaId);
  if (!turma) throw new Error('Selecione uma turma válida.');
  const alunos = listarAlunos();
  salvarDados(CHAVE_ALUNOS, alunos.map((aluno) => (
    aluno.matricula === matricula ? { ...aluno, turmaId, turmaNome: turma.nome } : aluno
  )));
}
