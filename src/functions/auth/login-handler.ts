import { HttpRequest, InvocationContext, HttpResponseInit, app } from "@azure/functions";
import { container } from "tsyringe";
import { validateSchema } from "../../application/validators/schema-validator";
import { withErrorHandling } from "../../infrastructure/http/error-handler";
import { ApiResponseBuilder } from "../../infrastructure/http/response";
import { LoginUseCase } from "../../application/use-cases/auth/login-use-case";
import { LoginRequestDTO } from "../../application/dtos/requests/login-request-dto";
import { LoginSchema } from "../../application/validators/auth-validator";

const getLoginHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestId = request.headers.get('x-request-id') || context.invocationId;
    const body = await request.json();
    
    const loginDTO: LoginRequestDTO = validateSchema(LoginSchema, body);
    const useCase = container.resolve(LoginUseCase);
    const result = await useCase.execute(loginDTO);
    
    return ApiResponseBuilder.created({ accessToken: result }, requestId);
};

export const AuthLogin = withErrorHandling(getLoginHandler);

app.http('AuthLogin', {
    methods: ['POST'],
    route: 'login',
    authLevel: 'anonymous',
    handler: AuthLogin
});