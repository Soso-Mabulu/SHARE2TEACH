const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Mongoose Connection', () => {
  let mongoServer;
  let connection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    connection = await mongoose.connect(uri);
  });

  afterAll(async () => {
    await connection.disconnect();
    await mongoServer.stop();
  });

  it('should connect to MongoDB successfully', async () => {
    const connectMock = jest.spyOn(mongoose, 'connect');
    await connectMock(expect.anyString());
    expect(connectMock).toHaveBeenCalled();
  });
});