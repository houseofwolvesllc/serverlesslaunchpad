export abstract class UserProvider {
    abstract getUserByEmail(message: GetUserByEmailMessage): Promise<User | undefined>;
    abstract getUserById(message: GetUserByIdMessage): Promise<User | undefined>;
}

export abstract class UserRepository extends UserProvider {
    abstract upsertUser(message: UpsertUserMessage): Promise<User>;
}

export enum Role {
    Base,
    Support,
    AccountManager,
    Admin,
}

export enum Features {
    None = 0,
    Contacts = 1 << 0,
    Campaigns = 1 << 1,
    Links = 1 << 2,
    Apps = 1 << 3,
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
