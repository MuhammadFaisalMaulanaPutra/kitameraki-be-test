import z from "zod";
import { LoginSchema } from "../../validators/auth-validator";

export type LoginRequestDTO = z.infer<typeof LoginSchema>;