import { inject, injectable } from "tsyringe";
import { FormSettingRepository } from "../../../domain/repositories/form-setting-repository";
import { FormSetting } from "../../../domain/form-setting";
import { FormSettingDTO } from "../../dtos/requests/form-setting-request-dto";

@injectable()
export class UpdateFormSettingUseCase {
    constructor(@inject("FormSettingRepository") private repo: FormSettingRepository) {}

    async execute(id: string, formSettingDTO: FormSettingDTO): Promise<FormSetting | null> {
        const formSetting = new FormSetting(
            id,
            formSettingDTO.organizationId,
            formSettingDTO.fields
        );

        return this.repo.update(formSetting);
    }
}
