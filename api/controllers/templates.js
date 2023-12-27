import { isEmpty } from '../utils/helper.js';
import { getTemplatesModel } from '../models/templates.js';

const getTemplates = async (req) => {
    try {
        const data = await getTemplatesModel(req.params.moduleId);
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data: data[0] };
    } catch (err) {
        err.message = `getTemplates-> ${err.message}`;
        throw err;
    }
};

export {
    getTemplates,
};
