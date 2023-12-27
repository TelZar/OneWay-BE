import dbQuery from '../db/connect.js';

const editShortcutModel = async (data, action) => {
    try {
        const sql = 'select editShortcut(:p_action, :p_shortcutId, :p_agentId, :p_title, :p_routeType, :p_routeVal, :p_icon, :p_order, :p_color) as res';
        const bind = {
            p_action: action, // Action: 1 - add, 2 - edit, 3 - delete
            p_shortcutId: data.shortcutId ? data.shortcutId : 1,
            p_agentId: data.agentId,
            p_title: data.label ? data.label : null,
            p_routeType: data.to || null,
            p_routeVal: data.avatar ? data.avatar.label : null,
            p_icon: data.avatar ? data.avatar.icon : null,
            p_order: data.order || 1,
            p_color: data.avatar ? data.avatar.color : null,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res.res;
    } catch (err) {
        err.message = `editShortcutModel-> ${err.message}`;
        throw (err);
    }
};

function shortCutDataformatJson(data) {
    const response = data.map((item) => ({
        id: item.shortcutId,
        to: item.routeType,
        avatar: {
            color: item.color,
            icon: item.icon,
            label: item.routeVal,
        },
        label: item.title,
    }));
    return response;
}

const getShortcutsModel = async (agentId) => {
    try {
        const sql = 'call getShortcuts(:p_agent_id)';
        const bind = { p_agent_id: agentId };
        const data = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return shortCutDataformatJson(data);
    } catch (err) {
        err.message = `getShortcutModel-> ${err.message}`;
        throw (err);
    }
};

const editSortingShortcutModel = async (req, agentId) => {
    try {
        const sql = 'select editSortShortcut(:p_shortCutId_arr, :p_agentId) as res';
        const bind = { p_shortCutId_arr: req, p_agentId: agentId };
        const res = await dbQuery(sql, bind, 'number', '', 'MYSQL');
        return res.res;
    } catch (err) {
        err.message = `editSortingShortcutModel-> ${err.message}`;
        throw (err);
    }
};

const editDashboardModel = async (data, action) => {
    try {
        // Send to function
        const sql = 'select edit_dashboard(:p_dashboardId,:p_action,:p_title,:p_label,:p_createdBy) as dashboardId';
        const bind = {
            p_dashboardId: data.dashboardId ? data.dashboardId : -1,
            p_action: action, // Action: 1 - add, 2 - edit, 3 - delete
            p_title: data.title ? data.title : '',
            p_label: data.label ? data.label : '',
            p_createdBy: 100,
        };
        console.log('bind =', bind);
        const success = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return success.dashboardId;
    } catch (err) {
        err.message = `editDashboardModel-> ${err.message}`;
        throw (err);
    }
};

const getDashboardsModel = async (data) => {
    try {
        // Send to function
        const sql = 'call getDashboards()';
        const bind = {};
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res;
    } catch (err) {
        err.message = `getWidgetModel-> ${err.message}`;
        throw (err);
    }
};

const editAgentWidgetModel = async (data, action) => {
    try {
        // Send to function
        const sql = `select editWidget(:p_widgetId,:p_action,:p_widgetPrimaryId,:p_dashboardLabel,:p_labelType,:p_val,:p_type,
                                      :p_size,:p_title,:p_orderNum,:p_searchId,:p_typeData,:p_createdBy) as res`;
        const bind = {
            p_widgetId: data.widgetId ? data.widgetId : -1,
            p_action: action, // Action: 1 - add, 2 - edit, 3 - delete
            p_widgetPrimaryId: data.widgetPrimaryId ? data.widgetPrimaryId : -1,
            p_dashboardLabel: data.dashboardId ? data.dashboardId : -1,
            p_labelType: data.labelType ? data.labelType : -1,
            p_val: data.val ? data.val : -1,
            p_type: data.type ? data.type : -1,
            p_size: data.size ? data.size : -1,
            p_title: data.title ? data.title : -1,
            p_orderNum: data.orderNum ? data.orderNum : -1,
            p_searchId: data.searchId ? data.searchId : -1,
            p_typeData: data.typeData ? data.typeData : 'data',
            p_createdBy: data.createdBy ? data.createdBy : 100,
        };
        console.log('bind =', bind);
        const success = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        console.log('res = ', success);
        return success.res;
    } catch (err) {
        err.message = `editWidgetModel-> ${err.message}`;
        throw (err);
    }
};

const getAgentWidgetModel = async (data) => {
    try {
        // Send to function
        const sql = 'call getWidgets(:p_departmentId,:p_roleId,:p_agent_id,:p_moduleId)';
        const bind = {
            p_departmentId: 3, p_roleId: 12, p_agent_id: data.action ? data.action : 100, p_moduleId: data.dashboardId,
        };
        console.log('bind = ', bind);
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res;
    } catch (err) {
        err.message = `getWidgetModel-> ${err.message}`;
        throw (err);
    }
};

const getWidgetsDataModel = async (data) => {
    try {
        // Send to function
        const sql = 'call getWidgetsData(:p_widgetPrimaryId)';
        const bind = {
            p_widgetPrimaryId: data.widgetPrimaryId,
        };
        const res = await dbQuery(sql, bind, 'row', '', 'MYSQL');
        return res;
    } catch (err) {
        err.message = `getWidgetsDataModel-> ${err.message}`;
        throw (err);
    }
};

export {
    editShortcutModel,
    getShortcutsModel,
    editSortingShortcutModel,
    editDashboardModel,
    getDashboardsModel,
    editAgentWidgetModel,
    getAgentWidgetModel,
    getWidgetsDataModel,
};
