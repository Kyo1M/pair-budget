import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createInteraction: vi.fn(),
  getSupabase: vi.fn(),
  mapReceiptScan: vi.fn((row) => row),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    interactions = { create: mocks.createInteraction };
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mocks.getSupabase(),
}));

vi.mock('@/services/receiptScans', () => ({
  mapReceiptScan: mocks.mapReceiptScan,
}));

import { POST } from './route';

const scan = {
  id: '00000000-0000-4000-8000-000000000010',
  household_id: '00000000-0000-4000-8000-000000000020',
  created_by: '00000000-0000-4000-8000-000000000030',
  storage_path: 'household/user/scan.jpg',
  mime_type: 'image/jpeg',
  size_bytes: 100,
  status: 'pending',
  ocr_result: null,
  ocr_error: null,
  transaction_id: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

function makeContext() {
  return { params: Promise.resolve({ id: scan.id }) };
}

function makeSupabase(options?: { user?: typeof scan.created_by | null; findScan?: boolean }) {
  const updatePayloads: Array<Record<string, unknown>> = [];
  const user = options?.user === undefined ? scan.created_by : options.user;
  const findScan = options?.findScan ?? true;

  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: user ? { id: user } : null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: findScan ? scan : null,
            error: findScan ? null : { message: 'not found' },
          })),
        })),
      })),
      update: vi.fn((payload: Record<string, unknown>) => {
        updatePayloads.push(payload);
        return {
          eq: vi.fn(() => {
            if (payload.status === 'ready') {
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { ...scan, ...payload },
                    error: null,
                  })),
                })),
              };
            }
            return Promise.resolve({ error: null });
          }),
        };
      }),
    })),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(async () => ({
          data: new Blob(['receipt'], { type: 'image/jpeg' }),
          error: null,
        })),
      })),
    },
  };

  return { supabase, updatePayloads };
}

describe('receipt analyze route', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-3.6-flash';
    mocks.createInteraction.mockReset();
    mocks.getSupabase.mockReset();
    mocks.mapReceiptScan.mockClear();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it('未認証なら401を返す', async () => {
    const { supabase } = makeSupabase({ user: null });
    mocks.getSupabase.mockReturnValue(supabase);

    const response = await POST(new Request('http://localhost'), makeContext());

    expect(response.status).toBe(401);
    expect(mocks.createInteraction).not.toHaveBeenCalled();
  });

  it('RLSで取得できない下書きは404を返す', async () => {
    const { supabase } = makeSupabase({ findScan: false });
    mocks.getSupabase.mockReturnValue(supabase);

    const response = await POST(new Request('http://localhost'), makeContext());

    expect(response.status).toBe(404);
  });

  it('Geminiの構造化結果をreadyとして保存する', async () => {
    const { supabase, updatePayloads } = makeSupabase();
    mocks.getSupabase.mockReturnValue(supabase);
    mocks.createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        amount: 1234,
        occurredOn: '2026-08-01',
        place: 'テストスーパー',
        category: 'groceries',
        ambiguousFields: [],
        warnings: [],
      }),
    });

    const response = await POST(new Request('http://localhost'), makeContext());

    expect(response.status).toBe(200);
    expect(updatePayloads.map((payload) => payload.status)).toEqual(['processing', 'ready']);
    expect(mocks.createInteraction).toHaveBeenCalledOnce();
  });

  it('Geminiのレート上限はfailedへ戻して429を返す', async () => {
    const { supabase, updatePayloads } = makeSupabase();
    mocks.getSupabase.mockReturnValue(supabase);
    mocks.createInteraction.mockRejectedValue(new Error('429 RESOURCE_EXHAUSTED'));

    const response = await POST(new Request('http://localhost'), makeContext());

    expect(response.status).toBe(429);
    expect(updatePayloads.map((payload) => payload.status)).toEqual(['processing', 'failed']);
  });
});

