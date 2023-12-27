import { uploadFile } from '../utils/sftp.js';
import FILES_PATH_CONFIG from '../config/url.js';
import 'dotenv/config.js';
import { readExcelFile } from '../utils/excel.js';
import * as customersModel from '../models/customers.js';
import {
    convertToJSDateFormat, getCurrencyTypeObject, isEmpty, providerIdByCreditCardToken,
} from '../utils/helper.js';
import { insertLogger } from '../utils/logger.js';
import { getNewTzNumber } from './cellularActions.js';
import { roamingToJordanEgyptModel } from '../models/cellularActions.js';
import { getCurrencyRateModel } from '../models/transactions.js';
import { createFile } from './transactions.js';
import moment from 'moment';

const putCustomer = async (req) => {
    let data;
    try {
        // 1. read excel for json
        const excelJson = readExcelFile(req.file.path); // json- array of objects
        if (isEmpty(excelJson)) return { status: 404, code: 3006 };// There are no records

        // 2. validations
        // customerValidator(excelJson);
        // console.log('after validations');

        // 3. sftp to oracle
        data = await uploadFile(
            `${FILES_PATH_CONFIG.SFTP}${req.file.originalname}`,
            `${FILES_PATH_CONFIG.ORACLE}${req.file.originalname}`,
            process.env.oracleHostIpDev,
            process.env.oracleHostUsernameDev,
            process.env.oracleHostPasswordDev,
            process.env.oracleHostPortDev,
        );
        // console.log(data);

        // 4. call db function
        if (data) data = await customersModel.putCustomerModel(req.file.originalname);

        if (data.out_code === 0) return { status: 400, code: data.out_code };
        return { status: 201, data };
    } catch (err) {
        err.message = `putCustomer-> ${err.message}`;
        throw err;
    }
};

const getCustomerTypes = async () => {
    try {
        const data = await customersModel.getCustomerTypesModel();
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getCustomerTypes-> ${err.message}`;
        throw err;
    }
};

const getCustomerIdByCustPkAndServiceId = async (custPkId, serviceId) => {
    try {
        const data = await customersModel.getCustomerIdByCustPkAndServiceIdModel(custPkId, serviceId);
        if (!data) return { status: 404, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getCustomerIdByCustPkAndServiceId-> ${err.message}`;
        throw err;
    }
};

const updateCustPk = async (params, body) => {
    try {
        body.custPkId = params.custPkId;
        body.creationUser = body.agentId;
        const data = await customersModel.updateCustPkModel(body, params.custPkId);
        if (data < 0) {
            let code;
            switch (data) {
            case -1:
                code = 20163; // No exist this cust_pk
                break;
            default:
                code = data * -1;
            }
            return { status: 400, code };
        }
        return { status: 200, data: { custPkId: data } };
    } catch (err) {
        err.message = `updateCustPk-> ${err.message}`;
        throw err;
    }
};

const setCustomerReq = async (req) => {
    try {
        switch (req.serviceId) {
        case 7:
            req.firstName = req.firstName ? req.firstName : 'prepaid';
            req.lastName = req.lastName ? req.lastName : 'prepaid';
            if (!req.nationalId) {
                req.idType = 1;
                req.nationalId = '123456';
            }
            // Agreements
            req.privacyAndPolicy = req.privacyAndPolicy ? req.privacyAndPolicy : false;
            req.termsOfUse = req.termsOfUse ? req.termsOfUse : false;
            req.cellularProducts = req.cellularProducts ? req.cellularProducts : 0;
            break;
        case 201:
            req.firstName = req.firstName ? req.firstName : 'שירות';
            req.lastName = req.lastName ? req.lastName : 'קופה';
            break;
        }
    } catch (err) {
        err.message = `setCustomerReq-> ${err.message}`;
        throw err;
    }
};

const setCustomer = async (req, params = null) => {
    try {
        let serviceId = 0;
        if (!params && req.serviceId && req.serviceId !== '200') { // Create Lead with Service
            serviceId = req.serviceId; // Tmp variable for saving the original serviceId
            if ([7, 201].includes(req.serviceId)) await setCustomerReq(req);

            req.serviceId = 200; // First of all create the lead
        }
        await setCustomerReq(req);

        if (params && params.serviceId && !req.serviceId) req.serviceId = params.serviceId; // Create service with subscribers

        if (params && params.custPkId) req.cust_pk_id = params.custPkId; // Add a service
        else if (req.contactPhoneNumber || req.mainEmail) {
            // if a new customer primary - check that phone/mail is unique
            const uniquePhoneForCustomerPrimary = await customersModel.uniquePhoneForCustomerPrimaryModel(req.contactPhoneNumber, req.mainEmail);
            if (uniquePhoneForCustomerPrimary > 0) return { status: 400, code: 20175 }; // Phone Number or Email already exist
        }

        if (!req.subscribers) req.subscribers = [{ subName: req.firstName, phone: req.contactPhoneNumber ? req.contactPhoneNumber : '1234567890' }]; // Default subscriber
        if (req.creditCardToken) await providerIdByCreditCardToken(req);

        const data = await customersModel.setCustomerModel(req);
        if (data.res < 0) {
            let code;
            switch (data.res) {
            case -2:
                code = 20163; // No exist this cust_pk
                break;
            case -3:
                code = 20162; // Customer exist
                break;
            case -4:
            case -1:
                code = 20164; // Validation err
                break;
            case -5:
                code = 20165; // Cust_pk not null and customer_type = 200
                break;
            case -6:
                code = 20166; // cust_pk = null and customer_type <> 200
                break;
            case -7:
                code = 20167; // No found this cust_pk with this type
                break;
            case -8:
                code = 20168; // No found this subscriber_id
                break;
            case -9:
                code = 20169; // No found agreement id with this cust_pk and this type
                break;
            case -11:
                code = 20170; // Customer's phone already exists
                break;
            default:
                code = data.res * -1;
            }
            return { status: 400, code };
        }
        if (serviceId > 0) {
            req.serviceId = serviceId;
            params = { custPkId: data.res };
            await setCustomer(req, params);
        }
        return { status: 201, data: { custPkId: data.res } };
    } catch (err) {
        err.message = `setCustomer-> ${err.message}`;
        throw err;
    }
};

const updateCustomer = async (req, params) => {
    try {
        const data = await customersModel.updateCustomerModel(req, params);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `updateCustomer-> ${err.message}`;
        throw err;
    }
};

// const getAgreements = async (agreementType) => {
//     try {
//         const data = await getAgreementsModel(agreementType);
//         if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
//         return { status: 200, data };
//     } catch (err) {
//         err.message = `getAgreements-> ${err.message}`;
//         throw err;
//     }
// };
const getNewSubscriberArrayWithGeneratedPhone = async (subscribers) => {
    const phoneRegex = /^05\d{8}$/;
    const data = [];
    let updateSubscriber = {};
    let newPhoneNumber = '';
    for (const subscriber of subscribers) {
        updateSubscriber = subscriber;
        if (!subscriber.phone || subscriber.phone === '') {
            newPhoneNumber = await getNewTzNumber(1);
            if (newPhoneNumber.status === 200) {
                updateSubscriber.phone = newPhoneNumber.data[0].phoneNumber;
            } else {
                return { status: 400, code: 20210 }; // Failed to generate new phone number
            }
        } else {
            // phone validation
            if (!phoneRegex.test(subscriber.phone)) return { status: 400, code: 1009 }; // Invalid phone
        }
        data.push(updateSubscriber);
    }
    return { status: 200, data };
};

const checkSubscriberHierarchy = async (custPkId, serviceId, subscriberId) => {
    try {
        const result = await customersModel.checkSubscriberHierarchyModel(custPkId, serviceId, subscriberId);
        if (result) return { status: 200, data: { data: result } };
        return { status: 400, code: 20181 }; // No found this subscriber_id with this type and cust_pk_id
    } catch (err) {
        err.message = `checkSubscriberHierarchy-> ${err.message}`;
        throw err;
    }
};

const custPkCustomerObject = async (data) => {
    try {
        const response = {
            custPkId: data.custPkId,
            firstName: data.firstName,
            lastName: data.secondName,
            nationalId: data.nationalId,
            createdBy: {
                custPkId: data.creationUserId,
                label: data.creationUserName,
                date: convertToJSDateFormat(data.creationDate),
            },
            info: {
                contactPhoneNumber: data.contactNo ? `0${data.contactNo}` : null,
                email: data.mainEmail,
                address: {
                    city: {
                        id: data.city,
                        label: data.cityName,
                    },
                    street: {
                        id: data.street,
                        label: data.streetName,
                    },
                    houseNumber: data.house,
                },
            },
            status: {
                id: data.custPkStatus,
                label: data.custPkStatus === 1 ? 'פעיל' : 'סגור',
            },
        };
        return response;
    } catch (err) {
        err.message = `custPkCustomerObject-> ${err.message}`;
        throw err;
    }
};

const getSimStatus = async (status) => {
    let esimStatus;
    let esimStatusDescription;
    switch (status) { // Change result to current code error
    case '0.2': // An error occurred
        esimStatus = 1;
        esimStatusDescription = 'An error occurred';
        break;
    case '0.3': // Failed to download profile
        esimStatus = 2;
        esimStatusDescription = 'Failed to download profile';
        break;
    case '0.4': // Failed to install profile
        esimStatus = 3;
        esimStatusDescription = 'Failed to install profile';
        break;
    case '1.3': // Success to download profile
        esimStatus = 4;
        esimStatusDescription = 'Profile was downloaded successfully';

        break;
    case '1.4': // Success to install profile
        esimStatus = 5;
        esimStatusDescription = 'Profile has been installed successfully';
        break;
    case '1.1024': // eSIM has been deleted
        esimStatus = 6;
        esimStatusDescription = 'ESIM has been deleted';
        break;
    case '1.1025': // eSIM is inactive
        esimStatus = 7;
        esimStatusDescription = 'ESIM is inactive';
        break;
    case '1.1026': // esim is active
        esimStatus = 8;
        esimStatusDescription = 'ESIM is active';
        break;
    case '2': // attached esim
        esimStatus = 9;
        esimStatusDescription = 'The SIM has been attached successfully';
        break;
    default:
        esimStatus = 10; // Unknown status
        esimStatusDescription = 'Unknown status';
    }
    return { esimStatus, statusDescription: esimStatusDescription };
};

const subscriberObject = async (subscriber) => {
    try {
        if (subscriber.subscriberId && subscriber.subscriberId > 0) {
            const roamingToJordanEgyptProductId = 87000120;
            const products = [];
            const specialProducts = [];
            for (const product of subscriber.walletData) {
                if ((product.CATEGORY_ID).includes([824].toString()) || product.CATEGORY_ID === '484') {
                    specialProducts.push(product);
                    continue;
                }
                const productObject = {};
                productObject.productId = product.PRODUCT_ID ? product.PRODUCT_ID : null;
                productObject.productName = product.PRODUCT_NAME ? product.PRODUCT_NAME : null;
                productObject.status = moment().isAfter(product.EXPRATION_DATE) ? 0 : product.STATUS;
                productObject.voice = product.VOICE ? product.VOICE : 0;
                productObject.sms = product.SMS ? product.SMS : 0;
                productObject.idata = product.IDATA ? product.IDATA : 0;
                productObject.balanceToUse = {
                    voice: product.VOICE_FREE_USE ? product.VOICE_FREE_USE : 0,
                    sms: product.SMS_FREE_USE ? product.SMS_FREE_USE : 0,
                    idata: product.DATA_FREE_USE ? product.DATA_FREE_USE : 0,
                };
                productObject.creationDate = product.CREATED_ON ? convertToJSDateFormat(product.CREATED_ON) : null;
                productObject.expirationDate = product.EXPRATION_DATE ? convertToJSDateFormat(product.EXPRATION_DATE, 'YYYY-MM-DDTHH:mm:ss.sssZ', 'DD-MM-YYYY HH:mm:ss.ss') : null;
                productObject.country = {
                    countryId: product.COUNTRY_CODE ? product.COUNTRY_CODE : null,
                    label: product.DESCRIPTION ? product.DESCRIPTION : null,
                    isoCode: product.ISO_CODE ? product.ISO_CODE : null,
                };
                productObject.price = {
                    amount: product.RATES ? product.RATES : null,
                    currency: product.CURRENCY_ID ? product.CURRENCY_ID : null,
                };
                productObject.stockId = product.STOCK_ID ? product.STOCK_ID : null;
                productObject.transactionId = product.INTERNAL_REFERENCE_NUMBER ? product.INTERNAL_REFERENCE_NUMBER : null;
                products.push(productObject);
            }

            const keepPhoneNumberObj = { status: false, renewable: 0 };
            const keepPhoneNumber = specialProducts.find((obj) => obj.PRODUCT_ID === 9990);
            if (keepPhoneNumber) {
                keepPhoneNumberObj.status = true;
                keepPhoneNumberObj.renewable = keepPhoneNumber.RENEWAL_COUNT;
                keepPhoneNumberObj.expirationDate = keepPhoneNumber.EXPRATION_DATE ? convertToJSDateFormat(keepPhoneNumber.EXPRATION_DATE, 'YYYY-MM-DDTHH:mm:ss.sssZ', 'DD-MM-YYYY HH:mm:ss.ss') : null;
            }

            const customerData = !isEmpty(subscriber.customerData) ? subscriber.customerData[0] : {};
            const customerDataHis = !isEmpty(subscriber.customerDataHis) ? subscriber.customerDataHis[0] : {};
            const dataPackage = !isEmpty(subscriber.dataPackage) ? subscriber.dataPackage[0] : {};
            const simStatus = await getSimStatus(dataPackage.SIM_STATUS?.toString());
            return {
                subscriberId: subscriber.subscriberId,
                phoneNumber: customerData.PHONE ? customerData.PHONE : null,
                subscriberName: customerData.SUBS_NAME ? customerData.SUBS_NAME : null,
                customerPrimary: {
                    custPkId: customerData.CUST_PK_ID ? customerData.CUST_PK_ID : null,
                    label: customerData.CP_NAME ? customerData.CP_NAME : null,
                },
                keepPhoneNumber: keepPhoneNumberObj,
                callForwarding: dataPackage.IS_SERVICE_ACTIVE ? dataPackage.IS_SERVICE_ACTIVE : false,
                simInformation: {
                    simType: {
                        id: (dataPackage.TYPE_SIM && dataPackage.TYPE_SIM === 'eSIM') ? 2 : 1,
                        label: (dataPackage.TYPE_SIM && dataPackage.TYPE_SIM === 'eSIM') ? 'eSIM' : 'Regular',
                        status: {
                            id: simStatus.esimStatus,
                            label: simStatus.statusDescription,
                        },
                    },
                    simIccid: dataPackage.ICCID ? dataPackage.ICCID : null,
                    imsi: dataPackage.IMSI ? dataPackage.IMSI : null,
                    pin1: dataPackage.PIN1 ? dataPackage.PIN1 : null,
                    puk1: dataPackage.PUK1 ? dataPackage.PUK1 : null,
                    pin2: dataPackage.PIN2 ? dataPackage.PIN2 : null,
                    puk2: dataPackage.PUK2 ? dataPackage.PUK2 : null,
                    imsiPartner: (dataPackage.MVNO && dataPackage.MVNO === 'partner') ? dataPackage.MVNO_IMSI : null,
                    imsiPelephone: (dataPackage.MVNO && dataPackage.MVNO === 'pelephone') ? dataPackage.MVNO_IMSI : null,
                },
                status: {
                    id: customerData.STATUS ? customerData.STATUS : null,
                    label: customerData.STATUS_NAME_DESCRIPTION ? customerData.STATUS_NAME_DESCRIPTION : null,
                },
                createdBy: {
                    custPkId: customerDataHis.CUST_PK_CREATED_BY ? customerDataHis.CUST_PK_CREATED_BY : null,
                    label: (customerDataHis.FIRST_CREATION_USER_NAME && customerDataHis.FIRST_CREATION_USER_NAME !== ' ') ? customerDataHis.FIRST_CREATION_USER_NAME : null,
                    date: customerDataHis.FIRST_DATE_SUBS ? convertToJSDateFormat(customerDataHis.FIRST_DATE_SUBS) : null,
                },
                lastUpdate: {
                    custPkId: customerDataHis.CUST_PK_MODIFIER ? customerDataHis.CUST_PK_MODIFIER : customerDataHis.CUST_PK_CREATED_BY,
                    label: (customerDataHis.LAST_MODIFIER_NAME && customerDataHis.LAST_MODIFIER_NAME !== ' ') ? customerDataHis.LAST_MODIFIER_NAME : customerDataHis.FIRST_CREATION_USER_NAME,
                    date: customerDataHis.LAST_UPDATE_CUS ? convertToJSDateFormat(customerDataHis.LAST_UPDATE_CUS) : convertToJSDateFormat(customerDataHis.FIRST_DATE_SUBS),
                },
                products,
                roamingToJordanEgypt: specialProducts.some((product) => product.PRODUCT_ID === roamingToJordanEgyptProductId), // check if user has roaming to Jordan Egypt
            };
        }
        // else - List of subscribers
        const response = [];
        for (const sub of subscriber.walletData) {
            // if (sub.PHONE === '1234567890') continue;
            const subObj = {};
            subObj.subscriberId = sub.SUBSCRIBER_ID;
            subObj.phoneNumber = sub.PHONE;
            subObj.name = sub.NAME;
            subObj.status = {
                id: sub.STATUS ? sub.STATUS : null,
                label: sub.STATUS_NAME_DESCRIPTION ? sub.STATUS_NAME_DESCRIPTION : null,
            };
            subObj.lastActiveProduct = {
                productId: sub.PRODUCT_ID ? sub.PRODUCT_ID : null,
                productName: sub.PRODUCT_NAME ? sub.PRODUCT_NAME : null,
                voice: sub.VOICE ? sub.VOICE : null,
                sms: sub.SMS ? sub.SMS : null,
                idata: sub.IDATA ? sub.IDATA : null,
                balanceToUse: {
                    voice: sub.VOICE_FREE_USE ? sub.VOICE_FREE_USE : null,
                    sms: sub.SMS_FREE_USE ? sub.SMS_FREE_USE : null,
                    idata: sub.DATA_FREE_USE ? sub.DATA_FREE_USE : null,
                },
            };
            subObj.creationDate = sub.CREATED_ON ? sub.CREATED_ON : null;
            subObj.expirationDate = sub.EXPRATION_DATE ? convertToJSDateFormat(sub.EXPRATION_DATE, 'YYYY-MM-DDTHH:mm:ss.sssZ', 'DD-MM-YYYY HH:mm:ss.ss') : null;
            subObj.country = {
                countryId: sub.COUNTRY_CODE ? sub.COUNTRY_CODE : null,
                label: sub.DESCRIPTION ? sub.DESCRIPTION : null,
                isoCode: sub.ISO_CODE ? sub.ISO_CODE : null,
            };
            subObj.price = {
                amount: sub.RATES ? sub.RATES : null,
                currency: sub.CURRENCY_ID ? sub.CURRENCY_ID : null,
            };
            subObj.amountActiveProducts = sub.amountProducts ? sub.amountProducts : null;

            response.push(subObj);
        }
        return response;
    } catch (err) {
        err.message = `subscriberObject-> ${err.message}`;
        throw err;
    }
};

const subscriberCashboxObject = async (subscriber, custPkId) => {
    try {
        const response = [];
        let data = {};
        const obj = subscriber[0];
        let getCashbox;
        if (obj.subscriberId && obj.subscriberId > 0) {
            const currencyTypeObj = getCurrencyTypeObject();
            const cashbox = [];
            if (!isEmpty(obj.cashbox)) {
                for (const [key, value] of Object.entries(currencyTypeObj)) {
                    getCashbox = {
                        currency: key,
                        amount: obj.cashbox[0][value] ? obj.cashbox[0][value] : 0,
                    };
                    cashbox.push(getCashbox);
                }
            }
            data = {
                customerPrimary: {
                    custPkId: custPkId || null,
                    label: obj.CASHBOX_NAME || null,
                },
                name: obj.NAME,
                createdBy: {
                    custPkId: obj.C_PK_UPDATED ? obj.C_PK_UPDATED : null,
                    label: obj.UPDATED_CASHBOX ? obj.UPDATED_CASHBOX : null,
                },
                lastUpdate: {
                    custPkId: obj.C_PK_UPDATED ? obj.C_PK_UPDATED : null,
                    label: obj.UPDATED_CASHBOX ? obj.UPDATED_CASHBOX : null,
                    date: obj.LAST_UPDATE_DATE ? convertToJSDateFormat(obj.LAST_UPDATE_DATE) : convertToJSDateFormat(obj.AFFECTED_FROM),
                },
                cashbox,
                totalBalance: getCashbox ? getCashbox.TOTAL_BALANCE : 0,
                status: {
                    id: obj.STATUS ? obj.STATUS : null,
                    label: obj.STATUS === 1 ? 'פתוח' : 'סגור',
                },
            };
            return data;
        }

        for (const sub of subscriber) {
            const subObj = {};
            subObj.subscriberId = sub.SUBSCRIBER_ID ? sub.SUBSCRIBER_ID : null;
            subObj.name = sub.NAME ? sub.NAME : null;
            subObj.lastUpdate = {
                custPkId: sub.C_PK_UPDATED ? sub.C_PK_UPDATED : null,
                label: sub.UPDATED_CASHBOX ? sub.UPDATED_CASHBOX : null,
                date: sub.LAST_UPDATE_DATE ? convertToJSDateFormat(sub.LAST_UPDATE_DATE) : convertToJSDateFormat(sub.AFFECTED_FROM),
            };
            subObj.status = {
                id: sub.STATUS ? sub.STATUS : null,
                label: sub.STATUS === 1 ? 'פתוח' : 'סגור',
            };
            response.push(subObj);
        }
        return response;
    } catch (err) {
        err.message = `subscriberCashboxObject-> ${err.message}`;
        throw err;
    }
};

const getSubscriber = async (params) => {
    try {
        let data = {};
        let response = {};
        switch (params.serviceId) {
        case '201':
        case '202':
            data = await customersModel.getSubscriberCashboxModel(params);
            if (isEmpty(data)) {
                if (params.subscriberId) return { status: 404, code: 3006 }; // Not Found
                return { status: 204, code: 3006 }; // No content
            }
            data[0].subscriberId = params.subscriberId || null;
            if (params.subscriberId && params.subscriberId > 0) {
                data[0].cashbox = await customersModel.getDataBalanceModel(params);
            }
            response = await subscriberCashboxObject(data, params.custPkId);
            break;
        default:
            data = await customersModel.getSubscriberModel(params);
            if (params.subscriberId && params.subscriberId > 0) {
                if (isEmpty(data.customerData)) return { status: 404, code: 3006 }; // Not Found
            } else if (isEmpty(data.walletData)) return { status: 204, code: 3006 }; // No content
            data.subscriberId = params.subscriberId || null;
            response = await subscriberObject(data);
            if (isEmpty(response)) return { status: 204, code: 3006 };// Not Found
            break;
        }
        return { status: 200, data: response };
    } catch (err) {
        err.message = `getSubscriber-> ${err.message}`;
        throw err;
    }
};

const custPkServicesObject = async (custPkId, services) => {
    try {
        const servicesArr = [];
        let servicesObject;
        for (const service of services) {
            // Get how many subscriber he has
            let sumSubscribers;
            if ([201, 202].includes(service.customerType)) {
                sumSubscribers = service.countSubs ? service.countSubs : 0;
            } else {
                sumSubscribers = await getSubscriber({ custPkId, serviceId: service.customerType });
                if (sumSubscribers.status === 200) sumSubscribers = (sumSubscribers.data).length;
            }

            servicesObject = {
                serviceId: service.customerType,
                serviceLabel: service.customerDescriptionHeb,
                sumSubscribers: sumSubscribers || 0,
            };
            if (service.customerType === 201) {
                servicesObject.agentId = service.agentId;
                servicesObject.customerId = service.customerId;
            }
            servicesArr.push(servicesObject);
        }

        return servicesArr;
    } catch (err) {
        err.message = `custPkServicesObject-> ${err.message}`;
        throw err;
    }
};

const paymentsObject = async (payments) => {
    try {
        const paymentsArr = [];
        for (const payment of payments) {
            const paymentObject = {
                paymentId: payment.paymentId,
                fourDigitsCreditCard: payment.fourDigitsCreditCard,
                creditCardExpiration: payment.creditCardExpiration,
                status: payment.status,
            };
            paymentsArr.push(paymentObject);
        }
        return paymentsArr;
    } catch (err) {
        err.message = `paymentsObject-> ${err.message}`;
        throw err;
    }
};

const getPayment = async (params, action_type = null) => {
    try {
        let data = await customersModel.getPaymentModel(params, action_type);
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        data = await paymentsObject(data);
        return { status: 200, data };
    } catch (err) {
        err.message = `getPayment-> ${err.message}`;
        throw err;
    }
};

const getAgreement = async (params) => {
    try {
        const data = await customersModel.getAgreementModel(params);
        if (isEmpty(data)) {
            if (params.agreementId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 };// There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getAgreement-> ${err.message}`;
        throw err;
    }
};

const serviceObject = async (params, service) => {
    try {
        const creditCards = await getPayment(params, 1);
        const sumPayments = creditCards.data ? creditCards.data.length : 0;
        const agreements = await getAgreement(params);
        const wallets = [];
        let response = {};
        let data;
        let sellerType = 'shop';
        switch (params.serviceId) {
        case '201':
            params.serviceId = null;
            data = await customersModel.getCustomerModel(params, -99);
            sellerType = data.some((customer) => customer?.customerType === 130) ? 'agent' : sellerType; // default is shop. if has customerType 130 => than it's agent
        case '202':
            response = {
                customerPrimary: {
                    custPkId: params.custPkId ? service.custPkId : null,
                    label: service.custPkName ? service.custPkName : null,
                },
                createdBy: {
                    custPkId: service.creationUserId ? service.creationUserId : null,
                    label: service.creationUserName ? service.creationUserName : null,
                    date: service.effectiveDateFrom ? convertToJSDateFormat(service.effectiveDateFrom) : null,
                },
                sellerType,
            };
            break;
        default:
            if (agreements.status === 200 && !isEmpty(agreements)) {
                for (const agreement of agreements.data) {
                    switch (params.serviceId) {
                    case '7':
                        if ([999, 1822].includes(agreement.agreementType)) {
                            wallets.push({
                                agreementId: agreement.agreementId,
                                agreementType: agreement.agreementType,
                                agreementName: agreement.name,
                                agreementValue: agreement.agreementValue,
                            });
                        }
                        break;
                    default:
                        break;
                    }
                }
            }
            response = {
                customerId: service.customerId,
                firstName: service.firstName,
                lastName: service.secondName,
                customerPrimary: {
                    custPkId: params.custPkId,
                    label: service.custPkName ? service.custPkName : null,
                },
                idType: {
                    id: service.idType,
                    label: service.idType === 1 ? 'id' : 'passport',
                },
                nationalId: service.nationalId,
                customerStatus: {
                    id: service.customerStatus,
                    label: service.customerStatus === 1 ? 'פעיל' : 'סגור',
                },
                createdBy: {
                    custPkId: service.creationUserId ? service.creationUserId : null,
                    label: service.creationUserName ? service.creationUserName : null,
                    date: service.effectiveDateFrom ? convertToJSDateFormat(service.effectiveDateFrom) : null,
                },
                info: {
                    contactPhoneNumber: service.contactNo ? `0${service.contactNo}` : null,
                    email: service.mainEmail ? service.mainEmail : null,
                    address: {
                        city: {
                            id: service.cityCode ? service.cityCode : null,
                            label: service.cityName ? service.cityName : null,
                        },
                        street: {
                            id: service.streetCode ? service.streetCode : null,
                            label: service.streetName ? service.streetName : null,
                        },
                        houseNumber: service.house ? service.house : null,
                    },
                    language: {
                        id: service.langCode ? service.langCode : null,
                        label: service.lanNameHeb ? service.lanNameHeb : null,
                    },
                },
                paymentMethods: {
                    sumCreditCards: sumPayments,
                    wallets,
                },
            };
        }
        return response;
    } catch (err) {
        err.message = `serviceObject-> ${err.message}`;
        throw err;
    }
};

const getCustomer = async (params, action_type = null) => {
    try {
        let data = await customersModel.getCustomerModel(params, action_type);

        if (isEmpty(data)) {
            if (params.custPkId && action_type !== -99) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 };// There are no records
        }

        if (params.serviceId) data = await serviceObject(params, data[0]); // Specific service
        else if (action_type === -99) data = await custPkServicesObject(params.custPkId, data); // All services of custPk
        else data = await custPkCustomerObject(data[0]); // Specific custPk

        return { status: 200, data };
    } catch (err) {
        err.message = `getCustomer-> ${err.message}`;
        throw err;
    }
};

const setAgreement = async (req, params, action_type = 0) => {
    try {
        const data = await customersModel.setAgreementModel(req, params, action_type);
        if (data.res < 0) {
            let code;
            switch (data.res) {
            case -9:
                code = 20171; // No found agreement id with this cust_pk and this type
                break;
            default:
                code = data.res * -1;
            }
            return { status: 400, code };
        }
        return { status: 201, data };
    } catch (err) {
        err.message = `setAgreement-> ${err.message}`;
        throw err;
    }
};

const setPayment = async (body, params, action_type = 0) => {
    try {
        insertLogger({
            end_point: 'setPayment cardDetails',
            logTitle: 'setPayment cardDetails',
            data: body,
            type: 'INFO',
            code: 1,
        });
        // action_type: 0-add 1-update 2-delete
        if (action_type === 2) {
            body.status = 0;
            action_type = 1;
        }
        if (params.serviceId === '200') return { status: 400, code: 20173 };

        if (body.creditCardToken) await providerIdByCreditCardToken(body);
        const data = await customersModel.setPaymentModel(body, params, action_type);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        if (action_type > 0) return { status: 200, data };
        return { status: 201, data };
    } catch (err) {
        err.message = `setPayment-> ${err.message}`;
        throw err;
    }
};

const getStock = async (params) => {
    try {
        const customerId = await getCustomerIdByCustPkAndServiceId(params.custPkId, params.serviceId);
        const data = await customersModel.getStockModel(customerId.data);
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 201, data };
    } catch (err) {
        err.message = `getStock-> ${err.message}`;
        throw err;
    }
};

const getStockProduct = async (params) => {
    try {
        const customerId = await getCustomerIdByCustPkAndServiceId(params.custPkId, params.serviceId);
        const data = await customersModel.getStockProductModel(customerId.data, params.productId);
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getStockProduct-> ${err.message}`;
        throw err;
    }
};

const getCashboxSubscribers = async (req) => {
    try {
        // Integrity checks
        if ((req.query.limit && !(/^[1-9]\d*$/.test(req.query.limit)))
            || (req.query.q && (!(/^[\sא-ת]+$/.test(req.query.q)) || (req.query.q).length < 3))
            || (req.query.serviceId && [201, 202].includes(req.query.serviceId)) // cashbox & safebox
        ) return { status: 204, code: 3006 }; // There are no records

        const data = await customersModel.getCashboxSubscribersModel(req);
        if (isEmpty(data)) return { status: 204, code: 3006 }; // There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getCashboxSubscribers-> ${err.message}`;
        throw err;
    }
};

const errorCashbox = async (res) => {
    let code;
    switch (res) {
    case -3:
        code = 20401; // status must be 1 or 2
        break;
    case -4:
        code = 20402; // not found this cashbox
        break;
    case -5:
        code = 20403; // subscriber not exsit
        break;
    case -6:
        code = 20404; // this cashbox not open on this sales
        break;
    case -7:
        code = 20405; // Deny a subscriber from opening a casheir foir himself
        break;
    case -11:
        code = 20400; // Difference in cashbox's amount
        break;
    default:
        code = res;
    }
    return { status: 400, code };
};

const calcAmount = async (money, reCash = false, status = 3) => {
    // reCash = true - rollback close cashbox
    // status = 1 - open cashbox
    //          2 - close cashbox
    //          3-  cash transfer
    let amount = 0;
    for (const cash of money) {
        const currency = cash.currency ? cash.currency : cash.currencyType;
        if (status === 1 && currency !== 3 && !reCash) return -1;
        const rate = await getCurrencyRateModel(currency);
        const coinType = cash.coinType ? cash.coinType : 1;
        amount += rate * cash.amount * coinType;
    }
    return amount;
};

const setCash = async (subscriberId, agentId, money, custPkId, serviceId, status = 3, reCash = false) => {
    // status = 1 - open cashbox
    //          2 - close cashbox
    //          3 - cash transfer
    try {
        let vSubscriberId;
        let customerType;
        switch (status) {
        case 1:
            vSubscriberId = subscriberId;
            customerType = await customersModel.getCustomerTypeModel(1, await customersModel.getSubscriberIdByAgentIdModel(agentId));
            break;
        case 3:
            vSubscriberId = subscriberId;
            customerType = await customersModel.getCustomerTypeModel(1, agentId);
            break;
        case 2:
            vSubscriberId = await customersModel.getSubscriberIdByAgentIdModel(subscriberId);
            customerType = await customersModel.getCustomerTypeModel(1, await customersModel.getSubscriberIdByAgentIdModel(subscriberId));
            break;
        default:
            break;
        }
        const params = {
            custPkId,
            serviceId,
            subscriberId: vSubscriberId,
        };
        const wallets = await customersModel.getDataBalanceModel(params);
        const currencyTypesObj = getCurrencyTypeObject();
        const cashboxContents = money.map((x) => ({ // change cursor to object's array
            AMOUNT: x.amount ? x.amount * (x.coinType ? x.coinType : 1) : 0,
            CURRENCY: x.currency ? x.currency : x.currencyType,
        }));
        if (!reCash && status !== 2) { // For close cashbox not check difference
            for (const cashbox of cashboxContents) {
                const difference = wallets[0][currencyTypesObj[cashbox.CURRENCY]] - cashbox.AMOUNT;
                if (difference < 0) return { status: 400, code: 20409 }; // There is not enough balance in the wallet
            }
        }

        const amount = await calcAmount(money, reCash, status);
        if (![201, 202].includes(customerType) || !['201', '202'].includes(serviceId)) return { status: 400, code: 20413 }; // Not in cash register or safe box service
        if (status === 3 && amount > 800 && serviceId === '201' && customerType === 201) return { status: 400, code: 20412 };// It is not possible to transfer over NIS 800
        const data = await customersModel.setCashTransferModel(subscriberId, agentId, amount, cashboxContents, status);

        if (data < 0) return errorCashbox(data);
        return { status: 200, data: { res: data } };
    } catch (err) {
        err.message = `setCash-> ${err.message}`;
        throw err;
    }
};

const associationCashbox = async (params, agentId, amount, status) => {
    const data = await customersModel.associationCashboxModel(agentId, status, params.subscriberId, amount);
    if (data.substring(0, 3) === 'ERR') return await errorCashbox(parseInt(data.substring(4, 7), 10));
    return { status: 200, data: { transactionId: data } };
};

const setCashboxReport = async (cashbox, sales) => {
    const res = await customersModel.getReqCashboxModel(cashbox, sales);

    const dataCashbox = !isEmpty(res.p_data_cashbox) ? res.p_data_cashbox[0] : {};
    const dataTransactions = !isEmpty(res.p_data_transactions) ? res.p_data_transactions : {};
    const dataClosing = !isEmpty(res.p_data_closing) ? res.p_data_closing[0] : {};
    const dataCurrencys = !isEmpty(res.p_data_currencys) ? res.p_data_currencys : {};
    const dataSales = !isEmpty(res.p_data_sales) ? res.p_data_sales : {};

    let ilsFix = 0;
    let countAttemptsClose = 0;
    let saleCurrencys = {};

    const currencys = dataCurrencys.reduce((acc, sale) => {
        acc[sale.CURRENCY] = acc[sale.CURRENCY] || 0 + parseFloat(sale.DEBIT.toFixed(2));
        return acc;
    }, {});

    if (!isEmpty(dataSales)) {
        saleCurrencys = dataSales.reduce((acc, sale) => {
            const amount = acc[sale.CURRENCY_PAY] || 0;
            acc[sale.CURRENCY_PAY] = parseFloat((amount + (sale.DEBIT - sale.CREDIT)).toFixed(2));
            return acc;
        }, {});
    }

    for (const dataTransaction of dataTransactions) {
        switch (dataTransaction.TYPE_TRANSACTION) {
        case 'try close a cashbox':
            await customersModel.resetWalletsModel(sales); // reset the wallet
            ilsFix = dataTransaction.AMOUNT ? parseFloat(dataTransaction.AMOUNT.toFixed(2)) : 0;
            countAttemptsClose = 1;
            break;
        default:
            break;
        }
    }

    return {
        storeName: (`${dataCashbox.CASHBOX_NAME} : ${dataCashbox.CASHBOX_SUBS_NAME}`) || '',
        sellerName: dataCashbox.SALES_NAME || '',
        invoiceNumber: dataClosing.INTERNAL_REFERENCE_NUMBER || 0,
        date: convertToJSDateFormat(dataClosing.CREATION_ON, 'D/M/Y') || null,
        countAttemptsOpen: 0,
        countAttemptsClose,
        openShift: parseFloat(dataTransactions[0].AMOUNT.toFixed(2)) || 0,
        ils: currencys.NIS || 0,
        usd: currencys.USD || 0,
        eur: currencys.EUR || 0,
        gbp: currencys.GBP || 0,
        rub: currencys.RUB || 0,
        ilsFix,
        usdFix: 0,
        eurFix: 0,
        gbpFix: 0,
        rubFix: 0,
        saleCashIls: saleCurrencys.NIS || 0,
        saleCashUsd: saleCurrencys.USD || 0,
        saleCashEur: saleCurrencys.EUR || 0,
        saleCashGbp: saleCurrencys.GBP || 0,
        saleCredit: 0,
        saleElal: 0,
        saleCheck: 0,
        alipay: 0,
        saleAlipay: 0,
        sellerRemark: '',
    };
};

const createCashboxReport = async (params, req, data) => {
    try {
        const sales = await customersModel.getSubscriberIdByAgentIdModel(req.agentIdCashbox);
        const cashboxReportObj = await setCashboxReport(params.subscriberId, sales);
        const nameCashboxReport = `cashbox_report_${data.data.transactionId}`;
        const createReport = [{
            templateId: 26,
            vals: cashboxReportObj,
            fileName: nameCashboxReport,
            localPath: FILES_PATH_CONFIG.UPLOAD_CASHBOX_REPORT,
            encryptionPath: `${FILES_PATH_CONFIG.ENCRYPTION_CASHBOX_REPORT}`,
            signature: false,
            fileType: 5,
            customerId: req.customerIdUserCashbox,
            subscriberId: sales,
            email: {},
        }];
        await createFile(createReport);
        return 1;
    } catch (err) {
        err.message = `createCashboxReport-> ${err.message}`;
        throw err;
    }
};

const setSubscriber = async (req, params = null) => {
    try {
        let data;
        let action_type = 0; // new subscribers

        if (!params.subscriberId && (!req.subscribers || isEmpty(req.subscribers))) return { status: 400, code: 20179 };
        const customerExist = await customersModel.getCustomerModel(params);// check if customer exists
        // if (isEmpty(customerExist)) data = await setCustomer(req, params);// create the service
        // else {
        switch (params.serviceId) {
        case '201':
            if (!isEmpty(customerExist)) {
                let res = {};
                const response = await getSubscriber(params);
                let code;
                if (response.data.status.id === 1 && req.status === 1) code = 20410;// The cashbox is already open
                if (response.data.status.id === 2 && req.status === 2) code = 20411;// The cashbox is already close
                if (code) return { status: 400, code };

                const amount = await calcAmount(req.cashboxContents, false, req.status);
                if (amount < 0) return { status: 400, code: 20406 }; // Not supported in foreign currency

                switch (req.status) {
                case 1: // open cashbox
                    data = await associationCashbox(params, req.agentIdCashbox, amount, req.status);
                    if (data.status !== 200) break;
                    res = await setCash(params.subscriberId, req.agentIdCashbox, req.cashboxContents, params.custPkId, params.serviceId, 1);
                    if (res.status !== 200) { // if cash tranfer failed re-close the cashbox
                        await associationCashbox(params, req.agentIdCashbox, 0, 2);
                        data = { status: 400, code: 20407 }; // Opening cashbox failed
                        break;
                    }
                    break;
                case 2: // close cashbox
                    res = await setCash(req.agentIdCashbox, params.subscriberId, req.cashboxContents, req.custPkIdCashbox, params.serviceId, 2);
                    if (res.status !== 200) {
                        data = { status: 400, code: 20408 }; // Closing cashbox failed
                        break;
                    }
                    data = await associationCashbox(params, req.agentIdCashbox, amount, req.status);
                    if (data.status !== 200) { // if close cashbox failed re-transfer the cash
                        await setCash(params.subscriberId, req.agentIdCashbox, req.cashboxContents, req.custPkIdCashbox, params.serviceId, 1, true);
                        break;
                    }
                    createCashboxReport(params, req, data);
                    break;
                default:
                    data = { status: 400, code: 20401 };// Status must be 1 or 2
                }
                if (res.code === 20409) data = { status: 400, code: 20409 }; // There is not enough balance in the wallet
                return data;
            } return { status: 400, code: 20163 };
        default: // Create/update subscriber for other customer types
            if (!isEmpty(customerExist)) {
                if (params.subscriberId) action_type = 1; // update subscribers
                if (action_type === 0) {
                    const newSubscriberArray = await getNewSubscriberArrayWithGeneratedPhone(req.subscribers);
                    if (newSubscriberArray.status === 200) req.subscribers = newSubscriberArray.data;
                    else return { status: newSubscriberArray.status, code: newSubscriberArray.code };
                }
                data = await customersModel.setSubscriberModel(req, params, action_type);
            } else return { status: 400, code: 20163 }; // No exist this cust_pk
            if (!data.res) return { status: 400, code: 3002 }; // DB error
            if (data.res < 0) return { status: 400, code: data.res * -1 };
            if (req?.roamingToJordanEgypt) { // check if client send roamingToJordanEgypt parameter
                const response = await roamingToJordanEgyptModel({ ...req, ...params }); // Call function in model if roamingToJordanEgypt = true
                if (response !== 1) return { status: 400, code: 20174 };// If add Egypt/Jordan failed or already exist
            }
            return { status: 201, data: { subscriberId: data.res } };
        }
    } catch (err) {
        err.message = `setSubscriber-> ${err.message}`;
        throw err;
    }
};

const setCashTransfer = async (body, params) => {
    try {
        const data = await setCash(params.subscriberId, body.beneficiarySubscriberId, body.money, params.custPkId, params.serviceId);
        return data;
    } catch (err) {
        err.message = `setCashTransfer-> ${err.message}`;
        throw err;
    }
};

export {
    putCustomer,
    getCustomerTypes,
    getCustomerIdByCustPkAndServiceId,
    updateCustPk,
    setCustomer,
    setSubscriber,
    updateCustomer,
    getCustomer,
    getSubscriber,
    getAgreement,
    getPayment,
    setAgreement,
    setPayment,
    getStock,
    getStockProduct,
    setCashTransfer,
    checkSubscriberHierarchy,
    subscriberCashboxObject,
    getCashboxSubscribers,
};
