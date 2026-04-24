export class User {
    constructor(
        public id: string,
        public organizationId: string,
        public email: string,
        public password: string,
        public createdAt: string,
        public updatedAt?: string
    ) {}

    static create(data: Partial<User>): User {
        return new User(
            crypto.randomUUID(),
            data.organizationId,
            data.email,
            data.password,
            new Date().toISOString()
        );
    }
}