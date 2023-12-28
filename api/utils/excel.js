import xlsx from 'xlsx';

const exportExcelFile = function (excelData) {
    console.log('excel:', excelData);
    try {
        // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Set up the header row
        const { header } = excelData;// ['Name', 'Age', 'Gender'];

        // Set up the data rows
        const { data } = excelData;

        const rows = [header, ...data];
        const worksheet = xlsx.utils.aoa_to_sheet(rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

        // Save the workbook to an Excel file
        const fileName = excelData.name;
        const filePath = `././uploads/${fileName}.xlsx`;
        xlsx.writeFile(workbook, filePath);
        return filePath;
    } catch (err) {
        err.message = `exportExcelFile-> ${err.message}`;
        console.log('exportExcelFile error ', err.message);
        throw err;
    }
};

const readExcelFile = function (path) {
    try {
        const workbook = xlsx.readFile(path, { raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        return data;
    } catch (err) {
        err.message = `readExcelFile-> ${err.message}`;
        console.log('readExcelFile error ', err.message);
        throw err;
    }
};

export {
    readExcelFile,
    exportExcelFile,
};
