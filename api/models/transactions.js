import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { camelCaseKeys } from '../utils/helper.js';
import { insertLogger } from '../utils/logger.js';

const getCurrencyRateModel = async (currency) => {
    try {
        const sql = 'begin :result := get_currency_rates(p_currency => :p_currency);end;';
        const bind = {
            p_currency: currency,
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `getCurrencyRateModel-> ${err.message}`;
        throw (err);
    }
};

const checkCreditModel = async (customerId, walletCategory, amount) => {
    try {
        const sql = `begin transactions_pkg.check_credit(p_customer_id => :p_customer_id,
                                p_wallet_category => :p_wallet_category,
                                p_amount => :p_amount,
                                v_status => :v_status,
                                v_exceeded_amount => :v_exceeded_amount);end;`;
        const bind = {
            p_customer_id: customerId,
            p_wallet_category: walletCategory,
            p_amount: amount,
            v_status: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, value: null },
            v_exceeded_amount: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, value: null },
        };
        return await dbQuery(sql, bind, '', 'proc');
    } catch (err) {
        err.message = `checkCreditModel-> ${err.message}`;
        throw (err);
    }
};

const saleTransactionModel = async (actionCustomerId, customerId, amount, reasonId, freeText, productsArr, distributionNumber, currency) => {
    try {
        const sql = `begin :result := transactions_pkg.sale(p_action_customer_id => :p_action_customer_id, 
                                                            p_customer_id => :p_customer_id,
                                                            p_amount => :p_amount,
                                                            p_reason_id => :p_reason_id,
                                                            p_free_text => :p_free_text, 
                                                            p_products => :obj,
                                                            p_distribution_number => :p_distribution_number,
                                                            p_currency => :p_currency);end;`;
        const bind = {
            p_action_customer_id: actionCustomerId,
            p_customer_id: customerId,
            p_amount: amount,
            p_reason_id: 3,
            p_free_text: freeText || '',
            objectName: 'BYA.products_array',
            obj: productsArr,
            p_distribution_number: distributionNumber,
            p_currency: 3,
        };

        insertLogger({
            end_point: 'saleTransactionModel - bind',
            logTitle: 'saleTransactionModel bind',
            data: bind,
            type: 'INFO',
            code: 1,
        });
        return await dbQuery(sql, bind, oracledb.STRING);
    } catch (err) {
        err.message = `saleTransactionModel-> ${err.message}`;
        throw (err);
    }
};

const payTransactionModel = async (payObj, transactionSale = 0, overpayment = 0, paymentDetailsId = 0) => {
    try {
        const sql = `begin :result := transactions_pkg.pay(p_payment => :obj,
                                      p_transaction_sale => :p_transaction_sale,p_overpayment => :p_overpayment,p_payment_details => :p_payment_details);end;`;
        const bind = {
            objectName: 'BYA.PAYMENT_OBJ',
            obj: payObj,
            p_transaction_sale: transactionSale,
            p_overpayment: overpayment,
            p_payment_details: paymentDetailsId,
        };
        insertLogger({
            end_point: 'payTransactionModel - bind',
            logTitle: `payTransactionModel the bind for transactionSale : ${transactionSale}`,
            data: bind,
            type: 'INFO',
            code: 1,
        });
        const res = await dbQuery(sql, bind, oracledb.STRING);
        return res;
    } catch (err) {
        err.message = `payTransactionModel-> ${err.message}`;
        throw (err);
    }
};

const cancelTransactionModel = async (sourceCustomerId, targetCustomerId, amount, generalTransaction, distributionNumber, contentsArr = [], paymentDetailsId = 0, currency = 3) => {
    try {
        const sql = `begin :result := transactions_pkg.cancel(p_source_customer_id => :p_source_customer_id,
                                                              p_target_customer_id => :p_target_customer_id, 
                                                              p_payment_content => :obj,
                                                              p_transaction => :p_transaction,
                                                              p_amount => :p_amount,
                                                              p_currency => :p_currency,
                                                              p_payment_details => :p_payment_details,
                                                              p_rate => :p_rate,
                                                              p_distribution_number => :p_distribution_number
                                                              );end;`;

        const currencyRate = await getCurrencyRateModel(currency);
        const bind = {
            objectName: 'BYA.payment_contents',
            obj: contentsArr,
            p_source_customer_id: sourceCustomerId,
            p_target_customer_id: targetCustomerId,
            p_transaction: generalTransaction,
            p_amount: amount,
            p_currency: currency,
            p_payment_details: paymentDetailsId,
            p_rate: currencyRate,
            p_distribution_number: distributionNumber,
        };
        const res = await dbQuery(sql, bind, oracledb.STRING);
        return res;
    } catch (err) {
        err.message = `cancelTransactionModel-> ${err.message}`;
        throw (err);
    }
};

const transferModel = async (obj) => {
    try {
        const sql = `begin :result := transactions_pkg.transfer(p_source_customer_id => :p_source_customer_id,
                                       p_target_customer_id => :p_target_customer_id,
                                       p_product_id => :p_product_id,
                                       p_serial_number => :p_serial_number,
                                       p_wallat_id_plus => :p_wallat_id_plus,
                                       p_wallat_id_minus => :p_wallat_id_minus,
                                       p_method => :p_method,
                                       p_method_type => :p_method_type,
                                       p_amount => :p_amount,
                                       p_source_ref => :p_source_ref,
                                       p_external_ref => :p_external_ref,
                                       p_currency => :p_currency,
                                       p_type => :p_type);end;`;
        const bind = {
            p_source_customer_id: obj.sourceCustomerId,
            p_target_customer_id: obj.targetCustomerId,
            p_product_id: obj.productId ? obj.productId : 0,
            p_serial_number: obj.serialNumber ? obj.serialNumber : '',
            p_wallat_id_plus: obj.wallatIdPlus ? obj.wallatIdPlus : 0,
            p_wallat_id_minus: obj.wallatIdMinus ? obj.wallatIdMinus : 0,
            p_method: obj.method,
            p_method_type: obj.methodType,
            p_amount: obj.amount ? obj.amount : 0,
            p_source_ref: obj.sourceRef ? obj.sourceRef : 0,
            p_external_ref: obj.externalRef ? obj.externalRef : 0,
            p_currency: obj.currency ? obj.currency : 3, // Default - NIS
            p_type: obj.type ? obj.type : 0,
        };
        return await dbQuery(sql, bind);
    } catch (err) {
        err.message = `transferModel-> ${err.message}`;
        throw (err);
    }
};

const payInvoiceObject = (obj, type) => {
    const data = obj.map((item) => {
        const walletCategories = item.WALLET_CATEGORY.split(',').map(Number);
        const walletCategoriesSum = item.WALLET_CATEGORY_SUM.split(',').map(Number);
        const saleProducts = item.SALE_PRODUCTS.split(',').map(Number);
        const saleProductsName = item.SALE_PRODUCTS_NAME.split(',').map(String);
        const discounts = item.DISCOUNTS.split(',').map(String);
        const currencies = item.CURRENCY_TYPE.split(',').map(String);
        const currencyIcons = item.CURRENCY_ICON.split(',').map(String);
        const isDutyFree = item.DUTY.split(',').map(Number);
        const subscriberPhone = item.SUBSCRIBER_NUM.split(',').map(Number);
        const wallet = walletCategories.map((wallet, i) => ({
            walletCategory: wallet,
            subscriberNum: subscriberPhone[i],
            amount: walletCategoriesSum[i],
            productId: saleProducts[i],
            productName: saleProductsName[i],
            discount: discounts[i],
            duty: isDutyFree[i],
            currency: currencies[i] || 3,
            currencyIcon: currencyIcons[i] || '₪',
        }));

        const exemptionFromVatSum = wallet.reduce((total, item) => (item.duty === 0 ? total + item.amount : total), 0);
        const vatSum = item.AMOUNT - exemptionFromVatSum;
        if (type === 1) {
            return {
                actionCustomerId: item.ACTION_CUSTOMER_ID,
                actionCustomerName: item.ACTION_CUSTOMER_NAME,
                customerName: item.CUSTOMER_NAME,
                dutyTotalFree: exemptionFromVatSum,
                dutyTotal: vatSum,
                amount: item.AMOUNT,
                wallet,
                email: item.EMAIL,
                createdOn: item.CREATION_DATE,
                taxableAmount: vatSum !== 0 ? parseFloat((vatSum / 1.17).toFixed(2)) : item.AMOUNT,
                vat: parseFloat((vatSum - (vatSum / 1.17)).toFixed(2)),
                currency: parseInt(item.CURRENCY_TYPE[0], 10),
                currencyIcon: currencyIcons[0] || '₪',
            };
        } if (type === 2) {
            const constantPayments = item.METHOD_PAYMENT ? item.METHOD_PAYMENT.split(',').map(String) : [];
            const creditPayments = item.CREDIT_PAYMENT ? item.CREDIT_PAYMENT.split(',').map(Number) : [];
            const products = item.PRODUCTS ? item.PRODUCTS.split(',').map(Number) : [];
            const sumProducts = item.SUM_PAY ? item.SUM_PAY.split(',').map(Number) : [];
            const currencies = item.CURRENCY.split(',').map(Number);
            const rates = item.RATE.split(',').map(Number);

            // const contentProducts = products.map((product, i) => ({
            //     productId: products[i],
            //     sum: sumProducts[i],
            // }));
            const content = constantPayments.map((payment, index) => ({
                contantPayment: payment,
                creditPayment: creditPayments[index],
                currency: currencies[index],
                rate: rates[index],
            }));

            return {
                actionCustomerId: item.ACTION_CUSTOMER_ID,
                actionCustomerName: item.ACTION_CUSTOMER_NAME,
                customerId: item.CUSTOMER_ID,
                customerName: item.CUSTOMER_NAME,
                email: item.EMAIL,
                createdOn: item.CREATION_DATE,
                amount: item.AMOUNT,
                taxableAmount: parseFloat((item.AMOUNT / 1.17).toFixed(2)),
                vat: parseFloat((item.AMOUNT - (item.AMOUNT / 1.17)).toFixed(2)),
                //   contentWallets,
                // contentProducts,
                content,
                overpayment: item.OVERPAYMENT,
            };
        }
    });
    return data;
};

const getDataForInvoiceModel = async (sourceReference, type, customerId, actionCustomerId) => {
    try {
        const sql = `begin :result := transactions_pkg.get_data_for_invoice(p_action_customer_id => :p_action_customer_id,
                                                   p_customer_id => :p_customer_id,
                                                   p_source_reference => :p_source_reference,
                                                   p_type => :p_type);end;`;
        const bind = {
            p_action_customer_id: actionCustomerId || 0,
            p_customer_id: customerId || 0,
            p_source_reference: sourceReference,
            p_type: type,
        };
        console.log('getDataForInvoiceModel bind: ', bind);
        insertLogger({
            end_point: 'getDataForInvoiceModel - bind',
            logTitle: 'getDataForInvoiceModel - bind',
            data: bind,
            type: 'INFO',
            code: 1,
        });
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return payInvoiceObject(res, type)[0];
    } catch (err) {
        err.message = `getDataForInvoiceModel-> ${err.message}`;
        throw (err);
    }
};

const insertPaymentDetailsModel = async (data) => {
    try {
        const sql = `begin :result := details_transactions_pkg.insert_details_payment(p_type => :p_type,
                                                             p_sub_type => :p_sub_type,
                                                             p_success => :p_success,
                                                             p_related_transaction_source => :p_related_transaction_source,
                                                             p_customer_id => :p_customer_id,
                                                             p_action_customer_id => :p_action_customer_id,
                                                             p_request => :p_request,
                                                             p_response => :p_response,
                                                             p_total => :p_total,
                                                             p_card_id => :p_card_id,
                                                             p_unique_id => :p_unique_id,
                                                             p_last_4_digits => :p_last_4_digits,
                                                             p_tran_id => :p_tran_id,
                                                             p_exp_card => :p_exp_card,
                                                             p_terminal_num => :p_terminal_num,
                                                             p_number_of_payments => :p_number_of_payments,
                                                             p_first_payment => :p_first_payment,
                                                             p_periodical_payment => :p_periodical_payment,
                                                             p_open_mode => :p_open_mode,
                                                             p_check_number => :p_check_number,
                                                             p_bank => :p_bank,
                                                             p_branch => :p_branch,
                                                             p_account => :p_account,
                                                             p_due_date => :p_due_date,
                                                             p_status_check => :p_status_check,
                                                             p_transfer_date => :p_transfer_date,
                                                             p_external_reference => :p_external_reference,
                                                             p_related_bank_files_id => :p_related_bank_files_id,
                                                             p_currency => :p_currency);end;`;
        const bind = {
            p_type: data.type || '',
            p_sub_type: data.subType || '',
            p_success: data.success || 0,
            p_related_transaction_source: data.relatedTransactionSource || '',
            p_customer_id: data.customerId || '',
            p_action_customer_id: data.actionCustomerId || '',
            p_request: data.request || '',
            p_response: JSON.stringify(data.response) || '',
            p_total: data.total || '',
            p_card_id: data.cardId || '',
            p_unique_id: data.uniqueId || '',
            p_last_4_digits: data.last4Digits || '',
            p_tran_id: data.tranId || '',
            p_exp_card: data.cardExpiration || '',
            p_terminal_num: data.terminalNumber || '',
            p_number_of_payments: data.numberOfPayments || '',
            p_first_payment: data.firstPayment || '',
            p_periodical_payment: data.periodicalPayment || '',
            p_open_mode: data.openMode || '',
            p_check_number: data.checkNumber || '',
            p_bank: data.bank || '',
            p_branch: data.branch || '',
            p_account: data.account || '',
            p_due_date: data.dueDate || '',
            p_status_check: data.statusCheck || '',
            p_transfer_date: data.transferDate || '',
            p_external_reference: data.externalReference || '',
            p_related_bank_files_id: data.relatedBankFilesId || '',
            p_currency: data.currency || '3',
        };
        insertLogger({
            end_point: 'insertPaymentDetailsModel',
            logTitle: 'insertPaymentDetailsModel bind.p_card_id',
            data: bind.p_card_id,
            type: 'INFO',
            code: 1,
        });
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `insertPaymentDetailsModel-> ${err.message}`;
        throw (err);
    }
};

const createInvoiceModel = async (actionCustomerId, customerId, serviceType, amount, currency) => {
    try {
        const sql = `begin :result := invoices_pkg.insert_invoice(p_action_customer_id => :p_action_customer_id,
                                         p_customer_id => :p_customer_id,
                                         p_service_type => :p_service_type,
                                         p_amount => :p_amount,
                                         p_currency => :p_currency);end;`;
        const bind = {
            p_action_customer_id: actionCustomerId,
            p_customer_id: customerId,
            p_service_type: serviceType,
            p_amount: amount,
            p_currency: currency,
        };
        return await dbQuery(sql, bind);// hard code because error in trigger customer_invoice
    } catch (err) {
        err.message = `createInvoiceModel-> ${err.message}`;
        throw (err);
    }
};

const createInvoiceModel2 = async (actionCustomerId, customerId, methodType = 1, serviceType, invoiceDetailsArr, invoiceType, currency, reference) => {
    try {
        const sql = `begin :result := invoices_pkg.insert_invoice2(p_action_customer_id => :p_action_customer_id,
                                          p_customer_id => :p_customer_id,
                                          p_customer_type => :p_customer_type,
                                          p_details => :obj,
                                          p_invoice_type => :p_invoice_type,
                                          p_internal_reference => :p_internal_reference,
                                          p_currency => :p_currency,
                                          p_method_type => :p_method_type
                                          );end;`;
        const bind = {
            p_action_customer_id: actionCustomerId,
            p_customer_id: customerId,
            p_customer_type: serviceType,
            p_invoice_type: invoiceType,
            objectName: 'BYA.customer_invoice_details_arr',
            obj: invoiceDetailsArr,
            p_internal_reference: reference,
            p_currency: parseInt(currency, 10),
            p_method_type: methodType,
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `createInvoiceModel-> ${err.message}`;
        throw (err);
    }
};

const invoiceTypeName = (code) => {
    let name;
    switch (parseInt(code, 10)) {
    case 3:
        name = 'sale';
        break;
    case 4:
        name = 'payment';
        break;
    case 10:
        name = 'refund';
        break;
    default:
        break;
    }
    return name;
};

const productsArrFormat = (data, dataForRefund = 0) => ({
    internalReference: data[0].internalReference || null,
    description: data[0].customerType === 201 ? data[0].descriptionHeb : 'הטעינה בוצעה בהצלחה',
    status: 1, // 0 / 1
    transactionType: data[0].transactionTypeEn || null,
    createdOn: data[0].creationOn || null,
    invoices: data[0].invoiceNumbers ? data[0].invoiceNumbers.split(',').map((item, i) => ({
        invoiceNumber: item,
        invoiceType: invoiceTypeName(data[0].methods.split(',')[i]),
        fileHash: data[0].hash ? data[0].hash.split(',')[i] : null,
    })) : data[0].transactionTypeEn === 'Closing a cashbox' ? {
        invoiceNumber: null,
        invoiceType: 5,
        fileHash: data[0].hash || null,
    } : [],
    sourceEntity: {
        custPkId: data[0].actionCustPkId,
        fullName: data[0].entitySource,
    },
    targetEntity: {
        custPkId: data[0].custPkId,
        fullName: data[0].entityTarget,
        serviceId: data[0].customerType,
        emailAddress: data[0].mainEmail,
    },
    amount: {
        nis: data[0].amountNis ? parseFloat(data[0].amountNis.toFixed(2)) : 0,
        original: data[0].originalAmount || parseFloat(data[0].amountNis.toFixed(2)),
        originalCurrency: data[0].originalCurrency || 3,
        rate: data[0].buyRate || 1,
    },
    billing: {
        excessCash: data[0].overpayment ? parseFloat(data[0].overpayment) : 0,
        payments: data[0].customerType !== 201 && data[0].transactionMethod !== 3
            ? data[0].method.split(',').map((method, i) => ({
                dividePayments: method === '2' ? data[0].numberOfPayments + 1 : undefined,
                lastDigitsCardNumber: method === '2' && data[0].cardId ? (data[0].cardId).toString().slice(-4) : null,
                amount: parseFloat(data[0].payAmount.split(',')[i]),
                method: parseInt(method, 10),
                currency: parseInt(data[0].currencies.split(',')[i], 10),
                rate: parseFloat(data[0].rate.split(',')[i]),
            })) : [],
    },
    products: data[0].customerType !== 201 ? data.map((item) => ({
        productId: item.productId,
        serialNumber: item.serialNumber,
        productName: item.productName,
        stockId: item.stockId,
        status: dataForRefund ? item.status : undefined,
        price: {
            amount: item.price,
            currency: data[0].originalCurrency,
        },
        productType: item.categoryId === 1822 ? 'communicationProduct' : 'product',
        quantity: item.amount,
        phone: item.phone,
    })) : [],
    cardDealdetail: dataForRefund ? {
        terminalNum: data[0].terminalNum, tranId: data[0].tranId, cardId: data[0].cardId,
    } : undefined,
});

const getTransactionProductsModel = async (transactionId, dataForRefund = 0, type = null, roaminAgreementFlag = 0) => {
    try {
        const sql = 'begin :result := transactions_pkg.get_transaction_details(p_source_reference => :p_source_reference,p_type => :p_type);end;';
        const bind = {
            p_source_reference: transactionId,
            p_type: type,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        if (res.length === 0 || (res[0] && res[0].NOT_FOUND)) return false;
        res[0].internalReference = transactionId;
        if (roaminAgreementFlag === 1) { return camelCaseKeys(res); }
        return productsArrFormat(camelCaseKeys(res), dataForRefund);
    } catch (err) {
        err.message = `getTransactionProductsModel-> ${err.message}`;
        throw (err);
    }
};

const checkIfTransactionMadeModel = async (transactionId, method) => {
    try {
        const sql = `begin :result := transactions_pkg.check_if_made(p_transaction => :p_transaction, 
                                                                     p_method => :p_method);end;`;
        const bind = {
            p_transaction: transactionId,
            p_method: method,
        };
        const res = await dbQuery(sql, bind);
        if (res < 0) return -3021; // Transaction has already been made
        return 1;
    } catch (err) {
        err.message = `checkIfTransactionMadeModel-> ${err.message}`;
        throw (err);
    }
};

const updateInvoiceNumberInTransactionModel = async (reference, invoiceNumber) => {
    try {
        const sql = 'begin :result := transactions_pkg.update_transaction(p_reference => :p_reference,p_invoice_number => :p_invoice_number);end;';
        const bind = {
            p_reference: reference,
            p_invoice_number: invoiceNumber,
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `updateInvoiceNumberInTransactionModel-> ${err.message}`;
        throw (err);
    }
};

const getInvoiceNumberModel = async (reference) => {
    try {
        const sql = 'begin :result := transactions_pkg.get_invoice_number(p_reference => :p_reference);end;';
        const bind = {
            p_reference: reference,
        };
        const res = await dbQuery(sql, bind);
        return res;
    } catch (err) {
        err.message = `getInvoiceNumberModel-> ${err.message}`;
        throw (err);
    }
};

const getInternalRefByGeneralRefModel = async (reference, type) => {
    try {
        const sql = `begin :result := transactions_pkg.get_internal_ref_by_gen_ref(p_reference => :p_reference,
                                                          p_type => :p_type);end;`;
        const bind = {
            p_reference: reference,
            p_type: type,
        };
        const res = await dbQuery(sql, bind, oracledb.STRING);
        return res;
    } catch (err) {
        err.message = `getInternalRefByGeneralRefModel-> ${err.message}`;
        throw (err);
    }
};

export
{
    checkCreditModel,
    saleTransactionModel,
    payTransactionModel,
    cancelTransactionModel,
    transferModel,
    getDataForInvoiceModel,
    createInvoiceModel,
    getCurrencyRateModel,
    insertPaymentDetailsModel,
    getTransactionProductsModel,
    checkIfTransactionMadeModel,
    updateInvoiceNumberInTransactionModel,
    getInvoiceNumberModel,
    getInternalRefByGeneralRefModel,
    createInvoiceModel2,
};
