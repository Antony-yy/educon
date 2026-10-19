export const CHAVE_SESSAO = 'educon_session';

export function obterSessao() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || 'null');
  } catch {
    sessionStorage.removeItem(CHAVE_SESSAO);
    return null;
  }
}

export function protegerRota(perfisPermitidos = []) {
  const sessao = obterSessao();
  const perfilPermitido = !perfisPermitidos.length || perfisPermitidos.includes(sessao?.perfil);
  if (!sessao || !perfilPermitido) {
    sessionStorage.removeItem(CHAVE_SESSAO);
    window.location.replace('/src/pages/login.html');
    return null;
  }
  return sessao;
}

export function monitorarSessao(perfisPermitidos = []) {
  window.addEventListener('pageshow', () => protegerRota(perfisPermitidos));
}
