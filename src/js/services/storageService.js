

const CHAVE_USUARIOS = 'educon_usuarios';
const CHAVE_ALUNOS = 'educon_alunos';
const CHAVE_TURMAS = 'educon_turmas';


export function inicializarSeedData() {

  if (!localStorage.getItem(CHAVE_USUARIOS)) {
    const usuariosSeed = [
      {
        usuario: 'carla.mendes',
        senha: '123456',
        nome: 'Prof.ª Carla Mendes',
        perfil: 'coordenador'
      }
    ];
    localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuariosSeed));
  }


  if (!localStorage.getItem(CHAVE_ALUNOS)) {
    const alunosSeed = [
      {
        id: '1',
        matricula: '2026001',
        nome: 'Lucas Gabriel Silva',
        email: 'lucas@escola.com',
        nomeResponsavel: 'Maria das Dores Silva',
        telefone: '(83) 99999-8888',
        segmento: 'FUNDAMENTAL_1',
        dataNascimento: '2017-05-12',
        turmaNome: '1º Ano A'
      }
    ];
    localStorage.setItem(CHAVE_ALUNOS, JSON.stringify(alunosSeed));
  }

  if (!localStorage.getItem(CHAVE_TURMAS)) {
    salvarDados(CHAVE_TURMAS, []);
  }

  // Garante a conta inicial de alunos que já estavam cadastrados.
  // Contas existentes não são alteradas, preservando senhas já trocadas.
  const usuarios = obterDados(CHAVE_USUARIOS);
  const alunos = obterDados(CHAVE_ALUNOS);
  const alunosSemConta = alunos.filter((aluno) => !usuarios.some((usuario) => usuario.matricula === aluno.matricula));
  if (alunosSemConta.length) {
    salvarDados(CHAVE_USUARIOS, [
      ...usuarios,
      ...alunosSemConta.map((aluno) => ({
        usuario: aluno.matricula,
        senha: aluno.matricula,
        nome: aluno.nome,
        perfil: 'aluno',
        matricula: aluno.matricula,
        primeiroAcesso: true
      }))
    ]);
  }
}

export function obterDados(chave) {
  return JSON.parse(localStorage.getItem(chave)) || [];
}

export function salvarDados(chave, dados) {
  localStorage.setItem(chave, JSON.stringify(dados));
}

export { CHAVE_USUARIOS, CHAVE_ALUNOS, CHAVE_TURMAS };
