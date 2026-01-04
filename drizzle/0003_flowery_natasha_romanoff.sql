CREATE TABLE `githubIntegration` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`githubUsername` varchar(255) NOT NULL,
	`repositoryName` varchar(255) NOT NULL,
	`repositoryUrl` varchar(500) NOT NULL,
	`encryptedAccessToken` text NOT NULL,
	`encryptionIv` varchar(32) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`autoCreateIssues` boolean NOT NULL DEFAULT true,
	`autoCreatePRs` boolean NOT NULL DEFAULT true,
	`syncSourceCode` boolean NOT NULL DEFAULT true,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `githubIntegration_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `githubIssues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`faultId` int NOT NULL,
	`githubIssueNumber` int NOT NULL,
	`githubIssueUrl` varchar(500) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`status` varchar(50) NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `githubIssues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `githubPullRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`faultId` int NOT NULL,
	`githubPRNumber` int NOT NULL,
	`githubPRUrl` varchar(500) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`branch` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `githubPullRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `githubSyncedFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`faultId` int,
	`filePath` varchar(500) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`githubPath` varchar(500) NOT NULL,
	`commitSha` varchar(100),
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `githubSyncedFiles_id` PRIMARY KEY(`id`)
);
