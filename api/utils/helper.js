import moment from 'moment/moment.js';
import camelCase from 'camelcase';
import axios from 'axios';
import mustache from 'mustache';
import dbQuery from '../db/connect.js';

const getRandomId = (length = 19) => (Math.random().toString(36) + Date.now().toString(36)).substring(2, length);

// Get the current timestamp in milliseconds, and then divide by 1000 to convert it to seconds
export const timestamp = Math.floor(Date.now() / 1000);

function checkIfIsNumericArr(arr) {
    if (!Array.isArray(arr)) return Promise.reject(1012); // Must be an array
    if (!arr.every(Number.isInteger)) return Promise.reject(1013); // Must be numeric array
    return true;
}

// Convert the keys of an array of objects to camelCase
const camelCaseKeys = (jsonArray) => {
    const camelCasedJsonArray = jsonArray.map((obj) => {
        const camelCasedObj = {};
        Object.keys(obj).forEach((key) => {
            camelCasedObj[camelCase(key)] = obj[key];
        });
        return camelCasedObj;
    });
    return camelCasedJsonArray;
};

// Convert a camelCase string to UpperCase With Underscore
function convertCamelCaseToUpperCaseWithUnderscore(camelCaseParameter) {
    // try {
    if (typeof camelCaseParameter !== 'string') {
        return camelCaseParameter;
    }
    return camelCaseParameter.replace(/([A-Z])/g, '_$1').toUpperCase();
    // } catch (err) {
    //     console.log('convertCamelCaseToUpperCaseWithUnderscore err: ', err.message);
    // }
}

// Convert the keys of an object to UpperCase With Underscore
function convertKeysToUpperCaseWithUnderscore(obj) {
    const convertedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const convertedKey = convertCamelCaseToUpperCaseWithUnderscore(key);
            convertedObj[convertedKey] = obj[key];
        }
    }
    return convertedObj;
}

function addYears(date, years) {
    date.setFullYear(date.getFullYear() + years);
    return moment(date).format('YYYY/MM/DD');
}

const ageCustomer = async (value, { req }) => {
    if (await addYears(new Date(value), 18) > moment(new Date()).format('YYYY/MM/DD')) throw new Error(2006);
};

export const filterZeroOrEmpty = (objArr) => objArr.map((obj) => {
    const filteredObj = {};
    for (const key in obj) {
        if (obj[key] !== null && obj[key] != 0) {
            filteredObj[key] = obj[key];
        }
    }
    return filteredObj;
});

function arrayNesting(data, id, parent_id, fieldNesting) {
    function toNested(data, pid = 0, fieldNesting) {
        return data.reduce((r, e) => {
            if (pid === e[parent_id]) {
                const object = { ...e };
                const children = toNested(data, e[id], fieldNesting);
                if (children.length) object[fieldNesting] = children;
                r.push(object);
            }
            return r;
        }, []);
    }
    return data.filter((item) => data.find((element) => element[id] === item[parent_id]) === undefined).map((item) => toNested(data, item[parent_id], fieldNesting)[0]);
}

// Replace values from object keys in nesting
function replaceValue(obj, keysToReplace, placeholder) {
    for (const key in obj) {
        if (keysToReplace.includes(key) && typeof obj[key] !== 'object') {
            obj[key] = placeholder;
        } else if (typeof obj[key] === 'object') {
            replaceValue(obj[key], keysToReplace, placeholder);
        }
    }
}
export const getAgreementValueBylabel = (agreements, label) => {
    const agreement = agreements.find((a) => a.description === label);
    return agreement ? agreement.agreementValue : null;
};

export const getAgreementNameBylabel = (agreements, label) => {
    const agreement = agreements.find((a) => a.description === label);
    return agreement ? agreement.aName : null;
};

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function axiosCreate() {
    axios.create({
        baseURL: process.env.CG_POST_URL_EMV,
        timeout: 36000000,
    });
}

function pagination(array, offset = 0, limit = 10) {
    const result = array.slice(offset, Number(offset) + Number(limit));
    const totalPages = Math.ceil(array.length / limit);
    return {
        data: result,
        offset,
        totalPages,
        limit,
    };
}

const getTemplate = async (templateId, params = {}) => {
    try {
        // Send to function
        const sql = 'call getTemplate(:p_template_id)';
        const bind = { p_template_id: templateId };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        if (res.length === 0) return -1;
        if (params) res[0].content = Object.keys(params).length > 0 ? mustache.render(res[0].content, params) : res[0].content;
        return res;
    } catch (err) {
        err.message = `getTemplate-> ${err.message}`;
        throw (err);
    }
};

export function isIsraeliPhoneNumber(phoneNumber) {
    // Remove any non-digit characters from the phone number
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    // Check if the phone number matches the Israeli pattern
    const isIsraeliNumber = /^0(5\d|7[6-9])\d{7}$/.test(cleanPhoneNumber);

    return isIsraeliNumber;
}

const extractProperties = (input, ...properties) => input.map((obj) => properties.map((property) => obj[property]));

const convertToMinutes = function (timeString) {
    const timeUnits = { m: 1, h: 60, d: 1440 };
    const unit = timeString.slice(-1);
    return parseInt(timeString, 10) * timeUnits[unit] || 0;
};

const convertToSeconds = function (timeString) {
    const timeUnits = {
        s: 1, m: 60, h: 3600, d: 86400,
    }; // Adjusted time units for seconds
    const unit = timeString.slice(-1);
    return parseInt(timeString, 10) * timeUnits[unit] || 0;
};

function convertToJSDateFormat(inputDate, inputFormat = 'YYYY-MM-DDTHH:mm:ss.sssZ', from = null) {
    try {
        const inputFormatFrom = from || inputFormat;
        return moment(inputDate, inputFormatFrom).format(inputFormat);
    } catch (error) {
        return null;
    }
}

const providerIdByCreditCardToken = async (data) => {
    const creditCardFirstDigit = data.creditCardToken.toString()[0];
    switch (creditCardFirstDigit) {
    case '3':
        data.providerId = 'American Express';
        break;
    case '4':
        data.providerId = 'Visa';
        break;
    case '5':
        data.providerId = 'Mastercard';
        break;
    case '6':
        data.providerId = 'Discover Card';
        break;
    default:
        data.providerId = null;
        break;
    }
};
function getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value);
}

function getCurrencyTypeObject() {
    return {
        1: 'USD',
        2: 'EURO',
        3: 'NIS',
        4: 'POUND',
        5: 'RUBLE',
        6: 'PESO',
        7: 'RENMINBI',
    };
}

export {
    getRandomId,
    checkIfIsNumericArr,
    camelCaseKeys,
    convertKeysToUpperCaseWithUnderscore,
    addYears,
    ageCustomer,
    arrayNesting,
    isEmpty,
    replaceValue,
    extractProperties,
    axiosCreate,
    getTemplate,
    pagination,
    convertToMinutes,
    convertToSeconds,
    convertToJSDateFormat,
    providerIdByCreditCardToken,
    getKeyByValue,
    getCurrencyTypeObject,
};
