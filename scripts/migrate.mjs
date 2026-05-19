import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

const tables = [
  `CREATE TABLE IF NOT EXISTS \`nrs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`code\` varchar(20) NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`description\` text,
    \`category\` varchar(100),
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`nrs_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`companies\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`cnpj\` varchar(18),
    \`cep\` varchar(9),
    \`address\` text,
    \`neighborhood\` varchar(255),
    \`city\` varchar(100),
    \`state\` varchar(2),
    \`phone\` varchar(20),
    \`email\` varchar(320),
    \`logoUrl\` text,
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`companies_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`obras\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`address\` text,
    \`cep\` varchar(9),
    \`city\` varchar(100),
    \`state\` varchar(2),
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`obras_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`company_users\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`cargo\` enum('diretor','engenheiro','administrativo','coordenador','equipe_tecnica') DEFAULT 'equipe_tecnica',
    \`isNotificationRecipient\` boolean NOT NULL DEFAULT false,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`company_users_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`contracts\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`contractNumber\` varchar(100),
    \`signedAt\` date,
    \`description\` text,
    \`fileUrl\` text,
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`contracts_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`check_lists\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`nrId\` int,
    \`name\` varchar(255) NOT NULL,
    \`description\` text,
    \`createdById\` int NOT NULL,
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`check_lists_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`check_list_items\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`checkListId\` int NOT NULL,
    \`order\` int NOT NULL DEFAULT 0,
    \`description\` text NOT NULL,
    \`examplePhotoUrl\` text,
    \`isRequired\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`check_list_items_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`inspections\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`obraId\` int,
    \`checkListId\` int,
    \`title\` varchar(255) NOT NULL,
    \`description\` text,
    \`status\` enum('nao_iniciada','pendente','atencao','resolvida','concluida') NOT NULL DEFAULT 'nao_iniciada',
    \`inspectedById\` int NOT NULL,
    \`inspectedAt\` timestamp,
    \`watermark\` varchar(255),
    \`usesPreviousReport\` boolean DEFAULT false,
    \`previousInspectionId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`inspections_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`inspection_items\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`inspectionId\` int NOT NULL,
    \`checkListItemId\` int,
    \`nrId\` int,
    \`title\` varchar(255),
    \`situacao\` text,
    \`planoAcao\` text,
    \`observacoes\` text,
    \`status\` enum('resolvido','pendente','atencao','previsto') NOT NULL DEFAULT 'pendente',
    \`resolvedAt\` timestamp,
    \`mediaUrls\` json,
    \`order\` int NOT NULL DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`inspection_items_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`inspection_nrs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`inspectionId\` int NOT NULL,
    \`nrId\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`inspection_nrs_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`pgr\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`obraId\` int,
    \`title\` varchar(255) NOT NULL,
    \`version\` varchar(20) DEFAULT '1.0',
    \`status\` enum('em_elaboracao','vigente','revisao','cancelado') NOT NULL DEFAULT 'em_elaboracao',
    \`validFrom\` date,
    \`validUntil\` date,
    \`responsibleId\` int,
    \`content\` text,
    \`fileUrl\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`pgr_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`its\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`obraId\` int,
    \`code\` varchar(50),
    \`title\` varchar(255) NOT NULL,
    \`description\` text,
    \`content\` text,
    \`status\` enum('ativo','inativo','revisao') NOT NULL DEFAULT 'ativo',
    \`createdById\` int NOT NULL,
    \`fileUrl\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`its_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`pt\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`obraId\` int,
    \`code\` varchar(50),
    \`title\` varchar(255) NOT NULL,
    \`description\` text,
    \`content\` text,
    \`status\` enum('ativo','inativo','revisao') NOT NULL DEFAULT 'ativo',
    \`createdById\` int NOT NULL,
    \`fileUrl\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`pt_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`trainings\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`nrId\` int,
    \`description\` text,
    \`instructor\` varchar(255),
    \`trainingDate\` date,
    \`validityMonths\` int DEFAULT 12,
    \`location\` varchar(255),
    \`status\` enum('agendado','realizado','cancelado') NOT NULL DEFAULT 'agendado',
    \`fileUrl\` text,
    \`createdById\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`trainings_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`training_participants\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`trainingId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`attended\` boolean DEFAULT false,
    \`signatureUrl\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`training_participants_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`apr\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`obraId\` int,
    \`title\` varchar(255) NOT NULL,
    \`activity\` varchar(255),
    \`location\` varchar(255),
    \`date\` date,
    \`status\` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
    \`responsibleId\` int,
    \`content\` json,
    \`createdById\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`apr_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`epi_ficha\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`epiName\` varchar(255) NOT NULL,
    \`ca\` varchar(50),
    \`quantity\` int DEFAULT 1,
    \`deliveredAt\` date,
    \`validUntil\` date,
    \`reason\` text,
    \`signatureUrl\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`epi_ficha_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`advertencias\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`type\` enum('verbal','escrita','suspensao','demissao') NOT NULL DEFAULT 'escrita',
    \`reason\` text NOT NULL,
    \`description\` text,
    \`date\` date NOT NULL,
    \`witnessId\` int,
    \`signatureUrl\` text,
    \`fileUrl\` text,
    \`createdById\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`advertencias_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`tactdriver\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`driverName\` varchar(255) NOT NULL,
    \`vehiclePlate\` varchar(20),
    \`vehicleModel\` varchar(100),
    \`date\` date NOT NULL,
    \`score\` decimal(5,2),
    \`incidents\` json,
    \`notes\` text,
    \`status\` enum('aprovado','atencao','reprovado') NOT NULL DEFAULT 'aprovado',
    \`createdById\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`tactdriver_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`notifications\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`type\` enum('whatsapp','email','system') NOT NULL DEFAULT 'system',
    \`title\` varchar(255) NOT NULL,
    \`message\` text NOT NULL,
    \`recipientUserId\` int,
    \`recipientCompanyId\` int,
    \`sentAt\` timestamp,
    \`readAt\` timestamp,
    \`status\` enum('pending','sent','read','failed') NOT NULL DEFAULT 'pending',
    \`metadata\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`notifications_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`chat_messages\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`inspectionId\` int,
    \`senderId\` int NOT NULL,
    \`recipientId\` int,
    \`companyId\` int,
    \`message\` text NOT NULL,
    \`isRead\` boolean NOT NULL DEFAULT false,
    \`readAt\` timestamp,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`chat_messages_id\` PRIMARY KEY(\`id\`)
  )`,
];

const alterUsers = [
  "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `ehsRole` enum('adm_ehs','cliente','tecnico','apoio') DEFAULT 'tecnico'",
  "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `phone` varchar(20)",
  "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `whatsapp` varchar(20)",
  "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `avatarUrl` text",
  "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `isActive` boolean DEFAULT true NOT NULL",
  "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `passwordHash` varchar(255)",
];

const seedNrs = `INSERT IGNORE INTO \`nrs\` (\`code\`, \`name\`, \`description\`, \`category\`) VALUES
('NR-01', 'Disposições Gerais e GRO', 'Disposições gerais e Gerenciamento de Riscos Ocupacionais', 'GERAL'),
('NR-03', 'Embargo ou Interdição', 'Embargo ou interdição de estabelecimentos', 'GERAL'),
('NR-04', 'SESMT', 'Serviços Especializados em Engenharia de Segurança e em Medicina do Trabalho', 'GERAL'),
('NR-05', 'CIPA', 'Comissão Interna de Prevenção de Acidentes e de Assédio', 'GERAL'),
('NR-06', 'EPI', 'Equipamentos de Proteção Individual', 'GERAL'),
('NR-07', 'PCMSO', 'Programa de Controle Médico de Saúde Ocupacional', 'SAUDE'),
('NR-10', 'Segurança em Instalações Elétricas', 'Segurança em instalações e serviços em eletricidade', 'ELETRICA'),
('NR-11', 'Transporte de Materiais', 'Transporte, movimentação, armazenagem e manuseio de materiais', 'OPERACIONAL'),
('NR-12', 'Máquinas e Equipamentos', 'Segurança no trabalho em máquinas e equipamentos', 'MAQUINAS'),
('NR-15', 'Atividades Insalubres', 'Atividades e operações insalubres', 'SAUDE'),
('NR-16', 'Atividades Perigosas', 'Atividades e operações perigosas', 'SEGURANCA'),
('NR-17', 'Ergonomia', 'Ergonomia', 'SAUDE'),
('NR-18', 'Construção Civil', 'Segurança e saúde no trabalho na indústria da construção', 'CONSTRUCAO'),
('NR-24', 'Condições Sanitárias', 'Condições sanitárias e de conforto nos locais de trabalho', 'SAUDE'),
('NR-26', 'Sinalização de Segurança', 'Sinalização de segurança', 'SEGURANCA'),
('NR-35', 'Trabalho em Altura', 'Trabalho em altura', 'ALTURA')`;

console.log('Running migrations...');

for (const sql of tables) {
  try {
    await connection.execute(sql);
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/)?.[1];
    console.log(`✓ Table ${tableName} created/exists`);
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
  }
}

for (const sql of alterUsers) {
  try {
    await connection.execute(sql);
    console.log(`✓ ALTER users: ${sql.split('ADD COLUMN IF NOT EXISTS')[1]?.trim().split(' ')[0]}`);
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      console.error(`✗ Error: ${err.message}`);
    }
  }
}

try {
  await connection.execute(seedNrs);
  console.log('✓ NRs seeded');
} catch (err) {
  console.error(`✗ NRs seed error: ${err.message}`);
}

await connection.end();
console.log('Migration complete!');
