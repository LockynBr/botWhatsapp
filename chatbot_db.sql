-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 22/09/2024 às 20:21
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `chatbot_db`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `chat_state`
--

CREATE TABLE `chat_state` (
  `user_id` varchar(255) NOT NULL,
  `current_step` varchar(255) DEFAULT NULL,
  `manual_mode` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `menus`
--

CREATE TABLE `menus` (
  `menu_id` int(11) NOT NULL,
  `menu_name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `menus`
--

INSERT INTO `menus` (`menu_id`, `menu_name`, `description`, `video_url`) VALUES
(1, 'Menu Principal', 'Bem-vindo! Como podemos ajudar? Selecione uma das opções abaixo:', NULL),
(2, 'Conserto de Computadores', 'Você selecionou \"Conserto de Computadores\". Qual tipo de serviço você precisa?', NULL),
(3, 'Conserto de Impressoras', 'Você selecionou \"Conserto de Impressoras\". Qual é o problema da sua impressora?', NULL),
(4, 'Tipo de Impressora', 'Qual é o tipo da sua impressora? Selecione uma das opções abaixo:', NULL),
(5, 'Ajuda com Cartucho', 'Aqui está um vídeo que pode te ajudar com problemas de cartucho.', 'https://www.youtube.com/watch?v=1uSz-f0lqhU'),
(6, 'Escolha seu tipo de impressora', 'Por favor, selecione o tipo de impressora para prosseguirmos com o atendimento:', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `menu_options`
--

CREATE TABLE `menu_options` (
  `option_id` int(11) NOT NULL,
  `menu_id` int(11) DEFAULT NULL,
  `option_text` varchar(255) DEFAULT NULL,
  `next_menu_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `menu_options`
--

INSERT INTO `menu_options` (`option_id`, `menu_id`, `option_text`, `next_menu_id`) VALUES
(1, 1, 'Conserto de Computadores', 2),
(2, 1, 'Conserto de Impressoras', 3),
(3, 1, 'Outros Serviços', NULL),
(4, 2, 'Serviço de Limpeza', NULL),
(5, 2, 'Formatação', NULL),
(6, 2, 'Troca de Peças', NULL),
(7, 2, 'Voltar ao Menu Principal', 1),
(8, 3, 'Problema com Cartucho', 6),
(9, 3, 'Problema com Tinta', NULL),
(10, 3, 'Voltar ao Menu Principal', 1),
(11, 4, 'Impressora a Laser', NULL),
(12, 4, 'Impressora a Jato de Tinta', NULL),
(13, 4, 'Voltar ao Menu Principal', 1),
(14, 6, 'Impressora a Laser', NULL),
(15, 6, 'Impressora a Jato de Tinta', NULL),
(16, 6, 'Não sei, preciso de ajuda', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `menu_responses`
--

CREATE TABLE `menu_responses` (
  `response_id` int(11) NOT NULL,
  `option_id` int(11) NOT NULL,
  `response_text` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `menu_responses`
--

INSERT INTO `menu_responses` (`response_id`, `option_id`, `response_text`) VALUES
(1, 4, 'Você selecionou \"Serviço de Limpeza\". Agradecemos o seu contato, em breve um atendente irá entrar em contato com você.'),
(2, 5, 'Você selecionou \"Formatação\". Nossa equipe entrará em contato para mais detalhes.'),
(3, 6, 'Você selecionou \"Troca de Peças\". Um atendente irá entrar em contato em breve para ajudar.'),
(4, 8, 'Aqui está o vídeo que pode te ajudar com o cartucho. Agora, por favor, selecione o tipo da sua impressora para continuarmos.'),
(5, 9, 'Você selecionou \"Problema com Tinta\". Um atendente entrará em contato em breve.'),
(6, 11, 'Você selecionou \"Impressora a Laser\". Em breve um atendente irá entrar em contato para mais informações.'),
(7, 12, 'Você selecionou \"Impressora a Jato de Tinta\". Em breve um atendente irá entrar em contato para mais informações.');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `chat_state`
--
ALTER TABLE `chat_state`
  ADD PRIMARY KEY (`user_id`);

--
-- Índices de tabela `menus`
--
ALTER TABLE `menus`
  ADD PRIMARY KEY (`menu_id`);

--
-- Índices de tabela `menu_options`
--
ALTER TABLE `menu_options`
  ADD PRIMARY KEY (`option_id`),
  ADD KEY `menu_id` (`menu_id`);

--
-- Índices de tabela `menu_responses`
--
ALTER TABLE `menu_responses`
  ADD PRIMARY KEY (`response_id`),
  ADD KEY `option_id` (`option_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `menus`
--
ALTER TABLE `menus`
  MODIFY `menu_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `menu_options`
--
ALTER TABLE `menu_options`
  MODIFY `option_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de tabela `menu_responses`
--
ALTER TABLE `menu_responses`
  MODIFY `response_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `menu_options`
--
ALTER TABLE `menu_options`
  ADD CONSTRAINT `menu_options_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`menu_id`);

--
-- Restrições para tabelas `menu_responses`
--
ALTER TABLE `menu_responses`
  ADD CONSTRAINT `menu_responses_ibfk_1` FOREIGN KEY (`option_id`) REFERENCES `menu_options` (`option_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
