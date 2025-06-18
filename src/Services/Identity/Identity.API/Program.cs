using Identity.API.Data;
using Identity.API.Models;
using Identity.API.Configuration;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using IdentityServer4.EntityFramework.DbContexts;
using IdentityServer4.EntityFramework.Mappers;
using Serilog;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

var migrationsAssembly = typeof(Program).Assembly.GetName().Name;

builder.Services.AddIdentityServer(options =>
{
    options.Events.RaiseErrorEvents = true;
    options.Events.RaiseInformationEvents = true;
    options.Events.RaiseFailureEvents = true;
    options.Events.RaiseSuccessEvents = true;
    options.EmitStaticAudienceClaim = true;
})
.AddConfigurationStore(options =>
{
    options.ConfigureDbContext = b => b.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.MigrationsAssembly(migrationsAssembly));
    options.DefaultSchema = "dbo";
})
.AddOperationalStore(options =>
{
    options.ConfigureDbContext = b => b.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.MigrationsAssembly(migrationsAssembly));
    options.DefaultSchema = "dbo";
})
.AddAspNetIdentity<ApplicationUser>()
.AddDeveloperSigningCredential(); // For development only

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");

// Clear default mappings that can cause issues with standard JWT claims
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtSettings["SecretKey"] ?? "")),
        ClockSkew = TimeSpan.Zero,
        NameClaimType = JwtRegisteredClaimNames.Name,
        RoleClaimType = "role"
    };

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Log.Warning("JWT Authentication failed: {Error}", context.Exception.Message);
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Log.Information("JWT Token validated successfully for user: {User}",
                context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? "unknown");
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:6006", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });

    // More permissive policy for development
    options.AddPolicy("DevelopmentCors", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Add Controllers
builder.Services.AddControllers();

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!);

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

if (app.Environment.IsDevelopment())
{
    app.UseCors("DevelopmentCors");
}
else
{
    app.UseCors("CorsPolicy");
}

app.UseStaticFiles();
app.UseRouting();

app.UseIdentityServer();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

// Initialize Database
await InitializeDatabase(app);

Log.Information("🔐 Identity Server starting up...");
app.Run();

async Task InitializeDatabase(WebApplication app)
{
    using var serviceScope = app.Services.CreateScope();

    // Retry logic for database connection
    var maxRetries = 30;
    var retryDelay = TimeSpan.FromSeconds(2);

    for (int retry = 0; retry < maxRetries; retry++)
    {
        try
        {
            Log.Information("🔄 Attempting to connect to database (attempt {Retry}/{MaxRetries})", retry + 1, maxRetries);

            // Migrate the databases in correct order
            Log.Information("📊 Migrating ApplicationDbContext...");
            var context = serviceScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await context.Database.MigrateAsync();

            Log.Information("📊 Migrating PersistedGrantDbContext...");
            var persistedGrantDbContext = serviceScope.ServiceProvider.GetRequiredService<PersistedGrantDbContext>();
            await persistedGrantDbContext.Database.EnsureCreatedAsync();

            Log.Information("📊 Migrating ConfigurationDbContext...");
            var configurationDbContext = serviceScope.ServiceProvider.GetRequiredService<ConfigurationDbContext>();
            await configurationDbContext.Database.EnsureCreatedAsync();

            Log.Information("🌱 Starting data seeding...");
            // Seed data
            await SeedData.EnsureSeedData(serviceScope.ServiceProvider);

            Log.Information("✅ Database initialization completed successfully");
            return;
        }
        catch (Exception ex)
        {
            Log.Warning("⚠️ Database connection failed (attempt {Retry}/{MaxRetries}): {Error}",
                retry + 1, maxRetries, ex.Message);

            if (retry == maxRetries - 1)
            {
                Log.Error("❌ Failed to connect to database after {MaxRetries} attempts", maxRetries);
                throw;
            }

            await Task.Delay(retryDelay);
        }
    }
}
