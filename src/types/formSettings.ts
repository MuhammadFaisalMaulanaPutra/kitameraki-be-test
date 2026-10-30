import type { FormSettingsInput } from "../lib/formSettingsSchema";

export type FormSettingsDocument = FormSettingsInput & {
    id: string;
    organizationId: string;
};

export type FormSettingsDto = FormSettingsInput & {
    id: string;
    organizationId: string;
};
