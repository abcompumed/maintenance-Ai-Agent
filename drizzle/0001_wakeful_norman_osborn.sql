CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` int,
	`s3Key` varchar(500) NOT NULL,
	`s3Url` text NOT NULL,
	`extractedText` text,
	`ocrProcessed` boolean NOT NULL DEFAULT false,
	`documentType` enum('manual','catalog','schematic','troubleshooting','other') NOT NULL DEFAULT 'other',
	`deviceType` varchar(255),
	`manufacturer` varchar(255),
	`deviceModel` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`deviceType` varchar(255) NOT NULL,
	`manufacturer` varchar(255) NOT NULL,
	`deviceModel` varchar(255) NOT NULL,
	`faultDescription` text NOT NULL,
	`symptoms` text,
	`errorCodes` text,
	`rootCause` text,
	`solution` text,
	`partsRequired` text,
	`estimatedRepairTime` varchar(100),
	`difficulty` enum('easy','medium','hard','expert') NOT NULL DEFAULT 'medium',
	`sourceDocumentId` int,
	`sourceWebsite` varchar(500),
	`linkedFaultIds` text,
	`relatedPartNumbers` text,
	`views` int NOT NULL DEFAULT 0,
	`helpful` int NOT NULL DEFAULT 0,
	`notHelpful` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('new_fault','file_added','search_failed','subscription_expiring','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`relatedFaultId` int,
	`relatedDocumentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queryHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`query` text NOT NULL,
	`deviceType` varchar(255),
	`manufacturer` varchar(255),
	`deviceModel` varchar(255),
	`responseText` text,
	`relatedFaultIds` text,
	`searchPerformed` boolean NOT NULL DEFAULT false,
	`sourcesUsed` text,
	`queryCost` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queryHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `searchSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`sourceType` enum('forum','manual_repository','vendor_site','technical_blog','other') NOT NULL DEFAULT 'other',
	`isActive` boolean NOT NULL DEFAULT true,
	`addedBy` int,
	`lastScraped` timestamp,
	`scrapeFrequency` varchar(50),
	`requiresAuth` boolean NOT NULL DEFAULT false,
	`authCredentials` text,
	`respectsRobotsTxt` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `searchSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spareParts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partNumber` varchar(255) NOT NULL,
	`partName` varchar(255) NOT NULL,
	`manufacturer` varchar(255),
	`specifications` text,
	`datasheetUrl` varchar(500),
	`compatibleDevices` text,
	`estimatedCost` decimal(10,2),
	`supplierLinks` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spareParts_id` PRIMARY KEY(`id`),
	CONSTRAINT `spareParts_partNumber_unique` UNIQUE(`partNumber`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tier` enum('free','individual','corporate') NOT NULL,
	`queriesIncluded` int NOT NULL,
	`queriesUsed` int NOT NULL DEFAULT 0,
	`paymentStatus` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(50),
	`transactionId` varchar(255),
	`amount` decimal(10,2),
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`expiryDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','individual','corporate') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `queriesRemaining` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totalQueriesUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionExpiresAt` timestamp;