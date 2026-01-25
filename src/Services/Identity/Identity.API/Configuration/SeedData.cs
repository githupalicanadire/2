using Identity.API.Data;
using Identity.API.Models;
using Duende.IdentityServer.EntityFramework.DbContexts;
using Duende.IdentityServer.EntityFramework.Mappers;
using Duende.IdentityServer.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System.Security.Claims;

namespace Identity.API.Configuration;

public static class SeedData
{
    public static async Task EnsureSeedData(IServiceProvider serviceProvider)
    {
        Log.Information("🌱 Seeding database...");

        // Skip IdentityServer4 seeding (using custom JWT instead)
        Log.Information("ℹ️ Skipping IdentityServer4 configuration seeding - using custom JWT");

        // Seed users only
        await SeedUsers(serviceProvider);

        Log.Information("✅ Database seeding completed");
    }

    private static async Task SeedIdentityServerConfigurationData(IServiceProvider serviceProvider)
    {
        var configurationDbContext = serviceProvider.GetRequiredService<ConfigurationDbContext>();

        // Ensure database is created and migrations are applied
        await configurationDbContext.Database.EnsureCreatedAsync();

        // Check if IdentityResources table exists and seed if empty
        try
        {
            if (!await configurationDbContext.IdentityResources.AnyAsync())
            {
                Log.Information("🔑 Seeding identity resources...");
                try
                {
                    foreach (var resource in Config.IdentityResources)
                    {
                        await configurationDbContext.IdentityResources.AddAsync(resource.ToEntity());
                    }
                    await configurationDbContext.SaveChangesAsync();
                }
                catch (Exception mapperEx)
                {
                    Log.Warning("⚠️ AutoMapper issue with IdentityServer4: {Error}. Skipping identity resources seeding.", mapperEx.Message);
                    Log.Information("ℹ️ Identity resources will be created on first use.");
                }
            }
        }
        catch (Exception ex)
        {
            Log.Warning("⚠️ Error checking IdentityResources table: {Error}. Creating database schema...", ex.Message);
            await configurationDbContext.Database.MigrateAsync();

            // Retry seeding after migration
            try
            {
                if (!await configurationDbContext.IdentityResources.AnyAsync())
                {
                    Log.Information("🔑 Seeding identity resources after migration...");
                    foreach (var resource in Config.IdentityResources)
                    {
                        await configurationDbContext.IdentityResources.AddAsync(resource.ToEntity());
                    }
                    await configurationDbContext.SaveChangesAsync();
                }
            }
            catch (Exception retryEx)
            {
                Log.Warning("⚠️ Still failed after migration: {Error}. Continuing without identity resources.", retryEx.Message);
                Log.Information("ℹ️ Identity resources will be created automatically on first request.");
            }
        }

        // Seed API Scopes
        try
        {
            if (!await configurationDbContext.ApiScopes.AnyAsync())
            {
                Log.Information("🔒 Seeding API scopes...");
                try
                {
                    foreach (var scope in Config.ApiScopes)
                    {
                        await configurationDbContext.ApiScopes.AddAsync(scope.ToEntity());
                    }
                    await configurationDbContext.SaveChangesAsync();
                }
                catch (Exception mapperEx)
                {
                    Log.Warning("⚠️ AutoMapper issue with API scopes: {Error}. Skipping.", mapperEx.Message);
                }
            }
        }
        catch (Exception ex)
        {
            Log.Warning("⚠️ Error seeding API scopes: {Error}", ex.Message);
        }

        // Seed API Resources
        try
        {
            if (!await configurationDbContext.ApiResources.AnyAsync())
            {
                Log.Information("🌐 Seeding API resources...");
                try
                {
                    foreach (var resource in Config.ApiResources)
                    {
                        await configurationDbContext.ApiResources.AddAsync(resource.ToEntity());
                    }
                    await configurationDbContext.SaveChangesAsync();
                }
                catch (Exception mapperEx)
                {
                    Log.Warning("⚠️ AutoMapper issue with API resources: {Error}. Skipping.", mapperEx.Message);
                }
            }
        }
        catch (Exception ex)
        {
            Log.Warning("⚠️ Error seeding API resources: {Error}", ex.Message);
        }

        // Seed Clients - Ensure demo-client exists
        try
        {
            Log.Information("🔍 Checking for demo-client...");

            // Check if demo-client specifically exists
            var demoClientExists = await configurationDbContext.Clients
                .AnyAsync(c => c.ClientId == "demo-client");

            if (!demoClientExists)
            {
                Log.Information("👥 demo-client not found, seeding all clients...");

                // Force re-seed for development to update CORS settings
                var configuration = serviceProvider.GetRequiredService<IConfiguration>();
                var shouldClearExisting = configuration["ForceReseedClients"] == "true";

                if (shouldClearExisting)
                {
                    Log.Information("🔄 Clearing existing clients due to ForceReseedClients=true");
                    var existingClients = await configurationDbContext.Clients.ToListAsync();
                    configurationDbContext.Clients.RemoveRange(existingClients);
                    await configurationDbContext.SaveChangesAsync();
                }

                try
                {
                    foreach (var client in Config.Clients)
                    {
                        var clientEntity = client.ToEntity();
                        await configurationDbContext.Clients.AddAsync(clientEntity);
                        Log.Information("➕ Added client: {ClientId}", client.ClientId);
                    }
                    await configurationDbContext.SaveChangesAsync();
                    Log.Information("✅ All clients seeded successfully");
                }
                catch (Exception mapperEx)
                {
                    Log.Error("❌ AutoMapper issue with clients: {Error}. Attempting manual creation...", mapperEx.Message);

                    // Fallback: Create demo-client manually without AutoMapper
                    await CreateDemoClientManually(configurationDbContext);
                }
            }
            else
            {
                Log.Information("✅ demo-client already exists");
            }
        }
        catch (Exception ex)
        {
            Log.Warning("⚠️ Error seeding clients: {Error}", ex.Message);
        }
    }

    private static async Task CreateDemoClientManually(ConfigurationDbContext configurationDbContext)
    {
        try
        {
            Log.Information("🔧 Creating demo-client manually via direct SQL...");

            // Use direct SQL to bypass AutoMapper issues
            await configurationDbContext.Database.ExecuteSqlRawAsync(@"
                INSERT INTO Clients (Enabled, ClientId, ProtocolType, RequireClientSecret, ClientName, RequireConsent, AllowOfflineAccess, AccessTokenLifetime, RefreshTokenExpiration, SlidingRefreshTokenLifetime, Created, NonEditable)
                VALUES (1, 'demo-client', 'oidc', 1, 'Demo Client', 0, 1, 3600, 1, 2592000, GETUTCDATE(), 0)
            ");

            // Add client details
            await configurationDbContext.Database.ExecuteSqlRawAsync(@"
                DECLARE @ClientPkId INT = (SELECT Id FROM Clients WHERE ClientId = 'demo-client');

                INSERT INTO ClientSecrets (Description, Value, Expiration, Type, Created, ClientId)
                VALUES ('Demo Secret', 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=', NULL, 'SharedSecret', GETUTCDATE(), @ClientPkId);

                INSERT INTO ClientGrantTypes (GrantType, ClientId)
                VALUES ('password', @ClientPkId);

                INSERT INTO ClientScopes (Scope, ClientId)
                VALUES ('openid', @ClientPkId), ('profile', @ClientPkId), ('email', @ClientPkId), ('shopping', @ClientPkId);

                INSERT INTO ClientCorsOrigins (Origin, ClientId)
                VALUES ('http://localhost:6006', @ClientPkId), ('http://localhost:3000', @ClientPkId);
            ");

            Log.Information("✅ demo-client created successfully via SQL");
        }
        catch (Exception ex)
        {
            Log.Error("❌ Failed to create demo-client via SQL: {Error}", ex.Message);
        }
    }

    public static async Task SeedUsers(IServiceProvider serviceProvider)
    {
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // Demo user "swn" - keeping compatibility with current frontend
        var swnUser = await userManager.FindByNameAsync("swn");
        if (swnUser == null)
        {
            Log.Information("👤 Creating demo user 'swn'...");
            swnUser = new ApplicationUser
            {
                UserName = "swn",
                Email = "swn@shopping.com",
                FirstName = "Demo",
                LastName = "User",
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(swnUser, "Password123!");
            if (result.Succeeded)
            {
                await userManager.AddClaimsAsync(swnUser, new[]
                {
                    new Claim("sub", swnUser.Id),
                    new Claim("name", swnUser.FullName),
                    new Claim("given_name", swnUser.FirstName),
                    new Claim("family_name", swnUser.LastName),
                    new Claim("email", swnUser.Email),
                    new Claim("role", "customer")
                });
                Log.Information("✅ Demo user 'swn' created successfully");
            }
            else
            {
                Log.Error("❌ Failed to create demo user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }

        // Admin user
        var adminUser = await userManager.FindByNameAsync("admin");
        if (adminUser == null)
        {
            Log.Information("👤 Creating admin user...");
            adminUser = new ApplicationUser
            {
                UserName = "admin",
                Email = "admin@shopping.com",
                FirstName = "Admin",
                LastName = "User",
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(adminUser, "Admin123!");
            if (result.Succeeded)
            {
                await userManager.AddClaimsAsync(adminUser, new[]
                {
                    new Claim("sub", adminUser.Id),
                    new Claim("name", adminUser.FullName),
                    new Claim("given_name", adminUser.FirstName),
                    new Claim("family_name", adminUser.LastName),
                    new Claim("email", adminUser.Email),
                    new Claim("role", "admin")
                });
                Log.Information("✅ Admin user created successfully");
            }
        }

        // Only keep admin and one demo user - users should register themselves
        Log.Information("✅ Users can now register themselves via the registration system");
    }
}
