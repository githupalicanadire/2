using Discount.Grpc.Models;
using Microsoft.EntityFrameworkCore;

namespace Discount.Grpc.Data;

public class DiscountContext : DbContext
{
    public DbSet<Coupon> Coupons { get; set; } = default!;

    public DiscountContext(DbContextOptions<DiscountContext> options)
       : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Coupon>().HasData(
            new Coupon { Id = 1, ProductName = "1:24 Lamborghini Sian FKP 37 Model Araba (Yeşil)", Description = "Lamborghini Model Araba İndirimi", Amount = 20 },
            new Coupon { Id = 2, ProductName = "LEGO Technic Ferrari SF-24 F1 Araba", Description = "LEGO Ferrari F1 Araba İndirimi", Amount = 20 }
            );
    }
}
