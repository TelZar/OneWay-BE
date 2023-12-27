import oracledb from 'oracledb';
import jwt from 'jsonwebtoken';
import dbQuery from '../db/connect.js';
import { moduleActionsFormat } from './permissions.js';
import { convertToMinutes, isEmpty } from '../utils/helper.js';

const createTokenModel = async (agentId, userAgent, token, exp = '10m', type = 'access', status = 1, action = 1) => {
    try {
        // action : 1 - login, 2 - logout
        const sql = 'select create_token(:p_action,:p_agentId,:p_suffix,:p_type,:p_status,:p_exp,:p_userAgent) as res';
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close
            p_agentId: agentId || 0,
            p_suffix: token ? token.slice(-15) : '-1',
            p_type: type,
            p_status: status,
            p_exp: convertToMinutes(exp),
            p_userAgent: userAgent,
        };
        console.log({ bind });
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        console.log({ res });
        return res.res;
    } catch (err) {
        console.log(err.message);
        err.message = `createTokenModel-> ${err.message}`;
        throw (err);
    }
};

const checkTokenModel = async (agentId, token, type = 'access') => {
    try {
        const sql = 'select checkToken(:p_agentId, :p_token, :p_type) as res';
        const bind = {
            p_agentId: agentId,
            p_token: token.slice(-15),
            p_type: type,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res.res;
    } catch (err) {
        err.message = `checkTokenModel-> ${err.message}`;
        throw (err);
    }
};

const loginModel = async (data) => {
    try {
        // Send to function
        const sql = `begin :result := customers_pkg.approve_login(p_phone => :p_phone,
                                     p_email => :p_email,
                                     p_password => :p_password,
                                     p_ip_address => :p_ip_address,
                                     p_port => :p_port,
                                     p_imei_mac => :p_imei_mac,
                                     p_user_agent => :p_user_agent);end;`;
        const bind = {
            p_phone: data.body.phone ? data.body.phone : '',
            p_email: data.body.email ? data.body.email : '',
            p_password: data.body.password ? data.body.password : null,
            p_ip_address: data.ip ? data.ip : '',
            p_port: data.port ? data.port : '',
            p_imei_mac: data.imei ? data.imei : '',
            p_user_agent: data.headers['user-agent-u'],
        };
        console.log({ bind });
        return await dbQuery(sql, bind, oracledb.NUMBER);
    } catch (err) {
        err.message = `loginModel-> ${err.message}`;
        throw (err);
    }
};

const logoutModel = async (agentId, suffix, userAgent, type = 'access', status = 0) => {
    try {
        const sql = 'select setToken(:p_agentId,:p_suffix,:p_type,:p_status,:p_userAgent) as res';
        const bind = {
            p_agentId: agentId, // Action: 1 - add, 2 - close
            p_suffix: suffix || 0,
            p_type: type,
            p_status: status,
            p_userAgent: userAgent,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res.res;
    } catch (err) {
        err.message = `loginModel-> ${err.message}`;
        throw (err);
    }
};

const otpNeededModel = async (agentId) => {
    try {
        const sql = 'select checkOtpNeeded(:p_agentId) as res';
        const bind = {
            p_agentId: agentId,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res.res; // 0 - He did not do otp in 24hours so need otp now
    } catch (err) {
        err.message = `otpNeededModel-> ${err.message}`;
        throw (err);
    }
};

const saveOtp = async (agentId) => {
    try {
        const sql = 'select saveOtp(:p_agentId) as res';
        const bind = {
            p_agentId: agentId,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res.res;
    } catch (err) {
        err.message = `saveOtp-> ${err.message}`;
        throw (err);
    }
};

const agentDataformatJson = function (data, type, agentId = null) {
    if (type === 1) {
        return { // My Details
            agentId,
            customerIdUser: data[0].CUSTOMER_ID,
            departmentId: data[0].DEPARTMENT_ID,
            name: data[0].NAME,
            lang: data[0].LANG_CODE === 1 ? 'he' : 'en',
            phoneUser: data[0].PHONE_USER,
            emailUser: data[0].EMAIL,
            custPkId: data[0].CUST_PK_ID,
            currentRoleId: data[0].ROLE_ID,
            avatar: {
                label: `${data[0].FIRST_NAME_2} ${data[0].SECOND_NAME_2}`,
                color: data[0].AVATAR,
            },
            roles: data[0].ROLE_ID_ARR.split(',').map((role_id, i) => ({
                roleId: role_id,
                roleName: data[0].DESCRIPTION_ARR.split(',')[i],
                roleNameHe: data[0].DESCRIPTION_HEB_ARR.split(',')[i],
                subToOrder: data[0].SUBJECT_TO_HIERARCHY_ARR.split(',')[i],
            })),
            // services: data[0].SERVICES.split(',').map((service, index) => ({
            //     id: service,
            //     label: data[0].SERVICE_NAMES.split(',')[index],
            // })),
            permissions: moduleActionsFormat(data),
        };
    }
    return { // Basic details
        agentId: data[0].AGENT_ID,
        custPkIdUser: data[0].CUST_PK_ID,
        customerIdUser: data[0].CUSTOMER_ID,
        name: data[0].NAME,
        email: data[0].EMAIL,
        phone: data[0].PHONE_USER,
        lang: data[0].LANG_CODE === 1 ? 'he' : 'en',
    };
};

const getDataAgentModel = async (agentId, type = 1) => {
    try {
        // Send to function
        const sql = 'begin :result := get_data_agent_id(p_agent_id => :p_agent_id, p_type => :p_type);end;';
        const bind = { p_agent_id: agentId, p_type: type };
        const data = await dbQuery(sql, bind, oracledb.CURSOR);
        if (isEmpty(data)) return data;
        return agentDataformatJson(data, type, agentId);
    } catch (err) {
        err.message = `getDataAgentModel-> ${err.message}`;
        throw (err);
    }
};

const generateOtpModel = async function (data) {
    try {
        const sql = `begin :result := customers_pkg.generate_otp(p_phone => :p_phone,
                                    p_email => :p_email);end;`;
        const bind = {
            p_phone: data.phoneUser ? data.phoneUser : '',
            p_email: data.emailUser ? data.emailUser : '',
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `generateOtpModel-> ${err.message}`;
        return err;
    }
};

const checkOtpModel = async (data) => {
    try {
        const sql = `begin :result := customers_pkg.verify_otp(p_phone => :p_phone,
                                  p_email => :p_email,
                                  p_otp => :p_otp);end;`;
        const bind = {
            p_phone: data.phone ? data.phone : '',
            p_email: data.email ? data.email : '',
            p_otp: data.otpCode ? data.otpCode : '',
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `checkOtpModel-> ${err.message}`;
        throw (err);
    }
};

const changePasswordModel = async (data) => {
    try {
        const sql = `begin :result := customers_pkg.update_password(p_cust_pk_id => :p_cust_pk_id,
                                       p_phone => :p_phone,
                                       p_email => :p_email,
                                       p_password => :p_password);end;`;

        const bind = {
            p_cust_pk_id: data.custPkIdUser,
            p_phone: data.phone ? data.phone : '',
            p_email: data.email ? data.email : '',
            p_password: data.password ? data.password : '',
        };
        return await dbQuery(sql, bind);
    } catch (err) {
        err.message = `changePasswordModel-> ${err.message}`;
        throw (err);
    }
};

const isSuperpowersOwnerModel = async (req) => {
    try {
        // Checking if otp verification was done
        const sql = `begin :result := api_pkg.check_if_hidden_customer(p_customer_id => :p_customer_id,
                                              p_path => :p_path);end;`;
        const bind = {
            p_customer_id: req.body.customerIdUser,
            p_path: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `isSuperpowersOwnerModel-> ${err.message}`;
        throw (err);
    }
};

const verifySecretModel = async (data) => {
    try {
        // Verify clientId and clientSecret
        const sql = `begin :result := api_pkg.validate_login(p_client_id => :p_client_id,
                                    p_secret_key => :p_secret_key,
                                    p_path => :p_path);end;`;
        const bind = {
            p_client_id: data.clientId ? data.clientId : '',
            p_secret_key: data.clientSecret ? data.clientSecret : '',
            p_path: data.mediatorIp ? data.mediatorIp : '::1',
        };
        const res = await dbQuery(sql, bind);
        if (res < 0) return res;
        const payloadToken = jwt.verify(data.clientSecret, process.env.ACCESS_TOKEN_SECRET);
        return payloadToken.agentId;
    } catch (err) {
        err.message = `verifySecretModel-> ${err.message}`;
        throw (err);
    }
};

export {
    createTokenModel,
    checkTokenModel,
    loginModel,
    otpNeededModel,
    saveOtp,
    generateOtpModel,
    checkOtpModel,
    getDataAgentModel,
    changePasswordModel,
    isSuperpowersOwnerModel,
    verifySecretModel,
    logoutModel,
};
