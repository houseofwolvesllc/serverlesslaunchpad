#!/usr/bin/env tsx

import chalk from "chalk";
import { Destroyer } from "./destroyer";

const destroyer = new Destroyer();
destroyer.run().catch((err: Error) => {
    console.error(chalk.red(`\nUnexpected error: ${err.message}`));
    process.exit(1);
});