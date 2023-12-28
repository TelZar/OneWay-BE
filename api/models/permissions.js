import oracledb from 'oracledb';
import dbQuery from '../db/connect.js';
import { camelCaseKeys, isEmpty } from '../utils/helper.js';
/* Service */
const editServiceModel = async (data, action) => {
    try {
        // Send to function
        const sql = `begin :result := permissions_pkg.edit_services(p_action => :p_action,
                                           p_agent_id => :p_agent_id,
                                           p_service_name => :p_service_name,
                                           p_service_heb_name => :p_service_heb_name,
                                           p_service_id => :p_service_id);end;`;
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close, 3 - edit
            p_service_name: data.serviceName ? data.serviceName : '',
            p_service_heb_name: data.serviceHeName ? data.serviceHeName : '',
            p_agent_id: 100,
            p_service_id: data.serviceId ? data.serviceId : -1,
        };
        const success = await dbQuery(sql, bind);
        return success;
    } catch (err) {
        err.message = `editServiceModel-> ${err.message}`;
        throw (err);
    }
};

const servicesDataFormatJson = (data) => data.map((item) => ({
    serviceId: item.serviceId,
    description: item.description,
    descriptionHeb: item.descriptionHeb,
    status: item.status,
    createdOn: item.createdOn,
    createdBy: item.createdBy,
}));

const getServicesModel = async (data) => {
    try {
        // Send to function
        const sql = 'begin :result := permissione_pkg.get_services(p_agent_id => :p_agent_id);end;';
        const bind = { p_agent_id: 101 };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        if (isEmpty(res) || res < 0) return res;
        return servicesDataFormatJson(camelCaseKeys(res));
    } catch (err) {
        err.message = `getServiceModel-> ${err.message}`;
        throw (err);
    }
};

/* Department */
function arrayNestingRoles(data, id, parent_id, fieldNesting) {
    function toNested(data, pid = null, fieldNesting) {
        const nestedData = data.filter((item) => item[parent_id] === pid);
        return nestedData.map((item) => {
            const children = toNested(data, item[id], fieldNesting);
            if (children.length > 0) {
                item[fieldNesting] = children;
            }
            return item;
        });
    }

    const topLevelData = data.filter((item) => !data.some((element) => element[id] === item[parent_id]));
    return topLevelData.map((item) => {
        const children = toNested(data, item[id], fieldNesting);
        if (children.length > 0) {
            item[fieldNesting] = children;
        }
        return item;
    });
}

const departmentFormatJson = function (data, type) {
    try {
        if (type === 1) // Retrieval of all departments
        {
            return data.map(({
                id, name, nameHeb, status, updatedOn, countRoles,
            }) => ({
                id, name, nameHeb, status, updatedOn, countRoles,
            }));
        }
        if (type === 2) { // Specific department retrieval
            // const servicesArr = data[0].services.split(',');
            // const serviceNamesArr = data[0].serviceNames.split(',');
            return {
                id: data[0].departmentId,
                name: data[0].description,
                nameHe: data[0].descriptionHeb,
                countRoles: data[0].countRoles,
                status: data[0].status,
                // Department services with id and name
                // services: servicesArr.map((id, index) => ({
                //     id: parseInt(id, 10), // Explode and convert values to number
                //     serviceName: serviceNamesArr[index],
                // })),

                // Roles of department in nesting
                roles: arrayNestingRoles(data.map((item) => ({
                    roleId: item.roleId,
                    report2Id: item.report2Id,
                    roleNameHe: item.roleNameHeb,
                })), 'roleId', 'report2Id', 'roles'),
            };
        }
    } catch (err) {
        err.message = `departmentFormatJson-> ${err.message}`;
        throw (err);
    }
};

const editDepartmentModel = async (data, action) => {
    try {
        // Send to function
        const sql = `begin :result := permissione_pkg.edit_departments(p_action => :p_action,
                                              p_agent_id => :p_agent_id,
                                              p_department_name => :p_department_name,
                                              p_department_heb_name => :p_department_heb_name,
                                              p_service_id => :p_service_id,
                                              p_department_id => :p_department_id);end;`;
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close, 3 - edit
            p_agent_id: data.agentId,
            p_department_name: data.departmentName ? data.departmentName : '',
            p_department_heb_name: data.departmentHeName ? data.departmentHeName : '',
            p_service_id: data.serviceId ? data.serviceId : -1,
            p_department_id: data.departmentId ? data.departmentId : -1,
            // p_service_list: /* data.serviceList.length !== 0 ? data.serviceList : */ [1, 2],
        };
        const success = await dbQuery(sql, bind, oracledb.NUMBER);
        return success;
    } catch (err) {
        err.message = `editDepartmentModel-> ${err.message}`;
        throw (err);
    }
};

const getDepartmentModel = async (data) => {
    try {
        // Send to function
        const sql = `begin  :result := permissione_pkg.get_departments(p_agent_id => :p_agent_id,  
                                                                       p_department_id => :p_department_id);end;`;
        const bind = {
            p_agent_id: data.agentId,
            p_department_id: data.departmentId ? data.departmentId : -1,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        if (isEmpty(res) || res < 0) return res;

        // Type - 1 => Retrieval of all departments, Type - 2 => Specific department retrieval
        return data.departmentId ? departmentFormatJson(camelCaseKeys(res), 2) : departmentFormatJson(camelCaseKeys(res), 1);
    } catch (err) {
        err.message = `getDepartmentModel-> ${err.message}`;
        throw (err);
    }
};

/* Roles */
const convertActivityTimeForDb = (activityTime) => {
    const convertToArray = (activity) => {
        // A day without access
        if (activity == null) return Array(24).fill('00').join('');

        const result = [];
        const start = activity.startTime.split(':');
        const end = activity.endTime.split(':');
        let startHours = Number(start[0]);
        const startMinutes = Number(start[1]);
        let endHours = Number(end[0]);
        const endMinutes = Number(end[1]);

        // Fill zeros until start hours
        for (let i = 0; i < startHours; i++) result.push('00');

        // If it starts at half an hour, insert the second half hour
        if (startMinutes === 30) {
            result.push('01');
            startHours += 1;// Advance work start time for the next for
        }
        // Fill the full hours
        for (let i = startHours; i < endHours; i++) result.push('11');

        // If it ends at half an hour, insert the first half hour
        if (endMinutes === 30) {
            result.push('10');
            endHours += 1;// Advance work end time for the next for
        }
        // Full of zeros at the end
        for (let i = endHours; i < 24; i++) result.push('00');

        return result.join('');
    };
    const results = [];
    Object.keys(activityTime).forEach((key, i) => {
        results.push(convertToArray(activityTime[key]));
        results[i] = (i + 1) + results[i];
    });
    return results;
};

const convertDbToActivityTime = (dbRepresentation) => {
    try {
        const convertToObject = (compactRepresentation) => {
            // A day without access
            if (compactRepresentation === Array(24).fill('00').join('')) return null;

            let start = null;
            let end = null;
            for (let i = 0; i < 24; i++) {
                const hour = compactRepresentation.substring(i * 2, i * 2 + 2);// Get two digits from the string from left to right each time
                if (hour === '11') {
                    // Full hour
                    if (start == null) start = `${i}:00`;
                    end = `${i + 1}:00`;
                } else if (hour === '01') {
                    // First half hour
                    if (start == null) start = `${i}:30`;
                    end = `${i + 1}:00`;
                } else if (hour === '10') {
                    // Second half hour
                    if (start == null) start = `${i}:00`;
                    end = `${i}:30`;
                }
            }
            return { startTime: start.length === 4 ? 0 + start : start, endTime: end };
        };
        const results = {};
        dbRepresentation.forEach((compactRepresentation) => {
            const day = compactRepresentation.LIST_ACTIVITY_TIME.substring(0, 1);
            results[day - 1] = convertToObject(compactRepresentation.LIST_ACTIVITY_TIME.substring(1));
        });
        return results;
    } catch (err) {
        err.message = `convertDbToActivityTime-> ${err.message}`;
        throw (err);
    }
};

const moduleActionsFormat = (data) => {
    try { // Format of the modules belonging to the role and the special nesting privileges
        const obj = [];
        const modules = {};
        data.forEach((permission) => {
            const moduleId = permission.MODULE_ID;
            if (!modules[moduleId] && moduleId !== null) {
                modules[moduleId] = {
                    moduleId,
                    label: permission.MODULE_LABEL,
                    canView: permission.CAN_VIEW,
                    canAdd: permission.CAN_ADD,
                    canEdit: permission.CAN_EDIT,
                    canDelete: permission.CAN_DELETE,
                    actions: [],
                };
                obj.push(modules[moduleId]);
            }
            if (permission.ACTION_ID) {
                modules[moduleId].actions.push({
                    actionId: permission.ACTION_ID,
                    label: permission.LABEL,
                });
            }
        });
        return obj;
    } catch (err) {
        err.message = `moduleActionsFormat-> ${err.message}`;
        throw (err);
    }
};

const getActivityTimeModel = async (agentId, roleId) => {
    try {
        // Send to function
        const sql = `begin :result := permissions_pkg.get_activity_time(p_role_id => :p_role_id,
                                               p_agent_id => :p_agent_id);end;`;
        const bind = {
            p_agent_id: agentId || 0,
            p_role_id: roleId || -1,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        return convertDbToActivityTime(res);
    } catch (err) {
        err.message = `getActivityTimeModel-> ${err.message}`;
        throw (err);
    }
};

const roleFormatJson = async function (data, type) {
    try {
        // General details for the role
        if (type === 1) {
            return {
                roleId: data[0].ROLE_ID,
                name: data[0].DESCRIPTION,
                nameHe: data[0].DESCRIPTION_HEB,
                status: data[data.length - 1].STATUS,
                createdOn: { agentId: data[0].created_by, agentName: 'DEV', date: data[0].CREATED_ON },
                updatedOn: {
                    agentId: data[data.length - 1].CREATED_BY,
                    agentName: 'DEV',
                    date: data[data.length - 1].UPDATED_ON,
                },
                reportToRole: {
                    roleId: data[0].report2Id,
                    departmentName: data[0].FATHER_DEPARTMENT_NAME,
                    roleName: data[0].FATHER_ROLE_NAME,
                },
                permissions: moduleActionsFormat(data),
                activityTime: {}/* await getActivityTimeModel(data[0].AGENT_ID, data[0].ROLE_ID) */,
            };
        }
        // else base details for the role with base user information
        return {
            id: data[0].ROLE_ID,
            name: data[0].DESCRIPTION,
            nameHe: data[0].DESCRIPTION_HEB,
            countUsers: data[0].COUNT_USERS,
            users: data.map((item) => ({
                agentId: item.AGENT_ID,
                name: item.NAME,
                createdOn: item.CREATED_ON,
            })),
        };
    } catch (err) {
        err.message = `roleFormatJson-> ${err.message}`;
        throw (err);
    }
};

const getRoleModel = async (data, usersDetails) => {
    try {
        // Send to function
        const sql = `begin :result := permissione_pkg.get_role(p_agent_id => :p_agent_id,
                                      p_role_id => :p_role_id, 
                                      p_users_details => :p_users_details);end;`;
        const bind = {
            p_agent_id: data.agentId,
            p_role_id: data.roleId ? data.roleId : '',
            p_users_details: usersDetails ? 1 : 0,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        if (isEmpty(res) || res < 0) return res;

        // Type - 1 => Retrieval general data of role, Type - 2 => Retrieval base details for the role with base users information
        return usersDetails ? roleFormatJson(res, 2) : roleFormatJson(res, 1);
    } catch (err) {
        err.message = `getRoleModel-> ${err.message}`;
        throw (err);
    }
};

const editRoleModel = async (data, action) => {
    try {
        // Send to function
        const sql = `begin :result := permissions_pkg.edit_departments_roles(p_action => :p_action,
                                                    p_agent_id => :p_agent_id,
                                                    p_role_name => :p_role_name,
                                                    p_role_heb_name => :p_role_heb_name,
                                                    p_department_id => :p_department_id,
                                                    p_report2_id => :p_report2_id,
                                                    p_sub2_h => :p_sub2_h,
                                                    p_login_limit_id => :p_login_limit_id,
                                                    p_role_id => :p_role_id);end;`;
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close, 3 - edit
            p_agent_id: data.agentId,
            p_role_name: data.roleName ? data.roleName : '',
            p_role_heb_name: data.roleHeName ? data.roleHeName : '',
            p_department_id: data.departmentId ? data.departmentId : '',
            p_report2_id: data.report2Id ? data.report2Id : '',
            p_sub2_h: data.subToOrder ? data.subToOrder : 1,
            p_login_limit_id: data.loginLimitId ? data.loginLimitId : -1,
            p_role_id: data.roleId ? data.roleId : '',
        };
        const success = await dbQuery(sql, bind, oracledb.NUMBER);
        return success;
    } catch (err) {
        err.message = `editRoleModel-> ${err.message}`;
        throw (err);
    }
};

const editActivityTimeModel = async (data, action) => {
    try {
        // Send to function
        const sql = `begin :result := permissions_pkg.edit_login_limition(p_action => :p_action,
                                                 p_agent_id => :p_agent_id,
                                                 p_login_limition_id => :p_login_limition_id,
                                                 p_role_id => :p_role_id,
                                                 p_list => :p_list);end;`;
        // Convert activity time for Db
        data.activityTime = convertActivityTimeForDb(data.activityTime);
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close, 3 - edit
            p_agent_id: data.agentId,
            p_login_limition_id: data.limitionId ? data.limitionId : '',
            p_role_id: data.roleId ? data.roleId : '',
            p_list: data.activityTime ? data.activityTime : '',
        };
        const success = await dbQuery(sql, bind, oracledb.NUMBER);
        return success;
    } catch (err) {
        err.message = `editActivityTimeModel-> ${err.message}`;
        throw (err);
    }
};

/* Modules */
const modulesDB = `begin :result := permissions_pkg.edit_agent_modules(p_action => :p_action,
                                                p_agent_id => :p_agent_id,
                                                p_can_view => :p_can_view,
                                                p_can_add => :p_can_add,
                                                p_can_edit => :p_can_edit,
                                                p_can_delete => :p_can_delete,
                                                p_role_id => :p_role_id,
                                                p_module_id => :p_module_id,
                                                p_ag_module_id => :p_ag_module_id);end;`;
const editModuleModel = async (data, action) => {
    try {
        // Send to function
        const sql = modulesDB;
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close, 3 - edit
            p_agent_id: data.agentId,
            p_can_view: data.canView ? data.canView : '',
            p_can_add: data.canAdd ? data.canAdd : '',
            p_can_edit: data.canEdit ? data.canEdit : '',
            p_can_delete: data.canDelete ? data.canDelete : '',
            p_role_id: data.roleID ? data.roleID : '',
            p_module_id: data.moduleId ? data.moduleID : '',
            p_ag_module_id: data.agModuleID ? data.agModuleID : '',
        };
        const success = await dbQuery(sql, bind, oracledb.NUMBER);
        return success;
    } catch (err) {
        err.message = `editModuleModel-> ${err.message}`;
        throw (err);
    }
};

const modulesAndActionsFormat = (data) => {
    try { // Format of the modules belonging to the role and the special nesting privileges
        const obj = [];
        const modules = {};
        data.forEach((module) => {
            const moduleId = module.MODULE_ID;
            if (!modules[moduleId]) {
                modules[moduleId] = {
                    moduleId: module.MODULE_ID,
                    label: module.MODULE_LABEL,
                    moduleName: module.MODULE_NAME,
                    moduleNameHe: module.MODULE_NAME_HE,
                    actions: [],
                };
                obj.push(modules[moduleId]);
            }
            if (module.ACTION_ID) {
                modules[moduleId].actions.push({
                    actionId: module.ACTION_ID,
                    label: module.ACTION_LABEL,
                    actionName: module.ACTION_NAME,
                    actionNameHe: module.ACTION_NAME_HE,
                });
            }
        });
        return obj;
    } catch (err) {
        err.message = `modulesAndActionsFormat-> ${err.message}`;
        throw (err);
    }
};

const getModulesModel = async (agentId) => {
    try {
        // Send to function
        const sql = 'begin :result := permissione_pkg.get_modules(p_agent_id => :p_agent_id);end;';
        const bind = {
            p_agent_id: agentId,
        };
        const res = await dbQuery(sql, bind, oracledb.CURSOR);
        if (isEmpty(res) || res < 0) return res;
        return modulesAndActionsFormat(res);
    } catch (err) {
        err.message = `getModulesModel-> ${err.message}`;
        throw (err);
    }
};
/* Permission */

// Edit module with base permissions for role
const editPermissionModel = async (data, action) => {
    try {
        // Send to function
        const sql = `begin :result := permissions_pkg.edit_agents_modules(p_action => :p_action,
                                                 p_agent_id => :p_agent_id,
                                                 p_ag_module_id => :p_ag_module_id,
                                                 p_role_id => :p_role_id,
                                                 p_module_id => :p_module_id,
                                                 p_can_view => :p_can_view,
                                                 p_can_add => :p_can_add,
                                                 p_can_edit => :p_can_edit,
                                                 p_can_delete => :p_can_delete);end;`;
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close, 3 - edit
            p_agent_id: data.agentId,
            p_ag_module_id: data.agModuleId ? data.agModuleId : '',
            p_role_id: data.roleId ? data.roleId : '',
            p_module_id: data.moduleId ? data.moduleId : '',
            p_can_view: data.canView ? data.canView : 0,
            p_can_add: data.canAdd ? data.canAdd : 0,
            p_can_edit: data.canEdit ? data.canEdit : 0,
            p_can_delete: data.canDelete ? data.canDelete : 0,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        err.message = `editPermissionModel-> ${err.message}`;
        throw (err);
    }
};
// Edit actions permission to the module for a certain role
const editActionsByRoleModel = async (data, action) => {
    try {
        // Send to function
        const sql = `begin :result := permissions_pkg.edit_permissions(p_action => :p_action,
                                              p_agent_id => :p_agent_id,
                                              p_permission_id => :p_permission_id,
                                              p_ag_module_id => :p_ag_module_id,
                                              p_action_id => :p_action_id,
                                              p_actions_list => :p_actions_list,
                                              p_on_off => :p_on_off);end;`;
        const bind = {
            p_action: action, // Action: 1 - add, 2 - close, 3 - edit
            p_agent_id: data.agentId,
            p_permission_id: data.permissionId ? data.permissionId : '',
            p_action_id: -1,
            p_ag_module_id: data.agModuleId ? data.agModuleId : '',
            p_actions_list: data.actionsList.length !== 0 ? data.actionsList : [-1],
            p_on_off: 1,
        };
        const ag_module_id = await dbQuery(sql, bind, oracledb.NUMBER);
        return ag_module_id;
    } catch (err) {
        err.message = `editActionsByRoleModel-> ${err.message}`;
        throw (err);
    }
};

const associateRoleToAgentsModel = async (data) => {
    try {
        // Send to function
        const sql = `begin :result := permissions_pkg.associate_roles_to_agent(
                     p_agent_id => :p_agent_id,
                     p_role_id => :p_role_id,
                     p_agents_list => :p_agents_list);end;`;

        const bind = {
            p_agent_id: 100,
            p_role_id: data.roleId ? data.roleId : '',
            p_agents_list: data.agentsList ? data.agentsList : '',
        };
        const ag_module_id = await dbQuery(sql, bind);
        return ag_module_id;
    } catch (err) {
        err.message = `associateRolesToAgent-> ${err.message}`;
        throw (err);
    }
};

const getAgModuleIdByRoleAndModule = async (agentId, moduleId, roleId) => {
    try {
        // Send to function
        const sql = `begin :result := permissione_pkg.get_ag_module_id_by_role(p_role_id => :p_role_id,
                                                      p_module_id => :p_module_id,
                                                      p_agent_id => :p_agent_id);end;`;

        const bind = {
            p_role_id: roleId,
            p_module_id: moduleId,
            p_agent_id: agentId,
        };
        const res = await dbQuery(sql, bind, oracledb.NUMBER);
        return res;
    } catch (err) {
        err.message = `getAgModuleIdByRoleAndModule-> ${err.message}`;
        throw (err);
    }
};

const checkIfChangedActionsModel = async (agentId, moduleActions, agModuleId) => {
    try {
        // Send to function
        const sql = `begin :result := permissione_pkg.get_actions_by_ag_module_id(p_ag_module_id => :p_ag_module_id,
                                                         p_agent_id => :p_agent_id);end;`;

        const bind = {
            p_ag_module_id: agModuleId,
            p_agent_id: agentId,
        };
        const actions = await dbQuery(sql, bind, oracledb.CURSOR);

        // Check if not all the actions for this model are included in actions received from a client and are identical in length
        return !(actions.length === moduleActions.length && actions.every((a) => moduleActions.includes(a.ACTION_ID)));
    } catch (err) {
        err.message = `checkIfChangedActionsModel-> ${err.message}`;
        throw (err);
    }
};

export {
    getServicesModel,
    editServiceModel,
    getDepartmentModel,
    editDepartmentModel,
    getRoleModel,
    editRoleModel,
    getModulesModel,
    editModuleModel,
    editPermissionModel,
    editActionsByRoleModel,
    editActivityTimeModel,
    getActivityTimeModel,
    moduleActionsFormat,
    associateRoleToAgentsModel,
    getAgModuleIdByRoleAndModule,
    checkIfChangedActionsModel,
};
