import * as productsModel from '../models/products.js';
import { isEmpty } from '../utils/helper.js';

/* Categories */
// List of all Categories Or a specific Category
const getCategory = async (categoryId = null) => {
    try {
        const data = await productsModel.getCategoriesModel(categoryId);
        if (isEmpty(data)) {
            if (categoryId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 };// There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getCategory-> ${err.message}`;
        throw err;
    }
};

// Add & Edit a Category
const setCategory = async (req) => {
    try {
        req.body.categoryId = req.params.categoryId || null;
        const data = await productsModel.setCategoriesModel(req.body);
        if (isEmpty(data)) return { status: 204, code: 3006 };// There are no records
        if (data.categoryId < 0) return { status: 400, code: 20164 };
        return { status: 201, data };
    } catch (err) {
        err.message = `setCategory-> ${err.message}`;
        throw err;
    }
};

// Delete a specific Category
const deleteCategory = async (categoryId) => {
    try {
        const data = await productsModel.deleteCategoriesModel(categoryId);
        if (isEmpty(data)) return { status: 204, code: data * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteCategory-> ${err.message}`;
        throw err;
    }
};

// List of all Products that belongs to a specific Category
const getCategoryProducts = async (categoryId) => {
    try {
        const data = await productsModel.getCategoryProductsModel(categoryId);
        if (isEmpty(data)) return { status: 204, code: data * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `getCategoryProductsModel-> ${err.message}`;
        throw err;
    }
};

/* Products */
// Get a specific Product (The list of products come from advanced search)
const getProduct = async (productId, agentId, countryCode = null) => {
    try {
        const products = await productsModel.getProductModel(productId, agentId, countryCode);
        if (isEmpty(products)) {
            if (productId) return { status: 404, code: 3006 };
            return { status: 204, code: products * -1 };// There are no records
        }
        if (!products[0].productId) {
            const valuesArray = Object.values(products[0]);
            const firstValue = valuesArray[0];
            return { status: 400, code: firstValue * -1 };
        }

        // data = data[0];
        const data = {};
        data.products = products;
        if (productId) {
            const categories = await productsModel.getProductCategoriesModel(productId);
            data.categories = categories;
            // const rates = await productsModel.getProductRatesModel(req.params.productId);
            // data.rates = rates;
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getProduct-> ${err.message}`;
        throw err;
    }
};

// Delete a specific Product
const deleteProduct = async (productId) => {
    try {
        const data = await productsModel.deleteProductModel(productId);
        if (isEmpty(data) || data.res !== 1) return { status: 204, code: data.res * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteProduct-> ${err.message}`;
        throw err;
    }
};

// Add & Edit a Product
const setProduct = async (req, actionType = 0) => {
    try {
        req.body.productId = req.params.productId;

        let code;
        let counterWallet = 0;
        let counterAgreement = 0;
        let counterRate = 0;

        // Must have Wallet category
        for (const product of req.body.products) {
            if (product.categories && !isEmpty(product.categories)) {
                for (const categoryId of product.categories) {
                    const categoryDetails = await productsModel.getCategortDetailsModel(categoryId);
                    console.log('categoryDetails[0].mainCategoryId: ', categoryDetails[0].mainCategoryId);
                    if (categoryDetails[0] && categoryDetails[0].mainCategoryId === 123) counterWallet++;
                    else if (categoryDetails[0] && categoryDetails[0].mainCategoryId === 164) counterAgreement++;
                    else if (categoryId === 83) counterRate++;
                }
            }
        }
        // counterWallet must be equal 1
        // 83- rates ,164- agreements

        if (counterWallet !== 1) {
            if (counterRate === 1) code = 0; // rate
            else if (counterAgreement === 1) code = 0; // agreement
            else if (counterWallet < 1) code = 3017;
            else if (counterWallet > 1) code = 3018;
        }

        if (code < 0) {
            switch (code) {
            case -1:
                code = 3017; // Product must be associated to a Wallet Category
                break;
            case -2:
                code = 3018; // Product must be associated to a one Wallet Category only
                break;
            }
            return { status: 400, code };
        }

        const data = await productsModel.setProductModel(req.body, actionType);
        if (data < 0) {
            switch (data) {
            case -1:
                code = 20308;
                break;
            case -2:
                code = 20309;
                break;
            case -3:
                code = 20310;
                break;
            default:
                code = data.res * -1;
            }
            return { status: 400, code };
        }
        return { status: 201, data: { data } };
    } catch (err) {
        err.message = `setProduct-> ${err.message}`;
        throw err;
    }
};

// List of all Categories that belongs to a specific Product
const getProductCategories = async (productId) => {
    try {
        const data = await productsModel.getProductCategoriesModel(productId);
        if (isEmpty(data)) { return { status: 204, code: data * -1 }; }// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getProductCategories-> ${err.message}`;
        throw err;
    }
};

// List of all Rates that belongs to a specific Product
const getProductRates = async (productId) => {
    try {
        const data = await productsModel.getProductRatesModel(productId);
        if (isEmpty(data)) { return { status: 204, code: data * -1 }; }// There are no records
        return { status: 200, data };
    } catch (err) {
        err.message = `getProductRates-> ${err.message}`;
        throw err;
    }
};

// List of all Statuses or a specific Status
const getProductStatus = async (statusId = null) => {
    try {
        const data = await productsModel.getProductStatusModel(statusId);
        if (isEmpty(data)) {
            if (statusId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 };// There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getProductStatus-> ${err.message}`;
        throw err;
    }
};

// Add a Status
const addProductStatus = async (req) => {
    try {
        const data = await productsModel.addProductStatusModel(req.description);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 201, data };
    } catch (err) {
        err.message = `addProductStatus-> ${err.message}`;
        throw err;
    }
};

// Delete a Status
const deleteProductStatus = async (statusId) => {
    try {
        const data = await productsModel.deleteProductStatusModel(statusId);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteProductStatus-> ${err.message}`;
        throw err;
    }
};

// List of all getProductNames or a specific getProductName
const getProductNames = async (categoryId, nameId = null) => {
    try {
        const data = await productsModel.getProductNamesModel(categoryId, nameId);
        if (isEmpty(data)) {
            if (nameId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 };// There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getProductNames-> ${err.message}`;
        throw err;
    }
};

// Add a Name
const addProductName = async (main_category_id, req) => {
    try {
        const data = await productsModel.addProductNameModel(main_category_id, req);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 201, data };
    } catch (err) {
        err.message = `addProductName-> ${err.message}`;
        throw err;
    }
};

// Delete a Name
const deleteProductName = async (nameId) => {
    try {
        const data = await productsModel.deleteProductNameModel(nameId);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteProductName-> ${err.message}`;
        throw err;
    }
};

// List of all Manufacturers or a specific Manufacturer
const getProductManufacturer = async (nameId, manufacturerId = null) => {
    try {
        const data = await productsModel.getProductManufacturerModel(nameId, manufacturerId);
        if (isEmpty(data)) {
            if (manufacturerId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 }; // There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getProductManufacturer-> ${err.message}`;
        throw err;
    }
};

// Add a Manufacturer
const addProductManufacturer = async (nameId, req) => {
    try {
        const data = await productsModel.addProductManufacturerModel(nameId, req);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 201, data };
    } catch (err) {
        err.message = `addProductManufacturer-> ${err.message}`;
        throw err;
    }
};

// Delete a Manufacturer
const deleteProductManufacturer = async (manufacturerId) => {
    try {
        const data = await productsModel.deleteProductManufacturerModel(manufacturerId);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteProductManufacturer-> ${err.message}`;
        throw err;
    }
};

// List of all Models or a specific Model
const getProductModels = async (nameId, manufacturerId, modelId = null) => {
    try {
        const data = await productsModel.getProductModelsModel(nameId, manufacturerId, modelId);
        if (isEmpty(data)) {
            if (modelId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 }; // There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getProductModels-> ${err.message}`;
        throw err;
    }
};

// Add a Model
const addProductModel = async (nameId, manufacturerId, req) => {
    try {
        const data = await productsModel.addProductModelModel(nameId, manufacturerId, req);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 201, data };
    } catch (err) {
        err.message = `addProductModel-> ${err.message}`;
        throw err;
    }
};

// Delete a Model
const deleteProductModel = async (modelId) => {
    try {
        const data = await productsModel.deleteProductModelModel(modelId);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteProductModel-> ${err.message}`;
        throw err;
    }
};

// List of all First Sub-Categories
const getProductFirstSubCategory = async (modelId, firstSubCategoryId = null) => {
    try {
        const data = await productsModel.getProductFirstSubCategoryModel(modelId, firstSubCategoryId);
        if (isEmpty(data)) {
            if (firstSubCategoryId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 }; // There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getProductFirstSubCategory-> ${err.message}`;
        throw err;
    }
};

// Add a First Sub-Categories
const addProductFirstSubCategory = async (modelId, req) => {
    try {
        const data = await productsModel.addProductFirstSubCategoryModel(modelId, req);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 201, data };
    } catch (err) {
        err.message = `addProductFirstSubCategory-> ${err.message}`;
        throw err;
    }
};

// Delete a First Sub-Categories
const deleteProductFirstSubCategory = async (firstSubCategory) => {
    try {
        const data = await productsModel.deleteProductFirstSubCategoryModel(firstSubCategory);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteProductFirstSubCategory-> ${err.message}`;
        throw err;
    }
};

// List of all Colors or a specific Color
const getProductColors = async (colorId = null) => {
    try {
        const data = await productsModel.getProductColorsModel(colorId);
        if (isEmpty(data)) {
            if (colorId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 };// There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getProductColors-> ${err.message}`;
        throw err;
    }
};

// Add a Color
const addProductColor = async (req) => {
    try {
        const data = await productsModel.addProductColorModel(req);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 201, data };
    } catch (err) {
        err.message = `addProductColors-> ${err.message}`;
        throw err;
    }
};

// Delete a Color
const deleteProductColors = async (colorId) => {
    try {
        const data = await productsModel.deleteProductColorsModel(colorId);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteProductColors-> ${err.message}`;
        throw err;
    }
};

/* Rates */
// Get all products in a rate or a specific Product in a Rate
const getRateProducts = async (params) => {
    try {
        const data = await productsModel.getRateProductsModel(params.rateId, params.productId);
        if (isEmpty(data)) {
            if (params.productId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 };// There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `deleteProductColors-> ${err.message}`;
        throw err;
    }
};

// Get all Categories in a rate or a specific Category in a Rate
const getRateCategories = async (params) => {
    try {
        const data = await productsModel.getRateCategoriesModel(params.rateId, params.categoryId);
        if (isEmpty(data)) {
            if (params.productId) return { status: 404, code: 3006 };// Not Found
            return { status: 204, code: data * -1 };// There are no records
        }
        return { status: 200, data };
    } catch (err) {
        err.message = `getRateCategories-> ${err.message}`;
        throw err;
    }
};

// Add a Product to a Rate
const setRate = async (req, params) => {
    try {
        const data = await productsModel.setRateModel(req, params);
        if (data.res < 0) return { status: 400, code: data.res * -1 };
        return { status: 201, data };
    } catch (err) {
        err.message = `setRate-> ${err.message}`;
        throw err;
    }
};

export {
    getCategory,
    setCategory,
    deleteCategory,
    getCategoryProducts,
    getProduct,
    deleteProduct,
    setProduct,
    getProductCategories,
    getProductRates,
    getProductStatus,
    addProductStatus,
    deleteProductStatus,
    getProductNames,
    addProductName,
    deleteProductName,
    getProductManufacturer,
    addProductManufacturer,
    deleteProductManufacturer,
    getProductModels,
    addProductModel,
    deleteProductModel,
    getProductFirstSubCategory,
    addProductFirstSubCategory,
    deleteProductFirstSubCategory,
    getProductColors,
    addProductColor,
    deleteProductColors,
    getRateProducts,
    getRateCategories,
    setRate,
};
