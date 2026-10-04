const url = process.env.TEST_DATABASE_URL ?? 'postgresql://rent:rent@localhost:5432/room_rent_test';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.JWT_SECRET = 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL_DAYS = '90';
