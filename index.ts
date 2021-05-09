import fs from "fs/promises";
import crypto from "crypto";

const getFileHash = async (filepath: string) => {
    const fileBuffer = await fs.readFile(filepath);
    const hashResult = crypto.createHash("sha256");
    hashResult.update(fileBuffer);
    return hashResult.digest("hex") as string;
};

(async () => {
    console.log(`f1: ${await getFileHash("./f1.webp")}`);
    console.log(`f2: ${await getFileHash("./f2.webp")}`);
})();
