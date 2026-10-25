import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

describe("SQLite stock reservation transactions", () => {
  let db: DatabaseSync
  beforeEach(() => {
    db = new DatabaseSync(":memory:")
    for (const migration of ["0001_init.sql", "0002_test_orders.sql", "0003_item_stock.sql", "0004_stock_guards.sql"]) {
      db.exec(readFileSync(new URL(`../../migrations/${migration}`, import.meta.url), "utf8"))
    }
    db.exec("INSERT INTO categories (id,group_id,label,icon_key) VALUES ('drinks','drinks','Drinks','coffee')")
    db.exec("INSERT INTO items (id,category_id,name,description,price,stock_quantity) VALUES ('water','drinks','Water','Bottle','10 lei',2)")
    db.exec("INSERT INTO items (id,category_id,name,description,price) VALUES ('coffee','drinks','Coffee','Cup','12 lei')")
  })
  afterEach(() => db.close())

  const quantity = () => db.prepare("SELECT stock_quantity FROM items WHERE id='water'").get()?.stock_quantity
  function create(number: string, reservations: [string, number][], key = number) {
    db.exec("BEGIN")
    try {
      db.prepare(`INSERT INTO test_orders (number,idempotency_key,request_hash,created_at,contact_name,contact_phone,contact_email,total_bani,lines_json)
        VALUES (?,?,'hash','2026-10-24','Test','0721123456','test@example.ro',1000,'[]') ON CONFLICT(idempotency_key) DO NOTHING`).run(number, key)
      for (const [id, amount] of reservations) {
        db.prepare("INSERT INTO test_order_stock (order_number,item_id,quantity) SELECT number,?,? FROM test_orders WHERE number=?").run(id, amount, number)
      }
      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  }

  it("decrements once and an identical key retry cannot reserve again", () => {
    create("first", [["water", 1]])
    create("retry", [["water", 1]], "first")
    expect(quantity()).toBe(1)
    expect(db.prepare("SELECT count(*) AS count FROM test_orders").get()?.count).toBe(1)
  })
  it("refuses the next order once the last units have been reserved", () => {
    create("first", [["water", 2]])
    expect(() => create("second", [["water", 1]])).toThrow("STOCK_UNAVAILABLE")
    expect(quantity()).toBe(0)
    expect(db.prepare("SELECT number FROM test_orders WHERE number='second'").get()).toBeUndefined()
  })
  it("rolls back the entire order when any product is unavailable", () => {
    db.exec("UPDATE items SET is_available=0 WHERE id='coffee'")
    expect(() => create("failed", [["water", 1], ["coffee", 1]])).toThrow("STOCK_UNAVAILABLE")
    expect(quantity()).toBe(2)
    expect(db.prepare("SELECT count(*) AS count FROM test_order_stock").get()?.count).toBe(0)
  })
  it("restores quantities exactly once on cancellation, not on preparation updates", () => {
    create("first", [["water", 2]])
    db.exec("UPDATE test_orders SET preparation_status='preparing' WHERE number='first'")
    expect(quantity()).toBe(0)
    db.exec("UPDATE test_orders SET preparation_status='cancelled' WHERE number='first'")
    expect(quantity()).toBe(2)
    db.exec("UPDATE test_orders SET preparation_status='cancelled' WHERE number='first'")
    expect(quantity()).toBe(2)
  })
  it("does not count untracked products, and prevents tracking mode changes during active orders", () => {
    create("first", [["coffee", 10], ["water", 1]])
    expect(db.prepare("SELECT stock_quantity FROM items WHERE id='coffee'").get()?.stock_quantity).toBeNull()
    expect(() => db.exec("UPDATE items SET stock_quantity=5 WHERE id='coffee'")).toThrow("STOCK_MODE_CONFLICT")
    expect(() => db.exec("UPDATE items SET stock_quantity=NULL WHERE id='water'")).toThrow("STOCK_MODE_CONFLICT")
    db.exec("UPDATE test_orders SET preparation_status='cancelled' WHERE number='first'")
    expect(quantity()).toBe(2)
    db.exec("UPDATE items SET stock_quantity=5 WHERE id='coffee'")
  })
  it("rejects numeric stock on a bottle/glass price even at the database boundary", () => {
    expect(() => db.exec("UPDATE items SET price='100 / 28 lei' WHERE id='water'")).toThrow("VARIANT_STOCK_NOT_SUPPORTED")
    db.exec("UPDATE items SET price='100 / 28 lei' WHERE id='coffee'")
    expect(() => db.exec("UPDATE items SET stock_quantity=3 WHERE id='coffee'")).toThrow("VARIANT_STOCK_NOT_SUPPORTED")
  })
})
