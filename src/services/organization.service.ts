import * as taskRepository from "@/repositories/task.repository";
import { ensureContainersExist } from "@/database/cosmosClient";
import { seedDatabase } from "@/database/seed";

export async function getOrganizationIds(): Promise<string[]> {
  await ensureContainersExist();
  let orgIds = await taskRepository.findDistinctOrganizationIds();

  if (orgIds.length === 0) {
    await seedDatabase(false);
    orgIds = await taskRepository.findDistinctOrganizationIds();
  }

  return orgIds;
}

