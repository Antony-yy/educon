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
    matricula: matricula,
    primeiroAcesso: true
  };

  usuarios.push(usuarioAluno);
  salvarDados(CHAVE_USUARIOS, usuarios);

  return { ...novoAluno, senhaInicial };
}

export function atualizarSenhaAluno(matricula, novaSenha) {
  const usuarios = obterDados(CHAVE_USUARIOS);
  const indice = usuarios.findIndex((usuario) => usuario.matricula === matricula);

  if (indice === -1) throw new Error('Usuário não encontrado.');
  usuarios[indice] = { ...usuarios[indice], senha: novaSenha, primeiroAcesso: false };
  salvarDados(CHAVE_USUARIOS, usuarios);
}

export function listarNotasDoAluno(matricula) {
  return obterDados('educon_notas').filter((nota) => nota.matricula === matricula);
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
  validarAlunosDaTurma(dadosTurma.segmento, matriculas);
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
  validarAlunosDaTurma(dadosTurma.segmento, matriculas);
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

function grupoDeSegmento(segmento = '') {
  const normalizado = String(segmento).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  if (normalizado.includes('fundamental')) return 'fundamental';
  if (normalizado.includes('infantil') || normalizado.includes('pre')) return 'infantil';
  return '';
}

export function alunoCompativelComTurma(aluno, turma) {
  const grupoAluno = grupoDeSegmento(aluno.segmento);
  const grupoTurma = grupoDeSegmento(turma.segmento);
  return Boolean(grupoAluno && grupoTurma && grupoAluno === grupoTurma);
}

export function enturmarAluno(matricula, turmaId) {
  const turma = turmaId ? listarTurmas().find((item) => item.id === turmaId) : null;
  if (turmaId && !turma) throw new Error('Selecione uma turma válida.');
  const alunos = listarAlunos();
  const aluno = alunos.find((item) => item.matricula === matricula);
  if (!aluno) throw new Error('Aluno não encontrado.');
  if (turma && !alunoCompativelComTurma(aluno, turma)) {
    throw new Error('O aluno não pertence ao segmento desta turma.');
  }
  salvarDados(CHAVE_ALUNOS, alunos.map((item) => item.matricula === matricula
    ? { ...item, turmaId: turma?.id ?? null, turmaNome: turma?.nome ?? 'Não Enturmado' }
    : item));
}

// --- GESTÃO DE PROFESSORES ---
const ehAtivo = (professor) => professor.ativo !== false;
const somenteDigitos = (valor = '') => String(valor).replace(/\D/g, '');

export function listarProfessores() { return obterDados(CHAVE_PROFESSORES); }
export function listarProfessoresAtivos() { return listarProfessores().filter(ehAtivo); }

export function validarCpf(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (qtd) => {
    let soma = 0;
    for (let i = 0; i < qtd; i++) soma += Number(d[i]) * (qtd + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}
export function formatarCpf(cpf = '') {
  return somenteDigitos(cpf).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
export function formatarTelefone(telefone = '') {
  const d = somenteDigitos(telefone);
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return d;
}
// Separa primeiro nome e último sobrenome, ignorando títulos como "Prof.ª" e "Dr.".
function separarNomeProfessor(nome) {
  const partes = String(nome).trim().split(/\s+/).filter((parte) => parte && !parte.includes('.'));
  if (partes.length < 2) throw new Error('Informe nome e sobrenome do professor.');
  return { primeiroNome: partes[0], sobrenome: partes[partes.length - 1] };
}

const semAcento = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const paraLogin = (texto) => semAcento(texto).toLocaleLowerCase('pt-BR');

// Usuário: nome.sobrenome, minúsculo e sem acento. Ex.: "Camila Rocha" -> "camila.rocha".
export function gerarUsuarioProfessor(nome) {
  const { primeiroNome, sobrenome } = separarNomeProfessor(nome);
  return paraLogin(`${primeiroNome}.${sobrenome}`);
}

// Senha inicial: sobrenome + nome + 4 últimos dígitos do celular, minúscula e sem acento.
// Ex.: "Camila Rocha" + (83) 99999-8888 -> "rochacamila8888".
export function gerarSenhaInicialProfessor(nome, telefone) {
  const { primeiroNome, sobrenome } = separarNomeProfessor(nome);
  return paraLogin(`${sobrenome}${primeiroNome}${somenteDigitos(telefone).slice(-4)}`);
}

export function cadastrarProfessor({ nome, email, cpf, telefone }) {
  const nomeLimpo = nome?.trim();
  const emailLimpo = email?.trim().toLocaleLowerCase();
  const cpfLimpo = somenteDigitos(cpf);
  const telefoneLimpo = somenteDigitos(telefone);

  if (!nomeLimpo || !emailLimpo) throw new Error('Informe nome e e-mail.');
  if (!validarCpf(cpfLimpo)) throw new Error('CPF inválido.');
  if (![10, 11].includes(telefoneLimpo.length)) throw new Error('Telefone inválido. Informe DDD + número.');

  const professores = listarProfessores();
  const usuarios = obterDados(CHAVE_USUARIOS);
  if (professores.some((p) => p.email?.toLocaleLowerCase() === emailLimpo)) {
    throw new Error('Já existe um professor com este e-mail.');
  }
  if (professores.some((p) => p.cpf === cpfLimpo)) throw new Error('Já existe um professor com este CPF.');

  // Gera usuário e senha antes de salvar qualquer coisa: se der erro, nada fica pela metade.
  const usuarioBase = gerarUsuarioProfessor(nomeLimpo);
  const senhaInicial = gerarSenhaInicialProfessor(nomeLimpo, telefoneLimpo);
  // Dois professores com o mesmo nome.sobrenome: o segundo vira "ana.souza2", o terceiro "ana.souza3"...
  let usuario = usuarioBase;
  for (let numero = 2; usuarios.some((conta) => conta.usuario === usuario); numero++) {
    usuario = `${usuarioBase}${numero}`;
  }

  const novoProfessor = {
    id: crypto.randomUUID(),
    nome: nomeLimpo,
    email: emailLimpo,
    cpf: cpfLimpo,
    telefone: telefoneLimpo,
    ativo: true
  };
  salvarDados(CHAVE_PROFESSORES, [novoProfessor, ...professores]);
  salvarDados(CHAVE_USUARIOS, [...usuarios, {
    usuario,
    senha: senhaInicial,
    nome: nomeLimpo,
    perfil: 'professor',
    professorId: novoProfessor.id,
    primeiroAcesso: true
  }]);

  return { ...novoProfessor, usuario, senhaInicial };
}

export function alterarStatusProfessor(id, ativo) {
  const professores = listarProfessores();
  if (!professores.some((p) => p.id === id)) throw new Error('Professor não encontrado.');
  salvarDados(CHAVE_PROFESSORES, professores.map((p) => (p.id === id ? { ...p, ativo } : p)));
}

function validarAlunosDaTurma(segmento, matriculas) {
  const selecionadas = new Set(matriculas);
  const incompatível = listarAlunos().some((aluno) => (
    selecionadas.has(aluno.matricula) && !alunoCompativelComTurma(aluno, { segmento })
  ));
  if (incompatível) throw new Error('A turma só pode receber alunos do mesmo segmento.');
}