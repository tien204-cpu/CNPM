// Central image mapping for products. You can map by product id or by slug (name normalized).
// If you prefer local images, put them under `public/images/<slug>.jpg` and reference `/images/<slug>.jpg` here.

type ImgMap = { [key: string]: string }

const BY_ID: ImgMap = {
  // Example: 'prod-123': '/images/margherita.jpg'
}

const BY_SLUG: ImgMap = {
  // Pizza & Italian
  'margherita-pizza': '/images/margherita-pizza.jpg',
  'pepperoni-pizza': '/images/Pepperoni-Pizza.jpg',
  'hawaiian-pizza': '/images/Hawaiian-Pizza.jpg',
  'spaghetti-carbonara': '/images/spaghetti-carbonara.jpg',
  'lasagna': '/images/Italian-Lasagna.jpg',

  // Burger & Fast Food
  'cheeseburger': '/images/cheeseburgers.jpg',
  'double-burger': '/images/double-burger.jpg',
  'fries': '/images/Fries.jpg',
  'coke-soda': '/images/coke.jpg',

  // Japanese
  'sushi-maki': '/images/sushi-maki.jpg',
  'nigiri-set': '/images/NigiriSet.jpg',
  'ramen-miso': '/images/MisoRamen.jpg',
  'chicken-katsu': '/images/Chicken-Katsu.jpg',

  // Vietnamese
  'pho-bo': '/images/pho-bo.jpg',
  'banh-mi-thit': '/images/banhmi.jpg',
  'bun-bo-hue': '/images/bun-bo-hue.jpg',
  'com-tam': '/images/com-tam.jpg',
  'goi-cuon': '/images/goi-cuon.jpg',
  'bun-cha-ha-noi': '/images/bun-cha-ha-noi.jpg',
  'banh-xeo': '/images/banh-xeo.jpg',
  'mi-quang': '/images/mi-quang.jpg',
  'bo-kho-banh-mi': '/images/bo-kho-banh-mi.jpg',
  'hu-tieu-nam-vang': '/images/hu-tieu-nam-vang.jpg',

  // Mexican
  'taco-bo': '/images/taco-thit-bo.jpg',
  'chicken-burrito': '/images/chicken-burrito.jpg',
  'quesadilla': '/images/quesadilla.jpg',

  // Chicken / Steak
  'ga-ran': '/images/ga-ran.jpg',
  'steak-bit-tet': '/images/bit-tet.jpg',

  // Thai / Asian
  'pad-thai': '/images/pad-thai.jpg',
  'com-chien-duong-chau': '/images/com_chien_duong_chau.jpg',

  // Salad & Drinks & Desserts
  'caesar-salad': '/images/caesar-salad.jpg',
  'greek-salad': '/images/greek-salad.jpg',
  'tra-sua-tran-chau': '/images/tra-sua-tran-chau.jpg',
  'nuoc-cam-ep': '/images/nuoc-cam-ep.jpg',
  'che-ba-mau': '/images/che-ba-mau.jpg',
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
