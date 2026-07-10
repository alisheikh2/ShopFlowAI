require("dotenv").config();

const connectDB = require("./src/database/connectDB");
const Category = require("./src/models/category.model");
const Product = require("./src/models/product.model");
const User = require("./src/models/user.model");

const seed = async () => {
  try {
    await connectDB();

    console.log("✅ Database connected");

    const admin = await User.findOne({ role: "admin" });

    if (!admin) {
      throw new Error("Admin user not found");
    }

    console.log("Admin:", admin.name);

    console.log("🗑️ Deleting existing products...");
    await Product.deleteMany();

    console.log("🗑️ Deleting existing categories...");
    await Category.deleteMany();

    console.log("✅ Existing data deleted");

    const categoryData = [
  {
    name: "Smartphones",
    slug: "smartphones",
    description: "Latest smartphones from top brands",
  },
  {
    name: "Laptops",
    slug: "laptops",
    description: "High-performance laptops",
  },
  {
    name: "Tablets",
    slug: "tablets",
    description: "Tablets for work and entertainment",
  },
  {
    name: "Smartwatches",
    slug: "smartwatches",
    description: "Wearable smart devices",
  },
  {
    name: "Headphones",
    slug: "headphones",
    description: "Wireless and wired headphones",
  },
  {
    name: "Gaming",
    slug: "gaming",
    description: "Gaming consoles and accessories",
  },
  {
    name: "Cameras",
    slug: "cameras",
    description: "Professional cameras and lenses",
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Tech accessories and gadgets",
  },
];

const categories = await Category.insertMany(
  categoryData.map((category) => ({
    ...category,
    createdBy: admin._id,
  }))
);

console.log(`✅ ${categories.length} categories created`);

const categoryMap = {};

categories.forEach((category) => {
  categoryMap[category.slug] = category._id;
});

const products = [
  // =========================
  // Smartphones
  // =========================
  {
    name: "iPhone 16 Pro Max",
    description: "Apple flagship smartphone with A18 Pro chip and titanium design.",
    price: 489999,
    discountPrice: 469999,
    stock: 18,
    brand: "Apple",
    category: categoryMap.smartphones,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Samsung Galaxy S25 Ultra",
    description: "Premium Android flagship with S Pen and AI features.",
    price: 459999,
    discountPrice: 439999,
    stock: 20,
    brand: "Samsung",
    category: categoryMap.smartphones,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Google Pixel 10 Pro",
    description: "Google flagship phone with AI-powered camera.",
    price: 359999,
    discountPrice: 344999,
    stock: 14,
    brand: "Google",
    category: categoryMap.smartphones,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "OnePlus 14",
    description: "Smooth OxygenOS flagship with Snapdragon processor.",
    price: 269999,
    discountPrice: 254999,
    stock: 22,
    brand: "OnePlus",
    category: categoryMap.smartphones,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Xiaomi 16 Ultra",
    description: "Leica-powered flagship camera smartphone.",
    price: 299999,
    discountPrice: 284999,
    stock: 17,
    brand: "Xiaomi",
    category: categoryMap.smartphones,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Nothing Phone 4",
    description: "Minimal transparent smartphone with Glyph interface.",
    price: 214999,
    discountPrice: 204999,
    stock: 25,
    brand: "Nothing",
    category: categoryMap.smartphones,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },

  // =========================
  // Laptops
  // =========================
  {
    name: "MacBook Pro M4",
    description: "Apple professional laptop with M4 chip.",
    price: 689999,
    discountPrice: 659999,
    stock: 10,
    brand: "Apple",
    category: categoryMap.laptops,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Dell XPS 16",
    description: "Premium Windows ultrabook.",
    price: 539999,
    discountPrice: 514999,
    stock: 9,
    brand: "Dell",
    category: categoryMap.laptops,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "ASUS ROG Zephyrus G16",
    description: "Gaming laptop with RTX graphics.",
    price: 629999,
    discountPrice: 599999,
    stock: 7,
    brand: "ASUS",
    category: categoryMap.laptops,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Lenovo ThinkPad X1 Carbon",
    description: "Business ultrabook for professionals.",
    price: 469999,
    discountPrice: 449999,
    stock: 12,
    brand: "Lenovo",
    category: categoryMap.laptops,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "HP Spectre x360",
    description: "Convertible premium laptop.",
    price: 429999,
    discountPrice: 409999,
    stock: 11,
    brand: "HP",
    category: categoryMap.laptops,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Acer Swift X",
    description: "Slim productivity laptop.",
    price: 279999,
    discountPrice: 264999,
    stock: 16,
    brand: "Acer",
    category: categoryMap.laptops,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },

  // =========================
  // Tablets
  // =========================
  {
    name: "iPad Pro M4 13",
    description: "Professional Apple tablet.",
    price: 399999,
    discountPrice: 384999,
    stock: 12,
    brand: "Apple",
    category: categoryMap.tablets,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Samsung Galaxy Tab S10 Ultra",
    description: "Large premium Android tablet.",
    price: 349999,
    discountPrice: 334999,
    stock: 14,
    brand: "Samsung",
    category: categoryMap.tablets,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "OnePlus Pad 2",
    description: "Powerful Android productivity tablet.",
    price: 169999,
    discountPrice: 159999,
    stock: 20,
    brand: "OnePlus",
    category: categoryMap.tablets,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Xiaomi Pad 7",
    description: "Affordable Android tablet.",
    price: 139999,
    discountPrice: 129999,
    stock: 18,
    brand: "Xiaomi",
    category: categoryMap.tablets,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Lenovo Tab Extreme",
    description: "Large multimedia tablet.",
    price: 239999,
    discountPrice: 224999,
    stock: 9,
    brand: "Lenovo",
    category: categoryMap.tablets,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Huawei MatePad Pro",
    description: "Premium Huawei productivity tablet.",
    price: 219999,
    discountPrice: 204999,
    stock: 8,
    brand: "Huawei",
    category: categoryMap.tablets,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },

  // =========================
  // Smartwatches
  // =========================
  {
    name: "Apple Watch Ultra 3",
    description: "Rugged smartwatch for professionals.",
    price: 289999,
    discountPrice: 274999,
    stock: 15,
    brand: "Apple",
    category: categoryMap.smartwatches,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Samsung Galaxy Watch Ultra",
    description: "Premium WearOS smartwatch.",
    price: 189999,
    discountPrice: 179999,
    stock: 18,
    brand: "Samsung",
    category: categoryMap.smartwatches,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Google Pixel Watch 3",
    description: "Google WearOS smartwatch.",
    price: 159999,
    discountPrice: 149999,
    stock: 14,
    brand: "Google",
    category: categoryMap.smartwatches,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Garmin Fenix 8",
    description: "Adventure GPS smartwatch.",
    price: 269999,
    discountPrice: 254999,
    stock: 10,
    brand: "Garmin",
    category: categoryMap.smartwatches,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Amazfit Balance",
    description: "Health-focused smartwatch.",
    price: 89999,
    discountPrice: 82999,
    stock: 20,
    brand: "Amazfit",
    category: categoryMap.smartwatches,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Huawei Watch GT 5",
    description: "Elegant smartwatch with long battery life.",
    price: 99999,
    discountPrice: 92999,
    stock: 16,
    brand: "Huawei",
    category: categoryMap.smartwatches,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },

  // =========================
  // Headphones
  // =========================
  {
    name: "AirPods Pro 3",
    description: "Premium ANC wireless earbuds.",
    price: 89999,
    discountPrice: 84999,
    stock: 30,
    brand: "Apple",
    category: categoryMap.headphones,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Sony WH-1000XM6",
    description: "Industry-leading noise cancelling headphones.",
    price: 119999,
    discountPrice: 112999,
    stock: 15,
    brand: "Sony",
    category: categoryMap.headphones,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Bose QuietComfort Ultra",
    description: "Premium wireless headphones.",
    price: 114999,
    discountPrice: 109999,
    stock: 12,
    brand: "Bose",
    category: categoryMap.headphones,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Nothing Ear 3",
    description: "Transparent ANC earbuds.",
    price: 44999,
    discountPrice: 41999,
    stock: 25,
    brand: "Nothing",
    category: categoryMap.headphones,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Samsung Galaxy Buds 4 Pro",
    description: "Premium Samsung earbuds.",
    price: 54999,
    discountPrice: 51999,
    stock: 22,
    brand: "Samsung",
    category: categoryMap.headphones,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "JBL Live Beam 3",
    description: "Wireless ANC earbuds.",
    price: 39999,
    discountPrice: 36999,
    stock: 28,
    brand: "JBL",
    category: categoryMap.headphones,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },

  // =========================
  // Gaming
  // =========================
  {
    name: "PlayStation 5 Pro",
    description: "Sony next-generation gaming console.",
    price: 269999,
    discountPrice: 259999,
    stock: 10,
    brand: "Sony",
    category: categoryMap.gaming,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Xbox Series X",
    description: "Microsoft flagship console.",
    price: 219999,
    discountPrice: 209999,
    stock: 12,
    brand: "Microsoft",
    category: categoryMap.gaming,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Nintendo Switch 2",
    description: "Portable hybrid gaming console.",
    price: 179999,
    discountPrice: 169999,
    stock: 18,
    brand: "Nintendo",
    category: categoryMap.gaming,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "ASUS ROG Ally X",
    description: "Windows gaming handheld.",
    price: 249999,
    discountPrice: 239999,
    stock: 9,
    brand: "ASUS",
    category: categoryMap.gaming,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Logitech G Pro X Keyboard",
    description: "Mechanical gaming keyboard.",
    price: 49999,
    discountPrice: 46999,
    stock: 30,
    brand: "Logitech",
    category: categoryMap.gaming,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Razer DeathAdder V4",
    description: "Professional gaming mouse.",
    price: 24999,
    discountPrice: 22999,
    stock: 35,
    brand: "Razer",
    category: categoryMap.gaming,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },

  // =========================
  // Cameras
  // =========================
  {
    name: "Sony Alpha A7 V",
    description: "Full-frame mirrorless camera.",
    price: 749999,
    discountPrice: 719999,
    stock: 6,
    brand: "Sony",
    category: categoryMap.cameras,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Canon EOS R6 Mark II",
    description: "Professional hybrid camera.",
    price: 639999,
    discountPrice: 609999,
    stock: 8,
    brand: "Canon",
    category: categoryMap.cameras,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Nikon Z8",
    description: "High-end mirrorless camera.",
    price: 819999,
    discountPrice: 789999,
    stock: 5,
    brand: "Nikon",
    category: categoryMap.cameras,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Fujifilm X100VI",
    description: "Premium compact camera.",
    price: 469999,
    discountPrice: 449999,
    stock: 9,
    brand: "Fujifilm",
    category: categoryMap.cameras,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "DJI Osmo Pocket 4",
    description: "Compact creator camera.",
    price: 199999,
    discountPrice: 189999,
    stock: 14,
    brand: "DJI",
    category: categoryMap.cameras,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "GoPro Hero 14 Black",
    description: "Action camera for adventures.",
    price: 159999,
    discountPrice: 149999,
    stock: 18,
    brand: "GoPro",
    category: categoryMap.cameras,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },

  // =========================
  // Accessories
  // =========================
  {
    name: "Apple MagSafe Charger",
    description: "Official magnetic wireless charger.",
    price: 17999,
    discountPrice: 15999,
    stock: 45,
    brand: "Apple",
    category: categoryMap.accessories,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Anker 737 Power Bank",
    description: "High-capacity fast charging power bank.",
    price: 34999,
    discountPrice: 31999,
    stock: 26,
    brand: "Anker",
    category: categoryMap.accessories,
    images: [],
    isFeatured: true,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Samsung 45W Charger",
    description: "Super fast charging adapter.",
    price: 12999,
    discountPrice: 11999,
    stock: 40,
    brand: "Samsung",
    category: categoryMap.accessories,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "UGREEN USB-C Hub",
    description: "Multi-port USB-C docking hub.",
    price: 18999,
    discountPrice: 16999,
    stock: 34,
    brand: "UGREEN",
    category: categoryMap.accessories,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Logitech MX Master 4",
    description: "Premium productivity mouse.",
    price: 39999,
    discountPrice: 37999,
    stock: 21,
    brand: "Logitech",
    category: categoryMap.accessories,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
  {
    name: "Belkin 3-in-1 Wireless Charger",
    description: "Wireless charging station for Apple devices.",
    price: 49999,
    discountPrice: 46999,
    stock: 15,
    brand: "Belkin",
    category: categoryMap.accessories,
    images: [],
    isFeatured: false,
    isPublished: true,
    createdBy: admin._id,
  },
];




const productImagePools = {
  smartphones: [
    "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=900&q=85",
  ],
  laptops: [
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=900&q=85",
  ],
  tablets: [
    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?auto=format&fit=crop&w=900&q=85",
  ],
  smartwatches: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=900&q=85",
  ],
  headphones: [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=85",
  ],
  gaming: [
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=900&q=85",
  ],
  cameras: [
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1500634245200-e5245c7574ef?auto=format&fit=crop&w=900&q=85",
  ],
  accessories: [
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=900&q=85",
  ],
};

const getProductCategorySlug = (product) => {
  const match = Object.entries(categoryMap).find(
    ([, categoryId]) => categoryId.toString() === product.category.toString(),
  );

  return match?.[0] || "accessories";
};

const categoryDescriptionCopy = {
  smartphones:
    "Designed for customers who expect speed, premium build quality, excellent cameras, and reliable all-day performance. It is ideal for social media, gaming, productivity, video calls, and everyday multitasking.",
  laptops:
    "Built for professionals, creators, students, and power users who need smooth multitasking, dependable performance, premium visuals, and a comfortable workflow for long sessions.",
  tablets:
    "A versatile device for entertainment, note-taking, browsing, streaming, and productivity. Its portable design makes it useful at home, in class, at work, or while travelling.",
  smartwatches:
    "A smart companion for health tracking, notifications, workouts, and daily productivity. It combines a comfortable wearable design with useful connected features for modern routines.",
  headphones:
    "Made for immersive listening, clear calls, and comfortable daily use. It is suitable for music, meetings, travel, gaming, and focused work sessions.",
  gaming:
    "Created for players who want responsive controls, reliable performance, and an enjoyable gaming experience. It is suitable for competitive play, casual entertainment, and long sessions.",
  cameras:
    "A strong choice for creators, travelers, and professionals who need sharp imaging, dependable handling, and flexible shooting for photos, videos, and content production.",
  accessories:
    "A practical upgrade for daily tech use, designed to improve convenience, charging, connectivity, portability, and productivity without adding unnecessary complexity.",
};

const createProductDescription = (product) => {
  const categorySlug = getProductCategorySlug(product);
  const categoryCopy = categoryDescriptionCopy[categorySlug] || categoryDescriptionCopy.accessories;
  const pricePosition = product.discountPrice > 0 ? "with a competitive discounted price" : "with strong value for its category";

  return `${product.name} by ${product.brand} is a carefully selected ${categorySlug.replace(/-/g, " ")} product ${pricePosition}. ${categoryCopy} The product is listed with reliable stock availability, brand-backed quality, and a clean ShopFlowAI buying experience that includes secure checkout, order updates, and professional invoice support. Whether you are upgrading your personal setup or buying for work, this item is positioned to deliver dependable performance, modern styling, and practical everyday benefits.`;
};

const createProductImage = (product, index) => {
  const categorySlug = getProductCategorySlug(product);
  const pool = productImagePools[categorySlug] || productImagePools.accessories;
  const slug = product.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    public_id: `shopflow/seed/${slug}-${index + 1}`,
    url: pool[index % pool.length],
  };
};

await Product.insertMany(
  products.map((product, index) => ({
    ...product,
    description: createProductDescription(product),
    slug: product.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-"),
    images: [createProductImage(product, index)],
  }))
);

console.log(`✅ ${products.length} products created`);

    console.log("Categories:", await Category.countDocuments());
    console.log("Products:", await Product.countDocuments());
    console.log("Users:", await User.countDocuments());
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
};

seed();
