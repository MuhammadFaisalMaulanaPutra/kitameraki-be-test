import { FormSetting } from "../form-setting"

export interface FormSettingRepository {
    create(task: FormSetting): Promise<FormSetting>
    findByOrganizationId(organizationId: string): Promise<FormSetting | null>
    update(FormSetting: FormSetting): Promise<FormSetting>
}