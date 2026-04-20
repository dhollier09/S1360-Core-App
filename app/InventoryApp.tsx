"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type ItemRow } from "@/lib/supabase";
import AuthForm from "./AuthForm";

type Item = ItemRow;

const emptyForm: Omit<Item, "id" | "created_at" | "user_id"> = {
  name: "",
  sku: "",
  category: "",
  quantity: 0,
  price: 0,
  threshold: 5,
};

export default function InventoryApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Item, "id" | "created_at" | "user_id">>(emptyForm);

  // Subscribe to auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    if (!session) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems((data as Item[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (session) load();
    else setItems([]);
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q) && !i.sku.toLowerCase().includes(q)) return false;
      if (category && i.category !== category) return false;
      if (lowOnly && i.quantity > i.threshold) return false;
      return true;
    });
  }, [items, search, category, lowOnly]);

  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const lowStockCount = items.filter((i) => i.quantity <= i.threshold).length;

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    const { id: _id, created_at: _c, user_id: _u, ...rest } = item;
    setForm(rest);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || saving || !session) return;
    setSaving(true);
    setError(null);
    if (editing) {
      const { error } = await supabase.from("items").update(form).eq("id", editing.id);
      if (error) setError(error.message);
      else {
        setItems((prev) => prev.map((i) => (i.id === editing.id ? { ...i, ...form } : i)));
        closeForm();
      }
    } else {
      const payload = { ...form, user_id: session.user.id };
      const { data, error } = await supabase.from("items").insert(payload).select().single();
      if (error) setError(error.message);
      else {
        setItems((prev) => [data as Item, ...prev]);
        closeForm();
      }
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    const prev = items;
    setItems((items) => items.filter((i) => i.id !== id));
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setItems(prev);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function numberField(key: "quantity" | "price" | "threshold") {
    return (
      <input
        type="number"
        min="0"
        step={key === "price" ? "0.01" : "1"}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
      />
    );
  }

  if (!authReady) {
    return <div className="empty" style={{ margin: 40 }}>Loading…</div>;
  }

  if (!session) {
    return <AuthForm />;
  }

  return (
    <div className="container">
      <header>
        <div>
          <h1>Inventory Manager</h1>
          <div className="subtitle">
            Signed in as {session.user.email}{" "}
            <button type="button" className="ghost" onClick={signOut} style={{ marginLeft: 8 }}>
              Sign out
            </button>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="label">Items</div>
            <div className="value">{items.length}</div>
          </div>
          <div className="stat">
            <div className="label">Total value</div>
            <div className="value">${totalValue.toFixed(2)}</div>
          </div>
          <div className={`stat ${lowStockCount > 0 ? "alert" : ""}`}>
            <div className="label">Low stock</div>
            <div className="value">{lowStockCount}</div>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button className="ghost" onClick={() => setError(null)} type="button">
            Dismiss
          </button>
        </div>
      )}

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          className={lowOnly ? "primary" : "ghost"}
          onClick={() => setLowOnly((v) => !v)}
          type="button"
        >
          {lowOnly ? "Showing low stock" : "Low stock only"}
        </button>
        <button className="ghost" onClick={load} type="button" disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
        <button className="primary" onClick={openNew} type="button">
          + Add item
        </button>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {items.length === 0
            ? "No items yet. Click “Add item” to get started."
            : "No items match your filters."}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Value</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const low = i.quantity <= i.threshold;
              return (
                <tr key={i.id} className={low ? "low-stock" : ""}>
                  <td>{i.name}</td>
                  <td>{i.sku}</td>
                  <td>{i.category}</td>
                  <td className={low ? "qty-low" : ""}>{i.quantity}</td>
                  <td>${i.price.toFixed(2)}</td>
                  <td>${(i.quantity * i.price).toFixed(2)}</td>
                  <td>
                    <div className="actions">
                      <button className="ghost" onClick={() => openEdit(i)} type="button">
                        Edit
                      </button>
                      <button className="danger" onClick={() => remove(i.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? "Edit item" : "Add item"}</h2>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field full">
                  <label>Name</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label>Quantity</label>
                  {numberField("quantity")}
                </div>
                <div className="field">
                  <label>Price ($)</label>
                  {numberField("price")}
                </div>
                <div className="field full">
                  <label>Low-stock threshold</label>
                  {numberField("threshold")}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
