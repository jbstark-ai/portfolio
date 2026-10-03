namespace Api;

public record Product(int Id, string Name, string Category, decimal PriceEth, int Stock, int Hue);
public record OrderItem(int ProductId, int Qty);
public record OrderRequest(string? Wallet, List<OrderItem>? Items);
public record OrderReceipt(long OrderId, decimal TotalEth, string TxHash);

public interface IProductRepository
{
    IReadOnlyList<Product> All();
    Product? Find(int id);
    long PlaceOrder(string wallet, IEnumerable<OrderItem> items, decimal total);
}
