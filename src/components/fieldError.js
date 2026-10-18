export function mostrarErro(input, mensagem) {
  const field = input.closest('.field')
  field.classList.add('field_invalid')
  field.querySelector('.field_message').textContent = mensagem
}

export function limparErro(input) {
  const field = input.closest('.field')
  field.classList.remove('field_invalid')
  field.querySelector('.field_message').textContent = ''
}