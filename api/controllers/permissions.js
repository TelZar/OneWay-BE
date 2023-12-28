import * as model from '../models/permissions.js';
import { isEmpty } from '../utils/helper.js';
import { getAgModuleIdByRoleAndModule } from '../models/permissions.js';

/* Services */
const getServices = async (req) => {
    try {
        const data = await model.getServicesModel(req.params);
        if (isEmpty(data)) return { status: 204, code: data * -1 };// There are no records
        if (data < 0) return { status: 400, code: data * -1 };// Error
        return { status: 200, data };
    } catch (err) {
        err.message = `getServices-> ${err.message}`;
        throw err;
    }
};

const addService = async (req) => {
    try {
        const success = await model.editServiceModel(req.body, 1);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 201, data: { serviceId: success } };
    } catch (err) {
        err.message = `addService-> ${err.message}`;
        throw err;
    }
};

const editService = async (req) => {
    try {
        const success = await model.editServiceModel(req.body, 3);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `editService-> ${err.message}`;
        throw err;
    }
};

const delService = async (req) => {
    try {
        const success = await model.editServiceModel(req.body, 2);
        if (success < 0) return { status: 404, code: 3006 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `delService-> ${err.message}`;
        throw err;
    }
};
/* Department */

const getDepartment = async (req) => {
    try {
        const data = await model.getDepartmentModel(req.params);
        // When retrieving a certain department if there is no data it is a 404 error
        if (isEmpty(data)) { return { status: req.body.departmentId ? 404 : 204, code: 3006 }; }// There are no records
        if (data < 0) return { status: 400, code: data * -1 };// Error
        return { status: 200, data };
    } catch (err) {
        err.message = `getDepartment-> ${err.message}`;
        throw err;
    }
};

const addDepartment = async (req) => {
    try {
        const success = await model.editDepartmentModel(req.body, 1);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 201, data: { departmentId: success } };
    } catch (err) {
        err.message = `addDepartment-> ${err.message}`;
        throw err;
    }
};

const editDepartment = async (req) => {
    try {
        const success = await model.editDepartmentModel(req.body, 3);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `editDepartment-> ${err.message}`;
        throw err;
    }
};

const delDepartment = async (req) => {
    try {
        req.body.departmentId = req.params.departmentId;
        const success = await model.editDepartmentModel(req.body, 2);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `delDepartment-> ${err.message}`;
        throw err;
    }
};
/* Roles */

const getRole = async (req, usersDetails = false) => {
    try {
        const data = await model.getRoleModel(req.params, usersDetails);
        // When retrieving a certain role if there is no data it is a 404 error
        if (isEmpty(data)) return usersDetails ? { status: 204 } : { status: 404, code: 3006 };// There are no records
        if (data < 0) return { status: 400, code: data * -1 };// Error
        return { status: 200, data };
    } catch (err) {
        err.message = `getRole-> ${err.message}`;
        throw err;
    }
};

const editRole = async (req) => {
    try {
        req.body.departmentId = req.params.departmentId;
        req.body.roleId = req.params.roleId;
        const success = await model.editRoleModel(req.body, 3);
        if (success < 0) return { status: 400, code: success * -1 };
        if (req.body.activityTime) {
            // Set worker time for role
            const activityTime = await model.editActivityTimeModel(req.body, 3);
            if (activityTime < 0) return { status: 400, code: activityTime * -1 };
        }
        return { status: 204, data: { /* roleId: req.body.roleId */ } };
    } catch (err) {
        err.message = `editRole-> ${err.message}`;
        throw err;
    }
};

const delRole = async (req) => {
    try {
        req.body.roleId = req.params.roleId;
        const success = await model.editRoleModel(req.body, 2);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `delRole-> ${err.message}`;
        throw err;
    }
};

const addRole = async (req) => {
    try {
        const roleId = await model.editRoleModel(req.body, 1);
        if (roleId < 0) return { status: 400, code: roleId * -1 };

        if (req.body.activityTime) {
            // Set worker time for role
            req.body.roleId = roleId;
            const activityTime = await model.editActivityTimeModel(req.body, 1);
            if (activityTime < 0) {
                // If there was a problem adding working hours to the role, we will close the role
                await delRole(req);
                return { status: 400, code: activityTime * -1 };
            }
        }
        return { status: 201, data: { roleId } };
    } catch (err) {
        err.message = `addRole-> ${err.message}`;
        throw err;
    }
};
/* Modules */
const getModules = async (req) => {
    try {
        const data = await model.getModulesModel(req.body.agentId);
        if (isEmpty(data)) { return { status: 204, code: 3006 }; }// There are no records
        if (data < 0) return { status: 400, code: data * -1 };// Error
        return { status: 200, data };
    } catch (err) {
        err.message = `getModules-> ${err.message}`;

        throw err;
    }
};

const addModule = async (req) => {
    try {
        const success = await model.editModuleModel(req.body, 1);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 200, data: {} };
    } catch (err) {
        err.message = `addModule-> ${err.message}`;
        throw err;
    }
};

const editModule = async (req) => {
    try {
        const success = await model.editModuleModel(req.body, 3);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 200, data: {} };
    } catch (err) {
        err.message = `editModule-> ${err.message}`;
        throw err;
    }
};

const delModule = async (req) => {
    try {
        const success = await model.editModuleModel(req.body, 2);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `delModule-> ${err.message}`;
        throw err;
    }
};
/* Permission */
const addPermission = async (req) => {
    try {
        // Create module with base permissions (view, add, edit and close)
        req.body.roleId = req.params.roleId;
        let ag_module_id;
        let resActions;
        for (const per of req.body.permissions) {
            ag_module_id = await model.editPermissionModel({
                agentId: req.body.agentId,
                roleId: req.body.roleId,
                moduleId: per.moduleId,
                canView: per.basicActions.canView,
                canAdd: per.basicActions.canAdd,
                canEdit: per.basicActions.canEdit,
                canDelete: per.basicActions.canDelete,
            }, 1);
            // If insert module permission failed
            if (ag_module_id < 0) return { status: 400, code: ag_module_id * -1 };

            // Add actions by agModuleId
            if (per.moduleActions) {
                resActions = await model.editActionsByRoleModel({ agentId: req.body.agentId, agModuleId: ag_module_id, actionsList: per.moduleActions }, 1);
                if (resActions < 0) return { status: 400, code: resActions * -1 };
            }
        }
        return { status: 201, data: { permissionId: resActions } };
    } catch (err) {
        err.message = `addPermission-> ${err.message}`;
        throw err;
    }
};

const editPermission = async (req) => {
    try {
        // Edit module with base permissions (view, add, edit and close)
        req.body.roleId = req.params.roleId;
        let res;
        let resActions;
        let p_agModuleId;
        for (const per of req.body.permissions) {
            p_agModuleId = await getAgModuleIdByRoleAndModule(req.body.agentId, per.moduleId, req.body.roleId);
            res = await model.editPermissionModel({
                agentId: req.body.agentId,
                roleId: req.body.roleId,
                agModuleId: p_agModuleId,
                moduleId: per.moduleId,
                canView: per.basicActions.canView,
                canAdd: per.basicActions.canAdd,
                canEdit: per.basicActions.canEdit,
                canDelete: per.basicActions.canDelete,
            }, 3);
            // If edit module permission failed
            if (res < 0) return { status: 400, code: res * -1 };

            // Edit actions by agModuleId
            if (per.moduleActions && await model.checkIfChangedActionsModel(req.body.agentId, per.moduleActions, p_agModuleId)) {
                console.log('p_agModuleId = ', p_agModuleId);
                resActions = await model.editActionsByRoleModel({
                    agModuleId: p_agModuleId,
                    permissionId: per.permissionId,
                    actionsList: per.moduleActions,
                }, 3);

                if (resActions < 0) return { status: 400, code: resActions * -1 };
            }
        }
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `editPermission-> ${err.message}`;
        throw err;
    }
};

const delPermission = async (req) => {
    try {
        const success = await model.editPermissionModel(req.body, 2);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 204, data: {} };
    } catch (err) {
        err.message = `delModule-> ${err.message}`;
        throw err;
    }
};

const associateRoleToAgents = async (req) => {
    try {
        const success = await model.associateRoleToAgentsModel(req.body);
        if (success < 0) return { status: 400, code: success * -1 };
        return { status: 200, data: {} };
    } catch (err) {
        err.message = `associateRoleToAgents-> ${err.message}`;
        throw err;
    }
};

export {
    getServices,
    addService,
    editService,
    delService,
    getDepartment,
    addDepartment,
    editDepartment,
    delDepartment,
    getRole,
    addRole,
    editRole,
    delRole,
    getModules,
    addModule,
    editModule,
    delModule,
    addPermission,
    editPermission,
    delPermission,
    associateRoleToAgents,
};
