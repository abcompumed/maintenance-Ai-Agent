CREATE TABLE `forumCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`forumName` varchar(255) NOT NULL,
	`forumUrl` varchar(500) NOT NULL,
	`username` varchar(255) NOT NULL,
	`encryptedPassword` text NOT NULL,
	`encryptionIv` varchar(32) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsed` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forumCredentials_id` PRIMARY KEY(`id`)
);
