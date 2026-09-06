import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
  maxRetries: 3,
  requestTimeout: 5000,
});

export const EMAILS_INDEX = 'emails_index';

export async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAILS_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              scheduleId: { type: 'keyword' },
              recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              body: { type: 'text' },
              senderEmail: { type: 'keyword' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              etherealPreviewUrl: { type: 'keyword' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`🔎 Elasticsearch index "${EMAILS_INDEX}" created successfully`);
    }
  } catch (err: any) {
    console.warn('⚠️ Elasticsearch initialization notice:', err.message || err);
  }
}

export async function indexEmailDoc(doc: {
  id: string;
  scheduleId: string;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  etherealPreviewUrl?: string | null;
  createdAt: Date;
}) {
  try {
    await esClient.index({
      index: EMAILS_INDEX,
      id: doc.id,
      document: {
        id: doc.id,
        scheduleId: doc.scheduleId,
        recipient: doc.recipient,
        subject: doc.subject,
        body: doc.body,
        senderEmail: doc.senderEmail,
        status: doc.status,
        scheduledAt: doc.scheduledAt.toISOString(),
        sentAt: doc.sentAt ? doc.sentAt.toISOString() : null,
        etherealPreviewUrl: doc.etherealPreviewUrl || null,
        createdAt: doc.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.warn(`⚠️ Failed to index document ${doc.id} in Elasticsearch:`, err.message || err);
  }
}

export async function searchEmailsInES(query: string, statusFilter?: string) {
  try {
    const must: any[] = [];
    if (query && query.trim() !== '') {
      must.push({
        multi_match: {
          query,
          fields: ['subject^3', 'body^2', 'recipient^4', 'senderEmail^2'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (statusFilter && statusFilter !== 'ALL') {
      must.push({ term: { status: statusFilter } });
    }

    const response = await esClient.search({
      index: EMAILS_INDEX,
      body: {
        query: must.length > 0 ? { bool: { must } } : { match_all: {} },
        sort: [{ scheduledAt: { order: 'desc' } }],
        size: 100,
      },
    });

    return response.hits.hits.map((hit: any) => hit._source);
  } catch (err: any) {
    console.warn('⚠️ Elasticsearch search error (falling back to database):', err.message || err);
    return null;
  }
}
