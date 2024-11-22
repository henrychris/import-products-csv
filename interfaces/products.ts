export interface ProductVariant {
    id: string;
    sku: string;
    price: number;
    compareAtPrice: number;
    image: string;
    attributes: Record<string, string>;
}

export interface Product {
    id: string;
    title: string;
    handle: string;
    description: string;
    categoryId: string;
    type: string;
    status: string;
    tags: string[];
    variants: ProductVariant[];
}

export interface Category {
    id: string;
    name: string;
    parentCategoryId: string;
    attributes: Record<string, string>;
}