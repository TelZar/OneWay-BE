import axios from 'axios';
import fs from 'fs';
import * as SFTP from './sftp.js';
import FILES_PATH_CONFIG, { HOSTS } from '../config/url.js';
import { isEmpty } from './helper.js';
import { insertLogger } from './logger.js';

const uploadToStorageServer = async (req) => {
    try {
        let data;
        const currentYear = new Date().getFullYear();
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        data = await SFTP.uploadFile(
            `${FILES_PATH_CONFIG.UPLOAD_INVOICES}${req.invoiceNumber}.pdf`,
            `${FILES_PATH_CONFIG.STORAGE_SERVER}${currentYear}/${currentMonth}${req.invoiceNumber}.pdf`,
            HOSTS.STORAGE_SERVER, // 10.10.190.110
            process.env.userNameStorageServer,
            process.env.passStorageServer,
        );
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `uploadToStorageServer-> ${err.message}`;
        throw err;
    }
};

const downloadFromStorageServer = async (req, currentYear, currentMonth) => {
    try {
        let data;
        data = await SFTP.getFile(
            `${FILES_PATH_CONFIG.STORAGE_SERVER}${currentYear}/${currentMonth}${req.invoiceNumber}.pdf`,
            `${FILES_PATH_CONFIG.UPLOAD_INVOICES}${req.invoiceNumber}.pdf`, // 10.10.190.110
            process.env.SIGNATURE_HOST,
            process.env.SIGNATURE_USERNAME, // ftpsigned
            process.env.SIGNATURE_PASS,
        );
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `downloadFromStorageServer-> ${err.message}`;
        throw err;
    }
};

const sendToSignatureComsign = async (fileName) => {
    try {
        let res;
        // https://10.10.190.11/signature/signature.svc/json/SignPDF_PIN  - prod
        const data = {
            CertID: 'comda',
            InputFile: fs.readFileSync((`${FILES_PATH_CONFIG.UPLOAD_INVOICES}${fileName}.pdf`)).toString('base64'),
            Page: 1,
            Left: 10,
            Top: 0,
            Width: 100,
            Height: 100,
            Pincode: '123456',
        };
        insertLogger({
            end_point: 'sendToSignatureComsign',
            logTitle: 'sendToSignatureComsign data',
            data,
            type: 'INFO',
            code: 1,
        });
        await axios.post('https://online-dev.comsigntrust.com/signature/signature.svc/json/SignPDF_PIN', data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Postman-Token': '8b0297c2-16cc-0cc2-2ca8-6f5699586b0e',
            },
        })
            .then((response) => {
                res = response.data;
            });
        return res;
    } catch (err) {
        err.message = `sendToSignatureComsign-> ${err.message}`;
        throw err;
    }
};
export {
    uploadToStorageServer,
    downloadFromStorageServer,
    sendToSignatureComsign,
};
