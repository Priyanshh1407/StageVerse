import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet;

// A replica set (not a standalone server) so tests can use transactions
export async function setup(project) {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    project.provide('mongoUri', replSet.getUri('stageverse-test'));
}

export async function teardown() {
    await replSet?.stop();
}
