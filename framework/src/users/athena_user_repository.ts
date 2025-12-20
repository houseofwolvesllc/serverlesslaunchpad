import {
    GetUserByEmailMessage,
    GetUserByIdMessage,
    Injectable,
    UpsertUserMessage,
    User,
    UserProvider,
    UserRepository,
} from "@houseofwolves/serverlesslaunchpad.core";
import { AthenaClient } from "../data/athena/athena_client";

export class AthenaUserProvider implements UserProvider {
    protected readonly athenaClient: AthenaClient;

    constructor(athenaClient: AthenaClient) {
        this.athenaClient = athenaClient;
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

    async getUserByEmail(message: GetUserByEmailMessage): Promise<User> {
        const sql = `SELECT * FROM users WHERE email = ?`;
        const params = [message.email];

        const results = await this.athenaClient.query(sql, params, this.mapToUser.bind(this));

        if (results.length === 0) {
            throw new Error(`User with email ${message.email} not found`);
        }

        return results[0];
    }

    async getUserById(message: GetUserByIdMessage): Promise<User> {
        const sql = `SELECT * FROM users WHERE userId = ?`;
        const params = [message.userId];

        const results = await this.athenaClient.query(sql, params, this.mapToUser.bind(this));

        if (results.length === 0) {
            throw new Error(`User with id ${message.userId} not found`);
        }

        return results[0];
    }
}

@Injectable()
export class AthenaUserRepository extends AthenaUserProvider implements UserRepository {
    constructor(athenaClient: AthenaClient) {
        super(athenaClient);
    }

    async upsertUser(message: UpsertUserMessage): Promise<User> {
        // Check if user exists
        const checkSql = `SELECT * FROM users WHERE userId = ?`;
        const checkParams = [message.userId];

        const existingUsers = await this.athenaClient.query(checkSql, checkParams);

        let sql;
        let params;

        if (existingUsers.length > 0) {
            // Update existing user
            sql = `
                UPDATE users 
                SET email = ?, firstName = ?, lastName = ?, role = ?, features = ?, dateCreated = ?, dateModified = ?
                WHERE userId = ?
            `;
            params = [
                message.email,
                message.firstName,
                message.lastName,
                message.role,
                message.features,
                this.athenaClient.formatTimestamp(message.dateCreated),
                this.athenaClient.formatTimestamp(message.dateModified),
                message.userId
            ];
        } else {
            // Insert new user
            sql = `
                INSERT INTO users (userId, email, firstName, lastName, role, features, dateCreated, dateModified) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            params = [
                message.userId,
                message.email,
                message.firstName,
                message.lastName,
                message.role,
                message.features,
                this.athenaClient.formatTimestamp(message.dateCreated),
                this.athenaClient.formatTimestamp(message.dateModified)
            ];
        }

        await this.athenaClient.query(sql, params);

        // Fetch and return the actual user record using the existing mapper
        const userSql = `SELECT * FROM users WHERE userId = ?`;
        const userParams = [message.userId];
        const users = await this.athenaClient.query(userSql, userParams, this.mapToUser.bind(this));
        
        if (users.length === 0) {
            throw new Error(`Failed to retrieve upserted user with id ${message.userId}`);
        }
        
        return users[0];
    }
}
