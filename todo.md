# EHS SaaS - Todo List

## Fase 1: Setup e Banco de Dados
- [x] Schema do banco de dados (22 tabelas)
- [x] Migrações aplicadas
- [x] Seed de 16 NRs padrão
- [x] Estrutura de rotas tRPC definida

## Fase 2: Design System e Autenticação
- [x] Design system (cores EHS laranja/escuro, tipografia, componentes)
- [x] Layout base com sidebar customizado (EHSLayout)
- [x] Perfis de usuário: ADM EHS, Cliente, Técnico, Apoio
- [x] Permissões granulares por módulo (requireAdm, requireAdmOrTecnico)
- [x] Autenticação própria email/senha (bcrypt + JWT) — SEM Manus OAuth
- [x] Página de login própria com visual EHS profissional
- [x] Usuário ADM inicial criado

## Fase 3: Dashboard, Usuários e Empresas
- [x] Dashboard com métricas de inspeções (total, pendentes, atenção, resolvidas)
- [x] Dashboard com métricas de usuários e empresas ativas (sem dados fantasmas)
- [x] Dashboard com notificações enviadas/lidas
- [x] Gráfico de barras semanal e gráfico de pizza por status
- [x] Cadastro de usuário (nome, email, telefone, WhatsApp, papel)
- [x] Listagem de usuários com busca e último acesso
- [x] Ações de usuário: editar, remover
- [x] Cadastro de empresa (dados, logo, CEP, CNPJ, endereço)
- [x] Suporte a obras (nome/endereço do empreendimento)
- [x] Vinculação de clientes com cargos
- [x] Gestão de contratos por empresa
- [x] Listagem de empresas com busca e ações

## Fase 4: Check Lists e Relatórios
- [x] Cadastro de Check List com itens e NRs
- [x] Fotos de exemplo por item
- [x] Edição de NRs
- [x] Listagem de Check Lists
- [x] Criação de Relatório Técnico
- [x] Edição de Relatório Técnico
- [x] Pesquisa de relatórios por data/assunto/status
- [x] Suporte a upload de fotos/vídeos (até 4 arquivos via S3)
- [x] Status: Resolvido, Pendente, Atenção, Previsto
- [x] Campos: situação evidenciada, plano de ação, observações
- [x] Chat integrado com cliente no relatório
- [x] Geração de PDF com layout profissional (puppeteer + chromium)
- [x] PDF: header laranja, logo EHS, status visuais, marca d'água diagonal
- [x] Rota /api/export/inspection/:id funcional

## Fase 5: PGR e Gestão de Segurança
- [x] PGR - módulo de gerenciamento
- [x] PGR - atualização de dados
- [x] PGR - rastreamento de conformidade
- [x] ITS (Instrução Técnica de Segurança)
- [x] PT (Procedimento Técnico)
- [x] Treinamento
- [x] APR (Análise Preliminar de Riscos)
- [x] Ficha de EPI (colaborador, CA, quantidade, validade)
- [x] Advertência (verbal, escrita, suspensão, demissão)
- [x] Tactdriver integrado (monitoramento de motoristas com pontuação)

## Fase 6: Notificações e Chat
- [x] Notificações WhatsApp (mockado)
- [x] Notificações Email (mockado)
- [x] Notificações Sistema
- [x] Rastreamento de notificações enviadas/lidas
- [x] Contador de não lidas no header
- [x] Chat interno em tempo real (polling 3s)

## Fase 7: Testes e Entrega
- [x] 26 testes Vitest passando (todos os routers principais)
- [x] Zero erros TypeScript
- [x] Servidor estável
- [x] Dashboard sem dados fantasmas (zero ao iniciar)
- [x] Itens de inspeção salvos e exibidos corretamente
- [x] Checkpoint final
