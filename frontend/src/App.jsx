import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken } from './api';
import './index.css';

const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'THB' });
const dateTime = value => value ? new Date(value).toLocaleString() : '—';
const escapeHtml = value => String(value ?? '').replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
const initialLogin = { username: '', password: '' };

function App() {
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState(initialLogin);
  const [loginError, setLoginError] = useState('');
  const [active, setActive] = useState('Dashboard');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [report, setReport] = useState(null);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10));
  const [cart, setCart] = useState({});
  const [saleKey, setSaleKey] = useState(() => crypto.randomUUID());
  const [processingSale, setProcessingSale] = useState(false);
  const [stockCheck, setStockCheck] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [productForm, setProductForm] = useState({ product_name: '', category_id: '', selling_price: '', description: '' });
  const [categoryForm, setCategoryForm] = useState({ category_name: '', description: '' });
  const [editingProduct, setEditingProduct] = useState(null);
  const [ingredientForm, setIngredientForm] = useState({ ingredient_name: '', base_unit: 'g', minimum_stock: '0' });
  const [movementForm, setMovementForm] = useState({ ingredient_id: '', movement_type: 'purchase', quantity: '', quantity_change: '', note: '' });
  const [recipeProduct, setRecipeProduct] = useState('');
  const [recipeItems, setRecipeItems] = useState([{ ingredient_id: '', quantity_required: '' }]);
  const [staffForm, setStaffForm] = useState({ username: '', full_name: '', password: '', role: 'cashier' });
  const [refundForm, setRefundForm] = useState({ order_id: '', amount: '', reason: '' });
  const [search, setSearch] = useState('');

  const manager = user?.role === 'manager';
  const flash = (message = '') => { setNotice(message); setError(''); };
  const fail = message => { setError(message); setNotice(''); };

  const loadCore = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [ps, cs, os] = await Promise.all([api('/products'), api('/categories'), api('/orders')]);
      setProducts(ps); setCategories(cs); setOrders(os);
    } catch (e) { fail(e.message); }
  }, []);
  const loadManagerData = useCallback(async () => {
    if (!getToken() || user?.role !== 'manager') return;
    try {
      const [ins, us, ms, rep] = await Promise.all([
        api('/ingredients'), api('/management/users'), api('/management/stock-movements'),
        api(`/management/reports/summary?from=${dateFrom}&to=${dateTo}`)
      ]);
      setIngredients(ins); setUsers(us); setMovements(ms); setReport(rep);
    } catch (e) { fail(e.message); }
  }, [user, dateFrom, dateTo]);

  useEffect(() => {
    if (!token) return;
    api('/me').then(data => { setUser(data.user); if (data.user.role === 'cashier') setActive('Point of Sale'); }).catch(() => { clearToken(); setTokenState(null); setUser(null); });
  }, [token]);
  useEffect(() => { if (user) loadCore(); }, [user, loadCore]);
  useEffect(() => { if (manager) loadManagerData(); }, [manager, loadManagerData]);

  async function submitLogin(e) {
    e.preventDefault(); setLoginError('');
    try {
      const data = await api('/login', { method: 'POST', body: JSON.stringify(login) });
      setToken(data.token); setTokenState(data.token); setUser(data.user); setActive(data.user.role === 'manager' ? 'Dashboard' : 'Point of Sale');
    } catch (e) { setLoginError(e.message); }
  }
  function logout() { clearToken(); setTokenState(null); setUser(null); setProducts([]); setCart({}); }

  const cartLines = useMemo(() => Object.entries(cart).map(([id, quantity]) => ({ product: products.find(p => p.product_id === Number(id)), quantity })).filter(x => x.product && x.quantity > 0), [cart, products]);
  const cartTotal = cartLines.reduce((sum, x) => sum + Number(x.product.selling_price) * x.quantity, 0);
  function changeCart(id, delta) { setCart(old => { const next = { ...old, [id]: Math.max(0, (old[id] || 0) + delta) }; if (!next[id]) delete next[id]; return next; }); setSaleKey(crypto.randomUUID()); setStockCheck(null); setLastReceipt(null); }

  async function confirmCashSale() {
    if (processingSale || cartLines.length === 0) return;
    setProcessingSale(true);
    try {
      const items = cartLines.map(x => ({ product_id: x.product.product_id, quantity: x.quantity }));
      const check = await api('/orders/check-stock', { method: 'POST', body: JSON.stringify({ items }) });
      setStockCheck(check);
      if (!check.available) { fail(`Insufficient ingredients: ${check.shortages.map(s => `${s.ingredient_name} (${Number(s.shortage).toFixed(3)} ${s.unit} short)`).join(', ')}`); return; }
      const sale = await api('/orders/sale', { method: 'POST', headers: { 'Idempotency-Key': saleKey }, body: JSON.stringify({ items }) });
      const receipt = await api(`/orders/${sale.order_id}/receipt`);
      setLastReceipt(receipt); setCart({}); setSaleKey(crypto.randomUUID()); setStockCheck(null); flash(`Sale ${sale.order_number} recorded successfully.`);
      await loadCore(); await loadManagerData();
    } catch (e) { fail(e.message); } finally { setProcessingSale(false); }
  }
  function printReceipt(receipt = lastReceipt) {
    if (!receipt) return;
    const w = window.open('', '_blank', 'width=420,height=650');
    if (!w) { fail('Allow pop-ups to print the receipt.'); return; }
    const o = receipt.order;
    w.document.write(`<!doctype html><html><head><title>Receipt ${escapeHtml(o.order_number)}</title><style>body{font:14px Arial,sans-serif;max-width:340px;margin:24px auto;color:#111}h2,p{text-align:center;margin:6px 0}.line{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px dashed #bbb}.total{font-weight:bold;border-top:1px solid #111;margin-top:12px;padding-top:12px}small{color:#555}</style></head><body><h2>Coffee Shop</h2><p>Sales Receipt</p><p>${escapeHtml(o.order_number)}</p><small>Time: ${escapeHtml(dateTime(o.paid_at))}<br>Cashier: ${escapeHtml(o.cashier_name)}</small><hr>${receipt.items.map(i=>`<div class="line"><span>${escapeHtml(i.product_name_snapshot)} × ${Number(i.quantity)}</span><span>${money(i.line_total)}</span></div>`).join('')}<div class="line total"><span>Total paid</span><span>${money(o.total_amount)}</span></div><p>Payment: Cash</p><p>Thank you</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }
  async function addProduct(e) {
    e.preventDefault(); try { await api('/products',{method:'POST',body:JSON.stringify(productForm)}); setProductForm({product_name:'',category_id:'',selling_price:'',description:''}); flash('Product created. Configure its recipe before selling.'); await loadCore(); } catch(e){fail(e.message);} 
  }
  async function addCategory(e) {
    e.preventDefault(); try { await api('/categories',{method:'POST',body:JSON.stringify(categoryForm)}); setCategoryForm({category_name:'',description:''}); flash('Category created.'); await loadCore(); } catch(e){fail(e.message);}
  }
  async function saveProductEdit(e) {
    e.preventDefault(); try { await api(`/products/${editingProduct.product_id}`,{method:'PUT',body:JSON.stringify({product_name:editingProduct.product_name,category_id:editingProduct.category_id,selling_price:editingProduct.selling_price,description:editingProduct.description})}); setEditingProduct(null); flash('Product updated. Historical sales remain unchanged.'); await loadCore(); } catch(e){fail(e.message);}
  }
  async function addIngredient(e) {
    e.preventDefault(); try { await api('/ingredients',{method:'POST',body:JSON.stringify(ingredientForm)}); setIngredientForm({ingredient_name:'',base_unit:'g',minimum_stock:'0'}); flash('Ingredient created. Add opening stock using a purchase movement.'); await loadManagerData(); } catch(e){fail(e.message);} 
  }
  async function addMovement(e) {
    e.preventDefault(); try { const body={ingredient_id:movementForm.ingredient_id,movement_type:movementForm.movement_type,note:movementForm.note}; if(movementForm.movement_type==='adjustment') body.quantity_change=movementForm.quantity_change; else body.quantity=movementForm.quantity; await api('/inventory/movement',{method:'POST',body:JSON.stringify(body)}); setMovementForm({...movementForm,quantity:'',quantity_change:'',note:''}); flash('Inventory movement saved.'); await loadManagerData(); } catch(e){fail(e.message);} 
  }
  async function saveRecipe(e) {
    e.preventDefault(); try { const items=recipeItems.filter(x=>x.ingredient_id&&x.quantity_required); await api(`/recipes/${recipeProduct}`,{method:'PUT',body:JSON.stringify({items})}); flash('Recipe saved.'); } catch(e){fail(e.message);} 
  }
  async function loadRecipe(productId) {
    setRecipeProduct(productId); if(!productId) {setRecipeItems([{ingredient_id:'',quantity_required:''}]);return;}
    try { const items=await api(`/recipes/${productId}`); setRecipeItems(items.length?items.map(x=>({ingredient_id:String(x.ingredient_id),quantity_required:String(x.quantity_required)})):[{ingredient_id:'',quantity_required:''}]); } catch(e){fail(e.message);}
  }
  async function addStaff(e) {
    e.preventDefault(); try { await api('/management/users',{method:'POST',body:JSON.stringify(staffForm)}); setStaffForm({username:'',full_name:'',password:'',role:'cashier'}); flash('Employee account created.'); await loadManagerData(); } catch(e){fail(e.message);} 
  }
  async function toggleUser(u) { try { await api(`/management/users/${u.user_id}/active`,{method:'PATCH',body:JSON.stringify({is_active:!u.is_active})}); flash('Employee account updated.'); await loadManagerData(); } catch(e){fail(e.message);} }
  async function changeOrderStatus(order,status) { let reason=''; if(status==='cancelled'){reason=window.prompt('Cancellation reason:')||'';if(!reason.trim())return;} try { await api(`/orders/${order.order_id}/status`,{method:'PATCH',body:JSON.stringify({status,reason})}); flash('Order status updated.'); await loadCore(); } catch(e){fail(e.message);} }
  async function submitRefund(e) { e.preventDefault(); try { await api('/management/refunds',{method:'POST',body:JSON.stringify(refundForm)}); setRefundForm({order_id:'',amount:'',reason:''}); flash('Refund recorded.'); await loadCore(); await loadManagerData(); } catch(e){fail(e.message);} }
  async function loadReceipt(order) { try { const receipt=await api(`/orders/${order.order_id}/receipt`);setLastReceipt(receipt);printReceipt(receipt); }catch(e){fail(e.message);} }

  if (!token || !user) return <main className="login-shell"><section className="login-card"><div className="brand-mark">CS</div><h1>Coffee Shop</h1><p className="muted">Management System</p><form onSubmit={submitLogin} className="stack"><label>Username<input autoComplete="username" value={login.username} onChange={e=>setLogin({...login,username:e.target.value})} required /></label><label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required /></label>{loginError&&<p className="error">{loginError}</p>}<button className="primary" type="submit">Sign in</button></form><p className="hint">Create the first manager account using the setup instructions in README.md.</p></section></main>;

  const nav = manager ? ['Dashboard','Point of Sale','Products','Inventory','Recipes','Orders','Employees','Reports'] : ['Point of Sale','Orders'];
  const filteredProducts=products.filter(p=>`${p.product_name} ${p.category_name}`.toLowerCase().includes(search.toLowerCase()));
  const todaySales=orders.filter(o=>o.payment_status==='paid'&&String(o.paid_at||o.created_at).slice(0,10)===new Date().toISOString().slice(0,10)).reduce((sum,o)=>sum+Number(o.total_amount),0);

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">CS</div><div><strong>Coffee Shop</strong><span>Management</span></div></div><nav>{nav.map(item=><button key={item} className={active===item?'nav-item active':'nav-item'} onClick={()=>{setActive(item);flash('');}}>{item}</button>)}</nav><div className="sidebar-bottom"><div className="user-summary"><strong>{user.full_name}</strong><span>{user.role}</span></div><button className="logout-button" onClick={logout}>Sign out</button></div></aside>
    <main className="main-area"><header className="page-header"><div><p className="eyebrow">COFFEE SHOP MANAGEMENT SYSTEM</p><h1>{active}</h1></div><div className="header-user"><span className="status-dot"/> Signed in as <strong>{user.username}</strong></div></header>
      {notice&&<div className="notice success">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss">×</button></div>}{error&&<div className="notice danger">{error}<button onClick={()=>setError('')} aria-label="Dismiss">×</button></div>}
      {active==='Dashboard'&&manager&&<section className="content-grid"><div className="metric"><span>Today's sales</span><strong>{money(todaySales)}</strong><small>Confirmed cash payments</small></div><div className="metric"><span>Orders loaded</span><strong>{orders.length}</strong><small>Latest 200 orders</small></div><div className="metric"><span>Active products</span><strong>{products.length}</strong><small>Including temporarily unavailable</small></div><div className="panel span-all"><div className="panel-heading"><div><h2>Recent orders</h2><p>Latest recorded sales</p></div><button className="secondary" onClick={()=>setActive('Orders')}>View all orders</button></div><OrdersTable orders={orders.slice(0,8)} onReceipt={loadReceipt} onStatus={changeOrderStatus}/></div></section>}
      {active==='Point of Sale'&&<section className="pos-layout"><div className="panel"><div className="panel-heading"><div><h2>Products</h2><p>Select items to add to the sale</p></div><input className="search" placeholder="Search products" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="product-list">{filteredProducts.map(p=><article className={`product-tile ${!p.is_available||!p.has_recipe?'disabled':''}`} key={p.product_id}><div><span className="product-category">{p.category_name}</span><h3>{p.product_name}</h3><strong>{money(p.selling_price)}</strong>{!p.has_recipe&&<small className="warning-text">Recipe not configured</small>}{!p.is_available&&<small className="muted">Temporarily unavailable</small>}</div><button disabled={!p.is_available||!p.has_recipe} onClick={()=>changeCart(p.product_id,1)}>Add</button></article>)}</div></div><div className="panel cart-panel"><div className="panel-heading"><div><h2>Current sale</h2><p>Cash payment only</p></div></div>{cartLines.length===0?<div className="empty-state">No products added yet.</div>:<><div className="cart-lines">{cartLines.map(x=><div className="cart-line" key={x.product.product_id}><div><strong>{x.product.product_name}</strong><span>{money(x.product.selling_price)} each</span></div><div className="quantity-control"><button onClick={()=>changeCart(x.product.product_id,-1)} aria-label="Decrease quantity">−</button><span>{x.quantity}</span><button onClick={()=>changeCart(x.product.product_id,1)} aria-label="Increase quantity">+</button></div><strong>{money(Number(x.product.selling_price)*x.quantity)}</strong></div>)}</div><div className="cart-total"><span>Total</span><strong>{money(cartTotal)}</strong></div><button className="primary full-width" disabled={processingSale||cartLines.length===0} onClick={confirmCashSale}>{processingSale?'Processing…':'Confirm cash payment'}</button><p className="hint">Stock is checked before confirmation and rechecked during payment.</p></>}{lastReceipt&&<button className="secondary full-width" onClick={()=>printReceipt(lastReceipt)}>Print last receipt again</button>}</div></section>}
      {active==='Products'&&manager&&<section className="panel"><div className="panel-heading"><div><h2>Product catalogue</h2><p>Cashiers cannot change product prices.</p></div></div><form className="form-grid" onSubmit={addProduct}><label>Product name<input value={productForm.product_name} onChange={e=>setProductForm({...productForm,product_name:e.target.value})} required maxLength="120"/></label><label>Category<select value={productForm.category_id} onChange={e=>setProductForm({...productForm,category_id:e.target.value})} required><option value="">Select category</option>{categories.map(c=><option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}</select></label><label>Selling price<input type="number" min="0" step="0.01" value={productForm.selling_price} onChange={e=>setProductForm({...productForm,selling_price:e.target.value})} required/></label><label>Description<input value={productForm.description} onChange={e=>setProductForm({...productForm,description:e.target.value})} maxLength="255"/></label><div className="form-actions"><button className="primary" type="submit">Add product</button></div></form><div className="subsection"><h3>Add category</h3><form className="form-grid compact-form" onSubmit={addCategory}><label>Category name<input value={categoryForm.category_name} onChange={e=>setCategoryForm({...categoryForm,category_name:e.target.value})} required maxLength="100"/></label><label>Description<input value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})} maxLength="255"/></label><div className="form-actions"><button className="secondary" type="submit">Add category</button></div></form></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Recipe</th><th>Availability</th><th>Action</th></tr></thead><tbody>{products.map(p=><tr key={p.product_id}>{editingProduct?.product_id===p.product_id?<><td><input aria-label="Product name" value={editingProduct.product_name} onChange={e=>setEditingProduct({...editingProduct,product_name:e.target.value})}/></td><td><select aria-label="Category" value={editingProduct.category_id} onChange={e=>setEditingProduct({...editingProduct,category_id:e.target.value})}>{categories.map(c=><option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}</select></td><td><input aria-label="Selling price" type="number" min="0" step="0.01" value={editingProduct.selling_price} onChange={e=>setEditingProduct({...editingProduct,selling_price:e.target.value})}/></td><td>{p.has_recipe?'Configured':'Missing'}</td><td>{p.is_available?'Available':'Unavailable'}</td><td><button className="small primary" onClick={saveProductEdit}>Save</button> <button className="small secondary" onClick={()=>setEditingProduct(null)}>Cancel</button></td></>:<><td>{p.product_name}</td><td>{p.category_name}</td><td>{money(p.selling_price)}</td><td>{p.has_recipe?'Configured':'Missing'}</td><td>{p.is_available?'Available':'Unavailable'}</td><td><button className="small secondary" onClick={()=>setEditingProduct({product_id:p.product_id,product_name:p.product_name,category_id:String(p.category_id),selling_price:String(p.selling_price),description:p.description||''})}>Edit</button> <button className="small secondary" onClick={async()=>{try{await api(`/products/${p.product_id}/availability`,{method:'PATCH',body:JSON.stringify({is_available:!p.is_available})});await loadCore();}catch(e){fail(e.message)}}}>{p.is_available?'Disable sale':'Enable sale'}</button> <button className="small danger-button" onClick={async()=>{if(!window.confirm(`Deactivate ${p.product_name}?`))return;try{await api(`/products/${p.product_id}`,{method:'DELETE'});await loadCore();flash('Product deactivated.');}catch(e){fail(e.message)}}}>Deactivate</button></td></>}</tr>)}</tbody></table></div></section>}
      {active==='Inventory'&&manager&&<section className="content-grid"><div className="panel"><div className="panel-heading"><div><h2>Ingredients</h2><p>Inventory is tracked by base unit.</p></div></div><form className="stack" onSubmit={addIngredient}><label>Ingredient name<input value={ingredientForm.ingredient_name} onChange={e=>setIngredientForm({...ingredientForm,ingredient_name:e.target.value})} required maxLength="120"/></label><div className="two-fields"><label>Base unit<select value={ingredientForm.base_unit} onChange={e=>setIngredientForm({...ingredientForm,base_unit:e.target.value})}><option value="g">Grams (g)</option><option value="ml">Millilitres (ml)</option><option value="pcs">Pieces (pcs)</option></select></label><label>Low-stock threshold<input type="number" min="0" step="0.001" value={ingredientForm.minimum_stock} onChange={e=>setIngredientForm({...ingredientForm,minimum_stock:e.target.value})} required/></label></div><button className="primary" type="submit">Add ingredient</button></form></div><div className="panel"><div className="panel-heading"><div><h2>Record stock movement</h2><p>Purchases, waste or physical count adjustment.</p></div></div><form className="stack" onSubmit={addMovement}><label>Ingredient<select value={movementForm.ingredient_id} onChange={e=>setMovementForm({...movementForm,ingredient_id:e.target.value})} required><option value="">Select ingredient</option>{ingredients.map(i=><option key={i.ingredient_id} value={i.ingredient_id}>{i.ingredient_name} ({i.base_unit})</option>)}</select></label><label>Movement type<select value={movementForm.movement_type} onChange={e=>setMovementForm({...movementForm,movement_type:e.target.value})}><option value="purchase">Stock received (+)</option><option value="waste">Waste / expired (-)</option><option value="adjustment">Stock count adjustment (+/-)</option></select></label>{movementForm.movement_type==='adjustment'?<label>Signed change<input type="number" step="0.001" value={movementForm.quantity_change} onChange={e=>setMovementForm({...movementForm,quantity_change:e.target.value})} required placeholder="e.g. -5 or 12"/></label>:<label>Quantity<input type="number" min="0.001" step="0.001" value={movementForm.quantity} onChange={e=>setMovementForm({...movementForm,quantity:e.target.value})} required/></label>}<label>Note<input value={movementForm.note} onChange={e=>setMovementForm({...movementForm,note:e.target.value})} maxLength="255"/></label><button className="primary" type="submit">Save movement</button></form></div><div className="panel span-all"><div className="panel-heading"><div><h2>Current stock</h2><p>Low-stock items are highlighted.</p></div></div><div className="table-wrap"><table><thead><tr><th>Ingredient</th><th>Current quantity</th><th>Unit</th><th>Minimum</th><th>Status</th></tr></thead><tbody>{ingredients.map(i=><tr key={i.ingredient_id} className={Number(i.quantity_on_hand)<Number(i.minimum_stock)?'low-stock':''}><td>{i.ingredient_name}</td><td>{Number(i.quantity_on_hand).toFixed(3)}</td><td>{i.base_unit}</td><td>{Number(i.minimum_stock).toFixed(3)}</td><td>{Number(i.quantity_on_hand)<Number(i.minimum_stock)?'Low stock':'OK'}</td></tr>)}</tbody></table></div></div><div className="panel span-all"><div className="panel-heading"><div><h2>Recent stock movements</h2></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Ingredient</th><th>Type</th><th>Change</th><th>Employee</th><th>Note</th></tr></thead><tbody>{movements.slice(0,30).map(m=><tr key={m.movement_id}><td>{dateTime(m.created_at)}</td><td>{m.ingredient_name}</td><td>{m.movement_type}</td><td>{Number(m.quantity_change).toFixed(3)} {m.base_unit}</td><td>{m.performed_by}</td><td>{m.note||'—'}</td></tr>)}</tbody></table></div></div></section>}
      {active==='Recipes'&&manager&&<section className="panel"><div className="panel-heading"><div><h2>Product recipes</h2><p>Set the ingredient quantity required for one unit of a product.</p></div></div><label className="recipe-select">Product<select value={recipeProduct} onChange={e=>loadRecipe(e.target.value)}><option value="">Select product</option>{products.map(p=><option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}</select></label>{recipeProduct&&<form className="stack" onSubmit={saveRecipe}><div className="recipe-rows">{recipeItems.map((item,index)=><div className="recipe-row" key={index}><label>Ingredient<select value={item.ingredient_id} onChange={e=>setRecipeItems(old=>old.map((x,i)=>i===index?{...x,ingredient_id:e.target.value}:x))} required><option value="">Select ingredient</option>{ingredients.filter(i=>i.is_active).map(i=><option key={i.ingredient_id} value={i.ingredient_id}>{i.ingredient_name} ({i.base_unit})</option>)}</select></label><label>Quantity per product<input type="number" min="0.001" step="0.001" value={item.quantity_required} onChange={e=>setRecipeItems(old=>old.map((x,i)=>i===index?{...x,quantity_required:e.target.value}:x))} required/></label><button type="button" className="danger-button" onClick={()=>setRecipeItems(old=>old.filter((_,i)=>i!==index))} disabled={recipeItems.length===1}>Remove</button></div>)}</div><div className="form-actions"><button type="button" className="secondary" onClick={()=>setRecipeItems(old=>[...old,{ingredient_id:'',quantity_required:''}])}>Add ingredient row</button><button className="primary" type="submit">Save recipe</button></div></form>}</section>}
      {active==='Orders'&&<section className="panel"><div className="panel-heading"><div><h2>Order history</h2><p>Receipts can be reprinted without creating a new sale.</p></div><button className="secondary" onClick={loadCore}>Refresh</button></div><OrdersTable orders={orders} onReceipt={loadReceipt} onStatus={changeOrderStatus}/></section>}
      {active==='Employees'&&manager&&<section className="content-grid"><div className="panel"><div className="panel-heading"><div><h2>Create employee account</h2><p>Use a strong password of at least 12 characters.</p></div></div><form className="stack" onSubmit={addStaff}><label>Full name<input value={staffForm.full_name} onChange={e=>setStaffForm({...staffForm,full_name:e.target.value})} required maxLength="100"/></label><label>Username<input value={staffForm.username} onChange={e=>setStaffForm({...staffForm,username:e.target.value})} required minLength="3" maxLength="50"/></label><label>Temporary password<input type="password" value={staffForm.password} onChange={e=>setStaffForm({...staffForm,password:e.target.value})} required minLength="12"/></label><label>Role<select value={staffForm.role} onChange={e=>setStaffForm({...staffForm,role:e.target.value})}><option value="cashier">Cashier</option><option value="manager">Manager</option></select></label><button className="primary" type="submit">Create account</button></form></div><div className="panel"><div className="panel-heading"><div><h2>Employee accounts</h2><p>Accounts are deactivated, not deleted.</p></div></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>{users.map(u=><tr key={u.user_id}><td>{u.full_name}</td><td>{u.username}</td><td>{u.role_name}</td><td>{u.is_active?'Active':'Inactive'}</td><td><button className="small secondary" disabled={u.user_id===user.id} onClick={()=>toggleUser(u)}>{u.is_active?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table></div></div><div className="panel span-all"><div className="panel-heading"><div><h2>Record refund</h2><p>Only record a refund after the cash has actually been returned.</p></div></div><form className="form-grid" onSubmit={submitRefund}><label>Order ID<input type="number" min="1" value={refundForm.order_id} onChange={e=>setRefundForm({...refundForm,order_id:e.target.value})} required/></label><label>Refund amount<input type="number" min="0.01" step="0.01" value={refundForm.amount} onChange={e=>setRefundForm({...refundForm,amount:e.target.value})} required/></label><label>Reason<input value={refundForm.reason} onChange={e=>setRefundForm({...refundForm,reason:e.target.value})} required maxLength="255"/></label><div className="form-actions"><button className="primary" type="submit">Record completed refund</button></div></form></div></section>}
      {active==='Reports'&&manager&&<section className="content-grid"><div className="panel span-all"><div className="panel-heading"><div><h2>Sales report</h2><p>Confirmed payments in selected date range.</p></div></div><div className="date-filter"><label>From<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label><label>To<input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label><button className="primary" onClick={loadManagerData}>Run report</button></div>{report&&<><div className="report-metrics"><div className="metric"><span>Paid orders</span><strong>{report.summary.order_count}</strong></div><div className="metric"><span>Cash sales</span><strong>{money(report.summary.gross_sales)}</strong></div></div><h3>Top products</h3><div className="table-wrap"><table><thead><tr><th>Product</th><th>Quantity sold</th><th>Sales</th></tr></thead><tbody>{report.top_products.map((p,i)=><tr key={`${p.product_name}-${i}`}><td>{p.product_name}</td><td>{p.quantity_sold}</td><td>{money(p.sales)}</td></tr>)}</tbody></table></div><h3>Payment methods</h3><p>Cash: {money(report.payment_methods?.[0]?.amount)} across {report.payment_methods?.[0]?.count||0} paid orders.</p></>}</div></section>}
    </main></div>;
}

function OrdersTable({orders,onReceipt,onStatus}) {
 return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Cashier</th><th>Actions</th></tr></thead><tbody>{orders.length===0?<tr><td colSpan="8" className="empty-cell">No orders found.</td></tr>:orders.map(o=><tr key={o.order_id}><td className="mono">{o.order_number}</td><td>{dateTime(o.paid_at||o.created_at)}</td><td>{o.items||'—'}</td><td>{money(o.total_amount)}</td><td>{o.payment_status||'—'}</td><td><span className={`pill ${o.order_status}`}>{o.order_status}</span></td><td>{o.cashier_name||'—'}</td><td className="actions"><button className="small secondary" onClick={()=>onReceipt(o)}>Receipt</button>{o.order_status==='received'&&<button className="small secondary" onClick={()=>onStatus(o,'preparing')}>Start</button>}{o.order_status==='preparing'&&<button className="small secondary" onClick={()=>onStatus(o,'ready')}>Ready</button>}{o.order_status==='ready'&&<button className="small secondary" onClick={()=>onStatus(o,'completed')}>Complete</button>}{['received','preparing','ready'].includes(o.order_status)&&<button className="small danger-button" onClick={()=>onStatus(o,'cancelled')}>Cancel</button>}</td></tr>)}</tbody></table></div>;
}
export default App;
