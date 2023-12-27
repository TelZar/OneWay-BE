import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { camelCaseKeys } from '../utils/helper.js';

const getSearchDataFromOracle = async (agentId, filters, sort, module) => {
    try {
        const sql = `begin bya.advanced_search(p_condition_search => :search,
                        p_order_by => :sort,
                        p_agent_id => :agentId,
                        p_search_type => :module,
                        p_count => :count,
                        p_seq => :seq,
                        p_result => :data);end;`;
        const bind = {
            search: filters ? `${filters.join(' and ')}` : '',
            sort: sort ? `${sort.col} ${sort.direction}` : '',
            agentId,
            module,
            count: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            seq: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            data: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
        };
        const res = await dbQuery(sql, bind, '', 'proc');
        res.data = camelCaseKeys(res.data);
        return res;
    } catch (err) {
        err.message = `getSearchDataFromOracle-> ${err.message}`;
        throw (err);
    }
};

const matchingToMysqlQuery = (cond) => {
    let mysqlCond = '';

    mysqlCond = cond.replaceAll('trunc(created_on)', 'DATE_FORMAT(created_on, \'%d/%m/%Y\')');
    mysqlCond = mysqlCond.replaceAll('to_date(', '');
    mysqlCond = mysqlCond.replaceAll(',\'dd/mm/yyyy\')', '');

    mysqlCond = mysqlCond.replaceAll('transaction_type_en', 'transaction_type');
    mysqlCond = mysqlCond.replaceAll('sale', 'מכירה');
    mysqlCond = mysqlCond.replaceAll('payment', 'תשלום');
    mysqlCond = mysqlCond.replaceAll('refund', 'זיכוי');
    mysqlCond = mysqlCond.replaceAll('moneyTransfer', 'העברת כספים');

    return mysqlCond;
};

const getSearchDataFromMySQL = async (agentId, filters, activeSession, sort, module) => {
    try {
        const res = {};
        const sql = 'call get_advanced_search(:p_seq, :p_searched_by, :p_search_serial ,:p_conditions, :p_order_by, :p_page_type)';
        const bind = {
            p_seq: activeSession.seq,
            p_searched_by: agentId,
            p_search_serial: activeSession.serial,
            p_conditions: filters.length > 0 ? `and ${filters.join(' and ')}` : '',
            p_order_by: sort ? `${sort.col} ${sort.direction}` : null,
            p_page_type: module,
        };
        bind.p_conditions = matchingToMysqlQuery(bind.p_conditions);
        res.data = camelCaseKeys(await dbQuery(sql, bind, 'row', '', 'MYSQL'));
        res.count = res.data.length;
        return res;
    } catch (err) {
        err.message = `getSearchDataFromMySQL-> ${err.message}`;
        throw (err);
    }
};
// save
const saveSearchModel = async (data) => {
    try {
        const cols = data.cols ? JSON.stringify(data.cols) : '';
        const sql = 'select insert_to_history_search(:p_agentId,:p_page,:p_cols,:p_conditions,:p_name, :p_bookmark) as id';
        const bind = {
            p_agentId: data.agentId,
            p_page: data.modulePage,
            p_cols: cols,
            p_conditions: data.query,
            p_name: data.label ? data.label : '',
            p_bookmark: data.isBookmarked ? data.isBookmarked : 0,
        };
        return await dbQuery(sql, bind, 'rows', 'row', 'MYSQL');
    } catch (err) {
        err.message = `saveSearchModel-> ${err.message}`;
        throw (err);
    }
};

// update the index??????
const editSortSavedSearchesModel = async (data) => {
    try {
        const SavedSearchesArray = JSON.stringify(data.searches);
        const sql = 'select editSortSavedSearches(:p_SavedSearches_arr, :p_agentId, :p_module) as res';
        const bind = {
            p_SavedSearches_arr: SavedSearchesArray,
            p_agentId: data.agentId,
            p_module: data.modulePage,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res.res;
    } catch (err) {
        err.message = `editSortSavedSearchesModel-> ${err.message}`;
        throw (err);
    }
};

const editSavedSearchesModel = async (data) => {
    try {
        const sql = 'select update_saved_search(:p_agentId, :p_module, :p_id, :p_bookmark) as res';
        const bind = {
            p_agentId: data.agentId,
            p_module: data.modulePage,
            p_id: data.searchId,
            p_bookmark: data.isBookmarked,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res.res;
    } catch (err) {
        err.message = `editSortSavedSearchesModel-> ${err.message}`;
        throw (err);
    }
};

// delete
const updateSaveSearchModel = async (data) => {
    try {
        const sql = 'select delete_from_history_search(:p_agentId,:p_id) as success';
        const bind = {
            p_agentId: data.agentId,
            p_id: data.searchId,
        };
        return await dbQuery(sql, bind, 'rows', 'row', 'MYSQL');
    } catch (err) {
        err.message = `saveSearchModel-> ${err.message}`;
        throw (err);
    }
};

const getSavedSearchModel = async (data) => {
    try {
        const sql = 'call get_saved_search(:p_agentId, :p_module, :p_limit)';
        const bind = {
            p_agentId: data.agentId,
            p_module: data.modulePage,
            p_limit: data.limit ? data.limit : 1,
        };
        return await dbQuery(sql, bind, 'rows', '', 'MYSQL');
    } catch (err) {
        err.message = `saveSearchModel-> ${err.message}`;
        throw (err);
    }
};

const getQuickSearchModel = async (data) => {
    try {
        const sql = `begin :result := fast_search(P_Object_Group => :P_Object_Group,
                                            P_ObjectValue => :P_ObjectValue, P_user => :P_user, P_action => :P_action, P_partition => :P_partition );end;`;
        const bind = {
            P_Object_Group: 1, // to fast_search we send 1
            P_ObjectValue: data.value,
            P_user: data.agentId,
            P_action: data.action,
            P_partition: data.partition,
        };
        return camelCaseKeys(await dbQuery(sql, bind, oracledb.CURSOR));
    } catch (err) {
        err.message = `getQuickSearchModel-> ${err.message}`;
        throw (err);
    }
};

const advancedSearchColsModel = async (data) => {
    try {
        let result = [];
        switch (data.page) {
        case 'customers':
            result = ['customer_name', 'phone', 'contact_phone', 'national_id', 'first_name', 'last_name', 'main_email', 'customer_status', 'date_of_birth', 'city_name', 'city_code'];
            break;
        case 'orders':
            result = ['', '', '', '', '', '', '', '', '', '', '', ''];
            break;
        case 'products':
            result = ['', '', '', '', '', '', '', '', '', '', '', ''];
            break;
        default:
            result = [];
        }
        return result;
    } catch (err) {
        err.message = `advancedSearchColsModel-> ${err.message}`;
        throw (err);
    }
};

const getSavedSearchDataModel = async (cols, cond, typeData = 'data', groupBy = '') => {
    try {
        const sql = `begin :result := get_saved_search_data(p_cond => :p_cond,
                                   p_type_data => :p_type_data,
                                   p_col => :p_col,
                                   p_group_by => :p_group_by);end;`;
        // eslint-disable
        const bind = {
            p_cond: `${cond.join(' and ')}`,
            p_type_data: typeData || 'data',
            p_col: cols[0],
            p_group_by: groupBy || '',
        };
        return await dbQuery(sql, bind, oracledb.CURSOR);
    } catch (err) {
        err.message = `getSavedSearchDataModel-> ${err.message}`;
        throw (err);
    }
};

// get all the last search
const getAgentActiveSession = async (agentId, page) => {
    try {
        const sql = 'call check_active_session(:p_agentId, :p_module)';
        const bind = { p_agentId: agentId, p_module: page };
        return await dbQuery(sql, bind, 'row', '', 'MYSQL');
    } catch (err) {
        err.message = `getAgentActiveSession-> ${err.message}`;
        throw (err);
    }
};

export {
    getQuickSearchModel,
    saveSearchModel,
    getSearchDataFromOracle,
    getSearchDataFromMySQL,
    advancedSearchColsModel,
    getSavedSearchDataModel,
    getAgentActiveSession,
    getSavedSearchModel,
    updateSaveSearchModel,
    editSortSavedSearchesModel,
    editSavedSearchesModel,
};
