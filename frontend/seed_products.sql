INSERT INTO public."Product" (id, name, price, stock, "imageUrl", "createdAt") VALUES
('cmhbxnqqk0001pqdqv28wdmv0','Fries',2.99,99,'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=60', now()),
('cmhbxnqqs0002pqdqe2jz0moq','Soda',1.5,199,'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=800&q=60', now()),
('cmhbxnqq90000pqdqirux4trs','Cheeseburger',5.99,48,'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=60', now())
ON CONFLICT (id) DO NOTHING;
