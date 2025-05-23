import { app, authentication } from '@microsoft/teams-js';
import { User } from '@src/types/user';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { currentUserState } from 'src/store';
import msalInstance from 'src/utils/msal';

export const SignIn = () => {
  const [user, setUser] = useRecoilState<User | null | undefined>(
    currentUserState,
  );

  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // const msalConfig = useMemo(
  //   () => ({
  //     auth: {
  //       clientId: process.env.REACT_APP_AZURE_CLIENT_ID as string,
  //       authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
  //       redirectUri: '/',
  //     },
  //     cache: {
  //       cacheLocation: 'localStorage',
  //       storeAuthStateInCookie: true,
  //     },
  //     system: {
  //       allowNativeBroker: false, // Disables WAM Broker
  //     },
  //   }),
  //   [],
  // );

  const handleAuthenticationSuccess = useCallback(
    async (accessToken: string) => {
      const userInfo = await getUserInfoFromGraph(accessToken);
      setUser(userInfo);
      navigate('/');
    },
    [setUser, navigate],
  );

  const authenticateOnWeb = useCallback(async () => {
    try {
      // First handle any pending redirect callback
      const result = await msalInstance.handleRedirectPromise();
      if (result) {
        await handleAuthenticationSuccess(result.accessToken);
        return;
      }

      // Check if we have any accounts
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const silentResult = await msalInstance.acquireTokenSilent({
          scopes: ['User.Read'],
          account: accounts[0],
        });
        await handleAuthenticationSuccess(silentResult.accessToken);
      } else {
        // Start login redirect - don't navigate immediately
        await msalInstance.loginRedirect({
          scopes: ['User.Read'],
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticating(false);
    }
  }, [handleAuthenticationSuccess]);

  const authenticateInTeams = useCallback(async () => {
    try {
      // Get client-side token
      const token = await authentication.getAuthToken();
      // Exchange client-side token for server-side token
      const serverToken = await exchangeTokenForServerToken(token);
      const userInfo = await getUserInfoFromGraph(serverToken);
      setUser(userInfo);
    } catch (error) {
      console.error('Error during Teams SSO:', error);
      await authenticateOnWeb();
    }
  }, [setUser, authenticateOnWeb]);

  const initializeTeamsApp = async () => {
    return Promise.race([
      app.initialize(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Teams SDK initialization timed out')),
          10000,
        ),
      ),
    ]);
  };

  useEffect(() => {
    const initializeUser = async () => {
      if (!user && !isAuthenticating) {
        setIsAuthenticating(true);
        try {
          const isInTeams = await initializeTeamsApp()
            .then(() => app.getContext())
            .catch(() => false);
          if (isInTeams) {
            console.log('Running in Teams');
            await authenticateInTeams();
          } else {
            console.log('Running in web');
            await authenticateOnWeb();
          }
        } catch (error) {
          console.error('Authentication error:', error);
          setIsAuthenticating(false);
        }
      }
    };

    initializeUser();
  }, [user, isAuthenticating, authenticateOnWeb, authenticateInTeams]);

  const getUserInfoFromGraph = async (accessToken: string): Promise<User> => {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        method: 'GET',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    return {
      firstName: data.givenName || '',
      lastName: data.surname || '',
      displayName: data.displayName || '',
      emailAddress: data.mail || data.userPrincipalName || '',
      phoneNumber: data.mobilePhone || '',
    };
  };

  const exchangeTokenForServerToken = async (
    clientSideToken: string,
  ): Promise<string> => {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/getProfileOnBehalfOf`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: clientSideToken, // Send the token as a JSON object
        }),
      },
    );
    if (!response.ok) {
      throw new Error('Failed to exchange token');
    }

    const data = await response.json();
    return data.accessToken;
  };

  if (isAuthenticating) {
    return <div style={{ paddingLeft: '100px' }}>Authenticating...</div>;
  }
  return (
    <div className="grid-container">
      <div className="grid-row">
        <div className="tablet:grid-col-6" style={{ paddingLeft: '100px' }}>
          <h1>Sign In</h1>
        </div>
      </div>
    </div>
  );
};
