const CHAVE_USUARIOS = 'educon_usuarios';
const CHAVE_ALUNOS = 'educon_alunos';
const CHAVE_TURMAS = 'educon_turmas';
const CHAVE_PROFESSORES = 'educon_professores';


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

  if (!localStorage.getItem(CHAVE_PROFESSORES)) {
    salvarDados(CHAVE_PROFESSORES, [
      { id: 'prof-1', nome: 'Prof.ª Helena Lima', email: 'helena.lima@primeirosol.edu.br', ativo: true },
      { id: 'prof-2', nome: 'Prof.ª Beatriz Alves', email: 'beatriz.alves@primeirosol.edu.br', ativo: true },
      { id: 'prof-3', nome: 'Prof.ª Ana Paula', email: 'ana.paula@primeirosol.edu.br', ativo: true },
      { id: 'prof-4', nome: 'Prof. João Silva', email: 'joao.silva@primeirosol.edu.br', ativo: false }
    ]);
  }

  // Cria contas iniciais para alunos já salvos, sem sobrescrever senhas alteradas.
  const usuarios = obterDados(CHAVE_USUARIOS);
  const alunos = obterDados(CHAVE_ALUNOS);
  const alunosSemConta = alunos.filter((aluno) => !usuarios.some((usuario) => usuario.matricula === aluno.matricula));
  if (alunosSemConta.length) {
    salvarDados(CHAVE_USUARIOS, [...usuarios, ...alunosSemConta.map((aluno) => ({
      usuario: aluno.matricula,
      senha: aluno.matricula,
      nome: aluno.nome,
      perfil: 'aluno',
      matricula: aluno.matricula,
      primeiroAcesso: true
    }))]);
  }
}

export function obterDados(chave) {
  return JSON.parse(localStorage.getItem(chave)) || [];
}

export function salvarDados(chave, dados) {
  localStorage.setItem(chave, JSON.stringify(dados));
}

export { CHAVE_USUARIOS, CHAVE_ALUNOS, CHAVE_TURMAS, CHAVE_PROFESSORES };
