import * as uploadFilesModel from '../models/uploadFiles.js';
import { getTemplate, isEmpty } from './helper.js';
import FILES_PATH_CONFIG from '../config/url.js';
import * as SFTP from './sftp.js';
import 'dotenv/config.js';
import mustache from 'mustache';
import { createPdfFromHtml } from './pdf.js';

export const setContentType = (typeFile = 'pdf') => {
    let contentType;
    switch (typeFile) {
    case 'jpg':
    case 'jpeg':
        contentType = 'image/jpeg';
        break;
    case 'png':
        contentType = 'image/png';
        break;
    case 'html':
        contentType = 'text/html';
        break;
    case 'pdf':
        contentType = 'application/pdf';
        break;
    case 'xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
    default:
        contentType = 'application/pdf';
    }
    return contentType;
};

export const setDefinitionsInHeader = (req, res, fileName = 'file') => {
    // Return type: inline - display, attachment - download
    const returnType = req.query['content-disposition'] ? req.query['content-disposition'] : 'inline';

    // Type file
    req.params.fileName = '';

    res.setHeader('Content-Type', setContentType('pdf'/* mime.lookup(req.params.fileName.split('/')[1]) */));
    res.setHeader('Content-Disposition', `${returnType}; filename=${fileName}.pdf`);
};

const uploadFiles = async (req) => {
    try {
        let data;
        data = await SFTP.uploadFile(
            `${FILES_PATH_CONFIG.SFTP}${req.hash}`,
            `${FILES_PATH_CONFIG.ENCRYPTION}${req.hash}`,
            process.env.encryptionHostIpDev,
            process.env.encryptionHostUsernameDev,
            process.env.encryptionHostPasswordDev,
            process.env.encryptionHostPortDev,
        );
        if (data === 1) data = await uploadFilesModel.uploadFilesModel(req);
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data: `${FILES_PATH_CONFIG.SFTP}${req.hash}` };
    } catch (err) {
        err.message = `uploadFiles-> ${err.message}`;
        throw err;
    }
};

const getFiles = async (req, res) => {
    try {
        const invoice = {
            number: 'INV-001',
            date: '2023-03-21',
            billingName: 'John Doe',
            billingAddress: '123 Main St, Anytown USA',
            items: [
                { description: 'Item 1', quantity: 2, price: 10 },
                { description: 'Item 2', quantity: 1, price: 20 },
                { description: 'Item 3', quantity: 3, price: 5 },
            ],
            total: 50,
        };
        const template = await getTemplate(15);
        const html = mustache.render(template[0].content, invoice);
        // await createPdfFromHtml(html, 'ddd');
        const pdf = await createPdfFromHtml(html, 'here3');
        // const html = fs.readFileSync('./upload/invoice.html', 'utf8');
        // const pdf = await createPdfFromHtml(html, 'here3');
        /* const data = await SFTP.getFile(
            `${FILES_PATH_CONFIG.ENCRYPTION}1ddde5f9f3fa9db9276af7d75f787fb3010323130332.pdf`,
            `${FILES_PATH_CONFIG.SFTP}1ddde5f9f3fa9db9276af7d75f787fb3010323130332.pdf`,
            process.env.encryptionHostIpDev,
            process.env.encryptionHostUsernameDev,
            process.env.encryptionHostPasswordDev,
            process.env.encryptionHostPortDev,
        ); */
        // const base64data = data.toString('base64');
        // if (data == null) return { status: 404, code: 3006 };// There are no records

        setDefinitionsInHeader(req, res);
        // const base64Data = data.toString('base64');
        return { status: 200, data: pdf };
    } catch (err) {
        err.message = `getFiles-> ${err.message}`;
        throw err;
    }
};

export {
    uploadFiles,
    getFiles,
};
