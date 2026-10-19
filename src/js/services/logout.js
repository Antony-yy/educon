import { CHAVE_SESSAO } from '/src/js/config/session.js'

export function logout() {
  sessionStorage.removeItem(CHAVE_SESSAO)
  localStorage.removeItem(CHAVE_SESSAO)
  window.location.href = '/src/pages/login.html'
}

export function ativarLogout(botao) {
  botao.addEventListener('click', logout)
}