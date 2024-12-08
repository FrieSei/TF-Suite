"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  id: string;
  label: string;
  validator: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  {
    id: "length",
    label: "At least 8 characters long",
    validator: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Contains uppercase letter",
    validator: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Contains lowercase letter",
    validator: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Contains number",
    validator: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "Contains special character",
    validator: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

interface UserData {
  role: "surgeon" | "backoffice";
  location: string;
  email: string;
}

export default function InvitationResponse() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "validating" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);

  const meetsRequirements = passwordRequirements.map((req) => ({
    ...req,
    isMet: req.validator(password),
  }));

  const allRequirementsMet = meetsRequirements.every((req) => req.isMet);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = allRequirementsMet && passwordsMatch && password.length > 0;

  useEffect(() => {
    const validateInvitation = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("invitation_token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid invitation link");
        return;
      }

      try {
        const response = await fetch("/api/verify-invitation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        setUserData(data.userData);
        setStatus("validating");
      } catch (error) {
        setStatus("error");
        setMessage("Invalid or expired invitation link");
      }
    };

    validateInvitation();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || !userData) return;

    setStatus("loading");

    try {
      const token = new URLSearchParams(window.location.search).get("invitation_token");

      if (!token) throw new Error("Invalid invitation token");

      const response = await fetch("/api/accept-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          userData,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setStatus("success");
      setMessage("Account setup successful! Redirecting to login...");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to set up account. Please try again.");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Validating invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => router.push("/login")}>
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Account Setup</CardTitle>
          {userData && (
            <CardDescription>
              Setting up your account as a {userData.role} at {userData.location}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                />
                {password && confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-medium text-sm">Password Requirements</h3>
              <div className="space-y-2">
                {meetsRequirements.map((req) => (
                  <div key={req.id} className="flex items-center gap-2">
                    {req.isMet ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        req.isMet ? "text-green-700 dark:text-green-500" : "text-muted-foreground"
                      )}
                    >
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {status === "success" && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

<Button
  type="submit"
  className="w-full"
  disabled={!canSubmit || status === "loading"}
>
  {status === "loading" ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Setting up...
    </>
  ) : (
    "Complete Setup"
  )}
</Button>
