import d from 'dompurify';
import { body, check, query } from 'express-validator';

const opearotList = ['contains', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin'];
const directionType = ['asc', 'desc'];
const pagesTypes = ['customers', 'products', 'transactions', 'communicationProducts'];
const limitOptions = [5, 10, 15, 20, 25, 50];
// const dateFormat = ['created_on'];

const customValueValidator = (el) => {
    if (el.operator === 'in' && !Array.isArray(el.value)) {
        throw new Error('Value must be an array when the is "in"');
    }
    // If the validation passes, return true
    return true;
};

const customValueValidator1 = (el) => {
    if (el.operator !== 'in' && el.operator !== 'nin' && Array.isArray(el.value)) {
        throw new Error('The value cannot be an array with this operator');
    }
    // If the validation passes, return true
    return true;
};
function searchValidator() {
    return [
        query('module')
            .isIn(pagesTypes)
            .withMessage('invalid operator')
            .exists()
            .withMessage(1002), // Required field
        query('columns')
            .optional()
            .isArray()
            .withMessage(1012),
        query('filters')
            .optional()
            .isArray()
            .withMessage(1012),
        body('filters.*.col', 1003)// Must be non-numeric
            .optional().not().isNumeric(),
        check('filters.*.operator')
            .isIn(opearotList)
            .withMessage('invalid operator'),
        check('filters.*')
            .custom(customValueValidator)
            .withMessage('Value must be an array when the operator is "in".')
            .custom(customValueValidator1)
            .withMessage('The value cannot be an array with this operator'),
        check('sort.direction')
            .optional()
            .isIn(directionType)
            .withMessage('invalid operator'),
        check('limit')
            .optional()
            .isIn(limitOptions)
            .withMessage('Amount of records to view is incorrect, possible amounts of records: 5,10,20,25,50'),
    ];
}

function saveSearchValidator() {
    return [
        check('module')
            .isIn(pagesTypes)
            .withMessage('invalid field')
            .exists()
            .withMessage(1002), // Required field
        check('searchId')
            .if((value, { req }) => ['DELETE'].includes(req.method))
            .isNumeric()
            .withMessage(1008),
        body('query')
            .if((value, { req }) => ['POST'].includes(req.method))
            .isString()
            .withMessage(1003), // Must be non-numeric
    ];
}

function colsSearchValidator() {
    return [
        check('page')
            .exists()
            .withMessage(1002) // Required field
            .not()
            .isNumeric()
            .withMessage(1008)
            .customSanitizer((value) => {
                // sanitize
                const a = d.sanitize(value);
                return a;
            }),
    ];
}

function quickSearchValidator() {
    return [
        query('search')
            .exists()
            .withMessage(1002) // Required field
            .isString()
            .withMessage(1003)// The type is not suitable
            .isLength({ min: 3 })
            .withMessage('length must be greater than 2 characters'), // Invalid length
    ];
}

function parseSearchQueryParameter(req, res, next) {
    const module = req.query.module ? req.query.module : undefined;
    let columns = [];
    let allColumn = [];
    switch (module) {
    case 'customers':
        columns = ['first_name', 'last_name', 'customer_name', 'contact_phone', 'national_id', 'main_email'];
        allColumn = ['serch_by', 'customer_name', 'contact_phone', 'national_id', 'first_name', 'last_name', 'main_email', 'status', 'date_of_birth', 'city_name', 'effective_date_to', 'effective_date_from'];
        break;
    case 'products':
        columns = ['p_name', 'product_id', 'category_id', 'description', 'specifications'];
        allColumn = ['search_by', 'p_name', 'description', 'product_id', 'status', 'hlr_id', 'p_created_by', 'category_id', 'category_name', 'c_created_by',
            'main_category_id', 'seq_search', 'text_1', 'text_2', 'num_1', 'num_2', 'effective_date_from', 'specifications'];
        break;
    case 'transactions':
        columns = ['id', 'entity_source', 'entity_target', 'internal_reference', 'transaction_type', 'amount', 'created_on', 'invoice_number', 'product_types', 'original_amount', 'original_currency', 'subscriber_id'];
        allColumn = ['search_by', 'transaction_method', 'action_customer_id', 'entity_source', 'customer_id', 'entity_target',
            'internal_reference', 'transaction_type', 'amount', 'created_on', 'beneficiary_reference', 'reason_free_text', 'total_payments',
            'related_stock', 'invoice_number', 'seq_search', 'affected_date_from', 'product_types', 'source_cust_pk_id',
            'target_cust_pk_id', 'transaction_type_en', 'original_amount', 'original_currency', 'subscriber_id'];
        break;
    case 'communicationProducts':
        columns = ['id', 'country', 'voice', 'sms', 'data'];
        allColumn = ['id', 'product_name', 'product_id', 'price', 'in_stock', 'days', 'voice', 'sms', 'data', 'categories', 'country', 'statuses', 'iso_code'];
        break;
    default:
        break;
    }
    let filters = req.query.filters ? JSON.parse(req.query.filters) : [];
    filters = filters.map((filter) => {
        if (allColumn.includes(Object.keys(filter)[0].split('.')[0])) {
            let [col, operator] = Object.keys(filter)[0].split('.');
            const value = filter[Object.keys(filter)[0]];
            if (col === 'country') col = 'country_code';
            if (col === 'categories') col = 'category_id';
            if (col === 'statuses') col = 'status';
            if (col === 'created_on') col = 'trunc(created_on)';
            return { col, operator, value };
        }
        return false;
    }).filter((el) => el !== false);
    const sort = req.query.sort ? { col: req.query.sort.split(':')[0], direction: req.query.sort.split(':')[1] } : null;
    if (sort !== null && sort.col === 'country' && module === 'communicationProducts') {
        sort.col = 'country_name_he';
    }

    columns = req.query.columns ? req.query.columns.split(',') : columns;
    if (!columns.includes('id') && module === 'communicationProducts') {
        columns.push('id');
    }

    req.query = {
        filters,
        columns,
        offset: req.query.offset ? req.query.offset : 0,
        limit: req.query.limit ? req.query.limit : 10,
        sort,
        module,
    };
    next();
}

export {
    searchValidator,
    quickSearchValidator,
    colsSearchValidator,
    parseSearchQueryParameter,
    saveSearchValidator,
};
