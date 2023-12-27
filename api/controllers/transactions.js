import * as fs from 'fs';
import jwt from 'jsonwebtoken';
import {
    getErrorMessageCG, requestCaspit, requestCG, sendToCaspit, sendToCG,
} from '../utils/cg.js';
import { insertLogger } from '../utils/logger.js';
import * as model from '../models/transactions.js';
import {
    createInvoiceModel2,
    getCurrencyRateModel,
    getDataForInvoiceModel, getInternalRefByGeneralRefModel, getTransactionProductsModel,
    insertPaymentDetailsModel,
} from '../models/transactions.js';
import {
    camelCaseKeys, isEmpty, convertToJSDateFormat,
} from '../utils/helper.js';
import { sendEmail } from '../utils/email.js';
import FILES_PATH_CONFIG from '../config/url.js';
import { setDefinitionsInHeader } from '../utils/fileManage.js';
import { getCustomerModel, getPaymentModel, getSubscriberIdByPhoneModel } from '../models/customers.js';
import { stockModify, updateOrderByTransactionId, checkSimTypeOrder } from './orders.js';
import { getEsimNumber, getRoamingPin, updateSimInDB } from './cellularActions.js';
import * as customerController from './customers.js';
import { getSimDetailsModel, setImsiInHLRModel } from '../models/cellularActions.js';
import { setFormatValidErr } from '../utils/error.js';
import { addActivity } from './activities.js';
import { createFileAndSave } from './attachments.js';
import { getProductModel } from '../models/products.js';

const getErrorObj = async (code, productId, phoneNumber, subscriberId) => {
    try {
        let result = {};
        if (code > 0) {
            const error = setFormatValidErr(code, { title: 'error' });
            result = {
                productId,
                success: false,
                error: error.error,
                phoneNumber: phoneNumber.length === 9 ? `0${phoneNumber}` : phoneNumber,
                subscriberId,
            };
        } else {
            result = {
                productId,
                success: true,
                error: false,
                phoneNumber: phoneNumber.length === 9 ? `0${phoneNumber}` : phoneNumber,
                subscriberId,
            };
        }
        return result;
    } catch (err) {
        err.message = `getErrorObj-> ${err.message}`;
        throw err;
    }
};

// Get cardId by send credit card
const getTokenForCard = async (details) => {
    try {
        const res = {};
        const data = details;
        data.total = 1;
        data.validation = 'Token';
        const request = await requestCG(data);
        insertLogger({
            end_point: 'getTokenForCard - request',
            logTitle: 'request',
            data: request,
            type: 'INFO',
            code: 1,
        });
        const resCG = await sendToCG(request);
        insertLogger({
            end_point: 'getTokenForCard - response',
            logTitle: 'response',
            data: resCG.response,
            type: 'INFO',
            code: 1,
        });
        if (resCG.codeResponse !== '000') {
            res.status = false;
            res.msgCG = await getErrorMessageCG(resCG.codeResponse, resCG.response.ashrait.response.userMessage);
        } else {
            res.status = true;
            res.cardId = resCG.response.ashrait.response.doDeal.cardId;
        }
        return { status: 200, data: res };
    } catch (err) {
        err.message = `getTokenForCard-> ${err.message}`;
        throw err;
    }
};
// Refund

const refundByCard = async (details) => {
    try {
        const res = {};
        const data = details;
        data.command = 'refundDeal';
        const request = requestCG(data);
        insertLogger({
            end_point: 'refundByCard - request',
            logTitle: 'request',
            data: request,
            type: 'INFO',
            code: 1,
        });
        const resCG = await sendToCG(request);
        insertLogger({
            end_point: 'refundByCard - response',
            logTitle: 'response',
            data: resCG.response,
            type: 'INFO',
            code: 1,
        });
        if (resCG.codeResponse !== '000') {
            res.status = false;
            res.msgCg = getErrorMessageCG(resCG.response.ashrait.response.result, resCG.response.ashrait.response.userMessage);
            data.success = 0;
        } else {
            res.status = true;
            data.success = 1;
        }
        data.type = 1;
        data.subType = 'Refund';
        data.response = resCG.response.ashrait;
        data.terminalNumber = resCG.response.ashrait.response.refundDeal.terminalNumber;
        data.cardId = resCG.response.ashrait.response.refundDeal.cardId || details.cardId;
        data.last4Digits = (details.cardNo || details.cardId).toString().slice(-4);

        res.paymentDetailsId = await insertPaymentDetailsModel(data);
        return res;
    } catch (err) {
        err.message = `refundByCard-> ${err.message}`;
        throw err;
    }
};
// Debit regular (one payment or several payments)
/*
example for dev
{
    "terminalNumber": "0880800013",
    "cardNo": "5100460000397335",
    "cardExpiration": "1123",
    "total": "20000",
    "debit":1
}
*/

const debitByCard = async (data) => {
    try {
        const res = {};
        const request = requestCG(data);
        insertLogger({
            end_point: 'debitByCard - request',
            logTitle: 'request',
            data: request,
            type: 'INFO',
            code: 1,
        });
        const resCG = await sendToCG(request);
        insertLogger({
            end_point: 'debitByCard - response',
            logTitle: 'response',
            data: resCG.response,
            type: 'INFO',
            code: 1,
        });
        if (resCG.codeResponse !== '000') {
            res.status = false;
            res.msgCg = getErrorMessageCG(resCG.codeResponse, resCG.response.ashrait.response.userMessage);
            data.success = 0;
        } else {
            res.status = true;
            data.success = 1;
            data.tranId = resCG.response.ashrait.response.tranId;
        }
        data.type = 1;
        data.subType = 'Debit';
        data.response = resCG.response;
        data.terminalNumber = resCG.response.ashrait.response.doDeal.terminalNumber;
        data.cardId = resCG.response.ashrait.response.doDeal.cardId;
        data.last4Digits = (data.cardNo || data.cardId).toString().slice(-4);

        res.last4Digits = data.last4Digits;
        res.paymentDetailsId = await insertPaymentDetailsModel(data);
        return res;
    } catch (err) {
        err.message = `debitByCard-> ${err.message}`;
        throw err;
    }
};

/*
* initPaymentDetailsObject
    * input     resCG: response from physical terminal, res: response object from debitByPhisyTerminal, data: from debitByPhisyTerminal
    * output    data - values for db
* */
function initPaymentDetailsObject(resCG, res, data) {
    data.type = 1;
    data.subType = 'Debit';
    data.response = resCG;
    // eslint-disable-next-line prefer-destructuring
    data.terminalNumber = resCG.EMV_Output.TerminalId[0];
}
/*
* readPhysicalTerminalResponse
    * input     resCG: response from physical terminal, res: response object from debitByPhisyTerminal
    * output    res.status - true (resCG.EMV_Output.ResultCode === 0) / false (otherwise)
* */
function readPhysicalTerminalResponse(resCG, res) {
    if (resCG && typeof resCG.EMV_Output === 'object' && resCG.EMV_Output.ResultCode) {
        const ResultCodeArray = resCG.EMV_Output.ResultCode;
        if (Array.isArray(ResultCodeArray) && ResultCodeArray.length > 0 && !Number.isNaN(Number(ResultCodeArray[0])) && parseInt(ResultCodeArray[0], 10) === 0) {
            res.status = true;
        } else {
            const ResultCode = Array.isArray(ResultCodeArray) && ResultCodeArray.length > 0 ? ResultCodeArray[0] : ResultCodeArray;
            res.status = false;
            res.msgCG = ResultCode;
        }
    } else {
        res.status = false;
    }

    return res.status;
}

// Payment by physical terminal
const debitByPhisyTerminal = async (details) => {
    try {
        const res = {};
        const data = details;
        const request = requestCaspit(data);
        insertLogger({
            end_point: 'debitByPhisyTerminal - request',
            logTitle: 'request',
            data: request,
            type: 'INFO',
            code: 1,
        });
        const resCG = await sendToCaspit(request);
        // console.log({ resCG: JSON.stringify(resCG) });
        insertLogger({
            end_point: 'debitByPhisyTerminal - response',
            logTitle: 'response',
            data: resCG,
            type: 'INFO',
            code: 1,
        });
        data.success = readPhysicalTerminalResponse(resCG, res) ? 1 : 0;
        initPaymentDetailsObject(resCG, res, data);
        res.paymentDetailsId = await insertPaymentDetailsModel(data);
        return res;
    } catch (err) {
        err.message = `debitByCard-> ${err.message}`;
        throw err;
    }
};
// Receiving data for recurring debit
const registerToRecurringDebit = async (req) => { // Need: terminalNumber, cardNo, cardExpiration
    try {
        const res = {};
        const data = req.body;
        data.total = 1;
        data.validation = 'Verify';
        data.transactionType = 'RecurringDebit';
        const request = requestCG(data);
        insertLogger({
            end_point: 'registerToRecurringDebit - request',
            logTitle: 'request',
            data: request,
            type: 'INFO',
            code: 1,
        });
        const resCG = await sendToCG(request);
        insertLogger({
            end_point: 'registerToRecurringDebit - response',
            logTitle: 'response',
            data: resCG.response,
            type: 'INFO',
            code: 1,
        });

        if (resCG.codeResponse !== '000') {
            res.status = false;
            res.msgCG = getErrorMessageCG(resCG.codeResponse, resCG.response.ashrait.response.userMessage);
        } else {
            res.status = true;
            res.authNumber = resCG.response.ashrait.response.doDeal.authNumber;
            res.cardId = resCG.response.ashrait.response.doDeal.cardId;
            res.tranId = resCG.response.ashrait.response.tranId;
        }
        return { status: 200, data: resCG };
    } catch (err) {
        err.message = `registerToRecurringDebit-> ${err.message}`;
        throw err;
    }
};

const getCgCurrencyName = (codeCurrency) => {
    let currency;
    switch (parseInt(codeCurrency, 10)) {
    case 1:
        currency = 'USD';
        break;
    case 2:
        currency = 'EUR';
        break;
    case 3:
        currency = 'ILS';
        break;
    default:
        currency = 'ILS';
        break;
    }
    return currency;
};

const creditCard = async (data = {}) => {
    try {
        data.currencyName = getCgCurrencyName(data.currency);

        let response;
        switch (data.method) {
        case 1: // Debit regular (one payment or several payments)
            response = await debitByCard(data);
            break;
        case 2:// Refund deal
            response = await refundByCard(data);
            break;
        case 3:// get token (card - Id)
            response = await getTokenForCard(data.details);
            break;
        case 4: // Getting details for a standing order
            response = await registerToRecurringDebit(data.details);
            break;
        case 5: // debit By phisy terminal (one payment or several payments)
            response = await debitByPhisyTerminal(data);
            break;
        }
        return response;
    } catch (err) {
        err.message = `creditCard-> ${err.message}`;
        throw err;
    }
};

const cash = async () => {

};

const checkCredit = async (customerId, walletCategory, amount) => {
    try {
        const data = await model.checkCreditModel(customerId, walletCategory, amount);
        if (data.v_status < 0) return { status: 500, code: data.v_status };
        if (data.v_status) return { status: 200 };
        return { status: 400, code: 3013, msg: `no credit = ${data.v_exceeded_amount}` };
    } catch (err) {
        err.message = `checkCredit-> ${err.message}`;
        throw err;
    }
};

const methodPayTransaction = async (obj) => {
    try {
        let payId;
        switch (obj.paymentType) {
        case 1:// cash
            return true;
            // break;
        case 2:
            payId = await creditCard(obj);
            break;
        case 3:
            payId = await check();
            break;
        case 4:
            payId = await directDebit();
            break;
        case 5:// Bank transfer
            payId = await bankTransfer();
            break;
        case 6:// Bank payment
            payId = await bankPayment();
            break;
        case 7:// PayPal payment
            payId = await payPal();
            break;
        }
        return payId;
    } catch (err) {
        err.message = `payTransaction-> ${err.message}`;
        throw err;
    }
};

const getSumPaymentContentInNIS = (content) => {
    try {
        const sum = content
            .map((payment) => payment.AMOUNT * payment.RATE)
            .reduce((total, amount) => total + amount, 0);
        return parseFloat(sum.toFixed(2));
    } catch (err) {
        err.message = `getSumPaymentContentInNIS-> ${err.message}`;
        throw err;
    }
};

const convertAmountForCurrency = async (nisAmount, currency) => {
    const amountCurrency = (nisAmount / await getCurrencyRateModel(currency));
    return amountCurrency;
};

const payObjFormat = async (req, nisAmount) => ({
    ACTION_CUSTOMER_ID: req.body.customerIdUserCashbox,
    CUSTOMER_ID: req.body.customerId,
    METHOD_TYPE: req.body.methodType ? req.body.methodType : 0,
    CURRENCY: 3,
    AMOUNT: nisAmount,
    REASON_ID: req.body.reasonId ? req.body.reasonId : 0,
    FREE_TEXT: req.body.freeText ? req.body.freeText : '',
    WALLET: req.body.wallet ? req.body.wallet.map((item) => ({
        WALLET_CATEGORY: item.walletCategory,
        AMOUNT: item.amount,
    })) : [],
    PAYMENT_CONTENT: await Promise.all(req.body.paymentContent.map(async (item) => ({
        METHOD_TYPE: item.methodType,
        AMOUNT: item.amount ? item.amount : await convertAmountForCurrency(nisAmount, item.currency),
        CURRENCY: item.currency || 3,
        RATE: (await getCurrencyRateModel(item.currency)),
    }))),
    PRODUCT: req.body.product ? req.body.product.map((item) => ({
        PRODUCT_ID: item.productId, SERIAL_NUMBER: item.serialNumber, AMOUNT: item.amount,
    })) : [],
});

const invoiceDetails = (data) => {
    const arrOfObjects = data.wallet.map((item) => ({
        CUSTOMER_ID: data.customerId,
        SUBSCRIBER_ID: item.subscriberNum,
        PRODUCT_AMOUNT: 1,
        BILL_PERIOD_FROM: null,
        BILL_PERIOD_TO: null,
        PRODUCT_ID: item.productId,
        RATE: 1,
        VALID_DAYS: 30,
        CHARGE: item.amount,
        CHARGE_VAT: item.duty === 1 ? parseFloat((item.amount - (item.amount * 100) / 117).toFixed(2)) : 0,
        CREATION_USER: 'tmp-bya',
        CURRENCY_TYPE: parseInt(item.currency, 10),
        DISCOUNT: /* item.discount */0,

    }));
    return arrOfObjects;
};

// Create invoice DB
const createInvoice = async (req, sourceReference, invoiceType, saleData = {}, payData = {}) => {
    try {
        // Insert to invoices table and return number invoice
        saleData.customerId = req.body.customerId;
        // Get method payment type if There are several types return 20
        const methodType = payData.PAYMENT_CONTENT ? [...new Set(payData.PAYMENT_CONTENT.map((item) => item.METHOD_TYPE))].length > 1 ? 20 : payData.PAYMENT_CONTENT[0].METHOD_TYPE : 0;
        // const invoiceNumber = await createInvoiceModel(req.body.customerIdUser, req.body.customerId, 7, invoiceDetails(saleData), invoiceType, saleData.currency, sourceReference);
        const invoiceNumber = await createInvoiceModel2(req.body.customerIdUser, req.body.customerId, methodType, 7, invoiceDetails(saleData), invoiceType, saleData.currency, sourceReference);
        // if (invoiceNumber < 0) {
        //     insertLogger({
        //         end_point: 'createInvoice - create invoice',
        //         logTitle: `Bug in create invoice. createInvoice: ${sourceReference},code: ${invoiceNumber}`,
        //         type: 'ERROR',
        //         code: -1,
        //     });
        // }
        return invoiceNumber;
    } catch (err) {
        err.message = `createInvoice-> ${err.message}`;
        throw err;
    }
};
const createFile = async (data = []) => {
    try {
        // validations
        if (data && isEmpty(data)) {
            insertLogger({
                end_point: 'createFile - validations  ',
                logTitle: ' error code : 1008 - Invalid value',
                type: 'ERROR',
                data: { data },
                code: -1,
            });
            return { status: 400, code: 1008 }; // Invalid value
        }

        const promises = [];
        for (const key in data) {
            const item = data[key];

            const obj = {
                templateId: item.templateId || 0,
                vals: item.vals || null,
                fileName: item.fileName || null,
                localPath: item.localPath || null,
                encryptionPath: item.encryptionPath || null,
                signature: item.signature || false,
                fileType: item.fileType || 0,
                customerId: item.customerId || 0,
                subscriberId: item.subscriberId || null,
                email: item.email || {},
            };
            promises.push(createFileAndSave(obj));
        }
        const results = await Promise.all(promises);

        for (const errorResult of results) {
            if (errorResult.status !== 201) {
                insertLogger({
                    end_point: 'createFile -  createFileAndSave',
                    logTitle: ` error code : ${errorResult.code}`,
                    type: 'ERROR',
                    data: { errorResult },
                    code: -1,
                });
            }
        }

        return { status: 201, listHashFile: results };
    } catch (err) {
        err.message = `createFile-> ${err.message}`;
        throw err;
    }
};

// Create invoice form, signed invoice,save file path in DB,save file in encryption server, send email to customer
const createInvoiceForm = async (req, sourceReference, saleData, invoiceNumber, payData, overpayment, invoiceType = 1) => {
    try {
        invoiceNumber = parseInt(invoiceNumber, 10);
        insertLogger({
            end_point: 'createInvoiceForm',
            logTitle: 'createInvoiceForm invoiceNumber',
            data: invoiceNumber,
            type: 'INFO',
            code: 1,
        });
        // Create invoice form and save in local server
        const nameInvoice = `invoice_${invoiceNumber}`;
        saleData.invoiceNumber = invoiceNumber;
        saleData.overpayment = overpayment;
        saleData.roundedOverpayment = (Math.round(overpayment / 0.10) * 0.10).toFixed(2);
        saleData.paymentContent = payData.PAYMENT_CONTENT ? camelCaseKeys(payData.PAYMENT_CONTENT) : [];
        saleData.invoiceType = invoiceType;
        saleData.paymentContent = saleData.paymentContent ? saleData.paymentContent.map(({ amount, rate, ...rest }) => ({
            ...rest,
            amount: amount.toFixed(2),
            rate: rate.toFixed(4),
        })) : [];

        // const templateByLangUser = req.body.currency === 1 ? 20 /* eng */ : 18/* heb */;
        const templateByLangUser = 18/* heb */;

        const data = [{
            vals: saleData,
            templateId: templateByLangUser,
            signature: true,
            fileName: nameInvoice,
            fileType: 1,
            email: saleData.email ? { templateId: 30, to: [saleData.email] } : {},
            localPath: FILES_PATH_CONFIG.UPLOAD_INVOICES,
            encryptionPath: `${FILES_PATH_CONFIG.ENCRYPTION_SERVER_INVOICES}`,
            subscriberId: saleData.wallet[0].subscriberNum,
            customerId: payData.CUSTOMER_ID,
        }];

        createFile(data);

        return saleData;
    } catch (err) {
        err.message = `createInvoiceForm-> ${err.message}`;
        throw err;
    }
};
// Division of payments so that the parts are a whole amount
const dividePayment = (paymentAmount, numberOfPayments) => {
    const basePayment = Math.floor(paymentAmount / numberOfPayments);
    const remainder = paymentAmount % numberOfPayments;
    const payments = Array.from({ length: numberOfPayments }, (_, index) => (index === 0 ? basePayment + remainder : basePayment));

    return payments;
};

const creditCardObject = async (paymentContent, customerDetails, amount) => {
    let cardDetails = {};

    const { terminalDevice } = paymentContent.creditCardDetails;
    if (!terminalDevice) {
        const cardNo = paymentContent.creditCardDetails && paymentContent.creditCardDetails.creditCardNumber
            ? paymentContent.creditCardDetails.creditCardNumber : 0;
        if (!cardNo) {
            const paymentDetails = await getPaymentModel(customerDetails, null, paymentContent.creditCardDetails.paymentId);
            cardDetails = {
                cardId: paymentDetails[0].CREDIT_CARD_TOKEN,
                cardExpiration: paymentDetails[0].CREDIT_CARD_EXPIRATION,
            };
        } else {
            cardDetails = {
                cardNo: paymentContent.creditCardDetails.creditCardNumber,
                cardExpiration: paymentContent.creditCardDetails.cardValidity,
            };
        }
    }
    cardDetails.total = amount;
    cardDetails.method = terminalDevice ? 5 /* Phisy terminal */: 1; // Regular debit
    cardDetails.currency = paymentContent.currency;

    const { amountPayments } = paymentContent;
    if (amountPayments > 1) {
        cardDetails.creditType = 'Payments';
        cardDetails.numberOfPayments = amountPayments - 1;
        const divided = dividePayment(amount, amountPayments);
        cardDetails.firstPayment = divided[0];
        cardDetails.periodicalPayment = divided[1];
    }
    return cardDetails;
};

const createReceipt = async (saleData) => {
    try {
        const currentDate_format_D_H_m_s = convertToJSDateFormat(new Date(), 'D-H-m-s');
        const receptionDetails = [];
        receptionDetails[0] = {
            vals: saleData,
            templateId: 29,
            fileName: `receipt_${saleData.customerId}_${currentDate_format_D_H_m_s}`,
            fileType: 6,
            localPath: FILES_PATH_CONFIG.RECEIPTS,
            subscriberId: null,
            customerId: saleData.customerId,
        };

        // The final array containing all unique subscriberIds
        return await createFile(Object.values(receptionDetails));
    } catch (err) {
        err.message = `createReceipt-> ${err.message}`;
        throw err;
    }
};
const roamingAgreement = async (transactionId = null, customerIdUser) => {
    try {
        const res = await getTransactionProductsModel(transactionId, 0, null, 1);
        const currentDate = convertToJSDateFormat(new Date(), 'D/M/Y');
        const currentDate_format_D_H_m_s = convertToJSDateFormat(new Date(), 'D-H-m-s');

        const uniqueSubscriberId = {}; // Object to hold unique subscriberIds

        for (const item of res) {
            const { subscriberId } = item;

            const productDetails = await getProductModel(item.productId, item.agentId, item.countryCode);

            if (isEmpty(productDetails)) {
                insertLogger({
                    end_point: 'roamingAgreement ',
                    logTitle: ' error code :3006 - There are no records ',
                    type: 'ERROR',
                    data: { productDetails },
                    code: -1,
                });
                if (item.productId) return { status: 404, code: 3006 };
                return { status: 204, code: item.productId * -1 };// There are no records
            }
            if (!uniqueSubscriberId[subscriberId]) {
                const callFiltering = await getRoamingPin(item.subscriberId);

                // In case EMAIL exists, an object is created for sending EMAIL
                let email = {};
                if (item.mainEmail) {
                    email = {
                        templateId: 27,
                        to: [item.mainEmail],
                    };
                }

                // If the subscriberId doesn't exist, create it in the object
                uniqueSubscriberId[subscriberId] = {
                    vals: {
                        currentDate,
                        orderId: item.orderId,
                        fromDate: currentDate,
                        country: { name: item.description },
                        productId: item.productId,
                        subscriber: item.subscriberName,
                        productDetails: [productDetails[0]],
                        phone: `0${item.phone}`,
                        callFiltering: callFiltering.data || null,
                        price: item.price,
                        payAmount: item.price || null,
                        subscriberId: item.subscriberId,
                    },
                    templateId: 22,
                    email,
                    fileName: `agreement_roaming_service_${item.subscriberId}_${currentDate_format_D_H_m_s}`,
                    fileType: 2,
                    localPath: FILES_PATH_CONFIG.AGREEMENTS,
                    encryptionPath: FILES_PATH_CONFIG.ENCRYPTION_AGREEMENTS,
                    subscriberId: item.subscriberId,
                    customerId: customerIdUser,
                };
            } else {
                // If the subscriberId already exists, push the item to the array
                uniqueSubscriberId[subscriberId].vals.productDetails.push(productDetails[0]);
                uniqueSubscriberId[subscriberId].payAmount += item.price;
            }
        }

        // The final array containing all unique subscriberIds
        createFile(Object.values(uniqueSubscriberId));
    } catch (err) {
        err.message = `roamingAgreement-> ${err.message}`;
        throw err;
    }
};

const pay = async (req) => {
    try {
        const result = [];
        let errors;
        let saleData;
        let resCreditGuard;
        let paymentDetailsId;
        const transactionDetails = await getTransactionProductsModel(req.params.transactionId);
        const customerDetails = { custPkId: transactionDetails.targetEntity.custPkId, serviceId: transactionDetails.targetEntity.serviceId };
        const customerInfo = (await getCustomerModel(customerDetails))[0];
        req.body.customerId = customerInfo.customerId;

        const currencyCode = transactionDetails.amount.originalCurrency;
        req.body.currency = currencyCode;

        const transactionSale = req.params.transactionId ? req.params.transactionId : 0;

        if (transactionSale) {
            // Check if sale is paid
            // const isPaid = await checkIfTransactionMadeModel(transactionSale, 4);
            // if (isPaid < 0) return { status: 400, code: isPaid * -1 };

            saleData = await getDataForInvoiceModel(transactionSale, 1, req.body.customerId, req.body.customerIdUserCashbox);
        }
        req.body.amount = saleData.amount; // bya_transaction_info.debit
        const nisAmount = parseFloat(((await getCurrencyRateModel(saleData.currency)) * saleData.amount).toFixed(2));

        req.body.wallet = Array.isArray(req.body.wallet) ? req.body.wallet : saleData.wallet;
        const payObj = await payObjFormat(req, nisAmount);

        // Check if there is any item with credit card and AMOUNT greater than total amount
        const isCardToatlMore = payObj.PAYMENT_CONTENT.some((item) => item.METHOD_TYPE === 2 && parseFloat((item.AMOUNT * item.RATE).toFixed(2))
            > nisAmount);
        if (isCardToatlMore) return { status: 400, code: 3028 }; // Credit amount higher than transaction price

        const isCardToatlEqual = payObj.PAYMENT_CONTENT.some((item) => item.METHOD_TYPE === 2 && parseFloat((item.AMOUNT * item.RATE).toFixed(2))
            === nisAmount);
        const isCashToatlMore = payObj.PAYMENT_CONTENT.some((item) => item.METHOD_TYPE !== 2);
        if (isCardToatlEqual && isCashToatlMore) return { status: 400, code: 3028 }; // Credit amount higher than transaction price

        const overpayment = parseFloat((getSumPaymentContentInNIS(payObj.PAYMENT_CONTENT) - nisAmount).toFixed(2));
        if (overpayment < 0) return { status: 400, code: 3024 }; // The total of the payment contents is less than the transaction amount

        for (const item of payObj.PAYMENT_CONTENT) {
            const i = payObj.PAYMENT_CONTENT.indexOf(item);
            switch (item.METHOD_TYPE) {
            case 1: // Cash
                break;

            case 2: // Credit card / Caspit
                const cardDetails = await creditCardObject(req.body.paymentContent[i], customerDetails, item.AMOUNT);
                cardDetails.customerId = req.body.customerId;
                cardDetails.actionCustomerId = req.body.customerIdUser;
                // insertLogger({
                //     end_point: 'pay',
                //     logTitle: 'pay cardDetails',
                //     data: cardDetails,
                //     type: 'INFO',
                //     code: 1,
                // });

                // resCreditGuard = { status: true, paymentDetailsId: 1234566, last4Digits: 1234 };
                resCreditGuard = await creditCard(cardDetails);
                if (!resCreditGuard.status) return { status: 400, code: 3014, info: { freeText: resCreditGuard.msgCg } };// Payment failed
                paymentDetailsId = resCreditGuard.paymentDetailsId;
                // insertLogger({
                //     end_point: 'pay cardDetails',
                //     logTitle: 'pay cardDetails',
                //     data: cardDetails,
                //     type: 'INFO',
                //     code: 1,
                // });
                if (cardDetails.cardNo) {
                    const CreditDetails = { creditCardToken: cardDetails.cardNo, creditCardExpiration: cardDetails.cardExpiration };
                    await customerController.setPayment(CreditDetails, customerDetails);
                }
                break;
            }
            saleData.last4Digits = resCreditGuard ? resCreditGuard.last4Digits : '';
        }

        const reference = await model.payTransactionModel(payObj, transactionSale, overpayment, paymentDetailsId);
        if (reference < 0) return { status: 400, code: 3016 };// The payment was made but an error occurred in the transaction
        // Doc
        // addCallSummary({
        //     agentId: req.body.agentId,
        //     type: 'customers', // customers/products
        //     entity_id: req.body.customerId,
        //     p_reason: req.body.action, // reason from telzar_app.reason
        //     p_remark: req.body.remark, // reason
        //     p_owner_id: 23, // reason group
        //     p_message_id: 'ביצוע תשלום',
        // });

        // get and pair iccid
        let simDetails;
        let updateOrder;
        let updateSim;
        let subscriberId;
        let setSimInHLR;
        const subscribers = [];
        for (const subscriber of transactionDetails.products) {
            if (!subscribers.includes(subscriber.phone)) {
                subscriberId = await getSubscriberIdByPhoneModel(subscriber.phone);
                errors = {};
                updateOrder = false;
                simDetails = await getSimDetailsModel([`${subscriber.phone}`], 2);
                if (simDetails.length > 0 && simDetails[0].SUBSCRIBER_ID && simDetails[0].IMSI) { // The subscriber already has a SIM
                    updateOrder = true;
                } else { // set new sim
                    const addSimOrder = await checkSimTypeOrder({ subscriberId }); // Checking what type of sim
                    if (addSimOrder.status === 200) {
                        // ---add regular sim---
                        if (addSimOrder.result === 'regularSim') {
                            simDetails = await getSimDetailsModel([addSimOrder.iccid], 1);
                            updateSim = await updateSimInDB({ // update db tables
                                phoneNumber: subscriber.phone,
                                imsi: simDetails[0].IMSI,
                                subscriberId,
                                hlrMSISDN: 2,
                            });
                            if (updateSim.status && updateSim.status === 200) {
                                setSimInHLR = await setImsiInHLRModel(subscriber.phone, addSimOrder.iccid); // set the sim in the HLR
                                if (setSimInHLR === 'OK') {
                                    updateOrder = true;
                                } else {
                                    errors = await getErrorObj(20208, subscriber.productId, subscriber.phone, subscriberId);
                                }
                            } else {
                                errors = await getErrorObj(20204, subscriber.productId, subscriber.phone, subscriberId);
                            }
                        // ---add esim order---
                        } else if (addSimOrder.result === 'esim') {
                            const getSimStatus = await getEsimNumber({ phone: subscriber.phone }); // pair sim add here option to regular sim
                            if (getSimStatus.status === 200 && getSimStatus.data.res === 'success') {
                                simDetails = await getSimDetailsModel([`${subscriber.phone}`], 2);
                                updateSim = await updateSimInDB({
                                    phoneNumber: subscriber.phone,
                                    imsi: simDetails[0].IMSI,
                                    subscriberId,
                                    hlrMSISDN: 2,
                                });
                                if (updateSim.status && updateSim.status === 200) updateOrder = true;
                                else {
                                    errors = await getErrorObj(20204, subscriber.productId, subscriber.phone, subscriberId);
                                }
                            } else {
                                errors = await getErrorObj(20204, subscriber.productId, subscriber.phone, subscriberId);
                            }
                        }
                    }
                }
                if (updateOrder) { // sucsses attachment or exist subscriber
                    const updateOrderRes = await updateOrderByTransactionId({ ...req.params }, 3);
                    if (updateOrderRes.status !== 200 || updateOrderRes.result < 0) {
                        errors = await getErrorObj(3032, subscriber.productId, subscriber.phone, subscriberId);
                    }
                }
                if (!errors.hasOwnProperty('subscriberId')) {
                    // add activity
                    const activityDetails = {
                        agentId: req.body.agentId,
                        entityId: 1,
                        custPkId: customerInfo.custPkId,
                        eventTypeId: 7000,
                        content: `המנוי 0${subscriber.phone} נוסף בהצלחה עם המוצר ${subscriber.productId} `,
                        serviceId: customerInfo.customerType,
                        subscriberId,
                    };
                    const avticityId = await addActivity(activityDetails);

                    if (avticityId.status !== 201) {
                        errors = await getErrorObj(20182, subscriber.productId, subscriber.phone, subscriberId);
                    } else errors = await getErrorObj(0, subscriber.productId, subscriber.phone, subscriberId);
                }
                subscribers.push(subscriber.phone);
                result.push(errors);
            }

            const foundItemIndex = saleData.wallet.findIndex((item) => item.subscriberNum === subscriberId);
            if (foundItemIndex !== -1) {
                // console.log(subscriberId, `0${subscriber.phone}`, simDetails[0]);
                // If a matching item is found, update the properties
                saleData.wallet[foundItemIndex].phone = `0${subscriber.phone}` || null;
                saleData.wallet[foundItemIndex].iccid = simDetails[0]?.ICCID.slice(-5) || null;
            }
        }
        const invoiceNumber = await createInvoice(req, reference, 1, saleData, payObj);
        // The payment was made successfully but there is an error in creating an invoice
        if (invoiceNumber < 0) return { status: 400, code: 3023 };
        // Update invoice number in transaction
        model.updateInvoiceNumberInTransactionModel(reference, invoiceNumber);

        // Create invoice form
        const vals = await createInvoiceForm(req, reference, saleData, invoiceNumber, payObj, overpayment);

        // create agreements
        roamingAgreement(req.params.transactionId, req.body.customerIdUser);

        let receiptFileHash;
        if (req.body.createPrintReceipt) {
            receiptFileHash = await createReceipt(vals);
            receiptFileHash = receiptFileHash.listHashFile[0].hashFile;
        }
        return {
            status: 201,
            data: {
                transactionId: req.params.transactionId, invoiceNumber, excessCash: overpayment, subscribers: result, receiptFileHash,
            },
        };
    } catch (err) {
        err.message = `pay-> ${err.message}`;
        throw err;
    }
};

const getProductArrToRefund = (data) => {
    const productsArr = [];
    for (const item of data) {
        productsArr.push({
            AMOUNT: item.price,
            PRODUCT_TO_FOLLOW: 0,
            PRODUCT_AMOUNT: item.amount || 1,
            WALLET_CATEGORY: 0,
            PRODUCT_ID: item.productId,
            SERIAL_NUMBER: item.serialNumber || '0',
            STOCK_ID: item.stockId || 0,
            NUM_PAYMENTS: 1,
            PERIODIC_AMOUNT: item.periodicAmount || 0,
            DISCOUNT: item.discount || 0,
            CURRENCY_TYPE: item.currency || 3,
            SUBSCRIBER_NUM: item.phone || 0,
            ICCID: item.simIccid || 0,
            SIM_TYPE: item.simType || 0,
        });
    }
    return productsArr;
};

const returnStockArray = async (productsArr, customerId) => {
    try {
        const stockProductsArr = productsArr.map((product) => ({
            amount: product.PRODUCT_AMOUNT > 0 ? product.PRODUCT_AMOUNT : 1,
            productId: `${product.PRODUCT_ID}`,
            serialNumber: product.SERIAL_NUMBER > 0 ? product.SERIAL_NUMBER : `${product.PRODUCT_ID}`,
            stockId: product.STOCK_ID > 0 ? product.STOCK_ID : null,
            price: product.AMOUNT ? product.AMOUNT.amount : 0,
            soldTo: customerId,
            status: 4,
        }));
        return stockProductsArr;
    } catch (err) {
        err.message = `returnStockArray-> ${err.message}`;
        throw err;
    }
};

const dataRefundInvoiceForm = (data, products, amount) => {
    data.createdOn = new Date().toLocaleString('en-IL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).replace(',', '');
    data.amount = amount * -1;
    data.vat *= -1;
    data.dutyTotal *= -1;
    data.taxableAmount = amount * -1;
    data.dutyTotalFree = amount * -1;
    // data.wallet = data.wallet.filter((sItem) => products.some((pItem) => pItem.productId === sItem.productId));
    return data;
};
const refundResponseFormat = (data, invoiceNumber) => {
    delete data.description;
    delete data.status;
    delete data.transactionType;
    delete data.invoices;
    delete data.sourceEntity;
    delete data.targetEntity;
    data.invoiceNumber = invoiceNumber || undefined;
    data.payments = data.billing.payments;
    delete data.billing;
    return data;
};

// Cancellation of a transaction or part of a transaction
/*
   case 1 <= Canceling a sale and canceling a pay (relevant in esim and natbag)
   case 2 . future <= Canceling a sale
   case 3 . future <= Canceling a pay
 */
const cancel = async (req) => {
    try {
        let products;
        let paymentDetailsId;
        let amountToCredit;
        const cardDetails = {};

        //   const isRefunded = await checkIfTransactionMadeModel(req.params.transactionId, 10);
        //   if (isRefunded < 0) return { status: 400, code: isRefunded * -1 };

        const transactionDetails = await getTransactionProductsModel(req.params.transactionId, 1);
        if (!transactionDetails) return { status: 400, code: 3025 };// No transaction details found
        if (transactionDetails.billing.payments.length === 0) return { status: 400, code: 3027 };// Missing data for credit

        const customerDetails = { custPkId: transactionDetails.targetEntity.custPkId, serviceId: transactionDetails.targetEntity.serviceId };
        const customerInfo = (await getCustomerModel(customerDetails))[0];
        req.body.customerId = customerInfo.customerId;

        const currencyCode = transactionDetails.amount.originalCurrency;
        req.body.currency = currencyCode;

        // Checking whether to cancel the whole transaction or only specific products
        const cancalAllTransactionFlag = req.body.stocks ? 0 : 1;

        if (cancalAllTransactionFlag) {
            products = transactionDetails.products;
            amountToCredit = transactionDetails.amount.original;
        } else { // Partial refund
            const allStocksExist = req.body.stocks.every((pItem) => transactionDetails.products.some((tItem) => tItem.stockId === pItem.stockId));
            if (!allStocksExist) return { status: 400, code: 3029 };// Attempt to credit components that were not in the original transaction
            products = transactionDetails.products.filter((tItem) => req.body.stocks.some((pItem) => pItem.stockId === tItem.stockId));
            amountToCredit = products.reduce((sum, product) => sum + product.price.amount, 0);
        }
        const payData = {};
        const PAYMENT_CONTENT = [];
        if (products.some((item) => item.status !== 3)) return { status: 400, code: 3030 };// Attempting to credit non-creditable products
        let paymentResults = {};
        let sumRefund = cancalAllTransactionFlag ? transactionDetails.amount.nis : amountToCredit * transactionDetails.amount.rate; // amount
        let amountPay = 0;
        for (const payment of transactionDetails.billing.payments) {
            const currencyRate = await getCurrencyRateModel(payment.currency);
            if (sumRefund >= payment.amount * payment.rate) {
                amountPay = payment.amount;
            } else amountPay = sumRefund / currencyRate;
            if (sumRefund > 0) {
                PAYMENT_CONTENT.push({
                    METHOD_TYPE: payment.method,
                    AMOUNT: amountPay,
                    CURRENCY: payment.currency,
                    RATE: currencyRate,
                });
            }
            sumRefund -= amountPay * payment.rate;
            switch (payment.method) {
            case 1: // Cash
                break;
            case 2: // Credit card
                cardDetails.cardId = transactionDetails.cardId;
                cardDetails.cardExpiration = transactionDetails.expCard;
                cardDetails.total = amountPay;
                cardDetails.method = 2; // Refund
                cardDetails.customerId = req.body.customerId;
                cardDetails.actionCustomerId = req.body.customerIdUser;
                cardDetails.currency = payment.currency;
                cardDetails.tranId = transactionDetails.cardDealdetail.tranId;
                cardDetails.terminalNum = transactionDetails.cardDealdetail.terminalNum;
                cardDetails.cardId = transactionDetails.cardDealdetail.cardId;

                const resCreditGuard = await creditCard(cardDetails);

                if (!resCreditGuard.status) {
                    paymentResults = {
                        status: 400,
                        code: 3020,
                        info: { freeText: resCreditGuard.msgCg },
                    };
                } else {
                    paymentDetailsId = resCreditGuard.paymentDetailsId;
                }
                break;
            case 3: // Check todo
                break;
            case 4: // Bank transfer todo
                break;
            default:
                break;
            }
        }
        if (!paymentResults || (paymentResults && paymentResults.status)) return paymentResults;
        payData.PAYMENT_CONTENT = PAYMENT_CONTENT;
        const productsArr = await getProductArrToRefund(products);

        const stockArray = await returnStockArray(productsArr, req.body.customerId);
        const distributionId = await stockModify({ stock: stockArray, agentId: req.body.agentId }, customerDetails, req.body.customerId);
        if (distributionId.code) return { status: 400, code: distributionId.code };
        const distributionNumber = distributionId.data.distributionId;

        // todo aviel: cancel package
        // Canceling a transaction and canceling an invoice
        const reference = await model.cancelTransactionModel(
            req.body.customerIdUser,
            req.body.customerId,
            amountToCredit,
            req.params.transactionId,
            distributionNumber,
            payData.PAYMENT_CONTENT,
            paymentDetailsId,
            currencyCode,
        );
        if (reference < 0) return { status: 400, code: 3019 };// The refund was made but an error occurred in the transaction
        const invoiceType = 2;// Refund

        const saleData = await getDataForInvoiceModel(req.params.transactionId, 1, req.body.customerId, req.body.customerIdUser);
        saleData.amount = amountToCredit;
        saleData.wallet = saleData.wallet.filter((tItem) => products.some((pItem) => pItem.productId === tItem.productId));
        const invoiceNumber = await createInvoice(req, reference, invoiceType, saleData, payData);

        // The payment was made successfully but there is an error in creating an invoice
        if (invoiceNumber < 0) return { status: 400, code: 3023 };

        // Update invoice number in transaction
        model.updateInvoiceNumberInTransactionModel(reference, invoiceNumber);

        const dataForInvoiceForm = dataRefundInvoiceForm(saleData, products, amountToCredit);
        // Create invoice form
        createInvoiceForm(req, reference, dataForInvoiceForm, invoiceNumber, payData, 0, invoiceType);
        let refundDetails = await getTransactionProductsModel(req.params.transactionId, 0, 10);
        refundDetails = refundResponseFormat(refundDetails, invoiceNumber);
        return { status: 201, data: refundDetails };
    } catch (err) {
        err.message = `cancel-> ${err.message}`;
        throw err;
    }
};

const transfer = async (obj) => {
    try {
        const transferObj = {
            sourceCustomerId: 660,
            targetCustomerId: 661,
            productId: 0,
            serialNumber: '',
            wallatIdPlus: 1823,
            wallatIdMinus: 1823,
            method: 7,
            methodType: 1,
            amount: 40,
            sourceRef: 0,
            externalRef: '',
            type: 0,
            currency: 3,
        };
        const reference = await model.transferModel(transferObj);
        if (reference < 0) return { status: 400, code: reference * -1 };
        return { status: 200 };
    } catch (err) {
        err.message = `transfer-> ${err.message}`;
        throw err;
    }
};

const sendInvoice = async (req) => {
    try {
        const invoiceNumber = req.params.invoiceId;// await model.getInvoiceNumberModel(req.params.transactionId);
        const nameInvoice = `invoice_${invoiceNumber}`;
        // Send email
        const sendEmailRes = await sendEmail('efi@019mobile.co.il', req.body.emailAddress, 'invoice-BYA', '019 - INVOICE', {}, [{
            path: `${FILES_PATH_CONFIG.UPLOAD_INVOICES}${nameInvoice}.pdf`,
            name: `${nameInvoice}.pdf`,
            type: 'pdf',
        }]);
        // if (sendEmailRes < 0) {
        //     insertLogger({
        //         end_point: 'getInvoice - send email',
        //         logTitle: `Bug in send invoice. : ${JSON.stringify(sendEmailRes)}, invoice number : ${req.body.invoiceNumber}`,
        //         type: 'ERROR',
        //         code: -1,
        //     });
        // }
        return { status: sendEmailRes.status, code: sendEmailRes.code, msg: sendEmailRes.msg };
    } catch (err) {
        err.message = `sendInvoice-> ${err.message}`;
        throw err;
    }
};

const getInvoice = async (req, res) => {
    try {
        const invoiceNumber = parseInt(req.params.invoiceId, 10); // await model.getInvoiceNumberModel(req.params.transactionId);
        const nameInvoice = `invoice_${invoiceNumber}`;
        const filePath = `${FILES_PATH_CONFIG.UPLOAD_INVOICES}${nameInvoice}.pdf`;
        const bufferSignedInvoice = Buffer.from(fs.readFileSync(filePath));

        await setDefinitionsInHeader(req, res, invoiceNumber);
        return { status: 200, data: bufferSignedInvoice };
    } catch (err) {
        err.message = `getInvoice-> ${err.message}`;
        throw err;
    }
};

const getTransaction = async (req) => {
    try {
        const { transactionId } = req.params;
        const data = await getTransactionProductsModel(transactionId);

        // If has refund transaction get details
        const isExistRefund = await getInternalRefByGeneralRefModel(transactionId, 10);
        if (isExistRefund) data.refund = refundResponseFormat(await getTransactionProductsModel(transactionId, 0, 10));

        if (!data) return { status: 404, code: 3006 };// There are no records
        delete data.type;
        delete data.tranId;
        delete data.terminalNum;

        return { status: 200, data };
    } catch (err) {
        err.message = `getTransaction-> ${err.message}`;
        throw err;
    }
};

const createHashForInvoice = async (req) => {
    try {
        const hashToken = jwt.sign(
            { token: req.headers.authorization?.split(' ')[1] },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '10m' },
        );
        return { status: 201, data: { hashToken } };
    } catch (err) {
        err.message = `createHashForInvoice-> ${err.message}`;
        throw err;
    }
};

export {
    checkCredit,
    pay,
    transfer,
    methodPayTransaction,
    getTokenForCard,
    refundByCard,
    debitByCard,
    debitByPhisyTerminal,
    registerToRecurringDebit,
    createInvoice,
    cancel,
    getInvoice,
    sendInvoice,
    getTransaction,
    createHashForInvoice,
    createFile,
};
