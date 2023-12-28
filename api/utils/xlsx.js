import xlsx from 'xlsx';

export const readXlsx = () => {
    const workbook = xlsx.readFile('./pt2223332.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    console.log(sheet);
    const data = xlsx.utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: 'dd/mm/yyyy',
    });

    return data.map((obj) => {
        const newObj = {};
        const keys = Object.keys(obj);
        keys.forEach((key, i) => {
            newObj[String.fromCharCode(65 + i)] = obj[key];
        });
        return newObj;
    });
};
