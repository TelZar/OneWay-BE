import jwt from 'jsonwebtoken';
import { checkIfPermissionsExist } from '../utils/authentication.js';
import { AppError, setFormatValidErr } from '../utils/error.js';
import {
    excludedFromAuth,
    getModuleFromPath, hasAccessToAttachments,
    isThereAccessHashQuery,
} from '../utils/routesManage.js';
import { checkTokenModel, isSuperpowersOwnerModel } from '../models/auth.js';
import { insertLogger } from '../utils/logger.js';
import { getMyDetails } from '../controllers/auth.js';
import { getCustomer } from '../controllers/customers.js';
import { isEmpty } from '../utils/helper.js';

let token = '';
const checkToken = async (req, type = 'access') => {
    try {
        if (!req.headers['user-agent-u']) req.headers['user-agent-u'] = req.headers['user-agent'];

        if (req.query.hash && !isThereAccessHashQuery(req.originalUrl)) return { code: 2013 };// No access to hash query

        // Get token from header
        token = req.query.hash ? jwt.verify(req.query.hash, process.env.ACCESS_TOKEN_SECRET).token : req.headers.authorization?.split(' ')[1]; // Bearer
        if (type === 'attachments') token = req.query.token;
        insertLogger({
            end_point: 'checkToken',
            logTitle: 'token is:',
            data: token,
            type: 'INFO',
            code: 1,
        });

        // Check if token valid
        const tokenDecode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Check if Token Valid for any api in MySql
        const tokenValid = await checkTokenModel(tokenDecode.agentId, token, type);
        // insertLogger({
        //     end_point: 'checkToken',
        //     logTitle: 'tokenValid',
        //     data: tokenValid,
        //     type: 'INFO',
        //     code: 1,
        // });
        if (tokenValid !== 1) return { code: 30000, message: 'Token is not valid' };

        if (type === 'attachments' && req.params.fileHash !== tokenDecode.fileHash) return { code: 30005 };// Details do not match

        insertLogger({
            end_point: 'bya/api',
            logTitle: 'bya tokenDecode',
            data: tokenDecode,
            type: 'INFO',
            code: 1,
        });

        global.agentId = tokenDecode.agentId;
        req.body.customerIdUser = tokenDecode.customerIdUser; // Set customerIdUser in body
        req.body.agentId = tokenDecode.agentId; // Set userId in body
        req.params.agentId = tokenDecode.agentId; // Set userId in params
        req.agentId = tokenDecode.agentId; // Set agentId in req
        req.customerIdUser = tokenDecode.customerIdUser; // Set customerIdUser in req

        req.body.agentIdCashbox = tokenDecode.agentId;
        req.body.customerIdUserCashbox = tokenDecode.customerIdUser;

        // cashbox
        const myDetails = await getMyDetails(req);
        if (!isEmpty(myDetails)) {
            const allMyServices = await getCustomer({ custPkId: myDetails.data.custPkId }, -99);
            req.body.custPkIdCashbox = myDetails.data.custPkId || null;
            if (allMyServices.status === 200) {
                const allMyServicesData = allMyServices.data;
                const hasCashboxService = allMyServicesData.find((obj) => obj.serviceId === 201);
                if (hasCashboxService) {
                    const { agentId, customerId } = hasCashboxService;
                    req.body.agentIdCashbox = agentId || null;
                    req.body.customerIdUserCashbox = customerId || null;
                    // req.body.custPkId = myDetails.data.custPkId || null;
                }
            }
        }

        insertLogger({
            end_point: 'bya/api',
            logTitle: 'bya req.body',
            data: req.body,
            type: 'INFO',
            code: 1,
        });

        return 1;
    } catch (err) {
        return { code: 30000, message: err.message };
    }
};

const checkTokenMiddleware = async (req, res, next) => {
    try {
        req.body.originalPassword = req.body.password ? req.body.password : null;
        insertLogger({
            end_point: 'bya/api checkTokenMiddleware',
            logTitle: 'checkTokenMiddleware req.body',
            data: req.body,
            type: 'INFO',
            code: 1,
        });
        // Excluded pathes
        if (excludedFromAuth.includes(req.originalUrl) || hasAccessToAttachments(req.originalUrl)) return next();

        const response = await checkToken(req);
        insertLogger({
            end_point: 'checkTokenMiddleware',
            logTitle: 'response',
            data: response,
            type: 'INFO',
            code: 1,
        });
        if (response.code && response.code === 30000) {
            insertLogger({
                end_point: 'checkTokenMiddleware',
                logTitle: 'start return token error',
                data: response,
                type: 'INFO',
                code: 1,
            });
            next(new AppError(401, setFormatValidErr(30000, { freeText: response.message, title: 'token' })));// General auth error
        } else if (response.code && response.code === 404) next(new AppError(404, setFormatValidErr(3005)));
        else if (response.code && response.code === 2010) next(new AppError(401, setFormatValidErr(2010, { title: 'permissions' })));// No access
        else if (response.code && response.code === 2013) next(new AppError(401, setFormatValidErr(2013, { title: 'permissions' })));// No access to hash query

        if (response === 1 && await isSuperpowersOwnerModel(req) !== 1) {
            // Check if path exists
            const module = getModuleFromPath(req.originalUrl);
            if (!module) return { code: 404 };

            // Check base permissions
            if (!await checkIfPermissionsExist(req, req.body.agentId, module)) next(new AppError(401, setFormatValidErr(2010, { title: 'permissions' })));// No access;
        }

        next();
    } catch (err) {
        next(new AppError(401, setFormatValidErr(3000, { freeText: err.message, title: 'checkToken' })));
    }
};

export {
    checkToken,
    checkTokenMiddleware,
};
