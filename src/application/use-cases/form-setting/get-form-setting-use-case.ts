import { inject, injectable } from "tsyringe";
import { FormSettingRepository } from "../../../domain/repositories/form-setting-repository";
import { FormSetting } from "../../../domain/form-setting";

@injectable()
export class GetFormSettingUseCase {
    constructor(@inject("FormSettingRepository") private repo: FormSettingRepository) {}

    async execute(organizationId: string): Promise<FormSetting | null> {
        return this.repo.findByOrganizationId(organizationId);
    }
}
