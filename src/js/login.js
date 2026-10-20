import { mostrarErro, limparErro } from './components/fieldError.js';
import { CHAVE_SESSAO } from './config/session.js';
import { CHAVE_USUARIOS, inicializarSeedData, obterDados } from './services/storageService.js';

inicializarSeedData();

const form = document.querySelector('#login-form');
const inputUsuario = document.querySelector('#usuario');
const inputSenha = document.querySelector('#senha');
const selectPerfil = document.querySelector('#perfil');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const usuario = inputUsuario.value.trim();
  const senha = inputSenha.value;
  const perfil = selectPerfil.value;
  limparErro(inputUsuario);
  limparErro(inputSenha);

  let valido = true;
  if (!usuario) { mostrarErro(inputUsuario, 'Informe o usuário.'); valido = false; }
  if (!senha) { mostrarErro(inputSenha, 'Informe a senha.'); valido = false; }
  if (!valido) return;

  const conta = obterDados(CHAVE_USUARIOS).find((item) => (
    item.usuario === usuario && item.senha === senha && item.perfil === perfil
  ));
  if (!conta) {
    mostrarErro(inputUsuario, 'Usuário, senha ou perfil incorretos.');
    return;
  }

  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(conta));
  if (conta.perfil === 'aluno') {
    window.location.replace('/src/pages/aluno.html');
  } else if (conta.perfil === 'coordenador') {
    window.location.replace('/src/pages/coord.html');
  } else if (conta.perfil === 'professor') {
    window.location.replace('/src/pages/prof.html');
  } else {
    sessionStorage.removeItem(CHAVE_SESSAO);
    mostrarErro(inputUsuario, 'Perfil de usuário inválido.');
  }
});

inputUsuario.addEventListener('input', () => limparErro(inputUsuario));
inputSenha.addEventListener('input', () => limparErro(inputSenha));
