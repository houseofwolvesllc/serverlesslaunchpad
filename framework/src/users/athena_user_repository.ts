import { Features, Role, User, UserProvider, UserRepository } from "@houseofwolves/serverlesslaunchpad.core";
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
            role: row.role,
            features: row.features,
            dateCreated: row.dateCreated,
            dateModified: row.dateModified,
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

    async upsertUser(message: {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        role: Role;
        features: Features;
        dateCreated: Date;
        dateModified: Date;
    }): Promise<User> {
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
                SET email = :email, firstName = :firstName, lastName = :lastName, role = :role, features = :features, dateCreated = :dateCreated, dateModified = :dateModified
                WHERE userId = :userId
            `;
        } else {
            // Insert new user
            sql = `
                INSERT INTO ${this.tableName} (userId, email, firstName, lastName, role, features, dateCreated, dateModified) 
                VALUES (:userId, :email, :firstName, :lastName, :role, :features, :dateCreated, :dateModified)
            `;
        }

        params = [
            { name: "userId", value: message.userId },
            { name: "email", value: message.email },
            { name: "firstName", value: message.firstName },
            { name: "lastName", value: message.lastName },
            { name: "role", value: message.role },
            { name: "features", value: message.features },
            { name: "dateCreated", value: message.dateCreated },
            { name: "dateModified", value: message.dateModified },
        ];

        await this.athenaClient.query(sql, params);

        // Return the user object
        return {
            userId: message.userId,
            email: message.email,
            firstName: message.firstName,
            lastName: message.lastName,
            role: message.role,
            features: message.features,
            dateCreated: message.dateCreated,
            dateModified: message.dateModified,
        };
    }
}
