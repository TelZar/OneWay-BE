import run from '../db/connect.js';

class AppError extends Error {
    constructor(errorCode, message) {
        super(message);
        this.errorCode = errorCode;
        this.message = message;
    }
}

const getErrorMsg = async (code) => {
    const sql = `select error_description
                 from errors_status
                 where error_id = : error_id`;
    const bind = [code];
    const msg = await run(sql, bind, 'row');
    return msg[0].ERROR_DESCRIPTION;
};

const successStatuses = [200, 201, 202, 204];

const errorJson = {
    // Validation error per field
    1000: 'Required field',
    1001: 'Invalid length ',
    1002: 'Required field',
    1003: 'Must be non-numeric',
    1004: 'Must be an integer number',
    1005: 'Field must be boolean',
    1008: 'Invalid value',
    1009: 'Invalid phone',
    1010: 'Missing fields',
    1011: 'Invalid email',
    1012: 'Must be an array',
    1013: 'Must be numeric array',
    1014: 'The number of columns is incorrect',
    1015: 'Invalid format date',
    1016: 'UserName must be phone or email',
    1017: 'must be string',
    1018: 'value must be true',

    // Validation error general
    2001: 'Username does not exist or password is incorrect',
    2002: 'Customer does not exist',
    2003: 'The password is incorrect',
    2004: 'The field does not exist',
    2006: 'Customer under the legal age',
    2007: 'Credit card expiration is not valid',
    2008: 'User does not have permission for this action',
    2009: 'No access to the system at this time',
    2010: 'No access',
    2011: 'Owner_id or reason_id not exist',
    2012: 'You do not have access to this entity',
    2013: 'No access to hash query',

    // Process errors
    3000: 'General token error',
    3001: 'OTP generating error',
    3002: 'DB error',
    3003: 'Server error',
    3004: 'The media format of the requested data is not supported by the server',
    3005: 'Not found path',
    3006: 'There are no records',
    3007: 'Inappropriate method',
    3008: 'Token does not exist or expired',
    3009: 'File type not allowed',
    3010: 'cronJob DeleteFiles Error',
    3011: 'Password generating error',
    3012: 'Asocciate card JB failed',
    3013: 'No credit',
    3014: 'Payment failed',
    3015: 'No authentication was performed for the operation',
    3016: 'The payment was made but an error occurred in the transaction',
    3017: 'Product must be associated to a Wallet Category',
    3018: 'Product must be associated to a one Wallet Category only',
    3019: 'The refund was made but an error occurred in the transaction',
    3020: 'Refund failed',
    3021: 'Transaction has already been made',
    3022: 'Oracle connection timed out',
    3023: 'The payment was made successfully but there is an error in creating an invoice',
    3024: 'The total of the payment contents is less than the transaction amount',
    3025: 'No transaction details found',
    3026: 'Bad email request',
    3027: 'Missing data for credit',
    3028: 'Credit amount higher than transaction price',
    3029: 'Attempt to credit components that were not in the original deal',
    3030: 'Attempting to credit non-creditable products',
    3031: 'sim validation faild',
    3032: 'update order failed',
    3033: 'Encryption server error',
    3034: 'Save file error',
    3035: 'File do not exist',
    3036: 'Cors error',

    // DB errors
    20001: 'The value entered is not valid',
    20002: 'There are already records with this name',
    20003: 'Attempt to insert null value',
    20004: 'Alert, no changes were made',
    20006: 'password has expired',
    20007: 'The password entered does not match the record in the system',
    20009: '3 incorrect login attempts detected. Try again in the next 10 minutes',
    20010: 'Invalid OTP. OTP valid for 2 minutes',
    20999: 'General error',
    20152: 'Session has expired for current user login',
    20154: 'Verification timeout expired',
    20155: 'Incorrect password , login denied',
    20159: 'Password has already been used',
    20160: 'Too many login attempts or user is locked',
    20161: 'User is locked',

    // Customers
    20162: 'Customer exist',
    20163: 'No exist this cust_pk',
    20164: 'Validation err',
    20165: 'Cust_pk not null and customer_type = 200',
    20166: 'cust_pk = null and customer_type <> 200',
    20167: 'No found this cust_pk with this type',
    20168: 'No found this subscriber_id',
    20169: 'No found agreement id with this cust_pk and this type',
    20170: 'Customer\'s phone already exists',
    20171: 'No found agreement id with this cust_pk and this type',
    20172: 'contactPhoneNumber required',
    20173: 'Lead can\'t get payment method',
    20174: 'Add roaming to Jordan Egypt failed',
    20175: 'Phone Number or Email already exist',

    // Subscribers
    20176: 'Subscriber exist',
    20177: 'Rate not found',
    20178: 'Category not found',
    20179: 'Subscriber Required',
    20180: 'Not allowed to update subscriber\'s phone number',
    20181: 'No found this subscriber_id with this type and cust_pk_id',
    20182: 'The subscriber was created successfully, an error in saving on log activity',

    // CellularAction
    20200: 'No link was found to install the ESIM',
    20201: 'There are not enough numbers in the pool',
    20202: 'Action not found',
    20203: 'Invalid action id',
    20204: 'Failed to Attach sim in DB table',
    20205: 'Cannot find msisdn',
    20206: 'Cannot find imsi',
    20207: 'Cannot find product external',
    20208: 'Failed to Attach sim in HLR',
    20209: 'There are not enough iccid numbers in the pool, please call support',
    20210: 'Failed to generate new phone number',
    20211: 'SIM number must be 19 or 20 characters',

    // Stock
    20300: 'There is a serial product with the same serial number',
    20301: 'There were no changes',
    20302: 'Out of stock',
    20303: 'Does not exist in agent\'s rate',
    20304: 'Not enough in stock',
    20305: 'Switch to invalid status',
    20306: 'Sale action requires soldTo',
    20307: 'StockId not found',
    // Products
    20308: 'Does not exist',
    20309: 'There were no changes',
    20310: 'The product cannot be associated with more than one wallet',

    // cashbox
    20400: 'Difference in cashbox\'s amount',
    20401: 'Status must be 1 or 2',
    20402: 'Not found this cashbox',
    20403: 'Subscriber not exsit',
    20404: 'This cashbox not open on this sales',
    20405: 'Deny a subscriber from opening a casheir for himself',
    20406: 'Not supported in foreign currency',
    20407: 'Opening cashbox failed',
    20408: 'Closing cashbox failed',
    20409: 'There is not enough balance in the wallet',
    20410: 'The cashbox is already open',
    20411: 'The cashbox is already close',
    20412: 'It is not possible to transfer over NIS 800',
    20413: 'Not in cash register or safe box service',

    // auth
    30000: 'Token error',
    30001: 'grantType not valid',
    30002: 'clientId & clientSecret do not match',
    30004: 'Generate OTP Error',
    30005: 'Details do not match',
};
function setFormatForExpressValidator(err) {
    try {
        if (!Object.keys(err).length) return;
        const errorView = err.reduce((acc, curr) => {
            acc[curr.param] = {
                code: curr.msg,
                message: errorJson[curr.msg],
            };
            return acc;
        }, {});
        return errorView;
    } catch (error) {
        err.message = `setFormatForExpressValidator-> ${err.message}`;
        throw (err);
    }
}
function setFormatValidErr(code = 0, info = {}, defaultInfo = { freeText: '', title: 'general' }) {
    const errorView = {};
    info = { ...defaultInfo, ...info };
    errorView[info.title] = {
        code,
        message: info.freeText || errorJson[code],
    };
    return errorView;
}

export {
    AppError,
    setFormatValidErr,
    setFormatForExpressValidator,
    getErrorMsg,
    successStatuses,
};
