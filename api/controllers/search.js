import camelCase from 'camelcase';
import {
    getQuickSearchModel,
    getSearchDataFromOracle,
    saveSearchModel,
    getSearchDataFromMySQL,
    advancedSearchColsModel,
    getAgentActiveSession,
    getSavedSearchModel,
    updateSaveSearchModel,
    editSortSavedSearchesModel,
    editSavedSearchesModel,
} from '../models/search.js';
import { pagination } from '../utils/helper.js';

function objToArray(filters) { // GET array of OBJECTS WITH THE KEY: 'COL', 'OPERATOR' AND 'VALUE' AND join them for string
    const filterArray = [];
    let text = '';
    filters.sort((a, b) => {
        if (a.col < b.col) return -1;
        if (a.col > b.col) return 1;
        return 0;
    });
    for (const filter of filters) {
        let val = filter.value;
        if (!['contains', 'in'].includes(filter.operator)) {
            val = `'${filter.value}'`;
        }
        if (['in', 'nin'].includes(filter.operator)) {
            val = filter.value.map((f) => `'${f}'`);
        }
        if (filter.col.includes('created_on')) val = `to_date(${val},'dd/mm/yyyy')`;
        switch (filter.operator) {
        case 'eq':
            text = `${filter.col} = ${val}`;
            break;
        case 'lt':
            text = `${filter.col} < ${val}`;
            break;
        case 'gt':
            text = `${filter.col} > ${val}`;
            break;
        case 'neq':
            text = `${filter.col} <> ${val}`;
            break;
        case 'lte':
            text = `${filter.col} <= ${val}`;
            break;
        case 'gte':
            text = `${filter.col} >= ${val}`;
            break;
        case 'contains':
            text = `${filter.col} like '%${val}%'`;
            break;
        case 'in':
            text = `${filter.col} in(${val})`;
            break;
        case 'nin':
            text = `${filter.col} not in(${val})`;
            break;
        default:
            text = '';
        }
        filterArray.push(text);
    }
    return filterArray;
}

async function checkExistingSearchInActiveSession(agentId, filters, page) {
    try {
        const arrFilter = filters.length === 0 ? [...filters, '-1'] : filters;
        const agentSessions = await getAgentActiveSession(agentId, page);
        if (agentSessions.length > 0) {
            for (const session of agentSessions) {
                const arrayFilter = session.sql_query.split(' and ');
                if (arrayFilter.every((el) => arrFilter.includes(el))) {
                    return {
                        status: 1,
                        serial: session.search_serial,
                        seq: session.seq_id,
                        count: session.count,
                    };
                }
            }
        }
        return { status: 0 };
    } catch (err) {
        err.message = `checkExistingSearchInActiveSession-> ${err.message}`;
        throw err;
    }
}

// The function receives an array of strings and array of JSON objects and returns an array of JSON objects filtered by the selected columns
export function filterByCols(columns, data, module) {
    let entityFields = [];
    let countryFields = {};
    let priceFields = {};
    switch (module) {
    case 'customers':
        entityFields = {
            name: 'pName', nationalId: 'nationalId', phone: 'phone', email: 'email',
        };
        break;
    case 'products':
        entityFields = { name: 'pName', productId: 'productId', img: 'img' };
        break;
    case 'communicationProducts':
        entityFields = { label: 'productName', caption: 'productId' };
        countryFields = {
            id: 'countryCode', isoCode: 'isoCode', name: 'countryNameHe', nameEn: 'countryNameEn',
        };
        priceFields = { amount: 'price', currency: 'currency' };
        break;
    case 'transactions':
        entityFields = {
            label: 'transactionType',
            caption: 'description',
            status: 'status',
            icon: 'productTypes',
            internalReference: 'internalReference',
        };
        columns.push('id');
        break;
    default:
        entityFields = [];
    }
    columns = columns.map((word) => camelCase(word));
    if (columns !== undefined && columns.length > 0) {
        const cols = columns.map((item) => item.toLowerCase());
        return data.map((obj) => {
            let finalObj = {};
            const entity = {};
            // Return only the required columns
            const filteredObj = Object.fromEntries(
                Object.entries(obj).filter(([key]) => cols.includes(key.toLowerCase())),
            );
            // entity definision
            Object.keys(entityFields).forEach((key) => {
                entity[key] = obj[entityFields[key]];
            });
            // Defining special objects for the module - communicationProducts
            if (module === 'communicationProducts') {
                const country = {};
                const price = {};
                Object.keys(priceFields).forEach((key) => {
                    price[key] = obj[priceFields[key]];
                });
                entity.price = price;
                if (cols.includes('price')) {
                    finalObj.price = price;
                }
                if (cols.includes('country')) {
                    Object.keys(countryFields).forEach((key) => {
                        country[key] = obj[countryFields[key]];
                    });
                    finalObj.country = country;
                }
            }
            finalObj.entity = entity;
            finalObj = { ...filteredObj, ...finalObj };
            return finalObj;
        });
    }
    return data;
}

// function getObjectGroup(value) {
//     let objectGroup;
//     switch (true) {
//     case value.includes('לקוח'):
//         console.log("The string includes 'some1'");
//         break;
//     case value.includes('הזמנה'):
//         console.log("The string includes 'some2'");
//         break;
//     case value.includes('מוצר'):
//         console.log("The string includes 'some3'");
//         break;
//     case value.includes('חשבונית'):
//         console.log("The string includes 'some4'");
//         break;
//     default:
//         objectGroup = '';
//     }
//     return objectGroup;
// }

const advancedSearch = async (req) => {
    try {
        let searchResult;
        let canFiltersJustFromOracle;
        let type;
        const {
            offset, limit, filters, columns, sort, module, agentId,
        } = req;
        switch (module) {
        case 'customers':
            type = 1;
            break;
        case 'products':
            type = 2;
            break;
        case 'transactions':
            type = 3;
            break;
        case 'communicationProducts':
            type = 4;
            break;
        default:
            type = undefined;
            break;
        }
        const filtersArray = objToArray(filters);
        // Checking if the conditions of the filter are also possible in MYSQL
        if (type === 4 && filters.some((el) => el.col === ('category_id'))) {
            canFiltersJustFromOracle = true;
        }
        // Checking whether the data exists in MYSQL
        const activeSessionFromMySql = await checkExistingSearchInActiveSession(agentId, filtersArray, type);
        if (activeSessionFromMySql.status === 1 && !canFiltersJustFromOracle) {
            // get the data from mysql
            searchResult = await getSearchDataFromMySQL(agentId, filtersArray, activeSessionFromMySql, sort, type);
        }
        if (true) {
            // get the data from oracle
            searchResult = await getSearchDataFromOracle(agentId, filtersArray, sort, type);
        }
        // if (searchResult.count <= 0) {
        //     return { status: 204, code: 3006 };
        // }
        console.log('searchResult: ', searchResult);
        // Pagination for search results
        const result = pagination(searchResult.data, offset, limit);
        result.count = searchResult.count;

        // Returning only the required columns
        result.data = filterByCols(columns, result.data, module);
        return { status: 200, result };
    } catch (err) {
        err.message = `advancedSearch-> ${err.message}`;
        throw err;
    }
};

const advancedSearchCols = async (req) => {
    try {
        const data = await advancedSearchColsModel(req.params);
        if (data.length <= 0) {
            return { status: 204, code: 3006 };
        }
        return { status: 200, result: data };
    } catch (err) {
        err.message = `advancedSearchCols-> ${err.message}`;
        throw err;
    }
};

const saveSearch = async (req) => {
    try {
        const data = await saveSearchModel(req);
        if (data.length <= 0) {
            return { status: 204, code: 3006 };
        }
        return { status: 200, data: data[0] };
    } catch (err) {
        err.message = `saveSearch-> ${err.message}`;
        throw err;
    }
};

const editSortSavedSearches = async (req) => {
    try {
        const data = await editSortSavedSearchesModel(req);
        if (data.length <= 0) {
            return { status: 204, code: 3006 };
        }
        return { status: 200, data: data[0] };
    } catch (err) {
        err.message = `editSortSavedSearches-> ${err.message}`;
        throw err;
    }
};

const editSavedSearches = async (req) => {
    try {
        const data = await editSavedSearchesModel(req);
        if (data.length <= 0) {
            return { status: 204, code: 3006 };
        }
        return { status: 200, data: data[0] };
    } catch (err) {
        err.message = `editSavedSearches-> ${err.message}`;
        throw err;
    }
};

const getSavedSerach = async (req) => {
    try {
        const data = await getSavedSearchModel(req);
        if (data[0].length <= 0) {
            return { status: 204, code: 3006 };
        }
        return { status: 200, data: data[0] };
    } catch (err) {
        err.message = `getSavedSerach-> ${err.message}`;
        throw err;
    }
};

const updateSavedSerach = async (req) => {
    try {
        const data = await updateSaveSearchModel(req);
        if (data.length <= 0 || data[0].success < 1) {
            return { status: 400, code: 3006 };
        }
        return { status: 200 };
    } catch (err) {
        err.message = `updateSavedSerach-> ${err.message}`;
        throw err;
    }
};

const getQuickSearch = async (req) => {
    try {
        const { agentId, value } = req.query;
        const action = 0;
        const partition = 0;
        // const objectGroup = getObjectGroup(search); // quickSearch
        const data = {
            agentId, value, action, partition, /* , objectGroup, */
        };
        const result = await getQuickSearchModel(data);
        if (result.length <= 0) {
            return { status: 204, code: 3006 };
        }
        data.partition = result[0].PARTITION_PART;

        const resultsArray = [];
        let index;
        let type;
        result.map((obj) => {
            switch (true) {
            case (/customer/i.test(obj.objectType)):
                type = 'customers';
                break;
            case (/order/i.test(obj.objectType)):
                type = 'orders';
                break;
            case (/invoice/i.test(obj.objectType)):
                type = 'invoices';
                break;
            case (/product/i.test(obj.objectType)):
                type = 'products';
                break;
            default:
                type = 'other';
            }
            index = resultsArray.findIndex((el) => el.name === type);
            if (index >= 0) {
                resultsArray[index].value.push(obj);
            } else {
                resultsArray.push({ name: type, value: [obj] });
            }
            return resultsArray;
        });
        resultsArray.unshift({ name: 'Top Hit', value: result[0] });
        return { status: 200, resultsArray };
    } catch (err) {
        err.message = `getQuickSearch-> ${err.message}`;
        throw err;
    }
};

export {
    advancedSearch,
    getQuickSearch,
    saveSearch,
    advancedSearchCols,
    getSavedSerach,
    updateSavedSerach,
    editSortSavedSearches,
    editSavedSearches,
    objToArray,
};
