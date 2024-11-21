import { createReadStream, writeFileSync } from "fs";
import csv from "fast-csv";
import { type Product, type ProductVariant } from "./interfaces/products";

async function processCsv(filePath: string, outputFile: string): Promise<void> {
    const products: Product[] = [];
    let currentProduct: Product | null = null;

    const stream = createReadStream(filePath).pipe(
        csv.parse({ headers: true })
    );

    for await (const row of stream) {
        const title = row["Title"];
		const handle = row["Handle"];
        const description = row["Description"];
        const category = row["Category"];
        const type = row["Type"];
        const tags = row["Tags"]
            ? row["Tags"].split(",").map((tag: string) => tag.trim())
            : [];
        const sku = row["Variant SKU"];
        const price = parseFloat(row["Price"]);
        const compareAtPrice = parseFloat(row["Compare At Price"] || "0");
        const image = row["Image"];
        const variantAttributes = buildAttributes(row);
        const metafieldAttributes = parseMetafields(row);

        const attributes = { ...variantAttributes, ...metafieldAttributes };

        if (!currentProduct || currentProduct.handle !== handle) {
            // Push the completed product to the list
            if (currentProduct) {
                products.push(currentProduct);
            }

            // Start a new product
            currentProduct = {
                id: generateUUID(),
                title,
				handle,
                description,
                category,
                type,
                tags,
                variants: [],
            };
        }

        // Add variant to the current product
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
            const metafieldKey = match[1]
                .replace(/^product\.metafields\./, "")
                .toLowerCase();
            attributes[metafieldKey] = row[key];
        }
    });
    return attributes;
}

function generateUUID(): string {
    const str = crypto.randomUUID();
	return str;
}

// Usage Example
processCsv("./data/products_export_1.csv", "./data/products.json")
    .then(() => console.log("CSV processing complete!"))
    .catch((err) => console.error("Error processing CSV:", err));
