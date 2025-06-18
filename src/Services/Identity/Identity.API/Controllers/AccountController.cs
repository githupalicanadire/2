using Identity.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace Identity.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AccountController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ILogger<AccountController> _logger;
    private readonly IConfiguration _configuration;

    public AccountController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ILogger<AccountController> logger,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _logger = logger;
        _configuration = configuration;
    }

    private string GenerateJwtToken(ApplicationUser user, IList<Claim> claims)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            jwtSettings["SecretKey"] ?? "YourSuperSecretKeyThatIsAtLeast256BitsLong!"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenClaims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new("username", user.UserName ?? ""),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new(JwtRegisteredClaimNames.Name, user.FullName)
        };

        // Add user claims (exclude any that might conflict with standard claims)
        var additionalClaims = claims.Where(c =>
            !c.Type.Equals(JwtRegisteredClaimNames.Sub, StringComparison.OrdinalIgnoreCase) &&
            !c.Type.Equals(JwtRegisteredClaimNames.Email, StringComparison.OrdinalIgnoreCase) &&
            !c.Type.Equals(JwtRegisteredClaimNames.Name, StringComparison.OrdinalIgnoreCase) &&
            !c.Type.Equals(JwtRegisteredClaimNames.GivenName, StringComparison.OrdinalIgnoreCase) &&
            !c.Type.Equals(JwtRegisteredClaimNames.FamilyName, StringComparison.OrdinalIgnoreCase));
        tokenClaims.AddRange(additionalClaims);

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"] ?? "https://localhost:6007",
            audience: jwtSettings["Audience"] ?? "shopping-spa",
            claims: tokenClaims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(jwtSettings["ExpirationMinutes"] ?? "60")),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _userManager.FindByNameAsync(request.Username);
        if (user == null)
        {
            return BadRequest(new { message = "Invalid username or password" });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Invalid username or password" });
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        // Get user claims
        var userClaims = await _userManager.GetClaimsAsync(user);

        // Generate JWT token
        var token = GenerateJwtToken(user, userClaims);

        _logger.LogInformation("User {Username} logged in successfully", request.Username);

        return Ok(new
        {
            message = "Login successful",
            token = token,
            user = new
            {
                id = user.Id,
                username = user.UserName,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                fullName = user.FullName
            }
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existingUser = await _userManager.FindByNameAsync(request.Username);
        if (existingUser != null)
        {
            return BadRequest(new { message = "Username already exists" });
        }

        existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return BadRequest(new { message = "Email already exists" });
        }

        var user = new ApplicationUser
        {
            UserName = request.Username,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Failed to create user", errors = result.Errors });
        }

        // Add default claims
        await _userManager.AddClaimsAsync(user, new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Name, user.FullName),
            new Claim(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new Claim(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("role", "customer")
        });

        _logger.LogInformation("User {Username} registered successfully", request.Username);

        return Ok(new
        {
            message = "Registration successful",
            user = new
            {
                id = user.Id,
                username = user.UserName,
                email = user.Email,
                fullName = user.FullName
            }
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        _logger.LogInformation("User logged out");
        return Ok(new { message = "Logout successful" });
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        _logger.LogInformation("Getting profile for user. Claims: {Claims}",
            string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));

        var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("No sub claim found in token");
            return BadRequest(new { message = "User ID not found" });
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        return Ok(new
        {
            id = user.Id,
            username = user.UserName,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            fullName = user.FullName,
            createdAt = user.CreatedAt,
            lastLoginAt = user.LastLoginAt
        });
    }

    [HttpGet("test-jwt")]
    public IActionResult TestJwt()
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            jwtSettings["SecretKey"] ?? "YourSuperSecretKeyThatIsAtLeast256BitsLong!"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenClaims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Sub, "test-user-id"),
            new("username", "testuser"),
            new(JwtRegisteredClaimNames.Email, "test@test.com"),
            new(JwtRegisteredClaimNames.Name, "Test User")
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"] ?? "https://localhost:6007",
            audience: jwtSettings["Audience"] ?? "shopping-spa",
            claims: tokenClaims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(jwtSettings["ExpirationMinutes"] ?? "60")),
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        _logger.LogInformation("Generated test JWT: {Token}", tokenString);

        return Ok(new { token = tokenString, message = "Test JWT generated successfully" });
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
