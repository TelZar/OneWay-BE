import { isEmpty } from '../utils/helper.js';
import * as accessoriesModel from '../models/accessories.js';
import { filterByCols } from './search.js';
import { getSavedSearchDataModel } from '../models/search.js';

/* Shortcut */
const getShortcuts = async (req) => {
    try {
        const data = await accessoriesModel.getShortcutsModel(req.body.agentId);
        if (isEmpty(data)) return { status: 204, code: data * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `getShortcuts-> ${err.message}`;
        throw err;
    }
};

const addShortcut = async (req) => {
    try {
        const success = await accessoriesModel.editShortcutModel(req.body, 1);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 201, data: { shortcutId: success } };
    } catch (err) {
        err.message = `addShortcut-> ${err.message}`;
        throw err;
    }
};

const editShortcut = async (req) => {
    try {
        req.body.shortcutId = req.params.shortcutId;
        const success = await accessoriesModel.editShortcutModel(req.body, 2);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 200, data: {} };
    } catch (err) {
        err.message = `editShortcut-> ${err.message}`;
        throw err;
    }
};

const editSortingShortcut = async (req) => {
    try {
        const data = JSON.stringify(req.body.shortcuts);
        const success = await accessoriesModel.editSortingShortcutModel(data, req.body.agentId);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 200, data: {} };
    } catch (err) {
        err.message = `editShortcut-> ${err.message}`;
        throw err;
    }
};

const delShortcut = async (req) => {
    try {
        req.body.shortcutId = req.params.shortcutId;
        const success = await accessoriesModel.editShortcutModel(req.body, 3);
        if (success < 0) return { status: 404, code: 3006 };// There are no records
        return { status: 200, data: {} };
    } catch (err) {
        err.message = `delShortcut-> ${err.message}`;
        throw err;
    }
};

// Dashboard
const addDashboard = async (req) => {
    try {
        const success = await accessoriesModel.editDashboardModel(req.body, 1);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 201, data: { dashboardId: success } };
    } catch (err) {
        err.message = `addDashboard-> ${err.message}`;
        throw err;
    }
};

const getDashboards = async (req) => {
    try {
        const data = await accessoriesModel.getDashboardsModel(req.params);
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        if (data < 0) return { status: 400, code: data * -1 };// Error
        return { status: 200, data };
    } catch (err) {
        err.message = `getDashboards-> ${err.message}`;
        throw err;
    }
};

const editDashboard = async (req) => {
    try {
        req.body.dashboardId = req.params.dashboardId;
        const success = await accessoriesModel.editDashboardModel(req.body, 2);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `editDashboard-> ${err.message}`;
        throw err;
    }
};

const delDashboard = async (req) => {
    try {
        const success = await accessoriesModel.editDashboardModel(req.params, 3);
        if (success < 0) return { status: 404, code: 3006 };// There are no records
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `delDashboard-> ${err.message}`;
        throw err;
    }
};

// Widget
const getAgentWidgets = async (req) => {
    try {
        req.body.dashboardId = req.params.dashboardId;
        const data = await accessoriesModel.getAgentWidgetModel(req.body);

        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        if (data < 0) return { status: 400, code: data * -1 };// Error
        return { status: 200, data };
    } catch (err) {
        err.message = `getAgentWidgets-> ${err.message}`;
        throw err;
    }
};

const getAgentWidgetsData = async (req) => {
    try {
        req.body.widgetPrimaryId = req.params.widgetPrimaryId;
        const queryToRun = await accessoriesModel.getWidgetsDataModel(req.body);
        console.log(queryToRun);
        const data = [];
        await Promise.all(queryToRun.map(async (item) => {
            if (item.typeData === 'data') item = await filterByCols(JSON.parse(item.cols), await getSavedSearchDataModel(JSON.parse(item.cols), objToArray(JSON.parse(item.query)), item.typeData));
            else item = await getSavedSearchDataModel(JSON.parse(item.cols), objToArray(JSON.parse(item.query)), item.typeData);
            data.push(item);
        }));
        if (isEmpty(data)) return { status: 404, code: 3006 };// There are no records
        if (data < 0) return { status: 400, code: data * -1 };// Error
        return { status: 200, data };
    } catch (err) {
        err.message = `getAgentWidgetsData-> ${err.message}`;
        throw err;
    }
};

const addAgentWidget = async (req) => {
    try {
        req.body.dashboardId = req.params.dashboardId;
        req.body.widgetPrimaryId = req.params.widgetPrimaryId;
        let widprimary = null;
        for (const wid of req.body.widgets) {
            widprimary = await accessoriesModel.editAgentWidgetModel({
                widgetPrimaryId: widprimary || req.body.widgetPrimaryId,
                dashboardId: req.body.dashboardId,
                labelType: wid.labelType ? wid.labelType : -1,
                val: wid.val ? wid.val : -1,
                type: req.body.type ? req.body.type : -1,
                size: wid.size ? wid.size : -1,
                title: wid.title ? wid.title : -1,
                orderNum: wid.orderNum ? wid.orderNum : -1,
                searchId: wid.searchId ? wid.searchId : -1,
                typeData: wid.typeData ? wid.typeData : 'data',
                createdBy: req.body.agentId, // ,
            }, 1);
            if (widprimary < 0) {
                // insertLogger({
                //     end_point: 'addAgentWidget - add widget',
                //     logTitle: `Bug in add widget. user: ${req.body.agentId},code: ${widprimary}, data: ${wid}`,
                //     type: 'ERROR',
                //     code: -1,
                // });
                return { status: 400, code: widprimary * -1 };
            }
        }
        return { status: 201, data: { widgetPrimarytId: widprimary } };
    } catch (err) {
        err.message = `addAgentWidget-> ${err.message}`;
        throw err;
    }
};

const editAgentWidget = async (req) => {
    try {
        req.body.dashboardId = req.params.dashboardId;
        req.body.widgetId = req.params.widgetId;
        const success = await accessoriesModel.editAgentWidgetModel(req.body, 2);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `editAgentWidget-> ${err.message}`;
        throw err;
    }
};

const delAgentWidget = async (req) => {
    try {
        req.body.widgetId = req.params.widgetId;
        req.body.widgetPrimaryId = req.params.widgetPrimaryId;
        const success = await accessoriesModel.editAgentWidgetModel(req.body, 3);// Delete
        if (success < 0) return { status: 404, code: 3006 };// There are no records
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `delAgentWidget-> ${err.message}`;
        throw err;
    }
};

export {
    getShortcuts,
    addShortcut,
    editShortcut,
    delShortcut,
    editSortingShortcut,
    getDashboards,
    addDashboard,
    editDashboard,
    delDashboard,
    addAgentWidget,
    editAgentWidget,
    getAgentWidgets,
    delAgentWidget,
    getAgentWidgetsData,
};
