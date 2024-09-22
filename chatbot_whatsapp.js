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

// Função para tratar a escolha do menu com base nas opções do banco de dados
const handleMenuOption = async (chat, userOption, menuId) => {
    getMenuOptions(menuId, async (menuOptions) => {
        const optionIndex = parseInt(userOption) - 1;
        if (optionIndex >= 0 && optionIndex < menuOptions.length) {
            const selectedOption = menuOptions[optionIndex];

            // Verifica se há um próximo menu
            if (selectedOption.next_menu_id) {
                // Busca o próximo menu
                getMenu(selectedOption.next_menu_id, async (nextMenu) => {
                    if (nextMenu.video_url) {
                        // Verifica se a opção selecionada foi "Não sei, me envie um vídeo sobre"
                        if (selectedOption.option_text === 'Não sei, me envie um vídeo sobre') {
                            // Envia o vídeo e depois a mensagem de agradecimento
                            await sendTypingAndMessage(chat, `Aqui está um vídeo que pode te ajudar: ${nextMenu.video_url}`, 3000, 3000);
                            
                            // Aguarda 5 segundos antes de enviar a mensagem de agradecimento
                            setTimeout(async () => {
                                await sendTypingAndMessage(chat, 'Obrigado por utilizar nossos serviços, você será redirecionado para um dos nossos atendentes.', 3000, 3000);
                                await endAutomation(chat); // Finaliza a automação após a última mensagem
                            }, 5000);
                        } else {
                            // Caso contrário, segue o fluxo normal de envio do vídeo e próxima opção
                            await sendTypingAndMessage(chat, `Aqui está um vídeo que pode te ajudar: ${nextMenu.video_url}`, 3000, 3000);

                            // Pergunta sobre o tipo de impressora após o vídeo
                            setTimeout(async () => {
                                await sendTypingAndMessage(chat, 'Agora, por favor, selecione o tipo da sua impressora para continuarmos:', 3000, 3000);
                                await showMenu(chat, 6); // Exibe o menu de tipos de impressora (menu_id = 6)
                            }, 5000);
                        }
                    } else {
                        // Se não houver vídeo, segue com o fluxo normal do menu
                        await showMenu(chat, selectedOption.next_menu_id);
                    }
                });
            } else {
                // Buscar a resposta personalizada com base na opção selecionada
                getMenuResponse(selectedOption.option_id, async (responseText) => {
                    if (responseText) {
                        await sendTypingAndMessage(chat, responseText, 3000, 3000);
                    } else {
                        await sendTypingAndMessage(chat, `Opção selecionada: ${selectedOption.option_text}`, 3000, 3000);
                        await endAutomation(chat); // Finaliza a automação após a última mensagem
                    }
                });
            }
        } else {
            await showMenu(chat, menuId); // Mostra o menu novamente se a opção for inválida
        }
    });
};

// Evento principal para tratamento de mensagens
// Evento principal para tratamento de mensagens
client.on('message', async msg => {
    try {
        if (!msg.from.endsWith('@c.us')) return; // Valida se a mensagem vem de um usuário

        const chat = await msg.getChat();
        const userMessage = msg.body.toLowerCase();

        // Se for a primeira interação ou a primeira mensagem do usuário
        if (!currentStep[chat.id._serialized]) {
            // Enviar mensagem de apresentação
            await sendTypingAndMessage(chat, 'Olá, seja bem-vindo(a) à nossa loja de informática! Eu sou o Paulo e estou aqui para te ajudar. Se precisar saber nossos horários de funcionamento ou endereço, é só conferir no nosso perfil.', 3000, 3000);
        }

        // Agora começa o fluxo principal (menus, opções, etc.)
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
