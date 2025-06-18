using Duende.IdentityServer.Models;
using Duende.IdentityServer;

namespace Identity.API.Configuration;

public static class Config
{
    public static IEnumerable<IdentityResource> IdentityResources =>
        new IdentityResource[]
        {
            new IdentityResources.OpenId(),
            new IdentityResources.Profile(),
            new IdentityResources.Email(),
            new IdentityResource("roles", "User roles", new List<string> { "role" })
        };

    public static IEnumerable<ApiScope> ApiScopes =>
        new ApiScope[]
        {
            // Microservices API Scopes
            new ApiScope("catalog", "Catalog Service"),
            new ApiScope("basket", "Basket Service"),
            new ApiScope("ordering", "Ordering Service"),
            new ApiScope("gateway", "API Gateway"),
            new ApiScope("shopping_api", "Shopping API"),

            // Full access scope
            new ApiScope("shopping", "Shopping Application Full Access")
        };

    public static IEnumerable<ApiResource> ApiResources =>
        new ApiResource[]
        {
            new ApiResource("catalog-api", "Catalog API")
            {
                Scopes = { "catalog", "shopping", "shopping_api" }
            },
            new ApiResource("basket-api", "Basket API")
            {
                Scopes = { "basket", "shopping", "shopping_api" }
            },
            new ApiResource("ordering-api", "Ordering API")
            {
                Scopes = { "ordering", "shopping", "shopping_api" }
            },
            new ApiResource("gateway-api", "Gateway API")
            {
                Scopes = { "gateway", "shopping", "shopping_api", "catalog", "basket", "ordering" }
            }
        };

    public static IEnumerable<Client> Clients =>
        new Client[]
        {
            // React SPA Client
            new Client
            {
                ClientId = "shopping-spa",
                ClientName = "Shopping React SPA",
                AllowedGrantTypes = new List<string> 
                { 
                    GrantTypes.Code.First(),
                    GrantTypes.ResourceOwnerPassword.First()
                },
                RequirePkce = true,
                RequireClientSecret = false,
                RequireConsent = false,

                RedirectUris = {
                    "http://localhost:6006/callback",
                    "http://localhost:3000/callback" // React dev server
                },
                PostLogoutRedirectUris = {
                    "http://localhost:6006/",
                    "http://localhost:3000/"
                },
                AllowedCorsOrigins = {
                    "http://localhost:6006",
                    "http://localhost:3000"
                },

                AllowedScopes = {
                    IdentityServerConstants.StandardScopes.OpenId,
                    IdentityServerConstants.StandardScopes.Profile,
                    IdentityServerConstants.StandardScopes.Email,
                    "roles",
                    "shopping",
                    "shopping_api",
                    "catalog",
                    "basket",
                    "ordering"
                },

                AllowAccessTokensViaBrowser = true,
                AccessTokenLifetime = 3600,
                IdentityTokenLifetime = 3600,
                RefreshTokenUsage = TokenUsage.ReUse,
                RefreshTokenExpiration = TokenExpiration.Sliding,
                SlidingRefreshTokenLifetime = 3600 * 24 * 30 // 30 days
            },

            // API Gateway Client (Machine to Machine)
            new Client
            {
                ClientId = "gateway-client",
                ClientName = "API Gateway",
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                ClientSecrets = { new Secret("gateway-secret".Sha256()) },
                AllowedScopes = { "gateway", "catalog", "basket", "ordering" }
            },

            // Service to Service Clients
            new Client
            {
                ClientId = "catalog-service",
                ClientName = "Catalog Service",
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                ClientSecrets = { new Secret("catalog-secret".Sha256()) },
                AllowedScopes = { "catalog" }
            },

            new Client
            {
                ClientId = "basket-service",
                ClientName = "Basket Service",
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                ClientSecrets = { new Secret("basket-secret".Sha256()) },
                AllowedScopes = { "basket", "catalog" }
            },

            new Client
            {
                ClientId = "ordering-service",
                ClientName = "Ordering Service",
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                ClientSecrets = { new Secret("ordering-secret".Sha256()) },
                AllowedScopes = { "ordering", "basket" }
            },

            // Demo Client for Testing (Resource Owner Password)
            new Client
            {
                ClientId = "demo-client",
                ClientName = "Demo Client",
                AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
                ClientSecrets = { new Secret("demo-secret".Sha256()) },
                AllowedScopes = {
                    IdentityServerConstants.StandardScopes.OpenId,
                    IdentityServerConstants.StandardScopes.Profile,
                    IdentityServerConstants.StandardScopes.Email,
                    "roles",
                    "shopping",
                    "shopping_api",
                    "catalog",
                    "basket",
                    "ordering"
                },
                AllowedCorsOrigins = {
                    "http://localhost:6006",
                    "http://localhost:3000"
                },
                RequireConsent = false,
                AllowOfflineAccess = true,
                AccessTokenLifetime = 3600,
                RefreshTokenExpiration = TokenExpiration.Sliding,
                SlidingRefreshTokenLifetime = 3600 * 24 * 30 // 30 days
            }
        };
}
