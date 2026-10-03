using System.Text.RegularExpressions;
using Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddSingleton<IProductRepository>(_ =>
    new SqliteProductRepository(builder.Configuration["DB_FILE"] ?? "data/store.db"));

var app = builder.Build();
app.UseCors();

app.MapGet("/api/products", (IProductRepository r) => r.All());

app.MapGet("/api/products/{id:int}", (int id, IProductRepository r) =>
    r.Find(id) is { } p ? Results.Ok(p) : Results.NotFound());

app.MapPost("/api/orders", (OrderRequest req, IProductRepository r) =>
{
    if (!Regex.IsMatch(req.Wallet ?? "", "^0x[0-9a-fA-F]{40}$"))
        return Results.BadRequest(new { error = "invalid_wallet" });
    if (req.Items is null || req.Items.Count == 0 || req.Items.Any(i => i.Qty < 1))
        return Results.BadRequest(new { error = "empty_cart" });

    decimal total = 0;
    foreach (var item in req.Items)
    {
        var p = r.Find(item.ProductId);
        if (p is null) return Results.NotFound(new { error = "unknown_product" });
        if (p.Stock < item.Qty) return Results.Conflict(new { error = "out_of_stock", productId = p.Id });
        total += p.PriceEth * item.Qty;
    }
    var id = r.PlaceOrder(req.Wallet!, req.Items, total);
    return Results.Ok(new OrderReceipt(id, total, "0x" + Guid.NewGuid().ToString("N").PadRight(64, '0')));
});

app.Run();

public partial class Program;
