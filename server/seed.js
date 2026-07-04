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

await Product.insertMany(
  products.map((product) => ({
    ...product,
    slug: product.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-"),
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
