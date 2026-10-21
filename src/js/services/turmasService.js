// Adaptador: é o ÚNICO arquivo que precisa conhecer o formato de turmas, alunos e sessão do projeto.
// Se os campos de cadastrosService.js / session.js tiverem outros nomes, ajuste só aqui
// (procure os comentários "AJUSTE"). Os imports com "* as" não quebram se a função não existir.
import * as cadastros from './cadastrosService.js';
import * as sessao from '../config/session.js';

const comoLista = (valor) => (Array.isArray(valor) ? valor : []);
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

// O cadastro real guarda o segmento da turma: 'Educação Infantil' ou 'Ensino Fundamental I'.
function normalizarTurma(turma) {
  const segmento = String(turma.segmento ?? '').toLowerCase();
  return {
    id: String(turma.id),
    nome: turma.nome ?? String(turma.id),
    nivel: segmento.includes('infantil') ? 'infantil' : 'fundamental',
    segmento: turma.segmento ?? '',
    // AJUSTE: nome do campo que guarda o professor regente na turma
    // (veja o formulário de turma no coord).
    professorId: turma.professorId ?? turma.regenteId ?? null
  };
}

function normalizarAluno(aluno) {
  return {
    id: String(aluno.id ?? aluno.matricula),
    matricula: String(aluno.matricula ?? ''), // chave usada nas notas do projeto
    nome: aluno.nome ?? 'Aluno sem nome',
    turmaId: String(aluno.turmaId ?? '')
  };
}

// AJUSTE: nome da função do session.js que devolve o usuário logado.
export function usuarioLogado() {
  const leitores = ['obterSessao', 'getSessao', 'obterUsuarioLogado', 'usuarioLogado'];
  for (const nome of leitores) {
    if (typeof sessao[nome] === 'function') {
      const usuario = sessao[nome]();
      return usuario ? { id: String(usuario.id ?? usuario.usuario ?? ''), nome: usuario.nome ?? usuario.usuario } : null;
    }
  }
  return null;
}

function listarTurmas() {
  return comoLista(cadastros.listarTurmas()).map(normalizarTurma);
}

// Turmas regidas pelo professor logado. Se nenhuma turma estiver vinculada a ele (ainda),
// mostra todas, para a página continuar utilizável durante o desenvolvimento.
export function turmasDoProfessor(professorId) {
  const todas = listarTurmas();
  const minhas = todas.filter((turma) => professorId && String(turma.professorId) === String(professorId));
  return minhas.length ? minhas : todas;
}

export function alunosDaTurma(turmaId) {
  return comoLista(cadastros.listarAlunos())
    .map(normalizarAluno)
    .filter((aluno) => aluno.turmaId === String(turmaId))
    .sort(porNome);
}