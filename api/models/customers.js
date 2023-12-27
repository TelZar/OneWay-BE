import 'dotenv/config';
import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { camelCaseKeys, convertKeysToUpperCaseWithUnderscore, isEmpty } from '../utils/helper.js';
import { getTokenForCard } from '../controllers/transactions.js';
import { insertLogger } from '../utils/logger.js';
import { filterByCols, objToArray } from '../controllers/search.js';
import { getSearchDataFromOracle } from './search.js';

const getCustomerTypesModel = async () => { // Include subscribers & files
    try {
        const sql = 'begin :result := bya.get_customer_type(); end;';
        const bind = {};
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getCustomerTypesModel-> ${err.message}`;
        throw (err);
    }
};

const getDataCustomerModel = async (data) => { // Include subscribers & files
    try {
        const sql = 'begin :result := add_customer.get_data(in_customer_id => :in_customer_id); end;';
        const bind = { in_customer_id: data.customerId };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getDataCustomerModel-> ${err.message}`;
        throw (err);
    }
};

const getAgreementsCustomerModel = async (customerId) => {
    try {
        const sql = 'begin :result := add_customer.get_data_agreements(in_customer_id => :in_customer_id);end;';
        const bind = { in_customer_id: customerId };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getAgreementsCustomerModel-> ${err.message}`;
        throw (err);
    }
};

const getToken = async (req) => {
    try {
        if (/* req.customerType === 110 && */ req.creditCardToken) {
            const request = await getTokenForCard({ cardNo: req.creditCardToken, cardExpiration: req.creditCardexpiration });

            if (request) req.creditCardToken = request.data.cardId;
            else req.creditCardToken = null;
        }
    } catch (err) {
        err.message = `getToken-> ${err.message}`;
        throw (err);
    }
};

const checkCustomerModel = async (key_check, value_check, nationalId) => {
    try {
        const sql = 'begin :result := if_user_exists(p_key => :p_key, p_value => :p_value, p_national_id => :p_national_id);end;';
        const bind = {
            p_key: key_check,
            p_value: value_check,
            p_national_id: nationalId,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.NUMBER);
        return resultDB;
    } catch (err) {
        err.message = `checkCustomerModel-> ${err.message}`;
        throw (err);
    }
};

const putCustomerModel = async (fileName) => {
    try {
        const sql = `begin Monox_load_file.monox_file2load(in_rep_file_name => :in_rep_file_name,
                                                          in_startrow => :in_startrow,
                                                          out_code => :out_code,
                                                          out_message => :out_message);end;`;
        const bind = {
            in_rep_file_name: fileName,
            in_startrow: 3,
            out_code: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, value: null },
            out_message: { type: oracledb.STRING, dir: oracledb.BIND_OUT, value: null },
        };

        const success = dbQuery(sql, bind, '', 'proc');
        return success;
    } catch (err) {
        err.message = `putCustomerModel-> ${err.message}`;
        throw (err);
    }
};

const getProfessions = async (type, val) => {
    try {
        const sql = `begin :result := get_professions(v_a_id => :v_a_id,
                             v_type => :v_type);end;`;
        const bind = {
            v_a_id: val,
            v_type: type,
        };
        const data = dbQuery(sql, bind, oracledb.CURSOR);
        return data;
    } catch (err) {
        err.message = `getProfessions-> ${err.message}`;
        throw (err);
    }
};

const AGREEMENTS_TYPES = {
    default_wallet: 999, // number
    // הסכמים ללקוח מונוקס : 2465
    customer_commission: 1800, // number
    employer_to_compensation: 1801, // number
    employer: 1802, // number
    gender: 1803, // 1- זכר, 2- נקבה
    customer_identification_statement: 1804, // path
    tin: 1805, // number
    additional_identification_document: 1806, // path
    immigration_authority_document: 1807, // path
    money_source: 1808, // 1-קבלת שכר , 2-הנגשת אשראי , 3-העברה עצמית
    expected_monthly_deposit: 1809, // 1- עד 5,000 ש"ח, 2- עד 10,000 ש"ח, 3- עד 25,000 ש"ח, 4- עד 50,000 ש"ח
    expected_use_money: 1810, // 1- העברה למשפחה בחול, 2- משיכה מכספומט, 3- שימוש בבתי עסק, 4- כל התשובות נכונות
    previous_issue_refusal: 1811, // 1/0
    agreement_letter: 1812, // name of file?
    save_bank_account_number: 1813, // 1/0
    agreement_rewire_gmt: 1814, // 1/0
    agreement_debiting_transfer: 1815, // name of file?
    nis_balance: 1816, // number
    usd_balance: 1817, // number
    countries_allowed_transfer: 1818, // מדינות מורשות להעברה
    money_transfer_restrictions: 1819, // הגבלות העברת כספים
    // קטגוריית ארנקים : 123
    regular_products: 1820, // number
    expensive_products: 1821, // number
    cellular_products: 1822, // number
    //
    cash_collectionShekels: 1823, // גביית מזומן שקלי
    check_collection: 1824, // גביית שיק
    stock_products: 1830, // number
    dollars_collection: 1831, // number
    euro_collection: 1832, // number
    // הסכמים לסוכן : 2379
    sub_to_role_id: 1853, // כפיפות = role_id
    rate_id: 1854,
    // customers
    privacy_and_policy: 1855,
    terms_of_use: 1856,

    euro_balance: 1857,
    gbp_balance: 1858,
};

const CUSTOMER_DETAILS = {
    CUST_PK_ID: null, // number
    CUSTOMER_TYPE: 200, // Lead // number
    FIRST_NAME: null, // Hebrew first name // varchar2(128)
    MIDDLE_NAME: null, // Hebrew second name // varchar2(128)
    SECOND_NAME: null, // varchar2(128)
    COMMERCIAL_NAME: null, // varchar2(128)
    LANG_CODE: null, // number
    ID_TYPE: null, // 1-id 2-passport // number
    NATIONAL_ID: null, // varchar2(128)
    MA_EMAIL: null, // varchar2(128)
    WEBSITE: null, // varchar2(128)
    CONTACT_NO: null, // varchar2(128)
    ADDITIONAL_PHONE: null, // varchar2(128)
    CUSTOMER_STATUS: null, // number
    LOG_LIMIT: null, // number
    RENEWABLE_PASSWORD: null, // number
    AGENT_ID: null, // db's sequence // number
    AGREEMENT_ID: null, // db's sequence // number
    COUNTRY_CODE: null, // number
    DISTRICT_CODE: null, // number
    CITY_CODE: null, // number
    STREET_CODE: null, // number
    HOUSE: null, // number
    ZIP_CODE: null, // number
    NATIONALITY: null, // number
    ISRAELI_CITIZEN: null, // number
    MARKET_GROUP: null, // number
    CURRENCY: null, // 1-USD 2-URO 3-ILS // number
    PAYMENT_METHOD: null, // number
    PAYMENT_ID: null, // db's sequence // number
    NOTE: null, // varchar2(128)
    INTERNET_USER_NAME: null, // varchar2(128)
    INTERNET_PASSWORD: null, // varchar2(128)
    EFFECTIVE_DATE_FROM: null, // date
    BILLING_CYCLE_TYPE: null, // number
    CREDIT_LIMIT: null, // number
    ROLE_ID: null, // number
    PASSPORT_VALIDITY: null, // varchar2(128)
    DATE_OF_BIRTH: null, // varchar2(128)
    AVATAR: null, // varchar2(128)
    CREATION_USER: null, // number
    FIRST_NAME_2: null, // English first name // varchar2(128)
    SECOND_NAME_2: null, // English second name // varchar2(128)
};

const PAYMENT_DETAILS = {
    CREDIT_LIMIT: null, // number
    EXPENSIVES_CREDIT_LIMIT: null, // number
    CUSTOMER_CREDIT_LIMIT: null, // number
    CUSTOMERS_CREDIT_LIMIT: null, // number
    CREDIT_CARD_TOKEN: null, // varchar2(128)
    CREDIT_CARD_EXPIRATION: null, // varchar2(64)
    CREDIT_BANK_ACCOUNT: null, // varchar2(512)
    CREDIT_BANK_BRANCH: null, // varchar2(64)
    CHARGE_BANK_ACCOUNT: null, // varchar2(64)
    CHARGE_BANK_BRANCH: null, // varchar2(64)
    CHARGE_BANK_CODE: null, // varchar2(512)
    BILLING_ADDRESS: null, // varchar2(512)
    PRICE_LIST: null, // number
    PROVIDER_ID: null, // varchar2(512)
    VAT: null, // number
    EFFECTIVE_DATE_FROM: null, // date
    CREDIT_CARD_NATIONAL_ID: null, // nvarchar2(16)
    CREDIT_CARD_HOLDER_NAME: null, // varchar2(128)
    BANK_NATIONAL_ID: null, // number
    CREDIT_CARD_TYPE: null, // nvarchar2(32)
    BILLING_CYCLE_TYPE: null, // number
    AUTH_NUMBER: null, // varchar2(7)
    CREDIT_CARD_CVV: null, // number
    STATUS: 1, // number
};

const uniquePhoneForCustomerPrimaryModel = async (contactPhoneNumber, mainEmail = null) => {
    try {
        const sql = `begin :result := uniquePhoneForCustomerPrimary(contactPhoneNumber => :contactPhoneNumber,
                                                                           mainEmail => :mainEmail); end;`;
        const bind = {
            contactPhoneNumber,
            mainEmail,
        };
        return await dbQuery(sql, bind, oracledb.NUMBER);
    } catch (err) {
        err.message = `setCustomerModel-> ${err.message}`;
        throw err;
    }
};

const setCustomerModel = async (data) => {
    try {
        const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(data);

        // 1. Personal Details Object
        const CUSTOMER_DETAILS_TMP = { ...CUSTOMER_DETAILS }; // Create a new instance of CUSTOMER_DETAILS for each iteration
        for (const key in dataUpperCaseWithUnderscore) {
            if (CUSTOMER_DETAILS_TMP.hasOwnProperty(key)) {
                CUSTOMER_DETAILS_TMP[key] = dataUpperCaseWithUnderscore[key];
            }
        }

        CUSTOMER_DETAILS_TMP.SECOND_NAME = data.lastName ? data.lastName : null;
        CUSTOMER_DETAILS_TMP.CUSTOMER_TYPE = data.serviceId ? data.serviceId : 200;
        CUSTOMER_DETAILS_TMP.CONTACT_NO = data.contactPhoneNumber ? data.contactPhoneNumber : null;
        CUSTOMER_DETAILS_TMP.MA_EMAIL = data.mainEmail ? data.mainEmail : null;
        CUSTOMER_DETAILS_TMP.CREATION_USER = data.agentId;
        CUSTOMER_DETAILS_TMP.AGENT_ID = null; // Not created by, It's db's sequence for role
        CUSTOMER_DETAILS_TMP.CURRENCY = data.currency || 3;
        CUSTOMER_DETAILS_TMP.CUSTOMER_STATUS = data.customerStatus || 1;

        // 2. Payments Details Object
        if (data.creditCardToken) await getToken(data);
        dataUpperCaseWithUnderscore.CREDIT_CARD_TOKEN = data.creditCardToken;

        const PAYMENT_DETAILS_TMP = { ...PAYMENT_DETAILS }; // Create a new instance of PAYMENT_DETAILS for each iteration
        for (const key in dataUpperCaseWithUnderscore) {
            if (PAYMENT_DETAILS_TMP.hasOwnProperty(key)) {
                PAYMENT_DETAILS_TMP[key] = dataUpperCaseWithUnderscore[key];
                // PAYMENT_DETAILS_TMP[key] = dataUpperCaseWithUnderscore[key] ? dataUpperCaseWithUnderscore[key] : null;
            }
        }

        // 3. Agreements Array of Objects
        const AGREEMENTS_ARRAY = [];
        let ADD_AGREEMENTS_OBJ = {};
        for (const [key, value] of Object.entries(dataUpperCaseWithUnderscore)) {
            if (!AGREEMENTS_TYPES.hasOwnProperty(key.toLowerCase())) continue;

            switch (key) {
            default:
                ADD_AGREEMENTS_OBJ = {
                    AGREEMENT_TYPE: AGREEMENTS_TYPES[key.toLowerCase()], // number
                    AGREEMENT_EXPIRATION: null, // date
                    AGREEMENT_VALUE: `${value}`, // varchar2(2000)
                    START_DATE: null, // date
                    END_DATE: null, // date
                    STATUS: 1, // number
                };
                break;
            }
            AGREEMENTS_ARRAY.push(ADD_AGREEMENTS_OBJ);
        }

        if (isEmpty(AGREEMENTS_ARRAY)) {
            AGREEMENTS_ARRAY.push({
                AGREEMENT_TYPE: 999,
                AGREEMENT_EXPIRATION: null,
                AGREEMENT_VALUE: '1',
                START_DATE: null,
                END_DATE: null,
                STATUS: 1,
            });
        }

        // 4. Subscribers Array of Objects
        const SUBSCRIBERS_ARRAY = [];
        let subscriberObj = {};
        for (const [key, value] of Object.entries(data.subscribers)) {
            subscriberObj = {
                SUB_NAME: value.subName, // varchar2
                PHONE: value.phone, // varchar2
            };
            SUBSCRIBERS_ARRAY.push(subscriberObj);
        }

        // 5. Validation check
        if (!CUSTOMER_DETAILS_TMP.FIRST_NAME || !CUSTOMER_DETAILS_TMP.SECOND_NAME) return { res: -1 };
        if (!CUSTOMER_DETAILS_TMP.NATIONAL_ID) return { res: -1 };

        // 6. Set the total object
        const all_data = {
            CUSTOMER: CUSTOMER_DETAILS_TMP,
            PAYMENTS: PAYMENT_DETAILS_TMP,
            AGREEMENTS: AGREEMENTS_ARRAY,
            SUBSCRIBERS: SUBSCRIBERS_ARRAY,
        };

        insertLogger({
            end_point: 'bya/api setCustomerModel',
            logTitle: 'setCustomerModel CUSTOMER_DETAILS_TMP',
            data: CUSTOMER_DETAILS_TMP,
            type: 'INFO',
            code: 1,
        });
        const sql = 'begin :result := bya.add_new_customer_new.test_with_oriya(in_all_data => :obj); end;';

        const bind = {
            objectName: 'BYA.all_data',
            obj: all_data,
        };
        insertLogger({
            end_point: 'setCustomerModel',
            logTitle: 'setCustomerModel bind',
            data: bind,
            type: 'INFO',
            code: 1,
        });

        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `setCustomerModel-> ${err.message}`;
        throw err;
    }
};

// const setCustomerModel = async (data) => {
//     try {
//         const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(data);
//
//         // 1. Personal Details Object
//         const CUSTOMER_DETAILS_TMP = { ...CUSTOMER_DETAILS }; // Create a new instance of CUSTOMER_DETAILS for each iteration
//         for (const key in dataUpperCaseWithUnderscore) {
//             if (CUSTOMER_DETAILS_TMP.hasOwnProperty(key)) {
//                 CUSTOMER_DETAILS_TMP[key] = dataUpperCaseWithUnderscore[key];
//             }
//         }
//
//         CUSTOMER_DETAILS_TMP.SECOND_NAME = data.lastName ? data.lastName : null;
//         CUSTOMER_DETAILS_TMP.CUSTOMER_TYPE = data.serviceId ? data.serviceId : 200;
//         CUSTOMER_DETAILS_TMP.CONTACT_NO = data.contactPhoneNumber ? data.contactPhoneNumber : null;
//         CUSTOMER_DETAILS_TMP.MA_EMAIL = data.mainEmail ? data.mainEmail : null;
//         CUSTOMER_DETAILS_TMP.CREATION_USER = data.agentId;
//         CUSTOMER_DETAILS_TMP.AGENT_ID = null; // Not created by, It's db's sequence for role
//         CUSTOMER_DETAILS_TMP.CURRENCY = data.currency || 3;
//         CUSTOMER_DETAILS_TMP.CUSTOMER_STATUS = data.customerStatus || 1;
//
//         // 2. Payments Details Object
//         if (data.creditCardToken) await getToken(data);
//         dataUpperCaseWithUnderscore.CREDIT_CARD_TOKEN = data.creditCardToken;
//
//         const PAYMENT_DETAILS_TMP = { ...PAYMENT_DETAILS }; // Create a new instance of PAYMENT_DETAILS for each iteration
//         for (const key in dataUpperCaseWithUnderscore) {
//             if (PAYMENT_DETAILS_TMP.hasOwnProperty(key)) {
//                 PAYMENT_DETAILS_TMP[key] = dataUpperCaseWithUnderscore[key];
//                 // PAYMENT_DETAILS_TMP[key] = dataUpperCaseWithUnderscore[key] ? dataUpperCaseWithUnderscore[key] : null;
//             }
//         }
//
//         // 3. Agreements Array of Objects
//         const value = [];
//         for (const key in dataUpperCaseWithUnderscore) {
//             if (!CUSTOMER_DETAILS_TMP.hasOwnProperty(key) && !PAYMENT_DETAILS_TMP.hasOwnProperty(key) && !['SUBSCRIBERS', 'SERVICE_ID', 'CUSTOMER_ID_USER', 'LAST_NAME'].includes(key)) {
//                 value.push(key.toLowerCase());
//             }
//         }
//
//         if (isEmpty(value)) value.push('default_wallet');
//
//         const filtersArray = await objToArray([{ col: 'specifications', operator: 'in', value }]);
//         const searchResult = await getSearchDataFromOracle(data.agentId, filtersArray, { col: 'product_Id', direction: 'asc' }, 2);
//         const columnsSearchResult = await filterByCols(['p_name', 'product_id', 'specifications', 'description'], searchResult.data, 'products');
//
//         const resultAgreements = [];
//         let valueAgreement;
//         for (const key in dataUpperCaseWithUnderscore) {
//             if (!CUSTOMER_DETAILS_TMP.hasOwnProperty(key) && !PAYMENT_DETAILS_TMP.hasOwnProperty(key) && !['SUBSCRIBERS', 'SERVICE_ID', 'CUSTOMER_ID_USER', 'LAST_NAME'].includes(key)) {
//                 valueAgreement = dataUpperCaseWithUnderscore[key];
//                 const matchingObjects = columnsSearchResult.filter((obj) => obj.specifications === key.toLowerCase());
//                 matchingObjects.forEach((obj) => { resultAgreements.push({ productId: obj.productId, valueAgreement }); });
//             }
//         }
//
//         if (isEmpty(resultAgreements)) resultAgreements.push({ productId: 999, valueAgreement: '0' }); // default_wallet
//
//         const AGREEMENTS_ARRAY = [];
//         let ADD_AGREEMENTS_OBJ = {};
//         for (const key in resultAgreements) {
//             switch (resultAgreements[key].productId) {
//                 default:
//                     ADD_AGREEMENTS_OBJ = {
//                         AGREEMENT_TYPE: resultAgreements[key].productId, // number
//                         AGREEMENT_EXPIRATION: null, // date
//                         AGREEMENT_VALUE: `${resultAgreements[key].valueAgreement}`, // varchar2(2000)
//                         START_DATE: null, // date
//                         END_DATE: null, // date
//                         STATUS: 1, // number
//                     };
//                     break;
//             }
//             AGREEMENTS_ARRAY.push(ADD_AGREEMENTS_OBJ);
//         }
//
//         // 4. Subscribers Array of Objects
//         const SUBSCRIBERS_ARRAY = [];
//         let subscriberObj = {};
//         for (const [key, value] of Object.entries(data.subscribers)) {
//             subscriberObj = {
//                 SUB_NAME: value.subName, // varchar2
//                 PHONE: value.phone, // varchar2
//             };
//             SUBSCRIBERS_ARRAY.push(subscriberObj);
//         }
//
//         // 5. Validation check
//         if (!CUSTOMER_DETAILS_TMP.FIRST_NAME || !CUSTOMER_DETAILS_TMP.SECOND_NAME) return { res: -1 };
//         if (!CUSTOMER_DETAILS_TMP.NATIONAL_ID) return { res: -1 };
//
//         // 6. Set the total object
//         const all_data = {
//             CUSTOMER: CUSTOMER_DETAILS_TMP,
//             PAYMENTS: PAYMENT_DETAILS_TMP,
//             AGREEMENTS: AGREEMENTS_ARRAY,
//             SUBSCRIBERS: SUBSCRIBERS_ARRAY,
//         };
//
//         const sql = 'begin :result := bya.add_new_customer_new.test_with_oriya(in_all_data => :obj); end;';
//
//         const bind = {
//             objectName: 'BYA.all_data',
//             obj: all_data,
//         };
//         insertLogger({
//             end_point: 'setCustomerModel',
//             logTitle: 'setCustomerModel bind',
//             data: bind,
//             type: 'INFO',
//             code: 1,
//         });
//
//         const res = await dbQuery(sql, bind, oracledb.NUMBER);
//         return { res };
//     } catch (err) {
//         err.message = `setCustomerModel-> ${err.message}`;
//         throw err;
//     }
// };

const setSubscriberModel = async (data, params, action_type) => {
    try {
        if (params.subscriberId) data.subscribers = [data];

        const ARR_ACTION_SUBSCRIBERS = [];
        let codeReturn;
        data.subscribers.forEach((subscriber) => {
            const ACTION_SUBSCRIBERS = {
                DEFAULT_MABAL: null, // NUMBER
                PHONE: null, // VARCHAR2(16)
                NAME: null, // VARCHAR2(250)
                AFFECTED_FROM: null, // TIMESTAMP(6)
                AFFECTED_TO: null, // TIMESTAMP(6)
                LAST_UPDATE_DATE: null, // TIMESTAMP(6)
                CREATED_ON: null, // TIMESTAMP(6)
                STATUS: 1, // NUMBER
                OPERATOR_ID: null, // NVARCHAR2(2)
                SHIYUCH_STATUS: null, // NUMBER
                SHIYUCH_DATE: null, // DATE
                POP_144: null, // NUMBER
                UPD_144: null, // NUMBER
                BLOCK_SMS: null, // VARCHAR2(2)
                TEXT_1: null, // VARCHAR2(512)
                TEXT_2: null, // VARCHAR2(512)
                SMS_USER_ID: null, // NUMBER
                NUM_2: null, // NUMBER
                LAST_CALL_DATE: null, // DATE
                LAST_SMS_DATE: null, // DATE
                LAST_DATA_DATE: null, // DATE
                HLR_ID: null, // NUMBER
                RADIUS_USERNAME: null, // VARCHAR2(64)
                RADIUS_PASSWORD: null, // VARCHAR2(64)
                CREATED_BY: null, // VARCHAR2(32)
                REMARKS: null, // VARCHAR2(1024)
                BOW: null, // NUMBER
                CHECK_FIRST_USE: null, // VARCHAR2(3)
                MAM: null, // INTEGER
            };

            // validations
            if (action_type === 1 && subscriber.phone) codeReturn = -1; // Can not update subscriber's phone number

            for (const key in subscriber) {
                if (ACTION_SUBSCRIBERS.hasOwnProperty(key.toUpperCase())) ACTION_SUBSCRIBERS[key.toUpperCase()] = subscriber[key];

                if (key === 'subscriberName') ACTION_SUBSCRIBERS.NAME = subscriber.subscriberName;
                if (!ACTION_SUBSCRIBERS.NAME && params.serviceId === '7') ACTION_SUBSCRIBERS.NAME = 'prepaid';

                if (key === 'phone') ACTION_SUBSCRIBERS.PHONE = subscriber.phone.replace(/^0+/, '');
            }
            ARR_ACTION_SUBSCRIBERS.push(ACTION_SUBSCRIBERS);
        });

        if (codeReturn < 0) return { res: -20180 };

        const sql = `begin :result := bya.add_new_customer_new.update_subscribers(in_action_type => :in_action_type,
                                                                                    in_cust_pk_id => :in_cust_pk_id,
                                                                                    in_customer_type => :in_customer_type,
                                                                                    in_creation_user => :in_creation_user,
                                                                                    in_subscriber_id => :in_subscriber_id,
                                                                                    in_arr_subscribers => :obj); end;`;

        const bind = {
            in_action_type: `${action_type}`,
            in_cust_pk_id: params.custPkId,
            in_customer_type: params.serviceId,
            in_creation_user: `${data.agentId}`,
            in_subscriber_id: params.subscriberId || null,
            objectName: 'BYA.ARR_ACTION_SUBSCRIBERS',
            obj: ARR_ACTION_SUBSCRIBERS,
        };

        let res;
        res = await dbQuery(sql, bind, oracledb.NUMBER);
        if (action_type === 1 && res === 1) res = params.subscriberId;
        return { res };
    } catch (err) {
        err.message = `setSubscriberModel-> ${err.message}`;
        throw err;
    }
};

const CUST_PK_OBJECT = {
    CUST_PK_ID: null, // NUMBER
    FIRST_NAME: null, // NVARCHAR2(64)
    SECOND_NAME: null, // NVARCHAR2(64)
    ADDRESS: null, // VARCHAR2(128)
    CITY: null, // VARCHAR2(128)
    ZIP_CODE: null, // VARCHAR2(10)
    MAIN_EMAIL: null, // VARCHAR2(64)
    CONTACT_NO: null, // NUMBER
    INTERNET_USER_NAME: null, // NVARCHAR2(32)
    INTERNET_PASSWORD: null, // NVARCHAR2(32)
    CUST_PK_STATUS: null, // NUMBER
    CREDIT_CARD_TOKEN: null, // VARCHAR2(128 CHAR)
    CREDIT_CARD_EXPIRATION_DATE: null, // VARCHAR2(4)
    CVV: null, // NVARCHAR2(4)
    CREDIT_CARD_NATIONAL_ID: null, // NVARCHAR2(16)
    CREDIT_CARD_HOLDER_NAME: null, // VARCHAR2(128 CHAR)
    CREATION_USER: null, // NVARCHAR2(32)
    PAYMENT_METHOD: null, // NUMBER
    BANK_CODE: null, // NUMBER
    BANK_NATIONAL_ID: null, // NUMBER
    BANK_ACCOUNT: null, // NUMBER
    BANK_BRANCH_CODE: null, // NUMBER
    CREDIT_CARD_TYPE: null, // NVARCHAR2(32)
    COUNTRY_ID: null, // NUMBER
    MARKET_TYPE: null, // NUMBER
    RECOMMEND_BY: null, // NUMBER
    REMARKS: null, // VARCHAR2(2000)
    MARKET_GROUP: null, // NUMBER
    STREET: null, // VARCHAR2(128)
    HOUSE: null, // INTEGER
    LETTER: null, // VARCHAR2(16)
    FLAT: null, // INTEGER
    BILLING_CYCLE_TYPE: null, // NUMBER
    BILLING_CURRENCY: null, // NUMBER
    INVOICE_CURRENCY: null, // NUMBER
    CREDIT_CARD_COMPANY: null, // VARCHAR2(200)
    AUTH_NUMBER: null, // VARCHAR2(7
};

const updateCustPkModel = async (data, custPkId) => {
    try {
        const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(data);
        const CUST_PK_OBJECT_TMP = { ...CUST_PK_OBJECT }; // Create a new instance of CUSTOMER_DETAILS for each iteration
        for (const key in dataUpperCaseWithUnderscore) {
            if (CUST_PK_OBJECT_TMP.hasOwnProperty(key)) {
                CUST_PK_OBJECT_TMP[key] = dataUpperCaseWithUnderscore[key];
            }
        }
        CUST_PK_OBJECT_TMP.CUST_PK_ID = custPkId;
        CUST_PK_OBJECT_TMP.SECOND_NAME = data.lastName || null;
        CUST_PK_OBJECT_TMP.CONTACT_NO = data.contactPhoneNumber || null;

        const sql = 'begin :result := bya.add_new_customer_new.update_cust_pk(update_cust_pk_pbj => :obj); end;';
        const bind = {
            objectName: 'BYA.CUST_PK_OBJECT',
            obj: CUST_PK_OBJECT_TMP,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        console.log(err.message);
        err.message = `updateCustPkModel-> ${err.message}`;
        throw err;
    }
};

const updateCustomerModel = async (data, params) => {
    try {
        const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(data);

        const CUSTOMER_DETAILS_TMP = { ...CUSTOMER_DETAILS }; // Create a new instance of CUSTOMER_DETAILS for each iteration
        for (const key in dataUpperCaseWithUnderscore) {
            if (CUSTOMER_DETAILS_TMP.hasOwnProperty(key)) {
                CUSTOMER_DETAILS_TMP[key] = dataUpperCaseWithUnderscore[key];
            }
        }

        CUSTOMER_DETAILS_TMP.AGENT_ID = null; // delete the value that taken from token and send null to db
        CUSTOMER_DETAILS_TMP.CUST_PK_ID = params.custPkId;
        CUSTOMER_DETAILS_TMP.CUSTOMER_TYPE = params.serviceId;
        CUSTOMER_DETAILS_TMP.CREATION_USER = data.agentId;
        CUSTOMER_DETAILS_TMP.SECOND_NAME = data.lastName;
        CUSTOMER_DETAILS_TMP.MA_EMAIL = data.mainEmail ? data.mainEmail : null;
        CUSTOMER_DETAILS_TMP.CONTACT_NO = data.contactPhoneNumber ? data.contactPhoneNumber : null;

        const sql = 'begin :result := bya.add_new_customer_new.update_customer(in_customer_obj => :obj); end;';

        const bind = {
            objectName: 'BYA.ACTION_CUSTOMER',
            obj: CUSTOMER_DETAILS_TMP,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `updateCustomerModel-> ${err.message}`;
        throw err;
    }
};

const getCustomerModel = async (params, action_type = null) => {
    try {
        const sql = 'begin :result := bya.add_new_customer_new.get_data(in_cust_pk_id => :in_cust_pk_id, in_customer_type => :in_customer_type); end;';
        const bind = {
            in_cust_pk_id: params.custPkId,
            in_customer_type: params.serviceId || action_type || 0,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getCustomerModel-> ${err.message}`;
        throw (err);
    }
};

const getCustomerIdByCustPkAndServiceIdModel = async (custPkId, serviceId) => {
    try {
        const customerDetails = await getCustomerModel({ custPkId, serviceId });
        if (!isEmpty(customerDetails)) {
            const { customerId } = customerDetails[0];
            return customerId;
        }
        return null;
    } catch (err) {
        err.message = `getCustomerIdByCustPkAndServiceIdModel-> ${err.message}`;
        throw (err);
    }
};

const getSubscribersListModel = async (params) => {
    try {
        const sql = `begin :result := bya.add_new_customer_new.get_data_subscribers(in_cust_pk_id => :in_cust_pk_id, 
                                                                                    in_customer_type => :in_customer_type,
                                                                                    in_subscriber_id => :in_subscriber_id); end;`;
        const bind = {
            in_cust_pk_id: params.custPkId,
            in_customer_type: params.serviceId,
            in_subscriber_id: params.subscriberId || null,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getSubscriberModel-> ${err.message}`;
        throw (err);
    }
};

const getSubscriberModel = async (params) => {
    try {
        const sql = `begin bya.all_data_subscriber(p_cust_pk_id => :custPkId, 
        p_customer_type => :customerType,
        p_subscribers_id => :subscribersId,
        p_customer_data => :customerData,
        p_customer_data_his => :customerDataHis,
        p_data_package => :dataPackage,
        p_wallet_data => :walletData); end;`;
        const bind = {
            custPkId: params.custPkId,
            customerType: params.serviceId,
            subscribersId: params.subscriberId || -1,
            customerData: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
            customerDataHis: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
            dataPackage: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
            walletData: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
        };
        const res = await dbQuery(sql, bind, '', 'proc');
        return res;
    } catch (err) {
        err.message = `getSubscribersModel-> ${err.message}`;
        throw (err);
    }
};

const getAgreementModel = async (params) => {
    try {
        const sql = `begin :result := bya.add_new_customer_new.get_data_agreements(in_cust_pk_id => :in_cust_pk_id, 
                                                                                    in_customer_type => :in_customer_type,
                                                                                    in_agreement_type => :in_agreement_type); end;`;
        const bind = {
            in_cust_pk_id: params.custPkId,
            in_customer_type: params.serviceId,
            in_agreement_type: params.agreementId || null,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getAgreementModel-> ${err.message}`;
        throw (err);
    }
};

const getPaymentModel = async (params, action_type, id = null) => {
    try {
        const sql = `begin :result := bya.add_new_customer_new.get_data_payments(in_cust_pk_id => :in_cust_pk_id, 
                                                                                    in_customer_type => :in_customer_type,
                                                                                    in_type => :in_type,
                                                                                    in_id_row => :in_id_row); end;`;
        const bind = {
            in_cust_pk_id: params.custPkId,
            in_customer_type: params.serviceId,
            in_type: action_type || null,
            in_id_row: id,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getPaymentModel-> ${err.message}`;
        throw (err);
    }
};

const setAgreementModel = async (data, params, action_type) => {
    try {
        const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(data);

        const value = [];
        for (const key in dataUpperCaseWithUnderscore) {
            value.push(key.toLowerCase());
        }

        if (isEmpty(value)) value.push('default_wallet');

        const filtersArray = await objToArray([{ col: 'specifications', operator: 'in', value }]);
        const searchResult = await getSearchDataFromOracle(data.agentId, filtersArray, { col: 'product_Id', direction: 'asc' }, 2);
        const columnsSearchResult = await filterByCols(['p_name', 'product_id', 'specifications', 'description'], searchResult.data, 'products');

        const resultAgreements = [];
        let valueAgreement;
        for (const key in dataUpperCaseWithUnderscore) {
            valueAgreement = dataUpperCaseWithUnderscore[key];
            const matchingObjects = columnsSearchResult.filter((obj) => obj.specifications === key.toLowerCase());
            matchingObjects.forEach((obj) => { resultAgreements.push({ productId: obj.productId, valueAgreement }); });
        }

        if (isEmpty(resultAgreements)) resultAgreements.push({ productId: 999, valueAgreement: '0' }); // default_wallet

        const AGREEMENTS_ARRAY = [];
        let ADD_AGREEMENTS_OBJ = {};
        for (const key in resultAgreements) {
            switch (resultAgreements[key].productId) {
            default:
                ADD_AGREEMENTS_OBJ = {
                    AGREEMENT_TYPE: resultAgreements[key].productId, // number
                    AGREEMENT_EXPIRATION: null, // date
                    AGREEMENT_VALUE: `${resultAgreements[key].valueAgreement}`, // varchar2(2000)
                    START_DATE: null, // date
                    END_DATE: null, // date
                    STATUS: 1, // number
                };
                break;
            }
            AGREEMENTS_ARRAY.push(ADD_AGREEMENTS_OBJ);
        }

        const sql = `begin :result := bya.add_new_customer_new.update_agreements(in_action_type => :in_action_type, 
                                                                                    in_cust_pk_id => :in_cust_pk_id,
                                                                                    in_customer_type => :in_customer_type,
                                                                                    in_agreements => :obj); end;`;
        const bind = {
            in_action_type: action_type,
            in_cust_pk_id: params.custPkId,
            in_customer_type: params.serviceId,
            objectName: 'BYA.ARR_AGREEMENTS_OBJECT',
            obj: AGREEMENTS_ARRAY,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `setAgreementModel-> ${err.message}`;
        throw (err);
    }
};

const setPaymentModel = async (data, params, action_type) => {
    try {
        const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(data);

        if (data.creditCardToken) await getToken(data);
        dataUpperCaseWithUnderscore.CREDIT_CARD_TOKEN = data.creditCardToken;

        const PAYMENT_DETAILS_TMP = { ...PAYMENT_DETAILS }; // Create a new instance of PAYMENT_DETAILS for each iteration
        for (const key in dataUpperCaseWithUnderscore) {
            if (PAYMENT_DETAILS_TMP.hasOwnProperty(key)) {
                PAYMENT_DETAILS_TMP[key] = dataUpperCaseWithUnderscore[key];
            }
        }

        const sql = `begin :result := bya.add_new_customer_new.update_details(in_cust_pk_id => :in_cust_pk_id, 
                                                                                    in_customer_type => :in_customer_type,
                                                                                    in_action_type => :in_action_type,
                                                                                    in_details_obj => :obj); end;`;
        const bind = {
            in_cust_pk_id: params.custPkId,
            in_customer_type: params.serviceId,
            in_action_type: action_type,
            objectName: 'BYA.ACTION_DETAILS',
            obj: PAYMENT_DETAILS_TMP,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `setPaymentModel-> ${err.message}`;
        throw (err);
    }
};

const getStockModel = async (customerId) => {
    try {
        const AGENT_ID_OBJ = { AGENT_ID: customerId };
        const sql = 'begin :result := bya.stock_pkg.get_stock_agent(a_id => :obj); end;';
        const bind = {
            objectName: 'BYA.AGENT_ID_OBJ',
            obj: AGENT_ID_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getStockModel-> ${err.message}`;
        throw (err);
    }
};

const getStockProductModel = async (customerId, productId) => {
    try {
        const GET_STOCK_AGENT_OBJ = { AGENT_ID: customerId, PRODUCT_ID: productId };
        const sql = 'begin :result := bya.stock_pkg.get_stock_agent_product(a_id => :obj); end;';
        const bind = {
            objectName: 'BYA.GET_STOCK_AGENT_OBJ',
            obj: GET_STOCK_AGENT_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getStockProductModel-> ${err.message}`;
        throw (err);
    }
};

const getSubscriberCashboxModel = async (params) => {
    try {
        const sql = `begin :result := bya.cashiers_pkg.get_data_cashbox( p_cust_pk => :p_cust_pk, 
                                                                                p_customer_type => :p_customer_type,
                                                                                p_subscriber_id => :p_subscriber_id); end;`;
        const bind = {
            p_cust_pk: params.custPkId,
            p_customer_type: params.serviceId,
            p_subscriber_id: params.subscriberId || -1,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return res;
    } catch (err) {
        err.message = `getSubscriberCashboxModel-> ${err.message}`;
        throw (err);
    }
};

const getDataBalanceModel = async (params) => {
    try {
        const sql = `begin :result := bya.cashiers_pkg.get_data_balance( p_cust_pk => :p_cust_pk, 
                                                                                p_customer_type => :p_customer_type,
                                                                                p_subscriber_id => :p_subscriber_id); end;`;
        const bind = {
            p_cust_pk: params.custPkId,
            p_customer_type: params.serviceId,
            p_subscriber_id: params.subscriberId || -1,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return res;
    } catch (err) {
        err.message = `getDataBalanceModel-> ${err.message}`;
        throw (err);
    }
};

const checkSubscriberHierarchyModel = async (custPkId, serviceId, subscriberId) => {
    try {
        const sql = `begin :result := check_hierarchy(p_cust_pk_id => :p_cust_pk_id,
                                           p_service_type => :p_service_type,
                                           p_subscriber_id => :p_subscriber_id);end;`;
        const bind = {
            p_cust_pk_id: custPkId,
            p_service_type: serviceId,
            p_subscriber_id: subscriberId,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        err.message = `checkSubscriberHierarchyModel-> ${err.message}`;
        throw err;
    }
};

const getSubscriberIdByPhoneModel = async (phoneNumber) => {
    try {
        const sql = 'begin :result := get_subscriber_id_by_msisdn(p_phone => :p_phone);end;';
        const bind = {
            p_phone: `${phoneNumber}`,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        err.message = `getSubscriberIdByPhoneModel-> ${err.message}`;
        throw err;
    }
};

const getCashboxSubscribersModel = async (req) => {
    try {
        const sql = `begin :result := get_cashiers(
                                p_name => :p_name, 
                                p_phone => :p_phone,
                                p_cust_pk => :p_cust_pk,
                                p_limit => :p_limit,
                                p_customer_type => :p_customer_type
                            ); end;`;
        const bind = {
            p_name: req.query.q || 'A',
            p_phone: req.query.phone || 'A',
            p_cust_pk: req.query.custPkId || 0,
            p_limit: req.query.limit || 0,
            p_customer_type: req.query.serviceId || 201,
        };
        const resultDB = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(resultDB);
    } catch (err) {
        err.message = `getCashboxSubscribersModel-> ${err.message}`;
        throw err;
    }
};

const setCashTransferModel = async (subscriberId, toSubscriberId, amount, transfer, type = 3, currency = 3) => {
    try {
        const sql = `begin :result := cashiers_pkg.balance_transfer(p_from_subscriber => :p_from_subscriber,
                                         p_to_agent_id => :p_to_agent_id,
                                         p_amount => :p_amount,
                                         p_currency => :p_currency,
                                         p_type => :p_type,
                                         p_tranfer => :obj);end;`;
        const bind = {
            p_from_subscriber: subscriberId,
            p_to_agent_id: toSubscriberId,
            p_amount: amount,
            p_currency: currency,
            p_type: type,
            objectName: 'BYA.ARR_BALANCE_TRANSFER',
            obj: transfer,
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `setCashTransferModel-> ${err.message}`;
        throw (err);
    }
};

const associationCashboxModel = async (agentId, status, subscriberId, amount) => {
    try {
        const sql = `begin :result := cashiers_pkg.association_cashbox(p_from_subscriber => :p_from_subscriber,
                                         p_to_agent_id => :p_to_agent_id,
                                         p_type => :p_type,
                                         p_cash => :p_cash);end;`;
        const bind = {
            p_from_subscriber: subscriberId,
            p_to_agent_id: agentId,
            p_type: status,
            p_cash: amount,
        };
        const res = await dbQuery(sql, bind, oracledb.STRING);
        return res;
    } catch (err) {
        err.message = `associationCashboxModel-> ${err.message}`;
        throw (err);
    }
};

const getSubscriberIdByAgentIdModel = async (agentId) => {
    try {
        const sql = 'begin :result := bya.cashiers_pkg.get_subscriber_id( p_agent_id => :p_agent_id); end;';
        const bind = {
            p_agent_id: agentId,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        err.message = `getSubscriberIdByAgentIdModel-> ${err.message}`;
        throw err;
    }
};

const getReqCashboxModel = async (cashbox, sales) => {
    try {
        const sql = `begin bya.cashiers_pkg.rep_cashbox(p_cashbox => :p_cashbox, 
        p_sales => :p_sales,
        p_data_cashbox => :p_data_cashbox,
        p_data_transactions => :p_data_transactions,
        p_data_closing => :p_data_closing,
        p_data_currencys => :p_data_currencys,
        p_data_sales => :p_data_sales); end;`;
        const bind = {
            p_cashbox: cashbox,
            p_sales: sales,
            p_data_cashbox: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
            p_data_transactions: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
            p_data_closing: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
            p_data_currencys: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
            p_data_sales: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
        };
        const res = await dbQuery(sql, bind, '', 'proc');
        return res;
    } catch (err) {
        err.message = `getReqCashboxModel-> ${err.message}`;
        throw (err);
    }
};

const resetWalletsModel = async (sales) => {
    try {
        const sql = 'begin :result := bya.cashiers_pkg.reset_wallets( p_sales => :p_sales); end;';
        const bind = {
            p_sales: sales,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        err.message = `resetWalletsModel-> ${err.message}`;
        throw (err);
    }
};

const getCustomerTypeModel = async (type, value) => {
    try {
        // type - 1: subscriber_id
        //        2: phone
        //        3: customer_id
        const sql = `begin :result := customers_pkg.get_customer_type( p_type => :p_type,
                                                                              p_value => :p_value); end;`;
        const bind = {
            p_type: type,
            p_value: value,
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `getCustomerTypeModel-> ${err.message}`;
        throw (err);
    }
};

export {
    getCustomerTypesModel,
    checkCustomerModel,
    putCustomerModel,
    getToken,
    getProfessions,
    getDataCustomerModel,
    getAgreementsCustomerModel,
    setCustomerModel,
    setSubscriberModel,
    updateCustPkModel,
    updateCustomerModel,
    getCustomerModel,
    getCustomerIdByCustPkAndServiceIdModel,
    getSubscriberModel,
    getAgreementModel,
    getPaymentModel,
    setAgreementModel,
    setPaymentModel,
    getStockModel,
    getStockProductModel,
    getSubscribersListModel,
    setCashTransferModel,
    getSubscriberCashboxModel,
    getDataBalanceModel,
    associationCashboxModel,
    checkSubscriberHierarchyModel,
    getSubscriberIdByPhoneModel,
    uniquePhoneForCustomerPrimaryModel,
    getCashboxSubscribersModel,
    getSubscriberIdByAgentIdModel,
    getReqCashboxModel,
    resetWalletsModel,
    getCustomerTypeModel,
};
