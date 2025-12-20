import { UserProvider, UserRepository } from "@houseofwolves/serverlesslaunchpad.core";
import { User } from "@houseofwolves/serverlesslaunchpad.types";
import { AthenaClient } from "../data/athena/athena_client";

export class AthenaUserProvider implements UserProvider {
    protected readonly athenaClient: AthenaClient;
    protected readonly tableName: string;

    constructor(athenaClient: AthenaClient, tableName: string = "users") {
        this.athenaClient = athenaClient;
        this.tableName = tableName;
    }

    protected mapToUser(row: Record<string, any>): User {
        return {
            userId: row.userId,
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
        };
    }

    async getUser(message: { email: string }): Promise<User> {
        const sql = `SELECT * FROM ${this.tableName} WHERE email = :email`;
        const params = [{ name: "email", value: message.email }];

        const results = await this.athenaClient.query(sql, params, this.mapToUser.bind(this));

        if (results.length === 0) {
            throw new Error(`User with email ${message.email} not found`);
        }

        return results[0];
    }
}

export class AthenaUserRepository extends AthenaUserProvider implements UserRepository {
    constructor(athenaClient: AthenaClient, tableName: string = "users") {
        super(athenaClient, tableName);
    }

    async upsertUser(message: { userId: string; email: string; firstName: string; lastName: string }): Promise<User> {
        // Check if user exists
        const checkSql = `SELECT * FROM ${this.tableName} WHERE userId = :userId`;
        const checkParams = [{ name: "userId", value: message.userId }];

        const existingUsers = await this.athenaClient.query(checkSql, checkParams);

        let sql;
        let params;

        if (existingUsers.length > 0) {
            // Update existing user
            sql = `
                UPDATE ${this.tableName} 
                SET email = :email, firstName = :firstName, lastName = :lastName
                WHERE userId = :userId
            `;
        } else {
            // Insert new user
            sql = `
                INSERT INTO ${this.tableName} (userId, email, firstName, lastName) 
                VALUES (:userId, :email, :firstName, :lastName)
            `;
        }

        params = [
            { name: "userId", value: message.userId },
            { name: "email", value: message.email },
            { name: "firstName", value: message.firstName },
            { name: "lastName", value: message.lastName },
        ];

        await this.athenaClient.query(sql, params);

        // Return the user object
        return {
            userId: message.userId,
            email: message.email,
            firstName: message.firstName,
            lastName: message.lastName,
        };
    }
}
