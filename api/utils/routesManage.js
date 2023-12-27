export const moduleRoutes = {
    routes: {
        departments: {
            base: ['/departments', '/departments/:departmentId'],
        },
        roles: {
            base: ['/departments/:departmentId/role',
                '/departments/:departmentId/role/:roleId',
                '/departments/:departmentId/role/:roleId/users'],
            permissions: ['/departments/:departmentId/role/:roleId/permission'],
            modules: ['/modules', '/module/:moduleId', '/module/:moduleId/action', '/module/:moduleId/action/:actionId'],

        },
        users: {

        },
        customers: {
            customers: ['/',
                '/:custPkId',
                '/:custPkId/services',
                '/:custPkId/services/:serviceId',
                '/:custPkId/services/:serviceId/subscribers',
                '/:custPkId/services/:serviceId/subscribers/:subscriberId',
                '/:custPkId/services/:serviceId/agreements',
                '/:custPkId/services/:serviceId/agreements/:agreementId',
                '/:custPkId/services/:serviceId/payments',
                '/:custPkId/services/:serviceId/payments/:paymentId',
                '/:custPkId/services/:serviceId/payments/credit-cards',
            ],
            orders: ['/:custPkId/services/:serviceId/subscribers/:subscriberId/orders'],
            pay: ['/:custPkId/services/:serviceId/transactions/:transactionId/pay'],
            cancel: ['/:custPkId/services/:serviceId/transactions/:transactionId/cancel'],
            transactions: ['/:custPkId/services/:serviceId/transactions',
                '/:custPkId/services/:serviceId/transactions/:transactionId',
                '/:custPkId/services/:serviceId/transactions/:transactionId/invoice'],
            createTokenMonox: ['/createToken'],
            verifyC2CTransfer: ['/verifyC2CTransfer'],
            usage: ['/usage'],
            message: ['/message'],
            stock: ['/:custPkId/services/:serviceId/stock/products', '/:custPkId/services/:serviceId/stock/products/:productId'],
            esimActivation: ['/:custPkId/services/:serviceId/subscribers/:subscriberId/esimActivation'],
            getEsimNumber: ['/:custPkId/services/:serviceId/getEsimNumber'],
            activity: ['/:custPkId/activities', '/:custPkId/activities/:activityId'],
            cellularActions: ['/:custPkId/services/:serviceId/subscribers/:subscriberId/cellularActions/:cellularActionId'],
            callForwarding: ['/:custPkId/services/:serviceId/subscribers/:subscriberId/callForwarding'],
            simReplace: ['/:custPkId/services/:serviceId/subscribers/:subscriberId/simReplace'],
            roamingCallFiltering: ['/:custPkId/services/:serviceId/subscribers/:subscriberId/roamingCallFiltering'],
            cashTransfer: ['/:custPkId/services/:serviceId/subscribers/:subscriberId/cashTransfer'],
        },
        employers: {

        },
        transactions: {
            checkCredit: ['/checkCredit'],
            sale: ['/sale'],
            pay: ['/:transactionId/payment'],
            transfer: ['/transfer'],
            refund: ['/:transactionId/refund'],
            transaction: ['/:transactionId', '/:transactionId/invoices/:invoiceId',
                /* '/:transactionId/invoices/:invoiceId/sendToEmail' */],
        },
        communication: {
        },
        system: {
            files: ['/files', '/files/:fileId', '/files/:fileId/download'],
            currencies: ['/utils/finance/currencies'],
            languages: ['/localization/options/customerFinanceLanguages', '/utils/localization/options/systemLanguages'],
            shortcuts: ['/utils/shortcut', '/utils/shortcut/:shortcutId'],
            dashboards: ['/dashboard', '/dashboard/:dashboardId'],
            widgets: ['/dashboard/:dashboardId/widget', '/dashboard/:dashboardId/widgetPrimary/:widgetPrimaryId', '/dashboard/:dashboardId/widget/:widgetId'],
            xlsx: ['/xlsx'],
            email: ['/email'],
            geo: ['/utils/geo/countries', '/utils/geo/countries/:countryId',
                '/utils/geo/countries/:countryId/cities', '/utils/geo/countries/:countryId/cities/:cityId',
                '/utils/geo/countries/:countryId/cities/:cityId/streets', '/utils/geo/countries/:countryId/cities/:cityId/streets/:streetId'],
            customers: ['/customers/options/customerTypes', '/customers/options/subscribers'],
            products: ['/products/options/status', '/products/options/status/:statusId',
                '/products/options/categories/:categoryId/names',
                '/products/options/categories/:categoryId/names/:nameId',
                '/products/options/categories/:categoryId/names/:nameId/manufacturer',
                '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId',
                '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId/models',
                '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId/models/:modelId',
                '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId/models/:modelId/firstSubCategory',
                '/products/options/categories/:categoryId/names/:nameId/manufacturer/:manufacturerId/models/:modelId/firstSubCategory/:firstSubCategory',
                '/products/options/colors', '/products/options/colors/:colorId'],
            rates: ['/rates/options/countries', '/rates/options/countries/:countryId', '/rates/options/regions', '/rates/options/regions/:regionId'],
            generatePhoneNumbers: ['/utils/communication/generatePhoneNumbers'],
            cellularActions: ['/utils/communication/cellularActions'],
            attachments: ['/attachments/:fileHash'],
            send: ['/send'],
            iccidValidation: ['/utils/communication/checkSimIccid'],
        },
        auth: {
            token: ['/token'],
            otp: ['/otp'],
            logout: ['/logout'],
            changePassword: ['/changePassword'],
        },
        me: {
            me: ['/'],
            shortCut: ['/dockBar', '/dockBar/:shortcutId'],
        },
        banks: {
            file: ['/file'],
            // search: ['/search'],
            updatePayment: ['/updatePayment'],
            sendToHash: ['sendToHash'],
        },
        products: {
            products: ['/search', '/', '/:productId', '/:productId/categories', '/:productId/rates'],
            categories: ['/categories', '/categories/:categoryId', '/categories/:categoryId/products'],
            rates: ['/rates/:rateId/products', '/rates/:rateId/products/:productId', '/rates/:rateId/categories', '/rates/:rateId/categories/:categoryId'],
        },
        search: {
            advancedSearch: ['/', '/hlr'],
            quickSearch: ['/quick'],
            save: ['/saved/:module', '/saved/:module/:searchId'],
        },
    },
    excluded: ['/dashboard', '/dashboard/:dashboardId/widget', '/dashboard/:dashboardId/widgetPrimary/:widgetPrimaryId', '/dashboard/:dashboardId/widget/:widgetId',
        '/login', '/logout', '/login/verifyOtp', '/verifyOtp', '/changePassword',
        '/shortcut', '/shortcut/:shortcutId', '/createToken', '/utils/geo/countries', '/me', '/utils/finance/currencies'],
};
// Check if such a path exists in the routing object
const isPathExists = (innerPath, outerPath) => {
    try {
        const innerPathArr = innerPath.split('/');
        const outerPathArr = outerPath.split('/');

        if (innerPathArr.length !== outerPathArr.length) {
            return false;
        }
        // Compare between innerPathArr to outerPathArr without inner starts with ':'
        return innerPathArr.every((inner, index) => {
            const outer = outerPathArr[index];

            return /* ( */inner.startsWith(':') /* && index !== 1) */ || inner === outer;
        });
    } catch (err) {
        err.message = `isPathExists-> ${err.message}`;
        throw err;
    }
};
// Get the module (father key)
const getFatherKeyFromStr = (str, route) => {
    try {
        // If it is an excluded routing, there is no need to check the authorization => return true
        if (moduleRoutes.excluded.some((excludedPath) => isPathExists(excludedPath, str))) return true;

        const pathArr = str.split('/');
        if (pathArr.length === 2 && pathArr[0] === '') {
            return route;
        }

        for (const key in moduleRoutes.routes) {
            const routes = moduleRoutes.routes[key];
            const paths = Object.values(routes).flat();

            if (paths.some((route) => isPathExists(route, str))) {
                // Return module
                return key;
            }
        }
        // Not found route
        return false;
    } catch (err) {
        err.message = `getFatherKeyFromStr-> ${err.message}`;
        throw err;
    }
};

export const getModuleFromPath = (pathUrl) => {
    let path = pathUrl.split('?')[0];
    const startRoute = `${path.split('/')[1]}`;
    const endRoute = `${path.split('/').slice(2).join('/')}`;
    endRoute ? path = endRoute : path = startRoute;
    const pathToCheck = `/${path}`.split('?')[0];
    const module = getFatherKeyFromStr(pathToCheck, startRoute);
    // console.log(module);
    return module;
};
export const hasAccessToAttachments = (url) => /^\/system\/attachments(?:\/.*)?$/.test(url);
export const excludedFromAuth = ['/auth/login', '/auth/token', '/auth/otp', '/auth/changePassword'];
export const excludedRefreshToken = ['/auth/changePassword', '/auth/verifyOtp'];
const accessHashQuery = ['/transactions/X/invoices/X'];
export const isThereAccessHashQuery = (url) => accessHashQuery.some((query) => new RegExp(`^${query.replace(/X/g, '[^/]+')}$`).test(url.split('?')[0]));
