import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export const startMemoryDb = async () => {
    if (!mongod) {
        mongod = await MongoMemoryServer.create();
    }
    const uri = mongod.getUri();
    console.log(`InMemory MongoDB started at ${uri}`);
    return uri;
};

export const stopMemoryDb = async () => {
    if (mongod) {
        await mongod.stop();
    }
};
