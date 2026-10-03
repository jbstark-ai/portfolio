using Microsoft.Data.Sqlite;

namespace Api;

public sealed class SqliteProductRepository : IProductRepository
{
    private readonly string _cs;

    public SqliteProductRepository(string file)
    {
        if (file != ":memory:") Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(file))!);
        _cs = file == ":memory:" ? "Data Source=store;Mode=Memory;Cache=Shared" : $"Data Source={file}";
        _keepAlive = Open();
        Exec(_keepAlive, """
            CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price_eth TEXT, stock INTEGER, hue INTEGER);
            CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, wallet TEXT, total_eth TEXT);
            """);
        using var count = _keepAlive.CreateCommand();
        count.CommandText = "SELECT COUNT(*) FROM products";
        if ((long)count.ExecuteScalar()! == 0)
            Exec(_keepAlive, """
                INSERT INTO products VALUES
                 (1,'Mushroom Kingdom NFT Pass','Collectibles','0.05',99,0),
                 (2,'Hyrule Hardware Wallet','Gear','0.12',25,140),
                 (3,'Pixel Pal Plushie','Merch','0.02',200,330),
                 (4,'Retro Staking Cartridge','Software','0.08',60,210),
                 (5,'Coin Block Mug','Merch','0.01',150,50);
                """);
    }

    private readonly SqliteConnection _keepAlive;
    private SqliteConnection Open() { var c = new SqliteConnection(_cs); c.Open(); return c; }
    private static void Exec(SqliteConnection c, string sql) { using var cmd = c.CreateCommand(); cmd.CommandText = sql; cmd.ExecuteNonQuery(); }

    private static Product Read(SqliteDataReader r) =>
        new(r.GetInt32(0), r.GetString(1), r.GetString(2), decimal.Parse(r.GetString(3), System.Globalization.CultureInfo.InvariantCulture), r.GetInt32(4), r.GetInt32(5));

    public IReadOnlyList<Product> All()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT id,name,category,price_eth,stock,hue FROM products ORDER BY id";
        using var r = cmd.ExecuteReader();
        var list = new List<Product>();
        while (r.Read()) list.Add(Read(r));
        return list;
    }

    public Product? Find(int id)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT id,name,category,price_eth,stock,hue FROM products WHERE id=$id";
        cmd.Parameters.AddWithValue("$id", id);
        using var r = cmd.ExecuteReader();
        return r.Read() ? Read(r) : null;
    }

    public long PlaceOrder(string wallet, IEnumerable<OrderItem> items, decimal total)
    {
        using var c = Open();
        using var tx = c.BeginTransaction();
        foreach (var i in items)
        {
            using var u = c.CreateCommand();
            u.Transaction = tx;
            u.CommandText = "UPDATE products SET stock = stock - $q WHERE id=$id";
            u.Parameters.AddWithValue("$q", i.Qty);
            u.Parameters.AddWithValue("$id", i.ProductId);
            u.ExecuteNonQuery();
        }
        using var o = c.CreateCommand();
        o.Transaction = tx;
        o.CommandText = "INSERT INTO orders (wallet,total_eth) VALUES ($w,$t); SELECT last_insert_rowid();";
        o.Parameters.AddWithValue("$w", wallet);
        o.Parameters.AddWithValue("$t", total.ToString(System.Globalization.CultureInfo.InvariantCulture));
        var id = (long)o.ExecuteScalar()!;
        tx.Commit();
        return id;
    }
}
