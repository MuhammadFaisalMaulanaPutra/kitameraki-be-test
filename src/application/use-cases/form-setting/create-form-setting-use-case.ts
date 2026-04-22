import { inject, injectable } from "tsyringe";
import { FormSettingRepository } from "../../../domain/repositories/form-setting-repository";
import { FormSetting } from "../../../domain/form-setting";
import { FormSettingDTO } from "../../dtos/requests/form-setting-request-dto";

@injectable()
export class CreateFormSettingUseCase {
    constructor(@inject("FormSettingRepository") private repo: FormSettingRepository) {}

    async execute(formSettingDTO: FormSettingDTO): Promise<FormSetting> {
        const formSetting = FormSetting.create({
            organizationId: formSettingDTO.organizationId,
            fields: formSettingDTO.fields
        });

        return this.repo.create(formSetting);
    }
}