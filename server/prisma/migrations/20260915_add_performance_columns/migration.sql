-- DropForeignKey
ALTER TABLE `general_tasks` DROP FOREIGN KEY `fk_tasks_project`;

-- DropForeignKey
ALTER TABLE `it_projects` DROP FOREIGN KEY `fk_it_projects_team`;

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `effort_points` INTEGER NULL DEFAULT 0,
    ADD COLUMN `estimated_hours` DECIMAL(10, 2) NULL DEFAULT 0.00;

-- AddForeignKey
ALTER TABLE `general_tasks` ADD CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `it_projects` ADD CONSTRAINT `fk_it_projects_team` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

