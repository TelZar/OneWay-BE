import oracledb from 'oracledb';
import { camelCaseKeys, convertKeysToUpperCaseWithUnderscore, isEmpty } from '../utils/helper.js';
import dbQuery from '../db/connect.js';
import { insertLogger } from '../utils/logger.js';

/* Categories */
const getCategoryObj = {
    V_CATEGORY_ID: null,
};

const getCategortDetailsModel = async (categoryId = null) => {
    try {
        getCategoryObj.V_CATEGORY_ID = categoryId;
        const sql = 'begin :result := bya.category_pkg.get_category(o_category_id => :obj); end;';
        const bind = {
            objectName: 'BYA.CATEGORY_ID_OBJ',
            obj: getCategoryObj,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getCategoriesModel-> ${err.message}`;
        throw (err);
    }
};

const getCategoriesModel = async (categoryId = null) => {
    try {
        getCategoryObj.V_CATEGORY_ID = categoryId;
        const sql = 'begin :result := bya.category_pkg.get_category(o_category_id => :obj); end;';
        const bind = {
            objectName: 'BYA.CATEGORY_ID_OBJ',
            obj: getCategoryObj,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getCategoriesModel-> ${err.message}`;
        throw (err);
    }
};

const setCategoriesModel = async (data) => {
    const setCategoryObj = {
        V_MAIN_CATEGORY_ID: null,
        V_TYPE_PRODUCT_ID: null,
        V_DESCRIPTION: null,
        V_CATEGORY_NAME: null,
        V_CATEGORY_ID: null,
        V_CREATED_BY: null,
    };
    try {
        const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(data);

        for (const [key, value] of Object.entries(dataUpperCaseWithUnderscore)) {
            if (setCategoryObj.hasOwnProperty(`V_${key.toUpperCase()}`)) setCategoryObj[`V_${key.toUpperCase()}`] = value;
        }
        setCategoryObj.V_CREATED_BY = `${data.agentId}`;

        // validations
        if (!setCategoryObj.V_CATEGORY_NAME) return { categoryId: -20164 };

        const sql = 'begin :result := bya.category_pkg.set_category(v_category_details => :obj); end;';
        const bind = {
            objectName: 'BYA.SET_CATEGORY_OBJ',
            obj: setCategoryObj,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { categoryId: res };
    } catch (err) {
        err.message = `setCategoriesModel-> ${err.message}`;
        throw (err);
    }
};

const deleteCategoriesModel = async (categoryId) => {
    try {
        getCategoryObj.V_CATEGORY_ID = categoryId;
        const sql = 'begin :result := bya.category_pkg.delete_category(o_category_id => :obj); end;';
        const bind = {
            objectName: 'BYA.CATEGORY_ID_OBJ',
            obj: getCategoryObj,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { success: res };
    } catch (err) {
        err.message = `deleteCategoriesModel-> ${err.message}`;
        throw (err);
    }
};

const getCategoryProductsModel = async (categoryId) => {
    try {
        getCategoryObj.V_CATEGORY_ID = categoryId;
        const sql = 'begin :result := bya.category_pkg.get_products_by_category(o_category_id => :obj); end;';
        const bind = {
            objectName: 'BYA.CATEGORY_ID_OBJ',
            obj: getCategoryObj,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return { products: camelCaseKeys(res) };
    } catch (err) {
        err.message = `getCategoryProductsModel-> ${err.message}`;
        throw (err);
    }
};

/* Products */
const LINE_PRODUCT_OBJ = {
    NAME: null,
    DESCRIPTION: null,
    VOICE: 0,
    SMS: 0,
    IDATA: 0,
    ALLOW_BALANCE_TRANSFER: 0,
    PRODUCT_ID: null,
    DAYS_VALID: 0,
    STATUS: 1,
    SPECIAL_PRODUCT: 0,
    ISRAEL_USE: 0,
    PARENT_PRODUCT: null,
    PRICE: 0,
    RENEWAL: 0,
    PERIOD: 0,
    RENEWAL_COUNT: 0,
    EXTERNAL_PRODUCT: null,
    CATEGORY_ID: null,
    MARKET_ID: null,
    HLR_ID: null,
    MARKET_INFO: null,
    EXTERNAL_PRODUCT2: null,
    DOWNLOAD_SPEED: null,
    UPLOAD_SPEED: null,
    MABAL: null,
    MAIN_PRODUCT: null,
    VALIDATION_DATE: null,
    AGREMENT_INFO: null,
    ONNET_CALLS: 0,
    INTERNATIONAL_SMS: 0,
    MIN_SUBSCRIBER: 1,
    MAX_SUBSCRIBER: 1,
    NEXT_PRICE: null,
    NEXT_RENEWAL_COUNT: null,
    IN_INVOICE: 1,
    FIRST_CALL: 0,
    MNO_CHECK: 0,
    MAX_NETWORK_RATE: null,
    EXTERNAL_PRODUCT3: null,
    SPECIFICATIONS: null,
    VENDOR_ID: null,
    CREATED_BY: null,
};

const PRODUCT_ID_OBJ = { PRODUCT_ID: null };
const PRODUCT_AGENT_OBJ = { PRODUCT_ID: null, AGENT_ID: null, COUNTRY_CODE: null };
const PRODUCT_CATEGORY_OBJ = { PRODUCT_ID: null, MAIN_CATEGORY_ID: null };

const getProductModel = async (productId, agentId, countryCode = null) => {
    try {
        PRODUCT_AGENT_OBJ.PRODUCT_ID = productId.toString();
        PRODUCT_AGENT_OBJ.AGENT_ID = agentId;
        PRODUCT_AGENT_OBJ.COUNTRY_CODE = countryCode || null;
        const sql = 'begin :result := bya.products_pkg.get_product(v_p_a => :obj); end;';
        const bind = {
            objectName: 'BYA.PRODUCT_AGENT_OBJ',
            obj: PRODUCT_AGENT_OBJ,
        };
        insertLogger({
            end_point: 'getProductModel bind',
            logTitle: 'getProductModel PRODUCT_AGENT_OBJ',
            data: PRODUCT_AGENT_OBJ,
            type: 'INFO',
            code: 1,
        });
        let res = await dbQuery(sql, bind, oracledb.CURSOR);
        if (res[0] && res[0].NOT_FOUND) return false;
        res = await camelCaseKeys(res);
        return res;
    } catch (err) {
        err.message = `getProductModel-> ${err.message}`;
        throw (err);
    }
};

const deleteProductModel = async (productId) => {
    try {
        PRODUCT_ID_OBJ.PRODUCT_ID = productId;
        const sql = 'begin :result := bya.products_pkg.delete_product(v_product_id => :obj); end;';
        const bind = {
            objectName: 'BYA.PRODUCT_ID_OBJ',
            obj: PRODUCT_ID_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `deleteProductModel-> ${err.message}`;
        throw (err);
    }
};

const setProductModel = async (data, actionType) => {
    try {
        const ARR_SET_PRODUCT_OBJ = [];

        for (const product of data.products) {
            const LINE_PRODUCT_OBJ_TMP = { ...LINE_PRODUCT_OBJ }; // Create a new instance of LINE_PRODUCT_OBJ for each iteration

            let ARR_CATEGORY_ID_OBJ = [];
            if (product.categories && !isEmpty(product.categories)) ARR_CATEGORY_ID_OBJ = product.categories.map((category_id) => ({ V_CATEGORY_ID: category_id }));

            let ARR_RATES_ID_OBJ = [];
            if (product.rates && !isEmpty(product.rates)) ARR_RATES_ID_OBJ = product.rates.map((rate_id) => ({ RATES_ID: rate_id }));

            const dataUpperCaseWithUnderscore = await convertKeysToUpperCaseWithUnderscore(product);
            for (const key in dataUpperCaseWithUnderscore) {
                if (LINE_PRODUCT_OBJ_TMP.hasOwnProperty(key)) {
                    LINE_PRODUCT_OBJ_TMP[key] = dataUpperCaseWithUnderscore[key];
                }
            }
            LINE_PRODUCT_OBJ_TMP.CREATED_BY = `${data.agentId}`;

            let { productId } = product;
            if (actionType === 1) { // Update
                LINE_PRODUCT_OBJ_TMP.PRODUCT_ID = data.product_id;
                productId = data.productId;
            }

            const SET_PRODUCT_OBJ = {
                ACTION_TYPE: actionType,
                PRODUCT_ID: productId,
                LINE_PRODUCT: LINE_PRODUCT_OBJ_TMP,
                ARR_CATEGORY: ARR_CATEGORY_ID_OBJ,
                ARR_RATES: ARR_RATES_ID_OBJ,
            };
            ARR_SET_PRODUCT_OBJ.push(SET_PRODUCT_OBJ);
        }

        const sql = 'begin :result := bya.products_pkg.set_product(arr_products => :obj); end;';
        const bind = {
            objectName: 'BYA.arr_set_product_obj',
            obj: ARR_SET_PRODUCT_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        err.message = `setProductModel-> ${err.message}`;
        throw err;
    }
};

const getProductCategoriesModel = async (productId, mainCategoryId = null) => {
    try {
        PRODUCT_CATEGORY_OBJ.PRODUCT_ID = productId;
        PRODUCT_CATEGORY_OBJ.MAIN_CATEGORY_ID = mainCategoryId;
        const sql = 'begin :result := bya.products_pkg.get_product_category(v_p_c => :obj); end;';
        const bind = {
            objectName: 'BYA.PRODUCT_CATEGORY_OBJ',
            obj: PRODUCT_CATEGORY_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getProductCategoriesModel-> ${err.message}`;
        throw (err);
    }
};

const getProductRatesModel = async (productId) => {
    try {
        PRODUCT_ID_OBJ.PRODUCT_ID = productId;
        const sql = 'begin :result := bya.products_pkg.get_product_rates(v_product_id => :obj); end;';
        const bind = {
            objectName: 'BYA.PRODUCT_ID_OBJ',
            obj: PRODUCT_ID_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getProductRatesModel-> ${err.message}`;
        throw (err);
    }
};

const getProductStatusModel = async (statusId) => {
    const ID_STASUS_OBJ = { ID: statusId || null };
    try {
        const sql = 'begin :result := bya.products_pkg.get_product_status(v_id => :obj); end;';
        const bind = {
            objectName: 'BYA.ID_STASUS_OBJ',
            obj: ID_STASUS_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getProductStatusModel-> ${err.message}`;
        throw (err);
    }
};

const addProductStatusModel = async (description_status) => {
    const DESCRIPTION_STASUS_OBJ = { DESCRIPTION_STATUS: description_status };
    try {
        const sql = 'begin :result := bya.products_pkg.add_product_status(v_description => :obj); end;';
        const bind = {
            objectName: 'BYA.DESCRIPTION_STASUS_OBJ',
            obj: DESCRIPTION_STASUS_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `getProductStatusModel-> ${err.message}`;
        throw (err);
    }
};

const deleteProductStatusModel = async (statusId) => {
    const ID_STASUS_OBJ = { ID: statusId };
    try {
        const sql = 'begin :result := bya.products_pkg.delete_product_status(v_id => :obj); end;';
        const bind = {
            objectName: 'BYA.ID_STASUS_OBJ',
            obj: ID_STASUS_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `deleteProductStatusModel-> ${err.message}`;
        throw (err);
    }
};

const getProductNamesModel = async (categoryId, nameId) => {
    const P_NAME_MAIN_CAT_OBJ = {
        MAIN_CATEGORY_ID: categoryId,
        CODE_ID: nameId,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.get_product_name(v_main_category_id => :obj); end;';
        const bind = {
            objectName: 'BYA.P_NAME_MAIN_CAT_OBJ',
            obj: P_NAME_MAIN_CAT_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getProductNamesModel-> ${err.message}`;
        throw (err);
    }
};

const addProductNameModel = async (main_category_id, req) => {
    const ADD_NAME_OBJ = {
        DESCRIPTION: req.description,
        CREATED_BY: `${req.agentId}`,
        STORE_DISPLAY: req.store_display || null,
        REPORT_DISPLAY: req.report_display || null,
        MAIN_CATEGORY_ID: main_category_id,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.add_product_name(NAME => :obj); end;';
        const bind = {
            objectName: 'BYA.ADD_NAME_OBJ',
            obj: ADD_NAME_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `addProductNameModel-> ${err.message}`;
        throw (err);
    }
};

const deleteProductNameModel = async (nameId) => {
    const NAME_ID_OBJ = { CODE_ID: nameId };
    try {
        const sql = 'begin :result := bya.products_pkg.delete_product_name(n_id => :obj); end;';
        const bind = {
            objectName: 'BYA.NAME_ID_OBJ',
            obj: NAME_ID_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `deleteProductNameModel-> ${err.message}`;
        throw (err);
    }
};

const getProductManufacturerModel = async (nameId, manufacturerId) => {
    const GET_MANUFACTURERS_OBJ = {
        PRODUCT_NAME_ID: nameId,
        MANUFACTURER_ID: manufacturerId,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.get_product_manufacturers(m_n_id => :obj); end;';
        const bind = {
            objectName: 'BYA.GET_MANUFACTURERS_OBJ',
            obj: GET_MANUFACTURERS_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getProductManufacturerModel-> ${err.message}`;
        throw (err);
    }
};

const addProductManufacturerModel = async (nameId, req) => {
    const ADD_MANUFACTURERS_OBJ = {
        DESCRIPTION: req.description,
        PRODUCT_NAME_ID: nameId,
        CREATED_BY: `${req.agentId}`,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.add_product_manufacturer(facturer => :obj); end;';
        const bind = {
            objectName: 'BYA.ADD_MANUFACTURERS_OBJ',
            obj: ADD_MANUFACTURERS_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `addProductManufacturerModel-> ${err.message}`;
        throw (err);
    }
};

const deleteProductManufacturerModel = async (manufacturerId) => {
    const ID_MANUFACTURERS_OBJ = { MANUFACTURER_ID: manufacturerId };
    try {
        const sql = 'begin :result := bya.products_pkg.delete_product_manufacturers(m_n_id => :obj); end;';
        const bind = {
            objectName: 'BYA.ID_MANUFACTURERS_OBJ',
            obj: ID_MANUFACTURERS_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `deleteProductManufacturerModel-> ${err.message}`;
        throw (err);
    }
};

const getProductModelsModel = async (nameId, manufacturerId, modelId) => {
    const GET_MODEL_OBJ = {
        PRODUCT_NAME_ID: `${nameId}`,
        PRODUCT_MANUFACTURER_ID: `${manufacturerId}`,
        MODEL_ID: modelId || null,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.get_product_model(MODEL => :obj); end;';
        const bind = {
            objectName: 'BYA.GET_MODEL_OBJ',
            obj: GET_MODEL_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getProductModelsModel-> ${err.message}`;
        throw (err);
    }
};

const addProductModelModel = async (nameId, manufacturerId, req) => {
    const ADD_MODEL_OBJ = {
        DESCRIPTION: req.description,
        PRODUCT_NAME_ID: nameId,
        PRODUCT_MANUFACTURER_ID: manufacturerId,
        CREATED_BY: `${req.agentId}`,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.add_product_model(model => :obj); end;';
        const bind = {
            objectName: 'BYA.ADD_MODEL_OBJ',
            obj: ADD_MODEL_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `addProductModelModel-> ${err.message}`;
        throw (err);
    }
};

const deleteProductModelModel = async (modelId) => {
    const MODEL_ID_OBJ = { MODEL_ID: modelId };
    try {
        const sql = 'begin :result := bya.products_pkg.delete_product_model(m_id => :obj); end;';
        const bind = {
            objectName: 'BYA.MODEL_ID_OBJ',
            obj: MODEL_ID_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `deleteProductModelModel-> ${err.message}`;
        throw (err);
    }
};

const getProductFirstSubCategoryModel = async (modelId, firstSubCategoryId) => {
    const GET_FIRST_SUBCATEGOR_OBJ = {
        PRODUCT_MODEL_ID: modelId,
        FIRST_SUBCATEGORY_ID: firstSubCategoryId || null,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.get_product_first_subcategory(sub => :obj); end;';
        const bind = {
            objectName: 'BYA.GET_FIRST_SUBCATEGOR_OBJ',
            obj: GET_FIRST_SUBCATEGOR_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getProductFirstSubCategoryModel-> ${err.message}`;
        throw (err);
    }
};

const addProductFirstSubCategoryModel = async (modelId, req) => {
    const ADD_FIRST_SUBCATEGOR_OBJ = {
        DESCRIPTION: req.description,
        PRODUCT_MODEL_ID: modelId,
        CREATED_BY: `${req.agentId}`,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.add_product_first_subcategory(sub => :obj); end;';
        const bind = {
            objectName: 'BYA.ADD_FIRST_SUBCATEGOR_OBJ',
            obj: ADD_FIRST_SUBCATEGOR_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `addProductFirstSubCategoryModel-> ${err.message}`;
        throw (err);
    }
};

const deleteProductFirstSubCategoryModel = async (firstSubCategory) => {
    const FIRST_SUBCATEGOR_ID_OBJ = { FIRST_SUBCATEGORY_ID: firstSubCategory };
    try {
        const sql = 'begin :result := bya.products_pkg.delete_product_first_subcat(id_dub => :obj); end;';
        const bind = {
            objectName: 'BYA.FIRST_SUBCATEGOR_ID_OBJ',
            obj: FIRST_SUBCATEGOR_ID_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `deleteProductFirstSubCategoryModel-> ${err.message}`;
        throw (err);
    }
};

const getProductColorsModel = async (colorId) => {
    const ID_COLOR_OBJ = { COLOR_ID: colorId || null };
    try {
        const sql = 'begin :result := bya.products_pkg.get_product_colors(c_id => :obj); end;';
        const bind = {
            objectName: 'BYA.ID_COLOR_OBJ',
            obj: ID_COLOR_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getProductColorsModel-> ${err.message}`;
        throw (err);
    }
};

const addProductColorModel = async (req) => {
    const ADD_COLORS_OBJ = {
        DESCRIPTION: req.description,
        PRODUCT_MODEL_ID: req.product_model_id || null,
        HEX: req.hex,
        CREATED_BY: `${req.agentId}`,
    };
    try {
        const sql = 'begin :result := bya.products_pkg.add_product_color(v_color => :obj); end;';
        const bind = {
            objectName: 'BYA.ADD_COLORS_OBJ',
            obj: ADD_COLORS_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `getProductStatusModel-> ${err.message}`;
        throw (err);
    }
};

const deleteProductColorsModel = async (colorId) => {
    const ID_COLOR_OBJ = { COLOR_ID: colorId };
    try {
        const sql = 'begin :result := bya.products_pkg.delete_product_color(c_id => :obj); end;';
        const bind = {
            objectName: 'BYA.ID_COLOR_OBJ',
            obj: ID_COLOR_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `deleteProductColorsModel-> ${err.message}`;
        throw (err);
    }
};

const getRateProductsModel = async (rateId, productId) => {
    const RATES_AGREMENT_OBJ = {
        AGREMENT_ID: `'${rateId}'`,
        QUALITY: productId || null,
    };
    try {
        const sql = 'begin :result := bya.rates_pkg.get_products_by_operator(v_AGREMENT => :obj); end;';
        const bind = {
            objectName: 'BYA.RATES_AGREMENT_OBJ',
            obj: RATES_AGREMENT_OBJ,
        };

        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getRateProductsModel-> ${err.message}`;
        throw (err);
    }
};

const getRateCategoriesModel = async (agreement_id, categoryId) => {
    const CATEGORY_RATES_OBJ = {
        V_AGREMENT_ID: agreement_id,
        V_CATEGORY_ID: categoryId || null,
    };
    try {
        const sql = 'begin :result := bya.rates_pkg.get_categories_by_agreement(cr => :obj); end;';
        const bind = {
            objectName: 'BYA.CATEGORY_RATES_OBJ',
            obj: CATEGORY_RATES_OBJ,
        };

        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return camelCaseKeys(res);
    } catch (err) {
        err.message = `getRateCategoriesModel-> ${err.message}`;
        throw (err);
    }
};

const setRateModel = async (req, params) => {
    const LINE_RATES_OBJ = {
        QUALITY: null, // VARCHAR2(16),
        VENDOR_ID: null, // NUMBER,
        CALENDAR_VALUE: 0, // NUMBER,
        DIRECTION: null, // VARCHAR2(128),
        ACTIVE: 1, // NUMBER,
        LOAD_DATE: null, // DATE,
        REJECT_DATE: null, // DATE,
        COUNTRY_NAME: null, // VARCHAR2(256),
        OPERATOR_DESC: null, // VARCHAR2(256),
        PREFIX: null, // NUMBER,
        RATE: null, // NUMBER,
        CURRENCY: 'USD', // VARCHAR2(16 CHAR),
        COUNTRY_CODE: null, // NUMBER
        AGREMENT_ID: null, // NUMBER
    };
    try {
        const ARR_LINE_RATES_OBJ = [];

        req.rates.forEach((rate) => {
            rate = convertKeysToUpperCaseWithUnderscore(rate);
            const LINE_RATES_OBJ_TMP = { ...LINE_RATES_OBJ }; // Create a new instance of LINE_PRODUCT_OBJ for each iteration
            for (const key in rate) if (LINE_RATES_OBJ_TMP.hasOwnProperty(key.toUpperCase())) LINE_RATES_OBJ_TMP[key.toUpperCase()] = rate[key];
            LINE_RATES_OBJ_TMP.AGREMENT_ID = params.rateId;
            if (!LINE_RATES_OBJ_TMP.OPERATOR_DESC && LINE_RATES_OBJ_TMP.COUNTRY_NAME)LINE_RATES_OBJ_TMP.OPERATOR_DESC = LINE_RATES_OBJ_TMP.COUNTRY_NAME;
            if (!LINE_RATES_OBJ_TMP.PREFIX && LINE_RATES_OBJ_TMP.COUNTRY_CODE)LINE_RATES_OBJ_TMP.PREFIX = LINE_RATES_OBJ_TMP.COUNTRY_CODE;
            if (!LINE_RATES_OBJ_TMP.OPERATOR_DESC && !LINE_RATES_OBJ_TMP.COUNTRY_NAME && !LINE_RATES_OBJ_TMP.COUNTRY_CODE && !LINE_RATES_OBJ_TMP.PREFIX) {
                LINE_RATES_OBJ_TMP.COUNTRY_NAME = 'Israel';
                LINE_RATES_OBJ_TMP.OPERATOR_DESC = 'Israel';
                LINE_RATES_OBJ_TMP.COUNTRY_CODE = 972;
                LINE_RATES_OBJ_TMP.PREFIX = 972;
            }

            ARR_LINE_RATES_OBJ.push(LINE_RATES_OBJ_TMP);
        });

        const SET_RATES_OBJ = {
            ARR_RATES: ARR_LINE_RATES_OBJ,
            CREATION_USER: `${req.agentId}`,
        };

        const sql = 'begin :result := bya.RATES_PKG.set_rates(v_rates => :obj); end;';
        const bind = {
            objectName: 'BYA.SET_RATES_OBJ',
            obj: SET_RATES_OBJ,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return { res };
    } catch (err) {
        err.message = `setRateModel-> ${err.message}`;
        throw (err);
    }
};

export {
    getCategortDetailsModel,
    getCategoriesModel,
    setCategoriesModel,
    deleteCategoriesModel,
    getCategoryProductsModel,
    getProductModel,
    deleteProductModel,
    setProductModel,
    getProductCategoriesModel,
    getProductRatesModel,
    getProductStatusModel,
    addProductStatusModel,
    deleteProductStatusModel,
    getProductNamesModel,
    addProductNameModel,
    deleteProductNameModel,
    getProductManufacturerModel,
    addProductManufacturerModel,
    deleteProductManufacturerModel,
    getProductModelsModel,
    addProductModelModel,
    getProductFirstSubCategoryModel,
    addProductFirstSubCategoryModel,
    deleteProductFirstSubCategoryModel,
    deleteProductModelModel,
    getProductColorsModel,
    addProductColorModel,
    deleteProductColorsModel,
    getRateProductsModel,
    getRateCategoriesModel,
    setRateModel,
};
