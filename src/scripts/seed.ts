import { User } from "../domain/user";
import { hashPassword } from "../utils/util";
import { loadLocalSettings } from "./load-local-settings";

async function seed() {
    loadLocalSettings()
    const organizationId = "org-123";
    const password = "password";
    const hashedPassword = await hashPassword(password);

    const user = User.create({
        email: "demo@email.com",
        password: hashedPassword,
        organizationId
    });

    const { containers } = await import("../utils/cosmos-client");
    await containers.users.items.upsert(user);

    console.log("Seeding user completed");
    console.log(`email: ${user.email}, password: ${password}`);
}

seed().catch(err => {
    console.error("Failed to seed user:", err);
});