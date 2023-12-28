import express from 'express';
import { validationResult } from 'express-validator';
import {
    AppError, setFormatForExpressValidator, setFormatValidErr, successStatuses,
} from '../utils/error.js';
import { apiResponse } from '../utils/apiJson.js';
import * as validator from '../middlewares/permissions.js';
import * as permissions from '../controllers/permissions.js';
import { moduleRoutes } from '../utils/routesManage.js';
// import { checkIfModuleActionExist } from '../utils/authentication.js';

const router = express.Router();

/* Service -  get, add, edit and close */
router.all('/service', validator.serviceValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'GET':
            data = await permissions.getServices(req);
            break;
        case 'POST':
            data = await permissions.addService(req);
            break;
        case 'PATCH':
            data = await permissions.editService(req);
            break;
        case 'DELETE':
            data = await permissions.delService(req);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);//* union data
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/service')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Department -  get, add, edit and close */
router.all(moduleRoutes.routes.departments.base, validator.departmentValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        // Set agentId user
        req.body.agentId = req.agentId;
        req.params.agentId = req.agentId;

        if (req.originalUrl.endsWith('departments')) { //  '/departments'
            switch (req.method) {
            case 'GET':
                data = await permissions.getDepartment(req);
                break;
            case 'POST':
                data = await permissions.addDepartment(req);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
                break;
            }
        } else if (req.originalUrl.match(/departments\/\d+$/)) { //   '/departments/:departmentId'
            switch (req.method) {
            case 'GET':
                data = await permissions.getDepartment(req);
                break;
            case 'POST':
                data = await permissions.addDepartment(req);
                break;
            case 'PATCH':
                data = await permissions.editDepartment(req);
                break;
            case 'DELETE':
                data = await permissions.delDepartment(req);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
                break;
            }
        }// '/departments/:departmentId/role'

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}${req.originalUrl}-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Role -  get, add, edit and close */
router.all(moduleRoutes.routes.roles.base, validator.roleValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        // Set agentId user
        req.body.agentId = req.agentId;
        req.params.agentId = req.agentId;

        let data;

        if (req.originalUrl.endsWith('role')) { // '/departments/:departmentId/role'
            switch (req.method) {
            case 'POST':
                data = await permissions.addRole(req);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
                break;
            }
        } else if (req.originalUrl.match(/role\/\d+$/)) { // '/departments/:departmentId/role/:roleId'
            switch (req.method) {
            case 'GET':
                data = await permissions.getRole(req);
                break;
            case 'PATCH':
                data = await permissions.editRole(req);
                break;
            case 'DELETE':
                data = await permissions.delRole(req);
                break;
            default:
                next(new AppError(404, setFormatValidErr(3005)));
                break;
            }
        } else if (req.originalUrl.endsWith('users')) { // '/departments/:departmentId/role/:roleId/users'
            // case 'users':
            switch (req.method) {
            case 'GET':
                data = await permissions.getRole(req, 1);
                break;
            default:
                next(new AppError(404, setFormatValidErr(3005)));
                break;
            }
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}${req.originalUrl}-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Permission - add, edit and close */
router.all(moduleRoutes.routes.roles.permissions, validator.permissionValidator(), async (req, res, next) => {
    try {
        // Set agentId user
        req.body.agentId = req.agentId;
        req.params.agentId = req.agentId;
        req.body.customerIdUser = req.customerIdUser;

        // if (!await checkIfModuleActionExist(req.body.per, req.body.customerIdUser, 'edit_permissions')) return next(new AppError(401, setFormatValidErr(2008)));// No permission to action

        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        // case 'GET':
        //     data = await permissions.getPermission(req);
        //     break;
        case 'POST':
            data = await permissions.addPermission(req);
            break;
        case 'PATCH':
            data = await permissions.editPermission(req);
            break;
        case 'DELETE':
            data = await permissions.delPermission(req);
            break;
        default:// Not found
            next(new AppError(404, setFormatValidErr(3005)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/permission')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Module - get, add, edit and close */
router.all(moduleRoutes.routes.roles.modules, /* validator.moduleValidator(), */async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        // Set agentId user
        req.body.agentId = req.agentId;
        req.params.agentId = req.agentId;

        let data;
        switch (req.method) {
        case 'GET':// Get all modules with their actions
            data = await permissions.getModules(req);
            break;
        case 'POST':
            data = await permissions.addModule(req);
            break;
        case 'PATCH':
            data = await permissions.editModule(req);
            break;
        case 'DELETE':
            data = await permissions.delModule(req);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/module')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

// Change role to agentId
router.all('/associateRole', validator.associateValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'PUT':
            data = await permissions.associateRoleToAgents(req);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/associateRoleToAgents')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.use(express.json());
export default router;
