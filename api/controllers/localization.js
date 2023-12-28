import { isEmpty } from '../utils/helper.js';
import { customerFinanceLanguagesModel, systemLanguagesModel } from '../models/localization.js';

const customerFinanceLanguages = async () => {
    try {
        const data = await customerFinanceLanguagesModel();
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `customerFinanceLanguages-> ${err.message}`;
        throw err;
    }
};

const systemLanguages = async () => {
    try {
        const data = await systemLanguagesModel();
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `systemLanguagesLanguages-> ${err.message}`;
        throw err;
    }
};

export {
    customerFinanceLanguages,
    systemLanguages,
};
