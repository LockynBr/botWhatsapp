// Dependências
const qrcode = require('qrcode-terminal');
const { Client, Buttons, List, MessageMedia } = require('whatsapp-web.js'); 
const rateLimit = require('express-rate-limit');
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

// Variáveis para armazenar o estado da conversa
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

// Função para buscar um menu específico do banco de dados
const getMenu = (menuId, callback) => {
    const query = 'SELECT * FROM menus WHERE menu_id = ?';
    db.execute(query, [menuId], (err, results) => {
        if (err) throw err;
        callback(results[0]); // Retorna o menu
    });
};

// Função para buscar as opções de um menu específico do banco de dados
const getMenuOptions = (menuId, callback) => {
    const query = 'SELECT * FROM menu_options WHERE menu_id = ?';
    db.execute(query, [menuId], (err, results) => {
        if (err) throw err;
        callback(results); // Retorna as opções do menu
    });
};

// Função para mostrar o menu dinâmico
const showMenu = async (chat, menuId) => {
    getMenu(menuId, async (menu) => {
        getMenuOptions(menuId, async (options) => {
            let menuMessage = `${menu.menu_name}\n${menu.description}\nEscolha uma das opções abaixo:\n`;
            options.forEach((option, index) => {
                menuMessage += `${index + 1} - ${option.option_text}\n`;
            });
            await sendTypingAndMessage(chat, menuMessage, 3000, 3000);
            currentStep[chat.id._serialized] = menuId; // Salva o estado do menu atual
        });
    });
};

// Função para finalizar a automação e passar para o modo manual
const endAutomation = async (chat) => {
    await sendTypingAndMessage(chat, `Obrigado por utilizar nosso assistente automático! A partir de agora, você será atendido manualmente.`, 3000, 3000);
    manualMode[chat.id._serialized] = true; // Coloca o cliente no modo manual
};

// Função para tratar a escolha do menu com base nas opções do banco de dados
const handleMenuOption = async (chat, userOption, menuId) => {
    getMenuOptions(menuId, async (menuOptions) => {
        const optionIndex = parseInt(userOption) - 1;
        if (optionIndex >= 0 && optionIndex < menuOptions.length) {
            const selectedOption = menuOptions[optionIndex];

            // Buscar a resposta personalizada com base na opção selecionada
            getMenuResponse(selectedOption.option_id, async (responseText) => {
                if (responseText) {
                    await sendTypingAndMessage(chat, responseText, 3000, 3000);
                } else if (selectedOption.next_menu_id) {
                    await showMenu(chat, selectedOption.next_menu_id); // Vai para o próximo menu se houver
                } else {
                    await sendTypingAndMessage(chat, `Opção selecionada: ${selectedOption.option_text}`, 3000, 3000);
                    await endAutomation(chat); // Finaliza a automação após a última mensagem
                }
            });
        } else {
            await showMenu(chat, menuId); // Mostra o menu novamente se a opção for inválida
        }
    });
};

// Função para buscar a resposta personalizada com base na opção selecionada
const getMenuResponse = (optionId, callback) => {
    const query = 'SELECT response_text FROM menu_responses WHERE option_id = ?';
    db.execute(query, [optionId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            callback(results[0].response_text); // Retorna a resposta personalizada
        } else {
            callback(null); // Caso não exista uma resposta personalizada
        }
    });
};


// Evento principal para tratamento de mensagens
client.on('message', async msg => {
    try {
        if (!msg.from.endsWith('@c.us')) return; // Valida se a mensagem vem de um usuário

        const chat = await msg.getChat();
        const userMessage = msg.body.toLowerCase();

        // Se o cliente estiver no modo manual, você assume as respostas
        if (manualMode[msg.from]) {
            console.log('Cliente em modo manual, respondendo manualmente.');
            return; // Para de processar automaticamente
        }

        // Recupera o estado do chat (menu atual)
        const menuId = currentStep[chat.id._serialized] || 1; // Menu inicial com id 1

        if (/^\d+$/.test(userMessage)) {
            await handleMenuOption(chat, userMessage, menuId); // Processa a opção selecionada
        } else {
            await showMenu(chat, menuId); // Exibe o menu atual
        }

        // Salva o novo estado no banco de dados
        saveChatState(msg.from, currentStep[msg.from], manualMode[msg.from]);

    } catch (error) {
        console.error('Erro no bot de atendimento:', error);
    }
});
