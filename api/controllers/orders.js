import xml2js from 'xml2js';
import { isEmpty } from '../utils/helper.js';
import {
    checkCreditModel,
    getCurrencyRateModel,
    getDataForInvoiceModel,
    saleTransactionModel,
} from '../models/transactions.js';
import * as orderModel from '../models/order.js';
import { getSubscriber } from './customers.js';
import { getCustomerModel, getSubscriberIdByPhoneModel } from '../models/customers.js';
import * as productsModel from '../models/products.js';
import { getProductCategoriesModel } from '../models/products.js';
import { createInvoice } from './transactions.js';
import { checkIccidValidiation } from './cellularActions.js';

// Refund scheme by wallet category to check balance
const getWalletsDetail = async (products) => {
    try {
        let total = 0;
        const amountsByWalletCategory = await products.reduce(async (acc, product) => {
            const amount = product.AMOUNT * product.PRODUCT_AMOUNT - 1 * (product.DISCOUNT);
            total += amount * await getCurrencyRateModel(product.CURRENCY_TYPE);
            const prevAmount = await acc;
            const newAmount = prevAmount[product.WALLET_CATEGORY] || 0;
            prevAmount[product.WALLET_CATEGORY] = newAmount + amount;

            return prevAmount;
        }, {});
        return { amountsByWalletCategory, total };
    } catch (err) {
        err.message = `getWalletsDetail-> ${err.message}`;
        throw err;
    }
};

const stockModify = async (req, params, customerId = 1342) => {
    try {
        const data = await orderModel.stockModifyModel(req, params, customerId);
        if (data.status < 0 || !data.status) {
            let code;
            switch (data.status) {
            case -1:
                code = 20300; // There is a serial product with the same serial number
                break;
            case -2:
                code = 20301; // There were no changes
                break;
            case -3:
                code = 20302; // Out of stock
                break;
            case -4:
                code = 20303; // Does not exist in agent's rate
                break;
            case -5:
                code = 20304; // Not enough in stock
                break;
            case -6:
                code = 20305; // Switch to invalid status
                break;
            case -7:
                code = 20306; // Sale action requires soldTo
                break;
            case -8:
                code = 20307; // StockId not found
                break;
            case undefined:
                code = 20001;
                break;
            default:
                code = data.status * -1;
            }
            return { status: 400, code, iccid: data.index };
        }
        return { status: 201, data: { distributionId: data.status } };
    } catch (err) {
        err.message = `stockModify-> ${err.message}`;
        throw err;
    }
};

const attachPackage = async (data) => {
    try {
        // todo: aviel (supprt in status params)
    } catch (err) {
        err.message = `attachPackage-> ${err.message}`;
        throw err;
    }
};

const purchaseProduct = async (products) => {
    try {
        let distributionNumber;

        req.body.products.map((product) => ({
            // attachPackage
            // stockModify
        }));

        return distributionNumber;
    } catch (err) {
        err.message = `attachPackage-> ${err.message}`;
        throw err;
    }
};

const getProductArr = async (agentId, data) => {
    let productDetails;
    let saveNumberProductDetails;
    let productCategoryWallet;
    let saveNumberProductCategoryWallet;
    let subscriberId;
    const productsArr = [];

    for (const item of data) {
        productDetails = await productsModel.getProductModel(item.productId, agentId, item.countryId);
        if (!productDetails || isEmpty(productDetails)) {
            productsArr.push(-20177); // Rate not found
            break;
        }

        productCategoryWallet = await getProductCategoriesModel(item.productId, 123);
        if (productCategoryWallet < 0 || isEmpty(productCategoryWallet)) {
            productsArr.push(-20178); // Category not found
            break;
        }

        subscriberId = await getSubscriberIdByPhoneModel(item.phone);

        const currencyCode = productDetails[0].currency === 'USD' ? 1 : 3;
        productsArr.push({
            AMOUNT: productDetails[0].price,
            PRODUCT_TO_FOLLOW: productCategoryWallet[0].categoryId === 1821 ? 1 : 0,
            PRODUCT_AMOUNT: item.amount || 1,
            WALLET_CATEGORY: productCategoryWallet[0].categoryId,
            PRODUCT_ID: item.productId,
            SERIAL_NUMBER: item.serialNumber || '0',
            STOCK_ID: item.stockId || 0,
            NUM_PAYMENTS: 1,
            PERIODIC_AMOUNT: item.periodicAmount || 0,
            DISCOUNT: item.discount || 0,
            CURRENCY_TYPE: currencyCode || 3,
            SUBSCRIBER_NUM: item.phone,
            ICCID: item.simIccid,
            SIM_TYPE: item.simType,
            SUBSCRIBER_ID: subscriberId || null,
        });
        if (item.keepPhoneNumber?.status && item.keepPhoneNumber?.renewable > 0) {
            saveNumberProductDetails = await productsModel.getProductModel(9990, agentId);
            if (!saveNumberProductDetails || isEmpty(saveNumberProductDetails)) {
                productsArr.push(-20177); // Rate not found
                break;
            }

            saveNumberProductCategoryWallet = await getProductCategoriesModel(9990);
            if (saveNumberProductCategoryWallet < 0 || isEmpty(saveNumberProductCategoryWallet)) {
                productsArr.push(-20178); // Category not found
                break;
            }

            productsArr.push({
                AMOUNT: saveNumberProductDetails[0].price,
                PRODUCT_TO_FOLLOW: 0,
                PRODUCT_AMOUNT: item.keepPhoneNumber?.renewable,
                WALLET_CATEGORY: saveNumberProductCategoryWallet[0].categoryId,
                PRODUCT_ID: 9990,
                SERIAL_NUMBER: item.serialNumber || '0',
                STOCK_ID: item.stockId || 0,
                NUM_PAYMENTS: 1,
                PERIODIC_AMOUNT: item.periodicAmount || 0,
                DISCOUNT: item.discount || 0,
                CURRENCY_TYPE: currencyCode || 3,
                SUBSCRIBER_NUM: item.phone,
                ICCID: null,
                SIM_TYPE: null,
                SUBSCRIBER_ID: subscriberId || null,
            });
        }
    }
    return productsArr;
};

const getOrderArray = async (agentId, products, customerDetails) => {
    const ordersArray = [];

    for (const item of products) {
        ordersArray.push({
            custPkId: customerDetails.custPkId,
            serviceCode: customerDetails.serviceId,
            orderStatus: Number(customerDetails.serviceId) === 7 ? 2 : 1, // sprcific for prepaid -2
            remarks: item.phone,
            productId: item.productId,
            shiyuchStatus: null,
            simType: item.simType === 'esim' ? 2 : 1,
            renewalCount: 1,
            createdBy: agentId,
            sendEmail: 1,
            additional: { country_code: item.countryId }, // country code
            parentOrder: null,
            subscriberId: item.subscriberId,
        });

        if (item.simType === 'regular') {
            ordersArray.push({
                custPkId: customerDetails.custPkId,
                serviceCode: customerDetails.serviceId,
                orderStatus: Number(customerDetails.serviceId) === 7 ? 2 : 1, // sprcific for prepaid - 2
                remarks: item.phone,
                productId: 1066,
                shiyuchStatus: null,
                simType: 1,
                renewalCount: 1,
                createdBy: agentId,
                sendEmail: 1,
                additional: item.simIccid ? { iccid: item.simIccid } : null,
                parentOrder: null,
                subscriberId: item.subscriberId,
            });
        }
        if (item.keepPhoneNumber?.status && item.keepPhoneNumber?.renewable >= 1) { // validation true or false
            ordersArray.push({
                custPkId: customerDetails.custPkId,
                serviceCode: customerDetails.serviceId,
                orderStatus: Number(customerDetails.serviceId) === 7 ? 2 : 1, // sprcific for prepaid - 2
                remarks: item.phone,
                productId: 9990,
                shiyuchStatus: null,
                simType: null,
                renewalCount: item.keepPhoneNumber.renewable,
                createdBy: agentId,
                sendEmail: null,
                additional: null,
                parentOrder: null,
                subscriberId: item.subscriberId,
            });
        }
    }
    return ordersArray;
};

const getStockArray = async (productsArr, customerId) => {
    try {
        const stockProductsArr = [];

        for (const product of productsArr) {
            const originalObject = {
                amount: product.PRODUCT_AMOUNT > 0 ? product.PRODUCT_AMOUNT : 1,
                productId: `${product.PRODUCT_ID}`,
                serialNumber: product.SERIAL_NUMBER > 0 ? product.SERIAL_NUMBER : `${product.PRODUCT_ID}`,
                stockId: product.STOCK_ID > 0 ? product.STOCK_ID : null,
                price: product.AMOUNT ? product.AMOUNT : 0,
                status: product.STATUS ? product.STATUS : 3,
                soldTo: customerId || null,
                subscriberPhone: product.SUBSCRIBER_NUM,
                iccid: product.ICCID,
                simType: product.SIM_TYPE,
                subscriberId: product.SUBSCRIBER_ID,
            };

            stockProductsArr.push(originalObject);

            if (product.ICCID && product.SIM_TYPE === 'regular') {
                const additionalObject = {
                    amount: product.PRODUCT_AMOUNT > 0 ? product.PRODUCT_AMOUNT : 1,
                    productId: 1066,
                    serialNumber: product.ICCID,
                    stockId: product.STOCK_ID > 0 ? product.STOCK_ID : null,
                    price: 0,
                    status: product.STATUS ? product.STATUS : 3,
                    soldTo: customerId || null,
                    subscriberPhone: product.SUBSCRIBER_NUM,
                    iccid: product.ICCID,
                    simType: product.SIM_TYPE,
                    subscriberId: product.SUBSCRIBER_ID,
                };
                stockProductsArr.push(additionalObject);
            }
        }

        return stockProductsArr;
    } catch (err) {
        err.message = `getStockArray-> ${err.message}`;
        throw err;
    }
};

const getIccidArray = async (data) => {
    try {
        const iccidArray = [];
        for (const obj of data) {
            if (obj.simIccid && obj.simType === 'regular') {
                iccidArray.push(obj.simIccid);
            }
        }
        return iccidArray;
    } catch (err) {
        err.message = `getIccidArray-> ${err.message}`;
        throw err;
    }
};

const setOrder = async (body, params, newSubscriber = 1) => {
    try {
        const customerData = (await getCustomerModel(params))[0];
        const { customerId } = customerData;

        // Building an object for an array of products.
        const productList = newSubscriber ? body.subscribers : body.products; // order products
        const productsToSale = await getProductArr(body.agentIdCashbox, productList); // transactions products
        const productsToStock = productsToSale.filter((obj) => obj.PRODUCT_ID !== 9990); // stock products
        const codeError = productsToStock.find((num) => num < 0);
        if (codeError < 0) return { status: 400, code: codeError * -1 };
        const currencyCode = productsToStock[0].CURRENCY_TYPE;// Default NIS

        // const walletsDetail = await getWalletsDetail(productsToStock);
        const walletsDetail2 = await getWalletsDetail(productsToSale);

        if (body.saleType === 2) { // Check if you can make a transaction on a balance account by wallet category
            let resCheckCredit;
            for (const [category, amount] of Object.entries(walletsDetail2.amountsByWalletCategory)) {
                resCheckCredit = await checkCreditModel(customerId, category, amount);
                if (resCheckCredit.v_status <= 0) return { status: 400, code: 3013/* No credit */, info: { title: `walletCategory - ${category}` } };
            }
        }

        if (newSubscriber) {
            const iccidArray = await getIccidArray(body.subscribers); // check validation of regular sim
            if (iccidArray.length > 0) {
                const iccidValidiation = await checkIccidValidiation(iccidArray);
                if (iccidValidiation.code) {
                    return {
                        status: iccidValidiation.status,
                        code: iccidValidiation.code,
                        info: { freeText: iccidValidiation.info },
                    };
                }
            }
            productList.forEach((item) => {
                const match = productsToStock.find((obj) => obj.SUBSCRIBER_NUM === item.phone);
                if (match) {
                    item.subscriberId = match.SUBSCRIBER_ID;
                }
            });
        } else {
            const subscriberDetails = await getSubscriber(params);
            productsToStock.forEach((obj) => {
                obj.SUBSCRIBER_NUM = subscriberDetails.data.phoneNumber;
                obj.SUBSCRIBER_ID = subscriberDetails.data.subscriberId;
            });
            productList.forEach((obj) => {
                obj.phone = subscriberDetails.data.phoneNumber.toString().length === 9 ? `0${subscriberDetails.data.phoneNumber}` : `${subscriberDetails.data.phoneNumber}`;
                obj.subscriberId = Number(subscriberDetails.data.subscriberId);
            });
        }

        // await purchaseProduct(body.products); // By oriya and aviel
        const stockArray = await getStockArray(productsToStock, customerId);
        const distributionId = await stockModify({ stock: stockArray, agentId: body.agentIdCashbox }, params, customerId); // body.customerIdUser
        if (distributionId.code) return { status: 400, code: distributionId.code, info: { title: `subscribers[${distributionId?.iccid}].simIccid` } }; // distributionId?.iccid contain the index of the product that failed
        const distributionNumber = distributionId.data.distributionId;
        const orderArray = await getOrderArray(body.agentId, productList, params);
        const orderId = await orderModel.createNewOrder(orderArray, distributionNumber);
        if (orderId < 0) return { status: 400, code: orderId };

        const saleTransaction = await saleTransactionModel(
            body.customerIdUserCashbox,
            customerId,
            // walletsDetail.total,
            walletsDetail2.total,
            '',
            body.remark,
            // productsToStock,
            productsToSale,
            distributionNumber,
            currencyCode,
        );
        if (saleTransaction < 0) return { status: 400, code: saleTransaction * -1 };

        if (false) { // Future: customers who are invoiced at the time of sale. like shops
            const saleData = await getDataForInvoiceModel(saleTransaction, 1, body.customerId, body.customerIdUserCashbox);
            const invoiceNumber = await createInvoice(body, '', saleTransaction, saleData);
            // The payment was made successfully but there is an error in creating an invoice
            if (invoiceNumber < 0) return { status: 400, code: 3023 };
        }
        return { status: 201, data: { transactionId: saleTransaction } }; // Created purchase
    } catch (err) {
        err.message = `setOrder-> ${err.message}`;
        throw err;
    }
};

const updateOrderByTransactionId = async (req, status) => {
    try {
        const referenceId = await orderModel.getReferenceIdByDistributionIdModel(req.transactionId);
        const orders = await orderModel.updateOrderByDistributionIdModel(status, 0, referenceId.res);
        if (orders < 0) return { status: 400, code: orders.status * -1 };
        return { status: 200, result: orders };
    } catch (err) {
        err.message = `updateOrderByDistributionId-> ${err.message}`;
        throw err;
    }
};

const getOrders = async (data) => {
    try {
        const orders = await orderModel.getOrdersModel(data);
        return { status: 200, result: orders };
    } catch (err) {
        err.message = `getOrders-> ${err.message}`;
        throw err;
    }
};

const checkSimTypeOrder = async (data) => {
    try {
        const orders = await orderModel.getOrdersModel(data);
        const reqularSim = orders.findIndex((obj) => (obj.PRODUCT_ID === '1066') && (obj.ORDER_STATUS === 2));
        if (reqularSim === -1) {
            const eSim = orders.findIndex((obj) => (obj.SIM_TYPE === 2) && (obj.ORDER_STATUS === 2));
            if (eSim !== -1) {
                return { status: 200, result: 'esim' };
            }
        } else {
            let iccid;
            xml2js.parseString(orders[reqularSim].ADITIONAL, (err, result) => {
                if (err) throw err;
                iccid = result.iccid;
            });
            return { status: 200, result: 'regularSim', iccid };
        }
        return { status: 400 };
    } catch (err) {
        err.message = `checkOrder-> ${err.message}`;
        throw err;
    }
};

export {
    getStockArray,
    setOrder,
    stockModify,
    updateOrderByTransactionId,
    getOrders,
    checkSimTypeOrder,
};
