DROP TABLE IF EXISTS `Files`;
CREATE TABLE `Files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(2048) NOT NULL,
  `fileSize` int(11) DEFAULT NULL,
  `userId` char(36) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `visibleToAll` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
