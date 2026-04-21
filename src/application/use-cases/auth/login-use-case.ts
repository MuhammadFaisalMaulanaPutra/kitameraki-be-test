import { inject, injectable } from "tsyringe";
import { UserRepository } from "../../../domain/repositories/user-repository";
import { LoginRequestDTO } from "../../dtos/requests/login-request-dto";
import { InvalidCredentialsError } from "../../../domain/errors/domain-error";
import { validatePassword } from "../../../utils/util";
import { singToken } from "../../../utils/jwt";

@injectable()
export class LoginUseCase {
    constructor(@inject("UserRepository") private repo: UserRepository) {}

    async execute(loginDTO: LoginRequestDTO): Promise<string> {
        const user = await this.repo.findByEmail(loginDTO.email);

        if (!user)
            throw new InvalidCredentialsError();

        const isValid = await validatePassword(loginDTO.password, user.password);
        if (!isValid)
            throw new InvalidCredentialsError();

        const accessToken = singToken({
            sub: user.id,
            organizationId: user.organizationId
        });

        return accessToken;
    }
}