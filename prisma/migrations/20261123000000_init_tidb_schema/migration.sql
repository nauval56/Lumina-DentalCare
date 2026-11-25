-- Lumina Dental Care — TiDB Cloud (MySQL-Compatible) Initial Migration
-- Compatible with TiDB Cloud Serverless & Dedicated (MySQL 8.0 protocol)

CREATE TABLE `roles` (
  `id` VARCHAR(36) NOT NULL,
  `code` ENUM('VISITOR', 'PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN') NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `description` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `roles_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL,
  `roleId` VARCHAR(36) NOT NULL,
  `fullName` VARCHAR(150) NOT NULL,
  `email` VARCHAR(180) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `avatarUrl` VARCHAR(500) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
  `emailVerifiedAt` DATETIME(3) NULL,
  `lastLoginAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_email_key`(`email`),
  INDEX `users_roleId_idx`(`roleId`),
  INDEX `users_email_idx`(`email`),
  INDEX `users_phone_idx`(`phone`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `tokenHash` VARCHAR(128) NOT NULL,
  `userAgent` VARCHAR(500) NULL,
  `ipAddress` VARCHAR(64) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
  INDEX `sessions_userId_idx`(`userId`),
  INDEX `sessions_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `tokenHash` VARCHAR(128) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `password_reset_tokens_tokenHash_key`(`tokenHash`),
  INDEX `password_reset_tokens_userId_idx`(`userId`),
  INDEX `password_reset_tokens_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `email_verification_tokens` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `tokenHash` VARCHAR(128) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `email_verification_tokens_tokenHash_key`(`tokenHash`),
  INDEX `email_verification_tokens_userId_idx`(`userId`),
  INDEX `email_verification_tokens_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `patients` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NULL,
  `medicalRecordNo` VARCHAR(40) NOT NULL,
  `nik` VARCHAR(20) NULL,
  `fullName` VARCHAR(150) NOT NULL,
  `email` VARCHAR(180) NULL,
  `phone` VARCHAR(30) NOT NULL,
  `dateOfBirth` DATETIME(3) NULL,
  `gender` ENUM('LAKI_LAKI', 'PEREMPUAN') NULL,
  `bloodType` VARCHAR(5) NULL,
  `address` TEXT NULL,
  `allergies` TEXT NULL,
  `medicalNotes` TEXT NULL,
  `emergencyContact` VARCHAR(150) NULL,
  `emergencyPhone` VARCHAR(30) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `patients_userId_key`(`userId`),
  UNIQUE INDEX `patients_medicalRecordNo_key`(`medicalRecordNo`),
  UNIQUE INDEX `patients_nik_key`(`nik`),
  INDEX `patients_fullName_idx`(`fullName`),
  INDEX `patients_phone_idx`(`phone`),
  INDEX `patients_email_idx`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `doctors` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `licenseNumber` VARCHAR(60) NOT NULL,
  `titlePrefix` VARCHAR(30) NULL,
  `fullName` VARCHAR(150) NOT NULL,
  `titleSuffix` VARCHAR(50) NULL,
  `specialization` VARCHAR(120) NOT NULL,
  `bio` TEXT NULL,
  `experienceYears` INTEGER NOT NULL DEFAULT 0,
  `education` VARCHAR(255) NULL,
  `consultationFee` DECIMAL(12, 2) NOT NULL DEFAULT 150000.00,
  `photoUrl` VARCHAR(500) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `doctors_userId_key`(`userId`),
  UNIQUE INDEX `doctors_licenseNumber_key`(`licenseNumber`),
  INDEX `doctors_specialization_idx`(`specialization`),
  INDEX `doctors_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `services` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `slug` VARCHAR(140) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `shortDesc` VARCHAR(300) NOT NULL,
  `description` TEXT NOT NULL,
  `price` DECIMAL(12, 2) NOT NULL,
  `durationMinutes` INTEGER NOT NULL DEFAULT 30,
  `iconName` VARCHAR(80) NULL,
  `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `services_code_key`(`code`),
  UNIQUE INDEX `services_slug_key`(`slug`),
  INDEX `services_category_idx`(`category`),
  INDEX `services_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `schedules` (
  `id` VARCHAR(36) NOT NULL,
  `doctorId` VARCHAR(36) NOT NULL,
  `dayOfWeek` INTEGER NOT NULL,
  `startTime` VARCHAR(5) NOT NULL,
  `endTime` VARCHAR(5) NOT NULL,
  `slotDurationMin` INTEGER NOT NULL DEFAULT 30,
  `maxPatients` INTEGER NOT NULL DEFAULT 12,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `schedules_doctorId_dayOfWeek_startTime_key`(`doctorId`, `dayOfWeek`, `startTime`),
  INDEX `schedules_doctorId_dayOfWeek_idx`(`doctorId`, `dayOfWeek`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `clinic_holidays` (
  `id` VARCHAR(36) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `clinic_holidays_date_key`(`date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `clinic_settings` (
  `id` VARCHAR(36) NOT NULL,
  `clinicName` VARCHAR(150) NOT NULL,
  `tagline` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `whatsapp` VARCHAR(40) NULL,
  `email` VARCHAR(180) NOT NULL,
  `operatingHoursJson` JSON NOT NULL,
  `mapEmbedUrl` TEXT NULL,
  `notificationConfig` JSON NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `appointments` (
  `id` VARCHAR(36) NOT NULL,
  `bookingCode` VARCHAR(30) NOT NULL,
  `patientId` VARCHAR(36) NOT NULL,
  `doctorId` VARCHAR(36) NOT NULL,
  `serviceId` VARCHAR(36) NOT NULL,
  `appointmentDate` DATETIME(3) NOT NULL,
  `startTime` VARCHAR(5) NOT NULL,
  `endTime` VARCHAR(5) NOT NULL,
  `slotKey` VARCHAR(120) NULL,
  `status` ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
  `chiefComplaint` TEXT NULL,
  `notes` TEXT NULL,
  `verifiedAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `cancelReason` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `appointments_bookingCode_key`(`bookingCode`),
  UNIQUE INDEX `appointments_slotKey_key`(`slotKey`),
  INDEX `appointments_patientId_idx`(`patientId`),
  INDEX `appointments_doctorId_appointmentDate_idx`(`doctorId`, `appointmentDate`),
  INDEX `appointments_status_idx`(`status`),
  INDEX `appointments_appointmentDate_idx`(`appointmentDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `queues` (
  `id` VARCHAR(36) NOT NULL,
  `appointmentId` VARCHAR(36) NOT NULL,
  `patientId` VARCHAR(36) NOT NULL,
  `doctorId` VARCHAR(36) NOT NULL,
  `queueDate` DATETIME(3) NOT NULL,
  `queueNumber` VARCHAR(20) NOT NULL,
  `sequence` INTEGER NOT NULL,
  `status` ENUM('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
  `checkedInAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `calledAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `queues_appointmentId_key`(`appointmentId`),
  UNIQUE INDEX `queues_queueDate_queueNumber_key`(`queueDate`, `queueNumber`),
  INDEX `queues_doctorId_queueDate_idx`(`doctorId`, `queueDate`),
  INDEX `queues_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `medical_records` (
  `id` VARCHAR(36) NOT NULL,
  `appointmentId` VARCHAR(36) NOT NULL,
  `patientId` VARCHAR(36) NOT NULL,
  `doctorId` VARCHAR(36) NOT NULL,
  `visitDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `chiefComplaint` TEXT NOT NULL,
  `subjective` TEXT NULL,
  `objective` TEXT NULL,
  `vitalSignsJson` JSON NULL,
  `assessment` TEXT NULL,
  `plan` TEXT NULL,
  `clinicalNotes` TEXT NULL,
  `followUpDate` DATETIME(3) NULL,
  `revisionNumber` INTEGER NOT NULL DEFAULT 1,
  `changeHistoryJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `medical_records_appointmentId_key`(`appointmentId`),
  INDEX `medical_records_patientId_visitDate_idx`(`patientId`, `visitDate`),
  INDEX `medical_records_doctorId_idx`(`doctorId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `diagnoses` (
  `id` VARCHAR(36) NOT NULL,
  `medicalRecordId` VARCHAR(36) NOT NULL,
  `icdCode` VARCHAR(20) NULL,
  `name` VARCHAR(200) NOT NULL,
  `severity` VARCHAR(40) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `diagnoses_medicalRecordId_idx`(`medicalRecordId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `treatments` (
  `id` VARCHAR(36) NOT NULL,
  `medicalRecordId` VARCHAR(36) NOT NULL,
  `serviceId` VARCHAR(36) NULL,
  `toothNumber` VARCHAR(10) NULL,
  `name` VARCHAR(200) NOT NULL,
  `fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `treatments_medicalRecordId_idx`(`medicalRecordId`),
  INDEX `treatments_serviceId_idx`(`serviceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `teeth` (
  `id` VARCHAR(36) NOT NULL,
  `fdiNumber` VARCHAR(5) NOT NULL,
  `quadrant` INTEGER NOT NULL,
  `position` INTEGER NOT NULL,
  `toothType` ENUM('PERMANENT', 'DECIDUOUS') NOT NULL,
  `nameId` VARCHAR(120) NOT NULL,
  `arch` VARCHAR(20) NOT NULL,
  `side` VARCHAR(20) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `teeth_fdiNumber_key`(`fdiNumber`),
  INDEX `teeth_toothType_quadrant_idx`(`toothType`, `quadrant`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `odontograms` (
  `id` VARCHAR(36) NOT NULL,
  `patientId` VARCHAR(36) NOT NULL,
  `doctorId` VARCHAR(36) NOT NULL,
  `medicalRecordId` VARCHAR(36) NULL,
  `toothId` VARCHAR(36) NOT NULL,
  `condition` ENUM('SEHAT', 'KARIES', 'TAMBALAN', 'HILANG', 'SISA_AKAR', 'IMPLAN', 'MAHKOTA', 'PERAWATAN_SALURAN_AKAR', 'GOYANG', 'FRAKTUR') NOT NULL DEFAULT 'SEHAT',
  `surfaces` VARCHAR(50) NULL,
  `diagnosis` VARCHAR(255) NULL,
  `treatment` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `odontograms_patientId_toothId_idx`(`patientId`, `toothId`),
  INDEX `odontograms_medicalRecordId_idx`(`medicalRecordId`),
  INDEX `odontograms_recordedAt_idx`(`recordedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `medicines` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `genericName` VARCHAR(180) NULL,
  `category` VARCHAR(80) NOT NULL,
  `unit` VARCHAR(40) NOT NULL,
  `unitPrice` DECIMAL(12, 2) NOT NULL,
  `minimumStock` INTEGER NOT NULL DEFAULT 10,
  `description` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `medicines_code_key`(`code`),
  INDEX `medicines_category_idx`(`category`),
  INDEX `medicines_name_idx`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory` (
  `id` VARCHAR(36) NOT NULL,
  `medicineId` VARCHAR(36) NOT NULL,
  `availableStock` INTEGER NOT NULL DEFAULT 0,
  `reservedStock` INTEGER NOT NULL DEFAULT 0,
  `lastRestockAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `inventory_medicineId_key`(`medicineId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `medicine_batches` (
  `id` VARCHAR(36) NOT NULL,
  `medicineId` VARCHAR(36) NOT NULL,
  `batchNumber` VARCHAR(60) NOT NULL,
  `expiryDate` DATETIME(3) NOT NULL,
  `initialQty` INTEGER NOT NULL,
  `remainingQty` INTEGER NOT NULL,
  `purchasePrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `supplierName` VARCHAR(150) NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `medicine_batches_medicineId_batchNumber_key`(`medicineId`, `batchNumber`),
  INDEX `medicine_batches_medicineId_expiryDate_idx`(`medicineId`, `expiryDate`),
  INDEX `medicine_batches_expiryDate_idx`(`expiryDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `medicineId` VARCHAR(36) NOT NULL,
  `batchId` VARCHAR(36) NULL,
  `actorId` VARCHAR(36) NULL,
  `type` ENUM('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'EXPIRED_DISPOSAL', 'PRESCRIPTION_DISPENSE') NOT NULL,
  `quantity` INTEGER NOT NULL,
  `balanceBefore` INTEGER NOT NULL,
  `balanceAfter` INTEGER NOT NULL,
  `referenceType` VARCHAR(50) NULL,
  `referenceId` VARCHAR(60) NULL,
  `notes` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `inventory_transactions_medicineId_createdAt_idx`(`medicineId`, `createdAt`),
  INDEX `inventory_transactions_batchId_idx`(`batchId`),
  INDEX `inventory_transactions_type_idx`(`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `prescriptions` (
  `id` VARCHAR(36) NOT NULL,
  `prescriptionNumber` VARCHAR(40) NOT NULL,
  `medicalRecordId` VARCHAR(36) NOT NULL,
  `patientId` VARCHAR(36) NOT NULL,
  `doctorId` VARCHAR(36) NOT NULL,
  `notes` TEXT NULL,
  `isDispensed` BOOLEAN NOT NULL DEFAULT false,
  `dispensedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `prescriptions_prescriptionNumber_key`(`prescriptionNumber`),
  INDEX `prescriptions_patientId_idx`(`patientId`),
  INDEX `prescriptions_medicalRecordId_idx`(`medicalRecordId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `prescription_items` (
  `id` VARCHAR(36) NOT NULL,
  `prescriptionId` VARCHAR(36) NOT NULL,
  `medicineId` VARCHAR(36) NOT NULL,
  `dosage` VARCHAR(80) NOT NULL,
  `frequency` VARCHAR(80) NOT NULL,
  `duration` VARCHAR(80) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `instructions` VARCHAR(255) NULL,
  `unitPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `prescription_items_prescriptionId_idx`(`prescriptionId`),
  INDEX `prescription_items_medicineId_idx`(`medicineId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
  `id` VARCHAR(36) NOT NULL,
  `invoiceNumber` VARCHAR(40) NOT NULL,
  `patientId` VARCHAR(36) NOT NULL,
  `appointmentId` VARCHAR(36) NULL,
  `itemsJson` JSON NOT NULL,
  `subtotal` DECIMAL(12, 2) NOT NULL,
  `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `totalAmount` DECIMAL(12, 2) NOT NULL,
  `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
  `dueDate` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
  UNIQUE INDEX `invoices_appointmentId_key`(`appointmentId`),
  INDEX `invoices_patientId_idx`(`patientId`),
  INDEX `invoices_status_idx`(`status`),
  INDEX `invoices_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` VARCHAR(36) NOT NULL,
  `paymentNumber` VARCHAR(40) NOT NULL,
  `invoiceId` VARCHAR(36) NOT NULL,
  `method` ENUM('CASH', 'BANK_TRANSFER', 'QRIS', 'VIRTUAL_ACCOUNT', 'EWALLET') NOT NULL,
  `status` ENUM('PENDING', 'WAITING_VERIFICATION', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `amount` DECIMAL(12, 2) NOT NULL,
  `isManual` BOOLEAN NOT NULL DEFAULT false,
  `isSimulated` BOOLEAN NOT NULL DEFAULT false,
  `receiptNumber` VARCHAR(40) NULL,
  `referenceNote` VARCHAR(255) NULL,
  `verifiedById` VARCHAR(36) NULL,
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payments_paymentNumber_key`(`paymentNumber`),
  UNIQUE INDEX `payments_receiptNumber_key`(`receiptNumber`),
  INDEX `payments_invoiceId_idx`(`invoiceId`),
  INDEX `payments_status_idx`(`status`),
  INDEX `payments_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `paymentId` VARCHAR(36) NOT NULL,
  `provider` VARCHAR(60) NOT NULL,
  `providerTransactionId` VARCHAR(120) NULL,
  `idempotencyKey` VARCHAR(120) NOT NULL,
  `paymentUrl` TEXT NULL,
  `vaNumber` VARCHAR(80) NULL,
  `qrString` TEXT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `status` ENUM('PENDING', 'WAITING_VERIFICATION', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `rawResponseJson` JSON NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payment_transactions_providerTransactionId_key`(`providerTransactionId`),
  UNIQUE INDEX `payment_transactions_idempotencyKey_key`(`idempotencyKey`),
  INDEX `payment_transactions_paymentId_idx`(`paymentId`),
  INDEX `payment_transactions_provider_idx`(`provider`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_gateway_events` (
  `id` VARCHAR(36) NOT NULL,
  `provider` VARCHAR(60) NOT NULL,
  `eventKey` VARCHAR(150) NOT NULL,
  `eventType` VARCHAR(80) NOT NULL,
  `signatureValid` BOOLEAN NOT NULL DEFAULT false,
  `payloadJson` JSON NOT NULL,
  `processed` BOOLEAN NOT NULL DEFAULT false,
  `processedAt` DATETIME(3) NULL,
  `errorMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `payment_gateway_events_eventKey_key`(`eventKey`),
  INDEX `payment_gateway_events_provider_processed_idx`(`provider`, `processed`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `type` ENUM('APPOINTMENT', 'QUEUE', 'MEDICAL', 'PAYMENT', 'INVENTORY', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  `title` VARCHAR(160) NOT NULL,
  `message` TEXT NOT NULL,
  `linkUrl` VARCHAR(255) NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `notifications_userId_isRead_idx`(`userId`, `isRead`),
  INDEX `notifications_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `articles` (
  `id` VARCHAR(36) NOT NULL,
  `slug` VARCHAR(180) NOT NULL,
  `title` VARCHAR(220) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `excerpt` VARCHAR(400) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `coverImage` VARCHAR(500) NULL,
  `authorId` VARCHAR(36) NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT true,
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `articles_slug_key`(`slug`),
  INDEX `articles_category_idx`(`category`),
  INDEX `articles_isPublished_publishedAt_idx`(`isPublished`, `publishedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reviews` (
  `id` VARCHAR(36) NOT NULL,
  `patientId` VARCHAR(36) NULL,
  `patientName` VARCHAR(120) NOT NULL,
  `serviceName` VARCHAR(120) NULL,
  `rating` INTEGER NOT NULL,
  `comment` TEXT NOT NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `reviews_isPublished_rating_idx`(`isPublished`, `rating`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `actorId` VARCHAR(36) NULL,
  `actorRole` VARCHAR(30) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entityType` VARCHAR(80) NOT NULL,
  `entityId` VARCHAR(60) NULL,
  `beforeJson` JSON NULL,
  `afterJson` JSON NULL,
  `ipAddress` VARCHAR(64) NULL,
  `userAgent` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `audit_logs_actorId_idx`(`actorId`),
  INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `audit_logs_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign Keys
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `patients` ADD CONSTRAINT `patients_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `doctors` ADD CONSTRAINT `doctors_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `queues` ADD CONSTRAINT `queues_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `queues` ADD CONSTRAINT `queues_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `queues` ADD CONSTRAINT `queues_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `diagnoses` ADD CONSTRAINT `diagnoses_medicalRecordId_fkey` FOREIGN KEY (`medicalRecordId`) REFERENCES `medical_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `treatments` ADD CONSTRAINT `treatments_medicalRecordId_fkey` FOREIGN KEY (`medicalRecordId`) REFERENCES `medical_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `treatments` ADD CONSTRAINT `treatments_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `odontograms` ADD CONSTRAINT `odontograms_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `odontograms` ADD CONSTRAINT `odontograms_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `odontograms` ADD CONSTRAINT `odontograms_medicalRecordId_fkey` FOREIGN KEY (`medicalRecordId`) REFERENCES `medical_records`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `odontograms` ADD CONSTRAINT `odontograms_toothId_fkey` FOREIGN KEY (`toothId`) REFERENCES `teeth`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `medicine_batches` ADD CONSTRAINT `medicine_batches_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `medicine_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_medicalRecordId_fkey` FOREIGN KEY (`medicalRecordId`) REFERENCES `medical_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `prescription_items` ADD CONSTRAINT `prescription_items_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `prescriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `prescription_items` ADD CONSTRAINT `prescription_items_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payments` ADD CONSTRAINT `payments_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `articles` ADD CONSTRAINT `articles_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
