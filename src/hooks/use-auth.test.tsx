import { act, renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import useAuth from './use-auth';

interface ContextWrapperProps {
  children: React.ReactNode;
}

describe('useAuth', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  const contextWrapper = ({ children }: ContextWrapperProps) => (
    <BrowserRouter>
      <RecoilRoot>{children}</RecoilRoot>
    </BrowserRouter>
  );

  // test('should call signIn successfully', async () => {
  //   const { result } = renderHook(() => useAuth(), {
  //     wrapper: contextWrapper,
  //   });

  //   await act(async () => {
  //     result.current.signIn();
  //   });
  //   expect(result.current.signIn).toBeTruthy();
  // });

  // test('should call signIn with SSO and no configs', async () => {
  //   const { result } = renderHook(() => useAuth(), {
  //     wrapper: contextWrapper,
  //   });

  //   await act(async () => {
  //     result.current.signIn();
  //   });
  //   expect(result.current.signIn).toBeTruthy();
  // });

  // test('should call signIn with SSO and available configs', async () => {
  //   process.env.SSO_TENANT_ID = 'http://localhost';
  //   process.env.SSO_CLIENT_ID = 'dev-client';

  //   const { result } = renderHook(() => useAuth(), {
  //     wrapper: contextWrapper,
  //   });

  //   await act(async () => {
  //     result.current.signIn();
  //   });
  //   expect(result.current.signIn).toBeTruthy();
  // });

  test('should call signOut successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: contextWrapper,
    });

    await act(async () => {
      result.current.signOut();
    });
    expect(result.current.signOut).toBeTruthy();
  });
});
