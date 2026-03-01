import { ensureContainer } from "./cosmos";
export const TASKS_CONTAINER_NAME = process.env["COSMOS_CONTAINER_NAME"]?.trim() || "Tasks";
export const FORM_SETTINGS_CONTAINER_NAME = "FormSettings";export function getTasksContainer() {
    return ensureContainer(TASKS_CONTAINER_NAME);
}export function getFormSettingsContainer() {
    return ensureContainer(FORM_SETTINGS_CONTAINER_NAME);
}
