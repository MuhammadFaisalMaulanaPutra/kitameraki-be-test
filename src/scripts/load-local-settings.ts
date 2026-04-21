import fs from "fs";
import path from "path";

export function loadLocalSettings() {
    const filePath = path.resolve(__dirname, "../../local.settings.json");

    if (!fs.existsSync(filePath)) {
        throw new Error("local settings not found");
    }

    const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const values = json.Values;

    for (const key in values) {
        process.env[key] = values[key];
    }
}