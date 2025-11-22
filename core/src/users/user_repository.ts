import { Role } from "./user_roles.js";
import { Features } from "./user_features.js";

// Re-export enums and metadata for external use
export { Role, ROLE_METADATA } from "./user_roles.js";
export { Features, FEATURES_METADATA } from "./user_features.js";

export abstract class UserProvider {
    abstract getUserByEmail(message: GetUserByEmailMessage): Promise<User | undefined>;
    abstract getUserById(message: GetUserByIdMessage): Promise<User | undefined>;
    abstract getAllUsers(message: GetAllUsersMessage): Promise<GetAllUsersResult>;
}

export abstract class UserRepository extends UserProvider {
    abstract upsertUser(message: UpsertUserMessage): Promise<User>;
}

export type User = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    features: Features;
    dateCreated: Date;
    dateModified: Date;
};

export type GetUserByEmailMessage = {
    email: string;
};

export type GetUserByIdMessage = {
    userId: string;
};

export type UpsertUserMessage = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    features: Features;
    dateCreated: Date;
    dateModified: Date;
};

export type GetAllUsersMessage = {
    limit?: number;
    lastEvaluatedKey?: string;
};

export type GetAllUsersResult = {
    users: User[];
    lastEvaluatedKey?: string;
    totalCount?: number;
};
