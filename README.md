
# Bot para WhatsApp

Este é um bot para WhatsApp utilizando `whatsapp-web.js` para automação de mensagens. Ele também está integrado com um banco de dados MySQL para armazenamento do estado das conversas e opções dinâmicas.

## Instalação

Siga os passos abaixo para configurar e rodar o bot:

1. **Clone o repositório ou baixe os arquivos na sua máquina:**
   - Utilize o comando `git clone <url-do-repositorio>` ou baixe o arquivo .zip e extraia.

2. **Instale as dependências do projeto:**
   No diretório raiz do projeto, execute o comando:
   ```bash
   npm install
   ```

3. **Configure o banco de dados MySQL:**
   - Acesse o PhpMyAdmin ou outro cliente de MySQL.
   - Crie um banco de dados com o nome desejado (exemplo: `chatbot_db`).
   - Importe o arquivo SQL fornecido para criar as tabelas necessárias. Para isso:
     1. No PhpMyAdmin, selecione o banco de dados criado.
     2. Vá até a aba **Importar** e selecione o arquivo SQL correspondente.
     3. Clique em **Executar**.

4. **Configure a conexão com o banco de dados no código:**
   - No arquivo `chatbot_whatsapp.js`, edite a seção de configuração do MySQL:
     ```js
     const db = mysql.createConnection({
       host: 'localhost',
       user: 'root', // Insira seu usuário do MySQL
       password: '', // Insira sua senha do MySQL
       database: 'chatbot_db' // Nome do banco de dados
     });
     ```
   - Certifique-se de que o MySQL está rodando localmente e com as credenciais corretas.

5. **Inicie o bot:**
   Para rodar o bot, execute o seguinte comando no terminal:
   ```bash
   node chatbot_whatsapp.js
   ```

6. **Escaneie o QR Code:**
   - Após rodar o comando acima, será gerado um QR Code no terminal.
   - Abra o WhatsApp no seu celular.
   - Vá até o menu de **Aparelhos conectados** e clique em **Conectar um aparelho**.
   - Escaneie o QR Code que apareceu no terminal.

## Observações

- **Servidor Local:** Para que o bot funcione corretamente, é necessário que o MySQL e o servidor local estejam em execução. Se estiver utilizando o XAMPP ou WAMP, certifique-se de que o MySQL está ativo.
  
- **QR Code:** O QR Code expira após um tempo. Se isso acontecer, reinicie o bot para gerar um novo código.

## Funcionalidades do Bot

- **Menu Dinâmico:** O bot possui menus dinâmicos que são carregados a partir do banco de dados. Cada menu e suas opções são definidos e podem levar o usuário a diferentes fluxos.
  
- **Modo Manual:** O bot pode alternar entre automação e atendimento manual, permitindo que um atendente humano assuma a conversa quando necessário.
  
- **Respostas Automáticas:** O bot responde automaticamente com base nas opções selecionadas pelo usuário.

## Tecnologias Utilizadas

- **Node.js**: Para o desenvolvimento do backend do bot.
- **whatsapp-web.js**: Para interação com o WhatsApp Web.
- **MySQL**: Para armazenar o estado da conversa e as opções dos menus.
- **PhpMyAdmin**: Para gerenciar o banco de dados MySQL.
- **Express-rate-limit**: Para controle de limite de requisições, prevenindo spam.

## Dependências

As principais dependências utilizadas no projeto são:

- `whatsapp-web.js`: Interage com a API do WhatsApp Web.
- `mysql2`: Driver para conexão com MySQL.
- `qrcode-terminal`: Gera o QR Code no terminal para conectar o WhatsApp.
- `express-rate-limit`: Limita o número de mensagens por período, evitando spam.

Para instalar todas as dependências, utilize o comando `npm install`.

## Licença

Este projeto está licenciado sob os termos da licença MIT.
