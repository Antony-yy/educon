import '/src/styles/login.css'
import { mostrarErro, limparErro } from './components/fieldError.js'

const form = document.querySelector('#login-form')
const inputUsuario = document.querySelector('#usuario')
const inputSenha = document.querySelector('#senha')
const selectPerfil = document.querySelector('#perfil')

form.addEventListener('submit', (event) => {
  event.preventDefault()

  const perfil = selectPerfil.value
  const usuario = inputUsuario.value.trim()
  const senha = inputSenha.value

  limparErro(inputUsuario)
  limparErro(inputSenha)

  let valido = true

  if (usuario === '') {
    mostrarErro(inputUsuario, 'Informe o usuário.')
    valido = false
  }

  if (senha === '') {
    mostrarErro(inputSenha, 'Informe a senha.')
    valido = false
  }

  if (!valido) {
    return
  }

  // isso serve apenas para testar o submit por enquanto
  console.log({ perfil, usuario, senha })
})

inputUsuario.addEventListener('input', () => limparErro(inputUsuario))
inputSenha.addEventListener('input', () => limparErro(inputSenha))