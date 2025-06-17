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
            new Coupon { Id = 1, ProductName = "IPhone X", Description = "IPhone Discount", Amount = 150 },
            new Coupon { Id = 2, ProductName = "Samsung 10", Description = "Samsung Discount", Amount = 100 },
            new Coupon { Id = 3, ProductName = "Oyuncak Araba", Description = "Oyuncak Araba İndirimi", Amount = 50 },
            new Coupon { Id = 4, ProductName = "Ferrari Oyuncak", Description = "Ferrari Oyuncak Araba İndirimi", Amount = 50 },
            new Coupon { Id = 5, ProductName = "BMW Oyuncak", Description = "BMW Oyuncak Araba İndirimi", Amount = 50 },
            new Coupon { Id = 6, ProductName = "Mercedes Oyuncak", Description = "Mercedes Oyuncak Araba İndirimi", Amount = 50 }
            );
    }
}
