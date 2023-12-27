import express from 'express';
import { validationResult } from 'express-validator';
import multer from 'multer';
import md5 from 'md5';
import moment from 'moment';
import {
    AppError, setFormatForExpressValidator, setFormatValidErr, successStatuses,
} from '../utils/error.js';
import { apiResponse } from '../utils/apiJson.js';
import * as geoController from '../controllers/geo.js';
import * as localizationController from '../controllers/localization.js';
import * as notificationsController from '../controllers/notifications.js';
import * as templatesController from '../controllers/templates.js';
import * as productController from '../controllers/products.js';
import * as customerController from '../controllers/customers.js';
import { notificationsValidator } from '../middlewares/profile.js';
import { moduleRoutes } from '../utils/routesManage.js';
import * as accessories from '../controllers/accessories.js';
import * as validator from '../middlewares/system.js';
import {
    geoValidator, attachmentsValidator, sendValidator, checkIccidValidator,
} from '../middlewares/system.js';
import { checkIccidValidiation, getHlrProduct, getNewTzNumber } from '../controllers/cellularActions.js';
import { getAttachments, send } from '../controllers/attachments.js';
import FILES_PATH_CONFIG from '../config/url.js';
import { filesValidator } from '../middlewares/files.js';
import * as fileManage from '../utils/fileManage.js';

const router = express.Router();

// Handle files
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, FILES_PATH_CONFIG.SFTP);
    },
    filename: (req, file, cb) => {
        const fileName = `${md5(file.originalname)}${moment(new Date()).format('DDMMYYHHMMSS')}.${file.mimetype.split('/')[1]}`; // Hash+TimeStamp.ext
        req.hash = fileName;
        cb(null, fileName);
    },
});

const multerFilter = async (req, file, cb) => {
    switch (req.headers.type) {
    case '1': // id & Passport
        if (['jpg', 'png', 'pdf'].includes(file.mimetype.split('/')[1])) { // uploading
            cb(null, true);
        } else cb(null, false); // Not uploading
        break;
    default:
        cb(null, false); // Not uploading
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: {
        fileSize: 216 * 1024, // 210KB
    },
});

router.all(moduleRoutes.routes.system.files, filesValidator(), upload.single('files'), async (req, res, next) => {
    let data;
    try {
        switch (req.method) {
        case 'POST':
            data = await fileManage.uploadFiles(req);
            break;
        case 'GET':
            data = await fileManage.getFiles(req, res);
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/files')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Currencies */
router.get(moduleRoutes.routes.system.currencies, async (req, res, next) => {
    let data;
    try {
        switch (req.method) {
        case 'GET':
            data = await geoController.getCurrencies(req);
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/currencies')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Geography */
router.all(moduleRoutes.routes.system.geo, geoValidator(), async (req, res, next) => {
    try {
        let data;
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        if (req.originalUrl.endsWith('countries')) { // '/utils/geo/countries'
            switch (req.method) {
            case 'GET':
                data = await geoController.getCountry(null);// Get all countries list
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/countries\/\d+$/) || req.originalUrl.match(/countries\?query=(.*)$/)) { // '/countries/:countryId' ,'/countries?query=..
            switch (req.method) {
            case 'GET':
                data = await geoController.getCountry(req.params.countryId, req.query.query); // Get specific country
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.endsWith('cities')) { // '/countries/:countryId/cities'
            switch (req.method) {
            case 'GET':
                data = await geoController.getCity(req.params.countryId, null); // Get all cities list in specific country
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/cities\/\d+$/)) { // '/countries/:countryId/cities/:cityId'
            switch (req.method) {
            case 'GET':
                data = await geoController.getCity(req.params.countryId, req.params.cityId); // Get specific city in specific country
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.endsWith('streets')) { // '/countries/:countryId/cities/:cityId/streets'
            switch (req.method) {
            case 'GET':
                data = await geoController.getStreet(req.params.countryId, req.params.cityId, null); // Get all streets list in specific city in specific country
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/streets\/\d+$/)) { // '/countries/:countryId/cities/:cityId/streets/:streetId'
            switch (req.method) {
            case 'GET':
                data = await geoController.getStreet(req.params.countryId, req.params.cityId, req.params.streetId); // Get specific street in specific city in specific country
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else next(new AppError(404, setFormatValidErr(3005)));

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/geography')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all('/templates/:moduleId', async (req, res, next) => {
    try {
        let data;
        switch (req.method) {
        case 'GET':
            data = await templatesController.getTemplates(req);
            break;
        default:// Not found path
            next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/templates/:moduleId')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all('/notifications', notificationsValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'GET':
            data = await notificationsController.getNotifications();
            break;
        case 'DELETE':
            data = await notificationsController.markAsRead(req);
            break;
        default:// Not found path
            // next(new AppError(404, setFormatValidErr(3005)));
            break;
        }
        // if (data.status !== 200) return next(new AppError(400, setFormatValidErr(data.code)));

        // Success
        console.log(data);
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `get('/notifications')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.system.languages, async (req, res, next) => {
    try {
        let data;
        if (req.originalUrl.endsWith('customerFinanceLanguages')) { // system/localization/options/customerFinanceLanguages
            switch (req.method) {
            case 'GET':
                data = await localizationController.customerFinanceLanguages();
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
                break;
            }
        } else if (req.originalUrl.endsWith('systemLanguages')) { // system/utils/localization/options/systemLanguages
            switch (req.method) {
            case 'GET':
                data = await localizationController.systemLanguages();
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
                break;
            }
        } else next(new AppError(404, setFormatValidErr(3005)));
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/languages')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Shortcut - get, add, edit and close */
router.all(moduleRoutes.routes.system.shortcuts, /* validator.shortcutValidator(), */ async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        switch (req.method) {
        case 'GET':
            data = await accessories.getShortcuts(req);// Get all shortcuts for user
            break;
        case 'POST':
            data = await accessories.addShortcut(req);
            break;
        case 'PATCH':
            data = await accessories.editShortcut(req);
            break;
        case 'DELETE':
            data = await accessories.delShortcut(req);
            break;
        default:// Not found
            next(new AppError(404, setFormatValidErr(3005)));
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

/* Dashboard */
router.all(moduleRoutes.routes.system.dashboards, validator.dashboardValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        if (req.originalUrl.endsWith('dashboard')) { // '/dashboard'
            switch (req.method) {
            case 'GET':
                data = await accessories.getDashboards(req);// Get all template widgets
                break;
            case 'POST':
                data = await accessories.addDashboard(req);// Add new template
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/dashboard\/\d+$/)) { // '/dashboard/:dashboardId'
            switch (req.method) {
            case 'PATCH':
                data = await accessories.editDashboard(req);// Update template
                break;
            case 'DELETE':
                data = await accessories.delDashboard(req);// Delete template
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else next(new AppError(404, setFormatValidErr(3005)));

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/dashboard')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Widgets */
router.all(moduleRoutes.routes.system.widgets, validator.widgetValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        if (req.originalUrl.endsWith('widget')) { // '/dashboard/:dashboardId/widget'
            switch (req.method) {
            case 'GET':
                data = await accessories.getAgentWidgets(req);// Get all widgets for user
                break;
            case 'POST':
                data = await accessories.addAgentWidget(req);// Add new widget for user
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/widgetPrimary\/\d+$/)) { // '/dashboard/:dashboardId/widgetPrimary/:widgetPrimaryId'
            switch (req.method) {
            case 'GET':
                data = await accessories.getAgentWidgetsData(req);// Get all data by widget primary Id
                break;
            case 'POST':// Adding to an existing primary widget
                data = await accessories.addAgentWidget(req);
                break;
            case 'DELETE':
                data = await accessories.delAgentWidget(req);// Delete all widgets linked to primary
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/widget\/\d+$/)) { // '/dashboard/:dashboardId/widget/:widgetId'
            switch (req.method) {
            case 'PATCH':
                data = await accessories.editAgentWidget(req);
                break;
            case 'DELETE':
                data = await accessories.delAgentWidget(req);
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else next(new AppError(404, setFormatValidErr(3005)));

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // console.log('dddd = ', data);
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/widget')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Products */
router.all(moduleRoutes.routes.system.products, async (req, res, next) => {
    try {
        let data;
        if (req.originalUrl.endsWith('status')) { // '/system/products/options/status'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductStatus();// Get Statuses list of Products
                break;
            case 'POST':
                data = await productController.addProductStatus(req.body);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/status\/\d+$/)) { // '/products/status/:statusId'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductStatus(req.params.statusId);
                break;
            case 'DELETE':
                data = await productController.deleteProductStatus(req.params.statusId);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.endsWith('names')) { // '/products/options/categories/:categoryId/names'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductNames(req.params.categoryId);// Get names list of Products
                break;
            case 'POST':
                data = await productController.addProductName(req.params.categoryId, req.body);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/names\/\d+$/)) { // '/products/options/categories/:categoryId/names/:nameId'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductNames(req.params.categoryId, req.params.nameId);
                break;
            case 'DELETE':
                data = await productController.deleteProductName(req.params.nameId);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.endsWith('manufacturer')) { // '/products/options/categories/:categoryId/names/:nameId/manufacturer'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductManufacturer(req.params.nameId);// Get Manufacturers list of Products
                break;
            case 'POST':
                console.log('post req: ', req.body);
                data = await productController.addProductManufacturer(req.params.nameId, req.body);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/manufacturer\/\d+$/)) { // '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductManufacturer(req.params.nameId, req.params.manufacturerId);
                break;
            case 'DELETE':
                data = await productController.deleteProductManufacturer(req.params.manufacturerId);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.endsWith('models')) { // '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId/models'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductModels(req.params.nameId, req.params.manufacturerId);// Get Models list of Products
                break;
            case 'POST':
                data = await productController.addProductModel(req.params.nameId, req.params.manufacturerId, req.body);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/models\/\d+$/)) { // '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId/models/:modelId'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductModels(req.params.nameId, req.params.manufacturerId, req.params.modelId);
                break;
            case 'DELETE':
                data = await productController.deleteProductModel(req.params.modelId);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.endsWith('firstSubCategory')) { // '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId/models/:modelId/firstSubCategory'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductFirstSubCategory(req.params.modelId);// Get FirstSubCategory list of Products
                break;
            case 'POST':
                data = await productController.addProductFirstSubCategory(req.params.modelId, req.body);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/firstSubCategory\/\d+$/)) {
            // '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId/models/:modelId/firstSubCategory/:firstSubCategory'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductFirstSubCategory(req.params.modelId, req.params.firstSubCategory);// Get FirstSubCategory list of Products
                break;
            case 'DELETE':
                data = await productController.deleteProductFirstSubCategory(req.params.firstSubCategory);// Get FirstSubCategory list of Products
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.endsWith('colors')) { // '/system/products/options/colors'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductColors();// Get Colors list
                break;
            case 'POST':
                data = await productController.addProductColor(req.body);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/colors\/\d+$/)) { // '/system/products/options/colors/:colorId'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductColors(req.params.colorId);// Get Colors list
                break;
            case 'DELETE':
                data = await productController.deleteProductColors(req.params.colorId);// Get Colors list
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else next(new AppError(404, setFormatValidErr(3005)));

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/system/products')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Customers */
router.all(moduleRoutes.routes.system.customers, async (req, res, next) => {
    try {
        let data;
        if (req.originalUrl.endsWith('customerTypes')) { // '/customers/options/customerTypes'
            switch (req.method) {
            case 'GET':
                data = await customerController.getCustomerTypes();// Get customerTypes list
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } if (req.originalUrl.endsWith('subscribers') || req.originalUrl.match(/subscribers\?(q|limit|serviceId)=\S+(&|$)/)) { // /customers/options/subscribers
            switch (req.method) {
            case 'GET':
                data = await customerController.getCashboxSubscribers(req);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else next(new AppError(404, setFormatValidErr(3005)));

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/system/customers')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Rates */
router.all(moduleRoutes.routes.system.rates, async (req, res, next) => {
    try {
        let data;
        if (req.originalUrl.endsWith('countries')) { // 'system/rates/options/countries'
            switch (req.method) {
            case 'GET':
                req.body.isRegion = 0;
                data = await geoController.getRatesCountriesOrRegions(req);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/countries\/-?\d+$/) // '/system/rates/options/countries/256'
        || req.originalUrl.match(/countries\?(q|limit|hasProducts)=\S+(&|$)/)// '/system/rates/options/countries?hasProducts=1&limit=10&q=מולד'
        ) {
            switch (req.method) {
            case 'GET':
                req.body.isRegion = 0;
                data = await geoController.getRatesCountriesOrRegions(req);
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.endsWith('regions')) { // 'system/rates/options/regions'
            switch (req.method) {
            case 'GET':
                req.body.isRegion = 1;
                data = await geoController.getRatesCountriesOrRegions(req);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/regions\/-?\d+$/)// 'system/rates/options/regions/-103'
            || req.originalUrl.match(/\/regions\?(q|limit|hasProducts)=\S+(&|$)/)// 'system/rates/options/regions?hasProducts=0&limit=10&q=אמרי'
        ) {
            switch (req.method) {
            case 'GET':
                req.body.isRegion = 1;
                data = await geoController.getRatesCountriesOrRegions(req);
                break;
            default:// Not found
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else next(new AppError(404, setFormatValidErr(3005)));

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/rates')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.system.generatePhoneNumbers, async (req, res, next) => {
    let data = [];
    try {
        switch (req.method) {
        case 'POST':
            data = await getNewTzNumber(req.body.count);
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/generatePhoneNumbers')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.system.cellularActions, async (req, res, next) => {
    let data = [];
    try {
        switch (req.method) {
        case 'GET':
            data = await getHlrProduct(); // call controller function
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/cellularActions')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.system.attachments, attachmentsValidator(), async (req, res, next) => {
    // Error validation
    const errs = setFormatForExpressValidator(validationResult(req).errors);
    if (errs) return next(new AppError(400, errs));

    let data = [];
    try {
        switch (req.method) {
        case 'GET':
            data = await getAttachments(req, res);
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/attachments')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.system.send, sendValidator(), async (req, res, next) => {
    // Error validation

    const errs = setFormatForExpressValidator(validationResult(req).errors);
    if (errs) return next(new AppError(400, errs));
    let data = [];
    try {
        switch (req.method) {
        case 'POST':
            data = await send(req);
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/send')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.all(moduleRoutes.routes.system.iccidValidation, checkIccidValidator(), async (req, res, next) => {
    try {
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));
        let data = [];
        switch (req.method) {
        case 'POST':
            data = await checkIccidValidiation(req.body.simIccid); // call controller function
            break;
        default:// Not found path
            next(new AppError(400, setFormatValidErr(1020)));
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code, { freeText: data.info })));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/iccidValidation')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.use(express.json());

export default router;
