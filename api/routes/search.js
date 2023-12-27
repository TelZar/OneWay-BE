import d from 'dompurify';
import express from 'express';
import { validationResult } from 'express-validator';
import { apiResponse } from '../utils/apiJson.js';
import {
    searchValidator,
    quickSearchValidator,
    colsSearchValidator,
    parseSearchQueryParameter,
    saveSearchValidator,
} from '../middlewares/search.js';
import {
    advancedSearch, getQuickSearch, saveSearch, advancedSearchCols, getSavedSerach, updateSavedSerach, editSortSavedSearches, editSavedSearches,
} from '../controllers/search.js';
import {
    AppError, setFormatForExpressValidator, setFormatValidErr, successStatuses,
} from '../utils/error.js';
import { moduleRoutes } from '../utils/routesManage.js';

const router = express.Router();

router.get(moduleRoutes.routes.search.advancedSearch, parseSearchQueryParameter, searchValidator(), async (req, res, next) => {
    try {
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        const requestParameter = { ...req.query, ...req.body };
        const data = await advancedSearch(requestParameter);
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // success
        const response = data.result;
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `get('/search')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.get('/advancedSearchCols/:page', colsSearchValidator(), async (req, res, next) => {
    try {
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        const data = await advancedSearchCols(req);
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // success
        const response = data.result;
        res.status(data.status).send(d.sanitize(response));
    } catch (err) {
        err.message = `get('/advancedSearchCols')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

// router.get('/advancedSearch', searchValidator(), async (req, res, next) => {
//     try {
//         const errs = setFormatForExpressValidator(validationResult(req).errors);
//         if (errs) return next(new AppError(400, errs));
//
//         const data = await advancedSearch(req);
//         if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
//         // success
//         const response = data.result;
//         res.status(data.status).send(response);
//     } catch (err) {
//         err.message = `get('/advancedSearch')-> ${err.message}`;
//         next(new AppError(500, err.message));
//     }
// });

router.get(moduleRoutes.routes.search.quickSearch, quickSearchValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        // getData
        const data = await getQuickSearch(req);
        if (data.status !== 200) return next(new AppError(400, setFormatValidErr(data.code)));
        // Success
        res.status(data.status).send(data.resultsArray);
    } catch (err) {
        err.message = `get('/quickSearch')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

// router.post('/saveSearch', searchValidator(), async (req, res, next) => {
//     try {
//         // Error validation
//         const errs = setFormatForExpressValidator(validationResult(req).errors);
//         if (errs) return next(new AppError(400, errs));
//         // getData
//         const data = await saveSearch(req);
//         if (data.status !== 200) return next(new AppError(400, setFormatValidErr(data.code)));
//         // Success
//         const response = await apiResponse(req, data);
//         res.status(data.status).send(response);
//     } catch (err) {
//         err.message = `post('/saveSearch')-> ${err.message}`;
//         next(new AppError(500, err.message));
//     }
// });

router.all(moduleRoutes.routes.search.save, saveSearchValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        let data;
        switch (req.params.module) {
        case 'communicationProducts':
            req.body.modulePage = 4;
            break;
        case 'transactions':
            req.body.modulePage = 3;
            break;
        case 'products':
            req.body.modulePage = 2;
            break;
        case 'customers':
            req.body.modulePage = 1;
            break;
        default:
            return null;
        }
        const dataRequest = { ...req.body, ...req.params };
        if (req.params.searchId !== undefined) {
            switch (req.method) {
            case 'DELETE':
                data = await updateSavedSerach(dataRequest);
                break;
            case 'PATCH':
                data = await editSavedSearches(dataRequest);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
                break;
            }
        } else {
            switch (req.method) {
            case 'GET':
                data = await getSavedSerach({ ...req.body, ...req.query });
                break;
            case 'POST':
                data = await saveSearch(req.body);
                break;
            case 'PATCH':
                data = await editSortSavedSearches(req.body);
                break;
            default:// Not found path
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

router.use(express.json());

export default router;
