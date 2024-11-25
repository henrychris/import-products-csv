import { createReadStream, readFileSync, writeFileSync } from "fs";
import csv from "fast-csv";
import { type Category, type Product } from "./interfaces/products";

async function processCsv(filePath: string, outputFile: string): Promise<void> {
    const products: Product[] = [];
    let currentProduct: Product | null = null;
    let lastOptionNames: Record<string, string> = {};
    let lastMetafields: Record<string, string> = {};

    const categories = loadCategories("./data/seeded_categories.json");
    const stream = createReadStream(filePath).pipe(
        csv.parse({ headers: true })
    );

    for await (const row of stream) {
        const title = row["Title"];
        const handle = row["Handle"];
        const description = row["Description"];
        const categoryPath = row["Product Category"];
        const type = row["Type"];
        const tags = row["Tags"]
            ? row["Tags"].split(",").map((tag: string) => tag.trim())
            : [];
        const sku = row["Variant SKU"];
        const price = parseFloat(row["Price"]);
        const compareAtPrice = parseFloat(row["Compare At Price"] || "0");
        const image = row["Image"];
        const status = row["Status"];

        // Get category ID from the category name
        const categoryName = getCategoryName(categoryPath);
        const categoryId = getCategoryIdByName(categoryName, categories);

        // If the current row defines new Option Names, update the lastOptionNames
        const currentOptionNames = buildAttributes(row);
        if (Object.keys(currentOptionNames).length > 0) {
            lastOptionNames = { ...currentOptionNames };
        }

        // Inherit the last known option names if not explicitly defined
        const variantAttributes = { ...lastOptionNames };

        // If the current row defines new Metafield values, update the lastMetafields
        const currentMetafields = parseMetafields(row);
        if (Object.keys(currentMetafields).length > 0) {
            lastMetafields = { ...currentMetafields };
        }

        // Combine variant attributes with inherited metafields
        const attributes = { ...variantAttributes, ...lastMetafields };

        // Start a new product if the title changes
        if (!currentProduct || currentProduct.handle !== handle) {
            if (currentProduct) {
                products.push(currentProduct);
            }

            currentProduct = {
                id: generateUUID(),
                title,
                handle,
                description,
                categoryId: categoryId || "gid://shopify/TaxonomyCategory/na", // uncategorised if not found
                type,
                tags,
                status,
                variants: [],
            };
        }

        // Add the current variant to the current product
        if (currentProduct) {
            currentProduct.variants.push({
                id: generateUUID(),
                sku,
                price,
                compareAtPrice,
                image,
                attributes,
            });
        }
    }

    // Save the last product
    if (currentProduct) {
        products.push(currentProduct);
    }

    // Save products to a JSON file
    writeFileSync(outputFile, JSON.stringify(products, null, 2), "utf8");
    console.log(
        `Processed ${products.length} products and saved to ${outputFile}`
    );
}

// problem
// the exported data only includes attribute names for the main product
// for variants, only the values are included

function buildAttributes(row: any): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (let i = 1; i <= 3; i++) {
        const name = row[`Option${i} Name`];
        const value = row[`Option${i} Value`];
        if (name && value) {
            attributes[name.toLowerCase()] = value;
        }
    }
    return attributes;
}

function parseMetafields(row: any): Record<string, string> {
    const attributes: Record<string, string> = {};
    Object.keys(row).forEach((key) => {
        const match = key.match(/\((product\.metafields\..+)\)/);
        if (match && row[key]) {
            // Extract the visible name (e.g., 'Brand') as the key
            const visibleName = key.split("(")[0].trim();
            attributes[visibleName.toLowerCase()] = row[key];
        }
    });
    return attributes;
}

function generateUUID(): string {
    const str = crypto.randomUUID();
    return str;
}

function loadCategories(filePath: string): Category[] {
    try {
        const data = readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Error loading categories JSON:", err);
        return [];
    }
}

function getCategoryIdByName(
    name: string,
    categories: Category[]
): string | null {
    const category = categories.find((c) => c.name === name);
    return category ? category.id : null;
}

function getCategoryName(path: string) {
    const levels = path.split(">").map((x) => x.trim());
    return levels[levels.length - 1];
}

// Usage Example
processCsv("./data/products_export_1.csv", "./data/products.json")
    .then(() => console.log("CSV processing complete!"))
    .catch((err) => console.error("Error processing CSV:", err));
