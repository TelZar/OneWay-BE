import { body } from 'express-validator';
import { isEmpty } from '../utils/helper.js';

function categoryValidator() {
    return [
        body(['mainCategoryId', 'typeProductId'])
            .isNumeric().withMessage(1008) // Invalid value
            .optional(),
        body(['categoryName', 'description'])
            .isString().withMessage(1003) // Must be non-numeric
            .isLength({ min: 2, max: 128 })
            .withMessage(1001) // Invalid length
            .optional(),
    ];
}
function productValidator() {
    return [

        body('products')
            .if((value, { req }) => ['POST'].includes(req.method))
            .isArray()
            .withMessage(1003) // The type is not suitable
            .if((value, { req }) => value !== undefined)
            .custom((value) => value.length > 0)
            .withMessage(1003) // At least one product is required
            .isArray({ min: 1 })
            .withMessage(1003) // At least one product is required
            .custom((value) => {
                if (isEmpty(value)) throw new Error('products must be an array');
                for (const item of value) {
                    console.log('item.hlrId: ', item.hlrId);
                    if (isEmpty(item)) throw new Error('products are empty');
                    if (!item.productId || typeof item.productId !== 'string') throw new Error('products.productId required, string');
                    if (!item.name || typeof item.name !== 'string' || item.name.length < 2 || item.name.length > 250) throw new Error('products.name required, string, 250>length>2');
                    if (item.hlrId === undefined || typeof item.hlrId !== 'number' || !(item.hlrId === 0 || item.hlrId === 1)) {
                        throw new Error('products.hlrId required, numeric, equal to 0 or 1');
                    } if (item.description && (typeof item.description !== 'string' || item.description.length < 2 || item.description.length > 2000)) {
                        throw new Error('products.description string, 2000>length>2');
                    }
                    if (item.specifications && (typeof item.specifications !== 'string' || item.specifications.length < 2 || item.specifications.length > 128)) {
                        throw new Error('products.specifications string, 2000>length>2');
                    }
                    if (item.voice && typeof item.voice !== 'number') throw new Error('products.voice number');
                    if (item.sms && typeof item.sms !== 'number') throw new Error('products.sms number');
                    if (item.idata && typeof item.idata !== 'number') throw new Error('products.idata number');
                    if (item.allowBalanceTransfer && typeof item.allowBalanceTransfer !== 'number') throw new Error('products.allowBalanceTransfer number');
                    if (item.daysValid && typeof item.daysValid !== 'number') throw new Error('products.daysValid number');
                    if (item.status && typeof item.status !== 'number') throw new Error('products.status number');
                    if (item.specialProduct && typeof item.specialProduct !== 'number') throw new Error('products.specialProduct number');
                    if (item.israelUse && typeof item.israelUse !== 'number') throw new Error('products.israelUse number');
                    if (item.parentProduct && typeof item.parentProduct !== 'number') throw new Error('products.parentProduct number');
                    if (item.price && typeof item.price !== 'number') throw new Error('products.price number');
                    if (item.renewal && typeof item.renewal !== 'number') throw new Error('products.renewal number');
                    if (item.period && typeof item.period !== 'number') throw new Error('products.period number');
                    if (item.renewalCount && typeof item.renewalCount !== 'number') throw new Error('products.renewalCount number');
                    if (item.externalProduct && (typeof item.externalProduct !== 'string' || item.externalProduct.length < 2 || item.externalProduct.length > 128)) {
                        throw new Error('products.externalProduct string, 128>length>2');
                    }
                    if (item.externalProduct2 && (typeof item.externalProduct2 !== 'string' || item.externalProduct2.length < 2 || item.externalProduct2.length > 128)) {
                        throw new Error('products.externalProduct2 string, 128>length>2');
                    }
                    if (item.externalProduct3 && (typeof item.externalProduct3 !== 'string' || item.externalProduct3.length < 2 || item.externalProduct3.length > 128)) {
                        throw new Error('products.externalProduct3 string, 128>length>2');
                    }
                    if (item.marketId && typeof item.marketId !== 'number') throw new Error('products.marketId number');
                    if (item.downloadSpeed && typeof item.downloadSpeed !== 'number') throw new Error('products.downloadSpeed number');
                    if (item.uploadSpeed && typeof item.uploadSpeed !== 'number') throw new Error('products.uploadSpeed number');
                    if (item.mabal && (typeof item.mabal !== 'number' || !(item.mabal === 1 || item.mabal === 2))) throw new Error('products.mabal numeric, equal to 1 or 2');
                    if (item.mainProduct && typeof item.mainProduct !== 'number') throw new Error('products.mainProduct number');
                    if (item.onnetCalls && typeof item.onnetCalls !== 'number') throw new Error('products.onnetCalls number');
                    if (item.internationalSms && typeof item.internationalSms !== 'number') throw new Error('products.internationalSms number');
                    if (item.minSubscriber && typeof item.minSubscriber !== 'number') throw new Error('products.minSubscriber number');
                    if (item.maxSubscriber && typeof item.maxSubscriber !== 'number') throw new Error('products.maxSubscriber number');
                    if (item.nextPrice && typeof item.nextPrice !== 'number') throw new Error('products.nextPrice number');
                    if (item.nextPrice && typeof item.nextPrice !== 'number') throw new Error('products.nextPrice number');
                    if (item.nextRenewalCount && typeof item.nextRenewalCount !== 'number') throw new Error('products.nextRenewalCount number'); //  .isInt({ min: 1, max: 2 })
                    if (item.inInvoice && typeof item.inInvoice !== 'number') throw new Error('products.inInvoice number');
                    if (item.firstCall && typeof item.firstCall !== 'number') throw new Error('products.firstCall number');
                    if (item.mnoCheck && typeof item.mnoCheck !== 'number') throw new Error('products.mnoCheck number');
                    if (item.maxNetworkRate && typeof item.maxNetworkRate !== 'number') throw new Error('products.maxNetworkRate number');
                    if (item.vendorId && typeof item.vendorId !== 'number') throw new Error('products.vendorId number');
                    // if (item.validationDate && typeof item.validationDate !== 'date') throw new Error('products.validationDate number');
                }
                return true;
            }),
    ];
}

function rateValidator() {
    return [
        body('rates')
            .isArray()
            .withMessage(1003) // The type is not suitable
            .if((value, { req }) => value !== undefined)
            .custom((value) => value.length > 0)
            .withMessage(1003) // At least one product-to-rate is required
            .isArray({ min: 1 })
            .withMessage(1003) // At least one product-to-rate is required
            .custom((value) => {
                if (isEmpty(value)) throw new Error('rates must be an array');
                for (const item of value) {
                    if (isEmpty(item)) throw new Error('rates are empty');
                    if (!item.quality || typeof item.quality !== 'string') throw new Error('rates.quality required, string');
                    if (!item.vendorId || typeof item.vendorId !== 'number') throw new Error('rates.vendorId required, number');
                    if (!item.direction || typeof item.direction !== 'string') throw new Error('rates.direction required, string');
                    if (!item.countryName || typeof item.countryName !== 'string') throw new Error('rates.countryName required, string');
                    if (!item.countryCode || typeof item.countryCode !== 'number') throw new Error('rates.countryCode required, number');
                    if (!item.rate || typeof item.rate !== 'number') throw new Error('rates.rate required, number');
                    if (item.calendarValue && typeof item.calendarValue !== 'number') throw new Error('rates.calendarValue number');
                    if (item.active && typeof item.active !== 'number') throw new Error('rates.active number');
                }
                return true;
            }),
    ];
}

export {
    categoryValidator,
    productValidator,
    rateValidator,
};
