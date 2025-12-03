const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client for product service
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/foodfast'
    }
  }
});

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu nhà hàng và món ăn...\n');

  // Tạo nhà hàng Việt
  const vietnameseRestaurant = await prisma.restaurant.create({
    data: {
      name: 'Nhà Hàng Việt Nam Truyền Thống',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      lat: 10.7769,
      lng: 106.7009,
    }
  });
  console.log('✅ Đã tạo nhà hàng Việt:', vietnameseRestaurant.name);

  // Tạo 10 món Việt
  const vietnameseDishes = [
    {
      name: 'Phở Bò',
      price: 45000,
      description: 'Phở bò truyền thống với nước dùng thơm ngon, thịt bò mềm và bánh phở dai',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=800',
      stock: 100,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Bánh Mì Thịt',
      price: 25000,
      description: 'Bánh mì Việt Nam giòn tan với thịt nguội, pate, rau củ tươi',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1592415499556-fa90c3a3cacc?w=800',
      stock: 150,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Bún Chả Hà Nội',
      price: 50000,
      description: 'Bún chả truyền thống Hà Nội với thịt nướng thơm lừng, nước mắm chua ngọt',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
      stock: 80,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Cơm Tấm Sườn',
      price: 40000,
      description: 'Cơm tấm Sài Gòn với sườn nướng, bì, chả, trứng ốp la',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=800',
      stock: 100,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Gỏi Cuốn Tôm Thịt',
      price: 35000,
      description: 'Gỏi cuốn tươi ngon với tôm, thịt, bún, rau sống, chấm tương đậu phộng',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800',
      stock: 120,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Cao Lầu Hội An',
      price: 45000,
      description: 'Món mì đặc sản Hội An với sợi mì dai, thịt heo xá xíu, rau thơm',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=800',
      stock: 70,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Bún Bò Huế',
      price: 48000,
      description: 'Bún bò Huế cay nồng với nước dùng đậm đà, chả, giò heo',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
      stock: 90,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Chả Cá Lã Vọng',
      price: 120000,
      description: 'Món chả cá Hà Nội nổi tiếng với cá lăng nướng thơm, bún, đậu phộng, mắm tôm',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=800',
      stock: 50,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Bánh Xèo Miền Tây',
      price: 38000,
      description: 'Bánh xèo giòn tan với tôm, thịt, giá đỗ, ăn kèm rau sống và nước mắm',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1587573089035-8b5df2d0e820?w=800',
      stock: 85,
      restaurantId: vietnameseRestaurant.id
    },
    {
      name: 'Hủ Tiếu Nam Vang',
      price: 42000,
      description: 'Hủ tiếu Nam Vang với nước dùng trong, tôm tươi, thịt heo, gan',
      category: 'Món Việt',
      imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800',
      stock: 95,
      restaurantId: vietnameseRestaurant.id
    }
  ];

  for (const dish of vietnameseDishes) {
    const created = await prisma.product.create({ data: dish });
    console.log(`  ✓ Thêm món: ${created.name} - ${created.price.toLocaleString('vi-VN')}đ`);
  }

  console.log('\n---\n');

  // Tạo nhà hàng Tây
  const westernRestaurant = await prisma.restaurant.create({
    data: {
      name: 'Western Cuisine Restaurant',
      address: '456 Lê Lợi, Quận 1, TP.HCM',
      lat: 10.7740,
      lng: 106.6990,
    }
  });
  console.log('✅ Đã tạo nhà hàng Tây:', westernRestaurant.name);

  // Tạo 10 món Tây
  const westernDishes = [
    {
      name: 'Beefsteak Bò Úc',
      price: 180000,
      description: 'Thịt bò Úc cao cấp nướng chín vừa, ăn kèm khoai tây nghiền và rau củ',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800',
      stock: 60,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Spaghetti Carbonara',
      price: 95000,
      description: 'Mì Ý spaghetti với sốt kem trứng, thịt xông khói giòn, phô mai Parmesan',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
      stock: 100,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Pizza Margherita',
      price: 120000,
      description: 'Pizza Ý truyền thống với sốt cà chua, phô mai Mozzarella, lá húng quế tươi',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
      stock: 80,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Fish and Chips',
      price: 110000,
      description: 'Cá tuyết chiên giòn phong cách Anh, ăn kèm khoai tây chiên và sốt tartar',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=800',
      stock: 70,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Chicken Alfredo Pasta',
      price: 98000,
      description: 'Mì fettuccine với sốt kem Alfredo béo ngậy, thịt gà nướng thơm',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800',
      stock: 90,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Grilled Salmon',
      price: 165000,
      description: 'Cá hồi Na Uy nướng với bơ tỏi, chanh, ăn kèm salad và cơm',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      stock: 55,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Caesar Salad',
      price: 75000,
      description: 'Salad rau xà lách tươi với sốt Caesar, phô mai Parmesan, bánh mì nướng',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
      stock: 120,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Lamb Chops',
      price: 220000,
      description: 'Sườn cừu nướng tiêu đen, ăn kèm khoai tây nghiền và nước sốt mint',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1595777216528-07273cc83bf8?w=800',
      stock: 45,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Mushroom Risotto',
      price: 105000,
      description: 'Cơm risotto Ý với nấm tươi, phô mai Parmesan, bơ và rượu vang trắng',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1476124369491-c4b5b6769366?w=800',
      stock: 75,
      restaurantId: westernRestaurant.id
    },
    {
      name: 'Beef Burger Deluxe',
      price: 95000,
      description: 'Burger bò cao cấp với phô mai cheddar, thịt xông khói, rau củ tươi, khoai tây chiên',
      category: 'Món Tây',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      stock: 110,
      restaurantId: westernRestaurant.id
    }
  ];

  for (const dish of westernDishes) {
    const created = await prisma.product.create({ data: dish });
    console.log(`  ✓ Thêm món: ${created.name} - ${created.price.toLocaleString('vi-VN')}đ`);
  }

  console.log('\n🎉 Hoàn thành! Đã tạo 2 nhà hàng và 20 món ăn.\n');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
