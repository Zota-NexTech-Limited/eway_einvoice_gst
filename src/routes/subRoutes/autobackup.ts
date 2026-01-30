import cron from 'node-cron';
import { S3Client, PutObjectCommand, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { spawn } from "child_process";

const s3Two = new S3Client({
    region: "us-east-1",  // Synology requires ANY region (use us-east-1)
    endpoint: "https://in-maa-1.linodeobjects.com",
    forcePathStyle: true,
    credentials: {
        accessKeyId: "RCVP30CK9S7VI1ILIYOC",
        secretAccessKey: "tkwmDPuC2q81S8ywa9W35D3Vy3dmBiPaQ125komR",
    }
});

// Helper function to format folder name
function formatFolderName(name: string): string {
    return name.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Main backup function
async function performBackup(client: any) {
    try {
        /* ---------- fetch store ---------- */
        const storeResult = await client.query(`
            SELECT store_id, company
            FROM store_information_for_user_table
            LIMIT 1
        `);

        if (!storeResult.rows[0]) {
            console.log("Store not found");
            return { status: false, message: "Store not found" };
        }

        const { store_id, company } = storeResult.rows[0];
        const folderName = `${store_id} ${company}`;
        const cleanName = formatFolderName(folderName);

        /* ---------- create folders if not exist ---------- */
        await s3Two.send(new PutObjectCommand({
            Bucket: "db-backup",
            Key: `${cleanName}/`,
            Body: ""
        }));

        await s3Two.send(new PutObjectCommand({
            Bucket: "db-backup",
            Key: `archive-${cleanName}/`,
            Body: ""
        }));

        /* ---------- dump filename ---------- */
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const dumpKey = `${cleanName}/backup_${dateStr}_${timeStr}.dump`;

        /* ---------- pg_dump ---------- */
        const pgDumpPath = "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe";

        const args: string[] = [
            "-h", `${dbHost}`,
            "-p", `${dbPort}`,
            "-U", `${dbUser}`,
            "-Fc",
            `${dbName}`
        ];

        console.log(`Starting DB backup at ${now.toLocaleString()}...`);

        return new Promise((resolve, reject) => {
            const dump = spawn(pgDumpPath, args, {
                env: {
                    ...process.env,
                    PGPASSWORD: `${PGPASSWORD}`
                }
            });

            const chunks: Buffer[] = [];

            dump.stdout.on("data", chunk => {
                chunks.push(chunk);
            });

            dump.stderr.on("data", data => {
                console.error("pg_dump error:", data.toString());
            });

            dump.on("close", async code => {
                if (code !== 0) {
                    console.error("Backup failed with code:", code);
                    reject({ status: false, message: "Backup failed" });
                    return;
                }

                const buffer = Buffer.concat(chunks);

                await s3Two.send(new PutObjectCommand({
                    Bucket: "db-backup",
                    Key: dumpKey,
                    Body: buffer,
                    ContentType: "application/octet-stream",
                    ContentLength: buffer.length
                }));

                console.log(`Backup uploaded: ${dumpKey}`);
                resolve({
                    status: true,
                    message: "Backup uploaded",
                    file: dumpKey
                });
            });

            dump.on("error", (error) => {
                console.error("Spawn error:", error);
                reject({ status: false, message: error.message });
            });
        });

    } catch (error) {
        console.error("Backup error:", error);
        throw error;
    }
}

// Archive old backups
async function archiveOldBackups(client: any) {
    try {
        /* ---------- fetch store ---------- */
        const storeResult = await client.query(`
            SELECT store_id, company
            FROM store_information_for_user_table
            LIMIT 1
        `);

        if (!storeResult.rows[0]) {
            console.log("Store not found for archiving");
            return;
        }

        const { store_id, company } = storeResult.rows[0];
        
        const folderName = `${store_id} ${company}`;
        const cleanName = formatFolderName(folderName);

        const currentFolder = `${cleanName}/`;
        const archiveFolder = `archive-${cleanName}/`;

        console.log(`Archiving backups from ${currentFolder} to ${archiveFolder}...`);

        /* ---------- list all files in current folder ---------- */
        const listCommand = new ListObjectsV2Command({
            Bucket: "db-backup",
            Prefix: currentFolder
        });

        const listResponse = await s3Two.send(listCommand);

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            console.log("No files to archive");
            return;
        }

        /* ---------- filter only .dump files ---------- */
        const dumpFiles = listResponse.Contents.filter(
            item => item.Key && item.Key.endsWith('.dump')
        );

        console.log(`Found ${dumpFiles.length} dump files to archive`);

        /* ---------- move each file to archive ---------- */
        for (const file of dumpFiles) {
            if (!file.Key) continue;

            const fileName = file.Key.split('/').pop();
            const archiveKey = `${archiveFolder}${fileName}`;

            // Copy to archive
            await s3Two.send(new CopyObjectCommand({
                Bucket: "db-backup",
                CopySource: `db-backup/${file.Key}`,
                Key: archiveKey
            }));

            // Delete from current folder
            await s3Two.send(new DeleteObjectCommand({
                Bucket: "db-backup",
                Key: file.Key
            }));

            console.log(`Archived: ${file.Key} -> ${archiveKey}`);
        }

        console.log(`Successfully archived ${dumpFiles.length} files`);

    } catch (error) {
        console.error("Archive error:", error);
        throw error;
    }
}

// Schedule backup jobs
export function scheduleBackupJobs() {
    console.log("Setting up backup schedules...");

    // 10 AM - Archive old backups, then create new backup
    cron.schedule('0 10 * * *', async () => {
        console.log('\n=== Running 10 AM backup job ===');
        await withClient(async (client: any) => {
            try {
                await archiveOldBackups(client);
                await performBackup(client);
            } catch (error) {
                console.error("10 AM backup job failed:", error);
            }
        });
    }, {
        timezone: "Asia/Kolkata" 
    });

    // 3 PM - Only backup
    cron.schedule('0 15 * * *', async () => {
        console.log('\n=== Running 3 PM backup job ===');
        await withClient(async (client: any) => {
            try {
                await performBackup(client);
            } catch (error) {
                console.error("3 PM backup job failed:", error);
            }
        });
    }, {
        timezone: "Asia/Kolkata"
    });

    // 11 PM - Only backup
    cron.schedule('0 23 * * *', async () => {
        console.log('\n=== Running 11 PM backup job ===');
        await withClient(async (client: any) => {
            try {
                await performBackup(client);
            } catch (error) {
                console.error("11 PM backup job failed:", error);
            }
        });
    }, {
        timezone: "Asia/Kolkata"
    });

    console.log("Backup schedules set: 10 AM (with archive), 3 PM, 11 PM");
}

// // Updated route - now just triggers manual backup
// userRoutes.post("/api/create-folder-automatically", async (req: any, res) => {
//     return withClient(async (client: any) => {
//         try {
//             const result = await performBackup(client);
//             res.send(result);
//         } catch (error) {
//             console.error("Manual backup error:", error);
//             res.status(500).send({
//                 status: false,
//                 message: "Backup failed"
//             });
//         }
//     });
// });

// // Manual archive endpoint (optional)
// userRoutes.post("/api/archive-backups", async (req: any, res) => {
//     return withClient(async (client: any) => {
//         try {
//             await archiveOldBackups(client);
//             res.send({
//                 status: true,
//                 message: "Backups archived successfully"
//             });
//         } catch (error) {
//             console.error("Manual archive error:", error);
//             res.status(500).send({
//                 status: false,
//                 message: "Archive failed"
//             });
//         }
//     });
// });