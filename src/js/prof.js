import { monitorarSessao, protegerRota } from './config/session.js';
import { ativarLogout } from './services/logout.js';
import { alunosDaTurma, turmasDoProfessor, usuarioLogado } from './services/turmasService.js';
import { obterChamada, salvarChamada } from './services/frequenciaService.js';
import {
  BIMESTRES,
  CONCEITOS,
  DISCIPLINAS,
  calcularMedia,
  calcularMediaGeral,
  obterAvaliacoesInfantis,
  obterNotasFundamental,
  salvarAvaliacoesInfantis,
  salvarNotasFundamental
} from './services/notasService.js';

protegerRota(['professor']);
monitorarSessao(['professor']);

const $ = (seletor) => document.querySelector(seletor);

const usuario = usuarioLogado();
const turmas = turmasDoProfessor(usuario?.id);
const turmaPorId = (id) => turmas.find((turma) => turma.id === id);

// ---------- Utilidades ----------

// Cria um elemento sem usar innerHTML (nomes de alunos nunca são interpretados como HTML).
function criar(tag, { classe, texto, ...atributos } = {}, ...filhos) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  Object.entries(atributos).forEach(([nome, valor]) => {
    if (valor === false || valor === null || valor === undefined) return;
    no.setAttribute(nome, valor === true ? '' : String(valor));
  });
  no.append(...filhos);
  return no;
}

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (partes[0][0] + ultima).toUpperCase();
}

// Data de hoje no fuso local (toISOString usaria UTC e viraria o dia à noite).
function hoje() {
  const agora = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarNota(valor) {
  if (valor === null || valor === undefined) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function mostrarAviso(tipo, texto) {
  const aviso = $('#aviso');
  if (!tipo) {
    aviso.hidden = true;
    return;
  }
  aviso.className = `prof-aviso prof-aviso--${tipo}`;
  aviso.textContent = texto;
  aviso.hidden = false;
  aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function linhaVazia(colunas, mensagem) {
  const linha = criar('tr');
  linha.append(criar('td', { classe: 'empty-table', colspan: colunas, texto: mensagem }));
  return linha;
}

function celulaAluno(aluno, indice) {
  return criar(
    'td',
    {},
    criar(
      'div',
      { classe: 'prof-aluno' },
      criar('span', { classe: 'prof-aluno_num', texto: String(indice + 1).padStart(2, '0') }),
      criar('span', { classe: 'prof-avatar', 'aria-hidden': 'true', texto: iniciais(aluno.nome) }),
      criar('span', { classe: 'prof-aluno_nome', texto: aluno.nome })
    )
  );
}

// ---------- Abas ----------

function ativarAba(nome) {
  const aba = nome === 'notas' ? 'notas' : 'diario';
  document.querySelectorAll('[data-painel]').forEach((painel) => {
    painel.hidden = painel.dataset.painel !== aba;
  });
  document.querySelectorAll('[data-tab]').forEach((controle) => {
    const ativa = controle.dataset.tab === aba;
    const classeAtiva = controle.classList.contains('nav_link') ? 'nav_link--active' : 'tabs_item--active';
    controle.classList.toggle(classeAtiva, ativa);
    if (controle.getAttribute('role') === 'tab') controle.setAttribute('aria-selected', String(ativa));
  });
  mostrarAviso(null);
  history.replaceState(null, '', `#${aba}`);
}

// ---------- Diário de classe (UC14) ----------

const chamadaTurma = $('#chamada-turma');
const chamadaData = $('#chamada-data');
const chamadaCorpo = $('#chamada-corpo');

function atualizarResumoChamada() {
  const marcas = [...chamadaCorpo.querySelectorAll('input[type="checkbox"]')];
  const presentes = marcas.filter((marca) => marca.checked).length;
  $('#chamada-resumo').textContent = marcas.length
    ? `${marcas.length} alunos · ${presentes} presentes · ${marcas.length - presentes} faltas`
    : 'Nenhum aluno encontrado nesta turma.';
}

function criarLinhaChamada(aluno, indice, registro) {
  const marca = criar('input', {
    type: 'checkbox',
    checked: (registro?.status ?? 'P') === 'P', // padrão: presente
    'data-aluno-id': aluno.id,
    'aria-label': `Presença de ${aluno.nome}`
  });
  const texto = criar('span', { classe: 'prof-switch_texto' });
  const rotulo = criar('label', { classe: 'prof-switch' }, marca, criar('span', { classe: 'prof-switch_trilho', 'aria-hidden': 'true' }), texto);

  const atualizar = () => {
    texto.textContent = marca.checked ? 'Presente' : 'Falta';
    rotulo.classList.toggle('prof-switch--falta', !marca.checked);
    atualizarResumoChamada();
  };
  marca.addEventListener('change', atualizar);

  const observacao = criar('input', {
    classe: 'prof-controle prof-observacao',
    type: 'text',
    maxlength: 160,
    placeholder: 'Ex.: falta justificada com atestado',
    value: registro?.observacao ?? '',
    'aria-label': `Observação sobre ${aluno.nome}`
  });

  const linha = criar('tr');
  linha.append(celulaAluno(aluno, indice), criar('td', {}, rotulo), criar('td', {}, observacao));
  texto.textContent = marca.checked ? 'Presente' : 'Falta';
  rotulo.classList.toggle('prof-switch--falta', !marca.checked);
  return linha;
}

function renderizarChamada() {
  const turmaId = chamadaTurma.value;
  const alunos = alunosDaTurma(turmaId);
  const salva = chamadaData.value ? obterChamada(turmaId, chamadaData.value) : {};

  chamadaCorpo.replaceChildren();
  if (!alunos.length) {
    chamadaCorpo.append(linhaVazia(3, 'Nenhum aluno encontrado nesta turma.'));
  } else {
    alunos.forEach((aluno, indice) => chamadaCorpo.append(criarLinhaChamada(aluno, indice, salva[aluno.id])));
  }
  atualizarResumoChamada();
}

function salvarChamadaDoDia() {
  const turmaId = chamadaTurma.value;
  const data = chamadaData.value;
  if (!data) {
    mostrarAviso('erro', 'Escolha a data da aula antes de salvar.');
    return;
  }

  const registros = [...chamadaCorpo.querySelectorAll('input[type="checkbox"]')].map((marca) => ({
    alunoId: marca.dataset.alunoId,
    status: marca.checked ? 'P' : 'F',
    observacao: marca.closest('tr').querySelector('input[type="text"]').value.trim()
  }));
  if (!registros.length) {
    mostrarAviso('erro', 'Não há alunos para salvar nesta turma.');
    return;
  }

  try {
    const { inseridos, atualizados } = salvarChamada(turmaId, data, registros);
    const nome = turmaPorId(turmaId)?.nome ?? turmaId;
    mostrarAviso('ok', `Chamada do ${nome} em ${formatarData(data)} salva: ${inseridos} novos registros e ${atualizados} atualizados.`);
  } catch (erro) {
    mostrarAviso('erro', erro.message);
  }
}

// ---------- Lançamento de notas (UC15) ----------

const notasTurma = $('#notas-turma');
const notasBimestre = $('#notas-bimestre');
const notasTabela = $('#notas-tabela');

// Guarda os campos da tabela atual para ler na hora de salvar.
let estadoNotas = { nivel: 'fundamental', linhas: [] };

function lerNumero(campo) {
  const texto = campo.value.trim().replace(',', '.');
  return texto === '' ? null : Number(texto);
}

function validarCampo(campo) {
  const nota = lerNumero(campo);
  const invalido = nota !== null && !(nota >= 0 && nota <= 10);
  campo.setAttribute('aria-invalid', String(invalido));
  return !invalido;
}

function campoNota(aluno, disciplina, rotulo, valor) {
  return criar('input', {
    classe: 'prof-controle prof-nota',
    type: 'number',
    min: 0,
    max: 10,
    step: 0.1,
    inputmode: 'decimal',
    value: valor ?? '',
    'aria-label': `${rotulo} de ${disciplina}, ${aluno.nome}`
  });
}

// Visão Fundamental I: uma linha por aluno, N1 e N2 por matéria e média automática (#65).
function montarTabelaFundamental(alunos, bimestre) {
  const salvas = obterNotasFundamental(alunos.map((aluno) => aluno.id), bimestre);

  const cabecalho1 = criar(
    'tr',
    {},
    criar('th', { scope: 'col', rowspan: 2, texto: 'Aluno' }),
    ...DISCIPLINAS.map((disciplina) => criar('th', { scope: 'colgroup', colspan: 3, classe: 'prof-grupo', texto: disciplina })),
    criar('th', { scope: 'col', rowspan: 2, classe: 'prof-grupo', texto: 'Média geral' })
  );
  const cabecalho2 = criar(
    'tr',
    {},
    ...DISCIPLINAS.flatMap(() =>
      ['N1', 'N2', 'Média'].map((titulo, i) => criar('th', { scope: 'col', classe: i === 0 ? 'prof-grupo' : '', texto: titulo }))
    )
  );

  const corpo = criar('tbody');
  estadoNotas.linhas = [];

  alunos.forEach((aluno, indice) => {
    const linha = criar('tr');
    linha.append(celulaAluno(aluno, indice));

    const grupos = DISCIPLINAS.map((disciplina) => {
      const nota = salvas[aluno.id]?.[disciplina];
      const grupo = {
        disciplina,
        n1: campoNota(aluno, disciplina, 'N1', nota?.n1),
        n2: campoNota(aluno, disciplina, 'N2', nota?.n2),
        media: criar('output', { classe: 'prof-media' })
      };
      linha.append(
        criar('td', { classe: 'prof-grupo' }, grupo.n1),
        criar('td', {}, grupo.n2),
        criar('td', {}, grupo.media)
      );
      return grupo;
    });

    const mediaGeral = criar('output', { classe: 'prof-media' });
    linha.append(criar('td', { classe: 'prof-grupo' }, mediaGeral));

    // Recalcula as médias da linha toda vez que uma nota muda (nada é estático).
    const recalcular = () => {
      const medias = grupos.map((grupo) => {
        const media = calcularMedia(lerNumero(grupo.n1), lerNumero(grupo.n2));
        grupo.media.textContent = formatarNota(media);
        return media;
      });
      mediaGeral.textContent = formatarNota(calcularMediaGeral(medias));
    };
    grupos.forEach((grupo) => {
      [grupo.n1, grupo.n2].forEach((campo) =>
        campo.addEventListener('input', () => {
          validarCampo(campo);
          recalcular();
        })
      );
    });
    recalcular();

    estadoNotas.linhas.push({ aluno, grupos });
    corpo.append(linha);
  });

  if (!alunos.length) corpo.append(linhaVazia(DISCIPLINAS.length * 3 + 2, 'Nenhum aluno encontrado nesta turma.'));
  return [criar('thead', {}, cabecalho1, cabecalho2), corpo];
}

// Visão Pré-escola: conceito e parecer descritivo resumido (#65).
function montarTabelaInfantil(alunos, bimestre) {
  const salvas = obterAvaliacoesInfantis(alunos.map((aluno) => aluno.id), bimestre);

  const cabecalho = criar(
    'tr',
    {},
    criar('th', { scope: 'col', texto: 'Aluno' }),
    criar('th', { scope: 'col', texto: 'Conceito' }),
    criar('th', { scope: 'col', texto: 'Parecer descritivo' })
  );

  const corpo = criar('tbody');
  estadoNotas.linhas = [];

  alunos.forEach((aluno, indice) => {
    const salva = salvas[aluno.id];
    const conceito = criar(
      'select',
      { classe: 'prof-controle prof-conceito', 'aria-label': `Conceito de ${aluno.nome}` },
      criar('option', { value: '', texto: 'Selecione o conceito' }),
      ...CONCEITOS.map((opcao) => criar('option', { value: opcao, texto: opcao, selected: salva?.conceito === opcao }))
    );
    const parecer = criar('textarea', {
      classe: 'prof-controle prof-parecer',
      rows: 2,
      maxlength: 400,
      placeholder: 'Resumo do desenvolvimento no bimestre',
      'aria-label': `Parecer de ${aluno.nome}`,
      texto: salva?.parecer ?? ''
    });

    const linha = criar('tr');
    linha.append(celulaAluno(aluno, indice), criar('td', {}, conceito), criar('td', {}, parecer));
    estadoNotas.linhas.push({ aluno, conceito, parecer });
    corpo.append(linha);
  });

  if (!alunos.length) corpo.append(linhaVazia(3, 'Nenhum aluno encontrado nesta turma.'));
  return [criar('thead', {}, cabecalho), corpo];
}

function renderizarNotas() {
  const turma = turmaPorId(notasTurma.value);
  const bimestre = Number(notasBimestre.value);
  const alunos = alunosDaTurma(notasTurma.value);
  const nivel = turma?.nivel ?? 'fundamental';

  estadoNotas = { nivel, linhas: [] };
  const partes = nivel === 'infantil' ? montarTabelaInfantil(alunos, bimestre) : montarTabelaFundamental(alunos, bimestre);
  notasTabela.replaceChildren(...partes);

  const etapa = nivel === 'infantil' ? 'conceito e parecer descritivo' : 'notas N1 e N2 com média automática';
  $('#notas-resumo').textContent = `${turma?.nome ?? ''} · ${bimestre}º bimestre · ${etapa}`;
}

function salvarLancamentos() {
  const bimestre = Number(notasBimestre.value);
  const nome = turmaPorId(notasTurma.value)?.nome ?? notasTurma.value;

  if (!estadoNotas.linhas.length) {
    mostrarAviso('erro', 'Não há alunos para salvar nesta turma.');
    return;
  }

  try {
    if (estadoNotas.nivel === 'infantil') {
      const linhas = estadoNotas.linhas.map(({ aluno, conceito, parecer }) => ({
        alunoId: aluno.id,
        conceito: conceito.value,
        parecer: parecer.value.trim()
      }));
      const total = salvarAvaliacoesInfantis(bimestre, linhas);
      mostrarAviso('ok', `${total} avaliações do ${nome} salvas no ${bimestre}º bimestre.`);
      return;
    }

    const linhas = [];
    let temErro = false;
    estadoNotas.linhas.forEach(({ aluno, grupos }) => {
      grupos.forEach((grupo) => {
        const n1Valida = validarCampo(grupo.n1);
        const n2Valida = validarCampo(grupo.n2);
        if (!n1Valida || !n2Valida) temErro = true;
        linhas.push({ alunoId: aluno.id, disciplina: grupo.disciplina, n1: lerNumero(grupo.n1), n2: lerNumero(grupo.n2) });
      });
    });
    if (temErro) {
      mostrarAviso('erro', 'Há notas fora do intervalo de 0 a 10. Corrija os campos em vermelho e salve de novo.');
      return;
    }
    const total = salvarNotasFundamental(bimestre, linhas);
    mostrarAviso('ok', `${total} lançamentos do ${nome} salvos no ${bimestre}º bimestre.`);
  } catch (erro) {
    mostrarAviso('erro', erro.message);
  }
}

// ---------- Início ----------

function preencherOpcoes(select, opcoes) {
  select.replaceChildren(...opcoes.map(({ valor, rotulo }) => criar('option', { value: valor, texto: rotulo })));
}

document.addEventListener('DOMContentLoaded', () => {
  const botaoSair = $('#btn-logout');
  if (botaoSair) ativarLogout(botaoSair);

  const nome = usuario?.nome ?? 'Professor(a)';
  $('#prof-nome').textContent = nome;
  $('#prof-avatar').textContent = iniciais(nome) || 'PR';

  document.querySelectorAll('[data-tab]').forEach((controle) => {
    controle.addEventListener('click', (evento) => {
      evento.preventDefault();
      ativarAba(controle.dataset.tab);
    });
  });

  if (!turmas.length) {
    mostrarAviso('erro', 'Nenhuma turma está vinculada ao seu usuário. Fale com a coordenação.');
    return;
  }

  const opcoesTurma = turmas.map((turma) => ({ valor: turma.id, rotulo: turma.nome }));
  preencherOpcoes(chamadaTurma, opcoesTurma);
  preencherOpcoes(notasTurma, opcoesTurma);
  preencherOpcoes(notasBimestre, BIMESTRES.map((numero) => ({ valor: numero, rotulo: `${numero}º bimestre` })));
  chamadaData.value = hoje();

  chamadaTurma.addEventListener('change', renderizarChamada);
  chamadaData.addEventListener('change', renderizarChamada);
  notasTurma.addEventListener('change', renderizarNotas);
  notasBimestre.addEventListener('change', renderizarNotas);
  $('#btn-salvar-chamada').addEventListener('click', salvarChamadaDoDia);
  $('#btn-salvar-notas').addEventListener('click', salvarLancamentos);

  renderizarChamada();
  renderizarNotas();
  ativarAba(location.hash.replace('#', ''));
});