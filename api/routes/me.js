import express from 'express';
import { validationResult } from 'express-validator';
import { apiResponse } from '../utils/apiJson.js';
import * as auth from '../controllers/auth.js';
import {
    AppError, setFormatForExpressValidator, setFormatValidErr, successStatuses,
} from '../utils/error.js';
import { moduleRoutes } from '../utils/routesManage.js';
import * as accessories from '../controllers/accessories.js';
import { shortcutValidator } from '../middlewares/me.js';

const router = express.Router();

router.get(moduleRoutes.routes.me.me, async (req, res, next) => {
    try {
        // Login
        const data = await auth.getMyDetails(req);
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `post('/getMyDetails')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Shortcut - get, add, edit and close */
router.all(moduleRoutes.routes.me.shortCut, shortcutValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        if (req.originalUrl.endsWith('dockBar')) { // '/me/dockBar'
            switch (req.method) {
            case 'GET':
                data = await accessories.getShortcuts(req);// Get all shortcuts for user
                break;
            case 'POST':
                data = await accessories.addShortcut(req);
                break;
            case 'PATCH':
                data = await accessories.editSortingShortcut(req);
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/dockBar\/\d+$/)) { // '/me/dockBar/:shortcutId'
            switch (req.method) {
            case 'PATCH':
                data = await accessories.editShortcut(req);
                break;
            case 'DELETE':
                data = await accessories.delShortcut(req);
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        }

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/shortcut')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.use(express.json());
export default router;
