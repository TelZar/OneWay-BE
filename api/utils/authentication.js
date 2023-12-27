import jwt from 'jsonwebtoken';
import 'dotenv/config.js';
import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { getDataAgentModel, isSuperpowersOwnerModel } from '../models/auth.js';

const convertToMinutes = function (timeString) {
    const timeUnits = { m: 1, h: 60, d: 1440 };
    const unit = timeString.slice(-1);
    return parseInt(timeString, 10) * timeUnits[unit] || 0;
};

// insert suffix tokens or update in logout
const editTokens = async (action, agentId, token, userAgent, exp = '10m', type = 'access', status = 1) => {
    try {
        const sql = 'select editTokens(:p_action,:p_agentId,:p_suffix,:p_type,:p_status,:p_exp,:p_userAgent) as res';
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close
            p_agentId: agentId || 0,
            p_suffix: token ? token.slice(-15) : '-1',
            p_type: type,
            p_status: status,
            p_exp: convertToMinutes(exp),
            p_userAgent: userAgent,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res.res;
    } catch (err) {
        err.message = `editTokens-> ${err.message}`;
        throw err;
    }
};

// Create access token -  sated in header, it's time is relatively short
const generateAccessTokenHash = async (req, res, exp = '10m', type = 'access') => {
    try {
        const { agentId } = req.body;
        const { customerIdUser } = req.body;
        // Set agent id in payload
        const accessToken = jwt.sign(
            { agentId, customerIdUser },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: exp },
        );
        // Save token in MYSQL
        editTokens(1, agentId, accessToken, req.headers['user-agent-u'], exp, type);
        // Set in header
        res.set('Authorization', `Bearer ${accessToken}`);
        return accessToken;
    } catch (err) {
        err.message = `generateAccessTokenHash-> ${err.message}`;
        throw err;
    }
};

// Create refresh token - securely encrypted token with a long duration is used to renew the access tokens
const generateRefreshTokenHash = function (req, res, exp = '2h') {
    try {
        const refreshToken = jwt.sign(
            { agentId: req.body.agentId },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: exp },
        );
        // Save token in MYSQL
        editTokens(1, req.body.agentId, refreshToken, req.headers['user-agent-u'], exp, 'refresh');

        res.cookie('refresh', refreshToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 24 * 60 * 60 * 30,
        });
    } catch (err) {
        err.message = `generateRefreshTokenHash-> ${err.message}`;
        throw err;
    }
};

const checkIfPermissionsExist = async (req, agentId, module) => {
    try {
        // Get all permission by role
        // agentId = 906; // HAS NO ACCESS
        const data = await getDataAgentModel(agentId);
        req.body.per = data.permissions;
        req.body.userRole = data.roles.roleId;
        req.body.userDepartment = data.departmentId;
        req.body.customerIdUser = data.customerIdUser;
        req.body.userLang = data.lang;
        const actions = {
            GET: 'canView',
            PUT: 'canAdd',
            POST: 'canAdd',
            PATCH: 'canEdit',
            DELETE: 'canDelete',
        };
        /*
          If this route not need permission return module == true,
          If such routing exists in the permissions according to the method, return true,
          else return false (no access).
         */
        const access = (module === true || (data.permissions.find((per) => per.label === module) || {})[actions[req.method]] || false);
        return access;
    } catch (err) {
        err.message = `checkIfPermissionsExist-> ${err.message}`;
        throw err;
    }
};

const checkIfModuleActionExist = async (permissionsData, customerIdUser, labelAction) => {
    try {
        if (!permissionsData) return false;
        if (await isSuperpowersOwnerModel(customerIdUser)) return true;
        return permissionsData.find((permission) => permission.actions.find((action) => action.label === labelAction));
    } catch (err) {
        err.message = `checkIfModuleActionExist-> ${err.message}`;
        throw err;
    }
};

function isActiveNow(activityData) {
    try {
        const now = new Date();
        const day = now.getDay();
        if (!activityData[day]) return false;

        const date = now.toISOString().split('T')[0];// Get date Without hours

        const startTime = new Date(`${date} ${activityData[day].startTime}`);
        const endTime = new Date(`${date}  ${activityData[day].endTime}`);
        return now >= startTime && now <= endTime;
    } catch (err) {
        err.message = `isActiveNow-> ${err.message}`;
        throw err;
    }
}

const generateOtp = async function (data) {
    try {
        // todo : Sends to a procedure that generates an OTP and sends to the user
        const sql = `begin telzar_app.mng_2fa_pkg.get_otp(v_system_id => :v_system_id,
                      v_user_id => :v_user_id,
                      v_type => :v_type,
                      v_ip => :v_ip,
                      v_alertcode => :v_alertcode,
                      v_otp => :v_otp);end;`;
        const bind = {
            v_system_id: 69,
            v_user_id: 100, // data.agentID
            v_type: 1,
            v_ip: '::1',
            v_alertcode: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            v_otp: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        };
        return await dbQuery(sql, bind, '', 'proc');
        // eslint-disable-next-line no-unreachable
    } catch (err) {
        err.message = `generateOtp-> ${err.message}`;
        return err;
    }
};

const generatePassword = async (req, res) => {
    try {
        const { username } = req.body;

        // function for generate password and send in sms
        const sql = 'select bya.auth_pkg.setSendPassword(:username) from dual';
        const bind = [username];
        let response = await dbQuery(sql, bind);

        // eslint-disable-next-line prefer-destructuring
        response = response[0][0];
        if (response === 1) return true;
        return false;
    } catch (err) {
        return err;
    }
};

const isSubordinates = async (agentId, custPkId, serviceId) => {
    try {
        //
        const sql = `begin :result := permissions_pkg.is_subordinates(p_agent_id => :p_agent_id,
                                             p_cust_pk_id => :p_cust_pk_id,
                                             p_service_id => :p_service_id);end;`;
        const bind = {
            p_agent_id: agentId,
            p_cust_pk_id: custPkId || -1,
            p_service_id: serviceId || -1,
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `is_subordinates-> ${err.message}`;
        return err;
    }
};

const checkPermissionHierarchy = async (req) => {
    try {
        let access = 0;

        const params = req.originalUrl.split('/');
        const custPkId = params[2];
        const serviceId = params[4];
        // Checking if the user has access for the customer and their service
        if (serviceId) { access = await isSubordinates(req.body.agentId, custPkId, serviceId); } else access = 1;
        if (access) access = 1;
        return access;
    } catch (err) {
        err.message = `checkPermissionHierarchy-> ${err.message}`;
        return err;
    }
};

export {
    generateAccessTokenHash,
    generateOtp,
    generatePassword,
    generateRefreshTokenHash,
    editTokens,
    checkIfPermissionsExist,
    checkIfModuleActionExist,
    isActiveNow,
    checkPermissionHierarchy,
};
