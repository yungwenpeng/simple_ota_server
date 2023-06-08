const fs = require('fs');
const path = require("path");
const AdmZip = require("adm-zip");
const formidable = require('formidable');
const WebSocket = require("ws");

const broadcast = (clients, method, message) => {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            console.log('[SERVER] broadcast(',method,'): ', JSON.stringify(message));
            client.send(JSON.stringify(message), (err) => {
                if(err){
                    console.log(`[SERVER] error:${err}`);
                }
            });
        }
    });
}

async function downloadOtaPackage(req, res) {
    console.log("downloadOtaPackage: ", req.query);
    const filename = req.query.filename;
    if (!filename) {
        console.log("Requested item wasn't found!, ?filename=xxxx is required!");
        return res.status(409).send("?filename=xxxx is required!");
    }

    var dir = process.cwd() + '/ota_files';
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
        console.log('downloading:' + filename);
        res.download(filePath);
    } else {
        return res.status(404).send("Requested item(" + filename + ") wasn't found!");
    }
}

async function getOtaPackageInfo(req, res) {
    console.log("getOtaPackageInfo: ", req.query);
    const filename = req.query.filename;

    if (!filename) {
        console.log("Requested item wasn't found!, ?filename=xxxx is required!");
        return res.status(409).send("?filename=xxxx is required! NB: xxxx is all / filename");
    }

    const dir = './ota_files';

    if (filename === 'all') {
        try {
            const update_info = await readAllFiles(dir);
            console.log('All files processed');
            console.log(update_info);
            return res.status(200).json(update_info);
        } catch (err) {
            console.log('An error occurred:');
            console.log(err);
        }
    } else {
        const filePath = path.join(dir, filename);
        const update_info = await readZipArchive(filePath);
        console.log('update_info:', update_info);
        return res.status(200).send(update_info);
    }
}

async function readAllFiles(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, async (err, files) => {
            if (err) {
                console.log(`Error reading directory: ${err}`);
                reject(err);
                return;
            }

            const update_info = [];

            for (const file of files) {
                if (file === '.keep') {
                    continue;
                }
                try {
                    const filePath = path.join(dir, file);
                    console.log('filePath:', filePath);
                    const result = await readZipArchive(filePath);
                    update_info.push(result);
                } catch (e) {
                    console.log(`Error processing file: ${file}`);
                    console.log(e);
                }
            }

            resolve(update_info);
        });
    });
}

async function readZipArchive(filepath) {
    const filename = path.basename(filepath);
    const info = {};

    try {
        const zip = new AdmZip(filepath);
        const metadataRegex = /metadata$/;
        const propertiesRegex = /payload_properties\.txt$/;
        const binRegex = /payload\.bin$/;

        info['fileName'] = filename;

        for (const zipEntry of zip.getEntries()) {
            const entryName = zipEntry.entryName;
            if (metadataRegex.test(entryName)) {
                console.log('metadata:', entryName);
                const metadata = readFile(zip.readAsText(zipEntry), '=');
                Object.assign(info, metadata);
            }
            if (propertiesRegex.test(entryName)) {
                console.log('payload_properties.txt:', entryName);
                const payloadProperties = readFile(zip.readAsText(zipEntry), '=');
                Object.assign(info, payloadProperties);
            }
            if (binRegex.test(entryName)) {
                console.log('payload.bin:', entryName);
            }
        }
    } catch (e) {
        console.log(`Something went wrong. ${e}`);
    }

    return info;
}

function readFile(data, split_token) {
    const keyValueData = {};
    const lines = data.split('\n');
    lines.forEach(line => {
        const [key, value] = line.split(split_token);
        if (key && value) {
            keyValueData[key.trim()] = value.trim();
        }
    });
    return keyValueData;
}

async function uploadOtaPackage(req, res) {
    console.log("uploadOtaPackage: ", req.params);
    const filename = req.params.filename;

    // Create a Formidable form object
    const form = formidable({
        uploadDir: './ota_files', // Specify the upload directory
        multiples: false, // Allow only single file upload
        keepExtensions: true // Preserve the original file extension
    });
    console.log("formidable: ", form);

    // Parse the uploaded file
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to upload file' });
        }
        //console.log("files: ", files);

        // Check if the file type is a zip
        const uploadedFile = files.file
        console.log("uploadedFile: ", uploadedFile);
        if (!uploadedFile || uploadedFile.mimetype !== 'application/zip') {
            return res.status(400).json({ error: 'Only zip files are allowed' });
        }

        // Move the temporary file to the specified directory and rename it with the provided filename
        const newFilePath = path.join(form.uploadDir, filename);
        fs.rename(uploadedFile.filepath, newFilePath, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save file' });
            }

            const wss = req.app.get('wss');
            const uploadInfo = {
                filename: filename,
                size: uploadedFile.size,
                method: 'upload'
            };
            broadcast(wss.clients, 'upload', uploadInfo)
            return res.json({ message: 'File uploaded successfully' });
        });
    });
}

module.exports = {
    downloadOtaPackage,
    getOtaPackageInfo,
    uploadOtaPackage,
};
