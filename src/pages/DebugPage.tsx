import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Clock, Key } from "lucide-react";

export function DebugPage() {
  const { token, isAuthenticated } = useAuth();

  const decodeJWT = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { error: "Invalid JWT format" };
      }

      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      
      return { header, payload };
    } catch (error) {
      return { error: "Failed to decode JWT: " + (error as Error).message };
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Not Authenticated</h1>
          <p className="text-muted-foreground">
            Please log in to view JWT debug information.
          </p>
        </div>
      </div>
    );
  }

  const decoded = decodeJWT(token);

  if ('error' in decoded) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Decode Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{decoded.error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { header, payload } = decoded;

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  };

  // Check if token is expired
  const isExpired = payload.exp && Date.now() / 1000 > payload.exp;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">JWT Debug</h1>
          <Badge variant={isExpired ? "destructive" : "default"}>
            {isExpired ? "Expired" : "Valid"}
          </Badge>
        </div>

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>JWT Header</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(header, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Payload - Claims */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>JWT Payload (Claims)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payload.sub && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Subject (sub)</div>
                  <div className="text-sm font-mono break-all">{payload.sub}</div>
                </div>
              )}
              {payload.email && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email</div>
                  <div className="text-sm">{payload.email}</div>
                </div>
              )}
              {payload['cognito:username'] && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Username</div>
                  <div className="text-sm">{payload['cognito:username']}</div>
                </div>
              )}
              {payload.iss && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Issuer (iss)</div>
                  <div className="text-sm font-mono break-all">{payload.iss}</div>
                </div>
              )}
              {payload.aud && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Audience (aud)</div>
                  <div className="text-sm font-mono break-all">{payload.aud}</div>
                </div>
              )}
              {payload.token_use && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Token Use</div>
                  <div className="text-sm">{payload.token_use}</div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" />
                <h3 className="font-semibold">Timestamps</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {payload.iat && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Issued At (iat)</div>
                    <div className="text-sm">{formatTimestamp(payload.iat)}</div>
                    <div className="text-xs text-muted-foreground">{payload.iat}</div>
                  </div>
                )}
                {payload.exp && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Expires (exp)</div>
                    <div className="text-sm">{formatTimestamp(payload.exp)}</div>
                    <div className="text-xs text-muted-foreground">{payload.exp}</div>
                  </div>
                )}
                {payload.auth_time && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Auth Time</div>
                    <div className="text-sm">{formatTimestamp(payload.auth_time)}</div>
                    <div className="text-xs text-muted-foreground">{payload.auth_time}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Full Payload</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Raw Token */}
        <Card>
          <CardHeader>
            <CardTitle>Raw JWT Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs font-mono break-all">{token}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
