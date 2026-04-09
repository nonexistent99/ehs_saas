
# Plano: Tela de Abertura + Login

## Resumo
Criar um fluxo completo de inicialização do sistema com:
1. **Splash Screen** - 3 segundos com logo pulsando e barra de carregamento neon
2. **Tela de Login** - Email e senha com credenciais de teste
3. **Redirecionamento** para o Dashboard após autenticação

---

## Fluxo do Usuário

```text
+------------------+     3 seg     +----------------+     Login     +----------------+
|   Splash Screen  | -----------> |  Tela de Login | -----------> |    Dashboard   |
|   (Logo + Barra) |              |  Email + Senha |              |     (Home)     |
+------------------+              +----------------+              +----------------+
```

---

## O que sera criado

### 1. Componente SplashScreen
- Fundo preto puro (#000000)
- Logo centralizada (150x150 pixels)
- Efeito de pulso neon laranja ao redor da logo (mesmo estilo do dashboard)
- Barra de carregamento fina abaixo da logo
- Animacao de progresso de 0% a 100% em 3 segundos
- Cor neon laranja na barra (#FF6B00)

### 2. Pagina de Login
- Fundo escuro mantendo identidade visual
- Campo de email
- Campo de senha
- Botao "Entrar"
- Credenciais de teste hardcoded:
  - Email: ehs@gmail.com
  - Senha: 123
- Mensagem de erro para credenciais invalidas

### 3. Sistema de Autenticacao Simples
- Estado global para controlar se usuario esta logado
- Protecao das rotas do dashboard
- Redirecionamento automatico

---

## Arquivos a serem criados/modificados

| Arquivo | Acao |
|---------|------|
| `src/pages/SplashScreen.tsx` | Criar - Tela de abertura |
| `src/pages/Login.tsx` | Criar - Tela de login |
| `src/contexts/AuthContext.tsx` | Criar - Contexto de autenticacao |
| `src/App.tsx` | Modificar - Adicionar rotas e fluxo |
| `src/index.css` | Modificar - Adicionar animacoes neon |

---

## Detalhes Tecnicos

### Animacoes CSS para Splash
- `@keyframes logo-pulse-neon` - Pulso de brilho neon laranja
- `@keyframes progress-glow` - Brilho na barra de progresso
- Transicao suave de 3 segundos na barra

### Estrutura do AuthContext
- `isAuthenticated` - Estado de autenticacao
- `login(email, password)` - Funcao de login
- `logout()` - Funcao de logout

### Validacao de Login
- Comparacao simples com credenciais fixas
- Email: ehs@gmail.com
- Senha: 123
- Toast de erro para credenciais invalidas

---

## Resultado Final
Ao abrir o sistema:
1. Aparece tela preta com logo pulsando em neon laranja
2. Barra de carregamento preenche em 3 segundos
3. Transicao automatica para tela de login
4. Usuario insere credenciais e acessa o dashboard
