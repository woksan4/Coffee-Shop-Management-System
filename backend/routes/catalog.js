import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler, HttpError, parseId, requireText, positiveNumber } from '../utils.js';

const router = Router();
router.use(requireAuth('manager', 'cashier'));

router.get('/categories', asyncHandler(async (req, res) => {
  const [rows] = await db.execute('SELECT category_id, category_name, description FROM categories WHERE is_active = 1 ORDER BY category_name');
  res.json(rows);
}));
router.post('/categories', requireAuth('manager'), asyncHandler(async (req, res) => {
  const category_name = requireText(req.body?.category_name, 'Category name', 100);
  const description = String(req.body?.description ?? '').trim().slice(0,255) || null;
  const [result] = await db.execute('INSERT INTO categories (category_name, description) VALUES (?, ?)', [category_name, description]);
  await db.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)', [req.user.user_id,'category.create','category',String(result.insertId),JSON.stringify({category_name})]);
  res.status(201).json({category_id:result.insertId});
}));
router.get('/products', asyncHandler(async (req, res) => {
  const [rows] = await db.execute(
    `SELECT p.product_id, p.category_id, c.category_name, p.product_name, p.description,
      p.selling_price, p.is_available, p.is_active,
      (SELECT COUNT(*) FROM recipe_items ri JOIN recipes r ON r.recipe_id=ri.recipe_id WHERE r.product_id=p.product_id) AS recipe_ingredient_count
     FROM products p JOIN categories c ON c.category_id=p.category_id
     WHERE p.is_active=1 ORDER BY c.category_name, p.product_name`
  );
  res.json(rows.map(p => ({ ...p, is_available: Boolean(p.is_available), is_active: Boolean(p.is_active), has_recipe: Number(p.recipe_ingredient_count) > 0 })));
}));
router.post('/products', requireAuth('manager'), asyncHandler(async (req, res) => {
  const product_name = requireText(req.body?.product_name, 'Product name');
  const category_id = parseId(req.body?.category_id);
  const selling_price = positiveNumber(req.body?.selling_price, 'Selling price', { allowZero: true });
  const description = String(req.body?.description ?? '').trim().slice(0,255) || null;
  const [cats] = await db.execute('SELECT category_id FROM categories WHERE category_id=? AND is_active=1', [category_id]);
  if (!cats.length) throw new HttpError(400, 'Choose an active category');
  const [result] = await db.execute('INSERT INTO products (category_id, product_name, description, selling_price) VALUES (?, ?, ?, ?)', [category_id, product_name, description, selling_price.toFixed(2)]);
  await db.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)', [req.user.user_id,'product.create','product',String(result.insertId),JSON.stringify({product_name,category_id,selling_price}),req.ip]);
  res.status(201).json({ product_id: result.insertId });
}));
router.put('/products/:id', requireAuth('manager'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const product_name = requireText(req.body?.product_name, 'Product name');
  const category_id = parseId(req.body?.category_id);
  const selling_price = positiveNumber(req.body?.selling_price, 'Selling price', { allowZero: true });
  const description = String(req.body?.description ?? '').trim().slice(0,255) || null;
  const [oldRows] = await db.execute('SELECT product_name,category_id,selling_price,description FROM products WHERE product_id=? AND is_active=1', [id]);
  if (!oldRows.length) throw new HttpError(404, 'Product not found');
  const [result] = await db.execute('UPDATE products SET product_name=?, category_id=?, selling_price=?, description=? WHERE product_id=? AND is_active=1', [product_name, category_id, selling_price.toFixed(2), description, id]);
  await db.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)', [req.user.user_id,'product.update','product',String(id),JSON.stringify({before:oldRows[0],after:{product_name,category_id,selling_price,description}}),req.ip]);
  res.json({ updated: Boolean(result.affectedRows) });
}));
router.patch('/products/:id/availability', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (typeof req.body?.is_available !== 'boolean') throw new HttpError(400, 'is_available must be true or false');
  const [result] = await db.execute('UPDATE products SET is_available=? WHERE product_id=? AND is_active=1', [req.body.is_available, id]);
  if (!result.affectedRows) throw new HttpError(404, 'Product not found');
  await db.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)', [req.user.user_id,'product.availability','product',String(id),JSON.stringify({is_available:req.body.is_available}),req.ip]);
  res.json({ updated: true });
}));
router.delete('/products/:id', requireAuth('manager'), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const [result] = await db.execute('UPDATE products SET is_active=0, is_available=0 WHERE product_id=? AND is_active=1', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Product not found');
  await db.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,ip_address) VALUES (?,?,?,?,?,?)', [req.user.user_id,'product.deactivate','product',String(id),JSON.stringify({is_active:false}),req.ip]);
  res.json({ deactivated: true });
}));

router.get('/ingredients', requireAuth('manager'), asyncHandler(async (req, res) => {
  const [rows] = await db.execute(
    `SELECT i.ingredient_id, i.ingredient_name, i.base_unit, i.minimum_stock, i.is_active,
      COALESCE(v.quantity_on_hand,0) AS quantity_on_hand
     FROM ingredients i LEFT JOIN inventory v ON v.ingredient_id=i.ingredient_id
     ORDER BY i.ingredient_name`
  );
  res.json(rows.map(r => ({...r, is_active:Boolean(r.is_active)})));
}));
router.post('/ingredients', requireAuth('manager'), asyncHandler(async (req, res) => {
  const name = requireText(req.body?.ingredient_name, 'Ingredient name');
  const unit = String(req.body?.base_unit ?? '');
  if (!['g','ml','pcs'].includes(unit)) throw new HttpError(400, 'Unit must be g, ml or pcs');
  const minimum = positiveNumber(req.body?.minimum_stock ?? 0, 'Minimum stock', {allowZero:true});
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute('INSERT INTO ingredients (ingredient_name,base_unit,minimum_stock) VALUES (?,?,?)', [name,unit,minimum]);
    await conn.execute('INSERT INTO inventory (ingredient_id,quantity_on_hand) VALUES (?,0)', [result.insertId]);
    await conn.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)', [req.user.user_id,'ingredient.create','ingredient',String(result.insertId),JSON.stringify({name,unit,minimum})]);
    await conn.commit(); res.status(201).json({ingredient_id:result.insertId});
  } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
router.post('/inventory/movement', requireAuth('manager'), asyncHandler(async (req,res) => {
  const ingredient_id = parseId(req.body?.ingredient_id);
  const type = String(req.body?.movement_type ?? '');
  if (!['purchase','waste','adjustment'].includes(type)) throw new HttpError(400,'Invalid stock movement type');
  const qty = type==='adjustment' ? null : positiveNumber(req.body?.quantity,'Quantity');
  const note = String(req.body?.note ?? '').trim().slice(0,255) || null;
  const conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]=await conn.execute('SELECT quantity_on_hand FROM inventory WHERE ingredient_id=? FOR UPDATE',[ingredient_id]);
    if (!rows.length) throw new HttpError(404,'Ingredient inventory not found');
    let delta;
    if(type==='purchase') delta=qty;
    else if(type==='waste') delta=-qty;
    else delta=Number(req.body?.quantity_change);
    if(type==='adjustment' && (!Number.isFinite(delta)||delta===0)) throw new HttpError(400,'For adjustment, quantity_change must be a non-zero signed number');
    const current=Number(rows[0].quantity_on_hand); const next=current+delta;
    if(next < -0.000001) throw new HttpError(409,'Insufficient stock for this movement');
    await conn.execute('UPDATE inventory SET quantity_on_hand=? WHERE ingredient_id=?',[Math.max(0,next).toFixed(3),ingredient_id]);
    await conn.execute('INSERT INTO stock_movements (ingredient_id,movement_type,quantity_change,performed_by,note) VALUES (?,?,?,?,?)',[ingredient_id,type,delta.toFixed(3),req.user.user_id,note]);
    await conn.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)',[req.user.user_id,'inventory.movement','ingredient',String(ingredient_id),JSON.stringify({type,delta,note})]);
    await conn.commit(); res.json({ingredient_id,quantity_on_hand:Math.max(0,next)});
  } catch(e){await conn.rollback();throw e;} finally{conn.release();}
}));

router.get('/recipes/:productId', requireAuth('manager'), asyncHandler(async(req,res)=>{
  const productId=parseId(req.params.productId);
  const [rows]=await db.execute(
    `SELECT ri.ingredient_id, i.ingredient_name, i.base_unit, ri.quantity_required
     FROM recipes r JOIN recipe_items ri ON ri.recipe_id=r.recipe_id JOIN ingredients i ON i.ingredient_id=ri.ingredient_id
     WHERE r.product_id=? ORDER BY i.ingredient_name`,[productId]);
  res.json(rows);
}));
router.put('/recipes/:productId', requireAuth('manager'), asyncHandler(async(req,res)=>{
  const productId=parseId(req.params.productId); const items=req.body?.items;
  if(!Array.isArray(items)||items.length===0||items.length>50) throw new HttpError(400,'Recipe must contain between 1 and 50 ingredients');
  const cleaned=items.map(it=>({ingredient_id:parseId(it.ingredient_id),quantity_required:positiveNumber(it.quantity_required,'Recipe quantity')}));
  if(new Set(cleaned.map(i=>i.ingredient_id)).size!==cleaned.length) throw new HttpError(400,'Duplicate ingredients are not allowed');
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const [products]=await conn.execute('SELECT product_id FROM products WHERE product_id=? AND is_active=1 FOR UPDATE',[productId]);
    if(!products.length) throw new HttpError(404,'Product not found');
    const ids=cleaned.map(i=>i.ingredient_id);
    const [ings]=await conn.query(`SELECT ingredient_id FROM ingredients WHERE is_active=1 AND ingredient_id IN (${ids.map(()=>'?').join(',')})`,ids);
    if(ings.length!==ids.length) throw new HttpError(400,'One or more ingredients are invalid or inactive');
    const [recipes]=await conn.execute('SELECT recipe_id FROM recipes WHERE product_id=? FOR UPDATE',[productId]);
    let recipeId;
    if(recipes.length){ recipeId=recipes[0].recipe_id; await conn.execute('DELETE FROM recipe_items WHERE recipe_id=?',[recipeId]); }
    else { const [r]=await conn.execute('INSERT INTO recipes (product_id,created_by) VALUES (?,?)',[productId,req.user.user_id]); recipeId=r.insertId; }
    for(const it of cleaned) await conn.execute('INSERT INTO recipe_items (recipe_id,ingredient_id,quantity_required) VALUES (?,?,?)',[recipeId,it.ingredient_id,it.quantity_required.toFixed(3)]);
    await conn.execute('INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)',[req.user.user_id,'recipe.update','product',String(productId),JSON.stringify({items:cleaned})]);
    await conn.commit(); res.json({saved:true,items:cleaned.length});
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
export default router;
