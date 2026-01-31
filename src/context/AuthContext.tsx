import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  requestPasswordlessCode: (email: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// These should be set via environment variables
const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "",
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "",
};

const REGION = import.meta.env.VITE_AWS_REGION || "eu-central-1";

const userPool = new CognitoUserPool(poolData);

// Create AWS SDK client for USER_AUTH flow
const cognitoClient = new CognitoIdentityProviderClient({
  region: REGION,
});

// Helper function to decode JWT and check for admin group
const isAdminUser = (jwtToken: string): boolean => {
  try {
    const payload = JSON.parse(atob(jwtToken.split('.')[1]));
    const groups = payload['cognito:groups'] || [];
    return groups.includes('admins');
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return false;
  }
};

const TOKEN_STORAGE_KEY = 'cognito_jwt_token';
const REFRESH_TOKEN_STORAGE_KEY = 'cognito_refresh_token';
const USERNAME_STORAGE_KEY = 'cognito_username';
const TOKEN_EXPIRY_STORAGE_KEY = 'cognito_token_expiry';

// Refresh token 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<string | null>(null); // Store session for OTP flow

  // Helper to save token to localStorage
  const saveToken = (jwtToken: string, refreshToken?: string, username?: string) => {
    setToken(jwtToken);
    setIsAuthenticated(true);
    localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
    
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
    
    if (username) {
      localStorage.setItem(USERNAME_STORAGE_KEY, username);
    }
    
    // Calculate and store token expiry
    try {
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Failed to parse token expiry:', error);
    }
  };

  // Helper to clear token from localStorage
  const clearToken = () => {
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
  };

  // Helper to check if token needs refresh
  const needsRefresh = (): boolean => {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);
    if (!expiryStr) return false;
    
    const expiryTime = parseInt(expiryStr, 10);
    const now = Date.now();
    
    // Refresh if we're within the buffer time of expiry
    return (expiryTime - now) < REFRESH_BUFFER_MS;
  };

  // Helper to refresh token using refresh token
  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    const username = localStorage.getItem(USERNAME_STORAGE_KEY);
    
    if (!refreshToken || !username) {
      return false;
    }

    try {
      console.log('[Auth] Refreshing token...');
      
      // For password-based auth, use Cognito SDK
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        return new Promise((resolve) => {
          cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session || !session.isValid()) {
              console.error('[Auth] Failed to refresh via Cognito session:', err);
              clearToken();
              resolve(false);
              return;
            }
            
            const jwtToken = session.getIdToken().getJwtToken();
            if (isAdminUser(jwtToken)) {
              console.log('[Auth] Token refreshed successfully via Cognito session');
              // Use saveToken instead of manually setting to ensure all state is updated
              const refreshTokenStr = session.getRefreshToken().getToken();
              saveToken(jwtToken, refreshTokenStr, username);
              resolve(true);
            } else {
              clearToken();
              resolve(false);
            }
          });
        });
      }
      
      // For email OTP auth, use AWS SDK InitiateAuth with REFRESH_TOKEN
      const command = new InitiateAuthCommand({
        ClientId: poolData.ClientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await cognitoClient.send(command);
      
      if (response.AuthenticationResult?.IdToken) {
        const jwtToken = response.AuthenticationResult.IdToken;
        
        if (isAdminUser(jwtToken)) {
          console.log('[Auth] Token refreshed successfully via AWS SDK');
          // Keep the same refresh token and username
          saveToken(
            jwtToken,
            response.AuthenticationResult.RefreshToken || refreshToken,
            username
          );
          return true;
        }
      }
      
      console.error('[Auth] Token refresh failed: Invalid response or not admin');
      clearToken();
      return false;
    } catch (error) {
      console.error('[Auth] Failed to refresh token:', error);
      clearToken();
      return false;
    }
  };

  // Check if user is already authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      // First, try to restore from localStorage
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        // Check if token needs refresh
        if (needsRefresh()) {
          const refreshed = await refreshAccessToken();
          setIsLoading(false);
          if (refreshed) return;
          // If refresh failed, fall through to clear and re-check
        } else if (isAdminUser(storedToken)) {
          // Token is still valid
          setToken(storedToken);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } else {
          // Invalid token, clear it
          clearToken();
        }
      }

      // Fallback to checking Cognito session
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session) {
            setIsLoading(false);
            return;
          }
          if (session.isValid()) {
            const jwtToken = session.getIdToken().getJwtToken();
            const refreshToken = session.getRefreshToken().getToken();
            if (isAdminUser(jwtToken)) {
              saveToken(jwtToken, refreshToken, cognitoUser.getUsername());
            } else {
              // User is not an admin, sign them out
              cognitoUser.signOut();
              setError("Access denied: Admin privileges required");
            }
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefresh = async () => {
      if (needsRefresh()) {
        console.log('[Auth] Token needs refresh, refreshing now...');
        const success = await refreshAccessToken();
        if (!success) {
          console.error('[Auth] Token refresh failed, logging out');
          logout();
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAndRefresh, 60 * 1000);

    // Also check immediately on mount
    checkAndRefresh();


    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (username: string, password: string): Promise<void> => {
    setError(null);
    setIsLoading(true);

    const authenticationData = {
      Username: username,
      Password: password,
    };

    const authenticationDetails = new AuthenticationDetails(authenticationData);

    const userData = {
      Username: username,
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          const jwtToken = session.getIdToken().getJwtToken();
          const refreshToken = session.getRefreshToken().getToken();
          
          // Check if user is in admin group
          if (!isAdminUser(jwtToken)) {
            cognitoUser.signOut();
            setError("Access denied: Admin privileges required");
            setIsLoading(false);
            reject(new Error("Access denied: Admin privileges required"));
            return;
          }
          
          saveToken(jwtToken, refreshToken, username);
          setIsLoading(false);
          resolve();
        },
        onFailure: (err: Error) => {
          setError(err.message);
          setIsLoading(false);
          reject(err);
        },
      });
    });
  };

  const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    clearToken();
  };

  const requestPasswordlessCode = async (email: string): Promise<void> => {
    setError(null);
    setIsLoading(true);

    try {
      const command = new InitiateAuthCommand({
        ClientId: poolData.ClientId,
        AuthFlow: 'USER_AUTH',
        AuthParameters: {
          USERNAME: email,
          PREFERRED_CHALLENGE: 'EMAIL_OTP',
        },
      });

      const response = await cognitoClient.send(command);
      
      if (response.Session) {
        // Store session for the next step
        setSessionData(response.Session);
        setIsLoading(false);
      } else {
        throw new Error("Failed to initiate authentication");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
      setIsLoading(false);
      throw err;
    }
  };

  const loginWithCode = async (email: string, code: string): Promise<void> => {
    setError(null);
    setIsLoading(true);

    if (!sessionData) {
      setError("No active session. Please request a code first.");
      setIsLoading(false);
      return;
    }

    try {
      const command = new RespondToAuthChallengeCommand({
        ClientId: poolData.ClientId,
        ChallengeName: 'EMAIL_OTP',
        Session: sessionData,
        ChallengeResponses: {
          USERNAME: email,
          EMAIL_OTP_CODE: code,
        },
      });

      const response = await cognitoClient.send(command);
      
      if (response.AuthenticationResult?.IdToken) {
        const jwtToken = response.AuthenticationResult.IdToken;
        const refreshToken = response.AuthenticationResult.RefreshToken;
        
        // Check if user is in admin group
        if (!isAdminUser(jwtToken)) {
          setError("Access denied: Admin privileges required");
          setIsLoading(false);
          setSessionData(null);
          throw new Error("Access denied: Admin privileges required");
        }
        
        saveToken(jwtToken, refreshToken, email);
        setSessionData(null);
        setIsLoading(false);
      } else {
        throw new Error("Failed to complete authentication");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
      setIsLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, token, login, requestPasswordlessCode, loginWithCode, logout, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
