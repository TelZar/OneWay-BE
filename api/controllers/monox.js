import moment from 'moment';
import mustache from 'mustache/mustache.js';
import { load as cheerioLoad } from 'cheerio';
import oracledb from 'oracledb';
import {
    getAgreementsCustomerModel,
    getDataCustomerModel,
    getProfessions,
} from '../models/customers.js';
import * as model from '../models/monox.js';
import {
    getAgreementNameBylabel, getAgreementValueBylabel, getTemplate, isEmpty,
} from '../utils/helper.js';
import { generateAccessTokenHash, generateRefreshTokenHash } from '../utils/authentication.js';
import { verifySecretModel } from '../models/auth.js';
import * as SFTP from '../utils/sftp.js';
import FILES_PATH_CONFIG from '../config/url.js';
import { getCodeCountriesJB, sendDetailsForAsocciateModel } from '../models/monox.js';
import { insertLogger } from '../utils/logger.js';
import * as customerController from './customers.js';
import { sendMail } from '../utils/MicrosoftGraph.js';
import dbQuery from '../db/connect.js';

const jbData = async (data) => {
    try {
        const dataAgent = await getDataCustomerModel({ customerId: data.creationUser });
        const countriesJB = await getCodeCountriesJB();
        const codeJB = countriesJB.find((c) => c.ID === data.countryCode).COUNTRY_CODE;
        const codeProfession = await getProfessions(1, await getAgreementValueBylabel(data.agreementsCustData, 'profession'));
        return {
            jerusalemBank: {
                cardData: {
                    cjNumber: data.cj ? data.cj : '',
                    last4Digits: data.creditCardToken ? data.creditCardToken.slice(-4) : '',
                },
                idData: {
                    idType: data.idType ? data.idType : '', // 'IL' national => 1 else => 2
                    idNumber: data.nationalId ? data.nationalId : '',
                    gender: getAgreementValueBylabel(data.agreementsCustData, 'gender'), //*
                    idIssueDate: new Date(data.passportCreationDate).toLocaleDateString('en-GB'), // Id issuance date//
                    dateOfBirth: moment(data.dateOfBirth).format('DD/MM/YYYY'),
                    phoneNumber: data.contactNo ? data.contactNo : '',
                    homePhoneNumber: '',
                    sivug57: '001',
                    harshaaTel: 'Y',
                    harshaaFax: 'Y',
                    tinNumber: getAgreementValueBylabel(data.agreementsCustData, 'tin'),
                    prefferedLanguage: data.langCode ? data.langCode : '', //* NM
                    firstNameHeb: data.firstName2 ? data.firstName2 : '',
                    lastNameHeb: data.secondName2 ? data.secondName2 : '',
                    firstNameEng: data.firstName ? data.firstName : '',
                    lastNameEng: data.secondName ? data.secondName : '',
                    residency: codeJB, // country code of jb
                    employerName: getAgreementNameBylabel(data.agreementsCustData, 'employer'),
                    Occupation: codeProfession[0].BANK_OCC_CODE, // Profession code
                    isUSPerson: 'N',
                    isPEP: 'N',
                    birthCountry: codeJB, // country code of jb
                    IDFileName: `id_${data.nationalId}`,
                    IDFile: data.encoded64File ? data.encoded64File : '', // file encoded
                    // The expected source of funds: 1 - Receiving a salary,2 - Access to credit, 3 self transfer,4 - card abroad
                    FundsOrigin: getAgreementValueBylabel(data.agreementsCustData, 'funds_origin'),
                    // Expected monthly deposit amount: 1 - to 5,000 NIS, 2 - to 10,000 NIS, 3 - to NIS 25,000, 4 - to 50,000 NIS
                    FundsVolume: getAgreementValueBylabel(data.agreementsCustData, 'funds_volume'),
                    // Expected main use of funds An impressive choice: 1 - Transfer to a family abroad, 2 - ATM withdrawals, 3 - Use in businesses
                    FundsUse: getAgreementValueBylabel(data.agreementsCustData, 'funds_use'),
                    // Previous refusal to issue a card for money laundering or terrorist financing: Y - Yes, N - no
                    PreviousDenial: getAgreementValueBylabel(data.agreementsCustData, 'previous_denial'),
                },
                address: {
                    countryHeb: '000',
                    cityHeb: data.city ? data.city : '',
                    streetHeb: data.address ? data.address : '',
                    houseNumHeb: data.house ? data.house : '',
                    zipCodeHeb: data.zipCode ? data.zipCode : '',
                    poBoxHeb: '0',
                    countryEng: '000',
                    cityEng: data.enCity ? data.enCity : '',
                    streetEng: data.en_address ? data.en_address : '',
                    houseNumEng: data.house_number ? data.house_number : '',
                    zipCodeEng: '0',
                    poBoxEng: '0',
                    emailAddress: data.email ? data.email : '',
                },
                agentDetails: {
                    agentId: data.creationUser ? data.creationUser : 0,
                    agentFirstName: dataAgent[0].firstName,
                    agentLastName: dataAgent[0].lastName,
                    agentCellPhone: dataAgent[0].contactNo,
                },
                tariffCode: '26',
                ilMainActivity: 'Y',
                isUpdateContact: data.isUpdateContact ? data.isUpdateContact : 'N',
            },
        };
    } catch (err) {
        err.message = `jbData-> ${err.message}`;
        throw err;
    }
};

const rewireData = function (data) {
    try {
        const email = data.email ? data.email : `${data.contactNo}@customer.to`;// Fake email
        return {
            userDetails: {
                firstName: data.firstName,
                lastName: data.lastName,
                phone: `+972${data.contactNo.substring(1, 10)}`,
                email,
                dateOfBirth: moment(data.dateOfBirth).format('YYYY-MM-DD'),
                origin: 'IL',
                market: data.nationality,
                gender: getAgreementValueBylabel(data.agreementsCustData, 'gender'),
                agreeTerms: true,
                address: {
                    street: data.en_address,
                    city: data.en_city,
                    houseNumber: data.house,
                    zipCode: data.zipCode,
                },
            },
            documentType: data.idType === 1 ? 'national_identity_card' : 'passport', // idType : 1 - IL, 2 - else nation
            documentFront: data.encoded64File, // file encoded
            dec: data.dec,
        };
    } catch (err) {
        err.message = `rewireData-> ${err.message}`;
        throw err;
    }
};

const gmtData = async (data) => {
    try {
        const codeProfession = await getProfessions(2, await getAgreementValueBylabel(data.agreementsCustData, 'profession'));
        return {
            firstName: data.firstName,
            middleName: '',
            lastName: data.secondName,
            gender: getAgreementValueBylabel(data.agreementsCustData, 'gender'),
            occupation: codeProfession[0].GMT_OCC, // // Profession name
            birthDate: moment(data.dateOfBirth).format('DD-MM-YYYY'),
            mobileNumber: `+972${data.contactNo.substring(1, 10)}`,
            birthCountryIso2: data.nationality,
            email: data.email,
            passport: {
                number: data.nationalId,
                nationalityIso2: data.nationality,
                expirationDate: moment(data.passportValidity).format('DD-MM-YYYY'), //*
            },
            address: {
                city: data.cityCode,
                street: data.streetCode,
                house: data.house,
                zipCode: data.zipcode,
            },
            file: data.encoded64File, // file encoded
            dec: data.dec,
        };
    } catch (err) {
        err.message = `gmtData-> ${err.message}`;
        throw err;
    }
};

const encodeFile = async (customerId) => {
    // todo get passport file
    const data = await SFTP.getFile(
        `${FILES_PATH_CONFIG.ENCRYPTION}1ddde5f9f3fa9db9276af7d75f787fb3010323130332.pdf`,
        `${FILES_PATH_CONFIG.SFTP}1ddde5f9f3fa9db9276af7d75f787fb3010323130332.pdf`,
        process.env.encryptionHostIpDev,
        process.env.encryptionHostUsernameDev,
        process.env.encryptionHostPasswordDev,
        process.env.encryptionHostPortDev,
    );
    // todo get Foreign worker identification document file
    const html = `<html lang="HE">
    <head>
    </head>
    <body style="text-align:right; direction:rtl;">
    <img src= passport_path />
      foreign_worker_html
    </body>
    </html>`;
    // todo create pdf

    const base64Data = data.toString('base64');
    return base64Data;
};

export const apiData = async function (customerId) {
    try {
        // const custData = {};
        const custData = await getDataCustomerModel({ customerId });
        custData[0].agreementsCustData = await getAgreementsCustomerModel(customerId);
        custData[0].encoded64File = await encodeFile(616);
        const data = await jbData(custData[0]);
        data.rewire = rewireData(custData[0]);
        data.GMT = await gmtData(custData[0]);
        data.agentId = custData[0].customerId ? custData[0].customerId : '';
        data.retry_flag = custData.retry_flag > 0 ? 1 : 0;
        return data;
    } catch (err) {
        err.message = `apiData-> ${err.message}`;
        throw err;
    }
};

const cardAssociate = async (data) => {
    try {
        const response = {};
        const dataForSend = await apiData(616);
        insertLogger({
            end_point: 'cardAssociate - data for send',
            logTitle: 'data',
            data: dataForSend,
            type: 'INFO',
            code: 1,
        });
        const res = await sendDetailsForAsocciateModel(dataForSend);
        // insertLogger({
        //     end_point: 'cardAssociate - res associate',
        //     logTitle: 'res',
        //     data: res,
        //     type: 'INFO',
        //     code: 1,
        // });
        response.errorForLog = res.error_for_log;
        data.isUpdateContact = 'N';
        response.title = data.isUpdateContact === 'N' ? 'שיוך כרטיס פריפייד נכשל!' : 'תיקון פרטי כרטיס פריפייד עבור בנק ירושלים,נכשל! ';
        // Bank of Jerusalem association failed
        if (res.success === 'n') return { status: 400, code: 3012, data: res.error_for_log };
        response.title = data.retryflag === 'N' ? 'שיוך כרטיס פריפייד בוצע בהצלחה!' : 'תיקון פרטי כרטיס פריפייד עבור בנק ירושלים, בוצע בהצלחה! ';
        if (res.code === 2) {
            if (!res.gmt && !res.rewire) response.title += ' אך רישום לחברות העברת כספים נכשל ';
            if (!res.gmt) response.title += ' אך רישום ל-GMT נכשל ';
            if (!res.rewire) response.title += ' אך רישום ל-REWIRE נכשל ';
        }
        return { status: 200, data: response };
    } catch (err) {
        err.message = `cardAssociate-> ${err.message}`;
        throw err;
    }
};

const verifyC2CTransfer = async (req) => {
    try {
        const res = await model.getUsageByPhoneModel(req);
        if (res.out_status !== 1) return { status: 204, data: {} };
        return { status: 200, data: res };
    } catch (err) {
        err.message = `verifyC2CTransfer-> ${err.message}`;
        throw err;
    }
};

const createToken = async (req, res) => {
    try {
        const verifySecret = await verifySecretModel(req.secert);
        if (verifySecret < 0) return { status: 404, data: {} };
        await generateAccessTokenHash(req, res);
        await generateRefreshTokenHash(req, res);
        return { status: 200, data: {} };
    } catch (err) {
        err.message = `MONOX createToken-> ${err.message}`;
        throw err;
    }
};

const getUsageByPhone = async (req) => {
    try {
        const res = await model.getUsageByPhoneModel(req.phone);
        if (res.out_status !== 1) return { status: 204, data: {} };
        return { status: 200, data: res.v_usage_cursor };
    } catch (err) {
        err.message = `getUsage-> ${err.message}`;
        throw err;
    }
};

const getMonoxMessages = async (req) => {
    try {
        const a = await model.getMonoxMessagesModel(req.body);
        console.log(a);
        return a;
    } catch (err) {
        err.message = `cardAssociate-> ${err.message}`;
        throw err;
    }
};

// const getUsage2 = async (req) => {
//     try {
//         const a = await apiData(616);
//         console.log(a);
//         return a;
//     } catch (err) {
//         err.message = `cardAssociate-> ${err.message}`;
//         throw err;
//     }
// };
// const getUsage1 = async (req) => {
//     try {
//         const a = await apiData(616);
//         console.log(a);
//         return a;
//     } catch (err) {
//         err.message = `cardAssociate-> ${err.message}`;
//         throw err;
//     }
// };

const JerusalemBankCalling = async (req) => {
    try {
        // 1. Basic customer's details
        const basicCustomerDetails = await customerController.getCustomer(3, req.customerId, 'customer_id');
        if (basicCustomerDetails.status !== 200) return basicCustomerDetails;

        const phone = await customerController.getCustomer(4, req.customerId, 'customer_id', 'phone');
        if (phone.status !== 200) return phone;

        const creditCardExpiration = await customerController.getCustomer(8, req.customerId, 'payment_id', 'creditCardExpiration');
        if (creditCardExpiration.status !== 200) return creditCardExpiration;

        const customerAgreements = await customerController.getCustomer(5, req.customerId, 'customer_id');
        if (customerAgreements.status !== 200) return customerAgreements;
        const obj = customerAgreements.data.find((item) => item.agreementType === 10); // employer

        let customerDetails = {
            firstName: basicCustomerDetails.data[0].firstName,
            secondName: basicCustomerDetails.data[0].secondName,
            nationalId: basicCustomerDetails.data[0].nationalId,
            contactNo: basicCustomerDetails.data[0].contactNo,
            cj: phone.data,
            creditCardExpiration: creditCardExpiration.data,
            employer: obj.agreementValue,
        };

        customerDetails = `שם פרטי: ${customerDetails.firstName}
        שם משפחה: ${customerDetails.secondName}
        דרכון/ת"ז: ${customerDetails.nationalId}
        מספר: ${customerDetails.contactNo}
        חשבון בנק: ${customerDetails.cj}
        תוקף כרטיס אשראי: ${customerDetails.creditCardExpiration}
        מעסיק: ${customerDetails.employer}`;

        // 2. Get template //by id
        const template = await getTemplate(req.templateId);
        if (isEmpty(template)) return { status: 204, code: 3006 };// There are no records

        // 3. Build the template using dynamic params
        req.inputs.customerDetails = customerDetails;
        const msg = mustache.render(template[0].content, req.inputs);

        let html = cheerioLoad(msg);
        html = html.html().replace(/\n/g, '<br>');

        // 4. get parent message id
        let messageId;
        if (req.parentId) {
            const sql = 'begin :result := get_customer_email(p_event_id => :p_event_id); end;';
            const bind = { p_event_id: req.parentId };
            messageId = await dbQuery(sql, bind, oracledb.CURSOR);
            messageId = messageId[0].CUSTOMER_EMAIL;
        }

        // 5. Send the mail to Jerusalem bank
        const mail = {
            subject: req.templateLabel, body: html, to: ['oriya@019mobile.co.il'], cc: [], // sysaid_moked_prep@bankjerusalem.co.il
        };
        const data = await sendMail(
            mail,
            messageId,
            `AAMkADc1OTU2OTlmLWVlMzctNGY5YS04YjFiLTk2MWIzZmFhOTlkYgAuAAAAAACd_
                    FtMUhZqQLXZkFL1P2VAAQBANLMU9BSuTIdV3hYHv_N4AAAQvrlrAAA=`, // Jerusalem Bank folder's Id
        );
        return { status: 200, data };
    } catch (err) {
        console.log(err);
        err.message = `JerusalemBankCalling-> ${err.message}`;
        throw err;
    }
};

export {
    createToken,
    cardAssociate,
    verifyC2CTransfer,
    getUsageByPhone,
    getMonoxMessages,
    JerusalemBankCalling,
};
