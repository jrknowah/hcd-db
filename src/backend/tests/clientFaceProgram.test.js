// Face sheet Program: read from and saved to dbo.Clients alongside ClientFace.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');

let queries;
let recordsets;

const fakePool = {
  request() {
    const params = {};
    const req = {
      input(name, _type, value) { params[name] = value; return req; },
      async query(q) {
        queries.push({ q, params });
        return { recordsets, recordset: recordsets[0] };
      },
    };
    return req;
  },
};

const azureSqlPath = path.resolve(__dirname, '../store/azureSql.js');
require.cache[azureSqlPath] = {
  id: azureSqlPath, filename: azureSqlPath, loaded: true,
  exports: { getPool: async () => fakePool },
};

const app = express();
app.use(express.json());
app.use('/api', require('../routes/clientFace.js'));

beforeEach(() => {
  queries = [];
  recordsets = [[], []];
});

describe('GET /api/getClientFace/:clientID', () => {
  it('adds the client program to the face sheet', async () => {
    recordsets = [[{ clientID: 'C1', clientContactNum: '5551234567' }], [{ clientProgram: 'ODR' }]];
    const res = await request(app).get('/api/getClientFace/C1');
    expect(res.body).toEqual({ clientID: 'C1', clientContactNum: '5551234567', clientProgram: 'ODR' });
  });

  it('returns the program even before a face sheet is saved', async () => {
    recordsets = [[], [{ clientProgram: 'DHS' }]];
    const res = await request(app).get('/api/getClientFace/C1');
    expect(res.body).toEqual({ clientProgram: 'DHS' });
  });
});

describe('POST /api/saveClientFace', () => {
  it('saves the program to the client in the same transaction', async () => {
    const res = await request(app).post('/api/saveClientFace').send({ clientID: 'C1', clientProgram: 'LAHSA' });
    expect(res.status).toBe(200);
    const { q, params } = queries[0];
    expect(q).toMatch(/BEGIN TRANSACTION[\s\S]*MERGE ClientFace[\s\S]*UPDATE Clients SET clientProgram[\s\S]*COMMIT/);
    expect(params).toMatchObject({ updateProgram: true, clientProgram: 'LAHSA' });
  });

  it('leaves the program alone when it is not sent', async () => {
    await request(app).post('/api/saveClientFace').send({ clientID: 'C1', clientContactNum: '' });
    expect(queries[0].params.updateProgram).toBe(false);
  });

  it('rejects an unknown program without saving', async () => {
    const res = await request(app).post('/api/saveClientFace').send({ clientID: 'C1', clientProgram: 'Other' });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('clientProgram');
    expect(queries).toHaveLength(0);
  });
});
