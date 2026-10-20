// Serviço de notas e avaliações (UC15 - Lançar Notas e Avaliações).
//
// O professor lança por aqui; a página do aluno lê o boletim já pronto.
// Cada coisa fica numa chave do localStorage:
//
// "educon_lancamentos" (Fundamental I): { alunoId, bimestre, disciplina, n1, n2 }   <- o que o professor digita
// "educon_conceitos"   (Pré-escola):    { alunoId, bimestre, conceito, parecer }    <- o que o professor escolhe
// "educon_notas"       (boletim):       { matricula, alunoId, disciplina, bimestre1..bimestre4 }
//
// A chave "educon_notas" é o formato que a página do aluno (aluno.js, via
// cadastrosService.listarNotasDoAluno) já lê. Ela é recalculada toda vez que o professor salva,
// então o aluno sempre vê o que o professor lançou, sem precisar mexer no aluno.js.
//   - Fundamental I: cada bimestre do boletim recebe a MÉDIA de N1 e N2 (só quando as duas existem).
//   - Pré-escola: o conceito vira o código que o aluno.js entende (D ou EM) nas 3 áreas do boletim.

import { listarAlunos } from './cadastrosService.js';

const CHAVE_LANCAMENTOS = 'educon_lancamentos';
const CHAVE_CONCEITOS = 'educon_conceitos';
const CHAVE_BOLETIM = 'educon_notas';

export const DISCIPLINAS = ['Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia'];
export const BIMESTRES = [1, 2, 3, 4];
export const CONCEITOS = ['Desenvolvimento Satisfatório', 'Em Desenvolvimento'];

// Áreas do boletim da Pré-escola (as mesmas que o aluno.js mostra).
const DISCIPLINAS_PRE = ['Linguagem', 'Matemática', 'Natureza e Sociedade'];
const CODIGO_DO_CONCEITO = { 'Desenvolvimento Satisfatório': 'D', 'Em Desenvolvimento': 'EM' };

function ler(chave) {
  try {
    const lista = JSON.parse(localStorage.getItem(chave));
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function gravar(chave, lista) {
  localStorage.setItem(chave, JSON.stringify(lista));
}

const mesmoAluno = (a, b) => String(a) === String(b);
const arredondar = (valor) => Math.round(valor * 10) / 10;

// Nota válida: vazia (null) ou número entre 0 e 10.
export function notaValida(nota) {
  return nota === null || (Number.isFinite(nota) && nota >= 0 && nota <= 10);
}

// Média da disciplina: só calcula quando N1 e N2 estão preenchidas.
export function calcularMedia(n1, n2) {
  if (!Number.isFinite(n1) || !Number.isFinite(n2)) return null;
  return arredondar((n1 + n2) / 2);
}

// Média geral: média das médias que já existem.
export function calcularMediaGeral(medias) {
  const validas = medias.filter((media) => Number.isFinite(media));
  if (!validas.length) return null;
  return arredondar(validas.reduce((soma, media) => soma + media, 0) / validas.length);
}

// ---------- Boletim do aluno (o que a página do aluno lê) ----------

// Registro antigo, de uma versão anterior que gravava n1/n2 direto em "educon_notas".
const ehRegistroAntigo = (registro, alunoId) =>
  registro.matricula === undefined && registro.bimestre !== undefined && mesmoAluno(registro.alunoId, alunoId);

// Recalcula o boletim dos alunos em "educon_notas".
// tipo: 'fundamental' (média de N1 e N2) ou 'infantil' (conceito D/EM).
function sincronizarBoletim(alunoIds, tipo) {
  const alunos = listarAlunos();
  const disciplinas = tipo === 'infantil' ? DISCIPLINAS_PRE : DISCIPLINAS;
  const lancamentos = ler(CHAVE_LANCAMENTOS);
  const conceitos = ler(CHAVE_CONCEITOS);
  let boletim = ler(CHAVE_BOLETIM);

  alunoIds.forEach((alunoId) => {
    const aluno = alunos.find((item) => mesmoAluno(item.id, alunoId));
    if (!aluno?.matricula) return; // sem matrícula não há como o aluno enxergar

    const novos = disciplinas
      .map((disciplina) => {
        const registro = { matricula: aluno.matricula, alunoId: String(alunoId), disciplina };
        BIMESTRES.forEach((bimestre) => {
          let valor;
          if (tipo === 'infantil') {
            const avaliacao = conceitos.find((r) => mesmoAluno(r.alunoId, alunoId) && r.bimestre === bimestre);
            valor = CODIGO_DO_CONCEITO[avaliacao?.conceito];
          } else {
            const nota = lancamentos.find(
              (r) => mesmoAluno(r.alunoId, alunoId) && r.bimestre === bimestre && r.disciplina === disciplina
            );
            valor = nota ? calcularMedia(nota.n1, nota.n2) ?? undefined : undefined;
          }
          // Campo vazio fica de fora (nunca null): o aluno.js trataria null como zero.
          if (valor !== undefined) registro[`bimestre${bimestre}`] = valor;
        });
        return registro;
      })
      .filter((registro) => BIMESTRES.some((bimestre) => registro[`bimestre${bimestre}`] !== undefined));

    boletim = boletim.filter(
      (r) =>
        !(r.matricula === aluno.matricula && disciplinas.includes(r.disciplina)) &&
        !ehRegistroAntigo(r, alunoId)
    );
    boletim.push(...novos);
  });

  gravar(CHAVE_BOLETIM, boletim);
}

// ---------- Fundamental I ----------

// Devolve { [alunoId]: { [disciplina]: { n1, n2 } } } do bimestre.
export function obterNotasFundamental(alunoIds, bimestre) {
  const resultado = {};
  ler(CHAVE_LANCAMENTOS)
    .filter((r) => r.bimestre === bimestre && alunoIds.some((id) => mesmoAluno(id, r.alunoId)))
    .forEach((r) => {
      resultado[r.alunoId] = resultado[r.alunoId] || {};
      resultado[r.alunoId][r.disciplina] = { n1: r.n1, n2: r.n2 };
    });
  return resultado;
}

// linhas: [{ alunoId, disciplina, n1, n2 }] (n1 e n2 são número ou null).
// Substitui o que já existia dessas células e apaga as que ficaram totalmente vazias.
export function salvarNotasFundamental(bimestre, linhas) {
  linhas.forEach(({ disciplina, n1, n2 }) => {
    if (!DISCIPLINAS.includes(disciplina)) throw new Error(`Disciplina desconhecida: ${disciplina}.`);
    if (!notaValida(n1) || !notaValida(n2)) throw new Error('As notas devem estar entre 0 e 10.');
  });

  const mantidos = ler(CHAVE_LANCAMENTOS).filter(
    (r) =>
      !(
        r.bimestre === bimestre &&
        linhas.some((l) => mesmoAluno(l.alunoId, r.alunoId) && l.disciplina === r.disciplina)
      )
  );
  const novos = linhas
    .filter((l) => l.n1 !== null || l.n2 !== null)
    .map(({ alunoId, disciplina, n1, n2 }) => ({ alunoId, bimestre, disciplina, n1, n2 }));

  gravar(CHAVE_LANCAMENTOS, [...mantidos, ...novos]);
  sincronizarBoletim([...new Set(linhas.map((l) => String(l.alunoId)))], 'fundamental');
  return novos.length;
}

// Notas lançadas de um aluno (todas ou de um bimestre), já com a média calculada.
export function listarNotasDoAluno(alunoId, bimestre) {
  return ler(CHAVE_LANCAMENTOS)
    .filter((r) => mesmoAluno(r.alunoId, alunoId) && (bimestre === undefined || r.bimestre === bimestre))
    .map((r) => ({ ...r, media: calcularMedia(r.n1, r.n2) }));
}

// ---------- Pré-escola ----------

// Devolve { [alunoId]: { conceito, parecer } } do bimestre.
export function obterAvaliacoesInfantis(alunoIds, bimestre) {
  const resultado = {};
  ler(CHAVE_CONCEITOS)
    .filter((r) => r.bimestre === bimestre && alunoIds.some((id) => mesmoAluno(id, r.alunoId)))
    .forEach((r) => {
      resultado[r.alunoId] = { conceito: r.conceito, parecer: r.parecer };
    });
  return resultado;
}

// linhas: [{ alunoId, conceito, parecer }]. Linhas sem conceito e sem parecer são apagadas.
export function salvarAvaliacoesInfantis(bimestre, linhas) {
  linhas.forEach(({ conceito }) => {
    if (conceito && !CONCEITOS.includes(conceito)) throw new Error('Conceito inválido.');
  });

  const mantidos = ler(CHAVE_CONCEITOS).filter(
    (r) => !(r.bimestre === bimestre && linhas.some((l) => mesmoAluno(l.alunoId, r.alunoId)))
  );
  const novos = linhas
    .filter((l) => l.conceito || l.parecer)
    .map(({ alunoId, conceito, parecer }) => ({
      alunoId,
      bimestre,
      conceito: conceito || '',
      parecer: parecer || ''
    }));

  gravar(CHAVE_CONCEITOS, [...mantidos, ...novos]);
  sincronizarBoletim([...new Set(linhas.map((l) => String(l.alunoId)))], 'infantil');
  return novos.length;
}

// Avaliações descritivas de um aluno (todas ou de um bimestre).
export function listarAvaliacoesDoAluno(alunoId, bimestre) {
  return ler(CHAVE_CONCEITOS).filter(
    (r) => mesmoAluno(r.alunoId, alunoId) && (bimestre === undefined || r.bimestre === bimestre)
  );
}

// O evento "storage" só dispara em OUTRAS abas (ex.: a página do aluno aberta ao lado).
// Devolve uma função para parar de escutar.
export function aoMudarNotas(callback) {
  const ouvinte = (evento) => {
    const chaves = [CHAVE_LANCAMENTOS, CHAVE_CONCEITOS, CHAVE_BOLETIM];
    if (chaves.includes(evento.key) || evento.key === null) callback();
  };
  window.addEventListener('storage', ouvinte);
  return () => window.removeEventListener('storage', ouvinte);
}