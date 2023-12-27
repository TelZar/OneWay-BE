import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { convertKeysToUpperCaseWithUnderscore } from '../utils/helper.js';
// import { getSubscribersListModel } from './customers.js';
import { insertLogger } from '../utils/logger.js';

const LINE_STOCK_OBJ = {
    STOCK_ID: null, // NUMBER
    PRODUCT_ID: null, // NUMBER
    SERIAL_NUMBER: null, // VARCHAR2(456)
    MAC_ADDRESS: null, // VARCHAR2(456)
    A_GROUP: null, // NUMBER
    RANDOM_NUMBER: null, // NUMBER
    PRICE: 0, // NUMBER
    INTERNAL_ORDER_ID: null, // NUMBER
    AGENT_ID: null, // NUMBER
    SOLD_TO: null, // NUMBER
    STATUS: 1, // NUMBER
    ORDER_ID: null, // NUMBER
    DISTRIBUTION_ID: null, // NUMBER
    IS_MOBILIZED: null, // NUMBER
    BUNDLE_ID: null, // NUMBER
    BATCH_ID: null, // NUMBER
    AMOUNT: 1, // NUMBER
    WAREHOUSE_STRUCTURE_ID: null, // NUMBER
    SUBSCRIBER: null, // NUMBER
};

const getStockIdModel = async (productId, serialNumber = '', agentId = 1342, status = 1) => { // Default Marlog
    try {
        const sql = `begin :result := bya.get_stock_id_func(v_product_id => :v_product_id, 
                                                            v_serial_number => :v_serial_number, 
                                                            v_agent_id => :v_agent_id,
                                                            v_status => :v_status); end;`;
        const bind = {
            v_product_id: `${productId}`,
            v_serial_number: `${serialNumber}`,
            v_agent_id: agentId,
            v_status: status,
        };
        insertLogger({
            end_point: 'getStockIdModel',
            logTitle: 'getStockIdModel bind',
            data: bind,
            type: 'INFO',
            code: 1,
        });
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        err.message = `getStockIdModel-> ${err.message}`;
        throw (err);
    }
};

const stockModifyModel = async (data, params, customerId) => {
    // const subscribers = await getSubscribersListModel(params);

    const ARR_STOCK_OBJECT = [];
    const objectToReturn = {
        status: 0,
        subscriber_id: null,
        index: 0,
    };
    let sub;
    let stockId;
    try {
        for (const stock of data.stock) {
            const stockUpperCaseWithUnderscore = convertKeysToUpperCaseWithUnderscore(stock);
            const STOCK_OBJECT = {
                STOCK_ID: null, // NUMBER
                PRODUCT_ID: null, // NUMBER
                SERIAL_NUMBER: null, // VARCHAR2(456)
                MAC_ADDRESS: null, // VARCHAR2(456)
                A_GROUP: null, // NUMBER
                RANDOM_NUMBER: null, // NUMBER
                PRICE: 0, // NUMBER
                INTERNAL_ORDER_ID: null, // NUMBER
                AGENT_ID: null, // NUMBER
                SOLD_TO: null, // NUMBER
                STATUS: 1, // NUMBER
                ORDER_ID: null, // NUMBER
                DISTRIBUTION_ID: null, // NUMBER
                IS_MOBILIZED: null, // NUMBER
                BUNDLE_ID: null, // NUMBER
                BATCH_ID: null, // NUMBER
                AMOUNT: 1, // NUMBER
                WAREHOUSE_STRUCTURE_ID: null, // NUMBER
                SUBSCRIBER: null, // NUMBER
            };

            // Validations
            if (stockUpperCaseWithUnderscore.STATUS === 3 && !stockUpperCaseWithUnderscore.SOLD_TO) {
                objectToReturn.status = -7;
                objectToReturn.index = data.findIndex((item) => item.iccid === stockUpperCaseWithUnderscore.ICCID);
                objectToReturn.subscriber_id = stockUpperCaseWithUnderscore.SUBSCRIBER_ID;
            }

            for (const key in stockUpperCaseWithUnderscore) {
                if (STOCK_OBJECT.hasOwnProperty(key.toUpperCase())) STOCK_OBJECT[key.toUpperCase()] = stockUpperCaseWithUnderscore[key];
                STOCK_OBJECT.SERIAL_NUMBER = STOCK_OBJECT.SERIAL_NUMBER ? STOCK_OBJECT.SERIAL_NUMBER : `${STOCK_OBJECT.PRODUCT_ID}`;

                if ((stockUpperCaseWithUnderscore.SOLD_TO || stockUpperCaseWithUnderscore.SUBSCRIBER) /* && !stockUpperCaseWithUnderscore.AGENT_ID */) {
                    STOCK_OBJECT.AGENT_ID = 1342; // Default take products from Marlog
                } else STOCK_OBJECT.AGENT_ID = customerId;

                if (!stockUpperCaseWithUnderscore.hasOwnProperty('STOCK_ID') || !stockUpperCaseWithUnderscore.STOCK_ID || !STOCK_OBJECT.STOCK_ID) {
                    stockId = await getStockIdModel(
                        stockUpperCaseWithUnderscore.PRODUCT_ID,
                        stockUpperCaseWithUnderscore.SERIAL_NUMBER,
                        1342,
                        stockUpperCaseWithUnderscore.STATUS,
                    );
                    if (stockId > 0) STOCK_OBJECT.STOCK_ID = stockId;
                    else if (stockUpperCaseWithUnderscore.STATUS === 1) STOCK_OBJECT.STOCK_ID = null; // Get new stock into Marlog
                    else {
                        objectToReturn.status = -8;
                        objectToReturn.index = data.stock.findIndex((item) => item.iccid === stockUpperCaseWithUnderscore.ICCID); // find the location of the failed iccid
                        objectToReturn.subscriber_id = stockUpperCaseWithUnderscore.SUBSCRIBER_ID;
                    }
                }

                if (stockUpperCaseWithUnderscore.hasOwnProperty('SUBSCRIBER_ID') && stockUpperCaseWithUnderscore.SUBSCRIBER_ID > 0) {
                    STOCK_OBJECT.SUBSCRIBER = stockUpperCaseWithUnderscore.SUBSCRIBER_ID;
                }
                // if (!stockUpperCaseWithUnderscore.hasOwnProperty('SUBSCRIBER_ID') || !stockUpperCaseWithUnderscore.SUBSCRIBER_ID || !STOCK_OBJECT.SUBSCRIBER_ID) {
                //     const phone = stockUpperCaseWithUnderscore.SUBSCRIBER_PHONE;
                //     sub = subscribers.find((subscriber) => (subscriber.phone === phone ? phone.replace(/^0+/, '') : null));
                //     if (sub) STOCK_OBJECT.SUBSCRIBER = sub.subscriberId;
                // }
            }
            ARR_STOCK_OBJECT.push(STOCK_OBJECT);
        }

        if (objectToReturn.status < 0) return objectToReturn;
        const SET_STOCK_OBJ = {
            ARR_STOCK: ARR_STOCK_OBJECT,
            CREATED_BY: `${data.agentId}`,
        };

        const sql = 'begin :result := bya.stock_pkg.set_stock(v_stock => :obj); end;';
        const bind = {
            objectName: 'BYA.SET_STOCK_OBJ',
            obj: SET_STOCK_OBJ,
        };
        insertLogger({
            end_point: 'stockModifyModel',
            logTitle: 'stockModifyModel bind',
            data: bind,
            type: 'INFO',
            code: 1,
        });
        const [res] = await dbQuery(sql, bind, oracledb.CURSOR);
        if (res.hasOwnProperty('DISTRIBUTION_ID')) { // in case request success
            objectToReturn.status = res.DISTRIBUTION_ID;
        } else { // in case request failed
            objectToReturn.status = res.ERROR;
            objectToReturn.index = data.stock.findIndex((item) => item.iccid === res.SERIAL_NUMBER);
        }
        return objectToReturn;
    } catch (err) {
        err.message = `stockModifyModel-> ${err.message}`;
        throw (err);
    }
};

const createNewOrder = async (orderDetails, distributionNumber) => {
    try {
        const ALL_CUSTOMER_ORDERS = [];
        orderDetails.forEach((order) => {
            const orderUpperCaseWithUnderscore = convertKeysToUpperCaseWithUnderscore(order);
            const ORDER_OBJ = {
                CUST_PK_ID: null,
                SERVICE_CODE: null,
                ORDER_STATUS: null,
                PRODUCT_ID: null,
                CREATED_BY: null,
                REMARKS: null,
                SHIYUCH_STATUS: null,
                SIM_TYPE: null,
                SEND_EMAIL: null,
                RENEWAL_COUNT: null,
                ADDITIONAL: null,
                PARENT_ORDER: null,
                REFERENCE_ID: distributionNumber,
                SUBSCRIBER_ID: null,
            };

            for (const key in orderUpperCaseWithUnderscore) { //
                if (ORDER_OBJ.hasOwnProperty(key.toUpperCase())) {
                    ORDER_OBJ[key.toUpperCase()] = orderUpperCaseWithUnderscore[key];
                }
                if (key === 'CREATED_BY') {
                    ORDER_OBJ.CREATED_BY = orderUpperCaseWithUnderscore[key].toString();
                }
            }
            ORDER_OBJ.CUST_PK_ID = Number(ORDER_OBJ.CUST_PK_ID);
            ORDER_OBJ.SERVICE_CODE = Number(ORDER_OBJ.SERVICE_CODE);
            let xmlString = '';
            for (const key in ORDER_OBJ.ADDITIONAL) {
                if (ORDER_OBJ.ADDITIONAL.hasOwnProperty(key)) {
                    xmlString += `<${key}>${ORDER_OBJ.ADDITIONAL[key]}</${key}>`;
                }
            }

            if (xmlString === '') ORDER_OBJ.ADDITIONAL = null;
            else ORDER_OBJ.ADDITIONAL = xmlString;

            ALL_CUSTOMER_ORDERS.push(ORDER_OBJ);
        });

        const sql = 'begin :result := bya.sales_pkg.set_new_order_arr(p_order_details => :obj); end;';
        const bind = {
            objectName: 'BYA.ARR_ORDER_DETAILS_OBJ',
            obj: ALL_CUSTOMER_ORDERS,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `createNewOrder-> ${err.message}`;
        throw (err);
    }
};

const getReferenceIdByDistributionIdModel = async (transactionId) => {
    try {
        const sql = 'begin :result := bya.get_reference_id(p_transaction_id => :p_transaction_id); end;';
        const bind = {
            p_transaction_id: transactionId,
        };
        const res = await dbQuery(sql, bind, oracledb.STRING);
        return { res };
    } catch (err) {
        err.message = `getReferenceIdByDistributionIdModel-> ${err.message}`;
        throw (err);
    }
};

const updateOrderByDistributionIdModel = async (status, orderId = '0', transactionId = '0') => {
    try {
        const sql = `begin :result := bya.SALES_PKG.update_order_status(p_order_id => :p_order_id,
                                                                        p_status => :p_status,
                                                                        p_reference_id => :p_reference_id ); end;`;
        const bind = {
            p_order_id: Number(orderId) > 0 ? orderId : '',
            p_status: status,
            p_reference_id: Number(transactionId) > 0 ? transactionId : '',
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `updateOrderByDistributionIdModel-> ${err.message}`;
        throw (err);
    }
};

const getOrdersModel = async (data) => {
    try {
        const sql = `begin bya.get_orders(p_cust_pk_id => :p_cust_pk_id,
                                                  p_service_id => :p_service_id,
                                                  p_subscriber_id => :p_subscriber_id,
                                                  p_reference_id => :p_reference_id,
                                                  p_result => :p_result);end;`;
        const bind = {
            p_cust_pk_id: data.custPkID ? data.custPkID : '',
            p_service_id: data.serviceId ? data.serviceId : '',
            p_subscriber_id: data.subscriberId ? data.subscriberId : '',
            p_reference_id: data.referenceId ? data.referenceId : '',
            p_result: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
        };
        const res = await dbQuery(sql, bind, '', 'proc');
        return res.p_result;
    } catch (err) {
        err.message = `getOrdersModel-> ${err.message}`;
        throw (err);
    }
};

export {
    stockModifyModel,
    createNewOrder,
    updateOrderByDistributionIdModel,
    getReferenceIdByDistributionIdModel,
    getOrdersModel,
};
