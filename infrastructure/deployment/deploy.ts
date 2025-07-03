#!/usr/bin/env tsx

import chalk from "chalk";
import { Deployer } from "./deployer";

const deployer = new Deployer();
deployer.run().catch((err: Error) => {
    console.error(chalk.red(`\nUnexpected error: ${err.message}`));
    process.exit(1);
});
