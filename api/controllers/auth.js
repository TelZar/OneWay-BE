import jwt from 'jsonwebtoken';
import * as authModel from '../models/auth.js';
import { checkCustomerModel } from '../models/customers.js';
import { sendSMS } from '../utils/sms.js';
import {
    getTemplate, isIsraeliPhoneNumber, isEmpty, convertToSeconds,
} from '../utils/helper.js';
import { sendEmail } from '../utils/email.js';
import { checkToken } from '../middlewares/checkAuth.js';
import { insertLogger } from '../utils/logger.js';

const accessExp = '999h';
const refreshExp = '6h';
const otpExp = '1h';
const changePasswordExp = '1h';
const attachmentsExp = '30m';

const sendOtp = async (req, lang, otp) => {
    try {
        let msg;
        const vals = { otp };
        if (req.body.phone && isIsraeliPhoneNumber(req.body.phone)) {
            msg = await getTemplate(lang = 'he' ? 3 : 4, vals);// Otp msg sms
            sendSMS(req.body.phone, msg[0].content);
        } else if (req.body.email) { // Send email
            msg = await getTemplate(lang = 'he' ? 16 : 17, vals);// Otp msg email
            sendEmail('bya@019.co.il', [req.body.email], 'OTP -BYA', msg[0].content);
        }
    } catch (err) {
        err.message = `sendOtp-> ${err.message}`;
        throw err;
    }
};

const saveToken = async (agentId, customerIdUser, expiresIn, userAgent, type = 'access', grantType = null, status = 1, action = 1, fileHash = null) => {
    try {
        const payload = { agentId, customerIdUser };
        if (grantType) payload.grantType = grantType;
        if (fileHash) payload.fileHash = fileHash;
        const accessToken = jwt.sign(
            payload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn },
        );
        console.log({ accessToken });
        // Save Token in MySql
        await authModel.createTokenModel(agentId, userAgent, accessToken, expiresIn, type, status, action);
        return accessToken;
    } catch (err) {
        err.message = `saveToken-> ${err.message}`;
        throw err;
    }
};

const getMyDetails = async (req) => {
    try {
        const data = await authModel.getDataAgentModel(req.body.agentId);
        if (isEmpty(data)) return { status: 204, code: data * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `getMyDetails-> ${err.message}`;
        throw err;
    }
};

const createToken = async (req, res, next) => {
    try {
        insertLogger({
            end_point: 'bya/api createToken',
            logTitle: 'createToken req.body',
            data: req.body,
            type: 'INFO',
            code: 1,
        });
        const userAgent = req.headers['user-agent-u'] || req.headers['user-agent'];
        let code = 1;
        let agentId;
        let data;
        let otpNeeded;
        let accessToken;
        let refreshToken;
        let attachmentsToken;
        let otpToken;
        let keyCheck;
        let otpCreated;
        let response = {};

        switch (req.body.grantType) {
        case 'application':
            agentId = await authModel.verifySecretModel(req.body);
            insertLogger({
                end_point: 'bya/api application',
                logTitle: 'application agentId',
                data: agentId,
                type: 'INFO',
                code: 1,
            });
            console.log({ agentId });
            if (agentId < 0) { code = 30002; break; } // clientId & clientSecret do not match

            data = await authModel.getDataAgentModel(agentId);
            console.log({ data });
            insertLogger({
                end_point: 'bya/api application',
                logTitle: 'application data',
                data,
                type: 'INFO',
                code: 1,
            });
            if (!data || isEmpty(data)) { code = 30000; break; } // General auth error

            // create access token and Save in MySql
            accessToken = await saveToken(agentId, data.customerIdUser, accessExp, userAgent);
            console.log({ accessToken });
            response = {
                tokenType: 'Bearer',
                expiresIn: convertToSeconds(accessExp),
                accessToken,
            };
            break;
        case 'authorization':
            const invalidPasswordOrUserNameCodesArray = [-20007, -20006, -20003, -20002, -20001]; // array of codes to not disclose to client
            response = {
                tokenType: null,
                expiresIn: null,
                accessToken: null,
                otpNeeded: false,
            };

            req.body.phone = /^\d+$/.test(req.body.userName) ? req.body.userName : '';
            req.body.email = req.body.userName && req.body.userName.includes('@') ? req.body.userName : '';

            accessToken = await checkToken(req);
            // insertLogger({
            //     end_point: 'bya/api authorization',
            //     logTitle: 'authorization accessToken',
            //     data: accessToken,
            //     type: 'INFO',
            //     code: 1,
            // });
            if (accessToken !== 1) { code = accessToken; break; }
            agentId = await authModel.loginModel(req); // approve login
            insertLogger({
                end_point: 'bya/api authorization',
                logTitle: 'authorization agentId',
                data: agentId,
                type: 'INFO',
                code: 1,
            });
            if (agentId < 0) {
                return { status: 401, code: invalidPasswordOrUserNameCodesArray.includes(agentId) ? 2001 : agentId * -1 }; // Username does not exist or password is incorrect
            }

            otpNeeded = await authModel.otpNeededModel(agentId);

            if (otpNeeded === 0) { // He did not do otp in 24hours so need otp now
                data = await authModel.getDataAgentModel(agentId);
                if (!data || isEmpty(data)) { code = 30000; break; } // General auth error

                otpCreated = await authModel.generateOtpModel(data);
                if (!otpCreated || otpCreated < 0) return { status: 400, code: 30004 };// OTP generating error
                sendOtp(req, data.lang, otpCreated);

                // create otp token and Save in MySql
                otpToken = await saveToken(agentId, req.body.customerIdUser, otpExp, userAgent, 'otp');

                let otpTargetEmail = null;
                const otpTargetPhone = data.phoneUser ? `${data.phoneUser.slice(-data.phoneUser.length, -4)}****` : null;
                if (data.emailUser && data.emailUser !== '') {
                    const atIndex = data.emailUser.indexOf('@');
                    const dotIndex = data.emailUser.indexOf('.');
                    otpTargetEmail = `${data.emailUser.slice(0, atIndex + 1)}****${data.emailUser.slice(dotIndex)}`;
                }
                response = {
                    tokenType: 'Bearer',
                    expiresIn: convertToSeconds(otpExp),
                    accessToken: otpToken,
                    otpNeeded: true,
                    otpTargetPhone,
                    otpTargetEmail,
                };
            } else {
                let customerIdUser = null; // req.body.customerIdUser;
                const myDetails = await getMyDetails({ body: { agentId } });
                if (!isEmpty(myDetails)) customerIdUser = myDetails.data.customerIdUser;
                else return { status: 401, code: 30000 }; // Token error // When customerIdUser is null

                // create access token and Save in MySql
                accessToken = await saveToken(agentId, customerIdUser, accessExp, userAgent);

                // create refresh token and Save in MySql
                refreshToken = await saveToken(agentId, customerIdUser, refreshExp, userAgent, 'refresh');

                response = {
                    tokenType: 'Bearer',
                    expiresIn: convertToSeconds(accessExp),
                    otpNeeded: false,
                    accessToken,
                    refreshToken,
                };
            }
            break;
        case 'refresh_token':
            accessToken = await checkToken(req, 'refresh');
            if (accessToken !== 1) { code = accessToken; break; }

            // create access token and Save in MySql
            accessToken = await saveToken(req.body.agentId, req.body.customerIdUser, accessExp, userAgent);

            // create refresh token and Save in MySql
            refreshToken = await saveToken(req.body.agentId, req.body.customerIdUser, refreshExp, userAgent, 'refresh');

            response = {
                tokenType: 'Bearer',
                expiresIn: convertToSeconds(accessExp),
                accessToken,
                refreshToken,
            };
            break;
        case 'change_password':
            accessToken = await checkToken(req);
            if (accessToken !== 1) { code = accessToken; break; }

            if (/^\d+$/.test(req.body.userName)) {
                keyCheck = 2;
                req.body.phone = req.body.userName;
            }
            if (req.body.userName.includes('@')) {
                keyCheck = 3;
                req.body.email = req.body.userName;
            }

            agentId = await checkCustomerModel(keyCheck, req.body.userName, req.body.nationalId);
            if (agentId < 1) { code = 30005; break; } // Customer does not exist // Details do not match

            data = await authModel.getDataAgentModel(agentId);
            if (!data || isEmpty(data)) { code = 30000; break; } // General auth error

            otpCreated = await authModel.generateOtpModel(data);
            if (!otpCreated || otpCreated < 0) return { status: 400, code: 30004 };// OTP generating error
            sendOtp(req, data.lang, otpCreated);

            // create otp token and Save in MySql
            otpToken = await saveToken(agentId, req.body.customerIdUser, otpExp, userAgent, 'otp', req.body.grantType);

            let otpTargetEmail = null;
            const otpTargetPhone = data.phoneUser ? `${data.phoneUser.slice(-data.phoneUser.length, -4)}****` : null;
            if (data.emailUser && data.emailUser !== '') {
                const atIndex = data.emailUser.indexOf('@');
                const dotIndex = data.emailUser.indexOf('.');
                otpTargetEmail = `${data.emailUser.slice(0, atIndex + 1)}****${data.emailUser.slice(dotIndex)}`;
            }

            response = {
                tokenType: 'Bearer',
                expiresIn: convertToSeconds(otpExp),
                accessToken: otpToken,
                otpTargetPhone,
                otpTargetEmail,
            };
            break;

        case 'attachments':
            attachmentsToken = await checkToken(req);
            if (attachmentsToken !== 1) { code = attachmentsToken; break; }

            // create attachments token and Save in MySql
            attachmentsToken = await saveToken(req.body.agentId, req.body.customerIdUser, attachmentsExp, userAgent, req.body.grantType, req.body.grantType, 1, 1, req.body.fileHash);

            response = {
                tokenType: 'Bearer',
                expiresIn: convertToSeconds(attachmentsExp),
                attachmentsToken,
            };
            break;
        default:
        { code = 30001; } // grantType not valid
        }
        if (code !== 1) return { status: 400, code };
        return { status: 201, data: response };
    } catch (err) {
        // insertLogger({
        //     end_point: 'createToken err',
        //     logTitle: 'createToken err',
        //     data: err.message,
        //     type: 'INFO',
        //     code: 1,
        // });
        err.message = `createToken-> ${err.message}`;
        throw err;
    }
};

const checkOtp = async (req) => {
    try {
        let accessToken;
        let refreshToken;
        let changePasswordToken;
        let otpTargetValue;
        let response = {};
        if (req.body.otpCode && req.body.otpCode > 0) { // Verify otp
            const userAgent = req.headers['user-agent-u'] || req.headers['user-agent'];

            // Get token from header
            const token = req.headers.authorization?.split(' ')[1]; // Bearer
            if (!token) return { status: 400, code: 3008 };

            // Check if token valid
            const tokenDecode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            // Check if Token Valid for otp
            const tokenValid = await authModel.checkTokenModel(tokenDecode.agentId, token, 'otp');
            if (tokenValid !== 1) return { status: 400, code: 3008 };

            const dataAgent = await authModel.getDataAgentModel(tokenDecode.agentId, 2);
            req.body.phone = dataAgent.phone;

            // Check if the OTP is correct
            const correctOtp = await authModel.checkOtpModel(req.body);
            if (correctOtp < 0) return { status: 400, code: 20010 };// Invalid OTP. OTP valid for 2 minutes

            switch (tokenDecode.grantType) {
            case 'change_password':

                // create changePassword token and Save in MySql
                changePasswordToken = await saveToken(tokenDecode.agentId, req.body.customerIdUser, changePasswordExp, userAgent, 'changePassword');

                response = {
                    tokenType: 'Bearer',
                    expiresIn: convertToSeconds(changePasswordExp),
                    accessToken: changePasswordToken,
                };
                break;
            default: { // grantType = 'refresh_token' or req.body.otpCode
                // create access token and Save in MySql
                accessToken = await saveToken(tokenDecode.agentId, req.body.customerIdUser, accessExp, userAgent);

                // create refresh token and Save in MySql
                refreshToken = await saveToken(tokenDecode.agentId, req.body.customerIdUser, refreshExp, userAgent, 'refresh');

                // Save otp
                await authModel.saveOtp(tokenDecode.agentId);

                // delete otp token
                await authModel.logoutModel(tokenDecode.agentId, token.slice(-15), userAgent, 'otp');

                response = {
                    tokenType: 'Bearer',
                    expiresIn: convertToSeconds(accessExp),
                    accessToken,
                    refreshToken,
                };
            } // end of default case
            } // end of switch

            // Success
            return { status: 201, data: response };
        } if (req.body.otpTarget) {
            // Get token from header
            const token = req.headers.authorization?.split(' ')[1]; // Bearer
            if (!token) return { status: 400, code: 3008 };

            // Check if token valid
            const tokenDecode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            // Check if Token Valid for otp
            const tokenValid = await authModel.checkTokenModel(tokenDecode.agentId, token, 'otp');
            if (tokenValid !== 1) return { status: 400, code: 3008 };

            const { agentId } = tokenDecode;

            const data = await authModel.getDataAgentModel(agentId);
            if (!data || isEmpty(data)) return { status: 400, code: 30000 }; // General auth error

            const otpCreated = await authModel.generateOtpModel(data);
            if (!otpCreated || otpCreated < 0) return { status: 400, code: 30004 };// OTP generating error

            if (req.body.otpTarget === 'phone') req.body.phone = data.phoneUser;
            else if (req.body.otpTarget === 'email') req.body.email = data.emailUser;
            sendOtp(req, data.lang, otpCreated);

            if (req.body.otpTarget === 'phone') otpTargetValue = `${data.phoneUser.slice(-data.phoneUser.length, -4)}****`;
            else if (req.body.otpTarget === 'email') {
                const atIndex = data.emailUser.indexOf('@');
                const dotIndex = data.emailUser.indexOf('.');
                otpTargetValue = `${data.emailUser.slice(0, atIndex + 1)}****${data.emailUser.slice(dotIndex)}`;
            }
            response = { otpTargetValue };
            return { status: 201, data: response };
        }
    } catch (err) {
        return { status: 400, code: 30000, message: err.message };
    }
};

const logout = async (req) => {
    try {
        if (!req.headers['user-agent-u']) req.headers['user-agent-u'] = req.headers['user-agent'];
        const userAgent = req.headers['user-agent-u'] || req.headers['user-agent'];
        const token = req.headers.authorization?.split(' ')[1]; // Bearer
        const tokenDecode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Check if Token Valid for any api in MySql
        const tokenValid = await authModel.checkTokenModel(tokenDecode.agentId, token, 'access');
        if (tokenValid !== 1) return { code: 30000 };

        const { agentId } = tokenDecode;
        // close token from MYSQL
        await authModel.logoutModel(agentId, token.slice(-15), userAgent);
        await authModel.logoutModel(agentId, token.slice(-15), userAgent, 'refresh');

        // Success
        return { status: 201, data: {} };
    } catch (err) {
        err.message = `logout-> ${err.message}`;
        throw err;
    }
};

const changePassword = async (req) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1]; // Bearer
        if (!token) return { status: 400, code: 3008 };

        // Check if token valid
        const tokenDecode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Check if Token Valid for changePassword
        const tokenValid = await authModel.checkTokenModel(tokenDecode.agentId, token, 'changePassword');
        if (tokenValid !== 1) return { status: 400, code: 3008 };

        const { agentId } = tokenDecode;

        const data = await authModel.getDataAgentModel(agentId);
        if (!data || isEmpty(data)) return { status: 400, code: 30000 }; // General auth error

        const dataToChangePassword = {
            custPkIdUser: data.custPkId, phone: data.phoneUser, email: data.emailUser, password: req.body.password,
        };
        const passwordChanged = await authModel.changePasswordModel(dataToChangePassword);
        if (passwordChanged < 0) return { status: 400, code: passwordChanged * -1 };// Password changed failed

        // Reset all Tokens
        const userAgent = req.headers['user-agent-u'] || req.headers['user-agent'];
        await authModel.logoutModel(agentId, token.slice(-15), userAgent, 'otp');
        await authModel.logoutModel(agentId, token.slice(-15), userAgent, 'changePassword');

        // Success
        return { status: 201, data: {} };
    } catch (err) {
        err.message = `changePassword-> ${err.message}`;
        throw err;
    }
};

export {
    createToken,
    checkOtp,
    getMyDetails,
    logout,
    changePassword,
};
