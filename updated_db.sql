-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: holontelecomdb
-- ------------------------------------------------------
-- Server version	8.0.37

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id_clients` int NOT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `package` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_clients`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `password_history` json DEFAULT NULL,
  `login_attempts` int DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `password_history_limit` int DEFAULT '3',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'gilyona43@walla.com','$2a$10$tqZ7XRSCisLxFD2RUn0rFOovvNLKxeCQ0XTm70ENLa5tzDujKJaqq','[\"$2a$10$vrc2wHIB1a94PE9lvT2uJOTuOZWdAnszdl3o7DYDNyA08avPPi44e\"]',0,NULL,3),(4,'admin@example.com','$2a$10$IQhY31nIFb8dwmWbFX2Cuu2vaPbiY66Z5MGMHeRiNjxeJjvNQ.PHy','[\"$2a$10$vrc2wHIB1a94PE9lvT2uJOTuOZWdAnszdl3o7DYDNyA08avPPi44e\"]',4,'2025-01-12 12:00:42',3),(5,'gil_one9@walla.com','$2a$10$pwcDHK1sOhFEavuNhFtWJ./Q0WjQMIrXjXCY73lHfzkFp8pkKUniG','[\"$2a$10$vrc2wHIB1a94PE9lvT2uJOTuOZWdAnszdl3o7DYDNyA08avPPi44e\"]',0,NULL,3),(6,'checkcheck@gmail.com','$2a$10$fKJWBMwvqwxVv2vqLekqxeqEPGpcc8Ps0zzYuP7ku7t021/cShxSW','[\"$2a$10$vrc2wHIB1a94PE9lvT2uJOTuOZWdAnszdl3o7DYDNyA08avPPi44e\"]',0,NULL,3),(7,'blabla@gmail.com','$2a$10$nUzbeME/tVqMaRQCXBLOSOqJioGEmNn8PeuZeH4yvVpjw5FJPtuhS','[\"$2a$10$vrc2wHIB1a94PE9lvT2uJOTuOZWdAnszdl3o7DYDNyA08avPPi44e\"]',0,NULL,3),(8,'gil.yona@gmail.com','$2a$10$z6Pdv6AjSfOsLStXxS6jEONmpumxMuRMSI3lr7D0K8Y1ZGZKCzFA2','[\"$2a$10$vrc2wHIB1a94PE9lvT2uJOTuOZWdAnszdl3o7DYDNyA08avPPi44e\", \"$2a$10$3uO0S01a5SXQAdcxIb8dS.dfh7Gty87hs8to9bCohrboY06ekcYn2\", \"$2a$10$z6Pdv6AjSfOsLStXxS6jEONmpumxMuRMSI3lr7D0K8Y1ZGZKCzFA2\"]',0,NULL,3);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-01-12 21:52:14
