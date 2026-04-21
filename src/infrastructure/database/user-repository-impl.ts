import { Container } from "@azure/cosmos";
import { UserRepository } from "../../domain/repositories/user-repository";
import { User } from "../../domain/user";
import { UnauthorizedError } from "../../domain/errors/domain-error";

export class UserRepositoryImpl implements UserRepository {
    constructor(private container: Container) {}

    async findByEmail(email: string): Promise<User | null> {
        const query = {
            query: "SELECT c.id, c.password, c.organizationId FROM user c WHERE c.email=@email",
            parameters: [{name: "@email", value: email}]
        }

        const { resources } = await this.container.items.query(query, {
            partitionKey: email
        }).fetchAll();

        if (resources.length == 0)
            return null

        const user = resources[0];

        return new User(
            user.id,
            user.organizationId,
            user.email,
            user.password,
            user.createdAt
        );
    }
}