import sgMail from '@sendgrid/mail';
import * as fs from 'fs';
import { setContentType } from './fileManage.js';
import { isEmpty } from './helper.js';
import { insertLogger } from './logger.js';

const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};
// Function to validate email addresses
const validateEmails = (emails) => {
    const results = { valids: [], invalids: [] };
    if (typeof emails === 'undefined' || emails.length === 0) return results;
    emails.map((email) => {
        (validateEmail(email)) ? results.valids.push(email) : results.invalids.push(email);
    });
    return results;
};

export const sendEmail = async (from, to, subject, html, copy = { cc: [], bcc: [] }, files = []) => {
    try {
        if (!validateEmail(from)) return -1;
        const res = {};
        const resultTo = validateEmails(to);
        const resultCc = validateEmails(copy.cc);
        const resultBcc = validateEmails(copy.bcc);
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        // stg
        from = 'bya@019.co.il';
        const msg = {
            to: resultTo.valids,
            from,
            subject,
            html,
            cc: resultCc.valids,
            bcc: resultBcc.valids,
        };
        if (files.length !== 0) {
            msg.attachments = files.map((file) => ({
                content: fs.readFileSync(file.path).toString('base64'),
                filename: `${file.name}`,
                type: setContentType(file.type),
                disposition: 'attachment',
            }));
        }
        const invalids = { to: resultTo.invalids, cc: resultCc.invalids, bcc: resultBcc.invalids };
        res.invalids = Object.values(invalids).some((arr) => arr.length > 0) ? invalids : {};
        if (!isEmpty(res.invalids)) return { status: 400, code: 3026, msg: 'No valid email address' };
        const responseEmail = await sgMail.send(msg).then((data) => ({ status: data[0].statusCode }))
            .catch((error) => ({ status: 400, code: 3026, msg: error.message })); // 'Bad email request',
        insertLogger({
            end_point: 'sendEmail responseEmail',
            logTitle: 'responseEmail',
            data: responseEmail,
            type: 'INFO',
            code: 1,
        });
        return responseEmail;
    } catch (err) {
        err.message = `sendEmail-> ${err.message}`;
        throw err;
    }
};

export const emailConstants = {
    adminEmail: 'efi@019mobile.co.il',
};
