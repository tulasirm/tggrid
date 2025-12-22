import passport from "passport";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import { Strategy as SAMLStrategy } from "passport-saml";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as AzureADStrategy } from "passport-azure-ad-oauth2";
import { db } from "./db";

/**
 * SSO Provider configuration
 */
interface SSOConfig {
  provider: "google" | "azure" | "okta" | "saml" | "oauth2";
  enabled: boolean;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  issuer?: string;
  entryPoint?: string;
  cert?: string;
}

/**
 * Initialize Google OAuth strategy
 */
export function initializeGoogleSSO(config: SSOConfig) {
  if (!config.enabled || !config.clientID || !config.clientSecret) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.clientID,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find or create user
          let user = await db.user.findUnique({
            where: { email: profile.emails?.[0]?.value },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                email: profile.emails?.[0]?.value || "",
                fullName: profile.displayName,
                name: profile.displayName,
                password: "", // SSO users don't have passwords
                ssoProvider: "google",
                ssoId: profile.id,
                settings: {
                  theme: "dark",
                  emailNotifications: true,
                  twoFactorEnabled: false,
                },
              },
            });
          }

          // Create audit log
          await db.auditLog.create({
            data: {
              userId: user.id,
              action: "auth.sso.login",
              resourceType: "user",
              resourceId: user.id,
              details: JSON.stringify({ provider: "google" }),
              ipAddress: "",
            },
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

/**
 * Initialize Azure AD OAuth strategy
 */
export function initializeAzureADSSO(config: SSOConfig) {
  if (!config.enabled || !config.clientID || !config.clientSecret) return;

  passport.use(
    new AzureADStrategy(
      {
        clientID: config.clientID,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackURL,
        tenant: process.env.AZURE_AD_TENANT || "common",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await db.user.findUnique({
            where: { email: profile._json.email },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                email: profile._json.email || "",
                fullName: profile.displayName,
                name: profile.displayName,
                password: "",
                ssoProvider: "azure",
                ssoId: profile.id,
                settings: {
                  theme: "dark",
                  emailNotifications: true,
                  twoFactorEnabled: false,
                },
              },
            });
          }

          await db.auditLog.create({
            data: {
              userId: user.id,
              action: "auth.sso.login",
              resourceType: "user",
              resourceId: user.id,
              details: JSON.stringify({ provider: "azure" }),
              ipAddress: "",
            },
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

/**
 * Initialize SAML strategy (Okta, OneLogin, etc.)
 */
export function initializeSAMLSSO(config: SSOConfig) {
  if (!config.enabled || !config.entryPoint || !config.cert) return;

  passport.use(
    new SAMLStrategy(
      {
        entryPoint: config.entryPoint!,
        issuer: config.issuer!,
        callbackUrl: config.callbackURL,
        cert: config.cert!,
      },
      async (profile, done) => {
        try {
          const email = profile.email || profile.nameID;

          let user = await db.user.findUnique({
            where: { email },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                email,
                fullName: profile.displayName || email,
                name: profile.displayName || email,
                password: "",
                ssoProvider: "saml",
                ssoId: profile.nameID,
                settings: {
                  theme: "dark",
                  emailNotifications: true,
                  twoFactorEnabled: false,
                },
              },
            });
          }

          await db.auditLog.create({
            data: {
              userId: user.id,
              action: "auth.sso.login",
              resourceType: "user",
              resourceId: user.id,
              details: JSON.stringify({ provider: "saml" }),
              ipAddress: "",
            },
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

/**
 * Initialize generic OAuth2 strategy
 */
export function initializeOAuth2SSO(config: SSOConfig) {
  if (!config.enabled || !config.clientID || !config.clientSecret) return;
  if (!process.env.OAUTH2_AUTHORIZATION_URL || !process.env.OAUTH2_TOKEN_URL)
    return;

  passport.use(
    new OAuth2Strategy(
      {
        authorizationURL: process.env.OAUTH2_AUTHORIZATION_URL || "",
        tokenURL: process.env.OAUTH2_TOKEN_URL || "",
        clientID: config.clientID,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile as any).email;

          let user = await db.user.findUnique({
            where: { email },
          });

          if (!user) {
            user = await db.user.create({
              data: {
                email,
                fullName: (profile as any).displayName || email,
                name: (profile as any).displayName || email,
                password: "",
                ssoProvider: "oauth2",
                ssoId: (profile as any).id,
                settings: {
                  theme: "dark",
                  emailNotifications: true,
                  twoFactorEnabled: false,
                },
              },
            });
          }

          await db.auditLog.create({
            data: {
              userId: user.id,
              action: "auth.sso.login",
              resourceType: "user",
              resourceId: user.id,
              details: JSON.stringify({ provider: "oauth2" }),
              ipAddress: "",
            },
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

/**
 * Initialize all SSO strategies based on environment configuration
 */
export function initializeSSO() {
  // Google OAuth
  if (process.env.GOOGLE_CLIENT_ID) {
    initializeGoogleSSO({
      provider: "google",
      enabled: true,
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL || "/api/auth/sso/google/callback",
    });
  }

  // Azure AD
  if (process.env.AZURE_AD_CLIENT_ID) {
    initializeAzureADSSO({
      provider: "azure",
      enabled: true,
      clientID: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      callbackURL:
        process.env.AZURE_AD_CALLBACK_URL || "/api/auth/sso/azure/callback",
    });
  }

  // SAML
  if (process.env.SAML_ENTRY_POINT) {
    initializeSAMLSSO({
      provider: "saml",
      enabled: true,
      clientID: "",
      clientSecret: "",
      callbackURL:
        process.env.SAML_CALLBACK_URL || "/api/auth/sso/saml/callback",
      entryPoint: process.env.SAML_ENTRY_POINT,
      issuer: process.env.SAML_ISSUER || "ufbrowsers",
      cert: process.env.SAML_CERT || "",
    });
  }

  // Generic OAuth2
  if (process.env.OAUTH2_CLIENT_ID) {
    initializeOAuth2SSO({
      provider: "oauth2",
      enabled: true,
      clientID: process.env.OAUTH2_CLIENT_ID,
      clientSecret: process.env.OAUTH2_CLIENT_SECRET || "",
      callbackURL:
        process.env.OAUTH2_CALLBACK_URL || "/api/auth/sso/oauth2/callback",
    });
  }

  // Serialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await db.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}
