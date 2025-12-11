using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RSVP.Core.Models;

namespace RSVP.Infrastracture
{
    public class RsvpDbContext : DbContext
    {
        public RsvpDbContext() { }

        public RsvpDbContext(DbContextOptions<RsvpDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }

        public DbSet<Invite> Invites{ get; set; }

        public DbSet<Guest> Guests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Password).IsRequired();
                entity.Property(e => e.Role).HasMaxLength(20).HasDefaultValue("user");
                entity.Property(e => e.CreatedDateTime).HasDefaultValueSql("GETUTCDATE()");
                entity.Property(e => e.ModifiedDateTime);

                entity.HasData(
                        new User
                        {
                            UserId = Guid.Parse("CFBC2309-BE93-461E-D286-08DE2DBC0FE5"),
                            Username = "admin",
                            Password = "AQAAAAIAAYagAAAAEM3FttS8yf1q9mZTsKc4hjfrb0j5fSOtZZ/vBM9HARp+8SjFS0HlNojuqmxE2hfR5Q==",
                            Role = "admin",
                            CreatedDateTime = new DateTime(2025, 11,28)
                        }
                    );
            });

            modelBuilder.Entity<Invite>(entity =>
            {
                entity.HasKey(e => e.InviteId);
                entity.Property(e => e.InviteName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.CreatedDateTime).HasDefaultValueSql("GETUTCDATE()");

                entity.HasMany(i => i.Guests)
                     .WithOne(g => g.Invite)
                     .HasForeignKey(g => g.InviteId)
                     .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<Guest>(entity =>
            {
                entity.HasKey(e => e.GuestId);
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.IsAttending);
                entity.Property(e => e.InviteId);
                entity.Property(e => e.CreatedDateTime).HasDefaultValueSql("GETUTCDATE()");
            });
        }
    }
}
