import * as https from 'https';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import mustache from 'mustache';
import { load as cheerioLoad } from 'cheerio';
import oracledb from 'oracledb';
import { axiosCreate, getTemplate, isEmpty } from '../utils/helper.js';
import { moveEmailToFolder, sendMail } from '../utils/MicrosoftGraph.js';
import { getCustomerModel } from './customers.js';
import { addCallSummary } from './activities.js';
import dbQuery from '../db/connect.js';

const monoxGetBalance = async (data) => {
    // file:///Q:/HLD/JerusalemBank/Monox/MonoxAPI%201.6.pdf 8.BNCGetBalance

    const { cjNumber, last4Digits, agentID } = data;
    let result;
    try {
        const accessToken = jwt.sign(
            { cjNumber, last4Digits, agentID },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '60m' },
        );

        const agent = new https.Agent({
            rejectUnauthorized: false,
        });

        const response = await axios.post(
            process.env.JERUSALEM_BANK_POST_GET_BALANCE,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                httpsAgent: agent,
            },
        ).catch((e) => {
            console.log(e.message);
        });

        let operator;
        const { availableAmount } = response.data.Response.accountDetails;

        if (availableAmount.substring(0, 1) === 'D') operator = '-';
        else if (availableAmount.substring(0, 1) === 'C') operator = '+'; // '' ??
        const number = parseInt(availableAmount.substring(2), 10);

        result = `${operator}${number}`;
    } catch (err) {
        err.message = `monoxGetBalance-> ${err.message}`;
        // throw err;
        result = ' לא ידוע';
    }
    return result;
};

const transferBalanceToCardModel = async (req, creditCard) => {
    try {
        // 1. Get previous cj
        const previous_cj = 54321;

        // Get more customer's details
        const customerDetails = await getCustomerModel(3, req.body.national_id, 'national_id');
        const customerName = customerDetails[0].firstName;
        const customerPhone = customerDetails[0].contactNo;

        // 2. Get customer balance
        const dataGetBalance = { cjNumber: req.body.cj, last4Digits: creditCard.toString().slice(-4), agentID: req.body.agentID || 407 };
        const balance = await monoxGetBalance(dataGetBalance);

        // 3. Get html mail template
        const template = await getTemplate(5); // transferBalance
        if (isEmpty(template)) return { status: 204, code: 3006 };// There are no records

        // 4.Building the mail
        const vals = {
            previous_cj, cj_number: req.body.cj, credit_Balance: balance, agent_name: customerName, agent_phone: customerPhone,
        };
        const msg = mustache.render(template[0].content, vals);

        // 5. Send the mail to Jerusalem bank
        const mail = {
            subject: 'העברת יתרות בין כרטיסים - 019Mobile', body: msg, to: ['oriya@019mobile.co.il'], cc: [],
        };
        // const mail = {
        //     subject: 'העברת יתרות בין כרטיסים - 019Mobile', body: template, to: 'sysaid_moked_prep@bankjerusalem.co.il', cc: 'info@monox.co.il, itay@019mobile.co.il',
        // };

        const data = await sendMail(mail);
        return data;
    } catch (err) {
        err.message = `transferBalanceToCardModel-> ${err.message}`;
        throw (err);
    }
};

const getMonoxMailsModel = async (mails) => {
    try {
        for (const mail of mails) {
            if (mail.from === 'oriya@019mobile.co.il') { // sysaid@bankjerusalem.co.il
                let action = 1796; // פתיחת קריאה מבנק ירושלים
                if (mail.msg.includes('פתרון: פעיל')) action = 1795; // פתרון קריאה מבנק ירושלים

                // The HTML string
                const htmlString = mail.msg;

                // Load the HTML string into a Cheerio instance
                const html = cheerioLoad(htmlString);

                if (!html) continue;
                const callingNumber = html('p.MsoNormal').text().match(/מספר קריאה: \s*(\w+)/)[1];
                if (!callingNumber) continue;

                let nationalId = html('p.MsoNormal').text().match(/ת"ז : \s*(\w+)/)[1];
                nationalId = 244567741;
                if (!nationalId) continue;

                const customerDetails = await getCustomerModel(3, nationalId, 'national_id');
                if (!customerDetails) continue;

                const entityID = customerDetails[0].custPkId;
                if (!entityID) continue;

                const newMessageId = await moveEmailToFolder(
                    mail.messageId,
                    `AAMkADc1OTU2OTlmLWVlMzctNGY5YS04YjFiLTk2MWIzZmFhOTlkYgAuAAAAAACd_
                    FtMUhZqQLXZkFL1P2VAAQBANLMU9BSuTIdV3hYHv_N4AAAQvrlrAAA=`, // Jerusalem Bank folder's Id
                );

                const activityData = { // agentId - Change to Jerusalem Bank's agent id from customers
                    agentId: 891, // Jerusalem Bank
                    type: 2, // Customers
                    entityID,
                    action,
                    remark: callingNumber,
                    ownerId: 21, // Monox
                    message_id: newMessageId,
                };

                const data = await addCallSummary(activityData);
                return { status: 201, data };
            }
        }
    } catch (err) {
        err.message = `getMonoxMailsModel-> ${err.message}`;
        throw err;
    }
};

const sendDetailsForAsocciateModel = async (data) => {
    axiosCreate();
    try {
        await axios.post(/* process.env.associateCardApi */'https://10.20.110.4:8499/PRPAPIAssociateCardToClient', data, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
            },
            httpsAgent: new https.Agent({
                // cert: fs.readFileSync('/etc/pki/tls/certs/monox.pem'),
                // key: fs.readFileSync('/etc/pki/tls/certs/monoxmyPrivateKey.pem'),
                // passphrase: 'iV0iQ4qE6bT5cT3t',
                rejectUnauthorized: false,
            }),
        })
            .then((response) => {
                console.log(response.data);
                data = response.data;
            });
    } catch (err) {
        return err;
    }
    return data;
};

const getCodeCountriesJB = async () => {
    try {
        const sql = 'begin :result := get_countries_monox; end;';
        const bind = {};
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return resultDB;
    } catch (err) {
        err.message = `getCodeCountriesJB-> ${err.message}`;
        throw (err);
    }
};

export {
    transferBalanceToCardModel,
    getMonoxMailsModel,
    sendDetailsForAsocciateModel,
    getCodeCountriesJB,
};
