import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";

// ========================================
// OS Detection
// Since this script only works on POSIX compliant systems
switch (process.platform) {
    case "aix":
    case "darwin":
    case "freebsd":
    case "linux":
    case "openbsd":
    case "sunos":
        break;
    case "win32":
    default:
        console.log("[FATAL] OS Unknown or Not Supported.");
        console.log(
            "This script only works on POSIX compliant systems because it uses symlink."
        );
        process.exit(1);
}

const getFileHash = async (filepath: string) => {
    const fileBuffer = await fs.readFile(filepath);
    const hashResult = crypto.createHash("sha256");
    hashResult.update(fileBuffer);
    return hashResult.digest("hex") as string;
};

/**
 * atomically remove duplicate and create symlink to source file
 * @param srcPath path to source file
 * @param duplicatePath path to duplicated file, would be deleted then a symjlink with same name would be created to poiunt to srcPath
 */
const atomicRemoveAndSymlink = (srcPath: string, duplicatePath: string) => {
    const tempFileDir = `${duplicatePath}.tmp-file-by-node-script`;
    try {
        fsSync.renameSync(duplicatePath, tempFileDir);
    } catch (err) {
        console.log("[ERROR] an error occurred when rename file.");
        console.log(err);
        throw new Error("Execution aborted intentionally.");
        // Abort execution to avoid same error from happening hundreds of times.
    }
    try {
        fsSync.symlinkSync(srcPath, duplicatePath);
    } catch (err) {
        console.log("[ERROR] an error occurred when try to create symlink.");
        console.log("[INFO] try to automatically revert changes...");
        try {
            fsSync.renameSync(tempFileDir, duplicatePath);
        } catch (err) {
            console.log(
                "[ERROR] an error occurred when try to automatically revert changes."
            );
            console.log("[INFO] Exiting");
            throw new Error("Execution aborted intentionally.");
        }
        console.log("[INFO] Reverted file change, exiting.");
        throw new Error("Execution aborted intentionally.");
        // Abort execution to avoid same error from happening hundreds of times.
    }
    try {
        fsSync.unlinkSync(tempFileDir);
    } catch (err) {
        console.log(
            "[WARN] an error occurred when try to delete tmp file, try again..."
        );
        console.log(err);
        try {
            fsSync.unlinkSync(tempFileDir);
            console.log("[WARN] delete tmp file succeed on 2nd attempt.");
        } catch {
            console.log("[WARN] tmp file cannot be deleted. exiting.");
            throw new Error("Execution aborted intentionally.");
            // Abort execution to avoid same error from happening hundreds of times.
        }
    }
};

const dir = process.argv?.[2] as string;
if (dir === "") {
    console.log("[FATAL] directory specified is empty.");
    process.exit(2);
}
// const dir = "./test"; // Test directory

interface UniqueStickerInterface {
    fileRelativePath: string;
    duplicates: Array<string>;
}

const mainFunction = async () => {
    // ========================================
    // List all file and hash them
    let files;
    try {
        files = await fs.readdir(dir);
    } catch (err) {
        console.log("[FATAL] directory specified cannot be accessed.");
        process.exit(2);
    }
    let fileInfo = await Promise.all(
        files.map(async (file) => {
            return {
                fileRelativePath: file,
                fileHash: await getFileHash(`${dir}/${file}`)
            };
        })
    );
    if (fileInfo.length == 0) {
        console.log("[WARN] No file found in specified dir, exiting.");
        return;
    }

    // ========================================
    // Iterate though files to find duplicates
    let uniqueStickers = new Map<string, UniqueStickerInterface>();
    fileInfo.forEach((file) => {
        if (
            fsSync.lstatSync(`${dir}/${file.fileRelativePath}`).isSymbolicLink()
        )
            return; // Skip symbolic link since there is no point to link them again
        let duplicate = uniqueStickers.get(file.fileHash);
        if (duplicate === undefined) {
            uniqueStickers.set(file.fileHash, {
                fileRelativePath: file.fileRelativePath,
                duplicates: [] as Array<string>
            });
            return;
        }
        (duplicate.duplicates as Array<string>).push(file.fileRelativePath);
        uniqueStickers.set(file.fileHash, duplicate);
    });

    // ========================================
    // For each duplicated sticker, create symlink to one instance of it and delete the other duplicated file
    uniqueStickers.forEach((uniqueSticker) => {
        uniqueSticker.duplicates.forEach((duplicateFilePath) => {
            atomicRemoveAndSymlink(
                uniqueSticker.fileRelativePath,
                `${dir}/${duplicateFilePath}`
            );
        });
    });
};
mainFunction();
