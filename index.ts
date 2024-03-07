import * as cheerio from "cheerio";
import type { WaitForSelectorOptions } from "puppeteer";
import puppeteer from "puppeteer";

const waitForSelectorOptions = {
  visible: true,
  timeout: 1000,
};

const itemFinder = (
  row: cheerio.Cheerio<cheerio.Element>,
  selector: string
) => {
  return row.find(selector).text().trim();
};

const pptrShell = async (selectedOptionValue: string) => {
  //launching and opening our page,
  console.log({ selectedOptionValue });

  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const waitForSelector = async (
    selector: string,
    options?: WaitForSelectorOptions
  ) => {
    try {
      return await page.waitForSelector(
        selector,
        options ? options : waitForSelectorOptions
      );
    } catch (error) {
      console.log(error);
    }
  };

  const waitForList = async () =>
    await page.locator("#cb_all_cb_province_DDD_PW-1").wait();

  await page.goto("https://www.turkiyeshell.com/pompatest/");
  const inputSelector = "#cb_all_cb_province_I";
  const selectInput = await waitForSelector(inputSelector);
  await selectInput?.hover();
  await selectInput?.click();

  await waitForList();
  const newProvinces = await page.evaluate(() => {
    return {
      html: document.querySelector("#cb_all_cb_province_DDD_L_LBT")?.innerHTML,
    };
  });
  await waitForList();

  const $provinces = cheerio.load(newProvinces.html as string, {}, false);
  const options = $provinces("td.dxeListBoxItem");
  const parsedOptions = options
    .map((index, element) => ({
      id: $provinces(element).attr("id"),
      value: $provinces(element).text(),
    }))
    .get();

  const selectedOption = parsedOptions.find(
    (option) => option.value === selectedOptionValue
  );

  const optionSelector = `#${selectedOption?.id}`;
  const selectOption = await page.$(optionSelector);
  await selectOption?.click();
  await page.click(optionSelector, {
    clickCount: 1,
    delay: 50,
  });

  await page.waitForResponse("https://www.turkiyeshell.com/pompatest/");
  await page.waitForSelector("#cb_all_grdPrices_DXMainTable");

  const table = await page.evaluate(() => {
    return {
      html: document.querySelector("#cb_all_grdPrices_DXMainTable")?.innerHTML,
    };
  });

  const $table = cheerio.load(table.html as string, {}, false);

  const lpg = $table("#cb_all_grdPrices_DXDataRow0 > td:nth-child(10)")
    .text()
    .trim();

  const jsonData: any = [];

  const pricesTable = $table("tbody tr:not(:first-child)");
  pricesTable.each((index, element) => {
    const row = $table(element);
    const city = itemFinder(row, "td.ClassTxt1:first-child");
    const unleadedGasoline = itemFinder(row, "td:nth-child(2)");
    const unleadedGasolineOther = itemFinder(row, "td:nth-child(3)");
    const diesel = itemFinder(row, "td:nth-child(4)");
    const dieselOther = itemFinder(row, "td:nth-child(5)");
    const gazYagi = itemFinder(row, "td:nth-child(6)");
    const kalyak = itemFinder(row, "td:nth-child(7)");
    const yuksekKukurtfuelOil = itemFinder(row, "td:nth-child(8)");
    const fuelOil = itemFinder(row, "td:nth-child(9)");

    const obj = {
      fuelCompany: "SHELL",
      city,
      unleadedGasoline,
      unleadedGasolineOther,
      diesel,
      dieselOther,
      gazYagi,
      kalyak,
      yuksekKukurtfuelOil,
      fuelOil,
      lpg,
    };
    jsonData.push(obj);
  });
  await browser.close();

  jsonData.shift();

  return jsonData;
};

await pptrShell("IZMIR");
