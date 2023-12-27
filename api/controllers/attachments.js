import fs from 'fs';
import path from 'path';
import mimeTypes from 'mime-types';
import crypto from 'crypto';
import { checkToken } from '../middlewares/checkAuth.js';
import { setDefinitionsInHeader } from '../utils/fileManage.js';
import { getFilePathModel, setFilePathModel } from '../models/attachments.js';
import { sendEmail } from '../utils/email.js';
import { insertLogger } from '../utils/logger.js';
import {
    convertToJSDateFormat, getTemplate, isEmpty,
} from '../utils/helper.js';
import { getFile, uploadFile } from '../utils/sftp.js';
import 'dotenv/config.js';
import { createPdfFromHtml } from '../utils/pdf.js';
import { sendToSignatureComsign } from '../utils/signedInvoices.js';

const getAttachments = async (req, res) => {
    try {
        if (!(req.query.token)) return { status: 400, code: 30000 };

        const tokenValid = await checkToken(req, 'attachments');
        if (tokenValid !== 1) return { status: 400, code: tokenValid.code };

        const filesHash = [];
        filesHash.push(req.params.fileHash);

        const result = await getFilePathModel(filesHash);

        const remotePath = result[0].FILE_PATH;
        const { base, name, ext } = path.parse(remotePath);

        const localPath = remotePath.replace('/jail', './upload');

        // Checking whether the routing is to an encrypted server
        if (remotePath.includes('jail')) {
            // const encryptedFilePath = 1;// dev
            const encryptedFilePath = await getFile(
                remotePath,
                `${localPath}`,
                process.env.encryptionHostIpDev,
                process.env.encryptionHostUsernameDev,
                process.env.encryptionHostPasswordDev,
                process.env.encryptionHostPortDev,
            );

            if (encryptedFilePath === -100) return { status: 404, code: 3033 };// Encryption server error
        }
        console.log(localPath);
        const bufferOfTheFile = await Buffer.from(fs.readFileSync(`${localPath}`));
        let data = {};
        switch (req.query.action) {
        case 'download':
            req.query['content-disposition'] = 'attachment';
        case 'view':
        case 'print':
            data = bufferOfTheFile;
            await setDefinitionsInHeader(req, res, name);
            break;
        case 'info':
            const stats = await fs.promises.stat(`${localPath}`);

            if (!stats.size || stats.size === 0 || !stats.birthtime) return { status: 404, code: 3035 };// File do not exist
            data = {
                fileName: base,
                fileSize: stats.size || null,
                fileMimeType: mimeTypes.lookup(ext) || 'application/octet-stream',
                uploadDate: stats.birthtime ? convertToJSDateFormat(stats.birthtime) : null,
            };

            break;
        default:
            return { status: 400, code: 1008 };// Invalid value
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getAttachments-> ${err.message}`;
        throw err;
    }
};

const send = async (req) => {
    try {
        const { filesHash, sendTo, templateId } = req.body;
        const uniqueFilesHash = [...new Set(filesHash)];

        const result = await getFilePathModel(uniqueFilesHash);

        if (uniqueFilesHash.length > result.length) { return { status: 400, code: 3035 }; } // File do not exist

        const files = [];
        for (const [i, item] of result.entries()) {
            const remotePath = item.FILE_PATH;
            const { base, ext } = path.parse(remotePath);

            const localPath = remotePath.replace('/jail', './upload');

            // Checking whether the routing is to an encrypted server
            if (remotePath.includes('jail')) {
                // const encryptedFilePath = 1;
                const encryptedFilePath = await getFile(
                    remotePath,
                    `${localPath}`,
                    process.env.encryptionHostIpDev,
                    process.env.encryptionHostUsernameDev,
                    process.env.encryptionHostPasswordDev,
                    process.env.encryptionHostPortDev,
                );
                if (encryptedFilePath === -100) return { status: 404, code: 3033 }; // Encryption server error
            }
            // Initialize files[i] if it doesn't exist
            files[i] = files[i] || {};
            files[i].path = `${localPath}`;
            files[i].name = base;
            files[i].type = ext;
        }
        // const template = await getTemplate(templateId.email);
        const template = await getTemplate(parseInt(templateId.email, 10));
        if (isEmpty(template)) return { status: 204, code: 3006 };// There are no records

        const sendEmailRes = await sendEmail(
            'efi@019mobile.co.il',
            sendTo.email,
            template[0].label,
            template[0].content,
            [],
            files,
        );
        if (sendEmailRes < 0) {
            insertLogger({
                end_point: 'getInvoice - send email',
                logTitle: `Bug in send invoice. : ${JSON.stringify(sendEmailRes)}, files : ${filesHash}`,
                type: 'ERROR',
                code: -1,
            });
        }
        return { status: sendEmailRes.status, code: sendEmailRes.code, msg: sendEmailRes.msg };
    } catch (err) {
        err.message = `send-> ${err.message}`;
        throw err;
    }
};

const createFileAndSave = async (obj = {}) => {
    // 1. create file
    // 2. save on local server
    // 3. signature - optional
    // 4. save on DB
    // 5. save on encryption server
    // 6. sand file on mail - optional
    try {
        const {
            templateId, vals, fileName, localPath, encryptionPath, signature, fileType, customerId, subscriberId, email,
        } = obj;

        // validations
        if (templateId === 0
            || !vals
            || !fileName
            || !localPath
            || signature == null || typeof signature !== 'boolean'
            || fileType === 0
            || customerId === 0
        ) return { status: 400, code: 1008, data: obj }; // Invalid value

        let template = await getTemplate(templateId, vals);
        if (template === -1) return { status: 404, data: { templateId, error: 'not exist ' } };

        await createPdfFromHtml(template[0].content, fileName, localPath);

        if (signature) {
            // send file to signature server and save in local server
            const signedInvoices = await sendToSignatureComsign(fileName);
            if (signedInvoices.Result !== 0) {
                insertLogger({
                    end_point: 'createInvoiceForm -  create signed invoice',
                    logTitle: `Bug in create signed invoice. error code : ${signedInvoices.status}, invoice number : ${fileName}`,
                    type: 'ERROR',
                    code: -1,
                });
            }

            // Save signed invoice in local server
            const bufferSignedInvoice = await Buffer.from(signedInvoices.SignedBytes, 'base64');
            await fs.writeFile(`${localPath + fileName}.pdf`, bufferSignedInvoice, 'binary', (err) => {
                if (err) {
                    err.message = `createInvoiceForm-> ${err.message}`;
                    throw err;
                }
            });
        }

        // save file path in DB
        const hash = crypto.createHash('sha256').update(obj.fileName.toString()).digest('hex');

        const fileObj = {
            AGREEMENT_TYPE: fileType,
            CUSTOMER_ID: customerId,
            SUBSCRIBER_ID: subscriberId,
            FILE_PATH: encryptionPath || localPath,
            FILE_NAME: `${fileName}.pdf`,
            FILE_HASH: hash,
            PARTS: 1,
        };
        const result = await setFilePathModel(fileObj);
        if (result !== 1) {
            return {
                status: 400,
                code: 3034,
                data: {
                    error: 'Save file error', fileName: `${fileName}.pdf`, customerId, subscriberId,
                },
            };
        }// Save file error

        // save file in encryption server
        if (encryptionPath) {
            const uploadEncryption = await uploadFile(
                `${localPath + fileName}.pdf`,
                `${encryptionPath + fileName}.pdf`,
                process.env.encryptionHostIpDev,
                process.env.encryptionHostUsernameDev,
                process.env.encryptionHostPasswordDev,
                process.env.encryptionHostPortDev,
            );
            if (uploadEncryption !== 1) return { status: 400, code: 3033, data: { localFilePath: `${localPath + fileName}.pdf`, serverFilePath: `${encryptionPath + fileName}.pdf`, host: process.env.encryptionHostIpDev } };// Encryption server error
        }

        // send on mail
        if (email && (!isEmpty(email) && !isEmpty(email.to))) {
            if (!Array.isArray(email.to)) { return { status: 400, data: { error: 'Must be an array', to: email.to } }; }
            template = await getTemplate(email.templateId);
            if (template === -1) return { status: 404, code: 1012, data: { templateId: email.templateId, error: 'not exist ' } };

            // Sending by email
            const sendEmailRes = await sendEmail(
                'efi@019mobile.co.il',
                email.to,
                template[0].label,
                template[0].content,
                [],
                [{ path: `${localPath}${fileName}.pdf`, name: `${fileName}.pdf`, type: '.pdf' }],
            );
            if (sendEmailRes < 0) {
                insertLogger({
                    end_point: 'createFileAndSave - send email',
                    logTitle: `Bug in send file. : ${JSON.stringify(sendEmailRes)}`,
                    type: 'ERROR',
                    code: -1,
                });
            }
        }

        return { status: 201, hashFile: hash };
    } catch (err) {
        err.message = `createFileAndSave-> ${err.message}`;
        throw err;
    }
};
export {
    getAttachments,
    send,
    createFileAndSave,
};
