
// Dependências
const qrcode = require('qrcode-terminal');
const { Client, Buttons, List, MessageMedia } = require('whatsapp-web.js'); 
const rateLimit = require('express-rate-limit'); // Supondo o uso de algum middleware para controle de taxa
const mysql = require('mysql2');
const client = new Client();

// Conexão com o MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chatbot_db'
});

// Conectar ao banco de dados
db.connect(err => {
    if (err) throw err;
    console.log('Conectado ao MySQL!');
});

// Função de delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Função para criar respostas
const sendTypingAndMessage = async (chat, message, typingDelay = 3000, messageDelay = 3000) => {
    await delay(typingDelay); // Simula digitação
    await chat.sendStateTyping();
    await delay(messageDelay); // Aguarda antes de enviar mensagem
    await client.sendMessage(chat.id._serialized, message);
};

// Limite de solicitações para evitar spam
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // Limite de 5 solicitações por minuto por usuário
    message: 'Você está enviando muitas mensagens. Tente novamente mais tarde.',
});

// Serviço de leitura do QR Code
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Quando o WhatsApp estiver pronto
client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

// Inicializa o cliente do WhatsApp
client.initialize();

// Função principal de atendimento
// Variável para armazenar o estado da conversa
let currentStep = {};
let manualMode = {}; // Armazena se o cliente está no modo manual

// Função para salvar o estado do chat no MySQL
const saveChatState = (userId, currentStep, manualMode) => {
    const query = `INSERT INTO chat_state (user_id, current_step, manual_mode) 
                   VALUES (?, ?, ?) 
                   ON DUPLICATE KEY UPDATE current_step = ?, manual_mode = ?`;
    db.execute(query, [userId, currentStep, manualMode, currentStep, manualMode], (err, results) => {
        if (err) throw err;
        console.log('Estado da conversa salvo no banco de dados.');
    });
};

// Função para buscar o estado do chat no MySQL
const getChatState = (userId, callback) => {
    const query = `SELECT current_step, manual_mode FROM chat_state WHERE user_id = ?`;
    db.execute(query, [userId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const { current_step, manual_mode } = results[0];
            callback({ currentStep: current_step, manualMode: manual_mode });
        } else {
            callback(null); // Não encontrou estado salvo para esse usuário
        }
    });
};

client.on('message', async msg => {
    try {
        // Valida se a mensagem vem de um usuário
        if (!msg.from.endsWith('@c.us')) return;

        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname ? contact.pushname.split(" ")[0] : 'Cliente';

        // Se o cliente estiver no modo manual, você assume as respostas
        if (manualMode[msg.from]) {
            console.log('Cliente em modo manual, respondendo manualmente.');
            return; // Para de processar automaticamente
        }

        // Função para finalizar a automação e passar para modo manual
        const endAutomation = async () => {
            await sendTypingAndMessage(chat, `Obrigado por utilizar nosso assistente automático! A partir de agora, você será atendido manualmente.`, 3000, 3000);
            manualMode[msg.from] = true; // Coloca o cliente no modo manual
        };

        // Função para mostrar o menu inicial
        const showMainMenu = async () => {
            await sendTypingAndMessage(chat, `Olá ${name}, sou o assistente virtual da sua loja de informática. Como posso ajudá-lo?
Escolha uma das opções abaixo:
1 - Conserto e manutenção de PC
2 - Conserto e manutenção de impressora
3 - Outro serviço`, 3000, 3000);
            currentStep[msg.from] = 'menu'; // Salva o estado de menu inicial
        };

        // Função de pergunta sobre o tipo de impressora
        const askPrinterType = async () => {
            await sendTypingAndMessage(chat, `Sua impressora é:
1 - Jato de tinta
2 - Cartucho
3 - Não sei, envie um vídeo explicativo
4 - Voltar ao menu inicial`, 3000, 3000);
            currentStep[msg.from] = 'printerType'; // Salva o estado de pergunta sobre impressora
        };

        // Função principal de escolha
        const handleMenuOption = async option => {
            switch (option) {
                case '1':
                    await sendTypingAndMessage(chat, `Oferecemos serviços de conserto e manutenção de computadores. Desde limpeza, formatação, até substituição de peças.
Entre em contato para mais detalhes.`, 3000, 3000);
                    await endAutomation(); // Finaliza a automação após a última mensagem
                    break;
                case '2':
                    await sendTypingAndMessage(chat, `Realizamos conserto e manutenção de impressoras.`, 3000, 3000);
                    await askPrinterType(); // Pergunta sobre o tipo de impressora
                    break;
                case '3':
                    await sendTypingAndMessage(chat, `Em breve, mais serviços estarão disponíveis!`, 3000, 3000);
                    await endAutomation(); // Finaliza a automação após a última mensagem
                    break;
                default:
                    await showMainMenu(); // Mostra o menu inicial
            }
        };

        // Verifica palavra-chave inicial ou opções
        const menuKeywords = /(bom dia|boa tarde|boa noite|oi|olá|ola|teste)/i;

        // Converte a mensagem para lower case para facilitar a validação
        const userMessage = msg.body.toLowerCase();

        // Caso o cliente esteja em um fluxo específico (tipo de impressora)
        if (currentStep[msg.from] === 'printerType') {
            if (userMessage === '1') {
                await sendTypingAndMessage(chat, `Você escolheu uma impressora *jato de tinta*. Vamos prosseguir com o atendimento para esse tipo de impressora.`, 3000, 3000);
                await endAutomation(); // Finaliza a automação
            } else if (userMessage === '2') {
                await sendTypingAndMessage(chat, `Você escolheu uma impressora *de cartucho*. Vamos prosseguir com o atendimento para esse tipo de impressora.`, 3000, 3000);
                await endAutomation(); // Finaliza a automação
            } else if (userMessage === '3') {
                await sendTypingAndMessage(chat, `Aqui está o vídeo que te ajudará a identificar o tipo de sua impressora.
[link do vídeo]`, 3000, 3000);
                await askPrinterType(); // Pergunta novamente após o envio do vídeo
            } else if (userMessage === '4') {
                await showMainMenu(); // Voltar ao menu inicial
            } else {
                await sendTypingAndMessage(chat, `Escolha uma das opções abaixo:
1 - Jato de tinta
2 - Cartucho
3 - Não sei, envie um vídeo explicativo
4 - Voltar ao menu inicial`, 3000, 3000);
            }
            return; // Termina aqui o processamento para não cair no menu principal
        }

        // Verifica palavras-chave como "bom dia", "teste", etc.
        if (menuKeywords.test(userMessage)) {
            await sendTypingAndMessage(chat, 'Bem-vindo à nossa loja de informática! Como podemos ajudar?', 3000, 3000);
        } else if (['1', '2', '3'].includes(userMessage)) {
            await handleMenuOption(userMessage); // Executa a opção correspondente
        } else {
            await showMainMenu();
        }

        // Salva o novo estado no banco de dados
        saveChatState(msg.from, currentStep[msg.from], manualMode[msg.from]);

    } catch (error) {
        console.error('Erro no bot de atendimento:', error);
    }
});
