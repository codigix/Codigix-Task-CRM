-- CreateTable
CREATE TABLE IF NOT EXISTS `performance_reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `employee_id` INT NOT NULL,
  `reviewer_id` INT NOT NULL,
  `score` INT NOT NULL,
  `task_completion` INT NOT NULL,
  `quality_of_work` INT NOT NULL,
  `on_time_delivery` INT NOT NULL,
  `efficiency` INT NOT NULL,
  `review_gate_points` INT NOT NULL,
  `points_distribution` INT NOT NULL,
  `feedback` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_performance_reviews_employee` (`employee_id`),
  INDEX `idx_performance_reviews_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_perf_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_perf_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
