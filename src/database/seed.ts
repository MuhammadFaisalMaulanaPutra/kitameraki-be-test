import { ensureContainersExist, tasksContainer, formSettingsContainer } from "@/database/cosmosClient";
import { Task } from "@/schemas/task.schema";
import { FormSetting } from "@/schemas/form-setting.schema";

export const ORG_ENGINEERING = "11111111-1111-1111-1111-111111111111";
export const ORG_MARKETING = "22222222-2222-2222-2222-222222222222";

export const SEED_TASKS: Task[] = [
  {
    id: "e1000000-0000-0000-0000-000000000001",
    organizationId: ORG_ENGINEERING,
    title: "Setup CI/CD Pipeline",
    description: "Automate build, test, and deployment with GitHub Actions",
    dueDate: "2026-10-20T17:00:00.000Z",
    priority: "high",
    status: "completed",
    tags: ["devops", "ci-cd"],
    customFields: {
      reviewerEmail: "lead@kitameraki.com",
      clientDepartment: "Core Platform",
    },
  },
  {
    id: "e1000000-0000-0000-0000-000000000002",
    organizationId: ORG_ENGINEERING,
    title: "Migrate Cosmos DB to v4 SDK",
    description: "Upgrade client SDK and refactor queries to use parameterized SqlQuerySpec",
    dueDate: "2026-10-25T17:00:00.000Z",
    priority: "medium",
    status: "in-progress",
    tags: ["database", "refactor"],
    customFields: {
      reviewerEmail: "architect@kitameraki.com",
      clientDepartment: "Backend",
    },
  },
  {
    id: "e1000000-0000-0000-0000-000000000003",
    organizationId: ORG_ENGINEERING,
    title: "Build Dynamic Form Builder UI",
    description: "Implement drag-and-drop customizable task form with Fluent UI and dnd-kit",
    dueDate: "2026-10-30T17:00:00.000Z",
    priority: "high",
    status: "todo",
    tags: ["frontend", "fluent-ui", "dnd-kit"],
    customFields: {
      reviewerEmail: "ui-team@kitameraki.com",
      clientDepartment: "Product",
    },
  },
  {
    id: "e1000000-0000-0000-0000-000000000004",
    organizationId: ORG_ENGINEERING,
    title: "Refactor Error Middleware",
    description: "Centralize HTTP error responses and status code mappings",
    dueDate: "2026-10-18T17:00:00.000Z",
    priority: "low",
    status: "completed",
    tags: ["backend", "quality"],
  },
  {
    id: "e1000000-0000-0000-0000-000000000005",
    organizationId: ORG_ENGINEERING,
    title: "Add Pagination to Task Table",
    description: "Support page and limit query params with page navigation buttons",
    dueDate: "2026-10-22T17:00:00.000Z",
    priority: "medium",
    status: "todo",
    tags: ["frontend", "ux"],
  },
  {
    id: "e1000000-0000-0000-0000-000000000006",
    organizationId: ORG_ENGINEERING,
    title: "Write Integration Tests",
    description: "Cover CRUD operations, bulk deletion, and dynamic form settings",
    dueDate: "2026-10-28T17:00:00.000Z",
    priority: "high",
    status: "in-progress",
    tags: ["testing", "qa"],
  },
  {
    id: "e1000000-0000-0000-0000-000000000007",
    organizationId: ORG_ENGINEERING,
    title: "Implement Rate Limiting",
    description: "Protect public endpoints against rapid bursts",
    dueDate: "2026-11-05T17:00:00.000Z",
    priority: "low",
    status: "todo",
    tags: ["security", "network"],
  },
  {
    id: "e1000000-0000-0000-0000-000000000008",
    organizationId: ORG_ENGINEERING,
    title: "Setup Application Telemetry",
    description: "Integrate Azure Application Insights for runtime metrics",
    dueDate: "2026-10-16T17:00:00.000Z",
    priority: "medium",
    status: "completed",
    tags: ["monitoring", "azure"],
  },
  {
    id: "m2000000-0000-0000-0000-000000000001",
    organizationId: ORG_MARKETING,
    title: "Q4 Product Launch Campaign",
    description: "Execute omni-channel release campaign for the new task management app",
    dueDate: "2026-11-01T17:00:00.000Z",
    priority: "high",
    status: "in-progress",
    tags: ["campaign", "launch"],
  },
  {
    id: "m2000000-0000-0000-0000-000000000002",
    organizationId: ORG_MARKETING,
    title: "Write Technical Blog Post",
    description: "Deep dive into reactive workflows and multi-tenant architectures",
    dueDate: "2026-11-10T17:00:00.000Z",
    priority: "medium",
    status: "todo",
    tags: ["content", "blog"],
  },
  {
    id: "m2000000-0000-0000-0000-000000000003",
    organizationId: ORG_MARKETING,
    title: "Design Visual Assets",
    description: "Generate banners, screenshots, and promo graphics",
    dueDate: "2026-10-24T17:00:00.000Z",
    priority: "low",
    status: "completed",
    tags: ["design", "branding"],
  },
  {
    id: "m2000000-0000-0000-0000-000000000004",
    organizationId: ORG_MARKETING,
    title: "Organize User Feedback Sessions",
    description: "Host 5 customer interviews to evaluate the dynamic form customization feature",
    dueDate: "2026-11-15T17:00:00.000Z",
    priority: "medium",
    status: "todo",
    tags: ["research", "customers"],
  },
];

export const SEED_FORM_SETTINGS: FormSetting[] = [
  {
    id: "default",
    organizationId: ORG_ENGINEERING,
    schemaVersion: 1,
    exporter: {
      name: "kitameraki-form-builder",
      version: "1.0.0",
    },
    type: "default",
    components: [
      {
        id: "Field_reviewerEmail",
        key: "reviewerEmail",
        label: "Reviewer Email",
        type: "email",
        layout: { row: 0, column: 1 },
        validate: { required: true },
        description: "Official reviewer contact email",
      },
      {
        id: "Field_targetReleaseDate",
        key: "targetReleaseDate",
        label: "Target Release Date",
        type: "date",
        layout: { row: 0, column: 2 },
        validate: { required: false },
      },
      {
        id: "Field_clientDepartment",
        key: "clientDepartment",
        label: "Client Department",
        type: "text",
        layout: { row: 1, column: 1 },
        validate: { required: false },
      },
      {
        id: "Field_deploymentTimestamp",
        key: "deploymentTimestamp",
        label: "Deployment Timestamp",
        type: "datetime",
        layout: { row: 1, column: 2 },
        validate: { required: false },
      },
    ],
    updatedAt: new Date().toISOString(),
  },
];

export async function seedDatabase(force: boolean = false): Promise<{ tasksCount: number; orgsCount: number }> {
  await ensureContainersExist();

  const countQuery = {
    query: "SELECT VALUE COUNT(1) FROM c",
  };
  const { resources: countResult } = await tasksContainer.items
    .query<number>(countQuery, { maxDegreeOfParallelism: -1 })
    .fetchAll();

  const currentCount = countResult?.[0] ?? 0;

  if (currentCount > 0 && !force) {
    console.log(`[Seed] Database already contains ${currentCount} tasks. Skipping auto-seed.`);
    return { tasksCount: currentCount, orgsCount: 0 };
  }

  console.log(`[Seed] Seeding sample tasks and form settings...`);

  for (const task of SEED_TASKS) {
    await tasksContainer.items.upsert(task);
  }

  for (const formSetting of SEED_FORM_SETTINGS) {
    await formSettingsContainer.items.upsert(formSetting);
  }

  console.log(`[Seed] Successfully seeded ${SEED_TASKS.length} tasks across 2 organizations!`);
  return { tasksCount: SEED_TASKS.length, orgsCount: 2 };
}

if (require.main === module) {
  seedDatabase(true)
    .then((result) => {
      console.log(`Seed script finished successfully:`, result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed script failed:", err);
      process.exit(1);
    });
}
