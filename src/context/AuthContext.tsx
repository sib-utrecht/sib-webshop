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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<string | null>(null); // Store session for OTP flow

  // Check if user is already authenticated on mount
  useEffect(() => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          setIsLoading(false);
          return;
        }
        if (session.isValid()) {
          const jwtToken = session.getIdToken().getJwtToken();
          if (isAdminUser(jwtToken)) {
            setToken(jwtToken);
            setIsAuthenticated(true);
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
  }, []);

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
          
          // Check if user is in admin group
          if (!isAdminUser(jwtToken)) {
            cognitoUser.signOut();
            setError("Access denied: Admin privileges required");
            setIsLoading(false);
            reject(new Error("Access denied: Admin privileges required"));
            return;
          }
          
          setToken(jwtToken);
          setIsAuthenticated(true);
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
    setToken(null);
    setIsAuthenticated(false);
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
        
        // Check if user is in admin group
        if (!isAdminUser(jwtToken)) {
          setError("Access denied: Admin privileges required");
          setIsLoading(false);
          setSessionData(null);
          throw new Error("Access denied: Admin privileges required");
        }
        
        setToken(jwtToken);
        setIsAuthenticated(true);
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
