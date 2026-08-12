# 📚 Booksly - Sistema de Biblioteca

O **Booksly** é um sistema interativo de gerenciamento de biblioteca desenvolvido para web. O grande diferencial deste projeto é que ele opera 100% no lado do cliente, utilizando **Dexie.js** (um wrapper para IndexedDB) para simular um banco de dados relacional e armazenar informações localmente no navegador.

## 🚀 Funcionalidades

O sistema é dividido em dois grandes módulos: **Painel do Usuário** e **Painel do Administrador**.

### 👤 Área do Usuário
* **Cadastro e Login:** Autenticação simulada com validação de CPF e máscara em tempo real.
* **Catálogo e Empréstimos:** Visualização de livros disponíveis, listagem de novidades e funcionalidade de solicitar o aluguel de um título.
* **Controle de Prazos:** Acompanhamento de devoluções e cálculo automático de multas por atraso (R$ 1,00 por dia).
* **Comunidade e Avaliações:** Os usuários podem deixar notas (1 a 5 estrelas) e resenhas sobre os livros lidos, interagindo com a comunidade.
* **Lista de Espera:** Botão "Avise-me quando disponível" para livros que já estão alugados.
* **Notificações:** Sistema de alertas para avisar sobre devoluções, multas e disponibilidade de livros.
* **Perfil de Usuário:** Área para gerenciar biografia, foto de avatar e livros atualmente lidos.

* <img width="1365" height="634" alt="image" src="https://github.com/user-attachments/assets/065bfe74-b333-40b8-9196-04b3102bcd02" />


### 🛡️ Área do Bibliotecário (Admin)
* **Gestão do Acervo:** Adição, edição e exclusão de livros do catálogo, incluindo gerenciamento de capas e sinopses.
* **Gestão de Usuários:** Controle de membros, exclusão de contas e redefinição de senhas (senha padrão `123456`).
* **Aprovação de Fluxo:** O admin aceita ou recusa as solicitações de empréstimo e devolução feitas pelos usuários.
* **Relatórios e Logs:** Registro detalhado de todas as movimentações do sistema (quem alugou, quem devolveu, alterações no catálogo, etc).
* **Tema Escuro/Claro:** Suporte a dark mode exclusivo no painel de administração com armazenamento de preferência local.

* <img width="1365" height="634" alt="image" src="https://github.com/user-attachments/assets/852a99b9-c9f2-4f28-b1e1-4ddf561c7069" />



### 🚀 Demonstração

**[Acessar o sistema online →](https://ronaldokaras.github.io/sistema-biblioteca-grupo/)**

---

## 🛠️ Tecnologias Utilizadas

* **Linguagens e Estrutura:**
  * HTML5
  * CSS3 (Uso intensivo de CSS Variables para temas e layouts responsivos)
  * JavaScript (Vanilla)
* **Armazenamento Local:**
  * Dexie.js (IndexedDB)
  * sessionStorage / localStorage (Controle de Sessão e Preferências)
* **Fontes:** Inter (Google Fonts)


## 🔐 Acesso para Testes

O banco de dados é populado automaticamente na primeira execução com usuários (como 'Julia Akemi' e 'Gustavo Pelepe'), livros e frases de exemplo.

**Para testar o Painel do Bibliotecário (Admin):**
* **Usuário:** `ana` | **Senha:** `ana123`
* **Usuário:** `carlos` | **Senha:** `carlos456`
* *(Atalho: Na tela inicial, o login `ACESSORESTRITO` com senha `1234` também redireciona para o admin).*

**Para testar o Painel do Usuário:**
* **CPF:** `111.222.333-44`
* **Senha:** `123456`
*(Ou crie uma nova conta diretamente na tela de registro preenchendo seus dados).*

## 👥 Equipe

Projeto desenvolvido de forma colaborativa para fins acadêmicos:

| [<img src="https://github.com/douglasbecker404.png" width=115><br><sub>**douglasbecker404**</sub>](https://github.com/douglasbecker404) | [<img src="https://github.com/Guspelepe.png" width=115><br><sub>**Guspelepe**</sub>](https://github.com/Guspelepe) | [<img src="https://github.com/ronaldokaras.png" width=115><br><sub>**Ronaldo Karas**</sub>](https://github.com/ronaldokaras) |
| :---: | :---: | :---: |
| **Desenvolvedor** | **Desenvolvedor** | **Desenvolvedor** |

## 📄 Licença
Este projeto é de cunho educacional/portfólio e está sob o ano de copyright 2026.