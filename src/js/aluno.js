import '/src/styles/coord.css';
import { CHAVE_SESSAO } from './config/session.js';
import { atualizarSenhaAluno, listarAlunos } from './services/cadastrosService.js';
import { ativarLogout } from './services/logout.js';

const sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || 'null');
if (!sessao || sessao.perfil !== 'aluno') window.location.href = '/src/pages/login.html';

const aluno = listarAlunos().find((item) => item.matricula === sessao?.matricula);
document.querySelector('#nome-aluno').textContent = aluno?.nome || sessao?.nome || 'Aluno';
document.querySelector('#dados-aluno').textContent = `Matrícula: ${sessao?.matricula} · Turma: ${aluno?.turmaNome || 'Não Enturmado'}`;
ativarLogout(document.querySelector('#btn-logout'));

document.querySelector('#form-senha').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const atual = document.querySelector('#senha-atual').value;
  const nova = document.querySelector('#nova-senha').value;
  const mensagem = document.querySelector('#mensagem-senha');
  try {
    atualizarSenhaAluno(sessao.matricula, atual, nova);
    mensagem.textContent = 'Senha atualizada com sucesso.';
    evento.currentTarget.reset();
  } catch (erro) { mensagem.textContent = erro.message; }
});
