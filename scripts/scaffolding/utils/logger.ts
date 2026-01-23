/**
 * Colored console output utilities for scaffolding script
 */
import chalk from "chalk";

export const log = {
    title: (message: string): void => {
        console.log(chalk.bold.blue(`\n${message}\n`));
    },

    success: (message: string): void => {
        console.log(chalk.green(`   ✓ ${message}`));
    },

    warning: (message: string): void => {
        console.log(chalk.yellow(`   ⚠️  ${message}`));
    },

    error: (message: string): void => {
        console.log(chalk.red(`   ✗ ${message}`));
    },

    info: (message: string): void => {
        console.log(chalk.gray(`   ${message}`));
    },

    section: (emoji: string, message: string): void => {
        console.log(chalk.cyan(`\n${emoji} ${message}`));
    },

    complete: (message: string): void => {
        console.log(chalk.green.bold(`\n✅ ${message}\n`));
    },
};
