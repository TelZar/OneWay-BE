import axios from 'axios';
import 'dotenv/config';
import * as https from 'https';
import xml2js from 'xml2js';
import { axiosCreate, timestamp } from './helper.js';

/* Helpers */
const isSuccessCG = (response) => response.ashrait.response.result === '000';
const convertAmountToSmallestUnit = (amount) => { //
    amount = parseFloat(amount).toFixed(2);
    if (amount.indexOf('.') === -1) {
        return `${amount}00`;
    }
    const amounts = amount.split('.');
    const dec = amounts[1];
    if (dec.length === 1) {
        return `${amounts[0] + amounts[1]}0`;
    }
    return amounts[0] + amounts[1];
};

const errorMessagesCG = {
    '001': {
        en: 'Stolen card',
        he: 'כרטיס גנוב.',
    },
    '002': {
        en: 'Blocked card',
        he: 'כרטיס חסום.',
    },
    '004': {
        en: 'Rejected. Possibly no money in account or wrong card number',
        he: 'סירוב. ייתכן ואין כסף בחשבון או שהמספר שגוי.',
    },
    '005': {
        en: 'Fake card',
        he: 'מזוייף, החרם כרטיס.',
    },
    '033': {
        en: 'Wrong card number',
        he: 'מספר הכרטיס לא תקין.',
    },
    '036': {
        en: 'Expired card',
        he: 'כרטיס פג תוקף.',
    },
    '038': {
        en: 'Transaction total is higher than card limit',
        he: 'סכום העיסקה גדול מתקרה לכרטיס.',
    },
    '039': {
        en: 'Invalid Check digit',
        he: 'סיפרת בקורת לא תקינה.',
    },
    313: {
        en: 'The transaction was already cancelled',
        he: 'פעולת זיכוי כבר בוצעה.',
    },
    414: {
        en: 'Card number is too short or too long',
        he: 'מספר הכרטיס קצר או ארוך מדי.',
    },
    101: {
        en: 'No authorization from credit company for clearance',
        he: 'אין אישור מחברת האשראי לסליקה.',
    },
    10000: {
        en: 'Timeout',
        he: 'פג הזמן.',
    },
    10048: {
        en: 'Unknown error',
        he: 'שגיאה לא ברורה.',
    },
    10033: {
        en: 'Shva communication failed',
        he: 'כשלון בתקשורת לשבא.',
    },
    10050: {
        en: 'Double transactions',
        he: 'זוהתה עסקה כפולה.',
    },
    10044: {
        en: 'User aborted transactions',
        he: 'משתמש ביטל את העסקה.',
    },
};
export const getErrorMessageCG = (code, msg, lang = 'en') => {
    console.log('lang = ', lang);
    return errorMessagesCG.code && errorMessagesCG.code.lang ? errorMessagesCG.code.lang : msg;
};

const terminalNumberAlternator = (type, cardNo, second_time = 0) => {
    let terminal_number = '9015740016';
    switch (type) {
    case 1:
        terminal_number = '9015740016';
        // if (cardNo === '1000019870649124') return '9015742013';
        if (
            (cardNo.length !== 15
                    && cardNo.substring(0, 2) !== '27'
                    && cardNo.substring(0, 2) !== '37'
                    && cardNo.substring(0, 1) !== '1')
                || second_time
        ) terminal_number = '9015742013';
        break;
    case 2:
        terminal_number = '9015739012';
        if (
            (cardNo.length !== 15
                    && cardNo.substring(0, 2) !== '27'
                    && cardNo.substring(0, 2) !== '37'
                    && cardNo.substring(0, 1) !== '1')
                || second_time
        ) terminal_number = '9015741011';
        break;
    case 3:
        // Track2
        terminal_number = '9015739012';
        if ((cardNo.substring(0, 2) !== '27' && cardNo.substring(0, 2) !== '37') || second_time) terminal_number = '9015741011';
        break;
    case 4:
        // Just CVV
        terminal_number = '9015743015';
        break;
    case 6:
        // Phisy emv
        terminal_number = '9015738010';
        break;
    case 7:
        // phisy emv
        terminal_number = '9015739012';
        break;
    case 8:
        // SMS verification
        terminal_number = '9019495012';
        break;
    }
    return terminal_number;
};

/* Command: 'doDeal', debit , request token and request for a direct debit
   'cancelDeal' - cancel deal, was not transmitted to SHVA ABS.
   'refundDeal' - refund deal, can be performed using an amount that is equal or less than the original amount.
   'inquireTransactions' - Receiving transaction details.

   transactionType: 'Debit','Credit','RecurringDebit' - used in israeli market only for recurring payments.

   creditType:'RegularCredit','Payments'

   validation:'AutoComm' - a capture request. verifies card locally or in credit company; depends on ceiling ZFL terminal parameters A positive response results in actual settlement,
   'TxnSetup' - request for a secure URL.
   'inquireTransactions' - request for transaction details.
   'Verify' - authorization request only. Available only when the credit card company allows it on the terminal(J5).
   'Token' - used to get a token (cardId).
*/

const requestCG = (details = {}) => {
    const defaultData = {
        command: 'doDeal', transactionType: 'Debit', creditType: 'RegularCredit', validation: 'AutoComm', currencyName: 'ILS', language: 'ENG', terminalNumber: '0880800013', // dev
    };
    const data = { ...defaultData, ...details };
    // const terminalNumber = (data.cardNo.length !== 15 && data.cardNo.substring(0, 2) !== '27' && data.cardNo.substring(0, 2) !== '37' && data.cardNo.charAt(0) !== '1') ? 9015742013
    //     : 9015740016; // prod
    return {
        system: 5,
        command: data.command, // doDeal, cancelDeal, refundDeal,inquireTransactions
        validation: data.validation, // AutoComm, TxnSetup, inquireTransactions, Verify, Token
        mpiValidation: data.mpiValidation ? data.mpiValidation : '', // AutoComm, Token, Verify
        language: data.language,
        terminalNumber: data.terminalNumber,
        cardNo: data.cardNo ? data.cardNo : '',
        cardId: data.cardId ? data.cardId : '',
        cardExpiration: data.cardExpiration,
        total: data.total ? convertAmountToSmallestUnit(data.total) : 100,
        cvv: data.cvv ? data.cvv : '',
        transactionType: data.transactionType, // Debit, Credit, RecurringDebit
        creditType: data.creditType, // RegularCredit, Payments
        currency: data.currencyName ? data.currencyName : 'ILS', // ILS, USD, EUR, GBP - Great Britain Pound, JPY - Japanese Yen
        numberOfPayments: data.numberOfPayments ? data.numberOfPayments : '',
        firstPayment: data.firstPayment ? convertAmountToSmallestUnit(data.firstPayment) : '',
        periodicalPayment: data.periodicalPayment ? convertAmountToSmallestUnit(data.periodicalPayment) : '',
        mpiTransactionId: data.mpiTransactionId ? data.mpiTransactionId : '', // for inquireTransactions, Token value sent in response to Validation = TxnSetup.
        authNumber: data.authNumber ? data.authNumber : '',
        tranId: data.tranId ? data.tranId : '',
        uniqueId: timestamp,
        cgUid: data.cgUid ? data.cgUid : '',
    };
};

const sendToCG = async (request) => {
    // axiosCreate();

    const data = {};
    try {
        await axios.post('https://cg.019mobile.co.il:8997', request, {
            headers: {
                res_type: 'json',
            },
        })
            .then((response) => {
                data.response = response.data;
                data.codeResponse = response.data.ashrait.response.result;
            });
    } catch (err) {
        err.message = `sendToCG-> ${err.message}`;
        throw err;
    }
    return data;
};
/* Phisy terminal */

// Request phisy
const getCurrencyCode = (currency) => {
    switch (currency) {
    case 'ILS':
        currency = 376;
        break;
    case 'USD':
        currency = 840;
        break;
    case 'EUR':
        currency = 978;
        break;
    default:
        currency = 376;
    }
    return currency;
};

const requestCaspit = (details) => {
    const defaultData = {
        TranType: 1, num_of_payments: 0, first_payment: 0, rest_of_payments: 0, currencyName: 'ILS', creditTerms: 1,
    };
    const data = { ...defaultData, ...details };
    // const terminal_id = '9015741'; // prod
    const terminal_id = '0880438'; // dev
    // const term_no = '016';

    // switch (data.agent_id) {
    // case 35835:
    // term_no = '001';
    //     break;
    // case 35990:
    //     term_no = '002';
    //     break;
    // case 37168:
    //     term_no = '003';
    //     break;
    // }

    // Add agorot to shekels
    const total = convertAmountToSmallestUnit(data.total);

    let payments = '';
    if (data.num_of_payments > 0) { // A transactions with several payments
        const first_payment = convertAmountToSmallestUnit(data.first_payment);
        const rest_of_payments = convertAmountToSmallestUnit(data.rest_of_payments);
        payments = `<NoPayments>${data.num_of_payments}</NoPayments>`// Several payments without first payment
            + `<FirstPayment>${first_payment}</FirstPayment>` // Sum of first payment
            + `<NotFirstPayment>${rest_of_payments}</NotFirstPayment>`;// Amount to be paid for the remaining payments
    }
    const TranType = data.TranType === 1 ? 1 : 53;// Transaction type: 1 - debit, 53 - refund

    const xml = `^PTL!00#01925202 
        <Request> 
        <Command>001</Command> 
        <RequestId>${timestamp}</RequestId>
        <TerminalId>${terminal_id}</TerminalId> 
        <TermNo>001</TermNo> 
        <TimeoutInSeconds>90</TimeoutInSeconds> 
        <Mti>100</Mti> 
        <TranType>${TranType}</TranType> 
        <Amount>${total}</Amount> 
        <PanEntryMode>PinPad</PanEntryMode> 
        <Currency>${getCurrencyCode(data.currencyName)}</Currency> 
        <XField>${timestamp}</XField> 
        <CreditTerms>${data.creditTerms}</CreditTerms> 
        <ParameterJ>4</ParameterJ>
        ${payments}
         </Request>`;

    return xml;
};

const urlCaspit = (agentId) => {
    let cgPemvPostUrl = '';
    // switch (agentId) {
    // case 35835:
    //     cgPemvPostUrl = 'https://192.168.101.2:443';
    //     break;
    // case 35990:
    //     cgPemvPostUrl = 'https://192.168.121.2:443';
    //     break;
    // case 37168:
    //     cgPemvPostUrl = 'https://192.168.111.2:443';
    //     break;
    // }
    cgPemvPostUrl = 'https://192.168.152.55:443';// dev
    return cgPemvPostUrl;
};

const sendToCaspit = async (request) => {
    axiosCreate();
    request = request.replace(/\n/g, '');
    let data;
    try {
        await axios.post('https://192.168.152.55'/* urlCaspit(agentId) */, request, {
            headers: {
                'Content-Type': 'text/xml',
                charset: 'utf-8',
            },
            // timeout: 30000, // set a timeout of 10 seconds
            httpsAgent: new https.Agent({ rejectUnauthorized: false }), // allow self-signed SSL certificates
        })
            .then((response) => {
                data = response.data;
            });
        xml2js.parseString(data, (err, result) => {
            if (err) throw err;
            data = result;
        });
        return data;
    } catch (err) {
        return err;
    }
};

export {
    isSuccessCG,
    requestCG,
    sendToCG,
    requestCaspit,
    sendToCaspit,
};
