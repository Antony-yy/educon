
import '/src/styles/login.css';
import { mostrarErro, limparErro } from './components/fieldError.js';
import { CHAVE_SESSAO } from './config/session.js';
import { inicializarSeedData, obterDados, CHAVE_USUARIOS } from './services/storageService.js';


inicializarSeedData();

const form = document.querySelector('#login-form');
const inputUsuario = document.querySelector('#usuario');
const inputSenha = document.querySelector('#senha');
const selectPerfil = document.querySelector('#perfil');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const perfil = selectPerfil.value;
  const usuario = inputUsuario.value.trim();
  const senha = inputSenha.value;

  limparErro(inputUsuario);
  limparErro(inputSenha);

  let valido = true;

  if (usuario === '') {
    mostrarErro(inputUsuario, 'Informe o usuário.');
    valido = false;
  }

  if (senha === '') {
    mostrarErro(inputSenha, 'Informe a senha.');
    valido = false;
  }

  if (!valido) return;

  const usuarios = obterDados(CHAVE_USUARIOS);
  const usuarioEncontrado = usuarios.find(
    (u) => u.usuario === usuario && u.senha === senha && u.perfil === perfil
  );

  if (usuarioEncontrado) {

    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuarioEncontrado));
    window.location.href = usuarioEncontrado.perfil === 'aluno'
      ? '/src/pages/aluno.html'
      : '/src/pages/coord.html';
  } else {
    mostrarErro(inputUsuario, 'Usuário ou senha incorretos.');
  }
});

inputUsuario.addEventListener('input', () => limparErro(inputUsuario));
inputSenha.addEventListener('input', () => limparErro(inputSenha));
