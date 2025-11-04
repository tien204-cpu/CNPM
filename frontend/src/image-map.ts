// Central image mapping for products. You can map by product id or by slug (name normalized).
// If you prefer local images, put them under `public/images/<slug>.jpg` and reference `/images/<slug>.jpg` here.

type ImgMap = { [key: string]: string }

const BY_ID: ImgMap = {
  // Example: 'prod-123': '/images/margherita.jpg'
}

const BY_SLUG: ImgMap = {
  // Pizza & Italian
  'margherita-pizza': 'https://images.unsplash.com/photo-1548365328-9f547fb0953c?auto=format&fit=crop&w=900&q=60',
  'pepperoni-pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=60',
  'hawaiian-pizza': 'https://images.unsplash.com/photo-1548365327-8f1f2b33d8b1?auto=format&fit=crop&w=900&q=60',
  'spaghetti-carbonara': 'https://images.unsplash.com/photo-1521389508051-d7ffb5dc8bbf?auto=format&fit=crop&w=900&q=60',
  'lasagna': 'https://images.unsplash.com/photo-1623428187969-5da2dcea5c25?auto=format&fit=crop&w=900&q=60',

  // Burger & Fast Food
  'cheeseburger': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=60',
  'double-burger': 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=900&q=60',
  'fries': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=60',
  'coke-soda': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=900&q=60',

  // Japanese
  'sushi-maki': 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=900&q=60',
  'nigiri-set': 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=60',
  'ramen-miso': 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=60',
  'chicken-katsu': 'https://images.unsplash.com/photo-1617692855027-7f14c7a19dfb?auto=format&fit=crop&w=900&q=60',

  // Vietnamese
  'pho-bo': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=60',
  'banh-mi-thit': 'https://images.unsplash.com/photo-1604908176997-4315800de8be?auto=format&fit=crop&w=900&q=60',
  'bun-bo-hue': 'https://images.unsplash.com/photo-1593062096033-9a26b09456f5?auto=format&fit=crop&w=900&q=60',
  'com-tam': 'https://images.unsplash.com/photo-1617195737494-8c31fe6df024?auto=format&fit=crop&w=900&q=60',
  'goi-cuon': 'https://images.unsplash.com/photo-1604908554054-5ccef72e99de?auto=format&fit=crop&w=900&q=60',
  'bun-cha-ha-noi': 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=900&q=60',
  'banh-xeo': 'https://images.unsplash.com/photo-1625944525268-8f6fe57a19f9?auto=format&fit=crop&w=900&q=60',
  'mi-quang': 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&w=900&q=60',
  'bo-kho-banh-mi': 'https://images.unsplash.com/photo-1625944525301-8c1f57a19f9c?auto=format&fit=crop&w=900&q=60',
  'hu-tieu-nam-vang': 'https://images.unsplash.com/photo-1569718212165-3fefc33b1a5a?auto=format&fit=crop&w=900&q=60',

  // Mexican
  'taco-bo': 'https://images.unsplash.com/photo-1601050690597-9d43e6234943?auto=format&fit=crop&w=900&q=60',
  'chicken-burrito': 'https://images.unsplash.com/photo-1599974579688-8dbdd7a93f5f?auto=format&fit=crop&w=900&q=60',
  'quesadilla': 'https://images.unsplash.com/photo-1615873968403-89e72eb38c80?auto=format&fit=crop&w=900&q=60',

  // Chicken / Steak
  'ga-ran': 'https://images.unsplash.com/photo-1604908554049-1f1d2bcb1a8a?auto=format&fit=crop&w=900&q=60',
  'steak-bit-tet': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=60',

  // Thai / Asian
  'pad-thai': 'https://images.unsplash.com/photo-1600628421205-4f68a6f2ef14?auto=format&fit=crop&w=900&q=60',
  'com-chien-duong-chau': 'https://images.unsplash.com/photo-1590758036263-9f1b5d3b5a61?auto=format&fit=crop&w=900&q=60',

  // Salad & Drinks & Desserts
  'caesar-salad': 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b5?auto=format&fit=crop&w=900&q=60',
  'greek-salad': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=60',
  'tra-sua-tran-chau': 'https://images.unsplash.com/photo-1586201375761-83865001e31b?auto=format&fit=crop&w=900&q=60',
  'nuoc-cam-ep': 'https://images.unsplash.com/photo-1571076172156-7a5b26f61f4a?auto=format&fit=crop&w=900&q=60',
  'che-ba-mau': 'https://images.unsplash.com/photo-1604908553651-1e9ebcca40fe?auto=format&fit=crop&w=900&q=60',
}

function slugify(name: string) {
  const n = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return n
}

export function getMappedImage(args: { id?: string; name?: string } | { id: string } | { name: string }) {
  const id = (args as any).id
  const name = (args as any).name
  if (id && BY_ID[id]) return BY_ID[id]
  if (name) {
    const s = slugify(name)
    if (BY_SLUG[s]) return BY_SLUG[s]
  }
  return null
}

// Allow adding dynamic mappings at runtime from a products API.
export function setDynamicMapping(products: Array<{ id: string; name?: string; imageUrl?: string }>) {
  for (const p of products) {
    // prefer explicit imageUrl from product
    if (p.imageUrl) {
      BY_ID[p.id] = p.imageUrl
      continue
    }
    // try slug mapping
    const s = slugify(p.name || '')
    if (s && BY_SLUG[s]) {
      BY_ID[p.id] = BY_SLUG[s]
      continue
    }
    // fallback deterministic picsum so same product keeps same image
    const seed = encodeURIComponent((p.name || p.id).toLowerCase().replace(/\s+/g, '-'))
    BY_ID[p.id] = `https://picsum.photos/seed/${seed}/640/360`
  }
}

export default {
  getMappedImage,
}
