using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using Duende.IdentityServer.Models;
using Duende.IdentityServer;

namespace Services.Identity.API
{
    public static class Config
    {
        public static IEnumerable<Client> Clients =>
            new List<Client>
            {
                new Client
                {
                    ClientId = "shopping-spa",
                    ClientName = "Shopping SPA",
                    AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
                    RequirePkce = false,
                    RequireClientSecret = false,
                    RedirectUris = { "http://localhost:6006/callback" },
                    PostLogoutRedirectUris = { "http://localhost:6006" },
                    AllowedScopes = { "openid", "profile", "shopping_api" },
                    AllowedCorsOrigins = { "http://localhost:6006" }
                }
            };

        public static IEnumerable<ApiScope> ApiScopes =>
            new List<ApiScope>
            {
                new ApiScope("shopping_api", "Shopping API")
            };

        public static IEnumerable<IdentityResource> IdentityResources =>
            new List<IdentityResource>
            {
                new IdentityResources.OpenId(),
                new IdentityResources.Profile()
            };
    }
} 