const fs = require('fs');
const path = require("path");
const AdmZip = require("adm-zip");

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

module.exports = {
    getOtaPackageInfo,
};
