using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Api;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Api.Tests;

/// <summary>Repository mocked from Fixtures/products.json.</summary>
public sealed class JsonProductRepository : IProductRepository
{
    private readonly List<Product> _products = JsonSerializer.Deserialize<List<Product>>(
        File.ReadAllText("Fixtures/products.json"), new JsonSerializerOptions(JsonSerializerDefaults.Web))!;

    public IReadOnlyList<Product> All() => _products;
    public Product? Find(int id) => _products.FirstOrDefault(p => p.Id == id);
    public long PlaceOrder(string wallet, IEnumerable<OrderItem> items, decimal total) => 42;
}

public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private const string Wallet = "0x1111111111111111111111111111111111111111";
    private readonly HttpClient _client;

    public ApiTests(WebApplicationFactory<Program> factory) =>
        _client = factory.WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.RemoveAll<IProductRepository>();
            s.AddSingleton<IProductRepository, JsonProductRepository>();
        })).CreateClient();

    [Fact]
    public async Task Lists_products_from_json_mock()
    {
        var products = await _client.GetFromJsonAsync<List<Product>>("/api/products");
        Assert.Equal(2, products!.Count);
    }

    [Fact]
    public async Task Unknown_product_is_404() =>
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/products/99")).StatusCode);

    [Fact]
    public async Task Order_total_is_sum_of_prices()
    {
        var res = await _client.PostAsJsonAsync("/api/orders",
            new OrderRequest(Wallet, [new(1, 1), new(2, 3)]));
        var receipt = await res.Content.ReadFromJsonAsync<OrderReceipt>();
        Assert.Equal(0.08m, receipt!.TotalEth);
    }

    [Fact]
    public async Task Rejects_bad_wallet() =>
        Assert.Equal(HttpStatusCode.BadRequest,
            (await _client.PostAsJsonAsync("/api/orders", new OrderRequest("nope", [new(1, 1)]))).StatusCode);

    [Fact]
    public async Task Rejects_out_of_stock() =>
        Assert.Equal(HttpStatusCode.Conflict,
            (await _client.PostAsJsonAsync("/api/orders", new OrderRequest(Wallet, [new(1, 5)]))).StatusCode);
}

public class SqliteRepositoryTests
{
    [Fact]
    public void Seeds_and_decrements_stock()
    {
        var repo = new SqliteProductRepository(":memory:");
        var before = repo.Find(1)!.Stock;
        repo.PlaceOrder("0x1", [new(1, 2)], 0.1m);
        Assert.Equal(before - 2, repo.Find(1)!.Stock);
    }
}
