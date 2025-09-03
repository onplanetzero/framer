import { test, expect } from '@jest/globals';
import { generate } from '../src/util/test-util';
import path from 'node:path';

test('it runs', async () => {
    let error;
    try {
        await generate(path.resolve(__dirname, 'api.yaml'));
    } catch (e) {
        error = e;
    }

    expect(error).toBeUndefined();
})
