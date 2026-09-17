# Smart Leave Manager

SISTEMA WEB - GESTÃO INTELIGENTE DE FOLGAS

Crie um sistema web completo, moderno, responsivo e profissional chamado Gestão Inteligente de Folgas.

O sistema deve ser desenvolvido com foco em simplicidade, velocidade e facilidade de uso.

TECNOLOGIAS

Utilizar:

React

Next.js

TypeScript

Tailwind CSS

Supabase (Banco de Dados + Autenticação)

Componentes reutilizáveis

Código organizado

Responsivo para computador, tablet e celular

DESIGN

Criar uma interface moderna semelhante a sistemas corporativos.

Paleta de cores:

Azul (#2563EB) como cor principal.

Branco como fundo principal.

Vermelho (#DC2626) apenas para alertas, erros e ações críticas.

Cinza claro para cartões.

Bordas arredondadas.

Sombras suaves.

Ícones modernos.

Interface limpa.

Animações suaves.

Excelente experiência do usuário.

Preparar para modo escuro futuramente.

TIPOS DE USUÁRIO

Existem apenas dois tipos de usuário.

ADMINISTRADOR

FUNCIONÁRIO

Não existe cadastro público.

Todos os usuários são cadastrados apenas pelo administrador.

LOGIN

Administrador

Login utilizando:

Usuário

Senha

Funcionário

Login utilizando:

Matrícula

Senha

USUÁRIOS DE TESTE

Criar automaticamente os seguintes usuários para testes.

Administrador

Usuário:

miguel1

Senha:

123456

Tipo:

Administrador

Funcionário

Nome:

Funcionário Teste

Matrícula:

miguel2

Senha:

123456

Turno:

Turno A

Tipo:

Funcionário

Esses usuários servem apenas para testes e poderão ser excluídos posteriormente.

FUNCIONÁRIOS

Cada funcionário possui:

id

matrícula

nome

senha

turno

ativo

tipo

contador_domingos

ADMINISTRADOR

O administrador poderá:

Cadastrar funcionários

Editar funcionários

Excluir ou desativar funcionários

Criar matrícula

Criar senha

Alterar senha

Definir turno

Gerar escala semanal

Editar qualquer folga

Visualizar escala completa

Visualizar calendário completo

Visualizar trocas

Cancelar trocas

Visualizar histórico

Exportar PDF

Exportar Excel

FUNCIONÁRIO

O funcionário NÃO pode visualizar:

Escala da empresa

Escala dos colegas

Folgas dos colegas

Calendário geral

Funcionários cadastrados

Painel administrativo

O funcionário somente poderá visualizar:

Seu nome

Seu turno

Sua folga da semana atual

Sua folga da próxima semana (quando liberada)

Contador dos domingos

Dias consecutivos até a próxima folga

Solicitar troca

Histórico das próprias trocas

Alterar sua própria senha

REGRA DAS FOLGAS

A escala é criada semanalmente.

Cada funcionário possui apenas UMA folga por semana.

As folgas podem acontecer apenas entre:

Domingo

Segunda

Terça

Quarta

Quinta

Sexta

Sábado nunca poderá ser folga.

REGRA DOS DOMINGOS

Cada funcionário possui um ciclo individual.

Domingo 1

Trabalha

Domingo 2

Trabalha

Domingo 3

Trabalha

Domingo 4

Folga obrigatoriamente

Depois reinicia automaticamente.

Cada funcionário possui seu próprio contador.

Exemplo:

Funcionário A

2 de 3 domingos trabalhados

Próxima folga de domingo:

27/09/2026

REGRA DOS 7 DIAS

Nenhum funcionário poderá trabalhar mais de sete dias consecutivos.

Sempre que gerar a escala ou realizar uma troca o sistema deve recalcular automaticamente.

Caso algum funcionário ultrapasse sete dias:

Bloquear a operação.

Mostrar:

"Esta alteração faria um funcionário trabalhar mais de sete dias consecutivos. A operação não é permitida."

VISUALIZAÇÃO DAS FOLGAS

O funcionário nunca visualizará a escala.

Ele verá apenas suas próprias folgas.

Até quarta-feira:

Mostrar apenas a folga da semana atual.

A partir da quinta-feira:

Mostrar:

Folga da semana atual.

Folga da próxima semana.

Quando iniciar uma nova semana:

Remover automaticamente a semana anterior.

Assim o funcionário sempre verá no máximo duas folgas:

Semana atual.

Próxima semana.

INFORMAÇÕES MOSTRADAS AO FUNCIONÁRIO

Mostrar apenas:

Nome

Turno

Próxima folga

Folga da próxima semana (quando disponível)

Contador dos domingos

Exemplo:

2 de 3 domingos

Dias consecutivos até a próxima folga

Exemplo:

Você trabalhará 5 dias consecutivos até sua próxima folga.

Botão:

Solicitar troca.

Histórico das próprias trocas.

TROCAS

As trocas somente poderão acontecer entre funcionários do mesmo turno.

Fluxo:

O funcionário seleciona sua folga.

Escolhe o dia que deseja folgar.

O sistema cria uma oferta.

Essa oferta será mostrada apenas aos funcionários do mesmo turno que possuam folga naquele dia.

Caso alguém aceite:

O sistema simula a troca.

Valida todas as regras.

Se estiver correta:

Troca imediatamente as folgas.

Atualiza automaticamente todas as informações.

VALIDAÇÕES DA TROCA

Antes de criar a oferta verificar:

Nenhum funcionário poderá ultrapassar sete dias consecutivos.

A folga ainda não pode possuir outra oferta.

A oferta não pode estar expirada.

Caso qualquer regra seja violada:

Bloquear.

Mostrar mensagem explicando o motivo.

EXPIRAÇÃO

Toda oferta permanece ativa durante:

30 minutos.

Após isso:

Expira automaticamente.

Desaparece.

Quem criou deverá aguardar cinco minutos para criar outra oferta.

NOTIFICAÇÕES

Mostrar notificações em tempo real quando:

Nova oferta criada.

Oferta aceita.

Oferta cancelada.

Oferta expirada.

PAINEL DO ADMINISTRADOR

Dashboard moderno contendo:

Quantidade de funcionários.

Funcionários ativos.

Escala da semana.

Próxima semana.

Trocas pendentes.

Trocas concluídas.

Histórico.

Botão:

Gerar Escala.

Editar Escala.

Exportar PDF.

Exportar Excel.

ALGORITMO DA ESCALA

NÃO utilizar sorteio aleatório simples.

Criar um algoritmo baseado em regras.

A geração da escala deve respeitar obrigatoriamente:

Uma folga semanal por funcionário.

Sábado nunca poderá ser folga.

Trabalhar três domingos.

Folgar no quarto domingo.

Nunca ultrapassar sete dias consecutivos.

Distribuir as folgas de forma equilibrada.

Preparar o algoritmo para receber futuramente regras de quantidade mínima de funcionários por turno em cada dia.

Sempre recalcular automaticamente:

Dias consecutivos.

Contador dos domingos.

Próxima folga de domingo.

BANCO DE DADOS

Tabela Funcionarios

id

matricula

nome

senha

turno

ativo

tipo

contador_domingos

Tabela Escalas

id

funcionario_id

data

status

Tabela Trocas

id

criador_id

data_origem

data_desejada

aceito_por

status

expira_em

criado_em

Tabela HistoricoTrocas

id

troca_id

funcionario1

funcionario2

data

hora

SEGURANÇA

Funcionários nunca poderão acessar páginas administrativas.

Toda rota deve validar permissões.

Toda alteração deve ser registrada no histórico.

ESTRUTURA DO SISTEMA

Tela de Login.

Dashboard do Administrador.

Dashboard do Funcionário.

Cadastro de Funcionários.

Escala Semanal.

Trocas.

Histórico.

Configurações.

OBJETIVO FINAL

Criar um sistema profissional, rápido, bonito e preparado para crescer.

Toda a lógica da escala deve ficar separada da interface.

O código deve ser limpo, organizado e fácil de manter.

A interface deve transmitir confiança e profissionalismo, utilizando azul, branco e vermelho de forma equilibrada, com um visual moderno semelhante aos melhores sistemas corporativos atuais.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rest-flow-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/eb466c66-c954-47f0-a0d9-e691adb0e1c8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
