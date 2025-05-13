import { User } from "@houseofwolves/serverlesslaunchpad.types";

export interface UserProvider {
    getUser(message: { email: string }): Promise<User>;
}

export interface UserRepository extends UserProvider {
    upsertUser(message: { userId: string; email: string; firstName: string; lastName: string }): Promise<User>;
}
