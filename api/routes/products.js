import express from 'express';
import { validationResult } from 'express-validator';
import { apiResponse } from '../utils/apiJson.js';
import {
    AppError, setFormatForExpressValidator, setFormatValidErr, successStatuses,
} from '../utils/error.js';
import * as productController from '../controllers/products.js';
import { moduleRoutes } from '../utils/routesManage.js';
import { categoryValidator, productValidator, rateValidator } from '../middlewares/products.js';

const router = express.Router();

/* Categories */
router.all(moduleRoutes.routes.products.categories, categoryValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        if (req.originalUrl.endsWith('categories')) { // '/products/categories'
            switch (req.method) {
            case 'GET':
                data = await productController.getCategory();
                break;
            case 'POST':
                data = await productController.setCategory(req);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/categories\/\d+$/)) { // '/products/categories/:categoryId'
            switch (req.method) {
            case 'GET':
                data = await productController.getCategory(req.params.categoryId);
                break;
            case 'PATCH':
                data = await productController.setCategory(req);
                break;
            case 'DELETE':
                data = await productController.deleteCategory(req.params.categoryId);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.endsWith('products')) { // '/products/categories/:categoryId/products'
            switch (req.method) {
            case 'GET':
                data = await productController.getCategoryProducts(req.params.categoryId);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/categories')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Products */
router.all(moduleRoutes.routes.products.products, productValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        // if (req.originalUrl.endsWith('search')) { // '/products/search'
        //     switch (req.method) {
        //     case 'GET':
        //         data = await productController.getProduct();
        //         break;
        //     default:
        //         next(new AppError(400, setFormatValidErr(1020)));
        //     }
        // } else
        if (req.originalUrl.endsWith('products')) { // '/products'
            switch (req.method) {
            // case 'GET':
            //     data = await productController.getProduct();
            //     break;
            case 'POST':
                data = await productController.setProduct(req);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/products\/\d+$/)) { // '/products/:productId'
            switch (req.method) {
            case 'GET':
                data = await productController.getProduct(req.params.productId, req.body.agentId);
                break;
            case 'PATCH':
                data = await productController.setProduct(req, 1);
                break;
            case 'DELETE':
                data = await productController.deleteProduct(req.params.productId);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/^\/products\/\d+\/categories$/)) { // '/products/:productId/categories'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductCategories(req.params.productId);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        } else if (req.originalUrl.match(/^\/products\/\d+\/rates$/)) { // '/products/:productId/rates'
            switch (req.method) {
            case 'GET':
                data = await productController.getProductRates(req.params.productId);
                break;
            default:// Not found path
                next(new AppError(404, setFormatValidErr(3005)));
            }
        }

        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));

        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/products')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

/* Rates */
router.all(moduleRoutes.routes.products.rates, rateValidator(), async (req, res, next) => {
    try {
        // Error validation
        const errs = setFormatForExpressValidator(validationResult(req).errors);
        if (errs) return next(new AppError(400, errs));

        let data;
        // if (req.originalUrl.endsWith('rates')) { // '/products/rates'
        //     switch (req.method) {
        //     default:
        //         next(new AppError(400, setFormatValidErr(1020)));
        //     }
        // } else if (req.originalUrl.match(/rates\/\d+$/)) { // '/products/rates/:rateId'
        //     switch (req.method) {
        //     default:
        //         next(new AppError(400, setFormatValidErr(1020)));
        //     }
        // } else
        if (req.originalUrl.endsWith('products')) { // '/products/rates/:rateId/products'
            switch (req.method) {
            case 'POST':
                data = await productController.setRate(req.body, req.params);
                break;
            case 'GET':
                data = await productController.getRateProducts(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/products\/\d+$/)) { // '/products/rates/:rateId/products/:productId'
            switch (req.method) {
            case 'GET':
                data = await productController.getRateProducts(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.endsWith('categories')) { // '/products/rates/:rateId/categories'
            switch (req.method) {
            case 'GET':
                data = await productController.getRateCategories(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        } else if (req.originalUrl.match(/categories\/\d+$/)) { // '/products/rates/:rateId/categories/:categoryId'
            switch (req.method) {
            case 'GET':
                data = await productController.getRateCategories(req.params);
                break;
            default:
                next(new AppError(400, setFormatValidErr(1020)));
            }
        }
        if (!successStatuses.includes(data.status)) return next(new AppError(data.status, setFormatValidErr(data.code)));
        // Success
        const response = await apiResponse(req, data);
        res.status(data.status).send(response);
    } catch (err) {
        err.message = `${req.method}('/rates')-> ${err.message}`;
        next(new AppError(500, err.message));
    }
});

router.use(express.json());

export default router;
