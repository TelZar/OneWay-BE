import Client from 'ssh2-sftp-client';
import 'dotenv/config.js';
// import * as fs from 'fs';

const sftp = new Client();

const uploadFile = async (source, destination, host, username, password, port, readyTimeout = 99999) => {
    try {
        await sftp.connect({
            host,
            username,
            password,
            port,
            readyTimeout,
        });

        // Extract the directory path from the destination
        const directoryPath = destination.substring(0, destination.lastIndexOf('/'));

        // Check if the directory exists
        const directoryExists = await sftp.exists(directoryPath);

        // Create the directory if it does not exist
        // if (!directoryExists) {
        //     await sftp.mkdir(directoryPath, true); // recursive option set to true
        // }

        await sftp.put(source, destination);
        await sftp.end();
        return 1;
    } catch (err) {
        await sftp.end();
        return -100;
    }
};

// const DeleteFiles = async () => {
//     // There in no await in foreach loop But I don't care because it is cronJob
//     const directory = FILES_PATH_CONFIG.MONOX;
//     try {
//         await fs.readdir(directory, (error, files) => {
//             if (error) {
//                 console.error(error);
//                 return;
//             }
//             files.forEach((file) => {
//                 const filePath = `${directory}${file}`;
//
//                 // Delete monox customer excel file from bya service
//                 fs.unlink(filePath, (err) => {
//                     if (err) {
//                         return new AppError(400, setFormatValidErr(3010, err.message));// cronJob DeleteFiles Error
//                     }
//                 });
//
//                 // Delete monox customer excel file from oracle service
//                 // It is on the loop for deleting only those files and not other file not connect to monox
//                 try {
//                     sftp.connect({
//                         host: process.env.oracleHostIpDev,
//                         username: process.env.oracleHostUsernameDev,
//                         password: process.env.oracleHostPasswordDev,
//                         port: process.env.oracleHostPortDev,
//                         readyTimeout: 99999,
//                     })
//                         .then(() => sftp.delete(`${FILES_PATH_CONFIG.ORACLE}${file}`).then(() => {}))
//                         .then(() => sftp.end())
//                         .catch((err) => new AppError(400, setFormatValidErr(3010, err.message))); // cronJob DeleteFiles Error
//                 } catch (err) {
//                     return new AppError(400, setFormatValidErr(3010, err.message));// cronJob DeleteFiles Error
//                 }
//             });
//         });
//     } catch (err) {
//         return new AppError(400, setFormatValidErr(3010, err.message));// cronJob DeleteFiles Error
//     }
// };

const getFile = async (remotePath, localPath, host, username, password, port, readyTimeout = 99999) => {
    try {
        await sftp.connect({
            host,
            username,
            password,
            port,
            readyTimeout,
        });

        const file = await sftp.get(remotePath, localPath);
        return file;
    } catch (err) {
        return -100;
    } finally {
        await sftp.end();
    }
};

export {
    uploadFile,
    // DeleteFiles,
    getFile,
};
