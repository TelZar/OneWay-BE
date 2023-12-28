import qrcode from 'qrcode';
import {
    getEsimNumerModel,
    getNewTzNumberModel,
    getSimDetailsModel,
    getHlrProductModel,
    setHlrProductModel,
    callForwardingModel,
    simReplaceModel,
    getCallForwardingUserInfoModel,
    getsubscriberEsimLink,
    roamingCallFilteringModel,
    setImsiInHLRModel,
    updateSimInDBModel, getRoamingPinModel,
} from '../models/cellularActions.js';
import {
    getKeyByValue, getTemplate, isEmpty, camelCaseKeys,
} from '../utils/helper.js';
import { checkSubscriberHierarchy } from './customers.js';
import { sendSMS } from '../utils/sms.js';
import { emailConstants, sendEmail } from '../utils/email.js';

const getCFU = {
    always: 87000055,
    busy: 87000056,
    unavailable: 87000057,
    noReply: 87000058,
};

const getSimDetails = async (req) => {
    try {
        const { iccid } = req.body;
        const result = await getSimDetailsModel(iccid);
        if (result.length <= 0) {
            return { status: 204, code: 3006 };
        }
        return { status: 200, result };
    } catch (err) {
        err.message = `getSimDetails-> ${err.message}`;
        throw err;
    }
};

const getNewTzNumber = async (count) => { // get new msisdn number from incoming_tourism_numbers table - that will change to db function
    try {
        const phoneNumbers = await getNewTzNumberModel(count);
        if (phoneNumbers.count <= 0) return { status: 404, code: 3002 }; // add here the result if ended numbers
        const phoneNumbers1 = phoneNumbers.result.map((item) => ({ phoneNumber: `0${item.phoneNumber}` }));
        return { status: 200, data: phoneNumbers1 };
    } catch (err) {
        err.message = `getNewTzNumber-> ${err.message}`;
        throw err;
    }
};

const getEsimNumber = async (req) => { // need to add two changes - function from db to get new phone number and when we get req.phone we need to check if this phone numer is good
    try {
        let newPhoneNumber;
        if (!req.phone) {
            const resNewPhoneNumber = await getNewTzNumber(1);
            if (resNewPhoneNumber.status !== 200) return resNewPhoneNumber;
            newPhoneNumber = resNewPhoneNumber[0].phoneNumber;
        } else newPhoneNumber = req.phone;
        const data = {};
        const stepOneRes = await getEsimNumerModel();
        let stepTwoRes;
        let status;
        // const result = stepOneRes;
        let message;
        if (stepOneRes.out_status === 1 && stepOneRes.in_msisdn === null) {
            const dataToPair = {
                type: 2,
                phone: newPhoneNumber, // new phone number
                iccid: stepOneRes.in_iccid,
            };
            stepTwoRes = await getEsimNumerModel(dataToPair); // pairing the iccid with phone number
            if (stepTwoRes && stepTwoRes.out_status === 1) message = 'The SIM has been paired successfully';
        } else {
            message = 'Error receiving a SIM number';
        }
        if (stepTwoRes && stepTwoRes.out_status === 1) {
            data.res = 'success';
            data.message = message;
            data.iccid = stepTwoRes.in_iccid;
            data.url = stepTwoRes.out_qr_url;
            data.qr = stepTwoRes.out_qr_key;
            status = 200;
        } else {
            data.res = 'fail';
            data.message = message;
            status = 500;
        }
        return { status, data };
    } catch (err) {
        err.message = `getEsimNumber-> ${err.message}`;
        throw err;
    }
};

const getQRcode = async (data) => { // activation
    try {
        const qrCode = await qrcode.toBuffer(data.url.toString(), {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 1,
            scale: 10,
        });
        const base64Image = qrCode.toString('base64');
        return { qr_code: `data:image/png;base64,${base64Image}`, activation_url: data.url };
    } catch (err) {
        err.message = `getQRcode-> ${err.message}`;
        throw err;
    }
};

const getLinkToInstallEsim = async (data) => {
    try {
        const {
            custPkId, serviceId, subscriberId, sendingDetailsTo,
        } = data;
        const subscriberHierarchy = await checkSubscriberHierarchy(custPkId, serviceId, subscriberId);
        if (subscriberHierarchy.code && subscriberHierarchy.status !== 200) return subscriberHierarchy;
        const subscriberEsimUrl = await getsubscriberEsimLink(subscriberId); // לפתח פה פונקצי השולפת פרטי מנוי
        if (subscriberEsimUrl.activationLink === '0') return { status: 204, code: 20200 }; // if dose not has esim
        if (sendingDetailsTo?.phoneNumber || sendingDetailsTo?.email) {
            const values = { // assign link to object
                esimActivationLink: subscriberEsimUrl.activationLink,
            };
            if (sendingDetailsTo?.phoneNumber) {
                const smsTemplate = await getTemplate(23, values); // get template for sms and bind the link to templates
                await sendSMS(sendingDetailsTo?.phoneNumber, smsTemplate[0].content); // send link with sms
            }
            if (sendingDetailsTo?.email) {
                const emailTemplate = await getTemplate(24, values); // get template for mail and bind the link to templates
                await sendEmail(emailConstants.adminEmail, [sendingDetailsTo?.email], 'Esim activation link', emailTemplate[0].content); // send link with email
            }
        }
        // const getEsim = getQRcode(subscriberEsimUrl);
        return { status: 200, data: subscriberEsimUrl }; // send link to client
    } catch (err) {
        err.message = `getLinkToInstallEsim-> ${err.message}`;
        throw err;
    }
};

const checkIccidValidiation = async (iccidArray) => {
    try {
        if (!Array.isArray(iccidArray)) iccidArray = [`${iccidArray}`];
        const iccidDetails = await getSimDetailsModel(iccidArray);
        // notAvailable - The SIM number is not available
        // notSupportRoaming - Sim does not support roaming
        const errorCode = { notAvailable: [], notSupportRoaming: [] };
        let errorMessage = '';
        const iccidDetailsArray = [];
        for (const iccidDetail of iccidDetails) {
            if (iccidDetail.SUBSCRIBER_ID !== null || iccidDetail.MSISDN !== null) {
                errorCode.notAvailable.push(iccidDetail.ICCID);
            } else if (iccidDetail.SIM_TYPE !== 2) {
                errorCode.notSupportRoaming.push(iccidDetail.ICCID);
            }
            iccidDetailsArray.push(iccidDetail.ICCID);
        }
        const elementsNotInIccidDetailsArray = iccidArray.filter((item) => iccidDetailsArray.indexOf(item) === -1);
        if (elementsNotInIccidDetailsArray.length > 0) {
            errorMessage = `SIM not recognized: ${elementsNotInIccidDetailsArray}`;
        } else {
            if (errorCode.notAvailable.length > 0) {
                errorMessage += ` SIM not available: ${errorCode.notAvailable.join(',')}`;
            }
            if (errorCode.notSupportRoaming.length > 0) {
                errorMessage += ` SIM not support roaming: ${errorCode.notSupportRoaming.join(',')}`;
            }
        }
        if (errorMessage !== '') {
            return { status: 400, code: 3031, info: errorMessage };
        }
        return { status: 204 };
    } catch (err) {
        err.message = `checkIccidValidiation-> ${err.message}`;
        throw (err);
    }
};

const getHlrProduct = async () => { // get all hlr products from DB
    try {
        let data = await getHlrProductModel(); // call model function
        if (isEmpty(data)) return { status: 204, code: 3006 }; // in case response is empty (there are no records)
        data = data.map((x) => ({ // change cursor to object's array
            cellularActionId: x.PRODUCT_ID,
            cellularActionName: x.NAME,
        }));
        return { status: 200, data };
    } catch (err) {
        err.message = `getHlrProduct-> ${err.message}`;
        throw err;
    }
};

const roamingCallFiltering = async (req) => { // roaming calls filtering in DB
    try {
        const data = await roamingCallFilteringModel(req);
        const { res } = data; // Destructure res
        if (res !== 1) return { status: 400, code: 3002 };// If roaming calls filtering  didn't succeed
        return { status: 201, data };
    } catch (err) {
        err.message = `roamingCallFiltering-> ${err.message}`;
        throw err;
    }
};

const getRoamingPin = async (req) => { // get access code from DB
    try {
        const accessCodeObject = { // initate object to return for client
            accessCode: null,
        };
        const data = await getRoamingPinModel(req); // get access code from DB
        if (data.toString().length > 1) accessCodeObject.accessCode = data; // assigne code to access code value
        return { status: 201, data: accessCodeObject }; // if DB return 0 - accessCode = null
    } catch (err) {
        err.message = `getRoamingPin-> ${err.message}`;
        throw err;
    }
};

const setHlrProduct = async (params) => { // set hlr product in DB
    try {
        const data = await setHlrProductModel(params); // Call model function
        const { res } = data; // Destructure res
        if (res < 1) { // If set hlr product didn't succeed
            let code;
            switch (res) { // Change result to current code error
            case -1:
                code = 20203; // Invalid action id
                break;
            case -2:
                code = 20202; // Action not found
                break;
            default:
                code = 3002; // DB error
            }
            return { status: 400, code };
        }
        return { status: 201, data };
    } catch (err) {
        err.message = `setHlrProduct-> ${err.message}`;
        throw err;
    }
};

const setImsiInHLR = async (req) => { // need to add two changes - function from db to get new phone number and when we get req.phone we need to check if this phone numer is good
    try {
        const data = {};
        let status;
        const result = await setImsiInHLRModel(req.phoneNumber, req.iccidNumber);
        if (result === 'OK') {
            data.res = true;
            status = 200;
        } else {
            data.res = false;
            data.message = result;
            status = 400;
        }
        return { status, data };
    } catch (err) {
        err.message = `setImsiInHLR-> ${err.message}`;
        throw err;
    }
};

const callForwarding = async (req) => { // Set call forward in DB
    try {
        const arrayOfCallForwardingObjects = [];
        if (req.always.status) { // if always.status = true send only 'always object'
            const callForwardingObject = { // set desirable values in relavent object keys
                action_id: req.always.status ? 1 : 0,
                product_id: getCFU.always,
                cfu_msisdn: req.always.phoneNumber ? Number(req.always.phoneNumber) : null,
            };
            arrayOfCallForwardingObjects.push(callForwardingObject); // push only 'always object' to array that send to DB
        } else {
            for (const [key, value] of Object.entries(req)) {
                if (Object.keys(getCFU).includes(key)) { // check if key is an 'getCFU' object
                    const callForwardingObject = { // set desirable values in relavent object keys
                        action_id: value.status ? 1 : 0,
                        product_id: getCFU[key],
                        cfu_msisdn: value.phoneNumber ? Number(value.phoneNumber) : null,
                    };
                    arrayOfCallForwardingObjects.push(callForwardingObject); // push object to array that send to DB
                }
            }
        }
        req.cfu_obj = arrayOfCallForwardingObjects;
        const data = await callForwardingModel(req); // Call model function
        const { res } = data; // Destructure res
        let code;
        if (res < 1) {
            switch (res) { // Change result to current code error
            case -1:
                code = 20205; // Invalid action id
                break;
            case -2:
                code = 20206; // Action not found
                break;
            case -3:
                code = 20207; // Action not found
                break;
            case -4:
                code = 20202; // Action not found
                break;
            case -5:
                code = 3002; // Action not found
                break;
            default:
                code = 3002; // DB error
            }
            return { status: 400, code };
        }
        return { status: 201, data };
    } catch (err) {
        err.message = `callForwarding-> ${err.message}`;
        throw err;
    }
};

const updateSimInDB = async (data) => { // need to add two changes - function from db to get new phone number and when we get req.phone we need to check if this phone numer is good
    try {
        const {
            phoneNumber, imsi, subscriberId, hlrMSISDN,
        } = data;
        let status;
        const result = await updateSimInDBModel(phoneNumber, imsi, subscriberId, hlrMSISDN);
        if (result === 'OK') {
            data.res = true;
            status = 200;
        } else {
            data.res = false;
            data.message = result;
            status = 400;
        }
        return { status, data };
    } catch (err) {
        err.message = `updateSimInDB-> ${err.message}`;
        throw err;
    }
};

const getCallForwardingUserInfo = async (req) => { // Get call forwarding info from DB
    try {
        const data = await getCallForwardingUserInfoModel(req); // Call function in model
        const types = { // Initate object
            always: {}, busy: {}, unavailable: {}, noReply: {},
        };
        if (!data.length) return { status: 204, code: 3006 }; // In case response is empty (there are no records)
        data.forEach((x) => { // Assigne every object in array to the 'types' object that will send to the client
            const name = getKeyByValue(getCFU, x.PRODUCT_ID); // Get the key name by value that recived from DB
            types[name] = { // Assigne relevant key in object with matching details from DB
                status: x.ISSERVICEACTIVE !== 0,
                phoneNumber: x.CFU_NUMBER,
            };
            if (name === 'noReply') types[name].forwardingAfterTime = x.CFU_DELAY_TIME; // Add CFU_DELAY_TIME only in key is 'noReply'
        });
        return { status: 200, data: types }; // Return object of object's to client
    } catch (err) {
        err.message = `getCallForwardingUserInfo-> ${err.message}`;
        throw err;
    }
};

const simReplace = async (req) => { // Replace sim in DB
    try {
        const response = await simReplaceModel(req);
        const { p_res, p_res_cur } = response; // Destructure res
        if (p_res < 1) return { status: 400, code: 3002 };// If set Replace sim failed
        // if sim replaced successfully -> attached it to subscriber
        if (req.simTypeId === 2) {
            req.simTypeId = 3; // change sim type to sim attachment
            if (!p_res_cur[0].ICCID) return { status: 400, code: 20209 };// In case iccid didn't return from db
            req.simIccid = p_res_cur[0].ICCID; // send the iccid that recived from db
            return await simReplace(req);
        }
        const isDetailsExist = req.simTypeId !== 1 ? camelCaseKeys(p_res_cur) : null;
        const data = {
            res: p_res,
            details: isDetailsExist ? isDetailsExist[0] : null,
        };
        if (req) return { status: 201, data }; // send to the client the result and the details from db
    } catch (err) {
        err.message = `simReplace-> ${err.message}`;
        throw err;
    }
};

export {
    getSimDetails,
    getEsimNumber,
    getQRcode,
    getLinkToInstallEsim,
    getNewTzNumber,
    checkIccidValidiation,
    getHlrProduct,
    roamingCallFiltering,
    setHlrProduct,
    setImsiInHLR,
    callForwarding,
    updateSimInDB,
    getCallForwardingUserInfo,
    getRoamingPin,
    simReplace,
};
