import { CHAVE_SESSAO, monitorarSessao, protegerRota } from './config/session.js';
import { atualizarSenhaAluno, listarAlunos, listarNotasDoAluno } from './services/cadastrosService.js';
import { ativarLogout } from './services/logout.js';

const sessao = protegerRota(['aluno']);
monitorarSessao(['aluno']);
const aluno = listarAlunos().find((item) => item.matricula === sessao?.matricula);
const primeiroAcesso = Boolean(sessao?.primeiroAcesso || sessao?.senha === sessao?.matricula);

const nomeAluno = aluno?.nome || sessao?.nome || 'Aluno';
const turma = aluno?.turmaNome || 'Não Enturmado';
document.querySelector('#nome-perfil').textContent = nomeAluno;
document.querySelector('#turma-perfil').textContent = turma;
document.querySelector('#avatar-aluno').textContent = nomeAluno.split(' ').slice(0, 2).map((nome) => nome[0]).join('').toUpperCase();
ativarLogout(document.querySelector('#btn-logout'));

function criarCelula(valor) {
  const celula = document.createElement('td');
  celula.textContent = valor ?? '—';
  return celula;
}

function calcularMedia(nota) {
  const valores = ['bimestre1', 'bimestre2', 'bimestre3', 'bimestre4']
    .map((campo) => Number(nota[campo]))
    .filter((valor) => Number.isFinite(valor));
  return valores.length ? (valores.reduce((soma, valor) => soma + valor, 0) / valores.length).toFixed(1).replace('.', ',') : '—';
}

function renderizarBoletim() {
  const semTurma = document.querySelector('#sem-turma');
  const tabela = document.querySelector('#tabela-boletim');
  document.querySelector('#turma-boletim').textContent = turma === 'Não Enturmado' ? 'Situação de matrícula' : `Turma: ${turma} · Ano letivo 2026`;
  if (turma === 'Não Enturmado') { semTurma.hidden = false; tabela.hidden = true; return; }
  semTurma.hidden = true; tabela.hidden = false;
  const notas = listarNotasDoAluno(sessao.matricula);
  const disciplinas = aluno?.segmento === 'PREZINHO'
    ? ['Linguagem', 'Matemática', 'Natureza e Sociedade']
    : ['Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia'];
  const corpo = document.querySelector('#notas-aluno');
  corpo.replaceChildren();
  disciplinas.forEach((disciplina) => {
    const nota = notas.find((item) => item.disciplina === disciplina) || {};
    const linha = document.createElement('tr');
    linha.append(criarCelula(disciplina), criarCelula(nota.bimestre1), criarCelula(nota.bimestre2), criarCelula(nota.bimestre3), criarCelula(nota.bimestre4), criarCelula(calcularMedia(nota)));
    corpo.append(linha);
  });
}

const modalSenha = document.querySelector('#modal-senha');
const abrirSenha = (obrigatoria = false) => {
  modalSenha.hidden = false;
  document.querySelector('#aviso-primeiro-acesso').hidden = !obrigatoria;
  document.querySelector('#fechar-senha').hidden = obrigatoria;
  document.querySelector('#cancelar-senha').hidden = obrigatoria;
  document.querySelector('#nova-senha').focus();
};
const fecharSenha = () => { if (!primeiroAcesso) modalSenha.hidden = true; };
document.querySelector('#btn-alterar-senha').addEventListener('click', () => abrirSenha());
document.querySelector('#fechar-senha').addEventListener('click', fecharSenha);
document.querySelector('#cancelar-senha').addEventListener('click', fecharSenha);
document.querySelector('#btn-imprimir').addEventListener('click', () => window.print());
document.querySelectorAll('.nav-indisponivel').forEach((botao) => botao.addEventListener('click', () => window.alert(`${botao.dataset.recurso} ainda será implementado.`)));

document.querySelector('#form-senha').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const novaSenha = document.querySelector('#nova-senha').value;
  const mensagem = document.querySelector('#mensagem-senha');
  try {
    atualizarSenhaAluno(sessao.matricula, novaSenha);
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({ ...sessao, senha: novaSenha, primeiroAcesso: false }));
    mensagem.textContent = 'Senha atualizada com sucesso.';
    evento.currentTarget.reset();
    modalSenha.hidden = true;
  } catch (erro) { mensagem.textContent = erro.message; }
});

renderizarBoletim();
if (primeiroAcesso) abrirSenha(true);
import '/src/styles/coord.css';
