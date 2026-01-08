/**
 * Colored console output utilities for scaffolding script
 */
import chalk from "chalk";

export const log = {
    title: (message: string): void => {
        console.log(chalk.bold.blue(`\n${message}\n`));
    },

    step: (message: string): void => {
        console.log(chalk.cyan(message));
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

    newline: (): void => {
        console.log();
    },

    section: (emoji: string, message: string): void => {
        console.log(chalk.cyan(`\n${emoji} ${message}`));
    },

    complete: (message: string): void => {
        console.log(chalk.green.bold(`\n✅ ${message}\n`));
    },
};
