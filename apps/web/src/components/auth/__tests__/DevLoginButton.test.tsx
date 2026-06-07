import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevLoginButton } from '../DevLoginButton';

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signInMock = vi.fn();
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: { signIn: typeof signInMock }) => unknown) =>
    selector({ signIn: signInMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('DevLoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('フラグが未設定なら何も描画しない', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', '');
    const { container } = render(<DevLoginButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('フラグ on で2つのテストログインボタンを描画する', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    render(<DevLoginButton />);
    expect(
      screen.getByRole('button', { name: 'テスト太郎でログイン' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'テスト花子でログイン' })
    ).toBeInTheDocument();
  });

  it('ボタンクリックで正しい資格情報で signIn を呼び / に遷移する', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEV_LOGIN_TARO_EMAIL', 'test-taro@example.com');
    vi.stubEnv('NEXT_PUBLIC_DEV_LOGIN_TARO_PASSWORD', 'devpassword123');
    const user = userEvent.setup();
    render(<DevLoginButton />);

    await user.click(
      screen.getByRole('button', { name: 'テスト太郎でログイン' })
    );

    expect(signInMock).toHaveBeenCalledWith(
      'test-taro@example.com',
      'devpassword123'
    );
    expect(pushMock).toHaveBeenCalledWith('/');
    expect(refreshMock).toHaveBeenCalled();
  });

  it('資格情報が未設定のボタンは signIn を呼ばずエラー通知する', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    const user = userEvent.setup();
    render(<DevLoginButton />);

    await user.click(
      screen.getByRole('button', { name: 'テスト花子でログイン' })
    );

    expect(signInMock).not.toHaveBeenCalled();
  });
});
