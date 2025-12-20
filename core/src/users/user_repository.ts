import { Features, Role, User } from "./types";

export abstract class UserProvider {
    abstract getUser(message: { email: string }): Promise<User>;
}

export abstract class UserRepository extends UserProvider {
    abstract upsertUser(message: {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        role: Role;
        features: Features;
        dateCreated: Date;
        dateModified: Date;
    }): Promise<User>;
}
