# EDUCON

Portal acadêmico do Colégio Primeiro Sol, desenvolvido pelo Grupo EDUCON. Esta primeira etapa é um front-end em JavaScript, HTML e CSS, sem framework de componentes, para demonstrar os fluxos de coordenação, professor e aluno.

## Funcionalidades

- **Página inicial e login:** apresentação do Colégio Primeiro Sol e acesso por perfil.
- **Coordenação:** cadastro e consulta de alunos; criação, edição, exclusão e pesquisa de turmas; enturmamento de alunos; cadastro e gestão de professores.
- **Professor:** diário de classe para registrar presença, falta e observações por turma e data; lançamento de notas por disciplina e bimestre; registro de conceitos para a Educação Infantil.
- **Aluno:** consulta ao boletim, alteração da senha e impressão.
- **Sessão:** controle de acesso às páginas por perfil e opção para sair do sistema.

## Tecnologias

- HTML, CSS e JavaScript com módulos ES (ESM).
- [Vite](https://vite.dev/) para desenvolvimento e build de múltiplas páginas.
- `localStorage` e `sessionStorage` do navegador para os dados desta versão.
- Bootstrap Icons para os ícones da interface.

## Requisitos

- Node.js e npm.

## Executar localmente

No terminal, acesse a pasta do projeto e execute:

```bash
npm install
npm run dev
```

Abra no navegador o endereço local exibido pelo Vite.

Para gerar a versão de produção e visualizá-la localmente:

```bash
npm run build
npm run preview
```

O build é gerado na pasta `dist/`.

## Contas para demonstração

Em um navegador sem dados anteriores do EDUCON, as contas iniciais são criadas ao abrir a tela de login:

| Perfil | Usuário | Senha inicial |
| --- | --- | --- |
| Coordenador | `carla.mendes` | `123456` |
| Professor | `helena` | `123456` |
| Aluno | `2026001` | `2026001` |

Selecione o perfil correspondente na tela de acesso. No primeiro acesso do aluno, a matrícula é usada como usuário e senha; o sistema solicita a definição de uma nova senha.

## Dados e limitações desta versão

Os cadastros, turmas, chamadas e lançamentos de notas são armazenados no `localStorage` do navegador. A sessão fica no `sessionStorage`. Assim, os dados persistem naquele navegador, mas não são sincronizados entre dispositivos ou usuários. Limpar os dados do site no navegador também remove os dados salvos pelo EDUCON.

Esta implementação é voltada à demonstração acadêmica e não deve ser usada para armazenar dados escolares reais. O pacote `@supabase/supabase-js` está nas dependências, mas os fluxos descritos acima ainda usam armazenamento local; não há integração ativa com banco de dados ou autenticação do Supabase.

## Estrutura do projeto

```text
.
├── index.html
├── public/                 # imagens e logos
├── src/
│   ├── js/
│   │   ├── components/     # componentes de formulário e cadastro
│   │   ├── config/         # controle de sessão
│   │   └── services/       # cadastros, notas, frequência e armazenamento
│   ├── pages/              # páginas de login e áreas dos perfis
│   └── styles/             # estilos das páginas
├── package.json
└── vite.config.js
```
