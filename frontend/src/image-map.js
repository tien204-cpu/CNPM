// Central image mapping for products. You can map by product id or by slug (name normalized).
// If you prefer local images, put them under `public/images/<slug>.jpg` and reference `/images/<slug>.jpg` here.
const BY_ID = {
// Example: 'prod-123': '/images/margherita.jpg'
};
const BY_SLUG = {
    // map common dish names to curated images or remote URLs
    'margherita-pizza': 'https://loremflickr.com/640/360/pizza,margherita',
    'pepperoni-pizza': 'https://loremflickr.com/640/360/pepperoni,pizza',
    'cheeseburger': 'https://loremflickr.com/640/360/burger,cheeseburger',
    'sushi-roll': 'https://loremflickr.com/640/360/sushi,roll',
    'caesar-salad': 'https://loremflickr.com/640/360/salad,caesar',
    'spaghetti-carbonara': 'https://loremflickr.com/640/360/pasta,carbonara',
};
function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
export function getMappedImage(args) {
    const id = args.id;
    const name = args.name;
    if (id && BY_ID[id])
        return BY_ID[id];
    if (name) {
        const s = slugify(name);
        if (BY_SLUG[s])
            return BY_SLUG[s];
    }
    return null;
}
// Allow adding dynamic mappings at runtime from a products API.
export function setDynamicMapping(products) {
    for (const p of products) {
        // prefer explicit imageUrl from product
        if (p.imageUrl) {
            BY_ID[p.id] = p.imageUrl;
            continue;
        }
        // try slug mapping
        const s = slugify(p.name || '');
        if (s && BY_SLUG[s]) {
            BY_ID[p.id] = BY_SLUG[s];
            continue;
        }
        // fallback deterministic picsum so same product keeps same image
        const seed = encodeURIComponent((p.name || p.id).toLowerCase().replace(/\s+/g, '-'));
        BY_ID[p.id] = `https://picsum.photos/seed/${seed}/640/360`;
    }
}
export default {
    getMappedImage,
};
