// Serviço de frequência (UC14 - Registrar Frequência/Chamada).
// Tudo fica no localStorage, na chave "educon_frequencias", como uma lista de registros:
// { turmaId, data: "AAAA-MM-DD", alunoId, status: "P" | "F", observacao, atualizadoEm }
// A página do aluno usa as mesmas funções para ler esses dados.

const CHAVE = 'educon_frequencias';
const STATUS_VALIDOS = ['P', 'F'];

function ler() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE));
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function gravar(lista) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

// Devolve { [alunoId]: { status, observacao } } da chamada dessa turma nesse dia.
export function obterChamada(turmaId, data) {
  const chamada = {};
  ler()
    .filter((registro) => registro.turmaId === turmaId && registro.data === data)
    .forEach((registro) => {
      chamada[registro.alunoId] = { status: registro.status, observacao: registro.observacao };
    });
  return chamada;
}

// Salva a chamada inteira de uma vez (upsert): a chave de cada registro é turmaId + data + alunoId.
// Se já existe, atualiza; se não existe, insere.
export function salvarChamada(turmaId, data, registros) {
  if (!turmaId || !data) throw new Error('Escolha a turma e a data da aula antes de salvar.');

  const lista = ler();
  let inseridos = 0;
  let atualizados = 0;

  registros.forEach(({ alunoId, status, observacao }) => {
    if (!STATUS_VALIDOS.includes(status)) {
      throw new Error('Status de presença inválido. Use presença ou falta.');
    }
    const novo = {
      turmaId,
      data,
      alunoId,
      status,
      observacao: observacao || '',
      atualizadoEm: new Date().toISOString()
    };
    const posicao = lista.findIndex(
      (r) => r.turmaId === turmaId && r.data === data && r.alunoId === alunoId
    );
    if (posicao >= 0) {
      lista[posicao] = novo;
      atualizados += 1;
    } else {
      lista.push(novo);
      inseridos += 1;
    }
  });

  gravar(lista);
  return { inseridos, atualizados };
}

// Para a página do aluno: todos os registros dele, do mais recente para o mais antigo.
export function listarFrequenciaDoAluno(alunoId) {
  return ler()
    .filter((registro) => registro.alunoId === alunoId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

// Para a página do aluno: { total, presencas, faltas, percentual } (percentual é null sem aulas).
export function resumoFrequencia(alunoId) {
  const registros = listarFrequenciaDoAluno(alunoId);
  const presencas = registros.filter((r) => r.status === 'P').length;
  const total = registros.length;
  return {
    total,
    presencas,
    faltas: total - presencas,
    percentual: total ? Math.round((presencas / total) * 100) : null
  };
}

// O evento "storage" só dispara em OUTRAS abas. Por isso serve para a página do aluno
// atualizar sozinha quando o professor salva a chamada em outra aba.
// Devolve uma função para parar de escutar.
export function aoMudarFrequencia(callback) {
  const ouvinte = (evento) => {
    if (evento.key === CHAVE || evento.key === null) callback();
  };
  window.addEventListener('storage', ouvinte);
  return () => window.removeEventListener('storage', ouvinte);
}